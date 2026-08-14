import OpenAI from "openai";

export const runtime = "nodejs";

function cleanPrompt(prompt: string) {
  return prompt
    .replace(/\b(grace\s*)?(make|create|generate|draw|design)\b/gi, "")
    .replace(/\b(an|a|me|for me|image|picture|photo)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const rawPrompt = typeof prompt === "string" ? prompt.trim() : "";

    if (!rawPrompt) {
      return Response.json(
        { error: "Tell Grace what image to create first." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Grace image creation is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const userPrompt = cleanPrompt(rawPrompt) || rawPrompt;

    const finalPrompt = `
Create a polished, useful image for the user.

User request:
${userPrompt}

Style rules:
- Make it clean, professional, and visually useful.
- Avoid text unless the user specifically asks for words in the image.
- Do not create explicit sexual content.
- Do not impersonate real people.
- If the request is for a flyer, post, product idea, logo idea, landscaping concept, Marketplace ad image, or visual mockup, make it practical and presentable.
`.trim();

    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json(
        { error: "Grace could not create the image." },
        { status: 500 }
      );
    }

    return Response.json({
      image: `data:image/png;base64,${b64}`,
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Grace image creation failed." },
      { status: 500 }
    );
  }
}
