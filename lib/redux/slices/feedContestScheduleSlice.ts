import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    FeedContestScheduleGroup,
    FeedContestScheduleState,
    FetchFeedContestSchedulesPayload,
} from "@/lib/interfaces/interfaces";

/**
 * The Feed contest wizard's own slate source: `/leagues/<sport>/schedules-for-all-tz`
 * for exactly the sports the organizer chose, over exactly the days the slate
 * covers. Kept off the six per-sport slices on purpose — those are shared with
 * the pick builders, and a contest-scoped date range must not overwrite the
 * schedule a pick builder is showing.
 */
const initialState: FeedContestScheduleState = {
    requestKey: "",
    groups: [],
    loading: false,
    error: null,
};

const feedContestScheduleSlice = createSlice({
    name: "feedContestSchedule",
    initialState,
    reducers: {
        fetchFeedContestSchedulesRequest: (
            state,
            action: PayloadAction<FetchFeedContestSchedulesPayload>
        ) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchFeedContestSchedulesSuccess: (
            state,
            action: PayloadAction<{ requestKey: string; groups: FeedContestScheduleGroup[] }>
        ) => {
            state.loading = false;
            state.error = null;
            state.requestKey = action.payload.requestKey;
            state.groups = action.payload.groups;
        },
        fetchFeedContestSchedulesFailure: (
            state,
            action: PayloadAction<{ requestKey: string; error: string }>
        ) => {
            state.loading = false;
            state.error = action.payload.error;
            // The stored groups described a different request; leaving them would
            // label the failed slate with the previous one's matchups.
            state.requestKey = "";
            state.groups = [];
        },
        clearFeedContestSchedules: () => initialState,
    },
});

export const {
    fetchFeedContestSchedulesRequest,
    fetchFeedContestSchedulesSuccess,
    fetchFeedContestSchedulesFailure,
    clearFeedContestSchedules,
} = feedContestScheduleSlice.actions;

export default feedContestScheduleSlice.reducer;
