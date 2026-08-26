import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    CreateFeedContestPayload,
    DeleteFeedContestData,
    DeleteFeedContestPayload,
    EnterFeedContestData,
    EnterFeedContestPayload,
    EnterPickemFeedContestData,
    EnterPickemFeedContestPayload,
    ReplacePickemFeedContestEntryData,
    ReplacePickemFeedContestEntryPayload,
    EnterTdPsychicFeedContestData,
    EnterTdPsychicFeedContestPayload,
    ReplaceTdPsychicFeedContestEntryData,
    ReplaceTdPsychicFeedContestEntryPayload,
    FeedContest,
    FeedContestAwardReversalData,
    FeedContestAwardReversalPayload,
    FeedContestDetailData,
    FeedContestEntriesData,
    FeedContestLeaderboardData,
    FeedContestStandingRow,
    FeedContestLifecycleActionPayload,
    FeedContestLifecycleData,
    FeedContestListData,
    FeedContestPicksData,
    FeedContestUpdatesData,
    FetchFeedContestUpdatesPayload,
    FeedContestPodiumListData,
    FeedContestSection,
    FeedContestStatsData,
    FeedContestRewardPrizesData,
    FeedContestRewardPrizesPayload,
    FeedContestUpdateData,
    FetchFeedContestDetailPayload,
    FetchFeedContestPodiumsPayload,
    FetchFeedContestEntriesPayload,
    FetchFeedContestLeaderboardPayload,
    FetchFeedContestPicksPayload,
    FetchFeedContestStatsPayload,
    FetchFeedContestsPayload,
    ReplaceDraftFeedContestPayload,
    ReplaceFeedContestEntryData,
    ReplaceFeedContestEntryPayload,
    UpdateFeedContestPayload,
} from "@/lib/interfaces/interfaces";

/**
 * Feed contests (/group/feed-contest/*) for BOTH surfaces — Arena and League
 * Feed. The five section lists are kept apart because each is its own server-
 * owned query (status set + sort + pagination), and the hub renders them as
 * separate sections rather than one merged list.
 */
export type FeedContestSectionState = {
    contests: FeedContest[] | null;
    loading: boolean;
    error: string | null;
    page: number;
    hasMore: boolean;
    total: number;
};

const emptySection = (): FeedContestSectionState => ({
    contests: null,
    loading: false,
    error: null,
    page: 1,
    hasMore: false,
    total: 0,
});

/**
 * The results-board slot. Same shape as a section list — it IS a paged list of
 * finalized contests — plus the group it was fetched for, because the Feed tab
 * mounts on navigation between groups and a stale board would attribute one
 * group's winners to another. Read it through the `groupId` check.
 */
export type FeedContestPodiumState = FeedContestSectionState & {
    groupId: string | null;
};

const emptyPodium = (): FeedContestPodiumState => ({
    ...emptySection(),
    groupId: null,
});

