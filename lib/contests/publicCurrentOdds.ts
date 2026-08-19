/* ----------------------------------------------------------------------------
 * The NON-BINDING price a member sees while they are still picking.
 *
 * Ported from the MVP's lib/contests/publicCurrentOdds.ts, minus its catalog
 * readers. The MVP resolves a current quote out of a synchronous local fixture;
 * here every quote arrives already sanitized on the wire — TD Psychic reads
 * `GET /leagues/nfl/td-scorers-by-events`, which carries `american_odds`,
 * `price` and `observed_at` per scorer and nothing about the provider behind
 * them. So what survives the port is the SHAPE and the formatter, which are the
 * two things the picker and every receipt share.
 *
 * "Public data", never "your price": for TD Psychic the number here is not the
 * number that scores. One shared price per scorer is frozen at the contest lock
 * — identical for every member holding that player — and only that one is ever
 * presented as `Odds at lock`. See CURRENT_ODDS_LOCK_DISCLOSURE.
 * -------------------------------------------------------------------------- */

export type PublicCurrentOdds = {
    americanOdds: number;
    /** The book, as the feed labelled it. Display-only; never a provider ref. */
    sourceLabel: string;
    /** When the book last moved this quote, ISO, or null if it did not say. */
    observedAt: string | null;
};

/** `+145` / `-110`. The one spelling every TD surface uses. */
export const formatPublicAmericanOdds = (americanOdds: number) =>
    americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`;

/**
 * A price the server will actually accept as a quote: a non-zero integer.
 *
 * The feed sends `american_odds: null` rather than 0 when it could not parse a
 * vendor price, and the lock capture refuses a zero — so a 0 reaching a card
 * would be an unpriceable scorer wearing a real-looking number.
 */
export const isDisplayableAmericanOdds = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value !== 0;
