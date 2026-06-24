import { FetchSoccerEnglandPremierLeagueOddsPayload, FetchSoccerEnglandPremierLeagueSchedulePayload, FetchSoccerFIFAWorldCupOddsPayload, FetchSoccerFIFAWorldCupSchedulePayload, FetchSoccerGermanyBundesligaOddsPayload, FetchSoccerGermanyBundesligaSchedulePayload, SoccerState, ValidateMySoccerEnglandPremierLeaguePickPayload, ValidateMySoccerFIFAWorldCupPickPayload, ValidateMySoccerGermanyBundesligaPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: SoccerState = {
    loading: false,
    error: null,
    message: null,
    englandPremierLeagueSchedulesWithOdds: null,
    englandPremierLeagueSchedules: null,
    germanyBundesligaSchedulesWithOdds: null,
    germanyBundesligaSchedules: null,
    fifaWorldCupSchedulesWithOdds: null,
    fifaWorldCupSchedules: null,
    fanduelEnglandPremierLeagueOdds: null,
    draftkingEnglandPremierLeagueOdds: null,
    fanduelGermanyBundesligaOdds: null,
    draftkingGermanyBundesligaOdds: null,
    fanduelFifaWorldCupOdds: null,
    draftkingFifaWorldCupOdds: null,
    oddsLoading: false,
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
            state.englandPremierLeagueSchedulesWithOdds = action.payload.schedule;
        },
        fetchSoccerEnglandPremierLeagueScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerEnglandPremierLeagueScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerEnglandPremierLeagueScheduleByTimezoneSuccess: (state, action) => {
            state.loading = false;
            state.englandPremierLeagueSchedules = action.payload.schedule;
        },
        fetchSoccerEnglandPremierLeagueScheduleByTimezoneFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerEnglandPremierLeagueScheduleByTimezoneMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchFanduelSoccerEnglandPremierLeagueOddsRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchFanduelSoccerEnglandPremierLeagueOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.fanduelEnglandPremierLeagueOdds = action.payload.odds;
        },
        fetchFanduelSoccerEnglandPremierLeagueOddsFailure: (state, action) => {
            state.oddsLoading = false;
            state.error = action.payload;
        },
        clearFetchFanduelSoccerEnglandPremierLeagueOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest: (state, action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchDraftkingsSoccerEnglandPremierLeagueOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.draftkingEnglandPremierLeagueOdds = action.payload.odds;
        },
        fetchDraftkingsSoccerEnglandPremierLeagueOddsFailure: (state, action) => {
            state.oddsLoading = false;
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
            state.germanyBundesligaSchedulesWithOdds = action.payload.schedule;
        },
        fetchSoccerGermanyBundesligaScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerGermanyBundesligaScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchSoccerGermanyBundesligaScheduleByTimezoneRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerGermanyBundesligaScheduleByTimezoneSuccess: (state, action) => {
            state.loading = false;
            state.germanyBundesligaSchedules = action.payload.schedule;
        },
        fetchSoccerGermanyBundesligaScheduleByTimezoneFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerGermanyBundesligaScheduleByTimezoneMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchFanduelSoccerGermanyBundesligaOddsRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchFanduelSoccerGermanyBundesligaOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.fanduelGermanyBundesligaOdds = action.payload.odds;
        },
        fetchFanduelSoccerGermanyBundesligaOddsFailure: (state, action) => {
            state.oddsLoading = false;
            state.error = action.payload;
        },
        clearFetchFanduelSoccerGermanyBundesligaOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsSoccerGermanyBundesligaOddsRequest: (state, action: PayloadAction<FetchSoccerGermanyBundesligaOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchDraftkingsSoccerGermanyBundesligaOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.draftkingGermanyBundesligaOdds = action.payload.odds;
        },
        fetchDraftkingsSoccerGermanyBundesligaOddsFailure: (state, action) => {
            state.oddsLoading = false;
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

        // FIFA World Cup
        fetchSoccerFIFAWorldCupScheduleRequest: (state, action: PayloadAction<FetchSoccerFIFAWorldCupSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerFIFAWorldCupScheduleSuccess: (state, action) => {
            state.loading = false;
            state.fifaWorldCupSchedulesWithOdds = action.payload.schedule;
        },
        fetchSoccerFIFAWorldCupScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerFIFAWorldCupScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchSoccerFIFAWorldCupScheduleByTimezoneRequest: (state, action: PayloadAction<FetchSoccerFIFAWorldCupSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSoccerFIFAWorldCupScheduleByTimezoneSuccess: (state, action) => {
            state.loading = false;
            state.fifaWorldCupSchedules = action.payload.schedule;
        },
        fetchSoccerFIFAWorldCupScheduleByTimezoneFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSoccerFIFAWorldCupScheduleByTimezoneMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchFanduelSoccerFIFAWorldCupOddsRequest: (state, action: PayloadAction<FetchSoccerFIFAWorldCupOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchFanduelSoccerFIFAWorldCupOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.fanduelFifaWorldCupOdds = action.payload.odds;
        },
        fetchFanduelSoccerFIFAWorldCupOddsFailure: (state, action) => {
            state.oddsLoading = false;
            state.error = action.payload;
        },
        clearFetchFanduelSoccerFIFAWorldCupOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchDraftkingsSoccerFIFAWorldCupOddsRequest: (state, action: PayloadAction<FetchSoccerFIFAWorldCupOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.oddsLoading = true;
            }
            state.error = null;
        },
        fetchDraftkingsSoccerFIFAWorldCupOddsSuccess: (state, action) => {
            state.oddsLoading = false;
            state.draftkingFifaWorldCupOdds = action.payload.odds;
        },
        fetchDraftkingsSoccerFIFAWorldCupOddsFailure: (state, action) => {
            state.oddsLoading = false;
            state.error = action.payload;
        },
        clearFetchDraftkingsSoccerFIFAWorldCupOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        soccerFIFAWorldCupPickValidateRequest: (state, action: PayloadAction<ValidateMySoccerFIFAWorldCupPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        soccerFIFAWorldCupPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        soccerFIFAWorldCupPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearSoccerFIFAWorldCupPickValidateMessage: (state) => {
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
    fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest,
    fetchSoccerEnglandPremierLeagueScheduleByTimezoneSuccess,
    fetchSoccerEnglandPremierLeagueScheduleByTimezoneFailure,
    clearFetchSoccerEnglandPremierLeagueScheduleByTimezoneMessage,
    fetchSoccerGermanyBundesligaScheduleByTimezoneRequest,
    fetchSoccerGermanyBundesligaScheduleByTimezoneSuccess,
    fetchSoccerGermanyBundesligaScheduleByTimezoneFailure,
    clearFetchSoccerGermanyBundesligaScheduleByTimezoneMessage,
    fetchSoccerFIFAWorldCupScheduleRequest,
    fetchSoccerFIFAWorldCupScheduleSuccess,
    fetchSoccerFIFAWorldCupScheduleFailure,
    clearFetchSoccerFIFAWorldCupScheduleMessage,
    fetchSoccerFIFAWorldCupScheduleByTimezoneRequest,
    fetchSoccerFIFAWorldCupScheduleByTimezoneSuccess,
    fetchSoccerFIFAWorldCupScheduleByTimezoneFailure,
    clearFetchSoccerFIFAWorldCupScheduleByTimezoneMessage,
    fetchFanduelSoccerFIFAWorldCupOddsRequest,
    fetchFanduelSoccerFIFAWorldCupOddsSuccess,
    fetchFanduelSoccerFIFAWorldCupOddsFailure,
    clearFetchFanduelSoccerFIFAWorldCupOddsMessage,
    fetchDraftkingsSoccerFIFAWorldCupOddsRequest,
    fetchDraftkingsSoccerFIFAWorldCupOddsSuccess,
    fetchDraftkingsSoccerFIFAWorldCupOddsFailure,
    clearFetchDraftkingsSoccerFIFAWorldCupOddsMessage,
    soccerFIFAWorldCupPickValidateRequest,
    soccerFIFAWorldCupPickValidateSuccess,
    soccerFIFAWorldCupPickValidateFailure,
    clearSoccerFIFAWorldCupPickValidateMessage,
} = soccerSlice.actions;

export default soccerSlice.reducer;