# Milestone Navigator — complete copy inventory (generated)

Generated from `keel/artifacts/navigator/trees.v1.json` by
`keel/scripts/copy-inventory.mjs`. Regenerate after any artifact edit;
do not edit by hand. Static page copy (hero, disclaimers, how-it-works)
lives in `tools/milestone-navigator.html` and is reviewed there.

Artifact version: 1.0.0 · status: drafted_pending_matthew_verification

## Standing invitation (appears on every typical-range result)

> If something still feels off to you, bring it up with your pediatrician anyway. Your sense of your child is real information, and raising it is never a waste of anyone's time.

## Talking (talking)

Entry description: "Words, speech sounds, and being understood"

### Questions

**Has your child lost words or communication skills they used to have?** (tk_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to say words and stopped. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost words or skills they used to have"

**Does your child babble with consonant sounds?** (tk_babble; asked 6m to 16m; answers: Yes / Sometimes / Not yet)
- Help text: Strings like 'ba-ba', 'da-da', 'ma-ma', not just cooing vowel sounds.
- Flag on "not_yet" (from 12m) → **discuss** [no floor: judgment flag] — recap label: "Not yet babbling with consonant sounds"
- Recheck note (on "not_yet" before 12m): Consonant babbling usually appears between 6 and 10 months. If it hasn't arrived by 12 months, raise it, and ask about hearing at the same time.

**Does your child say any single words?** (tk_words; asked 10m+; answers: Yes / Sometimes / Not yet)
- Help text: Words in any language your family speaks. Consistent word approximations count, like 'baba' for bottle. Sounds that don't stand for anything yet do not.
- Flag on "not_yet" (from 16m) → **discuss** [floor: no_words_16m] — recap label: "No single words yet"
- Recheck note (on "not_yet" before 16m): Most children say a first word between 10 and 15 months. If there are no words by 16 months, that's the point to raise it.

**Does your child put two words together on their own?** (tk_combines; asked 15m+; answers: Yes / Sometimes / Not yet)
- Help text: Their own combinations, like 'more milk' or 'daddy go'. Memorized chunks used as one unit, like 'all done' or 'thank you', do not count here.
- Flag on "not_yet" (from 24m) → **discuss** [floor: no_two_word_phrases_24m] — recap label: "No two-word combinations of their own yet"
- Recheck note (on "not_yet" before 24m): Two-word combinations usually appear between 18 and 24 months, often in a burst once a child has around 50 single words. If there are none by 24 months, raise it.

**How much of your child's speech can an unfamiliar adult understand?** (tk_clarity; asked 30m+; answers: Most of it / About half / Less than half)
- Help text: Not you, someone who doesn't know your child, like a new babysitter or a stranger at the park. You will understand far more than they do; that's normal.
- Flag on "less_than_half" (from 36m) → **discuss** [floor: stranger_intelligibility_36m] — recap label: "Strangers understand less than half of their speech"
- Recheck note (on "less_than_half" before 36m): Clarity climbs steeply between 2 and 4. By age 3, unfamiliar adults should understand at least half. If it's still below half at 3, raise it.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for talking at this age. Speech has a wide normal range, and children move through it at genuinely different speeds without it predicting much of anything.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. That is not a diagnosis, and late talkers often catch up. It means your child has earned a proper look, and early conversations open options that waiting quietly closes.
1. Make an appointment rather than waiting for the next routine well visit, and bring the summary below.
2. Ask directly: 'Would a hearing test and a speech-language evaluation make sense?' Hearing is always checked first for speech concerns, and both are painless, standard requests.
3. Ask about early intervention. In most US states, children under 3 can be evaluated at no cost, without a diagnosis and without waiting for a specialist.
4. In the meantime, respond to every word attempt like it landed, and add one word back ('dog' becomes 'big dog'). That's the highest-value practice there is.
- Call script prefix: "I want to talk about my child's talking. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of words or skills is the one observation where the guidance is unambiguous at any age: it deserves a prompt conversation, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'. Those words reliably get the right response.
2. Write down what was lost and roughly when you last saw it. That timeline is the most useful thing you can bring.
3. Ask for a developmental evaluation and a hearing test in the same breath; regression conversations should start both.
- Call script prefix: "My child has lost skills they used to have. Specifically:" (followed by the recap labels of triggered flags)

## Understanding (understanding)

Entry description: "Responding to their name, words, and directions"

### Questions

**Has your child lost understanding or responses they used to have?** (un_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to respond to their name or follow simple words and no longer do. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost understanding or responses they used to have"

**Does your child respond to their name?** (un_name; asked 9m+; answers: Yes / Sometimes / Not yet)
- Help text: When you say their name from behind or beside them, without touching them, do they look or turn toward you most of the time?
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_response_to_name_12m] — recap label: "Not yet responding to their name"
- Recheck note (on "not_yet" before 12m): Name response usually becomes reliable between 9 and 12 months. If it isn't there by 12 months, raise it, and ask about hearing at the same time.

**When you point at something, does your child look at it?** (un_point; asked 12m+; answers: Yes / Sometimes / Not yet)
- Help text: At the thing you're pointing at, not just at your finger.
- Flag on "not_yet" (from 18m) → **discuss** [floor: no_point_following_18m] — recap label: "Not yet looking where you point"
- Recheck note (on "not_yet" before 18m): Following a point usually settles in between 12 and 18 months. If it hasn't by 18 months, raise it.

**Does your child follow a simple one-step direction?** (un_onestep; asked 14m+; answers: Yes / Sometimes / Not yet)
- Help text: Something like 'bring me the ball' or 'sit down', said in words alone, without pointing or gesturing at the same time.
- Flag on "not_yet" (from 24m) → **discuss** [floor: no_one_step_directions_24m] — recap label: "Not yet following simple one-step directions"
- Recheck note (on "not_yet" before 24m): One-step directions usually land between 14 and 24 months. If they're still not landing at 24 months, raise it.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for understanding at this age. Receptive language, what a child takes in, usually runs well ahead of what they can say, and what you described fits that typical picture.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. Understanding concerns are worth taking at least as seriously as talking concerns, and they run through two checkable channels: hearing, and language itself. Your pediatrician can start on both at one visit.
1. Make an appointment and bring the summary below.
2. Ask for a hearing test first. Understanding concerns are hearing questions until hearing is checked, and a passed newborn screen does not settle it, because that was a point-in-time result.
3. Ask whether a speech-language evaluation makes sense; receptive language is exactly what those evaluations are built to look at.
4. Ask about early intervention. Under 3, evaluation is available at no cost in most US states.
- Call script prefix: "I want to talk about how my child understands language. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of understanding or responses a child used to have deserves a prompt conversation at any age, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'.
2. Write down what changed and roughly when. The timeline matters more than a perfect description.
3. Ask for a developmental evaluation and a hearing test together.
- Call script prefix: "My child has lost understanding they used to have. Specifically:" (followed by the recap labels of triggered flags)

## Walking and movement (walking_movement)

Entry description: "Sitting, standing, walking, and how they move"

### Questions

**Has your child lost movement skills they used to have?** (wm_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to sit, crawl, or walk and no longer do, or they've become noticeably clumsier at things they'd mastered. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost movement skills they used to have"

**Does your child use one side of their body noticeably less than the other?** (wm_asym; always asked; answers: Yes / No)
- Help text: One arm or leg that's weaker, stiffer, or used much less; movements that look persistently lopsided; dragging one side when crawling.
- Flag on "yes" (any age) → **priority_discuss** [floor: asymmetry_any_age] — recap label: "Uses one side of the body noticeably less than the other"

**Does your baby strongly prefer one hand?** (wm_hand; asked 0m to 12m; answers: Yes / No)
- Help text: Before 12 months, babies usually use both hands about equally. A strong, consistent preference this early is the unusual thing here, because it can mean the other side is working harder than it should have to.
- Flag on "yes" (before 12m) → **discuss** [floor: early_hand_preference_12m] — recap label: "Strong hand preference before 12 months"

**Does your child sit without support?** (wm_sit; asked 6m to 18m; answers: Yes / Sometimes / Not yet)
- Help text: Sitting on the floor without leaning on hands, a pillow, or you, steadily enough to play.
- Flag on "not_yet" (from 9m) → **discuss** [floor: not_sitting_9m] — recap label: "Not yet sitting without support"
- Recheck note (on "not_yet" before 9m): Independent sitting usually arrives between 6 and 9 months. If it isn't there by 9 months, raise it.

**When you hold your child upright, do they bear weight on their legs?** (wm_weight; asked 8m to 20m; answers: Yes / Sometimes / Not yet)
- Help text: Legs push down and take some weight when you support them standing, rather than staying folded or floppy.
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_weight_bearing_12m] — recap label: "Not yet bearing weight on their legs when supported"
- Recheck note (on "not_yet" before 12m): Weight-bearing with support usually appears well before the first birthday. If it isn't there by 12 months, raise it.

**Does your child walk on their own?** (wm_walk; asked 12m+; answers: Yes / Sometimes / Not yet)
- Help text: Several independent steps without holding on. Cruising along furniture doesn't count yet. If your child was born more than 3 weeks early, we're using corrected age, counted from the due date, which is the standard way to look at this line.
- Flag on "not_yet" (from 18m) → **discuss** [floor: not_walking_18m] — recap label: "Not yet walking independently"
- Recheck note (on "not_yet" before 18m): Independent walking has one of the widest normal windows there is, roughly 9 to 18 months. If it hasn't arrived by 18 months of corrected age, raise it.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for movement at this age. Motor milestones have some of the widest normal windows in all of development, and the order children do things in varies more than most parents expect.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. Motor evaluations are concrete and unintimidating: a clinician watches your child move, checks strength and tone, and tells you what they see. Early conversations here matter because motor support works best when it starts early.
1. Make an appointment rather than waiting for the next routine well visit, and bring the summary below.
2. Describe what you see specifically: what your child does, what they don't do yet, and anything that looks effortful or uneven.
3. Ask whether a physical therapy evaluation makes sense. Under 3, early intervention can evaluate at no cost in most US states.
4. If your child was born early, say so when you call. Corrected age changes the math, and your pediatrician will want it.
- Call script prefix: "I want to talk about my child's movement. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> What you described, loss of motor skills or one side of the body working differently than the other, is the kind of observation pediatricians want to hear about promptly, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. These observations are specific enough that a clinician can act on them quickly.
1. When you call, name the observation plainly: 'one side seems weaker' or 'skills they had are gone'. Those specifics move quickly.
2. Note when you first noticed it and whether it's changing.
3. Ask for a neuromotor evaluation. If your pediatrician agrees, this often means a referral, and starting that clock early is the win.
- Call script prefix: "I've noticed something about my child's movement that I understand shouldn't wait. Specifically:" (followed by the recap labels of triggered flags)

## Hands and fine motor (hands_fine_motor)

Entry description: "Reaching, grasping, and using their hands"

### Questions

**Has your child lost hand skills they used to have?** (hf_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to grab, hold, or feed themselves and no longer do. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost hand skills they used to have"

**Does your baby reach for things?** (hf_reach; asked 3m to 12m; answers: Yes / Sometimes / Not yet)
- Help text: Reaching out for a toy, your face, or your food, with either hand.
- Flag on "not_yet" (from 6m) → **discuss** [floor: not_reaching_6m] — recap label: "Not yet reaching for objects"
- Recheck note (on "not_yet" before 6m): Reaching usually arrives between 3 and 5 months. If it isn't there by 6 months, raise it.

**Are your baby's hands mostly closed in fists?** (hf_fist; asked 3m to 14m; answers: Yes / No)
- Help text: Most of the day, hands held tightly closed rather than open and exploring. Newborn fisting is normal; it usually relaxes by around 4 months.
- Flag on "yes" (from 6m) → **discuss** [floor: persistent_fisting_6m] — recap label: "Hands still mostly fisted"
- Recheck note (on "yes" before 6m): Fisting usually relaxes by around 4 months. If hands are still mostly closed at 6 months, raise it.

**Does your child pass things from one hand to the other?** (hf_transfer; asked 7m to 17m; answers: Yes / Sometimes / Not yet)
- Help text: Picking something up with one hand and moving it to the other.
- Flag on "not_yet" (from 9m) → **discuss** [floor: no_hand_transfer_9m] — recap label: "Not yet passing objects hand to hand"
- Recheck note (on "not_yet" before 9m): Hand-to-hand transfer usually arrives between 6 and 8 months. If it isn't there by 9 months, raise it.

**Does your child pick up small pieces of food between thumb and finger?** (hf_pincer; asked 10m to 30m; answers: Yes / Sometimes / Not yet)
- Help text: Small bites like a puff or a pea, picked up with the fingertips rather than raked in with the whole hand.
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_finger_thumb_grasp_12m] — recap label: "Not yet picking up small food between thumb and finger"
- Recheck note (on "not_yet" before 12m): This fingertip pickup usually arrives between 9 and 12 months. If it isn't there by 12 months, raise it.

**Does your child use both hands together in everyday play?** (hf_bothhands; asked 18m+; answers: Yes / Sometimes / Not yet)
- Help text: Stacking, scribbling, feeding themselves, holding a bowl with one hand while digging with the other.
- Flag on "not_yet" (from 18m) → **discuss** [no floor: judgment flag] — recap label: "Not yet using both hands together in everyday play"

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for hand skills at this age. Fine motor development is steady but not showy, and there's real variation in when each piece arrives.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. Hand-skill evaluations are gentle and concrete, mostly structured play while a trained eye watches how the hands work.
1. Make an appointment and bring the summary below.
2. Mention whether both hands are affected equally. That one detail meaningfully shapes what a clinician looks for.
3. Ask whether an occupational or physical therapy evaluation makes sense. Under 3, early intervention can evaluate at no cost in most US states.
- Call script prefix: "I want to talk about how my child uses their hands. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of hand skills a child used to have deserves a prompt conversation at any age, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'.
2. Write down what was lost and roughly when you last saw it.
3. Ask for a developmental evaluation, and mention if one hand is affected more than the other.
- Call script prefix: "My child has lost hand skills they used to have. Specifically:" (followed by the recap labels of triggered flags)

## Play (play)

Entry description: "Social games, pretend play, and how they play"

### Questions

**Has your child lost play or social skills they used to have?** (pl_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to play peekaboo or pretend and stopped. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost play or social skills they used to have"

**Does your child play back-and-forth games with you?** (pl_social; asked 8m to 30m; answers: Yes / Sometimes / Not yet)
- Help text: Peekaboo, pat-a-cake, chase-and-catch, handing things back and forth. Any game where you take turns and they want another round.
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_social_games_12m] — recap label: "Not yet playing back-and-forth social games"
- Recheck note (on "not_yet" before 12m): Back-and-forth games usually take off between 8 and 12 months. If they haven't by 12 months, raise it.

**Does your child do simple pretend play?** (pl_pretend; asked 15m+; answers: Yes / Sometimes / Not yet)
- Help text: Feeding a doll or stuffed animal, holding a phone to their ear, stirring an empty pot. Simple counts.
- Flag on "not_yet" (from 30m) → **discuss** [floor: no_pretend_play_30m] — recap label: "No simple pretend play yet"
- Recheck note (on "not_yet" before 30m): Simple pretend usually appears between 18 and 30 months. If there's none by 30 months, raise it.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for play at this age. Play styles differ enormously between children, and quiet, focused play is just as typical as loud, social play.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. Play is how young children show us their social communication, so this conversation usually looks at the bigger picture: how your child connects, shares attention, and communicates.
1. Make an appointment and bring the summary below.
2. Describe what play actually looks like at home: favorite games, what your child does with toys, and how they involve you or don't.
3. Ask whether a developmental screening makes sense at this visit. It's a short, standard set of questions, not a diagnosis.
4. In the meantime, join your child's play on their terms, follow their lead, and build tiny back-and-forth moments inside whatever they already love.
- Call script prefix: "I want to talk about how my child plays. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of play or social skills a child used to have deserves a prompt conversation at any age, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'.
2. Write down what changed, roughly when, and whether anything else changed around the same time.
3. Ask for a developmental evaluation.
- Call script prefix: "My child has lost play or social skills they used to have. Specifically:" (followed by the recap labels of triggered flags)

## Social connection (social_eye_contact)

Entry description: "Smiling, eye contact, and sharing attention"

### Questions

**Has your child lost social skills they used to have?** (se_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to make eye contact, smile at people, or wave and no longer do. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost social skills they used to have"

**Does your baby smile back at people?** (se_smile; asked 2m to 10m; answers: Yes / Sometimes / Not yet)
- Help text: A real social smile in response to your face or voice, not just a sleepy reflex smile.
- Flag on "not_yet" (from 4m) → **discuss** [floor: no_social_smile_4m] — recap label: "Not yet smiling back at people"
- Recheck note (on "not_yet" before 4m): Social smiles usually appear between 6 weeks and 3 months. If they haven't by 4 months, raise it.

**Does your child look at your face to share enjoyment?** (se_share; asked 9m+; answers: Yes / Sometimes / Not yet)
- Help text: When something is funny or exciting, do they look at you as if to say 'did you see that?'
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_shared_enjoyment_12m] — recap label: "Not yet looking to share enjoyment"
- Recheck note (on "not_yet" before 12m): Sharing enjoyment through eye contact usually builds across 9 to 12 months. If it isn't there by 12 months, raise it.

**Does your child point to show you something interesting?** (se_point; asked 10m+; answers: Yes / Sometimes / Not yet)
- Help text: This is different from pointing to ask for something. Here the point means 'look at that!', just to share it, like pointing at a dog or a plane.
- Flag on "not_yet" (from 15m) → **discuss** [floor: no_pointing_to_show_15m] — recap label: "Not yet pointing to show you things"
- Recheck note (on "not_yet" before 15m): Pointing to share usually appears between 12 and 15 months. If it hasn't by 15 months, raise it.

**Does your child respond to their name?** (se_name; asked 9m+; answers: Yes / Sometimes / Not yet)
- Help text: When you say their name from behind or beside them, without touching them, do they look or turn toward you most of the time?
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_response_to_name_12m] — recap label: "Not yet responding to their name"
- Recheck note (on "not_yet" before 12m): Name response usually becomes reliable between 9 and 12 months. If it isn't there by 12 months, raise it, and ask about hearing at the same time.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the research-backed lines for social connection at this age. Children vary a great deal in how outwardly social they are, and a reserved temperament is not a warning sign.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> Something you described has reached the point where the research says to bring it up. These particular observations are about shared attention, the thread that connects looking, pointing, and responding, and pediatricians take them seriously precisely because noticing them early is so useful. Hearing is part of this conversation too, since several of these signals run through it.
1. Make an appointment rather than waiting for the next routine well visit, and bring the summary below.
2. Ask for a hearing test alongside the developmental conversation; name response in particular runs through hearing.
3. Ask whether a standardized developmental screening makes sense at this visit. It's a short questionnaire, and it's the standard next step for exactly these observations.
4. Ask about early intervention. Under 3, evaluation is available at no cost in most US states, without needing any diagnosis first.
- Call script prefix: "I want to talk about how my child connects with people. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of social skills a child used to have, like eye contact, smiling at people, or waving, deserves a prompt conversation at any age, ideally within a week or two. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'.
2. Write down what changed and roughly when you last saw the old pattern.
3. Ask for a developmental evaluation and a hearing test together.
- Call script prefix: "My child has lost social skills they used to have. Specifically:" (followed by the recap labels of triggered flags)

