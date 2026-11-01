// Public frontend configuration. Never place API keys or teacher tokens here.
globalThis.HONGBI_CONFIG = Object.freeze({
  workerUrl: 'https://chinese-feedback-proxy.tangxiazhen94.workers.dev',
  studentApiUrls: Object.freeze([
    Object.freeze({ url: 'https://joeuvvmsbskfpmqydogs.supabase.co/functions/v1/student-relay', kind: 'relay' }),
    Object.freeze({ url: 'https://chinese-feedback-proxy.tangxiazhen94.workers.dev', kind: 'worker' }),
  ]),
});
