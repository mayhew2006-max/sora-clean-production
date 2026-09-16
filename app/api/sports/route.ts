type LeagueConfig = {
  sport: string;
  league: string;
  label: string;
};

const LEAGUES: Record<string, LeagueConfig> = {
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

function compact(value: any, max = 6500) {
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return "";
  }
}

function easternDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function detectLeagueFromText(clean: string): LeagueConfig {
  if (
    clean.includes("college football") ||
    clean.includes("ncaaf") ||
    clean.includes("cfb")
  ) return LEAGUES.ncaaf;

  if (clean.includes("wnba")) return LEAGUES.wnba;

  if (
    clean.includes("college basketball") ||
    clean.includes("ncaam") ||
    clean.includes("march madness")
  ) return LEAGUES.ncaam;

  if (clean.includes("nba")) return LEAGUES.nba;
  if (clean.includes("mlb")) return LEAGUES.mlb;
  if (clean.includes("nhl")) return LEAGUES.nhl;

  if (
    clean.includes("premier league") ||
    clean.includes("epl")
  ) return LEAGUES.epl;

  if (
    clean.includes("champions league") ||
    clean.includes("ucl")
  ) return LEAGUES.ucl;

  if (clean.includes("mls")) return LEAGUES.mls;

  if (
    clean.includes("baseball") ||
    clean.includes("pitcher") ||
    clean.includes("strikeout") ||
    clean.includes("home run") ||
    clean.includes("innings") ||
    clean.includes("rbi")
  ) return LEAGUES.mlb;

  if (
    clean.includes("hockey") ||
    clean.includes("goalie")
  ) return LEAGUES.nhl;

  if (
    clean.includes("basketball") ||
    clean.includes("rebounds") ||
    clean.includes("assists") ||
    clean.includes("pra")
  ) return LEAGUES.nba;

  if (clean.includes("soccer"))
    return LEAGUES.epl;

  return LEAGUES.nfl;
}

function inferLeagueFromBlob(
  blob: string,
  fallback: LeagueConfig
): LeagueConfig {
  const lower = blob.toLowerCase();

  if (
    lower.includes('"wnba"') ||
    lower.includes("women's national basketball")
  ) return LEAGUES.wnba;

  if (
    lower.includes('"mlb"') ||
    lower.includes('"baseball"')
  ) return LEAGUES.mlb;

  if (
    lower.includes('"nfl"') ||
    lower.includes('"football"')
  ) return LEAGUES.nfl;

  if (
    lower.includes('"nba"') ||
    lower.includes('"basketball"')
  ) return LEAGUES.nba;

  if (
    lower.includes('"nhl"') ||
    lower.includes('"hockey"')
  ) return LEAGUES.nhl;

  if (
    lower.includes('"usa.1"') ||
    lower.includes('"mls"')
  ) return LEAGUES.mls;

  if (
    lower.includes('"eng.1"') ||
    lower.includes("premier league")
  ) return LEAGUES.epl;

  return fallback;
}

function extractSubject(query: string) {
  const patterns = [
    /who does (.+?) play for/i,
    /what team does (.+?) play for/i,
    /who is (.+?) playing for/i,
    /who is (.+?) facing/i,
    /who does (.+?) face/i,
    /is (.+?) playing tonight/i,
    /is (.+?) playing today/i,
    /is (.+?) starting tonight/i,
    /is (.+?) starting today/i,
    /what is (.+?) averaging/i,
    /what's (.+?) averaging/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);

    if (match?.[1]) {
      return match[1]
        .replace(/[?.!,]+$/g, "")
        .trim();
    }
  }

  return query.trim();
}

async function fetchJson(
  url: string,
  seconds = 300
): Promise<any | null> {
  try {
    const res =
      seconds <= 0
        ? await fetch(url, {
            cache: "no-store",
          })
        : await fetch(url, {
            next: {
              revalidate: seconds,
            },
          });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

function collectSearchObjects(
  node: any,
  out: any[] = [],
  depth = 0
) {
  if (
    node == null ||
    depth > 7 ||
    out.length >= 180
  ) return out;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectSearchObjects(item, out, depth + 1);
    }

    return out;
  }

  if (typeof node !== "object") {
    return out;
  }

  const name =
    node?.displayName ||
    node?.fullName ||
    node?.name ||
    "";

  if (
    node?.id &&
    typeof name === "string" &&
    name.trim()
  ) {
    out.push(node);
  }

  for (const value of Object.values(node)) {
    collectSearchObjects(value, out, depth + 1);
  }

  return out;
}

