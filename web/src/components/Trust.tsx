import { DEPLOYED, addresses, chainNames, links } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

type Proof = { label: string; href?: string; address?: string | null };

const vault: Proof = { label: `LevadaVault on ${chainNames.base}`, address: addresses.vault, href: addresses.vault ? links.base(`address/${addresses.vault}`) : undefined };
const hub: Proof = { label: `LevadaHub on ${chainNames.mezo}`, address: addresses.hub, href: addresses.hub ? links.mezo(`address/${addresses.hub}`) : undefined };

const ROWS: { icon: IconName; title: string; proof: string; links: Proof[] }[] = [
  {
    icon: "unlock",
    title: "Withdrawals can't be paused",
    proof: "The owners can pause new deposits, cap them, size the buffer and set a fee of at most 20% of yield. No one can move your money or block an exit.",
    links: [vault],
  },
  {
    icon: "contracts",
    title: "Two contracts, no upgrades",
    proof: "One vault on Base and one hub on Mezo, under 800 lines with no proxies. Every step is open to anyone; the keeper only pays gas.",
    links: [vault, hub],
  },
  {
    icon: "coin",
    title: "Yield from Mezo's savings rate",
    proof: "The hub holds sMUSD, Mezo's MUSD Savings Rate. Each report's gain is capped at 50% APR and released over 12 hours.",
    links: [{ label: `sMUSD on ${chainNames.mezo}`, address: addresses.savings, href: links.mezo(`address/${addresses.savings}`) }],
  },
  {
    icon: "bridge",
    title: "Bridged by Wormhole NTT",
    proof: "MUSD's own bridge. 13 of Wormhole's 19 guardians sign every message, and transfers are rate-limited.",
    links: [
      { label: `MUSD bridge on ${chainNames.base}`, address: addresses.baseNtt, href: links.base(`address/${addresses.baseNtt}`) },
      { label: `MUSD bridge on ${chainNames.mezo}`, address: addresses.mezoNtt, href: links.mezo(`address/${addresses.mezoNtt}`) },
    ],
  },
  {
    icon: "review",
    title: "Reviewed, every fix tested",
    proof: "An AI-assisted adversarial review found 2 high, 1 medium and 8 low issues. All are fixed, each with a regression test.",
    links: [],
  },
];

/** Five plain statements, each with its proof: the contract it rests on, on the explorer. */
export function Trust() {
  return (
    <ul className="trust">
      {ROWS.map((r, i) => (
        <li key={r.title} className="trust__card reveal" style={{ ["--i" as string]: i % 3 }}>
          <span className="trust__icon">
            <Icon name={r.icon} size={22} />
          </span>
          <h3 className="trust__title">{r.title}</h3>
          <p className="trust__proof">{r.proof}</p>
          {r.links.length > 0 && (
            <p className="trust__links">
              {r.links.map((l) =>
                l.href ? (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                    {l.label} <span className="mono">{shortAddr(l.address ?? "")}</span> ↗
                  </a>
                ) : (
                  <span key={l.label} className="trust__pending">
                    {l.label}: {DEPLOYED ? "–" : "address published at launch"}
                  </span>
                ),
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
