import type { CSSProperties } from "react";
import type { Pick, PickLeg } from "@/lib/interfaces/interfaces";
import {
    AWARDED_POINTS_CARD_TONE,
    CONTEST_POST_HEADER_TONES,
    CONTEST_POST_PRIMARY_TONES,
    CONTEST_STANDING_PODIUM_TONES,
    NEUTRAL_POST_CARD_SURFACE,
    ORDINARY_POST_HEADER_TONES,
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
import type {
    FeedContestEntryFormat,
    PickCardAccent,
    PickCardPresentation,
    PickCardVariant,
    SelectionVisualState,
} from "./types";

/* ----------------------------------------------------------------------------
 * EVERY derived value a Pick Card renders, computed once, in one place.
 *
 * The five card components differ only in how they draw their SELECTIONS; the
 * points tile, the rank tile, the header band, the footer line and the tones
 * are identical across all of them. Deriving those here is what stops the
 * variants drifting the way the four hand-rolled card bodies in this repo did:
 * a change to how a losing combo colours its legs, or to what "Potential" means,
 * lands once rather than five times.
 *
 * Pure — no hooks, no JSX — so a surface can also call it just to ask a
 * question (`buildPickCardModel(pick, presentation).variant`).
 * -------------------------------------------------------------------------- */

export const PLACEHOLDER = EM_DASH;
export const META_SEPARATOR = " · ";

/**
 * The fixed metric-tile footprint. Both tiles are pinned to the same height at
 * every breakpoint so the rail cannot jump when one of them wraps to two lines.
 */
export const FIXED_METRIC_SIZE =
    "h-[72px] min-h-[72px] max-h-[72px] sm:h-[78px] sm:min-h-[78px] sm:max-h-[78px] sm:flex-none";

const accentTone = {
    sky: { highConfidence: "text-sky-100" },
    violet: { highConfidence: "text-violet-100" },
} as const;

const withAlpha = (hex: string, alphaHex: string) =>
    hex.startsWith("#") && hex.length === 7 ? `${hex}${alphaHex}` : hex;

const getHexFromGradient = (color?: string) => {
    if (!color) return undefined;
    const match = color.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1]}` : undefined;
};

export const getTierCardStyle = (color?: string): CSSProperties | undefined => {
    const hex = getHexFromGradient(color);
    if (!hex) return undefined;
    return {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(hex, "55")}, ${withAlpha(
            hex,
            "22"
        )}, rgba(0,0,0,0))`,
    };
};

