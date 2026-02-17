import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import { assignToSecondaryLeaderboardFailure, assignToSecondaryLeaderboardRequest, assignToSecondaryLeaderboardSuccess, createSlipFailure, createSlipRequest, createSlipSuccess, deleteSlipFailure, deleteSlipRequest, deleteSlipSuccess, fetchAllSlipsFailure, fetchAllSlipsRequest, fetchAllSlipsSuccess, markedUnlockSlipFailure, markedUnlockSlipRequest, markedUnlockSlipSuccess, markFinalizeSlipFailure, markFinalizeSlipRequest, markFinalizeSlipSuccess, markGradedSlipFailure, markGradedSlipRequest, markGradedSlipSuccess, markLockSlipFailure, markLockSlipRequest, markLockSlipSuccess, markVoidedSlipFailure, markVoidedSlipRequest, markVoidedSlipSuccess, reOpenSlipFailure, reOpenSlipRequest, reOpenSlipSuccess, startNewContestFailure, startNewContestRequest, startNewContestSuccess, updateSlipsFailure, updateSlipsRequest, updateSlipsSuccess } from "../slices/slipSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { AssignToSecondaryLeaderboardPayload, CreateSlipPayload, DeleteSlipPayload, FetchSlipsPayload, MarkFinalizePayload, MarkGradedPayload, MarkLockPayload, MarkUnlockPayload, MarkVoidedPayload, ReOpenSlipPayload, StartNewContestPayload, UpdateSlipPayload } from "@/lib/interfaces/interfaces";

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

function* handleCreateSlip(action: PayloadAction<CreateSlipPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/create`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createSlipSuccess(payload));
    } catch (error: unknown) {
        yield put(createSlipFailure(getErrorMessage(error, "Slip Creation Failed")));
    }
}

function* handleFetchAllSlips(action: PayloadAction<FetchSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip`,
            {
                params: { group_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllSlipsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllSlipsFailure(getErrorMessage(error, "Slip Fetch Failed")))
    }
}

function* handleUpdateSlips(action: PayloadAction<UpdateSlipPayload>): SagaIterator {
    try {

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/slip/update`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(updateSlipsSuccess(payload));
        if (action.payload.slip_id) {
            yield put(fetchAllSlipsRequest({ group_id: action.payload.group_id }));
        }
    } catch (error: unknown) {
        yield put(updateSlipsFailure(getErrorMessage(error, "Slip Update Failed")))
    }
}

function* handleMarkLockSlip(action: PayloadAction<MarkLockPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/slip/mark-lock`,
            action.payload
        );
        yield put(markLockSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(markLockSlipFailure(getErrorMessage(error, "Slip Locked Failed")))
    }
}

function* handleMarkUnlockSlip(action: PayloadAction<MarkUnlockPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/slip/mark-unlock`,
            action.payload
        );
        yield put(markedUnlockSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(markedUnlockSlipFailure(getErrorMessage(error, "Slip Unlocked Failed")))
    }
}

function* handleMarkFinalizeSlip(action: PayloadAction<MarkFinalizePayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/mark-finalize`,
            action.payload
        );
        yield put(markFinalizeSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(markFinalizeSlipFailure(getErrorMessage(error, "Slip Finalized Failed")))
    }
}

function* handleMarkVoidedSlip(action: PayloadAction<MarkVoidedPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/mark-voided`,
            action.payload
        );
        yield put(markVoidedSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(markVoidedSlipFailure(getErrorMessage(error, "Slip Finalized Failed")))
    }
}

function* handleMarkGradedSlip(action: PayloadAction<MarkGradedPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/mark-graded`,
            action.payload
        );
        yield put(markGradedSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(markGradedSlipFailure(getErrorMessage(error, "Slip Grading Failed")))
    }
}

function* handleStartNewContest(action: PayloadAction<StartNewContestPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/start-contest`,
            action.payload
        );
        yield put(startNewContestSuccess(response.data));
    } catch (error: unknown) {
        yield put(startNewContestFailure(getErrorMessage(error, "Slip Finalized Failed")))
    }
}

function* handleDeleteSlip(action: PayloadAction<DeleteSlipPayload>): SagaIterator {
    try {
        const { slip_id = "" } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/slip/delete/${slip_id}`
        );
        yield put(deleteSlipSuccess(response.data));
    } catch (error: unknown) {
        yield put(deleteSlipFailure(getErrorMessage(error, "Slip Delete Failed")))
    }
}

function* handleReOpenSlip(action: PayloadAction<ReOpenSlipPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/re-open`,
            action.payload,
        );
        const payload = response.data as { data?: unknown };
        yield put(reOpenSlipSuccess(payload));
    } catch (error: unknown) {
        yield put(reOpenSlipFailure(getErrorMessage(error, "Slip Re-opened Failed")));
    }
}

function* handleAssignToSecondaryLeaderboard(action: PayloadAction<AssignToSecondaryLeaderboardPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.patch,
            `${API_BASE_URL}/slip/assign-secondary-leaderboard`,
            action.payload,
        );
        const payload = response.data as { data?: unknown };
        yield put(assignToSecondaryLeaderboardSuccess(payload));
    } catch (error: unknown) {
        yield put(assignToSecondaryLeaderboardFailure(getErrorMessage(error, "Slip assign to secondary leaderboard Failed")));
    }
}

export default function* slipSaga() {
    yield takeLatest(createSlipRequest.type, handleCreateSlip);
    yield takeLatest(fetchAllSlipsRequest.type, handleFetchAllSlips);
    yield takeLatest(updateSlipsRequest.type, handleUpdateSlips);
    yield takeLatest(markLockSlipRequest.type, handleMarkLockSlip);
    yield takeLatest(markedUnlockSlipRequest.type, handleMarkUnlockSlip);
    yield takeLatest(markFinalizeSlipRequest.type, handleMarkFinalizeSlip);
    yield takeLatest(markVoidedSlipRequest.type, handleMarkVoidedSlip);
    yield takeLatest(startNewContestRequest.type, handleStartNewContest);
    yield takeLatest(markGradedSlipRequest.type, handleMarkGradedSlip);
    yield takeLatest(deleteSlipRequest.type, handleDeleteSlip);
    yield takeLatest(reOpenSlipRequest.type, handleReOpenSlip);
    yield takeLatest(assignToSecondaryLeaderboardRequest.type, handleAssignToSecondaryLeaderboard);
};