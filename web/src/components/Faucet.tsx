"use client";

import { useEffect, useRef } from "react";
import { DEPLOYED, NETWORK, links } from "@/lib/config";
import { useFaucet, useFaucetReady, type FaucetResult } from "@/lib/faucet";

/**
 * "Get 250 test MUSD". Shown on testnet only, when the faucet is configured, a wallet is connected
 * and it holds under 100 test MUSD. Once used, the result (sent with a tx link, or a clear error)
 * stays on screen even after the balance update hides the button.
 */
export function FaucetAction({ where, onSent }: { where: "hero" | "panel"; onSent?: (r: FaucetResult) => void }) {
  const f = useFaucet();
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (f.result && f.result.musdTx !== seen.current) {
      seen.current = f.result.musdTx;
      onSent?.(f.result);
    }
  }, [f.result, onSent]);

  if (NETWORK !== "testnet" || (!f.offer && f.status === "idle")) return null;
  const busy = f.status === "pending";
  // After a refusal (already funded, cooldown) the button goes; after a failure it stays to retry.
  const refused = !!f.error && ["already_funded", "cooldown", "invalid_address", "testnet_only"].includes(f.error.code);
  const showButton = f.offer && f.status !== "success" && !refused;

  return (
    <div className={`faucet faucet--${where}`}>
      {where === "panel" && f.status !== "success" && (
        <p className="faucet__lead">
          <b>No test MUSD yet?</b> Get 250 to try the whole loop. Test MUSD has no value; on mainnet, MUSD is borrowed
          against BTC on Mezo.
        </p>
      )}
      {showButton && (
        <button type="button" className="btn-solid faucet__btn" onClick={f.claim} disabled={busy} aria-busy={busy}>
          {busy ? "Sending test MUSD…" : "Get 250 test MUSD"}
        </button>
      )}
      {f.status === "success" && f.result && (
        <p className="faucet__note is-ok" role="status">
          <span className="faucet__tick" aria-hidden="true">
            ✓
          </span>{" "}
          250 test MUSD sent{where === "panel" && f.result.ethTx ? ", plus a little Base Sepolia ETH for gas" : ""}.{" "}
          <a href={links.base(`tx/${f.result.musdTx}`)} target="_blank" rel="noreferrer">
            View transaction ↗
          </a>
          {DEPLOYED && where === "hero" && (
            <>
              {" "}
              <a href="#save">Now save it ↓</a>
            </>
          )}
        </p>
      )}
      {f.error && (
        <p className="faucet__note is-err" role="alert">
          {f.error.message}
        </p>
      )}
    </div>
  );
}

/** Under the hero CTAs on testnet: the three-step recipe, with the faucet button once a wallet can use it. */
export function HeroTry() {
  const ready = useFaucetReady();
  if (NETWORK !== "testnet" || !ready) return null;
  return (
    <div className="try">
      <p className="try__recipe">
        <b>Try it:</b> get test MUSD <i aria-hidden="true">→</i> save{!DEPLOYED && <span className="try__soon"> (opens soon)</span>}{" "}
        <i aria-hidden="true">→</i> watch it cross
      </p>
      <FaucetAction where="hero" />
    </div>
  );
}
