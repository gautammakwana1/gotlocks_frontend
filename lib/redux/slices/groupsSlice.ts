import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setStoredPlan } from "@/lib/plan/planStorage";
import { mergeGroupPage } from "@/lib/groups/pagination";
import type {
	CreateGroupPayload,
	FetchGroupsParams,
	FetchGroupByIdPayload,
	InviteCodePayload,
	MemberModificationPayload,
	UpdateMemberRolePayload,
	GroupDeletePayload,
	ConfirmDeletePayload,
	Group,
	SessionState,
	LeaderboardPayload,
	UpdateGroupPayload,
	GroupSummary,
	FetchLeaderBoardsPayload,
	LeaderboardList,
	CreateNewLeaderboardPayload,
	UpdateLeaderboardPayload,
	LeaveGroupPayload,
	UpdateLeaderboardToArchivedPayload,
	EnableSecondaryLeaderboardPayload,
	FetchArchivedLeaderBoardsPayload,
	ArchivedLeaderboard,
	FetchArchivedLeaderBoardListPayload,
	ArchiveLeaderboardList,
	LeaderboardData,
	PaginationMetadata,
	Members,
	FetchGroupMembersPayload,
	MembersData,
	FetchMyGroupsPayload,
	GroupObject,
	GroupType,
	ChatMessage,
	FetchGroupChatsPayload,
	FetchGroupChatsResponse,
	SendMessagePayload,
	DeleteMessagePayload,
	FetchUnreadCountsByLeagueIdPayload,
	MarkGroupChatsReadPayload,
	GroupCounts,
	GroupOwnerPlan,
	FetchGroupOwnerPlanPayload,
	CreateGroupSuccessPayload,
	CreateGroupFailurePayload,
	CommunityGroupsPage,
	JoinCommunityFailurePayload,
	JoinedCommunity,
	LeagueGuideView,
	FetchLeagueGuideStatusPayload,
	LeagueGuideStatusData,
	MarkLeagueGuideViewedPayload,
	MarkLeagueGuideViewedData,
	FantasyContestPodiumData,
	FantasyContestPodiumState,
	GroupManagerInvitation,
	GroupManagerSeatStatus,
	FetchManagerInvitationsPayload,
	ManagerInvitationsData,
	SendManagerInvitationPayload,
	CancelManagerInvitationPayload,
	RespondManagerInvitationPayload,
	RemoveGroupManagerPayload,
} from "@/lib/interfaces/interfaces";

type GroupState = {
	group: Group | null;
	leaderboard: LeaderboardData | null;
	leaderboardList: LeaderboardList | null;
	summary: GroupSummary | null;
	archivedLeaderboard: ArchivedLeaderboard | null;
	ArchiveLeaderboardList: ArchiveLeaderboardList | null;
	members: Members | null;
	session: SessionState | null;
	hasSeenIntro: boolean;
	loading: boolean;
	joinLoading: boolean;
	loadingLeaderboard: boolean;
	loadingArchivedLeaderboard: boolean;
	deleteLoading: boolean;
	leaveLoading: boolean;
	error: string | null;
	message: string | null;
	// Create-scoped mirrors of loading/error/message/group. See createGroupRequest.
	createLoading: boolean;
	createError: string | null;
	createErrorStatus: number | null;
	createMessage: string | null;
	createdGroup: Group | null;
	deleteMessage: string | null;
	leaveMessage: string | null;
	hasMoreLeaderboard: boolean;
	leaderboardPagination?: PaginationMetadata;
	/** The Feed tab.s Fantasy winners strip. Its own slot, guarded by groupId. */
	fantasyPodium: FantasyContestPodiumState;
	loadingMembers: boolean;
	membersPagination?: PaginationMetadata;
	hasMore: boolean;
	myGroups: GroupObject[] | null;
	// All the caller's groups (leagues + arenas) from GET /group — kept separate
	// from myGroups (leagues-only) so the home page can list both without changing
	// the Leagues-scoped consumers of myGroups.
	allGroups: GroupObject[] | null;
	allGroupsHasMore: boolean;
	allGroupsLoading: boolean;
	// League hub tabs. GET /group/owned-leagues is role='commissioner' only;
	// GET /group/joined-leagues is every OTHER role. Two independently paged
	// lists, each with its own page/hasMore/total — deliberately NOT one list
	// partitioned client-side, which would make both tab counts wrong as soon as
	// the first page didn't hold everything.
	ownedLeagues: GroupObject[] | null;
	ownedLeaguesLoading: boolean;
	ownedLeaguesError: string | null;
	ownedLeaguesHasMore: boolean;
	ownedLeaguesTotal: number;
	joinedLeagues: GroupObject[] | null;
	joinedLeaguesLoading: boolean;
	joinedLeaguesError: string | null;
	joinedLeaguesHasMore: boolean;
	joinedLeaguesTotal: number;
	// POST /group/join-league. `joinLeagueCrossType` is set when the code resolved
	// to an Arena (409) so the dialog can point at the Arenas tab instead of
	// showing a dead-end error.
	joinLeagueLoading: boolean;
	joinLeagueError: string | null;
	joinLeagueMessage: string | null;
	joinLeagueCrossType: boolean;
	joinLeagueNotFound: boolean;
	joinedLeague: JoinedCommunity | null;
	// The membership row returned by the last successful invite-code join, so
	// the join UI can tell WHICH community (and type) was joined.
	joinedGroup: { group_id: string; group_type?: GroupType } | null;
	chatMessages: ChatMessage[] | null;
	loadingChats: boolean;
	chatsHasMore: boolean;
	chatsNextCursor: string | null;
	loadingOlderChats: boolean;
	olderChats: ChatMessage[] | null;
	unreadCounts: number;
	groupsCounts: GroupCounts | null;
	ownerPlan: GroupOwnerPlan | null;
	// League Guide (GET/POST /group/league/guide). Single-tenant, so it carries
	// its own `leagueGuideForId` stamp: this slot decides whether a modal opens
	// over the page, and `state.group` is known to survive navigation between
	// groups. `leagueGuide*`-prefixed so it can never be confused with the Arena
	// guide on arenaSlice.
	leagueGuide: LeagueGuideView | null;
	leagueGuideForId: string | null;
	leagueGuideLoading: boolean;
	leagueGuideError: string | null;
	leagueGuideAckLoading: boolean;
	leagueGuideAckError: string | null;
	/* ---- Manager invitations (/group/manager-invitation*, /group/manager) ----
	 *
	 * ONE slot for BOTH community types, because the endpoints are one surface:
	 * a League manager and an Arena manager are the same group_members row. A
	 * per-type copy of this state would be two homes for one rule.
	 *
	 * `managerInvitationsForId` stamps which group the list belongs to, for the
	 * same reason the guides carry one — `state.group` survives navigation
	 * between groups, so an unstamped list renders the PREVIOUS Arena's pending
	 * invitations over this one's Settings panel.
	 *
	 * `seats` and `canInvite` are the server's answers verbatim. The seat rules
	 * (Free League = 0 seats, Arena tier = N, paused hosting = frozen) live in
	 * group_manager_seat_status() and are never re-derived here.
	 */
	managerInvitationsForId: string | null;
	managerInvitations: GroupManagerInvitation[] | null;
	managerSeats: GroupManagerSeatStatus | null;
	canInviteManager: boolean;
	managerInvitationsLoading: boolean;
	managerInvitationsError: string | null;
	/* Shared status for the OWNER's three writes — send / cancel / remove. Only
	 * one can run at a time, so they share one slot; the two id fields say WHICH
	 * row is busy so a roster can disable just that button. */
	managerActionLoading: boolean;
	managerActionInvitationId: string | null;
	managerActionUserId: string | null;
	managerActionError: string | null;
	managerActionMessage: string | null;
	/* The INVITEE's respond, kept in its OWN slot rather than sharing the one
	 * above. Not because the two can overlap — no one person is both sides of an
	 * invitation — but because their SCREENS can: the notifications drawer is
	 * mounted alongside the owner's Settings panel, and one shared slot means
	 * both components toast every outcome, including each other's. */
	managerRespondLoading: boolean;
	managerRespondInvitationId: string | null;
	managerRespondError: string | null;
	managerRespondMessage: string | null;
};

