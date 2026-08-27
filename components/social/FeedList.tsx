"use client";

import { CSSProperties, useCallback, useState, type ReactNode } from "react";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { useRouter } from "next/navigation";
import { Pick, PickReaction, PickReactionSummary, Picks } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { UserIcon } from "../layout/MainTabBar";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getFeedZebraRowClassName } from "./feedRowTone";
import { FEED_DESKTOP_SIZING as SZ } from "./feedDesktopSizing";
import PickCard from "./pick-card/PickCard";
import { getPickCardOddsCopy } from "./pick-card/pickCardModel";
import type { PickCardAccent, PickCardPresentation } from "./pick-card/types";
import PickResultBadge from "./PickResultBadge";
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
    sky: { profileHover: "group-hover:text-sky-100" },
    violet: { profileHover: "group-hover:text-violet-100" },
} as const;

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
                const isCollapsed = Boolean((collapsedItems ?? internalCollapsedItems)[item.id]);
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
                /*
                 * A Pick'em or TD Psychic entry has NO meaningful aggregate
                 * result to chip. Both are stored `loss` unless they are perfect,
                 * so a 4-of-5 Pick'em card would wear a red "loss" badge over
                 * four correct picks. Their header carries the `4/5` tally
                 * instead, which is the number that actually describes them.
                 */
                const showAggregateResult = !(
                    presentation.kind === "feed_contest" &&
                    (presentation.entryFormat === "sunday_pickem" ||
                        presentation.entryFormat === "td_psychic")
                );

                return (
                    <div
                        key={item.id}
                        ref={index === (items?.length ?? 0) - 1 ? lastItemRef : null}
                        data-pick-card-presentation={presentation.kind}
                        data-feed-entry-format={
                            presentation.kind === "feed_contest"
                                ? presentation.entryFormat
                                : undefined
                        }
                        className={`py-4 ${SZ.row} ${getFeedZebraRowClassName(index) ?? ""}`.trim()}
                    >
                        <div
                            data-feed-post-header
                            className={`flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6 ${SZ.header}`}
                        >
                            <button
                                data-feed-post-author
                                type="button"
                                onClick={() => handleViewProfile(item.user_id)}
                                className={`group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5 ${SZ.authorTrigger}`}
                            >
                                <div
                                    data-feed-post-avatar
                                    className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition ${accentTone.profileHover} ${SZ.avatar}`}
                                >
                                    {profileImg ? (
                                        <Image
                                            src={profileImg}
                                            alt="Profile image"
                                            width={56}
                                            height={56}
                                            className={`tracking-wide rounded-full border object-cover h-8 w-8 ${SZ.avatarImage}`}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            unoptimized
                                        />
                                    ) : (
                                        <UserIcon
                                            className={`h-6 w-6 text-white/80 sm:h-6 sm:w-6 ${SZ.avatarGlyph}`}
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p
                                        data-feed-post-author-name
                                        className={`text-sm font-semibold text-[var(--app-text)] ${SZ.authorName}`}
                                    >
                                        <span className="sm:hidden">{displayName}</span>
                                        <span className="hidden sm:inline">{username}</span>
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">view profile</p>
                                </div>
                            </button>
                            <div
                                data-feed-post-controls
                                className={`flex flex-wrap items-center justify-end gap-2 ${SZ.controlCluster}`}
                            >
                                {reactionsEnabled && (
                                    <div className="flex items-center gap-2">
                                        {isCollapsed && (
                                            <span
                                                className={`text-[12px] font-semibold text-slate-100 ${SZ.collapsedOdds}`}
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
                                            scale="structured"
                                        />
                                    </div>
                                )}
                                {showAggregateResult ? (
                                    <PickResultBadge
                                        result={item.result}
                                        className={SZ.resultChip}
                                    />
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => toggleCollapsed(item.id)}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? "Expand post" : "Collapse post"}
                                    className={`inline-flex h-4 w-4 items-center justify-center text-[10px] font-semibold transition ${SZ.collapseButton} ${isCollapsed
                                        ? "text-[var(--text-secondary)] hover:text-white"
                                        : "text-white/90 hover:text-white"
                                        }`}
                                >
                                    <AnimatedArrow direction={isCollapsed ? "down" : "up"}>
                                        {isCollapsed ? COLLAPSE_DOWN_TRIANGLE : COLLAPSE_UP_TRIANGLE}
                                    </AnimatedArrow>
                                </button>
                            </div>
                        </div>
                        <div data-feed-post-pick>
                            <PickCard
                                pick={item}
                                collapsed={isCollapsed}
                                contextualPointsLabel={contextualPointsLabel}
                                accent={accent}
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
