import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import { assignToSecondaryLeaderboardFailure, assignToSecondaryLeaderboardRequest, assignToSecondaryLeaderboardSuccess, createSlipFailure, createSlipRequest, createSlipSuccess, deleteSlipFailure, deleteSlipRequest, deleteSlipSuccess, fetchAllFinalizedSlipsFailure, fetchAllFinalizedSlipsRequest, fetchAllFinalizedSlipsSuccess, fetchAllOpenSlipsFailure, fetchAllOpenSlipsRequest, fetchAllOpenSlipsSuccess, fetchAllReviewSlipsFailure, fetchAllReviewSlipsRequest, fetchAllReviewSlipsSuccess, fetchAllSlipsFailure, fetchAllSlipsRequest, fetchAllSlipsSuccess, fetchAllVibeFinalizedSlipsFailure, fetchAllVibeFinalizedSlipsRequest, fetchAllVibeFinalizedSlipsSuccess, fetchAllVibeOpenSlipsFailure, fetchAllVibeOpenSlipsRequest, fetchAllVibeOpenSlipsSuccess, fetchAllVibeReviewSlipsFailure, fetchAllVibeReviewSlipsRequest, fetchAllVibeReviewSlipsSuccess, fetchSlipByIdFailure, fetchSlipByIdRequest, fetchSlipByIdSuccess, markedUnlockSlipFailure, markedUnlockSlipRequest, markedUnlockSlipSuccess, markFinalizeSlipFailure, markFinalizeSlipRequest, markFinalizeSlipSuccess, markGradedSlipFailure, markGradedSlipRequest, markGradedSlipSuccess, markLockSlipFailure, markLockSlipRequest, markLockSlipSuccess, markVoidedSlipFailure, markVoidedSlipRequest, markVoidedSlipSuccess, reOpenSlipFailure, reOpenSlipRequest, reOpenSlipSuccess, startNewContestFailure, startNewContestRequest, startNewContestSuccess, updateSlipsFailure, updateSlipsRequest, updateSlipsSuccess } from "../slices/slipSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { AssignToSecondaryLeaderboardPayload, CreateSlipPayload, DeleteSlipPayload, FetchFinalizeSlipsPayload, FetchOpenSlipsPayload, FetchReviewSlipsPayload, FetchSlipByIdPayload, FetchSlipsPaginationPayload, FetchSlipsPayload, MarkFinalizePayload, MarkGradedPayload, MarkLockPayload, MarkUnlockPayload, MarkVoidedPayload, ReOpenSlipPayload, Slips, StartNewContestPayload, UpdateSlipPayload } from "@/lib/interfaces/interfaces";
import { fetchAllLeaderboardsRequest, fetchArchivedLeaderboardListRequest } from "../slices/groupsSlice";

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

function* handleFetchSlipById(action: PayloadAction<FetchSlipByIdPayload | undefined>): SagaIterator {
    try {
        const { slip_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/slip-by-id`,
            {
                params: { slip_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSlipByIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSlipByIdFailure(getErrorMessage(error, "Slip Fetch Failed")))
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
        const { group_id } = action.payload;

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/slip/start-contest`,
            action.payload
        );
        yield put(startNewContestSuccess(response.data));
        yield put(fetchArchivedLeaderboardListRequest({ groupId: group_id }));
        yield put(fetchAllLeaderboardsRequest({ group_id: group_id }));
        yield put(fetchAllSlipsRequest({ group_id: group_id }));
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

function* handleFetchAllOpenSlips(action: PayloadAction<FetchOpenSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/open`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllOpenSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllOpenSlipsFailure(getErrorMessage(error, "Open slips Fetch Failed")))
    }
}

function* handleFetchAllReviewSlips(action: PayloadAction<FetchReviewSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/review`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllReviewSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllReviewSlipsFailure(getErrorMessage(error, "Review slips Fetch Failed")))
    }
}

function* handleFetchAllFinalizedSlips(action: PayloadAction<FetchFinalizeSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/final`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllFinalizedSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllFinalizedSlipsFailure(getErrorMessage(error, "Finalized slips Fetch Failed")))
    }
}

function* handleFetchAllVibeOpenSlips(action: PayloadAction<FetchOpenSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/vibe-open`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllVibeOpenSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllVibeOpenSlipsFailure(getErrorMessage(error, "Open vibe slips Fetch Failed")))
    }
}

function* handleFetchAllVibeReviewSlips(action: PayloadAction<FetchReviewSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/vibe-review`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllVibeReviewSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllVibeReviewSlipsFailure(getErrorMessage(error, "Review vibe slips Fetch Failed")))
    }
}

function* handleFetchAllVibeFinalizedSlips(action: PayloadAction<FetchFinalizeSlipsPayload | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/slip/vibe-final`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { slips: Slips, pagination: FetchSlipsPaginationPayload } };
        const slips = payload.data?.slips ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchAllVibeFinalizedSlipsSuccess({ slips, page, hasMore: pagination?.hasMore ?? slips.length === limit }));
    } catch (error: unknown) {
        yield put(fetchAllVibeFinalizedSlipsFailure(getErrorMessage(error, "Finalized vibe slips Fetch Failed")))
    }
}

export default function* slipSaga() {
    yield takeLatest(createSlipRequest.type, handleCreateSlip);
    yield takeLatest(fetchAllSlipsRequest.type, handleFetchAllSlips);
    yield takeLatest(fetchSlipByIdRequest.type, handleFetchSlipById);
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
    yield takeLatest(fetchAllOpenSlipsRequest.type, handleFetchAllOpenSlips);
    yield takeLatest(fetchAllReviewSlipsRequest.type, handleFetchAllReviewSlips);
    yield takeLatest(fetchAllFinalizedSlipsRequest.type, handleFetchAllFinalizedSlips);
    yield takeLatest(fetchAllVibeOpenSlipsRequest.type, handleFetchAllVibeOpenSlips);
    yield takeLatest(fetchAllVibeReviewSlipsRequest.type, handleFetchAllVibeReviewSlips);
    yield takeLatest(fetchAllVibeFinalizedSlipsRequest.type, handleFetchAllVibeFinalizedSlips);
};