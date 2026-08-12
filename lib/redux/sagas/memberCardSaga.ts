import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type {
    FeedContestAchievementsData,
    FeedContestAchievementsPayload,
    FeedContestPicksData,
    GroupMemberCommunityPicksData,
    GroupMemberPicksPayload,
    GroupMemberStatsData,
    GroupMemberStatsPayload,
    SlipContestPicksData,
} from "@/lib/interfaces/interfaces";
import {
    fetchMemberAchievementsFailure,
    fetchMemberAchievementsRequest,
    fetchMemberAchievementsSuccess,
    fetchMemberCommunityPicksFailure,
    fetchMemberCommunityPicksRequest,
    fetchMemberCommunityPicksSuccess,
    fetchMemberFeedContestPicksFailure,
    fetchMemberFeedContestPicksRequest,
    fetchMemberFeedContestPicksSuccess,
    fetchMemberSlipPicksFailure,
    fetchMemberSlipPicksRequest,
    fetchMemberSlipPicksSuccess,
    fetchMemberStatsFailure,
    fetchMemberStatsRequest,
    fetchMemberStatsSuccess,
} from "../slices/memberCardSlice";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

/*
 * The member card's five reads.
 *
 * Only the achievements call sends `group_type`; the four /group/* endpoints
 * derive league-vs-arena from the group row itself, which is exactly why one
 * card component serves both surfaces without branching its data layer.
 *
 * Every handler is takeLatest: the card is reachable member-to-member inside one
 * group, so an abandoned read must never land after the one that replaced it.
 */

// GET /group/member-stats
function* handleFetchMemberStats(
    action: PayloadAction<GroupMemberStatsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/member-stats`,
            { params: action.payload }
        );
        const payload = response.data as { data?: GroupMemberStatsData };
        yield put(fetchMemberStatsSuccess(payload?.data ?? null));
    } catch (error: unknown) {
        yield put(
            fetchMemberStatsFailure(
                getErrorMessage(error, "Failed to load this member's record")
            )
        );
    }
}

// GET /group/member-picks/slips — League surface. An Arena answers with an
// empty page rather than an error, so this is safe to call on both.
function* handleFetchMemberSlipPicks(
    action: PayloadAction<GroupMemberPicksPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/member-picks/slips`,
            { params: action.payload }
        );
        const payload = response.data as { data?: SlipContestPicksData };
        yield put(fetchMemberSlipPicksSuccess(payload?.data ?? null));
    } catch (error: unknown) {
        yield put(
            fetchMemberSlipPicksFailure(
                getErrorMessage(error, "Failed to load Fantasy Contest activity")
            )
        );
    }
}

// GET /group/member-picks/community
function* handleFetchMemberCommunityPicks(
    action: PayloadAction<GroupMemberPicksPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/member-picks/community`,
            { params: action.payload }
        );
        const payload = response.data as { data?: GroupMemberCommunityPicksData };
        yield put(fetchMemberCommunityPicksSuccess(payload?.data ?? null));
    } catch (error: unknown) {
        yield put(
            fetchMemberCommunityPicksFailure(
                getErrorMessage(error, "Failed to load community picks")
            )
        );
    }
}

// GET /group/member-picks/feed-contests. Rows carry their own `is_revealed` —
// an entry in a contest that has not locked comes back with `pick: null`.
function* handleFetchMemberFeedContestPicks(
    action: PayloadAction<GroupMemberPicksPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/member-picks/feed-contests`,
            { params: action.payload }
        );
        const payload = response.data as { data?: FeedContestPicksData };
        yield put(fetchMemberFeedContestPicksSuccess(payload?.data ?? null));
    } catch (error: unknown) {
        yield put(
            fetchMemberFeedContestPicksFailure(
                getErrorMessage(error, "Failed to load contest entries")
            )
        );
    }
}

// GET /group/feed-contest/achievements — the only one that still needs
// `group_type`, since it is mounted under the feed-contest router.
function* handleFetchMemberAchievements(
    action: PayloadAction<FeedContestAchievementsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/achievements`,
            { params: action.payload }
        );
        const payload = response.data as { data?: FeedContestAchievementsData };
        yield put(fetchMemberAchievementsSuccess(payload?.data ?? null));
    } catch (error: unknown) {
        yield put(
            fetchMemberAchievementsFailure(
                getErrorMessage(error, "Failed to load achievements")
            )
        );
    }
}

export default function* memberCardSaga(): SagaIterator {
    yield takeLatest(fetchMemberStatsRequest.type, handleFetchMemberStats);
    yield takeLatest(fetchMemberSlipPicksRequest.type, handleFetchMemberSlipPicks);
    yield takeLatest(
        fetchMemberCommunityPicksRequest.type,
        handleFetchMemberCommunityPicks
    );
    yield takeLatest(
        fetchMemberFeedContestPicksRequest.type,
        handleFetchMemberFeedContestPicks
    );
    yield takeLatest(fetchMemberAchievementsRequest.type, handleFetchMemberAchievements);
}
