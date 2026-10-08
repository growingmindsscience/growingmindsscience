# Infant class: written-version corrections (migration 0018)

The written version of each infant lesson (`class_lessons.transcript`) was imported from Mux's
auto-generated captions. The transcriber misheard researchers' names, research terms, and small
words, split some words with stray spaces, and joined sentences with commas. Serve and Return is
now free to read without an account at `/nsc/classes/infant/preview`, so these errors were
public.

Migration `nsc/supabase/migrations/0018_infant_transcript_corrections.sql` replaces all 16
written versions. It has **not** been applied to production.

## How the corrected text was made

Every lesson's audio is ElevenLabs narration in Matthew's cloned voice, generated from the
lesson's `script/script.py` (`~/Desktop/GMS_Classes/Infant/<lesson>/script/`), word for word.
The live videos are the v4 re-record of 2026-10-03, and every script was last edited before that
recording. So the script is exactly what the video says.

Checked before using it:

- `narr.json` (the text sent to the voice) matches `script.py` on 160 of 163 slides. The other 3
  differ only by spoken respellings (`Sroaf` for Sroufe, `bah` for ba, one added comma).
- Aligning each old transcript with its script word by word matches 97 to 99 percent of words in
  every lesson. Every difference is a transcriber error or a number written as digits. No passage
  departs from the script.

The corrected text is the script's narration (Matthew's own words, punctuation, and paragraph
breaks) with three exceptions:

1. **Numbers stay as numerals** wherever the old text showed numerals (`30%`, `1,300`, `18 months`),
   because that is style, not an error. Thousands now always take a comma (`1200` became `1,200`).
   One exception: "Twelve- to fifteen-month-olds" starts a sentence in 4.4, so it stays in words.
2. **The hotline in 1.5 is written for reading**: `1-833-TLC-MAMA`, `postpartum.net`, `988`. The
   script spells these out ("one, eight three three, T L C, mama") so the voice reads them clearly.
   The old text showed the hotline as `1-833-T LC-MAMA`.
3. Paragraph breaks follow the script, one paragraph per narration block.

The stretched spellings in 1.3, "Whooo's got the toes? Yooou've got the toes," come from the
script, where Matthew approved them. Say if the written version should use plain spelling.

## Summary

Counts of word-level changes. "Punctuation, capitals, hyphens" counts words whose spelling stayed
the same but whose punctuation, capital letter, or hyphen changed to match the script (for
example `claim. Ordinary` to `claim: ordinary`, or `four month olds` to `four-month-olds`).

| Lesson | Names | Misheard words | Grammar | Spacing or spelling | Number style | Punctuation, capitals, hyphens |
|---|---|---|---|---|---|---|
| 1.1 Born Ready to Connect | 2 | 5 | 1 | 6 | 3 | 91 |
| 1.2 A Brain Built by Experience | 7 | 7 | 1 | 6 | 3 | 117 |
| 1.3 Serve and Return | 5 | 13 | 4 | 0 | 2 | 150 |
| 1.4 States, Crying, and the Borrowed Nervous System | 6 | 6 | 8 | 5 | 5 | 155 |
| 1.5 Capable and Fragile at Once | 3 | 4 | 6 | 5 | 9 | 163 |
| 2.1 The Cue Vocabulary | 2 | 4 | 4 | 3 | 8 | 101 |
| 2.2 Temperament: Your Baby's Starting Settings | 3 | 8 | 1 | 2 | 4 | 107 |
| 2.3 Feeding as a Conversation | 1 | 13 | 5 | 4 | 3 | 86 |
| 2.4 Sleep Across the First Year | 0 | 2 | 4 | 2 | 9 | 79 |
| 3.1 What Secure Attachment Is, and Isn't | 2 | 8 | 4 | 3 | 16 | 127 |
| 3.2 Many Hands: Partners, Grandparents, and Childcare | 0 | 3 | 4 | 11 | 2 | 56 |
| 3.3 Separation and Stranger Wariness | 1 | 2 | 4 | 5 | 11 | 68 |
| 4.1 Language Before Words | 0 | 10 | 7 | 4 | 4 | 88 |
| 4.2 On the Move | 0 | 5 | 1 | 3 | 2 | 83 |
| 4.3 Play and the Hidden Toy | 0 | 1 | 1 | 2 | 4 | 56 |
| 4.4 Screens, and the Year Ahead | 0 | 4 | 2 | 3 | 6 | 55 |
| **All 16** | **32** | **95** | **57** | **64** | **91** | **1582** |

