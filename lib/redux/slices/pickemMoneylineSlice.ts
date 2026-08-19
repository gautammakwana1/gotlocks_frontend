import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    FetchPickemMoneylinePayload,
    PickemMoneylineEvent,
    PickemMoneylineState,
} from "@/lib/interfaces/interfaces";

/**
 * The MONEYLINE board for one Sunday Pick'em contest's frozen slate —
 * `GET /leagues/nfl/moneyline-odds`, read by the Pick'em card editor.
 *
 * A slot of its own rather than a mode of `feedContestOdds`, for the same reason
 * that slice is separate from `feedContestSchedule`: the two answer different
 * questions and must not evict each other. `feedContestOdds` holds the General
 * Combo builder's FULL market board; this holds the one market a card needs,
 * already flattened. A member with a combo entry open in one tab and a card in
 * another would otherwise overwrite one with the other's shape.
 */
const initialState: PickemMoneylineState = {
    requestKey: "",
    events: [],
    missingGameIds: [],
    withoutMoneylineGameIds: [],
    partial: false,
    fetchedAt: null,
    loading: false,
    error: null,
};

const pickemMoneylineSlice = createSlice({
    name: "pickemMoneyline",
    initialState,
    reducers: {
        fetchPickemMoneylineRequest: (
            state,
            action: PayloadAction<FetchPickemMoneylinePayload>
        ) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchPickemMoneylineSuccess: (
            state,
            action: PayloadAction<{
                requestKey: string;
                events: PickemMoneylineEvent[];
                missingGameIds: string[];
                withoutMoneylineGameIds: string[];
                partial: boolean;
                fetchedAt: number;
            }>
        ) => {
            state.loading = false;
            state.error = null;
            state.requestKey = action.payload.requestKey;
            state.events = action.payload.events;
            state.missingGameIds = action.payload.missingGameIds;
            state.withoutMoneylineGameIds = action.payload.withoutMoneylineGameIds;
            state.partial = action.payload.partial;
            state.fetchedAt = action.payload.fetchedAt;
        },
        fetchPickemMoneylineFailure: (
            state,
            action: PayloadAction<{ requestKey: string; error: string }>
        ) => {
            state.loading = false;
            state.error = action.payload.error;
            // The stored board described a different slate; leaving it would
            // price another contest's games under this one's matchups.
            state.requestKey = "";
            state.events = [];
            state.missingGameIds = [];
            state.withoutMoneylineGameIds = [];
            state.partial = false;
            state.fetchedAt = null;
        },
        clearPickemMoneyline: () => initialState,
    },
});

export const {
    fetchPickemMoneylineRequest,
    fetchPickemMoneylineSuccess,
    fetchPickemMoneylineFailure,
    clearPickemMoneyline,
} = pickemMoneylineSlice.actions;

export default pickemMoneylineSlice.reducer;