## Hearing and responding (hearing_responding)

Entry description: "Responding to sounds, voices, and their name"

### Questions

**Has your child lost responses to sound they used to have?** (hr_skill_loss; always asked; answers: Yes / No)
- Help text: For example, they used to startle, turn to voices, or respond to their name and no longer do. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_any_domain] — recap label: "Lost responses to sound they used to have"

**Do you have a feeling that your child doesn't hear well?** (hr_concern; always asked; answers: Yes / No)
- Help text: Any nagging sense counts: needing to be very loud, no reaction to sounds that should register, or just something you can't quite name.
- Flag on "yes" (any age) → **discuss** [floor: hearing_concern_any_age] — recap label: "You have a concern about your child's hearing"

**Does your child respond to loud sounds?** (hr_loud; always asked; answers: Yes / Sometimes / Not yet)
- Help text: A startle, a blink, turning, going still, or crying when something loud happens nearby.
- Flag on "not_yet" (any age) → **priority_discuss** [floor: no_sound_response_any_age] — recap label: "Not responding to loud sounds"

**Does your child turn toward sounds and voices?** (hr_turn; asked 5m+; answers: Yes / Sometimes / Not yet)
- Help text: Turning their head or eyes to find where a voice or interesting sound came from.
- Flag on "not_yet" (from 9m) → **discuss** [floor: no_sound_localization_9m] — recap label: "Not yet turning toward sounds or voices"
- Recheck note (on "not_yet" before 9m): Turning toward sounds usually settles in between 5 and 9 months. If it isn't there by 9 months, raise it.

