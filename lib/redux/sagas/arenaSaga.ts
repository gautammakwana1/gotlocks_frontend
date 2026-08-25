import { call, put, takeEvery, takeLatest, takeLeading } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import type {
    ActionCreatorWithOptionalPayload,
    ActionCreatorWithPayload,
    PayloadAction,
} from "@reduxjs/toolkit";
import type {
    ActivateArenaHostingPayload,
    AdvanceArenaContestPayload,
    ArenaContest,
    ArenaContestDetailResponse,
    ArenaContestParticipant,
    FetchArenaContestDetailPayload,
    JoinArenaContestPayload,
    ArenaHostingActionResponse,
    ArenaHostingDetailsPayload,
    ArenaPausePayload,
    ConfirmArenaDeletePayload,
    InitiateArenaDeletePayload,
    LeaveArenaPayload,
    ArenaGuideStatusData,
    FetchArenaGuideStatusPayload,
    MarkArenaGuideViewedData,
    MarkArenaGuideViewedPayload,
    ArenaHostingDetailsResponse,
    OwnedArenaHostingPayload,
    OwnedArenaHostingResponse,
    ArenaSubscriptionResponse,
    ArenaCheckoutPayload,
    ArenaCheckoutResponse,
    ArenaCheckoutStatusResponse,
    ChangeArenaPlanPayload,
    ArenaBillingActionResponse,
    ArenaInvoice,
    FetchArenaInvoicesPayload,
    ArenaMemberActionPayload,
    ArenaOwnershipTransfer,
    ArenaOwnershipTransferResponse,
    ArenaStaffPick,
    CancelArenaOwnershipTransferPayload,
    CreateArenaContestPayload,
    CreateArenaOwnershipTransferPayload,
    CreateCommunityPickPayload,
    CreateStaffAnnouncementPayload,
    CreateStaffPickPayload,
    ArenaCommunityPick,
    ArenaContestPick,
    DeleteCommunityPickPayload,
    FetchArenaContestPicksPayload,
    FetchCommunityPicksPayload,
    FetchJoinedOpenContestsPayload,
    JoinedOpenArenaContest,
    SubmitArenaContestEntryPayload,
    UpdateCommunityPickPayload,
    UpdateCompetitivePickPayload,
    Pick,
    DeleteStaffAnnouncementPayload,
    DeleteStaffPickPayload,
    FeedGroupType,
    EditStaffAnnouncementPayload,
    PinStaffAnnouncementPayload,
    FetchArenaContestsPayload,
    FetchArenaOwnershipTransferPayload,
    FetchGroupsPaginationPayload,
    FetchMyGroupsPayload,
    InviteCodePayload,
    JoinedCommunity,
    FetchStaffAnnouncementPayload,
    FetchStaffPickPayload,
    GroupObject,
    RespondArenaOwnershipTransferPayload,
    StaffAnnouncement,
    UpdateArenaDetailsPayload,
    ArenaJoinRequestsData,
    CompleteArenaSetupPayload,
    FetchArenaJoinRequestsPayload,
    FetchArenaMemberContactsPayload,
    ExportArenaMemberContactsPayload,
    ArenaMemberContactsData,
    RespondArenaJoinRequestPayload,
    UpdateArenaJoinPolicyPayload,
} from "@/lib/interfaces/interfaces";
import {
    fetchArenaGroupsFailure,
    fetchArenaGroupsRequest,
    fetchArenaGroupsSuccess,
    fetchOwnedArenasRequest,
    fetchOwnedArenasSuccess,
    fetchOwnedArenasFailure,
    fetchJoinedArenasRequest,
    fetchJoinedArenasSuccess,
    fetchJoinedArenasFailure,
    joinArenaRequest,
    joinArenaSuccess,
    joinArenaFailure,
    createArenaContestFailure,
    createArenaContestRequest,
    createArenaContestSuccess,
    fetchArenaContestDetailFailure,
    fetchArenaContestDetailRequest,
    fetchArenaContestDetailSuccess,
    advanceArenaContestFailure,
    advanceArenaContestRequest,
    advanceArenaContestSuccess,
    joinArenaContestFailure,
    joinArenaContestRequest,
    joinArenaContestSuccess,
    createStaffAnnouncementFailure,
    createStaffAnnouncementRequest,
    createStaffAnnouncementSuccess,
    createStaffPickFailure,
    createStaffPickRequest,
    createStaffPickSuccess,
    createCommunityPickFailure,
    createCommunityPickRequest,
    createCommunityPickSuccess,
    fetchCommunityPicksFailure,
    fetchCommunityPicksRequest,
    fetchCommunityPicksSuccess,
    updateCommunityPickFailure,
    updateCommunityPickRequest,
    updateCommunityPickSuccess,
    deleteCommunityPickFailure,
    deleteCommunityPickRequest,
    deleteCommunityPickSuccess,
    fetchJoinedOpenContestsFailure,
    fetchJoinedOpenContestsRequest,
    fetchJoinedOpenContestsSuccess,
    submitArenaContestEntryFailure,
    submitArenaContestEntryRequest,
    submitArenaContestEntrySuccess,
    replaceArenaContestEntryFailure,
    replaceArenaContestEntryRequest,
    replaceArenaContestEntrySuccess,
    fetchOpenContestPicksFailure,
    fetchOpenContestPicksRequest,
    fetchOpenContestPicksSuccess,
    fetchClosedContestPicksFailure,
    fetchClosedContestPicksRequest,
    fetchClosedContestPicksSuccess,
    deleteStaffPickFailure,
    deleteStaffPickRequest,
    deleteStaffPickSuccess,
    deleteStaffAnnouncementFailure,
    deleteStaffAnnouncementRequest,
    deleteStaffAnnouncementSuccess,
    editStaffAnnouncementFailure,
    editStaffAnnouncementRequest,
    editStaffAnnouncementSuccess,
    pinStaffAnnouncementFailure,
    pinStaffAnnouncementRequest,
    pinStaffAnnouncementSuccess,
    fetchArenaContestsFailure,
    fetchArenaContestsRequest,
    fetchArenaContestsSuccess,
    fetchStaffAnnouncementsFailure,
    fetchStaffAnnouncementsRequest,
    fetchStaffAnnouncementsSuccess,
    fetchStaffPicksFailure,
    fetchStaffPicksRequest,
    fetchStaffPicksSuccess,
    fetchArenaHostingDetailsFailure,
    fetchOwnedArenaHostingRequest,
    fetchOwnedArenaHostingSuccess,
    fetchOwnedArenaHostingFailure,
    fetchArenaHostingDetailsRequest,
    fetchArenaHostingDetailsSuccess,
    activateArenaHostingFailure,
    activateArenaHostingRequest,
    activateArenaHostingSuccess,
    cancelArenaOwnershipTransferFailure,
    cancelArenaOwnershipTransferRequest,
    cancelArenaOwnershipTransferSuccess,
    cancelArenaPauseFailure,
    cancelArenaPauseRequest,
    cancelArenaPauseSuccess,
    fetchArenaSubscriptionRequest,
    fetchArenaSubscriptionSuccess,
    fetchArenaSubscriptionFailure,
    createArenaCheckoutRequest,
    createArenaCheckoutSuccess,
    createArenaCheckoutFailure,
    fetchArenaCheckoutStatusRequest,
    fetchArenaCheckoutStatusSuccess,
    fetchArenaCheckoutStatusFailure,
    changeArenaPlanRequest,
    changeArenaPlanSuccess,
    changeArenaPlanFailure,
    cancelArenaHostingRequest,
    cancelArenaHostingSuccess,
    cancelArenaHostingFailure,
    resumeArenaHostingRequest,
    resumeArenaHostingSuccess,
    resumeArenaHostingFailure,
    openArenaBillingPortalRequest,
    openArenaBillingPortalSuccess,
    openArenaBillingPortalFailure,
    fetchArenaInvoicesRequest,
    fetchArenaInvoicesSuccess,
    fetchArenaInvoicesFailure,
    confirmArenaDeleteFailure,
    confirmArenaDeleteRequest,
    confirmArenaDeleteSuccess,
    initiateArenaDeleteFailure,
    initiateArenaDeleteRequest,
    initiateArenaDeleteSuccess,
    fetchArenaGuideStatusFailure,
    fetchArenaGuideStatusRequest,
    fetchArenaGuideStatusSuccess,
    leaveArenaFailure,
    leaveArenaRequest,
    leaveArenaSuccess,
    markArenaGuideViewedFailure,
    markArenaGuideViewedRequest,
    markArenaGuideViewedSuccess,
    scheduleArenaPauseFailure,
    scheduleArenaPauseRequest,
    scheduleArenaPauseSuccess,
    createArenaOwnershipTransferFailure,
    createArenaOwnershipTransferRequest,
    createArenaOwnershipTransferSuccess,
    fetchArenaOwnershipTransferFailure,
    fetchArenaOwnershipTransferRequest,
    fetchArenaOwnershipTransferSuccess,
    respondArenaOwnershipTransferFailure,
    respondArenaOwnershipTransferRequest,
    respondArenaOwnershipTransferSuccess,
    updateArenaDetailsFailure,
    updateArenaDetailsRequest,
    updateArenaDetailsSuccess,
    removeArenaMemberFailure,
    removeArenaMemberRequest,
    removeArenaMemberSuccess,
    unlockArenaFailure,
    unlockArenaRequest,
    unlockArenaSuccess,
    completeArenaSetupRequest,
    completeArenaSetupSuccess,
    completeArenaSetupFailure,
    markArenaSetupComplete,
    updateArenaJoinPolicyRequest,
    updateArenaJoinPolicySuccess,
    updateArenaJoinPolicyFailure,
    fetchArenaJoinRequestsRequest,
    fetchArenaJoinRequestsSuccess,
    fetchArenaMemberContactsRequest,
    fetchArenaMemberContactsSuccess,
    fetchArenaMemberContactsFailure,
    exportArenaMemberContactsRequest,
    exportArenaMemberContactsSuccess,
    exportArenaMemberContactsFailure,
    fetchArenaJoinRequestsFailure,
    respondArenaJoinRequestRequest,
    respondArenaJoinRequestSuccess,
    respondArenaJoinRequestFailure,
} from "../slices/arenaSlice";
import {
    downloadMemberContactsCsv,
    memberContactsFilenameFrom,
} from "@/lib/arenas/memberContacts";
import {
    fetchGroupByIdRequest,
    fetchGroupMembersByGroupIdRequest,
} from "../slices/groupsSlice";
// Shared with the League join: the same RPC raises the wrong-tab 409 on both
// endpoints, so both read `data.group_type` out of the error the same way.
import { getJoinConflictGroupType } from "./groupsSaga";

