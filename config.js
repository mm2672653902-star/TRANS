/* TRANS build config — this file IS committed.
 *
 * deepgramKey / groqKey: ALWAYS empty here. A build script may write keys
 * into a GENERATED config.js inside dist/ only. Never put a real key in
 * this file, and never commit a generated one.
 *
 * lockedKeys: false → default (public). Settings shows the key fields,
 *   Save and Clear buttons; the user enters their own keys.
 * lockedKeys: true  → private build only, set at build time by
 *   scripts/build-private.sh. The key fields, Save and Clear buttons
 *   are removed from Settings so the baked-in keys cannot be edited
 *   or deleted by accident. Only the two test buttons remain.
 *
 * There is no balance display in the app: Deepgram's balance API
 * cannot be read from a browser/WebView, so the feature was removed
 * entirely. Check the balance in the Deepgram console.
 */
window.TRANS_CONFIG = {
  lockedKeys: false,
  deepgramKey: '',
  groqKey: ''
};
