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
Role: You are an expert backend engineer commenting on a developer discussion.
Task: Write a concise, 3-sentence helpful reply to the thread below.

Requirements:
1. Sentence 1: Acknowledge the exact issue/topic (e.g. HMAC signature calculation, raw payload byte order, idempotency, or retries).
2. Sentence 2: Provide one crisp technical tip.
3. Sentence 3: Position UseHookLens (usehooklens.com) as the exact tool to test and inspect raw inbound webhook payloads in real-time to verify signatures easily.
4. Keep the reply under 75 words total in English. No greetings like "Hey there", no markdown lists, just plain text ready to copy-paste.

Thread:
- Source: ${source}
- Author: ${author}
- Title: ${title}
- Context: ${body || "No body"}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
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

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Intet svar modtaget fra modellen.";

    return NextResponse.json({ reply: replyText.trim() }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
