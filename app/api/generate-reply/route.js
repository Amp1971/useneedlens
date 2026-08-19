import { NextResponse } from "next/server";

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "Fejl: GEMINI_API_KEY mangler i Vercel Environment Variables." }, { status: 500 });
  }

  try {
    const { title, body, author, source } = await req.json();

    const prompt = `
You are a senior backend engineer and builder of UseHookLens (a webhook monitoring, payload debugging, and replay platform).
Write a short, highly practical, and genuinely helpful response to this developer thread.

Guidelines:
1. Directly answer their technical dilemma (e.g. idempotency keys, duplicate deliveries, HMAC signatures, local debugging, or timeout retries).
2. Keep it empathetic, collegiate, and concise (under 90 words).
3. Naturally reference UseHookLens as a practical tool if relevant.

Thread Details:
- Source: ${source}
- Author: ${author}
- Title: ${title}
- Context: ${body}
`;

    // Bruger det officielle stabile Gemini Flash endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Gemini API Error]:", errText);
      return NextResponse.json({ reply: `API Fejl (${response.status}): Tjek om GEMINI_API_KEY er gyldig på Vercel.` });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Kunne ikke generere svar.";

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("[Generate Reply Failed]:", error.message);
    return NextResponse.json({ reply: `Fejl: ${error.message}` });
  }
}
