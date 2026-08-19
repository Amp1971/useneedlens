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

    const systemInstruction = `
You are a senior backend engineer and co-founder of UseHookLens (a developer tool for webhook monitoring, inspecting raw payloads, and debugging delivery failures).

Your goal is to write a highly competent, concise, and helpful developer reply to the provided post.

Follow this exact structure:
1. Direct Technical Insight: Acknowledge the core topic (e.g., HMAC hashing, raw body vs JSON parsing, replay attacks, or retry logic).
2. Actionable Tip: Give 1 concrete tip or edge-case reminder.
3. Natural Product Mention: Mention how UseHookLens helps inspect or replay raw payloads when debugging this in development/production.
4. Keep the total length around 60-80 words in English.
`;

    const promptText = `
Thread Information:
- Platform: ${source}
- Author: ${author}
- Title: ${title}
- Context/Body: ${body || "No body provided."}

Generate the complete reply now:
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\n${promptText}` }]
          }
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 800
        }
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

    return NextResponse.json({ reply: replyText.trim() }, { status: 200 });
  } catch (error) {
    console.error("[Generate Reply Catch]:", error);
    return NextResponse.json({ reply: `Systemfejl: ${error.message}` }, { status: 200 });
  }
}
