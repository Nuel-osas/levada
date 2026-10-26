"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";

const KEY = "levada-theme";

/** Light or dark. Follows the system until the user picks. */
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
    <button className="icon-btn theme-toggle" type="button" onClick={flip} aria-label="Switch between light and dark">
      <Icon name="moon" size={18} className="theme-toggle__moon" />
      <Icon name="sun" size={18} className="theme-toggle__sun" />
    </button>
  );
}
