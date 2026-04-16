import { call, put, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import { FetchSoccerEnglandPremierLeagueOddsPayload, FetchSoccerEnglandPremierLeagueSchedulePayload, FetchSoccerGermanyBundesligaSchedulePayload, ValidateMySoccerEnglandPremierLeaguePickPayload } from "@/lib/interfaces/interfaces";
import { fetchDraftkingsSoccerEnglandPremierLeagueOddsFailure, fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest, fetchDraftkingsSoccerEnglandPremierLeagueOddsSuccess, fetchDraftkingsSoccerGermanyBundesligaOddsFailure, fetchDraftkingsSoccerGermanyBundesligaOddsRequest, fetchDraftkingsSoccerGermanyBundesligaOddsSuccess, fetchFanduelSoccerEnglandPremierLeagueOddsFailure, fetchFanduelSoccerEnglandPremierLeagueOddsRequest, fetchFanduelSoccerEnglandPremierLeagueOddsSuccess, fetchFanduelSoccerGermanyBundesligaOddsFailure, fetchFanduelSoccerGermanyBundesligaOddsRequest, fetchFanduelSoccerGermanyBundesligaOddsSuccess, fetchSoccerEnglandPremierLeagueScheduleByTimezoneFailure, fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest, fetchSoccerEnglandPremierLeagueScheduleByTimezoneSuccess, fetchSoccerEnglandPremierLeagueScheduleFailure, fetchSoccerEnglandPremierLeagueScheduleRequest, fetchSoccerEnglandPremierLeagueScheduleSuccess, fetchSoccerGermanyBundesligaScheduleByTimezoneFailure, fetchSoccerGermanyBundesligaScheduleByTimezoneRequest, fetchSoccerGermanyBundesligaScheduleByTimezoneSuccess, fetchSoccerGermanyBundesligaScheduleFailure, fetchSoccerGermanyBundesligaScheduleRequest, fetchSoccerGermanyBundesligaScheduleSuccess, soccerEnglandPremierLeaguePickValidateFailure, soccerEnglandPremierLeaguePickValidateRequest, soccerEnglandPremierLeaguePickValidateSuccess, soccerGermanyBundesligaPickValidateFailure, soccerGermanyBundesligaPickValidateRequest, soccerGermanyBundesligaPickValidateSuccess } from "../slices/soccerSlice";

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

// England Premier League
function* handleFetchFanduelSoccerEnglandPremierLeagueSchedule(action: PayloadAction<FetchSoccerEnglandPremierLeagueSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/england-premier-league-schedules-with-odds-fanduel`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSoccerEnglandPremierLeagueScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSoccerEnglandPremierLeagueScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchFanduelSoccerEnglandPremierLeagueScheduleByTimezone(action: PayloadAction<FetchSoccerEnglandPremierLeagueSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/england-premier-league-schedules-for-all-tz`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSoccerEnglandPremierLeagueScheduleByTimezoneSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSoccerEnglandPremierLeagueScheduleByTimezoneFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchFanduelSoccerEnglandPremierLeagueOdds(action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/england-premier-league-odds-fanduel`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFanduelSoccerEnglandPremierLeagueOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFanduelSoccerEnglandPremierLeagueOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleFetchDraftkingsSoccerEnglandPremierLeagueOdds(action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/england-premier-league-odds-draftkings`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchDraftkingsSoccerEnglandPremierLeagueOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchDraftkingsSoccerEnglandPremierLeagueOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateSoccerEnglandPremierLeaguePick(action: PayloadAction<ValidateMySoccerEnglandPremierLeaguePickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key, is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/leagues/soccer/england-premier-league-bet-validate`,
            { match_id, external_pick_key, is_live }
        );
        const payload = response.data as { data?: unknown };
        yield put(soccerEnglandPremierLeaguePickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(soccerEnglandPremierLeaguePickValidateFailure(getErrorMessage(error, "England Premier League Pick Validation Failed")));
    }
};

// Germany Bundesliga
function* handleFetchFanduelSoccerGermanyBundesligaSchedule(action: PayloadAction<FetchSoccerGermanyBundesligaSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/germany-bundesliga-schedules-with-odds-fanduel`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSoccerGermanyBundesligaScheduleSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSoccerGermanyBundesligaScheduleFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchFanduelSoccerGermanyBundesligaScheduleByTimezone(action: PayloadAction<FetchSoccerGermanyBundesligaSchedulePayload | undefined>): SagaIterator {
    try {
        const { is_pick_of_day, date } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/germany-bundesliga-schedules-for-all-tz`,
            {
                params: { is_pick_of_day, date },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchSoccerGermanyBundesligaScheduleByTimezoneSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchSoccerGermanyBundesligaScheduleByTimezoneFailure(getErrorMessage(error, "Schedules Fetch Failed")));
    }
};

function* handleFetchFanduelSoccerGermanyBundesligaOdds(action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/germany-bundesliga-odds-fanduel`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchFanduelSoccerGermanyBundesligaOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchFanduelSoccerGermanyBundesligaOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleFetchDraftkingsSoccerGermanyBundesligaOdds(action: PayloadAction<FetchSoccerEnglandPremierLeagueOddsPayload | undefined>): SagaIterator {
    try {
        const { match_id, is_live } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/leagues/soccer/germany-bundesliga-odds-draftkings`,
            {
                params: { match_id, is_live },
            }
        );
        const payload = response.data as { data?: unknown };
        yield put(fetchDraftkingsSoccerGermanyBundesligaOddsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(fetchDraftkingsSoccerGermanyBundesligaOddsFailure(getErrorMessage(error, "Live Odds Fetch Failed")));
    }
};

function* handleValidateSoccerGermanyBundesligaPick(action: PayloadAction<ValidateMySoccerEnglandPremierLeaguePickPayload | undefined>): SagaIterator {
    try {
        const { match_id, external_pick_key, is_live = false } = action.payload || {};

        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/leagues/soccer/germany-bundesliga-bet-validate`,
            { match_id, external_pick_key, is_live }
        );
        const payload = response.data as { data?: unknown };
        yield put(soccerGermanyBundesligaPickValidateSuccess(payload));
    } catch (error: unknown) {
        yield put(soccerGermanyBundesligaPickValidateFailure(getErrorMessage(error, "Germany Bundesliga Pick Validation Failed")));
    }
};

export default function* soccerSaga() {
    yield takeLatest(fetchSoccerEnglandPremierLeagueScheduleRequest.type, handleFetchFanduelSoccerEnglandPremierLeagueSchedule);
    yield takeLatest(fetchFanduelSoccerEnglandPremierLeagueOddsRequest.type, handleFetchFanduelSoccerEnglandPremierLeagueOdds);
    yield takeLatest(fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest.type, handleFetchDraftkingsSoccerEnglandPremierLeagueOdds);
    yield takeLatest(soccerEnglandPremierLeaguePickValidateRequest.type, handleValidateSoccerEnglandPremierLeaguePick);
    yield takeLatest(fetchSoccerGermanyBundesligaScheduleRequest.type, handleFetchFanduelSoccerGermanyBundesligaSchedule);
    yield takeLatest(fetchFanduelSoccerGermanyBundesligaOddsRequest.type, handleFetchFanduelSoccerGermanyBundesligaOdds);
    yield takeLatest(fetchDraftkingsSoccerGermanyBundesligaOddsRequest.type, handleFetchDraftkingsSoccerGermanyBundesligaOdds);
    yield takeLatest(soccerGermanyBundesligaPickValidateRequest.type, handleValidateSoccerGermanyBundesligaPick);
    yield takeLatest(fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest.type, handleFetchFanduelSoccerEnglandPremierLeagueScheduleByTimezone);
    yield takeLatest(fetchSoccerGermanyBundesligaScheduleByTimezoneRequest.type, handleFetchFanduelSoccerGermanyBundesligaScheduleByTimezone);
};