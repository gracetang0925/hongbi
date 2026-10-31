import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAMPLE_SUBMISSIONS, createDemoSubmissions, filterDemoSubmissions, saveDemoReview } from '../teacher-demo-core.js';

test('each visitor starts with fresh fictional examples; edits cannot change the seed or another visitor', () => {
  const first = createDemoSubmissions(), second = createDemoSubmissions();
  const before = JSON.stringify(SAMPLE_SUBMISSIONS);
  const updated = saveDemoReview(first, first[0].id, [{ type: '逻辑', quote: first[0].essay.slice(0, 8), text: 'A demo comment' }], true);
  updated[0].notes[0].text = 'Changed later';
  assert.equal(first[0].notes.length, 0);
  assert.equal(second[0].status, 'pending');
  assert.equal(second[0].notes.length, 0);
  assert.equal(JSON.stringify(SAMPLE_SUBMISSIONS), before);
  assert.equal(Object.isFrozen(SAMPLE_SUBMISSIONS[0].strength), true);
});

test('search supports either language, essay text and review status', () => {
  const rows = createDemoSubmissions();
  assert.equal(filterDemoSubmissions(rows, 'LETTER')[0].id, 'sample-letter');
  assert.equal(filterDemoSubmissions(rows, '小鸟')[0].id, 'sample-park');
  assert.equal(filterDemoSubmissions(rows, '', 'returned')[0].id, 'sample-help');
  assert.deepEqual(filterDemoSubmissions(rows, '不存在'), []);
});

test('simulated returns require feedback and quotations must belong to the selected essay', () => {
  const rows = createDemoSubmissions(), id = rows[0].id;
  const good = { type: '鼓励', quote: '', text: 'A useful detail.' };
  assert.throws(() => saveDemoReview(rows, id, [], true));
  assert.throws(() => saveDemoReview(rows, id, [{ ...good, quote: rows[1].essay }], true));
  assert.throws(() => saveDemoReview(rows, 'real-database-id', [good], true));
  assert.throws(() => saveDemoReview(rows, id, [{ ...good, type: '__proto__' }]));
  assert.throws(() => saveDemoReview(rows, id, [{ ...good, text: ' ' }]));
  assert.throws(() => saveDemoReview(rows, id, Array(21).fill(good)));
  const draft = saveDemoReview(rows, id, [good]);
  assert.equal(draft[0].status, 'draft');
  const returned = saveDemoReview(draft, id, [good], true);
  assert.equal(returned[0].status, 'returned');
  assert.equal(returned[1], rows[1]);
});

test('saving snapshots the annotations rather than retaining a mutable draft reference', () => {
  const rows = createDemoSubmissions();
  const notes = [{ type: '其他', quote: '', text: '  Example feedback  ' }];
  const updated = saveDemoReview(rows, rows[0].id, notes);
  notes[0].text = 'Later change';
  notes.push({ type: '其他', quote: '', text: 'Another' });
  assert.deepEqual(updated[0].notes, [{ type: '其他', quote: '', text: 'Example feedback' }]);
});

test('public demo denies API connections and has no production config or storage dependency', () => {
  const html = readFileSync('teacher-demo.html', 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /\bon\w+\s*=/i);
  for (const path of ['teacher-demo.js', 'teacher-demo-core.js']) {
    const js = readFileSync(path, 'utf8');
    assert.doesNotMatch(js, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\s*[.(]/);
    assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|config\.js|workers\.dev|supabase\.co/);
  }
  assert.match(readFileSync('index.html', 'utf8'), /href="teacher-demo.html\?lang=en"/);
  assert.match(readFileSync('teacher.html', 'utf8'), /href="teacher-demo.html\?lang=en"/);
});
