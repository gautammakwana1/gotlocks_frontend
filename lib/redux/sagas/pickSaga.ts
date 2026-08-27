import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import { autoGradingPicksFailure, autoGradingPicksRequest, autoGradingPicksSuccess, createPickFailure, createPickReactionFailure, createPickReactionRequest, createPickReactionSuccess, createPickRequest, createPickSuccess, createPostPickFailure, createPostPickRequest, createPostPickSuccess, deletePickFailure, deletePickRequest, deletePickSuccess, deletePostPickFailure, deletePostPickRequest, deletePostPickSuccess, fetchAllContestsPicksFailure, fetchAllContestsPicksRequest, fetchAllContestsPicksSuccess, fetchAllGlobalPostPicksFailure, fetchAllGlobalPostPicksRequest, fetchAllGlobalPostPicksSuccess, fetchAllMyPostPicksFailure, fetchAllMyPostPicksRequest, fetchAllMyPostPicksSuccess, fetchAllPicksFailure, fetchAllPicksRequest, fetchAllPicksSuccess, fetchFollowingUsersAllStatusPostsFailure, fetchFollowingUsersAllStatusPostsRequest, fetchFollowingUsersAllStatusPostsSuccess, fetchFollowingUsersPostsFailure, fetchFollowingUsersPostsRequest, fetchFollowingUsersPostsSuccess, fetchFollowingUsersWinTopHitPostsFailure, fetchFollowingUsersWinTopHitPostsRequest, fetchFollowingUsersWinTopHitPostsSuccess, fetchGlobalAllStatusPostsFailure, fetchGlobalAllStatusPostsRequest, fetchGlobalAllStatusPostsSuccess, fetchGlobalLeaderboardFailure, fetchGlobalLeaderboardRequest, fetchGlobalLeaderboardSuccess, fetchGlobalPendingReactedPostsFailure, fetchGlobalPendingReactedPostsRequest, fetchGlobalPendingReactedPostsSuccess, fetchGlobalPendingTopHitPostsFailure, fetchGlobalPendingTopHitPostsRequest, fetchGlobalPendingTopHitPostsSuccess, fetchGlobalWinnerTopHitPostsFailure, fetchGlobalWinnerTopHitPostsRequest, fetchGlobalWinnerTopHitPostsSuccess, fetchMyPicksBySlipIdFailure, fetchMyPicksBySlipIdRequest, fetchMyPicksBySlipIdSuccess, fetchPostPicksByUserIdFailure, fetchPostPicksByUserIdRequest, fetchPostPicksByUserIdSuccess, fetchRecentPicksFailure, fetchRecentPicksRequest, fetchRecentPicksSuccess, fetchSlipContestPicksFailure, fetchSlipContestPicksRequest, fetchSlipContestPicksSuccess, replaceOrCreatePostablePickFailure, replaceOrCreatePostablePickRequest, replaceOrCreatePostablePickSuccess, resetPicksScoringPointsFailure, resetPicksScoringPointsRequest, resetPicksScoringPointsSuccess, updatePicksFailure, updatePicksRequest, updatePicksSuccess } from "../slices/pickSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { AutoGradingPicksPayload, CreatePickPayload, CreatePostPickPayload, DeletePickPayload, DeletePostPickPayload, FetchContestPicksPayload, FetchPicksPaginationPayload, FetchPicksPayload, FetchPostPicksByUserIdPayload, FetchPostPicksPayload, FetchSlipContestPicksPayload, FetchSocialGlobalLeaderboardPayload, Picks, SlipContestPicksData, ReactionPickOfDayPayload, ReplaceOrCreatePostablePickPayload, ResetPicksScoringPointsPayload, UpdateMultiplePayload } from "@/lib/interfaces/interfaces";
import { fetchPostablePickSlipsRequest } from "../slices/slipSlice";

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

function* handleFetchGlobalWinnerTopHitPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-winner-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchGlobalWinnerTopHitPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchGlobalWinnerTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchGlobalPendingTopHitPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-pending-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchGlobalPendingTopHitPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchGlobalPendingTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchGlobalReactedPendingTopHitPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/global-reacted-pending-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchGlobalPendingReactedPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchGlobalPendingReactedPostsFailure(getErrorMessage(error, "Globally Reacted Top Posts Fetch Failed")));
    }
}

function* handleFetchFollowingUsersWinTopHitPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-top-hit-posts`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchFollowingUsersWinTopHitPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersWinTopHitPostsFailure(getErrorMessage(error, "Globally Top Posts Fetch Failed")));
    }
}

function* handleFetchFollowingUsersPicksPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchFollowingUsersPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersPostsFailure(getErrorMessage(error, "Followed Users Posts Fetch Failed")));
    }
}

/* ----------------------------------------------------------------------------
 * The two SOCIAL feeds, and the only two post-pick reads that are not narrowed
 * to one result. `/pick/all-global-post-picks` and its following-scoped twin
 * return pending, win, loss and void alike, ordered purely by recency
 * (created_at DESC, id DESC) rather than by XP or points — which is what makes
 * "newest on top" a server guarantee rather than a client re-sort of one page.
 *
 * DELIBERATELY separate from `fetchGlobalPendingTopHitPosts` rather than a
 * re-point of it: HomeTab dispatches that one too, and it wants the pending-only,
 * XP-ranked feed. They share the `postPicks` slot, so changing its URL would
 * alter what Home leaves behind for the next screen to mount.
 *
 * Both endpoints CLAMP `limit` at 50 server-side and say nothing about it — the
 * clamped value comes back in `pagination.limit`. The Social page is what has to
 * respect that ceiling; nothing here can detect it.
 * -------------------------------------------------------------------------- */
function* handleFetchGlobalAllStatusPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/all-global-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchGlobalAllStatusPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchGlobalAllStatusPostsFailure(getErrorMessage(error, "Global Feed Posts Fetch Failed")));
    }
}

function* handleFetchFollowingUsersAllStatusPosts(action: PayloadAction<FetchPostPicksPayload | undefined>): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/following-users-all-post-picks`,
            {
                params: { page, limit }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchFollowingUsersAllStatusPostsSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
    } catch (error: unknown) {
        yield put(fetchFollowingUsersAllStatusPostsFailure(getErrorMessage(error, "Following Feed Posts Fetch Failed")));
    }
}

function* handleFetchPostPicksByUserIdPosts(action: PayloadAction<FetchPostPicksByUserIdPayload>): SagaIterator {
    try {
        const { user_id, page = 1, limit = 10, pick_id, sort_by, result, pick_type, confidence_lvl } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/post-picks-by-user-id`,
            {
                params: {
                    user_id,
                    page,
                    limit,
                    ...(sort_by ? { sort_by } : {}),
                    ...(result ? { result } : {}),
                    ...(pick_type ? { pick_type } : {}),
                    ...(confidence_lvl ? { confidence_lvl } : {}),
                    ...(pick_id ? { pick_id } : {}),
                }
            }
        );
        const payload = response.data as { data?: { picks: Picks, pagination: FetchPicksPaginationPayload } };
        const picks = payload.data?.picks ?? [];
        const pagination = payload.data?.pagination;
        yield put(fetchPostPicksByUserIdSuccess({ picks, page, hasMore: pagination?.hasMore ?? picks.length === limit }));
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

function* handleFetchAllContestsPicks(action: PayloadAction<FetchContestPicksPayload | undefined>): SagaIterator {
    try {
        const { contest_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/contest-picks`,
            {
                params: { contest_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchAllContestsPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchAllContestsPicksFailure(getErrorMessage(error, "Contest Picks Fetch Failed")));
    }
}

function* handleReplaceOrCreatePostablePick(action: PayloadAction<ReplaceOrCreatePostablePickPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/pick/replace-or-create-pick`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(replaceOrCreatePostablePickSuccess(payload));
        yield put(fetchPostablePickSlipsRequest({}));
    } catch (error: unknown) {
        yield put(replaceOrCreatePostablePickFailure(getErrorMessage(error, "Pick updates failed")));
    }
}

function* handleResetPicksScoringPoints(action: PayloadAction<ResetPicksScoringPointsPayload>): SagaIterator {
    try {
        const { slip_id = "" } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.patch,
            `${API_BASE_URL}/pick/reset-picks-scoring-point`,
            {},
            {
                params: { slip_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(resetPicksScoringPointsSuccess(payload));
    } catch (error: unknown) {
        yield put(resetPicksScoringPointsFailure(getErrorMessage(error, "Reset Picks Scoring failed")));
    }
}

function* handleFetchGlobalLeaderboard(action: PayloadAction<FetchSocialGlobalLeaderboardPayload>): SagaIterator {
    try {
        const { range = "last-week" } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/fetch-social-global-leaderboard`,
            {
                params: { range }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchGlobalLeaderboardSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchGlobalLeaderboardFailure(getErrorMessage(error, "Global Leaderboard fetch failed")));
    }
}

