import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { prompt, personality, paid } = await req.json();

    if (!paid || personality !== "Unfiltered") {
      return Response.json(
        { error: "Unfiltered Grace only" },
        { status: 403 }
      );
    }

    // Load Grace avatar reference image
    const avatarPath = path.join(
      process.cwd(),
      "public",
      "grace-avatar.png"
    );

    const avatarBuffer = fs.readFileSync(avatarPath);

    const form = new FormData();

    form.append(
      "model",
      "gpt-image-1"
    );

    form.append(
      "image",
      new Blob([avatarBuffer]),
      "grace-avatar.png"
    );

    form.append(
      "prompt",
      `
IMPORTANT:
Use the uploaded reference image as Grace's real face identity.

The generated image MUST look like:
- the SAME woman
- same face
- same eyes
- same hair
- same lips
- same identity
- same brunette appearance
- same recognizable Grace look

User request:
${prompt}

Style:
- realistic cinematic photography
- premium social media aesthetic
- purple/pink neon cinematic glow
- realistic skin texture
- emotionally expressive
- glamorous
- edgy
- confident
- flirty adult vibe

Allowed:
- bikini
- glam
- nightlife
- fantasy styling
- sports
- cars
- motorcycles
- adult confidence

Never:
- minors
- racial hate
- illegal content
- graphic sexual acts
      `
    );

    form.append(
      "size",
      "1024x1536"
    );

    const response = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
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
        error: "Reference image generation failed",
      },
      { status: 500 }
    );
  }
}
