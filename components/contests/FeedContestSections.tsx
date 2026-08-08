"use client";

import { useState } from "react";
import { FeedContestCard, type ContestAccent } from "./FeedContestCard";
import type { FeedContestSection } from "@/lib/interfaces/interfaces";
import type { FeedContestSectionState } from "@/lib/redux/slices/feedContestSlice";

/* ----------------------------------------------------------------------------
 * The contest hub's phase sections, ported from the MVP's StructuredContestList
 * (gotlocks.app_mvp2/components/contests/StructuredContestList.tsx:376-506).
 *
 * The MVP groups ONE in-memory array by phase; here each section is its own
 * server-owned query (`/group/feed-contest/list/:section` fixes the status set,
 * the sort AND the pagination), so the counts come from the server and each
 * section carries its own loading, error and "Show more" state. The chrome is
 * the MVP's: a native <details> accordion, `Label: count` on the left, the
 * phase's one-line description right-aligned, and a chevron.
 *
 * `<details>` rather than a div + state because it is the MVP's element and it
 * gives keyboard operation, the disclosure role and find-in-page expansion for
 * free. `open` is still mirrored into state so the chevron can follow it.
 * -------------------------------------------------------------------------- */

const SECTION_DETAILS: Record<
    FeedContestSection,
    { label: string; description: string; empty: string; countNoun: string }
> = {
    open: {
        label: "Open",
        description: "Accepting entries or opening soon",
        empty: "No contests are open right now.",
        countNoun: "open",
    },
    locked: {
        label: "Locked",
        description: "Live standings update automatically",
        empty: "No contests are locked right now.",
        countNoun: "locked",
    },
    finalized: {
        label: "Finalized",
        description: "Completed contest history",
        empty: "No finalized contest results yet.",
        countNoun: "finalized",
    },
    drafts: {
        label: "Drafts",
        description: "Organizer-only and not published",
        empty: "No contest drafts.",
        countNoun: "draft",
    },
    archived: {
        label: "Archived",
        description: "Moved into community history",
        empty: "No archived contests.",
        countNoun: "archived",
    },
};

const MEMBER_SECTIONS: FeedContestSection[] = ["open", "locked", "finalized"];

/** The MVP's initial disclosure state — everything but Finalized starts open. */
const DEFAULT_EXPANDED: Record<FeedContestSection, boolean> = {
    open: true,
    locked: true,
    finalized: false,
    drafts: true,
    // History, like Finalized: present but not competing for attention.
    archived: false,
};

export type FeedContestSectionsProps = {
    /** Names the region, as the MVP's `title` does — e.g. "League Feed contests". */
    title: string;
    sections: Record<FeedContestSection, FeedContestSectionState>;
    organizer: boolean;
    /** Omit to render non-navigable cards — a surface with no detail route yet. */
    detailHref?: (contestId: string) => string;
    onLoadMore: (section: FeedContestSection) => void;
    emptyTitle: string;
    emptyBody: string;
    /**
     * The contest capacity each card reports against. The MVP passes the group's
     * member count — everyone could enter, so "spots remaining" is how many
     * members have not. Omit for an uncapped surface.
     */
    participantLimit?: number | null;
    accent?: ContestAccent;
};

