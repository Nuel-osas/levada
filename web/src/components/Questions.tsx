"use client";

import { useState, type ReactNode } from "react";
import { DEPLOYED, mezoLinks } from "@/lib/config";
import { fmtPct, fmtShort, toNum } from "@/lib/format";
import { useApy, useFlows, useHub, useVault } from "@/lib/hooks";
import { PixelIcon, type GlyphName } from "./PixelIcon";

type Item = { q: string; icon: GlyphName; a: ReactNode; note: string; links?: { label: string; href: string }[] };

/** The questions a first-time visitor actually has, each answered in one line. */
export function Questions() {
  const apy = useApy();
  const vault = useVault();
  const hub = useHub();
  const flows = useFlows(vault, hub);
  const [open, setOpen] = useState(0);

  const onMezo = toNum(flows?.onMezo) ?? 0;
  const buffer = toNum(flows?.buffer) ?? 0;
  const total = onMezo + buffer + (toNum(flows?.crossing) ?? 0);
  const live = DEPLOYED && total > 0;

  const items: Item[] = [
    {
      q: "Where is my money right now?",
      icon: "pin",
      a: live ? (
        <>
          Right now <mark>{Math.round((onMezo / total) * 100)}%</mark> of it earns on Mezo. The rest waits on Base for
          instant exits.
        </>
      ) : (
        <>
          <mark>Most of it</mark> earns on Mezo. A small buffer waits on Base for instant exits.
        </>
      ),
      note: live ? "Read live from both chains." : "The vault keeps a set share on Base, at most half.",
    },
    {
      q: "Do I ever need to go to Mezo?",
      icon: "home",
      a: (
        <>
          No. Your yield lands on Base. <mark>Nothing to claim on Mezo.</mark>
        </>
      ),
      note: "You only ever sign on Base. The hub on Mezo reports the yield to the vault on Base, where it raises the value of your lsMUSD.",
    },
    {
      q: "Who pays the interest?",
      icon: "coin",
      a: (
        <>
          <mark>Bitcoin borrowers.</mark> They borrow MUSD against BTC on Mezo, and their fees fund Mezo&apos;s savings
          rate: {fmtPct(apy?.apy)} a year today.
        </>
      ),
      note: "Rate: Mezo's sMUSD pool on DefiLlama. It moves with borrowing on Mezo.",
    },
    {
      q: "Can I get it back today?",
      icon: "clock",
      a:
        live && buffer > 0 ? (
          <>
            Yes. Up to <mark>{fmtShort(buffer)} MUSD</mark> comes back instantly. Bigger exits are paid as MUSD returns
            from Mezo.
          </>
        ) : (
          <>
            Yes. Small exits come back <mark>instantly</mark> from the Base buffer. Bigger ones are paid as MUSD returns
            from Mezo.
          </>
        ),
      note: "No lock-up and no notice period. Queued exits usually take minutes.",
    },
    {
      q: "What if the bridge is slow?",
      icon: "hourglass",
      a: (
        <>
          Your amount is <mark>locked in</mark> the moment you ask, so waiting never shrinks it. Exits are paid in order.
        </>
      ),
      note: "Every step is permissionless: if the keeper is slow, anyone can run it.",
    },
    {
      q: "Already on Mezo?",
      icon: "signpost",
      a: (
        <>
          Use Mezo&apos;s own <mark>MUSD Savings Vault</mark>. Levada is for MUSD that lives on Base.
        </>
      ),
      note: "Holding BTC? Borrow MUSD against it on Mezo, then save it there or bring it to Base.",
      links: [
        { label: "MUSD Savings Vault", href: mezoLinks.savingsVault },
        { label: "Borrow MUSD", href: mezoLinks.borrow },
        ...(mezoLinks.faucet ? [{ label: "Mezo testnet faucet", href: mezoLinks.faucet }] : []),
      ],
    },
  ];

  return (
    <div className="qa" style={{ ["--rows" as string]: items.length }}>
      {items.map((it, i) => (
        <div className="qa__item" key={it.q}>
          <button
            type="button"
            className="qa__q"
            id={`q-${i}`}
            aria-expanded={open === i}
            aria-controls={`a-${i}`}
            onClick={() => setOpen(i)}
            style={{ ["--row" as string]: i + 1 }}
          >
            <PixelIcon name={it.icon} scale={2} className="qa__icon" />
            <span>{it.q}</span>
          </button>
          <div className="qa__a" id={`a-${i}`} role="region" aria-labelledby={`q-${i}`} hidden={open !== i}>
            <p className="qa__big">{it.a}</p>
            <div className="qa__foot">
              {it.links && (
                <p className="qa__links">
                  {it.links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                </p>
              )}
              <p className="qa__note">{it.note}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