type ApiErrorResponse = {
    message?: string;
    /**
     * Two envelopes coexist on these routes: every controller/helper branch answers
     * { message }, but the authenticateUser middleware answers { error } — 401
     * "Missing or invalid authorization header", 401 "Unauthorized or invalid token",
     * 500 "Failed to validate user", 403 "Your account has been deleted." Reading
     * only `message` showed the generic fallback for every auth-layer failure.
     */
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
 * The same message extraction, for the one route that answers text.
 *
 * `responseType: "text"` applies to FAILURE bodies too, so a 403 "You're not
 * authorized!" or the 429 "Too many contact exports..." arrives as the raw JSON
 * string rather than a parsed object. Without this the user would see the
 * generic fallback for exactly the two errors that explain themselves.
 */
const getCsvErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<unknown>(error)) {
        const data = error.response?.data;

        if (typeof data === "string" && data.trim()) {
            try {
                const parsed = JSON.parse(data) as ApiErrorResponse;
                return parsed?.message ?? parsed?.error ?? fallback;
            } catch {
                // Not JSON — a proxy error page, say. Never surface raw HTML.
                return fallback;
            }
        }

        const envelope = data as ApiErrorResponse | undefined;
        return envelope?.message ?? envelope?.error ?? fallback;
    }
    return getErrorMessage(error, fallback);
};

/**
 * Feed reads/writes (announcements + community picks) are shared by Arenas and
 * Leagues. Arena keeps its historical `/group/arena/*` routes and `arena_id`
 * body/query key; League mirrors the same handlers under `/group/league/*` with
 * the app-standard `group_id`. `group_type` is optional and defaults to arena, so
 * every pre-existing Arena dispatch is unaffected.
 */
const feedScope = (groupType?: FeedGroupType) =>
    groupType === "league"
        ? { segment: "league" as const, idKey: "group_id" as const }
        : { segment: "arena" as const, idKey: "arena_id" as const };

/** Body/query fragment naming the owning group the way its endpoint expects. */
const feedGroupRef = (arenaId: string, groupType?: FeedGroupType) => {
    const { idKey } = feedScope(groupType);
    return { [idKey]: arenaId } as Record<string, string>;
};

/**
 * Announcements do NOT share a path shape across the two contexts: an Arena has
 * `/group/arena/staff-announcement(s)`, a League has `/group/league/announcement(s)`
 * (leagueFeedRoutes.ts) — no "staff-" prefix, because a League has no staff role.
 */
const feedAnnouncementUrl = (groupType?: FeedGroupType) =>
    groupType === "league"
        ? `${API_BASE_URL}/group/league/announcement`
        : `${API_BASE_URL}/group/arena/staff-announcement`;

// PIN exists on BOTH surfaces now: leagueFeedRoutes declares
// PUT /group/league/announcement/:announcement_id/pin (pinLeagueAnnouncement), and
// its envelope is byte-identical to the Arena route's ({ message, data:{id,is_pinned} }).
// The Arena route does still accept a League id — both surfaces share staff_feed_posts
// and the Arena resolver never reads groups.group_type — but only the League resolver
// enforces the 410 "This League has been deleted." gate that Edit/Delete already get,
// and only it words its 403 as "League commissioner" rather than "Arena owner".
const feedAnnouncementPinUrl = (
    announcementId: string,
    groupType?: FeedGroupType
) => `${feedAnnouncementUrl(groupType)}/${announcementId}/pin`;

// GET /group/arena — the Arenas-tab counterpart of groupsSaga's
// handleFetchMyGroups; both endpoints share one response contract.
function* handleFetchArenaGroups(
    action: PayloadAction<FetchMyGroupsPayload | undefined>
): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena`,
            { params: { page, limit } }
        );
        const payload = response.data as {
            data?: { groups: GroupObject[]; pagination: FetchGroupsPaginationPayload };
        };
        const groups = payload.data?.groups ?? [];
        const pagination = payload.data?.pagination;
        yield put(
            fetchArenaGroupsSuccess({
                groups,
                page,
                hasMore: pagination?.hasMore ?? groups.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchArenaGroupsFailure(getErrorMessage(error, "Failed to load Arenas"))
        );
    }
}

// ---- Arena hub tabs (MVP2) --------------------------------------------------
// GET /group/arena/owned-arenas and GET /group/arena/joined-arenas are the
// commissioner / non-commissioner halves of the caller's Arenas. Both already
// exclude deleted and non-live Arenas server-side, so nothing is filtered here.
type CommunityGroupsResponse = {
    data?: { groups?: GroupObject[]; pagination?: FetchGroupsPaginationPayload };
};

function* handleFetchOwnedArenas(
    action: PayloadAction<FetchMyGroupsPayload | undefined>
): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<CommunityGroupsResponse> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/owned-arenas`,
            { params: { page, limit } }
        );
        const groups = response.data?.data?.groups ?? [];
        const pagination = response.data?.data?.pagination;
        yield put(
            fetchOwnedArenasSuccess({
                groups,
                page,
                hasMore: pagination?.hasMore ?? groups.length === limit,
                total: pagination?.total ?? groups.length,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchOwnedArenasFailure(getErrorMessage(error, "Failed to load hosted Arenas"))
        );
    }
}

function* handleFetchJoinedArenas(
    action: PayloadAction<FetchMyGroupsPayload | undefined>
): SagaIterator {
    try {
        const { page = 1, limit = 10 } = action.payload || {};
        const response: AxiosResponse<CommunityGroupsResponse> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/joined-arenas`,
            { params: { page, limit } }
        );
        const groups = response.data?.data?.groups ?? [];
        const pagination = response.data?.data?.pagination;
        yield put(
            fetchJoinedArenasSuccess({
                groups,
                page,
                hasMore: pagination?.hasMore ?? groups.length === limit,
                total: pagination?.total ?? groups.length,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchJoinedArenasFailure(getErrorMessage(error, "Failed to load joined Arenas"))
        );
    }
}

// POST /group/arena/join-arena — refuses a League code with 409 + { data: { group_type } }.
// The status is forwarded because this endpoint distinguishes far more failures than
// the League one: 402 hosting paused, 403 full/inactive, 410 deleted.
//
// 202 vs 200 is the whole of the join-policy contract on this endpoint. An Arena
// on `approval_required` answers 202 with a `data.group` that looks exactly like
// a successful join's — reading the body alone would drop somebody into an Arena
// they are not a member of, so the STATUS is what decides the disposition.
function* handleJoinArena(action: PayloadAction<InviteCodePayload>): SagaIterator {
    try {
        const response: AxiosResponse<{
            message?: string;
            data?: { group?: JoinedCommunity };
        }> = yield call(axiosInstance.post, `${API_BASE_URL}/group/arena/join-arena`, {
            invite_code: action.payload.invite_code,
        });
        yield put(
            joinArenaSuccess({
                message: response.data?.message ?? null,
                group: response.data?.data?.group ?? null,
                disposition: response.status === 202 ? "requested" : "joined",
            })
        );
    } catch (error: unknown) {
        yield put(
            joinArenaFailure({
                message: getErrorMessage(error, "Failed to join arena!"),
                status: axios.isAxiosError(error) ? error.response?.status ?? null : null,
                group_type: getJoinConflictGroupType(error),
            })
        );
    }
}

function* handleFetchArenaHostingDetails(
    action: PayloadAction<ArenaHostingDetailsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/hosting-details`,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as { data?: ArenaHostingDetailsResponse };
        yield put(fetchArenaHostingDetailsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaHostingDetailsFailure(
                getErrorMessage(error, "Failed to load Arena hosting details")
            )
        );
    }
}

