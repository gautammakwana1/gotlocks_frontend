import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import { autoGradingPicksFailure, autoGradingPicksRequest, autoGradingPicksSuccess, createPickFailure, createPickOfDayFailure, createPickOfDayRequest, createPickOfDaySuccess, createPickReactionFailure, createPickReactionRequest, createPickReactionSuccess, createPickRequest, createPickSuccess, createPostPickFailure, createPostPickRequest, createPostPickSuccess, createVibePickFailure, createVibePickRequest, createVibePickSuccess, deletePickFailure, deletePickRequest, deletePickSuccess, deletePostPickFailure, deletePostPickRequest, deletePostPickSuccess, fetchAllGlobalPostPicksFailure, fetchAllGlobalPostPicksRequest, fetchAllGlobalPostPicksSuccess, fetchAllGroupsMembersPickOfDayFailure, fetchAllGroupsMembersPickOfDayRequest, fetchAllGroupsMembersPickOfDaySuccess, fetchAllMyPickOfDayFailure, fetchAllMyPickOfDayRequest, fetchAllMyPickOfDaySuccess, fetchAllMyPostPicksFailure, fetchAllMyPostPicksRequest, fetchAllMyPostPicksSuccess, fetchAllMyVibePicksFailure, fetchAllMyVibePicksRequest, fetchAllMyVibePicksSuccess, fetchAllOverPickOfDayFailure, fetchAllOverPickOfDayRequest, fetchAllOverPickOfDaySuccess, fetchAllPickOfDayByUserIdFailure, fetchAllPickOfDayByUserIdRequest, fetchAllPickOfDayByUserIdSuccess, fetchAllPicksFailure, fetchAllPicksRequest, fetchAllPicksSuccess, fetchAllVibePicksByUserIdFailure, fetchAllVibePicksByUserIdRequest, fetchAllVibePicksByUserIdSuccess, fetchFollowingUsersPickOfDayFailure, fetchFollowingUsersPickOfDayRequest, fetchFollowingUsersPickOfDaySuccess, fetchFollowingUsersPostsFailure, fetchFollowingUsersPostsRequest, fetchFollowingUsersPostsSuccess, fetchFollowingUsersWinnerPickOfDayFailure, fetchFollowingUsersWinnerPickOfDayRequest, fetchFollowingUsersWinnerPickOfDaySuccess, fetchFollowingUsersWinTopHitPostsFailure, fetchFollowingUsersWinTopHitPostsRequest, fetchFollowingUsersWinTopHitPostsSuccess, fetchGlobalPendingReactedPostsFailure, fetchGlobalPendingReactedPostsRequest, fetchGlobalPendingReactedPostsSuccess, fetchGlobalPendingTopHitPostsFailure, fetchGlobalPendingTopHitPostsRequest, fetchGlobalPendingTopHitPostsSuccess, fetchGlobalWinnerPickOfDayFailure, fetchGlobalWinnerPickOfDayRequest, fetchGlobalWinnerPickOfDaySuccess, fetchGlobalWinnerTopHitPostsFailure, fetchGlobalWinnerTopHitPostsRequest, fetchGlobalWinnerTopHitPostsSuccess, fetchMyPicksBySlipIdFailure, fetchMyPicksBySlipIdRequest, fetchMyPicksBySlipIdSuccess, fetchPickOfDayFailure, fetchPickOfDayRequest, fetchPickOfDaySuccess, fetchPostPicksByUserIdFailure, fetchPostPicksByUserIdRequest, fetchPostPicksByUserIdSuccess, fetchRecentPicksFailure, fetchRecentPicksRequest, fetchRecentPicksSuccess, updatePicksFailure, updatePicksRequest, updatePicksSuccess } from "../slices/pickSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { AutoGradingPicksPayload, CreatePickOfDayPayload, CreatePickPayload, CreatePostPickPayload, DeletePickPayload, DeletePostPickPayload, FetchPickOfDayByUserIdPayload, FetchPicksPayload, FetchPostPicksByUserIdPayload, ReactionPickOfDayPayload, UpdateMultiplePayload } from "@/lib/interfaces/interfaces";

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

function* handleCreatePick(action: PayloadAction<CreatePickPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/create`,
            action.payload
        );
        yield put(createPickSuccess(response.data));
    } catch (error: unknown) {
        yield put(createPickFailure(getErrorMessage(error, "Pick Creation Failed")));
    }
}

function* handleFetchAllPicks(action: PayloadAction<FetchPicksPayload | undefined>): SagaIterator {
    try {
        const { slip_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick`,
            {
                params: { slip_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllPicksFailure(getErrorMessage(error, "Picks Fetch Failed")));
    }
}

