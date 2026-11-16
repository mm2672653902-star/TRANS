# TRANS — 实时同传

> 本文档为双语：中文在前，英文在后。
> This document is bilingual: Chinese first, English below.

---

## 中文使用说明

### 简介

TRANS 是一款课堂实时同传工具：听老师讲课，实时看到原文句子和对应的翻译，课后可以保存历史、导出 PDF。

- **听写：** Deepgram 流式语音转文字（Nova-3），走 WebSocket，支持断句和实时中间结果。原语言可选，默认英语。
- **翻译：** Groq 聊天接口，默认 `openai/gpt-oss-20b`，速度快，适合实时使用；设置里也可以选 `openai/gpt-oss-120b`。每说完一句翻译一句，原文在上、译文在下。
- **没有服务器。** 手机直接连接 Deepgram 和 Groq，没有后端，不用部署。API Key 只保存在你自己浏览器的本地存储里。本仓库不包含任何 API Key。
- **历史：** 每一节课自动保存在本地，可以查看、搜索、打开和删除。
- **导出 PDF：** 每一节课可以一键导出，三种模式：仅原文、仅译文、双语对照。双语对照是一句原文、一句译文逐句交替。导出使用浏览器的“打印为 PDF”，中文可以正常显示。

### 打开方式

- **查看界面 / 填写设置：** 直接打开 `dist/trans-single.html`。这是一个单独的自包含文件（样式和代码都已内联），单独打开也能完整显示。
- **课堂上使用麦克风：** 浏览器不允许通过 `file://` 打开麦克风，需要用 https 或 localhost 打开（见“课堂使用”），或者使用 APK。

### 获取 Key

1. **Deepgram**（听写）：在 https://console.deepgram.com 注册账号，新用户有免费额度，按量计费。进入控制台 → API Keys → Create，复制 Key。
2. **Groq**（翻译）：在 https://console.groq.com 注册账号，免费层，不用绑卡，按次数限流。进入控制台 → API Keys → Create API Key，复制 Key。

然后打开 TRANS → **设置** → 粘贴两个 Key → **保存设置**。可以用**测试 Groq**和**测试 Deepgram**分别检查两个 Key 是否可用。

### 课堂使用

1. 用 https 或 localhost 打开页面（麦克风需要安全上下文）：在文件夹里运行 `python3 -m http.server 8000`，然后打开 `http://localhost:8000`；或者把静态文件托管到任何支持 https 的地方；也可以直接安装 APK。
2. 选择原语言（老师讲什么语言）和目标语言（你想看什么语言）。默认：英语 → 中文。
3. 点**开始同传**，允许麦克风，把手机放在老师附近。每说完一句，下面就会出现原文和翻译。直播页顶部显示语言，中间显示句子，底部是暂停（带计时）和停止。
4. **视图**可以切换对照（原文 + 译文）或仅译文。喇叭按钮可以用手机自带的语音朗读最后一条译文。暂停会同时停住录音和计时。
5. 下课点**停止**，这节课就保存到**历史**里了。

### 导出 PDF

打开**历史** → 打开一节课 → **导出 PDF · 双语对照**（或仅原文 / 仅译文）。弹出打印框后，选择**另存为 PDF**。版式为 A4，每句带编号；双语模式是一句原文、一句译文逐句交替。

### 网络说明——中国大陆

Deepgram 和 Groq 都是海外服务，在中国大陆使用通常需要 VPN 或代理，直连经常超时或很慢。如果听写或翻译失败、卡住，请先开启 VPN 再试，并选择延迟低的节点。遇到网络错误时，软件会显示友好的提示，而不是原始报错信息。

### 安卓 APK

TRANS 是静态页面，用 Capacitor 打包（`capacitor.config.json` 已包含在仓库中）。APK 由 GitHub Actions（`.github/workflows/build-apk.yml`）编译，发布为 Release 附件，是 debug 包，安装时允许“安装未知来源应用”即可。

