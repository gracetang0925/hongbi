# Contributing to HongBi

Use a feature branch and a pull request. Describe the learner/teacher behavior
that changes and any deployment steps. The live site follows `main`, so keep
unreviewed work on a branch.

## Local checks

Use Node.js 22 or newer. No third-party npm packages or API keys are required:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

Serve the static pages with `python3 -m http.server 5173`. Feedback needs a
configured Worker; see [deployment and API contracts](docs/DEEPTUTOR_INTEGRATION.md).
For Worker development, use your own Wrangler installation and an ignored
`.dev.vars` copied from `.dev.vars.example`.

## Code and test conventions

- Keep Worker transport and authorization in `worker.js`; tutoring prompts,
  schemas, output validation and memory reduction belong in `lib/feedback.js`.
- Keep the public Worker URL in `config.js`. Store credentials only in Worker
  secrets or ignored local development files.
- Mock external services in automated tests. Use synthetic learners and essays;
  never commit children's real names, writing, access tokens or provider keys.
- Test meaningful failure paths when changing access, persistence or API
  contracts. Preserve top-level feedback fields while clients migrate.
- Escape model, learner and teacher content before inserting HTML. Check phone
  and desktop layouts for visible changes, including long bilingual text.
- Child mode rewards learning actions, not a claimed proficiency score. A
  reference answer or fewer reported errors must not be labelled “mastered”.

Database migrations must state the grants they change and how to verify access.
Do not run them against production from tests or CI. New dependencies must
justify their runtime cost and maintenance need.
