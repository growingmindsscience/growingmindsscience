"""Tests for captions.py. Run: python3 -m unittest discover -s nsc/tools/infant-captions"""
import http.server
import random
import re
import tempfile
import threading
import unittest
from pathlib import Path

import captions as c

NARRATION = c.load_narration()

# Mistakes the transcriber made in the real tracks (docs/infant-transcript-corrections.md).
MISHEARD = {
    "Tronick": ["Tronic"], "Tronick's": ["Tronix"], "Kuhl's": ["Kool's"], "coo,": ["coup,"],
    "coo.": ["coup."], "parentese": ["parentes"], "parentese.": ["parenties."], "pooled": ["pulled"],
    "Bowlby.": ["Bolby."], "Bowlby": ["Bolby"], "DeCasper": ["de", "Casper"], "Fifer": ["Pfe", "iffer"],
    "caregiver,": ["careg", "iver"], "Rovee": ["Roe", "V."], "you're": ["you", "'re"],
    "1-833-TLC-MAMA.": ["1", "833", "T", "LC", "mama."], "weakly.": ["weekly."], "trait": ["trade"],
    "Sroufe": ["Stroff"], "Werker": ["workers"], "babies'": ["baby's"], "calm": ["column"],
    "Kumi": ["Cumi"], "Kuroda": ["Corota"], "head": ["header"], "Wait.": ["Weight."],
}
DIGITS = {"four": "4", "two": "2", "three": "3", "one,": "1,", "four,": "4,"}


def mux_like(narration, seed=1, cue_chars=(30, 84)):
    """A caption track the way the auto-transcriber writes one: misheard names,
    split words, dropped and invented words, run-on sentences, numbers as
    digits. Returns the cues and, for each narration word, the cue its heard
    version landed in (None if the transcriber dropped it)."""
    rng = random.Random(seed)
    heard, source = [], []
    words = narration.split()
    for index, word in enumerate(words):
        roll = rng.random()
        if roll < 0.004:
            continue  # dropped
        if word in MISHEARD:
            out = MISHEARD[word]
        elif word.lower() in DIGITS and rng.random() < 0.5:
            out = [DIGITS[word.lower()]]
        elif roll < 0.01:
            out = [word.rstrip(".,"), "um"]  # an invented word after it
        else:
            out = [word.replace('"', "").replace(":", ",")]
            if word.endswith(".") and rng.random() < 0.2:
                out = [out[0][:-1] + ","]  # a run-on
        for piece in out:
            heard.append(piece)
            source.append(index)
    cues, expected, position = [], [None] * len(words), 0
    while position < len(heard):
        # Fill a cue up to a length, as a captioner would: one or two lines.
        limit, size = rng.randint(*cue_chars), 1
        while position + size < len(heard) and len(" ".join(heard[position:position + size + 1])) <= limit:
            size += 1
        chunk = heard[position:position + size]
        start = len(cues) * 3000
        cues.append(c.Cue(None, c_stamp(start), c_stamp(start + 2900), "", c.wrap(" ".join(chunk))))
        for offset in range(len(chunk)):
            word = source[position + offset]
            if expected[word] is None:
                expected[word] = len(cues) - 1
        position += size
    return cues, expected


def c_stamp(ms):
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"


class WebVttTest(unittest.TestCase):
    def test_round_trip_keeps_identifiers_timings_and_settings(self):
        source = ("WEBVTT\n\nNOTE made by hand\n\n1\n00:00:01.000 --> 00:00:02.500 align:start\nHello there\n"
                  "second line\n\n00:02.500 --> 00:04.000\nAgain\n")
        vtt = c.parse_vtt(source)
        self.assertEqual([cue.ident for cue in vtt.cues], ["1", None])
        self.assertEqual(vtt.cues[0].settings, " align:start")
        self.assertEqual(vtt.cues[0].text, "Hello there second line")
        again = c.parse_vtt(c.write_vtt(vtt.cues))
        self.assertEqual([cue.timing for cue in again.cues], [cue.timing for cue in vtt.cues])

    def test_rejects_what_a_player_would_misread(self):
        for bad in ["00:00:01.000 --> 00:00:02.000\nNo signature\n",
                    "WEBVTT\n\n00:00:02.000 --> 00:00:01.000\nBackwards\n",
                    "WEBVTT\n\n00:00:01.000 -> 00:00:02.000\nBad arrow\n",
                    "WEBVTT\n\nid only\n"]:
            with self.assertRaises(c.CaptionError):
                c.parse_vtt(bad)

    def test_segments_merge_without_repeated_boundary_cues(self):
        head = "WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n"
        one = head + "00:00:01.000 --> 00:00:03.000\nfirst\n\n00:00:05.000 --> 00:00:07.000\nspans\n"
        two = head + "00:00:05.000 --> 00:00:07.000\nspans\n\n00:00:08.000 --> 00:00:09.000\nthird\n"
        cues, duplicates, maps = c.merge_segments([one, two])
        self.assertEqual([cue.text for cue in cues], ["first", "spans", "third"])
        self.assertEqual(duplicates, 1)
        self.assertEqual(len(maps), 1)

    def test_markup_and_entities_are_not_words(self):
        self.assertEqual(c.clean_caption_text("<v Matthew>Tom &amp; <c.yellow>Jerry</c>"), "Tom & Jerry")


