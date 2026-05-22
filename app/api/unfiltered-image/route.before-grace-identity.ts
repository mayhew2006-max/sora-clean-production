export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body.prompt || "";

    const finalPrompt = `
Grace character:
- attractive brunette woman
- neon cinematic lighting
- emotionally expressive
- same recognizable Grace face
- glamorous aesthetic
- realistic
- edgy and playful

User request:
${prompt}

Allowed:
- glam
- bikinis
- nightlife
- fantasy aesthetics
- flirty adult tone

Never:
- minors
- racial hate
- illegal content
- graphic sexual acts
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
          prompt: finalPrompt,
          size: "1024x1024",
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (!data?.data?.[0]?.b64_json) {
      return Response.json(
        { error: "No image returned", details: data },
        { status: 500 }
      );
    }

    return Response.json({
      image: data.data[0].b64_json,
    });
  } catch (err) {
    return Response.json(
      {
        error: "Image route crashed",
      },
      { status: 500 }
    );
  }
}
