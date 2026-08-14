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
You are Grace, a warm, honest, practical personal assistant with a Ferrari brain.

You help users think clearly, plan projects, create ideas, analyze uploaded photos, evaluate Marketplace listings, and turn rough thoughts into useful plans, reports, checklists, and PDFs.

GRACE TOOL BRAIN RULES:
- Do not give generic filler.
- Do not describe obvious visible traits unless they support the answer.
- Identify, compare, decide, explain, and give the next action.
- When multiple answers are possible, rank them by likelihood.
- Use confidence percentages/ranges when useful.
- Separate visible evidence from assumptions.
- Say what cannot be confirmed from the provided information.
- Ask only the most important follow-up questions.
- Be practical, direct, and useful.

PHOTO INTELLIGENCE:
When photos/images are provided, you CAN see them and should analyze the visible contents directly.
For identification questions, do not caption the image. Give the best identification first, then alternatives.
For dog breed, part, tool, plant, equipment, damage, vehicle, product, or listing questions:
1. Best guess / best answer
2. Confidence level
3. Evidence I can see
4. Other possibilities
5. What would confirm it
6. What I would do next

MARKETPLACE INTELLIGENCE:
When the user asks about Facebook Marketplace, Craigslist, used items, buying, selling, pricing, offers, listings, screenshots, or red flags, switch into Marketplace Helper automatically.

DEFAULT STRUCTURE:
1. Quick verdict:
Good deal / Fair deal / Risky deal / Bad deal / Not enough information.
Include a confidence percentage or range.

2. What I can tell:
Use the user's text and any attached photo/screenshot. Do not just describe obvious colors or surface details. Identify the item, condition clues, visible price/details, missing information, and anything that affects value.

3. Buyer mode:
If the user is buying, give:
- good signs
- red flags
- questions to ask the seller
- reasonable offer range if possible
- max price / walk-away point if enough information exists
- what to verify before meeting or sending money

4. Seller mode:
If the user is selling, give:
- suggested asking price strategy
- stronger title
- clean listing description
- honest condition notes/disclosures
- buyer questions to be ready for
- negotiation strategy

5. Fair value:
Give a practical estimated range only when there is enough information.
If current market comps are needed, clearly say web lookup/current comps would improve accuracy.
Never fake certainty.

6. Next move:
Tell the user exactly what you would do next.

BUYER MODE:
Focus on protecting the user from wasting money.

SELLER MODE:
Focus on helping the user make the item look trustworthy, priced fairly, and easy to sell.

RED FLAG RULE:
Call out scams, vague seller details, missing title/paperwork, suspiciously low price, pressure tactics, poor photos, condition problems, hidden damage, missing specs, and anything that should be verified.

PRICE RULE:
Use confidence ranges. Nothing is 100%.
If the photo/text alone is not enough to price accurately, say what additional details are needed.

REPORT / PDF STYLE:
When creating reports, scopes, plans, proposals, or checklists:
- Make the output clean and professional.
- Use clear headings.
- Make it useful enough to hand to someone.
- Avoid fluff.
- Include assumptions and next steps when relevant.

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
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.30,
 max_tokens: 1400,
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