export type FeedContestState = {
    sections: Record<FeedContestSection, FeedContestSectionState>;
    /** Echoed by every list response; drives the organizer-only affordances. */
    isOrganizer: boolean;
    createLoading: boolean;
    createdContest: FeedContest | null;
    createMessage: string | null;
    createError: string | null;
    /** Separate from createLoading so the two buttons can spin independently. */
    draftLoading: boolean;
    draftedContest: FeedContest | null;
    draftMessage: string | null;
    draftError: string | null;

    /**
     * GET /detail/:contest_id. Held in its OWN slot rather than merged into the
     * section lists: the detail row carries two columns the lists drop
     * (rules_text, eligible_games_json), so writing it back over a list row
     * would make a card's shape depend on whether its detail happened to be
     * opened first. The detail screen reads only this slot.
     */
    detail: FeedContestDetailData | null;
    detailLoading: boolean;
    detailError: string | null;

    /**
     * The two organizer lifecycle writes. Kept as separate loading flags rather
     * than one shared one so a button only ever reports its OWN request — but
     * the screen disables both while either runs, since cancel and archive move
     * the same row.
     */
    cancelLoading: boolean;
    cancelMessage: string | null;
    cancelError: string | null;
    archiveLoading: boolean;
    archiveMessage: string | null;
    archiveError: string | null;

    /**
     * DELETE /delete/:contest_id — permanent, and the ONLY write here that
     * cannot be folded back into `detail`, because the row it described no
     * longer exists. Its own flags rather than the lifecycle trio above: the
     * deletion drawer awaits this outcome to decide whether to close or to keep
     * the organizer on the confirm step, so it must not observe a cancel's.
     *
     * `deletedContestId` is the receipt the screen navigates away on, and the
     * key the section lists are purged by.
     */
    deleteLoading: boolean;
    deleteMessage: string | null;
    deleteError: string | null;
    deletedContestId: string | null;
    /** Echoed so the success toast can say how many members were told. */
    deletedEntrantsNotified: number;

    /**
     * The copy edit. Kept apart from cancel/archive because it is driven from a
     * DIFFERENT screen (the edit route), which owns its own success navigation.
     */
    updateLoading: boolean;
    updateMessage: string | null;
    updateError: string | null;
    /** TRUE when the last save minted a new rules_version — entrants must re-accept. */
    updateBumpedRulesVersion: boolean;

    /**
     * PATCH /reward/:contest_id/prizes — the podium prize WORDING, and nothing
     * else. Its own slot rather than sharing `update*`: the two are driven from
     * different tabs (Settings vs the edit route) and can be in flight together,
     * and a shared error slot would report one screen's failure on the other.
     */
    rewardPrizesLoading: boolean;
    rewardPrizesMessage: string | null;
    rewardPrizesError: string | null;

    /**
     * PUT /award-reversal/:contest_id — the OWNER-ONLY whole-award audit
     * reversal. Its own slot for the same reason `rewardPrizes*` has one: it is
     * driven from the Settings tab's Award corrections panel while a copy edit
     * can be in flight from the edit route, and a shared error slot would report
     * one screen's failure on the other.
     */
    awardReversalLoading: boolean;
    awardReversalMessage: string | null;
    awardReversalError: string | null;
    /**
     * WHICH contest the outcome above belongs to. The receipt can land after the
     * screen that asked for it unmounted — the organizer hit Back while the PUT
     * was in flight — and without this the next contest detail to mount would
     * read a stranger's receipt and toast it. Same job `deletedContestId` does
     * for the delete path.
     */
    awardReversalContestId: string | null;

    /**
     * GET /entries/:contest_id — the field. Held in its own slot for the same
     * reason `detail` is: it is a different query with its own pagination, and
     * whether a row carries a `pick` at all depends on the LOCK, not on which
     * screen asked. Read through a `entries.contest.id === contestId` check.
     */
    entries: FeedContestEntriesData | null;
    entriesLoading: boolean;
    entriesError: string | null;

    /**
     * GET /leaderboard/:contest_id — the standings board. Its own slot next to
     * `entries` because it is a DIFFERENT table and a different question: that
     * one answers what everyone picked, this one where they stand. Same
     * single-tenant rule — read it through a `leaderboard.contest.id ===
     * contestId` check, because one commit showing another contest's board
     * would attribute scores to the wrong people.
     */
    leaderboard: FeedContestLeaderboardData | null;
    leaderboardLoading: boolean;
    leaderboardError: string | null;

    /**
     * GET /picks — every competitive pick across the GROUP's Feed contests, for
     * the group Feed tab. Its own slot next to `entries` because it is scoped to
     * a group rather than a contest, and a page of it mixes contests: each row
     * decides its own hidden-until-lock state.
     */
    groupPicks: FeedContestPicksData | null;
    groupPicksLoading: boolean;
    groupPicksError: string | null;

    /* GET /group/feed-contest/updates — one card per RUNNING contest in the
     * Feed tab's Updates view. A live projection, so it is re-read on mount
     * rather than mutated by any write on this slice. */
    updates: FeedContestUpdatesData | null;
    updatesLoading: boolean;
    updatesError: string | null;

    /**
     * GET /list/finalized/podium — the group's results board, for the Feed tab's
     * Winners block.
     *
     * Held APART from `sections.finalized` even though the two page the same
     * contests in the same order, because only this endpoint stamps `podium` on
     * a row. Merging them would make whether a card can draw a podium depend on
     * which of the two fetches landed last, and the Contests tab (which reads
     * `sections.finalized`) would start re-rendering whenever the Feed tab
     * refetched.
     */
    podium: FeedContestPodiumState;

    /**
     * GET /stats/:contest_id — the whole tally in one read, in its own slot for
     * the same reason `entries` is. Counts are public from the start even while
     * the picks behind them are hidden, so this can be read on a still-open
     * contest. Guard it with a `stats.contest.id === contestId` check.
     */
    stats: FeedContestStatsData | null;
    statsLoading: boolean;
    statsError: string | null;

    /**
     * The member write. `/enter` and `/replace-entry` share these flags because
     * exactly one of them applies at a time — which one is decided by whether the
     * member already has an accepted entry — and the screen shows one button.
     *
     * `/enter` is NOT idempotent: a second POST answers 409 "already entered", so
     * the button must stay disabled while `entrySubmitLoading` is true.
     */
    entrySubmitLoading: boolean;
    entrySubmitMessage: string | null;
    entrySubmitError: string | null;
    /** The accepted receipt, so the screen can render it before the refetch lands. */
    submittedEntry:
        | EnterFeedContestData
        | EnterPickemFeedContestData
        | ReplaceFeedContestEntryData
        | ReplacePickemFeedContestEntryData
        | EnterTdPsychicFeedContestData
        | ReplaceTdPsychicFeedContestEntryData
        | null;
};

/**
 * Folds a lifecycle reply into the loaded detail record. MERGE, never replace:
 * the idempotent "already canceled/archived" replies carry only a few columns,
 * and no reply carries `creator` / `participant_count` / `my_participation`,
 * which are assembled by the read endpoints.
 */
const mergeDetailContest = (
    state: FeedContestState,
    incoming: FeedContestLifecycleData["contest"] | undefined
) => {
    if (!state.detail || !incoming?.id) return;
    if (state.detail.contest.id !== incoming.id) return;
    state.detail.contest = { ...state.detail.contest, ...incoming };
};

/**
 * Drops a deleted contest from every section list. The hub renders from these
 * cached lists on the way back from the detail screen — BEFORE its own refetch
 * lands — so without this the organizer watches the contest they just deleted
 * sit there for a beat. `total` is the server's count for the section, so it is
 * decremented too, or "Show more" would promise a page that no longer exists.
 */
const removeContestFromSections = (
    state: FeedContestState,
    contestId: string
) => {
    for (const section of Object.values(state.sections)) {
        if (!section.contests) continue;
        const remaining = section.contests.filter(
            (contest) => contest.id !== contestId
        );
        if (remaining.length === section.contests.length) continue;
        const removed = section.contests.length - remaining.length;
        section.contests = remaining;
        section.total = Math.max(0, section.total - removed);
    }
};

const initialState: FeedContestState = {
    sections: {
        open: emptySection(),
        locked: emptySection(),
        finalized: emptySection(),
        drafts: emptySection(),
        archived: emptySection(),
    },
    podium: emptyPodium(),
    isOrganizer: false,
    createLoading: false,
    createdContest: null,
    createMessage: null,
    createError: null,
    draftLoading: false,
    draftedContest: null,
    draftMessage: null,
    draftError: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    cancelLoading: false,
    cancelMessage: null,
    cancelError: null,
    archiveLoading: false,
    archiveMessage: null,
    archiveError: null,
    deleteLoading: false,
    deleteMessage: null,
    deleteError: null,
    deletedContestId: null,
    deletedEntrantsNotified: 0,
    updateLoading: false,
    updateMessage: null,
    updateError: null,
    updateBumpedRulesVersion: false,
    rewardPrizesLoading: false,
    rewardPrizesMessage: null,
    rewardPrizesError: null,
    awardReversalLoading: false,
    awardReversalMessage: null,
    awardReversalError: null,
    awardReversalContestId: null,
    entries: null,
    entriesLoading: false,
    entriesError: null,
    leaderboard: null,
    leaderboardLoading: false,
    leaderboardError: null,
    groupPicks: null,
    groupPicksLoading: false,
    groupPicksError: null,
    updates: null,
    updatesLoading: false,
    updatesError: null,
    stats: null,
    statsLoading: false,
    statsError: null,
    entrySubmitLoading: false,
    entrySubmitMessage: null,
    entrySubmitError: null,
    submittedEntry: null,
};

