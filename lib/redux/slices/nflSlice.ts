import { FetchLiveNFLOddsPayload, FetchNFLSchedulePayload, FetchPassingPropsPlayersPayload, FetchReceivingPropsPlayersPayload, FetchRushingPropsPlayersPayload, FetchTouchDownPropsPlayersPayload, NFLState, ValidateMyPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: NFLState = {
    nflSchedules: null,
    nflOdds: null,
    nflPassingProps: null,
    nflReceivingProps: null,
    nflRushingProps: null,
    nflTouchDownProps: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    validateLoading: false,
    error: null,
    message: null,
    validPickError: null,
    validPickMessage: null,
};

const nflSlice = createSlice({
    name: "nfl",
    initialState,
    reducers: {
        fetchLiveNFLScheduleRequest: (state, action: PayloadAction<FetchNFLSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchLiveNFLScheduleSuccess: (state, action) => {
            state.loading = false;
            state.nflSchedules = action.payload.schedule;
        },
        fetchLiveNFLScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchLiveNFLScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchLiveOddsRequest: (state, action: PayloadAction<FetchLiveNFLOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchLiveOddsSuccess: (state, action) => {
            state.loading = false;
            state.nflOdds = action.payload.odds;
        },
        fetchLiveOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchLiveOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchPassingPropsPlayersRequest: (state, action: PayloadAction<FetchPassingPropsPlayersPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchPassingPropsPlayersSuccess: (state, action) => {
            state.loading = false;
            state.nflPassingProps = action.payload.odds;
        },
        fetchPassingPropsPlayersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchPassingPropsPlayersMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchReceivingPropsPlayersRequest: (state, action: PayloadAction<FetchReceivingPropsPlayersPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchReceivingPropsPlayersSuccess: (state, action) => {
            state.loading = false;
            state.nflReceivingProps = action.payload.odds;
        },
        fetchReceivingPropsPlayersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchReceivingPropsPlayersMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchRushingPropsPlayersRequest: (state, action: PayloadAction<FetchRushingPropsPlayersPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchRushingPropsPlayersSuccess: (state, action) => {
            state.loading = false;
            state.nflRushingProps = action.payload.odds;
        },
        fetchRushingPropsPlayersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchRushingPropsPlayersMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchTouchDownPropsPlayersRequest: (state, action: PayloadAction<FetchTouchDownPropsPlayersPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchTouchDownPropsPlayersSuccess: (state, action) => {
            state.loading = false;
            state.nflTouchDownProps = action.payload.odds;
        },
        fetchTouchDownPropsPlayersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        cleatFetchTouchDownPropsPlayersMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        validateMyNFLPickRequest: (state, action: PayloadAction<ValidateMyPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.error = null;
        },
        validateMyNFLPickSuccess: (state, action) => {
            state.validateLoading = false;
            state.validPickMessage = action.payload.message;
        },
        validateMyNFLPickFailure: (state, action) => {
            state.validateLoading = false;
            state.validPickError = action.payload;
        },
        clearValidateMyNFLPickMessage(state) {
            state.validPickError = null;
            state.validPickMessage = null;
        },
    },
});

export const {
    fetchLiveNFLScheduleRequest,
    fetchLiveNFLScheduleSuccess,
    fetchLiveNFLScheduleFailure,
    cleatFetchLiveNFLScheduleMessage,
    fetchLiveOddsRequest,
    fetchLiveOddsSuccess,
    fetchLiveOddsFailure,
    cleatFetchLiveOddsMessage,
    fetchPassingPropsPlayersRequest,
    fetchPassingPropsPlayersSuccess,
    fetchPassingPropsPlayersFailure,
    cleatFetchPassingPropsPlayersMessage,
    fetchReceivingPropsPlayersRequest,
    fetchReceivingPropsPlayersSuccess,
    fetchReceivingPropsPlayersFailure,
    cleatFetchReceivingPropsPlayersMessage,
    fetchRushingPropsPlayersRequest,
    fetchRushingPropsPlayersSuccess,
    fetchRushingPropsPlayersFailure,
    cleatFetchRushingPropsPlayersMessage,
    fetchTouchDownPropsPlayersRequest,
    fetchTouchDownPropsPlayersSuccess,
    fetchTouchDownPropsPlayersFailure,
    cleatFetchTouchDownPropsPlayersMessage,
    validateMyNFLPickRequest,
    validateMyNFLPickSuccess,
    validateMyNFLPickFailure,
    clearValidateMyNFLPickMessage,
} = nflSlice.actions;

export default nflSlice.reducer;