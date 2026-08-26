import { call, put, takeEvery, takeLatest } from "redux-saga/effects";
import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/api";
import axiosInstance from "@/lib/utils/axiosInstance";
import type { SagaIterator } from "redux-saga";
import type { PayloadAction } from "@reduxjs/toolkit";
import type {
    CreateFeedContestPayload,
    DeleteFeedContestData,
    DeleteFeedContestPayload,
    EnterFeedContestData,
    EnterFeedContestPayload,
    EnterPickemFeedContestData,
    EnterPickemFeedContestPayload,
    ReplacePickemFeedContestEntryData,
    ReplacePickemFeedContestEntryPayload,
    EnterTdPsychicFeedContestData,
    EnterTdPsychicFeedContestPayload,
    ReplaceTdPsychicFeedContestEntryData,
    ReplaceTdPsychicFeedContestEntryPayload,
    FeedContest,
    FeedContestAwardReversalData,
    FeedContestAwardReversalPayload,
    FeedContestDetailData,
    FeedContestEntriesData,
    FeedContestLeaderboardData,
    FeedContestLifecycleActionPayload,
    FeedContestLifecycleData,
    FeedContestListData,
    FeedContestPicksData,
    FeedContestUpdatesData,
    FetchFeedContestUpdatesPayload,
    FeedContestPodiumListData,
    FeedContestStatsData,
    FeedContestRewardPrizesData,
    FeedContestRewardPrizesPayload,
    FeedContestSection,
    FeedContestUpdateData,
    FetchFeedContestDetailPayload,
    FetchFeedContestPodiumsPayload,
    FetchFeedContestEntriesPayload,
    FetchFeedContestLeaderboardPayload,
    FetchFeedContestPicksPayload,
    FetchFeedContestStatsPayload,
    FetchFeedContestsPayload,
    ReplaceDraftFeedContestPayload,
    ReplaceFeedContestEntryData,
    ReplaceFeedContestEntryPayload,
    UpdateFeedContestPayload,
} from "@/lib/interfaces/interfaces";
import {
    archiveFeedContestFailure,
    archiveFeedContestRequest,
    archiveFeedContestSuccess,
    cancelFeedContestFailure,
    cancelFeedContestRequest,
    cancelFeedContestSuccess,
    createDraftFeedContestFailure,
    createDraftFeedContestRequest,
    createDraftFeedContestSuccess,
    deleteFeedContestFailure,
    deleteFeedContestRequest,
    deleteFeedContestSuccess,
    createFeedContestFailure,
    createFeedContestRequest,
    createFeedContestSuccess,
    enterFeedContestFailure,
    enterFeedContestRequest,
    enterPickemFeedContestRequest,
    enterTdPsychicFeedContestRequest,
    replacePickemFeedContestEntryRequest,
    replaceTdPsychicFeedContestEntryRequest,
    enterFeedContestSuccess,
    fetchFeedContestDetailFailure,
    fetchFeedContestDetailRequest,
    fetchFeedContestDetailSuccess,
    fetchFeedContestEntriesFailure,
    fetchFeedContestStatsRequest,
    fetchFeedContestStatsSuccess,
    fetchFeedContestStatsFailure,
    fetchFeedContestEntriesRequest,
    fetchFeedContestEntriesSuccess,
    fetchFeedContestLeaderboardFailure,
    fetchFeedContestLeaderboardRequest,
    fetchFeedContestLeaderboardSuccess,
    fetchFeedContestPicksRequest,
    fetchFeedContestPicksSuccess,
    fetchFeedContestPicksFailure,
    fetchFeedContestUpdatesRequest,
    fetchFeedContestUpdatesSuccess,
    fetchFeedContestUpdatesFailure,
    fetchFeedContestsFailure,
    fetchFeedContestsRequest,
    fetchFeedContestsSuccess,
    fetchFeedContestPodiumsFailure,
    fetchFeedContestPodiumsRequest,
    fetchFeedContestPodiumsSuccess,
    publishDraftFeedContestFailure,
    publishDraftFeedContestRequest,
    publishDraftFeedContestSuccess,
    replaceDraftFeedContestFailure,
    replaceDraftFeedContestRequest,
    replaceDraftFeedContestSuccess,
    replaceFeedContestEntryFailure,
    replaceFeedContestEntryRequest,
    replaceFeedContestEntrySuccess,
    updateFeedContestFailure,
    updateFeedContestRequest,
    updateFeedContestSuccess,
    updateFeedContestRewardPrizesFailure,
    updateFeedContestRewardPrizesRequest,
    updateFeedContestRewardPrizesSuccess,
    reverseFeedContestAwardFailure,
    reverseFeedContestAwardRequest,
    reverseFeedContestAwardSuccess,
} from "../slices/feedContestSlice";

