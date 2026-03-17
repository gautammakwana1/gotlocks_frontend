import { CachedReviewData } from "@/components/pick-builder/reviewSheetState";
import {
    DEFAULT_VALIDATION_CONFIG,
    prepareSlipPricing,
    validateSlip,
    type PricingPrepResult,
    type SlipEntityType,
    type SlipLeg,
    type SlipSide,
    type SlipTimeScope,
    type SlipValidationResult,
    type ValidationConfig,
} from "./slipValidation";
import { OddsEvent, OddsOdd, OddsTeam } from "../interfaces/interfaces";

export type {
    PairDecision,
    PricingPrepResult,
    SlipEntityType,
    SlipLeg,
    SlipSide,
    SlipTimeScope,
    SlipValidationResult,
    SlipValidationStatus,
    ValidationConfig,
} from "./slipValidation";

export { DEFAULT_VALIDATION_CONFIG, classifyLegPair, prepareSlipPricing, validateSlip } from "./slipValidation";

export type ParlayLeg = SlipLeg & {
    matchup?: string;
    startTime?: string;
    market: string;
    displayName: string;
    price: string;
    sgp: string;
    bookMarketId: string;
    bookSelectionId: string;
    marketKey: string;
    familyKey: string;
    teamKey?: string;
    cachedReview?: CachedReviewData;
    periodKey:
    | "1st Half"
    | "2nd Half"
    | "1st Quarter"
    | "2nd Quarter"
    | "3rd Quarter"
    | "4th Quarter"
    | "Full Game";
};

export type ValidateLegResult =
    | { ok: true; validation: SlipValidationResult; pricing: PricingPrepResult }
    | { ok: false; reason: string; conflictLegId?: string; validation: SlipValidationResult; pricing: PricingPrepResult };

const normalizeText = (value?: string | null) =>
    value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const parseBookIdsFromLink = (link: string) => {
    try {
        const url = new URL(link);
        return {
            marketId: url.searchParams.get("marketId"),
            selectionId: url.searchParams.get("selectionId"),
        };
    } catch {
        return { marketId: null, selectionId: null };
    }
};

const timeScopeFromMarket = (market: string): SlipTimeScope => {
    const trimmed = market.trim();
    if (trimmed.startsWith("1st Half")) return "first_half";
    if (trimmed.startsWith("2nd Half")) return "second_half";
    if (trimmed.startsWith("1st Quarter")) return "first_quarter";
    if (trimmed.startsWith("2nd Quarter")) return "second_quarter";
    if (trimmed.startsWith("3rd Quarter")) return "third_quarter";
    if (trimmed.startsWith("4th Quarter")) return "fourth_quarter";
    return "full_game";
};

const periodKeyFromTimeScope = (timeScope: SlipTimeScope): ParlayLeg["periodKey"] => {
    if (timeScope === "first_half") return "1st Half";
    if (timeScope === "second_half") return "2nd Half";
    if (timeScope === "first_quarter") return "1st Quarter";
    if (timeScope === "second_quarter") return "2nd Quarter";
    if (timeScope === "third_quarter") return "3rd Quarter";
    if (timeScope === "fourth_quarter") return "4th Quarter";
    return "Full Game";
};

const marketFamilyFromMarket = (market: string) =>
    market
        .replace(
            /^(1st Half|2nd Half|1st Quarter|2nd Quarter|3rd Quarter|4th Quarter|1st Period|2nd Period|3rd Period)\s+/i,
            ""
        )
        .replace(/^Alt\s+/i, "")
        .trim();

const marketScopePrefixFromMarket = (market: string) => {
    const match = market
        .trim()
        .match(
            /^(1st Half|2nd Half|1st Quarter|2nd Quarter|3rd Quarter|4th Quarter|1st Period|2nd Period|3rd Period)\b/i
        );
    return match?.[1] ?? "";
};

const normalizeDisplayMarketFamily = (marketFamily: string) =>
    marketFamily.replace(/\bPoint Spread\b/i, "Spread").trim();

const formatSignedLine = (line?: number | null) => {
    if (typeof line !== "number" || !Number.isFinite(line)) return "";
    return line > 0 ? `+${line}` : `${line}`;
};

