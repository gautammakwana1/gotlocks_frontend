"use client";

import type { CSSProperties } from "react";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
} from "@/lib/contests/pickemTeamVisual";
import { formatPublicAmericanOdds } from "@/lib/contests/publicCurrentOdds";
import type { Pick, PickLeg } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * An ACCEPTED TD PSYCHIC card, as the FEED sees it — the same ordered row of
 * three square cards the builder tray, the review screen, the accepted receipt,
 * the Entries list and the expanded standings all show.
 *
 * That repetition is the point, and the domain doc pins it: "The exact-three
 * selection summary is presented consistently as one ordered row of three square
 * cards in the builder tray and review, accepted receipts, Feed, Entries, and
 * expanded standings." A member has to recognise their own card at a glance in
 * six places, so this is the receipt's grid at feed scale rather than a
 * different rendering of the same data.
 *
 * NOT A COMBO LIST, for the same reason a Pick'em card is not one — but for a
 * different mechanism. A Pick'em card scores each selection independently and
 * SUMS them. A TD card is all-or-nothing for POINTS (only a perfect 3-of-3 earns
 * any) yet still ranks on how many it got right, so a losing card is neither a
 * dead parlay nor a sum of parts: what it has to show is which three players,
 * and which of them scored.
 *
 * WHAT IT DOES NOT SHOW: no per-selection points column. Every TD leg is stored
 * with `points: 0` by design — the card carries ONE card-level total — so a
 * per-tile figure could only ever be a zero that reads as a bug.
 *
 * ONE PRICE STATE, decided per CARD — see `isTdPsychicCardPriced`. Before the
 * lock the odds row is absent entirely, because a TD leg genuinely has no price
 * until the shared capture and this surface is handed no live quote board to
 * substitute; after the lock each square carries its frozen `Odds at lock`
 * price. A scorer the capture could not resolve reads "Unavailable" under that
 * post-lock label, which is the honest answer: the card is past its cutoff and
 * this leg has no price.
 * -------------------------------------------------------------------------- */

const RESULT_PRESENTATION: Record<
    string,
    { label: string; symbol: string; className: string }
