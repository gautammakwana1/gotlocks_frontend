import { describe, expect, it } from "vitest";
import { validateAddLeg } from "./validateParlay";
import { ParlayLeg } from "../interfaces/interfaces";

const makeLeg = (overrides: Partial<ParlayLeg> = {}): ParlayLeg => ({
    id: "leg-1",
    eventId: "event-1",
    market: "Total Points",
    displayName: "Total Over 51.5",
    price: "-110",
    sgp: "sgp-token",
    bookMarketId: "market-1",
    bookSelectionId: "selection-1",
    line: 51.5,
    side: "Over",
    marketKey: "event-1:market-1",
    familyKey: "event-1:Total Points",
    periodKey: "Full Game",
    ...overrides,
});

describe("validateAddLeg", () => {
    it("blocks opposing sides from the same marketId", () => {
        const existing = makeLeg({
            id: "over",
            bookSelectionId: "over",
            marketKey: "event-1:market-1",
        });
        const incoming = makeLeg({
            id: "under",
            bookSelectionId: "under",
            marketKey: "event-1:market-1",
            side: "Under",
            displayName: "Total Under 51.5",
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(false);
    });

    it("blocks stacking alternate lines within the same family", () => {
        const existing = makeLeg({
            id: "over-51",
            marketKey: "event-1:market-1",
            familyKey: "event-1:Total Points",
        });
        const incoming = makeLeg({
            id: "over-55",
            marketKey: "event-1:market-2",
            familyKey: "event-1:Total Points",
            line: 55.5,
            displayName: "Total Over 55.5",
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(false);
    });

    it("blocks moneyline + spread for the same team and period", () => {
        const existing = makeLeg({
            id: "ml-bills",
            market: "Moneyline",
            displayName: "Bills Moneyline",
            marketKey: "event-1:ml",
            bookMarketId: "ml",
            bookSelectionId: "bills",
            teamKey: "bills",
        });
        const incoming = makeLeg({
            id: "spread-bills",
            market: "Point Spread",
            displayName: "Bills -1.5",
            marketKey: "event-1:spread",
            bookMarketId: "spread",
            bookSelectionId: "bills",
            teamKey: "bills",
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(false);
    });

    it("allows unrelated markets like first TD scorer + total over", () => {
        const existing = makeLeg({
            id: "first-td",
            market: "First Touchdown Scorer",
            displayName: "Allen first TD",
            marketKey: "event-1:first-td",
            bookMarketId: "first-td",
            bookSelectionId: "allen",
            familyKey: "event-1:First Touchdown Scorer",
        });
        const incoming = makeLeg({
            id: "total-over",
            market: "Total Points",
            displayName: "Total Over 51.5",
            marketKey: "event-1:total",
            bookMarketId: "total",
            bookSelectionId: "over",
            familyKey: "event-1:Total Points",
        });

        const result = validateAddLeg([existing], incoming);
        expect(result.ok).toBe(true);
    });
});
