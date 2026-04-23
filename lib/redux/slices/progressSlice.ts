import { FetchProgressByUserIdPayload, ProgressState, RedeemGlobalPointsPayload, UpdateTutorialProgressPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: ProgressState = {
    loading: false,
    hasSeenIntro: true,
    error: null,
    message: null,
    progress: null,
    picksCount: null,
    slipsCount: null,
    hasSeenGroupIntro: true,
    hasSeenSocialIntro: true,
    hasSeenWelcomeIntro: true,
};

const progressSlice = createSlice({
    name: "progress",
    initialState,
    reducers: {
        fetchMyProgressRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchMyProgressSuccess: (state, action) => {
            state.loading = false;
            state.progress = action.payload.progress;
            state.picksCount = action.payload.picksCount;
            state.slipsCount = action.payload.slipsCount;
            state.hasSeenIntro = action.payload.hasSeenIntro;
        },
        fetchMyProgressFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchMyProgressMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchProgressByUserIdRequest: (state, action: PayloadAction<FetchProgressByUserIdPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchProgressByUserIdSuccess: (state, action) => {
            state.loading = false;
            state.progress = action.payload.progress;
            state.picksCount = action.payload.picksCount;
            state.slipsCount = action.payload.slipsCount;
            state.hasSeenIntro = action.payload.hasSeenIntro;
        },
        fetchProgressByUserIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchProgressByUserIdMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        redeemGlobalPointsRequest: (state, action: PayloadAction<RedeemGlobalPointsPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        redeemGlobalPointsSuccess: (state, action) => {
            state.loading = false;
            state.progress = action.payload.data.updated_progress;
            state.message = action.payload.message;
        },
        redeemGlobalPointsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearRedeemGlobalPointsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchMyTutorialProgressRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchMyTutorialProgressSuccess: (state, action) => {
            state.loading = false;
            state.hasSeenGroupIntro = action.payload.hasSeenGroupIntro;
            state.hasSeenWelcomeIntro = action.payload.hasSeenWelcomeIntro;
            state.hasSeenSocialIntro = action.payload.hasSeenSocialIntro;
        },
        fetchMyTutorialProgressFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchMyTutorialProgressMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        updateTutorialProgressRequest: (state, action: PayloadAction<UpdateTutorialProgressPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateTutorialProgressSuccess: (state, action) => {
            state.loading = false;
            state.hasSeenGroupIntro = action.payload.hasSeenGroupIntro;
            state.hasSeenWelcomeIntro = action.payload.hasSeenWelcomeIntro;
            state.hasSeenSocialIntro = action.payload.hasSeenSocialIntro;
        },
        updateTutorialProgressFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateTutorialProgressMessage: (state) => {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    fetchMyProgressRequest,
    fetchMyProgressSuccess,
    fetchMyProgressFailure,
    clearFetchMyProgressMessage,
    fetchProgressByUserIdRequest,
    fetchProgressByUserIdSuccess,
    fetchProgressByUserIdFailure,
    clearFetchProgressByUserIdMessage,
    redeemGlobalPointsRequest,
    redeemGlobalPointsSuccess,
    redeemGlobalPointsFailure,
    clearRedeemGlobalPointsMessage,
    fetchMyTutorialProgressRequest,
    fetchMyTutorialProgressSuccess,
    fetchMyTutorialProgressFailure,
    clearFetchMyTutorialProgressMessage,
    updateTutorialProgressRequest,
    updateTutorialProgressSuccess,
    updateTutorialProgressFailure,
    clearUpdateTutorialProgressMessage,
} = progressSlice.actions;

export default progressSlice.reducer;