/**
 * Owner billing workspace. One request returns every Arena the caller owns with
 * its unlock row, hosting row and live usage counts — the per-Arena
 * hosting-details endpoint would be one call per Arena for the same screen.
 */
function* handleFetchOwnedArenaHosting(
    action: PayloadAction<OwnedArenaHostingPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/owned-hosting-details`,
            {
                params: {
                    page: action.payload?.page ?? 1,
                    limit: action.payload?.limit ?? 10,
                },
            }
        );
        const payload = response.data as { data?: OwnedArenaHostingResponse };
        yield put(fetchOwnedArenaHostingSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchOwnedArenaHostingFailure(
                getErrorMessage(error, "Failed to load your Arena hosting details")
            )
        );
    }
}

function* handleUnlockArena(action: PayloadAction<ArenaHostingDetailsPayload>): SagaIterator {
    const { arena_id } = action.payload;
    try {
        // arena_id travels as a query param; the endpoint takes an empty body.
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/unlock-arena`,
            {},
            { params: { arena_id } }
        );
        const payload = response.data as {
            message?: string;
            data?: ArenaHostingDetailsResponse;
        };
        yield put(unlockArenaSuccess({ data: payload?.data, message: payload?.message }));
        // The response carries the updated hosting + unlock records. Only fall back to
        // a re-read if the body didn't include them, so the UI can't go stale.
        if (!payload?.data) {
            yield put(fetchArenaHostingDetailsRequest({ arena_id }));
        }
    } catch (error: unknown) {
        yield put(unlockArenaFailure(getErrorMessage(error, "Failed to unlock Arena")));
    }
}

function* handleFetchArenaContests(
    action: PayloadAction<FetchArenaContestsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/contests`,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as { data?: { contests: ArenaContest[] } };
        yield put(fetchArenaContestsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaContestsFailure(
                getErrorMessage(error, "Failed to load Arena contests")
            )
        );
    }
}

// POST /group/arena/create-arena-contest. The payload is forwarded as-is —
// every create rule (role, unlock, hosting, limits, field checks) is enforced
// by the endpoint, so no validation happens client-side. The response echoes
// the inserted contest; the list is still re-read so the contests tab shows
// the server-ordered set.
function* handleCreateArenaContest(
    action: PayloadAction<CreateArenaContestPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/create-arena-contest`,
            action.payload
        );
        const payload = response.data as {
            message?: string;
            data?: { arenaContest?: ArenaContest };
        };
        yield put(
            createArenaContestSuccess({
                contest: payload?.data?.arenaContest ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchArenaContestsRequest({ arena_id: action.payload.arena_id }));
    } catch (error: unknown) {
        yield put(
            createArenaContestFailure(
                getErrorMessage(error, "Failed to create the Arena contest")
            )
        );
    }
}

// GET /group/arena/contest/:contest_id — a single contest for the detail page.
// contest_id is a path param; the endpoint resolves the arena from the contest and
// 403s callers who aren't active Arena members. The response carries the contest,
// its arena identity, the live participant count, and the caller's own
// participation. The page also falls back to the already-loaded contests list so
// navigating in from the list renders at once.
function* handleFetchArenaContestDetail(
    action: PayloadAction<FetchArenaContestDetailPayload>
): SagaIterator {
    const { contest_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/contest/${contest_id}`
        );
        const payload = response.data as { data?: ArenaContestDetailResponse };
        yield put(fetchArenaContestDetailSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaContestDetailFailure(
                getErrorMessage(error, "Failed to load the contest")
            )
        );
    }
}

// PUT /group/arena/contest/:contest_id/:action — one endpoint per lifecycle
// transition (schedule / open / lock / grading / archive), organizer only.
// contest_id is a path param and no body is required. The endpoint enforces role,
// the from-state, and any timing gate (opens_at / locks_at), so nothing is
// validated client-side. It echoes the transitioned contest; the list is also
// re-read so the contests tab reflects the server-ordered set.
function* handleAdvanceArenaContest(
    action: PayloadAction<AdvanceArenaContestPayload>
): SagaIterator {
    const { arena_id, contest_id, action: transition } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/arena/contest/${contest_id}/${transition}`,
            {}
        );
        const payload = response.data as {
            message?: string;
            data?: { contest?: ArenaContest };
        };
        yield put(
            advanceArenaContestSuccess({
                contest: payload?.data?.contest ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchArenaContestsRequest({ arena_id }));
    } catch (error: unknown) {
        yield put(
            advanceArenaContestFailure(
                getErrorMessage(error, "Failed to update the contest")
            )
        );
    }
}

// POST /group/arena/join-arena-contest — body { contest_id, rules_version }. Member
// only. The endpoint enforces the join window (open + within opens_at/locks_at),
// writable hosting, member role, and that rules_version matches the contest's
// current version. It returns the opted_in participant, which becomes the caller's
// own participation. No re-read is needed — the returned row is authoritative.
function* handleJoinArenaContest(
    action: PayloadAction<JoinArenaContestPayload>
): SagaIterator {
    const { contest_id, rules_version } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/join-arena-contest`,
            { contest_id, rules_version }
        );
        const payload = response.data as {
            message?: string;
            data?: { participant?: ArenaContestParticipant };
        };
        yield put(
            joinArenaContestSuccess({
                participant: payload?.data?.participant ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            joinArenaContestFailure(
                getErrorMessage(error, "Failed to join the contest")
            )
        );
    }
}

// GET /group/arena/staff-announcements — page window of published announcements,
// pinned-first then newest. Any active member can read; posting is staff-only and
// handled separately.
function* handleFetchStaffAnnouncements(
    action: PayloadAction<FetchStaffAnnouncementPayload>
): SagaIterator {
    const { arena_id, group_type, page = 1, limit = 10 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${feedAnnouncementUrl(group_type)}s`,
            { params: { ...feedGroupRef(arena_id, group_type), page, limit } }
        );
        const payload = response.data as {
            data?: {
                announcements: StaffAnnouncement[];
                pagination?: FetchGroupsPaginationPayload;
            };
        };
        const announcements = payload.data?.announcements ?? [];
        const pagination = payload.data?.pagination;
        yield put(
            fetchStaffAnnouncementsSuccess({
                announcements,
                page,
                hasMore: pagination?.hasMore ?? announcements.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchStaffAnnouncementsFailure(
                getErrorMessage(error, "Failed to load staff announcements")
            )
        );
    }
}

// POST /group/arena/staff-announcement — body is { arena_id, text }. The response
// echoes the raw inserted row (no author join), so the list is re-read at page 1
// to pick up the author-joined, pinned-ordered version.
function* handleCreateStaffAnnouncement(
    action: PayloadAction<CreateStaffAnnouncementPayload>
): SagaIterator {
    const { arena_id, group_type, text } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            feedAnnouncementUrl(group_type),
            { ...feedGroupRef(arena_id, group_type), text }
        );
        const payload = response.data as {
            message?: string;
            data?: { announcement?: StaffAnnouncement };
        };
        yield put(
            createStaffAnnouncementSuccess({
                announcement: payload?.data?.announcement ?? null,
                message: payload?.message,
            })
        );
        yield put(
            fetchStaffAnnouncementsRequest({ arena_id, group_type, page: 1 })
        );
    } catch (error: unknown) {
        yield put(
            createStaffAnnouncementFailure(
                getErrorMessage(error, "Failed to publish the announcement")
            )
        );
    }
}

// DELETE /group/arena/staff-announcement/:announcement_id — soft delete, allowed
// for the post author or the Arena owner. The response returns only { id }, and
// the reducer drops that row from the list, so no re-read is needed.
function* handleDeleteStaffAnnouncement(
    action: PayloadAction<DeleteStaffAnnouncementPayload>
): SagaIterator {
    const { announcement_id, group_type } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${feedAnnouncementUrl(group_type)}/${announcement_id}`
        );
        const payload = response.data as { message?: string; data?: { id?: string } };
        yield put(
            deleteStaffAnnouncementSuccess({
                id: payload?.data?.id ?? announcement_id,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        // A 404 is NOT reported as success here. It is ambiguous: it means "already
        // deleted", but equally "this id belongs to the other surface" (the League
        // and Arena resolvers each 404 a foreign id) or "that route is not declared".
        // Reporting it as success would drop the row and toast "deleted
        // successfully." while the post is still live. The stale-row case that made
        // that tempting is fixed at the source instead — see resetGroupFeed.
        yield put(
            deleteStaffAnnouncementFailure(
                getErrorMessage(error, "Failed to delete the announcement")
            )
        );
    }
}

// PUT /group/arena/staff-announcement/:announcement_id — partial edit (author or
// owner). The response echoes the updated row (no author join), so the reducer
// merges only the rewritten columns into the existing list row.
function* handleEditStaffAnnouncement(
    action: PayloadAction<EditStaffAnnouncementPayload>
): SagaIterator {
    const { announcement_id, group_type, text, title } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${feedAnnouncementUrl(group_type)}/${announcement_id}`,
            { text, ...(title !== undefined ? { title } : {}) }
        );
        const payload = response.data as {
            message?: string;
            data?: { announcement?: StaffAnnouncement };
        };
        if (!payload?.data?.announcement) {
            yield put(editStaffAnnouncementFailure("The announcement could not be updated."));
            return;
        }
        yield put(
            editStaffAnnouncementSuccess({
                announcement: payload.data.announcement,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            editStaffAnnouncementFailure(
                getErrorMessage(error, "Failed to update the announcement")
            )
        );
    }
}

