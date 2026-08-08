"use client";

import type { Ref } from "react";
import type { ProLifetimePlanViewModel } from "@/lib/billing/proLifetime";

type PlanMenuCardProps = {
    planView: ProLifetimePlanViewModel;
    onUpgrade: () => void;
    onViewDetails: () => void;
    actionRef?: Ref<HTMLButtonElement>;
    ownedLeagueCount?: number;
    ownedLeagueLimit?: number;
    className?: string;
};

export const PlanMenuCard = ({
    planView,
    onUpgrade,
    onViewDetails,
    actionRef,
    ownedLeagueCount,
    ownedLeagueLimit,
    className = "",
}: PlanMenuCardProps) => {
    const owned = planView.status === "owned";
    const showLeagueCapacity =
        typeof ownedLeagueCount === "number" && typeof ownedLeagueLimit === "number";

    return (
        <section
            aria-labelledby="league-plan-card-title"
            className={`overflow-hidden rounded-2xl border border-sky-300/35 bg-[linear-gradient(145deg,rgba(14,165,233,0.18),rgba(255,255,255,0.05))] p-4 shadow-lg shadow-sky-950/20 ${className}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                        League organizer plan
                    </p>
                    <h2
                        id="league-plan-card-title"
                        className="mt-1 text-base font-black uppercase tracking-[0.12em] text-white"
                    >
                        Pro Lifetime
                    </h2>
                </div>
                {showLeagueCapacity ? (
                    <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-50">
                        {ownedLeagueCount}/{ownedLeagueLimit} owned
                    </span>
                ) : null}
            </div>

            {owned ? (
                <div className="mt-3 space-y-1">
                    <p className="text-sm font-semibold text-emerald-100">Permanently owned</p>
                    <p className="text-xs leading-5 text-gray-300">
                        Your one-time Pro unlock is active. No recurring League subscription is required.
                    </p>
                </div>
            ) : (
                <div className="mt-3 space-y-2">
                    <p className="text-sm leading-5 text-gray-100">
                        Unlock more League capacity and organizer controls.
                    </p>
                    <p className="text-lg font-bold text-white">
                        {planView.offer.priceLabel}{" "}
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-100">
                            {planView.offer.cadenceLabel}
                        </span>
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                        {planView.offer.name} offer · permanent unlock
                    </p>
                    <p className="text-xs leading-5 text-gray-300">
                        More Leagues, more members, expanded contests, secondary leaderboards, and advanced
                        Slip controls. No recurring League subscription.
                    </p>
                </div>
            )}

            <button
                ref={actionRef}
                type="button"
                onClick={owned ? onViewDetails : onUpgrade}
                className={`mt-4 w-full rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition ${owned
                    ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                    : "border-sky-200/60 bg-sky-400/25 text-white hover:bg-sky-400/35"
                    }`}
            >
                {owned ? "View plan details" : "Upgrade to Pro"}
            </button>
        </section>
    );
};

export default PlanMenuCard;
