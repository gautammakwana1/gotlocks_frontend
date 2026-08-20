/* ----------------------------------------------------------------------------
 * The "Rules participants must accept" copy, ported from the MVP's
 * lib/contests/participationRules.ts.
 *
 * This is the ONE field on the contest wizard whose default is not derived from
 * the organizer's own settings: the description is generated from the slate and
 * the mechanics, but the rules are the terms an entrant ticks a box to accept.
 * They are seeded PER TEMPLATE, because the three templates make materially
 * different promises about how a pick is scored.
 *
 * Kept as data rather than JSX so the exact string can be stored on the contest
 * (`rules_text`) and re-read verbatim wherever an entrant is asked to accept it.
 * An organizer may edit it before publishing; what ships here is the default.
 * -------------------------------------------------------------------------- */

/**
 * Stamped onto a contest as `rules_version` when it is created, and compared
 * against the accepted version to decide whether an entrant must re-accept.
 */
export const FEED_CONTEST_PARTICIPATION_RULES_VERSION =
    "contest-participation-v6";

/**
 * The base disclaimer, and the last paragraph of every template's rules. Also
 * the whole of General Combo's — a combo is all-or-nothing on prices the entrant
 * can already see, so there is nothing further to disclose.
 */
export const FEED_CONTEST_PARTICIPATION_RULES_TEXT =
    "Gotlocks does not handle money or wagers. All scoring is strictly for entertainment, leaderboard ranking, and personal bragging rights.";

/**
 * How a pre-lock quote is LABELLED on every card that shows one.
 *
 * Deliberately not the book's name: before the shared lock the number is public
 * market data and nothing more — not an accepted price, not a scoring price. TD
 * Psychic swaps this for "Odds at lock" once the capture has run, and those two
 * strings are the only thing telling the two apart on screen.
 */
export const CURRENT_ODDS_PUBLIC_DATA_LABEL = "Public data";

/**
 * Why the number on screen while picking is not the number that scores.
 *
 * Load-bearing for Sunday Pick'em specifically: a card is built over hours and
 * every price on it moves, so the entrant has to be told — before they accept —
 * that the shared lock five minutes before the earliest kickoff is what counts.
 *
 * Load-bearing TWICE OVER for TD Psychic, where the entry endpoint accepts no
 * price at all: a TD card is stored with every price null and gets its numbers
 * only at the capture. There the moving quote is not merely "may differ" — it is
 * the only price that exists until the contest locks.
 */
export const CURRENT_ODDS_LOCK_DISCLOSURE =
    "Odds shown while you pick reflect the latest available public market data and are provided as a guide only. Final contest odds are captured at the shared entry lock—automatically five minutes before the earliest included kickoff—and may differ from the odds shown now.";

/**
 * Sunday Pick'em. Five paragraphs, because this template scores per LEG and
 * ranks on a count — not as one priced parlay — and every clause below is a
 * question an entrant would otherwise have to guess the answer to: what makes a
 * pick correct, what breaks a tie, which odds count, and what the Combo figure
 * on their locked card actually means.
 */
export const SUNDAY_PICKEM_PARTICIPATION_RULES_TEXT = [
    "Pick one moneyline winner in every included game.",
    "Cards rank first by correct picks. Each correct pick earns odds-based League Points or Arena Points from its final lock-time moneyline plus a fixed +2 bonus; those point totals break ties.",
    CURRENT_ODDS_LOCK_DISCLOSURE,
    "After entries lock, each entry card shows its selected lock-time prices and full-card Combo odds. Combo odds multiply every selected lock-time price and are informational; Sunday scoring still awards League Points or Arena Points per correct pick.",
    FEED_CONTEST_PARTICIPATION_RULES_TEXT,
].join("\n\n");

/**
 * TD Psychic. Ten paragraphs, and each answers a question this template creates
 * that neither sibling does.
 *
 * The scoring clauses are the load-bearing ones, because a TD card is the only
 * template where a card can PLACE and still earn nothing. Ranking is on correct
 * count, so a 2-of-3 takes a podium spot whenever fewer than three cards go
 * perfect — but contextual points come from the combined lock-time odds of all
 * THREE scorers, which only a 3-of-3 has. An entrant not told both rules reads a
 * second-place finish worth 0 points as a bug.
 *
 * The Combo caveat is there for the same reason: a locked card displays one
 * combined price, and that number is NOT the correct-scorer-only product the
 * tiebreak actually ranks on.
 */
export const TD_PSYCHIC_PARTICIPATION_RULES_TEXT = [
    "Pick exactly three different players from the included NFL games.",
    "A selection is correct when that player records at least one rushing or receiving touchdown.",
    "Passing touchdowns do not count.",
    "Cards rank first by correct picks. For cards with the same number correct, final lock-time odds for the correct scorers break the tie.",
    "Only a perfect 3-of-3 card earns League Points or Arena Points. Its single card-level League Point or Arena Point total is calculated from the combined final lock-time odds of all three correct scorers. A 2-of-3, 1-of-3, 0-of-3, or void card earns no League Points or Arena Points.",
    CURRENT_ODDS_LOCK_DISCLOSURE,
    "After entries lock, each entry card shows the shared scorer prices and full-card Combo odds from all three selections. The Combo odds are not the correct-scorer-only tiebreak for a 2-of-3 card.",
    "Perfect 3-of-3 cards rank first. If fewer than three cards finish 3-of-3, the strongest non-void 2-of-3 cards by correct-scorer lock odds fill the remaining places.",
    "The top three placement-eligible cards receive placements.",
    FEED_CONTEST_PARTICIPATION_RULES_TEXT,
].join("\n\n");

/**
 * Narrows the stored rules copy to the surface it is being read on.
 *
 * The seeded text says "League Points or Arena Points" because ONE string is
 * stored on the contest and the same template ships to both surfaces. A member
 * reading it is only ever on one of them, so the disjunction is noise at best
 * and, on an Arena contest, actively wrong about where the points land.
 *
 * Applied at RENDER time, never at write time: the accepted text on record stays
 * the neutral one, so a contest that later moves surface does not silently
 * change the terms an entrant already ticked.
 */
export const formatParticipationRulesForContext = (
    rulesText: string,
    pointsLabel: "League Points" | "Arena Points"
) => {
    const singularLabel =
        pointsLabel === "League Points" ? "League Point" : "Arena Point";
    return rulesText
        .replaceAll("League Points or Arena Points", pointsLabel)
        .replaceAll("League Point or Arena Point", singularLabel);
};

/**
 * The default rules for a template, as the wizard seeds them when a style is
 * chosen. `multi_pick` is this backend's name for the MVP's `general_combo`.
 *
 * All three of the backend's `FEED_CONTEST_CREATABLE_TEMPLATES` are covered —
 * the three score a pick differently enough that the terms an entrant accepts
 * cannot be shared between them.
 */
export const participationRulesForTemplate = (
    template: "multi_pick" | "sunday_pickem" | "td_psychic"
): string =>
    template === "sunday_pickem"
        ? SUNDAY_PICKEM_PARTICIPATION_RULES_TEXT
        : template === "td_psychic"
          ? TD_PSYCHIC_PARTICIPATION_RULES_TEXT
          : FEED_CONTEST_PARTICIPATION_RULES_TEXT;
