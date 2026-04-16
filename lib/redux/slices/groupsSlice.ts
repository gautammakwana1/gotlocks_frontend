import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
	Leaderboard,
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
	deleteMessage: string | null;
	leaveMessage: string | null;
	hasMoreLeaderboard: boolean;
	leaderboardPagination?: PaginationMetadata;
	loadingMembers: boolean;
	membersPagination?: PaginationMetadata;
	hasMore: boolean;
	myGroups: GroupObject[] | null;
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
	deleteMessage: null,
	leaveLoading: false,
	leaveMessage: null,
	hasMoreLeaderboard: false,
	loadingMembers: false,
	hasMore: false,
	myGroups: null,
};

const groupSlice = createSlice({
	name: "group",
	initialState,
	reducers: {

		createGroupRequest: (state, action: PayloadAction<CreateGroupPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		createGroupSuccess: (state, action) => {
			state.loading = false;
			state.group = action.payload?.data.group;
			state.message = action.payload?.message;
		},
		createGroupFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearCreateGroupMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchAllGroupsRequest: (state, action: PayloadAction<FetchGroupsParams | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchAllGroupsSuccess: (state, action) => {
			state.loading = false;
			state.group = action.payload;
		},
		fetchAllGroupFailure: (state, action) => {
			state.loading = false;
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

		fetchGroupByIdRequest: (state, action: PayloadAction<FetchGroupByIdPayload | undefined>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchGroupByIdSuccess: (state, action) => {
			state.loading = false;
			state.group = action.payload;
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
		},
		joinedGroupByInviteCodeFailure: (state, action) => {
			state.joinLoading = false;
			state.error = action.payload;
		},
		clearJoinedGroupByInviteCodeMessage(state) {
			state.error = null;
			state.message = null;
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
	},
});

export const {
	createGroupRequest,
	createGroupSuccess,
	createGroupFailure,
	clearCreateGroupMessage,
	fetchAllGroupsRequest,
	fetchAllGroupsSuccess,
	fetchAllGroupFailure,
	clearFetchAllGroupMessage,
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
} = groupSlice.actions;

export default groupSlice.reducer;
