import {
    FetchLeagueCountsPayload,
    FetchLeagueMatchupCountsPayload,
    LeagueMatchupCountsData,
    LeagueState,
} from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: LeagueState = {
    loading: false,
    error: null,
    message: null,
    leagueCounts: null,
    matchupCounts: null,
    matchupCountsLoading: false,
    matchupCountsError: null,
};

const leagueSlice = createSlice({
    name: "league",
    initialState,
    reducers: {
        fetchLeaguesCountsRequest: (state, action: PayloadAction<FetchLeagueCountsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchLeaguesCountsSuccess: (state, action) => {
            state.loading = false;
            state.leagueCounts = action.payload.events;
        },
        fetchLeaguesCountsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchLeaguesCountsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        /**
         * Debounced in the saga, so this may fire on every date change and only
         * the last one reaches the network. The previous answer is deliberately
         * KEPT while the next is in flight — dropping it would collapse the
         * league chips to nothing on every change instead of dimming them.
         */
        fetchLeagueMatchupCountsRequest: (
            state,
            action: PayloadAction<FetchLeagueMatchupCountsPayload | undefined>
        ) => {
            void action;
            state.matchupCountsLoading = true;
            state.matchupCountsError = null;
        },
        fetchLeagueMatchupCountsSuccess: (
            state,
            action: PayloadAction<LeagueMatchupCountsData>
        ) => {
            state.matchupCountsLoading = false;
            state.matchupCountsError = null;
            state.matchupCounts = action.payload;
        },
        fetchLeagueMatchupCountsFailure: (state, action: PayloadAction<string>) => {
            state.matchupCountsLoading = false;
            state.matchupCountsError = action.payload;
            // A failed read must not leave the previous range's counts on screen
            // pretending to describe the new one.
            state.matchupCounts = null;
        },
        clearLeagueMatchupCounts: (state) => {
            state.matchupCounts = null;
            state.matchupCountsLoading = false;
            state.matchupCountsError = null;
        },
    },
});

export const {
    fetchLeaguesCountsRequest,
    fetchLeaguesCountsSuccess,
    fetchLeaguesCountsFailure,
    clearFetchLeaguesCountsMessage,
    fetchLeagueMatchupCountsRequest,
    fetchLeagueMatchupCountsSuccess,
    fetchLeagueMatchupCountsFailure,
    clearLeagueMatchupCounts,
} = leagueSlice.actions;

export default leagueSlice.reducer;
