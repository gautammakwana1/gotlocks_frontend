"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/lib/interfaces/interfaces";
import {
    clearGroupVenueWriteState,
    clearIssuedVenueAssistCode,
    disableGroupVenueRequest,
    enableGroupVenueRequest,
    fetchVenueActivityRequest,
    fetchVenueCheckInDetailRequest,
    issueVenueAssistCodeRequest,
    regenerateVenueTokenRequest,
    revokeVenueAssistCodeRequest,
} from "@/lib/redux/slices/venueSlice";
import ArenaVenueQrCard from "./ArenaVenueQrCard";
import ArenaVenueSetupDialog from "./ArenaVenueSetupDialog";

/* ----------------------------------------------------------------------------
 * The Arena Settings tab's Venue Check-In section, ported from the MVP's
 * gotlocks.app_mvp2/components/arenas/checkin/ArenaVenueCheckInPanel.tsx.
 *
 * The MVP's frame is kept exactly: the heading, the status dot, the
 * not-configured row, the "Current venue" row with its radius/duration line, the
 * "Venue operations" <details> holding the QR card, and the owner's "Venue
 * controls" with a confirm-before-acting step.
 *
 * Everything it renders comes from ONE read — `GET /group/venue/detail/:group_id`
 * — which is already role-scoped: the QR token is staff-only, the coordinates go
 * to nobody, and `can_disable` / `blocking_contest_count` are pre-computed so
 * the button's enabled state and the endpoint that would refuse it agree by
 * construction rather than by two copies of one rule.
 *
 * Every section of the MVP's panel is now live. "Staff location fallback" adds
 * one thing the MVP has no endpoint for — a Revoke beside the issued code — for
 * the ordinary case of six digits read aloud to the wrong table.
 * -------------------------------------------------------------------------- */

export type ArenaVenueCheckInPanelProps = {
    /** Route param — never a record's id, which can belong to another group. */
    arenaId: string;
    arenaName: string;
    role: string;
    /**
     * The MVP's hosting gate. FALSE hides the write affordances without hiding
     * the section, so an owner in a paused Arena can still see what is set up.
     * Disable is exempt: a venue that cannot be switched off is a trap, and the
     * endpoint allows it whatever the hosting state.
     */
    configurationWritable: boolean;
};