type ApiErrorResponse = { message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};

/**
 * Both create endpoints store the organizer's IANA zone from this header, so
 * every schedule string later renders in the zone the contest was authored in.
 * The server falls back to UTC when it is missing or unresolvable.
 */
const timeZoneHeader = () => {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return zone ? { "x-timezone": zone } : {};
    } catch {
        return {};
    }
};

// GET /group/feed-contest/list/:section — the section path fixes the
// lifecycle_status set AND the sort order server-side, so nothing but the group
// scope and the page window travels on the query string. `/list/drafts` answers
// 403 for a non-organizer; that is the expected reply, not an error to surface.
function* handleFetchFeedContests(
    action: PayloadAction<FetchFeedContestsPayload & { section: FeedContestSection }>
): SagaIterator {
    const { section, group_id, group_type, status, sort, page = 1, limit = 10 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/list/${section}`,
            {
                params: {
                    group_id,
                    group_type,
                    page,
                    limit,
                    // Ignored by the section routes; kept so the same handler can
                    // serve the generic /list if it is ever wired up.
                    ...(status ? { status } : {}),
                    ...(sort ? { sort } : {}),
                },
            }
        );
        const payload = response.data as { data?: FeedContestListData };
        if (!payload?.data) {
            yield put(
                fetchFeedContestsFailure({ section, error: "Failed to load Feed contests" })
            );
            return;
        }
        yield put(fetchFeedContestsSuccess({ section, data: payload.data }));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestsFailure({
                section,
                error: getErrorMessage(error, "Failed to load Feed contests"),
            })
        );
    }
}

/**
 * GET /group/feed-contest/list/finalized/podium — the group's RESULTS BOARD,
 * behind the Feed tab's Winners block.
 *
 * Mounted UNDER the finalized section path because it is that same list: same
 * predicate, same order, same contest columns, plus a `podium` array per row. It
 * is a separate call rather than a flag on the section fetch because it fans out
 * one achievements query PER contest on the page server-side, which is also why
 * the server caps `limit` at 25 — the page size IS the fan-out.
 */
function* handleFetchFeedContestPodiums(
    action: PayloadAction<FetchFeedContestPodiumsPayload>
): SagaIterator {
    const { group_id, group_type, include_archived, page = 1, limit = 10 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/list/finalized/podium`,
            {
                params: {
                    group_id,
                    group_type,
                    page,
                    limit,
                    // Only sent when opted in: the server reads the flag as text
                    // and treats anything but "true"/"1" as false, so an absent
                    // param and `false` mean the same thing.
                    ...(include_archived ? { include_archived: "true" } : {}),
                },
            }
        );
        const payload = response.data as { data?: FeedContestPodiumListData };
        if (!payload?.data) {
            yield put(
                fetchFeedContestPodiumsFailure({
                    groupId: group_id,
                    error: "Failed to load contest winners",
                })
            );
            return;
        }
        yield put(fetchFeedContestPodiumsSuccess({ groupId: group_id, data: payload.data }));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestPodiumsFailure({
                groupId: group_id,
                error: getErrorMessage(error, "Failed to load contest winners"),
            })
        );
    }
}

