#!/usr/bin/env bash
set -euo pipefail
bash /app/scripts/tor-start.sh
exec bun /app/scripts/agentrouter-relay.ts
