import { call, debounce, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    FetchLeagueCountsPayload,
    FetchLeagueMatchupCountsPayload,
    LeagueMatchupCountsData,
} from "@/lib/interfaces/interfaces";
import {
    fetchLeagueMatchupCountsFailure,
    fetchLeagueMatchupCountsRequest,
    fetchLeagueMatchupCountsSuccess,
    fetchLeaguesCountsFailure,
    fetchLeaguesCountsRequest,
    fetchLeaguesCountsSuccess,
} from "../slices/leagueSlice";

/**
 * A date picker fires a request per click. Waiting this long after the LAST
 * change means dragging across a calendar costs one call instead of one per day.
 */
const MATCHUP_COUNTS_DEBOUNCE_MS = 400;

type ApiErrorResponse = {
    message?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};

function* handleFetchLeagueCounts(action: PayloadAction<FetchLeagueCountsPayload | undefined>): SagaIterator {
    try {
        const { date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/fetch-schedules-counts`,
            {
                params: { date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchLeaguesCountsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchLeaguesCountsFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

// GET /leagues/matchup-counts — league-wise counts for a single date, a comma
// list, or a `from-to` range, already sorted most-matchups-first by the server.
// The caller's zone travels on the `x-timezone` header the axios interceptor
// adds, and decides which calendar day each kickoff is counted under.
function* handleFetchLeagueMatchupCounts(
    action: PayloadAction<FetchLeagueMatchupCountsPayload | undefined>
): SagaIterator {
    const { date, sort } = action.payload || {};
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/matchup-counts`,
            {
                params: {
                    ...(date ? { date } : {}),
                    ...(sort ? { sort } : {}),
                },
            }
        );
        const payload = response.data as { data?: LeagueMatchupCountsData };
        if (!payload?.data) {
            yield put(fetchLeagueMatchupCountsFailure("Failed to load league matchup counts"));
            return;
        }
        yield put(fetchLeagueMatchupCountsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchLeagueMatchupCountsFailure(
                getErrorMessage(error, "Failed to load league matchup counts")
            )
        );
    }
}

export default function* leagueSaga() {
    yield takeLatest(fetchLeaguesCountsRequest.type, handleFetchLeagueCounts);
    // debounce also cancels the in-flight task when a newer request arrives, so
    // a slow answer for an abandoned date can never overwrite the current one.
    yield debounce(
        MATCHUP_COUNTS_DEBOUNCE_MS,
        fetchLeagueMatchupCountsRequest.type,
        handleFetchLeagueMatchupCounts
    );
};