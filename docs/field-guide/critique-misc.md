# Design critique: FAQ, contact, 404, thank-you, the arcade

S4 batch (d). The five small pages rebuilt on the annotated-observation system with `pages.css`, on `fg-base.css` and the title block, rows, questions and close band in `hubs.css`. `styles.css`, `refresh.css`, `arcade-page.css`, `decor.js` and `animate.js` no longer load on them; the arcade keeps `arcade.css` for its game overlays. The contact page got the full critique; the others got the inspector, G6 and a screenshot pass. playwright-cli at 1440 and 390.

## What the pages are now

- **FAQ:** the title block, the eleven questions as hub question rows (questions in Newsreader), and the close band with its two actions.
- **Contact:** the title block. "A real reply, not an auto-response" and what to write about, as rows, sit beside the form on sage mist. The crisis note is set as guidance, not fine print.
- **404 and thank-you:** the title block with its actions. The places to go are rows: the name in Newsreader, then its line.
- **Arcade:** the title block with "Choose a game"; then the ten games as cards, each with its small screen on the inverted field and glyphs in sage, and a quiet play button.
- **Words:** the build script checks every word and every hook (href, data-*, id, for, name, action) against the originals. Dropped are the kickers "Waitlist received", "A little room to play", "Ten games" and the cards' "01 / 10" counters. The 404's "Error 404: page not found" stays, as a fine line under the lede.
- **Function:** four games opened by their buttons (Synapse Snake, Pong, Serve & Return, Tidy Up) and rendered. The empty contact form shows both errors, marks the fields invalid and moves focus to the email field (checked with sends blocked).

## Round 1

```
ROUND 1
Seen in one second: the page's statement in Newsreader; on contact, the form on sage mist beside it.
Idea (one sentence): the quiet pages read like the rest of the field guide: one statement, then the useful thing.
Live thing: the arcade's small screens; on contact, errors that answer in place.
Scores (contact): design 7 · usability 8 · creativity 6 · content 7.5 → 7.1
Caps applied: no pictures (no stock allowed).
Top problems:
1. 404 and thank-you descriptions opened lowercase once split from their names. Fixed: capitalized in CSS, words unchanged.
2. The FAQ row link was 38px wide at 390. Fixed: 44px minimum.
3. The contact crisis note was 14px fine print. Fixed: 16px, ink-soft.
Also: the arcade's decorative counters removed and its glyphs moved off monospace.
```

## Round 2 (confirming)

```
ROUND 2
Scores (contact): design 7 · usability 8.5 · creativity 6 · content 7.5 → 7.3
G6 passes on all five pages.
```

## Fails and warnings kept, with the defense

The standing defences carry over: quiet rules (`hairline`), field paper, the wordmark lockup, no pictures, `still-page`. New here:

- **Arcade `headline-lines` and `emoji`:** the inspector reads each card's pictogram (`▦ ▦ ▦ ● ━━━━`, `✉`, `♪`) as a headline and as emoji. They are `aria-hidden` text symbols drawing each game's screen, not headings or emoji.
- **FAQ `eyebrow` @768:** the inspector took "class details page", the inline link that ends the last answer, for a kicker above the close heading.

## Copy noticed, not changed (needs Matthew)

- **FAQ, "Which classes are available?":** prices are given for the infant and toddler classes only. Hosting says the toddler class is on Thinkific; confirm both are current.
- **Thank-you page:** still says "when classes open"; classes are open.
- **In-game text** (Synapse Snake) has em dashes. The game copy lives in the game scripts, outside this batch.