**Does your child respond to their name?** (hr_name; asked 9m+; answers: Yes / Sometimes / Not yet)
- Help text: When you say their name from behind or beside them, without touching them, do they look or turn toward you most of the time?
- Flag on "not_yet" (from 12m) → **discuss** [floor: no_response_to_name_12m] — recap label: "Not yet responding to their name"
- Recheck note (on "not_yet" before 12m): Name response usually becomes reliable between 9 and 12 months. If it isn't there by 12 months, raise it.

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses any of the lines for hearing and responding at this age. One thing worth knowing for the road: hearing can change at any point in childhood, after ear infections, for instance, so this is a door you can come back through any time something shifts.
> (followed by the standing invitation above)

**discuss** — "Worth a hearing check, starting with audiology"

> Hearing is the one area where the guidance is different from everywhere else: a caregiver's concern about hearing is, by itself, reason enough for a hearing test, at any age, full stop. There is no watch-and-wait for hearing. The test is painless, works at any age including newborns, and settles the question properly either way.
1. Ask your pediatrician for a referral to pediatric audiology, or contact an audiology clinic directly; in many places you can self-refer for a hearing test.
2. Don't let a passed newborn hearing screen close the question. That was a point-in-time result, and it does not rule out hearing changes since.
3. Mention recent ear infections or congestion when you call; fluid in the middle ear is a common, treatable cause of muffled hearing.
4. If hearing comes back fine, bring the rest of this summary back to your pediatrician, because the same observations then become a developmental conversation.
- Call script prefix: "I have a concern about my child's hearing and I'd like a hearing test. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician soon and ask about hearing first"

