# Student feedback connection / 学生端连接

The student page can reach the existing capability gateway over two routes:

- Supabase relay: `https://joeuvvmsbskfpmqydogs.supabase.co/functions/v1/student-relay`
- Original Worker: `https://chinese-feedback-proxy.tangxiazhen94.workers.dev`

`student-api.js` races bounded connection probes and chooses a responding route before sending learner data. Relay probes use GET; Worker probes use OPTIONS. Neither invokes a model or includes an essay, image, learner name or session. **Check connection / 检查连接** repeats these probes without clearing the editor.

Once an operation has been sent, a network failure is ambiguous: the server may already have processed it. The client therefore sends each operation once and never automatically retries it on another route. It preserves the editor and asks the learner to check the connection and retry deliberately. Subsequent operations recheck connectivity after a network failure. OCR cancellation remains supported.

## Relay boundaries

The relay is deployed in the existing Supabase project. Its gateway JWT verification is disabled because this is the already-public student feedback service. Its implementation accepts only `feedback`, `ocr`, and `getTeacherFeedback`, requires the exact GitHub Pages origin for POSTs, bounds request bodies, and forwards to a fixed upstream URL. It refuses teacher actions and Authorization headers. CORS is a browser origin restriction, not user authentication or a spending limit.

The function contains no OpenAI, Supabase database or teacher credentials. It does not use a database client, read tables, change RLS, log writing, or accept an arbitrary upstream URL. Responses preserve the Worker's request ID and public error status. The existing Worker continues validating content, generating feedback and storing submissions. Real teacher actions retain their existing authentication.

## Deployment

Deploy `supabase/functions/student-relay/` with entrypoint `index.ts`, `deno.json` as the import/config map, and `verify_jwt=false`. Explicitly set the relative import-map path on updates; do not reuse a temporary absolute path returned by an older deployment. Deploy and verify the relay before publishing the student configuration.

`config.js` lists the student routes and retains the original `workerUrl` for the protected teacher page. The student page versions its configuration URL and the service-worker cache is bumped so the new script also works with the offline public editor. API traffic and learner content remain outside the service-worker cache.

## Verification and limits

Run `npm run check` and `npm test`. Tests cover a blocked or stalled Worker, both routes failing before submission, no automatic POST replay, user cancellation, provider errors, origin/action restrictions, body limits, and sanitized upstream failures. Browser validation must include OCR, first/second drafts, the connection button, preservation of writing, and offline loading.

Opening the relay URL directly should return `{"ok":true,"service":"hongbi-student-relay","version":1}` when both the relay and its upstream can be reached. This is a connection check, not an AI request. A local simulation of a blocked Worker does not establish reachability on every mainland carrier; verify using the affected phone and network. Neither route guarantees universal availability.

Real feedback/OCR continues incurring OpenAI usage against the existing Worker key; Supabase and Cloudflare quotas still apply. This change does not replace the model key or configure a billing cap. The public teacher demo remains static, fictional, and free of model calls.

Official references: [Supabase browser CORS](https://supabase.com/docs/guides/functions/cors), [Edge Function runtime limits](https://supabase.com/docs/guides/functions/limits).
