# Instagram system, second attempt

Design for restarting @growingmindsscience with carousels and reels. Written 2026-10-18 after reading the first automation end to end. Nothing here is built yet; this is the spec the build follows.

## What went wrong the first time

The June to September pipeline (`~/growing-minds-science-brand/` and `marketing/carousels/`) had good research discipline and almost nothing else.

1. **Nothing shipped.** Nine carousels were built between July and September. One was posted. The log for the other eight says some version of "Canva MCP not connected, Chrome not logged in, awaiting approval". Publishing depended on a logged-in browser and on Canva, and approval was a chat message nobody acted on. The content was fine. The last mile never existed.
2. **Every post looked the same.** Navy slab, orange "DID YOU KNOW?" eyebrow, a headline, a paragraph, a citation, the brain logo. Six slides per carousel in that one template, nine carousels in a row. No picture, no person, no figure, no variation in the cover. In a feed it reads as a text wall, and the profile grid reads as one post repeated.
3. **The reel was a slide with a timer.** Seven seconds, a number counting up on a teal field, synthesized piano, no voice, no captions, no footage. That is the lowest-reach reel format there is.
4. **It is off-brand now.** Poppins, teal and orange, the brain-and-sprout mark. The 2026-10-14 brand guidelines (Newsreader and Inter, forest ink on field paper, no warm color at scale, no brain imagery) make every old asset unusable as is.
5. **Paper first, parent second.** Topics were picked by "which study have we not used", not "what is the parent of a fourteen-month-old worried about tonight". The hooks were study names.
6. **It could not re-run.** Fonts and the logo were hardcoded to a cloud sandbox path (`/sessions/...`), so the build scripts died on this Mac.
7. **No feedback loop.** Nothing read Instagram's own numbers back, so there was no way to learn what to make more of.

What to keep: the primary-source verification, the replication notes, the rejected-topics list and the single topic ledger shared with LinkedIn. That discipline is the brand. It just needs a delivery system around it.

## Principles for the new system

- **Publish through the Instagram API, never a browser.** The last mile is a script with a token, run on a schedule.
- **One human gate, once a week.** Matthew reviews a batch in one place and approves with one action. Approved posts publish themselves on their dates. No per-post chat pings. (Since 2026-10-20 the gate is a veto rather than an approval: see "Phase 4: the automated loop".)
- **The posts use the site's own design system.** Templates are HTML rendered with headless Chrome, reading `assets/css/tokens-field-guide.css` and the site fonts. A post should look like a page of the site cut out and held up to the camera.
- **Lead with the moment, cite the study.** Every post starts from an ordinary parent moment (the ninth dropped spoon, the 7pm meltdown, "18 months and not talking yet") and earns its citation on the last slide.
- **Four recurring series, four recognizable covers.** Variety comes from the series, not from improvising each post.
- **Every post points somewhere useful on the site.** A free tool, an article, a class. That is the funnel and it is also the brand's promise.
- **Measure saves and shares, not likes.** Pull Insights weekly and let them steer the next batch.

## Formats

All stills are 1080 x 1350 (4:5). Instagram shows carousels at 4:5 in the feed and the API crops every slide to the first slide's ratio, so the cover decides the shape. Reels are 1080 x 1920, with everything that matters inside the central 1080 x 1350 so the feed crop and the profile crop both work.

### Carousel series

| Series | What it is | Cover grammar | Links to |
| --- | --- | --- | --- |
| **Field notes** | The site's annotated plate, as a carousel. Slide 1 is an ordinary scene drawn in silhouette with one label. Each swipe adds one label, the explanatory reveal. Second to last: what to try. Last: sources. | Paper ground, the plate, one Newsreader sentence under it ("What's growing when she drops the spoon again"). | A Lens page or a tool |
| **One study, plainly** | The research carousel, rebuilt. Cover is the surprising human sentence, not the study name. Then the setup as a story, the result as one small figure, the catch (what it does not show), what it means at home, sources. | Forest-ink ground, a large Newsreader sentence, one research-blue figure number in the corner. | An article or Growing Minds AI |
| **Is this normal?** | Age-tagged ranges from the milestones corpus. Cover is the question parents search. Slides give the range, the normal variation, and the signs that merit a conversation with a pediatrician. | Sage-mist ground, the question in Newsreader, an age chip in Inter. | Communication Snapshot, Milestone Navigator once cleared |
| **What we got wrong** | The correction series: the word gap, the marshmallow test, helper and hinderer. Cover is the claim with a strike through it. | Paper ground, the claim in Newsreader with a clay rule through it, "what the evidence says now" below. | The Claims Library |

