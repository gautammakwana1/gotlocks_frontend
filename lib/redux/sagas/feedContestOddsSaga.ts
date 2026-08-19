import { all, call, put, select, takeEvery, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    FeedContestGameOddsEntry,
    FeedContestGameOddsSource,
    FeedContestOddsGroup,
    FeedContestOddsState,
    FetchContestGameOddsPayload,
    FetchFeedContestOddsPayload,
    LeagueMatchOddsPayload,
    LeagueOddsByEventsSchedule,
    MultiLeagueOddsByEventsSchedule,
} from "@/lib/interfaces/interfaces";
import {
    chunkEventIds,
    contestGameOddsGroup,
    feedContestOddsRequestKey,
    FEED_CONTEST_ODDS_FEEDS,
    groupSlateBySport,
    isAmbiguousOddsSport,
    isRequestableEventId,
    matchOddsFeedsFor,
    MAX_EVENT_IDS_ACROSS_LEAGUES,
    MAX_EVENT_IDS_PER_LEAGUE,
    MULTI_LEAGUE_ODDS_BY_EVENTS_PATH,
    oddsByEventsFeedsFor,
} from "@/lib/contests/feedContestOdds";
import {
    fetchContestGameOddsFailure,
    fetchContestGameOddsRetryRequest,
    fetchContestGameOddsSuccess,
    fetchContestMatchOddsRequest,
    fetchFeedContestOddsFailure,
    fetchFeedContestOddsRequest,
    fetchFeedContestOddsSuccess,
} from "../slices/feedContestOddsSlice";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

type FeedResult = FeedContestOddsGroup & { ok: boolean };

const DEFAULT_SPORTSBOOK = "fanduel";

/**
 * ONE per-competition call.
 *
 * Used for Soccer only: a slate row records the sport ("Soccer") and not which
 * of the three competitions the game is in, so every soccer id is offered to
 * each competition and whichever one carries it answers. The other five sports
 * go through the multi-league route below, which needs no such guessing.
 */
function* fetchOneLeagueOdds(
    feed: { league: string; competition: string; path: string },
    sport: string,
    eventIds: string[],
    sportsbook: string
): SagaIterator<FeedResult> {
    const empty: FeedResult = {
        sport,
        competition: feed.competition,
        league: feed.league,
        events: [],
        missingEventIds: eventIds,
        partial: false,
        ok: false,
    };

    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}${feed.path}`,
            {
                params: {
                    // Comma-joined, NEVER an array: axios serialises an array as
                    // `event_ids[]=a&event_ids[]=b`, which the request signer
                    // would not reproduce and the endpoint does not expect.
                    event_ids: eventIds.join(","),
                    sportsbook,
                },
            }
        );
        const schedule = (response.data as { data?: { schedule?: LeagueOddsByEventsSchedule } })
            ?.data?.schedule;

        return {
            sport,
            competition: feed.competition,
            league: feed.league,
            events: schedule?.events ?? [],
            missingEventIds: schedule?.missing_event_ids ?? eventIds,
            partial: Boolean(schedule?.partial),
            ok: true,
        };
    } catch (error: unknown) {
        console.error(`Feed contest odds failed for ${feed.path}:`, error);
        return empty;
    }
}

/**
 * The multi-league call — `?events=<league>:<id>,…` — which is the whole reason
 * that endpoint exists: a General Combo slate can mix NFL, NBA and NHL, and one
 * request answers for all of them rather than the client stitching three.
 *
 * Only unambiguous sports travel here. The response is split back apart by its
 * own `leagues[]`, so a league that failed comes back `available: false` and
 * marks itself partial instead of blanking the rest.
 */
function* fetchMultiLeagueOdds(
    pairs: { league: string; competition: string; sport: string; eventIds: string[] }[],
    sportsbook: string
): SagaIterator<FeedResult[]> {
    const failed = (): FeedResult[] =>
        pairs.map((pair) => ({
            sport: pair.sport,
            competition: pair.competition,
            league: pair.league,
            events: [],
            missingEventIds: pair.eventIds,
            partial: false,
            ok: false,
        }));

    const events = pairs
        .flatMap((pair) => pair.eventIds.map((eventId) => `${pair.league}:${eventId}`))
        .join(",");

    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}${MULTI_LEAGUE_ODDS_BY_EVENTS_PATH}`,
            { params: { events, sportsbook } }
        );
        const schedule = (
            response.data as { data?: { schedule?: MultiLeagueOddsByEventsSchedule } }
        )?.data?.schedule;

        const byLeague = new Map(
            (schedule?.leagues ?? []).map((slice) => [slice.league, slice])
        );

        return pairs.map((pair) => {
            const slice = byLeague.get(pair.league);
            return {
                sport: pair.sport,
                competition: pair.competition,
                league: pair.league,
                events: slice?.events ?? [],
                missingEventIds: slice?.missing_event_ids ?? pair.eventIds,
                // `available: false` is that league's own failure, reported as a
                // partial rather than as an error for the whole slate.
                partial: Boolean(slice?.partial) || slice?.available === false,
                ok: Boolean(slice) && slice?.available !== false,
            };
        });
    } catch (error: unknown) {
        console.error(`Feed contest odds failed for ${MULTI_LEAGUE_ODDS_BY_EVENTS_PATH}:`, error);
        return failed();
    }
}

