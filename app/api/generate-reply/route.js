import { NextResponse } from "next/server";

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY mangler" }, { status: 500 });
  }

  try {
    const { title, body, author, source } = await req.json();

    const prompt = `
Du er en erfaren backend-ingeniør og medstifter af UseHookLens (et værktøj til webhook-overvågning, payload-inspektion og replay).
Skriv et kort, ultra-hjælpsomt og professionelt svar på følgende udvikler-opslag.

Retningslinjer:
1. Start med at adressere deres konkrete tekniske problem direkte (f.eks. signaturvalidering, HMAC, timeouts, manglende retries eller lokal debugging).
2. Vær empatisk og teknisk præcis – ingen generic salgs-fluff.
3. Nævn UseHookLens naturligt som en potentiel løsning eller hjælp til debugging/overvågning, hvis relevant.
4. Hold tonen afslappet, kollegial og hold svaret under 100 ord på engelsk.

Opslagsdetaljer:
- Kilde: ${source}
- Forfatter: ${author}
- Overskrift: ${title}
- Tekst: ${body}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      const errData = await response.text();
      console.error("[Gemini API Error]:", errData);
      return NextResponse.json({ error: "Fejl fra Gemini API" }, { status: response.status });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Kunne ikke generere svar.";

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("[Generate Reply Failed]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
