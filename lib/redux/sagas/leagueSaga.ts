import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { FetchLeagueCountsPayload } from "@/lib/interfaces/interfaces";
import { fetchLeaguesCountsFailure, fetchLeaguesCountsRequest, fetchLeaguesCountsSuccess } from "../slices/leagueSlice";

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

export default function* nflSaga() {
    yield takeLatest(fetchLeaguesCountsRequest.type, handleFetchLeagueCounts);
};