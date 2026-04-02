import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import { PayloadAction } from "@reduxjs/toolkit";
import { FetchSearchedUsersPayload } from "@/lib/interfaces/interfaces";
import { fetchSearchedUsersFailure, fetchSearchedUsersRequest, fetchSearchedUsersSuccess } from "../slices/socialSlice";
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

function* handleFetchSearchedUsers(action: PayloadAction<FetchSearchedUsersPayload>): SagaIterator {
    try {
        const { q } = action.payload;

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/social/search`,
            {
                params: { q }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSearchedUsersSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSearchedUsersFailure(getErrorMessage(error, "Failed to search users!")));
    }
};

export default function* socialSaga() {
    yield takeLatest(fetchSearchedUsersRequest.type, handleFetchSearchedUsers);
};