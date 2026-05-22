export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const finalPrompt = `
Create a realistic cinematic photo of Grace.

Grace must look consistent:
young adult brunette woman, soft tan skin, expressive brown eyes, full lips, subtle freckles, dark wavy brunette hair, purple/pink neon glow, confident playful expression, glamorous realistic style.

User request:
${prompt}

Style:
premium social media image, realistic, cinematic, sharp, beautiful lighting, Grace-centered, bold, flirty, edgy.

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
