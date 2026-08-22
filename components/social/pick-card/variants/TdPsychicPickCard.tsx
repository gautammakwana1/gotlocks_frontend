"use client";

import type { CSSProperties } from "react";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
} from "@/lib/contests/pickemTeamVisual";
import { formatPublicAmericanOdds } from "@/lib/contests/publicCurrentOdds";
import { getTdPsychicEligiblePlayerPosition } from "@/lib/contests/tdPsychicEntry";
import type { PickLeg } from "@/lib/interfaces/interfaces";
import ComboOddsRow from "../ComboOddsRow";
import PickCardShell from "../PickCardShell";
import {
    buildPickCardModel,
    getComboLegVisualState,
    getSelectionVisualTone,
    type PickCardModel,
} from "../pickCardModel";
import type { PickCardBaseProps, SelectionVisualState } from "../types";

/* ----------------------------------------------------------------------------
 * AN ACCEPTED TD PSYCHIC CARD — three scorers, one ordered row of square cards.
 *
 * NOT A COMBO LIST, for the same reason a Pick'em card is not one but by a
 * different mechanism. A Pick'em card scores each selection independently and
 * SUMS them. A TD card is all-or-nothing for POINTS (only a perfect 3-of-3 earns
 * any) yet still RANKS on how many it got right, so a losing card is neither a
 * dead parlay nor a sum of parts: what it has to show is which three players,
 * and which of them scored.
 *
 * WHAT IT DOES NOT SHOW: no per-selection points column. Every TD leg is stored
 * with `points: 0` by design — the card carries ONE card-level total — so a
 * per-tile figure could only ever be a zero that reads as a bug.
 *
 * ODDS COME FROM THE RESPONSE, OR NOT AT ALL. A square prints the price on its
 * own leg when there is one and stays bare when there is not — no caption, no
 * "Unavailable" placeholder, and no second request to fetch a live quote.
 *
 * A TD leg is stored with `american_odds: null` until the shared capture at
 * lock, so in practice that means: bare while the contest is open, priced
 * afterwards, and bare forever on a scorer the capture could not resolve. The
 * MVP fills the open case with a moving public quote from a bundled catalog;
 * reproducing that here would cost a per-screen odds fetch, which is a price
 * this app has chosen not to pay for a number that is explicitly not the one
 * the leg will be graded at.
 * -------------------------------------------------------------------------- */

const STATE_COPY: Record<SelectionVisualState, string> = {
    pending: "Pending",
    win: "Correct",
    loss: "Incorrect",
    neutral: "No result",
};

const STATE_SYMBOL: Record<SelectionVisualState, string> = {
    pending: "…",
    win: "✓",
    loss: "×",
    neutral: "○",
};

/**
 * A VOIDED scorer says so, rather than falling back to the shared "No result".
 *
 * Both fold to the neutral visual state, but they are not the same fact: a void
 * is the capture reporting that it could not price or resolve this player, which
 * takes the whole card out of the placement race. "No result" is what an
 * ungraded leg on an otherwise settled card reads as, and there is nothing to
 * tell the member about that one.
 */
const selectionResultCopy = (leg: PickLeg, state: SelectionVisualState) => {
    const raw = typeof leg.result === "string" ? leg.result.trim().toLowerCase() : "";
    // `push` is listed for the same reason `tdPsychicSelectionResult` lists it:
    // the two must agree, or the Standings tally would count a pushed leg as
    // voided while the square it belongs to printed "No result".
    if (raw === "void" || raw === "not_found" || raw === "push") return "Void";
    return STATE_COPY[state];
};

const isPricedLeg = (leg: PickLeg) =>
    typeof leg.american_odds === "number" &&
    Number.isInteger(leg.american_odds) &&
    leg.american_odds !== 0;

/**
 * TRUE once this card is PAST THE SHARED LOCK.
 *
 * Deliberately broader than "carries a price". The capture prices every scorer
 * it can resolve and voids the rest, so a partially-voided card still has
 * prices — but a card it could resolve NONE of has no price anywhere, and
 * reading that as "not locked yet" would show the moving `Public data` quote on
 * a contest that closed hours ago. `lockedOddsAt` and a settled leg result are
 * both written only after the cutoff, so either one settles it.
 */
export const isTdPsychicCardPriced = (legs: readonly PickLeg[]) =>
    legs.some(
        (leg) =>
            isPricedLeg(leg) ||
            Boolean(leg.selection?.lockedOddsAt) ||
            (typeof leg.result === "string" &&
                leg.result.trim() !== "" &&
                leg.result.trim().toLowerCase() !== "pending")
    );

export type TdPsychicSelectionTileProps = {
    leg: PickLeg;
    state: SelectionVisualState;
};

