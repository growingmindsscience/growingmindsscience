/* Shared slide renderer for the four carousel templates.
   The renderer script injects window.SPEC (the post's spec.json) and
   window.SLIDE (zero-based index) before this file runs. Each template
   calls render(series) and this file draws the slide for that index,
   then sets window.__READY and window.__CHECK for the renderer. */

const MARK = `<svg viewBox="6 -8 104 104" aria-hidden="true"><g class="arcs" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96"/><path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00"/></g><path class="leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z"/></svg>`;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Minimal inline markup: *italic* and **strong**, curly quotes left as typed.
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
const paras = (s) => String(s ?? "").split(/\n\s*\n/).map((p) => `<p>${rich(p.trim())}</p>`).join("");
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

function leadClass(text) {
  const n = String(text).length;
  return n > 70 ? "lead lead--xs" : n > 46 ? "lead lead--s" : "lead";
}

function chrome(spec, i, total) {
  return `<div class="count muted">${i + 1} / ${total}</div><div class="mark">${MARK}</div>`;
}

function sourcesSlide(spec, slide) {
  const list = (slide.sources || spec.sources || []).map((s) => `<li>${rich(s)}</li>`).join("");
  const link = spec.link || {};
  return `
    <div class="head">${rich(slide.head || "Where this comes from")}</div>
    <ul class="sources" style="margin-top:48px">${list}</ul>
    <div class="grow"></div>
    <div class="dest">${rich(link.label || "")}<small class="soft">${esc(link.page || "")}</small></div>
    <div class="rule" style="margin:36px 0 28px"></div>
    <div class="disclaimer muted">Educational content, not medical advice. ${esc(slide.note || "")}</div>`;
}

function textSlide(slide) {
  return `
    ${slide.head ? `<div class="head">${rich(slide.head)}</div>` : ""}
    <div class="body" style="margin-top:${slide.head ? 44 : 0}px">${paras(slide.body)}</div>`;
}

function trySlide(slide) {
  const items = (slide.items || []).map((t) => `<li>${rich(t)}</li>`).join("");
  return `
    <div class="head">${rich(slide.head || "What to try")}</div>
    <ol class="try" style="margin-top:52px">${items}</ol>
    ${slide.note ? `<div class="grow"></div><div class="meta muted">${rich(slide.note)}</div>` : ""}`;
}

function figureSlide(slide) {
  let fig = "";
  if (slide.stat) {
    fig = `<div class="stat" style="margin-top:56px"><div class="stat__v">${esc(slide.stat.value)}</div><div class="stat__l soft">${rich(slide.stat.label)}</div></div>`;
  } else if (slide.bars) {
    const max = Math.max(...slide.bars.map((b) => b.value));
    fig = `<div class="bars" style="margin-top:56px">${slide.bars
      .map((b) => `<div class="bar${b.highlight ? " bar--hi" : ""}"><div class="bar__label"><span>${rich(b.label)}</span><b>${esc(b.display ?? b.value)}</b></div><div class="bar__track"><div class="bar__fill" style="width:${Math.max(2, (100 * b.value) / max)}%"></div></div></div>`)
      .join("")}</div>`;
  }
  return `
    <div class="head">${rich(slide.head)}</div>
    ${fig}
    ${slide.body ? `<div class="body" style="margin-top:52px">${paras(slide.body)}</div>` : ""}
    ${slide.caption ? `<div class="grow"></div><div class="meta muted">${rich(slide.caption)}</div>` : ""}`;
}

/* ---------- series: one study, plainly ---------- */
function oneStudyCover(spec, slide) {
  const fig = slide.figure ? `<div class="os-fig"><b>${esc(slide.figure.value)}</b><span class="soft">${rich(slide.figure.label)}</span></div>` : "";
  return `
    <div class="chip">${esc(spec.age)}</div>
    <div class="grow"></div>
    <div class="${leadClass(slide.lead)}">${rich(slide.lead)}</div>
    ${slide.sub ? `<div class="body soft" style="margin-top:40px;max-width:820px">${rich(slide.sub)}</div>` : ""}
    <div class="grow"></div>
    ${fig}`;
}

