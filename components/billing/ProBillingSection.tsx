"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { SettingsActionBar, SettingsSection } from "@/components/settings/SettingsUI";
import {
    getProLifetimeOffer,
    PRO_PLAN_SUMMARY,
    type ProLifetimePlanViewModel,
} from "@/lib/billing/proLifetime";
import type { ProLifetimeEntitlement } from "@/lib/interfaces/interfaces";

/* ============================================================================
 * THE LEAGUE PLAN PANEL — ported from the MVP's components/billing/ProBillingSection.
 *
 * The MVP collapsed three stacked blocks (a gradient hero, a Free-vs-Pro card
 * pair, and a benefits disclosure) into ONE "Compare League plans" section that
 * reads top to bottom: what you have now, then what upgrading adds. The two
 * plans are separated by a rule rather than sitting in competing cards, because
 * only one of them is a choice — the other is a statement of fact.
 *
 * WHAT IS NOT THE MVP'S, and stays: this account's Pro Lifetime purchase is a
 * REAL Stripe checkout, not a mocked one. So the payment-history link survives
 * (the MVP has no receipts to link to), the founding-offer pricing note
 * survives, and the purchase reference is rendered verbatim rather than through
 * the MVP's `formatPurchaseReference` hash — a real provider reference is the
 * string support asks for, and a "GL-XXXXXXX" token cannot be quoted to Stripe.
 * ========================================================================== */

const PlanHeading = ({
    eyebrow,
    name,
    meta,
}: {
    eyebrow: string;
    name: string;
    meta: string;
}) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                {eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{name}</h3>
        </div>
        <span className="shrink-0 text-sm font-semibold text-sky-100">{meta}</span>
    </div>
);

const ProBenefitsList = ({ entitlements }: { entitlements: readonly string[] }) => (
    <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
            Pro benefits
        </h4>
        <ul aria-label="Pro benefits" className="mt-3 space-y-2.5 text-sm text-gray-300">
            {entitlements.map((label) => (
                <li key={label} className="flex gap-3">
                    <span className="text-sky-200" aria-hidden="true">
                        ✓
                    </span>
                    <span>{label}</span>
                </li>
            ))}
        </ul>
    </div>
);

export const ProBillingSection = ({
    planView,
    entitlement,
    ownedLeagueCount,
    ownedLeagueLimit,
}: {
    planView: ProLifetimePlanViewModel;
    entitlement: ProLifetimeEntitlement | null | undefined;
    ownedLeagueCount: number;
    ownedLeagueLimit: number;
}) => {
    const offer = planView.offer;
    const owned = planView.status === "owned";
    const foundingOffer = getProLifetimeOffer("founding");
    const standardOffer = getProLifetimeOffer("standard");
    const percentage =
        ownedLeagueLimit > 0
            ? Math.min(100, Math.round((ownedLeagueCount / ownedLeagueLimit) * 100))
            : 0;

    return (
        <div className="league-theme">
            <SettingsSection
                title="Compare League plans"
                description={
                    owned
                        ? "Review your organizer limits, Pro benefits, and purchase details."
                        : "See what's included in your Free plan and what Pro Lifetime adds."
                }
                layout="split"
            >
                <div
                    className={owned ? undefined : "divide-y divide-white/10"}
                    aria-label="League plan comparison"
                >
                    <div className={owned ? undefined : "pb-7"} aria-label="Current League plan">
                        <PlanHeading
                            eyebrow="Current plan"
                            name={planView.currentPlanName}
                            meta={
                                planView.currentPlanBadge === "starter" ? "Starter" : "Permanent unlock"
                            }
                        />

                        <div
                            className="mt-5"
                            aria-label={`${ownedLeagueCount} of ${ownedLeagueLimit} hosted League slots used`}
                        >
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-white">Organizer slots</span>
                                <span className="text-sky-100">
                                    {ownedLeagueCount} of {ownedLeagueLimit} hosted
                                </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                <span
                                    className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-[width] motion-reduce:transition-none"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>

                        {owned ? (
                            <>
                                <p className="mt-5 text-sm font-semibold text-emerald-200">
                                    Pro Lifetime is permanently owned. No recurring League plan payment
                                    is required.
                                </p>
                                <ProBenefitsList entitlements={offer.entitlements} />
                                {entitlement ? (
                                    <dl className="mt-5 grid gap-4 border-t border-white/10 pt-5 text-xs text-gray-400 sm:grid-cols-2">
                                        <div>
                                            <dt className="uppercase tracking-[0.12em]">purchased</dt>
                                            <dd className="mt-1 font-semibold normal-case text-white">
                                                {offer.priceLabel} one time ·{" "}
                                                {entitlement.purchasedAt.slice(0, 10)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="uppercase tracking-[0.12em]">order reference</dt>
                                            <dd className="mt-1 break-all font-mono normal-case text-white">
                                                {entitlement.simulatedPaymentReference}
                                            </dd>
                                        </div>
                                    </dl>
                                ) : (
                                    /* No entitlement RECORD does not mean no receipt: this
                                       account bought Pro through Stripe, and the charge is
                                       in payment history below. Saying "no receipt yet"
                                       here would contradict it. */
                                    <p className="mt-5 border-t border-white/10 pt-5 text-xs text-gray-500">
                                        Your purchase receipt is in payment history.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300">
                                {planView.currentPlanSummary}
                            </p>
                        )}

                        {/* Stripe-only, so the MVP has no counterpart: every League
                            Pro charge here is a real payment with a real receipt. */}
                        <div className="mt-5 border-t border-white/10 pt-4">
                            <Link
                                href="/app-settings/transaction-history"
                                className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
                            >
                                View payment history <AnimatedArrow direction="right" />
                            </Link>
                        </div>
                    </div>

                    {!owned ? (
                        <article aria-label="Pro Lifetime upgrade" className="pt-7">
                            <PlanHeading
                                eyebrow="Upgrade option"
                                name="Pro Lifetime"
                                meta={`${offer.priceLabel} once`}
                            />
                            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300">
                                {PRO_PLAN_SUMMARY}
                            </p>
                            <ProBenefitsList entitlements={offer.entitlements} />
                            {/* Which price is on offer right now, and why it may change.
                                Kept from the previous layout — the founding window is
                                real pricing here, not prototype data. */}
                            <p className="mt-4 text-xs leading-5 text-gray-500">
                                {offer.kind === "founding"
                                    ? `${foundingOffer.priceLabel} one time during the founding offer; ${standardOffer.priceLabel} afterward.`
                                    : `${standardOffer.priceLabel} one time. The founding offer has ended.`}
                            </p>
                            <SettingsActionBar className="mt-5">
                                {/* Routes to the full-page review instead of a confirm
                                    dialog: the next step hands the browser to Stripe,
                                    and a modal has nothing to return to. */}
                                <Link
                                    href="/app-settings/plan/league/upgrade"
                                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-300/50 bg-sky-500/20 px-5 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                                >
                                    Review Pro upgrade
                                </Link>
                            </SettingsActionBar>
                        </article>
                    ) : null}
                </div>
            </SettingsSection>
        </div>
    );
};

export default ProBillingSection;
