export type SlipEntityType = "player" | "team" | "game" | "combo";

export type SlipTimeScope =
    | "full_game"
    | "first_half"
    | "second_half"
    | "first_quarter"
    | "second_quarter"
    | "third_quarter"
    | "fourth_quarter"
    | "first_period"
    | "second_period"
    | "third_period"
    | "first_inning"
    | "second_inning"
    | "third_inning"
    | "fourth_inning"
    | "fifth_inning"
    | "sixth_inning"
    | "seventh_inning"
    | "eighth_inning"
    | "ninth_inning"
    | "first_three_innings"
    | "first_five_innings"
    | "first_seven_innings"
    | "live_segment";

export type SlipSide = "Over" | "Under" | "home" | "away" | "yes" | "no";

export type SlipLeg = {
    id: string;
    eventId: string;
    sport?: string;
    league?: string;
    marketType?: string;
    marketFamily?: string;
    outcomeFamily?: string;
    entityType?: SlipEntityType;
    entityId?: string;
    teamId?: string;
    opponentTeamId?: string;
    playerId?: string;
    statType?: string;
    timeScope?: SlipTimeScope;
    side?: SlipSide;
    selection?: string;
    line?: number;
    altLine?: number | null;
    impliedBy?: string[];
    containsComponents?: Array<{
        entityType?: "player" | "team" | "game";
        entityId?: string;
        statType?: string;
        timeScope?: string;
        side?: string;
        line?: number | null;
        marketType?: string;
    }>;
    sameGameEligible?: boolean;
};

export type SlipValidationStatus =
    | "valid_parlay_leg"
    | "valid_straight_only"
    | "redundant_non_incremental"
    | "collapsed_into_other_leg"
    | "requires_custom_sgp_pricing"
    | "blocked_impossible"
    | "blocked_conflict";

export type PairDecision = {
    legAId: string;
    legBId: string;
    ruleCode: string;
    status: SlipValidationStatus;
    reason: string;
    pricingEffect: "incremental" | "non_incremental" | "collapse" | "blocked" | "custom";
};

export type SlipValidationResult = {
    overallStatus: "valid" | "valid_with_adjustments" | "blocked";
    pairDecisions: PairDecision[];
    effectiveLegs: SlipLeg[];
    blockedLegIds: string[];
    collapsedMap: Record<string, string>;
    straightOnlyLegIds: string[];
    nonIncrementalLegIds: string[];
    customPricingGroups: string[][];
    userMessages: string[];
};

export type ValidationConfig = {
    redundantHandling: "collapse" | "non_incremental";
    correlatedSameGameHandling: "custom_pricing" | "straight_only";
    exactDuplicateHandling: "collapse" | "non_incremental";
};

export type PricingPrepResult = {
    validation: SlipValidationResult;
    pricingLegs: SlipLeg[];
    canUseStandardParlayPricing: boolean;
    canBuildCombo: boolean;
    requiresCustomPricing: boolean;
    hasStraightOnlyLegs: boolean;
    hasInvalidComboLegs: boolean;
    invalidComboLegIds: string[];
    invalidComboReasons: string[];
};

type NumericInterval = {
    min: number;
    max: number;
};

type NormalizedThreshold = {
    value: number | null;
    source: "line" | "selection" | "implicit" | "none";
    operator: "Over" | "Under" | null;
};

type SoccerResultState = "home" | "draw" | "away";
type OutcomeResolutionValue = "win" | "lose" | "void";
type SoccerResultResolution = Record<SoccerResultState, OutcomeResolutionValue>;
type ParsedSoccerScore = {
    teamGoals: number;
    opponentGoals: number;
    totalGoals: number;
    bothTeamsScore: boolean;
    result: "team" | "draw" | "opponent";
};

const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
const POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
    redundantHandling: "non_incremental",
    correlatedSameGameHandling: "custom_pricing",
    exactDuplicateHandling: "collapse",
};

const mutuallyExclusiveOutcomeFamilies = new Set([
    "exact_score",
    "moneyline_3way",
    "both_teams_to_score",
    "first_basket",
    "first_field_goal",
    "first_team_to_score",
    "first_touchdown_scorer",
    "first_goal_scorer",
    "last_team_to_score",
]);

