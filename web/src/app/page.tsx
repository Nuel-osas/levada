import Link from "next/link";
import { Balance } from "@/components/Balance";
import { Experience } from "@/components/Experience";
import { FillLine } from "@/components/FillLine";
import { Flow } from "@/components/Flow";
import { HeroCanvas } from "@/components/HeroCanvas";
import { HeroStats } from "@/components/HeroCard";
import { RateSource } from "@/components/HeroRate";
import { Lockup, Mark } from "@/components/Lockup";
import { Marquee } from "@/components/Marquee";
import { MobileBar } from "@/components/MobileBar";
import { Preloader } from "@/components/Preloader";
import { Questions } from "@/components/Questions";
import { Stack } from "@/components/Stack";
import { Steps } from "@/components/Steps";
import { Token, TokenPair } from "@/components/Token";
import { Trust } from "@/components/Trust";
import { BRAND, NETWORK, addresses, chainNames, links, mezoLinks } from "@/lib/config";

export const revalidate = 600;

/** A heading whose lines rise out of a mask, one after another, when it enters the screen. */
function Lines({ lines, className, as: Tag = "h2", id }: { lines: React.ReactNode[]; className?: string; as?: "h1" | "h2"; id?: string }) {
  return (
    <Tag id={id} className={`lines ${className ?? ""}`}>
      {lines.map((l, i) => (
        <span key={i} className="line">
          <span style={{ ["--i" as string]: i }}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export default function Home() {
  return (
    <>
      <Preloader />
      <a className="skip" href="#save">
        Skip to Save
      </a>
      <div className="grain" aria-hidden="true" />

      <header className="top">
        <div className="top__in">
          <a className="top__brand" href="#top" aria-label="Levada, back to top">
            <Lockup size={30} />
          </a>
          <nav className="top__nav" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#stack">Built on Mezo</a>
            <a href="#proof">Security</a>
            <a href="#questions">FAQ</a>
            <Link href="/status">Status</Link>
          </nav>
          <div className="top__right">
            {NETWORK === "testnet" && <span className="chip chip--sm">Testnet</span>}
            <Link className="btn-launch" href="/app" data-cursor="Open">
              Launch app <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <HeroCanvas />
          <div className="hero__fade" aria-hidden="true" />
          <div className="hero__in">
            <p className="hero__kicker">
              <span className="live-dot" aria-hidden="true" /> Built on <Token name="mezo" size={18} /> Mezo · Live on <Token name="base" size={18} /> {chainNames.base}
            </p>
            <h1 id="hero-title" className="hero__title">
              <span className="line">
                <span style={{ ["--i" as string]: 0 }}>Mezo&apos;s savings</span>
              </span>
              <span className="line">
                <span style={{ ["--i" as string]: 1 }}>
                  rate, <em>now on</em>
                </span>
              </span>
              <span className="line">
                <span style={{ ["--i" as string]: 2 }}>Base.</span>
              </span>
            </h1>
            <div className="hero__foot">
              <div className="hero__copy">
                <p className="hero__lede">
                  Deposit MUSD on Base. Earn yield paid by Bitcoin borrowers on Mezo. One signature, no bridging by hand,
                  no BTC for gas. Withdraw any time.
                </p>
                <div className="hero__actions" id="hero-actions">
                  <Link className="btn-round" href="/app" data-magnetic data-cursor="Open">
                    <span>Launch app</span>
                  </Link>
                  <a className="btn-line" href="#how">
                    How it works <span aria-hidden="true">↓</span>
                  </a>
                </div>
              </div>
              <HeroStats />
            </div>
            <p className="hero__source">
              <RateSource />
            </p>
          </div>
        </section>

        <Marquee />

        <FillLine />

        <Flow />

        <section className="save-sec" id="save" aria-labelledby="save-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Save</p>
              <Lines id="save-title" className="h2" lines={[<>Put idle MUSD</>, <>to <em>work.</em></>]} />
            </header>
            <div className="save">
              <div className="save__balance reveal">
                <Balance />
              </div>
              <div className="save__cta reveal" style={{ ["--i" as string]: 1 }}>
                <p className="save__cta-k">The Levada app</p>
                <p className="save__cta-title">
                  Save, withdraw and track it all in <em>one place.</em>
                </p>
                <ul className="save__cta-list">
                  <li><TokenPair a="musd" b="base" size={20} /> Deposit MUSD on {chainNames.base} in one signature</li>
                  <li><Token name="lsmusd" size={20} /> Watch your savings tick up every second</li>
                  <li><Token name="wormhole" size={20} /> Follow every withdrawal home from Mezo</li>
                </ul>
                <div className="save__cta-actions">
                  <Link className="btn-round" href="/app" data-magnetic data-cursor="Open">
                    <span>Launch app</span>
                  </Link>
                  <Link className="btn-line" href="/portfolio">
                    View portfolio →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="how" aria-labelledby="how-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">How it works</p>
              <Lines id="how-title" className="h2" lines={[<>You save and withdraw.</>, <><em>A keeper</em> does the rest.</>]} />
            </header>
            <Steps />
          </div>
        </section>

        <section id="stack" aria-labelledby="stack-title">
          <Stack />
        </section>

        <section className="sec" id="proof" aria-labelledby="proof-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Security</p>
              <Lines id="proof-title" className="h2" lines={[<>Don&apos;t trust the page.</>, <><em>Check</em> the contracts.</>]} />
            </header>
            <Trust />
          </div>
        </section>

        <section className="sec" id="questions" aria-labelledby="q-title">
          <div className="container faq">
            <header className="section-head faq__head">
              <p className="eyebrow">FAQ</p>
              <Lines id="q-title" className="h2" lines={[<>Fair questions,</>, <><em>short</em> answers.</>]} />
            </header>
            <div className="reveal">
              <Questions />
            </div>
          </div>
        </section>
      </main>

      <footer className="foot" aria-labelledby="cta-title">
        <div className="foot__glow" aria-hidden="true" />
        <div className="container">
          <div className="foot__cta">
            <Lines id="cta-title" className="foot__title" lines={[<>Every MUSD on Base,</>, <><em>earning</em> Mezo&apos;s rate.</>]} />
            <Link className="btn-round btn-round--lg" href="/app" data-magnetic data-cursor="Open">
              <span>Launch app</span>
            </Link>
          </div>
          <div className="foot__built" aria-label="Built with">
            <p className="foot__h">Built with</p>
            <ul>
              <li><Token name="mezo" size={28} /> Mezo</li>
              <li><Token name="musd" size={28} /> MUSD</li>
              <li><Token name="smusd" size={28} /> sMUSD</li>
              <li><Token name="base" size={28} /> Base</li>
              <li><Token name="wormhole" size={28} /> Wormhole NTT</li>
              <li><Token name="btc" size={28} /> Bitcoin collateral</li>
            </ul>
          </div>
          <nav className="foot__cols" aria-label="Footer">
            <div>
              <p className="foot__h">Contracts</p>
              {addresses.vault ? (
                <a href={links.base(`address/${addresses.vault}`)} target="_blank" rel="noreferrer">
                  Vault on {chainNames.base} ↗
                </a>
              ) : (
                <span>Vault on {chainNames.base}: soon</span>
              )}
              {addresses.hub ? (
                <a href={links.mezo(`address/${addresses.hub}`)} target="_blank" rel="noreferrer">
                  Hub on {chainNames.mezo} ↗
                </a>
              ) : (
                <span>Hub on {chainNames.mezo}: soon</span>
              )}
              <a href={links.mezo(`address/${addresses.savings}`)} target="_blank" rel="noreferrer">
                Mezo sMUSD ↗
              </a>
            </div>
            <div>
              <p className="foot__h">Mezo</p>
              <a href={mezoLinks.savingsVault} target="_blank" rel="noreferrer">
                MUSD Savings Vault ↗
              </a>
              <a href={mezoLinks.borrow} target="_blank" rel="noreferrer">
                Borrow MUSD ↗
              </a>
              {mezoLinks.faucet && (
                <a href={mezoLinks.faucet} target="_blank" rel="noreferrer">
                  Testnet faucet ↗
                </a>
              )}
            </div>
            <div>
              <p className="foot__h">Data</p>
              <a href={links.defillama} target="_blank" rel="noreferrer">
                Rate and prices: DefiLlama ↗
              </a>
              <a href="/api/market" target="_blank" rel="noreferrer">
                Live figures: /api/market ↗
              </a>
              <a href={`https://wormholescan.io/${NETWORK === "testnet" ? "?network=Testnet" : ""}`} target="_blank" rel="noreferrer">
                Bridge: Wormholescan ↗
              </a>
            </div>
            <div>
              <p className="foot__h">Levada</p>
              <Link href="/app">App</Link>
              <Link href="/portfolio">Portfolio</Link>
              <a href="https://github.com/Nuel-osas/levada" target="_blank" rel="noreferrer">
                Code on GitHub ↗
              </a>
              <Link href="/status">Status</Link>
              <a href="#proof">Security</a>
              <a href="#questions">FAQ</a>
            </div>
          </nav>
        </div>
        <div className="foot__word" aria-hidden="true">
          <Mark size={220} className="foot__mark" />
          <span>levada</span>
        </div>
        <div className="container foot__base">
          <span>{BRAND.tagline} Built for the Mezo Buildathon on AKINDO.</span>
          <span>
            {NETWORK === "testnet" && "Testnet only: test MUSD has no value. "}Not affiliated with Mezo, Base or Wormhole.
          </span>
        </div>
      </footer>

      <MobileBar />
      <Experience />
    </>
  );
}
