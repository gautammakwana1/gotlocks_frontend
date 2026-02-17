import { call, put, takeLatest } from "redux-saga/effects";
import { loginWithEmailSuccess, loginWithGoogleSuccess, loginWithEmailRequest, loginWithGoogleRequest, loginWithEmailFailure, registerUserFailure, registerUserSuccess, registerUserRequest, fetchProfileFailure, fetchProfileSuccess, fetchProfileRequest, loginWithGoogleFailure, updateProfileSuccess, updateProfileFailure, updateProfileRequest, fetchMemberProfileSuccess, fetchMemberProfileFailure, fetchMemberProfileRequest, followUnfollowUserSuccess, followUnfollowUserFailure, followUnfollowUserRequest, fetchFollowersListSuccess, fetchFollowersListFailure, fetchFollowersListRequest, fetchFollowingListSuccess, fetchFollowingListFailure, fetchFollowingListRequest, updateProfilePictureSuccess, updateProfilePictureFailure, updateProfilePictureRequest, updateProfilePublicOrPrivateSuccess, updateProfilePublicOrPrivateFailure, updateProfilePublicOrPrivateRequest, initialForgotPasswordOTPSuccess, initialForgotPasswordOTPFailure, initialForgotPasswordOTPRequest, verifyForgotPasswordOTPSuccess, verifyForgotPasswordOTPFailure, verifyForgotPasswordOTPRequest, resetPasswordSuccess, resetPasswordFailure, resetPasswordRequest, fetchFollowersListByIdRequest, fetchFollowingListByIdRequest, fetchFollowersListByIdSuccess, fetchFollowersListByIdFailure, fetchFollowingListByIdSuccess, fetchFollowingListByIdFailure } from "../slices/authSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import axios, { AxiosResponse } from "axios";
import type { SagaIterator } from "redux-saga";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FetchFollowerUsersListByIdPayload, FetchFollowingUsersListByIdPayload, FetchMemberProfilePayload, FollowUnfollowUserPayload, InitialPasswordOTPPayload, ResetPasswordPayload, VerifyPasswordOTPPayload } from "@/lib/interfaces/interfaces";

type LoginPayload = {
	email: string;
	password: string;
};

type RegisterPayload = LoginPayload & {
	username?: string;
};

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

function* handleRegister(action: PayloadAction<RegisterPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axios.post,
			`${API_BASE_URL}/auth/signup`,
			action.payload
		);
		yield put(registerUserSuccess(response.data));
	} catch (error: unknown) {
		yield put(registerUserFailure(getErrorMessage(error, "Register Failed")));
	}
}

function* handleLoginWithEmail(action: PayloadAction<LoginPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axios.post,
			`${API_BASE_URL}/auth/login`,
			action.payload
		);
		yield put(loginWithEmailSuccess(response.data));
	} catch (error: unknown) {
		yield put(loginWithEmailFailure(getErrorMessage(error, "Login failed")));
	}
}

function* handleLoginWithGoogle(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axios.get,
			`${API_BASE_URL}/auth/google`
		);
		yield put(loginWithGoogleSuccess(response.data));
	} catch (error: unknown) {
		yield put(loginWithGoogleFailure(getErrorMessage(error, "Login failed")));
	}
}

function* handleFetchProfile(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/profile`
		);
		yield put(fetchProfileSuccess(response.data));
	} catch (error: unknown) {
		yield put(fetchProfileFailure(getErrorMessage(error, "Fetch Profile failed")))
	}
}

function* handleUpdateProfile(action: PayloadAction<FormData>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/auth/update-profile`,
			action.payload,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			}
		);
		yield put(updateProfileSuccess(response.data));
	} catch (error: unknown) {
		yield put(updateProfileFailure(getErrorMessage(error, "Update Profile Failed")));
	}
}

function* handleFetchMemberProfile(action: PayloadAction<FetchMemberProfilePayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/user-profile`,
			{
				params: action.payload
			},
		);
		yield put(fetchMemberProfileSuccess(response.data));
	} catch (error: unknown) {
		yield put(fetchMemberProfileFailure(getErrorMessage(error, "Fetch Member Profile failed")))
	}
}

function* handleFollowUnfollowNewUser(action: PayloadAction<FollowUnfollowUserPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/auth/follow-unfollow-user`,
			action.payload
		);
		yield put(followUnfollowUserSuccess(response.data));
		yield put(fetchFollowingListRequest());
	} catch (error: unknown) {
		yield put(followUnfollowUserFailure(getErrorMessage(error, "Following failed")));
	}
}

