export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || !String(query).trim()) {
      return Response.json(
        { reply: "Give Grace a sport, matchup, fight, race, or market to analyze." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Grace sports research is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json(
        { reply: "Grace sports research is missing TAVILY_API_KEY." },
        { status: 500 }
      );
    }

    const userQuery = String(query).trim();
    const clean = userQuery.toLowerCase();

    const now = new Date();

    const easternDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const wantsLive =
      clean.includes("live") ||
      clean.includes("right now") ||
      clean.includes("in game") ||
      clean.includes("in-game");

    // -------------------------------------------------------
    // STEP 9 BASELINE
    // Use the structured statistical engine where it applies.
    // If it cannot handle the sport, Step 10 web research still can.
    // -------------------------------------------------------

    let baselineAnalysis = "";

    try {
      const origin = new URL(req.url).origin;

      const baselineRes = await fetch(
        `${origin}/api/sports-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: userQuery,
          }),
          cache: "no-store",
        }
      );

      if (baselineRes.ok) {
        const baselineData = await baselineRes.json();
        baselineAnalysis =
          baselineData?.reply || "";
      }
    } catch {
      // Universal research can still operate without Step 9 baseline.
    }

    // -------------------------------------------------------
    // GRACE CREATES SPORT-SPECIFIC RESEARCH QUERIES
    // -------------------------------------------------------

    const researchPlanner = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + process.env.OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ||
            "gpt-4o-mini",
          temperature: 0,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `
You create web research queries for Grace's sports prediction engine.

Today's date is ${easternDate}.

The user may ask about ANY competitive sport or event:
NFL, college football, MLB, NBA, WNBA, NHL, soccer, tennis,
UFC/MMA, boxing, golf, NASCAR, Formula 1, horse racing,
cricket, rugby, esports, or an obscure competition.

Return ONLY valid JSON in this format:

{
  "sport": "identified sport or event type",
  "event": "identified matchup/event if possible",
  "queries": [
    "query 1",
    "query 2",
    "query 3"
  ]
}

Create exactly 3 strong research queries.

Query 1:
Find the actual event/slate and official/current participation information.

Query 2:
Find personnel/news information:
injuries, availability, lineup, starters, practice,
depth chart, suspensions, transactions, weigh-ins,
coach/player comments, press conferences, or the closest
sport-specific equivalent.

Query 3:
Find analytical evidence:
recent form, opponent quality, matchup statistics,
splits, surface/course/track/weather, travel/rest,
starting pitcher/goalie/QB information, style matchup,
or whatever genuinely matters for that sport.

Use current date/context.
Do not search for live scores for a PREGAME request.
Do not manufacture an event.
              `.trim(),
            },
            {
              role: "user",
              content: userQuery,
            },
          ],
        }),
      }
    );

    const plannerData =
      await researchPlanner.json();

    let plan: any = {
      sport: "unknown",
      event: "",
      queries: [
        `${userQuery} ${easternDate}`,
        `${userQuery} injuries lineup news ${easternDate}`,
        `${userQuery} stats preview recent form ${easternDate}`,
      ],
    };

    try {
      const raw =
        plannerData?.choices?.[0]?.message?.content
          ?.replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      const parsed = JSON.parse(raw);

      if (
        parsed &&
        Array.isArray(parsed.queries)
      ) {
        plan = parsed;
      }
    } catch {}

    const searchQueries = (
      Array.isArray(plan?.queries)
        ? plan.queries
        : []
    )
      .filter(Boolean)
      .slice(0, 3);

    // -------------------------------------------------------
    // SEARCH PUBLIC WEB FROM MULTIPLE ANGLES
    // -------------------------------------------------------

    async function tavilySearch(
      searchQuery: string
    ) {
      try {
        const res = await fetch(
          "https://api.tavily.com/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key:
                process.env.TAVILY_API_KEY,
              query: searchQuery,
              search_depth: "advanced",
              max_results: 7,
              include_answer: false,
              include_raw_content: false,
            }),
            cache: "no-store",
          }
        );

        if (!res.ok) return [];

        const data = await res.json();

        return Array.isArray(data?.results)
          ? data.results
          : [];
      } catch {
        return [];
      }
    }

    const searchSets =
      await Promise.all(
        searchQueries.map(tavilySearch)
      );

    const seen = new Set<string>();
    const researchResults: any[] = [];

    for (const resultSet of searchSets) {
      for (const result of resultSet) {
        const url =
          String(result?.url || "");

        if (!url || seen.has(url)) continue;

        seen.add(url);

        let sourceWeight = "secondary";

        const lowerUrl =
          url.toLowerCase();

        if (
          lowerUrl.includes("nfl.com") ||
          lowerUrl.includes("mlb.com") ||
          lowerUrl.includes("nba.com") ||
          lowerUrl.includes("wnba.com") ||
          lowerUrl.includes("nhl.com") ||
          lowerUrl.includes("ufc.com") ||
          lowerUrl.includes("formula1.com") ||
          lowerUrl.includes("nascar.com") ||
          lowerUrl.includes("pgatour.com") ||
          lowerUrl.includes("atptour.com") ||
          lowerUrl.includes("wtatennis.com") ||
          lowerUrl.includes("fia.com")
        ) {
          sourceWeight = "official";
        }

        researchResults.push({
          title:
            result?.title || "",
          url,
          summary:
            result?.content || "",
          score:
            result?.score ?? null,
          sourceWeight,
        });

        if (researchResults.length >= 18)
          break;
      }

      if (researchResults.length >= 18)
        break;
    }

    // -------------------------------------------------------
    // FINAL CROSS-CHECK + PREDICTION BRAIN
    // -------------------------------------------------------

    const finalRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            "Bearer " +
            process.env.OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ||
            "gpt-4o-mini",
          temperature: 0.12,
          max_tokens: 1300,
          messages: [
            {
              role: "system",
              content: `
You are Grace's universal sports research and prediction brain.

Current date:
${easternDate}

REQUEST MODE:
${wantsLive ? "LIVE" : "PREGAME"}

Your job is NOT to force a prediction.

Your job is to investigate the event from every useful PUBLIC and LEGAL angle,
cross-check the evidence, then decide:

1. STRONG PLAY
2. LEAN
3. PASS / I WOULDN'T TOUCH IT

You may analyze ANY sport or competitive event.

SOURCE PRIORITY:
1. Official league/team/player/event/governing-body information
2. Credible established sports reporting
3. Credible local/beat reporting
4. Statistical/analytical reporting
5. Lower-confidence discussion only as supporting context

Never treat rumor as fact.

PREGAME FIREWALL:
- Never use an in-progress score to create a pregame prediction.
- Never recommend an event that has already started unless the request is LIVE.
- If research snippets contain a current score during a PREGAME request,
  ignore that score completely.
- A team already winning is NOT evidence for a pregame pick.

CROSS-CHECK RULE:
Important claims should ideally be supported by more than one credible source.
When sources conflict, lower confidence.
Fresh information beats stale information.

SPORT-SPECIFIC THINKING:

FOOTBALL:
QB, offensive line, defensive front, injuries, practice participation,
secondary, coaching, scheme matchup, travel, rest, weather,
home/away, opponent strength and personnel changes.

BASEBALL:
starting pitcher, handedness, pitcher form, bullpen workload,
lineups, injuries, platoon splits, offense form, park,
weather, travel and rest.

BASKETBALL:
availability, starting lineup, minutes, usage, pace,
offensive/defensive matchup, back-to-backs, travel,
rest and lineup changes.

HOCKEY:
starting goalie, goalie form, injuries, special teams,
travel/rest, home/away and recent performance.

SOCCER:
starting XI/rotations, injuries/suspensions,
recent form, xG-quality evidence when available,
travel/rest, competition importance and tactical matchup.

TENNIS:
surface, recent form, serve/return performance,
fitness, fatigue, head-to-head relevance,
travel and tournament conditions.

MMA / BOXING:
style matchup, recent fights, age, reach/size,
camp information, weigh-in, injuries when credible,
layoff, cardio, wrestling/striking/grappling matchup,
opponent quality.

RACING:
qualifying, practice speed, track history,
equipment/team performance, starting position,
weather and track conditions.

GOLF:
course fit, recent form, strokes-gained style evidence
when available, weather, injury and course history.

OTHER SPORTS:
Identify the factors that actually drive performance in that sport.
Do not pretend unfamiliar factors are known.

CONFIDENCE:
Confidence must be earned.

9-10:
Extremely rare. Multiple strong independent signals.

8-8.9:
Strong evidence and limited meaningful contradictions.

7-7.9:
Useful edge but real uncertainty remains.

6-6.9:
Lean only.

Below 6:
Usually PASS.

Do not inflate confidence just because the user asked for a pick.

If the available evidence is weak, contradictory, stale,
or the market/event is too volatile:
say plainly that you would not bet it.

Do not invent statistics.
Do not invent injuries.
Do not invent lineup changes.
Do not invent coach comments.
Do not invent odds.

Do not claim access to private locker rooms,
private communications, private medical information,
or nonpublic game plans.

Do NOT dump URLs or source names into the answer unless asked.

Keep the final answer useful and fairly concise:
- Pick / Lean / PASS
- Confidence
- 2-5 reasons that actually drove the decision
- Biggest risk or reason to stay away
              `.trim(),
            },
            {
              role: "user",
              content: `
USER REQUEST:
${userQuery}

SPORT IDENTIFIED:
${plan?.sport || "unknown"}

EVENT IDENTIFIED:
${plan?.event || "unknown"}

STEP 9 STRUCTURED BASELINE:
${baselineAnalysis || "No usable structured baseline available."}

PUBLIC WEB RESEARCH:
${JSON.stringify(researchResults)}

Cross-check everything.

For a PREGAME request:
ignore any live/in-progress scores contained in the research snippets.

If the requested event has already started and this is not a LIVE request,
do not make a pregame recommendation for it.

If enough legitimate evidence exists, give the strongest evidence-based answer.
If it does not, PASS.

Answer as Grace.
              `.trim(),
            },
          ],
        }),
      }
    );

    const finalData =
      await finalRes.json();

    const reply =
      finalData?.choices?.[0]?.message?.content?.trim() ||
      "I dug into it, but I don't have enough trustworthy evidence to make a solid call. I'd pass.";

    return Response.json({
      reply,
      sport: plan?.sport || "",
      event: plan?.event || "",
      researchCount:
        researchResults.length,
    });
  } catch (error: any) {
    return Response.json(
      {
        reply:
          "Grace sports research hit a glitch: " +
          (error?.message ||
            "Unknown error"),
      },
      { status: 500 }
    );
  }
}
