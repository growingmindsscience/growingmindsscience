#!/usr/bin/env python3
"""Growing Minds Science carousel builder — 2026-08-24, Adolph et al. (2012)."""
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

LOGO = "/sessions/pensive-funny-einstein/mnt/growingmindsscience/assets/img/original-logo-mark-no-words-transparent.png"
OUT = "/sessions/pensive-funny-einstein/mnt/growingmindsscience/marketing/carousels/2026-08-24-learning-to-walk"

M = 80              # left margin
CW = 920            # content width
SRC = "Adolph et al., Psychological Science 23(11):1387-1394 (2012)"

_fc = {}
def f(path, size):
    k = (path, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]


def tw(d, text, font, track=0):
    """Width of text with letter tracking."""
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
    """Prefer one big line; fall back to the largest 2-line fit."""
    for size in range(hi, 69, -2):           # single-line pass, down to 70px
        if d.textlength(text, font=f(BOLD, size)) <= maxw:
            return size, [text]
    for size in range(hi, lo - 1, -2):       # two-line pass
        fo = f(BOLD, size)
        ls = wrap(d, text, fo, maxw)
        if len(ls) <= 2 and all(d.textlength(l, font=fo) <= maxw for l in ls):
            return size, ls
    fo = f(BOLD, lo)
    return lo, wrap(d, text, fo, maxw)


def pill(d, x, y, w, h, fill):
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fill)


def base(eyebrow, headline, body, source):
    """Draw the common chrome; return (img, draw, y_after_body)."""
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # orange top rule
    d.rectangle([M, 56, M + CW - 1, 61], fill=ORANGE)

    # eyebrow
    tracked(d, (M, 100), eyebrow, f(BOLD, 30), ORANGE, track=3.2)

    # headline
    hs, hlines = fit_headline(d, headline, CW)
    y = 152
    for ln in hlines:
        d.text((M, y), ln, font=f(BOLD, hs), fill=WHITE)
        y += int(hs * 1.16)

    # body
    y = max(y + 18, 290)
    bf = f(REG, 39)
    for ln in wrap(d, body, bf, CW):
        d.text((M, y), ln, font=bf, fill=BODY)
        y += 52

    # source (wrapped, bottom-anchored so 2 lines still clear the handle)
    sf = f(REG, 26)
    slines = wrap(d, source, sf, 780)
    sy = 976 - 34 * len(slines)
    for ln in slines:
        d.text((M, sy), ln, font=sf, fill=MUTED)
        sy += 34

    # handle
    d.text((M, 986), "@growingmindsscience", font=f(BOLD, 28), fill=TEAL)

    # logo
    lg = Image.open(LOGO).convert("RGBA").resize((96, 96), Image.LANCZOS)
    img.paste(lg, (904, 936), lg)

    return img, d, y