const buildTeamOutcomeDisplayName = ({
    baseName,
    lineLabel,
    suffix,
}: {
    baseName: string;
    lineLabel?: string;
    suffix: string;
}) => {
    const trimmedBaseName = baseName.trim();
    const trimmedSuffix = suffix.trim();

    if (!trimmedBaseName) return trimmedSuffix;
    if (trimmedBaseName.toLowerCase().endsWith(trimmedSuffix.toLowerCase())) {
        return trimmedBaseName;
    }
    if (lineLabel && trimmedBaseName.includes(lineLabel)) {
        return `${trimmedBaseName} ${trimmedSuffix}`.trim();
    }
    return `${trimmedBaseName}${lineLabel ? ` ${lineLabel}` : ""} ${trimmedSuffix}`.trim();
};

const buildLegDisplayName = (odd: OddsOdd) => {
    const marketFamily = marketFamilyFromMarket(odd.market);
    const scopePrefix = marketScopePrefixFromMarket(odd.market);
    const baseLabel = (odd.selection?.name ?? odd.name).trim();
    const lineLabel = formatSignedLine(odd.selection?.line);

    if (/moneyline/i.test(marketFamily)) {
        const suffix = scopePrefix ? `${scopePrefix} ${marketFamily}` : marketFamily;
        return buildTeamOutcomeDisplayName({ baseName: baseLabel, suffix });
    }

    if (/point spread/i.test(marketFamily)) {
        const spreadLabel = normalizeDisplayMarketFamily(marketFamily);
        const suffix = scopePrefix ? `${scopePrefix} ${spreadLabel}` : spreadLabel;
        return buildTeamOutcomeDisplayName({ baseName: baseLabel, lineLabel, suffix });
    }

    if (/puck line/i.test(marketFamily) || /run line/i.test(marketFamily)) {
        const suffix = scopePrefix ? `${scopePrefix} ${marketFamily}` : marketFamily;
        return buildTeamOutcomeDisplayName({ baseName: baseLabel, lineLabel, suffix });
    }

    return odd.name;
};

const statTypeFromMarket = (market: string) => {
    const token = normalizeText(marketFamilyFromMarket(market));
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
    if (token.includes("moneyline")) return "moneyline";
    if (token.includes("spread")) return "spread";
    if (token.includes("team total")) return "team_total";
    if (token.includes("total")) return "total_points";
    if (token.includes("touchdown")) return "touchdowns";
    if (token.includes("hits")) return "hits";
    if (token.includes("exact score")) return "exact_score";
    if (token.includes("first basket")) return "first_basket";
    return token;
};

