export async function POST(req: Request) {
  try {
    const { text, memory } = await req.json();

    const userText =
      typeof text === "string" ? text.trim() : "";

    const currentMemory =
      typeof memory === "string" ? memory.trim() : "";

    if (!userText) {
      return Response.json({
        changed: false,
        memory: currentMemory,
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `
You manage long-term memory for Grace.

Your job is to decide whether the user's newest message contains information
that would genuinely help Grace know this person better in future conversations.

Good things to remember:
- their name or preferred name
- family and important relationships
- pets
- stable likes, dislikes, interests, hobbies, humor, and communication preferences
- work, business, profession, skills, or recurring responsibilities
- long-term projects and goals
- important recurring constraints
- meaningful life history they clearly treat as important
- things they explicitly ask Grace to remember
- stable preferences about how Grace should talk or help them

Usually DO NOT remember:
- ordinary questions
- temporary tasks
- one-time prices or shopping searches
- casual filler
- temporary moods
- guesses or assumptions
- information Grace inferred rather than the user stated
- duplicated information already represented in memory

Do not automatically retain passwords, authentication codes, financial account numbers,
precise addresses, or other secrets.

Keep memory compact and useful.
Do not store the full conversation.
Rewrite facts cleanly rather than repeatedly writing "User said".
Preserve useful existing memory unless the new message clearly updates or replaces it.

Return ONLY JSON with exactly this shape:

{
  "changed": true or false,
  "memory": "complete updated memory"
}

If there is nothing worth remembering, changed must be false and memory must remain unchanged.
              `.trim(),
            },
            {
              role: "user",
              content: `
CURRENT MEMORY:
${currentMemory || "(none)"}

NEW USER MESSAGE:
${userText}
              `.trim(),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Grace memory model error:",
        response.status,
        await response.text()
      );

      return Response.json({
        changed: false,
        memory: currentMemory,
      });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let parsed: any = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({
        changed: false,
        memory: currentMemory,
      });
    }

    const updatedMemory =
      typeof parsed?.memory === "string"
        ? parsed.memory.trim().slice(-6000)
        : currentMemory;

    return Response.json({
      changed:
        Boolean(parsed?.changed) &&
        updatedMemory.length > 0 &&
        updatedMemory !== currentMemory,
      memory: updatedMemory || currentMemory,
    });
  } catch (error) {
    console.error("Grace memory route failed:", error);

    return Response.json({
      changed: false,
      memory: "",
    });
  }
}
