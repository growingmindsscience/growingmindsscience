# First-time parent improvements

Scope: the seven pain points from the November 2026 first-time-parent review.
Keep existing research, recorded narration, educational boundaries, and pricing.

1. Immediate help: verify the JavaScript router; provide the same steps without
   JavaScript and put immediate actions first on the full meltdown guide.
2. Choosing a resource: recommend one starting point per age and situation;
   keep additional reading available in disclosures.
3. Class value: show how the free resources and a structured class fit together,
   with a concrete example rather than a vague promise to go deeper.
4. Relevant previews: reuse the existing signed-video preview system for all
   three classes. Toddler: Inside a Tantrum. Preschool: Pretend Play. Expose only
   one explicitly selected, published video per class. Disclose AI narration
   beside the sample. Preserve captions, transcripts and enrolled access.
5. Reassuring wording: replace the undefined comparison about parents who “did
   best” on the homepage and About page.
6. Developmental tools: explain what parents receive, show an illustrative
   checkup note, and distinguish exploration from CDC milestone checklists.
   Keep all thresholds and scoring unchanged.
7. Tallykin: state the free allowance and $34 full-program price at entry.

Verification: mobile and desktop browser journeys, JavaScript-disabled help,
preview access and playback tests, app typecheck/build, content generators,
asset hashes, canonical checks, and existing repository CI gates.

Publication: prepare a reviewable pull request. Live preview flags are content
configuration, separate from deploying the static site and class app. Record
their final state and any remaining deployment steps in the handoff.

## Implemented and checked

All seven items are implemented on `improve-first-parent-journey`. The existing
JavaScript urgent-help router already showed actions first; this change adds
inline advice without JavaScript and immediate advice to the full meltdown
guide, including on phones.

- 355 app tests, including public-route boundaries and sample playback tests.
- 215 API/arcade tests; app typecheck and production build.
- Content certification, safety floors, eval/library self-tests, corpus checks,
  generated Explore/claims checks, canonical URLs, and asset-hash checks.
- Chromium at 390px and 1440px: edited static pages, urgent-help controls,
  recommendations, disclosures, Snapshot initialization, and no horizontal
  overflow. JavaScript-disabled help also checked. Screenshots and browser
  results are in `/workspace/first-parent-qa` in the task workspace.
- Shared server component reviewed against React best practices: fixed course
  props, request-scoped cached reads, parallel independent reads, no new client
  bundle, and existing playback/progress boundaries preserved.

## Preview configuration and release

On 2026-11-09, selected the two additional samples using the existing
`is_free_preview` content flag in the Growing Minds Science Supabase project.
A follow-up read confirmed exactly three selected lessons, all published and
with video and transcript: infant `serve-and-return`, toddlerhood
`inside-a-tantrum`, and preschool `pretend-play`. No schema or RLS changes.

Equivalent content configuration for another database:

```sql
update public.class_lessons
set is_free_preview = true
where ((course_slug = 'toddlerhood' and slug = 'inside-a-tantrum')
    or (course_slug = 'preschool' and slug = 'pretend-play'))
  and status = 'published' and mux_playback_id is not null;
```

Deploy the class app (`nsc`) before the static marketing site, whose new links
point to these routes through the existing multi-zone rewrite. Production
playback needs the existing Supabase and Mux configuration. The local build and
mocked playback tests cannot verify live signing, streaming or caption delivery.
