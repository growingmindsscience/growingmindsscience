#!/usr/bin/env python3
"""Build the homepage hero illustration: a toddler points at a cat, the parent follows the point.

Run from the repo root:  python3 scripts/hero-art.py

Sources live in docs/hero/source/ (not deployed):
  shared-attention.webp      The painting as generated, 1280 x 720, in the hand of
                             the playground story and with the same two people.
  shared-attention-2x.webp   The same after a faithful 2x upscale. Built from this.

The painting is one sheet with clear bare paper between the cat and the two
people, so it is cut there into two pieces. Nothing painted is cut: each piece
is a whole figure with its own ground wash. The page stands them on one ground
line and decides how far apart they sit (closer on a phone than on a desk).

Both pieces are lifted off their paper and repainted on the page's ground the
same way as the playground story (scripts/playground-art.py: the ground is two
steps lighter than Haze and the page draws the image with mix-blend-mode:
darken over a true Haze box, so no rectangle shows).

Crop boxes are in the units of the 1280-wide original; a sharper source of any
size drops in without re-measuring. Both crops share one bottom edge, which
keeps the cat and the people on the same ground. The page's layout numbers
(assets/css/home.css, ".hero__scene") are these crop sizes: people 680 x 588,
cat 280 x 292.
"""
import importlib.util
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/hero/source/shared-attention-2x.webp"
OUT = ROOT / "assets/img/site/hero"
REF = 1280              # the crop boxes below are measured on a 1280-wide sheet

# name, crop box (x0, y0, x1, y1), exported widths
PIECES = [
    dict(name="shared-attention-people", crop=(546, 84, 1226, 672), sizes=(1360, 1020, 680)),
    dict(name="shared-attention-cat", crop=(64, 380, 344, 672), sizes=(560, 280)),
]


def playground_art():
    """The paper lift and the ground colour are the playground story's, not a copy of them."""
    spec = importlib.util.spec_from_file_location("playground_art", ROOT / "scripts/playground-art.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build():
    pa = playground_art()
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SRC).convert("RGB")
    k = sheet.width / REF
    # Lift the whole sheet once, so both pieces are measured against the same paper.
    tone, _ = pa.lift_from_paper(np.asarray(sheet).astype(np.float64), feather=14 * k)
    for piece in PIECES:
        x0, y0, x1, y1 = (round(v * k) for v in piece["crop"])
        cut = tone[y0:y1, x0:x1]
        # Feather the cut edges too: a faint wash that reaches an edge fades instead of stopping.
        h, w, _ = cut.shape
        ramp = lambda n: np.clip(np.minimum(np.arange(n), np.arange(n)[::-1]) / (10 * k), 0, 1)
        fade = ramp(h)[:, None] * ramp(w)[None, :]
        cut = 1 - (1 - cut) * fade[..., None]
        full = Image.fromarray((cut * np.array(pa.GROUND) + 0.5).astype(np.uint8), "RGB")
        for width in piece["sizes"]:
            out = full if width == full.width else full.resize((width, round(full.height * width / full.width)), Image.LANCZOS)
            path = OUT / f"{piece['name']}-{width}.webp"
            out.save(path, "WEBP", quality=82 if width > 1100 else 86, method=6)
            print(f"{path.relative_to(ROOT)}  {out.width} x {out.height}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    build()
