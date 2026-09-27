# OpenServ Edition 01 — BOND submission kit

<p align="center">
  <img src="../brand/bond-logotype-orbit-wordmark.png" width="220" alt="BOND" />
</p>

Copy these into the form. Speak like a person, not a pitch deck.

**Logotype upload (form Q6):** use [`docs/brand/bond-logotype-social.png`](../brand/bond-logotype-social.png) (1024×1024) or [`docs/brand/bond-symbol-orbit-1080.png`](../brand/bond-symbol-orbit-1080.png).

---

## Name of your project / submission

BOND (OpenServ Edition 01)

---

## Describe the project

BOND is a live RWA vault product we built for OpenServ Edition 01. It is aimed at treasury teams and people running agent wallets who are tired of demos that paint a green check and call the money settled.

The idea is Path A, done honestly. SERV looks at your mandate and decides whether a deposit is allowed. If it is, AgentKit signs a real USDC transfer on Avalanche, with BNB Chain as the companion lane. IXS vaults are async ERC-7540, so USDC can land before shares exist. Until those shares prove out, BOND shows Pending. Not earning. Not owned. If the UI lies early, the treasury lies forever.

What you get in practice: org workspaces with httpOnly sessions, mandate limits per network, a live Scan that returns ALLOCATE, DEFER, or REJECT, a Subscribe flow with a redeemable floor of 104 USDC, and a public Evidence page on Neon that stores SERV inputs and outputs, MCP probes, and on-chain reads with block numbers. Everything is redacted and refreshable. No localStorage balances. No invented TVL.

How a judge walks it: open bond-pi.vercel.app, sign in, check the funded AgentKit wallet, create a mandate, run Scan, try Subscribe. If preflight is clean, you get a live deposit and a Pending status. If the vault is too thin or NAV is stale, you get a clear REJECT before gas is spent. That fail-closed behavior is intentional.

We already ran the live BNB lane end to end. 104 USDC went on-chain. Status in the app is Pending. You can verify the subscribe hash on BscScan:

https://bscscan.com/tx/0x227cb6a981c773f0e9a4ddb0942b4662f07c2a1453e678bbe2974e2c18d70f0c

Approve:

https://bscscan.com/tx/0x7680eaa08f91c39ffffc46d2bc990e3a7cc7a3cd7cae3bf761c24bfd84b8a29b

Full proof sheet with bridge txs too: https://github.com/henrysammarfo/bond/blob/main/docs/memory/LIVE_PROOF.md

---

## Link to your project

https://bond-pi.vercel.app

https://github.com/henrysammarfo/bond

---

## Additional links

https://bond-pi.vercel.app/evidence

https://bond-pi.vercel.app/dashboard/subscriptions/a974083b-a637-41e1-9159-45491cf1ec08

https://bscscan.com/tx/0x227cb6a981c773f0e9a4ddb0942b4662f07c2a1453e678bbe2974e2c18d70f0c

AgentKit signer: 0x1eFBb041E94aCc18D50C578eD34c265075d3b14e

Demo videos: https://github.com/henrysammarfo/bond/tree/main/artifacts/demo

Live proof: https://github.com/henrysammarfo/bond/blob/main/docs/memory/LIVE_PROOF.md

Brand / logo: https://github.com/henrysammarfo/bond/tree/main/docs/brand

---

## Your X submission link

Paste the public post URL after you publish. It must tag @openservai.

Optional quote/reply context: https://x.com/openservai/status/2099514282530541750

---

## X post (Blue Tick long form — engagement style)

Attach the finished live demo video first. Then stills: wallet, Pending, BscScan, Evidence. Hook in the first line. Proof links mid-thread energy. Tag @openservai.

```
Most RWA demos flash a green check, invent a balance, and call it settled.

Cute. Wrong.

This is BOND — built for @openservai Edition 01.

I got tired of agent-wallet demos that skip the hard part. So we shipped Path A for real.

SERV reads the mandate and decides allow or deny.
AgentKit signs a live USDC deposit.
IXS is async ERC-7540 — USDC can land before shares exist.
Until those shares prove out, BOND says Pending. Not earning. Not owned.

That honesty is the product.

What judges can poke today:
• Live dual-chain vaults (Avalanche + BNB)
• Mandate limits + Scan → ALLOCATE / DEFER / REJECT
• Fail-closed preflight (redeemable floor 104 USDC, ≤25% TVL, NAV freshness)
• Public Evidence on Neon — SERV I/O, MCP probes, on-chain reads with block numbers
• httpOnly sessions. No localStorage cosplay. No invented TVL.

We just ran the live BNB lane end to end.

104 USDC. AgentKit signer. Status in-app: Pending.

Verify the subscribe yourself:
https://bscscan.com/tx/0x227cb6a981c773f0e9a4ddb0942b4662f07c2a1453e678bbe2974e2c18d70f0c

Approve tx:
https://bscscan.com/tx/0x7680eaa08f91c39ffffc46d2bc990e3a7cc7a3cd7cae3bf761c24bfd84b8a29b

Subscription in the app:
https://bond-pi.vercel.app/dashboard/subscriptions/a974083b-a637-41e1-9159-45491cf1ec08

Evidence:
https://bond-pi.vercel.app/evidence

Live demo:
https://bond-pi.vercel.app

Code + full proof sheet (bridge + deposit hashes):
https://github.com/henrysammarfo/bond
https://github.com/henrysammarfo/bond/blob/main/docs/memory/LIVE_PROOF.md

AgentKit address we funded:
0x1eFBb041E94aCc18D50C578eD34c265075d3b14e

If your UI lies early, your treasury lies forever.
BOND keeps Pending until proof.

Built with @openservai · AgentKit · Avalanche · BNB Chain
Settlement you can prove.
```

---

## Form Q5 — SERV fill-in-the-blank (pick one)

**Paste this (recommended):**

The moment SERV clicked was when it rejected a live Avalanche deposit that would have blown the concentration cap — before AgentKit spent a wei — then cleared ALLOCATE on BNB so we could sign 104 USDC for real and keep the UI on Pending until shares prove.

**Alts if you want a different stem:**

I'm not building another agent without SERV because an agent wallet without a brain that can say no is just a hot key with a UI.

Before SERV my agent could look smart and still move money dumb. With SERV it has to earn ALLOCATE before anything signs.

If you're building agents without SERV you're shipping vibes with a private key attached.

Without SERV my agent would still be cosplaying settlement — green checks, no proof, no receipts.

---

## Form Q6 — logotype

Upload one of:

- [`docs/brand/bond-logotype-social.png`](../brand/bond-logotype-social.png) — 1024×1024 cream-on-forest
- [`docs/brand/bond-symbol-orbit-1080.png`](../brand/bond-symbol-orbit-1080.png) — orbit symbol
- [`docs/brand/bond-logotype.svg`](../brand/bond-logotype.svg) — vector wordmark

---

## Operator notes

Demo login rotated after recording — see agent artifact `DEMO_LOGIN_ROTATED.txt` (never post).
Footage + VO Hyperframes project: `bond-demo-live/`
