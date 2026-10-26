import { BRAND } from "@/lib/config";
import { Icon, type IconName } from "./Icon";

const STEPS: { verb: string; who: string; icon: IconName; cap: React.ReactNode }[] = [
  {
    verb: "Deposit",
    who: "You, on Base",
    icon: "coin",
    cap: (
      <>
        Save MUSD on Base. You get <span className="nocase">{BRAND.token}</span>, your share of the vault.
      </>
    ),
  },
  {
    verb: "Cross",
    who: "Keeper",
    icon: "bridge",
    cap: <>Most of it crosses to Mezo on Wormhole NTT, MUSD&apos;s own bridge. A buffer stays on Base.</>,
  },
  {
    verb: "Earn",
    who: "Mezo",
    icon: "zap",
    cap: <>On Mezo it earns the MUSD Savings Rate in sMUSD, paid by Bitcoin borrowers.</>,
  },
  {
    verb: "Withdraw",
    who: "You, on Base",
    icon: "repeat",
    cap: <>Small exits are instant from the buffer. Bigger ones are paid in order from Mezo, in minutes.</>,
  },
];

/** Four steps, one card each. */
export function Steps() {
  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s.verb} className="step reveal" style={{ ["--i" as string]: i }}>
          <div className="step__top">
            <span className="step__icon">
              <Icon name={s.icon} size={22} />
            </span>
            <span className="step__idx">0{i + 1}</span>
          </div>
          <h3 className="step__verb">{s.verb}</h3>
          <p className="step__cap">{s.cap}</p>
          <p className="step__who">{s.who}</p>
        </li>
      ))}
    </ol>
  );
}