const normalizeText = (value?: string | null) =>
    value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const normalizeNumber = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const parsePlusThreshold = (value?: string | null) => {
    const match = value?.match(/(\d+(?:\.\d+)?)\s*\+/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
};

const isAnytimeLikeLeg = (leg: SlipLeg) => {
    const tokens = [
        normalizeText(leg.marketType),
        normalizeText(leg.marketFamily),
        normalizeText(leg.selection),
    ];
    return tokens.some(
        (token) =>
            token.includes("anytime") ||
            token.includes("to record a hit") ||
            token.includes("to score a touchdown")
    );
};

const hasComparableThresholdHint = (leg: SlipLeg) =>
    normalizeNumber(leg.line) !== null ||
    normalizeNumber(leg.altLine) !== null ||
    parsePlusThreshold(leg.selection) !== null ||
    parsePlusThreshold(leg.marketType) !== null ||
    isAnytimeLikeLeg(leg);

const resolveTimeScope = (leg: SlipLeg): SlipTimeScope => leg.timeScope ?? "full_game";

const resolveMarketFamily = (leg: SlipLeg) =>
    normalizeText(leg.marketFamily || leg.marketType);

const resolveSportKey = (leg: SlipLeg) => normalizeText(leg.league || leg.sport);

const resolveStatType = (leg: SlipLeg) => {
    if (leg.statType) return normalizeText(leg.statType);

    const token = resolveMarketFamily(leg);
    if (token.includes("both teams to score")) return "both_teams_to_score";
    if (token.includes("draw no bet")) return "draw_no_bet";
    if (token.includes("double chance")) return "double_chance";
    if (token.includes("first team to score")) return "first_team_to_score";
    if (token.includes("last team to score")) return "last_team_to_score";
    if (token.includes("correct score")) return "correct_score";
    if (token.includes("shots on target")) return "shots_on_target";
    if (token.includes("player shots")) return "shots";
    if (token.includes("player goals")) return "goals";
    if (token.includes("corners odd/even")) return "corners_odd_even";
    if (token.includes("corners")) return "corners";
    if (token.includes("goals")) return "goals";
    if (token.includes("handicap")) return "spread";
    if (token.includes("points + rebounds + assists")) return "points_rebounds_assists";
    if (token.includes("points + rebounds")) return "points_rebounds";
    if (token.includes("points + assists")) return "points_assists";
    if (token.includes("rebounds + assists")) return "rebounds_assists";
    if (token.includes("threes")) return "threes";
    if (token.includes("points")) return "points";
    if (token.includes("rebounds")) return "rebounds";
    if (token.includes("assists")) return "assists";
    if (token.includes("steals")) return "steals";
    if (token.includes("blocks")) return "blocks";
    if (token.includes("touchdown")) return "touchdowns";
    if (token.includes("pass td")) return "pass_touchdowns";
    if (token.includes("rush yards")) return "rush_yards";
    if (token.includes("receiving yards")) return "receiving_yards";
    if (token.includes("hits")) return "hits";
    if (token.includes("puck line")) return "spread";
    if (token.includes("run line")) return "spread";
    if (token.includes("moneyline")) return "moneyline";
    if (token.includes("spread")) return "spread";
    if (token.includes("team total")) return "team_total";
    if (token.includes("total")) return "total_points";
    if (token.includes("exact score")) return "exact_score";
    if (token.includes("first basket")) return "first_basket";
    if (token.includes("first touchdown")) return "first_touchdown_scorer";
    return token;
};

const resolveOutcomeFamily = (leg: SlipLeg) => {
    if (leg.outcomeFamily) return normalizeText(leg.outcomeFamily);

    const token = resolveMarketFamily(leg);
    if (token.includes("moneyline 3-way")) return "moneyline_3way";
    if (token.includes("draw no bet")) return "draw_no_bet";
    if (token.includes("double chance")) return "double_chance";
    if (token.includes("both teams to score")) return "both_teams_to_score";
    if (token.includes("first team to score")) return "first_team_to_score";
    if (token.includes("last team to score")) return "last_team_to_score";
    if (token.includes("correct score")) return "exact_score";
    if (token.includes("handicap")) return "spread";
    if (token.includes("corners odd/even")) return "odd_even";
    if (token.includes("moneyline")) return "moneyline";
    if (token.includes("puck line")) return "spread";
    if (token.includes("run line")) return "spread";
    if (token.includes("spread")) return "spread";
    if (token.includes("team total")) return "team_total";
    if (token.includes("total")) return "game_total";
    if (token.includes("exact score")) return "exact_score";
    if (token.includes("first basket")) return "first_basket";
    if (token.includes("first field goal")) return "first_field_goal";
    if (token.includes("first touchdown")) return "first_touchdown_scorer";
    if (token.includes("combo")) return "combo";
    return token;
};

const resolveTeamId = (leg: SlipLeg) =>
    leg.teamId ?? (leg.entityType === "team" ? leg.entityId : undefined);

const resolveEntityKey = (leg: SlipLeg) => {
    if (leg.entityType === "player") return leg.playerId ?? leg.entityId ?? "";
    if (leg.entityType === "team") return resolveTeamId(leg) ?? leg.entityId ?? "";
    if (leg.entityType === "game") return leg.entityId ?? leg.eventId;
    return leg.entityId ?? leg.id;
};

const resolveComparableSide = (leg: SlipLeg): SlipSide | undefined => {
    const side = normalizeText(leg.side);
    if (
        side === "home" ||
        side === "away" ||
        side === "Over" ||
        side === "Under" ||
        side === "yes" ||
        side === "no"
    ) {
        if ((side === "yes" || side === "no") && hasComparableThresholdHint(leg)) {
            return side === "yes" ? "Over" : "Under";
        }
        return side as SlipSide;
    }
    return undefined;
};

const normalizeThreshold = (leg: SlipLeg): NormalizedThreshold => {
    const line = normalizeNumber(leg.line) ?? normalizeNumber(leg.altLine);
    if (line !== null) {
        const operator =
            resolveComparableSide(leg) === "Under"
                ? "Under"
                : resolveComparableSide(leg) === "Over"
                    ? "Over"
                    : "Over";
        return {
            value: line,
            source: "line",
            operator,
        };
    }

    const selectionThreshold =
        parsePlusThreshold(leg.selection) ?? parsePlusThreshold(leg.marketType);
    if (selectionThreshold !== null) {
        return {
            value: selectionThreshold,
            source: "selection",
            operator: "Over",
        };
    }

    if (isAnytimeLikeLeg(leg)) {
        return {
            value: 0.5,
            source: "implicit",
            operator: "Over",
        };
    }

    return {
        value: null,
        source: "none",
        operator:
            resolveComparableSide(leg) === "Under"
                ? "Under"
                : resolveComparableSide(leg) === "Over"
                    ? "Over"
                    : null,
    };
};

const SOCCER_RESULT_STATES: SoccerResultState[] = ["home", "draw", "away"];

const isSoccerLeg = (leg: SlipLeg) => {
    const sportKey = resolveSportKey(leg);
    if (
        sportKey === "soccer" ||
        sportKey.includes("premier league") ||
        sportKey.includes("bundesliga")
    ) {
        return true;
    }

    const family = resolveOutcomeFamily(leg);
    return (
        family === "moneyline_3way" ||
        family === "draw_no_bet" ||
        family === "double_chance" ||
        family === "both_teams_to_score" ||
        family === "first_team_to_score" ||
        family === "last_team_to_score" ||
        family === "exact_score"
    );
};

const soccerSelectionToken = (leg: SlipLeg) => normalizeText(leg.selection);

const buildSoccerResultResolution = (leg: SlipLeg): SoccerResultResolution | null => {
    if (!isSoccerLeg(leg)) return null;

    const family = resolveOutcomeFamily(leg);
    const side = resolveComparableSide(leg);
    const selection = soccerSelectionToken(leg);

    if (family === "moneyline_3way" || family === "moneyline") {
        if (selection.includes("draw")) {
            return { home: "lose", draw: "win", away: "lose" };
        }
        if (side === "home") {
            return { home: "win", draw: "lose", away: "lose" };
        }
        if (side === "away") {
            return { home: "lose", draw: "lose", away: "win" };
        }
    }

    if (family === "draw_no_bet") {
        if (leg.teamId && side === "home") {
            return { home: "win", draw: "void", away: "lose" };
        }
        if (leg.teamId && side === "away") {
            return { home: "lose", draw: "void", away: "win" };
        }
    }

    if (family === "double_chance") {
        if (selection.includes("draw")) {
            if (leg.teamId && side === "home") {
                return { home: "win", draw: "win", away: "lose" };
            }
            if (leg.teamId && side === "away") {
                return { home: "lose", draw: "win", away: "win" };
            }
        }

        if (!selection.includes("draw")) {
            return { home: "win", draw: "lose", away: "win" };
        }
    }

    return null;
};

const soccerResolutionsEqual = (
    left: SoccerResultResolution,
    right: SoccerResultResolution
) =>
    SOCCER_RESULT_STATES.every((state) => left[state] === right[state]);

const soccerPairCanCash = (
    left: SoccerResultResolution,
    right: SoccerResultResolution
) =>
    SOCCER_RESULT_STATES.some((state) => {
        const leftOutcome = left[state];
        const rightOutcome = right[state];
        return (
            leftOutcome !== "lose" &&
            rightOutcome !== "lose" &&
            (leftOutcome === "win" || rightOutcome === "win")
        );
    });

const soccerResolutionImplies = (
    source: SoccerResultResolution,
    target: SoccerResultResolution
) =>
    SOCCER_RESULT_STATES.every(
        (state) => source[state] !== "win" || target[state] !== "lose"
    );

const parseSoccerScore = (leg: SlipLeg): ParsedSoccerScore | null => {
    if (!isSoccerLeg(leg) || resolveOutcomeFamily(leg) !== "exact_score") return null;

    const match = leg.selection?.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) return null;

    const teamGoals = Number(match[1]);
    const opponentGoals = Number(match[2]);
    if (!Number.isFinite(teamGoals) || !Number.isFinite(opponentGoals)) return null;

    return {
        teamGoals,
        opponentGoals,
        totalGoals: teamGoals + opponentGoals,
        bothTeamsScore: teamGoals > 0 && opponentGoals > 0,
        result:
            teamGoals === opponentGoals
                ? "draw"
                : teamGoals > opponentGoals
                    ? "team"
                    : "opponent",
    };
};

