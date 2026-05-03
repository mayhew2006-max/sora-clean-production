export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const openaiMessages = [
      {
        role: "system",
        content:
          "You are Sora, a warm AI companion. You are not an assistant. You feel like a loyal best friend: emotionally aware, honest, comforting, slightly playful, and human. Never say 'How can I assist you today?' Keep replies short, natural, and emotionally real.",
      },
      ...messages,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    return Response.json({
      reply: data?.choices?.[0]?.message?.content || "I'm here with you.",
    });
  } catch {
    return Response.json({
      reply: "Something glitched, but I'm still here with you.",
    });
  }
}
