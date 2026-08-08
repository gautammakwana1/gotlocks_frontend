import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import type { PlanOverview, Profile, UpdatePlanpayload } from "@/lib/interfaces/interfaces";
import { createCheckoutSessionFailure, createCheckoutSessionRequest, createCheckoutSessionSuccess, fetchPlanOverviewFailure, fetchPlanOverviewRequest, fetchPlanOverviewSuccess, fetchTransactionsFailure, fetchTransactionsRequest, fetchTransactionsSuccess, updateUserPlanFailure, updateUserPlanRequest, updateUserPlanSuccess } from "../slices/planSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import type { FetchTransactionsPayload, PaymentTransaction } from "@/lib/interfaces/interfaces";

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

function* handleCreateCheckoutSession(): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/plans/checkout-session`,
            {}
        );
        const payload = response.data as { data?: { url?: string | null } };
        const url = payload.data?.url;
        const redirecting = Boolean(url) && typeof window !== "undefined";

        // `redirecting` keeps the confirm button disabled through the navigation —
        // see createCheckoutSessionSuccess. Dispatched BEFORE the assignment below
        // so the button is already latched when the browser starts unloading.
        yield put(createCheckoutSessionSuccess({ redirecting }));

        if (redirecting) {
            // Redirect the browser to Stripe's hosted checkout page.
            window.location.href = url as string;
        } else {
            // No URL means the user is already Pro (or nothing to pay) — refresh.
            yield put(fetchPlanOverviewRequest());
        }
    } catch (error: unknown) {
        yield put(createCheckoutSessionFailure(getErrorMessage(error, "Could not start checkout")));
    }
}

function* handleFetchTransactions(
    action: PayloadAction<FetchTransactionsPayload | undefined>
): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/plans/transactions`,
            { params: { page, limit } }
        );
        const payload = response.data as {
            data?: { transactions?: PaymentTransaction[]; pagination?: { hasMore?: boolean } };
        };
        const transactions = payload.data?.transactions ?? [];
        const hasMore = payload.data?.pagination?.hasMore ?? transactions.length === limit;
        yield put(fetchTransactionsSuccess({ transactions, page, hasMore }));
    } catch (error: unknown) {
        yield put(fetchTransactionsFailure(getErrorMessage(error, "Failed to load transactions")));
    }
}

export default function* planSaga() {
    yield takeLatest(fetchPlanOverviewRequest.type, handleFetchPlanOverview);
    yield takeLatest(updateUserPlanRequest.type, handleUpdateUserPlan);
    yield takeLatest(createCheckoutSessionRequest.type, handleCreateCheckoutSession);
    yield takeLatest(fetchTransactionsRequest.type, handleFetchTransactions);
}
