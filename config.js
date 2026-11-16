/* TRANS build config — PUBLIC defaults (this file IS committed).
 *
 * enableBalance: false  → public build. No balance/quota feature at all:
 *   no Deepgram balance line, no refresh button, no balances API call.
 *   The quota section stays hidden and fetchDeepgramBalance is never called.
 * enableBalance: true   → PRIVATE build only. Set at build time by
 *   scripts/build-private.sh (which writes a generated config into dist/,
 *   never into this repo). Shows the Deepgram dollar balance in Settings.
 *
 * deepgramKey / groqKey: ALWAYS empty here. In a private build the build
 * script may write keys into a GENERATED config.js inside dist/ only.
 * Never put a real key in this file, and never commit a generated one.
 */
window.TRANS_CONFIG = {
  enableBalance: false,
  deepgramKey: '',
  groqKey: ''
};
