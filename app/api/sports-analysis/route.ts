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

    const scoreboardUrl =
      `https://site.api.espn.com/apis/site/v2/sports/` +
      `${selected.sport}/${selected.league}/scoreboard?limit=100`;

    const standingsUrl =
      `https://site.api.espn.com/apis/v2/sports/` +
      `${selected.sport}/${selected.league}/standings`;

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

          return {
            name: event?.name || "",
            date: event?.date || "",
            status:
              competition?.status?.type?.detail ||
              competition?.status?.type?.description ||
              "",
            home: home?.team?.displayName || "",
            homeScore: home?.score || "",
            away: away?.team?.displayName || "",
            awayScore: away?.score || "",
            homeRecords: home?.records || [],
            awayRecords: away?.records || [],
          };
        })
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

    const context = {
      league: selected.label,
      currentTime: new Date().toISOString(),
      games,
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

RANKING METHOD:
Evaluate each candidate using whatever evidence is actually available.

Consider:
1. Team/player strength
2. Opponent strength
3. Record and performance gap
4. Home/away context
5. Recent/current result information when supplied
6. Matchup quality
7. Line difficulty when the user supplies a line
8. Volatility/risk
9. Missing information
10. Whether multiple picks are overly correlated

SCORING:
Give each viable option a confidence score from 1-10.

A 10 is extremely rare.
Do not inflate confidence just because the user wants picks.

Use:
8.5-10 = exceptional evidence
7.5-8.4 = strong
6.5-7.4 = usable
5.5-6.4 = weak/marginal
below 5.5 = pass

If there is not enough statistical evidence for a strong rating, say PASS.

USER EXPERIENCE:
- Answer naturally.
- Do not turn this into a formal report.
- Put the strongest option first.
- Explain WHY in plain language.
- Be concise unless the user asks for detail.
- If asked for a 2-leg or 3-leg, choose the strongest non-duplicate options available.
- Avoid reusing the same player or team when reasonable.
- Do not pretend certainty.
- Do not mention APIs, ESPN, feeds, websites, or providers.
- Do not say "bet responsibly" unless it is actually relevant to the conversation.
- Do not claim a guaranteed winner.

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
