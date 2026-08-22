import {
    FEED_CONTEST_MAX_LEGS,
    FEED_CONTEST_MIN_LEGS,
} from "@/lib/contests/feedContestCatalog";

/* ----------------------------------------------------------------------------
 * The "Rules participants must accept" copy, ported from the MVP's
 * lib/contests/participationRules.ts.
 *
 * This is the ONE field on the contest wizard whose default is not derived from
 * the organizer's own settings: the description is generated from the slate and
 * the mechanics, but the rules are the terms an entrant ticks a box to accept.
 * They are GENERATED PER TEMPLATE, because the three templates make materially
 * different promises about how a pick is scored — and, for General Combo, from
 * the organizer's own leg range, minimum price and same-game setting, because
 * for that template the mechanics ARE the terms.
 *
 * Kept as data rather than JSX so the exact string can be stored on the contest
 * (`rules_text`) and re-read verbatim wherever an entrant is asked to accept it.
 * The wizard shows the result read-only: as in the MVP, an organizer changes
 * these rules by changing the settings above them, never by typing over them.
 * -------------------------------------------------------------------------- */

/**
 * Stamped onto a contest as `rules_version` when it is created, and compared
 * against the accepted version to decide whether an entrant must re-accept.
 *
 * Deliberately held at v6 while the MVP sits on v8. The version is compared
 * across ALL THREE templates, so bumping it to match the MVP would make
 * `rulesCurrent` false for every existing participant of every contest —
 * including the two templates whose text is untouched — and force a re-accept
 * sweep that nothing here needs. Contests carry their own `rules_text`, so a
 * revised default only ever reaches contests created after it lands.
 */
export const FEED_CONTEST_PARTICIPATION_RULES_VERSION =
    "contest-participation-v6";

/**
 * The base disclaimer, on its own.
 *
 * NO TEMPLATE COMPOSES FROM IT ANY MORE — all three now close with the MVP's
 * longer wording of the same sentence, spelled out inline in their own
 * documents. Kept because the Scoring modal renders it standalone, and because
 * a contest published before the port is stored with it.
 */
export const FEED_CONTEST_PARTICIPATION_RULES_TEXT =
    "Gotlocks does not handle money or wagers. All scoring is strictly for entertainment, leaderboard ranking, and personal bragging rights.";

/* ----------------------------------------------------------------------------
 * A GENERAL COMBO's rules document, ported verbatim from the MVP's
 * GENERAL_COMBO_RULES_TEMPLATE. Three placeholders are filled from the
 * organizer's own settings — see buildGeneralComboParticipationRulesText.
 * -------------------------------------------------------------------------- */
const GENERAL_COMBO_RULES_TEMPLATE = `HOW TO PLAY

Build one complete combo using the games, sports, and markets included in this contest. Your entry must contain between {MIN_LEGS} and {MAX_LEGS} selections and must meet the minimum combined odds requirement of {MINIMUM_COMBINED_ODDS}.

{SAME_GAME_RULE}

Only selections from games included in this contest are eligible. Gotlocks validates the completed entry against the contest settings before it can be submitted.

ENTRY & LOCKING

Each participant may have one active entry in this contest. You may replace your entry while the contest remains open; if you submit a replacement, the newer entry becomes your active entry for the contest.

Entries lock at the shared contest lock time, automatically set five minutes before the earliest included game begins. No new entries or replacements may be submitted after the contest locks.

SCORING

A General Combo must be completed as a winning combo to qualify for the standings. An entry that is not finalized by Gotlocks as a winning combo is not placement-eligible.

A winning combo earns League Points or Arena Points based on the accepted combined odds of the complete entry. The odds and resulting potential point value are captured when the entry is validly submitted.

RANKING & TIEBREAKERS

Winning entries are ranked first by their League Point or Arena Point total. If multiple winning entries earn the same point total, the entry with the higher exact combined odds ranks ahead.

If a tie remains, Gotlocks applies the contest’s deterministic ranking order using the difficulty of the successful selections and then the order in which the valid entries were accepted.

The number of placement-winning entries for this contest is shown in Contest Details.

ODDS & DATA

Odds displayed while building an entry reflect available public market data and are used to score and compare contest entries. They are provided for contest and informational purposes only and are not wagers offered by Gotlocks.

The accepted pricing attached to a valid General Combo entry governs its scoring and ranking even if market prices later change.

CONTEST ADMINISTRATION

Game results, selection results, contest scoring, and final standings are determined from the result data used by Gotlocks and the contest mechanics shown in Contest Details.

Gotlocks may correct a displayed score or standing when required to accurately apply the recorded game results or contest rules.

Gotlocks does not accept or handle wagers, entry fees, stakes, deposits, or winnings. Gotlocks scoring is used for entertainment, community competition, leaderboard ranking, points, achievements, and bragging rights.`;

