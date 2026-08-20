"use client";

import { useCallback, useEffect, useRef, useMemo, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { GlobalLeaderboadPostRows, Pick, PickReaction, PickResult, Picks, PickType, RootState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearFetchAllGlobalPostPicksMessage, createPickReactionRequest, fetchFollowingUsersPostsRequest, fetchFollowingUsersWinTopHitPostsRequest, fetchGlobalLeaderboardRequest, fetchGlobalPendingReactedPostsRequest, fetchGlobalPendingTopHitPostsRequest, fetchGlobalWinnerTopHitPostsRequest } from "@/lib/redux/slices/pickSlice";
import Image from "next/image";
import { formatTierPrimary, getAppliedGlobalXpForPick, getCalculatedGlobalXpForPick, getTierMetaForPick } from "@/lib/utils/scoring";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { formatDateTime } from "@/lib/utils/date";
import { UserIcon } from "@/components/layout/MainTabBar";
import { EM_DASH, extractMatchup, extractPickLine } from "@/lib/utils/pickDescription";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import UserSearchDialog from "@/components/social/UserSearchDialog";
import {
    StandingIdentity,
    StandingRank,
    StandingsCard,
    STANDINGS_CARD_STYLES,
} from "@/components/community/StandingsCard";
import { fetchFollowingListRequest } from "@/lib/redux/slices/authSlice";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { SearchIcon } from "@/components/ui/SvgIcons";
import { LOSING_POST_CARD_TONE, NEUTRAL_POST_CARD_SURFACE, PENDING_POST_CARD_TONE, WINNING_POST_CARD_TONE } from "@/lib/styles/postCards";
// TUTORIAL DISABLED 2026-08-17 — superseded by the per-League/per-Arena Guides.
// Commented, not deleted: uncomment these three imports plus the three blocks
// marked "TUTORIAL DISABLED" below to restore the Global intro.
// import OnboardingModal from "@/components/modals/OnboardingModal";
// import { GLOBAL_TUTORIAL } from "@/lib/onboarding/tutorials";
// import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import PostPickSkeleton from "@/components/skeletons/social/PostPickSkeleton";
import GlobalLeaderboardSkeleton from "@/components/skeletons/social/GlobalLeaderboardSkeleton";
import { WeeklyWinnersRange } from "@/lib/social/weeklyWinnersLeaderboard";
import PostReactionButtons from "@/components/social/PostReactionButtons";

/*
 * Four top-level tabs, in the MVP's order (app/social/page.tsx:34, :520-523).
 *
 * `wins` and `rankings` used to be one "winners" tab with a rankings/wins
 * SubToggle under it. The MVP promotes both to tabs of their own, so the two
 * surfaces are reachable in one tap instead of two and the strip names what it
 * shows. That also retires the `WinnersView` state — `activeTab` now IS the
 * choice, and each tab drives its own fetch.
 */
type SocialTab = "for-you" | "following" | "wins" | "rankings";

const resultTone = (result: PickResult | null | undefined) => {
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
            return "border-blue-300/50 bg-blue-500/10 text-blue-100";
        default:
            return "border-white/10 bg-white/5 text-[var(--text-secondary)]";
    }
};

const isPendingResult = (result: PickResult | null | undefined) =>
    (result ?? "pending") === "pending";

const postedAtLabel = (iso: string | undefined) =>
    `posted at: ${formatDateTime(iso)}`;

const formatXp = (value: number) => `${value.toLocaleString()} XP`;

const formatWeekRange = (start: Date, end: Date) => {
    const formatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });
    const finalDay = new Date(end.getTime() - 1);
    return `${formatter.format(start)} - ${formatter.format(finalDay)}`;
};

const PLACEHOLDER = EM_DASH;
const META_SEPARATOR = " \u00b7 ";
const COLLAPSE_UP_TRIANGLE = "\u25B2";
const COLLAPSE_DOWN_TRIANGLE = "\u25BC";

const withAlpha = (hex: string, alphaHex: string) => {
    if (hex.startsWith("#") && hex.length === 7) {
        return `${hex}${alphaHex}`;
    }
    return hex;
};

const getHexFromGradient = (color?: string) => {
    if (!color) return undefined;
    const match = color.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1]}` : undefined;
};

const getTierCardStyle = (color?: string) => {
    const hex = getHexFromGradient(color);
    if (!hex) return undefined;
    return {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(
            hex,
            "55"
        )}, ${withAlpha(hex, "22")}, rgba(0,0,0,0))`,
    };
};

