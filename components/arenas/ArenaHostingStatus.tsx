"use client";

import { formatDateTime } from "@/lib/utils/date";
import { arenaTierLabel, ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import type { ArenaHostingDetails, ArenaHostingStatus } from "@/lib/interfaces/interfaces";

/**
 * Presentation for one Arena's hosting row, shared by the Arena dashboard and the
 * per-Arena billing page in app settings. Extracted so the billing page does not
 * have to import the (very large) ArenaDashboard client component just to render
 * the status banner.
 *
 * Everything here takes the snake_case API row (ArenaHostingDetails). Do not
 * confuse these with the same-named helpers in ./selectors, which take the
 * camelCase domain shape and spell the owner role "owner" instead of
 * "commissioner" — mixing them silently returns wrong values.
 */

/** Colour only — the consumer supplies border/rounding/padding. */
export const statusTone: Record<ArenaHostingStatus, string> = {
    not_started: "border-sky-300/25 bg-sky-500/10 text-sky-100",
    included_month: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    active: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    past_due: "border-red-300/30 bg-red-500/10 text-red-100",
    pause_scheduled: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    cleanup: "border-orange-300/30 bg-orange-500/10 text-orange-100",
    paused: "border-white/15 bg-white/[0.04] text-gray-200",
};

export const hostingMessage = (hosting: ArenaHostingDetails) => {
    switch (hosting.status) {
        case "not_started":
            return "Permanent unlock is required before this Arena can begin hosting.";
        case "included_month":
            return `The included ${ARENA_INCLUDED_TIER_LABEL} month is active${hosting.included_month_ends_at
                ? ` through ${formatDateTime(hosting.included_month_ends_at)}`
                : ""
                }.`;
        case "active":
            return `Monthly hosting is active${hosting.paid_through_at ? ` through ${formatDateTime(hosting.paid_through_at)}` : ""
                }.`;
        case "past_due":
            return "New Arena activity is paused until the owner restores simulated hosting.";
        case "pause_scheduled":
            return `Hosting will pause${hosting.pause_scheduled_for
                ? ` at ${formatDateTime(hosting.pause_scheduled_for)}`
                : " at the end of this period"
                }. Existing activity remains available until then.`;
        case "cleanup":
            return "New activity is closed. Staff may finish unresolved Locked or Grading contests before the Arena becomes paused.";
        case "paused":
            return "This Arena is read-only. Its identity, members, history, standings, and permanent unlock are preserved.";
    }
};

// Re-exported: this module was the tier-label entry point before the map moved to
// lib/arenas/tierLabels, and ArenaDashboard still re-exports it from here.
export { arenaTierLabel };

export const getArenaTierLabel = (hosting: ArenaHostingDetails | null | undefined) =>
    arenaTierLabel(hosting?.tier);

/** Display-only money formatter for the simulated monthly amount. */
export const formatArenaCents = (cents: number | null | undefined) =>
    typeof cents === "number" ? `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}` : null;

export const getArenaHostingStatusLabel = (
    hosting: ArenaHostingDetails | null | undefined
) => {
    if (!hosting) return "Not started";
    const labels: Record<ArenaHostingStatus, string> = {
        not_started: "Locked",
        included_month: "Included month",
        active: "Active",
        past_due: "Past due",
        pause_scheduled: "Pause scheduled",
        cleanup: "Cleanup",
        paused: "Paused",
    };
    return labels[hosting.status];
};

/**
 * "Club · Active". A not-started Arena would otherwise read "Locked · Locked",
 * because an absent tier and the not_started status share a label.
 */
export const getArenaHostingHeadline = (hosting: ArenaHostingDetails | null | undefined) => {
    const tier = getArenaTierLabel(hosting);
    const status = getArenaHostingStatusLabel(hosting);
    return tier === status ? status : `${tier} · ${status}`;
};

export const ArenaStatusBanner = ({ hosting }: { hosting: ArenaHostingDetails }) => (
    <section
        className={`rounded-xl border px-4 py-3 text-sm ${statusTone[hosting.status]}`}
        role={hosting.status === "past_due" ? "alert" : "status"}
    >
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{getArenaHostingHeadline(hosting)}</p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                simulated hosting
            </span>
        </div>
        <p className="mt-1 leading-5 opacity-85">{hostingMessage(hosting)}</p>
    </section>
);

export default ArenaStatusBanner;
