"use client";

import { useEffect, useState } from "react";
import { DEPLOYED } from "@/lib/config";
import { useApy, useFlows, useHub, useVault } from "@/lib/hooks";
import { fmtPct, fmtShort, toNum } from "@/lib/format";

/** Events the panel sends to the scene. */
export type SceneEvent = { kind: "saved" | "requested" | "paid"; amount?: string };
export const sceneEvent = (detail: SceneEvent) => window.dispatchEvent(new CustomEvent("levada:event", { detail }));
/** Stations ask the scene to light one stage (or resume the cycle with 0). */
export const focusStage = (n: number) => window.dispatchEvent(new CustomEvent("levada:stage", { detail: n }));

/**
 * Anchor points in art px of the 300 x 125 scene, with the stem length (art px) and direction that
 * put each label in open sea: Mezo above the ember island, the bridge below the aqueduct between
 * the islands, Base above the lighthouse (the keeper's light).
 */
const PIN = {
  mezo: { at: [66, 66], stem: 26, dir: "up" },
  bridge: { at: [167, 80], stem: 12, dir: "down" },
  base: { at: [238, 36], stem: 13, dir: "up" },
} as const;
const pct = ([x, y]: readonly [number, number]) => ({ left: `${(x / 300) * 100}%`, top: `${(y / 125) * 100}%` });

function useTags() {
  const apy = useApy();
  const vault = useVault();
  const hub = useHub();
  const flows = useFlows(vault, hub);
  const live = DEPLOYED && !!flows;
  return [
    { n: 1, key: "mezo", sw: "ember", label: "Mezo", value: `Earning ${fmtPct(apy?.apy)}` },
    {
      n: 2,
      key: "bridge",
      sw: "aqua",
      label: "Bridge",
      value: live ? (flows.crossing > 0n ? `${fmtShort(toNum(flows.crossing))} MUSD crossing` : "Wormhole NTT · clear") : "Wormhole NTT",
    },
    { n: 3, key: "base", sw: "tide", label: "Base", value: live ? `Buffer ${fmtShort(toNum(flows.buffer))} MUSD` : "Instant exits" },
  ] as const;
}

/** Toasts pop in open sea next to where it happened: right of the Base island, or above the aqueduct. */
const TOAST_AT = { base: [272, 72], bridge: [150, 22] } as const;
type Toast = { id: number; label: string; amount?: string; at: keyof typeof TOAST_AT };

/** Live labels on the diorama, event toasts over the islands, and the one hand-placed note. */
export function SceneHud() {
  const tags = useTags();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [note, setNote] = useState(false);

  // The lit stage follows the coins: every loop of the coin animation moves it one station on.
  useEffect(() => {
    const body = document.body;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stage = 1;
    let held = 0;
    if (!reduced) body.dataset.stage = "1";
    const coin = document.getElementById("coin-1");
    const next = () => {
      if (held) return;
      stage = (stage % 4) + 1;
      body.dataset.stage = String(stage);
    };
    const hold = (e: Event) => {
      held = (e as CustomEvent<number>).detail;
      if (held) body.dataset.stage = String(held);
      else if (reduced) delete body.dataset.stage;
      else body.dataset.stage = String(stage);
    };
    if (!reduced) coin?.addEventListener("animationiteration", next);
    window.addEventListener("levada:stage", hold);
    return () => {
      coin?.removeEventListener("animationiteration", next);
      window.removeEventListener("levada:stage", hold);
      delete body.dataset.stage;
    };
  }, []);

  // Toasts over the island where something just happened.
  useEffect(() => {
    let id = 0;
    const on = (e: Event) => {
      const { kind, amount } = (e as CustomEvent<SceneEvent>).detail;
      const t: Toast =
        kind === "saved"
          ? { id: ++id, label: "Saved", amount: `+${amount} MUSD`, at: "base" }
          : kind === "requested"
            ? { id: ++id, label: "Exit queued", at: "bridge" }
            : { id: ++id, label: "Paid", amount: `${amount} MUSD`, at: "base" };
      setToasts((ts) => [...ts, t]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 3000);
      if (kind === "saved") {
        setNote(false);
        try {
          localStorage.setItem("levada-saved", "1");
        } catch {}
      }
    };
    window.addEventListener("levada:event", on);
    return () => window.removeEventListener("levada:event", on);
  }, []);

  // The note is for first visits: it goes away after the first Save.
  useEffect(() => {
    try {
      setNote(!localStorage.getItem("levada-saved"));
    } catch {
      setNote(true);
    }
  }, []);

  return (
    <>
      <div className="hud">
        {tags.map((t) => {
          const p = PIN[t.key];
          return (
            <div
              key={t.key}
              className="hud__tag"
              data-n={t.n}
              data-dir={p.dir}
              style={{ ...pct(p.at), ["--stem" as string]: p.stem }}
            >
              <span className="hud__pin" aria-hidden="true" />
              <span className="hud__stem" aria-hidden="true" />
              <span className="hud__chip">
                <i className={`sw sw--${t.sw}`} aria-hidden="true" />
                <b>{t.label}</b>
                <span>{t.value}</span>
              </span>
            </div>
          );
        })}
      </div>

      {note && (
        <div className="note" aria-hidden="true">
          <span className="note__text">your MUSD crosses here</span>
          {/* A stepped arrow on the art-pixel grid, from under the note down to the first coin. */}
          <svg className="note__arrow" viewBox="0 0 300 125" shapeRendering="crispEdges">
            <path className="note__line" pathLength={1} d="M136.5 15v20" />
            <path className="note__head" d="M134 35h5v1h-5zM135 36h3v1h-3zM136 37h1v1h-1z" />
          </svg>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <span key={t.id} className="toast" style={pct(TOAST_AT[t.at])}>
            <b>{t.label}</b>
            {t.amount && <span>{t.amount}</span>}
          </span>
        ))}
      </div>
    </>
  );
}

/** Below 640px the labels leave the scene and become a legend under it. */
export function SceneLegend() {
  const tags = useTags();
  return (
    <ul className="legend">
      {tags.map((t) => (
        <li key={t.key} data-n={t.n}>
          <i className={`sw sw--${t.sw}`} aria-hidden="true" />
          <b>{t.label}</b>
          <span>{t.value}</span>
        </li>
      ))}
    </ul>
  );
}
