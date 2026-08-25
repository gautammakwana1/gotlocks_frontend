import { all, call, put, takeLatest, takeLeading } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SagaIterator } from "redux-saga";
import type {
    ConfigureGroupVenuePayload,
    FetchVenueActivityPayload,
    FetchVenueCheckInDetailPayload,
    GroupVenueLifecyclePayload,
    GroupVenueWriteData,
    IssueVenueAssistCodeData,
    IssueVenueAssistCodePayload,
    RedeemVenueAssistCodePayload,
    ResolveVenueCheckInData,
    ResolveVenueCheckInPayload,
    JoinArenaByVenueTokenData,
    JoinArenaByVenueTokenPayload,
    RevokeVenueAssistCodePayload,
    UpdateGroupVenuePayload,
    VenueActivityData,
    VenueCheckInDetailData,
    VenueCheckInOutcome,
    VerifyVenueCheckInData,
    VerifyVenueCheckInPayload,
} from "@/lib/interfaces/interfaces";
import {
    configureGroupVenueRequest,
    disableGroupVenueRequest,
    enableGroupVenueRequest,
    fetchVenueActivityFailure,
    fetchVenueActivityRequest,
    fetchVenueActivitySuccess,
    fetchVenueCheckInDetailFailure,
    fetchVenueCheckInDetailRequest,
    fetchVenueCheckInDetailSuccess,
    groupVenueWriteFailure,
    groupVenueWriteSuccess,
    issueVenueAssistCodeFailure,
    issueVenueAssistCodeRequest,
    issueVenueAssistCodeSuccess,
    redeemVenueAssistCodeFailure,
    redeemVenueAssistCodeRequest,
    regenerateVenueTokenRequest,
    revokeVenueAssistCodeFailure,
    revokeVenueAssistCodeRequest,
    revokeVenueAssistCodeSuccess,
    resolveVenueCheckInTokenFailure,
    joinArenaByVenueTokenRequest,
    joinArenaByVenueTokenSuccess,
    joinArenaByVenueTokenFailure,
    resolveVenueCheckInTokenRequest,
    resolveVenueCheckInTokenSuccess,
    updateGroupVenueRequest,
    verifyVenueCheckInFailure,
    verifyVenueCheckInRequest,
    verifyVenueCheckInSuccess,
} from "../slices/venueSlice";

type ApiErrorResponse = { message?: string; code?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

/**
 * The venue endpoints put a machine-readable `code` beside the message on every
 * refusal a screen has to branch on — `invalid_venue_token` is a dead-QR page,
 * `outside_venue` is a different sentence from `permission_denied`. Read it
 * rather than matching on copy.
 */
const getErrorCode = (error: unknown): string | null => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.code ?? null;
    }
    return null;
};

/**
 * The day the staff activity panel means. Same convention as the contest wizard:
 * the server resolves "today" in whatever zone this header names.
 */
const timeZoneHeader = () => {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return zone ? { "x-timezone": zone } : {};
    } catch {
        return {};
    }
};

/**
 * GET /group/venue/detail/:group_id — the group id is the WHOLE request; the
 * role, the venue's state, the viewer's own session and the staff-only QR are
 * all derived server-side and scoped to who is asking.
 *
 * A League answers 200 with `is_supported: false` rather than an error, so a
 * screen that renders one settings panel per group type can hide it instead of
 * swallowing a failure — that is not an error path here either.
 */
