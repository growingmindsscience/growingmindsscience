(function () {
  "use strict";

  const section = document.querySelector("[data-age-explorer]");
  if (!section) return;

  const explorer = section.querySelector(".cl-explorer");
  const controls = section.querySelector("[data-age-controls]");
  const input = section.querySelector("#explorer-age");
  const output = section.querySelector("[data-age-output]");
  const status = section.querySelector("[data-age-status]");
  const title = section.querySelector("[data-age-title]");
  const metadata = section.querySelector("[data-age-meta]");
  const classLink = section.querySelector("[data-age-link]");
  const action = section.querySelector("[data-age-action]");
  const photos = Array.from(section.querySelectorAll("[data-age-photo]"));
  const stageButtons = Array.from(section.querySelectorAll("[data-age-stage]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stages = [
    { id: "infant", title: "Birth to 12 months", metadata: "16 lessons · About 3 hours", href: "/classes/birth-to-12-months" },
    { id: "toddler", title: "Toddler years, 1 to 3", metadata: "13 lessons · About 2.5 hours", href: "/classes/toddlerhood" },
    { id: "preschool", title: "Preschool years, 3 to 5", metadata: "15 lessons · 4 modules", href: "/classes/preschool" }
  ];
  let selectedStage = null;
  let captionAnimation = null;

  function describeAge(months, abbreviated) {
    if (months === 0) return "Birth";
    if (months < 24) return months + (months === 1 ? " month" : " months");
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    if (!remainder) return years + " years";
    return abbreviated ? years + " yr " + remainder + " mo" : years + " years, " + remainder + (remainder === 1 ? " month" : " months");
  }

  function render(value, announce) {
    const months = Math.max(0, Math.min(60, Number(value) || 0));
    const stageIndex = months < 12 ? 0 : months < 36 ? 1 : 2;
    const stage = stages[stageIndex];
    input.value = String(months);
    input.setAttribute("aria-valuetext", describeAge(months, false) + ". " + stage.title + ".");
    output.value = describeAge(months, true);
    controls.style.setProperty("--age-progress", (months / 60 * 100) + "%");
    controls.style.setProperty("--age-fraction", String(months / 60));
    if (selectedStage === stage.id) return;

    const previousStage = selectedStage;
    selectedStage = stage.id;
    explorer.setAttribute("data-selected-stage", stage.id);
    title.textContent = stage.title;
    metadata.textContent = stage.metadata;
    classLink.href = stage.href;
    action.href = stage.href;
    action.setAttribute("aria-label", "Explore the class: " + stage.title);
    section.querySelector("[data-age-action-label]").textContent = "Explore this class";

    photos.forEach(function (photo, photoIndex) {
      const active = photoIndex === stageIndex;
      photo.setAttribute("data-placement", active ? "active" : photoIndex < stageIndex ? "before" : "after");
      photo.setAttribute("aria-pressed", String(active));
      photo.hidden = Math.abs(photoIndex - stageIndex) > 1;
      photo.disabled = active;
    });
    stageButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-age-stage") === stage.id));
    });

    if (captionAnimation) captionAnimation.cancel();
    if (previousStage && !reducedMotion.matches && typeof title.animate === "function") {
      captionAnimation = title.animate([
        { opacity: 0, transform: "translateY(7px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 360, easing: "cubic-bezier(.16, 1, .3, 1)" });
    }
    if (announce) status.textContent = stage.title + ". " + stage.metadata + ".";
  }

  const tickSegments = [];
  for (let month = 0; month <= 60; month += 1) {
    const height = month % 12 === 0 ? 18 : month % 6 === 0 ? 12 : 6;
    tickSegments.push("M" + month * 10 + " 0v" + height);
  }
  section.querySelector("[data-age-ticks]").setAttribute("d", tickSegments.join(" "));

  input.addEventListener("input", function () { render(input.value, true); });
  section.querySelectorAll("[data-age-jump]").forEach(function (button) {
    button.addEventListener("click", function () {
      render(button.getAttribute("data-age-jump"), true);
      if (button.matches("[data-age-photo]")) input.focus({ preventScroll: true });
    });
  });
  reducedMotion.addEventListener("change", function () {
    if (reducedMotion.matches && captionAnimation) captionAnimation.cancel();
  });

  render(input.value, false);
  controls.hidden = false;
  section.querySelector("[data-age-fallback]").hidden = true;
  explorer.classList.add("is-ready");
  photos.forEach(function (photo) { photo.querySelector("img").loading = "eager"; });
})();
