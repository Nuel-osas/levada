import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatUnits,
  http,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi, hubAbi, transceiverAbi, vaultAbi } from "./abis.js";
import type { Config } from "./config.js";
import * as scan from "./wormholescan.js";

type Side = "mezo" | "base";
type Call = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint };
type Outcome = { receipt?: TransactionReceipt; skipped?: string };

const musd = (v: bigint) => formatUnits(v, 18);
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error name of a reverted call, or the message. */
function reason(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      return revert.data?.errorName ?? revert.reason ?? revert.shortMessage;
    }
    return e.shortMessage;
  }
  return String(e);
}

/**
 * One keeper. Every action it takes is permissionless: anyone could run this and the
 * contracts would behave the same. It only spends gas.
 */
export function createKeeper(cfg: Config) {
  const account = privateKeyToAccount(cfg.privateKey);
  const clients = {
    mezo: createPublicClient({ chain: cfg.mezo.chain, transport: http(cfg.mezo.rpc) }) as PublicClient,
    base: createPublicClient({ chain: cfg.base.chain, transport: http(cfg.base.rpc) }) as PublicClient,
  };
  const wallets = {
    mezo: createWalletClient({ account, chain: cfg.mezo.chain, transport: http(cfg.mezo.rpc) }),
    base: createWalletClient({ account, chain: cfg.base.chain, transport: http(cfg.base.rpc) }),
  };
  const settled = new Set<string>();

  /** Simulate, then send. Expected reverts are reported as skipped instead of thrown. */
  async function send(side: Side, call: Call, expected: string[] = []): Promise<Outcome> {
    try {
      const { request } = await clients[side].simulateContract({ account, ...call } as any);
      const hash = await wallets[side].writeContract(request as any);
      const receipt = await clients[side].waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error(`${call.functionName} reverted in ${hash}`);
      return { receipt };
    } catch (e) {
      const why = reason(e);
      if (expected.some((x) => why.includes(x))) return { skipped: why };
      throw new Error(`${side} ${call.functionName}: ${why}`);
    }
  }

  /** Base: move MUSD above the buffer target to Mezo. */
  async function bridge() {
    const amount = await clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "bridgeable" });
    if (amount === 0n) return;
    const out = await send("base", { address: cfg.vault, abi: vaultAbi, functionName: "bridgeToHub" }, ["NothingToBridge"]);
    if (out.receipt) log(`bridged ${musd(amount)} MUSD Base -> Mezo`, out.receipt.transactionHash);
  }

  /** Deliver signed NTT transfers addressed to the hub (on Mezo) or the vault (on Base). */
  async function deliver(to: Side) {
    const chain = cfg[to];
    const recipient = to === "mezo" ? cfg.hub : cfg.vault;
    for (const op of await scan.nttTransfersTo(cfg.wormholescan, recipient)) {
      if (op.toChain !== chain.wormholeChain || settled.has(op.id)) continue;
      const out = await send(
        to,
        { address: chain.transceiver, abi: transceiverAbi, functionName: "receiveMessage", args: [op.vaa] },
        ["TransferAlreadyCompleted", "TransceiverAlreadyAttestedToMessage"],
      );
      settled.add(op.id);
      if (out.receipt) log(`delivered ${formatUnits(BigInt(op.amount), 8)} MUSD to ${to}`, out.receipt.transactionHash);
    }
  }

  /** Mezo: honour withdrawal requests the vault published on Base, in as many parts as needed. */
  async function processWithdrawals() {
    let processed = 0;
    for (const v of await scan.vaasByEmitter(cfg.wormholescan, cfg.base.wormholeChain, cfg.vault)) {
      if (settled.has(v.id)) continue;
      for (let part = 0; part < 5; part++) {
        const out = await send(
          "mezo",
          { address: cfg.hub, abi: hubAbi, functionName: "processWithdrawal", args: [v.vaa] },
          ["AlreadyProcessed", "NothingToSend", "InsufficientBalance"],
        );
        if (out.receipt) {
          processed++;
          log(`sent MUSD for withdrawal ${v.id}`, out.receipt.transactionHash);
          continue;
        }
        if (out.skipped === "AlreadyProcessed") settled.add(v.id);
        else log(`withdrawal ${v.id} waiting: ${out.skipped}`);
        break;
      }
    }
    return processed;
  }

  /** Mezo -> Base: publish a fresh report when anything changed, and make sure the vault has the latest. */
  async function report(force: boolean) {
    const [hasReport, lastSeq, last] = await Promise.all([
      clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "hasReport" }),
      clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "lastReportSequence" }),
      clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "lastReport" }),
    ]);
    const [idle, cumulativeOut] = await Promise.all([
      clients.mezo.readContract({ address: cfg.mezo.musd, abi: erc20Abi, functionName: "balanceOf", args: [cfg.hub] }),
      clients.mezo.readContract({ address: cfg.hub, abi: hubAbi, functionName: "cumulativeOut" }),
    ]);
    const age = Math.floor(Date.now() / 1000) - Number(last[3]);
    const stale = !hasReport || idle > 0n || cumulativeOut !== last[2] || age > cfg.reportIntervalSec;

    let sequence: bigint | undefined;
    if (stale || force) {
      const out = await send("mezo", { address: cfg.hub, abi: hubAbi, functionName: "report" });
      for (const l of out.receipt?.logs ?? []) {
        try {
          const ev = decodeEventLog({ abi: hubAbi, data: l.data, topics: l.topics });
          if (ev.eventName === "Reported") sequence = ev.args.sequence;
        } catch {}
      }
      log(`reported from Mezo (seq ${sequence})`, out.receipt?.transactionHash);
    } else {
      const latest = (await scan.vaasByEmitter(cfg.wormholescan, cfg.mezo.wormholeChain, cfg.hub, 1))[0];
      if (!latest || (hasReport && latest.sequence <= lastSeq)) return;
      sequence = latest.sequence;
    }
    if (sequence === undefined) return;

    let vaa: Hex | undefined;
    for (let i = 0; i < 30 && !vaa; i++) {
      vaa = await scan.vaa(cfg.wormholescan, cfg.mezo.wormholeChain, cfg.hub, sequence);
      if (!vaa) await sleep(4_000);
    }
    if (!vaa) return log(`report ${sequence} not signed yet; will relay next pass`);
    const out = await send("base", { address: cfg.vault, abi: vaultAbi, functionName: "receiveReport", args: [vaa] }, [
      "StaleReport",
    ]);
    if (out.receipt) log(`vault updated with report ${sequence}`, out.receipt.transactionHash);
  }

  /** Base: pay out queued exits whose MUSD has landed, so users need no second click. */
  let exitCursor = 0n;
  async function claims() {
    const count = await clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "exitCount" });
    let advancing = true;
    for (let id = exitCursor; id < count; id++) {
      const [owner, assets, , paid] = await clients.base.readContract({
        address: cfg.vault,
        abi: vaultAbi,
        functionName: "exits",
        args: [id],
      });
      if (paid) {
        if (advancing) exitCursor = id + 1n;
        continue;
      }
      advancing = false;
      const ready = await clients.base.readContract({ address: cfg.vault, abi: vaultAbi, functionName: "isClaimable", args: [id] });
      if (!ready) continue;
      const out = await send("base", { address: cfg.vault, abi: vaultAbi, functionName: "claimExit", args: [id] }, [
        "NotArrived",
        "NothingOwed",
      ]);
      if (out.receipt) log(`paid ${musd(assets)} MUSD to ${owner} (exit ${id})`, out.receipt.transactionHash);
    }
  }

  async function pass({ forceReport = false } = {}) {
    await bridge();
    await deliver("mezo");
    const processed = await processWithdrawals();
    await report(forceReport || processed > 0);
    await deliver("base");
    await claims();
  }

  return { pass, bridge, deliver, processWithdrawals, report, claims, account: account.address };
}