const legOutcomeAgainstSoccerScore = (
    leg: SlipLeg,
    scoreLeg: SlipLeg
): OutcomeResolutionValue | null => {
    const score = parseSoccerScore(scoreLeg);
    if (!score || !isSameEvent(leg, scoreLeg)) return null;
    if (resolveTimeScope(leg) !== resolveTimeScope(scoreLeg)) return null;

    const family = resolveOutcomeFamily(leg);
    const side = resolveComparableSide(leg);
    const threshold = normalizeThreshold(leg);
    const selection = soccerSelectionToken(leg);

    if (family === "both_teams_to_score") {
        if (side === "yes") return score.bothTeamsScore ? "win" : "lose";
        if (side === "no") return score.bothTeamsScore ? "lose" : "win";
        return null;
    }

    if (family === "game_total") {
        if (threshold.value === null || threshold.operator === null) return null;
        return threshold.operator === "Over"
            ? score.totalGoals > threshold.value
                ? "win"
                : "lose"
            : score.totalGoals < threshold.value
                ? "win"
                : "lose";
    }

    if (family === "team_total") {
        if (threshold.value === null || threshold.operator === null) return null;
        const relevantGoals =
            leg.teamId && scoreLeg.teamId && leg.teamId === scoreLeg.teamId
                ? score.teamGoals
                : leg.teamId && scoreLeg.opponentTeamId && leg.teamId === scoreLeg.opponentTeamId
                    ? score.opponentGoals
                    : null;
        if (relevantGoals === null) return null;
        return threshold.operator === "Over"
            ? relevantGoals > threshold.value
                ? "win"
                : "lose"
            : relevantGoals < threshold.value
                ? "win"
                : "lose";
    }

    if (family === "moneyline_3way" || family === "moneyline") {
        if (selection.includes("draw")) return score.result === "draw" ? "win" : "lose";
        if (leg.teamId && scoreLeg.teamId && leg.teamId === scoreLeg.teamId) {
            return score.result === "team" ? "win" : "lose";
        }
        if (leg.teamId && scoreLeg.opponentTeamId && leg.teamId === scoreLeg.opponentTeamId) {
            return score.result === "opponent" ? "win" : "lose";
        }
        return null;
    }

    if (family === "draw_no_bet") {
        if (score.result === "draw") return "void";
        if (leg.teamId && scoreLeg.teamId && leg.teamId === scoreLeg.teamId) {
            return score.result === "team" ? "win" : "lose";
        }
        if (leg.teamId && scoreLeg.opponentTeamId && leg.teamId === scoreLeg.opponentTeamId) {
            return score.result === "opponent" ? "win" : "lose";
        }
        return null;
    }

    if (family === "double_chance") {
        if (!selection.includes("draw")) {
            return score.result === "draw" ? "lose" : "win";
        }
        if (leg.teamId && scoreLeg.teamId && leg.teamId === scoreLeg.teamId) {
            return score.result === "team" || score.result === "draw" ? "win" : "lose";
        }
        if (leg.teamId && scoreLeg.opponentTeamId && leg.teamId === scoreLeg.opponentTeamId) {
            return score.result === "opponent" || score.result === "draw" ? "win" : "lose";
        }
        return null;
    }

    return null;
};

