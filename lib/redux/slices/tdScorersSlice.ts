import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    FetchTdScorersPayload,
    TdScorerEvent,
    TdScorersState,
} from "@/lib/interfaces/interfaces";

/**
 * The ANYTIME TOUCHDOWN SCORER board for one TD Psychic contest's frozen slate —
 * `GET /leagues/nfl/td-scorers-by-events`, read by the TD Psychic card builder.
 *
 * The third market slot, and single-tenant like the other two for exactly the
 * reason `pickemMoneyline` is separate from `feedContestOdds`: the three answer
 * different questions and must not evict each other. `feedContestOdds` holds the
 * General Combo builder's FULL market board, `pickemMoneyline` holds one
 * moneyline per game, and this holds one player list per game. A member with a
 * combo open in one tab and a TD card in another would otherwise overwrite one
 * shape with another.
 *
 * `distinctPlayerCount` is the server's own count across the whole slate, not a
 * derived one. A TD Psychic contest needs three distinct scorers to be
 * enterable at all, and the create endpoint gates on the same number — counting
 * client-side is how a builder ends up disagreeing with the server that refuses
 * it.
 */
const initialState: TdScorersState = {
    requestKey: "",
    events: [],
    missingGameIds: [],
    withoutScorersGameIds: [],
    distinctPlayerCount: 0,
    partial: false,
    fetchedAt: null,
    loading: false,
    error: null,
};

const tdScorersSlice = createSlice({
    name: "tdScorers",
    initialState,
    reducers: {
        fetchTdScorersRequest: (state, action: PayloadAction<FetchTdScorersPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchTdScorersSuccess: (
            state,
            action: PayloadAction<{
                requestKey: string;
                events: TdScorerEvent[];
                missingGameIds: string[];
                withoutScorersGameIds: string[];
                distinctPlayerCount: number;
                partial: boolean;
                fetchedAt: number;
            }>
        ) => {
            state.loading = false;
            state.error = null;
            state.requestKey = action.payload.requestKey;
            state.events = action.payload.events;
            state.missingGameIds = action.payload.missingGameIds;
            state.withoutScorersGameIds = action.payload.withoutScorersGameIds;
            state.distinctPlayerCount = action.payload.distinctPlayerCount;
            state.partial = action.payload.partial;
            state.fetchedAt = action.payload.fetchedAt;
        },
        fetchTdScorersFailure: (
            state,
            action: PayloadAction<{ requestKey: string; error: string }>
        ) => {
            state.loading = false;
            state.error = action.payload.error;
            // The stored board described a different slate; leaving it would
            // offer another contest's players under this one's matchups — and
            // every one of them would be refused by the entry endpoint, which
            // checks each game_id against THIS contest's eligible ids.
            state.requestKey = "";
            state.events = [];
            state.missingGameIds = [];
            state.withoutScorersGameIds = [];
            state.distinctPlayerCount = 0;
            state.partial = false;
            state.fetchedAt = null;
        },
        clearTdScorers: () => initialState,
    },
});

export const {
    fetchTdScorersRequest,
    fetchTdScorersSuccess,
    fetchTdScorersFailure,
    clearTdScorers,
} = tdScorersSlice.actions;

export default tdScorersSlice.reducer;
