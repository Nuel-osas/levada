# AKINDO submission: Levada (Wave 1)

Paste each field into the AKINDO form. Replace every `TODO` before submitting.

---

## Project name

Levada

## Project category

Cross-chain MUSD yield vault

## TL;DR

Levada lets anyone holding MUSD on Base earn Mezo's MUSD Savings Rate with one deposit: it bridges the MUSD to Mezo over Wormhole NTT, stakes it in sMUSD, and streams the yield back to Base in a growing savings token, lsMUSD.

## How it works

**The problem.** About 1M MUSD sits on Base and 600k on Ethereum. Since the Aero migration paused MEZO incentives on Base (Oct 22, 2026), that MUSD earns close to nothing. MUSD's best native yield, Mezo's MUSD Savings Rate (sMUSD), paid by interest on Bitcoin-backed loans, only exists on Mezo. Reaching it takes a bridge, BTC for gas on Mezo, a separate deposit, and the same trip back to exit. Most holders on Base never make it.

**What Levada does.** It turns that multi-step, two-chain journey into one deposit on Base:

1. **Deposit on Base.** MUSD goes into LevadaVault (ERC-4626) and the user gets lsMUSD. A buffer stays on Base so small withdrawals are instant.
2. **Bridge automatically.** MUSD above the buffer crosses to Mezo on Wormhole NTT, the bridge MUSD itself uses, so Levada adds no new bridge trust.
3. **Earn on Mezo.** LevadaHub deposits into sMUSD and compounds.
4. **Yield comes home.** The hub sends signed yield reports back over Wormhole. Each gain is released into the lsMUSD price over 12 hours, which also blocks just-in-time yield theft.
5. **Withdraw any time.** Small exits are instant from the buffer; larger ones are released from Mezo and paid on Base, first in, first out.

A keeper relays messages and pays out queued exits every 5 minutes. Every keeper action is permissionless: anyone can run it, and it only pays gas.

**How we use and position MUSD.**
- **Deep integration on both chains.** MUSD is the deposit asset on Base, travels over MUSD's own Wormhole NTT managers, and is staked in Mezo's sMUSD. lsMUSD is a staking derivative of sMUSD that lives on Base.
- **Extends an existing Mezo product.** Levada brings sMUSD, Mezo's own savings rate, to every MUSD holder on Base instead of building a competing yield source.
- **Creates sMUSD demand.** Idle MUSD on Base becomes sMUSD deposits on Mezo, which supports MUSD's peg and Mezo's borrowing market.
- **Composable output.** lsMUSD is a standard ERC-4626 token, ready to be collateral in Base lending markets, a leg in DEX pools, or a block in other vaults.

**Security.** Two immutable contracts, under 800 lines, no proxies. The owner can pause new deposits, set the deposit cap and buffer, and set a fee of at most 20% of yield; it cannot move funds or block withdrawals. An adversarial review found 2 high, 1 medium and 8 low issues; all are fixed, each with a regression test. 38 Foundry tests cover solvency, no double counting, donation resistance, and that every queued exit completes (2,000-run invariant), plus fork tests against the live NTT managers and sMUSD.

**The app.** A landing page that explains the flow with live Mezo mainnet figures (sMUSD rate and TVL, MUSD supply on Base); /app to save and withdraw, with a live earnings calculator and a test-MUSD faucet for judges; /portfolio showing a saver's live balance, earnings per day and year, instant-withdraw limit, and every queued withdrawal with a step-by-step timeline (Base → Wormhole guardians → Mezo → paid) and a claim button; and /status with live health checks of both chains, both contracts, the keeper and the data feeds.

## Target group

- **Who:** MUSD holders on Base, from individual savers to DAOs and treasuries holding stablecoins on Base, who want Bitcoin-backed yield without managing a second chain.
- **Experience level:** beginner to intermediate. No bridging, no BTC for gas, nothing to claim on Mezo.
- **Region:** global, wherever Base is used.
- **Device:** desktop and mobile web; any wallet via RainbowKit (MetaMask, Coinbase Wallet, Rabby, WalletConnect).
- **Track fit:** Track 1 (DeFi): a yield vault and a staking derivative for MUSD, plus MUSD integration on another chain. Track 2 (Access and Distribution): it meets MUSD holders where they already are, on Base, and puts Mezo's savings rate one click away.

## Tech stack

- **Contracts:** Solidity, Foundry (unit, fuzz, invariant and fork tests), OpenZeppelin (ERC-4626, ReentrancyGuard)
- **Cross-chain:** Wormhole NTT (MUSD's official bridge), Wormhole VAAs for authenticated messages
- **Mezo:** MUSD, sMUSD (MUSD Savings Rate)
- **Keeper:** TypeScript and viem; runs every 5 minutes on GitHub Actions; permissionless
- **Web:** Next.js 15, React 19, wagmi, viem, RainbowKit, WebGL; live data from DefiLlama and Base RPC; hosted on Vercel

## Track

Track 1 (DeFi) and Track 2 (Access and Distribution)

## Chain deployed on

Mezo (testnet) and Base (Base Sepolia)

## Project status

Entirely new, built during the hackathon.

## Project readiness

Testnet deployment: LevadaVault on Base Sepolia, LevadaHub on Mezo testnet.

- Live app: https://levada-topaz.vercel.app (app: /app · portfolio: /portfolio · status: /status)
- GitHub: https://github.com/Nuel-osas/levada
- Vault (Base Sepolia): `TODO 0x…` https://sepolia.basescan.org/address/TODO
- Hub (Mezo testnet): `TODO 0x…` https://explorer.test.mezo.org/address/TODO
- Deck: `TODO link`
- Video: `TODO link`

## Future milestones

1. **Wave 2 (Nov 2–15, 2026): mainnet with a deposit cap, and lsMUSD as collateral on Base.** Deploy to Base and Mezo mainnet with a conservative cap, and work toward listing lsMUSD as collateral on a Base lending market (Morpho), so savers can borrow against Mezo yield without leaving Base.
2. **Wave 2: one-click routes in.** A USDC route that buys MUSD below peg on Aerodrome and deposits it in one flow, and a BTC route that borrows MUSD on Mezo against BTC and sends it to Base, with LTV monitoring.
3. **Q1 2027: Ethereum spoke.** The same vault on Ethereum for the ~600k MUSD there, so MUSD on every chain it lives on can earn Mezo's savings rate.

## Team info

- `TODO Name`: `TODO role` (smart contracts, keeper, web) · `TODO X or LinkedIn`
