import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    FeedContestAchievementsData,
    FeedContestAchievementsPayload,
    FeedContestPicksData,
    GroupMemberCommunityPicksData,
    GroupMemberPicksPayload,
    GroupMemberStatsData,
    GroupMemberStatsPayload,
    MemberCardState,
    SlipContestPicksData,
} from "@/lib/interfaces/interfaces";

/**
 * The member card — one member's record inside ONE group.
 *
 * Five independent reads share this slice because they share a lifetime: they
 * are requested together on mount and are meaningless apart. Each keeps its own
 * loading/error pair so a failed tab degrades to its own message instead of
 * taking the header down with it.
 *
 * `resetMemberCard` is dispatched by the screen BEFORE it requests, not only on
 * unmount. The card is reachable member-to-member within one group, and without
 * that the previous member's totals stay painted under the new name for the
 * whole in-flight window — the same class of bug as the shared group record.
 */
const initialState: MemberCardState = {
    stats: null,
    statsLoading: false,
    statsError: null,

    slipPicks: null,
    slipPicksLoading: false,
    slipPicksError: null,

    communityPicks: null,
    communityPicksLoading: false,
    communityPicksError: null,

    feedContestPicks: null,
    feedContestPicksLoading: false,
    feedContestPicksError: null,

    achievements: null,
    achievementsLoading: false,
    achievementsError: null,
};

const memberCardSlice = createSlice({
    name: "memberCard",
    initialState,
    reducers: {
        /* ---------- Stats ---------- */
        fetchMemberStatsRequest: (
            state,
            action: PayloadAction<GroupMemberStatsPayload>
        ) => {
            void action;
            state.statsLoading = true;
            state.statsError = null;
        },
        fetchMemberStatsSuccess: (
            state,
            action: PayloadAction<GroupMemberStatsData | null>
        ) => {
            state.statsLoading = false;
            state.stats = action.payload;
        },
        fetchMemberStatsFailure: (state, action: PayloadAction<string>) => {
            state.statsLoading = false;
            state.statsError = action.payload;
        },

        /* ---------- Slip (Fantasy) picks — League only ---------- */
        fetchMemberSlipPicksRequest: (
            state,
            action: PayloadAction<GroupMemberPicksPayload>
        ) => {
            void action;
            state.slipPicksLoading = true;
            state.slipPicksError = null;
        },
        fetchMemberSlipPicksSuccess: (
            state,
            action: PayloadAction<SlipContestPicksData | null>
        ) => {
            state.slipPicksLoading = false;
            state.slipPicks = action.payload;
        },
        fetchMemberSlipPicksFailure: (state, action: PayloadAction<string>) => {
            state.slipPicksLoading = false;
            state.slipPicksError = action.payload;
        },

        /* ---------- Community picks — both surfaces ---------- */
        fetchMemberCommunityPicksRequest: (
            state,
            action: PayloadAction<GroupMemberPicksPayload>
        ) => {
            void action;
            state.communityPicksLoading = true;
            state.communityPicksError = null;
        },
        fetchMemberCommunityPicksSuccess: (
            state,
            action: PayloadAction<GroupMemberCommunityPicksData | null>
        ) => {
            state.communityPicksLoading = false;
            state.communityPicks = action.payload;
        },
        fetchMemberCommunityPicksFailure: (state, action: PayloadAction<string>) => {
            state.communityPicksLoading = false;
            state.communityPicksError = action.payload;
        },

        /* ---------- Feed contest entries — both surfaces ---------- */
        fetchMemberFeedContestPicksRequest: (
            state,
            action: PayloadAction<GroupMemberPicksPayload>
        ) => {
            void action;
            state.feedContestPicksLoading = true;
            state.feedContestPicksError = null;
        },
        fetchMemberFeedContestPicksSuccess: (
            state,
            action: PayloadAction<FeedContestPicksData | null>
        ) => {
            state.feedContestPicksLoading = false;
            state.feedContestPicks = action.payload;
        },
        fetchMemberFeedContestPicksFailure: (state, action: PayloadAction<string>) => {
            state.feedContestPicksLoading = false;
            state.feedContestPicksError = action.payload;
        },

        /* ---------- Achievements — both surfaces ---------- */
        fetchMemberAchievementsRequest: (
            state,
            action: PayloadAction<FeedContestAchievementsPayload>
        ) => {
            void action;
            state.achievementsLoading = true;
            state.achievementsError = null;
        },
        fetchMemberAchievementsSuccess: (
            state,
            action: PayloadAction<FeedContestAchievementsData | null>
        ) => {
            state.achievementsLoading = false;
            state.achievements = action.payload;
        },
        fetchMemberAchievementsFailure: (state, action: PayloadAction<string>) => {
            state.achievementsLoading = false;
            state.achievementsError = action.payload;
        },

        /** Drops every slot. See the banner: this runs BEFORE the fetch, not
         *  only on unmount. */
        resetMemberCard: () => initialState,
    },
});

export const {
    fetchMemberStatsRequest,
    fetchMemberStatsSuccess,
    fetchMemberStatsFailure,
    fetchMemberSlipPicksRequest,
    fetchMemberSlipPicksSuccess,
    fetchMemberSlipPicksFailure,
    fetchMemberCommunityPicksRequest,
    fetchMemberCommunityPicksSuccess,
    fetchMemberCommunityPicksFailure,
    fetchMemberFeedContestPicksRequest,
    fetchMemberFeedContestPicksSuccess,
    fetchMemberFeedContestPicksFailure,
    fetchMemberAchievementsRequest,
    fetchMemberAchievementsSuccess,
    fetchMemberAchievementsFailure,
    resetMemberCard,
} = memberCardSlice.actions;

export default memberCardSlice.reducer;
