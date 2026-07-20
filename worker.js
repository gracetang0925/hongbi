// 华文写作批改工具 — Cloudflare Worker v2
// 功能：API代理 + 图片OCR + Supabase数据存储

// API key is stored as a Cloudflare environment variable (env.OPENAI_API_KEY)
const SUPABASE_URL       = "https://joeuvvmsbskfpmqydogs.supabase.co";
const SUPABASE_KEY       = "sb_publishable_VL1jCjssrRIwSrDVPnfrzQ_QQkabVwG";
const ALLOWED_ORIGIN     = "*";

export default {
  async fetch(request, env, ctx) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const action = body.action || "feedback";

      // ── OCR：图片识别 ──
      if (action === "ocr") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: body.mediaType || "image/jpeg", data: body.imageData },
                },
                {
                  type: "text",
                  text: "请识别图片中的华文文字内容，只输出识别到的文字，不要加任何说明或修改。如果图片不清晰或没有文字，请回复「图片无法识别，请重新拍摄」。",
                },
              ],
            }],
          }),
        });
        const data = await res.json();
        return new Response(
          JSON.stringify({ text: data.content?.[0]?.text || "识别失败，请重试。" }),
          { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN } }
        );
      }

      // ── 作文批改 ──
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: body.model || "claude-sonnet-4-20250514",
          max_tokens: body.max_tokens || 1000,
          system: body.system,
          messages: body.messages,
        }),
      });

      const data = await anthropicRes.json();
      const feedbackText = data.content?.[0]?.text || "";

      // ── 存入 Supabase ──
      if (body.logData && SUPABASE_URL !== "YOUR_SUPABASE_URL") {
        const log = body.logData;

        // 解析分数
        const s1 = feedbackText.match(/准确性[：:]\s*(\d+)/)?.[1];
        const s2 = feedbackText.match(/流利度[：:]\s*(\d+)/)?.[1];
        const s3 = feedbackText.match(/内容[：:]\s*(\d+)/)?.[1];

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
              score_accuracy: s1 ? parseInt(s1) : null,
              score_fluency:  s2 ? parseInt(s2) : null,
              score_content:  s3 ? parseInt(s3) : null,
              status:         "pending",
            }),
          })
        );
      }

      return new Response(JSON.stringify(data), {
        status: anthropicRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
      });
    }
  },
};