/*
 * GET /pick/slip-contest-picks — the group's Slip (Fantasy) contest picks, which
 * is what the League Feed lists alongside its Feed-contest entries.
 *
 * No reveal rule to honour: every pick on this surface is public to the group
 * from the moment it is made, whatever its slip's status, and the server states
 * that back as `summary.is_revealed: true` rather than leaving it to be inferred.
 */
function* handleFetchSlipContestPicks(
    action: PayloadAction<FetchSlipContestPicksPayload>
): SagaIterator {
    const {
        group_id,
        contest_id,
        slip_id,
        user_id,
        status,
        slip_type,
        result,
        page = 1,
        limit = 20,
    } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/pick/slip-contest-picks`,
            {
                params: {
                    group_id,
                    page,
                    limit,
                    ...(contest_id ? { contest_id } : {}),
                    ...(slip_id ? { slip_id } : {}),
                    ...(user_id ? { user_id } : {}),
                    ...(status ? { status } : {}),
                    ...(slip_type ? { slip_type } : {}),
                    ...(result ? { result } : {}),
                },
            }
        );
        const payload = response.data as { data?: SlipContestPicksData };
        if (!payload?.data?.group) {
            yield put(fetchSlipContestPicksFailure("Failed to load slip contest picks"));
            return;
        }
        yield put(fetchSlipContestPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchSlipContestPicksFailure(
                getErrorMessage(error, "Failed to load slip contest picks")
            )
        );
    }
}

export default function* pickSaga() {
    yield takeLatest(createPickRequest.type, handleCreatePick);
    yield takeLatest(fetchAllPicksRequest.type, handleFetchAllPicks);
    yield takeLatest(updatePicksRequest.type, handleUpdateMultiplePicks);
    yield takeLatest(fetchRecentPicksRequest.type, handleFetchRecentPicks);
    yield takeLatest(deletePickRequest.type, handleDeletePicks);
    yield takeLatest(createPickReactionRequest.type, handlePickReaction);
    yield takeLatest(fetchMyPicksBySlipIdRequest.type, handleFetchMyPicksBySlipId);
    yield takeLatest(createPostPickRequest.type, handleCreatePostPick);
    yield takeLatest(fetchAllMyPostPicksRequest.type, handleFetchAllMyPostPick);
    yield takeLatest(fetchAllGlobalPostPicksRequest.type, handleFetchAllGlobalPostPick);
    yield takeLatest(fetchGlobalWinnerTopHitPostsRequest.type, handleFetchGlobalWinnerTopHitPosts);
    yield takeLatest(fetchGlobalPendingTopHitPostsRequest.type, handleFetchGlobalPendingTopHitPosts);
    yield takeLatest(fetchFollowingUsersWinTopHitPostsRequest.type, handleFetchFollowingUsersWinTopHitPosts);
    yield takeLatest(fetchFollowingUsersPostsRequest.type, handleFetchFollowingUsersPicksPosts);
    // takeLatest, not takeEvery: the tab-switch effect and the reaction-refresh
    // effect can fire back to back, and cancelling the loser is what stops two
    // different pages interleaving into the shared `postPicks` list.
    yield takeLatest(fetchGlobalAllStatusPostsRequest.type, handleFetchGlobalAllStatusPosts);
    yield takeLatest(fetchFollowingUsersAllStatusPostsRequest.type, handleFetchFollowingUsersAllStatusPosts);
    yield takeLatest(fetchPostPicksByUserIdRequest.type, handleFetchPostPicksByUserIdPosts);
    yield takeLatest(deletePostPickRequest.type, handleDeletePostPick);
    yield takeLatest(autoGradingPicksRequest.type, handleAutoGradingPicks);
    yield takeLatest(fetchGlobalPendingReactedPostsRequest.type, handleFetchGlobalReactedPendingTopHitPosts);
    yield takeLatest(fetchAllContestsPicksRequest.type, handleFetchAllContestsPicks);
    yield takeLatest(fetchSlipContestPicksRequest.type, handleFetchSlipContestPicks);
    yield takeLatest(replaceOrCreatePostablePickRequest.type, handleReplaceOrCreatePostablePick);
    yield takeLatest(resetPicksScoringPointsRequest.type, handleResetPicksScoringPoints);
    yield takeLatest(fetchGlobalLeaderboardRequest.type, handleFetchGlobalLeaderboard);
};