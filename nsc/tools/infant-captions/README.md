# Infant class: corrected English captions

Mux auto-generated the English caption track on every infant lesson, and it has the same
transcriber errors that migration 0018 fixed in the written versions: "Tronic" for Tronick,
"Patricia Kool's" for Kuhl's, "coup" for coo, "parentes" for parentese, "four and ten" for
"four in ten". `captions.py` builds a corrected WebVTT file per lesson that keeps every cue
and every timing of the current track and replaces the words with the lesson narration.

Everything here is read-only. Nothing uploads to Mux, changes an asset, or writes to the
database. Python 3.9 or later, standard library only, no installs.

## Steps

All commands run from the repository root.

**1. Save each lesson's current caption track** to `original/<slug>.vtt` (read-only GETs).

- Serve and Return, the free lesson, needs no sign-in:

  ```sh
  python3 nsc/tools/infant-captions/captions.py fetch serve-and-return --preview
  ```

- The other 15 need a playback token. Signed in to growingmindsscience.com with an account
  that has the infant class, open the lesson, and in the browser's developer tools (Network)
  find the request ending in `/playback`. Save its response (JSON with `playbackId` and
  `token`) to a file outside the repository, then:

  ```sh
  python3 nsc/tools/infant-captions/captions.py fetch born-ready-to-connect --playback-json ~/Downloads/playback.json
  ```

  The token expires within about an hour of the request and is never written into the
  repository. A `.vtt` of the track saved some other way (for example from the Mux
  dashboard) can be brought in with `--from-file PATH` instead.

Lesson slugs, in course order: `born-ready-to-connect`, `a-brain-built-by-experience`,
`serve-and-return`, `states-crying-and-the-borrowed-nervous-system`,
`capable-and-fragile-at-once`, `the-cue-vocabulary`, `temperament`,
`feeding-as-a-conversation`, `sleep-across-the-first-year`,
`what-secure-attachment-is-and-isn-t`, `many-hands`, `separation-and-stranger-wariness`,
`language-before-words`, `on-the-move`, `play-and-the-hidden-toy`,
`screens-and-the-year-ahead`.

**2. Build the corrected files and the change list.**

```sh
python3 nsc/tools/infant-captions/captions.py correct
```

This writes `corrected/<slug>.vtt` for every lesson in `original/`, and `CHANGES.md`: a
summary table, then every cue whose words changed, with the old and new text side by side.
It exits with an error if any file fails a check.

**3. Re-check at any time:** `python3 nsc/tools/infant-captions/captions.py check`

Tests: `python3 -m unittest discover -s nsc/tools/infant-captions`

## What `correct` does

- **Words.** The narration is the corrected text in
  `nsc/supabase/migrations/0018_infant_transcript_corrections.sql`: each lesson's
  `script.py` narration, which the ElevenLabs voice read word for word, in its agreed written
  form (the 1.5 hotline as `1-833-TLC-MAMA`, `postpartum.net` and `988`; thousands with a
  comma). The caption words are aligned to it word by word. Where the transcriber misheard a
  stretch, the two versions are matched letter by letter, so each word lands in the cue that
  held its misheard version. A word the transcriber dropped joins the cue before it, unless a
  new sentence starts there.
- **Numbers.** Where the caption track shows a number as digits, the corrected cue keeps
  digits; where it shows a word, a word. A sentence never starts with a numeral. Each case
  where this differs from 0018 is listed in `CHANGES.md`. To match the written version
  exactly instead, run `correct --numbers 0018`.
- **Layout.** One line if the cue fits in 42 characters, otherwise two, breaking after a full
  stop or comma where possible. If a correction makes a cue too long for two 42-character
  lines, its edge word moves to a neighbouring cue with room. A cue Mux already made that long
  stays on two longer lines. Both are listed in `CHANGES.md`.
- **Checks** on every file: it parses as WebVTT; it has the same number of cues, with the
  same identifiers, start and end times and settings, as the original; every narration word
  appears exactly once, in order; no cue has more than two lines.

## Uploading to Mux (needs Matthew's OK, per lesson)

Mux cannot edit the text of an existing track, so replacing one means adding the corrected
track and deleting the auto-generated one. For each lesson's asset:

1. Add the corrected track: `POST https://api.mux.com/video/v1/assets/{ASSET_ID}/tracks` with
   `url` set to the file's raw GitHub address pinned to the reviewed commit
   (`https://raw.githubusercontent.com/growingmindsscience/growingmindsscience/<commit>/nsc/tools/infant-captions/corrected/<slug>.vtt`),
   `type: "text"`, `text_type: "subtitles"`, `language_code: "en"`, and the same `name` and
   `closed_captions` values as the current English track.
2. Wait until the new track's status is `ready`, then play the lesson with captions on.
3. Delete the auto-generated track: `DELETE https://api.mux.com/video/v1/assets/{ASSET_ID}/tracks/{OLD_TRACK_ID}`.
   Mux has no way to switch a text track off, so this is a deletion. The old text stays in
   `original/<slug>.vtt`, and Mux can regenerate auto captions on request.

Between steps 1 and 3 the player's captions menu shows two English tracks.

The admin sync (`nsc/app/api/admin/classes/sync/route.ts`) only asks Mux for captions when an
asset has no subtitle track, and only imports a written version when the lesson has none, so
syncing again will not undo this. Uploading a replacement video creates a new asset with fresh
auto captions, and that lesson's corrected track would need to be added again.
