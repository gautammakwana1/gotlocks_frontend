import { parseAmericanOdds } from "@/lib/utils/scoring";
import {
    DEFAULT_VALIDATION_CONFIG,
    hasMiddleWindow,
    prepareSlipPricing,
    PricingPrepResult,
    SlipLeg,
    ValidationConfig,
} from "./slipValidation";

export type PriceableSlipLeg = SlipLeg & {
    price: string | number | null | undefined;
};

export type ComboOddsQuote = {
    americanOdds: number | null;
    isEstimated: boolean;
    pricing: PricingPrepResult;
};

type ComparableDirection = "home" | "away" | "over" | "under";
type SpreadBias = "favorite" | "underdog" | "pickem";
type NbaComponent =
    | "points"
    | "rebounds"
    | "assists"
    | "threes"
    | "blocks"
    | "steals";

const NEGATIVE_WEIGHT_FLOOR = 0.65;
const POSITIVE_WEIGHT_CAP = 0.985;
const GENERIC_NBA_PAIR_WEIGHT = 0.03;

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

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const americanToDecimal = (american: number) =>
    american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);

const americanToProbability = (american: number) => 1 / americanToDecimal(american);

const probabilityToAmerican = (probability: number) => {
    if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
        return null;
    }
    if (probability <= 0.5) {
        return Math.round(((1 - probability) / probability) * 100);
    }
    return -Math.round((probability / (1 - probability)) * 100);
};

const marketToken = (leg: SlipLeg) =>
    normalizeText(leg.marketFamily || leg.marketType);

const sportToken = (leg: SlipLeg) => normalizeText(leg.sport || leg.league);

const entityKey = (leg: SlipLeg) => {
    if (leg.entityType === "player") return leg.playerId ?? leg.entityId ?? "";
    if (leg.entityType === "team") return leg.teamId ?? leg.entityId ?? "";
    if (leg.entityType === "game") return leg.entityId ?? leg.eventId;
    return leg.entityId ?? leg.id;
};

const resolveDirection = (leg: SlipLeg): ComparableDirection | null => {
    const side = normalizeText(leg.side);
    if (side === "home" || side === "away" || side === "over" || side === "under") {
        return side as ComparableDirection;
    }

    if (parsePlusThreshold(leg.selection) !== null || parsePlusThreshold(leg.marketType) !== null) {
        return "over";
    }

    if (normalizeNumber(leg.line) !== null || normalizeNumber(leg.altLine) !== null) {
        return "over";
    }

    return null;
};

const isMoneylineLeg = (leg: SlipLeg) => {
    const token = marketToken(leg);
    return token.includes("moneyline");
};

const isSpreadLeg = (leg: SlipLeg) => {
    const token = marketToken(leg);
    return token.includes("point spread") || token === "spread";
};

const isTeamTotalLeg = (leg: SlipLeg) => {
    const token = marketToken(leg);
    return token.includes("team total") || token.includes("home team total") || token.includes("away team total");
};

const isGameTotalLeg = (leg: SlipLeg) => {
    const token = marketToken(leg);
    return token.includes("total") && !isTeamTotalLeg(leg);
};

const statComponents = (leg: SlipLeg): Set<NbaComponent> => {
    const stat = normalizeText(leg.statType);
    switch (stat) {
        case "points":
            return new Set(["points"]);
        case "rebounds":
            return new Set(["rebounds"]);
        case "assists":
            return new Set(["assists"]);
        case "threes":
            return new Set(["threes"]);
        case "blocks":
            return new Set(["blocks"]);
        case "steals":
            return new Set(["steals"]);
        case "points_rebounds_assists":
            return new Set(["points", "rebounds", "assists"]);
        case "points_rebounds":
            return new Set(["points", "rebounds"]);
        case "points_assists":
            return new Set(["points", "assists"]);
        case "rebounds_assists":
            return new Set(["rebounds", "assists"]);
        default:
            return new Set();
    }
};

const overlaps = <T,>(left: Set<T>, right: Set<T>) =>
    Array.from(left).some((value) => right.has(value));

const containsAll = <T,>(outer: Set<T>, inner: Set<T>) =>
    Array.from(inner).every((value) => outer.has(value));

const isSameDirection = (legA: SlipLeg, legB: SlipLeg) => {
    const directionA = resolveDirection(legA);
    const directionB = resolveDirection(legB);
    return directionA !== null && directionA === directionB;
};

