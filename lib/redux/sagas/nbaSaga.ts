import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { fetchDraftkingsNBAOddsFailure, fetchDraftkingsNBAOddsRequest, fetchDraftkingsNBAOddsSuccess, fetchFanduelNBAOddsFailure, fetchFanduelNBAOddsRequest, fetchFanduelNBAOddsSuccess, fetchNBAScheduleFailure, fetchNBAScheduleRequest, fetchNBAScheduleSuccess, nbaPickValidateFailure, nbaPickValidateRequest, nbaPickValidateSuccess } from "../slices/nbaSlice";
import { FetchNBAOddsPayload, FetchNBASchedulePayload, ValidateMyNBAPickPayload } from "@/lib/interfaces/interfaces";

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

function* handleFetchNBASchedule(action: PayloadAction<FetchNBASchedulePayload | undefined>): SagaIterator {
    try {
        const { pick_deadline, result_deadline, is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/nba/schedules-with-odds-fanduel`,
            {
                params: { pick_deadline, result_deadline, is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNBAScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNBAScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchFanduelNBAOdds(action: PayloadAction<FetchNBAOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/nba/odds-fanduel`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFanduelNBAOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFanduelNBAOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleFetchDraftkingsNBAOdds(action: PayloadAction<FetchNBAOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/nba/odds-draftkings`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchDraftkingsNBAOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchDraftkingsNBAOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateNBAPick(action: PayloadAction<ValidateMyNBAPickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/leagues/nba/bet-validate`,
            { match_id, external_pick_key }
        );
        const payload = response.data as { data?: unknown };
        yield put(nbaPickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(nbaPickValidateFailure(getErrorMessage(error, "NBA Pick Validation Failed")));
    }
};

export default function* nflSaga() {
    yield takeLatest(fetchNBAScheduleRequest.type, handleFetchNBASchedule);
    yield takeLatest(fetchFanduelNBAOddsRequest.type, handleFetchFanduelNBAOdds);
    yield takeLatest(fetchDraftkingsNBAOddsRequest.type, handleFetchDraftkingsNBAOdds);
    yield takeLatest(nbaPickValidateRequest.type, handleValidateNBAPick);
};