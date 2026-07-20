# Floors verification packet

Working checklist for the read-through that flips every artifact from
`drafted_pending_matthew_verification` to verified. The floors grader already
proves the tools match the artifacts; this review proves the artifacts match
the literature. Work source by source: pull the paper, then check every line
that cites it. Check a box only after seeing the claim in the source itself,
not an abstract or a secondary summary.

When done: flip the `status` field in each artifact, note the date, and commit.
If any line fails review, fix the artifact first; the grader will catch any
accidental softening.

## Sources to pull (keel/artifacts/shared/floor_sources.v1.json)

- [ ] `zubler2022` — Zubler et al., Pediatrics 2022;149(3):e2021052138 (doi:10.1542/peds.2021-052138)
- [ ] `cdc_ltsae` — CDC Learn the Signs. Act Early. milestones (2022 revision)
- [ ] `filipek1999` — Filipek et al., J Autism Dev Disord 1999;29(6):439-484
- [ ] `aap_referral` — Lipkin & Macias, Pediatrics 2020;145(1):e20193449
- [ ] `rescorla1989` — Rescorla, J Speech Hear Disord 1989;54(4):587-599
- [ ] `noritz2013` — Noritz & Murphy, Pediatrics 2013;131(6):e2016-e2027 (doi:10.1542/peds.2013-1056)
- [ ] `jcih2019` — JCIH Year 2019 Position Statement, JEHDI 2019;4(2):1-44
- [ ] `flipsen2006` — Flipsen, Clin Linguist Phon 2006;20(4):303-312
- [ ] `zwaigenbaum2015` — Zwaigenbaum et al., Pediatrics 2015;136(Suppl 1):S10-S40 (doi:10.1542/peds.2014-3667C)

## Tier 1 — the floors themselves (highest stakes)

These are the red lines both tools enforce. Each row: verify the claim, the
age threshold, and the severity posture against the cited source.

### Shared across both tools (thresholds must match; the grader enforces the match, you verify the value)

- [ ] `skill_loss_any_age` / `skill_loss_any_domain` — any loss of language or
  social skills at any age → priority. Filipek 1999 (absolute indications) and
  Zwaigenbaum 2015 (regression). Verify: is "any skill loss, any age, prompt
  referral" a fair reading, or do the sources limit it to language/social loss?
  Our tools apply it to ALL domains including motor; confirm you're comfortable
  extending it (Noritz 2013 treats motor regression as a red flag too).
- [ ] `no_response_to_name_12m` → discuss at 12m (Zwaigenbaum 2015, CDC).
- [ ] `no_pointing_to_show_15m` → discuss at 15m. Zwaigenbaum puts declarative
  pointing at 12-15m; floor sits at the outer bound. Confirm.
- [ ] `no_words_16m` → discuss at 16m (Filipek 1999 absolute indication).
- [ ] `no_one_step_directions_24m` → discuss at 24m (CDC/Zubler). Verify the
  "without gesture cues" qualifier is how the source frames it.

### LMC-only floors (keel/artifacts/lmc/floors.v1.json)

- [ ] `no_conventional_gestures_12m` → discuss. Filipek: "no gesturing by 12
  months". Our encoding requires BOTH gesture items absent (waves_gestures AND
  points_request). Confirm the both-absent encoding is faithful.
- [ ] `late_talker_24m` → discuss. Rescorla: <50 words OR no combinations at
  24m. Confirm the OR.

### Navigator-only floors (keel/artifacts/navigator/floors.v1.json)

- [ ] `stranger_intelligibility_36m` → discuss when unfamiliar adults
  understand less than half at 36m+. Flipsen 2006. This is the floor with the
  most interpretive distance from its source (Flipsen measures intelligibility
  development; the "half by 3" rule of thumb is clinical convention). Decide if
  the source supports it or whether it needs a second citation.
- [ ] `not_sitting_9m` → discuss (Noritz 2013, CDC).
- [ ] `no_weight_bearing_12m` → discuss (Noritz 2013).
- [ ] `not_walking_18m` → discuss, corrected age (Noritz 2013, CDC).
- [ ] `early_hand_preference_12m` → discuss when present BEFORE 12m (the
  inverted floor; Noritz 2013).
- [ ] `asymmetry_any_age` → priority (Noritz 2013).
- [ ] `not_reaching_6m`, `persistent_fisting_6m`, `no_hand_transfer_9m`,
  `no_finger_thumb_grasp_12m` → discuss (Noritz 2013, CDC/Zubler). For
  fisting: floor is set at 6m against a typical resolution around 4m; confirm.
- [ ] `no_social_games_12m`, `no_pretend_play_30m` → discuss (CDC/Zubler,
  Zwaigenbaum). Pretend floor sits at the outer bound (30m); confirm.
- [ ] `no_social_smile_4m` → discuss (CDC/Zubler).
- [ ] `no_shared_enjoyment_12m` → discuss (Zwaigenbaum).
- [ ] `hearing_concern_any_age` → discuss, audiology-first, no watch-and-wait
  (JCIH 2019). Verify JCIH really does treat caregiver concern alone as
  sufficient for audiological referral.
- [ ] `no_sound_response_any_age` → priority (JCIH 2019).
- [ ] `no_sound_localization_9m` → discuss (JCIH, CDC).
- [ ] `repeated_self_injury` → discuss at any age (aap_referral). This one is
  a judgment floor; confirm you want it kept.

