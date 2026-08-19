"use client";

import Link from "next/link";
import {
    STANDINGS_CARD_STYLES,
    StandingIdentity,
    StandingPrimaryMetric,
    StandingRank,
    StandingsCard,
} from "@/components/community/StandingsCard";

// League Feed standings — the MVP ranks every League member by League Points
// earned from Community Picks and Feed contest entries over a rolling period.
// The backing endpoint does not exist yet, so this renders the finished layout
// in a disabled state; wiring it up is a later step of the Feed Contest port.
//
// Now drawn on the MVP's gold StandingsCard (MVP league page:156-192,
// LeagueLifetimeStandingsBoard) at presentation="page". The MVP's board reads
// real rows; this one is deliberately mounted EMPTY so the card falls through to
// its `emptyState` — no endpoint is invented, and the day one lands the only
// change here is passing `rows`.

export type FeedStandingsPeriod = "last_7_days" | "last_30_days" | "lifetime";

/**
 * The row the future endpoint has to answer with. `renderRow` below is the MVP's
 * verbatim, so it is already correct the moment `rows` stops being empty.
 */
export type LeagueFeedStandingRow = {
    rank: number;
    userId: string;
    points: number;
    handle: string;
    displayName: string;
    avatarUrl?: string;
};

/** Matches the MVP's column template (MVP league page:164). */
const STANDINGS_GRID_CLASS_NAME =
    "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[4rem_minmax(0,1fr)_8rem]";

const FEED_STANDINGS_PERIODS: readonly {
    id: FeedStandingsPeriod;
    label: string;
}[] = [
        { id: "last_7_days", label: "Last 7 Days" },
        { id: "last_30_days", label: "Last 30 Days" },
        { id: "lifetime", label: "Lifetime" },
    ];

export const LeagueFeedStandingsPanel = ({
    leagueId,
    rows = [],
}: {
    /** Resolves the member-card link on each row. */
    leagueId?: string;
    rows?: readonly LeagueFeedStandingRow[];
}) => (
    // StructuredFeed now bleeds its whole Standings view (`-mx-5 sm:mx-0`, MVP
    // StructuredFeed:226-231) instead of insetting it, and StandingsCard supplies
    // its OWN `px-5 sm:px-4` on the header and rows. So the chrome above the board
    // has to carry that same inset itself or it renders flush to the screen edge.
    <section aria-label="League Feed standings" className="space-y-4">
        <div
            className="flex gap-2 overflow-x-auto px-5 pb-1 sm:px-4"
            aria-label="Standings period"
        >
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

        <p className="px-5 text-xs leading-5 text-gray-500 sm:px-4">
            League Feed standings include League Points from Community Picks and Feed
            contest entries.
        </p>

        <StandingsCard
            rows={rows}
            getRowKey={(row) => row.userId}
            columns={[
                { key: "rank", label: "Rank" },
                { key: "member", label: "Member" },
                { key: "points", label: "League Points", className: "text-right" },
            ]}
            gridClassName={STANDINGS_GRID_CLASS_NAME}
            boardId="feed"
            leaderboardDataId="feed"
            scrollDataId="feed"
            // "page" drops the bordered frame and lets the board run the full
            // width of the Feed's Standings view, as all three MVP call sites do.
            presentation="page"
            noTitle
            emptyState={
                <div className="px-5 py-6 text-sm text-gray-500 sm:px-4">
                    <p className="font-semibold text-gray-300">Standings coming soon</p>
                    <p className="mt-1 leading-5">
                        Member rankings appear here once League Points from Community Picks
                        and Feed contests are being tracked.
                    </p>
                </div>
            }
            renderRow={(row) => (
                <Link
                    href={leagueId ? `/league/${leagueId}/members/${row.userId}` : "#"}
                    aria-label={`View @${row.handle}'s League member card`}
                    data-lifetime-standing-row
                    data-lifetime-standing-theme="gold"
                    className={`grid min-h-[3.3125rem] ${STANDINGS_GRID_CLASS_NAME} ${STANDINGS_CARD_STYLES.fullPageRow}`}
                >
                    <StandingRank rank={row.rank} />
                    <StandingIdentity
                        avatarUrl={row.avatarUrl}
                        displayName={row.displayName}
                        handle={row.handle}
                        rank={row.rank}
                    />
                    <StandingPrimaryMetric value={row.points} />
                </Link>
            )}
        />
    </section>
);

export default LeagueFeedStandingsPanel;
