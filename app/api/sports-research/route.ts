export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = body?.query;

    const screenshotImages = Array.isArray(body?.images)
      ? body.images
          .filter(
            (image: unknown) =>
              typeof image === "string" &&
              image.startsWith("data:image/")
          )
          .slice(0, 4)
      : [];

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

    // GRACE_SCREENSHOT_READ_V1
    // Read user-provided sportsbook/web screenshots before research.
    let screenshotContext = "";
    let screenshotItems: any[] = [];

    if (screenshotImages.length > 0) {
      try {
        const visionRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer " + process.env.OPENAI_API_KEY,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0,
              max_tokens: 1600,
              response_format: {
                type: "json_object",
              },
              messages: [
                {
                  role: "system",
                  content: `
You read sports and sportsbook screenshots for Grace.

Extract only what is visibly present.

Return JSON:

{
  "summary": "brief description of the board",
  "items": [
    {
      "sport": "",
      "event": "",
      "player": "",
      "team": "",
      "market": "",
      "selection": "",
      "line": "",
      "odds": ""
    }
  ]
}

Rules:
- Read players, teams, matchups, markets, More/Less, Over/Under,
  spreads, moneylines, totals, props and visible lines.
- Preserve exact visible numbers.
- Preserve exact visible player/team names.
- Do not invent an opponent.
- Do not invent a line.
- Do not invent odds.
- If text is unreadable, leave that field blank.
- Include up to 40 clearly readable items.
                  `.trim(),
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text:
                        "Read these user-provided sports screenshots carefully.",
                    },
                    ...screenshotImages.map((image: string) => ({
                      type: "image_url",
                      image_url: {
                        url: image,
                        detail: "high",
                      },
                    })),
                  ],
                },
              ],
            }),
          }
        );

        if (visionRes.ok) {
          const visionData = await visionRes.json();

          const raw =
            visionData?.choices?.[0]?.message?.content
              ?.replace(/```json/gi, "")
              .replace(/```/g, "")
              .trim();

          if (raw) {
            const parsed = JSON.parse(raw);

            const items = Array.isArray(parsed?.items)
              ? parsed.items.slice(0, 40)
              : [];

            screenshotItems = items;

            const itemText = items
              .map((item: any, index: number) => {
                return [
                  `${index + 1}.`,
                  item?.sport ? `Sport=${item.sport}` : "",
                  item?.event ? `Event=${item.event}` : "",
                  item?.player ? `Player=${item.player}` : "",
                  item?.team ? `Team=${item.team}` : "",
                  item?.market ? `Market=${item.market}` : "",
                  item?.selection
                    ? `Selection=${item.selection}`
                    : "",
                  item?.line ? `Line=${item.line}` : "",
                  item?.odds ? `Odds=${item.odds}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
              })
              .filter(Boolean)
              .join("\n");

            screenshotContext = [
              "USER-PROVIDED SCREENSHOT DATA:",
              typeof parsed?.summary === "string"
                ? parsed.summary
                : "",
              itemText,
            ]
              .filter(Boolean)
              .join("\n");
          }
        }
      } catch (error) {
        console.error(
          "Grace screenshot reading failed:",
          error
        );
      }
    }

    const researchUserQuery = screenshotContext
      ? `${userQuery}

${screenshotContext}`
      : userQuery;

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

    const screenshotBoardRequest =
      screenshotImages.length > 0;

    // Only require multiple sports when the user ACTUALLY asks
    // Grace to search across multiple sports.
    const explicitCrossSportRequest =
      clean.includes("any sport") ||
      clean.includes("all sports") ||
      clean.includes("every sport") ||
      clean.includes("across sports") ||
      clean.includes("across all sports") ||
      clean.includes("scan every sport");

    // Phrases such as "anything look good here?" refer to the
    // supplied screenshots when screenshots are attached.
    const generalBoardScanRequest =
      clean.includes("scan everything") ||
      clean.includes("scan the board") ||
      clean.includes("whole board") ||
      clean.includes("strongest prediction") ||
      clean.includes("strongest play") ||
      clean.includes("best play today") ||
      clean.includes("best bet today") ||
      clean.includes("anything worth betting") ||
      clean.includes("anything look good");

    const crossSportRequest =
      explicitCrossSportRequest ||
      (!screenshotBoardRequest && generalBoardScanRequest);

    const dailyReportRequest =
      crossSportRequest ||
      (!screenshotBoardRequest &&
        (
          clean.includes("daily sports report") ||
          clean.includes("sports report today") ||
          clean.includes("today's sports report") ||
          clean.includes("todays sports report")
        ));

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
              query: researchUserQuery,
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
                content: researchUserQuery,
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
          `${researchUserQuery} ${easternDate} upcoming event odds`,
          `${researchUserQuery} injuries starters lineup ${easternDate}`,
          `${researchUserQuery} stats recent form matchup ${easternDate}`,
          `${researchUserQuery} weather news coach comments ${easternDate}`,
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
    // CANDIDATE EXTRACTION
    // -------------------------------------------------------

    const candidateExtractorRes = await fetch(
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
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content: `
You extract possible sports betting candidates from public research.

Today is ${easternDate}.

Return ONLY valid JSON:

{
  "candidates": [
    {
      "sport": "",
      "event": "",
      "market": "",
      "selection": "",
      "line": ""
    }
  ]
}

RULES:
- Extract only actual named events/matchups/fights/races/matches found in research.
- Extract a market only if research suggests one.
- Extract an exact line only if it is actually present.
- Do not invent odds.
- Do not invent prop numbers.
- Do not invent events.
- Include up to 12 useful candidates across different sports/markets.
- Prefer candidates that appear relevant to TODAY.
              `.trim(),
            },
            {
              role: "user",
              content: JSON.stringify(researchResults),
            },
          ],
        }),
      }
    );

    const candidateExtractorData =
      await candidateExtractorRes.json();

    let extractedCandidates: any[] = [];

    try {
      const rawCandidates =
        candidateExtractorData?.choices?.[0]?.message?.content
          ?.replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      const parsedCandidates =
        JSON.parse(rawCandidates);

      if (Array.isArray(parsedCandidates?.candidates)) {
        extractedCandidates =
          parsedCandidates.candidates.slice(0, 12);
      }
    } catch {}

    // -------------------------------------------------------
    // SCREENSHOT CANDIDATE AUTHORITY
    //
    // When the user supplies a betting board, the screenshot
    // is the candidate list. Web research verifies those
    // candidates; it does NOT create replacement candidates.
    // -------------------------------------------------------

    if (screenshotBoardRequest && screenshotItems.length > 0) {
      extractedCandidates = screenshotItems
        .map((item: any) => ({
          source: "screenshot",
          sport: String(item?.sport || "").trim(),
          event: String(item?.event || "").trim(),
          player: String(item?.player || "").trim(),
          team: String(item?.team || "").trim(),
          market: String(item?.market || "").trim(),
          selection: String(item?.selection || "").trim(),
          line: String(item?.line || "").trim(),
          odds: String(item?.odds || "").trim(),
        }))
        .filter(
          (candidate: any) =>
            candidate.player ||
            candidate.team ||
            candidate.event
        )
        .slice(0, 12);
    }

    // -------------------------------------------------------
    // INDEPENDENT TARGETED VERIFICATION SEARCH
    // -------------------------------------------------------

    async function targetedSearch(searchQuery: string) {
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
              max_results: 5,
              include_answer: false,
              include_raw_content: false,
            }),
            cache: "no-store",
          }
        );

        if (!res.ok) return [];

        const data = await res.json();

        return Array.isArray(data?.results)
          ? data.results.map((r: any) => ({
              title: String(r?.title || "").slice(0, 220),
              url: String(r?.url || ""),
              summary: String(r?.content || "").slice(0, 900),
              score: r?.score ?? null,
              sourceWeight: classifySource(String(r?.url || "")),
            }))
          : [];
      } catch {
        return [];
      }
    }

    const verificationPackets = await Promise.all(
      extractedCandidates.map(async (candidate: any) => {
        const sport =
          String(candidate?.sport || "").trim();

        const player =
          String(candidate?.player || "").trim();

        const team =
          String(candidate?.team || "").trim();

        const event =
          String(candidate?.event || "").trim();

        const market =
          String(candidate?.market || "").trim();

        const selection =
          String(candidate?.selection || "").trim();

        const line =
          String(candidate?.line || "").trim();

        if (!event && !player && !team) {
          return {
            candidate,
            identityResults: [],
            eventResults: [],
            marketResults: [],
          };
        }

        const identitySubject =
          player || team || event;

        // CRITICAL:
        // Do NOT include the screenshot team in this query as
        // assumed truth. We want independent current identity.
        const identityQuery =
          `"${identitySubject}" ${sport} ${easternDate} ` +
          `current team roster transaction opponent today ` +
          `schedule probable starter official`;

        const eventQuery = event
          ? `"${event}" ${easternDate} ${sport} ` +
            `schedule start time today official`
          : `"${identitySubject}" ${easternDate} ${sport} ` +
            `opponent today schedule start time official`;

        let marketQuery = [
          player ? `"${player}"` : "",
          team ? `"${team}"` : "",
          event ? `"${event}"` : "",
          market,
          selection,
          easternDate,
        ]
          .filter(Boolean)
          .join(" ");

        if (line) {
          marketQuery += ` "${line}"`;
        }

        marketQuery +=
          ` odds line market sportsbook`;

        // Deep statistical work stays behind the curtain.
        // This search is NOT used to identify the player/team.
        // Identity must still come from identityResults.
        const performanceSubject =
          player || team || event;

        const performanceQuery = [
          `"${performanceSubject}"`,
          sport,
          market,
          easternDate,
          "current season statistics",
          "season average",
          "recent game log",
          "last 5 games",
          "usage workload",
          "opponent matchup tendencies",
          "splits",
          "injury availability",
        ]
          .filter(Boolean)
          .join(" ");

        const [
          identityResults,
          eventResults,
          marketResults,
          performanceResults,
        ] = await Promise.all([
          targetedSearch(identityQuery),
          targetedSearch(eventQuery),
          targetedSearch(marketQuery),
          targetedSearch(performanceQuery),
        ]);

        return {
          candidate,
          identityResults,
          eventResults,
          marketResults,
          performanceResults,
        };
      })
    );

    // -------------------------------------------------------
    // HARD VERIFICATION GATE
    // -------------------------------------------------------

    const verifierRes = await fetch(
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
          max_tokens: 1800,
          messages: [
            {
              role: "system",
              content: `
You are Grace's HARD sports verification gate.

TODAY:
${easternDate}

MODE:
${wantsLive ? "LIVE" : "PREGAME"}

The discovery research has already happened.

You are now looking at NEW TARGETED searches made specifically
for each candidate.

Your job is verification only.

Return ONLY valid JSON:

{
  "verifiedFacts": [
    {
      "sport": "",
      "event": "",
      "eventType": "head_to_head|field",
      "participants": [],
      "player": "",
      "screenshotTeam": "",
      "currentTeam": "",
      "currentOpponentOrEvent": "",
      "identityVerified": true,
      "eventRelationshipVerified": true,
      "screenshotTeamMatchesCurrent": true,
      "eventVerified": true,
      "dateVerified": true,
      "pregameVerified": true,
      "markets": [
        {
          "market": "",
          "selection": "",
          "line": "",
          "marketVerified": true,
          "lineVerified": true
        }
      ],
      "facts": [
        ""
      ],
      "confidence": "high|medium|low"
    }
  ],
  "rejected": [
    {
      "claim": "",
      "reason": ""
    }
  ]
}

ABSOLUTE RULES:

EVENT VERIFICATION
- The exact event must be supported by the targeted search.
- Event names from stale articles are NOT enough.
- The event must actually match today's date for a TODAY request.
- Wrong date = reject.
- Old race = reject.
- Old fight = reject.
- Old match = reject.
- Old tournament = reject.

EVENT IDENTITY:
- Set eventType="head_to_head" for normal team-vs-team, player-vs-player,
  fighter-vs-fighter, tennis, baseball, football, basketball, hockey,
  soccer, combat, and similar direct matchups.
- Set eventType="field" only for races, golf tournaments, large-field events,
  or competitions where many participants compete simultaneously.
- For head_to_head events, participants MUST contain the two actual verified opponents.
- "Manchester City in UEFA Champions League" is NOT enough.
- "Carlos Alcaraz in ATP Tournament" is NOT enough.
- "MLB" is NOT an event.
- "NFL" is NOT an event.
- A league or tournament name without the actual matchup is not verified.
- If both opponents cannot be established, reject the candidate.

SELECTION IDENTITY:
- For a head_to_head winner prediction, the selected team/player/fighter
  must be one of the verified participants.
- Do not allow a selection that is not part of the verified event.

PLAYER IDENTITY / CURRENT TEAM — MANDATORY

- When a candidate contains a player, independently verify who that
  player is CURRENTLY playing for or competing with as of TODAY.
- Use identityResults. Do NOT use model memory.
- The screenshot team is a claim to CHECK, not assumed truth.
- Transactions and trades matter. If the player changed teams,
  use the CURRENT team, not the historical team.
- Verify that the player actually belongs in the CURRENT event
  being analyzed.
- For team sports, establish the player's current team and today's
  actual opponent.
- For individual sports, establish the player's actual current
  opponent/event.
- identityVerified=true ONLY when fresh targeted evidence supports
  the player's current identity.
- eventRelationshipVerified=true ONLY when fresh evidence supports
  that the player belongs in this exact current event.
- If the screenshot supplied a team:
  screenshotTeamMatchesCurrent=true ONLY when it agrees with the
  independently verified current team.
- A stale article connecting a player to an old team is NOT enough.
- If sources conflict and the conflict cannot be resolved:
  REJECT.
- Every verified player prop must include a fact in this form:
  "CURRENT IDENTITY: Player — Current Team — Current Opponent/Event"
  using only verified current evidence.

SCREENSHOT MARKET / LINE AUTHORITY

- When candidate.source="screenshot", the screenshot itself proves
  that the displayed market is available to THIS user.
- A clearly extracted screenshot market may set marketVerified=true.
- A clearly extracted and unambiguous screenshot number may set
  lineVerified=true.
- Do NOT require a public sportsbook webpage to independently show
  the exact same prop or exact same number.
- Sportsbooks personalize boards and lines move constantly.
- Public research is instead required to verify:
  player identity,
  current team,
  today's opponent/event,
  starter/availability status,
  current season performance,
  recent performance,
  matchup evidence,
  workload/usage,
  injuries,
  and other predictive facts.
- If the screenshot number is merged, unclear, duplicated or ambiguous,
  lineVerified=false and the play must not be recommended.
- Never repair, average or guess a malformed screenshot number.

PREGAME VERIFICATION
- In PREGAME mode, the event must still be upcoming.
- If targeted evidence says it started or finished, reject it.
- If you cannot establish that it is still upcoming, set pregameVerified=false.
- Never assume that because an article says "preview" the event has not started.

MARKET VERIFICATION
- Numeric markets and player props must be supported separately.
- Common sportsbook availability is NOT proof of an exact line.
- If the targeted market search does not establish a spread, total, alternate line,
  or player prop, marketVerified=false.
- For a simple winner prediction, an independently verified upcoming event may still
  support "X to win" even if no sportsbook price is verified.
- Do NOT invent moneyline odds for that winner prediction.

EXACT LINE VERIFICATION
- If candidate.source="screenshot", an unambiguous screenshot line
  is accepted as the user's current board line.
- If candidate.source is NOT "screenshot", exact numbers require
  independent targeted support.
- Never combine two nearby screenshot numbers.
- Never average numbers.
- Never infer a missing decimal.
- If the line is unclear or ambiguous:
  lineVerified=false
  line=""

PLAYER PROP RULE
- Verify player/team/event relationship.
- Verify the actual prop separately.
- Verify the EXACT numeric prop line separately.
- Player matchup evidence alone does NOT verify a betting line.
- "Player Strikeouts" by itself is not enough.
- For a screenshot candidate, the visible unambiguous screenshot
  line is sufficient evidence that the user has that line available.
- For a non-screenshot candidate, the exact numeric prop still
  requires independent current evidence.
- Player identity, current team/event relationship and supporting
  performance evidence ALWAYS require independent verification.

FACT RULE
- Facts must come directly from targeted evidence.
- Do not introduce facts from memory.
- Do not add general sports knowledge.
- Do not say someone is "in form" unless evidence supports it.
- Do not say someone was fastest in practice unless evidence supports it.
- Do not claim injuries without evidence.

PERFORMANCE EVIDENCE RULE
- performanceResults contain the predictive/statistical research.
- For player props, actively look for concrete facts relevant to the market:
  current-season average,
  current-season total/rate,
  recent game log,
  last-5 performance,
  attempts/targets/carries/innings/workload,
  opponent tendencies,
  handedness/splits,
  role,
  starter status,
  injury/availability,
  or another directly relevant current statistic.
- Add useful concrete supported details to facts[].
- Numbers must appear in the targeted evidence. Never calculate or invent
  a statistic that the evidence did not provide.
- Whenever the evidence supports it, include AT LEAST TWO distinct
  current facts relevant to the candidate.
- Do not count current team identity as one of the two predictive facts.
- Do not count reputation as a predictive fact.
- If fewer than two meaningful predictive facts can be established,
  confidence must not be high.

SOURCE RULE
- Official/current sources are strongest.
- Multiple independent fresh sources increase confidence.
- Conflicts reduce confidence.
- Old/stale content cannot verify today's event.

WHEN IN DOUBT:
REJECT.
              `.trim(),
            },
            {
              role: "user",
              content: `
ORIGINAL REQUEST:
${userQuery}

TARGETED VERIFICATION PACKETS:
${JSON.stringify(verificationPackets)}

Verify each candidate independently.
              `.trim(),
            },
          ],
        }),
      }
    );

    const verifierData =
      await verifierRes.json();

    let verification: any = {
      verifiedFacts: [],
      rejected: [],
    };

    try {
      const rawVerification =
        verifierData?.choices?.[0]?.message?.content
          ?.replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      const parsedVerification =
        JSON.parse(rawVerification);

      if (parsedVerification) {
        verification =
          parsedVerification;
      }
    } catch {}

    // -------------------------------------------------------
    // HARD CODE-LEVEL SANITIZER
    // The model cannot override these rules.
    // -------------------------------------------------------

    const numericMarketWords = [
      "spread",
      "run line",
      "puck line",
      "over",
      "under",
      "total",
      "team total",
      "strikeout",
      "strikeouts",
      "total bases",
      "hits",
      "home runs",
      "rebounds",
      "assists",
      "pra",
      "points",
      "threes",
      "passing",
      "rushing",
      "receiving",
      "touchdowns",
      "shots",
      "saves",
      "corners",
      "aces",
      "games",
      "sets",
      "rounds",
      "method",
      "placement",
      "podium",
      "top ",
    ];

    function requiresExactLine(market: string) {
      const cleanMarket = String(market || "").toLowerCase();

      return numericMarketWords.some((word) =>
        cleanMarket.includes(word)
      );
    }

    function isSimpleWinnerMarket(market: string) {
      const cleanMarket = String(market || "").toLowerCase();

      return (
        cleanMarket.includes("moneyline") ||
        cleanMarket.includes("money line") ||
        cleanMarket.includes("match winner") ||
        cleanMarket.includes("outright winner") ||
        cleanMarket === "winner" ||
        cleanMarket.includes("to win")
      );
    }

    const sanitizedVerifiedFacts: any[] = [];
    const sanitizerRejected: any[] = [];

    for (const fact of Array.isArray(verification?.verifiedFacts)
      ? verification.verifiedFacts
      : []) {

      const sport = String(fact?.sport || "").trim();
      const event = String(fact?.event || "").trim();
      const eventType = String(fact?.eventType || "").trim();
      const participants = Array.isArray(fact?.participants)
        ? fact.participants
            .map((p: any) => String(p || "").trim())
            .filter(Boolean)
        : [];

      const player =
        String(fact?.player || "").trim();

      const screenshotTeam =
        String(fact?.screenshotTeam || "").trim();

      const currentTeam =
        String(fact?.currentTeam || "").trim();

      const currentOpponentOrEvent =
        String(
          fact?.currentOpponentOrEvent || ""
        ).trim();

      const eventPass =
        fact?.eventVerified === true &&
        fact?.dateVerified === true &&
        (wantsLive || fact?.pregameVerified === true);

      if (!eventPass) {
        sanitizerRejected.push({
          claim: event || sport || "Unknown event",
          reason:
            "Failed hard event/date/pregame verification.",
        });
        continue;
      }

      // Player props cannot survive unless the current player/event
      // identity was independently established.
      if (player) {
        if (
          fact?.identityVerified !== true ||
          fact?.eventRelationshipVerified !== true
        ) {
          sanitizerRejected.push({
            claim:
              player +
              (event ? ` — ${event}` : ""),
            reason:
              "Player/current-event identity was not independently verified.",
          });
          continue;
        }

        if (
          screenshotTeam &&
          fact?.screenshotTeamMatchesCurrent !== true
        ) {
          sanitizerRejected.push({
            claim:
              `${player} — ${screenshotTeam}`,
            reason:
              "Screenshot team conflicts with the independently verified current team.",
          });
          continue;
        }

        if (
          !currentOpponentOrEvent
        ) {
          sanitizerRejected.push({
            claim: player,
            reason:
              "Current opponent/event was not established.",
          });
          continue;
        }
      }

      if (
        eventType === "head_to_head" &&
        participants.length < 2
      ) {
        sanitizerRejected.push({
          claim: event || sport || "Unknown matchup",
          reason:
            "Head-to-head event does not have two verified opponents.",
        });
        continue;
      }

      if (
        eventType !== "head_to_head" &&
        eventType !== "field"
      ) {
        sanitizerRejected.push({
          claim: event || sport || "Unknown event",
          reason:
            "Event type was not independently verified.",
        });
        continue;
      }

      const safeMarkets: any[] = [];

      for (const market of Array.isArray(fact?.markets)
        ? fact.markets
        : []) {

        const marketName =
          String(market?.market || "").trim();

        const selection =
          String(market?.selection || "").trim();

        const line =
          String(market?.line || "").trim();

        const marketVerified =
          market?.marketVerified === true;

        const lineVerified =
          market?.lineVerified === true;

        if (!marketName || !selection) {
          continue;
        }

        // Winner picks need a real verified participant
        // for head-to-head events.
        if (
          eventType === "head_to_head" &&
          isSimpleWinnerMarket(marketName)
        ) {
          const selectionMatchesParticipant =
            participants.some(
              (p: string) =>
                p.toLowerCase() ===
                selection.toLowerCase()
            );

          if (!selectionMatchesParticipant) {
            sanitizerRejected.push({
              claim: `${event} - ${selection}`,
              reason:
                "Winner selection is not one of the two verified participants.",
            });
            continue;
          }

          safeMarkets.push({
            market: marketName,
            selection,
            line:
              lineVerified && line
                ? line
                : "",
            marketVerified: true,
            lineVerified:
              Boolean(lineVerified && line),
          });

          continue;
        }

        // Numeric markets / props MUST have both
        // verified market and verified exact line.
        if (requiresExactLine(marketName)) {
          if (
            !marketVerified ||
            !lineVerified ||
            !line
          ) {
            sanitizerRejected.push({
              claim:
                `${event} - ${selection} ${marketName}`.trim(),
              reason:
                "Numeric market/prop did not have a verified exact current line.",
            });
            continue;
          }

          safeMarkets.push({
            market: marketName,
            selection,
            line,
            marketVerified: true,
            lineVerified: true,
          });

          continue;
        }

        // Anything else still needs a verified market.
        if (!marketVerified) {
          sanitizerRejected.push({
            claim:
              `${event} - ${selection} ${marketName}`.trim(),
            reason:
              "Market itself was not verified.",
          });
          continue;
        }

        safeMarkets.push({
          market: marketName,
          selection,
          line:
            lineVerified && line
              ? line
              : "",
          marketVerified: true,
          lineVerified:
            Boolean(lineVerified && line),
        });
      }

      // Keep the event even when no numeric prop survives,
      // because a verified winner market may still exist.
      if (safeMarkets.length === 0) {
        sanitizerRejected.push({
          claim: event,
          reason:
            "Event survived, but no betting market survived hard verification.",
        });
        continue;
      }

      sanitizedVerifiedFacts.push({
        sport,
        event,
        eventType,
        participants,
        eventVerified: true,
        dateVerified: true,
        pregameVerified:
          wantsLive ? fact?.pregameVerified : true,
        markets: safeMarkets,
        facts: Array.isArray(fact?.facts)
          ? fact.facts
              .map((f: any) => String(f || "").trim())
              .filter(Boolean)
              .slice(0, 8)
          : [],
        confidence: fact?.confidence || "low",
      });
    }

    const safeVerification = {
      verifiedFacts: sanitizedVerifiedFacts,
      rejected: [
        ...(Array.isArray(verification?.rejected)
          ? verification.rejected
          : []),
        ...sanitizerRejected,
      ],
    };

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
${researchUserQuery}

SPORT:
${sportLabel}

EVENT:
${eventLabel}

STEP 9 STRUCTURED BASELINE:
${baselineAnalysis || "No structured baseline available."}

USER-PROVIDED SCREENSHOT MARKET DATA:
${screenshotContext || "No screenshot market data supplied."}

SANITIZED VERIFIED WEB EVIDENCE:
${JSON.stringify(safeVerification)}

GRACE_PREMIUM_SPORTS_VOICE_V1

SPORTS RESPONSE STYLE:

Grace does the heavy analysis privately.
The user gets the conclusion, not the research paper.

For screenshot sports recommendations:

- Be short.
- Be confident only when evidence deserves confidence.
- Sound like a smart friend watching the game, not a sportsbook ad.
- Never sell the user with generic hype.
- Never dump the research process.
- One short reason per official pick.
- The short reason must contain at least ONE concrete current fact.
- Two concrete current facts are preferred for 5-star plays.
- No "known for", "key player", "important contributor",
  "favorable opportunity", "could have a big game", or similar filler.

PREFERRED FORMAT:

BEST 2
1. Player — Market/Line — MORE or LESS ⭐⭐⭐⭐⭐ | 9.1/10
   One short verified reason.

2. Player — Market/Line — MORE or LESS ⭐⭐⭐⭐ | 8.2/10
   One short verified reason.

If only one play truly qualifies:

BEST PLAY
Player — Market/Line — MORE or LESS ⭐⭐⭐⭐⭐ | 9.1/10
One short verified reason.

Do NOT force a second leg.

If nothing qualifies:

PASS
There's no fuckin way I'd force this board tonight. 😂

STAR CALIBRATION:
- 5 stars: 8.8-10.0 only
- 4 stars: 7.8-8.7
- 3 stars: 7.0-7.7
- Below 7.0: LEAN or PASS, not an official strong play.

Never inflate a rating just to produce a pick.

PERSONALITY:
- Grace may joke.
- Grace may talk a little shit.
- Grace may swear naturally when the user's tone/context supports it.
- Never force profanity on users who do not communicate that way.
- One personality line is enough. Do not turn the answer into a comedy routine.
- Example tone:
  "Skubal's a fuckin beast this year. I'm on the more. 😂"
- But ONLY say something like that after the current facts actually
  support the recommendation.

FUN FACT:
- Optional.
- Maximum one sentence.
- Must be verified CURRENT information.
- It must actually be interesting.
- Never use a historical reputation fact as current betting evidence.

ACCURACY ALWAYS COMES BEFORE PERSONALITY.

GRACE_SCREENSHOT_MARKET_EVIDENCE_V1

SCREENSHOT BOARD MODE:
- When one or more screenshots are attached, treat the screenshots as the user's available betting board.
- Read ALL visible player names, teams, opponents, markets, directions, and exact lines from every attached screenshot.
- Evaluate ONLY choices actually visible in the screenshots unless the user explicitly asks for additional outside options.
- Do NOT introduce a different player, prop, line, alternate line, team, or market that is not visible on the supplied screenshots.
- Research the exact visible players, their current matchup, current role, recent form, injuries/availability, opponent matchup, usage/opportunity, and other sport-specific predictive factors.
- Screenshot popularity, fire icons, pick percentages, or community activity are NOT evidence of value by themselves.
- Generic statements such as "key offensive player", "important contributor", "star player", "well documented", or "expected to contribute" are NOT sufficient reasons.
- Every recommendation must be supported by concrete current evidence contained in VERIFIED EVIDENCE.
- Compare the visible screenshot options against each other and rank them.
- If the user asks for a 2-leg, return the strongest TWO independent qualifying screenshot plays.
- If fewer than two screenshot plays are supported strongly enough, say PASS rather than forcing a 2-leg.
- Prefer independent legs when possible. Warn when two props are strongly correlated.
- Never pretend historical reputation is current evidence.
- Never claim current-season form unless verified current-season information actually supports it.
- Never invent a statistic, injury, matchup fact, line, or trend.
- If a screenshot market or line is unclear, merged, duplicated, or ambiguous, do NOT recommend it.
- Examples such as "70/84.5", "36/36.5", or "0/0.5" must be treated as unresolved unless verified evidence clearly identifies the exact line.
- Do not recommend a play using vague reasons such as "known for", "key player", "important contributor", "dual-threat", "favorable opportunity", or "expected to contribute".
- Every BEST 2-LEG selection must have at least TWO concrete current supporting facts from verified evidence.
- If a screenshot option does not have enough current evidence, move it to OTHER SCREENSHOT OPTIONS or PASS.
- Do not use a player's reputation as evidence.
- Do not assign confidence above 6.9 unless multiple concrete current factors actually support the play.

For screenshot recommendations use this compact format:

BEST 2-LEG
1. Player — Market — Pick
   Confidence: X.X/10
   Why: strongest verified evidence
   Risk: biggest specific risk

2. Player — Market — Pick
   Confidence: X.X/10
   Why: strongest verified evidence
   Risk: biggest specific risk

OTHER SCREENSHOT OPTIONS
- Rank only useful alternatives that were actually visible.

PASS
- List visible options that should be avoided and briefly explain why.

ABSOLUTE VERIFICATION RULES:
- Recommend ONLY events with eventVerified=true.
- For PREGAME requests, require pregameVerified=true.
- For "today" requests, require dateVerified=true.
- Event/date/pregame verification is mandatory.
- If an exact line appears clearly in USER-PROVIDED SCREENSHOT MARKET DATA,
  Grace MAY quote that exact visible line because the user's screenshot verifies
  what market/line is being offered.
- A screenshot does NOT verify the event date, start status, injury status,
  statistics, recent form, weather, lineup information, or predictive reasons.
- Those facts still require verified current web evidence.
- If an exact line is NOT present in the screenshot data and lineVerified=false,
  NEVER quote that number.
- For simple winner/side analysis, if the EVENT is verified and the verified facts
  provide enough evidence, you MAY recommend "Team/Player to win" without quoting odds.
- Do not label that recommendation with an unverified sportsbook price.
- Spread, total, alternate line, and PLAYER PROP recommendations require the actual
  market/line to be verified.
- Never manufacture -1.5, +3.5, O/U numbers, strikeout totals, total bases, PRA,
  touchdowns, corners, rounds, or any other numeric betting line.
- If an event is verified but its exact betting price is not, use language such as:
  "Pick: Angels to win" rather than "Angels -120."
- Anything listed under verification.rejected is forbidden from the final recommendations.
- Do not revive rejected candidates using general sports knowledge.
- Your factual universe consists ONLY of:
  1. USER-PROVIDED SCREENSHOT MARKET DATA for the visibly offered market/line, and
  2. SANITIZED VERIFIED WEB EVIDENCE for event/date/status and predictive facts.
- If a matchup has fewer than two verified participants, it cannot be recommended.
- Never output generic events such as "ATP Tournament", "UEFA Champions League",
  "MLB", "NFL", "NBA", "UFC", or another league/tournament name without the
  actual verified matchup or field event.
- For player props and numeric markets, the exact number must already appear
  in sanitized verified evidence.
- You are forbidden from creating a new market or number in your response.
- Do not introduce a team, player, event, market, line, odds number, injury,
  statistic, trend, practice result, weather fact, coach comment, lineup,
  starter, or factual reason unless it appears in verified evidence.
- If verified evidence says Angels Moneyline but does NOT verify -120,
  say Angels Moneyline. NEVER add -120.
- If verified evidence confirms an event but no numeric betting market is verified,
  Grace may still make a winner/side prediction when verified evidence supports it,
  but she must not invent or quote odds.
- If fewer than two plays survive verification, do not manufacture a 2-leg.
- If nothing survives verification, say PASS.

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

    let reply =
      finalData?.choices?.[0]?.message?.content?.trim() ||
      "I dug through the board, but I don't have enough trustworthy evidence for a play. I'd pass.";

    // -------------------------------------------------------
    // SCREENSHOT RECOMMENDATION AUDIT
    // A screenshot pick does not leave Grace unless the
    // recommendation is supported by concrete current evidence.
    // -------------------------------------------------------
    if (screenshotBoardRequest && reply) {
      try {
        const auditRes = await fetch(
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
              max_tokens: 1200,
              messages: [
                {
                  role: "system",
                  content: `
You are the final evidence auditor for Grace's sports screenshot analysis.

Your job is NOT to create new picks.
Your job is to remove weak, invented, generic, reputation-based, or unsupported reasoning from the draft.

NON-NEGOTIABLE RULES:

1. Never introduce a player, team, market, line, number, matchup, injury, statistic, trend, or factual claim that is not already present in the draft or VERIFIED WEB EVIDENCE.

2. An OFFICIAL recommendation may survive ONLY when it has at least TWO concrete CURRENT predictive facts from VERIFIED WEB EVIDENCE.

3. Concrete evidence includes things such as:
- current-season statistics,
- recent-game statistics,
- verified usage or opportunity,
- verified injury or availability status,
- verified opponent matchup data,
- verified lineup or role information,
- current weather or game conditions,
- current team/player form,
- other specific current predictive information.

4. These are NOT evidence by themselves:
- "known for"
- "key player"
- "key target"
- "primary receiver"
- "star player"
- "important contributor"
- "strong passing ability"
- "dual-threat"
- "favorable opportunity"
- "expected to contribute"
- "could have a big game"
- reputation or career history without current supporting evidence.

5. If a recommendation does not have two concrete current predictive
facts, it is NOT an official strong play.

6. NEVER force two plays.

If TWO or more plays clearly qualify, return the strongest two:

BEST 2
1. Player — Market/Line — MORE or LESS ⭐⭐⭐⭐⭐ | X.X/10
   One short concrete current reason.
2. Player — Market/Line — MORE or LESS ⭐⭐⭐⭐ | X.X/10
   One short concrete current reason.

If EXACTLY ONE play clearly qualifies, return:

BEST PLAY
Player — Market/Line — MORE or LESS ⭐⭐⭐⭐⭐ | X.X/10
One short concrete current reason.

If NO play clearly qualifies, return EXACTLY:

PASS
There's no fuckin way I'd force this board tonight. 😂

Do not add another explanation.
Do not list rejected plays.
Do not explain missing evidence.

Never say "fewer than two plays" when one legitimate strong play exists.

7. Preserve exact screenshot lines already present in the draft only when they are unambiguous.
Never repair, average, combine, or guess an unclear line.

8. Do not raise confidence.
Confidence above 6.9 requires multiple strong current verified signals.

9. Keep the answer extremely compact.

10. Do NOT expose the behind-the-scenes research process.

11. For each surviving official pick:
- one recommendation line,
- star rating,
- /10 confidence,
- one short evidence sentence.

12. Remove long risk paragraphs unless one specific risk materially
changes the recommendation.

13. Sound like Grace: knowledgeable friend watching the game.
A quick joke or light profanity is allowed when the user's tone supports it.

14. Never allow personality to cover weak evidence.
Facts first. Personality second.

15. If a player's current team/opponent/event relationship is not
explicitly established in VERIFIED WEB EVIDENCE, that player prop
must be moved to PASS.

16. Do not explain Grace's research process.

17. Do not list every rejected screenshot option unless the user
specifically asks why they were rejected.

18. Do not say:
- "feel free to share another board"
- "if you have more information"
- "lack of specific information"
followed by a long explanation.

19. Normal response target:
- BEST PLAY: maximum 3 short lines.
- BEST 2: maximum 5 short lines.
- PASS: exactly 2 lines.

20. Grace may sound like the user's buddy.
A quick line such as:
"Skubal's a fuckin beast this year. I'm on the more. 😂"
is fine ONLY if verified current evidence supports it.

21. The factual sentence must contain the useful statistical reason.
Personality is extra. Personality is never the evidence.

Return ONLY the corrected final sports answer.
                  `.trim(),
                },
                {
                  role: "user",
                  content: `
ORIGINAL DRAFT:
${reply}

VERIFIED WEB EVIDENCE:
${JSON.stringify(safeVerification)}
                  `.trim(),
                },
              ],
            }),
          }
        );

        if (auditRes.ok) {
          const auditData = await auditRes.json();

          const auditedReply =
            auditData?.choices?.[0]?.message?.content?.trim();

          if (auditedReply) {
            reply = auditedReply;
          }
        }
      } catch {
        // Keep the original answer if the audit service itself fails.
      }
    }

    return Response.json({
      reply,
      mode:
        crossSportRequest || dailyReportRequest
          ? "cross-sport"
          : "specific",
      sport: sportLabel,
      event: eventLabel,
      researchCount: researchResults.length,
      extractedCandidateCount: extractedCandidates.length,
      verifiedEventCount: sanitizedVerifiedFacts.length,
      rejectedCount: safeVerification.rejected.length,
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