export const ArenaVenueCheckInPanel = ({
    arenaId,
    arenaName,
    role,
    configurationWritable,
}: ArenaVenueCheckInPanelProps) => {
    const dispatch = useDispatch();
    const {
        detail,
        detailForId,
        detailLoading,
        configureAction,
        configureLoading,
        configureMessage,
        configureError,
        activity,
        activityForId,
        activityError,
        issuedAssistCode,
        assistIssueLoading,
        assistIssueError,
        assistRevokeLoading,
        assistRevokeError,
    } = useSelector((state: RootState) => state.venue);

    const [setupOpen, setSetupOpen] = useState(false);
    const [confirmingAction, setConfirmingAction] = useState<
        "disable" | "enable" | "regenerate" | null
    >(null);
    const [message, setMessage] = useState<string | null>(null);
    // Only the lifecycle writes report through this panel; a save from the
    // setup drawer shares the redux slot and reports its own outcome.
    const ownActionRef = useRef(false);

    /* ---------- Who is asking ----------
     *
     * The Arena Settings tab is open to MEMBERS (unlike the League's), so this
     * gate is the only thing keeping this whole section — and its two staff-only
     * reads — away from them. It is deliberately in two layers.
     *
     * The role prop is the pre-read gate: it is all that exists before anything
     * has been fetched, and it must be strict enough that a member never fires
     * either request.
     *
     * Once `/detail` answers, the SERVER's `viewer` block wins. It is the same
     * computation `/activity` authorises with — `isStaff = created_by === me ||
     * role ∈ {commissioner, manager}` — and it differs from the role check in a
     * way that matters: ownership is read off `groups.created_by`, so the
     * creator is staff even if their group_members row says 'member'. Deriving
     * from `role` alone would hide the panel from the one person who owns it.
     */
    const roleIsStaff = role === "commissioner" || role === "manager";
    const scoped = detailForId === arenaId ? detail : null;
    const isStaff = scoped?.viewer.is_staff ?? roleIsStaff;
    const isOwner = scoped?.viewer.is_owner ?? role === "commissioner";

    // The panel owns its own read: it is the Settings tab's section, and it must
    // not depend on the contest wizard having been opened first.
    useEffect(() => {
        if (!arenaId || !roleIsStaff) return;
        dispatch(fetchVenueCheckInDetailRequest({ group_id: arenaId }));
    }, [arenaId, dispatch, roleIsStaff]);

    // Read through an id check, like every other group-scoped slot here.
    const scopedActivity = activityForId === arenaId ? activity : null;
    const venueCheckIn = scoped?.venue_check_in ?? null;
    const staff = scoped?.staff ?? null;
    const venue = venueCheckIn?.venue ?? null;
    const state = venueCheckIn?.state ?? null;
    const isActive = venueCheckIn?.is_enabled === true;
    const isDisabled = state === "disabled";
    const blockingContestCount = staff?.blocking_contest_count ?? 0;
    const activeSessionCount = staff?.active_session_count ?? 0;

    /* ---------- Today's activity ----------
     *
     * STAFF ONLY, on the server's own verdict — `/activity` answers a member
     * 403 "Only Arena staff can view Venue Check-In activity", and the counts
     * describe a room they have no business reading. `scoped?.viewer.is_staff`
     * rather than the role prop, so the request cannot be fired on a guess.
     *
     * Also waits for a LIVE venue: a disabled or unconfigured one has had no day
     * to report, and the table lives inside the operations disclosure, which
     * only an active venue renders.
     */
    useEffect(() => {
        if (!arenaId || !isActive) return;
        if (scoped?.viewer.is_staff !== true) return;
        dispatch(fetchVenueActivityRequest({ group_id: arenaId }));
    }, [arenaId, dispatch, isActive, scoped?.viewer.is_staff]);

    // ONE place a lifecycle write's outcome is reported, so a re-render cannot
    // act twice. The reply is already folded into `detail` by the slice.
    useEffect(() => {
        if (!ownActionRef.current) return;
        if (configureLoading) return;
        if (configureError) {
            ownActionRef.current = false;
            setMessage(configureError);
            dispatch(clearGroupVenueWriteState());
            return;
        }
        if (configureMessage) {
            ownActionRef.current = false;
            setMessage(configureMessage);
            dispatch(clearGroupVenueWriteState());
        }
    }, [configureError, configureLoading, configureMessage, dispatch]);

    // A token rotation or a state flip invalidates whatever was on screen —
    // including a live assist code, which belongs to the venue that just changed
    // underneath it.
    useEffect(() => {
        setConfirmingAction(null);
        dispatch(clearIssuedVenueAssistCode());
    }, [dispatch, staff?.public_check_in_token, state]);

    /**
     * The code dies on the clock, not on a refresh: five minutes is short enough
     * that a stale one left on screen would be read aloud to a customer who then
     * gets "invalid, expired, or already used" for no visible reason.
     */
    useEffect(() => {
        if (!issuedAssistCode) return;
        const remainingMs = Date.parse(issuedAssistCode.expires_at) - Date.now();
        const timeoutId = window.setTimeout(
            () => dispatch(clearIssuedVenueAssistCode()),
            Math.min(Math.max(0, remainingMs + 5), 2_147_000_000)
        );
        return () => window.clearTimeout(timeoutId);
    }, [dispatch, issuedAssistCode]);

    // Staff AND an active venue AND a writable Arena — the server's own answer,
    // so the button cannot offer what the endpoint would refuse.
    const canIssueAssistCode = scoped?.viewer.can_issue_assist_code === true;

    if (!isStaff) return null;

    const runLifecycleAction = (action: "disable" | "enable" | "regenerate") => {
        ownActionRef.current = true;
        setConfirmingAction(null);
        setMessage(null);
        const payload = { group_id: arenaId };
        dispatch(
            action === "disable"
                ? disableGroupVenueRequest(payload)
                : action === "enable"
                    ? enableGroupVenueRequest(payload)
                    : regenerateVenueTokenRequest(payload)
        );
    };

    const lifecycleBusy =
        configureLoading &&
        (configureAction === "disable" ||
            configureAction === "enable" ||
            configureAction === "regenerate");

    return (
        <section
            className="border-b border-[var(--border-soft)] px-5 py-7 sm:px-6"
            aria-labelledby="venue-check-in-heading"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2
                        id="venue-check-in-heading"
                        className="text-base font-semibold text-white"
                    >
                        Venue Check-In
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                        One verified location and reusable QR for in-person Arena contests.
                    </p>
                </div>
                <span
                    className={`mt-0.5 inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${isActive
                        ? "text-emerald-200"
                        : isDisabled
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                >
                    <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-gray-600"
                            }`}
                    />
                    {!scoped && detailLoading
                        ? "Loading"
                        : isActive
                            ? "Active"
                            : isDisabled
                                ? "Disabled"
                                : "Not configured"}
                </span>
            </div>

            {/* Until the read answers, say nothing about the venue's state. An
                unanswered slot reads as `not_configured` here, and flashing
                "No venue has been configured" plus a Set-up button at an owner
                who already has one is worse than a beat of nothing. */}
            {!scoped ? (
                <div className="-mx-5 mt-5 border-t border-white/10 px-5 pt-5 sm:-mx-6 sm:px-6">
                    <div className="h-4 w-56 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/[0.04]" />
                </div>
            ) : !isActive ? (
                <div className="-mx-5 mt-5 border-t border-white/10 px-5 pt-5 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <p className="text-sm leading-6 text-gray-300">
                                {isDisabled
                                    ? "Venue Check-In is disabled. Its previous QR no longer works."
                                    : "No venue has been configured for this Arena yet."}
                            </p>
                            {!isOwner ? (
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    Only the Arena owner can configure the canonical venue.
                                </p>
                            ) : !configurationWritable ? (
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    Venue configuration is read-only while the Arena plan is
                                    inactive.
                                </p>
                            ) : isDisabled ? (
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    Switching it back on issues a NEW QR — the old code stays dead,
                                    so the poster has to be reprinted.
                                </p>
                            ) : null}
                        </div>
                        {isOwner && configurationWritable ? (
                            isDisabled ? (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingAction("enable")}
                                    disabled={lifecycleBusy}
                                    className="ml-auto min-h-11 shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-white/[0.05] disabled:opacity-50"
                                >
                                    {lifecycleBusy ? "Working…" : "Enable Venue Check-In"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSetupOpen(true)}
                                    className="ml-auto min-h-11 shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-white/[0.05]"
                                >
                                    Set up Venue Check-In
                                </button>
                            )
                        ) : null}
                    </div>

                    {/* A disabled venue's details can still be corrected before it
                        goes back on — `/update` works on one deliberately. */}
                    {isDisabled && isOwner && configurationWritable ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">{venue?.name}</p>
                                <p className="mt-0.5 text-xs leading-5 text-gray-400">
                                    {venue?.display_address}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSetupOpen(true)}
                                className="ml-auto min-h-11 shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.05]"
                            >
                                Edit venue details
                            </button>
                        </div>
                    ) : null}

                    {confirmingAction === "enable" ? (
                        <div className="mt-4 border-l-2 border-violet-300/35 pl-4">
                            <p className="text-sm leading-6 text-gray-300">
                                Enable Venue Check-In? A brand new QR is issued and the previous
                                code stays dead forever — every printed poster has to be replaced.
                            </p>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmingAction(null)}
                                    className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runLifecycleAction("enable")}
                                    disabled={lifecycleBusy}
                                    className="min-h-11 rounded-xl border border-violet-300/30 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/10 disabled:opacity-50"
                                >
                                    {lifecycleBusy ? "Enabling…" : "Confirm"}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="-mx-5 mt-5 divide-y divide-white/10 border-y border-white/10 sm:-mx-6">
                    <section
                        aria-label="Current venue"
                        className="flex flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
                    >
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Current venue
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">{venue?.name}</p>
                            <p className="mt-0.5 text-xs leading-5 text-gray-400">
                                {venue?.display_address}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-500">
                                {/* `verification_radius_meters` is a staff-only column, so it
                                    is absent for a manager — the line drops that clause
                                    rather than printing "undefined m radius". */}
                                {venue?.verification_radius_meters
                                    ? `${venue.verification_radius_meters} m radius · `
                                    : ""}
                                {(venue?.check_in_duration_minutes ?? 0) / 60}{" "}
                                {venue?.check_in_duration_minutes === 60 ? "hour" : "hours"}{" "}
                                check-in
                            </p>
                        </div>
                        {isOwner && configurationWritable ? (
                            <button
                                type="button"
                                onClick={() => setSetupOpen(true)}
                                className="ml-auto min-h-11 shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.05]"
                            >
                                Update venue
                            </button>
                        ) : (
                            <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                {isOwner ? "Read only" : "Owner-managed"}
                            </span>
                        )}
                    </section>

                    <details aria-label="Venue Check-In operations" className="group px-5 sm:px-6">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-100">
                                    Venue operations
                                </span>
                                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                                    Permanent QR ·{" "}
                                    {scopedActivity
                                        ? `${scopedActivity.counts.check_ins} check-ins today`
                                        : `${activeSessionCount} checked in now`}{" "}
                                    · staff tools
                                </span>
                            </span>
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 16 16"
                                data-directional-arrow="down"
                                className="ui-directional-arrow h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                            >
                                <path
                                    d="m4 6 4 4 4-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </summary>

                        <div className="-mx-5 divide-y divide-white/10 border-t border-white/10 sm:-mx-6">
                            <div className="px-5 sm:px-6">
                                {staff?.check_in_url && staff.public_check_in_token ? (
                                    <ArenaVenueQrCard
                                        checkInUrl={staff.check_in_url}
                                        token={staff.public_check_in_token}
                                        arenaName={arenaName}
                                        venueName={venue?.name ?? arenaName}
                                    />
                                ) : (
                                    <p className="py-5 text-xs leading-5 text-gray-500">
                                        The check-in link is not available. It is composed from the
                                        server&apos;s own FRONTEND_URL — set that and reopen this
                                        panel.
                                    </p>
                                )}
                            </div>

                            {/* The MVP's "Staff location fallback", verbatim, plus a
                                Revoke the MVP has no endpoint for. Gated on
                                `viewer.can_issue_assist_code` — staff AND an active
                                venue AND a writable Arena, pre-computed server-side so
                                the button and the endpoint cannot disagree. */}
                            <section
                                aria-labelledby="venue-staff-fallback-heading"
                                className="px-5 py-5 sm:px-6"
                            >
                                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <div className="min-w-0">
                                        <h3
                                            id="venue-staff-fallback-heading"
                                            className="text-sm font-semibold text-white"
                                        >
                                            Staff location fallback
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            Issue a six-digit, single-use code when GPS
                                            verification fails. Codes expire after five minutes.
                                        </p>
                                    </div>
                                    {canIssueAssistCode ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                dispatch(
                                                    issueVenueAssistCodeRequest({ group_id: arenaId })
                                                )
                                            }
                                            disabled={assistIssueLoading}
                                            aria-busy={assistIssueLoading}
                                            className="ml-auto min-h-11 shrink-0 rounded-xl border border-violet-300/30 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {assistIssueLoading
                                                ? "Generating…"
                                                : issuedAssistCode
                                                    ? "Generate another"
                                                    : "Generate assist code"}
                                        </button>
                                    ) : null}
                                </div>

                                {issuedAssistCode ? (
                                    <div className="mt-4 border-l-2 border-emerald-300/35 pl-4">
                                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                                            <p className="font-mono text-2xl font-bold tracking-[0.24em] text-emerald-200">
                                                {issuedAssistCode.code}
                                            </p>
                                            <p className="text-xs text-emerald-100/70">
                                                Expires{" "}
                                                {new Date(
                                                    issuedAssistCode.expires_at
                                                ).toLocaleTimeString([], {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        {/* Said plainly: the server keeps only a digest, so
                                            this really is the only copy that will exist. */}
                                        <p className="mt-2 text-[11px] leading-5 text-gray-500">
                                            {issuedAssistCode.note}
                                        </p>
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    dispatch(
                                                        revokeVenueAssistCodeRequest({
                                                            assist_code_id:
                                                                issuedAssistCode.assist_code_id,
                                                        })
                                                    )
                                                }
                                                disabled={assistRevokeLoading}
                                                className="min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-gray-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                                            >
                                                {assistRevokeLoading ? "Revoking…" : "Revoke code"}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                {assistIssueError || assistRevokeError ? (
                                    <p
                                        role="alert"
                                        className="mt-3 text-xs leading-5 text-red-200"
                                    >
                                        {assistIssueError ?? assistRevokeError}
                                    </p>
                                ) : null}
                            </section>

                            {/* Rendered on the SERVER's verdict, not the role prop —
                                the same `is_staff` the endpoint authorises with. A
                                member cannot reach this branch (the panel returns null
                                for them), and this is the second lock on it. */}
                            <section
                                aria-labelledby="venue-activity-heading"
                                className="px-5 py-5 sm:px-6"
                                hidden={scoped?.viewer.is_staff !== true}
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h3
                                        id="venue-activity-heading"
                                        className="text-sm font-semibold text-white"
                                    >
                                        Today&rsquo;s activity
                                    </h3>
                                    {/* The server resolves "today" in the zone the
                                        x-timezone header names and echoes the range it
                                        used, so the label states the day actually shown
                                        rather than assuming we agreed. */}
                                    {scopedActivity ? (
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                            {scopedActivity.range.date} ·{" "}
                                            {scopedActivity.range.time_zone}
                                        </p>
                                    ) : null}
                                </div>

                                {activityError ? (
                                    <p className="mt-3 text-xs leading-5 text-gray-500">
                                        {activityError}
                                    </p>
                                ) : !scopedActivity ? (
                                    <div className="mt-3 space-y-2" role="status">
                                        {[0, 1, 2, 3].map((key) => (
                                            <div
                                                key={key}
                                                className="h-8 animate-pulse rounded bg-white/[0.03]"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <dl className="mt-3 divide-y divide-white/10 border-y border-white/10">
                                            {(
                                                [
                                                    ["Check-ins today", scopedActivity.counts.check_ins],
                                                    [
                                                        "Unique checked-in members",
                                                        scopedActivity.counts.unique_members,
                                                    ],
                                                    [
                                                        "New Arena members from venue QR",
                                                        scopedActivity.counts.new_members_from_qr,
                                                    ],
                                                    [
                                                        "Returning checked-in members",
                                                        scopedActivity.counts.returning_members,
                                                    ],
                                                    [
                                                        "Venue-required entries submitted",
                                                        scopedActivity.counts.venue_required_entries,
                                                    ],
                                                    [
                                                        "Failed verification attempts",
                                                        scopedActivity.counts.failed_attempts,
                                                    ],
                                                    [
                                                        "Staff-assisted check-ins",
                                                        scopedActivity.counts.staff_assisted,
                                                    ],
                                                ] as const
                                            ).map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className="flex items-baseline justify-between gap-4 py-3"
                                                >
                                                    <dt className="text-xs leading-5 text-gray-500">
                                                        {label}
                                                    </dt>
                                                    <dd className="shrink-0 text-sm font-semibold tabular-nums text-gray-200">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                        {/* Said out loud, because a silently capped total
                                            reads exactly like a real one. */}
                                        {scopedActivity.is_partial ? (
                                            <p className="mt-3 text-[11px] leading-5 text-amber-200/80">
                                                Busy day — these are minimums. Some rows were
                                                beyond the reporting cap.
                                            </p>
                                        ) : null}
                                        <p className="mt-3 text-[11px] leading-5 text-gray-500">
                                            {scopedActivity.note}
                                        </p>
                                    </>
                                )}
                            </section>

                            {isOwner ? (
                                <section
                                    aria-labelledby="venue-controls-heading"
                                    className="px-5 py-5 sm:px-6"
                                >
                                    <h3
                                        id="venue-controls-heading"
                                        className="text-sm font-semibold text-white"
                                    >
                                        Venue controls
                                    </h3>
                                    {confirmingAction === "regenerate" ||
                                        confirmingAction === "disable" ? (
                                        <div
                                            className={`mt-3 border-l-2 pl-4 ${confirmingAction === "regenerate"
                                                ? "border-violet-300/35"
                                                : "border-red-300/35"
                                                }`}
                                        >
                                            {/* The two confirmations differ in exactly the way
                                                the endpoints do, and the sentence says so:
                                                rotating retires the poster and KEEPS the room,
                                                disabling retires both. */}
                                            <p className="text-sm leading-6 text-gray-300">
                                                {confirmingAction === "regenerate"
                                                    ? `Regenerate now? Every printed copy of the current QR stops working immediately.${activeSessionCount === 0
                                                        ? " Nobody is checked in right now."
                                                        : ` The ${activeSessionCount} ${activeSessionCount === 1
                                                            ? "member currently checked in stays"
                                                            : "members currently checked in stay"
                                                        } checked in.`
                                                    }`
                                                    : `Disable Venue Check-In? ${activeSessionCount === 0
                                                        ? "Members will lose this access path and the printed QR stops working."
                                                        : `${activeSessionCount} active ${activeSessionCount === 1
                                                            ? "check-in will"
                                                            : "check-ins will"
                                                        } be revoked, and the printed QR stops working.`
                                                    }`}
                                            </p>
                                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingAction(null)}
                                                    className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => runLifecycleAction(confirmingAction)}
                                                    disabled={lifecycleBusy}
                                                    className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${confirmingAction === "regenerate"
                                                        ? "border-violet-300/30 text-violet-100 hover:bg-violet-500/10"
                                                        : "border-red-300/30 text-red-100 hover:bg-red-500/10"
                                                        }`}
                                                >
                                                    {lifecycleBusy
                                                        ? confirmingAction === "regenerate"
                                                            ? "Regenerating…"
                                                            : "Disabling…"
                                                        : "Confirm"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingAction("regenerate")}
                                                disabled={!staff?.can_regenerate_token || lifecycleBusy}
                                                className="min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Regenerate permanent QR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingAction("disable")}
                                                disabled={!staff?.can_disable || lifecycleBusy}
                                                title={
                                                    blockingContestCount > 0
                                                        ? "Finish or cancel active venue-required contests first."
                                                        : undefined
                                                }
                                                className="min-h-11 rounded-xl border border-red-300/25 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Disable Venue Check-In
                                            </button>
                                        </div>
                                    )}
                                    {blockingContestCount > 0 && !confirmingAction ? (
                                        <p className="mt-2 text-right text-[11px] leading-5 text-gray-500">
                                            Finish or cancel {blockingContestCount}{" "}
                                            {blockingContestCount === 1
                                                ? "active venue-required contest"
                                                : "active venue-required contests"}{" "}
                                            before disabling.
                                        </p>
                                    ) : null}
                                </section>
                            ) : null}
                        </div>
                    </details>
                </div>
            )}

            {message ? (
                <p
                    role="status"
                    className="mt-4 border-l-2 border-white/15 pl-3 text-xs leading-5 text-gray-400"
                >
                    {message}
                </p>
            ) : null}

            <ArenaVenueSetupDialog
                open={setupOpen}
                onClose={() => setSetupOpen(false)}
                arenaId={arenaId}
                onConfigured={(serverMessage) => setMessage(serverMessage)}
            />
        </section>
    );
};

export default ArenaVenueCheckInPanel;
