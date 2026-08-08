import type { SelectionSnapshot } from "@/lib/domain/community";
import {
    americanToDecimal,
    calculateOddsBasedPoints,
} from "@/lib/scoring/oddsBasedPoints";

export type MockQuoteAvailability = "available" | "unavailable" | "provider_failure";

export interface MockSelectionQuote {
    revision: number;
    americanOdds: number | null;
    availability: MockQuoteAvailability;
    quotedAt: string;
    expiresAt: string | null;
    providerReference: string;
}

export interface MockSelectionCatalogItem {
    id: string;
    sport: string;
    gameId: string;
    marketId: string;
    selectionId: string;
    marketName: string;
    selectionName: string;
    side: string;
    line: number | null;
    teamId: string | null;
    playerId: string | null;
    gameStartsAt: string;
    duplicateIdentityKey: string;
    initialQuote: MockSelectionQuote;
    currentQuote: MockSelectionQuote;
}

const quote = (
    revision: number,
    americanOdds: number,
    quotedAt: string,
    providerReference: string,
): MockSelectionQuote => ({
    revision,
    americanOdds,
    availability: "available",
    quotedAt,
    expiresAt: null,
    providerReference,
});

/**
 * Stable local catalog. Kansas City's moneyline deliberately moves from +115
 * to +130 so the final-submit path always has a changed-price fixture.
 */
export const MOCK_SELECTION_CATALOG: readonly MockSelectionCatalogItem[] = [
    {
        id: "nfl-kc-buf-kc-moneyline",
        sport: "NFL",
        gameId: "nfl-buf-kc-2026w1",
        marketId: "moneyline",
        selectionId: "kc-moneyline",
        marketName: "Moneyline",
        selectionName: "Kansas City Chiefs",
        side: "away",
        line: null,
        teamId: "kc",
        playerId: null,
        gameStartsAt: "2026-07-22T00:15:00.000Z",
        duplicateIdentityKey: "nfl-buf-kc-2026w1|moneyline|kc-moneyline|away|-|kc|-",
        initialQuote: quote(
            1,
            115,
            "2026-07-14T13:00:00.000Z",
            "mock:kc-buf:kc-moneyline:r1",
        ),
        currentQuote: quote(
            2,
            130,
            "2026-07-14T13:05:00.000Z",
            "mock:kc-buf:kc-moneyline:r2",
        ),
    },
    {
        id: "nfl-kc-buf-buf-moneyline",
        sport: "NFL",
        gameId: "nfl-buf-kc-2026w1",
        marketId: "moneyline",
        selectionId: "buf-moneyline",
        marketName: "Moneyline",
        selectionName: "Buffalo Bills",
        side: "home",
        line: null,
        teamId: "buf",
        playerId: null,
        gameStartsAt: "2026-07-22T00:15:00.000Z",
        duplicateIdentityKey: "nfl-buf-kc-2026w1|moneyline|buf-moneyline|home|-|buf|-",
        initialQuote: quote(
            1,
            -135,
            "2026-07-14T13:00:00.000Z",
            "mock:kc-buf:buf-moneyline:r1",
        ),
        currentQuote: quote(
            1,
            -135,
            "2026-07-14T13:00:00.000Z",
            "mock:kc-buf:buf-moneyline:r1",
        ),
    },
    {
        id: "nfl-kc-buf-mahomes-pass-over-275-5",
        sport: "NFL",
        gameId: "nfl-buf-kc-2026w1",
        marketId: "player-passing-yards",
        selectionId: "mahomes-pass-over-275-5",
        marketName: "Player Passing Yards",
        selectionName: "Patrick Mahomes over 275.5 passing yards",
        side: "over",
        line: 275.5,
        teamId: "kc",
        playerId: "patrick-mahomes",
        gameStartsAt: "2026-07-22T00:15:00.000Z",
        duplicateIdentityKey:
            "nfl-buf-kc-2026w1|player-passing-yards|mahomes-pass-over-275-5|over|275.5|kc|patrick-mahomes",
        initialQuote: quote(
            1,
            105,
            "2026-07-14T13:00:00.000Z",
            "mock:kc-buf:mahomes-pass-over-275-5:r1",
        ),
        currentQuote: quote(
            1,
            105,
            "2026-07-14T13:00:00.000Z",
            "mock:kc-buf:mahomes-pass-over-275-5:r1",
        ),
    },
    {
        id: "nfl-dal-phi-phi-moneyline",
        sport: "NFL",
        gameId: "nfl-dal-phi-2026w1",
        marketId: "moneyline",
        selectionId: "phi-moneyline",
        marketName: "Moneyline",
        selectionName: "Philadelphia Eagles",
        side: "home",
        line: null,
        teamId: "phi",
        playerId: null,
        gameStartsAt: "2026-07-22T01:00:00.000Z",
        duplicateIdentityKey: "nfl-dal-phi-2026w1|moneyline|phi-moneyline|home|-|phi|-",
        initialQuote: quote(
            1,
            -125,
            "2026-07-14T13:00:00.000Z",
            "mock:dal-phi:phi-moneyline:r1",
        ),
        currentQuote: quote(
            1,
            -125,
            "2026-07-14T13:00:00.000Z",
            "mock:dal-phi:phi-moneyline:r1",
        ),
    },
    {
        id: "nfl-dal-phi-dal-moneyline",
        sport: "NFL",
        gameId: "nfl-dal-phi-2026w1",
        marketId: "moneyline",
        selectionId: "dal-moneyline",
        marketName: "Moneyline",
        selectionName: "Dallas Cowboys",
        side: "away",
        line: null,
        teamId: "dal",
        playerId: null,
        gameStartsAt: "2026-07-22T01:00:00.000Z",
        duplicateIdentityKey: "nfl-dal-phi-2026w1|moneyline|dal-moneyline|away|-|dal|-",
        initialQuote: quote(
            1,
            110,
            "2026-07-14T13:00:00.000Z",
            "mock:dal-phi:dal-moneyline:r1",
        ),
        currentQuote: quote(
            1,
            110,
            "2026-07-14T13:00:00.000Z",
            "mock:dal-phi:dal-moneyline:r1",
        ),
    },
] as const;