## Captions (Mux text tracks)

Checked for Serve and Return: the English caption track has the same kinds of errors. It is a
slightly different auto-transcription from the stored text (12 differences), but it still has
"Tronic", "Tronix" (twice), "Patricia Kool's", "coup" (three times), and "Parentees", plus errors of
its own: "parentes" (five times), "BB's lab" for Beebe's, and "and Bigelow's lab" for "Ann
Bigelow's lab". The other 15 lessons' captions come from the same auto-captioning, so expect the
same. This migration does not touch Mux; captions need their own fix (a corrected WebVTT track
per lesson).

## Change tables, by lesson

Each row is one word-level change. Bold on the left is what the old text said; the words before it
are there to find the spot. Number-style changes are listed after each table.

### 1.1 Born Ready to Connect (`born-ready-to-connect`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …1980 study, the researchers **de Casper** | **DeCasper** |
| Name | …researchers de Casper and **Pfe iffer** | **Fifer** |
| Misheard word | …far blurrier than yours. **Find** | **Fine** |
| Misheard word | …Your face at feeding **distances** | **distance is** |
| Misheard word | …own research background is **an** | **in** |
| Misheard word | …cries tended to rise **and** | **in** |
| Misheard word | …idea of borrowing your **column** | **calm** |
| Grammar | …kind of test with **father's** | **fathers'** |
| Spacing or spelling | …native one. They've tuned **into** | **in to** |
| Spacing or spelling | …talk to them now, **you 're** | **you're** |
| Spacing or spelling | …and connect with a **careg iver** | **caregiver,** |
| Spacing or spelling | …Get close. Your baby's **cle arest** | **clearest** |
| Spacing or spelling | …might feel strange to **narr ate** | **narrate** |
| Spacing or spelling | …for life to start. **They 're** | **They're** |

Number style: `four.` to `4.`; `three` to `3,`; `two,` to `2,`.

Punctuation, capitals, hyphens: 91 words.

### 1.2 A Brain Built by Experience (`a-brain-built-by-experience`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …everywhere at once. Peter **Huttonlocker,** | **Huttenlocher,** |
| Name | …developmental neuroscientist named William **Greeno** | **Greenough** |
| Name | …they never hear. Janet **workers** | **Werker** |
| Name | …lives in, and Patricia **Kool's** | **Kuhl's** |
| Name | …want you to remember. **Kool's** | **Kuhl's** |
| Name | …20s The philosopher John **Brewer** | **Bruer** |
| Name | …that enrichment builds brains. **Greeno's** | **Greenough's** |
| Misheard word | …spent decades counting synapses **and** | **in** |
| Misheard word | …fire often also get **coded** | **coated** |
| Misheard word | …evolution built a shortcut, **overproduced** | **overproduce** |
| Misheard word | …just worse at others. **Here's** | **Here is** |
| Misheard word | …babies smarter. When researchers **pulled** | **pooled** |
| Misheard word | …rats raised alone in **bear** | **bare** |
| Misheard word | …rat's ordinary life. The **bear** | **bare** |
| Grammar | …In the first year, **synapse's** | **synapses** |
| Spacing or spelling | …once. Peter Huttonlocker, a **neurolog ist** | **neurologist** |
| Spacing or spelling | …nine months, they mostly **can 't,** | **can't,** |
| Spacing or spelling | …sessions. Those babies held **on to** | **onto** |
| Spacing or spelling | …were missing the experience **expect ant** | **expectant** |
| Spacing or spelling | …ordinary tired family that **isn 't** | **isn't** |
| Spacing or spelling | …not to a Tuesday. **Let 's** | **Let's** |

