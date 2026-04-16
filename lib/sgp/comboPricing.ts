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

type PairWeightClassifier = (legA: SlipLeg, legB: SlipLeg) => number;

type WeightedGroupEstimatorConfig = {
    negativeFloor: number;
    positiveCap: number;
    minGroupWeight: number;
    maxGroupWeight: number;
};

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

const sportToken = (leg: SlipLeg) => {
    const primary = normalizeText(leg.sport);
    const secondary = normalizeText(leg.league);
    const token = primary || secondary;
    const market = marketToken(leg);

    if (
        token === "soccer" ||
        token.includes("premier league") ||
        token.includes("bundesliga") ||
        market.includes("both teams to score") ||
        market.includes("draw no bet") ||
        market.includes("double chance") ||
        market.includes("correct score")
    ) {
        return "soccer";
    }

    return token;
};

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
    return token.includes("point spread") || token === "spread" || token.includes("handicap");
};

const isRunLineLeg = (leg: SlipLeg) => marketToken(leg).includes("run line");

const isPuckLineLeg = (leg: SlipLeg) => marketToken(leg).includes("puck line");

const isLineLeg = (leg: SlipLeg) => isSpreadLeg(leg) || isRunLineLeg(leg) || isPuckLineLeg(leg);

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

const pairMatches = <T,>(first: T, second: T, left: Set<T>, right: Set<T> = left) =>
    (left.has(first) && right.has(second)) || (left.has(second) && right.has(first));

const isSameDirection = (legA: SlipLeg, legB: SlipLeg) => {
    const directionA = resolveDirection(legA);
    const directionB = resolveDirection(legB);
    return directionA !== null && directionA === directionB;
};

const hasOverUnderDirection = (leg: SlipLeg) => {
    const direction = resolveDirection(leg);
    return direction === "over" || direction === "under";
};

const sameTeam = (legA: SlipLeg, legB: SlipLeg) =>
    Boolean(legA.teamId && legB.teamId && legA.teamId === legB.teamId);

const opposingTeams = (legA: SlipLeg, legB: SlipLeg) =>
    Boolean(
        legA.teamId &&
        legB.teamId &&
        ((legA.teamId === legB.opponentTeamId && legB.teamId === legA.opponentTeamId) ||
            legA.teamId === legB.opponentTeamId ||
            legB.teamId === legA.opponentTeamId)
    );

const positiveOverUnderWeight = (legA: SlipLeg, legB: SlipLeg, magnitude: number) => {
    if (!hasOverUnderDirection(legA) || !hasOverUnderDirection(legB)) return magnitude * 0.75;
    return isSameDirection(legA, legB) ? magnitude : -magnitude * 0.75;
};

