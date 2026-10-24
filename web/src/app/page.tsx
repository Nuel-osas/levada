import { Balance } from "@/components/Balance";
import { Connect } from "@/components/Connect";
import { Flow } from "@/components/Flow";
import { RateChip, RateSource } from "@/components/HeroRate";
import { Lockup } from "@/components/Lockup";
import { MobileBar } from "@/components/MobileBar";
import { Questions } from "@/components/Questions";
import { Reveal } from "@/components/Reveal";
import { SavePanel } from "@/components/SavePanel";
import { Scene } from "@/components/Scene";
import { SceneLegend } from "@/components/SceneHud";
import { Steps } from "@/components/Steps";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trust } from "@/components/Trust";
import { BRAND, NETWORK, addresses, chainNames, links } from "@/lib/config";

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
            <Lockup />
          </a>
          <nav className="top__nav" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#questions">Questions</a>
            <a href="#proof">Proof</a>
          </nav>
          <div className="top__right">
            {NETWORK === "testnet" && <span className="chip chip--sm">Testnet</span>}
            <ThemeToggle />
            <Connect />
          </div>
        </div>
      </header>

      <main id="top">
        {/* One full-bleed sea under the header, the headline and the diorama: day in light mode, night in dark. */}
        <div className="band">
          <section className="hero" aria-labelledby="hero-title">
            <div className="container hero__copy">
              <h1 id="hero-title" className="hero__title">
                <span className="t-warm">
                  Mezo&apos;s savings rate <RateChip />,
                </span>
                <br />
                <span className="t-cool">on Base.</span>
              </h1>
              <p className="hero__lede">
                Deposit MUSD on Base. It earns Mezo&apos;s savings rate, paid by Bitcoin borrowers. No bridging by hand,
                no BTC for gas, withdraw any time.
              </p>
              <div className="hero__actions" id="hero-actions">
                <a className="btn-primary" href="#save">
                  <span className="btn-primary__label" data-label="Save MUSD">
                    Save MUSD
                  </span>
                </a>
                <a className="btn-link" href="#how">
                  How it works <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className="hero__source">
                <RateSource />
              </p>
            </div>
            <Scene />
            <div className="container">
              <SceneLegend />
            </div>
          </section>
          <div className="dither dither--bottom" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>

        <Flow />

        <section className="save container" id="save" aria-labelledby="save-title">
          <h2 id="save-title" className="sr-only">
            Save and withdraw
          </h2>
          <div className="save__balance reveal">
            <Balance />
          </div>
          <div className="save__panel reveal" style={{ ["--i" as string]: 1 }}>
            <SavePanel />
          </div>
        </section>

        <section className="how" id="how" aria-labelledby="how-title">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">How it works</p>
              <h2 id="how-title" className="h2">
                You save and withdraw. <span className="t-muted">A keeper does the rest.</span>
              </h2>
            </header>
            <Steps />
          </div>
        </section>

        <section className="questions" id="questions" aria-labelledby="q-title" data-theme="dark">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">Questions</p>
              <h2 id="q-title" className="h2">
                Fair questions, short answers.
              </h2>
            </header>
            <div className="reveal">
              <Questions />
            </div>
          </div>
        </section>

        <section className="proof" id="proof" aria-labelledby="proof-title">
          <div className="container">
            <header className="section-head reveal">
              <p className="eyebrow">Proof</p>
              <h2 id="proof-title" className="h2">
                Don&apos;t trust the page. <span className="t-muted">Check the contracts.</span>
              </h2>
            </header>
            <Trust />
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <div className="foot__brand">
            <Lockup scale={2} />
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
              <p className="foot__h">Data</p>
              <a href={links.defillama} target="_blank" rel="noreferrer">
                Rate: DefiLlama ↗
              </a>
              <a href={`https://wormholescan.io/${NETWORK === "testnet" ? "?network=Testnet" : ""}`} target="_blank" rel="noreferrer">
                Bridge: Wormholescan ↗
              </a>
            </div>
            <div>
              <p className="foot__h">Page</p>
              <a href="#how">How it works</a>
              <a href="#questions">Questions</a>
              <a href="#proof">Proof</a>
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