function* handleUpdateMultiplePicks(action: PayloadAction<UpdateMultiplePayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/pick/update-multiple-picks`,
            action.payload
        );
        yield put(updatePicksSuccess(response.data));
    } catch (error: unknown) {
        yield put(updatePicksFailure(getErrorMessage(error, "Update Picks Failed")));
    }
}

function* handleFetchRecentPicks(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/recent-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchRecentPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchRecentPicksFailure(getErrorMessage(error, "Recent Picks Fetch Failed")));
    }
}

function* handleDeletePicks(action: PayloadAction<DeletePickPayload>): SagaIterator {
    try {
        const { pick_id = "" } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/pick/delete-pick/${pick_id}`,
        );
        const payload = response.data as { data?: unknown };
        yield put(deletePickSuccess(payload));
    } catch (error: unknown) {
        yield put(deletePickFailure(getErrorMessage(error, "Pick deletion Failed")));
    }
}

function* handleCreatePickOfDay(action: PayloadAction<CreatePickOfDayPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/create-pick-of-day`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createPickOfDaySuccess(payload));
    } catch (error: unknown) {
        yield put(createPickOfDayFailure(getErrorMessage(error, "Pick of the day Creation Failed")));
    }
}

function* handleFetchOwnPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/own-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchPickOfDayFailure(getErrorMessage(error, "Pick of the day Fetch Failed")));
    }
}

function* handleFetchAllOwnPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/own-all-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllMyPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllMyPickOfDayFailure(getErrorMessage(error, "All My Pick of the day Fetch Failed")));
    }
}

function* handlePickReaction(action: PayloadAction<ReactionPickOfDayPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/reaction-pick-of-day`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createPickReactionSuccess(payload));
    } catch (error: unknown) {
        yield put(createPickReactionFailure(getErrorMessage(error, "Pick Reaction Failed")));
    }
}

function* handleFetchAllGroupMembersPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/group-members-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllGroupsMembersPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllGroupsMembersPickOfDayFailure(getErrorMessage(error, "All Group Members Pick of the day Fetch Failed")));
    }
}

function* handleFetchAllPickOfDayByUserId(action: PayloadAction<FetchPickOfDayByUserIdPayload>): SagaIterator {
    try {
        const { userId } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/pick-of-day-by-userId`,
            {
                params: { userId }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllPickOfDayByUserIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllPickOfDayByUserIdFailure(getErrorMessage(error, "Fetch Picks by User Id Failed")));
    }
}

function* handleFetchAllOverPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-users-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllOverPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllOverPickOfDayFailure(getErrorMessage(error, "Failed to fetch all over pick of the day!")));
    }
}

function* handleFetchFollowingUsersPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFollowingUsersPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersPickOfDayFailure(getErrorMessage(error, "Failed to fetch following feeds!")));
    }
}

function* handleFetchGlobalWinnerPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/global-winner-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchGlobalWinnerPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchGlobalWinnerPickOfDayFailure(getErrorMessage(error, "Failed to fetch global winners!")));
    }
}

function* handleFetchFollowingUsersWinnerPickOfDay(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-winner-pick-of-day`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFollowingUsersWinnerPickOfDaySuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersWinnerPickOfDayFailure(getErrorMessage(error, "Failed to fetch following users winners!")));
    }
}

function* handleFetchMyPicksBySlipId(action: PayloadAction<FetchPicksPayload>): SagaIterator {
    try {
        const { slip_id = "" } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/picks-by-slip`,
            {
                params: { slip_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMyPicksBySlipIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMyPicksBySlipIdFailure(getErrorMessage(error, "Failed to fetch picks!")));
    }
}

function* handleCreateVibePick(action: PayloadAction<CreatePickOfDayPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/create-vibe-picks`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createVibePickSuccess(payload));
    } catch (error: unknown) {
        yield put(createVibePickFailure(getErrorMessage(error, "Vibe Pick Creation Failed")));
    }
}

function* handleFetchAllMyVibePicks(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/own-all-vibe-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllMyVibePicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllMyVibePicksFailure(getErrorMessage(error, "All My Vibe Picks Fetch Failed")));
    }
}

function* handleFetchAllVibePicksByUserId(action: PayloadAction<FetchPickOfDayByUserIdPayload>): SagaIterator {
    try {
        const { userId } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/vibe-picks-by-userId`,
            {
                params: { userId }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllVibePicksByUserIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllVibePicksByUserIdFailure(getErrorMessage(error, "Fetch Vibe Picks by User Id Failed")));
    }
}

function* handleCreatePostPick(action: PayloadAction<CreatePostPickPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/create-post-pick`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createPostPickSuccess(payload));
    } catch (error: unknown) {
        yield put(createPostPickFailure(getErrorMessage(error, "Post Pick Creation Failed")));
    }
}

function* handleFetchAllMyPostPick(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllMyPostPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllMyPostPicksFailure(getErrorMessage(error, "Post Pick Fetch Failed")));
    }
}

function* handleFetchAllGlobalPostPick(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllGlobalPostPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllGlobalPostPicksFailure(getErrorMessage(error, "Globally Post Pick Fetch Failed")));
    }
}

function* handleFetchGlobalWinnerTopHitPosts(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-winner-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchGlobalWinnerTopHitPostsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchGlobalWinnerTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchGlobalPendingTopHitPosts(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-pending-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchGlobalPendingTopHitPostsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchGlobalPendingTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchGlobalReactedPendingTopHitPosts(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/global-reacted-pending-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchGlobalPendingReactedPostsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchGlobalPendingReactedPostsFailure(getErrorMessage(error, "Globally Reacted Top Posts Fetch Failed")));
    }
}

