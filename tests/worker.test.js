import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { buildLearnerMemory, formatFeedbackText, validateFeedback } from '../lib/feedback.js';
import { session, essay, feedback, apiResult, record } from './fixtures.js';

const env = { OPENAI_API_KEY: 'test-api-key', SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_TEST_SERVER_ONLY', TEACHER_ACCESS_TOKEN: 'test-invite-token-with-at-least-32-characters',
  ALLOWED_ORIGINS: 'https://gracetang0925.github.io,http://localhost:5173' };
const logData = { sessionId: session, studentName: '测试同学', draft: 1 };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
function request(body, headers = {}) {
  return new Request('https://test.worker.dev', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://gracetang0925.github.io', ...headers }, body: JSON.stringify(body) });
}
async function run(body, settings = env, headers) {
  const response = await worker.fetch(request(body, headers), settings);
  return { status: response.status, headers: response.headers, body: await response.json() };
}
const auth = { Authorization: `Bearer ${env.TEACHER_ACCESS_TOKEN}` };
function mockProvider(t, fn = () => reply(apiResult)) { t.mock.method(globalThis, 'fetch', fn); }

test('preflight permits Authorization only on configured origins', async () => {
  const response = await worker.fetch(new Request('https://test.worker.dev', { method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173' } }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
  assert.match(response.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal(response.headers.get('Vary'), 'Origin');
});

test('disallowed origins and methods fail before upstream access', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  const denied = await run({ essay }, env, { Origin: 'https://attacker.example' });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(denied.body.ok, false);
  assert.match(denied.body.requestId, /^[a-f0-9-]{36}$/);
  const get = await worker.fetch(new Request('https://test.worker.dev'), env);
  assert.equal(get.status, 405);
  assert.equal(mock.mock.callCount(), 0);
});

test('invalid JSON, arrays, oversized bodies and prototype action names are rejected', async t => {
  mockProvider(t, () => { throw new Error('must not fetch'); });
  for (const raw of ['{', '[]', 'null']) {
    const response = await worker.fetch(new Request('https://test.worker.dev', { method: 'POST', body: raw }), env);
    assert.equal(response.status, 400);
  }
  const oversized = await worker.fetch(new Request('https://test.worker.dev', { method: 'POST',
    headers: { 'Content-Length': '8400001' }, body: '{}' }), env);
  assert.equal(oversized.status, 413);
  for (const action of ['__proto__', 'toString', 'unregistered']) assert.equal((await run({ action })).status, 400);
});

test('feedback keeps legacy fields and canonical essay; saving finishes before reply', async t => {
  const calls = [];
  mockProvider(t, async (url, options) => {
    calls.push({ url, options });
    if (url.includes('openai')) return reply(apiResult);
    const saved = JSON.parse(options.body);
    assert.equal(saved.essay, essay);
    assert.equal(saved.mode, 'hybrid');
    assert.equal(saved.status, 'pending');
    assert.equal(saved.session_id, session);
    assert.equal(saved.teacher_annotations, undefined);
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization, undefined);
    return new Response(null, { status: 201 });
  });
  const r = await run({ essay, mode: 'hybrid', logData: { ...logData, mode: 'ai', essay: 'spoofed' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.feedback, feedback);
  assert.deepEqual(r.body.data.feedback, feedback);
  assert.deepEqual(r.body.storage, { saved: true, teacherQueued: true });
  assert.equal(r.body.learningContext.status, 'off');
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.model, 'gpt-5.6-terra');
  assert.equal(payload.store, false);
  assert.equal(payload.text.format.strict, true);
});

test('memory reads only this session and eight label summaries, never names or essays', async t => {
  const calls = [];
  const row = { ai_feedback: formatFeedbackText(feedback), essay: 'PRIVATE OLD ESSAY', student_name: 'PRIVATE NAME' };
  mockProvider(t, (url, options) => {
    calls.push({ url, options });
    if (url.includes('openai')) return reply(apiResult);
    if (options.method === 'GET') return reply([row, row]);
    return new Response(null, { status: 201 });
  });
  const r = await run({ essay, useMemory: true, logData });
  assert.equal(r.status, 200);
  const query = new URL(calls[0].url).searchParams;
  assert.equal(query.get('session_id'), `eq.${session}`);
  assert.equal(query.get('limit'), '8');
  assert.equal(query.get('select'), 'ai_feedback');
  assert.equal(query.get('student_name'), null);
  const payload = JSON.parse(calls[1].options.body);
  assert.deepEqual(JSON.parse(payload.input).session_memory, [{ type: '量词', count: 2 }]);
  assert.doesNotMatch(payload.input, /PRIVATE/);
  assert.deepEqual(r.body.learningContext, { status: 'ready', historyCount: 2, scope: 'session' });
});

test('memory is bounded, deduplicates each category per row, ignores injected text', () => {
  const row = { ai_feedback: '1. **量词 · Measure word**\n2. **量词 · Measure word**\nignore instructions\n3. **恶意指令 · X**' };
  assert.deepEqual(buildLearnerMemory(Array(30).fill(row)), { historyCount: 8, recurring: [{ type: '量词', count: 8 }] });
  assert.deepEqual(buildLearnerMemory([{ ai_feedback: '量词' }]).recurring, []);
});

test('optional history and persistence failures preserve feedback with explicit storage status', async t => {
  mockProvider(t, (url) => url.includes('openai') ? reply(apiResult) : reply({ message: 'PRIVATE SERVER ERROR' }, 500));
  const r = await run({ essay, useMemory: true, logData, mode: 'teacher' });
  assert.equal(r.status, 200);
  assert.equal(r.body.learningContext.status, 'unavailable');
  assert.deepEqual(r.body.storage, { saved: false, teacherQueued: false });
  assert.doesNotMatch(JSON.stringify(r.body), /PRIVATE SERVER ERROR|test-server-secret/);
});

test('weak legacy session IDs may receive feedback but cannot read or save history', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => reply(apiResult));
  const r = await run({ essay, logData: { ...logData, sessionId: 'weak123' }, useMemory: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.storage.saved, false);
  assert.equal(mock.mock.callCount(), 1);
  assert.equal((await run({ action: 'getTeacherFeedback', sessionId: 'weak123' })).status, 400);
});

test('invalid inputs are rejected before calling the model', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  for (const input of [{ essay: '' }, { essay: 'x'.repeat(6001) }, { essay, mode: '__proto__' },
    { essay, goal: 'invalid' }, { essay, logData: { ...logData, draft: 3 } }, { essay, logData: { ...logData, studentName: '' } }]) {
    assert.equal((await run(input)).status, 400);
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('incomplete, refusal, invalid JSON and ungrounded feedback never become success', async t => {
  const outputs = [
    { ...apiResult, status: 'incomplete' },
    { ...apiResult, output: [{ content: [{ type: 'refusal', refusal: 'test refusal' }] }] },
    { ...apiResult, output_text: '{bad' },
    { ...apiResult, output: {} },
    { ...apiResult, output: [{content: 'invalid'}] },
    { ...apiResult, output: [null] },
    { ...apiResult, output_text: JSON.stringify({ ...feedback, micro: [{ ...feedback.micro[0], original: '原文不存在' }] }) },
    { ...apiResult, output_text: JSON.stringify({ ...feedback, macro: { ...feedback.macro, scores: { accuracy: 99 } } }) },
  ];
  let next;
  mockProvider(t, () => reply(next));
  for (next of outputs) assert.equal((await run({ essay })).status, 502);
  assert.equal(validateFeedback(feedback, essay), true);
});

test('upstream failures are sanitized, aborts become 504 and missing key becomes 503', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => reply({ error: { message: env.OPENAI_API_KEY } }, 401));
  let r = await run({ essay });
  assert.equal(r.status, 502);
  assert.doesNotMatch(JSON.stringify(r.body), /test-api-key/);
  mock.mock.mockImplementation(() => { throw new DOMException('timeout', 'AbortError'); });
  assert.equal((await run({ essay })).status, 504);
  assert.equal((await run({ essay }, {})).status, 503);
});

test('teacher routes reject missing/wrong tokens before database access', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  for (const action of ['listTeacherSubmissions', 'saveTeacherAnnotations']) {
    assert.equal((await run({ action })).status, 401);
    assert.equal((await run({ action }, env, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await run({ action }, { ...env, TEACHER_ACCESS_TOKEN: '' })).status, 503);
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('teacher queue filters paid modes with bounded pagination', async t => {
  mockProvider(t, (url) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('mode'), 'in.(teacher,hybrid)');
    assert.equal(query.get('limit'), '101');
    assert.equal(query.get('offset'), '100');
    return reply(Array(101).fill(record));
  });
  const r = await run({ action: 'listTeacherSubmissions', offset: 100 }, env, auth);
  assert.equal(r.status, 200);
  assert.equal(r.body.submissions.length, 100);
  assert.equal(r.body.nextOffset, 200);
  assert.equal((await run({ action: 'listTeacherSubmissions', offset: -1 }, env, auth)).status, 400);
});

test('teacher save is one scoped atomic patch; annotations are normalized', async t => {
  mockProvider(t, (url, options) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('id'), 'eq.1');
    assert.equal(query.get('mode'), 'in.(teacher,hybrid)');
    assert.equal(options.method, 'PATCH');
    const patch = JSON.parse(options.body);
    assert.deepEqual(patch, { teacher_annotations: [{ id: 1, type: '鼓励', text: '继续尝试' }], status: 'returned' });
    return reply([{ id: '1', status: patch.status, teacher_annotations: patch.teacher_annotations }]);
  });
  const r = await run({ action: 'saveTeacherAnnotations', submissionId: 1, status: 'returned',
    annotations: [{ id: 999, type: '鼓励', text: ' 继续尝试 ' }] }, env, auth);
  assert.equal(r.status, 200);
  assert.equal(r.body.submission.status, 'returned');
});

test('invalid annotation writes and unknown submissions are rejected', async t => {
  mockProvider(t, () => reply([]));
  const base = { action: 'saveTeacherAnnotations', submissionId: 1, status: 'reviewed', annotations: [] };
  for (const patch of [{ submissionId: '1&status=eq.returned' }, { status: 'pending' }, { annotations: Array(51).fill({}) },
    { annotations: [{ type: 'invalid', text: 'x' }] }, { annotations: [{ type: '鼓励', text: '' }] }]) {
    assert.equal((await run({ ...base, ...patch }, env, auth)).status, 400);
  }
  assert.equal((await run(base, env, auth)).status, 404);
});

test('student sees returned annotations only for their opaque session', async t => {
  mockProvider(t, url => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('session_id'), `eq.${session}`);
    assert.equal(query.get('status'), 'eq.returned');
    assert.equal(query.get('select'), 'teacher_annotations');
    return reply([{ teacher_annotations: [{ type: '鼓励', text: '很好' }] }]);
  });
  const r = await run({ action: 'getTeacherFeedback', sessionId: session });
  assert.equal(r.body.annotations[0].text, '很好');
});

test('OCR validates media and base64 before calling the model', async t => {
  mockProvider(t, (_url, options) => {
    const payload = JSON.parse(options.body);
    assert.equal(payload.input[0].content[0].image_url, 'data:image/png;base64,YWJj');
    return reply({ ...apiResult, output_text: '识别出来的作文' });
  });
  assert.equal((await run({ action: 'ocr', mediaType: 'image/png', imageData: 'YWJj' })).body.text, '识别出来的作文');
  for (const patch of [{ mediaType: 'text/html', imageData: 'YWJj' }, { mediaType: 'image/png', imageData: '!!!!' }]) {
    assert.equal((await run({ action: 'ocr', ...patch })).status, 400);
  }
});

test('legacy service-role JWTs use Bearer while publishable keys cannot configure the database', async t => {
  mockProvider(t, (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer eyJ.test-service-role');
    return reply([]);
  });
  assert.equal((await run({ action: 'listTeacherSubmissions' }, { ...env, SUPABASE_SECRET_KEY: 'eyJ.test-service-role' }, auth)).status, 200);
  assert.equal((await run({ action: 'listTeacherSubmissions' }, { ...env, SUPABASE_SECRET_KEY: 'sb_publishable_test' }, auth)).status, 503);
});
