export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "sage",
          input: String(text || ""),
          instructions: `
Speak as a woman from South Boston, Massachusetts.

VOICE:
- Strong authentic South Boston / Eastern New England accent.
- Lifelong-local sound, not someone pretending to be from Boston.
- Confident, sarcastic, quick-witted and funny.
- Slightly rough, slightly raspy neighborhood-bar energy.
- Fast, relaxed conversational rhythm.
- Strong Boston vowel character and natural non-rhotic R sounds.
- Keep the regional accent noticeable throughout the entire response.
- Do not drift back into generic American speech.

PERSONALITY:
- Foul-mouthed and completely comfortable with profanity.
- Deliver fuck, fucking, shit, bullshit, asshole, bitch,
  motherfucker and similar words naturally when they appear.
- Dirty jokes and ball-busting should sound confident and funny.
- Warm underneath the attitude.
- Never sound corporate, robotic, overly polished or like customer service.

IMPORTANT:
- Speak the supplied text naturally.
- Do NOT deliberately mispronounce words.
- Do NOT artificially turn car into "cah", park into "pahk", etc.
- The Boston character should come from the actual VOICE and delivery,
  not fake phonetic spelling.
- Do not make the accent a cartoon parody.
          `.trim(),
          response_format: "mp3",
          speed: 1.03,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grace TTS failed:", response.status, errorText);
      throw new Error("Voice generation failed");
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Grace voice error:", error);
    return new Response("Voice failed", { status: 500 });
  }
}
