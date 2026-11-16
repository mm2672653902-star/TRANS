/* TRANS tests — pure helpers only, no keys, no network. Run: node test/test.js */
'use strict';
const assert = require('assert');
const app = require('../app.js');

let n = 0;
function check(name, fn) { fn(); n++; console.log('ok - ' + name); }

// 1. Deepgram WebSocket URL: exact endpoint + params from the spec
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

// 3. Build flag: public build has the balance feature OFF by default.
//    (No Groq quota display exists in any build — Groq has no balance API.)
check('balance flag defaults OFF in public build', () => {
  const fs = require('fs'), path = require('path');
  assert.strictEqual(app.ENABLE_BALANCE, false);
  assert.strictEqual(app.parseGroqHeaders, undefined);
  assert.strictEqual(app.groqEstimate, undefined);
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  assert.ok(cfg.includes('enableBalance: false'), 'public config.js must default to false');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('config.js'), 'index.html must load config.js before app.js');
  assert.ok(!html.includes('quota-groq'), 'public HTML must not contain a Groq quota line');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(!/groqEstimate|parseGroqHeaders|loadGroqUsage/.test(js), 'no Groq quota/counter code may remain');
});

// 4. VPN hint: network errors show a friendly hint, never a raw error object
check('network errors show the VPN hint', () => {
  const fs = require('fs'), path = require('path');
  const js = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(js.includes('网络不通？试试开梯子再重试'), 'app must show the VPN hint on network errors');
  assert.ok(!/settings-result.*e\.message/.test(js), 'no raw error message may be shown in Settings');
});

// 5. Money + Deepgram balance text: never invent a number
check('dgBalanceText', () => {
  assert.strictEqual(app.formatMoney(200), '$200.00');
  assert.strictEqual(app.dgBalanceText({ state: 'ok', amount: 200 }), 'Deepgram 剩余 $200.00');
  assert.strictEqual(app.dgBalanceText({ state: 'missing' }), 'Deepgram 剩余 —（未填写 Key）');
  assert.strictEqual(app.dgBalanceText({ state: 'invalid' }), 'Deepgram 剩余 —（Key 无效）');
  assert.ok(app.dgBalanceText({ state: 'cors' }).includes('无法读取'));
  assert.strictEqual(app.dgBalanceText(null), '未填写 / 无法读取');
});

// 6. Print HTML: 3 modes, Chinese present, HTML-escaped
check('buildPrintHTML modes', () => {
  const s = { startedAt: Date.now(), srcLang: 'en', tgtLang: 'zh-CN', items: [{ src: 'Hello world.', tgt: '你好，世界。' }, { src: 'Second <b>line</b>.', tgt: '第二行。' }] };
  const bi = app.buildPrintHTML(s, 'bilingual');
  assert.ok(bi.includes('你好，世界。') && bi.includes('Hello world.'));
  assert.ok(!bi.includes('<b>line</b>'), 'must escape user text');
  assert.ok(bi.includes('Noto Sans SC') && bi.includes('@page'));
  const src = app.buildPrintHTML(s, 'src');
  assert.ok(src.includes('Hello world.') && !src.includes('你好'));
  const tgt = app.buildPrintHTML(s, 'tgt');
  assert.ok(tgt.includes('你好') && !tgt.includes('Hello world.'));
});

// 7. No hardcoded keys anywhere in the shipped source (placeholder text only)
check('no keys in source', () => {
  const fs = require('fs'), path = require('path');
  const files = ['app.js', 'index.html', 'styles.css', 'config.js', 'README.md', 'PRIVATE-BUILD.md', 'capacitor.config.json', 'manifest.webmanifest', 'scripts/build-private.sh'];
  for (const f of files) {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/gsk_[A-Za-z0-9]{10,}/.test(t), f + ' contains a Groq-looking key');
    assert.ok(!/\b[0-9a-f]{40}\b/.test(t), f + ' contains a 40-hex Deepgram-looking key');
  }
});

// 8. No grey helper text inside the app: no muted/small hint text, no
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

console.log(`\nAll ${n} test groups passed.`);
