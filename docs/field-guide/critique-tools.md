# Design critique: four interactive tools

S4, the interactive tools batch, part one. Communication Snapshot, the activity library, the reading prompt cards and the Milestone Navigator rebuilt on the annotated-observation system: the hub head and chrome, the guides' title block (`guide.css`), and `toolapp.css` in place of each page's inline style block. The Snapshot got the full critique; the others got the inspector, G6 and a screenshot pass of their result states. The two standalone apps ("It's hard right now" and Growing Minds AI) follow in their own PR. playwright-cli at 1440 and 390.

## What the pages are now

- **Title block:** the guides' layout. The tool's name, its lede and one meta line (Tools, then the old eyebrow), its two jump actions, and "what this is" on sage mist beside it. Each panel's old tag label now sits under its heading.
- **Working surface:** the wizard or deck on soft white, with calm corners.
  - Choices are calm outlined buttons, forest when chosen (the guides' decoder).
  - Fields use the contact form's inputs.
  - The scripts' own `btn` buttons are restyled in the system's two button shapes; the scripts are unchanged.
- **Results:**
  - The level is stated in words. "Watch" and "typical" sit on sage mist. "Discuss" and "talk soon" are in clay text with a clay outline, replacing the amber fill.
  - The invitation sits behind a clay mark.
  - Flags and guidance are rows under quiet rules. "What you shared" and the call script sit on sage mist.
- **Library and deck:** cards on soft white, small labels on sage mist, prompts in Newsreader italic, explainers as question rows.
- **Print sheets:** the visit notes, the pocket list and the card deck keep their print rules exactly (checked line by line).

**Checked:**
- **Text and code:** every word, every hook (id, for, name, role, aria, data) and every inline app script is unchanged (checked by script).
- **End to end:**
  - The Snapshot runs from age to its report: "Talk soon", 3 flags, 4 guidance rows.
  - The Navigator runs from a domain to its result: "Worth a conversation".
  - The library and the deck filter (5 activities; 10 cards).
- **Errors:** the only console errors are the Vercel analytics script, which does not exist on a local server.
- **Safety keel:** the graders pass.

## Round 1

```
ROUND 1
Seen in one second: the tool's name beside its sage "what this is" panel; below, the working surface on soft white.
Idea (one sentence): the tools are field instruments: a calm surface, honest choices, a result that says its level in words.
Live thing: the wizard answers in place; the result names its level and hands over the words to say.
Scores (communication-snapshot): design 7 · usability 8 · creativity 6 · content 8 → 7.3
Caps applied: no pictures (no stock allowed).
Top problems, from the screenshots:
1. Result section heads ("What you shared") at 19px read as body text. Fixed: Newsreader 22px with space above.
2. The closing note sat tight under the result's actions. Fixed: 20px above.
3. The discuss-level badge was an amber fill (off palette). Fixed: clay text, clay outline.
```

## Fails and warnings kept, with the defence

The standing defences carry over: quiet rules (`hairline`), field paper, the wordmark lockup, no pictures, `still-page`. New here:

- **`shadow` on `toolapp.css`:** the choice buttons' and the discuss badge's outlines are inset box-shadows, the quiet button's technique, not drop shadows.
- **`eyebrow` on the Snapshot ("Step 1 of 3 · Your child"):** a progress indicator rendered by the wizard, not a kicker. It tells the parent where they are.
- **`eyebrow` on the library ("The research angle"):** a subhead inside an opened activity card, which the inspector read against the next section's heading.

## Noticed, not changed

- **Unsupported line, `reading-prompt-cards`:** the note "The same book 400 times..." has no source. The claims research memo (PR 119) flags the same line on the shared-reading claim.
- **Stale smoke test:** `scripts/smoke-tools.mjs` stops at the tools hub. It still looks for the pre-rebuild `.tool-card` markup, so it no longer reaches these pages.
