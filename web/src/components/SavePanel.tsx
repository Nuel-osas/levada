"use client";

import { useEffect, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  formatUnits,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BRAND, DEPLOYED, addresses, baseChain, chainNames, links } from "@/lib/config";
import { erc20Abi, vaultAbi } from "@/lib/abis";
import { fmt, fmtMusd, fmtPct, parseAmount, toNum } from "@/lib/format";
import { netRate, rememberExit, useApy, useExits, useHub, useVault, type ExitView } from "@/lib/hooks";
import { Exits } from "./Exits";
import { FaucetAction } from "./Faucet";
import { Token } from "./Token";

type Tab = "save" | "withdraw";
type Note = { tone: "ok" | "err"; text: string; hash?: Hash };
const VAULT = (addresses.vault ?? "0x0000000000000000000000000000000000000000") as Address;

const ERRORS: Record<string, string> = {
  NotArrived: "That MUSD hasn't landed on Base yet. It's paid as soon as it does.",
  NothingOwed: "Nothing to pay: this exit is already paid.",
  ZeroShares: "That amount is too small.",
  ZeroAssets: "That amount is too small.",
  ERC4626ExceededMaxDeposit: "That's more than the vault can take right now (deposit cap).",
  ERC4626ExceededMaxWithdraw: "That's more than can be paid instantly right now.",
  ERC4626ExceededMaxRedeem: "That's more than can be paid instantly right now.",
  ERC20InsufficientBalance: "Your wallet doesn't have enough MUSD.",
  ERC20InsufficientAllowance: "Approve MUSD first.",
};

