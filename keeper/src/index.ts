import { loadConfig } from "./config.js";
import { createKeeper } from "./keeper.js";

const mode = process.argv[2] ?? "once";
const cfg = loadConfig();
const keeper = createKeeper(cfg);
console.log(`keeper ${keeper.account} on ${cfg.network}: vault ${cfg.vault} (Base), hub ${cfg.hub} (Mezo)`);

if (mode === "once") {
  await keeper.pass({ forceReport: process.argv.includes("--report") });
} else {
  const every = Number(process.env.PASS_INTERVAL_SEC ?? 30) * 1000;
  for (;;) {
    try {
      await keeper.pass();
    } catch (e) {
      console.error(new Date().toISOString(), "pass failed:", (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, every));
  }
}