export const TdPsychicSelectionTile = ({
    leg,
    state,
}: TdPsychicSelectionTileProps) => {
    const selection = leg.selection ?? {};
    const playerName = selection.playerName || leg.description || "Unnamed player";
    const [playerFirstName = playerName, ...playerRemainingNameParts] = playerName
        .trim()
        .split(/\s+/);
    const playerRemainingName = playerRemainingNameParts.join(" ");
    // Normalised, never printed raw: a provider that files a defensive player
    // under the touchdown market would otherwise put "CB" on a scorer card.
    const playerPosition = getTdPsychicEligiblePlayerPosition(selection.position);
    const teamVisual = getPickemTeamVisual(
        selection.teamAbbreviation
            ? { abbreviation: selection.teamAbbreviation }
            : { name: selection.teamName ?? "" }
    );
    const teamCardTint = getPickemTeamCardTint(teamVisual);
    const tone = getSelectionVisualTone(state);
    // Only an INCORRECT square goes neutral and grayscale. Pending, correct and
    // void all keep the team treatment — which is what stops a still-playing
    // card from looking like a lost one.
    const incorrect = state === "loss";
    const resultCopy = selectionResultCopy(leg, state);
    /*
     * THE RESPONSE DECIDES. A square shows a price when the leg it was built
     * from carries one, and shows nothing at all when it does not.
     *
     * That is the whole rule, and it is deliberately simpler than the MVP's. A
     * TD leg is stored with `american_odds: null` until the shared capture at
     * lock, so "no price on the leg" and "before the lock" are the same state
     * here — there is no live quote board to fall back on and no second request
     * made to fetch one. A scorer the capture could not resolve stays bare for
     * the same reason: the response has no number for it, so neither has the
     * card.
     */
    const showOdds = isPricedLeg(leg);
    const displayedOdds = showOdds
        ? formatPublicAmericanOdds(leg.american_odds as number)
        : "";

    return (
        <li
            data-td-psychic-pick-card
            data-pick-selection-state={state}
            data-feed-entry-selection="td_psychic"
            data-team-abbreviation={teamVisual.abbreviation}
            data-team-color={teamVisual.primary}
            data-td-psychic-team-surface={incorrect ? "neutral" : "team-color"}
            style={
                {
                    "--pickem-team-primary": teamVisual.primary,
                    "--pickem-team-secondary": teamVisual.secondary,
                    backgroundColor: incorrect ? undefined : teamCardTint,
                } as CSSProperties
            }
            /* Square on phones, then a shallow LANDSCAPE card from `md` up with
               the same minimum height a Pick'em tile has. A feed post is much
               wider than a phone, and three squares stretched to that width grew
               taller than the card they sit in. */
            className={`relative isolate flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-[#0d0f13] p-2 pb-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-3 sm:pb-3.5 md:aspect-auto md:min-h-[10rem] ${incorrect ? "border-white/[0.06] grayscale saturate-0" : "border-white/10"
                }`}
        >
            <div
                data-td-psychic-card-top
                className="flex min-w-0 items-start justify-between gap-1.5"
            >
                <span
                    aria-hidden="true"
                    className={`text-xs font-black tracking-[-0.04em] drop-shadow-md sm:text-lg ${incorrect ? "text-gray-300" : "text-white/90"
                        }`}
                >
                    {teamVisual.abbreviation}
                </span>
                {showOdds ? (
                    /* Sized to MATCH the team abbreviation in the opposite corner
                       at every viewport, so the two read as one header row rather
                       than a heading and a footnote. No caption above it: the only
                       price this card can ever show is the frozen one, so a label
                       naming which kind it is would say the same thing on every
                       square forever. */
                    <span
                        data-td-psychic-lock-odds
                        data-td-psychic-odds-value
                        data-td-psychic-card-position="top-right"
                        aria-label={`${playerName} odds at lock ${displayedOdds}`}
                        title={displayedOdds}
                        className={`max-w-[60%] min-w-0 shrink truncate whitespace-nowrap text-right text-xs font-semibold leading-none tabular-nums sm:text-lg sm:leading-normal ${incorrect ? "text-gray-300" : "text-white"
                            }`}
                    >
                        {displayedOdds}
                    </span>
                ) : null}
            </div>

            <div
                data-td-psychic-player-identity
                className="flex min-h-0 flex-1 flex-col justify-center py-0.5 sm:py-1"
            >
                <span className="sr-only">
                    {[teamVisual.abbreviation, playerPosition].filter(Boolean).join(" · ")}
                </span>
                {/* TWO LINES: first name, then the rest. A square this narrow
                    truncated "Amon-Ra St. Brown" to "Amon-…", which names nobody;
                    splitting on the first space keeps the surname — the half that
                    identifies the player — on its own line. The full name stays
                    intact for assistive tech and on the tooltip. */}
                <p
                    data-td-psychic-player-name
                    title={playerName}
                    className={`block min-w-0 text-[9px] font-semibold leading-[1.1] drop-shadow-md sm:text-xs sm:leading-[1.15] ${tone.text}`}
                >
                    <span className="sr-only">{playerName}</span>
                    <span
                        data-td-psychic-player-name-line="first"
                        aria-hidden="true"
                        className="block truncate"
                    >
                        {playerFirstName}
                    </span>
                    {playerRemainingName ? (
                        <span
                            data-td-psychic-player-name-line="remaining"
                            aria-hidden="true"
                            className="block truncate"
                        >
                            {playerRemainingName}
                        </span>
                    ) : null}
                </p>
                {playerPosition ? (
                    <p
                        data-td-psychic-player-position
                        aria-hidden="true"
                        className={`mt-0.5 block truncate text-[8px] font-medium uppercase tracking-[0.06em] sm:mt-1 sm:text-[9px] ${incorrect ? "text-gray-400" : "text-white/60"
                            }`}
                    >
                        {playerPosition}
                    </p>
                ) : null}
            </div>

            {/* ALWAYS drawn, including on an open card, where it reads "Pending".
                The MVP does the same (PickCardContent.tsx:728) and it is the right
                call: an ungraded square with no chip at all is indistinguishable
                from one whose result simply failed to render. */}
            <span
                data-td-psychic-selection-result
                data-td-psychic-card-position="bottom-right"
                aria-label={`${playerName}: ${resultCopy}`}
                title={resultCopy}
                className="mt-auto inline-flex min-h-4 min-w-4 self-end items-center justify-center gap-1 rounded-full border border-white/10 bg-black/15 px-1 text-[7px] font-semibold uppercase tracking-[0.04em] text-slate-300 sm:text-[8px]"
            >
                <span aria-hidden="true" className="shrink-0">
                    {STATE_SYMBOL[state]}
                </span>
                <span aria-hidden="true" className="hidden truncate sm:inline">
                    {resultCopy}
                </span>
            </span>

            <span
                data-td-psychic-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: incorrect ? "#6B7280" : teamVisual.secondary }}
            />
        </li>
    );
};

