import { call, put, select, takeLatest, takeLeading } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import { confirmDeleteGroupFailure, confirmDeleteGroupRequest, confirmDeleteGroupSuccess, createGroupFailure, createGroupRequest, createGroupSuccess, createNewLeaderboardFailure, createNewLeaderboardRequest, createNewLeaderboardSuccess, enableSecondaryLeaderboardFailure, enableSecondaryLeaderboardRequest, enableSecondaryLeaderboardSuccess, fetchAllGroupFailure, fetchAllGroupsRequest, fetchAllGroupsSuccess, fetchAllLeaderboardsFailure, fetchAllLeaderboardsRequest, fetchAllLeaderboardsSuccess, fetchArchivedLeaderboardByIdFailure, fetchArchivedLeaderboardByIdRequest, fetchArchivedLeaderboardByIdSuccess, fetchArchivedLeaderboardListFailure, fetchArchivedLeaderboardListRequest, fetchArchivedLeaderboardListSuccess, fetchGroupByIdFailure, fetchGroupByIdRequest, fetchGroupByIdSuccess, fetchGroupChatsByGroupIdFailure, fetchGroupChatsByGroupIdRequest, fetchGroupChatsByGroupIdSuccess, loadOlderGroupChatsRequest, loadOlderGroupChatsSuccess, loadOlderGroupChatsFailure, fetchGroupMembersByGroupIdFailure, fetchGroupMembersByGroupIdRequest, fetchGroupMembersByGroupIdSuccess, fetchGroupSummaryFailure, fetchGroupSummaryRequest, fetchGroupSummarySuccess, fetchLeaderboardFailure, fetchLeaderboardRequest, fetchLeaderboardSuccess, fetchMyGroupFailure, fetchMyGroupsRequest, fetchMyGroupsSuccess, initialGroupDeleteFailure, initialGroupDeleteRequest, initialGroupDeleteSuccess, joinedGroupByInviteCodeFailure, joinedGroupByInviteCodeRequest, joinedGroupByInviteCodeSuccess, leaveGroupFailure, leaveGroupRequest, leaveGroupSuccess, removeGroupMemberFailure, removeGroupMemberRequest, removeGroupMemberSuccess, sendMessageFailure, sendMessageRequest, sendMessageSuccess, updateGroupFailure, updateGroupMemberRoleFailure, updateGroupMemberRoleRequest, updateGroupMemberRoleSuccess, updateGroupRequest, updateGroupSuccess, updateLeaderboardFailure, updateLeaderboardRequest, updateLeaderboardSuccess, updateLeaderboardToArchivedFailure, updateLeaderboardToArchivedRequest, updateLeaderboardToArchivedSuccess, deleteMessageByIdSuccess, deleteMessageByIdFailure, deleteMessageByIdRequest, markGroupChatsReadSuccess, markGroupChatsReadFailure, markGroupChatsReadRequest, fetchUnreadCountsByLeagueIdSuccess, fetchUnreadCountsByLeagueIdFailure, fetchUnreadCountsByLeagueIdRequest, fetchOwnGroupsCountsSuccess, fetchOwnGroupsCountsFailure, fetchOwnGroupsCountsRequest, fetchGroupOwnerPlanDetailsSuccess, fetchGroupOwnerPlanDetailsFailure, fetchGroupOwnerPlanDetailsRequest, fetchOwnedLeaguesRequest, fetchOwnedLeaguesSuccess, fetchOwnedLeaguesFailure, fetchJoinedLeaguesRequest, fetchJoinedLeaguesSuccess, fetchJoinedLeaguesFailure, joinLeagueRequest, joinLeagueSuccess, joinLeagueFailure, fetchLeagueGuideStatusRequest, fetchLeagueGuideStatusSuccess, fetchLeagueGuideStatusFailure, markLeagueGuideViewedRequest, markLeagueGuideViewedSuccess, markLeagueGuideViewedFailure, fetchFantasyPodiumsRequest, fetchFantasyPodiumsSuccess, fetchFantasyPodiumsFailure, fetchManagerInvitationsRequest, fetchManagerInvitationsSuccess, fetchManagerInvitationsFailure, sendManagerInvitationRequest, cancelManagerInvitationRequest, respondManagerInvitationRequest, removeGroupManagerRequest, managerActionSuccess, managerActionFailure, managerRespondSuccess, managerRespondFailure } from "../slices/groupsSlice";
import axiosInstance from "@/lib/utils/axiosInstance";
import { resolveManagerInvitationNotification } from "../slices/notificationSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
	Group,
	CreateGroupPayload,
	FetchGroupsParams,
	FetchGroupByIdPayload,
	InviteCodePayload,
	MemberModificationPayload,
	UpdateMemberRolePayload,
	GroupDeletePayload,
	ConfirmDeletePayload,
	UpdateGroupPayload,
	FetchLeaderBoardsPayload,
	CreateNewLeaderboardPayload,
	UpdateLeaderboardPayload,
	LeaderboardPayload,
	LeaveGroupPayload,
	UpdateLeaderboardToArchivedPayload,
	EnableSecondaryLeaderboardPayload,
	FetchArchivedLeaderBoardsPayload,
	FetchArchivedLeaderBoardListPayload,
	LeaderboardData,
	FetchGroupMembersPayload,
	MembersData,
	FetchMyGroupsPayload,
	GroupObject,
	FetchGroupsPaginationPayload,
	FetchGroupChatsPayload,
	FetchGroupChatsResponse,
	SendMessagePayload,
	DeleteMessagePayload,
	MarkGroupChatsReadPayload,
	FetchUnreadCountsByLeagueIdPayload,
	FetchGroupOwnerPlanPayload,
	GroupType,
	JoinedCommunity,
	FetchLeagueGuideStatusPayload,
	LeagueGuideStatusData,
	MarkLeagueGuideViewedPayload,
	MarkLeagueGuideViewedData,
	FantasyContestPodiumData,
	FetchManagerInvitationsPayload,
	ManagerInvitationsData,
	SendManagerInvitationPayload,
	CancelManagerInvitationPayload,
	RespondManagerInvitationPayload,
	RemoveGroupManagerPayload,
} from "@/lib/interfaces/interfaces";

