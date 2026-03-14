import { describe, expect, it } from "vitest";
import { combineParlayOdds, quoteSlipOdds, type PriceableSlipLeg } from "./comboPricing";

const americanToProbability = (american: number) =>
    american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);

const makePlayerLeg = (
    overrides: Partial<PriceableSlipLeg> = {}
): PriceableSlipLeg => {
    const playerId = overrides.playerId ?? "player-1";
    const teamId = overrides.teamId ?? "team-a";
    return {
        id: overrides.id ?? "player-leg-1",
        eventId: overrides.eventId ?? "event-1",
        sport: overrides.sport ?? "NBA",
        league: overrides.league,
        marketType: overrides.marketType ?? "Player Points",
        marketFamily: overrides.marketFamily ?? "Player Points",
        outcomeFamily: overrides.outcomeFamily,
        entityType: overrides.entityType ?? "player",
        entityId: overrides.entityId ?? playerId,
        teamId,
        opponentTeamId: overrides.opponentTeamId ?? "team-b",
        playerId,
        statType: overrides.statType ?? "points",
        timeScope: overrides.timeScope ?? "full_game",
        side: overrides.side ?? "Over",
        selection: overrides.selection ?? "Over",
        line: Object.prototype.hasOwnProperty.call(overrides, "line")
            ? (overrides.line ?? undefined)
            : 24.5,
        altLine: Object.prototype.hasOwnProperty.call(overrides, "altLine")
            ? (overrides.altLine ?? null)
            : null,
        impliedBy: overrides.impliedBy,
        containsComponents: overrides.containsComponents,
        sameGameEligible: overrides.sameGameEligible ?? true,
        price: overrides.price ?? "-110",
    };
};

const makeTeamLeg = (overrides: Partial<PriceableSlipLeg> = {}): PriceableSlipLeg => {
    const side = overrides.side ?? "home";
    const teamId = overrides.teamId ?? (side === "away" ? "team-b" : "team-a");
    const opponentTeamId = overrides.opponentTeamId ?? (teamId === "team-a" ? "team-b" : "team-a");
    return {
        id: overrides.id ?? "team-leg-1",
        eventId: overrides.eventId ?? "event-1",
        sport: overrides.sport ?? "NBA",
        league: overrides.league,
        marketType: overrides.marketType ?? "Moneyline",
        marketFamily: overrides.marketFamily ?? "Moneyline",
        outcomeFamily: overrides.outcomeFamily ?? "moneyline",
        entityType: overrides.entityType ?? "team",
        entityId: overrides.entityId ?? teamId,
        teamId,
        opponentTeamId,
        playerId: overrides.playerId,
        statType: overrides.statType ?? "moneyline",
        timeScope: overrides.timeScope ?? "full_game",
        side,
        selection: overrides.selection ?? (side === "away" ? "Team B" : "Team A"),
        line: Object.prototype.hasOwnProperty.call(overrides, "line")
            ? (overrides.line ?? undefined)
            : undefined,
        altLine: Object.prototype.hasOwnProperty.call(overrides, "altLine")
            ? (overrides.altLine ?? null)
            : null,
        impliedBy: overrides.impliedBy,
        containsComponents: overrides.containsComponents,
        sameGameEligible: overrides.sameGameEligible ?? true,
        price: overrides.price ?? "-120",
    };
};

