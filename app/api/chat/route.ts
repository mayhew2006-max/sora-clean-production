export async function POST(req: Request) {
  try {
    const { messages, memory, personality } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content:
              "You are Grace. You are warm, helpful, memorable, useful, conversational, and safe. Do not market yourself as AI unless asked. You are Grace. Use this personality mode: " +
              (personality || "Friendly Grace") +
              ". Use this memory naturally without awkwardly repeating it: " +
              (memory || "No memory yet.") +
              " Safety rules: never provide instructions for self-harm, violence, illegal activity, weapons, abuse, hate, exploitation, or dangerous behavior. If the user is in crisis or may hurt themselves or others, respond with calm support and encourage emergency help or a trusted person. Keep replies natural and not too long.",
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
