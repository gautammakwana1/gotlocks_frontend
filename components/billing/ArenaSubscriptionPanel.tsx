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
    getArenaUnlockOffer,
    SELF_SERVICE_ARENA_TIERS,
} from "@/components/billing/arena";
import type { ArenaSelfServiceHostingTier } from "@/components/billing/arena";
import type { ArenaHostingDetails, ArenaSubscription } from "@/lib/interfaces/interfaces";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import Link from "next/link";
import {
    SettingsActionBar,
    SettingsSection,
    settingsPrimaryButtonClassName,
    settingsSecondaryButtonClassName,
} from "@/components/settings/SettingsUI";

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

    /* ------------------------------------------------------------------
       RENEWAL COPY. The MVP's "Renewal controls" blurb, re-derived from the
       Stripe subscription instead of its simulated hosting row. Four states,
       and each one has to answer the same two questions: what happens next,
       and what happens to the Arena afterwards.

       The unlock fee is read from the offer rather than typed, so this copy
       cannot drift away from what the unlock actually costs.
       ------------------------------------------------------------------ */
    const unlockPriceLabel = getArenaUnlockOffer().priceLabel;
    const renewalEndsLabel = formatDate(
        subscription.cancel_at ?? subscription.current_period_ends_at
    );
    const readOnlyTail =
        "The Arena becomes read-only: you cannot create or run contests, accept entries, add members, or make other changes. Your Arena, members, standings, and history stay saved, and you can restart a monthly tier later without paying the " +
        unlockPriceLabel +
        " permanent unlock fee again.";

    const renewalDescription = subscription.cancel_at_period_end
        ? `Monthly renewal is off. There will be no further charges after ${renewalEndsLabel}. ${readOnlyTail} Choose Keep plan active to continue.`
        : subscription.in_included_month
            ? `Your included ${ARENA_INCLUDED_TIER_LABEL} month is active through ${formatDate(
                subscription.included_period_ends_at
            )}. Turn off renewal to prevent the first monthly charge. ${readOnlyTail}`
            : subscription.status === "active"
                ? `Turn off monthly renewal to end your Arena plan on ${renewalEndsLabel}. ${readOnlyTail}`
                : `Your Arena plan is inactive and the Arena is read-only. Your Arena, members, standings, and history remain saved. Choose a tier above whenever you are ready to return; your permanent unlock is still valid, so you will not pay the ${unlockPriceLabel} unlock fee again.`;

    const canTurnOffRenewal =
        !subscription.cancel_at_period_end &&
        (subscription.status === "active" || subscription.in_included_month);

    return (
        <>
            {/* THE MVP'S "Arena plan" SECTION. Same split layout, same one-row-per-
                tier list — not the four-across grid this panel used to draw, which
                made the current plan hard to pick out of the row. */}
            <SettingsSection
                title="Arena plan"
                description="Choose the capacity and monthly price for this Arena."
                bodyClassName="space-y-4"
                layout="split"
            >
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
                            {subscription.in_included_month
                                ? "Starts after included month"
                                : "Your plan"}
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
                        Scheduled: moving to{" "}
                        <strong className="text-white">{pendingPlan.name}</strong> on{" "}
                        {formatDate(subscription.pending_plan_effective_at)}.
                        {subscription.downgrade_blocked_reason === "member_count" && (
                            <span className="mt-1 block text-amber-200">
                                We kept your current plan — this Arena has more members than{" "}
                                {pendingPlan.name} allows. Remove members to complete the change.
                            </span>
                        )}
                    </p>
                )}

                <div className="space-y-5">
                    {SELF_SERVICE_ARENA_TIERS.map((tier) => {
                        const offer = getArenaHostingOffer(tier);
                        const isCurrent = subscription.plan_code === tier;
                        const isScheduled =
                            !isCurrent && subscription.pending_plan_code === tier;
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
                                className={`rounded-xl px-2 py-3 sm:px-4 ${isCurrent ? "bg-violet-500/[0.07] shadow-sm" : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-semibold text-white">{offer.name}</h3>
                                    {isCurrent ? (
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                                            current
                                        </span>
                                    ) : isScheduled ? (
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                                            {subscription.in_included_month
                                                ? "starts after included month"
                                                : "scheduled next period"}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm text-gray-300">
                                    {offer.priceLabel}/month
                                </p>
                                <p className="mt-3 text-xs leading-5 text-gray-500">
                                    {offer.summary}
                                </p>
                                {showAction ? (
                                    <>
                                        <p
                                            className={`mt-2 text-xs leading-5 ${preview.allowed ? "text-gray-500" : "text-amber-200"
                                                }`}
                                        >
                                            {preview.summary}
                                        </p>
                                        {/* POST /group/arena/change-plan — the recurring-plan
                                            update. Upgrades take effect immediately;
                                            downgrades are scheduled for the period
                                            boundary, which `preview.summary` says. */}
                                        <button
                                            type="button"
                                            disabled={busy || !preview.allowed}
                                            onClick={() =>
                                                dispatch(
                                                    changeArenaPlanRequest({ arena_id: arenaId, tier })
                                                )
                                            }
                                            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-200 underline underline-offset-4 transition hover:text-violet-100 disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline"
                                        >
                                            {working ? "Working…" : preview.actionLabel}
                                        </button>
                                    </>
                                ) : null}
                            </article>
                        );
                    })}

                    {/* The fourth tier. Contact-only by design — it has no price to
                        charge here, so it shows its summary and a way to start the
                        conversation. Leaving it out made 250+ look like a ceiling
                        rather than the point where the conversation starts. */}
                    <article className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-2 py-3 sm:px-4">
                        <h3 className="font-semibold text-white">{customOffer.name}</h3>
                        <p className="mt-1 text-sm text-gray-300">{customOffer.priceLabel}</p>
                        <p className="mt-3 text-xs leading-5 text-gray-500">
                            {customOffer.summary}
                        </p>
                        <a
                            href={getArenaCustomContactHref()}
                            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-200 underline underline-offset-4 transition hover:text-violet-100"
                        >
                            Contact gotLocks
                        </a>
                    </article>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Renewal controls"
                description={renewalDescription}
                bodyClassName="space-y-4"
                layout="split"
            >
                {canTurnOffRenewal ? (
                    <SettingsActionBar>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmCancel(true)}
                            className="min-h-11 rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Turn off monthly renewal
                        </button>
                    </SettingsActionBar>
                ) : null}

                {subscription.cancel_at_period_end ? (
                    /* POST /group/arena/resume-hosting — clears cancel_at_period_end
                       so the subscription renews normally again. */
                    <SettingsActionBar>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => dispatch(resumeArenaHostingRequest({ arena_id: arenaId }))}
                            className="min-h-11 rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? "Working…" : "Keep plan active"}
                        </button>
                    </SettingsActionBar>
                ) : null}

                {confirmCancel && (
                    <div
                        role="alertdialog"
                        aria-label="Turn off monthly renewal"
                        className="rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white"
                    >
                        <p className="font-semibold">Turn off renewal for this Arena?</p>
                        <p className="mt-1 text-xs leading-5 text-white/70">
                            You keep everything until {renewalEndsLabel} — you already paid for it.
                            After that the Arena becomes read-only. Nothing is deleted, and you can
                            restart any time. Your {unlockPriceLabel} unlock is permanent and is not
                            charged again.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {/* POST /group/arena/cancel-hosting — sets
                                cancel_at_period_end on the Stripe subscription. */}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                    setConfirmCancel(false);
                                    dispatch(cancelArenaHostingRequest({ arena_id: arenaId }));
                                }}
                                className="min-h-11 rounded-xl border border-red-300/40 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-40"
                            >
                                {busy ? "Working…" : "Turn off renewal"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmCancel(false)}
                                className="min-h-11 rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                            >
                                Keep plan active
                            </button>
                        </div>
                    </div>
                )}
            </SettingsSection>

            {/* NOT IN THE MVP — it has no real payments, so it has no card to
                manage and no receipts to hand out. Both live with Stripe here, so
                this is the one place that can reach them. */}
            <SettingsSection
                title="Payment method and receipts"
                description="Your card, invoices, and receipts for this Arena are handled by Stripe."
                bodyClassName="space-y-4"
                layout="split"
            >
                <SettingsActionBar>
                    <Link
                        href="/app-settings/transaction-history"
                        className={settingsSecondaryButtonClassName}
                    >
                        View payment history
                    </Link>
                    {/* POST /group/arena/billing-portal — returns a Stripe-hosted
                        portal URL for card changes, invoices and receipts. */}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => dispatch(openArenaBillingPortalRequest({ arena_id: arenaId }))}
                        className={settingsPrimaryButtonClassName}
                    >
                        {busy ? "Opening…" : "Manage card & receipts"}
                    </button>
                </SettingsActionBar>
            </SettingsSection>
        </>
    );
};

export default ArenaSubscriptionPanel;
