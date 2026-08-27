"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
    SettingsDisclosure,
    SettingsHeader,
    SettingsPage,
    SettingsSection,
} from "@/components/settings/SettingsUI";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import {
    ArenaStatusBanner,
    arenaTierLabel,
    formatArenaCents,
    getArenaHostingStatusLabel,
    getArenaTierLabel,
} from "@/components/arenas/ArenaHostingStatus";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { GroupSelector, RootState } from "@/lib/interfaces/interfaces";
import {
    cancelArenaPauseRequest,
    clearArenaHostingActionMessage,
    fetchArenaHostingDetailsRequest,
    scheduleArenaPauseRequest,
} from "@/lib/redux/slices/arenaSlice";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import ArenaSubscriptionPanel from "@/components/billing/ArenaSubscriptionPanel";
import { useToast } from "@/lib/state/ToastContext";
import { formatDateTime } from "@/lib/utils/date";

const ArenaBillingDetailPage = () => {
    const params = useParams<{ arenaId: string }>();
    const arenaId = params?.arenaId ?? "";
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);

    const { group, error: groupError } = useSelector((state: GroupSelector) => state.group);
    const {
        hosting: hostingRow,
        unlock: unlockRow,
        error: arenaError,
        loading: arenaLoading,
        subscription,
        subscriptionLoading,
        hostingActionLoading,
        hostingActionError,
        hostingActionMessage,
    } = useSelector((state: RootState) => state.arena);

    // state.group.group and state.arena.hosting are single shared slots written by
    // many flows, so on first paint they can still hold the previously viewed
    // group. Never render either until it is proven to be THIS arena.
    const arenaLoaded = Boolean(arenaId) && group?.id === arenaId;
    const arena = arenaLoaded ? group : null;
    const hosting = hostingRow?.group_id === arenaId ? hostingRow : null;
    const unlock = unlockRow?.group_id === arenaId ? unlockRow : null;

    const role = arena?.current_user_member?.role;
    // Arenas spell the owner role "commissioner"; created_by disagrees mid
    // ownership-transfer, so the membership role is authoritative here.
    const isOwner = role === "commissioner";

    useEffect(() => {
        if (!arenaId || !currentUser?.userId) return;
        dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
    }, [arenaId, currentUser?.userId, dispatch]);

    useEffect(() => {
        if (!currentUser) router.replace("/landing-page");
    }, [currentUser, router]);

    // Gated on arenaLoaded: before the group resolves `role` is undefined, and an
    // ungated check would bounce the owner straight back out on first paint.
    // The error branch covers the 403 the group endpoint returns to non-members —
    // without it a non-member deep-link would sit on an empty page forever.
    useEffect(() => {
        if (!arenaLoaded && !groupError) return;
        if (!arenaLoaded || !isOwner) router.replace("/app-settings/plan?product=arena");
    }, [arenaLoaded, groupError, isOwner, router]);

    // Pause writes report their outcome by toast, same as the Arena dashboard.
    useEffect(() => {
        if (!hostingActionError && !hostingActionMessage) return;
        setToast({
            id: Date.now(),
            type: hostingActionError ? "error" : "success",
            message: hostingActionError ?? hostingActionMessage ?? "",
            duration: 5000,
        });
        dispatch(clearArenaHostingActionMessage());
    }, [hostingActionError, hostingActionMessage, dispatch, setToast]);

    if (!currentUser) return null;

    const handleSchedulePause = () => {
        setPauseConfirmOpen(false);
        dispatch(scheduleArenaPauseRequest({ arena_id: arenaId }));
    };

    const handleCancelPause = () => {
        dispatch(cancelArenaPauseRequest({ arena_id: arenaId }));
    };

    // Locked is the UNLOCK status, not hosting.status — a not_started hosting row
    // on an unlocked Arena still gets the tier section.
    const locked = unlock?.status === "locked";
    const unlockReceipt = unlock?.simulated_payment_reference ?? null;
    const hostingReceipt = hosting?.simulated_payment_reference ?? null;
    const renewalNeeded =
        hosting?.status === "paused" ||
        hosting?.status === "past_due" ||
        hosting?.status === "cleanup";
    const monthlyLabel = formatArenaCents(hosting?.monthly_amount_cents);

    const canSchedulePause =
        hosting?.status === "included_month" || hosting?.status === "active";
    const canCancelPause =
        hosting?.status === "pause_scheduled" && Boolean(hosting?.pause_scheduled_for);

    /* Which billing path this Arena is on. ArenaSubscriptionPanel renders itself
     * only for "stripe" and returns null otherwise, so the parent has to read the
     * same fact to know whether the legacy plan section below is the one doing
     * the talking. The slice clears `subscription` whenever the arena id
     * changes, so no scoping guard is needed on top of that. */
    const stripeBilled = subscription?.billing_mode === "stripe";
    const planLoading = (arenaLoading || subscriptionLoading) && !hosting;

    return (
        <SettingsPage>
            <SettingsHeader
                title={arena?.name ?? "Arena"}
                description="Plan status, tier, and receipts for this Arena."
                backHref="/app-settings/plan?product=arena"
                backLabel="Arena plans"
                titleAction={
                    arenaId ? (
                        <Link
                            href={`/arena/${arenaId}?tab=settings&from=billing`}
                            className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-violet-200 transition hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--app-bg)]"
                        >
                            <span>Manage this Arena</span>
                            <AnimatedArrow direction="up-right" className="text-base leading-none" />
                        </Link>
                    ) : null
                }
            />

            {/* Stripe-billed Arenas render here and this panel owns their plan,
                cancellation and card. It returns null for legacy simulated
                Arenas, which keep the section below. */}
            <ArenaSubscriptionPanel arenaId={arenaId} isOwner={isOwner} hosting={hosting} />

            {/* THE LEGACY / NON-STRIPE PLAN VIEW.
                `ArenaSubscriptionPanel` above renders ONLY for an Arena that has a
                real Stripe subscription and returns null for every other case, so
                without this section the page was blank for every simulated-billing
                Arena — a header, an empty status shell, and nothing else. This
                renders the hosting record that was already being fetched. */}
            {!stripeBilled ? (
                <SettingsSection
                    title="Arena plan"
                    description="Plan status and renewal for this Arena."
                    bodyClassName="space-y-4"
                    layout="split"
                >
                    <div className="flex flex-wrap items-start justify-end gap-3">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                            {unlock?.status === "unlocked" ? "Permanently unlocked" : "Locked"}
                        </span>
                    </div>

                    {arenaError ? (
                        <div
                            role="alert"
                            className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"
                        >
                            {arenaError}
                        </div>
                    ) : null}

                    {planLoading ? (
                        <div className="min-h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="h-4 w-44 rounded bg-white/10" />
                            <div className="mt-3 h-3 w-64 rounded bg-white/5" />
                        </div>
                    ) : hosting ? (
                        <>
                            <ArenaStatusBanner hosting={hosting} />

                            <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm sm:gap-6">
                                <div className="space-y-1">
                                    <dt className="text-[10px] uppercase leading-4 tracking-[0.06em] text-gray-500 sm:text-xs sm:tracking-[0.12em]">
                                        Tier
                                    </dt>
                                    <dd className="text-base font-semibold text-white">
                                        {getArenaTierLabel(hosting)}
                                    </dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-[10px] uppercase leading-4 tracking-[0.06em] text-gray-500 sm:text-xs sm:tracking-[0.12em]">
                                        Status
                                    </dt>
                                    <dd className="text-base font-semibold text-white">
                                        {getArenaHostingStatusLabel(hosting)}
                                    </dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-[10px] uppercase leading-4 tracking-[0.06em] text-gray-500 sm:text-xs sm:tracking-[0.12em]">
                                        Monthly
                                    </dt>
                                    <dd className="text-base font-semibold text-white">
                                        {/* The included month bills nothing, so a price here
                                            would contradict the banner above it. */}
                                        {hosting.status === "included_month"
                                            ? "Included"
                                            : monthlyLabel
                                                ? `${monthlyLabel}/mo`
                                                : "—"}
                                    </dd>
                                </div>
                            </dl>

                            {hosting.period_ends_at || hosting.pause_scheduled_for ? (
                                <dl className="space-y-2 text-xs leading-5 text-gray-400">
                                    {hosting.period_ends_at ? (
                                        <div className="flex flex-wrap gap-x-2">
                                            <dt className="uppercase tracking-[0.12em]">Current period ends</dt>
                                            <dd className="font-semibold text-gray-200">
                                                {formatDateTime(hosting.period_ends_at)}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {hosting.pause_scheduled_for ? (
                                        <div className="flex flex-wrap gap-x-2">
                                            <dt className="uppercase tracking-[0.12em]">Pause takes effect</dt>
                                            <dd className="font-semibold text-amber-200">
                                                {formatDateTime(hosting.pause_scheduled_for)}
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            ) : null}

                            {renewalNeeded ? (
                                <p className="rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-100">
                                    Restart a monthly tier from the Arena&apos;s own settings tab to
                                    reopen it. The permanent unlock stays with the Arena and is not
                                    charged again.
                                </p>
                            ) : null}

                            {/* Pause is the one hosting write this page owns; the
                                confirm dialog below was already here and had lost its
                                trigger along with the rest of this section. */}
                            {canSchedulePause || canCancelPause ? (
                                <div className="flex flex-wrap gap-2">
                                    {canSchedulePause ? (
                                        <button
                                            type="button"
                                            onClick={() => setPauseConfirmOpen(true)}
                                            disabled={hostingActionLoading}
                                            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Schedule pause
                                        </button>
                                    ) : null}
                                    {canCancelPause ? (
                                        <button
                                            type="button"
                                            onClick={handleCancelPause}
                                            disabled={hostingActionLoading}
                                            className="rounded-xl border border-emerald-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {hostingActionLoading ? "Working…" : "Keep plan active"}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <p className="text-sm leading-6 text-gray-300">
                                {locked
                                    ? `This Arena has no plan yet. Unlock it for its permanent identity and invite code, and one month of ${ARENA_INCLUDED_TIER_LABEL} hosting is included.`
                                    : "No plan record has been created for this Arena yet."}
                            </p>
                            <Link
                                href={`/arena/${arenaId}?tab=settings`}
                                className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-violet-300/40 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/10"
                            >
                                Open Arena settings
                            </Link>
                        </div>
                    )}
                </SettingsSection>
            ) : null}

            {/* The MVP’s "Purchase records" disclosure. These two references
                are the LEGACY simulated ones stored on the arena rows; a
                Stripe-billed Arena has its real invoices in the billing portal
                and in payment history instead, which is what the empty state
                points at rather than claiming there is nothing. */}
            <SettingsDisclosure summary="Purchase records">
                <dl className="grid gap-5 text-xs text-gray-400 sm:grid-cols-2">
                    {unlockReceipt ? (
                        <div>
                            <dt className="uppercase tracking-[0.12em]">Arena unlock</dt>
                            <dd className="mt-1 break-all font-mono normal-case text-white">
                                {unlockReceipt}
                            </dd>
                        </div>
                    ) : null}
                    {hostingReceipt ? (
                        <div>
                            <dt className="uppercase tracking-[0.12em]">
                                {getArenaTierLabel(hosting)} monthly plan
                            </dt>
                            <dd className="mt-1 break-all font-mono normal-case text-white">
                                {hostingReceipt}
                            </dd>
                        </div>
                    ) : null}
                    {!unlockReceipt && !hostingReceipt ? (
                        <div className="sm:col-span-2">
                            <dt className="sr-only">Purchase history</dt>
                            <dd>
                                No stored purchase records for this Arena.{" "}
                                <Link
                                    href="/app-settings/transaction-history"
                                    className="font-semibold text-violet-200 underline underline-offset-4 transition hover:text-violet-100"
                                >
                                    View payment history
                                </Link>{" "}
                                for Stripe receipts.
                            </dd>
                        </div>
                    ) : null}
                </dl>
            </SettingsDisclosure>

            {pauseConfirmOpen && hosting ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="arena-pause-title"
                    onClick={() => {
                        if (!hostingActionLoading) setPauseConfirmOpen(false);
                    }}
                >
                    <div
                        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/15 bg-black/90 p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                                are you sure?
                            </p>
                            <p id="arena-pause-title" className="text-sm text-gray-200">
                                Pause this Arena at the end of the current period?
                            </p>
                        </div>
                        <p className="text-[11px] leading-5 text-gray-400">
                            Your Arena stays fully open until then, and you can cancel the pause any
                            time before it takes effect. After it does, the Arena becomes read-only —
                            identity, members, history, standings and the permanent unlock are all
                            preserved.
                        </p>
                        {hosting.status === "included_month" ? (
                            <p className="rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                                This uses up your included {ARENA_INCLUDED_TIER_LABEL} month.
                                Cancelling the pause later does not bring it back.
                                {hosting.scheduled_tier
                                    ? ` Your scheduled ${arenaTierLabel(
                                        hosting.scheduled_tier
                                    )} will also be cancelled.`
                                    : ""}
                            </p>
                        ) : null}
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPauseConfirmOpen(false)}
                                disabled={hostingActionLoading}
                                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-200 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSchedulePause}
                                disabled={hostingActionLoading}
                                className="rounded-full border border-amber-300/70 bg-amber-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-50 transition hover:border-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {hostingActionLoading ? "working..." : "Schedule pause"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </SettingsPage>
    );
};

export default ArenaBillingDetailPage;