// The local podium accents and the board-wide `imgError` flag that used to live
// here went with the StandingsCard port: `StandingRank` owns the
// gold/silver/bronze number and `StandingIdentity` owns per-row avatar fallback.

// Global keeps its own four metrics while sharing the community standings shape.
// No leading `grid` and no gap utilities: StandingsCard prepends `grid` itself
// and owns the row spacing, so both would fight the shared frame.
const LEADERBOARD_GRID =
    "grid-cols-[3rem_minmax(0,1fr)_4rem_4.5rem] sm:grid-cols-[4rem_minmax(0,1fr)_6rem_6.5rem]";

const renderBiggestHitCell = (
    biggestWin: GlobalLeaderboadPostRows | null,
    onClick: () => void
) => {
    const oddsCopy = biggestWin?.odds_bracket ?? PLACEHOLDER;
    const tierMeta = getTierMetaForPick({ odds: biggestWin?.odds_bracket, mode: "global" });
    const accentHex = getHexFromGradient(tierMeta?.color);
    const globalXpCopy = `+${formatXp(biggestWin?.applied_global_xp ?? 0)}`;

    return (
        <button
            type="button"
            onClick={onClick}
            title="View this pick"
            className="group flex min-w-0 flex-col items-start text-left transition hover:opacity-80"
        >
            <span
                className="truncate text-[12px] font-semibold tabular-nums group-hover:underline sm:text-[13px]"
                style={accentHex ? { color: accentHex } : undefined}
            >
                {oddsCopy}
            </span>
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-200 sm:text-[11px]">
                {globalXpCopy}
            </span>
        </button>
    );
};