class WrapTest(unittest.TestCase):
    def test_short_text_is_one_line(self):
        self.assertEqual(c.wrap("A short cue."), ["A short cue."])

    def test_long_text_breaks_into_two_lines_within_the_limit(self):
        text = "Researchers call it parentese, the sing-song voice adults use with babies."
        lines = c.wrap(text)
        self.assertEqual(len(lines), 2)
        self.assertTrue(all(len(line) <= 42 for line in lines))
        self.assertEqual(" ".join(lines), text)

    def test_prefers_a_break_after_a_sentence(self):
        self.assertEqual(c.wrap("It is the system. Missing serves is not a failure here."),
                         ["It is the system.", "Missing serves is not a failure here."])


def cues_of(*texts):
    return [c.Cue(None, c_stamp(i * 2000), c_stamp(i * 2000 + 1900), "", [t]) for i, t in enumerate(texts)]


def corrected(cues, narration, numbers="captions"):
    placement = c.place(cues, narration, numbers)
    out, notes = c.build_cues(cues, placement)
    return [cue.text for cue in out], placement, notes


class PlacementTest(unittest.TestCase):
    def test_names_and_terms_are_fixed_in_their_own_cue(self):
        texts, _, _ = corrected(
            cues_of("In the 1970s, Ed Tronic", "filmed mothers and babies. A coup,", "a smile."),
            "In the 1970s, Ed Tronick filmed mothers and babies. A coo, a smile.")
        self.assertEqual(texts, ["In the 1970s, Ed Tronick", "filmed mothers and babies. A coo,", "a smile."])

    def test_split_and_joined_words(self):
        texts, _, _ = corrected(
            cues_of("connect with a careg", "iver and the researchers de", "Casper and Pfe iffer."),
            "connect with a caregiver, and the researchers DeCasper and Fifer.")
        self.assertEqual(" ".join(texts), "connect with a caregiver, and the researchers DeCasper and Fifer.")
        self.assertEqual(len(texts), 3)
        self.assertTrue(all(texts))

    def test_hotline_is_written_for_reading(self):
        texts, _, _ = corrected(
            cues_of("Call or text 1 833 T", "LC mama. Or call 988."),
            "Call or text 1-833-TLC-MAMA. Or call 988.")
        self.assertEqual(" ".join(texts), "Call or text 1-833-TLC-MAMA. Or call 988.")

    def test_number_style_follows_the_captions(self):
        texts, placement, _ = corrected(cues_of("from 4 months on,", "about twelve inches away"),
                                        "from four months on, about 12 inches away")
        self.assertEqual(texts, ["from 4 months on,", "about twelve inches away"])
        self.assertEqual(len(placement.number_swaps), 2)

    def test_number_style_can_follow_0018(self):
        texts, placement, _ = corrected(cues_of("from 4 months on,", "about twelve inches away"),
                                        "from four months on, about 12 inches away", numbers="0018")
        self.assertEqual(texts, ["from four months on,", "about 12 inches away"])
        self.assertEqual(placement.number_swaps, [])

    def test_a_sentence_never_starts_with_a_numeral(self):
        texts, _, _ = corrected(cues_of("old. 12 to 15 month olds point."),
                                "old. Twelve- to fifteen-month-olds point.")
        self.assertEqual(texts, ["old. Twelve- to 15-month-olds point."])

    def test_hyphenated_numbers_take_the_caption_digits(self):
        texts, _, _ = corrected(cues_of("A 4 month old's coup."), "A four-month-old's coo.")
        self.assertEqual(texts, ["A 4-month-old's coo."])

    def test_a_dropped_word_joins_the_cue_before_unless_a_sentence_starts(self):
        texts, _, _ = corrected(cues_of("They try harder.", "coo and smile."),
                                "They try harder. They coo and smile.")
        self.assertEqual(texts, ["They try harder.", "They coo and smile."])
        texts, _, _ = corrected(cues_of("They try", "and smile."), "They try harder and smile.")
        self.assertEqual(texts, ["They try harder", "and smile."])

    def test_a_cue_of_invented_words_borrows_a_neighbour_word(self):
        texts, _, notes = corrected(cues_of("ba da ma na", "na", "and so on."), "ba da ma na and so on.")
        self.assertTrue(all(texts))
        self.assertEqual(" ".join(texts), "ba da ma na and so on.")
        self.assertEqual(len(notes), 1)

    def test_a_cue_the_correction_overfills_hands_a_word_to_its_neighbour(self):
        before = " ".join(["babies"] * 12)
        self.assertTrue(c.fits(before.split()))
        narration = " ".join(["babies"] * 6 + ["and"] + ["babies"] * 6) + " sleep."
        texts, _, notes = corrected(cues_of(before, "sleep."), narration)
        self.assertEqual(texts, [" ".join(["babies"] * 6 + ["and"] + ["babies"] * 5), "babies sleep."])
        self.assertEqual(len(notes), 1)

    def test_a_cue_mux_already_made_too_long_keeps_its_words(self):
        before = " ".join(["babies"] * 14)
        self.assertFalse(c.fits(before.split()))
        cues = cues_of(before, "sleep.")
        texts, placement, notes = corrected(cues, before + " sleep.")
        self.assertEqual(texts, [before, "sleep."])
        self.assertEqual(notes, [])
        out, _ = c.build_cues(cues, placement)
        problems, warnings = c.check_lesson(cues, c.write_vtt(out), before + " sleep.")
        self.assertEqual(problems, [])
        self.assertEqual(len(out[0].lines), 2)
        self.assertTrue(warnings)


