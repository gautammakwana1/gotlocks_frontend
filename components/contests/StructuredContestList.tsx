"use client";

import Link from "next/link";
import { useState } from "react";
import type { FeedContest } from "@/lib/interfaces/interfaces";
import { ContestPreviewCard } from "./preview/ContestPreviewCard";
import { buildFeedContestPreviewModel } from "./preview/feedContestPreview";
import type { ContestPreviewAccent } from "./preview/model";

type ContestAccent = "sky" | "violet";
type ContestListPresentation = "panel" | "hub";
type ContestSectionId = "open" | "locked" | "finalized";

const contestAccentTone = {
    sky: {
        create:
            "border-sky-300/35 bg-sky-500/10 text-sky-100 hover:border-sky-200/70 hover:bg-sky-500/15",
    },
    violet: {
        create:
            "border-violet-300/35 bg-violet-500/10 text-violet-100 hover:border-violet-200/70 hover:bg-violet-500/15",
    },
} as const;

const sectionDetails: Record<
    ContestSectionId,
    { label: string; description: string; empty: string }
> = {
    open: {
        label: "Open",
        description: "Entry timing and availability",
        empty: "No contests are open right now.",
    },
    locked: {
        label: "Locked",
        description: "Live standings update automatically",
        empty: "No contests are locked right now.",
    },
    finalized: {
        label: "Finalized",
        description: "Completed results",
        empty: "No finalized contest results yet.",
    },
};

const sectionCountAdjective: Record<ContestSectionId, string> = {
    open: "open",
    locked: "locked",
    finalized: "finalized",
};

/**
 * Six server lifecycle states onto the card's three sections. Kept in step with
 * `visualStateFor` in feedContestPreview — a contest must land in the section
 * whose artwork treatment its card is about to draw.
 */
const sectionFor = (
    status: FeedContest["lifecycle_status"]
): ContestSectionId => {
    if (status === "open") return "open";
    if (status === "locked" || status === "grading") return "locked";
    return "finalized";
};

const contestSortTimestamp = (contest: FeedContest) =>
    contest.finalized_at ?? contest.expected_ends_at ?? contest.locks_at ?? "";

const sortContests = (
    sectionId: ContestSectionId,
    contests: readonly FeedContest[]
) =>
    [...contests].sort((left, right) =>
        sectionId === "open"
            ? (left.locks_at ?? "").localeCompare(right.locks_at ?? "")
            : contestSortTimestamp(right).localeCompare(contestSortTimestamp(left))
    );

export type StructuredContestListProps = {
    title: string;
    description?: string;
    contests: readonly FeedContest[];
    currentUserId?: string;
    detailHref: (contest: FeedContest) => string;
    entryHref?: (contest: FeedContest) => string;
    /** FALSE for Arena staff barred from competing, or read-only hosting. */
    entryWritable?: boolean;
    organizer?: boolean;
    staffNoncompetitive?: boolean;
    createHref?: string;
    createDisabledReason?: string;
    emptyTitle?: string;
    emptyBody?: string;
    className?: string;
    accent?: ContestAccent;
    presentation?: ContestListPresentation;
};

