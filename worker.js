// 华文写作批改工具 — Cloudflare Worker v3
// 功能：OpenAI API 代理 + 图片 OCR + Supabase 数据存储

const OPENAI_URL         = "https://api.openai.com/v1/responses";
const OPENAI_MODEL       = "gpt-5.6-terra";
const SUPABASE_URL       = "https://joeuvvmsbskfpmqydogs.supabase.co";
const SUPABASE_KEY       = "sb_publishable_VL1jCjssrRIwSrDVPnfrzQ_QQkabVwG";
const ALLOWED_ORIGIN     = "*";

const MODE_GUIDANCE = {
  ai: "直接指出问题和修改方案，语气专业、友好。",
  teacher: "语气温和、鼓励；宏观反馈可加入启发式问题，但微观错误仍要给出明确修改。",
  hybrid: "兼顾精确分析和教师指导，并在宏观反馈中指出最值得优先改进的方面。",
};

const FEEDBACK_INSTRUCTIONS = `你是专业的华文二语写作批改助手。请面向第二语言中文学习者批改作文。

反馈必须严格分成两个部分：
1. 宏观反馈：评价内容、结构和连贯性，并指出整体亮点。使用简单、友好的中文。
2. 微观反馈：逐条列出具体错误。每条必须包含错误类型、作文中的原文片段、建议修改和一句简单中文解释。错误类型只能是：语序、量词、体标记（了/过/着）、语体、搭配。不要虚构原文中不存在的错误；如果没有这些类型的明显错误，返回空数组。

所有建议都应适合学习者当前作文，不要重写整篇作文。按给定 JSON schema 返回结果，不要输出 schema 之外的文字。`;

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    macro: {
      type: "object",
      properties: {
        summary: { type: "string", description: "一至两句整体评价" },
        content: { type: "string", description: "对内容充实度和切题程度的反馈" },
        structure: { type: "string", description: "对文章组织和段落结构的反馈" },
        coherence: { type: "string", description: "对句段衔接和逻辑连贯性的反馈" },
        strengths: { type: "string", description: "作文最值得肯定的亮点" },
        scores: {
          type: "object",
          properties: {
            accuracy: { type: "integer", minimum: 0, maximum: 10 },
            fluency: { type: "integer", minimum: 0, maximum: 10 },
            content: { type: "integer", minimum: 0, maximum: 10 },
          },
          required: ["accuracy", "fluency", "content"],
          additionalProperties: false,
        },
      },
      required: ["summary", "content", "structure", "coherence", "strengths", "scores"],
      additionalProperties: false,
    },
    micro: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["语序", "量词", "体标记（了/过/着）", "语体", "搭配"],
          },
          original: { type: "string", description: "作文中的原文片段" },
          correction: { type: "string", description: "建议修改后的文字" },
          explanation: { type: "string", description: "一句简单中文解释" },
        },
        required: ["type", "original", "correction", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["macro", "micro"],
  additionalProperties: false,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  return (data.output || [])
    .flatMap(item => item.content || [])
    .filter(part => part.type === "output_text" && typeof part.text === "string")
    .map(part => part.text)
    .join("");
}

function formatFeedbackText(feedback) {
  const macro = feedback.macro;
  const scores = macro.scores;
  const micro = feedback.micro.length
    ? feedback.micro.map((item, index) => [
        `${index + 1}. **${item.type}**`,
        `原文：「${item.original}」`,
        `→ ${item.correction}`,
        `说明：${item.explanation}`,
      ].join("\n")).join("\n\n")
    : "未发现需要优先修改的语序、量词、体标记、语体或搭配错误。";

  return [
    "【宏观反馈】",
    `整体评价：${macro.summary}`,
    `内容：${macro.content}`,
    `结构：${macro.structure}`,
    `连贯性：${macro.coherence}`,
    `✓ 亮点：${macro.strengths}`,
    `评分：准确性：${scores.accuracy}分，流利度：${scores.fluency}分，内容：${scores.content}分（满分10分）`,
    "",
    "【微观反馈】",
    micro,
  ].join("\n");
}

