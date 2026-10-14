# Design critique: the homepage and the Lens page

The taste skill's method: the browser inspector measures the house rules at 1440, 768 and 390 pixels; the critique is made on its screenshots, never on the code. Three rounds were run on the homepage. Screenshots are in `.taste-skill/inspect/` and `.taste-skill/inspect-lens/` (gitignored working files; regenerate with `inspect.mjs`).

## Round 1 (first render)

Inspector: 9 fails, 8 warnings. Causes: the sticky full-height footer put its wordmark under the page (covered text, a 12-screen pin) and made the page scroll sideways; `max-width: 12ch` on two headlines forced a third line; a page-wide `.fg a { color: inherit }` beat the button class and put ink text on forest buttons; the skip link inherited the same; three pictures against a floor of four; 17 font sizes.

Fixes: the footer became a static ink field under the close; headline measures were removed and the display step was lowered to fit the two-line budget on the 42% axis (75px at 1440, 32px at 390); link colour inheritance was moved off the `.fg` scope; the price cell lost its small text; sizes were mapped onto the five steps plus one statement size; a fourth photograph was placed in the explorer's margin zone.

## Round 2

Inspector: 3 fails. The explorer button overflowed beside the axis heading (now wraps under it, right-aligned); "Three things worth understanding" wrapped to three lines in a half-width tile at 768 (the mosaic now stacks below 1000px); the `<small>` under the price read as an eyebrow (removed; the row is "Price, once"). Seen in the screenshots and fixed at the same time: the notes list preceded the title on phones (order swapped), the plate's labels were unreadable on phones (labels and leaders hidden, the scene cropped closer, the notes carry the words), the mosaic photograph cropped to a wall (object position moved), the biography statement ran seven lines at 36px (set at the lead step).

## Round 3 (final)

Inspector, homepage: 0 fails, 4 warnings. Inspector, Lens page: 1 fail (pictures), 2 warnings.

```
ROUND 3
Seen in one second: a parent reaching for a spoon a baby has just dropped, drawn as a plate.
Idea (one sentence): an ordinary moment becomes a field-guide plate, annotated in the margin, and the whole page is laid out as a printed annual with its title on the 42% axis.
Live thing: the four annotations beside the masthead plate are controls that each reveal a sentence; the Lens steps through a second plate whose callouts can be manipulated; the age cursor selects the stage in the explorer.
Layout words by section: masthead=plate band + axis title / lens=band / explore=tabs + banded agenda / three things=mosaic / cannot wait=field statement / classes=table / tools=statement + table right / trust=drop cap / close=inverted / footer=columns + wordmark
Scores: design 8 · usability 8 · creativity 8 · content 7 → overall 7.9
Caps applied: none (four pictures on the homepage; headlines two lines everywhere; no eyebrow, numbering, gradient or resting shadow in any screenshot).
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. The photographs are the site's old stock placeholders (desktop-page-01: the explorer and Lens band pictures; desktop-page-02: the mosaic tile). Fix: shoot or generate the five pictures in docs/field-guide/asset-brief.md.
2. The Lens page's first screen leaves the margin zone to one small photograph and the Sources page leaves it empty (inspect-lens/desktop-page-01). Two rests on one short page is one too many. Fix: when the playground photograph exists, give it the whole margin column of the title block; or run the Sources list from the left margin.
3. On desktop the explorer's heading row (photo, two-line heading, button under it) is the busiest moment on the page (desktop-page-01, bottom right). Fix: once the real photograph is in, try the button on the heading's baseline again at a 48px heading size.
```

## Warnings kept, with the defence

- `palette-cream`: the paper (#F7F5EF) is the brief's own proposed ground, and the palette carries no terracotta or rust fill; the warning targets the cream-and-terracotta pairing.
- `size-count` (10): five steps plus one statement size (22–36px, for paragraphs set large, never a heading), the close headline at 9.4vw, and two sizes that belong to the shared header in `chrome.css`.
- `card-rows` (3): the explorer's stage tabs, the Lens's step tabs and the mosaic are real tablists and a dealt blueprint, not feature cards.
- `no-footage`: no honest clip of the subject exists; the asset brief names the one slot that can take a muted loop.
- Lens page `few-pictures` (1 of 4): the page is an explanatory plate with its sources; filling it with unrelated photographs would be decoration. One photograph of the moment is reserved in the asset brief.

## What a juror would still mark down

The scientific copy is a prototype and says so on the page; the pictures are placeholders; the inner pages still wear the previous system, so a visitor who leaves the homepage meets a different header until Phase 3. None of these is a design-system problem; all three are listed in the preservation plan and the asset brief.
