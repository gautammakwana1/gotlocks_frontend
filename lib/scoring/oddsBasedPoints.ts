/** Convert valid American odds to their exact decimal-odds representation. */
export const americanToDecimal = (americanOdds: number): number => {
    if (!Number.isFinite(americanOdds) || americanOdds === 0) {
        throw new Error("American odds must be a finite non-zero number.");
    }

    return americanOdds > 0
        ? 1 + americanOdds / 100
        : 1 + 100 / Math.abs(americanOdds);
};

/**
 * The two terms of the active formula, pulled out so the Scoring Rules modal can
 * PRINT the formula it is about to compute with rather than restating it in
 * prose. A drift between the number on screen and the number the backend awards
 * reads to a member as a scoring bug, so there is only one place to change.
 *
 * These must stay in step with the backend's `calculateOddsBasedPoints` in
 * `src/helpers/picks.helper.ts` — that helper, not this one, is what actually
 * credits points.
 */
export const ODDS_POINT_SCALE = 20;
export const ODDS_POINT_EXPONENT = 0.55;

/** Calculate the uncapped, context-neutral amount for accepted American odds. */
export const calculateOddsBasedPoints = (americanOdds: number): number => {
    const decimalOdds = americanToDecimal(americanOdds);
    return Math.round(ODDS_POINT_SCALE * Math.pow(decimalOdds, ODDS_POINT_EXPONENT));
};
