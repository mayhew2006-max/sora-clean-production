import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        reply: "OPENAI_API_KEY is missing. Add it in Vercel environment variables.",
      });
    }

    const openaiMessages = [
      {
        role: "system",
        content:
          "You are Sora, a warm AI companion. You are emotionally intelligent, honest, comforting, playful when appropriate, and never generic. Do not say 'How can I assist you today?' Keep replies natural, human, and concise.",
      },
      ...messages,
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

    const data = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "I'm here with you. Tell me a little more.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: "Something glitched, but I'm still here with you.",
    });
  }
}