function pickBestSearchObject(
  objects: any[],
  subject: string
) {
  const tokens = subject
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 3);

  let best: any = null;
  let bestScore = -1;

  for (const item of objects) {
    const name = String(
      item?.displayName ||
      item?.fullName ||
      item?.name ||
      ""
    ).toLowerCase();

    const type = String(
      item?.type ||
      item?.category ||
      ""
    ).toLowerCase();

    let score = 0;

    if (
      type.includes("athlete") ||
      type.includes("player")
    ) score += 20;

    for (const token of tokens) {
      if (name.includes(token)) score += 4;
    }

    if (
      subject &&
      name === subject.toLowerCase()
    ) score += 25;

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best;
}


function normalizeGameText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function gameMatchScore(
  game: any,
  context: string
) {
  const haystack =
    ` ${normalizeGameText(context)} `;

  const aliases = [
    game?.home,
    game?.homeName,
    game?.homeAbbreviation,
    game?.away,
    game?.awayName,
    game?.awayAbbreviation,
    game?.name,
    game?.shortName,
  ]
    .map((value) =>
      normalizeGameText(String(value || ""))
    )
    .filter(Boolean);

  let score = 0;

  for (const alias of aliases) {
    if (
      alias.length >= 3 &&
      haystack.includes(` ${alias} `)
    ) {
      score += 15;
    }

    const pieces = alias
      .split(" ")
      .filter((piece) => piece.length >= 4);

    for (const piece of pieces) {
      if (haystack.includes(` ${piece} `)) {
        score += 4;
      }
    }
  }

  return score;
}

