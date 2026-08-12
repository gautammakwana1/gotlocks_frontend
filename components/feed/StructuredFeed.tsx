"use client";

import { useMemo, useRef, useState } from "react";
import PostComposerIcon from "@/components/ui/PostComposerIcon";
import { getFeedZebraRowClassName } from "@/components/social/feedRowTone";
import { GroupFeedPostDrawer } from "./GroupFeedPostDrawer";
import { StructuredFeedCard } from "./StructuredFeedCard";
import { StructuredFeedReplacementComposer } from "./StructuredFeedReplacementComposer";
import {
    getStructuredFeedRecordSearchText,
    structuredFeedRecordMatchesFilter,
} from "./formatters";
import type {
    StructuredFeedFilter,
    StructuredFeedProps,
    StructuredFeedRecord,
} from "./types";

// The MVP's two record chips, plus Standings when the host supplies that node.
// There is no "All": Community already carries every non-contest record.
const FEED_FILTERS: readonly { id: StructuredFeedFilter; label: string }[] = [
    { id: "community", label: "Community" },
    { id: "competitive", label: "Contest Entries" },
];

const feedChromeTone = {
    sky: {
        band: "bg-sky-950/20 bg-gradient-to-b from-black via-black/40 to-transparent",
        input: "focus:border-sky-300/60",
        selectedFilter: "border-sky-300/50 bg-sky-500/15 text-sky-100",
    },
    violet: {
        band: "bg-violet-950/20 bg-gradient-to-b from-black via-black/40 to-transparent",
        input: "focus:border-violet-300/60",
        selectedFilter: "border-violet-300/50 bg-violet-500/15 text-violet-100",
    },
} as const;

