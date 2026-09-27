# BOND — Full Brand, Website, and Interactive Dashboard

## Goal
Create a polished BOND product experience for treasury and crypto-native teams. The site will adapt the supplied Orbit template’s cinematic black-space composition, precise typography, glass controls, entrance motion, and responsive behavior into BOND’s own identity rather than copying Orbit’s product content.

The product will be an interactive demo. It will not connect wallets, move funds, or claim live balances.

## Brand and logo
- Develop two distinct BOND logo concepts suitable for the website, hoodies, and future merchandise.
- Keep both concepts bold, recognizable at small sizes, reproducible in one color, and usable on light or dark fabric.
- Select the strongest concept for the initial site identity, with a compact symbol, full BOND logo, and favicon treatment.
- Establish a coherent brand system around deep black, crisp white, restrained mint, and violet highlights inspired by the supplied template artwork.
- Use premium-quality generated artwork and logo assets, inspecting text, silhouette, transparency, and small-size legibility before adoption.

## Public website
Build complete responsive routes with shared navigation and distinct page metadata:

- `/` — cinematic BOND home page based on the supplied template structure
- `/product` — mandate-controlled bond subscription workflow
- `/vaults` — available RWA vaults and transparent status states
- `/how-it-works` — Allow → Deposit → Pending → Shares lifecycle
- `/pricing` — clear demo pricing tiers without inventing operational fees
- `/contact` — contact and demo-request form experience
- `/about` — company purpose and operating principles
- `/security` — safeguards, mandate checks, and honest state reporting
- `/docs` — structured product documentation and quick-start content
- `/blog` — article index with complete sample article pages
- `/terms`, `/privacy`, `/risk-disclosure`, `/compliance` — complete legal-information layouts, clearly labeled as demo copy where professional review is required

## Dashboard and flows
Build an application shell with desktop sidebar and compact mobile navigation:

- `/dashboard` — treasury overview, allocation, pending subscriptions, and recent activity
- `/dashboard/mandates` — mandate list, detail, creation, editing, and approval simulation
- `/dashboard/vaults` — browse and compare BNB Chain and Avalanche vaults
- `/dashboard/vaults/$vaultId` — vault detail, disclosures, transaction path, and subscribe action
- `/dashboard/subscriptions` — full list with Pending, Finalized, and Rejected filtering
- `/dashboard/subscriptions/$subscriptionId` — lifecycle timeline, transaction reference, and share status
- `/dashboard/activity` — auditable event log
- `/dashboard/wallet` — simulated SERV/USDC balances, network state, and connection controls
- `/dashboard/settings` — treasury profile, notifications, team, and display preferences

Primary demo flow:

```text
Choose vault → Check $100 mandate → Review terms → Confirm demo deposit
→ Pending (not earning) → Simulate IXS finalization → Shares appear
```

- Preserve the BOND Bible’s core truth: a submitted deposit stays **Pending** until shares exist.
- Never label pending value as owned, invested, yielding, or earning.
- Include clear empty, loading, validation, rejected, insufficient-balance, wrong-network, pending, and finalized states.
- Use realistic local demo data only; page refreshes may reset the simulation.

## Visual and interaction direction
- Preserve the template’s first-screen impact: black upper field, immersive space artwork, centered headline, glass announcement pill, compact navigation, and coordinated entrance reveal.
- Replace Orbit’s planet artwork with a cohesive BOND visual world that communicates regulated assets, orbital settlement, and verification without generic crypto imagery.
- Extend the same design language into editorial public pages and a denser, restrained dashboard.
- Use Lucide’s professional icon set consistently; no emoji or improvised text symbols.
- Add purposeful motion, keyboard focus, reduced-motion support, accessible dialogs/forms, and responsive layouts across phone and desktop.

## Content rules
- Position BOND for treasury teams and crypto-native operators equally.
- Use the verified Bible facts: Avalanche and BNB Chain vault addresses, async ERC-7540 lifecycle, $100 USDC minimum, real-funds warning, and no public testnet.
- Present this build as a product demo and avoid fabricated usage metrics, partners, yields, certifications, customer claims, or live transaction data.
- Keep risk and legal language clear; note where final copy requires legal review.

## Technical implementation
- Build within the existing TanStack Start application using reusable React components and Tailwind v4 semantic tokens.
- Create every linked route in the same implementation batch and give each content route unique title, description, Open Graph, and Twitter metadata.
- Use local typed fixtures and React state for all dashboard interactions; no database, wallet provider, or backend is needed for this demo.
- Store generated visual assets in the project asset flow and use the selected logo consistently across navigation, dashboard, and favicon.
- Validate the finished experience with the preview build, console checks, and Playwright screenshots at desktop and mobile sizes.

## Deliverable boundary
Included: complete branded public site, all listed legal/company pages, full interactive dashboard, realistic demo states, generated BOND logo/art direction, responsive behavior, and accessibility.

Not included: real wallet connection, mainnet transactions, persistent accounts, live vault reads, production legal approval, or deployment.