class WholeLessonTest(unittest.TestCase):
    """Every lesson's narration, garbled the way Mux garbles it, comes back word
    for word with the same cue count and timings, each word in the cue that
    held its misheard version."""

    def test_all_sixteen_lessons(self):
        for _, slug, _ in c.LESSONS:
            with self.subTest(slug=slug):
                narration = NARRATION[slug]
                cues, expected = mux_like(narration, seed=len(slug))
                placement = c.place(cues, narration)
                out, _ = c.build_cues(cues, placement)
                source = c.write_vtt(out)
                self.assertEqual(c.check_lesson(cues, source, narration)[0], [])
                placed = [w for w, cue in enumerate(placement.cue_of_word) if expected[w] is not None]
                right = sum(placement.cue_of_word[w] == expected[w] for w in placed)
                self.assertGreaterEqual(right / len(placed), 0.995, f"{slug}: {right}/{len(placed)}")
                off = [abs(placement.cue_of_word[w] - expected[w]) for w in placed]
                self.assertLessEqual(max(off), 1, slug)


class CheckTest(unittest.TestCase):
    def setUp(self):
        self.cues = cues_of("Ed Tronic filmed", "mothers and babies.")
        self.narration = "Ed Tronick filmed mothers and babies."

    def check(self, *texts, narration=None):
        out = [c.Cue(None, cue.start, cue.end, "", [t]) for cue, t in zip(self.cues, texts)]
        return c.check_lesson(self.cues, c.write_vtt(out), narration or self.narration)[0]

    def test_passes_the_narration(self):
        self.assertEqual(self.check("Ed Tronick filmed", "mothers and babies."), [])

    def test_catches_a_missing_repeated_or_reordered_word(self):
        self.assertTrue(self.check("Ed Tronick", "mothers and babies."))
        self.assertTrue(self.check("Ed Tronick filmed filmed", "mothers and babies."))
        self.assertTrue(self.check("Ed filmed Tronick", "mothers and babies."))
        self.assertTrue(self.check("Ed Tronic filmed", "mothers and babies."))

    def test_catches_changed_timing(self):
        out = [c.Cue(None, "00:00:00.100", self.cues[0].end, "", ["Ed Tronick filmed"]),
               c.Cue(None, self.cues[1].start, self.cues[1].end, "", ["mothers and babies."])]
        self.assertTrue(c.check_lesson(self.cues, c.write_vtt(out), self.narration)[0])

    def test_allows_number_style_only(self):
        self.assertTrue(c.same_number("4-month-olds,", "four-month-olds,"))
        self.assertFalse(c.same_number("5-month-olds,", "four-month-olds,"))
        self.assertFalse(c.same_number("4", "four,"))

    def test_classifies_changes(self):
        self.assertEqual(c.classify("A coup, a smile", "A coo, a smile"), "words")
        self.assertEqual(c.classify("four month olds", "four-month-olds"), "punctuation")
        self.assertEqual(c.classify("4 month olds", "four-month-olds"), "number")
        self.assertEqual(c.classify("baby's", "babies'"), "words")
        self.assertEqual(c.classify("Same.", "Same."), "same")


