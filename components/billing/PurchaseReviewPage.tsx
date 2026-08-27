"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

export type PurchaseReviewAccent = "league" | "arena";

/**
 * Where the confirm button is in the checkout handoff.
 *
 * There is no in-page "success" for a card purchase: confirming creates a Stripe
 * Checkout Session and hands the browser to Stripe, which returns to
 * /app-settings/plan?checkout=success where the existing overlay polls for the
 * webhook. `submitting` therefore means "leaving this page", not "charging".
 *
 * `owned` is the one terminal state this page renders itself — the product is
 * already unlocked, so there is nothing to buy and no redirect to make.
 */
export type PurchaseReviewStatus = "idle" | "submitting" | "owned" | "error";

export type PurchaseReviewOffer = {
    name: string;
    priceLabel: string;
    cadenceLabel: string;
};

export type PurchaseReviewPageProps = {
    accent: PurchaseReviewAccent;
    backHref: string;
    backLabel?: string;
    eyebrow: string;
    title: string;
    description: string;
    offer: PurchaseReviewOffer;
    dueNowLabel: string;
    effectiveLabel?: string | null;
    benefits?: readonly string[];
    children?: ReactNode;
    status: PurchaseReviewStatus;
    errorMessage?: string | null;
    ownedTitle?: string;
    ownedMessage?: string | null;
    confirmLabel: string;
    submittingLabel?: string;
    onConfirm: () => void;
    continueHref: string;
    continueActionLabel: string;
};

const ACCENT = {
    league: {
        eyebrow: "text-sky-200",
        border: "border-sky-300/25",
        panel: "bg-sky-500/10",
        button:
            "border-sky-300/55 bg-sky-500/25 text-sky-50 hover:bg-sky-500/35 focus-visible:outline-sky-200",
    },
    arena: {
        eyebrow: "text-violet-200",
        border: "border-violet-300/25",
        panel: "bg-violet-500/10",
        button:
            "border-violet-300/55 bg-violet-500/25 text-violet-50 hover:bg-violet-500/35 focus-visible:outline-violet-200",
    },
} as const;

/**
 * Full-page purchase review, replacing the confirm-in-a-modal flow.
 *
 * A page rather than a dialog because the confirm step navigates to an external
 * payment host: a modal that vanishes mid-redirect gives the user nothing to go
 * back to, and browser Back from Stripe would land behind a dialog that has
 * already reset. A route is linkable, restorable, and survives the round trip.
 */
export const PurchaseReviewPage = ({
    accent,
    backHref,
    backLabel = "Back",
    eyebrow,
    title,
    description,
    offer,
    dueNowLabel,
    effectiveLabel,
    benefits = [],
    children,
    status,
    errorMessage,
    ownedTitle = "Already unlocked",
    ownedMessage,
    confirmLabel,
    submittingLabel = "Redirecting to secure checkout…",
    onConfirm,
    continueHref,
    continueActionLabel,
}: PurchaseReviewPageProps) => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const tone = ACCENT[accent];
    const submitting = status === "submitting";
    const owned = status === "owned";

    // Move focus to the heading on mount and again when the panel swaps to the
    // owned state, so the change is announced instead of silently replacing the
    // content under a focus ring that is now on a detached button.
    useEffect(() => {
        headingRef.current?.focus();
    }, [owned]);

    if (owned) {
        return (
            <div className="mx-auto w-full max-w-2xl space-y-6">
                <section
                    role="status"
                    className={`rounded-3xl border ${tone.border} ${tone.panel} p-6 sm:p-8`}
                >
                    <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${tone.eyebrow}`}
                    >
                        {eyebrow}
                    </p>
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-3 text-2xl font-semibold tracking-tight text-white outline-none sm:text-3xl"
                    >
                        {ownedTitle}
                    </h1>
                    {ownedMessage ? (
                        <p className="mt-3 max-w-xl text-sm leading-6 text-gray-200">
                            {ownedMessage}
                        </p>
                    ) : null}
                    <Link
                        href={continueHref}
                        className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${tone.button}`}
                    >
                        {continueActionLabel}
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="space-y-4">
                {/* Inert while redirecting: navigating away mid-handoff would strand
                    a Checkout Session the user is still being sent to. */}
                {submitting ? (
                    <span
                        className="inline-flex min-h-11 items-center text-sm text-gray-500"
                        aria-hidden
                    >
                        {backLabel}
                    </span>
                ) : (
                    <Link
                        href={backHref}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-gray-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <AnimatedArrow direction="left" />&nbsp;{backLabel}
                    </Link>
                )}
                <div>
                    <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${tone.eyebrow}`}
                    >
                        {eyebrow}
                    </p>
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-2 text-2xl font-semibold tracking-tight text-white outline-none sm:text-3xl"
                    >
                        {title}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">{description}</p>
                </div>
            </header>

            <section
                aria-labelledby="purchase-summary-title"
                className={`overflow-hidden rounded-3xl border ${tone.border} bg-white/[0.035]`}
            >
                <div className={`border-b ${tone.border} ${tone.panel} p-5 sm:p-6`}>
                    <p id="purchase-summary-title" className="text-sm font-semibold text-white">
                        {offer.name}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        {dueNowLabel}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                        due now
                    </p>
                </div>

                <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            product price
                        </dt>
                        <dd className="mt-1 font-semibold text-gray-100">
                            {offer.priceLabel} {offer.cadenceLabel}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            charge type
                        </dt>
                        <dd className="mt-1 font-semibold text-gray-100">
                            {offer.cadenceLabel === "one time" ? "One-time unlock" : "Recurring hosting"}
                        </dd>
                    </div>
                    {effectiveLabel ? (
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                effective
                            </dt>
                            <dd className="mt-1 font-semibold text-gray-100">{effectiveLabel}</dd>
                        </div>
                    ) : null}
                </dl>

                {benefits.length > 0 ? (
                    <div className="border-t border-white/10 p-5 sm:p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                            Included
                        </h2>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-200">
                            {benefits.map((benefit) => (
                                <li key={benefit} className="flex gap-2">
                                    <span className={tone.eyebrow} aria-hidden>
                                        ✓
                                    </span>
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {children ? (
                    <div className="border-t border-white/10 p-5 sm:p-6">{children}</div>
                ) : null}
            </section>

            {status === "error" && errorMessage ? (
                <p
                    role="alert"
                    className="rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm font-semibold text-red-100"
                >
                    {errorMessage}
                </p>
            ) : null}

            <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                aria-busy={submitting}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${tone.button}`}
            >
                {submitting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        {submittingLabel}
                    </>
                ) : (
                    confirmLabel
                )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[var(--text-muted)]">
                <ShieldCheck size={13} aria-hidden /> Secured by Stripe · your card details never
                touch gotLocks
            </p>
        </div>
    );
};

export default PurchaseReviewPage;