const outcomeFamilyFromMarket = (market: string) => {
    const token = normalizeText(marketFamilyFromMarket(market));
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

const selectionMatchesTeam = (selectionName: string, team: OddsTeam) => {
    const token = normalizeText(selectionName);
    if (!token) return false;
    const teamName = normalizeText(team.name);
    const abbr = normalizeText(team.abbreviation);
    return token === teamName || token.includes(teamName) || (abbr ? token.startsWith(abbr) : false);
};

const resolveTeamContext = (event: OddsEvent, odd: OddsOdd) => {
    const selectionName = odd.selection?.name ?? odd.name;
    const marketName = normalizeText(odd.market);
    if (selectionMatchesTeam(selectionName, event.teams.home)) {
        return {
            teamId: event.teams.home.id,
            opponentTeamId: event.teams.away.id,
            side: "home" as SlipSide,
        };
    }
    if (selectionMatchesTeam(selectionName, event.teams.away)) {
        return {
            teamId: event.teams.away.id,
            opponentTeamId: event.teams.home.id,
            side: "away" as SlipSide,
        };
    }
    if (marketName.includes("home team")) {
        return {
            teamId: event.teams.home.id,
            opponentTeamId: event.teams.away.id,
            side: "home" as SlipSide,
        };
    }
    if (marketName.includes("away team")) {
        return {
            teamId: event.teams.away.id,
            opponentTeamId: event.teams.home.id,
            side: "away" as SlipSide,
        };
    }
    return {
        teamId: undefined,
        opponentTeamId: undefined,
        side: undefined,
    };
};

const sideFromSelection = (event: OddsEvent, odd: OddsOdd, marketFamily: string): SlipSide | undefined => {
    const rawSide = normalizeText(odd.selection?.side);
    if (rawSide === "over" || rawSide === "under" || rawSide === "yes" || rawSide === "no") {
        return rawSide as SlipSide;
    }

    if (
        marketFamily.toLowerCase().includes("moneyline") ||
        marketFamily.toLowerCase().includes("spread")
    ) {
        return resolveTeamContext(event, odd).side;
    }

    return undefined;
};

const entityTypeFromOdd = (event: OddsEvent, odd: OddsOdd, marketFamily: string): SlipEntityType => {
    if (odd.player) return "player";
    if (normalizeText(marketFamily).includes("combo")) return "combo";

    const teamContext = resolveTeamContext(event, odd);
    if (
        teamContext.teamId &&
        (marketFamily.toLowerCase().includes("moneyline") ||
            marketFamily.toLowerCase().includes("spread") ||
            marketFamily.toLowerCase().includes("team total"))
    ) {
        return "team";
    }

    return "game";
};

export const normalizeOddToLeg = (event: OddsEvent, odd: OddsOdd): ParlayLeg => {
    const { marketId, selectionId } = parseBookIdsFromLink(odd.links?.desktop ?? "");
    const bookMarketId = marketId ?? "";
    const bookSelectionId = selectionId ?? "";
    const marketFamily = marketFamilyFromMarket(odd.market);
    const statType = statTypeFromMarket(odd.market);
    const timeScope = timeScopeFromMarket(odd.market);
    const periodKey = periodKeyFromTimeScope(timeScope);
    const teamContext = resolveTeamContext(event, odd);
    const entityType = entityTypeFromOdd(event, odd, marketFamily);
    const side = sideFromSelection(event, odd, marketFamily);
    const entityId =
        entityType === "player"
            ? odd.player?.id
            : entityType === "team"
                ? teamContext.teamId
                : entityType === "game"
                    ? event.id
                    : odd.id;
    const familyEntityKey = odd.player?.id ?? teamContext.teamId ?? event.id;
    const marketKey = `${event.id}:${marketFamily}:${bookMarketId || odd.market}`;
    const familyKey = `${event.id}:${normalizeText(marketFamily)}:${familyEntityKey}:${timeScope}`;

    return {
        id: odd.id,
        eventId: event.id,
        sport: "",
        marketType: odd.market,
        marketFamily,
        outcomeFamily: outcomeFamilyFromMarket(odd.market),
        entityType,
        entityId,
        teamId: entityType === "player" ? odd.player?.team.id : teamContext.teamId,
        opponentTeamId: entityType === "player"
            ? odd.player?.team.id === event.teams.home.id
                ? event.teams.away.id
                : event.teams.home.id
            : teamContext.opponentTeamId,
        playerId: odd.player?.id,
        statType,
        timeScope,
        side,
        selection: odd.selection?.name ?? odd.name,
        line: odd.selection?.line ?? undefined,
        altLine: odd.main ? null : odd.selection?.line ?? null,
        impliedBy: [],
        containsComponents: undefined,
        sameGameEligible: Boolean(odd.sgp),
        matchup: `${event.teams.away.name} @ ${event.teams.home.name}`,
        startTime: event.date,
        market: odd.market,
        displayName: buildLegDisplayName(odd),
        price: odd.price,
        sgp: odd.sgp ?? "",
        bookMarketId,
        bookSelectionId,
        marketKey,
        familyKey,
        teamKey: teamContext.teamId,
        periodKey,
    };
};

const findBlockedDecisionForIncoming = (validation: SlipValidationResult, incomingLegId: string) =>
    validation.pairDecisions.find(
        (decision) =>
            (decision.status === "blocked_conflict" || decision.status === "blocked_impossible") &&
            (decision.legAId === incomingLegId || decision.legBId === incomingLegId)
    );

export const validateAddLeg = (
    existing: ParlayLeg[],
    incoming: ParlayLeg,
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidateLegResult => {
    const pricing = prepareSlipPricing([...existing, incoming], config);
    const blockedDecision = findBlockedDecisionForIncoming(pricing.validation, incoming.id);

    if (blockedDecision) {
        return {
            ok: false,
            reason: blockedDecision.reason,
            conflictLegId:
                blockedDecision.legAId === incoming.id ? blockedDecision.legBId : blockedDecision.legAId,
            validation: pricing.validation,
            pricing,
        };
    }

    return {
        ok: true,
        validation: pricing.validation,
        pricing,
    };
};

export const validateParlayWithApi = async (
    legs: ParlayLeg[]
): Promise<{ ok: boolean; reason?: string; validation?: SlipValidationResult }> => {
    const validation = validateSlip(legs);
    if (validation.blockedLegIds.length > 0) {
        return {
            ok: false,
            reason: validation.userMessages[0] ?? "These selections can’t be combined.",
            validation,
        };
    }
    return { ok: true, validation };
};
