import { SHARE_URL, preferredLanguage } from './mobile-core.js';

const prefKey = 'hongbiUiLanguageV1';
let saved;
try { saved = localStorage.getItem(prefKey); } catch { /* Storage is optional. */ }
let language = preferredLanguage(location.search, saved, navigator.languages);
let installPrompt;
const text = (zh, en) => language === 'en' ? en : zh;

// Only explicitly marked interface labels are translated. Learner/model text
// is never traversed or rewritten, and practice answers stay in their inputs.
function translate(root = document) {
  const labels = [...root.querySelectorAll('[data-en]')];
  if (root.matches?.('[data-en]')) labels.unshift(root);
  for (const label of labels) {
    if (!label.hasAttribute('data-zh')) label.dataset.zh = label.textContent;
    const next = language === 'en' ? label.dataset.en : label.dataset.zh;
    if (label.textContent !== next) label.textContent = next;
  }
  for (const element of root.querySelectorAll('[data-placeholder-en]')) {
    element.dataset.placeholderZh ??= element.getAttribute('placeholder') || '';
    element.placeholder = language === 'en' ? element.dataset.placeholderEn : element.dataset.placeholderZh;
  }
}

function setLanguage(next, persist = true) {
  language = next === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  if (persist) try { localStorage.setItem(prefKey, language); } catch { /* Optional. */ }
  translate();
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  document.title = text('红笔 HongBi · 华文写作', 'HongBi · Chinese writing with Xiao Mo');
  window.updateCount();
  window.updateCount2();
  connectionStatus();
}

function connectionStatus() {
  document.getElementById('offlineNote').hidden = navigator.onLine;
}

const dialog = document.getElementById('shareDialog');
const status = document.getElementById('shareStatus');
document.getElementById('shareLink').value = SHARE_URL;
document.getElementById('shareApp').addEventListener('click', () => {
  status.textContent = '';
  dialog.showModal();
});
document.getElementById('closeShare').addEventListener('click', () => dialog.close());
document.getElementById('copyShareLink').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(SHARE_URL);
    status.textContent = text('链接已复制。', 'Link copied.');
  } catch {
    document.getElementById('shareLink').select();
    status.textContent = text('请长按或使用复制快捷键复制链接。', 'Select and copy the link above.');
  }
});
document.getElementById('nativeShare').addEventListener('click', async () => {
  if (!navigator.share) {
    status.textContent = text('可以复制链接，或下载二维码分享。', 'Copy the link or download the QR code to share.');
    return;
  }
  try { await navigator.share({ title: 'HongBi · 红笔', text: 'Write, understand, revise. 写作文、看反馈、自己改。', url: SHARE_URL }); }
  catch (error) { if (error.name !== 'AbortError') status.textContent = text('请改用复制链接。', 'Try copying the link instead.'); }
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
document.getElementById('installApp').addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; return; } catch { /* Fall back to the manual instructions. */ }
  }
  const help = document.getElementById('installHelp');
  help.hidden = !help.hidden;
  document.getElementById('installApp').setAttribute('aria-expanded', String(!help.hidden));
});
window.addEventListener('appinstalled', () => {
  document.getElementById('installApp').hidden = true;
  document.getElementById('installHelp').hidden = true;
});
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  document.getElementById('installApp').hidden = true;
}
document.querySelectorAll('[data-language]').forEach(button => {
  button.addEventListener('click', () => setLanguage(button.dataset.language));
});
window.addEventListener('online', connectionStatus);
window.addEventListener('offline', connectionStatus);

new MutationObserver(mutations => {
  for (const mutation of mutations) for (const node of mutation.addedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) translate(node);
  }
}).observe(document.body, { childList: true, subtree: true });

// Camera dialog keyboard support; closing also cancels pending OCR/camera work.
document.addEventListener('keydown', event => {
  const camera = document.getElementById('cameraModal');
  if (!camera.classList.contains('visible')) return;
  if (event.key === 'Escape') { event.preventDefault(); window.closeCamera(); }
  if (event.key === 'Tab') {
    const buttons = [...camera.querySelectorAll('button:not([disabled])')].filter(button => button.getClientRects().length);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
setLanguage(language, false);
window.toggleXiaomo(false, false);

// Public app shell only. sw.js explicitly excludes teacher pages, POSTs and
// cross-origin API calls. AI/OCR require a network connection.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url)).catch(() => {
    // The online app still works if a browser disallows service workers.
  });
}
