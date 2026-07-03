"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { normalizeUserPlan } from "@/lib/groups/limits";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { PlanDowngrade, PlanState } from "@/lib/interfaces/interfaces";
import { clearPlanOverviewMessage, clearUpdateUserPlanMessage, fetchPlanOverviewRequest, updateUserPlanRequest } from "@/lib/redux/slices/planSlice";

type RootState = {
    plan: PlanState;
};

type CheckoutForm = {
    name: string;
    email: string;
    cardNumber: string;
    expiry: string;
    cvc: string;
    postalCode: string;
};

const emptyCheckoutForm: CheckoutForm = {
    name: "",
    email: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    postalCode: "",
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
    const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(emptyCheckoutForm);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [downgradeConfirmation, setDowngradeConfirmation] = useState("");

    useEffect(() => {
        if (!currentUser) {
            router.replace("/landing-page");
        }
    }, [currentUser, router]);

    useEffect(() => {
        if (!currentUser) return;
        setCheckoutForm((current) => ({
            ...current,
            name: current.name || currentUser.full_name,
            email: current.email || currentUser.email,
        }));
    }, [currentUser]);

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
    const downgradeCheck = overview?.downgrade
        ? { allowed: overview.downgrade.allowed, error: overview.downgrade.error }
        : { allowed: false, error: null as string | null };
    const downgradeBlockers: PlanDowngrade["blockers"] = overview?.downgrade.blockers ?? {
        ownedArenas: [],
        proHostedLeagues: [],
        ownedLeagueCount: 0,
        maxFreeLeagues: 3,
    };

    if (!currentUser) return null;

    const checkoutReady =
        checkoutForm.name.trim() &&
        checkoutForm.email.trim() &&
        checkoutForm.cardNumber.trim() &&
        checkoutForm.expiry.trim() &&
        checkoutForm.cvc.trim() &&
        checkoutForm.postalCode.trim();
    const needsDowngradeConfirmation = plan === "pro" && downgradeCheck.allowed;
    const canConfirmDowngrade =
        needsDowngradeConfirmation && downgradeConfirmation.trim().toUpperCase() === "FREE";

    const handleCheckoutSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCheckoutError(null);

        if (!checkoutReady) {
            setCheckoutError("Complete the simulated payment fields to continue.");
            return;
        }

        dispatch(updateUserPlanRequest({ plan: "pro" }));

        setCheckoutOpen(false);
        setCheckoutForm(emptyCheckoutForm);
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
                    Manage the gotLocks organizer plan. Payment collection is simulated in this build.
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
                    <form
                        onSubmit={handleCheckoutSubmit}
                        className="w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-sky-200">
                                    simulated checkout
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    Founding Pro one-time unlock
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-300">
                                    This form mirrors a future payment step. No card is charged in this build.
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
                                <span className="font-semibold text-white">One-time unlock</span>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block space-y-2 sm:col-span-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    billing name
                                </span>
                                <input
                                    value={checkoutForm.name}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    className={fieldClassName}
                                />
                            </label>
                            <label className="block space-y-2 sm:col-span-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    email
                                </span>
                                <input
                                    type="email"
                                    value={checkoutForm.email}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({ ...current, email: event.target.value }))
                                    }
                                    className={fieldClassName}
                                />
                            </label>
                            <label className="block space-y-2 sm:col-span-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    card number
                                </span>
                                <input
                                    value={checkoutForm.cardNumber}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({
                                            ...current,
                                            cardNumber: event.target.value,
                                        }))
                                    }
                                    placeholder="4242 4242 4242 4242"
                                    inputMode="numeric"
                                    className={fieldClassName}
                                />
                            </label>
                            <label className="block space-y-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    expiry
                                </span>
                                <input
                                    value={checkoutForm.expiry}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({ ...current, expiry: event.target.value }))
                                    }
                                    placeholder="MM/YY"
                                    className={fieldClassName}
                                />
                            </label>
                            <label className="block space-y-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    cvc
                                </span>
                                <input
                                    value={checkoutForm.cvc}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({ ...current, cvc: event.target.value }))
                                    }
                                    placeholder="123"
                                    inputMode="numeric"
                                    className={fieldClassName}
                                />
                            </label>
                            <label className="block space-y-2 sm:col-span-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    postal code
                                </span>
                                <input
                                    value={checkoutForm.postalCode}
                                    onChange={(event) =>
                                        setCheckoutForm((current) => ({
                                            ...current,
                                            postalCode: event.target.value,
                                        }))
                                    }
                                    className={fieldClassName}
                                />
                            </label>
                        </div>

                        {checkoutError && <p className="text-sm font-semibold text-red-200">{checkoutError}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-2xl border border-sky-300/50 bg-sky-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-sky-50 transition hover:bg-sky-500/30 disabled:opacity-[0.5] disabled:cursor-not-allowed"
                        >
                            Simulate payment and unlock Pro
                        </button>
                    </form>
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