// POST /group/feed-contest/create — publishes straight to 'open', so the hosting
// / League-tier active-contest limit is charged here. The body is forwarded
// as-is: every rule (organizer authority, template/entry agreement, the slate
// snapshot, timing) is enforced server-side, so nothing is re-validated here.
function* handleCreateFeedContest(
    action: PayloadAction<CreateFeedContestPayload>
): SagaIterator {
    // The wizard's own zone wins over the browser's — see `time_zone` on the
    // payload. Stripped from the body: the server reads it as a header.
    const { time_zone, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/feed-contest/create`,
            body,
            { headers: time_zone ? { "x-timezone": time_zone } : timeZoneHeader() }
        );
        const payload = response.data as {
            message?: string;
            data?: { contest?: FeedContest };
        };
        yield put(
            createFeedContestSuccess({
                contest: payload?.data?.contest ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            createFeedContestFailure(
                getErrorMessage(error, "Failed to create the Feed contest")
            )
        );
    }
}

// POST /group/feed-contest/create-draft — same payload and the same full
// validation, but parks the contest in 'draft'. A draft is organizer-only and
// does NOT consume an active-contest slot; the limit is charged at publish.
function* handleCreateDraftFeedContest(
    action: PayloadAction<CreateFeedContestPayload>
): SagaIterator {
    const { time_zone, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/feed-contest/create-draft`,
            body,
            { headers: time_zone ? { "x-timezone": time_zone } : timeZoneHeader() }
        );
        const payload = response.data as {
            message?: string;
            data?: { contest?: FeedContest };
        };
        yield put(
            createDraftFeedContestSuccess({
                contest: payload?.data?.contest ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            createDraftFeedContestFailure(
                getErrorMessage(error, "Failed to save the Feed contest draft")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * Reopening a saved draft in the wizard. ONE write either way:
 *
 *   PUT /group/feed-contest/create-draft/:contest_id   save, still a draft
 *   PUT /group/feed-contest/publish-draft/:contest_id  save AND publish
 *
 * Both take the SAME complete body the POST /create-draft path sends — they are
 * whole-row REPLACEMENTS, not patches, because the organizer re-ran the wizard.
 * Omitting a field resets it; only `id`, `group_id`, `created_by` and
 * `created_at` survive. Publishing is one call rather than save-then-publish
 * precisely so a half-applied edit cannot exist.
 *
 * DRAFTS ONLY. A published contest's mechanics, slate and timing are frozen —
 * an entrant who accepted a slate must never find it swapped underneath them —
 * so both answer 409 for anything live, and the copy-only /update is the last
 * edit available. Publishing is also where the active-contest limit is charged;
 * drafting is free.
 * -------------------------------------------------------------------------- */
function* handleSaveDraftFeedContest(
    action: PayloadAction<ReplaceDraftFeedContestPayload>
): SagaIterator {
    const { contest_id, time_zone, publish, ...body } = action.payload;
    const publishing = publish === true;
    const path = publishing ? "publish-draft" : "create-draft";
    // The draft's OWN zone, not the browser's: it is the zone every slate
    // boundary in the draft was authored against, and the endpoint rewrites the
    // row's `time_zone` from this header on every save.
    const headers = time_zone ? { "x-timezone": time_zone } : timeZoneHeader();

    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/${path}/${encodeURIComponent(contest_id)}`,
            body,
            { headers }
        );
        const payload = response.data as {
            message?: string;
            data?: { contest?: FeedContest };
        };
        const contest = payload?.data?.contest ?? null;

        yield put(
            publishing
                ? publishDraftFeedContestSuccess({ contest, message: payload?.message })
                : replaceDraftFeedContestSuccess({ contest, message: payload?.message })
        );
    } catch (error: unknown) {
        yield put(
            publishing
                ? publishDraftFeedContestFailure(
                      getErrorMessage(error, "Failed to publish the Feed contest")
                  )
                : replaceDraftFeedContestFailure(
                      getErrorMessage(error, "Failed to save the Feed contest draft")
                  )
        );
    }
}

// GET /group/feed-contest/detail/:contest_id — the contest id is the WHOLE
// request: group_id, group_type and context_type are all derived from the row
// server-side. The reply adds `rules_text` + `eligible_games_json` on top of the
// list columns, so the detail screen never has to merge two responses.
//
// Every failure the endpoint can express for a row this viewer may not read is a
// 404 with the same wording (draft read by a member, foreign/deleted group,
// malformed uuid, missing row). That is deliberate — do not try to distinguish
// them, and never treat one as "deleted".
function* handleFetchFeedContestDetail(
    action: PayloadAction<FetchFeedContestDetailPayload>
): SagaIterator {
    const { contest_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/detail/${encodeURIComponent(contest_id)}`
        );
        const payload = response.data as { data?: FeedContestDetailData };
        if (!payload?.data?.contest) {
            yield put(fetchFeedContestDetailFailure("Failed to load this contest"));
            return;
        }
        yield put(fetchFeedContestDetailSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestDetailFailure(
                getErrorMessage(error, "Failed to load this contest")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * The two organizer lifecycle writes. Both are `PUT /group/feed-contest/<verb>/
 * :contest_id` with NO body — the contest id is the whole request, and the
 * server derives the group, the context and the caller's authority from it.
 *
 * Both are idempotent: re-running either answers 200 with "already canceled" /
 * "already archived" rather than an error. A contest that MOVED between the read
 * and the write answers 409, which surfaces as an ordinary error toast — that is
 * correct, since the screen's copy of the row is then stale.
 * -------------------------------------------------------------------------- */
type LifecycleResponse = { message?: string; data?: FeedContestLifecycleData };

// PUT /cancel/:contest_id — flips the contest to 'canceled', withdraws every
// participant still in the field and deletes their competitive picks.
function* handleCancelFeedContest(
    action: PayloadAction<FeedContestLifecycleActionPayload>
): SagaIterator {
    const { contest_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/cancel/${encodeURIComponent(contest_id)}`,
            {}
        );
        const payload = response.data as LifecycleResponse;
        yield put(
            cancelFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            cancelFeedContestFailure(
                getErrorMessage(error, "Failed to cancel the contest")
            )
        );
    }
}

// PUT /archive/:contest_id — files a contest that already ended (canceled or
// final) and settles its field to match which ending it was.
function* handleArchiveFeedContest(
    action: PayloadAction<FeedContestLifecycleActionPayload>
): SagaIterator {
    const { contest_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/archive/${encodeURIComponent(contest_id)}`,
            {}
        );
        const payload = response.data as LifecycleResponse;
        yield put(
            archiveFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            archiveFeedContestFailure(
                getErrorMessage(error, "Failed to archive the contest")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * DELETE /delete/:contest_id — permanent, and the one write here that is NOT
 * idempotent in the forgiving sense the other two are: a repeat answers 409
 * "This contest has already been deleted." rather than a cheerful 200, because
 * the first request owns the entrant notices and a second must not claim them.
 * That is why the drawer's submit button is disabled while this runs, on top of
 * takeLatest.
 *
 * The body carries ONLY `organizer_note`, and axios needs it under `data` for a
 * DELETE — passing it as the second argument the way put/post do would send it
 * as the request CONFIG and silently drop the note, costing every entrant the
 * explanation. The server treats the note as optional; the drawer does not.
 *
 * There is no `contest` in the reply to merge anywhere: the row is gone, so the
 * response only identifies what was removed and how many people were told.
 * -------------------------------------------------------------------------- */
function* handleDeleteFeedContest(
    action: PayloadAction<DeleteFeedContestPayload>
): SagaIterator {
    const { contest_id, organizer_note } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.delete,
            `${API_BASE_URL}/group/feed-contest/delete/${encodeURIComponent(contest_id)}`,
            { data: organizer_note ? { organizer_note } : {} }
        );
        const payload = response.data as {
            message?: string;
            data?: DeleteFeedContestData;
        };
        yield put(
            deleteFeedContestSuccess({
                contest_id,
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            deleteFeedContestFailure(
                getErrorMessage(error, "Failed to delete the contest")
            )
        );
    }
}

// PUT /update/:contest_id — member-facing COPY only (name / description /
// rules_text), and a PARTIAL patch: keys left out are untouched. Sending copy
// identical to what is stored is a no-op 200, so the form does not have to diff
// before submitting. A real rules_text change mints a new rules_version, which
// the reply flags — the screen has to tell the organizer that entrants must
// re-accept. 409 means the copy froze (a member joined) or the contest moved.
function* handleUpdateFeedContest(
    action: PayloadAction<UpdateFeedContestPayload>
): SagaIterator {
    const { contest_id, ...patch } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/update/${encodeURIComponent(contest_id)}`,
            patch
        );
        const payload = response.data as {
            message?: string;
            data?: FeedContestUpdateData;
        };
        yield put(
            updateFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            updateFeedContestFailure(
                getErrorMessage(error, "Failed to update the contest")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * PATCH /reward/:contest_id/prizes — the podium prize WORDING, and the only
 * reward write allowed after a contest has gone live.
 *
 * The settlement method, the venue, the pickup instructions and the contact
 * email are rebuilt server-side from the stored row, so they are not sent: they
 * are the deal a member accepted when they entered. The SET of paid places is
 * frozen too — a `prizes` array with a place added or removed answers 409, not
 * 200, so the caller must send exactly the placements the reward already has.
 *
 * `organizer_confirmed` is re-taken on every edit rather than inherited: an
 * amended offer with no fresh signature behind it is the one state this feature
 * must never reach.
 * -------------------------------------------------------------------------- */
function* handleUpdateFeedContestRewardPrizes(
    action: PayloadAction<FeedContestRewardPrizesPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.patch,
            `${API_BASE_URL}/group/feed-contest/reward/${encodeURIComponent(contest_id)}/prizes`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: FeedContestRewardPrizesData;
        };
        yield put(
            updateFeedContestRewardPrizesSuccess({
                contest_id,
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            updateFeedContestRewardPrizesFailure(
                getErrorMessage(error, "Failed to update the contest prizes")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * PUT /award-reversal/:contest_id — the whole-award audit reversal, and the one
 * write on this router the group OWNER alone may make. An Arena manager is an
 * organizer for everything else here and is answered 403 by this route, which
 * is why the panel gates its button on ownership rather than on `is_organizer`.
 *
 * `contest_points` is NOT moved by this write. The server keeps the figure the
 * member won so the board can strike it through beside the reason, and the
 * lifetime standings and the badge are untouched by design.
 *
 * A repeat is a 200 ("This award was already reversed.") carrying the standing
 * already on record — a SUCCESS, not an error, and it flows through this same
 * path so the panel needs no special case for it.
 * -------------------------------------------------------------------------- */
function* handleReverseFeedContestAward(
    action: PayloadAction<FeedContestAwardReversalPayload>
): SagaIterator {
    const { contest_id, user_id, reason } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/award-reversal/${encodeURIComponent(
                contest_id
            )}`,
            { user_id, reason }
        );
        const payload = response.data as {
            message?: string;
            data?: FeedContestAwardReversalData;
        };
        yield put(
            reverseFeedContestAwardSuccess({
                contest_id,
                user_id,
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
    } catch (error: unknown) {
        yield put(
            reverseFeedContestAwardFailure(
                getErrorMessage(error, "Failed to reverse the award!")
            )
        );
    }
}

// GET /group/feed-contest/entries/:contest_id — the field, readable by any
// member of the group. The hidden-until-lock rule is enforced in the SERVER's
// query, not in its response shaping: before the lock, other members' rows come
// back with `pick: null` and only the caller's own entry carries detail. Never
// re-derive that from the contest status — read `is_revealed` per row.
function* handleFetchFeedContestEntries(
    action: PayloadAction<FetchFeedContestEntriesPayload>
): SagaIterator {
    const { contest_id, page = 1, limit = 20 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/entries/${encodeURIComponent(contest_id)}`,
            { params: { page, limit } }
        );
        const payload = response.data as { data?: FeedContestEntriesData };
        if (!payload?.data?.contest) {
            yield put(fetchFeedContestEntriesFailure("Failed to load this contest's entries"));
            return;
        }
        yield put(fetchFeedContestEntriesSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestEntriesFailure(
                getErrorMessage(error, "Failed to load this contest's entries")
            )
        );
    }
}

/* ----------------------------------------------------------------------------
 * GET /group/feed-contest/leaderboard/:contest_id — the standings, readable by
 * any member of the group. The sibling of /entries and not a substitute for it:
 * that one reads `picks` and answers what everyone selected, this one reads
 * `contest_leaderboard` and answers where they stand.
 *
 * Two envelope flags decide how the board may be RENDERED, and neither can be
 * re-derived from the contest status:
 *   - `is_ranked` — false until a settlement job fills in `rank`, and every row
 *     sits at NULL until then. While false, position comes from the ARRAY ORDER,
 *     which the server has already sorted (rank asc nulls last → points desc →
 *     entered_at asc → id asc).
 *   - `is_entry_revealed` — before the lock, `combo_odds` and `total_picks` come
 *     back NULL for everyone but the viewer's own row, exactly as /entries
 *     withholds legs[]. Null there means "not visible yet", never "no value".
 * -------------------------------------------------------------------------- */
function* handleFetchFeedContestLeaderboard(
    action: PayloadAction<FetchFeedContestLeaderboardPayload>
): SagaIterator {
    const { contest_id, page = 1, limit = 20 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/leaderboard/${encodeURIComponent(contest_id)}`,
            { params: { page, limit } }
        );
        const payload = response.data as { data?: FeedContestLeaderboardData };
        if (!payload?.data?.contest) {
            yield put(
                fetchFeedContestLeaderboardFailure("Failed to load these standings")
            );
            return;
        }
        yield put(fetchFeedContestLeaderboardSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestLeaderboardFailure(
                getErrorMessage(error, "Failed to load these standings")
            )
        );
    }
}

/*
 * GET /group/feed-contest/picks — every competitive pick across the GROUP's Feed
 * contests, which is what the Feed TAB lists. The group-wide sibling of
 * /entries/:contest_id and the reason a League feed can show contest entries at
 * all: this route serves both surfaces, while /group/arena/contest-picks/* is
 * Arena-only.
 *
 * A page MIXES contests, so hidden-until-lock is a per-ROW fact here: read each
 * row's `is_revealed`, never the envelope.
 */
function* handleFetchFeedContestPicks(
    action: PayloadAction<FetchFeedContestPicksPayload>
): SagaIterator {
    const { group_id, group_type, contest_id, user_id, status, page = 1, limit = 20 } =
        action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/picks`,
            {
                params: {
                    group_id,
                    group_type,
                    page,
                    limit,
                    ...(contest_id ? { contest_id } : {}),
                    ...(user_id ? { user_id } : {}),
                    ...(status ? { status } : {}),
                },
            }
        );
        const payload = response.data as { data?: FeedContestPicksData };
        if (!payload?.data?.group) {
            yield put(fetchFeedContestPicksFailure("Failed to load contest entries"));
            return;
        }
        yield put(fetchFeedContestPicksSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestPicksFailure(
                getErrorMessage(error, "Failed to load contest entries")
            )
        );
    }
}

/**
 * GET /group/feed-contest/updates — the Feed tab's Updates view.
 *
 * One card per RUNNING contest, projected live: nothing is stored when a
 * contest opens or locks, so this is simply re-read rather than invalidated by
 * any write. Upcoming contests are dropped server-side.
 */
function* handleFetchFeedContestUpdates(
    action: PayloadAction<FetchFeedContestUpdatesPayload>
): SagaIterator {
    const { group_id, group_type, page = 1, limit = 25 } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/updates`,
            { params: { group_id, group_type, page, limit } }
        );
        const payload = response.data as { data?: FeedContestUpdatesData };
        if (!payload?.data?.group) {
            yield put(fetchFeedContestUpdatesFailure("Failed to load contest updates"));
            return;
        }
        yield put(fetchFeedContestUpdatesSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestUpdatesFailure(
                getErrorMessage(error, "Failed to load contest updates")
            )
        );
    }
}

// GET /group/feed-contest/stats/:contest_id — the whole tally in one read, for
// any member of the group. Unlike /entries this never pages and never grows
// with the field, so the dashboard can call it once per contest.
//
// The COUNTS are public even while the picks behind them are hidden — knowing
// that 12 people entered gives away none of what they picked — so this is safe
// to read on a still-open contest. A draft answers 404 to everyone but its
// organizer, same as the by-id detail read.
function* handleFetchFeedContestStats(
    action: PayloadAction<FetchFeedContestStatsPayload>
): SagaIterator {
    const { contest_id } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.get,
            `${API_BASE_URL}/group/feed-contest/stats/${encodeURIComponent(contest_id)}`
        );
        const payload = response.data as { data?: FeedContestStatsData };
        // `counts` is the whole point of the read; a body without it is a
        // shape we cannot render, so fail rather than commit a half-empty
        // dashboard that would show every tile as zero.
        if (!payload?.data?.contest || !payload.data.counts) {
            yield put(fetchFeedContestStatsFailure("Failed to load this contest's stats"));
            return;
        }
        yield put(fetchFeedContestStatsSuccess(payload.data));
    } catch (error: unknown) {
        yield put(
            fetchFeedContestStatsFailure(
                getErrorMessage(error, "Failed to load this contest's stats")
            )
        );
    }
}

// POST /group/feed-contest/enter/:contest_id — accepts the rules, joins and
// submits the competitive combo in ONE call, so a member is never left opted in
// with no entry. Nothing priced travels: the combined odds, the points and the
// difficulty tier are all computed server-side from the legs' own American odds.
//
// NOT idempotent — a second POST answers 409 "You have already entered this
// contest." The screen therefore disables its button on `entrySubmitLoading` on
// top of the takeLatest below.
//
// One failure needs care: a 500 "Joined, but submitting your entry failed"
// leaves the member joined with no entry. The recovery is to retry THIS call
// (the participant gate admits 'opted_in'), never /replace-entry, which 404s
// without an accepted entry to replace.
function* handleEnterFeedContest(
    action: PayloadAction<EnterFeedContestPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/feed-contest/enter/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as { message?: string; data?: EnterFeedContestData };
        yield put(
            enterFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        // Re-read the field so the caller's own receipt is the server's copy
        // rather than the echo, and so `entered_count` moves.
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            enterFeedContestFailure(getErrorMessage(error, "Failed to submit your entry"))
        );
    }
}

// POST /group/feed-contest/enter-pickem/:contest_id — the SUNDAY PICK'EM card:
// accepts the rules, joins and submits one moneyline per slate game in ONE call.
//
// A separate endpoint from /enter rather than a mode of it, because the two
// models score differently — a card sums each selection's award, a combo pays
// only if every leg lands — and each endpoint refuses the other's contest by
// name. Its leg contract also differs in one field that is easy to get wrong:
// `side` must be the TEAM NAME, which the server checks against the slate
// snapshot's home_team/away_team (feed.helper.ts:2930).
//
// Reuses the combo's success/failure actions on purpose: the response envelope
// carries the same `contest` / `participant` / `pick`, which is all the reducer
// and the entry screen's receipt read. Only `data.entry` differs, and nothing
// re-derives that client-side.
//
// NOT idempotent — a second POST answers 409, and there is no replace path for a
// card yet, so the screen must keep its button disabled on `entrySubmitLoading`.
function* handleEnterPickemFeedContest(
    action: PayloadAction<EnterPickemFeedContestPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/feed-contest/enter-pickem/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: EnterPickemFeedContestData;
        };
        yield put(
            enterFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        // Re-read the field so the caller's own receipt is the server's copy
        // rather than the echo, and so `entered_count` moves.
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            enterFeedContestFailure(
                getErrorMessage(error, "Failed to submit your Pick'em card")
            )
        );
    }
}

// PUT /group/feed-contest/replace-entry/:contest_id — swaps the combo already
// submitted for a different one, in place, while the contest is still open.
// `rules_version` is optional here: the acceptance stored on the participant row
// is what gets checked. Requires an existing 'entered' participation — 404
// otherwise, which means /enter is the call that applies instead.
function* handleReplaceFeedContestEntry(
    action: PayloadAction<ReplaceFeedContestEntryPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/replace-entry/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: ReplaceFeedContestEntryData;
        };
        yield put(
            replaceFeedContestEntrySuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            replaceFeedContestEntryFailure(
                getErrorMessage(error, "Failed to replace your entry")
            )
        );
    }
}

// PUT /group/feed-contest/replace-pickem-entry/:contest_id — swap a whole
// SUNDAY PICK'EM card while the contest is still open.
//
// WHOLE CARD, never one pick: the replacement is validated exactly as a first
// submission is (one moneyline per game, every game on the slate), which is what
// keeps `total_picks` equal to the slate for every member on a ranked board.
//
// Its refusals are stricter than the combo path's in one way worth surfacing
// verbatim: a card sits 'pending' while ANY selection is still playing, so the
// server also refuses a card with ALREADY-GRADED legs (409, naming how many).
// A combo never hits this — one graded leg settles the whole parlay.
//
// `rules_version` is optional; the participant's stored acceptance is checked.
function* handleReplacePickemFeedContestEntry(
    action: PayloadAction<ReplacePickemFeedContestEntryPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/replace-pickem-entry/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: ReplacePickemFeedContestEntryData;
        };
        yield put(
            replaceFeedContestEntrySuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            replaceFeedContestEntryFailure(
                getErrorMessage(error, "Failed to replace your Pick'em card")
            )
        );
    }
}