/**
 * How a pre-lock quote is LABELLED on an ACCEPTED card's square.
 *
 * Deliberately not the book's name: before the shared lock the number is public
 * market data and nothing more — not an accepted price, not a scoring price. The
 * square swaps this for "Odds at lock" once the capture has run, and those two
 * strings are the only thing telling the two apart on screen.
 *
 * The BUILDER's squares carry no caption at all, matching the MVP: while picking,
 * every number on screen is a live quote, so labelling each one says nothing the
 * disclosure below the board does not already say once.
 */
export const CURRENT_ODDS_PUBLIC_DATA_LABEL = "Public data";

/**
 * Why the number on screen while picking is not the number that scores.
 *
 * Shown BESIDE THE BOARD in the Pick'em and TD Psychic builders — the one place
 * an entrant is watching prices move — not inside any rules document. All three
 * templates make the same disclosure in their own words, splitting it across two
 * paragraphs and talking about "scorer prices" where the template calls for it,
 * so none of them composes from this constant.
 */
export const CURRENT_ODDS_LOCK_DISCLOSURE =
    "Odds shown while you pick reflect the latest available public market data and are provided as a guide only. Final contest odds are captured at the shared entry lock—automatically five minutes before the earliest included kickoff—and may differ from the odds shown now.";

/**
 * Sunday Pick'em, ported verbatim from the MVP as a six-section document:
 * HOW TO PLAY, ENTRY & LOCKING, SCORING, RANKING & TIEBREAKERS,
 * ODDS & COMBO DISPLAY, CONTEST ADMINISTRATION.
 *
 * This replaced five short paragraphs composed from the shared constants. They
 * said broadly the same things, but not in the same words and not in the same
 * order, and three of the questions an entrant actually asks were missing
 * outright: that one card may be replaced while entries are open, that every
 * participant is scored on the SAME lock-time prices, and what happens when a
 * tie survives the points total.
 *
 * Written as one literal rather than composed from CURRENT_ODDS_LOCK_DISCLOSURE
 * and the closing disclaimer, for the same reason TD Psychic is: this document
 * splits the lock disclosure across two paragraphs and closes with the longer
 * wording, and the point of the port is that the stored `rules_text` matches the
 * MVP character for character.
 */
export const SUNDAY_PICKEM_PARTICIPATION_RULES_TEXT = `HOW TO PLAY

Choose one moneyline winner for every NFL matchup included in this contest. A complete card requires one selection for each included game.

Each participant may have one active card. You may change and replace your selections while entries remain open. Your most recently accepted complete card is your active entry.

ENTRY & LOCKING

All cards share the same contest lock time, automatically set five minutes before the earliest included kickoff. No new cards or replacements may be submitted after the contest locks.

At lock, Gotlocks captures the shared moneyline prices used by the contest. Every participant is scored using the same lock-time market prices for the included selections.

SCORING

Cards rank first by the number of correctly selected game winners.

Each correct selection also earns odds-based League Points or Arena Points using that selection’s final lock-time moneyline price, plus a fixed +2 correct-pick bonus.

Incorrect, void, or otherwise non-winning selections do not count as correct selections.

The combined League Point or Arena Point total earned from correct selections is used to break ties between cards with the same number of correct picks.

RANKING & TIEBREAKERS

Correct-pick count is always the primary ranking measure.

When two or more cards have the same correct-pick count, the card with the higher League Point or Arena Point total ranks ahead.

If a tie still remains, Gotlocks applies the contest’s deterministic standing order using the successful lock-time prices and then valid submission order.

The number of placement-winning cards for this contest is shown in Contest Details.

ODDS & COMBO DISPLAY

Odds shown while you make your selections reflect the latest available public market data and are provided as a guide only.

Final contest odds are captured at the shared entry lock and may differ from the odds displayed while entries were open.

After the contest locks, each card displays its selected lock-time prices and its full-card Combo odds. Full-card Combo odds multiply the lock-time prices of every selected team and are shown for informational purposes only.

Full-card Combo odds do not determine Sunday Pick’em scoring. Sunday Pick’em awards League Points or Arena Points individually for each correct selection.

CONTEST ADMINISTRATION

Official contest scoring is based on the recorded results of the games included in the contest and the shared prices captured by Gotlocks at lock.

Gotlocks may correct a displayed score or standing when required to accurately apply recorded game results, shared lock-time prices, or the contest rules.

Gotlocks does not accept or handle wagers, entry fees, stakes, deposits, or winnings. Gotlocks scoring is used for entertainment, community competition, leaderboard ranking, points, achievements, and bragging rights.`;