> What you described, no response to loud sounds or losing responses your child used to have, deserves a prompt call, ideally this week. Lead with hearing: ask for an urgent audiology referral. A passed newborn hearing screen does not rule this out, because that was a point-in-time test and hearing can change after it. Prompt does not mean emergency; it means hearing is too foundational to language to leave unchecked.
1. Call your pediatrician and say exactly what you observed: 'my child doesn't respond to loud sounds' or 'responses they used to have are gone'.
2. Ask for a pediatric audiology referral now rather than after a wait-and-see period. For hearing, there is no wait-and-see.
3. Write down what sounds do and don't get a response at home; audiologists use exactly that information.
- Call script prefix: "My child is not responding to sound the way they should. I'd like a hearing evaluation. Specifically:" (followed by the recap labels of triggered flags)

## Behavior and regulation (behavior_regulation)

Entry description: "Big reactions, soothing, and self-injury"

### Questions

**Has your child lost skills they used to have?** (br_skill_loss; always asked; answers: Yes / No)
- Help text: In any area: words, play, social responses, self-care, movement. Any real loss counts, at any age.
- Flag on "yes" (any age) → **priority_discuss** [floor: skill_loss_behavior] — recap label: "Lost skills they used to have"

**Does your child repeatedly hurt themselves?** (br_self_injury; always asked; answers: Yes / No)
- Help text: Head banging beyond a brief tantrum moment, biting themselves hard enough to leave marks, or similar, as a repeated pattern rather than a one-off.
- Flag on "yes" (any age) → **discuss** [floor: repeated_self_injury] — recap label: "Repeated self-injury"

