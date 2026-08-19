import { NextResponse } from "next/server";

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
You are a senior backend engineer and builder of UseHookLens (a webhook monitoring, payload debugging, and replay platform).
Write a short, practical, and genuinely helpful reply to this developer thread.

Guidelines:
1. Directly address their technical problem (e.g. HMAC signatures, duplicate handling, local debugging, or timeout retries).
2. Keep it collegiate, concise, and under 90 words in English.
3. Reference UseHookLens naturally if relevant.

Thread Details:
- Source: ${source}
- Author: ${author}
- Title: ${title}
- Context: ${body}
`;

    // Stabilt Google AI Studio API-endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
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
        reply: `Gemini API Fejl (${response.status}): ${data.error?.message || "Ukendt fejl fra Google AI Studio"}` 
      }, { status: 200 });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Intet svar modtaget fra modellen.";

    return NextResponse.json({ reply: replyText }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
