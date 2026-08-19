"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FeedList from "@/components/social/FeedList";
import { PostReactionButtons } from "@/components/social/PostReactionButtons";
import { FEED_DESKTOP_SIZING } from "@/components/social/feedDesktopSizing";
import { getContestEntryFeedHeaderLabel } from "@/lib/feed/contestEntryHeader";
import type { PickReaction, PickReactionSummary } from "@/lib/interfaces/interfaces";
import {
    AWARDED_POINTS_CARD_TONE,
    CONTEST_POST_EDGE_TONES,
    CONTEST_POST_HEADER_TONES,
} from "@/lib/styles/postCards";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import {
    formatStructuredFeedAmericanOdds,
    getStructuredFeedContextLabel,
    getStructuredFeedPointLabel,
    getStructuredFeedRecordLabel,
    isStructuredFeedRecordHidden,
} from "./formatters";
import type { StructuredFeedContextMetadata, StructuredFeedRecord } from "./types";

export type StructuredFeedCardProps = {
    context: StructuredFeedContextMetadata;
    record: StructuredFeedRecord;
    className?: string;
    currentUserId?: string;
    onReaction?: (recordId: string, reaction: PickReaction) => void;
    /** Null means this record kind carries no reaction data — see the card body. */
    getPickReactionSummary?: (
        recordId: string,
        userId?: string,
    ) => PickReactionSummary | null;
    onReplace?: (record: StructuredFeedRecord) => void;
    onDelete?: (record: StructuredFeedRecord) => void;
    onEdit?: (record: StructuredFeedRecord) => void;
    onPin?: (record: StructuredFeedRecord) => void;
};

type FeedCardAccent = "sky" | "violet";

// The League half of this map retones sky -> blue to match the MVP's card: the
// sky-100/sky-200 family read as washed-out grey against the new header band.
const feedCardAccentTone = {
    sky: {
        subtleAction: "border-blue-400/30 text-blue-300 hover:bg-blue-400/10",
        menuAction: "text-blue-300 hover:bg-blue-400/10 hover:text-blue-200",
        profileHover: "group-hover:text-blue-300",
        recordLabel: "text-blue-400",
        announcementEdge: "border-b-blue-400/30",
        pinned: "border-blue-400/25 bg-blue-400/10 text-blue-300",
        metric: "text-blue-300",
    },
    violet: {
        subtleAction: "border-violet-300/30 text-violet-100 hover:bg-violet-500/10",
        menuAction: "text-violet-100 hover:bg-violet-500/10 hover:text-violet-50",
        profileHover: "group-hover:text-violet-100",
        recordLabel: "text-violet-200",
        announcementEdge: "border-b-violet-300/30",
        pinned: "border-violet-300/25 bg-violet-500/10 text-violet-100",
        metric: "text-violet-100",
    },
} as const;

const PinIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
    <svg
        role="img"
        aria-label="Pinned announcement"
        data-icon="pin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <title>Pinned announcement</title>
        <path d="M9 3v5l-3 4v2h12v-2l-3-4V3" />
        <path d="M8 3h8M12 14v7" />
    </svg>
);

/**
 * Contest entries title their card with a link into the contest instead of the
 * plain record label, so the entry is one tap from its standings. Renders
 * nothing when the row arrived without a contest join, so the card falls back to
 * the plain record label rather than an empty eyebrow.
 *
 * `presentation` is OPTIONAL here, unlike the MVP: this app leaves it undefined
 * on announcements, Staff Picks and Community Picks, so every read of it is
 * guarded rather than assumed.
 */
