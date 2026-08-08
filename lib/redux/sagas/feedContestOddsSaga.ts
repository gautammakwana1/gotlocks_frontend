import { all, call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    FeedContestOddsGroup,
    FetchFeedContestOddsPayload,
    LeagueOddsByEventsSchedule,
    MultiLeagueOddsByEventsSchedule,
} from "@/lib/interfaces/interfaces";
import {
    chunkEventIds,
    feedContestOddsRequestKey,
    FEED_CONTEST_ODDS_FEEDS,
    groupSlateBySport,
    isAmbiguousOddsSport,
    MAX_EVENT_IDS_ACROSS_LEAGUES,
    MAX_EVENT_IDS_PER_LEAGUE,
    MULTI_LEAGUE_ODDS_BY_EVENTS_PATH,
} from "@/lib/contests/feedContestOdds";
import {
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

export default function* feedContestOddsSaga(): SagaIterator {
    // takeLatest: only one contest's entry screen is open at a time, and a
    // re-quote fired from the review sheet must supersede the read it replaces.
    yield takeLatest(fetchFeedContestOddsRequest.type, handleFetchFeedContestOdds);
}
