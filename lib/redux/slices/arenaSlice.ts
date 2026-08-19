import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { mergeGroupPage } from "@/lib/groups/pagination";
import type {
    ActivateArenaHostingPayload,
    AdvanceArenaContestPayload,
    ArenaContest,
    ArenaContestDetailResponse,
    ArenaContestParticipant,
    ArenaCommunityPick,
    ArenaContestPick,
    DeleteCommunityPickPayload,
    FetchArenaContestDetailPayload,
    FetchArenaContestPicksPayload,
    FetchCommunityPicksPayload,
    FetchJoinedOpenContestsPayload,
    JoinArenaContestPayload,
    JoinedOpenArenaContest,
    SubmitArenaContestEntryPayload,
    UpdateCommunityPickPayload,
    UpdateCompetitivePickPayload,
    ArenaHostingActionResponse,
    ArenaHostingDetailsPayload,
    ArenaPausePayload,
    ConfirmArenaDeletePayload,
    InitiateArenaDeletePayload,
    LeaveArenaPayload,
    ArenaGuideStatusData,
    FetchArenaGuideStatusPayload,
    MarkArenaGuideViewedData,
    MarkArenaGuideViewedPayload,
    ArenaHostingDetailsResponse,
    OwnedArenaHostingPayload,
    OwnedArenaHostingResponse,
    ArenaSubscriptionResponse,
    ArenaCheckoutPayload,
    ArenaCheckoutStatusResponse,
    ChangeArenaPlanPayload,
    ArenaBillingActionResponse,
    ArenaInvoice,
    FetchArenaInvoicesPayload,
    ArenaMemberActionPayload,
    ArenaOwnershipTransfer,
    ArenaOwnershipTransferResponse,
    ArenaState,
    ArenaStaffPick,
    CommunityGroupsPage,
    InviteCodePayload,
    JoinCommunityFailurePayload,
    JoinedCommunity,
    CancelArenaOwnershipTransferPayload,
    CreateArenaContestPayload,
    CreateArenaOwnershipTransferPayload,
    CreateCommunityPickPayload,
    CreateStaffAnnouncementPayload,
    CreateStaffPickPayload,
    Pick,
    DeleteStaffAnnouncementPayload,
    DeleteStaffPickPayload,
    EditStaffAnnouncementPayload,
    PinStaffAnnouncementPayload,
    FetchArenaContestsPayload,
    FetchArenaOwnershipTransferPayload,
    FetchMyGroupsPayload,
    FetchStaffAnnouncementPayload,
    FetchStaffPickPayload,
    GroupObject,
    RespondArenaOwnershipTransferPayload,
    StaffAnnouncement,
    UpdateArenaDetailsPayload,
} from "@/lib/interfaces/interfaces";

const initialState: ArenaState = {
    hosting: null,
    unlock: null,
    availableTiers: [],
    arenaContests: [],
    hostingForId: null,
    arenaContestsForId: null,
    loading: false,
    error: null,
    message: null,
    guide: null,
    guideForId: null,
    guideLoading: false,
    guideError: null,
    guideAckLoading: false,
    guideAckError: null,
    ownedHosting: [],
    ownedHostingHasMore: false,
    ownedHostingLoading: false,
    ownedHostingError: null,
    createContestLoading: false,
    createdContest: null,
    createContestError: null,
    createContestMessage: null,
    contestDetail: null,
    contestDetailArena: null,
    contestParticipantCount: 0,
    contestMyParticipation: null,
    contestDetailLoading: false,
    contestDetailError: null,
    advanceContestLoading: false,
    advanceContestError: null,
    advanceContestMessage: null,
    joinContestLoading: false,
    joinContestError: null,
    joinContestMessage: null,
    staffAnnouncements: [],
    staffAnnouncementsLoading: false,
    staffAnnouncementsError: null,
    staffAnnouncementsPage: 1,
    staffAnnouncementsHasMore: false,
    createAnnouncementLoading: false,
    createdAnnouncement: null,
    createAnnouncementError: null,
    createAnnouncementMessage: null,
    deleteAnnouncementLoadingId: null,
    deleteAnnouncementError: null,
    deleteAnnouncementMessage: null,
    editAnnouncementLoadingId: null,
    editAnnouncementError: null,
    editAnnouncementMessage: null,
    pinAnnouncementLoadingId: null,
    pinAnnouncementError: null,
    pinAnnouncementMessage: null,
    staffPicks: [],
    staffPicksLoading: false,
    staffPicksError: null,
    staffPicksPage: 1,
    staffPicksHasMore: false,
    createStaffPickLoading: false,
    createdStaffPick: null,
    createStaffPickError: null,
    createStaffPickMessage: null,
    createCommunityPickLoading: false,
    createdCommunityPick: null,
    createCommunityPickError: null,
    createCommunityPickMessage: null,
    communityPicks: [],
    communityPicksLoading: false,
    communityPicksError: null,
    communityPicksPage: 1,
    communityPicksHasMore: false,
    updateCommunityPickLoading: false,
    updatedCommunityPick: null,
    updateCommunityPickError: null,
    updateCommunityPickMessage: null,
    deleteCommunityPickLoadingId: null,
    deleteCommunityPickError: null,
    deleteCommunityPickMessage: null,
    joinedOpenContests: [],
    joinedOpenContestsLoading: false,
    joinedOpenContestsError: null,
    submitEntryLoading: false,
    submittedEntryPick: null,
    submitEntryError: null,
    submitEntryMessage: null,
    replaceEntryLoading: false,
    replacedEntryPick: null,
    replaceEntryError: null,
    replaceEntryMessage: null,
    openContestPicks: [],
    openContestPicksLoading: false,
    openContestPicksError: null,
    openContestPicksPage: 1,
    openContestPicksHasMore: false,
    closedContestPicks: [],
    closedContestPicksLoading: false,
    closedContestPicksError: null,
    closedContestPicksPage: 1,
    closedContestPicksHasMore: false,
    deleteStaffPickLoadingId: null,
    deleteStaffPickError: null,
    deleteStaffPickMessage: null,
    unlockLoading: false,
    unlockError: null,
    unlockMessage: null,
    memberActionLoading: false,
    memberActionUserId: null,
    memberActionError: null,
    memberActionMessage: null,
    transfer: null,
    canRespondToTransfer: false,
    canCancelTransfer: false,
    transferLoading: false,
    transferActionLoading: false,
    transferError: null,
    transferMessage: null,
    updateLoading: false,
    updateError: null,
    updateMessage: null,
    hostingActionLoading: false,
    hostingActionError: null,
    hostingActionMessage: null,
    hostingActionTier: null,
    arenaDeleteLoading: false,
    arenaDeleteOtpSent: false,
    arenaDeleted: false,
    arenaDeleteError: null,
    arenaDeleteMessage: null,
    leaveArenaLoading: false,
    arenaLeft: false,
    leaveArenaError: null,
    leaveArenaMessage: null,
    arenaGroups: null,
    arenaGroupsLoading: false,
    arenaGroupsError: null,
    arenaGroupsHasMore: false,
    ownedArenas: null,
    ownedArenasLoading: false,
    ownedArenasError: null,
    ownedArenasHasMore: false,
    ownedArenasTotal: 0,
    joinedArenas: null,
    joinedArenasLoading: false,
    joinedArenasError: null,
    joinedArenasHasMore: false,
    joinedArenasTotal: 0,
    joinArenaLoading: false,
    joinArenaError: null,
    joinArenaMessage: null,
    joinArenaCrossType: false,
    joinArenaNotFound: false,
    joinedArena: null,
    subscription: null,
    subscriptionLoading: false,
    subscriptionError: null,
    checkoutLoading: false,
    checkoutRedirecting: false,
    checkoutError: null,
    checkoutStatus: null,
    checkoutArenaId: null,
    checkoutStatusLoading: false,
    checkoutStatusError: null,
    billingActionLoading: false,
    billingActionTier: null,
    billingActionError: null,
    billingActionMessage: null,
    invoices: [],
    invoicesLoading: false,
    invoicesError: null,
    invoicesHasMore: false,
};

/* ---------------------------------------------------------------------------
 * Arena billing reducers. change-plan, cancel-hosting and resume-hosting all
 * return the same { action, subscription } envelope and cannot run
 * concurrently, so they share one loading slot rather than three.
 * ------------------------------------------------------------------------- */