Number style: `one,` to `1,`; `(nothing)` to `percent`; `three,` to `3,`.

Punctuation, capitals, hyphens: 117 words.

### 1.3 Serve and Return (`serve-and-return`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …ordinary life. Researchers at **Harvard** | **Harvard's** |
| Name | …In the 1970s, Ed **Tronic** | **Tronick** |
| Name | …the real learning is. **Tronix** | **Tronick's** |
| Name | …found each other again. **Tronix** | **Tronick** |
| Name | …2023 study from Patricia **Kool's** | **Kuhl's** |
| Misheard word | …serves a look, a **coup,** | **coo,** |
| Misheard word | …A two month old's **coup.** | **coo.** |
| Misheard word | …they try harder. They **coup,** | **coo,** |
| Misheard word | …cry. A 2009 review **pulled** | **pooled** |
| Misheard word | …baby makes a sound, **and** | **an** |
| Misheard word | …downs. Researchers call it **parenties.** | **parentese.** |
| Misheard word | …speaks to them in **parenties,** | **parentese** |
| Misheard word | …flat grown up voice. **Parenties** | **Parentese** |
| Misheard word | …on their use of **parenties** | **parentese** |
| Misheard word | …dog, that's the dog. **Parentees** | **Parentese** |
| Misheard word | …Crying, sleep, and the **state's** | **states** |
| Grammar | …coup. A four month **old** | **old's** |
| Grammar | …blank face minutes. They **seem** | **seemed** |
| Grammar | …found that parents who **use parenties** | **used parentese** |
| Grammar | …brain activity and her **babies** | **baby's** |
| Script spelling | …you catch yourself saying, **who's** | **"Whooo's** |
| Script spelling | …who's got the toes? **You've** | **Yooou've** |

Number style: `two` to `2`; `four,` to `4,`.

Punctuation, capitals, hyphens: 150 words.

### 1.4 States, Crying, and the Borrowed Nervous System (`states-crying-and-the-borrowed-nervous-system`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …another. The neurologist Heinz **Prechtel** | **Prechtl** |
| Name | …and the pediatrician T. **Barry** | **Berry** |
| Name | …later, looking away. Mary **Rothbard's** | **Rothbart's** |
| Name | …in the body. Sam **Woss's** | **Wass's** |
| Name | …a team led by **Cumi Corota** | **Kumi Kuroda** |
| Name | …cry more. In 1972, **Sylvia** | **Silvia** |
| Misheard word | …Barry Brazelton describe the **state's** | **states** |
| Misheard word | …say. A 2017 review **pulled** | **pooled** |
| Misheard word | …of a high plateau **than** | **then** |
| Misheard word | …the parent's body responded **to,** | **too,** |
| Misheard word | …these tools can shorten **about.** | **a bout.** |
| Misheard word | …that won't stop. So **here's** | **here is** |
| Grammar | …pediatrician T. Barry Brazelton **describe** | **described** |
| Grammar | …grunts, smiles, even whimpers. **Newborn** | **Newborns** |
| Grammar | …responded more strongly, their **baby's** | **babies** |
| Grammar | …wake just as the **parents** | **parent** |
| Grammar | …promises to end your **babies** | **baby's** |
| Grammar | …baby down. Now, sleep. **Newborn** | **Newborns** |
| Grammar | …and your household's rhythm **helps** | **help** |
| Grammar | …to three years. Their **mother's** | **mothers'** |
| Spacing or spelling | …this active state, and **it 's** | **it's** |
| Spacing or spelling | …drowsy, heavy lids, a **gl azed** | **glazed** |
| Spacing or spelling | …wait for full crying, **you 're** | **you're** |
| Spacing or spelling | …crying follows the curve. **Cry ing** | **Crying** |
| Spacing or spelling | …parents bed with no **pill ows,** | **pillows,** |