class FetchTest(unittest.TestCase):
    """The HLS route against a local stand-in for stream.mux.com."""

    def test_reads_the_english_track_and_never_saves_the_token(self):
        seen = []
        files = {
            "/PID.m3u8": ('#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English CC",'
                          'LANGUAGE="en",AUTOSELECT=YES,URI="subs/en.m3u8?sig=abc"\n'
                          '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Espanol",LANGUAGE="es",'
                          'URI="subs/es.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,SUBTITLES="subs"\nvideo.m3u8\n'),
            "/subs/en.m3u8": "#EXTM3U\n#EXTINF:10,\nseg0.vtt?sig=abc\n#EXTINF:10,\nseg1.vtt?sig=abc\n#EXT-X-ENDLIST\n",
            "/subs/seg0.vtt": ("WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n"
                               "00:00:01.000 --> 00:00:04.000\nIn the 1970s, Ed Tronic\n\n"
                               "00:00:09.000 --> 00:00:11.000\nfilmed mothers\n"),
            "/subs/seg1.vtt": ("WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n"
                               "00:00:09.000 --> 00:00:11.000\nfilmed mothers\n\n"
                               "00:00:12.000 --> 00:00:14.000\nand babies.\n"),
        }

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                seen.append((self.path, self.headers.get("Referer")))
                body = files.get(self.path.split("?")[0])
                self.send_response(200 if body else 404)
                self.end_headers()
                self.wfile.write((body or "").encode())

            def log_message(self, *args):
                pass

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            cues, notes = c.fetch_hls("PID", "SECRET-TOKEN", stream_base=f"http://127.0.0.1:{server.server_port}")
        finally:
            server.shutdown()
            server.server_close()
        self.assertEqual([cue.text for cue in cues], ["In the 1970s, Ed Tronic", "filmed mothers", "and babies."])
        self.assertTrue(all(referer == c.REFERER for _, referer in seen))
        self.assertIn("token=SECRET-TOKEN", seen[0][0])
        self.assertNotIn("SECRET-TOKEN", c.write_vtt(cues, notes))
        self.assertIn("1 repeated boundary cues removed", notes[0])


class CommandTest(unittest.TestCase):
    def test_correct_and_check_write_valid_files_and_a_change_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            saved = (c.ORIGINAL_DIR, c.CORRECTED_DIR, c.CHANGES_MD)
            c.ORIGINAL_DIR, c.CORRECTED_DIR, c.CHANGES_MD = tmp / "original", tmp / "corrected", tmp / "CHANGES.md"
            try:
                c.ORIGINAL_DIR.mkdir()
                cues, _ = mux_like(NARRATION["serve-and-return"], seed=3)
                (c.ORIGINAL_DIR / "serve-and-return.vtt").write_text(c.write_vtt(cues))
                self.assertEqual(c.main(["correct"]), 0)
                self.assertEqual(c.main(["check"]), 0)
                changes = c.CHANGES_MD.read_text()
                self.assertIn("1.3 Serve and Return", changes)
                self.assertIn("**Tronick**", changes)
                self.assertNotIn("\u2014", changes)
                written = c.parse_vtt((c.CORRECTED_DIR / "serve-and-return.vtt").read_text())
                self.assertEqual(len(written.cues), len(cues))
            finally:
                c.ORIGINAL_DIR, c.CORRECTED_DIR, c.CHANGES_MD = saved


if __name__ == "__main__":
    unittest.main()
