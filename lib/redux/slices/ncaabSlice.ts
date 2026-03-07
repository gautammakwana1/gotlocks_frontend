import { FetchNCAABOddsPayload, FetchNCAABSchedulePayload, NCAABState, ValidateMyNCAABPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: NCAABState = {
    loading: false,
    error: null,
    message: null,
    ncaabSchedules: null,
    ncaabOdds: null,
    validateLoading: false,
    validatePickError: null,
    validatePickMessage: null,
};

const ncaabSlice = createSlice({
    name: "ncaab",
    initialState,
    reducers: {
        fetchNCAABScheduleRequest: (state, action: PayloadAction<FetchNCAABSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNCAABScheduleSuccess: (state, action) => {
            state.loading = false;
            state.ncaabSchedules = action.payload.schedule;
        },
        fetchNCAABScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchNCAABScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchNCAABOddsRequest: (state, action: PayloadAction<FetchNCAABOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchNCAABOddsSuccess: (state, action) => {
            state.loading = false;
            state.ncaabOdds = action.payload.odds;
        },
        fetchNCAABOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchNCAABOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        ncaabPickValidateRequest: (state, action: PayloadAction<ValidateMyNCAABPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        ncaabPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        ncaabPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearNcaabPickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },
    },
});

export const {
    fetchNCAABScheduleRequest,
    fetchNCAABScheduleSuccess,
    fetchNCAABScheduleFailure,
    clearFetchNCAABScheduleMessage,
    fetchNCAABOddsRequest,
    fetchNCAABOddsSuccess,
    fetchNCAABOddsFailure,
    clearFetchNCAABOddsMessage,
    ncaabPickValidateRequest,
    ncaabPickValidateSuccess,
    ncaabPickValidateFailure,
    clearNcaabPickValidateMessage,
} = ncaabSlice.actions;

export default ncaabSlice.reducer;