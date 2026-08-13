import { all, call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    FeedContestScheduleGroup,
    FetchFeedContestSchedulesPayload,
    LeagueScheduleEvent,
} from "@/lib/interfaces/interfaces";
import {
    feedContestScheduleRequestKey,
    FEED_CONTEST_LEAGUE_FEEDS,
} from "@/lib/contests/feedContestCatalog";
import {
    fetchFeedContestSchedulesFailure,
    fetchFeedContestSchedulesRequest,
    fetchFeedContestSchedulesSuccess,
} from "../slices/feedContestScheduleSlice";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

type FeedResult = FeedContestScheduleGroup & { ok: boolean };

/**
 * One league feed. A single league failing must not blank the whole slate, so a
 * failure resolves to an empty group and is only fatal when EVERY feed failed.
 */
function* fetchOneLeagueFeed(
    feed: (typeof FEED_CONTEST_LEAGUE_FEEDS)[keyof typeof FEED_CONTEST_LEAGUE_FEEDS][number],
    sport: string,
    date: string,
    timeZone?: string
): SagaIterator<FeedResult> {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}${feed.path}`,
            {
                params: { date },
                // Explicit beats axiosInstance's browser-zone default (it only
                // fills the header in when absent). `date` and the day the server
                // files a kickoff under MUST be read in the same zone, or the
                // boundary games of the range silently vanish.
                ...(timeZone ? { headers: { "X-Timezone": timeZone } } : {}),
            }
        );
        const payload = response.data as {
            data?: { schedule?: { events?: LeagueScheduleEvent[] } };
        };
        return {
            sport,
            competition: feed.competition,
            events: payload?.data?.schedule?.events ?? [],
            ok: true,
        };
    } catch (error: unknown) {
        console.error(`Feed contest schedule failed for ${feed.path}:`, error);
        return { sport, competition: feed.competition, events: [], ok: false };
    }
}

// GET /leagues/<sport>/schedules-for-all-tz — the UNPRICED feed. Since the
// 2026-08 rewrite one call covers the whole slate: `date` takes `from-to` and
// the server filters to the caller's own calendar days from `x-timezone`.
// Soccer is three competitions behind one contest sport, so it fans out to three
// requests; every other sport is exactly one.
function* handleFetchFeedContestSchedules(
    action: PayloadAction<FetchFeedContestSchedulesPayload>
): SagaIterator {
    const { sports, date, time_zone: timeZone } = action.payload;
    const requestKey = feedContestScheduleRequestKey(sports, date, timeZone);

    if (!date || !sports.length) {
        yield put(fetchFeedContestSchedulesSuccess({ requestKey, groups: [] }));
        return;
    }

    const feeds = sports.flatMap((sport) =>
        (FEED_CONTEST_LEAGUE_FEEDS[sport as keyof typeof FEED_CONTEST_LEAGUE_FEEDS] ?? []).map(
            (feed) => ({ feed, sport })
        )
    );

    if (!feeds.length) {
        yield put(fetchFeedContestSchedulesSuccess({ requestKey, groups: [] }));
        return;
    }

    try {
        const results: FeedResult[] = yield all(
            feeds.map(({ feed, sport }) =>
                call(fetchOneLeagueFeed, feed, sport, date, timeZone)
            )
        );

        if (results.every((result) => !result.ok)) {
            yield put(
                fetchFeedContestSchedulesFailure({
                    requestKey,
                    error: "Failed to load the schedule for these dates",
                })
            );
            return;
        }

        yield put(
            fetchFeedContestSchedulesSuccess({
                requestKey,
                groups: results.map(({ sport, competition, events }) => ({
                    sport,
                    competition,
                    events,
                })),
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchFeedContestSchedulesFailure({
                requestKey,
                error: getErrorMessage(error, "Failed to load the schedule for these dates"),
            })
        );
    }
}

export default function* feedContestScheduleSaga(): SagaIterator {
    // takeLatest: changing the sports or the range abandons the previous slate
    // outright, so an older answer must never land on top of a newer one.
    yield takeLatest(
        fetchFeedContestSchedulesRequest.type,
        handleFetchFeedContestSchedules
    );
}
