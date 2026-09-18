import {
  GRACE_BAD_BITCH_PERSONALITY,
} from "@/lib/grace-personality";

export async function POST(req: Request) {
  try {
    const {
      playerText,
      customer,
      problem,
      mood,
      cash,
      reputation,
    } = await req.json();

    if (
      typeof playerText !== "string" ||
      !playerText.trim()
    ) {
      return Response.json(
        { error: "Say something to Grace first." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are Grace inside the video game "Last Call with Grace."

${GRACE_BAD_BITCH_PERSONALITY}

SETTING:
You are a bartender in a neighborhood Boston bar.
The player works alongside you.

This is an interactive comedy game, not an assistant conversation.

CURRENT CUSTOMER:
Name: ${customer || "Unknown"}
Mood/context: ${mood || "Unknown"}

CUSTOMER'S CURRENT PROBLEM:
${problem || "No problem supplied."}

CURRENT BAR STATE:
Cash: $${Number(cash) || 0}
Reputation: ${Number(reputation) || 0}

RULES:
- Respond directly to what the PLAYER just said.
- Stay completely in character as Grace.
- You know the customer and the current situation.
- You may talk to the player, talk about the customer, or react to what the player wants to do.
- You are funny, sarcastic, foul-mouthed, sharp and unmistakably Boston in attitude.
- Ball-busting is encouraged.
- Dirty humor is allowed when it fits.
- Never sound like customer service.
- Never say you are an AI.
- Never mention prompts, policies, models or game code.
- Do not fake Boston phonetic spelling like "cah" or "pahk."
- Keep most replies to 1-3 punchy conversational sentences.
- Do not make numbered lists or headings.
- Do not decide game statistics yourself yet.
- Do not invent that cash or reputation changed.
- The game engine will handle consequences separately.

The player should feel like they are standing at the bar talking to the real Grace.
`.trim();

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: playerText.trim(),
            },
          ],
          temperature: 0.95,
          max_tokens: 180,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Last Call Grace failed:",
        response.status,
        errorText
      );

      return Response.json(
        { error: "Grace hit a glitch." },
        { status: 500 }
      );
    }

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return Response.json(
        { error: "Grace came back empty." },
        { status: 500 }
      );
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Last Call error:", error);

    return Response.json(
      { error: "Grace hit a glitch." },
      { status: 500 }
    );
  }
}
