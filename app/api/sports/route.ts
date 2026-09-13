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
      nfl: {
        sport: "football",
        league: "nfl",
        label: "NFL",
      },
      ncaaf: {
        sport: "football",
        league: "college-football",
        label: "College Football",
      },
      nba: {
        sport: "basketball",
        league: "nba",
        label: "NBA",
      },
      wnba: {
        sport: "basketball",
        league: "wnba",
        label: "WNBA",
      },
      ncaam: {
        sport: "basketball",
        league: "mens-college-basketball",
        label: "Men's College Basketball",
      },
      ncaaw: {
        sport: "basketball",
        league: "womens-college-basketball",
        label: "Women's College Basketball",
      },
      mlb: {
        sport: "baseball",
        league: "mlb",
        label: "MLB",
      },
      nhl: {
        sport: "hockey",
        league: "nhl",
        label: "NHL",
      },
      mls: {
        sport: "soccer",
        league: "usa.1",
        label: "MLS",
      },
      epl: {
        sport: "soccer",
        league: "eng.1",
        label: "Premier League",
      },
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

      if (
        clean.includes("wnba") ||
        clean.includes("women's basketball") ||
        clean.includes("womens basketball")
      ) return leagues.wnba;

      if (
        clean.includes("college basketball") ||
        clean.includes("ncaam") ||
        clean.includes("march madness")
      ) return leagues.ncaam;

      if (clean.includes("nba")) return leagues.nba;
      if (clean.includes("mlb")) return leagues.mlb;
      if (clean.includes("nhl")) return leagues.nhl;

      if (
        clean.includes("premier league") ||
        clean.includes("epl")
      ) return leagues.epl;

      if (
        clean.includes("champions league") ||
        clean.includes("ucl")
      ) return leagues.ucl;

      if (
        clean.includes("mls") ||
        clean.includes("major league soccer")
      ) return leagues.mls;

      if (
        clean.includes("baseball") ||
        clean.includes("pitcher") ||
        clean.includes("home run") ||
        clean.includes("inning")
      ) return leagues.mlb;

      if (
        clean.includes("hockey") ||
        clean.includes("goalie") ||
        clean.includes("puck")
      ) return leagues.nhl;

      if (
        clean.includes("basketball") ||
        clean.includes("points rebounds assists") ||
        clean.includes("pra")
      ) return leagues.nba;

      if (
        clean.includes("soccer") ||
        clean.includes("football club")
      ) return leagues.epl;

      return leagues.nfl;
    }

    const selected = detectLeague();

    const scoreboardUrl =
      `https://site.api.espn.com/apis/site/v2/sports/` +
      `${selected.sport}/${selected.league}/scoreboard?limit=100`;

    const standingsUrl =
      `https://site.api.espn.com/apis/v2/sports/` +
      `${selected.sport}/${selected.league}/standings`;

    const [scoreboardRes, standingsRes] = await Promise.allSettled([
      fetch(scoreboardUrl, {
        headers: {
          "User-Agent": "Grace Assistant/1.0",
        },
        cache: "no-store",
      }),
      fetch(standingsUrl, {
        headers: {
          "User-Agent": "Grace Assistant/1.0",
        },
        cache: "no-store",
      }),
    ]);

    let scoreboard: any = null;
    let standings: any = null;

    if (
      scoreboardRes.status === "fulfilled" &&
      scoreboardRes.value.ok
    ) {
      scoreboard = await scoreboardRes.value.json();
    }

    if (
      standingsRes.status === "fulfilled" &&
      standingsRes.value.ok
    ) {
      standings = await standingsRes.value.json();
    }

    const slimEvents = Array.isArray(scoreboard?.events)
      ? scoreboard.events.slice(0, 25).map((event: any) => {
          const competition = event?.competitions?.[0];

          return {
            id: event?.id,
            name: event?.name,
            shortName: event?.shortName,
            date: event?.date,
            status: competition?.status?.type?.description,
            detail: competition?.status?.type?.detail,
            competitors: Array.isArray(competition?.competitors)
              ? competition.competitors.map((team: any) => ({
                  team: team?.team?.displayName,
                  abbreviation: team?.team?.abbreviation,
                  score: team?.score,
                  homeAway: team?.homeAway,
                  winner: team?.winner,
                  records: team?.records,
                }))
              : [],
          };
        })
      : [];

    const slimStandings =
      standings?.children?.flatMap((group: any) =>
        Array.isArray(group?.standings?.entries)
          ? group.standings.entries.slice(0, 20).map((entry: any) => ({
              team: entry?.team?.displayName,
              abbreviation: entry?.team?.abbreviation,
              stats: Array.isArray(entry?.stats)
                ? entry.stats
                    .filter((stat: any) =>
                      [
                        "wins",
                        "losses",
                        "ties",
                        "winPercent",
                        "gamesBehind",
                        "playoffSeed",
                        "points",
                        "rank",
                      ].includes(stat?.name)
                    )
                    .map((stat: any) => ({
                      name: stat?.name,
                      value: stat?.displayValue,
                    }))
                : [],
            }))
          : []
      ) || [];

    const sportsPayload = {
      league: selected.label,
      events: slimEvents,
      standings: slimStandings.slice(0, 40),
    };

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
          temperature: 0.15,
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content: `
You are Grace.

You have live structured sports data available.

Rules:
- Answer the user's actual sports question first.
- Be concise and conversational unless more detail is requested.
- Use the supplied sports data when it contains the answer.
- Never invent a score, record, standing, game result, or schedule.
- If the data does not contain the answer, say that clearly.
- Do not mention ESPN, APIs, feeds, websites, or data providers unless the user specifically asks.
- Do not turn ordinary sports answers into reports.
- Do not make betting predictions in this route.
- Do not create picks, rankings, confidence scores, or betting recommendations here.
              `.trim(),
            },
            {
              role: "user",
              content: `
User question:
${query}

Structured sports data:
${JSON.stringify(sportsPayload)}

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
      "I pulled the sports data, but I couldn't turn it into a solid answer yet.";

    return Response.json({
      reply,
      league: selected.label,
      data: sportsPayload,
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
