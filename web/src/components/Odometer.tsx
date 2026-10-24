"use client";

import { useEffect, useRef, useState } from "react";

const STRIP = Array.from({ length: 20 }, (_, i) => <span key={i}>{i % 10}</span>);
const round = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** One rolling digit. Rolls forward through 9 -> 0 instead of spinning back down the strip. */
function Digit({ d, sub }: { d: number; sub: boolean }) {
  const [pos, setPos] = useState(d);
  const [snap, setSnap] = useState(false);
  const prev = useRef(d);
  useEffect(() => {
    const p = prev.current;
    prev.current = d;
    if (d === p) return;
    setSnap(false);
    setPos(d > p ? d : d + 10);
  }, [d]);
  return (
    <span className={sub ? "odo__cell odo__cell--sub" : "odo__cell"}>
      <span
        className="odo__strip"
        style={{ transform: `translateY(${-pos * 5}%)`, transition: snap ? "none" : undefined }}
        onTransitionEnd={() => {
          if (pos >= 10) {
            setSnap(true);
            setPos(pos - 10);
          }
        }}
      >
        {STRIP}
      </span>
    </span>
  );
}

/**
 * A per-digit odometer (each digit has its own cell and rolls). Digits after `big` decimals are
 * drawn smaller: they tick every second while the whole units hold still. The visual is hidden
 * from screen readers, which get a rounded value that updates every 30 seconds instead.
 */
export function Odometer({
  value,
  decimals = 7,
  big = 2,
  label,
  className = "",
}: {
  value: number | undefined;
  decimals?: number;
  big?: number;
  label: string;
  className?: string;
}) {
  const text =
    value === undefined
      ? `0.${"0".repeat(decimals)}`
      : value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const dot = text.indexOf(".");

  const [spoken, setSpoken] = useState<string>();
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
    if (value !== undefined) setSpoken((s) => s ?? round(value));
  }, [value]);
  useEffect(() => {
    const id = setInterval(() => {
      if (latest.current !== undefined) setSpoken(round(latest.current));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const chars = [...text];
  return (
    <span className={`odo ${value === undefined ? "odo--empty " : ""}${className}`}>
      <span className="odo__digits" aria-hidden="true">
        {chars.map((c, i) => {
          const key = chars.length - i; // keyed from the right so cells keep their place as numbers grow
          if (c < "0" || c > "9") return <span key={key} className={c === "." ? "odo__sep odo__sep--dot" : "odo__sep"}>{c}</span>;
          return <Digit key={key} d={Number(c)} sub={dot >= 0 && i > dot + big} />;
        })}
      </span>
      <span className="sr-only">
        {label} {spoken ?? "loading"} MUSD
      </span>
    </span>
  );
}
