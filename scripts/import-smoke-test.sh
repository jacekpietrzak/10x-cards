#!/usr/bin/env bash
#
# Smoke test for POST /api/import.
#
# Exercises every documented contract path: bearer auth (no token, wrong token,
# correct token), upsert classification (insert vs. update), quote-in-front
# idempotency (the .eq() quote-safe guard), and Zod rejection (oversized back).
#
# Usage:
#   scripts/import-smoke-test.sh <URL> <KEY>
#
# Example (production):
#   scripts/import-smoke-test.sh \
#     https://10x-cards.jackpietrzak.com/api/import \
#     "$(cat ~/.secrets/10x-cards-import-key)"
#
# Exits 0 on full success; exits 1 on the first unexpected response and prints
# which check failed. Leaves 3 test rows in the target environment under fronts
# matching "smoke-test-<unix-timestamp>" (one of them with embedded quotes);
# delete them from the app UI if you ran against prod, or wipe local flashcards
# if local.

set -euo pipefail

URL="${1:?usage: $0 <URL> <KEY>}"
KEY="${2:?usage: $0 <URL> <KEY>}"

FRONT="smoke-test-$(date +%s)"
QFRONT='What is \"FSRS\"? '"$FRONT"   # JSON-escaped " inside the value
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

# post <bearer-header-or-empty> <json-body>
# echoes "<HTTP code> | <body>"
post() {
  local auth_header="$1" body="$2"
  local args=(-s -o "$BODY_FILE" -w "%{http_code}" -X POST "$URL"
              -H "Content-Type: application/json"
              -d "$body")
  [ -n "$auth_header" ] && args+=(-H "$auth_header")
  local code
  code=$(curl "${args[@]}")
  printf "%s | %s" "$code" "$(cat "$BODY_FILE")"
}

# expect <label> <want-code> <want-substring-in-body> <actual-line-from-post>
expect() {
  local label="$1" want_code="$2" want_substr="$3" actual="$4"
  local got_code got_body
  got_code="${actual%% | *}"
  got_body="${actual#* | }"
  if [ "$got_code" != "$want_code" ] || ! grep -qF "$want_substr" <<< "$got_body"; then
    printf '\n❌ FAIL: %s\n   wanted: HTTP %s containing %q\n   got:    HTTP %s body %s\n' \
      "$label" "$want_code" "$want_substr" "$got_code" "$got_body" >&2
    exit 1
  fi
  printf '✓ %s — HTTP %s | %s\n' "$label" "$got_code" "$got_body"
}

printf 'URL:   %s\n' "$URL"
printf 'FRONT: %s\n\n' "$FRONT"

expect "1. no Authorization header → 401" "401" '"Unauthorized"' \
  "$(post "" "{\"cards\":[{\"front\":\"$FRONT\",\"back\":\"x\"}]}")"

expect "2. wrong bearer token → 401" "401" '"Unauthorized"' \
  "$(post "Authorization: Bearer wrong-key" "{\"cards\":[{\"front\":\"$FRONT\",\"back\":\"x\"}]}")"

expect "3. insert (new front) → inserted:1" "200" '"inserted":1,"updated":0' \
  "$(post "Authorization: Bearer $KEY" "{\"cards\":[{\"front\":\"$FRONT\",\"back\":\"v1\"}]}")"

expect "4. update (same front, new back) → updated:1" "200" '"inserted":0,"updated":1' \
  "$(post "Authorization: Bearer $KEY" "{\"cards\":[{\"front\":\"$FRONT\",\"back\":\"v2\"}]}")"

expect "5a. quote-in-front, first call → inserted:1" "200" '"inserted":1,"updated":0' \
  "$(post "Authorization: Bearer $KEY" "{\"cards\":[{\"front\":\"$QFRONT\",\"back\":\"first\"}]}")"

expect "5b. quote-in-front, second call → updated:1 (proves .eq() quote-safe matching)" "200" '"inserted":0,"updated":1' \
  "$(post "Authorization: Bearer $KEY" "{\"cards\":[{\"front\":\"$QFRONT\",\"back\":\"second\"}]}")"

BIG=$(printf 'a%.0s' $(seq 1 501))
expect "6. oversized back (501 chars) → 400" "400" '"too_big"' \
  "$(post "Authorization: Bearer $KEY" "{\"cards\":[{\"front\":\"$FRONT-big\",\"back\":\"$BIG\"}]}")"

cat <<EOF

✅ All 6 contract checks passed.

NOTE: This run wrote 2 test rows to the target environment:
  - front: $FRONT
  - front: What is "FSRS"? $FRONT
The "$FRONT-big" oversized card was correctly rejected (400) and never written.
Delete the two written rows from the app UI (or local DB) when you don't need them.
EOF
