import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
// TUTORIAL DISABLED 2026-08-17 — the six tutorial action creators and the two
// tutorial types are dropped from these imports so nothing here is unused.
// Restore them alongside the two handlers at the bottom of this file:
//   fetchMyTutorialProgressFailure, fetchMyTutorialProgressRequest,
//   fetchMyTutorialProgressSuccess, updateTutorialProgressFailure,
//   updateTutorialProgressRequest, updateTutorialProgressSuccess
//   + types: TutorialProgress, UpdateTutorialProgressPayload
import { fetchMyProgressFailure, fetchMyProgressRequest, fetchMyProgressSuccess, fetchProgressByUserIdFailure, fetchProgressByUserIdRequest, fetchProgressByUserIdSuccess, redeemGlobalPointsFailure, redeemGlobalPointsRequest, redeemGlobalPointsSuccess } from "../slices/progressSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { FetchProgressByUserIdPayload, RedeemGlobalPointsPayload } from "@/lib/interfaces/interfaces";
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

function* handleFetchMyProgress(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/progress/get-my-progress`,
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchMyProgressSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchMyProgressFailure(getErrorMessage(error, "Progress Fetch Failed")));
    }
};

function* handleFetchProgressByUserId(action: PayloadAction<FetchProgressByUserIdPayload>): SagaIterator {
    try {
        const { user_id } = action.payload;

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/progress/progress-by-user-id`,
            {
                params: { user_id }
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchProgressByUserIdSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchProgressByUserIdFailure(getErrorMessage(error, "Progress Fetch Failed")));
    }
};

function* handleRedeemGlobalPoints(action: PayloadAction<RedeemGlobalPointsPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/progress/redeem-points`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(redeemGlobalPointsSuccess(payload));
    } catch (error: unknown) {
        yield put(redeemGlobalPointsFailure(getErrorMessage(error, "Redemption points failed")));
    }
};

// ---------------------------------------------------------------------------
// TUTORIAL DISABLED 2026-08-17. Superseded by the per-League and per-Arena
// Guides, which are group-scoped (`group_member_onboarding`) and so replay for
// every group a member joins — this pair is keyed (user_id, tutorial_key) and
// could only ever fire once per account.
//
// Both the handlers AND their takeLatest registrations are commented, so
// GET /progress/tutorial-progress and PATCH /progress/tutorial-update are never
// called even if some screen still dispatches the actions. The slice keeps its
// reducers and its intro flags, which DEFAULT TO TRUE — that is what leaves
// every gate that reads them ("actionsLocked", the guided nav in TopNav and
// MainTabBar) resolving to unlocked while this is off.
//
// To restore: uncomment the two handlers, the two takeLatest lines, and the
// call sites marked "TUTORIAL DISABLED" in HomeTab / fantasy / social / TopNav.
// ---------------------------------------------------------------------------
// function* handleFetchMyTutorialProgress(): SagaIterator {
//     try {
//         const response: AxiosResponse<unknown> = yield call(
//             axiosInstance.get,
//             `${API_BASE_URL}/progress/tutorial-progress`,
//         );
//         const payload = response.data as { data?: { progress: TutorialProgress } };
//         const welcomIntro = payload.data?.progress.hasSeenWelcomeIntro;
//         const groupIntro = payload.data?.progress.hasSeenGroupIntro;
//         const socialIntro = payload.data?.progress.hasSeenSocialIntro;
//         yield put(fetchMyTutorialProgressSuccess({ hasSeenGroupIntro: groupIntro, hasSeenWelcomeIntro: welcomIntro, hasSeenSocialIntro: socialIntro }));
//     } catch (error: unknown) {
//         yield put(fetchMyTutorialProgressFailure(getErrorMessage(error, "Tutorial Progress Fetch Failed")));
//     }
// };

// function* handleUpdateTutorialProgress(action: PayloadAction<UpdateTutorialProgressPayload>): SagaIterator {
//     try {
//         const response: AxiosResponse<unknown> = yield call(
//             axiosInstance.patch,
//             `${API_BASE_URL}/progress/tutorial-update`,
//             action.payload
//         );
//         const payload = response.data as { data?: { progress: TutorialProgress } };
//         const welcomIntro = payload.data?.progress.hasSeenWelcomeIntro;
//         const groupIntro = payload.data?.progress.hasSeenGroupIntro;
//         const socialIntro = payload.data?.progress.hasSeenSocialIntro;
//         yield put(updateTutorialProgressSuccess({ hasSeenGroupIntro: groupIntro, hasSeenWelcomeIntro: welcomIntro, hasSeenSocialIntro: socialIntro }));
//     } catch (error: unknown) {
//         yield put(updateTutorialProgressFailure(getErrorMessage(error, "Update Tutorial Progress Failed")));
//     }
// };

export default function* progressSaga() {
    yield takeLatest(fetchMyProgressRequest.type, handleFetchMyProgress);
    yield takeLatest(fetchProgressByUserIdRequest.type, handleFetchProgressByUserId);
    yield takeLatest(redeemGlobalPointsRequest.type, handleRedeemGlobalPoints);
    // TUTORIAL DISABLED 2026-08-17
    // yield takeLatest(fetchMyTutorialProgressRequest.type, handleFetchMyTutorialProgress);
    // yield takeLatest(updateTutorialProgressRequest.type, handleUpdateTutorialProgress);
};