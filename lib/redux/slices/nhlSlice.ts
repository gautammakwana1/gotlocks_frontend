import { FetchNHLOddsPayload, FetchNHLSchedulePayload, NHLState, ValidateMyNHLPickPayload } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: NHLState = {
    loading: false,
    error: null,
    message: null,
    nhlSchedules: null,
    nhlOdds: null,
    validateLoading: false,
    validatePickError: null,
    validatePickMessage: null,
};

const nhlSlice = createSlice({
    name: "nhl",
    initialState,
    reducers: {
        fetchNHLScheduleRequest: (state, action: PayloadAction<FetchNHLSchedulePayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNHLScheduleSuccess: (state, action) => {
            state.loading = false;
            state.nhlSchedules = action.payload.schedule;
        },
        fetchNHLScheduleFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchNHLScheduleMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        fetchNHLOddsRequest: (state, action: PayloadAction<FetchNHLOddsPayload & { silent?: boolean } | undefined>) => {
            void action;
            if (!action.payload?.silent) {
                state.loading = true;
            }
            state.error = null;
        },
        fetchNHLOddsSuccess: (state, action) => {
            state.loading = false;
            state.nhlOdds = action.payload.odds;
        },
        fetchNHLOddsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchNHLOddsMessage: (state) => {
            state.error = null;
            state.message = null;
        },

        nhlPickValidateRequest: (state, action: PayloadAction<ValidateMyNHLPickPayload | undefined>) => {
            void action;
            state.validateLoading = true;
            state.validatePickError = null;
        },
        nhlPickValidateSuccess: (state, action) => {
            state.validateLoading = false;
            state.validatePickMessage = action.payload.message;
        },
        nhlPickValidateFailure: (state, action) => {
            state.validateLoading = false;
            state.validatePickError = action.payload;
        },
        clearNhlPickValidateMessage: (state) => {
            state.validatePickError = null;
            state.validatePickMessage = null;
        },
    },
});

export const {
    fetchNHLScheduleRequest,
    fetchNHLScheduleSuccess,
    fetchNHLScheduleFailure,
    clearFetchNHLScheduleMessage,
    fetchNHLOddsRequest,
    fetchNHLOddsSuccess,
    fetchNHLOddsFailure,
    clearFetchNHLOddsMessage,
    nhlPickValidateRequest,
    nhlPickValidateSuccess,
    nhlPickValidateFailure,
    clearNhlPickValidateMessage,
} = nhlSlice.actions;

export default nhlSlice.reducer;