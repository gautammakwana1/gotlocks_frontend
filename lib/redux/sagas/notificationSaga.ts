import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { clearAllNotificationFailure, clearAllNotificationRequest, clearAllNotificationSuccess, fetchNotificationListFailure, fetchNotificationListRequest, fetchNotificationListSuccess, markNotificationReadFailure, markNotificationReadRequest, markNotificationReadSuccess } from "../slices/notificationSlice";
import { AppNotification, FetchNotificationsPayload, FetchPicksPaginationPayload } from "@/lib/interfaces/interfaces";

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

function* handleFetchNotifications(action: PayloadAction<FetchNotificationsPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 20 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/notification/`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { notifications: AppNotification[], pagination: FetchPicksPaginationPayload } };
        const notifications = payload.data?.notifications ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchNotificationListSuccess({ notifications, page, hasMore: pagination?.hasMore ?? notifications.length === limit }));
    } catch (error: unknown) {
        yield put(fetchNotificationListFailure(getErrorMessage(error, "Failed Fetch notifications")));
    }
};

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

function* handleClearAllNotifications(action: PayloadAction): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/notification/clear`,
        );
        const payload = response.data as { data?: unknown };
        yield put(clearAllNotificationSuccess(payload.data));
    } catch (error: unknown) {
        yield put(clearAllNotificationFailure(getErrorMessage(error, "Failed to clear notifications")));
    }
}

export default function* notificationSaga() {
    yield takeLatest(fetchNotificationListRequest.type, handleFetchNotifications);
    yield takeLatest(markNotificationReadRequest.type, handleMarkNotificationRead);
    yield takeLatest(clearAllNotificationRequest.type, handleClearAllNotifications);
};