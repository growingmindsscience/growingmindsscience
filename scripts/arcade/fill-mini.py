#!/usr/bin/env python3
"""Fills 5x5 crossword patterns with common words (same inputs as build-words.mjs).
Prints candidate fills to author clues against. Usage: python3 fill-mini.py [count] [seed]"""
import random, re, sys, time, os
HERE = os.path.dirname(os.path.abspath(__file__))
dict_words = set(w for w in open('/usr/share/dict/words').read().split('\n') if re.fullmatch(r'[a-z]+', w))
names = set(w.strip().lower() for w in open('/usr/share/dict/propernames'))
ranked = [w.strip() for w in open(os.path.join(HERE, 'words-20k.txt')) if re.fullmatch(r'[a-z]+', w.strip())]
BLOCK = set("penis spam das san gnu anal anus sex sexy porn nude rape nazi damn hell piss crap tits dick cock slut whore semen sperm boob boobs drug drugs died dead kill guns gun bomb nuke tnt thats dont cant wont isnt corp admin yahoo coco inc ltd llc www http html org com net edu gov etc misc info asap faq url usa uk ny la dc tv pc mp dvd cd gif jpg png pdf xml php sql ebay msn aol ibm cgi ftp ssl seo blog sic tba ets lcd lol".split())
LIMIT = 6000
common = [w for i, w in enumerate(ranked) if i < LIMIT and w in dict_words and w not in names and w not in BLOCK and 3 <= len(w) <= 5]
bylen = {3: [], 4: [], 5: []}
for w in common: bylen[len(w)].append(w)
PATTERNS = [
  ["#....", ".....", ".....", ".....", "....#"],
  ["....#", ".....", ".....", ".....", "#...."],
  ["##...", ".....", ".....", ".....", "...##"],
  ["...##", ".....", ".....", ".....", "##..."],
  ["#...#", ".....", ".....", ".....", "#...#"],
  ["#....", "#....", ".....", "....#", "....#"],
  ["....#", "....#", ".....", "#....", "#...."],
]
def slots(p):
    out = []
    for r in range(5):
        c = 0
        while c < 5:
            if p[r][c] == '#': c += 1; continue
            s = c
            while c < 5 and p[r][c] != '#': c += 1
            if c - s >= 3: out.append(('A', r, s, c - s))
            else: raise ValueError('short across run')
    for c in range(5):
        r = 0
        while r < 5:
            if p[r][c] == '#': r += 1; continue
            s = r
            while r < 5 and p[r][c] != '#': r += 1
            if r - s >= 3: out.append(('D', s, c, r - s))
            else: raise ValueError('short down run')
    return out
def cells(s):
    d, r, c, n = s
    return [(r, c + i) if d == 'A' else (r + i, c) for i in range(n)]
def fill(p, rnd, budget=1.5):
    grid = [list(row) for row in p]
    sl = slots(p)
    used = set()
    t0 = time.time()
    pools = {k: rnd.sample(v, len(v)) for k, v in bylen.items()}
    def cands(s):
        cs = cells(s)
        out = []
        for w in pools[s[3]]:
            if w in used: continue
            ok = True
            for i, (r, c) in enumerate(cs):
                g = grid[r][c]
                if g != '.' and g != w[i]: ok = False; break
            if ok: out.append(w)
        return out
    def solve():
        if time.time() - t0 > budget: return False
        best = None; bestc = None
        for s in sl:
            if all(grid[r][c] != '.' for r, c in cells(s)): continue
            cl = cands(s)
            if not cl: return False
            if best is None or len(cl) < len(bestc): best, bestc = s, cl
        if best is None:
            return True
        cs = cells(best)
        for w in bestc[:30]:
            prev = [grid[r][c] for r, c in cs]
            for i, (r, c) in enumerate(cs): grid[r][c] = w[i]
            used.add(w)
            if solve(): return True
            used.discard(w)
            for i, (r, c) in enumerate(cs): grid[r][c] = prev[i]
        return False
    if not solve(): return None
    words = [(s, ''.join(grid[r][c] for r, c in cells(s))) for s in sl]
    cs = set(common)
    if not all(w in cs for _, w in words): return None
    if len(set(w for _, w in words)) != len(words): return None
    return [''.join(r) for r in grid], words
count = int(sys.argv[1]) if len(sys.argv) > 1 else 16
rnd = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
made = 0; tries = 0; seen = set()
while made < count and tries < count * 30:
    p = PATTERNS[tries % len(PATTERNS)]; tries += 1
    f = fill(p, rnd)
    if not f: continue
    key = '/'.join(f[0])
    if key in seen: continue
    seen.add(key); made += 1
    print(f'--- fill {made}')
    print('\n'.join(f[0]))
    print('  '.join(f'{s[0]}{s[1]},{s[2]}:{w}' for s, w in f[1]))
