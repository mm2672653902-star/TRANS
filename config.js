/* TRANS build config — defaults (this file IS committed).
 *
 * enableBalance: false  → default. No balance display at all: no Deepgram
 *   balance line, no refresh button, no balances API call. The quota
 *   section stays hidden and fetchDeepgramBalance is never called.
 * enableBalance: true   → optional. Set at build time by a build script
 *   (which writes a generated config into dist/, never into this repo).
 *   Shows the Deepgram dollar balance in Settings.
 *
 * deepgramKey / groqKey: ALWAYS empty here. A build script may write keys
 * into a GENERATED config.js inside dist/ only. Never put a real key in
 * this file, and never commit a generated one.
 */
window.TRANS_CONFIG = {
  enableBalance: false,
  deepgramKey: '',
  groqKey: ''
};
