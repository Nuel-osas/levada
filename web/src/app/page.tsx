import Link from "next/link";
import { Balance } from "@/components/Balance";
import { Connect } from "@/components/Connect";
import { HeroTry } from "@/components/Faucet";
import { FillLine } from "@/components/FillLine";
import { Flow } from "@/components/Flow";
import { HeroCard } from "@/components/HeroCard";
import { RateSource } from "@/components/HeroRate";
import { Icon } from "@/components/Icon";
import { Lockup } from "@/components/Lockup";
import { MezoStrip } from "@/components/MezoStrip";
import { MobileBar } from "@/components/MobileBar";
import { Questions } from "@/components/Questions";
import { Reveal } from "@/components/Reveal";
import { SavePanel } from "@/components/SavePanel";
import { Stack } from "@/components/Stack";
import { Steps } from "@/components/Steps";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trust } from "@/components/Trust";
import { BRAND, NETWORK, addresses, chainNames, links, mezoLinks } from "@/lib/config";

export const revalidate = 600;

export default function Home() {
  return (
    <>
      <a className="skip" href="#save">
        Skip to Save
      </a>

      <header className="top">
        <div className="container top__in">
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
            <ThemeToggle />
            <Connect />
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__bg" aria-hidden="true" />
          <div className="container hero__in">
            <div className="hero__copy">
              <p className="pill">
                <span className="pill__dot" aria-hidden="true" />
                Built on Mezo · Live on {chainNames.base}
              </p>
              <h1 id="hero-title" className="hero__title">
                Mezo&apos;s savings rate, <span className="t-grad">now on Base.</span>
              </h1>
              <p className="hero__lede">
                Deposit MUSD on Base and earn yield paid by Bitcoin borrowers. One deposit, no bridging by hand, no BTC
                for gas. Withdraw any time.
              </p>
              <div className="hero__actions" id="hero-actions">
                <a className="btn-primary" href="#save">
                  Start saving <Icon name="arrow" size={18} />
                </a>
                <a className="btn-ghost" href="#how">
                  How it works
                </a>
              </div>
              <HeroTry />
              <p className="hero__source">
                <RateSource />
              </p>
            </div>
            <HeroCard />
          </div>
          <MezoStrip />
        </section>

        <Flow />

        <FillLine />

        <section className="save-sec" id="save" aria-labelledby="save-title">
          <div className="container">
            <header className="section-head section-head--center reveal">
              <p className="eyebrow">Save</p>
              <h2 id="save-title" className="h2">
                Put idle MUSD to work. <span className="t-muted">Take it back whenever.</span>
              </h2>
            </header>
            <div className="save">
              <div className="save__balance card reveal">
                <Balance />
              </div>
              <div className="save__panel reveal" style={{ ["--i" as string]: 1 }}>
                <SavePanel />
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="how" aria-labelledby="how-title">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">How it works</p>
              <h2 id="how-title" className="h2">
                You save and withdraw. <span className="t-muted">A keeper does the rest.</span>
              </h2>
              <p className="section-head__lede">
                Every keeper step is permissionless. Anyone can run it, and it only ever pays gas.
              </p>
            </header>
            <Steps />
          </div>
        </section>

        <section className="sec sec--soft" id="stack" aria-labelledby="stack-title">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">Built on Mezo</p>
              <h2 id="stack-title" className="h2">
                Made from Mezo&apos;s own parts. <span className="t-muted">Ready for the rest of DeFi.</span>
              </h2>
              <p className="section-head__lede">
                Levada doesn&apos;t compete with Mezo. It extends the MUSD Savings Rate to every MUSD holder on Base, and
                hands back a token other protocols can build on.
              </p>
            </header>
            <Stack />
          </div>
        </section>

        <section className="sec" id="proof" aria-labelledby="proof-title">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">Security</p>
              <h2 id="proof-title" className="h2">
                Don&apos;t trust the page. <span className="t-muted">Check the contracts.</span>
              </h2>
            </header>
            <Trust />
          </div>
        </section>

        <section className="sec sec--soft" id="questions" aria-labelledby="q-title">
          <div className="container faq">
            <header className="section-head faq__head reveal">
              <p className="eyebrow">FAQ</p>
              <h2 id="q-title" className="h2">
                Fair questions, short answers.
              </h2>
              <p className="section-head__lede">
                Something else? Every figure on this page is read live. See the <Link href="/status">status page</Link>.
              </p>
            </header>
            <div className="reveal">
              <Questions />
            </div>
          </div>
        </section>

        <section className="cta-sec" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta" data-theme="dark">
              <div className="cta__glow" aria-hidden="true" />
              <h2 id="cta-title" className="cta__title">
                Every MUSD on Base, <span className="t-grad">earning Mezo&apos;s rate.</span>
              </h2>
              <p className="cta__lede">One deposit. Yield from Bitcoin borrowers. Withdraw any time.</p>
              <div className="hero__actions">
                <a className="btn-primary" href="#save">
                  Start saving <Icon name="arrow" size={18} />
                </a>
                <a className="btn-ghost" href="https://github.com/Nuel-osas/levada" target="_blank" rel="noreferrer">
                  Read the code ↗
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <div className="foot__brand">
            <Lockup size={30} />
            <p>{BRAND.tagline}</p>
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
              <p className="foot__h">Page</p>
              <a href="#how">How it works</a>
              <a href="#proof">Security</a>
              <a href="#questions">FAQ</a>
              <Link href="/status">Status</Link>
            </div>
          </nav>
        </div>
        <div className="container foot__base">
          <span>
            Built for the Mezo Buildathon on AKINDO.{NETWORK === "testnet" && " Testnet only: test MUSD has no value."}
          </span>
          <span>Not affiliated with Mezo, Base or Wormhole.</span>
        </div>
      </footer>

      <MobileBar />
      <Reveal />
    </>
  );
}
