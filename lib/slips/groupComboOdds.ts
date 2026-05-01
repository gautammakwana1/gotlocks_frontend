import { quoteSlipOdds, type PriceableSlipLeg } from "@/lib/sgp/comboPricing";
import type { SlipSide, SlipTimeScope } from "@/lib/sgp/slipValidation";
import { getSlipConflictWarningMode } from "@/lib/slips/state";
import { parseAmericanOdds } from "@/lib/utils/scoring";
import { ArchiveLeaderboardSlip, Pick, PickLeg, PickSelectionMeta, Slip } from "../interfaces/interfaces";

export type GroupComboOddsSummary = {
    label: string;
    americanOdds: number;
    isEstimated: boolean;
    legCount: number;
};

const TIME_SCOPE_TOKENS: SlipTimeScope[] = [
    "full_game",
    "first_half",
    "second_half",
    "first_quarter",
    "second_quarter",
    "third_quarter",
    "fourth_quarter",
    "first_period",
    "second_period",
    "third_period",
    "first_inning",
    "second_inning",
    "third_inning",
    "fourth_inning",
    "fifth_inning",
    "sixth_inning",
    "seventh_inning",
    "eighth_inning",
    "ninth_inning",
    "first_three_innings",
    "first_five_innings",
    "first_seven_innings",
    "live_segment",
];

const normalizeText = (value?: string | null) =>
    value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const normalizeSide = (side?: string | null): SlipSide | undefined => {
    const token = normalizeText(side);
    if (token === "home") return "home";
    if (token === "away") return "away";
    if (token === "over") return "Over";
    if (token === "under") return "Under";
    if (token === "yes") return "yes";
    if (token === "no") return "no";
    return undefined;
};

const inferTimeScope = (value?: string | null): SlipTimeScope => {
    const token = normalizeText(value);
    if (token === "full_game" || token === "game_line" || token === "player_prop") {
        return "full_game";
    }
    const underscoredToken = token.replace(/\s+/g, "_");
    if (TIME_SCOPE_TOKENS.includes(underscoredToken as SlipTimeScope)) {
        return underscoredToken as SlipTimeScope;
    }
    if (token.startsWith("1st 3 innings")) return "first_three_innings";
    if (token.startsWith("1st 5 innings")) return "first_five_innings";
    if (token.startsWith("1st 7 innings")) return "first_seven_innings";
    if (token.startsWith("1st half")) return "first_half";
    if (token.startsWith("2nd half")) return "second_half";
    if (token.startsWith("1st quarter")) return "first_quarter";
    if (token.startsWith("2nd quarter")) return "second_quarter";
    if (token.startsWith("3rd quarter")) return "third_quarter";
    if (token.startsWith("4th quarter")) return "fourth_quarter";
    if (token.startsWith("1st period")) return "first_period";
    if (token.startsWith("2nd period")) return "second_period";
    if (token.startsWith("3rd period")) return "third_period";
    if (token.startsWith("1st inning")) return "first_inning";
    if (token.startsWith("2nd inning")) return "second_inning";
    if (token.startsWith("3rd inning")) return "third_inning";
    if (token.startsWith("4th inning")) return "fourth_inning";
    if (token.startsWith("5th inning")) return "fifth_inning";
    if (token.startsWith("6th inning")) return "sixth_inning";
    if (token.startsWith("7th inning")) return "seventh_inning";
    if (token.startsWith("8th inning")) return "eighth_inning";
    if (token.startsWith("9th inning")) return "ninth_inning";
    return "full_game";
};

const inferEntityType = (
    selection: PickSelectionMeta,
    market?: string | null
): PriceableSlipLeg["entityType"] => {
    if (selection.playerId) return "player";
    if (selection.teamId) return "team";

    const marketToken = normalizeText(market);
    if (
        marketToken.includes("moneyline") ||
        marketToken.includes("spread") ||
        marketToken.includes("team total") ||
        marketToken.includes("puck line") ||
        marketToken.includes("run line") ||
        marketToken.includes("handicap")
    ) {
        return "team";
    }

    return "game";
};

const toPriceableLeg = ({
    id,
    description,
    odds,
    selection,
    sport,
}: {
    id: string;
    description: string;
    odds: string | null | undefined;
    selection?: PickSelectionMeta;
    sport?: string;
}): PriceableSlipLeg | null => {
    const eventId = selection?.gameId?.trim();
    const americanOdds = parseAmericanOdds(odds);
    if (!selection || !eventId || americanOdds === null) return null;

    const marketType = selection?.market?.trim() || description.trim();
    if (!marketType) return null;

    const entityType = inferEntityType(selection, marketType);
    const line =
        typeof selection.threshold === "number" && Number.isFinite(selection.threshold)
            ? selection.threshold
            : undefined;

    return {
        id,
        eventId,
        sport: selection.sport ?? sport ?? "",
        marketType,
        marketFamily: marketType,
        entityType,
        entityId:
            entityType === "player"
                ? selection.playerId
                : entityType === "team"
                    ? selection.teamId
                    : eventId,
        teamId: selection.teamId,
        playerId: selection.playerId,
        timeScope: inferTimeScope(selection.scope ?? marketType),
        side: normalizeSide(selection.side),
        selection: description,
        line,
        altLine: normalizeText(marketType).includes("alt ") ? line : null,
        price: americanOdds,
    };
};

const pickToPriceableLegs = (pick: Pick): PriceableSlipLeg[] | null => {
    if (pick.legs?.length) {
        const legs = pick.legs.map((leg: PickLeg, index) =>
            toPriceableLeg({
                id: `${pick.id}:leg:${index}`,
                description: leg.description,
                odds: leg.odds_bracket,
                selection: leg.selection,
                sport: leg.selection?.sport ?? pick.sport,
            })
        );
        if (legs.some((leg) => leg === null)) return null;
        return legs as PriceableSlipLeg[];
    }

    const leg = toPriceableLeg({
        id: pick.id,
        description: pick.description,
        odds: pick.odds_bracket,
        selection: pick.selection,
        sport: pick.sport,
    });
    return leg ? [leg] : null;
};

export const formatAmericanOdds = (odds: string | number | null | undefined) => {
    const americanOdds = parseAmericanOdds(odds);
    if (americanOdds === null) {
        if (typeof odds === "string" && odds.trim()) return odds;
        return null;
    }
    return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`;
};

export const getGroupComboOddsSummary = (
    slip: Slip | ArchiveLeaderboardSlip | undefined,
    picks: Pick[]
): GroupComboOddsSummary | null => {
    if (!slip || getSlipConflictWarningMode(slip) !== "group_combo") return null;
    if (picks.length < 2) return null;

    const legGroups = picks.map(pickToPriceableLegs);
    if (legGroups.some((legs) => legs === null)) return null;

    const legs = legGroups.flatMap((group) => group ?? []);
    if (legs.length < 2) return null;

    const quote = quoteSlipOdds(legs);
    if (quote.americanOdds === null) return null;

    const label = formatAmericanOdds(quote.americanOdds);
    if (!label) return null;

    return {
        label,
        americanOdds: quote.americanOdds,
        isEstimated: quote.isEstimated,
        legCount: legs.length,
    };
};
