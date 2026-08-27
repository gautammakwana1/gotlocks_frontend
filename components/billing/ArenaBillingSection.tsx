"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchOwnedArenaHostingRequest } from "@/lib/redux/slices/arenaSlice";
import type { ArenaState } from "@/lib/interfaces/interfaces";
import { getOwnedArenaHostingSummary } from "@/lib/arenas/ownedHostingSummary";
import { getArenaUnlockOffer } from "@/components/billing/arena";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import {
    SettingsActionBar,
    SettingsSection,
    settingsSecondaryButtonClassName,
} from "@/components/settings/SettingsUI";

type ArenaRootState = {
    arena: ArenaState;
};

const PAGE_SIZE = 10;

const ARENA_UNLOCK_OFFER = getArenaUnlockOffer();

/* What the money actually buys. The MVP puts this in front of anyone who owns
 * no Arena yet, because the empty state is the only place the offer is
 * explained before the purchase screen. */
const ARENA_BENEFITS = [
    "Create and customize your own Arena",
    "Run contests, manage leaderboards, and track winners",
    "Assign Arena managers to help operate your community",
    "Use community engagement and location-based tools",
    "Change tiers as your community grows",
] as const;

const statLabelClassName =
    "min-h-8 text-[10px] uppercase leading-4 tracking-[0.06em] text-gray-500 sm:text-xs sm:tracking-[0.12em]";

const SkeletonRow = () => (
    <div className="min-h-24 animate-pulse rounded-2xl border border-violet-300/20 bg-violet-500/[0.055] px-4 py-4 sm:px-5">
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
        <div className="arena-theme">
            {/* THE NUMBERS FIRST. The MVP replaced the old gradient hero with a
                three-stat row: what you own, what it costs, and whether anything
                is wrong. That last one is the reason people open this page. */}
            <SettingsSection
                title="Your Arena plans"
                description="Only Arenas you own are billed to your account. Managed and joined Arenas stay separate."
                layout="split"
            >
                <dl className="grid grid-cols-3 gap-2 text-sm sm:gap-8">
                    <div className="space-y-1">
                        <dt className={statLabelClassName}>
                            <span className="block">Owned </span>
                            <span className="block">Arenas</span>
                        </dt>
                        <dd className="text-lg font-semibold text-white">{summary.ownedCount}</dd>
                    </div>
                    <div className="space-y-1">
                        <dt className={statLabelClassName}>
                            <span className="block">Current </span>
                            <span className="block whitespace-nowrap">monthly charges</span>
                        </dt>
                        <dd className="text-lg font-semibold text-white">
                            {summary.activeMonthlyTotalLabel
                                ? `${summary.activeMonthlyTotalLabel}/mo`
                                : "$0/mo"}
                        </dd>
                    </div>
                    <div className="space-y-1">
                        <dt className={statLabelClassName}>
                            <span className="block">Billing </span>
                            <span className="block">status</span>
                        </dt>
                        <dd
                            className={`text-lg font-semibold ${summary.attentionCount > 0 ? "text-amber-200" : "text-emerald-200"
                                }`}
                        >
                            {summary.attentionCount > 0
                                ? `${summary.attentionCount} issue${summary.attentionCount === 1 ? "" : "s"}`
                                : "Clear"}
                        </dd>
                    </div>
                </dl>
            </SettingsSection>

            <SettingsSection
                title="Manage Arenas"
                description="Choose an Arena to manage its plan and billing."
                layout="split"
                bodyClassName="space-y-3"
            >
                {ownedHostingError ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"
                    >
                        {ownedHostingError}
                    </div>
                ) : null}

                {isInitialLoad ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : summary.ownedCount === 0 ? (
                    <div className="py-2">
                        <h3 className="font-semibold text-white">No owned Arenas</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Start by naming and customizing your Arena, then unlock its permanent
                            identity and invite code for {ARENA_UNLOCK_OFFER.priceLabel} one time.
                            One month of {ARENA_INCLUDED_TIER_LABEL} hosting is included with the
                            unlock; your selected monthly plan begins after that.
                        </p>

                        <div className="mt-5">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                                Arena benefits
                            </h4>
                            <ul
                                aria-label="Arena benefits"
                                className="mt-3 space-y-2.5 text-sm text-gray-300"
                            >
                                {ARENA_BENEFITS.map((benefit) => (
                                    <li key={benefit} className="flex gap-3">
                                        <span className="text-violet-200" aria-hidden="true">
                                            ✓
                                        </span>
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <SettingsActionBar className="mt-6">
                            <Link
                                href="/cag-form?type=arena"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-300/40 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/10"
                            >
                                Launch an Arena
                            </Link>
                        </SettingsActionBar>
                    </div>
                ) : (
                    <>
                        {summary.lines.map((line) => (
                            <Link
                                key={line.arenaId}
                                href={`/app-settings/plan/arena/${line.arenaId}`}
                                className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-violet-300/20 bg-violet-500/[0.055] px-4 py-4 shadow-sm shadow-violet-950/20 transition hover:border-violet-300/40 hover:bg-violet-500/[0.09] hover:shadow-md hover:shadow-violet-950/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 sm:px-5"
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
                                <AnimatedArrow direction="right" className="shrink-0 text-violet-200" />
                            </Link>
                        ))}

                        {ownedHostingHasMore ? (
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={ownedHostingLoading}
                                className={`${settingsSecondaryButtonClassName} w-full`}
                            >
                                {ownedHostingLoading ? "Loading…" : "Show more Arenas"}
                            </button>
                        ) : null}
                    </>
                )}
            </SettingsSection>
        </div>
    );
};

export default ArenaBillingSection;
