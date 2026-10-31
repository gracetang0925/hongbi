# DeepTutor-inspired tutoring for HongBi

This change adapts selected teaching and engineering patterns from
[HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) to HongBi's existing
Cloudflare Worker and vanilla HTML/JavaScript application. It is an independent
implementation: it does not install, import, or call the DeepTutor Python/Next.js
runtime. HongBi's current model, `gpt-5.6-terra`, remains the default.

## Reference and scope

HongBi base: `de01712bcd5327ae6e76fa0ad4454e9b871ec4e7`.
DeepTutor reference: `1ea7df155447f4caf0e3abc86b3ff5395479cd4a`.
References were inspected on 2026-10-31.

| DeepTutor source | HongBi adaptation | Limit |
| --- | --- | --- |
| [Capability registry](https://github.com/HKUDS/DeepTutor/blob/1ea7df155447f4caf0e3abc86b3ff5395479cd4a/deeptutor/capabilities/registry.py) and [protocol](https://github.com/HKUDS/DeepTutor/blob/1ea7df155447f4caf0e3abc86b3ff5395479cd4a/deeptutor/capabilities/protocol.py) | An explicit `ACTIONS` registry in `worker.js`, shared errors, request IDs, bounded inputs and provider timeouts | Five application actions, not an autonomous agent/tool execution system |
| [Bounded mastery memory](https://github.com/HKUDS/DeepTutor/blob/1ea7df155447f4caf0e3abc86b3ff5395479cd4a/deeptutor/capabilities/mastery/memory.py) | Read at most 8 feedback records for the current random session; count only 5 known language categories; send at most 3 categories seen in at least 2 records | No cross-session or cross-device learner profile; no retrieval by name; no old essays or free-form history enter the new model request |
| [Guided mastery playbook](https://github.com/HKUDS/DeepTutor/blob/1ea7df155447f4caf0e3abc86b3ff5395479cd4a/deeptutor/capabilities/mastery/prompts/zh/mastery_loop.yaml) | One short transfer exercise per feedback: attempt → optional bilingual hint → reference answer/explanation → apply to draft 2 | No automatic grading or claims of mastery; completing an exercise is not proof of understanding |

These are design references, not copied source or prompt bundles. No DeepTutor
code, assets, or dependencies are redistributed. A future direct code integration
must separately retain the upstream Apache-2.0 license and applicable notices.

## Learner behavior

- Current macro/micro feedback, OCR, bilingual reasons, pinyin, optional HSK scores,
  Xiao Mo, and draft revision remain available.
- Each successful feedback includes a bilingual one-sentence practice card. The
  learner types an attempt before revealing the reference. Attempts remain only
  in the page and are not submitted or graded.
- The checked memory option reads only the current page's session. Unchecking it
  stops history reads for that request. Memory is an uncertain teaching hint,
  not evidence of a current error or of mastery.
- Each page load uses `crypto.randomUUID()`. “重新开始”, “清除”, and changing the
  learner name start a new session. Closing/reloading the page loses access to
  that session's teacher feedback. This is an MVP session workflow, not accounts.
- Resetting the page does not delete database records. Historical records still
  require the administrator's retention/deletion process.
- Database writes finish before returning `storage.saved`. If persistence fails,
  useful AI feedback is still shown, with an explicit warning that it was not
  saved and no teacher order was queued. This avoids claiming success for a
  background write that may have failed.

## Worker contract

POST a JSON object to the configured Worker URL. Responses contain
`{ ok, requestId, data }`. Existing fields (`feedback`, `text`, `annotations`, etc.)
remain at the top level for compatibility. Errors contain
`{ ok: false, requestId, data: null, error: { message } }`.

| Action | Input | Access / output |
| --- | --- | --- |
| `feedback` (default) | `essay`, `mode`, `goal`, `useMemory`, optional `logData: {sessionId, studentName, draft}` | Public AI entry point; returns original feedback fields plus `practice` inside `feedback`, `learningContext`, and `storage` |
| `ocr` | Base64 `imageData`, allowed `mediaType` | Public OCR entry point; returns `text` |
| `getTeacherFeedback` | Random UUID-v4 `sessionId` | Possession of session ID grants read access to returned annotations only |
| `listTeacherSubmissions` | Optional integer `offset` | Teacher Bearer token; 100 rows per page and `nextOffset` |
| `saveTeacherAnnotations` | `submissionId`, `annotations`, `status: reviewed/returned` | Teacher Bearer token; one atomic update of annotations and status, restricted to teacher/hybrid submissions |

`logData.essay` and `logData.mode` cannot override the actual submitted essay and
validated mode. Weak legacy session IDs can receive AI feedback, but cannot save
or retrieve history. New and old API response fields are preserved; access rules
are deliberately stricter.

Teacher authentication happens on the Worker before database access. The invite
token is kept only in page memory, cleared on logout, and never stored in
localStorage, config files, URLs, or the repository. This is a shared,
invitation-only credential, not individual teacher accounts or role separation.
An expired request cannot repopulate the queue after logout. The inbox loads 100
records at a time; search, counts and analytics operate on loaded records.

## Configuration and deployment

The frontend has one public Worker URL in `config.js`. Both pages load it.
`wrangler.toml.example` contains non-secret variables; `.dev.vars.example`
contains placeholders only.

| Variable | Location | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Worker secret | OpenAI access |
| `SUPABASE_SECRET_KEY` | Worker secret | Server-only Supabase secret key, preferably `sb_secret_…`; legacy service-role JWT also supported |
| `TEACHER_ACCESS_TOKEN` | Worker secret | Random invite token, 32–512 characters |
| `SUPABASE_URL` | Wrangler vars | Existing project HTTPS URL |
| `ALLOWED_ORIGINS` | Wrangler vars | Comma-separated exact origins, without paths or trailing slashes |
| `OPENAI_MODEL` | Wrangler vars, optional | Defaults to HongBi's existing `gpt-5.6-terra` |

New Supabase secret keys travel on `apikey`; only legacy JWT keys are repeated
in `Authorization: Bearer`. This follows [Supabase's API-key reference](https://supabase.com/docs/guides/getting-started/api-keys#known-limitations).
A publishable key is designed to be public; its presence in earlier source is
not by itself evidence of a secret leak. The necessary boundary is database
permissions. Any actual exposed secret or shared demo credential should be
retired using the provider's controls, not merely removed from the latest file.

Deployment changes access for the existing submissions table. Before applying
SQL, verify that other applications do not need direct anon/authenticated access
to this same table, and back up the current grants/policies. The migration
revokes those roles' table access (including inherited PUBLIC grants), retains
server reads/writes, enables RLS, adds two indexes, and does not delete records.
It assumes the existing HongBi table and columns already exist.

Use a maintenance window for the Worker, pages, and permissions migration:

1. Copy `wrangler.toml.example` to a new `wrangler.toml`. Verify the Worker name,
   account, Supabase URL and origin. For local use add the exact local page
   origin, such as `http://localhost:5173`; a localhost frontend needs a distinct
   development Worker or a local Wrangler endpoint configured in `config.js`.
2. Set secrets in your own terminal or Cloudflare dashboard; do not paste values
   into GitHub, chat, or the public frontend:

   ```sh
   wrangler secret put OPENAI_API_KEY
   wrangler secret put SUPABASE_SECRET_KEY
   wrangler secret put TEACHER_ACCESS_TOKEN
   ```

   Generate the invite token with a cryptographically secure generator, such as
   `openssl rand -hex 32`, and distribute it to invited teachers privately.
3. Run `npm ci --ignore-scripts`, `npm run check`, and `npm test`.
4. Run `wrangler deploy`. The Worker now imports `lib/feedback.js`: use Wrangler
   bundling, not the old single-file dashboard paste workflow.
5. Publish `config.js` and the updated student/teacher HTML through GitHub Pages.
6. Apply `supabase/migrations/20261031_worker_only_submissions.sql` as the project
   owner. Do not treat removing a browser key as revoking database permissions.
7. Test with synthetic data: OCR, feedback, a draft-2 history read, teacher login,
   queue pagination, save, return, and the student's returned annotations. Verify
   an unauthenticated direct table request is denied. Check `storage.saved` and
   `storage.teacherQueued` rather than assuming AI success means a saved order.

Do not revert to the old browser-to-Supabase teacher page after the migration;
it will correctly have no table access. Preserve the secure gateway when
rolling back a tutoring UI change. Restoring previous grants is an explicit
administrator action requiring the saved grant/policy configuration.

## Validation and remaining boundaries

- `npm run check`: Worker, shared module, config, and both inline page scripts.
- `npm test`: deterministic tests with mocked OpenAI/Supabase, including session
  isolation, output grounding, model refusal/incomplete responses, input limits,
  teacher authorization, atomic return, escaping, and logout races.
- CI runs these checks on Node.js 22 with no third-party npm dependencies and no
  production credentials. No application build pipeline is needed for the static
  pages; Wrangler bundles the small Worker module graph.
- OpenAI output keeps strict `text.format` JSON Schema and explicitly rejects
  refusal/incomplete or invalid responses. Requests use `store: false`. See
  [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- No production OpenAI billing request, Supabase write, migration, secret
  rotation, Cloudflare deployment, or main-branch publication is performed by
  the patch tests. Real services and teaching quality need the deployment smoke
  check above. This patch does not create payment verification or teacher
  matching; existing paid labels still require an operational payment workflow.
- CORS restricts browser origins; it does not authenticate the public AI/OCR
  actions. Configure Cloudflare abuse controls/rate limits before broad public
  use. A UUID session token is an MVP bearer capability; formal learner/guardian
  accounts, per-teacher grants, retention controls, and cross-device learning
  memory remain a separate account-system change.

Retrieval over curated teaching materials, multi-agent research, arbitrary tool
execution, and full mastery paths are outside this patch. They require a
separate deployed service and evidence/permission design rather than an extra
frontend script.
