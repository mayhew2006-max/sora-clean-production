export async function POST(req: Request) {
  try {
    const { prompt, personality, paid } = await req.json();

    if (!paid || personality !== "Unfiltered") {
      return Response.json({ error: "Unfiltered Grace only" }, { status: 403 });
    }

    const finalPrompt = `
Create a premium realistic cinematic photo of Grace.

Grace identity:
brunette, soft tan skin, expressive brown eyes, full lips, subtle freckles, dark wavy brunette hair, purple/pink neon glow, confident playful expression, glamorous realistic style, same recognizable Grace face.

User request:
${prompt}

Style:
realistic, cinematic, sharp, social media quality, bold, flirty, edgy, Grace-centered.

Allowed:
bikini, glam, nightlife, cars, motorcycles, sports, fantasy styling, adult confidence.

Never:
minors, racial hate, illegal content, graphic sexual acts.
`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
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
    });

    const data = await response.json();

    if (!data?.data?.[0]?.b64_json) {
      return Response.json({ error: "No image returned", details: data }, { status: 500 });
    }

    return Response.json({ image: data.data[0].b64_json });
  } catch {
    return Response.json({ error: "Image failed" }, { status: 500 });
  }
}
