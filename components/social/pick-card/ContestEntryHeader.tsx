"use client";

import Link from "next/link";
import { getContestEntryFeedHeaderLabel } from "@/lib/feed/contestEntryHeader";
import type { ContestPresentation } from "./types";

/* ----------------------------------------------------------------------------
 * The contest an entry belongs to, NAMED in the link:
 * "April NBA Playoffs · Feed Pick'em Contest Entry ↗".
 *
 * It replaced the bare "Slip Contest Entry" / "Feed Contest Entry" labels, which
 * said nothing useful in a feed that mixes contests. The wording itself lives in
 * `lib/feed/contestEntryHeader` because the Feed tab's record header and this
 * card header must not spell the same entry two different ways — which is
 * exactly what happened while this component inlined its own copy.
 *
 * `items-start` with a wrapping label, not `items-center` on one line: a contest
 * name is arbitrary length and the arrow has to stay pinned to the first line.
 * -------------------------------------------------------------------------- */

export type ContestEntryHeaderProps = {
    presentation: ContestPresentation;
    className?: string;
};

export const ContestEntryHeader = ({
    presentation,
    className = "",
}: ContestEntryHeaderProps) => {
    const entryFormat =
        presentation.kind === "feed_contest" ? presentation.entryFormat : undefined;
    const label = getContestEntryFeedHeaderLabel({
        format:
            presentation.kind === "slip_contest"
                ? "fantasy"
                : // The picks read cannot always name the builder; General Combo
                // is the same fallback the card body falls back to.
                entryFormat ?? "general_combo",
        contestName: presentation.contestName,
    });

    return (
        <Link
            data-feed-contest-entry-link
            data-feed-entry-format={entryFormat}
            href={presentation.contestHref}
            className={`inline-flex min-h-6 min-w-0 items-start gap-1 text-left font-semibold uppercase tracking-wide text-slate-300 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`.trim()}
        >
            <span className="min-w-0 break-words">{label}</span>
            <span aria-hidden="true" className="shrink-0">↗</span>
        </Link>
    );
};

export default ContestEntryHeader;
