-- Corrects the written version of all 16 infant lessons (class_lessons.transcript).
--
-- The text was imported from Mux's auto-generated captions, so it carried the
-- transcriber's mistakes: researchers' names (Tronic for Tronick, Kool for Kuhl,
-- Bolby for Bowlby), misheard words (coup for coo, parenties for parentese,
-- pulled for pooled, weekly for weakly), "four and ten" for "four in ten",
-- words split by stray spaces ("careg iver"), a broken hotline number, and
-- comma splices where a sentence should end.
--
-- Every lesson's narration was generated with ElevenLabs from the lesson's
-- script.py, word for word, so each corrected text is that script's narration:
-- Matthew's own words, punctuation and paragraphs. Numbers stay as numerals
-- wherever the old text showed numerals, and the hotline in Lesson 1.5 is written
-- as 1-833-TLC-MAMA, postpartum.net and 988 (the script spells them out so the
-- voice reads them clearly). The per-lesson change table is in
-- docs/infant-transcript-corrections.md.
--
-- Safe to run twice. Each row changes only if its text still matches the
-- 2026-10-08 export (old_md5). If any lesson was edited since then, the whole
-- block raises and nothing is applied, so a hand edit is never overwritten.
-- Uploading a replacement video for a lesson re-imports Mux's captions and
-- undoes that lesson's corrections (see app/api/admin/classes/sync/route.ts).
do $fix$
declare
  r record;
  changed int;
