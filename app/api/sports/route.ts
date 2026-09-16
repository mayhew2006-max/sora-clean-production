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

          // Only use live status as a TIE-BREAKER after the
          // user's words or recent context actually matched this game.
          //
          // Without this guard, generic follow-ups like:
          // "give me the whole game"
          // could randomly select ANY live game and replace the
          // active game Grace was already watching.
          if (
            score > 0 &&
            game.state === "in"
          ) {
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
    const {
      query,
      context,
      activeGameContext,
      useActiveGameContext,
    } = await req.json();

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

    // -------------------------------------------------------
    // STEP 14 — ACTIVE GAME SESSION
    //
    // Once Grace identifies a live game, follow-up questions
    // should NEVER require rediscovering that game from words.
    //
    // This is universal across MLB/NFL/NBA/WNBA/CFB/NHL/SOCCER.
    // -------------------------------------------------------

    const suppliedGame =
      useActiveGameContext &&
      activeGameContext?.game
        ? activeGameContext.game
        : null;

    const suppliedLeague =
      useActiveGameContext &&
      activeGameContext?.league?.sport &&
      activeGameContext?.league?.league
        ? activeGameContext.league
        : null;

    // -------------------------------------------------------
    // STEP 14 — GAME SWITCHING
    //
    // The newest user message gets first shot at naming a NEW game.
    // Example:
    // active game = Giants/Cardinals
    // user = "What's happening in the Blue Jays game?"
    //
    // That must switch Grace to Toronto instead of blindly keeping
    // the previous game locked.
    // -------------------------------------------------------

    const explicitGameDiscovery =
      await discoverLiveGameAcrossLeagues(
        userQuery,
        "",
        today
      );

    if (explicitGameDiscovery?.game) {
      selected =
        explicitGameDiscovery.league;

      discoveredGame =
        explicitGameDiscovery.game;
    } else if (
      suppliedGame &&
      suppliedLeague
    ) {
      // No new team/game was named.
      // Stay on the game we're already watching.
      selected =
        suppliedLeague;

      discoveredGame =
        suppliedGame;
    } else {
      const wantsLiveGame =
        /game|score|what happened|what just happened|what's happening|whats happening|update me|inning|quarter|period|who's up|whos up|how many|whole game|full game|live stats|game stats/i
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
      discoveredGame ||
      pickActiveGame(
        todaysGames,
        routingText
      ) ||
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

    const livePlayerStats =
      Array.isArray(liveBoxscore?.players)
        ? liveBoxscore.players
        : null;

    const latestLivePlay =
      livePlays.length > 0
        ? livePlays[livePlays.length - 1]
        : null;

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
    // STEP 14 — OFFICIAL MLB LIVE GAME DETAIL
    // ESPN is good for cross-sport discovery/play-by-play.
    // MLB live feed gives us deeper baseball game state,
    // including current matchup and complete boxscore data.
    // -------------------------------------------------------

    let mlbLiveFeed: any = null;
    let mlbLiveData: any = null;
    let mlbLinescore: any = null;
    let mlbCurrentPlay: any = null;
    let mlbCurrentPitcher: any = null;
    let mlbCurrentBatter: any = null;
    let mlbCurrentPitcherStats: any = null;
    let mlbCurrentBatterStats: any = null;
    let mlbLiveBoxscore: any = null;
    let mlbTeamStats: any = null;
    let mlbGamePk = "";

    if (
      selected.league === "mlb" &&
      activeGame
    ) {
      const officialSchedule =
        await fetchJson(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team`,
          0
        );

      const officialGames =
        Array.isArray(officialSchedule?.dates)
          ? officialSchedule.dates.flatMap(
              (date: any) =>
                Array.isArray(date?.games)
                  ? date.games
                  : []
            )
          : [];

      const targetHome =
        normalizeGameText(
          activeGame?.home ||
          activeGame?.homeName ||
          ""
        );

      const targetAway =
        normalizeGameText(
          activeGame?.away ||
          activeGame?.awayName ||
          ""
        );

      const nameMatches = (
        one: string,
        two: string
      ) => {
        const a = normalizeGameText(one);
        const b = normalizeGameText(two);

        if (!a || !b) return false;

        if (
          a === b ||
          a.includes(b) ||
          b.includes(a)
        ) return true;

        const aLast =
          a.split(" ").filter(Boolean).pop();

        const bLast =
          b.split(" ").filter(Boolean).pop();

        return Boolean(
          aLast &&
          bLast &&
          aLast === bLast
        );
      };

      let officialGame: any = null;

      for (const game of officialGames) {
        const homeName =
          String(
            game?.teams?.home?.team?.name ||
            ""
          );

        const awayName =
          String(
            game?.teams?.away?.team?.name ||
            ""
          );

        if (
          nameMatches(targetHome, homeName) &&
          nameMatches(targetAway, awayName)
        ) {
          officialGame = game;
          break;
        }
      }

      if (officialGame?.gamePk) {
        mlbGamePk =
          String(officialGame.gamePk);

        mlbLiveFeed =
          await fetchJson(
            `https://statsapi.mlb.com/api/v1.1/game/${mlbGamePk}/feed/live`,
            0
          );

        mlbLiveData =
          mlbLiveFeed?.liveData ||
          null;

        mlbLinescore =
          mlbLiveData?.linescore ||
          null;

        mlbCurrentPlay =
          mlbLiveData?.plays?.currentPlay ||
          null;

        mlbLiveBoxscore =
          mlbLiveData?.boxscore ||
          null;

        mlbCurrentPitcher =
          mlbCurrentPlay?.matchup?.pitcher ||
          null;

        mlbCurrentBatter =
          mlbCurrentPlay?.matchup?.batter ||
          null;

        const pitcherId =
          mlbCurrentPitcher?.id;

        const batterId =
          mlbCurrentBatter?.id;

        if (
          pitcherId &&
          mlbLiveBoxscore
        ) {
          mlbCurrentPitcherStats =
            mlbLiveBoxscore?.teams?.home
              ?.players?.[`ID${pitcherId}`]
              ?.stats?.pitching ||
            mlbLiveBoxscore?.teams?.away
              ?.players?.[`ID${pitcherId}`]
              ?.stats?.pitching ||
            null;
        }

        if (
          batterId &&
          mlbLiveBoxscore
        ) {
          mlbCurrentBatterStats =
            mlbLiveBoxscore?.teams?.home
              ?.players?.[`ID${batterId}`]
              ?.stats?.batting ||
            mlbLiveBoxscore?.teams?.away
              ?.players?.[`ID${batterId}`]
              ?.stats?.batting ||
            null;
        }

        mlbTeamStats = {
          away:
            mlbLiveBoxscore?.teams?.away
              ?.teamStats ||
            null,
          home:
            mlbLiveBoxscore?.teams?.home
              ?.teamStats ||
            null,
        };
      }
    }

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
          temperature: 0.65,
          max_tokens: 1600,
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
- Sound like Grace, not a database.
- For ordinary sports lookups that are NOT about an active game,
  stay brief.
- For an ACTIVE LIVE GAME, DO NOT reduce the answer to one or two
  sentences. The user wants to feel like Grace is sitting beside them
  watching the whole damn game.
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

LIVE PLAYER-STAT FOLLOWUPS:
- Use LIVE PLAYER STATS first for questions about a player's current game total.

PLAYER CONTINUITY:
- Resolve "he", "him", "his", "she", "her", and similar pronouns from
  the immediately preceding sports conversation whenever the referent
  is clear.
- If Grace just answered "Dylan Smith is pitching" and the user asks
  "what's his line?", "his" means Dylan Smith.
- Do NOT suddenly act like Grace forgot the player she named one message ago.
- For baseball, when the immediately preceding question was about who is
  pitching and CURRENT MLB PITCHER is supplied, a follow-up asking
  "his line", "how many Ks", "pitch count", "how's he doing", etc.
  refers to CURRENT MLB PITCHER unless another player was explicitly named.
- For other sports, use the immediately discussed player when the conversation
  clearly establishes one.
- Ask for clarification ONLY when two or more players are genuinely plausible.

- Use LIVE PLAYER STATS first for questions about a player's current game total.
- Carry player identity forward from recent conversation when it is clear.
- "How many Ks does he have now?" means that previously discussed pitcher's strikeouts.
- "How many strikeouts does [player] have?" means that player's pitching strikeouts.
- If the user simply asks "How many strikeouts?" during a baseball game:
  1. If one active/recent pitcher is clearly identifiable from the latest play,
     conversation, or live player stats, answer that pitcher's strikeout total.
  2. Otherwise ask which pitcher they mean.
- NEVER silently answer with the batting team's total strikeouts unless the user
  explicitly asks for team strikeouts, hitter strikeouts, batters struck out,
  or the offensive team total.
- The same principle applies to ambiguous player stats such as points, rebounds,
  assists, yards, receptions, goals, saves, hits, and RBIs.
- If two or more players could reasonably be meant, ask one short clarification
  instead of guessing.

BIG-PLAY COMPANION REACTIONS:
- Use LATEST VERIFIED PLAY / EVENT to recognize meaningful moments.
- A home run, touchdown, goal, turnover, lead change, bases-loaded situation,
  late scoring play, big strikeout, major defensive play, or similar moment
  can get one short natural reaction.
- React AFTER verifying what happened.
- Never invent excitement about an event that is not present in current data.
- Keep reactions concise so the actual score/game state remains clear.

GRACE'S SPORTS PERSONALITY:
- Grace is the same foul-mouthed Boston woman in sports mode.
- She is sharp, funny, sarcastic, conversational, and comfortable swearing.
- Natural lines like "holy shit", "that's huge", "what the fuck was that",
  "they're in some shit now", or "that was nasty" are welcome when the moment fits.
- Do not force profanity into every update.
- Do not use fake phonetic Boston spelling.
- Sound like someone watching the game beside the user, not a broadcaster,
  customer-service bot, or statistics database.
- Facts always come before personality.

FINAL LIVE-SPORTS VOICE:
When ACTIVE GAME exists, the final answer MUST sound like Grace:
a foul-mouthed, funny, sarcastic Boston bartender watching the game
beside the user.

Keep normal readable spelling.
Do not fake the accent in text.
Sage handles the spoken Boston accent.

Natural profanity is welcome when it fits.
Do not turn useful game information into generic polite filler.
Do not recommend another sports app when live data exists.


FULL LIVE GAME BOARD:
When ACTIVE GAME is present, Grace should maintain awareness of the
ENTIRE GAME, not only the specific player mentioned by the user.

CRITICAL LIVE-GAME RULE:
If ACTIVE GAME exists, Grace MUST answer from whatever verified live
information is available.

NEVER tell the user:
- check another sports app
- check another website
- I cannot find live updates
- I cannot give you the game
- I cannot find a full recap

when ACTIVE GAME and current live data are already supplied.

"Give me the whole game", "give me the full game", "give me everything",
"give me all the stats", and similar wording mean:

GIVE A COMPLETE CURRENT GAME SNAPSHOT FROM ALL VERIFIED DATA AVAILABLE NOW.

It does NOT mean the user is demanding a transcript of every play since
the game started.

If one particular statistic is unavailable, omit that statistic or say
only that specific stat is unavailable. NEVER throw away the rest of
the live game because one field is missing.

When ACTIVE GAME is present, Grace should maintain awareness of the
ENTIRE GAME, not only the specific player mentioned by the user.

For a broad request such as:
- what's happening
- update me
- what's going on
- give me the game
- give me the whole game
- give me the full game
- give me everything
- give me all the stats
- what just happened

give a useful whole-game snapshot containing as much VERIFIED
information as currently available:

1. SCORE + GAME STATE
   - score
   - inning/quarter/period/half
   - clock if applicable
   - outs/down-distance/possession/base situation when available

2. WHO IS ACTIVE RIGHT NOW
   - pitcher + batter for baseball
   - possession/QB/ball carrier context for football
   - key on-court/on-ice context when supplied

3. TEAM GAME TOTALS
   - baseball: runs, hits, errors when available
   - football: major team totals when available
   - basketball: shooting/rebounding/turnover totals when available
   - hockey/soccer: shots, saves, possession or other supplied totals

4. KEY PLAYER STATS — BOTH TEAMS
   Do not focus only on whoever the user last mentioned.
   Surface the most relevant verified performers for BOTH sides.

5. RECENT ACTION
   Summarize the newest meaningful plays/events.
   Do not dump a giant raw play-by-play list.

6. GAME FLOW
   Mention lead changes, rallies, pitching changes, scoring runs,
   turnovers, momentum swings, or other meaningful verified context.

7. FULL STAT BOARD
   When the user asks for the whole/full game, include substantially
   more detail than a normal update.

   BASEBALL:
   - R/H/E for both teams when available
   - current pitcher and batter
   - pitcher live line
   - important hitters for BOTH clubs
   - runs/hits/RBIs/home runs/strikeouts/walks when supplied
   - pitching changes
   - runners and outs
   - recent meaningful plays

   FOOTBALL:
   - score, quarter, clock
   - possession, down and distance
   - QB passing line
   - leading rushers/receivers
   - turnovers
   - major team statistics
   - recent drives/scoring plays

   BASKETBALL:
   - score, period, clock
   - leading scorers
   - rebounds/assists
   - shooting numbers when supplied
   - turnovers
   - major team totals
   - recent scoring run / important plays

   HOCKEY:
   - score, period, clock
   - shots
   - goalie saves
   - goal scorers
   - penalties/power plays when supplied
   - important recent events

   SOCCER:
   - score and match time
   - scorers
   - shots/shots on target when supplied
   - possession when supplied
   - cards/substitutions
   - meaningful recent events

   Use the available data. Do not refuse the whole update merely because
   every possible statistic is not present.

For a narrow follow-up like:
"How many strikeouts does he have?"

Answer that question FIRST, but then give a compact game snapshot so
the user still knows what is happening around that player.

MLB PRIORITY:
- OFFICIAL MLB LIVE DATA outranks generic game data whenever supplied.
- CURRENT MLB PITCHER and CURRENT MLB BATTER are authoritative when present.
- Use CURRENT MLB PITCHER STATS for his live pitching line.
- A pitcher's "line" means report as many verified current-game fields
  as are supplied, especially:
  innings pitched, hits, runs, earned runs, walks, strikeouts,
  pitches thrown and strikes.
- If CURRENT MLB PITCHER and CURRENT MLB PITCHER STATS are supplied,
  NEVER say Grace cannot figure out his pitching line.
- Use CURRENT MLB BATTER STATS for his live batting line.
- Use MLB LINESCORE for inning, outs, runners and R/H/E.
- Use MLB LIVE BOXSCORE to identify key performers and pitching changes.
- Never say the current pitcher cannot be found when CURRENT MLB PITCHER
  is supplied.

BOSTON BAR COMPANION:
Grace should feel like a foul-mouthed Boston bartender watching the
game right beside the user.

BOSTON AUTHENTICITY:
- Do NOT use British/Australian expressions such as "bloody hell",
  "mate", "cheers mate", etc.
- Do NOT use "jabroni".
- Do NOT manufacture stereotypical Boston catchphrases.
- Do NOT announce that Grace is Bostonian.
- Use normal readable American English.
- Let Sage provide the spoken accent.
- The Boston feel should come from attitude, rhythm, sarcasm,
  sports-bar energy, foul language and ball-busting.

Think:
- neighborhood Boston bar
- game on the TV
- bartender knows sports
- sarcastic
- funny
- opinionated about the moment
- swears naturally
- busts balls
- reacts when something big happens

Examples of ENERGY, not facts to copy:
"Holy shit, now we're cookin'."
"That was fuckin' filthy."
"They're in some shit here — two on, one out."
"Jesus Christ, he got away with that one."
"That's a huge fuckin' out."

IMPORTANT:
- Do NOT fake Boston pronunciation in text.
- Do not write cah, pahk, bah, etc.
- Sage handles the actual accent.
- Keep normal readable spelling.
- Do not force profanity into every sentence.
- Do not turn every update into a comedy routine.
- Never allow personality to alter a score, stat, player, inning,
  clock, event or other factual detail.
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

LATEST VERIFIED PLAY / EVENT:
${compact(latestLivePlay, 4500)}

LATEST VERIFIED PLAYS / EVENTS:
${compact(livePlays, 8500)}

LIVE PLAYER STATS:
${compact(livePlayerStats, 12000)}

LIVE BOXSCORE:
${compact(liveBoxscore, 8500)}

LIVE LEADERS:
${compact(liveLeaders, 4500)}

LIVE DRIVE / POSSESSION:
${compact(liveDrives, 4500)}

FULL LIVE GAME DETAIL:
${compact(liveSummary, 18000)}

OFFICIAL MLB GAME ID:
${mlbGamePk || "None"}

OFFICIAL MLB LINESCORE:
${compact(mlbLinescore, 8000)}

CURRENT MLB PLAY:
${compact(mlbCurrentPlay, 8000)}

CURRENT MLB PITCHER:
${compact(mlbCurrentPitcher, 3000)}

CURRENT MLB PITCHER STATS:
${compact(mlbCurrentPitcherStats, 5000)}

CURRENT MLB BATTER:
${compact(mlbCurrentBatter, 3000)}

CURRENT MLB BATTER STATS:
${compact(mlbCurrentBatterStats, 5000)}

MLB TEAM GAME STATS:
${compact(mlbTeamStats, 8000)}

MLB LIVE BOXSCORE:
${compact(mlbLiveBoxscore, 18000)}

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

    if (!aiRes.ok) {
      console.error(
        "Grace sports formatter failed:",
        aiRes.status,
        aiData?.error || aiData
      );
    }

    // -------------------------------------------------------
    // STEP 14 — DETERMINISTIC LIVE-GAME SAFETY NET
    //
    // Live facts should NEVER depend on the language model
    // successfully formatting them.
    // -------------------------------------------------------

    const q =
      userQuery.toLowerCase();

    let deterministicLiveReply = "";

    if (activeGame) {
      const awayName =
        activeGame?.away ||
        activeGame?.awayName ||
        "Away";

      const homeName =
        activeGame?.home ||
        activeGame?.homeName ||
        "Home";

      const awayScore =
        String(activeGame?.awayScore ?? "");

      const homeScore =
        String(activeGame?.homeScore ?? "");

      const status =
        String(activeGame?.status || "");

      const scoreText =
        awayScore !== "" &&
        homeScore !== ""
          ? `${awayName} ${awayScore}, ${homeName} ${homeScore}`
          : `${awayName} vs. ${homeName}`;

      const latestText =
        String(
          mlbCurrentPlay?.result?.description ||
          latestLivePlay?.text ||
          latestLivePlay?.description ||
          ""
        ).trim();

      // =====================================================
      // MLB — DEEP LIVE FALLBACK
      // =====================================================

      if (selected.league === "mlb") {
        const pitcherName =
          String(
            mlbCurrentPitcher?.fullName ||
            mlbCurrentPitcher?.name ||
            ""
          ).trim();

        const batterName =
          String(
            mlbCurrentBatter?.fullName ||
            mlbCurrentBatter?.name ||
            ""
          ).trim();

        const ps =
          mlbCurrentPitcherStats || {};

        const pitcherParts = [];

        if (ps?.inningsPitched != null)
          pitcherParts.push(
            `${ps.inningsPitched} IP`
          );

        if (ps?.hits != null)
          pitcherParts.push(
            `${ps.hits} H`
          );

        if (ps?.runs != null)
          pitcherParts.push(
            `${ps.runs} R`
          );

        if (ps?.earnedRuns != null)
          pitcherParts.push(
            `${ps.earnedRuns} ER`
          );

        if (ps?.baseOnBalls != null)
          pitcherParts.push(
            `${ps.baseOnBalls} BB`
          );

        if (ps?.strikeOuts != null)
          pitcherParts.push(
            `${ps.strikeOuts} K`
          );

        if (ps?.pitchesThrown != null)
          pitcherParts.push(
            `${ps.pitchesThrown} pitches`
          );

        if (ps?.strikes != null)
          pitcherParts.push(
            `${ps.strikes} strikes`
          );

        const pitcherLine =
          pitcherParts.join(", ");

        const inning =
          mlbLinescore?.currentInning;

        const half =
          String(
            mlbLinescore?.inningHalf ||
            mlbLinescore?.isTopInning
              ? "top"
              : ""
          );

        const inningState =
          inning
            ? `${mlbLinescore?.inningHalf || ""} ${inning}`.trim()
            : status;

        const outs =
          mlbLinescore?.outs;

        const offense =
          mlbLinescore?.offense || {};

        const runners = [];

        if (offense?.first)
          runners.push("first");

        if (offense?.second)
          runners.push("second");

        if (offense?.third)
          runners.push("third");

        const runnerText =
          runners.length
            ? `Runners on ${runners.join(" and ")}.`
            : "Bases empty.";

        const awayLine =
          mlbLinescore?.teams?.away ||
          {};

        const homeLine =
          mlbLinescore?.teams?.home ||
          {};

        const rhe =
          (
            awayLine?.runs != null ||
            homeLine?.runs != null
          )
            ? `${awayName}: ${awayLine?.runs ?? awayScore} R, ${awayLine?.hits ?? "?"} H, ${awayLine?.errors ?? "?"} E. ` +
              `${homeName}: ${homeLine?.runs ?? homeScore} R, ${homeLine?.hits ?? "?"} H, ${homeLine?.errors ?? "?"} E.`
            : "";

        const gameState = [
          scoreText,
          inningState,
          outs != null
            ? `${outs} out${outs === 1 ? "" : "s"}`
            : "",
        ]
          .filter(Boolean)
          .join(" — ");

        // -----------------------------
        // WHO'S PITCHING
        // -----------------------------

        if (
          /who'?s pitching|who is pitching/.test(q)
        ) {
          deterministicLiveReply =
            pitcherName
              ? `${pitcherName} is pitching right now.${
                  pitcherLine
                    ? ` His line: ${pitcherLine}.`
                    : ""
                } ${gameState}.`
              : `I have ${gameState}, but the current pitcher isn't identified in the live data yet.`;
        }

        // -----------------------------
        // HIS LINE / PITCHING LINE
        // -----------------------------

        else if (
          /his line|pitching line|how.*pitcher|how.*he doing|how many k|strikeouts|pitch count/.test(q)
        ) {
          deterministicLiveReply =
            pitcherName && pitcherLine
              ? `${pitcherName}: ${pitcherLine}. ${gameState}.`
              : pitcherName
                ? `${pitcherName} is pitching, but his complete live pitching line isn't populated yet. ${gameState}.`
                : `The current pitching line isn't identified yet. ${gameState}.`;
        }

        // -----------------------------
        // WHAT JUST HAPPENED
        // -----------------------------

        else if (
          /what just happened|what happened|what happened now/.test(q)
        ) {
          deterministicLiveReply =
            latestText
              ? `${latestText} ${gameState}.`
              : `${gameState}. ${runnerText}`;
        }

        // -----------------------------
        // WHOLE DAMN GAME
        // -----------------------------

        else {
          const pieces = [
            `Alright, here's the damn game: ${gameState}.`,
            rhe,
            pitcherName
              ? `On the mound: ${pitcherName}${pitcherLine ? ` — ${pitcherLine}` : ""}.`
              : "",
            batterName
              ? `At the plate: ${batterName}.`
              : "",
            outs != null
              ? `${outs} out${outs === 1 ? "" : "s"}. ${runnerText}`
              : runnerText,
            latestText
              ? `Latest: ${latestText}`
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          deterministicLiveReply =
            pieces.trim();
        }
      }

      // =====================================================
      // ALL OTHER LIVE SPORTS
      // =====================================================

      else {
        const latest =
          String(
            latestLivePlay?.text ||
            latestLivePlay?.description ||
            ""
          ).trim();

        const pieces = [
          `Alright, here's the damn game: ${scoreText}${status ? ` — ${status}` : ""}.`,
          latest
            ? `Latest: ${latest}`
            : "",
        ];

        deterministicLiveReply =
          pieces
            .filter(Boolean)
            .join(" ");
      }
    }

    let reply =
      aiData?.choices?.[0]?.message
        ?.content?.trim() ||
      deterministicLiveReply ||
      "I can't verify that cleanly from the current sports data, so I'm not going to guess.";

    // If the model gives us one of the useless refusal-style answers
    // despite having a verified active game, replace it with the
    // deterministic live response.
    if (
      activeGame &&
      deterministicLiveReply &&
      (
        /check.*sports app/i.test(reply) ||
        /check.*website/i.test(reply) ||
        /couldn'?t find.*live/i.test(reply) ||
        /cannot find.*live/i.test(reply) ||
        /can't verify/i.test(reply) ||
        /cannot verify/i.test(reply) ||
        /not able to find/i.test(reply) ||
        /not going to guess/i.test(reply)
      )
    ) {
      reply =
        deterministicLiveReply;
    }

   
 return Response.json({
      reply,
      league: selected.label,
      games: todaysGames,
      activeGame,
      activeLeague: {
        sport: selected.sport,
        league: selected.league,
        label: selected.label,
      },
      live: Boolean(
        liveSummary ||
        mlbLiveFeed
      ),
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
