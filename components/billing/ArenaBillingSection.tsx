"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchOwnedArenaHostingRequest } from "@/lib/redux/slices/arenaSlice";
import type { ArenaState } from "@/lib/interfaces/interfaces";
import { getOwnedArenaHostingSummary } from "@/lib/arenas/ownedHostingSummary";

type ArenaRootState = {
    arena: ArenaState;
};

const PAGE_SIZE = 10;

const SkeletonRow = () => (
    <div className="min-h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="mt-3 h-3 w-56 rounded bg-white/5" />
    </div>
);

export const ArenaBillingSection = () => {
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const { ownedHosting, ownedHostingHasMore, ownedHostingLoading, ownedHostingError } =
        useSelector((state: ArenaRootState) => state.arena);

    useEffect(() => {
        dispatch(fetchOwnedArenaHostingRequest({ page: 1, limit: PAGE_SIZE }));
    }, [dispatch]);

    const summary = useMemo(() => getOwnedArenaHostingSummary(ownedHosting), [ownedHosting]);

    const handleLoadMore = () => {
        if (ownedHostingLoading || !ownedHostingHasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        dispatch(fetchOwnedArenaHostingRequest({ page: nextPage, limit: PAGE_SIZE }));
    };

    // Only the very first load shows skeletons; later pages keep the list visible.
    const isInitialLoad = ownedHostingLoading && ownedHosting.length === 0;

    return (
        <section aria-labelledby="arena-hosting-title" className="space-y-5">
            <div className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(139,92,246,0.13),rgba(255,255,255,0.025))] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                            Arena Hosting
                        </p>
                        <h2 id="arena-hosting-title" className="mt-2 text-xl font-semibold text-white">
                            Owner billing workspace
                        </h2>
                    </div>
                    {summary.ownedCount > 0 ? (
                        <span className="rounded-full border border-violet-200/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100">
                            {summary.ownedCount} owned
                        </span>
                    ) : null}
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">
                    Each Arena has its own permanent unlock, hosting tier, status, and receipts.
                    Managed or joined Arenas are never billed to your account.
                </p>
                {summary.ownedCount > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        <span className="text-gray-300">
                            Active monthly total: {summary.activeMonthlyTotalLabel ?? "$0"}/mo
                        </span>
                        <span
                            className={
                                summary.attentionCount > 0
                                    ? "font-semibold text-amber-200"
                                    : "text-gray-400"
                            }
                        >
                            {summary.attentionCount} need{summary.attentionCount === 1 ? "s" : ""}{" "}
                            attention
                        </span>
                    </div>
                ) : null}
            </div>

            {ownedHostingError ? (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"
                >
                    {ownedHostingError}
                </div>
            ) : null}

            {isInitialLoad ? (
                <div className="space-y-3">
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            ) : summary.ownedCount === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="font-semibold text-white">No owned Arenas</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        Launch an Arena with a permanent unlock. One month of hosting is included,
                        then your preselected monthly tier begins.
                    </p>
                    <Link
                        href="/cag-form?type=arena"
                        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-violet-300/40 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/10"
                    >
                        Launch an Arena
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {summary.lines.map((line) => (
                        <Link
                            key={line.arenaId}
                            href={`/app-settings/plan/arena/${line.arenaId}`}
                            className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-300/30 hover:bg-violet-500/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-semibold text-white">{line.name}</h3>
                                    {line.needsAttention ? (
                                        <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                                            attention
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm text-gray-300">
                                    {line.tierLabel} · {line.statusLabel}
                                    {line.monthlyPriceLabel ? ` · ${line.monthlyPriceLabel}/mo` : ""}
                                </p>
                                {line.includedMonthActive ? (
                                    <p className="mt-1 text-xs text-emerald-200">
                                        Included month
                                        {line.includedMonthDaysRemaining !== null
                                            ? ` · ${line.includedMonthDaysRemaining} day${line.includedMonthDaysRemaining === 1 ? "" : "s"} left`
                                            : ""}
                                    </p>
                                ) : null}
                            </div>
                            <span
                                className="shrink-0 text-violet-200 transition group-hover:translate-x-0.5 motion-reduce:transition-none"
                                aria-hidden
                            >
                                →
                            </span>
                        </Link>
                    ))}

                    {ownedHostingHasMore ? (
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={ownedHostingLoading}
                            className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/25 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {ownedHostingLoading ? "Loading…" : "Show more Arenas"}
                        </button>
                    ) : null}
                </div>
            )}
        </section>
    );
};

export default ArenaBillingSection;
