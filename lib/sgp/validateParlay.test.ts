import { describe, expect, it } from "vitest";
import { validateAddLeg, type ParlayLeg } from "./validateParlay";

const makeLeg = (overrides: Partial<ParlayLeg> = {}): ParlayLeg => ({
    id: overrides.id ?? "leg-1",
    eventId: overrides.eventId ?? "event-1",
    sport: overrides.sport ?? "NBA",
    marketType: overrides.marketType ?? "Player Points",
    marketFamily: overrides.marketFamily ?? "Player Points",
    entityType: overrides.entityType ?? "player",
    entityId: overrides.entityId ?? "player-1",
    teamId: overrides.teamId ?? "team-a",
    opponentTeamId: overrides.opponentTeamId ?? "team-b",
    playerId: overrides.playerId ?? "player-1",
    statType: overrides.statType ?? "points",
    timeScope: overrides.timeScope ?? "full_game",
    side: overrides.side ?? "Over",
    selection: overrides.selection ?? "Over",
    line: overrides.line ?? 20.5,
    altLine: overrides.altLine ?? null,
    impliedBy: overrides.impliedBy,
    containsComponents: overrides.containsComponents,
    sameGameEligible: overrides.sameGameEligible ?? true,
    matchup: overrides.matchup,
    startTime: overrides.startTime,
    market: overrides.market ?? overrides.marketType ?? "Player Points",
    displayName: overrides.displayName ?? "Player Points Over 20.5",
    price: overrides.price ?? "-110",
    sgp: overrides.sgp ?? "sgp-token",
    bookMarketId: overrides.bookMarketId ?? "market-1",
    bookSelectionId: overrides.bookSelectionId ?? "selection-1",
    marketKey: overrides.marketKey ?? "event-1:Player Points:market-1",
    familyKey: overrides.familyKey ?? "event-1:player_points:player-1:full_game",
    teamKey: overrides.teamKey ?? overrides.teamId ?? "team-a",
    periodKey: overrides.periodKey ?? "Full Game",
});

describe("validateAddLeg", () => {
    it("allows same-player different stats in the same game", () => {
        const existing = makeLeg({
            id: "points",
            marketType: "Player Points",
            marketFamily: "Player Points",
            statType: "points",
            line: 25,
        });
        const incoming = makeLeg({
            id: "assists",
            marketType: "Player Assists",
            marketFamily: "Player Assists",
            statType: "assists",
            line: 5,
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(true);
    });

    it("blocks same-player opposite outcomes on the same stat", () => {
        const existing = makeLeg({
            id: "over",
            side: "Over",
            line: 24.5,
        });
        const incoming = makeLeg({
            id: "under",
            side: "Under",
            selection: "Under",
            line: 24.5,
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toContain("contradictory");
        }
    });

    it("allows same-game moneyline plus opposing spread with a live middle window", () => {
        const existing = makeLeg({
            id: "home-ml",
            entityType: "team",
            entityId: "team-a",
            teamId: "team-a",
            opponentTeamId: "team-b",
            playerId: undefined,
            marketType: "Moneyline",
            marketFamily: "Moneyline",
            market: "Moneyline",
            statType: "moneyline",
            side: "home",
            selection: "Team A",
            line: undefined,
            teamKey: "team-a",
        });
        const incoming = makeLeg({
            id: "away-plus",
            entityType: "team",
            entityId: "team-b",
            teamId: "team-b",
            opponentTeamId: "team-a",
            playerId: undefined,
            marketType: "Point Spread",
            marketFamily: "Point Spread",
            market: "Point Spread",
            statType: "spread",
            side: "away",
            selection: "Team B +7.5",
            line: 7.5,
            teamKey: "team-b",
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(true);
    });
});