const resolveContestHeader = (record: StructuredFeedRecord) => {
    const presentation = record.presentation ?? { kind: "ordinary" as const };
    const scoped =
        presentation.kind === "slip_contest" || presentation.kind === "feed_contest";
    const href = scoped ? presentation.contestHref : record.contest?.href;
    const contestName = scoped ? presentation.contestName : record.contest?.name;
    if (!href || !contestName) return null;
    return {
        href,
        contestName,
        scoped,
        // "<Contest> · Feed Pick'em Contest Entry" — naming the contest and the
        // builder that produced the entry, so a feed of mixed contests reads.
        label:
            presentation.kind === "slip_contest"
                ? getContestEntryFeedHeaderLabel({ format: "fantasy", contestName })
                : presentation.kind === "feed_contest"
                    ? getContestEntryFeedHeaderLabel({
                        // The picks read cannot always name the builder; General
                        // Combo is the same fallback PickCardContent uses.
                        format: presentation.entryFormat ?? "general_combo",
                        contestName,
                    })
                    : "Contest Entry",
        // A Feed contest entry's eyebrow stays neutral because it already sits on
        // the accent-tinted header bar; everything else keeps the accent text.
        neutralLabelTone: presentation.kind === "feed_contest",
    };
};

const StructuredContestHeaderLink = ({
    record,
    accent,
}: {
    record: StructuredFeedRecord;
    accent: FeedCardAccent;
}) => {
    const contest = resolveContestHeader(record);
    if (!contest) return null;
    const accentTone = feedCardAccentTone[accent];
    const { href, contestName, scoped, label } = contest;
    const labelTone = contest.neutralLabelTone ? "text-slate-300" : accentTone.recordLabel;

    return (
        <Link
            data-feed-contest-entry-link
            href={href}
            // A label that already names the contest is its own accessible name;
            // only the unnamed fallback needs the "View … contest" phrasing.
            aria-label={scoped ? undefined : `View ${contestName} contest`}
            className={`inline-flex min-h-6 min-w-0 items-start gap-1 rounded-md text-left text-[10px] font-semibold uppercase tracking-[0.13em] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${labelTone}`}
        >
            <span className="min-w-0 break-words">{label}</span>
            <span aria-hidden="true" className="shrink-0">↗</span>
        </Link>
    );
};

