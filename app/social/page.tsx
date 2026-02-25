"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pick, PickReaction, PickResult, Picks, PickType, RootState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearFetchAllGlobalPostPicksMessage, createPickReactionRequest, fetchFollowingUsersPostsRequest, fetchFollowingUsersWinTopHitPostsRequest, fetchGlobalPendingReactedPostsRequest, fetchGlobalPendingTopHitPostsRequest, fetchGlobalWinnerTopHitPostsRequest } from "@/lib/redux/slices/pickSlice";
import Image from "next/image";
import { formatTierPrimary, getTierMetaForPick } from "@/lib/utils/scoring";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { formatDateTime } from "@/lib/utils/date";

type SocialTab = "top-hits" | "for-you" | "following";

const resultTone = (result: PickResult | null | undefined) => {
    switch (result) {
        case "win":
            return "border-emerald-300/60 bg-emerald-500/15 text-emerald-100";
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

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;
const PLACEHOLDER = EM_DASH;
const META_SEPARATOR = " \u00b7 ";
const UP_TRIANGLE = "\u25B2";
const DOWN_TRIANGLE = "\u25BC";

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

const extractPickLine = (description: string) => {
    const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
    const candidate = matchupSegment?.trim();
    const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
    if (hasMatchup && lineSegments.length > 0) {
        return lineSegments.join(DASH_SEPARATOR);
    }
    return description;
};

const extractMatchup = (description?: string | null) => {
    if (!description) return null;
    const [lead] = description.split(DASH_SEPARATOR);
    const candidate = lead?.trim();
    if (candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate)) {
        return candidate;
    }
    const match = description.match(
        new RegExp(`([^${EM_DASH}]*?(@|\\bvs\\.?\\b|\\bv\\.?\\b)[^${EM_DASH}]*)`, "i")
    );
    return match ? match[1].trim() : null;
};

const FEED_MAX_VISIBLE = 7;
const FEED_CARD_EST_HEIGHT = 220;

const SocialPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<SocialTab>("for-you");
    const [topHitsScope, setTopHitsScope] = useState<"global" | "following">("global");
    const [forYouScope, setForYouScope] = useState<"posts" | "reacted">("posts");
    const [collapsedPicks, setCollapsedPicks] = useState<Record<string, boolean>>({});

    const currentUser = useCurrentUser();

    const { loading: pickLoader, message: pickMessage, postPicks } = useSelector((state: RootState) => state.pick);

    // useEffect(() => {
    //     // dispatch(fetchFollowersListRequest());
    //     dispatch(fetchFollowingListRequest());
    // }, [dispatch]);

    const fetchDataByTab = () => {
        if (activeTab === "for-you") {
            if (forYouScope === "posts") {
                dispatch(fetchGlobalPendingTopHitPostsRequest());
            } else if (forYouScope === "reacted") {
                dispatch(fetchGlobalPendingReactedPostsRequest());
            }
        }
        else if (activeTab === "following") {
            dispatch(fetchFollowingUsersPostsRequest());
        }
        else if (activeTab === "top-hits") {
            if (topHitsScope === "global") {
                dispatch(fetchGlobalWinnerTopHitPostsRequest());
            } else if (topHitsScope === "following") {
                dispatch(fetchFollowingUsersWinTopHitPostsRequest());
            }
        }
    };

    useEffect(() => {
        fetchDataByTab();
    }, [activeTab, forYouScope, topHitsScope, dispatch]);

    useEffect(() => {
        if (pickLoader || !pickMessage) return;

        dispatch(clearFetchAllGlobalPostPicksMessage());
        fetchDataByTab();
    }, [pickLoader, pickMessage, dispatch]);

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

    // const isFollowing = useCallback(
    //     (followerId: string | undefined, targetUserId: string | undefined): boolean => {
    //         if (!Array.isArray(followings) || followings.length === 0) {
    //             return false;
    //         }

    //         return followings.some(
    //             (f) =>
    //                 f.follower_id === followerId &&
    //                 f.following_id === targetUserId
    //         );
    //     },
    //     [followings]
    // );

    const toggleCollapsed = useCallback((pickId: string) => {
        setCollapsedPicks((prev) => ({
            ...prev,
            [pickId]: !prev[pickId],
        }));
    }, []);

    const handleViewProfile = (userId: string | undefined) => {
        if (userId) {
            router.push(`/user/${userId}`);
        }
    };

    const handleReaction = (pickId: string, reaction: PickReaction) => {
        if (reaction && pickId) {
            dispatch(createPickReactionRequest({ pick_id: pickId, action: reaction === "up" ? "liked" : "dislike" }));
        }
    };

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
        showTopBorder = true
    ) => (
        <div
            className={`-mx-5 divide-y divide-white/10 overflow-y-auto sm:mx-0 
                ${showTopBorder ? "border-y border-white/10" : "border-b border-white/10"
                }`}
            // style={{ maxHeight: `${FEED_MAX_VISIBLE * FEED_CARD_EST_HEIGHT}px` }}
        >
            {items.map((item) => {
                if (!currentUser?.userId) return;
                const showResultChip = item.result && item.result !== "pending";
                const isCollapsed = Boolean(collapsedPicks[item.id]);
                const resultLabel = item.result === "not_found" ? "n/a" : item.result;
                const username = item?.profiles?.username ?? "";
                const displayName =
                    username.length > 12
                        ? `${username.slice(0, 12)}\u2026`
                        : username;
                const profileImg = item?.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${item?.profiles?.profile_image}` : "";
                const tierMeta = getTierMetaForPick({
                    odds: item.odds_bracket,
                    label: item.difficulty_label,
                    points: item.points,
                    mode: "global",
                });
                const tierPrimary = tierMeta
                    ? `${formatTierPrimary(tierMeta.tier)}${tierMeta.points ? ` • ${tierMeta.points} pts` : ""
                    }`
                    : "Tier —";
                const tierCardStyle = tierMeta?.color ? getTierCardStyle(tierMeta.color) : undefined;
                const tierCardTone = tierCardStyle
                    ? "bg-transparent"
                    : tierMeta?.color
                        ? `bg-gradient-to-br ${tierMeta.color}`
                        : "bg-white/[0.04]";
                const confidenceLabel = item.confidence ? item.confidence.toLowerCase() : null;
                const confidenceTone =
                    confidenceLabel === "high"
                        ? "text-emerald-100"
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
                const matchupCopy = extractPickLine(displayPick) ?? item.matchup ?? PLACEHOLDER;
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
                const sourceTabLabel =
                    normalizedSourceTabLabel === "pick"
                        ? "single pick post"
                        : normalizedSourceTabLabel === "combo"
                            ? "combo pick post"
                            : normalizedSourceTabLabel;
                const showComboLegs = Boolean(item.is_combo && item.legs && item.legs.length > 0);
                const up = item.up ?? 0;
                const down = item.down ?? 0;
                const userReaction = item.reaction ?? undefined;
                const upActive = userReaction === "up";
                const downActive = userReaction === "down";

                return (
                    <div
                        key={item.id}
                        className="py-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6">
                            <button
                                type="button"
                                onClick={() => {
                                    handleViewProfile(item.profiles?.id)
                                }}
                                className="group -ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left transition hover:border-white/15 hover:bg-white/5"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100 transition group-hover:text-emerald-100">
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
                                        <span className="tracking-wide">
                                            {item?.profiles?.username ? item?.profiles?.username.slice(0, 2) : "UR"}
                                        </span>
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
                                        <button
                                            type="button"
                                            onClick={() => handleReaction(item.id, "up")}
                                            aria-pressed={upActive}
                                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${upActive
                                                ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
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
                                        </button>
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
                                    {isCollapsed ? DOWN_TRIANGLE : UP_TRIANGLE}
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
                                        className={`order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:flex-col ${showComboLegs ? "sm:self-start" : "sm:self-stretch"
                                            }`}
                                    >
                                        <div
                                            className={`w-full flex-1 rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
                                                } ${tierCardTone}`}
                                            style={tierCardStyle}
                                        >
                                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                tier
                                            </span>
                                            <span className="mt-1 block text-xs font-semibold text-white">
                                                {tierPrimary}
                                            </span>
                                        </div>
                                        <div
                                            className={`w-full flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
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

                                    <div className="order-1 flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] sm:order-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    {sourceTabLabel}
                                                </span>
                                                {!showComboLegs && (
                                                    <>
                                                        <div className="mt-2 h-px w-full bg-white/10" />
                                                        <div className="mt-2 flex min-w-0 items-baseline justify-between gap-3">
                                                            <p
                                                                className="min-w-0 flex-1 whitespace-normal break-words text-sm font-semibold leading-snug text-cyan-100"
                                                                title={displayPick}
                                                            >
                                                                {pickLine}
                                                            </p>
                                                            <span className="shrink-0 text-[12px] font-semibold text-slate-100">
                                                                {oddsCopy}
                                                            </span>
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
                                                        const legMatchup = extractMatchup(leg.description);
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
                                                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                                                                    <div className="min-w-0">
                                                                        {legCategory && (
                                                                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                {legCategory}
                                                                            </span>
                                                                        )}
                                                                        <p className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200">
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
                                        ) : (
                                            <div className="mt-2 text-[11px] text-slate-300">
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    matchup
                                                </span>
                                                {showMatchup ? (
                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-200">
                                                        {matchupCopy}
                                                    </span>
                                                ) : (
                                                    <span className="mt-0.5 block text-[11px] text-slate-500">
                                                        {PLACEHOLDER}
                                                    </span>
                                                )}
                                                {showGameTime && (
                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-200">
                                                        {gameTimeCopy}
                                                    </span>
                                                )}
                                                {legsCopy && (
                                                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                        {legsCopy}
                                                    </span>
                                                )}
                                            </div>
                                        )}
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

            {items.length === 0 && (
                <div className="px-5 py-4 sm:px-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                        {emptyCopy}
                    </div>
                </div>
            )}
        </div>
    );

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
                    <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto px-5 sm:px-0">
                        <div className="inline-flex w-fit items-center gap-0.5 sm:gap-1">
                            {renderTabButton("for-you", "for you")}
                            {renderTabButton("following", "following")}
                            {renderTabButton("top-hits", "winners")}
                        </div>
                        {activeTab === "top-hits" && (
                            <div className="shrink-0">
                                <div className="inline-flex w-fit items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5 sm:gap-1 sm:p-1">
                                    {(["global", "following"] as const).map((scope) => {
                                        const active = topHitsScope === scope;
                                        return (
                                            <button
                                                key={scope}
                                                type="button"
                                                onClick={() => setTopHitsScope(scope)}
                                                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:py-1 sm:text-[11px] ${active
                                                    ? "bg-white/10 text-white"
                                                    : "text-[var(--text-secondary)] hover:text-white"
                                                    }`}
                                            >
                                                {scope === "global" ? "global" : "following"}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {activeTab === "for-you" && (
                            <div className="shrink-0">
                                <div className="inline-flex w-fit items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5 sm:gap-1 sm:p-1">
                                    {(["posts", "reacted"] as const).map((scope) => {
                                        const active = forYouScope === scope;
                                        return (
                                            <button
                                                key={scope}
                                                type="button"
                                                onClick={() => setForYouScope(scope)}
                                                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:py-1 sm:text-[11px] ${active
                                                    ? "bg-white/10 text-white"
                                                    : "text-[var(--text-secondary)] hover:text-white"
                                                    }`}
                                            >
                                                {scope === "posts" ? "all posts" : "reacted to"}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {activeTab === "top-hits" && (
                    <section className="space-y-4">
                        {renderFeedItems(
                            feedItems,
                            topHitsScope === "following"
                                ? "No recent wins from the people you follow yet."
                                : "No winning posts in the last day. Check back soon.",
                            false
                        )}
                    </section>
                )}

                {activeTab === "for-you" && (
                    <section className="space-y-4">
                        {forYouScope === "posts"
                            ? renderFeedItems(
                                forYouFeed,
                                "No pending public posts yet. Share a pick from the builder to light this up."
                            )
                            : renderFeedItems(
                                feedItems,
                                "No reacted posts yet. Tap up or down on a post to save it here."
                            )}
                    </section>
                )}

                {activeTab === "following" && (
                    <section className="space-y-4">
                        {renderFeedItems(
                            feedItems,
                            feedItems.length === 0
                                ? "Follow members to see their posts land here."
                                : "No posts from people you follow yet. Check back after they drop picks.",
                            true
                        )}
                    </section>
                )}
            </section>
        </div>
    );
};

export default SocialPage;