/**
 * The markets for exactly the games one contest froze into its slate.
 *
 * The ids sent are the contest's OWN `game_id`s, verbatim — the same strings the
 * entry endpoint compares a leg against. Nothing here re-derives an id: a leg
 * built from a re-derived one would render fine and then be refused as "not on
 * this contest's slate".
 *
 * An id the provider carries no odds for comes back under `missing_event_ids`
 * with HTTP 200. That is not an error: the game stays on screen, unpickable,
 * labelled "Markets not posted yet".
 */
function* handleFetchFeedContestOdds(
    action: PayloadAction<FetchFeedContestOddsPayload>
): SagaIterator {
    const { contest_id, games, sportsbook = DEFAULT_SPORTSBOOK } = action.payload;
    const { bySport, unrequestableGameIds } = groupSlateBySport(games ?? []);
    const requestKey = feedContestOddsRequestKey(
        contest_id,
        sportsbook,
        (games ?? []).map((game) => game.game_id)
    );

    if (!contest_id || !bySport.length) {
        yield put(
            fetchFeedContestOddsSuccess({
                requestKey,
                groups: [],
                missingGameIds: unrequestableGameIds,
                partial: false,
                fetchedAt: Date.now(),
            })
        );
        return;
    }

    // Soccer fans out per competition; everything else is batched into the
    // multi-league route, chunked to stay under its 50-event budget.
    const perLeagueCalls: {
        feed: { league: string; competition: string; path: string };
        sport: string;
        eventIds: string[];
    }[] = [];
    const multiPairs: {
        league: string;
        competition: string;
        sport: string;
        eventIds: string[];
    }[] = [];

    for (const { sport, gameIds } of bySport) {
        const feeds = FEED_CONTEST_ODDS_FEEDS[sport] ?? [];
        if (!feeds.length) continue;

        for (const chunk of chunkEventIds(gameIds, MAX_EVENT_IDS_PER_LEAGUE)) {
            if (isAmbiguousOddsSport(sport)) {
                for (const feed of feeds) {
                    perLeagueCalls.push({ feed, sport, eventIds: chunk });
                }
                continue;
            }
            const feed = feeds[0];
            multiPairs.push({
                league: feed.league,
                competition: feed.competition,
                sport,
                eventIds: chunk,
            });
        }
    }

    // The multi-league route caps the TOTAL (50) as well as the per-league count
    // (25), and it re-groups the `events=` tokens BY LEAGUE before validating —
    // so two 25-id chunks of the SAME league in one request are seen as one
    // 50-id league and rejected outright. A batch therefore holds each league at
    // most once, on top of the running total.
    const multiBatches: (typeof multiPairs)[] = [];
    let current: typeof multiPairs = [];
    let currentTotal = 0;
    let currentLeagues = new Set<string>();
    for (const pair of multiPairs) {
        const wouldRepeatLeague = currentLeagues.has(pair.league);
        const wouldOverflow =
            currentTotal + pair.eventIds.length > MAX_EVENT_IDS_ACROSS_LEAGUES;
        if ((wouldRepeatLeague || wouldOverflow) && current.length) {
            multiBatches.push(current);
            current = [];
            currentTotal = 0;
            currentLeagues = new Set<string>();
        }
        current.push(pair);
        currentTotal += pair.eventIds.length;
        currentLeagues.add(pair.league);
    }
    if (current.length) multiBatches.push(current);

    try {
        const [perLeagueResults, multiResults]: [FeedResult[], FeedResult[][]] = yield all([
            all(
                perLeagueCalls.map(({ feed, sport, eventIds }) =>
                    call(fetchOneLeagueOdds, feed, sport, eventIds, sportsbook)
                )
            ),
            all(multiBatches.map((batch) => call(fetchMultiLeagueOdds, batch, sportsbook))),
        ]);

        const results = [...perLeagueResults, ...multiResults.flat()];

        if (results.length && results.every((result) => !result.ok)) {
            yield put(
                fetchFeedContestOddsFailure({
                    requestKey,
                    error: "Failed to load the odds for this contest's games",
                })
            );
            return;
        }

        // Soccer asks all three competitions for the same ids, so an id that one
        // competition answered is NOT missing just because the other two said so.
        const answered = new Set(
            results.flatMap((result) => result.events.map((event) => event.id))
        );
        const missingGameIds = [
            ...new Set([
                ...unrequestableGameIds,
                ...results
                    .flatMap((result) => result.missingEventIds)
                    .filter((eventId) => !answered.has(eventId)),
            ]),
        ];

        // Every id answered as "missing" while every call SUCCEEDED is the
        // signature of an id-namespace mismatch, not of an unpriced slate: the
        // slate ids are minted from `schedules-for-all-tz` (schedule.oddsblaze)
        // and resolved here against odds.oddsblaze, and the two feeds do not
        // agree on an event's top-level id. The screen still renders the MVP's
        // "No eligible markets available" copy, which is the honest thing to
        // show a member either way — this line is for whoever is debugging it.
        if (!answered.size && results.some((result) => result.ok)) {
            console.warn(
                "[feedContestOdds] every requested event id came back missing — " +
                    "the contest's stored game ids may not be resolvable on the odds feed.",
                { contest_id, requested: results.flatMap((result) => result.missingEventIds) }
            );
        }

        yield put(
            fetchFeedContestOddsSuccess({
                requestKey,
                groups: results
                    .filter((result) => result.ok)
                    .map(({ sport, competition, league, events, missingEventIds, partial }) => ({
                        sport,
                        competition,
                        league,
                        events,
                        missingEventIds,
                        partial,
                    })),
                missingGameIds,
                partial: results.some((result) => !result.ok || result.partial),
                fetchedAt: Date.now(),
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchFeedContestOddsFailure({
                requestKey,
                error: getErrorMessage(
                    error,
                    "Failed to load the odds for this contest's games"
                ),
            })
        );
    }
}

/* ----------------------------------------------------------------------------
 * PER-GAME enrichment of the board above.
 *
 * Two targeted calls, one game each, both pure enrichment: whatever they return
 * is stored BESIDE the batch answer, never instead of it, so an empty answer, a
 * failure or a call still in flight leaves the slate rendering exactly as the
 * batch left it — including the "Markets not posted yet" copy, which stays
 * driven by the batch's `missing_event_ids` and nothing else.
 * -------------------------------------------------------------------------- */

type FeedContestOddsHost = { feedContestOdds: FeedContestOddsState };

/**
 * The (contest, game, path) triples with a request actually on the wire.
 *
 * The reducer ledger cannot carry this on its own: redux-saga sees an action
 * AFTER the reducer has run, so by the time a handler starts, a request the
 * reducer rejected as a duplicate looks identical to the one it accepted. This
 * set is what tells them apart, and it is what stops React's double-invoked
 * effects (or a double tap) from putting the same 645 KB board on the wire
 * twice. Keyed by contest request key, so it cannot leak across contests, and
 * released in a `finally` so a cancelled saga does not wedge a game shut.
 */
const inFlightGameOdds = new Set<string>();

/**
 * The shared shell around both paths: scope check, de-dupe, then success or
 * failure for exactly one (game, path).
 *
 * The de-dupe test is "did the REDUCER accept this request", i.e. did it move
 * this path's attempt to `loading`. That single check covers every rejection the
 * reducer makes — an out-of-scope request key, a path already tried, a game some
 * other path already priced — without duplicating any of that logic here.
 */
function* runContestGameOddsFetch(
    source: FeedContestGameOddsSource,
    payload: FetchContestGameOddsPayload,
    fetchGroup: (
        payload: FetchContestGameOddsPayload
    ) => SagaIterator<FeedContestOddsGroup | null>,
    failureMessage: string
): SagaIterator {
    const { contestRequestKey, gameId } = payload;
    if (!gameId || !contestRequestKey) return;

    const inFlightKey = `${contestRequestKey}|${gameId}|${source}`;
    if (inFlightGameOdds.has(inFlightKey)) return;

    const entry: FeedContestGameOddsEntry | undefined = yield select(
        (state: FeedContestOddsHost) => state.feedContestOdds.byGame?.[gameId]
    );
    if (entry?.attempts?.[source]?.status !== "loading") return;

    inFlightGameOdds.add(inFlightKey);
    try {
        const group: FeedContestOddsGroup | null = yield call(fetchGroup, payload);
        yield put(
            fetchContestGameOddsSuccess({
                contestRequestKey,
                gameId,
                source,
                group,
                fetchedAt: Date.now(),
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchContestGameOddsFailure({
                contestRequestKey,
                gameId,
                source,
                error: getErrorMessage(error, failureMessage),
            })
        );
    } finally {
        inFlightGameOdds.delete(inFlightKey);
    }
}

/**
 * ITEM 1 — the FULL market board for one game, `/leagues/<sport>/odds?match_id=`.
 *
 * The batch read leaves `main` unset and the endpoint defaults it to TRUE, so
 * the slate board is main lines only. These controllers send no `main` filter
 * upstream at all, so this answers with every market the book posted — props,
 * alternates, the lot. It is also the reason this fires for the opened matchup
 * and never for the slate: the same MLB event is ~645 KB here against ~186 KB
 * on the main-lines board.
 *
 * Soccer is asked one competition at a time and the first that carries the game
 * wins. Sequential, unlike the batch's fan-out: for a single opened matchup the
 * usual answer is one call, and firing three full boards to throw two away is
 * exactly the traffic this route makes expensive.
 */
function* fetchContestMatchOddsGroup(
    payload: FetchContestGameOddsPayload
): SagaIterator<FeedContestOddsGroup | null> {
    const { gameId, sport, sportsbook = DEFAULT_SPORTSBOOK, isLive = false } = payload;

    // Fail closed. This family does NOT validate the id server-side — a
    // `map:NFL:SPORTSDATAIO:123` key would be forwarded raw to the vendor — and
    // an unmapped sport/book pair has no route at all. Neither may be guessed
    // into a URL; the un-suffixed `/odds` routes hardcode FanDuel, so pointing a
    // DraftKings contest at one would show a board priced by the wrong book.
    if (!isRequestableEventId(gameId)) {
        throw new Error(`"${gameId}" is not an id the odds feed can be asked for`);
    }
    const feeds = matchOddsFeedsFor(sport, sportsbook);
    if (!feeds.length) {
        throw new Error(`No odds-by-match-id route for ${sport || "this sport"} on ${sportsbook}`);
    }

    let failures = 0;
    let lastError: unknown = null;

    for (const feed of feeds) {
        try {
            const response: AxiosResponse<unknown> = yield call(
                axiosInstance.get,
                `${API_BASE_URL}${feed.path}`,
                {
                    params: {
                        match_id: gameId,
                        // Part of THIS family's cache key (`..._${isLive}`), so it
                        // is always sent explicitly rather than sometimes omitted
                        // — otherwise one game warms two upstream entries.
                        is_live: isLive ? "true" : "false",
                    },
                }
            );
            // `data.odds` is `data.schedule` minus the requested/missing/partial
            // bookkeeping — the vendor payload passed straight through, so its
            // `events` is trusted only as far as being an array.
            const rawEvents = (response.data as { data?: { odds?: LeagueMatchOddsPayload } })
                ?.data?.odds?.events;

            const group = contestGameOddsGroup({
                sport,
                competition: feed.competition,
                league: feed.league,
                gameId,
                events: Array.isArray(rawEvents) ? rawEvents : [],
            });
            if (group.events.length) return group;
        } catch (error: unknown) {
            // A soccer competition that does not carry this game answers 200 with
            // an empty list — but an unknown event can also make the vendor 404,
            // which these controllers surface as a 500. Two of three soccer calls
            // legitimately fail this way, so one failure is not the game failing.
            failures += 1;
            lastError = error;
            console.error(`Contest match odds failed for ${feed.path}:`, error);
        }
    }

    // Every route tried blew up: report it, so the ledger records an error rather
    // than a clean "no markets". A partial failure with a clean empty answer is
    // just "nothing posted", which is not an error state on this screen.
    if (failures === feeds.length) {
        throw lastError ?? new Error("Failed to load the full market board for this game");
    }
    return null;
}

/**
 * ITEM 2 — the TARGETED by-events retry for ONE game the batch reported unpriced.
 *
 * `main=false` is doing two jobs and both are load-bearing:
 *   - the server's per-event cache key carries the main flag
 *     (`ob:odds:v1:<league>:<book>:<m1|m0>:…`), and a miss from the batch leaves
 *     a 60-second negative marker under the `m1` key. A same-shaped retry would
 *     be served that remembered miss and could not reach the vendor at all;
 *     `m0` is a genuine cache miss, so this actually re-asks.
 *   - it returns the full board rather than main lines, so a game rescued here
 *     arrives with the same depth as an enriched one.
 *
 * Unlike the by-match-id family this one still answers 200 with
 * `missing_event_ids` when the provider simply has no odds, so "unpriced" stays
 * distinguishable from "broken".
 */
function* fetchContestGameOddsRetryGroup(
    payload: FetchContestGameOddsPayload
): SagaIterator<FeedContestOddsGroup | null> {
    const { gameId, sport, sportsbook = DEFAULT_SPORTSBOOK } = payload;

    // One bad token 400s the whole request here, so the id is checked before it
    // is sent — exactly as the batch read filters its slate.
    if (!isRequestableEventId(gameId)) {
        throw new Error(`"${gameId}" is not an id the odds feed can be asked for`);
    }
    const feeds = oddsByEventsFeedsFor(sport);
    if (!feeds.length) {
        throw new Error(`No odds-by-events route for ${sport || "this sport"}`);
    }

    let failures = 0;
    let lastError: unknown = null;
    let answered: FeedContestOddsGroup | null = null;

    for (const feed of feeds) {
        try {
            const response: AxiosResponse<unknown> = yield call(
                axiosInstance.get,
                `${API_BASE_URL}${feed.path}`,
                {
                    params: {
                        // One id, comma-join rules still apply: never an array.
                        event_ids: gameId,
                        sportsbook,
                        main: "false",
                    },
                }
            );
            const schedule = (response.data as { data?: { schedule?: LeagueOddsByEventsSchedule } })
                ?.data?.schedule;

            const group = contestGameOddsGroup({
                sport,
                competition: feed.competition,
                league: feed.league,
                gameId,
                events: schedule?.events ?? [],
                missingEventIds: schedule?.missing_event_ids,
                partial: schedule?.partial,
            });
            if (group.events.length) return group;
            // Kept so a soccer game that every competition reports as missing
            // still records WHICH answer said so rather than a bare null.
            answered = answered ?? group;
        } catch (error: unknown) {
            failures += 1;
            lastError = error;
            console.error(`Contest game odds retry failed for ${feed.path}:`, error);
        }
    }

    // ANY route that blew up is a real breakage on THIS family, unlike the
    // by-match-id one above: a competition that simply does not carry the game
    // answers 200 with the id under `missing_event_ids`, so a throw here is never
    // "nothing posted". Soccer is the case that makes the difference visible —
    // it walks three competitions, and the interleaving where the game's own
    // competition 500s while the other two answer 200-empty used to be recorded
    // as a clean, settled "no markets", permanently spending the game's one
    // attempt with nothing anywhere saying a route had failed.
    if (failures > 0) {
        throw lastError ?? new Error("Failed to re-load the odds for this game");
    }
    return answered;
}

function* handleFetchContestMatchOdds(
    action: PayloadAction<FetchContestGameOddsPayload>
): SagaIterator {
    yield call(
        runContestGameOddsFetch,
        "match_odds",
        action.payload,
        fetchContestMatchOddsGroup,
        "Failed to load the full market board for this game"
    );
}

function* handleFetchContestGameOddsRetry(
    action: PayloadAction<FetchContestGameOddsPayload>
): SagaIterator {
    yield call(
        runContestGameOddsFetch,
        "by_events",
        action.payload,
        fetchContestGameOddsRetryGroup,
        "Failed to re-load the odds for this game"
    );
}

export default function* feedContestOddsSaga(): SagaIterator {
    // takeLatest: only one contest's entry screen is open at a time, and a
    // re-quote fired from the review sheet must supersede the read it replaces.
    yield takeLatest(fetchFeedContestOddsRequest.type, handleFetchFeedContestOdds);
    // takeEvery, NOT takeLatest: these are per-GAME reads, and takeLatest would
    // cancel the board for the matchup a member opened first the moment they
    // opened a second one. De-duping is done per (contest, game, path) instead,
    // by the reducer's attempt ledger plus the in-flight set above.
    yield takeEvery(fetchContestMatchOddsRequest.type, handleFetchContestMatchOdds);
    yield takeEvery(fetchContestGameOddsRetryRequest.type, handleFetchContestGameOddsRetry);
}
