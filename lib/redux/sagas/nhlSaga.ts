import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { FetchNHLOddsPayload, FetchNHLSchedulePayload, ValidateMyNHLPickPayload } from "@/lib/interfaces/interfaces";
import { fetchNHLOddsFailure, fetchNHLOddsRequest, fetchNHLOddsSuccess, fetchNHLScheduleFailure, fetchNHLScheduleRequest, fetchNHLScheduleSuccess, nhlPickValidateFailure, nhlPickValidateRequest, nhlPickValidateSuccess } from "../slices/nhlSlice";

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

function* handleFetchNHLSchedule(action: PayloadAction<FetchNHLSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nhl/nhl-schedules-with-odds`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNHLScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNHLScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchNHLOdds(action: PayloadAction<FetchNHLOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nhl/nhl-odds`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNHLOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNHLOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateNHLPick(action: PayloadAction<ValidateMyNHLPickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key, is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/nhl/nhl-bet-validate`,
            { match_id, external_pick_key, is_live }
        );
        const payload = response.data as { data?: unknown };
        yield put(nhlPickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(nhlPickValidateFailure(getErrorMessage(error, "NHL Pick Validation Failed")));
    }
};

export default function* nflSaga() {
    yield takeLatest(fetchNHLScheduleRequest.type, handleFetchNHLSchedule);
    yield takeLatest(fetchNHLOddsRequest.type, handleFetchNHLOdds);
    yield takeLatest(nhlPickValidateRequest.type, handleValidateNHLPick);
};