/* TRANS tests — pure helpers only, no keys, no network. Run: node test/test.js */
'use strict';
const assert = require('assert');
const app = require('../app.js');

let n = 0;
function check(name, fn) { fn(); n++; console.log('ok - ' + name); }

// 1. Deepgram WebSocket URL: exact endpoint + lecture params (fixed, no mode)
check('Deepgram URL', () => {
  const u = new URL(app.buildDeepgramUrl({ language: 'en' }));
  assert.strictEqual(u.protocol, 'wss:');
  assert.strictEqual(u.hostname, 'api.deepgram.com');
  assert.strictEqual(u.pathname, '/v1/listen');
  assert.strictEqual(u.searchParams.get('model'), 'nova-3');
  assert.strictEqual(u.searchParams.get('language'), 'en');
  assert.strictEqual(u.searchParams.get('smart_format'), 'true');
  assert.strictEqual(u.searchParams.get('interim_results'), 'true');
  assert.strictEqual(u.searchParams.get('utterance_end_ms'), '1000');
  assert.strictEqual(u.searchParams.get('endpointing'), '300');
  assert.strictEqual(app.buildDeepgramUrl({ language: 'ja' }).includes('language=ja'), true);
});

// 2. Sentence splitting: punctuation stays with the sentence, remainder kept
check('splitSentences', () => {
  const r = app.splitSentences('Hello world. How are you? Fine');
  assert.deepStrictEqual(r.sentences, ['Hello world.', 'How are you?']);
  assert.strictEqual(r.remainder, 'Fine');
  const r2 = app.splitSentences('这是第一句。这是第二句。');
  assert.deepStrictEqual(r2.sentences, ['这是第一句。', '这是第二句。']);
  assert.strictEqual(r2.remainder, '');
});

// 3. No balance feature anywhere: no balance code, no quota UI, no 用量 text.
//    Deepgram's balance API cannot be read from a browser/WebView, so the
//    feature was removed from both builds. Check the balance in the console.
check('no balance feature anywhere', () => {
  const fs = require('fs'), path = require('path');
  assert.strictEqual(app.ENABLE_BALANCE, undefined);
  assert.strictEqual(app.fetchDeepgramBalance, undefined);
  assert.strictEqual(app.dgBalanceText, undefined);
  assert.strictEqual(app.formatMoney, undefined);
  for (const f of ['app.js', 'index.html', 'config.js', 'styles.css', 'README.md']) {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/enableBalance|fetchDeepgramBalance|dgBalanceText|formatMoney/.test(t), f + ' still contains balance code');
    assert.ok(!/quota|用量|Deepgram 剩余/.test(t), f + ' still contains balance/quota UI text');
  }
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  assert.ok(!cfg.includes('enableBalance'), 'config.js must not mention enableBalance');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!html.includes('quota-section') && !html.includes('btn-refresh-quota'), 'index.html must not contain the quota section');
});

// 4. VPN hint: network errors show a friendly hint, never a raw error object
check('network errors show the VPN hint', () => {
  const fs = require('fs'), path = require('path');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(js.includes('网络不通？试试开梯子再重试'), 'app must show the VPN hint on network errors');
  assert.ok(!/settings-result.*e\.message/.test(js), 'no raw error message may be shown in Settings');
});

// 5. Print HTML: 3 modes, Chinese present, HTML-escaped
check('buildPrintHTML modes', () => {
  const s = { startedAt: Date.now(), srcLang: 'en', tgtLang: 'zh-CN', items: [{ src: 'Hello world.', tgt: '你好，世界。' }, { src: 'Second <b>line</b>.', tgt: '第二行。' }] };
  const bi = app.buildPrintHTML(s, 'bilingual');
  assert.ok(bi.includes('你好，世界。') && bi.includes('Hello world.'));
  // Bilingual PDF order: original first on its own line, translation below,
  // alternating pair by pair (original, translation, original, translation).
  assert.ok(bi.indexOf('Hello world.') < bi.indexOf('你好，世界。'), 'bilingual PDF must show original before translation');
  assert.ok(!bi.includes('<b>line</b>'), 'must escape user text');
  assert.ok(bi.includes('Noto Sans SC') && bi.includes('@page'));
  const src = app.buildPrintHTML(s, 'src');
  assert.ok(src.includes('Hello world.') && !src.includes('你好'));
  const tgt = app.buildPrintHTML(s, 'tgt');
  assert.ok(tgt.includes('你好') && !tgt.includes('Hello world.'));
});

// 6. No hardcoded keys anywhere in the shipped source (placeholder text only)
check('no keys in source', () => {
  const fs = require('fs'), path = require('path');
  const files = ['app.js', 'index.html', 'styles.css', 'config.js', 'README.md', 'capacitor.config.json', 'manifest.webmanifest'];
  for (const f of files) {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/gsk_[A-Za-z0-9]{10,}/.test(t), f + ' contains a Groq-looking key');
    assert.ok(!/\b[0-9a-f]{40}\b/.test(t), f + ' contains a 40-hex Deepgram-looking key');
  }
});

