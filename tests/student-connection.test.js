import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { handleRelay } from '../supabase/functions/student-relay/relay.js';

const origin = 'https://gracetang0925.github.io';
const worker = 'https://test.worker.dev';
const relay = 'https://test.supabase.co/functions/v1/student-relay';
const endpoint = 'https://joeuvvmsbskfpmqydogs.supabase.co/functions/v1/student-relay';
const body = { action: 'feedback', essay: '这是一篇虚构的测试作文，测试期间不包含任何真实学习者的信息。' };
const apiResponse = () => new Response(JSON.stringify({ ok: true, requestId: 'synthetic-request', feedback: {} }), { headers: { 'Content-Type': 'application/json' } });
const healthResponse = () => new Response(JSON.stringify({ ok: true, service: 'hongbi-student-relay' }));
function request(payload, headers = {}) {
  return new Request(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
}
function client(fetcher) {
  const context = createContext({ HONGBI_CONFIG: { studentApiUrls: [{ url: relay, kind: 'relay' }, { url: worker, kind: 'worker' }] },
    fetch: fetcher, AbortController, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 40)), clearTimeout });
  runInContext(readFileSync('student-api.js', 'utf8'), context);
  return context.HONGBI_API;
}

test('blocked Worker connection selects the relay; probes never contain writing or authorization', async () => {
  const calls = [];
  const api = client(async (url, options) => {
    calls.push({ url, ...options });
    if (url === worker) throw new TypeError('Load failed');
    return options.method === 'GET' ? healthResponse() : apiResponse();
  });
  assert.equal((await api.request(body)).status, 200);
  const probes = calls.filter(call => call.method !== 'POST');
  assert.equal(probes.length, 2);
  assert.ok(probes.every(call => !call.body && !call.headers));
  assert.deepEqual(calls.filter(call => call.method === 'POST').map(call => call.url), [relay]);
  assert.deepEqual(JSON.parse(calls.find(call => call.method === 'POST').body), body);
});

test('a stalled connection cannot prevent a working route from receiving the operation', async () => {
  const api = client((url, options) => {
    if (url === worker) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
    return Promise.resolve(options.method === 'GET' ? healthResponse() : apiResponse());
  });
  assert.equal((await api.request(body)).status, 200);
});

test('failed probes stop before sending any learner data', async () => {
  const calls = [];
  const api = client(async (_url, options) => { calls.push(options); throw new TypeError('Load failed'); });
  await assert.rejects(api.request(body), { code: 'NO_CONNECTION' });
  assert.ok(calls.every(call => call.method !== 'POST' && !call.body));
});

test('a network failure after POST is not automatically replayed on another route', async () => {
  const posts = [];
  let relayFailed = false;
  const api = client(async (url, options) => {
    if (options.method === 'POST') {
      posts.push(url);
      if (url === relay) { relayFailed = true; throw new TypeError('Lost after sending'); }
      return apiResponse();
    }
    if (url === relay) { if (relayFailed) throw Error('offline'); return healthResponse(); }
    if (!relayFailed) throw Error('Worker not reachable yet');
    return new Response(null, { status: 204 });
  });
  await assert.rejects(api.request(body), { code: 'CONNECTION_INTERRUPTED' });
  assert.deepEqual(posts, [relay]);
  assert.equal((await api.request(body)).status, 200);
  assert.deepEqual(posts, [relay, worker]);
});

test('provider HTTP errors are returned once and cancellation before submit sends no POST', async () => {
  let posts = 0;
  const api = client(async (_url, options) => {
    if (options.method === 'POST') { posts++; return new Response('{}', { status: 429 }); }
    return options.method === 'GET' ? healthResponse() : new Response(null, { status: 204 });
  });
  assert.equal((await api.request(body)).status, 429);
  assert.equal(posts, 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.request(body, { signal: controller.signal }), { code: 'REQUEST_CANCELLED' });
  assert.equal(posts, 1);
});

test('relay health and preflight do not submit a model request', async () => {
  const calls = [];
  const upstream = async (url, options) => { calls.push({ url, ...options }); return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin } }); };
  const preflight = await handleRelay(new Request(endpoint, { method: 'OPTIONS', headers: { Origin: origin } }), upstream);
  assert.equal(preflight.status, 204);
  assert.equal(calls.length, 0);
  const health = await handleRelay(new Request(endpoint), upstream);
  assert.equal((await health.json()).service, 'hongbi-student-relay');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'OPTIONS');
  assert.equal(calls[0].body, undefined);
});

test('relay rejects other origins, teacher actions, credentials and arbitrary proxy operations', async () => {
  let calls = 0;
  const upstream = async () => { calls++; throw Error('must not reach upstream'); };
  for (const action of ['listTeacherSubmissions', 'saveTeacherAnnotations', '__proto__', 'fetch']) {
    assert.equal((await handleRelay(request({ action }), upstream)).status, 400);
  }
  assert.equal((await handleRelay(request(body, { Origin: 'https://example.com' }), upstream)).status, 403);
  assert.equal((await handleRelay(request(body, { Authorization: 'Bearer private-teacher-token' }), upstream)).status, 403);
  assert.equal((await handleRelay(new Request(endpoint, { method: 'POST', body: '{}' }), upstream)).status, 403);
  assert.equal(calls, 0);
});

test('relay bounds streamed payloads even when a Content-Length claims the body is small', async () => {
  let calls = 0;
  const response = await handleRelay(new Request(endpoint, { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'Content-Length': '1' },
    body: JSON.stringify({ ...body, essay: 'x'.repeat(8_400_000) }) }), async () => { calls++; });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('relay forwards a student operation once to a fixed upstream and preserves request errors', async () => {
  const calls = [];
  const response = await handleRelay(request({ ...body, url: 'https://attacker.example' }), async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify({ ok: false, requestId: 'test-id', error: { message: 'AI 暂时不可用。' } }), { status: 429 });
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('X-Request-ID'), 'test-id');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://chinese-feedback-proxy.tangxiazhen94.workers.dev');
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(JSON.parse(calls[0].body).essay, body.essay);
});

test('relay never exposes an upstream HTML page or exception in the public error response', async () => {
  for (const fetcher of [async () => new Response('<html>private upstream detail</html>', { status: 500 }), async () => { throw Error('secret-value'); }]) {
    const response = await handleRelay(request(body), fetcher);
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private upstream detail|secret-value/);
  }
});
