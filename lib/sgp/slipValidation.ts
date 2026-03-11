export type SlipEntityType = "player" | "team" | "game" | "combo";

export type SlipTimeScope =
    | "full_game"
    | "first_half"
    | "second_half"
    | "first_quarter"
    | "second_quarter"
    | "third_quarter"
    | "fourth_quarter"
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
    requiresCustomPricing: boolean;
    hasStraightOnlyLegs: boolean;
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

const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
const POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
    redundantHandling: "non_incremental",
    correlatedSameGameHandling: "custom_pricing",
    exactDuplicateHandling: "collapse",
};

const mutuallyExclusiveOutcomeFamilies = new Set([
    "exact_score",
    "first_basket",
    "first_field_goal",
    "first_touchdown_scorer",
    "first_goal_scorer",
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

const resolveStatType = (leg: SlipLeg) => {
    if (leg.statType) return normalizeText(leg.statType);

    const token = resolveMarketFamily(leg);
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
    if (token.includes("moneyline")) return "moneyline";
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

export const isSameEvent = (legA: SlipLeg, legB: SlipLeg) => legA.eventId === legB.eventId;

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
    const requiresCustomPricing = validation.customPricingGroups.length > 0;
    const hasStraightOnlyLegs = validation.straightOnlyLegIds.length > 0;
    const canUseStandardParlayPricing =
        validation.blockedLegIds.length === 0 && !requiresCustomPricing && !hasStraightOnlyLegs;

    return {
        validation,
        // The pricing engine should price `pricingLegs` normally only when
        // `canUseStandardParlayPricing` is true. Otherwise route through custom SGP pricing.
        pricingLegs: canUseStandardParlayPricing ? validation.effectiveLegs : [],
        canUseStandardParlayPricing,
        requiresCustomPricing,
        hasStraightOnlyLegs,
    };
};