/* ---------- series: is this normal? ---------- */
function normalCover(spec, slide) {
  return `
    <div class="chip">${esc(spec.age)}</div>
    <div class="grow"></div>
    <div class="${leadClass(slide.lead)}">${rich(slide.lead)}</div>
    ${slide.sub ? `<div class="body soft" style="margin-top:40px;max-width:860px">${rich(slide.sub)}</div>` : ""}
    <div class="grow"></div>
    <div class="meta muted">Ranges, not deadlines.</div>`;
}

function rangeSlide(slide) {
  // A horizontal age range: ticks across the band, a sage span for "most children", a marker for the asked age.
  const r = slide.range;
  const pct = (m) => ((m - r.from) / (r.to - r.from)) * 100;
  const ticks = [];
  for (let m = r.from; m <= r.to; m += r.step || 6) ticks.push(`<i style="left:${pct(m)}%"><span>${m}${m === r.from ? " mo" : ""}</span></i>`);
  return `
    <div class="head">${rich(slide.head)}</div>
    <div class="range" style="margin-top:72px">
      <div class="range__track"><div class="range__span" style="left:${pct(r.most[0])}%;width:${pct(r.most[1]) - pct(r.most[0])}%"></div>${r.mark != null ? `<div class="range__mark" style="left:${pct(r.mark)}%"></div>` : ""}</div>
      <div class="range__ticks">${ticks.join("")}</div>
      <div class="range__legend meta soft"><span><i class="sw sw--span"></i>${rich(r.mostLabel || "Most children")}</span>${r.mark != null ? `<span><i class="sw sw--mark"></i>${rich(r.markLabel || "This age")}</span>` : ""}</div>
    </div>
    ${slide.body ? `<div class="body" style="margin-top:56px">${paras(slide.body)}</div>` : ""}`;
}

function signsSlide(slide) {
  const items = (slide.items || []).map((t) => `<li>${rich(t)}</li>`).join("");
  return `
    <div class="head">${rich(slide.head)}</div>
    <ul class="signs" style="margin-top:48px">${items}</ul>
    <div class="grow"></div>
    <div class="meta muted">${rich(slide.note || "Not a checklist for a diagnosis. A reason to ask.")}</div>`;
}

/* ---------- series: what we got wrong ---------- */
function wrongCover(spec, slide) {
  return `
    <div class="chip">${esc(spec.age)}</div>
    <div class="grow"></div>
    <div class="wrong-claim ${leadClass(slide.claim)}"><span>${rich(slide.claim)}</span></div>
    <div class="body soft" style="margin-top:56px;max-width:860px">${rich(slide.now)}</div>
    <div class="grow"></div>
    <div class="meta muted">What the evidence says now.</div>`;
}

