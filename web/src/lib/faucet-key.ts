import type { Hex } from "viem";

/**
 * FAUCET_PRIVATE_KEY, normalised, or undefined when it is unset or malformed. Server only: the
 * faucet route signs with it, and the layout passes on only whether it exists. Never log or return it.
 */
export function faucetKey(): Hex | undefined {
  const raw = process.env.FAUCET_PRIVATE_KEY?.trim();
  if (!raw || !/^(0x)?[0-9a-fA-F]{64}$/.test(raw)) return undefined;
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}