/**
 * Folds an accepted entry back into the loaded detail, so the screen re-gates
 * itself without waiting for a re-read. The write replies carry the participant
 * row (enter) or only the pick (replace), and neither carries
 * `participant_count` — which is why this patches `my_participation` alone.
 */
const applyOwnParticipation = (
    state: FeedContestState,
    contestId: string,
    participation: FeedContest["my_participation"] | undefined
) => {
    if (!participation) return;
    if (!state.detail || state.detail.contest.id !== contestId) return;
    state.detail.contest = {
        ...state.detail.contest,
        my_participation: {
            ...(state.detail.contest.my_participation ?? {}),
            ...participation,
        },
    };
};

type SectionSuccess = { section: FeedContestSection; data: FeedContestListData };
type SectionFailure = { section: FeedContestSection; error: string };

const feedContestSlice = createSlice({
    name: "feedContest",
    initialState,
    reducers: {
        fetchFeedContestsRequest: (
            state,
            action: PayloadAction<FetchFeedContestsPayload & { section: FeedContestSection }>
        ) => {
            const section = state.sections[action.payload.section];
            section.loading = true;
            section.error = null;
        },
        fetchFeedContestsSuccess: (state, action: PayloadAction<SectionSuccess>) => {
            const { section: sectionId, data } = action.payload;
            const section = state.sections[sectionId];
            const incoming = data?.contests ?? [];
            const page = data?.pagination?.page ?? 1;

            section.loading = false;
            section.error = null;
            // Page 1 replaces; later pages append (Show more), de-duped by id so a
            // refetch that overlaps the previous window can't double a row.
            if (page <= 1) {
                section.contests = incoming;
            } else {
                const seen = new Set((section.contests ?? []).map((contest) => contest.id));
                section.contests = [
                    ...(section.contests ?? []),
                    ...incoming.filter((contest) => !seen.has(contest.id)),
                ];
            }
            section.page = page;
            section.hasMore = data?.pagination?.hasMore ?? false;
            section.total = data?.pagination?.total ?? section.contests.length;
            state.isOrganizer = data?.viewer?.is_organizer ?? state.isOrganizer;
        },
        fetchFeedContestsFailure: (state, action: PayloadAction<SectionFailure>) => {
            const section = state.sections[action.payload.section];
            section.loading = false;
            section.error = action.payload.error;
            // A 403 on /list/drafts is the expected answer for a member, not a
            // reason to keep a stale organizer-only list on screen.
            if (section.contests === null) section.contests = [];
        },

        /* ---- The results board — GET /list/finalized/podium ---- */
        fetchFeedContestPodiumsRequest: (
            state,
            action: PayloadAction<FetchFeedContestPodiumsPayload>
        ) => {
            // Switching groups CLEARS rather than keeps: the Feed tab renders
            // from this slot the moment it mounts, so carrying the previous
            // group's board through the in-flight fetch would show one
            // community another's winners for a beat.
            if (state.podium.groupId !== action.payload.group_id) {
                state.podium = emptyPodium();
            }
            state.podium.groupId = action.payload.group_id;
            state.podium.loading = true;
            state.podium.error = null;
        },
        fetchFeedContestPodiumsSuccess: (
            state,
            action: PayloadAction<{ groupId: string; data: FeedContestPodiumListData }>
        ) => {
            const { groupId, data } = action.payload;
            // A reply for a group the viewer has already navigated away from is
            // dropped, not written — takeLatest cancels the SAGA, not a response
            // already in flight when the group changed.
            if (state.podium.groupId !== groupId) return;

            const incoming = data?.contests ?? [];
            const page = data?.pagination?.page ?? 1;

            state.podium.loading = false;
            state.podium.error = null;
            // Same page-1-replaces / later-pages-append rule the section lists
            // use, de-duped by id.
            if (page <= 1) {
                state.podium.contests = incoming;
            } else {
                const seen = new Set((state.podium.contests ?? []).map((contest) => contest.id));
                state.podium.contests = [
                    ...(state.podium.contests ?? []),
                    ...incoming.filter((contest) => !seen.has(contest.id)),
                ];
            }
            state.podium.page = page;
            state.podium.hasMore = data?.pagination?.hasMore ?? false;
            state.podium.total = data?.pagination?.total ?? state.podium.contests.length;
            state.isOrganizer = data?.viewer?.is_organizer ?? state.isOrganizer;
        },
        fetchFeedContestPodiumsFailure: (
            state,
            action: PayloadAction<{ groupId: string; error: string }>
        ) => {
            if (state.podium.groupId !== action.payload.groupId) return;
            state.podium.loading = false;
            state.podium.error = action.payload.error;
            // Settled to [] so the block renders "nothing yet" rather than
            // holding its skeleton open forever.
            if (state.podium.contests === null) state.podium.contests = [];
        },

        createFeedContestRequest: (state, action: PayloadAction<CreateFeedContestPayload>) => {
            void action;
            state.createLoading = true;
            state.createError = null;
            state.createMessage = null;
        },
        createFeedContestSuccess: (
            state,
            action: PayloadAction<{ contest: FeedContest | null; message?: string }>
        ) => {
            state.createLoading = false;
            state.createdContest = action.payload.contest;
            state.createMessage = action.payload.message ?? "Feed contest created.";
        },
        createFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.createLoading = false;
            state.createError = action.payload;
        },

        createDraftFeedContestRequest: (
            state,
            action: PayloadAction<CreateFeedContestPayload>
        ) => {
            void action;
            state.draftLoading = true;
            state.draftError = null;
            state.draftMessage = null;
        },
        createDraftFeedContestSuccess: (
            state,
            action: PayloadAction<{ contest: FeedContest | null; message?: string }>
        ) => {
            state.draftLoading = false;
            state.draftedContest = action.payload.contest;
            state.draftMessage = action.payload.message ?? "Feed contest draft saved.";
        },
        createDraftFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.draftLoading = false;
            state.draftError = action.payload;
        },

        /* --------------------------------------------------------------------
         * Reopening a saved draft in the wizard — PUT /replace-draft/:contest_id,
         * a whole-row replacement taking the same body as /create-draft.
         *
         * Reduced into the SAME slots the create path uses, deliberately: the
         * wizard reads `draftLoading`/`draftedContest`/`draftMessage` for its
         * spinner, its toast and its post-save navigation, and reusing them means
         * that whole terminal path works for an edit without a second copy of it.
         * ------------------------------------------------------------------ */
        replaceDraftFeedContestRequest: (
            state,
            action: PayloadAction<ReplaceDraftFeedContestPayload>
        ) => {
            void action;
            state.draftLoading = true;
            state.draftError = null;
            state.draftMessage = null;
        },
        replaceDraftFeedContestSuccess: (
            state,
            action: PayloadAction<{ contest: FeedContest | null; message?: string }>
        ) => {
            state.draftLoading = false;
            state.draftedContest = action.payload.contest;
            state.draftMessage = action.payload.message ?? "Feed contest draft saved.";
        },
        replaceDraftFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.draftLoading = false;
            state.draftError = action.payload;
        },

        /**
         * Publishing an edited draft. Reduced into the CREATE slots for the same
         * reason as above — publishing is what `/create` does, and the wizard
         * already labels that button from `createLoading`.
         */
        publishDraftFeedContestRequest: (
            state,
            action: PayloadAction<ReplaceDraftFeedContestPayload>
        ) => {
            void action;
            state.createLoading = true;
            state.createError = null;
            state.createMessage = null;
        },
        publishDraftFeedContestSuccess: (
            state,
            action: PayloadAction<{ contest: FeedContest | null; message?: string }>
        ) => {
            state.createLoading = false;
            state.createdContest = action.payload.contest;
            state.createMessage = action.payload.message ?? "Feed contest published.";
        },
        publishDraftFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.createLoading = false;
            state.createError = action.payload;
        },

        fetchFeedContestDetailRequest: (
            state,
            action: PayloadAction<FetchFeedContestDetailPayload>
        ) => {
            // The previously-read contest is dropped at REQUEST time, not on
            // success: this slot is single-tenant, and leaving the old row in
            // place would let the detail screen render another contest's name,
            // slate and rules for one commit after navigating between two.
            if (state.detail?.contest?.id !== action.payload.contest_id) {
                state.detail = null;
            }
            state.detailLoading = true;
            state.detailError = null;
        },
        fetchFeedContestDetailSuccess: (
            state,
            action: PayloadAction<FeedContestDetailData>
        ) => {
            state.detailLoading = false;
            state.detailError = null;
            state.detail = action.payload;
        },
        fetchFeedContestDetailFailure: (state, action: PayloadAction<string>) => {
            state.detailLoading = false;
            state.detailError = action.payload;
            state.detail = null;
        },
        /** Dropped when the detail screen unmounts. */
        clearFeedContestDetail: (state) => {
            state.detail = null;
            state.detailLoading = false;
            state.detailError = null;
            state.cancelLoading = false;
            state.cancelMessage = null;
            state.cancelError = null;
            state.archiveLoading = false;
            state.archiveMessage = null;
            state.archiveError = null;
            // Also dropped here for the case the screen leaves WITHOUT deleting:
            // a reply that lands after the organizer navigated away has nobody
            // to report to, and its receipt must not outlive the screen.
            state.deleteLoading = false;
            state.deleteMessage = null;
            state.deleteError = null;
            state.deletedContestId = null;
            state.deletedEntrantsNotified = 0;
            state.updateLoading = false;
            state.updateMessage = null;
            state.updateError = null;
            state.updateBumpedRulesVersion = false;
        },

        cancelFeedContestRequest: (
            state,
            action: PayloadAction<FeedContestLifecycleActionPayload>
        ) => {
            void action;
            state.cancelLoading = true;
            state.cancelMessage = null;
            state.cancelError = null;
        },
        cancelFeedContestSuccess: (
            state,
            action: PayloadAction<{ data: FeedContestLifecycleData | null; message?: string }>
        ) => {
            state.cancelLoading = false;
            state.cancelMessage = action.payload.message ?? "Contest canceled.";
            mergeDetailContest(state, action.payload.data?.contest);
        },
        cancelFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.cancelLoading = false;
            state.cancelError = action.payload;
        },

        archiveFeedContestRequest: (
            state,
            action: PayloadAction<FeedContestLifecycleActionPayload>
        ) => {
            void action;
            state.archiveLoading = true;
            state.archiveMessage = null;
            state.archiveError = null;
        },
        archiveFeedContestSuccess: (
            state,
            action: PayloadAction<{ data: FeedContestLifecycleData | null; message?: string }>
        ) => {
            state.archiveLoading = false;
            state.archiveMessage = action.payload.message ?? "Contest archived.";
            mergeDetailContest(state, action.payload.data?.contest);
        },
        archiveFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.archiveLoading = false;
            state.archiveError = action.payload;
        },

        /** Cleared once the screen has reported the outcome, so it toasts once. */
        clearFeedContestLifecycleMessage: (state) => {
            state.cancelMessage = null;
            state.cancelError = null;
            state.archiveMessage = null;
            state.archiveError = null;
        },

        /* --------------------------------------------------------------------
         * DELETE /delete/:contest_id — permanent. Unlike cancel and archive
         * there is no updated row to merge: the contest is gone, so the reply
         * only identifies what was removed.
         * ------------------------------------------------------------------ */
        deleteFeedContestRequest: (
            state,
            action: PayloadAction<DeleteFeedContestPayload>
        ) => {
            void action;
            state.deleteLoading = true;
            state.deleteMessage = null;
            state.deleteError = null;
            // Cleared so the screen's outcome effect cannot read a PREVIOUS
            // delete's receipt as this one's and navigate away early.
            state.deletedContestId = null;
            state.deletedEntrantsNotified = 0;
        },
        deleteFeedContestSuccess: (
            state,
            action: PayloadAction<{
                /** Echoed from the request — the reply's own id is preferred. */
                contest_id: string;
                data: DeleteFeedContestData | null;
                message?: string;
            }>
        ) => {
            const contestId =
                action.payload.data?.contest_id ?? action.payload.contest_id;
            state.deleteLoading = false;
            state.deleteMessage = action.payload.message ?? "Contest deleted.";
            state.deletedContestId = contestId;
            state.deletedEntrantsNotified =
                action.payload.data?.entrants_notified ?? 0;
            removeContestFromSections(state, contestId);
            // `detail` / `entries` / `stats` are deliberately NOT cleared here.
            // The detail screen navigates away on this receipt and its unmount
            // already drops all three; blanking them now would only swap the
            // contest for a loading skeleton for the frame before it routes.
        },
        deleteFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.deleteLoading = false;
            state.deleteError = action.payload;
        },
        /** Cleared once the screen has reported the outcome, so it toasts once. */
        clearFeedContestDeleteState: (state) => {
            state.deleteLoading = false;
            state.deleteMessage = null;
            state.deleteError = null;
            state.deletedContestId = null;
            state.deletedEntrantsNotified = 0;
        },

        updateFeedContestRequest: (
            state,
            action: PayloadAction<UpdateFeedContestPayload>
        ) => {
            void action;
            state.updateLoading = true;
            state.updateMessage = null;
            state.updateError = null;
            state.updateBumpedRulesVersion = false;
        },
        updateFeedContestSuccess: (
            state,
            action: PayloadAction<{ data: FeedContestUpdateData | null; message?: string }>
        ) => {
            state.updateLoading = false;
            state.updateMessage = action.payload.message ?? "Contest updated.";
            state.updateBumpedRulesVersion = Boolean(
                action.payload.data?.rules_version_changed
            );
            mergeDetailContest(state, action.payload.data?.contest);
        },
        updateFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.updateLoading = false;
            state.updateError = action.payload;
        },
        clearFeedContestUpdateState: (state) => {
            state.updateLoading = false;
            state.updateMessage = null;
            state.updateError = null;
            state.updateBumpedRulesVersion = false;
        },

        /* --------------------------------------------------------------------
         * PATCH /reward/:contest_id/prizes — the podium prize wording.
         * ------------------------------------------------------------------ */
        updateFeedContestRewardPrizesRequest: (
            state,
            action: PayloadAction<FeedContestRewardPrizesPayload>
        ) => {
            void action;
            state.rewardPrizesLoading = true;
            state.rewardPrizesMessage = null;
            state.rewardPrizesError = null;
        },
        updateFeedContestRewardPrizesSuccess: (
            state,
            action: PayloadAction<{
                contest_id: string;
                data: FeedContestRewardPrizesData | null;
                message?: string;
            }>
        ) => {
            state.rewardPrizesLoading = false;
            state.rewardPrizesMessage = action.payload.message ?? "Contest prizes updated.";
            /*
             * Patched into the detail slot rather than left for a refetch, so the
             * Settings tab shows the corrected wording the moment it saves.
             *
             * Guarded on the id for the same reason every other write is: this
             * slot is single-tenant and survives navigation between contests.
             * `reward_awards` is deliberately NOT touched — an award froze its
             * own copy of the wording when the contest finalized, and a
             * correction made afterwards must not change what an
             * already-announced winner appears to have won.
             */
            const reward = action.payload.data?.reward;
            if (
                reward &&
                state.detail &&
                state.detail.contest.id === action.payload.contest_id
            ) {
                state.detail.reward = reward;
            }
        },
        updateFeedContestRewardPrizesFailure: (state, action: PayloadAction<string>) => {
            state.rewardPrizesLoading = false;
            state.rewardPrizesError = action.payload;
        },
        clearFeedContestRewardPrizesState: (state) => {
            state.rewardPrizesLoading = false;
            state.rewardPrizesMessage = null;
            state.rewardPrizesError = null;
        },

        /* --------------------------------------------------------------------
         * PUT /award-reversal/:contest_id — the OWNER-ONLY whole-award audit
         * reversal.
         *
         * The reply carries seven columns of the standing and NOTHING else — no
         * contest_id, no member embed — so the saga echoes `contest_id` and
         * `user_id` back from the request. The first is what makes the patch
         * below single-tenant; the second is what still finds the row when the
         * board was paged and the reply's `id` is all there is to match on.
         * ------------------------------------------------------------------ */
        reverseFeedContestAwardRequest: (
            state,
            action: PayloadAction<FeedContestAwardReversalPayload>
        ) => {
            state.awardReversalLoading = true;
            state.awardReversalMessage = null;
            state.awardReversalError = null;
            // Stamped at REQUEST time so a FAILURE, which carries no contest of
            // its own, is still attributable to the contest that asked for it.
            state.awardReversalContestId = action.payload.contest_id;
        },
        reverseFeedContestAwardSuccess: (
            state,
            action: PayloadAction<{
                contest_id: string;
                user_id: string;
                data: FeedContestAwardReversalData | null;
                message?: string;
            }>
        ) => {
            state.awardReversalLoading = false;
            state.awardReversalError = null;
            state.awardReversalMessage =
                action.payload.message ??
                "The confirmed award was reversed with an audit record.";
            state.awardReversalContestId = action.payload.contest_id;

            const standing = action.payload.data?.standing;
            // Single-tenant, like every other slot here: a receipt for a contest
            // the organizer has already navigated away from is DROPPED rather
            // than written over the board now on screen.
            if (
                !standing ||
                !state.leaderboard ||
                state.leaderboard.contest.id !== action.payload.contest_id
            ) {
                return;
            }
            /*
             * MERGE, never replace. The reply is seven columns; the row on the
             * board also carries the member embed, the entry, the achievement
             * and the odds, and rebuilding it from the reply would blank all
             * four. `contest_points` is taken from the reply but is the SAME
             * number — the server does not move it, because the board renders
             * the won figure struck through beside the reason.
             */
            const patch = (row: FeedContestStandingRow): FeedContestStandingRow =>
                row.id === standing.id
                    ? {
                        ...row,
                        rank: standing.rank ?? row.rank,
                        contest_points: standing.contest_points ?? row.contest_points,
                        is_points_reverse: standing.is_points_reverse,
                        points_reverse_reason: standing.points_reverse_reason,
                        points_reversed_at: standing.points_reversed_at,
                    }
                    : row;
            state.leaderboard.standings = state.leaderboard.standings.map(patch);
            if (state.leaderboard.my_standing) {
                state.leaderboard.my_standing = patch(state.leaderboard.my_standing);
            }
        },
        reverseFeedContestAwardFailure: (state, action: PayloadAction<string>) => {
            state.awardReversalLoading = false;
            state.awardReversalError = action.payload;
        },
        /** Cleared once the screen has reported the outcome, so it toasts once. */
        clearFeedContestAwardReversalState: (state) => {
            state.awardReversalLoading = false;
            state.awardReversalMessage = null;
            state.awardReversalError = null;
            state.awardReversalContestId = null;
        },

        /* --------------------------------------------------------------------
         * The field — GET /group/feed-contest/entries/:contest_id.
         * ------------------------------------------------------------------ */
        fetchFeedContestEntriesRequest: (
            state,
            action: PayloadAction<FetchFeedContestEntriesPayload>
        ) => {
            // Dropped at REQUEST time on an id mismatch, exactly as `detail` is:
            // this slot is single-tenant and one commit showing another
            // contest's field would leak who entered what.
            if (state.entries?.contest?.id !== action.payload.contest_id) {
                state.entries = null;
            }
            state.entriesLoading = true;
            state.entriesError = null;
        },
        fetchFeedContestEntriesSuccess: (
            state,
            action: PayloadAction<FeedContestEntriesData>
        ) => {
            const incoming = action.payload;
            const page = incoming?.pagination?.page ?? 1;

            state.entriesLoading = false;
            state.entriesError = null;

            // Page 1 replaces; later pages append (Show more), de-duped by pick
            // id so a refetch overlapping the previous window cannot double a row.
            if (page <= 1 || !state.entries || state.entries.contest.id !== incoming.contest.id) {
                state.entries = incoming;
                return;
            }
            const seen = new Set(state.entries.entries.map((row) => row.id));
            state.entries = {
                ...incoming,
                entries: [
                    ...state.entries.entries,
                    ...incoming.entries.filter((row) => !seen.has(row.id)),
                ],
            };
        },
        fetchFeedContestEntriesFailure: (state, action: PayloadAction<string>) => {
            state.entriesLoading = false;
            state.entriesError = action.payload;
            state.entries = null;
        },

        /* --------------------------------------------------------------------
         * The standings — GET /group/feed-contest/leaderboard/:contest_id.
         * Paginated the same way the field is, and dropped on the same
         * single-tenant id check.
         * ------------------------------------------------------------------ */
        fetchFeedContestLeaderboardRequest: (
            state,
            action: PayloadAction<FetchFeedContestLeaderboardPayload>
        ) => {
            if (state.leaderboard?.contest?.id !== action.payload.contest_id) {
                state.leaderboard = null;
            }
            state.leaderboardLoading = true;
            state.leaderboardError = null;
        },
        fetchFeedContestLeaderboardSuccess: (
            state,
            action: PayloadAction<FeedContestLeaderboardData>
        ) => {
            const incoming = action.payload;
            const page = incoming?.pagination?.page ?? 1;

            state.leaderboardLoading = false;
            state.leaderboardError = null;

            // Page 1 replaces; later pages append (Show more), de-duped by the
            // contest_leaderboard row id so a refetch overlapping the previous
            // window cannot list the same member twice. `my_standing` and the
            // reveal flags always come from the NEWEST reply, since a later page
            // can land after the contest locked.
            if (
                page <= 1 ||
                !state.leaderboard ||
                state.leaderboard.contest.id !== incoming.contest.id
            ) {
                state.leaderboard = incoming;
                return;
            }
            const seen = new Set(state.leaderboard.standings.map((row) => row.id));
            state.leaderboard = {
                ...incoming,
                standings: [
                    ...state.leaderboard.standings,
                    ...incoming.standings.filter((row) => !seen.has(row.id)),
                ],
            };
        },
        fetchFeedContestLeaderboardFailure: (state, action: PayloadAction<string>) => {
            state.leaderboardLoading = false;
            state.leaderboardError = action.payload;
            state.leaderboard = null;
        },
        /** Dropped when the detail screen unmounts, like `entries` and `stats`. */
        clearFeedContestLeaderboard: (state) => {
            state.leaderboard = null;
            state.leaderboardLoading = false;
            state.leaderboardError = null;
        },

        /* --------------------------------------------------------------------
         * The group's competitive picks — GET /group/feed-contest/picks.
         * ------------------------------------------------------------------ */
        fetchFeedContestPicksRequest: (
            state,
            action: PayloadAction<FetchFeedContestPicksPayload>
        ) => {
            // Single-tenant, like every other slot here: switching groups drops
            // the previous one's rows at REQUEST time, so a League feed can never
            // paint an Arena's entries during the in-flight window.
            if (state.groupPicks && state.groupPicks.group.id !== action.payload.group_id) {
                state.groupPicks = null;
            }
            state.groupPicksLoading = true;
            state.groupPicksError = null;
        },
        fetchFeedContestPicksSuccess: (
            state,
            action: PayloadAction<FeedContestPicksData>
        ) => {
            const incoming = action.payload;
            const page = incoming?.pagination?.page ?? 1;

            state.groupPicksLoading = false;
            state.groupPicksError = null;

            if (page <= 1 || !state.groupPicks || state.groupPicks.group.id !== incoming.group.id) {
                state.groupPicks = incoming;
                return;
            }
            const seen = new Set(state.groupPicks.picks.map((row) => row.id));
            state.groupPicks = {
                ...incoming,
                picks: [
                    ...state.groupPicks.picks,
                    ...incoming.picks.filter((row) => !seen.has(row.id)),
                ],
            };
        },
        fetchFeedContestPicksFailure: (state, action: PayloadAction<string>) => {
            state.groupPicksLoading = false;
            state.groupPicksError = action.payload;
            state.groupPicks = null;
        },

        /* ---- Contest updates — the Feed tab's Updates view -----------------
         *
         * Page 1 REPLACES rather than merging, unlike the picks feed above.
         * These cards are a live projection of the running contests: a contest
         * that locked, finalized or was canceled since the last read must
         * disappear, and merging would keep it on screen forever. Later pages
         * append, de-duped on the row id.
         * ------------------------------------------------------------------ */
        fetchFeedContestUpdatesRequest: (
            state,
            action: PayloadAction<FetchFeedContestUpdatesPayload>
        ) => {
            state.updatesLoading = true;
            state.updatesError = null;
            // Drop another group's cards before the new ones land, the same
            // guard groupPicks applies — this slice is single-tenant.
            if (state.updates && state.updates.group.id !== action.payload.group_id) {
                state.updates = null;
            }
        },
        fetchFeedContestUpdatesSuccess: (
            state,
            action: PayloadAction<FeedContestUpdatesData>
        ) => {
            const incoming = action.payload;
            const page = incoming?.pagination?.page ?? 1;

            state.updatesLoading = false;
            state.updatesError = null;

            if (page <= 1 || !state.updates || state.updates.group.id !== incoming.group.id) {
                state.updates = incoming;
                return;
            }
            const seen = new Set(state.updates.updates.map((row) => row.id));
            state.updates = {
                ...incoming,
                updates: [
                    ...state.updates.updates,
                    ...incoming.updates.filter((row) => !seen.has(row.id)),
                ],
            };
        },
        fetchFeedContestUpdatesFailure: (state, action: PayloadAction<string>) => {
            state.updatesLoading = false;
            state.updatesError = action.payload;
        },
        clearFeedContestUpdates: (state) => {
            state.updates = null;
            state.updatesLoading = false;
            state.updatesError = null;
        },
        clearFeedContestPicks: (state) => {
            state.groupPicks = null;
            state.groupPicksLoading = false;
            state.groupPicksError = null;
        },

        /* --------------------------------------------------------------------
         * The tally — GET /group/feed-contest/stats/:contest_id.
         * ------------------------------------------------------------------ */
        fetchFeedContestStatsRequest: (
            state,
            action: PayloadAction<FetchFeedContestStatsPayload>
        ) => {
            // Same single-tenant guard as `detail` and `entries`: one commit
            // showing another contest's numbers would misreport this dashboard.
            if (state.stats?.contest?.id !== action.payload.contest_id) {
                state.stats = null;
            }
            state.statsLoading = true;
            state.statsError = null;
        },
        fetchFeedContestStatsSuccess: (
            state,
            action: PayloadAction<FeedContestStatsData>
        ) => {
            state.statsLoading = false;
            state.statsError = null;
            state.stats = action.payload;
        },
        fetchFeedContestStatsFailure: (state, action: PayloadAction<string>) => {
            state.statsLoading = false;
            state.statsError = action.payload;
            state.stats = null;
        },

        /* --------------------------------------------------------------------
         * The member write. `/enter` joins AND submits in one call; once an entry
         * exists `/replace-entry` swaps it in place. They share one set of flags
         * because exactly one applies at any moment.
         * ------------------------------------------------------------------ */
        enterFeedContestRequest: (state, action: PayloadAction<EnterFeedContestPayload>) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        /**
         * The Sunday Pick'em card. A SEPARATE endpoint
         * (`POST /enter-pickem/:contest_id`) rather than a mode of `/enter`,
         * which refuses a `pickem_card` contest — so it needs its own request
         * action. It deliberately shares the success/failure reducers and the
         * one flag set below: exactly one entry write is ever in flight, and the
         * entry screen's receipt reads the same slot either way.
         */
        enterPickemFeedContestRequest: (
            state,
            action: PayloadAction<EnterPickemFeedContestPayload>
        ) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        /**
         * The TD Psychic card — POST /enter-td-psychic/:contest_id, the THIRD
         * entry endpoint. Its own request action for the same reason the other
         * two have theirs: each endpoint refuses the other models' contests by
         * name, so the choice is enforced server-side and cannot be a mode flag.
         *
         * Shares the success/failure reducers and the one flag set: exactly one
         * entry write is ever in flight, and the entry screen reads the same
         * slot whichever model wrote it.
         */
        enterTdPsychicFeedContestRequest: (
            state,
            action: PayloadAction<EnterTdPsychicFeedContestPayload>
        ) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        enterFeedContestSuccess: (
            state,
            action: PayloadAction<{
                data:
                    | EnterFeedContestData
                    | EnterPickemFeedContestData
                    | EnterTdPsychicFeedContestData
                    | null;
                message?: string;
            }>
        ) => {
            state.entrySubmitLoading = false;
            state.entrySubmitMessage =
                action.payload.message ?? "Joined the contest and submitted your entry.";
            state.submittedEntry = action.payload.data;
            const data = action.payload.data;
            if (data?.contest?.id) {
                applyOwnParticipation(state, data.contest.id, data.participant);
            }
        },
        enterFeedContestFailure: (state, action: PayloadAction<string>) => {
            state.entrySubmitLoading = false;
            state.entrySubmitError = action.payload;
        },

        replaceFeedContestEntryRequest: (
            state,
            action: PayloadAction<ReplaceFeedContestEntryPayload>
        ) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        /**
         * The Sunday Pick'em swap — `PUT /replace-pickem-entry/:contest_id`.
         *
         * Its own request action for the same reason entering has one: the combo
         * replace endpoint refuses a `pickem_card` contest by name. Success and
         * failure are shared, because exactly one entry write is ever in flight
         * and the screen reports them from one place.
         */
        replacePickemFeedContestEntryRequest: (
            state,
            action: PayloadAction<ReplacePickemFeedContestEntryPayload>
        ) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        /**
         * The TD Psychic swap — PUT /replace-td-psychic-entry/:contest_id.
         *
         * Refused by the server once the card carries lock prices, which is a
         * stricter gate than either sibling's: a priced card is past the shared
         * cutoff whatever its contest's status column says, and re-pricing one
         * member's card after the capture would break the one guarantee this
         * template rests on.
         */
        replaceTdPsychicFeedContestEntryRequest: (
            state,
            action: PayloadAction<ReplaceTdPsychicFeedContestEntryPayload>
        ) => {
            void action;
            state.entrySubmitLoading = true;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },
        replaceFeedContestEntrySuccess: (
            state,
            action: PayloadAction<{
                data:
                    | ReplaceFeedContestEntryData
                    | ReplacePickemFeedContestEntryData
                    | ReplaceTdPsychicFeedContestEntryData
                    | null;
                message?: string;
            }>
        ) => {
            state.entrySubmitLoading = false;
            state.entrySubmitMessage = action.payload.message ?? "Entry replaced.";
            state.submittedEntry = action.payload.data;
        },
        replaceFeedContestEntryFailure: (state, action: PayloadAction<string>) => {
            state.entrySubmitLoading = false;
            state.entrySubmitError = action.payload;
        },

        /** Cleared once the screen has reported the outcome, so it toasts once. */
        clearFeedContestEntryMessage: (state) => {
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
        },

        /** Dropped when the entry screen unmounts. */
        clearFeedContestEntries: (state) => {
            state.entries = null;
            state.entriesLoading = false;
            state.entriesError = null;
            state.entrySubmitLoading = false;
            state.entrySubmitMessage = null;
            state.entrySubmitError = null;
            state.submittedEntry = null;
        },

        clearFeedContestStats: (state) => {
            state.stats = null;
            state.statsLoading = false;
            state.statsError = null;
        },

        clearCreateFeedContestState: (state) => {
            state.createLoading = false;
            state.createdContest = null;
            state.createMessage = null;
            state.createError = null;
            state.draftLoading = false;
            state.draftedContest = null;
            state.draftMessage = null;
            state.draftError = null;
        },
        /** Dropped when the hub unmounts so another group can't read these rows. */
        resetFeedContests: () => initialState,
    },
});

