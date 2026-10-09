-- Replaces the written version of all 15 preschool lessons (class_lessons.transcript)
-- with each lesson's narration script.
--
-- The text was imported from Mux's auto-generated captions, so it carried the
-- transcriber's mistakes: names (Parton for Parten), misheard words (breaks for
-- brakes, totalled for toddled, a tax for attacks, finished for Finnish, diologic
-- for dialogic, games for gains), words split by stray spaces ("cray ons",
-- "mar bles"), one caption line per row instead of paragraphs, and numbers garbled
-- next to hyphens ("554-year-olds" for "550 four-year-olds", "2,404-year-olds" for
-- "2,400 four-year-olds", "64-year-olds" for "60 four-year-olds").
--
-- Every lesson's narration was generated with ElevenLabs from the lesson's
-- script.py, word for word (narr.json matches script.py on every slide of all 15
-- lessons, and 95 to 99 percent of each old transcript's words line up with its
-- script, with no passage departing from it). So each new text is that script's
-- narration: Matthew's own words, punctuation, and one paragraph per narration
-- block. Numbers of 10 and above are written as numerals wherever the old text
-- showed numerals (studies, sample sizes, ages, years, decades, 15%), converted
-- from the script's words rather than copied, so the garbled numbers are fixed.
-- Numbers below 10, "nine in ten", and hyphenated ages ("four-year-olds") stay
-- in words, as in the script. The per-lesson change list is in
-- docs/preschool-transcript-corrections.md.
--
-- Safe to run twice. Each row changes only if its text still matches the
-- 2026-10-08 export (old_md5). If any lesson was edited since then, the whole
-- block raises and nothing is applied, so a hand edit is never overwritten.
-- Uploading a replacement video for a lesson re-imports Mux's captions and
-- undoes that lesson's correction (see app/api/admin/classes/sync/route.ts).
do $fix$
declare
  r record;
  changed int;