const initialState: GroupState = {
	group: null,
	leaderboard: null,
	leaderboardList: null,
	summary: null,
	archivedLeaderboard: null,
	ArchiveLeaderboardList: null,
	members: null,
	session: null,
	hasSeenIntro: false,
	loading: false,
	joinLoading: false,
	loadingLeaderboard: false,
	loadingArchivedLeaderboard: false,
	deleteLoading: false,
	error: null,
	message: null,
	createLoading: false,
	createError: null,
	createErrorStatus: null,
	createMessage: null,
	createdGroup: null,
	deleteMessage: null,
	leaveLoading: false,
	leaveMessage: null,
	hasMoreLeaderboard: false,
	fantasyPodium: { groupId: null, contests: null, loading: false, error: null },
	loadingMembers: false,
	hasMore: false,
	myGroups: null,
	allGroups: null,
	allGroupsHasMore: false,
	allGroupsLoading: false,
	ownedLeagues: null,
	ownedLeaguesLoading: false,
	ownedLeaguesError: null,
	ownedLeaguesHasMore: false,
	ownedLeaguesTotal: 0,
	joinedLeagues: null,
	joinedLeaguesLoading: false,
	joinedLeaguesError: null,
	joinedLeaguesHasMore: false,
	joinedLeaguesTotal: 0,
	joinLeagueLoading: false,
	joinLeagueError: null,
	joinLeagueMessage: null,
	joinLeagueCrossType: false,
	joinLeagueNotFound: false,
	joinedLeague: null,
	joinedGroup: null,
	chatMessages: null,
	loadingChats: false,
	chatsHasMore: true,
	chatsNextCursor: null,
	loadingOlderChats: false,
	olderChats: null,
	unreadCounts: 0,
	groupsCounts: null,
	ownerPlan: null,
	leagueGuide: null,
	leagueGuideForId: null,
	leagueGuideLoading: false,
	leagueGuideError: null,
	leagueGuideAckLoading: false,
	leagueGuideAckError: null,
	managerInvitationsForId: null,
	managerInvitations: null,
	managerSeats: null,
	canInviteManager: false,
	managerInvitationsLoading: false,
	managerInvitationsError: null,
	managerActionLoading: false,
	managerActionInvitationId: null,
	managerActionUserId: null,
	managerActionError: null,
	managerActionMessage: null,
	managerRespondLoading: false,
	managerRespondInvitationId: null,
	managerRespondError: null,
	managerRespondMessage: null,
};

