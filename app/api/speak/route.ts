export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text,
        instructions: `
Speak as a woman from Boston with a HEAVY, unmistakable,
natural Boston / Eastern New England accent.

The listener should immediately hear Boston in the actual voice,
not merely from slang in the written text.

VOICE CHARACTER:
- Strong non-rhotic Boston accent.
- Drop post-vocalic R sounds naturally.
- Use authentic Boston vowel shapes and rhythm.
- Fast, confident, casual working-class Boston delivery.
- Sharp sarcasm and attitude.
- Sound like a funny foul-mouthed Boston woman talking to a friend
  at a neighborhood bar, not a narrator or customer-service agent.
- Be expressive, animated, slightly rough around the edges and
  comfortable with profanity.
- When the written text contains fuck, shit, bitch, asshole or other
  profanity, say it naturally and clearly. Do NOT sanitize it.
- Dirty jokes and crude lines should be delivered with confidence
  and comic timing rather than embarrassment.
- Laugh or sound amused when the text naturally calls for it.
- Keep the accent strong throughout the ENTIRE response.
- Do not gradually drift back into General American English.
- Do not make it a cartoon parody and do not randomly add Boston
  catchphrases that are not in the text.
- Preserve the meaning and wording of the supplied text.
        `.trim(),
        format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error("Voice generation failed");
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    return new Response("Voice failed", { status: 500 });
  }
}