export const StructuredFeed = ({
    context,
    currentRole,
    capabilities,
    records,
    selectionOptions,
    contestOptions = [],
    communityPickWindow,
    initialFilter = "community",
    standings,
    currentUserId,
    onReaction,
    getPickReactionSummary,
    onSubmit,
    onSubmitBuiltPicks,
    onReplaceSubmit,
    onReplace,
    onDelete,
    onEdit,
    onPin,
    emptyMessage = "No Feed activity yet.",
    className = "",
}: StructuredFeedProps) => {
    const [filter, setFilter] = useState<StructuredFeedFilter>(
        initialFilter === "standings" && !standings ? "community" : initialFilter
    );
    const [search, setSearch] = useState("");
    const [composerOpen, setComposerOpen] = useState(false);
    const composerTriggerRef = useRef<HTMLButtonElement>(null);
    const [replacementRecord, setReplacementRecord] = useState<StructuredFeedRecord | null>(null);
    const [replacementStatus, setReplacementStatus] = useState<string>();
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const accent = context.kind === "arena" ? "violet" : "sky";
    const chromeTone = feedChromeTone[accent];

    const canCompose =
        capabilities.canCreateCommunityPick ||
        capabilities.canCreateCompetitivePick ||
        capabilities.canCreateStaffPick ||
        capabilities.canCreateStaffPost;

    const filterOptions = standings
        ? [...FEED_FILTERS, { id: "standings" as const, label: "Standings" }]
        : FEED_FILTERS;

    const visibleRecords = useMemo(
        () =>
            records.filter(
                (record) =>
                    structuredFeedRecordMatchesFilter(record, filter) &&
                    (!normalizedSearch ||
                        getStructuredFeedRecordSearchText(record, context).includes(normalizedSearch))
            ),
        [context, filter, normalizedSearch, records]
    );

    const showStandings = filter === "standings" && Boolean(standings);
    // The Contest Entries chip counts entries, not posts — same wording as the MVP.
    const isContestEntries = filter === "competitive";
    const resultCountLabel = isContestEntries
        ? visibleRecords.length === 1
            ? "entry"
            : "entries"
        : visibleRecords.length === 1
            ? "post"
            : "posts";
    // With no "All" chip the empty copy has to name the view the organizer is
    // actually looking at, or an empty Contest Entries tab reads as an empty Feed.
    const emptyTitle = normalizedSearch
        ? isContestEntries
            ? "No matching contest entries"
            : "No matching community posts"
        : isContestEntries
            ? "No contest entries to show yet"
            : emptyMessage;

    return (
        <section aria-label={`${context.name} Feed`} className={className}>
            {replacementRecord && onReplaceSubmit ? (
                <div className="pb-5">
                    <StructuredFeedReplacementComposer
                        context={context}
                        record={replacementRecord}
                        selectionOptions={selectionOptions}
                        onSubmit={onReplaceSubmit}
                        onCancel={() => setReplacementRecord(null)}
                        onAccepted={(message) => {
                            setReplacementRecord(null);
                            setReplacementStatus(message);
                        }}
                    />
                </div>
            ) : null}

            {replacementStatus ? (
                <div className="pb-5">
                    <p role="status" className="text-sm text-emerald-200">
                        {replacementStatus}
                    </p>
                </div>
            ) : null}

            <div className={`-mx-5 space-y-3 px-5 py-4 sm:mx-0 sm:px-4 ${chromeTone.band}`}>
                <div className="flex items-stretch gap-3">
                    {canCompose ? (
                        <button
                            ref={composerTriggerRef}
                            type="button"
                            onClick={() => setComposerOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={composerOpen}
                            className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/10 bg-black/60 px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-white/20 hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 motion-reduce:transition-none sm:gap-2 sm:px-3.5 sm:text-xs sm:tracking-[0.1em]"
                        >
                            <span>New post</span>
                            <PostComposerIcon className="h-5 w-5" />
                        </button>
                    ) : null}
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Search Feed</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search picks, people, contests, and posts"
                            className={`h-12 w-full rounded-xl border border-white/10 bg-black/60 px-4 text-sm normal-case text-white outline-none transition placeholder:text-gray-600 ${chromeTone.input}`}
                        />
                    </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div role="group" aria-label="Feed filters" className="flex flex-wrap gap-2">
                        {filterOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                aria-pressed={filter === option.id}
                                onClick={() => setFilter(option.id)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${filter === option.id
                                    ? chromeTone.selectedFilter
                                    : "border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-200"
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {filter !== "standings" ? (
                        <p aria-live="polite" className="text-xs text-gray-500">
                            {visibleRecords.length} {resultCountLabel}
                        </p>
                    ) : null}
                </div>
            </div>

            {showStandings ? (
                <div
                    aria-label="Feed standings"
                    className="-mx-5 border-t border-white/10 px-5 pt-4 sm:mx-0 sm:px-0"
                >
                    {standings}
                </div>
            ) : visibleRecords.length ? (
                // One continuous striped list rather than detached cards, so an
                // announcement and a pick post read as rows of the same feed.
                <div
                    className="-mx-5 divide-y divide-white/10 overflow-visible border-y border-white/10 sm:mx-0"
                    aria-label="Feed posts"
                >
                    {visibleRecords.map((record, index) => (
                        <StructuredFeedCard
                            key={record.id}
                            context={context}
                            record={record}
                            className={getFeedZebraRowClassName(index)}
                            currentUserId={currentUserId}
                            onReaction={onReaction}
                            getPickReactionSummary={getPickReactionSummary}
                            onReplace={
                                onReplaceSubmit
                                    ? (selectedRecord) => {
                                        setReplacementRecord(selectedRecord);
                                        setReplacementStatus(undefined);
                                        onReplace?.(selectedRecord);
                                    }
                                    : undefined
                            }
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onPin={onPin}
                        />
                    ))}
                </div>
            ) : (
                <div className="-mx-5 border-t border-white/10 px-5 pt-5 sm:mx-0 sm:px-0">
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 p-6">
                        <p className="font-semibold text-white">{emptyTitle}</p>
                        {normalizedSearch ? (
                            <p className="mt-2 text-sm text-gray-500">
                                Try another search or switch the Feed filter.
                            </p>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Mounted only while open so the Pick Builder chunk (and its data
                fetching) is not paid for by every Feed render. */}
            {composerOpen ? (
                <GroupFeedPostDrawer
                    open={composerOpen}
                    onClose={() => setComposerOpen(false)}
                    returnFocusRef={composerTriggerRef}
                    context={context}
                    contextName={context.name}
                    currentRole={currentRole}
                    capabilities={capabilities}
                    selectionOptions={selectionOptions}
                    contestOptions={contestOptions}
                    communityPickWindow={communityPickWindow}
                    onSubmit={onSubmit}
                    onSubmitBuiltPicks={onSubmitBuiltPicks}
                    onPostComplete={() => setComposerOpen(false)}
                />
            ) : null}
        </section>
    );
};

export default StructuredFeed;