const inverseOverUnderWeight = (legA: SlipLeg, legB: SlipLeg, magnitude: number) => {
    if (!hasOverUnderDirection(legA) || !hasOverUnderDirection(legB)) return -magnitude * 0.5;
    return isSameDirection(legA, legB) ? -magnitude : magnitude * 0.75;
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
    if (!isLineLeg(leg)) return "pickem";
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

const lineTotalWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const spreadLeg = isLineLeg(legA) ? legA : isLineLeg(legB) ? legB : null;
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

const derivativeScopeWeight = (scopeA?: SlipLeg["timeScope"], scopeB?: SlipLeg["timeScope"]) => {
    const left = scopeA ?? "full_game";
    const right = scopeB ?? "full_game";
    if (left === right) return null;

    const scopes = new Set([left, right]);
    if (scopes.has("full_game") && scopes.has("first_quarter")) return 0.24;
    if (scopes.has("full_game") && scopes.has("first_half")) return 0.2;
    if (scopes.has("full_game") && scopes.has("first_period")) return 0.22;
    if (scopes.has("full_game") && scopes.has("second_period")) return 0.18;
    if (scopes.has("full_game") && scopes.has("third_period")) return 0.16;
    if (scopes.has("full_game") && scopes.has("first_inning")) return 0.24;
    if (scopes.has("full_game") && scopes.has("first_three_innings")) return 0.2;
    if (scopes.has("full_game") && scopes.has("first_five_innings")) return 0.18;
    if (scopes.has("full_game") && scopes.has("first_seven_innings")) return 0.15;
    if (scopes.has("full_game") && scopes.has("live_segment")) return 0.12;
    return 0.16;
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
        (isLineLeg(legA) && isLineLeg(legB));

    if (!compatible) return null;

    return derivativeScopeWeight(legA.timeScope, legB.timeScope);
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

const samePlayer = (legA: SlipLeg, legB: SlipLeg) =>
    legA.entityType === "player" &&
    legB.entityType === "player" &&
    (legA.playerId ?? legA.entityId) !== "" &&
    (legA.playerId ?? legA.entityId) === (legB.playerId ?? legB.entityId);

type MlbBatterCategory =
    | "home_runs"
    | "hits"
    | "total_bases"
    | "rbis"
    | "stolen_bases"
    | "hits_runs_rbis"
    | "runs"
    | "singles"
    | "doubles"
    | "triples"
    | "walks"
    | "batting_strikeouts";

type MlbPitcherCategory =
    | "strikeouts"
    | "hits_allowed"
    | "earned_runs"
    | "walks_allowed"
    | "outs";

const mlbBatterCategory = (leg: SlipLeg): MlbBatterCategory | null => {
    if (leg.entityType !== "player") return null;
    const token = marketToken(leg);
    if (token.includes("hits + runs + rbis")) return "hits_runs_rbis";
    if (token.includes("home runs")) return "home_runs";
    if (token.includes("total bases")) return "total_bases";
    if (token.includes("stolen bases")) return "stolen_bases";
    if (token.includes("batting walks")) return "walks";
    if (token.includes("batting strikeouts")) return "batting_strikeouts";
    if (token.includes("singles")) return "singles";
    if (token.includes("doubles")) return "doubles";
    if (token.includes("triples")) return "triples";
    if (token.includes("rbis")) return "rbis";
    if (token.includes("hits")) return "hits";
    if (token.includes("runs")) return "runs";
    return null;
};

const mlbPitcherCategory = (leg: SlipLeg): MlbPitcherCategory | null => {
    if (leg.entityType !== "player") return null;
    const token = marketToken(leg);
    if (token.includes("hits allowed")) return "hits_allowed";
    if (token.includes("earned runs")) return "earned_runs";
    if (token.includes("walks allowed")) return "walks_allowed";
    if (token.includes("batting strikeouts")) return null;
    if (token.includes("strikeouts")) return "strikeouts";
    if (token.includes("outs")) return "outs";
    return null;
};

type NhlPlayerCategory =
    | "goals"
    | "assists"
    | "points"
    | "power_play_points"
    | "shots_on_goal"
    | "saves";

const nhlPlayerCategory = (leg: SlipLeg): NhlPlayerCategory | null => {
    if (leg.entityType !== "player") return null;
    const token = marketToken(leg);
    if (token.includes("power play points")) return "power_play_points";
    if (token.includes("shots on goal")) return "shots_on_goal";
    if (token.includes("saves")) return "saves";
    if (token.includes("goals")) return "goals";
    if (token.includes("assists")) return "assists";
    if (token.includes("points")) return "points";
    return null;
};

type NflPlayerCategory =
    | "passing_yards"
    | "passing_attempts"
    | "passing_completions"
    | "passing_tds"
    | "pass_rush_tds"
    | "pass_rush_yards"
    | "receiving_yards"
    | "receptions"
    | "longest_reception"
    | "rushing_yards"
    | "rushing_attempts"
    | "rushing_receiving_yards"
    | "touchdowns";

const nflPlayerCategory = (leg: SlipLeg): NflPlayerCategory | null => {
    if (leg.entityType !== "player") return null;
    const token = marketToken(leg);
    if (token.includes("passing + rushing touchdowns") || token.includes("passing + rushing tds")) {
        return "pass_rush_tds";
    }
    if (token.includes("passing + rushing yards")) return "pass_rush_yards";
    if (token.includes("passing touchdowns")) return "passing_tds";
    if (token.includes("passing completions")) return "passing_completions";
    if (token.includes("passing attempts")) return "passing_attempts";
    if (token.includes("passing yards")) return "passing_yards";
    if (token.includes("rushing + receiving yards")) return "rushing_receiving_yards";
    if (token.includes("longest reception")) return "longest_reception";
    if (token.includes("receiving yards")) return "receiving_yards";
    if (token.includes("receptions")) return "receptions";
    if (token.includes("rushing attempts")) return "rushing_attempts";
    if (token.includes("rushing yards")) return "rushing_yards";
    if (token.includes("touchdowns") || token.includes("anytime td")) return "touchdowns";
    return null;
};

const isNflPassingCategory = (category: NflPlayerCategory | null) =>
    category === "passing_yards" ||
    category === "passing_attempts" ||
    category === "passing_completions" ||
    category === "passing_tds" ||
    category === "pass_rush_tds" ||
    category === "pass_rush_yards";

const isNflReceivingCategory = (category: NflPlayerCategory | null) =>
    category === "receiving_yards" ||
    category === "receptions" ||
    category === "longest_reception" ||
    category === "touchdowns";

const isNflRushingCategory = (category: NflPlayerCategory | null) =>
    category === "rushing_yards" ||
    category === "rushing_attempts" ||
    category === "rushing_receiving_yards" ||
    category === "touchdowns";

const estimateWeightedGroupOdds = (
    legs: PriceableSlipLeg[],
    classifyPairWeight: PairWeightClassifier,
    config: WeightedGroupEstimatorConfig
) => {
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
            pairWeights.push(classifyPairWeight(legs[index], legs[innerIndex]));
        }
    }

    if (pairWeights.length === 0) return probabilityToAmerican(independentProbability);

    const averageWeight =
        pairWeights.reduce((accumulator, weight) => accumulator + weight, 0) / pairWeights.length;
    const groupWeight = clamp(
        averageWeight * (legs.length - 1),
        config.minGroupWeight,
        config.maxGroupWeight
    );
    const minLegProbability = Math.min(...resolvedProbabilities);
    const lowerBound = Math.max(0.0001, independentProbability * config.negativeFloor);
    const upperBound = Math.max(
        lowerBound,
        Math.min(config.positiveCap, minLegProbability * config.positiveCap)
    );
    const adjustedProbability = clamp(
        independentProbability * Math.exp(groupWeight),
        lowerBound,
        upperBound
    );

    return probabilityToAmerican(adjustedProbability);
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
        lineTotalWeight(legA, legB) ??
        differentPlayerScoringWeight(legA, legB) ??
        GENERIC_NBA_PAIR_WEIGHT
    );
};