Number style: `three,` to `3,`; `three` to `3`; `two` to `2`; `five,` to `5,`; `one` to `1`.

Punctuation, capitals, hyphens: 155 words.

### 1.5 Capable and Fragile at Once (`capable-and-fragile-at-once`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …1970s and 80s Carolyn **Roe V.** | **Rovee** |
| Name | …stress hormone cortisol. Megan **Gunner's** | **Gunnar's** |
| Name | …text at 1 833 **T LC** | **TLC** |
| Misheard word | …sing song voice of **parentees** | **parentese** |
| Misheard word | …reduce babies pain responses **and** | **in** |
| Misheard word | …day and night by **caller** | **call or** |
| Misheard word | …the time and that **repairs** | **repair is** |
| Grammar | …days later three month **old** | **olds** |
| Grammar | …three where two month **old** | **olds** |
| Grammar | …suggested. The findings that **survived** | **survive** |
| Grammar | …20th century many doctors **believe** | **believed** |
| Grammar | …system is stress. A **newborns** | **newborn's** |
| Grammar | …new situation a trusted **caregivers** | **caregiver's** |
| Spacing or spelling | …yet. If your baby **borrow s** | **borrows** |
| Spacing or spelling | …Then she tested memory. **B rought** | **Brought** |
| Spacing or spelling | …cause and they hold **on to** | **onto** |
| Spacing or spelling | …the fair summary is **unsett led.** | **unsettled.** |
| Spacing or spelling | …and you get the **super baby** | **superbaby** |

Number style: `one.` to `1.`; `one` to `1,`; `three` to `3,`; `three` to `3`; `four` to `4,`; `two` to `2`; `three` to `3`; `one.` to `1.`; `two,` to `2,`.

Punctuation, capitals, hyphens: 163 words.

### 2.1 The Cue Vocabulary (`the-cue-vocabulary`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …with the nurse scientist **Katherine** | **Kathryn** |
| Name | …detail I love. Roberta **Golankoff** | **Golinkoff** |
| Misheard word | …brightening, a smile, a **coup,** | **coo.** |
| Misheard word | …counted 22 different cues **and** | **in** |
| Misheard word | …Pause. Soften your voice. **Weight.** | **Wait.** |
| Misheard word | …400 mothers, about seven **and** | **in** |
| Grammar | …feeding alone, and the **baby** | **babies** |
| Grammar | …Field measured four month **old's** | **olds'** |
| Grammar | …one and two months, **baby's** | **babies'** |
| Grammar | …months, baby's signals and **mother's** | **mothers'** |
| Spacing or spelling | …want you to hold **on to.** | **onto:** |
| Spacing or spelling | …during lunch in their **high chairs.** | **highchairs.** |
| Spacing or spelling | …Researchers call this mind **minded ness,** | **mindedness:** |

Number style: `two.` to `2.`; `one,` to `1,`; `one,` to `1,`; `one,` to `1,`; `three.` to `3.`; `four` to `4`; `39 ,000` to `39,000`; `four.` to `4.`.

Punctuation, capitals, hyphens: 101 words.

### 2.2 Temperament: Your Baby's Starting Settings (`temperament`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …the work of Mary **Rothbard,** | **Rothbart,** |
| Name | …it shows early. In **Rothbard's** | **Rothbart's** |
| Name | …In the Netherlands, researcher **Dimfna Vandenboom** | **Dymphna van den Boom** |
| Misheard word | …with an idea. The **Q** | **cue** |
| Misheard word | …how easily they settle **in** | **and** |
| Misheard word | …Easy babies, about four **and** | **in** |
| Misheard word | …have spent regular time **and** | **in** |
| Misheard word | …and behavior problems only **weekly.** | **weakly.** |
| Misheard word | …hopeful. A 2016 review **pulled** | **pooled** |
| Misheard word | …too. In one study, **fussy or** | **fussier** |
| Misheard word | …to fix. Get support **and** | **in** |
| Grammar | …in 1956, when the **psychiatrist's** | **psychiatrists** |
| Spacing or spelling | …load too. So if **you 've** | **you've** |
| Spacing or spelling | …with babies whose mothers **didn 't** | **didn't** |