begin
  for r in
    select * from (values
    ('born-ready-to-connect', '5019d2f6227d5b1882fb32c283548190', '6341bd6336dd14e6481c4e56695bf31d', $t$Welcome. If you're here, you are probably somewhere in the first year with a baby, or about to be. Maybe you're watching this at three in the morning with a sleeping infant on your chest. Maybe you're watching it in pieces, five minutes at a time, between feeds. However you got here, I'm glad you're here.

This class is about the first year of life, and it starts with a simple question: what is actually going on inside a newborn? Because from the outside, it can look like not much. A newborn sleeps most of the day. They cry. They eat. They stare at the ceiling fan. It's easy to come away with the impression that a newborn is a kind of blank slate, a small, sleepy body waiting for the real development to start later.

The research tells a very different story. Newborns arrive with a set of abilities that are surprisingly specific, and almost all of them point in the same direction: toward people. Toward faces, voices, smells, and touch. Toward you. That's what this lesson is about. In the next few minutes, we'll walk through what your baby can already do, what the science says about each ability, and what it means for the ordinary moments you're already having. Let's start with the gap between what we see and what's really happening.

Look at the two columns on this slide. On the left is what a newborn looks like from the outside. On the right is what researchers have found when they looked more carefully.

On the left: "Just staring." On the right: your baby is studying faces, and they are especially drawn to the one closest to them. On the left: "Doesn't know who I am yet." On the right: if you are the parent who carried them, your baby already recognizes your voice, because they started learning it before birth. And every other caregiver's voice is being learned right now. On the left: "Just crying." On the right: your baby is already tuned to the rhythm of the language they heard in the womb. On the left: "Only sleeping and eating." On the right: every feed, every diaper change, every time you hold them, their brain is taking in patterns about who responds and how.

None of this means your newborn is a tiny genius hiding their talents. It means they're built for something specific. Human babies arrive with a set of tools designed to do one job exceptionally well: to find their people and connect with them. Everything else in the first year builds on that job.

Let's start with vision, because it surprises a lot of parents.

A newborn's eyesight is blurry, far blurrier than yours. Fine detail across the room is mostly lost on them. But look at the illustration on this slide. Newborn eyes don't adjust their focus much yet. Their focus tends to sit at a fairly fixed distance, roughly eight to 12 inches away. Now think about where your face is when you're holding your baby to feed them. It's right there. Your face at feeding distance is right where their focus naturally sits.

And within that range, faces win. In studies going back to the 1970s, researchers showed newborns, some less than an hour old, a simple pattern arranged like a face alongside the same features scrambled up. The babies turned their heads and eyes to follow the face-like pattern further. Before they've had any real experience with faces, they're already drawn toward the basic layout: two eyes, a nose, a mouth.

So when your newborn locks onto your face and holds it, that isn't random staring. That's one of the first systems your baby's brain came equipped with, doing exactly what it was built to do.

Now let's talk about hearing, which gets a head start on vision.

By the third trimester, a baby in the womb can hear. Sound is muffled, a bit like listening from underwater, but voices come through. And the voice that comes through most clearly and most constantly is the voice of the person carrying them, because it travels through their body as well as through the air.

In a classic 1980 study, the researchers DeCasper and Fifer gave newborns, less than three days old, a special pacifier. Sucking in one pattern played a recording of their own mother's voice. Sucking in a different pattern played another woman's voice. The newborns adjusted their sucking to hear their mother. With very little time together outside the womb, they already knew which voice was hers, and they preferred it.

A follow-up study went further. Mothers read a children's story aloud every day during the last six weeks of pregnancy. After birth, their babies preferred that familiar story over a new one, even when a different woman was reading it. They weren't understanding the words. They were recognizing the rhythm and the melody.

Now, an honest note for everyone else. That head start belongs to the person who carried the baby. When researchers ran the same kind of test with fathers' voices, newborns didn't show a preference yet. So if you're a partner, a grandparent, or an adoptive parent, your baby probably doesn't recognize your voice on day one. But it is completely learnable, and you start now. Every time you talk to your baby, you're building the same kind of familiarity the birth parent got in the womb. The birth parent's voice is a head start, not a closed door.

This one is a favorite of mine, partly because my own research background is in early language.

Within the first days of life, newborns can tell the difference between the language they heard in the womb and a language with a different rhythm. In studies where babies hear speech in two languages, newborns respond differently to their native one. They've tuned in to the music of it: the rhythm, the stress, the rise and fall.

Some researchers think that music may even show up in how babies cry. One 2009 study recorded the cries of newborns from French-speaking and German-speaking families and found that the French babies' cries tended to rise in pitch toward the end, while the German babies' cries tended to fall, echoing the melodies of each language. It's a fascinating finding, but later studies have been mixed, so treat it as an intriguing possibility rather than a settled fact. What is solid is the listening side: newborns clearly recognize the sound of their home language.

We'll spend a whole module later in this class on how language develops before words. For now, here's the takeaway: language learning didn't start when you started trying to teach it. It started before your baby was born, and every time you talk to them now, you're continuing something that's already well underway.

Faces and voices aren't the only tools. Newborns also use smell and touch to find and settle with their caregivers.

In one early study, breastfed babies about six days old turned their heads toward a nursing pad carrying their own mother's scent more than toward a pad from another mother. At two days old, they didn't show that preference yet. They learned it in the first week, during close contact and feeding. Babies learn the scent of whoever feeds and holds them most closely. Smell is one of the ways babies locate their person, especially up close, in the dark, in the middle of the night.

Touch matters too. Skin-to-skin contact, holding, rocking, the pressure of being held against a warm chest: these aren't just comforting in a general sense. Research on skin-to-skin care shows it helps newborns stabilize their temperature, their breathing, and their heart rate. In other words, being held doesn't just feel good to a newborn. It helps their body run.

Notice the pattern forming across these slides. Vision focused at the distance of your face. Hearing tuned to the voices around them. A nose that learns the scent of whoever holds them close. A body that settles when held. Every one of these systems points in the same direction.

Here's where I want to hold two truths at once, because this is the idea the whole module is built on.

On one side of this slide: newborns are more capable than they look. Everything we've just covered is real. From the very first days, they recognize, prefer, orient, and learn.

On the other side: newborns are also more fragile than they look. At birth, a baby's brain is only about a third of its adult size, and it roughly doubles in the first year. The systems that manage stress, sleep, temperature, and emotion are all still under construction. A newborn can't reliably calm themselves down. They can't soothe themselves back to sleep on demand. They can't manage the flood of feeling that comes with hunger, cold, or too much stimulation.

Those two truths aren't a contradiction. They fit together. A baby who can't regulate on their own, but who comes pre-wired to find and connect with a caregiver, is a baby designed to borrow what they don't yet have. Their capability is aimed at getting them close to you, because being close to you is how their fragile systems get the support they need. We'll come back to this idea of borrowing your calm in Lesson 4.

So what do you actually do with all of this? The good news is that it asks less of you, not more. Look at the three practices on this slide.

Get close. Your baby's clearest world is about a foot wide. When you want to connect, bring your face into that range. Feeding, diaper changes, and holding already happen at the perfect distance. You don't need special visual toys or high-contrast cards to give your newborn something worth looking at. Your face is the most interesting thing in the room.

Talk to them. It might feel strange to narrate your day to someone who can't answer. Do it anyway. "Here's the warm washcloth. Now the other foot." Whether your baby already knows your voice or is learning it now, every word builds familiarity and continues the language learning that started before birth.

Respond. When your baby looks at you, cries, or settles into you, respond. You won't read every signal right, and you don't need to. Responding much of the time, in ordinary ways, is what matters. We'll dig into what that looks like in Lesson 3, when we talk about serve and return.

Notice what's not on this list: flashcards, enrichment programs, the right app. The research on newborns points us back to something much more ordinary and much more available: your presence.

Let's bring it together.

We started with a common picture of the newborn: a sleepy blank slate, waiting for development to begin. What we've seen instead is a baby arriving with a set of carefully tuned tools. Eyes that focus at the distance of your face. Ears already tuned to the voice that carried them, and quick to learn the rest of yours. An ear for the rhythm of the language they heard in the womb. A nose that learns to find you in the dark. A body that settles when held. And every one of those tools points the same way: toward the people who care for them.

That's the reframe to carry into the rest of this class. Your newborn isn't waiting for life to start. They're already doing the work of connection, from the very first day, and they came built to do that work with you.

Your baby arrives ready to connect. The ordinary moments you're already sharing are where that connection grows.

In Lesson 2, we'll look inside the brain itself: how connections form at an extraordinary pace in the first year, why some are kept and others are pruned away, and why ordinary family life, not special enrichment, is exactly what the growing brain expects. I'll see you there.$t$),
    ('a-brain-built-by-experience', '7006987507472bf641aef66a11949461', '793a1713698e41372d3c9f6bab8e423f', $t$Welcome back. In Lesson 1, we looked at what a newborn arrives with: eyes that focus at the distance of your face, ears tuned to a familiar voice, a nose that learns your scent, a body that settles when held. Every one of those tools points toward people. This lesson goes one layer deeper. We're going inside the brain to ask how early experience actually changes it.

One fact frames everything else. A newborn's brain is about a third of its adult size, and it roughly doubles in the first year. One large MRI study that followed babies from birth found total brain volume up by about 101 percent by the first birthday. That is the fastest the human brain will ever grow.

So what is growing? The answer surprises most parents. It is mostly not new brain cells. Almost all of the neurons your baby will ever have in the thinking part of the brain were made before birth. What grows in the first year is the wiring between them: branches, connections, and insulation. Your baby is building a network.

In the next few minutes, we'll walk through how those connections form, why the brain makes far more than it will keep, what kinds of experience it is counting on, and what happens when that experience is missing. I'll also flag a few places where the popular version of this science has gotten ahead of the evidence. And we'll land somewhere reassuring: the input this brain is built to expect is not special. It is you.

Let's start with the wiring itself.

A neuron is a cell that sends signals. A synapse is the tiny junction where one neuron passes a signal to the next. In the first year, synapses form at a rate that is hard to picture. Harvard's Center on the Developing Child puts the estimate at more than a million new connections every second in the early years. An honest note on that number: it's a calculation from tissue studies and brain growth, not something anyone has counted. The exact number matters less than the scale.

It doesn't happen everywhere at once. Peter Huttenlocher, a neurologist who spent decades counting synapses in donated human brain tissue, found that different regions run on different clocks. In the hearing areas, connection density peaks around three months of age. In the vision areas, closer to eight months. In the front of the brain, the areas that will eventually handle planning, attention, and self-control, the peak doesn't arrive until well past the first birthday, and by some measures much later.

You can see this on the slide: three curves, each rising at its own pace. Hearing first, vision next, the thinking-ahead parts last. That order matches what a baby needs to do first: listen, look, and only much later plan.

Here's the part that changes everything. The brain does not build the right number of connections. It builds far too many, on purpose. What happens to the extras is where experience comes in.

So the young brain overbuilds. By early childhood, the density of connections in parts of the cortex runs somewhere between one and a half and three times what an adult has. Then, over years, the number comes back down. That's pruning.

Pruning is not damage. Think about a sculptor working in marble: the finished figure comes from taking material away. The young brain is the block, and experience is the sculptor.

The rule is simple, and it has been known since the 1970s. Connections that get used are strengthened and kept. Connections that sit idle weaken and are eventually cleared away. "Use it or lose it" is a fair description at the level of a synapse. Pathways that fire often also get coated in a fatty insulation called myelin, which makes them faster. Practice, quite literally, becomes structure.

Now the timing, because this is where the popular version goes wrong. Pruning is slow, and it lasts a very long time. In the sensory areas, the cleanup runs through late childhood. In the front of the brain, a 2011 study of donated brains found connections still being trimmed and reorganized well into a person's 20s. So when you hear that a door slams shut at age three, that is not what the tissue shows. The first year lays down the raw material and starts the sculpting. It does not finish it.

And notice what "use it or lose it" implies for a baby. What gets used is what the baby experiences. The shape of this brain is being decided by ordinary days.

In 1987, a developmental neuroscientist named William Greenough and his colleagues gave us the two most useful words in this lesson. They proposed that the brain uses experience in two different ways, and called them experience-expectant and experience-dependent. Look at the two columns on this slide.

Experience-expectant development is the brain counting on input that every human baby, everywhere, is going to get. Light and patterns for the eyes. Speech sounds for the ears. Faces. Touch. Being held, fed, and comforted by someone who responds. Because these inputs are so reliable, evolution built a shortcut: overproduce the connections in advance, then let the expected experience decide which ones stay. These systems come with a window, a stretch of time when the input has its biggest effect, and for basic vision and hearing that window sits largely in the first year or two.

Experience-dependent development is everything particular to your baby's life. The sound of your name. The word your family uses for the dog. The songs you happen to sing. Here the brain grows new connections in response to whatever shows up, and it does that for a lifetime. There is no window that closes. You are doing experience-dependent learning right now, watching this.

Here's why the distinction matters so much for a parent. The expectant kind, the kind with the window, is asking for the most ordinary things imaginable: faces, voices, touch, response. The dependent kind, where you might imagine enrichment would help, has no deadline. Once you see that, most of the pressure around "the first three years" starts to come apart.

You can watch experience-expectant development happen in the first year, and my own research background sits right here, in early language.

At six months, a baby can hear the difference between speech sounds from every language on earth. A six-month-old in an English-speaking home can tell apart two Hindi consonants that sound identical to their parents. By 10 to 12 months, that ability has narrowed. The baby has become an expert listener in the language around them and a weaker listener in languages they never hear. Janet Werker showed this in the 1980s, and it has been replicated many times. The same thing happens with faces: around six months, babies can tell individual monkey faces apart. By nine months, they mostly can't, but they've gotten sharper with human faces.

This is often described as a loss. It isn't. It's tuning. The brain is committing its resources to the world the baby actually lives in, and Patricia Kuhl's lab found that over the same months, babies get better at hearing their own language, not just worse at others.

Here is the study I most want you to remember. Kuhl's team took nine-month-olds from English-speaking homes and had a native Mandarin speaker come and play with them for about a dozen short sessions. Those babies held onto the ability to hear Mandarin sound contrasts. A second group got the same speaker, the same words, the same amount of exposure, but on a screen. Those babies learned nothing. Not less. Nothing.

The input the brain was expecting turned out to be a person. Not language in the abstract. A live human being, paying attention to the baby, talking to the baby.

If the brain is counting on certain experiences, what happens when they don't come? This is where the strongest evidence comes from, so it's worth being precise.

The classic work was done with kittens in the 1960s by David Hubel and Torsten Wiesel. When one eye was kept closed during a specific early window, the visual areas of the brain rewired to serve the open eye, and vision in the closed eye didn't recover even after it was opened. That's a true critical period: a specific system, a specific input, a specific window.

In humans, the most important study is the Bucharest Early Intervention Project. Researchers worked with 136 young children living in Romanian institutions, places where physical needs were met but almost no one responded to an individual baby. Half were randomly assigned to move into foster families. Half stayed. The children who moved did better on nearly every measure: language, thinking, attachment, brain electrical activity. At age 18, the foster care group scored about nine IQ points higher. For some outcomes, children who moved earlier, before about age two, gained more.

Now look at what that study compares. It is not an ordinary family against an enriched one. It is an ordinary family against almost no responsive caregiving at all. The children who stayed were missing the experience-expectant basics: a face that answered theirs, a voice aimed at them, arms that picked them up. That is the kind of absence that harms a developing brain. Being an ordinary, tired family that isn't doing anything special is not that. The distance between an institution and your living room is the distance that matters, and you are already on the right side of it.

This science is compelling, so it gets stretched. Here are the stretches you're most likely to meet.

First: "The first three years are a critical window, and after that it's too late." There are real windows for specific systems, mostly sensory ones. But most of what a child learns is the experience-dependent kind, with no deadline, and the sculpting of the front of the brain runs into the 20s. The philosopher John Bruer took this claim apart in 1999 in The Myth of the First Three Years, and the tissue research since has backed him up.

Second: the Mozart effect. In 1993, a small study of college students found that 10 minutes of Mozart bumped up scores on a spatial puzzle for about 15 minutes. That became "classical music makes babies smarter." When researchers pooled nearly 40 studies in 2010, the effect was small, showed up just as well with other music people enjoyed, and came down to mood. None of it involved babies.

Third: baby videos and apps. The Mandarin study is the cleanest test we have, and the screen version taught nothing. A 2007 survey found that more time with baby-branded videos went along with knowing fewer words at 8 to 16 months. That was a correlation, not proven cause, and it has been debated. But even the most generous reading is that the videos did not help.

Fourth: the enriched-rat studies. Rats raised in cages full of toys and other rats develop thicker cortex and more connections than rats raised alone in bare cages, and this gets cited as proof that enrichment builds brains. Greenough's own caveat: the enriched cage is roughly a wild rat's ordinary life. The bare cage is the abnormal one. The studies show that deprivation hurts, not that extras help.

And that million-connections-a-second figure: fair as a sense of scale, but more connections is not the goal. The brain builds extras so experience can choose. Pruning is the feature.

So what do you do with this? Less than the marketing suggests, and more than you may realize you're already doing. Look at the three practices on this slide.

Show up, face first. The experience-expectant systems are asking for faces, voices, touch, and response. You deliver all four every time you pick your baby up and talk to them while you do it. A diaper change with eye contact and a running commentary is, neurologically, a rich experience. It doesn't feel like one. It is.

Let repetition be the curriculum. The same song at bedtime, the same words at the changing table, the same peekaboo game 200 times. Parents sometimes worry that repetition is lazy. Remember how pruning works: pathways that fire again and again are the ones that get kept and insulated. Your baby's favorite routine is a pathway being paved.

Talk about what's actually happening. Experience-dependent learning is built from the specifics of your baby's life, and you are the only source of those. "That's the kettle. It's loud, isn't it?" You're not teaching vocabulary. You're pairing a live voice with the world your baby is looking at, which is exactly the combination that worked in the Mandarin study.

Notice what isn't on the list: apps, flashcards, videos, classes. And notice what this means about hard days. A day when you were exhausted and did the minimum did not prune anything away. Pruning happens over years, and it responds to the overall pattern of a life, not to a Tuesday.

Let's bring it together.

A baby's brain doubles in size in the first year, mostly by building connections at a staggering pace and in a deliberate order: hearing, then vision, then, much later, the parts that plan. It builds far more connections than it needs, and experience decides which ones stay. That sculpting starts now and continues for two decades. The brain expects two kinds of experience: the universal basics every baby gets from a responsive caregiver, and the particular details of one family's life. The first has a window, and asks for nothing fancy. The second has no deadline at all.

The studies that show harm are studies of profound absence, not of families who skipped the enrichment class. And the study that best shows what the brain wants found that a person in the room taught a baby what a screen could not.

Your family is the enrichment. The ordinary, repeated, face-to-face life you're already living is what the growing brain is built to expect.

In Lesson 3, we get specific about the most important pattern inside that ordinary life: the back-and-forth between you and your baby that researchers call serve and return. I'll see you there.$t$),
    ('serve-and-return', '25138f8b9626d4ad35476e1bef990667', 'a4b4a272fee9a57a00ada7fdea969925', $t$Welcome back. Lesson 2 ended with a claim: ordinary family life is what the growing brain expects. This lesson is about the single most important pattern inside that ordinary life. Researchers at Harvard's Center on the Developing Child gave it a name that stuck: serve and return.

The idea is borrowed from tennis. Your baby serves: a look, a coo, a reach, a squawk, a cry. You return: you look back, you say something, you pick them up, you make the sound they just made. Then they serve again. That's it. That's the whole mechanism. It is happening dozens of times an hour in every home with a baby in it, and almost nobody notices they're doing it.

Over the next few minutes we'll look at what a serve actually looks like at two months, at what happens inside a baby when the return doesn't come (there is a famous experiment about exactly this), at why these exchanges predict language and brain development better than how many words a baby hears, at the voice you already use that draws a return out of a baby, and at what phones do to the pattern.

And we'll spend real time on the finding I most want you to leave with. Researchers who film parents and babies together, second by second, find that even happy, well-attached pairs are out of sync most of the time. Not some of the time. Most. What builds the brain is not staying in sync. It's coming back.

Let's start with what counts, because parents often picture serve and return as something that begins when a baby can point or say a word. It begins much earlier.

A serve is any bid for you. A newborn locking onto your face is a serve. A two-month-old's coo. A four-month-old's squeal when you walk into the room. A reach. A cry. Crying is the loudest serve a baby has, and answering it counts. Later come the pointing, the held-up toy, the babble aimed straight at you. A return is any answer at all: eye contact, a word, an imitation of the sound they just made, naming the thing they're looking at, picking them up.

Here's what the research adds. Ann Bigelow's lab followed babies from the first week through three months, and found that somewhere around two months, babies start making bids on purpose: they smile or vocalize while looking right at you, even when you're not doing anything. And the babies who did this most were the ones whose parents had been answering their sounds most consistently in the weeks before. In other words, a baby learns to serve by being returned.

So the first thing serve and return teaches is not language. It's something underneath language: I can make things happen. When I reach out, the world answers. Every ordinary answer you give in the first months is building that expectation, and the expectation is what everything else grows on.

Now, what happens when the return doesn't come? In the 1970s, Ed Tronick and his colleagues designed an experiment to find out, and it has been repeated in well over 100 studies since.

It works like this. A parent plays with their baby, face to face, for a couple of minutes. Then, on a signal, the parent goes still: a blank face, no words, no expression, still looking at the baby but not responding. Two minutes of that. Then the parent comes back and plays again.

Babies as young as two or three months notice within seconds. They smile at the blank face. Then they try harder: they coo, they reach, they wave their arms, sometimes they point at something as if to say, look at that. When none of it works, they turn away. They fuss. They chew their hands. Their heart rate goes up. Some cry. A 2009 review pooled more than 80 of these studies and found the effect is remarkably consistent: across ages, across countries, across families with different parenting styles. Babies in rural Ecuador react the way babies in urban Germany do.

Two more findings from that review matter here. Babies whose parents were more responsive in everyday life held onto more positive feeling during the blank-face minutes; they seemed to trust that the return was coming. And babies who coped better with the still face were more likely to be securely attached at their first birthday. The baby's reaction is not random distress. It's the reaction of someone with an expectation of being answered, watching that expectation fail.

That's the sobering half of this experiment. The reassuring half is what happens next, when the parent comes back.

When the parent comes back after the still face, most babies recover. They fuss for a moment, and then they re-engage. And it turns out that recovery, not the smooth part, is where the real learning is.

Tronick's lab went on to film ordinary mothers and babies playing together, coding their expressions second by second. In pairs with no problems at all, mother and baby were in matched, positive states only about 30% of the time. About 70% of the time they were out of step: one looked away, one was bored, one was too loud, one missed the cue. And then, over and over, they found each other again. Tronick called it mismatch and repair, and he argued that the repair is the point. A baby who experiences a thousand small mismatches that get fixed learns two things: I can recover, and the people I love come back.

Beatrice Beebe's lab, filming four-month-olds and following them to their first birthday, found something that surprised even attachment researchers: more coordination was not always better. Pairs whose moment-to-moment coordination was unusually high, where every flicker of one face was tracked by the other, were more likely to be insecurely attached a year later, just as pairs with very low coordination were. The healthiest pattern was in the middle. Room to look away. Room for the baby to do something on their own. Then a return.

I want you to hear that clearly, because so much parenting advice pushes toward more: more responsiveness, more attunement, more eye contact. The evidence points to enough, with repair. Missing serves is not a failure of the system. It is the system. What matters is that, over the pattern of a day, you keep coming back.

For a long time, the popular version of early language was about volume: hear more words, learn more words. In the last decade, researchers have been able to record entire days in real homes with a small device in a baby's vest, and the picture has changed.

What predicts language best is not how many words a baby hears. It's how many turns they take: a baby makes a sound, an adult answers within a few seconds, the baby answers back. In a study that followed children for 10 years, the number of these back-and-forth turns between 18 and 24 months explained a meaningful slice of IQ and vocabulary scores at age 10, after accounting for family income and education. The raw word count did not hold up once income was accounted for. The turns did.

The brain research says the same thing. Rachel Romeo's team found that children who had experienced more conversational turns showed more activity in the front left language region of the brain, regardless of income and regardless of how many words they'd heard. And a 2023 study from Patricia Kuhl's lab found that turn-taking measured as early as six months predicted how well insulated the brain's main language pathways were at age two. The effect held after controlling for the total amount of adult talk. It was the exchange that mattered, not the exposure.

Notice what this means for a six-month-old who can't say a word. They are already in the conversation. When your baby babbles and you answer, and they babble again, that's a turn. It counts in the recordings, and it counts in the brain.

So how do you get more turns out of someone who can't talk? It turns out you already know how. You just may have been told it's silly.

Almost everywhere in the world, adults talking to babies shift into a particular voice: higher pitched, slower, more musical, with exaggerated ups and downs. Researchers call it parentese. It is not baby talk in the sense of made-up words. It's real words, real sentences, delivered in a register that babies find irresistible. Studies of full-day home recordings find that babies are measurably more likely to vocalize right after an adult speaks to them in parentese than after the same adult speaks in a flat, grown-up voice. Parentese draws the return.

And it can be taught. In a randomized trial from the University of Washington, parents of six-month-olds were coached three times over the first year: they listened to their own home recordings, got feedback on their use of parentese and turn-taking, and talked about everyday activities that invite conversation. By 18 months, the coached families were taking more turns, and their children knew more words. Family income didn't change the result. A follow-up found the advantage was still there at 30 months, a full year after the coaching ended. A separate long-term study found that parents who used parentese consistently in the first year had children with richer language at kindergarten entry.

So when you catch yourself saying, "Whooo's got the toes? Yooou've got the toes," in that ridiculous voice, please keep going. That voice is a tool. It exists because it works.

You may have already noticed that the still-face experiment looks a lot like something that happens in every home now: a parent looking at a phone.

Researchers noticed too. Several labs have rerun the still-face experiment with a twist: instead of a blank face, the parent picks up a phone and scrolls for two minutes. In a 2020 study of more than 200 babies, the result matched the original. Less smiling, more fussing, more turning away, more attempts to get the parent back. In an earlier study, babies of parents who reported heavier everyday phone use had a harder time settling back in during the reunion. A study using paired brain recordings found that the synchrony between a mother's brain activity and her baby's dropped while she scrolled, and then came back when she re-engaged.

Now the honest version of what this adds up to. A 2025 meta-analysis of 21 studies found that parents' technology use around young children was associated with slightly lower cognitive scores and slightly more behavior problems. The associations were real, and they were small. Reviews of this research also note that being absorbed in a device for long stretches seems to matter more than brief interruptions. And in the brain recordings, the connection came back when the parent did.

So this isn't a lesson about never looking at your phone. You'll look at your phone. The phone is also how you reach your partner, your mother, your friends, at three in the morning. The lesson is the one from the still face: what matters is the repair. When you look up, look up all the way. Say their name. Answer whatever serve was waiting. The pattern of a day, not the interruption, is what the baby learns.

So here is what to do, and what not to worry about. Look at the four moves on this slide. They come from the same research, and you already do most of them.

Notice the serve. Follow your baby's eyes. What are they looking at? What are they reaching for? A serve is easier to return when you've seen where it went.

Return it. Any answer counts: a look, a word, the same sound back, the name of the thing. "You see the dog. That's the dog." Parentese welcome.

Wait. This one is the least obvious and maybe the most useful. After you return, pause. Give your baby a few seconds to serve again. Babies need more time than adults do to take their turn, and a lot of would-be turns get talked over. The pause is where the back-and-forth becomes a conversation.

Let them end it. When your baby looks away, they're usually done for now, not rejecting you. Let the exchange close. They'll open the next one. That's the room-to-look-away finding from Beebe's lab, in practice.

Now what not to worry about. You don't need to respond to everything, or instantly, and the evidence says trying to can backfire. You don't need to narrate all day; a running monologue is exposure, and turns are what count. You don't need baby sign classes: a randomized trial found infants taught signs learned language no faster than infants who weren't, though signing does no harm and some parents enjoy it. And if you've heard that children in some families hear 30 million fewer words by age three, know that the study behind that number was tiny and that a larger replication did not find the gap. The turn-taking research holds up. The word-gap slogan does not.

Let's bring it together.

Your baby has been serving since the first week. By two months they're doing it on purpose, because you've been answering. When the answer stops, even for two minutes, they feel it, and when it returns, they recover. Filmed second by second, even the happiest pairs are out of sync most of the time; what builds the baby is the coming back. The turns, not the word count, are what predict language and shape the brain. The voice you're embarrassed by is the tool that draws those turns out. And the phone matters less as an interruption than as a question of whether you look back up.

You do not have to be in sync. You only have to come back.

In Lesson 4, we go to the hardest hours: crying, sleep, and the states a newborn cycles through. We'll look at why a baby can't calm themselves yet, and what it means that they're built to borrow your nervous system while their own is under construction. I'll see you there.$t$),
    ('states-crying-and-the-borrowed-nervous-system', '8c3f0756acda1764d0b187752a3d4b36', '8bae732d4ff79e06484d07f9fdd12979', $t$Welcome back. In Lesson 3, I said that crying is the loudest serve a baby has. This lesson is about that serve, and about the hours when it comes so often, and is so hard to answer, that it can feel like nothing you do is working.

We'll cover four things. First, states: the distinct modes a newborn cycles through all day. Second, the crying curve: how much crying is normal, when it peaks, and why it shows up in nearly every family on earth. Third, the idea in this lesson's title. A newborn cannot calm themselves yet. The parts of the brain that will one day do that job are some of the slowest to mature. In the meantime, babies are built to borrow a nervous system: yours. And fourth, sleep, and what the research says about waking at night.

Along the way, there's one piece of safety information I want every parent, grandparent, and babysitter to hear.

If you're in the thick of these weeks right now, hear this first: the crying is not a verdict on you.

Researchers learned early that you can't make sense of anything a newborn does until you know what state they're in. The same voice that delights a baby in one state tips them into tears in another. The neurologist Heinz Prechtl and the pediatrician T. Berry Brazelton described the states most researchers still use. There are six.

Two are sleep. In quiet sleep, the baby is still, breathing is slow and even, and the face is relaxed. In active sleep, the eyes move under the lids, breathing is irregular, and the baby twitches, grunts, smiles, even whimpers. Newborns spend at least half their sleep in this active state, and it's easy to mistake for waking up. So before you scoop up a grunting, squirming baby, give it a moment. They may still be asleep.

Next is drowsy: heavy lids, a glazed look, drifting in or out.

Then the one I most want you to learn to spot: quiet alert. Eyes wide and bright, body still, face turned toward you, taking everything in. In the first weeks it comes in short windows, often after a feed, and it's where most of the serve and return from Lesson 3 happens.

Then active alert: eyes open, arms and legs going, fussy sounds building. This is the baby telling you the load is getting heavy. And last, crying.

Here's why this matters. A baby in active alert is on the way up. That's the moment to lower the input: fewer faces, less talk, dimmer light, a hand on the chest. If you wait for full crying, you're calming a baby from the top of the hill instead of catching them on the way up.

Now, crying. If you've been told a healthy, well-fed baby shouldn't cry much, here's what the numbers say.

A 2017 review pooled diary studies of more than 8,000 babies. In the first six weeks, the average was about two hours a day of fussing and crying, as parents recorded it. By 10 to 12 weeks, it had dropped to a little over an hour. Crying tends to climb from the second or third week, stays high through about the sixth, bunches up in the late afternoon and evening, and then falls. Some studies find a sharp peak around six weeks; that large review found more of a high plateau, then a drop. Either way, the shape is the same: up, a hard stretch, then down.

And it shows up almost everywhere: in London, in a mountain town in northern India where babies were rarely left to cry, and among hunter-gatherer families in Botswana, whose babies are carried most of the day and nursed several times an hour. Those babies cried in shorter bursts, but the early peak was still there. And babies born early hit the peak about six weeks after their due date, not six weeks after birth. The curve is keeping time with the baby's brain, not with anything happening in the house.

About one baby in five, in those first six weeks, cries enough to meet the usual definition of colic: more than three hours a day, more than three days a week. By three months it's rare. And when researchers observed the mothers of the heaviest criers, most were rated just as sensitive and affectionate as other mothers. The crying was happening in spite of good care, not because of poor care.

One important exception. Call your pediatrician if crying comes with a fever, poor feeding, or vomiting, if it sounds different from your baby's usual cry, or if your gut tells you something is wrong. Normal crying follows the curve. Crying that breaks the pattern deserves a check.

So why can't a baby just calm down? Because the equipment for calming down from the inside is some of the last to arrive.

For an adult, settling after a spike of distress leans on the front of the brain, the prefrontal regions from Lesson 2 that keep maturing into the twenties. A newborn has very little of that online. What they do have is simple: sucking, a hand to the mouth, and, a bit later, looking away. Mary Rothbart's research suggests the brain systems that let a child hold steady through a hard moment don't really take charge until about age three or four.

Until then, much of the calming is done from the outside. Researchers call it co-regulation, and a large 2023 review describes self-regulation as starting out mostly co-regulated in infancy and becoming the child's own only gradually, over years.

Here's what co-regulation looks like in the body. Sam Wass's lab in London recorded babies' and parents' heart rhythms at home across the day. When a baby's arousal spiked, the parent's body responded too, and when parents responded more strongly, their babies quieted faster. But the most striking finding was what parents did when things got really loud. When the pair as a whole was highly wound up, calmer parents brought their own arousal down, as if they were lowering the temperature of the room from the inside. A follow-up found that more anxious parents tended to track every small wobble in their baby's state, and did less of that downshifting. If that sounds like you, it isn't a flaw. It's a pattern worth knowing, and support helps.

So the job is not to feel nothing. Your heart is supposed to jump when your baby cries. That's the connection. The skill is the second step: letting your own body come down first, so there's a calm system nearby to borrow.

If co-regulation is the idea, here is one of the most concrete ways to do it, and it comes with a surprising piece of biology.

In 2013, a team led by Kumi Kuroda in Japan had mothers hold their crying babies, all under six months old, in two ways: sitting down, and walking around. Within seconds of the mother starting to walk, babies stopped crying, stopped squirming, and their heart rates dropped. Holding while sitting didn't do the same thing. Mouse pups do the same thing when their mothers carry them. The researchers called it the transport response: a built-in calming reflex, likely because a baby who goes still is easier to carry away from danger.

A follow-up in 2022 went further. Five minutes of walking helped crying babies fall asleep. But the moment of laying them down was the risky part: babies were most likely to wake just as the parent started to pull away. The researchers suggested walking for about five minutes, then sitting and holding the sleeping baby for another five to eight minutes before laying them down. That's one study's suggestion, not a proven rule, but it costs nothing to try.

Swaddling, rhythmic motion, a steady shushing sound, and sucking can also calm a baby in the moment. If you swaddle, it's for sleep on the back only, and it stops once your baby shows signs of trying to roll.

Now the limit. None of these flatten the curve. Trials that taught parents soothing techniques have had mixed results on total daily crying. Extra carrying all day long cut crying in one early trial, but a later trial in babies who already had colic found no difference, even with two more hours of carrying a day. These tools can shorten a bout. They don't cancel the season. If a product promises to end your baby's crying, the curve is still underneath it.

One of the oldest pieces of advice about crying is that picking a baby up every time will spoil them, and teach them to cry more.

In 1972, Silvia Bell and Mary Ainsworth followed 26 families through the first year and found the opposite. Babies whose mothers responded more promptly in the early months cried less by the end of the year, and had more ways of communicating that weren't crying.

Here's the honest complication. A larger Dutch study in 1991 tried to replicate that finding and couldn't. In their data, a short delay before responding to mild fussing was followed by slightly fewer crying bouts a few months later, as if a little room to settle helped some babies practice. And crying at home didn't predict attachment security at 15 months either way.

Put those together and you get something more useful than either camp's slogan. Neither study found that responding creates a spoiled baby. A young baby's cry is a real signal, and answering it isn't a bad habit. And pausing a few seconds to see whether mild fussing settles on its own isn't neglect. What the research does warn about is a pattern of ignoring. In a Japanese study of about a hundred thousand families, mothers who said they sometimes or often ignored their one-month-old's crying had children with somewhat higher odds of developmental delays later on. That's a correlation, not proof, and it describes a pattern, not a pause. It points the same way as the rest of this course: respond most of the time, and don't panic about the rest.

Now the safety piece. Please don't skip this one, and please share it with anyone who will ever be alone with your baby.

Crying is the most common trigger for abusive head trauma, which used to be called shaken baby syndrome. When researchers plotted the ages at which babies are hospitalized for it, the curve starts at two to three weeks, rises to a peak around two to three months, and falls away: the same shape as the crying curve, just a few weeks behind. Researchers who study it describe what usually happens: an ordinary, exhausted caregiver reaches the end of their rope during a crying bout that won't stop.

So here is the plan, and it's allowed. If you feel frustration rising and you can't calm your baby, put them down on their back in their crib or another safe sleep space. Walk out of the room. Close the door if you need to. Breathe. Call someone. Check on them every five to ten minutes, and go back in when you're steady. A baby crying safely in a crib for a few minutes is okay. Shaking a baby, even for a few seconds, can cause lasting brain injury.

This is the core of a program called The Period of PURPLE Crying, developed by the pediatrician Ronald Barr. The name spells out what's normal in these weeks: a Peak, crying that's Unexpected, that Resists soothing, a Pain-like face even when nothing hurts, Long bouts, and Evening clustering. In randomized trials, parents who got the materials knew more about normal crying, and were more likely to walk away during crying they couldn't soothe. Whether that lowers injury rates across whole regions is still debated. But the message is sound, and it may be the most important sentence in this course: you can always put the baby down.

Now sleep. Newborns sleep most of the day, often 14 to 17 hours, in pieces, around the clock. The body clock that sorts sleep into night and day is still being built in the early months, and daylight, darkness, and your household's rhythm help set it.

Waking at night is expected, and not just in the newborn weeks. A Canadian study asked how many babies sleep six or eight hours straight at six and 12 months. Depending on the definition, somewhere between a quarter and more than half did not. And babies who didn't sleep through were developing just as well, mentally and physically, at every age the study checked, up to three years. Their mothers' mood wasn't different either; the main difference was that babies who woke were more likely to be breastfed. A 2024 review of the wider research found no consistent link between infant sleep patterns and later thinking or motor skills.

What about sleep training? The trials have been done with babies six months and older, not newborns. A randomized trial that followed families for five years after a behavioral sleep program at eight to 10 months found no harm to children's emotions, stress levels, or closeness with their parents, and also no lasting benefit. Another trial measured babies' stress hormones during the program and their attachment a year later, and found no harm. So it's an option some families find helpful with an older baby, not a requirement and not a risk to the relationship.

And for every sleep, the safety basics from the American Academy of Pediatrics: on the back, on a firm, flat surface, in the parents' room but not in the parents' bed, with no pillows, blankets, or bumpers.

Let's bring it together.

Your newborn moves through six states; catch fussiness on the way up. Crying climbs, peaks, and falls by about three months, in every culture studied, in spite of good care. Your baby can't calm themselves yet, so they borrow your nervous system. Walk, don't sit. Respond most of the time, and don't fear the pauses. Night waking is normal, and it isn't hurting their development.

And when you reach your edge: put the baby down safely, step away, and come back when you're steady. That isn't failing at co-regulation. It's how you make sure there's a calm system to come back with.

Your baby isn't supposed to be able to calm themselves yet. Every time you lend them your calm, you're showing them how.

In Lesson 5, we close Module 1 by holding two truths at once: how astonishingly capable a newborn already is, and how much they still depend on you. I'll see you there.$t$),
    ('capable-and-fragile-at-once', 'f5eb21e033318ec04d87dc6bd17b9f2d', '24ae2a4a38af8f090cf6ef6a7fa5aa0d', $t$Welcome to the last lesson of Module 1. Back in Lesson 1, I said the whole module rests on two truths at once: newborns are more capable than they look, and more fragile than they look. Since then we've looked at the brain being built by experience, at serve and return, and at crying, sleep, and the borrowed nervous system.

Today we take both truths seriously, one at a time. On the capable side, we'll look at how fast babies learn from what happens to them, and at which famous claims about newborn abilities have held up under bigger, stricter studies and which haven't. On the fragile side, we'll look at pain, which newborns feel far more than medicine once believed, and at stress, and what protects a baby from it.

And then we'll turn to the part of the system this course hasn't talked about directly yet. If your baby borrows your nervous system, then your nervous system matters too. We'll end there, because it may be the most practical thing in the whole module.

Start with learning. In the 1970s and 80s, Carolyn Rovee-Collier ran a simple, elegant experiment. She tied a soft ribbon from a three-month-old's ankle to a mobile hanging over the crib. When the baby kicked, the mobile danced. Within minutes, babies figured it out and kicked three or four times as often as before.

Then she tested memory. Brought back to the same crib days later, three-month-olds still remembered, kicking hard as soon as they saw the mobile, for about a week. At six months, the memory lasted about two weeks. And a brief reminder, just watching the mobile move for a few minutes the day before, could bring back a memory that seemed to be gone. The memories were also remarkably specific: change the mobile too much, or even the pattern on the crib bumper, and the babies acted as if they'd never learned it.

Put that next to what we saw in Lesson 3, where two-month-olds start making bids on purpose because they've been answered. Young babies are constantly working out what their actions cause, and they hold onto it. That's the capable half in its most useful form. It means the ordinary patterns of your days are being noticed and remembered. Not every moment. The patterns.

Now a word about how we know what babies can do, because some famous claims have not survived.

In 1977, a now-famous study reported that babies just a few weeks old would copy an adult sticking out their tongue, and later studies reported it in newborns only hours old. It became a textbook fact: babies are born imitating. Then, in 2016, the largest study ever done on it followed more than a hundred babies across their first two months, testing nine different gestures against careful controls. It found no imitation. The original researchers reanalyzed the data and argued that tongue protrusion alone still showed up. A 2021 review of all the studies found an overall effect, but also found that results depended heavily on which lab ran the study. Today the fair summary is: unsettled.

Something similar happened to a well-known finding that babies under a year prefer a helpful character over a hindering one. In 2024, a coordinated replication across 37 labs on five continents, with more than a thousand infants, found no preference at all.

But here's the other side. When 67 labs tested whether babies prefer the sing-song voice of parentese from Lesson 3 over ordinary adult speech, the preference held up clearly across countries and methods, just smaller than earlier studies suggested. The findings that survive the biggest tests tend to be the basics: babies attend to people, prefer the voices aimed at them, and learn from what happens. That's plenty.

Now to the fragile side, starting with something medicine got badly wrong.

For much of the 20th century, many doctors believed newborns didn't feel pain the way older children do, and that their reactions were only reflexes. Until the late 1980s, it was not unusual for newborns to have surgery with little or no pain relief. Research on babies' stress responses during surgery helped change that practice.

More recently, brain imaging has made the point directly. In a 2015 study at Oxford, researchers gave newborns a mild, harmless poke on the foot inside a brain scanner and compared the result with adults receiving the same poke. Of the 20 brain regions that lit up in adults, 18 lit up in the newborns. A follow-up in 2020 found that the basic signal of how strong the pain was looked much the same in babies and adults, while the parts of pain that come from expectation and context, what the sensation means, were not yet there. So a newborn feels the hurt without yet having any way to understand it.

This has a very practical side. At vaccination visits, several simple things reduce babies' pain responses in trials: breastfeeding during the shot, holding your baby skin to skin, and a small taste of sugar solution, which many clinics can give. You're allowed to ask for them. One honest note: sugar solution clearly reduces crying and grimacing, but one well-known study found it didn't reduce pain activity in the brain as much as it reduced the outward signs. Comfort from you, during and after, still counts for a great deal.

The second fragile system is stress. A newborn's stress response is working from birth. What's missing is the ability to turn it back down, which, as we saw in Lesson 4, they borrow from you.

There's a striking finding here, which researchers call social buffering. When young children go through something mildly stressful, like a vaccination or a startling new situation, a trusted caregiver's presence can dampen or even block the rise in the stress hormone cortisol. Megan Gunnar's lab at the University of Minnesota found that this can happen even while the baby is still crying. The crying is the signal. The buffer works underneath it.

The Harvard Center on the Developing Child describes three kinds of stress. Positive stress is brief and mild: a shot, a bath they didn't want, a frustrating moment. Tolerable stress is more serious, like an illness or a loss in the family, but happens with supportive adults close by. Toxic stress is strong, frequent, or long-lasting adversity without that buffer, and that's the kind linked to lasting harm.

Here's the part that gets lost online. You'll see the phrase toxic stress attached to almost everything, from crying for a few minutes to a missed nap. That's not what it means. Everyday bumps are not toxic, and a baby who cries in your arms is not being harmed. The difference between stress that builds a baby and stress that hurts one is, above all, whether there's a steady adult nearby. Fragile doesn't mean breakable. It means buffered.

If your baby borrows your nervous system, then how your nervous system is doing isn't a side issue. It's part of the baby's environment.

Depression and anxiety after a baby arrives are common. Studies that use careful diagnostic interviews find that roughly one new mother in eight has a depressive episode in the first year, and screening surveys find more. Fathers and partners aren't exempt: a review of 43 studies found about one in 10 fathers had depression during pregnancy or the first year, with the highest rates when babies were three to six months old.

It's normal to have a few weepy, up-and-down days in the first two weeks, often called the baby blues, and they usually pass on their own. When low mood, anxiety, numbness, or not being able to enjoy anything lasts longer than two weeks, or feels heavier than that, it's worth telling someone.

And here's the finding I most want you to hear. In a well-known study of mothers being treated for depression, when the mothers got better, their children got better too: fewer symptoms, fewer behavior problems, better functioning, even though the children themselves weren't treated. Getting help for yourself is not selfish, and it is not separate from caring for your baby. It is caring for your baby.

If you're in the United States, the National Maternal Mental Health Hotline is free and confidential, day and night, by call or text, at 1-833-TLC-MAMA. It's on the screen now, and it's also there for partners and family. Postpartum Support International, at postpartum.net, has support specifically for dads. And if you ever have thoughts of harming yourself, call or text 988.

So let's put the two halves back together, because each one, taken alone, leads parents astray.

Take only the capable half, and you get the superbaby story: flashcards for newborns, videos promising little geniuses, the worry that every unfilled minute is a missed opportunity. We saw in Lesson 2 that none of that holds up. Babies are capable learners, but what they're built to learn from is people and ordinary life, not programs.

Take only the fragile half, and you get the eggshell story: every cry is damage, every stressful moment is toxic, every mistake is permanent. That doesn't hold up either. We saw in Lesson 3 that even the happiest pairs are out of sync most of the time, and that repair is where the learning happens.

The truth sits between them. A newborn is sturdy with support. Capable enough to learn from almost everything around them, and fragile enough to need a buffer while they do. Your job isn't to optimize the capable part or to protect the fragile part from every bump. It's to be the steady, ordinary presence that both halves are built to use.

Here is the whole module in five moves, one from each lesson.

Get close. Your face at feeding distance is the most interesting thing in your baby's world.

Keep it ordinary. Everyday talk, touch, and play are what the growing brain expects. You don't need a program.

Come back. Answer the serves you can, and when you miss one, repair. The coming back is what builds the baby.

Lend your calm. Walk, hold, bring your own body down first, and when you reach your edge, put the baby down safely and step away.

And the new one from today: look after the lender. Your rest, your support, and your mental health are part of your baby's care, not a distraction from it.

Let's bring it together.

Your baby learns fast and remembers what their actions cause. Some famous claims about newborn abilities have faded under bigger studies, but the basics hold: babies attend to people and learn from them. Your baby feels pain, more than medicine once believed, and comfort during painful moments matters. Their stress system works from birth, and a steady adult nearby is what keeps everyday stress from becoming harm. And because they borrow your nervous system, taking care of yours is part of taking care of them.

Your baby is capable and fragile at once. So are you. Neither of you has to do this alone.

That's the end of Module 1. In Module 2, Reading Your Baby's Cues, we get practical about what your baby is telling you: the looks, sounds, and body signals that mean ready, hungry, tired, or had enough, and how to learn your own baby's version of each. Thank you for spending this time with me. I'll see you there.$t$),
    ('the-cue-vocabulary', 'f3b2f5e7e1703ffa35d6066f61fe0723', 'b835cecc00d5a45c59ddb7a2fe6cf4be', $t$Welcome to Module 2. In Module 1, we looked at what a baby's brain is building, at serve and return, and at the six states a baby moves through in a day. This module gets practical. It's about reading what your baby is telling you, and it starts with the vocabulary.

Here's the idea I want you to hold onto: crying is usually the last word, not the first. Long before a cry, most babies have already said something with their eyes, their hands, and their bodies. Those quieter signals are called cues.

In this lesson we'll cover the two basic messages underneath almost every cue, then hunger and tiredness, then an honest look at what a cry can and can't tell you, and finally how your baby's signals grow up over the first year.

Researchers who study parent and baby interaction, starting with the nurse scientist Kathryn Barnard and her team, sorted infant cues into two big families.

Engagement cues say: more of this, please. Eyes wide and bright. Looking at your face. The face brightening, a smile, a coo. Reaching toward you. Smooth, relaxed movements.

Disengagement cues say: less of this, for now. Looking away. Turning the head. A hand up to the face or the ear. Arching the back, pulling away. A frown, a yawn, hiccups, fingers spread wide, fussing. Some cues are subtle, like a glance away. Others are potent, like arching and crying. Babies usually try the subtle ones first.

There are a lot of them. In one study that filmed feeds with babies from three to 22 weeks old, researchers counted 22 different cues in feeding alone, and the babies sent more less-please signals than more-please ones. So if it feels like your baby is constantly asking for adjustments, that's accurate. That's the conversation.

In Module 1, I said that when your baby looks away, let them end it. Here's what's happening inside when they do.

In a classic study, Tiffany Field measured four-month-olds' heart rates during face-to-face play with their mothers. Just before a baby looked away, heart rate went up. While the baby looked away, it came back down. Looking away is how a baby turns the volume down on their own. And babies looked away more in two situations: when mothers were asked to go completely still, and when mothers were asked to work extra hard to keep the baby's attention. Too little and too much both pushed babies away.

So when you see a look away, a yawn, hiccups, or spread fingers in the middle of play, try doing less, not more. Pause. Soften your voice. Wait. Most of the time, your baby comes back to you.

One more thing that changes with age. By around six months, looking away more often means something else caught their interest: a toy, a shadow, their own hands. Not every look away is overload. Sometimes the world just got interesting.

Hunger cues are usually described in three stages. Early: stirring, the mouth opening, turning the head as if searching, which is called rooting, and hands to the mouth. Active: more squirming, rooting harder, fussing, sucking on fists. Late: crying, and frantic head turning.

How much room is there between early and late? In a small study of newborns in the first hours after birth, about half an hour passed, on average, between the first mouth cues and sustained crying. Another small study confirmed that rooting really does show up more before feeds than between them, but in most families it didn't reliably come before the crying started. So early cues are real and worth catching, but they aren't a guaranteed window. Some babies go from calm to crying fast.

Two cautions. First, hands to the mouth can mean hunger, but as we saw in Module 1, sucking and hand-to-mouth are also how young babies calm themselves. Second, a cry doesn't always mean hunger. In one survey of nearly 400 mothers, about seven in ten agreed that a crying baby must be hungry. Babies cry for plenty of other reasons, which is where context comes in. How babies signal full is the other half of feeding, and we'll cover it in Lesson 3.

The usual list of tired cues looks like this: staring off, less interest in faces and toys, jerky movements, rubbing the eyes, pulling at the ears, yawning, and fussing.

Here's the honest part. Hunger and fullness cues have been filmed and coded across hundreds of feeds. Tired cues mostly haven't. They come largely from clinical experience rather than from studies that test them.

Notice, too, that yawning shows up on both the overstimulation list and the tired list. The same cue can mean two different things. That's why context does so much of the work: how long has your baby been awake, and what just happened?

So treat tired cues as hints to test, not rules to follow. Over a few weeks, you'll see which ones your baby actually uses. We'll come back to sleep in Lesson 4 of this module.

Now crying itself. You may have seen claims that babies have different cries for hunger, gas, and tiredness, and that you can learn them or use an app to translate them.

In 2023, a team in France published the largest study of its kind: more than 39,000 cries from 24 babies, recorded at home from about two weeks to three and a half months old. The cries reliably revealed which baby was crying and how old they were. But neither trained adult listeners nor computer algorithms could reliably tell the cause: hunger, discomfort, or wanting company. The cause just isn't clearly in the sound.

What a cry does carry is how upset your baby is. And your ear gets trained. In a related study, adults with no baby experience could not tell a pain cry, recorded during a vaccination, from a mild discomfort cry, recorded during a bath. Parents and professional caregivers could recognize a familiar baby's pain cries, even ones they'd never heard before. Caring for babies teaches you to hear what matters.

So when your baby cries, the sound tells you how urgent. The context tells you why. When did they last eat? How long have they been awake? What just happened? Then you work through the list.

Over the first year, your baby's cues change in a way that's easy to miss while you're living it.

Early on, most cues are the body doing the talking. In a study that filmed feeds from three to 18 months, the most common early signs of being full in the first six months were falling asleep and going slack. After six months, babies were more likely to get interested in the room, and then to push the spoon away, turn their head firmly, or shake it no. A 2025 study that followed more than 200 families across the first year found that at one and two months, babies' signals and mothers' responses weren't yet in step, and from about four months on, they were. Two people learning each other.

By the end of the first year, many signals are deliberate: reaching, holding something up to show you, looking back and forth between you and the thing they want. Pointing is part of this too, and we'll give it its full due in Module 4.

And here's a detail I love. Roberta Golinkoff watched babies who weren't talking yet during lunch in their highchairs. Their messages often failed. When a mother misunderstood, the babies didn't just give up. They repeated the signal, changed it, and added new ones until they got through. Being misunderstood is part of how babies learn to communicate. It's not a problem to avoid. It's practice.

So what do you do with all of this? Look at the three practices on this slide.

Pause and look. Before you act, take a few seconds. What state is your baby in? What are the eyes, hands, and body saying: more, or less? That short pause turns a guess into a read.

Say what you see. "You're looking away. I think you've had enough of that song." Researchers call this mind-mindedness: talking about what your baby might be thinking or feeling, and trying to get it right. In one long-term study, parents who made more of these well-matched comments to their six-month-olds had children who, around age four, better understood that other people have their own thoughts. It's one study with later support, and it shows a link, not proof of cause. But it costs nothing. And a study that followed mothers from the first week found their comments became more accurate over the first three months, as they got to know their babies. Reading your baby is a skill that grows.

Guess, then check. You'll be wrong a lot, and that's built in. As we saw with repair in Module 1, what matters is noticing and trying again. Babies also differ in how clearly they signal. In one feeding study, some babies gave much clearer cues than others. If your baby is hard to read, that isn't a grade on you.

Here's what to take with you. Most cues come down to more, or less. Looking away is a break, not a rejection. Crying is usually the last word, and a cry tells you how urgent, not why. Tired cues are hints, not rules. And your baby's signals grow from body reactions into deliberate messages over the year, partly because you keep answering them.

The vocabulary is shared by nearly all babies. The accent belongs to yours. Some babies are loud and clear, some are subtle, some switch from calm to upset in seconds. That difference has a name, and it's where we're going next: temperament, your baby's starting settings.

I'll see you in Lesson 2.$t$),
    ('temperament', 'f7813cc083dd9f9abbfd6ad8e20c13fd', '6391aa6dfdbdd4cb7c3c3a7567e7299f', $t$Welcome back. Last lesson ended with an idea: the cue vocabulary is shared by nearly all babies, but the accent belongs to yours. Some babies are loud and clear. Some are subtle. Some go from calm to upset in seconds.

Parents with more than one child usually know this already. Same parents, same house, and two completely different babies from the first weeks. That difference has a name: temperament. Researchers define it as the early, biologically rooted differences in how strongly a baby reacts, and how easily they settle and focus. Rooted in biology, but shaped by experience from day one.

In this lesson we'll look at how researchers describe temperament, how much it actually lasts, why your own read of your baby is partly about you, and the finding I most want you to leave with: why the fit between a baby and their world matters more than the label.

The modern study of temperament started in New York in 1956, when the psychiatrists Alexander Thomas and Stella Chess began following 133 children from infancy into adulthood. They sorted babies into three types. Easy babies, about four in ten, were fairly regular and adapted quickly. Difficult babies, about one in ten, were intense, irregular, and slow to adjust. Slow-to-warm-up babies, about one in seven, pulled back from new things at first, then came around. And here's the part that usually gets left out: more than a third of the children didn't fit any of the three types.

Today most researchers use a simpler map, from the work of Mary Rothbart, built around three broad dimensions. How strongly does your baby react with upset, like fear or frustration? How much does your baby go toward excitement, new things, and big smiles? And how well can your baby steady themselves and hold their attention? That third one is still under construction all through infancy, as we saw in Module 1.

Three dials, not three boxes. Every baby sits somewhere on each one.

So how much does temperament last?

Some of it shows early. In Rothbart's first studies, how active a baby was and how much they smiled and laughed held fairly steady from three months to twelve. Fear and frustration only settled into a stable pattern after about six months, partly because fear barely shows up before then. Across the first year, the stability is real but moderate: strong over a few months, weaker over a whole year.

The most studied example is the highly reactive baby. In Jerome Kagan's research, a minority of four-month-olds, somewhere between one in ten and one in five depending on the study, reacted to new sights and sounds with lots of kicking, arching, and crying. As toddlers, those babies were more likely to be cautious with new people and places. But only a small share stayed consistently cautious at every age. Many changed, and in one study, the children who changed were more likely to have spent regular time in care outside the family.

Decades later, at age twenty-six, the babies who had been most cautious at fourteen months tended to be more reserved adults. So temperament leaves a real trace. It's also a modest one. In a review of twenty-five long-term studies, how negative a baby's temperament was predicted later emotional and behavior problems only weakly. Starting settings shape the path. They don't write it.

Most of what we know about infant temperament comes from parents filling out questionnaires. That's reasonable: you see your baby across thousands of hours that no researcher ever will.

But when researchers compare parent reports with trained observers watching the same babies, the two often agree only loosely. And the parent's own state shows up in the answers. In several studies, mothers who were depressed, or short on sleep, rated their babies as more difficult. That doesn't mean they were imagining it. A baby really can feel harder when you're running on empty. It means the label carries some of your load, too.

So if you've landed on a word for your baby, like fussy, or difficult, or high needs, hold it lightly. It's a description of your baby in your life right now, not a measurement of who they are.

Thomas and Chess's most important idea wasn't the three types. It was something they called goodness of fit. How a child does depends less on their temperament alone than on the match between that temperament and what the world around them expects.

Picture a very active, intense baby. In a family that loves being outside, carries the baby everywhere, and doesn't mind noise, that's a great fit. In a small apartment, with a parent who needs quiet to recover, the same baby can feel like a constant emergency. Or a slow-to-warm-up baby. Handed straight to 10 relatives at a holiday party, that baby cries. Given 10 minutes on a parent's lap first, watching, the same baby often joins in.

In the New York study, a difficult temperament raised the odds of later behavior problems. But Thomas and Chess concluded that temperament alone didn't cause them. Poor fit did. When the adults around a child adjusted their pace, their expectations, and the setting, many of those children did well. The baby didn't change first. The fit did.

Here's the finding I promised. For a long time, a fussy, intense baby was treated as a risk factor. More recent research suggests something more hopeful.

A 2016 review pooled more than 80 long-term studies. Children with more difficult temperaments were more affected by harsh or unresponsive parenting, but they also gained more from warm, responsive parenting than easier children did. The same sensitivity that makes them hard to settle makes them respond more to good care. Researchers call this differential susceptibility: for better and for worse. And the pattern for negative emotions was clearest when temperament was measured in infancy.

One study makes it concrete. Babies who were highly negative at seven months, and who then had mutually responsive relationships with their mothers, became better at controlling themselves as toddlers than other children. Highly negative babies in less responsive relationships did worse. For calmer babies, the quality of the relationship made little difference to that outcome.

The honest caveat: these effects are modest, and not every study finds them. But the direction of the evidence is clear enough to change the question. A demanding baby isn't a baby headed for trouble. It's a baby for whom your responsiveness counts for more.

We also have experiments, which are rarer and stronger than studies that just follow families.

In the Netherlands, researcher Dymphna van den Boom identified newborns who were highly irritable, in lower-income families, and randomly assigned some mothers to a short program when the babies were six to nine months old. The program was simple: coaching mothers to notice their baby's cues, read them, and respond. By nine months, compared with babies whose mothers didn't get the program, those babies were more sociable, better at soothing themselves, explored more, and cried less. We'll come back to what else it changed in Module 3.

Later trials found the same shape: coaching programs for parents often worked best for the most reactive babies.

And here's the other side of it. A fussy baby is harder on the adult, too. In one study, fussier six-month-olds were followed by less sensitive parenting months later, but only when the mother herself had a hard time regulating her own emotions. That's not a flaw in her. It's a sign that the parent of a demanding baby needs support in proportion to the load. As we saw in Module 1, looking after the lender is part of looking after the baby.

So what do you do with this? Look at the three practices on this slide.

Describe, don't diagnose. "She warms up slowly." "He feels everything at full volume." Descriptions point you toward what helps. Labels like difficult point nowhere, and they tend to stick.

Adjust the setting, not the child. Work with the dial your baby has. A slow-to-warm-up baby gets a few quiet minutes on your lap before being passed around. A very active baby gets movement and outdoor time built into the day. An intense baby gets a calmer room when things start to escalate. Notice your own settings too. A high-energy parent with a cautious baby, or a quiet parent with a loud one, is a fit worth thinking about, not a mismatch to fix.

Get support in proportion to the load. If your baby is at the demanding end, you're not doing it wrong. You're doing more. Ask for more help, take the breaks, and lean on the people around you. Your responsiveness matters most for exactly this baby, and responsiveness runs out without rest.

Here's what to take with you. Babies really do differ from the start: in how strongly they react, how much they go toward the world, and how easily they settle. Those settings last, moderately. They change too, especially in the first year. Your read of your baby is real, and it's also colored by how you're doing. What predicts how a child does is less the temperament itself than the fit between that child and their world. And the babies who are hardest to care for are often the ones who gain the most from being cared for well.

Your baby came with starting settings. You get to help shape the rest.

Next, we take everything from these two lessons to the place where cues and temperament meet several times a day: feeding. I'll see you in Lesson 3.$t$),
    ('feeding-as-a-conversation', '9f11f40c5bfe5ae2ced94916e0a01a3f', '02b3990a814142f6da31b7f1350de24c', $t$Welcome back. At the end of the last lesson, I said we'd go to the place where cues and temperament meet several times a day: feeding. Across the first year, that adds up to well over a thousand feeds.

This lesson is about how you feed, not what's in the bottle, or whether there is one. Breast milk, formula, or both: a fed baby is the goal, and everything here works for all of them.

We'll cover who decides what at a feed, why appetite has starting settings just like temperament, what a bottle changes, what the big trials found, how to tell when your baby is ready for solid food, and how babies learn to like new foods.

Researchers describe responsive feeding as a loop. Your baby signals. You respond promptly, warmly, and in a way that fits their age. And your baby learns what to expect. It's serve and return from Module 1, at the table.

The dietitian Ellyn Satter described the division of labor in a way that's still widely used in children's nutrition. You're in charge of what's offered, and when and where. Your baby is in charge of whether to eat, and how much. In the milk months, your baby leads on when, too.

The how much part runs on fullness cues. During a feed, look for sucking that slows, pauses that get longer, hands that relax and open, turning away, lips that close, and pushing the nipple or spoon away. You met hunger cues in Lesson 1, and saw how these signals grow up over the year. Here's the rule that goes with them: when your baby says done, done counts. Even with milk left in the bottle or food left in the bowl.

In the last lesson, we talked about temperament as starting settings. Appetite has settings too.

In a study of more than two thousand pairs of twins born in England and Wales, parents described their babies' appetites in the first three months, while the babies were only drinking milk. Identical twins were much more alike than non-identical twins. Researchers estimated that genes explained most of the differences between babies in how slowly they fed and how quickly they filled up. So some babies arrive as keen, fast eaters, and some as slow, easily full sippers. Both are normal starting points.

Here's where it gets tricky. Later in the same study, parents rarely fed their two twins differently, with one exception: pressure. Parents pushed harder with the twin who had the smaller appetite. Those twins were toddlers by then, but the pull starts early. When a baby eats little, the urge to get just a bit more in is completely natural.

It's worth noticing, because pressure and fussy eating tend to go together, and it likely runs both ways. Small appetites draw pressure, and pressure takes some of the pleasure out of eating.

Feeding at the breast has two built-in features: the baby controls the flow, and nobody can see how much went in. A bottle changes both. This isn't about what's in the bottle. It's about who's steering.

In one lab study, researchers fed the same 21 babies two ways on two days. One day, mothers fed as they normally would. The other day, the feed started when the baby signaled hunger and stopped when the baby turned the bottle down three times in a row. On average, the babies took about 42% more when the adult set the pace. Some took less, and a few took much more.

In another study, mothers fed their babies from a regular clear bottle one day and from a bottle they couldn't see into on another. With the opaque bottle, mothers were more responsive to their baby's cues, fed more slowly, and fed a little less. A visible milk line pulls our eyes to the bottle and away from the baby.

That's where paced bottle feeding comes in. Hold your baby fairly upright. Keep the bottle closer to level, so milk flows when your baby sucks rather than pouring in. Touch the nipple to the lips and let your baby draw it in. Every so often, tip the bottle down for a pause, and watch for fullness cues. In a 2024 study, paced feeds were slower and longer than usual bottle feeds, and babies drank about the same amount. So pacing isn't a trick to make babies eat less. It gives your baby's signals time to show up, and gives you time to see them. And don't prop the bottle. A propped bottle can't read cues.

Does any of this matter beyond a single feed? Two large trials tested it.

In the INSIGHT study in Pennsylvania, nurses visited nearly 300 first-time mothers across the first year and coached responsive parenting, including feeding by cues and finding ways to soothe other than food. Compared with families who got safety coaching instead, these parents were less likely to pressure their baby to finish, to use food to soothe, or to prop the bottle. At age three, their children's body mass index was modestly lower. A follow-up to age nine found the difference shrinking over time, and clearer in girls than in boys.

In Australia's NOURISH trial, with nearly 700 first-time mothers, a similar program also made feeding more responsive. But it didn't change the children's weight, and the effects on eating habits were small.

So here's the honest summary. Coaching reliably changes how parents feed. The effects on weight are modest and mixed. Responsive feeding is best thought of as a good way to feed, not as a weight-control plan.

Around six months, most babies are ready for food alongside their milk. That's the guidance from the American Academy of Pediatrics and the World Health Organization, and before four months is too early for any baby.

But readiness is a set of skills, not a birthday. Look for your baby sitting with little or no support and holding their head steady. Bringing hands and toys to their mouth. Watching you eat, and leaning in. Opening up when food comes toward them. And one more: very young babies push anything on the tongue straight back out. When your baby can keep food in and move it back to swallow, that reflex is fading.

European food safety experts reviewed this in 2019. The skills for smooth purees can show up as early as three or four months, and the skills for finger foods more often between five and seven. But they were clear that being able to doesn't mean needing to. For nutrition, most babies need solid food from around six months. If your baby was born early, go by their development rather than the calendar.

And three questions belong with your pediatrician rather than this course: when to introduce common allergens, your baby's weight, and their growth.

Your baby's first taste of green beans may come with a face that says you've betrayed them. Don't take it as the final answer.

In one study, babies four to eight months old were fed green beans daily for eight days. Many kept making faces of distaste, but they ate more and more, from about 57 grams to about 94. Their mothers mostly didn't notice the change.

In another study, mothers chose a vegetable their seven-month-old had rejected and offered it every other day. On the first try, babies ate about 39 grams. By the eighth, about 174, as much as a vegetable they already liked. Nine months later, almost two in three were still eating it. Reviews of this research put the usual number at eight to 10 tries.

This fits with responsive feeding, not against it. You offer. Your baby decides. If they turn away, that's the end of this try, not the end of that food.

Mess is part of the learning. Babies get to know a food by squishing it, smearing it, and dropping it, as well as by tasting it.

Spoon, fingers, or both are all fine. In New Zealand's BLISS trial, a baby-led approach, with babies feeding themselves soft finger foods, didn't change their weight, and parents reported a bit less fussy eating at 12 months. In another trial, most families drifted to a mix of spoon and fingers anyway.

Gagging is common and normal. It's a noisy reflex that pushes food forward, and most babies do it as they learn. Choking is different, and often quiet. In the BLISS trial, about a third of babies had at least one choking episode between six and eight months, and the rate was the same whether they were spoon-fed or feeding themselves. So the safety basics are for everyone: your baby sitting upright, an adult watching, and foods soft enough to squash between your fingers. No whole nuts, and grapes cut into quarters. An infant first aid class is worth the time.

So what do you do with all of this? Look at the three practices on this slide.

Let your baby set the amount. You choose what's offered, and when. Your baby decides whether and how much. When the cues say done, you're done, even with food left over.

Offer again, another day. A face isn't a verdict, and a turned head ends this try, not the food. Plan on eight to ten tries, spread over days, with no pressure.

Eat together. Babies watch what you eat. In a classic study, young toddlers were more likely to try a new food when the adult offering it was eating it too, especially when that adult was their mother. And in another study, 12-month-olds chose the food they'd seen a friendly speaker of their own language enjoy. When you can, bring your baby to the table, share some of the same foods, and let them see you like it.

Here's what to take with you. Feeding is a conversation. You decide what's offered, and when. Your baby decides whether and how much. Appetite has starting settings, and the pull to push a small eater is natural and worth resisting. With a bottle, pace the feed and watch the baby, not the milk line. Solids start around six months, when the skills are there. A face isn't a verdict, and tries eight through ten are often where things change. And the table is where babies learn what food is for.

You don't have to get every feed right. You get well over a thousand chances to practice.

Next, we'll finish this module with the other thing that happens every day and every night: sleep, and how it changes across the first year. I'll see you in Lesson 4.$t$),
    ('sleep-across-the-first-year', 'a783344f2934f08f2e715bc9eb75f185', 'a590b6c993051f1f5e8deba5a29f812a', $t$Welcome back. This is the last lesson of Module 2, and it's about the thing new parents ask about most: sleep.

In Module 1, Lesson 4, we covered the essentials: waking at night is normal, the sleep-training trials found no harm and no lasting benefit, and every sleep should be on the back, on a firm, flat surface, in your room but not your bed. This lesson picks up from there.

We'll look at how sleep changes month by month, what naps are doing, what the four-month regression really is, the evidence on bedtime routines and putting your baby down awake, how to use tired cues, and, finally, your own sleep.

In the first weeks, sleep comes in short pieces spread across the whole day and night. In a classic study that followed babies through their first 16 weeks, sleep in the first week was split about evenly between day and night.

Then the body clock switches on. In a study of 35 babies in England, a day-night rhythm in the stress hormone cortisol appeared at around eight weeks, and in melatonin, the sleep hormone, about a week later, right when longer night sleep was taking hold. By 16 weeks, babies were sleeping about twice as much at night as during the day.

As we saw in Module 1, daylight helps set that clock. One study of six-to-12-week-olds found that babies who slept better at night had been exposed to more light in the early afternoon.

A review of the research found the biggest changes in the first four months, especially months one and two, and smaller changes after that. But the most striking thing in nearly every study is how much babies differ. The average is a trend line. Your baby is one dot.

Naps change shape across the year. Early on there are many short ones. In a large set of sleep logs from an app, sessions in the first three months were mostly under three and a half hours, around the clock. Between three and seven months, many babies settled into about two or three naps plus a longer night. And in a study that followed children from six months, a pattern of two naps a day was well established by nine to 12 months. The move to one nap usually comes after the first birthday.

Naps aren't just downtime. In experiments with six- and 12-month-olds, babies watched someone do something new with a hand puppet. Those who napped within a few hours afterward remembered it, and those who stayed awake mostly didn't. A 2025 review of this research found a small but real benefit of naps for memory in early childhood.

And here's a common myth: keep the baby up all day so they'll sleep better at night. In a study that tracked babies with activity monitors, at six months, a longer nap was followed by slightly longer night sleep, not shorter. For babies, sleep tends to beget sleep.

You've probably heard of the four-month sleep regression. Here's the honest status: it's a popular term, not a research one. I looked through the sleep research for this lesson and found no studies that define it or show that most babies go through it.

What researchers do see around three to four months is real change. The body clock has just switched on. Sleep itself is reorganizing: the adult-like stages of deeper sleep, with their brief bursts of brain activity called sleep spindles, appear at around three months. And babies are becoming far more alert and interested in the world.

Some babies do wake more for a while in this window. But rough patches aren't unique to four months. In a study that followed babies with activity monitors from three months to three and a half years, night waking wasn't a fixed trait. Which children woke most often kept changing from one age to the next.

So if sleep gets choppy around four months, it isn't a step backward. It's a brain under renovation, and it usually settles. Expect a zigzag, not a staircase.

This is one of the best-tested pieces of sleep advice we have.

In a randomized trial with about 400 mothers of babies and toddlers, half were asked to follow a simple nightly routine: a bath, a gentle massage, and quiet activities like a cuddle or a song, with lights out within about half an hour. After two weeks, those children fell asleep faster, woke less, and slept in longer stretches. Their mothers' mood improved too. A later study found that most of the change came in the first three nights.

A survey of more than 10,000 families in 13 countries and regions found a dose effect: the more nights a week families kept a routine, the better the children slept. And the pattern held across cultures.

What makes a routine work isn't any one step. It's short, it's calm, it's in the same order, and it happens most nights. Bath, pajamas, feed, a book or a song, and into bed is plenty. And yes, you can start in the early months. In a 2025 survey of parents of babies under four months, most already had a bedtime routine, and those babies slept in longer stretches.

You've probably heard the advice to put your baby down drowsy but awake. Here's what's behind it.

In a study that filmed babies overnight, by three months, babies who were put in the crib awake at bedtime were more likely to settle themselves back to sleep after waking later in the night. In a survey of more than 29,000 families across 17 countries and regions, whether a parent was present as the baby fell asleep was among the strongest predictors of how babies slept at night.

Now the realistic part. Most of this research is observational, and it likely runs both ways: babies who wake a lot pull parents in. Even at 12 months, one filmed study found that half of babies usually needed a parent's help to get back to sleep. In one recent study, about seven in 10 mothers of young babies usually fed them to sleep at bedtime, and about one in four put them down awake.

So think of it as practice, not a test. In the newborn weeks, feeding or rocking to sleep is normal and fine. From around three or four months, try putting your baby down a little awake at bedtime now and then. If it doesn't work tonight, help them to sleep and try again another night. And whether falling asleep alone is a goal at all is a family choice. It varies enormously across cultures.

In Lesson 1, we said tired cues are hints to test, not rules. Here's how to use them.

Pair the cues with the clock. Babies build up sleep pressure faster than adults do and clear it faster too, which is why young babies can only manage short stretches awake. That stretch grows across the year.

You'll see charts online of wake windows, precise minutes a baby should be awake at each age. They're rules of thumb from experience, not numbers from studies. I found no research testing them.

So make your own chart. For a few days, jot down when your baby falls asleep easily and when it's a struggle, along with how long they'd been awake and the cues you saw. Within a week or two, you'll usually see your baby's own pattern, and it will beat any chart.

Now the other person in this story: you.

A large German study followed more than 4,000 parents before and after a birth. Sleep hit bottom in the first three months. Mothers were sleeping about an hour less a night than before pregnancy, and fathers about 13 minutes less. And for first-time parents, sleep satisfaction still hadn't fully recovered six years later.

For many parents, the hardest part isn't the total hours. It's the breaks. One study that tracked mothers with activity monitors in the first four months found about seven hours of sleep a night on average, but so broken up that it resembled a sleep disorder.

And it matters. In a study of more than 700 couples, poorer sleep at six months predicted more symptoms of depression later in the first year, for mothers and for fathers. Trials that improved new mothers' sleep found small but real improvements in depressive symptoms.

So, practically: if there are two adults, try splitting the night so each person gets one protected stretch of several hours. Accept help with the night, not only the day. And if low mood or anxiety is building, the support lines from Module 1, Lesson 5 are there for you.

So what do you do with all of this? Look at the three practices on this slide.

A short routine, most nights. Same few steps, same order, calm. It's among the best-tested sleep advice there is, and it tends to work within days.

Down awake, sometimes. From around three or four months, practice at bedtime now and then. No pressure, and no failure if tonight isn't the night.

Guard one long stretch. For each adult, a few hours of unbroken sleep does more than the same hours in pieces. Plan the night like a shared job, because it is one.

Here's what to take with you. Sleep settles fastest in the first four months, as the body clock switches on, and every baby does it on their own schedule. Naps shift from many to about two, and they help babies remember what they learn. The four-month regression is a nickname for real brain changes, not a diagnosis. A short, calm routine is one of the best-tested tools you have. Putting down awake is something to practice, not pass or fail. And your sleep is part of your baby's care.

That's the end of Module 2. You've learned your baby's cues, their starting settings, and how to meet them at the two big daily events: feeding and sleep.

In Module 3, we turn to the relationship all of this builds: attachment. We'll start with what secure attachment really is, and what it isn't. I'll see you there.$t$),
    ('what-secure-attachment-is-and-isn-t', '69b8fa646c49035ee34bda67f31c1692', '11bbd171eb45480de4c3666a282ee562', $t$Welcome to Module 3. Everything so far, the cues, the feeding and sleep conversations, the thousands of small responses, adds up to something bigger: a relationship. Researchers call it attachment.

Attachment may be the most famous idea in child development, and one of the most misunderstood. So this lesson does two things. First, what secure attachment actually is, how researchers measure it, what builds it, and what it does and doesn't predict. Then, three myths that cause parents a lot of needless worry.

Two ideas from Module 1 will come up along the way: repair after a mismatch, from Lesson 3, and the finding that responding to crying doesn't spoil a baby, from Lesson 4. I'll name them when we get there rather than teach them again.

The idea comes from the British psychiatrist John Bowlby. He argued that babies are born with a built-in system for staying safe. When they're frightened, tired, sick, or hurt, they seek out a familiar, trusted person. Bowlby compared it to a thermostat: it switches on when something feels wrong, and switches off when the baby feels safe again.

His colleague Mary Ainsworth saw that a trusted person does two jobs. The first is safe haven: when your baby is upset, you're the place they come back to for comfort. The second is secure base: once they're settled, you're the place they head out from to explore.

You'll see both jobs in the second half of the year, once your baby can crawl. They set off across the room, glance back to check you're there, and keep going. If something startles them, they come back, get a cuddle, and set out again. That back and forth is attachment working as designed. Comfort and exploring aren't opposites. The comfort is what makes the exploring possible.

One more point for later: attachment describes a relationship, not a trait of the baby. The same baby can have a different kind of relationship with each person who cares for them. We'll pick that up in Lesson 2.

Most of what we know comes from a lab procedure Ainsworth designed in the 1970s, called the Strange Situation. It takes about 20 minutes, usually between 12 and 18 months. The baby plays in an unfamiliar room, a friendly stranger comes in, and the parent leaves twice, briefly, and comes back.

The key moment isn't the goodbye. It's the reunion. Researchers watch what the baby does when the parent returns.

Secure babies may or may not cry when the parent leaves, but when the parent comes back, they go to them, settle fairly quickly, and return to play. Babies classed as avoidant tend to look away or carry on as if nothing happened. Babies classed as resistant, sometimes called ambivalent, are very upset and hard to settle, reaching to be held and pushing away at the same time. And babies classed as disorganized show brief moments of confused or contradictory behavior, like freezing, or approaching and then backing away.

In 2023, researchers pooled more than 20,000 Strange Situations from over 280 studies. About half the babies were secure, about 15 percent avoidant, about 10 percent resistant, and about a quarter disorganized, with more insecurity in families under heavy stress.

Two things to take from those numbers. Insecure attachment is common. It's a pattern in a relationship, not a disorder. And the Strange Situation is a research tool for comparing groups. It was never meant to be a test that sorts one baby.

So what makes the difference? Ainsworth's answer was sensitivity: noticing your baby's signals, reading them accurately, and responding promptly and in a way that fits. It's the same noticing and responding we've been practicing since Module 1.

Decades of research back her up. A 2024 analysis combined 174 studies with nearly 23,000 families. More sensitive care went with more secure attachment, and the link was about the same size for fathers as for mothers.

Two details sharpen the picture. In a large American study, what mattered most at six months was sensitivity to distress: how parents responded when the baby was upset, more than how they played when the baby was content. That's the safe haven job.

And researchers have found a second ingredient, called mind-mindedness: treating your baby as a person with a mind, and talking about what they might be thinking or wanting. "You're looking at the dog. Do you want to see him?" Parents who do more of this tend to have more secure babies, even after accounting for sensitivity.

Now the honest part. The link between sensitivity and security is real, but modest. In statistical terms, sensitivity accounts for well under a tenth of the differences in security between babies. Add mind-mindedness, and together they still account for only about an eighth.

That's partly because both are hard to measure, and partly because security has many ingredients: stress in the family, support, the parent's own history, the baby, and plain chance. Temperament, by the way, has only a weak link to security. As we saw in Module 2, Lesson 2, a fussy baby isn't set up to be insecure.

Is sensitivity a cause, or just something that travels with security? Here we have experiments. A review of 70 intervention studies found that randomized programs helping parents read and respond to cues did improve sensitivity, and improved security by a smaller amount. The programs that changed parenting most tended to change attachment most. And the most effective used a moderate number of sessions and a clear, practical focus. The researchers called their paper "Less is more."

Remember the Dutch study from Module 2, Lesson 2, with the highly irritable newborns? Here's what else it changed. At 12 months, about three in five babies whose mothers had the coaching were securely attached, compared with about one in four of the others.

So the fair summary is this: how you respond matters, and it can be learned. But it's one ingredient, and no parent controls all of them.

What does secure attachment in infancy lead to? The best evidence comes from reviews that pooled many long-term studies.

Children who were secure as babies and toddlers tend to get along somewhat better with other children, and tend to have somewhat fewer behavior problems, like aggression and defiance. The links with later anxiety and low mood are smaller. There are also small links with language and thinking skills.

But these links are modest. When researchers reanalyzed two of the best-known long-term studies with methods registered in advance, and took family background into account, the associations shrank to small correlations.

And attachment itself isn't set in stone. Across early childhood, it's only moderately stable. Many children shift, in either direction, as life changes around them, though secure attachment is the most stable pattern of all.

So think of security as a head start, not a destiny, and insecurity as one risk factor among many, not a verdict. The relationship keeps being written for years.

Now the myths. The first is a mix-up of names. Attachment theory is the research we've been talking about. Attachment parenting is a popular parenting philosophy built around specific practices, like carrying the baby in a sling, sharing a bed, and breastfeeding for a long time.

The names sound alike, but attachment research doesn't prescribe any of those practices. Security grows from responsiveness, and you can be responsive with or without them.

Look at the evidence on the practices themselves. A review of breastfeeding and attachment found some studies linking longer breastfeeding with more security, but the effects were small, and the authors cautioned that more research is needed. On baby carriers, one small trial with young mothers found more secure patterns at seven months among those asked to carry their babies daily. Promising, but it was only a few dozen families. And sharing a bed conflicts with the safe sleep guidance from Module 1, Lesson 4: your room, not your bed.

If a sling or long breastfeeding works for your family, wonderful. If it doesn't, you haven't given up on security. You haven't skipped a required step, because there isn't one.

The second myth is that there's a bonding window right after birth, and if you miss it, the relationship is damaged.

The idea came from research in the 1970s suggesting that the first minutes and hours after birth were a special period for mothers to bond. It changed hospitals for the better: babies stopped being whisked off to nurseries as a matter of routine. But when researchers looked closely, the early studies had weak methods. A 1982 review in the journal Pediatrics concluded that early contact might bring modest short-term benefits, but no lasting effects had been shown.

Skin-to-skin contact after birth is still worth doing when you can. As we saw in Module 1, it helps newborns settle their breathing and temperature, and trials show it helps with breastfeeding. But helpful is not the same as necessary.

The clearest evidence comes from adoption. A review that pooled many studies found that children adopted before their first birthday were, on average, as securely attached as children raised by their birth parents. Their first hours, and often their first months, happened without their new parents. Attachment formed anyway.

So if your baby's birth involved a cesarean, a stay in intensive care, or simply exhaustion, you haven't missed anything that can't be built. Attachment grows across the whole first year, out of everyday care.

The third myth is that attachment is made or broken in a single moment: one rough night, one bad day, one week when you were sick, one time you lost your temper.

Attachment is built from patterns, not moments. A baby's expectations come from thousands of ordinary exchanges. As we saw in Module 1, Lesson 3, even close, happy pairs are out of sync most of the time, and repair after a miss is part of how trust grows. And as we saw in Lesson 4, answering your baby's cries doesn't spoil them. It's the safe haven, doing its job.

The same caution applies to labels. You may see quizzes online promising to reveal your baby's attachment style. In 2017, a large international group of attachment researchers published a joint statement warning against this kind of use. They stressed that the disorganized category doesn't reliably indicate mistreatment, isn't a fixed trait, and isn't a measure for judging an individual child. Even in the lab, classification takes trained, certified coders.

Your baby's attachment is not a score you can lose on a bad day. It's a story the two of you keep writing.

So what do you do with all this? Look at the three practices on this slide.

Be the harbor and the launch pad. When your baby is upset, comfort comes first. When they're settled and looking outward, let them go, and stay where they can find you with a glance.

Say what you think they're thinking. "You want the spoon." "That noise surprised you." You'll sometimes guess wrong, and that's fine. Guessing out loud keeps you reading your baby, and it's linked to security in its own right.

Count the pattern, not the moment. Missed cues, hard days, and short tempers happen in every family. What your baby learns comes from how things usually go, and from what happens after a miss.

Here's what to take with you. Secure attachment means your baby uses you as a safe haven when upset and a secure base for exploring. About half of babies are classed as secure in the lab, and insecurity is common and can change. Sensitive, responsive care helps build security, and experiments show it's a real cause, but a modest one among many. Security is a head start, not a destiny. And three myths can go: attachment parenting isn't required, there's no window at birth you can miss, and no single moment makes or breaks it.

In the next lesson, we'll widen the circle: fathers, partners, grandparents, and childcare, and what the large studies found about babies with many caregivers. I'll see you there.$t$),
    ('many-hands', '2046f505dfdfa8ecea51cf0f4653763b', 'd359d5063d6cb8b0de72474a5fd4facd', $t$Welcome back. In the last lesson, we saw that attachment describes a relationship, not a trait of the baby. This lesson follows that idea one step further: most babies have more than one relationship like that.

For most of human history, babies were raised by many hands: parents, grandparents, older siblings, neighbors. Today that circle might include a partner who shares the nights, a grandparent who helps on weekdays, and a childcare teacher who learns your baby's cues remarkably fast.

We'll look at how babies form several attachments, what fathers and partners bring, where grandparents fit, what the largest childcare study found, and how to choose care and help your baby settle in.

Babies don't have a fixed number of attachment slots. Over the first year, most form attachments to several familiar people, usually whoever gives them regular care and comfort.

And each relationship is its own. When researchers compared babies' attachment to their mothers and to their fathers across 14 studies, the two were only weakly linked. A baby can be secure with one parent and not the other, in either direction.

Babies form attachments to childcare providers too. A review of 40 studies with nearly 3,000 children found that secure relationships with care providers were common. They were about as common as with parents on some measures and less common on others, and they grew more likely the longer a child had been in that care.

So the question isn't whether your baby has room for more people. It's what each relationship is built from. And the answer is the one from the last lesson: time together, and responsiveness.

Most of the research on second parents is about fathers, so let's start there.

What builds a baby's security with a father looks a lot like what builds it with a mother. In one study that followed families from three months, babies were more likely to be securely attached to their fathers at a year when fathers had warmer, more responsive interactions with them early on, felt more positive about being a father, and simply spent more time with them.

And that relationship matters on its own. A review of 15 studies found that insecure attachment to fathers was linked with later behavior problems about as strongly as insecure attachment to mothers.

Fathers often bring something a little different, too. Across many studies, a large share of fathers' time with babies is play, often physical and lively, and that play has been linked with better social and emotional development. A review of long-term studies found that regular, direct engagement with the child, not just living in the same house, was what predicted benefits.

The research on other partners is much thinner, so I can't give you numbers. But the ingredients we've seen everywhere else, regular time and responsiveness, are the best bet for anyone who shares the care.

Here's why this matters. When researchers look at attachment to both parents together, a pattern keeps showing up.

In an American study that observed babies with each parent at 15 months, children who were insecure with both parents had more behavior problems years later, at school age. But children who were secure with at least one parent did about as well as those secure with both. Security with either parent offset the risk.

A 2022 analysis that pooled nine studies and more than a thousand children found a similar shape. Children secure with both parents had the fewest problems, and the risk was clearest when both relationships were insecure, or both were disorganized.

Not every study finds full protection, and the effects are modest. But the direction is consistent. A second secure relationship works like a backup. It's one of the best reasons for partners, grandparents, and other regular caregivers to be truly involved, not just helping out.

Grandparents are a big part of infant care. In a large English study of nearly 9,000 families, about four in ten children were regularly cared for by grandparents at 8, 15, and 24 months.

What does that care do? The research is mixed, and the effects are small either way. In that English study, the small differences seen at age four were mostly explained by differences between the families who used grandparent care, not by the care itself. A British study found children cared for by grandparents were a little ahead in naming objects and a little behind on some other tests.

What seems to matter more is how well the adults work together. A review of 22 studies from China, where grandparent care is very common, found that more grandparent care on its own went with somewhat poorer self-control in children. But when parents and grandparents cooperated well, children's self-control was better.

So think of it as a team, and teams work best when they agree on the basics. For example, every caregiver should know the safe sleep guidance from Module 1, Lesson 4, even if it's different from how things were done a generation ago.

Now childcare. The best-known research here is a U.S. study run by the National Institute of Child Health and Human Development. It followed more than 1,300 children from birth, some of them into adulthood. Families chose their own care, so the study watched real life rather than assigning anyone to anything.

First, attachment. At 15 months, childcare on its own, whether its quality, amount, starting age, or type, didn't predict whether babies were securely attached to their mothers. What did predict security was the mother's sensitivity. Risk showed up only in combination: less sensitive care at home together with poor-quality childcare, long hours, or several care arrangements at once.

Second, the bigger picture. Across the early years, family factors, like parents' sensitivity, the home environment, and income, predicted children's development more consistently than anything about their childcare. One chapter of the study's summary book puts it simply: families matter, even for kids in child care.

That doesn't mean childcare doesn't matter. Its quality does.

In the same study, higher-quality care, meaning warm, responsive, talkative caregivers, was linked with better language and early thinking skills at every age tested. And at age 15, it was still linked with somewhat higher achievement and fewer behavior problems. The effects were modest, but they lasted.

Hours mattered a little too. More hours in care went with slightly more behavior problems as rated by caregivers, and at age 15, slightly more impulsivity and risk-taking. Again, the effects were small, and they depended partly on what was happening at home.

Here's the sobering part. When researchers checked classes against professional standards for ratios, group size, and caregiver training and education, only about one in ten classes caring for six-month-olds met all four. And children whose classes met more of the standards did better at age three. Quality isn't automatic. You have to look for it.

So what should you look for? The research points to a few things.

First, the caregivers' responsiveness. Watch how they react when a baby cries, and whether they talk with babies during feeding and diaper changes. Across many studies, the quality of those everyday interactions predicts children's outcomes better than structural features on their own.

Second, few babies per adult, and small groups. The U.S. professional standard for babies under a year is about three babies per caregiver, in groups of no more than six. The research on exact ratios is thinner than you'd expect, but small groups give caregivers the chance to be responsive.

Third, stability. In one study, children who went through fewer changes of caregiver in their first three years had better social skills in kindergarten. Ask about staff turnover, and whether your baby will have one main person.

Whether it's a center, a family childcare home, a nanny, or a grandparent, the same questions apply. You're choosing people, not places.

Starting care is a big change, and the research is clear that it takes time.

In a study of 15-month-olds starting childcare in Germany, babies' stress hormone levels rose well above their home levels in the first days after their mothers left. In Norwegian studies of toddlers, stress levels were low while a parent stayed with them, peaked in the first weeks apart, and came back down by about three months. Children under about 14 months seemed to need longer.

The most useful finding: in that German study, babies' attachments to their mothers stayed secure, or became secure, when mothers spent more days settling them in, staying with them in the new setting at first.

And tears at drop-off aren't a bad sign. In a follow-up, babies who protested strongly on the first day alone were more likely to form secure relationships with their care providers later on. They were asking for help, and good caregivers answered.

So plan a gradual start, with you there for the first several days if you can. Expect tired, clingy evenings for a few weeks. And how to say goodbye is coming up in the next lesson.

So what do you do with all this? Look at the three practices on this slide.

Give each person real time. Every adult who shares the care builds their own relationship the same way: regular time alone with the baby, including the hard parts like soothing and bedtime, not only the fun parts.

Agree on the basics. Parents, grandparents, and caregivers don't need identical styles. But the team should share the essentials, like safe sleep and the feeding plan, and back each other up.

Choose people, then go slowly. Judge care by how the adults respond to babies. Then phase in gradually, with you there at the start.

Here's what to take with you. Babies form several attachments, and each one is its own relationship. Fathers and partners build security the same way mothers do, and a second secure relationship is a real buffer. Grandparent care works best when the adults work as a team. In the largest childcare study, childcare didn't weaken babies' attachment to their mothers, family mattered most, and quality mattered too. And a gentle, gradual start helps.

In the next lesson, we'll look at something that often shows up around the same time as childcare starts: separation distress and stranger wariness, why they appear, and how to handle goodbyes. I'll see you there.$t$),
    ('separation-and-stranger-wariness', '68c4633d6341cbd3fbf05665bf872d41', '9c02e41488461408f1ea84c667f555b4', $t$Welcome back. Somewhere in the second half of the first year, many parents notice a change. The baby who went happily to anyone now cries when Grandma reaches for her. And the same baby wails when you step out of the room for ten seconds.

It can feel like a step backward. It isn't. In this lesson, we'll look at when separation distress and fear of strangers appear, why they appear, what they say about your baby, how to say goodbye, how to introduce new people, and how long the phase usually lasts.

Let's start with timing. Reviewing the early research, the psychologist Alan Sroufe concluded that clearly negative reactions to strangers are rare in the first half year, become common by eight or nine months, and grow more frequent through the rest of the first year.

One small study visited 14 babies at home every month from four to 12 months. Every one of them showed distress toward a stranger at some point, and the average age it started was eight months.

Separation distress follows a similar clock. In a study that briefly separated babies from their mothers every two months, crying rose sharply at about nine and a half months, and again at about 13 and a half. Babies in daycare and babies cared for at home showed the same pattern.

And it isn't a Western quirk. In rural Bangladesh, a study of 185 babies, many in poor health, found the same rise in protest toward the end of the first year. The timing varies from baby to baby, but the pattern shows up almost everywhere it's been studied.

Why then? Two things come together in the second half of the year.

The first is memory. As we saw in Module 1, Lesson 5, young babies remember a lot. What changes later in the first year is the ability to call up a memory and compare it with what's in front of them. In a small study that followed babies from five to 14 months, researchers saw a big jump in that ability in the second half of the first year. Now your baby can notice that the face in front of them doesn't match the faces they know. And they can notice that you were here, and now you're not.

The second is attachment. By this age, most babies have formed specific attachments to the people who care for them. You're no longer just a helpful adult. You're their person. So losing sight of you matters in a way it didn't at three months.

It also tends to arrive around the time many babies start to crawl, which we'll come back to in Module 4, Lesson 2.

So here's the reframe. Separation distress means your baby's memory is working, and that they know exactly who their people are. It's a milestone, not a problem.

Researchers learned not to treat crying at separation as a measure of how strong the bond is. In classic studies from the 1970s, how much a baby protested depended heavily on the situation, like being left with an unfamiliar person in an unfamiliar room, rather than on how attached they were.

What tells you more is the reunion. In a classic home study, babies of more responsive mothers actually protested less at everyday comings and goings, and greeted their mothers more happily when they came back. As we saw in Lesson 1, it's the reunion, not the goodbye, that researchers watch most closely.

Even a sober stare at a stranger is useful. Researchers found that babies' quiet wary behaviors, like looking away, help them keep from getting overwhelmed, so they can stay calm and warm up later. That's your baby regulating, not rejecting anyone.

Being wary isn't a switch that flips on. It changes a lot with the setting.

In one study, babies left with a stranger in a lab cried about three times as long as babies left with a stranger at home. In another lab study, babies protested less when a parent left through an open door than a closed one. The place, the distance, and whether a parent is nearby all change the reaction.

So does the stranger's behavior. When a stranger approached slowly and spent the first minutes talking to the mother, one-year-olds looked and smiled at them more. And in another study, one-year-olds with strangers who talked, gestured, and offered toys fussed less and played more than with strangers who just sat and smiled.

Here's my favorite finding. When strangers walked up to eight-month-olds and their mothers, the mothers showed more of the classic wary behaviors than the babies did. Caution with people we don't know isn't a baby thing. It's a human thing.

Now, goodbyes. The research here is mostly observational, but it points in a consistent direction.

In a study of parents dropping children off at a nursery school, parents of toddlers were the most likely to hover and to sneak out of the room. And the parent behaviors linked with more crying were long, drawn-out goodbyes and sneaking out. Over the school year, parents left more quickly, and children protested less.

A study that watched mothers leaving babies at childcare, from the first day on, found something similar. Repeated, predictable goodbye rituals went with less stress. And babies cried more when mothers stayed on to chat with the caregiver after saying goodbye.

One caution: these studies show links, not causes. Babies who are more upset may also make parents linger. But the likely reason sneaking out backfires makes sense. If you can vanish without warning, your baby has to keep checking that you're still there.

So the pattern that fits the evidence: say goodbye, say you'll come back, hand your baby to someone they know, and go. Keep it short and the same every time.

Before big separations, practice small ones, at home, where it's easiest.

Tell your baby you're going to the kitchen, keep talking as you go, and come back. Over and over, your baby learns two things: you leave, and you return.

And notice who's in charge of the leaving. In a classic study, ten-month-olds freely crawled away from their mothers into a new room to explore. Babies who protest when you walk away will happily leave you on their own terms. That's the secure base from Lesson 1 at work. Give your baby lots of chances to do the leaving.

At this age, babies are also starting to hold people in mind when they're gone. That ability keeps growing into the toddler years, and it's a big part of why this phase eventually eases.

Now, the holiday gathering. The research gives you a clear plan: let your baby set the pace, and let them watch you first.

Babies use your reactions to read new people. In one study, ten-month-olds were friendlier to a stranger after their mothers spoke positively to them about that person. In another, about half of ten-month-olds looked to their mother with a puzzled face when a stranger appeared. Babies whose mothers answered with a positive message were more positive with the stranger.

It works the other way too. When mothers were trained to act nervous around a stranger, one-year-olds became more fearful and avoidant. And in a study of Hong Kong families, toddlers whose mothers pushed them toward strangers became more fearful of strangers over the next six months, while gentle encouragement had the opposite effect.

So greet the relative warmly while you hold your baby. Ask them to talk to you first, come down to the baby's level, maybe offer a toy, and wait for your baby to reach. If your baby warms up slowly, as we saw in Module 2, Lesson 2, that's their setting, not a failure. Hugs can wait.

How long does this last? It varies a lot. In general, separation protest climbs through the end of the first year and is often strongest around the first birthday and in the months after. Most children ease up through the toddler years, as they gain language and learn from experience that you come back.

How wary babies are of strangers doesn't follow one curve for everyone. In a study of more than 1,200 twins followed from six months to three years, researchers found four different paths, including babies whose fear climbed steeply and babies whose fear stayed high from early on.

Your responsiveness helps. In two longitudinal studies, babies of more sensitive mothers showed less fear, or a slower rise in fear, across the first year. You can't skip this phase, but you can soften it.

When should you check in with your pediatrician? If the fear keeps getting stronger instead of easing into the toddler years, if your child is very distressed even in calm, familiar situations, or if it gets in the way of everyday life, it's worth a conversation.

So what do you do with all this? Look at the three practices on this slide.

Say goodbye, then go. A short, predictable ritual, a promise to come back, and a clean exit. No sneaking out, no long lingering.

Be the bridge. Greet new people warmly yourself, let them approach slowly, and let your baby decide when to reach. Don't pass your baby around before they're ready.

Read the reunion. Protest at goodbye is normal. A happy return, and a baby who settles back with you, is the sign to look for.

Here's what to take with you. Separation distress and fear of strangers usually show up around eight or nine months, almost everywhere in the world. They appear because your baby can now remember and compare, and because they've formed real attachments. They depend a lot on the setting, they often peak around the first birthday, and they ease through the toddler years. Short, honest goodbyes, slow introductions, and warm reunions help most.

That's the end of Module 3. You've seen what secure attachment is, how babies build it with many people, and why the tears at goodbye are part of that story.

In Module 4, we turn to the explorer your baby is becoming, starting with language before words. I'll see you there.$t$),
    ('language-before-words', 'e95c39422ba09dfb685ec4fceec5241b', '8298508163a81fc946f3afcc1e181a0b', $t$Welcome to Module 4. Across this module, your baby becomes an explorer: talking, moving, and playing their way into the world. We start with language, long before the first word.

You've already seen the beginning of this story. Newborns know the rhythm of the language they heard in the womb. Over the first year, their ears tune to that language. And back-and-forth conversation is one of the strongest things you can give them. This lesson picks up from there.

We'll follow babbling as it grows, look at one milestone worth checking, see how your answers shape your baby's sounds, and then turn to gestures, pointing, shared attention, understanding words before saying them, and books.

Babies make a lot of sounds that aren't crying. In all-day home recordings, speech-like sounds outnumbered cries by at least five to one across the first year. Your baby is practicing, most of the day.

The practice follows a rough order. In the first couple of months, there are soft, vowel-like sounds and, by two or three months, cooing. From about four to six months comes a play stage: squeals, growls, raspberries, yells, and whispers, as babies test what their voice can do.

Then, usually somewhere between six and ten months, comes the big change: canonical babbling. That's real syllables, a consonant and a vowel with adult-like timing, often repeated. Bababa. Dadada. Nanana.

Toward the end of the year, babble gets more varied, like badagu, and starts to carry the melody of your language, rising and falling as if your baby were telling you something. The ages vary a lot from baby to baby. The order is what's consistent.

Of everything in this lesson, there's one milestone worth watching for: real syllables, like bababa, by about ten months.

What counts is a clear consonant joined to a vowel: ba, da, ma, na, ga, repeated or on its own. Squeals, raspberries, and long vowel sounds are wonderful, but they don't count yet.

In a study that followed babies with normal hearing and babies with severe hearing loss, every hearing baby started canonical babbling by ten months, most often around seven. None of the deaf babies started before eleven months, and most started much later. The two groups didn't overlap at all. The researchers concluded that an otherwise healthy baby with no real syllables by about eleven months should have their hearing checked.

Hearing isn't the only reason babbling can start late. In a screening of more than 3,000 infants with medical risk factors, babies whose canonical babbling started late had smaller vocabularies at 18, 24, and 30 months.

And you're well placed to notice. Parents turn out to be remarkably accurate at recognizing real babbling. So if your baby isn't making these sounds by about ten months, mention it to your pediatrician and ask about a hearing check. A passed newborn hearing screen doesn't rule out hearing problems that start later, like fluid from ear infections. Late babbling isn't a diagnosis. It's a reason to look.

In Module 1, Lesson 3, we saw why back-and-forth matters. Here's what it does to babbling specifically.

In a study by Michael Goldstein and colleagues, mothers of eight-month-olds were asked to respond to their babies' babbling either right away, smiling, touching, and moving closer, or at random times not linked to the baby's sounds. Babies who got timely responses started producing more mature, more speech-like syllables. Babies who got the same amount of attention at random times did not.

In a follow-up with nine-and-a-half-month-olds, babies whose mothers answered their babble with words began using the sound patterns of those words in their own babbling.

Babies babble most when they're playing on their own. But in all-day recordings, their most speech-like syllables came during back-and-forth turns with an adult.

Babbling also changes how you talk. Across thirteen languages, caregivers answered babies' babble with shorter, simpler sentences, the kind that are easier to learn from. Your baby's babble invites the simpler talk they need.

So treat babble as a bid. Answer it promptly, with a smile and a few words, and leave a pause for your baby to answer back.

Babies understand words long before they say them, and earlier than researchers once thought.

In one study, six-month-olds were shown videos of their own mother and father side by side. When they heard mommy, they looked at mom. When they heard daddy, they looked at dad.

In a 2012 study, babies from six to nine months, shown two pictures while a parent named one, looked at the named picture more often for common foods and body parts, like banana, mouth, and hand. A word's meaning was starting to stick months before they could say it.

An honest note: some studies in other languages found this early understanding was weaker or showed up a little later, and understanding improves sharply around fourteen months. The safe takeaway is that babies are quietly building a vocabulary through the second half of the year.

When words do come, many of the first ones aren't names for things. Words like hi, uh-oh, more, and all gone, tied to daily routines, are often among the earliest. And early words are often approximations. If your baby says ba every time they want the ball, that's a word.

On the parent checklists researchers use, babies understand many more words than they say, and the range between babies is wide. So talk about what's in front of your baby, even when they can't answer yet. They're listening.

Before words, babies talk with their hands. As we saw in Module 2, Lesson 1, by the end of the year many of your baby's signals are deliberate. Here are the most important ones.

Showing and giving usually come first, around ten months: your baby holds up a toy so you can see it, or hands it to you. Then, around the first birthday, comes pointing with the index finger.

There are two kinds of points. One says, give me that. The other says, look at that. The look-at-that point, sharing interest just to share it, is the one most tied to language.

Babies' gestures predict their words. In a study that recorded families at home, the number of gestures children used at 14 months predicted their vocabulary at three and a half, even after accounting for how many words they and their parents were already using.

How strong is the link? A 2010 analysis of 25 studies found a moderate link between pointing and later language. A stricter 2022 analysis found a smaller one. Pointing is a real signal, but it's one piece of the picture.

What matters most may be what happens next. In a study of nine- to 11-month-olds, babies' points often drew a spoken response from caregivers, and those responses were linked with larger vocabularies years later. Babies' bids that got no response at all went with smaller vocabularies.

And in a study of 18-month-olds, toddlers learned a new word better when it named something they had just pointed at. A point is your baby saying, I'm ready to learn about that.

Your points count too. In a small trial, parents coached to use more look-at-that points with their 10- to 12-month-olds did so, and those points predicted how many words their children understood at 18 months.

So when your baby points, look where they're pointing, then name it. Dog. A big dog. He's running.

Pointing is one part of something researchers call joint attention: you and your baby looking at the same thing, and both knowing it.

Around 10 or 11 months, babies start following your gaze to see what you're looking at. In one study, babies who followed gaze well at that age grew their vocabularies faster through age two.

But the most useful finding is about who leads. In a classic study, when mothers named things their toddlers were already looking at, the children had larger vocabularies. When mothers tried to redirect attention to something else, it worked against learning. Later studies with infants found the same pattern. In a 2024 study of 14-month-olds, a new word stuck best when the parent named an object right as the baby chose to look at it, and the parent was looking too.

Not every study agrees on how important joint attention is, and babies can learn words without it. But following your baby's lead costs nothing. Watch what they're looking at, and name that.

Books are one of the easiest ways to get all of this in one place.

In a national study of more than 9,000 Irish families, babies who were read to at nine months had larger vocabularies at age three, even after accounting for family background and other reading and language activities at home. In home recordings, book sharing drew out more talk from both parents and babies than other activities.

An honest note: the trials testing book-sharing programs show real but modest effects, and smaller ones in the most careful studies. Books aren't magic. They're a reliable way to start a conversation.

With a baby, reading isn't about finishing the story. In one study of 10-month-olds, asking questions and keeping the baby interested predicted language at 18 months. So point and name. Let your baby turn pages, pat the pictures, and yes, chew the corners. A few minutes, often, beats one long session.

So what do you do with all this? Look at the three practices on this slide.

Answer the babble. When your baby makes a sound at you, respond right away with a smile and a few simple words, and leave a pause for their turn.

Name what they notice. When your baby looks at, points at, or holds up something, look where they look, and name it. Follow their lead instead of redirecting.

Share a book, a little, often. Board books, short sessions, lots of pointing and naming. And keep an ear out for real syllables, like bababa, by about 10 months.

Here's what to take with you. Babbling grows from coos to real syllables, and bababa by about 10 months is the one milestone worth checking. Your timely answers shape your baby's sounds. Babies understand words months before they say them. Gestures and pointing come first, and naming what your baby points at helps words stick. And books are an easy way to bring it all together.

In the next lesson, we'll follow your baby on the move: motor milestones, tummy time, and how moving changes everything around them. I'll see you there.$t$),
    ('on-the-move', '933fea06a2f9896eba8197d3f55be4ef', '3bf95a0b8ad54813a7b435cd608f84df', $t$In the last lesson, we followed your baby's voice. Now we follow their body: rolling, sitting, crawling, cruising, and those first steps.

Moving isn't just a physical milestone. Each new way of getting around changes what your baby sees, what they're careful about, and even how the people around them talk.

We'll look at milestones as wide windows, why tummy time matters and what to do when your baby hates it, floor time versus seats and walkers, how crawling changes fear, and how walking changes the conversation.

Let's start with the ages. The World Health Organization followed more than 800 healthy babies in Ghana, India, Norway, Oman, and the United States, checking every month to see when six motor milestones arrived.

The answer was wide windows. Sitting without support arrived anywhere from about four to nine months. Crawling on hands and knees, from about five to 13 months. Walking alone, from about eight months to nearly 18. That's a window almost 10 months wide, for healthy babies.

The order was common but not fixed. About 4% of babies never crawled on hands and knees at all. Some scoot on their bottoms, some roll, and some go straight to pulling up. And there were no consistent differences between boys and girls.

Practice matters too. In a study of five-month-olds in six cultures, about a third already sat on their own, some for 20 minutes or more, and their everyday chances to practice sitting varied widely. In Tajikistan, where babies traditionally spend long hours bound in a cradle, motor skills arrive later. Yet by four or five years, those children's skills matched American norms.

So when should you check? The far edge of each window is when nearly all healthy babies, 99 in 100, had that skill. If your baby is past the end of a window, or loses a skill they had, talk to your pediatrician. If your baby was born early, ask about counting from their due date.

Since babies started sleeping on their backs, which, as we covered in Module 1, Lesson 4, is the safe way to sleep, they spend less time on their tummies. Tummy time is the awake, supervised fix.

A 2020 systematic review pulled together 16 studies with more than 4,000 babies in eight countries. Tummy time was linked with better gross motor and overall development, with rolling and crawling, with healthier weight, and with fewer flattened heads. Most of the studies were observational, so the evidence is consistent rather than airtight.

In a Canadian study that followed 411 babies, those with more tummy time in the first six months reached all six of those milestones earlier. And when researchers measured muscle activity, lying on the tummy worked a baby's back muscles hardest, while a car seat worked the neck muscles least.

Then there's head shape. In a study of two-month-olds in Calgary, nearly half had some flattening, though most cases were mild. Flattening tends to peak around four months and then improves. In one study that followed babies, only about three in a hundred still had it at age two.

Two habits help: plenty of awake tummy time, and switching the way your baby's head faces, by alternating which end of the crib you lay them at and which arm you hold them in. If your baby always turns their head the same way, mention it to your pediatrician. A tight neck muscle is common and treatable.

Guidelines from the World Health Organization suggest at least 30 minutes of tummy time a day for babies who aren't crawling yet, spread across the day. You can start in the first days home, a minute or two at a time.

Many babies protest at first, and that's normal. In the Canadian study, babies liked tummy time more and more over the first six months, and their tummy sessions got longer and more frequent. Early fussing doesn't mean it isn't working.

So make it easier. Lay your baby on your chest while you recline. Get down on the floor at eye level, where your face is the best toy there is. Try a rolled towel under their chest. Do short bursts after diaper changes. And stop before a full meltdown, then try again later.

Always on a firm surface, always awake, and always with you watching. When your baby gets sleepy, they go on their back in their own sleep space.

Car seats, bouncers, swings, and activity centers are useful. The question is how much of the day they take up.

In one survey, parents reported that their babies spent about five hours a day in seats and other containers. More container time was linked with lower fine motor scores, though not with most other areas of development. In the Canadian study, more time strapped in was linked with later supported walking. And in an earlier study, babies who spent more time in equipment had lower motor scores at eight months.

These are correlations, and reviews find that the delays are usually small and temporary. Most babies still walk within the normal range. But the floor is where babies practice, and every hour in a seat is an hour without that practice.

A sensible rule from the guidelines: while your baby is awake, avoid keeping them strapped in for more than an hour at a time. And seats aren't for sleep. If your baby falls asleep in a swing, a bouncer, or a car seat outside the car, move them to a flat sleep space.

One piece of gear deserves its own slide: the sit-in baby walker, a seat on wheels.

From 1990 to 2014, an estimated 230,000 American children under 15 months were treated in emergency rooms for walker injuries. Nine in 10 involved the head or neck, and three in four came from falling down stairs in the walker.

A safety standard in 2010 helped, and injuries have dropped. But in one hospital series, an adult was watching in most cases. A walker lets a baby move faster than you can react, and reach things like hot drinks.

And despite the name, walkers don't teach walking. Some studies found that walker users sat, crawled, and walked later. Others found no delay, just differences in how they walked. The development evidence is mixed. The injury evidence isn't. The American Academy of Pediatrics has called for a ban on their sale.

If you want a baby station, a stationary activity center is the safer choice, within that one-hour guideline. Or simply the floor.

Here's where moving gets interesting. In the classic visual cliff studies, babies are placed on a glass table that looks like it drops away. Joseph Campos and colleagues found that age didn't predict caution at the edge. How long a baby had been moving on their own did.

Even babies who couldn't crawl yet became more cautious at heights after practice driving a small powered cart. Moving seems to teach babies to read how the world flows past them, and that builds the caution.

Babies also see a different world. When 13-month-olds wore tiny eye-tracking cameras, crawlers mostly saw the floor. Walkers saw the room, and looked straight at their caregivers. Crawlers had to stop and sit up to see a parent's face.

An honest note: researchers debate whether this is true fear or simply learning what's safe. And some studies found that new walkers stepped over drop-offs they had avoided as crawlers, as if they had to learn it again on two feet.

Either way, crawling brings a lot of change at once. In Module 3, Lesson 3, we saw that fear of strangers often shows up around the same time. For you, that means two practical things: babyproof as soon as your baby is mobile, and keep the stair gates up through the early walking months.

Before walking alone, most babies spend months pulling up and cruising along furniture. In one study, babies who did more of this on their own terms, cruising or pushing a sturdy push toy, walked independently sooner.

Then come the first steps, and a lot of practice. In a study that recorded toddlers at free play, 12- to 19-month-olds averaged about 2,400 steps and 17 falls an hour.

Those falls are mostly small. In a study of more than 500 toddler falls in a playroom, babies fussed after only about 1 in 25, and they were back to playing within seconds.

Why give up fast, skilled crawling for wobbly walking? New walkers already traveled farther and faster than expert crawlers, with about the same number of falls. And how well a toddler walks depends more on how long they've been walking than on their age.

So give your new walker room, a safe floor, and lots of chances. The falls are part of the practice.

Here's the part most parents don't expect. When babies start walking, the conversation around them changes.

In a study of 13-month-olds filmed at home, walkers were more likely to pick up a toy, carry it across the room, and hand it to their mother. Mothers answered these moving bids with more action words, like open it, or put it in. And when crawlers made moving bids, their mothers answered the same way. It wasn't walking itself. It was what walking let babies do.

After babies begin walking, their gestures grow faster, and they combine them with movement, walking over to show you something. In another study, mothers used about twice as many movement words, like come, bring, and go, with walkers as with crawlers of the same age.

Some studies also found that walkers understand and say more words than same-age crawlers, in the United States and in China. Others found the link fades, or that pointing matters more. So don't rush walking. Just notice what it brings.

When your baby carries something over to you, that's a bid. As we saw in the last lesson, answer it: name it, and say something about it.

Here are three things to take with you.

Think in windows. Milestones arrive across wide ranges, and practice matters. Check in with your pediatrician if your baby is past the end of a window or loses a skill.

Floor first. Tummy time from the start, in short, frequent bursts, building toward 30 minutes a day. Keep stretches in seats under an hour, and skip the sit-in walker.

Follow the mover. When your baby crawls or walks over with something, get down to their level and answer. And babyproof one step ahead of them.

Moving changes what your baby sees, what they're careful about, and how you talk to each other. Your job isn't to speed it up. It's to give them the floor, and to meet them there.

In the next lesson, we'll turn to play: what babies understand about hidden objects, why peekaboo is so powerful, and which toys actually help. I'll see you there.$t$),
    ('play-and-the-hidden-toy', '40b05ed79034322500793df2f5c709b6', '5ec34e774c432e076ba7658f0bed2f9e', $t$Welcome back. In the last lesson, your baby got moving. Now we follow what they do when they get there: they play. And one of their favorite discoveries is that things can disappear, and come back.

In this lesson, we'll look at what babies understand about hidden objects, why scientists have argued about it for decades, why peekaboo is so powerful, how play changes across the year, and which toys, and how many, actually help.

Let's start with a classic. Nearly a century ago, the Swiss psychologist Jean Piaget noticed that if he hid a toy under a cloth while a young baby watched, the baby didn't lift the cloth to find it. Until about eight months, it was as if the toy had stopped existing.

Piaget also described a stranger mistake. Hide a toy under cloth A a few times, and an eight- to 12-month-old finds it every time. Then, while the baby watches, hide it under cloth B. Many babies reach right back to A.

This error is real and well replicated, but it depends on the details. In one study that tested babies every two weeks, how long a baby could wait before the mistake kicked in grew from under two seconds at seven and a half months to more than 10 seconds at 12 months.

Piaget concluded that young babies don't yet know objects keep existing. That idea stood for decades. Then researchers found a different way to ask.

Babies look longer at things that surprise them. So in the 1980s, researchers showed babies a screen that swung up and over, like a drawbridge. Then they placed a box behind it. In one version, the screen stopped when it reached the hidden box. In the other, it seemed to swing right through the space where the box should be.

Five-month-olds looked longer at the impossible version, and in a follow-up, so did some three-and-a-half-month-olds. The conclusion: months before they search, babies seem to expect a hidden object to still be there.

Other studies pointed the same way. In one, eight-month-olds who made the reaching mistake after just a few seconds still seemed to remember where a toy was hidden after more than a minute, when the test only asked them to look. So knowing where something is and reaching for it may be two different skills.

Not everyone was convinced. Other teams argued that babies were simply looking longer at more motion, or at whatever was new or familiar, not at what was impossible. When one group repeated the drawbridge study with no box at all, babies still looked longer at the bigger swing.

So in 2024, researchers pooled 76 studies with nearly 1,900 babies from three to 12 months. Babies did look longer at unexpected events. The effect was real but small, it grew with age, and it was separate from simple novelty.

Newer methods add to the picture. In one recent study, babies' pupils widened when a hidden toy unexpectedly vanished, at 10 and 12 months.

A fair summary is this. Babies build expectations about hidden objects gradually over the first year. Early on, those expectations are fragile and easy to miss. Searching for a hidden toy takes more: memory, planning, and holding back a habit. Piaget saw something real. He likely set the starting point too late.

Why does surprise matter? Because babies learn from it.

In a 2015 study, 11-month-olds watched a ball do something impossible, like roll through a solid wall, or something ordinary. Afterward, babies learned new things about the surprising ball more easily, and explored it more.

And they explored like little scientists. Babies who saw a ball pass through a wall banged it on the table, as if testing whether it was solid. Babies who saw a ball roll off a ledge without falling dropped it, as if testing whether it would fall.

In another study, babies who reacted most strongly to impossible events at 11 months were more curious at age three.

So the banging, dropping, and throwing that fills the end of the first year isn't just mess. It's experimenting.

Which brings us to the most famous hiding game of all. Parents play peekaboo around the world, from Japan to rural South Africa, with different words and the same rhythm: hide, build suspense, and reveal.

Babies tune in to its structure early. By four months, babies smiled more at a well-organized peekaboo game than at a jumbled one, and they were already taking their turns in the game.

In one clever study, six- to eight-month-olds played peekaboo where, on trick trials, a different adult reappeared, or the same adult popped up in a different spot. Babies smiled less on the tricks. They weren't just enjoying a face. They expected that particular person, in that particular place.

Peekaboo is a hidden-object test with a laugh built in. It's also a gentle rehearsal of a lesson from Module 3, Lesson 3: people go away, and they come back.

Watch how the game changes. In a study that observed families at home at six, eight, and twelve months, babies moved from enjoying games to running them. By twelve months, they started games themselves and played active roles.

Babies also do more inside a game than they can do on a test. In one study, babies uncovered a hidden face or toy during peekaboo with a parent before they did the same thing on a formal cognitive test.

So let the game grow with your baby. Early on, hide your face behind your hands. Around six to eight months, try a cloth over a toy, half hidden, then fully hidden. Near the end of the year, hide a toy under a cup, let your baby pull the cloth off your head, and hand the cloth over so they can hide from you.

Peekaboo is one kind of play. Play with objects changes just as much.

At around seven months, babies explore one object at a time: turning it, looking closely, and mouthing it. Mouthing is real exploration. Babies often mouth an object and then look at it, gathering information.

Toward the end of the year, babies begin relating objects to each other: putting one thing in another, banging two blocks together, stacking. And around the first birthday, functional play appears: holding a cup to their mouth or a brush to their hair, using things the way they're meant to be used.

Short bursts are normal. In home recordings of 13-month-olds, play with any one object typically lasted about 10 seconds, moving across dozens of toys and everyday things, for most of the day. That's not a short attention span. That's how babies learn what objects do.

Since everything goes in the mouth, keep anything small enough to choke on out of reach.

Now the toy aisle. Many toys for babies light up, talk, and sing. Do they help?

In a study that recorded families at home, 10- to 16-month-olds played with three sets: electronic toys, traditional toys like blocks and puzzles, and books. With electronic toys, parents said fewer words, there were fewer back-and-forth turns, and parents responded less to their babies. Babies also vocalized less than with books.

Other studies found similar patterns. With a traditional shape sorter, parents used more words about shape and space than with an electronic one. Talking toys can hold a baby's attention longer, but babies directed fewer sounds and gestures to their parents.

An honest note: these studies are small, and they measure talk during play, not long-term outcomes. Electronic toys aren't harmful. They just tend to do the talking, so you do less of it. And as we saw in Module 1, Lesson 2, products promising a smarter baby don't hold up.

How many toys? Fewer than you might think.

In one study, toddlers played in a room with either four toys or 16. With four, they played longer with each toy and found more ways to play with it.

In another, 12-month-olds and their mothers played with either five toys or 12. With five, their shared attention lasted longer, and it more often started with the mother following the baby's interest.

And babies play with everything: wooden spoons, pots, boxes, and lids. You don't need more toys. Try keeping a few out and rotating the rest.

The last piece is you. When parents play, it's tempting to teach.

In one experiment, mothers of six-month-olds were told partway through play either to teach their baby something or to learn something from their baby. Mothers told to teach became more controlling and adult-led. Mothers told to learn did not.

Following tends to work better. One-year-olds played at a more advanced level when they and their mother were sharing attention on the same toy. And in home recordings, when mothers joined their baby's play, touching the toy, gesturing, and talking about it, babies played longer and in more complex ways.

That doesn't mean never redirecting. Some studies find that a well-timed redirection, especially when a baby has wandered off, can help. But as a default, watch first, join in, and add a word. As we saw in Lesson 1, naming what your baby is already focused on is one of the best things you can do.

Here are three things to take with you.

Play hide-and-find. Peekaboo, a toy under a cloth, a toy under a cup. Let the game grow, and let your baby take a turn hiding.

Keep toys simple and few. Blocks, cups, balls, books, and kitchen things. Put most toys away and rotate a few.

Join, don't steer. Watch what your baby is doing, do it with them, and add a few words. When they bang, drop, and throw, they're running experiments.

Your baby is figuring out one of the biggest ideas there is: the world keeps going when they can't see it. Every round of peekaboo, every dropped spoon, every toy found under a cloth adds to it.

In the next lesson, our last, we'll look at what the research says about screens for babies, and then step back to see the whole first year together. I'll see you there.$t$),
    ('screens-and-the-year-ahead', '29ae88096ca3b5b56f8118f7303577b2', '6fb308c8101295b228c1ff74466af9a6', $t$Welcome to our final lesson. In the last one, your baby played, and discovered that things can disappear and come back. Now we turn to something found in almost every home with a baby: screens.

In this lesson, we'll look at what babies can and can't learn from a screen, what a TV playing in the background does, why video chat is different, and what a realistic middle ground looks like. Then we'll step back and look at the whole first year together.

Let's start with the most consistent finding. Babies and young children learn less from a person on a screen than from the same person in the room. Researchers call this the video deficit.

In Module 1, you met the clearest example: babies held on to the sounds of a new language when a real person played with them, and learned nothing when the same person was on a screen.

That wasn't a one-off. A large review pooled 59 reports on children up to age six, covering copying actions, learning words, and finding hidden toys. On average, children learned noticeably less from video, and the gap was widest in the youngest children, shrinking as they grew. The authors cautioned that some studies may overstate the gap, but the direction holds.

Part of the reason, researchers think, is that a screen can't do what you do. It can't follow your baby's gaze, wait for their turn, or answer them. That back-and-forth seems to be how babies tell that something is meant for them.

Then came the products. Videos made for babies promised a head start with words, so researchers tested them.

In one study, 12- to 18-month-olds watched a popular word video several times a week for a month at home. They learned no more of its words than babies who never saw it. The most learning happened in a group with no video at all, where parents simply taught the same words during everyday routines. And parents who liked the video tended to think their baby had learned more than they had.

Other trials agree. Twelve- to fifteen-month-olds who watched a word video for six weeks gained no more words than others. And in a seven-month trial of a program that claimed to teach babies to read, the babies didn't learn to read, even though many parents were sure they had.

An honest note: one trial found a small gain in words babies understood, though not in words they said. Across the trials, the fair summary is that baby videos teach very little.

Most of the screen time babies get isn't a baby show. It's a TV on in the room while they play. In one survey, most mothers said the TV was on during play at least half the time.

Does it matter if no one is watching? In a classic experiment, one-, two-, and three-year-olds played for an hour, with an adult game show on for half of it. They glanced at it for a few seconds at a time, less than once a minute. Even so, their bouts of play got shorter and their focus dropped.

The same pattern showed up in babies as young as six months. The TV kept catching their attention without holding it, and it broke up their focus on toys.

It changes the adults too. With background TV on, parents talked less, used fewer different words, and played with their children less.

So here's the simplest change in this lesson: when no one is watching, turn it off.

What about screen time over months and years? Here the studies are large, but they can show links, not causes.

In a Japanese study of about 7,000 children, more screen time at age one went with higher odds of delays in communication and problem-solving at two. For children watching four or more hours a day, the odds of a communication delay were almost five times those of children watching less than an hour.

But the arrow may run both ways. In a study of nearly 58,000 Japanese children, more TV at age one predicted lower development scores a year later, and babies with lower communication scores at one went on to watch more. One reading is that parents lean on screens more when a baby is harder to engage. Families also differ in ways no study fully captures.

A 2024 review of 100 studies adds the most useful point: how screens are used matters. Background TV went with poorer outcomes, and watching together with a parent went with better ones. The effects were small either way.

Screens also touch sleep. In a survey of more than 700 families with children from six months to three years old, more daily touchscreen use went with less night sleep and taking longer to fall asleep.

In Singapore, among children up to age two, each extra hour of screen viewing went with about a quarter of an hour less sleep, and the link was strongest in babies six months and younger.

These are surveys, and one review rated the evidence as low quality. But the advice costs nothing: keep screens out of the wind-down before sleep. We covered routines themselves in Module 2.

Now the exception. A call with Grandma happens on a screen, but it isn't like a show. The person on the other end sees your baby and answers.

In one study, 12- to 25-month-olds spent a week either video chatting with a new adult or watching her in prerecorded videos that looked the same. Only the video chat group answered her in time, like a real conversation. A week later, they recognized and preferred her, learned more of the patterns she taught, and the oldest learned more of her words.

At home, babies from six months to two years get better across the year at sharing attention through the screen. And in calls with grandparents, how happy babies looked depended on how sensitive the grandparent was, just as it did in person.

So video chat with people your baby knows is worth doing. Sit with your baby, point to the screen, and help the conversation along.

Health organizations have landed in a similar place. The World Health Organization recommends no screen time before age one. American pediatric guidance has long advised avoiding screens other than video chat before about 18 months, and its 2026 statement still notes that babies this young struggle to carry what they see on a screen into the real world.

Real life looks different. When researchers pooled studies from around the world, only about one in four children under two had no screen time at all. In an Australian study that recorded a whole day of home audio, six-month-olds were already around screens for over an hour a day, counting any screen they could hear.

If that sounds like your home, you're not failing. Guidelines are a direction, not a pass-or-fail test. The goal is fewer screens in your baby's day, and more of you.

So what does a realistic middle ground look like?

Turn off what no one is watching. Background TV is the easiest screen time to cut, and turning it off gives back your talk and your baby's focus.

When you do use a screen, watch with your baby and talk about it, the way you'd talk about a picture book. Keep screens out of the wind-down before sleep. And use video chat freely with people who love your baby.

Your own phone is part of this picture too, as we saw in Module 1 with the digital still face.

And if you need 10 minutes to shower or cook, a show won't undo anything. The research is about hours a day, week after week, not a single episode.

Here are three things to take with you.

People first. Your baby learns words, play, and turn-taking from you, not from a video.

Background off. A TV no one is watching still shortens your baby's play and your conversation.

Video chat counts as people. Calls with family are connection, not screen time to feel guilty about.

Now let's step back. At the end of Module 1, I gave you five moves. Here they are again, with what the rest of the year added.

Get close. It started with your face at feeding distance. By the end of the year, it's following your baby's gaze and naming what they point to.

Keep it ordinary. Everyday talk, floor time, a few simple toys, meals as a conversation. You never needed a program.

Come back. Answer their cues, repair when you miss, and be the safe base they explore from and the person who returns after every goodbye.

Lend your calm. Through crying, sleep, and separations, your steadiness is what your baby borrows while their own grows.

And look after the lender. Many hands make the load lighter, and your rest and support are part of your baby's care.

That's the first year. Your baby went from studying your face to lifting a cloth to find a toy, babbling at you and waiting for your answer. Most of what built that was ordinary: you, close, coming back.

If you'd like to keep going, the Toddler class, for ages one to three, picks up right where this one leaves off: words that arrive in a rush, the word no, and the big feelings that come with a growing self.

Thank you for spending this year with me. I'll see you there.$t$)
    ) as v(slug, old_md5, new_md5, fixed)
  loop
    if md5(r.fixed) <> r.new_md5 then
      raise exception 'infant/%: corrected text does not match its checksum', r.slug;
    end if;
    update public.class_lessons
       set transcript = r.fixed, updated_at = now()
     where course_slug = 'infant' and slug = r.slug and md5(transcript) = r.old_md5;
    get diagnostics changed = row_count;
    if changed = 0 and not exists (
      select 1 from public.class_lessons
       where course_slug = 'infant' and slug = r.slug and md5(transcript) = r.new_md5
    ) then
      raise exception 'infant/%: written version changed since the 2026-10-08 export; nothing applied', r.slug;
    end if;
  end loop;
end
$fix$;