export const formatOddsBoundary = (odds: number | null | undefined) => {
    if (odds === null || odds === undefined || !Number.isFinite(odds)) return null;
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

/** The card-level price a feed row shows beside a collapsed post. */
export const getPickCardOddsCopy = (pick: Pick) => pick.odds_bracket ?? PLACEHOLDER;

export const formatSignedPoints = (points: number, label: string) =>
    `${points > 0 ? "+" : ""}${points.toLocaleString()} ${label}`;

export const resolveLegCategoryLabel = (market?: string) => {
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

export const getSelectionVisualState = (
    result: Pick["result"] | null | undefined
): SelectionVisualState => {
    if (result === "win") return "win";
    if (result === "loss") return "loss";
    if (result === "void" || result === "not_found") return "neutral";
    return "pending";
};

/**
 * A LEG's own grade, falling back to what the card's grade actually proves.
 *
 * A winning combo proves every leg won, so an ungraded leg inside one is a win.
 * A LOSING combo proves only that at least one leg lost — painting all of them
 * red states something the data does not say, and is the single most visible
 * way the current card misreports a settled parlay.
 */
export const getComboLegVisualState = (
    leg: PickLeg,
    aggregateResult: Pick["result"] | null | undefined
): SelectionVisualState => {
    if (leg.result !== undefined && leg.result !== null) {
        return getSelectionVisualState(leg.result);
    }
    if (aggregateResult === "win") return "win";
    if (!aggregateResult || aggregateResult === "pending") return "pending";
    return "neutral";
};

export const getSelectionVisualTone = (state: SelectionVisualState) => {
    if (state === "win") return { text: "text-emerald-200", dot: "bg-emerald-300/80" };
    if (state === "loss") return { text: "text-rose-200", dot: "bg-rose-300/80" };
    if (state === "neutral") return { text: "text-slate-300", dot: "bg-slate-400/70" };
    return { text: "text-white", dot: "bg-slate-400/70" };
};

export type PickCardModel = ReturnType<typeof buildPickCardModel>;

export const buildPickCardModel = ({
    pick,
    presentation = { kind: "ordinary" },
    contextualPointsLabel,
    accent = "sky",
    includePostedAtPrefix = true,
}: {
    pick: Pick;
    presentation?: PickCardPresentation;
    contextualPointsLabel?: string;
    accent?: PickCardAccent;
    includePostedAtPrefix?: boolean;
}) => {
    const tone = accentTone[accent];
    const isSlipContest = presentation.kind === "slip_contest";
    const isFeedContest = presentation.kind === "feed_contest";
    const isContestEntry = isSlipContest || isFeedContest;
    const entryFormat: FeedContestEntryFormat | undefined = isFeedContest
        ? presentation.entryFormat ?? "general_combo"
        : undefined;
    const isSundayPickemEntry = entryFormat === "sunday_pickem";
    const isTdPsychicEntry = entryFormat === "td_psychic";

    const legs = pick.legs ?? [];
    const legsCount = legs.length;
    /*
     * A Pick'em card and a TD card are BOTH stored as `is_combo` — one pick row
     * with many legs — and neither may render as a parlay. A Pick'em card scores
     * each selection independently and sums them; a TD card is all-or-nothing
     * for points yet still ranks on how many hit. Only a real combo gets the
     * leg list.
     */
    const showComboLegs = legsCount > 0;
    const isTallyEntry = isSundayPickemEntry || isTdPsychicEntry;

    const variant: PickCardVariant = isSundayPickemEntry
        ? "sunday_pickem"
        : isTdPsychicEntry
            ? "td_psychic"
            : isFeedContest
                ? "general_combo"
                : isSlipContest
                    ? "slip_contest"
                    : showComboLegs
                        ? "ordinary_combo"
                        : "single";

    /* ---------------------------------------------------------------- POINTS */
    const effectiveContextualPointsLabel = isFeedContest
        ? presentation.contextualPointsLabel
        : contextualPointsLabel;
    const hasContextualAward =
        Boolean(effectiveContextualPointsLabel) && typeof pick.awardedPoints === "number";
    const isPendingResult = (pick.result ?? "pending") === "pending" && !hasContextualAward;
    const calculatedGlobalXp = getCalculatedGlobalXpForPick(pick);
    const displayedGlobalXp = isPendingResult
        ? calculatedGlobalXp
        : getAppliedGlobalXpForPick(pick);
    const contextualPoints = isPendingResult
        ? pick.points
        : pick.points ?? (pick.result === "win" ? pick.points : 0);
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
        : `${displayedGlobalXp > 0 ? "+" : ""}${displayedGlobalXp.toLocaleString()} XP`;
    const xpState = isPendingResult ? "potential" : displayedGlobalXp > 0 ? "awarded" : "zero";
    const contextualPointsState = isPendingResult
        ? "potential"
        : typeof contextualPoints === "number" && contextualPoints > 0
            ? "awarded"
            : "zero";
    const pointsAwardState = effectiveContextualPointsLabel ? contextualPointsState : xpState;
    /*
     * League Points are deliberately NOT highlighted: a League member earns them
     * on nearly every settled entry, so an emerald tile there would read as
     * decoration. XP and Arena Points are the scarce ones.
     */
    const hasHighlightedPointsAward =
        pointsAwardState === "awarded" &&
        (!effectiveContextualPointsLabel || effectiveContextualPointsLabel === "Arena Points");
    const xpValueTone =
        xpState === "awarded"
            ? "text-emerald-300"
            : xpState === "zero"
                ? "text-slate-400"
                : "text-white";
    const pointsCardTone = hasHighlightedPointsAward
        ? AWARDED_POINTS_CARD_TONE
        : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE}`;
    const pointsKind =
        effectiveContextualPointsLabel === "Arena Points"
            ? "arena"
            : effectiveContextualPointsLabel === "League Points"
                ? "league"
                : "xp";

    /* ------------------------------------------------- FANTASY (SLIP) TILES */
    const groupTierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode: "leagueLeaderboard",
    });
    const groupTierColor = groupTierMeta
        ? getGroupTierColor(groupTierMeta.tier, groupTierMeta.color)
        : undefined;
    const fantasyTierCardStyle = getTierCardStyle(groupTierColor);
    const fantasyTierName = groupTierMeta
        ? getGroupTierName(groupTierMeta.tier, groupTierMeta.name)
        : PLACEHOLDER;
    const fantasyTierRange = groupTierMeta ? getGroupTierRangeLabel(groupTierMeta) : null;
    const slipResult = pick.result ?? "pending";
    const slipIsPending = slipResult === "pending";
    const fantasyPoints = slipIsPending
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

    /* --------------------------------------------------------------- RANK */
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
    const standingRank =
        contestStanding?.status === "live" || contestStanding?.status === "final"
            ? contestStanding.rank
            : null;
    const standingPodiumTone =
        isFeedContest && presentation.placementEligible === false
            ? null
            : standingRank === 1
                ? ("gold" as const)
                : standingRank === 2
                    ? ("silver" as const)
                    : standingRank === 3
                        ? ("bronze" as const)
                        : null;
    const standingCardTone = standingPodiumTone
        ? CONTEST_STANDING_PODIUM_TONES[standingPodiumTone]
        : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE}`;
    const standingValueTone =
        standingPodiumTone === "gold"
            ? "text-[#faab00]"
            : standingPodiumTone === "silver"
                ? "text-slate-100 drop-shadow-[0_0_5px_rgba(226,232,240,0.42)]"
                : standingPodiumTone === "bronze"
                    ? "text-orange-100 drop-shadow-[0_0_5px_rgba(251,146,60,0.42)]"
                    : "text-white";

    /* ---------------------------------------------------------- CONFIDENCE */
    const confidenceLabel = pick.confidence ? pick.confidence.toLowerCase() : null;
    const confidenceTone =
        confidenceLabel === "high"
            ? tone.highConfidence
            : confidenceLabel === "medium"
                ? "text-amber-100"
                : confidenceLabel === "low"
                    ? "text-rose-100"
                    : "text-slate-500";

    /* --------------------------------------------------------------- COPY */
    const displayPick = pick.description ?? "No pick was submitted";
    const pickLine = extractPickLine(displayPick);
    const matchupCopy =
        pick.matchup ?? extractMatchup(displayPick, pick.selection?.matchup) ?? PLACEHOLDER;
    const gameTimeCopy = formatDateTime(pick.selection?.gameStartTime);
    const metaLabel = [
        matchupCopy !== PLACEHOLDER ? matchupCopy : null,
        gameTimeCopy !== PLACEHOLDER ? gameTimeCopy : null,
    ]
        .filter(Boolean)
        .join(META_SEPARATOR);
    const oddsCopy = pick.odds_bracket ?? PLACEHOLDER;
    const legsCopy = legsCount > 0 ? `${legsCount} picks` : null;
    const timestamp = formatDateTime(pick.created_at ?? pick.updated_at);
    const postedTime = includePostedAtPrefix ? `posted at: ${timestamp}` : timestamp;
    const postedLine = `${legsCopy ? `${legsCopy} · ` : ""}${postedTime}`;
    /*
     * A tally card's footer drops the "N picks" count: the header already shows
     * `2/5`, and a line reading "5 picks · 2/5" says the same thing twice.
     */
    const footerLine = `${pick.sport?.toString().toUpperCase() || "SPORT"} · ${isTallyEntry ? postedTime : postedLine
        }`;
    const baseSourceTabLabel = pick.source_tab ?? (showComboLegs ? "Combo" : "Pick");
    const normalizedSourceTabLabel = baseSourceTabLabel.toLowerCase();
    const singleCategoryLabel =
        normalizedSourceTabLabel === "pick"
            ? resolveLegCategoryLabel(pick.selection?.market) ?? normalizedSourceTabLabel
            : normalizedSourceTabLabel;
    const postHeaderLabel = showComboLegs ? "combo pick post" : "single pick post";
    const detailCategoryLabel = showComboLegs ? null : singleCategoryLabel;

    /* -------------------------------------------------------------- TALLY */
    /*
     * Derived from the legs rather than passed in, so the Feed tab and the
     * Entries tab cannot disagree about the same entry — the Feed's `/picks`
     * read has no tally field to pass.
     *
     * Shown from the moment the card exists, ungraded ones included, which is
     * what the MVP does (`entryTally` is gated on `detailsVisible` alone). An
     * ungraded card reads "0/3" — a SCORE, not a claim about games that have not
     * been played, and the same figure the header keeps for the rest of the run.
     * Withholding it until the first grade meant the header silently gained a
     * number partway through the slate, and the collapsed row had nothing at all
     * to show for a card that was already submitted.
     */
    const correctLegCount = legs.filter((leg) => leg.result === "win").length;
    const entryTally =
        isTallyEntry && legsCount > 0
            ? { correctCount: correctLegCount, selectionCount: legsCount }
            : null;
    const entryTallyCopy = entryTally
        ? `${entryTally.correctCount}/${entryTally.selectionCount}`
        : null;
    const entryTallyAriaLabel = entryTally
        ? `${entryTally.correctCount} correct out of ${entryTally.selectionCount}`
        : undefined;

    /* -------------------------------------------------------------- TONES */
    /*
     * A tally card's header band stays NEUTRAL whatever the aggregate result
     * says. A 4-of-5 Pick'em card is stored `loss` because it is not a perfect
     * card, and a red band over four correct picks is simply wrong.
     */
    const headerResultState = isTallyEntry
        ? ("neutral" as const)
        : pick.result === "win"
            ? ("win" as const)
            : pick.result === "loss"
                ? ("loss" as const)
                : ("neutral" as const);
    const primaryHeaderTone = isContestEntry
        ? CONTEST_POST_HEADER_TONES[accent]
        : ORDINARY_POST_HEADER_TONES[headerResultState];
    const primaryCardTone = isContestEntry
        ? CONTEST_POST_PRIMARY_TONES[accent]
        : `border-white/10 ${NEUTRAL_POST_CARD_SURFACE} shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]`;
    const singleSelectionTone = getSelectionVisualTone(getSelectionVisualState(pick.result));
    const singleSelectionState = getSelectionVisualState(pick.result);

    return {
        variant,
        accent,
        presentation,
        entryFormat,
        result: pick.result ?? "pending",
        isSlipContest,
        isFeedContest,
        isContestEntry,
        isSundayPickemEntry,
        isTdPsychicEntry,
        isTallyEntry,
        showComboLegs,
        legs,
        legsCount,

        effectiveContextualPointsLabel,
        isPendingResult,
        pointsHelperLabel,
        pointsPrimary,
        pointsCardTone,
        pointsAwardState,
        pointsKind,
        hasHighlightedPointsAward,
        xpState,
        xpValueTone,

        fantasyTierCardStyle,
        fantasyTierName,
        fantasyTierRange,
        slipResult,
        slipIsPending,
        slipResultLabel,
        fantasyPoints,

        standingCopy,
        standingHelper,
        standingCardTone,
        standingValueTone,
        standingPodiumTone,

        confidenceLabel,
        confidenceTone,

        displayPick,
        pickLine,
        metaLabel,
        oddsCopy,
        postedLine,
        postedTime,
        footerLine,
        postHeaderLabel,
        detailCategoryLabel,

        entryTally,
        entryTallyCopy,
        entryTallyAriaLabel,

        headerResultState,
        primaryHeaderTone,
        primaryCardTone,
        singleSelectionState,
        singleSelectionTone,
    };
};
