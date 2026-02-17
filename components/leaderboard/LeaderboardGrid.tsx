"use client";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { DifficultyLabel, Group, Leaderboard, leaderboardSlip, Member, Pick, PickResult, Slip, Slips, TierIndex } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { getGroupTierColor, getGroupTierName, getTierMetaForPick, GROUP_CAP_TIER, TierMeta } from "@/lib/utils/scoring";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";
import { isSlipFinal, isSlipTimeLocked } from "@/lib/slips/state";
import { LOSS_PICK_POINTS } from "@/lib/constants";

type Props = {
    group: Group | null;
    slips: Slips;
    users: Member[];
    picks: Pick[];
    leaderboard: Leaderboard[];
    currentUserId?: string;
    leaderboardId: string;
    leaderboardName?: string;
};

// const glowClassesForCumulative = (cumulative: number) => {
//     if (cumulative < 0) {
//         return {
//             cardGlow: "from-rose-500/25 via-rose-500/12 to-transparent",
//             ring: "ring-rose-300/70 shadow-[0_0_30px_rgba(244,63,94,0.25)]",
//             mobileTint: "border-rose-300/40 bg-rose-500/[0.08]",
//         };
//     }
//     if (cumulative > 0) {
//         return {
//             cardGlow: "from-emerald-500/25 via-emerald-500/10 to-transparent",
//             ring: "ring-emerald-300/70 shadow-[0_0_30px_rgba(16,185,129,0.25)]",
//             mobileTint: "border-emerald-300/40 bg-emerald-500/[0.07]",
//         };
//     }
//     return {
//         cardGlow: "from-white/20 via-white/10 to-transparent",
//         ring: "ring-white/30 shadow-[0_0_28px_rgba(255,255,255,0.18)]",
//         mobileTint: "border-white/20 bg-white/[0.06]",
//     };
// };

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 639px)");
        const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

        setIsMobile(mql.matches);
        mql.addEventListener("change", onChange);

        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isMobile;
};

const resultMeta = (pick_result?: PickResult) => {
    const result = pick_result ?? "pending";
    const tone =
        result === "win"
            ? "text-emerald-100 border-emerald-300/60 bg-emerald-500/10 shadow-[0_10px_30px_rgba(16,185,129,0.18)]"
            : result === "loss"
                ? "text-red-100 border-red-300/60 bg-red-500/12 shadow-[0_10px_30px_rgba(248,113,113,0.18)]"
                : result === "void" || result === "not_found"
                    ? "text-amber-50 border-amber-200/60 bg-amber-500/12 shadow-[0_10px_30px_rgba(251,191,36,0.18)]"
                    : "text-gray-200 border-gray-700/60 bg-white/[0.06] shadow-[0_10px_28px_rgba(0,0,0,0.35)]";

    const label =
        result === "pending" || result === null
            ? "Pending"
            : result === "void"
                ? "Void"
                : result === "not_found"
                    ? "n/a"
                    : result === "win"
                        ? "Win"
                        : "Loss";

    return { label, tone };
};

const formatPointsValue = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "—";
    return value > 0 ? `+${value}` : `${value}`;
};

const formatOddsValue = (odds: number | null) => {
    if (odds === null) return null;
    if (!Number.isFinite(odds)) return null;
    return odds > 0 ? `+${odds}` : `${odds}`;
};

const withAlpha = (hex: string, alphaHex: string) => {
    if (hex.startsWith("#") && hex.length === 7) {
        return `${hex}${alphaHex}`;
    }
    return hex;
};

const getGroupTierRangeLabel = (tierMeta: TierMeta) => {
    if (tierMeta.tier === 1) {
        const maxLabel = formatOddsValue(tierMeta.maxOdds);
        return maxLabel ? `${maxLabel} or less` : tierMeta.label;
    }
    if (tierMeta.tier === GROUP_CAP_TIER) {
        const minLabel = formatOddsValue(tierMeta.minOdds);
        return minLabel ? `${minLabel} or greater` : tierMeta.label;
    }
    return tierMeta.label;
};

