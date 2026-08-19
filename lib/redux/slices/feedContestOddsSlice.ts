import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    ContestGameOddsFailurePayload,
    ContestGameOddsSuccessPayload,
    FeedContestGameOddsEntry,
    FeedContestGameOddsSource,
    FeedContestOddsGroup,
    FeedContestOddsState,
    FetchContestGameOddsPayload,
    FetchFeedContestOddsPayload,
} from "@/lib/interfaces/interfaces";
import {
    groupHasPricedGame,
    IDLE_CONTEST_GAME_ODDS,
    shouldFetchContestGameOdds,
} from "@/lib/contests/feedContestOdds";

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
 *
 * `byGame` is the PER-GAME enrichment of the same board — the full market card
 * for an opened matchup, and the targeted retry for a game the batch reported
 * unpriced. It lives here rather than in a slice of its own because it is only
 * meaningful against this slice's `requestKey`, and it is dropped the instant
 * that key moves.
 */
const initialState: FeedContestOddsState = {
    requestKey: "",
    groups: [],
    missingGameIds: [],
    partial: false,
    fetchedAt: null,
    loading: false,
    error: null,
    byGame: {},
};

/**
 * Every per-game action carries the `requestKey` it was dispatched against, and
 * is dropped outright if the slot has moved on. Per-game odds under another
 * contest's slate is the exact failure this slice exists to prevent, and a
 * targeted fetch can easily outlive the screen that asked for it.
 */
const scoped = (state: FeedContestOddsState, contestRequestKey: string): boolean =>
    Boolean(state.requestKey) && state.requestKey === contestRequestKey;

const entryFor = (
    state: FeedContestOddsState,
    gameId: string
): FeedContestGameOddsEntry => {
    const existing = state.byGame[gameId];
    if (existing) return existing;
    const created: FeedContestGameOddsEntry = { ...IDLE_CONTEST_GAME_ODDS, attempts: {} };
    state.byGame[gameId] = created;
    return created;
};

/** Both request actions do the same bookkeeping; only the path differs. */
const markGameOddsLoading = (
    state: FeedContestOddsState,
    payload: FetchContestGameOddsPayload,
    source: FeedContestGameOddsSource
) => {
    const { contestRequestKey, gameId, force = false } = payload;
    if (!gameId || !scoped(state, contestRequestKey)) return;
    // The ledger is the de-dupe authority: a path already tried for this game is
    // not tried again unless the member asked for it.
    if (!shouldFetchContestGameOdds(state.byGame[gameId], source, force)) return;

    const entry = entryFor(state, gameId);
    entry.status = "loading";
    entry.error = null;
    entry.attempts[source] = {
        status: "loading",
        hasOdds: false,
        error: null,
        fetchedAt: null,
    };
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
            // A different slate arrived: whatever was enriched described the old
            // one. A re-quote of the SAME key keeps its enrichment, which is the
            // point of not refetching a 645 KB board every five minutes.
            if (state.requestKey !== action.payload.requestKey) state.byGame = {};
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
            state.byGame = {};
        },

        /* ---------- Per-game enrichment ---------- */

        /**
         * ITEM 1 — the FULL market board for the one matchup a member opened,
         * from `/leagues/<sport>/odds?match_id=`. Those controllers send no
         * `main` filter upstream, so props and alternates come back too.
         */
        fetchContestMatchOddsRequest: (
            state,
            action: PayloadAction<FetchContestGameOddsPayload>
        ) => {
            markGameOddsLoading(state, action.payload, "match_odds");
        },
        /**
         * ITEM 2 — the TARGETED `schedules-with-odds-by-events` retry for a
         * single game the batch answered as unpriced. The saga sends it with
         * `main=false`, which is both the full board and the only way past the
         * 60s negative-cache marker the batch just wrote for that id.
         */
        fetchContestGameOddsRetryRequest: (
            state,
            action: PayloadAction<FetchContestGameOddsPayload>
        ) => {
            markGameOddsLoading(state, action.payload, "by_events");
        },
        /**
         * A clean answer — which INCLUDES an answer with no markets in it. The
         * board simply stays as the batch left it in that case, so the game keeps
         * rendering "Markets not posted yet" rather than turning into an error.
         */
        fetchContestGameOddsSuccess: (
            state,
            action: PayloadAction<ContestGameOddsSuccessPayload>
        ) => {
            const { contestRequestKey, gameId, source, group, fetchedAt } = action.payload;
            if (!gameId || !scoped(state, contestRequestKey)) return;

            const entry = entryFor(state, gameId);
            const hasOdds = groupHasPricedGame(group, gameId);
            entry.attempts[source] = { status: "loaded", hasOdds, error: null, fetchedAt };
            // Still loading while the OTHER path is in flight, so one path
            // finishing empty does not stop a spinner the other still owns.
            const otherSource: FeedContestGameOddsSource =
                source === "match_odds" ? "by_events" : "match_odds";
            const otherPending = entry.attempts[otherSource]?.status === "loading";
            entry.status = otherPending ? "loading" : "loaded";
            entry.error = null;

            // A priced answer always wins; an empty one only fills a slot that
            // was never filled, so a later empty answer cannot erase a board the
            // other path already produced.
            if (hasOdds || !entry.hasOdds) {
                entry.source = source;
                entry.group = group;
                entry.hasOdds = hasOdds;
                entry.fetchedAt = fetchedAt;
            }
        },
        fetchContestGameOddsFailure: (
            state,
            action: PayloadAction<ContestGameOddsFailurePayload>
        ) => {
            const { contestRequestKey, gameId, source, error } = action.payload;
            if (!gameId || !scoped(state, contestRequestKey)) return;

            const entry = entryFor(state, gameId);
            entry.attempts[source] = {
                status: "error",
                hasOdds: false,
                error,
                fetchedAt: null,
            };
            const otherSource: FeedContestGameOddsSource =
                source === "match_odds" ? "by_events" : "match_odds";
            const otherPending = entry.attempts[otherSource]?.status === "loading";
            // Enrichment failing is not the board failing: a game that already
            // has markets stays `loaded`, and `entry.error` is only ever a
            // diagnostic — the slate keeps rendering off the batch answer.
            entry.status = otherPending ? "loading" : entry.hasOdds ? "loaded" : "error";
            entry.error = error;
        },
        clearFeedContestOdds: () => initialState,
    },
});

export const {
    fetchFeedContestOddsRequest,
    fetchFeedContestOddsSuccess,
    fetchFeedContestOddsFailure,
    fetchContestMatchOddsRequest,
    fetchContestGameOddsRetryRequest,
    fetchContestGameOddsSuccess,
    fetchContestGameOddsFailure,
    clearFeedContestOdds,
} = feedContestOddsSlice.actions;

export default feedContestOddsSlice.reducer;
