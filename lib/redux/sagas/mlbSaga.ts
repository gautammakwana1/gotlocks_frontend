import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { FetchMLBOddsPayload, FetchMLBSchedulePayload, ValidateMyMLBPickPayload } from "@/lib/interfaces/interfaces";
import { fetchMLBOddsFailure, fetchMLBOddsRequest, fetchMLBOddsSuccess, fetchMLBScheduleByTimezoneFailure, fetchMLBScheduleByTimezoneRequest, fetchMLBScheduleByTimezoneSuccess, fetchMLBScheduleFailure, fetchMLBScheduleRequest, fetchMLBScheduleSuccess, mlbPickValidateFailure, mlbPickValidateRequest, mlbPickValidateSuccess } from "../slices/mlbSlice";

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

function* handleFetchMLBSchedule(action: PayloadAction<FetchMLBSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/mlb/schedules-with-odds`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMLBScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMLBScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchMLBScheduleByTimezone(action: PayloadAction<FetchMLBSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/mlb/schedules-for-all-tz`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMLBScheduleByTimezoneSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMLBScheduleByTimezoneFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchMLBOdds(action: PayloadAction<FetchMLBOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/mlb/odds`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMLBOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMLBOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateMLBPick(action: PayloadAction<ValidateMyMLBPickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key, is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/leagues/mlb/bet-validate`,
            { match_id, external_pick_key, is_live }
        );
        const payload = response.data as { data?: unknown };
        yield put(mlbPickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(mlbPickValidateFailure(getErrorMessage(error, "MLB Pick Validation Failed")));
    }
};

export default function* mlbSaga() {
    yield takeLatest(fetchMLBScheduleRequest.type, handleFetchMLBSchedule);
    yield takeLatest(fetchMLBOddsRequest.type, handleFetchMLBOdds);
    yield takeLatest(mlbPickValidateRequest.type, handleValidateMLBPick);
    yield takeLatest(fetchMLBScheduleByTimezoneRequest.type, handleFetchMLBScheduleByTimezone);
};