const getGroupTierGradient = (tier: TierIndex) => {
    const color = getGroupTierColor(tier);
    return `linear-gradient(135deg, ${withAlpha(color, "55")}, ${withAlpha(
        color,
        "22"
    )}, rgba(0,0,0,0))`;
};

const PICK_RESULT_ACCENTS = {
    win: {
        text: "text-emerald-200",
    },
    loss: {
        text: "text-rose-200",
    },
    void: {
        text: "text-amber-100",
    },
    not_found: {
        text: "text-amber-100",
    },
    pending: {
        text: "text-slate-200",
    },
} as const;

const pickTierMeta = (pick?: { odds_bracket: string, slip_points: number, pick_difficulty_label: DifficultyLabel | null }) => {
    if (!pick) return null;
    const tierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.pick_difficulty_label,
        points: pick.slip_points,
        mode: "groupLeaderboard",
    });
    if (!tierMeta) return null;
    return {
        tier: tierMeta.tier,
        name: getGroupTierName(tierMeta.tier, tierMeta.name),
        points: tierMeta.points,
        color: tierMeta.color,
        rangeLabel: getGroupTierRangeLabel(tierMeta),
    };
};

// const computeResultPoints = (pick?: Pick) => getPickPoints(pick, "groupLeaderboard");
const computeResultPoints = (pick_difficulty_label?: DifficultyLabel | null, result?: string, points?: number, odds_bracket?: string) => {
    if (!result || !points) return 0;
    if (result === "loss") return LOSS_PICK_POINTS;
    if (result === "void") return 0;
    if (odds_bracket) {
        if (result === "win") {
            const basePoints =
                typeof points === "number" && points > 0
                    ? points
                    : getTierMetaForPick({
                        odds: odds_bracket,
                        label: pick_difficulty_label,
                        points: points,
                        mode: "global",
                    })?.points ?? 0;
            return Math.min(basePoints, 60);
        }
    }
    return 0;
};

const RankCell = ({
    rank,
    isMobile,
    profile_image,
    username,
    user_id,
}: {
    cumulative: number;
    rank: number;
    isMobile: boolean;
    profile_image: string | undefined;
    username: string | undefined;
    user_id: string;
}) => {
    const displayName = username ?? user_id ?? "Member";
    const initials = displayName.slice(0, 2).toUpperCase();
    const profileImg = profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${profile_image}` : "";
    const imageSize = isMobile ? "h-8 w-8" : "h-14 w-14";

    const avatarSize = isMobile
        ? "h-8 w-8 text-[9px] ring-1 ring-white/20 ring-offset-1"
        : "h-14 w-14 text-[13px] ring-[2.5px] ring-white/20 ring-offset-[3px]";
    const badgeSize = isMobile
        ? "h-[18px] w-[18px] text-[9px]"
        : "h-[28px] w-[28px] text-[12px]";

    return (
        < div className="flex w-full items-start pt-[14px]" >
            <div className="relative inline-flex">
                <div
                    className={`relative flex items-center justify-center rounded-full bg-white/[0.08] font-semibold uppercase text-slate-100 ring-offset-black shadow-sm ${avatarSize}`}
                >
                    {profileImg ? (
                        <Image
                            src={profileImg}
                            alt="Profile image"
                            width={56}
                            height={56}
                            className={`tracking-wide rounded-full object-cover ${imageSize}`}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            unoptimized
                        />
                    ) : (
                        <span className="tracking-wide">
                            {initials}
                        </span>
                    )}
                </div>
                <div
                    className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-white/20 bg-black font-semibold text-slate-100 shadow-sm ${badgeSize}`}
                >
                    {rank}
                </div>
            </div>
        </div >
    );
};