export const TdPsychicSelectionGrid = ({
    model,
    entryOnly = false,
}: {
    model: PickCardModel;
    entryOnly?: boolean;
}) => {
    if (!model.legs.length) return null;

    return (
        <ol
            data-td-psychic-pick-grid="feed"
            aria-label="TD Psychic picks"
            className={`${entryOnly ? "" : "mt-5"} grid w-full grid-cols-3 gap-2`}
        >
            {model.legs.map((leg, index) => (
                <TdPsychicSelectionTile
                    key={`${leg.selection?.playerId ?? leg.description}-${index}`}
                    leg={leg}
                    state={getComboLegVisualState(leg, model.result)}
                />
            ))}
        </ol>
    );
};

export type TdPsychicPickCardProps = PickCardBaseProps & {
    /**
     * The MOVING public quote per scorer, keyed by `selection.playerId`, shown
     * only while the card is still open.
     *
     * ENTRANT-ONLY, and that is the whole point of it being opt-in. The MVP
     * passes it on the entry screen and on the Entries tab's own-entry receipt
     * (`StructuredContestDetail.tsx:4106`, `:5261`) and nowhere else, because a
     * live quote on a card that is not yours is neither yours to act on nor the
     * price it will score at — the shared capture freezes one number per scorer
     * at the lock, and only that one ever reads `Odds at lock`.
     *
     * A `null` entry means the feed could not price that scorer: the square says
     * "Unavailable" under the `Public data` caption. Omit the prop entirely — as
     * the Feed, the field list and the Standings expansion all do — and the
     * square stays bare until the lock, exactly as before.
     */
};

export const TdPsychicPickCard = ({
    pick,
    collapsed = false,
    entryOnly = false,
    contextualPointsLabel,
    accent = "sky",
    includePostedAtPrefix = true,
    presentation = { kind: "ordinary" },
}: TdPsychicPickCardProps) => {
    // The prop wins; the context is only how a `FeedList` host reaches us.
    const model = buildPickCardModel({
        pick,
        presentation,
        contextualPointsLabel,
        accent,
        includePostedAtPrefix,
    });
    const locked = isTdPsychicCardPriced(model.legs);

    return (
        <PickCardShell
            model={model}
            collapsed={collapsed}
            entryOnly={entryOnly}
            primaryFooter={
                <ComboOddsRow americanOdds={pick.american_odds} locked={locked} />
            }
        >
            <TdPsychicSelectionGrid model={model} entryOnly={entryOnly} />
        </PickCardShell>
    );
};

export default TdPsychicPickCard;
