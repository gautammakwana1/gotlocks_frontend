"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import {
    ArenaStatusBanner,
    arenaTierLabel,
    formatArenaCents,
    getArenaHostingHeadline,
    getArenaHostingStatusLabel,
    getArenaTierLabel,
} from "@/components/arenas/ArenaHostingStatus";
import { getArenaHostingOffer, SELF_SERVICE_ARENA_TIERS } from "@/components/billing/arena";
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

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-7xl">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings/plan?product=arena"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    <span className="flex items-center gap-2">
                        <ArrowLeft size={14} /> arena hosting
                    </span>
                </Link>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                            Owner billing
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                            {arena?.name ?? "Arena"}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            Hosting status, tier, and receipts for this Arena.
                        </p>
                    </div>
                    {arenaId ? (
                        <Link
                            href={`/arena/${arenaId}?tab=settings`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-white/20 hover:text-white"
                        >
                            Arena settings
                        </Link>
                    ) : null}
                </div>
            </header>

            {/* Stripe-billed Arenas render here and this panel owns their plan,
                cancellation and card. It returns null for legacy simulated
                Arenas, which keep the section below. */}
            <ArenaSubscriptionPanel arenaId={arenaId} isOwner={isOwner} hosting={hosting} />

            <section aria-labelledby="hosting-status-title" className="space-y-4">
                {arenaError && !hosting ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"
                    >
                        {arenaError}
                    </div>
                ) : null}
            </section>

            <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-white">
                    Receipts
                </summary>
                <dl className="mt-3 space-y-3 border-t border-white/10 pt-4 text-xs text-gray-400">
                    {unlockReceipt ? (
                        <div>
                            <dt className="uppercase tracking-[0.12em]">Arena unlock</dt>
                            <dd className="mt-1 break-all font-mono text-white">{unlockReceipt}</dd>
                        </div>
                    ) : null}
                    {hostingReceipt ? (
                        <div>
                            <dt className="uppercase tracking-[0.12em]">
                                {getArenaTierLabel(hosting)} hosting
                            </dt>
                            <dd className="mt-1 break-all font-mono text-white">{hostingReceipt}</dd>
                        </div>
                    ) : null}
                    {!unlockReceipt && !hostingReceipt ? (
                        <p>No simulated receipts yet.</p>
                    ) : null}
                </dl>
            </details>

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
        </div>
    );
};

export default ArenaBillingDetailPage;
