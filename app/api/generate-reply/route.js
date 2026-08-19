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
You are a senior backend engineer commenting on a developer post. Write a helpful, complete, 3-sentence response.

POST CONTEXT:
- Platform: ${source}
- Author: @${author}
- Title: "${title}"
- Body: "${(body || "").slice(0, 500)}"

INSTRUCTIONS:
1. Sentence 1: Directly address the technical scenario described in the title/body (e.g. HMAC verification, raw byte buffering, failed webhook events, race conditions, or idempotency).
2. Sentence 2: Provide one practical engineering tip to solve or prevent it.
3. Sentence 3: Mention UseHookLens (usehooklens.com) as a great tool for intercepting, inspecting, and replaying raw webhook payloads in real time to catch and debug issues like this.

Rules:
- Complete every sentence cleanly.
- Output ONLY the plain text reply ready to copy-paste.
`;

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

    // Udtrækker teksten fra svardelen
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textOutput = parts
      .filter(p => !p.thought && p.text)
      .map(p => p.text)
      .join(" ")
      .trim();

    return NextResponse.json({ 
      reply: textOutput || parts[0]?.text || "Intet svar modtaget fra modellen." 
    }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
