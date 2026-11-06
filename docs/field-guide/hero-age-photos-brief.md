# Asset brief: the five hero figures, one per age

Written 2026-11-05. Replaces entry 1 ("Explorer photograph") of `asset-brief.md`.

## Why new photographs

The homepage hero now asks one question, "How old is your child?", with five answers: Under 1, 1, 2, 3, 4. The photograph beside it should answer the same question: each age gets one ordinary moment, and a thin drawn figure over the photo shows the one thing that moment teaches. Hovering or focusing an age in the hero swaps the plate to that age's figure.

The current hero photograph cannot carry a figure. The child and parent look at something outside the frame, so the third point of the moment (what they are looking at) is missing. Drawn lines along their real point and gaze either run off the photo through the headline or stop as short stubs on a pale wall. Every photograph in this set must therefore contain all of its figure's points inside the frame.

## How the figures are drawn

Over each photograph, in code (not baked into the image), we draw:
- **Solid line:** an action (a point, a pour, a reach).
- **Dotted line:** a gaze.
- **One amber marker:** where the figure lands.
- **One short tag:** the idea and the age, for example "Joint attention, about 12 months."

The lines are 2px wide: paper white over darker areas, ink green over light ones. So the stretch of the picture the lines cross must be **one even tone**, not bright window glare beside dark furniture. That is the single most important composition rule in this brief.

## The set, as one series

The series rules in `asset-brief.md` all apply (one photographer, soft window light from one side, lived-in rooms, muted warm-neutral grade, no posing, nobody looks at the camera, no text or logos, describable in one plain sentence). In addition:
- **One home.** All five moments happen in the same house: the same living room, hallway and kitchen, the same wood floors and sage-green sofa as the current hero. Different families are welcome (and better: five children of different backgrounds), but one house and one light make it read as one series.
- **Square master, 2400 x 2400 px, JPEG quality about 85.** The plate is cropped to about 0.85:1 on laptops and 4:3 on phones. **Every point of the figure (eyes, hands, the object) must sit inside the central 80% of the width and the middle 60% of the height.** Leave calm space around that box rather than filling it.
- **Faces in three-quarter profile,** large enough that the direction of a gaze is unmistakable at 600px wide.
- **Save as** `assets/img/site/hero-age-0.jpg` through `hero-age-4.jpg`. Only the master is needed; the 640 and 1000 wide WebP copies are made in the repo.

## 0. Under 1: serve and return

File: `assets/img/site/hero-age-0.jpg`

**Teaches:** "Serve and return, not flashcards, builds the architecture" (the Birth to 1 Explore page).
**Subject:** a parent lies on the rug on their side, face about 30 cm from a baby of about 6 months, who lies on their back or tummy facing them. The baby's mouth is open mid-coo, eyes on the parent. The parent answers: eyebrows raised, mouth open in a soft "oh", turned fully toward the baby. Both faces in profile, facing each other, at the same height.
**Composition:** low camera, close to the floor, so the two faces sit level across the middle of the frame with a clear gap of rug or sofa between them. That gap is where the figure goes, so keep it one calm tone.
**Figure:** two curved arrows between the faces, one baby to parent ("serve"), one parent to baby ("return"). Tag: "Serve and return, from the first months."
**Alt:** A parent lies on the rug face to face with a baby, answering the baby's coo.
**Avoid:** a parent looking at the camera, a phone, toys between the faces, a baby crying.

## 1. One: joint attention (the default hero)

File: `assets/img/site/hero-age-1.jpg`

**Teaches:** "Looking at something together is how words get attached to things" (the 1 to 2 Explore page). This is the one shown before any age is chosen, and the only one phones see.
**Subject:** the current hero's moment made whole. A toddler of about 13 months sits in the lap of a parent on the living-room rug. A cat is curled on the sage-green armchair across the room, in the left third of the frame. The child points at the cat with one arm fully out. The parent's head is turned toward the cat too, following the point, not looking at the child.
**Composition:** both faces and the pointing hand in the right half, the cat in the left half, all three at roughly the same height, so the figure is a flat triangle across the middle of the frame. The wall and armchair behind the sightlines should be one mid tone; the window may be in frame but not behind the lines. Using the current `hero-parent-baby.jpg` parent and child as a reference keeps continuity with today's site.
**Figure:** a solid line along the child's point and a dotted line along the parent's gaze, both landing on the cat. Tag: "Joint attention, about 12 months."
**Alt:** A toddler on a parent's lap points at a cat on the armchair, and the parent looks at the cat too.
**Avoid:** the cat looking at the camera, the parent looking at the child, a bright window behind the cat.