function* handleFetchVenueCheckInDetail(
    action: PayloadAction<FetchVenueCheckInDetailPayload>
): SagaIterator {
    const { group_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/venue/detail/${encodeURIComponent(group_id)}`
        );
        const payload = response.data as { data?: VenueCheckInDetailData };
        if (!payload?.data) {
            yield put(fetchVenueCheckInDetailFailure("Failed to load venue check-in details"));
            return;
        }
        yield put(fetchVenueCheckInDetailSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchVenueCheckInDetailFailure(
                getErrorMessage(error, "Failed to load venue check-in details")
            )
        );
    }
}

/**
 * The four owner-only writes. Same reply shape, same fold, same failure slot —
 * so one runner serves all of them and the only per-endpoint facts are the verb,
 * the path and the fallback message.
 *
 * `group_id` is stripped from the body: it is the path param, and the
 * controllers read the param first.
 */
function* runVenueWrite(
    method: "post" | "put",
    path: string,
    groupId: string,
    body: Record<string, unknown>,
    fallbackError: string
): SagaIterator {
    try {
        const url = `${API_BASE_URL}/group/venue/${path}/${encodeURIComponent(groupId)}`;
        const response: AxiosResponse<unknown> = yield call(
            method === "post" ? axiosInstance.post : axiosInstance.put,
            url,
            body
        );
        const payload = response.data as {
            data?: GroupVenueWriteData;
            message?: string;
        };
        yield put(
            groupVenueWriteSuccess({
                group_id: groupId,
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(groupVenueWriteFailure(getErrorMessage(error, fallbackError)));
    }
}

/**
 * POST /configure — the complete write, and the only one that mints the FIRST
 * token. Every decision the client could get wrong is the server's: the token
 * comes from crypto.randomBytes, the radius and duration fall back to the
 * venue's own stored values, coordinates are rounded before their range is
 * checked. A DISABLED venue answers 409 here — reviving that one is `/enable`'s
 * job, because it has to rotate the token.
 */
function* handleConfigureGroupVenue(
    action: PayloadAction<ConfigureGroupVenuePayload>
): SagaIterator {
    const { group_id, ...body } = action.payload;
    yield* runVenueWrite("post", "configure", group_id, body, "Failed to save the venue");
}

/** PUT /update — a partial patch. Location is optional, but moves as a pair. */
function* handleUpdateGroupVenue(
    action: PayloadAction<UpdateGroupVenuePayload>
): SagaIterator {
    const { group_id, ...body } = action.payload;
    yield* runVenueWrite("put", "update", group_id, body, "Failed to update the venue");
}

/**
 * PUT /disable — no body. Refused (409) while a live venue-required contest
 * would be stranded by it, and RE-RUNNABLE: the venue is flipped before the
 * sessions are swept, so a half-failed disable is finished by pressing again.
 */
function* handleDisableGroupVenue(
    action: PayloadAction<GroupVenueLifecyclePayload>
): SagaIterator {
    yield* runVenueWrite(
        "put",
        "disable",
        action.payload.group_id,
        {},
        "Failed to disable Venue Check-In"
    );
}

/** PUT /enable — no body. Always a NEW token, so the reply says "reprint". */
function* handleEnableGroupVenue(
    action: PayloadAction<GroupVenueLifecyclePayload>
): SagaIterator {
    yield* runVenueWrite(
        "put",
        "enable",
        action.payload.group_id,
        {},
        "Failed to enable Venue Check-In"
    );
}

/**
 * PUT /regenerate-token — no body. A NEW token on a venue that stays OPEN, with
 * every live check-in surviving: the tool for a code that has escaped while the
 * room is still full. Requires an ACTIVE venue (a disabled one gets its new code
 * from /enable) and answers 409 otherwise.
 */
function* handleRegenerateVenueToken(
    action: PayloadAction<GroupVenueLifecyclePayload>
): SagaIterator {
    yield* runVenueWrite(
        "put",
        "regenerate-token",
        action.payload.group_id,
        {},
        "Failed to regenerate the venue QR"
    );
}

/* ----------------------------------------------------------------------------
 * THE MEMBER SIDE — keyed by token, because whoever just scanned the poster has
 * the token and nothing else.
 * -------------------------------------------------------------------------- */

/**
 * GET /check-in/resolve/:token — OPTIONALLY authenticated, and the only read in
 * this store that works signed-out: a first-time customer standing in the
 * restaurant has no account yet and must still be told whose Arena this is.
 *
 * `axiosInstance` attaches credentials when it has them; absent, expired or
 * malformed ones arrive server-side as "no user" rather than as a 401, which is
 * exactly the `next_step: "sign_in"` branch.
 *
 * The server's `code` is kept: `invalid_venue_token` is a dead-QR screen, not a
 * generic failure, and it is the same answer for a retired token, a disabled
 * venue and a deleted Arena — so nothing here can distinguish them either.
 */
function* handleResolveVenueCheckInToken(
    action: PayloadAction<ResolveVenueCheckInPayload>
): SagaIterator {
    const { token } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/venue/check-in/resolve/${encodeURIComponent(token)}`
        );
        const payload = response.data as { data?: ResolveVenueCheckInData };
        if (!payload?.data) {
            yield put(
                resolveVenueCheckInTokenFailure({ error: "This check-in QR could not be read." })
            );
            return;
        }
        yield put(resolveVenueCheckInTokenSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            resolveVenueCheckInTokenFailure({
                error: getErrorMessage(error, "This check-in QR could not be read."),
                code: getErrorCode(error),
            })
        );
    }
}

