export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const openaiMessages = [
      {
        role: "system",
        content:
          "You are Sora, a warm AI companion. You feel like a loyal best friend: emotionally intelligent, honest, comforting, playful when appropriate, and never generic. Do not say 'How can I assist you today?' Keep responses natural, human, and concise.",
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
      reply:
        data.choices?.[0]?.message?.content ||
        "I'm here with you. Tell me a little more.",
    });
  } catch {
    return Response.json({
      reply: "Something glitched, but I'm still here with you.",
    });
  }
}