const groupSlice = createSlice({
	name: "group",
	initialState,
	reducers: {

		// The create lifecycle owns dedicated fields on purpose. `state.loading` is
		// written by a dozen other request triads and `state.error`/`message`/`group`
		// by more still, so a background fetch settling mid-create used to flip this
		// screen's button, toast a foreign error, or fabricate a success card out of
		// a stale group plus somebody else's message.
		createGroupRequest: (state, action: PayloadAction<CreateGroupPayload>) => {
			void action;
			state.createLoading = true;
			state.createError = null;
			state.createErrorStatus = null;
			state.createMessage = null;
			state.createdGroup = null;
		},
		createGroupSuccess: (state, action: PayloadAction<CreateGroupSuccessPayload>) => {
			state.createLoading = false;
			state.createdGroup = action.payload.group ?? null;
			state.createMessage = action.payload.message ?? null;
		},
		createGroupFailure: (state, action: PayloadAction<CreateGroupFailurePayload>) => {
			state.createLoading = false;
			state.createError = action.payload.message;
			state.createErrorStatus = action.payload.status ?? null;
		},
		// A full reset, not a message clear: `createdGroup` IS the success signal, so
		// leaving it behind would latch a success screen onto the next mount.
		resetCreateGroupState(state) {
			state.createLoading = false;
			state.createError = null;
			state.createErrorStatus = null;
			state.createMessage = null;
			state.createdGroup = null;
		},

		fetchAllGroupsRequest: (state, action: PayloadAction<FetchGroupsParams | undefined>) => {
			void action;
			state.allGroupsLoading = true;
			state.error = null;
		},
		fetchAllGroupsSuccess: (state, action: PayloadAction<{ groups: GroupObject[], page: number, hasMore: boolean }>) => {
			state.allGroupsLoading = false;
			const { groups, page, hasMore } = action.payload;
			state.allGroupsHasMore = hasMore;
			if (page === 1) {
				state.allGroups = groups;
			} else {
				const existingIds = new Set(state.allGroups?.map(g => g.id) || []);
				const newUnique = groups.filter(g => !existingIds.has(g.id));
				state.allGroups = [...(state.allGroups || []), ...newUnique];
			}
		},
		fetchAllGroupFailure: (state, action) => {
			state.allGroupsLoading = false;
			state.error = action.payload;
		},
		clearFetchAllGroupMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchMyGroupsRequest: (state, action: PayloadAction<FetchMyGroupsPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchMyGroupsSuccess: (state, action: PayloadAction<{ groups: GroupObject[], page: number, hasMore: boolean }>) => {
			state.loading = false;
			const { groups, page, hasMore } = action.payload;
			state.hasMore = hasMore;
			if (page === 1) {
				state.myGroups = groups;
			} else {
				const existingIds = new Set(state.myGroups?.map(p => p.id) || []);
				const newUniquePicks = groups.filter(g => !existingIds.has(g.id));
				state.myGroups = [...(state.myGroups || []), ...newUniquePicks];
			}
		},
		fetchMyGroupFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchMyGroupMessage(state) {
			state.error = null;
			state.message = null;
		},

		// ---- League hub tabs (MVP2) -------------------------------------------
		// GET /group/owned-leagues — the "Hosting" tab.
		fetchOwnedLeaguesRequest: (state, action: PayloadAction<FetchMyGroupsPayload | undefined>) => {
			void action;
			state.ownedLeaguesLoading = true;
			state.ownedLeaguesError = null;
		},
		fetchOwnedLeaguesSuccess: (state, action: PayloadAction<CommunityGroupsPage>) => {
			const { groups, page, hasMore, total } = action.payload;
			state.ownedLeaguesLoading = false;
			state.ownedLeaguesHasMore = hasMore;
			state.ownedLeaguesTotal = total;
			state.ownedLeagues =
				page === 1 ? groups : mergeGroupPage(state.ownedLeagues, groups);
		},
		fetchOwnedLeaguesFailure: (state, action: PayloadAction<string>) => {
			state.ownedLeaguesLoading = false;
			state.ownedLeaguesError = action.payload;
		},

		// GET /group/joined-leagues — the "Participating" tab.
		fetchJoinedLeaguesRequest: (state, action: PayloadAction<FetchMyGroupsPayload | undefined>) => {
			void action;
			state.joinedLeaguesLoading = true;
			state.joinedLeaguesError = null;
		},
		fetchJoinedLeaguesSuccess: (state, action: PayloadAction<CommunityGroupsPage>) => {
			const { groups, page, hasMore, total } = action.payload;
			state.joinedLeaguesLoading = false;
			state.joinedLeaguesHasMore = hasMore;
			state.joinedLeaguesTotal = total;
			state.joinedLeagues =
				page === 1 ? groups : mergeGroupPage(state.joinedLeagues, groups);
		},
		fetchJoinedLeaguesFailure: (state, action: PayloadAction<string>) => {
			state.joinedLeaguesLoading = false;
			state.joinedLeaguesError = action.payload;
		},

		// POST /group/join-league. Scoped to this flow instead of reusing
		// `joinLoading`/`error`/`message`, which a dozen other triads also write —
		// the hub polls these to decide whether to navigate, so a foreign write
		// would push the user into an unrelated group.
		joinLeagueRequest: (state, action: PayloadAction<InviteCodePayload>) => {
			void action;
			state.joinLeagueLoading = true;
			state.joinLeagueError = null;
			state.joinLeagueMessage = null;
			state.joinLeagueCrossType = false;
			state.joinLeagueNotFound = false;
			state.joinedLeague = null;
		},
		joinLeagueSuccess: (state, action: PayloadAction<{ message?: string | null; group?: JoinedCommunity | null }>) => {
			state.joinLeagueLoading = false;
			state.joinLeagueMessage = action.payload.message ?? "League joined successfully.";
			state.joinedLeague = action.payload.group ?? null;
		},
		joinLeagueFailure: (state, action: PayloadAction<JoinCommunityFailurePayload>) => {
			state.joinLeagueLoading = false;
			state.joinLeagueError = action.payload.message;
			// A DEFINITE wrong-tab answer: 409 carrying the other type. `already a
			// member` is also a 409 but carries no group_type, so it can't match.
			//
			// The server does not send this yet — joinLeagueByInviteCode collapses
			// JOIN_GROUP_OUTCOME.wrongType into the same 404 as an unknown code,
			// discarding the group_type the RPC already returns. Kept because the
			// wiring is correct the moment that controller returns 409 + data.group_type.
			state.joinLeagueCrossType =
				action.payload.status === 409 && action.payload.group_type === "arena";
			// Until then, 404 is ambiguous: it means "no League has this code", which
			// covers both a typo AND a valid Arena code. `notFound` drives a hedged
			// prompt that offers the Arena tab without claiming the code is bogus.
			state.joinLeagueNotFound = action.payload.status === 404;
		},
		clearJoinLeagueState(state) {
			state.joinLeagueLoading = false;
			state.joinLeagueError = null;
			state.joinLeagueMessage = null;
			state.joinLeagueCrossType = false;
			state.joinLeagueNotFound = false;
			state.joinedLeague = null;
		},

		fetchGroupByIdRequest: (state, action: PayloadAction<FetchGroupByIdPayload | undefined>) => {
			// Drop the previously loaded group as soon as a DIFFERENT one is asked for.
			// Without this the old record stayed readable for the whole in-flight window,
			// and consumers that BRANCH on it acted on the wrong group: the League page
			// guards with `group.group_type === "arena"` and would router.replace to
			// `/arena/${group.id}` — the PREVIOUS arena's id — before the League it was
			// asked for ever arrived. Arena ids legitimately land in this slice (the
			// arena contest-create and plan pages both fetch by id), so the stale value
			// is an arena often enough for that redirect to fire.
			//
			// Scoped to an id CHANGE so a same-group refetch keeps its row on screen and
			// does not flash a skeleton.
			const requestedGroupId = action.payload?.groupId;
			if (requestedGroupId && state.group?.id !== requestedGroupId) {
				state.group = null;
			}
			state.loading = true;
			state.error = null;
		},
		fetchGroupByIdSuccess: (state, action) => {
			state.loading = false;
			state.group = action.payload.group;
		},
		fetchGroupByIdFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchGroupByIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		joinedGroupByInviteCodeRequest: (state, action: PayloadAction<InviteCodePayload>) => {
			void action;
			state.joinLoading = true;
			state.error = null;
		},
		joinedGroupByInviteCodeSuccess: (state, action) => {
			state.joinLoading = false;
			state.group = action.payload;
			state.message = action.payload?.message;
			state.joinedGroup = action.payload?.data?.group ?? null;
		},
		joinedGroupByInviteCodeFailure: (state, action) => {
			state.joinLoading = false;
			state.error = action.payload;
		},
		clearJoinedGroupByInviteCodeMessage(state) {
			state.error = null;
			state.message = null;
			state.joinedGroup = null;
		},

		removeGroupMemberRequest: (state, action: PayloadAction<MemberModificationPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		removeGroupMemberSuccess: (state, action) => {
			state.loading = false;
			state.message = action.payload?.message;
		},
		removeGroupMemberFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearRemoveGroupMemberMessage(state) {
			state.error = null;
			state.message = null;
		},

		updateGroupMemberRoleRequest: (state, action: PayloadAction<UpdateMemberRolePayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		updateGroupMemberRoleSuccess: (state, action) => {
			state.loading = false;
			state.message = action.payload?.message;
		},
		updateGroupMemberRoleFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateGroupMemberRoleMessage(state) {
			state.error = null;
			state.message = null;
		},

		initialGroupDeleteRequest: (state, action: PayloadAction<GroupDeletePayload>) => {
			void action;
			state.deleteLoading = true;
			state.error = null;
		},
		initialGroupDeleteSuccess: (state, action) => {
			state.deleteLoading = false;
			state.message = action.payload?.message;
		},
		initialGroupDeleteFailure: (state, action) => {
			state.deleteLoading = false;
			state.error = action.payload;
		},
		clearInitialGroupDeleteMessage(state) {
			state.error = null;
			state.message = null;
		},

		confirmDeleteGroupRequest: (state, action: PayloadAction<ConfirmDeletePayload>) => {
			void action;
			state.deleteLoading = true;
			state.error = null;
		},
		confirmDeleteGroupSuccess: (state, action) => {
			state.deleteLoading = false;
			state.deleteMessage = action.payload?.message;
		},
		confirmDeleteGroupFailure: (state, action) => {
			state.deleteLoading = false;
			state.error = action.payload;
		},
		clearConfirmDeleteGroupMessage(state) {
			state.error = null;
			state.deleteMessage = null;
		},


		//Leaderboard
		fetchLeaderboardRequest: (state, action: PayloadAction<LeaderboardPayload | undefined>) => {
			void action;
			state.loadingLeaderboard = true;
			state.error = null;
		},
		fetchLeaderboardSuccess: (state, action: PayloadAction<LeaderboardData>) => {
			state.loadingLeaderboard = false;
			const { leaderboard, pagination, slips } = action.payload || {};
			const page = pagination?.page || 1;

			if (page === 1) {
				state.leaderboard = action.payload;
			} else if (state.leaderboard) {
				// Append new leaderboard entries
				state.leaderboard = {
					...state.leaderboard,
					leaderboard: [
						...(state.leaderboard.leaderboard || []),
						...(leaderboard || []),
					],
					pagination: pagination,
					// Optional: update slips if they are also paginated or part of the response
					slips: slips || state.leaderboard.slips,
				};
			}
			state.hasMoreLeaderboard = pagination ? pagination.page < pagination.total_pages : false;
			state.leaderboardPagination = pagination;
		},
		fetchLeaderboardFailure: (state, action) => {
			state.loadingLeaderboard = false;
			state.error = action.payload;
		},
		clearFetchLeaderboardMessage(state) {
			state.error = null;
			state.message = null;
		},

		/* ---- The Fantasy results board — /contest-leaderboard/list/finalized/podium ----
		 *
		 * Its own slot rather than a field on `leaderboard`, and guarded by its
		 * own `groupId`: the Feed renders on the same tick the group changes, so
		 * an unguarded read would show the previous League's winners until the
		 * refetch landed.
		 */
		fetchFantasyPodiumsRequest: (state, action: PayloadAction<{ group_id: string; page?: number; limit?: number }>) => {
			if (state.fantasyPodium.groupId !== action.payload.group_id) {
				state.fantasyPodium = { groupId: null, contests: null, loading: false, error: null };
			}
			state.fantasyPodium.groupId = action.payload.group_id;
			state.fantasyPodium.loading = true;
			state.fantasyPodium.error = null;
		},
		fetchFantasyPodiumsSuccess: (state, action: PayloadAction<FantasyContestPodiumData | undefined>) => {
			// A reply for a group we have since navigated away from is dropped
			// rather than written over the current one.
			if (!action.payload || state.fantasyPodium.groupId !== action.payload.group_id) return;
			state.fantasyPodium.loading = false;
			state.fantasyPodium.error = null;
			state.fantasyPodium.contests = action.payload.contests ?? [];
		},
		fetchFantasyPodiumsFailure: (state, action: PayloadAction<string>) => {
			state.fantasyPodium.loading = false;
			state.fantasyPodium.error = action.payload;
		},

		// Archived Leaderboard
		fetchArchivedLeaderboardListRequest: (state, action: PayloadAction<FetchArchivedLeaderBoardListPayload | undefined>) => {
			void action;
			state.loadingArchivedLeaderboard = true;
			state.error = null;
		},
		fetchArchivedLeaderboardListSuccess: (state, action) => {
			state.loadingArchivedLeaderboard = false;
			state.ArchiveLeaderboardList = action.payload;
		},
		fetchArchivedLeaderboardListFailure: (state, action) => {
			state.loadingArchivedLeaderboard = false;
			state.error = action.payload;
		},
		clearFetchArchivedLeaderboardListMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchArchivedLeaderboardByIdRequest: (state, action: PayloadAction<FetchArchivedLeaderBoardsPayload | undefined>) => {
			void action;
			state.loadingArchivedLeaderboard = true;
			state.error = null;
		},
		fetchArchivedLeaderboardByIdSuccess: (state, action) => {
			state.loadingArchivedLeaderboard = false;
			state.archivedLeaderboard = action.payload;
		},
		fetchArchivedLeaderboardByIdFailure: (state, action) => {
			state.loadingArchivedLeaderboard = false;
			state.error = action.payload;
		},
		clearFetchArchivedLeaderboardByIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		clearLeaderboardData(state) {
			state.archivedLeaderboard = null;
			state.leaderboard = null;
		},

		updateGroupRequest: (state, action: PayloadAction<UpdateGroupPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		updateGroupSuccess: (state, action) => {
			state.loading = false;
			state.group = action.payload;
			state.message = action.payload?.message;
		},
		updateGroupFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateGroupMessage(state) {
			state.error = null;
			state.message = null;
		},

		// Group Summary
		fetchGroupSummaryRequest: (state, action) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchGroupSummarySuccess: (state, action) => {
			state.loading = false;
			state.summary = action.payload?.summary;
		},
		fetchGroupSummaryFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchGroupSummaryMessage(state) {
			state.error = null;
			state.message = null;
		},

		// Leaderboard
		fetchAllLeaderboardsRequest: (state, action: PayloadAction<FetchLeaderBoardsPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchAllLeaderboardsSuccess: (state, action) => {
			state.loading = false;
			state.leaderboardList = action.payload?.leaderboards;
		},
		fetchAllLeaderboardsFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchAllLeaderboardsMessage(state) {
			state.error = null;
			state.message = null;
		},

		createNewLeaderboardRequest: (state, action: PayloadAction<CreateNewLeaderboardPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		createNewLeaderboardSuccess: (state, action) => {
			state.loading = false;
			state.leaderboardList = action.payload?.leaderboards;
			state.message = action.payload?.message;
		},
		createNewLeaderboardFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearCreateNewLeaderboardMessage(state) {
			state.error = null;
			state.message = null;
		},

		updateLeaderboardRequest: (state, action: PayloadAction<UpdateLeaderboardPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		updateLeaderboardSuccess: (state, action) => {
			state.loading = false;
			state.leaderboardList = action.payload?.leaderboards;
			state.message = action.payload?.message;
		},
		updateLeaderboardFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateLeaderboardMessage(state) {
			state.error = null;
			state.message = null;
		},

		updateLeaderboardToArchivedRequest: (state, action: PayloadAction<UpdateLeaderboardToArchivedPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		updateLeaderboardToArchivedSuccess: (state, action) => {
			state.loading = false;
			state.leaderboardList = action.payload?.leaderboards;
			state.message = action.payload?.message;
		},
		updateLeaderboardToArchivedFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateLeaderboardToArchivedMessage(state) {
			state.error = null;
			state.message = null;
		},

		leaveGroupRequest: (state, action: PayloadAction<LeaveGroupPayload | undefined>) => {
			void action;
			state.leaveLoading = true;
			state.error = null;
		},
		leaveGroupSuccess: (state, action) => {
			state.leaveLoading = false;
			state.leaveMessage = action.payload?.message;
		},
		leaveGroupFailure: (state, action) => {
			state.leaveLoading = false;
			state.error = action.payload;
		},
		clearLeaveGroupMessage(state) {
			state.error = null;
			state.leaveMessage = null;
		},

		enableSecondaryLeaderboardRequest: (state, action: PayloadAction<EnableSecondaryLeaderboardPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		enableSecondaryLeaderboardSuccess: (state, action) => {
			state.loading = false;
			state.message = action.payload?.message;
		},
		enableSecondaryLeaderboardFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearEnableSecondaryLeaderboardMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchGroupMembersByGroupIdRequest: (state, action: PayloadAction<FetchGroupMembersPayload>) => {
			void action;
			state.loadingMembers = true;
			state.error = null;
		},
		fetchGroupMembersByGroupIdSuccess: (state, action: PayloadAction<MembersData>) => {
			state.loadingMembers = false;
			const { members, pagination } = action.payload || {};
			const page = pagination?.page || 1;

			if (page === 1) {
				state.members = members;
			} else {
				state.members = [
					...(state.members || []),
					...(members || []),
				];
			}
			state.membersPagination = pagination;
		},
		fetchGroupMembersByGroupIdFailure: (state, action) => {
			state.loadingMembers = false;
			state.error = action.payload;
		},
		clearFetchGroupMembersByGroupIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchGroupChatsByGroupIdRequest: (state, action: PayloadAction<FetchGroupChatsPayload>) => {
			void action;
			state.loadingChats = true;
			state.error = null;
			// Reset cursor pagination for the (new) group.
			state.chatsHasMore = true;
			state.chatsNextCursor = null;
			state.olderChats = null;
			state.loadingOlderChats = false;
		},
		fetchGroupChatsByGroupIdSuccess: (state, action: PayloadAction<FetchGroupChatsResponse>) => {
			state.loadingChats = false;
			state.chatMessages = action.payload.messages;
			state.chatsHasMore = action.payload.hasMore;
			state.chatsNextCursor = action.payload.nextCursor;
		},
		fetchGroupChatsByGroupIdFailure: (state, action) => {
			state.loadingChats = false;
			state.error = action.payload;
		},
		clearFetchGroupChatsByGroupIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		loadOlderGroupChatsRequest: (state, action: PayloadAction<FetchGroupChatsPayload>) => {
			void action;
			state.loadingOlderChats = true;
			state.error = null;
		},
		loadOlderGroupChatsSuccess: (state, action: PayloadAction<FetchGroupChatsResponse>) => {
			state.loadingOlderChats = false;
			state.olderChats = action.payload.messages;
			state.chatsHasMore = action.payload.hasMore;
			state.chatsNextCursor = action.payload.nextCursor;
		},
		loadOlderGroupChatsFailure: (state, action) => {
			state.loadingOlderChats = false;
			state.error = action.payload;
		},
		clearOlderGroupChats: (state) => {
			state.olderChats = null;
		},

		// Chat
		sendMessageRequest: (state, action: PayloadAction<SendMessagePayload>) => {
			void action;
			state.error = null;
		},
		sendMessageSuccess: (state, action) => {
			// state.chatMessages = action.payload.messages;
		},
		sendMessageFailure: (state, action) => {
			state.error = action.payload;
		},
		clearSendMessageMessage(state) {
			state.error = null;
			state.message = null;
		},

		deleteMessageByIdRequest: (state, action: PayloadAction<DeleteMessagePayload>) => {
			void action;
			state.error = null;
		},
		deleteMessageByIdSuccess: (state, action) => {
			state.message = action.payload.message;
		},
		deleteMessageByIdFailure: (state, action) => {
			state.error = action.payload;
		},
		clearDeleteMessageByIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		markGroupChatsReadRequest: (state, action: PayloadAction<MarkGroupChatsReadPayload>) => {
			void action;
			state.error = null;
			state.unreadCounts = 0;
		},
		markGroupChatsReadSuccess: (state, action) => {
			void action;
			state.unreadCounts = 0;
		},
		markGroupChatsReadFailure: (state, action) => {
			state.error = action.payload;
		},
		clearMarkGroupChatsReadMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchUnreadCountsByLeagueIdRequest: (state, action: PayloadAction<FetchUnreadCountsByLeagueIdPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchUnreadCountsByLeagueIdSuccess: (state, action) => {
			state.loading = false;
			state.unreadCounts = action.payload?.counts;
		},
		fetchUnreadCountsByLeagueIdFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchUnreadCountsByLeagueIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchOwnGroupsCountsRequest: (state, action) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchOwnGroupsCountsSuccess: (state, action) => {
			state.loading = false;
			state.groupsCounts = action.payload;
			setStoredPlan(action.payload?.user?.plan);
		},
		fetchOwnGroupsCountsFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchOwnGroupsCountsMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchGroupOwnerPlanDetailsRequest: (state, action: PayloadAction<FetchGroupOwnerPlanPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchGroupOwnerPlanDetailsSuccess: (state, action) => {
			state.loading = false;
			state.ownerPlan = action.payload.owner;
		},
		fetchGroupOwnerPlanDetailsFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchGroupOwnerPlanDetailsMessage(state) {
			state.error = null;
			state.message = null;
		},

		/* --------------------------------------------------------------------
		 * LEAGUE GUIDE — should this member be shown the welcome walkthrough?
		 *
		 * Mirrors arenaSlice's guide reducers. The three load-bearing rules are
		 * commented individually below; they are the reason this is not a
		 * generic request/success/failure triad.
		 * ------------------------------------------------------------------ */
		fetchLeagueGuideStatusRequest: (
			state,
			action: PayloadAction<FetchLeagueGuideStatusPayload>
		) => {
			// Dropped at REQUEST time on an id mismatch. This slot decides
			// whether a modal opens over the page, so the previous League's
			// answer must not survive into this one's in-flight window.
			if (state.leagueGuideForId !== action.payload.league_id) {
				state.leagueGuide = null;
			}
			state.leagueGuideForId = action.payload.league_id;
			state.leagueGuideLoading = true;
			state.leagueGuideError = null;
		},
		fetchLeagueGuideStatusSuccess: (
			state,
			action: PayloadAction<LeagueGuideStatusData>
		) => {
			state.leagueGuideLoading = false;
			state.leagueGuideError = null;
			state.leagueGuide = action.payload.guide;
			state.leagueGuideForId = action.payload.league?.id ?? state.leagueGuideForId;
		},
		fetchLeagueGuideStatusFailure: (state, action: PayloadAction<string>) => {
			state.leagueGuideLoading = false;
			state.leagueGuideError = action.payload;
			// Null, never a synthesised `should_show_guide: false`: a failed read
			// means UNKNOWN, and the screen's own rule is "open only on a
			// definite yes", so this stays closed without pretending it was told.
			state.leagueGuide = null;
		},

		markLeagueGuideViewedRequest: (
			state,
			action: PayloadAction<MarkLeagueGuideViewedPayload>
		) => {
			state.leagueGuideAckLoading = true;
			state.leagueGuideAckError = null;
			// Optimistic, and deliberately so: the dialog closes on the click,
			// and leaving `should_show_guide` true until the round trip lands
			// would let the auto-open effect fire again behind it.
			if (state.leagueGuide && state.leagueGuideForId === action.payload.league_id) {
				state.leagueGuide = {
					...state.leagueGuide,
					has_viewed_guide: true,
					should_show_guide: false,
					has_viewed_any_version: true,
					status: action.payload.status ?? "completed",
				};
			}
		},
		markLeagueGuideViewedSuccess: (
			state,
			action: PayloadAction<MarkLeagueGuideViewedData>
		) => {
			state.leagueGuideAckLoading = false;
			state.leagueGuideAckError = null;
			// The server echoes the row it wrote in the same shape the GET
			// returns, so this replaces the optimistic guess with the truth —
			// timestamps included — without a follow-up read.
			if (state.leagueGuideForId === action.payload.league?.id) {
				state.leagueGuide = action.payload.guide;
			}
		},
		markLeagueGuideViewedFailure: (state, action: PayloadAction<string>) => {
			state.leagueGuideAckLoading = false;
			state.leagueGuideAckError = action.payload;
			// The optimistic flip is NOT rolled back. Re-opening the guide over
			// a member who just closed it is worse than showing it once more on
			// their next visit, which is what an unrecorded acknowledgement
			// costs.
		},

		/* --------------------------------------------------------------------
		 * MANAGER INVITATIONS
		 *
		 * The four writes never patch the list themselves. Send answers 202 with
		 * a PENDING invitation and cancel/remove answer with a settled one, but
		 * every one of them also moves `seats` — and seats is the number the
		 * panel's badge and its disabled Invite button are drawn from. Re-reading
		 * the list is the only way to keep the row and the seat maths from
		 * disagreeing, so the saga re-reads and these reducers only carry status.
		 * ------------------------------------------------------------------ */
		fetchManagerInvitationsRequest: (
			state,
			action: PayloadAction<FetchManagerInvitationsPayload>
		) => {
			// Drop another group's list on sight. Without this the previous
			// community's pending invitations render over this one for as long
			// as the fetch is in flight.
			if (state.managerInvitationsForId !== action.payload.group_id) {
				state.managerInvitations = null;
				state.managerSeats = null;
				state.canInviteManager = false;
			}
			state.managerInvitationsForId = action.payload.group_id;
			state.managerInvitationsLoading = true;
			state.managerInvitationsError = null;
		},
		fetchManagerInvitationsSuccess: (
			state,
			action: PayloadAction<{ group_id: string; data: ManagerInvitationsData }>
		) => {
			state.managerInvitationsLoading = false;
			state.managerInvitationsError = null;
			// A response that landed after the user moved on is dropped, not
			// rendered against the group they are looking at now.
			if (state.managerInvitationsForId !== action.payload.group_id) return;
			state.managerInvitations = action.payload.data.invitations ?? [];
			state.managerSeats = action.payload.data.seats ?? null;
			state.canInviteManager = Boolean(action.payload.data.can_invite);
		},
		fetchManagerInvitationsFailure: (state, action: PayloadAction<string>) => {
			state.managerInvitationsLoading = false;
			state.managerInvitationsError = action.payload;
			// Nulled, not left stale: a 402/403 here means the caller may not
			// see this list at all, and the last group's seats are not an answer.
			state.managerInvitations = null;
			state.managerSeats = null;
			state.canInviteManager = false;
		},

		sendManagerInvitationRequest: (
			state,
			action: PayloadAction<SendManagerInvitationPayload>
		) => {
			state.managerActionLoading = true;
			state.managerActionUserId = action.payload.user_id;
			state.managerActionInvitationId = null;
			state.managerActionError = null;
			state.managerActionMessage = null;
		},
		cancelManagerInvitationRequest: (
			state,
			action: PayloadAction<CancelManagerInvitationPayload>
		) => {
			state.managerActionLoading = true;
			state.managerActionInvitationId = action.payload.invitation_id;
			state.managerActionUserId = null;
			state.managerActionError = null;
			state.managerActionMessage = null;
		},
		removeGroupManagerRequest: (
			state,
			action: PayloadAction<RemoveGroupManagerPayload>
		) => {
			state.managerActionLoading = true;
			state.managerActionUserId = action.payload.user_id;
			state.managerActionInvitationId = null;
			state.managerActionError = null;
			state.managerActionMessage = null;
		},
		/** THE INVITEE's side, dispatched from Notifications — its own slot. */
		respondManagerInvitationRequest: (
			state,
			action: PayloadAction<RespondManagerInvitationPayload>
		) => {
			state.managerRespondLoading = true;
			state.managerRespondInvitationId = action.payload.invitation_id;
			state.managerRespondError = null;
			state.managerRespondMessage = null;
		},
		managerRespondSuccess: (
			state,
			action: PayloadAction<{ message?: string } | undefined>
		) => {
			state.managerRespondLoading = false;
			state.managerRespondInvitationId = null;
			state.managerRespondMessage = action.payload?.message ?? null;
		},
		managerRespondFailure: (state, action: PayloadAction<string>) => {
			state.managerRespondLoading = false;
			state.managerRespondInvitationId = null;
			state.managerRespondError = action.payload;
		},
		clearManagerRespondMessage: (state) => {
			state.managerRespondError = null;
			state.managerRespondMessage = null;
		},
		managerActionSuccess: (
			state,
			action: PayloadAction<{ message?: string } | undefined>
		) => {
			state.managerActionLoading = false;
			state.managerActionInvitationId = null;
			state.managerActionUserId = null;
			state.managerActionMessage = action.payload?.message ?? null;
		},
		managerActionFailure: (state, action: PayloadAction<string>) => {
			state.managerActionLoading = false;
			state.managerActionInvitationId = null;
			state.managerActionUserId = null;
			state.managerActionError = action.payload;
		},
		clearManagerActionMessage: (state) => {
			state.managerActionError = null;
			state.managerActionMessage = null;
		},
	},
});

export const {
	createGroupRequest,
	createGroupSuccess,
	createGroupFailure,
	resetCreateGroupState,
	fetchAllGroupsRequest,
	fetchAllGroupsSuccess,
	fetchAllGroupFailure,
	clearFetchAllGroupMessage,
	fetchOwnedLeaguesRequest,
	fetchOwnedLeaguesSuccess,
	fetchOwnedLeaguesFailure,
	fetchJoinedLeaguesRequest,
	fetchJoinedLeaguesSuccess,
	fetchJoinedLeaguesFailure,
	joinLeagueRequest,
	joinLeagueSuccess,
	joinLeagueFailure,
	clearJoinLeagueState,
	fetchGroupByIdRequest,
	fetchGroupByIdSuccess,
	fetchGroupByIdFailure,
	clearFetchGroupByIdMessage,
	joinedGroupByInviteCodeRequest,
	joinedGroupByInviteCodeFailure,
	joinedGroupByInviteCodeSuccess,
	clearJoinedGroupByInviteCodeMessage,
	removeGroupMemberRequest,
	removeGroupMemberSuccess,
	removeGroupMemberFailure,
	clearRemoveGroupMemberMessage,
	updateGroupMemberRoleRequest,
	updateGroupMemberRoleSuccess,
	updateGroupMemberRoleFailure,
	clearUpdateGroupMemberRoleMessage,
	initialGroupDeleteRequest,
	initialGroupDeleteSuccess,
	initialGroupDeleteFailure,
	clearInitialGroupDeleteMessage,
	confirmDeleteGroupRequest,
	confirmDeleteGroupSuccess,
	confirmDeleteGroupFailure,
	clearConfirmDeleteGroupMessage,
	fetchLeaderboardRequest,
	fetchLeaderboardSuccess,
	fetchLeaderboardFailure,
	clearFetchLeaderboardMessage,
	fetchFantasyPodiumsRequest,
	fetchFantasyPodiumsSuccess,
	fetchFantasyPodiumsFailure,
	fetchArchivedLeaderboardListRequest,
	fetchArchivedLeaderboardListSuccess,
	fetchArchivedLeaderboardListFailure,
	clearFetchArchivedLeaderboardListMessage,
	fetchArchivedLeaderboardByIdRequest,
	fetchArchivedLeaderboardByIdSuccess,
	fetchArchivedLeaderboardByIdFailure,
	clearFetchArchivedLeaderboardByIdMessage,
	updateGroupRequest,
	updateGroupSuccess,
	updateGroupFailure,
	clearUpdateGroupMessage,
	clearLeaderboardData,
	fetchGroupSummaryRequest,
	fetchGroupSummarySuccess,
	fetchGroupSummaryFailure,
	clearFetchGroupSummaryMessage,
	fetchAllLeaderboardsRequest,
	fetchAllLeaderboardsSuccess,
	fetchAllLeaderboardsFailure,
	clearFetchAllLeaderboardsMessage,
	createNewLeaderboardRequest,
	createNewLeaderboardSuccess,
	createNewLeaderboardFailure,
	clearCreateNewLeaderboardMessage,
	updateLeaderboardRequest,
	updateLeaderboardSuccess,
	updateLeaderboardFailure,
	clearUpdateLeaderboardMessage,
	leaveGroupRequest,
	leaveGroupSuccess,
	leaveGroupFailure,
	clearLeaveGroupMessage,
	updateLeaderboardToArchivedRequest,
	updateLeaderboardToArchivedSuccess,
	updateLeaderboardToArchivedFailure,
	clearUpdateLeaderboardToArchivedMessage,
	enableSecondaryLeaderboardRequest,
	enableSecondaryLeaderboardSuccess,
	enableSecondaryLeaderboardFailure,
	clearEnableSecondaryLeaderboardMessage,
	fetchGroupMembersByGroupIdRequest,
	fetchGroupMembersByGroupIdSuccess,
	fetchGroupMembersByGroupIdFailure,
	clearFetchGroupMembersByGroupIdMessage,
	fetchMyGroupsRequest,
	fetchMyGroupsSuccess,
	fetchMyGroupFailure,
	clearFetchMyGroupMessage,
	fetchGroupChatsByGroupIdRequest,
	fetchGroupChatsByGroupIdSuccess,
	fetchGroupChatsByGroupIdFailure,
	clearFetchGroupChatsByGroupIdMessage,
	loadOlderGroupChatsRequest,
	loadOlderGroupChatsSuccess,
	loadOlderGroupChatsFailure,
	clearOlderGroupChats,
	sendMessageRequest,
	sendMessageSuccess,
	sendMessageFailure,
	clearSendMessageMessage,
	deleteMessageByIdRequest,
	deleteMessageByIdSuccess,
	deleteMessageByIdFailure,
	clearDeleteMessageByIdMessage,
	fetchUnreadCountsByLeagueIdRequest,
	fetchUnreadCountsByLeagueIdSuccess,
	fetchUnreadCountsByLeagueIdFailure,
	clearFetchUnreadCountsByLeagueIdMessage,
	markGroupChatsReadRequest,
	markGroupChatsReadSuccess,
	markGroupChatsReadFailure,
	clearMarkGroupChatsReadMessage,
	fetchOwnGroupsCountsRequest,
	fetchOwnGroupsCountsSuccess,
	fetchOwnGroupsCountsFailure,
	clearFetchOwnGroupsCountsMessage,
	fetchGroupOwnerPlanDetailsRequest,
	fetchGroupOwnerPlanDetailsSuccess,
	fetchGroupOwnerPlanDetailsFailure,
	clearFetchGroupOwnerPlanDetailsMessage,
	fetchLeagueGuideStatusRequest,
	fetchLeagueGuideStatusSuccess,
	fetchLeagueGuideStatusFailure,
	markLeagueGuideViewedRequest,
	markLeagueGuideViewedSuccess,
	markLeagueGuideViewedFailure,
	fetchManagerInvitationsRequest,
	fetchManagerInvitationsSuccess,
	fetchManagerInvitationsFailure,
	sendManagerInvitationRequest,
	cancelManagerInvitationRequest,
	respondManagerInvitationRequest,
	removeGroupManagerRequest,
	managerActionSuccess,
	managerActionFailure,
	clearManagerActionMessage,
	managerRespondSuccess,
	managerRespondFailure,
	clearManagerRespondMessage,
} = groupSlice.actions;

export default groupSlice.reducer;