// 7. No grey helper text inside the app: no muted/small hint text, no
//    key notice, no explanatory paragraphs. Instructions live in README.md.
check('no grey helper text in the app', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!html.includes('muted'), 'index.html must not contain muted text');
  assert.ok(!html.includes('key-notice'), 'index.html must not contain the key notice');
  assert.ok(!html.includes('session-meta'), 'index.html must not contain session meta text');
  assert.ok(!html.includes('为什么不用'), 'index.html must not contain explanatory sections');
  assert.ok(!html.includes('安全提醒'), 'index.html must not contain safety-reminder text');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(!js.includes('muted'), 'app.js must not render muted text');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert.ok(!/\.muted\b/.test(css), 'styles.css must not define .muted');
  assert.ok(!/^\.small\s*\{/m.test(css), 'styles.css must not define a .small helper-text class (btn.small is a button size, not helper text)');
  // Fixed one-page layout: page scroll disabled, internal scroll only.
  assert.ok(/html,body\{height:100%\}/.test(css) || css.includes('overflow:hidden'), 'body must disable page scroll');
  assert.ok(css.includes('100dvh'), 'layout must use 100dvh');
  assert.ok(css.includes('#live-panel #live-list') && css.includes('overflow-y:auto'), 'live list must scroll internally');
  assert.ok(css.includes('#history-list{') && css.includes('overflow-y:auto'), 'history list must scroll internally');
});

// 8. 同传 only: no tab bar at all, no dialogue mode, no mode selector code.
//    Lecture endpointing is fixed (1000 ms / 300 ms).
check('lecture only, no mode tabs', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!html.includes('mode-seg'), 'index.html must not contain the mode tab bar');
  assert.ok(!html.includes('mode-dialogue') && !html.includes('mode-lecture'), 'index.html must not contain mode tab buttons');
  assert.ok(!html.includes('>对话<'), 'index.html must not contain a 对话 tab');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(!/getMode|modeParams|setMode/.test(js), 'app.js must not contain mode-switching code');
  assert.ok(!js.includes("'dialogue'"), 'app.js must not contain a dialogue mode');
  assert.ok(js.includes('LECTURE_UTTERANCE_END_MS = 1000'), 'lecture utterance_end must be 1000');
  assert.ok(js.includes('LECTURE_ENDPOINTING_MS = 300'), 'lecture endpointing must be 300');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert.ok(!css.includes('mode-seg'), 'styles.css must not contain mode tab styles');
  const md = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.ok(!md.includes('Dialogue / Lecture') && !md.includes('对话 / 同传'), 'README must not describe a mode switch');
});

// 9. Start failures are visible: a tap on 开始翻译 either starts listening
//    or shows a clear error on the home screen. Previously a mic denial
//    only wrote to the hidden live-status line, so nothing happened at all
//    and no permission prompt was ever seen.
check('start failures are visible, not swallowed', () => {
  const fs = require('fs'), path = require('path');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(js.includes('showHomeNote'), 'app must have a visible home-note error path');
  assert.ok(js.includes("showHomeNote('无法打开麦克风"), 'mic failure must be shown on the home screen');
  assert.ok(js.includes('Promise.race([micP, micTimeout])'), 'mic acquisition must time out instead of hanging forever');
  assert.ok(js.includes('openTimer') && js.includes('Deepgram 连接超时'), 'a Deepgram connect that never opens must time out visibly');
  assert.ok(js.includes('live.watchId') && js.includes('还没收到声音'), 'a connected session with no audio must say so in the live view');
  assert.ok(js.includes("if (live.active) stopLive('连接已断开"), 'a dropped connection must return home with a visible note');
  assert.ok(js.includes('if (note) showHomeNote(note)'), 'stopLive must surface its note on the home screen');
  assert.ok(!js.includes("$('live-status').textContent = '无法打开麦克风"), 'mic failure must not only write to the hidden live-status line');
});

// 10. Locked keys (private build): public default is unlocked; the private
//     build script flips lockedKeys, and the app then removes the key
//     fields, Save and Clear buttons while keeping both test buttons.
check('locked keys: public unlocked, private script flips the flag', () => {
  const fs = require('fs'), path = require('path');
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  assert.ok(cfg.includes('lockedKeys: false'), 'public config.js must default lockedKeys to false');
  assert.strictEqual(app.LOCKED_KEYS, false);
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(js.includes('lockKeySettings'), 'app must remove key fields when lockedKeys is on');
  assert.ok(js.includes("kf.remove()") && js.includes("sb.remove()") && js.includes("cb.remove()"), 'lock must remove key fields, Save and Clear');
  const shPath = path.join(__dirname, '..', 'scripts', 'build-private.sh');
  // build-private.sh exists only in the private repo — it names Secrets env
  // vars, so it must stay out of the public repo. Skip its checks there.
  if (fs.existsSync(shPath)) {
    const sh = fs.readFileSync(shPath, 'utf8');
    assert.ok(sh.includes("lockedKeys: false,/  lockedKeys: true,/"), 'build-private.sh must flip lockedKeys to true');
    assert.ok(!sh.includes('enableBalance'), 'build-private.sh must not reference the removed balance flag');
  }
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('id="key-fields"'), 'key fields must be grouped for removal');
  assert.ok(html.includes('btn-test-groq') && html.includes('btn-test-dg'), 'both test buttons must stay in Settings');
  assert.ok(html.includes('btn-save-settings') && html.includes('btn-clear-keys'), 'public Settings must keep Save and Clear buttons');
});

console.log(`\nAll ${n} test groups passed.`);
