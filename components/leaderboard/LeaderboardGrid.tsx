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
import {
    STANDING_RANK_MARKER_LAYOUT,
    STANDING_RANK_MARKER_TONES,
    getStandingRankMarkerTone,
} from "@/lib/styles/postCards";
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
    /**
     * Opens the create-slip flow from the empty-state column. Supplied only for
     * a viewer who may actually create one; without it the placeholder column
     * still renders, just inert.
     */
    onCreateSlip?: () => void;
    createSlipOpen?: boolean;
};

export const LEADERBOARD_DESKTOP_QUERY = "(min-width: 1024px)";

/* ----------------------------------------------------------------------------
 * The board's PREMIUM surface, ported from the MVP.
 *
 * The board is no longer a bordered, rounded card floating on the page. It runs
 * edge to edge and reads as one continuous surface with the tab strip above it:
 * a dark title strip that starts at pure black — so it meets the tabs with no
 * seam — then a body gradient that holds a flat near-black through the middle
 * and dissolves back into `--app-bg` at the bottom, so the board has no closing
 * border at all.
 *
 * A FINALIZED contest swaps the blue cast for amber, which is the only signal
 * that the standings are frozen rather than live.
 * -------------------------------------------------------------------------- */
const LEADERBOARD_ACTIVE_BOARD_SURFACE_CLASS_NAME =
    "bg-[linear-gradient(to_bottom,#111820_0%,#0b0d10_5rem,#0b0d10_calc(100%_-_5rem),var(--app-bg)_100%)]";
const LEADERBOARD_FINAL_BOARD_SURFACE_CLASS_NAME =
    "bg-[linear-gradient(to_bottom,#201604_0%,#0b0d10_5rem,#0b0d10_calc(100%_-_5rem),var(--app-bg)_100%)]";
const LEADERBOARD_ACTIVE_TITLE_SURFACE_CLASS_NAME =
    "bg-[linear-gradient(to_bottom,#000000_0%,#111820_100%)]";
const LEADERBOARD_FINAL_TITLE_SURFACE_CLASS_NAME =
    "bg-[linear-gradient(to_bottom,#000000_0%,rgba(245,158,11,0.12)_100%)]";
const LEADERBOARD_SPORT_CHIP_CLASS_NAME =
    "inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-300";

/**
 * The COLUMN separators.
 *
 * Absolutely positioned hairlines rather than `border-r`, because the columns
 * now sit on a shared gradient: a real border paints a hard edge over it, while
 * a `w-px` overlay at `z-20` rides above every cell — including the sticky
 * column — and keeps the grid reading as one surface ruled into cells.
 */
const LEADERBOARD_VERTICAL_DIVIDER_CLASS_NAME =
    "pointer-events-none absolute inset-y-0 z-20 w-px bg-sky-200/[0.06]";

/**
 * The 1024px step the MVP added above this grid's existing mobile/tablet
 * geometry. `useIsMobile` (max-width: 639px) still owns the low end, so the
 * three tiers meet at 640px and 1024px — the same boundaries the `sm:` and `lg:`
 * classes in LEADERBOARD_CARD_SIZING scale at.
 */