function pickActiveGame(
  games: any[],
  context: string
) {
  let best: any = null;
  let bestScore = 0;

  for (const game of games) {
    const score =
      gameMatchScore(game, context);

    if (score > bestScore) {
      best = game;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}


const LIVE_GAME_DISCOVERY_KEYS = [
  "mlb",
  "nfl",
  "ncaaf",
  "nba",
  "wnba",
  "ncaam",
  "nhl",
  "mls",
  "epl",
  "ucl",
] as const;

async function discoverLiveGameAcrossLeagues(
  currentQuery: string,
  recentContext: string,
  today: string
) {
  const dateKey = today.replace(/-/g, "");

  const results = await Promise.all(
    LIVE_GAME_DISCOVERY_KEYS.map(
      async (key) => {
        const league = LEAGUES[key];

        const url =
          `https://site.api.espn.com/apis/site/v2/sports/` +
          `${league.sport}/${league.league}/scoreboard?dates=${dateKey}&limit=100`;

        const board = await fetchJson(url, 0);

        const events =
          Array.isArray(board?.events)
            ? board.events
            : [];

        let bestGame: any = null;
        let bestScore = 0;

        for (const event of events) {
          const competition =
            event?.competitions?.[0];

          const competitors =
            competition?.competitors || [];

          const home =
            competitors.find(
              (c: any) =>
                c?.homeAway === "home"
            );

          const away =
            competitors.find(
              (c: any) =>
                c?.homeAway === "away"
            );

          const game = {
            id: event?.id || "",
            date: event?.date || "",
            name: event?.name || "",
            shortName:
              event?.shortName || "",

            status:
              competition?.status?.type
                ?.detail ||
              competition?.status?.type
                ?.description ||
              "",

            state:
              competition?.status?.type
                ?.state ||
              event?.status?.type?.state ||
              "",

            home:
              home?.team?.displayName ||
              "",
            homeName:
              home?.team?.name || "",
            homeAbbreviation:
              home?.team?.abbreviation ||
              "",
            homeScore:
              home?.score || "",

            away:
              away?.team?.displayName ||
              "",
            awayName:
              away?.team?.name || "",
            awayAbbreviation:
              away?.team?.abbreviation ||
              "",
            awayScore:
              away?.score || "",
          };

          // Current question is much more important
          // than older conversation context.
          let score =
            gameMatchScore(
              game,
              currentQuery
            ) * 5;

          score +=
            gameMatchScore(
              game,
              recentContext
            );

          // If two teams share a name like "Giants",
          // favor the one that's actually live.
          if (game.state === "in") {
            score += 12;
          }

          if (score > bestScore) {
            bestScore = score;
            bestGame = game;
          }
        }

        return {
          league,
          game: bestGame,
          score: bestScore,
        };
      }
    )
  );

  results.sort(
    (a, b) => b.score - a.score
  );

  const best = results[0];

  if (
    !best ||
    !best.game ||
    best.score <= 0
  ) {
    return null;
  }

  return best;
}

export async function POST(req: Request) {
  try {
    const { query, context } = await req.json();

    if (!query || !String(query).trim()) {
      return Response.json(
        {
          reply:
            "Ask Grace a sports question first.",
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          reply:
            "Grace sports data is missing OPENAI_API_KEY.",
        },
        { status: 500 }
      );
    }

    const userQuery = String(query).trim();
    const clean = userQuery.toLowerCase();

    const recentContext = Array.isArray(context)
      ? context
          .filter(
            (message: any) =>
              message &&
              typeof message.content === "string"
          )
          .slice(-8)
      : [];

    const contextText = recentContext
      .map(
        (message: any) =>
          `${message.role || "user"}: ${message.content}`
      )
      .join("\n");

    const routingText =
      `${contextText}\nuser: ${userQuery}`;

    const routingClean =
      routingText.toLowerCase();

    const previousUser =
      [...recentContext]
        .reverse()
        .find(
          (message: any) =>
            message.role === "user"
        );

    const ambiguousFollowUp =
      /^(what happened|what just happened|what's happening|whats happening|update me|give me an update|how many|is he still|is she still|who's up|whos up|what inning|what quarter|how much time|what's the score|whats the score|score now)/i
        .test(userQuery);

    const subjectSource =
      ambiguousFollowUp &&
      previousUser?.content
        ? String(previousUser.content)
        : userQuery;

    const today = easternDate();
    const season = today.slice(0, 4);
    const subject =
      extractSubject(subjectSource);

    let selected =
      detectLeagueFromText(routingClean);

    let discoveredGame: any = null;

    const wantsLiveGame =
      /game|score|what happened|what just happened|what's happening|whats happening|update me|inning|quarter|period|who's up|whos up|how many/i
        .test(routingClean);

    if (wantsLiveGame) {
      const discovery =
        await discoverLiveGameAcrossLeagues(
          userQuery,
          contextText,
          today
        );

      if (discovery?.game) {
        selected =
          discovery.league;

        discoveredGame =
          discovery.game;
      }
    }

    // -------------------------------------------------------
    // FREE ESPN ATHLETE SEARCH
    // -------------------------------------------------------

    const encodedSubject =
      encodeURIComponent(subject);

    let searchData = await fetchJson(
      `https://site.web.api.espn.com/apis/search/v2?query=${encodedSubject}&limit=10`,
      600
    );

    if (!searchData) {
      searchData = await fetchJson(
        `https://site.web.api.espn.com/apis/common/v3/search?query=${encodedSubject}&limit=10`,
        600
      );
    }

    const searchObjects =
      collectSearchObjects(searchData);

    const athleteItem =
      pickBestSearchObject(
        searchObjects,
        subject
      );

    if (
      !discoveredGame &&
      searchData
    ) {
      selected = inferLeagueFromBlob(
        compact(searchData, 9000),
        selected
      );
    }

    if (
      !discoveredGame &&
      athleteItem
    ) {
      selected = inferLeagueFromBlob(
        compact(athleteItem, 7000),
        selected
      );
    }

    let athleteOverview: any = null;
    let athleteStats: any = null;
    let athleteGameLog: any = null;

    const athleteId =
      athleteItem?.id
        ? String(athleteItem.id)
        : "";

    if (athleteId) {
      athleteOverview = await fetchJson(
        `https://site.web.api.espn.com/apis/common/v3/sports/${selected.sport}/${selected.league}/athletes/${athleteId}/overview`,
        300
      );

      const wantsStats =
        clean.includes("average") ||
        clean.includes("averaging") ||
        clean.includes("stat") ||
        clean.includes("recent") ||
        clean.includes("last ") ||
        clean.includes("strikeout") ||
        clean.includes("yards") ||
        clean.includes("targets") ||
        clean.includes("carries") ||
        clean.includes("rebounds") ||
        clean.includes("assists") ||
        clean.includes("goals") ||
        clean.includes("saves");

      if (wantsStats) {
        [athleteStats, athleteGameLog] =
          await Promise.all([
            fetchJson(
              `https://site.web.api.espn.com/apis/common/v3/sports/${selected.sport}/${selected.league}/athletes/${athleteId}/stats?season=${season}`,
              600
            ),
            fetchJson(
              `https://site.web.api.espn.com/apis/common/v3/sports/${selected.sport}/${selected.league}/athletes/${athleteId}/gamelog?season=${season}`,
              600
            ),
          ]);
      }
    }

    // -------------------------------------------------------
    // FREE MLB OFFICIAL PLAYER LOOKUP
    // Gives us an extra hard current-team check for baseball.
    // -------------------------------------------------------

    let mlbPerson: any = null;
    let mlbSchedule: any = null;
    let mlbSeasonStats: any = null;
    let mlbGameLog: any = null;

    const shouldTryMlb =
      selected.league === "mlb" ||
      clean.includes("pitcher") ||
      clean.includes("strikeout") ||
      clean.includes("baseball") ||
      clean.includes("mlb") ||
      clean.includes("play for");

    if (
      shouldTryMlb &&
      subject &&
      subject !== userQuery
    ) {
      const peopleData = await fetchJson(
        `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(subject)}&hydrate=currentTeam`,
        600
      );

      if (
        Array.isArray(peopleData?.people) &&
        peopleData.people.length > 0
      ) {
        mlbPerson = peopleData.people[0];
        selected = LEAGUES.mlb;

        const teamId =
          mlbPerson?.currentTeam?.id;

        if (teamId) {
          mlbSchedule = await fetchJson(
            `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&date=${today}`,
            120
          );
        }

        const wantsStats =
          clean.includes("average") ||
          clean.includes("averaging") ||
          clean.includes("stat") ||
          clean.includes("recent") ||
          clean.includes("last ") ||
          clean.includes("strikeout");

        if (
          wantsStats &&
          mlbPerson?.id
        ) {
          [mlbSeasonStats, mlbGameLog] =
            await Promise.all([
              fetchJson(
                `https://statsapi.mlb.com/api/v1/people/${mlbPerson.id}/stats?stats=season&group=pitching&season=${season}`,
                600
              ),
              fetchJson(
                `https://statsapi.mlb.com/api/v1/people/${mlbPerson.id}/stats?stats=gameLog&group=pitching&season=${season}`,
                600
              ),
            ]);
        }
      }
    }

    // -------------------------------------------------------
    // FREE CURRENT SCOREBOARD / STANDINGS
    // -------------------------------------------------------

    const scoreboardUrl =
      `https://site.api.espn.com/apis/site/v2/sports/` +
      `${selected.sport}/${selected.league}/scoreboard?limit=100`;

    const scoreboard =
      await fetchJson(
        scoreboardUrl,
        0
      );

    const wantsStandings =
      clean.includes("standing") ||
      clean.includes("record") ||
      clean.includes("seed");

    const standings = wantsStandings
      ? await fetchJson(
          `https://site.api.espn.com/apis/v2/sports/${selected.sport}/${selected.league}/standings`,
          300
        )
      : null;

    const games = Array.isArray(
      scoreboard?.events
    )
      ? scoreboard.events.map(
          (event: any) => {
            const competition =
              event?.competitions?.[0];

            const competitors =
              competition?.competitors || [];

            const home =
              competitors.find(
                (c: any) =>
                  c?.homeAway === "home"
              );

            const away =
              competitors.find(
                (c: any) =>
                  c?.homeAway === "away"
              );

            let eventDate = "";

            try {
              eventDate =
                new Intl.DateTimeFormat(
                  "en-CA",
                  {
                    timeZone:
                      "America/New_York",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }
                ).format(
                  new Date(event?.date)
                );
            } catch {}

            return {
              id: event?.id || "",
              date: event?.date || "",
              easternDate: eventDate,
              name: event?.name || "",
              status:
                competition?.status?.type
                  ?.detail ||
                competition?.status?.type
                  ?.description ||
                "",
              shortName:
                event?.shortName || "",
              home:
                home?.team?.displayName ||
                "",
              homeName:
                home?.team?.name || "",
              homeAbbreviation:
                home?.team?.abbreviation || "",
              homeId:
                home?.team?.id || "",
              homeScore:
                home?.score || "",
              away:
                away?.team?.displayName ||
                "",
              awayName:
                away?.team?.name || "",
              awayAbbreviation:
                away?.team?.abbreviation || "",
              awayId:
                away?.team?.id || "",
              awayScore:
                away?.score || "",
              situation:
                competition?.situation || null,
            };
          }
        )
      : [];

    const todaysGames =
      games.filter(
        (game: any) =>
          game.easternDate === today
      );

    // -------------------------------------------------------
    // STEP 14 — LIVE GAME COMPANION
    // Match the conversation to today's game and pull a fresh
    // game summary every time the user asks for an update.
    // -------------------------------------------------------

    const activeGame =
      pickActiveGame(
        todaysGames,
        routingText
      ) ||
      discoveredGame ||
      null;

    let liveSummary: any = null;

    if (activeGame?.id) {
      liveSummary = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/${selected.sport}/${selected.league}/summary?event=${activeGame.id}`,
        0
      );
    }

    const liveHeader =
      liveSummary?.header || null;

    const livePlays =
      Array.isArray(liveSummary?.plays)
        ? liveSummary.plays.slice(-15)
        : [];

    const liveBoxscore =
      liveSummary?.boxscore || null;

    const liveLeaders =
      liveSummary?.leaders || null;

    const liveDrives =
      liveSummary?.drives
        ? {
            current:
              liveSummary.drives.current ||
              null,
            previous:
              liveSummary.drives.previous ||
              null,
          }
        : null;

    // -------------------------------------------------------
    // DETERMINISTIC MLB IDENTITY ANSWER
    // Do not let a language model override current MLB identity.
    // -------------------------------------------------------

    const directIdentityQuestion =
      /who does .+ play for/i.test(userQuery) ||
      /what team does .+ play for/i.test(userQuery) ||
      /who is .+ playing for/i.test(userQuery);

    if (
      mlbPerson &&
      directIdentityQuestion
    ) {
      const teamName =
        mlbPerson?.currentTeam?.name ||
        "";

      const teamId =
        String(
          mlbPerson?.currentTeam?.id ||
          ""
        );

      let opponent = "";

      const scheduleGames =
        Array.isArray(
          mlbSchedule?.dates?.[0]?.games
        )
          ? mlbSchedule.dates[0].games
          : [];

      for (const game of scheduleGames) {
        const home =
          game?.teams?.home?.team;

        const away =
          game?.teams?.away?.team;

        if (
          String(home?.id || "") === teamId
        ) {
          opponent =
            String(away?.name || "");
          break;
        }

        if (
          String(away?.id || "") === teamId
        ) {
          opponent =
            String(home?.name || "");
          break;
        }
      }

      let reply =
        `${mlbPerson?.fullName || subject} is with the ${teamName}.`;

      if (
        clean.includes("facing") ||
        clean.includes("tonight") ||
        clean.includes("today") ||
        clean.includes("playing")
      ) {
        reply += opponent
          ? ` They have the ${opponent} ${clean.includes("tonight") ? "tonight" : "today"}.`
          : ` I can verify the team, but I don't have a verified game for them today.`;
      }

      return Response.json({
        reply,
        league: "MLB",
        source: "free-current-data",
      });
    }

    // -------------------------------------------------------
    // GRACE FORMATS THE VERIFIED FREE DATA
    // -------------------------------------------------------

    const aiRes = await fetch(
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
          temperature: 0.1,
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content: `
You are Grace answering CURRENT sports facts.

Today in America/New_York:
${today}

League inferred from current free sports data:
${selected.label}

ABSOLUTE RULES:
- Use ONLY the supplied CURRENT SOURCE DATA.
- Never answer a current roster, team, opponent, injury, starter,
  score, schedule, record, or player-stat question from model memory.
- If current data does not establish the answer, say you cannot verify it.
- Never invent an opponent.
- Never invent a team.
- Never invent a statistic.
- Never substitute an old team or old matchup.
- Current transaction/team information overrides historical information.
- Be brief.
- Sound like Grace, not a database.
- One or two short sentences is normally enough.
- Do not mention APIs, feeds, ESPN, MLB Stats API, providers,
  websites, search engines, or research mechanics.

LIVE GAME COMPANION MODE:
- If ACTIVE GAME is supplied, treat it as the game the user is following.
- Every request is a fresh snapshot of the game right now.
- Never pretend data is continuously streaming between user messages.
- For "update me" or "what's happening", give score and exact game state first.
- For "what happened" or "what just happened", use the newest verified play/event.
- For baseball, include inning/half, outs, runners/base situation when supplied.
- For football, include quarter, clock, possession/down/distance when supplied.
- For basketball/hockey/soccer, include period/half and clock when supplied.
- If asked about a player's live stat, use LIVE BOXSCORE or LIVE LEADERS only.
- If the requested live stat is not in the supplied data, say you cannot verify it yet.
- If the game is final, say it is final.
- If the game has not started, say that instead of pretending it is live.
- Do not repeat a full recap when the user asks a short follow-up.
- Talk like someone watching the game with the user, while staying factually grounded.
              `.trim(),
            },
            {
              role: "user",
              content: `
QUESTION:
${userQuery}

RECENT SPORTS CONVERSATION:
${contextText || "None"}

ACTIVE GAME:
${compact(activeGame, 5000)}

LIVE GAME HEADER:
${compact(liveHeader, 6500)}

LATEST VERIFIED PLAYS / EVENTS:
${compact(livePlays, 8500)}

LIVE BOXSCORE:
${compact(liveBoxscore, 8500)}

LIVE LEADERS:
${compact(liveLeaders, 4500)}

LIVE DRIVE / POSSESSION:
${compact(liveDrives, 4500)}

ATHLETE SEARCH:
${compact(athleteItem || searchData, 6500)}

ATHLETE CURRENT OVERVIEW:
${compact(athleteOverview, 6500)}

ATHLETE CURRENT STATS:
${compact(athleteStats, 5000)}

ATHLETE CURRENT GAME LOG:
${compact(athleteGameLog, 6500)}

MLB CURRENT PLAYER:
${compact(mlbPerson, 4500)}

MLB TODAY SCHEDULE:
${compact(mlbSchedule, 5500)}

MLB CURRENT SEASON STATS:
${compact(mlbSeasonStats, 5000)}

MLB CURRENT GAME LOG:
${compact(mlbGameLog, 6000)}

TODAY'S CURRENT GAMES:
${compact(todaysGames, 7000)}

CURRENT STANDINGS:
${compact(standings, 4500)}

Answer the actual question only.
              `.trim(),
            },
          ],
        }),
      }
    );

    const aiData =
      await aiRes.json();

    const reply =
      aiData?.choices?.[0]?.message
        ?.content?.trim() ||
      "I can't verify that cleanly from the current sports data, so I'm not going to guess.";

    return Response.json({
      reply,
      league: selected.label,
      games: todaysGames,
      activeGame,
      live: Boolean(liveSummary),
      source: "free-current-data",
    });
  } catch (error: any) {
    return Response.json(
      {
        reply:
          "Grace hit a current sports-data glitch: " +
          (error?.message ||
            "Unknown error"),
      },
      { status: 500 }
    );
  }
}
