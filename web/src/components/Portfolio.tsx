"use client";

import { useState } from "react";
import Link from "next/link";
import { BaseError, type Hash } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BRAND, DEPLOYED, addresses, baseChain, chainNames, links } from "@/lib/config";
import { vaultAbi } from "@/lib/abis";
import { fmt, fmtMusd, fmtPct, shortAddr, toNum } from "@/lib/format";
import { useExits, useSavings, type ExitView } from "@/lib/hooks";
import { Exits } from "./Exits";
import { Odometer } from "./Odometer";

type Note = { tone: "ok" | "err"; text: string; hash?: Hash };

/** The connected wallet's position: live value, earnings rate, what can leave now, and queued exits. */
export function Portfolio() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const client = usePublicClient({ chainId: baseChain.id });
  const { writeContractAsync } = useWriteContract();
  const s = useSavings();
  const { vault } = s;
  const { exits, refetch } = useExits();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>();

  const pos = s.pos ?? 0;
  const perYear = pos * (s.rate ?? 0);
  const supply = toNum(vault.totalSupply) ?? 0;
  const share = supply > 0 && vault.shares ? (toNum(vault.shares)! / supply) * 100 : 0;
  const open = exits.filter((e) => !e.paid);

  async function claim(e: ExitView) {
    setBusy(true);
    setNote(undefined);
    try {
      const hash = await writeContractAsync({ chainId: baseChain.id, address: addresses.vault!, abi: vaultAbi, functionName: "claimExit", args: [e.id] });
      await client!.waitForTransactionReceipt({ hash });
      setNote({ tone: "ok", text: `${fmtMusd(e.assets)} MUSD paid to your wallet.`, hash });
      await Promise.all([vault.refetch(), refetch()]);
    } catch (err) {
      const msg = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      setNote({ tone: "err", text: /reject|denied/i.test(msg) ? "You cancelled in your wallet." : msg });
    } finally {
      setBusy(false);
    }
  }

  const head = (
    <header className="apphead">
      <p className="eyebrow">Portfolio</p>
      <h1 className="apphead__title">
        Your <em>savings</em>
      </h1>
      {address && (
        <p className="apphead__sub">
          <span className="live-dot" aria-hidden="true" /> {shortAddr(address)} on {chainNames.base} ·{" "}
          <a href={links.base(`address/${address}`)} target="_blank" rel="noreferrer">
            Explorer ↗
          </a>
        </p>
      )}
    </header>
  );

  if (!address)
    return (
      <>
        {head}
        <div className="empty">
          <p className="empty__title">Connect a wallet to see your position.</p>
          <p className="empty__body">
            Your savings, what they earn every second, what you can withdraw instantly, and every withdrawal on its way
            back from Mezo.
          </p>
          <button className="btn-primary" type="button" onClick={openConnectModal}>
            Connect wallet
          </button>
        </div>
      </>
    );

  if (!DEPLOYED)
    return (
      <>
        {head}
        <div className="empty">
          <span className="chip">Opens soon</span>
          <p className="empty__title">The vault isn&apos;t live yet.</p>
          <p className="empty__body">
            Levada&apos;s vault is being deployed to {chainNames.base}, with its hub on {chainNames.mezo}. Once it&apos;s
            live, your position shows up here the moment you save.
          </p>
          <Link className="btn-primary" href="/app">
            Go to Save
          </Link>
        </div>
      </>
    );

  return (
    <>
      {head}
      <section className="pf">
        <div className="pf__hero">
          <p className="pf__label">Your savings · live estimate</p>
          <div className="pf__value">
            <Odometer value={s.mode === "mine" ? s.mine : 0} label="Your savings, about" className="odo--xl" />
            <span className="pf__unit">MUSD</span>
          </div>
          <p className="pf__sub">
            {fmtMusd(vault.shares, 4)} <span className="t-token">{BRAND.token}</span>, valued by the vault and ticking at
            about <b className="t-yield">{fmtPct(s.rate === undefined ? undefined : s.rate * 100)}</b> a year after fees.
          </p>
          <div className="pf__actions">
            <Link className="btn-primary" href="/app">
              Save more
            </Link>
            <Link className="btn-ghost" href="/app#withdraw">
              Withdraw
            </Link>
          </div>
        </div>

        <dl className="pf__grid">
          <div>
            <dt>Earning per year</dt>
            <dd className="t-yield">+{fmt(perYear)} MUSD</dd>
          </div>
          <div>
            <dt>Earning per day</dt>
            <dd>+{fmt(perYear / 365, 4)} MUSD</dd>
          </div>
          <div>
            <dt>Withdraw instantly</dt>
            <dd>{fmtMusd(vault.maxWithdraw)} MUSD</dd>
          </div>
          <div>
            <dt>On the way to you</dt>
            <dd>{fmtMusd(vault.owed)} MUSD</dd>
          </div>
          <div>
            <dt>MUSD in your wallet</dt>
            <dd>{fmtMusd(vault.walletMusd)}</dd>
          </div>
          <div>
            <dt>Your share of the vault</dt>
            <dd>{share ? `${share.toFixed(share < 1 ? 4 : 2)}%` : "–"}</dd>
          </div>
        </dl>
      </section>

      <section className="pf__exits">
        <div className="pf__exits-head">
          <h2 className="pf__h2">Withdrawals</h2>
          <span className="t-muted">{open.length ? `${open.length} on the way` : "None on the way"}</span>
        </div>
        {note && (
          <p className={`panel__note is-${note.tone}`} role={note.tone === "err" ? "alert" : "status"}>
            {note.text}{" "}
            {note.hash && (
              <a href={links.base(`tx/${note.hash}`)} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>
            )}
          </p>
        )}
        {exits.length ? (
          <Exits exits={exits} onClaim={claim} busy={busy} />
        ) : (
          <p className="pf__none">
            Withdrawals larger than the Base buffer are queued and paid from Mezo in order. They show up here with a live
            timeline until they land in your wallet.
          </p>
        )}
      </section>
    </>
  );
}
