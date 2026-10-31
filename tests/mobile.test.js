import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { SHARE_URL, PUBLIC_APP_URL, preferredLanguage } from '../mobile-core.js';

function serviceWorker({ online = true, cacheBroken = false } = {}) {
  const handlers = {}, entries = new Map(), deleted = [], writes = [];
  const self = { location: { href: `${PUBLIC_APP_URL}sw.js` }, clients: { async claim() {} },
    addEventListener(name, fn) { handlers[name] = fn; } };
  const context = createContext({ self, URL, Request, Response,
    fetch: async () => { if (!online) throw Error('offline'); return new Response('fresh public page'); },
    caches: {
      async open() { if (cacheBroken) throw Error('quota'); return {
        async addAll(requests) { writes.push(...requests.map(r => r.url)); },
        async put(key, response) { writes.push(key); entries.set(key, response); }
      }; },
      async keys() { return ['hongbi-public-old', 'another-app-cache']; },
      async delete(key) { deleted.push(key); },
      async match(key) { return entries.get(key)?.clone(); }
    }
  });
  runInContext(readFileSync('sw.js', 'utf8'), context);
  const dispatch = (url, method = 'GET', mode = 'cors') => {
    let response;
    handlers.fetch({ request: { url, method, mode }, respondWith(value) { response = value; } });
    return response;
  };
  return { handlers, entries, deleted, writes, dispatch };
}

test('QR/share link is fixed and language choice never reads a learner URL', () => {
  const share = new URL(SHARE_URL);
  assert.equal(share.origin, new URL(PUBLIC_APP_URL).origin);
  assert.deepEqual([...share.searchParams.keys()], ['lang', 'source']);
  assert.equal(preferredLanguage('?lang=en', 'zh', ['zh-CN']), 'en');
  assert.equal(preferredLanguage('?lang=untrusted', 'zh', ['en']), 'zh');
  assert.equal(preferredLanguage('', null, ['zh-SG']), 'zh');
  assert.equal(preferredLanguage('', null, ['fr-FR']), 'en');
});

test('manifest is scoped to the repo and all icons exist at their stated dimensions', () => {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(new URL(manifest.scope, PUBLIC_APP_URL).pathname, '/hongbi/');
  assert.equal(new URL(manifest.start_url, PUBLIC_APP_URL).pathname, '/hongbi/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    assert.ok(existsSync(icon.src));
    const png = readFileSync(icon.src);
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
});

test('service worker never intercepts teacher pages, APIs, POSTs or unknown files', () => {
  const worker = serviceWorker();
  for (const url of [`${PUBLIC_APP_URL}teacher.html`, `${PUBLIC_APP_URL}teacher-demo.html`, `${PUBLIC_APP_URL}teacher-demo.js`, 'https://test.worker.dev', `${PUBLIC_APP_URL}private.json`]) {
    assert.equal(worker.dispatch(url, 'GET', 'navigate'), undefined);
  }
  assert.equal(worker.dispatch(PUBLIC_APP_URL, 'POST', 'navigate'), undefined);
});

test('offline app navigation gets only the public shell and ignores learner query values', async () => {
  const worker = serviceWorker({ online: false });
  worker.entries.set(`${PUBLIC_APP_URL}index.html`, new Response('public shell'));
  const response = await worker.dispatch(`${PUBLIC_APP_URL}?lang=en&session=private`, 'GET', 'navigate');
  assert.equal(await response.text(), 'public shell');
  assert.equal(worker.writes.length, 0);
});

test('service worker install caches only named public assets and cleanup is namespaced', async () => {
  const worker = serviceWorker();
  let pending;
  worker.handlers.install({ waitUntil(value) { pending = value; } });
  await pending;
  assert.ok(worker.writes.includes(`${PUBLIC_APP_URL}index.html`));
  assert.ok(worker.writes.every(url => !/teacher|session|token|feedback/i.test(new URL(url).pathname)));
  worker.handlers.activate({ waitUntil(value) { pending = value; } });
  await pending;
  assert.deepEqual(worker.deleted, ['hongbi-public-old']);
});

test('cache quota errors preserve a successful online response', async () => {
  const worker = serviceWorker({ cacheBroken: true });
  const response = await worker.dispatch(PUBLIC_APP_URL, 'GET', 'navigate');
  assert.equal(await response.text(), 'fresh public page');
});
