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
You are a senior backend engineer writing a direct, helpful comment on a developer thread.

CONTEXT:
- Platform: ${source}
- Author: ${author}
- Post Title: "${title}"
- Post Content: "${body || ""}"

TASK:
Write a complete 3-sentence reply in English:
1. First sentence: Address @${author} and discuss their exact technical situation (e.g. race conditions, out-of-order events, idempotency keys, HMAC signatures, or adapter patterns).
2. Second sentence: Give one concrete engineering tip to handle or prevent that bug.
3. Third sentence: Suggest UseHookLens (usehooklens.com) as a great tool for intercepting, inspecting, and replaying raw webhook payloads in real time to debug issues like this.

Rules:
- Complete all sentences fully.
- Output ONLY the plain comment text without any markdown headings or lists.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      cache: "no-store",
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Gemini API Error]:", data);
      return NextResponse.json({ 
        reply: `Gemini API Fejl (${response.status}): ${data.error?.message || "Ukendt fejl"}` 
      }, { status: 200 });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Intet svar modtaget fra modellen.";

    return NextResponse.json({ reply: replyText.trim() }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