const billingActionSuccess = (
    state: ArenaState,
    action: PayloadAction<{ data?: ArenaBillingActionResponse; message?: string }>
) => {
    state.billingActionLoading = false;
    state.billingActionTier = null;
    state.billingActionMessage = action.payload.message ?? null;
    if (action.payload.data?.subscription) {
        state.subscription = action.payload.data.subscription;
    }
};

const billingActionFailure = (state: ArenaState, action: PayloadAction<string>) => {
    state.billingActionLoading = false;
    state.billingActionTier = null;
    state.billingActionError = action.payload;
};

const hostingActionSuccess = (
    state: ArenaState,
    action: PayloadAction<{ data?: ArenaHostingActionResponse; message?: string }>
) => {
    state.hostingActionLoading = false;
    state.hostingActionTier = null;
    state.hostingActionMessage = action.payload.message ?? null;
    if (action.payload.data?.hosting) {
        state.hosting = action.payload.data.hosting;
    }
};

const hostingActionFailure = (state: ArenaState, action: PayloadAction<string>) => {
    state.hostingActionLoading = false;
    state.hostingActionTier = null;
    state.hostingActionError = action.payload;
};

const memberActionPending = (
    state: ArenaState,
    action: PayloadAction<ArenaMemberActionPayload>
) => {
    state.memberActionLoading = true;
    state.memberActionUserId = action.payload.user_id;
    state.memberActionError = null;
    state.memberActionMessage = null;
};

const memberActionSuccess = (
    state: ArenaState,
    action: PayloadAction<{ message?: string } | undefined>
) => {
    state.memberActionLoading = false;
    state.memberActionUserId = null;
    state.memberActionMessage = action.payload?.message ?? null;
};

const memberActionFailure = (state: ArenaState, action: PayloadAction<string>) => {
    state.memberActionLoading = false;
    state.memberActionUserId = null;
    state.memberActionError = action.payload;
};

const transferActionPending = (state: ArenaState) => {
    state.transferActionLoading = true;
    state.transferError = null;
    state.transferMessage = null;
};

const transferActionSuccess = (
    state: ArenaState,
    action: PayloadAction<{ request?: ArenaOwnershipTransfer | null; message?: string }>
) => {
    state.transferActionLoading = false;
    state.transferMessage = action.payload.message ?? null;

    const request = action.payload.request ?? null;
    const stillPending = request?.status === "pending";
    state.transfer = stillPending ? request : null;
    state.canRespondToTransfer = false;
    state.canCancelTransfer = stillPending;
};

const transferActionFailure = (state: ArenaState, action: PayloadAction<string>) => {
    state.transferActionLoading = false;
    state.transferError = action.payload;
};

