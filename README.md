# 红笔 HongBi — AI Chinese Writing Coach

> Every Chinese teacher's red pen, powered by AI. Layered, research-backed writing feedback for learners of Chinese as a second language.

Built for **OpenAI Build Week 2026**.

🔗 **Live demo:** [ADD YOUR DEPLOYED URL HERE]
🎬 **Demo video:** [ADD YOUR VIDEO LINK HERE]

---

## The problem

Meaningful feedback on writing is the most labor-intensive part of language teaching — and the first thing to get cut when teachers are overloaded. Students often wait a week for their essays back, long after the writing moment has passed.

Chinese L2 learners face an error landscape that English-centric tools (Grammarly etc.) simply don't cover:

- **Word-order transfer** from the learner's native language
- **Measure word (量词)** selection errors
- **Aspect markers** — 了 / 过 / 着 misuse
- **Register mixing** — spoken forms leaking into formal writing
- **Character-writing errors** in handwritten work

## What HongBi does

**For learners** — Paste your essay or photograph your handwritten one. HongBi gives feedback in **two layers**, the way a good teacher marks:

1. **Macro pass:** content, structure, coherence — revise first
2. **Micro pass:** vocabulary, grammar, collocation — polish second

Every correction is tagged with an error type and an explanation of *why*, because the goal is a better writer, not just a better essay.

**For teachers** — A class dashboard aggregates error patterns across submissions, so you can see at a glance that 60% of the class struggles with 把-sentences, and plan the next lesson accordingly.

## Research foundation

HongBi's feedback design is not guesswork. It is built on my M.A. thesis research at NTU Singapore: a **three-group experimental study** comparing feedback on L2 Chinese writing from (1) AI alone, (2) teachers alone, and (3) human–AI collaboration, which informed a dual-layer scaffolding framework for how AI feedback should be sequenced for language learners.

An earlier research prototype (Claude-based) lives at [`chinese-writing-feedback`](https://github.com/gracetang0925/chinese-writing-feedback). This repository is the ground-up rebuild on OpenAI's stack for Build Week.

## How it works

```
Learner essay (text or photo)
        │
        ▼
GPT-4o vision ──► handwriting transcription (photos only)
        │
        ▼
GPT-4o + Structured Outputs
  · pedagogical rubric prompt (layer 1: macro / layer 2: micro)
  · returns structured JSON: error span, category, severity,
    suggested revision, learner-facing explanation
        │
        ▼
Front end renders inline annotations — like a marked-up paper
        │
        ▼
Supabase stores essay history + error analytics ──► teacher dashboard
```

**Stack:** GPT-4o (Structured Outputs + vision) · Cloudflare Workers (serverless API) · Supabase/Postgres · vanilla JS front end

## Running locally

1. Clone the repo
2. Set your OpenAI API key as a Cloudflare Workers secret:
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```
3. Deploy the worker:
   ```bash
   wrangler deploy
   ```
4. Open `index.html` (learner view) or `teacher.html` (teacher dashboard)

*(Adjust these steps to match your final setup.)*

## Roadmap

- [ ] Classroom pilots (IB Chinese B, university CFL programs in Singapore)
- [ ] Learner progress tracking across essays
- [ ] Adaptive feedback depth by proficiency level (HSK band)
- [ ] Beyond writing: extending the layered-scaffolding engine to speaking

## About me

I'm Grace Tang — three years as a Chinese language teacher, now an M.A. student in International Chinese Language Education at NTU Singapore. I've personally graded thousands of these essays. HongBi solves a problem I've lived.

## License

MIT
