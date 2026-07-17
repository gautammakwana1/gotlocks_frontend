/** Convert valid American odds to their exact decimal-odds representation. */
export const americanToDecimal = (americanOdds: number): number => {
    if (!Number.isFinite(americanOdds) || americanOdds === 0) {
        throw new Error("American odds must be a finite non-zero number.");
    }

    return americanOdds > 0
        ? 1 + americanOdds / 100
        : 1 + 100 / Math.abs(americanOdds);
};

/** Calculate the uncapped, context-neutral amount for accepted American odds. */
export const calculateOddsBasedPoints = (americanOdds: number): number => {
    const decimalOdds = americanToDecimal(americanOdds);
    return Math.round(20 * Math.pow(decimalOdds, 0.55));
};