export const StructuredContestList = ({
    title,
    description,
    contests,
    detailHref,
    entryHref,
    entryWritable = true,
    organizer = false,
    staffNoncompetitive = false,
    createHref,
    createDisabledReason,
    emptyTitle = "No Feed contests yet",
    emptyBody = "New contests will appear here when an organizer makes them available.",
    className = "",
    accent = "sky",
    presentation = "panel",
}: StructuredContestListProps) => {
    const accentTone = contestAccentTone[accent];
    const previewAccent: ContestPreviewAccent = accent === "violet" ? "arena" : "league";
    const isHubPresentation = presentation === "hub";
    const now = Date.now();
    // Finalized starts collapsed: it only grows, and the open round is what an
    // organizer opened the tab for.
    const [expandedSections, setExpandedSections] = useState<
        Record<ContestSectionId, boolean>
    >({ open: true, locked: true, finalized: false });

    const groupedContests = contests.reduce<Record<ContestSectionId, FeedContest[]>>(
        (groups, contest) => {
            groups[sectionFor(contest.lifecycle_status)].push(contest);
            return groups;
        },
        { open: [], locked: [], finalized: [] }
    );
    const primaryContestCount =
        groupedContests.open.length +
        groupedContests.locked.length +
        groupedContests.finalized.length;
    const sections: ContestSectionId[] = ["open", "locked", "finalized"];

    const renderContestCard = (contest: FeedContest) => (
        <ContestPreviewCard
            key={contest.id}
            headingLevel={4}
            className="h-full self-stretch"
            preview={buildFeedContestPreviewModel({
                contest,
                detailHref: detailHref(contest),
                entryHref: entryHref?.(contest),
                accent: previewAccent,
                // Staff who cannot compete never get an entry action, whatever
                // the contest's own state says.
                entryWritable: entryWritable && !staffNoncompetitive,
                now,
            })}
        />
    );

    return (
        <section
            aria-label={title}
            className={`${isHubPresentation
                ? "space-y-6"
                : "space-y-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
                } ${className}`.trim()}
        >
            {!isHubPresentation ? (
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                                {description}
                            </p>
                        ) : null}
                    </div>

                    {organizer && createHref ? (
                        <Link
                            href={createHref}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${accentTone.create}`}
                        >
                            <span aria-hidden>+</span>
                            Create contest
                        </Link>
                    ) : organizer && createDisabledReason ? (
                        <span
                            aria-disabled="true"
                            title={createDisabledReason}
                            className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600"
                        >
                            Create unavailable
                        </span>
                    ) : null}
                </header>
            ) : null}

            {staffNoncompetitive ? (
                <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-100">
                        Organizer · noncompetitive
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/70">
                        Arena owners and managers can operate contests, but cannot join, rank,
                        or earn Arena Points.
                    </p>
                </div>
            ) : null}

            {!isHubPresentation && createDisabledReason ? (
                <p className="text-xs leading-5 text-amber-100/80">{createDisabledReason}</p>
            ) : null}

            <div
                data-contest-phase-dividers={isHubPresentation ? "inset" : undefined}
                className={isHubPresentation ? "-mx-5 sm:mx-0" : ""}
            >
                {sections.map((sectionId) => {
                    const details = sectionDetails[sectionId];
                    const sectionContests = sortContests(sectionId, groupedContests[sectionId]);
                    const useInitialEmptyCopy =
                        sectionId === "open" && primaryContestCount === 0;

                    return (
                        <details
                            key={sectionId}
                            open={expandedSections[sectionId]}
                            onToggle={(event) => {
                                const expanded = event.currentTarget.open;
                                setExpandedSections((current) =>
                                    current[sectionId] === expanded
                                        ? current
                                        : { ...current, [sectionId]: expanded }
                                );
                            }}
                            className="border-t border-white/15 py-4 last:border-b"
                        >
                            <summary
                                className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden ${isHubPresentation ? "px-5 sm:px-6" : ""
                                    }`}
                            >
                                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                                    <h3
                                        aria-label={`${sectionContests.length} ${sectionCountAdjective[sectionId]} ${sectionContests.length === 1 ? "contest" : "contests"}`}
                                        className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                                    >
                                        {details.label}:{" "}
                                        <span className="tabular-nums text-gray-400">
                                            {sectionContests.length}
                                        </span>
                                    </h3>
                                    <p className="ml-auto truncate text-right text-[11px] text-gray-500">
                                        {details.description}
                                    </p>
                                </div>
                                <span aria-hidden className="text-sm text-gray-500">
                                    {expandedSections[sectionId] ? "▴" : "▾"}
                                </span>
                            </summary>

                            {sectionContests.length > 0 ? (
                                <div
                                    data-contest-preview-phase={sectionId}
                                    data-contest-preview-layout={
                                        sectionId === "finalized"
                                            ? "compact-responsive-grid"
                                            : "responsive-grid"
                                    }
                                    className={`mt-3 grid items-stretch ${sectionId === "finalized"
                                        ? "auto-rows-fr grid-cols-1 gap-2 lg:grid-cols-2"
                                        : "gap-3 md:grid-cols-2"
                                        } ${isHubPresentation ? "px-5 sm:px-6" : ""}`}
                                >
                                    {sectionContests.map(renderContestCard)}
                                </div>
                            ) : (
                                <div
                                    className={`mt-3 ${isHubPresentation
                                        ? "mx-5 rounded-lg border border-dashed border-white/15 bg-black/30 px-4 py-3 text-sm text-gray-500 sm:mx-6"
                                        : "rounded-xl border border-dashed border-white/15 bg-black/25 px-4 py-3 text-sm text-gray-500"
                                        }`}
                                >
                                    {useInitialEmptyCopy ? (
                                        <>
                                            <p className="font-semibold text-white">{emptyTitle}</p>
                                            <p className="mt-1 leading-5">{emptyBody}</p>
                                        </>
                                    ) : (
                                        <p>{details.empty}</p>
                                    )}
                                </div>
                            )}
                        </details>
                    );
                })}
            </div>
        </section>
    );
};

export default StructuredContestList;
