import { FetchNBAOddsPayload, FetchNBASchedulePayload, NBAState, ValidateMyNBAPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: NBAState = {
    loading: false,
    error: null,
    message: null,
    nbaSchedules: null,
    fanduelNbaOdds: null,
    draftkingNbaOdds: null,
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

        fetchFanduelNBAOddsRequest: (state, action: PayloadAction<FetchNBAOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchFanduelNBAOddsSuccess: (state, action) => {
            state.loading = false;
            state.fanduelNbaOdds = action.payload.odds;
        },
        fetchFanduelNBAOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchFanduelNBAOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsNBAOddsRequest: (state, action: PayloadAction<FetchNBAOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchDraftkingsNBAOddsSuccess: (state, action) => {
            state.loading = false;
            state.draftkingNbaOdds = action.payload.odds;
        },
        fetchDraftkingsNBAOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchDraftkingsNBAOddsMessage: (state) => {
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
    fetchFanduelNBAOddsRequest,
    fetchFanduelNBAOddsSuccess,
    fetchFanduelNBAOddsFailure,
    cleatFetchFanduelNBAOddsMessage,
    fetchDraftkingsNBAOddsRequest,
    fetchDraftkingsNBAOddsSuccess,
    fetchDraftkingsNBAOddsFailure,
    cleatFetchDraftkingsNBAOddsMessage,
    nbaPickValidateRequest,
    nbaPickValidateSuccess,
    nbaPickValidateFailure,
    cleatNbaPickValidateMessage,
} = nbaSlice.actions;

export default nbaSlice.reducer;