/** Small first page: the strip sits above the Feed, it is not the results page. */
export const FANTASY_PODIUM_PAGE_SIZE = 5;

/**
 * The manager panel's roster page — the server's maximum for
 * GET /group/members/:group_id.
 *
 * Deliberately the largest page the endpoint allows, not the 10-12 the Members
 * tabs use. This roster IS the candidate list for a manager invitation, and a
 * page-1 window would silently hide everyone below it from an owner who has no
 * way to tell the difference between "not a candidate" and "not on this page".
 * Widening it further needs a search param on that endpoint.
 */
export const MANAGER_ROSTER_LIMIT = 50;

type ApiErrorResponse = {
	message?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
	if (axios.isAxiosError<ApiErrorResponse>(error)) {
		return error.response?.data?.message ?? fallback;
	}
	if (error instanceof Error) {
		return error.message || fallback;
	}
	return fallback;
};

type CreateGroupResponseBody = {
	message?: string;
	data?: { group?: Group | null };
};

const getErrorStatus = (error: unknown): number | null =>
	axios.isAxiosError(error) ? error.response?.status ?? null : null;

/**
 * The `group_type` a wrong-tab join conflict names. Only the 409 raised by
 * join-league / join-arena for a code belonging to the OTHER community type
 * carries it; every other failure returns null.
 */
export const getJoinConflictGroupType = (error: unknown): GroupType | null => {
	if (!axios.isAxiosError<{ data?: { group_type?: string } }>(error)) return null;
	const groupType = error.response?.data?.data?.group_type;
	return groupType === "arena" || groupType === "league" ? groupType : null;
};

function* handleCreateGroup(action: PayloadAction<CreateGroupPayload>): SagaIterator {
	try {
		const response: AxiosResponse<CreateGroupResponseBody> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/create`,
			action.payload
		);
		// Narrowed here, never in the reducer. A reducer that hard-dereferences
		// `.data` throws inside `yield put`, the catch below swallows it, and a 201
		// surfaces to the user as a create failure.
		yield put(
			createGroupSuccess({
				message: response.data?.message ?? null,
				group: response.data?.data?.group ?? null,
			})
		);
	} catch (error: unknown) {
		// The status is load-bearing: a 500 carrying "Group created, but failed to
		// initialize Arena settings." means the group EXISTS and must not be retried.
		yield put(
			createGroupFailure({
				message: getErrorMessage(error, "Group Creation Failed"),
				status: getErrorStatus(error),
			})
		);
	}
}

// GET /group returns the caller's memberships across BOTH group types (leagues +
// arenas), each enriched to the same GroupObject shape as /group/my-groups and
// /group/arena (member_count, active_contest, current_user_member, …).
function* handleFetchAllGroups(action: PayloadAction<FetchGroupsParams | undefined>): SagaIterator {
	try {
		const { page = 1, limit = 10 } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group`,
			{
				params: { page, limit }
			}
		);
		const payload = response.data as { data?: { groups: GroupObject[], pagination: FetchGroupsPaginationPayload } };
		const groups = payload.data?.groups ?? [];
		const pagination = payload.data?.pagination;
		yield put(fetchAllGroupsSuccess({ groups, page, hasMore: pagination?.hasMore ?? groups.length === limit }));
	} catch (error: unknown) {
		yield put(fetchAllGroupFailure(getErrorMessage(error, "Group Fetching Failed")))
	}
}

