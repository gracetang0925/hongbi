// A fixed, student-only transport. No credentials, database client or open proxy.
const UPSTREAM = 'https://chinese-feedback-proxy.tangxiazhen94.workers.dev';
const ORIGIN = 'https://gracetang0925.github.io';
const ACTIONS = new Set(['feedback', 'ocr', 'getTeacherFeedback']);
const MAX_BYTES = 8_400_000;

export async function handleRelay(request, fetchUpstream = fetch) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', Vary: 'Origin',
  };
  if (origin === ORIGIN) Object.assign(headers, {
    'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Expose-Headers': 'X-Request-ID',
  });
  const error = (status, message) => new Response(JSON.stringify({ ok: false, error: { message } }), { status, headers });
  if (origin && origin !== ORIGIN) return error(403, '此来源未获允许。');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET' && request.method !== 'POST') return error(405, '只支持 GET、POST 和 OPTIONS。');
  // Health checks are public and never invoke a model. POSTs require our frontend origin.
  if (request.method === 'POST' && origin !== ORIGIN) return error(403, '此来源未获允许。');
  if (request.headers.has('Authorization')) return error(403, '此入口只支持学生操作。');
  let raw;
  if (request.method === 'POST') {
    if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return error(415, '请求必须是 JSON。');
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return error(413, '请求过大。');
    if (!request.body) return error(400, '缺少请求内容。');
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    raw = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return error(413, '请求过大。'); }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } catch { return error(400, '请求内容无法读取。'); }
    finally { reader.releaseLock(); }
    let body;
    try { body = JSON.parse(raw); } catch { return error(400, '请求必须是有效 JSON。'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !ACTIONS.has(body.action)) return error(400, '不支持的学生操作。');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.method === 'GET' ? 5000 : 90000);
  try {
    if (request.method === 'GET') {
      const response = await fetchUpstream(UPSTREAM, { method: 'OPTIONS', headers: { Origin: ORIGIN }, signal: controller.signal, redirect: 'error' });
      if (response.status !== 204 || response.headers.get('Access-Control-Allow-Origin') !== ORIGIN) return error(503, '批改服务连接检查未通过。');
      return new Response(JSON.stringify({ ok: true, service: 'hongbi-student-relay', version: 1 }), { headers });
    }
    const response = await fetchUpstream(UPSTREAM, {
      method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: raw, signal: controller.signal, redirect: 'error',
    });
    const data = await response.text();
    let parsed;
    try { parsed = JSON.parse(data); } catch { return error(502, '批改服务暂时不可用。'); }
    if (!parsed || typeof parsed.ok !== 'boolean' || !parsed.requestId) return error(502, '批改服务响应无效。');
    headers['X-Request-ID'] = parsed.requestId;
    return new Response(data, { status: response.status, headers });
  } catch { return error(controller.signal.aborted ? 504 : 502, '批改服务连接中断，请检查连接后主动重试。'); }
  finally { clearTimeout(timer); }
}
