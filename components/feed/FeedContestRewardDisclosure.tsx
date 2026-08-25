"use client";

import { useId, useState } from "react";
import type { StructuredFeedContestReward } from "./types";

/* ============================================================================
 * The Arena prize strip under a contest update card.
 *
 * Ported from the MVP's components/feed/FeedContestRewardDisclosure.tsx. The
 * MVP's `finalized` variant — which names each prize's winner and warns about a
 * prize-relevant tie — is NOT ported: it hangs off a `contest_results` record
 * this app does not have yet, so every branch of it would be unreachable. When
 * results posts land, that variant comes back with them rather than shipping
 * dead now.
 * ========================================================================== */

type FeedContestRewardDisclosureProps = {
    accent: "sky" | "violet";
    contestName: string;
    reward: StructuredFeedContestReward;
};

const disclosureTone = {
    sky: {
        border: "border-blue-400/10",
        focusRing: "focus-visible:ring-blue-400/70",
        title: "text-blue-300",
        meta: "text-blue-400/55",
        icon: "border-blue-400/15 text-blue-300",
        row: "border-blue-400/15 bg-blue-400/[0.055]",
        placement: "text-blue-200/80",
    },
    violet: {
        border: "border-violet-200/10",
        focusRing: "focus-visible:ring-violet-300/70",
        title: "text-violet-100",
        meta: "text-violet-200/55",
        icon: "border-violet-200/15 text-violet-100",
        row: "border-violet-200/15 bg-violet-400/[0.055]",
        placement: "text-violet-100/80",
    },
} as const;

const placementLabel = (rank: number) => {
    const moduloHundred = rank % 100;
    const suffix =
        moduloHundred >= 11 && moduloHundred <= 13
            ? "th"
            : rank % 10 === 1
                ? "st"
                : rank % 10 === 2
                    ? "nd"
                    : rank % 10 === 3
                        ? "rd"
                        : "th";

    return `${rank}${suffix} Place`;
};

const DisclosureChevron = ({ direction }: { direction: "up" | "down" }) => (
    <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
    </svg>
);

export const FeedContestRewardDisclosure = ({
    accent,
    contestName,
    reward,
}: FeedContestRewardDisclosureProps) => {
    const [open, setOpen] = useState(false);
    const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const panelId = `feed-contest-rewards-${generatedId}`;
    const tone = disclosureTone[accent];
    const prizes = reward.prizes
        .slice()
        .sort((left, right) => left.place - right.place);
    const prizeCount = prizes.length;
    const rewardNoun = prizeCount === 1 ? "reward" : "rewards";
    const prizeNoun = prizeCount === 1 ? "prize" : "prizes";

    return (
        <div
            data-feed-contest-reward-disclosure="update"
            className={`border-t bg-[#0b0b0b] ${tone.border}`}
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={
                    open
                        ? `Hide contest ${rewardNoun} for ${contestName}`
                        : `View ${prizeCount} contest ${rewardNoun} for ${contestName}`
                }
                data-feed-contest-reward-disclosure-toggle
                onClick={() => setOpen((current) => !current)}
                className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset sm:px-4 ${tone.focusRing}`}
            >
                <span className="min-w-0 flex-1">
                    <span className={`block text-[10px] font-normal normal-case tracking-normal ${tone.title}`}>
                        {open ? `Hide ${rewardNoun}` : `View ${rewardNoun}`}
                    </span>
                    <span className={`mt-0.5 block truncate text-[9px] ${tone.meta}`}>
                        {prizeCount} {prizeNoun} · {reward.settlementLabel}
                    </span>
                </span>
                <span
                    aria-hidden="true"
                    data-feed-contest-reward-disclosure-icon
                    data-disclosure-state={open ? "expanded" : "collapsed"}
                    data-disclosure-direction={open ? "up" : "down"}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white/[0.04] ${tone.icon}`}
                >
                    <DisclosureChevron direction={open ? "up" : "down"} />
                </span>
            </button>

            {open ? (
                <div
                    id={panelId}
                    role="region"
                    aria-label={`${contestName} reward details`}
                    data-feed-contest-reward="update"
                    data-feed-contest-reward-prize-count={prizeCount}
                    className="border-t border-white/10 p-2 sm:p-3"
                >
                    <ol
                        aria-label={`${contestName} prize placements`}
                        className="grid gap-2"
                    >
                        {prizes.map((prize) => (
                            <li
                                key={prize.place}
                                data-feed-contest-reward-place={prize.place}
                                className={`min-w-0 rounded-lg border px-3 py-2 ${tone.row}`}
                            >
                                <div className="flex min-w-0 items-baseline justify-between gap-2">
                                    <p className="min-w-0 truncate text-[11px] font-extrabold text-white">
                                        {prize.title}
                                    </p>
                                    {prize.approximateValue ? (
                                        <span className="shrink-0 text-[8px] font-semibold text-slate-400">
                                            Approx. {prize.approximateValue}
                                        </span>
                                    ) : null}
                                </div>
                                <p className={`mt-0.5 truncate text-[9px] font-bold ${tone.placement}`}>
                                    {placementLabel(prize.place)}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-[9px] leading-3.5 text-slate-400">
                                    {prize.description}
                                </p>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-2 truncate px-1 text-[9px] font-semibold text-slate-300">
                        Provided by {reward.providerName}
                    </p>
                </div>
            ) : null}
        </div>
    );
};

export default FeedContestRewardDisclosure;
