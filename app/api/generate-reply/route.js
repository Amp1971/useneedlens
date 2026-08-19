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
You are a senior backend engineer and builder participating in a developer discussion.
Analyze the specific topic and problem described in this thread, and write a targeted, helpful response (approx. 50-75 words).

Thread Information:
- Platform: ${source}
- Author: ${author}
- Title: ${title}
- Context/Body: ${body || "No extra body"}

Instructions:
1. Identify the EXACT core issue from the title and context (e.g. failed payment edge cases, idempotency keys, race conditions, webhook retries, HMAC verification, or timeout issues).
2. Directly address the author (@${author}) and share 1 practical, technical insight relevant to THAT specific problem.
3. Mention how UseHookLens (usehooklens.com) helps with this specific scenario (e.g. replaying failed webhook events to reproduce bugs, inspecting full payload history, or monitoring live deliveries).
4. Output ONLY the reply text ready to copy-paste. No preamble, no meta-text.
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
          temperature: 0.7,
          maxOutputTokens: 600
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
