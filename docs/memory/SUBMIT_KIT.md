# OpenServ Edition 01 — BOND submission kit

## Form answers (copy/paste)

### Name of your project / submission
**BOND** — Settlement you can prove (OpenServ Path A RWA)

### Describe the project
BOND is a live RWA vault demo for OpenServ Edition 01. Target: treasuries and agent operators who need agent wallets that can deposit without lying about settlement.

**Idea:** Path A honesty — SERV decides if a mandate is allowed, AgentKit signs a real USDC deposit on Avalanche (BNB companion lane), and IXS ERC-7540 stays **Pending** until shares prove. No invented balances. No localStorage cosplay.

**Utility:** Mandate limits + vault scan (ALLOCATE / DEFER / REJECT) + live subscribe + public Evidence receipts on Neon (SERV I/O, MCP probes, on-chain reads with block numbers). Fail-closed preflight (redeemable floor, ≤25% TVL, NAV freshness) blocks unsafe legs before gas is spent.

**How it works:** Sign in → funded AgentKit wallet → create mandate → Scan → Subscribe (≥$104 USDC floor) → UI shows Pending (not earning) when the chain accepts — or a clear REJECT when guardrails fire → Evidence page for judges.

### Link to your project
- Live demo: https://bond-pi.vercel.app
- GitHub: https://github.com/henrysammarfo/bond

### Additional links
- Evidence: https://bond-pi.vercel.app/evidence
- AgentKit wallet (fund/verify): `0x1eFBb041E94aCc18D50C578eD34c265075d3b14e`

### Your X submission link
Paste the public post URL after publishing. Must include a tag of **@openservai**.
Reply/quote context (optional): https://x.com/openservai/status/2099514282530541750

---

## X post (Blue Tick — long form)

Copy, attach the demo video + 2–3 stills, then post:

```
BOND — OpenServ Edition 01 · Path A live RWA

Most RWA demos flash green, invent a balance, and call it settled.
Cute. Wrong.

BOND is settlement you can prove:
• SERV decides the mandate (ALLOCATE / DEFER / REJECT — fail closed)
• AgentKit signs a real USDC deposit on Avalanche (BNB companion lane)
• IXS is async ERC-7540 — until shares exist we say Pending. Not earning. Not owned.
• Evidence receipts on Neon — SERV I/O, MCP probes, on-chain reads with block numbers. Redacted. Public.

No MetaMask theater. No localStorage balances. No “unhackable” cosplay.
Live floor $104 USDC so the position stays redeemable after fees.

Try it: https://bond-pi.vercel.app
Evidence: https://bond-pi.vercel.app/evidence
Code: https://github.com/henrysammarfo/bond

Funded AgentKit signer: 0x1eFBb041E94aCc18D50C578eD34c265075d3b14e

Built for @openservai · AgentKit · Avalanche · honesty as a feature

#OpenServ #AgentKit #RWA #Avalanche
```

Shorter alt (~if media-heavy):

```
BOND for @openservai Edition 01

SERV → AgentKit live USDC → IXS Pending until shares prove.
Evidence on Neon. No fake settled.

https://bond-pi.vercel.app
https://github.com/henrysammarfo/bond

Settlement you can prove.
```

---

## Demo assets
- Hyperframes V2 (RECEIPT LEDGER): `bond-demo-v2/out/bond_openserv_v2_delivery.mp4`
- Live screen capture: `/opt/cursor/artifacts/bond-live-path-a-demo.mp4` (after record)
- Stills: `/opt/cursor/artifacts/dash-*.png`, `bond-home-hero.png`

## Demo login (operators only — rotated after recording)
- Email: `demo@bond.app`
- Password: **rotated** — see `/opt/cursor/artifacts/DEMO_LOGIN_ROTATED.txt` on the agent machine (never post publicly).
- Live capture showed Path A through Scan + Subscribe attempt; Avalanche primary currently **preflight REJECT** (NAV/TVL concentration + maxDeposit 0). BNB lane preflight clears at $104 when BSC USDC is funded. Fail-closed is the demo.

## Videos for X
- Ledger sizzle: `/opt/cursor/artifacts/bond-openserv-v2-x.mp4` (~4MB)
- Live product: `/opt/cursor/artifacts/bond-live-path-a-demo-x.mp4` + `/opt/cursor/artifacts/bond-live-subscribe-attempt-x.mp4`
- Prefer attaching the V2 ledger video + 1–2 stills (`demo-scan-allocate.png`, `demo-preflight-reject.png`, `demo-evidence-final.png`)
