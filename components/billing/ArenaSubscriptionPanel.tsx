"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
    cancelArenaHostingRequest,
    changeArenaPlanRequest,
    clearArenaBillingActionMessage,
    fetchArenaSubscriptionRequest,
    openArenaBillingPortalRequest,
    resumeArenaHostingRequest,
} from "@/lib/redux/slices/arenaSlice";
import { useToast } from "@/lib/state/ToastContext";
import {
    getArenaCustomContactHref,
    getArenaHostingOffer,
    SELF_SERVICE_ARENA_TIERS,
} from "@/components/billing/arena";
import type { ArenaSelfServiceHostingTier } from "@/components/billing/arena";
import type { ArenaHostingDetails, ArenaSubscription } from "@/lib/interfaces/interfaces";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import { getArenaHostingStatusLabel } from "../arenas/ArenaHostingStatus";

/**
 * The owner-facing view of a real Stripe subscription.
 *
 * The one distinction this panel exists to make legible: during the included
 * month the Arena RUNS ON {ARENA_INCLUDED_TIER_LABEL} while BILLING is set to
 * whatever plan was selected. Those are two different plans at the same time,
 * and every screen that collapses them into one confuses the owner about both
 * what they can do today and what they will be charged next month.
 */

const isSelfService = (code: string | null): code is ArenaSelfServiceHostingTier =>
    code === "arena_50" || code === "arena_100" || code === "arena_250_plus";

const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return "—";
    return new Date(ms).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

/* ----------------------------------------------------------------------------
 * The per-tier line and button on a plan card.
 *
 * This is the MVP's `getArenaHostingChangePreview` vocabulary — its `kind`,
 * `actionLabel` and `summary`, verbatim — re-derived from what we actually hold.
 * The MVP computes its kinds from a domain `ArenaHosting` object; ours come from
 * the Stripe subscription plus the hosting row, which answer the same questions:
 * is this tier already live, already scheduled, bigger, smaller, or unreachable
 * because the Arena is mid-pause or mid-cleanup.
 *
 * `no_change` renders NOTHING — no line, no button — exactly as the MVP does.
 * The card is still the current or already-scheduled plan, and the panel's own
 * "Scheduled: moving to X" banner above the grid says the rest.
 * -------------------------------------------------------------------------- */
type PlanChangeKind =
    | "no_change"
    | "activate"
    | "reactivate"
    | "upgrade"
    | "downgrade"
    | "schedule_after_included_month"
    | "blocked";

type PlanChangePreview = {
    kind: PlanChangeKind;
    allowed: boolean;
    actionLabel: string;
    summary: string;
};

const planChangePreview = ({
    tier,
    offerName,
    subscription,
    hostingStatus,
    periodEndsLabel,
}: {
    tier: ArenaSelfServiceHostingTier;
    offerName: string;
    subscription: ArenaSubscription;
    hostingStatus: string | null;
    periodEndsLabel: string;
}): PlanChangePreview => {
    const isCurrent = subscription.plan_code === tier;
    const alreadyScheduled = subscription.pending_plan_code === tier;

    if (isCurrent || alreadyScheduled) {
        return {
            kind: "no_change",
            allowed: true,
            actionLabel: alreadyScheduled
                ? `${offerName} is scheduled`
                : `${offerName} is active`,
            summary: alreadyScheduled
                ? `${offerName} is already scheduled for the next paid period.`
                : `${offerName} is already active.`,
        };
    }

    // The Arena is mid-pause or mid-cleanup: nothing can be changed until that
    // resolves, and the button says which one rather than greying out mutely.
    if (hostingStatus === "pause_scheduled" || hostingStatus === "cleanup") {
        return {
            kind: "blocked",
            allowed: false,
            actionLabel:
                hostingStatus === "pause_scheduled"
                    ? "Cancel pause first"
                    : "Finish cleanup first",
            summary:
                hostingStatus === "pause_scheduled"
                    ? "Cancel the scheduled pause before changing hosting tiers."
                    : "Finish Arena cleanup before choosing a reactivation tier.",
        };
    }

    // A scheduled downgrade the server refused — too many members for the
    // smaller plan. The MVP renders its capacity blockers in amber; this is the
    // one blocker we can see from here.
    if (alreadyScheduledBlocked(subscription, tier)) {
        return {
            kind: "blocked",
            allowed: false,
            actionLabel: `Schedule ${offerName}`,
            summary: `This Arena has more members than ${offerName} allows. Remove members to complete the change.`,
        };
    }

    if (subscription.in_included_month) {
        return {
            kind: "schedule_after_included_month",
            allowed: true,
            actionLabel: `Use ${offerName} after included month`,
            summary: `${offerName} begins after the included ${ARENA_INCLUDED_TIER_LABEL} month ends.`,
        };
    }

    if (
        subscription.status === "paused" ||
        subscription.status === "canceled" ||
        subscription.status === "unpaid" ||
        subscription.cancel_at_period_end
    ) {
        return {
            kind: "reactivate",
            allowed: true,
            actionLabel: `Reactivate with ${offerName}`,
            summary: `${offerName} begins when hosting is reactivated.`,
        };
    }

    if (!isSelfService(subscription.plan_code)) {
        return {
            kind: "activate",
            allowed: true,
            actionLabel: `Activate ${offerName}`,
            summary: `${offerName} begins when confirmed.`,
        };
    }

    const targetRank = SELF_SERVICE_ARENA_TIERS.indexOf(tier);
    const currentRank = SELF_SERVICE_ARENA_TIERS.indexOf(subscription.plan_code);

    return targetRank > currentRank
        ? {
            kind: "upgrade",
            allowed: true,
            actionLabel: `Upgrade to ${offerName}`,
            summary: `${offerName} begins when confirmed.`,
        }
        : {
            kind: "downgrade",
            allowed: true,
            actionLabel: `Schedule ${offerName}`,
            summary: `${offerName} begins at the end of the current paid period${periodEndsLabel ? ` on ${periodEndsLabel}` : ""}.`,
        };
};