/** Plain-English errors: wallet rejections, the vault's own errors, then viem's short message. */
function explain(e: unknown) {
  if (e instanceof BaseError) {
    const all = `${e.shortMessage} ${e.details ?? ""}`;
    if (/user rejected|user denied|rejected the request/i.test(all)) return "You cancelled in your wallet.";
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
    if (name && ERRORS[name]) return ERRORS[name];
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function SavePanel() {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: baseChain.id });
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const apy = useApy();
  const vault = useVault();
  const hub = useHub();
  const { exits, refetch: refetchExits } = useExits();

  const [tab, setTab] = useState<Tab>("save");
  // /app#withdraw (from the portfolio) opens on the Withdraw tab.
  useEffect(() => {
    if (location.hash === "#withdraw") setTab("withdraw");
  }, []);
  const [amount, setAmount] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [note, setNote] = useState<Note>();

  const parsed = parseAmount(amount);
  const position = vault.position ?? 0n;
  const instant = vault.maxWithdraw ?? 0n;
  const rate = netRate(apy?.apy, hub?.feeBps, vault.bufferBps);
  const openExits = exits.filter((e) => !e.paid).length;

  const preview = useReadContract({
    address: VAULT,
    abi: vaultAbi,
    functionName: "previewDeposit",
    args: [parsed ?? 0n],
    query: { enabled: DEPLOYED && tab === "save" && !!parsed },
  });

  const wrongChain = !!address && chainId !== baseChain.id;
  const max = tab === "save" ? vault.walletMusd : position;
  const over = !!parsed && max !== undefined && parsed > max && !(tab === "withdraw" && isMax);
  const overCap = tab === "save" && !!parsed && vault.maxDeposit !== undefined && parsed > vault.maxDeposit;
  const queued = tab === "withdraw" && !!parsed && (isMax ? (vault.maxRedeem ?? 0n) < (vault.shares ?? 0n) : parsed > instant);

  function pick(t: Tab) {
    setTab(t);
    setAmount("");
    setIsMax(false);
    setNote(undefined);
  }

  // Test MUSD from the faucet: once it lands (the route waits for the receipt), the save is one click away.
  const onFaucet = () => {
    if (!DEPLOYED) return;
    setTab("save");
    setAmount((a) => a || "250");
    setIsMax(false);
    void vault.refetch();
  };

  async function send(label: string, write: () => Promise<Hash>): Promise<{ hash: Hash; receipt: TransactionReceipt } | undefined> {
    setBusy(label);
    setNote(undefined);
    try {
      const hash = await write();
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted.");
      await vault.refetch();
      return { hash, receipt };
    } catch (e) {
      setNote({ tone: "err", text: explain(e) });
    } finally {
      setBusy(undefined);
    }
  }

  async function save() {
    if (!parsed || !address) return;
    if ((vault.allowance ?? 0n) < parsed) {
      const ok = await send("Approving MUSD", () =>
        writeContractAsync({ chainId: baseChain.id, address: addresses.baseMusd, abi: erc20Abi, functionName: "approve", args: [VAULT, parsed] }),
      );
      if (!ok) return;
    }
    const done = await send("Saving", () =>
      writeContractAsync({ chainId: baseChain.id, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [parsed, address] }),
    );
    if (!done) return;
    setAmount("");
    setNote({ tone: "ok", text: `Saved ${fmt(toNum(parsed))} MUSD. Most of it crosses to Mezo on the keeper's next run.`, hash: done.hash });
  }

  async function withdraw() {
    if (!parsed || !address) return;
    const shares = vault.shares ?? 0n;
    const all = isMax || parsed >= position;

    // Inside the free buffer on Base: paid now.
    if (all ? (vault.maxRedeem ?? 0n) >= shares : parsed <= instant) {
      const done = await send("Withdrawing", () =>
        all
          ? writeContractAsync({ chainId: baseChain.id, address: VAULT, abi: vaultAbi, functionName: "redeem", args: [shares, address, address] })
          : writeContractAsync({ chainId: baseChain.id, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [parsed, address, address] }),
      );
      if (!done) return;
      setAmount("");
      setIsMax(false);
      setNote({ tone: "ok", text: `${fmt(toNum(all ? position : parsed))} MUSD is back in your wallet.`, hash: done.hash });
      return;
    }

    // Beyond the buffer: burn the shares now, and the MUSD comes back from Mezo in queue order.
    let toBurn = shares;
    if (!all) {
      const need = await client!.readContract({ address: VAULT, abi: vaultAbi, functionName: "previewWithdraw", args: [parsed] });
      toBurn = need > shares ? shares : need;
    }
    const done = await send("Requesting", () =>
      writeContractAsync({ chainId: baseChain.id, address: VAULT, abi: vaultAbi, functionName: "requestWithdraw", args: [toBurn], value: 0n }),
    );
    if (!done) return;
    for (const log of done.receipt.logs) {
      if (log.address.toLowerCase() !== VAULT.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: vaultAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "WithdrawRequested" && ev.args.requestedFromHub > 0n)
          rememberExit(ev.args.exitId, { sequence: ev.args.sequence, txHash: done.hash });
      } catch {}
    }
    setAmount("");
    setIsMax(false);
    setNote({ tone: "ok", text: "Withdrawal queued. Follow it below: it's paid to your wallet when the MUSD lands.", hash: done.hash });
    await refetchExits();
  }

  async function claim(e: ExitView) {
    const done = await send("Paying out", () =>
      writeContractAsync({ chainId: baseChain.id, address: VAULT, abi: vaultAbi, functionName: "claimExit", args: [e.id] }),
    );
    if (!done) return;
    setNote({ tone: "ok", text: `${fmtMusd(e.assets)} MUSD paid to your wallet.`, hash: done.hash });
    await refetchExits();
  }

  const paused = tab === "save" && vault.depositsPaused === true;
  let action: { label: string; onClick?: () => void; disabled?: boolean };
  if (!DEPLOYED) action = { label: "Deposits open soon", disabled: true };
  else if (!address) action = { label: tab === "save" ? "Connect to save" : "Connect to withdraw", onClick: openConnectModal };
  else if (wrongChain) action = { label: `Switch to ${chainNames.base}`, onClick: () => switchChain({ chainId: baseChain.id }) };
  else if (busy) action = { label: `${busy}…`, disabled: true };
  else if (paused) action = { label: "Deposits paused", disabled: true };
  else if (!parsed) action = { label: tab === "save" ? "Save MUSD" : "Withdraw", disabled: true };
  else if (over) action = { label: tab === "save" ? "Not enough MUSD" : "More than your savings", disabled: true };
  else if (overCap) action = { label: "Above the deposit cap", disabled: true };
  else if (tab === "save")
    action = { label: (vault.allowance ?? 0n) < parsed ? "Approve and save" : "Save MUSD", onClick: save };
  else action = { label: queued ? "Request withdrawal" : "Withdraw now", onClick: withdraw };

  const canType = DEPLOYED && !busy;

  return (
    <div className="panel" id="panel">
      <div className="panel__tabs" role="tablist" aria-label="Save or withdraw">
        {(["save", "withdraw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="panel-body"
            className="panel__tab"
            onClick={() => pick(t)}
          >
            {t === "save" ? "Save" : "Withdraw"}
            {t === "withdraw" && openExits > 0 && <span className="panel__badge">{openExits}</span>}
          </button>
        ))}
      </div>

      <div className="panel__body" id="panel-body" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className="field">
          <div className="field__row">
            <label htmlFor="amount">{tab === "save" ? "Amount to save" : "Amount to withdraw"}</label>
            {DEPLOYED && address && (
              <span className="field__have">
                {tab === "save" ? "Wallet" : "Savings"} {fmtMusd(max)} MUSD
              </span>
            )}
          </div>
          <div className={canType ? "field__box" : "field__box is-off"}>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              disabled={!canType}
              aria-describedby="panel-summary"
              onChange={(e) => {
                setAmount(e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, ""));
                setIsMax(false);
              }}
            />
            <span className="field__unit">
              <Token name="musd" size={22} /> MUSD
            </span>
            <button
              type="button"
              className="chip chip--gold chip--btn"
              disabled={!canType || !address || !max}
              onClick={() => {
                if (!max) return;
                setAmount(formatUnits(max, 18));
                setIsMax(tab === "withdraw");
              }}
            >
              Max
            </button>
          </div>
        </div>

        <dl className="summary" id="panel-summary">
          {tab === "save" ? (
            <>
              <div>
                <dt>You get</dt>
                <dd>
                  {DEPLOYED && parsed && preview.data !== undefined ? `≈ ${fmtMusd(preview.data, 4)}` : "–"}{" "}
                  <span className="t-token">
                    <Token name="lsmusd" size={16} /> {BRAND.token}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Token name="smusd" size={16} /> Earning
                </dt>
                <dd>
                  <span className="t-yield">{DEPLOYED && rate !== undefined ? `≈ ${fmtPct(rate * 100)}` : fmtPct(apy?.apy)}</span>{" "}
                  {DEPLOYED ? "a year, after fees" : "a year on Mezo"}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Instant now</dt>
                <dd>{DEPLOYED ? `up to ${fmtMusd(instant)}` : "–"} MUSD</dd>
              </div>
              <div>
                <dt>Bigger exits</dt>
                <dd>paid in order from Mezo</dd>
              </div>
              {!!vault.owed && vault.owed > 0n && (
                <div>
                  <dt>On the way to you</dt>
                  <dd>{fmtMusd(vault.owed)} MUSD</dd>
                </div>
              )}
            </>
          )}
        </dl>

        {tab === "save" && <FaucetAction where="panel" onSent={onFaucet} />}

        {tab === "withdraw" && queued && !over && (
          <p className="panel__hint">
            Above {fmtMusd(instant)} MUSD your withdrawal is queued. Your amount is locked in now and paid in one go when
            the MUSD comes back from Mezo, usually within minutes.
          </p>
        )}

        {!DEPLOYED ? (
          <div className="soon">
            <span className="chip chip--sm">Opens soon</span>
            <p>
              Deposits open soon. The vault is being deployed to {chainNames.base}, with its hub on {chainNames.mezo}.
            </p>
          </div>
        ) : (
          paused && <p className="panel__hint">Deposits are paused for now. Withdrawals always stay open.</p>
        )}

        <button
          type="button"
          className={action.disabled ? "btn-primary btn-primary--block is-off" : "btn-primary btn-primary--block"}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          <span className="btn-primary__label" data-label={action.label}>
            {action.label}
          </span>
        </button>

        {note && (
          <p className={`panel__note is-${note.tone}`} role={note.tone === "err" ? "alert" : "status"}>
            {note.text}{" "}
            {note.hash && (
              <a href={links.base(`tx/${note.hash}`)} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>
            )}
          </p>
        )}

        {tab === "withdraw" && <Exits exits={exits} onClaim={claim} busy={!!busy} />}
        {tab === "save" && openExits > 0 && (
          <button type="button" className="panel__link" onClick={() => pick("withdraw")}>
            You have {openExits} withdrawal{openExits > 1 ? "s" : ""} on the way. Track {openExits > 1 ? "them" : "it"} →
          </button>
        )}
      </div>
    </div>
  );
}