function* handleFetchMyGroups(action: PayloadAction<FetchMyGroupsPayload | undefined>): SagaIterator {
	try {
		const { page = 1, limit = 10 } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/my-groups`,
			{
				params: { page, limit }
			}
		);
		const payload = response.data as { data?: { groups: GroupObject[], pagination: FetchGroupsPaginationPayload } };
		const groups = payload.data?.groups ?? [];
		const pagination = payload.data?.pagination;
		yield put(fetchMyGroupsSuccess({ groups, page, hasMore: pagination?.hasMore ?? groups.length === limit }));
	} catch (error: unknown) {
		yield put(fetchMyGroupFailure(getErrorMessage(error, "Group Fetching Failed")))
	}
}

// ---- League hub tabs (MVP2) -------------------------------------------------
// GET /group/owned-leagues and GET /group/joined-leagues are the commissioner /
// non-commissioner halves of the caller's Leagues, each paged on its own. Same
// `{ data: { groups, pagination } }` envelope as /group/my-groups.
type CommunityGroupsResponse = {
	data?: { groups?: GroupObject[]; pagination?: FetchGroupsPaginationPayload };
};

function* handleFetchOwnedLeagues(action: PayloadAction<FetchMyGroupsPayload | undefined>): SagaIterator {
	try {
		const { page = 1, limit = 10 } = action.payload || {};
		const response: AxiosResponse<CommunityGroupsResponse> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/owned-leagues`,
			{ params: { page, limit } }
		);
		const groups = response.data?.data?.groups ?? [];
		const pagination = response.data?.data?.pagination;
		yield put(
			fetchOwnedLeaguesSuccess({
				groups,
				page,
				hasMore: pagination?.hasMore ?? groups.length === limit,
				total: pagination?.total ?? groups.length,
			})
		);
	} catch (error: unknown) {
		yield put(fetchOwnedLeaguesFailure(getErrorMessage(error, "Failed to load hosted Leagues")));
	}
}

function* handleFetchJoinedLeagues(action: PayloadAction<FetchMyGroupsPayload | undefined>): SagaIterator {
	try {
		const { page = 1, limit = 10 } = action.payload || {};
		const response: AxiosResponse<CommunityGroupsResponse> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/joined-leagues`,
			{ params: { page, limit } }
		);
		const groups = response.data?.data?.groups ?? [];
		const pagination = response.data?.data?.pagination;
		yield put(
			fetchJoinedLeaguesSuccess({
				groups,
				page,
				hasMore: pagination?.hasMore ?? groups.length === limit,
				total: pagination?.total ?? groups.length,
			})
		);
	} catch (error: unknown) {
		yield put(fetchJoinedLeaguesFailure(getErrorMessage(error, "Failed to load joined Leagues")));
	}
}

// POST /group/join-league — refuses an Arena code with 409 + { data: { group_type } }
// rather than joining it. The status and that group_type are forwarded verbatim so
// the dialog can offer the Arenas tab; collapsing them into a message string here
// would make "wrong tab" indistinguishable from "already a member" (also a 409).
function* handleJoinLeague(action: PayloadAction<InviteCodePayload>): SagaIterator {
	try {
		const response: AxiosResponse<{ message?: string; data?: { group?: JoinedCommunity } }> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/join-league`,
			{ invite_code: action.payload.invite_code }
		);
		yield put(
			joinLeagueSuccess({
				message: response.data?.message ?? null,
				group: response.data?.data?.group ?? null,
			})
		);
	} catch (error: unknown) {
		yield put(
			joinLeagueFailure({
				message: getErrorMessage(error, "Failed to join league!"),
				status: getErrorStatus(error),
				group_type: getJoinConflictGroupType(error),
			})
		);
	}
}

function* handleFetchGroupById(action: PayloadAction<FetchGroupByIdPayload | undefined>): SagaIterator {
	try {
		const { groupId = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/fetch-group/${groupId}`,
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchGroupByIdSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchGroupByIdFailure(getErrorMessage(error, "Group Fetching Failed")))
	}
}

function* handleJoinedGroupByInviteCode(action: PayloadAction<InviteCodePayload | undefined>): SagaIterator {
	try {
		const { invite_code = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/join-group`,
			{ invite_code }
		);
		yield put(joinedGroupByInviteCodeSuccess(response.data));
	} catch (error: unknown) {
		yield put(joinedGroupByInviteCodeFailure(getErrorMessage(error, "Joined Group By Id Failed!")));
	}
}

function* handleRemoveGroupMember(action: PayloadAction<MemberModificationPayload>): SagaIterator {
	try {
		const { group_id = "", user_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.delete,
			`${API_BASE_URL}/group/remove-member`,
			{
				params: { group_id, user_id }
			}
		);
		yield put(removeGroupMemberSuccess(response.data));
	} catch (error: unknown) {
		yield put(removeGroupMemberFailure(getErrorMessage(error, "Remove Group Member Failed!")));
	}
}

