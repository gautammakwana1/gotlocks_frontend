import { FetchProgressByUserIdPayload, ProgressState, RedeemGlobalPointsPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: ProgressState = {
    loading: false,
    error: null,
    message: null,
    progress: null,
    picksCount: null,
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
} = progressSlice.actions;

export default progressSlice.reducer;