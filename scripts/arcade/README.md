# Arcade word data

`words-20k.txt` is the 20,000 most common English words from
https://github.com/first20hours/google-10000-english (derived from the Google
Web Trillion Word Corpus; the repository is MIT licensed). It is a frequency
ranking only: `build-words.mjs` intersects it with the system dictionary
(`/usr/share/dict/words`, Webster's 1934 list, public domain) so every word the
puzzles accept is a real word, and every answer is a common one.

    node scripts/arcade/build-words.mjs        # writes assets/data/arcade/five.json and nest.json
    node scripts/arcade/fill-mini.mjs          # prints candidate 5x5 fills to author clues against

The outputs are committed; the build runs by hand when the lists change.