const PlayerCard = ({
    cumulative,
    winLoss = { losses: 0, wins: 0 },
    isMobile,
}: {
    cumulative: number;
    winLoss: { wins: number; losses: number };
    isMobile: boolean;
}) => {
    const pointsTone =
        cumulative < 0 ? "text-rose-300" : cumulative > 0 ? "text-emerald-300" : "text-slate-200";

    return (
        <div className="flex h-full w-full min-w-0 items-start">
            {isMobile ? (
                <div className="flex w-full min-w-0 flex-col items-start gap-1 pt-0.5">
                    <span className={`text-xs font-semibold ${pointsTone}`}>
                        {cumulative}
                        <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-gray-300">
                            pts
                        </span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-wide text-gray-300">
                        {winLoss.wins} - {winLoss.losses}
                    </span>
                </div>
            ) : (
                <div className="relative flex w-full min-w-0 flex-col items-start gap-1.5 md:gap-2">
                    <span className={`text-lg font-semibold ${pointsTone} md:text-2xl`}>
                        {cumulative}
                        <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-300 md:text-sm">
                            pts
                        </span>
                    </span>
                    <span className="text-[11px] font-semibold tracking-wide text-gray-300 md:text-xs">
                        {winLoss.wins} - {winLoss.losses}
                    </span>
                </div>
            )}
        </div>
    );
};

