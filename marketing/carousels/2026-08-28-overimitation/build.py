#!/usr/bin/env python3
"""Growing Minds Science carousel builder — 2026-08-28, Lyons, Young & Keil (2007)."""
import os
from PIL import Image, ImageDraw, ImageFont

W = H = 1080
NAVY = (10, 26, 46)
ORANGE = (245, 167, 50)
TEAL = (62, 191, 191)
WHITE = (255, 255, 255)
BODY = (208, 221, 236)
MUTED = (130, 155, 180)
TRACK = (24, 45, 72)

FD = "/usr/share/fonts/truetype/google-fonts/"
BOLD = FD + "Poppins-Bold.ttf"
REG = FD + "Poppins-Regular.ttf"
MED = FD + "Poppins-Medium.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

ROOT = "/sessions/blissful-nifty-ride/mnt/growingmindsscience"
LOGO = ROOT + "/assets/img/original-logo-mark-no-words-transparent.png"
OUT = ROOT + "/marketing/carousels/2026-08-28-overimitation"

M = 80              # left margin
CW = 920            # content width
SRC = "Lyons, Young & Keil, PNAS 104(50):19751-19756 (2007)"

_fc = {}
def f(path, size):
    k = (path, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]


def tw(d, text, font, track=0):
    if not track:
        return d.textlength(text, font=font)
    return sum(d.textlength(c, font=font) for c in text) + track * (len(text) - 1)


def tracked(d, xy, text, font, fill, track=0):
    x, y = xy
    if not track:
        d.text((x, y), text, font=font, fill=fill)
        return
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + track


def wrap(d, text, font, maxw):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def fit_headline(d, text, maxw, hi=96, lo=56):
    for size in range(hi, 69, -2):
        if d.textlength(text, font=f(BOLD, size)) <= maxw:
            return size, [text]
    for size in range(hi, lo - 1, -2):
        fo = f(BOLD, size)
        ls = wrap(d, text, fo, maxw)
        if len(ls) <= 2 and all(d.textlength(l, font=fo) <= maxw for l in ls):
            return size, ls
    fo = f(BOLD, lo)
    return lo, wrap(d, text, fo, maxw)


def pill(d, x, y, w, h, fill):
    if w < h:
        d.rectangle([x, y, x + max(w, 3), y + h], fill=fill)
    else:
        d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fill)


def base(eyebrow, headline, body, source):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    d.rectangle([M, 56, M + CW - 1, 61], fill=ORANGE)
    tracked(d, (M, 100), eyebrow, f(BOLD, 30), ORANGE, track=3.2)

    hs, hlines = fit_headline(d, headline, CW)
    y = 152
    for ln in hlines:
        d.text((M, y), ln, font=f(BOLD, hs), fill=WHITE)
        y += int(hs * 1.16)

    y = max(y + 18, 290)
    bf = f(REG, 39)
    for ln in wrap(d, body, bf, CW):
        d.text((M, y), ln, font=bf, fill=BODY)
        y += 52

    sf = f(REG, 26)
    slines = wrap(d, source, sf, 780)
    sy = 976 - 34 * len(slines)
    for ln in slines:
        d.text((M, sy), ln, font=sf, fill=MUTED)
        sy += 34

    d.text((M, 986), "@growingmindsscience", font=f(BOLD, 28), fill=TEAL)

    lg = Image.open(LOGO).convert("RGBA").resize((96, 96), Image.LANCZOS)
    img.paste(lg, (904, 936), lg)

    return img, d, y