const mlbMoneylinePlayerWeight = (teamLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isMoneylineLeg(teamLeg) || playerLeg.entityType !== "player") return null;
    const batterCategory = mlbBatterCategory(playerLeg);
    const pitcherCategory = mlbPitcherCategory(playerLeg);
    const direction = resolveDirection(playerLeg);
    if (direction === null) return null;

    if (sameTeam(teamLeg, playerLeg)) {
        if (batterCategory) return direction === "over" ? 0.14 : -0.08;
        if (pitcherCategory === "strikeouts" || pitcherCategory === "outs") {
            return direction === "over" ? 0.15 : -0.08;
        }
        if (
            pitcherCategory === "hits_allowed" ||
            pitcherCategory === "earned_runs" ||
            pitcherCategory === "walks_allowed"
        ) {
            return direction === "under" ? 0.15 : -0.08;
        }
    }

    if (opposingTeams(teamLeg, playerLeg)) {
        if (batterCategory) return direction === "under" ? 0.11 : -0.04;
        if (pitcherCategory === "strikeouts" || pitcherCategory === "outs") {
            return direction === "under" ? 0.08 : -0.04;
        }
        if (
            pitcherCategory === "hits_allowed" ||
            pitcherCategory === "earned_runs" ||
            pitcherCategory === "walks_allowed"
        ) {
            return direction === "over" ? 0.1 : -0.04;
        }
    }

    return null;
};

const mlbTeamTotalPlayerWeight = (teamTotalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isTeamTotalLeg(teamTotalLeg) || playerLeg.entityType !== "player") return null;
    const batterCategory = mlbBatterCategory(playerLeg);
    const pitcherCategory = mlbPitcherCategory(playerLeg);

    if (batterCategory && sameTeam(teamTotalLeg, playerLeg)) {
        return positiveOverUnderWeight(teamTotalLeg, playerLeg, 0.18);
    }

    if (pitcherCategory && opposingTeams(teamTotalLeg, playerLeg)) {
        if (
            pitcherCategory === "hits_allowed" ||
            pitcherCategory === "earned_runs" ||
            pitcherCategory === "walks_allowed"
        ) {
            return positiveOverUnderWeight(teamTotalLeg, playerLeg, 0.14);
        }
        return inverseOverUnderWeight(teamTotalLeg, playerLeg, 0.1);
    }

    return null;
};

const mlbGameTotalPlayerWeight = (totalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isGameTotalLeg(totalLeg) || playerLeg.entityType !== "player") return null;
    const batterCategory = mlbBatterCategory(playerLeg);
    const pitcherCategory = mlbPitcherCategory(playerLeg);
    if (batterCategory) return positiveOverUnderWeight(totalLeg, playerLeg, 0.1);
    if (
        pitcherCategory === "hits_allowed" ||
        pitcherCategory === "earned_runs" ||
        pitcherCategory === "walks_allowed"
    ) {
        return positiveOverUnderWeight(totalLeg, playerLeg, 0.09);
    }
    if (pitcherCategory === "strikeouts" || pitcherCategory === "outs") {
        return inverseOverUnderWeight(totalLeg, playerLeg, 0.08);
    }
    return null;
};

