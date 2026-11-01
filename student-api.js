// Probe without learner data, then send each operation once. Never replay POSTs.
(() => {
  const config = globalThis.HONGBI_CONFIG;
  const explicit = Array.isArray(config.studentApiUrls) && config.studentApiUrls.length > 0;
  const endpoints = (explicit ? config.studentApiUrls : [{ url: config.workerUrl, kind: 'worker' }]);
  let selected = null;
  let selecting = null;
  function failure(code) { const error = new Error(code); error.code = code; return error; }

  async function probe(endpoint, controller) {
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.kind === 'relay' ? 'GET' : 'OPTIONS', cache: 'no-store', signal: controller.signal,
      });
      if (endpoint.kind === 'relay') {
        const data = await response.json();
        if (!response.ok || data.ok !== true || data.service !== 'hongbi-student-relay') throw failure('NO_CONNECTION');
      } else if (response.status !== 204) throw failure('NO_CONNECTION');
      return endpoint;
    } finally { clearTimeout(timer); }
  }

  async function choose(force = false) {
    if (force) selected = null;
    if (selected) return selected;
    if (selecting) return selecting;
    if (!explicit) { selected = endpoints[0]; return selected; }
    selecting = new Promise((resolve, reject) => {
      let remaining = endpoints.length;
      let settled = false;
      const controllers = endpoints.map(() => new AbortController());
      endpoints.forEach((endpoint, index) => {
        probe(endpoint, controllers[index]).then(available => {
          if (settled) return;
          settled = true;
          selected = available;
          controllers.forEach((controller, other) => { if (other !== index) controller.abort(); });
          resolve(available);
        }).catch(() => {
          if (--remaining === 0 && !settled) { settled = true; reject(failure('NO_CONNECTION')); }
        });
      });
    });
    try { return await selecting; } finally { selecting = null; }
  }

  async function request(body, { signal } = {}) {
    if (signal?.aborted) throw failure('REQUEST_CANCELLED');
    const endpoint = await choose();
    if (signal?.aborted) throw failure('REQUEST_CANCELLED');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 100000);
    try {
      return await fetch(endpoint.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
    } catch {
      selected = null;
      throw failure(signal?.aborted ? 'REQUEST_CANCELLED' : 'CONNECTION_INTERRUPTED');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  globalThis.HONGBI_API = Object.freeze({ request, checkConnection: () => choose(true) });
})();
