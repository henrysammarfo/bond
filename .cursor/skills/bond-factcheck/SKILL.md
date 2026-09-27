---
name: bond-factcheck
description: Fact-checks BOND claims via live IXS API, Tavily, and TinyFish. Use before writing vault addresses, prizes, deadlines, or marketing stats.
---

# BOND Factcheck

## Ritual

1. Prefer primary sources: `https://api-v2.ixs.finance/vaults`, `https://www.openserv.ai/hackathon`, IXS MCP docs.
2. Tavily: `POST https://api.tavily.com/search` with `TAVILY_API_KEY` — if quota exceeded, note in SESSION_LOG and continue with primary sources.
3. TinyFish: `POST https://agent.tinyfish.ai/v1/automation/run` with header `X-API-Key`. If wallet empty, link Pay $10 and skip — do not invent scrape results.
4. Write results into `docs/memory/` with fetch date. Mark unverified explicitly.
5. Never fabricate competitor TVL, insurance %, or partner logos.

## Output

Update the relevant memory MD; append a line to `SESSION_LOG.md`.
