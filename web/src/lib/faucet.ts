"use client";

import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseUnits, type Hash } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi } from "./abis";
import { NETWORK, addresses, baseChain } from "./config";

/** The faucet only offers itself to wallets holding less than this much test MUSD (the route enforces it too). */
export const FAUCET_ENOUGH = parseUnits("100", 18);

export type FaucetResult = { ok: true; amount: string; musdTx: Hash; ethTx?: Hash; confirmed: boolean };
export class FaucetFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Is the server's faucet set up? The layout seeds the answer (whether FAUCET_PRIVATE_KEY exists), so
 * the page needs no request for it; GET /api/faucet (503 "faucet not configured") is the fallback.
 * A claim answered "not configured" switches it off everywhere.
 */
export function useFaucetReady() {
  const q = useQuery({
    queryKey: ["faucet-ready"],
    enabled: NETWORK === "testnet",
    staleTime: Infinity,
    retry: false,
    queryFn: async () => (await fetch("/api/faucet", { cache: "no-store" })).ok,
  });
  return NETWORK === "testnet" && q.data === true;
}

/** The connected wallet's test MUSD on Base (read from Base whatever chain the wallet is on). */
export function useWalletMusd() {
  const { address } = useAccount();
  return useReadContract({
    address: addresses.baseMusd,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: baseChain.id,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
}

/**
 * The faucet for the connected wallet: whether to offer it, and one claim state shared by every
 * place that shows it (the hero and the save panel), so a claim made in one shows in both.
 */
export function useFaucet() {
  const { address } = useAccount();
  const ready = useFaucetReady();
  const balance = useWalletMusd();
  const qc = useQueryClient();
  const key = ["faucet-claim", address?.toLowerCase() ?? "none"];
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async (): Promise<FaucetResult> => {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<FaucetResult> & { code?: string; error?: string };
      if (body.code === "not_configured") qc.setQueryData(["faucet-ready"], false);
      if (!res.ok || !body.musdTx)
        throw new FaucetFailure(body.code ?? "error", body.error ?? "The faucet didn't answer. Please try again.");
      return body as FaucetResult;
    },
    onSettled: () => void balance.refetch(),
  });
  const last = useMutationState({ filters: { mutationKey: key }, select: (m) => m.state }).at(-1);
  const low = balance.data !== undefined && balance.data < FAUCET_ENOUGH;
  return {
    /** Offer the button: testnet, faucet configured, wallet connected and holding under 100 test MUSD. */
    offer: ready && !!address && low,
    ready,
    status: last?.status ?? "idle",
    result: last?.status === "success" ? (last.data as FaucetResult) : undefined,
    error: last?.status === "error" ? (last.error as FaucetFailure) : undefined,
    claim: () => mutation.mutate(),
  };
}
