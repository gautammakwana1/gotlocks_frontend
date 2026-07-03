import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import type { PlanOverview, Profile, UpdatePlanpayload } from "@/lib/interfaces/interfaces";
import { fetchPlanOverviewFailure, fetchPlanOverviewRequest, fetchPlanOverviewSuccess, updateUserPlanFailure, updateUserPlanRequest, updateUserPlanSuccess } from "../slices/planSlice";
import { PayloadAction } from "@reduxjs/toolkit";

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

function* handleFetchPlanOverview(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/plans/overview`
        );
        const payload = response.data as { data?: PlanOverview };
        yield put(fetchPlanOverviewSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchPlanOverviewFailure(getErrorMessage(error, "Failed to load plan details")));
    }
}

function* handleUpdateUserPlan(action: PayloadAction<UpdatePlanpayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/plans/switch`,
            action.payload
        );
        const payload = response.data as { data?: Profile, message: string };
        yield put(updateUserPlanSuccess(payload));
        yield put(fetchPlanOverviewRequest());
    } catch (error: unknown) {
        yield put(updateUserPlanFailure(getErrorMessage(error, "Failed to update plan")));
    }
}

export default function* planSaga() {
    yield takeLatest(fetchPlanOverviewRequest.type, handleFetchPlanOverview);
    yield takeLatest(updateUserPlanRequest.type, handleUpdateUserPlan);
}
