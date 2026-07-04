"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeUserPlan } from "@/lib/groups/limits";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { PlanDowngrade, PlanState } from "@/lib/interfaces/interfaces";
import { clearPlanOverviewMessage, clearUpdateUserPlanMessage, createCheckoutSessionRequest, fetchPlanOverviewRequest, updateUserPlanRequest } from "@/lib/redux/slices/planSlice";

type RootState = {
    plan: PlanState;
};

const fieldClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20";

const planSummary = {
    free: "Host up to 3 leagues with 10 members and 3 active contests each.",
    pro: "Host unlimited leagues, create up to 3 Arenas, and run up to 6 active contests per group.",
};

const AppPlanPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [downgradeOpen, setDowngradeOpen] = useState(false);
    const [downgradeConfirmation, setDowngradeConfirmation] = useState("");
    const [checkoutReturn, setCheckoutReturn] = useState<null | "success" | "cancel">(null);

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

    // Detect the Stripe checkout return once, then strip the query param.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get("checkout");
        if (checkout === "success" || checkout === "cancel") {
            setCheckoutReturn(checkout);
            window.history.replaceState({}, "", "/app-settings/plan");
        }
    }, []);

    // Cancelled checkout — inform the user, nothing was charged.
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
    // lag the browser redirect by a few seconds, so poll the overview until Pro.
    useEffect(() => {
        if (checkoutReturn !== "success" || !currentUser) return;
        setCheckoutOpen(false);
        let tries = 0;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const poll = () => {
            if (cancelled) return;
            dispatch(fetchPlanOverviewRequest());
            tries += 1;
            if (tries < 6) timer = setTimeout(poll, 2000);
        };
        poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [checkoutReturn, currentUser, dispatch]);

    // Celebrate once the polled overview reports Pro.
    useEffect(() => {
        if (checkoutReturn === "success" && plan === "pro") {
            setToast({
                id: Date.now(),
                type: "success",
                message: "Welcome to Founding Pro! 🎉",
                duration: 4000,
            });
            setCheckoutReturn(null);
        }
    }, [checkoutReturn, plan, setToast]);

    if (!currentUser) return null;

    const needsDowngradeConfirmation = plan === "pro" && downgradeCheck.allowed;
    const canConfirmDowngrade =
        needsDowngradeConfirmation && downgradeConfirmation.trim().toUpperCase() === "FREE";

    const handleStartCheckout = () => {
        // Kicks off Stripe hosted checkout; the saga redirects to Stripe on success.
        dispatch(createCheckoutSessionRequest());
    };

    const handleDowngrade = () => {
        dispatch(updateUserPlanRequest({ plan: "free" }));
        setDowngradeOpen(false);
        setDowngradeConfirmation("");
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    account settings
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
                    <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-black p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs tracking-[0.18em] text-sky-200">
                                    secure checkout
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    Founding Pro one-time unlock
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-300">
                                    You&apos;ll be redirected to Stripe&apos;s secure checkout to complete
                                    your purchase. Your card details are handled entirely by Stripe.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckoutOpen(false)}
                                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                close
                            </button>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                            <div className="flex items-center justify-between gap-3">
                                <span>Founding Pro</span>
                                <span className="font-semibold text-white">{priceLabel}</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                                One-time payment. Unlocks unlimited leagues and up to 3 Arenas.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartCheckout}
                            disabled={loading}
                            className="w-full rounded-2xl border border-sky-300/50 bg-sky-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-sky-50 transition hover:bg-sky-500/30 disabled:opacity-[0.5] disabled:cursor-not-allowed"
                        >
                            {loading ? "Redirecting to Stripe…" : "Continue to secure checkout"}
                        </button>
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
