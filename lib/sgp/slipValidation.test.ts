import { describe, expect, it } from "vitest";
import {
    DEFAULT_VALIDATION_CONFIG,
    prepareSlipPricing,
    validateSlip,
    type SlipLeg,
} from "./slipValidation";

const hasCustomGroup = (groups: string[][], expectedIds: string[]) =>
    groups.some(
        (group) =>
            group.length === expectedIds.length && expectedIds.every((legId) => group.includes(legId))
    );

const makePlayerLeg = (overrides: Partial<SlipLeg> = {}): SlipLeg => {
    const playerId = overrides.playerId ?? "player-1";
    const teamId = overrides.teamId ?? "team-a";
    return {
        id: overrides.id ?? "leg-1",
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
            : 20.5,
        altLine: Object.prototype.hasOwnProperty.call(overrides, "altLine")
            ? (overrides.altLine ?? null)
            : null,
        impliedBy: overrides.impliedBy,
        containsComponents: overrides.containsComponents,
        sameGameEligible: overrides.sameGameEligible ?? true,
    };
};

const makeTeamLeg = (overrides: Partial<SlipLeg> = {}): SlipLeg => {
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
        outcomeFamily: overrides.outcomeFamily,
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
    };
};

const makeGameLeg = (overrides: Partial<SlipLeg> = {}): SlipLeg => {
    const eventId = overrides.eventId ?? "event-1";
    return {
        id: overrides.id ?? "game-leg-1",
        eventId,
        sport: overrides.sport ?? "NBA",
        league: overrides.league,
        marketType: overrides.marketType ?? "Total Points",
        marketFamily: overrides.marketFamily ?? "Total Points",
        outcomeFamily: overrides.outcomeFamily,
        entityType: overrides.entityType ?? "game",
        entityId: overrides.entityId ?? eventId,
        teamId: overrides.teamId,
        opponentTeamId: overrides.opponentTeamId,
        playerId: overrides.playerId,
        statType: overrides.statType ?? "total_points",
        timeScope: overrides.timeScope ?? "full_game",
        side: overrides.side ?? "Over",
        selection: overrides.selection ?? "Over",
        line: Object.prototype.hasOwnProperty.call(overrides, "line")
            ? (overrides.line ?? undefined)
            : 220.5,
        altLine: Object.prototype.hasOwnProperty.call(overrides, "altLine")
            ? (overrides.altLine ?? null)
            : null,
        impliedBy: overrides.impliedBy,
        containsComponents: overrides.containsComponents,
        sameGameEligible: overrides.sameGameEligible ?? true,
    };
};

