import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AssignToSecondaryLeaderboardPayload, CreateSlipPayload, DeleteSlipPayload, FetchSlipsPayload, MarkFinalizePayload, MarkGradedPayload, MarkLockPayload, MarkUnlockPayload, MarkVoidedPayload, ReOpenSlipPayload, SessionState, Slip, StartNewContestPayload, UpdateSlipPayload } from "@/lib/interfaces/interfaces";

type SlipState = {
    slip: Slip | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
};

const initialState: SlipState = {
    slip: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
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
            state.slip = action.payload;
        },
        fetchAllSlipsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllSlipsMessage(state) {
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
            state.loading = true;
            state.error = null;
        },
        deleteSlipSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        deleteSlipFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearDeleteSlipMessage(state) {
            state.error = null;
            state.message = null;
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
} = slipSlice.actions;

export default slipSlice.reducer;


