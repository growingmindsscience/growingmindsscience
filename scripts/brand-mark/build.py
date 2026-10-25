"""From Little Onward mark: arcs and a sprout, drawn as vectors.

Changes from the concept image (Matthew, 2026-10-15: keep the sprout):
- The arcs no longer share one center. Each center steps down and right, so
  the gaps widen toward the leaf and the set reads as a stem unfurling, not as
  a Wi-Fi signal. The arcs' ends are staggered for the same reason.
- A small-size drawing (two arcs, heavier strokes, larger leaf) for 32px and
  below, where three arcs merge.
- Colors are the brand tokens: forest ink #193C39, sage-deep #8DAE9A,
  sage #A9C3B2, sage-mist-2 #CFDFD6, paper #F7F4EC.
- The lockups set the wordmark as the site header does (2026-10-25): "from
  little" in Newsreader 500, then ONWARD in Inter 500, uppercase, tracked
  0.32em. Forest ink on paper; white on forest ink. Horizontal puts ONWARD on
  the name's baseline; stacked puts it on its own line, centered.
- Type is outlined, so the files render the same everywhere.
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
# Optional: MARK_PYLIB points at a folder with fonttools and uharfbuzz installed.
if os.environ.get('MARK_PYLIB'): sys.path.insert(0, os.environ['MARK_PYLIB'])
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

OUT = os.environ.get('MARK_OUT', os.path.join(HERE, 'out'))
os.makedirs(OUT, exist_ok=True)

INK, PAPER = '#193C39', '#F7F4EC'
SAGE, SAGE_DEEP, SAGE_LIGHT = '#A9C3B2', '#8DAE9A', '#CFDFD6'

# ---------------------------------------------------------------- the mark
def arc_path(cx, cy, r, phi_end_deg, stub_bottom, stub_right):
    """Vertical stub, arc from 180 degrees (left) to phi_end, then a straight run.

    Angles are measured from the center, counter-clockwise from +x, with y down
    on screen, so the arc climbs from the left and turns right over the top."""
    x0, y0 = cx - r, cy
    pe = math.radians(phi_end_deg)
    x1, y1 = cx + r * math.cos(pe), cy - r * math.sin(pe)
    d = f'M{x0:.2f},{y0 + stub_bottom:.2f} L{x0:.2f},{y0:.2f} '
    large = 1 if (180 - phi_end_deg) > 180 else 0
    d += f'A{r:.2f},{r:.2f} 0 {large} 1 {x1:.2f},{y1:.2f}'
    if stub_right:
        # continue along the tangent at the end of the arc
        tx, ty = math.sin(pe), math.cos(pe)  # screen direction of travel
        d += f' L{x1 + tx * stub_right:.2f},{y1 + ty * stub_right:.2f}'
    return d, (x1, y1), (math.sin(pe), math.cos(pe))

def leaf_path(base, axis_deg, length, width, lean=0.58):
    """A leaf from base along axis (degrees above +x). Fuller on the upper side."""
    a = math.radians(axis_deg)
    dx, dy = math.cos(a), -math.sin(a)        # along the leaf, screen coords
    nx, ny = -dy, dx                           # rotate +90 on screen: the lower side
    bx, by = base
    tx, ty = bx + dx * length, by + dy * length
    def p(t, s):  # t along, s across (+ lower side)
        return bx + dx * length * t + nx * s, by + dy * length * t + ny * s
    # tapered base, full belly on the upper side, a fine point at the tip
    u1, u2 = p(0.18, -width * 0.95), p(0.80, -width * 0.80)
    l1, l2 = p(0.80, width * 0.55), p(0.22, width * 0.65)
    return (f'M{bx:.2f},{by:.2f} C{u1[0]:.2f},{u1[1]:.2f} {u2[0]:.2f},{u2[1]:.2f} {tx:.2f},{ty:.2f} '
            f'C{l1[0]:.2f},{l1[1]:.2f} {l2[0]:.2f},{l2[1]:.2f} {bx:.2f},{by:.2f} Z')

def mark(small=False):
    """Returns (arcs, leaf) path data in a 100 x 100 box."""
    if not small:
        sw = 7.2
        arcs = [
            # cx, cy, r, phi_end, stub_bottom, stub_right
            arc_path(60.0, 80.0, 44.0, 102, 6, 0),    # outer: runs into the leaf
            arc_path(64.0, 85.0, 31.0, 90, 4, 15),    # middle: center steps down-right
            arc_path(68.5, 90.0, 19.0, 90, 2, 9),     # inner: shorter run
        ]
        end, _ = arcs[0][1], arcs[0][2]
        leaf = leaf_path((end[0] - 1.0, end[1] + 0.6), 40, 58, 21.0, lean=0.5)
    else:
        sw = 11.0
        arcs = [
            arc_path(60.0, 82.0, 44.0, 102, 6, 0),
            arc_path(66.0, 88.0, 27.0, 90, 3, 12),
        ]
        end = arcs[0][1]
        leaf = leaf_path((end[0] - 1.5, end[1] + 1.0), 40, 60, 23.0, lean=0.5)
    return [a[0] for a in arcs], leaf, sw

def mark_svg(arcs, leaf, sw, arc_col, leaf_col, bg=None, box=100, pad=0):
    # the drawing spans about x 10..98, y -6..96: center it in a square
    x0, y0, side = 6 - pad, -8 - pad, 104 + 2*pad
    vb = f'{x0} {y0} {side} {side}'
    bgr = f'<rect x="{x0}" y="{y0}" width="{side}" height="{side}" fill="{bg}"/>' if bg else ''
    a = ''.join(f'<path d="{d}"/>' for d in arcs)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{bgr}'
            f'<g fill="none" stroke="{arc_col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{a}</g>'
            f'<path d="{leaf}" fill="{leaf_col}"/></svg>')

# ---------------------------------------------------------------- the type
def static(path, axes):
    f = TTFont(path)
    return instantiateVariableFont(f, axes, inplace=False)

def shape(fontfile, axes, text, size, tracking_em=0.0):
    blob = hb.Blob.from_file_path(fontfile)
    face = hb.Face(blob)
    font = hb.Font(face)
    font.set_variations(axes)
    upem = face.upem
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})
    st = static(fontfile, axes)
    gs = st.getGlyphSet()
    order = st.getGlyphOrder()
    scale = size / upem
    x = 0.0
    parts = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (scale, 0, 0, -scale, x + pos.x_offset * scale, -pos.y_offset * scale))
        gs[name].draw(tp)
        d = pen.getCommands()
        if d: parts.append(d)
        x += pos.x_advance * scale + tracking_em * size
    width = x - tracking_em * size
    asc = st['hhea'].ascent * scale
    return ' '.join(parts), width

# MARK_FONTS points at a folder holding Newsreader.ttf and Inter.ttf (the
# variable fonts; the site's woff2 files work once decompressed to TTF).
FONTS = os.environ.get('MARK_FONTS', os.path.join(HERE, 'fonts'))
NEWS = os.path.join(FONTS, 'Newsreader.ttf')
INTER = os.path.join(FONTS, 'Inter.ttf')

def lockup(kind, dark):
    arcs, leaf, sw = mark()
    arc_col, leaf_col = (SAGE, SAGE_LIGHT) if dark else (INK, SAGE_DEEP)
    name_col = desc_col = '#FFFFFF' if dark else INK
    bg = INK if dark else PAPER
    name_d, name_w = shape(NEWS, {'wght': 500, 'opsz': 36}, 'from little', 100)
    desc_d, desc_w = shape(INTER, {'wght': 500}, 'ONWARD', 40, tracking_em=0.32)
    g_mark = (f'<g fill="none" stroke="{arc_col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">'
              + ''.join(f'<path d="{d}"/>' for d in arcs) + f'</g><path d="{leaf}" fill="{leaf_col}"/>')
    if kind == 'horizontal':
        ms = 1.75
        gap = 26
        name_x = 100 * ms + gap
        desc_x = name_x + name_w + 30
        W = desc_x + desc_w + 6
        H = 175
        body = (f'<g transform="translate(-14,6) scale({ms})">{g_mark}</g>'
                f'<path transform="translate({name_x:.1f},128)" d="{name_d}" fill="{name_col}"/>'
                f'<path transform="translate({desc_x:.1f},128)" d="{desc_d}" fill="{desc_col}"/>')
    else:  # stacked
        ms = 3.0
        mw = 100 * ms
        W = max(name_w, mw) + 20
        mx = (W - mw) / 2
        name_x = (W - name_w) / 2
        desc_x = (W - desc_w) / 2
        H = mw + 170
        body = (f'<g transform="translate({mx - 20:.1f},10) scale({ms})">{g_mark}</g>'
                f'<path transform="translate({name_x:.1f},{mw + 92:.1f})" d="{name_d}" fill="{name_col}"/>'
                f'<path transform="translate({desc_x:.1f},{mw + 152:.1f})" d="{desc_d}" fill="{desc_col}"/>')
    pad = 40
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {W + 2*pad:.1f} {H + 2*pad:.1f}">'
            f'<rect x="{-pad}" y="{-pad}" width="{W + 2*pad:.1f}" height="{H + 2*pad:.1f}" fill="{bg}"/>{body}</svg>'), \
           (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}">{body}</svg>')

def write(name, s):
    with open(os.path.join(OUT, name), 'w') as f: f.write(s)

if __name__ == '__main__':
    arcs, leaf, sw = mark()
    write('mark.svg', mark_svg(arcs, leaf, sw, INK, SAGE_DEEP))
    write('mark-dark.svg', mark_svg(arcs, leaf, sw, SAGE, SAGE_LIGHT, bg=INK, pad=12))
    write('mark-on-paper.svg', mark_svg(arcs, leaf, sw, INK, SAGE_DEEP, bg=PAPER, pad=12))
    sa, sl, ssw = mark(small=True)
    write('mark-small.svg', mark_svg(sa, sl, ssw, INK, SAGE_DEEP))
    write('mark-small-dark.svg', mark_svg(sa, sl, ssw, SAGE, SAGE_LIGHT, bg=INK, pad=10))
    for kind in ('horizontal', 'stacked'):
        for dark in (False, True):
            withbg, bare = lockup(kind, dark)
            tag = f'lockup-{kind}{"-dark" if dark else ""}'
            write(tag + '.svg', bare)
            write(tag + '-tile.svg', withbg)
    print('written:', sorted(os.listdir(OUT)))

# ---------------------------------------------------------------- icons
def favicon_svg():
    """The small drawing, recoloured by the browser's theme (tabs can be dark)."""
    sa, sl, ssw = mark(small=True)
    a = ''.join(f'<path d="{d}"/>' for d in sa)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 -6 96 96">'
            '<style>.a{stroke:#193C39}.l{fill:#8DAE9A}'
            '@media (prefers-color-scheme: dark){.a{stroke:#A9C3B2}.l{fill:#CFDFD6}}</style>'
            f'<g class="a" fill="none" stroke-width="{ssw}" stroke-linecap="round" stroke-linejoin="round">{a}</g>'
            f'<path class="l" d="{sl}"/></svg>')

def tile_svg(small, size_hint):
    """App icon: the mark on a paper tile with safe padding (iOS and Android crop)."""
    arcs, leaf, sw = mark(small=small)
    a = ''.join(f'<path d="{d}"/>' for d in arcs)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -26 140 140">'
            f'<rect x="-14" y="-26" width="140" height="140" fill="{PAPER}"/>'
            f'<g fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{a}</g>'
            f'<path d="{leaf}" fill="{SAGE_DEEP}"/></svg>')

write('favicon.svg', favicon_svg())
write('app-icon-small.svg', tile_svg(True, 180))
write('app-icon.svg', tile_svg(False, 512))
print('icons written')