Cover rules for all four: one lead sentence of twelve words or fewer, no eyebrow, no "swipe" arrow, the small mark in one corner. Slide bodies: Inter at 44px or larger, never more than 55 words on a slide, one idea per slide. Last slide always carries the sources in research blue and "Educational content, not medical advice" in ink-muted.

The profile grid alternates paper, forest and sage covers so it reads as a pattern instead of a repeat.

### Reel series

| Series | Length | How it is made | Automation |
| --- | --- | --- | --- |
| **Watch for this** | 45 to 50 s | One annotated scene. Matthew's voice names what to notice; labels appear as he names them. Burned-in captions. | Fully rendered: HTML animation, voice from script, captions from the voice timestamps |
| **The study in 30 seconds** | 55 to 60 s | Kinetic text version of a One-study carousel. The figure animates once. Voice over. | Fully rendered |
| **On camera** | 30 to 60 s | Matthew, phone, one take, one idea. The pipeline supplies the script, trims, captions and picks the cover frame. | Script and post-production automated; the recording is his |

Voice (decided 2026-10-18): Matthew's ElevenLabs voice, the same one the class audio uses, rendered by the pipeline with the settings that already work for it (speed 1.05, stability 30, similarity 90), one take at a time and checked before it ships. Phone recordings remain an option for later, not the default. Scripts are written to be read aloud in under 40 seconds and marked for breath and emphasis. A stock voice is never used.

On camera (decided 2026-10-18): not yet. The two rendered series carry the reel slot for now; the On-camera series stays in the spec for when Matthew wants it, and the post-production path for it is built only then.

Reel captions are burned in with word timing, because most of the audience watches muted.

### Music (added 2026-10-18)

Every reel carries a music bed generated with ElevenLabs Music v2.5, which the connected ElevenLabs workspace exposes as a `music` node (`eleven_music_v2_5`, instrumental, 3 to 600 seconds). Its `composition` node mixes the rendered video, the voice track and the music into one file with per-track volume, so the whole reel can be assembled there or with ffmpeg locally.

Rules for the bed:

- Instrumental only, one brief per series so the series is recognizable by ear: Field notes and Watch for this get a sparse felt piano with room tone; One study gets a low pulse with a soft string pad that lifts once at the result; the correction series gets a dry, slightly wry plucked motif. The brief is stored in `spec.json` as `music.brief` and reused, not reinvented per post.
- Ducked under the voice to about minus 18 dB, raised in the first two seconds and the last three.
- Generated once per post and stored with the post's renders; never Instagram's audio library, which the API cannot attach.

Carousels: the API cannot attach audio to an image carousel. Two options, both supported by the review page, which names the recommended track: publish via the API without music, or let Matthew add a track in the app in the thirty seconds after it publishes. If music on every carousel turns out to matter in the numbers, a carousel can also ship as a reel (each slide held for 2.5 seconds, the same bed underneath) through the reel renderer.

### Retention structure for every reel (added 2026-10-18)

The first two seconds decide the reel. Each rendered reel follows one structure, and the on-camera script is written to the same beats:

1. **Hook, 0 to 2 s.** On-screen text states the surprise or the question before anything else moves ("Your newborn already knows your voice." / "18 months and not talking yet?"). No logo, no intro, no name.
2. **Promise, 2 to 5 s.** One line that tells the viewer what they will have by the end ("Here is what the study actually found, and what to do at home.").
3. **Payoff in beats, 5 to 25 s.** One idea per beat, a visible change every 2 to 3 seconds (a label appears, a figure animates, the scene shifts). Open loops are allowed ("the third one surprised the researchers") only when the loop closes inside the reel.
4. **The honest catch, one beat.** What the study does not show. This is the brand, and it is also what makes the account worth following rather than a source of one-off facts.
5. **Close, last 3 to 5 s.** One destination, said and shown: "Free tool, link in bio" with the page's name. Then the mark for one second. No "follow for more" as the closing line; the destination is the close.

