export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "nova",
        input: text,
        instructions:
          "Speak warmly and naturally like a real supportive woman named Grace. Calm, human, gentle, not robotic, not like Siri.",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      return new Response("Voice failed", { status: 500 });
    }

    const audio = await response.arrayBuffer();

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch {
    return new Response("Voice failed", { status: 500 });
  }
}
