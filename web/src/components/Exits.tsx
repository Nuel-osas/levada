"use client";

import type { ReactNode } from "react";
import { links } from "@/lib/config";
import { fmtMusd } from "@/lib/format";
import type { ExitView } from "@/lib/hooks";

type State = "done" | "now" | "todo" | "skip";

function steps(e: ExitView) {
  const released = e.paid || e.claimable || (e.requested !== undefined && e.released !== undefined && e.released >= e.requested);
  const partly = !released && e.released !== undefined && e.released > 0n;
  const list: { label: string; state: State; detail?: ReactNode }[] = [
    {
      label: "Requested on Base",
      state: "done",
      detail: e.txHash ? (
        <a href={links.base(`tx/${e.txHash}`)} target="_blank" rel="noreferrer">
          tx ↗
        </a>
      ) : undefined,
    },
  ];
  if (e.viaHub) {
    list.push({
      label: "Signed by Wormhole guardians",
      state: e.signed ? "done" : "now",
      detail:
        e.signed && e.txHash ? (
          <a href={links.wormholescan(e.txHash)} target="_blank" rel="noreferrer">
            Wormholescan ↗
          </a>
        ) : undefined,
    });
    list.push({
      label: "Released from Mezo",
      state: released ? "done" : e.signed ? "now" : "todo",
      detail: partly ? `${fmtMusd(e.released)} of ${fmtMusd(e.requested)}` : undefined,
    });
  } else {
    list.push({ label: "Covered by the Base buffer", state: "done" });
  }
  list.push({
    label: e.paid ? "Paid to your wallet" : e.claimable ? "Landed on Base: ready to pay" : released ? "Crossing back to Base" : "Paid to your wallet",
    state: e.paid ? "done" : released ? "now" : "todo",
  });
  return list;
}

/** The wallet's queued exits, each with a live timeline and a claim button once its MUSD has landed. */
export function Exits({
  exits,
  onClaim,
  busy,
}: {
  exits: ExitView[];
  onClaim: (e: ExitView) => void;
  busy: boolean;
}) {
  if (!exits.length) return null;
  return (
    <div className="exits">
      <p className="exits__title">Your withdrawals</p>
      {exits.map((e) => (
        <div key={e.id.toString()} className={e.paid ? "exit is-paid" : "exit"}>
          <div className="exit__head">
            <span className="exit__id">
              Exit <span className="mono">#{e.id.toString()}</span>
            </span>
            <span className="exit__amt">{fmtMusd(e.assets)} MUSD</span>
          </div>
          <ol className="timeline">
            {steps(e).map((s) => (
              <li key={s.label} className={`timeline__step is-${s.state}`}>
                <i aria-hidden="true" />
                <span>{s.label}</span>
                {s.detail && <span className="timeline__detail">{s.detail}</span>}
                <span className="sr-only">
                  {s.state === "done" ? " (done)" : s.state === "now" ? " (in progress)" : " (waiting)"}
                </span>
              </li>
            ))}
          </ol>
          {e.claimable && (
            <div className="exit__claim">
              <button className="btn-solid" type="button" disabled={busy} onClick={() => onClaim(e)}>
                Claim now
              </button>
              <span>The keeper usually pays it within minutes. You can do it now.</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
