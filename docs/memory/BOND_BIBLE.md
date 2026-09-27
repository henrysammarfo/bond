# BOND — SERV Edition 01 (second team)

Source: uploaded Bible (word-for-word). Live corrections below are labeled.

Henry submits **PROOF** on AgentKit. This team submits **BOND** on **RWA Vaults**. One submission wins one track. The wallet and SERV are in the demo so the overall prize can see them. They do not create a second track prize. Submit **28 Sep 2026 00:00 UTC**.

## Soft

The agent bought the bond. The vault has not finished. The books do not show it yet.

## Why this lane is empty

The room already shipped the spend gate. AllowLatch, VaultOS, Unbribable, Hatrey, and Ledgerly are that product. Steward Pay is WhatsApp stock buys on Robinhood. Tern is preference agents on Robinhood testnet. ServPit is a game. Do not join that pile.

IXS, in the hackathon chat on 25 Sep, from Ruimtepak relaying the IXS team:

- No public testnet. The Base Sepolia vault and the API’s BSC, Fuji, and Arc vaults are not for this hackathon. `VAULT_NOT_FOUND` is expected.
- Two mainnet vaults. BNB Chain `0xc975a3EeF2e49F8eDdEf585340C43f15300fCB82`. Avalanche `0xaD01573b459805E3954398796203d830B57A8bD9`.
- Minimum deposit **$100 USDC, real funds**. No test USDC. No gas support. The floor is not lowered for the hackathon.
- Vaults are async ERC-7540. IXS finalizes on their side. An unsigned transaction does not count. They read the track as real TVL.
- A later reply on 27 Sep: show **Pending** until they process it. That label is the honest one.

## What BOND does

SERV decides whether this mandate may subscribe. AgentKit’s wallet sends the deposit to the Avalanche vault. Until IXS finalizes, the screen says Pending and the position is not yield. When the shares exist, the screen shows them. A log that claims the bond before the shares exist is a failed demo.

## 8-second

Mandate allows $100. Deposit lands on Avalanche. Screen: Pending. Not “earning.” After IXS finalizes, the shares appear. Pull the vault read and the app must not invent a balance.

## Cost

This track costs $100 of real USDC plus gas. If that money is not available, do not enter RWA Vaults. A mock will not win it.

## Who

A treasury that wants a licensed bond and will not let an agent mark it owned early. Users logged: zero.

## Live corrections (2026-09-27)

Verified via `GET https://api-v2.ixs.finance/vaults` (not invented):

| Role | Vault ID | Chain | Contract | Whitelist |
| --- | --- | --- | --- | --- |
| **Primary** | `6a952729732c2b84b55ce89d` | Avalanche 43114 | `0xaD01573b459805E3954398796203d830B57A8bD9` | `false` |
| Secondary browse | `6a26624ca7d16b245d665475` | BSC 56 | `0xc975a3EeF2e49F8eDdEf585340C43f15300fCB82` | `false` |

Avalanche USDC: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (6 decimals). Product name: IX High Yield Bond (USDC).
