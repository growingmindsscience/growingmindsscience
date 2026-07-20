# 06 · A free tool for the "should I be worried about their talking?" question

- **Suggested post date:** Friday, 2026-07-31
- **Type:** Soft tool pointer (Communication Snapshot, free)
- **Related site page:** /tools/communication-snapshot
- **Status:** draft, not published

---

The question I get more than any other, in some form: my child is [age], and they say fewer words than the kid at daycare. Is that a problem, or am I being anxious?

It is a hard question to answer well, because both bad answers are cheap. "Every child is different, don't worry" is soothing and sometimes wrong. "Get it checked immediately" is alarming and often unnecessary. Neither one tells a parent anything they can use.

So we built the Communication Snapshot. It is free, it takes a few minutes, and it does not ask you to create an account.

It asks about vocabulary and about twelve specific communication behaviors, then gives you back a plain-language read: this looks like it sits in the typical range, this is worth watching, this is worth raising with your pediatrician.

Two things about how it is built that I think matter more than the tool itself.

It has floors. There are patterns where it is required to say "bring this up," and the code cannot be softened below that line. We test that in continuous integration on every change, by running every possible answer combination through the same engine the page uses. A tool that reassures parents is not allowed to reassure past a certain point.

And every result that lands in the typical range still says the same thing: if your gut says something is off, that is worth raising anyway. A screening tool is not better informed than a parent who lives with the child.

It is a starting point for a conversation, not a diagnosis. It is at growingmindsscience.com/tools/communication-snapshot if it is useful to you.

*Educational content, not medical advice. Not a diagnostic instrument.*
