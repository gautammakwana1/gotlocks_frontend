"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CommunitySwipePager } from "@/components/community/CommunitySwipePager";
import PostComposerIcon from "@/components/ui/PostComposerIcon";
import { getFeedZebraRowClassName } from "@/components/social/feedRowTone";
import { ContestEntryFilterDrawer } from "./ContestEntryFilterDrawer";
import { GroupFeedPostDrawer } from "./GroupFeedPostDrawer";
import { StructuredFeedCard } from "./StructuredFeedCard";
import { StructuredFeedReplacementComposer } from "./StructuredFeedReplacementComposer";
import {
    structuredFeedRecordMatchesEntryLifecycle,
    structuredFeedRecordMatchesFilter,
} from "./formatters";
import type {
    ContestEntryLifecycleFilter,
    StructuredFeedFilter,
    StructuredFeedProps,
    StructuredFeedRecord,
} from "./types";

// The MVP's two record views, plus Standings when the host supplies that node.
// There is no "All": Updates already carries every non-entry record.
const FEED_VIEWS: readonly { id: StructuredFeedFilter; label: string }[] = [
    { id: "updates", label: "Updates" },
    { id: "entries", label: "Entries" },
];

const feedChromeTone = {
    sky: {
        band: "bg-blue-400/[0.055] bg-gradient-to-b from-black via-black/40 to-transparent",
        actionIcon:
            "border-blue-400/25 bg-blue-400/10 text-blue-300 group-hover:border-blue-400/45 group-hover:bg-blue-400/15",
        actionFocus: "focus-visible:outline-sky-300",
    },
    violet: {
        band: "bg-violet-950/20 bg-gradient-to-b from-black via-black/40 to-transparent",
        actionIcon:
            "border-violet-300/25 bg-violet-500/10 text-violet-100 group-hover:border-violet-200/45 group-hover:bg-violet-500/15",
        actionFocus: "focus-visible:outline-violet-300",
    },
} as const;

/**
 * Mirrors the MVP's `CONTEST_HUB_ACTION_ICON_CLASS_NAME` /
 * `CONTEST_HUB_ACTION_ACCENT_CLASSES[accent].icon`, so the Feed's header buttons
 * and the Contests tab's create button wear one plate.
 *
 * Held locally rather than imported: the MVP's home for these strings was
 * ContestHubCreateAction, but both hosts here have since moved to
 * ContestCreationDrawer and that component is now orphaned — so there is no
 * shared module left to import them from. If the plate is ever needed in a third
 * place, lift these into a small shared module; do NOT revive
 * ContestHubCreateAction to hold them.
 */
const FEED_ACTION_ICON_CLASS_NAME =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200";

const FilterIcon = () => (
    <svg
        aria-hidden="true"
        data-icon="filters"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-4 w-4 shrink-0"
    >
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4" />
    </svg>
);

const StandingsFlipIcon = () => (
    <svg
        aria-hidden="true"
        data-icon="standings-flip"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
    >
        <path d="M5 7h13M15 4l3 3-3 3M19 17H6M9 14l-3 3 3 3" />
    </svg>
);

