import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    ConfigureGroupVenuePayload,
    FetchVenueActivityPayload,
    FetchVenueCheckInDetailPayload,
    GroupVenueLifecyclePayload,
    GroupVenueWriteData,
    ResolveVenueCheckInData,
    ResolveVenueCheckInPayload,
    UpdateGroupVenuePayload,
    VenueActivityData,
    VenueCheckInDetailData,
    VenueCheckInOutcome,
    VenueState,
    VerifyVenueCheckInData,
    VerifyVenueCheckInPayload,
} from "@/lib/interfaces/interfaces";

/**
 * VENUE CHECK-IN — `/group/venue/*`, one read and four owner-only writes.
 *
 *   GET  /detail/:group_id     everything three different screens need, scoped
 *                              by role: the member's contest screen, the QR
 *                              landing page and the staff settings panel.
 *   POST /configure/:group_id  first setup, or a full re-save of an ACTIVE
 *                              venue. Mints the first token.
 *   PUT  /update/:group_id     partial patch. Never touches the token.
 *   PUT  /disable/:group_id    QR dead, live sessions revoked.
 *   PUT  /enable/:group_id     back on with a NEW token.
 *   PUT  /regenerate-token/:group_id
 *                              NEW token, venue stays open, sessions survive.
 *
 * The detail slot is SINGLE-TENANT and guarded by `detailForId`, the same rule
 * every other group-scoped slot in this store follows: an Arena's geofence,
 * QR token and session state must never describe a different Arena for even one
 * commit.
 */
const initialState: VenueState = {
    detail: null,
    detailForId: null,
    detailLoading: false,
    detailError: null,
    configureAction: null,
    configureLoading: false,
    configureMessage: null,
    configureError: null,
    resolved: null,
    resolvedForToken: null,
    resolveLoading: false,
    resolveError: null,
    resolveErrorCode: null,
    verifyLoading: false,
    verifySuccess: null,
    verifyError: null,
    verifyErrorCode: null,
    activity: null,
    activityForId: null,
    activityLoading: false,
    activityError: null,
};

/**
 * Folds a write's reply into the loaded detail.
 *
 * Every one of the four answers with the same `venue_check_in` block a read
 * would produce for a staff viewer, plus its own token receipt — so the screen
 * re-renders from the reply rather than paying for a refetch. `viewer` and
 * `session` are untouched: none of these calls changes the caller's role or
 * their own check-in.
 *
 * The staff block IS re-derived, because the token is exactly what a
 * disable/enable changes and a stale one would print a poster that does not
 * work. `can_disable` is recomputed from the incoming state and the counts we
 * already hold, so the button re-gates itself in the same commit.
 */
const applyVenueWrite = (
    state: VenueState,
    groupId: string,
    incoming: GroupVenueWriteData | null
) => {
    if (!incoming) return;
    if (state.detailForId !== groupId || !state.detail) return;

    const isActive = incoming.venue_check_in.is_enabled;
    const staff = state.detail.staff;

    state.detail = {
        ...state.detail,
        venue_check_in: incoming.venue_check_in,
        staff: staff
            ? {
                ...staff,
                public_check_in_token: incoming.public_check_in_token,
                token_version: incoming.token_version ?? staff.token_version,
                check_in_url: incoming.check_in_url,
                // Two of the five replies carry an authoritative session count,
                // and they are opposites: a disable revoked everyone, a
                // regenerate kept everyone. Anything else leaves it alone.
                active_session_count:
                    incoming.revoked_session_count !== undefined
                        ? 0
                        : incoming.retained_session_count ?? staff.active_session_count,
                // Both flags are `isOwner && writable && isActive && …` server-
                // side, and REACHING one of these writes already proves the
                // first two: all five are owner-only, and all but disable demand
                // a writable community. Disable is the exception, and it lands on
                // isActive = false, which zeroes both anyway. So only the parts
                // that actually moved are re-derived.
                //
                // NOT `&& staff.can_regenerate_token`: that was false while the
                // venue was disabled, and AND-ing it would leave rotation
                // permanently off after an enable.
                can_disable: isActive && staff.blocking_contest_count === 0,
                can_regenerate_token: isActive,
            }
            : staff,
    };
};

