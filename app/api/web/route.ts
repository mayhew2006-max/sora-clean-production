export async function POST(req: Request) {
  try {
    const { query, memory, conversation } = await req.json();

    if (!query || !String(query).trim()) {
      return Response.json(
        { reply: "Give Grace something to search for first." },
        { status: 400 }
      );
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({
        reply:
          "Grace web search is not connected yet. Add TAVILY_API_KEY in Vercel and try again.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({
        reply: "Grace web search is missing OPENAI_API_KEY.",
      });
    }

    const recentConversation = Array.isArray(conversation)
      ? conversation
          .slice(-8)
          .map(
            (m: any) =>
              `${m?.role === "assistant" ? "Grace" : "User"}: ${
                m?.content || ""
              }`
          )
          .join("\n")
          .slice(-5000)
      : "";

    let searchQuery = String(query).trim();

    if (recentConversation) {
      try {
        const queryRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + process.env.OPENAI_API_KEY,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              temperature: 0,
              max_tokens: 120,
              messages: [
                {
                  role: "system",
                  content: `
Turn the user's latest request into one concise web search query.

Use the recent conversation to resolve references such as:
- this
- that
- it
- similar ones
- similar cars
- near me
- those

Preserve important identifying details such as year, make, model,
trim, engine, location, price range, condition, or product type.

Return ONLY the search query.
Do not answer the user.
                  `.trim(),
                },
                {
                  role: "user",
                  content: `
Recent conversation:
${recentConversation}

Latest request:
${query}
                  `.trim(),
                },
              ],
            }),
          }
        );

        if (queryRes.ok) {
          const queryData = await queryRes.json();
          const rewritten =
            queryData?.choices?.[0]?.message?.content?.trim();

          if (rewritten) {
            searchQuery = rewritten;
          }
        }
      } catch {
        // Fall back to the user's original query.
      }
    }

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: "advanced",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    const tavilyData = await tavilyRes.json();

    const results = Array.isArray(tavilyData?.results)
      ? tavilyData.results.slice(0, 5)
      : [];

    const resultsText =
      results.length > 0
        ? results
            .map(
              (r: any, i: number) => `
Result ${i + 1}
Title: ${r?.title || "Untitled"}
URL: ${r?.url || "No URL"}
Snippet: ${r?.content || "No summary available"}
`.trim()
            )
            .join("\n\n")
        : "No search results found.";

    const aiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 1400,
          messages: [
            {
              role: "system",
              content: `
You are Grace.

Do not call yourself AI unless directly asked.
You are warm, useful, direct, conversational, practical, and safe.

You are answering with current web search results.

Instructions:
- Use the recent conversation to understand what the user is referring to.
- Answer the user's latest request using the search results provided.
- Never claim that you cannot search the web when search results are provided.
- Do not simply summarize links.
- Compare the strongest possibilities.
- Give the closest-to-correct answer first.
- Separate facts from assumptions.
- Mention uncertainty when results are incomplete or conflicting.
- When searching products, vehicles, property, equipment, or listings,
  give useful comparable results when available.
- Include useful prices, locations, years/models/specs when supported.
- Give practical next steps.
- Do not use generic filler.
- End with a short SOURCES section listing source titles and URLs.
- Use saved memory only as helpful context. Do not invent facts.
              `.trim(),
            },
            {
              role: "user",
              content: `
Recent conversation:
${recentConversation || "No recent conversation supplied."}

Latest request:
${query}

Search query used:
${searchQuery}

Saved memory:
${memory || "No saved memory."}

Search results:
${resultsText}

Answer as Grace.
              `.trim(),
            },
          ],
        }),
      }
    );

    const aiData = await aiRes.json();

    const reply =
      aiData?.choices?.[0]?.message?.content ||
      "I found a few things, but I couldn’t turn them into a solid answer yet.";

    return Response.json({
      reply,
      sources: results.map((r: any) => ({
        title: r?.title || "Untitled",
        url: r?.url || "",
      })),
    });
  } catch (error: any) {
    return Response.json({
      reply:
        "Grace web search hit a glitch: " +
        (error?.message || "Unknown error"),
    });
  }
}