// POST /group/feed-contest/enter-td-psychic/:contest_id — the TD PSYCHIC card:
// accepts the rules, joins and submits three anytime-touchdown scorers in ONE
// call.
//
// The THIRD entry endpoint, and separate from the other two for the reason they
// are separate from each other: the model differs, not the configuration. What
// makes this one distinct is what the body does NOT carry — no prices. A combo
// and a Pick'em card are both priced from their legs at acceptance; a TD card
// sends three player identities and is stored with every price null, because one
// shared price per scorer is captured at the contest lock and is the same number
// for every member holding that player.
//
// Each selection is re-resolved against the live market server-side, so a stale
// id, an alternate line (2+, first scorer) or a passing-TD market is refused here
// by name rather than discovered at settlement. Those 400s are worth surfacing
// verbatim: they tell the member to refresh and pick again.
//
// Reuses the combo's success/failure actions on purpose: the envelope carries the
// same `contest` / `participant` / `pick`, which is all the reducer and the
// receipt read. Only `data.entry` differs — it reports `prices_captured_at`
// instead of a points figure, precisely because no such figure exists yet.
//
// NOT idempotent — a second POST answers 409, so the screen must keep its button
// disabled on `entrySubmitLoading` on top of the takeLatest below.
function* handleEnterTdPsychicFeedContest(
    action: PayloadAction<EnterTdPsychicFeedContestPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.post,
            `${API_BASE_URL}/group/feed-contest/enter-td-psychic/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: EnterTdPsychicFeedContestData;
        };
        yield put(
            enterFeedContestSuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        // Re-read the field so the caller's own receipt is the server's copy
        // rather than the echo, and so `entered_count` moves.
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            enterFeedContestFailure(
                getErrorMessage(error, "Failed to submit your TD Psychic card")
            )
        );
    }
}

// PUT /group/feed-contest/replace-td-psychic-entry/:contest_id — swap a whole TD
// PSYCHIC card while the contest is still open.
//
// WHOLE CARD, never one scorer: the replacement is validated exactly as a first
// submission is — three distinct players, each re-resolved against the live
// market — because a patch that swapped one would have to re-prove the other two
// anyway.
//
// Its refusals are stricter than either sibling's in one way worth surfacing
// verbatim: the server also refuses a card that ALREADY CARRIES LOCK PRICES. A
// priced card is past the shared cutoff whatever its contest's status column
// says, and re-pricing one member's card after the capture would break the one
// guarantee this whole template rests on.
//
// `rules_version` is optional; the participant's stored acceptance is checked.
function* handleReplaceTdPsychicFeedContestEntry(
    action: PayloadAction<ReplaceTdPsychicFeedContestEntryPayload>
): SagaIterator {
    const { contest_id, ...body } = action.payload;
    try {
        const response: AxiosResponse<unknown> = yield call(
            axiosInstance.put,
            `${API_BASE_URL}/group/feed-contest/replace-td-psychic-entry/${encodeURIComponent(contest_id)}`,
            body
        );
        const payload = response.data as {
            message?: string;
            data?: ReplaceTdPsychicFeedContestEntryData;
        };
        yield put(
            replaceFeedContestEntrySuccess({
                data: payload?.data ?? null,
                message: payload?.message,
            })
        );
        yield put(fetchFeedContestEntriesRequest({ contest_id }));
    } catch (error: unknown) {
        yield put(
            replaceFeedContestEntryFailure(
                getErrorMessage(error, "Failed to replace your TD Psychic card")
            )
        );
    }
}

export default function* feedContestSaga(): SagaIterator {
    // takeEvery, not takeLatest: the hub fires one request per section and they
    // must not cancel each other.
    yield takeEvery(fetchFeedContestsRequest.type, handleFetchFeedContests);
    // takeLatest: one Winners block is on screen at a time, so a read for a group
    // the viewer has navigated away from must never land after the one that
    // replaced it. The reducer re-checks the group id anyway, since takeLatest
    // cancels the saga rather than a response already in flight.
    yield takeLatest(fetchFeedContestPodiumsRequest.type, handleFetchFeedContestPodiums);
    yield takeLatest(createFeedContestRequest.type, handleCreateFeedContest);
    yield takeLatest(createDraftFeedContestRequest.type, handleCreateDraftFeedContest);
    // One handler for both: same body, same shape of reply — only the path and
    // which success action fires differ, and `publish` on the payload decides.
    yield takeLatest(replaceDraftFeedContestRequest.type, handleSaveDraftFeedContest);
    yield takeLatest(publishDraftFeedContestRequest.type, handleSaveDraftFeedContest);
    // takeLatest: only one contest is on screen, so an abandoned read must never
    // land after the one that replaced it.
    yield takeLatest(fetchFeedContestDetailRequest.type, handleFetchFeedContestDetail);
    // takeLatest, and the buttons are disabled while either runs — a second
    // cancel is harmless server-side (idempotent) but must not race the first.
    yield takeLatest(cancelFeedContestRequest.type, handleCancelFeedContest);
    yield takeLatest(archiveFeedContestRequest.type, handleArchiveFeedContest);
    // takeLatest, AND the drawer's confirm button is disabled while it runs: a
    // repeat delete is a 409, not a harmless no-op like cancel/archive.
    yield takeLatest(deleteFeedContestRequest.type, handleDeleteFeedContest);
    yield takeLatest(updateFeedContestRequest.type, handleUpdateFeedContest);
    // takeLatest: one Settings tab at a time, and the save button is disabled
    // while it runs. A repeat with unchanged wording is a harmless 200.
    yield takeLatest(
        updateFeedContestRewardPrizesRequest.type,
        handleUpdateFeedContestRewardPrizes
    );
    // takeLatest, AND the Confirm button is disabled while it runs. A repeat is
    // a harmless idempotent 200, but two in flight would report the write twice.
    yield takeLatest(
        reverseFeedContestAwardRequest.type,
        handleReverseFeedContestAward
    );
    // takeLatest: one contest's field is on screen at a time, and the "Show
    // more" page and the post-write refetch are the same read — newest wins.
    yield takeLatest(fetchFeedContestEntriesRequest.type, handleFetchFeedContestEntries);
    // takeLatest for the same reason: one contest's board is on screen at a
    // time, and "Show more" and the post-write refetch are the same read.
    yield takeLatest(
        fetchFeedContestLeaderboardRequest.type,
        handleFetchFeedContestLeaderboard
    );
    yield takeLatest(fetchFeedContestPicksRequest.type, handleFetchFeedContestPicks);
    // takeLatest: the Updates view shows one group at a time and the read is a
    // live projection — only the newest answer can be right.
    yield takeLatest(fetchFeedContestUpdatesRequest.type, handleFetchFeedContestUpdates);
    // takeLatest: one contest's dashboard at a time, and the post-write refetch
    // is the same read — the newest tally is the only correct one.
    yield takeLatest(fetchFeedContestStatsRequest.type, handleFetchFeedContestStats);
    // takeLatest, AND the submit button is disabled while either runs: unlike
    // cancel/archive these are NOT idempotent, so a second in-flight write is a
    // 409 rather than a harmless repeat.
    yield takeLatest(enterFeedContestRequest.type, handleEnterFeedContest);
    yield takeLatest(enterPickemFeedContestRequest.type, handleEnterPickemFeedContest);
    yield takeLatest(
        enterTdPsychicFeedContestRequest.type,
        handleEnterTdPsychicFeedContest
    );
    yield takeLatest(
        replaceTdPsychicFeedContestEntryRequest.type,
        handleReplaceTdPsychicFeedContestEntry
    );
    yield takeLatest(
        replacePickemFeedContestEntryRequest.type,
        handleReplacePickemFeedContestEntry
    );
    yield takeLatest(replaceFeedContestEntryRequest.type, handleReplaceFeedContestEntry);
}