Cover frame: the hook text on the series ground, chosen by the renderer from the first second, so the profile grid shows the hook.

### Bringing parents to the site (added 2026-10-18)

The account exists to move parents from the feed to a page that helps them. Every post has one destination, chosen before the copy is written, and the copy ends on it.

- The destination is always a free page: a tool, an article, the free preview lesson, the Claims Library. Classes are reached from those pages, never pitched from a post.
- The link line names the page ("Communication Snapshot, free, link in bio"), never a bare "link in bio".
- The bio link points to a short landing page, `/from-instagram`, that lists the last four posts' destinations with the newest first, so a parent who taps the bio link from an older post still finds the page they came for. `publish.mjs` rewrites that list on every publish and tags each link `utm_source=instagram&utm_medium=social&utm_campaign=<post id>`, so the site's analytics show which post sent whom.
- Comment keywords ("comment SPOON and I will send the guide") need the Messaging API and a reply automation. That is a Phase 4 option, tried only after the simpler path has four weeks of numbers.
- Stories: the day a carousel publishes, Matthew can share the cover to a story with a link sticker to the destination; the review page shows the ready-to-share cover and the link.

Measurement adds two numbers to the weekly readout: taps on the bio link per post (from the landing page's analytics) and page visits per post (from the UTM campaign).

## Content engine

### Topic selection

A post is chosen by filling a gap in a matrix, not by picking a study.

| | 0 to 12 months | 1 to 3 years | 3 to 5 years |
| --- | --- | --- | --- |
| Language and communication | | | |
| Big feelings and meltdowns | | | |
| Sleep, routines, transitions | | | |
| Play and attention | | | |
| Screens | | | |
| "Is this normal?" worry | | | |
| The parent's own state | | | |

Each week's batch covers two age bands and three rows, and no row or band goes more than three weeks unposted.

### Sources, in priority order

1. `knowledge/curated.mjs`, the certified corpus (eighteen entries).
2. The nine carousels already built and verified in `marketing/carousels/`. Eight were never posted. Their research is done; they get re-rendered in the new templates as the first backlog.
3. The fourteen LinkedIn drafts in `marketing/linkedin/drafts/`, rewritten for the feed.
4. The tools and articles on the site, each of which is a ready-made "what to try" slide.
5. New primary sources, verified the same way the old log did it (full paper read, replication status noted).

### The ledger

`marketing/instagram/ledger.json` replaces the markdown tables. One record per topic with the source, the date used, the channel, and the series. The rejected-topics list lives in the same file. LinkedIn drafting reads it too, so the July collision (same two studies on both channels in one week) cannot recur.

### Citation and claims gate

Before a post can enter review:

- every factual claim traces to a corpus entry or a verified primary source named in `sources.md`;
- effect sizes and replication status are stated the way the source states them;
- age ranges are written as ranges;
- the disclaimer is on the last slide and in the caption;
- nothing on the rejected list appears;
- no "studies show" without a study.

### Captions

First 125 characters do the work: the hook sentence, then one line of substance. One question per caption, placed last. Five to eight hashtags, specific, in the caption not a comment. The link line is always "Free tool in bio" or "Article in bio", never a bare "link in bio".

## Pipeline

```
marketing/instagram/
  README.md            this document
  calendar.json        the queue: id, series, age band, row, status, scheduled_at
  ledger.json          topics used and rejected, shared with LinkedIn
  posts/<yyyy-mm-dd>-<slug>/
    spec.json          series, slides or scenes, figure data, links
    caption.md
    sources.md
    out/               renders (gitignored; uploaded to storage, not committed)
  templates/
    carousel/<series>.html
    reel/<series>.html
  scripts/
    render-carousel.mjs   spec.json to JPEGs via headless Chrome
    render-reel.mjs       spec.json to MP4: frame capture, ElevenLabs voice, captions, ffmpeg
    review.mjs            builds the weekly review page; approve and reject write calendar.json
    publish.mjs           uploads renders to storage, creates and publishes containers, updates ledger
    insights.mjs          pulls saves, shares, reach and follows per post; writes a weekly readout
```

**Rendering.** `scripts/build-og-cards.mjs` already renders HTML to PNG with headless Chrome and no npm dependencies. The carousel renderer is the same approach with the field-guide tokens and `assets/fonts/` instead of Google Fonts, and JPEG output because the API only accepts JPEG. Reels render the same template with a `t` parameter per frame, capture at 30 fps, and ffmpeg assembles the frames with the voice track. ffmpeg is on this Mac at `/opt/homebrew/bin/ffmpeg`.

**Hosting.** The API fetches media by public URL at publish time. Renders go to a public bucket in the science Supabase project (`kxljngtmnqarvsawakmf`), one folder per post. Nothing rendered is committed; specs and scripts are.

**Publishing.** The Instagram Graph API, Instagram Login flavor: `POST /{ig-id}/media` per slide with `is_carousel_item=true`, one more with `media_type=CAROUSEL` and the children, then `POST /{ig-id}/media_publish`. Reels: one container with `media_type=REELS` and `video_url`, poll `status_code` once a minute up to five minutes, then publish. Limit is 100 API posts per rolling 24 hours, far above anything we do. Needs: a professional account, a Meta app with `instagram_business_basic` and `instagram_business_content_publish`, and a long-lived token refreshed every 60 days (the publish script refreshes it when under ten days remain and fails loudly if it cannot).

**Scheduling.** A GitHub Actions cron in this repo runs `publish.mjs` daily at 11:00 and 19:00 Eastern. It publishes any post in `calendar.json` whose status is `approved` and whose date has arrived, then commits the status change and the ledger update. The token lives in repository secrets. This reuses the gates workflow pattern that already runs here.

**Drafting.** (Superseded by Phase 4, below.) A weekly Claude Code routine (Sunday) reads the ledger and the Insights readout, picks four topics by the matrix, writes the spec, caption and sources for each, renders them, and opens a pull request titled "Instagram batch, week of <date>" with the review page attached. That is the one place Matthew looks.

**Review.** The review page shows each post as the feed will show it: cover at feed size, slides swipeable, reel playing muted with captions, caption with the 125-character fold marked. Approve, edit, or reject per post. Merging the PR is the approval. Nothing publishes from an unmerged branch.

**Measurement.** `insights.mjs` runs Monday morning, pulls per-post reach, saves, shares, profile visits and follows for the last four weeks, and writes `marketing/instagram/readouts/<date>.md`. The drafting routine reads the latest readout and weights the matrix toward rows and series that are saving and sharing. Saves per reach is the number to move.

### Reel specs (Phase 3, added 2026-10-18)

A reel post is a folder like a carousel's, with `"kind": "reel"` in `spec.json`, a `series` of `watch-for-this` or `study-in-30`, a `source` (the carousel it was cut from; `caption.md` and `sources.md` are copied from it), a `music.brief`, and `beats` instead of slides. Each beat has an `id`, the on-screen `text` (and optional `sub`), what the voice says in `say`, a `pause` after it in seconds, and for Watch for this how many plate `labels` are shown. Two beats are special: the first has `kind: "hook"` (no mark on screen) and the last two are `kind: "close"` (the destination line) and `kind: "mark"` (the mark alone for `dur` seconds). A Study in 30 beat may carry `bars` or a `stat`, which animate once when the beat begins.

`scripts/render-reel.mjs <post>` voices each beat with Matthew's ElevenLabs clone (word timestamps come back with the audio, so captions are exact), generates the music bed from the brief with ElevenLabs Music, lays beats end to end from the real audio lengths, captures frames from `templates/reel/<series>.html` at 30 fps with headless Chrome and pipes them straight into ffmpeg, and mixes the voice over the bed (ducked to 0.12 while someone is talking, 0.45 before and after). Output: `out/reel.mp4`, `out/cover.jpg` (the hook frame), `out/timeline.json`, `out/check.json`. Voice and music takes are cached in `out/` by content hash, so a layout change costs no credits; a changed line re-records only that beat. Without an API key the reel renders silent and says so; no other voice is ever used.

Length is governed by the script, not the renderer: at Matthew's speed the voice runs about 2.3 words a second including the pauses inside sentences. Scripts are written as full, plain sentences a parent can follow on first hearing (decided 2026-10-18 after the first takes): no fragments or tagline phrases, no anatomy or lab jargon (the part of the brain that handles speech, not Broca's area), the study told as something that happened to children and families. That puts Watch for this at about 110 words and 45 to 50 seconds, and Study in 30 at about 130 words and 55 to 60 seconds; clarity wins over the original 35 and 45 second targets. `publish.mjs` treats a reel like any post: render, upload `reel.mp4` and `cover.jpg`, create a `REELS` container, wait for processing, publish, record.

