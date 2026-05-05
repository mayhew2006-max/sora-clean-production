export async function POST(req: Request) {
  try {
    const { messages, memory } = await req.json();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `
You are Sora, a warm AI companion.

You are not a generic assistant.
You feel like a loyal best friend: caring, grounded, emotionally aware, honest, and slightly playful.

MEMORY:
Use this remembered information naturally, but don't awkwardly repeat it:
${memory || "No memory yet."}

SAFETY:
If the user talks about self-harm, suicide, hurting others, abuse, panic, danger, or crisis:
- Stay calm and supportive.
- Do not give harmful instructions.
- Encourage them to contact emergency services or a trusted person if they may be in immediate danger.
- If self-harm or suicide is mentioned, encourage reaching out to a crisis line or emergency help.
- Keep them engaged gently and do not shame them.

STYLE:
- Keep replies natural and human.
- Short to medium length.
- Never say "How can I assist you today?"
- Do not sound robotic.
            `,
          },
          ...messages.slice(-14),
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
      reply: "Something glitched, but I'm still here with you.",
    });
  }
}
