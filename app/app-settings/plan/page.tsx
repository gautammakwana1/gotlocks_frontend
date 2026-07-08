"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeUserPlan } from "@/lib/groups/limits";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { PlanDowngrade, PlanState } from "@/lib/interfaces/interfaces";
import { clearPlanOverviewMessage, clearUpdateUserPlanMessage, createCheckoutSessionRequest, fetchPlanOverviewRequest, updateUserPlanRequest } from "@/lib/redux/slices/planSlice";
import { ArrowLeft, Check, CheckCircle2, Clock, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";

type PaymentPhase = "processing" | "confirmed" | "timeout" | null;

type RootState = {
    plan: PlanState;
};

const fieldClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20";

const planSummary = {
    free: "Host up to 3 leagues with 10 members and 3 active contests each.",
    pro: "Host unlimited leagues, create up to 3 Arenas, and run up to 6 active contests per group.",
};

const proPerks = [
    "Unlimited leagues",
    "Up to 3 Arenas",
    "6 active contests per group",
    "50-member leagues",
];

const AppPlanPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
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
        setCheckoutOpen(false);
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

    const handleStartCheckout = () => {
        dispatch(createCheckoutSessionRequest());
    };

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
                    Manage the gotLocks organizer plan. Payments are processed securely by Stripe.
                </p>
            </header>

            <section className="space-y-4 border-b border-[var(--border-soft)] pb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            current plan
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                            {plan === "pro" ? "Founding Pro" : "Free"}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                            {planSummary[plan]}
                        </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]">
                        {plan === "pro" ? "one-time unlock" : "starter"}
                    </span>
                </div>

                {plan === "free" ? (
                    <button
                        type="button"
                        onClick={() => setCheckoutOpen(true)}
                        className="rounded-full border border-sky-300/50 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-50 transition hover:bg-sky-500/25"
                    >
                        Upgrade to Founding Pro
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setDowngradeOpen(true)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                    >
                        Switch to Free
                    </button>
                )}

                <div>
                    <Link
                        href="/app-settings/transaction-history"
                        className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
                    >
                        View payment history →
                    </Link>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-[var(--app-text)]">Free</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {planSummary.free}
                    </p>
                </div>
                <div className="rounded-2xl border border-sky-300/30 bg-sky-500/10 p-4">
                    <p className="text-sm font-semibold text-[var(--app-text)]">Founding Pro</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {planSummary.pro}
                    </p>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--app-text)]">
                    downgrade readiness
                </h2>
                {!overview ? (
                    <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[var(--text-secondary)]">
                        Loading plan…
                    </p>
                ) : downgradeCheck.allowed ? (
                    <p className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-50">
                        This account can switch to Free. Existing Free-hosted groups keep their stored limits.
                    </p>
                ) : (
                    <div className="space-y-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-50">
                        <p className="font-semibold">{downgradeCheck.error}</p>
                        {downgradeBlockers.ownedArenas.length > 0 && (
                            <p>{downgradeBlockers.ownedArenas.length} Arena ownership blocker(s).</p>
                        )}
                        {downgradeBlockers.proHostedLeagues.length > 0 && (
                            <p>
                                {downgradeBlockers.proHostedLeagues.length} Pro-hosted League blocker(s).
                            </p>
                        )}
                        {downgradeBlockers.ownedLeagueCount > downgradeBlockers.maxFreeLeagues && (
                            <p>
                                {downgradeBlockers.ownedLeagueCount} owned leagues; Free supports 3.
                            </p>
                        )}
                    </div>
                )}
            </section>

            {checkoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
                    <div
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300/25 bg-[#0b0b0f] shadow-2xl"
                        style={{ animation: "homeFadeUp 240ms ease-out both" }}
                    >
                        {/* Premium gradient backdrop + glow */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-fuchsia-600/10 to-indigo-600/20"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        />

                        <div className="relative space-y-5 p-6 sm:p-7">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                                    <Crown size={13} /> Founding Pro
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCheckoutOpen(false)}
                                    className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:border-white/30 hover:text-white"
                                >
                                    close
                                </button>
                            </div>

                            {/* Title + price */}
                            <div>
                                <h2 className="bg-gradient-to-r from-amber-200 via-white to-amber-100 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                                    Founding Pro
                                </h2>
                                <div className="mt-2 flex items-end gap-2">
                                    <span className="text-3xl font-bold text-white">{priceLabel}</span>
                                    <span className="pb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                        one-time unlock
                                    </span>
                                </div>
                            </div>

                            {/* Perks */}
                            <ul className="grid gap-2.5 sm:grid-cols-2">
                                {proPerks.map((perk) => (
                                    <li key={perk} className="flex items-center gap-2 text-sm text-gray-200">
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                                            <Check size={11} strokeWidth={3} />
                                        </span>
                                        {perk}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                type="button"
                                onClick={handleStartCheckout}
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-3.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Redirecting to Stripe…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} /> Continue to secure checkout
                                    </>
                                )}
                            </button>

                            {/* Secure note */}
                            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[var(--text-muted)]">
                                <ShieldCheck size={13} /> Secured by Stripe · your card details never touch gotLocks
                            </p>
                        </div>
                    </div>
                </div>
            )}

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

export default AppPlanPage;
