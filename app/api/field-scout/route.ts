import { NextResponse } from "next/server";
import { buildFieldIntelligence } from "@/lib/grace-field-brain";

export const runtime = "nodejs";
export const maxDuration = 60;

async function nearbyWaterways(lat: number, lng: number) {
  try {
    const query = `[out:json][timeout:8];
(
  way(around:1500,${lat},${lng})["waterway"~"river|stream|canal"];
  way(around:1500,${lat},${lng})["natural"="water"];
  relation(around:1500,${lat},${lng})["natural"="water"];
);
out tags 15;`;

    const response = await fetch(
      "https://overpass.kumi.systems/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(9000),
        cache: "no-store",
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!Array.isArray(data.elements)) return [];

    return data.elements.slice(0, 12).map(
      (item: {
        type?: string;
        id?: number;
        tags?: Record<string, string>;
      }) => ({
        name: item.tags?.name || "Unnamed water feature",
        waterway: item.tags?.waterway || null,
        waterType: item.tags?.water || null,
        natural: item.tags?.natural || null,
        osmType: item.type,
        osmId: item.id,
      })
    );
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawContext =
      typeof body.fieldContext === "string"
        ? body.fieldContext.slice(0, 12000)
        : "";

    const question =
      typeof body.question === "string"
        ? body.question.slice(0, 1500)
        : "";

    if (!rawContext) {
      return NextResponse.json(
        { error: "Scout needs a Grace Field snapshot." },
        { status: 400 }
      );
    }

    let parsed: any;

    try {
      parsed = JSON.parse(rawContext);
    } catch {
      parsed = null;
    }

    const lat = Number(parsed?.location?.latitude);
    const lng = Number(parsed?.location?.longitude);

    const validGPS =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    const [intelligence, waterways] = await Promise.all([
      buildFieldIntelligence(rawContext),
      validGPS
        ? nearbyWaterways(lat, lng)
        : Promise.resolve([]),
    ]);

    const mode = parsed?.mode === "fish" ? "fish" : "hunt";

    const system = `
You are Grace, the user's familiar, witty Boston-style
assistant. Keep your personality and occasional colorful
language, but never sacrifice factual accuracy.

You are answering a fresh GRACE FIELD SCOUT request.
This is NOT a continuation of an old fishing conversation.

${intelligence}

OPENSTREETMAP WATER FEATURES WITHIN APPROXIMATELY
1.5 KM OF THE SUPPLIED GPS POINT:
${JSON.stringify(waterways)}

IMPORTANT:
These are mapped features from OpenStreetMap.
They have not been independently inspected.
Their presence in a nearby search does not mean
the user is standing beside them.
The list does not establish fishing access,
stocking, water temperature, species, or legality.
If empty, say nearby water features were not confirmed.

NEVER invent:
- County, state, city, river, or lake names.
- Fish populations or stocking schedules.
- Hunting seasons, legal boundaries, or regulations.
- Current weather measurements.
- Wildlife sightings or underwater structure.

Use the verified county from the scouting intelligence,
not a guess based on coordinates.

For fishing:
Explain the best practical approach given actual conditions.
Use wind, temperature, time, and saved observations
when available.
Give conditional tactics for current, cover,
depth, and presentation without inventing structure.

For hunting:
Use verified wind, observations, access constraints,
and seasonal considerations when available.
Do not invent deer trails, ridges, or bedding areas.

ANSWER FORMAT:
- Start with your strongest useful recommendation.
- Give 2 to 4 practical observations or next moves.
- Identify only the most important missing fact.
- Keep it around 100 to 180 words.
- Plain text only. No ** or Markdown headings.
- No generic lectures about buying equipment,
  checking with locals, or bringing supplies.
- Don't say "verified" unless a named data source
  actually supplied the claim.
- Don't reuse old scouting answers.
- Don't invent information to sound knowledgeable.
`;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Scout service is not configured." },
        { status: 503 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.35,
          max_tokens: 450,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content:
                question ||
                `Scout this ${mode} location. Give me
                your best actionable recommendation.`,
            },
          ],
        }),
        signal: AbortSignal.timeout(35000),
      }
    );

    if (!response.ok) {
      console.error(
        "Scout model request failed:",
        response.status
      );

      return NextResponse.json(
        { error: "Scout analysis is temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        { error: "Scout returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply: reply.replace(/\*\*/g, "").trim(),
      scoutVersion: "field-brain-v2",
      gpsAvailable: validGPS,
      mappedWaterFeatures: waterways.length,
    });
  } catch (error) {
    console.error("Grace Field Scout:", error);

    return NextResponse.json(
      { error: "Scout could not complete this request." },
      { status: 500 }
    );
  }
}