/**
 * POST /check-in/join/:token — walking in and joining.
 *
 * The rung `resolve` has been pointing at since the feature shipped: the QR
 * landing page returned `next_step: "join_group"` and there was nothing to
 * call, because the scanner holds an opaque token and every join endpoint was
 * keyed on an invite code.
 *
 * 202 is NOT a failure — it is an Arena on `approval_required` queueing the
 * request and ringing its owner. Both statuses carry the server's own
 * `next_step`, which is what the screen advances to; re-deriving that ladder
 * here is how the two doors drift apart.
 *
 * Joining is still not checking in. A success leaves the member at
 * `verify_location`, and the location reading is a separate POST.
 */
function* handleJoinArenaByVenueToken(
    action: PayloadAction<JoinArenaByVenueTokenPayload>
): SagaIterator {
    const { token } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/venue/check-in/join/${encodeURIComponent(token)}`,
            {}
        );
        const payload = response.data as { data?: JoinArenaByVenueTokenData };
        if (!payload?.data) {
            yield put(
                joinArenaByVenueTokenFailure({ error: "Failed to join this Arena." })
            );
            return;
        }
        yield put(joinArenaByVenueTokenSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            joinArenaByVenueTokenFailure({
                error: getErrorMessage(error, "Failed to join this Arena."),
                code: getErrorCode(error),
            })
        );
    }
}

/**
 * POST /check-in/verify/:token — the client posts what its GPS said, never a
 * verdict.
 *
 * A refusal is 422, not 200, and deliberately so: the attempt WAS recorded, so
 * 200 would be defensible, but a client checking only the status code would then
 * tell somebody five kilometres away that they are checked in. The `code` is the
 * outcome — `outside_venue`, `accuracy_insufficient`, … — and carries nothing
 * about the geometry.
 */
function* handleVerifyVenueCheckIn(
    action: PayloadAction<VerifyVenueCheckInPayload>
): SagaIterator {
    const { token, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/venue/check-in/verify/${encodeURIComponent(token)}`,
            body
        );
        const payload = response.data as { data?: VerifyVenueCheckInData };
        if (!payload?.data?.checked_in) {
            yield put(
                verifyVenueCheckInFailure({
                    error: "Your check-in could not be completed. Please try again.",
                })
            );
            return;
        }
        yield put(verifyVenueCheckInSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            verifyVenueCheckInFailure({
                error: getErrorMessage(
                    error,
                    "Venue check-in could not be completed. Please try again."
                ),
                code: getErrorCode(error) as VenueCheckInOutcome | null,
            })
        );
    }
}

/**
 * GET /activity/:group_id — the staff panel's seven numbers for one day.
 *
 * The `x-timezone` header is what decides which day: a bar closing at 01:00
 * local is still having last night, and the server echoes the range it actually
 * used so the panel labels itself with that rather than assuming agreement.
 */
