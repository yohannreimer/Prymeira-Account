import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = readFileSync(new URL('../apps/hub-web/site/analytics.js', import.meta.url), 'utf8');
function fixture(preference, storageFails = false, hostname = "www.prymeiradigital.com.br") {
  const scripts = [], cookieWrites = [], buttons = {};
  const storage = new Map(preference === undefined ? [] : [['prymeira-analytics-consent-v1', JSON.stringify(preference)]]);
  let reloads = 0;
  const button = key => buttons[key] ??= { addEventListener(type, fn) { this[type] = fn; }, focus() {} };
  const context = { window: {}, location: { hostname, reload() { reloads++; } },
    localStorage: { getItem(key) { if (storageFails) throw Error('Blocked'); return storage.get(key); }, setItem(key, value) { if (storageFails) throw Error('Blocked'); storage.set(key, value); } },
    document: { head: { appendChild(el) { scripts.push(el); } }, body: { appendChild(el) { this.notice = el; } },
      createElement() { return { setAttribute() {}, querySelector(selector) { return button(selector); } }; },
      querySelectorAll() { return [button('preferences')]; }, set cookie(value) { cookieWrites.push(value); } }
  };
  vm.runInNewContext(source, context);
  return { context, scripts, cookieWrites, storage, buttons, reloads: () => reloads,
    click(key) { button(key).click(); }, calls() { return (context.window.clarity?.q ?? []).map(args => JSON.parse(JSON.stringify(Array.from(args)))); } };
}
test('no tracking request or event before consent, or after a saved denial', () => {
  for (const pref of [undefined, { granted: false, at: Date.now() }]) {
    const f = fixture(pref); f.context.window.prymeiraAnalytics.track('lead_sent'); assert.equal(f.scripts.length, 0); assert.deepEqual(f.calls(), []);
  }
});
test('accepting loads the correct project once, denies ads and forwards only event names', () => {
  const f = fixture(); f.click('[data-choice="accept"]'); f.click('[data-choice="accept"]');
  assert.equal(f.scripts.length, 1); assert.equal(f.scripts[0].src, 'https://www.clarity.ms/tag/ywkt0aw2m2');
  assert.deepEqual(f.calls()[0], ['consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' }]);
  f.context.window.prymeiraAnalytics.track('lead_sent', { nome: 'Private name', whatsapp: 'Private number' });
  assert.deepEqual(f.calls().at(-1), ['event', 'lead_sent']);
  const count = f.calls().length; f.context.window.prymeiraAnalytics.track('Private name'); assert.equal(f.calls().length, count);
});
test('saved consent loads tracking; expired or future consent asks again', () => {
  assert.equal(fixture({ granted: true, at: Date.now() }).scripts.length, 1);
  for (const at of [Date.now() - 181 * 86400000, Date.now() + 86400000]) {
    const f = fixture({ granted: true, at }); assert.equal(f.scripts.length, 0); assert.equal(f.context.document.body.notice.hidden, false);
  }
});
test('withdrawal stops events, denies storage, clears local cookies and reloads', () => {
  const f = fixture({ granted: true, at: Date.now() }); f.click('[data-choice="deny"]');
  assert.deepEqual(f.calls().at(-1), ['consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' }]);
  const count = f.calls().length; f.context.window.prymeiraAnalytics.track('lead_sent'); assert.equal(f.calls().length, count);
  assert.equal(f.reloads(), 1); assert.equal(JSON.parse(f.storage.get('prymeira-analytics-consent-v1')).granted, false);
  assert.equal(f.cookieWrites.length, 6);
});
test('blocked browser storage does not break consent controls', () => {
  const f = fixture(undefined, true); f.click('[data-choice="accept"]'); assert.equal(f.scripts.length, 1); f.click('[data-choice="deny"]'); assert.equal(f.reloads(), 1);
});
test('form and personalized result are masked in the installed page', () => {
  const html = readFileSync(new URL('../apps/hub-web/site/index.html', import.meta.url), 'utf8');
  for (const id of ['form', 'note', 'done']) assert.match(html, new RegExp(`id="${id}" data-clarity-mask="true"`));
  assert.match(html, /analytics\.js" defer/); assert.match(html, /window\.prymeiraAnalytics\.track\(name\)/);
});

test('local previews and unrelated domains never load the project tracker', () => {
  for (const hostname of ['localhost', 'hub.prymeiradigital.com.br', 'example.com']) {
    const f = fixture({ granted: true, at: Date.now() }, false, hostname);
    assert.equal(f.scripts.length, 0);
  }
});
