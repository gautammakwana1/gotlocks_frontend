import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    FeedContestOddsGroup,
    FeedContestOddsState,
    FetchFeedContestOddsPayload,
} from "@/lib/interfaces/interfaces";

/**
 * The PRICED markets for one contest's frozen slate —
 * `/leagues/**\/schedules-with-odds-by-events`, read by the entry builder.
 *
 * Kept out of `feedContestSchedule` on purpose, even though the two look alike.
 * That slice holds the CREATE wizard's unpriced range feed; an organizer with a
 * half-built wizard open and a member on the entry screen would otherwise evict
 * each other's slate. It is kept out of the six per-sport slices for the same
 * reason those were avoided in the wizard: they are shared with the pick
 * builders, and a contest-scoped read must not overwrite what a builder shows.
 */
const initialState: FeedContestOddsState = {
    requestKey: "",
    groups: [],
    missingGameIds: [],
    partial: false,
    fetchedAt: null,
    loading: false,
    error: null,
};

const feedContestOddsSlice = createSlice({
    name: "feedContestOdds",
    initialState,
    reducers: {
        fetchFeedContestOddsRequest: (
            state,
            action: PayloadAction<FetchFeedContestOddsPayload>
        ) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchFeedContestOddsSuccess: (
            state,
            action: PayloadAction<{
                requestKey: string;
                groups: FeedContestOddsGroup[];
                missingGameIds: string[];
                partial: boolean;
                fetchedAt: number;
            }>
        ) => {
            state.loading = false;
            state.error = null;
            state.requestKey = action.payload.requestKey;
            state.groups = action.payload.groups;
            state.missingGameIds = action.payload.missingGameIds;
            state.partial = action.payload.partial;
            state.fetchedAt = action.payload.fetchedAt;
        },
        fetchFeedContestOddsFailure: (
            state,
            action: PayloadAction<{ requestKey: string; error: string }>
        ) => {
            state.loading = false;
            state.error = action.payload.error;
            // The stored groups described a different slate; leaving them would
            // offer another contest's markets under this contest's games.
            state.requestKey = "";
            state.groups = [];
            state.missingGameIds = [];
            state.partial = false;
            state.fetchedAt = null;
        },
        clearFeedContestOdds: () => initialState,
    },
});

export const {
    fetchFeedContestOddsRequest,
    fetchFeedContestOddsSuccess,
    fetchFeedContestOddsFailure,
    clearFeedContestOdds,
} = feedContestOddsSlice.actions;

export default feedContestOddsSlice.reducer;