Number style: `one.` to `1.`; `three.` to `3.`; `one,` to `1,`; `three.` to `3.`.

Punctuation, capitals, hyphens: 107 words.

### 2.3 Feeding as a Conversation (`feeding-as-a-conversation`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …at the table. The **dietician Ellen** | **dietitian Ellyn** |
| Misheard word | …baby leads on when **to.** | **too.** |
| Misheard word | …the differences between babies **and** | **in** |
| Misheard word | …the baby. That's where **paste** | **paced** |
| Misheard word | …In a 2024 study, **paste** | **paced** |
| Misheard word | …age nine found the **different** | **difference** |
| Misheard word | …months later, almost two **and** | **in** |
| Misheard word | …end of that food. **As** | **Mess is** |
| Misheard word | …basics are for everyone. **You're babies** | **your baby** |
| Misheard word | …You're babies sitting upright **and** | **an** |
| Misheard word | …and adult watching and **food** | **foods** |
| Misheard word | …between your fingers. No **hole** | **whole** |
| Misheard word | …resisting. With a bottle, **paste** | **pace** |
| Misheard word | …not the milk line. **Solid** | **Solids** |
| Grammar | …England and Wales, parents **describe** | **described** |
| Grammar | …Wales, parents describe their **baby's appet ites** | **babies' appetites** |
| Grammar | …feed started when the **babies** | **baby** |
| Grammar | …42% more when the **adults** | **adult** |
| Grammar | …less. It gives your **baby** | **baby's** |
| Spacing or spelling | …more responsive to their **baby 's** | **baby's** |
| Spacing or spelling | …are modest and mixed. **Respons ive** | **Responsive** |
| Spacing or spelling | …all fine. In New **Zealand 's** | **Zealand's** |
| Spacing or spelling | …done even with food **leftover.** | **left over.** |

Number style: `one` to `1,`; `one,` to `1,`; `four.` to `4.`.

Punctuation, capitals, hyphens: 86 words.

### 2.4 Sleep Across the First Year (`sleep-across-the-first-year`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …stretch of several hours, **except** | **Accept** |
| Misheard word | …than the same hours **and** | **in** |
| Grammar | …in module one, daylight **helped** | **helps** |
| Grammar | …heard of the four **months** | **month** |
| Grammar | …in longer stretches. Their **mother's** | **mothers'** |
| Grammar | …at 12 months, one **film** | **filmed** |
| Spacing or spelling | …babies, sleep tends to **be get** | **beget** |
| Spacing or spelling | …happens most nights. Bath, **pyjamas,** | **pajamas,** |

Number style: `two` to `2,`; `one,` to `1,`; `four,` to `4,`; `one,` to `1,`; `one,` to `1,`; `one,` to `1,`; `five` to `5`; `two.` to `2.`; `three,` to `3,`.

Punctuation, capitals, hyphens: 79 words.

### 3.1 What Secure Attachment Is, and Isn't (`what-secure-attachment-is-and-isn-t`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …the British psychiatrist John **Bolby.** | **Bowlby.** |
| Name | …a familiar trusted person. **Bolby** | **Bowlby** |
| Misheard word | …a relationship, not a **trade** | **trait** |
| Misheard word | …away. In 2023, researchers **pulled** | **pooled** |
| Misheard word | …disorganized with more insecurity **and** | **in** |
| Misheard word | …12 months, about three **and** | **in** |
| Misheard word | …comes from reviews that **pulled** | **pooled** |
| Misheard word | …shrank to small correlations. **An** | **And** |
| Misheard word | …adoption. A review that **pulled** | **pooled** |
| Misheard word | …pattern, not the moment. **Mist** | **Missed** |
| Grammar | …the family, support the **parents** | **parent's** |
| Grammar | …did improve sensitivity and **improve** | **improved** |
| Grammar | …amount. The programs that **change** | **changed** |
| Grammar | …background into account, the **association** | **associations** |
| Spacing or spelling | …as if nothing happened. **Bab ies** | **Babies** |
| Spacing or spelling | …same time. And babies **class ed** | **classed** |
| Spacing or spelling | …hard days, and short **tem pers** | **tempers** |

