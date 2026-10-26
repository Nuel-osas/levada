# AKINDO submission: Levada (Wave 1)

Copy each field into the AKINDO form. Replace every `TODO` before submitting.

---

## Project name

Levada

## Project category (3–5 words)

Cross-chain MUSD yield vault

## TL;DR

Levada lets anyone holding MUSD on Base earn Mezo's MUSD Savings Rate in one deposit: it bridges the MUSD to Mezo over Wormhole NTT, stakes it in sMUSD, and streams the yield back to Base as a growing savings token, lsMUSD.

## How it works

**The problem.** About 1M MUSD sits on Base and 600k on Ethereum. Since the Aero migration paused MEZO incentives on Base (Oct 22, 2026), that MUSD earns close to nothing. The best native yield for MUSD, Mezo's MUSD Savings Rate (sMUSD), paid by interest on Bitcoin-backed loans, only exists on Mezo. Reaching it today takes a bridge screen, BTC for gas on Mezo, a separate deposit, and the same trip in reverse to exit. Most holders on Base never do it.

**What Levada does.** It turns that multi-step, two-chain journey into one deposit on Base.

1. **Deposit on Base.** The user deposits MUSD into `LevadaVault`, an ERC-4626 vault, and receives lsMUSD. A buffer stays on Base so small withdrawals are instant.
2. **Bridge automatically.** MUSD above the buffer crosses to Mezo on Wormhole NTT, the same bridge MUSD itself uses. Levada adds no new bridge trust.
3. **Earn on Mezo.** `LevadaHub` on Mezo deposits into sMUSD and compounds the yield.
4. **Yield comes home.** The hub sends signed yield reports back over Wormhole. Each report's gain is released into the lsMUSD share price over 12 hours, which also blocks just-in-time yield theft.
5. **Withdraw any time.** Small exits come from the Base buffer instantly. Larger exits are released from Mezo and paid on Base in first-in-first-out order.

A keeper relays messages and pays out queued exits. Every keeper action is permissionless: anyone can run it, and it only pays gas.

**How we use and position MUSD/MEZO.** Levada is a composability layer for MUSD, not a standalone app:

- **Deep integration, both chains.** MUSD is the deposit asset on Base, the bridged asset over MUSD's own Wormhole NTT managers, and the staked asset in Mezo's sMUSD. lsMUSD is a staking derivative of sMUSD that lives on Base.
- **Extends an existing Mezo product.** It brings sMUSD, Mezo's own savings rate, to every MUSD holder on Base, instead of building a competing yield source.
- **Creates sMUSD demand.** Idle MUSD on Base becomes sMUSD deposits on Mezo, which supports MUSD's peg and Mezo's borrowing market.
- **Composable output.** lsMUSD is a standard ERC-4626 token, so it can plug into Base DeFi: lending markets as collateral, DEX pools, and vaults. Listing it as Morpho collateral is on our roadmap.

**Security.** Two immutable contracts, under 800 lines, no proxies. The owner can pause new deposits, set the deposit cap and buffer, and set a fee of at most 20% of yield; it cannot move funds or block withdrawals. An independent adversarial review found 2 high, 1 medium and 8 low issues; all are fixed, each with a regression test. 38 Foundry tests cover solvency, no double counting, donation resistance, and that every queued exit completes (2,000-run invariant). Fork tests run against the live NTT managers and sMUSD. Details: `SECURITY.md`.

## Target group

- **Who:** MUSD holders on Base, from retail savers to DAOs and treasuries holding stablecoins on Base, who want Bitcoin-backed yield without managing a second chain.
- **Experience level:** beginner to intermediate. No bridging, no BTC for gas, no claiming on Mezo.
- **Region:** global, wherever Base is used.
- **Device:** desktop and mobile web; wallet connection via RainbowKit (MetaMask, Coinbase Wallet, WalletConnect and others).
- **Track fit:** Track 1 (DeFi): a yield vault and staking derivative for MUSD on another chain, two of the track's example projects. Track 2 (Access and Distribution): it meets MUSD holders where they already are, on Base, and makes Mezo's savings rate one click away.

## Tech stack

- **Contracts:** Solidity, Foundry (unit, fuzz, invariant and fork tests), OpenZeppelin (ERC-4626, ReentrancyGuard)
- **Cross-chain:** Wormhole NTT (MUSD's official bridge), Wormhole VAAs for authenticated messages
- **Mezo:** MUSD, sMUSD (MUSD Savings Rate)
- **Keeper:** TypeScript, viem; runs every 5 minutes on GitHub Actions; permissionless
- **Web:** Next.js 15, React 19, wagmi, viem, RainbowKit; live data from DefiLlama and Base RPC

## Track

Track 1 (DeFi) and Track 2 (Access and Distribution)

## Chain deployed on

Mezo (testnet) and Base (Base Sepolia)

## Project status

Entirely new, built during the hackathon.

## Project readiness

Testnet deployment: `LevadaVault` on Base Sepolia, `LevadaHub` on Mezo testnet.

- Vault (Base Sepolia): `TODO 0x…` (https://sepolia.basescan.org/address/TODO)
- Hub (Mezo testnet): `TODO 0x…` (https://explorer.test.mezo.org/address/TODO)
- Live app: `TODO https://…vercel.app`
- GitHub: https://github.com/Nuel-osas/levada
- Deck: `TODO link`
- Video: `TODO link`

## Future milestones

1. **Wave 2 (Nov 2–15, 2026): Mainnet with a deposit cap, and lsMUSD as collateral on Base.** Deploy to Base and Mezo mainnet with a conservative cap, and work toward listing lsMUSD as collateral on a Base lending market (Morpho), so savers can borrow against Mezo yield without leaving Base.
2. **Wave 2: One-click routes in.** A USDC route that buys MUSD below peg on Aerodrome and deposits it into Levada in one flow, and a BTC route that borrows MUSD on Mezo against BTC and sends it to Base, with LTV monitoring.
3. **Q1 2027: Ethereum spoke.** Extend the same vault to Ethereum for the ~600k MUSD there, so every chain MUSD lives on can earn Mezo's savings rate.

## Team info

- `TODO Name`: `TODO role` (smart contracts, keeper, web): `TODO X or LinkedIn`
