import { call, put, takeLatest } from "redux-saga/effects";
import axios, { type AxiosResponse } from "axios";
import type { SagaIterator } from "redux-saga";
import type { PayloadAction } from "@reduxjs/toolkit";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type {
    GroupLifetimeStandingsData,
    GroupLifetimeStandingsPayload,
    LifetimeStandingsType,
} from "@/lib/interfaces/interfaces";
import {
    fetchLifetimeStandingsFailure,
    fetchLifetimeStandingsRequest,
    fetchLifetimeStandingsSuccess,
} from "../slices/lifetimeStandingsSlice";

/* ============================================================================
 * GET /group/lifetime-standings — the Feed tab's Standings view.
 * ========================================================================== */

/** The server's own maximum. Asking for it keeps most groups to one page. */
const LIFETIME_STANDINGS_LIMIT = 100;

/**
 * Page-follow ceiling. The board renders every row in natural flow with no
 * pagination control — that is the parity requirement — so the pages are
 * chased here instead of on screen. Five is far past the largest Arena tier
 * (250 members) and stops a pathological group looping forever.
 */
const LIFETIME_STANDINGS_MAX_PAGES = 5;

type ApiErrorResponse = {
    message?: string;
    // authenticateUser answers { error }, every controller branch { message }.
    error?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return (
            error.response?.data?.message ??
            error.response?.data?.error ??
            fallback
        );
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};

/**
 * ONE handler, `takeLatest`.
 *
 * Only one board is ever on screen — the carousel renders the active slide and
 * nothing else — so a request abandoned by a flip must not land after the board
 * that replaced it. The corollary is that the two boards must never be
 * prefetched concurrently: takeLatest would cancel one of them.
 *
 * `type` is ALWAYS sent, never left to the server's default: an Arena answers
 * 400 for `fantasy`, so guessing is a hard error rather than an empty board.
 */
function* handleFetchLifetimeStandings(
    action: PayloadAction<GroupLifetimeStandingsPayload>
): SagaIterator {
    const {
        group_id,
        page = 1,
        limit = LIFETIME_STANDINGS_LIMIT,
    } = action.payload;
    const type: LifetimeStandingsType = action.payload.type ?? "fantasy";

    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/lifetime-standings`,
            {
                // Through `params`, never a hand-built query string: the request
                // interceptor signs the path plus SORTED params for
                // verifyRequestSecurity, which this route carries.
                params: { group_id, type, page, limit },
            }
        );

        const payload = response.data as { data?: GroupLifetimeStandingsData };

        // `board` is the discriminator the reducer routes on, so a reply without
        // one cannot be filed and is treated as a failure rather than dropped.
        if (!payload?.data?.board) {
            yield put(
                fetchLifetimeStandingsFailure({
                    type,
                    message: "Failed to load these standings",
                })
            );
            return;
        }

        yield put(fetchLifetimeStandingsSuccess(payload.data));

        /* The next page is chased here so no pagination UI ever reaches the
         * screen. Guarded on the REPLY's page number rather than the request's,
         * so a server that clamps the window cannot start an endless walk. */
        const { pagination } = payload.data;
        if (
            pagination?.hasMore &&
            pagination.page >= page &&
            pagination.page < LIFETIME_STANDINGS_MAX_PAGES
        ) {
            yield put(
                fetchLifetimeStandingsRequest({
                    group_id,
                    type,
                    page: pagination.page + 1,
                    limit,
                })
            );
        }
    } catch (error: unknown) {
        yield put(
            fetchLifetimeStandingsFailure({
                type,
                message: getErrorMessage(error, "Failed to load these standings"),
            })
        );
    }
}

export default function* lifetimeStandingsSaga(): SagaIterator {
    yield takeLatest(
        fetchLifetimeStandingsRequest.type,
        handleFetchLifetimeStandings
    );
}
