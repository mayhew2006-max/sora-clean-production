export async function POST(req: Request) {
  try {
    const { prompt, personality, paid } = await req.json();

    if (!paid || personality !== "Unfiltered") {
      return Response.json(
        { error: "Unfiltered Grace only" },
        { status: 403 }
      );
    }

    const finalPrompt = `
Create a realistic cinematic photo of Grace.

Grace identity:
- same recognizable brunette woman every time
- dark brunette wavy hair
- expressive brown eyes
- soft tan/olive skin
- full glossy lips
- subtle freckles
- slim athletic body
- glamorous but approachable
- purple/pink neon cinematic lighting
- realistic skin texture
- emotionally expressive
- early 20s adult appearance
- confident playful energy
- realistic premium social media aesthetic

User request:
${prompt}

STYLE:
- realistic photography
- cinematic
- premium social media look
- emotional
- sexy but classy
- tasteful adult glamour
- seductive poses allowed
- bikinis allowed
- lingerie allowed
- implied nudity allowed
- nightlife aesthetics allowed
- edgy/flirty energy allowed

NEVER:
- minors
- racial hate
- illegal content
- graphic sexual acts
- explicit pornographic content
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
          size: "1024x1536",
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (!data?.data?.[0]?.b64_json) {
      return Response.json(
        {
          error: "No image returned",
          details: data,
        },
        { status: 500 }
      );
    }

    return Response.json({
      image: data.data[0].b64_json,
    });
  } catch (e) {
    console.log(e);

    return Response.json(
      {
        error: "Grace image generation failed",
      },
      { status: 500 }
    );
  }
}