Number style: `three.` to `3.`; `one` to `1`; `three` to `3,`; `four.` to `4.`; `two.` to `2.`; `one.` to `1.`; `two,` to `2,`; `two,` to `2,`; `two,` to `2,`; `two,` to `2,`; `one,` to `1,`; `four,` to `4:`; `one,` to `1,`; `one,` to `1,`; `three,` to `3,`; `four,` to `4,`.

Punctuation, capitals, hyphens: 127 words.

### 3.2 Many Hands: Partners, Grandparents, and Childcare (`many-hands`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …A 2022 analysis that **pulled** | **pooled** |
| Misheard word | …9,000 families, about four **and** | **in** |
| Misheard word | …Separation distress and stranger **weariness,** | **wariness,** |
| Grammar | …a large share of **father's** | **fathers'** |
| Grammar | …on its own, whether **it's** | **its** |
| Grammar | …study of 15 month **old** | **olds** |
| Grammar | …under about 14 months **seem** | **seemed** |
| Spacing or spelling | …a generation ago. Now **child care.** | **childcare.** |
| Spacing or spelling | …research here is a **US** | **U.S.** |
| Spacing or spelling | …attachment. At 15 months, **child care** | **childcare** |
| Spacing or spelling | …than anything about their **child care.** | **childcare.** |
| Spacing or spelling | …care. That doesn't mean **child care** | **childcare** |
| Spacing or spelling | …and small groups. The **US** | **U.S.** |
| Spacing or spelling | …a center, a family **child care** | **childcare** |
| Spacing or spelling | …15 month old starting **child care** | **childcare** |
| Spacing or spelling | …team. In the largest **child care** | **childcare** |
| Spacing or spelling | …largest child care study, **child care** | **childcare** |
| Spacing or spelling | …the same time as **child care** | **childcare** |

Number style: `one,` to `1,`; `four,` to `4,`.

Punctuation, capitals, hyphens: 56 words.

### 3.3 Separation and Stranger Wariness (`separation-and-stranger-wariness`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Name | …research, the psychologist Alan **Stroff** | **Sroufe** |
| Misheard word | …whose mothers pushed them **towards** | **toward** |
| Misheard word | …and compare and because **they** | **they've** |
| Grammar | …behaviors, like looking away, **helped** | **help** |
| Grammar | …parent is nearby all **changed** | **change** |
| Grammar | …and their mothers, the **mother** | **mothers** |
| Grammar | …a stranger after their **mother** | **mothers** |
| Spacing or spelling | …a half. Babies in **day care** | **daycare** |
| Spacing or spelling | …something similar. Repeated, predictable, **goodby** | **goodbye** |
| Spacing or spelling | …likely reason sneaking out **back fires** | **backfires** |
| Spacing or spelling | …bridge. Greet new people **warm ly** | **warmly** |
| Spacing or spelling | …decide when to reach. **Don 't** | **Don't** |

Number style: `one,` to `1,`; `five,` to `5,`; `four,` to `4,`; `two.` to `2.`; `one,` to `1,`; `one` to `1`; `two,` to `2,`; `two,` to `2,`; `1200` to `1,200`; `three.` to `3.`; `four,` to `4,`.

Punctuation, capitals, hyphens: 68 words.