## Cadence

Four posts a week to start: two carousels, two reels. Tuesday and Thursday carousels at 11:00, Wednesday and Saturday reels at 19:00. Both reels are rendered (one Watch for this, one Study in 30 seconds) until Matthew opts into the On-camera slot. Stories are out of scope for the automation; if he wants them, the carousel cover with a link sticker is a thirty-second manual job.

Consistency for twelve weeks before changing anything about cadence.

## Build order

**Phase 0, Matthew, about an hour.** Confirm the account is a professional account. Create the Meta app and connect the account with Instagram Login. Generate the first long-lived token and put it in repository secrets. Decide the voice: ElevenLabs clone, a stock ElevenLabs voice, or his own recordings.

**Phase 1, templates and the carousel renderer.** The four carousel templates on the field-guide tokens. `render-carousel.mjs`. Re-render the eight unposted studies as "One study, plainly" posts, plus one of each other series from the corpus. Review page. Output: twelve posts rendered locally for Matthew to approve, and the first look at the new grid.

**Phase 2, publish and schedule.** The storage bucket, `publish.mjs`, the cron workflow, `calendar.json` and `ledger.json`. First post goes out through the API with Matthew watching. Then the approved backlog on schedule.

**Phase 3, reels.** `render-reel.mjs` for the two rendered series, voice, captions. The "On camera" post-production path (trim, captions, cover) once he has recorded one.