export const {
    fetchFeedContestsRequest,
    fetchFeedContestsSuccess,
    fetchFeedContestsFailure,
    fetchFeedContestPodiumsRequest,
    fetchFeedContestPodiumsSuccess,
    fetchFeedContestPodiumsFailure,
    createFeedContestRequest,
    createFeedContestSuccess,
    createFeedContestFailure,
    createDraftFeedContestRequest,
    createDraftFeedContestSuccess,
    createDraftFeedContestFailure,
    replaceDraftFeedContestRequest,
    replaceDraftFeedContestSuccess,
    replaceDraftFeedContestFailure,
    publishDraftFeedContestRequest,
    publishDraftFeedContestSuccess,
    publishDraftFeedContestFailure,
    fetchFeedContestDetailRequest,
    fetchFeedContestDetailSuccess,
    fetchFeedContestDetailFailure,
    clearFeedContestDetail,
    cancelFeedContestRequest,
    cancelFeedContestSuccess,
    cancelFeedContestFailure,
    archiveFeedContestRequest,
    archiveFeedContestSuccess,
    archiveFeedContestFailure,
    deleteFeedContestRequest,
    deleteFeedContestSuccess,
    deleteFeedContestFailure,
    clearFeedContestDeleteState,
    clearFeedContestLifecycleMessage,
    updateFeedContestRequest,
    updateFeedContestSuccess,
    updateFeedContestFailure,
    clearFeedContestUpdateState,
    updateFeedContestRewardPrizesRequest,
    updateFeedContestRewardPrizesSuccess,
    updateFeedContestRewardPrizesFailure,
    clearFeedContestRewardPrizesState,
    reverseFeedContestAwardRequest,
    reverseFeedContestAwardSuccess,
    reverseFeedContestAwardFailure,
    clearFeedContestAwardReversalState,
    fetchFeedContestEntriesRequest,
    fetchFeedContestEntriesSuccess,
    fetchFeedContestEntriesFailure,
    fetchFeedContestLeaderboardRequest,
    fetchFeedContestLeaderboardSuccess,
    fetchFeedContestLeaderboardFailure,
    clearFeedContestLeaderboard,
    fetchFeedContestPicksRequest,
    fetchFeedContestPicksSuccess,
    fetchFeedContestPicksFailure,
    fetchFeedContestUpdatesRequest,
    fetchFeedContestUpdatesSuccess,
    fetchFeedContestUpdatesFailure,
    clearFeedContestUpdates,
    clearFeedContestPicks,
    fetchFeedContestStatsRequest,
    fetchFeedContestStatsSuccess,
    fetchFeedContestStatsFailure,
    clearFeedContestStats,
    enterFeedContestRequest,
    enterPickemFeedContestRequest,
    enterTdPsychicFeedContestRequest,
    enterFeedContestSuccess,
    enterFeedContestFailure,
    replaceFeedContestEntryRequest,
    replacePickemFeedContestEntryRequest,
    replaceTdPsychicFeedContestEntryRequest,
    replaceFeedContestEntrySuccess,
    replaceFeedContestEntryFailure,
    clearFeedContestEntryMessage,
    clearFeedContestEntries,
    clearCreateFeedContestState,
    resetFeedContests,
} = feedContestSlice.actions;

export default feedContestSlice.reducer;
