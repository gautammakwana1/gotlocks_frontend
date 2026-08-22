import { formatPublicAmericanOdds } from "@/lib/contests/publicCurrentOdds";

/* ----------------------------------------------------------------------------
 * The full-card COMBO price a tally entry carries once the shared lock capture
 * has produced one.
 *
 * Shown only after the capture, and labelled as what it is. On a TD Psychic card
 * it multiplies all three lock prices, while the tiebreak that actually ranks a
 * 2-of-3 card multiplies only its CORRECT scorers — so this number must never be
 * presented as the card's ranking value, which is why it reads "Combo odds · At
 * lock" rather than anything about points.
 *
 * `undefined` renders nothing (not past the lock). `null` renders "Unavailable"
 * (locked, but the capture could not produce a combined price — a voided card).
 * The two must not collapse into one.
 * -------------------------------------------------------------------------- */

export type ComboOddsRowProps = {
    americanOdds: number | null | undefined;
    /** False before the lock: the row is absent entirely rather than empty. */
    locked: boolean;
};

export const ComboOddsRow = ({ americanOdds, locked }: ComboOddsRowProps) => {
    if (!locked) return null;
    const copy =
        typeof americanOdds === "number" && americanOdds !== 0
            ? formatPublicAmericanOdds(americanOdds)
            : "Unavailable";

    return (
        <div
            data-feed-entry-combo-odds
            aria-label={`Combo odds at lock ${copy}`}
            className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3"
        >
            <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-400">
                    Combo odds
                </p>
                <p className="mt-0.5 text-[9px] text-slate-500">At lock</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-slate-100">{copy}</span>
        </div>
    );
};

export default ComboOddsRow;
