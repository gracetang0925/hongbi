# 红笔 HongBi — AI + 专业教师华文写作平台

> 让孩子把学过的中文，真正写出来。  
> Helping learners turn the Chinese they know into writing they can be proud of.

[在线体验 Live demo](https://gracetang0925.github.io/hongbi/) · [学生端 Learner view](https://gracetang0925.github.io/hongbi/) · [教师端 Teacher view](https://gracetang0925.github.io/hongbi/teacher.html)

![HongBi product vision](assets/hongbi-product-overview.png)

红笔面向全球华文二语学习者，重点服务 **6–12 岁、家庭中缺少华文环境的儿童**，以及准备 HSK 或希望系统提升中文写作的学习者。产品把 AI 即时反馈、中英文解释、按需拼音、逐步修改、成长奖励和全球认证教师服务连接在同一条学习路径中。

HongBi is designed for Chinese-as-a-second-language learners worldwide—especially children ages 6–12 with little Chinese support at home, plus HSK and writing-improvement learners. It combines instant AI feedback, bilingual explanations, on-demand pinyin, guided revision, meaningful rewards, and verified teacher support.

> [!IMPORTANT]
> 本 README 同时记录当前 MVP 和产品愿景。标注为“规划中 / planned”的功能尚未上线；概念图不代表已经完成的教师端功能。

## 当前 MVP / Current MVP

| 已实现 / Implemented | 学习价值 / Learner value |
|---|---|
| 输入作文或拍照识别手写稿 / Type or scan handwriting | 保留 OCR 写作入口 / Keeps the handwriting workflow |
| AI、教师式、人机协同三种反馈模式 / Three feedback modes | 适配不同教学场景 / Supports different teaching contexts |
| 宏观反馈：内容、结构、连贯性 / Macro feedback | 先看文章整体 / Revise the whole text first |
| 微观反馈：语序、量词、了/过/着、语体、搭配 / Micro feedback | 找到具体可修改的问题 / Identify actionable issues |
| 简单中文 + 英文原因 / Simple Chinese + English reasons | 没有家庭华文支持也能理解 / Works without Chinese support at home |
| 按需显示拼音 / On-demand pinyin | 需要时获得支架，不让页面过载 / Support without visual overload |
| 具体表扬与小墨提示 / Specific praise and pet hints | 说明哪里写得好，也说明为什么 / Explains what worked and why |
| 儿童成长模式默认不评分 / Score-free child mode | 降低焦虑，专注理解与修改 / Reduces anxiety and supports revision |
| HSK 备考模式主动开启 AI 模拟评分 / Optional HSK simulation | 有考试目标时查看练习分数 / Practice scoring when the learner chooses it |
| 本地种子与水滴奖励 / Local seed and water rewards | 奖励完成、阅读与修改行为 / Rewards learning behaviors |
| 一稿、二稿与 Supabase 记录 / Draft history and Supabase records | 观察长期进步 / Tracks progress over time |

当前技术栈：OpenAI Responses API（`gpt-5.6-terra`）· Cloudflare Workers · Supabase/Postgres · 原生 HTML/CSS/JavaScript。

Current stack: OpenAI Responses API (`gpt-5.6-terra`) · Cloudflare Workers · Supabase/Postgres · vanilla HTML/CSS/JavaScript.

## 学生端演示 / Learner demo

### 儿童成长模式：默认不显示分数

Child growth mode is selected by default. It focuses on understanding, revising, and encouragement—without a total score.

![HongBi live student child mode](assets/student-mvp-live.jpg)

### HSK 备考模式：学习者主动开启模拟评分

HSK learners can explicitly switch modes to see AI-simulated practice scores and progress. The interface states that these are **not official HSK results**.

![HongBi live student HSK mode](assets/student-hsk-mode-live.jpg)

### 双语反馈与 AI 宠物

每条重点问题包含原文、建议修改、简单中文原因、简短英文原因、按需拼音和“小墨”提示。系统先指出真正写得好的地方，再展示 3–5 个最值得修改的问题。

Each priority issue contains the original span, a suggested correction, simple Chinese, short English, on-demand pinyin, and a hint from Xiao Mo. HongBi identifies a genuine strength before surfacing three to five useful revision priorities.

![Bilingual step-by-step feedback](assets/bilingual-feedback.png)

![Student writing with an AI pet companion](assets/student-pet-writing.png)

## 学习流程 / Learning flow

```mermaid
flowchart TD
    A["选择目标<br/>儿童成长 / HSK 备考"] --> B["输入作文或上传手写稿"]
    B --> C["小墨陪写<br/>回答问题但不代写"]
    C --> D["完成一稿<br/>获得种子"]
    D --> E["先发现真正的亮点"]
    E --> F["宏观反馈<br/>内容 · 结构 · 连贯性"]
    F --> G["微观反馈<br/>中英原因 · 按需拼音 · 修改建议"]
    G --> H["学生自己完成二稿"]
    H --> I{"需要真人教师吗？"}
    I -- "否" --> J["保存进步与个人错误模式"]
    I -- "是" --> K["匹配认证教师"]
    K --> L["文字 · 异步语音 · 视频反馈"]
    L --> J
```

儿童模式不以“错误最少”作为奖励标准：完成一稿获得种子，打开拼音获得水滴，完成二稿获得更多成长资源。未来的菜园社交只考虑帮助浇水、访问和低冲突互动，不开放陌生人私聊。

Child mode rewards completion, reading support, and revision—not being the learner with the fewest errors. Future garden social features will remain parent-controlled and will not include private messaging with strangers.

![Writing garden rewards](assets/garden-rewards.png)

## 教师端愿景 / Teacher experience

教师端当前原型用于查看学习记录与错误观察。下一阶段计划提供结构化文字批改、异步语音评价和视频总结；语音与视频可自动生成字幕和双语文本。早期不开放教师与儿童的私人视频通话。

The current teacher prototype focuses on learning records and error review. The planned studio adds structured text, asynchronous audio, and video summaries with transcripts and bilingual text. Early versions will not support private live video calls between teachers and children.

> 下图是产品概念图 / The image below is a planned product concept.

![Teacher text, audio and video feedback studio](assets/teacher-feedback-studio.png)

### 全球认证教师网络 / Verified global teacher network

| 等级 / Level | 质量机制 / Quality control |
|---|---|
| 实习批改员 / Trainee reviewer | 完成培训与模拟测试；反馈由导师审核 / Training, simulation, and mentor approval |
| 认证教师 / Verified teacher | 身份与资质验证；随机质量抽查 / Identity and credential checks plus audits |
| 资深导师 / Senior mentor | 审核实习反馈、处理复杂作文与申诉 / Reviews trainees and handles complex cases |

### 全球教师准入资质 / Global teacher eligibility

红笔计划面向全球招募有资质的华文教师。申请者需要提交可验证的身份证明、学历、教学资质和相关教学经历；平台按签发机构和所在司法辖区核验，不以一张无法验证的“国际证书”自动替代正式教师资格。

HongBi plans to recruit qualified Chinese-language teachers worldwide. Applicants must provide verifiable identity, education, teaching credentials, and relevant experience. Each credential is reviewed according to its issuing body and jurisdiction; an unverifiable “international certificate” does not automatically replace a recognized teaching license.

可接受的资质示例包括：

- 中国或其他国家、地区认可的教师资格证，任教学科包含中文、华文、汉语或世界语言。
- 可核验的国际中文教育专业证书及相关学历、教学经历。
- 美国各州认可的教师执照，并具有中文、普通话或 World Languages 等相应任教授权。
- 英国或英联邦体系中的 PGCE/PGDE 等教师教育资质，并在适用时核验 QTS、注册状态或学校认可记录。
- IB 中文教师申请者需提供可验证的 IB 中文教学经历、课程经验及官方专业发展或培训记录；IB 培训记录与国家教师执照分别核验。
- 其他等效资质由平台人工审核，必要时要求试讲、模拟批改和背景调查。

Examples of eligible evidence include:

- A recognized national or regional teaching license covering Chinese, Mandarin, or world languages.
- Verifiable professional credentials in international Chinese-language education, supported by relevant education and teaching experience.
- A U.S. state teaching license with an appropriate Chinese, Mandarin, or World Languages authorization.
- A UK or Commonwealth PGCE/PGDE pathway, with QTS, registration, or recognized school evidence checked where applicable.
- For IB Chinese applicants, verifiable IB Chinese teaching experience, curriculum experience, and official professional-development records. IB training and national teacher licensure are reviewed separately.
- Equivalent qualifications subject to manual review, demonstration lessons, sample marking, and background checks where appropriate.

教师通过资质审核后仍需完成红笔的儿童安全培训、双语反馈规范、模拟批改和试用期质量观察，才能独立接受儿童作文订单。证件到期、投诉率异常或质量不达标时，平台可以暂停接单并重新审核。

Credential verification is only the first gate. Teachers must also complete HongBi child-safety training, bilingual-feedback standards, sample marking, and a monitored probation period before independently reviewing children's work. Expired credentials, abnormal complaint patterns, or quality failures can trigger suspension and re-verification.

```mermaid
flowchart LR
    S["学生提交作文"] --> A["AI 初步分析"]
    A --> Q{"选择服务"}
    Q -->|"AI 即时反馈"| R["学生自己修改"]
    Q -->|"认证教师"| M["教师匹配"]
    Q -->|"人机协同"| M
    M --> T["文字 / 语音 / 视频反馈"]
    T --> V["质量抽查与家长可见记录"]
    V --> R
```

## 商业逻辑 / Business model

红笔不是单一“AI 批改器”，而是一条从低成本即时反馈到高价值专业教师服务的学习路径。

HongBi is not only an AI correction tool. It is a learning pathway that moves from low-cost instant feedback to higher-value professional teacher support.

### 核心客户与价值 / Customers and value

| 用户 / Customer | 核心需求 / Core need | 产品价值 / HongBi value |
|---|---|---|
| 6–12 岁二语儿童 / Child learners | 看懂原因、获得鼓励、愿意继续写 | 双语解释、拼音、小墨、菜园奖励 |
| 家长 / Parents | 在家也能支持孩子且看见进步 | 可理解的反馈、学习记录、安全控制 |
| HSK 学习者 / HSK learners | 模拟训练、失分原因、稳定提升 | 可选评分、双稿对比、错误档案 |
| 华文教师 / Chinese teachers | 提高批改效率、建立专业信誉 | AI 助手、模板、数据、认证与订单 |
| 学校与项目 / Schools and programs | 规模化写作练习与教学洞察 | 班级分析、教师管理、课程版本 |

### 会员与收入假设 / Membership hypotheses

> 价格需要通过早期用户访谈和付费实验验证。前三个月免费更适合作为限量“创始用户计划”，而不是永久承诺。

- **学生成长会员 / Learner Growth — US$29.90/month**：AI 写作练习、双语解释、拼音、一稿二稿对比、个人错误档案、儿童或 HSK 路径，以及明确数量的教师批改额度。
- **教师专业会员 / Teacher Pro — US$9.90/month**：可选的 AI 批改助手、结构化模板、语音/视频字幕、学生错误整理、教师主页、培训与认证工具。基础注册和实习阶段建议免费，教师付费购买效率与职业成长工具，而不是购买接单资格。
- **真人批改 / Human review**：按篇、按额度包或会员附带额度收费；平台从完成并通过质量标准的订单中收取服务费。
- **机构方案 / School plans（规划中）**：按班级、教师席位或年度授权收费，提供班级分析、管理和隐私控制。

### 商业飞轮 / Growth flywheel

```mermaid
flowchart LR
    A["更多写作练习"] --> B["更清晰的个人错误模式"]
    B --> C["更精准的 AI 与教师反馈"]
    C --> D["更高的修改完成率"]
    D --> E["可见的学习进步"]
    E --> F["家庭续费与口碑"]
    F --> A
    C --> G["教师获得高质量结构化订单"]
    G --> H["更多认证教师与更短等待时间"]
    H --> C
```

### 单位经济原则 / Unit-economics guardrails

- 免费期限制 AI 次数和真人批改额度，先验证留存与学习成效。
- 学生会员中的真人服务必须设置明确额度，避免人力成本失控。
- AI 先做结构化分析，教师聚焦高价值判断、语音讲解和鼓励。
- 教师收入、平台服务费、退款与质量申诉规则必须透明。
- 先从邀请制教师小规模试点，再扩展全球供给。

## 儿童安全与质量 / Child safety and quality

- 最小化教师可见的儿童真实身份信息 / Minimize child identity data shown to teachers.
- 家长可查看全部反馈与消息 / Give parents visibility into feedback and messages.
- 不允许交换私人联系方式 / Prevent exchange of private contact details.
- 提醒或隐藏作文中的学校、住址和联系方式 / Flag sensitive information in essays.
- 保留文字、语音和视频反馈审核记录 / Keep auditable feedback records.
- 实习教师反馈必须经导师审核 / Require mentor approval for trainee feedback.
- 家长可关闭社交与游戏化功能 / Let parents disable social and gamified features.
- 奖励真实学习行为，不制造限时焦虑 / Reward learning behavior without time-pressure mechanics.

## 技术流程 / Technical flow

```mermaid
flowchart LR
    A["作文文字或手写照片"] --> B["Cloudflare Worker"]
    B --> C["OpenAI Responses API<br/>gpt-5.6-terra"]
    C --> D["结构化宏观与微观反馈"]
    D --> E["学生端<br/>双语解释 · 拼音 · 二稿"]
    B --> F["Supabase<br/>历史与教师记录"]
    F --> G["教师端"]
```

安全原则：`OPENAI_API_KEY` 只作为 Cloudflare Worker Secret 保存，绝不能写入 `worker.js`、`index.html` 或 GitHub。

Security rule: keep `OPENAI_API_KEY` only as an encrypted Cloudflare Worker secret. Never place it in source code or GitHub.

## 部署 / Deployment

1. 在 Cloudflare Dashboard 打开 `Workers & Pages`，选择现有 Worker。
2. 在 `Settings → Variables and Secrets` 添加 Secret：`OPENAI_API_KEY`。
3. 粘贴并部署本仓库中的 `worker.js`，保持 `index.html` 已使用的 Worker 地址不变。
4. 确认 CORS、OCR、三种反馈模式和 Supabase 记录正常。
5. 在 GitHub `Settings → Pages` 中使用 `main` 分支部署静态网页。

Wrangler 方式：

```bash
wrangler secret put OPENAI_API_KEY
wrangler deploy
```

## 路线图 / Roadmap

### Phase 1 — 双语 AI 写作教练 / Bilingual AI writing coach

- [x] 中英文错误原因 / Bilingual error explanations
- [x] 按需拼音 / On-demand pinyin
- [x] 具体表扬 / Specific praise
- [x] 儿童模式不评分 / Score-free child mode
- [x] 可选 HSK 模拟评分 / Optional HSK simulation
- [x] 小墨反馈提示 / Xiao Mo feedback hints
- [x] 本地种子与水滴 / Local seed and water rewards

### Phase 2 — 真人教师试点 / Human teacher pilot

- [ ] 邀请制认证教师 / Invite-only verified teachers
- [ ] 结构化文字与异步语音 / Structured text and asynchronous audio
- [ ] 自动字幕与双语文本 / Transcripts and bilingual text
- [ ] 一稿、二稿与教师反馈历史 / Draft and teacher-feedback history

### Phase 3 — 教师平台与学习社区 / Teacher platform and community

- [ ] 实习教师与导师审核 / Trainee and mentor review
- [ ] 教师视频反馈 / Teacher video feedback
- [ ] Teacher Pro 专业会员
- [ ] 家长控制的好友菜园 / Parent-controlled friend gardens

### Phase 4 — 全球化与 HSK 深度训练 / Global and HSK expansion

- [ ] HSK 分级写作路径 / Level-specific HSK writing paths
- [ ] 简体与繁体 / Simplified and Traditional Chinese
- [ ] 多家庭语言解释 / More home-language explanations
- [ ] 多时区教师匹配 / Multi-time-zone teacher matching
- [ ] 学校与教育机构版本 / School and program plans

## 研究基础 / Research foundation

HongBi 的反馈设计源于 Grace Tang 在新加坡南洋理工大学的硕士论文研究：通过三组实验比较 AI、教师与人机协同对华文二语写作的反馈效果，并由此形成宏观与微观双层反馈框架。

HongBi's feedback design is informed by Grace Tang's M.A. thesis research at NTU Singapore: a three-group experimental study comparing AI-only, teacher-only, and human–AI collaborative feedback on second-language Chinese writing.

Earlier Claude-based research prototype: [`chinese-writing-feedback`](https://github.com/gracetang0925/chinese-writing-feedback)

## 产品演示视频 / Product demo video

产品演示视频将在 Cloudflare Worker 和主要学习流程稳定后，使用真实产品操作录制。  
The demo video will be recorded from the real product after the Worker and the main learning flow are stable.

## 关于 / About

Grace Tang 是华文教师和国际汉语教育研究者。HongBi 来自真实批改经验、数千篇作文，以及一个核心信念：反馈不仅要告诉学习者“改什么”，还要让他们理解“为什么”。

Grace Tang is a Chinese-language educator and researcher. HongBi grows from hands-on teaching experience and the belief that feedback should explain not only *what* to change, but *why*.

## License

MIT
