// /lib/contests/feedContestOdds.ts
// Shared vocabulary for the PRICED half of the Feed contest flow.
//
// `feedContestCatalog.ts` is the CREATE wizard's side: it reads
// `schedules-for-all-tz` (unpriced, range-addressable) so an organizer can pick
// games days ahead of the books posting a line. This module is the ENTRY side:
// once a contest exists, its slate is a frozen list of event ids, and the entry
// builder needs the markets for exactly those ids and nothing else — which is
// what `schedules-with-odds-by-events` answers.
//
// The two must not be merged. The wizard asks "which games are there?" over a
// date range; the entry screen asks "what can I bet on these specific games?".

import type {
    FeedContestGameOddsEntry,
    FeedContestGameOddsSource,
    FeedContestGameSnapshot,
    FeedContestOddsEvent,
    FeedContestOddsGroup,
    FeedContestSportsbook,
    OddsObject,
} from "@/lib/interfaces/interfaces";
import { FEED_CONTEST_SPORTS, type FeedContestSport } from "./feedContestCatalog";

/** MAX_EVENT_IDS — the per-league cap the endpoint enforces on `event_ids`. */
export const MAX_EVENT_IDS_PER_LEAGUE = 25;

/** MAX_EVENT_IDS_ACROSS_LEAGUES — the multi-league route's total budget. */
export const MAX_EVENT_IDS_ACROSS_LEAGUES = 50;

/**
 * EVENT_ID_RE, mirrored. An id that fails it is a 400 for the WHOLE request, not
 * a miss, so unusable ids are filtered out client-side and reported as missing.
 * `persistableGameId` can mint `map:NFL:SPORTSDATAIO:123` keys, whose colons
 * fail this — see lib/schedules/eventIdentity.ts.
 */
export const EVENT_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

export const isRequestableEventId = (value: unknown): value is string =>
    typeof value === "string" && EVENT_ID_RE.test(value);

/**
 * The OddsBlaze league id behind each contest sport, and the per-competition
 * route that answers for it.
 *
 * Soccer is the awkward one: `eligible_games_json` records only the SPORT
 * ("Soccer"), never which competition a game belongs to, so a soccer slate has
 * to be offered to all three competitions and merged. Everything else is a
 * single league id, which is why those five can share one multi-league call.
 */
export const FEED_CONTEST_ODDS_FEEDS: Readonly<
    Record<FeedContestSport, readonly { league: string; competition: string; path: string }[]>
> = {
    NFL: [
        {
            league: "nfl",
            competition: "NFL",
            path: "/leagues/nfl/schedules-with-odds-by-events",
        },
    ],
    NBA: [
        {
            league: "nba",
            competition: "NBA",
            path: "/leagues/nba/schedules-with-odds-by-events",
        },
    ],
    NCAAB: [
        {
            league: "ncaab",
            competition: "NCAAB",
            path: "/leagues/ncaab/schedules-with-odds-by-events",
        },
    ],
    NHL: [
        {
            league: "nhl",
            competition: "NHL",
            path: "/leagues/nhl/schedules-with-odds-by-events",
        },
    ],
    MLB: [
        {
            league: "mlb",
            competition: "MLB",
            path: "/leagues/mlb/schedules-with-odds-by-events",
        },
    ],
    Soccer: [
        {
            league: "england-premier-league",
            competition: "Premier League",
            path: "/leagues/soccer/england-premier-league-schedules-with-odds-by-events",
        },
        {
            league: "germany-bundesliga",
            competition: "Bundesliga",
            path: "/leagues/soccer/germany-bundesliga-schedules-with-odds-by-events",
        },
        {
            league: "fifa-world-cup",
            competition: "FIFA World Cup",
            path: "/leagues/soccer/fifa-world-cup-schedules-with-odds-by-events",
        },
    ],
};

/** The one call that spans leagues: `?events=<league>:<id>,…`. */
export const MULTI_LEAGUE_ODDS_BY_EVENTS_PATH = "/leagues/schedules-with-odds-by-events";

/** One callable league feed: which league id it answers for, and where it lives. */
export type ContestOddsFeed = { league: string; competition: string; path: string };

