import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AssignToSecondaryLeaderboardPayload, CreateSlipPayload, DeleteSlipPayload, FetchFinalizeSlipsPayload, FetchOpenSlipsPayload, FetchReviewSlipsPayload, FetchSlipByIdPayload, FetchSlipsPayload, MarkFinalizePayload, MarkGradedPayload, MarkLockPayload, MarkUnlockPayload, MarkVoidedPayload, ReOpenSlipPayload, Slips, SlipState, StartNewContestPayload, UpdateSlipConflictModePayload, UpdateSlipPayload } from "@/lib/interfaces/interfaces";

const initialState: SlipState = {
    slip: null,
    slips: null,
    openSlips: null,
    reviewSlips: null,
    finalizeSlips: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
    hasMoreOpens: false,
    hasMoreReviews: false,
    hasMoreFinalizes: false,
    deleteLoading: false,
    deleteMessage: null,
    deleteError: null,
};

const slipSlice = createSlice({
    name: "slip",
    initialState,
    reducers: {

        createSlipRequest: (state, action: PayloadAction<CreateSlipPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload?.data?.slip;
            state.message = action.payload?.message;
        },
        createSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreateSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllSlipsRequest: (state, action: PayloadAction<FetchSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllSlipsSuccess: (state, action) => {
            state.loading = false;
            state.slips = action.payload.slips;
        },
        fetchAllSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllOpenSlipsRequest: (state, action: PayloadAction<FetchOpenSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllOpenSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreOpens = hasMore;
            if (page === 1) {
                state.openSlips = slips;
            } else {
                const existingIds = new Set(state.openSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.openSlips = [...(state.openSlips || []), ...newUniquePicks];
            }
        },
        fetchAllOpenSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllOpenSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllReviewSlipsRequest: (state, action: PayloadAction<FetchReviewSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllReviewSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreReviews = hasMore;
            if (page === 1) {
                state.reviewSlips = slips;
            } else {
                const existingIds = new Set(state.reviewSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.reviewSlips = [...(state.reviewSlips || []), ...newUniquePicks];
            }
        },
        fetchAllReviewSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllReviewSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllFinalizedSlipsRequest: (state, action: PayloadAction<FetchFinalizeSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllFinalizedSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreFinalizes = hasMore;
            if (page === 1) {
                state.finalizeSlips = slips;
            } else {
                const existingIds = new Set(state.finalizeSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.finalizeSlips = [...(state.finalizeSlips || []), ...newUniquePicks];
            }
        },
        fetchAllFinalizedSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllFinalizedSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchSlipByIdRequest: (state, action: PayloadAction<FetchSlipByIdPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSlipByIdSuccess: (state, action) => {
            state.loading = false;
            state.slips = action.payload.slips;
        },
        fetchSlipByIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSlipByIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        updateSlipsRequest: (state, action: PayloadAction<UpdateSlipPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateSlipsSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload?.data;
            state.message = action.payload?.message;
        },
        updateSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        markLockSlipRequest: (state, action: PayloadAction<MarkLockPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markLockSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        markLockSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkLockSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        markedUnlockSlipRequest: (state, action: PayloadAction<MarkUnlockPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markedUnlockSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        markedUnlockSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkedUnlockSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        markFinalizeSlipRequest: (state, action: PayloadAction<MarkFinalizePayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markFinalizeSlipSuccess: (state, action) => {
            state.loading = false;
            // state.slip = action.payload;
            state.message = action.payload?.message;
        },
        markFinalizeSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkFinalizeSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        markVoidedSlipRequest: (state, action: PayloadAction<MarkVoidedPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markVoidedSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        markVoidedSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkVoidedSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        markGradedSlipRequest: (state, action: PayloadAction<MarkGradedPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markGradedSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        markGradedSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkGradedSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        startNewContestRequest: (state, action: PayloadAction<StartNewContestPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        startNewContestSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        startNewContestFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearStartNewContestMessage(state) {
            state.error = null;
            state.message = null;
        },

        deleteSlipRequest: (state, action: PayloadAction<DeleteSlipPayload>) => {
            void action;
            state.deleteLoading = true;
            state.deleteError = null;
        },
        deleteSlipSuccess: (state, action) => {
            state.deleteLoading = false;
            state.deleteMessage = action.payload?.message;
        },
        deleteSlipFailure: (state, action) => {
            state.deleteLoading = false;
            state.deleteError = action.payload;
        },
        clearDeleteSlipMessage(state) {
            state.deleteError = null;
            state.deleteMessage = null;
        },

        reOpenSlipRequest: (state, action: PayloadAction<ReOpenSlipPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        reOpenSlipSuccess: (state, action) => {
            state.loading = false;
            state.slip = action.payload;
            state.message = action.payload?.message;
        },
        reOpenSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearReOpenSlipMessage(state) {
            state.error = null;
            state.message = null;
        },

        assignToSecondaryLeaderboardRequest: (state, action: PayloadAction<AssignToSecondaryLeaderboardPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        assignToSecondaryLeaderboardSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        assignToSecondaryLeaderboardFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearAssignToSecondaryLeaderboardMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllVibeOpenSlipsRequest: (state, action: PayloadAction<FetchOpenSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllVibeOpenSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreOpens = hasMore;
            if (page === 1) {
                state.openSlips = slips;
            } else {
                const existingIds = new Set(state.openSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.openSlips = [...(state.openSlips || []), ...newUniquePicks];
            }
        },
        fetchAllVibeOpenSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllVibeOpenSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllVibeReviewSlipsRequest: (state, action: PayloadAction<FetchReviewSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllVibeReviewSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreReviews = hasMore;
            if (page === 1) {
                state.reviewSlips = slips;
            } else {
                const existingIds = new Set(state.reviewSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.reviewSlips = [...(state.reviewSlips || []), ...newUniquePicks];
            }
        },
        fetchAllVibeReviewSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllVibeReviewSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchAllVibeFinalizedSlipsRequest: (state, action: PayloadAction<FetchFinalizeSlipsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllVibeFinalizedSlipsSuccess: (state, action: PayloadAction<{ slips: Slips, page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { slips, hasMore, page } = action.payload;
            state.hasMoreFinalizes = hasMore;
            if (page === 1) {
                state.finalizeSlips = slips;
            } else {
                const existingIds = new Set(state.finalizeSlips?.map(s => s.id) || []);
                const newUniquePicks = slips.filter(s => !existingIds.has(s.id));
                state.finalizeSlips = [...(state.finalizeSlips || []), ...newUniquePicks];
            }
        },
        fetchAllVibeFinalizedSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllVibeFinalizedSlipsMessage(state) {
            state.error = null;
            state.message = null;
        },

        updateSlipConflictModeRequest: (state, action: PayloadAction<UpdateSlipConflictModePayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateSlipConflictModeSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        updateSlipConflictModeFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateSlipConflictModeMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    createSlipRequest,
    createSlipSuccess,
    createSlipFailure,
    clearCreateSlipMessage,
    fetchAllSlipsRequest,
    fetchAllSlipsSuccess,
    fetchAllSlipsFailure,
    clearFetchAllSlipsMessage,
    updateSlipsRequest,
    updateSlipsSuccess,
    updateSlipsFailure,
    clearUpdateSlipsMessage,
    markLockSlipRequest,
    markLockSlipSuccess,
    markLockSlipFailure,
    clearMarkLockSlipMessage,
    markedUnlockSlipRequest,
    markedUnlockSlipSuccess,
    markedUnlockSlipFailure,
    clearMarkedUnlockSlipMessage,
    markFinalizeSlipRequest,
    markFinalizeSlipSuccess,
    markFinalizeSlipFailure,
    clearMarkFinalizeSlipMessage,
    markVoidedSlipRequest,
    markVoidedSlipSuccess,
    markVoidedSlipFailure,
    clearMarkVoidedSlipMessage,
    startNewContestRequest,
    startNewContestSuccess,
    startNewContestFailure,
    clearStartNewContestMessage,
    markGradedSlipRequest,
    markGradedSlipSuccess,
    markGradedSlipFailure,
    clearMarkGradedSlipMessage,
    deleteSlipRequest,
    deleteSlipSuccess,
    deleteSlipFailure,
    clearDeleteSlipMessage,
    reOpenSlipRequest,
    reOpenSlipSuccess,
    reOpenSlipFailure,
    clearReOpenSlipMessage,
    assignToSecondaryLeaderboardRequest,
    assignToSecondaryLeaderboardSuccess,
    assignToSecondaryLeaderboardFailure,
    clearAssignToSecondaryLeaderboardMessage,
    fetchSlipByIdRequest,
    fetchSlipByIdSuccess,
    fetchSlipByIdFailure,
    clearFetchSlipByIdMessage,
    fetchAllOpenSlipsRequest,
    fetchAllOpenSlipsSuccess,
    fetchAllOpenSlipsFailure,
    clearFetchAllOpenSlipsMessage,
    fetchAllReviewSlipsRequest,
    fetchAllReviewSlipsSuccess,
    fetchAllReviewSlipsFailure,
    clearFetchAllReviewSlipsMessage,
    fetchAllFinalizedSlipsRequest,
    fetchAllFinalizedSlipsSuccess,
    fetchAllFinalizedSlipsFailure,
    clearFetchAllFinalizedSlipsMessage,
    fetchAllVibeOpenSlipsRequest,
    fetchAllVibeOpenSlipsSuccess,
    fetchAllVibeOpenSlipsFailure,
    clearFetchAllVibeOpenSlipsMessage,
    fetchAllVibeReviewSlipsRequest,
    fetchAllVibeReviewSlipsSuccess,
    fetchAllVibeReviewSlipsFailure,
    clearFetchAllVibeReviewSlipsMessage,
    fetchAllVibeFinalizedSlipsRequest,
    fetchAllVibeFinalizedSlipsSuccess,
    fetchAllVibeFinalizedSlipsFailure,
    clearFetchAllVibeFinalizedSlipsMessage,
    updateSlipConflictModeRequest,
    updateSlipConflictModeSuccess,
    updateSlipConflictModeFailure,
    clearUpdateSlipConflictModeMessage,
} = slipSlice.actions;

export default slipSlice.reducer;


