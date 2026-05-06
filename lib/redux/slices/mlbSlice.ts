import { FetchMLBOddsPayload, FetchMLBSchedulePayload, MLBState, ValidateMyMLBPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: MLBState = {
    loading: false,
    error: null,
    message: null,
    mlbSchedulesWithOdds: null,
    mlbSchedules: null,
    mlbOdds: null,
    oddsLoading: false,
    validateLoading: false,
    validatePickError: null,
    validatePickMessage: null,
};

const mlbSlice = createSlice({
    name: "mlb",
    initialState,
    reducers: {
        fetchMLBScheduleRequest: (state, action: PayloadAction<FetchMLBSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchMLBScheduleSuccess: (state, action) => {
            state.loading = false;
            state.mlbSchedulesWithOdds = action.payload.schedule;
        },
        fetchMLBScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchMLBScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchMLBScheduleByTimezoneRequest: (state, action: PayloadAction<FetchMLBSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchMLBScheduleByTimezoneSuccess: (state, action) => {
            state.loading = false;
            state.mlbSchedules = action.payload.schedule;
        },
        fetchMLBScheduleByTimezoneFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchMLBScheduleByTimezoneMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchMLBOddsRequest: (state, action: PayloadAction<FetchMLBOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchMLBOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.mlbOdds = action.payload.odds;
        },
        fetchMLBOddsFailure: (state, action) => {
            state.oddsLoading = false;
            state.error = action.payload;
        },
        clearFetchMLBOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        mlbPickValidateRequest: (state, action: PayloadAction<ValidateMyMLBPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        mlbPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        mlbPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearMlbPickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },
    },
});

export const {
    fetchMLBScheduleRequest,
    fetchMLBScheduleSuccess,
    fetchMLBScheduleFailure,
    clearFetchMLBScheduleMessage,
    fetchMLBOddsRequest,
    fetchMLBOddsSuccess,
    fetchMLBOddsFailure,
    clearFetchMLBOddsMessage,
    mlbPickValidateRequest,
    mlbPickValidateSuccess,
    mlbPickValidateFailure,
    clearMlbPickValidateMessage,
    fetchMLBScheduleByTimezoneRequest,
    fetchMLBScheduleByTimezoneSuccess,
    fetchMLBScheduleByTimezoneFailure,
    clearFetchMLBScheduleByTimezoneMessage,
} = mlbSlice.actions;

export default mlbSlice.reducer;