const soccerPlayerGoalsMinimum = (leg: SlipLeg) => {
    if (!isSoccerLeg(leg)) return null;
    if (leg.entityType !== "player" || resolveStatType(leg) !== "goals") return null;
    const threshold = normalizeThreshold(leg);
    if (threshold.value === null || threshold.operator !== "Over") return null;
    return Math.floor(threshold.value) + 1;
};

const soccerBttsThresholdImplication = (sourceLeg: SlipLeg, targetLeg: SlipLeg) => {
    if (!isSoccerLeg(sourceLeg) || !isSoccerLeg(targetLeg)) return null;
    if (!isSameEvent(sourceLeg, targetLeg)) return null;
    if (resolveTimeScope(sourceLeg) !== resolveTimeScope(targetLeg)) return null;
    if (resolveOutcomeFamily(sourceLeg) !== "both_teams_to_score") return null;
    if (resolveComparableSide(sourceLeg) !== "yes") return null;
    if (resolveOutcomeFamily(targetLeg) !== "game_total") return null;

    const threshold = normalizeThreshold(targetLeg);
    if (threshold.value === null || threshold.operator !== "Over") return false;
    return threshold.value < 2;
};

const soccerBttsContradiction = (leftLeg: SlipLeg, rightLeg: SlipLeg) => {
    if (!isSoccerLeg(leftLeg) || !isSoccerLeg(rightLeg)) return null;
    if (!isSameEvent(leftLeg, rightLeg)) return null;
    if (resolveTimeScope(leftLeg) !== resolveTimeScope(rightLeg)) return null;
    if (resolveOutcomeFamily(leftLeg) !== "both_teams_to_score") return null;
    if (resolveComparableSide(leftLeg) !== "yes") return null;

    const family = resolveOutcomeFamily(rightLeg);
    if (family === "game_total") {
        const threshold = normalizeThreshold(rightLeg);
        if (threshold.value === null || threshold.operator !== "Under") return false;
        return threshold.value < 2;
    }

    if (family === "team_total") {
        const threshold = normalizeThreshold(rightLeg);
        if (threshold.value === null || threshold.operator !== "Under") return false;
        return threshold.value < 1;
    }

    return false;
};

const soccerPlayerGoalsImpliesTotal = (sourceLeg: SlipLeg, targetLeg: SlipLeg) => {
    const minimumGoals = soccerPlayerGoalsMinimum(sourceLeg);
    if (minimumGoals === null) return null;
    if (!isSameEvent(sourceLeg, targetLeg)) return null;
    if (resolveTimeScope(sourceLeg) !== resolveTimeScope(targetLeg)) return null;

    const family = resolveOutcomeFamily(targetLeg);
    const threshold = normalizeThreshold(targetLeg);
    if (threshold.value === null || threshold.operator !== "Over") return false;

    if (family === "game_total") {
        return minimumGoals > threshold.value;
    }

    if (
        family === "team_total" &&
        sourceLeg.teamId &&
        targetLeg.teamId &&
        sourceLeg.teamId === targetLeg.teamId
    ) {
        return minimumGoals > threshold.value;
    }

    return null;
};

const soccerPlayerGoalsContradictsTotal = (sourceLeg: SlipLeg, targetLeg: SlipLeg) => {
    const minimumGoals = soccerPlayerGoalsMinimum(sourceLeg);
    if (minimumGoals === null) return null;
    if (!isSameEvent(sourceLeg, targetLeg)) return null;
    if (resolveTimeScope(sourceLeg) !== resolveTimeScope(targetLeg)) return null;

    const family = resolveOutcomeFamily(targetLeg);
    const threshold = normalizeThreshold(targetLeg);
    if (threshold.value === null || threshold.operator !== "Under") return false;

    if (family === "game_total") {
        return minimumGoals > threshold.value;
    }

    if (
        family === "team_total" &&
        sourceLeg.teamId &&
        targetLeg.teamId &&
        sourceLeg.teamId === targetLeg.teamId
    ) {
        return minimumGoals > threshold.value;
    }

    return null;
};

export const compareThresholds = (legA: SlipLeg, legB: SlipLeg) => {
    const thresholdA = normalizeThreshold(legA);
    const thresholdB = normalizeThreshold(legB);

    if (
        thresholdA.value === null ||
        thresholdB.value === null ||
        thresholdA.operator === null ||
        thresholdB.operator === null ||
        thresholdA.operator !== thresholdB.operator
    ) {
        return null;
    }

    if (thresholdA.value === thresholdB.value) return 0;
    if (thresholdA.operator === "Over") {
        return thresholdA.value > thresholdB.value ? 1 : -1;
    }
    return thresholdA.value < thresholdB.value ? 1 : -1;
};

const selectionSignature = (leg: SlipLeg) =>
    [
        leg.eventId,
        leg.entityType,
        resolveEntityKey(leg),
        resolveStatType(leg),
        resolveOutcomeFamily(leg),
        resolveTimeScope(leg),
        resolveComparableSide(leg) ?? normalizeText(leg.side),
        normalizeThreshold(leg).value ?? "",
        normalizeText(leg.selection),
    ].join("|");

