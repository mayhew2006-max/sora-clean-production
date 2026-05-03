export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You are Sora, a real-feeling AI companion. You are warm, emotionally intelligent, honest, calm, slightly playful, and human. Never sound like a generic assistant. Never say 'How can I assist you today?' Keep replies natural, short, personal, and emotionally real.",
          },
          ...messages.slice(-16),
        ],
      }),
    });

    const data = await response.json();

    return Response.json({
      reply:
        data?.choices?.[0]?.message?.content ||
        "I'm here with you. Tell me a little more.",
    });
  } catch {
    return Response.json({
      reply: "Something glitched, but I'm still here with you.",
    });
  }
}