export interface SinglePickPricingInput {
    selectionCatalogId: string;
    /** The exact revision visible when the user pressed Submit/Confirm. */
    acceptedQuoteRevision: number;
    acceptedAt?: string;
    receiptSequence?: number;
    selectionSnapshotId?: string;
}

export type PricingRejectionCode =
    | "selection_not_found"
    | "price_changed"
    | "market_unavailable"
    | "quote_expired"
    | "provider_failure";

export interface AcceptedPricingResult {
    ok: true;
    status: "accepted";
    selectionCatalogId: string;
    acceptedQuoteRevision: number;
    quote: MockSelectionQuote;
    selectionSnapshot: SelectionSnapshot;
}

export interface RejectedPricingResult {
    ok: false;
    status: "rejected";
    selectionCatalogId: string;
    code: PricingRejectionCode;
    message: string;
    latestQuote: MockSelectionQuote | null;
}

export type PricingResult = AcceptedPricingResult | RejectedPricingResult;

export interface PricingAdapter {
    priceSinglePick(input: SinglePickPricingInput): Promise<PricingResult>;
}

export function getMockSelectionCatalogItem(
    selectionCatalogId: string,
): MockSelectionCatalogItem | null {
    return MOCK_SELECTION_CATALOG.find((item) => item.id === selectionCatalogId) ?? null;
}

export function getMockInitialQuote(selectionCatalogId: string): MockSelectionQuote | null {
    return getMockSelectionCatalogItem(selectionCatalogId)?.initialQuote ?? null;
}

export function getMockCurrentQuote(selectionCatalogId: string): MockSelectionQuote | null {
    return getMockSelectionCatalogItem(selectionCatalogId)?.currentQuote ?? null;
}

function validIsoDateTime(value: string | undefined, fallback: string): string {
    const timestamp = value === undefined ? Number.NaN : Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function positiveReceiptSequence(value: number | undefined): number {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}

function reject(
    input: SinglePickPricingInput,
    code: PricingRejectionCode,
    message: string,
    latestQuote: MockSelectionQuote | null,
): RejectedPricingResult {
    return {
        ok: false,
        status: "rejected",
        selectionCatalogId: input.selectionCatalogId,
        code,
        message,
        latestQuote,
    };
}

/** Synchronous core used by the async adapter and deterministic state tests. */
export function priceMockSinglePick(
    input: SinglePickPricingInput,
    catalog: readonly MockSelectionCatalogItem[] = MOCK_SELECTION_CATALOG,
): PricingResult {
    const item = catalog.find((candidate) => candidate.id === input.selectionCatalogId);
    if (!item) {
        return reject(input, "selection_not_found", "This mock selection is unavailable.", null);
    }

    const latestQuote = item.currentQuote;
    if (latestQuote.availability === "provider_failure") {
        return reject(
            input,
            "provider_failure",
            "Mock pricing is temporarily unavailable. Try again.",
            latestQuote,
        );
    }
    if (latestQuote.availability !== "available" || latestQuote.americanOdds === null) {
        return reject(input, "market_unavailable", "This market is no longer available.", latestQuote);
    }

    const acceptedAt = validIsoDateTime(input.acceptedAt, new Date().toISOString());
    if (
        latestQuote.expiresAt !== null &&
        Date.parse(acceptedAt) >= Date.parse(latestQuote.expiresAt)
    ) {
        return reject(input, "quote_expired", "This quote expired. Request a new price.", latestQuote);
    }
    if (input.acceptedQuoteRevision !== latestQuote.revision) {
        return reject(
            input,
            "price_changed",
            "The price changed. Confirm the latest quote to continue.",
            latestQuote,
        );
    }

    const receiptSequence = positiveReceiptSequence(input.receiptSequence);
    const americanOdds = latestQuote.americanOdds;
    const selectionSnapshot: SelectionSnapshot = {
        id:
            input.selectionSnapshotId ??
            `${item.id}:quote:${latestQuote.revision}:receipt:${receiptSequence}`,
        sport: item.sport,
        gameId: item.gameId,
        marketId: item.marketId,
        selectionId: item.selectionId,
        marketName: item.marketName,
        selectionName: item.selectionName,
        side: item.side,
        line: item.line,
        teamId: item.teamId,
        playerId: item.playerId,
        gameStartsAt: item.gameStartsAt,
        duplicateIdentityKey: item.duplicateIdentityKey,
        pricing: {
            americanOdds,
            decimalOdds: americanToDecimal(americanOdds),
            potentialOddsBasedPoints: calculateOddsBasedPoints(americanOdds),
            quotedAt: latestQuote.quotedAt,
            acceptedAt,
            receiptSequence,
            providerReference: latestQuote.providerReference,
        },
    };

    return {
        ok: true,
        status: "accepted",
        selectionCatalogId: item.id,
        acceptedQuoteRevision: latestQuote.revision,
        quote: latestQuote,
        selectionSnapshot,
    };
}

export class MockPricingAdapter implements PricingAdapter {
    constructor(
        private readonly catalog: readonly MockSelectionCatalogItem[] = MOCK_SELECTION_CATALOG,
    ) { }

    async priceSinglePick(input: SinglePickPricingInput): Promise<PricingResult> {
        return priceMockSinglePick(input, this.catalog);
    }
}