const isTeamOutcomeLeg = (leg: SlipLeg) => {
    const family = resolveOutcomeFamily(leg);
    return family === "moneyline" || family === "spread";
};

const isTotalLikeLeg = (leg: SlipLeg) => {
    const family = resolveOutcomeFamily(leg);
    return family === "game_total" || family === "team_total";
};

const getStatOutcomeInterval = (leg: SlipLeg): NumericInterval | null => {
    const threshold = normalizeThreshold(leg);
    if (threshold.value === null || threshold.operator === null) return null;
    if (threshold.operator === "Over") {
        return { min: threshold.value, max: POSITIVE_INFINITY };
    }
    return { min: NEGATIVE_INFINITY, max: threshold.value };
};

const getTeamOutcomeInterval = (leg: SlipLeg): NumericInterval | null => {
    if (!isTeamOutcomeLeg(leg)) return null;

    const side = resolveComparableSide(leg);
    if (side !== "home" && side !== "away") return null;

    if (resolveOutcomeFamily(leg) === "moneyline") {
        return side === "home"
            ? { min: 0, max: POSITIVE_INFINITY }
            : { min: NEGATIVE_INFINITY, max: 0 };
    }

    const line = normalizeNumber(leg.line) ?? normalizeThreshold(leg).value;
    if (line === null) return null;

    return side === "home"
        ? { min: -line, max: POSITIVE_INFINITY }
        : { min: NEGATIVE_INFINITY, max: line };
};

const intervalsOverlap = (intervalA: NumericInterval, intervalB: NumericInterval) =>
    Math.max(intervalA.min, intervalB.min) < Math.min(intervalA.max, intervalB.max);

const intervalContains = (outer: NumericInterval, inner: NumericInterval) =>
    outer.min <= inner.min && outer.max >= inner.max;

const intervalsEqual = (intervalA: NumericInterval, intervalB: NumericInterval) =>
    intervalA.min === intervalB.min && intervalA.max === intervalB.max;

const isSameTeamOutcomeContext = (legA: SlipLeg, legB: SlipLeg) =>
    isSameEvent(legA, legB) &&
    resolveTimeScope(legA) === resolveTimeScope(legB) &&
    isTeamOutcomeLeg(legA) &&
    isTeamOutcomeLeg(legB);

const resolveDuplicateStatus = (
    handling: ValidationConfig["exactDuplicateHandling"] | ValidationConfig["redundantHandling"]
): {
    status: "collapsed_into_other_leg" | "redundant_non_incremental";
    pricingEffect: "collapse" | "non_incremental";
} =>
    handling === "collapse"
        ? { status: "collapsed_into_other_leg", pricingEffect: "collapse" }
        : { status: "redundant_non_incremental", pricingEffect: "non_incremental" };

const buildDecision = (
    legAId: string,
    legBId: string,
    ruleCode: string,
    status: SlipValidationStatus,
    reason: string,
    pricingEffect: PairDecision["pricingEffect"]
): PairDecision => ({
    legAId,
    legBId,
    ruleCode,
    status,
    reason,
    pricingEffect,
});

export const isSameEvent = (legA: SlipLeg, legB: SlipLeg) => {
    if (legA.eventId !== legB.eventId) return false;

    const sportKeyA = resolveSportKey(legA);
    const sportKeyB = resolveSportKey(legB);
    if (sportKeyA && sportKeyB && sportKeyA !== sportKeyB) return false;

    return true;
};

export const isSameEntity = (legA: SlipLeg, legB: SlipLeg) =>
    isSameEvent(legA, legB) &&
    legA.entityType === legB.entityType &&
    resolveEntityKey(legA) !== "" &&
    resolveEntityKey(legA) === resolveEntityKey(legB);

export const isSameStatContext = (legA: SlipLeg, legB: SlipLeg) =>
    isSameEntity(legA, legB) &&
    resolveTimeScope(legA) === resolveTimeScope(legB) &&
    resolveStatType(legA) === resolveStatType(legB);

export const isExactDuplicate = (legA: SlipLeg, legB: SlipLeg) => {
    if (isSameEvent(legA, legB) && resolveTimeScope(legA) === resolveTimeScope(legB)) {
        const soccerResolutionA = buildSoccerResultResolution(legA);
        const soccerResolutionB = buildSoccerResultResolution(legB);
        if (
            soccerResolutionA !== null &&
            soccerResolutionB !== null &&
            soccerResolutionsEqual(soccerResolutionA, soccerResolutionB)
        ) {
            return true;
        }
    }

    if (isSameStatContext(legA, legB)) {
        const thresholdA = normalizeThreshold(legA);
        const thresholdB = normalizeThreshold(legB);
        const sideA = resolveComparableSide(legA) ?? normalizeText(legA.side);
        const sideB = resolveComparableSide(legB) ?? normalizeText(legB.side);
        const hasComparableSignal =
            sideA !== "" || sideB !== "" || thresholdA.value !== null || thresholdB.value !== null;

        if (hasComparableSignal && sideA === sideB && thresholdA.value === thresholdB.value) {
            return true;
        }
    }

    if (isSameTeamOutcomeContext(legA, legB)) {
        const intervalA = getTeamOutcomeInterval(legA);
        const intervalB = getTeamOutcomeInterval(legB);
        if (intervalA !== null && intervalB !== null && intervalsEqual(intervalA, intervalB)) {
            return true;
        }
    }

    return selectionSignature(legA) === selectionSignature(legB);
};

