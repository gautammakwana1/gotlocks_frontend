import type {
    ArenaHostingStatus,
    OwnedArenaHostingRow,
} from "@/lib/interfaces/interfaces";
import { arenaTierLabel } from "@/lib/arenas/tierLabels";

/**
 * Hosting states that need the owner to do something. Everything except `active`
 * and `included_month` — a missing hosting row reads as `not_started`, which is
 * deliberately in the set: an Arena that was created but never had hosting
 * activated is exactly what the attention badge exists to surface.
 */
export const ARENA_ATTENTION_STATUSES = new Set<ArenaHostingStatus>([
    "not_started",
    "past_due",
    "pause_scheduled",
    "cleanup",
    "paused",
]);

/** Hosting states that are actively incurring the monthly charge. */
const ARENA_CHARGING_STATUSES = new Set<ArenaHostingStatus>(["active", "pause_scheduled"]);

const STATUS_LABELS: Record<ArenaHostingStatus, string> = {
    not_started: "Locked",
    included_month: "Included month",
    active: "Active",
    past_due: "Past due",
    pause_scheduled: "Pause scheduled",
    cleanup: "Cleanup",
    paused: "Paused",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatCents = (cents: number | null | undefined) =>
    typeof cents === "number" ? `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}` : null;

export type OwnedArenaHostingLine = {
    arenaId: string;
    name: string;
    tierLabel: string;
    statusLabel: string;
    status: ArenaHostingStatus;
    monthlyPriceLabel: string | null;
    needsAttention: boolean;
    includedMonthActive: boolean;
    includedMonthDaysRemaining: number | null;
};

export type OwnedArenaHostingSummary = {
    ownedCount: number;
    attentionCount: number;
    activeMonthlyTotalLabel: string | null;
    lines: OwnedArenaHostingLine[];
};

export const getOwnedArenaHostingSummary = (
    rows: readonly OwnedArenaHostingRow[],
    now: number = Date.now()
): OwnedArenaHostingSummary => {
    let monthlyTotalCents = 0;

    const lines = rows.map((row) => {
        const status: ArenaHostingStatus = row.hosting?.status ?? "not_started";
        const monthlyCents = row.hosting?.monthly_amount_cents ?? null;

        if (typeof monthlyCents === "number" && ARENA_CHARGING_STATUSES.has(status)) {
            monthlyTotalCents += monthlyCents;
        }

        const includedMonthActive = status === "included_month";
        const includedMonthEndsAt = row.hosting?.included_month_ends_at;
        // Ceil so the final partial day still reads as "1 day left" rather than 0.
        const includedMonthDaysRemaining =
            includedMonthActive && includedMonthEndsAt
                ? Math.max(
                    0,
                    Math.ceil((new Date(includedMonthEndsAt).getTime() - now) / MS_PER_DAY)
                )
                : null;

        return {
            arenaId: row.arena.id,
            name: row.arena.name,
            tierLabel: arenaTierLabel(row.hosting?.tier),
            statusLabel: STATUS_LABELS[status],
            status,
            // The included month is free, so no price is shown while it runs.
            monthlyPriceLabel: includedMonthActive ? null : formatCents(monthlyCents),
            needsAttention: ARENA_ATTENTION_STATUSES.has(status),
            includedMonthActive,
            includedMonthDaysRemaining,
        };
    });

    return {
        ownedCount: rows.length,
        attentionCount: lines.filter((line) => line.needsAttention).length,
        activeMonthlyTotalLabel: formatCents(monthlyTotalCents),
        lines,
    };
};
