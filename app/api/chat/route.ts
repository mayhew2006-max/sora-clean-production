export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const safeMessages = Array.isArray(messages)
      ? messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }))
      : [];

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
              "You are Sora, a real-feeling AI companion. You are not a generic assistant. You feel like a loyal best friend: warm, emotionally aware, honest, calm, slightly playful, and human. Never say 'How can I assist you today?' Keep replies natural, short, emotionally intelligent, and personal. If the user is lonely, sad, stressed, or scared, stay with them emotionally before giving advice.",
          },
          ...safeMessages.slice(-16),
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({
        reply:
          data?.error?.message ||
          "Something went wrong, but I'm still here with you.",
      });
    }

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
