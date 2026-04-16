import { FetchSoccerEnglandPremierLeagueOddsPayload, FetchSoccerEnglandPremierLeagueSchedulePayload, FetchSoccerGermanyBundesligaOddsPayload, FetchSoccerGermanyBundesligaSchedulePayload, SoccerState, ValidateMySoccerEnglandPremierLeaguePickPayload, ValidateMySoccerGermanyBundesligaPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: SoccerState = {
    loading: false,
    error: null,
    message: null,
    englandPremierLeagueSchedules: null,
    germanyBundesligaSchedules: null,
    fanduelEnglandPremierLeagueOdds: null,
    draftkingEnglandPremierLeagueOdds: null,
    fanduelGermanyBundesligaOdds: null,
    draftkingGermanyBundesligaOdds: null,
    validateLoading: false,
    validatePickError: null,
    validatePickMessage: null,
};

const soccerSlice = createSlice({
    name: "soccer",
    initialState,
    reducers: {

        // England Premier League
        fetchSoccerEnglandPremierLeagueScheduleRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerEnglandPremierLeagueScheduleSuccess: (state, action) => {
            state.loading = false;
            state.englandPremierLeagueSchedules = action.payload.schedule;
        },
        fetchSoccerEnglandPremierLeagueScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerEnglandPremierLeagueScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchFanduelSoccerEnglandPremierLeagueOddsRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchFanduelSoccerEnglandPremierLeagueOddsSuccess: (state, action) => {
            state.loading = false;
            state.fanduelEnglandPremierLeagueOdds = action.payload.odds;
        },
        fetchFanduelSoccerEnglandPremierLeagueOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchFanduelSoccerEnglandPremierLeagueOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchDraftkingsSoccerEnglandPremierLeagueOddsSuccess: (state, action) => {
            state.loading = false;
            state.draftkingEnglandPremierLeagueOdds = action.payload.odds;
        },
        fetchDraftkingsSoccerEnglandPremierLeagueOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchDraftkingsSoccerEnglandPremierLeagueOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        soccerEnglandPremierLeaguePickValidateRequest: (state, action: PayloadAction<ValidateMySoccerEnglandPremierLeaguePickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        soccerEnglandPremierLeaguePickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        soccerEnglandPremierLeaguePickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearSoccerEnglandPremierLeaguePickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },

        // Germany Bundesliga
        fetchSoccerGermanyBundesligaScheduleRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerGermanyBundesligaScheduleSuccess: (state, action) => {
            state.loading = false;
            state.germanyBundesligaSchedules = action.payload.schedule;
        },
        fetchSoccerGermanyBundesligaScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerGermanyBundesligaScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchFanduelSoccerGermanyBundesligaOddsRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchFanduelSoccerGermanyBundesligaOddsSuccess: (state, action) => {
            state.loading = false;
            state.fanduelGermanyBundesligaOdds = action.payload.odds;
        },
        fetchFanduelSoccerGermanyBundesligaOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchFanduelSoccerGermanyBundesligaOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsSoccerGermanyBundesligaOddsRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchDraftkingsSoccerGermanyBundesligaOddsSuccess: (state, action) => {
            state.loading = false;
            state.draftkingGermanyBundesligaOdds = action.payload.odds;
        },
        fetchDraftkingsSoccerGermanyBundesligaOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchDraftkingsSoccerGermanyBundesligaOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        soccerGermanyBundesligaPickValidateRequest: (state, action: PayloadAction<ValidateMySoccerGermanyBundesligaPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        soccerGermanyBundesligaPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        soccerGermanyBundesligaPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearSoccerGermanyBundesligaPickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },
    },
});

export const {
    fetchSoccerEnglandPremierLeagueScheduleRequest,
    fetchSoccerEnglandPremierLeagueScheduleSuccess,
    fetchSoccerEnglandPremierLeagueScheduleFailure,
    clearFetchSoccerEnglandPremierLeagueScheduleMessage,
    fetchFanduelSoccerEnglandPremierLeagueOddsRequest,
    fetchFanduelSoccerEnglandPremierLeagueOddsSuccess,
    fetchFanduelSoccerEnglandPremierLeagueOddsFailure,
    clearFetchFanduelSoccerEnglandPremierLeagueOddsMessage,
    fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest,
    fetchDraftkingsSoccerEnglandPremierLeagueOddsSuccess,
    fetchDraftkingsSoccerEnglandPremierLeagueOddsFailure,
    clearFetchDraftkingsSoccerEnglandPremierLeagueOddsMessage,
    soccerEnglandPremierLeaguePickValidateRequest,
    soccerEnglandPremierLeaguePickValidateSuccess,
    soccerEnglandPremierLeaguePickValidateFailure,
    clearSoccerEnglandPremierLeaguePickValidateMessage,
    fetchSoccerGermanyBundesligaScheduleRequest,
    fetchSoccerGermanyBundesligaScheduleSuccess,
    fetchSoccerGermanyBundesligaScheduleFailure,
    clearFetchSoccerGermanyBundesligaScheduleMessage,
    fetchFanduelSoccerGermanyBundesligaOddsRequest,
    fetchFanduelSoccerGermanyBundesligaOddsSuccess,
    fetchFanduelSoccerGermanyBundesligaOddsFailure,
    clearFetchFanduelSoccerGermanyBundesligaOddsMessage,
    fetchDraftkingsSoccerGermanyBundesligaOddsRequest,
    fetchDraftkingsSoccerGermanyBundesligaOddsSuccess,
    fetchDraftkingsSoccerGermanyBundesligaOddsFailure,
    clearFetchDraftkingsSoccerGermanyBundesligaOddsMessage,
    soccerGermanyBundesligaPickValidateRequest,
    soccerGermanyBundesligaPickValidateSuccess,
    soccerGermanyBundesligaPickValidateFailure,
    clearSoccerGermanyBundesligaPickValidateMessage,
} = soccerSlice.actions;

export default soccerSlice.reducer;