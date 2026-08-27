import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";

import {
    CONTEST_POST_HEADER_TONES,
    CONTEST_POST_PRIMARY_TONES,
} from "@/lib/styles/postCards";
import { FeedContestRewardDisclosure } from "./FeedContestRewardDisclosure";
import type { StructuredFeedContextMetadata, StructuredFeedRecord } from "./types";

/* ============================================================================
 * The live contest-status card in the Feed's Updates view.
 *
 * Ported from the MVP's components/feed/ContestUpdateContent.tsx with the
 * markup verbatim. One difference: no `upcoming` status. The API's updates read
 * filters out contests whose opens_at is still in the future, so "Opening soon"
 * is unreachable here and carrying it would be a branch nothing can enter.
 * ========================================================================== */

type ContestUpdateContentProps = {
    record: StructuredFeedRecord;
    accent: "sky" | "violet";
    contextKind: StructuredFeedContextMetadata["kind"];
};

const templateLabels = {
    general_combo: "Feed Combo Contest",
    sunday_pickem: "Feed Pick’em Contest",
    td_psychic: "Feed TD Psychic Contest",
} as const;

const statusCopy = {
    open: { label: "Open for entries", dot: "bg-emerald-300" },
    locked: { label: "Locked · Live", dot: "bg-rose-300" },
} as const;

const initialsFor = (name: string) => {
    const parts = name
        .replace(/^@/, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    return (parts.length > 1
        ? parts.map((part) => part[0] ?? "").join("")
        : parts[0]?.slice(0, 2) ?? "?")
        .toUpperCase();
};

export const ContestUpdateContent = ({
    record,
    accent,
    contextKind,
}: ContestUpdateContentProps) => {
    const update = record.contestUpdate;
    const contest = record.contest;
    if (!update || !contest?.href) return null;

    const status = statusCopy[update.status];
    // Structurally Arena-only — feed_contest_rewards carries an arena_only
    // CHECK — but gated here too so a League can never draw a prize strip.
    const reward = contextKind === "arena" ? contest.reward : undefined;
    const entrantSummary =
        update.status === "locked"
            ? `${update.entrantCount} total ${update.entrantCount === 1 ? "entry" : "entries"
            }`
            : update.entrantCount
                ? `${update.entrantCount} joined`
                : "Be the first to enter";
    const recentEntrantNames = update.entrants
        .map((entrant) =>
            entrant.handle
                ? `@${entrant.handle.replace(/^@/, "")}`
                : entrant.displayName,
        )
        .join(", ");
    const accessibleLabel = [
        `View ${contest.name} contest`,
        status.label,
        entrantSummary,
        update.timingLabel,
        recentEntrantNames ? `Recent entrants: ${recentEntrantNames}` : null,
    ]
        .filter(Boolean)
        .join(". ");
    // The "+N" chip: the whole field minus the four the stack draws.
    const overflowCount = Math.max(
        0,
        update.entrantCount - update.entrants.length,
    );

    return (
        <section
            data-feed-contest-update-shell
            className={`mt-3 overflow-hidden rounded-xl border transition hover:-translate-y-px hover:border-white/20 motion-reduce:transform-none motion-reduce:transition-none ${CONTEST_POST_PRIMARY_TONES[accent]}`}
        >
            <Link
                href={contest.href}
                aria-label={accessibleLabel}
                data-feed-contest-update
                data-feed-contest-update-status={update.status}
                data-feed-contest-update-entrant-count={update.entrantCount}
                className="block transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 motion-reduce:transition-none"
            >
                <div
                    data-feed-contest-update-header
                    className={`flex min-w-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2 ${CONTEST_POST_HEADER_TONES[accent]}`}
                >
                    <span className="flex min-w-0 items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-100">
                        <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_9px_currentColor] ${status.dot}`}
                        />
                        <span className="truncate">{status.label}</span>
                    </span>
                    <span className="shrink-0 text-[9px] font-semibold text-slate-300">
                        View contest <AnimatedArrow direction="up-right" />
                    </span>
                </div>

                <div
                    data-feed-contest-update-body
                    className="bg-[#0b0b0b] px-3 py-3"
                >
                    <div className="min-w-0">
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-white">
                                {contest.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                                {templateLabels[update.template]}
                            </span>
                        </span>
                    </div>

                    <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                        <span
                            role="group"
                            aria-label={`${entrantSummary} in ${contest.name}`}
                            className="flex min-w-0 items-center"
                        >
                            {update.entrants.length ? (
                                <span
                                    aria-hidden="true"
                                    className="flex shrink-0 -space-x-1.5"
                                    data-feed-contest-update-entrants="stack"
                                >
                                    {update.entrants.map((entrant) => (
                                        <span
                                            key={entrant.id}
                                            title={entrant.handle ? `@${entrant.handle.replace(/^@/, "")}` : entrant.displayName}
                                            className="grid h-6 w-6 place-items-center rounded-full border border-[#0b0b0b] bg-gradient-to-br from-slate-200 to-slate-500 text-[7px] font-black text-slate-950 ring-1 ring-white/15"
                                        >
                                            {initialsFor(entrant.displayName)}
                                        </span>
                                    ))}
                                    {overflowCount > 0 ? (
                                        <span className="grid h-6 min-w-6 place-items-center rounded-full border border-[#0b0b0b] bg-slate-800 px-1 text-[7px] font-bold text-slate-200 ring-1 ring-white/15">
                                            +{overflowCount}
                                        </span>
                                    ) : null}
                                </span>
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-[10px] text-slate-500"
                                >
                                    +
                                </span>
                            )}
                            <span className="ml-2 truncate text-[10px] font-semibold text-slate-300">
                                {entrantSummary}
                            </span>
                        </span>
                        <span className="shrink-0 text-right text-[9px] font-medium text-slate-500">
                            {update.timingLabel}
                        </span>
                    </div>
                </div>
            </Link>

            {reward ? (
                <FeedContestRewardDisclosure
                    accent={accent}
                    contestName={contest.name}
                    reward={reward}
                />
            ) : null}
        </section>
    );
};

export default ContestUpdateContent;