function* handleFetchFollowersList(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/followers`,
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchFollowersListSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchFollowersListFailure(getErrorMessage(error, "Fetch followers list failed")));
	}
}

function* handleFetchFollowingsList(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/following`,
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchFollowingListSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchFollowingListFailure(getErrorMessage(error, "Fetch following list failed")));
	}
}

function* handleUpdateProfilePicture(action: PayloadAction<FormData>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/auth/update-profile-image`,
			action.payload,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			}
		);
		yield put(updateProfilePictureSuccess(response.data));
	} catch (error: unknown) {
		yield put(updateProfilePictureFailure(getErrorMessage(error, "Update Profile Picture Failed")));
	}
}

function* handleUpdateProfilePrivateOrPublic(): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.put,
			`${API_BASE_URL}/auth/update-profile-type`,
		);
		const payload = response.data as { data?: unknown };
		yield put(updateProfilePublicOrPrivateSuccess(payload));
	} catch (error: unknown) {
		yield put(updateProfilePublicOrPrivateFailure(getErrorMessage(error, "Update Profile Type Failed")));
	}
}

function* handleInitialForgotPasswordOTP(action: PayloadAction<InitialPasswordOTPPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/auth/initialize-forgot-password?email=${action.payload.email}`,
		);
		const payload = response.data as { data?: unknown };
		yield put(initialForgotPasswordOTPSuccess(payload));
	} catch (error: unknown) {
		yield put(initialForgotPasswordOTPFailure(getErrorMessage(error, "Initialize Forgot Password OTP Failed")));
	}
}

function* handleVerifyForgotPasswordOTP(action: PayloadAction<VerifyPasswordOTPPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/auth/verify-forgot-password?otp=${action.payload.otp}&email=${action.payload.email}`,
		);
		const payload = response.data as { data?: unknown };
		yield put(verifyForgotPasswordOTPSuccess(payload));
	} catch (error: unknown) {
		yield put(verifyForgotPasswordOTPFailure(getErrorMessage(error, "Verify Forgot Password OTP Failed")));
	}
}

function* handleResetPassword(action: PayloadAction<ResetPasswordPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.post,
			`${API_BASE_URL}/auth/reset-password`,
			action.payload
		);
		const payload = response.data as { data?: unknown };
		yield put(resetPasswordSuccess(payload));
	} catch (error: unknown) {
		yield put(resetPasswordFailure(getErrorMessage(error, "Reset Password Failed")));
	}
}

function* handleFetchFollowersListById(action: PayloadAction<FetchFollowerUsersListByIdPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/followers-by-id`,
			{
				params: action.payload
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchFollowersListByIdSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchFollowersListByIdFailure(getErrorMessage(error, "Fetch followers list failed")));
	}
}

function* handleFetchFollowingsListById(action: PayloadAction<FetchFollowingUsersListByIdPayload>): SagaIterator {
	try {
		const response: AxiosResponse<unknown> = yield call(
			axiosInstance.get,
			`${API_BASE_URL}/auth/followings-by-id`,
			{
				params: action.payload
			}
		);
		const payload = response.data as { data?: unknown };
		yield put(fetchFollowingListByIdSuccess(payload.data));
	} catch (error: unknown) {
		yield put(fetchFollowingListByIdFailure(getErrorMessage(error, "Fetch following list failed")));
	}
}

export default function* authSaga() {
	yield takeLatest(loginWithEmailRequest.type, handleLoginWithEmail);
	yield takeLatest(registerUserRequest.type, handleRegister);
	yield takeLatest(loginWithGoogleRequest.type, handleLoginWithGoogle);
	yield takeLatest(fetchProfileRequest.type, handleFetchProfile);
	yield takeLatest(updateProfileRequest.type, handleUpdateProfile);
	yield takeLatest(fetchMemberProfileRequest.type, handleFetchMemberProfile);
	yield takeLatest(followUnfollowUserRequest.type, handleFollowUnfollowNewUser);
	yield takeLatest(fetchFollowersListRequest.type, handleFetchFollowersList);
	yield takeLatest(fetchFollowingListRequest.type, handleFetchFollowingsList);
	yield takeLatest(updateProfilePictureRequest.type, handleUpdateProfilePicture);
	yield takeLatest(updateProfilePublicOrPrivateRequest.type, handleUpdateProfilePrivateOrPublic);
	yield takeLatest(initialForgotPasswordOTPRequest.type, handleInitialForgotPasswordOTP);
	yield takeLatest(verifyForgotPasswordOTPRequest.type, handleVerifyForgotPasswordOTP);
	yield takeLatest(resetPasswordRequest.type, handleResetPassword);
	yield takeLatest(fetchFollowersListByIdRequest.type, handleFetchFollowersListById);
	yield takeLatest(fetchFollowingListByIdRequest.type, handleFetchFollowingsListById);
}