# Slogan system and Tallykin rename: inventory

Taken 2026-10-24 on branch `brand/slogans-tallykin` (cut from `main` at 7898804), before any edit.

Scope searched: every deployed file type (`.html`, `.js`, `.mjs`, `.ts`, `.tsx`, `.json`, `.css`, `.svg`, `.xml`, `.txt`) in the site root, `/nsc`, `/lens`, `/explore`, `/claims`, `/api`. Excluded as non-public working folders (see `.vercelignore`): `docs/`, `marketing/`, `evals/`, `corpus/`, `tests/`, `knowledge/`, `course/`, `scripts/`, `keel/` internals, `library/`, `supabase/` migrations, tool folders.

Note: `/lab/a`, `/lab/b`, `/lab/c` are the archived homepage compositions from the October redesign. They are public but not linked from the site. They are listed here, and left as design records (see the final section).

## 0. Findings that change the brief

- **The About page is already rebranded on `main`.** Title, `og:title`, `og:description`, meta description, alt text, body copy, and the "Ask the research" tools entry all read From Little Onward / Ask the research. "How From Little Onward teaches" is already the section label. The Growing Minds Science version you saw was likely a cached page.
- **`/assets/img/og/site-home.jpg` was a stock photograph.** Replaced by `/assets/img/og/site-brand.png`, the From Little Onward lockup (`scripts/build-site-og-card.mjs`).
- **"A living field guide to the growing mind" footer text** appears only in `lab/a` and in `docs/field-guide/fragments/footer.html` (not deployed). Every live page footer already uses the access line.

## 1. `growing` (case-insensitive)

- Instagram link `instagram.com/growingmindsscience/` (out of scope, link target unchanged): 62 lines, one per page footer/nav.
- Domain and email (`growingmindsscience.com`, `growingmindsscience@gmail.com`, Vercel hosts): 352 lines. Domain is out of scope; not user-facing brand text.
- `api/_knowledge-data.js` (generated AI knowledge base, from class scripts and research notes): 1321 lines, all ordinary descriptive use except line 34389 (see Number Path section).
- File-header and code comments naming "Growing Minds Science" (not rendered): 51 lines.

### User-facing or code-facing occurrences