const SlipCellCard = ({
    pick,
    slip,
    isOwnerCell,
    groupId,
    isMobile,
    isCurrectSlip,
}: {
    pick?: leaderboardSlip;
    slip: Slip;
    isOwnerCell: boolean;
    groupId?: string;
    isMobile: boolean;
    isCurrectSlip: boolean;
}) => {
    const hasPick = Boolean(pick?.odds_bracket);
    const isFinal = isSlipFinal(slip);
    const isOpen = !isFinal && !isSlipTimeLocked(slip);
    const emptyCopy = isOpen ? "no pick yet" : "pick not submitted before slip deadline";
    const emptyCardTone = "border-slate-900/80 bg-slate-950/70";
    if (!isCurrectSlip) {
        return (
            <div
                className={`relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-1.5 pb-3 md:p-3 md:pb-4 ${emptyCardTone}`}
            >
                <div className="relative flex flex-1 flex-col items-start justify-center space-y-2 text-left">
                    <p className="text-[13px] leading-snug text-slate-400 md:text-lg">No pick yet</p>
                </div>
            </div>
        );
    }

    if (!hasPick) {
        if (isOwnerCell && isOpen) {
            return (
                <div className="flex h-full w-full flex-col items-start gap-8">
                    <p className="text-[10px] leading-snug text-white md:text-sm">
                        {emptyCopy}
                    </p>
                    <Link
                        href={`/group/${groupId}/slips/${slip.id}`}
                        className="mt-auto flex w-full items-center justify-between rounded-md border border-dashed border-emerald-400/40 bg-white/[0.04] px-4 py-3 text-left text-[11px] font-semibold text-emerald-100 shadow-sm transition hover:border-emerald-300/70 md:text-xs"
                    >
                        <span>Add your pick</span>
                        <span
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/10 text-lg text-emerald-100"
                            aria-hidden
                        >
                            +
                        </span>
                    </Link>
                </div>
            );
        }

        return (
            <p className="text-[10px] leading-snug text-white md:text-sm">
                {emptyCopy}
            </p>
        );
    }

    const displayPick = pick?.pick_description ?? "No pick was submitted";
    const [matchupSegment, ...lineSegments] = displayPick.split(" — ");
    const matchupCandidate = pick?.selection?.away_team && pick?.selection.home_team ? `${pick?.selection.home_team} @ ${pick?.selection?.away_team}` : null;
    const pickLine = matchupCandidate && lineSegments.length > 0
        ? lineSegments.join(" — ")
        : displayPick;
    const tierMeta = pickTierMeta(pick);
    const tierName = tierMeta?.name ?? "—";
    const tierRange = tierMeta?.rangeLabel ?? "—";
    const oddsCopy = pick?.odds_bracket ?? "—";
    const legsCount = 0;
    const legsCopy =
        legsCount > 0 ? `${legsCount} legs` : null;
    const matchupCopy = matchupCandidate ?? matchupCandidate ?? "—";
    const gameTimeCopy = formatDateTime(pick?.selection?.gameStartTime);
    const showMatchup = matchupCopy !== "—";
    const showGameTime = gameTimeCopy !== "—";
    const result = resultMeta(pick?.pick_result);
    const resultPoints =
        pick?.pick_result === "pending" || pick?.pick_result === null
            ? null
            : computeResultPoints(pick?.pick_difficulty_label, pick?.pick_result, pick?.slip_points, pick?.odds_bracket);
    const resolvedResult = (pick?.pick_result ?? "pending") as keyof typeof PICK_RESULT_ACCENTS;
    const accent = PICK_RESULT_ACCENTS[resolvedResult] ?? PICK_RESULT_ACCENTS.pending;
    const basePotential =
        typeof pick?.slip_points === "number" && pick.slip_points > 0
            ? pick.slip_points
            : tierMeta?.points;
    const potentialPoints =
        typeof basePotential === "number" ? Math.min(basePotential, 60) : null;
    const isPending = pick?.pick_result === "pending" || pick?.pick_result === null;
    const pointsValue = resultPoints !== null ? resultPoints : potentialPoints;
    const pointsDisplay = formatPointsValue(pointsValue);
    const pointsLabel = resultPoints !== null ? "Points" : isPending ? "Potential" : "Points";
    const pointsLabelText = pointsLabel.toLowerCase();
    const showPointsSuffix = pointsDisplay !== "—";
    const tierCardStyle = tierMeta
        ? { backgroundImage: getGroupTierGradient(tierMeta.tier) }
        : undefined;
    const tierCardTone = tierMeta ? "bg-transparent" : "bg-white/[0.05]";
    const resultCardTone =
        pick?.pick_result === "win"
            ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40 text-emerald-100"
            : pick?.pick_result === "loss"
                ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 text-rose-100"
                : pick?.pick_result === "void" || pick?.pick_result === "not_found"
                    ? "border-amber-400/30 bg-amber-500/15 text-amber-50"
                    : "border-white/12 bg-white/[0.06] text-slate-100";
    const sourceTabLabel = (
        pick?.pick_source_tab ?? (pick?.is_combo || pick?.pick_leg?.length ? "Combo" : "Pick")
    ).toLowerCase();

    return (
        <div
            className="relative flex h-full w-full overflow-hidden p-1 md:p-0"
        >
            <div className="flex h-full w-full flex-col gap-1 md:flex-row md:items-stretch md:gap-2">
                <div className="order-1 flex min-h-0 w-full flex-1 flex-col justify-between rounded-md border border-white/10 bg-white/[0.03] p-1.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.4)] md:order-2 md:h-full md:rounded-md md:border-white/10 md:bg-white/[0.04] md:p-3 md:shadow-[inset_0_0_16px_rgba(15,23,42,0.6)]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="block text-[7px] font-semibold uppercase tracking-wide text-slate-400 md:text-[10px]">
                                {sourceTabLabel}
                            </span>
                            <p
                                className="mt-1 min-w-0 whitespace-normal break-words text-[11px] font-semibold leading-snug text-slate-100 drop-shadow-[0_1px_4px_rgba(226,232,240,0.25)] md:text-base"
                                title={displayPick}
                            >
                                {pickLine}
                            </p>
                        </div>
                        <span className="shrink-0 pr-1 text-[11px] font-semibold text-slate-100 md:pr-2 md:text-sm">
                            {oddsCopy}
                        </span>
                    </div>
                    <div className="text-[10px] md:text-xs">
                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400 md:text-xs">
                            matchup
                        </span>
                        {showMatchup ? (
                            <span className="mt-0.5 block truncate text-[7px] text-slate-200 md:text-xs">
                                {matchupCopy}
                            </span>
                        ) : (
                            <span className="mt-0.5 block text-[7px] text-slate-500 md:text-xs">—</span>
                        )}
                        {showGameTime && !isMobile && (
                            <span
                                className="mt-0.5 block truncate text-[11px] text-slate-200 md:text-xs"
                                suppressHydrationWarning
                            >
                                {gameTimeCopy}
                            </span>
                        )}
                        {legsCopy && (
                            <span className="mt-1 block text-[7px] font-semibold uppercase tracking-wide text-slate-500 md:text-[10px]">
                                {legsCopy}
                            </span>
                        )}
                    </div>
                </div>

                <div className="order-2 flex w-full gap-1 text-left md:order-1 md:h-full md:w-[26%] md:min-w-[96px] md:max-w-[140px] md:flex-col md:justify-between md:border-r md:border-white/10 md:pr-2 md:gap-2">
                    <div
                        className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 px-1.5 py-1 shadow-[inset_0_0_10px_rgba(15,23,42,0.3)] md:rounded-md md:px-2 md:py-2 md:shadow-[inset_0_0_16px_rgba(15,23,42,0.35)] ${tierCardTone}`}
                        style={tierCardStyle}
                    >
                        <span className="block truncate text-[11px] font-semibold text-white md:text-base">
                            {tierName}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] text-slate-100/70 md:text-[10px]">
                            {tierRange}
                        </span>
                    </div>
                    <div
                        className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border px-1.5 py-1 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] md:rounded-md md:px-2 md:py-1.5 md:leading-tight md:shadow-[inset_0_0_12px_rgba(15,23,42,0.25)] ${resultCardTone}`}
                    >
                        <span className="block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-100/80 md:text-[10px]">
                            {pointsLabelText}
                        </span>
                        <div className="text-[11px] font-semibold md:text-base">
                            {pointsDisplay}
                            {showPointsSuffix && (
                                <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-100/70">
                                    pts
                                </span>
                            )}
                        </div>
                        <span className="block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[10px]">
                            {result.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}


export const LeaderboardGrid = ({
    group,
    slips,
    leaderboard,
    currentUserId,
    leaderboardName,
    leaderboardId,
}: Props) => {
    const isMobile = useIsMobile();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(isMobile ? 385 : 848);

    useLayoutEffect(() => {
        setContainerWidth(isMobile ? 385 : 848)
        if (!containerRef.current) return;

        const measure = () => {
            const width = containerRef.current?.getBoundingClientRect().width;
            if (width) setContainerWidth(Math.round(width));
        }

        measure();

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
            setContainerWidth(Math.round(width));
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);

    const MOBILE_PLAYER_COL_RATIO = 0.12;
    const DESKTOP_PLAYER_COL_RATIO = 0.14;
    const RANK_COL_W = useMemo(() => (isMobile ? 60 : 96), [isMobile]);
    const ROW_H = isMobile ? 160 : 184;
    const HEADER_H = isMobile ? 50 : 62;
    const SLIP_GAP = 0;
    const effectiveWidth = containerWidth ?? 0;

    const PLAYER_CARD_W = useMemo(() => {
        if (!effectiveWidth) return isMobile ? 72 : 130; // safe desktop fallback

        const ratio = isMobile ? MOBILE_PLAYER_COL_RATIO : DESKTOP_PLAYER_COL_RATIO;
        const raw = Math.round(effectiveWidth * ratio);
        const min = isMobile ? 72 : 130;
        const max = Math.round(effectiveWidth * 0.18);

        return Math.max(Math.min(raw, max), min);
    }, [effectiveWidth, isMobile]);
    const STICKY_WIDTH = Math.max(PLAYER_CARD_W, RANK_COL_W);

    const gradedSlips = useMemo(
        () =>
            slips
                .filter(
                    (slip) =>
                        // slip.group_id === group?.id && slip.isGraded && slip.status === "final" && slip.slip_type === "fantasy"
                        slip.group_id === group?.id && slip.isGraded && slip.slip_type === "fantasy"
                ),
        [group?.id, slips]
    );
    const leaderboardAllSlips = useMemo(
        () =>
            slips
                .filter(
                    (slip) =>
                        slip.group_id === group?.id && slip.isGraded && slip.slip_type === "fantasy"
                ),
        [group?.id, slips]
    );

    const groupMembers = useMemo(() => {
        return group?.members;
    }, [group?.members]);

    const SLIP_WIDTH = useMemo(() => {
        const slipArea = Math.max(effectiveWidth - STICKY_WIDTH, 0);
        if (isMobile) {
            return slipArea;
        }

        if (leaderboardAllSlips.length <= 1) {
            return slipArea;
        }

        const expandedWidth = Math.max(slipArea, 320);
        return Math.max(expandedWidth, 0);
    }, [STICKY_WIDTH, effectiveWidth, leaderboardAllSlips.length, isMobile]);

    useEffect(() => {
        scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
    }, [leaderboardId]);

    // useLayoutEffect(() => {
    //     const node = containerRef.current;
    //     if (!node) return;

    //     measureWidth();
    //     const observer =
    //         typeof ResizeObserver !== "undefined"
    //             ? new ResizeObserver(() => measureWidth())
    //             : null;

    //     window.addEventListener("resize", measureWidth);
    //     observer?.observe(node);

    //     return () => {
    //         window.removeEventListener("resize", measureWidth);
    //         observer?.disconnect();
    //     };
    // }, [measureWidth]);

    // useLayoutEffect(() => {
    //     const raf = requestAnimationFrame(() => measureWidth());
    //     return () => cancelAnimationFrame(raf);
    // }, [leaderboardId, measureWidth]);

    const label = leaderboardName ?? "Leaderboard";

    const showStandingsNote = leaderboardAllSlips.length < 0 && gradedSlips.length === 0;

    if (!groupMembers?.length) {
        return (
            <div className="space-y-2 text-sm text-gray-400">
                <p className="text-base font-semibold text-white">{label}</p>
                <p>No members yet.</p>
            </div>
        );
    }

    if (!leaderboardAllSlips.length) {
        return (
            <div className="space-y-2 text-sm text-gray-400">
                <p className="text-base font-semibold text-white">{label}</p>
                <p>
                    No leaderboard slips yet. Create one to start tracking standings.
                </p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-3 opacity-100 transition-opacity duration-300">
            {showStandingsNote && (
                <div className="rounded-md border border-white/10 bg-black/50 px-4 py-2 text-xs text-gray-400">
                    Standings count finalized slips only.
                </div>
            )}
            <div className="rounded-md border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] overflow-hidden">
                <div
                    ref={scrollerRef}
                    className={`leaderboard-scroll w-full min-w-0 -m-[2px] p-[2px] ${leaderboardAllSlips.length > 1
                        ? "overflow-x-auto overscroll-x-contain"
                        : "overflow-x-hidden"
                        }`}
                >
                    <div className="min-w-max text-xs text-white md:text-sm">
                        <div className="flex">
                            {/* Sticky Rank + Player */}
                            <div
                                className="sticky left-0 z-10 flex flex-col border-r border-white/10 bg-[#151515] box-border"
                                style={{
                                    width: STICKY_WIDTH
                                }}
                            >
                                <div
                                    className="flex items-center border-b border-white/10 px-1.5 text-[10px] uppercase tracking-wide text-gray-400 box-border md:px-4 md:text-xs"
                                    style={{ height: HEADER_H }}
                                >
                                    Rank
                                </div>
                                {leaderboard.map(({ cumulative_points, profile_image, username, user_id, win, loss }, rowIndex) => {
                                    const rowBand = "bg-transparent";
                                    const isLastRow = rowIndex === leaderboard.length - 1;
                                    return (
                                        <div
                                            key={user_id}
                                            className={`relative flex items-center overflow-hidden border-white/10 px-1.5 pt-3 pb-2 md:px-4 md:pt-4 md:pb-3 ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
                                                }`}
                                            style={{ height: ROW_H }}
                                        >
                                            <div className="flex h-full w-full min-w-0 flex-col justify-center gap-[20px] pl-2 md:gap-2 md:pl-3">
                                                <RankCell
                                                    cumulative={cumulative_points}
                                                    rank={rowIndex + 1}
                                                    isMobile={isMobile}
                                                    profile_image={profile_image}
                                                    username={username}
                                                    user_id={user_id}
                                                />
                                                <PlayerCard
                                                    cumulative={cumulative_points}
                                                    winLoss={{ losses: loss, wins: win }}
                                                    isMobile={isMobile}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Slip Columns */}
                            <div className="relative z-0 min-w-0 flex-1">
                                <div className="flex" style={{ gap: SLIP_GAP }}>
                                    {leaderboardAllSlips.map((slip, slipIndex) => {
                                        const isFinal = isSlipFinal(slip);
                                        const isLocked = isSlipTimeLocked(slip);
                                        const statusMeta = isFinal
                                            ? { label: "finalized", tone: "text-emerald-200" }
                                            : isLocked
                                                ? { label: "locked", tone: "text-slate-200" }
                                                : { label: "open", tone: "text-cyan-200" };
                                        const slipBg = "bg-transparent";
                                        const slipTone = isFinal ? "text-gray-300" : "text-gray-400";
                                        const isLastSlip = slipIndex === leaderboardAllSlips.length - 1;

                                        return (
                                            <div
                                                key={slip.id}
                                                className={`relative flex-shrink-0 overflow-hidden border-white/10 box-border ${slipBg} ${isLastSlip ? "border-r-0" : "border-r"
                                                    }`}
                                                style={{
                                                    width: `${SLIP_WIDTH}px`,
                                                }}
                                            >
                                                <div
                                                    className={`flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-[10px] uppercase tracking-wide box-border md:px-5 md:text-xs ${slipTone}`}
                                                    style={{ height: HEADER_H }}
                                                >
                                                    <div className="flex min-w-0 flex-col leading-tight">
                                                        <span
                                                            className={`allow-caps truncate text-[14px] font-semibold md:text-[19px] ${isFinal ? "text-white" : "text-slate-200"}`}
                                                            title={`${slip.name} (leaderboard slip)`}
                                                        >
                                                            {slip.name}
                                                        </span>
                                                        {!isFinal && (
                                                            <span className="text-[10px] font-medium text-slate-500">
                                                                Counts when finalized
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wide md:text-xs ${statusMeta.tone}`}>
                                                        {statusMeta.label}
                                                    </span>
                                                </div>

                                                {leaderboard.map(({ user_id, slips }, rowIndex) => {
                                                    if (!slips) return;
                                                    const data = slips.find((s) => s.slip_id === slip.id);
                                                    const isCurrectSlip = data?.slip_id === slip.id;
                                                    const rowBand = "bg-transparent";
                                                    const isLastRow = rowIndex === leaderboard.length - 1;
                                                    const isOwnerCell = Boolean(
                                                        currentUserId && user_id === currentUserId
                                                    );

                                                    return (
                                                        <div
                                                            key={`${user_id}-${slip.id}`}
                                                            className={`border-white/10 px-3 py-2 md:px-5 md:py-3 ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
                                                                }`}
                                                            style={{ height: ROW_H }}
                                                        >
                                                            <SlipCellCard
                                                                pick={data}
                                                                slip={slip}
                                                                isOwnerCell={isOwnerCell}
                                                                groupId={slip?.group_id}
                                                                isMobile={isMobile}
                                                                isCurrectSlip={isCurrectSlip}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LeaderboardGrid;
