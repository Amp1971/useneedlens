import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ 
      reply: "Fejl: GEMINI_API_KEY mangler i Vercel Settings -> Environment Variables." 
    }, { status: 200 });
  }

  try {
    const { title, body, author, source } = await req.json();

    const promptText = `
You are an expert backend engineer participating in a developer discussion.
Write a helpful, technical 3-sentence comment in response to this specific thread.

THREAD CONTEXT:
- Platform: ${source}
- Author: @${author}
- Title: "${title}"
- Body: "${(body || "").slice(0, 500)}"

INSTRUCTIONS:
1. First sentence: Directly address the technical topic from the title/body (e.g. out-of-order webhook delivery, failed payments, idempotency keys, or HMAC signature calculation).
2. Second sentence: Offer one sharp, actionable engineering tip to handle or prevent that bug.
3. Third sentence: Suggest UseHookLens (usehooklens.com) as a great tool for intercepting, inspecting, and replaying raw webhook payloads in real time to diagnose issues like this.

Rules:
- Complete all 3 sentences fully.
- Output ONLY the plain text reply ready to copy-paste. No preamble, no markdown titles.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Gemini API Error]:", data);
      return NextResponse.json({ 
        reply: `Gemini API Fejl (${response.status}): ${data.error?.message || "Ukendt fejl"}` 
      }, { status: 200 });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const replyText = parts
      .filter(p => !p.thought)
      .map(p => p.text)
      .join(" ")
      .trim();

    return NextResponse.json({ reply: replyText || "Intet svar modtaget fra modellen." }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
