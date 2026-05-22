export async function POST(req: Request) {
  try {
    const { prompt, personality, paid } = await req.json();

    if (!paid || personality !== "Unfiltered") {
      return Response.json({ error: "Unfiltered Grace only" }, { status: 403 });
    }

    const finalPrompt = `
Create a premium realistic cinematic photo of Grace.

VERY IMPORTANT:
Grace must look like the same recognizable woman every time, not a random model.

Grace face identity:
- dark brunette wavy hair with soft purple/pink rim lighting
- warm tan/olive skin
- soft youthful face
- expressive brown almond-shaped eyes
- full glossy lips
- gentle confident smile or playful smirk
- subtle freckles
- soft glam makeup
- delicate necklace
- same Grace avatar energy
- cinematic purple neon background
- early 20s adult appearance
- beautiful but approachable
- realistic photo, not cartoon, not plastic, not different ethnicity, not blonde

User request:
${prompt}

Style:
premium social media photo, cinematic, sharp, neon purple/pink glow, realistic skin texture, emotional expression, Grace-centered, bold, flirty, edgy.

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
