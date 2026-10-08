#!/usr/bin/env python3
"""Corrected English captions for the infant class.

Mux auto-generated the English caption track on every infant lesson, and the
transcriber made the same mistakes migration 0018 fixed in the written
versions: researchers' names (Tronic for Tronick, Kool for Kuhl), misheard
terms (coup for coo, parentes for parentese), split words and garbled
statistics. Each lesson's audio is narration read word for word from its
script, so the fix is to keep every cue's timing and put the narration's
words back into the cues.

The narration comes from migration 0018, which holds each lesson's script
narration in its agreed written form (the 1.5 hotline as 1-833-TLC-MAMA,
thousands with a comma). Where the caption track shows a number as digits
or as a word, the corrected cue keeps that style; --numbers 0018 uses the
migration's style instead.

Read-only: nothing here uploads to Mux, changes an asset, or writes to the
database. Python 3.9+, standard library only.

  captions.py fetch SLUG --preview                    Serve and Return, no sign-in
  captions.py fetch SLUG --playback-json FILE         any lesson: the JSON its playback route returns
  captions.py fetch SLUG --playback-id ID             with MUX_PLAYBACK_TOKEN set in the environment
  captions.py fetch SLUG --from-file PATH              a .vtt downloaded from the Mux dashboard
  captions.py correct                                 writes corrected/ and CHANGES.md
  captions.py check [SLUG ...]                        validates corrected/ against original/
"""
from __future__ import annotations

import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).resolve().parent
MIGRATION = HERE.parents[1] / "supabase" / "migrations" / "0018_infant_transcript_corrections.sql"
ORIGINAL_DIR = HERE / "original"
CORRECTED_DIR = HERE / "corrected"
CHANGES_MD = HERE / "CHANGES.md"

SITE = "https://growingmindsscience.com"
PREVIEW_PLAYBACK = SITE + "/nsc/api/classes/infant/preview/playback"
REFERER = SITE + "/"

LINE_MAX = 42
LINES_MAX = 2

# Course order, slug, title (as in docs/infant-transcript-corrections.md).
LESSONS = [
    ("1.1", "born-ready-to-connect", "Born Ready to Connect"),
    ("1.2", "a-brain-built-by-experience", "A Brain Built by Experience"),
    ("1.3", "serve-and-return", "Serve and Return"),
    ("1.4", "states-crying-and-the-borrowed-nervous-system", "States, Crying, and the Borrowed Nervous System"),
    ("1.5", "capable-and-fragile-at-once", "Capable and Fragile at Once"),
    ("2.1", "the-cue-vocabulary", "The Cue Vocabulary"),
    ("2.2", "temperament", "Temperament: Your Baby's Starting Settings"),
    ("2.3", "feeding-as-a-conversation", "Feeding as a Conversation"),
    ("2.4", "sleep-across-the-first-year", "Sleep Across the First Year"),
    ("3.1", "what-secure-attachment-is-and-isn-t", "What Secure Attachment Is, and Isn't"),
    ("3.2", "many-hands", "Many Hands: Partners, Grandparents, and Childcare"),
    ("3.3", "separation-and-stranger-wariness", "Separation and Stranger Wariness"),
    ("4.1", "language-before-words", "Language Before Words"),
    ("4.2", "on-the-move", "On the Move"),
    ("4.3", "play-and-the-hidden-toy", "Play and the Hidden Toy"),
    ("4.4", "screens-and-the-year-ahead", "Screens, and the Year Ahead"),
]
SLUGS = [slug for _, slug, _ in LESSONS]


class CaptionError(Exception):
    pass


# ---------------------------------------------------------------- narration

def load_narration(path: Path = MIGRATION) -> dict[str, str]:
    """Each lesson's corrected text from migration 0018, by slug."""
    sql = path.read_text(encoding="utf-8")
    rows = re.findall(
        r"\('([a-z0-9-]+)', '[0-9a-f]{32}', '[0-9a-f]{32}', \$t\$(.*?)\$t\$\)", sql, re.S)
    if not rows:
        raise CaptionError(f"no lesson rows found in {path}")
    return dict(rows)


# ---------------------------------------------------------------- WebVTT

TIMING = re.compile(
    r"^((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})[ \t]+-->[ \t]+((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})(.*)$")