| File | Line | Text |
|---|---|---|
| `tools/index.html` | 9 | <meta name="description" content="A small but growing library of practical developmental tools for parents: milestone tracker, behavior guides, sleep references |
| `tools/index.html` | 20 | <meta property="og:description" content="A free, growing library of practical developmental tools for parents: milestone tracker, behavior guides, sleep referen |
| `tools/index.html` | 104 | <div class="row" id="growing-minds-ai" data-rise> |
| `tools/ask-the-research.html` | 1217 | const res = await fetch('/api/growing-minds-ai', { |
| `tools/ask-the-research.html` | 1541 | const res = await fetch('/api/growing-minds-ai', { |
| `tools/routines-transitions-night-waking.html` | 193 | <p>Fear at night is not manipulation. Imagination is growing, and toddlers may not easily separate dream, shadow, story, and real danger. Comfort them, keep the |
| `index.html` | 16 | <meta property="og:title" content="From Little Onward: see what’s growing" /> |
| `index.html` | 116 | <h1 class="hb-display hero__title" id="hero-title" data-rise style="--i:0">See what&rsquo;s growing.</h1> |
| `index.html` | 124 | <p class="hero__bottom" data-rise style="--i:4">An ordinary moment, newly seen. Press <b>Show what&rsquo;s growing</b> on the photograph.</p> |
| `index.html` | 133 | <button class="plate__toggle" type="button" aria-pressed="false" aria-controls="hero-labels" data-plate-toggle><span class="sw" aria-hidden="true"></span><span  |
| `index.html` | 257 | <h2 class="hb-display hb-display--l" id="explore-heading">Five periods, one growing mind.</h2> |
| `vercel.json` | 16 | { "source": "/tools/growing-minds-ai.html", "destination": "/tools/ask-the-research", "permanent": true }, |
| `vercel.json` | 17 | { "source": "/tools/growing-minds-ai", "destination": "/tools/ask-the-research", "permanent": true }, |
| `vercel.json` | 18 | { "source": "/tools/growing-minds-ai/", "destination": "/tools/ask-the-research", "permanent": true }, |
| `classes/index.html` | 105 | <figcaption id="tl-caption"><b>Fig. 1</b>Each class covers one window of the same growing mind. The family class applies at any age.</figcaption> |
| `classes/preschool.html` | 191 | <figcaption id="tl-caption"><b>Fig. 1</b>Where this class sits among the four. Each covers one window of the same growing mind.</figcaption> |
| `classes/family-systems.html` | 179 | <figcaption id="tl-caption"><b>Fig. 1</b>Where this class sits among the four. Each covers one window of the same growing mind.</figcaption> |
| `lab/index.html` | 36 | <a class="comp" href="b/"><span class="note note--ochre">Composition B</span><b>Annotated observation</b><span class="idea">Signature move 01 as the whole page. |
| `lab/index.html` | 45 | <li>&ldquo;See what&rsquo;s growing.&rdquo; leads the hero. &ldquo;The first five years, understood.&rdquo; leads the classes. &ldquo;Mental models, not scripts |
| `lab/a/index.html` | 217 | <h1 class="display display--xl hero__title" data-rise style="--i:0">See what&rsquo;s growing.</h1> |
| `lab/a/index.html` | 218 | <p class="hero__sub" data-rise style="--i:1">The living field guide to the growing mind.</p> |
| `lab/a/index.html` | 413 | <h2 class="display display--l" data-rise style="--i:0">Five periods, one growing mind.</h2> |
| `lab/c/index.html` | 207 | <h1 class="display hero__title" data-rise style="--i:0">See what&rsquo;s growing.</h1> |
| `lab/c/index.html` | 334 | <h2 class="display display--l">Five periods, one growing mind.</h2> |
| `lab/c/index.html` | 387 | <text x="0" y="114" fill="#5C716D" font-size="13">Each class is one window of the same growing mind.</text> |
| `lab/b/index.html` | 212 | <h1 class="display hero__title" data-rise style="--i:0">See what&rsquo;s growing.</h1> |
| `lab/b/index.html` | 220 | <p class="hero__bottom soft" data-rise style="--i:4">An ordinary moment, newly seen. Press <b>Show what&rsquo;s growing</b> on the photograph.</p> |
| `lab/b/index.html` | 231 | <button class="plate__toggle" type="button" aria-pressed="false" aria-controls="hero-labels" data-plate-toggle><span class="sw" aria-hidden="true"></span>Show w |
| `lab/b/index.html` | 321 | <h2 class="display display--l">Five periods, one growing mind.</h2> |
| `lab/b/index.html` | 443 | if (t && l) t.addEventListener('click', function () { var on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(on)); l.setAttri |
| `articles/milestone-worry.html` | 291 | <p>The healthiest stance is the one in the middle: informed enough to recognize a signal that matters, relaxed enough not to read a verdict into every late-ish  |
| `lens/leaving-the-playground.html` | 307 | <a class="hb-btn hb-btn--quiet" href="/explore/">Explore what is growing at other ages</a> |
| `milestones.html` | 182 | <section class="wrap" id="tracker"><div class="section-head"><h2>Filter by age, domain, or everyday question.</h2><p class="lede">Use this as a conversation sta |
| `milestones.html` | 250 | <script id="tracker-data" type="application/json">{"sources":{"zeroToThree":{"label":"ZERO TO THREE","url":"https://www.zerotothree.org/issue-areas/early-develo |
| `assets/css/tokens-field-guide.css` | 3 | Tokens: "The Living Field Guide to the Growing Mind". |
| `assets/css/field-guide.css` | 3 | The Living Field Guide to the Growing Mind. Page shell, the editorial |
| `assets/js/snake-game.js` | 2 | "Synapse Snake" on the Arcade page: steer a growing neural pathway through |
| `assets/js/home.js` | 5 | - The plate: "Show what's growing" reveals the typeset labels over the photograph. |
| `assets/js/home.js` | 41 | if (label) label.textContent = on ? "Hide the labels" : "Show what’s growing"; |
| `assets/js/dino-game.js` | 177 | text: "Space, Up or a tap jumps; hold it to jump higher. Down or a swipe down ducks. Gather seeds, spell each chapter's word, and keep growing.", |
| `from-instagram.html` | 112 | <span class="fi-item__hook">She dropped the spoon again. Here is what may be growing.</span> |
| `thank-you.html` | 104 | <p class="row__desc">the growing free resource library.</p> |
| `nsc/content/navigator/talking.v1.json` | 316 | "A growing word list plus following simple asks: that's the typical picture at this age, and understanding is the half people forget to check.", |
| `nsc/content/navigator/talking.v1.json` | 326 | "headline": "Growing, and worth keeping a friendly eye on", |
| `claims/index.html` | 89 | <p class="hub-title__fine">Free &middot; Evidence-graded &middot; 9 claims and growing</p> |

## 2. `Number Path`, `Number Sense Coach`, user-facing `NSC`

- `Number Sense Coach`: no occurrences outside docs.
- User-facing `NSC`: none (only route `/nsc`, env vars, and code identifiers).
- Tools dropdown nav item `Number Path / A free ten-minute counting check-in.`: 61 pages:

`contact/index.html:65`, `tools/screens-language-attention.html:65`, `tools/whats-typical-by-stage.html:65`, `tools/index.html:63`, `tools/ask-the-research.html:548`, `tools/regulating-yourself-first.html:65`, `tools/limits-without-escalation.html:65`, `tools/milestone-navigator.html:77`, `tools/checkup-prep.html:66`, `tools/whats-underneath-the-meltdown.html:65`, `tools/beyond-less-is-better.html:65`, `tools/activity-library.html:70`, `tools/communication-snapshot.html:70`, `tools/routines-transitions-night-waking.html:65`, `tools/co-regulation-primer.html:65`, `tools/reading-prompt-cards.html:70`, `tools/repair-after-the-hard-moment.html:65`, `index.html:91`, `privacy/index.html:65`, `arcade/index.html:62`, `classes/index.html:68`, `classes/birth-to-12-months.html:139`, `classes/toddlerhood.html:105`, `classes/preschool.html:139`, `classes/family-systems.html:131`, `pricing.html:62`, `faq/index.html:145`, `articles/self-regulation.html:128`, `articles/index.html:62`, `articles/parents-nervous-system.html:128`, `articles/toddler-no.html:128`, `articles/screen-time.html:128`, `articles/milestone-worry.html:128`, `articles/cliff-at-three.html:128`, `articles/serve-and-return.html:128`, `articles/counting-ladder.html:128`, `terms/index.html:65`, `404.html:58`, `about/index.html:110`, `explore/index.html:64`, `explore/1-to-2.html:64`, `explore/birth-to-1.html:64`, `explore/2-to-3.html:64`, `explore/3-to-4.html:64`, `explore/4-to-5.html:64`, `programs/index.html:65`, `lens/leaving-the-playground.html:83`, `milestones.html:160`, `terms-of-sale/index.html:66`, `from-instagram.html:72`, `thank-you.html:59`, `claims/bilingual-confusion.html:64`, `claims/index.html:63`, `claims/tummy-time.html:64`, `claims/screen-time-language.html:64`, `claims/baby-walkers.html:64`, `claims/pacifiers-speech.html:64`, `claims/talking-to-baby.html:64`, `claims/teething-fever.html:64`, `claims/shared-reading.html:64`, `claims/baby-led-weaning.html:64`

### Everything else

| File | Line | Text |
|---|---|---|
| `tools/index.html` | 109 | <div><h3 class="row__name"><a href="/nsc">Number Path</a></h3><p class="row__meta">Ages 2 to 5 &middot; 10 minutes</p></div> |
| `index.html` | 267 | <div class="age__col"><h3><a href="/explore/4-to-5">Self-control, slowly</a><span class="u-visually-hidden">, </span><span class="yrs">4 to 5</span></h3><p>Work |
| `index.html` | 334 | <a class="tools__row" href="/nsc"><span>Early number sense</span><b>Number Path</b></a> |
| `privacy/index.html` | 102 | <li>We collect what we need to run the classes and Number Path, to answer you, and to send the emails you ask for.</li> |
| `privacy/index.html` | 127 | <h3>When you have a class or Number Path account</h3> |
| `privacy/index.html` | 128 | <p>Your email address and sign-in details, what you have bought, and your progress through lessons. In Number Path we also keep what you enter about your child  |
| `privacy/index.html` | 137 | <p>This site is for adults. Number Path and the Arcade are made for a child to play with a parent or caregiver nearby. Number Path accounts are held by the adul |
| `privacy/index.html` | 143 | <li><b>Supabase</b> stores class and Number Path accounts.</li> |
| `privacy/index.html` | 148 | <li><b>Resend</b> sends Number Path emails.</li> |
| `classes/toddlerhood.html` | 287 | <li><a href="/nsc"><span class="reading__kind">Free check-in</span><span class="reading__title">Number Path</span><span class="reading__arrow" aria-hidden="true |
| `classes/preschool.html` | 251 | <li><a href="/nsc"><span class="reading__kind">Free check-in</span><span class="reading__title">Number Path</span><span class="reading__arrow" aria-hidden="true |
| `pricing.html` | 9 | <meta name="description" content="Everything From Little Onward offers, in one place: free tools and articles, the $49 first-year class, the $49 toddler class w |
| `pricing.html` | 101 | <div><h3 class="row__name">Tools, articles, and Ask the research</h3><p class="row__desc" style="margin-top:8px">Every parent tool and guide, eight articles, th |
| `pricing.html` | 152 | <div><h3 class="row__name">Number Path</h3><p class="row__desc" style="margin-top:8px">The counting check-in for ages 2 to 5 is free. The full version adds thre |
| `pricing.html` | 154 | <div class="price-row__act"><a class="hb-btn hb-btn--quiet" href="/nsc">Meet Number Path</a><a href="/nsc/gift">Give it as a gift</a></div> |
| `pricing.html` | 175 | <li><b>Number Path:</b> a full refund within 14 days of buying it.</li> |
| `lab/a/index.html` | 505 | <a class="tools__row" href="/nsc"><span>Early number sense</span><b>Number Path</b></a> |
| `lab/c/index.html` | 416 | <a href="/nsc"><span>Early number sense</span><b>Number Path</b></a> |
| `lab/b/index.html` | 394 | <a class="tools__row" href="/nsc"><span>Early number sense</span><b>Number Path</b></a> |
| `articles/milestone-worry.html` | 285 | <p>One more note, for the specific corner of this that is about early numbers: our own <a href="/nsc">Number Path</a> check-in is deliberately built as the oppo |
| `articles/counting-ladder.html` | 249 | <p>If you have read this far, you may be wondering where your own child actually is on the ladder. That question is the whole reason we built Number Path. It is |
| `articles/counting-ladder.html` | 261 | <li><a href="/nsc/evidence">Number Path: the full evidence page</a>, with every citation for the check-in and the weekly plan.</li> |
| `articles/counting-ladder.html` | 271 | <p>Number Path is a ten-minute, parent-run check-in for ages 2 to 5 that needs only a bowl, ten blocks, and a stuffed bear. The check-in is free; $34 once unloc |
| `articles/counting-ladder.html` | 275 | <a class="hb-btn hb-btn--paper" href="/nsc">Meet Number Path</a> |
| `terms/index.html` | 100 | <p>From Little Onward is run by Matthew McArthur. By using the site you agree to these terms and to our <a href="/privacy/">privacy policy</a>. The site is for  |
| `login.html` | 11 | <!-- Sign-in now lives in the Number Path app (one Supabase identity across |
| `account.html` | 11 | <!-- Accounts now live in the Number Path app (one Supabase identity across |
| `explore/3-to-4.html` | 212 | <li><a href="/nsc">Number Path</a><span class="ex-type">Tool</span></li> |
| `explore/4-to-5.html` | 202 | <li><a href="/nsc">Number Path</a><span class="ex-type">Tool</span></li> |
| `programs/index.html` | 121 | <h3 class="row__name"><a href="/nsc">Number Path</a></h3> |
| `milestones.html` | 26 | /* Number Path callout and class promo: classes instead of inline styles, |
| `milestones.html` | 97 | Calm, non-gated cross-links to the matching class, articles, and Number Path. */ |
| `milestones.html` | 182 | <section class="wrap" id="tracker"><div class="section-head"><h2>Filter by age, domain, or everyday question.</h2><p class="lede">Use this as a conversation sta |
| `milestones.html` | 266 | function renderStageGuide(){var box=el('stageGuide');if(!box)return;var cfg=SG_STAGE[state.age];if(state.age==='All'\|\|!cfg){box.hidden=true;box.innerHTML='';ret |
| `milestones.html` | 277 | if(cfg){var cls=SG_CLASSES[cfg.cls];var links=[];cfg.articles.forEach(function(s){links.push('<li>'+reportLink('/articles/'+s,SG_ART[s]\|\|s)+'</li>')});if(cls)li |
| `terms-of-sale/index.html` | 9 | <meta name="description" content="What you get when you buy a From Little Onward class or Number Path, and how refunds work." /> |
| `terms-of-sale/index.html` | 21 | <meta property="og:description" content="What you get when you buy a From Little Onward class or Number Path, and how refunds work." /> |
| `terms-of-sale/index.html` | 91 | <p class="hb-lead">What you get when you buy a class or Number Path, and how refunds work.</p> |
| `terms-of-sale/index.html` | 101 | <li>Classes and Number Path are one-time purchases. Nothing renews.</li> |
| `terms-of-sale/index.html` | 103 | <li>Full refund on Number Path within 14 days of buying, and a refund on a gift code within 14 days if it has not been redeemed.</li> |
| `terms-of-sale/index.html` | 117 | <h2 id="number-path">Number Path</h2> |
| `terms-of-sale/index.html` | 118 | <p>The free Number Path check-in needs only a parent account. The full program is a one-time payment for that parent account, with no subscription. Within 14 da |
| `terms-of-sale/index.html` | 130 | <p>The classes and Number Path are education about child development. They are not a screening, diagnosis, therapy, or medical or psychological advice, and they |
| `api/_knowledge-data.js` | 34389 | "text": "You can find your child's rung with the same game researchers use. At snack time, ask for one cracker, then two, then three, and watch what happens. A  |
| `api/_knowledge-data.js` | 34859 | "text": "Finding: Give-a-number game: twenty-four 2- and 3-year-olds asked to give a puppet one, two, three, five and six items. Younger children succeeded only |
| `api/_knowledge-data.js` | 35187 | "text": "Finding: Number Path: a parent-run check-in for ages about 2 to 5 that places a child on the counting ladder with a guided give-a-number game and sugge |
| `assets/data/explore.json` | 8 | { "id": "y4", "slug": "4-to-5", "name": "Self-control, slowly", "years": "4 to 5", "from": 48, "to": 60, "class": "/classes/preschool", "summary": "Working memo |
| `assets/data/explore.json` | 41 | { "type": "tool", "title": "Number Path", "href": "/nsc", "ages": ["y3", "y4"], "topics": ["learning"], "moments": [] }, |
| `nsc/tools/activities/grader.ts` | 6 | * Reuses the Number Path cert primitives: banned-language floor |
| `nsc/app/class-login/page.tsx` | 22 | // Already signed in (for example through Number Path): go straight to classes. |
| `nsc/app/app/classes/layout.tsx` | 15 | // The link to Number Path appears only for an account that owns both. |
| `nsc/app/app/classes/layout.tsx` | 18 | const [classes, numberPath] = await Promise.all([ |
| `nsc/app/app/classes/layout.tsx` | 21 | ownsBoth = classes.length > 0 && numberPath; |
| `nsc/app/app/classes/layout.tsx` | 24 | <ClassShell header={<ClassHeader email={user?.email} showNumberPath={ownsBoth} />}> |
| `nsc/app/app/classes/error.tsx` | 8 | /** Error fallback for the classes area, in class terms (the root one speaks Number Path). */ |
| `nsc/app/app/classes/account/page.tsx` | 16 | numberpath_full: "Number Path, full access", |
| `nsc/app/app/classes/page.tsx` | 196 | <p className="mt-1 text-sm text-ink-soft">Includes unlimited Ask the research and Number Path.</p> |
| `nsc/app/app/classes/page.tsx` | 202 | {summary.numberPath && ( |
| `nsc/app/app/classes/page.tsx` | 204 | <Eyebrow>Number Path</Eyebrow> |
| `nsc/app/app/classes/page.tsx` | 208 | <LinkButton href="/app" variant="ghost" size="sm" className="border border-line">Open Number Path</LinkButton> |
| `nsc/app/app/account/actions.ts` | 17 | * one (one-time Number Path purchases don't). Redirects back to the account |
| `nsc/app/app/account/page.tsx` | 16 | membership: "Membership: everything, including Number Path", |
| `nsc/app/app/account/page.tsx` | 17 | numberpath_full: "Number Path: full access", |
| `nsc/app/app/account/page.tsx` | 142 | {/* Number Path */} |
| `nsc/app/app/account/page.tsx` | 144 | <p className="text-[0.9375rem] font-semibold text-amber-deep">Number Path</p> |
| `nsc/app/app/account/page.tsx` | 146 | {summary.numberPath ? "Full access" : "Free check-in"} |
| `nsc/app/app/account/page.tsx` | 149 | {summary.numberPath |
| `nsc/app/app/account/page.tsx` | 155 | Open Number Path |
| `nsc/app/app/account/page.tsx` | 190 | <Link href="/" className="underline">Back to Number Path home</Link> |
| `nsc/app/app/child/[id]/checkin.ics/route.ts` | 61 | "PRODID:-//From Little Onward//Number Path//EN", |
| `nsc/app/app/child/[id]/checkin.ics/route.ts` | 67 | `SUMMARY:Number Path check-in: ${icsText(child.nickname)}`, |
| `nsc/app/app/child/[id]/printables/board/page.tsx` | 4 | /** Number Path board — a linear 1–20 track (Ramani & Siegler linear-board design). */ |
| `nsc/app/app/child/[id]/printables/board/page.tsx` | 13 | <h1 className="text-2xl font-semibold">Number Path board game</h1> |
| `nsc/app/app/child/[id]/printables/page.tsx` | 6 | { slug: "board", title: "Number Path board game", blurb: "The linear 1–20 board. The most-studied game in the pack. Say the printed numbers, never count the mov |
| `nsc/app/evidence/page.tsx` | 8 | title: "The evidence \| Number Path", |
| `nsc/app/evidence/page.tsx` | 10 | "Every study behind Number Path: the counting-ladder research, the trials behind each game, and what we deliberately left out.", |
| `nsc/app/evidence/page.tsx` | 70 | Number Path makes narrow claims on purpose. This page is the receipt |
| `nsc/app/auth/actions.ts` | 32 | * Classes and Number Path share one account but not one destination. The |
| `nsc/app/auth/actions.ts` | 34 | * path even when `next` is missing or points at the Number Path dashboard. |
| `nsc/app/classes/infant/preview/page.tsx` | 70 | <ClassShell header={<ClassHeader email={user?.email} showNumberPath={false} />}> |
| `nsc/app/redeem/page.tsx` | 8 | export const metadata = { title: "Redeem a gift \| Number Path" }; |
| `nsc/app/gift/card/page.tsx` | 4 | export const metadata = { title: "Number Path gift card" }; |
| `nsc/app/gift/card/page.tsx` | 28 | <h2 className="mt-4 text-3xl font-semibold">Number Path</h2> |
| `nsc/app/gift/success/page.tsx` | 6 | export const metadata = { title: "Your gift is ready \| Number Path" }; |
| `nsc/app/gift/page.tsx` | 10 | title: "Give Number Path as a gift", |
| `nsc/app/gift/page.tsx` | 25 | Give Number Path |
| `nsc/app/api/email/unsubscribe/route.ts` | 19 | `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noi |
| `nsc/app/api/email/unsubscribe/route.ts` | 46 | `<h1>Stop Number Path emails?</h1> |
| `nsc/app/api/email/unsubscribe/route.ts` | 78 | "<h1>Done.</h1><p>No more emails from Number Path. The weekly plan keeps refreshing in the app either way.</p>", |
| `nsc/app/activities/week/page.tsx` | 177 | ? `The Activity Library covers 0–36 months for now. For ${child.nickname}, Number Path plans the week instead.` |
| `nsc/app/activities/today/actions.ts` | 12 | /** Child creation for the library (same spine table as Number Path). */ |
| `nsc/app/activities/today/page.tsx` | 193 | ? `The Activity Library covers 0–36 months for now. For ${child.nickname}'s age, Number Path has a full week of counting games.` |
| `nsc/app/activities/today/page.tsx` | 198 | Meet Number Path → |
| `nsc/app/page.tsx` | 133 | counting apps send every family the same drills. Number Path |
| `nsc/app/page.tsx` | 166 | Number Path only does what the research actually supports: everyday |
| `nsc/app/page.tsx` | 175 | Number Path never ranks your child, gives a score, or sounds an |
| `nsc/app/globals.css` | 57 | /* Number Path only: the Counting Ladder's current-rung field (child-facing |
| `nsc/app/globals.css` | 104 | classroom, lessons) and paints its own ground. Number Path has no dark |
| `nsc/app/global-error.tsx` | 29 | Number Path didn&rsquo;t load |
| `nsc/app/not-found.tsx` | 21 | Number Path home |
| `nsc/content/citations.v1.json` | 59 | "notes": "G1 verified 2026-07-07 against Wiley (DOI 10.1111/j.1467-8624.2007.01131.x, PMID 18366429). Replicated: Siegler & Ramani (2008, Developmental Science, |
| `nsc/content/citations.v1.json` | 64 | "claim_scope": "Why Number Path does not sell approximate-number-system training: transfer is contested", |
| `nsc/content/citations.v1.json` | 91 | "notes": "G1 verified 2026-07-10 (abstract-level, Consensus/PubMed records) by Claude under Matthew's blanket approval; PDF-level effect-size read owed before a |
| `nsc/content/games.catalog.v1.json` | 1119 | "title": "Number Path Board Game", |
| `nsc/content/games.catalog.v1.json` | 1131 | "printed Number Path board", |
| `nsc/components/site-chrome.tsx` | 5 | * The Field Guide chrome for every page of this app (Number Path and the |
| `nsc/components/class-chrome.tsx` | 21 | * Classes and Number Path share an account and nothing else, so no Number |
| `nsc/components/class-chrome.tsx` | 22 | * Path navigation appears here unless the account owns both (`showNumberPath`). |
| `nsc/components/class-chrome.tsx` | 24 | export function ClassHeader({ email, showNumberPath }: { email?: string; showNumberPath: boolean }) { |
| `nsc/components/class-chrome.tsx` | 32 | {showNumberPath && <Link href="/app" className={NAV_LINK}>Number Path</Link>} |
| `nsc/package.json` | 5 | "description": "Number Path (codename nsc) — parent-run early-math check-in. Next.js app + compiled-artifact content + titration engine.", |
| `nsc/lib/engagement.ts` | 101 | <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p> |
| `nsc/lib/weekly-activity-plan.ts` | 7 | * Number Path's weekly plan: (child, ISO week, catalog, budget) always |
| `nsc/lib/stripe.ts` | 14 | export const NSC_PRODUCT = "numberpath_full" as const; |
| `nsc/lib/entitlements.server.ts` | 5 | import { unlocksNumberPath } from "@/lib/grants"; |
| `nsc/lib/entitlements.server.ts` | 9 | * Entitlements. The original one-time SKU (`numberpath_full` in |
| `nsc/lib/entitlements.server.ts` | 12 | * (membership includes Number Path — plan 2.2). Free tier is the |
| `nsc/lib/entitlements.server.ts` | 26 | .eq("product", "numberpath_full") |
| `nsc/lib/entitlements.server.ts` | 37 | .in("product_scope", ["numberpath_full", "membership"]); |
| `nsc/lib/entitlements.server.ts` | 38 | return Boolean(ent && unlocksNumberPath(ent, new Date())); |
| `nsc/lib/entitlements.server.ts` | 43 | * hasFullAccess: a standalone Number Path purchase does NOT unlock |
| `nsc/lib/entitlements.server.ts` | 44 | * membership surfaces; membership unlocks Number Path (plan 2.2). |
| `nsc/lib/entitlements.server.ts` | 80 | numberPath: boolean; |
| `nsc/lib/entitlements.server.ts` | 93 | numberPath: false, |
| `nsc/lib/entitlements.server.ts` | 115 | // Standalone Number Path purchase (authoritative, pre-spine). |
| `nsc/lib/entitlements.server.ts` | 120 | .eq("product", "numberpath_full") |
| `nsc/lib/entitlements.server.ts` | 123 | if (purchase) scopes.add("numberpath_full"); |
| `nsc/lib/entitlements.server.ts` | 163 | // Membership includes Number Path (plan 2.2). |
| `nsc/lib/entitlements.server.ts` | 164 | numberPath: scopes.has("numberpath_full") \|\| membership, |
| `nsc/lib/config/brand.ts` | 2 | * Number Path — brand + product strings. |
| `nsc/lib/config/brand.ts` | 9 | productName: "Number Path", |
| `nsc/lib/gift.ts` | 167 | // numberpath_full from source "gift"). nsc_purchases stays authoritative |
| `nsc/lib/game-audio.ts` | 8 | * to an account that can play that game: Number Path full access (a |
| `nsc/lib/game-audio.ts` | 9 | * purchase, a redeemed Number Path gift, or membership), or, on the free |
| `nsc/lib/game-audio.ts` | 21 | /** Number Path full access. */ |
| `nsc/lib/game-audio.ts` | 56 | if (!allowed) return json("Number Path purchase required", 403); |
| `nsc/lib/backfill.server.ts` | 24 | * - Subscriptions only. Standalone Number Path one-time buys already grant at |
| `nsc/lib/class-gift.ts` | 10 | * account that redeems it, for life. Unlike Number Path gift codes they are |
| `nsc/lib/grants.ts` | 18 | * \| Number Path $34 one-time \| numberpath_full, perpetual (kept standalone) \| |
| `nsc/lib/grants.ts` | 19 | * \| Number Path gift redemption \| numberpath_full, perpetual, source gift \| |
| `nsc/lib/grants.ts` | 153 | case "numberpath_full": |
| `nsc/lib/grants.ts` | 156 | product_scope: "numberpath_full", |
| `nsc/lib/grants.ts` | 211 | product_scope: "numberpath_full", |
| `nsc/lib/grants.ts` | 218 | /** Scopes that unlock the full Number Path experience. Membership includes |
| `nsc/lib/grants.ts` | 219 | * Number Path (plan 2.2); a member who cancels but bought Number Path |
| `nsc/lib/grants.ts` | 221 | const NUMBERPATH_SCOPES = new Set(["numberpath_full", "membership"]); |
| `nsc/lib/grants.ts` | 223 | export function unlocksNumberPath( |
| `nsc/lib/grants.ts` | 229 | NUMBERPATH_SCOPES.has(r.product_scope) && |
| `nsc/lib/email.server.ts` | 15 | "Number Path <hello@growingmindsscience.com>"; |
| `nsc/lib/class-paths.ts` | 14 | * path, including the Number Path dashboard at /app, becomes My classes. |
| `nsc/lib/stripe-webhook.ts` | 57 | const PURCHASE_TABLE_PRODUCTS = new Set(["numberpath_full", "numberpath_printables"]); |
| `nsc/lib/stripe-webhook.ts` | 125 | <p style="margin:0 0 20px;color:#1E5F62;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Number Path</p> |
| `nsc/lib/stripe-webhook.ts` | 136 | const text = `Your Number Path gift is ready.\n\nCode to give: ${code}\n\nThe family redeems it at ${redeemUrl} whenever they're ready. It's theirs for good, no |
| `nsc/lib/stripe-webhook.ts` | 137 | return { subject: "Your Number Path gift code", html, text }; |

## 3. `Mental models, not scripts`

| File | Line | Use |
|---|---|---|
| `index.html` | 347 | Homepage founder H2 |
| `about/index.html` | 135 | About H1 |
| `lab/a/index.html`, `lab/b/index.html`, `lab/c/index.html`, `lab/index.html` | 527, 407, 429, 45 | Archived compositions |

## 4. `Clear about what's known. Honest about what's not.`

| File | Line | Use |
|---|---|---|
| `index.html` | 325 | Homepage free-tools section (bold lead of the evidence paragraph) |
| `lab/a`, `lab/b`, `lab/c` | several | Archived compositions |

## 5. `open to any parent who seeks it`

Present in the footer tagline (`.site-footer__tag`) of 61 pages and the nsc `SiteFooter`, plus the homepage and About meta descriptions, `og:description`, `og:image:alt`, JSON-LD organization description, the homepage mission lead (line 150) and closing band (line 360).

## 6. Headings (h1 to h3) and card titles with a "not X, Y" / "X, not Y" construction (before edits)

| File | Line | Heading |
|---|---|---|
| `index.html` | 347 | Mental models, not scripts. |
| `about/index.html` | 135 | Mental models, not scripts. |
| `articles/cliff-at-three.html` | 376 | Walk into the transition conference with observations, not just worry. |
| `articles/milestone-worry.html` | 222 | Order varies too, not just timing |
| `articles/milestone-worry.html` | 310 | The milestone tracker is built to inform you, not alarm you. |
| `articles/toddler-no.html` | 221, 243 | Choices within limits, not unlimited choice |
| `contact/index.html` | 97 | A real reply, not an auto-response. |
| `terms/index.html` | 102 | Educational, not clinical |
| `terms-of-sale/index.html` | 129 | Educational, not clinical |
| `tools/limits-without-escalation.html` | 261 | Focus on follow-through, not stronger language. |
| `tools/limits-without-escalation.html` | 275 | Repair the tone, not the boundary. |
| `tools/regulating-yourself-first.html` | 193 | Now the move is repair, not shame. |
| `tools/screens-language-attention.html` | 164 | Likely a short-term wobble, not lasting damage. |
| `tools/screens-language-attention.html` | 178 | "Educational" is a label, not a guarantee. |
| `tools/whats-typical-by-stage.html` | 124 | Night waking is data, not a verdict |
| `tools/whats-underneath-the-meltdown.html` | 157 | Start with regulation, not reasoning. |

Body copy using the pattern to correct a myth (for example "Serve and return, not flashcards", "“No” is a milestone, not defiance", "Typical ranges, not deadlines") is not listed and stays.

---

# After the edits (2026-10-24)

## Step 1: slogan system

| Where | Change |
|---|---|
| `index.html` | Hero H1 "Every grown-up starts little."; `og:title` "From Little Onward: every grown-up starts little"; plate toggle and helper text "Show what’s beneath"; age heading "Five windows, one childhood."; founder H2 "The person behind the classes." `<title>` and descriptions unchanged. |
| `assets/js/home.js` | Toggle label resets to "Show what’s beneath". |
| 61 page footers + `scripts/build-claims.mjs` template | New `.site-footer__line` "Every grown-up starts little." above the existing access-line descriptor. |
| `assets/css/chrome.css` | `.site-footer__line`: display face, 1.1875rem, on-dark ink. |
| `nsc/components/site-chrome.tsx` | Same two-line footer in the app. |
| `about/index.html` | Trust line as the lead under "How we teach", directly beside the principles list. Rest of the page already rebranded. |
| `classes/index.html` | Trust line under the lead that promises "the evidence, and the limits" (`.cl-terms--trust`, added to `classes.css`). |
| `classes/birth-to-12-months.html`, `classes/toddlerhood.html` | Trust line as the bold lead-in to "What this class draws on." |
| `classes/preschool.html`, `classes/family-systems.html` | Trust line closes the "By the end of the class" lede (no sources block on these pages). |
| `programs/index.html` | Trust line as the lead under "Built to sit beside your services", beside the "Sourced" claims-library point. |
| `claims/index.html` + `scripts/build-claims.mjs` | Trust line as the bold lead-in to the header paragraph. |
| `classes/index.html`, `preschool.html`, `family-systems.html` | Class-map caption "one window of the same growing mind" became "one window of the same childhood". |
| 63 pages | Asset `?v=` stamps refreshed by `scripts/stamp-assets.mjs`. |

Placement check: the trust line appears exactly once on each of `index.html`, `about/`, `classes/` (all five), `programs/`, `claims/`. The brand line appears in the homepage H1, homepage `og:title`, and every footer.

**Hero at 375px:** renders on two lines, "Every grown- / up starts little." No orphan. It breaks at the compound's own hyphen. Keeping "grown-up" unbroken (no-wrap) pushes "Every" onto a line by itself, which reads worse, so the markup is unchanged.

## Step 2: Tallykin

| Where | Change |
|---|---|
| Tools dropdown on every page (64 nav items) | "Tallykin / A free ten-minute counting check-in." |
| `index.html` | Free-tools row and 4-to-5 "Try:" link (via `assets/data/explore.json`, `build-explore --check` passes). |
| `tools/`, `pricing.html`, `programs/`, `classes/toddlerhood`, `classes/preschool`, `explore/3-to-4`, `explore/4-to-5`, `milestones.html`, `articles/counting-ladder`, `articles/milestone-worry`, `login.html`, `account.html` | All text mentions. |
| `privacy/`, `terms/`, `terms-of-sale/` | Name only, each with `<!-- TODO: attorney review (brand rename: Number Path is now Tallykin) -->` at the top of `<main>`. The `#number-path` anchor id is kept. |
| `nsc/lib/config/brand.ts` | `productName: "Tallykin"` (drives `<title>`, H1, signup, login, reset, redeem, upgrade, account). |
| `nsc/app/page.tsx` | Body copy renamed; "A From Little Onward tool" added under the H1 and product line. |
| `nsc/app/**`, `nsc/components/**`, `nsc/lib/**` | Evidence, gift, gift card, gift success, redeem, not-found, global error, account labels, classes dashboard card, class header link, unsubscribe pages, activity library prompts, `.ics` reminder, game-audio error, gift email, engagement email, default sender name. Comments renamed too; identifiers (`numberpath_full`, `showNumberPath`, routes, tables, env vars) untouched. |
| `nsc/content/citations.v1.json` | `claim_scope` shown on the evidence page now reads "Why Tallykin does not sell…". Cert re-run: gold and full both PASS; reports re-hashed. |

## Step 3: QA results

- `nsc`: 327/327 tests, `tsc --noEmit` clean, `next build` succeeds, cert gold and full PASS.
- Static: `build-claims --check`, `build-explore --check`, `stamp-assets --check`, `check-canonicals` all pass.
- Rendered checks: `/` (H1, toggle, headings, nav, footer, `og:title`), `/nsc` (title "Tallykin | From Little Onward", H1, endorsement line, footer), `/nsc/evidence`, `/nsc/login`, `/nsc/gift`, `/nsc/class-login` (no Tallykin label), `/about`, `/classes`, `/classes/preschool`, `/claims`.
- OG tags: homepage `og:title` new, `og:description` unchanged (access line). About already correct. **The Tallykin app sets no `og:` tags at all** (only `<title>` and description), so shares fall back to the title. Not added, to avoid inventing copy; listed as a follow-up.

### Remaining `Number Path` (all deliberate)

| File | Why it stays |
|---|---|
| `nsc/content/games.catalog.v1.json` 1119, 1131; `nsc/app/app/child/[id]/printables/page.tsx` 6; `.../printables/board/page.tsx` 13 | Game name: the printable "Number Path board game" (a "number path" is the standard early-math term for a linear numbered track). Kept under "keep all game names". **Your call:** rename to e.g. "Counting path board game" if you want zero "Number Path" in the app. |
| `nsc/content/citations.v1.json` 59, 91 | Internal verification `notes`, not rendered; refer to the board game. |
| `api/_knowledge-data.js` 34389, 35187 | Generated Ask-the-research knowledge base. 34389 comes from a lesson script ("Number Path on the Growing Minds Science site"), which is out of scope; 35187 from a research note. **Needs the source fixed and `export-class-knowledge.py` / `build-knowledge.mjs` re-run.** |
| Legal-page TODO comments, `nsc/tools/activities/grader.ts` comment | Not rendered. |

### Remaining `growing` (classified)

| Occurrence | Class |
|---|---|
| `tools/index.html` 9, 20 "growing library"; `thank-you.html` 104; `claims/index.html` 89 "9 claims and growing" | Descriptive |
| `tools/routines-transitions-night-waking.html` 193, `articles/milestone-worry.html` 291, `milestones.html` data, `nsc/content/navigator/talking.v1.json`, `assets/js/dino-game.js` 177, knowledge base text | Descriptive (child development prose) |
| `lens/leaving-the-playground.html` 307 "Explore what is growing at other ages" | Descriptive, though it echoes the retired hero line. Left as is; easy to change to "Explore other ages" if you prefer. |
| `from-instagram.html` 112 "Here is what may be growing." | Descriptive hook of an Instagram post page. Same note as above. |
| `/api/growing-minds-ai`, `#growing-minds-ai`, `vercel.json` redirects | Internal endpoint, anchor id, and redirects (out of scope) |
| `instagram.com/growingmindsscience`, domain, Gmail | Out of scope |
| CSS/JS file-header comments "Growing Minds Science", `assets/img/mark.svg` comment | Not rendered |
| `/lab/a`, `/lab/b`, `/lab/c` | Archived homepage compositions, untouched: still show "See what’s growing.", "Five periods, one growing mind.", "Mental models, not scripts.", "Number Path", and (lab/a) "The living field guide to the growing mind." Public URLs but unlinked. Recommend adding `/lab` to `.vercelignore` rather than rewriting design records. |

### "Not X, Y" headings remaining after the edits

No new ones added. Removed: the homepage "Mental models, not scripts." H2. Remaining:

| File | Line | Heading |
|---|---|---|
| `about/index.html` | 135 | Mental models, not scripts. |
| `articles/cliff-at-three.html` | 376 | Walk into the transition conference with observations, not just worry. |
| `articles/milestone-worry.html` | 222 | Order varies too, not just timing |
| `articles/milestone-worry.html` | 310 | The milestone tracker is built to inform you, not alarm you. |
| `articles/toddler-no.html` | 221 | Choices within limits, not unlimited choice |
| `articles/toddler-no.html` | 243 | Choices within limits, not unlimited choice |
| `contact/index.html` | 97 | A real reply, not an auto-response. |
| `terms-of-sale/index.html` | 130 | Educational, not clinical |
| `terms/index.html` | 103 | Educational, not clinical |
| `tools/limits-without-escalation.html` | 261 | Focus on follow-through, not stronger language. |
| `tools/limits-without-escalation.html` | 275 | Repair the tone, not the boundary. |
| `tools/regulating-yourself-first.html` | 193 | Now the move is repair, not shame. |
| `tools/screens-language-attention.html` | 164 | Likely a short-term wobble, not lasting damage. |
| `tools/screens-language-attention.html` | 178 | "Educational" is a label, not a guarantee. |
| `tools/whats-typical-by-stage.html` | 124 | Night waking is data, not a verdict |
| `tools/whats-underneath-the-meltdown.html` | 157 | Start with regulation, not reasoning. |

## Needs a manual update outside the repo

- **Stripe:** product and price names (the $34 one-time product, printables, gift) still say Number Path. Checkout pages and receipts show the Stripe product name.
- **Email sender:** `NSC_EMAIL_FROM` in the nsc Vercel project overrides the in-repo default. If it is set to "Number Path <…>", change it to "Tallykin <hello@fromlittleonward.com>". Also check the Resend sender display name.
- **Static OG images:** `site-home.jpg` has no text, so nothing to change. Article cards (`assets/img/og/*.png`) carry article titles only.
- **Instagram handle** `@growingmindsscience` (out of scope).
- **Third-party listings:** none found in the repo.
- **Ask the research knowledge base** (`api/_knowledge-data.js`): see above.

## Ambiguous screens left as they were

- **`/nsc/login`** shows the product label (now "Tallykin") above "Welcome back". It is also where the site-wide `/login` redirect lands and where the Activity Library sends signed-out visitors, so class buyers can see it. The label was "Number Path" before; the rename kept the same behavior. **Your call:** make it neutral ("From Little Onward") or point the site-wide sign-in at `/nsc/class-login`.
- **`/nsc/reset`** shows "Tallykin" unless the class flow flag is set (`?class=1`), so it already separates the two. No change.