## Tier 2 — rules and flags that EXCEED the floors (my authorship; review hardest)

The grader only proves these never undercut a floor. Nobody has verified they
are individually sound. Each is in `lmc/interpretation.v1.json` (rules) or
`navigator/trees.v1.json` (flags).

Discuss-level additions (these change what parents are told to do):
- [ ] `no_babble_12m` → discuss. Filipek lists "no babbling by 12 months" as
  an absolute indication, so this should be uncontroversial, but it is not in
  your floors files; consider promoting it to a floor in v1.1.
- [ ] `no_shared_enjoyment_12m` (LMC rule) → discuss, mirroring the Navigator
  floor. Confirm the mirror.
- [ ] `no_point_following_18m` (LMC rule) → discuss, mirroring the Navigator
  understanding floor. Confirm the mirror.
- [ ] Navigator `hf_bothhands` flag → discuss when a child 18m+ is not using
  both hands together in play. No floor backs this; it's a conservative
  judgment flag. Keep, soften, or cut.
- [ ] Navigator behavior questions `br_soothe` (<12m, inconsolable most days),
  `br_intensity` (12m+, much bigger than age-mates most days), `br_impact`
  (12m+, family organizes around avoidance) → discuss. These implement your
  sparse-floor policy note ("carry conservatism through generous discuss
  routing"). Confirm the wording draws the lines where you want them.

Watch-level additions (lower stakes; they only add "watch on purpose" copy):
- [ ] `watch_babble_10m` (10-11m), `watch_first_words_13m` (13-15m),
  `watch_gestures_10m` (10-11m), `watch_pointing_12m` (12-14m),
  `watch_name_sometimes_12m` ("sometimes" past 12m), `watch_words_18m`
  (<10 words, 18-23m), `watch_combines_21m` (21-23m), `watch_imitation_15m`,
  `watch_turns_12m`, `watch_onestep_18m` (18-23m).
  The <10-words-at-18m threshold is the most invented number in the set;
  check it against Zubler/CDC 18m expectations and adjust if needed.

## Tier 3 — factual claims inside the copy

Claims a parent could act on that live in guidance text rather than rules:
- [ ] "Early intervention programs can evaluate at no cost in most US states"
  (Snapshot guidance + Navigator action sheets). Part C evaluation is free
  everywhere; SERVICES may have sliding-scale fees in some states. Current
  wording says evaluate, which is accurate; confirm you're happy with it.
- [ ] "A passed newborn hearing screen is a point-in-time result" framing
  (JCIH 2019 supports; confirm wording).
- [ ] Corrected age: more than 3 weeks early, under 24 months, counted from
  due date (standard AAP framing; confirm).
- [ ] "Word approximations used consistently count as words" and "count across
  all languages" (instrument help text; standard CDI-style instruction,
  deliberately without citing CDI).
- [ ] "Combinations often appear in a burst once the single-word bank passes
  about 50 words" (`watch_combines_21m` body; the 50-word convention from
  Rescorla/late-talker literature; confirm the causal-ish phrasing).
- [ ] Walking window "roughly 9 to 18 months" (wm_walk recheck note).
- [ ] Hand-to-hand transfer window "6 to 8 months", fingertip pickup "9 to 12
  months", social smile "6 weeks to 3 months", turning to sounds "5 to 9
  months" (recheck notes; check each against CDC/Zubler).

## Tier 4 — the 2026-07-20 artifact families (activities, claims, prompt cards)

Three more artifact families now ship through the same grader gate
(`keel/graders/activities.mjs`, `claims.mjs`, `drc.mjs`, all in the one
selftest). The graders enforce structure, safety lexicon, and honesty rules;
they cannot verify content truth. That's this pass:

- [ ] **Activity sampler** (`artifacts/activities/sampler.v1.json`, 24
  activities): read each for age-appropriateness and safety judgment beyond
  the lexicon (the grader can't know that a specific 9-month-old game is
  miscalibrated). Check each `evidence_note` against your knowledge; they are
  deliberately citation-free summaries, so they must not overstate. D1 check:
  confirm nothing echoes the DML manual's actual content.
- [ ] **Claims library** (`artifacts/claims/claims.v1.json`, 10 claims): the
  big one. Per the pipeline, your grade is the grade. For each claim: pull the
  listed sources, confirm each citation is real and says what the summary
  uses it for, then confirm or adjust both axis grades. The two most
  judgment-heavy grades as drafted: sleep-training (contradicted/majority)
  and pacifiers-speech (insufficient/majority).
- [ ] **Prompt cards** (`artifacts/drc/prompt-cards.v1.json`, 41 cards): quick
  read for CROWD fidelity and tone; confirm no card echoes a real book beyond
  generic scenes.

## Sign-off

- [ ] All Tier 1 floors verified against pulled sources
- [ ] All Tier 2 additions kept, adjusted, or cut
- [ ] All Tier 3 claims verified or reworded
- [ ] `status` flipped in: floor_sources, lmc/floors, lmc/instrument,
      lmc/interpretation, navigator/floors, navigator/trees
- [ ] `node keel/graders/selftest.mjs` green after any edits

Verified by: ____________  Date: ____________
