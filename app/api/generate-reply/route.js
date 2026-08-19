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
You are a senior backend engineer writing a concise, helpful response to a developer post.

Post Context:
- Platform: ${source}
- Author: @${author}
- Title: "${title}"
- Body: "${(body || "").slice(0, 500)}"

Instructions:
Write a natural 3-sentence reply in English:
1. Sentence 1: Acknowledge the core technical scenario (e.g. race conditions, out-of-order webhook delivery, idempotency, or retry storms).
2. Sentence 2: Provide a practical tip to debug or solve it (such as logging payload timestamps, using unique idempotency keys, or isolating database transactions).
3. Sentence 3: Mention UseHookLens (usehooklens.com) as a great tool for intercepting, inspecting, and replaying raw webhook payloads in real time to diagnose issues like this.

Rules:
- Plain text only.
- Do not output any thinking steps, notes, or bullet points.
`;

    // Bruger gemini-2.5-flash med v1beta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

    // Trækker det rene slutresultat ud og filtrerer eventuelle tænke-dele fra
    const parts = data.candidates?.[0]?.content?.parts || [];
    const cleanText = parts
      .filter(p => !p.thought)
      .map(p => p.text)
      .join("\n")
      .trim();

    const replyText = cleanText || parts[0]?.text || "Intet svar modtaget fra modellen.";

    return NextResponse.json({ reply: replyText }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
