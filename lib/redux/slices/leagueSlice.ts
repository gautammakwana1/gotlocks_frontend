import { FetchLeagueCountsPayload, LeagueState } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: LeagueState = {
    loading: false,
    error: null,
    message: null,
    leagueCounts: null,
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
    },
});

export const {
    fetchLeaguesCountsRequest,
    fetchLeaguesCountsSuccess,
    fetchLeaguesCountsFailure,
    clearFetchLeaguesCountsMessage,
} = leagueSlice.actions;

export default leagueSlice.reducer;