**Phase 4, the loop.** Built 2026-10-20 as a fully automated loop instead of a PR-based review: see "Phase 4: the automated loop". From here the weekly cost to Matthew is a glance at the batch issue and, when he wants, a recording.

## Decisions for Matthew

These do not block Phase 1.

1. **Voice.** Decided: Matthew's ElevenLabs voice, rendered by the pipeline.
2. **On camera.** Decided: not yet. Both weekly reel slots are rendered until he says otherwise.
3. **Milestone Navigator links.** It is launch-held on attorney review. "Is this normal?" posts point to Communication Snapshot until it clears.

## Operating (Phase 2, added 2026-10-18)

The pieces: `calendar.json` (the queue), `ledger.json` (topics used and rejected), `scripts/publish.mjs` (publishes what is approved and due), `from-instagram.html` at the repo root (the bio-link landing page, rewritten on every publish), and `.github/workflows/instagram-publish.yml` (runs the publisher hourly through the posting day and commits the records back to main).

### Approving a post

Open the review page (`node marketing/instagram/scripts/review.mjs`, then serve the repo and open `/marketing/instagram/review.html`), decide, and set the post's `status` in `calendar.json` to `approved`, `edit` or `rejected`. Approval lands on main through the weekly review pull request. Nothing publishes from a branch, and nothing publishes with any status other than `approved`.

### Dry run

```bash
node marketing/instagram/scripts/publish.mjs --dry-run --as-of 2026-10-30T12:00:00-04:00
```

Renders every approved post due by that moment, checks the slide rules and the caption length, and prints the destination URL with its UTM tags. No uploads, no API calls, no environment variables needed. Without `--as-of` it uses the real clock, so with nothing due it prints `nothing due` and exits 0. That is the same check the workflow runs first.

