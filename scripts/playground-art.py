#!/usr/bin/env python3
"""Build the four homepage playground-story illustrations.

Run from the repo root:  python3 scripts/playground-art.py

Sources live in docs/playground-story/source/ (not deployed):
  strip.webp      Matthew's three-panel watercolor strip (beats 2, 3 and 4),
                  as attached: 2000 x 667.
  strip-2x.webp   The same strip after a faithful 2x upscale. Built from this.
  beat-1-option-a.webp, -b.webp   The opening beat, generated to match the strip.
  beat-1-2x.webp  Option A after the same 2x upscale. Built from this.

Each beat is lifted off its cream paper and repainted on the page's own
ground colour, the Haze the section uses. Lossy WebP cannot store that Haze
exactly (it comes back a step off in one channel, and a rectangle of that
shows), so the ground is painted two steps LIGHTER than Haze (GROUND) and the
page draws the image with mix-blend-mode: darken over a true Haze box. Darken
keeps the lower of the two values, so every bare-paper pixel lands on the
page colour exactly and the paint is untouched. The files stay opaque, which keeps them small:
turning every wash into alpha costs eight times the bytes. Each beat is
then placed on a
shared 3:2 canvas with one ground line. Because every canvas has the same
size and the same ground, the page can stack them and move one camera.

Crop boxes, ground lines and anchors below are in the units of the original
files (strip 2000 wide, beat 1 1280 wide); "ref" says which, so a sharper
source of any size drops in without re-measuring. To swap in full-resolution
originals, replace the -2x files and run this again.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/playground-story/source"
OUT = ROOT / "assets/img/site/playground"

CANVAS_W, CANVAS_H = 2160, 1440   # the master canvas; layout numbers below are for 1440 x 960
UNIT = CANVAS_W / 1440
GROUND_Y = 846          # where feet meet the ground on every canvas
SIZES = (2160, 1440, 720)   # exported widths
GROUND = (250, 251, 253)    # Haze #F8F9FB (248, 249, 251) plus two steps: see the note above

# name, source file, crop box (x0, y0, x1, y1) or None, scale, how to place it.
# "ground" is the feet line inside the crop. "anchor" pins a source x (inside
# the crop) to a canvas x, so the parent stays in one spot across beats 2 and 3.
BEATS = [
    dict(name="time-to-leave", file="beat-1-2x.webp", ref=1280, crop=None, scale=0.96,
         ground=664, anchor=(640, 720)),
    dict(name="name-the-feeling", file="strip-2x.webp", ref=2000, crop=(0, 0, 623, 667), scale=1.25,
         ground=576, anchor="parent"),
    dict(name="hold-the-boundary", file="strip-2x.webp", ref=2000, crop=(623, 0, 1351, 667), scale=1.25,
         ground=576, anchor="parent"),
    dict(name="move-together", file="strip-2x.webp", ref=2000, crop=(1351, 0, 2000, 667), scale=1.3,
         ground=575, anchor=(18, 200)),
]
PARENT_X = 950          # canvas x of the crouching parent in beats 2 and 3


def lift_from_paper(rgb, feather=14):
    """Move the painting from its cream paper onto white paper.

    Returns (tone, ink): tone is each pixel as a fraction of the paper colour
    (1 = bare paper), ink is how much paint is there (0 = none). Multiplying
    tone by any ground colour repaints the picture on that ground.
    """
    h, w, _ = rgb.shape
    ring = np.concatenate([rgb[:24].reshape(-1, 3), rgb[-24:].reshape(-1, 3),
                           rgb[:, :24].reshape(-1, 3), rgb[:, -24:].reshape(-1, 3)])
    paper = np.median(ring, axis=0)
    tone = np.clip(rgb / paper, 0, 1)
    ink = 1 - tone.min(axis=2)
    # Paper grain sits under 1% here; fade it out without touching real washes.
    t = np.clip((ink - 0.012) / (0.045 - 0.012), 0, 1)
    keep = t * t * (3 - 2 * t)
    # Feather the crop edges so a cut can never show as a line.
    ramp = lambda n: np.clip(np.minimum(np.arange(n), np.arange(n)[::-1]) / feather, 0, 1)
    keep = keep * ramp(h)[:, None] * ramp(w)[None, :]
    return 1 - (1 - tone) * keep[..., None], ink * keep


def parent_centre(rgb, alpha):
    """x of the parent's sage cardigan: the one strongly green-blue, opaque shape."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    teal = (alpha > 0.45) & (g > r + 12) & (b > r - 6) & (g < 190)
    xs = np.where(teal)[1]
    return float(np.median(xs))


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    for beat in BEATS:
        img = Image.open(SRC / beat["file"]).convert("RGB")
        k = img.width / beat["ref"]          # source pixels per reference unit
        if beat["crop"]:
            img = img.crop(tuple(round(v * k) for v in beat["crop"]))
        rgb = np.asarray(img).astype(np.float64)
        tone, alpha = lift_from_paper(rgb, feather=14 * k)
        s = beat["scale"] * UNIT / k
        if beat["anchor"] == "parent":
            src_x, canvas_x = parent_centre(rgb, alpha), PARENT_X
        else:
            src_x, canvas_x = beat["anchor"][0] * k, beat["anchor"][1]
        tile = Image.fromarray((tone * 255 + 0.5).astype(np.uint8), "RGB")
        tw, th = round(tile.width * s), round(tile.height * s)
        tile = tile.resize((tw, th), Image.LANCZOS)
        left = round(canvas_x * UNIT - src_x * s)
        top = round(GROUND_Y * UNIT - beat["ground"] * k * s)
        white = Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))
        white.paste(tile, (left, top))
        tone_canvas = np.asarray(white).astype(np.float64) / 255
        canvas = Image.fromarray((tone_canvas * np.array(GROUND) + 0.5).astype(np.uint8), "RGB")
        painted = Image.fromarray(((tone_canvas.min(axis=2) < 0.98) * 255).astype(np.uint8))
        box = painted.getbbox()
        for width in SIZES:
            out = canvas if width == CANVAS_W else canvas.resize((width, round(CANVAS_H * width / CANVAS_W)), Image.LANCZOS)
            path = OUT / f"{beat['name']}-{width}.webp"
            out.save(path, "WEBP", quality=82 if width > 1440 else 86, method=6)
            print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")
        frac = (box[0] / CANVAS_W, box[2] / CANVAS_W, box[1] / CANVAS_H, box[3] / CANVAS_H)
        print("  art spans x %.3f-%.3f, y %.3f-%.3f of the canvas" % frac)


if __name__ == "__main__":
    build()
