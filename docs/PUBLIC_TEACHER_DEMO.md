# Public teacher demo / 免密教师演示

[English demo](https://gracetang0925.github.io/hongbi/teacher-demo.html?lang=en) · [中文演示](https://gracetang0925.github.io/hongbi/teacher-demo.html?lang=zh)

Recruiters and other visitors can open the public teacher demo without a token. It demonstrates essay search, review states, first-draft reading, prewritten feedback, annotation categories, comment templates, saving a draft, and a simulated return. All essays and learner labels are hand-written fictional examples. These examples are not participant records or evidence of learning outcomes.

公众无需密钥即可查看示例作文、搜索和筛选队列、尝试批注、保存演示草稿和模拟发回。示例均为人工编写的虚构内容，不是真实儿童作文、研究数据或学习效果证据。

## Isolation and costs

- The page loads only static, same-origin resources. Its content security policy sets `connect-src 'none'` and `form-action 'none'`.
- It does not load production `config.js`, register a service worker, use browser storage, or call Worker, Supabase, OpenAI or AgentKey APIs.
- Annotations and simulated status changes exist only in the open page’s memory. Refresh or **Reset demo** restores the original examples. Nothing is sent to a learner.
- The public demo makes no model calls and incurs no model usage charges. Hosting quotas and costs remain subject to the hosting provider.
- The real student page continues calling the Worker for live feedback and OCR. Those OpenAI requests are billed to the organization/project associated with the Worker’s `OPENAI_API_KEY`. Visitor use is not automatically billed to the visitor. No AgentKey integration exists in the app.
- No billing alert or hard spend limit is configured by this static-page change. Check the correct OpenAI project and its billing settings separately. [Official API pricing](https://developers.openai.com/api/docs/pricing) · [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits).

## Protected workspace

The real `teacher.html` page still requires an administrator-provided invite token. Both listing real submissions and saving real teacher annotations continue to be authenticated at the Worker. Database access rules and encrypted secrets are unchanged. An obvious link from the login page directs visitors to the public demonstration.

教师真实后台继续受保护。免密仅适用于虚构数据演示，不开放真实作文、教师令牌或数据库凭证。请勿在演示批注中输入真实学生信息。

## Verification

Run `npm run check` and `npm test`. For browser validation, exercise both languages, search/status filters, annotation quoting, HTML-like comment text, draft saving, simulated return and reset. Observe that every request remains a static same-origin request, even when saving or returning. Refresh must clear demo edits. The service worker excludes both teacher pages.
