"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { TierInfoModal } from "@/components/leaderboard/TierInfoModal";
import type { Pick } from "@/lib/interfaces/interfaces";
import {
    LOSING_POST_CARD_TONE,
    NEUTRAL_POST_CARD_SURFACE,
    PENDING_POST_CARD_TONE,
    WINNING_POST_CARD_TONE,
} from "@/lib/styles/postCards";
import { formatDateTime } from "@/lib/utils/date";
import { EM_DASH, extractMatchup, extractPickLine } from "@/lib/utils/pickDescription";
import {
    LEAGUE_CAP_TIER,
    getAppliedGlobalXpForPick,
    getBasePointsForPick,
    getCalculatedGlobalXpForPick,
    getGroupTierColor,
    getGroupTierName,
    getPickPoints,
    getTierMetaForPick,
    type TierMeta,
} from "@/lib/utils/scoring";
import { getFeedDesktopSizing } from "./feedDesktopSizing";
import { PickemEntrySelectionCarousel } from "./PickemEntrySelections";
import { TdPsychicEntrySelections } from "./TdPsychicEntrySelections";

export type PickCardAccent = "sky" | "violet";

/**
 * "legacy" reproduces the Global Social / Profile / contest-receipt card exactly
 * as it renders today. "structured" is the MVP's updated scale used by the
 * League and Arena Feed tab: fixed-height metric tiles, a taller primary card,
 * and the `lg:` desktop scale-up.
 */
export type PickCardScale = "legacy" | "structured";

export type PickCardContestStanding =
    | { status: "pending"; rank: null }
    | { status: "live"; rank: number }
    | { status: "final"; rank: number }
    | { status: "unranked"; rank: null };

/** Which builder produced the entry — names the card header in the MVP. */
export type FeedContestEntryFormat = "general_combo" | "sunday_pickem" | "td_psychic";

export type PickCardPresentation =
    | { kind: "ordinary" }
    | { kind: "slip_contest"; contestHref: string; contestName: string }
    | {
        kind: "feed_contest";
        contestHref: string;
        contestName: string;
        contextualPointsLabel: "League Points" | "Arena Points";
        /**
         * Optional here, unlike the MVP: the group Feed's `/picks` read carries
         * no rank, and an entry that has never been ranked is exactly what
         * `standing: undefined` means on this surface.
         */
        standing?: PickCardContestStanding;
        /** Defaults to General Combo when the source cannot say. */
        entryFormat?: FeedContestEntryFormat;
        /**
         * The contest's flat per-correct-pick bonus. Sunday Pick'em only, and
         * only so each selection tile can split its stored total into the odds
         * share and the bonus — the entries read does not carry it, so the
         * surface that already holds the contest row passes it down.
         */
        pickemCorrectBonus?: number | null;
    };

export type PickCardContentProps = {
    pick: Pick;
    collapsed?: boolean;
    /** Replaces Global XP with League/Arena point terminology. */
    contextualPointsLabel?: string;
    accent?: PickCardAccent;
    scale?: PickCardScale;
    /** Global Social says `posted at`; profile receipts historically omit it. */
    includePostedAtPrefix?: boolean;
    presentation?: PickCardPresentation;
};

const PLACEHOLDER = EM_DASH;
const META_SEPARATOR = " · ";
const FIXED_METRIC_SIZE =
    "h-[72px] min-h-[72px] max-h-[72px] sm:h-[78px] sm:min-h-[78px] sm:max-h-[78px] sm:flex-none";

const accentTone = {
    sky: {
        highConfidence: "text-sky-100",
        pendingDot: "bg-sky-300/80",
        pendingText: "text-sky-200",
    },
    violet: {
        highConfidence: "text-violet-100",
        pendingDot: "bg-violet-300/80",
        pendingText: "text-violet-200",
    },
} as const;

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