// PUT /group/arena/staff-announcement/:announcement_id/pin — sets is_pinned
// (author or owner). Response returns { id, is_pinned }; the reducer flips that
// row's pin flag and the merged feed re-sorts pinned-first.
//
// Branches on group_type like edit/delete. `is_pinned` must stay a real JSON
// boolean: both controllers do a strict `typeof is_pinned !== "boolean"` check and
// 400 "is_pinned (boolean) is required!" on the string "true" or on 1/0.
function* handlePinStaffAnnouncement(
    action: PayloadAction<PinStaffAnnouncementPayload>
): SagaIterator {
    const { announcement_id, group_type, is_pinned } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            feedAnnouncementPinUrl(announcement_id, group_type),
            { is_pinned }
        );
        const payload = response.data as {
            message?: string;
            data?: { id?: string; is_pinned?: boolean };
        };
        yield put(
            pinStaffAnnouncementSuccess({
                id: payload?.data?.id ?? announcement_id,
                is_pinned: payload?.data?.is_pinned ?? is_pinned,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            pinStaffAnnouncementFailure(
                getErrorMessage(error, "Failed to update the pin state")
            )
        );
    }
}

// GET /group/arena/staff-picks — page window of picks tagged pick_type=FEED,
// newest first, author profile embedded. Any active member can read.
function* handleFetchStaffPicks(
    action: PayloadAction<FetchStaffPickPayload>
): SagaIterator {
    const { arena_id, group_type, page = 1, limit = 10 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/staff-picks`,
            { params: { ...feedGroupRef(arena_id, group_type), page, limit } }
        );
        const payload = response.data as {
            data?: {
                staffPicks: ArenaStaffPick[];
                pagination?: FetchGroupsPaginationPayload;
            };
        };
        const staffPicks = payload.data?.staffPicks ?? [];
        const pagination = payload.data?.pagination;
        yield put(
            fetchStaffPicksSuccess({
                staffPicks,
                page,
                hasMore: pagination?.hasMore ?? staffPicks.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchStaffPicksFailure(getErrorMessage(error, "Failed to load staff picks"))
        );
    }
}

// POST /group/arena/staff-pick — body is the PickBuilder payload plus arena_id.
// The response echoes the inserted pick (with no author join), so the list is
// re-read at page 1 to pick up the author-joined row.
function* handleCreateStaffPick(
    action: PayloadAction<CreateStaffPickPayload>
): SagaIterator {
    const { group_type, arena_id, ...pick } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/staff-pick`,
            { ...pick, ...feedGroupRef(arena_id, group_type) }
        );
        const payload = response.data as {
            message?: string;
            data?: { staffPick?: ArenaStaffPick };
        };
        yield put(
            createStaffPickSuccess({
                staffPick: payload?.data?.staffPick ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchStaffPicksRequest({ arena_id, group_type, page: 1 }));
    } catch (error: unknown) {
        yield put(
            createStaffPickFailure(getErrorMessage(error, "Failed to create the staff pick"))
        );
    }
}

// POST /group/arena/community-pick — a member's NFL moneyline pick. Same body as a
// Staff Pick; the endpoint enforces member role, writable hosting, and a 3-per-24h
// rate limit. There is no community-pick list endpoint yet, so nothing is re-read —
// the created pick is returned and surfaced through the composer bridge.
function* handleCreateCommunityPick(
    action: PayloadAction<CreateCommunityPickPayload>
): SagaIterator {
    const { group_type, arena_id, ...pick } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/community-pick`,
            { ...pick, ...feedGroupRef(arena_id, group_type) }
        );
        const payload = response.data as {
            message?: string;
            data?: { communityPick?: Pick };
        };
        yield put(
            createCommunityPickSuccess({
                communityPick: payload?.data?.communityPick ?? null,
                message: payload?.message,
            })
        );
        // Re-read the list so the just-posted pick appears in the feed immediately.
        yield put(fetchCommunityPicksRequest({ arena_id, group_type, page: 1 }));
    } catch (error: unknown) {
        yield put(
            createCommunityPickFailure(
                getErrorMessage(error, "Failed to post the community pick")
            )
        );
    }
}

// GET /group/arena/community-picks — a page of member community picks (newest
// first, author profile joined). Any active Arena member can read.
function* handleFetchCommunityPicks(
    action: PayloadAction<FetchCommunityPicksPayload>
): SagaIterator {
    const { arena_id, group_type, page = 1, limit = 10 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/community-picks`,
            { params: { ...feedGroupRef(arena_id, group_type), page, limit } }
        );
        const payload = response.data as {
            data?: {
                communityPicks: ArenaCommunityPick[];
                pagination?: FetchGroupsPaginationPayload;
            };
        };
        const communityPicks = payload.data?.communityPicks ?? [];
        const pagination = payload.data?.pagination;
        yield put(
            fetchCommunityPicksSuccess({
                communityPicks,
                page,
                hasMore: pagination?.hasMore ?? communityPicks.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchCommunityPicksFailure(
                getErrorMessage(error, "Failed to load community picks")
            )
        );
    }
}

// PUT /group/arena/community-pick/:pick_id — the author re-picks. The body carries
// the changed fields; the endpoint enforces author + pending + pregame. It echoes
// the updated row (no author join), so the reducer keeps the existing author.
function* handleUpdateCommunityPick(
    action: PayloadAction<UpdateCommunityPickPayload>
): SagaIterator {
    const { pick_id, group_type, changes } = action.payload;
    // The update controllers destructure a FIXED list of keys and silently drop
    // everything else. `arena_id` is a create-only key (update is path-scoped), and
    // buildCommunityPickPayload hardcodes it — so a League re-pick was PUTting
    // `arena_id: <leagueId>` under an Arena-named field. Drop it rather than lean on
    // the controller ignoring it.
    const { arena_id: _unusedGroupRef, ...body } = changes;
    void _unusedGroupRef;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/community-pick/${pick_id}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: { communityPick?: Pick };
        };
        // A 200 here ALWAYS carries data.communityPick (the full `picks` row from a
        // bare .select()). Without this guard an absent row would still resolve the
        // composer as "accepted" via updateCommunityPickMessage while the reducer's
        // `if (updated)` skipped the patch — "Community pick updated." over the OLD
        // selection. Mirrors handleEditStaffAnnouncement, which already guards it.
        if (!payload?.data?.communityPick) {
            yield put(
                updateCommunityPickFailure("The community pick could not be updated.")
            );
            return;
        }
        yield put(
            updateCommunityPickSuccess({
                communityPick: payload.data.communityPick,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            updateCommunityPickFailure(
                getErrorMessage(error, "Failed to update the community pick")
            )
        );
    }
}

// DELETE /group/arena/community-pick/:pick_id — author-only hard delete. The
// response returns only { id }; the reducer drops that row from the list.
function* handleDeleteCommunityPick(
    action: PayloadAction<DeleteCommunityPickPayload>
): SagaIterator {
    const { pick_id, group_type } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/community-pick/${pick_id}`
        );
        const payload = response.data as { message?: string; data?: { id?: string } };
        yield put(
            deleteCommunityPickSuccess({
                id: payload?.data?.id ?? pick_id,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        // Same reasoning as the announcement delete: a 404 here is ambiguous —
        // resolveEditableCommunityPick hard-filters on pick_type, so a pick id from
        // the other surface 404s exactly like an already-deleted one. Never report it
        // as success.
        yield put(
            deleteCommunityPickFailure(
                getErrorMessage(error, "Failed to delete the community pick")
            )
        );
    }
}

// GET /group/arena/joined-open-contests — the member's joined, still-open contests
// (opted_in or entered, before locks_at) for the competitive-pick contest dropdown.
function* handleFetchJoinedOpenContests(
    action: PayloadAction<FetchJoinedOpenContestsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/joined-open-contests`,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as {
            data?: { contests?: JoinedOpenArenaContest[] };
        };
        yield put(
            fetchJoinedOpenContestsSuccess({ contests: payload.data?.contests ?? [] })
        );
    } catch (error: unknown) {
        yield put(
            fetchJoinedOpenContestsFailure(
                getErrorMessage(error, "Failed to load your open contests")
            )
        );
    }
}

