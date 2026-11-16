# TRANS — 实时同传

> 本文档为双语：中文在前，英文在后。
> This document is bilingual: Chinese first, English below.

---

## 中文使用说明

### 简介

上课自用的实时同传：听老师讲课，实时看到原文句子和翻译，保存历史，课后导出干净的 PDF。

- **听写：** Deepgram 流式语音转文字，Nova-3，走 WebSocket（`wss://api.deepgram.com/v1/listen`，`smart_format`、`interim_results`、`utterance_end_ms=1000`、`endpointing=300`）。原语言可选（默认英语）。
- **翻译：** Groq 聊天接口，默认 `openai/gpt-oss-20b`（快，适合实时；设置里也能选 `openai/gpt-oss-120b`，但它会先推理，首字更慢）。每说完一句翻一句，原文在上、译文在下，尽量流式显示。50X **不用**于实时翻译——实测首字要等几分钟，课堂上跟不上。
- **没有服务器。** 手机直接连 Deepgram 和 Groq，没有后端、没有 VPS、不用部署。Key 只存在你自己浏览器的 localStorage 里。本仓库**没有任何 API Key**——代码、注释、提交记录里都没有。如果发现了 Key，那是 bug，请立刻吊销。
- **历史：** 每节课自动保存在本地（localStorage），可以查看、打开、搜索、删除。
- **导出 PDF：** 每节课一键导出，三种模式——仅原文、仅译文、双语对照（原文一句、译文一句，逐句交替）。导出用浏览器的“打印为 PDF”，中文用 Noto Sans SC 渲染不会变方框。（jsPDF 的内置字体渲染不了中文会变方框，所以本软件不用 jsPDF 输出文字。）

### 打开方式

- **看界面 / 填设置：** 直接打开 `dist/trans-single.html`——它是单个自包含文件（样式和代码都内联了，没有外部字体），单独打开也能完整显示样式。
- **课堂上真正用麦克风：** 浏览器不允许 `file://` 打开麦克风。需要用 https 或 localhost 打开（见下面“课堂使用”），或者用 APK。
- **一页定死：** 每个界面（首页、直播、历史、设置）都正好一屏，不用往下滑。只有句子列表、历史列表和设置表单在各自区域内滚动。

### 获取 Key

1. **Deepgram**（听写）：去 https://console.deepgram.com 注册——新号有 **$200 免费额度**，不过期，按量计费，不用绑卡。控制台 → API Keys → Create。
2. **Groq**（翻译）：去 https://console.groq.com 注册——免费层，不用绑卡，没有到期时间，按次数限流（`gpt-oss-20b` / `120b` 免费层：每分钟 30 次、每天 1000 次）。控制台 → API Keys → Create API Key。

然后打开软件 → **设置** → 粘贴两个 Key → **保存设置**。用**测试 Groq** / **测试 Deepgram** 分别检查。

### 课堂使用

1. 先用 https 或 localhost 打开（麦克风需要安全上下文，`file://` 一般会被拦）：`python3 -m http.server 8000`，再打开 `http://localhost:8000`——或者把静态文件托管到任何支持 https 的地方。
2. 选原语言（老师讲什么语言）和目标语言（你想看什么语言）。默认：英语 → 中文。
3. 点**开始同传**，允许麦克风，把手机放在老师附近。每说完一句，下面就会出现翻译。直播页是深蓝底，顶部显示语言对，中间是句子（最新的一句在最下面），底部是暂停（带计时）和停止。
4. 顶部的**对话 / 同传**只改 Deepgram 的断句方式：对话切得快（适合一句一句轮着说），同传等得久（适合连续讲课）。**视图**切换对照（原文 + 译文）/ 仅译文。喇叭按钮用手机自带的语音朗读最后一条译文。暂停会同时停住录音和计时。
5. 下课点**停止同传**，这节课就保存到**历史**里了。

### 导出 PDF

打开**历史** → 打开一节课 → **导出 PDF · 双语对照**（或仅原文 / 仅译文）。会弹出打印框，选**另存为 PDF**。版式是 A4、留白大，每句带编号；双语模式是一句原文、一句译文逐句交替。

### 网络说明——中国大陆

Deepgram 和 Groq 都是海外服务，在大陆直连通常需要梯子（VPN / 代理），直连经常超时或很慢。如果听写或翻译失败、卡住，先开梯子再试，选延迟低的美国 / 香港节点。软件遇到网络错误会显示“网络不通？试试开梯子再重试”，不会直接甩原始报错。

### 额度功能——公开版和私有版