function* handleFetchVenueActivity(
    action: PayloadAction<FetchVenueActivityPayload>
): SagaIterator {
    const { group_id, date } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/venue/activity/${encodeURIComponent(group_id)}`,
            {
                params: date ? { date } : {},
                headers: timeZoneHeader(),
            }
        );
        const payload = response.data as { data?: VenueActivityData };
        if (!payload?.data) {
            yield put(fetchVenueActivityFailure("Failed to load venue activity"));
            return;
        }
        yield put(fetchVenueActivitySuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchVenueActivityFailure(getErrorMessage(error, "Failed to load venue activity"))
        );
    }
}

/* ----------------------------------------------------------------------------
 * STAFF ASSIST CODES — the in-person fallback.
 * -------------------------------------------------------------------------- */

/**
 * POST /assist-code/:group_id — no body. STAFF-wide, not owner-only: whoever is
 * behind the bar when a phone fails has to be able to solve it.
 *
 * The plaintext comes back ONCE. It is never re-fetchable, so the slice holds it
 * and the panel shows it until it expires — losing it means issuing another.
 */
function* handleIssueVenueAssistCode(
    action: PayloadAction<IssueVenueAssistCodePayload>
): SagaIterator {
    const { group_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/venue/assist-code/${encodeURIComponent(group_id)}`,
            {}
        );
        const payload = response.data as { data?: IssueVenueAssistCodeData };
        if (!payload?.data?.code) {
            yield put(
                issueVenueAssistCodeFailure("The check-in code could not be created.")
            );
            return;
        }
        yield put(issueVenueAssistCodeSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            issueVenueAssistCodeFailure(
                getErrorMessage(error, "Failed to generate a staff check-in code")
            )
        );
    }
}

/**
 * PUT /assist-code/:code_id/revoke — no body, and idempotent: a second call
 * answers 200 with `was_already_revoked`, which is the outcome the caller
 * wanted either way, so both land on success.
 */
function* handleRevokeVenueAssistCode(
    action: PayloadAction<RevokeVenueAssistCodePayload>
): SagaIterator {
    const { assist_code_id } = action.payload;
    try {
        yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/venue/assist-code/${encodeURIComponent(assist_code_id)}/revoke`,
            {}
        );
        yield put(revokeVenueAssistCodeSuccess({ assist_code_id }));
    } catch (error: unknown) {
        yield put(
            revokeVenueAssistCodeFailure(
                getErrorMessage(error, "Failed to revoke the check-in code")
            )
        );
    }
}

/**
 * POST /check-in/redeem-assist-code — body `{ code }` plus `token` (from the QR
 * page) or `group_id`.
 *
 * A SUCCESS is dispatched as `verifyVenueCheckInSuccess`, not an action of its
 * own: the reply is the same envelope the GPS path returns, differing only in
 * `outcome`/`method`, and the check-in screen should have exactly one success
 * path. Everything downstream — the entry gate, the staff counts, the audit —
 * already treats the two identically.
 */
function* handleRedeemVenueAssistCode(
    action: PayloadAction<RedeemVenueAssistCodePayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/venue/check-in/redeem-assist-code`,
            action.payload
        );
        const payload = response.data as { data?: VerifyVenueCheckInData };
        if (!payload?.data?.checked_in) {
            yield put(
                redeemVenueAssistCodeFailure(
                    "Your check-in could not be completed. Ask staff for a new code."
                )
            );
            return;
        }
        yield put(verifyVenueCheckInSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            redeemVenueAssistCodeFailure(
                getErrorMessage(
                    error,
                    "That staff check-in code is invalid, expired, or already used."
                )
            )
        );
    }
}

export default function* venueSaga(): SagaIterator {
    yield all([
        takeLatest(fetchVenueCheckInDetailRequest.type, handleFetchVenueCheckInDetail),
        takeLatest(configureGroupVenueRequest.type, handleConfigureGroupVenue),
        takeLatest(updateGroupVenueRequest.type, handleUpdateGroupVenue),
        takeLatest(disableGroupVenueRequest.type, handleDisableGroupVenue),
        takeLatest(enableGroupVenueRequest.type, handleEnableGroupVenue),
        takeLatest(regenerateVenueTokenRequest.type, handleRegenerateVenueToken),
        takeLatest(resolveVenueCheckInTokenRequest.type, handleResolveVenueCheckInToken),
        // takeLeading: the join is not idempotent-free — a double-tap on a
        // queueing Arena would file, then re-file, the same request.
        takeLeading(joinArenaByVenueTokenRequest.type, handleJoinArenaByVenueToken),
        takeLatest(verifyVenueCheckInRequest.type, handleVerifyVenueCheckIn),
        takeLatest(fetchVenueActivityRequest.type, handleFetchVenueActivity),
        takeLatest(issueVenueAssistCodeRequest.type, handleIssueVenueAssistCode),
        takeLatest(revokeVenueAssistCodeRequest.type, handleRevokeVenueAssistCode),
        takeLatest(redeemVenueAssistCodeRequest.type, handleRedeemVenueAssistCode),
    ]);
}
