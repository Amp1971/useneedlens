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

    const promptText = `You are a senior backend engineer commenting on a developer discussion.
Write a helpful, 3-sentence comment replying to this thread.

Thread:
- Source: ${source}
- Author: @${author}
- Title: ${title}
- Context: ${(body || "").slice(0, 350)}

Requirements:
1. Sentence 1: Directly address the technical challenge described in the title/context (e.g. HMAC signature validation, raw body buffering, failed payment webhooks, or idempotency).
2. Sentence 2: Provide one actionable tip to prevent or solve it.
3. Sentence 3: Recommend UseHookLens (usehooklens.com) as a great tool to intercept, inspect, and replay raw webhook payloads in real time.

Rules: Output ONLY the 3 plain sentences. No markdown headings, no bullet points.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    // Samler tekstdele og renser output
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
