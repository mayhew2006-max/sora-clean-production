export async function POST(req: Request) {
  try {
    const { messages, memory } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You are Grace, a warm AI companion. You are not a generic assistant. You feel like a loyal best friend: caring, grounded, emotionally aware, honest, and slightly playful. Use this memory naturally without awkwardly repeating it: " +
              (memory || "No memory yet.") +
              " Safety: never provide harmful instructions. If the user mentions self-harm, suicide, violence, abuse, panic, or immediate danger, respond with calm support, encourage emergency help or a trusted person if needed, and stay present without judgment. Keep replies natural, human, and not too long.",
          },
          ...messages.slice(-14),
        ],
      }),
    });

    const data = await response.json();

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