def to_ms(stamp: str) -> int:
    parts = stamp.split(":")
    seconds, millis = parts[-1].split(".")
    hours = int(parts[0]) if len(parts) == 3 else 0
    return ((hours * 60 + int(parts[-2])) * 60 + int(seconds)) * 1000 + int(millis)


@dataclass
class Cue:
    ident: str | None
    start: str
    end: str
    settings: str
    lines: list[str]

    @property
    def timing(self) -> str:
        return f"{self.start} --> {self.end}{self.settings}"

    @property
    def text(self) -> str:
        return " ".join(line.strip() for line in self.lines if line.strip())

    @property
    def key(self):
        return (to_ms(self.start), to_ms(self.end), self.settings.strip(), self.text)


@dataclass
class Vtt:
    cues: list[Cue]
    header: list[str] = field(default_factory=list)  # lines after WEBVTT before the first cue
    timestamp_map: str | None = None


def parse_vtt(source: str, strict: bool = True) -> Vtt:
    """Parse WebVTT. Strict mode rejects anything a player could misread."""
    text = source.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    blocks = re.split(r"\n{2,}", text.strip("\n"))
    first = blocks[0].split("\n")
    if not re.match(r"^WEBVTT(?:[ \t].*)?$", first[0]):
        raise CaptionError("missing WEBVTT signature")
    vtt = Vtt(cues=[])
    for line in first[1:]:
        if line.startswith("X-TIMESTAMP-MAP="):
            vtt.timestamp_map = line
        else:
            vtt.header.append(line)
    for block in blocks[1:]:
        lines = block.split("\n")
        if lines[0].startswith(("NOTE", "STYLE", "REGION")) and "-->" not in lines[0]:
            continue
        ident = None
        if "-->" not in lines[0]:
            ident, lines = lines[0], lines[1:]
            if not lines or "-->" not in lines[0]:
                raise CaptionError(f"block without a timing line: {block[:60]!r}")
        match = TIMING.match(lines[0].strip())
        if not match:
            raise CaptionError(f"bad timing line: {lines[0]!r}")
        start, end, settings = match.group(1), match.group(2), match.group(3).rstrip()
        if strict and to_ms(end) <= to_ms(start):
            raise CaptionError(f"cue ends before it starts: {lines[0]!r}")
        body = lines[1:]
        if strict and not any(line.strip() for line in body):
            raise CaptionError(f"empty cue at {start}")
        if any("-->" in line for line in body):
            raise CaptionError(f"'-->' inside cue text at {start}")
        vtt.cues.append(Cue(ident, start, end, settings, body))
    return vtt


def write_vtt(cues: list[Cue], notes: list[str] = ()) -> str:
    out = ["WEBVTT", ""]
    for note in notes:
        out += ["NOTE " + note, ""]
    for cue in cues:
        if cue.ident:
            out.append(cue.ident)
        out.append(cue.timing)
        out += cue.lines
        out.append("")
    return "\n".join(out)


def merge_segments(segments: list[str]) -> tuple[list[Cue], int, set[str]]:
    """Join HLS WebVTT segments. A cue that spans a segment boundary is repeated
    in each segment it touches, so identical cues are kept once."""
    seen, cues, maps = set(), [], set()
    for segment in segments:
        vtt = parse_vtt(segment, strict=False)
        if vtt.timestamp_map:
            maps.add(vtt.timestamp_map)
        for cue in vtt.cues:
            if cue.key in seen or not cue.text:
                continue
            seen.add(cue.key)
            cues.append(cue)
    cues.sort(key=lambda cue: (to_ms(cue.start), to_ms(cue.end)))
    duplicates = sum(len(parse_vtt(s, strict=False).cues) for s in segments) - len(cues)
    return cues, duplicates, maps


# ---------------------------------------------------------------- fetching (read-only GETs)

