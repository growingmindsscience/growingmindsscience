# Design critique: the two standalone apps

S4, the interactive tools batch, part two: "It's hard right now" and Growing Minds AI. Both carry their own app logic and markup, so both keep it: the change is the look. playwright-cli at 1440 and 390, light and dark.

## What the pages are now

**It's hard right now** (`rightnow.css`; the page loads `field-guide.css`, `fg-base.css` and `tools.css`, not `styles.css` or `refresh.css`):
- **Chrome:** none, on purpose. One bar holds the wordmark (with the new mark) and "All tools".
- **The question:** "What's happening?" in Newsreader, with the page name as its subline. The kicker that sat above the title is moved by CSS order; the router script is unchanged. The five situations are calm rows under quiet rules, each with its hint.
- **The answer:**
  - the state, then the title in Newsreader
  - the body at a reading measure
  - the three steps numbered under an ink rule (the script's dots become a counter)
  - "Try:" on sage mist
  - Save, Listen, Ask and Print as quiet buttons
  - "Read the full tool" as a disclosure row
- **Checked:** all five situations and the `#repair` deep link route. The script's focus move to each heading is kept, without a visible ring for that programmatic focus.

**Growing Minds AI:**
- **Stylesheet:** the page keeps its own inline stylesheet. Its tokens keep their names and take the field guide's values: paper, soft white, sage mist, forest ink and verdigris actions. Sage replaces amber as the accent on ink, and clay is used for small warning text.
- **Type and shape:** Newsreader over Inter, calm corners, no resting shadows. `field-guide.css` loads first for the chrome. The hub's header and footer replace the old copies.
- **Unchanged:** everything between the header and the footer (chat, topics, access panels, plans strip) and every script, byte for byte. The plans copy and prices are as they were.
- **Checked:**
  - Topic tabs switch.
  - The access-code panel opens; nothing was submitted.
  - A topic question starts a chat. On the local server the API is absent, so the page shows its own "didn't send an answer" message. Only localhost was called.

## Round 1

```
ROUND 1
Seen in one second: (right-now) the question and five calm rows; (AI) the question on the ink band, the topic chooser below.
Idea (one sentence): in the hard moment, nothing but the next step; when there is time, a calm question box with the science behind it.
Live thing: right-now answers in place with three numbered steps and the words to try; the AI page answers in a chat.
Scores (right-now): design 7 · usability 8.5 · creativity 6.5 · content 8 → 7.5
Top problems, from the screenshots and the gate:
1. The AI question box drew a double focus ring (the field guide's ring inside the box's own). Fixed.
2. Tap targets: the right-now wordmark link (32px) and the AI send button (40px). Fixed: 44px.
3. The AI page's label sat above its question as a kicker. Fixed: moved under it as a subline. Also: the "See plans & pricing" drop shadow removed; small UI text raised from 14px to 15px.
```

## Round 2 (confirming)

```
ROUND 2
G6: tap targets, axe, no-script and keyboard pass on both. One reduced-motion item remains, defended below.
```

## Fails and warnings kept, with the defence

- **`reduced motion` on `div.topic-sheet` (AI):** the mobile "Browse questions" sheet is a closed dialog. It is `inert`, hidden and translated off-screen until opened, so it is not a stuck entrance.
- **`shadow` (both):** the quiet buttons' inset outline, plus the AI question box's 1px focus-within ring (it is autofocused).
- **`headline-lines` on right-now:** the inspector reads each situation row's name and hint together as one heading.
- **AI `body-size` (14px):** the "How this works" text was raised to 15px. The inspector's count includes the one-line meta under the box.
- **Standing defences:** quiet rules, field paper, the wordmark lockup, no pictures.

## Noticed, not changed

- **Em dashes:** the right-now situations data (the router's JSON) has em dashes in its copy ("A meltdown is usually a young nervous system hitting a limit — ..."). They are content, outside a restyle.
- **AI page tokens:** they now match the field guide, but the page still carries its own inline stylesheet. Moving it to a file is a candidate for S8.