const getTierCardStyle = (color?: string): CSSProperties | undefined => {
    const hex = getHexFromGradient(color);
    if (!hex) return undefined;
    return {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(
            hex,
            "55"
        )}, ${withAlpha(hex, "22")}, rgba(0,0,0,0))`,
    };
};

const formatOddsBoundary = (odds: number | null) => {
    if (odds === null || !Number.isFinite(odds)) return null;
    return odds > 0 ? `+${odds}` : `${odds}`;
};

const getGroupTierRangeLabel = (tierMeta: TierMeta) => {
    if (tierMeta.tier === 1) {
        const max = formatOddsBoundary(tierMeta.maxOdds);
        return max ? `${max} or less` : tierMeta.label;
    }
    if (tierMeta.tier === LEAGUE_CAP_TIER) {
        const min = formatOddsBoundary(tierMeta.minOdds);
        return min ? `${min} or greater` : tierMeta.label;
    }
    return tierMeta.label;
};

const formatSignedPoints = (points: number, label: string) =>
    `${points > 0 ? "+" : ""}${points.toLocaleString()} ${label}`;

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

/**
 * The contest an entry belongs to, NAMED in the link — the MVP's current header:
 * "Fantasy Contest Entry - April NBA Playoffs ↗". It replaced the bare
 * "Slip Contest Entry" / "Feed Contest Entry" labels, which said nothing useful
 * in a feed that mixes contests.
 *
 * `items-start` + a wrapping label, not `items-center` on one line: a contest
 * name is arbitrary length and the arrow has to stay pinned to the first line.
 */
const ContestEntryHeader = ({
    presentation,
    className = "",
}: {
    presentation: Exclude<PickCardPresentation, { kind: "ordinary" }>;
    className?: string;
}) => {
    const entryFormat =
        presentation.kind === "feed_contest" ? presentation.entryFormat : undefined;
    const label =
        presentation.kind === "slip_contest"
            ? `Fantasy Contest Entry - ${presentation.contestName}`
            : entryFormat === "sunday_pickem"
                ? `Feed Contest Pick’em Entry - ${presentation.contestName}`
                : entryFormat === "td_psychic"
                    ? `Feed Contest TD Psychic Entry - ${presentation.contestName}`
                    : `Feed Contest General Combo Entry - ${presentation.contestName}`;

    return (
        <Link
            data-feed-contest-entry-link
            data-feed-entry-format={entryFormat}
            href={presentation.contestHref}
            className={`inline-flex min-h-6 min-w-0 items-start gap-1 text-left font-semibold uppercase tracking-wide text-slate-300 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`.trim()}
        >
            <span className="min-w-0 break-words">{label}</span>
            <span aria-hidden="true" className="shrink-0">↗</span>
        </Link>
    );
};

export const getPickCardOddsCopy = (pick: Pick) => pick.odds_bracket ?? PLACEHOLDER;

/**
 * Canonical visual body for Global Social, profiles, structured Feed records and
 * contest combo receipts. The interaction shell (author row, reactions, action
 * menu, collapse toggle) deliberately stays with its owning surface.
 */
export const PickCardContent = ({
    pick,
    collapsed = false,
    contextualPointsLabel,
    accent = "sky",
    scale = "legacy",
    includePostedAtPrefix = true,
    presentation = { kind: "ordinary" },
}: PickCardContentProps) => {
    const [tierInfoOpen, setTierInfoOpen] = useState(false);
    const tone = accentTone[accent];
    const isStructured = scale === "structured";
    const sizing = getFeedDesktopSizing(isStructured);
    const isSlipContest = presentation.kind === "slip_contest";
    const isFeedContest = presentation.kind === "feed_contest";
    const effectiveContextualPointsLabel = isFeedContest
        ? presentation.contextualPointsLabel
        : contextualPointsLabel;
    const tierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode: "global",
    });
    const groupTierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode: "leagueLeaderboard",
    });
    const hasContextualAward =
        Boolean(effectiveContextualPointsLabel) && typeof pick.awardedPoints === "number";
    const isPendingResult = (pick.result ?? "pending") === "pending" && !hasContextualAward;
    const calculatedGlobalXp = getCalculatedGlobalXpForPick(pick);
    const displayedGlobalXp = isPendingResult
        ? calculatedGlobalXp
        : getAppliedGlobalXpForPick(pick);
    const contextualPoints = isPendingResult
        ? pick.points
        : pick.awardedPoints ?? (pick.result === "win" ? pick.points : 0);
    const pointsHelperLabel = effectiveContextualPointsLabel
        ? isPendingResult
            ? `Potential ${effectiveContextualPointsLabel}`
            : effectiveContextualPointsLabel
        : isPendingResult
            ? "Potential XP"
            : "XP";
    const pointsPrimary = effectiveContextualPointsLabel
        ? typeof contextualPoints === "number"
            ? formatSignedPoints(contextualPoints, effectiveContextualPointsLabel)
            : PLACEHOLDER
        : tierMeta
            ? `${displayedGlobalXp > 0 ? "+" : ""}${displayedGlobalXp.toLocaleString()} XP`
            : PLACEHOLDER;
    const tierCardStyle = tierMeta?.color ? getTierCardStyle(tierMeta.color) : undefined;
    const tierCardTone = tierCardStyle
        ? "bg-transparent"
        : tierMeta?.color
            ? `bg-gradient-to-br ${tierMeta.color}`
            : "bg-white/[0.04]";
    const groupTierColor = groupTierMeta
        ? getGroupTierColor(groupTierMeta.tier, groupTierMeta.color)
        : undefined;
    const groupTierCardStyle = getTierCardStyle(groupTierColor);
    const groupTierName = groupTierMeta
        ? getGroupTierName(groupTierMeta.tier, groupTierMeta.name)
        : PLACEHOLDER;
    const groupTierRange = groupTierMeta ? getGroupTierRangeLabel(groupTierMeta) : null;
    const slipResult = pick.result ?? "pending";
    const slipIsPending = slipResult === "pending";
    const slipPoints = slipIsPending
        ? getBasePointsForPick(pick, "leagueLeaderboard")
        : getPickPoints(pick, "leagueLeaderboard");
    const slipResultLabel =
        slipResult === "win"
            ? "Win"
            : slipResult === "loss"
                ? "Loss"
                : slipResult === "void"
                    ? "Void"
                    : slipResult === "not_found"
                        ? "N/A"
                        : "Pending";
    const slipResultTone =
        slipResult === "win"
            ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40 text-emerald-100"
            : slipResult === "loss"
                ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 text-rose-100"
                : slipResult === "void" || slipResult === "not_found"
                    ? "border-amber-400/30 bg-amber-500/15 text-amber-50"
                    : `${NEUTRAL_POST_CARD_SURFACE} text-slate-100`;
    const feedContestPointsTone =
        pick.result === "win"
            ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40"
            : pick.result === "loss"
                ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40"
                : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE}`;
    // Absent on the group Feed, where the picks read carries no rank — an entry
    // with no standing yet reads "Pending", the same as one awaiting its first
    // grade.
    const contestStanding = isFeedContest ? presentation.standing : undefined;
    const standingCopy = isFeedContest
        ? contestStanding?.status === "live" || contestStanding?.status === "final"
            ? `#${contestStanding.rank}`
            : contestStanding?.status === "unranked"
                ? "Unranked"
                : "Pending"
        : null;
    const standingHelper =
        contestStanding?.status === "live"
            ? "Live"
            : contestStanding?.status === "final"
                ? "Final"
                : null;
    const confidenceLabel = pick.confidence ? pick.confidence.toLowerCase() : null;
    const confidenceTone =
        confidenceLabel === "high"
            ? tone.highConfidence
            : confidenceLabel === "medium"
                ? "text-amber-100"
                : confidenceLabel === "low"
                    ? "text-rose-100"
                    : "text-slate-500";
    const comboLabel = pick.is_combo
        ? `combo${pick.legs?.length ? ` · ${pick.legs.length} legs` : ""}`
        : null;
    const displayPick = pick.description ?? "No pick was submitted";
    const pickLine = extractPickLine(displayPick);
    const matchupCopy =
        pick.matchup ?? extractMatchup(displayPick, pick.selection?.matchup) ?? PLACEHOLDER;
    const gameTimeCopy = formatDateTime(pick.selection?.gameStartTime);
    const showMatchup = matchupCopy !== PLACEHOLDER;
    const showGameTime = gameTimeCopy !== PLACEHOLDER;
    const oddsCopy = getPickCardOddsCopy(pick);
    const legsCount = pick.legs?.length ?? 0;
    const legsCopy = legsCount > 0 ? `${legsCount} picks` : pick.is_combo ? "combo" : null;
    const timestamp = formatDateTime(pick.created_at ?? pick.updated_at);
    const postedTime = includePostedAtPrefix ? `posted at: ${timestamp}` : timestamp;
    const postedLine = `${legsCopy ? `${legsCopy} · ` : ""}${postedTime}`;
    const baseSourceTabLabel =
        pick.source_tab ?? (pick.is_combo || pick.legs?.length ? "Combo" : "Pick");
    const normalizedSourceTabLabel = baseSourceTabLabel.toLowerCase();
    const showComboLegs = Boolean(pick.is_combo && pick.legs && pick.legs.length > 0);
    /*
     * A Pick'em card is stored as `is_combo` too — it is one pick row with many
     * legs — but it must NOT render as a combo. Its selections score
     * independently and are summed, so they get the MVP's paged team tiles
     * instead of the parlay leg list.
     */
    const isSundayPickemEntry =
        presentation.kind === "feed_contest" && presentation.entryFormat === "sunday_pickem";
    const showPickemSelections = isSundayPickemEntry && showComboLegs;
    /*
     * A TD Psychic card is stored as `is_combo` too, and must not render as one
     * either — but for a different reason than a Pick'em card. A card sums its
     * selections; a TD card is all-or-nothing for POINTS yet still RANKS on how
     * many it got right, so a losing one is neither a dead parlay nor a sum of
     * parts. What it has to show is which three players, and which of them
     * scored: the same ordered row of three squares every other TD surface uses.
     */
    const isTdPsychicEntry =
        presentation.kind === "feed_contest" && presentation.entryFormat === "td_psychic";
    const showTdPsychicSelections = isTdPsychicEntry && showComboLegs;
    const singleCategoryLabel =
        normalizedSourceTabLabel === "pick"
            ? resolveLegCategoryLabel(pick.selection?.market) ?? normalizedSourceTabLabel
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
    const isWinningPost = pick.result === "win";
    const isLosingPost = pick.result === "loss";
    const pickAccentDotTone = isWinningPost
        ? "bg-emerald-300/80"
        : isLosingPost
            ? "bg-rose-300/80"
            : tone.pendingDot;
    const pickAccentTextTone = isWinningPost
        ? "text-emerald-200"
        : isLosingPost
            ? "text-rose-200"
            : tone.pendingText;
    const sportLabel = pick.sport?.toString().toUpperCase() || "SPORT";
    // The single-pick odds read cyan on the legacy card; the updated Feed card
    // levels every odds readout (single, combo header, leg) to slate.
    const singleOddsTone = isStructured ? "text-slate-100" : "text-cyan-200";

    if (collapsed) {
        return (
            <div className={`px-5 sm:px-6 ${sizing.content}`.trimEnd()}>
                <div
                    className={`flex text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] ${isStructured ? "items-center justify-between gap-3" : "justify-end"
                        } ${sizing.footer}`.trimEnd()}
                >
                    {isStructured ? (
                        presentation.kind !== "ordinary" ? (
                            <ContestEntryHeader
                                presentation={presentation}
                                className="text-[10px] tracking-wide"
                            />
                        ) : (
                            <span />
                        )
                    ) : null}
                    <span className={isStructured ? "text-right" : undefined}>
                        {sportLabel + " · " + postedLine}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            data-feed-post-content
            className={`space-y-3 px-5 sm:px-6 ${sizing.content}`.trimEnd()}
        >
            <div
                data-feed-post-layout
                className={`flex flex-col gap-2 sm:flex-row ${isStructured
                    ? "sm:items-start"
                    : showComboLegs
                        ? "sm:items-start"
                        : "sm:items-stretch"
                    } ${sizing.contentRow}`.trimEnd()}
            >
                <div
                    data-feed-post-metrics
                    className={`order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:flex-col ${isStructured
                        ? "sm:self-start"
                        : `h-full sm:h-[140px] ${showComboLegs ? "sm:self-start" : "sm:self-stretch"}`
                        } ${sizing.metrics}`.trimEnd()}
                >
                    {isSlipContest ? (
                        <div
                            data-feed-post-metric="scoring-tier"
                            className={`relative w-full flex-1 overflow-hidden rounded-xl border border-white/10 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${sizing.metricCard} ${sizing.pointsCard} ${groupTierCardStyle ? "bg-transparent" : "bg-white/[0.04]"
                                }`}
                            style={groupTierCardStyle}
                        >
                            <div className="flex h-full min-h-[inherit] items-center justify-between gap-3 p-3 lg:p-0">
                                <div className="min-w-0 flex-1">
                                    <span
                                        className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-300 ${sizing.metricLabel}`}
                                    >
                                        Scoring Tier
                                    </span>
                                    <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span
                                            className={`block text-xs font-semibold leading-tight text-white sm:text-sm ${sizing.compactMetricValue}`}
                                        >
                                            {groupTierName}
                                        </span>
                                        {groupTierRange ? (
                                            <span className="block text-[9px] leading-tight text-white/65 sm:text-[10px]">
                                                {groupTierRange}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTierInfoOpen(true)}
                                    aria-label="About scoring tiers"
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/25 text-[10px] font-bold normal-case text-white/80 transition hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                >
                                    i
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            data-feed-post-metric="points"
                            data-feed-contest-result={isFeedContest ? pick.result : undefined}
                            className={`w-full flex-1 rounded-xl border p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${isStructured
                                ? FIXED_METRIC_SIZE
                                : `h-full sm:max-h-[65px] ${showComboLegs ? "sm:flex-none" : ""}`
                                } ${sizing.metricCard} ${sizing.pointsCard} ${isFeedContest ? feedContestPointsTone : `border-white/10 ${tierCardTone}`
                                }`}
                            style={isFeedContest ? undefined : tierCardStyle}
                        >
                            <span
                                className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.metricLabel}`}
                            >
                                {pointsHelperLabel}
                            </span>
                            <span
                                className={`mt-1 block text-xs font-semibold text-white ${sizing.metricValue}`}
                            >
                                {pointsPrimary}
                            </span>
                        </div>
                    )}

                    {isSlipContest ? (
                        <div
                            data-feed-post-metric="result"
                            className={`w-full flex-1 rounded-xl border p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${sizing.metricCard} ${sizing.confidenceCard} ${slipResultTone}`}
                        >
                            <span
                                className={`block text-[9px] font-semibold uppercase tracking-wide opacity-75 ${sizing.metricLabel}`}
                            >
                                {slipResultLabel}
                            </span>
                            <span
                                className={`mt-1 block text-[11px] font-semibold sm:text-xs ${sizing.compactMetricValue}`}
                            >
                                {formatSignedPoints(slipPoints, "Slip Points")}
                            </span>
                            {slipIsPending ? (
                                <span className="mt-0.5 block text-[8px] text-white/65 sm:text-[9px] lg:text-[10px]">
                                    Potential
                                </span>
                            ) : null}
                        </div>
                    ) : isFeedContest ? (
                        <div
                            data-feed-post-metric="standing"
                            className={`w-full flex-1 rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${NEUTRAL_POST_CARD_SURFACE} ${sizing.metricCard} ${sizing.confidenceCard}`}
                        >
                            <span
                                className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.metricLabel}`}
                            >
                                Contest Standing
                            </span>
                            <span
                                className={`mt-1 block text-xs font-semibold text-white ${sizing.metricValue}`}
                            >
                                {standingCopy}
                            </span>
                            {standingHelper ? (
                                <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px] lg:text-[10px]">
                                    {standingHelper}
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <div
                            data-feed-post-metric="confidence"
                            className={`w-full flex-1 rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${isStructured ? FIXED_METRIC_SIZE : showComboLegs ? "sm:flex-none" : ""
                                } ${NEUTRAL_POST_CARD_SURFACE} ${sizing.metricCard} ${sizing.confidenceCard}`}
                        >
                            <span
                                className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.metricLabel}`}
                            >
                                confidence
                            </span>
                            <span
                                className={`mt-1 block text-xs font-semibold ${confidenceTone} ${sizing.metricValue}`}
                            >
                                {confidenceLabel ?? PLACEHOLDER}
                            </span>
                        </div>
                    )}
                </div>

                <div
                    data-feed-post-primary
                    className={`relative order-1 flex-1 overflow-hidden rounded-xl border p-3 sm:order-2 ${isStructured ? "min-h-[148px] sm:min-h-[164px]" : ""
                        } ${sizing.primaryCard} ${isWinningPost
                            ? `${WINNING_POST_CARD_TONE} ${NEUTRAL_POST_CARD_SURFACE}`
                            : isLosingPost
                                ? `${LOSING_POST_CARD_TONE} ${NEUTRAL_POST_CARD_SURFACE}`
                                : isPendingResult
                                    ? PENDING_POST_CARD_TONE
                                    : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE} shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]`
                        }`}
                >
                    {isWinningPost && <WinningHeaderArt />}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            {presentation.kind === "ordinary" ? (
                                <span
                                    className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.primaryEyebrow}`}
                                >
                                    {postHeaderLabel}
                                </span>
                            ) : (
                                <ContestEntryHeader
                                    presentation={presentation}
                                    className={`text-[10px] ${sizing.primaryEyebrow}`}
                                />
                            )}
                            {!showComboLegs && (
                                <>
                                    <div className="mt-3 h-px w-full bg-white/10" />
                                    <div
                                        className={`mt-3 flex min-w-0 justify-between gap-3 ${isStructured ? "items-start" : "items-center"
                                            } ${sizing.selectionRow}`.trimEnd()}
                                    >
                                        <div
                                            className={`min-w-0 flex flex-1 gap-2 ${isStructured ? "items-start" : "items-center"
                                                } ${sizing.selectionLead}`.trimEnd()}
                                        >
                                            <span
                                                className={`mt-2 h-1.5 w-1.5 rounded-full ${pickAccentDotTone} ${sizing.selectionDot}`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                {detailCategoryLabel && (
                                                    <span
                                                        className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.categoryLabel}`}
                                                    >
                                                        {detailCategoryLabel}
                                                    </span>
                                                )}
                                                <p
                                                    className={`mt-1 min-w-0 text-[12px] font-semibold leading-snug ${pickAccentTextTone} ${sizing.pickCopy}`}
                                                    title={displayPick}
                                                >
                                                    {pickLine}
                                                </p>
                                                {metaLabel && (
                                                    <p
                                                        className={`mt-1 truncate text-[10px] text-slate-400 ${sizing.metadata}`}
                                                    >
                                                        {metaLabel}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            data-feed-post-odds
                                            className={`flex flex-col items-end gap-1 ${isStructured ? "shrink-0" : "pt-2"
                                                }`}
                                        >
                                            <span
                                                className={`text-[11px] font-semibold ${singleOddsTone} ${sizing.odds}`}
                                            >
                                                {oddsCopy}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {showComboLegs && (
                            <div data-feed-post-odds className="flex shrink-0 flex-col items-end">
                                <span
                                    className={`text-[12px] font-semibold text-slate-100 ${sizing.odds}`}
                                >
                                    {oddsCopy}
                                </span>
                            </div>
                        )}
                    </div>
                    {showComboLegs && <div className="mt-3 h-px w-full bg-white/10" />}
                    {showTdPsychicSelections ? (
                        <TdPsychicEntrySelections pick={pick} />
                    ) : showPickemSelections ? (
                        <PickemEntrySelectionCarousel
                            pick={pick}
                            correctBonus={
                                presentation.kind === "feed_contest"
                                    ? presentation.pickemCorrectBonus
                                    : null
                            }
                        />
                    ) : showComboLegs ? (
                        <ul className={`mt-3 space-y-2 ${sizing.comboList}`}>
                            {pick.legs?.map((leg, index) => {
                                const legPickLine = extractPickLine(leg.description);
                                const legMatchup =
                                    extractMatchup(leg.description, leg.selection?.matchup) ??
                                    leg.matchup;
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
                                                className={`mt-2 h-1.5 w-1.5 rounded-full ${pickAccentDotTone} ${sizing.selectionDot}`}
                                            />
                                            <div className="min-w-0">
                                                {legCategory && (
                                                    <span
                                                        className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-400 ${sizing.categoryLabel}`}
                                                    >
                                                        {legCategory}
                                                    </span>
                                                )}
                                                <p
                                                    className={`min-w-0 text-[12px] font-semibold leading-snug ${pickAccentTextTone} ${sizing.pickCopy}`}
                                                >
                                                    {legPickLine}
                                                </p>
                                                {legMeta && (
                                                    <p
                                                        className={`mt-1 text-[10px] text-slate-400 ${sizing.metadata}`}
                                                    >
                                                        {legMeta}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 pt-2">
                                            <span
                                                className={`text-[11px] font-semibold text-slate-100 ${sizing.odds}`}
                                            >
                                                {leg.odds_bracket ?? PLACEHOLDER}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
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
                <div
                    className={`text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] ${sizing.footer}`}
                >
                    {sportLabel + " · " + postedLine}
                </div>
            </div>
            {isSlipContest ? (
                <TierInfoModal open={tierInfoOpen} onClose={() => setTierInfoOpen(false)} />
            ) : null}
        </div>
    );
};

export default PickCardContent;
