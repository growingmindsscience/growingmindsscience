---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["classes/index.html","about/index.html","pricing.html"]
---

# Surface brief: homepage (index.html)

Scope: the marketing homepage, Persuade mode. The visitor is a parent of a child 0 to 5 who wants to understand their child well enough to act with confidence. The action is enrolment (Browse the classes, Enroll); the proof is the free lesson, the curriculum in developmental order, the founder's record, and the free tools. Constraints: real prices and class facts only (see DESIGN.md "Class facts"), no deficit framing, no stock-baby imagery, no orange as a main colour, calm and inviting, collegiate and respectable (user steer, 2026-10-13).

## Direction contract

THESIS: Development is terrain, not a line. The homepage is one survey sheet of the first five years: the wide normal range drawn as valleys and ridges, and every class a waymarked route through its stretch. It refuses the category's warm-photo-plus-three-cards hero and the incumbent's ink-band textbook; the science is the landscape the parent learns to read.

OWN-WORLD: map-white sheet (#F3F5F0) as ground, navy ink (#1B2A3A) for all type, slate contour lines (#8FA3B5) as the sheet's material, sage woodland (#C9D8CC) and pale water (#BFD7E6) as fields, one teal route (#1E5F62) for the action and the active waymark; one inverted navy field for the enrol band and footer. Geologica (display, legend, numerals, tabular) over Literata (body). Square corners everywhere; 3px ink rules only as legend bars; no drop shadows at rest; photographs as square map insets with a 2px ink frame. Recognisable with the content removed: contours, one dashed teal route with round waymarks, a legend strip with colour bars.

STORY: In three seconds the parent sees a calm map of the first five years with a route through it and knows this is a science education for parents. Dragging the age cursor shows what is growing at their child's age and which class teaches it. Scrolling, they meet the open classes as legend rows, the founder's thesis and the three lenses, how a lesson is taught, office hours (Growing Minds AI), free reading, and the enrol band on the dark field. They browse the classes, watch the free lesson, or enrol.

FIRST VIEWPORT: 1440x900. Header 72px: wordmark, Classes, Free tools, Articles, About, My classes, one navy "Enroll, from $49". Below, the full-bleed sheet: age grid references along the top edge (Birth, 1 yr, 2, 3, 4, 5 yrs); slate contours sweeping the whole viewport with two sage woodland patches and one pale stream; a dashed teal route from lower-left to upper-right with five round waymarks labelled First words, Autonomy, Pretend play, Self-control; headline "The first five years, mapped." upper-left in Geologica at about 92px on two lines; lede in Literata 22px at 470px; square navy "Browse the classes" and an underlined "Watch a lesson free, 14 min" beneath; a readout beside the active waymark giving the age and what is growing now. Along the foot, the legend strip under a 3px ink rule: four class cells with a 6px colour bar (teal on the active), name, "Class N · lessons · price". Phone: header, headline at 40px, lede, full-width buttons, then the sheet at 100vw by 60vh with the route and a range cursor, then the legend as a stacked list.

FORM: The Terrain (a survey map of the first five years), candidate 6 on the re-roll-2 grounded list, assigned by the roll and locked by the user on the decision page; seed key eb5a7bec, re-roll round 2, steered "calm and inviting, collegiate and respectable, no orange as the main colour". Signature interaction: the age cursor on the route (pointer drag and a keyboard range input) updates the readout and the active legend cell; the route draws in once on load. Build path: code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved
- Inner pages inherit the world through styles.css, seminar.css and chrome.css tokens; class pages get a route-segment inset; the nsc app (separate deploy) is out of scope for this round and must be restyled to match later.
