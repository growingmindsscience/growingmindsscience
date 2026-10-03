#!/usr/bin/env python3
"""Growing Minds Science carousel builder — 2026-09-02, Romeo et al. (2018)."""
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

ROOT = "/sessions/elegant-sweet-ptolemy/mnt/growingmindsscience"
LOGO = ROOT + "/assets/img/original-logo-mark-no-words-transparent.png"
OUT = ROOT + "/marketing/carousels/2026-09-02-conversational-turns"

M = 80              # left margin
CW = 920            # content width
SRC = "Romeo et al., Psychological Science 29(5):700-710 (2018)"

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


def bars(d, y, pairs, caption):
    """Two horizontal bars, widths to true scale of the values."""
    vmax = max(v for _, v in pairs)
    by = y
    for lab, v in pairs:
        w = int(round(CW * v / vmax))
        tracked(d, (M, by), lab, f(BOLD, 26), WHITE, track=1.6)
        pill(d, M, by + 42, w, 58, ORANGE if v == vmax else TRACK)
        vs = f"r = .{int(round(v * 100))}"
        vf = f(BOLD, 30)
        if d.textlength(vs, font=vf) + 28 < w:
            d.text((M + w - d.textlength(vs, font=vf) - 24, by + 53), vs,
                   font=vf, fill=NAVY if v == vmax else BODY)
        else:
            d.text((M + w + 20, by + 53), vs, font=vf, fill=BODY)
        by += 138
    tracked(d, (M, by + 4), caption, f(MED, 26), MUTED, track=1.4)


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------- Slide 1 ----------
    img, d, y = base(
        "DID YOU KNOW?",
        "Conversation shapes the brain",
        "Researchers recorded two full days of home audio from 36 children, "
        "then scanned their brains while they listened to stories. What "
        "mattered was not the word count.",
        SRC)
    stat_strip(d, band(y, 176),
               [("36", "CHILDREN"), ("4-6", "YEARS OLD"), ("2", "FULL DAYS")],
               caption="POCKET RECORDER AT HOME + BRAIN SCAN WHILE HEARING STORIES")
    img.save(f"{OUT}/slide-1.png")

    # ---------- Slide 2 ----------
    img, d, y = base(
        "THE SETUP",
        "What counts as a turn?",
        "A 2-ounce recorder in the child's shirt pocket logged every "
        "exchange. One conversational turn, as the study defined it: an "
        "adult speaks and the child replies, or vice versa, within 5 "
        "seconds.",
        SRC)
    mono_string(d, band(y, 190, bottom=880),
                "ADULT <-> CHILD < 5s",
                "PEAK-HOUR TURNS RANGED FROM 86 TO 330 ACROSS FAMILIES")
    img.save(f"{OUT}/slide-2.png")

    # ---------- Slide 3 ----------
    img, d, y = base(
        "THE SCIENCE",
        "Turns beat word count",
        "Back-and-forth exchanges predicted verbal skill more strongly than "
        "the sheer number of adult words heard - and only turns predicted "
        "Broca's area activation, independent of income, education and IQ.",
        SRC)
    bars(d, band(y, 320, bottom=900),
         [("CONVERSATIONAL TURNS", 0.51), ("ADULT WORDS HEARD", 0.36)],
         "CORRELATION WITH VERBAL SKILL, TO SCALE (N = 36)")
    img.save(f"{OUT}/slide-3.png")

    # ---------- Slide 4 ----------
    img, d, y = base(
        "SO WHAT?",
        "Talk with, not at",
        "Every 11 extra turns per hour went with a 1-point bump in verbal "
        "score, independent of family income and education. The "
        "back-and-forth is the active ingredient.",
        SRC)
    chips(d, band(y, 226), ["ASK, THEN WAIT FOR THE REPLY",
                            "BUILD ON WHAT THEY SAY",
                            "ANY TOPIC COUNTS"])
    img.save(f"{OUT}/slide-4.png")

    # ---------- Slide 5 ----------
    img, d, y = base(
        "GOING DEEPER",
        "The story holds up",
        "The same team found more turns went with stronger white-matter "
        "language tracts, then ran a randomized trial: boosting turns "
        "brought language gains. An independent study of 122 infants "
        "links turns to vocabulary growth.",
        "Later work, not the 2018 study: Romeo et al., J Neurosci (2018); "
        "Romeo et al., Dev Cogn Neurosci (2021); Donnelly & Kidd, Child Dev (2021)")
    chips(d, band(y, 226, bottom=850), ["WHITE-MATTER TRACTS (2018)",
                                        "RANDOMIZED TRIAL (2021)",
                                        "122 INFANTS TRACKED (2021)"])
    img.save(f"{OUT}/slide-5.png")

    # ---------- Slide 6 ----------
    img, d, y = base(
        "THE SOURCE",
        "Read it yourself",
        "Romeo, R. R., Leonard, J. A., Robinson, S. T., West, M. R., Mackey, "
        "A. P., Rowe, M. L., & Gabrieli, J. D. E. (2018). Beyond the "
        "30-million-word gap: Children's conversational exposure is "
        "associated with language-related brain function.",
        "doi:10.1177/0956797617742725")
    by = band(y, 166)
    d.rounded_rectangle([M, by, M + CW, by + 166], radius=14, fill=TRACK)
    d.text((M + 32, by + 24), "Psychological Science, 29(5), 700-710",
           font=f(BOLD, 32), fill=WHITE)
    d.text((M + 32, by + 72), "Free full text on PubMed Central (PMC5945324).",
           font=f(REG, 27), fill=BODY)
    d.text((M + 32, by + 110), "Open data and materials: doi:10.7910/DVN/DIDBMQ",
           font=f(REG, 27), fill=BODY)
    img.save(f"{OUT}/slide-6.png")

    print("built 6 slides ->", OUT)


if __name__ == "__main__":
    main()