function* handleUpdateGroupMemberRole(action: PayloadAction<UpdateMemberRolePayload>): SagaIterator {
	try {
		const { member_id = "", role = "commissioner", group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/group/update-member-role`,
			{ member_id, role, group_id }
		);
		yield put(updateGroupMemberRoleSuccess(response.data));
	} catch (error: unknown) {
		yield put(updateGroupMemberRoleFailure(getErrorMessage(error, "Update Group Member Role Failed!")));
	}
}

function* handleInitialGroupDelete(action: PayloadAction<GroupDeletePayload>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.delete,
			`${API_BASE_URL}/group/initiate-delete/${group_id}`
		);
		yield put(initialGroupDeleteSuccess(response.data));
	} catch (error: unknown) {
		yield put(initialGroupDeleteFailure(getErrorMessage(error, "Initial Group Delete Failed!")));
	}
}

function* handleConfirmDeleteGroup(action: PayloadAction<ConfirmDeletePayload>): SagaIterator {
	try {
		const { group_id = "", otp = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.delete,
			`${API_BASE_URL}/group/confirm-delete/${group_id}`,
			{
				params: { otp }
			}
		);
		yield put(confirmDeleteGroupSuccess(response.data));
	} catch (error: unknown) {
		yield put(confirmDeleteGroupFailure(getErrorMessage(error, "Confirm Group Delete Failed!")));
	}
}

/**
 * The Fantasy contest board, from the PRECOMPUTED tables.
 *
 * Repointed from `GET /group/leaderboard`, which recomputed every member's
 * standing from raw picks on each call. The replacement reads a stored board,
 * repairing it first if it is stale, and answers a finalized contest from a
 * frozen snapshot instead.
 *
 * The response is key-for-key identical to the endpoint it replaces — same
 * `{ group_id, slips, leaderboard, pagination }` — so the reducer and the grid
 * are untouched. Two additive keys ride along: `finalized` and `stale`.
 *
 * `leaderboard_id` is deliberately NOT sent. There is one Main Leaderboard per
 * contest now; the server accepts the param and ignores it.
 */
function* handleFetchLeaderboard(action: PayloadAction<LeaderboardPayload | undefined>): SagaIterator {
	try {
		const { contest_id = "", page = 1, limit = 10 } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/contest-leaderboard/${contest_id}`,
			{
				params: { page, limit }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchLeaderboardSuccess(payload.data as LeaderboardData));
	} catch (error: unknown) {
		yield put(fetchLeaderboardFailure(getErrorMessage(error, "Leaderboard Fetching Failed")))
	}
}

/**
 * GET /group/contest-leaderboard/list/finalized/podium — the League's FANTASY
 * results board, for the Feed tab's Winners strip.
 *
 * Reads only the frozen tables, so a contest appears here the moment it is
 * finalized and never before: a live contest has no winners, only a current
 * leader, and every badge is an argmax that can still change hands.
 */
function* handleFetchFantasyPodiums(
	action: PayloadAction<{ group_id: string; page?: number; limit?: number }>
): SagaIterator {
	try {
		const { group_id, page = 1, limit = FANTASY_PODIUM_PAGE_SIZE } = action.payload;

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/contest-leaderboard/list/finalized/podium`,
			{
				params: { group_id, page, limit }
			}
		);
		const payload = response.data as { data?: FantasyContestPodiumData };
		yield put(fetchFantasyPodiumsSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchFantasyPodiumsFailure(getErrorMessage(error, "Fantasy winners fetch failed")));
	}
}

function* handleFetchArchivedLeaderboardList(action: PayloadAction<FetchArchivedLeaderBoardListPayload | undefined>): SagaIterator {
	try {
		const { groupId = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/archived-leaderboard`,
			{
				params: { groupId }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchArchivedLeaderboardListSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchArchivedLeaderboardListFailure(getErrorMessage(error, "Archived Leaderboard Fetching Failed")));
	}
}

function* handleFetchArchivedLeaderboardById(action: PayloadAction<FetchArchivedLeaderBoardsPayload | undefined>): SagaIterator {
	try {
		const { groupId = "", archivedLeaderboard_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/archived-leaderboard-by-id`,
			{
				params: { groupId, archivedLeaderboard_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchArchivedLeaderboardByIdSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchArchivedLeaderboardByIdFailure(getErrorMessage(error, "Archived Leaderboard Fetching Failed")));
	}
}

function* handleUpdateGroup(action: PayloadAction<UpdateGroupPayload>): SagaIterator {
	try {
		const { name = "", description = "", group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/group/update`,
			{ group_id, name, description }
		);
		yield put(updateGroupSuccess(response.data));
		yield put(fetchGroupByIdRequest({ groupId: group_id }));
	} catch (error: unknown) {
		yield put(updateGroupFailure(getErrorMessage(error, "Update Group Failed!")));
	}
}

function* handleFetchGroupSummary(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/group-summery`,
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchGroupSummarySuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchGroupSummaryFailure(getErrorMessage(error, "Group Summary Fetching Failed")))
	}
}

function* handleFetchAllLeaderboards(action: PayloadAction<FetchLeaderBoardsPayload | undefined>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/fetch-leaderboards`,
			{
				params: { group_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchAllLeaderboardsSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchAllLeaderboardsFailure(getErrorMessage(error, "Leaderboard Fetching Failed")))
	}
}

function* handleCreateNewLeaderboards(action: PayloadAction<CreateNewLeaderboardPayload | undefined>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/create-new-leaderboard`,
			action.payload,
		);
		const payload = response.data as { data?: unknown };
		yield put(createNewLeaderboardSuccess(payload.data));
	} catch (error: unknown) {
		yield put(createNewLeaderboardFailure(getErrorMessage(error, "Leaderboard Creating Failed")))
	}
}

function* handleUpdateLeaderboards(action: PayloadAction<UpdateLeaderboardPayload | undefined>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/group/update-leaderboard`,
			action.payload,
		);
		const payload = response.data as { data?: unknown };
		yield put(updateLeaderboardSuccess(payload.data));
	} catch (error: unknown) {
		yield put(updateLeaderboardFailure(getErrorMessage(error, "Leaderboard update Failed")))
	}
}