### 4.1 Language Before Words (`language-before-words`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …comes a play stage. **Squeeles,** | **squeals,** |
| Misheard word | …ba da ma na **na** | **(removed)** |
| Misheard word | …or on its own. **Squeeles,** | **Squeals,** |
| Misheard word | …a hearing check. A **past** | **passed** |
| Misheard word | …honest note, some studies **and** | **in** |
| Misheard word | …If your baby says **bot** | **ba** |
| Misheard word | …the parent was looking **to** | **too.** |
| Misheard word | …for real syllables like **Baba Baa** | **bababa,** |
| Misheard word | …you. Babbling grows from **coups** | **coos** |
| Misheard word | …to real syllables and **Baba Baa** | **bababa** |
| Grammar | …mothers of eight month **old** | **olds** |
| Grammar | …to respond to their **baby's** | **babies'** |
| Grammar | …and a half month **old,** | **olds,** |
| Grammar | …thirteen languages, caregivers answered **baby's** | **babies'** |
| Grammar | …little later, and understanding **improved** | **improves** |
| Grammar | …word. On the parent **checklist** | **checklists** |
| Grammar | …part of something researchers **called** | **call** |
| Spacing or spelling | …like timing, often repeated. **Baba ba, da da da, na na na.** | **Bababa. Dadada. Nanana.** |
| Spacing or spelling | …for. Real syllables, like **baba ba,** | **bababa,** |
| Spacing or spelling | …So if your baby **isn 't** | **isn't** |
| Spacing or spelling | …changes everything around them. **I 'll** | **I'll** |

Number style: `one,` to `1,`; `three,` to `3,`; `two,` to `2,`; `one` to `1,`.

Punctuation, capitals, hyphens: 88 words.

### 4.2 On the Move (`on-the-move`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …milestones as wide windows, **wide** | **why** |
| Misheard word | …all healthy babies, 99 **and** | **in** |
| Misheard word | …in 10 involved the **header** | **head or** |
| Misheard word | …American Academy of Pediatrics **is** | **has** |
| Misheard word | …a day, keep stretches **and** | **in** |
| Grammar | …start in the first **day's** | **days** |
| Spacing or spelling | …four came from falling **downstairs** | **down stairs** |
| Spacing or spelling | …means two practical things **baby proof** | **babyproof** |
| Spacing or spelling | …level and answer, and **baby proof** | **babyproof** |

Number style: `one,` to `1,`; `four,` to `4,`.

Punctuation, capitals, hyphens: 83 words.

### 4.3 Play and the Hidden Toy (`play-and-the-hidden-toy`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …So, in 2024, researchers **pulled** | **pooled** |
| Grammar | …a few seconds still **seem** | **seemed** |
| Spacing or spelling | …and reveal. Babies tune **into** | **in to** |
| Spacing or spelling | …month olds were told **part way** | **partway** |

Number style: `1900` to `1,900`; `three,` to `3,`; `three.` to `3:`; `one,` to `1,`.

Punctuation, capitals, hyphens: 56 words.

### 4.4 Screens, and the Year Ahead (`screens-and-the-year-ahead`)

| Type | Transcript said (with the words before it) | Now reads |
|---|---|---|
| Misheard word | …off. A large review **pulled** | **pooled** |
| Misheard word | …communication and problem solving **it too.** | **at two.** |
| Misheard word | …looks different. When researchers **pulled** | **pooled** |
| Misheard word | …about it the way **you** | **you'd** |
| Grammar | …they grew. The authors **caution** | **cautioned** |
| Grammar | …12 to 25 month **old** | **olds** |
| Spacing or spelling | …years old, more daily **touch screen** | **touchscreen** |
| Spacing or spelling | …or watching her in **pre recorded** | **prerecorded** |
| Spacing or spelling | …to. Keep it ordinary **Every day** | **Everyday** |

Number style: `one,` to `1,`; `12` to `Twelve`; `15` to `fifteen`; `two.` to `2.`; `one` to `1`; `one,` to `1,`.

Punctuation, capitals, hyphens: 55 words.

