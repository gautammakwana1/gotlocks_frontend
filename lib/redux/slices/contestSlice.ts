import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ArchiveContestByIdPayload, Contests, ContestState, CreateContestPayload, ExcludeContestMemberPayload, FetchBadgeAwardsByContestIdPayload, FetchContestByIdPayload, FetchContestsParams, RecalculateStadingsPayload, ResetBadgeSettingsPayload, UpdateBadgeSettingsPayload, UpdateContestPayload } from "@/lib/interfaces/interfaces";

const initialState: ContestState = {
    contest: null,
    contests: null,
    activeContests: null,
    archivedContests: null,
    badgeAwards: null,
    badgeDefinitions: null,
    manageableBadgeDefinitions: null,
    loading: false,
    badgeLoading: false,
    error: null,
    message: null,
    hasMoreActive: false,
    hasMoreArchived: false,
};

const contestsSlice = createSlice({
    name: "contest",
    initialState,
    reducers: {
        createContestRequest: (state, action: PayloadAction<CreateContestPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createContestSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
            state.contest = action.payload?.data?.contest;
        },
        createContestFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreateContestMessage(state) {
            state.error = null;
            state.message = null;
        },

        updateContestRequest: (state, action: PayloadAction<UpdateContestPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateContestSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
            state.contest = action.payload?.data?.contest;
        },
        updateContestFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateContestMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchActiveContestsRequest: (state, action: PayloadAction<FetchContestsParams | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchActiveContestsSuccess: (state, action: PayloadAction<{ contests: Contests, page: number, hasMore: boolean }>) => {
            state.loading = false;

            const { contests, hasMore, page } = action.payload;
            state.hasMoreActive = hasMore;
            if (page === 1) {
                state.activeContests = contests;
            } else {
                const existingIds = new Set(state.activeContests?.map(c => c.id) || []);
                const newUniquePicks = contests.filter(c => !existingIds.has(c.id));
                state.activeContests = [...(state.activeContests || []), ...newUniquePicks];
            }
        },
        fetchActiveContestsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchActiveContestsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchArchivedContestsRequest: (state, action: PayloadAction<FetchContestsParams | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchArchivedContestsSuccess: (state, action: PayloadAction<{ contests: Contests, page: number, hasMore: boolean }>) => {
            state.loading = false;

            const { contests, hasMore, page } = action.payload;
            state.hasMoreArchived = hasMore;
            if (page === 1) {
                state.archivedContests = contests;
            } else {
                const existingIds = new Set(state.archivedContests?.map(c => c.id) || []);
                const newUniquePicks = contests.filter(c => !existingIds.has(c.id));
                state.archivedContests = [...(state.archivedContests || []), ...newUniquePicks];
            }
        },
        fetchArchivedContestsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchArchivedContestsMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchContestByIdRequest: (state, action: PayloadAction<FetchContestByIdPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchContestByIdSuccess: (state, action) => {
            state.loading = false;
            state.contest = action.payload.contest
        },
        fetchContestByIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchContestByIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        archiveContestByIdRequest: (state, action: PayloadAction<ArchiveContestByIdPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        archiveContestByIdSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message
            state.contest = action.payload.data.contest;
        },
        archiveContestByIdFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearArchiveContestByIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        excludeContestMemberRequest: (state, action: PayloadAction<ExcludeContestMemberPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        excludeContestMemberSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message
            state.contest = action.payload.data.contest;
        },
        excludeContestMemberFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearExcludeContestMemberMessage(state) {
            state.error = null;
            state.message = null;
        },

        fetchBadgeAwardsByContestIdRequest: (state, action: PayloadAction<FetchBadgeAwardsByContestIdPayload | undefined>) => {
            void action;
            state.badgeLoading = true;
            state.error = null;
        },
        fetchBadgeAwardsByContestIdSuccess: (state, action) => {
            state.badgeLoading = false;
            state.badgeAwards = action.payload.badgeAwards;
            state.badgeDefinitions = action.payload.badgeDefinitions;
            state.manageableBadgeDefinitions = action.payload.manageableBadgeDefinitions;
        },
        fetchBadgeAwardsByContestIdFailure: (state, action) => {
            state.badgeLoading = false;
            state.error = action.payload;
        },
        clearFetchBadgeAwardsByContestIdMessage(state) {
            state.error = null;
            state.message = null;
        },

        updateBadgeSettingsRequest: (state, action: PayloadAction<UpdateBadgeSettingsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateBadgeSettingsSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message;
            state.contest = action.payload.data.contest;
        },
        updateBadgeSettingsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateBadgeSettingsMessage(state) {
            state.error = null;
            state.message = null;
        },

        resetBadgeSettingsRequest: (state, action: PayloadAction<ResetBadgeSettingsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        resetBadgeSettingsSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message;
            state.contest = action.payload.data.contest;
        },
        resetBadgeSettingsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearResetBadgeSettingsMessage(state) {
            state.error = null;
            state.message = null;
        },

        recalculateStadingsRequest: (state, action: PayloadAction<RecalculateStadingsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        recalculateStadingsSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message;
            state.contest = action.payload.data.contest;
        },
        recalculateStadingsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearRecalculateStadingsMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    createContestRequest,
    createContestSuccess,
    createContestFailure,
    clearCreateContestMessage,
    updateContestRequest,
    updateContestSuccess,
    updateContestFailure,
    clearUpdateContestMessage,
    fetchActiveContestsRequest,
    fetchActiveContestsSuccess,
    fetchActiveContestsFailure,
    clearFetchActiveContestsMessage,
    fetchArchivedContestsRequest,
    fetchArchivedContestsSuccess,
    fetchArchivedContestsFailure,
    clearFetchArchivedContestsMessage,
    fetchContestByIdRequest,
    fetchContestByIdSuccess,
    fetchContestByIdFailure,
    clearFetchContestByIdMessage,
    archiveContestByIdRequest,
    archiveContestByIdSuccess,
    archiveContestByIdFailure,
    clearArchiveContestByIdMessage,
    excludeContestMemberRequest,
    excludeContestMemberSuccess,
    excludeContestMemberFailure,
    clearExcludeContestMemberMessage,
    fetchBadgeAwardsByContestIdRequest,
    fetchBadgeAwardsByContestIdSuccess,
    fetchBadgeAwardsByContestIdFailure,
    clearFetchBadgeAwardsByContestIdMessage,
    updateBadgeSettingsRequest,
    updateBadgeSettingsSuccess,
    updateBadgeSettingsFailure,
    clearUpdateBadgeSettingsMessage,
    resetBadgeSettingsRequest,
    resetBadgeSettingsSuccess,
    resetBadgeSettingsFailure,
    clearResetBadgeSettingsMessage,
    recalculateStadingsRequest,
    recalculateStadingsSuccess,
    recalculateStadingsFailure,
    clearRecalculateStadingsMessage,
} = contestsSlice.actions;

export default contestsSlice.reducer;