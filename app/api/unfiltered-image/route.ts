export async function POST(req: Request) {
  try {
    const { prompt, personality, paid } = await req.json();

    if (!paid || personality !== "Unfiltered") {
      return Response.json({
        error: "Unfiltered Grace only."
      }, { status: 403 });
    }

    const gracePrompt = `
Grace character consistency:
- same brunette woman
- soft tan skin
- attractive early 20s appearance
- cinematic neon lighting
- expressive eyes
- glamorous but realistic
- emotionally confident
- edgy and playful
- stylish aesthetic
- maintain same recognizable Grace face

User request:
${prompt}

STYLE RULES:
- adult glam allowed
- bikinis allowed
- nightlife aesthetics allowed
- fantasy/cosplay styling allowed
- seductive attitude allowed
- flirty/adult tone allowed
- never minors
- never racial hate
- never illegal content
- never graphic sexual acts
`;

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: gracePrompt,
          size: "1024x1792"
        }),
      }
    );

    const data = await response.json();

    return Response.json({
      image: data?.data?.[0]?.b64_json || null,
    });
  } catch {
    return Response.json({
      error: "Image generation failed"
    }, { status: 500 });
  }
}
