/* Shared reel renderer. render-reel.mjs injects window.REEL before this file:
     { spec, timeline: [{ id, start, end, text, say, ... }], words: [{ t0, t1, w, beat }] }
   and then calls window.setT(seconds) before each screenshot. Every frame is a
   pure function of t, so the same t always draws the same pixels. */

const MARK = `<svg viewBox="6 -8 104 104" aria-hidden="true"><g class="arcs" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>`;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (p) => { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); };

function beatAt(t) {
  const tl = window.REEL.timeline;
  for (let i = tl.length - 1; i >= 0; i--) if (t >= tl[i].start) return { beat: tl[i], index: i, local: t - tl[i].start };
  return { beat: tl[0], index: 0, local: 0 };
}
function sizeClass(text) {
  const n = String(text || "").length;
  return n > 90 ? "beat beat--s" : n > 60 ? "beat beat--m" : n > 34 ? "beat beat--l" : "beat beat--xl";
}
function captionsHtml(t, beat) {
  const words = window.REEL.words.filter((w) => w.beat === beat.id);
  if (!words.length) return "";
  const said = words.filter((w) => t >= w.t1).length;
  const nowIdx = words.findIndex((w) => t >= w.t0 && t < w.t1);
  return `<p>${words.map((w, i) => `<span class="w${i < said ? " said" : ""}${i === nowIdx ? " now" : ""}">${esc(w.w)}</span>`).join(" ")}</p>`;
}
function plateHtml(spec, beat) {
  const scene = window.SCENES && window.SCENES[spec.scene];
  if (!scene) return "";
  const labels = spec.labels || [];
  const shown = beat.labels == null ? 0 : beat.labels;
  const active = beat.active == null ? shown - 1 : beat.active;
  const svgLabels = labels.slice(0, shown).map((l, k) => {
    const a = scene.anchors[l.anchor]; if (!a) return "";
    const cls = `pl${k === active ? " pl--active" : ""}${l.kind === "note" ? " pl--note" : ""}`;
    const tx = a.tx ?? a.x + 40, ty = a.ty ?? a.y - 40;
    return `<g class="${cls}"><line x1="${a.x}" y1="${a.y}" x2="${tx}" y2="${ty}"/><circle cx="${a.x}" cy="${a.y}" r="7"/><text x="${tx + (a.align === "end" ? -10 : 10)}" y="${ty + 10}" text-anchor="${a.align || "start"}">${esc(l.title)}</text></g>`;
  }).join("");
  return `<svg class="plate" viewBox="0 50 1000 710" role="img"><title>${esc(scene.title)}</title>${scene.svg}${svgLabels}</svg>`;
}
function figureHtml(beat, local) {
  const p = ease(local / 1.1); // the figure draws over 1.1 s
  if (beat.stat) return `<div class="stat">${esc(beat.stat.value)}</div><div class="sub">${rich(beat.stat.label)}</div>`;
  if (beat.bars) {
    const max = Math.max(...beat.bars.map((b) => b.value));
    return `<div class="bars">${beat.bars.map((b) => `<div class="bar${b.highlight ? " bar--hi" : ""}"><div class="bar__label"><span>${rich(b.label)}</span><b>${esc(b.display ?? b.value)}</b></div><div class="bar__track"><div class="bar__fill" style="width:${(100 * b.value * p) / max}%"></div></div></div>`).join("")}</div>`;
  }
  return "";
}

window.setT = function setT(t) {
  const { spec, timeline } = window.REEL;
  const { beat, local } = beatAt(t);
  const frame = document.getElementById("frame");
  frame.dataset.ground = beat.ground || spec.ground || "paper";
  const fade = ease(local / 0.28);
  let inner = "";
  if (beat.kind === "mark") {
    inner = `<div class="mark" style="opacity:${ease(local / 0.3)}">${MARK}</div>`;
  } else {
    const series = spec.series;
    const text = `<div class="${sizeClass(beat.text)}" style="opacity:${fade};transform:translateY(${(1 - fade) * 14}px)">${rich(beat.text || "")}</div>`;
    const sub = beat.sub ? `<div class="sub" style="margin-top:32px;opacity:${ease((local - 0.2) / 0.3)}">${rich(beat.sub)}</div>` : "";
    const dest = beat.kind === "close" ? `<div class="dest" style="margin-top:40px;opacity:${ease((local - 0.3) / 0.3)}">${rich(spec.link.label)}<small>${esc(spec.link.page)}</small></div>` : "";
    if (series === "watch-for-this") {
      inner = `<div class="safe">${plateHtml(spec, beat)}<div style="margin-top:44px">${text}${sub}${dest}</div></div>`;
    } else {
      const fig = (beat.bars || beat.stat) ? `<div style="opacity:${ease((local - 0.15) / 0.3)}">${figureHtml(beat, local)}</div>` : "";
      inner = `<div class="safe"><div class="grow"></div>${text}${sub}${fig}${dest}<div class="grow"></div></div>`;
    }
    inner += `<div class="captions">${captionsHtml(t, beat)}</div>`;
    if (beat.kind !== "hook") inner += `<div class="corner">${MARK}</div>`;
  }
  frame.innerHTML = inner;
  window.__T = t;
};
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { window.__READY = true; });
