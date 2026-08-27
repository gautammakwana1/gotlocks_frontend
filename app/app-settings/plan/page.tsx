"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArenaBillingSection from "@/components/billing/ArenaBillingSection";
import ProBillingSection from "@/components/billing/ProBillingSection";
import { getLeaguePlanCapacity, normalizeUserPlan } from "@/lib/groups/limits";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { PlanDowngrade, PlanState } from "@/lib/interfaces/interfaces";
import { clearPlanOverviewMessage, clearUpdateUserPlanMessage, fetchPlanOverviewRequest, updateUserPlanRequest } from "@/lib/redux/slices/planSlice";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { getProLifetimeOffer, getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsUI";

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
    { id: "arena", label: "Arena Plans", href: "/app-settings/plan?product=arena" },
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
    const availableOffer = getProLifetimeOffer(currentUser?.proLifetimeOfferKind);

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

    const planLimit = getLeaguePlanCapacity(plan);
    const ownedLeagueCount = downgradeBlockers.ownedLeagueCount;
    const ownedLeagueLimit = plan === "pro" ? planLimit.maxOwnedLeagues : downgradeBlockers.maxFreeLeagues;

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
        <SettingsPage>
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

            <SettingsHeader title="Plan and billing" backHref="/app-settings" />

            {/* Underline tabs, not a pill group: the panel below them is a full
                settings surface rather than a card, so the selected tab has to
                read as continuous with it. */}
            <nav
                role="tablist"
                aria-label="Billing products"
                className="grid grid-cols-2 border-b border-white/10"
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
                            className={`-mb-px flex min-h-12 items-center justify-center border-b-2 px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${active
                                ? tab.id === "league"
                                    ? "border-sky-300 text-white focus-visible:outline-white/70"
                                    : "border-violet-300 text-white focus-visible:outline-white/70"
                                : "border-transparent text-gray-400 hover:bg-white/[0.025] hover:text-white focus-visible:outline-white"
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
                {product === "arena" ? (
                    <ArenaBillingSection />
                ) : (
                    <ProBillingSection
                        planView={planView}
                        entitlement={currentUser?.proLifetimeEntitlement ?? null}
                        ownedLeagueCount={ownedLeagueCount}
                        ownedLeagueLimit={ownedLeagueLimit}
                    />
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
        </SettingsPage>
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