// POST /group/arena/contest/:contest_id/entry — a member's single competitive pick
// into a joined, open contest. The endpoint enforces the open window, single_pick,
// eligible game, member role, opted_in status and rules acceptance. It returns the
// created pick + entered participant; the joined list is re-read so that contest
// drops out of the enterable dropdown.
function* handleSubmitArenaContestEntry(
    action: PayloadAction<SubmitArenaContestEntryPayload>
): SagaIterator {
    const { contest_id, arena_id, entry } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/contest/${contest_id}/entry`,
            entry
        );
        const payload = response.data as {
            message?: string;
            data?: { pick?: Pick };
        };
        yield put(
            submitArenaContestEntrySuccess({
                pick: payload?.data?.pick ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchJoinedOpenContestsRequest({ arena_id }));
        // The caller's own entry is revealed (is_own) in the open-contest picks, so
        // re-read them for the entry to appear in the feed immediately (matches the
        // replace path).
        yield put(fetchOpenContestPicksRequest({ arena_id, page: 1 }));
    } catch (error: unknown) {
        yield put(
            submitArenaContestEntryFailure(
                getErrorMessage(error, "Failed to submit your contest entry")
            )
        );
    }
}

// PUT /group/arena/competitive-pick/:pick_id (updateCompetitivePick) — a member
// re-picks their OWN competitive entry while the contest is still open (pending +
// pregame). Author + pending + open + eligible-game are enforced server-side, and
// `points` is recomputed from american_odds. It returns the updated pick; the
// open-contest picks are re-read so the member sees their new entry immediately.
function* handleReplaceArenaContestEntry(
    action: PayloadAction<UpdateCompetitivePickPayload>
): SagaIterator {
    const { pick_id, arena_id, changes } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/arena/competitive-pick/${pick_id}`,
            changes
        );
        const payload = response.data as {
            message?: string;
            data?: { pick?: Pick };
        };
        yield put(
            replaceArenaContestEntrySuccess({
                pick: payload?.data?.pick ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchOpenContestPicksRequest({ arena_id, page: 1 }));
    } catch (error: unknown) {
        yield put(
            replaceArenaContestEntryFailure(
                getErrorMessage(error, "Failed to replace your contest entry")
            )
        );
    }
}

// GET /group/arena/contest-picks/open — competitive entries in OPEN contests. The
// server returns pick=null (details hidden until lock), so other members' picks
// can't be revealed even from the network tab.
function* handleFetchOpenContestPicks(
    action: PayloadAction<FetchArenaContestPicksPayload>
): SagaIterator {
    const { arena_id, page = 1, limit = 20 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/contest-picks/open`,
            { params: { arena_id, page, limit } }
        );
        const payload = response.data as {
            data?: { picks: ArenaContestPick[]; pagination?: FetchGroupsPaginationPayload };
        };
        const picks = payload.data?.picks ?? [];
        yield put(
            fetchOpenContestPicksSuccess({
                picks,
                page,
                hasMore: payload.data?.pagination?.hasMore ?? picks.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchOpenContestPicksFailure(
                getErrorMessage(error, "Failed to load open contest picks")
            )
        );
    }
}

// GET /group/arena/contest-picks/closed — competitive entries in CLOSED (locked+)
// contests, with full pick details revealed.
function* handleFetchClosedContestPicks(
    action: PayloadAction<FetchArenaContestPicksPayload>
): SagaIterator {
    const { arena_id, page = 1, limit = 20 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/contest-picks/closed`,
            { params: { arena_id, page, limit } }
        );
        const payload = response.data as {
            data?: { picks: ArenaContestPick[]; pagination?: FetchGroupsPaginationPayload };
        };
        const picks = payload.data?.picks ?? [];
        yield put(
            fetchClosedContestPicksSuccess({
                picks,
                page,
                hasMore: payload.data?.pagination?.hasMore ?? picks.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchClosedContestPicksFailure(
                getErrorMessage(error, "Failed to load closed contest picks")
            )
        );
    }
}

// DELETE /group/arena/staff-pick/:pick_id — hard delete (author or owner). The
// response returns only { id }, and the reducer drops that row from the list, so
// no re-read is needed.
function* handleDeleteStaffPick(
    action: PayloadAction<DeleteStaffPickPayload>
): SagaIterator {
    const { pick_id, group_type } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/group/${feedScope(group_type).segment}/staff-pick/${pick_id}`
        );
        const payload = response.data as { message?: string; data?: { id?: string } };
        yield put(
            deleteStaffPickSuccess({
                id: payload?.data?.id ?? pick_id,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            deleteStaffPickFailure(getErrorMessage(error, "Failed to delete the staff pick"))
        );
    }
}

/**
 * remove-member: PUT with { arena_id, user_id }, owner-only, and a message-only
 * body. It does not echo the updated member, so it re-reads the member list (and
 * the group, whose header carries member/manager counts) once the write lands.
 *
 * make-manager and make-member used to share this shape. Both routes have since
 * been DELETED server-side: promotion is an invitation now — POST
 * /group/manager-invitation answers 202 with a pending row and changes nobody's
 * role — and demotion is DELETE /group/manager, which serves Leagues too. Both
 * live in groupsSaga.
 */
const arenaMemberActionSaga = (
    endpoint: "remove-member",
    onSuccess: ActionCreatorWithOptionalPayload<{ message?: string } | undefined, string>,
    onFailure: ActionCreatorWithPayload<string, string>,
    fallbackError: string
) =>
    function* (action: PayloadAction<ArenaMemberActionPayload>): SagaIterator {
        const { arena_id, user_id, page = 1, limit = 10 } = action.payload;
        try {
            const response: AxiosResponse<unknown> = yield call(
                axiosInstance.put,
                `${API_BASE_URL}/group/arena/${endpoint}`,
                { arena_id, user_id }
            );
            const payload = response.data as { message?: string };
            yield put(onSuccess({ message: payload?.message }));
            yield put(
                fetchGroupMembersByGroupIdRequest({ group_id: arena_id, page, limit })
            );
            yield put(fetchGroupByIdRequest({ groupId: arena_id }));
        } catch (error: unknown) {
            yield put(onFailure(getErrorMessage(error, fallbackError)));
        }
    };

const handleRemoveArenaMember = arenaMemberActionSaga(
    "remove-member",
    removeArenaMemberSuccess,
    removeArenaMemberFailure,
    "Failed to remove this member from the Arena"
);

/**
 * activate-hosting, schedule-pause and cancel-pause all POST { arena_id, ... },
 * are owner-only, and return the rewritten hosting row. What none of them return
 * is available_tiers — only fetchArenaHosting computes that — so each re-reads
 * hosting-details afterwards, otherwise the tier cards keep rendering the
 * is_current / kind / allowed verdicts from before the change.
 */
const arenaHostingActionSaga = (
    endpoint: "activate-hosting" | "schedule-pause" | "cancel-pause",
    onSuccess: ActionCreatorWithPayload<
        { data?: ArenaHostingActionResponse; message?: string },
        string
    >,
    onFailure: ActionCreatorWithPayload<string, string>,
    fallbackError: string
) =>
    function* (
        action: PayloadAction<ActivateArenaHostingPayload | ArenaPausePayload>
    ): SagaIterator {
        const { arena_id } = action.payload;
        try {
            const response: AxiosResponse<unknown> = yield call(
                axiosInstance.post,
                `${API_BASE_URL}/group/arena/${endpoint}`,
                action.payload
            );
            const payload = response.data as {
                message?: string;
                data?: ArenaHostingActionResponse;
            };
            yield put(onSuccess({ data: payload?.data, message: payload?.message }));
            yield put(fetchArenaHostingDetailsRequest({ arena_id }));
        } catch (error: unknown) {
            yield put(onFailure(getErrorMessage(error, fallbackError)));
        }
    };

const handleActivateArenaHosting = arenaHostingActionSaga(
    "activate-hosting",
    activateArenaHostingSuccess,
    activateArenaHostingFailure,
    "Failed to change this Arena's hosting tier"
);

const handleScheduleArenaPause = arenaHostingActionSaga(
    "schedule-pause",
    scheduleArenaPauseSuccess,
    scheduleArenaPauseFailure,
    "Failed to schedule the hosting pause"
);

const handleCancelArenaPause = arenaHostingActionSaga(
    "cancel-pause",
    cancelArenaPauseSuccess,
    cancelArenaPauseFailure,
    "Failed to cancel the scheduled pause"
);

/* ============================================================================
 * ARENA BILLING — real Stripe money.
 *
 * The client never grants anything. It starts a Checkout Session, hands the
 * browser to Stripe, and afterwards asks the backend what happened. Entitlement
 * is written by the webhook, so nothing here can be spoofed by a user who
 * replays a request or edits a response.
 * ========================================================================== */

function* handleFetchArenaSubscription(
    action: PayloadAction<ArenaHostingDetailsPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/subscription`,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as { data?: ArenaSubscriptionResponse };
        yield put(fetchArenaSubscriptionSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaSubscriptionFailure(
                getErrorMessage(error, "Failed to load this Arena's billing details")
            )
        );
    }
}

/**
 * Creates the Checkout Session and hands the browser to Stripe.
 *
 * Mirrors the League flow deliberately: dispatch success BEFORE assigning
 * window.location so the confirm button is already latched when the page starts
 * unloading. A `null` url means the backend decided there was nothing to pay
 * for, in which case we re-read rather than navigate.
 */