/**
 * The odds-BY-MATCH-ID route behind each contest sport — the FULL market board
 * for one game, because those controllers send no `main` filter upstream.
 *
 * Keyed by sportsbook because the book is baked into the PATH on this family:
 * there is no `sportsbook` query param anywhere in it. Which is also why some
 * cells are empty — NFL, NHL and MLB have no DraftKings by-match-id route at
 * all. An empty cell means "no enrichment for this sport on this book", and the
 * saga fails closed rather than guessing a URL: the un-suffixed `/odds` routes
 * hardcode FanDuel, so pointing a DraftKings contest at one would quietly show
 * a board priced by the other book.
 *
 * Soccer repeats the batch read's problem — `eligible_games_json` records only
 * sport "Soccer" — so a soccer game has to be offered to each competition until
 * one answers.
 */
export const FEED_CONTEST_MATCH_ODDS_FEEDS: Readonly<
    Record<FeedContestSport, Readonly<Partial<Record<FeedContestSportsbook, readonly ContestOddsFeed[]>>>>
> = {
    NFL: {
        fanduel: [{ league: "nfl", competition: "NFL", path: "/leagues/nfl/odds" }],
    },
    NBA: {
        // NBA has no plain `/odds` — only the two book-suffixed routes.
        fanduel: [{ league: "nba", competition: "NBA", path: "/leagues/nba/odds-fanduel" }],
        draftkings: [
            { league: "nba", competition: "NBA", path: "/leagues/nba/odds-draftkings" },
        ],
    },
    NCAAB: {
        // `/odds` and `/odds-fanduel` are the same implementation writing two
        // cache entries; `/odds` is preferred so NCAAB warms the same one as
        // NFL/NHL/MLB rather than a duplicate.
        fanduel: [{ league: "ncaab", competition: "NCAAB", path: "/leagues/ncaab/odds" }],
        draftkings: [
            { league: "ncaab", competition: "NCAAB", path: "/leagues/ncaab/odds-draftkings" },
        ],
    },
    NHL: {
        fanduel: [{ league: "nhl", competition: "NHL", path: "/leagues/nhl/odds" }],
    },
    MLB: {
        fanduel: [{ league: "mlb", competition: "MLB", path: "/leagues/mlb/odds" }],
    },
    Soccer: {
        fanduel: [
            {
                league: "england-premier-league",
                competition: "Premier League",
                path: "/leagues/soccer/england-premier-league-odds-fanduel",
            },
            {
                league: "germany-bundesliga",
                competition: "Bundesliga",
                path: "/leagues/soccer/germany-bundesliga-odds-fanduel",
            },
            {
                league: "fifa-world-cup",
                competition: "FIFA World Cup",
                path: "/leagues/soccer/fifa-world-cup-odds-fanduel",
            },
        ],
        draftkings: [
            {
                league: "england-premier-league",
                competition: "Premier League",
                path: "/leagues/soccer/england-premier-league-odds-draftkings",
            },
            {
                league: "germany-bundesliga",
                competition: "Bundesliga",
                path: "/leagues/soccer/germany-bundesliga-odds-draftkings",
            },
            {
                league: "fifa-world-cup",
                competition: "FIFA World Cup",
                path: "/leagues/soccer/fifa-world-cup-odds-draftkings",
            },
        ],
    },
};

/** The by-match-id routes for one slate row. EMPTY means "cannot be enriched". */
export const matchOddsFeedsFor = (
    sport: string,
    sportsbook: FeedContestSportsbook = "fanduel"
): readonly ContestOddsFeed[] => {
    const normalized = normalizeContestSport(sport);
    if (!normalized) return [];
    return FEED_CONTEST_MATCH_ODDS_FEEDS[normalized]?.[sportsbook] ?? [];
};

/** The by-events routes for one slate row — the same feeds the batch read uses. */
export const oddsByEventsFeedsFor = (sport: string): readonly ContestOddsFeed[] => {
    const normalized = normalizeContestSport(sport);
    if (!normalized) return [];
    return FEED_CONTEST_ODDS_FEEDS[normalized] ?? [];
};

/**
 * Soccer needs one call per competition because a slate row cannot say which of
 * the three a game is in. The other five are unambiguous, so they travel
 * together on the multi-league route.
 */