- **公开 / 开源版（本仓库）：没有额度功能。** 没有 Deepgram 余额显示，没有额度行，不调用余额接口，没有刷新按钮。这个功能默认就是关的（`config.js` 里 `enableBalance: false`）。
- **仅私有 / 内部版：** Deepgram 美元余额（调 `GET /v1/projects` 再调 `GET /v1/projects/{id}/balances`，在设置里显示为“Deepgram 剩余 $200.00”，带刷新按钮）靠编译时开关打开。见 [PRIVATE-BUILD.md](PRIVATE-BUILD.md)。两个版本都没有 Groq 额度显示——Groq 没有美元余额接口，没东西可显示。

### 已知限制（都实测过，不是猜的）

- **浏览器里读 Deepgram 余额：** Deepgram 的 REST 接口不发宽松的 CORS 头（官方 SDK 文档原话：“we do not support custom CORS origins”），所以纯网页经常**读不到**余额，私有版会显示“无法读取”。这**不影响**实时听写——听写走 WebSocket，用 `Sec-WebSocket-Protocol: ["token", key]` 鉴权，在浏览器里能正常工作。准确的余额永远以 Deepgram 控制台为准。
- **浏览器里调 Groq：** 实测过——Groq 在预检和聊天响应里都返回 `access-control-allow-origin: *`，浏览器直连能用，不用代理。
- **麦克风：** 需要 https / localhost 和麦克风权限；安卓上用 Chrome / Edge。MediaRecorder 把 Opus / WebM 音频块发给 Deepgram；很长的独白会按标点和 Deepgram 的 `UtteranceEnd` 切成句子。

### 安卓 APK

软件是静态页面，用 Capacitor 打包（`capacitor.config.json` 已包含，`appId: app.trans.live`）。APK 由 GitHub Actions（`.github/workflows/build-apk.yml`）编译，发布为 Release 附件——是 debug 包，安装时允许“安装未知来源应用”即可。