/* ---------- series: field notes ---------- */
function plateSlide(spec, slide, i) {
  const scene = window.SCENES && window.SCENES[spec.scene || "spoon"];
  if (!scene) return `<div class="head">Missing scene</div>`;
  const labels = spec.labels || [];
  const shown = slide.reveal == null ? labels.length : slide.reveal; // how many labels are drawn
  const active = slide.active == null ? shown - 1 : slide.active;
  const svgLabels = labels
    .slice(0, shown)
    .map((l, k) => {
      const a = scene.anchors[l.anchor];
      if (!a) return "";
      const cls = `pl${k === active ? " pl--active" : ""}${l.kind === "note" ? " pl--note" : ""}`;
      const tx = a.tx ?? a.x + 40, ty = a.ty ?? a.y - 40;
      return `<g class="${cls}"><line x1="${a.x}" y1="${a.y}" x2="${tx}" y2="${ty}"/><circle cx="${a.x}" cy="${a.y}" r="7"/><text x="${tx + (a.align === "end" ? -10 : 10)}" y="${ty + 10}" text-anchor="${a.align || "start"}">${esc(l.title)}</text></g>`;
    })
    .join("");
  // The cover shows the whole plate; body slides crop the empty top so the text fits beneath.
  const cover = slide.type === "cover";
  const svg = `<svg class="plate${cover ? "" : " plate--crop"}" viewBox="0 ${cover ? 50 : 110} 1000 ${cover ? 710 : 650}" role="img"><title>${esc(scene.title)}</title>${scene.svg}${svgLabels}</svg>`;
  if (cover) {
    return `
      <div class="chip">${esc(spec.age)}</div>
      ${svg}
      <div class="grow"></div>
      <div class="${leadClass(slide.lead)}">${rich(slide.lead)}</div>
      ${slide.sub ? `<div class="meta muted" style="margin-top:28px;max-width:800px">${rich(slide.sub)}</div>` : ""}`;
  }
  const l = labels[active] || {};
  return `
    ${svg}
    <div class="fn-label">
      <div class="head head--fn">${rich(slide.head || l.title)}</div>
      <div class="body" style="margin-top:28px">${paras(slide.body || l.text)}</div>
    </div>
    ${slide.caption ? `<div class="grow"></div><div class="meta muted">${rich(slide.caption)}</div>` : ""}`;
}

/* ---------- dispatch ---------- */
function render(series) {
  const spec = window.SPEC, i = window.SLIDE | 0, slides = spec.slides, slide = slides[i];
  const total = slides.length;
  const ground = slide.ground || (i === 0 ? spec.ground : spec.bodyGround) || spec.ground || "paper";
  let inner = "";
  const t = slide.type;
  if (t === "sources") inner = sourcesSlide(spec, slide);
  else if (t === "text") inner = textSlide(slide);
  else if (t === "try") inner = trySlide(slide);
  else if (t === "figure") inner = figureSlide(slide);
  else if (t === "range") inner = rangeSlide(slide);
  else if (t === "signs") inner = signsSlide(slide);
  else if (series === "field-notes" && (t === "cover" || t === "plate")) inner = plateSlide(spec, slide, i);
  else if (t === "cover" && series === "one-study") inner = oneStudyCover(spec, slide);
  else if (t === "cover" && series === "is-this-normal") inner = normalCover(spec, slide);
  else if (t === "cover" && series === "what-we-got-wrong") inner = wrongCover(spec, slide);
  else inner = `<div class="head">Unknown slide type: ${esc(t)}</div>`;

  const root = document.getElementById("slide");
  root.dataset.ground = ground;
  root.dataset.series = series;
  root.dataset.type = t;
  root.innerHTML = inner + (t === "cover" ? `<div class="mark">${MARK}</div>` : chrome(spec, i, total));
  document.title = `${spec.id} ${i + 1}/${total}`;

  const textOf = (s) => [s.lead, s.sub, s.head, s.body, s.claim, s.now, s.caption, s.note, ...(s.items || [])].filter(Boolean).join(" ");
  const wc = words(textOf(slide));
  // Overflow: anything past the slide's bottom edge, or reading content that
  // intrudes into the footer band where the page count and the mark sit.
  const FOOTER_TOP = 1350 - 150;
  const overflow = root.scrollHeight > root.clientHeight + 1
    || [...root.querySelectorAll(".body, .try, .signs, .bars, .range, .fn-label, .sources, .lead, .head, .wrong-claim, .os-fig")].some((el) => {
      const r = el.getBoundingClientRect();
      return el.offsetHeight > 0 && r.bottom > FOOTER_TOP;
    });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    requestAnimationFrame(() => {
      window.__CHECK = { words: wc, overflow, type: t, ground, leadWords: slide.lead ? words(slide.lead) : (slide.claim ? words(slide.claim) : null) };
      window.__READY = true;
    });
  });
}
window.renderSlide = render;
