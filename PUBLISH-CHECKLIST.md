# TRANS — publish checklist

Decided 2026-11-17: **GitHub repo name `TRANS`**, **Capacitor appId
`app.trans.live`** (already set in `capacitor.config.json`).

Do NOT run any step below until the owner says “推”.

## Pre-flight (already done 2026-11-17, re-run before pushing)

- [x] `node test/test.js` — 8/8 test groups pass.
- [x] `python3 scripts/build-single.py` — `dist/trans-single.html`
      rebuilt (55,352 bytes, CSS/JS inlined, bright icon, no keys).
- [x] Headless-Chromium check at 390×844 — home and live render
      correctly, no page-level scroll, no grey helper text in the app.
- [x] No API keys anywhere: `config.js` has empty keys and
      `enableBalance: false`; test group 7 greps all shipped files for
      `gsk_…` / 40-hex key shapes. (`dist/` is gitignored anyway.)
- [x] Public build has no balance feature and no Groq quota display.
- [x] README documents usage; PRIVATE-BUILD.md documents the
      Secrets-based private build (never committed, never shared).

## Publish the public repo

1. `cd ~/workspace/live-translator`
2. `git init && git add . && git status` — confirm `dist/`,
   `dist-private/`, `.env*` are NOT listed (see `.gitignore`).
3. `git commit -m "TRANS v1: live simultaneous translation (Deepgram + Groq)"`
4. Create the GitHub repo **`TRANS`** (public, no README/license
   auto-added — the repo already has `README.md`).
5. `git remote add origin <repo URL>` and `git push -u origin main`
   (or `master`, whichever the local branch is).
6. Confirm on GitHub: README renders, no keys in any file, no
   `dist-private/` present.

## After publishing (separate steps, owner decides when)

- Private repo / private build: follow `PRIVATE-BUILD.md` — keys only
  via GitHub Secrets (`TRANS_DG_KEY`, `TRANS_GROQ_KEY`), build
  `dist-private/` in CI, never commit it, never share the private APK.
- Android APK: wrap with Capacitor (`appId: app.trans.live`),
  microphone permission in the WebView, real classroom test with the
  owner's own keys + VPN.
