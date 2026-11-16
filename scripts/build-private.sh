#!/bin/sh
# TRANS private build — generates dist-private/ from the public source.
# - Flips ENABLE_BALANCE to true (private only; public default is false).
# - Optionally pre-fills keys from environment variables into the GENERATED
#   config.js inside dist-private/ only. Keys NEVER go into this repo.
# Usage (keys optional — without them the app just asks for keys on first run):
#   TRANS_DG_KEY='...' TRANS_GROQ_KEY='...' sh scripts/build-private.sh
#   # then wrap dist-private/ with Capacitor to build the APK (see PRIVATE-BUILD.md).
# WARNING: an APK can be decompiled and keys extracted. Never share the
# private APK with anyone. If it ever leaks, revoke both keys immediately.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist-private"
rm -rf "$OUT"
mkdir -p "$OUT"
cp "$ROOT/index.html" "$ROOT/app.js" "$ROOT/styles.css" "$ROOT/config.js" \
   "$ROOT/capacitor.config.json" "$ROOT/manifest.webmanifest" "$ROOT/README.md" "$OUT/"
cp -r "$ROOT/assets" "$OUT/assets"
# Flip the flag in the GENERATED copy only (code line, not the comments).
# The repo's config.js stays false.
sed -i 's/  enableBalance: false,/  enableBalance: true,/' "$OUT/config.js"
if [ -n "${TRANS_DG_KEY:-}" ]; then
  python3 - "$OUT/config.js" "$TRANS_DG_KEY" <<'PY'
import sys
p, key = sys.argv[1], sys.argv[2]
t = open(p, encoding='utf-8').read()
t = t.replace("deepgramKey: ''", "deepgramKey: '" + key.replace("'", "\\'") + "'")
open(p, 'w', encoding='utf-8').write(t)
PY
fi
if [ -n "${TRANS_GROQ_KEY:-}" ]; then
  python3 - "$OUT/config.js" "$TRANS_GROQ_KEY" <<'PY'
import sys
p, key = sys.argv[1], sys.argv[2]
t = open(p, encoding='utf-8').read()
t = t.replace("groqKey: ''", "groqKey: '" + key.replace("'", "\\'") + "'")
open(p, 'w', encoding='utf-8').write(t)
PY
fi
echo "Private build written to: $OUT"
echo "Verify before building the APK: 'git status' must NOT list dist-private/,"
echo "and no key may appear in any tracked file."
echo "Do NOT commit $OUT. Do NOT share the APK built from it."
