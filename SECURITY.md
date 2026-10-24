# Levada security

Levada moves user money between two chains, so it was built to be checked. This file covers:

1. what Levada trusts;
2. what the code guarantees;
3. how the code was reviewed;
4. every finding from that review and how it was fixed.

Code: `contracts/src/LevadaVault.sol` (Base), `contracts/src/LevadaHub.sol` (Mezo) and `contracts/src/libraries/LevadaMessages.sol`. That is under 800 lines in all, with no upgradeability and no proxies.

## What Levada trusts

| Dependency | Why it is trusted | If it fails |
|---|---|---|
| **Wormhole guardians** (13 of 19 must sign) | MUSD itself crosses Base ⇄ Mezo on Wormhole NTT; Levada adds no new bridge trust. | Funds can stop moving. A forged message could only report profit at a rate-limited pace that is released over 12 hours. |
| **Mezo's MUSD Savings Rate (sMUSD)** | It is the yield source. It is an upgradeable proxy owned by Mezo's 5-of-9 Safe. | Yield stops. If a strategy pays dust, sMUSD reverts deposits and withdrawals; Levada keeps MUSD idle and pays exits from it. |
| **MUSD NTT managers** (pausable by Mezo's Emergency Safe) | They are the official MUSD bridge. | While paused, MUSD cannot cross. Instant exits from the Base buffer keep working, and nothing is lost. |
| **Owner keys** | Vault owner: pause new deposits, deposit cap, buffer size (≤ 50%). Hub owner: fee (≤ 20% of yield), treasury. | **Neither owner can move user funds, block withdrawals or change where money goes.** |

Every other function is **permissionless**: bridging, reports, withdrawal processing and payouts. The keeper is a convenience that anyone can run; it only pays gas.

## What the code guarantees

The 38 tests below check these properties, including fuzzing and invariants over hundreds of thousands of random action sequences.

- **Solvency:** the vault never promises more than exists across Base, both bridges and Mezo (`invariant_solvent`).
- **No double counting:** principal is booked on Base in real time. Mezo only reports the yield it has earned. MUSD in flight in either direction counts once, whatever order transfers and reports land in (`test_returnLandingBeforeReportIsNotDoubleCounted`, `invariant_baseFlowIdentity`).
- **Gifts cannot move the share price:** MUSD sent to the vault, or MUSD or sMUSD sent to the hub without a deposit, never moves the share price. This blocks inflation and donation attacks (`test_donationsDoNotMoveSharePrice`, `test_L3_*`).
- **Every queued exit completes:** after delivering and processing everything, every user exits in full (`invariant_H2_everyQueuedExitCompletes`, 2,000 runs × 100 actions).
- **Nobody loses principal** to rounding (`invariant_L8_nobodyLosesPrincipal`).
- **No way to steal yield:** each report's gain is released over 12 hours, so a deposit made just before a report and redeemed just after earns nothing (`test_H1_*`).
- **Messages are authenticated:**
  - each side accepts only the other contract on the other chain;
  - withdrawal messages are deduplicated by VAA hash and can be filled in parts but never beyond their amount;
  - report sequences and cumulative totals only move forward.

## How it was reviewed

1. **Tests while building:** 12 tests, including a fuzz test that runs 5,000 cases and checks every depositor exits whole.
2. **Independent adversarial audit** (AI-assisted, 2026-10-23), run against the code in this repo.
   - Every finding came with a failing Foundry test (`contracts/test/Audit.t.sol`).
   - The tests run against a line-for-line port of Mezo's `MUSDSavingsRate` and a 16-action invariant handler.
   - They also include fork tests against the **live** NTT managers and sMUSD on Base, Base Sepolia, Mezo and Mezo testnet.
3. **Fixes, then re-run.** Each finding's test now passes as a regression test. All 4 live fork tests pass with the fixed code.

Run the suite: `cd contracts && forge test`. For the fork checks against the live contracts, run `AUDIT_FORK=true forge test --match-contract AuditForkTest`.

## Findings and fixes

| ID | Severity | Finding | Fix | Regression test |
|---|---|---|---|---|
| H-1 | High | Anyone could deposit, relay a yield report and redeem in one transaction, taking most of a report's yield. | Each report's gain is locked and released linearly over `PROFIT_UNLOCK` (12 h); losses are netted against still-locked gain first. | `test_H1_jitDepositAroundReportRelayStealsYield` |
| H-2 | High | Queued exits could be stranded: the hub could be asked twice for the same MUSD, claims could pay from MUSD reserved for others, and the hub paid all-or-nothing. | `freeIdle = balance + pendingFromHub - totalOwed`. Each exit takes a first-in-first-out queue position and is paid only once its MUSD has arrived. The hub fills requests in parts, within its holdings and the NTT outbound capacity, in any order. | 3 × `test_H2_*`, `invariant_H2_everyQueuedExitCompletes` |
| M-1 | Medium | One user's claim could take MUSD reserved for another. | First-in-first-out claims (as H-2). | `test_M1_*` |
| L-1 | Low | An in-flight queued exit froze instant exits and bridging. | Pending hub returns now count toward `freeIdle`. | `test_L1_*` |
| L-2 | Low | The report rate limit could be ratcheted with many reports in the same second. | Gains need elapsed time; no fixed allowance per report. | `test_L2_*` |
| L-3 | Low | sMUSD sent to the hub raised the share price. | The hub books gifted sMUSD as inflow, not yield. | `test_L3_*` |
| L-4 | Low | ETH sent with a withdrawal that didn't need the hub got stuck. | Exact fee taken; the excess is refunded. | `test_L4_*` |
| L-5 | Low | A dust-paying sMUSD strategy made sMUSD revert deposits and withdrawals. | The hub skips deposits, holds MUSD idle and pays exits from idle MUSD meanwhile. | `test_L5_*` |
| L-6 | Low | An exit larger than the NTT outbound limit could never be sent. | Partial fills, capped at the outbound capacity. | `test_L6_*` |
| L-7 | Low | A treasury that refuses MUSD could freeze every exit. | Fees accrue in the hub and are pulled with `claimFees()`; the MUSD contract itself is rejected as treasury. | `test_L7_*` |
| L-8 | Low | Profit booked or dust left while no shares existed coarsened the share unit forever. | Gains are not credited while the supply is 0; shares mint 1:1 when the supply is 0; zero-share deposits revert. | `test_L8_*`, `invariant_L8_*` |
| I-1 | Info | A fee change applied to yield already earned. | `setFee` syncs first. | `test_I1_*` |
| I-2 | Info | `maxMint` could overflow, which ERC-4626 forbids. | It saturates instead. | `test_I2_*` |
| I-4 | Info | Deployment risks: the vault was live before the hub existed, and the owner defaulted to the hot keeper key. | Deposits start paused until the hub is verified at its predicted address. Ownership goes to the team wallet; the keeper key only pays gas. | `deploy.sh` |

### Checked and found safe

- Reentrancy:
  - every state-changing entry point is `nonReentrant`;
  - MUSD has no transfer hooks on either chain;
  - sMUSD makes no callbacks;
  - NTT's only callback is an ETH refund.
- Replay and wrong-emitter messages, including the right address on the wrong chain and either side's own messages fed back.
- Payload decoding enforces exact length and the type byte.
- Rounding always favours the vault. A queued exit loses under 1e10 wei (NTT's 8-decimal transfer unit), which stays with the vault.
- `max*` and `preview*` are consistent over 128k random calls.
- The fee is taken exactly once, only on yield, including yield sMUSD pays inside `withdraw()`.
- Integration with the live contracts:
  - the instruction encoding `0x01010101` targets the only enabled transceiver;
  - consistency levels 200 (Base) and 202 (Mezo) are accepted;
  - burn and lock work against the live NTT managers.

## Known limitations

- **Testnet first.** Mainnet runs with a deposit cap.
- **Withdrawal timing:** queued exits take minutes. Bridging from Base to Mezo waits for Base finality (about 20 minutes).
- **No migration path:** the dependency addresses are immutable. If Mezo replaces sMUSD or the NTT managers, users exit and a new vault is deployed.
- **Report frequency:** the share price lags Mezo by up to one report interval plus the 12-hour release.

Report issues privately to the maintainers before disclosing.
