import { all, call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    FetchPickemMoneylinePayload,
    PickemMoneylineEvent,
} from "@/lib/interfaces/interfaces";
import {
    chunkEventIds,
    feedContestOddsRequestKey,
    isRequestableEventId,
    MAX_EVENT_IDS_PER_LEAGUE,
} from "@/lib/contests/feedContestOdds";
import {
    fetchPickemMoneylineFailure,
    fetchPickemMoneylineRequest,
    fetchPickemMoneylineSuccess,
} from "../slices/pickemMoneylineSlice";

/* ----------------------------------------------------------------------------
 * GET /leagues/nfl/moneyline-odds?event_ids=… — the Sunday Pick'em board.
 *
 * NFL-only by design, and correctly so: `buildSundayPickemSlate` refuses a
 * non-NFL slate server-side, so a Pick'em contest can only ever hold NFL games.
 * If that rule is ever widened, this needs a per-league path map the way
 * FEED_CONTEST_ODDS_FEEDS has one.
 *
 * `markets` is deliberately NOT sent. On this endpoint it ADDS to the moneyline
 * rather than replacing it, so sending extra markets would only slow the answer
 * down — the whole point of reading here instead of
 * /schedules-with-odds-by-events is that a card needs one market, not the board.
 * -------------------------------------------------------------------------- */

const PICKEM_MONEYLINE_PATH = "/leagues/nfl/moneyline-odds";
const DEFAULT_SPORTSBOOK = "fanduel";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

type MoneylineResponse = {
    data?: {
        moneyline?: PickemMoneylineEvent[];
        events_without_moneyline?: string[];
        schedule?: {
            missing_event_ids?: string[];
            partial?: boolean;
        };
    };
};

type ChunkResult = {
    ok: boolean;
    events: PickemMoneylineEvent[];
    missing: string[];
    withoutMoneyline: string[];
    partial: boolean;
};

/** ONE call, for up to MAX_EVENT_IDS_PER_LEAGUE ids. */
function* fetchChunk(ids: string[], sportsbook: string): SagaIterator<ChunkResult> {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}${PICKEM_MONEYLINE_PATH}`,
            { params: { event_ids: ids.join(","), sportsbook } }
        );
        const payload = (response.data ?? {}) as MoneylineResponse;
        return {
            ok: true,
            events: payload.data?.moneyline ?? [],
            missing: payload.data?.schedule?.missing_event_ids ?? [],
            withoutMoneyline: payload.data?.events_without_moneyline ?? [],
            partial: Boolean(payload.data?.schedule?.partial),
        };
    } catch {
        // A failed chunk is NOT "these games have no odds" — every id in it is
        // unknown, which `partial` is what tells the editor.
        return { ok: false, events: [], missing: ids, withoutMoneyline: [], partial: true };
    }
}

function* handleFetchPickemMoneyline(
    action: PayloadAction<FetchPickemMoneylinePayload>
): SagaIterator {
    const { contest_id, game_ids, sportsbook = DEFAULT_SPORTSBOOK } = action.payload;

    // Ids the endpoint would refuse are dropped BEFORE the request rather than
    // costing the whole chunk a 400 — they come back as missing, which is what
    // an unresolvable slate row is.
    const requestable = game_ids.filter(isRequestableEventId);
    const rejected = game_ids.filter((id) => !isRequestableEventId(id));
    const requestKey = feedContestOddsRequestKey(contest_id, sportsbook, game_ids);

    if (!requestable.length) {
        yield put(
            fetchPickemMoneylineSuccess({
                requestKey,
                events: [],
                missingGameIds: [...rejected],
                withoutMoneylineGameIds: [],
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
                fetchPickemMoneylineFailure({
                    requestKey,
                    error: "Failed to load moneyline odds for this slate",
                })
            );
            return;
        }

        const seen = new Set<string>();
        const events: PickemMoneylineEvent[] = [];
        for (const result of results) {
            for (const event of result.events) {
                if (!event?.game_id || seen.has(event.game_id)) continue;
                seen.add(event.game_id);
                events.push(event);
            }
        }

        yield put(
            fetchPickemMoneylineSuccess({
                requestKey,
                events,
                missingGameIds: [
                    ...new Set([...rejected, ...results.flatMap((result) => result.missing)]),
                ],
                withoutMoneylineGameIds: [
                    ...new Set(results.flatMap((result) => result.withoutMoneyline)),
                ],
                partial: results.some((result) => result.partial),
                fetchedAt: Date.now(),
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchPickemMoneylineFailure({
                requestKey,
                error: getErrorMessage(error, "Failed to load moneyline odds for this slate"),
            })
        );
    }
}

export default function* pickemMoneylineSaga(): SagaIterator {
    yield takeLatest(fetchPickemMoneylineRequest.type, handleFetchPickemMoneyline);
}