def http_get(url: str, referer: str = REFERER) -> str:
    request = urllib.request.Request(url, headers={"Referer": referer, "User-Agent": "gms-captions/1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def m3u8_attributes(line: str) -> dict[str, str]:
    return {key: value.strip('"') for key, value in
            re.findall(r'([A-Z0-9-]+)=("[^"]*"|[^,]*)', line.split(":", 1)[1])}


def english_subtitles(master: str, master_url: str) -> list[dict[str, str]]:
    tracks = []
    for line in master.splitlines():
        if line.startswith("#EXT-X-MEDIA:"):
            attrs = m3u8_attributes(line)
            if attrs.get("TYPE") == "SUBTITLES" and attrs.get("LANGUAGE", "").lower().startswith("en"):
                attrs["URI"] = urllib.parse.urljoin(master_url, attrs.get("URI", ""))
                tracks.append(attrs)
    return tracks


def segment_urls(playlist: str, playlist_url: str) -> list[str]:
    return [urllib.parse.urljoin(playlist_url, line.strip()) for line in playlist.splitlines()
            if line.strip() and not line.startswith("#")]


def fetch_hls(playback_id: str, token: str, track_name: str | None = None,
              stream_base: str = "https://stream.mux.com") -> tuple[list[Cue], list[str]]:
    master_url = f"{stream_base}/{urllib.parse.quote(playback_id)}.m3u8?token={urllib.parse.quote(token)}"
    tracks = english_subtitles(http_get(master_url), master_url)
    if track_name:
        tracks = [track for track in tracks if track.get("NAME") == track_name]
    if len(tracks) != 1:
        names = [track.get("NAME") for track in tracks] or "none"
        raise CaptionError(f"expected one English subtitle track, found {names}; pick one with --track-name")
    track = tracks[0]
    segments = [http_get(url) for url in segment_urls(http_get(track["URI"]), track["URI"])]
    cues, duplicates, maps = merge_segments(segments)
    notes = [f"English caption track \"{track.get('NAME', '')}\" read from Mux HLS "
             f"({len(segments)} segments, {duplicates} repeated boundary cues removed) "
             f"on {datetime.date.today().isoformat()}."]
    if len(maps) > 1:
        notes.append("Segments carried different X-TIMESTAMP-MAP values: " + "; ".join(sorted(maps)))
    return cues, notes


def fetch_text_track(playback_id: str, token: str, track_id: str,
                     stream_base: str = "https://stream.mux.com") -> tuple[list[Cue], list[str]]:
    url = (f"{stream_base}/{urllib.parse.quote(playback_id)}/text/{urllib.parse.quote(track_id)}.vtt"
           f"?token={urllib.parse.quote(token)}")
    cues = parse_vtt(http_get(url)).cues
    return cues, [f"Mux text track {track_id} read on {datetime.date.today().isoformat()}."]


# ---------------------------------------------------------------- words

NUMBER_WORDS = {word: index for index, word in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
    "fifteen sixteen seventeen eighteen nineteen".split())}
NUMBER_WORDS.update({word: 10 * (index + 2) for index, word in enumerate(
    "twenty thirty forty fifty sixty seventy eighty ninety".split())})
QUOTES = str.maketrans({"\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"'})
SPLIT_PIECES = re.compile("([-\u2013/])")
SENTENCE_END = re.compile(r"[.?!][\"')\]]*$")


def clean_caption_text(text: str) -> str:
    """Cue text without markup: <c>, <v Name>, inline timestamps, entities."""
    return html.unescape(re.sub(r"<[^>]*>", "", text))


def split_core(piece: str) -> tuple[str, str, str]:
    match = re.match(r"^([^\w]*)(.*?)([^\w]*)$", piece, re.S)
    return match.group(1), match.group(2), match.group(3)


def norm_piece(piece: str) -> list[str]:
    """Matching keys for one hyphen-separated piece of a word."""
    piece = piece.translate(QUOTES).lower()
    percent = piece.rstrip("\"').,;:?!").endswith("%")
    core = re.sub(r"[^\w'.]", "", piece)
    # A trailing apostrophe stays (babies' is not babies); a leading one does not.
    core = core.lstrip("'.").rstrip(".")
    core = re.sub(r"(?<!\d)\.|\.(?!\d)", "", core)  # u.s. and postpartum.net, not 1.5
    keys = []
    if core:
        keys.append(str(NUMBER_WORDS[core]) if core in NUMBER_WORDS else core)
    if percent:
        keys.append("percent")
    return keys


def word_keys(word: str) -> list[tuple[str, int]]:
    """(key, piece index) for every matching key in a whitespace-separated word."""
    pieces = SPLIT_PIECES.split(word)[::2]
    return [(key, index) for index, piece in enumerate(pieces) for key in norm_piece(piece)]


def number_value(core: str) -> int | None:
    lowered = core.lower()
    if lowered in NUMBER_WORDS:
        return NUMBER_WORDS[lowered]
    if re.fullmatch(r"\d{1,3}(?:,\d{3})*|\d+", core):
        return int(core.replace(",", ""))
    return None


def compare_key(word: str) -> str:
    """A word reduced to what the check compares: number style ignored."""
    return " ".join(key for key, _ in word_keys(word))


# ---------------------------------------------------------------- alignment

@dataclass
class CapKey:
    key: str
    cue: int
    raw: str  # the caption's own spelling of this piece, without punctuation


@dataclass
class Placement:
    words: list[str]        # narration words, number style applied
    cue_of_word: list[int]  # cue index for each word
    number_swaps: list[dict]


def caption_keys(cues: list[Cue]) -> list[CapKey]:
    keys = []
    for index, cue in enumerate(cues):
        for word in clean_caption_text(cue.text).split():
            pieces = SPLIT_PIECES.split(word)[::2]
            for piece in pieces:
                for key in norm_piece(piece):
                    keys.append(CapKey(key, index, split_core(piece)[1]))
    return keys


def interpolate(anchors: list[tuple[int, int]], y: float) -> float:
    """Map a position in the narration span to the caption span (anchors are (b, a))."""
    for (b0, a0), (b1, a1) in zip(anchors, anchors[1:]):
        if b0 <= y <= b1:
            return a0 if b1 == b0 else a0 + (y - b0) * (a1 - a0) / (b1 - b0)
    return anchors[-1][1]


def place_replaced(cap: list[CapKey], narr: list[str]) -> list[int]:
    """Cue for each narration key in a span the transcriber got wrong. The two
    spans are matched letter by letter, so a word lands in the cue that held
    the misheard version of it."""
    cue_ids = {key.cue for key in cap}
    if len(cue_ids) == 1:
        return [cap[0].cue] * len(narr)
    cs, ns = " ".join(key.key for key in cap), " ".join(narr)
    starts, position = [], 0
    for key in cap:
        starts.append(position)
        position += len(key.key) + 1
    anchors = [(0, 0)]
    for block in SequenceMatcher(None, cs, ns, autojunk=False).get_matching_blocks():
        if block.size:
            anchors += [(block.b, block.a), (block.b + block.size, block.a + block.size)]
    anchors.append((len(ns), len(cs)))
    anchors.sort()
    out, position = [], 0
    for word in narr:
        x = interpolate(anchors, position + len(word) / 2)
        index = max(i for i, start in enumerate(starts) if start <= x) if x >= 0 else 0
        out.append(cap[index].cue)
        position += len(word) + 1
    return out


def place(cues: list[Cue], narration: str, numbers: str = "captions") -> Placement:
    words = narration.split()
    cap = caption_keys(cues)
    narr, owner = [], []  # narration keys and (word index, piece index) for each
    for w, word in enumerate(words):
        for key, piece in word_keys(word):
            narr.append(key)
            owner.append((w, piece))
    key_cue: list[int | None] = [None] * len(narr)
    key_match: list[int | None] = [None] * len(narr)
    matcher = SequenceMatcher(None, [k.key for k in cap], narr, autojunk=False)
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            for offset in range(i2 - i1):
                key_cue[j1 + offset] = cap[i1 + offset].cue
                key_match[j1 + offset] = i1 + offset
        elif op == "replace":
            for offset, cue in enumerate(place_replaced(cap[i1:i2], narr[j1:j2])):
                key_cue[j1 + offset] = cue
        elif op == "insert":
            # Words the transcriber dropped. Between two cues, a word stays with
            # the earlier cue unless a new sentence starts first.
            before = cap[i1 - 1].cue if i1 > 0 else None
            after = cap[i1].cue if i1 < len(cap) else None
            target = before if before is not None else after
            for j in range(j1, j2):
                previous_word = owner[j][0] - 1
                if (after is not None and before != after and previous_word >= 0
                        and owner[j][1] == 0 and SENTENCE_END.search(words[previous_word])):
                    target = after
                key_cue[j] = target
    # Each word goes where its first piece went; words with no letters or
    # digits follow the word before them.
    cue_of_word: list[int] = []
    first_key = {}
    for j, (w, _) in enumerate(owner):
        first_key.setdefault(w, j)
    for w in range(len(words)):
        cue = key_cue[first_key[w]] if w in first_key else None
        if cue is None:
            cue = cue_of_word[-1] if cue_of_word else 0
        cue_of_word.append(max(cue, cue_of_word[-1]) if cue_of_word else cue)

    swaps = []
    if numbers == "captions":
        words = list(words)
        for j, match in enumerate(key_match):
            if match is None:
                continue
            w, piece_index = owner[j]
            pieces = SPLIT_PIECES.split(words[w])
            lead, core, trail = split_core(pieces[piece_index * 2])
            heard = cap[match].raw
            value, heard_value = number_value(core), number_value(heard)
            if value is None or value != heard_value or "%" in trail:
                continue
            core_is_word, heard_is_word = core.isalpha(), heard.isalpha()
            if core_is_word == heard_is_word:
                continue
            starts_sentence = w == 0 or bool(SENTENCE_END.search(words[w - 1]))
            if core_is_word and (core[0].isupper() or starts_sentence):
                continue  # a sentence never starts with a numeral
            new_core = heard.lower() if heard_is_word else heard
            if heard_is_word and starts_sentence and piece_index == 0:
                new_core = new_core.capitalize()
            pieces[piece_index * 2] = lead + new_core + trail
            before = words[w]
            words[w] = "".join(pieces)
            swaps.append({"word": w, "from": before, "to": words[w], "cue": cue_of_word[w]})
    return Placement(words, cue_of_word, swaps)


# ---------------------------------------------------------------- layout

def wrap(text: str, width: int = LINE_MAX) -> list[str]:
    """One line if it fits, else the best two-line break: both lines within
    the width, a break after punctuation preferred, then the most even."""
    if len(text) <= width:
        return [text]
    words = text.split(" ")
    best = None
    for i in range(1, len(words)):
        top, bottom = " ".join(words[:i]), " ".join(words[i:])
        longest = max(len(top), len(bottom))
        over = max(0, longest - width)
        if re.search(r"[.?!:;]$", top):
            penalty = 0
        elif top.endswith(","):
            penalty = 4
        else:
            penalty = 10
        score = (over, penalty + abs(len(top) - len(bottom)) / 4)
        if best is None or score < best[0]:
            best = (score, [top, bottom])
    return best[1] if best else [text]


def fits(words: list[str]) -> bool:
    lines = wrap(" ".join(words))
    return len(lines) <= LINES_MAX and all(len(line) <= LINE_MAX for line in lines)


def build_cues(cues: list[Cue], placement: Placement) -> tuple[list[Cue], list[str]]:
    groups: list[list[str]] = [[] for _ in cues]
    for word, cue in zip(placement.words, placement.cue_of_word):
        groups[cue].append(word)
    notes = []
    # A cue whose every word was a transcriber invention would come out empty;
    # it takes one word from its fuller neighbour so the timing still carries text.
    for _ in range(len(groups)):
        empty = [i for i, group in enumerate(groups) if not group]
        if not empty:
            break
        i = empty[0]
        left = len(groups[i - 1]) if i > 0 else 0
        right = len(groups[i + 1]) if i + 1 < len(groups) else 0
        if max(left, right) < 2:
            raise CaptionError(f"cue {i + 1} has no words and no neighbour can spare one")
        if left >= right:
            groups[i].insert(0, groups[i - 1].pop())
        else:
            groups[i].append(groups[i + 1].pop(0))
        notes.append(f"cue {i + 1} had only misheard words; it now shows \"{groups[i][0]}\" from cue "
                     f"{i if left >= right else i + 2}")
    # A cue the correction made too long for two lines hands an edge word to a
    # neighbour with room. A cue Mux already made that long keeps its words,
    # as does one whose neighbours are full; the check reports their lines.
    for i, group in enumerate(groups):
        if not fits(clean_caption_text(cues[i].text).split()):
            continue
        while not fits(group) and len(group) > 1:
            if i + 1 < len(groups) and fits([group[-1]] + groups[i + 1]):
                groups[i + 1].insert(0, group.pop())
                notes.append(f"cue {i + 1} was too long; \"{groups[i + 1][0]}\" moved to cue {i + 2}")
            elif i > 0 and fits(groups[i - 1] + [group[0]]):
                groups[i - 1].append(group.pop(0))
                notes.append(f"cue {i + 1} was too long; \"{groups[i - 1][-1]}\" moved to cue {i}")
            else:
                break
    out = [Cue(cue.ident, cue.start, cue.end, cue.settings, wrap(" ".join(group)))
           for cue, group in zip(cues, groups)]
    return out, notes


# ---------------------------------------------------------------- checks

def check_lesson(original: list[Cue], corrected_source: str, narration: str) -> tuple[list[str], list[str]]:
    """(problems, warnings) for a corrected file. Any problem fails it; a
    warning (a line over the length target) is listed for review."""
    problems, warnings = [], []
    try:
        corrected = parse_vtt(corrected_source).cues
    except CaptionError as error:
        return [f"not valid WebVTT: {error}"], []
    if len(corrected) != len(original):
        problems.append(f"{len(corrected)} cues, original has {len(original)}")
    for index, (old, new) in enumerate(zip(original, corrected), 1):
        if (old.ident, old.start, old.end, old.settings) != (new.ident, new.start, new.end, new.settings):
            problems.append(f"cue {index}: timing changed from {old.timing!r} to {new.timing!r}")
        if len(new.lines) > LINES_MAX:
            problems.append(f"cue {index}: {len(new.lines)} lines")
        for line in new.lines:
            if len(line) > LINE_MAX:
                warnings.append(f"cue {index}: line of {len(line)} characters: {line!r}")
    got = [word for cue in corrected for word in cue.text.split()]
    want = narration.split()
    if len(got) != len(want):
        problems.append(f"{len(got)} words, narration has {len(want)}")
    for index, (a, b) in enumerate(zip(got, want)):
        if a != b and not same_number(a, b):
            problems.append(f"word {index + 1}: {a!r} where the narration has {b!r}")
            break
    return problems, warnings


def same_number(a: str, b: str) -> bool:
    """True when two words differ only by writing a number as digits or a word."""
    pa, pb = SPLIT_PIECES.split(a), SPLIT_PIECES.split(b)
    if len(pa) != len(pb):
        return False
    differs = False
    for x, y in zip(pa, pb):
        if x == y:
            continue
        (lx, cx, tx), (ly, cy, ty) = split_core(x), split_core(y)
        vx, vy = number_value(cx), number_value(cy)
        if lx != ly or tx != ty or vx is None or vx != vy:
            return False
        differs = True
    return differs


# ---------------------------------------------------------------- change list

def lesson_paths(slug: str) -> tuple[Path, Path]:
    return ORIGINAL_DIR / f"{slug}.vtt", CORRECTED_DIR / f"{slug}.vtt"


def keys_of(text: str) -> list[str]:
    return [key for word in text.split() for key, _ in word_keys(word)]


def classify(old: str, new: str) -> str:
    """same, punctuation (also capitals and hyphens), number (digits or words), or words."""
    old = clean_caption_text(old)
    if old == new:
        return "same"
    if keys_of(old) != keys_of(new):
        return "words"
    def letters(text):
        return re.sub(r"[^a-z0-9]", "", text.lower())
    return "punctuation" if letters(old) == letters(new) else "number"


def mark_diff(old: str, new: str) -> tuple[str, str]:
    """Both texts with the words that differ in bold."""
    a, b = clean_caption_text(old).split(), new.split()
    ka, kb = [compare_key(w) for w in a], [compare_key(w) for w in b]
    left, right = [], []
    for op, i1, i2, j1, j2 in SequenceMatcher(None, ka, kb, autojunk=False).get_opcodes():
        if op == "equal":
            left += a[i1:i2]
            right += b[j1:j2]
        else:
            if i2 > i1:
                left.append("**" + " ".join(a[i1:i2]) + "**")
            if j2 > j1:
                right.append("**" + " ".join(b[j1:j2]) + "**")
    return " ".join(left), " ".join(right)


def md_cell(text: str) -> str:
    return text.replace("|", "\\|") or "(none)"


def lesson_report(number: str, slug: str, title: str, original: list[Cue], corrected: list[Cue],
                  placement: Placement, notes: list[str], warnings: list[str]) -> tuple[dict, str]:
    kinds = {"same": 0, "punctuation": 0, "number": 0, "words": 0}
    rows = []
    for index, (old, new) in enumerate(zip(original, corrected), 1):
        kind = classify(old.text, new.text)
        kinds[kind] += 1
        if kind in ("words", "number"):
            left, right = mark_diff(old.text, new.text)
            rows.append(f"| {index} | {old.start} | {md_cell(left)} | {md_cell(right)} |")
    summary = {"lesson": number, "slug": slug, "title": title, "cues": len(original), "kinds": kinds,
               "notes": len(notes), "long_lines": len(warnings)}
    out = [f"### {number} {title} (`{slug}`)", ""]
    out.append(f"{len(original)} cues: {kinds['words']} with word changes, {kinds['number']} with "
               f"number style only, {kinds['punctuation']} with punctuation or capitals only, "
               f"{kinds['same']} unchanged.")
    out.append("")
    if rows:
        out += ["| Cue | Starts | Caption said | Now reads |", "|---|---|---|---|", *rows, ""]
    if placement.number_swaps:
        out.append("Number style kept from the caption track (migration 0018 writes it the other way): "
                   + "; ".join(f"`{swap['from']}` as `{swap['to']}` (cue {swap['cue'] + 1})"
                               for swap in placement.number_swaps) + ".")
        out.append("")
    for note in notes:
        out.append(f"- Layout: {note}.")
    for warning in warnings:
        out.append(f"- Long line: {warning}.")
    if notes or warnings:
        out.append("")
    return summary, "\n".join(out)


# ---------------------------------------------------------------- commands

def correct_lesson(slug: str, narration: str, numbers: str) -> tuple[list[Cue], list[Cue], Placement, list[str]]:
    original_path, corrected_path = lesson_paths(slug)
    original = parse_vtt(original_path.read_text(encoding="utf-8")).cues
    placement = place(original, narration, numbers)
    corrected, notes = build_cues(original, placement)
    note = ("Corrected captions: every cue keeps the timing of Mux's English auto-captions; "
            "the words are the lesson narration (nsc/supabase/migrations/0018). "
            "Built by nsc/tools/infant-captions/captions.py.")
    corrected_path.parent.mkdir(parents=True, exist_ok=True)
    corrected_path.write_text(write_vtt(corrected, [note]), encoding="utf-8")
    return original, corrected, placement, notes


def cmd_correct(args) -> int:
    narrations = load_narration()
    slugs = [slug for slug in SLUGS if lesson_paths(slug)[0].exists()]
    if not slugs:
        print("No caption tracks in original/ yet; run fetch first.", file=sys.stderr)
        return 1
    summaries, sections, failed = [], [], False
    for number, slug, title in LESSONS:
        if slug not in slugs:
            continue
        original, corrected, placement, notes = correct_lesson(slug, narrations[slug], args.numbers)
        written = lesson_paths(slug)[1].read_text(encoding="utf-8")
        # Word for word against what was placed, then against the narration
        # itself, where only a number's digits-or-word style may differ.
        exact, _ = check_lesson(original, written, " ".join(placement.words))
        problems, warnings = check_lesson(original, written, narrations[slug])
        problems = list(dict.fromkeys(exact + problems))
        summary, section = lesson_report(number, slug, title, original, corrected, placement, notes, warnings)
        summaries.append(summary)
        sections.append(section)
        failed |= bool(problems)
        status = "ok" if not problems else "FAILED: " + "; ".join(problems)
        print(f"{number} {slug}: {summary['cues']} cues, {summary['kinds']['words']} with word changes, "
              f"{len(warnings)} long lines; {status}")
    write_changes(summaries, sections, args.numbers)
    print(f"Wrote {CHANGES_MD.name} and {len(summaries)} corrected file(s)")
    return 1 if failed else 0


def write_changes(summaries: list[dict], sections: list[str], numbers: str) -> None:
    missing = [f"{number} {title}" for number, slug, title in LESSONS
               if slug not in {s["slug"] for s in summaries}]
    out = ["# Infant class: corrected English captions", "",
           "Generated by `captions.py correct`. Each corrected file in `corrected/` keeps every cue "
           "and every timing of the lesson's Mux auto-caption track (saved untouched in `original/`) "
           "and replaces the words with the lesson narration from migration 0018.",
           "",
           ("Number style follows the caption track: where it shows digits, so do the captions."
            if numbers == "captions" else "Number style follows migration 0018."),
           "",
           "| Lesson | Cues | Word changes | Number style only | Punctuation or capitals only "
           "| Unchanged | Words moved between cues | Lines over 42 characters |",
           "|---|---|---|---|---|---|---|---|"]
    for s in summaries:
        k = s["kinds"]
        out.append(f"| {s['lesson']} {s['title']} | {s['cues']} | {k['words']} | {k['number']} | "
                   f"{k['punctuation']} | {k['same']} | {s['notes']} | {s['long_lines']} |")
    out.append("")
    if missing:
        out += ["Not built yet (no original caption file): " + ", ".join(missing) + ".", ""]
    out += ["## Changed cues, by lesson", "",
            "Bold marks the words that differ. Cues whose only changes are punctuation, capitals "
            "or hyphens are counted above, not listed.", ""]
    out += sections
    CHANGES_MD.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def cmd_check(args) -> int:
    narrations = load_narration()
    failed = False
    slugs = args.slugs or [slug for slug in SLUGS if lesson_paths(slug)[1].exists()]
    for slug in slugs:
        original_path, corrected_path = lesson_paths(slug)
        original = parse_vtt(original_path.read_text(encoding="utf-8")).cues
        problems, warnings = check_lesson(original, corrected_path.read_text(encoding="utf-8"),
                                          narrations[slug])
        failed |= bool(problems)
        print(f"{slug}: " + ("ok" if not problems else "FAILED") +
              (f", {len(warnings)} lines over {LINE_MAX} characters" if warnings else ""))
        for line in problems + warnings:
            print("  " + line)
    return 1 if failed else 0


def cmd_fetch(args) -> int:
    if args.slug not in SLUGS:
        print(f"unknown lesson {args.slug!r}; one of: {', '.join(SLUGS)}", file=sys.stderr)
        return 2
    if args.from_file:
        cues, notes = parse_vtt(Path(args.from_file).read_text(encoding="utf-8")).cues, [
            f"Imported from a downloaded file on {datetime.date.today().isoformat()}."]
    else:
        playback_id, token = args.playback_id, args.token
        if args.playback_json:
            signed = json.loads(Path(args.playback_json).read_text(encoding="utf-8"))
            playback_id, token = signed["playbackId"], signed["token"]
        if args.preview:
            if args.slug != "serve-and-return":
                print("--preview only reaches the free lesson, serve-and-return", file=sys.stderr)
                return 2
            signed = json.loads(http_get(PREVIEW_PLAYBACK))
            playback_id, token = signed["playbackId"], signed["token"]
        if not (playback_id and token):
            print("give --preview, --playback-json, --from-file, or --playback-id with a token",
                  file=sys.stderr)
            return 2
        if args.track_id:
            cues, notes = fetch_text_track(playback_id, token, args.track_id)
        else:
            cues, notes = fetch_hls(playback_id, token, args.track_name)
    if not cues:
        raise CaptionError("the caption track has no cues")
    path = lesson_paths(args.slug)[0]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(write_vtt(cues, notes), encoding="utf-8")
    print(f"{args.slug}: {len(cues)} cues saved to original/{path.name}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    fetch = commands.add_parser("fetch", help="save a lesson's current English caption track (read-only)")
    fetch.add_argument("slug")
    fetch.add_argument("--preview", action="store_true", help="use the public free-lesson route")
    fetch.add_argument("--playback-id")
    fetch.add_argument("--playback-json", help="a saved response from the lesson's playback route")
    fetch.add_argument("--token", default=os.environ.get("MUX_PLAYBACK_TOKEN"),
                       help="signed playback token (default $MUX_PLAYBACK_TOKEN); never written to disk")
    fetch.add_argument("--track-id", help="read /text/<id>.vtt instead of the HLS subtitle segments")
    fetch.add_argument("--track-name", help="choose among several English subtitle tracks")
    fetch.add_argument("--from-file", help="a .vtt downloaded from the Mux dashboard")
    fetch.set_defaults(run=cmd_fetch)
    correct = commands.add_parser("correct", help="rebuild corrected/ and CHANGES.md from every track in original/")
    correct.add_argument("--numbers", choices=["captions", "0018"], default="captions",
                         help="digits or words: as the caption track shows them (default) or as 0018 does")
    correct.set_defaults(run=cmd_correct)
    check = commands.add_parser("check", help="validate corrected captions")
    check.add_argument("slugs", nargs="*")
    check.set_defaults(run=cmd_check)
    args = parser.parse_args(argv)
    try:
        return args.run(args)
    except CaptionError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