/**
 * TD Psychic, ported verbatim from the MVP as a six-section document:
 * HOW TO PLAY, ENTRY & LOCKING, SCORING, PLACEMENTS & TIEBREAKERS,
 * ODDS & COMBO DISPLAY, CONTEST ADMINISTRATION.
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
 *
 * Written as one literal rather than composed from the shared constants like its
 * siblings above. CURRENT_ODDS_LOCK_DISCLOSURE and the closing disclaimer both
 * say the same thing as the paragraphs that replace them, but not in the same
 * words — this document says "scorer prices" and splits the lock disclosure in
 * two — and the point of the port is that the stored `rules_text` matches the
 * MVP's character for character.
 */
export const TD_PSYCHIC_PARTICIPATION_RULES_TEXT = `HOW TO PLAY

Choose exactly three different players from the NFL games included in this contest.

Players may be selected from the same game, but the same player may not be selected more than once on a card.

A selection is correct when the selected player records at least one rushing or receiving touchdown in the applicable game.

Passing touchdowns do not count.

Each participant may have one active TD Psychic card. You may replace your selections while entries remain open. Your most recently accepted complete card becomes your active entry.

ENTRY & LOCKING

All TD Psychic cards share the same contest lock time, automatically set five minutes before the earliest included kickoff.

No new cards or replacements may be submitted after the contest locks.

At lock, Gotlocks captures the shared touchdown-scorer prices used to score and compare the contest. Those shared lock-time prices apply equally to every participant who selected the same scorer.

SCORING

Cards are ranked first by the number of correct touchdown scorers.

A perfect 3-of-3 card is the highest possible result.

When cards have the same number of correct selections, the final lock-time odds of the correct touchdown scorers are used to determine which successful card was more difficult.

Only a perfect 3-of-3 card earns League Points or Arena Points.

For a perfect card, one card-level League Point or Arena Point total is calculated from the combined final lock-time odds of all three correct touchdown scorers.

A 2-of-3, 1-of-3, 0-of-3, or void card earns no League Points or Arena Points.

PLACEMENTS & TIEBREAKERS

Perfect 3-of-3 cards rank ahead of all other cards.

If fewer than three cards finish 3-of-3, the strongest non-void 2-of-3 cards may fill the remaining placement positions. Those cards are compared using the final lock-time odds of the scorers they correctly selected.

Cards with fewer than two correct selections are not placement-eligible.

If a tie remains after the applicable scorer-odds comparison, Gotlocks applies its deterministic standing order using valid submission order.

TD Psychic awards up to three placement-eligible cards.

ODDS & COMBO DISPLAY

Odds shown while you select players reflect the latest available public market data and are provided as a guide only.

Final contest scorer prices are captured at the shared entry lock and may differ from the prices shown while entries were open.

After entries lock, each card displays its three shared scorer prices and full-card Combo odds.

The displayed full-card Combo odds combine all three selections and are informational. For a card that finishes 2-of-3, the full-card Combo odds are not the tiebreaker; only the lock-time odds associated with the correctly selected scorers are used for that comparison.

CONTEST ADMINISTRATION

Official contest scoring is based on the recorded touchdown results for the included games and the shared scorer prices captured by Gotlocks at lock.

Gotlocks may correct a displayed score or standing when required to accurately apply recorded game results, shared lock-time prices, or the contest rules.

Gotlocks does not accept or handle wagers, entry fees, stakes, deposits, or winnings. Gotlocks scoring is used for entertainment, community competition, leaderboard ranking, points, achievements, and bragging rights.`;

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
          : buildGeneralComboParticipationRulesText({
              minLegs: FEED_CONTEST_MIN_LEGS,
              maxLegs: FEED_CONTEST_MAX_LEGS,
              minimumCombinedOdds: null,
              allowSameGameLegs: true,
          });

