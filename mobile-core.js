// Only this fixed public address goes into the share link/QR. Never include a
// learner's location.href, session, essay or teacher invite token.
export const PUBLIC_APP_URL = 'https://gracetang0925.github.io/hongbi/';
export const SHARE_URL = `${PUBLIC_APP_URL}?lang=en&source=qr`;
export function preferredLanguage(search, saved, languages = []) {
  const explicit = new URLSearchParams(search).get('lang');
  if (explicit === 'en' || explicit === 'zh') return explicit;
  if (saved === 'en' || saved === 'zh') return saved;
  return /^zh\b/i.test(languages[0] || '') ? 'zh' : 'en';
}