**Is your baby extremely hard to soothe, most days?** (br_soothe; asked 0m to 12m; answers: Yes / No)
- Help text: Long stretches of inconsolable crying most days, even with feeding, sleep, comfort, and health accounted for. All babies have hard days; this asks about most days.
- Flag on "yes" (any age) → **discuss** [no floor: judgment flag] — recap label: "Extremely hard to soothe on most days"

**Do the hard moments feel much bigger than other children's the same age?** (br_intensity; asked 12m+; answers: Yes / No)
- Help text: Much longer, much more intense, or much more frequent than what you see in age-mates, on most days, not just during a rough patch or a big transition.
- Flag on "yes" (any age) → **discuss** [no floor: judgment flag] — recap label: "Hard moments much bigger, longer, or more frequent than age-mates', most days"

**Is family life being organized around avoiding these moments?** (br_impact; asked 12m+; answers: Yes / No)
- Help text: Regularly skipping places or plans, walking on eggshells, or shaping the whole day to prevent a blow-up.
- Flag on "yes" (any age) → **discuss** [no floor: judgment flag] — recap label: "Family life is being organized around avoiding hard moments"

### Results

**typical_range** — "In the typical range right now"

> Nothing you described crosses the lines that are well established for behavior at this age. Worth saying plainly: big feelings, meltdowns, and limit-testing are developmentally expected in the early years, and hard days are not evidence that something is wrong. This is also the area where published red lines are scarcest, so we deliberately don't invent precise cutoffs the research doesn't support.
> (followed by the standing invitation above)