### Phase 0, before the first real publish

1. The Instagram account must be a professional account (Business or Creator).
2. In the Meta developer dashboard, create an app, add the Instagram product, and connect the account with Business Login for Instagram, granting `instagram_business_basic` and `instagram_business_content_publish`.
3. Generate a long-lived access token (60 days) and note the Instagram user id. Done 2026-10-18: app id 29134116289612955, Instagram app id 1637872071071253, Instagram user id 17841470147811390 (the API's `me` also reports an app-scoped id, 28811526698487471; both are accepted by the publishing endpoints, and the secret uses the professional account id); @growingmindsscience holds the Instagram Tester role; permissions added: business_basic, manage_comments, manage_messages, content_publish, manage_insights.
4. Add four repository secrets on GitHub: `IG_USER_ID`, `IG_ACCESS_TOKEN`, `SUPABASE_URL` (`https://kxljngtmnqarvsawakmf.supabase.co`) and `SUPABASE_SERVICE_ROLE_KEY` (from the science project's API settings; service role only, never a publishable key).
5. The public `social` bucket must exist in the science Supabase project. The SQL is in `supabase/migrations/20261018_social_bucket.sql`; run it once in the SQL editor if the MCP could not (it needs the project owner).
6. Locally, save the four values once to `~/.config/growingminds/instagram.env` (four `KEY=VALUE` lines, outside the repo; `publish.mjs` reads it when a variable is not already set and never logs it), then run `node marketing/instagram/scripts/publish.mjs --check-token`. It prints the account it sees. Then `--refresh-token` once, which creates `token.json` so the age warning works; commit `token.json` (it holds a date, never the token).
7. Watch the first publish: `node marketing/instagram/scripts/publish.mjs --only <post-id>` locally with Matthew present. After that the workflow runs on its own.

### Token life

Long-lived tokens last 60 days. From day 45 the publisher warns; from day 56 it refuses to publish. Since 2026-10-20 the publish workflow runs `--maintain-token` on every run: from day 30 it refreshes the token, keeps the new one in the private `ops` bucket of the science Supabase project (created on first use), and commits the new date in `token.json`. Every later run reads the stored token ahead of the `IG_ACCESS_TOKEN` secret, so nothing needs pasting. The manual path still works: refresh locally with `--refresh-token`, paste the printed token into the `IG_ACCESS_TOKEN` secret, and commit the updated `token.json`. The token is never written to the repository or to a log by the scripts.

### Music on carousels

The API cannot attach audio to an image carousel. The review page shows each post's music brief; adding a track is a thirty-second step in the app after the post publishes, if wanted.

## Phase 4: the automated loop (added 2026-10-20)

Matthew asked for the account to run itself: intelligent drafting, the most engaging posts the research supports, fresh topics, no manual steps. The loop below replaces the weekly PR review. Approval becomes a veto window: every post that passes the gates is queued as approved, and Matthew can hold any of them from a GitHub issue until it publishes.

### The pieces

- `automation.json`: the settings. Posting slots (Tuesday and Thursday 11:00 carousels, Wednesday and Saturday 19:00 reels), the window (`lead_days` 3, `trigger_days` 10, `horizon_days` 17), the model, the critic's pass scores, cooldowns, the series allowed, and the launch-held links.
- `prompts/playbook.md`: the standard every step works to: audience, what earns reach, how to make a post people save and send, the honesty rules, house style, the series and the music briefs. `prompts/strategist.md`, `prompts/writer.md` and `prompts/critic.md` are each step's brief. Editing these files changes how posts are made; the scripts read them fresh on every run.
- `scripts/research.mjs`: the research the drafter may use, and what is still fresh. 1,124 findings and 171 myths from the 44 class lessons (`knowledge/sources/*.md`, with their citations and confidence notes; callback-only, LOW and pending findings left out), the 9 graded claims of the Claims Library, and the 18 curated cards. A card is stale once it is on a post, or when its lead study (first author and year) was on any post in the last 150 days. Fresh cards are ranked by confidence, by the age band, matrix row and lesson that have gone longest without a post, by concrete numbers, and once there are enough settled posts, by the rows that earn saves. Destinations come from `assets/data/explore.json` (classes excluded), the claim pages and the free preview lesson.
- `scripts/draft.mjs`: the drafter (its header lists the seven steps). Claude plans the batch (one idea, series, hook and free page per slot, every post a different lesson), writes each post from its cards, the whole lesson behind them and an approved example of the series, then a separate critic pass checks every claim against the cards, the honesty rules and the craft and scores it. Posts short of the bar go back with the notes, up to three times, and each later critique checks its own earlier notes so the revisions converge instead of chasing new preferences. Accuracy, the rules and freshness must be clean on every pass; craft must reach `pass_scores`, or `floor_scores` (still publishable) on the last round. A post that never passes is not queued and its slot is tried again on the next run. The first live batch (2026-10-20) took two to three rounds per post; each critic pass takes a few minutes because it checks every claim against the lesson behind it.
- `scripts/validate.mjs`: the deterministic gates. Series shape (cover first, sources last, a try slide on every carousel, the catch on one-study, signs on is-this-normal, hook, catch, close and mark beats on reels), lengths (lead 12 words, 55 per slide via the render, spoken words per reel series), the caption (disclaimer, link line, one closing question, 4 to 8 hashtags, under 2,200 characters), a destination that exists and is not launch-held, and house style (no em dashes, no emoji, no "studies show"). Carousels are also rendered during drafting, so overflow is caught before anything is queued. A reel's close beat carries one line and no sub: the template prints the link label and page under it.
- `scripts/llm.mjs`: Claude through the Claude Code CLI in print mode, with no tools and a JSON schema per step. Locally it uses Matthew's own login; in CI, the `CLAUDE_CODE_OAUTH_TOKEN` secret (or `ANTHROPIC_API_KEY`).
- `scripts/insights.mjs`: the account's numbers per post into `insights.json` (read by the drafter), and with `--readout` the weekly memo in `readouts/`.
- `scripts/holds.mjs`: applies Hold ticks from the batch issues to `calendar.json`.
- `.github/workflows/instagram-draft.yml`: three times a day, asks `draft.mjs --check` whether a slot inside ten days is empty; if so, refreshes insights, drafts, commits the posts and calendar to main and opens the batch issue. Mondays it writes the readout.
- `.github/workflows/instagram-publish.yml`: twice an hour through the posting day, applies holds, keeps the token fresh, publishes what is approved and due, and commits the records.

### What Matthew sees

One GitHub issue per batch, labeled `instagram-batch`, a few days to two weeks before the posts go out: each post's slot, hook, age, destination, critic scores, cover and second slide for carousels, and the full slides or script with the caption. To stop a post, tick its **Hold** box; the publisher reads the issue on every run and skips it (untick to release it). A held slot is not refilled. Batch issues close themselves once their posts have gone out.

### What the drafter will not do

- Use a fact that is not on a research card, or a study used in the last 150 days.
- Post field-notes or watch-for-this without a drawn scene that has not been used. Only the spoon scene exists and it is used, so until a new scene is drawn into `templates/carousel/_scenes.js`, carousels are one-study, is-this-normal and what-we-got-wrong, and reels are study-in-30.
- Link to Milestone Navigator, a class page, or anything not in the destination list.
- Run without a Claude credential: the draft workflow fails with a clear message instead.

### Setup, once

The drafter needs one secret, a Claude credential for the workflow. On the Mac:

```bash
claude setup-token
```

Then save the printed token as the repository secret (the prompt hides what is pasted):

```bash
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo growingmindsscience/growingmindsscience
```

An `ANTHROPIC_API_KEY` secret works instead. Everything else (Instagram, Supabase, ElevenLabs) is already set.

### Running it by hand

```bash
node marketing/instagram/scripts/draft.mjs --plan-only
```

prints the plan for the empty slots without writing anything. `--force` drafts every empty slot in the horizon now, `--limit N` caps a run, `--summary <file>` writes the batch issue text. The workflow can also be started from the Actions tab with the same options.

