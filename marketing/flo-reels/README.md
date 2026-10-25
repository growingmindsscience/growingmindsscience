# FLO Reels

Reels for @fromlittleonward. Each one moves through: script, approved, frames, narrated, rendered, sent to Muse. Muse publishes and makes the carousels; nothing here posts.

One folder per Reel, `<YYYY-MM-DD>_<short-slug>/`, holding script.md, frames (HTML and PNG), cover.png, narration audio, final.mp4 and caption.txt. Scripts, captions and HTML frames are kept in the repo. The PNGs, audio and MP4 are sent straight to Matthew.

| Date | Reel | Points to | Status |
| --- | --- | --- | --- |
| 2026-10-30 | Why your baby cries when you leave | Birth to 12 Months class | sent to Muse 2026-10-25, scheduled Fri Oct 30 about 9:30am ET (v2: new narration with Matthew's settings, music bed) |
| 2026-11-03 | Counting is not the same as knowing numbers | Teach | carousel, made by Muse (no Reel here) |
| 2026-11-06 | Why preschoolers struggle to share | Preschool Years class | carousel, made by Muse (no Reel here) |
| 2026-11-10 | Read with, not to | Teach | waiting for calendar entry |
| 2026-11-17 | Number talk in the kitchen | Teach | carousel, made by Muse (no Reel here) |
| 2026-11-20 | Toddlers and a full holiday house | Toddler Years class | waiting for calendar entry |
| 2026-11-24 | Video chat with faraway family | Teach | waiting for calendar entry |
| 2026-12-01 | Praise the effort | Teach | waiting for calendar entry |
| 2026-12-04 | Babbling is talking | Birth to 12 Months class | waiting for calendar entry |
| 2026-12-08 | What science says about pretend play | Teach | waiting for calendar entry |
| 2026-12-11 | Naming big feelings | Preschool Years class | waiting for calendar entry |
| 2026-12-15 | Two languages won't confuse your child | Teach | waiting for calendar entry |
| 2026-12-18 | Read to your baby from day one | Birth to 12 Months class | waiting for calendar entry |
| 2026-12-29 | A new year of growing together | All three classes | waiting for calendar entry |

Single-image posts made elsewhere: Nov 13 (free pilot for organizations), Nov 27 (the best toys are simple), Dec 22 (small family rituals).

## Making one

1. `script.md`: on-screen text and narration per beat, from the approved calendar entry.
2. Narration: ElevenLabs API (not the connector, which cannot set voice settings), `eleven_v4`, "Matthew's Voice" (voice id `KjZZHIOnbFqvGnNEwISh`), stability 0.3, similarity 0.9, speed 1.05, `output_format=mp3_44100_192` (PCM needs the Pro tier), one take through `/with-timestamps`. Saved as `narration.mp3`, word timings in `words.json`.
   Music: an instrumental bed from the ElevenLabs Music API (`music_v2_5`, `force_instrumental`), saved as `music.mp3`. Mix to a WAV first: voice loudnormed to -16 LUFS, music at 0.45 when the voice is silent and 0.13 under it, 1.2 s fade in and 1.5 s fade out, limiter at -1 dB. Render with that WAV.
3. `frames.html`: the animated frames (1080x1920, brand guide 2.1, see `BRAND.md`), with the captions timed from `words.json`.
4. Render: `node marketing/flo-reels/render.mjs <folder> cover`, `... stills <t> ...`, `... video mix.wav`. Output is `final.mp4` (H.264, AAC 256k, 30 fps). It launches installed Chrome.
5. `caption.txt`: the calendar caption, with its source line and hashtags, ready to paste to Muse.