const alreadyScheduledBlocked = (
    subscription: ArenaSubscription,
    tier: ArenaSelfServiceHostingTier
) =>
    subscription.downgrade_blocked_reason === "member_count" &&
    subscription.pending_plan_code === tier;

/** Owner-facing status. Deliberately NOT Stripe's vocabulary: "past_due" means
 *  nothing to a customer, and "trialing" actively misleads — they paid $50. */
const statusCopy = (
    sub: ArenaSubscription
): { label: string; tone: "ok" | "warn" | "bad"; detail: string } => {
    if (sub.in_included_month) {
        return {
            label: "Included month",
            tone: "ok",
            detail: `Running on ${ARENA_INCLUDED_TIER_LABEL}, included with your $50 unlock. Billing starts ${formatDate(sub.included_period_ends_at)}.`,
        };
    }
    switch (sub.status) {
        case "active":
            return sub.cancel_at_period_end
                ? {
                    label: "Ending soon",
                    tone: "warn",
                    detail: `Hosting ends ${formatDate(sub.current_period_ends_at)}. Your Arena becomes read-only then — nothing is deleted.`,
                }
                : {
                    label: "Active",
                    tone: "ok",
                    detail: `Renews ${formatDate(sub.current_period_ends_at)}.`,
                };
        case "past_due":
            return {
                label: "Payment failed",
                tone: "warn",
                detail: `We couldn't charge your card. Your Arena keeps working until ${formatDate(sub.grace_period_ends_at)} — update your card to avoid interruption.`,
            };
        case "unpaid":
        case "canceled":
        case "paused":
            return {
                label: "Paused",
                tone: "bad",
                detail: "This Arena is read-only. Your members, contests and history are all preserved — restart hosting to reopen it.",
            };
        case "incomplete":
        case "incomplete_expired":
            return {
                label: "Not started",
                tone: "bad",
                detail: "Hosting has not been set up for this Arena yet.",
            };
        default:
            return { label: sub.status, tone: "warn", detail: "" };
    }
};

const TONE_CLASS: Record<"ok" | "warn" | "bad", string> = {
    ok: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
    warn: "border-amber-400/40 bg-amber-500/10 text-amber-100",
    bad: "border-red-400/40 bg-red-500/10 text-red-100",
};

export type ArenaSubscriptionPanelProps = { arenaId: string; isOwner: boolean; hosting: ArenaHostingDetails | null };