function* handleUpdateLeaderboardToArchived(action: PayloadAction<UpdateLeaderboardToArchivedPayload>): SagaIterator {
	try {
		const { group_id } = action.payload;

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/group/update-archived`,
			action.payload,
		);
		const payload = response.data as { data?: unknown };
		yield put(updateLeaderboardToArchivedSuccess(payload.data));
		yield put(fetchArchivedLeaderboardListRequest({ groupId: group_id }));
	} catch (error: unknown) {
		yield put(updateLeaderboardToArchivedFailure(getErrorMessage(error, "Leaderboard Archived Failed")))
	}
}

function* handleGroupLeaving(action: PayloadAction<LeaveGroupPayload>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.delete,
			`${API_BASE_URL}/group/leave-group`,
			{
				params: { group_id }
			}
		);
		const payload = response.data as { data?: unknown, message: string };
		yield put(leaveGroupSuccess(payload));
	} catch (error: unknown) {
		yield put(leaveGroupFailure(getErrorMessage(error, "Leave Group Failed!")));
	}
}

function* handleEnableSecondaryLeaderboard(action: PayloadAction<EnableSecondaryLeaderboardPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.patch,
			`${API_BASE_URL}/group/secondary-leaderboard`,
			action.payload
		);
		const payload = response.data as { data?: unknown };
		yield put(enableSecondaryLeaderboardSuccess(payload));
		yield put(fetchGroupByIdRequest({ groupId: action.payload.group_id }));
	} catch (error: unknown) {
		yield put(enableSecondaryLeaderboardFailure(getErrorMessage(error, "Enable Secondary Leaderboard Failed!")));
	}
}

function* handleFetchGroupMembersByGroupId(action: PayloadAction<FetchGroupMembersPayload>): SagaIterator {
	try {
		const { group_id = "", page = 1, limit = 10 } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/members/${group_id}`,
			{
				params: { page, limit }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchGroupMembersByGroupIdSuccess(payload.data as MembersData));
	} catch (error: unknown) {
		yield put(fetchGroupMembersByGroupIdFailure(getErrorMessage(error, "Fetching Group Members Failed")));
	}
}

function* handleFetchGroupChatsByGroupId(action: PayloadAction<FetchGroupChatsPayload>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/chat/fetch-messages`,
			{
				params: { group_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchGroupChatsByGroupIdSuccess(payload.data as FetchGroupChatsResponse));
	} catch (error: unknown) {
		yield put(fetchGroupChatsByGroupIdFailure(getErrorMessage(error, "Fetching Group Chats Failed")));
	}
}

function* handleLoadOlderGroupChats(action: PayloadAction<FetchGroupChatsPayload>): SagaIterator {
	try {
		const { group_id = "", cursor } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/chat/fetch-messages`,
			{
				params: { group_id, cursor }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(loadOlderGroupChatsSuccess(payload.data as FetchGroupChatsResponse));
	} catch (error: unknown) {
		yield put(loadOlderGroupChatsFailure(getErrorMessage(error, "Loading older messages failed")));
	}
}

function* handleSendMessage(action: PayloadAction<SendMessagePayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/chat/send-message`,
			action.payload
		);
		const payload = response.data as { data?: unknown };
		yield put(sendMessageSuccess(payload.data));
	} catch (error: unknown) {
		yield put(sendMessageFailure(getErrorMessage(error, "Failed to send message")));
	}
}

function* handleDeleteMessage(action: PayloadAction<DeleteMessagePayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.patch,
			`${API_BASE_URL}/group/chat/delet-message`,
			action.payload
		);
		const payload = response.data as { data?: unknown };
		yield put(deleteMessageByIdSuccess(payload));
	} catch (error: unknown) {
		yield put(deleteMessageByIdFailure(getErrorMessage(error, "Failed to delete message")));
	}
}

function* handleMarkGroupChatsRead(action: PayloadAction<MarkGroupChatsReadPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/chat/mark-read`,
			action.payload
		);
		const payload = response.data as { data?: unknown };
		yield put(markGroupChatsReadSuccess(payload.data));
	} catch (error: unknown) {
		yield put(markGroupChatsReadFailure(getErrorMessage(error, "Failed to read messages!")));
	}
}

