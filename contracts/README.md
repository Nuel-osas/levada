# Levada contracts

| Contract | Chain | What it does |
|---|---|---|
| `src/LevadaVault.sol` | Base | ERC-4626 vault (lsMUSD). Books principal, prices yield from Wormhole-verified hub reports released over 12 h, keeps a buffer for instant exits, queues larger exits first-in-first-out. |
| `src/LevadaHub.sol` | Mezo | Holds MUSD in sMUSD, compounds yield, reports to the vault, sends MUSD back for exits in parts. |

```bash
forge test                                                  # 38 tests
AUDIT_FORK=true forge test --match-contract AuditForkTest   # against live NTT + sMUSD
```

See [../SECURITY.md](../SECURITY.md) for the trust model and audit fixes.
