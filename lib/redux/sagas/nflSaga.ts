import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type { FetchLiveNFLOddsPayload, FetchNFLSchedulePayload, FetchPassingPropsPlayersPayload, FetchReceivingPropsPlayersPayload, FetchRushingPropsPlayersPayload, FetchTouchDownPropsPlayersPayload, ValidateMyPickPayload } from "@/lib/interfaces/interfaces";
import { fetchLiveNFLScheduleFailure, fetchLiveNFLScheduleRequest, fetchLiveNFLScheduleSuccess, fetchLiveOddsFailure, fetchLiveOddsRequest, fetchLiveOddsSuccess, fetchPassingPropsPlayersFailure, fetchPassingPropsPlayersRequest, fetchPassingPropsPlayersSuccess, fetchReceivingPropsPlayersFailure, fetchReceivingPropsPlayersRequest, fetchReceivingPropsPlayersSuccess, fetchRushingPropsPlayersFailure, fetchRushingPropsPlayersRequest, fetchRushingPropsPlayersSuccess, fetchTouchDownPropsPlayersFailure, fetchTouchDownPropsPlayersRequest, fetchTouchDownPropsPlayersSuccess, validateMyNFLPickFailure, validateMyNFLPickRequest, validateMyNFLPickSuccess } from "../slices/nflSlice";

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

function* handleFetchLiveNFLSchedule(action: PayloadAction<FetchNFLSchedulePayload | undefined>): SagaIterator {
    try {
        const { pick_deadline, result_deadline, is_pick_of_day = false, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-schedules-with-odds`,
            {
                params: { pick_deadline, result_deadline, is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchLiveNFLScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchLiveNFLScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
}

function* handleFetchLiveOdds(action: PayloadAction<FetchLiveNFLOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id = '', is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-odds`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchLiveOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchLiveOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
}

function* handleFetchPassingPropsPlayers(action: PayloadAction<FetchPassingPropsPlayersPayload | undefined>): SagaIterator {
    try {
        const { match_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-passing-props`,
            {
                params: { match_id },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchPassingPropsPlayersSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchPassingPropsPlayersFailure(getErrorMessage(error, "Passing Props Fetch Failed")));
    }
}

function* handleFetchReceivingPropsPlayers(action: PayloadAction<FetchReceivingPropsPlayersPayload | undefined>): SagaIterator {
    try {
        const { match_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-receiving-props`,
            {
                params: { match_id },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchReceivingPropsPlayersSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchReceivingPropsPlayersFailure(getErrorMessage(error, "Receiving Props Fetch Failed")));
    }
}

function* handleFetchRushingPropsPlayers(action: PayloadAction<FetchRushingPropsPlayersPayload | undefined>): SagaIterator {
    try {
        const { match_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-rushing-props`,
            {
                params: { match_id },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchRushingPropsPlayersSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchRushingPropsPlayersFailure(getErrorMessage(error, "Rushing Props Fetch Failed")));
    }
}

function* handleFetchTouchDownPropsPlayers(action: PayloadAction<FetchTouchDownPropsPlayersPayload | undefined>): SagaIterator {
    try {
        const { match_id = '' } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/nfl/nfl-touchdown-scorers-props`,
            {
                params: { match_id },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchTouchDownPropsPlayersSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchTouchDownPropsPlayersFailure(getErrorMessage(error, "Touch Down Props Fetch Failed")));
    }
}

function* handleValidateMyPick(action: PayloadAction<ValidateMyPickPayload | undefined>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/nfl/nfl-bet-validate`,
            action.payload
        );
        const payload = response.data as { data?: unknown };
        yield put(validateMyNFLPickSuccess(payload));
    } catch (error: unknown) {
        yield put(validateMyNFLPickFailure(getErrorMessage(error, "Validate My Pick Failed")));
    }
}

export default function* nflSaga() {
    yield takeLatest(fetchLiveNFLScheduleRequest.type, handleFetchLiveNFLSchedule);
    yield takeLatest(fetchLiveOddsRequest.type, handleFetchLiveOdds);
    yield takeLatest(fetchPassingPropsPlayersRequest.type, handleFetchPassingPropsPlayers);
    yield takeLatest(fetchReceivingPropsPlayersRequest.type, handleFetchReceivingPropsPlayers);
    yield takeLatest(fetchRushingPropsPlayersRequest.type, handleFetchRushingPropsPlayers);
    yield takeLatest(fetchTouchDownPropsPlayersRequest.type, handleFetchTouchDownPropsPlayers);
    yield takeLatest(validateMyNFLPickRequest.type, handleValidateMyPick);
};