export const isDirectContradiction = (legA: SlipLeg, legB: SlipLeg) => {
    if (!isSameEvent(legA, legB)) return false;

    if (resolveTimeScope(legA) === resolveTimeScope(legB)) {
        const soccerResolutionA = buildSoccerResultResolution(legA);
        const soccerResolutionB = buildSoccerResultResolution(legB);
        if (
            soccerResolutionA !== null &&
            soccerResolutionB !== null &&
            !soccerPairCanCash(soccerResolutionA, soccerResolutionB)
        ) {
            return true;
        }

        if (legOutcomeAgainstSoccerScore(legA, legB) === "lose") return true;
        if (legOutcomeAgainstSoccerScore(legB, legA) === "lose") return true;
        if (soccerBttsContradiction(legA, legB) === true) return true;
        if (soccerBttsContradiction(legB, legA) === true) return true;
        if (soccerPlayerGoalsContradictsTotal(legA, legB) === true) return true;
        if (soccerPlayerGoalsContradictsTotal(legB, legA) === true) return true;
    }

    const comparableSideA = resolveComparableSide(legA);
    const comparableSideB = resolveComparableSide(legB);

    if (
        isSameStatContext(legA, legB) &&
        ((comparableSideA === "Over" && comparableSideB === "Under") ||
            (comparableSideA === "Under" && comparableSideB === "Over"))
    ) {
        if (legA.entityType === "player" || legB.entityType === "player") {
            return true;
        }

        const intervalA = getStatOutcomeInterval(legA);
        const intervalB = getStatOutcomeInterval(legB);
        return intervalA !== null && intervalB !== null && !intervalsOverlap(intervalA, intervalB);
    }

    if (isSameTeamOutcomeContext(legA, legB)) {
        const intervalA = getTeamOutcomeInterval(legA);
        const intervalB = getTeamOutcomeInterval(legB);
        return intervalA !== null && intervalB !== null && !intervalsOverlap(intervalA, intervalB);
    }

    return false;
};

export const isMutuallyExclusive = (legA: SlipLeg, legB: SlipLeg) => {
    if (!isSameEvent(legA, legB) || resolveTimeScope(legA) !== resolveTimeScope(legB)) {
        return false;
    }

    const familyA = resolveOutcomeFamily(legA);
    const familyB = resolveOutcomeFamily(legB);
    if (familyA !== familyB || !mutuallyExclusiveOutcomeFamilies.has(familyA)) {
        return false;
    }

    return selectionSignature(legA) !== selectionSignature(legB);
};

export const doesLegImply = (sourceLeg: SlipLeg, targetLeg: SlipLeg) => {
    if (isSameEvent(sourceLeg, targetLeg) && resolveTimeScope(sourceLeg) === resolveTimeScope(targetLeg)) {
        const soccerResolutionSource = buildSoccerResultResolution(sourceLeg);
        const soccerResolutionTarget = buildSoccerResultResolution(targetLeg);
        if (
            soccerResolutionSource !== null &&
            soccerResolutionTarget !== null &&
            !soccerResolutionsEqual(soccerResolutionSource, soccerResolutionTarget) &&
            soccerResolutionImplies(soccerResolutionSource, soccerResolutionTarget)
        ) {
            return true;
        }

        if (legOutcomeAgainstSoccerScore(targetLeg, sourceLeg) === "win") {
            return true;
        }

        if (soccerBttsThresholdImplication(sourceLeg, targetLeg) === true) {
            return true;
        }

        if (soccerPlayerGoalsImpliesTotal(sourceLeg, targetLeg) === true) {
            return true;
        }
    }

    if (isSameStatContext(sourceLeg, targetLeg)) {
        const intervalA = getStatOutcomeInterval(sourceLeg);
        const intervalB = getStatOutcomeInterval(targetLeg);
        if (
            intervalA !== null &&
            intervalB !== null &&
            !intervalsEqual(intervalA, intervalB) &&
            intervalContains(intervalB, intervalA)
        ) {
            return true;
        }
    }

    if (isSameTeamOutcomeContext(sourceLeg, targetLeg)) {
        const intervalA = getTeamOutcomeInterval(sourceLeg);
        const intervalB = getTeamOutcomeInterval(targetLeg);
        if (
            intervalA !== null &&
            intervalB !== null &&
            !intervalsEqual(intervalA, intervalB) &&
            intervalContains(intervalB, intervalA)
        ) {
            return true;
        }
    }

    return false;
};

const componentMatchesLeg = (
    component: NonNullable<SlipLeg["containsComponents"]>[number],
    leg: SlipLeg
) => {
    const componentEntityKey = normalizeText(component.entityId);
    const legEntityKey = normalizeText(resolveEntityKey(leg));
    const componentStatType = normalizeText(component.statType);
    const legStatType = resolveStatType(leg);
    const componentTimeScope = normalizeText(component.timeScope);
    const legTimeScope = resolveTimeScope(leg);
    const componentSide = normalizeText(component.side);
    const legSide = normalizeText(resolveComparableSide(leg) ?? leg.side);
    const componentMarketType = normalizeText(component.marketType);
    const legMarketFamily = resolveMarketFamily(leg);
    const legThreshold = normalizeThreshold(leg).value;

    if (component.entityType && component.entityType !== leg.entityType) return false;
    if (componentEntityKey && componentEntityKey !== legEntityKey) return false;
    if (componentStatType && componentStatType !== legStatType) return false;
    if (componentTimeScope && componentTimeScope !== legTimeScope) return false;
    if (componentSide && componentSide !== legSide) return false;
    if (componentMarketType && componentMarketType !== legMarketFamily) return false;
    if (component.line !== undefined && component.line !== null && component.line !== legThreshold) {
        return false;
    }

    return true;
};

export const isComboComponentOverlap = (legA: SlipLeg, legB: SlipLeg) => {
    if (legA.entityType === "combo" && legA.containsComponents?.some((item) => componentMatchesLeg(item, legB))) {
        return true;
    }
    if (legB.entityType === "combo" && legB.containsComponents?.some((item) => componentMatchesLeg(item, legA))) {
        return true;
    }
    return false;
};

