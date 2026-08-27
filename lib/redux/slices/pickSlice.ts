import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AutoGradingPicksPayload, CreatePickPayload, CreatePostPickPayload, DeletePickPayload, DeletePostPickPayload, FetchContestPicksPayload, FetchPicksPayload, FetchPostPicksByUserIdPayload, FetchPostPicksPayload, FetchSlipContestPicksPayload, FetchSocialGlobalLeaderboardPayload, Picks, PickState, ReactionPickOfDayPayload, ReplaceOrCreatePostablePickPayload, ResetPicksScoringPointsPayload, SlipContestPicksData, UpdateMultiplePayload } from "@/lib/interfaces/interfaces";

const initialState: PickState = {
    pick: null,
    picks: null,
    pickOfDay: null,
    vibePicks: null,
    postPicks: null,
    globalLeaderboard: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
    deleteMessage: null,
    hasMore: true,
    globalLeaderboardLoading: false,
    slipContestPicks: null,
    slipContestPicksLoading: false,
    slipContestPicksError: null,
};

const pickSlice = createSlice({
    name: "pick",
    initialState,
    reducers: {

        createPickRequest: (state, action: PayloadAction<CreatePickPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createPickSuccess: (state, action) => {
            state.loading = false;
            state.pick = action.payload;
            state.message = action.payload?.message;
        },
        createPickFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreatePickMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllPicksRequest: (state, action: PayloadAction<FetchPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllPicksSuccess: (state, action) => {
            state.loading = false;
            state.picks = action.payload.picks;
        },
        fetchAllPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchMyPicksBySlipIdRequest: (state, action: PayloadAction<FetchPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchMyPicksBySlipIdSuccess: (state, action) => {
            state.loading = false;
            state.pick = action.payload;
        },
        fetchMyPicksBySlipIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchMyPicksBySlipIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        updatePicksRequest: (state, action: PayloadAction<UpdateMultiplePayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updatePicksSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        updatePicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdatePicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchRecentPicksRequest: (state, action) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchRecentPicksSuccess: (state, action) => {
            state.loading = false;
            state.pick = action.payload?.picks;
        },
        fetchRecentPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchRecentPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        deletePickRequest: (state, action: PayloadAction<DeletePickPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        deletePickSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        deletePickFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearDeletePickMessage(state) {
            state.error = null;
            state.message = null;
        },

        // Pick Reaction
        createPickReactionRequest: (state, action: PayloadAction<ReactionPickOfDayPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createPickReactionSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        createPickReactionFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreatePickReactionMessage(state) {
            state.error = null;
            state.message = null;
        },

        // Post pick
        createPostPickRequest: (state, action: PayloadAction<CreatePostPickPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createPostPickSuccess: (state, action) => {
            state.loading = false;
            state.pickOfDay = action.payload?.picks;
            state.message = action.payload?.message;
        },
        createPostPickFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreatePostPickMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllMyPostPicksRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllMyPostPicksSuccess: (state, action) => {
            state.loading = false;
            state.postPicks = action.payload?.picks;
        },
        fetchAllMyPostPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllMyPostPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllGlobalPostPicksRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllGlobalPostPicksSuccess: (state, action) => {
            state.loading = false;
            state.postPicks = action.payload?.picks;
        },
        fetchAllGlobalPostPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllGlobalPostPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchGlobalWinnerTopHitPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchGlobalWinnerTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchGlobalWinnerTopHitPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchGlobalWinnerTopHitPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchGlobalPendingTopHitPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchGlobalPendingTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchGlobalPendingTopHitPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchGlobalPendingTopHitPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchGlobalPendingReactedPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchGlobalPendingReactedPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchGlobalPendingReactedPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchGlobalPendingReactedPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchFollowingUsersWinTopHitPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchFollowingUsersWinTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchFollowingUsersWinTopHitPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchFollowingUsersWinTopHitPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchFollowingUsersPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchFollowingUsersPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchFollowingUsersPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchFollowingUsersPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        /*
         * Social "for you" — GET /pick/all-global-post-picks. EVERY status
         * (pending, win, loss, void), every user, newest first.
         *
         * NOT the same thing as `fetchAllGlobalPostPicks*` above, which hits the
         * same URL UNPAGED and replaces `postPicks` wholesale. That triple is
         * dead — nothing dispatches it, only its `clear…Message` sibling
         * survives as a generic reset shared with HomeTab — and its contract
         * cannot carry a paged feed. Keep the two apart.
         */
        fetchGlobalAllStatusPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchGlobalAllStatusPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchGlobalAllStatusPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchGlobalAllStatusPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        // Social "following" — GET /pick/following-users-all-post-picks. Same
        // feed as above, scoped server-side to the people the caller follows.
        // The server also subtracts anyone they have BLOCKED from that list, so
        // this can return fewer rows than the follow count implies.
        fetchFollowingUsersAllStatusPostsRequest: (state, action: PayloadAction<FetchPostPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchFollowingUsersAllStatusPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchFollowingUsersAllStatusPostsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchFollowingUsersAllStatusPostsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchPostPicksByUserIdRequest: (state, action: PayloadAction<FetchPostPicksByUserIdPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
            if (action.payload?.page === 1) {
                state.postPicks = null;
            }
        },
        fetchPostPicksByUserIdSuccess: (state, action: PayloadAction<{ picks: Picks, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { picks, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.postPicks = picks;
            } else {
                const existingIds = new Set(state.postPicks?.map(p => p.id) || []);
                const newUniquePicks = picks.filter(p => !existingIds.has(p.id));
                state.postPicks = [...(state.postPicks || []), ...newUniquePicks];
            }
        },
        fetchPostPicksByUserIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchPostPicksByUserIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        deletePostPickRequest: (state, action: PayloadAction<DeletePostPickPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        deletePostPickSuccess: (state, action) => {
            state.loading = false;
            state.deleteMessage = action.payload?.message;
        },
        deletePostPickFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearDeletePostPickMessage(state) {
            state.error = null;
            state.deleteMessage = null;
        },

        autoGradingPicksRequest: (state, action: PayloadAction<AutoGradingPicksPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        autoGradingPicksSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        autoGradingPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearAutoGradingPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllContestsPicksRequest: (state, action: PayloadAction<FetchContestPicksPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllContestsPicksSuccess: (state, action) => {
            state.loading = false;
            state.picks = action.payload.picks;
        },
        fetchAllContestsPicksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllContestsPicksMessage(state) {
            state.error = null;
            state.message = null;
        },

        /* --------------------------------------------------------------------
         * GET /pick/slip-contest-picks — the group's Slip (Fantasy) contest
         * picks. Public to the group from the moment they are made, so unlike a
         * Feed contest entry there is no reveal rule to honour here.
         * ------------------------------------------------------------------ */
        fetchSlipContestPicksRequest: (
            state,
            action: PayloadAction<FetchSlipContestPicksPayload>
        ) => {
            // Single-tenant: the previous group's rows go at REQUEST time, so a
            // group switch cannot paint the wrong league's picks mid-flight.
            if (state.slipContestPicks && state.slipContestPicks.group.id !== action.payload.group_id) {
                state.slipContestPicks = null;
            }
            state.slipContestPicksLoading = true;
            state.slipContestPicksError = null;
        },
        fetchSlipContestPicksSuccess: (
            state,
            action: PayloadAction<SlipContestPicksData>
        ) => {
            const incoming = action.payload;
            const page = incoming?.pagination?.page ?? 1;

            state.slipContestPicksLoading = false;
            state.slipContestPicksError = null;

            if (
                page <= 1 ||
                !state.slipContestPicks ||
                state.slipContestPicks.group.id !== incoming.group.id
            ) {
                state.slipContestPicks = incoming;
                return;
            }
            const seen = new Set(state.slipContestPicks.picks.map((row) => row.id));
            state.slipContestPicks = {
                ...incoming,
                picks: [
                    ...state.slipContestPicks.picks,
                    ...incoming.picks.filter((row) => !seen.has(row.id)),
                ],
            };
        },
        fetchSlipContestPicksFailure: (state, action: PayloadAction<string>) => {
            state.slipContestPicksLoading = false;
            state.slipContestPicksError = action.payload;
            state.slipContestPicks = null;
        },
        clearSlipContestPicks: (state) => {
            state.slipContestPicks = null;
            state.slipContestPicksLoading = false;
            state.slipContestPicksError = null;
        },

        replaceOrCreatePostablePickRequest: (state, action: PayloadAction<ReplaceOrCreatePostablePickPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        replaceOrCreatePostablePickSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        replaceOrCreatePostablePickFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearReplaceOrCreatePostablePickMessage(state) {
            state.error = null;
            state.message = null;
        },

        resetPicksScoringPointsRequest: (state, action: PayloadAction<ResetPicksScoringPointsPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        resetPicksScoringPointsSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        resetPicksScoringPointsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearResetPicksScoringPointsMessage(state) {
            state.error = null;
            state.message = null;
        },

        // Social Global Leaderboard
        fetchGlobalLeaderboardRequest: (state, action: PayloadAction<FetchSocialGlobalLeaderboardPayload>) => {
            void action;
            state.globalLeaderboardLoading = true;
            state.error = null;
        },
        fetchGlobalLeaderboardSuccess: (state, action) => {
            state.globalLeaderboardLoading = false;
            state.globalLeaderboard = action.payload;
        },
        fetchGlobalLeaderboardFailure: (state, action) => {
            state.globalLeaderboardLoading = false;
            state.error = action.payload;
        },
        clearGlobalLeaderboardMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    createPickRequest,
    createPickSuccess,
    createPickFailure,
    clearCreatePickMessage,
    fetchAllPicksRequest,
    fetchAllPicksSuccess,
    fetchAllPicksFailure,
    clearFetchAllPicksMessage,
    updatePicksRequest,
    updatePicksSuccess,
    updatePicksFailure,
    clearUpdatePicksMessage,
    fetchRecentPicksRequest,
    fetchRecentPicksSuccess,
    fetchRecentPicksFailure,
    clearFetchRecentPicksMessage,
    deletePickRequest,
    deletePickSuccess,
    deletePickFailure,
    clearDeletePickMessage,
    createPickReactionRequest,
    createPickReactionSuccess,
    createPickReactionFailure,
    clearCreatePickReactionMessage,
    fetchMyPicksBySlipIdRequest,
    fetchMyPicksBySlipIdSuccess,
    fetchMyPicksBySlipIdFailure,
    clearFetchMyPicksBySlipIdMessage,
    createPostPickRequest,
    createPostPickSuccess,
    createPostPickFailure,
    clearCreatePostPickMessage,
    fetchAllMyPostPicksRequest,
    fetchAllMyPostPicksSuccess,
    fetchAllMyPostPicksFailure,
    clearFetchAllMyPostPicksMessage,
    fetchAllGlobalPostPicksRequest,
    fetchAllGlobalPostPicksSuccess,
    fetchAllGlobalPostPicksFailure,
    clearFetchAllGlobalPostPicksMessage,
    fetchGlobalPendingTopHitPostsRequest,
    fetchGlobalPendingTopHitPostsSuccess,
    fetchGlobalPendingTopHitPostsFailure,
    clearFetchGlobalPendingTopHitPostsMessage,
    fetchGlobalWinnerTopHitPostsRequest,
    fetchGlobalWinnerTopHitPostsSuccess,
    fetchGlobalWinnerTopHitPostsFailure,
    clearFetchGlobalWinnerTopHitPostsMessage,
    fetchFollowingUsersWinTopHitPostsRequest,
    fetchFollowingUsersWinTopHitPostsSuccess,
    fetchFollowingUsersWinTopHitPostsFailure,
    clearFetchFollowingUsersWinTopHitPostsMessage,
    fetchFollowingUsersPostsRequest,
    fetchFollowingUsersPostsSuccess,
    fetchFollowingUsersPostsFailure,
    clearFetchFollowingUsersPostsMessage,
    fetchGlobalAllStatusPostsRequest,
    fetchGlobalAllStatusPostsSuccess,
    fetchGlobalAllStatusPostsFailure,
    clearFetchGlobalAllStatusPostsMessage,
    fetchFollowingUsersAllStatusPostsRequest,
    fetchFollowingUsersAllStatusPostsSuccess,
    fetchFollowingUsersAllStatusPostsFailure,
    clearFetchFollowingUsersAllStatusPostsMessage,
    fetchPostPicksByUserIdRequest,
    fetchPostPicksByUserIdSuccess,
    fetchPostPicksByUserIdFailure,
    clearFetchPostPicksByUserIdMessage,
    deletePostPickRequest,
    deletePostPickSuccess,
    deletePostPickFailure,
    clearDeletePostPickMessage,
    autoGradingPicksRequest,
    autoGradingPicksSuccess,
    autoGradingPicksFailure,
    clearAutoGradingPicksMessage,
    fetchGlobalPendingReactedPostsRequest,
    fetchGlobalPendingReactedPostsSuccess,
    fetchGlobalPendingReactedPostsFailure,
    clearFetchGlobalPendingReactedPostsMessage,
    fetchAllContestsPicksRequest,
    fetchAllContestsPicksSuccess,
    fetchAllContestsPicksFailure,
    clearFetchAllContestsPicksMessage,
    fetchSlipContestPicksRequest,
    fetchSlipContestPicksSuccess,
    fetchSlipContestPicksFailure,
    clearSlipContestPicks,
    replaceOrCreatePostablePickRequest,
    replaceOrCreatePostablePickSuccess,
    replaceOrCreatePostablePickFailure,
    clearReplaceOrCreatePostablePickMessage,
    resetPicksScoringPointsRequest,
    resetPicksScoringPointsSuccess,
    resetPicksScoringPointsFailure,
    clearResetPicksScoringPointsMessage,
    fetchGlobalLeaderboardRequest,
    fetchGlobalLeaderboardSuccess,
    fetchGlobalLeaderboardFailure,
    clearGlobalLeaderboardMessage,
} = pickSlice.actions;

export default pickSlice.reducer;