"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/config";

const STEPS = [
  {
    verb: "Deposit",
    who: "You",
    cap: (
      <>
        Save MUSD on Base. You get <span className="nocase">{BRAND.token}</span>, <em>your share of the vault</em>.
      </>
    ),
  },
  {
    verb: "Cross",
    who: "Keeper",
    cap: (
      <>
        Most of it crosses to Mezo on Wormhole NTT, <em>MUSD&apos;s own bridge</em>.
      </>
    ),
  },
  {
    verb: "Earn",
    who: "Mezo",
    cap: (
      <>
        On Mezo it earns the savings rate, <em>paid by Bitcoin borrowers</em>.
      </>
    ),
  },
  {
    verb: "Withdraw",
    who: "You",
    cap: (
      <>
        Small exits are <em>instant</em>. Bigger ones are paid in order from Mezo.
      </>
    ),
  },
];

/** Four verb-first steps on a dotted rail. On phones a square marker follows the step in view. */
export function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const items = ref.current ? [...ref.current.querySelectorAll<HTMLElement>(".step")] : [];
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
    <ol className="steps" ref={ref} style={{ ["--active" as string]: active }}>
      {STEPS.map((s, i) => (
        <li key={s.verb} className="step reveal" data-i={i} data-active={i === active} style={{ ["--i" as string]: i }}>
          <div className="step__top">
            <span className="step__idx">0{i + 1}</span>
            <span className="meter" aria-hidden="true">
              {[0, 1, 2, 3].map((k) => (
                <i key={k} className={k <= i ? "is-on" : undefined} />
              ))}
            </span>
          </div>
          <h3 className="step__verb">{s.verb}</h3>
          <p className="step__cap">{s.cap}</p>
          <p className="step__foot">
            <span>Step {i + 1}</span>
            <span className="step__dots" aria-hidden="true" />
            <span>{s.who}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