function* handleCreateArenaCheckout(action: PayloadAction<ArenaCheckoutPayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/checkout-session`,
            action.payload
        );
        const payload = response.data as { data?: ArenaCheckoutResponse };
        const url = payload.data?.url;
        const redirecting = Boolean(url) && typeof window !== "undefined";

        yield put(createArenaCheckoutSuccess({ redirecting }));

        if (redirecting) {
            window.location.href = url as string;
        } else {
            yield put(fetchArenaSubscriptionRequest({ arena_id: action.payload.arena_id }));
        }
    } catch (error: unknown) {
        yield put(
            createArenaCheckoutFailure(getErrorMessage(error, "Could not start Arena checkout"))
        );
    }
}

/**
 * Asks the backend what became of a completed checkout.
 *
 * This exists because the webhook and the browser race: Stripe redirects the
 * user back immediately, but the webhook that actually provisions the Arena may
 * land a second or two later — or, if it fails, not at all. The endpoint calls
 * the SAME idempotent fulfilment the webhook calls, so polling it is both safe
 * and self-healing rather than merely informational.
 */
function* handleFetchArenaCheckoutStatus(
    action: PayloadAction<{ session_id: string }>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/checkout-status`,
            { params: { session_id: action.payload.session_id } }
        );
        const payload = response.data as { data?: ArenaCheckoutStatusResponse };
        yield put(fetchArenaCheckoutStatusSuccess(payload.data));

        // Once complete, re-read the Arena's billing so the screen behind the
        // redirect is correct rather than showing pre-payment state.
        if (payload.data?.status === "complete" && payload.data.arena_id) {
            yield put(fetchArenaSubscriptionRequest({ arena_id: payload.data.arena_id }));
        }
    } catch (error: unknown) {
        yield put(
            fetchArenaCheckoutStatusFailure(
                getErrorMessage(error, "Could not confirm your payment")
            )
        );
    }
}

/** change-plan / cancel-hosting / resume-hosting share one envelope and one
 *  loading slot, so they share one saga factory. */
const arenaBillingActionSaga = (
    endpoint: "change-plan" | "cancel-hosting" | "resume-hosting",
    onSuccess: ActionCreatorWithPayload<
        { data?: ArenaBillingActionResponse; message?: string },
        string
    >,
    onFailure: ActionCreatorWithPayload<string, string>,
    fallbackError: string
) =>
    function* (
        action: PayloadAction<ChangeArenaPlanPayload | ArenaPausePayload>
    ): SagaIterator {
        const { arena_id } = action.payload;
        try {
            const response: AxiosResponse<unknown> = yield call(
                axiosInstance.post,
                `${API_BASE_URL}/group/arena/${endpoint}`,
                action.payload
            );
            const payload = response.data as {
                message?: string;
                data?: ArenaBillingActionResponse;
            };
            yield put(onSuccess({ data: payload?.data, message: payload?.message }));
            // The response carries the subscription but not the projected
            // hosting row (limits, status) — re-read so the tier cards and the
            // limit copy cannot render a pre-change verdict.
            yield put(fetchArenaSubscriptionRequest({ arena_id }));
        } catch (error: unknown) {
            yield put(onFailure(getErrorMessage(error, fallbackError)));
        }
    };

const handleChangeArenaPlan = arenaBillingActionSaga(
    "change-plan",
    changeArenaPlanSuccess,
    changeArenaPlanFailure,
    "Failed to change this Arena's plan"
);

const handleCancelArenaHosting = arenaBillingActionSaga(
    "cancel-hosting",
    cancelArenaHostingSuccess,
    cancelArenaHostingFailure,
    "Failed to cancel hosting"
);

const handleResumeArenaHosting = arenaBillingActionSaga(
    "resume-hosting",
    resumeArenaHostingSuccess,
    resumeArenaHostingFailure,
    "Failed to resume hosting"
);

function* handleOpenArenaBillingPortal(action: PayloadAction<ArenaPausePayload>): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/billing-portal`,
            action.payload
        );
        const payload = response.data as { data?: { url?: string | null } };
        yield put(openArenaBillingPortalSuccess());
        if (payload.data?.url && typeof window !== "undefined") {
            window.location.href = payload.data.url;
        }
    } catch (error: unknown) {
        yield put(
            openArenaBillingPortalFailure(
                getErrorMessage(error, "Could not open the billing portal")
            )
        );
    }
}

function* handleFetchArenaInvoices(
    action: PayloadAction<FetchArenaInvoicesPayload>
): SagaIterator {
    try {
        const { arena_id, page = 1, limit = 10 } = action.payload;
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/invoices`,
            { params: { arena_id, page, limit } }
        );
        const payload = response.data as {
            data?: { transactions?: ArenaInvoice[]; pagination?: { hasMore?: boolean } };
        };
        const transactions = payload.data?.transactions ?? [];
        yield put(
            fetchArenaInvoicesSuccess({
                transactions,
                page,
                hasMore: payload.data?.pagination?.hasMore ?? transactions.length === limit,
            })
        );
    } catch (error: unknown) {
        yield put(
            fetchArenaInvoicesFailure(getErrorMessage(error, "Failed to load Arena invoices"))
        );
    }
}

function* handleLeaveArena(action: PayloadAction<LeaveArenaPayload>): SagaIterator {
    try {
        // No list refresh on success: the caller stops being a member, so the
        // page navigates away rather than re-reading an Arena it can no longer see.
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/leave`,
            { arena_id: action.payload.arena_id }
        );
        const payload = response.data as { message?: string };
        yield put(leaveArenaSuccess({ message: payload?.message }));
    } catch (error: unknown) {
        yield put(leaveArenaFailure(getErrorMessage(error, "Failed to leave this Arena")));
    }
}

function* handleInitiateArenaDelete(
    action: PayloadAction<InitiateArenaDeletePayload>
): SagaIterator {
    try {
        // 202 + an emailed code; nothing is deleted by this call.
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/${action.payload.arena_id}/delete/initiate`,
            {}
        );
        const payload = response.data as { message?: string };
        yield put(initiateArenaDeleteSuccess({ message: payload?.message }));
    } catch (error: unknown) {
        yield put(
            initiateArenaDeleteFailure(
                getErrorMessage(error, "Failed to send the deletion code")
            )
        );
    }
}

function* handleConfirmArenaDelete(
    action: PayloadAction<ConfirmArenaDeletePayload>
): SagaIterator {
    const { arena_id, otp } = action.payload;
    try {
        // The endpoint reads otp from body or query; axios DELETE bodies are
        // awkward, so it travels as a query param like the League flow does.
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/group/arena/${arena_id}/delete/confirm`,
            { params: { otp } }
        );
        const payload = response.data as { message?: string };
        yield put(confirmArenaDeleteSuccess({ message: payload?.message }));
    } catch (error: unknown) {
        yield put(
            confirmArenaDeleteFailure(getErrorMessage(error, "Failed to delete this Arena"))
        );
    }
}

/* ----------------------------------------------------------------------------
 * THE POST-PURCHASE SETUP WIZARD — POST /group/arena/complete-setup
 *
 * The join policy and the contact email go up TOGETHER, because
 * `join_policy IS NOT NULL` is the gate the join path reads: an Arena whose
 * policy landed but whose email did not would open for joining while still
 * unable to offer a prize. The server refuses to half-land them; this just has
 * to not split them into two calls.
 *
 * The 409 `arena_setup_already_complete` is NOT reported as a failure. It means
 * setup HAS happened — a double-submit, or a wizard reopened on a finished
 * Arena — and the only useful response is to let the screen move on.
 * -------------------------------------------------------------------------- */
function* handleCompleteArenaSetup(
    action: PayloadAction<CompleteArenaSetupPayload>
): SagaIterator {
    const { arena_id } = action.payload;
    try {
        yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/complete-setup`,
            action.payload
        );
        yield put(completeArenaSetupSuccess());
        // The dashboard gates its owner redirect on the group record's
        // setup_complete, so the stale copy has to go before the wizard hands
        // back to /arena/:id — otherwise it bounces straight back here.
        yield put(fetchGroupByIdRequest({ groupId: arena_id }));
    } catch (error: unknown) {
        const status = axios.isAxiosError(error) ? error.response?.status ?? null : null;
        const code = axios.isAxiosError(error)
            ? (error.response?.data as { code?: string } | undefined)?.code
            : undefined;
        if (status === 409 && code === "arena_setup_already_complete") {
            yield put(markArenaSetupComplete());
            yield put(fetchGroupByIdRequest({ groupId: arena_id }));
            return;
        }
        yield put(
            completeArenaSetupFailure(
                getErrorMessage(error, "Failed to complete Arena setup")
            )
        );
    }
}

/**
 * PUT /group/arena/join-policy — the later edit, from Arena Settings.
 *
 * Re-reads the group afterwards for the same reason updateArenaDetails does:
 * the reply carries the identity columns only, and the dashboard renders the
 * whole record.
 */
