"use client";

import { CSSProperties, useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pick, PickReaction, PickReactionSummary, PickResult, Picks } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { UserIcon } from "../layout/MainTabBar";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getFeedZebraRowClassName } from "./feedRowTone";
import { getFeedDesktopSizing } from "./feedDesktopSizing";
import {
    getPickCardOddsCopy,
    PickCardContent,
    type PickCardAccent,
    type PickCardPresentation,
    type PickCardScale,
} from "./PickCardContent";
import PostReactionButtons from "./PostReactionButtons";

export type FeedListProps = {
    items: Picks | null;
    emptyCopy?: string;
    currentUserId?: string;
    showReactions?: boolean;
    showTopBorder?: boolean;
    /** Removes the global Feed container chrome when cards are embedded elsewhere. */
    embedded?: boolean;
    /** Replaces Global XP with the points terminology for a League or Arena. */
    contextualPointsLabel?: string;
    /** Keeps shared Feed cards visually aligned with their community shell. */
    accent?: PickCardAccent;
    /** "structured" renders the League / Arena Feed tab's updated card scale. */
    scale?: PickCardScale;
    /** Explicitly selects ordinary, Slip Contest, or Feed Contest card metrics. */
    getItemPresentation?: (item: Pick) => PickCardPresentation | undefined;
    /** Item-scoped content rendered after the canonical pick card. */
    renderItemSupplement?: (item: Pick) => FeedItemSupplement | undefined;
    /** Optional controlled collapse state for hosts that swap FeedList views. */
    collapsedItems?: Readonly<Record<string, boolean>>;
    onToggleCollapsed?: (pickId: string) => void;
    onReaction?: (pickId: string, reaction: PickReaction) => void;
    onViewProfile?: (userId: string) => void;
    /**
     * Supplies reaction counts from the host's own store. Omit to read them off
     * the pick row itself (`up` / `down` / `reaction`), which is what the Global
     * and Profile feeds do.
     */
    getPickReactionSummary?: (pickId: string, userId?: string) => PickReactionSummary;
    lastItemRef?: (node: HTMLDivElement | null) => void;
    loading?: boolean;
};

export type FeedItem = Pick & { userName: string };
export type FeedItemSupplement = {
    body?: ReactNode;
};

const feedListAccentTone = {
    sky: {
        pendingResult: "border-blue-300/50 bg-blue-500/10 text-blue-100",
        profileHover: "group-hover:text-sky-100",
    },
    violet: {
        pendingResult: "border-violet-300/50 bg-violet-500/10 text-violet-100",
        profileHover: "group-hover:text-violet-100",
    },
} as const;

const resultTone = (result: PickResult | null | undefined, accent: PickCardAccent) => {
    switch (result) {
        case "win":
            return "border-amber-300/70 bg-amber-400/15 text-amber-100";
        case "loss":
            return "border-red-400/60 bg-red-500/15 text-red-100";
        case "void":
            return "border-yellow-300/60 bg-yellow-500/15 text-yellow-100";
        case "not_found":
            return "border-yellow-300/60 bg-yellow-500/15 text-yellow-100";
        case "pending":
            return feedListAccentTone[accent].pendingResult;
        default:
            return "border-white/10 bg-white/5 text-[var(--text-secondary)]";
    }
};

const COLLAPSE_UP_TRIANGLE = "▲";
const COLLAPSE_DOWN_TRIANGLE = "▼";

const FEED_MAX_VISIBLE = 7;
const FEED_CARD_EST_HEIGHT = 220;
const feedScrollStyle = {
    "--feed-max-height": `${FEED_MAX_VISIBLE * FEED_CARD_EST_HEIGHT}px`,
} as CSSProperties;

