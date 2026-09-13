export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || !String(query).trim()) {
      return Response.json(
        { reply: "Ask Grace a sports question first." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Grace sports data is missing OPENAI_API_KEY." },
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
      ncaam: {
        sport: "basketball",
        league: "mens-college-basketball",
        label: "Men's College Basketball",
      },
      mlb: { sport: "baseball", league: "mlb", label: "MLB" },
      nhl: { sport: "hockey", league: "nhl", label: "NHL" },
      mls: { sport: "soccer", league: "usa.1", label: "MLS" },
      epl: { sport: "soccer", league: "eng.1", label: "Premier League" },
      ucl: {
        sport: "soccer",
        league: "uefa.champions",
        label: "Champions League",
      },
    };

    function detectLeague(): LeagueConfig {
      if (
        clean.includes("college football") ||
        clean.includes("ncaaf") ||
        clean.includes("cfb")
      ) return leagues.ncaaf;

      if (clean.includes("wnba") || clean.includes("women's basketball"))
        return leagues.wnba;

      if (
        clean.includes("college basketball") ||
        clean.includes("ncaam") ||
        clean.includes("march madness")
      ) return leagues.ncaam;

      if (clean.includes("nba")) return leagues.nba;
      if (clean.includes("mlb")) return leagues.mlb;
      if (clean.includes("nhl")) return leagues.nhl;

      if (clean.includes("premier league") || clean.includes("epl"))
        return leagues.epl;

      if (clean.includes("champions league") || clean.includes("ucl"))
        return leagues.ucl;

      if (clean.includes("mls")) return leagues.mls;

      if (
        clean.includes("baseball") ||
        clean.includes("pitcher") ||
        clean.includes("home run")
      ) return leagues.mlb;

      if (clean.includes("hockey") || clean.includes("goalie"))
        return leagues.nhl;

      if (
        clean.includes("basketball") ||
        clean.includes("points rebounds assists") ||
        clean.includes("pra")
      ) return leagues.nba;

      if (clean.includes("soccer")) return leagues.epl;

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

    const now = new Date();

    const currentDateUTC = now.toISOString().slice(0, 10);

    const games = Array.isArray(scoreboard?.events)
      ? scoreboard.events.map((event: any) => {
          const competition = event?.competitions?.[0];
          const competitors = competition?.competitors || [];

          const home = competitors.find(
            (c: any) => c?.homeAway === "home"
          );

          const away = competitors.find(
            (c: any) => c?.homeAway === "away"
          );

          return {
            date: event?.date || "",
            dateOnly: String(event?.date || "").slice(0, 10),
            name: event?.name || "",
            status:
              competition?.status?.type?.detail ||
              competition?.status?.type?.description ||
              "",
            home: home?.team?.displayName || "",
            homeScore: home?.score || "",
            away: away?.team?.displayName || "",
            awayScore: away?.score || "",
          };
        })
      : [];

    const todaysGames = games.filter(
      (game: any) => game.dateOnly === currentDateUTC
    );

    function extractStandingGroups(node: any): any[] {
      if (!node) return [];

      const rows: any[] = [];

      if (Array.isArray(node?.standings?.entries)) {
        for (const entry of node.standings.entries) {
          const statMap: Record<string, string> = {};

          for (const stat of entry?.stats || []) {
            if (stat?.name) {
              statMap[stat.name] =
                stat.displayValue ??
                String(stat.value ?? "");
            }
          }

          rows.push({
            group: node?.name || "",
            team: entry?.team?.displayName || "",
            abbreviation: entry?.team?.abbreviation || "",
            wins:
              statMap.wins ||
              statMap.WINS ||
              "",
            losses:
              statMap.losses ||
              statMap.LOSSES ||
              "",
            ties:
              statMap.ties ||
              statMap.TIES ||
              "",
            winPercent:
              statMap.winPercent ||
              statMap.winPercentage ||
              "",
            playoffSeed:
              statMap.playoffSeed ||
              statMap.seed ||
              "",
            points:
              statMap.points ||
              "",
          });
        }
      }

      if (Array.isArray(node?.children)) {
        for (const child of node.children) {
          rows.push(...extractStandingGroups(child));
        }
      }

      return rows;
    }

    const standingRows = extractStandingGroups(standings);

    const gameText =
      todaysGames.length > 0
        ? todaysGames
            .map(
              (g: any) =>
                `${g.away} at ${g.home} — ${g.status}` +
                (g.awayScore || g.homeScore
                  ? ` — score ${g.awayScore}-${g.homeScore}`
                  : "")
            )
            .join("\n")
        : "No games found for today's UTC date.";

    const standingsText =
      standingRows.length > 0
        ? standingRows
            .map((row: any) => {
              const record =
                row.wins || row.losses
                  ? `${row.wins || "0"}-${row.losses || "0"}` +
                    (row.ties ? `-${row.ties}` : "")
                  : "record unavailable";

              return `${row.group}: ${row.team} — ${record}`;
            })
            .join("\n")
        : "No standings rows were returned.";

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
          max_tokens: 800,
          messages: [
            {
              role: "system",
              content: `
You are Grace.

You have current structured sports information.

Today's date for this request is:
${currentDateUTC}

League:
${selected.label}

Rules:
- Answer the user's actual question first.
- Be natural and concise.
- Never tell the user to go check another sports app or website.
- Never claim data is unavailable when it appears in the supplied facts.
- Never invent scores, records, schedules, or standings.
- Do not mention ESPN, feeds, APIs, websites, or providers.
- Do not turn ordinary sports answers into reports.
- This route is factual sports data only. Prediction/ranking logic comes later.
              `.trim(),
            },
            {
              role: "user",
              content: `
User question:
${query}

TODAY'S GAMES:
${gameText}

CURRENT STANDINGS:
${standingsText}

Answer as Grace.
              `.trim(),
            },
          ],
        }),
      }
    );

    const aiData = await aiRes.json();

    const reply =
      aiData?.choices?.[0]?.message?.content?.trim() ||
      "I pulled the sports data but couldn't form the answer.";

    return Response.json({
      reply,
      league: selected.label,
      games: todaysGames,
      standings: standingRows,
    });
  } catch (error: any) {
    return Response.json(
      {
        reply:
          "Grace sports data hit a glitch: " +
          (error?.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
