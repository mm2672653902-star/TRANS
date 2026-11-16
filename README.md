# TRANS — 实时同传

Self-use live translator for class: listen to the teacher, read the original
sentence and its translation in real time, keep the history, export a clean
PDF afterwards.

- **Listen:** Deepgram streaming speech-to-text, Nova-3, over WebSocket
  (`wss://api.deepgram.com/v1/listen`, `smart_format`, `interim_results`,
  `utterance_end_ms=1000`, `endpointing=300`). Source language selectable
  (default English).
- **Translate:** Groq chat completions, default `openai/gpt-oss-20b` (fast,
  good for live use; `openai/gpt-oss-120b` is selectable in Settings but
  reasons first, so its first word is slower). One finished sentence at a
  time, original above, translation below, streamed where possible.
  50X is **not** used for live translation — measured first-token latency
  was minutes, which cannot keep up with a live class.
- **No server.** Your phone talks directly to Deepgram and Groq. No backend,
  no VPS, nothing to deploy. Keys live only in your own browser's
  localStorage. This repo contains **no API keys** — not in code, comments,
  or history. If you find one, it is a bug: revoke it.
- **History:** every session is saved locally (localStorage), with list,
  open, search and delete.
- **PDF export:** one click per session, three modes — original only,
  translation only, or bilingual (one English sentence followed by its
  Chinese translation). Export uses the browser's Print-to-PDF, so Chinese
  renders correctly in Noto Sans SC. (jsPDF's built-in fonts cannot render
  Chinese and would show boxes; that is why this app does not use jsPDF
  for text.)

## Open it

- **See the UI / fill in Settings:** open `dist/trans-single.html`
  directly — it is one self-contained file (CSS and JS inlined, no
  external fonts), so it renders fully styled even opened alone.
- **Actually use the microphone in class:** browsers refuse microphone
  access from `file://`. Serve the folder over https or localhost
  (see “Use it in class” below) or use the future APK.
- **One fixed page:** every view (home, live, history, settings) fits
  exactly one phone screen with no page scrolling. Only the sentence
  list, history list and settings form scroll inside their own area.

## Get your keys

1. **Deepgram** (listening): sign up at
   https://console.deepgram.com — a new account gets **$200 free**,
   no expiry, pay-as-you-go, no card needed. Console → API Keys → Create.
2. **Groq** (translation): sign up at https://console.groq.com —
   free tier, no card, no expiry date, rate-limited (free tier for
   `gpt-oss-20b`/`120b`: 30 requests/min, 1,000/day). Console → API Keys →
   Create API Key.

Then open the app → **设置** → paste both keys → **保存设置**. Use
**测试 Groq** / **测试 Deepgram** to check each one.

## Use it in class

1. Serve the folder over https or localhost (microphone needs a secure
   context; `file://` usually blocks it):
   `python3 -m http.server 8000` then open `http://localhost:8000`
   — or host the static files anywhere with https.
2. Pick the source language (what the teacher speaks) and the target
   language (what you want to read). Default: English → 中文.
3. Tap **开始同传**, allow the microphone, and put the phone near the
   teacher. Each finished sentence appears with its translation below.
   The live screen is dark blue; the top shows the language pair, the
   middle shows the sentences (newest at the bottom), and the bottom
   has pause (with a live timer) and stop.
4. **对话 / 同传** at the top only changes how Deepgram cuts sentences:
   对话 cuts sooner (short back-and-forth), 同传 waits longer (continuous
   lecture). **视图** toggles 对照 (original + translation) / 仅译文.
   The speaker button reads the last translation aloud with the
   device's text-to-speech. Pause freezes the recorder and the timer.
5. Tap **停止同传** when the class ends — the session is saved to **历史**.

## Export a PDF

Open **历史** → open a session → **导出 PDF · 双语对照** (or 仅原文 /
仅译文). A print dialog opens — choose **另存为 PDF**. The layout is
A4, generous whitespace, one numbered entry per sentence.

## Network note — mainland China

Deepgram and Groq are overseas services and usually need a VPN/proxy
(梯子) to reach reliably from mainland China — a direct connection often
times out or is very slow. If live transcription or translation fails or
stalls, turn on your VPN and retry, picking a low-latency US/HK node.
When the app hits a network error it shows “网络不通？试试开梯子再重试”
instead of a raw error message.

## Balance feature — public vs private

- **Public / open-source build (this repo): NO balance feature.**
  There is no Deepgram balance display, no quota line, no balances API
  call and no refresh button. The feature is off by default
  (`enableBalance: false` in `config.js`).
- **Private / internal build only:** the Deepgram dollar balance
  (`GET /v1/projects` then `GET /v1/projects/{id}/balances`, shown as
  “Deepgram 剩余 $200.00” in Settings, with a refresh button) is enabled
  by a build-time flag. See [PRIVATE-BUILD.md](PRIVATE-BUILD.md).
  There is no Groq balance display in either build — Groq has no
  dollar-balance API, so there is nothing real to show.

## Honest limitations (verified, not guessed)

- **Deepgram balance in a browser:** Deepgram's REST API does not send
  permissive CORS headers (its own SDK docs: “we do not support custom
  CORS origins”), so a pure web page usually *cannot* read the balance —
  the private build shows “无法读取” in that case. This does **not**
  affect live transcription, which uses WebSocket auth via
  `Sec-WebSocket-Protocol: ["token", key]` and works from the browser.
  The accurate balance is always in the Deepgram console.
- **Groq from a browser:** verified live — Groq returns
  `access-control-allow-origin: *` on both the preflight and the chat
  response, so direct browser calls work with no proxy.
- **Microphone:** needs https/localhost and a microphone permission;
  on Android use Chrome/Edge. MediaRecorder sends Opus/WebM chunks to
  Deepgram; very long monologues are split into sentences on punctuation
  and on Deepgram's `UtteranceEnd`.

## Android (APK) later

The app is a static page, ready to wrap with Capacitor
(`capacitor.config.json` is included; `appId: app.trans.live` —
decided). In the APK you will also need microphone permission in the
WebView. Keys are still entered in Settings, unless you use the
private build (see [PRIVATE-BUILD.md](PRIVATE-BUILD.md)).

## Publishing (decided: repo `TRANS`, appId `app.trans.live`)

- **GitHub repo name: `TRANS`** (decided 2026-11-17).
- **Capacitor appId: `app.trans.live`** (decided 2026-11-17).
- Full step-by-step checklist: [PUBLISH-CHECKLIST.md](PUBLISH-CHECKLIST.md).
  Nothing has been published or pushed yet — that step still needs a
  “推” from the owner.

## Tests

`node test/test.js` — checks the Deepgram URL, sentence splitting, the
balance flag default, the PDF HTML in all three modes, and that no key
is present in the shipped files. No network, no keys.

## Design

TRANS. Home is bright and light (warm off-white, ink-black text, one
bright-blue accent `#2563eb`): big centred title, a blue sample card,
clean language rows, one huge blue start button, a floating bottom nav.
The live screen is dark blue (`#0b2a6b → #155e9c`) with white text.
No gradients on light screens, no glass, no emoji. The icon
(`assets/icon.svg`, `icon-512.png`, `icon-192.png`) is bright, not
dark: a bold **T** on a light mint background, its top bar split
deep-teal / bright-teal — speech in, translation out — with a teal
full stop underneath.

Deliberately, the app itself contains **no grey helper text, hints or
explanations** — no key notice, no mic note, no “why not 50X”, no
safety reminders. Only titles, labels, buttons, inputs, sentences and
timers are on screen. All instructions live in this README, not
inside the app.
