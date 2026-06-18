"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { ArchiveLeaderboardSlip, ContestBadgeAward, DifficultyLabel, Group, Leaderboard, leaderboardSlip, Pick, Slip, TierIndex } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { getGroupTierColor, getGroupTierName, getTierMetaForPick, LEAGUE_CAP_TIER, TierMeta } from "@/lib/utils/scoring";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";
import { isSlipFinal, isSlipTimeLocked, SlipLike } from "@/lib/slips/state";
import { LOSS_PICK_POINTS } from "@/lib/constants";
import { EM_DASH, parsePickDescription } from "@/lib/utils/pickDescription";
import { generateProfileImageUrl, getMemberInitials, useIsMobile } from "@/lib/utils/helpers";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { useRouter } from "next/navigation";
import { getLeagueComboOddsSummary } from "@/lib/slips/groupComboOdds";
import { BadgeAwardModal } from "../group/BadgeAwardModal";
import { BadgeIcon } from "../badges/BadgeIcon";
import { TierInfoModal } from "./TierInfoModal";
import LeaderboardSlipShareModal from "../slips/LeaderboardSlipShareModal";

type Props = {
    group: Group | null;
    leaderboard: Leaderboard[];
    currentUserId?: string;
    leaderboardId: string;
    leaderboardName?: string;
    leaderboardSlips: Slip[];
    archivedLeaderboardSlips: ArchiveLeaderboardSlip[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    isArchived: boolean;
    contestName?: string;
};

const formatPointsValue = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return EM_DASH;
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
    if (tierMeta.tier === LEAGUE_CAP_TIER) {
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
        mode: "leagueLeaderboard",
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

function mapSlipToPick(user: Leaderboard, slip: leaderboardSlip): Pick {
    return {
        id: slip.pick_id ?? "",
        slip_id: slip.slip_id,
        user_id: user.user_id,
        description: slip.pick_description ?? "",
        odds_bracket: slip.odds_bracket ?? "",
        result: slip.pick_result ?? "pending",
        points: slip.slip_points ?? 0,
        bonus: slip.bonus_points ?? 0,
        sport: slip.selection?.sport ?? "",
        difficulty_label: slip.pick_difficulty_label ?? null,
        selection: slip.selection,
        profiles: {
            user_id: user.user_id,
            username: user.username,
            profile_image: user.profile_image,
        },
    };
}

const PlayerCell = ({
    rank,
    cumulative,
    badgeBonus,
    badgeAwards,
    winLoss,
    currentUserId,
    user_id,
    username,
    profile_image,
    isMobile,
    onSelectBadge,
}: {
    username: string;
    rank: number;
    cumulative: number;
    badgeBonus: number;
    badgeAwards: ContestBadgeAward[];
    winLoss: { wins: number; losses: number };
    user_id: string;
    currentUserId: string | undefined;
    profile_image: string | undefined;
    isMobile: boolean;
    onSelectBadge: (award: ContestBadgeAward) => void;
}) => {
    const router = useRouter();
    const [imgError, setImgError] = useState(false);
    const [showRecord, setShowRecord] = useState(false);

    const displayName = username ?? "Member";
    const usernameCopy =
        displayName.length > 10 ? `${displayName.slice(0, 10)}...` : displayName;
    const initials = displayName.slice(0, 2).toUpperCase();
    const isCurrentUser = user_id === currentUserId;
    const profileImg = generateProfileImageUrl(profile_image);
    const imageSize = isMobile ? "h-8 w-8" : "h-9 w-9";

    const avatarSize = isMobile
        ? `h-8 w-8 text-[5px] ${isCurrentUser ? "ring-[0.5px]" : "ring-0.5"} ring-offset-1`
        : `h-9 w-9 text-[10px] ${isCurrentUser ? "ring-[1px]" : "ring-[1px]"} ring-offset-[2px]`;
    const avatarTone = isCurrentUser
        ? "bg-sky-500/[0.10] text-sky-50 ring-sky-200/80 shadow-[0_0_16px_rgba(125,211,252,0.2)]"
        : "bg-white/[0.08] text-slate-100 ring-white/20";
    const pointsTone =
        cumulative < 0 ? "text-rose-300" : cumulative > 0 ? "text-emerald-300" : "text-slate-200";

    const hasValidImage =
        profile_image && !imgError;

    const userInitial = getMemberInitials(displayName);

    const handleViewProfile = useCallback(
        (userId: string) => {
            if (currentUserId && userId) {
                router.push(getProfilePath(userId, currentUserId));
            }
        },
        [currentUserId, router]
    );

    return (
        <div className="flex h-full w-full min-w-0 flex-col justify-center gap-2.5 md:gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowRecord((prev) => !prev)}
                    aria-label={showRecord ? "Show avatar" : "Show record"}
                    className="group relative h-8 w-8 shrink-0 [perspective:400px] md:h-9 md:w-9"
                >
                    <div
                        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-180deg)] ${showRecord ? "[transform:rotateY(-180deg)]" : ""
                            }`}
                    >
                        <div
                            className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-semibold uppercase ring-1 ring-offset-1 ring-offset-black [backface-visibility:hidden] md:text-[11px] ${avatarTone}`}
                        >
                            {profileImg && hasValidImage ? (
                                <Image
                                    src={profileImg}
                                    alt="Profile image"
                                    width={52}
                                    height={52}
                                    className={`tracking-wide rounded-full object-cover ${imageSize}`}
                                    draggable={false}
                                    onDragStart={(e) => e.preventDefault()}
                                    unoptimized
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="flex items-center justify-center text-white/80 text-[10px] sm:text-[12px]" >
                                    <span>{userInitial}</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full border border-white/25 bg-black/80 text-[10px] font-semibold tabular-nums leading-none text-slate-100 [backface-visibility:hidden] [transform:rotateY(-180deg)] md:text-[11px]">
                            {winLoss.wins}-{winLoss.losses}
                        </div>
                    </div>
                    <span className="absolute -bottom-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-white/20 bg-black px-1 text-[8px] font-semibold text-slate-100 shadow-sm md:h-[18px] md:min-w-[18px] md:text-[9px]">
                        {rank}
                    </span>
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <button
                            className="truncate text-[11px] font-semibold text-white md:text-[13px] cursor-pointer"
                            title={displayName}
                            onClick={() => handleViewProfile(user_id)}
                            disabled={currentUserId === user_id}
                        >
                            {usernameCopy}
                        </button>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:text-[13px]">
                        <span className={`${pointsTone} whitespace-nowrap`}>
                            {cumulative}
                            <span className="ml-0.5 text-slate-400 text-[6px] md:text-[10px]">pts</span>
                        </span>
                    </div>
                </div>
            </div>
            <div className="min-w-0 rounded-md border border-white/10 bg-black/25 px-1.5 py-1">
                <div className="flex items-center justify-between gap-2 text-[8px] font-semibold uppercase tracking-wide md:text-[9px]">
                    {badgeAwards.length > 0 ? (
                        <span className="text-slate-400">
                            {badgeAwards.length} badge{badgeAwards.length === 1 ? "" : "s"}
                        </span>
                    ) : (
                        <span className="text-slate-500">badges</span>
                    )}
                    {badgeBonus > 0 && <span className="text-sky-200">+{badgeBonus} pts</span>}
                </div>
                <div className="scrollbar-hide mt-0.5 flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap px-0.5 py-0.5">
                    {badgeAwards.length > 0 ? (
                        badgeAwards.map((award) => (
                            <button
                                key={award.definition.id}
                                type="button"
                                onClick={() => onSelectBadge(award)}
                                aria-label={`${award.definition.name}: ${award.valueLabel}, +${award.points} points`}
                                className="shrink-0 rounded-full transition hover:scale-110"
                                title={`${award.definition.name}: ${award.valueLabel}, +${award.points} pts`}
                            >
                                <BadgeIcon
                                    category={award.definition.category}
                                    sport={award.sport}
                                    glow={false}
                                    alt={award.definition.name}
                                    className="h-4 w-4 md:h-5 md:w-5"
                                />
                            </button>
                        ))
                    ) : (
                        <span className="text-[9px] font-medium text-slate-500 md:text-[10px]">
                            No badges
                        </span>
                    )}
                </div>
            </div>
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
    fallbackMatchup,
}: {
    pick?: leaderboardSlip;
    slip: SlipLike;
    isOwnerCell: boolean;
    groupId?: string;
    isMobile: boolean;
    isCurrectSlip: boolean;
    fallbackMatchup?: string | null;
}) => {
    const hasPick = Boolean(pick?.odds_bracket);
    const isFinal = isSlipFinal(slip);
    const isOpen = !isFinal && !isSlipTimeLocked(slip);
    const emptyCopy = isOpen ? "no pick yet" : "pick not submitted before slip deadline";
    const [showTier, setShowTier] = useState(false);
    const [showTierInfo, setShowTierInfo] = useState(false);
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
                <Link
                    href={`/league/${groupId}/slips/${slip.id}`}
                    className="group flex h-full w-full flex-col items-start justify-between gap-1 rounded-md border border-dashed border-sky-400/40 bg-gradient-to-br from-sky-500/[0.1] via-sky-500/[0.03] to-transparent px-2.5 py-2 text-sky-100 transition hover:border-sky-300/80 hover:from-sky-500/[0.18]"
                >
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold leading-tight text-sky-50 md:text-sm">
                        Add your pick
                        <span
                            className="transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                        >
                            →
                        </span>
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-sky-200/80 md:text-[8px]">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-sky-300" aria-hidden />
                        open
                    </span>
                </Link>
            );
        }

        const emptyState = isOpen
            ? {
                chip: "open",
                body: "no pick yet",
                dot: "bg-slate-400",
                chipTone: "bg-white/10 text-slate-300",
                bodyTone: "text-slate-300",
                border: "border-white/10",
                surface: "bg-white/[0.03]",
            }
            : {
                chip: "missed",
                body: "no pick submitted",
                dot: "bg-rose-400/70",
                chipTone: "bg-rose-500/15 text-rose-200/80",
                bodyTone: "text-slate-400",
                border: "border-rose-400/15",
                surface: "bg-rose-500/[0.04]",
            };

        return (
            <div
                className={`flex h-full w-full flex-col items-start justify-between gap-1 rounded-md border px-2.5 py-2 ${emptyState.border} ${emptyState.surface}`}
            >
                <span
                    className={`text-[11px] font-medium leading-tight md:text-sm ${emptyState.bodyTone}`}
                >
                    {emptyState.body}
                </span>
                <span
                    className={`mt-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] md:text-[8px] ${emptyState.chipTone}`}
                >
                    <span className={`h-1 w-1 rounded-full ${emptyState.dot}`} aria-hidden />
                    {emptyState.chip}
                </span>
            </div>
        );
    }

    const displayPick = pick?.pick_description ?? "No pick was submitted";
    const { matchup: matchupCandidate, pickLine } = parsePickDescription(
        displayPick,
        pick?.selection?.matchup ?? fallbackMatchup ?? null
    );
    const tierMeta = pickTierMeta(pick);
    const tierName = tierMeta?.name ?? EM_DASH;
    const tierRange = tierMeta?.rangeLabel ?? EM_DASH;
    const oddsCopy = pick?.odds_bracket ?? EM_DASH;
    const legsCount = 0;
    const legsCopy =
        legsCount > 0 ? `${legsCount} legs` : null;
    const matchupCopy = isMobile && pick?.selection?.away_abbr && pick?.selection?.home_abbr ? `${pick?.selection?.away_abbr} @ ${pick?.selection?.home_abbr}` : pick?.selection?.matchup ?? matchupCandidate ?? EM_DASH;
    const gameTimeCopy = formatDateTime(pick?.selection?.gameStartTime);
    const showGameTime = gameTimeCopy !== EM_DASH;
    const metaLabel = [matchupCopy !== EM_DASH ? matchupCopy : null, showGameTime ? gameTimeCopy : null]
        .filter(Boolean)
        .join(" · ");
    const resultPoints =
        pick?.pick_result === "pending" || pick?.pick_result === null || !isFinal
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
    const isPending = pick?.pick_result === "pending" || pick?.pick_result === null || !isFinal;
    const pointsValue = resultPoints !== null ? resultPoints : potentialPoints;
    const pointsDisplay = formatPointsValue(pointsValue);
    const pointsLabelText =
        pick?.pick_result === "void"
            ? "void"
            : pick?.pick_result === "not_found"
                ? "n/a"
                : isPending
                    ? "pending"
                    : pick?.pick_result === "win"
                        ? "win"
                        : "loss";
    const showPointsSuffix = pointsDisplay !== EM_DASH;
    const tierCardStyle = tierMeta
        ? { backgroundImage: getGroupTierGradient(tierMeta.tier) }
        : undefined;
    const tierCardTone = tierMeta ? "bg-transparent" : "bg-white/[0.05]";
    const resultCardTone =
        pick?.pick_result === "win"
            ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40 text-emerald-100"
            : pick?.pick_result === "loss"
                ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 text-rose-100"
                : (pick?.pick_result === "not_found" || pick?.pick_result === "void")
                    ? "border-amber-400/30 bg-amber-500/15 text-amber-50"
                    : "border-white/12 bg-white/[0.06] text-slate-100";
    const sourceTabLabel = (
        pick?.pick_source_tab ?? (pick?.is_combo || pick?.pick_leg?.length ? "Combo" : "Pick")
    ).toLowerCase();

    return (
        <div
            className="relative flex h-full w-full"
        >
            <div className="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_66px] gap-1 md:grid-cols-[minmax(0,1fr)_116px] md:gap-2">
                <div className={`flex min-h-0 min-w-0 flex-col gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 shadow-[inset_0_0_12px_rgba(15,23,42,0.45)] md:px-3 md:py-2 ${resultCardTone}`}>
                    <p
                        className={`line-clamp-2 min-w-0 break-words text-[12px] font-semibold leading-tight text-slate-100 md:text-[15px] ${accent}`}
                        title={displayPick}
                    >
                        {pickLine}
                    </p>
                    {metaLabel ? (
                        <p
                            className="min-w-0 truncate text-[9px] leading-tight text-slate-400 md:text-[11px]"
                            title={metaLabel}
                        >
                            {metaLabel}
                        </p>
                    ) : (
                        <p className="text-[9px] leading-tight text-slate-500 md:text-[11px]">{EM_DASH}</p>
                    )}
                    <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1 pt-0.5">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-slate-300 md:text-[8px]">
                            {sourceTabLabel}
                        </span>
                        {legsCopy && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-slate-400 md:text-[8px]">
                                {legsCopy}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid min-h-0 min-w-0 grid-rows-2 gap-1 text-left">
                    <button
                        type="button"
                        onClick={() => setShowTier((prev) => !prev)}
                        aria-label={showTier ? "Show odds" : "Show tier"}
                        className="group block h-full min-h-0 w-full min-w-0 cursor-pointer bg-transparent text-left [perspective:600px]"
                    >
                        <div
                            className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${showTier ? "[transform:rotateY(180deg)]" : ""
                                }`}
                        >
                            <div
                                className={`absolute inset-0 flex flex-col justify-center gap-1 overflow-hidden rounded-md border border-white/10 px-1 py-1 leading-tight shadow-[inset_0_0_10px_rgba(15,23,42,0.3)] [backface-visibility:hidden] md:px-2 ${tierCardTone}`}
                                style={tierCardStyle}
                            >
                                <span className="block text-[8px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[9px]">
                                    odds
                                </span>
                                <span className="block truncate text-[12px] font-semibold tabular-nums leading-tight text-white md:text-[15px]">
                                    {oddsCopy}
                                </span>
                                <span
                                    className="pointer-events-none absolute bottom-1 right-1.5 text-[7px] leading-none text-white/40 md:bottom-1.5 md:right-2 md:text-[8px]"
                                    aria-hidden
                                >
                                    ⇄
                                </span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label="View scoring tiers"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowTierInfo(true);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setShowTierInfo(true);
                                        }
                                    }}
                                    className="absolute right-1 top-1 flex h-2.5 w-2.5 cursor-pointer items-center justify-center rounded-full border border-white/40 font-serif text-[6px] font-bold leading-none text-white/70 transition hover:bg-white/20 hover:text-white md:h-3 md:w-3 md:text-[7px]"
                                >
                                    i
                                </span>
                            </div>
                            <div
                                className={`absolute inset-0 flex flex-col justify-center gap-1 overflow-hidden rounded-md border border-white/10 px-1 py-1 leading-tight shadow-[inset_0_0_10px_rgba(15,23,42,0.3)] [backface-visibility:hidden] [transform:rotateY(180deg)] md:px-2 ${tierCardTone}`}
                                style={tierCardStyle}
                            >
                                <span className="block truncate text-[10px] font-semibold leading-tight text-white md:text-[12px]">
                                    {tierName}
                                </span>
                                <span className="block truncate text-[8px] leading-tight text-slate-100/70 md:text-[9px]">
                                    {tierRange}
                                </span>
                                <span
                                    className="pointer-events-none absolute right-1 top-1 text-[7px] leading-none text-white/40 md:text-[8px]"
                                    aria-hidden
                                >
                                    ⇄
                                </span>
                            </div>
                        </div>
                    </button>
                    <div
                        className={`flex min-h-0 min-w-0 flex-col justify-center gap-1 overflow-hidden rounded-md border px-1 py-1 leading-tight shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] md:px-2 ${resultCardTone}`}
                    >
                        <span className="block truncate text-[8px] font-semibold uppercase tracking-wide text-slate-100/75 md:text-[9px]">
                            {pointsLabelText}
                        </span>
                        <div className="truncate text-[12px] font-semibold tabular-nums leading-tight md:text-[15px]">
                            {pointsDisplay}
                            {showPointsSuffix && (
                                <span className="ml-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[9px]">
                                    pts
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <TierInfoModal open={showTierInfo} onClose={() => setShowTierInfo(false)} />
        </div>
    )
}

export const LeaderboardGrid = ({
    group,
    leaderboard,
    currentUserId,
    leaderboardName,
    leaderboardId,
    leaderboardSlips,
    archivedLeaderboardSlips,
    onLoadMore,
    hasMore,
    loadingMore,
    isArchived,
    contestName,
}: Props) => {
    const isMobile = useIsMobile();
    const [selectedBadge, setSelectedBadge] = useState<ContestBadgeAward | null>(null);
    const [shareSlipId, setShareSlipId] = useState<string | null>(null);
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

    const MOBILE_PLAYER_COL_RATIO = 0.3;
    const DESKTOP_PLAYER_COL_RATIO = 0.165;
    const RANK_COL_W = useMemo(() => (isMobile ? 108 : 158), [isMobile]);
    const ROW_H = isMobile ? 112 : 132;
    const HEADER_H = isMobile ? 44 : 48;
    const SLIP_GAP = 0;
    const effectiveWidth = containerWidth ?? 0;
    // Box height matches the odds/points boxes: (ROW_H - 20) / 2 = 46 / 56, plus py-1.5 (12px).
    const TALLY_H = isMobile ? 58 : 68;

    const PLAYER_CARD_W = useMemo(() => {
        if (!effectiveWidth) return isMobile ? 108 : 158; // safe desktop fallback

        const ratio = isMobile ? MOBILE_PLAYER_COL_RATIO : DESKTOP_PLAYER_COL_RATIO;
        const raw = Math.round(effectiveWidth * ratio);
        const min = isMobile ? 108 : 158;
        // const max = Math.round(effectiveWidth * 0.18);
        const max = isMobile ? 123 : 210;

        return Math.max(Math.min(raw, max), min);
    }, [effectiveWidth, isMobile]);

    const STICKY_WIDTH = Math.max(PLAYER_CARD_W, RANK_COL_W);

    const gradedSlips = useMemo(
        () => {
            if (isArchived) {
                return archivedLeaderboardSlips;
            }
            return leaderboardSlips.filter(
                (slip) =>
                    slip.group_id === group?.id && slip.isGraded && slip.slip_type === "fantasy"
            );
        },
        [group?.id, leaderboardSlips, isArchived, archivedLeaderboardSlips]
    );
    const leaderboardAllSlips = useMemo(
        () => {
            if (isArchived) {
                return archivedLeaderboardSlips;
            }
            return leaderboardSlips;
        },
        [isArchived, archivedLeaderboardSlips, leaderboardSlips]
    );

    const leaderboardAllPicks = useMemo<Pick[]>(() => {
        return leaderboard?.flatMap((user) =>
            user.slips?.map((slip) =>
                mapSlipToPick(user, slip)
            ) || []
        ) ?? [];
    }, [leaderboard]);

    const groupMembers = useMemo(() => {
        return group?.members;
    }, [group?.members]);

    const groupComboOddsBySlipId = useMemo(() => {
        const memberIds = new Set(groupMembers?.map(member => member.user_id));

        return new Map(
            leaderboardAllSlips.map((slip) => [
                slip.id,
                getLeagueComboOddsSummary(
                    slip,
                    leaderboardAllPicks.filter(
                        (pick) =>
                            pick.slip_id === slip.id && memberIds.has(pick.user_id) && (pick.id || pick.selection)
                    )
                ),
            ])
        );
    }, [groupMembers, leaderboardAllSlips, leaderboardAllPicks]);

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

    const label = contestName ?? leaderboardName ?? "Contest";

    const showStandingsNote = leaderboardAllSlips.length > 0 && gradedSlips.length === 0;

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
            <div className="rounded-md border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] overflow-hidden">
                <div
                    ref={scrollerRef}
                    className={`leaderboard-scroll w-full min-w-0 ${leaderboardAllSlips.length > 1
                        ? "snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
                        : "overflow-x-hidden"
                        }`}
                    style={
                        leaderboardAllSlips.length > 1
                            ? { scrollPaddingLeft: STICKY_WIDTH }
                            : undefined
                    }
                >
                    <div className="min-w-max text-xs text-white md:text-sm">
                        <div className="flex">
                            {/* Sticky Rank + Player */}
                            <div
                                className="sticky left-0 z-10 flex flex-col self-start border-r border-white/10 bg-[#151515] box-border"
                                style={{
                                    width: STICKY_WIDTH
                                }}
                            >
                                <div
                                    className="box-border flex items-center border-b border-white/10 px-2 text-[9px] uppercase tracking-wide text-gray-500 md:px-3 md:text-[10px]"
                                    style={{ height: HEADER_H }}
                                >
                                    <span>Player</span>
                                </div>
                                {leaderboard.map(({ cumulative_points, badge_points, badge_awards, profile_image, username, user_id, win, loss }, rowIndex) => {
                                    const rowBand = "bg-transparent";
                                    const isLastRow = rowIndex === leaderboard.length - 1;
                                    return (
                                        <div
                                            key={user_id}
                                            className={`relative flex items-center border-white/10 px-2 py-2 md:px-3 ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
                                                }`}
                                            style={{ height: ROW_H }}
                                        >
                                            <PlayerCell
                                                key={user_id}
                                                username={username ?? "Member"}
                                                rank={rowIndex + 1}
                                                cumulative={cumulative_points}
                                                badgeBonus={badge_points}
                                                badgeAwards={badge_awards}
                                                winLoss={{ losses: loss, wins: win }}
                                                user_id={user_id}
                                                currentUserId={currentUserId}
                                                isMobile={isMobile}
                                                profile_image={profile_image}
                                                onSelectBadge={setSelectedBadge}
                                            />
                                        </div>
                                    );
                                })}
                                <div
                                    className="box-border border-t border-white/10 bg-[#151515]"
                                    style={{ height: TALLY_H }}
                                    aria-hidden
                                />
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
                                        const groupComboOddsSummary = groupComboOddsBySlipId.get(slip.id);
                                        const slipTally = leaderboard.reduce(
                                            (acc, row) => {
                                                const res = row?.slips?.[slipIndex]?.pick_result;

                                                if (res === "win") {
                                                    acc.wins += 1;
                                                } else if (res === "loss") {
                                                    acc.losses += 1;
                                                }

                                                return acc;
                                            },
                                            { wins: 0, losses: 0 }
                                        );

                                        return (
                                            <div
                                                key={slip.id}
                                                className={`relative box-border flex-shrink-0 snap-start overflow-hidden border-white/10 ${slipBg} ${isLastSlip ? "border-r-0" : "border-r"
                                                    }`}
                                                style={{
                                                    width: `${SLIP_WIDTH}px`,
                                                }}
                                            >
                                                <div
                                                    className={`box-border flex flex-col justify-center gap-0.5 border-b border-white/10 px-2 py-1.5 text-[9px] uppercase tracking-wide md:px-3 md:text-[10px] ${slipTone}`}
                                                    style={{ height: HEADER_H }}
                                                >
                                                    <div className="flex min-w-0 items-center justify-between gap-2 leading-tight">
                                                        <span
                                                            className={`allow-caps min-w-0 truncate text-[12px] font-semibold leading-tight md:text-base md:leading-tight ${isFinal ? "text-white" : "text-slate-200"}`}
                                                            title={`${slip.name} (leaderboard slip)`}
                                                        >
                                                            {slip.name}
                                                        </span>
                                                        <span className={`shrink-0 text-[9px] font-semibold uppercase leading-tight tracking-wide md:text-[10px] ${statusMeta.tone}`}>
                                                            {statusMeta.label}
                                                        </span>
                                                    </div>
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
                                                            className={`border-white/10 px-2 py-2 md:px-3 ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
                                                                }`}
                                                            style={{ height: ROW_H }}
                                                        >
                                                            <SlipCellCard
                                                                pick={data}
                                                                slip={slip}
                                                                isOwnerCell={isOwnerCell}
                                                                groupId={slip?.group_id}
                                                                isCurrectSlip={isCurrectSlip}
                                                                fallbackMatchup={
                                                                    data?.selection?.gameId
                                                                        ? data.selection.matchup
                                                                        : null
                                                                }
                                                                isMobile={isMobile}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                                <div
                                                    className="box-border flex items-stretch justify-end gap-1 border-t border-white/10 px-2 py-1.5 md:gap-2 md:px-3"
                                                    style={{ height: TALLY_H }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setShareSlipId(slip.id ?? null)}
                                                        aria-label={`Share ${slip.name}`}
                                                        className="flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] px-2 text-white/70 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] transition hover:border-white/30 hover:text-white"
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-3.5 w-3.5 md:h-4 md:w-4"
                                                            aria-hidden
                                                        >
                                                            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                                                            <path d="M16 6l-4-4-4 4" />
                                                            <path d="M12 2v13" />
                                                        </svg>
                                                    </button>
                                                    <div className="flex w-[66px] shrink-0 flex-col justify-center gap-0.5 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] px-1 py-1 leading-tight shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] md:w-[116px] md:px-2">
                                                        <span className="block text-[8px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[9px]">
                                                            record
                                                        </span>
                                                        <span className="block text-[12px] font-semibold tabular-nums leading-tight md:text-[15px]">
                                                            <span className="text-emerald-200">{slipTally.wins}</span>
                                                            <span className="text-white/40">-</span>
                                                            <span className="text-rose-200">{slipTally.losses}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex w-[66px] shrink-0 flex-col justify-center gap-0.5 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] px-1 py-1 leading-tight shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] md:w-[116px] md:px-2">
                                                        <span className="block text-[8px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[9px]">
                                                            combo+ odds
                                                        </span>
                                                        <span
                                                            className={`block truncate text-[12px] font-semibold tabular-nums leading-tight md:text-[15px] ${groupComboOddsSummary ? "text-cyan-100" : "text-slate-500"
                                                                }`}
                                                        >
                                                            {groupComboOddsSummary ? groupComboOddsSummary.label : "pending"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="flex h-10 w-full max-w-xs items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 text-xs font-semibold text-slate-200 transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
                    >
                        {loadingMore ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : (
                            "show all members"
                        )}
                    </button>
                </div>
            )}

            {showStandingsNote && (
                <div className="rounded-md border border-white/10 bg-black/50 px-4 py-2 text-xs text-gray-400">
                    Standings count finalized slips only.
                </div>
            )}
            <BadgeAwardModal award={selectedBadge} onClose={() => setSelectedBadge(null)} />
            {shareSlipId && (
                <LeaderboardSlipShareModal
                    open
                    onClose={() => setShareSlipId(null)}
                    slipId={shareSlipId}
                    members={groupMembers ?? []}
                />
            )}
        </div>
    )
}

export default LeaderboardGrid;
