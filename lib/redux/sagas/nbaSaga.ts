import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { fetchNBAOddsFailure, fetchNBAOddsRequest, fetchNBAOddsSuccess, fetchNBAScheduleFailure, fetchNBAScheduleRequest, fetchNBAScheduleSuccess, nbaPickValidateFailure, nbaPickValidateRequest, nbaPickValidateSuccess } from "../slices/nbaSlice";
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
            `${API_BASE_URL}/nba/nba-schedules-with-odds`,
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

function* handleFetchNBAOdds(action: PayloadAction<FetchNBAOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nba/nba-odds`,
            {
                params: { match_id },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNBAOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNBAOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateNBAPick(action: PayloadAction<ValidateMyNBAPickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/nba/nba-bet-validate`,
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
    yield takeLatest(fetchNBAOddsRequest.type, handleFetchNBAOdds);
    yield takeLatest(nbaPickValidateRequest.type, handleValidateNBAPick);
};