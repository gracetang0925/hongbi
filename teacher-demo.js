import { NOTE_TYPES, createDemoSubmissions, filterDemoSubmissions, saveDemoReview } from './teacher-demo-core.js';
import { preferredLanguage } from './mobile-core.js';

// Deliberately isolated: no provider configuration, fetch, storage or production API.
const $ = id => document.getElementById(id);
let language = preferredLanguage(location.search, null, navigator.languages);
let submissions = createDemoSubmissions();
let selectedId = submissions[0].id;
const drafts = new Map();
const translatedElements = [...document.querySelectorAll('[data-zh]')];
translatedElements.forEach(element => { element.dataset.en = element.textContent; });
const text = (zh, en) => language === 'zh' ? zh : en;
const local = value => value[language];
const current = () => submissions.find(item => item.id === selectedId);
function notes() {
  if (!drafts.has(selectedId)) drafts.set(selectedId, structuredClone(current().notes));
  return drafts.get(selectedId);
}
const statusLabel = status => ({
  pending: text('待批改', 'To review'),
  draft: text('已存草稿', 'Draft saved'),
  returned: text('已模拟发回', 'Return simulated'),
})[status];

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function renderQueue() {
  const items = filterDemoSubmissions(submissions, $('searchDemo').value, $('statusFilter').value);
  $('queueCount').textContent = `${items.length} / ${submissions.length}`;
  $('emptyQueue').hidden = items.length > 0;
  $('essayQueue').replaceChildren(...items.map(item => {
    const row = element('li');
    const button = element('button', undefined, 'essay-card');
    button.type = 'button';
    button.dataset.id = item.id;
    button.setAttribute('aria-pressed', String(item.id === selectedId));
    button.append(element('small', `${item.learner} · ${text('虚构', 'Fictional')}`), element('strong', local(item.title)));
    const status = element('span', statusLabel(item.status), 'status-tag');
    status.dataset.status = item.status;
    button.append(status);
    button.addEventListener('click', () => {
      if (item.id === selectedId) return;
      selectedId = item.id;
      $('annotationForm').reset();
      $('formMessage').textContent = '';
      $('demoStatus').textContent = '';
      renderQueue();
      renderReview();
      $('reviewTitle').focus({ preventScroll: true });
    });
    row.append(button);
    return row;
  }));
}

function renderNotes() {
  $('noAnnotations').hidden = notes().length > 0;
  $('annotationList').replaceChildren(...notes().map((note, index) => {
    const row = element('li', undefined, 'annotation');
    const header = element('div', undefined, 'annotation-head');
    const remove = element('button', text('移除', 'Remove'));
    remove.type = 'button';
    remove.setAttribute('aria-label', text(`移除第 ${index + 1} 条批注`, `Remove annotation ${index + 1}`));
    remove.addEventListener('click', () => {
      notes().splice(index, 1);
      renderNotes();
      $('noteType').focus();
    });
    header.append(element('span', local(NOTE_TYPES[note.type]), 'type-tag'), remove);
    row.append(header);
    if (note.quote) row.append(element('blockquote', note.quote));
    row.append(element('p', note.text));
    return row;
  }));
  $('returnDemo').disabled = notes().length === 0;
}

function renderReview() {
  const item = current();
  $('reviewMeta').textContent = `${item.learner} · ${text('虚构一稿', 'Fictional first draft')} · ${item.mode === 'hybrid' ? text('人机协同', 'AI + teacher') : text('教师精批', 'Teacher review')}`;
  $('reviewTitle').textContent = local(item.title);
  $('reviewStatus').textContent = statusLabel(item.status);
  $('reviewStatus').dataset.status = item.status;
  $('essayText').replaceChildren(...item.essay.split('\n').map(paragraph => element('p', paragraph)));
  $('sampleStrength').textContent = local(item.strength);
  $('sampleFocus').textContent = local(item.focus);
  $('sampleLanguage').textContent = local(item.language);
  renderNotes();
}