const RecordActions = ({
    record,
    accent,
    canReplace,
    canDelete,
    onReplace,
    onDelete,
    embeddedPick = false,
}: {
    record: StructuredFeedRecord;
    accent: FeedCardAccent;
    canReplace: boolean;
    canDelete: boolean;
    onReplace?: (record: StructuredFeedRecord) => void;
    onDelete?: (record: StructuredFeedRecord) => void;
    /** Aligns the row with the pick card's own gutters instead of the article's. */
    embeddedPick?: boolean;
}) => {
    if (!canReplace && !canDelete) return null;
    const accentTone = feedCardAccentTone[accent];

    return (
        <div
            className={`flex flex-wrap gap-2 border-t border-white/10 pt-4 ${embeddedPick ? "px-5 pb-4 sm:px-6 lg:px-8" : "mt-4"
                }`}
        >
            {canReplace ? (
                <button
                    type="button"
                    onClick={() => onReplace?.(record)}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition lg:px-4 lg:py-2.5 lg:text-xs ${accentTone.subtleAction}`}
                >
                    Replace pick
                </button>
            ) : null}
            {canDelete ? (
                <button
                    type="button"
                    onClick={() => onDelete?.(record)}
                    className="rounded-lg border border-red-300/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-100 transition hover:bg-red-500/10 lg:px-4 lg:py-2.5 lg:text-xs"
                >
                    Delete post
                </button>
            ) : null}
        </div>
    );
};

/**
 * Announcements move Pin / Edit / Delete into a "⋯" menu so the card reads as a
 * post rather than a toolbar. Roving focus + Escape keep it keyboard-usable.
 */
const AnnouncementActionMenu = ({
    record,
    accent,
    canPin,
    canEdit,
    canDelete,
    onPin,
    onEdit,
    onDelete,
}: {
    record: StructuredFeedRecord;
    accent: FeedCardAccent;
    canPin: boolean;
    canEdit: boolean;
    canDelete: boolean;
    onPin?: (record: StructuredFeedRecord) => void;
    onEdit?: (record: StructuredFeedRecord) => void;
    onDelete?: (record: StructuredFeedRecord) => void;
}) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const accentTone = feedCardAccentTone[accent];

    useEffect(() => {
        if (!open) return;
        menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
        );
        if (!items.length) return;
        event.preventDefault();
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex =
            event.key === "Home"
                ? 0
                : event.key === "End"
                    ? items.length - 1
                    : event.key === "ArrowDown"
                        ? (Math.max(currentIndex, -1) + 1) % items.length
                        : (currentIndex <= 0 ? items.length : currentIndex) - 1;
        items[nextIndex]?.focus();
    };

    if (!canPin && !canEdit && !canDelete) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-label="Announcement actions"
                aria-haspopup="menu"
                aria-expanded={open}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[14px] text-[var(--text-secondary)] transition hover:border-white/30 hover:text-white ${FEED_DESKTOP_SIZING.collapseButton}`}
            >
                ⋯
            </button>
            {open ? (
                <div
                    role="menu"
                    aria-label="Announcement actions"
                    onKeyDown={handleMenuKeyDown}
                    className="absolute right-0 z-30 mt-2 w-40 rounded-lg border border-white/10 bg-black/95 p-1 shadow-lg"
                >
                    {canPin ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                onPin?.(record);
                            }}
                            className={`w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide transition ${accentTone.menuAction}`}
                        >
                            {record.actions?.pinned ? "Unpin post" : "Pin post"}
                        </button>
                    ) : null}
                    {canEdit ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                onEdit?.(record);
                            }}
                            className="w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-white/5 hover:text-white"
                        >
                            Edit post
                        </button>
                    ) : null}
                    {canDelete ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                onDelete?.(record);
                            }}
                            className="w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-rose-100 transition hover:bg-rose-500/10 hover:text-rose-50"
                        >
                            Delete post
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export const StructuredFeedCard = ({
    context,
    record,
    className = "",
    currentUserId,
    onReaction,
    getPickReactionSummary,
    onReplace,
    onDelete,
    onEdit,
    onPin,
}: StructuredFeedCardProps) => {
    const accent: FeedCardAccent = context.kind === "arena" ? "violet" : "sky";
    const accentTone = feedCardAccentTone[accent];
    const label = getStructuredFeedRecordLabel(record);
    const detailsHidden = isStructuredFeedRecordHidden(record);
    const pointLabel = getStructuredFeedPointLabel(context);
    const isNoncompetitiveStaffPick = record.kind === "staff_pick";
    const isAnnouncement = record.kind === "staff_announcement";
    const feedAuthorName = record.author.handle?.replace(/^@/, "") ?? record.author.displayName;
    const compactFeedAuthorName =
        feedAuthorName.length > 12 ? `${feedAuthorName.slice(0, 12)}…` : feedAuthorName;
    const authorLabel = record.author.handle
        ? `@${record.author.handle.replace(/^@/, "")}`
        : record.author.displayName;
    const authorImage = generateProfileImageUrl(record.author.profileImage);
    // Every read of `presentation` is optional-chained: this app leaves it
    // undefined on announcements, Staff Picks and Community Picks.
    const feedEntryFormat =
        record.presentation?.kind === "feed_contest"
            ? record.presentation.entryFormat
            : undefined;
    const isContestEntry =
        record.presentation?.kind === "feed_contest" ||
        record.presentation?.kind === "slip_contest";
    const contestBottomEdgeTone = CONTEST_POST_EDGE_TONES[accent];
    // Null when the row arrived with no contest join at all — the eyebrow then
    // falls back to the plain record label rather than rendering empty.
    const hasContestHeaderLink = Boolean(resolveContestHeader(record));
    const canReplace = Boolean(record.actions?.canReplace && onReplace);
    const canDelete = Boolean(record.actions?.canDelete && onDelete);
    const canEdit = Boolean(isAnnouncement && record.actions?.canEdit && onEdit);
    const canPin = Boolean(isAnnouncement && record.actions?.canPin && onPin);
    const isPinned = Boolean(record.actions?.pinned);
    // Points state drives BOTH the card tone and which of the two point lines is
    // drawn. `undefined`/`null` awarded points means "not graded yet"; a graded
    // zero is a real answer and must not read as pending.
    const directPointsState =
        record.selection?.awardedPoints === undefined ||
            record.selection?.awardedPoints === null
            ? "potential"
            : record.selection.awardedPoints > 0
                ? "awarded"
                : "zero";
    // Only the surfaces that actually bank the points celebrate them: a League
    // Feed post's award is already told by its own contest board.
    const hasHighlightedDirectAward =
        directPointsState === "awarded" &&
        (context.kind === "global" || context.kind === "arena");
    const directSelectionState =
        record.selection?.result === "win"
            ? "win"
            : record.selection?.result === "loss"
                ? "loss"
                : record.selection?.result === "void" ||
                    record.selection?.result === "not_found"
                    ? "neutral"
                    : "pending";
    const directSelectionTextTone =
        directSelectionState === "win"
            ? "text-emerald-200"
            : directSelectionState === "loss"
                ? "text-rose-200"
                : directSelectionState === "neutral"
                    ? "text-slate-300"
                    : "text-white";
    // Reactions are resolved PER RECORD, not per feed: the host answers with a
    // summary only for kinds that actually carry counts (Community Picks today).
    // A null answer — an announcement, which isn't a `picks` row at all, or a
    // contest entry, whose endpoint returns no tallies — draws the card without
    // the buttons rather than with a permanently-zero score.
    const reactionSummary =
        currentUserId && getPickReactionSummary
            ? getPickReactionSummary(record.id, currentUserId)
            : null;
    const reactionsEnabled = Boolean(onReaction && reactionSummary);
    const reactionControls =
        reactionSummary && onReaction ? (
            <PostReactionButtons
                up={reactionSummary.up}
                down={reactionSummary.down}
                userReaction={reactionSummary.userReaction}
                onReaction={(reaction) => onReaction(record.id, reaction)}
                accent={accent}
                scale="structured"
            />
        ) : null;

    // An entry that is still sealed gets its OWN compact row rather than the full
    // card with a warning box in it: there is no pick to show, so the row is just
    // the author, a padlock chip and when it reveals. Kept ahead of the pick
    // branch so a row that arrives with a payload it should not be showing still
    // renders sealed.
    if (detailsHidden) {
        return (
            <article
                aria-label={`${label} by ${authorLabel}`}
                data-feed-entry-format={feedEntryFormat}
                data-feed-entry-private={feedEntryFormat}
                data-feed-entry-layout="sealed-compact"
                className={`${className} py-4 ${FEED_DESKTOP_SIZING.row}`.trim()}
            >
                <header
                    data-feed-post-header
                    className={`flex items-center justify-between gap-3 px-5 pb-3 sm:px-6 ${FEED_DESKTOP_SIZING.header}`}
                >
                    <Link
                        data-feed-post-author
                        href={getProfilePath(record.author.id, currentUserId)}
                        aria-label={`View ${feedAuthorName} profile`}
                        className={`group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5 ${FEED_DESKTOP_SIZING.authorTrigger}`}
                    >
                        <span
                            data-feed-post-avatar
                            aria-hidden
                            className={`ml-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition ${accentTone.profileHover} ${FEED_DESKTOP_SIZING.avatar}`}
                        >
                            {/* The MVP draws initials only; this app has a real
                                avatar join, so keep it and fall back to initials. */}
                            {authorImage ? (
                                <Image
                                    src={authorImage}
                                    alt=""
                                    width={56}
                                    height={56}
                                    className="h-full w-full rounded-full object-cover"
                                    draggable={false}
                                    onDragStart={(event) => event.preventDefault()}
                                    unoptimized
                                />
                            ) : (
                                feedAuthorName.slice(0, 2)
                            )}
                        </span>
                        <span className="min-w-0">
                            <span
                                data-feed-post-author-name
                                className={`block text-sm font-semibold text-[var(--app-text)] ${FEED_DESKTOP_SIZING.authorName}`}
                            >
                                <span className="sm:hidden">{compactFeedAuthorName}</span>
                                <span className="hidden sm:inline">{feedAuthorName}</span>
                            </span>
                            <span className="block text-xs text-[var(--text-secondary)]">
                                view profile
                            </span>
                        </span>
                    </Link>

                    <div
                        data-feed-post-controls
                        className={`flex shrink-0 items-center justify-end gap-2 ${FEED_DESKTOP_SIZING.controlCluster}`}
                    >
                        {reactionControls}
                    </div>
                </header>

                <div className="px-5 sm:px-6 lg:px-8">
                    <section
                        aria-label="Sealed contest entry"
                        data-feed-entry-state="sealed"
                        className={`flex min-w-0 items-center gap-3 rounded-xl border border-white/10 border-b-2 bg-[#0b0b0b] px-3 py-2.5 ${contestBottomEdgeTone}`}
                    >
                        <span
                            aria-hidden
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.04] text-slate-400"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                            >
                                <rect x="5" y="10" width="14" height="10" rx="2" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </svg>
                        </span>
                        <span className="min-w-0">
                            <StructuredContestHeaderLink record={record} accent={accent} />
                            <span className="mt-0.5 block text-[10px] leading-4 text-gray-500">
                                {record.contest?.locksAtLabel
                                    ? `Sealed · Reveals ${record.contest.locksAtLabel}`
                                    : "Sealed until contest lock"}
                            </span>
                        </span>
                    </section>

                    <p
                        className={`mt-2 text-right text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] ${FEED_DESKTOP_SIZING.footer}`}
                    >
                        Submitted {record.createdAtLabel}
                    </p>

                    {/* No sealed record carries actions today (only unrevealed
                        Feed-contest entries reach here, and they arrive without
                        an `actions` block) — kept so a row that ever does keeps
                        its handlers rather than silently losing them. */}
                    <RecordActions
                        record={record}
                        accent={accent}
                        canReplace={canReplace}
                        canDelete={canDelete}
                        onReplace={onReplace}
                        onDelete={onDelete}
                    />
                </div>
            </article>
        );
    }

    // A revealed pick renders through the canonical pick card, so a Community
    // Pick in the Feed reads exactly like the same post on Global Social — with
    // the League / Arena points vocabulary swapped in.
    if (record.pick) {
        return (
            <article
                aria-label={`${label} by ${authorLabel}`}
                data-feed-entry-format={feedEntryFormat}
                className={className}
            >
                <FeedList
                    items={[record.pick]}
                    currentUserId={currentUserId}
                    showReactions={reactionsEnabled}
                    onReaction={
                        onReaction ? (_pickId, reaction) => onReaction(record.id, reaction) : undefined
                    }
                    // The summary is already resolved above and `showReactions`
                    // gates the call, so hand FeedList that value rather than
                    // letting it re-ask with the pick's id — a Feed record id is
                    // not always the pick id (contest entries are prefixed).
                    getPickReactionSummary={
                        reactionSummary ? () => reactionSummary : undefined
                    }
                    embedded
                    contextualPointsLabel={
                        record.kind === "community_pick" && context.kind !== "global"
                            ? pointLabel
                            : undefined
                    }
                    accent={accent}
                    scale="structured"
                    getItemPresentation={() => record.presentation}
                    renderItemSupplement={
                        record.body
                            ? () => ({
                                body: (
                                    <p
                                        className={`mx-5 mb-4 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-6 text-gray-200 sm:mx-6 lg:mx-8 ${FEED_DESKTOP_SIZING.structuredBody}`}
                                    >
                                        {record.body}
                                    </p>
                                ),
                            })
                            : undefined
                    }
                />
                <RecordActions
                    record={record}
                    accent={accent}
                    canReplace={canReplace}
                    canDelete={canDelete}
                    onReplace={onReplace}
                    onDelete={onDelete}
                    embeddedPick
                />
            </article>
        );
    }

    return (
        <article
            aria-label={`${label} by ${authorLabel}`}
            data-feed-entry-format={feedEntryFormat}
            className={`${className} px-5 pb-4 pt-4 sm:px-6 ${FEED_DESKTOP_SIZING.structuredArticle}`.trim()}
        >
            {/* A contest entry wears a full-bleed tinted header bar so the row
                reads as belonging to that contest before the eyebrow is read.
                The negative margins undo the article's own gutters. */}
            <header
                data-post-header-context={isContestEntry ? accent : undefined}
                className={`flex flex-wrap items-center justify-between gap-3 ${isContestEntry
                    ? `-mx-5 -mt-4 border-b border-white/10 px-5 py-3 sm:-mx-6 sm:px-6 ${CONTEST_POST_HEADER_TONES[accent]}`
                    : ""
                    }`}
            >
                {isAnnouncement ? (
                    <Link
                        href={getProfilePath(record.author.id, currentUserId)}
                        aria-label={`View ${feedAuthorName} profile`}
                        className={`group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5 ${FEED_DESKTOP_SIZING.authorTrigger}`}
                    >
                        {/* `ml-1` mirrors FeedList's avatar so an announcement row and a
                            pick row line up on the same optical left edge. */}
                        <span
                            className={`ml-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition ${accentTone.profileHover} ${FEED_DESKTOP_SIZING.avatar}`}
                        >
                            {authorImage ? (
                                <Image
                                    src={authorImage}
                                    alt=""
                                    width={56}
                                    height={56}
                                    className="h-full w-full rounded-full object-cover"
                                    draggable={false}
                                    onDragStart={(event) => event.preventDefault()}
                                    unoptimized
                                />
                            ) : (
                                feedAuthorName.slice(0, 2)
                            )}
                        </span>
                        <span className="min-w-0">
                            <span
                                className={`block text-sm font-semibold text-[var(--app-text)] ${FEED_DESKTOP_SIZING.authorName}`}
                            >
                                <span className="sm:hidden">{compactFeedAuthorName}</span>
                                <span className="hidden sm:inline">{feedAuthorName}</span>
                            </span>
                            <span className="block text-xs text-[var(--text-secondary)]">
                                view profile
                            </span>
                        </span>
                    </Link>
                ) : (
                    <div className="min-w-0">
                        {record.kind === "competitive_pick" && hasContestHeaderLink ? (
                            <StructuredContestHeaderLink record={record} accent={accent} />
                        ) : (
                            <p
                                className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${accentTone.recordLabel}`}
                            >
                                {label}
                            </p>
                        )}
                        <p
                            className={`mt-2 truncate text-sm font-semibold text-white ${FEED_DESKTOP_SIZING.authorName}`}
                        >
                            {authorLabel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{record.createdAtLabel}</p>
                    </div>
                )}
                <div
                    data-feed-post-controls
                    className={`flex flex-wrap items-center justify-end gap-2 ${FEED_DESKTOP_SIZING.controlCluster}`}
                >
                    {reactionControls}
                    {isAnnouncement ? (
                        <AnnouncementActionMenu
                            record={record}
                            accent={accent}
                            canPin={canPin}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onPin={onPin}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ) : (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                            {getStructuredFeedContextLabel(context)}
                        </span>
                    )}
                </div>
            </header>

            {/* A sealed entry never reaches here — it returns its own compact row
                above — so everything below is the revealed body. */}
            {record.body && isAnnouncement ? (
                <section
                    aria-label="Announcement content"
                    className={`mt-4 rounded-xl border border-white/10 border-b-[3px] bg-[#0b0b0b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.04),0_2px_10px_rgba(0,0,0,0.18)] lg:mt-5 lg:p-5 ${accentTone.announcementEdge}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {label}
                        </p>
                        {isPinned ? (
                            <span
                                title="Pinned announcement"
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${accentTone.pinned}`}
                            >
                                <PinIcon />
                            </span>
                        ) : null}
                    </div>
                    {record.title ? (
                        <p className="mt-2 text-sm font-semibold text-white lg:text-base">
                            {record.title}
                        </p>
                    ) : null}
                    <div className="mt-3 h-px w-full bg-white/10" />
                    <p
                        className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100 ${FEED_DESKTOP_SIZING.structuredBody}`}
                    >
                        {record.body}
                    </p>
                </section>
            ) : record.body ? (
                <p
                    className={`mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-200 ${FEED_DESKTOP_SIZING.structuredBody}`}
                >
                    {record.body}
                </p>
            ) : null}

            {record.selection ? (
                <div
                    data-feed-entry-primary={isContestEntry ? feedEntryFormat : undefined}
                    data-points-state={directPointsState}
                    data-points-kind={context.kind === "global" ? "xp" : context.kind}
                    className={`mt-4 rounded-xl border p-4 lg:mt-5 lg:p-5 ${hasHighlightedDirectAward
                        ? AWARDED_POINTS_CARD_TONE
                        : "border-white/10 bg-[#0b0b0b]"
                        } ${isContestEntry ? `border-b-[3px] ${contestBottomEdgeTone}` : ""}`}
                >
                    {record.selection.marketLabel ? (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            {record.selection.marketLabel}
                        </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                        <p
                            data-pick-selection-state={directSelectionState}
                            className={`font-semibold ${directSelectionTextTone} ${FEED_DESKTOP_SIZING.structuredSelection}`}
                        >
                            {record.selection.summary}
                        </p>
                        <span
                            className={`shrink-0 font-mono text-sm font-semibold ${accentTone.metric} ${FEED_DESKTOP_SIZING.structuredSelection}`}
                        >
                            {formatStructuredFeedAmericanOdds(record.selection.acceptedAmericanOdds)}
                        </span>
                    </div>
                    {isNoncompetitiveStaffPick ? (
                        // Frontend-only: Staff Picks are noncompetitive here, and the
                        // MVP has no such record kind to say so.
                        <p className="mt-3 text-xs font-semibold text-amber-100">
                            Staff Picks do not earn {pointLabel} or affect standings.
                        </p>
                    ) : directPointsState !== "potential" ? (
                        // Once a pick is graded the potential is history: showing
                        // both lines (as this card used to) reads as two awards.
                        <>
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                {pointLabel}
                            </p>
                            <p
                                className={`mt-1 text-sm font-semibold ${directPointsState === "awarded" ? "text-emerald-200" : "text-slate-400"
                                    } ${FEED_DESKTOP_SIZING.structuredSelection}`}
                            >
                                +{record.selection.awardedPoints} {pointLabel}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Potential {pointLabel}
                            </p>
                            <p
                                className={`mt-1 text-sm font-semibold ${accentTone.metric} ${FEED_DESKTOP_SIZING.structuredSelection}`}
                            >
                                +{record.selection.potentialPoints} {pointLabel}
                            </p>
                        </>
                    )}
                    {record.selection.resultLabel ? (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                            {record.selection.resultLabel}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {isAnnouncement ? (
                <div className="mt-3 flex justify-end text-right text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {getStructuredFeedContextLabel(context)} · posted at: {record.createdAtLabel}
                </div>
            ) : null}

            <RecordActions
                record={record}
                accent={accent}
                canReplace={canReplace}
                // An announcement's Delete now lives in the ⋯ menu.
                canDelete={isAnnouncement ? false : canDelete}
                onReplace={onReplace}
                onDelete={onDelete}
            />
        </article>
    );
};

export default StructuredFeedCard;