function* handleFetchUnreadCountsByLeagueId(action: PayloadAction<FetchUnreadCountsByLeagueIdPayload>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/chat/unread-counts`,
			{
				params: { group_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchUnreadCountsByLeagueIdSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchUnreadCountsByLeagueIdFailure(getErrorMessage(error, "Failed to fetch unread counts!")));
	}
}

function* handleFetchOwnGroupsCounts(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/my-groups-counts`
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchOwnGroupsCountsSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchOwnGroupsCountsFailure(getErrorMessage(error, "Failed to fetch groups counts!")));
	}
}

function* handleFetchGroupOwnerPlanDetails(action: PayloadAction<FetchGroupOwnerPlanPayload>): SagaIterator {
	try {
		const { group_id = "" } = action.payload || {};
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/owner-plan`,
			{
				params: { group_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchGroupOwnerPlanDetailsSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchGroupOwnerPlanDetailsFailure(getErrorMessage(error, "Failed to fetch owner plan!")));
	}
}

/* ----------------------------------------------------------------------------
 * LEAGUE GUIDE — the welcome walkthrough for a newly joined League member.
 *
 * Per-LEAGUE, which is why it is not a `tutorial_key` on the progress slice:
 * user_tutorial_progress has no group column, so joining a second League would
 * never show the guide again. Mirrors the Arena pair in arenaSaga.ts.
 * -------------------------------------------------------------------------- */

/**
 * GET /group/league/guide?league_id= — members only (403), Leagues only (404),
 * 410 for a deleted one.
 *
 * `should_show_guide` is derived server-side and is the ONLY field the screen
 * gates on; everything else in `guide` is there to word the dialog.
 */
function* handleFetchLeagueGuideStatus(
	action: PayloadAction<FetchLeagueGuideStatusPayload>
): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/league/guide`,
			{ params: { league_id: action.payload.league_id } }
		);
		const payload = response.data as { data?: LeagueGuideStatusData };
		// No guide in the payload is a FAILURE, not an empty success: the
		// reducer's failure path nulls the slot, and "unknown" must never reach
		// the screen as a definite answer either way.
		if (!payload?.data?.guide) {
			yield put(fetchLeagueGuideStatusFailure("Failed to load the League guide status"));
			return;
		}
		yield put(fetchLeagueGuideStatusSuccess(payload.data));
	} catch (error: unknown) {
		yield put(
			fetchLeagueGuideStatusFailure(
				getErrorMessage(error, "Failed to load the League guide status")
			)
		);
	}
}

/**
 * POST /group/league/guide/viewed — `status` is 'completed' when they read it
 * through and 'dismissed' when they closed it early. Both silence the guide;
 * the split only exists so "how many members actually read it" stays an
 * answerable question.
 *
 * Idempotent server-side, so a double-fire on unmount is not an error.
 */
function* handleMarkLeagueGuideViewed(
	action: PayloadAction<MarkLeagueGuideViewedPayload>
): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/league/guide/viewed`,
			action.payload
		);
		const payload = response.data as { data?: MarkLeagueGuideViewedData };
		if (!payload?.data?.guide) {
			yield put(markLeagueGuideViewedFailure("Failed to update the League guide status"));
			return;
		}
		yield put(markLeagueGuideViewedSuccess(payload.data));
	} catch (error: unknown) {
		yield put(
			markLeagueGuideViewedFailure(
				getErrorMessage(error, "Failed to update the League guide status")
			)
		);
	}
}

/* ============================================================================
 * MANAGER INVITATIONS — ONE surface for Leagues and Arenas.
 *
 * Five endpoints on the type-agnostic /group/* path. `group_type` is NEVER sent
 * and never branched on here: a League manager and an Arena manager are the same
 * group_members row, and the only question with a per-type answer — how many
 * seats the group has — is answered server-side by group_manager_seat_status()
 * and arrives in the `seats` block.
 *
 * The four writes all re-read the list rather than patching it. Each of them
 * moves the seat counts as well as a row, and the panel's badge and its disabled
 * Invite button are drawn from those counts; patching one without the other is
 * how a full Arena ends up offering a seat it does not have.
 * ========================================================================== */

const MANAGER_INVITATION_URL = `${API_BASE_URL}/group/manager-invitation`;

/**
 * GET /group/manager-invitations — PERMANENT OWNER ONLY (403 otherwise), so
 * only mount the panel that dispatches this for `created_by`.
 *
 * Defaults to pending, newest first. The response carries `seats` and
 * `can_invite` alongside the rows, which is the whole reason the panel needs no
 * second call to render "1 of 2 managers, 1 invitation pending".
 */
function* handleFetchManagerInvitations(
	action: PayloadAction<FetchManagerInvitationsPayload>
): SagaIterator {
	const { group_id, status = "pending", page = 1, limit = 20 } = action.payload;
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/manager-invitations`,
			{ params: { group_id, status, page, limit } }
		);
		const payload = response.data as { data?: ManagerInvitationsData };
		// Missing seats is a FAILURE, not an empty success: every gate the panel
		// draws is read off that block, and treating its absence as "no seats"
		// would tell a Pro League owner they cannot invite anyone.
		if (!payload?.data?.seats) {
			yield put(fetchManagerInvitationsFailure("Failed to load manager invitations"));
			return;
		}
		yield put(
			fetchManagerInvitationsSuccess({ group_id, data: payload.data })
		);
	} catch (error: unknown) {
		yield put(
			fetchManagerInvitationsFailure(
				getErrorMessage(error, "Failed to load manager invitations")
			)
		);
	}
}