export const FeedContestSections = ({
    title,
    sections,
    organizer,
    detailHref,
    onLoadMore,
    emptyTitle,
    emptyBody,
    participantLimit = null,
    accent = "sky",
}: FeedContestSectionsProps) => {
    const [expandedSections, setExpandedSections] =
        useState<Record<FeedContestSection, boolean>>(DEFAULT_EXPANDED);

    const publishedCount = MEMBER_SECTIONS.reduce(
        (total, id) => total + (sections[id].contests?.length ?? 0),
        0
    );
    const draftCount = sections.drafts.contests?.length ?? 0;
    const archivedCount = sections.archived.contests?.length ?? 0;

    // Drafts are organizer-only (/list/drafts answers 403 for anyone else) AND
    // appear only once one exists — the MVP pushes the section on
    // `organizer && drafts.length > 0`, so an organizer who has never saved a
    // draft sees three sections rather than an empty fourth.
    //
    // Archived follows the same appear-when-non-empty rule (the MVP does this
    // for its History section) but is NOT organizer-gated: 'archived' is in
    // MEMBER_VISIBLE_CONTEST_STATUSES, so /list/archived answers 200 for every
    // member. It sits last — it is the terminal state.
    const visibleSections: FeedContestSection[] = [
        ...MEMBER_SECTIONS,
        ...(organizer && draftCount > 0 ? (["drafts"] as const) : []),
        ...(archivedCount > 0 ? (["archived"] as const) : []),
    ];

    // Deliberately NOT derived from `visibleSections`: the drafts and archived
    // queries are still in flight while their sections are hidden, and reading
    // only the visible ones would let the "nothing here yet" copy flash a beat
    // before they land.
    const loadingSections: FeedContestSection[] = [
        ...MEMBER_SECTIONS,
        ...(organizer ? (["drafts"] as const) : []),
        "archived",
    ];
    const stillLoading = loadingSections.some(
        (id) => sections[id].loading && sections[id].contests === null
    );

    return (
        <section aria-label={title} className="space-y-6">
        {/* Bled to the viewport edges so the section rules run full width, exactly
            as the MVP's `presentation="hub"` does; the rows re-inset themselves. */}
        <div data-contest-phase-dividers="inset" className="-mx-5 sm:mx-0">
            {visibleSections.map((sectionId) => {
                const details = SECTION_DETAILS[sectionId];
                const section = sections[sectionId];
                const contests = section.contests ?? [];
                const isLoadingFirstPage = section.loading && section.contests === null;
                // Only the first section carries the "nothing here at all yet" copy,
                // and only once every section has actually reported in.
                const useInitialEmptyCopy =
                    sectionId === "open" &&
                    !stillLoading &&
                    publishedCount === 0 &&
                    draftCount === 0;

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
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:px-6 [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                                <h3
                                    aria-label={`${section.total} ${details.countNoun} ${section.total === 1 ? "contest" : "contests"}`}
                                    className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                                >
                                    {details.label}:{" "}
                                    <span className="tabular-nums text-gray-400">
                                        {section.total}
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

                        {isLoadingFirstPage ? (
                            <div className="mt-3 grid items-stretch gap-3 px-5 md:grid-cols-2 sm:px-6">
                                {[0, 1].map((key) => (
                                    <div
                                        key={key}
                                        className="min-h-[190px] animate-pulse rounded-lg border border-white/5 bg-white/[0.02] lg:min-h-[220px]"
                                    />
                                ))}
                            </div>
                        ) : contests.length ? (
                            <div className="mt-3 space-y-3">
                                <div className="grid items-stretch gap-3 px-5 md:grid-cols-2 sm:px-6">
                                    {contests.map((contest) => (
                                        <FeedContestCard
                                            key={contest.id}
                                            contest={contest}
                                            href={detailHref?.(contest.id)}
                                            accent={accent}
                                            presentation="hub"
                                            participantLimit={participantLimit}
                                            // An organizer operates the contest; a draft
                                            // never shows a join/entry state.
                                            hideParticipantState={sectionId === "drafts"}
                                        />
                                    ))}
                                </div>
                                {section.hasMore ? (
                                    <div className="flex justify-center px-5 pt-1 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => onLoadMore(sectionId)}
                                            disabled={section.loading}
                                            className="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {section.loading ? "Loading..." : "Show More"}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mx-5 mt-3 rounded-lg border border-dashed border-white/15 bg-black/30 px-4 py-3 text-sm text-gray-500 sm:mx-6">
                                {useInitialEmptyCopy ? (
                                    <>
                                        <p className="font-semibold text-white">{emptyTitle}</p>
                                        <p className="mt-1 leading-5">{emptyBody}</p>
                                    </>
                                ) : (
                                    <p>{section.error ?? details.empty}</p>
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

export default FeedContestSections;
