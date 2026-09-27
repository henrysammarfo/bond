# Competitors — OpenServ Edition 01 (fact-checked 2026-09-27)

## Judr (RWA-adjacent — different product)

| | |
| --- | --- |
| Entry | **Judr** by MrNetwork (`@encrypt_wizard`) |
| Demo | [tryjudr.vercel.app](https://tryjudr.vercel.app/) |
| Code | [github.com/mrnetwork0001/Judr](https://github.com/mrnetwork0001/Judr) |
| Pitch X | [status/2104225338360254586](https://x.com/encrypt_wizard/status/2104225338360254586) |
| Track posture | Autonomous **arbitration** for tokenized RWA escrow (SERV graph + AgentKit payout), not “treasury mandate → subscribe vault” |

### What they shipped (live claims on site + X — verified URLs exist)

- Bounded SERV reasoning graph: evidence screen → clause extract → weigh → adjudicate ×3 → deterministic citation verifier (~$0.02–$0.03, ~30s).
- Verdict posts; **no money moves** until appeal window closes; then Coinbase AgentKit pays **USDC on Base mainnet**.
- Example Base payout: [basescan `0xe4dc46…e40f`](https://basescan.org/tx/0xe4dc46ecea134e1f62a6d2e92717e92ac5315fa1ba8010008a666696ee7be40f)
- Standing **100 USDC** IX High Yield Bond position on Avalanche (fee from yield, not principal).
- Avalanche vault tx: [snowscan `0x137184…4c0c`](https://snowscan.xyz/tx/0x13718493f700f26c3d3acae254d5a4ff0bf5d76d5193b023feddb797854c4c0c)
- Live IXS vault table on marketing page; projection figures labeled as projection.

### How BOND must differ / win RWA Vaults

Judr uses IXS as **idle-escrow yield** while arbitration runs. BOND’s track is the **RWA Vaults product itself**:

1. SERV/AgentRouter **mandate gate** before spend.
2. AgentKit Avalanche wallet **subscribes** primary vault (`6a952729732c2b84b55ce89d`).
3. UI honesty: **Pending (not earning)** until IXS shares finalize.
4. Multitenant org sessions + live positions — no localStorage demo theater.

Do **not** copy Judr’s arbitration UX. Do match their bar on **live on-chain proof** (Snowscan tx + public demo + X with @openservai).

### Threat to BOND

- They already have a **live Avalanche 100 USDC** vault request and a polished SERV narrative.
- Judges scanning “RWA + IXS + AgentKit” may conflate tracks. BOND submission copy must say **RWA Vaults track** and show mandate → Pending → shares, not dispute resolution.

### BOND win posture (beat Judr on this track)

| Judr | BOND must show |
| --- | --- |
| Standing 100 USDC for escrow yield | **Per-org** `requestDeposit` after SERV mandate allow |
| Arbitration graph polish | Mandate **deny** + allow + Snowscan links on subscription |
| “awaiting IXS finalisation” | Same honesty — **Pending not earning**, owned $ = 0 until shares |
| Public demo zero-install | Public demo URL + Login → Mandate → Deposit → Pending path |
| Live tx hashes in README/X | Fill `WIN_CHECKLIST.md` + X/@openservai before deadline |

Do not claim “only project on IXS Avalanche.” Claim **treasury mandate product** with Pending honesty and multitenant ledger.

## Other (Bible)

AllowLatch / VaultOS / Unbribable / Hatrey / Ledgerly = spend-gate pile. Do not join.
