import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { fetchNotificationListFailure, fetchNotificationListRequest, fetchNotificationListSuccess, markNotificationReadFailure, markNotificationReadRequest, markNotificationReadSuccess } from "../slices/notificationSlice";

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

function* handleFetchNotifications(action: PayloadAction): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/notification/`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchNotificationListSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchNotificationListFailure(getErrorMessage(error, "Failed Fetch notifications")));
    }
}

function* handleMarkNotificationRead(action: PayloadAction): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/notification/mark-read`,
        );
        const payload = response.data as { data?: unknown };
        yield put(markNotificationReadSuccess(payload.data));
    } catch (error: unknown) {
        yield put(markNotificationReadFailure(getErrorMessage(error, "Failed Read notifications")));
    }
}

export default function* notificationSaga() {
    yield takeLatest(fetchNotificationListRequest.type, handleFetchNotifications);
    yield takeLatest(markNotificationReadRequest.type, handleMarkNotificationRead);
};