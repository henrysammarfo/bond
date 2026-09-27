# design.md — BOND v2 · RECEIPT LEDGER

Adapted from the PROOF v2 “receipt ledger” brief for BOND Path A.
Product UI follows 71UI light surfaces; motion graphics use ledger paper.

## Palette
| Token | Hex | Use |
| --- | --- | --- |
| paper | `#E8E4DB` | Full-bleed field |
| ink | `#141210` | Display + body |
| rule | `rgba(26,26,26,0.12)` | Hairline grid + left print rule |
| cyan | `#0BB4D9` | Surgical strike / rail ticks |
| allocate | `#1F7A4C` | ALLOW / ALLOCATE flash + word |
| pending | `#C9892E` | PENDING decision |
| deny | `#C4322A` | FAIL-CLOSED / NO |
| ink-soft | `#5A564E` | Mono captions |

## Typography
- Display / decisions: **Oswald Bold** (League Gothic stand-in) — 140–180px kinetic words
- Body / captions / rail: **IBM Plex Mono Medium/Bold** — ≤6 words, never Inter
- Brand lockup: **Montserrat Black** — “BOND” only on open + close

## Layout grammar
- Persistent top ledger rail: clock + `AVALANCHE · PATH A · FAIL-CLOSED`
- Left edge vertical rule grows as beats pass
- Decision moments = 6–8 frame paper color flash, then settle
- No cards in title scenes. Product UI is the only “card” (real stills)
- Warm paper + slow drifting hairline grid (not grain)
- Cyan hairline sweep L→R on scene seams (~0.25s)

## Motion (intentional ×3+)
1. **Kinetic slam** — decision word from offscreen right, overshoot, settle → shrink to top-rail pill
2. **Paper-push** — vertical stacked wipe 0.35–0.45s between scenes (not blur)
3. **Punch-cut** — hard wide → 1.18× crop on decision column, hold ~1.2s
4. Ambient: rail clock ticks; left rule grows; cyan seam sweep

## Captions
IBM Plex Mono, ≤6 words, ink on paper or paper on ink flash.

## Audio
- VO: Liam ElevenLabs, verbatim `script/narration.txt`
- SFX optional: typewriter tick on SERV steps; soft thud on FAIL; clean chime on ALLOCATE; amber tick on PENDING
- BGM: low paper-room bed under VO if present (duck hard)

## Story beats (BOND)
| Time | Beat | Picture |
| --- | --- | --- |
| 0:00–0:08 | OPEN | Paper. “AGENTS GOT WALLETS.” → BOND slam |
| 0:08–0:22 | HOOK | “Most demos lie” + kinetic NO |
| 0:22–0:38 | PATH | SERV → AgentKit → Pending strip |
| 0:38–0:52 | LANDING | Homepage still + mono “the brake.” |
| 0:52–1:08 | VAULTS / SCAN | Punch-cut; ALLOCATE slam + green flash |
| 1:08–1:28 | PENDING | Wallet / Pending amber slam |
| 1:28–1:48 | EVIDENCE | Neon receipts montage |
| 1:48–1:50 | CLOSE | BOND + URLs + ink snap |
