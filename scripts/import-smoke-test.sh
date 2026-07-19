#!/usr/bin/env bash
#
# Smoke test for POST /api/import (full CRUD).
#
# Exercises every documented contract path: bearer auth (no token, wrong token,
# correct token), upsert classification (insert vs. update), quote-in-front
# idempotency (the .eq() quote-safe guard), Zod rejection (oversized back),
# patch (rename preserving row id), rename-conflict skip (skipped_patches),
# and delete via delete_fronts.
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
# which check failed. Cleans up after itself: the final checks delete every row
# the run created via delete_fronts and prove zero residue with an idempotent
# re-delete, so no manual UI cleanup is needed. (Only exception: an early exit 1
# mid-run can leave up to 2 rows under fronts matching
# "smoke-test-<unix-timestamp>" — delete those from the app UI.)

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

expect "7. patch (rename + new back) → patched:1" "200" '"patched":1' \
  "$(post "Authorization: Bearer $KEY" "{\"patches\":[{\"old_front\":\"$FRONT\",\"new_front\":\"$FRONT-renamed\",\"new_back\":\"v3\"}]}")"

expect "8. conflicting rename → skipped with new_front_conflict, patched:0" "200" '"new_front_conflict"' \
  "$(post "Authorization: Bearer $KEY" "{\"patches\":[{\"old_front\":\"$QFRONT\",\"new_front\":\"$FRONT-renamed\",\"new_back\":\"x\"}]}")"

expect "9. delete both smoke rows → deleted:2 (self-cleanup)" "200" '"deleted":2' \
  "$(post "Authorization: Bearer $KEY" "{\"delete_fronts\":[\"$FRONT-renamed\",\"$QFRONT\"]}")"

expect "10. re-delete same fronts → deleted:0 (idempotent, zero residue)" "200" '"deleted":0' \
  "$(post "Authorization: Bearer $KEY" "{\"delete_fronts\":[\"$FRONT-renamed\",\"$QFRONT\"]}")"

cat <<EOF

✅ All 10 contract checks passed.

This run cleaned up after itself: both written rows ("$FRONT-renamed" and the
quote-in-front row) were deleted via delete_fronts in check 9, and check 10
proved zero residue. The "$FRONT-big" oversized card was correctly rejected
(400) and never written. No manual cleanup needed.
EOF
