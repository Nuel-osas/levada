"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/config";

const STEPS: { verb: string; who: string; cap: React.ReactNode }[] = [
  {
    verb: "Deposit",
    who: "You, on Base",
    cap: (
      <>
        Save MUSD on Base and get <span className="nocase">{BRAND.token}</span>, your share of the vault. One signature,
        on the chain you already use.
      </>
    ),
  },
  {
    verb: "Cross",
    who: "The keeper",
    cap: <>Most of it crosses to Mezo on Wormhole NTT, MUSD&apos;s own bridge. A buffer stays on Base for instant exits.</>,
  },
  {
    verb: "Earn",
    who: "Mezo",
    cap: <>On Mezo it earns the MUSD Savings Rate in sMUSD, paid by interest on Bitcoin-backed loans.</>,
  },
  {
    verb: "Withdraw",
    who: "You, on Base",
    cap: <>Small exits are instant from the buffer. Bigger ones are paid in order from Mezo, usually in minutes.</>,
  },
];

/**
 * How it works, pinned: a giant step number holds on the left while the four steps scroll by on the
 * right, and the number rolls to whichever step is in the middle of the screen.
 */
export function Steps() {
  const list = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const items = list.current ? [...list.current.querySelectorAll<HTMLElement>(".step")] : [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="how">
      <div className="how__pin">
        <div className="how__num" aria-hidden="true">
          <span className="how__zero">0</span>
          <span className="how__roll">
            <span className="how__strip" style={{ transform: `translateY(${-active * 25}%)` }}>
              {STEPS.map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </span>
          </span>
        </div>
        <div className="how__bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${(active + 1) / STEPS.length})` }} />
        </div>
        <p className="how__who" aria-live="polite">
          {STEPS[active].who}
        </p>
      </div>
      <ol className="how__steps" ref={list}>
        {STEPS.map((s, i) => (
          <li key={s.verb} className={i === active ? "step is-active" : "step"} data-i={i}>
            <p className="step__idx">0{i + 1} / 04</p>
            <h3 className="step__verb">{s.verb}</h3>
            <p className="step__cap">{s.cap}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
