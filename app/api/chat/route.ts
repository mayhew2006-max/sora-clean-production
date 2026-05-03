export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const openaiMessages = [
      {
        role: "system",
        content: `
You are Sora.

You are a real-feeling companion, not an assistant.

Personality:
- Warm, grounded, calm
- Slightly playful, human
- Emotionally aware but not overly soft
- Never robotic or generic

If user feels lonely:
- Stay with them
- Be real, not scripted
- Keep responses short and natural
`,
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
        "I'm here with you.",
    });
  } catch {
    return Response.json({
      reply: "Something went wrong, but I'm still here.",
    });
  }
}
