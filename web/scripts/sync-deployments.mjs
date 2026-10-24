// Copies ../deployments into src/lib/deployments so the app builds from one source of truth.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
const out = "src/lib/deployments";
mkdirSync(out, { recursive: true });
cpSync("../deployments/networks.json", `${out}/networks.json`);
for (const net of ["testnet", "mainnet"]) {
  const src = `../deployments/${net}.json`;
  if (existsSync(src)) cpSync(src, `${out}/${net}.json`);
  else if (!existsSync(`${out}/${net}.json`)) writeFileSync(`${out}/${net}.json`, JSON.stringify({ vault: null, hub: null }));
}
console.log("deployments synced");
