"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ExternalLink, Loader2 } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsUI";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { fetchTransactionsRequest } from "@/lib/redux/slices/planSlice";
import type { PaymentTransaction, PlanState } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import ScrollUpButton from "@/components/ui/ScrollUpButton";
import TransactionHistorySkeleton from "@/components/skeletons/app-settings/TransactionHistorySkeleton";

type RootState = {
    plan: PlanState;
};

const PAGE_SIZE = 10;

const formatAmount = (amount: number, currency: string) => {
    const code = (currency || "usd").toUpperCase();
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(
            (amount || 0) / 100
        );
    } catch {
        return `${((amount || 0) / 100).toFixed(2)} ${code}`;
    }
};

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const statusStyles: Record<string, { label: string; className: string }> = {
    succeeded: { label: "Paid", className: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" },
    refunded: { label: "Refunded", className: "border-amber-300/30 bg-amber-500/10 text-amber-100" },
    failed: { label: "Failed", className: "border-red-300/30 bg-red-500/10 text-red-100" },
};

const getStatusBadge = (status: string) =>
    statusStyles[status] ?? {
        label: capitalize(status || "Unknown"),
        className: "border-white/15 bg-white/5 text-[var(--text-secondary)]",
    };

const paymentMethodLabel = (t: PaymentTransaction) => {
    if (!t.card_brand && !t.card_last4) return null;
    const brand = t.card_brand ? capitalize(t.card_brand) : "Card";
    return t.card_last4 ? `${brand} •••• ${t.card_last4}` : brand;
};

const TransactionHistoryPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();

    const [page, setPage] = useState(1);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    const { transactions, transactionsLoading, transactionsError, transactionsHasMore } = useSelector(
        (state: RootState) => state.plan
    );

    useEffect(() => {
        if (!currentUser) {
            router.replace("/landing-page");
        }
    }, [currentUser, router]);

    const fetchTransactions = useCallback(
        (pageNum: number) => {
            dispatch(fetchTransactionsRequest({ page: pageNum, limit: PAGE_SIZE }));
        },
        [dispatch]
    );

    useEffect(() => {
        if (!currentUser) return;
        fetchTransactions(1);
    }, [currentUser, fetchTransactions]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && transactionsHasMore && !transactionsLoading) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchTransactions(nextPage);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [transactionsHasMore, transactionsLoading, page, fetchTransactions]);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (transactionsError) {
            setToast({ id: Date.now(), type: "error", message: transactionsError, duration: 3000 });
        }
    }, [transactionsError, setToast]);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    if (!currentUser) return null;

    if (transactionsLoading && transactions.length === 0) {
        return <TransactionHistorySkeleton />;
    }

    return (
        <SettingsPage className="pb-20">
            <SettingsHeader
                title="Transaction history"
                description="Your gotLocks payments and refunds. Receipts are hosted securely by Stripe."
                backHref="/app-settings"
            />

            {/* Receipt rows are cards rather than full-bleed settings sections,
                so the body re-insets itself onto the page gutter. */}
            <div className="space-y-6 px-5 pt-6 sm:px-6">

            {transactions.length > 0 ? (
                <div className="space-y-3">
                    {transactions.map((t) => {
                        const badge = getStatusBadge(t.status);
                        const method = paymentMethodLabel(t);

                        return (
                            <div
                                key={t.id}
                                className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-sm font-semibold text-[var(--app-text)]">
                                        {t.description || "gotLocks payment"}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {formatDateTime(t.created_at)}
                                    </p>
                                    {method && (
                                        <p className="text-xs text-[var(--text-muted)]">{method}</p>
                                    )}
                                    {t.receipt_url && (
                                        <a
                                            href={t.receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-sky-300 transition hover:text-sky-200"
                                        >
                                            View receipt <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <p className="text-sm font-semibold text-[var(--app-text)]">
                                        {formatAmount(t.amount, t.currency)}
                                    </p>
                                    <span
                                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badge.className}`}
                                    >
                                        {badge.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={observerTarget} className="flex justify-center py-4">
                        {transactionsLoading && transactionsHasMore && (
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500/60" />
                        )}
                    </div>
                </div>
            ) : (
                !transactionsLoading && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-[var(--text-secondary)]">
                        You have no payments yet. When you upgrade to Founding Pro, your payment will
                        appear here with a receipt.
                    </div>
                )
            )}

            <Link
                href="/app-settings/plan"
                className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm lowercase text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
            >
                back to plan
            </Link>

            {showScrollTop && <ScrollUpButton scrollToTop={scrollToTop} />}
            </div>
        </SettingsPage>
    );
};

export default TransactionHistoryPage;