export const hasMiddleWindow = (legA: SlipLeg, legB: SlipLeg) => {
    if (isSameTeamOutcomeContext(legA, legB)) {
        const intervalA = getTeamOutcomeInterval(legA);
        const intervalB = getTeamOutcomeInterval(legB);
        if (
            intervalA === null ||
            intervalB === null ||
            !intervalsOverlap(intervalA, intervalB) ||
            intervalContains(intervalA, intervalB) ||
            intervalContains(intervalB, intervalA)
        ) {
            return false;
        }
        return true;
    }

    if (isSameStatContext(legA, legB)) {
        const intervalA = getStatOutcomeInterval(legA);
        const intervalB = getStatOutcomeInterval(legB);
        if (
            intervalA === null ||
            intervalB === null ||
            !intervalsOverlap(intervalA, intervalB) ||
            intervalContains(intervalA, intervalB) ||
            intervalContains(intervalB, intervalA)
        ) {
            return false;
        }
        return true;
    }

    return false;
};

const correlatedRuleCode = (legA: SlipLeg, legB: SlipLeg) => {
    if (isSameTeamOutcomeContext(legA, legB)) return "SAME_GAME_RELATED_SPREAD_ML";

    const teamOrTotal =
        isTeamOutcomeLeg(legA) || isTeamOutcomeLeg(legB) || isTotalLikeLeg(legA) || isTotalLikeLeg(legB);
    if (teamOrTotal) return "SAME_GAME_RELATED_TOTAL_SIDE";

    return "SAME_GAME_CORRELATED";
};

export const isSameGameCorrelated = (legA: SlipLeg, legB: SlipLeg) => {
    if (!isSameEvent(legA, legB)) return false;
    if (legA.id === legB.id) return false;
    return true;
};

export const classifyLegPair = (
    legA: SlipLeg,
    legB: SlipLeg,
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): PairDecision | null => {
    if (legA.id === legB.id) return null;

    if (isDirectContradiction(legA, legB)) {
        return buildDecision(
            legA.id,
            legB.id,
            "DIRECT_CONTRADICTION",
            "blocked_conflict",
            "These selections are directly contradictory and can’t be combined.",
            "blocked"
        );
    }

    if (isMutuallyExclusive(legA, legB)) {
        return buildDecision(
            legA.id,
            legB.id,
            "MUTUALLY_EXCLUSIVE",
            "blocked_impossible",
            "These selections are mutually exclusive and can’t be combined.",
            "blocked"
        );
    }

    if (isExactDuplicate(legA, legB)) {
        const duplicateMode = resolveDuplicateStatus(config.exactDuplicateHandling);
        const ruleCode =
            resolveMarketFamily(legA) === resolveMarketFamily(legB) &&
                resolveOutcomeFamily(legA) === resolveOutcomeFamily(legB)
                ? "DUPLICATE_LEG"
                : "SAME_UNDERLYING_STAT";
        return buildDecision(
            legB.id,
            legA.id,
            ruleCode,
            duplicateMode.status,
            "These selections overlap, so they won’t increase your parlay payout.",
            duplicateMode.pricingEffect
        );
    }

    if (doesLegImply(legA, legB)) {
        const handling = resolveDuplicateStatus(config.redundantHandling);
        const ladderReason =
            isSameStatContext(legA, legB) &&
                resolveComparableSide(legA) === resolveComparableSide(legB) &&
                compareThresholds(legA, legB) !== null
                ? "Only the stricter ladder leg increases payout."
                : "One selection already includes the outcome of another.";
        return buildDecision(
            legB.id,
            legA.id,
            "NESTED_IMPLICATION",
            handling.status,
            ladderReason,
            handling.pricingEffect
        );
    }

    if (doesLegImply(legB, legA)) {
        const handling = resolveDuplicateStatus(config.redundantHandling);
        const ladderReason =
            isSameStatContext(legA, legB) &&
                resolveComparableSide(legA) === resolveComparableSide(legB) &&
                compareThresholds(legA, legB) !== null
                ? "Only the stricter ladder leg increases payout."
                : "One selection already includes the outcome of another.";
        return buildDecision(
            legA.id,
            legB.id,
            "NESTED_IMPLICATION",
            handling.status,
            ladderReason,
            handling.pricingEffect
        );
    }

    if (isComboComponentOverlap(legA, legB)) {
        const handling = resolveDuplicateStatus(config.redundantHandling);
        const comboLeg = legA.entityType === "combo" ? legA : legB;
        const ingredientLeg = comboLeg.id === legA.id ? legB : legA;
        return buildDecision(
            ingredientLeg.id,
            comboLeg.id,
            "COMBO_COMPONENT_OVERLAP",
            handling.status,
            "One selection already includes the outcome of another.",
            handling.pricingEffect
        );
    }

    if (isSameGameCorrelated(legA, legB)) {
        if (config.correlatedSameGameHandling === "straight_only") {
            return buildDecision(
                legA.id,
                legB.id,
                correlatedRuleCode(legA, legB),
                "valid_straight_only",
                "This selection remains on your slip as a straight-only pick.",
                "custom"
            );
        }

        return buildDecision(
            legA.id,
            legB.id,
            correlatedRuleCode(legA, legB),
            "requires_custom_sgp_pricing",
            "These same-game picks require custom pricing.",
            "custom"
        );
    }

    return buildDecision(
        legA.id,
        legB.id,
        "VALID_INDEPENDENT",
        "valid_parlay_leg",
        "These selections can be priced as independent parlay legs.",
        "incremental"
    );
};

const compressCollapsedMap = (collapsedMap: Record<string, string>) => {
    const resolveTarget = (legId: string): string => {
        const target = collapsedMap[legId];
        if (!target) return legId;
        if (collapsedMap[target]) {
            collapsedMap[legId] = resolveTarget(target);
        }
        return collapsedMap[legId];
    };

    Object.keys(collapsedMap).forEach((legId) => {
        resolveTarget(legId);
    });

    return collapsedMap;
};