def band(body_end, h, bottom=890):
    top = body_end + 40
    return max(top, top + (bottom - top - h) // 2)


def stat_strip(d, y, items, caption=None):
    colw = CW // len(items)
    for i, (fig, lab) in enumerate(items):
        x = M + i * colw
        d.text((x, y), fig, font=f(BOLD, 72), fill=ORANGE)
        tracked(d, (x, y + 92), lab, f(BOLD, 24), WHITE, track=1.6)
    if caption:
        tracked(d, (M, y + 150), caption, f(MED, 26), MUTED, track=1.6)


def bars(d, y, rows, caption=None):
    """rows = [(label, value_text, px_width)]"""
    for lab, val, px in rows:
        tracked(d, (M, y), lab, f(BOLD, 27), WHITE, track=1.8)
        lw = tw(d, lab, f(BOLD, 27), 1.8)
        d.text((M + lw + 26, y - 1), val, font=f(BOLD, 27), fill=ORANGE)
        pill(d, M, y + 42, px, 30, ORANGE)
        y += 104
    if caption:
        tracked(d, (M, y - 8), caption, f(MED, 25), MUTED, track=1.4)


def chips(d, y, labels):
    for lab in labels:
        fo = f(BOLD, 30)
        w = tw(d, lab, fo, 1.8) + 56
        pill(d, M, y, w, 62, ORANGE)
        tracked(d, (M + 28, y + 13), lab, fo, NAVY, track=1.8)
        y += 82


def sequence(d, y, steps, caption):
    """steps = [(tag, text)] — tag 'EXTRA' renders orange, 'NEEDED' renders muted."""
    tracked(d, (M, y), caption, f(MED, 25), MUTED, track=1.4)
    y += 40
    d.rounded_rectangle([M, y, M + CW, y + 40 + 50 * len(steps)], radius=14, fill=TRACK)
    yy = y + 24
    for i, (tag, text) in enumerate(steps, 1):
        hot = tag == "EXTRA"
        col = ORANGE if hot else MUTED
        d.text((M + 28, yy + 2), f"{i}", font=f(MONO, 26), fill=col)
        tf = f(BOLD, 20)
        tagw = tw(d, tag, tf, 1.6) + 28
        pill(d, M + 62, yy + 2, tagw, 30, col)
        tracked(d, (M + 76, yy + 8), tag, tf, NAVY, track=1.6)
        d.text((M + 62 + tagw + 20, yy), text, font=f(REG, 24),
               fill=WHITE if hot else BODY)
        yy += 50


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------- Slide 1 ----------
    img, d, y = base(
        "DID YOU KNOW?",
        "Kids copy the pointless step",
        "Show a three-year-old how to open a box and add one obviously useless "
        "action. They will not skip it. They will copy it, exactly.",
        SRC)
    stat_strip(d, band(y, 176),
               [("63", "CHILDREN"), ("3-5", "YEARS OLD"), ("75-94%", "MATCHED HIM")],
               caption="COPIED THE ADULT'S EXACT MEANS OF OPERATION")
    img.save(f"{OUT}/slide-1.png")

    # ---------- Slide 2 ----------
    img, d, y = base(
        "THE SETUP",
        "Trained to spot the silly bit",
        "Children were coached, and praised, for naming an adult's unnecessary "
        "actions on familiar jars. Then he opened this see-through box.",
        SRC)
    sequence(d, band(y, 280, bottom=880), [
        ("EXTRA", "Use wand to remove red bolt, pushing from the right"),
        ("EXTRA", "Tap wand on floor of box's empty upper compartment"),
        ("NEEDED", "Pull out round plug in centre of door assembly"),
        ("NEEDED", "Use wand to remove turtle"),
    ], "THE PUZZLE BOX SEQUENCE, VERBATIM FROM TABLE 1")
    img.save(f"{OUT}/slide-2.png")

    # ---------- Slide 3 ----------
    # Odds ratios vs. baseline children who never watched the adult.
    or_box, or_cage, or_dome = 147.0, 21.9, 5.1
    px = lambda v: int(round(CW * v / or_box))
    img, d, y = base(
        "THE SCIENCE",
        "The training did not stick",
        "Compared with children who opened the same objects cold, watchers were "
        "vastly more likely to work the useless mechanism. On the puzzle box the "
        "odds were 147 to 1.",
        SRC)
    bars(d, band(y, 330), [
        ("PUZZLE BOX", "147.0x", px(or_box)),
        ("CAGE", "21.9x", px(or_cage)),
        ("DOME", "5.1x", px(or_dome)),
    ], caption="ODDS RATIO VS. BASELINE, LINEAR SCALE - ALL P <= 0.001")
    img.save(f"{OUT}/slide-3.png")

    # ---------- Slide 4 ----------
    img, d, y = base(
        "THE TWIST",
        "Telling them not to did nothing",
        "A new group was warned outright to skip anything silly, then reminded "
        "again seconds before their turn. They copied the extra steps just as "
        "often as everyone else.",
        SRC)
    chips(d, band(y, 226), ["WARNED BEFORE THE DEMO",
                            "REMINDED BEFORE THEIR TURN",
                            "COPIED IT ANYWAY: P = NOT SIGNIFICANT"])
    img.save(f"{OUT}/slide-4.png")

    # ---------- Slide 5 ----------
    img, d, y = base(
        "WHERE IT STOPS",
        "One thing did break the spell",
        "The same box, split into two halves that no longer touched. Suddenly "
        "the extra action could not possibly matter, and the copying dropped to "
        "the level of children who never watched at all.",
        SRC)
    chips(d, band(y, 226), ["HALVES JOINED: THEY COPIED",
                            "HALVES SEPARATED: THEY DID NOT",
                            "ODDS RATIO 5.3, P = 0.04"])
    img.save(f"{OUT}/slide-5.png")

    # ---------- Slide 6 ----------
    img, d, y = base(
        "THE SOURCE",
        "Read it yourself",
        "Lyons, D. E., Young, A. G., & Keil, F. C. (2007). The hidden structure "
        "of overimitation.",
        "doi:10.1073/pnas.0704452104")
    by = band(y, 166)
    d.rounded_rectangle([M, by, M + CW, by + 166], radius=14, fill=TRACK)
    d.text((M + 32, by + 24), "PNAS, 104(50), 19751-19756",
           font=f(BOLD, 32), fill=WHITE)
    d.text((M + 32, by + 72), "Replicated worldwide: Hoehl et al. (2019) review;",
           font=f(REG, 27), fill=BODY)
    d.text((M + 32, by + 110), "Stengelin et al. (2020) find culture shifts how much.",
           font=f(REG, 27), fill=BODY)
    img.save(f"{OUT}/slide-6.png")

    print("built 6 slides ->", OUT)


if __name__ == "__main__":
    main()