begin
  for r in
    select * from (values
    ('the-preschool-brain', '2aa8127c58a4cec086eb520633bfc005', '45dbccb31560e6e71465faa7d3abc738', $t$Welcome to the Preschool Years class. Between three and five, a change happens that you can watch at your own kitchen table. A child who grabbed everything at two can now wait for a turn, follow a two-step direction, and switch games when the rules change. Most of the time.

In this lesson, we'll look at the thinking skills behind that change and the simple games researchers use to measure them. We'll see why the same child who manages beautifully at breakfast can fall apart by dinner, and what the famous marshmallow test did and didn't show.

If you took the Toddler class, you met the brain's alarm and its brakes, and the preschool years are when the brakes really start to grow.

The brakes are really three skills working together: holding information in mind, stopping an impulse, and switching when the rules change. Researchers call them executive function, a term you may hear from your child's teacher.

The three skills are closely linked. When researchers combined many studies of preschoolers, children who were good at holding things in mind also tended to be good at stopping an impulse. But they aren't quite the same skill, and each grows at its own pace.

And they grow fast. These skills develop more quickly between three and five than at almost any other time, and they keep developing into a person's 20s.

The first skill is holding information in mind while you use it. Researchers call this working memory.

Ask a three-year-old to get their shoes, grab their coat, and meet you at the door, and you may get shoes. Over the next two years, carrying a few steps from start to finish gets much easier.

Holding information in mind also lets a child remember a rule while something tempting is right in front of them. That's one reason it's so closely tied to the next skill.

The second skill is stopping an impulse: holding back what you want to do so you can do something else. Waiting for a turn. Keeping your hands to yourself. Whispering in the library.

In a classic game, children see a picture of the sun and have to say night, then see the moon and have to say day. Children younger than about five found this very hard. Many started out fine, then slipped back into saying what they saw. Older children did much better.

One small change helped. When researchers had four-year-olds wait a few seconds before answering, by singing a short tune first, they did better. No one is sure exactly why, but a short pause seems to give the first, automatic answer time to fade.

The third skill is switching when the rules change. Researchers test it with a classic card game.

Children sort cards showing red rabbits and blue boats. First they sort by color. Then the adult says, now we're playing the shape game. Most three-year-olds keep sorting by color. Most five-year-olds switch without trouble. When researchers combined results from more than 3,000 three-year-olds, only about one in three made the switch.

Here's what surprises people. Ask one of those three-year-olds where the cards go in the shape game, and many can point to the right place. They seem to know the new rule, but their hands keep following the old one. Researchers still debate how fully they understand it.

Small supports help. When the new rule is said out loud on each card, especially by the child, more three-year-olds make the switch.

One more idea explains a lot of daily life. Some situations are cool: calm and low-stakes, like a card game. Others are hot: your child wants something badly or feels something strongly.

A four-year-old can follow the rules of a board game perfectly, and still not manage to wait while the last cookie sits on the plate.

Children often do well in one kind of situation and not the other, and researchers still debate how separate the two really are. Either way, expect less self-control when the stakes feel high to your child, and know that cooling a moment down helps. We'll see how shortly.

Now to something every parent notices. The child who waited patiently at breakfast melts down before dinner. That isn't a lack of effort. These skills depend on how your child's body and day are going.

Sleep is the best studied. In one small experiment, children about two and a half to three years old skipped their nap. That afternoon, they showed about a third fewer happy reactions to a puzzle they could solve, and about a third more upset reactions to one they couldn't. In a similar study, children who missed their nap kept trying to force the same puzzle piece that didn't fit.

Other nap studies find smaller or mixed effects, partly because older preschoolers are starting to drop their naps. The fair summary: a short night or a missed nap makes self-control harder for many children, though not all.

Hunger matters too, though most of this research is with school-age children. In breakfast studies, children paid attention and thought more clearly on mornings they ate breakfast, especially children who weren't well fed overall.

Stress is the third. In studies mostly with adults, a stressful moment makes it harder to hold information in mind and to switch gears. In one of the few studies with young children, five-year-olds had more trouble staying focused after a mildly stressful experience.

By late afternoon, many children are tired, hungry, and have spent the day holding it together, and the brakes are often the first thing to go. That tells you when to ask less, and when a hard moment says more about the hour than about your child.

Now, the marshmallow test. It began in the late 1960s, at a preschool on the Stanford University campus. Children got a choice: one treat now, or two if they could wait alone until the adult came back.

About 10 years later, parents of the children who had waited longer described them as more capable, focused teenagers who handled stress better. In a later follow-up, they also scored higher on college entrance exams.

The study became famous, and the marshmallow became a symbol of lifelong willpower. But the follow-ups included fairly few children, almost all from one university community.

And no, children today aren't worse at waiting. In preschools like the original one, children in the 2000s waited about two minutes longer, on average, than children in the 1960s.

The same researchers also studied how children manage to wait, and for parents, this may be the most useful part.

Children waited much longer when the treats were hidden than when the treats sat right in front of them. They also waited longer when they were given something fun to think about, and gave up sooner when they were told to think about the treats.

Children slowly figure this out on their own. Many young four-year-olds choose to keep the treat where they can see it, which makes waiting harder. By about five, children start to understand that covering it up helps.

Trust matters too. In one study, children waited about 12 minutes, on average, when the adult had kept an earlier promise, and about three minutes when the adult had broken one. When another team repeated the study with more children, the difference was smaller but still there. Waiting makes sense when you trust the reward will come.

In 2018, another team tried the test again with more than 900 children from many kinds of families across the United States. Waiting at four still went with better school achievement at 15, but only about half as strongly as in the original studies. When the researchers compared children from similar homes, with similar early skills, about two thirds of what was left disappeared.

What mattered most was waiting at least 20 seconds, not lasting the full seven minutes. Links to teenage behavior were much weaker. And by age 26, how long they had waited at four didn't reliably predict how they were doing.

The original Stanford children, checked again in their late 40s, tell the same story. Their preschool waiting time didn't predict their finances, but self-control measured again and again, from their teens into their 30s, did.

So the marshmallow test picked up something real but small, and much of what it seemed to predict came from a child's early skills and their home life.

Does that mean self-control doesn't matter? No. It means one short test, on one day, is a blunt tool.

When self-control is measured more carefully, by several people over many years, it tells us more. A study in Dunedin, New Zealand, followed about 1,000 children from birth to age 32. Children with more self-control between three and 11 grew into healthier adults, with more money and fewer criminal convictions. Each step up in self-control went with better outcomes, even among children of similar intelligence and family background.

In a British study of 500 sibling pairs, the sibling with less self-control did worse, despite growing up in the same family. And a 2020 study combining 150 studies found that preschoolers with stronger self-control tended to do better socially and at school a few years later.

Two cautions. Another New Zealand study found that much of this link came from early behavior problems, family circumstances, and intelligence. And a 2023 study found the links to school and money weakened when similar homes were compared. Most of all, these findings are averages across thousands of children, not a forecast for yours. Self-control at four is a skill in progress, and it keeps growing for another 20 years.

If these skills matter so much, can games and apps train them? It's one of the most tested ideas in the field.

The answer is consistent. Practice makes children better at the game they practice, and at games very like it. But in a large 2019 study combining children's training studies, the gains barely carried over to anything else. When training was compared with a look-alike activity that shouldn't help, the benefits shrank to almost nothing, and they often faded over time. A 2026 study of preschool programs found only small gains, even on the skills they targeted.

So there's no need to buy a program. How you can help these skills grow, day to day, is the subject of the next lesson.

Here are three things to take with you.

Time the hard asks. Save new rules, waiting, and big changes for when your child is rested and fed, and expect less at the end of the day.

Cool it down. When your child has to wait, put the tempting thing out of sight and give them something else to think about. When a rule changes, say the new one out loud. These small moves helped children in studies, and they cost nothing to try.

Read one moment for what it is. A child who can't wait today isn't showing you their future. Self-control at this age depends on the hour, the stakes, and whether waiting makes sense to them.

Between three and five, your child's brakes are being built: holding on, holding back, and switching gears. They work best when your child is rested, fed, and calm, and they give way first when the day runs long.

In the next lesson, we'll look at how self-control grows with your help. We'll see how children borrow your calm, why talking to themselves out loud is a good sign, and how to help just enough, then step back.

I'll see you there.$t$),
    ('how-self-regulation-grows', 'b78427d85f6d0af0d0f68b78de61b113', '55fc76976771d5929c79570a10683089', $t$Picture a four-year-old building a tower. As she works, she talks herself through it. The big blocks go on the bottom, and she reminds herself to go slow. When it wobbles, she tells herself it's okay to try again.

Where did those words come from? Very often, from you. In this lesson, we'll look at how the calm and the words you lend your child slowly become their own. We'll see why talking to themselves is a good sign, and how to help just enough, then step back. We'll also look at routines that do some of the reminding for you, and at what rewards can and can't do.

If you took the Infant or Toddler class, you saw how a young child borrows a grown-up's calm. Researchers call that co-regulation: an adult helping a child manage feelings and actions they can't yet manage alone.

Between three and five, more and more of that job shifts to the child. Not all at once, and not in a straight line. A preschooler can calm down alone one day and need you completely the next.

Researchers who filmed preschool teachers saw the handoff happen. With younger children, teachers stepped in more. With children who were managing better, teachers often started with a light nudge, asking the child what they could do. And those nudges went with children settling themselves.

Your part matters. One study followed more than 500 children in Head Start preschools. Children whose parents were warmer and more responsive in play grew more in their self-control skills over the next six months.

It runs both ways. Children who were better at waiting tended to draw out more responsive parenting later. A child who is easier to be patient with gets more patience.

When researchers combined dozens of studies, the links between everyday parenting and these skills were real but modest. You are one important influence, not the only one. That should feel like relief, not pressure.

Now, the muttering. Many preschoolers narrate what they're doing out loud, even when no one is listening. Researchers call this private speech.

Here's the idea behind it. The words a child first hears from you, like reminders to slow down, or to look for the next piece, get turned toward themselves. First out loud, then as a whisper or a mumble, and eventually as silent thinking.

Out-loud self-talk tends to peak somewhere around four to six. In one study of children at home, nearly nine in ten of their comments to themselves were about guiding what they were doing, often by repeating the instructions. And children talk to themselves most when a task is new or hard.

In one classic study, an adult helped children through a tricky puzzle-like task only when they got stuck. Right after that help, when children talked to themselves, they were more likely to get the next one right than when they stayed silent. The self-talk seemed to carry the help forward.

In another study, when preschoolers were simply asked to talk out loud while doing a step-by-step task, they did better. That was true for children with behavior challenges too, who also talked to themselves more on their own and did just as well.

One honest note. Self-talk doesn't always help, and children who find a task hard often talk more, not less. So treat it as a tool your child is using, not a score. If you can, let them talk.

The second big idea is how you help. Researchers call it scaffolding: giving just enough support for your child to do something they couldn't quite do alone, then taking it away as they get it.

With a hard puzzle, that might mean starting with a question, like asking which piece has a straight edge. If that doesn't work, a hint. If that doesn't work, showing one move. Then you step back again.

In a study that followed 82 children from age two to four, parents who scaffolded this way at three had children with stronger self-control skills at four.

Studies like that can't prove that the parenting caused the change. So one team tried an experiment.

About 130 parents of three-year-olds, half of them fathers, did a hard puzzle with their child. Each parent was randomly asked to help in one of two ways. One was to support the child's own tries and ideas. The other was to direct every step.

Parents could change their style when asked. The ones who had offered the least support for their child's own tries at the start changed the most. Their children's behavior during the puzzle changed with it. It was a short study, so it can't tell us about the long run, but it shows that a parent's style can shift with practice.

Offering real choices is part of supporting a child's own tries. The Toddler class covers choices in Module 3.

Stepping back is often the hardest part. Two recent studies with four- to six-year-olds help explain why it's worth it.

In one, children who came up with their own ideas for solving a hard task stuck with it longer. Being told a strategy by an adult didn't help them keep going. In another, children kept going longer when they could see their own progress, even when the final result was the same.

So when your child is working on something just out of reach, try going a little slower before you step in. And point out the progress you see, like how many more pieces they got than last time.

A predictable day is a kind of scaffolding that's built in. Say your child knows that after breakfast comes teeth, then shoes, then the car. Now the routine itself does some of the reminding, and they can do more of it on their own.

In a study in Chicago, children with no regular routines at age two waited less well at age five. That held even after taking other parts of family life into account. When researchers combined many studies, homes with a lot of upheaval, like frequent moves or changing caregivers, went with slightly weaker self-control skills. A messy house mattered much less than an unpredictable one.

These studies can't fully separate routines from everything else going on in a family. But they point the same way: predictable days give a child a frame they can hold on to. The Infant class covered bedtime routines; here the idea is the whole day.

You can hand over more of the routine as your child grows. A few pictures in order, like breakfast, teeth, shoes, can do the reminding instead of your voice.

When your child stalls, try asking them what comes next instead of telling them. You're doing the same thing as with the puzzle: a question first, a hint if needed, and showing only if that doesn't work.

Expect slips. Routines carry less weight when your child is tired, sick, or the day has been turned upside down. That's the time to lend a little more help again.

What about rewards? They can get a behavior going. But they don't build the inner skill, and sometimes they get in the way.

In a classic study, preschoolers who already loved drawing with markers were asked to draw. Some were promised a special certificate for it. Others got the same certificate as a surprise, or none at all. A week or two later, in free play, the children who had been promised the certificate drew less than the others.

When researchers combined more than a hundred experiments, promised, tangible rewards tended to lower interest in things people already enjoyed, more so for children. Positive feedback didn't have that effect. Researchers still debate how big and how general this is.

So save rewards for something hard that your child doesn't enjoy, keep them short, and let them fade. Praise, time-outs, and sticker charts get a closer look in Lesson 1.4.

Here's a playful tool from the lab. Researchers gave four- and six-year-olds a boring task to do for 10 minutes, with a fun video game right there as a temptation.

Some children were asked to pretend to be a hard-working character they knew, like Batman. Others thought about themselves by their own name, and others simply as themselves. The children pretending to be a character worked the longest, and children using their own name came next.

These are a few small studies from one research group, so think of it as worth a try, not a sure thing. Asking your child what a careful builder would do costs nothing.

You might wonder whether a parenting program could speed all this up. Researchers combined trials that trained parents to boost these skills in two- to five-year-olds. Overall, they found no clear difference between families who got the training and families who didn't.

That doesn't mean parents don't matter. It means the evidence points to ordinary daily moments, not a special course. The help you give in steps. The room you leave for your child to try. The predictable shape of your day.

Here are three things to take with you.

Let them talk. When your child narrates out loud, they're often guiding themselves with words they learned from you. If you can, let them.

Help in steps, then fade. A question first, then a hint, then showing one move, and step back as soon as they've got it. Point out the progress you see.

Let the routine do the reminding. Keep the day predictable, ask what comes next, and save rewards for the hard stuff.

Between three and five, the calm and the words you lend your child slowly become their own. You help most by helping in steps, leaving room for them to try, and keeping the day predictable.

In the next lesson, we'll look at how preschoolers start to understand that other people think and feel differently than they do, and how talking about feelings helps.

I'll see you there.$t$),
    ('minds-and-feelings', 'd07f23de26397a5e736a5e18375612e5', 'aaa23a6bde4e50f7ff03126e398306d8', $t$Here's a little experiment you could try at home. Show a three-year-old a candy box and ask what's inside. Candy, of course. Then open it. Surprise: it's full of pencils.

Now ask what a friend, who hasn't looked, will think is in the box. Most three-year-olds say pencils. Many will even tell you they thought it was pencils all along. Ask a five-year-old, and most will say the friend will think it's candy.

Something big changes in between. In this lesson, we'll look at how preschoolers discover that other people have minds of their own. We'll see how understanding feelings grows, why the way you talk about feelings matters, and how stories give children practice.

The classic version uses puppets. A boy puts his chocolate in a blue cupboard and goes out to play. While he's gone, his mother moves it to a green cupboard. Where will he look when he comes back?

Most three-year-olds point to the green cupboard, where the chocolate really is. In the first study of this kind, none of the youngest children got it right. By age six to nine, almost all did.

Researchers call the boy's mistaken idea a false belief: something a person thinks is true that isn't. Understanding false beliefs is a big part of what researchers call theory of mind. That's knowing that people have their own thoughts, wants, and feelings, which can differ from yours, and from the truth.

When researchers combined close to 200 studies, the pattern was clear. Children move from mostly failing these tasks to mostly passing them across the preschool years. For many children, the shift comes around four.

The same pattern showed up across countries, and with puppets, real people, or pictures. The exact timing varies, by up to a couple of years from place to place. So a later age is not a warning sign on its own.

It also comes in steps. First, children understand that people want different things. Then that people can believe different things, and that seeing leads to knowing. Then false beliefs. Later still, that someone can feel one way and show another.

Two honest notes. First, children may know more than their answers show. In one study, about nine in ten older three-year-olds looked at the right cupboard, while fewer than half named it.

Some studies suggest that even babies have an early version of this understanding. But those findings have shrunk as researchers tried to repeat them, and the question is still open.

Second, part of what makes the task hard is setting aside what you know. That's hard for adults too. Children with stronger focus and self-control skills tend to pass these tasks earlier, which ties back to Lesson 1.1.

What helps this understanding grow? When researchers combined close to 100 studies, a few family patterns stood out. Having siblings helped a little. So did parents who talk about thoughts and feelings.

If you took the Infant class, you may remember mind-mindedness: talking about what your baby might be thinking or feeling. Parents who did that with their six-month-olds had children who understood other minds better at four.

One telling group is deaf children of hearing parents, who often learn sign language late. They tend to understand false beliefs later than deaf children who grow up signing with deaf parents. A likely reason is that they miss so much everyday conversation about what people think. These links are modest, but they point to talk.

Not all talk counts the same. When researchers combined studies of parents' talk about the mind, words about thinking and knowing went with stronger understanding than feeling words alone. Talk that explained, and talk during shared books, mattered most.

Another study found the same thing. Just mentioning thoughts wasn't linked with children's understanding. Explaining them was, especially when parents set two points of view side by side.

So instead of simply naming a feeling, add the why, and the thought behind it. You might explain that a brother is sad because he thought his friend was coming, and the friend forgot. Or that your child thought the keys were in the bag, but Dad had moved them.

Now, feelings. Recognizing feelings on faces improves with age. When researchers combined more than 100 studies, happiness was the easiest for children to spot. Fear and disgust were the hardest.

One research team mapped how understanding feelings unfolds. Around three to five, children learn to read faces and to link feelings to what happens. A broken toy makes you sad. A reminder can bring a feeling back.

Around five to seven, they learn that feelings depend on what a person wants and believes, and that people can hide a feeling. Mixed feelings, like being happy and nervous at once, usually come later, around nine or older. Children with stronger language skills tend to be ahead.

Here's a step that takes a while. Go back to the candy box. Before the friend opens it, how does she feel? Happy, because she thinks there's candy.

Many children who can tell you the friend expects candy still say she'll feel sad. Linking a feeling to a mistaken thought comes after understanding the thought itself.

That's worth knowing for everyday life. Your four-year-old may understand what their sister thinks long before they understand why she's upset about it. Explaining that link, again and again, is part of how they learn it.

Understanding feelings isn't only nice to have. When researchers combined about 50 studies of children aged three to 12, it went with doing better in school, and with being better liked by other children.

In one study, children's understanding of feelings at three and four helped predict how well they got along with others in kindergarten. In another, it predicted school and social skills four years later, even after allowing for language skills.

These links are real but modest, and studies like these can't prove cause. They suggest that this understanding is one useful piece of getting along. Friendships and conflict get their own lessons in Module 3.

So how do parents help? One well-known line of research watched how parents respond to their children's feelings. Some treated feelings, even small ones, as a chance to connect and teach. Others mostly tried to make the feelings go away fast.

Researchers call the first style emotion coaching. It means noticing a feeling, accepting it, helping your child name it, and then working out what to do, with limits on behavior where needed. The second style is called dismissing.

The Toddler class covered accepting a feeling while holding a limit in the moment. What's new at this age is the conversation. Your child can now talk with you about what happened, why they felt that way, and what might help next time.

Can coaching be taught? An Australian program called Tuning in to Kids tested that. About 200 parents of four- and five-year-olds were randomly assigned. Half took six group sessions, plus two follow-ups.

Parents who took the program coached more and dismissed less. When researchers watched them talk with their children, they named more feelings and talked more about causes. Their children's understanding of feelings improved. Parents and teachers both reported fewer behavior problems.

The program has since been tested with fathers, with ordinary community staff leading it, and in Hong Kong, mainland China, Norway, and Switzerland. An online version had smaller effects.

When researchers combined 15 trials of programs like this, for children from about 18 months to seven, the results held up. Parenting changed by a moderate amount. Children's emotional skills and behavior improved by smaller but real amounts.

Two cautions. Many results come from parents' own reports, and there's less evidence that these programs change how children handle their own feelings. In one small study, parents who encouraged their children to talk about feelings saw bigger gains than parents who comforted or distracted.

So emotion coaching is a sound bet, not a miracle. And you don't need a program to start.

Books give children a safe place to practice. Characters' thoughts and feelings are right there on the page, and nobody's upset in real life.

In one Italian study, 75 four- and five-year-olds heard short picture stories about feelings over six weeks. Half then talked in small groups about what the characters felt, why, and how they might handle it. The other half played. The talkers understood feelings better and were more helpful, and the gains lasted. Their false-belief answers didn't change.

A review of storybook programs found a common thread. What seemed to help wasn't the book. It was the extra talk about what characters thought, and what the children thought.

You can do this with any book. Pause at the moment a character knows something another doesn't, and wonder aloud what each one thinks will happen.

Ask how a character feels and why. Ask whether someone might feel two things at once. Link it to your child's own life, like the time they felt that way too.

Keep it light. One or two questions per book is plenty, and it shouldn't feel like a quiz. Most of these studies are small, so think of this as good practice, not a guaranteed boost. Lesson 4.2 covers reading together for early literacy.

Here are three things to take with you.

Explain the why. Name the feeling and the thought behind it, and set two points of view side by side.

Coach, don't dismiss. Accept the feeling, help name it, and talk about what happened once everyone is calm.

Pause in stories. Wonder aloud what characters think and feel, and why.

Between three and five, children discover that other people have minds of their own, ones that can want, know, and believe different things. Understanding feelings grows along with it, and the way you talk about thoughts and feelings helps.

In the next lesson, we'll look at how behavior changes across these years. That includes lying, which, surprisingly, is a sign of this new understanding. We'll also look at what the research says about praise, time-outs, and rewards.

I'll see you there.$t$),
    ('behavior-at-3-4-and-5', 'de6d739369a95fd97af866dd10d83084', 'a8fca7167d0661da72f55c834ab5473c', $t$Picture a four-year-old who used to hit whenever a friend grabbed his truck. These days he mostly uses angry words instead. Then, an hour later, he tells you with a straight face that the dog ate the last cookie.

Both of those are signs of growth, even if only one of them feels like progress. In this lesson, we'll look at what changes in behavior between three and five, including hitting, lying, and new fears. Then we'll look at what the research says about praise, rewards, time-outs, and spanking. We'll finish with what the best parenting programs share, and how to tell when behavior is worth checking.

Hitting, kicking, and biting are most common around age two. One study followed more than 2,000 young children. This kind of aggression rose through the second year of life, then declined from about the third birthday on.

A Canadian study followed more than 10,000 children from age two. About half used physical aggression now and then as toddlers and much less as they grew. About a third rarely did it at all. And about one in six kept hitting often, year after year.

So for most children, words slowly replace fists, as the self-control skills from Lessons 1.1 and 1.2 grow. Hitting that is still frequent at five, rather than fading, is worth paying attention to. We'll come back to that at the end.

Now let's turn to lying. Researchers study it with a simple game. A child is told not to peek at a toy while the adult steps out. Most children do peek, and when the adult comes back and asks, many of them deny it.

Lying grows across the preschool years. In one study of four- and five-year-olds, about seven in ten told a lie to protect themselves. Lying also goes with the understanding from Lesson 1.3 that other people can think differently. After all, you can only plant a false belief once you know that beliefs can be false.

One experiment made this vivid. Three-year-olds who couldn't yet lie were given a few short lessons about what other people think and know. Afterward, they started to deceive in a hiding game, and they kept it up a month later. Children in a comparison group did not.

So an early lie usually isn't a sign of bad character. It's a new skill being tried out. The question is how to make telling the truth the better choice.

One study included more than 300 children aged four to eight. Simply hearing that the adult would be happy if they told the truth made children more honest. When punishment was expected, appeals to do the right thing worked less well. Another study found that stories in which honesty was praised helped, while stories about lying being punished did not.

In practice, that means three things. Avoid asking questions you already know the answer to, which invites a lie. Thank your child when they own up, even while the mess still gets cleaned up. And keep consequences calm, so the truth doesn't feel dangerous.

As imagination grows, so do new fears: the dark, monsters, animals, bad dreams. In one study of children aged four to twelve, nearly three in four reported fears at night, and those fears were already common at four to six. Parents tended to underestimate them.

Frequent bad dreams are less common than many people think. In a study of nearly a thousand Quebec children, only a few percent had them often in the preschool years. Children who were comforted after waking at night were less likely to have bad dreams later.

So take fears seriously without feeding them. Comfort your child, keep bedtime predictable, and help them take small brave steps, like a nightlight and then a shorter check-in. A fear that is intense, lasts for months, or keeps your child from ordinary things is worth mentioning to your pediatrician.

Now to the parenting tools, starting with praise. One team filmed parents at home with children aged one to three. Some parents praised more of what their children did, like their effort or the way they solved something. Those children had stronger beliefs at seven and eight that ability can grow.

Small wording differences may matter. In one study, preschoolers praised as being good drawers handled a later mistake worse than children told they had done a good job drawing. The first labels the child. The second describes what they did.

Praise that describes the action also tells your child exactly what to repeat. Mentioning that they put the blocks away without being asked teaches more than a general comment on how good they are.

This research is less settled than popular advice suggests. The home study followed only 53 children. Some studies of preschoolers found that almost any praise helped more than none. And a recent careful study with older children found no difference between the two kinds.

So don't worry about every word. The more solid lesson is to be specific and sincere. Children as young as four can tell when someone praises everything, and that praise means less to them.

Where praise has the strongest support is in changing behavior. When researchers combined more than 150 trials of parenting programs, praise and other positive reinforcement were among the techniques linked to the biggest improvements.

What about sticker charts? Lesson 1.2 showed that promised rewards can lower interest in things children already enjoy. That's a reason not to reward drawing or reading. It isn't a reason never to use rewards.

Some things are hard and not much fun, like staying in bed at night or getting dressed without a fight. For those, a small reward can help get a new habit going. Programs with strong trial results often use them this way.

Keep the goal specific and small, reward it soon after it happens, and pair it with praise. Then fade the reward as the habit takes hold, so the praise and the habit are what remain.

A time-out is a short break from attention and activity, right after a specific behavior like hitting. It isn't meant to shame or scare. It works because a child briefly loses what they want most, which is you and the fun.

It's one of the best-studied discipline tools for young children. A large review of parenting programs found that teaching time-out, and being consistent, went with bigger improvements. A review of 24 studies, six of them randomized, found strong evidence that it works for young children with defiant behavior.

Some writers worry that time-out harms attachment. The studies so far don't show that. In a large Early Head Start study, using time-out at age three wasn't linked to later problems. And in one clinic, children who had been through hard experiences benefited from programs with time-out as much as other children, or more.

How you do it matters a lot. In one survey, about three in four parents used time-out, but most of those did it in ways that differ from the research.

The research version looks like this. Start by giving one calm warning. If the behavior happens again, a short time-out follows, usually a few minutes in a boring spot. End it once your child is briefly calm. Then welcome them back warmly, without a lecture, and move on.

Time-out is for a specific behavior, not for big feelings. A child in the middle of a meltdown needs your calm first, as the Toddler class covered, and repair afterward. Time-out also works best inside a warm relationship with lots of positive attention.

Many of us were spanked as children, and in a hard moment it can feel like the only thing that works. So here's a different way to think about it.

Remember co-regulation from Lesson 1.2: children borrow our calm, and they copy what we do with big feelings. Picture your child grown up and frustrated with a friend or a coworker. You'd want them to take a breath, use words, and step away if they need to. You would never want them to hit. The way you handle your own frustration now is their first lesson in that.

The research points the same way. Across studies of more than 160,000 children, spanking was linked to more behavior problems, including more aggression, and to no lasting benefits. Researchers still debate how big the harm is, but none have found long-term gains. That's why the American Academy of Pediatrics advises against it. A calm, brief consequence like time-out teaches the same limit, while showing the self-control you hope they'll learn.

Parenting programs with names like Parent-Child Interaction Therapy, Incredible Years, and Triple P have been tested in hundreds of trials. When researchers looked across dozens of them, a few ingredients stood out.

The programs with bigger effects increased warm, positive time between parent and child. They taught parents to notice and praise good behavior, to use calm time-outs, and to be consistent. And they had parents practice the skills with their own child during sessions, often with a coach.

Effects were largest for families with the most need. Programs for children with serious behavior problems helped much more than programs offered to everyone. One program worked just as well for families facing poverty as for others. Most results come from what parents report, and the effects shrink over time. Still, these are among the best-tested tools in child psychology.

So how do you know when behavior is more than a phase? Tantrums are a good example. In a study of nearly 1,500 preschoolers, more than eight in ten had tantrums sometimes. Fewer than one in ten had them every day.

Researchers look less at whether a behavior happens and more at its quality, and four signs stand out. The first is that it's frequent, like daily. It's intense, like destructive tantrums or hurting people or animals. It lasts, and isn't fading with age. And it shows up across settings, at home and at preschool.

When behavior is that serious, it often doesn't just go away. In one study, more than eight in ten preschoolers diagnosed with a disruptive behavior disorder still met criteria years later. The good news is that parenting programs work best for exactly these families. Your pediatrician is a good place to start.

Here are three things to take with you.

Notice and name the good. Specific, sincere praise for what your child did is the most powerful tool you have.

Keep consequences calm and brief. One warning, a short time-out, then warmth again. Show the calm you want them to learn.

Know the four signs. Behavior that is frequent, intense, lasting, and everywhere is worth a conversation with a professional.

Between three and five, hitting usually fades, lying and new fears appear, and both are signs of a growing mind. Warm attention, specific praise, and calm, predictable consequences help most.

That completes Module 1 of this class. Next, we start Module 2, Play as the Work, with pretend play. We'll look at how it changes from three to five, what research can and can't claim about it, and how to join in without taking over.

I'll see you there.$t$),
    ('pretend-play', '9d7c1e8592abc38ce0e7504491b4c679', 'cad044d77af1498b810fe68d1ada5822', $t$Picture your four-year-old turning the couch into a pirate ship. She hands out the parts: she's the captain, and you're the parrot. A cushion becomes the treasure. Halfway through, she stops to explain a new rule, then jumps right back into the story.

That's pretend play: acting as if something is true when you know it isn't, just for fun. In this lesson, we'll look at how it changes from three to five, and at imaginary friends. Then we'll take an honest look at what research can and can't claim about pretend play, and how you can join in without taking over.

If you took the Toddler class, you saw pretend begin, with a banana held up as a phone. Across the preschool years, it grows in a fairly steady order.

First, children use one thing as another. Then they give pretend objects pretend qualities, like tea that's too hot. Next comes pretending together, then taking on roles. Last comes talking about the pretend itself: deciding who plays whom, or stepping out of the story to change what happens.

In one study, researchers watched 73 preschoolers at play for more than 30 hours. Older children did more of those later steps, and they often combined several at once. So a five-year-old who keeps stopping the game to sort out who's who and what happens next is showing one of the most advanced kinds of pretend.

Props matter less with age. In a classic study, children younger than three pretended best with objects that looked like the real thing. By about three and a half, they could pretend just as well with something unlike it, or with nothing at all.

Taking on roles grows too. Observers in one study saw role naming and dressing up rise sharply around age five.

And pretend is built on what children know about the real world. Preschoolers in one study disapproved when a puppet pretended to eat a hamburger for breakfast. Even in make-believe, they expect the real rules to apply.

Some parents worry that a child deep in pretend can't tell what's real, and here the research is reassuring. When preschoolers are asked carefully, they separate fantasy from reality better than adults often assume.

Scary content is the exception. In one study, preschoolers had more trouble judging frightening pictures as not real than happy or neutral ones. That fits the night fears from Lesson 1.4.

So you can enjoy the story with your child. If a pretend monster starts to feel too real, it's fine to step out of the game for a moment and say plainly what's pretend.

Many children invent a friend. In one long-term study, about two in three children had an imaginary companion at some point by age seven. Some of these friends are invisible. Others are a stuffed animal with a name and a personality of its own.

Imaginary friends are more common in firstborn and only children. They aren't a sign of confusion. Four-year-olds with and without one were equally good at telling fantasy from reality. And school-age children still play with imaginary friends about as often as preschoolers do.

One study included 152 three- and four-year-olds. Children who had an imaginary friend, or who often pretended to be a character, did better on the tests of understanding other minds from Lesson 1.3. At age four, that held even after allowing for language skills.

Later studies are more mixed. In one, five-year-olds with imaginary friends described real friends more in terms of their thoughts and feelings, but they didn't do better on the tests themselves. And none of these studies can show that the imaginary friend caused anything.

So there's no need to encourage or discourage one. Playing along lightly is fine, and so is keeping ordinary rules, like the imaginary friend not getting your child out of cleanup.

Pretend play has a big reputation. It's often described as essential for creativity, intelligence, language, and getting along with others.

In 2013, a team of researchers looked back at decades of studies to see if the evidence backs that up. They found that it doesn't support strong claims that pretend play is uniquely important.

The team weighed three possibilities. Pretend play might be essential. It might be one of many good routes to the same skills. Or it might simply travel alongside the real causes, like attentive adults, rich conversation, and a child's own abilities.

For language, storytelling, and handling feelings, the review found too little good evidence to decide. For creativity, intelligence, and understanding other minds, the results didn't agree with each other. And for solving problems, there was no good evidence of a link at all.

Other researchers pushed back on this review. Some argued that many older studies measured adult-run activities, not the real pretend play children choose. Others argued that the overall pattern still leans positive.

There's a bigger point too. In many parts of the world, children pretend much less, and adults rarely pretend with them. Those children still grow up to be capable adults.

Newer research has kept testing the question. When researchers combined 34 studies, children who played pretend more skillfully tended to get along better with others. The quality of the play mattered more than the amount.

Another recent combination of 26 studies, with nearly 3,000 children, found that pretend play goes with stronger focus and self-control skills. But the link was small.

Both of these mostly compare children at one point in time. They can't tell us whether the play builds the skills, or the skills make richer play possible, or both.

Experiments, which can test cause and effect, give mixed answers. In one, 110 preschoolers spent five weeks in fantasy pretend games, like playing astronauts. Their focus and self-control skills improved more than children's in other groups. A second study found the same benefit for middle-income children, but not for children in Head Start.

In another, four-year-olds who played acting games, like pretending to be animals, got better at controlling their emotions, but not at other social skills.

And a large recent trial with more than 300 preschoolers found no effects of an eight-week pretend play program. So the benefits, where they exist, seem real but modest, and not guaranteed.

So pretend play isn't magic, and it isn't required. It looks like one good route among several. A child who prefers building, drawing, or helping you cook is not missing out.

In fact, by four or five, many children choose a real activity over a pretend version of it when they're offered both. Real cooking can beat pretend cooking.

Pretend play is still worth making room for, because children love it and it's a rich way to practice language, ideas, and getting along. It doesn't have to justify itself as a lesson.

If you join in, follow your child's lead. In one study of three- and four-year-olds playing with a parent, play was more complex when the child started the pretend than when the parent did.

Take the role you're given, and stay in character. Ask questions from inside the story, like wondering out loud where the treasure is buried. Resist the urge to correct the story or turn it into a quiz.

A small twist can help when play stalls. In a study of four-year-olds, offering the start of a story with a problem in it, like a storm heading for the ship, made their play richer.

Some children need more help getting pretend started, especially with other kids. A Swiss study randomly assigned playgroups to one of three setups. In one, adults joined in to help children set up roles and stories. Another got extra costumes and props, and the third got neither.

Children with adult play partners became better at pretend play. Their teachers also saw better behavior and better friendships. Simply adding props didn't do the same.

It's the same idea as helping in steps from Lesson 1.2. Join in to get the story going, then step back once it's running. Lesson 2.3 looks more closely at play that has a learning goal.

Simple, open-ended props go a long way. Boxes, scarves, blankets, and cardboard tubes can become anything.

Time matters too, more than you might expect. In one study of children aged three to six, engagement in pretend play peaked about 10 to 15 minutes in. So an unhurried stretch of time is worth more than a few rushed minutes between activities.

And pretend doesn't need a special setup. It shows up in the bath, in the car, and at the dinner table, whenever there's a little room for it.

Here are three things to take with you.

Let them lead. Take the role you're given, play inside the story, and add a twist only if it stalls.

Make room, not a curriculum. Offer open-ended props and unhurried time, then step back.

Enjoy it for what it is. Pretend play is one good route among several, not a required lesson.

Between three and five, pretend play grows from simple substitutions into shared stories with roles and rules. It's joyful and worth making room for, even though research can't promise that it builds any one skill.

In the next lesson, we'll look at the more physical side of play. That includes play fighting and how children tell it from real fighting, plus risky play outdoors and what studies find about benefits and injuries.

I'll see you there.$t$),
    ('rough-and-tumble-and-risky-play', '9852ea86bac18511012852d055c4c310', '11e6d1abef49ec9dc26146bb5fa31935', $t$Picture two four-year-olds wrestling on the living room rug. They're giggling, one pins the other, and then they swap places. A few minutes later, one of them is at the very top of the jungle gym at the park, calling for you to look.

The first is rough-and-tumble play: play fighting and chasing, done in a friendly spirit. The second is risky play: thrilling play that carries some chance of getting hurt. In this lesson, we'll look at how children tell play fighting from real fighting, and what risky play may offer. We'll also look at the injury numbers, and at how much active play preschoolers need.

Play fighting is a kind of play children share with many animals. Puppies, young monkeys, and even bear cubs all do it, and it looks a lot like what children do on the rug.

It's common in children too, and far more common than real fighting. In one study of children in kindergarten through fourth grade at recess, play fighting and chasing made up about one in nine of the things children were doing. Real aggression made up fewer than one in three hundred.

And it isn't only boys: a study of five-year-olds in two early childhood settings saw both girls and boys play fighting, in many different ways.

From the outside, play fighting and real fighting can look alike. But they tend to differ in a few clear ways.

In play fighting, children smile and laugh, hits are soft and held back, and they take turns being on top or doing the chasing. They often stay together and keep playing afterward, and other children tend to join in. In a real fight, faces look tense or angry, and the force is real.

In a classic study of a nursery school class, staff could reliably tell the two apart on video, and so could some of the four-year-olds. Children's regular play fighting partners were often the friends they liked best.

Preschoolers understand this better than we might expect. In one study, researchers interviewed 56 children aged four to six about play fighting.

The children described it as fighting with very little force, along with smiles, funny sounds, props, and pretend stories. Real fighting, they said, uses more force and actually hurts. And when play got too rough, they had their own ways of calming it down and getting back to the game.

Adults don't always see it as clearly. In one study, 94 preschool teachers watched videos of boys playing outdoors. Newer teachers, and those without an early childhood degree, saw more aggression than more experienced teachers did.

Researchers have long thought that play fighting teaches restraint: using just enough force, reading a partner, and keeping your cool when things get competitive. A recent review found that idea running through studies of animals, of parents and children, and of children playing together.

But the evidence in children is mixed. In one study of 90 four- to six-year-olds, more play fighting didn't go with better control of emotions. At school, more play fighting with other children went with more physical aggression. At home, rough play with fathers that turned upset or angry went with weaker control of emotions.

So play fighting isn't automatically good or bad. How it goes seems to matter more than how often it happens.

In one study, researchers filmed 85 children aged two to six playing at home with their fathers. Frequent rough play went with more aggression, but only when the father was less firmly in charge of the game. When fathers kept clear control, the link disappeared, and a follow-up five years later found the same pattern.

That fits co-regulation from Lesson 1.2: you can be a playful, energetic partner and still be the one who sets the limits.

In practice, that might mean agreeing on a stop word that everyone obeys, keeping hands away from faces, and pausing the moment someone stops smiling. When it's time to end, wind down together, so your child isn't left wound up.

Now let's turn to risky play, which a Norwegian researcher sorted into six kinds. They are climbing to great heights, going fast, using real tools, playing near water or fire, rough-and-tumble play, and wandering off to explore out of sight.

Children seek it out on their own, without any prompting. When researchers filmed Norwegian preschoolers during free play, about one in ten moments involved some kind of risky play. In another set of Norwegian observations, children who were engaged in risky play showed more well-being, more involvement, and more physical activity.

Why would children want to scare themselves? One idea is that young children's natural fears, like a fear of heights, protect them before they're ready. Thrilling play lets them face those fears in small, exciting doses, until the fear fades and the skill grows.

Another research team suggests a second lesson. Children learn that a pounding heart and an uncertain outcome are feelings they can handle, and over time, that might lower the risk of anxiety.

These are still ideas rather than settled findings. But they fit something from the Infant class: new walkers fall many times an hour, and they're almost always back to playing within seconds.

The studies so far lean positive, though few are strong. A 2015 review of 21 studies found mostly good effects of risky outdoor play, especially on physical activity, and also on social behavior.

A national British survey asked about the play of roughly a thousand two- to four-year-olds. Children who played adventurously for more hours had slightly fewer anxious and withdrawn signs, and a more positive mood. The effects were small, and we can't tell which came first.

And a Scottish study followed more than 4,000 children. Those who played outside more often at ages two to four were less likely to develop rising emotional or behavior problems over the following years.

Injuries are real, and it's worth being honest about them. In the United States, playground injuries send roughly 200,000 children to emergency rooms each year. About three in four come from falls, most often a broken arm or wrist, and about one in 25 children is admitted to the hospital.

But the risk isn't spread evenly across all kinds of play. In a New Zealand study, falls from higher than about five feet were four times as likely to cause injury as lower falls. Surfaces matter too: in a Welsh study, concrete under equipment was linked to about five times as many injuries as rubber surfacing.

Trampolines and anything with wheels stand out as well. In one study of trampoline injuries, two in three happened without falling off at all, often with several children bouncing at once.

A helpful distinction is between a risk and a hazard. A risk is a challenge your child can see and choose, like a tall climb or a steep slope. A hazard is a danger they can't see or judge, like a broken rail, hard ground under a climber, a busy road, or open water.

Pediatricians in Canada suggest focusing on preventing serious injuries, rather than every bump and scrape. Researchers sum it up as keeping children as safe as necessary, not as safe as possible.

So remove the hazards and keep the challenge. Put soft ground under climbing, like sand, wood chips, or rubber. Use helmets for anything with wheels and one jumper at a time on trampolines, and keep an adult right there near water and roads.

Parents' feelings shape what children get to try. In that same British survey, parents who were more comfortable with risk had children who spent more hours in adventurous play.

Those feelings can also shift with a little reflection. In a Canadian trial, mothers of school-age children were randomly assigned to a short online tool that helped them reflect on their worries. Compared with mothers who just read a research summary, they became more comfortable with risky play, and that held three months later.

In practice, let your child climb only as high as they can get on their own, rather than lifting them up. And try asking where they'll put their foot next, instead of only warning them to be careful.

So how much active play do preschoolers need? World Health Organization guidelines for three- and four-year-olds call for at least three hours of physical activity a day, spread throughout the day. At least one hour of that should be energetic play: running, jumping, climbing, or anything else that gets them breathing hard.

Many children fall short on the energetic part. In Australian child care, preschoolers moved for much of an eight-hour day, but they got only about 15 to 30 minutes of energetic play.

Exact numbers vary a lot with how activity is measured. A handy rule of thumb from American guidance is about 15 minutes of activity for every hour a child is awake.

Getting outside makes all of this much easier. In one study, 67 four-year-olds wore activity monitors during free play. An hour of indoor play wasn't enough for most of them to reach 15 minutes of activity. Outdoors, most got there in a little over half an hour.

Their activity came in short bursts, mostly under 20 seconds at a time. That's normal at this age, so a long stretch outside works better than a quick one.

Yet in a 2021 national survey, more than a third of American three- to five-year-olds played outside for an hour or less on weekdays.

Time in nature seems to add something too. A large review of nearly 300 studies found that contact with nature went with more physical activity and better mental health in children. Most of those studies, though, couldn't show cause and effect.

A review of nature play for children aged two to 12 found consistent benefits for physical activity, and for imaginative and pretend play. And in an American study, preschoolers who lived near more green space had fewer anxious and withdrawn signs.

Nature doesn't have to mean a forest. A park with trees, a patch of grass, or a muddy backyard all count.

Here are three things to take with you.

Let play fighting stay play. Watch for smiles, soft hands, and taking turns, and stay in charge when you're the one wrestling.

Remove hazards, keep the challenge. Soft ground, helmets, and close watch near water and roads, then let them climb.

Get outside, often and for a while. Aim for three hours of movement a day, including an hour that gets them breathing hard.

Between three and five, play fighting and risky play are normal, common, and mostly good-natured. With hazards removed and an adult in charge of the roughest moments, they give children a chance to practice restraint, courage, and coping.

In the next lesson, we'll look at free play, guided play, and direct teaching. We'll also look at how to set up play that teaches without turning it into a lesson.

I'll see you there.$t$),
    ('free-play-guided-play-and-teaching', 'bd3dcc44a7e7d4b44e5e26fdbcd97f7c', '85bf7507b861c55dda04e998debb4601', $t$Picture your four-year-old with a pile of blocks. You could leave her to build whatever she likes. You could show her how to build a bridge. Or you could set a toy car beside her and wonder out loud whether she can build something it fits under.

Those are three different ways to play and learn. In free play, the child chooses and leads. In guided play, an adult sets up a playful activity with a goal and gives it a light touch, while the child still leads. In direct teaching, the adult shows or tells. In this lesson, we'll look at what each one does best.

It helps to picture these as points along a line. At one end, children run the show. At the other end, an adult does. Guided play sits in between, and so do games with rules, like a board game.

Most parents already value play, and research backs them up. In a national survey of nearly 1,200 American parents, most preferred play over direct teaching, and they rated free play as the best way to learn. Guided play was less familiar, but parents who knew more about child development were more likely to favor it.

One of the clearest tests involved shapes. Researchers taught 70 four- and five-year-olds what makes a shape a triangle, a rectangle, or another shape, in one of three ways.

Some children got guided play, exploring the shapes with an adult who asked questions and helped them work out the rules. Others were simply told the rules, and others played freely with the shapes. The guided play group learned the most, and the difference was still there a week later.

One likely reason is that guided play keeps children doing the thinking, while an adult makes sure they notice what matters.

Guided play can help with words, too. In one study, about 250 preschoolers from low-income families heard new words in storybooks. Then they played with toys linked to the stories.

Some played freely, and others played with an adult who joined in and supported the play. Every group learned some words, but children who had an adult in the play learned more of them. In a second study run by classroom teachers, words practiced through play stuck better than words practiced with picture cards.

Guided play also changes the way families talk. In one study, parents built with their preschoolers in one of three ways. Some had free play with blocks, some had guided play with a building goal, and some played with ready-made block structures.

Parents in the guided play group used the most spatial talk, words like above, between, and corner, and their children did too. That matters because the spatial words children hear go along with how they think about shapes and space.

The toys themselves can help as well. In another study, shape toys that included unusual shapes, like a long, skinny triangle, drew more talk about shapes from three-year-olds than toys with only the usual ones.

In 2022, a team combined 17 studies, covering nearly 4,000 children aged one to eight. Guided play beat direct teaching for early math skills, for knowing shapes, and for switching flexibly between rules. It also beat free play for learning spatial words, and the gains ranged from small for early math to large for spatial words.

For other skills, the methods came out about even. And the studies defined guided play in many different ways, so the details are still being worked out. Still, the pattern points one way: when there's something specific to learn, a light adult touch inside play tends to help.

Part of the reason is what teaching does to curiosity. In a classic study, an adult showed preschoolers one thing a new toy could do, acting like a teacher. Those children played with that one feature, and little else.

Children who saw the same feature by accident, or who got no demonstration at all, explored widely and found much more. When you teach, children reasonably assume you've shown them everything worth knowing.

Questions can get the best of both. In another study of four- to six-year-olds, a knowledgeable adult asked a question about a toy instead of explaining it. That passed on the key idea and kept children exploring.

None of this means direct teaching is bad. A large review looked at many studies, mostly with older children and adults. Simply leaving learners to discover things on their own worked poorly, and clear instruction did better.

But discovery with support did best of all, with feedback, examples, and questions that ask learners to explain. In a study of more than 1,400 preschoolers in low-income classrooms, time in teacher-led activities went with bigger gains in language and early reading.

So some things are simply worth telling: a letter's name, how to hold scissors, or a safety rule. Telling is quick and clear, and it doesn't have to replace play.

In that same study of classrooms, more time in free choice play went with bigger gains in self-control. And how teachers talked with children during free choice time mattered for language, too.

Other research points the same way, including a large Australian study. Toddlers and preschoolers who spent more time in unstructured quiet play had better self-control two years later, even after accounting for their earlier self-control.

In a study of six- and seven-year-olds, children with more unstructured time did better on a task where they had to decide for themselves when to switch approaches. These studies can't prove cause, but free play seems to give children practice running their own minds.

Many families wonder whether to sign up for classes, like music, sports, or early reading. The research at this age is thin, and much of it comes from China, where organized activities for preschoolers are common.

In one study of almost 700 Chinese preschoolers, activities went with better thinking and language skills. For social and emotional skills, though, more helped only up to a point, and then began to hurt.

A class or two that your child enjoys can be great. But a full schedule can crowd out the free play that builds self-control, so leave plenty of unplanned time.

Guided play at home doesn't need special equipment or a plan. Start with something your child already enjoys, and add one small invitation, like a toy car beside the blocks, or a bridge that keeps falling down.

It also helps to choose materials that spark talk. Unusual shapes, measuring cups in the bath, or a puzzle with pieces that look almost alike all invite comparing and explaining.

Then let your child take it from there. You set the stage and the goal, and your child decides how to get there.

Everyday routines are full of chances for guided play. In the kitchen, your child can measure flour and see which cup holds more. In the bath, ask what will float and what will sink, then let them test it.

On a walk, collect leaves and sort them by size or shape back home. With a puzzle or blocks, wonder out loud which piece might fit, and let your child try a few.

In each case, you bring a small goal or a question, and your child does the doing, which is the heart of guided play.

Once play is going, ask more than you tell. Questions starting with I wonder, or what would happen if, keep children exploring.

Notice out loud what your child is doing, and name it with useful words: taller, between, heavier, a corner. And let wrong guesses stand for a while, because testing an idea that fails is part of learning.

This builds on helping in steps from Lesson 1.2. Give just enough support to keep things moving, then step back.

Guided play can tip into a lesson without anyone noticing. In one study, mothers who were given tips on encouraging spatial thinking used more spatial words, and so did their children, but both did less pretend play.

Watch for signs that the play has slipped away. Your child loses interest, you're doing most of the talking, or your questions all have one right answer.

When that happens, hand the play back. As the Infant class found, following a child's lead tends to deepen play, and the same holds now.

Put together, the research suggests a mix rather than a single method. Plenty of free play builds self-direction and self-control. Guided play helps with specific skills, like shapes, words, and early math.

And a little direct teaching handles what's quicker to tell. Simple toys and a few good questions are enough, and most of it can happen in ordinary moments, like building, cooking, or bath time.

You don't need to plan every moment, and you don't need to feel guilty when play is simply play.

Here are three things to take with you.

Set it up, then follow. Add one small invitation to what your child loves, and let them lead the way.

Ask more than you tell. Questions keep children exploring, and telling is for what's quicker to say.

Protect free time. Leave plenty of unplanned hours, because free play builds self-control.

Between three and five, children learn through free play, guided play, and some direct teaching. Guided play gives a gentle edge for specific skills, and free play gives children practice running their own minds.

In the next lesson, we'll look at screens and what preschoolers can learn from well-made shows and apps. We'll also look at what makes a program good, and how to build a realistic family plan.

I'll see you there.$t$),
    ('screens-at-3-to-5', '752760f4e3989a0cbe252e150d002e36', '60ca861aea2571847c5b39e377c72bd5', $t$It's late afternoon, dinner isn't ready, and your four-year-old asks for one more show. Almost every family with a preschooler knows this moment, and most parents wonder whether they're getting screens right.

In this lesson, we'll look at what preschoolers can actually learn from a well-made show, and what makes a show good. We'll cover fast and fantastical cartoons, apps and e-books, and watching together. Then we'll look at sleep, using a screen to calm a child, turning it off, and a realistic family plan.

If you took the Infant class, you saw that babies learn much less from a screen than from a person in the room. That gap shrinks as children grow, and by the preschool years, a well-made show can teach real things.

Health guidelines for ages two to five suggest about an hour a day of good programs. Real life often looks different. When researchers combined studies from around the world, only about a third of children this age stayed within that hour.

So if your family is over it some days, you're in the majority. The more useful questions are what your child watches, and how.

The best-studied preschool show is Sesame Street. Researchers combined studies from 15 countries, covering more than 10,000 children. The show helped with letters and numbers, with health and safety, and with how children thought about people different from themselves.

When the show first aired in 1969, not every American town could pick it up. Children who could watch were later more likely to be in the right grade for their age. And in a recent study, three- to five-year-olds who watched problem-solving episodes used those strategies when they built things with their own hands.

Some shows aim at feelings rather than letters. In one study, children aged two to six watched 10 episodes of Daniel Tiger's Neighborhood, a show about naming and handling feelings, over two weeks.

Viewers showed more empathy and recognized emotions better, but only in families where parents often talked with their children about what they watched. In a follow-up study, children who also used the show's app used its calming strategies more a month later, and their parents talked more about the shows too.

The pattern repeats across this lesson: the show plants an idea, and you help it grow.

Researchers have found a few features that help preschoolers learn. A clear story built around one idea is easier to follow than a string of loud moments. And when a character looks out, asks the viewer a question, and pauses for an answer, children often call out and point.

That kind of invitation seems to help. In one study, children learned a new word better when a character spoke to them directly than when they overheard two characters talking.

Repetition helps too. When three- to five-year-olds watched the same Blue's Clues episode five days in a row, they kept watching, joined in more, and understood more by the end. So the fifth viewing of a favorite isn't wasted.

Some cartoons move very fast and are full of impossible events, like characters who stretch, explode, and pop back. In a well-known study, 60 four-year-olds watched nine minutes of a fast, fantastical cartoon, an educational show, or drew pictures. Right afterward, the cartoon group did worse on tasks that needed focus and self-control.

Later work suggested that the impossible events mattered more than the speed. In 2025, a team combined many of these studies. Speed alone had no clear effect, and fantastical content had a small, short-term one that varied a lot between studies.

In one study, the dip after a fantastical show was gone 10 minutes later. So this looks like a brief stretch of lower focus, not lasting harm, and researchers are still debating why it happens.

Imagination itself isn't the problem. When your child pretends that a block is a rocket, they're doing the thinking. Watching impossible things happen at high speed asks something different of a young brain.

The practical step is small. Before something that needs focus, like getting out the door or sitting down to a puzzle, a calmer show is a better choice.

Apps are harder to judge than shows. When researchers scored about 120 popular educational apps, most scored low on the basics of good learning. And in a study of apps for children five and under, almost all of them contained some kind of advertising, including apps labeled educational.

Many also push children to keep playing or to buy, with characters who look sad when a child stops, or rewards that only unlock with more time.

A useful test asks four questions. Does the app keep your child thinking, not just tapping? Is it free of distractions? Does it connect to real life? And does it invite talking with someone? A clear learning goal is a good first sign.

E-books change what happens when you read together. In one study of three- and five-year-olds, families reading electronic books talked less about the story and more about the buttons, and children understood less of it.

A review of 39 studies found that plain digital copies of books led to less understanding than paper. An adult reading a paper book beat a child reading a fancy e-book alone. But features that fit the story, like animation that shows what the words describe, could help, and built-in word definitions helped with vocabulary.

So keep paper books for reading together, and choose e-books whose extras serve the story.

Watching a show with your child and talking about it is what researchers call co-viewing. One of the clearest tests involved 81 parents and their three-year-olds, watching storybook videos for four weeks.

Some parents learned to pause, ask questions, and let their child tell parts of the story. Their children understood more of the stories and learned more of the new words than children whose parents only commented or simply watched.

When a team combined 17 studies, children learned a bit more from screens when an adult used them alongside. In a larger review, educational shows and watching together both went with stronger language, while more hours went with weaker language.

Watching together doesn't mean a lesson. Pause now and then and ask what your child thinks will happen next, or how a character is feeling.

Connect the show to your child's own life, like the time they were scared at the doctor too. Afterward, bring the show's ideas into the day. Some parents use a show's calming song when their child gets frustrated in a store, and the child joins in.

You won't watch every minute, and you don't need to. Even a few shows a week watched together, with a little talk, help your child get more out of them.

What about total time? A New Zealand study followed more than 6,000 children. More screen time at ages two to four went with smaller vocabularies later, and more trouble with other children. The links shrank when researchers compared children from similar homes, but they didn't disappear.

Part of the reason may be what screens replace. In a study of preschoolers, more screen time went with less shared reading and fewer warm conversations, and those mattered for language.

These studies show links, not causes, and the arrows can run both ways. Still, they point the same way: a lot of daily screen time leaves less room for talk, books, and play.

Screens also touch sleep. In a Finnish study of over 700 children aged three to six, each extra hour of screens went with a later bedtime and 10 minutes less sleep.

In another study, preschoolers wore sleep-tracking watches for over two weeks. Those who watched more TV, or had a TV in their bedroom, slept less and less well at night, and longer naps didn't make up for it.

The evidence is mixed, and most of it comes from surveys, but the advice costs nothing. Keep screens out of the bedroom, and leave a calm gap between the last show and bedtime.

Many parents hand over a phone to get through a long wait or a meltdown in the grocery store. If you've done that, you're in good company, and sometimes it's exactly the right call.

Researchers have asked what happens when it becomes the main way a child calms down. One study followed about 400 three- to five-year-olds for six months. Boys, and very active, quick-to-react children, who were often calmed with a device had bigger emotional reactions later. Among the most active children it ran both ways, too: those with bigger reactions were handed devices more often.

Calming down with you is how children practice, the way children borrow your calm in Lesson 1.2. So keep the screen as one tool, and try naming the feeling, a slow breath, or a hug first when you can.

Turning a screen off is one of the hardest transitions of the day. In a study of families with children aged one to five, the screen often went off when the parent was ready to give the child full attention. Transitions went better when the show reached its own end, like a finished episode or a timer, than when a parent stopped it partway through.

So agree on the plan before it starts, such as two episodes. Give a warning before the end, let the episode finish, and have the next thing ready, like a snack or a toy on the floor.

If your child is upset, name the feeling and hold the limit, just like the warm limits from the Toddler class.

Pediatric guidance for this age suggests a simple shape. Aim for about an hour a day of good programs, and watch together when you can. Keep bedrooms and mealtimes screen free, along with playtime together and the hour before bed.

Choose calmer shows with a clear story that are made for learning. Turn off the TV when no one is watching, as the Infant class showed, and notice your own phone during time together.

And if a show buys you 20 minutes to cook dinner, that's not a failure. The research is about patterns over months, not a single afternoon.

Here are three things to take with you.

Choose shows that teach. Look for a calm pace, a clear story, and characters who invite your child to join in.

Watch and talk. Pause, ask, and connect the show to your child's life, because that's where much of the learning happens.

Protect sleep, meals, and calm. Keep bedrooms and mealtimes screen free, and help your child calm down with you first.

That brings Module 2 to a close. Across pretend play, rough-and-tumble play, guided play, and screens, one idea kept coming back: preschoolers learn most when they do the thinking, with an adult close by.

In Module 3, we turn to friends and feelings, starting with how children move from playing side by side to playing together, and what friendships give them. I'll see you in the next lesson.$t$),
    ('from-playing-beside-to-playing-together', 'b896280ffb28d793cae11974c0e6b7ef', '0134686c0d72c55eee4c9b4eebddbaa3', $t$Picture two three-year-olds in a sandbox, each with a bucket, digging side by side and barely talking. Two years later, the same pair might be running a bakery, with one taking orders and the other making sand cakes.

In this lesson, we'll look at how play with other children grows between three and five, and how loosely the classic stages really hold. We'll look at first friendships and what they give children, at shy and slow-to-warm children in groups, and at playdates that help.

In 1932, a researcher named Mildred Parten watched children in a nursery school and sorted their play into kinds. Some children watched others, and some played alone.

In parallel play, children play side by side with similar toys, but not really together. In associative play, they share materials and chat, but each follows their own plan. In cooperative play, they share a goal and take roles, like the sand bakery.

Older children did more of the playing together. For decades, these kinds were treated as a ladder that every child climbs in order.

Later research kept the kinds but loosened the ladder. When another researcher repeated the study decades later, three- and four-year-olds played together less than Parten had found, so the ages were never fixed rules.

Setting matters too. The toys on hand change how children play, and a pretend kitchen tends to bring children together. In one small study, the same children played together more at school, with classmates they knew, than at a public playground with strangers.

So a child's kind of play depends on the day, the place, and the company, not just their age.

Parallel play turns out to be more than a stage. In a classic study of children around three, play side by side often led straight into playing together, and every child made that move at least twice. The researchers concluded it can be a matter of minutes, not months.

A study of 167 four-year-olds found a common path: watch, then play alongside, then join in. And in a recent classroom study, two children who played side by side were more likely to play together with each other later in the year.

So when your child digs next to someone without a word, they may be working their way in.

Researchers also separate kinds of being alone. In a study of four-year-olds, children who mostly watched others from the edge, or wandered without doing much, tended to be more anxious and wary. Children who built or drew happily on their own did not.

Some children are simply content in their own company. Studies of these children, mostly at older ages, suggest that apart from playing alone more, they tend to do fine.

A child absorbed in a puzzle is different from a child hovering at the edge who wants in. The second one may need some help.

Over these years, play with peers also gets richer. One study followed 48 children from infancy through preschool. Their play with peers grew more complex in a fairly steady order, ending in shared pretend games with roles and stories.

Children who reached the more complex kinds earlier, and spent more time in them, were rated as more socially skilled later. And in a high-quality child care center, children got there sooner.

Shared pretend play, which we met in Lesson 2.1, is where a lot of this happens.

Preschoolers don't just play with whoever is nearby. In an Irish study, more than four in five preschoolers had at least one friend who named them back as a friend. By the first year of school, every child did.

Young children's ideas about friends are simple but real. Friends are the children they play with, sit near, and are nice to. Even three- to five-year-olds can tell that friends stick up for each other.

Most preschool friends are the same gender. In one study, these choices were strong and stable over six months, and they tend to grow stronger with age.

Friends don't fight less. In a study of four-year-olds, friends had conflicts just as often as children who weren't friends, about the same kinds of things.

But friends' conflicts were less heated, ended more often in an even outcome, and were more often followed by playing together again. Another study found more compromise and apology between friends.

So friendship is a place where children practice making up. We'll look at handling conflict itself in Lesson 3.3.

Friends also seem to help with school. In a study of 125 kindergartners, children who started the year with more friends in their class liked school more within two months. Those who kept those friends liked school more as the year went on, and making new friends went with better school progress.

In another study, children who started kindergarten with familiar classmates were less anxious at the start. These are links, not proof of cause, but they point the same way: a friend makes a new place feel safer.

If you took the Infant class, you met babies who are slow to warm up. Many become preschoolers who watch for a long time before they join in.

In a study of about 275 preschoolers, highly shy children spent more time watching and playing alone, and started fewer interactions. Other children invited them to play just as often as everyone else, though. The hard part was saying yes.

And shy children can make friends. In one program, 60 very shy preschoolers met in weekly play sessions, and about four in ten made and kept a friend within eight weeks.

Small, gentle practice helps. In a program for very shy preschoolers, small groups practiced skills like saying hello and asking to join. Then they played, with an adult nearby to prompt and cheer them on. Afterward, the children were less wary and more social at preschool.

A similar program in China found the gains lasted two months later. A program that worked with both parents and children helped shy children start more interactions at preschool.

How parents respond matters too. In one study, shy toddlers stayed shy at four mainly when their mothers took over or criticized. Gentle support, without pushing or rescuing, seems to work best.

Give your child time to warm up. Arrive a little early, so they enter a quiet room instead of a busy one, and let them watch from your side for a while.

Smaller is easier. One friend at home is often more comfortable than a big party. In one study, shy children were more likely than others to play at home with a single friend.

Practice the moves at home: watching first, playing alongside, then offering a toy or an idea. And speak about your child warmly, as someone who likes to look first, rather than as the shy one.

Joining a game that's already going is hard at any age. In observations of preschoolers, children who got in tended to hang nearby, join the action with a toy or a gesture, and show they liked the game. Children who criticized it, or tried to take charge, were often turned away.

So you can coach a simple plan. Watch what the group is doing, do something similar nearby, then add something that fits, like bringing a new truck to the road they're building.

If it doesn't work the first time, that's normal. Trying again later, or trying a different group, is part of learning.

Parents play a quiet role here. In a study of 83 preschoolers, children whose parents arranged more play with other children at home were more cooperative and less often alone at preschool.

There was a second finding too. When parents included their child in the planning, like choosing who to invite, children started more of their own play with peers. And children who started more play were less anxious at preschool and better liked by classmates.

So playdates seem to matter, and so does letting your child help plan them.

In one study, parents were asked to help two unfamiliar preschoolers play together, and at other times to stay out of it. The children played better with a parent's help, especially the younger ones. Older preschoolers did about as well on their own.

In playgroups with their mothers, young children stayed close to their mothers at first. Over the following weeks, they moved steadily toward playing with the other children.

So help more at three, and with a new friend, then step back as play takes off. Being nearby is often enough.

Here's a simple recipe, drawn from these studies. Invite one child, keep it to about an hour, and have it somewhere familiar.

Set out toys that two can share, like blocks, dress-up clothes, or a play kitchen, and put away anything too special to share. Help them get started, then step back, and stay close enough to help if things get stuck.

Have a snack ready, and end while it's still going well. A short, happy playdate makes the next one easier.

Here are three things to take with you.

Side by side counts. Playing next to another child is often the way into playing together.

Make room for friends. Arrange playdates, one friend at a time, and let your child help plan them.

Warm up, don't push. Give shy children time, small groups, and practice, and stay close at first.

Between three and five, play moves from side by side to shared games, and first friendships appear. Friends give children a place to practice getting along and making up.

In the next lesson, we'll look at why sharing is so hard at three, how children's sense of fairness grows, and why preschoolers are such eager helpers. I'll see you in that lesson.$t$),
    ('sharing-fairness-and-helping', '5d1fe353faa858b2c29bd8ec26b1fb11', '88785a3c8d1bef3da8ee0ce7cc7d74d1', $t$Picture a three-year-old who drops everything to help you pick up spilled crayons. A few minutes later, she won't let her friend touch her truck, not even for a second.

In this lesson, we'll look at why young children are such eager helpers, and how rewards can get in the way. We'll see why sharing is hard at three and easier at five, and how a sense of fairness grows. We'll also see why turns and real choices work better than forced sharing.

In a well-known set of studies, an adult dropped a clothespin out of reach, or couldn't open a cupboard with full arms. Most eighteen-month-olds toddled over and helped, without being asked or thanked.

They didn't help when the adult threw the clothespin down on purpose, so they seemed to understand what the adult was trying to do. Even fourteen-month-olds helped with simple tasks like this.

Toddlers also seem to care that the person gets helped, not just about doing the helping themselves. In one study, toddlers' pupils, a rough sign of tension, relaxed just as much when someone else helped as when they helped.

So what happens if you pay a toddler to help? In one study, some twenty-month-olds got a small toy each time they helped. Others got praise, or nothing at all.

Later, when no rewards were on offer, the children who had been given toys helped less than the others. A later study found the same pattern for sharing in three-year-olds.

Lesson 1.2 showed that promised rewards can lower interest in things children already enjoy. Helping seems to be one of those things. A small toy can quietly turn a kind act into a job, while thanks and warmth keep it a choice.

Words can help too. In a study of 149 children aged three to six, an adult talked either about being a helper, or about helping. Being a helper got more children to pitch in.

There is a catch, though. In a later study, four- and five-year-olds asked to be helpers coped worse after something went wrong, like a spill. A mishap may feel like proof they aren't really a helper after all.

If you took the Toddler class, you met the idea of children as helpers in the family. Invite children to be helpers, and when things go wrong, talk about what happened and what to try next.

Sharing is a different story. Researchers often give a child some stickers and let them give any number to another child they won't meet. Over a dozen studies show a striking gap.

Young children often say each child should get half, and then keep more for themselves. They know the rule before they can follow it.

In a large study of children from three to eight, most three- and four-year-olds chose to keep more for themselves when given the choice. By seven and eight, most preferred an even split.

Part of the gap is self-control. In one study, toddlers who could wait for a treat at two, or stop themselves at two and a half, shared more at five.

Another part is counting. Children who understood numbers better shared more fairly. In a study of 316 children aged two and a half to five and a half, a five-minute counting game made their sharing fairer.

So a three-year-old who keeps most of the stickers may simply not be able to count them out evenly, or to hold back while doing it.

Between three and five, sharing changes in other ways too. In one study, two- and three-year-olds shared mainly when the other child made it clear what they wanted. Four-year-olds were more likely to share without being asked.

Around four, children start to share more with friends than with children they don't like. Four-year-olds also give more to a child who seems to have less.

If you took the Toddler class, you saw that understanding what is mine comes before real sharing. Over these years, children add an understanding of what others need and feel.

What about fairness? In one game, a child could accept or turn down a split of candy between two children, and turning it down meant neither got any.

Children from four to seven turned down splits where they got less. They mostly accepted splits where they got more. By eight, children turned down both.

In a study in seven societies around the world, objecting to getting less showed up everywhere by middle childhood. Objecting to getting more came later and depended more on culture. So at four, unfairness mostly means getting less.

Fairness can show up early, though, in the right setting. In one study, pairs of three-year-olds pulled ropes together to get marbles, but one child ended up with more.

After working together, the lucky child usually gave one back to even things out. When the marbles came without any shared work, they did this far less. Chimpanzees in the same setup did not share this way.

Other studies of three- and four-year-olds found the same thing. Working together makes an even split feel right, so try doing the work together first, then dividing up the reward.

Giving also seems to feel good, even very early. In one study, toddlers under two looked happier giving a treat to a puppet than getting a treat themselves.

They looked happiest of all when they gave away one of their own treats. Another team repeated the study with 134 toddlers, and found children were happier giving than getting.

But how the giving happens matters. In a study of three- and five-year-olds, children were happier after sharing they had chosen to do, and not after sharing they were told to do.

Choice may matter for the future too. In one study, three- and four-year-olds met a sad puppet. Some had to choose between keeping a sticker and giving it away.

Others were told to give a sticker, or had a choice that cost them nothing. Later, they met a new sad puppet. The children who had made a real choice to give shared more.

One idea is that choosing to give helps children see themselves as people who share. Making a child hand over a toy can get it across, but it may not build the habit.

Many toy fights are really about who owns something. Three- and four-year-olds tend to think that whoever had something first owns it. They side with owners even more strongly than adults do.

In a study of young children at home, conflicts over toys eased over time when mothers respected who owned what. And in another study, older preschoolers shared more when the toys belonged to the whole class than when the toys were their own.

So it helps to treat your child's own special things as theirs. In Lesson 3.1, we suggested putting special toys away before a playdate, and the rest become toys for taking turns.

Forced sharing means handing a toy over now, because an adult said so. Taking turns means the child with the toy gets to finish, and the next child gets it after that.

Turns work with what children already believe about who had it first. They also give the waiting child a clear promise. From about five, children start to take turns on their own with things they got together.

This approach comes from these studies rather than a single test of it. Help the waiting child wait with a timer, or something else to do, and help them ask for a turn when the other child is done.

At home, helping is everywhere. In a study of toddlers' everyday life at home, children often helped with everyday jobs, and parents usually responded with encouragement and thanks.

In another study, toddlers whose mothers invited them into chores and showed them how to help went on to help more. So letting your child carry the napkins or stir the batter is time well spent, even when it's slower.

Thank your child for what they did, mention how it helped, and skip the payment. That way, helping stays something they want to do.

Conversation helps too. In a study of parents reading picture books with toddlers, some parents asked their child to name what a character felt and why.

Their children shared and helped more readily. Parents who only named the feelings themselves didn't see this link. If you took Lesson 1.3, you saw how talk about characters' thoughts and feelings helps children understand others.

In real life, you can point out what another child might need, like a friend who has no blocks. Then let your child decide what to do.

Here's how the pieces fit together at home. Count out snacks or stickers together, so even splits get easier. Work together on a job, then share the reward.

Give your child real chances to choose to share, and notice when they do, without forcing it. Treat their special things as theirs, and use turns for shared toys.

Invite your child to help, thank them warmly, and save rewards for other things. When a three-year-old won't share, remember the gap between knowing the rule and being able to follow it.

Here are three things to take with you.

Let helping be its own reward. Thank your child and skip the prizes, so helping stays their own.

Turns before forced sharing. Let the child with the toy finish, and help the other wait.

Choice builds generous children. Real chances to choose to give, and doing things together, grow sharing and fairness.

Young children are eager helpers, and sharing and fairness grow between three and five as self-control, counting, and understanding others grow. Real choices, turns, and shared work help more than forcing or paying.

In the next lesson, we'll look at how often preschoolers fight and how most conflicts end, at being left out, and at big feelings in groups. I'll see you in that lesson.$t$),
    ('conflict-exclusion-and-big-feelings-with-others', 'b1c6fb76896c5ee841bfafa74cc818d3', 'b7d569883d13f8333c7f586ee7f72b8f', $t$Picture two four-year-olds building a fort out of couch cushions. They argue about where the door goes, and one announces that the other can't play anymore. Two minutes later, they are building again as if nothing happened.

In this lesson, we'll look at how often preschoolers fight and how most conflicts end. We'll see when to step in and when to coach from the side. We'll also look at being left out, at jealousy and frustration in groups, and at aggression that needs more help.

Conflict between preschoolers is very common. In one study, researchers filmed 400 children aged two to four during free play, for 10 minutes or less each. About four in five got into a conflict in that short time.

In another study, children wore small cameras on their heads in a preschool classroom. Their conflicts tended to be brief and frequent.

Conflicts about someone getting hurt were uncommon in the first study. As we saw in Lesson 2.2, real fighting is far rarer than play fighting.

In that large study, four-year-olds had conflicts about as often as two-year-olds did. What changed with age was what the conflicts were about, and how children handled them.

Two-year-olds fought mostly over things, like toys and space. Three- and four-year-olds argued more about play and ideas, such as the rules of a game or who gets to be the dog.

Older children also dug in less, and came up with more solutions of their own. So an argument about how the game should go is a step forward, even when it's loud.

So how do these conflicts end? In one early study, researchers watched preschoolers in small groups with no adult stepping in. Children often responded to each other's protests, and settled many conflicts on their own.

A study of five-year-olds found that most conflicts ended with one child giving in, and the two playing apart. But when a child made a friendly gesture, the pair nearly always went on playing together.

A later study looked at over 500 conflicts among four- to seven-year-olds. Kind acts like sharing and helping were most strongly tied to endings that worked for both children.

Adults step in less often than you might think. In the large study, teachers got involved in about one in three conflicts. In the camera study, it was fewer than half.

What happens when they do? In a study of 91 preschoolers, children whose conflicts were interrupted by a teacher were less likely to make up on their own and keep playing together. A study of children under three in Italian nurseries found a similar pattern.

There is a caution here, because adults tend to step into the harder conflicts. Still, stepping in fast may take away a chance to practice.

How an adult steps in seems to matter more than whether they do. In the camera study, teachers mostly just stopped the conflict.

Less often, they helped the children work it out. Those conflicts tended to end better than conflicts with no adult at all, and conflicts that were simply stopped tended to end worst. This was one classroom, so treat it as a lead rather than proof.

Studies of preschools in Sweden and Japan describe what that help looks like. The teacher helps each child say what they want, sometimes giving them the words, and asks the other child to listen.

So here is a way to coach from the side. If no one is getting hurt, wait a moment and watch, because many conflicts end without you.

If they're stuck, come close and get down to their level. Say what you see without blaming anyone, and name the feelings, as we covered in Lesson 1.3. Help each child say what they want, and ask both of them what might work.

Then let them choose, even if their solution isn't the one you'd pick. Step in right away when someone is being hurt, or when one child is always the one who loses.

What about making children say sorry? Apologies do matter to young children. In one study, four- to seven-year-olds who got an apology after a disappointment felt better, and saw the other child as nicer.

In another study, children saw an apology as real when an adult had prompted it and the child gave it willingly. When the child was plainly forced, children aged four to six thought the one receiving it would feel worse.

In a third study, six- and seven-year-olds had their block towers knocked over. An apology helped the friendship, but only an offer to make it right made them feel better. So a gentle prompt is fine, and helping to fix it matters most.

Now to being left out. In one study, researchers put small microphones on 42 children aged four to six and recorded them on the playground. Telling another child they couldn't play happened often.

Well-liked children did it too, usually in softer ways, like ignoring a child or giving a reason. So hearing that you can't play is an ordinary part of these years.

There is a different pattern to watch for. In a study of Norwegian kindergartens, one or two children in each were left out again and again, and adults often missed it. The children said being left out of play was what they feared most.

Do preschoolers think leaving someone out is wrong? In interviews, four- and five-year-olds said it was wrong to keep a child out of a game just for being a boy or a girl. They gave fairness as the reason.

But when they had to pick who could join, the younger children often went with the stereotype. When asked to think it over, they chose fairness.

In other studies, three- and four-year-olds could spot when someone was being left out. But only five- and six-year-olds preferred to play with children who include others. As with sharing in the last lesson, knowing comes before doing.

Some classrooms use a rule that no one may tell another child they can't play. Researchers tested it for a year in six kindergarten classes, with four other classes for comparison.

The results were mixed, because children in the rule classes said they liked each other more, but observers saw no difference in how they played. The children themselves also reported feeling less happy with their social lives.

So a rule alone isn't the fix. Children often say they are protecting a game that is already going, so it helps to find the newcomer a part in it. Lesson 3.1 covered how to help a child join.

Some of this gets sharper around four. A child may threaten to stop being someone's friend, or announce who isn't invited to the birthday. Researchers call this relational aggression, which means hurting someone through the friendship itself.

In one study that observed preschoolers, girls used it more than boys, and boys used more hitting and harsh words. Children who use it are often liked by some classmates and disliked by others.

It also hurts the child on the receiving end. In a study of 300 preschoolers, children who were targets of it showed more signs of anxiety a year later. So respond the way you would to hitting, calmly and every time.

Big feelings come with all of this, and jealousy is one of the first. In one study, children's jealousy was strongest between about one and two years old, when their mother gave her attention to another child.

Preschoolers still feel it, and they also start to compare. Researchers asked three- to nine-year-olds about envy. It was stronger when another child was chosen for being better at something than when that child simply had a nice toy. It was strongest in the younger children.

In a study of older children, envy and gloating both faded with age. So name the feeling without shame, and expect it to ease.

Frustration and disappointment are harder to manage in a group, with other children watching. One study followed about 120 preschoolers for two years. Children who often showed anger with classmates were rated as less skilled with other children a year later.

What helps is having something to do with the feeling. In one study of three-year-old boys, those who looked away from the thing that frustrated them, or asked questions about the wait, showed less anger.

When researchers combined 21 studies, preschoolers with helpful ways to handle feelings were better accepted by other children. Practice one or two of those ways when everyone is calm.

Lesson 1.4 showed that hitting usually fades after three, and that frequent hitting at five deserves attention. Here is why the other children matter too.

Researchers followed several hundred children from kindergarten on. Being rejected by classmates was followed by more aggression later, mostly in children who were already aggressive. Aggression, in turn, was followed by more rejection, and one study called it a snowballing cycle.

Aggressive preschoolers are also quicker to see an accident, like a bump in line, as done on purpose. So if your child often hurts others, is being avoided, and takes accidents as attacks, talk with their teacher and their doctor.

The good news is that these skills can be taught. When researchers combined 48 studies of preschool programs that teach feelings and getting along, children gained social skills and had fewer behavior problems. The gains were larger for children who were already struggling.

In one trial, four- to eight-year-olds with serious behavior problems joined small groups that practiced friendship skills and solving problems. They were less aggressive at school and handled conflicts better, and most gains held a year later.

An eight-week classroom program with puppet shows reduced the friendship kind of aggression too. So ask what your child's preschool teaches, and ask for help early if you're worried.

Here are three things to take with you.

Conflict is practice. Most arguments are short and end without you, so give them a moment first.

Coach, don't referee. Help each child say what they want, and help them make it right.

Watch the pattern, not the moment. One rough day is normal, but a child who is left out or hurting others week after week needs your help.

Preschoolers argue often, and most conflicts are short and end without an adult. Being left out, jealousy, and frustration are part of learning to be with others, and calm coaching helps more than quick rulings.

That brings Module 3 to a close. In the next module, Ready for School, we start with the kind of talk that builds thinking, and I'll see you in that lesson.$t$),
    ('talk-that-builds-thinking', 'dec17af76a90275ae9288d06b5c0103a', '005906995777b17a0d265b9e87574266', $t$Picture a four-year-old at dinner who asks why the moon followed the car all the way home. You admit you aren't sure, and ask what she thinks. She decides the moon wanted to see where she lives.

In this lesson, we'll look at talk that goes beyond the here and now, and at telling stories about the day. We'll see how to answer why questions, and why bigger words matter. We'll also cover growing up with two languages, and when speech or language is worth checking.

If you took the Toddler class, you know how much back-and-forth conversation matters. Between three and five, something new becomes possible. Your child can talk about things that aren't in front of them, like yesterday, tomorrow, make-believe, and the reasons things happen. A two-year-old talks about the dog that is here, and a four-year-old can tell you about the dog she saw last week.

One study followed 50 families for several years. With toddlers, the variety of words parents used mattered most. With preschoolers, it was talk about past and future events, and explanations.

Children who heard more of it had larger vocabularies a year later, even when comparing parents who talked the same amount.

The effects seem to last. In one study, parents' talk about the there and then at age two and a half predicted children's vocabulary, sentences, and storytelling in kindergarten.

In another, researchers looked at how much of a child's own talk at two and a half went beyond the here and now. That share predicted how well the child handled the language of schoolbooks at age 12.

One likely reason is that when there's nothing to point at, words have to do all the work, and that takes longer, richer sentences. These were small studies that watched families over time, so they can't prove cause on their own.

Can parents do more of it? One team tested that with 36 parents of four-year-olds. Half got a single short session on why this kind of talk matters, with ideas for mealtimes.

Over the next month, those families recorded four dinners. Both the parents and the children talked much more about the past, the future, and how things work, and the change held all month. Their conversations also had more back-and-forth turns.

One caution is that children's test scores didn't change in that month, so the long-term payoff still rests on the earlier studies.

The easiest place to start is the past. Researchers taught mothers a richer way to talk about shared memories: ask open questions, add details, and follow the child's version of the story.

In one trial with over a hundred families, toddlers whose mothers learned this gave fuller memories at three and a half. In another, with four-year-olds in Head Start, it improved children's storytelling more than a well-known book-reading method.

The first group was followed into the teen years. At 11 and 15, those children told clearer stories about hard times in their lives.

Here's what it sounds like. Pick something you did together, like the trip to the dentist. Ask what happened first, who was there, and what the funny part was.

When your child gets stuck, add a detail and hand the story back, and try not to repeat the same question. Talk about how it felt too, as we covered in Lesson 1.3.

The future works the same way, so plan tomorrow out loud together. One caution: in a recent small trial, parents learned the style well, but gains in children's memory were less clear. So enjoy it as conversation, and don't run it as a drill.

Storytelling also connects to reading. In a British study of about 700 children, the ability to tell a story at five predicted reading comprehension at 10, and school exam results at 14. That held even when comparing children of similar ability and family background.

A smaller study found the same link 10 years on. That makes sense, because following a book means following a story.

Not every study agrees on how much storytelling adds beyond a child's general language. We'll look at reading itself in the next lesson.

Then there are the why questions. Researchers studied recordings of preschoolers asking adults why and how, and looked at what children did next.

When the adult gave a real explanation, children tended to agree or ask a new question that built on it. When the answer explained nothing, they asked the same question again, or made up an explanation of their own.

An experiment with 42 children aged three to five found the same pattern. So when your child asks why for the fifth time, it may mean the answer hasn't explained it yet.

Children also hold on to good explanations. In one study, four- and five-year-olds remembered the real explanations they were given, and mostly forgot the answers that didn't explain anything.

A short, true reason is enough. For the moon, you might say it is so far away that it seems to stay beside us, the way a distant mountain does. If you don't know, say so, and find out together, because that teaches something too.

You can also turn the question around and ask what your child thinks. In a study of 20 preschool classrooms, children came up with more of their own explanations where teachers did this more often.

The questions you ask matter as well. In a study of fathers and their two-year-olds, how much a father talked didn't predict his child's language. How often he asked questions starting with who, what, where, or why did, for vocabulary then and for reasoning a year later.

Children gave longer answers to those questions. And in a study of 96 teachers reading aloud, most questions could be answered in a word, while why and how questions drew longer replies.

As in Lesson 2.3, the best questions are ones you don't already know the answer to.

The words themselves matter too, and not only the topics. In one study, researchers recorded low-income mothers talking with their five-year-olds at meals, at play, and over books. Nearly all of what the mothers said used the same few thousand common words.

What predicted children's vocabulary in kindergarten and second grade was the rare words, more than the total amount of talk. It mattered most when the mother made the meaning clear. An earlier study of three- and four-year-olds found that family mealtimes were especially rich in rare words.

So use the real word, and help with what it means. Your child's tower can be enormous, and a tired child can be reluctant.

Knowing a word isn't all or nothing. A child may recognize a word long before they can use it or explain it.

In a study of preschool classrooms, children picked up new words just from hearing the same books again. They learned more, and could use the words, when an adult also explained them. Children who already knew more words learned faster, which is a reason to start early.

When researchers combined 72 studies, vocabulary and grammar in preschool predicted every part of early reading. So come back to good words over several days, in different places.

What if your family uses two languages? Children learning two languages often know fewer words in each one than children learning only one. Counted across both languages, they know as many words, or more.

How well a child knows each language follows how much of it they hear. In a study of five-year-olds in Montreal, children who heard both languages about equally understood as many words as children with one language.

Mixing languages in one sentence is normal, and it isn't confusion. In one experiment, five-year-olds learned new words at least as well when the explanation mixed both languages.

Parents often ask which language to use at home. One study followed about 150 children from Spanish-speaking homes in the United States, from age two and a half to twelve.

After about four, the two languages grew side by side without holding each other back. Once school began, English kept growing whatever was spoken at home. Spanish kept depending on how much of it children heard at home.

So speak the language you speak best, because that is where your richest talk and your best stories are. The school language will come, and the home language needs you.

Now, when is speech worth checking? One study had strangers listen to over 500 children. A typical child was half understood by strangers just before three, and three-quarters understood just before four.

The researchers' rule of thumb is that by four, strangers should understand at least half of what a child says. You will usually understand more than a stranger does, because you know your child. Mistakes on a few sounds are common until six.

Stuttering also often starts in these years. In an Australian study, about one in nine children had begun to stutter by four. Most children recover in time, but no one can tell which ones will, so it's worth seeing a speech-language pathologist.

Language is different from speech. Some children speak clearly but struggle to put sentences together, or to understand what's said to them. Researchers call this developmental language disorder, and it affects about two children in a class of thirty.

It is easy to miss, so it helps to know the signs. At four, they include very short sentences, trouble following directions, and trouble telling you what happened. A family history raises the odds, and in children with two languages, a true difficulty shows up in both.

If you're worried, that is reason enough to ask your child's doctor for a referral, and studies show that help makes a difference.

Here are three things to take with you.

Talk beyond the here and now. Yesterday, tomorrow, and the story of the day stretch your child's language.

Answer why with a reason. A short, true explanation, or an honest answer that you don't know, keeps the questions coming.

Use rich words in your best language. Real words, explained and repeated, in the language you speak most easily.

Between three and five, conversation can leave the here and now, and that kind of talk builds vocabulary, storytelling, and thinking. Good explanations, rich words, and your own best language all help, and a worry about speech or language is worth raising early.

In the next lesson, we'll look at what really prepares children to read, without worksheets, and I'll see you in that lesson.$t$),
    ('early-literacy-without-worksheets', 'ffbeb2cdfd5ef0e21622817b5d74c259', '5b0c9b975e32e786d78880ec593697d9', $t$Picture a four-year-old in the back seat who calls out the name of her favorite restaurant every time she sees its sign. She can't read yet, but she has noticed that print means something.

In this lesson, we'll look at what really predicts reading later on, and at playing with the sounds inside words. We'll cover learning letters, reading books in a way that gets your child talking, and pointing out print. We'll also look at early writing, why worksheets aren't the goal, and when reading is worth watching.

Learning to read takes two kinds of skill. One is cracking the code, which means knowing letters and hearing the sounds inside words. The other is understanding language, which means knowing words and how sentences work.

When researchers combined 64 studies that followed children from preschool into school, both mattered. Letters and sounds led to reading words. Vocabulary and grammar led to understanding what was read.

In one study of more than 600 children, the code mattered most in the early grades, and language mattered more as books got harder. Lesson 4.1 covered the language side, so this lesson focuses on the code.

Before children can match letters to sounds, they need to hear that words are made of sounds. They notice that cat and hat rhyme, that sun and sock start the same way, and that a word can be clapped into beats. Researchers call this phonological awareness.

It grows from bigger pieces to smaller ones. Children usually hear words and beats first, then rhymes, and last of all the single sounds inside a word, often around five or six.

Those single sounds matter most. In a British study of 90 children starting school, hearing the sounds in words and knowing letters predicted word reading two years later. Rhyming on its own did not.

Can parents and teachers build this skill? When researchers combined the early trials that taught it, children got better at hearing sounds, and soon read words better too.

Two details matter. The long-term gains were much smaller, and teaching worked better when letters were part of it. A recent review found the same thing, so sounds and letters belong together.

In a Swedish trial with over 300 children, short sound games at four and again at five improved sound skills and early reading. The children most at risk for reading trouble gained the most.

This doesn't need a program. It fits into the car, the bath, and the grocery line.

Clap the beats in your child's name, or in a long word like banana. Play I spy with the first sound of a word instead of a color. Sing rhyming songs, and swap in a silly wrong rhyme to see if your child catches it.

With four- and five-year-olds, say a short word slowly, sound by sound, and let them guess it. Then link a sound to its letter, like noticing that sun starts with S, the same letter as Sam. A few minutes here and there is plenty.

Letters are the other half of the code. Knowing letter names and their sounds is one of the strongest early signs of how reading will go.

In one American study, letter names at five were the best single predictor of which children struggled to read later. Another study followed about 370 children in public preschools. Those who knew at least ten letter names by the end of preschool rarely struggled in first grade.

There is no need to rush. In a newer study, some children who started preschool knowing few letters learned them quickly and did fine. The children to watch were the ones who weren't learning letters, even with practice.

Where do children start? With the letters in their own name. In studies in the United States and Australia, preschoolers knew the first letter of their own name better than other letters, and could write it better too.

So a name makes a great first word. Point to the letters on their cubby and their drawings, and hunt for their letter on signs and cereal boxes.

Teach a letter's sound along with its name, because the sound is what reading uses. And look beyond the name. In one study, some children could write their name well but knew few other letters.

Families tend to do two different things with print. One is reading stories together. The other is teaching letters and words directly.

A Canadian study followed about 170 children for five years. Story reading went with bigger vocabularies and better listening. Teaching letters and words went with early reading skills. Both paths led to stronger reading in third grade.

In a later study, children who were read to more in kindergarten read more for fun in fourth grade. One caution is that parents pass on some of their own language skills, which may explain part of the story link. Both habits are still worth keeping.

Not all reading aloud is the same. In one well-studied approach, your child slowly becomes the storyteller. You ask a question, respond warmly, add a little more, and invite your child to say it again. Researchers call this dialogic reading.

When researchers combined 16 studies comparing it with ordinary reading aloud, children learned more words they could actually say. The gains were smaller for four- and five-year-olds than for two- and three-year-olds.

In a trial with over 360 kindergarteners in China, parents' questions alone helped vocabulary and understanding. Adding the warm reply and the extra detail helped more, and children grew more interested in reading.

Here's the honest part. A large review in 2019 found that programs to boost reading together helped language less than earlier reviews suggested. When the comparison group did some other activity, the difference almost disappeared.

Another review, of 30 home reading trials, found that many programs didn't work, and gains often faded. The one approach that helped consistently was this talk-centered style.

So books aren't magic on their own, as the Infant class said. The conversation around the book seems to matter most, and that is something you can do any night.

Here's what it can look like. Choose a book you've read before, so your child knows the story.

Pause and ask what is happening, or what might happen next. When your child answers, say something warm, add a word or two, and let them say the longer version. With a rhyming book, stop before the last word and let your child fill it in.

Connect the story to your child's life, like the time they lost a toy too. And as in Lesson 1.3, talk about how the characters feel. Keep it to a question or two per page, and let it go when your child just wants to listen.

Children rarely look at the words on a page. In one study that filmed three- to five-year-olds during a story, less than two percent of their looking time went to print. When the reader pointed to the words, they looked much more.

A trial with about 550 four-year-olds tested this in 85 classrooms. For 30 weeks, teachers pointed out print while reading. Two years later, those children read, spelled, and understood better.

At home, run your finger under the title, show where the story starts, and point out a big word or a letter from your child's name. A comment or two per book is enough.

Back to the restaurant sign. In a classic study, about 100 preschoolers who could name familiar signs and labels were shown the same words without the logo and colors. Only six could still read them.

Most didn't notice when a letter in a familiar sign was changed. So recognizing a logo is reading the picture, not the word. It's still a good start, because it shows your child that print carries meaning.

What helps is drawing attention to the letters. In a kindergarten study, children who played store with an adult who pointed out the words could later read those words on a plain list. So point at the letters on the stop sign, and say which word they make.

Writing helps reading too. When children write a word the way it sounds to them, like the letters K and T for kite, they are working out how sounds and letters connect.

In a four-week trial, kindergarteners who spelled words their own way, with gentle feedback, learned to read more new words than children who practiced sounds alone. A Norwegian trial with about 100 five-year-olds found that this kind of writing still helped reading six months into school.

So invite writing, like grocery lists, cards, and labels on drawings. Don't correct every word. Notice the sounds they got, and show them one more sound they could add.

If letters matter, why not start formal reading lessons early? In New Zealand, researchers compared children who began reading lessons at five with children who began at seven. The early starters read better at first, but by age 11 the gap was gone.

The later starters understood what they read at least as well. Early lessons aren't harmful, and a British study found young children did fine with good teaching. They just didn't give a lasting head start.

So skip the worksheets and flashcards. Short, playful sound and letter games, lots of talk, and shared stories do the work. As Lesson 1.4 noted, rewarding reading can even lower a child's interest.

Some children find learning to read much harder than others, even with good teaching. Lasting trouble with reading words, in a child who is otherwise learning well, is called dyslexia. It runs in families.

Researchers have followed children who have a parent with dyslexia. Between a third and two thirds had reading trouble themselves, compared with about one in ten other children. Early signs at four and five include trouble learning letters even with practice, and trouble hearing rhymes or first sounds. The language signs from Lesson 4.1 count too.

Tests can only pick it out reliably close to the start of school. So if reading trouble runs in your family, tell your child's teacher and doctor early. Help in the first grades works better than help later.

Here are three things to take with you.

Play with sounds and letters. A few minutes of rhymes, beats, first sounds, and the letters in your child's name go a long way.

Let your child talk during stories. Ask, add, and let them retell, and point out the print now and then.

Skip the worksheets. Early writing, play, and conversation build readers, and a family history of reading trouble is worth mentioning early.

Reading rests on cracking the code and understanding language. Between three and five, you can build both through play, with sound games, letters from familiar words, talk-filled stories, pointing out print, and your child's own writing.

In the next lesson, we'll look at how children climb from reciting numbers to understanding what they mean, and I'll see you in that lesson.$t$),
    ('early-math-the-counting-ladder', '4a5e2bbd6b9f6202d998eda1b271e251', 'aacc72261ccc40cf0d5cc8bf891b979b', $t$Picture a three-year-old who proudly counts to ten on the stairs. A minute later you ask her for three crackers, and she hands you a happy fistful. She can say the numbers, but she doesn't yet know what they mean.

In this lesson, we'll look at the steps children climb from reciting numbers to understanding them, and at how to find your child's step. We'll cover number talk at home, number books, and board games. We'll also look at blocks and puzzles, and at what to do if math makes you nervous.

Counting to ten is a bit like singing the alphabet song. It is a list your child has memorized, and it is a real first step. Knowing what the words mean comes later, and it comes slowly.

Researchers test this with a simple game. They ask a child to give a puppet one toy, then two, then three, and so on. In the first study, the youngest children could give one toy, and sometimes two. For any bigger number they grabbed a handful, and they never counted to work it out.

The older children counted the toys out carefully. So two children who can both count to ten out loud may be in very different places.

Children learn what the number words mean one at a time, and in order. First a child knows exactly what one means, and every other number just means a lot. Months later she knows two, and later still, three.

Researchers name each stage for the biggest number a child knows. A child who can hand you one thing, but not two, is called a one-knower. Next comes a two-knower, then a three-knower, and sometimes a four-knower.

In a study of 280 children aged two to four, the wrong answers were mostly guesses, and not counting mistakes. Think of these stages as rungs on a ladder, and expect each rung to take months.

After three or four, something bigger happens. A child works out that counting itself tells you how many, because the last number you say is the size of the whole group. Researchers call this the cardinal principle.

From then on, she can count out seven or nine things as easily as three. The first study put this step at about three and a half. A later study in Belgium followed children month by month, and found the climb took far longer than that and was more gradual.

The same rungs show up in very different cultures, but the ages vary a lot. So treat the ladder as a map and not a deadline.

This step turns out to matter for school. One study followed about 140 children through two years of preschool. The age at which a child understood what counting means was strongly tied to number knowledge at the start of first grade.

That held even when comparing children of similar general ability and family background. In related work from the same project, children's understanding of written numbers grew much faster once they had made the step.

These studies watch children over time, so they can't prove cause. They are still a good reason to help a child along the ladder, and Lesson 4.4 looks at readiness more broadly.

What moves children up the ladder? One answer is how much they hear about numbers. Researchers visited 44 families at home while their children were between one and two and a half.

Some parents used number words far more than others. The more number talk children heard, the better they understood number words at almost four, even when comparing families with similar incomes and similar amounts of talk overall.

The kind of talk mattered too. What helped was counting or naming groups of things the child could see, like four cars or six grapes. Talk about bigger groups, from four to ten, predicted the most.

Those were families simply being watched, so researchers ran a test. A hundred children aged two to four were given picture books to read with a parent every day for four weeks.

Some books were about small numbers, from one to three. Some were about bigger numbers, from four to six, and some had no numbers. The small-number books helped most, and children who were further up the ladder also gained from the bigger-number books.

A second trial with three-year-olds compared two kinds of counting books. Books that wrapped the numbers in a story, with a reason to count, beat plain counting books. The plain ones did no better than books about colors.

There is a simple trick that makes number talk work better. When children only hear counting, they may treat it as a chant. They need to hear the count tied to the total.

In one study of three-and-a-half-year-olds, the only training that helped was naming how many there were and then counting them. In another, counting first and then stressing the last number worked best. In both, counting on its own was not enough.

So it makes sense to do both. Say that there are three cups, count them one by one, and then say three again. In a six-week trial with about a hundred preschoolers, practice like this improved their understanding of how many.

You can find your child's rung with the same game researchers use. At snack time, ask for one cracker, then two, then three, and watch what happens. A child who gets one and two right, but grabs a handful for three, is a two-knower.

Then aim your number talk at the next rung. For a two-knower, that means pointing out lots of threes. Treat one try as a rough guess, because in one study the game gave less steady answers at some stages than at others.

If you'd like help, Number Path on the Growing Minds Science site is a short check-in that finds your child's rung and suggests games to match.

Games help too, and one well-known study shows how. Preschoolers from low-income families played a simple board game with an adult. The board was a straight row of squares numbered one to ten.

After about an hour of play in total, the children were better at counting, at reading numbers, at comparing them, and at placing them on a line. The gains were still there nine weeks later.

Classmates who played the same game with colors instead of numbers didn't improve. In a follow-up, a straight board worked better than a round one, likely because it lines the numbers up from small to big.

Later results are more modest. When researchers combined 18 studies of these games, the average benefit was real but small.

In a British trial with about 250 four- and five-year-olds, a number game played at school added nothing beyond regular math lessons. So games seem to help most when a child isn't getting much number practice elsewhere.

Ordinary board games count as well. In another study, children who played regular games with dot dice gained more than children who played with color dice. As you move, say the numbers on the squares out loud, so your child hears them in order.

Early math is more than numbers. It also includes shapes and space, like seeing how pieces fit together or picturing a shape turned around.

In one study of about 100 three-year-olds, children who were better at copying a block building also did better at early math. In later work by the same team, these skills at three predicted math at five.

Another study watched 53 children at home between two and four. Those who played with puzzles were better at turning shapes in their minds at four and a half, and more puzzle play went with stronger skills. As Lesson 2.3 covered, words like above, between, and corner help too.

Does building and puzzling actually cause better math? When researchers combined 29 training studies, practice with spatial skills did improve math a little. It worked better with real objects than on screens, and better for older children than for three-year-olds.

Two recent preschool trials were more cautious. In one, five weeks of shape puzzles improved three-year-olds' spatial skills, but barely moved their math. In another, eight weeks of block play helped with shapes and self-control, but not clearly with numbers.

So blocks and puzzles are well worth it for spatial thinking, which matters in its own right. Just don't count on them to teach numbers.

Counting out seven crackers isn't the top of the ladder. Children still have to learn how numbers relate to each other.

In a study of 100 children aged four to seven, most didn't grasp that every number has a next one until five and a half or six. They were also that old before they knew the next number is always exactly one more. That is about two years after children learn to count things out.

Math words help here, as a study of about 110 preschoolers showed. Those who knew more words like more, fewer, and most in the fall had stronger number skills by spring. So compare things out loud, asking who has more and what one more would make.

Here's the honest picture of math at home. When researchers combined 64 studies, families who did more math activities had children with stronger math, but the link was small.

A review of number talk found the same, and the link shrank further once children's earlier skills were counted. Programs that coach parents helped a little, and more when parents got follow-up support.

So no single game or book is magic. What the trials support is small and often: numbers your child can see, matched to their rung, in the middle of ordinary life. As Lesson 3.2 noted, counting out snacks even helps with sharing.

Many adults feel uneasy about math, and that can shape what children hear. In a study of about 300 preschoolers, children whose parents felt more anxious about math made less progress in math that year.

The encouraging part comes from a trial with nearly 600 first graders. Families were given short number stories to read and talk about together. Children's math improved over the year, and most of all when parents were anxious about math.

Those children were older than preschoolers, so take it as a hint. The point is that you don't need to be good at math. Counting cups and playing a board game is the kind of math a preschooler needs.

Here are three things to take with you.

Saying numbers isn't knowing them. Children climb one rung at a time, so find your child's rung and aim for the next one.

Count, then say how many. Name the total for things your child can see, in stories, at snack time, and on the stairs.

Play with numbers and space. Board games, blocks, and puzzles all help, and a few minutes at a time is enough.

Children climb from reciting numbers, to knowing one, two, and three, to understanding what counting is for. Number talk about things they can see, number stories, and simple games all help them climb, at their own pace.

In the next lesson, we'll look at what being ready for kindergarten really means, and I'll see you in that lesson.$t$),
    ('what-readiness-really-means-and-the-year-ahead', '455ea8cfa858b925b1443407a0beaa23', 'cd467de49ac85f6183a71082b04eea53', $t$Picture a parent at kindergarten sign-up night, holding a checklist she found online. It asks whether her son knows his letters, counts to 20, and writes his name. He can do two of the three, and she drives home wondering whether he is ready.

In this last lesson of the class, we'll look at what being ready really means, and at which early skills predict how children do later. We'll cover what preschool can and can't do, what a good classroom looks like, and how to ease the move to kindergarten. We'll finish with the main ideas from the whole class.

Ask kindergarten teachers what ready means, and letters are rarely the first thing they mention. In a national survey of more than 3,000 kindergarten teachers, the answers leaned heavily toward the social side of learning.

A newer survey of about 500 teachers agreed. They valued skills like following directions, taking turns, and managing feelings most, and felt that many children arrived without them.

So that checklist covers only part of the picture. Letters and numbers matter, but teachers also hope for a child who can listen, wait, and get along.

Researchers have also asked which skills at the start of school predict how children do years later. The best-known study combined six large projects that followed thousands of children.

Early math skills were the strongest predictor of later achievement. Early reading skills came next, followed by the ability to pay attention.

Later studies in Canada found much the same. That is why the last two lessons spent so long on sounds, letters, and the counting ladder. These are links over time and not proof of cause, but they have held up well.

Attention deserves a closer look. In Lesson 1.1 we met executive function, the skills for holding on to a rule, holding back, and switching gears.

In a national study of nearly 9,000 children, those with stronger executive function in kindergarten did better in reading and math in second grade. A Canadian study followed almost 1,000 children from kindergarten to 17. Early math, and how well a child settled into classroom work, both predicted how they were doing at the end of high school.

So a child who can listen to a whole story, or stick with a puzzle, is practicing for school as surely as one who is learning letters.

Social skills are a different story. In that six-project study, getting along with others didn't predict later test scores, but look beyond test scores and the picture changes.

One American study had kindergarten teachers rate how well children shared, helped, and settled disagreements. It then followed the children for up to 19 years. Those rated higher were more likely to finish school and hold a steady job, and less likely to be in trouble with the law.

In a Canadian study of about 900 boys, those rated as kind and helpful at six earned more in their 30s, and those rated as inattentive earned less. So the skills from Module 3 count toward readiness too.

All of these are averages across thousands of children, and they say little about any one child. In a study of about 1,300 children, the advantage from early skills shrank as the years went by.

Another followed about 800 children to age 26. Their skills at school entry were only modestly tied to how they were doing as adults, so a child who starts behind in one area is not stuck there.

A study of about 1,800 kindergartners found that a child's overall mix of skills told more than any single one. So think of readiness as a whole child, and not as a score on one test.

Many parents hope preschool will make a child ready. In the short run, the research is clear. Children who attend preschool usually start kindergarten with stronger language, early reading, and math.

Over the next few years, the gap in test scores tends to shrink as other children catch up. A survey of kindergarten teachers suggests one reason, since teachers said they focus their help on children who start behind.

Longer-term results are more encouraging. When researchers combined 22 strong studies, children who went to preschool were less likely to repeat a grade and more likely to finish high school. In Boston, where places were given out by lottery, preschool didn't raise later test scores, but more of those children went on to college.

Not every program helps, and one careful study is a warning. Tennessee offered places in its state preschool program by lottery to about 3,000 children from low-income families.

At the end of preschool, the children who attended were ahead. By sixth grade, they scored lower than the children who hadn't gotten a place, and had more discipline problems. Researchers still argue about why, and programs in some other states have shown lasting gains.

For parents, the lesson is that the word preschool on the door guarantees nothing. What happens inside the classroom matters more than simply attending, and children can also build these skills at home or in good child care.

So what makes a classroom good? One large study compared three ways of judging quality, across about 2,400 four-year-olds in nearly 700 preschool classrooms.

The things that are easy to count, like the teacher's degree, the class size, and the number of adults, did not predict how much children learned. What did predict it was how teachers talked and connected with children.

Where teachers explained, asked questions, and stretched children's thinking, language and early academic skills grew more. Where teachers were warm and responsive, social skills grew more. A later review of 35 studies found these links to be small, but they point in a clear direction.

If you are choosing a preschool or a kindergarten, try to watch a classroom for a while. Notice whether teachers get down to the children's level, whether conversations go back and forth, and whether adults join in during play.

As Lesson 2.3 covered, a mix of teacher-led time and free choice serves children well. Your child's own bond with the teacher matters too. In a study of about 1,500 preschoolers, children with closer and calmer relationships with their teachers gained more in every area that year.

So bright walls and worksheets sent home tell you little. Ask how the teacher gets to know each child, and listen to how the children are spoken to.

Kindergarten is not what it was a generation ago. Researchers compared American kindergarten classrooms in 1998 and in 2010.

In 1998, about a third of teachers thought most children should learn to read in kindergarten. By 2010, about four in five did. Classrooms spent more time on reading and math lessons and on testing. They spent less on art, music, and activities that children choose.

That can make parents feel they should start drilling early, but Lesson 4.2 showed why earlier reading lessons don't make better readers later. In surveys repeated in one state, teachers still ranked listening and getting along ahead of school skills.

Starting kindergarten is a big change, and it is common to wobble. In a national survey, teachers judged that about one child in six had a hard start.

Schools try to help with classroom visits, orientation days, and meetings with parents. In one study of about 700 children, those whose preschools did more of this were rated as more socially skilled in kindergarten. It helped most when the two teachers talked to each other.

Results for learning are mixed, since an older national study found a small boost and a newer one found none. These steps are easy, though, so visit the classroom, meet the teacher, and practice the morning routine. As Lesson 3.1 noted, knowing even one classmate helps.

One relationship is worth special care. A well-known study followed about 180 children from kindergarten through eighth grade.

When a kindergarten teacher described the relationship with a child as full of conflict, that child tended to have lower grades and more discipline problems for years afterward. The pattern was strongest for boys and for children who already had behavior problems.

Children's own behavior shapes these relationships, so this isn't proof of cause. It is still a good reason to tell the teacher early what calms your child and what they love, and to speak warmly about the teacher at home.

Some parents wonder about waiting, so that a child starts kindergarten a year later. In national data, about one child in 20 starts late, most often boys and children from better-off families.

Children who start older do score higher at first. In most studies that advantage shrinks over the following years, though one large Florida study found that some of it lasted.

There is also a cost to consider. In a North Carolina study, most children with a disability did worse when they started late, likely because extra help arrives through school. So if a worry about development is your reason for waiting, talk with your child's doctor and the school first.

One part of readiness has nothing to do with skills, and it is simply being there. Kindergarten has more absences than any other elementary grade.

In a national study, some kindergartners missed about a tenth of the year, which is roughly two days a month. They made less progress in reading and math and were less engaged in class.

Parents often lose track of how the days add up. In a trial across 10 school districts, families were sent a note about how many days their child had missed. That alone cut the number of frequently absent children by about 15%. Sick children should stay home, of course, but ordinary attendance is worth protecting.

Before the takeaways, let's step back, because four ideas ran through this whole class.

First, self-control is still being built between three and five. Your child borrows your calm, and does best when rested, fed, and given a reason. Second, play is where preschoolers do their hardest thinking. It works best with an adult nearby who follows more than leads.

The third idea is that friends are practice. Sharing, fairness, and making up after a fight grow slowly, and coaching helps more than refereeing. Fourth, school skills grow out of ordinary life, through talk about why and how, stories read together, and numbers counted on the stairs. In every module, small things done often mattered more than any program or product.

Here are three things to take with you.

Ready means the whole child. Early math, language, attention, and getting along all count, and no single checklist captures them.

Look at the people and not the posters. In any classroom, how teachers talk with children tells you the most.

Make the first weeks familiar. Visit, meet the teacher, keep routines steady, and protect attendance through the first year.

Between three and five, your child has learned to wait a little, to pretend, to make a friend, to tell a story, and to count. None of it needed drills, and the year ahead will build on all of it.

That brings the Preschool Years class to a close, and thank you for spending this time with me. If you'd like to keep going, the Family Systems and Stress class looks at how the whole family shapes a growing child, and I hope to see you there.$t$)
    ) as v(slug, old_md5, new_md5, fixed)
  loop
    if md5(r.fixed) <> r.new_md5 then
      raise exception 'preschool/%: corrected text does not match its checksum', r.slug;
    end if;
    update public.class_lessons
       set transcript = r.fixed, updated_at = now()
     where course_slug = 'preschool' and slug = r.slug and md5(transcript) = r.old_md5;
    get diagnostics changed = row_count;
    if changed = 0 and not exists (
      select 1 from public.class_lessons
       where course_slug = 'preschool' and slug = r.slug and md5(transcript) = r.new_md5
    ) then
      raise exception 'preschool/%: written version changed since the 2026-10-08 export; nothing applied', r.slug;
    end if;
  end loop;
end
$fix$;
