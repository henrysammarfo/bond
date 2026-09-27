# OpenServ Edition 01 — BOND submission kit

Copy these into the form. Speak like a person, not a pitch deck.

---

## Name of your project / submission

BOND (OpenServ Edition 01)

---

## Describe the project

BOND is a live RWA vault product we built for OpenServ Edition 01. It is aimed at treasury teams and people running agent wallets who are tired of demos that paint a green check and call the money settled.

The idea is Path A, done honestly. SERV looks at your mandate and decides whether a deposit is allowed. If it is, AgentKit signs a real USDC transfer on Avalanche, with BNB Chain as the companion lane. IXS vaults are async ERC-7540, so USDC can land before shares exist. Until those shares prove out, BOND shows Pending. Not earning. Not owned. If the UI lies early, the treasury lies forever.

What you get in practice: org workspaces with httpOnly sessions, mandate limits per network, a live Scan that returns ALLOCATE, DEFER, or REJECT, a Subscribe flow with a redeemable floor of 104 USDC, and a public Evidence page on Neon that stores SERV inputs and outputs, MCP probes, and on-chain reads with block numbers. Everything is redacted and refreshable. No localStorage balances. No invented TVL.

How a judge walks it: open bond-pi.vercel.app, sign in, check the funded AgentKit wallet, create a mandate, run Scan, try Subscribe. If preflight is clean, you get a live deposit and a Pending status. If the vault is too thin or NAV is stale, you get a clear REJECT before gas is spent. That fail-closed behavior is intentional.

---

## Link to your project

https://bond-pi.vercel.app

https://github.com/henrysammarfo/bond

---

## Additional links

https://bond-pi.vercel.app/evidence

AgentKit signer (fund or verify): 0x1eFBb041E94aCc18D50C578eD34c265075d3b14e

Demo videos (in repo): https://github.com/henrysammarfo/bond/tree/cursor/bond-demo-v2-0222/artifacts/demo

---

## Your X submission link

Paste the public post URL after you publish. It must tag @openservai.

Optional quote/reply context: https://x.com/openservai/status/2099514282530541750

---

## X post (Blue Tick, long form)

Attach the ledger video first, then 2 or 3 stills (wallet, scan ALLOCATE, evidence or preflight reject). Then post:

```
Most RWA demos flash a green check, invent a balance, and call it settled.
Cute. Wrong.

This is BOND, built for OpenServ Edition 01.

SERV decides if the mandate is allowed.
AgentKit signs a real USDC deposit on Avalanche, with BNB as the companion lane.
IXS is async ERC-7540. Until the shares exist we say Pending. Not earning. Not owned.

You get mandate limits, a live vault Scan that returns ALLOCATE / DEFER / REJECT, and a public Evidence page on Neon with SERV I/O, MCP probes, and on-chain reads with block numbers. Redacted. Refreshable. Fail closed before money moves.

Live floor is 104 USDC so a position stays redeemable after fees.

Try it live:
https://bond-pi.vercel.app

Evidence:
https://bond-pi.vercel.app/evidence

Code:
https://github.com/henrysammarfo/bond

AgentKit signer we funded for the demo:
0x1eFBb041E94aCc18D50C578eD34c265075d3b14e

Built with @openservai · AgentKit · Avalanche
Settlement you can prove.
```

Shorter alt if media eats the character budget:

```
BOND for @openservai Edition 01

Live Path A. SERV decides. AgentKit signs. IXS stays Pending until shares prove.
Evidence on Neon. No fake settled.

https://bond-pi.vercel.app
https://github.com/henrysammarfo/bond
```

---

## What “preflight REJECT on Avalanche” means (plain English)

We tried a live 104 USDC subscribe on the Avalanche primary vault. Before AgentKit broadcasts anything, BOND runs deterministic preflight.

That vault currently has about 403 USDC of total assets. Our rule is one leg may not be more than 25% of vault TVL. 25% of ~403 is about 101 USDC. Our live redeemable floor is 104 USDC. So 104 is already over the concentration cap. On top of that, on-chain maxDeposit was 0 and NAV looked stale, so the vault was not safely open for a new deposit.

BOND rejected the subscribe in the UI with a clear message. No tx. No fake Pending. That is the product working.

The BNB companion vault cleared the same preflight checks at 104 USDC. To finish a Pending money shot on that lane, the same AgentKit address needs at least 104 USDC plus a little BNB gas on BSC. Avalanche USDC does not count on BNB.

---

## Videos and stills (viewable)

Committed under `artifacts/demo/` on branch `cursor/bond-demo-v2-0222`:

| File | What it is |
| --- | --- |
| `artifacts/demo/bond-openserv-v2-x.mp4` | Receipt ledger sizzle for the X attach |
| `artifacts/demo/bond-live-path-a-demo-x.mp4` | Live product walk (home, vaults, login masked, evidence) |
| `artifacts/demo/bond-live-subscribe-attempt-x.mp4` | Live subscribe attempt + preflight REJECT |
| `artifacts/demo/demo-wallet-agentkit.png` | Funded wallet still |
| `artifacts/demo/demo-scan-allocate.png` | Scan ALLOCATE still |
| `artifacts/demo/demo-preflight-reject.png` | Fail-closed reject still |
| `artifacts/demo/demo-evidence-final.png` | Evidence page still |

Also mirrored on the agent box at `/opt/cursor/artifacts/` with the same names.

## Demo login

Email: demo@bond.app  
Password: rotated after the live record. See `/opt/cursor/artifacts/DEMO_LOGIN_ROTATED.txt` on the agent machine. Never post it.