const hasOverUnderDirection = (leg: SlipLeg) => {
    const direction = resolveDirection(leg);
    return direction === "over" || direction === "under";
};

const isScoringDrivenPlayerLeg = (leg: SlipLeg) => {
    const components = statComponents(leg);
    return components.has("points") || components.has("threes");
};

const isSecondaryPlayerLeg = (leg: SlipLeg) => {
    const components = statComponents(leg);
    return components.has("rebounds") || components.has("assists");
};

const spreadBias = (leg: SlipLeg): SpreadBias => {
    if (!isSpreadLeg(leg)) return "pickem";
    const line = normalizeNumber(leg.line);
    if (line === null || line === 0) return "pickem";
    return line < 0 ? "favorite" : "underdog";
};

const samePlayerWeight = (legA: SlipLeg, legB: SlipLeg) => {
    if (legA.entityType !== "player" || legB.entityType !== "player") return null;
    if ((legA.playerId ?? legA.entityId) !== (legB.playerId ?? legB.entityId)) return null;

    const componentsA = statComponents(legA);
    const componentsB = statComponents(legB);
    if (componentsA.size === 0 || componentsB.size === 0) return 0.07;

    const alignedDirections =
        !hasOverUnderDirection(legA) ||
        !hasOverUnderDirection(legB) ||
        isSameDirection(legA, legB);
    const sideScale = alignedDirections ? 1 : 0.7;

    if (
        legA.timeScope &&
        legB.timeScope &&
        legA.timeScope !== legB.timeScope &&
        overlaps(componentsA, componentsB)
    ) {
        const scopes = new Set([legA.timeScope, legB.timeScope]);
        if (scopes.has("full_game") && scopes.has("first_quarter")) return 0.24 * sideScale;
        if (scopes.has("full_game") && scopes.has("first_half")) return 0.2 * sideScale;
        return 0.16 * sideScale;
    }

    if (containsAll(componentsA, componentsB) || containsAll(componentsB, componentsA)) {
        if (componentsA.size !== componentsB.size) return 0.18 * sideScale;
    }

    if (overlaps(componentsA, componentsB)) return 0.12 * sideScale;

    const pair = Array.from(
        new Set([...Array.from(componentsA), ...Array.from(componentsB)])
    ).sort();
    const pairKey = pair.join(":");

    switch (pairKey) {
        case "points:threes":
            return 0.22 * sideScale;
        case "assists:points":
            return 0.12 * sideScale;
        case "points:rebounds":
            return 0.08 * sideScale;
        case "assists:rebounds":
            return 0.05 * sideScale;
        case "assists:threes":
            return 0.06 * sideScale;
        case "rebounds:threes":
            return 0.03 * sideScale;
        default:
            return 0.07 * sideScale;
    }
};

const teamMoneylinePlayerWeight = (teamLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isMoneylineLeg(teamLeg) || playerLeg.entityType !== "player") return null;
    if (!hasOverUnderDirection(playerLeg)) return null;
    const sameTeam = Boolean(teamLeg.teamId && playerLeg.teamId && teamLeg.teamId === playerLeg.teamId);
    const opposingTeam =
        Boolean(teamLeg.teamId && playerLeg.teamId && teamLeg.teamId === playerLeg.opponentTeamId);
    const direction = resolveDirection(playerLeg);

    if (sameTeam) return direction === "over" ? 0.16 : -0.06;
    if (opposingTeam) return direction === "under" ? 0.12 : -0.03;
    return null;
};

const teamTotalPlayerWeight = (teamTotalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isTeamTotalLeg(teamTotalLeg) || playerLeg.entityType !== "player") return null;
    if (!teamTotalLeg.teamId || !playerLeg.teamId) return null;
    if (teamTotalLeg.teamId !== playerLeg.teamId) return null;
    if (!hasOverUnderDirection(teamTotalLeg) || !hasOverUnderDirection(playerLeg)) return null;
    return isSameDirection(teamTotalLeg, playerLeg) ? 0.18 : -0.12;
};

const gameTotalPlayerWeight = (totalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isGameTotalLeg(totalLeg) || playerLeg.entityType !== "player") return null;
    if (!hasOverUnderDirection(totalLeg) || !hasOverUnderDirection(playerLeg)) return null;
    const positive = isScoringDrivenPlayerLeg(playerLeg) ? 0.12 : isSecondaryPlayerLeg(playerLeg) ? 0.06 : 0.03;
    return isSameDirection(totalLeg, playerLeg) ? positive : -0.08;
};

const teamTotalGameTotalWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const totalA = isTeamTotalLeg(legA) && isGameTotalLeg(legB);
    const totalB = isTeamTotalLeg(legB) && isGameTotalLeg(legA);
    if (!totalA && !totalB) return null;
    if (!hasOverUnderDirection(legA) || !hasOverUnderDirection(legB)) return null;
    return isSameDirection(legA, legB) ? 0.16 : -0.1;
};

const spreadTotalWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const spreadLeg = isSpreadLeg(legA) ? legA : isSpreadLeg(legB) ? legB : null;
    const totalLeg = isGameTotalLeg(legA) ? legA : isGameTotalLeg(legB) ? legB : null;
    if (!spreadLeg || !totalLeg) return null;

    const bias = spreadBias(spreadLeg);
    const totalDirection = resolveDirection(totalLeg);
    if (bias === "pickem" || (totalDirection !== "over" && totalDirection !== "under")) {
        return null;
    }

    if (
        (bias === "favorite" && totalDirection === "over") ||
        (bias === "underdog" && totalDirection === "under")
    ) {
        return 0.08;
    }

    return -0.06;
};

const derivativeWeight = (legA: SlipLeg, legB: SlipLeg) => {
    if (entityKey(legA) === "" || entityKey(legA) !== entityKey(legB)) return null;
    if ((legA.timeScope ?? "full_game") === (legB.timeScope ?? "full_game")) return null;
    if (!isSameDirection(legA, legB)) return null;

    const componentsA = statComponents(legA);
    const componentsB = statComponents(legB);
    const sameStat = normalizeText(legA.statType) === normalizeText(legB.statType);
    const compatible =
        sameStat ||
        overlaps(componentsA, componentsB) ||
        (isGameTotalLeg(legA) && isGameTotalLeg(legB)) ||
        (isMoneylineLeg(legA) && isMoneylineLeg(legB)) ||
        (isSpreadLeg(legA) && isSpreadLeg(legB));

    if (!compatible) return null;

    const scopes = new Set([legA.timeScope ?? "full_game", legB.timeScope ?? "full_game"]);
    if (scopes.has("full_game") && scopes.has("first_quarter")) return 0.24;
    if (scopes.has("full_game") && scopes.has("first_half")) return 0.2;
    return 0.16;
};

const middleWindowWeight = (legA: SlipLeg, legB: SlipLeg) => {
    if (!isMoneylineLeg(legA) && !isMoneylineLeg(legB) && !isSpreadLeg(legA) && !isSpreadLeg(legB)) {
        return null;
    }
    if (!hasMiddleWindow(legA, legB)) return null;
    if (isMoneylineLeg(legA) !== isMoneylineLeg(legB)) return -0.08;
    return -0.14;
};

const differentPlayerScoringWeight = (legA: SlipLeg, legB: SlipLeg) => {
    if (legA.entityType !== "player" || legB.entityType !== "player") return null;
    if ((legA.playerId ?? legA.entityId) === (legB.playerId ?? legB.entityId)) return null;
    if (!isScoringDrivenPlayerLeg(legA) || !isScoringDrivenPlayerLeg(legB)) return null;
    if (!hasOverUnderDirection(legA) || !hasOverUnderDirection(legB)) return null;
    return isSameDirection(legA, legB) ? 0.05 : -0.02;
};

const classifyNbaPairWeight = (legA: SlipLeg, legB: SlipLeg) => {
    return (
        derivativeWeight(legA, legB) ??
        middleWindowWeight(legA, legB) ??
        samePlayerWeight(legA, legB) ??
        teamMoneylinePlayerWeight(legA, legB) ??
        teamMoneylinePlayerWeight(legB, legA) ??
        teamTotalPlayerWeight(legA, legB) ??
        teamTotalPlayerWeight(legB, legA) ??
        gameTotalPlayerWeight(legA, legB) ??
        gameTotalPlayerWeight(legB, legA) ??
        teamTotalGameTotalWeight(legA, legB) ??
        spreadTotalWeight(legA, legB) ??
        differentPlayerScoringWeight(legA, legB) ??
        GENERIC_NBA_PAIR_WEIGHT
    );
};

