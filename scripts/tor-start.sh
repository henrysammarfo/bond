#!/usr/bin/env bash
# Start a local Tor SOCKS proxy for AgentRouter (cloud VMs hit Aliyun WAF without Tor).
set -euo pipefail
RUN_DIR="${BOND_TOR_DIR:-/tmp/bond-tor-run}"
SOCKS_PORT="${BOND_TOR_SOCKS_PORT:-9050}"
mkdir -p "$RUN_DIR"
if curl -sS --max-time 5 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://api.ipify.org >/dev/null 2>&1; then
  echo "Tor ready socks5h://127.0.0.1:${SOCKS_PORT}"
  exit 0
fi
# If something already bound 9050 but curl failed once, wait briefly and re-check
if ss -ltn 2>/dev/null | grep -q ":${SOCKS_PORT} " || netstat -ltn 2>/dev/null | grep -q ":${SOCKS_PORT} "; then
  sleep 2
  if curl -sS --max-time 8 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://api.ipify.org >/dev/null 2>&1; then
    echo "Tor ready socks5h://127.0.0.1:${SOCKS_PORT}"
    exit 0
  fi
fi
if ! command -v tor >/dev/null 2>&1; then
  echo "tor not installed. Run: sudo apt-get install -y tor" >&2
  exit 1
fi
cat >"$RUN_DIR/torrc" <<EOF
SocksPort 127.0.0.1:${SOCKS_PORT}
DataDirectory ${RUN_DIR}/data
Log notice file ${RUN_DIR}/tor.log
EOF
mkdir -p "$RUN_DIR/data"
# Kill stale instance if any
if [[ -f "$RUN_DIR/tor.pid" ]]; then
  kill "$(cat "$RUN_DIR/tor.pid")" 2>/dev/null || true
  rm -f "$RUN_DIR/tor.pid"
fi
tor -f "$RUN_DIR/torrc" --RunAsDaemon 1 --PidFile "$RUN_DIR/tor.pid"
for i in $(seq 1 60); do
  if curl -sS --max-time 3 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://api.ipify.org >/dev/null 2>&1; then
    echo "Tor ready socks5h://127.0.0.1:${SOCKS_PORT}"
    exit 0
  fi
  sleep 1
done
echo "Tor bootstrap timeout — see ${RUN_DIR}/tor.log" >&2
tail -40 "$RUN_DIR/tor.log" >&2 || true
exit 1