function* handleUpdateArenaJoinPolicy(
    action: PayloadAction<UpdateArenaJoinPolicyPayload>
): SagaIterator {
    const { arena_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/arena/join-policy`,
            action.payload
        );
        const payload = response.data as {
            message?: string;
            data?: { pending_request_count?: number };
        };
        yield put(
            updateArenaJoinPolicySuccess({
                message: payload?.message,
                pending_request_count: payload?.data?.pending_request_count,
            })
        );
        yield put(fetchGroupByIdRequest({ groupId: arena_id }));
    } catch (error: unknown) {
        yield put(
            updateArenaJoinPolicyFailure(
                getErrorMessage(error, "Failed to update Arena join policy")
            )
        );
    }
}

/** GET /group/arena/join-requests — the owner's queue, oldest first. */
function* handleFetchArenaJoinRequests(
    action: PayloadAction<FetchArenaJoinRequestsPayload>
): SagaIterator {
    const { arena_id, status, page, limit } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/join-requests`,
            {
                params: {
                    arena_id,
                    ...(status ? { status } : {}),
                    ...(page ? { page } : {}),
                    ...(limit ? { limit } : {}),
                },
            }
        );
        const payload = response.data as { data?: ArenaJoinRequestsData };
        if (!payload?.data) {
            yield put(fetchArenaJoinRequestsFailure("Failed to load Arena join requests"));
            return;
        }
        yield put(fetchArenaJoinRequestsSuccess({ arena_id, data: payload.data }));
    } catch (error: unknown) {
        yield put(
            fetchArenaJoinRequestsFailure(
                getErrorMessage(error, "Failed to load Arena join requests")
            )
        );
    }
}

/**
 * GET /group/arena/member-contacts/list — the on-screen contact list.
 *
 * Ordinary JSON, paged, and NOT the export: the CSV route beside it is
 * throttled and writes an audit line per call, so painting a panel through it
 * would charge every glance as a file leaving the building. Appends past page 1
 * like the roster it sits under.
 */
function* handleFetchArenaMemberContacts(
    action: PayloadAction<FetchArenaMemberContactsPayload>
): SagaIterator {
    const { arena_id, page, limit } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/member-contacts/list`,
            {
                // Never a hand-built query string: the request interceptor signs
                // the path plus SORTED params, and appending by hand breaks it.
                params: {
                    arena_id,
                    ...(page ? { page } : {}),
                    ...(limit ? { limit } : {}),
                },
            }
        );

        const payload = response.data as { data?: ArenaMemberContactsData };

        if (!payload?.data) {
            yield put(
                fetchArenaMemberContactsFailure("Failed to load Arena member contacts")
            );
            return;
        }

        yield put(fetchArenaMemberContactsSuccess({ arena_id, data: payload.data }));
    } catch (error: unknown) {
        yield put(
            fetchArenaMemberContactsFailure(
                getErrorMessage(error, "Failed to load Arena member contacts")
            )
        );
    }
}

/**
 * GET /group/arena/member-contacts — the CSV download.
 *
 * The one call on this slice that does NOT answer a JSON envelope, so:
 *
 *  - `transformResponse` is the identity. Axios otherwise tries JSON.parse on
 *    every string body, which leaves a CSV alone but silently turns an ERROR
 *    body into an object — two shapes for one field. Forcing raw text means
 *    both paths are strings and the handling below is deterministic.
 *  - the filename is read off Content-Disposition rather than rebuilt from the
 *    Arena name, so the two can never disagree. The API CORS-exposes it.
 *
 * The save happens here rather than in the component because it is a side
 * effect on a response the component never sees; nothing is kept afterwards.
 */
function* handleExportArenaMemberContacts(
    action: PayloadAction<ExportArenaMemberContactsPayload>
): SagaIterator {
    const { arena_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/member-contacts`,
            {
                params: { arena_id },
                responseType: "text",
                transformResponse: [(data: unknown) => data],
            }
        );

        const csv = typeof response.data === "string" ? response.data : "";

        if (!csv) {
            yield put(
                exportArenaMemberContactsFailure("Failed to export Arena member contacts")
            );
            return;
        }

        const headers = response.headers as Record<string, unknown> | undefined;

        yield call(
            downloadMemberContactsCsv,
            csv,
            memberContactsFilenameFrom(headers?.["content-disposition"])
        );

        yield put(exportArenaMemberContactsSuccess());
    } catch (error: unknown) {
        yield put(
            exportArenaMemberContactsFailure(
                getCsvErrorMessage(error, "Failed to export Arena member contacts")
            )
        );
    }
}

/**
 * PUT /group/arena/join-requests/respond.
 *
 * On an APPROVAL the roster changed, so the members list is re-read as well as
 * the queue — the approved member has to appear in the directory the owner is
 * looking at, not on the next mount.
 */
function* handleRespondArenaJoinRequest(
    action: PayloadAction<RespondArenaJoinRequestPayload>
): SagaIterator {
    const { arena_id, user_id, accept } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/arena/join-requests/respond`,
            action.payload
        );
        const payload = response.data as { message?: string };
        yield put(
            respondArenaJoinRequestSuccess({ user_id, message: payload?.message })
        );
        yield put(fetchArenaJoinRequestsRequest({ arena_id }));
        if (accept) {
            yield put(
                fetchGroupMembersByGroupIdRequest({ group_id: arena_id, page: 1, limit: 10 })
            );
        }
    } catch (error: unknown) {
        yield put(
            respondArenaJoinRequestFailure(
                getErrorMessage(error, "Failed to answer this join request")
            )
        );
        // A 403 `full` leaves the request PENDING — the owner said yes and the
        // room is out of seats. Re-read so the row the reducer would otherwise
        // have dropped comes back.
        yield put(fetchArenaJoinRequestsRequest({ arena_id }));
    }
}

function* handleUpdateArenaDetails(
    action: PayloadAction<UpdateArenaDetailsPayload>
): SagaIterator {
    const { arena_id } = action.payload;
    try {
        // The payload is forwarded as-is: the component only puts the fields it
        // actually changed on it, and the endpoint treats an absent key as
        // "leave alone" (vs. null, which clears).
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/arena/details`,
            action.payload
        );
        const payload = response.data as { message?: string };
        yield put(updateArenaDetailsSuccess({ message: payload?.message }));
        // The response carries only the identity columns; the dashboard renders
        // the full group record, so re-read it rather than patching a subset.
        yield put(fetchGroupByIdRequest({ groupId: arena_id }));
    } catch (error: unknown) {
        yield put(
            updateArenaDetailsFailure(
                getErrorMessage(error, "Failed to update Arena details")
            )
        );
    }
}

const TRANSFER_URL = `${API_BASE_URL}/group/arena/ownership-transfer`;

function* handleFetchArenaOwnershipTransfer(
    action: PayloadAction<FetchArenaOwnershipTransferPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            TRANSFER_URL,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as { data?: ArenaOwnershipTransferResponse };
        yield put(fetchArenaOwnershipTransferSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaOwnershipTransferFailure(
                getErrorMessage(error, "Failed to load the ownership transfer request")
            )
        );
    }
}