const FeedList = ({
    items,
    emptyCopy,
    currentUserId,
    showReactions = true,
    showTopBorder = true,
    embedded = false,
    contextualPointsLabel,
    accent = "sky",
    scale = "legacy",
    getItemPresentation,
    renderItemSupplement,
    collapsedItems,
    onToggleCollapsed,
    onReaction,
    onViewProfile,
    getPickReactionSummary,
    lastItemRef,
    loading,
}: FeedListProps) => {
    const router = useRouter();
    const [internalCollapsedItems, setInternalCollapsedItems] = useState<Record<string, boolean>>({});
    const reactionsEnabled = Boolean(showReactions && onReaction);
    const accentTone = feedListAccentTone[accent];
    const sizing = getFeedDesktopSizing(scale === "structured");

    const handleViewProfile = useCallback(
        (userId: string) => {
            if (onViewProfile) {
                onViewProfile(userId);
                return;
            }
            router.push(getProfilePath(userId, currentUserId));
        },
        [currentUserId, onViewProfile, router]
    );

    const handleReaction = useCallback(
        (pickId: string, reaction: PickReaction) => {
            if (!onReaction) return;
            onReaction(pickId, reaction);
        },
        [onReaction]
    );

    const toggleCollapsed = useCallback(
        (pickId: string) => {
            if (onToggleCollapsed) {
                onToggleCollapsed(pickId);
                return;
            }
            setInternalCollapsedItems((prev) => ({
                ...prev,
                [pickId]: !prev[pickId],
            }));
        },
        [onToggleCollapsed]
    );

    return (
        <div
            className={
                embedded
                    ? "divide-y divide-white/10 overflow-visible"
                    : `-mx-5 divide-y divide-white/10 overflow-visible sm:mx-0 sm:max-h-[var(--feed-max-height)] sm:overflow-y-auto ${showTopBorder ? "border-y border-white/10" : "border-b border-white/10"
                    }`
            }
            style={embedded ? undefined : feedScrollStyle}
        >
            {items?.length === 0 && (
                <div className="px-5 py-4 sm:px-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                        {emptyCopy}
                    </div>
                </div>
            )}
            {items?.map((item, index) => {
                const showResultChip = item.result && item.result !== "pending";
                const isCollapsed = Boolean((collapsedItems ?? internalCollapsedItems)[item.id]);
                const resultLabel = item.result === "not_found" ? "n/a" : item.result;
                const username = item?.profiles?.username ?? "";
                const displayName =
                    username.length > 12 ? `${username.slice(0, 12)}…` : username;
                const oddsCopy = getPickCardOddsCopy(item);
                const reactionSummary = !reactionsEnabled
                    ? { up: 0, down: 0, total: 0, userReaction: null }
                    : getPickReactionSummary
                        ? getPickReactionSummary(item.id, currentUserId)
                        : {
                            up: item.up ?? 0,
                            down: item.down ?? 0,
                            total: (item.up ?? 0) + (item.down ?? 0),
                            userReaction: item.reaction ?? null,
                        };
                const { up, down, userReaction } = reactionSummary;
                const supplement = renderItemSupplement?.(item);
                const presentation = getItemPresentation?.(item) ?? { kind: "ordinary" as const };
                const profileImg = generateProfileImageUrl(item?.profiles?.profile_image);

                return (
                    <div
                        key={item.id}
                        ref={index === (items?.length ?? 0) - 1 ? lastItemRef : null}
                        className={`py-4 ${sizing.row} ${getFeedZebraRowClassName(index) ?? ""}`.trim()}
                    >
                        <div
                            data-feed-post-header
                            className={`flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6 ${sizing.header}`}
                        >
                            <button
                                data-feed-post-author
                                type="button"
                                onClick={() => handleViewProfile(item.user_id)}
                                className={`group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5 ${sizing.authorTrigger}`}
                            >
                                <div
                                    data-feed-post-avatar
                                    className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition ${accentTone.profileHover} ${sizing.avatar}`}
                                >
                                    {profileImg ? (
                                        <Image
                                            src={profileImg}
                                            alt="Profile image"
                                            width={56}
                                            height={56}
                                            className={`tracking-wide rounded-full border object-cover h-8 w-8 ${sizing.avatarImage}`}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            unoptimized
                                        />
                                    ) : (
                                        <UserIcon
                                            className={`h-6 w-6 text-white/80 sm:h-6 sm:w-6 ${sizing.avatarGlyph}`}
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p
                                        data-feed-post-author-name
                                        className={`text-sm font-semibold text-[var(--app-text)] ${sizing.authorName}`}
                                    >
                                        <span className="sm:hidden">{displayName}</span>
                                        <span className="hidden sm:inline">{username}</span>
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">view profile</p>
                                </div>
                            </button>
                            <div
                                data-feed-post-controls
                                className={`flex flex-wrap items-center justify-end gap-2 ${sizing.controlCluster}`}
                            >
                                {/* Structured Feed cards have no reaction tallies to render,
                                    so the collapsed odds would vanish with them. */}
                                {!reactionsEnabled && isCollapsed && scale === "structured" && (
                                    <span
                                        className={`text-[12px] font-semibold text-slate-100 ${sizing.collapsedOdds}`}
                                    >
                                        {oddsCopy}
                                    </span>
                                )}
                                {reactionsEnabled && (
                                    <div className="flex items-center gap-2">
                                        {isCollapsed && (
                                            <span
                                                className={`text-[12px] font-semibold text-slate-100 ${sizing.collapsedOdds}`}
                                            >
                                                {oddsCopy}
                                            </span>
                                        )}
                                        <PostReactionButtons
                                            up={up}
                                            down={down}
                                            userReaction={userReaction}
                                            onReaction={(reaction) => handleReaction(item.id, reaction)}
                                            accent={accent}
                                            scale={scale}
                                        />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleCollapsed(item.id)}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? "Expand post" : "Collapse post"}
                                    className={`inline-flex h-4 w-4 items-center justify-center text-[10px] font-semibold transition ${sizing.collapseButton} ${isCollapsed
                                        ? "text-[var(--text-secondary)] hover:text-white"
                                        : "text-white/90 hover:text-white"
                                        }`}
                                >
                                    {isCollapsed ? COLLAPSE_DOWN_TRIANGLE : COLLAPSE_UP_TRIANGLE}
                                </button>
                                {showResultChip && (
                                    <span
                                        className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${sizing.resultChip} ${resultTone(
                                            item.result,
                                            accent
                                        )}`}
                                    >
                                        {resultLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div data-feed-post-pick>
                            <PickCardContent
                                pick={item}
                                collapsed={isCollapsed}
                                contextualPointsLabel={contextualPointsLabel}
                                accent={accent}
                                scale={scale}
                                presentation={presentation}
                            />
                        </div>
                        {supplement?.body ? (
                            <div data-feed-post-supplement-body>{supplement.body}</div>
                        ) : null}
                    </div>
                );
            })}

            {loading && emptyCopy && (
                <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                </div>
            )}
        </div>
    );
};

export default FeedList;
