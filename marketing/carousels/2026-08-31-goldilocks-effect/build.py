#!/usr/bin/env python3
"""Growing Minds Science carousel builder — 2026-08-31, Kidd, Piantadosi & Aslin (2012)."""
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

ROOT = "/sessions/funny-friendly-noether/mnt/growingmindsscience"
LOGO = ROOT + "/assets/img/original-logo-mark-no-words-transparent.png"
OUT = ROOT + "/marketing/carousels/2026-08-31-goldilocks-effect"

M = 80              # left margin
CW = 920            # content width
SRC = "Kidd, Piantadosi & Aslin, PLOS ONE 7(5):e36399 (2012)"

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


def chips(d, y, labels):
    for lab in labels:
        fo = f(BOLD, 30)
        w = tw(d, lab, fo, 1.8) + 56
        pill(d, M, y, w, 62, ORANGE)
        tracked(d, (M + 28, y + 13), lab, fo, NAVY, track=1.8)
        y += 82


def mono_string(d, y, text, caption):
    fo = f(MONO, 78)
    while d.textlength(text, font=fo) > CW and fo.size > 40:
        fo = f(MONO, fo.size - 4)
    d.text((M, y), text, font=fo, fill=WHITE)
    tracked(d, (M, y + fo.size + 34), caption, f(BOLD, 27), ORANGE, track=2.0)


def ucurve(d, y, h):
    """Schematic of Fig. 3: U-shaped look-away probability vs. complexity."""
    px, pw, ph = M, CW, h - 120
    # axes
    d.line([px, y, px, y + ph], fill=MUTED, width=3)
    d.line([px, y + ph, px + pw, y + ph], fill=MUTED, width=3)
    # U curve: parabola-ish with minimum at ~38% of x-range (the 1.25-bit dip)
    x0 = 0.38
    pts = []
    for i in range(101):
        t = i / 100
        v = ((t - x0) / max(x0, 1 - x0)) ** 2      # 0 at dip
        v = 0.12 + 0.78 * min(v, 1.0)
        pts.append((px + int(t * pw), y + int((1 - v) * (ph - 20)) + 10))
    d.line(pts, fill=ORANGE, width=10, joint="curve")
    # dip marker
    dx, dy = pts[38]
    d.ellipse([dx - 13, dy - 13, dx + 13, dy + 13], fill=TEAL)
    tracked(d, (dx - 78, dy - 56), "1.25 BITS", f(BOLD, 26), TEAL, track=1.6)
    # axis labels
    tracked(d, (px, y + ph + 18), "PREDICTABLE", f(BOLD, 24), WHITE, track=1.6)
    lab = "SURPRISING"
    tracked(d, (px + pw - tw(d, lab, f(BOLD, 24), 1.6), y + ph + 18), lab,
            f(BOLD, 24), WHITE, track=1.6)
    tracked(d, (px, y - 44), "CHANCE THEY LOOK AWAY", f(BOLD, 22), MUTED, track=1.6)
    tracked(d, (px, y + ph + 58), "SCHEMATIC OF FIG. 3 - DIP REPORTED NEAR 1.25 BITS",
            f(MED, 24), MUTED, track=1.4)


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------- Slide 1 ----------
    img, d, y = base(
        "DID YOU KNOW?",
        "Babies budget their attention",
        "Sit a 7-month-old in front of animated boxes that reveal toys in "
        "sequences. They look away most when the next event is too "
        "predictable - or too surprising.",
        SRC)
    stat_strip(d, band(y, 176),
               [("72", "INFANTS"), ("7-8", "MONTHS OLD"), ("2", "EXPERIMENTS")],
               caption="EVERY LOOK-AWAY TRACKED EVENT BY EVENT ON AN EYE-TRACKER")
    img.save(f"{OUT}/slide-1.png")

    # ---------- Slide 2 ----------
    img, d, y = base(
        "THE SETUP",
        "A box, a toy, and the odds",
        "Each box rose to reveal a toy, or nothing, with fixed odds. The "
        "sequence played until the baby looked away for one full second. "
        "One 50-50 trial, verbatim from the paper:",
        SRC)
    mono_string(d, band(y, 190, bottom=880),
                "1 1 0 1 0 1 0 1 0 0",
                "1 = TOY APPEARS   0 = EMPTY BOX")
    img.save(f"{OUT}/slide-2.png")

    # ---------- Slide 3 ----------
    img, d, y = base(
        "THE SCIENCE",
        "Attention is U-shaped",
        "The chance of looking away was highest at both extremes of "
        "complexity and dipped in between - near 1.25 bits, the babies' "
        "preferred information rate.",
        SRC)
    ucurve(d, band(y, 400, bottom=900) + 30, 380)
    img.save(f"{OUT}/slide-3.png")

    # ---------- Slide 4 ----------
    img, d, y = base(
        "SO WHAT?",
        "Looking away is not boredom",
        "A baby who turns away from the rattle may simply be done with it. "
        "Attention goes wherever the information rate is just right.",
        SRC)
    chips(d, band(y, 226), ["TOO PREDICTABLE: THEY MOVE ON",
                            "TOO RANDOM: THEY MOVE ON",
                            "IN BETWEEN: THEY LOCK IN"])
    img.save(f"{OUT}/slide-4.png")

    # ---------- Slide 5 ----------
    img, d, y = base(
        "GOING DEEPER",
        "It keeps showing up",
        "The same lab found the U-curve for sound sequences, and it holds "
        "inside individual babies, not just group averages. An independent "
        "lab finds infants tune attention to maximize learning.",
        "Later work, not the 2012 study: Kidd et al., Child Dev (2014); "
        "Piantadosi et al., Dev Sci (2014); Poli et al., Sci Adv (2020)")
    chips(d, band(y, 226), ["SOUND SEQUENCES (2014)",
                            "EACH INDIVIDUAL BABY (2014)",
                            "INDEPENDENT LAB (2020)"])
    img.save(f"{OUT}/slide-5.png")

    # ---------- Slide 6 ----------
    img, d, y = base(
        "THE SOURCE",
        "Read it yourself",
        "Kidd, C., Piantadosi, S. T., & Aslin, R. N. (2012). The Goldilocks "
        "effect: Human infants allocate attention to visual sequences that "
        "are neither too simple nor too complex.",
        "doi:10.1371/journal.pone.0036399")
    by = band(y, 166)
    d.rounded_rectangle([M, by, M + CW, by + 166], radius=14, fill=TRACK)
    d.text((M + 32, by + 24), "PLOS ONE, 7(5), e36399 - open access",
           font=f(BOLD, 32), fill=WHITE)
    d.text((M + 32, by + 72), "Replicated with sounds (Kidd et al. 2014) and",
           font=f(REG, 27), fill=BODY)
    d.text((M + 32, by + 110), "within individual infants (Piantadosi et al. 2014).",
           font=f(REG, 27), fill=BODY)
    img.save(f"{OUT}/slide-6.png")

    print("built 6 slides ->", OUT)


if __name__ == "__main__":
    main()