/**
 * A GENERAL COMBO's rules, written out of the settings the organizer just chose
 * — ported from the MVP's buildGeneralComboParticipationRulesText.
 *
 * The interpolation is the whole point. A combo contest's terms ARE its
 * mechanics: how many legs, what combined price, whether two legs may come from
 * one game. A fixed paragraph would leave an entrant accepting terms that do not
 * describe the contest they are entering, which is exactly the state this
 * replaced — General Combo used to seed nothing but the one-line disclaimer.
 */
const formatMinimumCombinedOdds = (minimumCombinedOdds: number | null) => {
    if (minimumCombinedOdds === null) return null;
    return minimumCombinedOdds > 0 ? `+${minimumCombinedOdds}` : String(minimumCombinedOdds);
};

export const buildGeneralComboParticipationRulesText = (input: {
    minLegs: number;
    maxLegs: number;
    minimumCombinedOdds: number | null;
    allowSameGameLegs: boolean;
}) => {
    const minimumOdds = formatMinimumCombinedOdds(input.minimumCombinedOdds);
    // No minimum is a DIFFERENT SENTENCE, not a blank: "must meet the minimum
    // combined odds requirement of —" would read as a missing value rather than
    // as the absence of a requirement.
    const opening = minimumOdds
        ? GENERAL_COMBO_RULES_TEMPLATE.replace("{MINIMUM_COMBINED_ODDS}", minimumOdds)
        : GENERAL_COMBO_RULES_TEMPLATE.replace(
            " and must meet the minimum combined odds requirement of {MINIMUM_COMBINED_ODDS}",
            ". This contest has no minimum combined odds requirement"
        );

    return opening
        .replace("{MIN_LEGS}", String(input.minLegs))
        .replace("{MAX_LEGS}", String(input.maxLegs))
        .replace(
            "{SAME_GAME_RULE}",
            input.allowSameGameLegs
                ? "Selections from the same game are allowed in this contest."
                : "Selections from the same game may not be combined in the same entry."
        );
};

/**
 * The rules a contest publishes, assembled from its template and its settings.
 *
 * The MVP's `buildStructuredContestParticipationRulesText`, minus one step: it
 * appends the ARENA REWARD block itself, and we must not. Our backend generates
 * that block server-side from the resolved reward snapshot — the venue, the
 * inbox and the provider name are claims about who is legally on the hook for a
 * prize, so the server reads them from its own state and would strip and rewrite
 * anything a client sent. Sending one from here would be redundant at best and
 * a divergent second copy at worst.
 */
export const buildFeedContestParticipationRulesText = (input: {
    template: "multi_pick" | "sunday_pickem" | "td_psychic";
    contextType: "arena" | "league";
    minLegs: number;
    maxLegs: number;
    minimumCombinedOdds: number | null;
    allowSameGameLegs: boolean;
}) => {
    const templateRules =
        input.template === "multi_pick"
            ? buildGeneralComboParticipationRulesText(input)
            : input.template === "sunday_pickem"
                ? SUNDAY_PICKEM_PARTICIPATION_RULES_TEXT
                : TD_PSYCHIC_PARTICIPATION_RULES_TEXT;
    return formatParticipationRulesForContext(
        templateRules,
        input.contextType === "arena" ? "Arena Points" : "League Points"
    );
};