const estimateNbaGroupOdds = (legs: PriceableSlipLeg[]) => {
    const probabilities = legs.map((leg) => {
        const american = parseAmericanOdds(leg.price);
        return american === null ? null : americanToProbability(american);
    });

    if (probabilities.some((probability) => probability === null)) return null;

    const resolvedProbabilities = probabilities as number[];
    const independentProbability = resolvedProbabilities.reduce(
        (accumulator, probability) => accumulator * probability,
        1
    );

    const pairWeights: number[] = [];
    for (let index = 0; index < legs.length; index += 1) {
        for (let innerIndex = index + 1; innerIndex < legs.length; innerIndex += 1) {
            pairWeights.push(classifyNbaPairWeight(legs[index], legs[innerIndex]));
        }
    }

    if (pairWeights.length === 0) return probabilityToAmerican(independentProbability);

    const averageWeight =
        pairWeights.reduce((accumulator, weight) => accumulator + weight, 0) /
        pairWeights.length;
    const groupWeight = clamp(averageWeight * (legs.length - 1), -0.35, 0.45);
    const minLegProbability = Math.min(...resolvedProbabilities);
    const lowerBound = Math.max(0.0001, independentProbability * NEGATIVE_WEIGHT_FLOOR);
    const upperBound = Math.max(
        lowerBound,
        Math.min(POSITIVE_WEIGHT_CAP, minLegProbability * POSITIVE_WEIGHT_CAP)
    );
    const adjustedProbability = clamp(
        independentProbability * Math.exp(groupWeight),
        lowerBound,
        upperBound
    );

    return probabilityToAmerican(adjustedProbability);
};

const quoteCustomPricingGroup = (legs: PriceableSlipLeg[]) => {
    if (legs.length === 0) return null;
    const normalizedSport = sportToken(legs[0]);
    if (legs.some((leg) => sportToken(leg) !== normalizedSport)) return null;

    if (normalizedSport === "nba") {
        return estimateNbaGroupOdds(legs);
    }

    return null;
};

export const combineParlayOdds = (legs: PriceableSlipLeg[]) => {
    if (legs.length === 0) return null;
    let combinedProbability = 1;
    for (const leg of legs) {
        const american = parseAmericanOdds(leg.price);
        if (american === null) return null;
        combinedProbability *= americanToProbability(american);
    }
    return probabilityToAmerican(combinedProbability);
};

export const quoteSlipOdds = (
    legs: PriceableSlipLeg[],
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ComboOddsQuote => {
    const pricing = prepareSlipPricing(legs, config);

    if (!pricing.canBuildCombo || pricing.hasStraightOnlyLegs) {
        return {
            americanOdds: null,
            isEstimated: false,
            pricing,
        };
    }

    if (pricing.canUseStandardParlayPricing) {
        return {
            americanOdds: combineParlayOdds(pricing.pricingLegs as PriceableSlipLeg[]),
            isEstimated: false,
            pricing,
        };
    }

    const effectiveLegs = pricing.validation.effectiveLegs as PriceableSlipLeg[];
    const legById = new Map(effectiveLegs.map((leg) => [leg.id, leg]));
    const customPricingIds = new Set(pricing.validation.customPricingGroups.flat());
    let combinedProbability = 1;

    for (const leg of effectiveLegs) {
        if (customPricingIds.has(leg.id)) continue;
        const american = parseAmericanOdds(leg.price);
        if (american === null) {
            return {
                americanOdds: null,
                isEstimated: false,
                pricing,
            };
        }
        combinedProbability *= americanToProbability(american);
    }

    for (const groupIds of pricing.validation.customPricingGroups) {
        const groupLegs = groupIds
            .map((legId) => legById.get(legId))
            .filter((leg): leg is PriceableSlipLeg => leg !== undefined);

        if (groupLegs.length !== groupIds.length) {
            return {
                americanOdds: null,
                isEstimated: false,
                pricing,
            };
        }

        const groupOdds = quoteCustomPricingGroup(groupLegs);
        const groupAmerican = parseAmericanOdds(groupOdds);
        if (groupAmerican === null) {
            return {
                americanOdds: null,
                isEstimated: false,
                pricing,
            };
        }
        combinedProbability *= americanToProbability(groupAmerican);
    }

    return {
        americanOdds: probabilityToAmerican(combinedProbability),
        isEstimated: pricing.validation.customPricingGroups.length > 0,
        pricing,
    };
};
