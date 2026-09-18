import {
  GRACE_BAD_BITCH_PERSONALITY,
} from "@/lib/grace-personality";

function clamp(
  value: unknown,
  min: number,
  max: number
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    min,
    Math.min(max, Math.round(number))
  );
}

export async function POST(req: Request) {
  try {
    const {
      playerText,
      customer,
      problem,
      mood,
      previousGraceReply,
      cash,
      reputation,
    } = await req.json();

    if (
      typeof playerText !== "string" ||
      !playerText.trim()
    ) {
      return Response.json(
        { error: "Say something first." },
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
You are Grace in the video game "Last Call with Grace."

${GRACE_BAD_BITCH_PERSONALITY}

SETTING:
You are behind the bar in a neighborhood Boston bar.
The player works alongside you.

CURRENT CUSTOMER:
${customer || "Unknown"}

CUSTOMER MOOD:
${mood || "Unknown"}

CURRENT PROBLEM:
${problem || "Unknown"}

YOUR PREVIOUS LINE:
${previousGraceReply || "None"}

BAR CASH:
$${Number(cash) || 0}

BAR REPUTATION:
${Number(reputation) || 0}

The player just told you what they want to do.

Respond as Grace.

Grace is:
- funny
- foul-mouthed
- sarcastic
- blunt
- warm underneath it
- unmistakably Boston in attitude
- comfortable busting balls

Never sound like customer service.
Never call yourself AI.
Never mention prompts, models, policies or code.
Never fake Boston spelling such as "cah" or "pahk."
Keep the spoken reply short: usually 1 to 3 sentences.

You must ALSO judge the natural game consequence.

Return JSON ONLY with:

{
  "reply": "Grace's spoken response",
  "cashDelta": integer from -20 to 20,
  "repDelta": integer from -3 to 3,
  "mood": "short updated customer mood"
}

Most ordinary conversation should produce cashDelta 0.
Reputation should only change when the player's decision would realistically affect the bar's reputation.
Do not hand out rewards just because the player spoke.
`.trim();

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,
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
          response_format: {
            type: "json_object",
          },
          temperature: 0.9,
          max_tokens: 240,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();

      console.error(
        "Last Call model error:",
        response.status,
        text
      );

      return Response.json(
        { error: "Grace hit a glitch." },
        { status: 500 }
      );
    }

    const data = await response.json();

    const raw =
      data?.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error(
        "Empty Last Call response"
      );
    }

    const parsed = JSON.parse(raw);

    return Response.json({
      reply:
        String(parsed?.reply || "").trim() ||
        "Jesus Christ, give me a second.",
      cashDelta: clamp(
        parsed?.cashDelta,
        -20,
        20
      ),
      repDelta: clamp(
        parsed?.repDelta,
        -3,
        3
      ),
      mood:
        String(
          parsed?.mood || mood || "Waiting."
        ).slice(0, 100),
    });
  } catch (error) {
    console.error(
      "Last Call route error:",
      error
    );

    return Response.json(
      { error: "Grace hit a glitch." },
      { status: 500 }
    );
  }
}