- **下载：** [TRANS Releases](https://github.com/mm2672653902-star/TRANS/releases)，文件 `TRANS-public-v1.0.0.apk`。
- APK 里不包含任何 Key。安装后请在设置里填写你自己的 Deepgram 和 Groq Key。

### 测试

运行 `node test/test.js`，检查 Deepgram 地址、断句、PDF 三种模式以及 shipped 文件里没有 Key。不需要联网，不需要 Key。

---

## English

### What it is

TRANS is a live translator for class: listen to the teacher, read each
original sentence and its translation in real time, keep the history,
and export a clean PDF afterwards.

- **Listen:** Deepgram streaming speech-to-text (Nova-3) over WebSocket,
  with sentence segmentation and live interim results. The source
  language is selectable (default English).
- **Translate:** Groq chat completions, default `openai/gpt-oss-20b`
  (fast, good for live use; `openai/gpt-oss-120b` is also selectable in
  Settings). One finished sentence at a time, original above,
  translation below.
- **No server.** Your phone talks directly to Deepgram and Groq. There
  is no backend and nothing to deploy. API keys live only in your own
  browser's local storage. This repository contains no API keys.
- **History:** every session is saved locally, with list, search, open
  and delete.
- **PDF export:** one click per session, three modes — original only,
  translation only, or bilingual. In bilingual mode, one original
  sentence and one translation alternate line by line. Export uses the
  browser's Print-to-PDF, so Chinese renders correctly.

### Open it

- **See the UI / fill in Settings:** open `dist/trans-single.html`
  directly. It is one self-contained file (CSS and JS inlined), so it
  renders fully styled even when opened alone.
- **Use the microphone in class:** browsers refuse microphone access
  from `file://`. Serve the folder over https or localhost (see “Use it
  in class” below), or use the APK.

### Get your keys

1. **Deepgram** (listening): sign up at https://console.deepgram.com.
   New accounts get free credit; usage is pay-as-you-go. Go to the
   console → API Keys → Create, and copy the key.
2. **Groq** (translation): sign up at https://console.groq.com. Free
   tier, no card required, rate-limited by request count. Go to the
   console → API Keys → Create API Key, and copy the key.

Then open TRANS → **Settings** → paste both keys → **Save**. Use the
**Test Groq** and **Test Deepgram** buttons to check each key.

### Use it in class

1. Serve the folder over https or localhost (the microphone needs a
   secure context): run `python3 -m http.server 8000` in the folder,
   then open `http://localhost:8000`; or host the static files
   anywhere with https; or install the APK.
2. Pick the source language (what the teacher speaks) and the target
   language (what you want to read). Default: English → Chinese.
3. Tap **Start**, allow the microphone, and put the phone near the
   teacher. Each finished sentence appears with its translation below.
   The live screen shows the language pair at the top, the sentences
   in the middle, and pause (with a live timer) and stop at the bottom.
4. **View** toggles bilingual
   (original + translation) or translation only. The speaker button
   reads the last translation aloud with the device's text-to-speech.
   Pause freezes the recorder and the timer.
5. Tap **Stop** when the class ends — the session is saved to
   **History**.

### Export a PDF

Open **History** → open a session → **Export PDF · Bilingual**
(or Original only / Translation only). A print dialog opens — choose
**Save as PDF**. The layout is A4, one numbered entry per sentence;
bilingual mode alternates one original sentence and one translation
line by line.

### Network note — mainland China

Deepgram and Groq are overseas services and usually need a VPN or
proxy to reach reliably from mainland China — a direct connection
often times out or is very slow. If live transcription or translation
fails or stalls, turn on your VPN and retry, picking a low-latency
node. When the app hits a network error it shows a friendly message
instead of a raw error.

### Android (APK)

TRANS is a static page wrapped with Capacitor
(`capacitor.config.json` is included in this repository). The APK is
built by GitHub Actions (`.github/workflows/build-apk.yml`) and
published as a Release asset. It is a debug build — install it by
allowing installs from unknown sources.

- **Download:** [TRANS Releases](https://github.com/mm2672653902-star/TRANS/releases),
  file `TRANS-public-v1.0.0.apk`.
- The APK contains no keys. Enter your own Deepgram and Groq keys in
  Settings after installing.

### Tests

Run `node test/test.js` to check the Deepgram URL, sentence
splitting, the PDF HTML in all three modes, and that no key is
present in the shipped files. No network and no keys needed.
