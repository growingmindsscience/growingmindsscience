# Your own teaching material → Growing Minds AI

This folder is where **you** add your own content — class slide decks, scripts,
handouts, lesson notes — so Growing Minds AI grounds its answers in *your*
teaching, not just generic knowledge.

## How to add a slide deck or script

1. Export your material to **plain text** or **Markdown**:
   - Google Slides / PowerPoint → `File → Download → Plain text (.txt)`
     (or copy the speaker notes / slide text into a `.txt` file).
   - A script or handout → save or paste it as a `.md` or `.txt` file.
2. Give the file a clear name — the name becomes the cited source.
   Good: `serve-and-return-class-script.txt`, `toddler-sleep-deck.md`.
3. Put the file in **this folder** (`knowledge/sources/`).
4. Run the build from the project root:

   ```bash
   node scripts/build-knowledge.mjs
   ```

5. Commit the result (the script tells you which file changed).

That's it. The build script automatically splits long files into searchable
chunks and adds them to the knowledge base. The next time someone asks the AI
a question, it can pull from your material and cite it by file name.

## Tips for the best results

- **One topic per file** works best (e.g. one deck about sleep, one about
  tantrums). The AI retrieves whole chunks, so focused files retrieve cleanly.
- **Headings help.** If your `.md` uses `#` / `##` headings, the build splits on
  them so each section becomes its own retrievable chunk.
- **Keep it factual and self-contained.** Write as if explaining to a parent;
  avoid slide shorthand like "see previous slide."
- Files in this folder are **plain teaching content** — don't put anything
  private or student-identifying here, since the AI may quote from it.

Supported file types: `.md`, `.markdown`, `.txt`. Everything else is ignored.
This `README.md` is ignored by the build (it's instructions, not content).
