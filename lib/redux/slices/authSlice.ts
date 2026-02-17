import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RegisterPayload, LoginPayload, FetchMemberProfilePayload, User, SessionState, FollowUnfollowUserPayload, VerifyPasswordOTPPayload, InitialPasswordOTPPayload, ResetPasswordPayload, FetchFollowerUsersListByIdPayload, FetchFollowingUsersListByIdPayload } from "@/lib/interfaces/interfaces";

type AuthState = {
	user: User | null;
	followers: [] | null;
	followings: [] | null;
	followersById: [] | null;
	followingsById: [] | null;
	session: SessionState | null;
	hasSeenIntro: boolean;
	loading: boolean;
	error: string | null;
	message: string | null;
	profileUpdateMessage: string | null;
	resendMessage: string | null;
	initialForgotPasswordMessage: string | null;
	initialForgotPasswordError: string | null;
	verifyForgotPasswordMessage: string | null;
	verifyForgotPasswordError: string | null;
	refreshTokenData: string | null;
	resetPasswordMessage: string | null;
	resetPasswordError: string | null;
};

const initialState: AuthState = {
	user: null,
	followers: null,
	followings: null,
	followersById: null,
	followingsById: null,
	session: null,
	hasSeenIntro: false,
	loading: false,
	error: null,
	message: null,
	profileUpdateMessage: null,
	resendMessage: null,
	initialForgotPasswordMessage: null,
	initialForgotPasswordError: null,
	verifyForgotPasswordMessage: null,
	verifyForgotPasswordError: null,
	refreshTokenData: null,
	resetPasswordMessage: null,
	resetPasswordError: null,
};

const authSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		logout: (state) => {
			state.session = null;
			state.hasSeenIntro = false;
			state.user = null;
			state.loading = false;
			state.error = null;
			state.message = null;
		},
		completeIntro: (state) => {
			state.hasSeenIntro = true;
		},

		//login
		loginWithEmailRequest: (state, action: PayloadAction<LoginPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		loginWithEmailSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.message = action.payload?.message;
		},
		loginWithEmailFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearLoginWithEmailMessage(state) {
			state.error = null;
			state.message = null;
		},

		loginWithGoogleRequest: (state) => {
			state.loading = true;
			state.error = null;
		},
		loginWithGoogleSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.message = action.payload?.message;
		},
		loginWithGoogleFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearLoginWithGoogleMessage(state) {
			state.error = null;
			state.message = null;
		},

		//register
		registerUserRequest: (state, action: PayloadAction<RegisterPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		registerUserSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.message = action.payload?.message;
		},
		registerUserFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearRegisterUserMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchProfileRequest: (state) => {
			state.loading = true;
			state.error = null;
		},
		fetchProfileSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.message = action.payload?.message;
		},
		fetchProfileFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchProfileMessage(state) {
			state.error = null;
			state.message = null;
		},

		updateProfileRequest: (state, action: PayloadAction<FormData>) => {
			void action
			state.loading = true;
			state.error = null;
		},
		updateProfileSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.profileUpdateMessage = action.payload?.message;
		},
		updateProfileFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateProfileMessage(state) {
			state.error = null;
			state.profileUpdateMessage = null;
		},

		updateProfilePictureRequest: (state, action: PayloadAction<FormData>) => {
			void action
			state.loading = true;
			state.error = null;
		},
		updateProfilePictureSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload;
			state.profileUpdateMessage = action.payload?.message;
		},
		updateProfilePictureFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateProfilePictureMessage(state) {
			state.error = null;
			state.profileUpdateMessage = null;
		},

		fetchMemberProfileRequest: (state, action: PayloadAction<FetchMemberProfilePayload>) => {
			void action
			state.loading = true;
			state.error = null;
		},
		fetchMemberProfileSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload?.data;
		},
		fetchMemberProfileFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchMemberProfileMessage(state) {
			state.error = null;
			state.message = null;
		},

		// Follow
		followUnfollowUserRequest: (state, action: PayloadAction<FollowUnfollowUserPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		followUnfollowUserSuccess: (state, action) => {
			state.loading = false;
			state.message = action.payload?.message;
		},
		followUnfollowUserFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFollowUnfollowUserMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchFollowersListRequest: (state) => {
			state.loading = true;
			state.error = null;
		},
		fetchFollowersListSuccess: (state, action) => {
			state.loading = false;
			state.followers = action.payload?.followers;
		},
		fetchFollowersListFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchFollowersListMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchFollowingListRequest: (state) => {
			state.loading = true;
			state.error = null;
		},
		fetchFollowingListSuccess: (state, action) => {
			state.loading = false;
			state.followings = action.payload?.followings;
		},
		fetchFollowingListFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchFollowingsListMessage(state) {
			state.error = null;
			state.message = null;
		},

		updateProfilePublicOrPrivateRequest: (state) => {
			state.loading = true;
			state.error = null;
		},
		updateProfilePublicOrPrivateSuccess: (state, action) => {
			state.loading = false;
			state.user = action.payload?.data?.profile;
			state.profileUpdateMessage = action.payload?.message;
		},
		updateProfilePublicOrPrivateFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearUpdateProfilePublicOrPrivateMessage(state) {
			state.error = null;
			state.profileUpdateMessage = null;
		},

		initialForgotPasswordOTPRequest: (state, action: PayloadAction<InitialPasswordOTPPayload>) => {
			void action;
			state.loading = true;
			state.initialForgotPasswordError = null;
		},
		initialForgotPasswordOTPSuccess: (state, action) => {
			state.loading = false;
			state.initialForgotPasswordMessage = action.payload?.message;
		},
		initialForgotPasswordOTPFailure: (state, action) => {
			state.loading = false;
			state.initialForgotPasswordError = action.payload;
		},
		clearInitialForgotPasswordOTPMessage(state) {
			state.initialForgotPasswordError = null;
			state.initialForgotPasswordMessage = null;
		},

		verifyForgotPasswordOTPRequest: (state, action: PayloadAction<VerifyPasswordOTPPayload>) => {
			void action;
			state.loading = true;
			state.verifyForgotPasswordError = null;
		},
		verifyForgotPasswordOTPSuccess: (state, action) => {
			state.loading = false;
			state.refreshTokenData = action.payload?.data?.resetToken;
			state.verifyForgotPasswordMessage = action.payload?.message;
		},
		verifyForgotPasswordOTPFailure: (state, action) => {
			state.loading = false;
			state.verifyForgotPasswordError = action.payload;
		},
		clearVerifyForgotPasswordOTPMessage(state) {
			state.verifyForgotPasswordError = null;
			state.verifyForgotPasswordMessage = null;
		},

		resetPasswordRequest: (state, action: PayloadAction<ResetPasswordPayload>) => {
			void action;
			state.loading = true;
			state.resetPasswordError = null;
		},
		resetPasswordSuccess: (state, action) => {
			state.loading = false;
			state.resetPasswordMessage = action.payload?.message;
		},
		resetPasswordFailure: (state, action) => {
			state.loading = false;
			state.resetPasswordError = action.payload;
		},
		clearResetPasswordMessage(state) {
			state.resetPasswordError = null;
			state.resetPasswordMessage = null;
		},

		fetchFollowersListByIdRequest: (state, action: PayloadAction<FetchFollowerUsersListByIdPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchFollowersListByIdSuccess: (state, action) => {
			state.loading = false;
			state.followersById = action.payload?.followers;
		},
		fetchFollowersListByIdFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchFollowersListByIdMessage(state) {
			state.error = null;
			state.message = null;
		},

		fetchFollowingListByIdRequest: (state, action: PayloadAction<FetchFollowingUsersListByIdPayload>) => {
			void action;
			state.loading = true;
			state.error = null;
		},
		fetchFollowingListByIdSuccess: (state, action) => {
			state.loading = false;
			state.followingsById = action.payload?.followings;
		},
		fetchFollowingListByIdFailure: (state, action) => {
			state.loading = false;
			state.error = action.payload;
		},
		clearFetchFollowingsListByIdMessage(state) {
			state.error = null;
			state.message = null;
		},
	},
});

