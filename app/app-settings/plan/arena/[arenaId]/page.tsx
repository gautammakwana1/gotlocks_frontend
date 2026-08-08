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

            <section aria-labelledby="hosting-status-title" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            current status
                        </p>
                        <h2
                            id="hosting-status-title"
                            className="mt-1 text-lg font-semibold text-[var(--app-text)]"
                        >
                            {getArenaHostingStatusLabel(hosting)}
                        </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                        simulated billing
                    </span>
                </div>

                {/* hosting-details 500s rather than returning nulls when an Arena has
                    no hosting/unlock row (legacy Arenas predating unlock-on-create),
                    so say so instead of rendering an empty page. */}
                {arenaError && !hosting ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"
                    >
                        {arenaError}
                    </div>
                ) : null}

                {locked ? (
                    <div className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-5">
                        <p className="text-sm leading-6 text-gray-200">
                            This Arena is not unlocked yet. A permanent unlock is required before
                            hosting can begin.
                        </p>
                        <Link
                            href={`/arena/${arenaId}?tab=settings`}
                            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-violet-300/50 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30"
                        >
                            Open Arena settings
                        </Link>
                    </div>
                ) : hosting ? (
                    <ArenaStatusBanner hosting={hosting} />
                ) : null}
            </section>

            {!locked && hosting ? (
                <section aria-labelledby="hosting-tier-title" className="space-y-4">
                    <div>
                        <h2
                            id="hosting-tier-title"
                            className="text-lg font-semibold text-[var(--app-text)]"
                        >
                            Hosting tier
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                            Capacity and price for this Arena&apos;s current tier.
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-white">Current hosting</p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {getArenaHostingHeadline(hosting)}
                                </p>
                            </div>
                            {monthlyLabel ? (
                                <p className="text-sm text-gray-300">
                                    {monthlyLabel}
                                    <span className="text-xs text-gray-500"> / month</span>
                                </p>
                            ) : null}
                        </div>

                        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                            {[
                                { label: "members", value: hosting.participating_member_limit },
                                { label: "managers", value: hosting.manager_limit },
                                { label: "contests", value: hosting.active_contest_limit },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-2"
                                >
                                    <dt className="text-[10px] uppercase tracking-wide text-gray-500">
                                        {item.label}
                                    </dt>
                                    <dd className="mt-0.5 text-sm font-semibold text-white">
                                        {item.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <div className="mt-4 space-y-1 text-xs text-gray-500">
                            {hosting.included_month_ends_at ? (
                                <p>Included month ends {formatDateTime(hosting.included_month_ends_at)}</p>
                            ) : null}
                            {hosting.paid_through_at ? (
                                <p>Paid through {formatDateTime(hosting.paid_through_at)}</p>
                            ) : null}
                            {hosting.period_ends_at ? (
                                <p>Period ends {formatDateTime(hosting.period_ends_at)}</p>
                            ) : null}
                            {hosting.pause_scheduled_for ? (
                                <p>Pause scheduled for {formatDateTime(hosting.pause_scheduled_for)}</p>
                            ) : null}
                        </div>
                    </div>

                    {/* Read-only by design: this page reports which tier is active. It
                        deliberately renders no upgrade/downgrade affordance, so it also
                        never consults available_tiers — those verdicts carry CTA-phrased
                        action_label / summary copy that would read as a tier switcher. */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {SELF_SERVICE_ARENA_TIERS.map((tierId) => {
                            const offer = getArenaHostingOffer(tierId);
                            const isCurrent = hosting.tier === tierId;
                            return (
                                <article
                                    key={tierId}
                                    className={`rounded-2xl border p-4 ${isCurrent
                                        ? "border-violet-300/40 bg-violet-500/10"
                                        : "border-white/10 bg-white/[0.03]"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-white">{offer.name}</h3>
                                        {isCurrent ? (
                                            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                                                current
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-300">
                                        {offer.priceLabel}
                                        <span className="text-xs text-gray-500"> / month</span>
                                    </p>
                                    <p className="mt-3 text-xs leading-5 text-gray-500">
                                        {offer.summary ?? "—"}
                                    </p>
                                </article>
                            );
                        })}

                        <article className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
                            <h3 className="font-semibold text-white">
                                {getArenaHostingOffer("custom").name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-400">
                                {getArenaHostingOffer("custom").priceLabel} ·{" "}
                                {getArenaHostingOffer("custom").cadenceLabel}
                            </p>
                            <p className="mt-3 text-xs leading-5 text-gray-500">
                                {getArenaHostingOffer("custom").summary}
                            </p>
                            <span className="mt-3 inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                Contact state
                            </span>
                        </article>
                    </div>

                    <p className="text-xs leading-5 text-[var(--text-muted)]">
                        Tier changes are managed from the Arena&apos;s own settings.
                    </p>

                    {hosting.scheduled_tier ? (
                        <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-xs leading-5 text-sky-100">
                            {arenaTierLabel(hosting.scheduled_tier)} is scheduled
                            {hosting.status === "included_month"
                                ? ` after the included month${hosting.included_month_ends_at
                                    ? ` ends ${formatDateTime(hosting.included_month_ends_at)}`
                                    : ""
                                }.`
                                : " for the next paid period."}
                        </div>
                    ) : null}
                </section>
            ) : null}

            {!locked && hosting && isOwner ? (
                <section aria-labelledby="hosting-controls-title" className="space-y-3">
                    <h2
                        id="hosting-controls-title"
                        className="text-lg font-semibold text-[var(--app-text)]"
                    >
                        Hosting controls
                    </h2>

                    {canSchedulePause ? (
                        <button
                            type="button"
                            onClick={() => setPauseConfirmOpen(true)}
                            disabled={hostingActionLoading}
                            className="min-h-11 rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Pause at period end
                        </button>
                    ) : null}

                    {canCancelPause ? (
                        <button
                            type="button"
                            onClick={handleCancelPause}
                            disabled={hostingActionLoading}
                            className="min-h-11 rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel scheduled pause
                        </button>
                    ) : null}

                    {!canSchedulePause && !canCancelPause ? (
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                            No hosting controls are available while this Arena is{" "}
                            {getArenaHostingStatusLabel(hosting).toLowerCase()}.
                        </p>
                    ) : null}
                </section>
            ) : null}

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
