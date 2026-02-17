import { FetchNBAOddsPayload, FetchNBASchedulePayload, NBAState, ValidateMyNBAPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: NBAState = {
    loading: false,
    error: null,
    message: null,
    nbaSchedules: null,
    nbaOdds: null,
    validateLoading: false,
    validatePickError: null,
    validatePickMessage: null,
};

const nbaSlice = createSlice({
    name: "nba",
    initialState,
    reducers: {
        fetchNBAScheduleRequest: (state, action: PayloadAction<FetchNBASchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNBAScheduleSuccess: (state, action) => {
            state.loading = false;
            state.nbaSchedules = action.payload.schedule;
        },
        fetchNBAScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchNBAScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchNBAOddsRequest: (state, action: PayloadAction<FetchNBAOddsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNBAOddsSuccess: (state, action) => {
            state.loading = false;
            state.nbaOdds = action.payload.odds;
        },
        fetchNBAOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchNBAOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        nbaPickValidateRequest: (state, action: PayloadAction<ValidateMyNBAPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        nbaPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        nbaPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        cleatNbaPickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },
    },
});

export const {
    fetchNBAScheduleRequest,
    fetchNBAScheduleSuccess,
    fetchNBAScheduleFailure,
    cleatFetchNBAScheduleMessage,
    fetchNBAOddsRequest,
    fetchNBAOddsSuccess,
    fetchNBAOddsFailure,
    cleatFetchNBAOddsMessage,
    nbaPickValidateRequest,
    nbaPickValidateSuccess,
    nbaPickValidateFailure,
    cleatNbaPickValidateMessage,
} = nbaSlice.actions;

export default nbaSlice.reducer;