/**
 * POST /group/manager-invitation — answers 202, NOT 200.
 *
 * The invitation was created; the manager was not. Nothing about the invitee's
 * role changes until they accept, so nothing here re-reads the member list —
 * the roster is unchanged and a refresh would only make it look like something
 * happened to it.
 */
function* handleSendManagerInvitation(
	action: PayloadAction<SendManagerInvitationPayload>
): SagaIterator {
	const { group_id, user_id } = action.payload;
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			MANAGER_INVITATION_URL,
			{ group_id, user_id }
		);
		const payload = response.data as { message?: string };
		yield put(managerActionSuccess({ message: payload?.message }));
		yield put(fetchManagerInvitationsRequest({ group_id }));
	} catch (error: unknown) {
		yield put(
			managerActionFailure(
				getErrorMessage(error, "Failed to send the manager invitation")
			)
		);
	}
}

/** PUT /group/manager-invitation/cancel — the owner withdrawing an unanswered offer. */
function* handleCancelManagerInvitation(
	action: PayloadAction<CancelManagerInvitationPayload>
): SagaIterator {
	const { group_id, invitation_id } = action.payload;
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${MANAGER_INVITATION_URL}/cancel`,
			{ invitation_id }
		);
		const payload = response.data as { message?: string };
		yield put(managerActionSuccess({ message: payload?.message }));
		yield put(fetchManagerInvitationsRequest({ group_id }));
	} catch (error: unknown) {
		yield put(
			managerActionFailure(
				getErrorMessage(error, "Failed to cancel the manager invitation")
			)
		);
	}
}

/**
 * PUT /group/manager-invitation/respond — THE INVITEE ONLY, from Notifications.
 *
 * Does NOT re-read the invitation list: the caller is not the owner and would be
 * answered 403 for it. What it does re-read, on accept, is the GROUP — the
 * caller's own role just became 'manager', and every staff-gated control on the
 * community screen is drawn from `current_user_member.role`.
 *
 * The notification is patched locally because the server does not write the
 * verdict back onto it; see resolveManagerInvitationNotification.
 */
function* handleRespondManagerInvitation(
	action: PayloadAction<RespondManagerInvitationPayload>
): SagaIterator {
	const { invitation_id, accept, group_id } = action.payload;
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${MANAGER_INVITATION_URL}/respond`,
			{ invitation_id, accept }
		);
		const payload = response.data as {
			message?: string;
			data?: { status?: string; group?: { id?: string } };
		};
		yield put(managerRespondSuccess({ message: payload?.message }));
		yield put(
			resolveManagerInvitationNotification({
				invitation_id,
				status: payload?.data?.status ?? (accept ? "accepted" : "declined"),
			})
		);
		/* Re-read the group ONLY if it is the one already on screen.
		 *
		 * This is dispatched from the notifications drawer, which is mounted on
		 * every page — so the accepted community is usually NOT the one the user
		 * is looking at. `state.group.group` is single-tenant and
		 * fetchGroupByIdRequest NULLS it when a different id is asked for, so an
		 * unguarded re-read here would blank whichever League or Arena page the
		 * invitee happens to be standing on. Any other screen picks up the new
		 * role from its own mount fetch. */
		const acceptedGroupId = payload?.data?.group?.id ?? group_id;
		const loadedGroupId: string | undefined = yield select(
			(state: { group?: { group?: { id?: string } } }) => state.group?.group?.id
		);
		if (accept && acceptedGroupId && loadedGroupId === acceptedGroupId) {
			yield put(fetchGroupByIdRequest({ groupId: acceptedGroupId }));
		}
	} catch (error: unknown) {
		yield put(
			managerRespondFailure(
				getErrorMessage(
					error,
					accept
						? "Failed to accept the manager invitation"
						: "Failed to decline the manager invitation"
				)
			)
		);
	}
}

/**
 * DELETE /group/manager — stand an accepted manager back down to member.
 *
 * Sent as query params, matching remove-member and leave-group: the endpoint
 * reads either, and a DELETE body is the one shape this client never uses.
 *
 * Re-reads the roster and the group as well as the invitations, because this is
 * the one manager write that DOES move a member's role — and the group header
 * prints member/manager counts derived from it.
 */
function* handleRemoveGroupManager(
	action: PayloadAction<RemoveGroupManagerPayload>
): SagaIterator {
	const { group_id, user_id } = action.payload;
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.delete,
			`${API_BASE_URL}/group/manager`,
			{ params: { group_id, user_id } }
		);
		const payload = response.data as { message?: string };
		yield put(managerActionSuccess({ message: payload?.message }));
		yield put(fetchManagerInvitationsRequest({ group_id }));
		yield put(
			fetchGroupMembersByGroupIdRequest({ group_id, page: 1, limit: MANAGER_ROSTER_LIMIT })
		);
		yield put(fetchGroupByIdRequest({ groupId: group_id }));
	} catch (error: unknown) {
		yield put(
			managerActionFailure(getErrorMessage(error, "Failed to remove the manager"))
		);
	}
}

