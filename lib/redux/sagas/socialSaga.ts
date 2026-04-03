import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import { PayloadAction } from "@reduxjs/toolkit";
import { FetchSearchedUsersPaginationPayload, FetchSearchedUsersPayload, SearchUsers } from "@/lib/interfaces/interfaces";
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
        const { q, page = 1, limit = 10 } = action.payload;

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/social/search`,
            {
                params: { q, page, limit }
            }
        );
        const payload = response.data as { data?: { users: SearchUsers[], pagination: FetchSearchedUsersPaginationPayload } };
        const users = payload.data?.users ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchSearchedUsersSuccess({ users, page, hasMore: pagination?.hasMore ?? users.length === limit }));
    } catch (error: unknown) {
        yield put(fetchSearchedUsersFailure(getErrorMessage(error, "Failed to search users!")));
    }
};

export default function* socialSaga() {
    yield takeLatest(fetchSearchedUsersRequest.type, handleFetchSearchedUsers);
};