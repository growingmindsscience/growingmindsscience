# Preschool class: written versions from the scripts (migration 0019)

The written version of each preschool lesson (`class_lessons.transcript`) was imported from Mux's auto-generated captions. Migration `nsc/supabase/migrations/0019_preschool_transcripts_from_scripts.sql` replaces all 15 with the narration from each lesson's `script/script.py` (`~/Desktop/GMS_Classes/Preschool/<lesson>/script/`), the same way migration 0018 fixed the infant class.

## Checks before using the scripts

- `narr.json` (the text sent to the voice) is identical to `script.py` on every slide of all 15 lessons.
- Aligning each old transcript with its script word by word matches 95 to 99 percent of words in every lesson. Every difference is a transcriber error or a number written as digits; no difference is longer than a few words, so no passage departs from the script.

## Style

1. Text and punctuation are the script's. One paragraph per narration block.
2. Numbers of 10 and above become numerals wherever the old text showed numerals (sample sizes, ages like `at 15`, years, decades like `1960s` and `30s`, `15%`). They are converted from the script's words, not copied from the old text, because the transcriber merged numbers with hyphenated ages (`554-year-olds` for `550 four-year-olds`).
3. Numbers below 10, `nine in ten`, and hyphenated ages (`four-year-olds`, `eighteen-month-olds`) stay in words, as in the script. The old text mixed styles here (`3-4-year-olds` in 3.2, words elsewhere).

## Captions

This migration does not touch Mux. The English caption tracks still have the transcriber's errors and need their own fix (a corrected WebVTT track per lesson). Uploading a replacement video re-imports Mux's captions and undoes that lesson's written-version fix.

## Number conversions by lesson

**1.1 the-preschool-brain** (19): twenties → 20s, three thousand → 3,000, nineteen sixties → 1960s, ten → 10, two thousands → 2000s, nineteen sixties → 1960s, twelve → 12, nine hundred → 900, fifteen → 15, twenty → 20, twenty-six → 26, forties → 40s, thirties → 30s, a thousand → 1,000, thirty-two → 32, eleven → 11, five hundred → 500, a hundred and fifty → 150, twenty → 20

**1.2 how-self-regulation-grows** (4): five hundred → 500, eighty-two → 82, a hundred and thirty → 130, ten → 10

**1.3 minds-and-feelings** (9): two hundred → 200, a hundred → 100, a hundred → 100, fifty → 50, twelve → 12, two hundred → 200, fifteen → 15, eighteen → 18, seventy-five → 75

**1.4 behavior-at-3-4-and-5** (8): two thousand → 2,000, ten thousand → 10,000, three hundred → 300, fifty-three → 53, a hundred and fifty → 150, twenty-four → 24, a hundred and sixty thousand → 160,000, fifteen hundred → 1,500

**2.1 pretend-play** (10): seventy-three → 73, thirty → 30, a hundred and fifty-two → 152, thirty-four → 34, twenty-six → 26, three thousand → 3,000, a hundred and ten → 110, three hundred → 300, ten → 10, fifteen → 15

**2.2 rough-and-tumble-and-risky-play** (16): fifty-six → 56, ninety-four → 94, ninety → 90, eighty-five → 85, twenty-one → 21, four thousand → 4,000, two hundred thousand → 200,000, twenty-five → 25, fifteen → 15, thirty → 30, fifteen → 15, sixty-seven → 67, fifteen → 15, twenty → 20, three hundred → 300, twelve → 12

**2.3 free-play-guided-play-and-teaching** (7): twelve hundred → 1,200, seventy → 70, two hundred and fifty → 250, seventeen → 17, four thousand → 4,000, fourteen hundred → 1,400, seven hundred → 700

**2.4 screens-at-3-to-5** (14): fifteen → 15, ten thousand → 10,000, ten → 10, sixty → 60, ten → 10, a hundred and twenty → 120, thirty-nine → 39, eighty-one → 81, seventeen → 17, six thousand → 6,000, seven hundred → 700, ten → 10, four hundred → 400, twenty → 20

**3.1 from-playing-beside-to-playing-together** (6): a hundred and sixty-seven → 167, forty-eight → 48, a hundred and twenty-five → 125, two hundred and seventy-five → 275, sixty → 60, eighty-three → 83

**3.2 sharing-fairness-and-helping** (3): a hundred and forty-nine → 149, three hundred and sixteen → 316, a hundred and thirty-four → 134

**3.3 conflict-exclusion-and-big-feelings-with-others** (9): four hundred → 400, ten → 10, five hundred → 500, ninety-one → 91, forty-two → 42, three hundred → 300, a hundred and twenty → 120, twenty-one → 21, forty-eight → 48

**4.1 talk-that-builds-thinking** (15): fifty → 50, twelve → 12, thirty-six → 36, eleven → 11, fifteen → 15, seven hundred → 700, ten → 10, fourteen → 14, ten → 10, forty-two → 42, twenty → 20, ninety-six → 96, seventy-two → 72, a hundred and fifty → 150, five hundred → 500

**4.2 early-literacy-without-worksheets** (15): sixty-four → 64, six hundred → 600, ninety → 90, three hundred → 300, three hundred and seventy → 370, a hundred and seventy → 170, sixteen → 16, three hundred and sixty → 360, thirty → 30, five hundred and fifty → 550, eighty-five → 85, thirty → 30, a hundred → 100, a hundred → 100, eleven → 11

**4.3 early-math-the-counting-ladder** (13): two hundred and eighty → 280, a hundred and forty → 140, forty-four → 44, eighteen → 18, two hundred and fifty → 250, a hundred → 100, fifty-three → 53, twenty-nine → 29, a hundred → 100, a hundred and ten → 110, sixty-four → 64, three hundred → 300, six hundred → 600

**4.4 what-readiness-really-means-and-the-year-ahead** (28): twenty → 20, three thousand → 3,000, five hundred → 500, nine thousand → 9,000, a thousand → 1,000, seventeen → 17, nineteen → 19, nine hundred → 900, thirties → 30s, thirteen hundred → 1,300, eight hundred → 800, twenty-six → 26, eighteen hundred → 1,800, twenty-two → 22, three thousand → 3,000, twenty-four hundred → 2,400, seven hundred → 700, thirty-five → 35, fifteen hundred → 1,500, nineteen ninety-eight → 1998, twenty ten → 2010, nineteen ninety-eight → 1998, twenty ten → 2010, seven hundred → 700, a hundred and eighty → 180, twenty → 20, ten → 10, fifteen percent → 15%
