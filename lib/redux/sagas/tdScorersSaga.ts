import { all, call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { FetchTdScorersPayload, TdScorerEvent } from "@/lib/interfaces/interfaces";
import {
    chunkEventIds,
    feedContestOddsRequestKey,
    isRequestableEventId,
    MAX_EVENT_IDS_PER_LEAGUE,
} from "@/lib/contests/feedContestOdds";
import {
    fetchTdScorersFailure,
    fetchTdScorersRequest,
    fetchTdScorersSuccess,
} from "../slices/tdScorersSlice";

/* ----------------------------------------------------------------------------
 * GET /leagues/nfl/td-scorers-by-events?event_ids=… — the TD Psychic board.
 *
 * NFL-only by design, like its Pick'em sibling and for the same reason: the
 * template's eligibility rule IS an NFL market ("Player Touchdowns", full-game
 * `Over 0.5`), so a TD Psychic contest can only ever hold NFL games. If that is
 * ever widened, this needs a per-league path map the way FEED_CONTEST_ODDS_FEEDS
 * has one.
 *
 * `markets` is deliberately NOT sent. On this endpoint it ADDS to the scorer
 * market rather than replacing it, so extra markets would only slow the answer
 * down — the whole point of reading here instead of /schedules-with-odds-by-events
 * is that a TD card needs one market, already eligibility-filtered, not the board.
 *
 * ONE COUNT ACROSS CHUNKS. The server's `distinct_player_count` is per response,
 * so a slate split across chunks answers with several partial counts. They are
 * NOT summed — the same player can carry a line in two of a team's games across
 * a wide slate — the distinct union of the ids actually returned is recomputed
 * here instead, which is the same number a single-chunk read would have given.
 * -------------------------------------------------------------------------- */

const TD_SCORERS_PATH = "/leagues/nfl/td-scorers-by-events";
const DEFAULT_SPORTSBOOK = "fanduel";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

type TdScorersResponse = {
    data?: {
        td_scorers?: TdScorerEvent[];
        events_without_scorers?: string[];
        distinct_player_count?: number;
        schedule?: {
            missing_event_ids?: string[];
            partial?: boolean;
        };
    };
};

type ChunkResult = {
    ok: boolean;
    events: TdScorerEvent[];
    missing: string[];
    withoutScorers: string[];
    partial: boolean;
};

/** ONE call, for up to MAX_EVENT_IDS_PER_LEAGUE ids. */
function* fetchChunk(ids: string[], sportsbook: string): SagaIterator<ChunkResult> {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}${TD_SCORERS_PATH}`,
            { params: { event_ids: ids.join(","), sportsbook } }
        );
        const payload = (response.data ?? {}) as TdScorersResponse;
        return {
            ok: true,
            events: payload.data?.td_scorers ?? [],
            missing: payload.data?.schedule?.missing_event_ids ?? [],
            withoutScorers: payload.data?.events_without_scorers ?? [],
            partial: Boolean(payload.data?.schedule?.partial),
        };
    } catch {
        // A failed chunk is NOT "these games have no scorers" — every id in it is
        // unknown, which `partial` is what tells the builder.
        return { ok: false, events: [], missing: ids, withoutScorers: [], partial: true };
    }
}

function* handleFetchTdScorers(action: PayloadAction<FetchTdScorersPayload>): SagaIterator {
    const { contest_id, game_ids, sportsbook = DEFAULT_SPORTSBOOK } = action.payload;

    // Ids the endpoint would refuse are dropped BEFORE the request rather than
    // costing the whole chunk a 400 — they come back as missing, which is what
    // an unresolvable slate row is.
    const requestable = game_ids.filter(isRequestableEventId);
    const rejected = game_ids.filter((id) => !isRequestableEventId(id));
    const requestKey = feedContestOddsRequestKey(contest_id, sportsbook, game_ids);

    if (!requestable.length) {
        yield put(
            fetchTdScorersSuccess({
                requestKey,
                events: [],
                missingGameIds: [...rejected],
                withoutScorersGameIds: [],
                distinctPlayerCount: 0,
                partial: false,
                fetchedAt: Date.now(),
            })
        );
        return;
    }

    try {
        const chunks = chunkEventIds(requestable, MAX_EVENT_IDS_PER_LEAGUE);
        const results: ChunkResult[] = yield all(
            chunks.map((chunk) => call(fetchChunk, chunk, sportsbook))
        );

        // Every chunk failing is a real failure; some failing is a partial board.
        if (results.length && results.every((result) => !result.ok)) {
            yield put(
                fetchTdScorersFailure({
                    requestKey,
                    error: "Failed to load touchdown scorers for this slate",
                })
            );
            return;
        }

        const seenGames = new Set<string>();
        const events: TdScorerEvent[] = [];
        for (const result of results) {
            for (const event of result.events) {
                if (!event?.game_id || seenGames.has(event.game_id)) continue;
                seenGames.add(event.game_id);
                events.push(event);
            }
        }

        // Recomputed rather than summed — see the header note.
        const distinctPlayerCount = new Set(
            events.flatMap((event) =>
                (event.selections ?? [])
                    .map((selection) => selection?.player_id)
                    .filter((playerId): playerId is string => Boolean(playerId))
            )
        ).size;

        yield put(
            fetchTdScorersSuccess({
                requestKey,
                events,
                missingGameIds: [
                    ...new Set([...rejected, ...results.flatMap((result) => result.missing)]),
                ],
                withoutScorersGameIds: [
                    ...new Set(results.flatMap((result) => result.withoutScorers)),
                ],
                distinctPlayerCount,
                partial: results.some((result) => result.partial),
                fetchedAt: Date.now(),
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchTdScorersFailure({
                requestKey,
                error: getErrorMessage(error, "Failed to load touchdown scorers for this slate"),
            })
        );
    }
}

export default function* tdScorersSaga(): SagaIterator {
    yield takeLatest(fetchTdScorersRequest.type, handleFetchTdScorers);
}