export const {
	loginWithEmailRequest,
	loginWithEmailSuccess,
	loginWithEmailFailure,
	clearLoginWithEmailMessage,
	loginWithGoogleRequest,
	loginWithGoogleSuccess,
	loginWithGoogleFailure,
	clearLoginWithGoogleMessage,
	registerUserRequest,
	registerUserSuccess,
	registerUserFailure,
	clearRegisterUserMessage,
	fetchProfileRequest,
	fetchProfileSuccess,
	fetchProfileFailure,
	clearFetchProfileMessage,
	updateProfileRequest,
	updateProfileSuccess,
	updateProfileFailure,
	clearUpdateProfileMessage,
	fetchMemberProfileRequest,
	fetchMemberProfileSuccess,
	fetchMemberProfileFailure,
	followUnfollowUserRequest,
	followUnfollowUserSuccess,
	followUnfollowUserFailure,
	clearFollowUnfollowUserMessage,
	clearFetchMemberProfileMessage,
	fetchFollowersListRequest,
	fetchFollowersListSuccess,
	fetchFollowersListFailure,
	clearFetchFollowersListMessage,
	fetchFollowingListRequest,
	fetchFollowingListSuccess,
	fetchFollowingListFailure,
	clearFetchFollowingsListMessage,
	updateProfilePictureRequest,
	updateProfilePictureSuccess,
	updateProfilePictureFailure,
	clearUpdateProfilePictureMessage,
	updateProfilePublicOrPrivateRequest,
	updateProfilePublicOrPrivateSuccess,
	updateProfilePublicOrPrivateFailure,
	clearUpdateProfilePublicOrPrivateMessage,
	initialForgotPasswordOTPRequest,
	initialForgotPasswordOTPSuccess,
	initialForgotPasswordOTPFailure,
	clearInitialForgotPasswordOTPMessage,
	verifyForgotPasswordOTPRequest,
	verifyForgotPasswordOTPSuccess,
	verifyForgotPasswordOTPFailure,
	clearVerifyForgotPasswordOTPMessage,
	resetPasswordRequest,
	resetPasswordSuccess,
	resetPasswordFailure,
	clearResetPasswordMessage,
	fetchFollowersListByIdRequest,
	fetchFollowersListByIdSuccess,
	fetchFollowersListByIdFailure,
	clearFetchFollowersListByIdMessage,
	fetchFollowingListByIdRequest,
	fetchFollowingListByIdSuccess,
	fetchFollowingListByIdFailure,
	clearFetchFollowingsListByIdMessage,
	logout,
	completeIntro,
} = authSlice.actions;

export default authSlice.reducer;