function setLanguage(next) {
  language = next === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  translatedElements.forEach(node => { node.textContent = node.dataset[language]; });
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  const selectedType = $('noteType').value;
  $('noteType').replaceChildren(...Object.entries(NOTE_TYPES).map(([value, label]) => {
    const option = element('option', local(label));
    option.value = value;
    return option;
  }));
  if (Object.hasOwn(NOTE_TYPES, selectedType)) $('noteType').value = selectedType;
  $('studentLink').href = `index.html?lang=${language}`;
  $('demoStatus').textContent = '';
  $('formMessage').textContent = '';
  renderQueue();
  renderReview();
}

function save(returned) {
  if ($('noteText').value.trim() || $('noteQuote').value.trim()) {
    $('formMessage').textContent = text('请先点“添加批注”，再保存或模拟发回。', 'Choose “Add annotation” before saving or simulating a return.');
    $('noteText').focus();
    return;
  }
  try {
    submissions = saveDemoReview(submissions, selectedId, notes(), returned);
    renderQueue();
    renderReview();
    $('formMessage').textContent = '';
    $('demoStatus').textContent = returned
      ? text('已模拟发回。没有发送给学生；刷新页面会重置。', 'Return simulated. Nothing was sent to a learner; refreshing resets the demo.')
      : text('演示草稿已保存在本页，刷新页面会重置。', 'Demo draft saved on this page. Refreshing resets the demo.');
  } catch {
    $('formMessage').textContent = text('请至少添加一条有效批注。', 'Add at least one valid annotation.');
  }
}

$('annotationForm').addEventListener('submit', event => {
  event.preventDefault();
  const note = { type: $('noteType').value, quote: $('noteQuote').value.trim(), text: $('noteText').value.trim() };
  try { saveDemoReview(submissions, selectedId, [...notes(), note]); }
  catch {
    $('formMessage').textContent = text('请填写批注；引用须来自当前作文，最多添加 20 条。', 'Enter an annotation and quote only from the current essay. Up to 20 annotations.');
    return;
  }
  notes().push(note);
  $('noteText').value = '';
  $('noteQuote').value = '';
  $('formMessage').textContent = '';
  $('demoStatus').textContent = text('已添加到演示批注，可以保存或模拟发回。', 'Added to demo annotations. You can save or simulate a return.');
  renderNotes();
});
document.querySelectorAll('[data-language]').forEach(button => {
  button.addEventListener('click', () => setLanguage(button.dataset.language));
});
$('searchDemo').addEventListener('input', renderQueue);
$('statusFilter').addEventListener('change', renderQueue);
$('saveDemo').addEventListener('click', () => save(false));
$('returnDemo').addEventListener('click', () => save(true));
$('resetDemo').addEventListener('click', () => {
  submissions = createDemoSubmissions();
  selectedId = submissions[0].id;
  drafts.clear();
  $('annotationForm').reset();
  $('searchDemo').value = '';
  $('statusFilter').value = 'all';
  setLanguage(language);
  $('demoStatus').textContent = text('演示已重置。', 'Demo reset.');
});
function selectedQuote() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !$('essayText').contains(selection.anchorNode) ||
    !$('essayText').contains(selection.focusNode)) return;
  const quote = selection.toString().trim();
  if (quote && quote.length <= 400 && current().essay.includes(quote)) $('noteQuote').value = quote;
}
$('essayText').addEventListener('pointerup', selectedQuote);
$('essayText').addEventListener('keyup', selectedQuote);
$('praiseTemplate').addEventListener('click', () => {
  $('noteType').value = '鼓励';
  $('noteText').value = local(current().strength);
  $('noteText').focus();
});
$('questionTemplate').addEventListener('click', () => {
  $('noteType').value = '逻辑';
  $('noteText').value = local(current().focus);
  $('noteText').focus();
});
setLanguage(language);
