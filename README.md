# Growing Minds Science — site

Static, Netlify-ready site for **Growing Minds Science**.

The site sells research-based, self-paced, asynchronous parent classes for
families of children ages 0–5. The homepage is structured as a sales-oriented
landing page; the milestone tracker remains a standalone static tool; the
first flagship class (Toddlerhood) has a dedicated detail page.

- Marketing homepage at `/` (`index.html`) — pure HTML/CSS/JS, no build step
- Flagship class page at `/classes/toddlerhood.html` (pretty URL: `/classes/toddlerhood`)
- Standalone milestone tracker at `/milestones.html` (pretty URL: `/milestones`)
- Brand: warm off-white, dark ink, teal CTAs, muted gold/brown accents
- Type: Instrument Serif (display) + Work Sans (body) via Google Fonts

## File tree

```
growing-minds-science/
├─ index.html                      # Sales homepage
├─ classes/
│  └─ toddlerhood.html              # Flagship class detail / sales page
├─ tools/
│  ├─ index.html                    # Tools for Parents hub
│  ├─ growing-minds-ai.html
│  ├─ limits-without-escalation.html
│  ├─ repair-after-the-hard-moment.html
│  ├─ whats-typical-by-stage.html
│  └─ whats-underneath-the-meltdown.html
├─ milestones.html                 # Standalone tracker; no framework bundle
├─ thank-you.html                  # Netlify Forms success page
├─ _redirects                      # Pretty URLs for /milestones, /classes/toddlerhood, /thank-you
├─ netlify.toml                    # Netlify config + redirects + headers
├─ robots.txt
├─ sitemap.xml
├─ README.md
└─ assets/
   ├─ css/styles.css
   ├─ js/main.js
   └─ img/
      ├─ logo.jpeg                 # Source logo (1080x1080)
      ├─ logo-original.jpeg
      ├─ logo-full.jpeg
      ├─ logo-512.jpeg             # OG / hero / large
      ├─ logo-192.jpeg             # Header / apple-touch-icon
      ├─ logo-128.png
      ├─ favicon.svg               # Tab icon
      ├─ mark.svg                  # Reusable monochrome SVG mark (currentColor)
      └─ site/                     # Editorial photography
         ├─ hero-parent-baby.jpg     # Hero image (parent + young child)
         ├─ baby-hands.jpg           # Birth to 12 months class thumbnail
         ├─ learning-blocks.jpg      # Toddler class thumbnail
         ├─ child-learning.jpg       # Preschool class thumbnail
         ├─ family-reading.jpg       # Family systems class thumbnail
         └─ notebook-coffee.jpg      # Trust section supporting image
```

## Site imagery

Six editorial photographs ship in `assets/img/site/` and each one is used once
on the homepage in the role described below:

| File                  | Role                                                          |
| --------------------- | ------------------------------------------------------------- |
| `hero-parent-baby.jpg`| Homepage hero (right column desktop / under hero on mobile)   |
| `baby-hands.jpg`      | Birth to 12 months class card thumbnail                       |
| `learning-blocks.jpg` | Toddler class card thumbnail                                  |
| `child-learning.jpg`  | Preschool class card thumbnail                                |
| `family-reading.jpg`  | Family systems class card thumbnail                           |
| `notebook-coffee.jpg` | "Why parents trust this" supporting image                     |

The About Matthew section is intentionally text-first so no stock image can be
mistaken for a portrait or visually block the biography. If a real portrait
becomes available, it can be added later with a clear caption.

## Deploy

Drop the folder into Netlify (drag-and-drop or `netlify deploy --prod --dir=.`).
Custom domain + HTTPPS handled by Netlify.

## Forms

The waitlist uses **Netlify Forms** — no backend needed:

- `waitlist` — homepage waitlist and Toddlerhood class detail page waitlist

Both forms post to `/thank-you.html` so visitors land on a real success page
instead of a 404. Enable email notifications in Netlify → Site → Forms →
`waitlist` → Form notifications, and send them to
`growingmindsscience@gmail.com`.

To switch to ConvertKit / Mailchimp / Buttondown, see comments in `index.html`
and `assets/js/main.js`.

## Class CTA / waitlist preselection

The class product cards on the homepage preselect the class-of-interest in the
waitlist signup form before scrolling to it. The class detail page also
includes a hidden `interest=Toddlerhood` field, and the homepage form
respects an `?interest=...` query string for cross-page preselection.

## Growing Minds AI

The Growing Minds AI page at `/tools/growing-minds-ai` includes a working chat
MVP backed by a Netlify Function:

- Function: `netlify/functions/growing-minds-ai.mjs`
- Browser endpoint: `/.netlify/functions/growing-minds-ai`
- Required Netlify environment variable: `OPENAI_API_KEY`
- Optional Netlify environment variable: `OPENAI_VECTOR_STORE_ID`
- Optional Netlify environment variable: `OPENAI_MODEL` (defaults to `gpt-5.5`)

Set environment variables in Netlify with the Functions scope enabled. The API
key must never be placed in browser JavaScript or committed to the repository.

When `OPENAI_VECTOR_STORE_ID` is present, the function enables OpenAI file
search so answers can be grounded in uploaded Growing Minds Science course
material, parent tools, and curated developmental science notes. Without a
vector store, the tutor still uses the system instructions but will not retrieve
from a private knowledge base.

## Milestone tracker

The tracker is intentionally a single static `milestones.html` file with inline
CSS, inline JavaScript, and embedded milestone data. It does not use React,
Vite, hashed bundles, or a `milestones/assets/` folder. This avoids Netlify
manual-deploy edge cases where subdirectory app assets can be served as HTML
(which previously caused infinite reload loops).

## Accessibility notes

- Skip link, semantic landmarks, single `<h1>` per page.
- All interactive controls have `aria-label` or visible label.
- Color contrast meets WCAG AA in both light and dark themes.
- Honors `prefers-reduced-motion`.
- Theme toggle persists via `localStorage` and respects system preference on first visit.
- Mobile nav is fully hidden (visibility, opacity, transform offscreen) until the
  toggle is opened, and is closed automatically on link click and on Escape.
