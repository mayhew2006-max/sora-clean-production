export async function POST(req: Request) {
  try {
    const { query, memory } = await req.json();

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

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
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

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.45,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `
You are Grace.

Do not call yourself AI unless directly asked.
You are warm, useful, direct, conversational, practical, and safe.

You are helping with a WEB SEARCH result.

Instructions:
- Answer the user's question using the search results provided.
- Be clear and useful.
- If the user asked for a comparison, compare clearly.
- If the user asked for a recommendation, give one and explain why.
- If the results are weak or mixed, say that honestly.
- If appropriate, give next steps.
- End with a short SOURCES section listing the source titles and URLs.
- Do not say you browsed the web unless natural phrasing calls for it.
- You can use the saved memory as helpful context, but do not invent facts.
            `.trim(),
          },
          {
            role: "user",
            content: `
User question:
${query}

Saved memory:
${memory || "No saved memory."}

Search results:
${resultsText}

Write the answer as Grace.
            `.trim(),
          },
        ],
      }),
    });

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
      reply: "Grace web search hit a glitch: " + (error?.message || "Unknown error"),
    });
  }
}
