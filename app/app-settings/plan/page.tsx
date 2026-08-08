"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArenaBillingSection from "@/components/billing/ArenaBillingSection";
import { getLeaguePlanCapacity, normalizeUserPlan } from "@/lib/groups/limits";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { PlanDowngrade, PlanState } from "@/lib/interfaces/interfaces";
import { clearPlanOverviewMessage, clearUpdateUserPlanMessage, fetchPlanOverviewRequest, updateUserPlanRequest } from "@/lib/redux/slices/planSlice";
import { ArrowLeft, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { FREE_PLAN_SUMMARY, getProLifetimeOffer, getProLifetimePlanViewModel, PRO_PLAN_SUMMARY } from "@/lib/billing/proLifetime";

type PaymentPhase = "processing" | "confirmed" | "timeout" | null;

// League organizer access and Arena hosting are separate products with separate
// billing, so the page splits into two panels selected by ?product=.
type BillingProduct = "league" | "arena";

type RootState = {
    plan: PlanState;
};

const fieldClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20";

const planSummary = {
    free: "Host up to 3 leagues with 10 members and 3 active contests each.",
    pro: "Host unlimited leagues, create up to 3 Arenas, and run up to 6 active contests per group.",
};

const BILLING_TABS: { id: BillingProduct; label: string; href: string }[] = [
    { id: "league", label: "League Plan", href: "/app-settings/plan?product=league" },
    { id: "arena", label: "Arena Hosting", href: "/app-settings/plan?product=arena" },
];

const AppPlanContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const product: BillingProduct =
        searchParams.get("product") === "arena" ? "arena" : "league";
    const [downgradeOpen, setDowngradeOpen] = useState(false);
    const [downgradeConfirmation, setDowngradeConfirmation] = useState("");
    const [checkoutReturn, setCheckoutReturn] = useState<null | "success" | "cancel">(null);
    const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>(null);

    useEffect(() => {
        if (!currentUser) {
            router.replace("/landing-page");
        }
    }, [currentUser, router]);

    const { overview, error, loading, message } = useSelector((state: RootState) => state.plan);

    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchPlanOverviewRequest());
    }, [currentUser, dispatch]);

    useEffect(() => {
        if (!loading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message,
                duration: 3000
            });
            dispatch(clearUpdateUserPlanMessage());
        }
        if (!loading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            });
            dispatch(clearUpdateUserPlanMessage());
        }
    }, [currentUser, dispatch, error, loading, message]);

    useEffect(() => {
        if (!error) return;
        setToast({ id: Date.now(), type: "error", message: error, duration: 3000 });
        dispatch(clearPlanOverviewMessage());
    }, [error, setToast, dispatch]);

    const plan = normalizeUserPlan(overview?.plan ?? currentUser?.plan);
    const planView = getProLifetimePlanViewModel({
        plan: plan,
        offerKind: currentUser?.proLifetimeOfferKind,
        entitlement: currentUser?.proLifetimeEntitlement,
    });
    const foundingOffer = getProLifetimeOffer("founding");
    const standardOffer = getProLifetimeOffer("standard");
    const availableOffer = getProLifetimeOffer(currentUser?.proLifetimeOfferKind);
    const offer = planView.offer;

    const planRef = useRef(plan);
    useEffect(() => {
        planRef.current = plan;
    }, [plan]);
    const priceLabel = overview?.pricing?.label ?? "One-time unlock";
    const downgradeCheck = overview?.downgrade
        ? { allowed: overview.downgrade.allowed, error: overview.downgrade.error }
        : { allowed: false, error: null as string | null };
    const downgradeBlockers: PlanDowngrade["blockers"] = overview?.downgrade.blockers ?? {
        ownedArenas: [],
        proHostedLeagues: [],
        ownedLeagueCount: 0,
        maxFreeLeagues: 3,
    };

    const proOwned = planView.status === "owned";
    const planLimit = getLeaguePlanCapacity(plan);
    const ownedLeagueCount = downgradeBlockers.ownedLeagueCount;
    const ownedLeagueLimit = plan === "pro" ? planLimit.maxOwnedLeagues : downgradeBlockers.maxFreeLeagues;
    const leagueSlotPercent =
        ownedLeagueLimit && ownedLeagueLimit > 0
            ? Math.min(100, Math.round((ownedLeagueCount / ownedLeagueLimit) * 100))
            : 0;

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get("checkout");
        if (checkout === "success") {
            setCheckoutReturn("success");
            setPaymentPhase("processing");
            window.history.replaceState({}, "", "/app-settings/plan");
        } else if (checkout === "cancel") {
            setCheckoutReturn("cancel");
            window.history.replaceState({}, "", "/app-settings/plan");
        }
    }, []);

    useEffect(() => {
        if (checkoutReturn !== "cancel") return;
        setToast({
            id: Date.now(),
            type: "error",
            message: "Checkout canceled. You have not been charged.",
            duration: 4000,
        });
        setCheckoutReturn(null);
    }, [checkoutReturn, setToast]);

    // Successful checkout — the backend webhook flips the plan to Pro, which can
    // lag the browser redirect by a few seconds. While the overlay shows, poll the
    // overview until Pro; if it hasn't confirmed after a while, fall to "timeout".
    useEffect(() => {
        if (paymentPhase !== "processing" || !currentUser) return;
        const MAX_TRIES = 6;
        let tries = 0;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const poll = () => {
            if (cancelled || planRef.current === "pro") return;
            dispatch(fetchPlanOverviewRequest());
            tries += 1;
            if (tries < MAX_TRIES) {
                timer = setTimeout(poll, 2000);
            } else {
                // Let the final fetch resolve, then surface the "taking a moment" state.
                timer = setTimeout(() => {
                    if (!cancelled && planRef.current !== "pro") setPaymentPhase("timeout");
                }, 2500);
            }
        };
        poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [paymentPhase, currentUser, dispatch]);

    // Once the polled overview reports Pro, show the confirmed state, then dismiss.
    useEffect(() => {
        if (checkoutReturn !== "success" || plan !== "pro") return;
        setPaymentPhase("confirmed");
        const timer = setTimeout(() => {
            setPaymentPhase(null);
            setCheckoutReturn(null);
        }, 1900);
        return () => clearTimeout(timer);
    }, [checkoutReturn, plan]);

    if (!currentUser) return null;

    const needsDowngradeConfirmation = plan === "pro" && downgradeCheck.allowed;
    const canConfirmDowngrade =
        needsDowngradeConfirmation && downgradeConfirmation.trim() === "FREE";

    const handleRetryConfirm = () => {
        setPaymentPhase("processing");
    };

    const handleDismissPayment = () => {
        setPaymentPhase(null);
        setCheckoutReturn(null);
        dispatch(fetchPlanOverviewRequest());
    };

    const handleDowngrade = () => {
        dispatch(updateUserPlanRequest({ plan: "free" }));
        setDowngradeOpen(false);
        setDowngradeConfirmation("");
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            {paymentPhase && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
                    <div
                        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0b0f] p-8 text-center shadow-2xl"
                        style={{ animation: "homeFadeUp 240ms ease-out both" }}
                        role="status"
                        aria-live="polite"
                    >
                        {paymentPhase === "processing" && (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/10">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                                </div>
                                <h2 className="mt-5 text-lg font-semibold text-white">Payment successful</h2>
                                <p className="mt-2 text-sm leading-6 text-gray-300">
                                    Updating your plan and unlocking Founding Pro. This only takes a moment…
                                </p>
                                <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70 [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70 [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70" />
                                </div>
                            </>
                        )}

                        {paymentPhase === "confirmed" && (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/15">
                                    <CheckCircle2 className="h-9 w-9 text-emerald-300" />
                                </div>
                                <h2 className="mt-5 text-lg font-semibold text-white">
                                    You&apos;re Founding Pro! 🎉
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-300">
                                    Your plan is active. Enjoy unlimited leagues and Arenas.
                                </p>
                            </>
                        )}

                        {paymentPhase === "timeout" && (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/10">
                                    <Clock className="h-8 w-8 text-amber-200" />
                                </div>
                                <h2 className="mt-5 text-lg font-semibold text-white">Payment received</h2>
                                <p className="mt-2 text-sm leading-6 text-gray-300">
                                    Your payment went through. Your plan is taking a moment to update — it&apos;ll
                                    appear shortly.
                                </p>
                                <div className="mt-5 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleRetryConfirm}
                                        className="w-full rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/25"
                                    >
                                        Check again
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDismissPayment}
                                        className="w-full rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-gray-200 transition hover:border-white/20 hover:bg-white/5"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    <span className="flex items-center gap-2">
                        <ArrowLeft size={14} /> account settings
                    </span>
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Plan and billing
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    League organizer access and Arena hosting are separate products with separate
                    billing.
                </p>
            </header>

            <nav
                role="tablist"
                aria-label="Billing products"
                className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1"
            >
                {BILLING_TABS.map((tab) => {
                    const active = product === tab.id;
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            role="tab"
                            id={`billing-${tab.id}-tab`}
                            aria-controls="billing-product-panel"
                            aria-selected={active}
                            tabIndex={active ? 0 : -1}
                            onKeyDown={(event) => {
                                if (
                                    event.key !== "ArrowLeft" &&
                                    event.key !== "ArrowRight" &&
                                    event.key !== "Home" &&
                                    event.key !== "End"
                                ) {
                                    return;
                                }
                                event.preventDefault();
                                const nextProduct: BillingProduct =
                                    event.key === "ArrowLeft" || event.key === "Home"
                                        ? "league"
                                        : "arena";
                                document.getElementById(`billing-${nextProduct}-tab`)?.focus();
                                router.push(`/app-settings/plan?product=${nextProduct}`);
                            }}
                            className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${active
                                ? tab.id === "league"
                                    ? "bg-sky-500/15 text-sky-100 focus-visible:outline-sky-200"
                                    : "bg-violet-500/15 text-violet-100 focus-visible:outline-violet-200"
                                : "text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-white"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            <div
                id="billing-product-panel"
                role="tabpanel"
                aria-labelledby={`billing-${product}-tab`}
                className="space-y-6"
            >
                {product === "arena" ? <ArenaBillingSection /> : (
                    <>
                        <section aria-labelledby="league-plan-title" className="space-y-5">
                            <div className="rounded-3xl border border-sky-300/20 bg-[linear-gradient(145deg,rgba(14,165,233,0.13),rgba(255,255,255,0.025))] p-5 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                                            League Plan
                                        </p>
                                        <h2
                                            id="league-plan-title"
                                            className="mt-2 text-xl font-semibold text-white"
                                        >
                                            {planView.currentPlanName}
                                        </h2>
                                    </div>
                                    <span className="rounded-full border border-sky-200/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                                        {planView.currentPlanBadge}
                                    </span>
                                </div>

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
                                            style={{ width: `${leagueSlotPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300">
                                    {planView.currentPlanSummary}
                                </p>

                                {!proOwned ? (
                                    // Routes to the full-page review instead of a
                                    // confirm dialog: the next step hands the browser
                                    // to Stripe, and a modal has nothing to return to.
                                    <Link
                                        href="/app-settings/plan/league/upgrade"
                                        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-300/50 bg-sky-500/20 px-5 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                                    >
                                        Review Pro upgrade
                                    </Link>
                                ) : (
                                    <p className="mt-5 text-sm font-semibold text-emerald-200">
                                        Pro Lifetime is permanently owned. No recurring League plan
                                        payment is required.
                                    </p>
                                )}

                                {/* Kept from the previous layout. The MVP's ProBillingSection has
                                    no payment-history link, but ours is live and must stay. */}
                                <div className="mt-5 border-t border-white/10 pt-4">
                                    <Link
                                        href="/app-settings/transaction-history"
                                        className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
                                    >
                                        View payment history &rarr;
                                    </Link>
                                </div>
                            </div>

                            <div
                                className="grid gap-3 sm:grid-cols-2"
                                aria-label="League plan comparison"
                            >
                                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-semibold text-white">Free</h3>
                                        <span className="text-sm font-semibold text-gray-300">$0</span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-gray-400">
                                        {FREE_PLAN_SUMMARY}
                                    </p>
                                </article>
                                <article className="rounded-2xl border border-sky-300/25 bg-sky-500/[0.08] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-semibold text-white">Pro Lifetime</h3>
                                        <span className="text-sm font-semibold text-sky-100">
                                            {offer.priceLabel} once
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-gray-300">
                                        {PRO_PLAN_SUMMARY}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                        {offer.kind === "founding"
                                            ? `${foundingOffer.priceLabel} one time during the founding offer; ${standardOffer.priceLabel} afterward.`
                                            : `${standardOffer.priceLabel} one time. The founding offer has ended.`}
                                    </p>
                                </article>
                            </div>

                            <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-white">
                                    Benefits and simulated receipt
                                </summary>
                                <div className="mt-3 border-t border-white/10 pt-4">
                                    <ul className="grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                                        {offer.entitlements.map((entitlement) => (
                                            <li
                                                key={entitlement}
                                                className="rounded-xl bg-white/[0.035] px-3 py-2"
                                            >
                                                {entitlement}
                                            </li>
                                        ))}
                                    </ul>
                                    {currentUser?.proLifetimeEntitlement ? (
                                        <dl className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-2">
                                            <div>
                                                <dt className="uppercase tracking-[0.12em]">purchased</dt>
                                                <dd className="mt-1 font-semibold text-white">
                                                    {offer.priceLabel} one time &middot;{" "}
                                                    {currentUser.proLifetimeEntitlement.purchasedAt.slice(0, 10)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="uppercase tracking-[0.12em]">
                                                    simulated receipt
                                                </dt>
                                                <dd className="mt-1 break-all font-mono text-white">
                                                    {currentUser.proLifetimeEntitlement.simulatedPaymentReference}
                                                </dd>
                                            </div>
                                        </dl>
                                    ) : (
                                        <p className="mt-4 text-xs text-gray-500">
                                            No Pro Lifetime receipt yet.
                                        </p>
                                    )}
                                </div>
                            </details>
                        </section>
                    </>
                )}
            </div>


            {downgradeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
                    <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-black p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-amber-200">
                                    switch to Free
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Confirm plan change</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDowngradeOpen(false)}
                                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                close
                            </button>
                        </div>

                        {!downgradeCheck.allowed ? (
                            <div className="space-y-3 text-sm leading-6 text-amber-50">
                                <p className="font-semibold">{downgradeCheck.error}</p>
                                {downgradeBlockers.ownedArenas.map((league) => (
                                    <div
                                        key={league.id}
                                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                                    >
                                        <p className="font-medium text-white">{league.name}</p>
                                        <p className="text-xs uppercase tracking-[0.14em] text-gray-400">
                                            Arena
                                        </p>
                                    </div>
                                ))}
                                {downgradeBlockers.proHostedLeagues.map((league) => (
                                    <div
                                        key={league.id}
                                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                                    >
                                        <p className="font-medium text-white">{league.name}</p>
                                        <p className="text-xs uppercase tracking-[0.14em] text-gray-400">
                                            League · Pro-hosted
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm leading-6 text-gray-300">
                                    Switching to Free removes future Pro hosting access. Existing groups keep their
                                    stored limits, and future Arena creation will be locked.
                                </p>
                                <label className="block space-y-2">
                                    <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                        Type FREE to confirm
                                    </span>
                                    <input
                                        value={downgradeConfirmation}
                                        onChange={(event) => setDowngradeConfirmation(event.target.value)}
                                        className={fieldClassName}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={handleDowngrade}
                                    disabled={!canConfirmDowngrade}
                                    className="w-full rounded-2xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-amber-50 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Switch to Free
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// useSearchParams needs a Suspense boundary or the whole route opts out of
// static prerendering at build time.
const AppPlanPage = () => (
    <Suspense
        fallback={
            <div className="text-sm text-gray-400" role="status">
                Preparing plan and billing…
            </div>
        }
    >
        <AppPlanContent />
    </Suspense>
);

export default AppPlanPage;