async function callOpenAI(env, payload) {
  if (!env.OPENAI_API_KEY) {
    return { error: jsonResponse({ error: { message: "服务尚未配置 OPENAI_API_KEY。" } }, 500) };
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      error: jsonResponse(
        { error: { message: data.error?.message || "OpenAI API 请求失败。" } },
        response.status
      ),
    };
  }

  return { data };
}

async function getTeacherFeedback(body) {
  if (!body.sessionId) return jsonResponse({ error: { message: "缺少 sessionId。" } }, 400);

  const params = new URLSearchParams({
    session_id: `eq.${body.sessionId}`,
    status: "eq.returned",
    select: "teacher_annotations",
    order: "created_at.desc",
    limit: "1",
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions?${params}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  const rows = await response.json();

  if (!response.ok) {
    return jsonResponse({ error: { message: rows.message || "教师批注查询失败。" } }, response.status);
  }
  return jsonResponse({ annotations: rows[0]?.teacher_annotations || [] });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    try {
      const body = await request.json();
      const action = body.action || "feedback";

      if (action === "getTeacherFeedback") {
        return getTeacherFeedback(body);
      }

      // ── OCR：OpenAI 视觉识别 ──
      if (action === "ocr") {
        if (!body.imageData) {
          return jsonResponse({ error: { message: "缺少需要识别的图片。" } }, 400);
        }
        const mediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(body.mediaType)
          ? body.mediaType
          : "image/jpeg";
        const result = await callOpenAI(env, {
          model: OPENAI_MODEL,
          instructions: "识别图片中的华文手写或印刷文字。只输出识别到的文字，不要解释、润色或修改。图片不清晰或没有文字时，输出：图片无法识别，请重新拍摄。",
          input: [{
            role: "user",
            content: [{
              type: "input_image",
              image_url: `data:${mediaType};base64,${body.imageData}`,
              detail: "original",
            }],
          }],
          max_output_tokens: 2000,
        });
        if (result.error) return result.error;

        const text = extractOutputText(result.data).trim();
        return jsonResponse({ text: text || "识别失败，请重试。" });
      }

      if (action !== "feedback") {
        return jsonResponse({ error: { message: `不支持的操作：${action}` } }, 400);
      }

      // ── 作文批改：OpenAI Responses API + Structured Outputs ──
      const essay = typeof body.essay === "string" ? body.essay.trim() : "";
      if (!essay) return jsonResponse({ error: { message: "缺少作文内容。" } }, 400);

      const mode = body.mode || body.logData?.mode || "ai";
      const result = await callOpenAI(env, {
        model: OPENAI_MODEL,
        instructions: `${FEEDBACK_INSTRUCTIONS}\n\n本次反馈方式：${MODE_GUIDANCE[mode] || MODE_GUIDANCE.ai}`,
        input: `请批改以下华文作文：\n\n${essay}`,
        max_output_tokens: 3000,
        text: {
          format: {
            type: "json_schema",
            name: "chinese_writing_feedback",
            schema: FEEDBACK_SCHEMA,
            strict: true,
          },
        },
      });
      if (result.error) return result.error;

      const outputText = extractOutputText(result.data);
      if (!outputText) {
        return jsonResponse({ error: { message: "OpenAI 未返回可用的反馈。" } }, 502);
      }

      let feedback;
      try {
        feedback = JSON.parse(outputText);
      } catch {
        return jsonResponse({ error: { message: "OpenAI 返回的反馈格式无效，请重试。" } }, 502);
      }
      const feedbackText = formatFeedbackText(feedback);

      // ── 存入 Supabase ──
      if (body.logData && SUPABASE_URL !== "YOUR_SUPABASE_URL") {
        const log = body.logData;
        const scores = feedback.macro.scores;

        ctx.waitUntil(
          fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              session_id:     log.sessionId,
              student_name:   log.studentName,
              draft:          log.draft || 1,
              mode:           log.mode,
              essay:          log.essay,
              ai_feedback:    feedbackText,
              score_accuracy: scores.accuracy,
              score_fluency:  scores.fluency,
              score_content:  scores.content,
              status:         "pending",
            }),
          })
        );
      }

      return jsonResponse({
        feedback,
        text: feedbackText,
        model: result.data.model || OPENAI_MODEL,
        responseId: result.data.id,
      });
    } catch (err) {
      return jsonResponse({ error: { message: err.message || "服务器错误。" } }, 500);
    }
  },
};
