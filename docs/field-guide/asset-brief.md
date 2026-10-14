# Asset brief: photographs for the Field Guide homepage and Lens

The redesign ships with the site's existing photographs standing in. Matthew replaces stock imagery with custom assets from a brief, so this is that brief, written as five generation prompts. Save each file at the path given, keep the current filename so no markup changes, and run `node scripts/stamp-assets.mjs` afterwards only if CSS or JS changed (images are not stamped).

## The set, as one series

All five pictures must read as one photographer's work on one afternoon:
- Natural window light, soft and from one side; no flash, no studio backdrop, no golden-hour glow.
- Ordinary rooms and places with the clutter left in: a kitchen table with crumbs, a worn rug, a playground with a scuffed slide. Never a styled or pristine home.
- Colour grade: neutral and slightly warm, muted saturation, nothing teal-and-orange. The palette of the page is paper, deep green-black ink, forest green and sage, so greens, creams, wood and skin tones sit well; avoid bright primaries and anything neon.
- Film-like softness is fine; heavy grain, vignettes, bokeh balls, lens flare and HDR are not.
- Real-looking families of different backgrounds, without posing for the camera; nobody looks into the lens except Matthew. No logos, no screens showing content, no text in frame.
- Each picture must be describable in one plain sentence, because that sentence becomes its alt text.
- Square corners, no borders, no filters, JPEG quality about 85.

## 1. Explorer photograph: joint attention

File: `assets/img/site/hero-parent-baby.jpg` (and a 640-wide copy as `hero-parent-baby-640.jpg`).
Size: 1200 × 1800 px, portrait 2:3. It is shown as a 4:5 crop on desktop and a 3:2 crop on phones, so keep the subject in the central 60% of the frame both ways.

Subject: a parent and a child of about 18 months on a sofa or the floor by a window, both looking at the same thing just outside the frame to the left: a book, a toy, something on the sill. The child is pointing or reaching; the parent's face is turned toward what the child sees, not toward the child. Neither looks at the camera. We see both faces in three-quarter profile.
Composition: shot from slightly below the adult's eye level, a metre or two away, 50mm feel. Calm, plain wall or window behind them so the left and top of the frame are quiet.
Mood: shared attention, unhurried. The picture is about two people looking at one thing.
Avoid: a hug pose, a kiss on the head, both smiling at the camera, a tidy nursery.

## 2. Lens photograph: the moment before leaving the playground

File: `assets/img/site/child-learning.jpg` (and a 640-wide copy as `child-learning-640.jpg`).
Size: 1200 × 1500 px, portrait 4:5. Shown small on desktop (about 230 px wide) and at 60% width on phones, so the figures must be large in frame.

Subject: a toddler of two to three at the bottom of a small playground slide or near a low gate, body turned back toward the slide, one hand on it. An adult crouches a step or two behind, hand held out low, not grabbing. It is the moment before the hard part: no tears, no tantrum, no stiff body. The child's face can be turned away from the camera.
Composition: eye level with the child, the slide's sage-green or faded colour filling part of the background, open ground at the bottom of the frame. Overcast or shaded daylight so there are no hard shadows.
Mood: the ordinary end of an ordinary visit. Quiet tension at most.
Avoid: a crying child, a parent pulling an arm, a bright plastic multicolour play structure, other families crowding the background, any branding on clothes.

## 3. Mosaic photograph: hands at work

File: `assets/img/site/toddler-blocks.jpg`.
Size: 2400 × 1200 px, landscape 2:1. Shown as a wide tile on desktop and a 4:3 crop on phones, so keep the hands in the middle third horizontally and the middle half vertically.

Subject: a child's two hands, aged roughly two to four, fitting wooden blocks or a lid onto a jar or pouring from a small jug into a cup, on a wooden table. The face is cropped out or only the chin and the edge of a cheek show. The hands are mid-task, slightly imprecise, fully absorbed.
Composition: top-down or a low three-quarter angle, close, the table surface filling the frame, a bit of the child's sleeve. Light from a window at the left.
Mood: concentration. This is the picture for "what is being built."
Avoid: a product shot of toys, alphabet blocks with letters facing the camera, a clean white table, adult hands helping.

## 4. Tools photograph: the parent's evening table

File: `assets/img/site/notebook-coffee.jpg` (and a 720-wide copy as `notebook-coffee-720.jpg`).
Size: 1500 × 1875 px, portrait 4:5.

Subject: a kitchen table after bedtime with no people in it: an open paper notebook with a few handwritten lines and a question mark (illegible, not readable text), a pen, a mug half full, a child's crayon drawing pushed to one corner, maybe a baby monitor or a dummy at the edge. One lamp or the last daylight.
Composition: slightly above table level, the notebook as the main object in the lower two-thirds, the top third quieter. Shallow but not extreme depth of field.
Mood: tired, thoughtful, private. The picture stands beside the list of free tools, so it should feel like the moment a parent reaches for one.
Avoid: a latte with art, a laptop, a phone screen lit, a staged "flat lay" with everything parallel.

## 5. Founder portrait

File: `assets/img/matthew-photo-600.jpg` (and a 400-wide copy as `matthew-photo-400.jpg`).
Size: 1200 × 1500 px, portrait 4:5; it is cropped square at the top for the drop-cap slot, so leave headroom above and keep the face in the upper half.

Subject: Matthew, indoors by a window, seated or leaning in, looking at the camera or just past it with an easy, direct expression. Plain shirt, no lanyard or branding. A hint of a real room behind (bookshelf, kitchen), not a backdrop.
Composition: head and shoulders, 85mm feel, the eyes on the upper third line, window light from one side so one cheek is a little darker.
Mood: the person who will answer; warm, credible, not corporate.
Avoid: a studio grey backdrop, a white-coat clinic look, a laughing stock-style headshot, heavy retouching.

## Optional later

A 3:2 photograph (1800 × 1200) of a baby in a high chair mid-drop, spoon in the air, parent's hand reaching, to sit beside the masthead plate on the homepage. Not needed for launch.

Footage: none is used. If a few seconds of a child absorbed in play exists (no sound, no faces to camera), it can replace picture 3 as a muted loop with a poster frame; the build already supports a moving picture there.