> = {
    pending: {
        label: "Pending",
        symbol: "…",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
    win: {
        label: "Correct",
        symbol: "✓",
        className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    },
    loss: {
        label: "Incorrect",
        symbol: "×",
        className: "border-rose-300/25 bg-rose-300/10 text-rose-200",
    },
    void: {
        label: "Void",
        symbol: "○",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
    /*
     * A VOID, not a pending review. `foldTdPsychicLegResults` folds `not_found`
     * exactly as it folds `void`: the whole card goes void terminally and is out
     * of the placement race, and nothing revisits it. Rendering it amber would
     * tell the member their card is still being looked at.
     */
    not_found: {
        label: "Void",
        symbol: "○",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
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

const TdPsychicSelectionTile = ({
    leg,
    locked,
    showResults,
}: {
    leg: PickLeg;
    locked: boolean;
    showResults: boolean;
}) => {
    const selection = leg.selection ?? {};
    const playerName = selection.playerName || leg.description || "Unnamed player";
    const teamVisual = getPickemTeamVisual(
        selection.teamAbbreviation
            ? { abbreviation: selection.teamAbbreviation }
            : { name: selection.teamName ?? "" }
    );
    const teamCardTint = getPickemTeamCardTint(teamVisual);

    const result = (leg.result as string) ?? "pending";
    const presentation = RESULT_PRESENTATION[result] ?? RESULT_PRESENTATION.pending;
    // Only an INCORRECT square goes neutral and grayscale. Pending, correct and
    // void all keep the team treatment — the doc is explicit about that, and it
    // is what stops a still-playing card from looking like a lost one.
    const incorrect = showResults && result === "loss";

    /*
     * NO ODDS ROW BEFORE THE LOCK, and that is not a shortcut — it is the only
     * honest option on this surface.
     *
     * A TD leg is stored with `american_odds: null` by design until the shared
     * capture, and this component is handed a `Pick`, never a live quote board.
     * So pre-lock there is genuinely no number to show: printing
     * "Public data — Unavailable" on all three tiles would contradict the +250 /
     * +180 / -120 the member watched in the builder minutes earlier. The MVP
     * gates its equivalent block the same way. The entry screen's own receipt DOES
     * have the live board and shows the moving quote there.
     */
    const displayedOdds = isPricedLeg(leg)
        ? formatPublicAmericanOdds(leg.american_odds as number)
        : "Unavailable";

    return (
        <li
            data-td-psychic-pick-card
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
            className={`relative isolate flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-[#0d0f13] p-2 pb-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-3 sm:pb-3.5 ${
                incorrect ? "border-white/[0.06] grayscale saturate-0" : "border-white/10"
            }`}
        >
            <span className="flex min-w-0 items-start justify-between gap-1.5">
                <span
                    aria-hidden="true"
                    className={`text-xs font-black tracking-[-0.04em] drop-shadow-md sm:text-lg ${
                        incorrect ? "text-gray-300" : "text-white/90"
                    }`}
                >
                    {teamVisual.abbreviation}
                </span>
                {showResults ? (
                    <span
                        aria-label={`${playerName}: ${presentation.label}`}
                        title={presentation.label}
                        className={`inline-flex min-h-4 min-w-4 items-center justify-center gap-1 rounded-full border px-1 py-0.5 text-[7px] font-semibold uppercase leading-3 tracking-[0.04em] ${presentation.className}`}
                    >
                        <span aria-hidden="true" className="shrink-0">
                            {presentation.symbol}
                        </span>
                        <span className="hidden min-w-0 sm:line-clamp-2">
                            {presentation.label}
                        </span>
                    </span>
                ) : null}
            </span>
            <span
                data-td-psychic-player-identity
                className="flex min-h-0 flex-1 flex-col justify-center py-1"
            >
                <span className="sr-only">
                    {[teamVisual.abbreviation, selection.position].filter(Boolean).join(" · ")}
                </span>
                <span
                    title={playerName}
                    className={`block min-w-0 truncate text-[9px] font-semibold leading-[1.1] drop-shadow-md sm:line-clamp-2 sm:whitespace-normal sm:text-xs sm:leading-[1.15] ${
                        incorrect ? "text-gray-300" : "text-white"
                    }`}
                >
                    {playerName}
                </span>
                {selection.position ? (
                    <span
                        aria-hidden="true"
                        className={`mt-1 hidden truncate text-[8px] font-medium uppercase tracking-[0.06em] sm:block sm:text-[9px] ${
                            incorrect ? "text-gray-400" : "text-white/60"
                        }`}
                    >
                        {selection.position}
                    </span>
                ) : null}
            </span>
            {locked ? (
                <span
                    data-td-psychic-lock-odds
                    aria-label={`${playerName} odds at lock ${displayedOdds.toLowerCase()}`}
                    className="mt-auto block min-w-0 border-t border-white/20 pt-1 text-left sm:pt-2"
                >
                    <span
                        className={`block truncate text-[7px] font-semibold uppercase leading-none tracking-[0.02em] sm:text-[8px] sm:tracking-[0.07em] ${
                            incorrect ? "text-gray-500" : "text-white/60"
                        }`}
                    >
                        Odds at lock
                    </span>
                    <span
                        className={`mt-0.5 block truncate text-[9px] font-semibold leading-none tabular-nums sm:text-xs sm:leading-normal ${
                            incorrect ? "text-gray-300" : "text-white"
                        }`}
                    >
                        {displayedOdds}
                    </span>
                </span>
            ) : null}
            <span
                data-td-psychic-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: incorrect ? "#6B7280" : teamVisual.secondary }}
            />
        </li>
    );
};

export type TdPsychicEntrySelectionsProps = {
    pick: Pick;
    /**
     * FALSE while the contest hides its field. The row is still drawn — a member
     * looking at their OWN sealed card should see it — but with no result chips,
     * because nothing has been graded.
     */
    showResults?: boolean;
};

/**
 * The three squares, plus the card-level Combo figure once the lock has produced
 * one.
 *
 * The Combo price is shown ONLY after the capture, and is labelled as what it
 * is. It multiplies all three lock prices; the tiebreak that actually ranks a
 * 2-of-3 card multiplies only its CORRECT scorers, so this number must never be
 * presented as the card's ranking value.
 */
export const TdPsychicEntrySelections = ({
    pick,
    showResults = true,
}: TdPsychicEntrySelectionsProps) => {
    const legs = pick.legs ?? [];
    if (!legs.length) return null;

    const locked = isTdPsychicCardPriced(legs);
    const comboAmericanOdds =
        typeof pick.american_odds === "number" && pick.american_odds !== 0
            ? pick.american_odds
            : null;

    return (
        <div data-td-psychic-entry-selections className="mt-3">
            <ol
                data-td-psychic-pick-grid="feed"
                className="grid grid-cols-3 gap-2 sm:gap-3"
                aria-label="TD Psychic picks"
            >
                {legs.map((leg, index) => (
                    <TdPsychicSelectionTile
                        key={`${leg.selection?.playerId ?? leg.description}-${index}`}
                        leg={leg}
                        locked={locked}
                        showResults={showResults}
                    />
                ))}
            </ol>
            {locked ? (
                <div
                    data-td-psychic-combo-odds
                    aria-label={`Combo odds at lock ${
                        comboAmericanOdds === null
                            ? "unavailable"
                            : formatPublicAmericanOdds(comboAmericanOdds)
                    }`}
                    className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3"
                >
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-400">
                            Combo odds
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-500">At lock</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-white">
                        {comboAmericanOdds === null
                            ? "Unavailable"
                            : formatPublicAmericanOdds(comboAmericanOdds)}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

export default TdPsychicEntrySelections;