const arenaSlice = createSlice({
    name: "arena",
    initialState,
    reducers: {
        fetchArenaGroupsRequest: (state, action: PayloadAction<FetchMyGroupsPayload>) => {
            void action;
            state.arenaGroupsLoading = true;
            state.arenaGroupsError = null;
        },
        fetchArenaGroupsSuccess: (
            state,
            action: PayloadAction<{ groups: GroupObject[]; page: number; hasMore: boolean }>
        ) => {
            state.arenaGroupsLoading = false;
            const { groups, page, hasMore } = action.payload;
            state.arenaGroupsHasMore = hasMore;
            if (page === 1) {
                state.arenaGroups = groups;
            } else {
                const existingIds = new Set(state.arenaGroups?.map((g) => g.id) || []);
                const newUniqueGroups = groups.filter((g) => !existingIds.has(g.id));
                state.arenaGroups = [...(state.arenaGroups || []), ...newUniqueGroups];
            }
        },
        fetchArenaGroupsFailure: (state, action: PayloadAction<string>) => {
            state.arenaGroupsLoading = false;
            state.arenaGroupsError = action.payload;
        },

        // ---- Arena hub tabs (MVP2) ------------------------------------------
        // GET /group/arena/owned-arenas — the "Hosting" tab.
        fetchOwnedArenasRequest: (state, action: PayloadAction<FetchMyGroupsPayload | undefined>) => {
            void action;
            state.ownedArenasLoading = true;
            state.ownedArenasError = null;
        },
        fetchOwnedArenasSuccess: (state, action: PayloadAction<CommunityGroupsPage>) => {
            const { groups, page, hasMore, total } = action.payload;
            state.ownedArenasLoading = false;
            state.ownedArenasHasMore = hasMore;
            state.ownedArenasTotal = total;
            state.ownedArenas = page === 1 ? groups : mergeGroupPage(state.ownedArenas, groups);
        },
        fetchOwnedArenasFailure: (state, action: PayloadAction<string>) => {
            state.ownedArenasLoading = false;
            state.ownedArenasError = action.payload;
        },

        // GET /group/arena/joined-arenas — the "Participating" tab.
        fetchJoinedArenasRequest: (state, action: PayloadAction<FetchMyGroupsPayload | undefined>) => {
            void action;
            state.joinedArenasLoading = true;
            state.joinedArenasError = null;
        },
        fetchJoinedArenasSuccess: (state, action: PayloadAction<CommunityGroupsPage>) => {
            const { groups, page, hasMore, total } = action.payload;
            state.joinedArenasLoading = false;
            state.joinedArenasHasMore = hasMore;
            state.joinedArenasTotal = total;
            state.joinedArenas = page === 1 ? groups : mergeGroupPage(state.joinedArenas, groups);
        },
        fetchJoinedArenasFailure: (state, action: PayloadAction<string>) => {
            state.joinedArenasLoading = false;
            state.joinedArenasError = action.payload;
        },

        // POST /group/arena/join-arena.
        joinArenaRequest: (state, action: PayloadAction<InviteCodePayload>) => {
            void action;
            state.joinArenaLoading = true;
            state.joinArenaError = null;
            state.joinArenaMessage = null;
            state.joinArenaCrossType = false;
            state.joinArenaNotFound = false;
            state.joinedArena = null;
        },
        joinArenaSuccess: (
            state,
            action: PayloadAction<{ message?: string | null; group?: JoinedCommunity | null }>
        ) => {
            state.joinArenaLoading = false;
            state.joinArenaMessage = action.payload.message ?? "Arena joined successfully.";
            state.joinedArena = action.payload.group ?? null;
        },
        joinArenaFailure: (state, action: PayloadAction<JoinCommunityFailurePayload>) => {
            state.joinArenaLoading = false;
            state.joinArenaError = action.payload.message;
            // Only a 409 naming the League type is the DEFINITE "wrong tab" answer.
            // Not sent yet — joinArenaByInviteCode collapses wrongType into the same
            // 404 as an unknown code. See the matching note in groupsSlice.
            state.joinArenaCrossType =
                action.payload.status === 409 && action.payload.group_type === "league";
            // 404 only. The Arena endpoint's other failures are specific and
            // actionable as-is: 402 hosting paused, 403 full/inactive, 410 deleted.
            state.joinArenaNotFound = action.payload.status === 404;
        },
        clearJoinArenaState(state) {
            state.joinArenaLoading = false;
            state.joinArenaError = null;
            state.joinArenaMessage = null;
            state.joinArenaCrossType = false;
            state.joinArenaNotFound = false;
            state.joinedArena = null;
        },

        fetchArenaHostingDetailsRequest: (
            state,
            action: PayloadAction<ArenaHostingDetailsPayload>
        ) => {
            // hosting/unlock gate writability, tier labels and the manager/contest
            // limits, and hosting.tier is an operand of activateArenaHosting — never
            // let Arena A's billing terms describe Arena B. Clearing makes the
            // settings panel render nothing for a frame, which is the fail-closed
            // behaviour we want over showing the wrong arena's plan.
            if (action.payload?.arena_id !== state.hostingForId) {
                state.hosting = null;
                state.unlock = null;
                state.availableTiers = [];
            }
            state.hostingForId = action.payload?.arena_id ?? null;
            state.loading = true;
            state.error = null;
        },
        fetchArenaHostingDetailsSuccess: (
            state,
            action: PayloadAction<ArenaHostingDetailsResponse | undefined>
        ) => {
            state.loading = false;
            state.hosting = action.payload?.hosting ?? null;
            state.unlock = action.payload?.unlock ?? null;
            state.availableTiers = action.payload?.available_tiers ?? [];
        },
        fetchArenaHostingDetailsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },

        fetchOwnedArenaHostingRequest: (
            state,
            action: PayloadAction<OwnedArenaHostingPayload>
        ) => {
            void action;
            state.ownedHostingLoading = true;
            state.ownedHostingError = null;
        },
        fetchOwnedArenaHostingSuccess: (
            state,
            action: PayloadAction<OwnedArenaHostingResponse | undefined>
        ) => {
            const rows = action.payload?.arenas ?? [];
            const page = action.payload?.pagination?.page ?? 1;
            state.ownedHostingLoading = false;
            // Page 1 replaces; later pages append. Dedupe by arena id so a refetch
            // of an already-loaded page cannot double up rows in the list.
            if (page <= 1) {
                state.ownedHosting = rows;
            } else {
                const seen = new Set(state.ownedHosting.map((row) => row.arena.id));
                state.ownedHosting = [
                    ...state.ownedHosting,
                    ...rows.filter((row) => !seen.has(row.arena.id)),
                ];
            }
            state.ownedHostingHasMore = action.payload?.pagination?.hasMore ?? false;
        },
        fetchOwnedArenaHostingFailure: (state, action: PayloadAction<string>) => {
            state.ownedHostingLoading = false;
            state.ownedHostingError = action.payload;
        },

        unlockArenaRequest: (state, action: PayloadAction<ArenaHostingDetailsPayload>) => {
            void action;
            state.unlockLoading = true;
            state.unlockError = null;
            state.unlockMessage = null;
        },
        unlockArenaSuccess: (
            state,
            action: PayloadAction<{
                data?: ArenaHostingDetailsResponse;
                message?: string;
            }>
        ) => {
            state.unlockLoading = false;
            state.unlockMessage = action.payload.message ?? null;
            if (action.payload.data) {
                state.hosting = action.payload.data.hosting ?? state.hosting;
                state.unlock = action.payload.data.unlock ?? state.unlock;
                state.availableTiers =
                    action.payload.data.available_tiers ?? state.availableTiers;
            }
        },
        unlockArenaFailure: (state, action: PayloadAction<string>) => {
            state.unlockLoading = false;
            state.unlockError = action.payload;
        },
        clearUnlockArenaMessage: (state) => {
            state.unlockError = null;
            state.unlockMessage = null;
        },

        fetchArenaContestsRequest: (
            state,
            action: PayloadAction<FetchArenaContestsPayload>
        ) => {
            // Drop the previous Arena's rows as soon as a DIFFERENT one is asked for.
            // Otherwise Arena B renders Arena A's contests for the whole in-flight
            // window, and those ids reach the wire through the contest detailHref.
            if (action.payload?.arena_id !== state.arenaContestsForId) {
                state.arenaContests = [];
            }
            state.arenaContestsForId = action.payload?.arena_id ?? null;
            state.loading = true;
            state.error = null;
        },
        fetchArenaContestsSuccess: (
            state,
            action
        ) => {
            state.loading = false;
            state.arenaContests = action.payload.contests;
        },
        fetchArenaContestsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchArenaContestsMessage: (state) => {
            state.message = null;
            state.error = null;
        },

        createArenaContestRequest: (
            state,
            action: PayloadAction<CreateArenaContestPayload>
        ) => {
            void action;
            state.createContestLoading = true;
            state.createdContest = null;
            state.createContestError = null;
            state.createContestMessage = null;
        },
        createArenaContestSuccess: (
            state,
            action: PayloadAction<{ contest?: ArenaContest | null; message?: string }>
        ) => {
            state.createContestLoading = false;
            state.createdContest = action.payload.contest ?? null;
            state.createContestMessage = action.payload.message ?? null;
        },
        createArenaContestFailure: (state, action: PayloadAction<string>) => {
            state.createContestLoading = false;
            state.createContestError = action.payload;
        },
        clearCreateArenaContestState: (state) => {
            state.createContestLoading = false;
            state.createdContest = null;
            state.createContestError = null;
            state.createContestMessage = null;
        },

        // ---- Contest detail (GET /group/arena/contest) --------------------
        fetchArenaContestDetailRequest: (
            state,
            action: PayloadAction<FetchArenaContestDetailPayload>
        ) => {
            void action;
            state.contestDetailLoading = true;
            state.contestDetailError = null;
        },
        fetchArenaContestDetailSuccess: (
            state,
            action: PayloadAction<ArenaContestDetailResponse | undefined>
        ) => {
            state.contestDetailLoading = false;
            state.contestDetail = action.payload?.contest ?? null;
            state.contestDetailArena = action.payload?.arena ?? null;
            state.contestParticipantCount = action.payload?.participant_count ?? 0;
            state.contestMyParticipation = action.payload?.my_participation ?? null;
        },
        fetchArenaContestDetailFailure: (state, action: PayloadAction<string>) => {
            state.contestDetailLoading = false;
            state.contestDetailError = action.payload;
        },
        clearArenaContestDetail: (state) => {
            state.contestDetail = null;
            state.contestDetailArena = null;
            state.contestParticipantCount = 0;
            state.contestMyParticipation = null;
            state.contestDetailLoading = false;
            state.contestDetailError = null;
        },

        // ---- Contest lifecycle advance (POST /group/arena/contest/advance) -
        advanceArenaContestRequest: (
            state,
            action: PayloadAction<AdvanceArenaContestPayload>
        ) => {
            void action;
            state.advanceContestLoading = true;
            state.advanceContestError = null;
            state.advanceContestMessage = null;
        },
        advanceArenaContestSuccess: (
            state,
            action: PayloadAction<{ contest?: ArenaContest | null; message?: string }>
        ) => {
            state.advanceContestLoading = false;
            state.advanceContestMessage = action.payload.message ?? null;
            // The response echoes the transitioned contest — patch both the detail
            // record and the matching list row so the status badge updates without
            // waiting on the re-read the saga also fires.
            const contest = action.payload.contest ?? null;
            if (contest) {
                state.contestDetail = contest;
                state.arenaContests = state.arenaContests.map((existing) =>
                    existing.id === contest.id ? contest : existing
                );
            }
        },
        advanceArenaContestFailure: (state, action: PayloadAction<string>) => {
            state.advanceContestLoading = false;
            state.advanceContestError = action.payload;
        },
        clearAdvanceArenaContestMessage: (state) => {
            state.advanceContestError = null;
            state.advanceContestMessage = null;
        },

        // ---- Join contest (POST /group/arena/join-arena-contest) ----------
        joinArenaContestRequest: (
            state,
            action: PayloadAction<JoinArenaContestPayload>
        ) => {
            void action;
            state.joinContestLoading = true;
            state.joinContestError = null;
            state.joinContestMessage = null;
        },
        joinArenaContestSuccess: (
            state,
            action: PayloadAction<{
                participant?: ArenaContestParticipant | null;
                message?: string;
            }>
        ) => {
            state.joinContestLoading = false;
            state.joinContestMessage = action.payload.message ?? null;
            // The returned participant is authoritative for the caller's own state.
            if (action.payload.participant) {
                state.contestMyParticipation = action.payload.participant;
            }
        },
        joinArenaContestFailure: (state, action: PayloadAction<string>) => {
            state.joinContestLoading = false;
            state.joinContestError = action.payload;
        },
        clearJoinArenaContestMessage: (state) => {
            state.joinContestError = null;
            state.joinContestMessage = null;
        },

        fetchStaffAnnouncementsRequest: (
            state,
            action: PayloadAction<FetchStaffAnnouncementPayload>
        ) => {
            void action;
            state.staffAnnouncementsLoading = true;
            state.staffAnnouncementsError = null;
        },
        fetchStaffAnnouncementsSuccess: (
            state,
            action: PayloadAction<{
                announcements: StaffAnnouncement[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.staffAnnouncementsLoading = false;
            const { announcements, page, hasMore } = action.payload;
            state.staffAnnouncementsPage = page;
            state.staffAnnouncementsHasMore = hasMore;
            if (page === 1) {
                state.staffAnnouncements = announcements;
            } else {
                // Page 2+ appends, de-duped by id so a row that shifts across the
                // page boundary between reads can't render twice.
                const existingIds = new Set(state.staffAnnouncements.map((a) => a.id));
                state.staffAnnouncements = [
                    ...state.staffAnnouncements,
                    ...announcements.filter((a) => !existingIds.has(a.id)),
                ];
            }
        },
        fetchStaffAnnouncementsFailure: (state, action: PayloadAction<string>) => {
            state.staffAnnouncementsLoading = false;
            state.staffAnnouncementsError = action.payload;
        },

        createStaffAnnouncementRequest: (
            state,
            action: PayloadAction<CreateStaffAnnouncementPayload>
        ) => {
            void action;
            state.createAnnouncementLoading = true;
            state.createdAnnouncement = null;
            state.createAnnouncementError = null;
            state.createAnnouncementMessage = null;
        },
        createStaffAnnouncementSuccess: (
            state,
            action: PayloadAction<{ announcement?: StaffAnnouncement | null; message?: string }>
        ) => {
            state.createAnnouncementLoading = false;
            state.createdAnnouncement = action.payload.announcement ?? null;
            state.createAnnouncementMessage = action.payload.message ?? null;
        },
        createStaffAnnouncementFailure: (state, action: PayloadAction<string>) => {
            state.createAnnouncementLoading = false;
            state.createAnnouncementError = action.payload;
        },
        clearCreateStaffAnnouncementState: (state) => {
            state.createAnnouncementLoading = false;
            state.createdAnnouncement = null;
            state.createAnnouncementError = null;
            state.createAnnouncementMessage = null;
        },

        deleteStaffAnnouncementRequest: (
            state,
            action: PayloadAction<DeleteStaffAnnouncementPayload>
        ) => {
            state.deleteAnnouncementLoadingId = action.payload.announcement_id;
            state.deleteAnnouncementError = null;
            state.deleteAnnouncementMessage = null;
        },
        deleteStaffAnnouncementSuccess: (
            state,
            action: PayloadAction<{ id: string; message?: string }>
        ) => {
            state.deleteAnnouncementLoadingId = null;
            state.deleteAnnouncementMessage = action.payload.message ?? null;
            // Soft-deleted server-side; drop it from the visible list by id.
            state.staffAnnouncements = state.staffAnnouncements.filter(
                (announcement) => announcement.id !== action.payload.id
            );
        },
        deleteStaffAnnouncementFailure: (state, action: PayloadAction<string>) => {
            state.deleteAnnouncementLoadingId = null;
            state.deleteAnnouncementError = action.payload;
        },
        clearDeleteStaffAnnouncementState: (state) => {
            state.deleteAnnouncementLoadingId = null;
            state.deleteAnnouncementError = null;
            state.deleteAnnouncementMessage = null;
        },

        editStaffAnnouncementRequest: (
            state,
            action: PayloadAction<EditStaffAnnouncementPayload>
        ) => {
            state.editAnnouncementLoadingId = action.payload.announcement_id;
            state.editAnnouncementError = null;
            state.editAnnouncementMessage = null;
        },
        editStaffAnnouncementSuccess: (
            state,
            action: PayloadAction<{ announcement: StaffAnnouncement; message?: string }>
        ) => {
            state.editAnnouncementLoadingId = null;
            state.editAnnouncementMessage = action.payload.message ?? null;
            const updated = action.payload.announcement;
            state.staffAnnouncements = state.staffAnnouncements.map((announcement) =>
                announcement.id === updated.id
                    // The edit response omits the profiles join, so keep the existing
                    // author. It also echoes is_pinned, which the edit endpoint never
                    // changes — keep the store-owned value so a concurrent pin can't be
                    // reverted by a stale echo (pin is the sole owner of is_pinned).
                    ? {
                        ...announcement,
                        ...updated,
                        author: announcement.author,
                        is_pinned: announcement.is_pinned,
                    }
                    : announcement
            );
        },
        editStaffAnnouncementFailure: (state, action: PayloadAction<string>) => {
            state.editAnnouncementLoadingId = null;
            state.editAnnouncementError = action.payload;
        },
        clearEditStaffAnnouncementState: (state) => {
            state.editAnnouncementLoadingId = null;
            state.editAnnouncementError = null;
            state.editAnnouncementMessage = null;
        },

        pinStaffAnnouncementRequest: (
            state,
            action: PayloadAction<PinStaffAnnouncementPayload>
        ) => {
            state.pinAnnouncementLoadingId = action.payload.announcement_id;
            state.pinAnnouncementError = null;
            state.pinAnnouncementMessage = null;
        },
        pinStaffAnnouncementSuccess: (
            state,
            action: PayloadAction<{ id: string; is_pinned: boolean; message?: string }>
        ) => {
            state.pinAnnouncementLoadingId = null;
            state.pinAnnouncementMessage = action.payload.message ?? null;
            const { id, is_pinned } = action.payload;
            state.staffAnnouncements = state.staffAnnouncements.map((announcement) =>
                announcement.id === id ? { ...announcement, is_pinned } : announcement
            );
        },
        pinStaffAnnouncementFailure: (state, action: PayloadAction<string>) => {
            state.pinAnnouncementLoadingId = null;
            state.pinAnnouncementError = action.payload;
        },
        clearPinStaffAnnouncementState: (state) => {
            state.pinAnnouncementLoadingId = null;
            state.pinAnnouncementError = null;
            state.pinAnnouncementMessage = null;
        },

        fetchStaffPicksRequest: (
            state,
            action: PayloadAction<FetchStaffPickPayload>
        ) => {
            void action;
            state.staffPicksLoading = true;
            state.staffPicksError = null;
        },
        fetchStaffPicksSuccess: (
            state,
            action: PayloadAction<{
                staffPicks: ArenaStaffPick[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.staffPicksLoading = false;
            const { staffPicks, page, hasMore } = action.payload;
            state.staffPicksPage = page;
            state.staffPicksHasMore = hasMore;
            if (page === 1) {
                state.staffPicks = staffPicks;
            } else {
                const existingIds = new Set(state.staffPicks.map((p) => p.id));
                state.staffPicks = [
                    ...state.staffPicks,
                    ...staffPicks.filter((p) => !existingIds.has(p.id)),
                ];
            }
        },
        fetchStaffPicksFailure: (state, action: PayloadAction<string>) => {
            state.staffPicksLoading = false;
            state.staffPicksError = action.payload;
        },

        createStaffPickRequest: (
            state,
            action: PayloadAction<CreateStaffPickPayload>
        ) => {
            void action;
            state.createStaffPickLoading = true;
            state.createdStaffPick = null;
            state.createStaffPickError = null;
            state.createStaffPickMessage = null;
        },
        createStaffPickSuccess: (
            state,
            action: PayloadAction<{ staffPick?: ArenaStaffPick | null; message?: string }>
        ) => {
            state.createStaffPickLoading = false;
            state.createdStaffPick = action.payload.staffPick ?? null;
            state.createStaffPickMessage = action.payload.message ?? null;
        },
        createStaffPickFailure: (state, action: PayloadAction<string>) => {
            state.createStaffPickLoading = false;
            state.createStaffPickError = action.payload;
        },
        clearCreateStaffPickState: (state) => {
            state.createStaffPickLoading = false;
            state.createdStaffPick = null;
            state.createStaffPickError = null;
            state.createStaffPickMessage = null;
        },

        // ---- Community pick create (POST /group/arena/community-pick) ------
        createCommunityPickRequest: (
            state,
            action: PayloadAction<CreateCommunityPickPayload>
        ) => {
            void action;
            state.createCommunityPickLoading = true;
            state.createdCommunityPick = null;
            state.createCommunityPickError = null;
            state.createCommunityPickMessage = null;
        },
        createCommunityPickSuccess: (
            state,
            action: PayloadAction<{ communityPick?: Pick | null; message?: string }>
        ) => {
            state.createCommunityPickLoading = false;
            state.createdCommunityPick = action.payload.communityPick ?? null;
            state.createCommunityPickMessage = action.payload.message ?? null;
        },
        createCommunityPickFailure: (state, action: PayloadAction<string>) => {
            state.createCommunityPickLoading = false;
            state.createCommunityPickError = action.payload;
        },
        clearCreateCommunityPickState: (state) => {
            state.createCommunityPickLoading = false;
            state.createdCommunityPick = null;
            state.createCommunityPickError = null;
            state.createCommunityPickMessage = null;
        },

        // ---- Community picks list (GET /group/arena/community-picks) -------
        fetchCommunityPicksRequest: (
            state,
            action: PayloadAction<FetchCommunityPicksPayload>
        ) => {
            void action;
            state.communityPicksLoading = true;
            state.communityPicksError = null;
        },
        fetchCommunityPicksSuccess: (
            state,
            action: PayloadAction<{
                communityPicks: ArenaCommunityPick[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.communityPicksLoading = false;
            const { communityPicks, page, hasMore } = action.payload;
            state.communityPicksPage = page;
            state.communityPicksHasMore = hasMore;
            if (page === 1) {
                state.communityPicks = communityPicks;
            } else {
                const existingIds = new Set(state.communityPicks.map((p) => p.id));
                state.communityPicks = [
                    ...state.communityPicks,
                    ...communityPicks.filter((p) => !existingIds.has(p.id)),
                ];
            }
        },
        fetchCommunityPicksFailure: (state, action: PayloadAction<string>) => {
            state.communityPicksLoading = false;
            state.communityPicksError = action.payload;
        },

        // ---- Community pick update (PUT .../community-pick/:id) ------------
        updateCommunityPickRequest: (
            state,
            action: PayloadAction<UpdateCommunityPickPayload>
        ) => {
            void action;
            state.updateCommunityPickLoading = true;
            state.updatedCommunityPick = null;
            state.updateCommunityPickError = null;
            state.updateCommunityPickMessage = null;
        },
        updateCommunityPickSuccess: (
            state,
            action: PayloadAction<{ communityPick?: Pick | null; message?: string }>
        ) => {
            state.updateCommunityPickLoading = false;
            state.updatedCommunityPick = action.payload.communityPick ?? null;
            state.updateCommunityPickMessage = action.payload.message ?? null;
            // Patch the updated row in place; the update response has no author
            // join, so keep the existing author on the list entry.
            const updated = action.payload.communityPick;
            if (updated) {
                state.communityPicks = state.communityPicks.map((pick) =>
                    pick.id === updated.id
                        ? { ...pick, ...updated, author: pick.author }
                        : pick
                );
            }
        },
        updateCommunityPickFailure: (state, action: PayloadAction<string>) => {
            state.updateCommunityPickLoading = false;
            state.updateCommunityPickError = action.payload;
        },
        clearUpdateCommunityPickState: (state) => {
            state.updateCommunityPickLoading = false;
            state.updatedCommunityPick = null;
            state.updateCommunityPickError = null;
            state.updateCommunityPickMessage = null;
        },

        // ---- Community pick delete (DELETE .../community-pick/:id) ---------
        deleteCommunityPickRequest: (
            state,
            action: PayloadAction<DeleteCommunityPickPayload>
        ) => {
            state.deleteCommunityPickLoadingId = action.payload.pick_id;
            state.deleteCommunityPickError = null;
            state.deleteCommunityPickMessage = null;
        },
        deleteCommunityPickSuccess: (
            state,
            action: PayloadAction<{ id: string; message?: string }>
        ) => {
            state.deleteCommunityPickLoadingId = null;
            state.deleteCommunityPickMessage = action.payload.message ?? null;
            state.communityPicks = state.communityPicks.filter(
                (pick) => pick.id !== action.payload.id
            );
        },
        deleteCommunityPickFailure: (state, action: PayloadAction<string>) => {
            state.deleteCommunityPickLoadingId = null;
            state.deleteCommunityPickError = action.payload;
        },
        clearDeleteCommunityPickState: (state) => {
            state.deleteCommunityPickLoadingId = null;
            state.deleteCommunityPickError = null;
            state.deleteCommunityPickMessage = null;
        },

        /**
         * Drops every row the Feed renders, so opening a different group can never
         * show the previous one's posts.
         *
         * This matters beyond cosmetics: the fetch reducers only set a loading flag
         * and never clear their list, so without this the old group's rows stay on
         * screen for the whole in-flight window — and forever if the new group's
         * fetch fails (403 for a non-member, 410 for a deleted group). Those rows
         * carry live Edit/Delete/Pin buttons whose ids belong to the OTHER surface,
         * and both backends 404 a foreign id, so the user would be acting on a post
         * that is not theirs to act on. Dispatched by ConnectedStructuredFeed
         * whenever groupId/groupType changes and on unmount.
         */
        resetGroupFeed: (state) => {
            state.staffAnnouncements = [];
            state.staffAnnouncementsPage = 1;
            state.staffAnnouncementsHasMore = false;
            state.staffAnnouncementsError = null;
            state.staffPicks = [];
            state.staffPicksPage = 1;
            state.staffPicksHasMore = false;
            state.staffPicksError = null;
            state.communityPicks = [];
            state.communityPicksPage = 1;
            state.communityPicksHasMore = false;
            state.communityPicksError = null;
            state.openContestPicks = [];
            state.closedContestPicks = [];
            state.joinedOpenContests = [];
        },

        // ---- Joined open contests (GET .../joined-open-contests) ----------
        fetchJoinedOpenContestsRequest: (
            state,
            action: PayloadAction<FetchJoinedOpenContestsPayload>
        ) => {
            void action;
            state.joinedOpenContestsLoading = true;
            state.joinedOpenContestsError = null;
        },
        fetchJoinedOpenContestsSuccess: (
            state,
            action: PayloadAction<{ contests: JoinedOpenArenaContest[] }>
        ) => {
            state.joinedOpenContestsLoading = false;
            state.joinedOpenContests = action.payload.contests;
        },
        fetchJoinedOpenContestsFailure: (state, action: PayloadAction<string>) => {
            state.joinedOpenContestsLoading = false;
            state.joinedOpenContestsError = action.payload;
        },

        // ---- Competitive pick / contest entry (POST .../contest/:id/entry) -
        submitArenaContestEntryRequest: (
            state,
            action: PayloadAction<SubmitArenaContestEntryPayload>
        ) => {
            void action;
            state.submitEntryLoading = true;
            state.submittedEntryPick = null;
            state.submitEntryError = null;
            state.submitEntryMessage = null;
        },
        submitArenaContestEntrySuccess: (
            state,
            action: PayloadAction<{ pick?: Pick | null; message?: string }>
        ) => {
            state.submitEntryLoading = false;
            state.submittedEntryPick = action.payload.pick ?? null;
            state.submitEntryMessage = action.payload.message ?? null;
        },
        submitArenaContestEntryFailure: (state, action: PayloadAction<string>) => {
            state.submitEntryLoading = false;
            state.submitEntryError = action.payload;
        },
        clearSubmitArenaContestEntryState: (state) => {
            state.submitEntryLoading = false;
            state.submittedEntryPick = null;
            state.submitEntryError = null;
            state.submitEntryMessage = null;
        },

        // ---- Competitive pick replace (PUT /contest/:id/entry) ------------
        replaceArenaContestEntryRequest: (
            state,
            action: PayloadAction<UpdateCompetitivePickPayload>
        ) => {
            void action;
            state.replaceEntryLoading = true;
            state.replacedEntryPick = null;
            state.replaceEntryError = null;
            state.replaceEntryMessage = null;
        },
        replaceArenaContestEntrySuccess: (
            state,
            action: PayloadAction<{ pick?: Pick | null; message?: string }>
        ) => {
            state.replaceEntryLoading = false;
            state.replacedEntryPick = action.payload.pick ?? null;
            state.replaceEntryMessage = action.payload.message ?? null;
        },
        replaceArenaContestEntryFailure: (state, action: PayloadAction<string>) => {
            state.replaceEntryLoading = false;
            state.replaceEntryError = action.payload;
        },
        clearReplaceArenaContestEntryState: (state) => {
            state.replaceEntryLoading = false;
            state.replacedEntryPick = null;
            state.replaceEntryError = null;
            state.replaceEntryMessage = null;
        },

        // ---- Competitive picks: OPEN contests (details hidden until lock) --
        fetchOpenContestPicksRequest: (
            state,
            action: PayloadAction<FetchArenaContestPicksPayload>
        ) => {
            void action;
            state.openContestPicksLoading = true;
            state.openContestPicksError = null;
        },
        fetchOpenContestPicksSuccess: (
            state,
            action: PayloadAction<{
                picks: ArenaContestPick[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.openContestPicksLoading = false;
            const { picks, page, hasMore } = action.payload;
            state.openContestPicksPage = page;
            state.openContestPicksHasMore = hasMore;
            if (page === 1) {
                state.openContestPicks = picks;
            } else {
                const existingIds = new Set(state.openContestPicks.map((p) => p.id));
                state.openContestPicks = [
                    ...state.openContestPicks,
                    ...picks.filter((p) => !existingIds.has(p.id)),
                ];
            }
        },
        fetchOpenContestPicksFailure: (state, action: PayloadAction<string>) => {
            state.openContestPicksLoading = false;
            state.openContestPicksError = action.payload;
        },

        // ---- Competitive picks: CLOSED contests (full details revealed) ---
        fetchClosedContestPicksRequest: (
            state,
            action: PayloadAction<FetchArenaContestPicksPayload>
        ) => {
            void action;
            state.closedContestPicksLoading = true;
            state.closedContestPicksError = null;
        },
        fetchClosedContestPicksSuccess: (
            state,
            action: PayloadAction<{
                picks: ArenaContestPick[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.closedContestPicksLoading = false;
            const { picks, page, hasMore } = action.payload;
            state.closedContestPicksPage = page;
            state.closedContestPicksHasMore = hasMore;
            if (page === 1) {
                state.closedContestPicks = picks;
            } else {
                const existingIds = new Set(state.closedContestPicks.map((p) => p.id));
                state.closedContestPicks = [
                    ...state.closedContestPicks,
                    ...picks.filter((p) => !existingIds.has(p.id)),
                ];
            }
        },
        fetchClosedContestPicksFailure: (state, action: PayloadAction<string>) => {
            state.closedContestPicksLoading = false;
            state.closedContestPicksError = action.payload;
        },

        deleteStaffPickRequest: (
            state,
            action: PayloadAction<DeleteStaffPickPayload>
        ) => {
            state.deleteStaffPickLoadingId = action.payload.pick_id;
            state.deleteStaffPickError = null;
            state.deleteStaffPickMessage = null;
        },
        deleteStaffPickSuccess: (
            state,
            action: PayloadAction<{ id: string; message?: string }>
        ) => {
            state.deleteStaffPickLoadingId = null;
            state.deleteStaffPickMessage = action.payload.message ?? null;
            // Hard-deleted server-side; drop it from the visible list by id.
            state.staffPicks = state.staffPicks.filter(
                (pick) => pick.id !== action.payload.id
            );
        },
        deleteStaffPickFailure: (state, action: PayloadAction<string>) => {
            state.deleteStaffPickLoadingId = null;
            state.deleteStaffPickError = action.payload;
        },
        clearDeleteStaffPickState: (state) => {
            state.deleteStaffPickLoadingId = null;
            state.deleteStaffPickError = null;
            state.deleteStaffPickMessage = null;
        },

        makeArenaManagerRequest: memberActionPending,
        makeArenaManagerSuccess: memberActionSuccess,
        makeArenaManagerFailure: memberActionFailure,

        makeArenaMemberRequest: memberActionPending,
        makeArenaMemberSuccess: memberActionSuccess,
        makeArenaMemberFailure: memberActionFailure,

        removeArenaMemberRequest: memberActionPending,
        removeArenaMemberSuccess: memberActionSuccess,
        removeArenaMemberFailure: memberActionFailure,

        clearArenaMemberActionMessage: (state) => {
            state.memberActionError = null;
            state.memberActionMessage = null;
        },

        // ---- Ownership transfer -------------------------------------------
        fetchArenaOwnershipTransferRequest: (
            state,
            action: PayloadAction<FetchArenaOwnershipTransferPayload>
        ) => {
            void action;
            state.transferLoading = true;
            state.transferError = null;
        },
        fetchArenaOwnershipTransferSuccess: (
            state,
            action: PayloadAction<ArenaOwnershipTransferResponse | undefined>
        ) => {
            state.transferLoading = false;
            state.transfer = action.payload?.request ?? null;
            state.canRespondToTransfer = action.payload?.can_respond ?? false;
            state.canCancelTransfer = action.payload?.can_cancel ?? false;
        },
        fetchArenaOwnershipTransferFailure: (state, action: PayloadAction<string>) => {
            state.transferLoading = false;
            state.transferError = action.payload;
        },

        createArenaOwnershipTransferRequest: (
            state,
            action: PayloadAction<CreateArenaOwnershipTransferPayload>
        ) => {
            void action;
            transferActionPending(state);
        },
        createArenaOwnershipTransferSuccess: transferActionSuccess,
        createArenaOwnershipTransferFailure: transferActionFailure,

        respondArenaOwnershipTransferRequest: (
            state,
            action: PayloadAction<RespondArenaOwnershipTransferPayload>
        ) => {
            void action;
            transferActionPending(state);
        },
        respondArenaOwnershipTransferSuccess: transferActionSuccess,
        respondArenaOwnershipTransferFailure: transferActionFailure,

        cancelArenaOwnershipTransferRequest: (
            state,
            action: PayloadAction<CancelArenaOwnershipTransferPayload>
        ) => {
            void action;
            transferActionPending(state);
        },
        cancelArenaOwnershipTransferSuccess: transferActionSuccess,
        cancelArenaOwnershipTransferFailure: transferActionFailure,

        clearArenaOwnershipTransferMessage: (state) => {
            state.transferError = null;
            state.transferMessage = null;
        },

        updateArenaDetailsRequest: (
            state,
            action: PayloadAction<UpdateArenaDetailsPayload>
        ) => {
            void action;
            state.updateLoading = true;
            state.updateError = null;
            state.updateMessage = null;
        },
        updateArenaDetailsSuccess: (
            state,
            action: PayloadAction<{ message?: string } | undefined>
        ) => {
            state.updateLoading = false;
            state.updateMessage = action.payload?.message ?? null;
        },
        updateArenaDetailsFailure: (state, action: PayloadAction<string>) => {
            state.updateLoading = false;
            state.updateError = action.payload;
        },
        clearUpdateArenaDetailsMessage: (state) => {
            state.updateError = null;
            state.updateMessage = null;
        },

        activateArenaHostingRequest: (
            state,
            action: PayloadAction<ActivateArenaHostingPayload>
        ) => {
            state.hostingActionLoading = true;
            state.hostingActionTier = action.payload.tier;
            state.hostingActionError = null;
            state.hostingActionMessage = null;
        },
        activateArenaHostingSuccess: hostingActionSuccess,
        activateArenaHostingFailure: hostingActionFailure,

        scheduleArenaPauseRequest: (state, action: PayloadAction<ArenaPausePayload>) => {
            void action;
            state.hostingActionLoading = true;
            state.hostingActionError = null;
            state.hostingActionMessage = null;
        },
        scheduleArenaPauseSuccess: hostingActionSuccess,
        scheduleArenaPauseFailure: hostingActionFailure,

        cancelArenaPauseRequest: (state, action: PayloadAction<ArenaPausePayload>) => {
            void action;
            state.hostingActionLoading = true;
            state.hostingActionError = null;
            state.hostingActionMessage = null;
        },
        cancelArenaPauseSuccess: hostingActionSuccess,
        cancelArenaPauseFailure: hostingActionFailure,

        clearArenaHostingActionMessage: (state) => {
            state.hostingActionError = null;
            state.hostingActionMessage = null;
        },

        /* -------------------------------------------------------------------
         * ARENA BILLING — real Stripe money.
         * ----------------------------------------------------------------- */

        // GET /group/arena/subscription
        fetchArenaSubscriptionRequest: (
            state,
            action: PayloadAction<ArenaHostingDetailsPayload>
        ) => {
            // Same rule the hosting read follows: drop the previous Arena's
            // subscription immediately so a stale plan/limit can never be shown
            // against a different Arena while the new read is in flight.
            if (action.payload?.arena_id !== state.hostingForId) {
                state.subscription = null;
            }
            state.subscriptionLoading = true;
            state.subscriptionError = null;
        },
        fetchArenaSubscriptionSuccess: (
            state,
            action: PayloadAction<ArenaSubscriptionResponse | undefined>
        ) => {
            state.subscriptionLoading = false;
            state.subscription = action.payload?.subscription ?? null;
            if (action.payload?.hosting !== undefined) {
                state.hosting = action.payload.hosting;
            }
            if (action.payload?.unlock !== undefined) {
                state.unlock = action.payload.unlock;
            }
        },
        fetchArenaSubscriptionFailure: (state, action: PayloadAction<string>) => {
            state.subscriptionLoading = false;
            state.subscriptionError = action.payload;
        },

        // POST /group/arena/checkout-session
        createArenaCheckoutRequest: (state, action: PayloadAction<ArenaCheckoutPayload>) => {
            void action;
            state.checkoutLoading = true;
            state.checkoutRedirecting = false;
            state.checkoutError = null;
        },
        createArenaCheckoutSuccess: (
            state,
            action: PayloadAction<{ redirecting: boolean }>
        ) => {
            state.checkoutLoading = false;
            // Stays TRUE through the navigation. The browser is unloading, so
            // clearing it here would re-enable the confirm button for the last
            // few hundred milliseconds and invite a second checkout.
            state.checkoutRedirecting = action.payload.redirecting;
        },
        createArenaCheckoutFailure: (state, action: PayloadAction<string>) => {
            state.checkoutLoading = false;
            state.checkoutRedirecting = false;
            state.checkoutError = action.payload;
        },

        // GET /group/arena/checkout-status — polled after returning from Stripe.
        fetchArenaCheckoutStatusRequest: (state, action: PayloadAction<{ session_id: string }>) => {
            void action;
            state.checkoutStatusLoading = true;
            state.checkoutStatusError = null;
        },
        fetchArenaCheckoutStatusSuccess: (
            state,
            action: PayloadAction<ArenaCheckoutStatusResponse | undefined>
        ) => {
            state.checkoutStatusLoading = false;
            state.checkoutStatus = action.payload?.status ?? null;
            // Which Arena the session actually belongs to, so the return banner
            // can refuse to render against a different one.
            state.checkoutArenaId = action.payload?.arena_id ?? null;
            if (action.payload?.subscription) {
                state.subscription = action.payload.subscription;
            }
        },
        fetchArenaCheckoutStatusFailure: (state, action: PayloadAction<string>) => {
            state.checkoutStatusLoading = false;
            state.checkoutStatusError = action.payload;
        },
        clearArenaCheckoutState: (state) => {
            state.checkoutStatus = null;
            state.checkoutArenaId = null;
            state.checkoutStatusError = null;
            state.checkoutError = null;
            state.checkoutRedirecting = false;
        },

        // POST /group/arena/change-plan
        changeArenaPlanRequest: (state, action: PayloadAction<ChangeArenaPlanPayload>) => {
            state.billingActionLoading = true;
            state.billingActionTier = action.payload?.tier ?? null;
            state.billingActionError = null;
            state.billingActionMessage = null;
        },
        changeArenaPlanSuccess: billingActionSuccess,
        changeArenaPlanFailure: billingActionFailure,

        // POST /group/arena/cancel-hosting
        cancelArenaHostingRequest: (state, action: PayloadAction<ArenaPausePayload>) => {
            void action;
            state.billingActionLoading = true;
            state.billingActionError = null;
            state.billingActionMessage = null;
        },
        cancelArenaHostingSuccess: billingActionSuccess,
        cancelArenaHostingFailure: billingActionFailure,

        // POST /group/arena/resume-hosting
        resumeArenaHostingRequest: (state, action: PayloadAction<ArenaPausePayload>) => {
            void action;
            state.billingActionLoading = true;
            state.billingActionError = null;
            state.billingActionMessage = null;
        },
        resumeArenaHostingSuccess: billingActionSuccess,
        resumeArenaHostingFailure: billingActionFailure,

        // POST /group/arena/billing-portal — hands the browser to Stripe.
        openArenaBillingPortalRequest: (state, action: PayloadAction<ArenaPausePayload>) => {
            void action;
            state.billingActionLoading = true;
            state.billingActionError = null;
        },
        openArenaBillingPortalSuccess: (state) => {
            state.billingActionLoading = false;
        },
        openArenaBillingPortalFailure: (state, action: PayloadAction<string>) => {
            state.billingActionLoading = false;
            state.billingActionError = action.payload;
        },

        clearArenaBillingActionMessage: (state) => {
            state.billingActionError = null;
            state.billingActionMessage = null;
        },

        // GET /group/arena/invoices
        fetchArenaInvoicesRequest: (state, action: PayloadAction<FetchArenaInvoicesPayload>) => {
            // Page 1 replaces; later pages append — so "load more" cannot
            // duplicate rows if it is dispatched twice.
            if ((action.payload?.page ?? 1) === 1) state.invoices = [];
            state.invoicesLoading = true;
            state.invoicesError = null;
        },
        fetchArenaInvoicesSuccess: (
            state,
            action: PayloadAction<{ transactions: ArenaInvoice[]; page: number; hasMore: boolean }>
        ) => {
            state.invoicesLoading = false;
            state.invoices =
                action.payload.page === 1
                    ? action.payload.transactions
                    : [...state.invoices, ...action.payload.transactions];
            state.invoicesHasMore = action.payload.hasMore;
        },
        fetchArenaInvoicesFailure: (state, action: PayloadAction<string>) => {
            state.invoicesLoading = false;
            state.invoicesError = action.payload;
        },

        initiateArenaDeleteRequest: (
            state,
            action: PayloadAction<InitiateArenaDeletePayload>
        ) => {
            void action;
            state.arenaDeleteLoading = true;
            state.arenaDeleteError = null;
            state.arenaDeleteMessage = null;
        },
        initiateArenaDeleteSuccess: (
            state,
            action: PayloadAction<{ message?: string } | undefined>
        ) => {
            state.arenaDeleteLoading = false;
            state.arenaDeleteOtpSent = true;
            state.arenaDeleteMessage = action.payload?.message ?? null;
        },
        initiateArenaDeleteFailure: (state, action: PayloadAction<string>) => {
            state.arenaDeleteLoading = false;
            state.arenaDeleteError = action.payload;
        },

        confirmArenaDeleteRequest: (
            state,
            action: PayloadAction<ConfirmArenaDeletePayload>
        ) => {
            void action;
            state.arenaDeleteLoading = true;
            state.arenaDeleteError = null;
            state.arenaDeleteMessage = null;
        },
        confirmArenaDeleteSuccess: (
            state,
            action: PayloadAction<{ message?: string } | undefined>
        ) => {
            state.arenaDeleteLoading = false;
            state.arenaDeleteOtpSent = false;
            state.arenaDeleted = true;
            state.arenaDeleteMessage = action.payload?.message ?? null;
        },
        confirmArenaDeleteFailure: (state, action: PayloadAction<string>) => {
            state.arenaDeleteLoading = false;
            state.arenaDeleteError = action.payload;
        },

        clearArenaDeleteState: (state) => {
            state.arenaDeleteLoading = false;
            state.arenaDeleteOtpSent = false;
            state.arenaDeleted = false;
            state.arenaDeleteError = null;
            state.arenaDeleteMessage = null;
        },

        leaveArenaRequest: (state, action: PayloadAction<LeaveArenaPayload>) => {
            void action;
            state.leaveArenaLoading = true;
            state.leaveArenaError = null;
            state.leaveArenaMessage = null;
        },
        leaveArenaSuccess: (state, action: PayloadAction<{ message?: string } | undefined>) => {
            state.leaveArenaLoading = false;
            state.arenaLeft = true;
            state.leaveArenaMessage = action.payload?.message ?? null;
        },
        leaveArenaFailure: (state, action: PayloadAction<string>) => {
            state.leaveArenaLoading = false;
            state.leaveArenaError = action.payload;
        },
        clearLeaveArenaState: (state) => {
            state.leaveArenaLoading = false;
            state.arenaLeft = false;
            state.leaveArenaError = null;
            state.leaveArenaMessage = null;
        },

        /* --------------------------------------------------------------------
         * ARENA GUIDE — should this member be shown the welcome walkthrough?
         * ------------------------------------------------------------------ */
        fetchArenaGuideStatusRequest: (
            state,
            action: PayloadAction<FetchArenaGuideStatusPayload>
        ) => {
            // Dropped at REQUEST time on an id mismatch. This slot decides
            // whether a modal opens over the page, so the previous Arena's
            // answer must not survive into this one's in-flight window.
            if (state.guideForId !== action.payload.arena_id) {
                state.guide = null;
            }
            state.guideForId = action.payload.arena_id;
            state.guideLoading = true;
            state.guideError = null;
        },
        fetchArenaGuideStatusSuccess: (
            state,
            action: PayloadAction<ArenaGuideStatusData>
        ) => {
            state.guideLoading = false;
            state.guideError = null;
            state.guide = action.payload.guide;
            state.guideForId = action.payload.arena?.id ?? state.guideForId;
        },
        fetchArenaGuideStatusFailure: (state, action: PayloadAction<string>) => {
            state.guideLoading = false;
            state.guideError = action.payload;
            // Null, never a synthesised `should_show_guide: false`: a failed read
            // means UNKNOWN, and the screen's own rule is "open only on a
            // definite yes", so this stays closed without pretending it was told.
            state.guide = null;
        },

        markArenaGuideViewedRequest: (
            state,
            action: PayloadAction<MarkArenaGuideViewedPayload>
        ) => {
            state.guideAckLoading = true;
            state.guideAckError = null;
            // Optimistic, and deliberately so: the dialog closes on the click,
            // and leaving `should_show_guide` true until the round trip lands
            // would let the auto-open effect fire again behind it.
            if (state.guide && state.guideForId === action.payload.arena_id) {
                state.guide = {
                    ...state.guide,
                    has_viewed_guide: true,
                    should_show_guide: false,
                    has_viewed_any_version: true,
                    status: action.payload.status ?? "completed",
                };
            }
        },
        markArenaGuideViewedSuccess: (
            state,
            action: PayloadAction<MarkArenaGuideViewedData>
        ) => {
            state.guideAckLoading = false;
            state.guideAckError = null;
            // The server echoes the row it wrote in the same shape the GET
            // returns, so this replaces the optimistic guess with the truth —
            // timestamps included — without a follow-up read.
            if (state.guideForId === action.payload.arena?.id) {
                state.guide = action.payload.guide;
            }
        },
        markArenaGuideViewedFailure: (state, action: PayloadAction<string>) => {
            state.guideAckLoading = false;
            state.guideAckError = action.payload;
            // The optimistic flip is NOT rolled back. Re-opening the guide over
            // a member who just closed it is worse than showing it once more on
            // their next visit, which is what an unrecorded acknowledgement
            // costs.
        },
    },
});

export const {
    fetchArenaGroupsRequest,
    fetchArenaGroupsSuccess,
    fetchArenaGroupsFailure,
    fetchOwnedArenasRequest,
    fetchOwnedArenasSuccess,
    fetchOwnedArenasFailure,
    fetchJoinedArenasRequest,
    fetchJoinedArenasSuccess,
    fetchJoinedArenasFailure,
    joinArenaRequest,
    joinArenaSuccess,
    joinArenaFailure,
    clearJoinArenaState,
    fetchArenaHostingDetailsRequest,
    fetchArenaHostingDetailsSuccess,
    fetchArenaHostingDetailsFailure,
    fetchOwnedArenaHostingRequest,
    fetchOwnedArenaHostingSuccess,
    fetchOwnedArenaHostingFailure,
    unlockArenaRequest,
    unlockArenaSuccess,
    unlockArenaFailure,
    clearUnlockArenaMessage,
    fetchArenaContestsRequest,
    fetchArenaContestsSuccess,
    fetchArenaContestsFailure,
    clearFetchArenaContestsMessage,
    createArenaContestRequest,
    createArenaContestSuccess,
    createArenaContestFailure,
    clearCreateArenaContestState,
    fetchArenaContestDetailRequest,
    fetchArenaContestDetailSuccess,
    fetchArenaContestDetailFailure,
    clearArenaContestDetail,
    advanceArenaContestRequest,
    advanceArenaContestSuccess,
    advanceArenaContestFailure,
    clearAdvanceArenaContestMessage,
    joinArenaContestRequest,
    joinArenaContestSuccess,
    joinArenaContestFailure,
    clearJoinArenaContestMessage,
    fetchStaffAnnouncementsRequest,
    fetchStaffAnnouncementsSuccess,
    fetchStaffAnnouncementsFailure,
    createStaffAnnouncementRequest,
    createStaffAnnouncementSuccess,
    createStaffAnnouncementFailure,
    clearCreateStaffAnnouncementState,
    deleteStaffAnnouncementRequest,
    deleteStaffAnnouncementSuccess,
    deleteStaffAnnouncementFailure,
    clearDeleteStaffAnnouncementState,
    editStaffAnnouncementRequest,
    editStaffAnnouncementSuccess,
    editStaffAnnouncementFailure,
    clearEditStaffAnnouncementState,
    pinStaffAnnouncementRequest,
    pinStaffAnnouncementSuccess,
    pinStaffAnnouncementFailure,
    clearPinStaffAnnouncementState,
    fetchStaffPicksRequest,
    fetchStaffPicksSuccess,
    fetchStaffPicksFailure,
    createStaffPickRequest,
    createStaffPickSuccess,
    createStaffPickFailure,
    clearCreateStaffPickState,
    createCommunityPickRequest,
    createCommunityPickSuccess,
    createCommunityPickFailure,
    clearCreateCommunityPickState,
    fetchCommunityPicksRequest,
    fetchCommunityPicksSuccess,
    fetchCommunityPicksFailure,
    updateCommunityPickRequest,
    updateCommunityPickSuccess,
    updateCommunityPickFailure,
    clearUpdateCommunityPickState,
    deleteCommunityPickRequest,
    deleteCommunityPickSuccess,
    deleteCommunityPickFailure,
    clearDeleteCommunityPickState,
    resetGroupFeed,
    fetchJoinedOpenContestsRequest,
    fetchJoinedOpenContestsSuccess,
    fetchJoinedOpenContestsFailure,
    submitArenaContestEntryRequest,
    submitArenaContestEntrySuccess,
    submitArenaContestEntryFailure,
    clearSubmitArenaContestEntryState,
    replaceArenaContestEntryRequest,
    replaceArenaContestEntrySuccess,
    replaceArenaContestEntryFailure,
    clearReplaceArenaContestEntryState,
    fetchOpenContestPicksRequest,
    fetchOpenContestPicksSuccess,
    fetchOpenContestPicksFailure,
    fetchClosedContestPicksRequest,
    fetchClosedContestPicksSuccess,
    fetchClosedContestPicksFailure,
    deleteStaffPickRequest,
    deleteStaffPickSuccess,
    deleteStaffPickFailure,
    clearDeleteStaffPickState,
    makeArenaManagerRequest,
    makeArenaManagerSuccess,
    makeArenaManagerFailure,
    makeArenaMemberRequest,
    makeArenaMemberSuccess,
    makeArenaMemberFailure,
    removeArenaMemberRequest,
    removeArenaMemberSuccess,
    removeArenaMemberFailure,
    clearArenaMemberActionMessage,
    fetchArenaOwnershipTransferRequest,
    fetchArenaOwnershipTransferSuccess,
    fetchArenaOwnershipTransferFailure,
    createArenaOwnershipTransferRequest,
    createArenaOwnershipTransferSuccess,
    createArenaOwnershipTransferFailure,
    respondArenaOwnershipTransferRequest,
    respondArenaOwnershipTransferSuccess,
    respondArenaOwnershipTransferFailure,
    cancelArenaOwnershipTransferRequest,
    cancelArenaOwnershipTransferSuccess,
    cancelArenaOwnershipTransferFailure,
    clearArenaOwnershipTransferMessage,
    updateArenaDetailsRequest,
    updateArenaDetailsSuccess,
    updateArenaDetailsFailure,
    clearUpdateArenaDetailsMessage,
    activateArenaHostingRequest,
    activateArenaHostingSuccess,
    activateArenaHostingFailure,
    scheduleArenaPauseRequest,
    scheduleArenaPauseSuccess,
    scheduleArenaPauseFailure,
    cancelArenaPauseRequest,
    cancelArenaPauseSuccess,
    cancelArenaPauseFailure,
    fetchArenaSubscriptionRequest,
    fetchArenaSubscriptionSuccess,
    fetchArenaSubscriptionFailure,
    createArenaCheckoutRequest,
    createArenaCheckoutSuccess,
    createArenaCheckoutFailure,
    fetchArenaCheckoutStatusRequest,
    fetchArenaCheckoutStatusSuccess,
    fetchArenaCheckoutStatusFailure,
    clearArenaCheckoutState,
    changeArenaPlanRequest,
    changeArenaPlanSuccess,
    changeArenaPlanFailure,
    cancelArenaHostingRequest,
    cancelArenaHostingSuccess,
    cancelArenaHostingFailure,
    resumeArenaHostingRequest,
    resumeArenaHostingSuccess,
    resumeArenaHostingFailure,
    openArenaBillingPortalRequest,
    openArenaBillingPortalSuccess,
    openArenaBillingPortalFailure,
    clearArenaBillingActionMessage,
    fetchArenaInvoicesRequest,
    fetchArenaInvoicesSuccess,
    fetchArenaInvoicesFailure,
    clearArenaHostingActionMessage,
    initiateArenaDeleteRequest,
    initiateArenaDeleteSuccess,
    initiateArenaDeleteFailure,
    confirmArenaDeleteRequest,
    confirmArenaDeleteSuccess,
    confirmArenaDeleteFailure,
    clearArenaDeleteState,
    leaveArenaRequest,
    leaveArenaSuccess,
    leaveArenaFailure,
    clearLeaveArenaState,
    fetchArenaGuideStatusRequest,
    fetchArenaGuideStatusSuccess,
    fetchArenaGuideStatusFailure,
    markArenaGuideViewedRequest,
    markArenaGuideViewedSuccess,
    markArenaGuideViewedFailure,
} = arenaSlice.actions;

export default arenaSlice.reducer;