const venueSlice = createSlice({
    name: "venue",
    initialState,
    reducers: {
        fetchVenueCheckInDetailRequest: (
            state,
            action: PayloadAction<FetchVenueCheckInDetailPayload>
        ) => {
            // Dropped at REQUEST time on an id mismatch, never on success: the
            // previous group's venue would otherwise decide this screen's
            // "can we publish a venue contest" answer for the in-flight window.
            if (state.detailForId !== action.payload.group_id) {
                state.detail = null;
            }
            state.detailForId = action.payload.group_id;
            state.detailLoading = true;
            state.detailError = null;
        },
        fetchVenueCheckInDetailSuccess: (
            state,
            action: PayloadAction<VenueCheckInDetailData>
        ) => {
            state.detailLoading = false;
            state.detailError = null;
            state.detail = action.payload;
            state.detailForId = action.payload.group?.id ?? state.detailForId;
        },
        fetchVenueCheckInDetailFailure: (state, action: PayloadAction<string>) => {
            state.detailLoading = false;
            state.detailError = action.payload;
            state.detail = null;
        },

        /* -------------------------------------------------------------------
         * The four writes. They share one flag set because exactly one applies
         * at a time; `configureAction` names which, for a button that labels
         * itself.
         * ----------------------------------------------------------------- */
        configureGroupVenueRequest: (
            state,
            action: PayloadAction<ConfigureGroupVenuePayload>
        ) => {
            void action;
            state.configureAction = "configure";
            state.configureLoading = true;
            state.configureMessage = null;
            state.configureError = null;
        },
        updateGroupVenueRequest: (
            state,
            action: PayloadAction<UpdateGroupVenuePayload>
        ) => {
            void action;
            state.configureAction = "update";
            state.configureLoading = true;
            state.configureMessage = null;
            state.configureError = null;
        },
        disableGroupVenueRequest: (
            state,
            action: PayloadAction<GroupVenueLifecyclePayload>
        ) => {
            void action;
            state.configureAction = "disable";
            state.configureLoading = true;
            state.configureMessage = null;
            state.configureError = null;
        },
        enableGroupVenueRequest: (
            state,
            action: PayloadAction<GroupVenueLifecyclePayload>
        ) => {
            void action;
            state.configureAction = "enable";
            state.configureLoading = true;
            state.configureMessage = null;
            state.configureError = null;
        },
        regenerateVenueTokenRequest: (
            state,
            action: PayloadAction<GroupVenueLifecyclePayload>
        ) => {
            void action;
            state.configureAction = "regenerate";
            state.configureLoading = true;
            state.configureMessage = null;
            state.configureError = null;
        },

        /** All four land here — the reply shape and the fold are identical. */
        groupVenueWriteSuccess: (
            state,
            action: PayloadAction<{
                group_id: string;
                data: GroupVenueWriteData | null;
                message?: string;
            }>
        ) => {
            state.configureLoading = false;
            state.configureMessage = action.payload.message ?? "Venue saved.";
            applyVenueWrite(state, action.payload.group_id, action.payload.data);
        },
        groupVenueWriteFailure: (state, action: PayloadAction<string>) => {
            state.configureLoading = false;
            state.configureError = action.payload;
        },
        /** Cleared once the screen has reported the outcome, so it toasts once. */
        clearGroupVenueWriteState: (state) => {
            state.configureAction = null;
            state.configureLoading = false;
            state.configureMessage = null;
            state.configureError = null;
        },

        /* -------------------------------------------------------------------
         * The QR landing page. Keyed by TOKEN, and `resolve` is readable
         * signed-out — the only call in this store that is.
         * ----------------------------------------------------------------- */
        resolveVenueCheckInTokenRequest: (
            state,
            action: PayloadAction<ResolveVenueCheckInPayload>
        ) => {
            if (state.resolvedForToken !== action.payload.token) {
                state.resolved = null;
                // A rotated poster is a different venue as far as this screen is
                // concerned, so the previous token's verdict must not survive.
                state.verifySuccess = null;
                state.verifyError = null;
                state.verifyErrorCode = null;
            }
            state.resolvedForToken = action.payload.token;
            state.resolveLoading = true;
            state.resolveError = null;
            state.resolveErrorCode = null;
        },
        resolveVenueCheckInTokenSuccess: (
            state,
            action: PayloadAction<ResolveVenueCheckInData>
        ) => {
            state.resolveLoading = false;
            state.resolveError = null;
            state.resolveErrorCode = null;
            state.resolved = action.payload;
        },
        resolveVenueCheckInTokenFailure: (
            state,
            action: PayloadAction<{ error: string; code?: string | null }>
        ) => {
            state.resolveLoading = false;
            state.resolveError = action.payload.error;
            state.resolveErrorCode = action.payload.code ?? null;
            state.resolved = null;
        },

        verifyVenueCheckInRequest: (
            state,
            action: PayloadAction<VerifyVenueCheckInPayload>
        ) => {
            void action;
            state.verifyLoading = true;
            state.verifyError = null;
            state.verifyErrorCode = null;
        },
        /**
         * The reply carries the opened session, so the screen flips to its
         * success state without re-resolving. `resolved` is patched in step so a
         * refresh-free render of the "already checked in" branch agrees with it.
         */
        verifyVenueCheckInSuccess: (
            state,
            action: PayloadAction<VerifyVenueCheckInData>
        ) => {
            state.verifyLoading = false;
            state.verifyError = null;
            state.verifyErrorCode = null;
            state.verifySuccess = action.payload;
            if (state.resolved) {
                state.resolved = {
                    ...state.resolved,
                    session: action.payload.session,
                    next_step: "checked_in",
                };
            }
        },
        verifyVenueCheckInFailure: (
            state,
            action: PayloadAction<{ error: string; code?: VenueCheckInOutcome | null }>
        ) => {
            state.verifyLoading = false;
            state.verifyError = action.payload.error;
            state.verifyErrorCode = action.payload.code ?? null;
        },
        clearVenueCheckInVerification: (state) => {
            state.verifyLoading = false;
            state.verifySuccess = null;
            state.verifyError = null;
            state.verifyErrorCode = null;
        },

        /* -------------------------------------------------------------------
         * GET /activity — the staff panel's day.
         * ----------------------------------------------------------------- */
        fetchVenueActivityRequest: (
            state,
            action: PayloadAction<FetchVenueActivityPayload>
        ) => {
            if (state.activityForId !== action.payload.group_id) {
                state.activity = null;
            }
            state.activityForId = action.payload.group_id;
            state.activityLoading = true;
            state.activityError = null;
        },
        fetchVenueActivitySuccess: (state, action: PayloadAction<VenueActivityData>) => {
            state.activityLoading = false;
            state.activityError = null;
            state.activity = action.payload;
            state.activityForId = action.payload.group?.id ?? state.activityForId;
        },
        fetchVenueActivityFailure: (state, action: PayloadAction<string>) => {
            state.activityLoading = false;
            state.activityError = action.payload;
            state.activity = null;
        },

        /** Dropped when the owning screen unmounts. */
        clearVenueCheckInDetail: () => initialState,
    },
});

export const {
    fetchVenueCheckInDetailRequest,
    fetchVenueCheckInDetailSuccess,
    fetchVenueCheckInDetailFailure,
    configureGroupVenueRequest,
    updateGroupVenueRequest,
    disableGroupVenueRequest,
    enableGroupVenueRequest,
    regenerateVenueTokenRequest,
    groupVenueWriteSuccess,
    groupVenueWriteFailure,
    clearGroupVenueWriteState,
    resolveVenueCheckInTokenRequest,
    resolveVenueCheckInTokenSuccess,
    resolveVenueCheckInTokenFailure,
    verifyVenueCheckInRequest,
    verifyVenueCheckInSuccess,
    verifyVenueCheckInFailure,
    clearVenueCheckInVerification,
    fetchVenueActivityRequest,
    fetchVenueActivitySuccess,
    fetchVenueActivityFailure,
    clearVenueCheckInDetail,
} = venueSlice.actions;

export default venueSlice.reducer;