describe("validateSlip", () => {
    it("treats same player ladder props as non-incremental", () => {
        const overThree = makePlayerLeg({
            id: "threes-3-plus",
            marketType: "Player Threes",
            marketFamily: "Player Threes",
            statType: "threes",
            line: 3,
            selection: "3+",
        });
        const overFour = makePlayerLeg({
            id: "threes-4-plus",
            marketType: "Player Threes",
            marketFamily: "Player Threes",
            statType: "threes",
            line: 4,
            selection: "4+",
        });

        const result = validateSlip([overThree, overFour]);
        expect(result.blockedLegIds).toHaveLength(0);
        expect(result.nonIncrementalLegIds).toContain("threes-3-plus");
        expect(result.effectiveLegs.map((leg) => leg.id)).toEqual(["threes-4-plus"]);
    });

    it("keeps only the stricter same player points ladder for pricing", () => {
        const overTwenty = makePlayerLeg({ id: "points-20", line: 20, selection: "20+" });
        const overTwentyFive = makePlayerLeg({ id: "points-25", line: 25, selection: "25+" });

        const result = validateSlip([overTwenty, overTwentyFive]);
        expect(result.nonIncrementalLegIds).toContain("points-20");
        expect(result.effectiveLegs.map((leg) => leg.id)).toEqual(["points-25"]);
    });

    it("blocks opposite moneylines from the same game", () => {
        const homeMl = makeTeamLeg({ id: "home-ml", side: "home" });
        const awayMl = makeTeamLeg({ id: "away-ml", side: "away" });

        const result = validateSlip([homeMl, awayMl]);
        expect(result.overallStatus).toBe("blocked");
        expect(result.blockedLegIds).toEqual(expect.arrayContaining(["home-ml", "away-ml"]));
    });

    it("blocks over and under on the same total threshold", () => {
        const over = makeGameLeg({ id: "total-over", side: "Over", line: 220.5 });
        const under = makeGameLeg({ id: "total-under", side: "Under", line: 220.5 });

        const result = validateSlip([over, under]);
        expect(result.overallStatus).toBe("blocked");
        expect(result.blockedLegIds).toEqual(expect.arrayContaining(["total-over", "total-under"]));
    });

    it("allows moneyline plus opposing spread with a middle window as custom-priced", () => {
        const homeMl = makeTeamLeg({ id: "home-ml", side: "home" });
        const awayPlus = makeTeamLeg({
            id: "away-plus-7-5",
            side: "away",
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            statType: "spread",
            line: 7.5,
        });

        const result = validateSlip([homeMl, awayPlus], DEFAULT_VALIDATION_CONFIG);
        expect(result.overallStatus).toBe("valid_with_adjustments");
        expect(result.blockedLegIds).toHaveLength(0);
        expect(hasCustomGroup(result.customPricingGroups, ["home-ml", "away-plus-7-5"])).toBe(true);
    });

    it("blocks moneyline plus opposing spread with no overlap window", () => {
        const homeMl = makeTeamLeg({ id: "home-ml", side: "home" });
        const awayMinus = makeTeamLeg({
            id: "away-minus-3-5",
            side: "away",
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            statType: "spread",
            line: -3.5,
        });

        const result = validateSlip([homeMl, awayMinus]);
        expect(result.overallStatus).toBe("blocked");
        expect(result.blockedLegIds).toEqual(
            expect.arrayContaining(["home-ml", "away-minus-3-5"])
        );
    });

    it("allows spread middle opportunities as custom-priced", () => {
        const homeMinus = makeTeamLeg({
            id: "home-minus-2-5",
            side: "home",
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            statType: "spread",
            line: -2.5,
        });
        const awayPlus = makeTeamLeg({
            id: "away-plus-7-5",
            side: "away",
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            statType: "spread",
            line: 7.5,
        });

        const result = validateSlip([homeMinus, awayPlus]);
        expect(result.blockedLegIds).toHaveLength(0);
        expect(hasCustomGroup(result.customPricingGroups, ["home-minus-2-5", "away-plus-7-5"])).toBe(true);
    });

    it("collapses an exact duplicate leg by default", () => {
        const first = makePlayerLeg({ id: "dup-a" });
        const second = makePlayerLeg({ id: "dup-b" });

        const result = validateSlip([first, second]);
        expect(result.collapsedMap).toEqual({ "dup-b": "dup-a" });
        expect(result.effectiveLegs.map((leg) => leg.id)).toEqual(["dup-a"]);
    });

    it("treats anytime TD and over 0.5 TD as the same underlying outcome", () => {
        const anytime = makePlayerLeg({
            id: "anytime-td",
            sport: "NFL",
            marketType: "Anytime TD",
            marketFamily: "Anytime TD",
            statType: "touchdowns",
            side: "yes",
            selection: "Anytime",
            line: undefined,
        });
        const overHalf = makePlayerLeg({
            id: "over-half-td",
            sport: "NFL",
            marketType: "Player Touchdowns",
            marketFamily: "Player Touchdowns",
            statType: "touchdowns",
            side: "Over",
            selection: "Over",
            line: 0.5,
        });

        const result = validateSlip([anytime, overHalf]);
        expect(result.collapsedMap).toEqual({ "over-half-td": "anytime-td" });
        expect(result.effectiveLegs.map((leg) => leg.id)).toEqual(["anytime-td"]);
    });

    it("marks combo ingredients as non-incremental or collapsed", () => {
        const combo = makeGameLeg({
            id: "combo-leg",
            marketType: "Player 25+ points and team to win",
            marketFamily: "Combo",
            outcomeFamily: "combo",
            entityType: "combo",
            entityId: "combo-1",
            statType: "combo",
            selection: "combo",
            side: undefined,
            line: undefined,
            containsComponents: [
                {
                    entityType: "player",
                    entityId: "player-1",
                    statType: "points",
                    timeScope: "full_game",
                    side: "over",
                    line: 25,
                    marketType: "Player Points",
                },
            ],
        });
        const ingredient = makePlayerLeg({
            id: "points-25",
            line: 25,
            selection: "25+",
        });

        const result = validateSlip([combo, ingredient]);
        expect(result.nonIncrementalLegIds.includes("points-25") || result.collapsedMap["points-25"] === "combo-leg").toBe(true);
    });

    it("allows same-player different stats in the same game and routes them to custom pricing", () => {
        const points = makePlayerLeg({ id: "points", statType: "points", marketType: "Player Points", marketFamily: "Player Points", line: 25, selection: "25+" });
        const assists = makePlayerLeg({ id: "assists", statType: "assists", marketType: "Player Assists", marketFamily: "Player Assists", line: 5, selection: "5+" });
        const rebounds = makePlayerLeg({ id: "rebounds", statType: "rebounds", marketType: "Player Rebounds", marketFamily: "Player Rebounds", line: 8, selection: "8+" });

        const result = validateSlip([points, assists, rebounds]);
        expect(result.blockedLegIds).toHaveLength(0);
        expect(result.nonIncrementalLegIds).toHaveLength(0);
        expect(result.collapsedMap).toEqual({});
        expect(hasCustomGroup(result.customPricingGroups, ["points", "assists", "rebounds"])).toBe(true);
    });

    it("blocks same-player opposite outcomes on the same stat", () => {
        const over = makePlayerLeg({ id: "points-over", line: 24.5, side: "Over" });
        const under = makePlayerLeg({ id: "points-under", line: 24.5, side: "Under", selection: "Under" });

        const result = validateSlip([over, under]);
        expect(result.overallStatus).toBe("blocked");
        expect(result.blockedLegIds).toEqual(expect.arrayContaining(["points-over", "points-under"]));
    });

    it("treats different-game legs as independent parlay legs", () => {
        const first = makePlayerLeg({ id: "game-1", eventId: "event-1" });
        const second = makePlayerLeg({ id: "game-2", eventId: "event-2" });

        const result = validateSlip([first, second]);
        expect(result.overallStatus).toBe("valid");
        expect(result.customPricingGroups).toEqual([]);
        expect(result.pairDecisions[0]?.status).toBe("valid_parlay_leg");
    });

    it("routes full-game and partial-game derivatives to custom pricing", () => {
        const fullGameOver = makeGameLeg({ id: "full-game-over", timeScope: "full_game", line: 220.5 });
        const firstHalfOver = makeGameLeg({
            id: "first-half-over",
            timeScope: "first_half",
            marketType: "1st Half Total Points",
            marketFamily: "Total Points",
            line: 110.5,
        });

        const result = validateSlip([fullGameOver, firstHalfOver]);
        expect(result.blockedLegIds).toHaveLength(0);
        expect(hasCustomGroup(result.customPricingGroups, ["full-game-over", "first-half-over"])).toBe(true);
    });

    it("keeps the stricter under ladder leg as the only pricing leg", () => {
        const underTwenty = makePlayerLeg({
            id: "under-20-5",
            side: "Under",
            selection: "Under",
            line: 20.5,
        });
        const underFifteen = makePlayerLeg({
            id: "under-15-5",
            side: "Under",
            selection: "Under",
            line: 15.5,
        });

        const result = validateSlip([underTwenty, underFifteen]);
        expect(result.nonIncrementalLegIds).toContain("under-20-5");
        expect(result.effectiveLegs.map((leg) => leg.id)).toEqual(["under-15-5"]);
    });
});

