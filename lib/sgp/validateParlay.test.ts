import { describe, expect, it } from "vitest";
import { normalizeOddToLeg, validateAddLeg, type ParlayLeg } from "./validateParlay";
import { OddsEvent, OddsOdd } from "../interfaces/interfaces";

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

const makeEvent = (): OddsEvent => ({
    id: "event-1",
    teams: {
        away: { id: "team-a", name: "Los Angeles Lakers", abbreviation: "LAL" },
        home: { id: "team-b", name: "Houston Rockets", abbreviation: "HOU" },
    },
    date: "2026-03-16T19:30:00.000Z",
    live: false,
    odds: [],
});

const makeOdd = (overrides: Partial<OddsOdd> = {}): OddsOdd => ({
    id: overrides.id ?? "odd-1",
    market: overrides.market ?? "Moneyline",
    name: overrides.name ?? "Los Angeles Lakers",
    price: overrides.price ?? "-110",
    main: overrides.main ?? true,
    sgp: overrides.sgp ?? "sgp-token",
    links: overrides.links,
    selection: overrides.selection,
    player: overrides.player,
    updated: overrides.updated,
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
describe("normalizeOddToLeg", () => {
    it("spells out moneyline team legs for combo display", () => {
        const leg = normalizeOddToLeg(
            makeEvent(),
            makeOdd({
                market: "Moneyline",
                name: "Los Angeles Lakers",
                selection: { name: "Los Angeles Lakers" },
            })
        );

        expect(leg.displayName).toBe("Los Angeles Lakers Moneyline");
    });

    it("spells out spread team legs with the signed line for combo display", () => {
        const leg = normalizeOddToLeg(
            makeEvent(),
            makeOdd({
                market: "Point Spread",
                name: "Houston Rockets +6.5",
                selection: { name: "Houston Rockets", line: 6.5 },
            })
        );

        expect(leg.displayName).toBe("Houston Rockets +6.5 Spread");
    });

    it("preserves half and quarter scope in team game-line labels", () => {
        const leg = normalizeOddToLeg(
            makeEvent(),
            makeOdd({
                market: "1st Half Point Spread",
                name: "Houston Rockets +3.5",
                selection: { name: "Houston Rockets", line: 3.5 },
            })
        );

        expect(leg.displayName).toBe("Houston Rockets +3.5 1st Half Spread");
    });
});