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
        { reply: "Grace sports analysis is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const clean = String(query).trim().toLowerCase();

    type LeagueConfig = {
      sport: string;
      league: string;
      label: string;
    };

    const leagues: Record<string, LeagueConfig> = {
      nfl: { sport: "football", league: "nfl", label: "NFL" },
      ncaaf: {
        sport: "football",
        league: "college-football",
        label: "College Football",
      },
      nba: { sport: "basketball", league: "nba", label: "NBA" },
      wnba: { sport: "basketball", league: "wnba", label: "WNBA" },
      mlb: { sport: "baseball", league: "mlb", label: "MLB" },
      nhl: { sport: "hockey", league: "nhl", label: "NHL" },
      mls: { sport: "soccer", league: "usa.1", label: "MLS" },
      epl: { sport: "soccer", league: "eng.1", label: "Premier League" },
    };

    function detectLeague(): LeagueConfig {
      if (
        clean.includes("college football") ||
        clean.includes("ncaaf") ||
        clean.includes("cfb")
      ) return leagues.ncaaf;

      if (clean.includes("wnba")) return leagues.wnba;
      if (clean.includes("nba")) return leagues.nba;
      if (clean.includes("mlb")) return leagues.mlb;
      if (clean.includes("nhl")) return leagues.nhl;
      if (clean.includes("mls")) return leagues.mls;

      if (
        clean.includes("soccer") ||
        clean.includes("premier league") ||
        clean.includes("epl")
      ) return leagues.epl;

      if (
        clean.includes("baseball") ||
        clean.includes("pitcher") ||
        clean.includes("strikeout") ||
        clean.includes("home run") ||
        clean.includes("hits")
      ) return leagues.mlb;

      if (
        clean.includes("basketball") ||
        clean.includes("pra") ||
        clean.includes("rebounds") ||
        clean.includes("assists")
      ) return leagues.nba;

      return leagues.nfl;
    }

    const selected = detectLeague();

    const now = new Date();
    const currentYear = now.getUTCFullYear();

    // NFL season boundary:
    // January belongs to the PREVIOUS NFL season.
    // August is preseason.
    // For current-season NFL analysis, use September through December
    // plus January of the following calendar year only when needed later.
    const seasonStart =
      selected.league === "nfl"
        ? `${currentYear}0901`
        : `${currentYear}0101`;

    const seasonEnd =
      selected.league === "nfl"
        ? `${currentYear}1231`
        : `${currentYear}1231`;

    const scoreboardUrl =
      `https://site.api.espn.com/apis/site/v2/sports/` +
      `${selected.sport}/${selected.league}/scoreboard` +
      `?limit=1000&dates=${seasonStart}-${seasonEnd}` +
      `${selected.league === "nfl" ? "&seasontype=2" : ""}`;

    const standingsUrl =
      `https://site.api.espn.com/apis/v2/sports/` +
      `${selected.sport}/${selected.league}/standings` +
      `?season=${currentYear}`;

    const [scoreboardRes, standingsRes] = await Promise.all([
      fetch(scoreboardUrl, { cache: "no-store" }),
      fetch(standingsUrl, { cache: "no-store" }),
    ]);

    const scoreboard = scoreboardRes.ok
      ? await scoreboardRes.json()
      : null;

    const standings = standingsRes.ok
      ? await standingsRes.json()
      : null;

    const games = Array.isArray(scoreboard?.events)
      ? scoreboard.events.slice(0, 40).map((event: any) => {
          const competition = event?.competitions?.[0];
          const competitors = competition?.competitors || [];

          const home = competitors.find(
            (c: any) => c?.homeAway === "home"
          );

          const away = competitors.find(
            (c: any) => c?.homeAway === "away"
          );

          const statusType = competition?.status?.type || {};

          let state = "pre";

          if (
            statusType?.state === "in" ||
            statusType?.completed === false &&
              String(statusType?.description || "").toLowerCase().includes("half")
          ) {
            state = "live";
          }

          if (
            statusType?.state === "post" ||
            statusType?.completed === true
          ) {
            state = "final";
          }

          const gameDate = new Date(event?.date || "");
          const month = gameDate.getUTCMonth() + 1;

          const isNFLRegularSeason =
            selected.league !== "nfl" ||
            (
              gameDate.getUTCFullYear() === currentYear &&
              month >= 9 &&
              month <= 12
            );

          return {
            name: event?.name || "",
            date: event?.date || "",
            state,
            status:
              statusType?.detail ||
              statusType?.description ||
              "",
            home: home?.team?.displayName || "",
            homeScore: home?.score || "",
            away: away?.team?.displayName || "",
            awayScore: away?.score || "",
            homeRecords: home?.records || [],
            awayRecords: away?.records || [],
            isNFLRegularSeason,
          };
        })
        .filter((game: any) => game.isNFLRegularSeason)
      : [];

    function extractStandings(node: any): any[] {
      if (!node) return [];

      const rows: any[] = [];

      if (Array.isArray(node?.standings?.entries)) {
        for (const entry of node.standings.entries) {
          const stats: Record<string, string> = {};

          for (const stat of entry?.stats || []) {
            if (stat?.name) {
              stats[stat.name] =
                stat.displayValue ??
                String(stat.value ?? "");
            }
          }

          rows.push({
            group: node?.name || "",
            team: entry?.team?.displayName || "",
            abbreviation: entry?.team?.abbreviation || "",
            wins: stats.wins || "",
            losses: stats.losses || "",
            ties: stats.ties || "",
            winPercent:
              stats.winPercent ||
              stats.winPercentage ||
              "",
            pointDifferential:
              stats.pointDifferential ||
              stats.differential ||
              "",
            streak: stats.streak || "",
            playoffSeed:
              stats.playoffSeed ||
              stats.seed ||
              "",
          });
        }
      }

      if (Array.isArray(node?.children)) {
        for (const child of node.children) {
          rows.push(...extractStandings(child));
        }
      }

      return rows;
    }

    const standingsRows = extractStandings(standings);

    const wantsLiveAnalysis =
      clean.includes("live") ||
      clean.includes("in game") ||
      clean.includes("in-game") ||
      clean.includes("right now");

    const pregameGames = games.filter(
      (game: any) => game.state === "pre"
    );

    const liveGames = games.filter(
      (game: any) => game.state === "live"
    );

    const finalGames = games.filter(
      (game: any) => game.state === "final"
    );

    const eligibleGames = wantsLiveAnalysis
      ? liveGames
      : pregameGames;

    const recentFinals = finalGames
      .filter(
        (game: any) =>
          new Date(game.date).getTime() <= now.getTime()
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, 80);

    function getTeamStanding(teamName: string) {
      return standingsRows.find(
        (row: any) =>
          String(row.team || "").toLowerCase() ===
          String(teamName || "").toLowerCase()
      );
    }

    function getRecentTeamResults(teamName: string) {
      const name = String(teamName || "").toLowerCase();

      return recentFinals
        .filter((game: any) => {
          return (
            String(game.home || "").toLowerCase() === name ||
            String(game.away || "").toLowerCase() === name
          );
        })
        .slice(0, 5)
        .map((game: any) => {
          const isHome =
            String(game.home || "").toLowerCase() === name;

          const teamScore = Number(
            isHome ? game.homeScore : game.awayScore
          );

          const oppScore = Number(
            isHome ? game.awayScore : game.homeScore
          );

          const opponent = isHome ? game.away : game.home;

          let result = "T";
          if (teamScore > oppScore) result = "W";
          if (teamScore < oppScore) result = "L";

          return {
            opponent,
            result,
            teamScore,
            opponentScore: oppScore,
            date: game.date,
          };
        });
    }

    function summarizeRecent(results: any[]) {
      const wins = results.filter((r: any) => r.result === "W").length;
      const losses = results.filter((r: any) => r.result === "L").length;

      const pointDiff = results.reduce(
        (sum: number, r: any) =>
          sum + (Number(r.teamScore) - Number(r.opponentScore)),
        0
      );

      return {
        games: results.length,
        wins,
        losses,
        pointDiff,
      };
    }

    const enrichedEligibleGames = eligibleGames.map(
      (game: any) => {
        const homeRecentResults = getRecentTeamResults(game.home);
        const awayRecentResults = getRecentTeamResults(game.away);

        const homeRecentSummary = summarizeRecent(homeRecentResults);
        const awayRecentSummary = summarizeRecent(awayRecentResults);

        const homeStanding = getTeamStanding(game.home) || null;
        const awayStanding = getTeamStanding(game.away) || null;

        const homeEvidenceCount =
          homeRecentResults.length +
          (homeStanding?.wins || homeStanding?.losses ? 1 : 0);

        const awayEvidenceCount =
          awayRecentResults.length +
          (awayStanding?.wins || awayStanding?.losses ? 1 : 0);

        return {
          ...game,
          homeStanding,
          awayStanding,
          homeRecentResults,
          awayRecentResults,
          homeRecentSummary,
          awayRecentSummary,
          evidence: {
            homeEvidenceCount,
            awayEvidenceCount,
            totalEvidenceCount:
              homeEvidenceCount + awayEvidenceCount,
          },
        };
      }
    );

    const context = {
      league: selected.label,
      currentTime: new Date().toISOString(),
      requestMode: wantsLiveAnalysis ? "live" : "pregame",
      eligibleGames: enrichedEligibleGames,
      pregameGames,
      liveGames,
      finalGames,
      standings: standingsRows,
    };

    const aiRes = await fetch(
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
          temperature: 0.1,
          max_tokens: 1100,
          messages: [
            {
              role: "system",
              content: `
You are Grace's hidden sports analysis and ranking engine.

The user may ask for:
- best picks
- strongest options
- rankings
- best 2-leg or 3-leg combinations
- moneyline analysis
- matchup analysis
- props
- overs/unders
- confidence ranking

CORE RULE:
Evidence first. Never invent statistics, lines, injuries, odds, player trends, or matchup facts.

Use only information actually supplied in the request or structured sports data.

GAME-STATE RULE:
- For ordinary pick, prediction, moneyline, spread, prop, or "best picks" requests, analyze PRE-GAME events only.
- Do NOT use live scores or completed-game results to justify a normal pregame prediction.
- Only analyze live games when the user explicitly asks for live picks, live betting, in-game analysis, or something "right now."
- If no eligible pregame games are available, say so instead of using live/final games as substitutes.

NFL SEASON RULE:
- Ignore NFL preseason games completely for normal regular-season analysis.
- Ignore January games that belong to the prior NFL season.
- Use only current-season NFL regular-season results for recent form.
- Do not treat preseason records, preseason point differential, or preseason head-to-head as meaningful regular-season evidence.

RANKING METHOD:
Evaluate each candidate ONLY from evidence actually present in the supplied context.

Allowed evidence includes:
1. Current standings/record
2. Recent completed results supplied in context
3. Home/away status
4. Opponent current record
5. Score differential from supplied recent games
6. User-supplied line/odds/prop number
7. Current game state when requestMode is live
8. Missing-data risk

FORBIDDEN REASONING:
- Do not use "historically strong"
- Do not use "traditionally good"
- Do not use "has shown potential"
- Do not use "past seasons"
- Do not use roster reputation
- Do not use unsupported star-player assumptions
- Do not use general sports knowledge that is not in the supplied data
- Do not invent current injuries, trends, odds, rankings, or statistics

If the supplied data does not support a claim, do not make that claim.

ABSOLUTE RULE:
If you are tempted to say things like:
- "strong team in recent seasons"
- "dominant in recent years"
- "historically better"
- "usually good"
- "has potential"
and that evidence is not explicitly present in the supplied context,
DO NOT SAY IT.

Use current-season record, current-season standings, and supplied recent completed results only.

SCORING:
Give each viable option a confidence score from 1-10 based on supplied evidence only.

A 10 is extremely rare.

Use:
8.5-10 = exceptional evidence from multiple strong current-data signals
7.5-8.4 = strong current-data support
6.5-7.4 = usable but incomplete
5.5-6.4 = weak/marginal
below 5.5 = PASS

IMPORTANT:
If recent performance data is missing or weak, confidence MUST come down.
Do not give a 7.5+ score based mainly on home-field advantage or team reputation.
If there is not enough current statistical evidence, say PASS.

HARD CONFIDENCE CAPS:
- If context.eligibleGames[*].evidence.totalEvidenceCount is 0-1:
  maximum confidence is 5.4 -> PASS.
- If totalEvidenceCount is 2:
  maximum confidence is 6.0.
- If totalEvidenceCount is 3-4:
  maximum confidence is 6.8.
- Only allow 7.0+ when there are multiple current-season evidence signals.
- Only allow 7.5+ when both sides have meaningful current-season evidence.
- Home-field advantage by itself is NEVER enough for a pick above 5.4.
- If this is Week 1 and current-season evidence is thin, PASS is expected and correct.

If there is not enough statistical evidence for a strong rating, say PASS.

USER EXPERIENCE:
- Answer naturally.
- Do not turn this into a formal report.
- Put the strongest option first.
- Explain WHY using only current evidence from the supplied data.
- Be concise unless the user asks for detail.
- If asked for a 2-leg or 3-leg, choose the strongest non-duplicate options available.
- Avoid reusing the same player or team when reasonable.
- Do not pretend certainty.
- Do not mention APIs, ESPN, feeds, websites, or providers.
- Do not claim a guaranteed winner.
- If evidence is weak, say PASS instead of forcing a pick.
- Do not justify picks with vague phrases like "strong team," "good history," "potential," or "recent seasons" unless the supporting current data is explicitly supplied.

IMPORTANT:
This is Step 9 statistical ranking only.
Injury/news/web cross-checking is handled by another layer later.
If that missing information materially affects confidence, explicitly lower the score or mark PASS.
              `.trim(),
            },
            {
              role: "user",
              content: `
User request:
${query}

Available structured sports context:
${JSON.stringify(context)}

IMPORTANT:
Use only context.eligibleGames for candidate picks.
Do not select from liveGames or finalGames unless requestMode is "live".

Analyze and rank the request as Grace.
              `.trim(),
            },
          ],
        }),
      }
    );

    const aiData = await aiRes.json();

    const reply =
      aiData?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't get enough solid evidence to rank that confidently.";

    return Response.json({
      reply,
      league: selected.label,
    });
  } catch (error: any) {
    return Response.json(
      {
        reply:
          "Grace sports analysis hit a glitch: " +
          (error?.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
