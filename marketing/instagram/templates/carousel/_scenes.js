/* Plate scenes for the Field notes series. Each scene is an SVG fragment in a
   1000 x 760 box: ink silhouettes (no faces), sage fills for the environment,
   and named anchors where a label's dot and leader line attach. */
window.SCENES = {
  spoon: {
    title: "A baby in a high chair has just dropped a spoon; a parent sits beside the chair.",
    anchors: {
      spoon:  { x: 318, y: 598, tx: 200, ty: 530, align: "end" },
      eyes:   { x: 596, y: 248, tx: 520, ty: 170, align: "end" },
      hand:   { x: 500, y: 452, tx: 420, ty: 380, align: "end" },
      parent: { x: 712, y: 548, tx: 660, ty: 650, align: "end" },
      note:   { x: 960, y: 735, tx: 905, ty: 735, align: "end" },
    },
    svg: `
      <rect class="wash" x="0" y="0" width="1000" height="760"/>
      <rect class="floor" x="0" y="700" width="1000" height="60"/>
      <!-- table edge, left -->
      <rect class="sage" x="0" y="372" width="330" height="22"/>
      <rect class="sage-deep" x="40" y="394" width="18" height="306"/>
      <rect class="sage-deep" x="250" y="394" width="18" height="306"/>
      <!-- high chair -->
      <g class="sage">
        <rect x="528" y="330" width="18" height="370"/>
        <rect x="690" y="330" width="18" height="370"/>
        <rect x="528" y="330" width="180" height="16"/>
        <rect x="548" y="420" width="140" height="14"/>
        <rect x="470" y="400" width="250" height="26"/>
      </g>
      <g class="sage-deep">
        <rect x="470" y="426" width="22" height="274"/>
        <rect x="722" y="426" width="0" height="0"/>
      </g>
      <!-- baby, seated, turned toward the parent -->
      <g class="ink">
        <circle cx="610" cy="262" r="56"/>
        <path d="M560 318 C540 332 530 356 532 390 L532 404 L690 404 L690 388 C690 352 676 326 656 316 Z"/>
        <path d="M552 344 C528 356 508 388 498 430 C494 446 500 456 512 456 C522 456 528 448 532 436 C540 410 552 388 570 372 Z"/>
        <path d="M668 340 C690 356 700 380 704 404 L688 410 C682 388 672 372 660 362 Z"/>
        <path d="M556 400 L564 470 L588 470 L586 404 Z"/>
        <path d="M646 400 L656 470 L680 470 L672 404 Z"/>
      </g>
      <!-- the dropped spoon, mid-air -->
      <g class="ink" transform="translate(318 598) rotate(-28)">
        <rect x="-70" y="-6" width="110" height="12" rx="6"/>
        <ellipse cx="54" cy="0" rx="24" ry="16"/>
      </g>
      <!-- parent, seated beside the chair, leaning in -->
      <g class="ink">
        <circle cx="862" cy="300" r="52"/>
        <path d="M800 352 C770 372 756 420 752 480 L752 700 L950 700 L950 480 C950 420 934 372 904 352 Z"/>
        <path d="M790 400 C760 430 740 470 730 520 L760 528 C772 486 790 456 812 436 Z"/>
      </g>
      <!-- the parent's hand, held low near the chair -->
      <path class="ink" d="M730 520 C708 526 692 536 684 548 C680 556 684 562 692 562 L748 556 L756 530 Z"/>
    `,
  },
};