const buildCustomPricingGroups = (pairDecisions: PairDecision[]) => {
    const adjacency = new Map<string, Set<string>>();

    pairDecisions
        .filter((decision) => decision.status === "requires_custom_sgp_pricing")
        .forEach((decision) => {
            const left = adjacency.get(decision.legAId) ?? new Set<string>();
            left.add(decision.legBId);
            adjacency.set(decision.legAId, left);

            const right = adjacency.get(decision.legBId) ?? new Set<string>();
            right.add(decision.legAId);
            adjacency.set(decision.legBId, right);
        });

    const visited = new Set<string>();
    const groups: string[][] = [];

    adjacency.forEach((_neighbors, node) => {
        if (visited.has(node)) return;
        const stack = [node];
        const component = new Set<string>();

        while (stack.length > 0) {
            const current = stack.pop();
            if (!current || visited.has(current)) continue;
            visited.add(current);
            component.add(current);
            adjacency.get(current)?.forEach((neighbor) => {
                if (!visited.has(neighbor)) stack.push(neighbor);
            });
        }

        if (component.size > 0) {
            groups.push(Array.from(component.values()));
        }
    });

    return groups;
};

export const validateSlip = (
    legs: SlipLeg[],
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): SlipValidationResult => {
    const safeConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    const pairDecisions: PairDecision[] = [];

    for (let index = 0; index < legs.length; index += 1) {
        for (let innerIndex = index + 1; innerIndex < legs.length; innerIndex += 1) {
            const decision = classifyLegPair(legs[index], legs[innerIndex], safeConfig);
            if (decision) pairDecisions.push(decision);
        }
    }

    const blockedLegIds = new Set<string>();
    const collapsedMap: Record<string, string> = {};
    const straightOnlyLegIds = new Set<string>();
    const nonIncrementalLegIds = new Set<string>();

    pairDecisions.forEach((decision) => {
        if (decision.status === "blocked_conflict" || decision.status === "blocked_impossible") {
            blockedLegIds.add(decision.legAId);
            blockedLegIds.add(decision.legBId);
        }

        if (decision.status === "collapsed_into_other_leg") {
            collapsedMap[decision.legAId] = decision.legBId;
        }

        if (decision.status === "valid_straight_only") {
            straightOnlyLegIds.add(decision.legAId);
            straightOnlyLegIds.add(decision.legBId);
        }

        if (decision.status === "redundant_non_incremental") {
            nonIncrementalLegIds.add(decision.legAId);
        }
    });

    const compressedCollapseMap = compressCollapsedMap(collapsedMap);
    const customPricingGroups = buildCustomPricingGroups(pairDecisions);
    const customPricingIds = new Set(customPricingGroups.flat());

    const effectiveLegs = legs.filter((leg) => {
        if (blockedLegIds.has(leg.id)) return false;
        if (compressedCollapseMap[leg.id]) return false;
        if (nonIncrementalLegIds.has(leg.id)) return false;
        if (straightOnlyLegIds.has(leg.id)) return false;
        return true;
    });

    const userMessages = Array.from(
        new Set(
            pairDecisions
                .filter((decision) => decision.status !== "valid_parlay_leg")
                .map((decision) => decision.reason)
        ).values()
    );

    const hasAdjustments =
        Object.keys(compressedCollapseMap).length > 0 ||
        nonIncrementalLegIds.size > 0 ||
        straightOnlyLegIds.size > 0 ||
        customPricingIds.size > 0;

    return {
        overallStatus: blockedLegIds.size > 0 ? "blocked" : hasAdjustments ? "valid_with_adjustments" : "valid",
        pairDecisions,
        effectiveLegs,
        blockedLegIds: Array.from(blockedLegIds.values()),
        collapsedMap: compressedCollapseMap,
        straightOnlyLegIds: Array.from(straightOnlyLegIds.values()),
        nonIncrementalLegIds: Array.from(nonIncrementalLegIds.values()),
        customPricingGroups,
        userMessages,
    };
};

export const prepareSlipPricing = (
    legs: SlipLeg[],
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): PricingPrepResult => {
    const validation = validateSlip(legs, config);
    const invalidComboDecisions = validation.pairDecisions.filter(
        (decision) =>
            decision.status === "blocked_conflict" ||
            decision.status === "blocked_impossible" ||
            decision.status === "collapsed_into_other_leg" ||
            decision.status === "redundant_non_incremental"
    );
    const invalidComboLegIds = Array.from(
        new Set(
            invalidComboDecisions.flatMap((decision) => [decision.legAId, decision.legBId])
        ).values()
    );
    const invalidComboReasons = Array.from(
        new Set(invalidComboDecisions.map((decision) => decision.reason)).values()
    );
    const hasInvalidComboLegs = invalidComboLegIds.length > 0;
    const requiresCustomPricing = validation.customPricingGroups.length > 0;
    const hasStraightOnlyLegs = validation.straightOnlyLegIds.length > 0;
    const canBuildCombo = validation.blockedLegIds.length === 0 && !hasInvalidComboLegs;
    const canUseStandardParlayPricing =
        canBuildCombo && !requiresCustomPricing && !hasStraightOnlyLegs;

    return {
        validation,
        // The pricing engine should price `pricingLegs` normally only when
        // `canUseStandardParlayPricing` is true. Otherwise route through custom SGP pricing.
        pricingLegs: canUseStandardParlayPricing ? validation.effectiveLegs : [],
        canUseStandardParlayPricing,
        canBuildCombo,
        requiresCustomPricing,
        hasStraightOnlyLegs,
        hasInvalidComboLegs,
        invalidComboLegIds,
        invalidComboReasons,
    };
};