- **公开版 APK** — [TRANS Releases](https://github.com/mm2672653902-star/TRANS/releases)，文件 `TRANS-public-v1.0.0.apk`。干净版：里面没有 Key，没有 Deepgram 余额功能。装好后在设置里填你自己的 Deepgram + Groq Key。
- **私有版 APK** — [TRANS-private Releases](https://github.com/mm2672653902-star/TRANS-private/releases)，文件 `TRANS-private-v1.0.0.apk`。Key 只在编译时从仓库 Secrets `TRANS_DG_KEY` / `TRANS_GROQ_KEY` 注入（见 [PRIVATE-BUILD.md](PRIVATE-BUILD.md)），Deepgram 余额显示是开的。**千万不要分享私有版 APK**——反编译就能抠出 Key。

如果 Actions 报错 “Missing Secrets TRANS_DG_KEY and/or TRANS_GROQ_KEY”，去私有仓库的 Settings → Secrets and variables → Actions 里填好这两个 Secret，再从 Actions 页面重新运行工作流。还有一个已知坑：Muse 的 GitHub 接入写不了 `.github/workflows/` 下的文件（GitHub 返回 403），所以工作流文件要先在 GitHub 网页上手动加一次（Add file → Create new file → 粘贴工作流内容）；加好之后，每次推到 `main` 都会自动重新编译、重新发布 APK。

### 发布信息（已定：仓库 `TRANS`，appId `app.trans.live`）

- **GitHub 仓库名：`TRANS`**（2026-11-17 定）。
- **Capacitor appId：`app.trans.live`**（2026-11-17 定）。
- **公开库：** https://github.com/mm2672653902-star/TRANS
- **私有库：** https://github.com/mm2672653902-star/TRANS-private
- 完整发布步骤见 [PUBLISH-CHECKLIST.md](PUBLISH-CHECKLIST.md)。

### 测试

`node test/test.js`——检查 Deepgram 地址、断句、余额开关默认值、三种模式的 PDF、以及 shipped 文件里没有 Key。不联网，不用 Key。

### 界面设计

TRANS。首页明亮浅色（暖米白底、墨色字、一个亮蓝强调色 `#2563eb`）：居中的大标题、蓝色示例卡、干净的语言行、一个巨大的蓝色开始按钮、底部悬浮导航。直播页是深蓝（`#0b2a6b → #155e9c`），白字。浅色页没有渐变、没有毛玻璃、没有 emoji。图标（`assets/icon.svg`、`icon-512.png`、`icon-192.png`）是明亮的：浅薄荷底上一个粗体 **T**，顶横分深青 / 亮青两段——语音进、翻译出——下面一个青色句点。

软件里**没有任何灰色小字说明**——没有 Key 提示、没有麦克风提示、没有“为什么不用 50X”、没有安全提醒。屏幕上只有标题、标签、按钮、输入框、句子和计时。所有使用说明都在这篇 README 里，不在软件里。

---

## English

### What it is

A self-use live translator for class: listen to the teacher, read the
original sentence and its translation in real time, keep the history,
export a clean PDF afterwards.

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
  translation only, or bilingual (one original sentence, then its
  translation, alternating line by line). Export uses the browser's
  Print-to-PDF, so Chinese renders correctly in Noto Sans SC. (jsPDF's
  built-in fonts cannot render Chinese and would show boxes; that is why
  this app does not use jsPDF for text.)

### Open it

- **See the UI / fill in Settings:** open `dist/trans-single.html`
  directly — it is one self-contained file (CSS and JS inlined, no
  external fonts), so it renders fully styled even opened alone.
- **Actually use the microphone in class:** browsers refuse microphone
  access from `file://`. Serve the folder over https or localhost
  (see “Use it in class” below) or use the APK.
- **One fixed page:** every view (home, live, history, settings) fits
  exactly one phone screen with no page scrolling. Only the sentence
  list, history list and settings form scroll inside their own area.

### Get your keys

1. **Deepgram** (listening): sign up at
   https://console.deepgram.com — a new account gets **$200 free**,
   no expiry, pay-as-you-go, no card needed. Console → API Keys → Create.
2. **Groq** (translation): sign up at https://console.groq.com —
   free tier, no card, no expiry date, rate-limited (free tier for
   `gpt-oss-20b`/`120b`: 30 requests/min, 1,000/day). Console → API Keys →
   Create API Key.

Then open the app → **设置** → paste both keys → **保存设置**. Use
**测试 Groq** / **测试 Deepgram** to check each one.

### Use it in class

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

### Export a PDF

Open **历史** → open a session → **导出 PDF · 双语对照** (or 仅原文 /
仅译文). A print dialog opens — choose **另存为 PDF**. The layout is
A4, generous whitespace, one numbered entry per sentence; bilingual mode
alternates one original sentence and one translation line by line.

### Network note — mainland China

Deepgram and Groq are overseas services and usually need a VPN/proxy
to reach reliably from mainland China — a direct connection often
times out or is very slow. If live transcription or translation fails or
stalls, turn on your VPN and retry, picking a low-latency US/HK node.
When the app hits a network error it shows “网络不通？试试开梯子再重试”
instead of a raw error message.

### Balance feature — public vs private

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

### Honest limitations (verified, not guessed)

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

### Android (APK)

The app is a static page, wrapped with Capacitor (`capacitor.config.json`
is included; `appId: app.trans.live`). The APK is built by GitHub
Actions (`.github/workflows/build-apk.yml`) and published as a Release
asset — it is a debug build, install it by allowing installs from
unknown sources.

- **Public APK** — [TRANS Releases](https://github.com/mm2672653902-star/TRANS/releases),
  file `TRANS-public-v1.0.0.apk`. Clean build: no keys inside, no
  Deepgram balance feature. Enter your own Deepgram + Groq keys in
  Settings after installing.
- **Private APK** — [TRANS-private Releases](https://github.com/mm2672653902-star/TRANS-private/releases),
  file `TRANS-private-v1.0.0.apk`. Keys are pre-filled from the repo
  Secrets `TRANS_DG_KEY` / `TRANS_GROQ_KEY` at build time only (see
  [PRIVATE-BUILD.md](PRIVATE-BUILD.md)) and the Deepgram balance
  display is on. **Never share the private APK** — keys can be
  extracted by decompiling it.

If the Actions run fails with “Missing Secrets TRANS_DG_KEY and/or
TRANS_GROQ_KEY”, set the two Secrets in the private repo at Settings →
Secrets and variables → Actions, then re-run the workflow from the
Actions tab. One known setup quirk: the Muse GitHub App integration
cannot write `.github/workflows/` files (GitHub returns 403), so the
workflow file has to be added to the repo once via the GitHub web UI
(Add file → Create new file → paste the workflow); after that, every
push to `main` rebuilds and re-publishes the APK automatically.

### Publishing (decided: repo `TRANS`, appId `app.trans.live`)

- **GitHub repo name: `TRANS`** (decided 2026-11-17).
- **Capacitor appId: `app.trans.live`** (decided 2026-11-17).
- **Public repo:** https://github.com/mm2672653902-star/TRANS
- **Private repo:** https://github.com/mm2672653902-star/TRANS-private
- Full step-by-step checklist: [PUBLISH-CHECKLIST.md](PUBLISH-CHECKLIST.md).

### Tests

`node test/test.js` — checks the Deepgram URL, sentence splitting, the
balance flag default, the PDF HTML in all three modes, and that no key
is present in the shipped files. No network, no keys.

### Design

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