function* handleCreateArenaOwnershipTransfer(
    action: PayloadAction<CreateArenaOwnershipTransferPayload>
): SagaIterator {
    const { arena_id, to_user_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            TRANSFER_URL,
            { arena_id, to_user_id }
        );
        const payload = response.data as {
            message?: string;
            data?: { request?: ArenaOwnershipTransfer };
        };
        yield put(
            createArenaOwnershipTransferSuccess({
                request: payload?.data?.request ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            createArenaOwnershipTransferFailure(
                getErrorMessage(error, "Failed to send the ownership transfer invitation")
            )
        );
    }
}

function* handleRespondArenaOwnershipTransfer(
    action: PayloadAction<RespondArenaOwnershipTransferPayload>
): SagaIterator {
    const { request_id, action: response_action, arena_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${TRANSFER_URL}/respond`,
            { request_id, action: response_action }
        );
        const payload = response.data as {
            message?: string;
            data?: { request?: ArenaOwnershipTransfer };
        };
        yield put(
            respondArenaOwnershipTransferSuccess({
                request: payload?.data?.request ?? null,
                message: payload?.message,
            })
        );

        // Accepting moves groups.created_by and rewrites both parties' roles, so
        // the Arena and its member list have to be re-read — the current user's
        // own permissions across the whole dashboard just changed.
        if (response_action === "accept") {
            yield put(fetchGroupByIdRequest({ groupId: arena_id }));
            yield put(
                fetchGroupMembersByGroupIdRequest({ group_id: arena_id, page: 1, limit: 10 })
            );
        }
    } catch (error: unknown) {
        yield put(
            respondArenaOwnershipTransferFailure(
                getErrorMessage(
                    error,
                    response_action === "accept"
                        ? "Failed to accept Arena ownership"
                        : "Failed to decline the ownership invitation"
                )
            )
        );
    }
}

function* handleCancelArenaOwnershipTransfer(
    action: PayloadAction<CancelArenaOwnershipTransferPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${TRANSFER_URL}/cancel`,
            { request_id: action.payload.request_id }
        );
        const payload = response.data as {
            message?: string;
            data?: { request?: ArenaOwnershipTransfer };
        };
        yield put(
            cancelArenaOwnershipTransferSuccess({
                request: payload?.data?.request ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            cancelArenaOwnershipTransferFailure(
                getErrorMessage(error, "Failed to withdraw the ownership invitation")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * ARENA GUIDE — the welcome walkthrough for a newly joined member.
 *
 * Per-ARENA, which is why it is not a `tutorial_key` on the progress slice:
 * user_tutorial_progress has no group column, so joining a second Arena would
 * never show the guide again.
 * -------------------------------------------------------------------------- */

/**
 * GET /group/arena/guide?arena_id= — members only (403), Arenas only (404),
 * 410 for a deleted one.
 *
 * `should_show_guide` is derived server-side and is the ONLY field the screen
 * gates on; everything else in `guide` is there to word the dialog.
 */
function* handleFetchArenaGuideStatus(
    action: PayloadAction<FetchArenaGuideStatusPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/arena/guide`,
            { params: { arena_id: action.payload.arena_id } }
        );
        const payload = response.data as { data?: ArenaGuideStatusData };
        if (!payload?.data?.guide) {
            yield put(fetchArenaGuideStatusFailure("Failed to load the Arena guide status"));
            return;
        }
        yield put(fetchArenaGuideStatusSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchArenaGuideStatusFailure(
                getErrorMessage(error, "Failed to load the Arena guide status")
            )
        );
    }
}

/**
 * POST /group/arena/guide/viewed — `status` is 'completed' when they read it
 * through and 'dismissed' when they closed it early. Both silence the guide;
 * the split only exists so "how many members actually read it" stays an
 * answerable question.
 *
 * Idempotent server-side, so a double-fire on unmount is not an error.
 */
function* handleMarkArenaGuideViewed(
    action: PayloadAction<MarkArenaGuideViewedPayload>
): SagaIterator {
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/arena/guide/viewed`,
            action.payload
        );
        const payload = response.data as { data?: MarkArenaGuideViewedData };
        if (!payload?.data?.guide) {
            yield put(markArenaGuideViewedFailure("Failed to update the Arena guide status"));
            return;
        }
        yield put(markArenaGuideViewedSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            markArenaGuideViewedFailure(
                getErrorMessage(error, "Failed to update the Arena guide status")
            )
        );
    }
}

export default function* arenaSaga() {
    yield takeLatest(fetchArenaGroupsRequest.type, handleFetchArenaGroups);
    yield takeLatest(fetchOwnedArenasRequest.type, handleFetchOwnedArenas);
    yield takeLatest(fetchJoinedArenasRequest.type, handleFetchJoinedArenas);
    // takeLeading — see handleJoinLeague: a cancelled join still commits server-side
    // and the retry comes back "already a member".
    yield takeLeading(joinArenaRequest.type, handleJoinArena);
    yield takeLatest(fetchArenaHostingDetailsRequest.type, handleFetchArenaHostingDetails);
    yield takeLatest(fetchOwnedArenaHostingRequest.type, handleFetchOwnedArenaHosting);
    yield takeLatest(unlockArenaRequest.type, handleUnlockArena);
    yield takeLatest(fetchArenaContestsRequest.type, handleFetchArenaContests);
    yield takeLatest(createArenaContestRequest.type, handleCreateArenaContest);
    yield takeLatest(fetchArenaContestDetailRequest.type, handleFetchArenaContestDetail);
    yield takeLatest(advanceArenaContestRequest.type, handleAdvanceArenaContest);
    yield takeLatest(joinArenaContestRequest.type, handleJoinArenaContest);
    yield takeLatest(fetchStaffAnnouncementsRequest.type, handleFetchStaffAnnouncements);
    yield takeLatest(createStaffAnnouncementRequest.type, handleCreateStaffAnnouncement);
    yield takeEvery(deleteStaffAnnouncementRequest.type, handleDeleteStaffAnnouncement);
    yield takeLatest(editStaffAnnouncementRequest.type, handleEditStaffAnnouncement);
    yield takeEvery(pinStaffAnnouncementRequest.type, handlePinStaffAnnouncement);
    yield takeLatest(fetchStaffPicksRequest.type, handleFetchStaffPicks);
    yield takeLatest(createStaffPickRequest.type, handleCreateStaffPick);
    yield takeLatest(createCommunityPickRequest.type, handleCreateCommunityPick);
    yield takeLatest(fetchCommunityPicksRequest.type, handleFetchCommunityPicks);
    yield takeLatest(updateCommunityPickRequest.type, handleUpdateCommunityPick);
    yield takeEvery(deleteCommunityPickRequest.type, handleDeleteCommunityPick);
    yield takeLatest(fetchJoinedOpenContestsRequest.type, handleFetchJoinedOpenContests);
    yield takeLatest(submitArenaContestEntryRequest.type, handleSubmitArenaContestEntry);
    yield takeLatest(replaceArenaContestEntryRequest.type, handleReplaceArenaContestEntry);
    yield takeLatest(fetchOpenContestPicksRequest.type, handleFetchOpenContestPicks);
    yield takeLatest(fetchClosedContestPicksRequest.type, handleFetchClosedContestPicks);
    yield takeEvery(deleteStaffPickRequest.type, handleDeleteStaffPick);
    yield takeLatest(removeArenaMemberRequest.type, handleRemoveArenaMember);
    yield takeLatest(
        fetchArenaOwnershipTransferRequest.type,
        handleFetchArenaOwnershipTransfer
    );
    yield takeLatest(
        createArenaOwnershipTransferRequest.type,
        handleCreateArenaOwnershipTransfer
    );
    yield takeLatest(
        respondArenaOwnershipTransferRequest.type,
        handleRespondArenaOwnershipTransfer
    );
    yield takeLatest(
        cancelArenaOwnershipTransferRequest.type,
        handleCancelArenaOwnershipTransfer
    );
    yield takeLatest(updateArenaDetailsRequest.type, handleUpdateArenaDetails);
    /* ---- Joining: setup wizard + approval queue ---- */
    // takeLeading: the wizard's Save is a compare-and-swap server-side, and a
    // double-tap should not turn the second attempt into a 409 the owner sees.
    yield takeLeading(completeArenaSetupRequest.type, handleCompleteArenaSetup);
    yield takeLatest(updateArenaJoinPolicyRequest.type, handleUpdateArenaJoinPolicy);
    yield takeLatest(fetchArenaJoinRequestsRequest.type, handleFetchArenaJoinRequests);
    /* takeLeading, NOT takeLatest: the export is rate-limited to 5 calls a
     * minute per user, and a double-click on "Export contacts CSV" must not
     * spend two of them. A second dispatch while one is in flight is dropped. */
    yield takeLatest(fetchArenaMemberContactsRequest.type, handleFetchArenaMemberContacts);
    yield takeLeading(exportArenaMemberContactsRequest.type, handleExportArenaMemberContacts);
    // takeEvery, NOT takeLatest: each Approve/Decline answers a DIFFERENT
    // request, so a second click on another row must not cancel the first.
    yield takeEvery(respondArenaJoinRequestRequest.type, handleRespondArenaJoinRequest);
    yield takeLatest(activateArenaHostingRequest.type, handleActivateArenaHosting);
    yield takeLatest(scheduleArenaPauseRequest.type, handleScheduleArenaPause);
    yield takeLatest(cancelArenaPauseRequest.type, handleCancelArenaPause);

    /* ---- Arena billing (Stripe) ---- */
    yield takeLatest(fetchArenaSubscriptionRequest.type, handleFetchArenaSubscription);
    // takeLeading, not takeLatest: a cancelled checkout request may still have
    // created a Session server-side, and a second one would litter Stripe with
    // parallel sessions for the same Arena.
    yield takeLeading(createArenaCheckoutRequest.type, handleCreateArenaCheckout);
    yield takeLatest(fetchArenaCheckoutStatusRequest.type, handleFetchArenaCheckoutStatus);
    yield takeLeading(changeArenaPlanRequest.type, handleChangeArenaPlan);
    yield takeLeading(cancelArenaHostingRequest.type, handleCancelArenaHosting);
    yield takeLeading(resumeArenaHostingRequest.type, handleResumeArenaHosting);
    yield takeLeading(openArenaBillingPortalRequest.type, handleOpenArenaBillingPortal);
    yield takeLatest(fetchArenaInvoicesRequest.type, handleFetchArenaInvoices);
    yield takeLatest(initiateArenaDeleteRequest.type, handleInitiateArenaDelete);
    yield takeLatest(confirmArenaDeleteRequest.type, handleConfirmArenaDelete);
    yield takeLatest(leaveArenaRequest.type, handleLeaveArena);
    yield takeLatest(fetchArenaGuideStatusRequest.type, handleFetchArenaGuideStatus);
    yield takeLatest(markArenaGuideViewedRequest.type, handleMarkArenaGuideViewed);
}
