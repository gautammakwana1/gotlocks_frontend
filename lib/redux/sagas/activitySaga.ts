import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { FetchActivityPayload } from "@/lib/interfaces/interfaces";
import { fetchAllActivitiesFailure, fetchAllActivitiesRequest, fetchAllActivitiesSuccess } from "../slices/activitySlice";

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

function* handleFetchAllActivities(action: PayloadAction<FetchActivityPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', start = 0, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/activities`,
            {
                params: { group_id, start, limit }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllActivitiesSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllActivitiesFailure(getErrorMessage(error, "Activities Fetch Failed")));
    }
}

export default function* pickSaga() {
    yield takeLatest(fetchAllActivitiesRequest.type, handleFetchAllActivities);
};