export const isAmbiguousOddsSport = (sport: string): boolean =>
    normalizeContestSport(sport) === "Soccer";

/** "soccer" / "SOCCER" → "Soccer"; "nfl" → "NFL". Unknown sports return null. */
export const normalizeContestSport = (sport: string): FeedContestSport | null => {
    const trimmed = String(sport ?? "").trim();
    if (!trimmed) return null;
    const candidate = trimmed.toLowerCase() === "soccer" ? "Soccer" : trimmed.toUpperCase();
    return (FEED_CONTEST_SPORTS as readonly string[]).includes(candidate)
        ? (candidate as FeedContestSport)
        : null;
};

/**
 * Identifies one (contest, book, slate) odds request. Sorted, so the same slate
 * in a different order is the same key — and scoped by contest id, so a stale
 * answer can never be read as another contest's markets.
 */
export const feedContestOddsRequestKey = (
    contestId: string,
    sportsbook: string,
    gameIds: readonly string[]
) => `${contestId}|${sportsbook}|${[...gameIds].sort().join(",")}`;

/** Splits ids into chunks the endpoint will accept. */
export const chunkEventIds = (
    ids: readonly string[],
    size: number = MAX_EVENT_IDS_PER_LEAGUE
): string[][] => {
    const chunks: string[][] = [];
    for (let index = 0; index < ids.length; index += size) {
        chunks.push(ids.slice(index, index + size));
    }
    return chunks;
};

export type SlateBySport = {
    sport: FeedContestSport;
    gameIds: string[];
};

/**
 * Groups a contest's slate by sport, dropping ids the endpoint could not accept.
 * Order follows FEED_CONTEST_SPORTS so two identical slates always request in
 * the same order — which keeps the request key and the merged groups stable.
 */
export const groupSlateBySport = (
    games: readonly FeedContestGameSnapshot[]
): { bySport: SlateBySport[]; unrequestableGameIds: string[] } => {
    const bySport = new Map<FeedContestSport, string[]>();
    const unrequestable: string[] = [];

    for (const game of games) {
        const gameId = typeof game?.game_id === "string" ? game.game_id.trim() : "";
        if (!gameId) continue;

        const sport = normalizeContestSport(game?.sport ?? "");
        // An unknown sport has no league to ask, and a `map:`-style key fails the
        // endpoint's id grammar. Both are reported as missing rather than sent —
        // one bad token 400s the entire request.
        if (!sport || !isRequestableEventId(gameId)) {
            unrequestable.push(gameId);
            continue;
        }

        const existing = bySport.get(sport);
        if (existing) {
            if (!existing.includes(gameId)) existing.push(gameId);
        } else {
            bySport.set(sport, [gameId]);
        }
    }

    return {
        bySport: FEED_CONTEST_SPORTS.filter((sport) => bySport.has(sport)).map((sport) => ({
            sport,
            gameIds: bySport.get(sport) ?? [],
        })),
        unrequestableGameIds: unrequestable,
    };
};

/* ----------------------------------------------------------------------------
 * From the merged groups to what the builder renders.
 * -------------------------------------------------------------------------- */

/** One selectable matchup: the contest's own slate row, joined to its markets. */
export type ContestOddsGame = {
    /** The id the ENTRY submits — always the contest's stored `game_id`. */
    id: string;
    sport: FeedContestSport;
    competition: string;
    startsAt: string;
    live: boolean;
    homeTeam: { id: string; name: string; abbreviation?: string };
    awayTeam: { id: string; name: string; abbreviation?: string };
    /** FALSE when no league answered with markets for this id. */
    hasOdds: boolean;
    /** The priced event, when one came back. */
    event: FeedContestOddsEvent | null;
};

/** One pickable line. `id` is the book's selection id — the grading key. */
export type ContestOddsSelection = {
    id: string;
    gameId: string;
    sport: FeedContestSport;
    marketName: string;
    selectionName: string;
    americanOdds: number;
    side: string | null;
    line: number | null;
    playerId: string | null;
    playerName: string | null;
    teamId: string | null;
    sameGameEligible: boolean;
    main: boolean;
    /** The raw odd, kept so the leg payload never has to re-derive anything. */
    odd: OddsObject;
};