export const StructuredFeed = ({
    context,
    currentRole,
    capabilities,
    records,
    selectionOptions,
    contestOptions = [],
    communityPickWindow,
    initialFilter = "updates",
    standings,
    standingsAction,
    winners,
    onCreateAnnouncement,
    createAnnouncementOpen = false,
    createAnnouncementTriggerRef,
    currentUserId,
    onReaction,
    getPickReactionSummary,
    onSubmit,
    onReplaceSubmit,
    onReplace,
    onDelete,
    onEdit,
    onPin,
    emptyMessage = "No Feed activity yet.",
    className = "",
}: StructuredFeedProps) => {
    const [filter, setFilter] = useState<StructuredFeedFilter>(
        initialFilter === "standings" && !standings ? "updates" : initialFilter
    );
    const [entryLifecycleFilter, setEntryLifecycleFilter] =
        useState<ContestEntryLifecycleFilter>("all");
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const filterTriggerRef = useRef<HTMLButtonElement>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const composerTriggerRef = useRef<HTMLButtonElement>(null);
    const [replacementRecord, setReplacementRecord] = useState<StructuredFeedRecord | null>(null);
    const [replacementStatus, setReplacementStatus] = useState<string>();
    const viewPanelId = useId();
    const accent = context.kind === "arena" ? "violet" : "sky";
    const chromeTone = feedChromeTone[accent];

    const canCompose =
        capabilities.canCreateCommunityPick ||
        capabilities.canCreateCompetitivePick ||
        capabilities.canCreateStaffPick ||
        capabilities.canCreateStaffPost;
    /** Same test GroupFeedPostDrawer titles itself with — keep the two in step. */
    const announcementOnlyComposer =
        capabilities.canCreateStaffPost &&
        !capabilities.canCreateCommunityPick &&
        !capabilities.canCreateStaffPick &&
        !capabilities.canCreateCompetitivePick;

    const viewOptions = standings
        ? [...FEED_VIEWS, { id: "standings" as const, label: "Standings" }]
        : FEED_VIEWS;

    // Guarded rather than read straight off state: a host can drop its standings
    // node after mount (the League board is conditional), and the pager clamps an
    // unknown id to index 0 — which would show the Updates label over a body that
    // matched nothing.
    const activeFilter = filter === "standings" && !standings ? "updates" : filter;
    const isContestEntries = activeFilter === "entries";
    const showStandings = activeFilter === "standings";

    // Every contest entry in the Feed, before either filter. The drawer's tally
    // is measured against this.
    const contestEntryRecords = useMemo(
        () => records.filter((record) => structuredFeedRecordMatchesFilter(record, "entries")),
        [records]
    );

    // The view match alone decides membership: Updates is the catch-all (every
    // kind except competitive_pick) and Entries is the competitive_pick list.
    // Inside Entries only, the drawer's lifecycle axis narrows it further.
    const visibleRecords = useMemo(
        () =>
            records.filter(
                (record) =>
                    structuredFeedRecordMatchesFilter(record, activeFilter) &&
                    (!isContestEntries ||
                        structuredFeedRecordMatchesEntryLifecycle(record, entryLifecycleFilter))
            ),
        [activeFilter, entryLifecycleFilter, isContestEntries, records]
    );

    const filteredEntryCount = useMemo(
        () =>
            contestEntryRecords.filter((record) =>
                structuredFeedRecordMatchesEntryLifecycle(record, entryLifecycleFilter)
            ).length,
        [contestEntryRecords, entryLifecycleFilter]
    );

    const entryFilterEmptyLabel =
        entryLifecycleFilter === "open"
            ? "open"
            : entryLifecycleFilter === "locked_live"
                ? "locked or live"
                : entryLifecycleFilter === "settled"
                    ? "settled"
                    : null;
    // With no "All" view the empty copy has to name the view the reader is
    // actually looking at, or an empty Entries page reads as an empty Feed.
    const emptyTitle = isContestEntries
        ? entryFilterEmptyLabel
            ? `No ${entryFilterEmptyLabel} contest entries to show`
            : "No contest entries to show yet"
        : emptyMessage;
    const emptySubline = isContestEntries
        ? entryLifecycleFilter === "all"
            ? "Submitted contest entries will appear here."
            : "Choose another status in Filters to keep browsing."
        : null;

    // The composer trigger is the MVP's announcement icon when the host owns the
    // workspace, and this component's own four-tab drawer otherwise. It is never
    // BOTH: whichever owns it, the header keeps exactly one create affordance.
    const composeAction = onCreateAnnouncement
        ? {
            ref: createAnnouncementTriggerRef,
            onClick: onCreateAnnouncement,
            label: "New Announcement",
            expanded: createAnnouncementOpen,
            action: "create-announcement",
        }
        : canCompose
            ? {
                ref: composerTriggerRef,
                onClick: () => setComposerOpen(true),
                // Announcements are the only thing most viewers can create now
                // that the Pick Post panel is gone, and the drawer titles itself
                // "New Announcement" in that case — so the trigger has to agree,
                // or the button and the panel it opens name different things.
                label: announcementOnlyComposer ? "New Announcement" : "New post",
                expanded: composerOpen,
                action: announcementOnlyComposer ? "create-announcement" : "create-post",
            }
            : null;

    const actionButtonClassName = `group relative ${FEED_ACTION_ICON_CLASS_NAME} ${chromeTone.actionIcon} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${chromeTone.actionFocus}`;

    return (
        <>
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

                <CommunitySwipePager
                    items={viewOptions}
                    activeId={activeFilter}
                    onChange={setFilter}
                    ariaLabel="Feed views"
                    progressLabel="Feed view progress"
                    positionLabel="View"
                    accent={accent}
                    panelId={viewPanelId}
                    showPosition={false}
                    headerProps={{ "data-feed-header": true }}
                    headerClassName={`-mx-5 border-b border-white/10 px-5 py-3 sm:mx-0 sm:px-4 lg:[&_[data-community-pager-label-layout]]:pl-6 lg:[&_[data-community-pager-label]]:text-lg lg:[&_[data-community-pager-label]]:font-extrabold ${chromeTone.band}`}
                    controlsAccessory={
                        // Always rendered, even when empty, so the progress dots
                        // keep the same x-position as the reader swipes between
                        // views with different actions.
                        <div
                            role="group"
                            aria-label="Feed tools"
                            className="flex size-10 shrink-0 items-center justify-end"
                        >
                            {activeFilter === "updates" && composeAction ? (
                                <button
                                    ref={composeAction.ref}
                                    type="button"
                                    onClick={composeAction.onClick}
                                    aria-label={composeAction.label}
                                    aria-haspopup="dialog"
                                    aria-expanded={composeAction.expanded}
                                    data-feed-action={composeAction.action}
                                    className={actionButtonClassName}
                                >
                                    <PostComposerIcon className="h-4 w-4 shrink-0" />
                                </button>
                            ) : isContestEntries ? (
                                <button
                                    ref={filterTriggerRef}
                                    type="button"
                                    onClick={() => setFilterDrawerOpen(true)}
                                    aria-label="Filters"
                                    aria-haspopup="dialog"
                                    aria-expanded={filterDrawerOpen}
                                    data-feed-action="filters"
                                    className={actionButtonClassName}
                                >
                                    <FilterIcon />
                                    {entryLifecycleFilter !== "all" ? (
                                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-black shadow-sm shadow-black/60">
                                            1
                                        </span>
                                    ) : null}
                                </button>
                            ) : showStandings && standingsAction ? (
                                <button
                                    type="button"
                                    onClick={standingsAction.onClick}
                                    aria-label={standingsAction.ariaLabel}
                                    data-feed-action="flip-standings"
                                    className={`${actionButtonClassName} ${standingsAction.className ?? ""}`}
                                >
                                    <StandingsFlipIcon />
                                </button>
                            ) : null}
                        </div>
                    }
                >
                    {showStandings && standings ? (
                        <div aria-label="Feed standings" className="-mx-5 sm:mx-0">
                            {standings}
                        </div>
                    ) : (
                        <>
                            {/* The Winners strip answers "what just finished", which is
                                the MVP's contest_results record — a record that lives in
                                Updates. It is NOT narrowed by the lifecycle filter,
                                because it is a banner over the view rather than a row
                                inside it. */}
                            {winners && activeFilter === "updates" ? (
                                <div className="-mx-5 sm:mx-0">{winners}</div>
                            ) : null}

                            {visibleRecords.length ? (
                                // One continuous striped list rather than detached cards,
                                // so an announcement and a pick post read as rows of the
                                // same feed.
                                <div
                                    className="-mx-5 divide-y divide-white/10 overflow-visible border-b border-white/10 sm:mx-0"
                                    aria-label={
                                        // The MVP says "Official updates"; this Feed's
                                        // catch-all also carries member Community Picks,
                                        // so the label names the view honestly.
                                        isContestEntries ? "Contest entries" : "Community updates"
                                    }
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
                                <div className="-mx-5 px-5 pt-5 sm:mx-0 sm:px-0">
                                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 p-6">
                                        <p className="font-semibold text-white">{emptyTitle}</p>
                                        {emptySubline ? (
                                            <p className="mt-2 text-sm text-gray-500">{emptySubline}</p>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CommunitySwipePager>

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
                        onPostComplete={() => setComposerOpen(false)}
                    />
                ) : null}
            </section>
            {/* Sibling of the section, not a child of the pager: the pager only
                ignores swipes that START on an interactive element, so a drawer
                mounted inside the swipe region would have its buttons eat drags. */}
            <ContestEntryFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                returnFocusRef={filterTriggerRef}
                value={entryLifecycleFilter}
                onChange={setEntryLifecycleFilter}
                visibleCount={filteredEntryCount}
                totalCount={contestEntryRecords.length}
            />
        </>
    );
};

export default StructuredFeed;
