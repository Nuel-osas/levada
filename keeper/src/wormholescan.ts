import { type Address, type Hex, toHex } from "viem";

export type SignedVaa = { id: string; sequence: bigint; vaa: Hex; timestamp: string };
export type NttOperation = SignedVaa & { toChain: number; to: Address; amount: string };

const emitter = (address: Address) => address.toLowerCase().replace("0x", "").padStart(64, "0");
const b64ToHex = (b64: string) => toHex(Buffer.from(b64, "base64"));

async function get(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`wormholescan ${res.status} ${url}`);
  return res.json();
}

/** Signed messages published by `address` on `chain`, newest first. */
export async function vaasByEmitter(api: string, chain: number, address: Address, pageSize = 50) {
  const body = await get(`${api}/api/v1/vaas/${chain}/${emitter(address)}?page=0&pageSize=${pageSize}`);
  return ((body?.data ?? []) as any[]).map(
    (v): SignedVaa => ({ id: v.id, sequence: BigInt(v.sequence), vaa: b64ToHex(v.vaa), timestamp: v.timestamp }),
  );
}

export async function vaa(api: string, chain: number, address: Address, sequence: bigint) {
  const body = await get(`${api}/api/v1/vaas/${chain}/${emitter(address)}/${sequence}`);
  if (!body?.data?.vaa) return undefined;
  return b64ToHex(body.data.vaa);
}

/** NTT transfers whose recipient is `address`, newest first. Only signed ones are returned. */
export async function nttTransfersTo(api: string, address: Address, pageSize = 50) {
  const body = await get(`${api}/api/v1/operations?address=${address}&page=0&pageSize=${pageSize}`);
  const out: NttOperation[] = [];
  for (const op of (body?.operations ?? []) as any[]) {
    const p = op.content?.standarizedProperties ?? op.content?.standardizedProperties ?? {};
    if (!op.vaa?.raw || !p.appIds?.includes("NATIVE_TOKEN_TRANSFER")) continue;
    if (String(p.toAddress).toLowerCase() !== address.toLowerCase()) continue;
    out.push({
      id: op.id,
      sequence: BigInt(String(op.id).split("/")[2]),
      vaa: b64ToHex(op.vaa.raw),
      timestamp: op.sourceChain?.timestamp ?? "",
      toChain: Number(p.toChain),
      to: p.toAddress,
      amount: String(p.amount),
    });
  }
  return out;
}