/** "+264" / "-110" / 264 → 264. Anything not a non-zero integer returns null. */
export const parseAmericanPrice = (price: unknown): number | null => {
    if (typeof price === "number") {
        return Number.isInteger(price) && price !== 0 ? price : null;
    }
    if (typeof price !== "string") return null;
    const trimmed = price.trim().replace(/^\+/, "");
    if (!/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed !== 0 ? parsed : null;
};

const teamIdFor = (event: FeedContestOddsEvent, odd: OddsObject): string | null => {
    const name = (odd.selection?.name ?? odd.name ?? "").toLowerCase();
    if (!name) return null;
    const home = event.teams?.home;
    const away = event.teams?.away;
    if (home?.name && name.includes(home.name.toLowerCase())) return home.id;
    if (away?.name && name.includes(away.name.toLowerCase())) return away.id;
    return null;
};

/**
 * `side` as the builder's preview grid understands it. The feed says "Over" /
 * "Under" explicitly and leaves team sides to the selection name, so a home/away
 * side is derived from the team match.
 */
const sideFor = (event: FeedContestOddsEvent, odd: OddsObject): string | null => {
    const explicit = odd.selection?.side;
    if (explicit) return String(explicit).toLowerCase();

    const name = (odd.selection?.name ?? odd.name ?? "").trim().toLowerCase();
    if (!name) return null;
    if (name === "draw" || name === "tie") return "draw";

    const home = event.teams?.home;
    const away = event.teams?.away;
    if (home?.name && name.includes(home.name.toLowerCase())) return "home";
    if (away?.name && name.includes(away.name.toLowerCase())) return "away";
    return null;
};

/**
 * Every pickable line on one priced event, keyed by the CONTEST's game id.
 *
 * Odds without a usable American price are dropped: the entry endpoint rejects a
 * leg whose `american_odds` is not a non-zero integer, so offering one would
 * build an entry the server refuses.
 */
export const selectionsForEvent = (
    game: ContestOddsGame
): ContestOddsSelection[] => {
    const event = game.event;
    if (!event || !Array.isArray(event.odds)) return [];

    return event.odds.flatMap((odd) => {
        const americanOdds = parseAmericanPrice(odd?.price);
        if (americanOdds === null || !odd?.id || !odd?.market) return [];

        const selectionName = (odd.selection?.name ?? odd.name ?? "").trim();
        if (!selectionName) return [];

        // Typed as a number, but the feed has been seen to send "-1.5" — read it
        // as unknown so a stringified line still becomes a usable threshold
        // rather than silently dropping the leg's point value.
        const rawLine: unknown = odd.selection?.line;
        const line =
            typeof rawLine === "number" && Number.isFinite(rawLine)
                ? rawLine
                : typeof rawLine === "string" && rawLine.trim() && Number.isFinite(Number(rawLine))
                  ? Number(rawLine)
                  : null;

        return [
            {
                id: odd.id,
                gameId: game.id,
                sport: game.sport,
                marketName: odd.market,
                selectionName,
                americanOdds,
                side: sideFor(event, odd),
                line,
                playerId: odd.player?.id ?? null,
                playerName: odd.player?.name ?? null,
                teamId: odd.player?.team?.id ?? teamIdFor(event, odd),
                sameGameEligible: Boolean(odd.sgp),
                main: Boolean(odd.main),
                odd,
            },
        ];
    });
};

/**
 * Joins a contest's frozen slate to the odds that came back.
 *
 * The SLATE is the authority for which games exist, their kickoff, their teams
 * and their sport — those are contest facts, frozen when the organizer created
 * it, and exactly what the backend validates a leg against. The odds feed only
 * contributes markets. A slate row with no priced event still renders, with
 * `hasOdds: false`, so a member sees the whole slate the organizer built rather
 * than silently fewer games.
 */
export const buildContestOddsGames = (
    games: readonly FeedContestGameSnapshot[],
    groups: readonly FeedContestOddsGroup[]
): ContestOddsGame[] => {
    const eventById = new Map<string, { event: FeedContestOddsEvent; competition: string }>();
    for (const group of groups) {
        for (const event of group.events ?? []) {
            if (!event?.id || eventById.has(event.id)) continue;
            eventById.set(event.id, { event, competition: group.competition });
        }
    }

    return games.flatMap((game) => {
        const gameId = typeof game?.game_id === "string" ? game.game_id.trim() : "";
        const sport = normalizeContestSport(game?.sport ?? "");
        if (!gameId || !sport) return [];

        const matched = eventById.get(gameId) ?? null;
        const event = matched?.event ?? null;

        // The snapshot's kickoff wins — it is what the server compares a leg
        // against, and a re-priced event can drift from it.
        const startsAt = game.starts_at || event?.date || "";
        if (!startsAt) return [];

        const homeName = game.home_team ?? event?.teams?.home?.name ?? "";
        const awayName = game.away_team ?? event?.teams?.away?.name ?? "";

        return [
            {
                id: gameId,
                sport,
                competition: matched?.competition ?? sport,
                startsAt,
                live: Boolean(event?.live),
                homeTeam: {
                    id: event?.teams?.home?.id ?? `${gameId}-home`,
                    name: homeName,
                    abbreviation: event?.teams?.home?.abbreviation,
                },
                awayTeam: {
                    id: event?.teams?.away?.id ?? `${gameId}-away`,
                    name: awayName,
                    abbreviation: event?.teams?.away?.abbreviation,
                },
                hasOdds: Boolean(event?.odds?.length),
                event,
            },
        ];
    });
};

/* ----------------------------------------------------------------------------
 * PER-GAME enrichment.
 *
 * Two targeted calls sit beside the batch read: the full market board for the
 * matchup a member opened (`/leagues/<sport>/odds?match_id=`), and a retry for a
 * game the batch reported unpriced (`…schedules-with-odds-by-events` for that
 * one id, with `main=false`). Both answers are stored in the SAME
 * `FeedContestOddsGroup` shape the batch stores, so everything below this line
 * — `buildContestOddsGames`, `selectionsForEvent`, the whole builder — keeps one
 * vocabulary and one render path.
 * -------------------------------------------------------------------------- */

/** What a game that was never asked for reads as. */
export const IDLE_CONTEST_GAME_ODDS: FeedContestGameOddsEntry = {
    status: "idle",
    source: null,
    group: null,
    hasOdds: false,
    error: null,
    fetchedAt: null,
    attempts: {},
};

/** The enrichment record for one game, or the idle one. Never undefined. */
export const contestGameOddsEntry = (
    byGame: Readonly<Record<string, FeedContestGameOddsEntry>> | undefined,
    gameId: string
): FeedContestGameOddsEntry => byGame?.[gameId] ?? IDLE_CONTEST_GAME_ODDS;

/**
 * The one de-dupe predicate, shared by the dispatcher and the saga.
 *
 * A game gets at most ONE attempt per path per contest. A failure does not
 * re-arm — these calls are enrichment, and a game whose board cannot be fetched
 * must cost one request, not a retry loop. Only a member-initiated `force`
 * (a tap on Retry) spends another.
 */
export const shouldFetchContestGameOdds = (
    entry: FeedContestGameOddsEntry | undefined,
    source: FeedContestGameOddsSource,
    force = false
): boolean => {
    if (force) return true;
    // Some path already came back with markets; there is nothing left to enrich.
    if (entry?.hasOdds) return false;
    return !entry?.attempts?.[source];
};

/**
 * TRUE when an event carries the two team records every reader downstream
 * dereferences without asking.
 *
 * `normalizeOddToLeg` reads `event.teams.home.id` and `event.teams.away.name`
 * with no optional chaining (lib/sgp/validateParlay.ts), and `toParlayLeg` runs
 * it on every tap. The batch read arrives through a typed schedule contract, but
 * the by-match-id family passes the vendor's own payload straight through and is
 * trusted only as far as being an array — so an event of a different shape is
 * dropped HERE, where both enrichment paths meet, rather than rendering a
 * tappable chip that throws on click.
 */
const hasUsableTeams = (event: FeedContestOddsEvent | undefined): boolean =>
    typeof event?.teams?.home?.name === "string" &&
    typeof event?.teams?.away?.name === "string";

/**
 * One enriched game wearing the batch read's group shape.
 *
 * Filtered to the requested id on purpose: the by-match-id route is scoped to
 * one event already, but the targeted by-events retry echoes whatever that
 * league chose to return, and a stray event would enter the builder's catalog as
 * a matchup this contest never froze into its slate.
 */
export const contestGameOddsGroup = (input: {
    sport: string;
    competition: string;
    league: string;
    gameId: string;
    events: readonly FeedContestOddsEvent[];
    missingEventIds?: readonly string[];
    partial?: boolean;
}): FeedContestOddsGroup => {
    const events = (input.events ?? []).filter(
        (event) => event?.id === input.gameId && hasUsableTeams(event)
    );
    return {
        sport: input.sport,
        competition: input.competition,
        league: input.league,
        events,
        missingEventIds: events.length
            ? []
            : [...(input.missingEventIds ?? [input.gameId])],
        partial: Boolean(input.partial),
    };
};

/** TRUE when a group actually carries a priced selection for that game. */
export const groupHasPricedGame = (
    group: FeedContestOddsGroup | null | undefined,
    gameId: string
): boolean =>
    (group?.events ?? []).some((event) => event?.id === gameId && Boolean(event.odds?.length));

/**
 * Batch odds first, then whatever the enriched board adds that the batch did not
 * already carry, matched on the book's own selection id.
 *
 * The BATCH copy of a line wins a tie deliberately. The by-match-id cache is 60
 * minutes pregame — FIVE HOURS on MLB — against the by-events cache's 5, so its
 * copy of a main line can be materially older, and a leg is submitted with the
 * price its row showed. Enrichment adds markets; it does not re-price the ones
 * already on screen.
 */
const mergeOdds = (
    base: readonly OddsObject[] | undefined,
    extra: readonly OddsObject[] | undefined
): OddsObject[] => {
    const seen = new Set((base ?? []).map((odd) => odd?.id).filter(Boolean));
    return [
        ...(base ?? []),
        ...(extra ?? []).filter((odd) => odd?.id && !seen.has(odd.id)),
    ];
};

/**
 * The batch groups with every enriched game folded in — the ONE array to hand
 * `buildContestOddsGames`.
 *
 * Only entries that actually came back with markets take part, so an empty or
 * failed enrichment can never blank a game the batch had already priced. A game
 * the batch never priced has no odds to prefer and renders entirely from its
 * enriched answer, which is the point of the targeted retry. When nothing is
 * enriched the input array is returned by identity, so a memo downstream does
 * not churn.
 */
export const withEnrichedContestOdds = (
    groups: readonly FeedContestOddsGroup[],
    byGame: Readonly<Record<string, FeedContestGameOddsEntry>> | undefined
): readonly FeedContestOddsGroup[] => {
    const enriched = new Map<
        string,
        { entry: FeedContestGameOddsEntry; event: FeedContestOddsEvent }
    >();
    for (const [gameId, entry] of Object.entries(byGame ?? {})) {
        if (!entry?.hasOdds || !entry.group) continue;
        const event = (entry.group.events ?? []).find(
            (candidate) => candidate?.id === gameId && Boolean(candidate.odds?.length)
        );
        if (event) enriched.set(gameId, { entry, event });
    }
    if (!enriched.size) return groups;

    const folded = new Set<string>();
    const merged = groups.map((group) => {
        let changed = false;
        const events = (group.events ?? []).map((event) => {
            const match = event?.id ? enriched.get(event.id) : undefined;
            if (!match) return event;
            folded.add(event.id);
            changed = true;
            return { ...event, odds: mergeOdds(event.odds, match.event.odds) };
        });
        if (!changed) return group;
        return {
            ...group,
            events,
            // An id this group reported missing is no longer missing once the
            // targeted call priced it.
            missingEventIds: (group.missingEventIds ?? []).filter(
                (eventId) => !enriched.has(eventId)
            ),
        };
    });

    // Games the batch returned no event for at all: their enriched answer is the
    // only board they have, appended as its own group.
    const extras = [...enriched.entries()]
        .filter(([gameId]) => !folded.has(gameId))
        .map(([, { entry, event }]) => ({
            ...(entry.group as FeedContestOddsGroup),
            events: [event],
            missingEventIds: [],
        }));

    return extras.length ? [...merged, ...extras] : merged;
};
