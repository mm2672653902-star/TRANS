/* TRANS — self-use live translator.
 * No server. Deepgram (STT, WebSocket) + Groq (translation, fetch) direct from the browser.
 * Keys live ONLY in this device's localStorage. This file contains NO API keys.
 * Pure helpers at the top are testable in Node (see test/test.js); DOM init is guarded below.
 */
'use strict';

var LS = {
  dgKey: 'trans.dgKey', groqKey: 'trans.groqKey', model: 'trans.groqModel',
  src: 'trans.srcLang', tgt: 'trans.tgtLang', mode: 'trans.mode',
  history: 'trans.history.v1',
  dgBalance: 'trans.dgBalance.v1'
};

/* Mode: 'lecture' （同传，连续讲课）vs 'dialogue' （对话，短句轮换）.
 * Only affects Deepgram endpointing: dialogue cuts sentences sooner. */
function getMode() { return store.getStr(LS.mode) === 'dialogue' ? 'dialogue' : 'lecture'; }
function modeParams() {
  return getMode() === 'dialogue'
    ? { utteranceEndMs: 600, endpointingMs: 200 }
    : { utteranceEndMs: 1000, endpointingMs: 300 };
}

/* BUILD FLAG — optional balance display (see config.js):
 * enableBalance: false (default) → no balance display, no quota line,
 *   no balances API call, no refresh button.
 * enableBalance: true  → the app shows the Deepgram dollar balance in
 *   Settings, with a refresh button. Set at build time only, never
 *   committed as a key — the flag itself is not a secret.
 * The flag is read from window.TRANS_CONFIG (config.js, loaded before this file).
 * When false, fetchDeepgramBalance is never called and the quota UI is removed. */
var ENABLE_BALANCE = (typeof window !== 'undefined' && window.TRANS_CONFIG &&
  typeof window.TRANS_CONFIG.enableBalance !== 'undefined') ?
  !!window.TRANS_CONFIG.enableBalance : false;

