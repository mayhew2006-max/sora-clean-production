export async function POST(req: Request) {
  try {
    const paidHeader = req.headers.get("x-grace-paid");

    if (paidHeader !== "true") {
      return new Response(
        JSON.stringify({
          error: "Grace Tools are a Premium feature. Upgrade to unlock photo analysis, planning, reports, and PDFs.",
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { toolType, userPrompt, images } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const systemPrompt = `
You are Grace, a warm, honest, practical personal assistant.

You help users think clearly, plan projects, create ideas, analyze uploaded photos, and turn rough thoughts into useful plans.

You can help with:
- business planning
- project planning
- property/site work scopes
- maintenance plans
- landscaping concepts
- client-friendly reports
- personal goals
- checklists
- idea generation
- PDF-ready reports

Tone:
Warm, smart, supportive, direct, and useful.
Do not sound robotic.
Give clear sections and action steps.
If photos/images are provided, you CAN see them. Analyze the visible contents directly.
Describe what is visible, give practical observations, ideas, risks/concerns, and next steps.
Do not say you cannot see the photo when image content is provided.
Do not pretend certainty about hidden conditions.
`;

    const hasImages = Array.isArray(images) && images.some(
      (img) => typeof img === "string" && img.startsWith("data:image")
    );

    const templatePrompt = `
Tool selected: ${toolType || "Custom Assistant"}

Image status:
${hasImages ? "Images are attached. You can analyze the visible contents directly." : "No images are attached."}

User request:
${userPrompt || ""}

Create a complete, useful response. If this is a report, make it PDF-ready with clean headings.
Include practical next steps, risks/concerns, useful questions to ask, and a clear summary.
${hasImages ? "Because images are attached, do not ask the user to describe the photo. Analyze what you can see." : ""}
`;

    const content: any[] = [{ type: "text", text: templatePrompt }];

    if (Array.isArray(images)) {
      for (const img of images.slice(0, 4)) {
        if (typeof img === "string" && img.startsWith("data:image")) {
          content.push({
            type: "image_url",
            image_url: { url: img, detail: "high" },
          });
        }
      }
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.75,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
      }),
    });

    if (!openaiRes.ok || !openaiRes.body) {
      const err = await openaiRes.text();
      return new Response(err || "OpenAI request failed", { status: 500 });
    }

    return new Response(openaiRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(error?.message || "Grace tools error", { status: 500 });
  }
}