const mlbBatterPitcherWeight = (batterLeg: SlipLeg, pitcherLeg: SlipLeg) => {
    const batterCategory = mlbBatterCategory(batterLeg);
    const pitcherCategory = mlbPitcherCategory(pitcherLeg);
    if (!batterCategory || !pitcherCategory) return null;
    if (!opposingTeams(batterLeg, pitcherLeg)) return null;

    if (
        pitcherCategory === "hits_allowed" ||
        pitcherCategory === "earned_runs" ||
        pitcherCategory === "walks_allowed"
    ) {
        return positiveOverUnderWeight(batterLeg, pitcherLeg, 0.18);
    }
    return inverseOverUnderWeight(batterLeg, pitcherLeg, 0.12);
};

const classifyMlbPairWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const batterA = mlbBatterCategory(legA);
    const batterB = mlbBatterCategory(legB);
    const pitcherA = mlbPitcherCategory(legA);
    const pitcherB = mlbPitcherCategory(legB);

    if (samePlayer(legA, legB) && batterA && batterB) {
        if (batterA === "batting_strikeouts" || batterB === "batting_strikeouts") {
            return inverseOverUnderWeight(legA, legB, 0.14);
        }
        if (
            pairMatches(
                batterA,
                batterB,
                new Set<MlbBatterCategory>(["home_runs"]),
                new Set<MlbBatterCategory>(["total_bases", "hits", "runs", "rbis", "hits_runs_rbis"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.2);
        }
        if (
            pairMatches(
                batterA,
                batterB,
                new Set<MlbBatterCategory>(["hits_runs_rbis"]),
                new Set<MlbBatterCategory>(["hits", "runs", "rbis", "total_bases", "home_runs"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (pairMatches(batterA, batterB, new Set<MlbBatterCategory>(["hits"]), new Set<MlbBatterCategory>(["total_bases"]))) {
            return positiveOverUnderWeight(legA, legB, 0.16);
        }
        if (
            pairMatches(
                batterA,
                batterB,
                new Set<MlbBatterCategory>(["hits", "total_bases"]),
                new Set<MlbBatterCategory>(["singles", "doubles", "triples"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (pairMatches(batterA, batterB, new Set<MlbBatterCategory>(["runs"]), new Set<MlbBatterCategory>(["stolen_bases"]))) {
            return positiveOverUnderWeight(legA, legB, 0.12);
        }
        if (pairMatches(batterA, batterB, new Set<MlbBatterCategory>(["walks"]), new Set<MlbBatterCategory>(["runs"]))) {
            return positiveOverUnderWeight(legA, legB, 0.08);
        }
        return positiveOverUnderWeight(legA, legB, 0.07);
    }

    if (samePlayer(legA, legB) && pitcherA && pitcherB) {
        if (
            pairMatches(
                pitcherA,
                pitcherB,
                new Set<MlbPitcherCategory>(["strikeouts"]),
                new Set<MlbPitcherCategory>(["outs"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.16);
        }
        if (
            pairMatches(
                pitcherA,
                pitcherB,
                new Set<MlbPitcherCategory>(["hits_allowed"]),
                new Set<MlbPitcherCategory>(["earned_runs"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.14);
        }
        if (
            pairMatches(
                pitcherA,
                pitcherB,
                new Set<MlbPitcherCategory>(["walks_allowed"]),
                new Set<MlbPitcherCategory>(["earned_runs"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.11);
        }
        if (
            pairMatches(
                pitcherA,
                pitcherB,
                new Set<MlbPitcherCategory>(["outs"]),
                new Set<MlbPitcherCategory>(["hits_allowed", "earned_runs", "walks_allowed"])
            )
        ) {
            return inverseOverUnderWeight(legA, legB, 0.15);
        }
        if (
            pairMatches(
                pitcherA,
                pitcherB,
                new Set<MlbPitcherCategory>(["strikeouts"]),
                new Set<MlbPitcherCategory>(["hits_allowed", "earned_runs", "walks_allowed"])
            )
        ) {
            return inverseOverUnderWeight(legA, legB, 0.1);
        }
        return positiveOverUnderWeight(legA, legB, 0.06);
    }

    return (
        derivativeWeight(legA, legB) ??
        mlbBatterPitcherWeight(legA, legB) ??
        mlbBatterPitcherWeight(legB, legA) ??
        mlbMoneylinePlayerWeight(legA, legB) ??
        mlbMoneylinePlayerWeight(legB, legA) ??
        mlbTeamTotalPlayerWeight(legA, legB) ??
        mlbTeamTotalPlayerWeight(legB, legA) ??
        mlbGameTotalPlayerWeight(legA, legB) ??
        mlbGameTotalPlayerWeight(legB, legA) ??
        teamTotalGameTotalWeight(legA, legB) ??
        lineTotalWeight(legA, legB) ??
        (legA.entityType === "player" &&
            legB.entityType === "player" &&
            batterA &&
            batterB &&
            !samePlayer(legA, legB) &&
            sameTeam(legA, legB)
            ? positiveOverUnderWeight(legA, legB, 0.05)
            : null) ??
        0.02
    );
};

const nhlMoneylinePlayerWeight = (teamLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isMoneylineLeg(teamLeg) || playerLeg.entityType !== "player") return null;
    const category = nhlPlayerCategory(playerLeg);
    const direction = resolveDirection(playerLeg);
    if (!category || direction === null || category === "saves") return null;

    if (sameTeam(teamLeg, playerLeg)) return direction === "over" ? 0.12 : -0.07;
    if (opposingTeams(teamLeg, playerLeg)) return direction === "under" ? 0.1 : -0.03;
    return null;
};

const nhlTeamTotalPlayerWeight = (teamTotalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isTeamTotalLeg(teamTotalLeg) || playerLeg.entityType !== "player") return null;
    const category = nhlPlayerCategory(playerLeg);
    if (!category || category === "saves") return null;
    if (!sameTeam(teamTotalLeg, playerLeg)) return null;
    const magnitude = category === "shots_on_goal" ? 0.12 : 0.18;
    return positiveOverUnderWeight(teamTotalLeg, playerLeg, magnitude);
};

const nhlGameTotalPlayerWeight = (totalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isGameTotalLeg(totalLeg) || playerLeg.entityType !== "player") return null;
    const category = nhlPlayerCategory(playerLeg);
    if (!category) return null;
    if (category === "saves") return inverseOverUnderWeight(totalLeg, playerLeg, 0.05);
    const magnitude = category === "shots_on_goal" ? 0.06 : 0.11;
    return positiveOverUnderWeight(totalLeg, playerLeg, magnitude);
};

const nhlGoalieSkaterWeight = (goalieLeg: SlipLeg, skaterLeg: SlipLeg) => {
    const goalieCategory = nhlPlayerCategory(goalieLeg);
    const skaterCategory = nhlPlayerCategory(skaterLeg);
    if (goalieCategory !== "saves" || !skaterCategory || skaterCategory === "saves") return null;
    if (!opposingTeams(goalieLeg, skaterLeg)) return null;
    if (skaterCategory === "shots_on_goal") return positiveOverUnderWeight(goalieLeg, skaterLeg, 0.1);
    return positiveOverUnderWeight(goalieLeg, skaterLeg, 0.05);
};

const classifyNhlPairWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const categoryA = nhlPlayerCategory(legA);
    const categoryB = nhlPlayerCategory(legB);

    if (samePlayer(legA, legB) && categoryA && categoryB) {
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NhlPlayerCategory>(["goals"]),
                new Set<NhlPlayerCategory>(["points"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.22);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NhlPlayerCategory>(["assists"]),
                new Set<NhlPlayerCategory>(["points"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NhlPlayerCategory>(["shots_on_goal"]),
                new Set<NhlPlayerCategory>(["goals"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NhlPlayerCategory>(["shots_on_goal"]),
                new Set<NhlPlayerCategory>(["points"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.12);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NhlPlayerCategory>(["power_play_points"]),
                new Set<NhlPlayerCategory>(["goals", "assists", "points"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.14);
        }
        return positiveOverUnderWeight(legA, legB, categoryA === "saves" || categoryB === "saves" ? 0.05 : 0.08);
    }

    return (
        derivativeWeight(legA, legB) ??
        nhlGoalieSkaterWeight(legA, legB) ??
        nhlGoalieSkaterWeight(legB, legA) ??
        nhlMoneylinePlayerWeight(legA, legB) ??
        nhlMoneylinePlayerWeight(legB, legA) ??
        nhlTeamTotalPlayerWeight(legA, legB) ??
        nhlTeamTotalPlayerWeight(legB, legA) ??
        nhlGameTotalPlayerWeight(legA, legB) ??
        nhlGameTotalPlayerWeight(legB, legA) ??
        teamTotalGameTotalWeight(legA, legB) ??
        lineTotalWeight(legA, legB) ??
        (legA.entityType === "player" &&
            legB.entityType === "player" &&
            categoryA &&
            categoryB &&
            categoryA !== "saves" &&
            categoryB !== "saves" &&
            !samePlayer(legA, legB) &&
            sameTeam(legA, legB)
            ? positiveOverUnderWeight(legA, legB, 0.04)
            : null) ??
        0.02
    );
};

const nflMoneylinePlayerWeight = (teamLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isMoneylineLeg(teamLeg) || playerLeg.entityType !== "player") return null;
    const category = nflPlayerCategory(playerLeg);
    const direction = resolveDirection(playerLeg);
    if (!category || direction === null) return null;

    if (sameTeam(teamLeg, playerLeg)) return direction === "over" ? 0.14 : -0.08;
    if (opposingTeams(teamLeg, playerLeg)) return direction === "under" ? 0.11 : -0.04;
    return null;
};

const nflTeamTotalPlayerWeight = (teamTotalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isTeamTotalLeg(teamTotalLeg) || playerLeg.entityType !== "player") return null;
    if (!sameTeam(teamTotalLeg, playerLeg)) return null;
    const category = nflPlayerCategory(playerLeg);
    if (!category) return null;
    const magnitude = category === "touchdowns" || category === "passing_tds" || category === "pass_rush_tds"
        ? 0.2
        : 0.18;
    return positiveOverUnderWeight(teamTotalLeg, playerLeg, magnitude);
};

const nflGameTotalPlayerWeight = (totalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isGameTotalLeg(totalLeg) || playerLeg.entityType !== "player") return null;
    const category = nflPlayerCategory(playerLeg);
    if (!category) return null;
    const magnitude =
        category === "touchdowns" || category === "passing_tds" || category === "pass_rush_tds"
            ? 0.12
            : 0.1;
    return positiveOverUnderWeight(totalLeg, playerLeg, magnitude);
};

const classifyNflPairWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const categoryA = nflPlayerCategory(legA);
    const categoryB = nflPlayerCategory(legB);

    if (samePlayer(legA, legB) && categoryA && categoryB) {
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["passing_yards"]),
                new Set<NflPlayerCategory>(["passing_completions"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["passing_yards"]),
                new Set<NflPlayerCategory>(["passing_tds"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.16);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["passing_attempts"]),
                new Set<NflPlayerCategory>(["passing_completions"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.12);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["rushing_yards"]),
                new Set<NflPlayerCategory>(["rushing_attempts"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["receiving_yards"]),
                new Set<NflPlayerCategory>(["receptions"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.2);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["receiving_yards"]),
                new Set<NflPlayerCategory>(["longest_reception"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.14);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["pass_rush_yards"]),
                new Set<NflPlayerCategory>(["passing_yards", "rushing_yards"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["pass_rush_tds"]),
                new Set<NflPlayerCategory>(["passing_tds", "touchdowns"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<NflPlayerCategory>(["touchdowns"]),
                new Set<NflPlayerCategory>(["rushing_yards", "receiving_yards", "receptions"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.12);
        }
        return positiveOverUnderWeight(legA, legB, 0.08);
    }

    if (
        legA.entityType === "player" &&
        legB.entityType === "player" &&
        categoryA &&
        categoryB &&
        !samePlayer(legA, legB) &&
        sameTeam(legA, legB) &&
        ((isNflPassingCategory(categoryA) && isNflReceivingCategory(categoryB)) ||
            (isNflPassingCategory(categoryB) && isNflReceivingCategory(categoryA)))
    ) {
        return positiveOverUnderWeight(legA, legB, 0.18);
    }

    return (
        derivativeWeight(legA, legB) ??
        nflMoneylinePlayerWeight(legA, legB) ??
        nflMoneylinePlayerWeight(legB, legA) ??
        nflTeamTotalPlayerWeight(legA, legB) ??
        nflTeamTotalPlayerWeight(legB, legA) ??
        nflGameTotalPlayerWeight(legA, legB) ??
        nflGameTotalPlayerWeight(legB, legA) ??
        teamTotalGameTotalWeight(legA, legB) ??
        lineTotalWeight(legA, legB) ??
        (legA.entityType === "player" &&
            legB.entityType === "player" &&
            categoryA &&
            categoryB &&
            !samePlayer(legA, legB) &&
            sameTeam(legA, legB) &&
            !(isNflPassingCategory(categoryA) && isNflRushingCategory(categoryB)) &&
            !(isNflPassingCategory(categoryB) && isNflRushingCategory(categoryA))
            ? positiveOverUnderWeight(legA, legB, 0.04)
            : null) ??
        0.02
    );
};

type SoccerPlayerCategory = "goals" | "shots" | "shots_on_target";

const soccerPlayerCategory = (leg: SlipLeg): SoccerPlayerCategory | null => {
    if (leg.entityType !== "player") return null;
    const token = normalizeText(leg.statType || marketToken(leg));
    if (token.includes("shots_on_target") || token.includes("shots on target")) {
        return "shots_on_target";
    }
    if (token === "shots" || token.includes("player shots")) return "shots";
    if (token === "goals" || token.includes("player goals")) return "goals";
    return null;
};

const isSoccerResultLeg = (leg: SlipLeg) => {
    const family = normalizeText(leg.outcomeFamily);
    return (
        family === "moneyline_3way" ||
        family === "moneyline" ||
        family === "draw_no_bet" ||
        family === "double_chance"
    );
};

const isSoccerBttsLeg = (leg: SlipLeg) =>
    normalizeText(leg.outcomeFamily) === "both_teams_to_score";

const soccerBttsSelectionWeight = (bttsLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isSoccerBttsLeg(bttsLeg) || playerLeg.entityType !== "player") return null;

    const category = soccerPlayerCategory(playerLeg);
    const playerDirection = resolveDirection(playerLeg);
    const bttsSide = normalizeText(bttsLeg.side);
    if (!category || playerDirection === null || (bttsSide !== "yes" && bttsSide !== "no")) {
        return null;
    }

    const overMagnitude =
        category === "goals" ? 0.14 : category === "shots_on_target" ? 0.08 : 0.05;
    const underMagnitude =
        category === "goals" ? 0.12 : category === "shots_on_target" ? 0.06 : 0.04;

    if (bttsSide === "yes") {
        return playerDirection === "over" ? overMagnitude : -underMagnitude * 0.7;
    }

    return playerDirection === "under" ? underMagnitude * 0.65 : -overMagnitude * 0.85;
};

const soccerResultPlayerWeight = (teamLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isSoccerResultLeg(teamLeg) || playerLeg.entityType !== "player") return null;

    const category = soccerPlayerCategory(playerLeg);
    const direction = resolveDirection(playerLeg);
    if (!category || direction === null) return null;

    const sameTeamMagnitude =
        category === "goals" ? 0.18 : category === "shots_on_target" ? 0.12 : 0.08;
    const opposingMagnitude =
        category === "goals" ? 0.12 : category === "shots_on_target" ? 0.08 : 0.05;

    if (sameTeam(teamLeg, playerLeg)) {
        return direction === "over" ? sameTeamMagnitude : -sameTeamMagnitude * 0.55;
    }

    if (opposingTeams(teamLeg, playerLeg)) {
        return direction === "under" ? opposingMagnitude : -opposingMagnitude * 0.5;
    }

    return null;
};

const soccerTeamTotalPlayerWeight = (teamTotalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isTeamTotalLeg(teamTotalLeg) || playerLeg.entityType !== "player") return null;
    if (!sameTeam(teamTotalLeg, playerLeg)) return null;

    const category = soccerPlayerCategory(playerLeg);
    if (!category) return null;

    const magnitude =
        category === "goals" ? 0.2 : category === "shots_on_target" ? 0.14 : 0.1;
    return positiveOverUnderWeight(teamTotalLeg, playerLeg, magnitude);
};

const soccerGameTotalPlayerWeight = (totalLeg: SlipLeg, playerLeg: SlipLeg) => {
    if (!isGameTotalLeg(totalLeg) || playerLeg.entityType !== "player") return null;

    const category = soccerPlayerCategory(playerLeg);
    if (!category) return null;

    const magnitude =
        category === "goals" ? 0.14 : category === "shots_on_target" ? 0.1 : 0.06;
    return positiveOverUnderWeight(totalLeg, playerLeg, magnitude);
};

const soccerGameTotalBttsWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const totalLeg = isGameTotalLeg(legA) ? legA : isGameTotalLeg(legB) ? legB : null;
    const bttsLeg = isSoccerBttsLeg(legA) ? legA : isSoccerBttsLeg(legB) ? legB : null;
    if (!totalLeg || !bttsLeg) return null;

    const totalDirection = resolveDirection(totalLeg);
    const bttsSide = normalizeText(bttsLeg.side);
    if (
        (totalDirection !== "over" && totalDirection !== "under") ||
        (bttsSide !== "yes" && bttsSide !== "no")
    ) {
        return null;
    }

    if (
        (bttsSide === "yes" && totalDirection === "over") ||
        (bttsSide === "no" && totalDirection === "under")
    ) {
        return bttsSide === "yes" ? 0.17 : 0.08;
    }

    return bttsSide === "yes" ? -0.12 : -0.07;
};

const classifySoccerPairWeight = (legA: SlipLeg, legB: SlipLeg) => {
    const categoryA = soccerPlayerCategory(legA);
    const categoryB = soccerPlayerCategory(legB);

    if (samePlayer(legA, legB) && categoryA && categoryB) {
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<SoccerPlayerCategory>(["goals"]),
                new Set<SoccerPlayerCategory>(["shots_on_target"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.22);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<SoccerPlayerCategory>(["goals"]),
                new Set<SoccerPlayerCategory>(["shots"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.18);
        }
        if (
            pairMatches(
                categoryA,
                categoryB,
                new Set<SoccerPlayerCategory>(["shots"]),
                new Set<SoccerPlayerCategory>(["shots_on_target"])
            )
        ) {
            return positiveOverUnderWeight(legA, legB, 0.2);
        }

        return positiveOverUnderWeight(
            legA,
            legB,
            categoryA === "goals" || categoryB === "goals" ? 0.12 : 0.08
        );
    }

    return (
        derivativeWeight(legA, legB) ??
        middleWindowWeight(legA, legB) ??
        soccerResultPlayerWeight(legA, legB) ??
        soccerResultPlayerWeight(legB, legA) ??
        soccerTeamTotalPlayerWeight(legA, legB) ??
        soccerTeamTotalPlayerWeight(legB, legA) ??
        soccerGameTotalPlayerWeight(legA, legB) ??
        soccerGameTotalPlayerWeight(legB, legA) ??
        soccerBttsSelectionWeight(legA, legB) ??
        soccerBttsSelectionWeight(legB, legA) ??
        soccerGameTotalBttsWeight(legA, legB) ??
        teamTotalGameTotalWeight(legA, legB) ??
        lineTotalWeight(legA, legB) ??
        (legA.entityType === "player" &&
            legB.entityType === "player" &&
            categoryA &&
            categoryB &&
            !samePlayer(legA, legB) &&
            sameTeam(legA, legB)
            ? positiveOverUnderWeight(legA, legB, categoryA === "goals" || categoryB === "goals" ? 0.08 : 0.05)
            : null) ??
        0.02
    );
};

const estimateNbaGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(legs, classifyNbaPairWeight, {
        negativeFloor: NEGATIVE_WEIGHT_FLOOR,
        positiveCap: POSITIVE_WEIGHT_CAP,
        minGroupWeight: -0.35,
        maxGroupWeight: 0.45,
    });

const estimateNcaabGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(
        legs,
        (legA, legB) => classifyNbaPairWeight(legA, legB) * 0.9,
        {
            negativeFloor: 0.67,
            positiveCap: 0.982,
            minGroupWeight: -0.33,
            maxGroupWeight: 0.42,
        }
    );

const estimateMlbGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(legs, classifyMlbPairWeight, {
        negativeFloor: 0.7,
        positiveCap: 0.98,
        minGroupWeight: -0.3,
        maxGroupWeight: 0.38,
    });

const estimateNhlGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(legs, classifyNhlPairWeight, {
        negativeFloor: 0.72,
        positiveCap: 0.979,
        minGroupWeight: -0.28,
        maxGroupWeight: 0.34,
    });

const estimateNflGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(legs, classifyNflPairWeight, {
        negativeFloor: 0.68,
        positiveCap: 0.983,
        minGroupWeight: -0.32,
        maxGroupWeight: 0.4,
    });

const estimateSoccerGroupOdds = (legs: PriceableSlipLeg[]) =>
    estimateWeightedGroupOdds(legs, classifySoccerPairWeight, {
        negativeFloor: 0.74,
        positiveCap: 0.98,
        minGroupWeight: -0.26,
        maxGroupWeight: 0.34,
    });

const quoteCustomPricingGroup = (legs: PriceableSlipLeg[]) => {
    if (legs.length === 0) return null;
    const normalizedSport = sportToken(legs[0]);
    if (legs.some((leg) => sportToken(leg) !== normalizedSport)) return null;

    if (normalizedSport === "nba") {
        return estimateNbaGroupOdds(legs);
    }

    if (normalizedSport === "ncaab") {
        return estimateNcaabGroupOdds(legs);
    }

    if (normalizedSport === "mlb") {
        return estimateMlbGroupOdds(legs);
    }

    if (normalizedSport === "nhl") {
        return estimateNhlGroupOdds(legs);
    }

    if (normalizedSport === "nfl") {
        return estimateNflGroupOdds(legs);
    }

    if (normalizedSport === "soccer") {
        return estimateSoccerGroupOdds(legs);
    }

    return combineParlayOdds(legs);
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
