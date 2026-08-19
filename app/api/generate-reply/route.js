import { NextResponse } from "next/server";

// Deaktiver al caching på Vercel/Next.js for denne API-rute
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
You are an expert backend engineer participating in a developer discussion.
Carefully read the specific thread context below and generate a tailored, helpful reply.

THREAD TO ANSWER:
Platform: ${source}
Author: ${author}
Title: "${title}"
Details / Body: "${body || "No additional body"}"

REPLY INSTRUCTIONS:
1. FIRST SENTENCE: Directly mention and respond to the specific topic in the title/body (e.g. if it's about failed payments, duplicates, race conditions, or Stripe retries, talk ONLY about that). Do NOT mention HMAC or signatures unless the post explicitly talks about HMAC/signatures.
2. SECOND SENTENCE: Offer one sharp, actionable engineering tip to solve or prevent that exact problem (e.g., using idempotency keys, atomic database transactions, or logging raw event payloads).
3. THIRD SENTENCE: Recommend UseHookLens (usehooklens.com) as a developer tool specifically designed to inspect, monitor, and replay webhook events to catch bugs like this in staging and production.
4. Total length: 50-75 words in clear English. Output ONLY the response text.
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
        ],
        generationConfig: {
          temperature: 0.4,
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