function* handleFetchFollowingUsersWinTopHitPosts(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-top-hit-posts`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFollowingUsersWinTopHitPostsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersWinTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchFollowingUsersPicksPosts(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-post-picks`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFollowingUsersPostsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersPostsFailure(getErrorMessage(error, "Followed Users Posts Fetch Failed")));
    }
}

function* handleFetchPostPicksByUserIdPosts(action: PayloadAction<FetchPostPicksByUserIdPayload>): SagaIterator {
    try {
        const { user_id } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/post-picks-by-user-id`,
            {
                params: { user_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchPostPicksByUserIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchPostPicksByUserIdFailure(getErrorMessage(error, "User's Post Picks Fetch Failed")));
    }
}

function* handleDeletePostPick(action: PayloadAction<DeletePostPickPayload>): SagaIterator {
    try {
        const { pick_id } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/pick/delete-post-pick`,
            {
                params: { pick_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(deletePostPickSuccess(payload));
    } catch (error: unknown) {
        yield put(deletePostPickFailure(getErrorMessage(error, "Post Picks delete Failed")));
    }
}

function* handleAutoGradingPicks(action: PayloadAction<AutoGradingPicksPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/auto-grading-picks`,
            action.payload,
        );
        const payload = response.data as { data?: unknown };
        yield put(autoGradingPicksSuccess(payload));
    } catch (error: unknown) {
        yield put(autoGradingPicksFailure(getErrorMessage(error, "Auto Grading Picks Failed")));
    }
}

export default function* pickSaga() {
    yield takeLatest(createPickRequest.type, handleCreatePick);
    yield takeLatest(fetchAllPicksRequest.type, handleFetchAllPicks);
    yield takeLatest(updatePicksRequest.type, handleUpdateMultiplePicks);
    yield takeLatest(fetchRecentPicksRequest.type, handleFetchRecentPicks);
    yield takeLatest(deletePickRequest.type, handleDeletePicks);
    yield takeLatest(createPickOfDayRequest.type, handleCreatePickOfDay);
    yield takeLatest(fetchPickOfDayRequest.type, handleFetchOwnPickOfDay);
    yield takeLatest(fetchAllMyPickOfDayRequest.type, handleFetchAllOwnPickOfDay);
    yield takeLatest(createPickReactionRequest.type, handlePickReaction);
    yield takeLatest(fetchAllGroupsMembersPickOfDayRequest.type, handleFetchAllGroupMembersPickOfDay);
    yield takeLatest(fetchAllPickOfDayByUserIdRequest.type, handleFetchAllPickOfDayByUserId);
    yield takeLatest(fetchAllOverPickOfDayRequest.type, handleFetchAllOverPickOfDay);
    yield takeLatest(fetchFollowingUsersPickOfDayRequest.type, handleFetchFollowingUsersPickOfDay);
    yield takeLatest(fetchGlobalWinnerPickOfDayRequest.type, handleFetchGlobalWinnerPickOfDay);
    yield takeLatest(fetchFollowingUsersWinnerPickOfDayRequest.type, handleFetchFollowingUsersWinnerPickOfDay);
    yield takeLatest(fetchMyPicksBySlipIdRequest.type, handleFetchMyPicksBySlipId);
    yield takeLatest(createVibePickRequest.type, handleCreateVibePick);
    yield takeLatest(fetchAllMyVibePicksRequest.type, handleFetchAllMyVibePicks);
    yield takeLatest(fetchAllVibePicksByUserIdRequest.type, handleFetchAllVibePicksByUserId);
    yield takeLatest(createPostPickRequest.type, handleCreatePostPick);
    yield takeLatest(fetchAllMyPostPicksRequest.type, handleFetchAllMyPostPick);
    yield takeLatest(fetchAllGlobalPostPicksRequest.type, handleFetchAllGlobalPostPick);
    yield takeLatest(fetchGlobalWinnerTopHitPostsRequest.type, handleFetchGlobalWinnerTopHitPosts);
    yield takeLatest(fetchGlobalPendingTopHitPostsRequest.type, handleFetchGlobalPendingTopHitPosts);
    yield takeLatest(fetchFollowingUsersWinTopHitPostsRequest.type, handleFetchFollowingUsersWinTopHitPosts);
    yield takeLatest(fetchFollowingUsersPostsRequest.type, handleFetchFollowingUsersPicksPosts);
    yield takeLatest(fetchPostPicksByUserIdRequest.type, handleFetchPostPicksByUserIdPosts);
    yield takeLatest(deletePostPickRequest.type, handleDeletePostPick);
    yield takeLatest(autoGradingPicksRequest.type, handleAutoGradingPicks);
    yield takeLatest(fetchGlobalPendingReactedPostsRequest.type, handleFetchGlobalReactedPendingTopHitPosts);
};