// Weekly XP cell. The tooltip separates the amount applied from the
// exact-odds calculation when the account-day cap matters.
const GlobalXpCell = ({
    appliedGlobalXp,
    calculatedGlobalXp,
}: {
    appliedGlobalXp: number;
    calculatedGlobalXp: number;
}) => {
    const [open, setOpen] = useState(false);
    const cellRef = useRef<HTMLDivElement | null>(null);
    const ungrantedXp = Math.max(0, calculatedGlobalXp - appliedGlobalXp);
    const retainedLegacyXp = Math.max(0, appliedGlobalXp - calculatedGlobalXp);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (!cellRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    return (
        <div
            ref={cellRef}
            className="group relative flex justify-end"
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Total XP breakdown"
                className="text-[12px] font-semibold tabular-nums text-emerald-200 transition hover:text-emerald-100 sm:text-[13px]"
            >
                {formatXp(appliedGlobalXp)}
            </button>
            <div
                role="tooltip"
                className={`absolute right-0 top-full z-30 mt-1.5 w-40 rounded-lg border border-white/10 bg-black/90 p-2.5 text-left shadow-lg backdrop-blur ${open ? "block" : "hidden group-hover:block"
                    }`}
            >
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">XP</span>
                    <span className="font-semibold tabular-nums text-emerald-200">
                        {formatXp(appliedGlobalXp)}
                    </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">Calculated</span>
                    <span className="font-semibold tabular-nums text-[var(--app-text)]">
                        {formatXp(calculatedGlobalXp)}
                    </span>
                </div>
                <div className="mt-1.5 border-t border-white/10 pt-1.5 text-[10px] text-[var(--text-muted)]">
                    {ungrantedXp > 0
                        ? `${formatXp(ungrantedXp)} not applied due to the daily XP cap`
                        : retainedLegacyXp > 0
                            ? `${formatXp(retainedLegacyXp)} historical XP retained`
                            : "All calculated XP applied"}
                </div>
            </div>
        </div>
    );
};

// Segmented sub-tab toggle shared by the for-you, following, and winners tabs.
function SubToggle<T extends string>({
    options,
    value,
    onChange,
}: {
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (next: T) => void;
}) {
    return (
        <div className="-mr-1 shrink-0 sm:mr-0">
            <div className="inline-flex w-fit items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5 sm:gap-1 sm:p-1">
                {options.map((option) => {
                    const active = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:py-1 sm:text-[11px] ${active
                                ? "bg-white/10 text-white"
                                : "text-[var(--text-secondary)] hover:text-white"
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const resolveLegCategoryLabel = (market?: string) => {
    if (!market) return null;
    const upper = market.toUpperCase();
    if (upper.includes("MONEYLINE") || upper.includes("POINT SPREAD") || upper.includes("TOTAL")) {
        return "game lines";
    }
    if (upper.includes("PASSING")) return "passing props";
    if (upper.includes("RECEIVING") || upper.includes("RECEPTION")) return "receiving props";
    if (upper.includes("RUSHING")) return "rushing props";
    if (upper.includes("TD")) return "td scorer props";
    return market.replace(/Player\s+/i, "Player ").toLowerCase();
};

const FEED_MAX_VISIBLE = 7;
const FEED_CARD_EST_HEIGHT = 220;
const feedScrollStyle = {
    "--feed-max-height": `${FEED_MAX_VISIBLE * FEED_CARD_EST_HEIGHT}px`,
} as CSSProperties;

const WinningHeaderArt = () => (
    <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-12 overflow-hidden rounded-t-[11px] opacity-[0.16] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
            backgroundImage: "url('/winning-card-lock-bg.svg')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center 18%",
            backgroundSize: "cover",
        }}
    />
);

const SocialPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<SocialTab>("for-you");
    const [winnersRange, setWinnersRange] = useState<WeeklyWinnersRange>("this-week");
    const [forYouScope, setForYouScope] = useState<"posts" | "reacted">("posts");
    const [followingScope, setFollowingScope] = useState<"posts" | "winning">("posts");
    const [collapsedPicks, setCollapsedPicks] = useState<Record<string, boolean>>({});
    const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const limit = 10;

    const currentUser = useCurrentUser();

    const { loading: pickLoader, message: pickMessage, postPicks, globalLeaderboard, globalLeaderboardLoading } = useSelector((state: RootState) => state.pick);
    // TUTORIAL DISABLED 2026-08-17
    // const { hasSeenSocialIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    const fetchDataByTab = (pageNum: number, customLimit?: number) => {
        const payload = { page: pageNum, limit: customLimit ?? limit };
        if (activeTab === "for-you") {
            if (forYouScope === "posts") {
                dispatch(fetchGlobalPendingTopHitPostsRequest(payload));
            } else if (forYouScope === "reacted") {
                dispatch(fetchGlobalPendingReactedPostsRequest(payload));
            }
        }
        else if (activeTab === "following") {
            if (followingScope === "posts") {
                dispatch(fetchFollowingUsersPostsRequest(payload));
            } else if (followingScope === "winning") {
                dispatch(fetchFollowingUsersWinTopHitPostsRequest(payload));
            }
        }
        else if (activeTab === "wins") {
            dispatch(fetchGlobalWinnerTopHitPostsRequest(payload));
        }
        // `rankings` is not paged and does not read the post feed — it has its
        // own leaderboard fetch below, keyed on the week range.
    };

    useEffect(() => {
        if (!currentUser) return;
        setPage(1);
        setHasMore(true);
        fetchDataByTab(1);
    }, [activeTab, forYouScope, dispatch, currentUser, followingScope]);

    useEffect(() => {
        if (!currentUser) return;
        if (activeTab === "rankings") {
            dispatch(fetchGlobalLeaderboardRequest({ range: winnersRange }));
        }
    }, [dispatch, currentUser, winnersRange, activeTab]);

    useEffect(() => {
        if (pickLoader || !pickMessage) return;

        dispatch(clearFetchAllGlobalPostPicksMessage());
        // Refresh all pages from 1 up to the current viewport to ensure data consistency
        fetchDataByTab(1, page * limit);
    }, [pickLoader, pickMessage, dispatch, page, limit]);

    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (pickLoader) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchDataByTab(nextPage);
            }
        });

        if (node) observer.current.observe(node);
    }, [pickLoader, hasMore, page]);

    useEffect(() => {
        if (!pickLoader && postPicks) {
            if (postPicks.length < page * limit) {
                setHasMore(false);
            }
        }
    }, [postPicks, pickLoader, page]);

    const feedItems: Picks = useMemo(() => {
        if (!Array.isArray(postPicks) || !postPicks?.length) return [];
        return postPicks.filter((pick) => pick.pick_type === PickType.POST)
    }, [postPicks]);

    const recencySort = useCallback((a: Pick, b: Pick) => {
        const timeA = new Date(a.created_at ?? a.updated_at ?? 0).getTime();
        const timeB = new Date(b.created_at ?? b.updated_at ?? 0).getTime();
        return timeB - timeA;
    }, []);

    const forYouBaseFeed = useMemo(
        () => feedItems.slice().sort(recencySort),
        [feedItems, recencySort]
    );

    const forYouFeed = useMemo(
        () => forYouBaseFeed.filter((item) => isPendingResult(item.result)),
        [forYouBaseFeed]
    );

    const winnersLeaderboard = globalLeaderboard;

    const toggleCollapsed = useCallback((pickId: string) => {
        setCollapsedPicks((prev) => ({
            ...prev,
            [pickId]: !prev[pickId],
        }));
    }, []);

    const handleViewProfile = (userId: string | undefined) => {
        if (userId) {
            router.push(getProfilePath(userId, currentUser?.userId));
        }
    };

    const handleViewPick = (userId: string, pickId: string) => {
        router.push(
            `${getProfilePath(userId, currentUser?.userId)}?pick=${encodeURIComponent(pickId)}`
        );
    };

    const handleReaction = (pickId: string, reaction: PickReaction) => {
        if (reaction && pickId) {
            dispatch(createPickReactionRequest({ pick_id: pickId, action: reaction === "up" ? "liked" : "dislike" }));
        }
    };

    // TUTORIAL DISABLED 2026-08-17
    // const handleCompleteGlobalIntro = () => {
    //     dispatch(updateTutorialProgressRequest({ tutorial_key: "social" }));
    // }

    const renderTabButton = (tab: SocialTab, label: string) => {
        const active = activeTab === tab;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-2 py-1.5 text-center text-[10px] font-semibold tracking-[0.1em] transition sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.12em] ${active
                    ? "border-white text-white"
                    : "border-transparent text-[var(--text-secondary)] hover:text-white"
                    }`}
            >
                {label}
            </button>
        );
    };

    const renderFeedItems = (
        items: Picks,
        emptyCopy: string,
        showReactions = true,
        showTopBorder = true,
        showResult = true,
    ) => (
        <div
            className={`-mx-5 divide-y divide-white/10 overflow-visible sm:mx-0 sm:overflow-y-auto ${showTopBorder ? "border-y border-white/10" : "border-b border-white/10"
                }`}
            style={feedScrollStyle}
        >
            {items.map((item, index) => {
                if (!currentUser?.userId) return;
                const showResultChip = showResult && item.result && item.result !== "pending";
                const isCollapsed = Boolean(collapsedPicks[item.id]);
                const resultLabel = item.result === "not_found" ? "n/a" : item.result;
                const username = item?.profiles?.username ?? "";
                const displayName =
                    username.length > 12
                        ? `${username.slice(0, 12)}\u2026`
                        : username;
                const profileImg = generateProfileImageUrl(item?.profiles?.profile_image);
                const tierMeta = getTierMetaForPick({
                    odds: item.odds_bracket,
                    label: item.difficulty_label,
                    points: item.points,
                    mode: "global",
                });
                const calculatedGlobalXp = getCalculatedGlobalXpForPick(item);
                const displayedGlobalXp =
                    item.result === "pending"
                        ? calculatedGlobalXp
                        : getAppliedGlobalXpForPick(item);
                const xpHelperLabel = item.result === "pending" ? "Potential XP" : "XP";
                const xpPrimary = tierMeta
                    ? `${displayedGlobalXp > 0 ? "+" : ""}${displayedGlobalXp.toLocaleString()} XP`
                    : "—";
                const tierCardStyle = tierMeta?.color ? getTierCardStyle(tierMeta.color) : undefined;
                const tierCardTone = tierCardStyle
                    ? "bg-transparent"
                    : tierMeta?.color
                        ? `bg-gradient-to-br ${tierMeta.color}`
                        : "bg-white/[0.04]";
                const confidenceLabel = item.confidence ? item.confidence.toLowerCase() : null;
                const confidenceTone =
                    confidenceLabel === "high"
                        ? "text-sky-100"
                        : confidenceLabel === "medium"
                            ? "text-amber-100"
                            : confidenceLabel === "low"
                                ? "text-rose-100"
                                : "text-slate-500";
                const comboLabel = item.is_combo
                    ? `combo${item.legs?.length ? ` · ${item.legs.length} legs` : ""}`
                    : null;
                const displayPick = item.description ?? "No pick was submitted";
                const pickLine = extractPickLine(displayPick);
                const matchupCopy = extractMatchup(displayPick, item.matchup) ?? PLACEHOLDER;
                const gameTimeCopy = formatDateTime(item.selection?.gameStartTime);
                const showMatchup = matchupCopy !== PLACEHOLDER;
                const showGameTime = gameTimeCopy !== PLACEHOLDER;
                const oddsCopy = item.odds_bracket ?? PLACEHOLDER;
                const legsCount = item.legs?.length ?? 0;
                const legsCopy = legsCount > 0 ? `${legsCount} picks` : item.is_combo ? "combo" : null;
                const postedLine = `${legsCopy ? `${legsCopy} \u00b7 ` : ""}${postedAtLabel(
                    item.created_at ?? item.updated_at
                )}`;
                const baseSourceTabLabel =
                    item.source_tab ?? (item.is_combo || item.legs?.length ? "Combo" : "Pick");
                const normalizedSourceTabLabel = baseSourceTabLabel.toLowerCase();
                const showComboLegs = Boolean(item.is_combo && item.legs && item.legs.length > 0);
                const singleCategoryLabel =
                    normalizedSourceTabLabel === "pick"
                        ? resolveLegCategoryLabel(item.selection?.market) ?? normalizedSourceTabLabel
                        : normalizedSourceTabLabel;
                const postHeaderLabel = showComboLegs
                    ? normalizedSourceTabLabel === "combo"
                        ? "combo pick post"
                        : normalizedSourceTabLabel
                    : "single pick post";
                const detailCategoryLabel = showComboLegs ? null : singleCategoryLabel;
                const metaLabel = [showMatchup ? matchupCopy : null, showGameTime ? gameTimeCopy : null]
                    .filter(Boolean)
                    .join(META_SEPARATOR);
                const up = item.up ?? 0;
                const down = item.down ?? 0;
                const userReaction = item.reaction ?? undefined;
                const upActive = userReaction === "up";
                const downActive = userReaction === "down";
                const isWinningPost = item.result === "win";
                const isLosingPost = item.result === "loss";
                const isPendingPost = (item.result ?? "pending") === "pending";
                const pickAccentDotTone = isWinningPost
                    ? "bg-emerald-300/80"
                    : isLosingPost
                        ? "bg-rose-300/80"
                        : "bg-sky-300/80";
                const pickAccentTextTone = isWinningPost
                    ? "text-emerald-200"
                    : isLosingPost
                        ? "text-rose-200"
                        : "text-sky-200";

                return (
                    <div
                        key={item.id}
                        ref={index === items.length - 1 ? lastItemRef : null}
                        className={`py-4 ${index % 2 === 1 ? "bg-white/[0.025]" : ""}`.trim()}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6">
                            <button
                                type="button"
                                onClick={() => {
                                    handleViewProfile(item.profiles?.id)
                                }}
                                className="group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5"
                            >
                                <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition group-hover:text-sky-100">
                                    {profileImg ? (
                                        <Image
                                            src={profileImg}
                                            alt="Profile image"
                                            width={56}
                                            height={56}
                                            className={`tracking-wide rounded-full border object-cover h-9 w-9`}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            unoptimized
                                        />
                                    ) : (
                                        <UserIcon className="h-6 w-6 text-white/80 sm:h-7 sm:w-7" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--app-text)]">
                                        <span className="sm:hidden">{displayName}</span>
                                        <span className="hidden sm:inline">{item.profiles?.username}</span>
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">view profile</p>
                                </div>
                            </button>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {showReactions && (
                                    <div className="flex items-center gap-2">
                                        {isCollapsed && (
                                            <span className="text-[12px] font-semibold text-slate-100">
                                                {oddsCopy}
                                            </span>
                                        )}
                                        {/* <button
                                            type="button"
                                            onClick={() => handleReaction(item.id, "up")}
                                            aria-pressed={upActive}
                                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${upActive
                                                ? "border-sky-300/70 bg-sky-500/20 text-sky-100"
                                                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                                                }`}
                                        >
                                            <span aria-hidden="true">{UP_TRIANGLE}</span>
                                            <span className="tabular-nums text-[11px]">{up}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReaction(item.id, "down")}
                                            aria-pressed={downActive}
                                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${downActive
                                                ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                                                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                                                }`}
                                        >
                                            <span aria-hidden="true">{DOWN_TRIANGLE}</span>
                                            <span className="tabular-nums text-[11px]">{down}</span>
                                        </button> */}
                                        <PostReactionButtons
                                            up={up}
                                            down={down}
                                            userReaction={userReaction}
                                            onReaction={(reaction) => handleReaction(item.id, reaction)}
                                        />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleCollapsed(item.id)}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? "Expand post" : "Collapse post"}
                                    className={`inline-flex h-4 w-4 items-center justify-center text-[10px] font-semibold transition ${isCollapsed
                                        ? "text-[var(--text-secondary)] hover:text-white"
                                        : "text-white/90 hover:text-white"
                                        }`}
                                >
                                    {isCollapsed ? COLLAPSE_DOWN_TRIANGLE : COLLAPSE_UP_TRIANGLE}
                                </button>
                                {showResultChip && (
                                    <span
                                        className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${resultTone(
                                            item.result
                                        )}`}
                                    >
                                        {resultLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="space-y-3 px-5 sm:px-6">
                                <div
                                    className={`flex flex-col gap-2 sm:flex-row ${showComboLegs ? "sm:items-start" : "sm:items-stretch"
                                        }`}
                                >
                                    <div
                                        className={`order-2 flex w-full h-full gap-2 sm:order-1 sm:w-[140px] sm:h-[140px] sm:flex-col ${showComboLegs ? "sm:self-start" : "sm:self-stretch"
                                            }`}
                                    >
                                        <div
                                            className={`w-full h-full flex-1 rounded-xl sm:max-h-[65px] border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
                                                } ${tierCardTone}`}
                                            style={tierCardStyle}
                                        >
                                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                {xpHelperLabel}
                                            </span>
                                            <span className="mt-1 block text-xs font-semibold text-white">
                                                {xpPrimary}
                                            </span>
                                        </div>
                                        <div
                                            className={`w-full flex-1 rounded-xl border border-white/10 ${NEUTRAL_POST_CARD_SURFACE} p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
                                                }`}
                                        >
                                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                confidence
                                            </span>
                                            <span className={`mt-1 block text-xs font-semibold ${confidenceTone}`}>
                                                {confidenceLabel ?? "—"}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative order-1 flex-1 overflow-hidden rounded-xl border p-3 sm:order-2 ${isWinningPost
                                            ? `${WINNING_POST_CARD_TONE} ${NEUTRAL_POST_CARD_SURFACE}`
                                            : isLosingPost
                                                ? `${LOSING_POST_CARD_TONE} ${NEUTRAL_POST_CARD_SURFACE}`
                                                : isPendingPost
                                                    ? PENDING_POST_CARD_TONE
                                                    : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE} shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]`
                                            }`}
                                    >
                                        {isWinningPost && <WinningHeaderArt />}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    {postHeaderLabel}
                                                </span>
                                                {!showComboLegs && (
                                                    <>
                                                        <div className="mt-3 h-px w-full bg-white/10" />
                                                        <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
                                                            <div className="min-w-0 flex flex-1 items-center gap-2">
                                                                <span
                                                                    className={`mt-2 h-1.5 w-1.5 rounded-full ${pickAccentDotTone}`}
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    {detailCategoryLabel && (
                                                                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                            {detailCategoryLabel}
                                                                        </span>
                                                                    )}
                                                                    <p
                                                                        className={`mt-1 min-w-0 text-[12px] font-semibold leading-snug ${pickAccentTextTone}`}
                                                                        title={displayPick}
                                                                    >
                                                                        {pickLine}
                                                                    </p>
                                                                    {metaLabel && (
                                                                        <p className="mt-1 truncate text-[10px] text-slate-400">
                                                                            {metaLabel}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 pt-2">
                                                                <span className="text-[11px] font-semibold text-slate-100">
                                                                    {oddsCopy}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {showComboLegs && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[12px] font-semibold text-slate-100">
                                                        {oddsCopy}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {showComboLegs && <div className="mt-3 h-px w-full bg-white/10" />}
                                        {showComboLegs ? (
                                            <>
                                                <ul className="mt-3 space-y-2">
                                                    {item.legs?.map((leg, index) => {
                                                        const legPickLine = extractPickLine(leg.description);
                                                        const legMatchup = extractMatchup(leg.description, leg.matchup);
                                                        const legTime = formatDateTime(leg.selection?.gameStartTime);
                                                        const legMeta = [legMatchup, legTime !== PLACEHOLDER ? legTime : null]
                                                            .filter(Boolean)
                                                            .join(META_SEPARATOR);
                                                        const legCategory = resolveLegCategoryLabel(leg.selection?.market);
                                                        return (
                                                            <li
                                                                key={`${leg.description}-${index}`}
                                                                className="flex items-start justify-between gap-3"
                                                            >
                                                                <div className="min-w-0 flex items-start gap-2">
                                                                    <span
                                                                        className={`mt-2 h-1.5 w-1.5 rounded-full ${pickAccentDotTone}`}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        {legCategory && (
                                                                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                {legCategory}
                                                                            </span>
                                                                        )}
                                                                        <p
                                                                            className={`min-w-0 text-[12px] font-semibold leading-snug ${pickAccentTextTone}`}
                                                                        >
                                                                            {legPickLine}
                                                                        </p>
                                                                        {legMeta && (
                                                                            <p className="mt-1 text-[10px] text-slate-400">{legMeta}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 pt-2">
                                                                    <span className="text-[11px] font-semibold text-slate-100">
                                                                        {leg.odds_bracket ?? PLACEHOLDER}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                                        {!showComboLegs && comboLabel && (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-gray-200">
                                                {comboLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                        {(item.sport?.toString().toUpperCase() || "SPORT") +
                                            " · " +
                                            postedLine}
                                    </div>
                                </div>
                            </div>
                        )}
                        {isCollapsed && (
                            <div className="px-5 sm:px-6">
                                <div className="flex justify-end text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {(item.sport?.toString().toUpperCase() || "SPORT") +
                                        " · " +
                                        postedLine}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {items.length === 0 && !pickLoader && (
                <div className="px-5 py-4 sm:px-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                        {emptyCopy}
                    </div>
                </div>
            )}

            {pickLoader && (
                <div className="divide-y divide-white/10">
                    {[1, 2, 3].map((i) => (
                        <PostPickSkeleton key={i} />
                    ))}
                </div>
            )}

            {pickLoader && items.length > 0 && (
                <div className="border-t border-white/10">
                    <PostPickSkeleton />
                </div>
            )}
        </div>
    );

    /**
     * The Rankings tab, on the shared gold standings surface.
     *
     * Ported from the MVP's `renderWinnersUserLeaderboard`
     * (app/social/page.tsx:409-500): the same `StandingsCard` the Arena and
     * League boards already use, so Global stops hand-rolling its own header,
     * column strip and row tint. Global keeps its own four metrics — that is
     * what `LEADERBOARD_GRID` is for — but the frame, the rank badge, the
     * identity block and the podium treatment now come from one place.
     *
     * The avatar swap matters beyond looks: this used to key a SINGLE
     * `imgError` flag for the whole board, so one member's broken image blanked
     * every avatar on the page. `StandingIdentity` owns per-row fallback.
     */
    const renderWinnersUserLeaderboard = () => {
        if (!winnersLeaderboard) {
            return globalLeaderboardLoading ? (
                <GlobalLeaderboardSkeleton />
            ) : (
                <p className="py-4 text-sm text-[var(--text-secondary)]">
                    No public weekly winners yet.
                </p>
            );
        }

        const weekLabel = formatWeekRange(
            new Date(winnersLeaderboard.week.start),
            new Date(winnersLeaderboard.week.end)
        );

        const rangeControls = (
            <div
                role="group"
                aria-label="Weekly rankings period"
                className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide sm:gap-4 sm:text-[11px]"
            >
                {(["this-week", "last-week"] as const).map((range) => {
                    const active = winnersRange === range;
                    return (
                        <button
                            key={range}
                            type="button"
                            onClick={() => setWinnersRange(range)}
                            aria-pressed={active}
                            className={`relative whitespace-nowrap pb-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 ${active ? "text-white" : "text-amber-100/45 hover:text-white"
                                }`}
                        >
                            {range === "this-week" ? "this week" : "last week"}
                            {active ? (
                                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-300/80" />
                            ) : null}
                        </button>
                    );
                })}
            </div>
        );

        return (
            <StandingsCard
                rows={winnersLeaderboard.userRows}
                getRowKey={(row) => row.user_id}
                columns={[
                    { key: "rank", label: "Rank" },
                    { key: "player", label: "Player" },
                    {
                        key: "win",
                        label: (
                            <span className="whitespace-normal leading-tight">Biggest Win</span>
                        ),
                    },
                    { key: "xp", label: "XP", className: "text-right" },
                ]}
                gridClassName={LEADERBOARD_GRID}
                title="Weekly XP Rankings"
                titleId="weekly-xp-rankings"
                subtitle={`${weekLabel} · ${winnersLeaderboard.userRows.length} ranked`}
                actions={rangeControls}
                presentation="page"
                rootClassName="-mx-5 sm:mx-0"
                emptyState={
                    <p className="px-5 py-5 text-sm text-amber-100/45 sm:px-4">
                        No public weekly winners yet.
                    </p>
                }
                renderRow={(row) => {
                    const userName = row.username ?? "Member";
                    const winLabel = row.win_count === 1 ? "1 win" : `${row.win_count} wins`;

                    return (
                        <div
                            data-lifetime-standing-row
                            data-lifetime-standing-theme="gold"
                            className={`grid min-h-[3.3125rem] ${LEADERBOARD_GRID} ${STANDINGS_CARD_STYLES.fullPageRow}`}
                        >
                            <StandingRank rank={row.rank} />
                            <button
                                type="button"
                                onClick={() => handleViewProfile(row.user_id)}
                                aria-label={`View @${userName}'s profile`}
                                className="group flex min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70"
                            >
                                <StandingIdentity
                                    avatarUrl={generateProfileImageUrl(row.profile_image ?? "")}
                                    displayName={userName}
                                    handle={userName}
                                    rank={row.rank}
                                    className="gap-2 sm:gap-2.5"
                                    meta={winLabel}
                                />
                            </button>
                            {renderBiggestHitCell(row.biggest_win_post, () =>
                                handleViewPick(row.user_id, row.biggest_win_pick_id)
                            )}
                            <GlobalXpCell
                                appliedGlobalXp={row.biggest_win_post?.applied_global_xp ?? 0}
                                calculatedGlobalXp={row.biggest_win_post?.calculated_global_xp ?? 0}
                            />
                        </div>
                    );
                }}
            />
        );
    };

    const handleUserSearch = () => {
        dispatch(fetchFollowingListRequest());
        setIsUserSearchOpen(true);
    }

    if (!currentUser) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <section className="space-y-4">
                <div className="-mx-5 sm:mx-0">
                    <div className="flex flex-nowrap items-center justify-between sm:gap-2 overflow-x-auto px-2 sm:px-6">
                        <div className="inline-flex w-fit items-center sm:gap-1">
                            {renderTabButton("for-you", "for you")}
                            {renderTabButton("following", "following")}
                            {renderTabButton("wins", "wins")}
                            {renderTabButton("rankings", "rankings")}
                            <button
                                type="button"
                                onClick={handleUserSearch}
                                aria-label="Search members"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center transition sm:h-9 sm:w-9 ${isUserSearchOpen
                                    ? "text-white"
                                    : "text-[var(--text-secondary)] hover:text-white"
                                    }`}
                            >
                                <SearchIcon className="h-4 w-4" />
                            </button>
                        </div>
                        {/* No SubToggle for wins/rankings any more — each is its
                            own tab, so the strip above already IS the choice. */}
                        {activeTab === "for-you" && (
                            <SubToggle
                                value={forYouScope}
                                onChange={setForYouScope}
                                options={[
                                    { value: "posts", label: "latest" },
                                    { value: "reacted", label: "reacted" },
                                ]}
                            />
                        )}
                        {activeTab === "following" && (
                            <SubToggle
                                value={followingScope}
                                onChange={setFollowingScope}
                                options={[
                                    { value: "posts", label: "latest" },
                                    { value: "winning", label: "wins" },
                                ]}
                            />
                        )}
                    </div>
                </div>

                {activeTab === "wins" && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                recent wins
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                {feedItems.length} posts
                            </p>
                        </div>
                        {renderFeedItems(feedItems, "No public winning posts yet.", false)}
                    </section>
                )}

                {activeTab === "rankings" && (
                    <section className="space-y-4">{renderWinnersUserLeaderboard()}</section>
                )}

                {activeTab === "for-you" && (
                    <section className="space-y-4">
                        {forYouScope === "posts"
                            ? renderFeedItems(
                                forYouFeed,
                                "No pending public posts yet. Share a pick from the builder to light this up.",
                                true,
                                true,
                                false,
                            )
                            : renderFeedItems(
                                feedItems,
                                "No reacted posts yet. Tap like or dislike on a post to save it here.",
                                true,
                                true,
                                false,
                            )}
                    </section>
                )}

                {activeTab === "following" && (
                    <section className="space-y-4">
                        {followingScope === "posts"
                            ? renderFeedItems(
                                feedItems,
                                feedItems.length === 0
                                    ? "Follow members to see their posts land here."
                                    : "No posts from people you follow yet. Check back after they drop picks.",
                                true,
                                true,
                                false,
                            )
                            : renderFeedItems(
                                feedItems,
                                feedItems.length === 0
                                    ? "Follow members to see their wins land here."
                                    : "No winning posts from people you follow yet.",
                                true
                            )
                        }
                    </section>
                )}
            </section>

            <UserSearchDialog open={isUserSearchOpen} onClose={() => setIsUserSearchOpen(false)} />
            {/* TUTORIAL DISABLED 2026-08-17
            <OnboardingModal
                open={hasSeenWelcomeIntro && !hasSeenSocialIntro}
                steps={GLOBAL_TUTORIAL}
                onClose={() => {
                    handleCompleteGlobalIntro();
                    router.push("/home");
                }}
            /> */}
        </div>
    );
};

export default SocialPage;
