"use client";

import { useEffect, useState } from "react";
import { fmt, fmtPct } from "@/lib/format";
import { useSavings } from "@/lib/hooks";

/** Phones: the live balance on the left, Save on the right. Hidden while the panel is on screen. */
export function MobileBar() {
  const s = useSavings();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const panel = document.getElementById("panel");
    const hero = document.getElementById("hero-actions");
    let panelIn = false;
    let heroIn = true;
    const update = () => setHidden(panelIn || heroIn);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // The panel has its own Save button: hide the bar once a fair part of it is on screen.
          if (e.target === panel) panelIn = e.intersectionRatio > 0.2;
          if (e.target === hero) heroIn = e.isIntersecting;
        }
        update();
      },
      { threshold: [0, 0.2, 0.4] },
    );
    if (panel) io.observe(panel);
    if (hero) io.observe(hero);
    else heroIn = false;
    return () => io.disconnect();
  }, []);

  const mine = s.mode === "mine";
  return (
    <div className={hidden ? "mbar is-hidden" : "mbar"} aria-hidden={hidden}>
      <div className="mbar__val">
        <span className="mbar__label">{mine ? "Your savings · estimate" : "Mezo savings rate"}</span>
        <span className="mbar__num">{mine ? `${fmt(s.mine, 6)} MUSD` : `${fmtPct(s.apy?.apy)} a year`}</span>
      </div>
      <a className="btn-primary btn-primary--sm" href="/app" tabIndex={hidden ? -1 : 0}>
        <span className="btn-primary__label" data-label="Launch app">
          Launch app
        </span>
      </a>
    </div>
  );
}
