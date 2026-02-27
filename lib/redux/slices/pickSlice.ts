import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AutoGradingPicksPayload, CreatePickPayload, CreatePostPickPayload, DeletePickPayload, DeletePostPickPayload, FetchPicksPayload, FetchPostPicksByUserIdPayload, FetchPostPicksPayload, Pick, Picks, ReactionPickOfDayPayload, SessionState, UpdateMultiplePayload } from "@/lib/interfaces/interfaces";

type PickState = {
    pick: Pick | null;
    pickOfDay: Pick | null;
    vibePicks: Picks | null;
    postPicks: Picks | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
    deleteMessage: string | null;
};

const initialState: PickState = {
    pick: null,
    pickOfDay: null,
    vibePicks: null,
    postPicks: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
    deleteMessage: null,
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
            state.pick = action.payload;
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
        fetchGlobalWinnerTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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
        fetchGlobalPendingTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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
        fetchGlobalPendingReactedPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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
        fetchFollowingUsersWinTopHitPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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
        fetchFollowingUsersPostsSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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

        fetchPostPicksByUserIdRequest: (state, action: PayloadAction<FetchPostPicksByUserIdPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchPostPicksByUserIdSuccess: (state, action: PayloadAction<{ picks: Picks, page: number }>) => {
            state.loading = false;
            const { picks, page } = action.payload;
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
} = pickSlice.actions;

export default pickSlice.reducer;