describe("prepareSlipPricing", () => {
    it("marks nested ladders as an invalid combo instead of pricing the stricter subset", () => {
        const overThree = makePlayerLeg({
            id: "threes-3-plus",
            marketType: "Player Threes",
            marketFamily: "Player Threes",
            statType: "threes",
            line: 3,
            selection: "3+",
        });
        const overFour = makePlayerLeg({
            id: "threes-4-plus",
            marketType: "Player Threes",
            marketFamily: "Player Threes",
            statType: "threes",
            line: 4,
            selection: "4+",
        });

        const result = prepareSlipPricing([overThree, overFour]);
        expect(result.canBuildCombo).toBe(false);
        expect(result.hasInvalidComboLegs).toBe(true);
        expect(result.canUseStandardParlayPricing).toBe(false);
        expect(result.pricingLegs).toEqual([]);
        expect(result.invalidComboLegIds).toEqual(
            expect.arrayContaining(["threes-3-plus", "threes-4-plus"])
        );
    });

    it("treats same-game correlated picks as a valid combo that still needs custom pricing", () => {
        const points = makePlayerLeg({
            id: "points",
            statType: "points",
            marketType: "Player Points",
            marketFamily: "Player Points",
            line: 25,
            selection: "25+",
        });
        const assists = makePlayerLeg({
            id: "assists",
            statType: "assists",
            marketType: "Player Assists",
            marketFamily: "Player Assists",
            line: 5,
            selection: "5+",
        });

        const result = prepareSlipPricing([points, assists]);
        expect(result.canBuildCombo).toBe(true);
        expect(result.hasInvalidComboLegs).toBe(false);
        expect(result.requiresCustomPricing).toBe(true);
        expect(result.canUseStandardParlayPricing).toBe(false);
    });

    it("marks team-outcome nesting as an invalid combo attempt", () => {
        const homeMl = makeTeamLeg({
            id: "home-ml",
            side: "home",
            marketType: "Moneyline",
            marketFamily: "Moneyline",
            statType: "moneyline",
            line: undefined,
        });
        const homeMinus = makeTeamLeg({
            id: "home-minus-2-5",
            side: "home",
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            statType: "spread",
            line: -2.5,
        });

        const result = prepareSlipPricing([homeMl, homeMinus]);
        expect(result.canBuildCombo).toBe(false);
        expect(result.hasInvalidComboLegs).toBe(true);
        expect(result.invalidComboLegIds).toEqual(
            expect.arrayContaining(["home-ml", "home-minus-2-5"])
        );
    });
});