# Design critique: the Claims Library

S4 batch (c). The Evidence-Graded Claims Library's template in `scripts/build-claims.mjs` moves onto the annotated-observation system: the hub head, chrome and type, and `claims.css` in place of the inline style block. The generator stays the source of truth; `build-claims.mjs --check` and `stamp-assets.mjs --check` both pass. `sleep-training-attachment` is the model page; the hub, `teething-fever` and `pacifiers-speech` got the inspector and G6 too. playwright-cli at 1440 and 390, light and dark.

## What the pages are now

- A claim page: the claim in Newsreader, one meta line (Claims, "Evidence-graded claim", the domain, the review date), and its grade and verdict on sage mist beside it. The strength label is colored by grade (forest when the evidence holds, clay when it contradicts the claim, muted when it is thin); the words carry the grade, the color repeats it.
- One reading column: the summary at 64ch, sources in the research-blue module, the related pages as quiet buttons, the method on sage mist, the note.
- The hub: the title block, then the ten claims as rows under quiet rules (the claim, its strength and domain, the verdict, "Read the grade"), then the method.
- Every word is carried over; a script compares each page's words against the previous build. The eyebrows move into the meta line (the hub's "Free · Evidence-graded · 10 claims and growing" sits under the lede). The related links now use the pages' own titles ("What's typical, by stage") instead of names built from the URL ("Whats Typical By Stage").
- No scientific sentence, grade or source changed. A separate branch (`fg/claims-research`) is checking the sources for Matthew's review.

## Round 1

```
ROUND 1
Seen in one second: the claim in quotes beside its verdict on sage mist.
Idea (one sentence): a graded label for each claim: what parents hear, then what the research says, then the sources.
Live thing: the grade is the first thing beside the claim; the hub reads as a ledger of verdicts.
Scores (sleep-training-attachment): design 7 · usability 8 · creativity 6 · content 8 → 7.3
Caps applied: no pictures (no stock allowed).
Top problems: the related links' names were built from URLs ("Whats Typical By Stage"). Fixed with a title map.
```

## Fails and warnings kept, with the defense

The standing defences in the earlier critiques carry over: quiet rules (`hairline`), field paper (`palette-cream`), the wordmark lockup (`micro-label`), the size count, no footage, no pictures (`few-pictures`, `focal-point`), `still-page` (the title rises; a reference page stays still). New here:

- `headline-lines` at 390: "Sleep training will damage my baby's attachment to me" wraps to three lines at 32px. The claim is quoted as parents say it; it stays whole.
- `mixed-font-headline`: the quotation marks around the claim, not a switched word.
- G8 measures the homepage, Lens and classes hub on the local server, unchanged by this batch. The claims pages load fewer stylesheets than before and no images.
