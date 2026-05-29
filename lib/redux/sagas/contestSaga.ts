import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { ArchiveContestByIdPayload, BadgeAward, BadgeDefinition, Contest, Contests, CreateContestPayload, ExcludeContestMemberPayload, FetchBadgeAwardsByContestIdPayload, FetchContestByIdPayload, FetchContestsPaginationPayload, FetchContestsParams, RecalculateStadingsPayload, ResetBadgeSettingsPayload, UpdateBadgeSettingsPayload, UpdateContestPayload } from "@/lib/interfaces/interfaces";
import { archiveContestByIdFailure, archiveContestByIdRequest, archiveContestByIdSuccess, createContestFailure, createContestRequest, createContestSuccess, excludeContestMemberFailure, excludeContestMemberRequest, excludeContestMemberSuccess, fetchActiveContestsFailure, fetchActiveContestsRequest, fetchActiveContestsSuccess, fetchArchivedContestsFailure, fetchArchivedContestsRequest, fetchArchivedContestsSuccess, fetchBadgeAwardsByContestIdFailure, fetchBadgeAwardsByContestIdRequest, fetchBadgeAwardsByContestIdSuccess, fetchContestByIdFailure, fetchContestByIdRequest, fetchContestByIdSuccess, recalculateStadingsFailure, recalculateStadingsRequest, recalculateStadingsSuccess, resetBadgeSettingsFailure, resetBadgeSettingsRequest, resetBadgeSettingsSuccess, updateBadgeSettingsFailure, updateBadgeSettingsRequest, updateBadgeSettingsSuccess, updateContestFailure, updateContestRequest, updateContestSuccess } from "../slices/contestSlice";

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

function* handleCreateContest(action: PayloadAction<CreateContestPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/contest/create`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createContestSuccess(payload));
    } catch (error: unknown) {
        yield put(createContestFailure(getErrorMessage(error, "Contest create Failed")));
    }
}

function* handleUpdateContest(action: PayloadAction<UpdateContestPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.patch,
            `${API_BASE_URL}/contest/update`,
            action.payload
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(updateContestSuccess(payload));
    } catch (error: unknown) {
        yield put(updateContestFailure(getErrorMessage(error, "Contest update Failed")));
    }
}

function* handleFetchActiveContests(action: PayloadAction<FetchContestsParams | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/contest/active`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { contests: Contests, pagination: FetchContestsPaginationPayload } };
        const contests = payload.data?.contests ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchActiveContestsSuccess({ contests, page, hasMore: pagination?.hasMore ?? contests.length === limit }));
    } catch (error: unknown) {
        yield put(fetchActiveContestsFailure(getErrorMessage(error, "Active contests Fetch Failed")));
    }
}

function* handleFetchArchivedContests(action: PayloadAction<FetchContestsParams | undefined>): SagaIterator {
    try {
        const { group_id = '', page = 1, limit = 10 } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/contest/archived`,
            {
                params: { group_id, page, limit }
            }
        );
        const payload = response.data as { data?: { contests: Contests, pagination: FetchContestsPaginationPayload } };
        const contests = payload.data?.contests ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchArchivedContestsSuccess({ contests, page, hasMore: pagination?.hasMore ?? contests.length === limit }));
    } catch (error: unknown) {
        yield put(fetchArchivedContestsFailure(getErrorMessage(error, "Archived contests Fetch Failed")));
    }
}

function* handleFetchContestById(action: PayloadAction<FetchContestByIdPayload | undefined>): SagaIterator {
    try {
        const { contest_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/contest/contest-by-id`,
            {
                params: { contest_id }
            }
        );
        const payload = response.data as { data?: { contest: Contest } };
        yield put(fetchContestByIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchContestByIdFailure(getErrorMessage(error, "Contest Fetch Failed")))
    }
}

function* handleArchiveContestById(action: PayloadAction<ArchiveContestByIdPayload | undefined>): SagaIterator {
    try {
        const { contest_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/contest/archive`,
            null,
            {
                params: { contest_id }
            }
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(archiveContestByIdSuccess(payload));
    } catch (error: unknown) {
        yield put(archiveContestByIdFailure(getErrorMessage(error, "Contest archive Failed")));
    }
};

function* handleExcludeContestMember(action: PayloadAction<ExcludeContestMemberPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.patch,
            `${API_BASE_URL}/contest/exclude-member`,
            action.payload
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(excludeContestMemberSuccess(payload));
    } catch (error: unknown) {
        yield put(excludeContestMemberFailure(getErrorMessage(error, "Contest member exclude failed")));
    }
};

function* handleFetchBadgeAwardsByContestId(action: PayloadAction<FetchBadgeAwardsByContestIdPayload | undefined>): SagaIterator {
    try {
        const { contest_id = "" } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/contest/badge-awards`,
            {
                params: { contest_id }
            }
        );
        const payload = response.data as { data?: { badgeDefinitions: BadgeDefinition[], badgeAwards: BadgeAward[] }, message: string };
        yield put(fetchBadgeAwardsByContestIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchBadgeAwardsByContestIdFailure(getErrorMessage(error, "Fetch badge awards failed")));
    }
};

function* handleUpdateBadgeSettingsByContestId(action: PayloadAction<UpdateBadgeSettingsPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/contest/update-badge-settings`,
            action.payload
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(updateBadgeSettingsSuccess(payload));
    } catch (error: unknown) {
        yield put(updateBadgeSettingsFailure(getErrorMessage(error, "Badge settings update failed!")));
    }
};

function* handleResetBadgeSettingsByContestId(action: PayloadAction<ResetBadgeSettingsPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/contest/reset-badge-settings`,
            action.payload
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(resetBadgeSettingsSuccess(payload));
    } catch (error: unknown) {
        yield put(resetBadgeSettingsFailure(getErrorMessage(error, "Badge settings reset failed!")));
    }
};

function* handleRecalculateStadings(action: PayloadAction<RecalculateStadingsPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/contest/recalculate-standings`,
            action.payload
        );
        const payload = response.data as { data?: { contest: Contest }, message: string };
        yield put(recalculateStadingsSuccess(payload));
    } catch (error: unknown) {
        yield put(recalculateStadingsFailure(getErrorMessage(error, "Badge recalculate standings failed!")));
    }
};

export default function* contestSaga() {
    yield takeLatest(createContestRequest.type, handleCreateContest);
    yield takeLatest(updateContestRequest.type, handleUpdateContest);
    yield takeLatest(fetchActiveContestsRequest.type, handleFetchActiveContests);
    yield takeLatest(fetchArchivedContestsRequest.type, handleFetchArchivedContests);
    yield takeLatest(fetchContestByIdRequest.type, handleFetchContestById);
    yield takeLatest(archiveContestByIdRequest.type, handleArchiveContestById);
    yield takeLatest(excludeContestMemberRequest.type, handleExcludeContestMember);
    yield takeLatest(fetchBadgeAwardsByContestIdRequest.type, handleFetchBadgeAwardsByContestId);
    yield takeLatest(updateBadgeSettingsRequest.type, handleUpdateBadgeSettingsByContestId);
    yield takeLatest(resetBadgeSettingsRequest.type, handleResetBadgeSettingsByContestId);
    yield takeLatest(recalculateStadingsRequest.type, handleRecalculateStadings);
};