const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = useState(false);

    useLayoutEffect(() => {
        const mql = window.matchMedia(LEADERBOARD_DESKTOP_QUERY);
        const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

        setIsDesktop(mql.matches);
        mql.addEventListener("change", onChange);

        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isDesktop;
};

const LEADERBOARD_LAYOUT_METRICS = {
    mobile: {
        rankColumnWidth: 108,
        rowHeight: 112,
        headerHeight: 44,
        tallyHeight: 58,
        playerColumnRatio: 0.3,
        playerColumnMin: 108,
        playerColumnMax: 123,
    },
    tablet: {
        rankColumnWidth: 158,
        rowHeight: 132,
        headerHeight: 48,
        tallyHeight: 68,
        playerColumnRatio: 0.165,
        playerColumnMin: 158,
        playerColumnMax: 210,
    },
    desktop: {
        rankColumnWidth: 178,
        rowHeight: 149,
        headerHeight: 54,
        tallyHeight: 77,
        playerColumnRatio: 0.165,
        playerColumnMin: 178,
        playerColumnMax: 236,
    },
} as const;

/**
 * One visual hierarchy across the standings grid, scaled at the same 640px and
 * 1024px boundaries used by its measured tablet and desktop geometry.
 *
 * Ported from the MVP verbatim. Bare classes are the mobile case, `sm:` the
 * tablet one and `lg:` the desktop one — which is why this replaced the inline
 * `md:` classes that used to be written at each call site.
 */
export const LEADERBOARD_CARD_SIZING = {
    frame:
        "rounded-lg border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_34px_-30px_rgba(0,0,0,0.9)] sm:rounded-xl sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_-34px_rgba(0,0,0,0.92)] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_22px_50px_-36px_rgba(0,0,0,0.95)]",
    gridText: "text-sm sm:text-base",
    columnHeader: "text-[10px] sm:text-[11px] lg:text-xs",
    slipTitle: "text-sm sm:text-base",
    playerRow: "px-2 py-2 sm:px-3",
    playerCell: "justify-center gap-2 sm:gap-3 lg:gap-2",
    playerIdentity: "items-center gap-2 sm:gap-2.5 lg:gap-3",
    avatarButton: "h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11",
    avatarFace: "text-[11px] sm:text-xs lg:text-sm",
    rankChip: STANDING_RANK_MARKER_LAYOUT,
    playerDetails:
        "flex min-h-9 flex-col items-center justify-center sm:min-h-10 lg:min-h-11",
    playerPoints:
        "mt-0 w-full flex-nowrap justify-center text-center text-xs normal-case tracking-normal sm:text-sm",
    playerPointBlock: "flex flex-col items-center gap-0.5 sm:gap-1",
    playerPointValue:
        "text-xl font-bold leading-none tracking-tight sm:text-[22px] lg:text-2xl",
    playerPointSuffix:
        "ml-0 text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-[9px] sm:tracking-[0.12em] lg:text-[10px]",
    badgeCard:
        "flex min-h-9 flex-col justify-center gap-0 rounded-lg border-white/15 bg-white/[0.035] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:min-h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-1.5 sm:rounded-xl sm:px-2 sm:py-1.5 lg:min-h-11 lg:gap-2 lg:px-2.5",
    badgeSummary:
        "w-full items-center justify-between gap-1 text-[8px] leading-none tracking-normal sm:w-auto sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-1 sm:text-[9px] sm:tracking-wide lg:text-[10px]",
    badgeRail:
        "mt-0.5 w-full max-w-full justify-start gap-0.5 overscroll-x-contain scroll-smooth touch-pan-x px-0 py-0 sm:mt-0 sm:w-auto sm:flex-1 sm:gap-1",
    badgeButton:
        "flex h-6 w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 sm:h-7 sm:w-7 lg:h-8 lg:w-8",
    badgeIcon: "h-4 w-4 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5",
    slipRow: "px-2 py-2 sm:px-3",
    emptyCard:
        "rounded-xl border-b-2 border-b-white/15 px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_-24px_rgba(0,0,0,0.88)] sm:border-b-[3px] sm:px-3 lg:rounded-2xl lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_36px_-28px_rgba(0,0,0,0.9)]",
    emptyCopy: "text-sm sm:text-base",
    slipLayout:
        "grid-cols-[minmax(0,1fr)_66px] items-stretch gap-1 sm:grid-cols-[minmax(0,1fr)_116px_116px] sm:gap-2 lg:grid-cols-[minmax(0,1fr)_clamp(150px,19%,180px)_clamp(140px,17%,165px)] lg:gap-3",
    primaryCard:
        "justify-between gap-0 rounded-xl border-b-2 border-b-white/15 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_-24px_rgba(0,0,0,0.88)] sm:rounded-2xl sm:border-b-[3px] sm:px-3 sm:py-2.5 lg:col-start-1 lg:row-start-1 lg:px-4 lg:py-3 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_-28px_rgba(0,0,0,0.9)]",
    pickCopy:
        "w-full self-start text-left text-sm leading-tight sm:text-[17px] lg:text-xl",
    pickMeta: "w-full shrink-0 text-left text-[9px] leading-tight sm:text-xs",
    categoryRow:
        "mr-auto ml-0 w-full min-w-0 shrink-0 flex-nowrap justify-between self-start gap-1.5 pt-0 sm:gap-2",
    categoryGroup: "flex min-w-0 items-center gap-1 sm:gap-1.5",
    categoryChip:
        "rounded-none bg-transparent px-0 py-0 text-[9px] sm:text-[10px] lg:text-xs",
    legsChip:
        "rounded-none bg-transparent px-0 py-0 text-[9px] sm:text-[10px] lg:text-xs",
    pickOdds:
        "shrink-0 whitespace-nowrap text-[10px] font-bold tabular-nums text-cyan-100 sm:text-xs lg:text-sm",
    statsGrid: "grid-rows-2 gap-1.5 sm:contents",
    tierCard: "sm:col-start-2 sm:row-start-1",
    pointsCard: "sm:col-start-3 sm:row-start-1",
    statCard:
        "h-full justify-between gap-0.5 rounded-xl border-b-2 border-b-white/15 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_-22px_rgba(0,0,0,0.88)] sm:gap-1 sm:border-b-[3px] sm:p-2 lg:gap-2 lg:rounded-2xl lg:p-4 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_-28px_rgba(0,0,0,0.9)]",
    statLabel: "text-[8px] leading-none sm:text-[10px] lg:text-xs",
    statValue: "mt-0 text-sm leading-none sm:text-base lg:text-xl",
    statFooter:
        "sm:static sm:block sm:text-[9px] sm:font-semibold sm:uppercase sm:tracking-[0.12em] sm:text-white/45 lg:text-[10px]",
    tierHeader:
        "flex w-full items-start justify-between gap-1 sm:items-center sm:gap-1.5",
    tierLabel:
        "min-w-0 text-[7px] leading-[0.95] tracking-[0.04em] sm:whitespace-nowrap sm:text-[10px] sm:leading-none sm:tracking-wide lg:text-xs",
    tierName: "text-[10px] leading-tight sm:text-sm lg:text-base",
    tierRange: "text-[8px] leading-tight sm:text-[10px] lg:text-xs",
    tierInfo:
        "h-4 w-4 text-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-[18px] sm:w-[18px] sm:text-[9px] lg:h-5 lg:w-5 lg:text-[10px]",
    tallyRow:
        "grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-1 px-2 sm:grid-cols-[minmax(0,1fr)_116px_116px] sm:gap-2 sm:px-3 lg:grid-cols-[minmax(0,1fr)_clamp(150px,19%,180px)_clamp(140px,17%,165px)] lg:gap-3",
    shareButton:
        "w-7 min-w-7 rounded-lg border-b-2 border-b-white/15 px-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:w-9 sm:min-w-9 sm:justify-self-end sm:rounded-xl sm:border-b-[3px] lg:w-10 lg:min-w-10",
    shareIcon: "h-4 w-4 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5",
    tallyCard:
        "h-full min-w-0 justify-between gap-0.5 rounded-lg border-b-2 border-b-white/15 px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:w-[116px] sm:gap-1 sm:rounded-xl sm:border-b-[3px] sm:px-3 sm:py-2 lg:w-auto",
    tallyLabel: "text-[9px] leading-none sm:text-[10px] lg:text-xs",
    tallyValue: "text-base leading-none sm:text-lg lg:text-xl",
    note: "rounded-lg px-4 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm",
} as const;

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
    const isCurrentUser = user_id === currentUserId;
    // Placement tone for the rank marker. Slip leaderboards pay the top three,
    // which is this helper's default.
    const rankTone = getStandingRankMarkerTone(rank);
    const profileImg = generateProfileImageUrl(profile_image);
    const imageSize = isMobile ? "h-9 w-9" : "h-11 w-11";

    // Avatar box and type size now come from LEADERBOARD_CARD_SIZING
    // (avatarButton / avatarFace); only the tone is decided here.
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
        <div className={`flex h-full w-full min-w-0 flex-col ${LEADERBOARD_CARD_SIZING.playerCell}`}>
            <div className={`flex min-w-0 ${LEADERBOARD_CARD_SIZING.playerIdentity}`}>
                <button
                    type="button"
                    onClick={() => setShowRecord((prev) => !prev)}
                    aria-label={
                        showRecord
                            ? `Show avatar for ${displayName}`
                            : `Show record for ${displayName}`
                    }
                    title={displayName}
                    className={`group relative shrink-0 [perspective:400px] ${LEADERBOARD_CARD_SIZING.avatarButton}`}
                >
                    <div
                        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-180deg)] ${showRecord ? "[transform:rotateY(-180deg)]" : ""
                            }`}
                    >
                        <div
                            className={`absolute inset-0 flex items-center justify-center rounded-full font-semibold uppercase ring-1 ring-offset-1 ring-offset-black [backface-visibility:hidden] ${LEADERBOARD_CARD_SIZING.avatarFace} ${avatarTone}`}
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
                        <div
                            className={`absolute inset-0 flex items-center justify-center rounded-full border border-white/25 bg-black/80 font-semibold tabular-nums leading-none text-slate-100 [backface-visibility:hidden] [transform:rotateY(-180deg)] ${LEADERBOARD_CARD_SIZING.avatarFace}`}
                        >
                            {winLoss.wins}-{winLoss.losses}
                        </div>
                    </div>
                    {/* The shared placement marker — gold/silver/bronze for the
                        winning places, neutral otherwise — instead of the plain
                        black chip this used to draw. Same component the Feed
                        Contest standings use, so the two agree. */}
                    <span
                        data-slip-standing-rank-marker
                        data-standing-rank={rank}
                        data-standing-placement={rankTone}
                        data-standing-marker-surface="opaque"
                        className={`absolute z-10 flex items-center justify-center rounded-full border font-semibold tabular-nums ${STANDING_RANK_MARKER_TONES[rankTone]} ${LEADERBOARD_CARD_SIZING.rankChip}`}
                    >
                        {rank}
                    </span>
                </button>
                <div className={`min-w-0 flex-1 ${LEADERBOARD_CARD_SIZING.playerDetails}`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                        <button
                            className="truncate text-[11px] font-semibold text-white sm:text-[13px] cursor-pointer"
                            title={displayName}
                            onClick={() => handleViewProfile(user_id)}
                            disabled={currentUserId === user_id}
                        >
                            {usernameCopy}
                        </button>
                    </div>
                    <div
                        className={`flex items-center font-semibold text-slate-400 ${LEADERBOARD_CARD_SIZING.playerPoints}`}
                    >
                        <span
                            className={`whitespace-nowrap ${LEADERBOARD_CARD_SIZING.playerPointBlock}`}
                        >
                            <span
                                className={`${pointsTone} ${LEADERBOARD_CARD_SIZING.playerPointValue}`}
                            >
                                {cumulative}
                            </span>
                            <span className={LEADERBOARD_CARD_SIZING.playerPointSuffix}>
                                <span className="sm:hidden">total FP</span>
                                <span className="hidden sm:inline">total Fantasy Points</span>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            <div className={`min-w-0 border ${LEADERBOARD_CARD_SIZING.badgeCard}`}>
                <div
                    className={`flex font-semibold uppercase ${LEADERBOARD_CARD_SIZING.badgeSummary}`}
                >
                    {badgeAwards.length > 0 ? (
                        <span className="text-slate-400">
                            {badgeAwards.length} badge{badgeAwards.length === 1 ? "" : "s"}
                        </span>
                    ) : (
                        <span className="text-slate-500">No badges</span>
                    )}
                    {badgeBonus > 0 && <span className="text-sky-200">+{badgeBonus} pts</span>}
                </div>
                <div
                    className={`scrollbar-hide flex min-w-0 items-center overflow-x-auto whitespace-nowrap ${LEADERBOARD_CARD_SIZING.badgeRail}`}
                >
                    {badgeAwards.length > 0
                        ? badgeAwards.map((award) => (
                            <button
                                key={award.definition.id}
                                type="button"
                                onClick={() => onSelectBadge(award)}
                                aria-label={`${award.definition.name}: ${award.valueLabel}, +${award.points} points`}
                                className={`shrink-0 rounded-full transition hover:scale-110 ${LEADERBOARD_CARD_SIZING.badgeButton}`}
                                title={`${award.definition.name}: ${award.valueLabel}, +${award.points} pts`}
                            >
                                <BadgeIcon
                                    category={award.definition.category}
                                    sport={award.sport}
                                    glow={false}
                                    alt={award.definition.name}
                                    className={LEADERBOARD_CARD_SIZING.badgeIcon}
                                />
                            </button>
                        ))
                        : null}
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
    const [showTier, setShowTier] = useState(false);
    const [showTierInfo, setShowTierInfo] = useState(false);
    const emptyCardTone = "border-slate-900/80 bg-slate-950/70";
    if (!isCurrectSlip) {
        return (
            <div
                className={`relative flex h-full w-full flex-col items-start justify-center overflow-hidden border py-2 ${LEADERBOARD_CARD_SIZING.emptyCard} ${emptyCardTone}`}
            >
                <p className={`leading-tight text-slate-400 ${LEADERBOARD_CARD_SIZING.emptyCopy}`}>
                    No pick yet
                </p>
            </div>
        );
    }

    if (!hasPick) {
        if (isOwnerCell && isOpen) {
            return (
                <Link
                    href={`/league/${groupId}/slips/${slip.id}`}
                    className={`group flex h-full w-full flex-col items-start justify-between gap-1 border border-dashed border-sky-400/40 bg-gradient-to-br from-sky-500/[0.1] via-sky-500/[0.03] to-transparent py-2 text-sky-100 transition hover:border-sky-300/80 hover:from-sky-500/[0.18] ${LEADERBOARD_CARD_SIZING.emptyCard}`}
                >
                    <span
                        className={`inline-flex items-center gap-1 font-semibold leading-tight text-sky-50 ${LEADERBOARD_CARD_SIZING.emptyCopy}`}
                    >
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
                className={`flex h-full w-full flex-col items-start justify-between gap-1 border py-2 ${LEADERBOARD_CARD_SIZING.emptyCard} ${emptyState.border} ${emptyState.surface}`}
            >
                <span
                    className={`font-medium leading-tight ${LEADERBOARD_CARD_SIZING.emptyCopy} ${emptyState.bodyTone}`}
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
    /*
     * "Fantasy Points", not a bare "points". The MVP renamed the whole League
     * scoring vocabulary so a slip cell cannot be read as the contextual League
     * / Arena Points a Feed contest awards — they are different currencies on
     * the same screen. Screen-reader only: the visible chip stays "FP".
     */
    const pointsFooterText = showPointsSuffix
        ? isPending
            ? "Potential Fantasy Points"
            : "Fantasy Points"
        : "No Fantasy Points awarded";
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
    /*
     * A combo reads as "pick" here, not "combo".
     *
     * The cell already shows its legs and its combined price, so the chip was
     * repeating what the card said and stealing the room the market name needs.
     * Only a genuinely non-combo `sourceTab` still names itself.
     */
    const sourceTabLabel = (
        pick?.pick_source_tab?.trim().toLowerCase() === "combo"
            ? "Pick"
            : pick?.pick_source_tab ?? "Pick"
    ).toLowerCase();

    return (
        <div
            className="relative flex h-full w-full"
        >
            {/* Three columns from `sm` up — pick | tier | points side by side —
                where this used to stay two at every width with the tier and
                points tiles stacked. Mobile keeps the 2-column form; the stat
                column below becomes `contents` at `sm` so its two tiles promote
                to direct children of this grid. */}
            <div className={`grid h-full w-full min-w-0 ${LEADERBOARD_CARD_SIZING.slipLayout}`}>
                {/* MVP order, top to bottom: the category row (source tab · legs
                    on the left, accepted odds on the right), then the pick line,
                    then the matchup/kickoff meta. `primaryCard` carries
                    justify-between, so the pick line sits centred between the two
                    and the meta is pinned to the bottom. */}
                <div
                    className={`flex min-h-0 min-w-0 flex-col border border-white/10 bg-white/[0.04] ${LEADERBOARD_CARD_SIZING.primaryCard} ${resultCardTone}`}
                >
                    <div
                        className={`flex min-w-0 flex-wrap items-center ${LEADERBOARD_CARD_SIZING.categoryRow}`}
                    >
                        <div className={LEADERBOARD_CARD_SIZING.categoryGroup}>
                            <span
                                className={`inline-flex min-w-0 items-center truncate font-semibold uppercase tracking-[0.14em] text-slate-300 ${LEADERBOARD_CARD_SIZING.categoryChip}`}
                            >
                                {sourceTabLabel}
                            </span>
                            {/* The separate leg-count chip went with the combo
                                relabel above — the legs are already listed in
                                the cell body, so it only crowded the row. */}
                        </div>
                        {/* Accepted odds, right-aligned in the header. The flip
                            tile still shows them on its front face by design —
                            this is the at-a-glance copy that needs no flip. */}
                        <span
                            aria-label={`Accepted odds ${oddsCopy}`}
                            title="Accepted odds"
                            className={LEADERBOARD_CARD_SIZING.pickOdds}
                        >
                            {oddsCopy}
                        </span>
                    </div>
                    <p
                        className={`line-clamp-2 min-w-0 break-words font-semibold text-white ${LEADERBOARD_CARD_SIZING.pickCopy} ${accent}`}
                        title={displayPick}
                    >
                        {pickLine}
                    </p>
                    {metaLabel ? (
                        <p
                            className={`min-w-0 truncate text-slate-400 ${LEADERBOARD_CARD_SIZING.pickMeta}`}
                            title={metaLabel}
                        >
                            {metaLabel}
                        </p>
                    ) : (
                        <p className={`text-slate-500 ${LEADERBOARD_CARD_SIZING.pickMeta}`}>{EM_DASH}</p>
                    )}
                </div>

                <div className={`grid min-h-0 min-w-0 text-left ${LEADERBOARD_CARD_SIZING.statsGrid}`}>
                    <button
                        type="button"
                        onClick={() => setShowTier((prev) => !prev)}
                        aria-label={showTier ? "Show odds" : "Show tier"}
                        className={`group block h-full min-h-0 w-full min-w-0 cursor-pointer bg-transparent text-left [perspective:600px] ${LEADERBOARD_CARD_SIZING.tierCard}`}
                    >
                        <div
                            className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${showTier ? "[transform:rotateY(180deg)]" : ""
                                }`}
                        >
                            <div
                                className={`absolute inset-0 flex flex-col overflow-hidden border border-white/10 [backface-visibility:hidden] ${LEADERBOARD_CARD_SIZING.statCard} ${tierCardTone}`}
                                style={tierCardStyle}
                            >
                                <div className={LEADERBOARD_CARD_SIZING.tierHeader}>
                                    <span
                                        className={`font-semibold uppercase text-slate-100/70 ${LEADERBOARD_CARD_SIZING.tierLabel}`}
                                    >
                                        odds
                                    </span>
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View Fantasy Point tiers"
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
                                        className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/40 font-serif font-bold leading-none text-white/70 transition hover:bg-white/20 hover:text-white ${LEADERBOARD_CARD_SIZING.tierInfo}`}
                                    >
                                        i
                                    </span>
                                </div>
                                <span
                                    className={`block truncate font-semibold tabular-nums text-white ${LEADERBOARD_CARD_SIZING.statValue}`}
                                >
                                    {oddsCopy}
                                </span>
                                <span
                                    className={`pointer-events-none absolute bottom-1 right-1.5 text-[7px] leading-none text-white/40 ${LEADERBOARD_CARD_SIZING.statFooter}`}
                                    aria-hidden
                                >
                                    ⇄
                                </span>
                            </div>
                            <div
                                className={`absolute inset-0 flex flex-col overflow-hidden border border-white/10 [backface-visibility:hidden] [transform:rotateY(180deg)] ${LEADERBOARD_CARD_SIZING.statCard} ${tierCardTone}`}
                                style={tierCardStyle}
                            >
                                <span
                                    className={`block truncate font-semibold text-white ${LEADERBOARD_CARD_SIZING.tierName}`}
                                >
                                    {tierName}
                                </span>
                                <span
                                    className={`block truncate text-slate-100/70 ${LEADERBOARD_CARD_SIZING.tierRange}`}
                                >
                                    {tierRange}
                                </span>
                                <span
                                    className={`pointer-events-none absolute right-1 top-1 text-[7px] leading-none text-white/40 ${LEADERBOARD_CARD_SIZING.statFooter}`}
                                    aria-hidden
                                >
                                    ⇄
                                </span>
                            </div>
                        </div>
                    </button>
                    <div
                        className={`flex min-h-0 min-w-0 flex-col overflow-hidden border ${LEADERBOARD_CARD_SIZING.statCard} ${LEADERBOARD_CARD_SIZING.pointsCard} ${resultCardTone}`}
                    >
                        <span
                            className={`block truncate font-semibold uppercase tracking-wide text-slate-100/75 ${LEADERBOARD_CARD_SIZING.statLabel}`}
                        >
                            {pointsLabelText}
                        </span>
                        <div
                            className={`truncate font-semibold tabular-nums ${LEADERBOARD_CARD_SIZING.statValue}`}
                        >
                            {pointsDisplay}
                            {showPointsSuffix && (
                                <span
                                    aria-label="Fantasy Points"
                                    className={`ml-0.5 font-semibold uppercase tracking-wide text-slate-100/70 ${LEADERBOARD_CARD_SIZING.statLabel}`}
                                >
                                    FP
                                </span>
                            )}
                        </div>
                        {/* SCREEN READERS ONLY — never `hidden` + statFooter.
                            That class carries `sm:static sm:block` because it
                            was written for the absolutely-positioned flip hint,
                            so pairing it with `hidden` un-hides this from 640px
                            up and adds a third line to a card sized for two:
                            the label and the value then overflow and clip. */}
                        <span className="sr-only">{pointsFooterText}</span>
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
    onCreateSlip,
    createSlipOpen = false,
}: Props) => {
    const isMobile = useIsMobile();
    const isDesktop = useIsDesktop();
    const [selectedBadge, setSelectedBadge] = useState<ContestBadgeAward | null>(null);
    const [shareSlipId, setShareSlipId] = useState<string | null>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    /*
     * The measured container node lives in STATE, not in a ref.
     *
     * This component early-returns ("No members yet." / "No leaderboard slips
     * yet.") ABOVE the div that carries this ref, and the parent swaps in
     * <LeaderboardSkeleton> while a leaderboard loads. So on the first render
     * the node does not exist. An effect keyed on anything else would run once
     * against a null ref, bail, and never re-run — a ref flipping null -> node
     * re-fires nothing — leaving containerWidth pinned at the fallback below
     * with no ResizeObserver ever attached. Every column then sizes off ~848px
     * instead of the real width, which is what clipped the right-hand slip.
     *
     * Publishing the node into state re-runs the measure effect at exactly the
     * commit where the real container mounts. Same fix as HomeTab's carousel.
     */
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    // Fallback only until the first real measurement lands.
    const [containerWidth, setContainerWidth] = useState<number>(isMobile ? 385 : 848);

    useLayoutEffect(() => {
        if (!containerEl) return;

        const measure = () => {
            const width = containerEl.getBoundingClientRect().width;
            if (width) setContainerWidth(Math.round(width));
        };

        measure();

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
            // A hidden tab measures 0; keep the last good width rather than
            // collapsing every column to nothing.
            if (width) setContainerWidth(Math.round(width));
        });

        observer.observe(containerEl);
        return () => observer.disconnect();
    }, [containerEl]);

    // Three measured tiers now, not two: the MVP added a `desktop` step at
    // 1024px on top of the mobile/tablet geometry this grid already used, so a
    // wide screen gets taller rows and a wider player column instead of the
    // tablet sizes stretched across it. The mobile and tablet numbers are
    // unchanged from what was here before.
    const layoutMetrics = isDesktop
        ? LEADERBOARD_LAYOUT_METRICS.desktop
        : isMobile
            ? LEADERBOARD_LAYOUT_METRICS.mobile
            : LEADERBOARD_LAYOUT_METRICS.tablet;
    const RANK_COL_W = layoutMetrics.rankColumnWidth;
    const ROW_H = layoutMetrics.rowHeight;
    const HEADER_H = layoutMetrics.headerHeight;
    const SLIP_GAP = 0;
    const effectiveWidth = containerWidth ?? 0;
    // Box height matches the odds/points boxes: (ROW_H - 20) / 2, plus py-1.5.
    const TALLY_H = layoutMetrics.tallyHeight;

    const PLAYER_CARD_W = useMemo(() => {
        if (!effectiveWidth) return layoutMetrics.playerColumnMin;

        const raw = Math.round(effectiveWidth * layoutMetrics.playerColumnRatio);

        return Math.max(
            Math.min(raw, layoutMetrics.playerColumnMax),
            layoutMetrics.playerColumnMin,
        );
    }, [effectiveWidth, layoutMetrics]);

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

    /*
     * A slipless contest still renders the BOARD, not a sentence.
     *
     * The MVP dropped its "No League Slips yet" early return here in favour of a
     * placeholder slip column, so a commissioner sees the shape of what they are
     * about to create — every member already in rank order, one empty pick slot
     * each — instead of an empty page that says the feature exists somewhere
     * else. The create action then sits in the same cell the first real pick
     * will occupy.
     */
    const isEmptyPreview = leaderboardAllSlips.length === 0;

    /* ---------- The premium surface's own derived state ---------- */
    const standingsFinalized = isArchived;
    const leaderboardTheme = standingsFinalized ? "gold" : "blue";
    const boardSurfaceClassName = standingsFinalized
        ? LEADERBOARD_FINAL_BOARD_SURFACE_CLASS_NAME
        : LEADERBOARD_ACTIVE_BOARD_SURFACE_CLASS_NAME;
    const titleSurfaceClassName = standingsFinalized
        ? LEADERBOARD_FINAL_TITLE_SURFACE_CLASS_NAME
        : LEADERBOARD_ACTIVE_TITLE_SURFACE_CLASS_NAME;
    const standingsHeadingId = "fantasy-contest-rank-heading";
    const playerCountLabel = `${leaderboard.length} active ${leaderboard.length === 1 ? "player" : "players"
        }`;
    const slipCountLabel = `${leaderboardAllSlips.length} contest ${leaderboardAllSlips.length === 1 ? "slip" : "slips"
        }`;
    // Sports ride on the slips here; the grid is not handed the contest row.
    // An archived slip carries no `sports`, so the chips simply do not render
    // on an archived board rather than the whole strip failing.
    const contestSports = Array.from(
        new Set(
            leaderboardAllSlips.flatMap((slip) =>
                "sports" in slip ? slip.sports ?? [] : []
            )
        )
    ).filter(Boolean);
    const standingsSportLabels =
        contestSports.length > 1 ? ["Multi"] : contestSports;

    /*
     * The horizontal rules, EXTENDED INTO THE GUTTER.
     *
     * The grid itself is inset by the page gutter, so its own row borders stop
     * short of the full-bleed surface and the board reads as a floating table
     * again. This layer redraws each rule as a `w-5 sm:w-6` stub — exactly the
     * gutter width — hard against both edges, so every line runs the full width
     * of the screen and the board reads as one ruled surface.
     *
     * Offsets are computed from the SAME geometry the columns are laid out
     * with, so nothing here changes a width or a height.
     */
    const dividerExtensions = [
        {
            key: "header",
            top: HEADER_H - 1,
            leftTone: standingsFinalized ? "bg-amber-200/10" : "bg-sky-200/10",
            rightTone: standingsFinalized ? "bg-amber-200/10" : "bg-sky-200/10",
        },
        ...leaderboard.slice(0, -1).map((_, rowIndex) => ({
            key: `row-${rowIndex + 1}`,
            top: HEADER_H + (rowIndex + 1) * ROW_H - 1,
            leftTone: "bg-white/10",
            rightTone: "bg-white/10",
        })),
        {
            key: "tally",
            top: HEADER_H + leaderboard.length * ROW_H,
            leftTone: "bg-sky-200/10",
            rightTone: "bg-white/10",
        },
    ];

    return (
        <div
            data-leaderboard-surface="league-rank"
            data-leaderboard-theme={leaderboardTheme}
            className="-mx-5 min-w-0 sm:-mx-6"
        >
            {/* Title strip. Starts at pure black so it butts against the tab
                strip with no visible seam, and carries the board's counts and
                sport chips instead of a heading nobody needed twice. */}
            <div data-leaderboard-title-row className={titleSurfaceClassName}>
                <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
                    <h2 id={standingsHeadingId} className="sr-only">
                        Contest standings
                    </h2>
                    <p
                        data-leaderboard-helper
                        className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs"
                    >
                        {slipCountLabel} · {playerCountLabel}
                    </p>
                    {standingsSportLabels.length > 0 && (
                        <div className="flex shrink-0 items-center justify-end gap-1.5">
                            {standingsSportLabels.map((sport) => (
                                <span key={sport} className={LEADERBOARD_SPORT_CHIP_CLASS_NAME}>
                                    {sport}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div
                data-leaderboard-table-backdrop
                className={`relative ${boardSurfaceClassName}`}
            >
                {/*
                 * RE-INSET TO THE ORIGINAL GUTTER.
                 *
                 * The gradient above is full-bleed, but the measured element
                 * below sits back at `mx-5 sm:mx-6` — exactly the width it had
                 * before this frame existed. That is deliberate: `containerEl`
                 * feeds STICKY_WIDTH and SLIP_WIDTH, so measuring the bled
                 * width would widen every column by the page gutter.
                 */}
                <div className="relative z-10 mx-5 min-w-0 sm:mx-6">
                    <div
                        ref={setContainerEl}
                        className="min-w-0 space-y-3 opacity-100 transition-opacity duration-300"
                    >
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
                    <div className={`min-w-max text-white ${LEADERBOARD_CARD_SIZING.gridText}`}>
                        <div className="flex">
                            {/* Sticky Rank + Player */}
                            <div
                                data-leaderboard-player-column
                                className={`sticky left-0 z-10 box-border flex flex-col self-start border-r border-transparent ${boardSurfaceClassName}`}
                                style={{
                                    width: STICKY_WIDTH
                                }}
                            >
                                <span
                                    data-leaderboard-vertical-divider="left"
                                    aria-hidden="true"
                                    className={`left-0 ${LEADERBOARD_VERTICAL_DIVIDER_CLASS_NAME}`}
                                />
                                <span
                                    data-leaderboard-vertical-divider="player"
                                    aria-hidden="true"
                                    className={`right-0 ${LEADERBOARD_VERTICAL_DIVIDER_CLASS_NAME}`}
                                />
                                <div
                                    data-leaderboard-column-header="player"
                                    className={`box-border flex items-center border-b border-sky-200/10 px-2 uppercase tracking-wide text-gray-500 sm:px-3 ${LEADERBOARD_CARD_SIZING.columnHeader}`}
                                    style={{ height: HEADER_H }}
                                >
                                    <span>Player</span>
                                </div>
                                {leaderboard.map(({ cumulative_points, badge_points, badge_awards, profile_image, username, user_id, win, loss, rank }, rowIndex) => {
                                    const rowBand = "bg-transparent";
                                    const isLastRow = rowIndex === leaderboard.length - 1;
                                    return (
                                        <div
                                            key={user_id}
                                            className={`relative flex items-center border-white/10 ${LEADERBOARD_CARD_SIZING.playerRow} ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
                                                }`}
                                            style={{ height: ROW_H }}
                                        >
                                            <PlayerCell
                                                key={user_id}
                                                username={username ?? "Member"}
                                                rank={rank ?? rowIndex + 1}
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
                                {/* TRANSPARENT, not the board gradient. The
                                    gradient is sized to the whole board; painting
                                    it again on a ~60px cell compresses every stop
                                    into that box and the colour visibly breaks
                                    from the column above it. */}
                                <div
                                    data-leaderboard-player-tally
                                    className="box-border border-t border-sky-200/10 bg-transparent"
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
                                                data-leaderboard-slip-column
                                                // The border stays for its WIDTH — removing it
                                                // would reflow the columns — but goes transparent
                                                // so the hairline overlay is the only visible
                                                // separator rather than a second line beside it.
                                                className={`relative box-border flex-shrink-0 snap-start overflow-hidden ${slipBg} ${isLastSlip ? "border-r-0" : "border-r border-transparent"
                                                    }`}
                                                // All three, as the MVP sets them.
                                                // `width` alone is only a
                                                // suggestion on a flex item:
                                                // flex-shrink-0 stops it
                                                // shrinking, but `min-width:
                                                // auto` still lets a column GROW
                                                // past it when its content is
                                                // wider — which is how two
                                                // columns with the same width
                                                // ended up different sizes and
                                                // the right-hand one got clipped.
                                                style={{
                                                    width: `${SLIP_WIDTH}px`,
                                                    minWidth: `${SLIP_WIDTH}px`,
                                                    maxWidth: `${SLIP_WIDTH}px`,
                                                }}
                                            >
                                                <span
                                                    data-leaderboard-vertical-divider="slip"
                                                    aria-hidden="true"
                                                    className={`right-0 ${LEADERBOARD_VERTICAL_DIVIDER_CLASS_NAME}`}
                                                />
                                                <div
                                                    data-leaderboard-column-header="slip"
                                                    className={`box-border flex flex-col justify-center gap-0.5 border-b border-sky-200/10 px-2 py-1.5 uppercase tracking-wide sm:px-3 ${LEADERBOARD_CARD_SIZING.columnHeader} ${slipTone}`}
                                                    style={{ height: HEADER_H }}
                                                >
                                                    <div className="flex min-w-0 items-center justify-between gap-2 leading-tight">
                                                        <span
                                                            className={`allow-caps min-w-0 truncate font-semibold leading-tight ${LEADERBOARD_CARD_SIZING.slipTitle} ${isFinal ? "text-white" : "text-slate-200"}`}
                                                            title={`${slip.name} (leaderboard slip)`}
                                                        >
                                                            {slip.name}
                                                        </span>
                                                        <span
                                                            className={`shrink-0 font-semibold uppercase leading-tight tracking-wide ${LEADERBOARD_CARD_SIZING.columnHeader} ${statusMeta.tone}`}
                                                        >
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
                                                            className={`border-white/10 ${LEADERBOARD_CARD_SIZING.slipRow} ${rowBand} ${isLastRow ? "border-b-0" : "border-b"
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
                                                {/* A GRID now, not a right-aligned
                                                    flex row: share | card | card,
                                                    where the share sits in a 28px
                                                    column on mobile and from `sm`
                                                    rides the right edge of a
                                                    flexible first column with two
                                                    fixed 116px cards after it. The
                                                    cards pick up the MVP's rounder
                                                    corners, heavy bottom border and
                                                    top-light inner shadow. */}
                                                <div
                                                    className={`box-border border-t border-white/10 py-1.5 ${LEADERBOARD_CARD_SIZING.tallyRow}`}
                                                    style={{ height: TALLY_H }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setShareSlipId(slip.id ?? null)}
                                                        aria-label={`Share ${slip.name}`}
                                                        className={`flex shrink-0 items-center justify-center border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-white/30 hover:text-white ${LEADERBOARD_CARD_SIZING.shareButton}`}
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className={LEADERBOARD_CARD_SIZING.shareIcon}
                                                            aria-hidden
                                                        >
                                                            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                                                            <path d="M16 6l-4-4-4 4" />
                                                            <path d="M12 2v13" />
                                                        </svg>
                                                    </button>
                                                    <div
                                                        className={`flex shrink-0 flex-col overflow-hidden border border-white/10 bg-white/[0.05] leading-tight ${LEADERBOARD_CARD_SIZING.tallyCard}`}
                                                    >
                                                        <span
                                                            className={`block font-semibold uppercase tracking-wide text-slate-100/70 ${LEADERBOARD_CARD_SIZING.tallyLabel}`}
                                                        >
                                                            combo odds
                                                        </span>
                                                        <span
                                                            className={`block truncate font-semibold tabular-nums ${LEADERBOARD_CARD_SIZING.tallyValue} ${groupComboOddsSummary ? "text-cyan-100" : "text-slate-500"
                                                                }`}
                                                        >
                                                            {groupComboOddsSummary ? groupComboOddsSummary.label : "pending"}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`flex shrink-0 flex-col overflow-hidden border border-white/10 bg-white/[0.05] leading-tight ${LEADERBOARD_CARD_SIZING.tallyCard}`}
                                                    >
                                                        <span
                                                            className={`block font-semibold uppercase tracking-wide text-slate-100/70 ${LEADERBOARD_CARD_SIZING.tallyLabel}`}
                                                        >
                                                            record
                                                        </span>
                                                        <span
                                                            className={`block font-semibold tabular-nums ${LEADERBOARD_CARD_SIZING.tallyValue}`}
                                                        >
                                                            <span className="text-emerald-200">{slipTally.wins}</span>
                                                            <span className="text-white/40">-</span>
                                                            <span className="text-rose-200">{slipTally.losses}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {isEmptyPreview && (
                                        <div
                                            data-leaderboard-empty-slip-column
                                            className="relative box-border flex-shrink-0 overflow-hidden"
                                            style={{
                                                width: `${SLIP_WIDTH}px`,
                                                minWidth: `${SLIP_WIDTH}px`,
                                                maxWidth: `${SLIP_WIDTH}px`,
                                            }}
                                        >
                                            <span
                                                data-leaderboard-vertical-divider="empty-slip"
                                                aria-hidden="true"
                                                className={`right-0 ${LEADERBOARD_VERTICAL_DIVIDER_CLASS_NAME}`}
                                            />
                                            <div
                                                data-leaderboard-column-header="empty-slip"
                                                className={`box-border flex flex-col justify-center gap-0.5 border-b border-sky-200/10 px-2 py-1.5 uppercase tracking-wide text-slate-400 sm:px-3 ${LEADERBOARD_CARD_SIZING.columnHeader}`}
                                                style={{ height: HEADER_H }}
                                            >
                                                <div className="flex min-w-0 items-center justify-between gap-2 leading-tight">
                                                    <span
                                                        className={`allow-caps min-w-0 truncate font-semibold leading-tight text-slate-200 ${LEADERBOARD_CARD_SIZING.slipTitle}`}
                                                    >
                                                        First contest slip
                                                    </span>
                                                    <span className="shrink-0 text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[10px]">
                                                        not open
                                                    </span>
                                                </div>
                                            </div>

                                            {leaderboard.map((member, rowIndex) => {
                                                const isLastRow = rowIndex === leaderboard.length - 1;
                                                const canCreateSlip =
                                                    currentUserId === member.user_id && Boolean(onCreateSlip);
                                                return (
                                                    <div
                                                        key={`empty-${member.user_id}`}
                                                        data-leaderboard-empty-slip-row
                                                        className={`border-white/10 ${LEADERBOARD_CARD_SIZING.slipRow} ${isLastRow ? "border-b-0" : "border-b"
                                                            }`}
                                                        style={{ height: ROW_H }}
                                                    >
                                                        {canCreateSlip ? (
                                                            <button
                                                                type="button"
                                                                onClick={onCreateSlip}
                                                                aria-label="Open first slip"
                                                                aria-haspopup="dialog"
                                                                aria-expanded={createSlipOpen}
                                                                data-leaderboard-empty-pick-slot
                                                                data-leaderboard-empty-pick-action
                                                                className={`group flex h-full w-full flex-col items-start justify-between border border-dashed border-sky-400/40 bg-gradient-to-br from-sky-500/[0.1] via-sky-500/[0.03] to-transparent py-2 text-left text-sky-100 transition hover:border-sky-300/80 hover:from-sky-500/[0.18] ${LEADERBOARD_CARD_SIZING.emptyCard}`}
                                                            >
                                                                <span
                                                                    className={`inline-flex items-center gap-1 font-semibold leading-tight text-sky-50 ${LEADERBOARD_CARD_SIZING.emptyCopy}`}
                                                                >
                                                                    Open first slip
                                                                    <span
                                                                        className="transition-transform group-hover:translate-x-0.5"
                                                                        aria-hidden="true"
                                                                    >
                                                                        →
                                                                    </span>
                                                                </span>
                                                                <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-sky-200/80 md:text-[8px]">
                                                                    <span
                                                                        className="h-1 w-1 animate-pulse rounded-full bg-sky-300"
                                                                        aria-hidden="true"
                                                                    />
                                                                    start rank preview
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <div
                                                                data-leaderboard-empty-pick-slot
                                                                className={`flex h-full w-full flex-col items-start justify-between border border-dashed border-sky-200/15 bg-white/[0.015] py-2 text-slate-500 ${LEADERBOARD_CARD_SIZING.emptyCard}`}
                                                                aria-hidden="true"
                                                            >
                                                                <span
                                                                    className={`font-semibold leading-tight ${LEADERBOARD_CARD_SIZING.emptyCopy}`}
                                                                >
                                                                    Pick slot
                                                                </span>
                                                                <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-600 sm:text-[9px]">
                                                                    waiting for slip
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            <div
                                                data-leaderboard-empty-slip-tally
                                                className="box-border border-t border-white/10 px-2 py-1.5 sm:px-3"
                                                style={{ height: TALLY_H }}
                                                aria-hidden="true"
                                            >
                                                <div className="flex h-full items-center justify-between rounded-lg border border-dashed border-white/10 bg-white/[0.025] px-3 text-slate-500 sm:rounded-xl">
                                                    <span className="text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] lg:text-xs">
                                                        Slip totals
                                                    </span>
                                                    <span className="text-base font-semibold tabular-nums sm:text-lg lg:text-xl">
                                                        {EM_DASH}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                <div
                    className={`border border-white/10 bg-black/50 text-gray-400 ${LEADERBOARD_CARD_SIZING.note}`}
                >
                    Standings count finalized slips only.
                </div>
            )}
                    </div>
                </div>

                {/* Sits on the BACKDROP, not inside the inset content, so its
                    stubs can reach the screen edges the content cannot. */}
                <div
                    data-leaderboard-divider-layer
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20"
                >
                    {dividerExtensions.map((divider) => (
                        <div
                            key={divider.key}
                            data-leaderboard-divider-extension={divider.key}
                            className="absolute inset-x-0 h-px"
                            style={{ top: divider.top }}
                        >
                            <span
                                className={`absolute inset-y-0 left-0 w-5 sm:w-6 ${divider.leftTone}`}
                            />
                            <span
                                className={`absolute inset-y-0 right-0 w-5 sm:w-6 ${divider.rightTone}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
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
