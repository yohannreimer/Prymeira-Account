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
    localStorage: { getItem(key) { if (storageFails) throw Error('Blocked'); return storage.get(key); }, removeItem(key) { if (storageFails) throw Error('Blocked'); storage.delete(key); } },
    document: { head: { appendChild(el) { scripts.push(el); } }, body: { appendChild(el) { this.notice = el; } },
      createElement() { return { setAttribute() {}, querySelector(selector) { return button(selector); } }; },
      querySelectorAll() { return [button('preferences')]; }, set cookie(value) { cookieWrites.push(value); } }
  };
  vm.runInNewContext(source, context);
  return { context, scripts, cookieWrites, storage, buttons, reloads: () => reloads,
    click(key) { button(key).click(); }, calls() { return (context.window.clarity?.q ?? []).map(args => JSON.parse(JSON.stringify(Array.from(args)))); } };
}
test('loads automatically with both storage permissions denied before the tracker request', () => {
  const f = fixture();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://www.clarity.ms/tag/ywkt0aw2m2');
  assert.deepEqual(f.calls()[0], ['consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' }]);
  assert.equal(f.context.document.body.notice, undefined);
});
test('legacy acceptance and denial cannot enable cookies or suppress cookieless tracking', () => {
  for (const granted of [true, false]) {
    const f = fixture({ granted, at: Date.now() });
    assert.equal(f.storage.has('prymeira-analytics-consent-v1'), false);
    assert.equal(f.scripts.length, 1);
    assert.equal(f.cookieWrites.length, 6);
    assert.ok(f.cookieWrites.every(value => value.includes('Max-Age=0')));
    assert.deepEqual(f.calls()[0][1], { analytics_Storage: 'denied', ad_Storage: 'denied' });
  }
});
test('blocked storage does not prevent loading; events never forward form values', () => {
  const f = fixture(undefined, true);
  assert.equal(f.scripts.length, 1);
  f.context.window.prymeiraAnalytics.track('lead_sent', { nome: 'Private name', whatsapp: 'Private number' });
  assert.deepEqual(f.calls().at(-1), ['event', 'lead_sent']);
  const count = f.calls().length;
  f.context.window.prymeiraAnalytics.track('Private name');
  assert.equal(f.calls().length, count);
});
test('form and personalized result stay masked, with no consent UI or obsolete stylesheet', () => {
  const html = readFileSync(new URL('../apps/hub-web/site/index.html', import.meta.url), 'utf8');
  for (const id of ['form', 'note', 'done']) assert.match(html, new RegExp(`id="${id}" data-clarity-mask="true"`));
  assert.match(html, /analytics\.js" defer/);
  assert.match(html, /window\.prymeiraAnalytics\.track\(name\)/);
  assert.doesNotMatch(html, /data-analytics-preferences|analytics\.css/);
  const privacy = readFileSync(new URL('../apps/hub-web/site/privacidade.html', import.meta.url), 'utf8');
  assert.match(privacy, /modo sem cookies/);
  assert.doesNotMatch(privacy, /180 dias|escolhe permitir/);
});
test('only both public site domains load tracking; previews and Hub stay excluded', () => {
  for (const hostname of ['www.prymeiradigital.com.br', 'prymeiradigital.com.br']) assert.equal(fixture(undefined, false, hostname).scripts.length, 1);
  for (const hostname of ['localhost', 'hub.prymeiradigital.com.br', 'example.com']) {
    const f = fixture(undefined, false, hostname);
    f.context.window.prymeiraAnalytics.track('lead_sent');
    assert.equal(f.scripts.length, 0);
    assert.deepEqual(f.calls(), []);
    assert.equal(f.cookieWrites.length, 0);
  }
});
