import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { FetchNCAABOddsPayload, FetchNCAABSchedulePayload, ValidateMyNCAABPickPayload } from "@/lib/interfaces/interfaces";
import { fetchNCAABOddsFailure, fetchNCAABOddsRequest, fetchNCAABOddsSuccess, fetchNCAABScheduleFailure, fetchNCAABScheduleRequest, fetchNCAABScheduleSuccess, ncaabPickValidateFailure, ncaabPickValidateRequest, ncaabPickValidateSuccess } from "../slices/ncaabSlice";

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

function* handleFetchNCAABSchedule(action: PayloadAction<FetchNCAABSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/ncaab/schedules-with-odds`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNCAABScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNCAABScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchNCAABOdds(action: PayloadAction<FetchNCAABOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/ncaab/odds`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNCAABOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNCAABOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateNCAABPick(action: PayloadAction<ValidateMyNCAABPickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key, is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/leagues/ncaab/bet-validate`,
            { match_id, external_pick_key, is_live }
        );
        const payload = response.data as { data?: unknown };
        yield put(ncaabPickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(ncaabPickValidateFailure(getErrorMessage(error, "NCAAB Pick Validation Failed")));
    }
};

export default function* nflSaga() {
    yield takeLatest(fetchNCAABScheduleRequest.type, handleFetchNCAABSchedule);
    yield takeLatest(fetchNCAABOddsRequest.type, handleFetchNCAABOdds);
    yield takeLatest(ncaabPickValidateRequest.type, handleValidateNCAABPick);
};