**discuss** — "Worth a conversation with your pediatrician"

> What you described is worth bringing up, and not because it means something is wrong with your child. Behavior is where children show us how regulation is developing, and patterns that are unusually intense, or that are reshaping family life, deserve real support rather than white-knuckling. Pediatricians have these conversations constantly.
1. Make an appointment and bring the summary below. Describing the pattern, how often, how long, what sets it off, what helps, is more useful than any label.
2. If self-injury is part of the picture, say so specifically when you call.
3. Ask what support looks like: sometimes it's a developmental screening, sometimes parent coaching approaches with strong evidence behind them, sometimes just a plan and a follow-up.
4. In the meantime, our free tools on meltdowns, limits, and co-regulation are built for exactly these weeks.
- Call script prefix: "I want to talk about my child's behavior and regulation. Specifically:" (followed by the recap labels of triggered flags)

**priority_discuss** — "Call your pediatrician and ask for an appointment soon"

> Loss of skills a child used to have deserves a prompt conversation at any age, ideally within a week or two, whatever else is going on with behavior. Soon does not mean emergency, and it does not mean a diagnosis. It means this observation is too useful to sit on.
1. When you call, use the words 'my child has lost skills they used to have'.
2. Write down what was lost and roughly when, plus the behavior pattern you came here about; bring both to the same visit.
3. Ask for a developmental evaluation.
- Call script prefix: "My child has lost skills they used to have. Specifically:" (followed by the recap labels of triggered flags)

