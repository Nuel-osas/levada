# Levada deck (8 slides)

One idea per slide. Use the brand kit in `brand/` (lockup, scene, tokens) for visuals.

---

## 1. Title

**Levada**
Mezo's savings rate, on Base.

*Visual:* the isometric scene (`brand/` or `web/public/scene.svg`) with the lockup.
*Footer:* Mezo Buildathon on AKINDO · Track 1 (DeFi) + Track 2 (Access)

## 2. The problem

**MUSD on Base earns close to nothing.**

- ~1M MUSD on Base, ~600k on Ethereum
- MEZO incentives on Base paused with the Aero migration (Oct 22, 2026)
- The best native MUSD yield, sMUSD, only exists on Mezo
- Getting there: bridge screen → BTC for gas → deposit → and back again to exit

*Visual:* the four manual steps as crossed-out boxes.

## 3. The solution

**One deposit. Two chains. Zero bridge screens.**

Deposit MUSD on Base → get lsMUSD → it grows with Mezo's savings rate → withdraw any time.

*Visual:* the app's Save panel (screenshot).

## 4. How it works

The composed flow, automated end to end:

1. `LevadaVault` (Base, ERC-4626) takes MUSD and mints lsMUSD; keeps a buffer for instant exits
2. MUSD crosses on **Wormhole NTT**, MUSD's own bridge
3. `LevadaHub` (Mezo) deposits into **sMUSD**
4. Signed yield reports come back; gains are released into the share price over 12 h
5. Larger exits are released from Mezo and paid on Base, first in, first out

A permissionless keeper runs every step. Anyone can run it.

*Visual:* the mermaid flow from the README, redrawn.

## 5. Why it's composable

**Levada extends Mezo's products. It doesn't compete with them.**

| Mezo primitive | How Levada uses it |
|---|---|
| MUSD | Deposit asset on Base, staked asset on Mezo |
| Wormhole NTT (MUSD's bridge) | Moves MUSD both ways; no new bridge trust |
| sMUSD (Savings Rate) | The yield source; Levada creates sMUSD demand |
| lsMUSD (new) | ERC-4626 token on Base, ready for lending markets and DEXs |

## 6. Security

**Built to be checked.**

- Two immutable contracts, under 800 lines, no proxies
- Owner cannot move funds or block withdrawals; fee capped at 20% of yield
- Independent adversarial review: 2 high, 1 medium, 8 low. All fixed, each with a regression test
- 38 tests: unit, fuzz, invariants (2,000-run "every exit completes"), fork tests against live NTT and sMUSD

## 7. Live on testnet

- Vault on Base Sepolia: `TODO address`
- Hub on Mezo testnet: `TODO address`
- App: `TODO URL` (judges' faucet gives test MUSD in one click)
- Code: github.com/Nuel-osas/levada

*Visual:* screenshot of the status page (`/status`) showing where every MUSD is.

## 8. Roadmap

| When | Milestone |
|---|---|
| Wave 1 (now) | Full loop live on Mezo testnet + Base Sepolia, audited and fixed |
| Wave 2 | Mainnet with a deposit cap · lsMUSD as Morpho collateral on Base |
| Wave 2 | One-click routes in: USDC (buys MUSD below peg on Aerodrome) and BTC (borrow MUSD on Mezo, send to Base) |
| Q1 2027 | Ethereum spoke for the ~600k MUSD there |

**Every MUSD, on every chain, earning Mezo's rate.**
