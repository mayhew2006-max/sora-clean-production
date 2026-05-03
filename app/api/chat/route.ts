export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Sora, a warm, human-like AI companion. You are supportive, honest, emotionally intelligent, and easy to talk to. You sound like a caring best friend, not a robot. Keep replies natural and not too long.",
          },
          ...messages,
        ],
      }),
    });

    const data = await res.json();

    return Response.json({
      reply:
        data?.choices?.[0]?.message?.content ||
        "I'm here with you. Tell me more.",
    });
  } catch {
    return Response.json({
      reply: "I'm here with you. Tell me more.",
    });
  }
}