export default function* groupSaga() {
	// takeLeading, not takeLatest: takeLatest cancels the first saga, but its POST is
	// already on the wire and the server has already committed the group (and, for an
	// Arena, its unlock + hosting rows). Ignoring the second dispatch is the only
	// saga-level behaviour that cannot double-create.
	yield takeLeading(createGroupRequest.type, handleCreateGroup);
	yield takeLatest(fetchAllGroupsRequest.type, handleFetchAllGroups);
	yield takeLatest(fetchOwnedLeaguesRequest.type, handleFetchOwnedLeagues);
	yield takeLatest(fetchJoinedLeaguesRequest.type, handleFetchJoinedLeagues);
	// takeLeading: a double-submit would otherwise leave the cancelled saga's POST
	// on the wire, and the second one comes back "already a member" — an error toast
	// for a join that actually succeeded.
	yield takeLeading(joinLeagueRequest.type, handleJoinLeague);
	yield takeLatest(fetchGroupByIdRequest.type, handleFetchGroupById);
	yield takeLatest(joinedGroupByInviteCodeRequest.type, handleJoinedGroupByInviteCode);
	yield takeLatest(removeGroupMemberRequest.type, handleRemoveGroupMember);
	yield takeLatest(updateGroupMemberRoleRequest.type, handleUpdateGroupMemberRole);
	yield takeLatest(initialGroupDeleteRequest.type, handleInitialGroupDelete);
	yield takeLatest(confirmDeleteGroupRequest.type, handleConfirmDeleteGroup);
	yield takeLatest(fetchLeaderboardRequest.type, handleFetchLeaderboard);
	yield takeLatest(fetchFantasyPodiumsRequest.type, handleFetchFantasyPodiums);
	yield takeLatest(fetchArchivedLeaderboardListRequest.type, handleFetchArchivedLeaderboardList);
	yield takeLatest(fetchArchivedLeaderboardByIdRequest.type, handleFetchArchivedLeaderboardById);
	yield takeLatest(updateGroupRequest.type, handleUpdateGroup);
	yield takeLatest(fetchGroupSummaryRequest.type, handleFetchGroupSummary);
	yield takeLatest(fetchAllLeaderboardsRequest.type, handleFetchAllLeaderboards);
	yield takeLatest(createNewLeaderboardRequest.type, handleCreateNewLeaderboards);
	yield takeLatest(updateLeaderboardRequest.type, handleUpdateLeaderboards);
	yield takeLatest(leaveGroupRequest.type, handleGroupLeaving);
	yield takeLatest(updateLeaderboardToArchivedRequest.type, handleUpdateLeaderboardToArchived);
	yield takeLatest(enableSecondaryLeaderboardRequest.type, handleEnableSecondaryLeaderboard);
	yield takeLatest(fetchGroupMembersByGroupIdRequest.type, handleFetchGroupMembersByGroupId);
	yield takeLatest(fetchMyGroupsRequest.type, handleFetchMyGroups);
	yield takeLatest(fetchGroupChatsByGroupIdRequest.type, handleFetchGroupChatsByGroupId);
	yield takeLatest(loadOlderGroupChatsRequest.type, handleLoadOlderGroupChats);
	yield takeLatest(sendMessageRequest.type, handleSendMessage);
	yield takeLatest(deleteMessageByIdRequest.type, handleDeleteMessage);
	yield takeLatest(markGroupChatsReadRequest.type, handleMarkGroupChatsRead);
	yield takeLatest(fetchUnreadCountsByLeagueIdRequest.type, handleFetchUnreadCountsByLeagueId);
	yield takeLatest(fetchOwnGroupsCountsRequest.type, handleFetchOwnGroupsCounts);
	yield takeLatest(fetchGroupOwnerPlanDetailsRequest.type, handleFetchGroupOwnerPlanDetails);
	yield takeLatest(fetchLeagueGuideStatusRequest.type, handleFetchLeagueGuideStatus);
	yield takeLatest(markLeagueGuideViewedRequest.type, handleMarkLeagueGuideViewed);
	yield takeLatest(fetchManagerInvitationsRequest.type, handleFetchManagerInvitations);
	/* takeLeading on the four writes, not takeLatest. Cancelling the first saga
	 * does not recall its request: the invitation is already created (or the
	 * manager already stood down) and the second one comes back 409 — an error
	 * toast for a write that actually succeeded. */
	yield takeLeading(sendManagerInvitationRequest.type, handleSendManagerInvitation);
	yield takeLeading(cancelManagerInvitationRequest.type, handleCancelManagerInvitation);
	yield takeLeading(respondManagerInvitationRequest.type, handleRespondManagerInvitation);
	yield takeLeading(removeGroupManagerRequest.type, handleRemoveGroupManager);
};