## 2. Two: a real choice

File: `assets/img/site/hero-age-2.jpg`

**Teaches:** "'No' is a milestone, not defiance," and the site's own advice to give "real choices within a bounded range" (the toddler "no" article, which uses shoes as its example).
**Subject:** in the hallway by the front door, a child of about 2 and a half stands, chin slightly tucked, the posture of someone who was just about to say no. The parent crouches to the child's eye level and holds out two different pairs of shoes, one in each hand, wide apart (for example, rain boots and sneakers). The child is looking at one of them and reaching toward it, the start of deciding.
**Composition:** side-on, child on one side and parent on the other, the two pairs of shoes clearly separated in the middle of the frame against a plain wall.
**Figure:** a small ring around each pair of shoes and a dotted line from the child's eyes to the pair they are choosing. Tag: "A real choice, about 2."
**Alt:** A parent crouches in the hallway holding out two pairs of shoes, and the toddler reaches for one.
**Avoid:** tears, a tantrum, a parent standing over the child, shoes held close together.

## 3. Three: pretend play

File: `assets/img/site/hero-age-3.jpg`

**Teaches:** "Pretend play is serious cognitive work: two realities at once" (the 3 to 4 Explore page).
**Subject:** at a low table or on the rug, a child of about 3 and a half pours "tea" from an empty toy teapot into a cup the parent holds out. There is no tea. The parent plays along, cup steady, watching the spout with mock seriousness. The child's face is concentrated and proud.
**Composition:** the teapot spout and the cup about a hand's width apart in the middle of the frame, with an empty gap between them against a calm background. That gap is where the drawn tea goes.
**Figure:** a dashed arc from the spout into the cup, drawing the tea that is not there. Tag: "Pretend play, about 3: two realities at once."
**Alt:** A child pours pretend tea from an empty teapot into a cup the parent holds out.
**Avoid:** real liquid, a costume, a messy tea party with many props, the parent laughing at the camera.

## 4. Four: waiting a turn

File: `assets/img/site/hero-age-4.jpg`

**Teaches:** "Working memory, flexible thinking and impulse control are under construction" and preschoolers "can wait briefly for things they want ... with adult support" (the self-regulation article). Deliberately not a marshmallow or a treat on a plate: the article explains why the marshmallow studies are a poor guide, and the figure should not suggest a test.
**Subject:** at the kitchen table, a child of about 4 and a parent play a simple board game. It is the parent's turn: the parent's hand is on the die or spinner. The child's hand hovers just above the game piece, held back, fingers curled, eyes on the parent's hand. Visible effort, not distress.
**Composition:** from the side at table height, the parent's hand and the child's hovering hand both in the middle of the frame with a clear gap of tabletop between the child's fingers and the piece.
**Figure:** a short bracket marking the gap between the child's fingers and the piece (the held-back reach), and a dotted line from the child's eyes to the parent's hand. Tag: "Waiting a turn, about 4."
**Alt:** At the kitchen table, a child holds a hand back above a game piece while the parent takes a turn.
**Avoid:** food or sweets, a timer, a screen, a winning or losing face.

## What happens after delivery

1. Matthew saves the five masters at the paths above.
2. In the repo: make the WebP copies, measure each figure's points on the master (eyes, hands, objects), and draw the figures in code so they stay sharp and accessible at every crop.
3. The hero plate swaps figure on hover or focus of an age. On a touch screen the first tap on an age previews its figure (added 2026-11-06). Reduced motion gets an instant swap with no line drawing.
4. The current `hero-parent-baby` files stay until figure 1 ships, then retire.

Good to have, not required: generate figure 1 first. It is the default hero, so shipping it alone already fixes the graphic on every device, and the other four can follow.
