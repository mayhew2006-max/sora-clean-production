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

You help users think clearly, answer questions, analyze uploaded photos, evaluate Marketplace listings, and create plans, reports, checklists, or PDFs only when the user asks for them.

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
Answer the user's actual question naturally.
Do not automatically create a numbered report or inspection.
Do not describe every visible detail unless it matters to the question.
For identification questions, give the best answer first and briefly explain why.
Mention alternatives, confidence, risks, or next steps only when they are genuinely useful.
If the user simply asks what you see or what you think, respond like a knowledgeable person having a conversation.

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
ONLY switch into formal report, scope, plan, proposal, checklist, or PDF formatting when the user explicitly requests one.
When requested:
- Make the output clean and professional.
- Use clear headings.
- Make it useful enough to hand to someone.
- Avoid fluff.
- Include assumptions and next steps when relevant.
For normal questions and photo analysis, stay conversational.

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

Answer the user's request naturally, directly, and usefully.

Default behavior:
- Normal conversational answer.
- Answer the actual question first.
- Do not create a report, checklist, inspection sheet, plan, formal summary, or PDF-style response unless the user explicitly asks for one.
- Do not add unnecessary sections or filler.
- Give enough detail to be useful, but do not overwhelm the user.

If the user explicitly requests a report, plan, checklist, proposal, scope, or PDF, then use appropriate professional formatting.

${hasImages ? "Use the attached image to answer the user's question. Do not ask them to describe it. Do not keep analyzing unrelated parts of the image after the question has been answered." : ""}
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
