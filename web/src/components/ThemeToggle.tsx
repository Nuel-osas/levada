"use client";

import { useEffect } from "react";
import { PixelIcon } from "./PixelIcon";

const KEY = "levada-theme";

/** Day or night. Night lights the scene, not the page. Follows the system until the user picks. */
export function ThemeToggle() {
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {}
      document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  const flip = () => {
    const el = document.documentElement;
    const next = el.dataset.theme === "dark" ? "light" : "dark";
    el.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };

  return (
    <button className="icon-btn theme-toggle" type="button" onClick={flip} aria-label="Switch between day and night">
      <PixelIcon name="moon" scale={1} className="theme-toggle__moon" />
      <PixelIcon name="sun" scale={1} className="theme-toggle__sun" />
    </button>
  );
}