const ArenaSubscriptionPanel = ({ arenaId, isOwner, hosting }: ArenaSubscriptionPanelProps) => {
    const dispatch = useAppDispatch();
    const { setToast } = useToast();
    const [confirmCancel, setConfirmCancel] = useState(false);

    const {
        subscription,
        subscriptionLoading,
        billingActionLoading,
        billingActionTier,
        billingActionError,
        billingActionMessage,
    } = useAppSelector((state) => state.arena);

    useEffect(() => {
        if (!arenaId || !isOwner) return;
        dispatch(fetchArenaSubscriptionRequest({ arena_id: arenaId }));
    }, [arenaId, isOwner, dispatch]);

    useEffect(() => {
        if (!billingActionError && !billingActionMessage) return;
        setToast({
            id: Date.now(),
            type: billingActionError ? "error" : "success",
            message: billingActionError ?? billingActionMessage ?? "",
            duration: 5000,
        });
        dispatch(clearArenaBillingActionMessage());
        // setToast is a new function each render; including it would make this
        // run after every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billingActionError, billingActionMessage, dispatch]);

    if (!isOwner) return null;

    // Only the Stripe-billed path is rendered here. Arenas still on the legacy
    // simulated records keep the older section below this panel.
    if (!subscription || subscription.billing_mode !== "stripe") {
        return subscriptionLoading ? (
            <p className="text-xs text-white/50">Loading billing…</p>
        ) : null;
    }

    const status = statusCopy(subscription);
    const billedPlan = isSelfService(subscription.plan_code)
        ? getArenaHostingOffer(subscription.plan_code)
        : null;
    const pendingPlan = isSelfService(subscription.pending_plan_code)
        ? getArenaHostingOffer(subscription.pending_plan_code)
        : null;
    // The fourth card. Read from the same catalogue as the other three so its
    // copy cannot drift away from what the tier actually is.
    const customOffer = getArenaHostingOffer("custom");
    const busy = billingActionLoading;

    return (
        <section className="mb-6 flex flex-col gap-4" aria-label="Arena hosting subscription">
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
            <div className={`rounded-xl border px-4 py-3 ${TONE_CLASS[status.tone]}`}>
                <p className="text-sm font-semibold">{status.label}</p>
                {status.detail && <p className="mt-0.5 text-xs opacity-90">{status.detail}</p>}
            </div>

            {/* During the included month these are two different plans, so they
                are shown as two rows rather than one "current plan" line. */}
            <dl className="grid grid-cols-2 gap-3 text-xs">
                {subscription.in_included_month && (
                    <div>
                        <dt className="text-white/50">Running on now</dt>
                        <dd className="mt-0.5 font-semibold text-white">
                            {ARENA_INCLUDED_TIER_LABEL} · included
                        </dd>
                    </div>
                )}
                <div>
                    <dt className="text-white/50">
                        {subscription.in_included_month ? "Starts after included month" : "Your plan"}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-white">
                        {billedPlan ? `${billedPlan.name} · ${billedPlan.priceLabel}/mo` : "—"}
                    </dd>
                </div>
                {!subscription.in_included_month && (
                    <div>
                        <dt className="text-white/50">
                            {subscription.cancel_at_period_end ? "Ends" : "Next renewal"}
                        </dt>
                        <dd className="mt-0.5 font-semibold text-white">
                            {formatDate(subscription.current_period_ends_at)}
                        </dd>
                    </div>
                )}
            </dl>

            {pendingPlan && (
                <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80">
                    Scheduled: moving to <strong className="text-white">{pendingPlan.name}</strong> on{" "}
                    {formatDate(subscription.pending_plan_effective_at)}.
                    {subscription.downgrade_blocked_reason === "member_count" && (
                        <span className="mt-1 block text-amber-200">
                            We kept your current plan — this Arena has more members than{" "}
                            {pendingPlan.name} allows. Remove members to complete the change.
                        </span>
                    )}
                </p>
            )}

            {/* ------------------------------------------------------------------
                Plan switcher — the MVP's ArenaTierGrid card layout
                (gotlocks.app_mvp2/components/arenas/ArenaTierGrid.tsx).

                FOUR cards, not three: the three self-service tiers plus the
                contact-only Custom, drawn dashed because it is the one card that
                cannot be bought here. Leaving it out made 250+ look like a
                ceiling rather than the point where the conversation starts.

                Only the CARDS are the MVP's. The per-plan timing copy underneath
                is ours and stays — "change plan" genuinely means three different
                things depending on where the Arena sits in its cycle, and the
                MVP's simulator has no equivalent to say.
               ------------------------------------------------------------------ */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                    {subscription.in_included_month ? "Plan after included month" : "Change plan"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {SELF_SERVICE_ARENA_TIERS.map((tier) => {
                        const offer = getArenaHostingOffer(tier);
                        const isCurrent = subscription.plan_code === tier;
                        const preview = planChangePreview({
                            tier,
                            offerName: offer.name,
                            subscription,
                            hostingStatus: hosting?.status ?? null,
                            periodEndsLabel: formatDate(subscription.current_period_ends_at),
                        });
                        const showAction = preview.kind !== "no_change";
                        const working = billingActionTier === tier && busy;

                        return (
                            <article
                                key={tier}
                                className={`rounded-xl border p-4 ${isCurrent
                                    ? "border-violet-300/45 bg-violet-500/10"
                                    : "border-white/10 bg-white/[0.03]"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-white">{offer.name}</p>
                                    {isCurrent ? (
                                        <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-200">
                                            Current
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm text-gray-300">
                                    {offer.priceLabel}{" "}
                                    <span className="text-xs text-gray-500">/ month</span>
                                </p>
                                <p className="mt-3 text-xs leading-5 text-gray-500">
                                    {offer.limits.participatingMemberLimit} members ·{" "}
                                    {offer.limits.managerLimit} managers ·{" "}
                                    {offer.limits.activeContestLimit} contests
                                </p>
                                {showAction ? (
                                    <p
                                        className={`mt-2 text-[11px] leading-4 ${preview.allowed ? "text-gray-500" : "text-amber-200"
                                            }`}
                                    >
                                        {preview.summary}
                                    </p>
                                ) : null}
                                {showAction ? (
                                    <button
                                        type="button"
                                        disabled={busy || !preview.allowed}
                                        onClick={() =>
                                            dispatch(
                                                changeArenaPlanRequest({ arena_id: arenaId, tier })
                                            )
                                        }
                                        className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-violet-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {working ? "Working…" : preview.actionLabel}
                                    </button>
                                ) : null}
                            </article>
                        );
                    })}

                    {/* The fourth card. Contact-only by design — it has no price to
                        charge and no limits to render, so it shows its summary and
                        a way to start the conversation. */}
                    <article className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
                        <p className="font-semibold text-white">{customOffer.name}</p>
                        <p className="mt-1 text-sm text-gray-400">
                            {customOffer.priceLabel} · {customOffer.cadenceLabel}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-gray-500">
                            {customOffer.summary}
                        </p>
                        <a
                            href={getArenaCustomContactHref()}
                            className="mt-3 inline-block rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-violet-300/40 hover:text-white"
                        >
                            Contact gotLocks
                        </a>
                    </article>
                </div>
            </div>

            <h2
                id="hosting-controls-title"
                className="text-lg font-semibold text-[var(--app-text)]"
            >
                Hosting controls
            </h2>

            {/* Card + cancellation */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => dispatch(openArenaBillingPortalRequest({ arena_id: arenaId }))}
                    className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
                >
                    Manage card &amp; receipts
                </button>

                {subscription.cancel_at_period_end ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => dispatch(resumeArenaHostingRequest({ arena_id: arenaId }))}
                        className="rounded-xl border border-emerald-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-40"
                    >
                        Keep hosting
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmCancel(true)}
                        className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/5 disabled:opacity-40"
                    >
                        Cancel hosting
                    </button>
                )}
            </div>

            {confirmCancel && (
                <div
                    role="alertdialog"
                    aria-label="Cancel hosting"
                    className="rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white"
                >
                    <p className="font-semibold">Cancel hosting for this Arena?</p>
                    <p className="mt-1 text-xs text-white/70">
                        You keep everything until{" "}
                        {formatDate(subscription.current_period_ends_at)} — you already paid for it.
                        After that the Arena becomes read-only. Nothing is deleted, and you can
                        restart any time. Your $50 unlock is permanent and is not charged again.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setConfirmCancel(false);
                                dispatch(cancelArenaHostingRequest({ arena_id: arenaId }));
                            }}
                            className="rounded-lg border border-red-300/40 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-40"
                        >
                            {busy ? "Working…" : "Cancel at period end"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmCancel(false)}
                            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                        >
                            Keep hosting
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ArenaSubscriptionPanel;
