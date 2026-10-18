/* Plate scenes for the Field notes series. Each scene is an SVG fragment in a
   1000 x 760 box: ink silhouettes (no faces), sage fills for the environment,
   and named anchors where a label's dot and leader line attach.

   Drawing rules: figures are built from a few rounded shapes with real
   proportions (a baby's head is about a third of its seated height, an
   adult's about a seventh), limbs are tapered strokes with round caps, and
   nothing has a face. Furniture is flat sage. */
window.SCENES = {
  spoon: {
    title: "A baby in a high chair has just let a spoon fall from the tray; a parent sits beside the chair, leaning in, one hand held low.",
    anchors: {
      spoon:  { x: 404, y: 560, tx: 300, ty: 600, align: "end" },
      eyes:   { x: 571, y: 292, tx: 470, ty: 190, align: "end" },
      hand:   { x: 428, y: 438, tx: 330, ty: 390, align: "end" },
      parent: { x: 836, y: 296, tx: 770, ty: 190, align: "end" },
      note:   { x: 960, y: 735, tx: 905, ty: 735, align: "end" },
    },
    svg: `
      <rect class="wash" x="0" y="0" width="1000" height="760"/>
      <rect class="floor" x="0" y="700" width="1000" height="60"/>

      <!-- high chair: back, seat, splayed legs, footrest (behind the baby) -->
      <g class="sage">
        <rect x="500" y="236" width="18" height="222" rx="4"/>
        <rect x="628" y="236" width="18" height="222" rx="4"/>
        <rect x="500" y="236" width="146" height="14" rx="4"/>
        <rect x="492" y="446" width="162" height="16" rx="4"/>
      </g>
      <g fill="none" stroke="#A9C3B2" stroke-width="16" stroke-linecap="round">
        <path d="M506 460 L470 700"/>
        <path d="M640 460 L676 700"/>
        <path d="M488 584 L658 584"/>
      </g>

      <!-- baby: head, body, arms; the near arm reaches over the tray edge where the spoon was -->
      <g class="ink">
        <circle cx="571" cy="292" r="50"/>
        <rect x="556" y="334" width="30" height="20"/>
        <path d="M520 352 C508 352 496 364 496 380 L500 452 L642 452 L646 380 C646 364 634 352 622 352 Z"/>
        <path d="M512 372 C480 388 452 410 436 436" fill="none" stroke="#193C39" stroke-width="28" stroke-linecap="round"/>
        <circle cx="428" cy="438" r="15"/>
        <path d="M630 372 C650 392 656 416 652 436" fill="none" stroke="#193C39" stroke-width="26" stroke-linecap="round"/>
        <rect x="530" y="500" width="30" height="62" rx="12"/>
        <rect x="582" y="500" width="30" height="62" rx="12"/>
      </g>
      <!-- tray in front of the baby -->
      <rect class="sage-deep" x="436" y="438" width="236" height="24" rx="6"/>

      <!-- the spoon, just released, mid-fall -->
      <g class="ink" transform="translate(404 560) rotate(-62)">
        <rect x="-62" y="-5" width="96" height="10" rx="5"/>
        <ellipse cx="48" cy="0" rx="22" ry="14"/>
      </g>

      <!-- parent: seated on a low chair, in profile, leaning toward the baby -->
      <g class="sage">
        <rect x="786" y="560" width="150" height="14" rx="4"/>
        <rect x="920" y="400" width="16" height="174" rx="4"/>
      </g>
      <g fill="none" stroke="#A9C3B2" stroke-width="14" stroke-linecap="round">
        <path d="M800 574 L796 700"/>
        <path d="M924 574 L928 700"/>
      </g>
      <g class="ink">
        <circle cx="836" cy="296" r="46"/>
        <rect x="826" y="334" width="26" height="22"/>
        <path d="M800 356 C776 364 764 384 762 406 L762 566 L906 566 L906 404 C904 380 892 362 870 356 Z"/>
        <path d="M782 390 C748 420 724 444 706 470" fill="none" stroke="#193C39" stroke-width="26" stroke-linecap="round"/>
        <circle cx="698" cy="476" r="14"/>
        <path d="M766 540 L690 548 L690 700" fill="none" stroke="#193C39" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M670 702 L720 702" stroke="#193C39" stroke-width="16" stroke-linecap="round"/>
      </g>
    `,
  },
};
