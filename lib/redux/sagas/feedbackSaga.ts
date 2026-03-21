import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { CreateFeedbackPayload } from "@/lib/interfaces/interfaces";
import { createFeedbackFailure, createFeedbackRequest, createFeedbackSuccess } from "../slices/feedbackSlice";

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

function* handleCreateFeedback(action: PayloadAction<CreateFeedbackPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/feedback/submit`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(createFeedbackSuccess(payload));
    } catch (error: unknown) {
        yield put(createFeedbackFailure(getErrorMessage(error, "Feedback send Failed")));
    }
}

export default function* feedbackSaga() {
    yield takeLatest(createFeedbackRequest.type, handleCreateFeedback);
};