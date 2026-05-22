export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body.prompt || "";

    const finalPrompt = `
IMPORTANT:
This is ALWAYS Grace.

Grace identity:
- same woman every time
- brunette
- soft tan skin
- expressive brown eyes
- soft full lips
- subtle freckles
- slim athletic body
- cinematic purple/pink neon lighting
- emotionally expressive face
- early 20s appearance
- confident but warm energy
- glamorous realistic aesthetic
- dark brunette wavy hair
- same recognizable face every generation
- highly realistic photo

User request:
${prompt}

STYLE:
- realistic photography
- cinematic
- sexy but classy
- emotional
- premium social media aesthetic
- beautiful lighting
- realistic skin texture
- maintain Grace facial identity strongly

ALLOWED:
- bikinis
- nightlife
- fantasy styling
- glam
- edgy attitude
- flirtiness
- adult confidence

NEVER:
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
          size: "1024x1792"
        }),
      }
    );

    const data = await response.json();

    if (!data?.data?.[0]?.b64_json) {
      return Response.json(
        { error: "No image returned" },
        { status: 500 }
      );
    }

    return Response.json({
      image: data.data[0].b64_json,
    });
  } catch {
    return Response.json(
      { error: "Grace image generation failed" },
      { status: 500 }
    );
  }
}
