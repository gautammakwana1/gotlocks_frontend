import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
    GroupLifetimeStandingsData,
    GroupLifetimeStandingsPayload,
    LifetimeStandingsBoardSlot,
    LifetimeStandingsState,
    LifetimeStandingsType,
} from "@/lib/interfaces/interfaces";

/* ============================================================================
 * LIFETIME STANDINGS — GET /group/lifetime-standings.
 *
 * Its own slice rather than another family on groupsSlice, which already
 * carries several leaderboards and whose shared `state.group.group` record is
 * the known source of cross-group staleness here.
 *
 * TWO SLOTS, one per board. A League holds both behind a single flip button, so
 * keeping them apart is what makes flipping back instant and request-free; a
 * single slot would refetch on every flip and thrash between two shapes.
 *
 * `groupId` is the tenancy stamp. Both slots are dropped the moment a different
 * group asks, so a previous Arena's rows can never paint under the next one's
 * name while its own request is still in flight.
 * ========================================================================== */

const emptySlot = (): LifetimeStandingsBoardSlot => ({
    data: null,
    loading: false,
    error: null,
});

const initialState: LifetimeStandingsState = {
    groupId: null,
    feed: emptySlot(),
    fantasy: emptySlot(),
};

/* Matches the server default for a League. An Arena caller always sends `feed`
 * explicitly, so this only decides which slot an unqualified request lands in. */
const resolveType = (type?: LifetimeStandingsType): LifetimeStandingsType =>
    type ?? "fantasy";

const lifetimeStandingsSlice = createSlice({
    name: "lifetimeStandings",
    initialState,
    reducers: {
        fetchLifetimeStandingsRequest: (
            state,
            action: PayloadAction<GroupLifetimeStandingsPayload>
        ) => {
            const type = resolveType(action.payload.type);

            if (state.groupId !== action.payload.group_id) {
                state.groupId = action.payload.group_id;
                state.feed = emptySlot();
                state.fantasy = emptySlot();
            }

            state[type].loading = true;
            state[type].error = null;
        },

        /**
         * Routes off `board.type` rather than an echoed request field, so the
         * reply itself decides which slot it belongs to and a raced flip cannot
         * file one board's rows under the other.
         *
         * Page 1 replaces; later pages append. The append is de-duped on
         * `user_id` because the endpoint splices the viewer's own row into
         * whatever page it is really on, so a member can legitimately arrive
         * twice across two pages.
         */
        fetchLifetimeStandingsSuccess: (
            state,
            action: PayloadAction<GroupLifetimeStandingsData>
        ) => {
            const data = action.payload;
            const slot = state[data.board.type];

            slot.loading = false;
            slot.error = null;

            const isFirstPage = (data.pagination?.page ?? 1) <= 1;

            if (isFirstPage || !slot.data) {
                slot.data = data;
                return;
            }

            const seen = new Set(slot.data.standings.map((row) => row.user_id));

            slot.data = {
                // Everything but the rows comes from the NEWEST reply — the
                // totals move as the board is paged through.
                ...data,
                standings: [
                    ...slot.data.standings,
                    ...data.standings.filter((row) => !seen.has(row.user_id)),
                ],
            };
        },

        /* The only failure on this slice that carries more than a message: with
         * two slots the reducer cannot tell which board failed otherwise. */
        fetchLifetimeStandingsFailure: (
            state,
            action: PayloadAction<{ type: LifetimeStandingsType; message: string }>
        ) => {
            const slot = state[action.payload.type];
            slot.loading = false;
            slot.error = action.payload.message;
            slot.data = null;
        },

        resetLifetimeStandings: () => initialState,
    },
});

export const {
    fetchLifetimeStandingsRequest,
    fetchLifetimeStandingsSuccess,
    fetchLifetimeStandingsFailure,
    resetLifetimeStandings,
} = lifetimeStandingsSlice.actions;

export default lifetimeStandingsSlice.reducer;
