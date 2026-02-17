import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Feed, FetchActivityPayload, SessionState } from "@/lib/interfaces/interfaces";

type ActivityState = {
    feed: Feed | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
};

const initialState: ActivityState = {
    feed: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
};

const feedSlice = createSlice({
    name: "feed",
    initialState,
    reducers: {
        fetchAllActivitiesRequest: (state, action: PayloadAction<FetchActivityPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchAllActivitiesSuccess: (state, action) => {
            state.loading = false;
            state.feed = action.payload;
            state.message = action.payload?.message;
        },
        fetchAllActivitiesFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchAllActivitiesMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    fetchAllActivitiesRequest,
    fetchAllActivitiesSuccess,
    fetchAllActivitiesFailure,
    clearFetchAllActivitiesMessage,
} = feedSlice.actions;

export default feedSlice.reducer;