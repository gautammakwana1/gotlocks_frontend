import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import { confirmDeleteGroupFailure, confirmDeleteGroupRequest, confirmDeleteGroupSuccess, createGroupFailure, createGroupRequest, createGroupSuccess, createNewLeaderboardFailure, createNewLeaderboardRequest, createNewLeaderboardSuccess, enableSecondaryLeaderboardFailure, enableSecondaryLeaderboardRequest, enableSecondaryLeaderboardSuccess, fetchAllGroupFailure, fetchAllGroupsRequest, fetchAllGroupsSuccess, fetchAllLeaderboardsFailure, fetchAllLeaderboardsRequest, fetchAllLeaderboardsSuccess, fetchArchivedLeaderboardFailure, fetchArchivedLeaderboardRequest, fetchArchivedLeaderboardSuccess, fetchGroupByIdFailure, fetchGroupByIdRequest, fetchGroupByIdSuccess, fetchGroupSummaryFailure, fetchGroupSummaryRequest, fetchGroupSummarySuccess, fetchLeaderboardFailure, fetchLeaderboardRequest, fetchLeaderboardSuccess, initialGroupDeleteFailure, initialGroupDeleteRequest, initialGroupDeleteSuccess, joinedGroupByInviteCodeFailure, joinedGroupByInviteCodeRequest, joinedGroupByInviteCodeSuccess, leaveGroupFailure, leaveGroupRequest, leaveGroupSuccess, removeGroupMemberFailure, removeGroupMemberRequest, removeGroupMemberSuccess, updateGroupFailure, updateGroupMemberRoleFailure, updateGroupMemberRoleRequest, updateGroupMemberRoleSuccess, updateGroupRequest, updateGroupSuccess, updateLeaderboardFailure, updateLeaderboardRequest, updateLeaderboardSuccess, updateLeaderboardToArchivedFailure, updateLeaderboardToArchivedRequest, updateLeaderboardToArchivedSuccess } from "../slices/groupsSlice";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
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
} from "@/lib/interfaces/interfaces";

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

function* handleCreateGroup(action: PayloadAction<CreateGroupPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/group/create`,
			action.payload
		);
		yield put(createGroupSuccess(response.data));
	} catch (error: unknown) {
		yield put(createGroupFailure(getErrorMessage(error, "Group Creation Failed")));
	}
}

function* handleFetchAllGroups(action: PayloadAction<FetchGroupsParams | undefined>): SagaIterator {
	try {
		const { page = 0, limit = 10, sort_by = 'created_at', sort_order = 'desc', search = '' } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group`,
			{
				params: { page, limit, sort_by, sort_order, search }
			}
		);
		yield put(fetchAllGroupsSuccess(response.data));
	} catch (error: unknown) {
		yield put(fetchAllGroupFailure(getErrorMessage(error, "Group Fetching Failed")))
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
		yield put(fetchAllGroupsRequest({}));
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

function* handleFetchLeaderboard(action: PayloadAction<LeaderboardPayload | undefined>): SagaIterator {
	try {
		const { groupId = "", leaderboard_id } = action.payload || {};

		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/group/leaderboard`,
			{
				params: { groupId, leaderboard_id }
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchLeaderboardSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchLeaderboardFailure(getErrorMessage(error, "Leaderboard Fetching Failed")))
	}
}

function* handleFetchArchivedLeaderboard(action: PayloadAction<FetchGroupByIdPayload | undefined>): SagaIterator {
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
		yield put(fetchArchivedLeaderboardSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchArchivedLeaderboardFailure(getErrorMessage(error, "Archived Leaderboard Fetching Failed")));
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
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/group/update-archived`,
			action.payload,
		);
		const payload = response.data as { data?: unknown };
		yield put(updateLeaderboardToArchivedSuccess(payload.data));
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
		const payload = response.data as { data?: unknown };
		yield put(leaveGroupSuccess(payload.data));
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

export default function* groupSaga() {
	yield takeLatest(createGroupRequest.type, handleCreateGroup);
	yield takeLatest(fetchAllGroupsRequest.type, handleFetchAllGroups);
	yield takeLatest(fetchGroupByIdRequest.type, handleFetchGroupById);
	yield takeLatest(joinedGroupByInviteCodeRequest.type, handleJoinedGroupByInviteCode);
	yield takeLatest(removeGroupMemberRequest.type, handleRemoveGroupMember);
	yield takeLatest(updateGroupMemberRoleRequest.type, handleUpdateGroupMemberRole);
	yield takeLatest(initialGroupDeleteRequest.type, handleInitialGroupDelete);
	yield takeLatest(confirmDeleteGroupRequest.type, handleConfirmDeleteGroup);
	yield takeLatest(fetchLeaderboardRequest.type, handleFetchLeaderboard);
	yield takeLatest(fetchArchivedLeaderboardRequest.type, handleFetchArchivedLeaderboard);
	yield takeLatest(updateGroupRequest.type, handleUpdateGroup);
	yield takeLatest(fetchGroupSummaryRequest.type, handleFetchGroupSummary);
	yield takeLatest(fetchAllLeaderboardsRequest.type, handleFetchAllLeaderboards);
	yield takeLatest(createNewLeaderboardRequest.type, handleCreateNewLeaderboards);
	yield takeLatest(updateLeaderboardRequest.type, handleUpdateLeaderboards);
	yield takeLatest(leaveGroupRequest.type, handleGroupLeaving);
	yield takeLatest(updateLeaderboardToArchivedRequest.type, handleUpdateLeaderboardToArchived);
	yield takeLatest(enableSecondaryLeaderboardRequest.type, handleEnableSecondaryLeaderboard);
};