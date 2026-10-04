"use client";

import { useEffect, useState } from "react";

// Same key and values as the main site's toggle (assets/js/chrome.js), so
// one choice covers the sales pages and the classroom.
const THEME_KEY = "gms-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.getAttribute("data-theme") === "dark"), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* private mode: the choice lasts for this page */ }
  }
  return (
    <button type="button" onClick={toggle} className={className}>
      {dark ? "Light theme" : "Dark theme"}
    </button>
  );
}