var SRC_LANGS = [
  ['en', 'English'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
  ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'],
  ['it', 'Italiano'], ['nl', 'Nederlands'], ['ru', 'Русский'], ['hi', 'हिन्दी']
];
var TGT_LANGS = [
  ['zh-CN', '中文'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어'],
  ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português']
];
var LANG_NAME = {};
SRC_LANGS.concat(TGT_LANGS).forEach(function (p) { LANG_NAME[p[0]] = p[1]; });

function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return null;
  return '$' + Number(n).toFixed(2);
}
function buildDeepgramUrl(opts) {
  var q = new URLSearchParams({
    model: 'nova-3', language: opts.language || 'en',
    smart_format: 'true', interim_results: 'true', punctuate: 'true',
    utterance_end_ms: String(opts.utteranceEndMs || 1000),
    endpointing: String(opts.endpointingMs || 300)
  });
  return 'wss://api.deepgram.com/v1/listen?' + q.toString();
}
/* Split a finalized transcript chunk into sentences. Keeps the trailing punctuation
 * with the sentence; anything without terminal punctuation stays in the remainder. */
function splitSentences(text) {
  var done = [], m, re = /[^.!?。！？]+[.!?。！？]+["'”’）)]?\s*/g, last = 0;
  while ((m = re.exec(text)) !== null) { done.push(m[0].trim()); last = re.lastIndex; }
  return { sentences: done, remainder: text.slice(last).trim() };
}
/* ---------- storage (localStorage only; guarded so Node tests can import) ---------- */
var store = {
  get: function (k, fallback) {
    try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  getStr: function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  setStr: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function loadHistory() { var h = store.get(LS.history, []); return Array.isArray(h) ? h : []; }
function saveHistory(h) { store.set(LS.history, h.slice(0, 50)); }

/* ---------- Deepgram balance (REST; see README for the CORS limitation) ---------- */
async function fetchDeepgramBalance(apiKey) {
  if (!ENABLE_BALANCE) return { state: 'disabled' };
  if (!apiKey) return { state: 'missing' };
  try {
    var r1 = await fetch('https://api.deepgram.com/v1/projects', { headers: { Authorization: 'Token ' + apiKey } });
    if (!r1.ok) return { state: r1.status === 401 ? 'invalid' : 'unreadable', status: r1.status };
    var pj = await r1.json();
    var project = (pj.projects && pj.projects[0]) || null;
    if (!project) return { state: 'unreadable' };
    var r2 = await fetch('https://api.deepgram.com/v1/projects/' + project.project_id + '/balances',
      { headers: { Authorization: 'Token ' + apiKey } });
    if (!r2.ok) return { state: r2.status === 401 ? 'invalid' : 'unreadable', status: r2.status };
    var bj = await r2.json();
    var usd = (bj.balances || []).filter(function (b) { return b.units === 'usd'; });
    if (!usd.length) return { state: 'unreadable' };
    var amount = usd.reduce(function (s, b) { return s + Number(b.amount || 0); }, 0);
    var out = { state: 'ok', amount: amount, projectName: project.name || '', at: new Date().toISOString() };
    store.set(LS.dgBalance, out);
    return out;
  } catch (e) {
    // TypeError in a browser almost always means CORS / network: Deepgram's REST API
    // does not send permissive CORS headers (official SDK: "we do not support custom
    // CORS origins"). The live WebSocket STT path is unaffected — only this balance
    // read is blocked. Never invent a number here.
    return { state: 'cors', message: String((e && e.message) || e) };
  }
}
function dgBalanceText(res) {
  if (!res) return '未填写 / 无法读取';
  if (res.state === 'ok') return 'Deepgram 剩余 ' + formatMoney(res.amount);
  if (res.state === 'missing') return 'Deepgram 剩余 —（未填写 Key）';
  if (res.state === 'invalid') return 'Deepgram 剩余 —（Key 无效）';
  if (res.state === 'cors') return 'Deepgram 剩余 —（无法读取：浏览器限制，见设置说明）';
  if (res.state === 'disabled') return 'Deepgram 剩余 —（公开版无此功能）';
  return 'Deepgram 剩余 —（无法读取）';
}

/* ---------- PDF print HTML (the export itself is the browser's Print-to-PDF) ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function buildPrintHTML(session, mode) {
  var date = new Date(session.startedAt).toLocaleString('zh-CN', { hour12: false });
  var srcName = LANG_NAME[session.srcLang] || session.srcLang;
  var tgtName = LANG_NAME[session.tgtLang] || session.tgtLang;
  var title = mode === 'src' ? '原文记录' : mode === 'tgt' ? '译文记录' : '双语对照记录';
  var items = (session.items || []).map(function (it, i) {
    var n = String(i + 1).padStart(2, '0');
    if (mode === 'src') return '<div class="pi"><div class="pn">' + n + '</div><p class="ps">' + esc(it.src) + '</p></div>';
    if (mode === 'tgt') return '<div class="pi"><div class="pn">' + n + '</div><p class="pt">' + esc(it.tgt || '') + '</p></div>';
    return '<div class="pi"><div class="pn">' + n + '</div><p class="ps">' + esc(it.src) + '</p><p class="pt">' + esc(it.tgt || '') + '</p></div>';
  }).join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>TRANS — ' + esc(title) + '</title>' +
    '<style>@page{size:A4;margin:22mm 20mm}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;color:#141414;line-height:1.65;margin:0}' +
    '.head{border-bottom:1px solid #141414;padding-bottom:18px;margin-bottom:8px}' +
    '.brand{font-size:13px;letter-spacing:.22em;font-weight:700}.brand span{color:#0e6b5c}' +
    'h1{font-size:26px;margin:14px 0 4px}.meta{color:#8a857c;font-size:12px;letter-spacing:.04em}' +
    '.pi{padding:20px 0;border-bottom:1px solid #e3ded4;break-inside:avoid}' +
    '.pn{font-size:11px;letter-spacing:.16em;color:#b8b2a6}' +
    '.ps{font-size:15px;font-weight:600;margin:8px 0 4px}.pt{font-size:15px;color:#4a463f;margin:4px 0}' +
    '.foot{color:#b8b2a6;font-size:11px;margin-top:22px}</style></head><body>' +
    '<div class="head"><div class="brand">TRANS<span>.</span></div><h1>' + esc(title) + '</h1>' +
    '<div class="meta">' + esc(date) + ' · ' + esc(srcName) + ' → ' + esc(tgtName) + ' · 共 ' + (session.items || []).length + ' 句</div></div>' +
    items + '<div class="foot">TRANS · Self-use live translation record</div></body></html>';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildDeepgramUrl: buildDeepgramUrl, splitSentences: splitSentences,
    formatMoney: formatMoney, dgBalanceText: dgBalanceText,
    buildPrintHTML: buildPrintHTML, ENABLE_BALANCE: ENABLE_BALANCE
  };
}

/* ---------- DOM app (browser only) ---------- */
if (typeof window !== 'undefined' && typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var live = { running: false, paused: false, ws: null, recorder: null, stream: null, session: null, buffer: '', queue: [], translating: false, lastQuotaAt: 0, elapsed: 0, timerId: null, viewMode: 'bilingual' };

  function fillSelect(el, list, val) {
    el.innerHTML = list.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === val ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
  }
  function show(view) {
    ['live', 'history', 'settings'].forEach(function (v) {
      $('view-' + v).classList.toggle('hidden', v !== view);
      $('nav-' + v).classList.toggle('active', v === view);
    });
    if (view === 'history') renderHistory();
    if (view === 'settings') refreshQuota(false);
  }
  function keysPresent() { return !!store.getStr(LS.dgKey) && !!store.getStr(LS.groqKey); }
  function updateKeyNotice() { updateOnlinePill(); }
  function updateOnlinePill() {
    var pill = $('online-pill'); if (!pill) return;
    pill.textContent = keysPresent()
      ? '在线模式 · Deepgram + Groq 已就绪'
      : '在线模式 · 请先在设置里填写 Key';
  }
  function updateLangPills() {
    var s = $('lang-pill-src'), t = $('lang-pill-tgt');
    if (s) s.textContent = LANG_NAME[$('src-lang').value] || $('src-lang').value;
    if (t) t.textContent = LANG_NAME[$('tgt-lang').value] || $('tgt-lang').value;
  }
  function fmtTimer(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function updateTimerUI() {
    var t = $('live-timer'); if (t) t.textContent = fmtTimer(live.elapsed);
    var b = $('btn-pause'); if (b) b.classList.toggle('paused', !!live.paused);
    var ic = $('pause-icon');
    if (ic) ic.innerHTML = live.paused
      ? '<path d="M7 4.5v15l13-7.5z"/>'
      : '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
  }
  function startTimer() {
    stopTimer(); live.elapsed = 0; updateTimerUI();
    live.timerId = setInterval(function () {
      if (live.running && !live.paused) { live.elapsed++; updateTimerUI(); }
    }, 1000);
  }
  function stopTimer() { if (live.timerId) { clearInterval(live.timerId); live.timerId = null; } }

  /* ----- balance display (only when ENABLE_BALANCE=true) -----
   * One quiet Deepgram dollar-balance line in Settings + a tiny hint on Live.
   * Default build (ENABLE_BALANCE=false): this whole block is a no-op — the
   * quota section is removed from the page and no balances API call is made.
   * There is intentionally NO Groq quota display in any build: Groq has no
   * dollar-balance API, so there is nothing real to show. */
  function renderQuota(dgRes) {
    var section = $('quota-section'), hint = $('live-quota');
    if (!ENABLE_BALANCE) {
      if (section) section.remove();
      if (hint) hint.remove();
      return;
    }
    if (section) section.classList.remove('hidden');
    var dg = dgRes || store.get(LS.dgBalance, null);
    var dgLine = dgBalanceText(dg);
    if (dg && dg.state === 'ok' && dg.at) dgLine += '（' + new Date(dg.at).toLocaleString('zh-CN', { hour12: false }) + ' 读取）';
    $('quota-dg').textContent = dgLine;
    if (hint) {
      if (dg && dg.state === 'ok') { hint.textContent = 'Deepgram ' + formatMoney(dg.amount); hint.classList.remove('hidden'); }
      else hint.classList.add('hidden');
    }
  }
  async function refreshQuota(force) {
    if (!ENABLE_BALANCE) { renderQuota(); return; }
    var now = Date.now();
    if (!force && now - live.lastQuotaAt < 60000) { renderQuota(); return; }
    live.lastQuotaAt = now;
    $('quota-dg').textContent = 'Deepgram 剩余 读取中…';
    var res = await fetchDeepgramBalance(store.getStr(LS.dgKey));
    renderQuota(res);
  }

  /* ----- live: Deepgram WS + Groq translation queue ----- */
  function newSession() {
    return { id: 's' + Date.now().toString(36), startedAt: Date.now(),
      srcLang: $('src-lang').value, tgtLang: $('tgt-lang').value, items: [] };
  }
  function saveLiveSession() {
    if (!live.session) return;
    var h = loadHistory();
    var i = h.findIndex(function (s) { return s.id === live.session.id; });
    if (i >= 0) h[i] = live.session; else h.unshift(live.session);
    saveHistory(h);
  }
  function renderItem(item, idx) {
    var div = document.createElement('div');
    div.className = 'item'; div.dataset.idx = idx;
    div.innerHTML = '<div class="num">' + String(idx + 1).padStart(2, '0') + ' · ' +
      new Date(item.at).toLocaleTimeString('zh-CN', { hour12: false }) + '</div>' +
      '<p class="src"></p><p class="tgt pending">翻译中…</p>';
    div.querySelector('.src').textContent = item.src;
    if (item.tgt) { var t = div.querySelector('.tgt'); t.classList.remove('pending'); t.textContent = item.tgt; }
    if (item.error) { var e = div.querySelector('.tgt'); e.classList.remove('pending'); e.innerHTML = '翻译失败（网络不通？试试开梯子再重试） <button type="button" class="retry">重试</button>'; e.querySelector('.retry').onclick = function () { retryTranslate(item, div); }; }
    return div;
  }
  function renderLive() {
    var list = $('live-list'); list.innerHTML = '';
    var items = live.session ? live.session.items : [];
    $('live-count').textContent = items.length ? '· ' + items.length + ' 句' : '';
    if (!items.length) { list.innerHTML = '<p>还没有句子。开始后，老师每说完一句，这里会出现一句原文，下方是翻译。</p>'; return; }
    items.forEach(function (it, i) { list.appendChild(renderItem(it, i)); });
    var last = list.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest' });
  }
  function addSentence(text) {
    text = (text || '').trim(); if (!text || !live.session) return;
    var item = { src: text, tgt: '', at: Date.now() };
    live.session.items.push(item);
    renderLive(); saveLiveSession();
    live.queue.push(item); pumpQueue();
  }
  function retryTranslate(item, div) { item.error = false; item.tgt = ''; if (div) { var t = div.querySelector('.tgt'); t.classList.remove('pending'); t.textContent = '翻译中…'; } live.queue.push(item); pumpQueue(); }

  async function translateOne(item) {
    var key = store.getStr(LS.groqKey);
    var model = store.getStr(LS.model) || 'openai/gpt-oss-20b';
    var srcName = LANG_NAME[live.session.srcLang] || live.session.srcLang;
    var tgtName = LANG_NAME[live.session.tgtLang] || live.session.tgtLang;
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model: model, temperature: 0, stream: true,
          messages: [
            { role: 'system', content: 'You are a precise simultaneous interpreter. Translate the following ' + srcName + ' sentence into ' + tgtName + '. Output ONLY the translation, no explanation, no quotes, no extra text.' },
            { role: 'user', content: item.src }
          ]
        })
      });
      if (!res.ok) throw new Error('Groq ' + res.status);
      var reader = res.body.getReader(); var dec = new TextDecoder(); var buf = ''; var out = '';
      for (;;) {
        var r = await reader.read(); if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split('\n'); buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim(); if (!line.startsWith('data:')) continue;
          var data = line.slice(5).trim(); if (data === '[DONE]') continue;
          try {
            var j = JSON.parse(data);
            var delta = j.choices && j.choices[0] && j.choices[0].delta;
            if (delta && delta.content) { out += delta.content; item.tgt = out; renderLive(); }
          } catch (e) {}
        }
      }
      item.tgt = out.trim();
      if (!item.tgt) throw new Error('empty translation');
    } catch (e) {
      item.error = true;
    }
    renderLive(); saveLiveSession();
  }
  async function pumpQueue() {
    if (live.translating) return; live.translating = true;
    while (live.queue.length) {
      var item = live.queue.shift();
      await translateOne(item);
      await new Promise(function (r) { setTimeout(r, 120); });
    }
    live.translating = false;
  }

  async function startLive() {
    if (!keysPresent()) { show('settings'); $('settings-result').textContent = '请先填写 Deepgram 和 Groq 两个 Key。'; return; }
    try {
      live.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) { $('live-status').textContent = '无法打开麦克风：请允许权限，并用 https / localhost 打开页面。'; return; }
    live.session = newSession(); live.buffer = ''; live.queue = [];
    live.paused = false;
    document.body.classList.add('is-live');
    $('home-panel').classList.add('hidden');
    $('live-panel').classList.remove('hidden');
    $('interim').textContent = '正在听…';
    $('live-sub').textContent = '在线模式 · Deepgram';
    updateLangPills(); startTimer();
    renderLive();
    var mp = modeParams();
    var url = buildDeepgramUrl({ language: live.session.srcLang, utteranceEndMs: mp.utteranceEndMs, endpointingMs: mp.endpointingMs });
    var ws = new WebSocket(url, ['token', store.getStr(LS.dgKey)]);
    live.ws = ws;
    ws.onopen = function () {
      var mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''].find(function (m) { try { return !m || MediaRecorder.isTypeSupported(m); } catch (e) { return false; } });
      try {
        live.recorder = new MediaRecorder(live.stream, mime ? { mimeType: mime } : undefined);
        live.recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size && ws.readyState === 1) ws.send(ev.data); };
        live.recorder.start(250);
      } catch (e) { $('live-status').textContent = '录音启动失败：' + e.message; }
      live.running = true;
      $('btn-toggle').textContent = '停止翻译'; $('btn-toggle').classList.add('live');
      $('live-dot').classList.add('live'); $('live-status').textContent = '正在听…';
      renderQuota();
    };
    ws.onmessage = function (ev) {
      var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'UtteranceEnd') { if (live.buffer.trim()) { addSentence(live.buffer); live.buffer = ''; } return; }
      var alt = msg.channel && msg.channel.alternatives && msg.channel.alternatives[0];
      if (!alt || !alt.transcript) return;
      if (msg.is_final) {
        live.buffer = (live.buffer ? live.buffer + ' ' : '') + alt.transcript;
        var split = splitSentences(live.buffer);
        split.sentences.forEach(addSentence);
        live.buffer = split.remainder;
        $('interim').textContent = live.buffer;
      } else {
        $('interim').textContent = alt.transcript;
      }
    };
    ws.onerror = function () { $('live-status').textContent = 'Deepgram 连接出错：请检查 Key。网络不通？试试开梯子再重试'; };
    ws.onclose = function () { if (live.running) stopLive('连接已断开。网络不通？试试开梯子再重试'); };
  }
  function stopLive(note) {
    live.running = false; live.paused = false; stopTimer();
    try { if (live.recorder && live.recorder.state !== 'inactive') live.recorder.stop(); } catch (e) {}
    try { if (live.ws) live.ws.close(); } catch (e) {}
    try { if (live.stream) live.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    if (live.buffer.trim()) { addSentence(live.buffer); live.buffer = ''; }
    $('interim').textContent = '';
    saveLiveSession();
    document.body.classList.remove('is-live');
    $('live-panel').classList.add('hidden');
    $('home-panel').classList.remove('hidden');
    $('btn-toggle').textContent = '开始翻译'; $('btn-toggle').classList.remove('live');
    $('live-dot').classList.remove('live'); $('live-status').textContent = note || '已停止，本节已保存到历史。';
    updateTimerUI(); renderQuota();
  }
  function togglePause() {
    if (!live.running || !live.recorder) return;
    try {
      if (live.paused) {
        if (live.recorder.state === 'paused') live.recorder.resume();
        live.paused = false; $('live-status').textContent = '正在听…';
      } else {
        if (live.recorder.state === 'recording') live.recorder.pause();
        live.paused = true; $('live-status').textContent = '已暂停';
      }
    } catch (e) {}
    updateTimerUI();
  }
  function speakLast() {
    try {
      if (!('speechSynthesis' in window)) return;
      var items = live.session ? live.session.items : [];
      var last = null;
      for (var i = items.length - 1; i >= 0; i--) { if (items[i].tgt) { last = items[i].tgt; break; } }
      if (!last) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(last);
      u.lang = live.session.tgtLang === 'en' ? 'en-US' : 'zh-CN';
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ----- history ----- */
  var openSessionId = null;
  function renderHistory() {
    var q = ($('history-search').value || '').trim();
    var h = loadHistory().filter(function (s) {
      if (!q) return true;
      return (s.items || []).some(function (it) { return (it.src + ' ' + (it.tgt || '')).toLowerCase().includes(q.toLowerCase()); });
    });
    var list = $('history-list'); list.innerHTML = '';
    if (!h.length) { list.innerHTML = '<p>暂无历史。开始一节同传并停止后，会出现在这里。</p>'; return; }
    h.forEach(function (s) {
      var first = (s.items && s.items[0]) ? (s.items[0].tgt || s.items[0].src) : '（空）';
      var div = document.createElement('div'); div.className = 'session';
      div.innerHTML = '<div class="date">' + new Date(s.startedAt).toLocaleString('zh-CN', { hour12: false }) + ' · ' +
        (LANG_NAME[s.srcLang] || s.srcLang) + ' → ' + (LANG_NAME[s.tgtLang] || s.tgtLang) + '</div>' +
        '<div class="first"></div><div class="count">' + (s.items || []).length + ' 句</div>';
      div.querySelector('.first').textContent = first;
      div.onclick = function () { openSession(s.id); };
      list.appendChild(div);
    });
  }
  function openSession(id) {
    openSessionId = id;
    var s = loadHistory().find(function (x) { return x.id === id; }); if (!s) return;
    $('session-detail').classList.remove('hidden');
    $('view-history').classList.add('detail-open');
    $('session-title').textContent = new Date(s.startedAt).toLocaleString('zh-CN', { hour12: false });
    var box = $('session-items'); box.innerHTML = '';
    (s.items || []).forEach(function (it, i) { box.appendChild(renderItem(it, i)); });
  }
  function exportPDF(mode) {
    var s = loadHistory().find(function (x) { return x.id === openSessionId; }); if (!s) return;
    var html = buildPrintHTML(s, mode);
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    var doc = frame.contentDocument; doc.open(); doc.write(html); doc.close();
    frame.onload = function () {
      var finish = function () { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {} setTimeout(function () { frame.remove(); }, 1000); };
      if (frame.contentDocument.fonts && frame.contentDocument.fonts.ready) frame.contentDocument.fonts.ready.then(finish); else finish();
    };
    // If onload already fired before assignment (cached), print anyway after a tick.
    setTimeout(function () { if (document.body.contains(frame) && !frame.dataset.printed) { frame.dataset.printed = '1'; try { frame.contentWindow.print(); } catch (e) {} } }, 1200);
  }

  /* ----- settings ----- */
  function loadSettings() {
    $('dg-key').value = store.getStr(LS.dgKey);
    $('groq-key').value = store.getStr(LS.groqKey);
    $('groq-model').value = store.getStr(LS.model) || 'openai/gpt-oss-20b';
    fillSelect($('src-lang'), SRC_LANGS, store.getStr(LS.src) || 'en');
    fillSelect($('tgt-lang'), TGT_LANGS, store.getStr(LS.tgt) || 'zh-CN');
  }
  function init() {
    // Pre-filled keys: if config.js carries keys (generated at build time),
    // they are seeded into localStorage once, only if the user has not
    // entered keys themselves. The default config has empty strings here,
    // so this is a no-op in the default build.
    if (typeof window !== 'undefined' && window.TRANS_CONFIG) {
      if (window.TRANS_CONFIG.deepgramKey && !store.getStr(LS.dgKey)) store.setStr(LS.dgKey, window.TRANS_CONFIG.deepgramKey);
      if (window.TRANS_CONFIG.groqKey && !store.getStr(LS.groqKey)) store.setStr(LS.groqKey, window.TRANS_CONFIG.groqKey);
    }
    loadSettings(); updateKeyNotice(); updateLangPills(); renderQuota();
    // Mode segmented control （对话 / 同传）: only changes Deepgram endpointing.
    var setMode = function (m) {
      store.setStr(LS.mode, m);
      $('mode-dialogue').classList.toggle('active', m === 'dialogue');
      $('mode-lecture').classList.toggle('active', m === 'lecture');
      $('mode-dialogue').setAttribute('aria-selected', m === 'dialogue' ? 'true' : 'false');
      $('mode-lecture').setAttribute('aria-selected', m === 'lecture' ? 'true' : 'false');
    };
    setMode(getMode());
    $('mode-dialogue').onclick = function () { setMode('dialogue'); };
    $('mode-lecture').onclick = function () { setMode('lecture'); };
    $('btn-top-settings').onclick = function () { show('settings'); };
    $('nav-live').onclick = function () { show('live'); };
    $('nav-history').onclick = function () { show('history'); };
    $('nav-settings').onclick = function () { show('settings'); };
    $('src-lang').onchange = function () { store.setStr(LS.src, $('src-lang').value); updateLangPills(); };
    $('tgt-lang').onchange = function () { store.setStr(LS.tgt, $('tgt-lang').value); updateLangPills(); };
    $('btn-toggle').onclick = function () { if (live.running) stopLive(); else startLive(); };
    $('btn-clear-live').onclick = function () { if (live.running) return; live.session = newSession(); renderLive(); };
    // Live-screen controls: pause (timer keeps running only while unpaused),
    // stop square, back arrow (also stops), speaker (reads last translation
    // aloud with the device TTS), view pill (bilingual / translation-only).
    $('btn-pause').onclick = togglePause;
    $('btn-stop').onclick = function () { if (live.running) stopLive(); };
    $('btn-back').onclick = function () { if (live.running) stopLive(); };
    $('btn-speaker').onclick = speakLast;
    $('btn-view').onclick = function () {
      live.viewMode = live.viewMode === 'bilingual' ? 'tgt-only' : 'bilingual';
      $('live-panel').classList.toggle('tgt-only', live.viewMode === 'tgt-only');
      $('btn-view').textContent = live.viewMode === 'tgt-only' ? '视图 · 仅译文' : '视图 · 对照';
    };
    $('history-search').oninput = renderHistory;
    document.querySelectorAll('[data-export]').forEach(function (b) { b.onclick = function () { exportPDF(b.dataset.export); }; });
    $('btn-delete-session').onclick = function () {
      if (!openSessionId) return;
      saveHistory(loadHistory().filter(function (s) { return s.id !== openSessionId; }));
      openSessionId = null; $('session-detail').classList.add('hidden');
      $('view-history').classList.remove('detail-open'); renderHistory();
    };
    $('btn-back-history').onclick = function () {
      openSessionId = null; $('session-detail').classList.add('hidden');
      $('view-history').classList.remove('detail-open'); renderHistory();
    };
    $('btn-save-settings').onclick = function () {
      store.setStr(LS.dgKey, $('dg-key').value.trim());
      store.setStr(LS.groqKey, $('groq-key').value.trim());
      store.setStr(LS.model, $('groq-model').value);
      updateKeyNotice(); live.lastQuotaAt = 0; refreshQuota(true);
      $('settings-result').textContent = ENABLE_BALANCE ? '已保存到这台设备。正在读取用量…' : '已保存到这台设备。';
    };
    // The refresh button only exists when ENABLE_BALANCE=true;
    // in the default build renderQuota() has already removed the quota section.
    var rqBtn = $('btn-refresh-quota');
    if (rqBtn) rqBtn.onclick = function () { live.lastQuotaAt = 0; refreshQuota(true); };
    $('btn-clear-keys').onclick = function () {
      store.remove(LS.dgKey); store.remove(LS.groqKey); loadSettings(); updateKeyNotice(); renderQuota();
      $('settings-result').textContent = 'Key 已清除。';
    };
    $('btn-test-groq').onclick = async function () {
      var key = store.getStr(LS.groqKey); if (!key) { $('settings-result').textContent = '请先填写 Groq Key。'; return; }
      $('settings-result').textContent = '测试 Groq 中…';
      try {
        var res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + key } });
        $('settings-result').textContent = res.ok ? 'Groq 可用。' : 'Groq 返回 ' + res.status + '，请检查 Key。';
      } catch (e) { $('settings-result').textContent = 'Groq 测试失败。网络不通？试试开梯子再重试'; }
    };
    $('btn-test-dg').onclick = async function () {
      var key = store.getStr(LS.dgKey); if (!key) { $('settings-result').textContent = '请先填写 Deepgram Key。'; return; }
      $('settings-result').textContent = '测试 Deepgram 中（开一条 WebSocket 握手）…';
      var ok = await new Promise(function (resolve) {
        var ws; try { ws = new WebSocket(buildDeepgramUrl({ language: 'en' }), ['token', key]); } catch (e) { resolve(false); return; }
        var done = false; var finish = function (v) { if (!done) { done = true; try { ws.close(); } catch (e) {} resolve(v); } };
        ws.onopen = function () { finish(true); }; ws.onerror = function () { finish(false); };
        setTimeout(function () { finish(false); }, 8000);
      });
      $('settings-result').textContent = ok ? 'Deepgram 可用（WebSocket 已连通）。' : 'Deepgram 未连通：请检查 Key。网络不通？试试开梯子再重试。注意：余额读取可能仍因浏览器限制失败，见用量说明。';
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
