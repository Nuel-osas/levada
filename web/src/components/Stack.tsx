import { BRAND } from "@/lib/config";
import { Icon, type IconName } from "./Icon";

const PARTS: { name: string; role: string; body: string; icon: IconName; tone: "warm" | "cool" | "yield" | "ink" }[] = [
  {
    name: "MUSD",
    role: "The asset",
    body: "Mezo's Bitcoin-backed stablecoin. You deposit it on Base; the hub stakes it on Mezo.",
    icon: "coin",
    tone: "warm",
  },
  {
    name: "Wormhole NTT",
    role: "The bridge",
    body: "MUSD's own bridge between Base and Mezo. Levada adds no new bridge trust.",
    icon: "bridge",
    tone: "ink",
  },
  {
    name: "sMUSD",
    role: "The yield",
    body: "Mezo's MUSD Savings Rate, paid by interest on Bitcoin-backed loans. Levada creates demand for it.",
    icon: "zap",
    tone: "yield",
  },
  {
    name: BRAND.token,
    role: "The output",
    body: "A standard ERC-4626 token on Base, ready for lending markets, DEX pools and other vaults.",
    icon: "layers",
    tone: "cool",
  },
];

/** The Mezo building blocks Levada composes, left to right in the order money moves. */
export function Stack() {
  return (
    <ol className="stack">
      {PARTS.map((p, i) => (
        <li key={p.name} className={`stack__card stack__card--${p.tone} reveal`} style={{ ["--i" as string]: i }}>
          <span className="stack__icon">
            <Icon name={p.icon} size={22} />
          </span>
          <p className="stack__role">{p.role}</p>
          <h3 className="stack__name">{p.name}</h3>
          <p className="stack__body">{p.body}</p>
          {i < PARTS.length - 1 && (
            <span className="stack__arrow" aria-hidden="true">
              <Icon name="arrow" size={16} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
