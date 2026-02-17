import { OddsEvent, OddsOdd, ParlayLeg } from "../interfaces/interfaces";

export type ValidateLegResult =
    | { ok: true }
    | { ok: false; reason: string; conflictLegId?: string };

const periodKeyFromMarket = (market: string): ParlayLeg["periodKey"] => {
    const trimmed = market.trim();
    if (trimmed.startsWith("1st Half")) return "1st Half";
    if (trimmed.startsWith("2nd Half")) return "2nd Half";
    if (trimmed.startsWith("1st Quarter")) return "1st Quarter";
    if (trimmed.startsWith("2nd Quarter")) return "2nd Quarter";
    if (trimmed.startsWith("3rd Quarter")) return "3rd Quarter";
    if (trimmed.startsWith("4th Quarter")) return "4th Quarter";
    return "Full Game";
};

const isMoneylineMarket = (market: string) =>
    market.toLowerCase().includes("moneyline");

const isPointSpreadMarket = (market: string) =>
    market.toLowerCase().includes("point spread");

const isAnytimeTdMarket = (market: string) =>
    market.toLowerCase().includes("player touchdowns");

export const parseBookIdsFromLink = (link: string) => {
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

export const normalizeOddToLeg = (event: OddsEvent, odd: OddsOdd): ParlayLeg => {
    const { marketId, selectionId } = parseBookIdsFromLink(odd.links?.desktop ?? "");
    const bookMarketId = marketId ?? "";
    const bookSelectionId = selectionId ?? "";
    const eventId = event.id;
    const marketKey = `${eventId}:${bookMarketId}`;
    const playerId = odd.player?.id;
    const familyKey = playerId
        ? `${eventId}:${odd.market}:player:${playerId}`
        : `${eventId}:${odd.market}`;
    const marketIsMoneyline = isMoneylineMarket(odd.market);
    const marketIsSpread = isPointSpreadMarket(odd.market);
    const teamKey = (marketIsMoneyline || marketIsSpread) && bookSelectionId
        ? bookSelectionId
        : undefined;
    const periodKey = periodKeyFromMarket(odd.market);

    return {
        id: odd.id,
        eventId,
        market: odd.market,
        displayName: odd.name,
        price: odd.price,
        sgp: odd.sgp ?? "",
        bookMarketId,
        bookSelectionId,
        playerId,
        line: odd.selection?.line,
        side: odd.selection?.side,
        marketKey,
        familyKey,
        teamKey,
        periodKey,
    };
};

export const validateAddLeg = (
    existing: ParlayLeg[],
    incoming: ParlayLeg
): ValidateLegResult => {
    const incomingIsAnytimeTd = isAnytimeTdMarket(incoming.market);
    if (incomingIsAnytimeTd && incoming.playerId) {
        const duplicatePlayer = existing.find(
            (leg) =>
                isAnytimeTdMarket(leg.market) &&
                leg.eventId === incoming.eventId &&
                leg.playerId === incoming.playerId
        );
        if (duplicatePlayer) {
            return {
                ok: false,
                reason: "You can only include one anytime TD line per player.",
                conflictLegId: duplicatePlayer.id,
            };
        }
    }

    const duplicate = existing.find(
        (leg) =>
            leg.id === incoming.id ||
            (leg.marketKey === incoming.marketKey &&
                leg.bookSelectionId &&
                incoming.bookSelectionId &&
                leg.bookSelectionId === incoming.bookSelectionId)
    );
    if (duplicate) {
        return {
            ok: false,
            reason: "That leg is already in your multipick.",
            conflictLegId: duplicate.id,
        };
    }

    const sameMarket = existing.find((leg) => leg.marketKey === incoming.marketKey);
    if (sameMarket) {
        const bothAnytimeTd = incomingIsAnytimeTd && isAnytimeTdMarket(sameMarket.market);
        if (!bothAnytimeTd) {
            return {
                ok: false,
                reason: "Only one outcome can be added from that market.",
                conflictLegId: sameMarket.id,
            };
        }
    }

    const sameFamily = existing.find(
        (leg) => leg.familyKey === incoming.familyKey && leg.marketKey !== incoming.marketKey
    );
    if (sameFamily) {
        return {
            ok: false,
            reason: "Pick a single line for that market.",
            conflictLegId: sameFamily.id,
        };
    }

    const incomingIsMoneyline = isMoneylineMarket(incoming.market);
    const incomingIsSpread = isPointSpreadMarket(incoming.market);
    const correlationConflict = existing.find((leg) => {
        const legIsMoneyline = isMoneylineMarket(leg.market);
        const legIsSpread = isPointSpreadMarket(leg.market);
        const isMix =
            (incomingIsMoneyline && legIsSpread) || (incomingIsSpread && legIsMoneyline);
        if (!isMix) return false;
        if (leg.eventId !== incoming.eventId) return false;
        if (leg.periodKey !== incoming.periodKey) return false;
        if (!leg.teamKey || !incoming.teamKey) return false;
        return leg.teamKey === incoming.teamKey;
    });

    if (correlationConflict) {
        return {
            ok: false,
            reason: "Moneyline and spread for the same team in the same period cannot be combined.",
            conflictLegId: correlationConflict.id,
        };
    }

    return { ok: true };
};

export const validateParlayWithApi = async (
    _legs: ParlayLeg[]
): Promise<{ ok: boolean; reason?: string }> => {
    return { ok: true };
};
