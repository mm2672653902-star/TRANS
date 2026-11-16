# TRANS — Private / internal build (DO NOT PUBLISH THIS FILE'S OUTPUT)

This file is for the owner's private build only. It is in the repo so the
process is documented, but **nothing it produces may be committed or
shared**. The public build (see [README.md](README.md)) has no balance
feature and no pre-filled keys.

## What is different in the private build

1. **Balance ON.** `enableBalance: true` (public default is `false` in
   `config.js`). Only then the app shows the Deepgram dollar balance in
   Settings (“Deepgram 剩余 $200.00”) plus a tiny hint on the Live screen,
   with one refresh button. The app calls
   `GET https://api.deepgram.com/v1/projects` then
   `GET https://api.deepgram.com/v1/projects/{project_id}/balances`
   with your Deepgram key, when Settings is opened and when you tap
   refresh. Missing/invalid key shows “未填写 / 无法读取” — never a
   made-up number.
2. **Keys pre-filled.** The private build seeds your two keys into the
   app so you do not have to type them after every update.

There is no Groq balance display in the private build either — Groq has
no dollar-balance API.

## How to build it — keys never touch git

Keys are injected **at build time only**, from environment variables /
CI secrets, into a *generated* `config.js` inside `dist-private/`.
`dist-private/` is gitignored. The repo's own `config.js` always stays
`enableBalance: false` with empty keys.

```sh
# Locally (keys stay in your shell history — prefer CI, below):
TRANS_DG_KEY='...' TRANS_GROQ_KEY='...' sh scripts/build-private.sh
# → dist-private/ with enableBalance: true and keys in its config.js
```

GitHub Actions (recommended): store the keys as repository secrets
(`TRANS_DG_KEY`, `TRANS_GROQ_KEY`), then in the workflow:

```yaml
- run: sh scripts/build-private.sh
  env:
    TRANS_DG_KEY: ${{ secrets.TRANS_DG_KEY }}
    TRANS_GROQ_KEY: ${{ secrets.TRANS_GROQ_KEY }}
```

Then wrap `dist-private/` with Capacitor and build the APK from there.
Before every build, check `git status` — `dist-private/` must never
appear, and no key may appear in any tracked file. Run
`node test/test.js` first; it fails the build if a key-shaped string is
found in the shipped files.

## Plain risk warning — read this

**An APK can be decompiled and keys extracted.** A pre-filled private
APK is convenient, but anyone who gets the file can pull both API keys
out of it and spend your Deepgram $200 / use your Groq quota. So:

- Never share, upload, or forward the private APK. Not to a friend,
  not to a group chat, not as a “test”.
- Only install it on your own phone.
- If it ever leaks, revoke both keys immediately (Deepgram console →
  API Keys → delete; Groq console → API Keys → delete) and create new
  ones, then rebuild.

## Known limitation of the balance display

Even in the private build, the Deepgram balance read can fail in a
browser/WebView: Deepgram's REST API does not send permissive CORS
headers, so the call is often blocked and the app shows “无法读取”.
That is honest behaviour, not a bug in your key, and it does not affect
live transcription (WebSocket). If you need the balance to work inside
the APK, the fix is a native HTTP call (e.g. Capacitor's native HTTP
plugin, which is not subject to WebView CORS) — that is future work,
not included in this version. The accurate balance is always in the
Deepgram console.
