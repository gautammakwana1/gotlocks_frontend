import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import { fetchMyProgressFailure, fetchMyProgressRequest, fetchMyProgressSuccess, fetchProgressByUserIdFailure, fetchProgressByUserIdRequest, fetchProgressByUserIdSuccess } from "../slices/progressSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { FetchProgressByUserIdPayload } from "@/lib/interfaces/interfaces";
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

function* handleFetchMyProgress(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/progress/get-my-progress`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMyProgressSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMyProgressFailure(getErrorMessage(error, "Progress Fetch Failed")));
    }
};

function* handleFetchProgressByUserId(action: PayloadAction<FetchProgressByUserIdPayload>): SagaIterator {
    try {
        const { user_id } = action.payload;

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/progress/progress-by-user-id`,
            {
                params: { user_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchProgressByUserIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchProgressByUserIdFailure(getErrorMessage(error, "Progress Fetch Failed")));
    }
};

export default function* nflSaga() {
    yield takeLatest(fetchMyProgressRequest.type, handleFetchMyProgress);
    yield takeLatest(fetchProgressByUserIdRequest.type, handleFetchProgressByUserId);
};