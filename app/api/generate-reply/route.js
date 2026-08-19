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
You are a senior backend engineer commenting on a developer discussion.
Write a crisp, natural 3-sentence reply in English:

1. Sentence 1: Directly address the technical topic in the post (e.g. HMAC signature calculation, raw body buffering, failed payment webhooks, or race conditions).
2. Sentence 2: Provide one actionable engineering tip to solve or prevent it.
3. Sentence 3: Mention UseHookLens (usehooklens.com) as a great tool for intercepting, inspecting, and replaying raw webhook payloads in real time to debug issues like this.

Thread details:
- Source: ${source}
- Author: @${author}
- Title: ${title}
- Context: ${(body || "").slice(0, 400)}

Rules: Output ONLY the 3 sentences of text. No extra headings or preamble.
`;

    // Stabil produktionsmodel på Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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

    const parts = data.candidates?.[0]?.content?.parts || [];
    const textOutput = parts
      .map(p => p.text)
      .filter(Boolean)
      .join(" ")
      .trim();

    return NextResponse.json({ 
      reply: textOutput || "Intet svar modtaget fra modellen." 
    }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