describe("quoteSlipOdds", () => {
    it("matches standard parlay pricing for independent legs", () => {
        const firstLeg = makeTeamLeg({
            id: "leg-a",
            eventId: "event-1",
            price: "-110",
        });
        const secondLeg = makeTeamLeg({
            id: "leg-b",
            eventId: "event-2",
            teamId: "team-c",
            opponentTeamId: "team-d",
            entityId: "team-c",
            price: "+120",
        });

        const quote = quoteSlipOdds([firstLeg, secondLeg]);
        const direct = combineParlayOdds([firstLeg, secondLeg]);

        expect(quote.isEstimated).toBe(false);
        expect(quote.americanOdds).toBe(direct);
    });

    it("returns estimated NBA odds for valid same-game player combos", () => {
        const points = makePlayerLeg({
            id: "points",
            eventId: "event-nba",
            playerId: "tatum",
            teamId: "bos",
            opponentTeamId: "nyk",
            marketType: "Player Points",
            marketFamily: "Player Points",
            statType: "points",
            line: 24.5,
            price: "-115",
        });
        const assists = makePlayerLeg({
            id: "assists",
            eventId: "event-nba",
            playerId: "tatum",
            teamId: "bos",
            opponentTeamId: "nyk",
            marketType: "Player Assists",
            marketFamily: "Player Assists",
            statType: "assists",
            line: 5.5,
            price: "-105",
        });

        const quote = quoteSlipOdds([points, assists]);
        const independent = combineParlayOdds([points, assists]);

        expect(quote.pricing.requiresCustomPricing).toBe(true);
        expect(quote.isEstimated).toBe(true);
        expect(quote.americanOdds).not.toBeNull();
        expect(independent).not.toBeNull();

        const estimatedProbability = americanToProbability(quote.americanOdds as number);
        const independentProbability = americanToProbability(independent as number);
        expect(estimatedProbability).toBeGreaterThan(independentProbability);
    });

    it("combines estimated NBA same-game groups with unrelated legs", () => {
        const points = makePlayerLeg({
            id: "points",
            eventId: "event-nba",
            playerId: "tatum",
            teamId: "bos",
            opponentTeamId: "nyk",
            marketType: "Player Points",
            marketFamily: "Player Points",
            statType: "points",
            price: "-110",
        });
        const rebounds = makePlayerLeg({
            id: "rebounds",
            eventId: "event-nba",
            playerId: "tatum",
            teamId: "bos",
            opponentTeamId: "nyk",
            marketType: "Player Rebounds",
            marketFamily: "Player Rebounds",
            statType: "rebounds",
            line: 7.5,
            price: "-105",
        });
        const unrelated = makeTeamLeg({
            id: "unrelated",
            eventId: "event-2",
            teamId: "lal",
            opponentTeamId: "chi",
            entityId: "lal",
            price: "+130",
        });

        const quote = quoteSlipOdds([points, rebounds, unrelated]);
        const independent = combineParlayOdds([points, rebounds, unrelated]);

        expect(quote.isEstimated).toBe(true);
        expect(quote.americanOdds).not.toBeNull();
        expect(independent).not.toBeNull();
        expect(americanToProbability(quote.americanOdds as number)).toBeGreaterThan(
            americanToProbability(independent as number)
        );
    });

    it("falls back to no quote for unsupported same-game sports", () => {
        const nhlFirst = makePlayerLeg({
            id: "nhl-points",
            sport: "NHL",
            marketType: "Player Points",
            marketFamily: "Player Points",
            statType: "points",
            eventId: "event-nhl",
            price: "-110",
        });
        const nhlSecond = makePlayerLeg({
            id: "nhl-assists",
            sport: "NHL",
            marketType: "Player Assists",
            marketFamily: "Player Assists",
            statType: "assists",
            eventId: "event-nhl",
            price: "-105",
        });

        const quote = quoteSlipOdds([nhlFirst, nhlSecond]);

        expect(quote.pricing.requiresCustomPricing).toBe(true);
        expect(quote.isEstimated).toBe(false);
        expect(quote.americanOdds).toBeNull();
    });

    it("does not quote invalid combos", () => {
        const overThree = makePlayerLeg({
            id: "threes-3-plus",
            marketType: "Player Threes Made",
            marketFamily: "Player Threes Made",
            statType: "threes",
            line: 3,
            selection: "3+",
            price: "-140",
        });
        const overFour = makePlayerLeg({
            id: "threes-4-plus",
            marketType: "Player Threes Made",
            marketFamily: "Player Threes Made",
            statType: "threes",
            line: 4,
            selection: "4+",
            price: "+110",
        });

        const quote = quoteSlipOdds([overThree, overFour]);

        expect(quote.pricing.canBuildCombo).toBe(false);
        expect(quote.americanOdds).toBeNull();
    });
});
