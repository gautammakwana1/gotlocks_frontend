"use client";

// League Feed standings — the MVP ranks every League member by League Points
// earned from Community Picks and Feed contest entries over a rolling period.
// The backing endpoint does not exist yet, so this renders the finished layout
// in a disabled state; wiring it up is a later step of the Feed Contest port.

export type FeedStandingsPeriod = "last_7_days" | "last_30_days" | "lifetime";

const FEED_STANDINGS_PERIODS: readonly {
    id: FeedStandingsPeriod;
    label: string;
}[] = [
        { id: "last_7_days", label: "Last 7 Days" },
        { id: "last_30_days", label: "Last 30 Days" },
        { id: "lifetime", label: "Lifetime" },
    ];

export const LeagueFeedStandingsPanel = () => (
    <section aria-label="League Feed standings" className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Standings period">
            {FEED_STANDINGS_PERIODS.map((option, index) => (
                <button
                    key={option.id}
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-pressed={index === FEED_STANDINGS_PERIODS.length - 1}
                    className={`shrink-0 cursor-not-allowed rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-60 ${index === FEED_STANDINGS_PERIODS.length - 1
                            ? "border-sky-300/30 bg-sky-500/10 text-sky-100/70"
                            : "border-white/10 text-gray-500"
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>

        <p className="text-xs leading-5 text-gray-500">
            League Feed standings include League Points from Community Picks and Feed
            contest entries.
        </p>

        <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 sm:grid-cols-[4rem_minmax(0,1fr)_8rem]">
                <span>Rank</span>
                <span>Member</span>
                <span className="text-right">League Points</span>
            </div>
            <div className="px-4 py-6 text-sm text-gray-500">
                <p className="font-semibold text-gray-300">Standings coming soon</p>
                <p className="mt-1 leading-5">
                    Member rankings appear here once League Points from Community Picks
                    and Feed contests are being tracked.
                </p>
            </div>
        </div>
    </section>
);

export default LeagueFeedStandingsPanel;
