# Developmental Lens plan

## What the component is

A reusable block that reads one ordinary moment in four steps. Markup source is `docs/field-guide/fragments/lens.html`; behavior is `assets/js/lens.js`; styles are `assets/css/lens.css`.

| Part | Implementation |
| --- | --- |
| Root | `<div class="lens" data-lens>` with a unique `id`; the script adds `data-lens-ready`, the `is-enhanced` class and `data-active-step` |
| Panels | Four `<section>` elements with `data-lens-step` (observe, understand, respond, reflect) and `data-lens-label` |
| Tabs | Built by the script: a `role="tablist"` of buttons with roving tabindex; arrow, Home and End keys |
| Plate | An inline SVG, 1200 by 680, with ink silhouettes, sage fills, `title` and `desc` |
| Callouts | `.lens__callout` groups tagged with the steps they belong to; in Understand they carry `data-callout` 1 to 5 and pair with `data-mechanism` readings |
| Connections row | Read, Try and Learn link lists below the component |
| Status line | A visually hidden live region (`data-lens-status`) announcing the step and its heading |

Back and Next buttons end each panel. A URL hash matching a panel id opens that step.

## How it embeds

The same fragment sits in two places: the homepage band (`#lens`) and the standalone page `lens/leaving-the-playground.html`, served at `/lens/leaving-the-playground` by a rewrite in `vercel.json` and listed in `sitemap.xml`. The page adds a title block on the axis, a Sources section with the reference list, and a link back to the explorer. Both load the same two Lens files.

## Learning sequence and the plate

| Step | Question | What the plate shows |
| --- | --- | --- |
| Observe | What are we actually seeing? | Five plain labels for what can be seen, with no interpretation. |
| Understand | What might be developing beneath the surface? | Four mechanism callouts (switching rules, the brakes arrive last, autonomy, once overwhelmed) plus the parent in clay. Selecting a callout or a reading highlights its pair. |
| Respond | What can this understanding change? | The parent is marked; five options appear in the panel. |
| Reflect | What might you notice next time? | The scene alone, washed back, without labels. Four prompts for observation, not scoring. |

## Accessibility and no-JavaScript behavior

- Without JavaScript the four panels stack and read in order, and the plate shows the Understand callouts.
- The plate has a text alternative: a visually hidden list stating each step's labels and where they point.
- Tabs follow the tablist pattern with `aria-selected`, `aria-controls` and roving tabindex. Panels are focusable. Each reading's button uses `aria-pressed`.
- Focus outlines are forest and controls are at least 3rem tall.
- All motion is gated by `prefers-reduced-motion: no-preference` and `html.anim`; the reduced state is the finished state.

## Scientific-integrity controls

- Copy comes from `copy-deck.md` only. No claim, number or citation is added in markup.
- Evidence notes use the deck's phrasings ("Well established", "Supported", "Conceptual model", each with its qualifying clause). They are editorial characterizations, not Claims Library grades. Each note carries `data-verify`, so the unreviewed set can be listed by selector.
- Prototype status is visible. The Lens page's Sources section says the science is drawn from class scripts and articles and must be checked against primary sources before it is publication-ready. The homepage band introduction carries a shorter form of the same statement.
- The plate caption describes a conceptual reading of processes, not what a particular child is thinking.
- A references list closes the Lens page: Zelazo and colleagues (2003), Diamond (2013), Kochanska and Aksan (1995), Erikson (1950), and the toddler class modules.

## Producing further Lenses

1. One Lens at a time. Each is a new fragment, a new plate and a new page route, reusing the component code unchanged.
2. Choose the moment first, then write the Observe scene so it contains only what a bystander could see.
3. Draft mechanisms from class scripts and articles already published on the site, adding no claim that is not already there.
4. Review every mechanism and evidence note against primary sources before the prototype line is removed. A named reviewer signs off; a Lens with open `data-verify` notes stays labelled as a prototype.
5. Draw each plate to the plate conventions, with a text alternative and a caption.
6. Never mass-generate: no templated batches, and no generated plates or copy published without review.