def band(body_end, h, bottom=890):
    """Vertically centre a visual of height h in the space left below the body."""
    top = body_end + 40
    return max(top, top + (bottom - top - h) // 2)


def stat_strip(d, y, items, caption=None):
    """3 big orange figures with white labels beneath."""
    colw = CW // len(items)
    for i, (fig, lab) in enumerate(items):
        x = M + i * colw
        d.text((x, y), fig, font=f(BOLD, 76), fill=ORANGE)
        tracked(d, (x, y + 92), lab, f(BOLD, 25), WHITE, track=2.0)
    if caption:
        tracked(d, (M, y + 150), caption, f(MED, 26), MUTED, track=1.6)


def bars(d, y, rows):
    """rows = [(label, value_text, px_width)]"""
    for lab, val, px in rows:
        tracked(d, (M, y), lab, f(BOLD, 27), WHITE, track=1.8)
        lw = tw(d, lab, f(BOLD, 27), 1.8)
        d.text((M + lw + 26, y - 1), val, font=f(BOLD, 27), fill=ORANGE)
        pill(d, M, y + 42, px, 34, ORANGE)
        y += 118


def chips(d, y, labels):
    for lab in labels:
        fo = f(BOLD, 30)
        w = tw(d, lab, fo, 1.8) + 56
        pill(d, M, y, w, 62, ORANGE)
        tracked(d, (M + 28, y + 13), lab, fo, NAVY, track=1.8)
        y += 82


def raster(d, y, bursts, caption):
    """Timeline strip: orange bursts on a dark track."""
    d.rounded_rectangle([M, y, M + CW, y + 46], radius=10, fill=TRACK)
    for start, width in bursts:
        d.rounded_rectangle([M + start, y + 8, M + start + width, y + 38],
                            radius=8, fill=ORANGE)
    tracked(d, (M, y + 76), caption[0], f(BOLD, 27), WHITE, track=1.8)
    tracked(d, (M, y + 118), caption[1], f(MED, 26), MUTED, track=1.4)


def make_bursts(total_px, coverage, seed=7):
    """Deterministic short bursts covering `coverage` of the strip."""
    import random
    rng = random.Random(seed)
    target = int(total_px * coverage)
    spans, used, x = [], 0, 0
    while used < target and x < total_px - 12:
        w = rng.choice([6, 6, 8, 10, 14, 20, 28, 40])
        w = min(w, target - used, total_px - x)
        if w < 5:
            break
        spans.append((x, w))
        used += w
        x += w + rng.choice([14, 18, 22, 26, 34, 44])
    return spans


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------- Slide 1 ----------
    img, d, y = base(
        "DID YOU KNOW?",
        "2,368 steps an hour",
        "That is the average toddler, just playing. Researchers filmed 151 "
        "infants at free play and counted every single step and stumble.",
        SRC)
    stat_strip(d, band(y, 176),
               [("2,368", "STEPS"), ("701 m", "TRAVELLED"), ("17", "FALLS")],
               caption="PER HOUR, AGES 12 TO 19 MONTHS")
    img.save(f"{OUT}/slide-1.png")

    # ---------- Slide 2 ----------
    img, d, y = base(
        "THE SETUP",
        "Filmed at play, counted by hand",
        "151 infants, 12 to 19 months, each recorded for 15 to 60 minutes of "
        "ordinary free play. Two coders scored every step and every fall from "
        "video, frame by frame.",
        SRC)
    raster(d, band(y, 144), make_bursts(CW, 0.323),
           ("IN MOTION JUST 32.3% OF THE TIME",
            "46% of walking bouts were only one to three steps long"))
    img.save(f"{OUT}/slide-2.png")

    # ---------- Slide 3 ----------
    # distance/hour: novice walkers 296.9 m, expert crawlers 100.4 m
    walk_px = CW
    crawl_px = int(round(CW * 100.4 / 296.9))   # 311
    img, d, y = base(
        "THE SCIENCE",
        "So why stop crawling?",
        "New walkers fell nearly twice as often per hour as expert crawlers. "
        "They also covered three times as much ground.",
        SRC)
    bars(d, band(y, 194), [("NOVICE WALKERS", "297 m/hour", walk_px),
                           ("EXPERT CRAWLERS", "100 m/hour", crawl_px)])
    img.save(f"{OUT}/slide-3.png")

    # ---------- Slide 4 ----------
    img, d, y = base(
        "THE TWIST",
        "Falling is the price of moving",
        "Account for how much further walkers travel and the gap closes. Per "
        "fall, walkers logged 69 steps and crawlers 55 - a difference that was "
        "not statistically significant.",
        SRC)
    chips(d, band(y, 226), ["WALKERS: 69 STEPS PER FALL",
                            "CRAWLERS: 55 STEPS PER FALL",
                            "DIFFERENCE: NOT SIGNIFICANT"])
    img.save(f"{OUT}/slide-4.png")

    # ---------- Slide 5 ----------
    img, d, y = base(
        "SO WHAT?",
        "A day of practice nobody planned",
        "Scale those hourly rates across six waking hours and the authors "
        "estimate a toddler racks up roughly this much every day. None of it "
        "was drilled. All of it was play.",
        "Authors' six-hour estimate, Adolph et al. (2012), p. 1393")
    chips(d, band(y, 226), ["14,000 STEPS A DAY",
                            "46 FOOTBALL FIELDS OF GROUND",
                            "100 FALLS"])
    img.save(f"{OUT}/slide-5.png")

    # ---------- Slide 6 ----------
    img, d, y = base(
        "THE SOURCE",
        "Read it yourself",
        "Adolph, K. E., Cole, W. G., Komati, M., Garciaguirre, J. S., Badaly, "
        "D., Lingeman, J. M., Chan, G. L. Y., & Sotsky, R. B. (2012). How do "
        "you learn to walk? Thousands of steps and dozens of falls per day.",
        "doi:10.1177/0956797612446346")
    by = band(y, 166)
    d.rounded_rectangle([M, by, M + CW, by + 166], radius=14, fill=TRACK)
    d.text((M + 32, by + 24), "Psychological Science, 23(11), 1387-1394",
           font=f(BOLD, 32), fill=WHITE)
    d.text((M + 32, by + 72), "Replicated in range: Hoch, O'Grady & Adolph (2019)",
           font=f(REG, 27), fill=BODY)
    d.text((M + 32, by + 110), "report 2,400 to 4,200 steps per hour in toddlers.",
           font=f(REG, 27), fill=BODY)
    img.save(f"{OUT}/slide-6.png")

    print("built 6 slides ->", OUT)


if __name__ == "__main__":
    main()
