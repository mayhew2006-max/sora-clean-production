export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || !String(query).trim()) {
      return Response.json(
        { reply: "Give Grace something to analyze first." },
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

    const crossSportRequest =
      clean.includes("any sport") ||
      clean.includes("all sports") ||
      clean.includes("every sport") ||
      clean.includes("across sports") ||
      clean.includes("scan everything") ||
      clean.includes("scan the board") ||
      clean.includes("whole board") ||
      clean.includes("strongest prediction") ||
      clean.includes("strongest play") ||
      clean.includes("best play today") ||
      clean.includes("best bet today") ||
      clean.includes("anything worth betting") ||
      clean.includes("anything look good");

    const dailyReportRequest =
      crossSportRequest ||
      clean.includes("daily sports report") ||
      clean.includes("sports report today") ||
      clean.includes("today's sports report") ||
      clean.includes("todays sports report");

    // -------------------------------------------------------
    // STEP 9 STRUCTURED BASELINE
    // Only use this when the request identifies a sport.
    // Cross-sport requests must NOT silently default to NFL.
    // -------------------------------------------------------

    let baselineAnalysis = "";

    if (!crossSportRequest) {
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
          baselineAnalysis = baselineData?.reply || "";
        }
      } catch {
        // Web research remains usable without Step 9.
      }
    } else {
      baselineAnalysis =
        "Cross-sport request. Do not default to NFL or any single sport.";
    }

    // -------------------------------------------------------
    // BUILD RESEARCH QUERIES
    // -------------------------------------------------------

    let sportLabel = "unknown";
    let eventLabel = "";
    let searchQueries: string[] = [];

    if (crossSportRequest || dailyReportRequest) {
      sportLabel = "CROSS-SPORT";
      eventLabel = "Today's remaining sports board";

      searchQueries = [
        `${easternDate} MLB games remaining today probable pitchers starting lineups injuries bullpen odds moneyline run line totals player props`,
        `${easternDate} NFL college football remaining games today injuries starters practice reports depth charts weather odds spreads totals player props`,
        `${easternDate} soccer matches remaining today predicted lineups injuries suspensions form odds totals player props`,
        `${easternDate} ATP WTA tennis matches remaining today injuries surface form serve return statistics odds totals props`,
        `${easternDate} UFC MMA boxing fights today weigh ins injuries fight card style matchup odds method of victory rounds`,
        `${easternDate} NASCAR Formula 1 motorsports today qualifying practice speed weather starting grid odds props`,
        `${easternDate} golf tournament today course fit form weather strokes gained odds matchups`,
        `${easternDate} cricket rugby horse racing esports other sports today remaining events form injuries odds predictions`,
      ];
    } else {
      const plannerRes = await fetch(
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
              process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0,
            max_tokens: 650,
            messages: [
              {
                role: "system",
                content: `
You create research queries for Grace's sports prediction engine.

Today is ${easternDate}.

The user may ask about ANY sport or betting market.

Return ONLY JSON:

{
  "sport": "sport",
  "event": "event or matchup if known",
  "queries": [
    "query 1",
    "query 2",
    "query 3",
    "query 4"
  ]
}

Create exactly 4 queries.

QUERY 1 — EVENT / MARKET:
Find the actual upcoming event and available public odds/lines/markets.

QUERY 2 — PERSONNEL:
Find injuries, availability, starting lineup, probable starters,
practice participation, depth chart, suspensions, transactions,
weigh-ins, scratches, starting goalie/pitcher/QB, or equivalent.

QUERY 3 — PERFORMANCE:
Find current form, opponent quality, matchup statistics,
splits, advanced stats, recent performance and relevant history.

QUERY 4 — SITUATION:
Find weather, travel, rest, schedule spot, coaching comments,
press conferences, credible beat reporting, course/track/surface,
bullpen workload, tactical/style matchup, or equivalent.

For PREGAME requests, focus on events that have NOT started.

Do not invent an event.
Do not invent a line.
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

      const plannerData = await plannerRes.json();

      try {
        const raw =
          plannerData?.choices?.[0]?.message?.content
            ?.replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(raw);

        sportLabel = parsed?.sport || "unknown";
        eventLabel = parsed?.event || "";

        if (Array.isArray(parsed?.queries)) {
          searchQueries = parsed.queries
            .filter(Boolean)
            .slice(0, 4);
        }
      } catch {}

      if (!searchQueries.length) {
        searchQueries = [
          `${userQuery} ${easternDate} upcoming event odds`,
          `${userQuery} injuries starters lineup ${easternDate}`,
          `${userQuery} stats recent form matchup ${easternDate}`,
          `${userQuery} weather news coach comments ${easternDate}`,
        ];
      }
    }

    // -------------------------------------------------------
    // PUBLIC WEB RESEARCH
    // -------------------------------------------------------

    async function tavilySearch(searchQuery: string) {
      try {
        const res = await fetch(
          "https://api.tavily.com/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query: searchQuery,
              search_depth: "advanced",
              max_results:
                crossSportRequest || dailyReportRequest ? 6 : 8,
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

    const searchSets = await Promise.all(
      searchQueries.map(tavilySearch)
    );

    const seen = new Set<string>();
    const researchResults: any[] = [];

    function classifySource(url: string) {
      const lower = url.toLowerCase();

      const officialDomains = [
        "nfl.com",
        "mlb.com",
        "nba.com",
        "wnba.com",
        "nhl.com",
        "ncaa.com",
        "ufc.com",
        "atptour.com",
        "wtatennis.com",
        "pgatour.com",
        "nascar.com",
        "formula1.com",
        "fia.com",
        "fifa.com",
        "uefa.com",
        "premierleague.com",
        "mlssoccer.com",
      ];

      if (officialDomains.some((d) => lower.includes(d))) {
        return "official";
      }

      return "secondary";
    }

    const maxResearch =
      crossSportRequest || dailyReportRequest ? 40 : 24;

    for (const resultSet of searchSets) {
      for (const result of resultSet) {
        const url = String(result?.url || "");

        if (!url || seen.has(url)) continue;

        seen.add(url);

        researchResults.push({
          title: String(result?.title || "").slice(0, 220),
          url,
          summary: String(result?.content || "").slice(0, 750),
          score: result?.score ?? null,
          sourceWeight: classifySource(url),
        });

        if (researchResults.length >= maxResearch) break;
      }

      if (researchResults.length >= maxResearch) break;
    }

    // -------------------------------------------------------
    // FINAL UNIVERSAL SPORTS BRAIN
    // -------------------------------------------------------

    const finalRes = await fetch(
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
            process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.1,
          max_tokens:
            dailyReportRequest ? 2200 : 1500,
          messages: [
            {
              role: "system",
              content: `
You are Grace's universal sports research, market analysis,
and prediction engine.

DATE:
${easternDate}

MODE:
${wantsLive ? "LIVE" : "PREGAME"}

RESEARCH MODE:
${
  crossSportRequest || dailyReportRequest
    ? "TRUE CROSS-SPORT BOARD SCAN"
    : "SPORT / EVENT SPECIFIC"
}

Your goal is NOT to force action.

Your goal is to find the strongest evidence-based opportunities
and reject weak ones.

==================================================
MARKETS YOU MAY ANALYZE
==================================================

GAME / EVENT:
- moneyline
- spread
- run line
- puck line
- over / under
- team totals
- alternate lines
- first half
- first quarter
- first period
- first 5 innings
- draw no bet
- double chance
- race / fight / tournament winner
- placement / podium / top finish markets

PLAYER / INDIVIDUAL:
- hits
- home runs
- total bases
- pitcher strikeouts
- earned runs / outs when available
- points
- rebounds
- assists
- PRA
- threes
- passing
- rushing
- receiving
- touchdowns
- shots
- saves
- goals
- tennis games / sets / aces
- fight method / rounds
- racing placement
- golf matchups
- any legitimate publicly documented market

COMBINATIONS:
- strongest single play
- best 2-leg
- best 3-leg
- larger long-shot cards when requested

Avoid unnecessary correlation.
Do not reuse the same participant repeatedly unless the user asks.

==================================================
NO-INVENTION RULE
==================================================

Never invent:
- odds
- sportsbook lines
- prop numbers
- injuries
- lineups
- statistics
- coach comments
- weather
- starters
- current scores

If the exact line is not available publicly and the user did not provide it,
you may identify the SIDE or MARKET worth watching,
but do not make up a number.

==================================================
PREGAME FIREWALL
==================================================

For PREGAME requests:

- Do not use an in-progress score as prediction evidence.
- Do not recommend an event that has already started.
- Ignore live scores accidentally appearing in snippets.
- Determine that an event is still upcoming before recommending it.

LIVE requests may use current score/game state.

==================================================
CROSS-SPORT RULE
==================================================

For TRUE CROSS-SPORT BOARD SCAN:

You MUST consider evidence from multiple sports/categories.

Do not default to NFL.
Do not default to MLB.
Do not stop after finding the first recognizable event.

Compare legitimate candidates across:
- baseball
- football
- basketball
- hockey
- soccer
- tennis
- combat sports
- racing / motorsports
- golf
- other discoverable events

Only compare actual events supported by research.

If a category has no trustworthy event/data today,
skip it instead of inventing one.

==================================================
SOURCE WEIGHT
==================================================

Highest weight:
official league/team/player/event information.

Then:
credible established sports reporting.

Then:
credible local/beat reporting.

Then:
reputable statistical/analytical reporting.

Rumor is not fact.

Fresh information outweighs stale information.

Conflicting information lowers confidence.

==================================================
SPORT-SPECIFIC FACTORS
==================================================

BASEBALL:
starting pitcher, handedness, pitcher form,
lineup, injuries, bullpen workload, platoon splits,
offensive form, park, weather, travel/rest.

FOOTBALL:
QB, OL, defensive front, secondary,
injuries, practice participation, scheme matchup,
coaching, personnel changes, weather, travel/rest.

BASKETBALL:
availability, starters, minutes, usage,
pace, offensive/defensive matchup,
back-to-back/rest/travel.

HOCKEY:
starting goalie, goalie form, special teams,
injuries, travel/rest and matchup.

SOCCER:
starting XI, rotations, injuries/suspensions,
form, tactical matchup, xG-quality evidence,
travel/rest and competition importance.

TENNIS:
surface, serve/return quality, current form,
fitness, fatigue, travel, opponent style.

MMA / BOXING:
style matchup, wrestling/grappling/striking,
reach/size, cardio, age, layoff,
camp/weigh-in information and opponent quality.

MOTORSPORT:
qualifying, practice speed, equipment/team,
starting position, track fit, weather.

GOLF:
course fit, recent form, strokes-gained evidence,
weather, injury, course history.

OTHER SPORTS:
identify the real performance drivers for that sport.

==================================================
CONFIDENCE
==================================================

9.0-10:
Exceptionally rare.

8.0-8.9:
Strong play with several independent signals.

7.0-7.9:
Good evidence but meaningful uncertainty remains.

6.0-6.9:
Lean only.

Below 6:
PASS.

A confidence score is NOT win probability.
Never call anything guaranteed.

==================================================
DAILY REPORT MODE
==================================================

${
  dailyReportRequest
    ? `
Create a compact DAILY BOARD report.

Use this format:

BEST OVERALL
- strongest legitimate play

STRONG PLAYS
- up to 5 if they actually qualify

BEST PLAYER / INDIVIDUAL MARKETS
- up to 5 supported props or individual markets

BEST 2-LEG
- only if two independent strong plays exist

LEANS
- useful but weaker opportunities

PASSES / TRAPS
- major games or markets that look tempting but lack evidence

For every recommended play include:
Sport
Event
Market
Pick
Confidence
2-4 strongest reasons
Biggest risk

Do NOT fill sections just to fill them.
`
    : `
Answer the user's request directly.

Use:
Pick / Lean / PASS
Market
Confidence
2-5 strongest reasons
Biggest risk
`
}

Do not dump URLs or source names unless asked.

Be concise, direct and practical.
              `.trim(),
            },
            {
              role: "user",
              content: `
USER REQUEST:
${userQuery}

SPORT:
${sportLabel}

EVENT:
${eventLabel}

STEP 9 STRUCTURED BASELINE:
${baselineAnalysis || "No structured baseline available."}

PUBLIC RESEARCH:
${JSON.stringify(researchResults)}

Cross-check the evidence.

If a requested market line is unavailable, do not invent it.

If there is no meaningful edge:
PASS.

Answer as Grace.
              `.trim(),
            },
          ],
        }),
      }
    );

    const finalData = await finalRes.json();

    const reply =
      finalData?.choices?.[0]?.message?.content?.trim() ||
      "I dug through the board, but I don't have enough trustworthy evidence for a play. I'd pass.";

    return Response.json({
      reply,
      mode:
        crossSportRequest || dailyReportRequest
          ? "cross-sport"
          : "specific",
      sport: sportLabel,
      event: eventLabel,
      researchCount: researchResults.length,
    });
  } catch (error: any) {
    return Response.json(
      {
        reply:
          "Grace sports research hit a glitch: " +
          (error?.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
