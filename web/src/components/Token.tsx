import { Mark } from "./Lockup";

export type TokenName = "musd" | "smusd" | "lsmusd" | "mezo" | "base" | "wormhole" | "btc";

const SRC: Record<Exclude<TokenName, "lsmusd">, string> = {
  musd: "/tokens/musd.png",
  smusd: "/tokens/musd.png",
  mezo: "/tokens/mezo.svg",
  base: "/tokens/base.png",
  wormhole: "/tokens/wormhole.png",
  btc: "/tokens/btc.png",
};

const ALT: Record<TokenName, string> = {
  musd: "MUSD",
  smusd: "sMUSD",
  lsmusd: "lsMUSD",
  mezo: "Mezo",
  base: "Base",
  wormhole: "Wormhole",
  btc: "Bitcoin",
};

/**
 * A round asset or network logo. sMUSD is MUSD with a mint savings ring; lsMUSD is the Levada mark.
 * Decorative by default (the name is always written next to it); pass `label` to announce it.
 */
export function Token({ name, size = 20, label, className }: { name: TokenName; size?: number | string; label?: boolean; className?: string }) {
  const cls = `tok tok--${name} ${className ?? ""}`;
  const style = { ["--t" as string]: typeof size === "number" ? `${size}px` : size };
  const px = typeof size === "number" ? size : 64;
  if (name === "lsmusd")
    return (
      <span className={cls} style={style} role={label ? "img" : undefined} aria-label={label ? ALT[name] : undefined} aria-hidden={label ? undefined : true}>
        <Mark size={Math.round(px * 0.68)} className="tok__mark" />
      </span>
    );
  return (
    <span className={cls} style={style} aria-hidden={label ? undefined : true}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC[name]} width={px} height={px} alt={label ? ALT[name] : ""} loading="lazy" decoding="async" />
    </span>
  );
}

/** Two logos overlapping, e.g. MUSD on Base. */
export function TokenPair({ a, b, size = 20 }: { a: TokenName; b: TokenName; size?: number }) {
  return (
    <span className="tokpair" style={{ ["--t" as string]: `${size}px` }} aria-hidden="true">
      <Token name={a} size={size} />
      <Token name={b} size={size} />
    </span>
  );
}
