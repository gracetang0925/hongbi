import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { feedback, record } from './fixtures.js';

function pageContext(file, initialStorage = {}) {
  const nodes = new Map(), storage = new Map(Object.entries(initialStorage));
  const element = () => ({ textContent: '', innerHTML: '', value: '', checked: true, hidden: false, disabled: false,
    style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, scrollIntoView() {} });
  const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    querySelector() { return element(); }, querySelectorAll() { return []; } };
  const context = createContext({ document, crypto, TextEncoder, console, AbortController,
    localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } },
    setInterval() {}, setTimeout() {}, clearTimeout() {}, clearInterval() {},
    HONGBI_CONFIG: { workerUrl: 'https://test.worker.dev' }, window: {}, alert() {}, feedback, record });
  const html = readFileSync(file, 'utf8');
  if (file === 'index.html') runInContext(readFileSync('student-api.js', 'utf8'), context);
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) runInContext(script[1], context);
  return { context, nodes, storage, run: code => runInContext(code, context) };
}

test('reward counters survive but session capabilities never enter browser storage', () => {
  const page = pageContext('index.html', { hongbiGardenRewardsV1: JSON.stringify({ seeds: 4, water: 2,
    claimed: ['legacy-private-session:reward'] }) });
  const session = page.run('SESSION_ID');
  assert.deepEqual(JSON.parse(page.storage.get('hongbiGardenRewardsV1')), { seeds: 4, water: 2 });
  assert.equal(page.run("awardLocalReward('seeds',1,'draft:1','reward')"), true);
  assert.equal(page.run("awardLocalReward('seeds',1,'draft:1','reward')"), false);
  assert.deepEqual(JSON.parse(page.storage.get('hongbiGardenRewardsV1')), { seeds: 5, water: 2 });
  assert.ok(!JSON.stringify([...page.storage]).includes(session));
});

test('practice and teacher annotation HTML escape model/student input', async () => {
  const page = pageContext('index.html');
  const html = page.run("renderPractice({...feedback.practice, question_zh:'<img src=x onerror=alert(1)>'},1)");
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(html, /practice-example" hidden/);
  assert.match(html, /不是自动评分/);
  page.run("submittedMode='teacher'; document.getElementById('studentName').value='同学';");
  page.context.fetch = async () => ({ ok: true, json: async () => ({ annotations: [{ type: '<b>', text: '<img onerror=alert(1)>' }] }) });
  await page.run('checkTeacherFeedback()');
  assert.doesNotMatch(page.nodes.get('teacherBody').innerHTML, /<img onerror/);
});

test('student reset and learner changes rotate the opaque session ID', async () => {
  const page = pageContext('index.html');
  const first = page.run('SESSION_ID');
  page.run('clearAll()');
  const second = page.run('SESSION_ID');
  assert.notEqual(first, second);
  assert.match(second, /^[a-f\d-]{36}$/);
  page.run("sessionStudentName='同学一'; document.getElementById('studentName').value='同学二'; document.getElementById('essayInput').value='这是一篇足够长的测试作文，用来检查切换学习者后是否使用新的会话。'");
  let request;
  page.context.fetch = async (_url, options) => { request = JSON.parse(options.body); return { ok: true, json: async () => ({ feedback }) }; };
  await page.run('getFeedback(1)');
  assert.notEqual(request.logData.sessionId, second);
  assert.equal(request.logData.studentName, '同学二');
  assert.equal(request.useMemory, true);
});

test('teacher background refresh stays idle before login', async () => {
  const page = pageContext('teacher.html');
  let requests = 0;
  page.context.fetch = async () => { requests++; throw new Error('should not call'); };
  await page.run('loadSubmissions()');
  assert.equal(requests, 0);
});

test('Safari body-stream failures preserve writing and explain how to check the connection', async () => {
  const page = pageContext('index.html');
  page.run("document.getElementById('studentName').value='虚构测试'; document.getElementById('essayInput').value='这是一篇足够长的虚构作文，用来检查网络断开时会不会保留原文。'");
  const original = page.nodes.get('essayInput').value;
  let posts = 0;
  page.context.fetch = async () => { posts++; return { ok: true, json: async () => { throw new TypeError('Load failed'); } }; };
  await page.run('getFeedback(1)');
  assert.equal(posts, 1);
  assert.equal(page.nodes.get('essayInput').value, original);
  assert.match(page.nodes.get('errorMsg').textContent, /检查连接/);
  assert.doesNotMatch(page.nodes.get('errorMsg').textContent, /Load failed/);
  assert.equal(page.nodes.get('connectionBtn').disabled, false);
});

test('teacher login uses the Worker and keeps the token out of local storage', async () => {
  const page = pageContext('teacher.html');
  page.nodes.set('loginPwd', { value: 'private-invite-token' });
  let request;
  page.context.fetch = async (url, options) => { request = { url, options };
    return { ok: true, json: async () => ({ submissions: [record], nextOffset: null }) }; };
  await page.run('doLogin()');
  assert.equal(request.url, 'https://test.worker.dev');
  assert.equal(request.options.headers.Authorization, 'Bearer private-invite-token');
  assert.equal(JSON.parse(request.options.body).action, 'listTeacherSubmissions');
  assert.doesNotMatch(JSON.stringify([...page.storage]), /private-invite-token/);
  assert.equal(page.nodes.get('loginPwd').value, '');
  assert.equal(page.run('allSubmissions.length'), 1);
  page.run('logout()');
  assert.equal(page.run('teacherToken'), '');
  assert.equal(page.run('allSubmissions.length'), 0);
});

test('a queue response arriving after logout cannot repopulate the page', async () => {
  const page = pageContext('teacher.html');
  page.run("teacherToken='private-token'");
  let release;
  page.context.fetch = () => new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({ submissions: [record], nextOffset: null }) }); });
  const pending = page.run('loadSubmissions()');
  page.run('logout()');
  release();
  await pending;
  assert.equal(page.run('allSubmissions.length'), 0);
  assert.equal(page.nodes.get('app').style.display, 'none');
});

test('returning teacher feedback saves annotations and status in a single request', async () => {
  const page = pageContext('teacher.html');
  page.run("teacherToken='private-token'; allSubmissions=[record]; currentSub=record; currentAnnotations=[{id:100,type:'鼓励',text:'继续尝试'}]");
  let request;
  page.context.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ submission: { id: record.id, status: 'returned', teacher_annotations: request.annotations } }) };
  };
  await page.run('returnToStudent()');
  assert.equal(request.status, 'returned');
  assert.equal(request.action, 'saveTeacherAnnotations');
  assert.equal(request.annotations[0].text, '继续尝试');
});
