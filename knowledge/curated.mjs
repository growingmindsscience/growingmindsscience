// Curated developmental-science knowledge cards for Growing Minds AI.
//
// These are concise, accurate summaries of well-established developmental
// science, each attributed to a reputable source or originating framework.
// Where a popular claim has meaningful caveats (e.g. the "word gap" or the
// marshmallow test), the nuance is included on purpose — it is part of what
// makes Growing Minds AI more careful than an average chatbot.
//
// To add your own material (class slide decks, scripts), DON'T edit this file.
// Drop .md or .txt files into knowledge/sources/ and run:
//   node scripts/build-knowledge.mjs
//
// Card shape:
//   id        unique slug
//   title     one-line summary
//   tags      topic keywords used for retrieval (be generous)
//   ageBands  which age ranges this applies to (use [] for "all ages")
//   source    { label, url? }  — url is optional
//   text      120–220 words of substantive, accurate content

const ALL_AGES = [
  "0-3 months", "4-6 months", "7-9 months", "10-12 months",
  "13-18 months", "19-24 months", "25-36 months", "3-5 years",
];

export const CURATED = [
  {
    id: "serve-and-return",
    title: "Serve and return: everyday back-and-forth builds brain architecture",
    tags: ["serve and return", "brain development", "language", "responsive caregiving", "interaction", "babbling", "attention", "connection"],
    ageBands: ALL_AGES,
    source: { label: "Center on the Developing Child, Harvard University", url: "https://developingchild.harvard.edu/science/key-concepts/serve-and-return/" },
    text: `Serve and return describes the responsive back-and-forth between a child and a caregiver: a baby coos, points, or reaches (the "serve"), and an adult responds in kind with eye contact, words, or a gesture (the "return"). These small, contingent exchanges are one of the most important experiences in shaping the architecture of the developing brain. When adults respond reliably to a child's cues, neural connections that support communication, attention, and social skills are built and strengthened. When serves go unreturned again and again, those circuits get less of the input they need. Practically, this means narrating what a child is looking at, naming feelings, pausing to let a baby "reply" with a sound or movement, and following the child's focus rather than redirecting it. The interaction does not need to be elaborate or educational — the ordinary rhythm of noticing and responding is the mechanism. This is why responsive, attuned caregiving in the first years matters so much for later learning and emotional health.`,
  },
  {
    id: "brain-architecture",
    title: "Early experience builds brain architecture from the bottom up",
    tags: ["brain development", "neural connections", "synapses", "sensitive periods", "early experience", "neuroscience", "architecture"],
    ageBands: ALL_AGES,
    source: { label: "Center on the Developing Child, Harvard University", url: "https://developingchild.harvard.edu/science/key-concepts/brain-architecture/" },
    text: `Brain development in the early years is rapid and experience-dependent. In the first years of life, more than a million new neural connections form every second — a pace never repeated again. Simpler circuits form first and provide the foundation for more complex circuits and skills later, which is why early experiences set the stage for what comes after. Connections are built through the "serve and return" interactions a child has with caregivers and the wider environment. The brain is especially plastic early on, meaning experiences shape it most powerfully during sensitive periods, though learning and change remain possible across the lifespan. The implication for parents is reassuring rather than pressuring: children do not need flashcards or enrichment products. They need warm, responsive relationships, language-rich everyday interaction, safe exploration, and protection from chronic stress. Genes provide the basic blueprint, but experience acts like an architect, shaping how that blueprint is actually built.`,
  },
  {
    id: "toxic-stress",
    title: "Positive, tolerable, and toxic stress — and the role of buffering relationships",
    tags: ["stress", "toxic stress", "cortisol", "trauma", "adversity", "resilience", "buffering", "co-regulation", "nervous system"],
    ageBands: ALL_AGES,
    source: { label: "Center on the Developing Child, Harvard University", url: "https://developingchild.harvard.edu/science/key-concepts/toxic-stress/" },
    text: `Not all childhood stress is harmful. Developmental scientists distinguish three types. Positive stress is brief and mild (a first day of childcare) and is a normal, growth-promoting part of development. Tolerable stress is more serious (a loss, an injury) but is time-limited and buffered by supportive adults, so the stress response system returns to baseline. Toxic stress is strong, frequent, or prolonged adversity — such as chronic neglect or exposure to violence — without adequate adult support. Prolonged activation of stress systems in early childhood can disrupt the development of brain architecture and other organ systems. The crucial protective factor is the presence of at least one stable, responsive relationship. Supportive caregivers literally buffer the stress response, helping a child's nervous system recover. This is why co-regulation — a calm adult helping a dysregulated child settle — is not "giving in," but a biological necessity that, repeated over time, builds the child's own capacity to self-regulate.`,
  },
  {
    id: "attachment-secure-base",
    title: "Attachment: the secure base for exploration",
    tags: ["attachment", "secure base", "bonding", "separation", "stranger anxiety", "trust", "Ainsworth", "Bowlby", "social-emotional"],
    ageBands: ["7-9 months", "10-12 months", "13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "Attachment theory — John Bowlby & Mary Ainsworth" },
    text: `Attachment theory describes the deep emotional bond between a child and their primary caregivers. When a caregiver is consistently available and responsive, the child develops a "secure base": they feel safe enough to explore the world and to return for comfort when distressed. Mary Ainsworth's "Strange Situation" research described patterns of attachment — secure and several insecure patterns — that relate to how caregivers typically respond to a child's needs. Securely attached children tend to use the caregiver as a base for exploration and are comforted by reunion. Importantly, attachment is built through sensitive, responsive care over time, not through perfection — caregivers naturally misread cues, and that is fine. Separation protest and wariness of strangers, which often emerge in the second half of the first year, are signs of healthy attachment, not problems. The practical takeaway is that responding warmly to a child's bids for comfort builds security; it does not "spoil" them or make them clingy.`,
  },
  {
    id: "still-face-coregulation",
    title: "The Still Face: infants need responsive emotional connection",
    tags: ["still face", "co-regulation", "Tronick", "emotion", "responsiveness", "attunement", "repair", "social-emotional", "connection"],
    ageBands: ["0-3 months", "4-6 months", "7-9 months", "10-12 months"],
    source: { label: "Still Face paradigm — Edward Tronick" },
    text: `In Edward Tronick's "Still Face" experiment, a parent first interacts warmly with their baby, then holds a neutral, unresponsive expression. Within seconds, babies work hard to re-engage the parent — smiling, pointing, calling out — and when that fails, they become distressed and withdrawn. When the parent re-engages, the baby quickly recovers. The experiment vividly shows that even very young infants are active social partners who expect and need emotional responsiveness, and that a sudden loss of connection is stressful for them. Just as importantly, Tronick's work introduced the idea of "rupture and repair": healthy interactions are not seamless. Caregivers and babies fall out of sync constantly, and the repair — re-establishing connection after a mismatch — is what builds resilience and trust. Parents do not need to be perfectly attuned. They need to keep coming back into connection after the inevitable misses. This reframes ordinary parenting moments: the goal is reconnection, not flawlessness.`,
  },
  {
    id: "executive-function",
    title: "Executive function: working memory, inhibitory control, and flexible thinking",
    tags: ["executive function", "self-control", "working memory", "impulse control", "attention", "cognitive flexibility", "planning", "air traffic control"],
    ageBands: ["13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "Center on the Developing Child, Harvard University", url: "https://developingchild.harvard.edu/science/key-concepts/executive-function/" },
    text: `Executive function refers to a set of mental skills the brain uses to plan, focus attention, remember instructions, and juggle tasks — often compared to an "air traffic control" system. It rests on three core capacities: working memory (holding information in mind), inhibitory control (resisting impulses and distractions), and cognitive flexibility (shifting between rules or perspectives). Children are not born with these skills; they are born with the potential to develop them, and they grow gradually from infancy into early adulthood, with a major burst in the preschool years. This is why a two-year-old genuinely cannot reliably stop themselves from grabbing a desired object — the inhibitory "brakes" are still under construction. Executive function develops through relationships and practice: serve-and-return interaction, predictable routines that reduce cognitive load, and games that exercise memory and self-control (peek-a-boo, Simon Says, sorting games, pretend play). Reducing chronic stress also protects these circuits. Supporting executive function is less about drilling and more about scaffolding — providing structure and gradually handing over control.`,
  },
  {
    id: "zone-proximal-development",
    title: "The zone of proximal development and scaffolding",
    tags: ["scaffolding", "zone of proximal development", "Vygotsky", "learning", "support", "teaching", "play", "guided"],
    ageBands: ALL_AGES,
    source: { label: "Lev Vygotsky — sociocultural theory" },
    text: `Lev Vygotsky proposed that children learn best at the edge of their current ability — in the "zone of proximal development," the space between what a child can do alone and what they can do with help from a more capable partner. Within this zone, a supportive adult or peer provides "scaffolding": just enough assistance to let the child succeed at something slightly beyond their independent reach, then gradually withdraws that support as the child gains competence. Practically, scaffolding might mean breaking a task into steps, offering a hint rather than the answer, modeling part of an activity, or holding the structure while the child does the part they can manage. The key is that the support is temporary and responsive — too much help removes the learning, too little leaves the child frustrated. This framework also highlights that much early learning is social: children develop thinking and language through interaction with others, not in isolation. It is the developmental basis for "guided play" and responsive teaching.`,
  },
  {
    id: "co-regulation-to-self-regulation",
    title: "Co-regulation comes before self-regulation",
    tags: ["co-regulation", "self-regulation", "emotion regulation", "calming", "meltdown", "tantrum", "name it to tame it", "feelings", "soothing"],
    ageBands: ALL_AGES,
    source: { label: "Center on the Developing Child, Harvard University", url: "https://developingchild.harvard.edu/science/key-concepts/" },
    text: `Self-regulation — the ability to manage one's own emotions, attention, and impulses — is not something young children possess; it is something they build, over years, through thousands of experiences of being regulated by a calm adult. This is co-regulation: when an overwhelmed child borrows a caregiver's steadiness through a soothing voice, calm body, and warm presence until their own nervous system settles. Each time this happens, the child's developing brain practices the path from upset back to calm, and gradually internalizes it. A useful framework is to connect before you correct: a child in the middle of a meltdown is not in a state to reason or learn, because the thinking part of the brain comes back online only after the alarm has quieted. Naming the feeling out loud ("you're so frustrated that it broke") helps a child link words to internal states — sometimes called "name it to tame it." Teaching, limits, and problem-solving land better once connection is re-established, not during the peak of distress.`,
  },
  {
    id: "temperament-goodness-of-fit",
    title: "Temperament and goodness of fit",
    tags: ["temperament", "personality", "goodness of fit", "shy", "slow to warm", "sensitive", "active", "Thomas", "Chess", "individual differences"],
    ageBands: ALL_AGES,
    source: { label: "Temperament research — Alexander Thomas & Stella Chess" },
    text: `Children arrive with their own temperament — a biologically based style of responding to the world that shows up early and tends to be fairly stable. Classic research by Thomas and Chess described dimensions such as activity level, regularity, approach or withdrawal to new things, intensity of reaction, sensitivity, and adaptability, and grouped many children loosely as "easy," "slow to warm up," or "feisty/difficult." No temperament is better or worse; each has strengths. The most useful idea from this work is "goodness of fit": children thrive when the demands and expectations of their environment match their temperament. A cautious, slow-to-warm child does best with gentle, gradual introductions to new situations rather than being pushed; a highly active child needs more outlets for movement. Behavior that looks like a "problem" is often a mismatch between a child's natural style and what is being asked of them. This reframes parenting away from changing the child and toward adjusting the environment, pace, and expectations to fit who the child actually is.`,
  },
  {
    id: "autonomy-toddlerhood",
    title: "Toddler autonomy: why \"no\" and \"me do it\" are developmental progress",
    tags: ["autonomy", "toddler", "no", "independence", "defiance", "power struggle", "Erikson", "will", "self", "two year old"],
    ageBands: ["13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "Erik Erikson — psychosocial development (autonomy vs. shame and doubt)" },
    text: `In Erikson's framework, the central task of toddlerhood is "autonomy versus shame and doubt." Having learned in infancy that the world can be trusted, toddlers turn to a new question: "Can I act on the world myself?" Their emphatic "No!", their insistence on "me do it," and their resistance to help are not defiance for its own sake — they are a child testing a brand-new sense of being a separate person with their own will. Supporting healthy autonomy means offering real but bounded choices ("the red cup or the blue cup"), allowing extra time for a toddler to attempt things themselves, and accepting that big feelings will erupt when their reach exceeds their skill or when limits frustrate them. At the same time, toddlers still need firm, kind limits to feel safe; autonomy is exercised within a secure structure, not without one. When a child's drive for independence is consistently met with warmth and reasonable freedom rather than shaming or excessive control, they emerge with a sense of will and confidence.`,
  },
  {
    id: "language-development",
    title: "How language develops — and why interaction quality matters more than word count",
    tags: ["language", "vocabulary", "talking", "talk", "speak", "speech", "learn to talk", "words", "conversation", "reading", "bilingual", "word gap", "conversational turns", "communication", "late talker"],
    ageBands: ALL_AGES,
    source: { label: "Center on the Developing Child / language development research" },
    text: `Language develops through interaction, not exposure alone. Babies move from cooing to babbling to first words (often around the first birthday) to combining words (often in the second year), with wide normal variation. A famous early study (Hart & Risley) drew attention to large differences in how much language children hear — popularized as the "30-million-word gap." Later research has complicated that headline: the raw number of words a child overhears matters far less than the quality of interaction, especially conversational turn-taking — the back-and-forth exchanges where an adult responds to what the child says or attends to. Studies using brain imaging have linked the number of conversational turns, more than sheer word count, to language-related brain activity. Practically, this means talking with a child (not just at or near them): following their gaze, naming what they care about, asking and waiting, reading interactively, and treating babbles as conversation. Bilingual exposure does not cause language delay; bilingual children may mix languages and reach some milestones on their own timeline, which is normal.`,
  },
  {
    id: "self-regulation-marshmallow",
    title: "The marshmallow test, revisited: self-control is contextual, not destiny",
    tags: ["self-control", "delay of gratification", "marshmallow test", "willpower", "Mischel", "impulse", "self-regulation", "patience"],
    ageBands: ["25-36 months", "3-5 years"],
    source: { label: "Delay-of-gratification research — Walter Mischel and later replications" },
    text: `In Walter Mischel's classic experiments, preschoolers were offered one treat now or two if they could wait alone with the first treat. The original work suggested that the ability to delay gratification predicted later outcomes, and the "marshmallow test" became shorthand for willpower as a fixed trait. More recent, larger replications (e.g., Watts, Duncan & Quan, 2018) found the link to later outcomes is much weaker than the popular story and is substantially explained by a child's broader environment — economic security, and home circumstances. Equally important, Mischel's own follow-up work showed that "willpower" is not a brute force of self-denial: children waited far longer when taught simple strategies, such as distracting themselves or mentally reframing the treat. The lesson for parents is hopeful: self-control in young children is immature by design, varies with how safe and predictable their world feels, and grows through supportive strategies and practice — not through pressure to simply "try harder." A child who cannot wait is showing normal development, not a character flaw.`,
  },
  {
    id: "play-based-learning",
    title: "Learning through play and guided play",
    tags: ["play", "guided play", "pretend play", "learning", "imagination", "exploration", "make believe", "free play"],
    ageBands: ["10-12 months", "13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "Play research — e.g. Kathy Hirsh-Pasek & Roberta Golinkoff" },
    text: `Play is not a break from learning in early childhood — it is a primary engine of it. Through play, children build language, executive function, social skills, and conceptual understanding while practicing at the edge of their abilities. Researchers distinguish free play (child-directed, open-ended) from "guided play," in which an adult sets up an environment or gently steers toward a learning goal while the child keeps agency and initiative. Guided play often produces stronger learning than either purely free play or direct instruction, because it pairs a child's intrinsic motivation with light adult scaffolding. Pretend or symbolic play, which blossoms in the toddler and preschool years, is especially powerful: taking on roles and inventing scenarios exercises self-regulation (following the "rules" of the pretend world), perspective-taking, and language. Practically, this means following a child's lead, providing open-ended materials over single-use toys, asking genuine questions, and resisting the urge to turn every moment into a quiz. Children learn deeply when they are absorbed, playful, and socially engaged.`,
  },
  {
    id: "sleep-development",
    title: "How young children's sleep develops",
    tags: ["sleep", "night waking", "naps", "bedtime", "routine", "sleep regression", "self-soothing", "circadian", "regulation"],
    ageBands: ALL_AGES,
    source: { label: "Pediatric sleep development (developmental overview)" },
    text: `Sleep is a developmental process. Newborns sleep in short bursts around the clock because their circadian (day–night) rhythm and the hormones that drive it are still maturing; consolidated night sleep typically emerges gradually over the first months as the body clock matures. Night waking is normal at every age — everyone surfaces between sleep cycles — and what changes with development is a child's ability to settle back without help. Predictable, calming bedtime routines act as cues that help a child's nervous system downshift into sleep, and consistency matters more than any single technique. Periods of disrupted sleep (often called "regressions") frequently coincide with developmental leaps, such as new motor skills, separation awareness, or language bursts; the brain is busy, and sleep temporarily fragments. Total sleep need decreases and naps consolidate across the early years. Because sleep and emotion regulation share underlying systems, an overtired child often looks dysregulated — more meltdowns, less flexibility — which is a clue to look at sleep rather than only at behavior.`,
  },
  {
    id: "screen-time-guidance",
    title: "Screen time in early childhood: what the evidence and guidelines suggest",
    tags: ["screen time", "media", "television", "tablet", "video", "displacement", "AAP", "co-viewing", "digital"],
    ageBands: ["0-3 months", "4-6 months", "7-9 months", "10-12 months", "13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "American Academy of Pediatrics — media guidance", url: "https://www.healthychildren.org/English/family-life/Media/Pages/default.aspx" },
    text: `Pediatric guidance focuses less on a single magic number and more on what screens displace and how they are used. For children under about 18–24 months, the American Academy of Pediatrics suggests avoiding screen media other than video-chatting, because the youngest children learn language and skills from responsive real-world interaction and struggle to transfer learning from a 2-D screen (the "video deficit"). For ages 2–5, the common recommendation is to limit screen use to roughly an hour a day of high-quality programming, ideally co-viewed so an adult can talk about it and connect it to real life. The deeper principle is displacement: time on screens is time not spent in the serve-and-return interaction, play, movement, and sleep that early development depends on. Background TV also reduces the quantity and quality of parent–child talk. Rather than guilt over occasional use, the useful goals are protecting sleep and mealtimes, keeping media interactive and shared when possible, and ensuring screens do not crowd out the relational experiences children most need.`,
  },
  {
    id: "rupture-and-repair",
    title: "\"Good enough\" parenting: rupture and repair, not perfection",
    tags: ["repair", "rupture", "good enough", "mistakes", "apology", "Winnicott", "Tronick", "guilt", "reconnection", "parenting"],
    ageBands: ALL_AGES,
    source: { label: "Donald Winnicott (\"good-enough mother\") & Edward Tronick (rupture and repair)" },
    text: `Decades of relational research converge on a freeing idea: children do not need perfect parents, and striving for perfection can even backfire. The pediatrician Donald Winnicott coined "the good-enough mother" to describe care that is responsive most of the time and, importantly, fails the child in small, manageable ways — which is exactly how children build resilience and a realistic sense of the world. Tronick's research showed that even in healthy interactions, caregiver and child are "mismatched" much of the time; what predicts secure development is not the absence of rupture but the reliable presence of repair. Repair can be simple: returning after you snapped to reconnect, naming what happened ("I was frustrated and I used a sharp voice — that wasn't about you"), and re-establishing warmth. This models for children that relationships can bend without breaking, that mistakes are survivable, and that they are still loved after conflict. For parents prone to guilt, the science offers relief: the goal is not to never rupture, but to keep repairing.`,
  },
  {
    id: "tantrums-and-the-brain",
    title: "Tantrums and meltdowns: an immature brain, not manipulation",
    tags: ["tantrum", "meltdown", "big feelings", "amygdala", "prefrontal cortex", "emotion", "anger", "crying", "behavior", "discipline"],
    ageBands: ["13-18 months", "19-24 months", "25-36 months", "3-5 years"],
    source: { label: "Developmental neuroscience of emotion regulation" },
    text: `A tantrum is most accurately understood as a developmental and neurological event, not a strategic one. Young children feel emotions with full intensity, but the prefrontal cortex — the brain region responsible for impulse control, perspective, and calming the alarm system — is highly immature and will keep developing for years. When a toddler is flooded by frustration, fear, or disappointment, the emotional alarm (centered on structures like the amygdala) overwhelms the still-thin "braking" system, and the child is genuinely unable to reason, negotiate, or "calm down" on command. This is why logic, threats, and long explanations rarely work mid-meltdown — the part of the brain that would receive them is temporarily offline. It also means tantrums are not manipulation; the capacity to manipulate requires exactly the planning skills the child does not yet have. The supportive response is to keep the child (and others) safe, stay calm to co-regulate, keep limits steady but warm, and save teaching for after the storm passes. Tantrums typically become less frequent as language and executive function mature.`,
  },
  {
    id: "milestones-are-ranges",
    title: "Milestones are ranges, and acting early matters when there are concerns",
    tags: ["milestones", "development", "delay", "variation", "typical", "red flags", "early intervention", "act early", "concern", "pediatrician"],
    ageBands: ALL_AGES,
    source: { label: "CDC \"Learn the Signs. Act Early.\"", url: "https://www.cdc.gov/ncbddd/actearly/" },
    text: `Developmental milestones describe the average ages by which most children gain a skill — they are ranges, not deadlines. Healthy children vary widely in when they walk, talk, or master a skill, and a child can be ahead in one domain (say, motor) while taking longer in another (say, language). Most variation is simply normal individual difference. At the same time, the evidence on early intervention is clear: when there is a genuine delay, support started earlier tends to be more effective because the young brain is so plastic. So the guidance is twofold and not contradictory. First, resist anxious comparison — a single "late" milestone in an otherwise thriving, connected, engaged child is usually not a concern. Second, take persistent patterns seriously: loss of skills a child previously had, no response to their name, very limited eye contact or social engagement, or a consistent lag across several areas are reasons to talk with a pediatrician and ask about evaluation rather than "waiting to see." Trusting parental instinct and seeking assessment is not overreacting; it is exactly what the "act early" message encourages.`,
  },
];
