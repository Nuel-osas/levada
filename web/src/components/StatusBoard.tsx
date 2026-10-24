"use client";

import { useQuery } from "@tanstack/react-query";
import type { CheckState, Status } from "@/lib/status";

const STATE: Record<CheckState, string> = { ok: "Working", warn: "Slow", down: "Down", idle: "Not live yet" };

/** The status checks, refreshed every 30 seconds from /api/status. */
export function StatusBoard({ initial }: { initial: Status }) {
  const { data: s } = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("status");
      return (await res.json()) as Status;
    },
    initialData: initial,
    refetchInterval: 30_000,
  });
  return (
    <>
      <header className="section-head status__head">
        <p className="eyebrow">Status</p>
        <h1 className="status__title">
          <span className={`dot dot--${s.overall}`} aria-hidden="true" />
          {s.headline}
        </h1>
        <p className="status__meta">
          Checked {s.checkedAt.slice(11, 19)} UTC · refreshes every 30 s ·{" "}
          <a href="/api/status" target="_blank" rel="noreferrer">
            as JSON ↗
          </a>
        </p>
        {s.note && <p className="status__note">{s.note}</p>}
      </header>
      <ul className="status__list">
        {s.checks.map((c) => (
          <li key={c.id} className={`status__row is-${c.state}`}>
            <span className="dot" aria-hidden="true" />
            <span className="status__label">{c.label}</span>
            <span className="status__value">{c.value}</span>
            <span className="status__detail">
              {c.detail}
              {c.href && (
                <>
                  {" "}
                  <a href={c.href} target="_blank" rel="noreferrer" aria-label={`${c.label} on the explorer`}>
                    ↗
                  </a>
                </>
              )}
            </span>
            <span className="status__state">{STATE[c.state]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
