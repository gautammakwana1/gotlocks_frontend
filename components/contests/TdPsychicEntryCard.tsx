"use client";

import type { CSSProperties } from "react";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
} from "@/lib/contests/pickemTeamVisual";
import { CURRENT_ODDS_PUBLIC_DATA_LABEL } from "@/lib/contests/participationRules";
import { formatPublicAmericanOdds } from "@/lib/contests/publicCurrentOdds";
import type {
    TdPsychicEntrySelectionView,
    TdPsychicSelectionResult,
} from "@/lib/contests/tdPsychicEntry";

/* ----------------------------------------------------------------------------
 * The ACCEPTED TD PSYCHIC CARD — ported from the MVP's
 * components/contests/TdPsychicEntryCard.tsx.
 *
 * One ordered row of three square cards, and the same row everywhere the card is
 * shown: builder tray, review, this receipt, the Feed, the Entries list and the
 * expanded standings. The domain doc pins that consistency deliberately — a
 * member has to be able to recognise their own card at a glance in six places.
 *
 * TWO PRICE STATES, never both. Before the shared lock each square shows the
 * moving public quote under `Public data`; after it, the frozen per-scorer price
 * under `Odds at lock`, plus the full-card Combo figure. Which one renders is
 * decided by which key is PRESENT on the selection, not by whether it is null —
 * `lockTimeAmericanOdds: null` is a scorer whose price the capture could not
 * find, which is a real and different thing from "not locked yet".
 *
 * THE TEAM TREATMENT: pending, correct and void squares all keep their NFL team
 * tint and secondary-colour strip. ONLY an incorrect square goes neutral and
 * grayscale. Visual pick-number labels are deliberately omitted inside the
 * squares so they cannot be misread as jersey numbers; the order is carried for
 * assistive technology by the list itself and by the control labels.
 * -------------------------------------------------------------------------- */

export type TdPsychicEntryCardSelection = TdPsychicEntrySelectionView;

export type TdPsychicEntryCardProps = {
    selections: readonly TdPsychicEntryCardSelection[];
    submittedAt: string;
    /** Enable after lock, or whenever trusted grading should be visible. */
    showResults?: boolean;
    correctCount?: number;
    incorrectCount?: number;
    voidCount?: number;
    pendingCount?: number;
    /**
     * Full-card shared lock price — `picks.american_odds`, written by the
     * capture as the combined price of all three scorers.
     *
     * UNDEFINED means "not past the lock", and the block is not rendered at all.
     * NULL means "locked, but the combined price is unavailable", which is what
     * a voided card reads as. The two must not collapse into one.
     */
    comboAmericanOdds?: number | null;
    canEdit?: boolean;
    onEdit?: () => void;
    className?: string;
};

const entryTimeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
});

const resultPresentation: Record<
    TdPsychicSelectionResult,
    { label: string; symbol: string; className: string }
> = {
    pending: {
        label: "Pending",
        symbol: "…",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
    correct: {
        label: "Correct",
        symbol: "✓",
        className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    },
    incorrect: {
        label: "Incorrect",
        symbol: "×",
        className: "border-rose-300/25 bg-rose-300/10 text-rose-200",
    },
    void: {
        label: "Void",
        symbol: "○",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
    postponed: {
        label: "Postponed",
        symbol: "…",
        className: "border-amber-200/25 bg-amber-200/10 text-amber-100",
    },
    canceled: {
        label: "Canceled",
        symbol: "○",
        className: "border-white/10 bg-white/5 text-gray-300",
    },
    review_required: {
        label: "Review required",
        symbol: "!",
        className: "border-amber-200/25 bg-amber-200/10 text-amber-100",
    },
};

const countResults = (
    selections: readonly TdPsychicEntryCardSelection[],
    result: TdPsychicSelectionResult
) => selections.filter((selection) => (selection.result ?? "pending") === result).length;

export const TdPsychicEntryCard = ({
    selections,
    submittedAt,
    showResults = selections.some(
        (selection) => selection.result && selection.result !== "pending"
    ),
    correctCount = countResults(selections, "correct"),
    incorrectCount = countResults(selections, "incorrect"),
    voidCount = countResults(selections, "void") + countResults(selections, "canceled"),
    pendingCount = countResults(selections, "pending") +
        countResults(selections, "postponed") +
        countResults(selections, "review_required"),
    comboAmericanOdds,
    canEdit = false,
    onEdit,
    className = "",
}: TdPsychicEntryCardProps) => {
    const submittedDate = new Date(submittedAt);
    const submittedLabel = Number.isNaN(submittedDate.getTime())
        ? submittedAt
        : entryTimeFormatter.format(submittedDate);
    // ONE void selection voids the whole card — the capture cannot price a card
    // it is missing a scorer for, so the chip reports the card, not the leg.
    const cardIsVoid = voidCount > 0;
    const progressLabel = cardIsVoid
        ? "VOID"
        : pendingCount > 0
          ? `${correctCount} correct · ${pendingCount} pending`
          : `${correctCount} / ${selections.length}`;

    return (
        <article
            aria-label="TD Psychic entry receipt"
            className={`overflow-hidden rounded-2xl border border-white/10 bg-[#090b0f] p-3 text-gray-200 sm:p-5 ${className}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        TD Psychic
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">Your picks</h3>
                </div>
                {showResults ? (
                    <span
                        aria-label={`Card result: ${progressLabel}`}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] ${
                            cardIsVoid
                                ? "border-white/15 bg-white/5 text-gray-300"
                                : pendingCount > 0
                                  ? "border-amber-200/25 bg-amber-200/10 text-amber-100"
                                  : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        }`}
                    >
                        {progressLabel}
                    </span>
                ) : null}
            </div>

            <ol
                data-td-psychic-pick-grid="receipt"
                className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
                aria-label="TD Psychic picks"
            >
                {selections.map((selection) => {
                    const result = selection.result ?? "pending";
                    const presentation = resultPresentation[result];
                    const incorrect = showResults && result === "incorrect";
                    const teamVisual = getPickemTeamVisual({
                        abbreviation: selection.teamAbbreviation ?? undefined,
                    });
                    const teamCardTint = getPickemTeamCardTint(teamVisual);
                    // PRESENCE, not truthiness — see the header note on the two
                    // price states.
                    const hasLockTimeOdds = Object.prototype.hasOwnProperty.call(
                        selection,
                        "lockTimeAmericanOdds"
                    );
                    const hasPublicDataOdds = Object.prototype.hasOwnProperty.call(
                        selection,
                        "publicDataAmericanOdds"
                    );
                    const displayedAmericanOdds = hasLockTimeOdds
                        ? selection.lockTimeAmericanOdds
                        : selection.publicDataAmericanOdds;
                    const displayedOdds =
                        typeof displayedAmericanOdds === "number"
                            ? formatPublicAmericanOdds(displayedAmericanOdds)
                            : "Unavailable";
                    const oddsLabel = hasLockTimeOdds
                        ? "Odds at lock"
                        : CURRENT_ODDS_PUBLIC_DATA_LABEL;
                    return (
                        <li
                            key={selection.id}
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
                                incorrect
                                    ? "border-white/[0.06] grayscale saturate-0"
                                    : "border-white/10"
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
                                        aria-label={`${selection.playerName}: ${presentation.label}`}
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
                                    {[teamVisual.abbreviation, selection.position]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </span>
                                <span
                                    title={selection.playerName}
                                    className={`block min-w-0 truncate text-[9px] font-semibold leading-[1.1] drop-shadow-md sm:line-clamp-2 sm:whitespace-normal sm:text-xs sm:leading-[1.15] ${
                                        incorrect ? "text-gray-300" : "text-white"
                                    }`}
                                >
                                    {selection.playerName}
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
                            {hasLockTimeOdds || hasPublicDataOdds ? (
                                <span
                                    data-td-psychic-lock-odds={hasLockTimeOdds ? true : undefined}
                                    data-current-odds={hasLockTimeOdds ? undefined : true}
                                    aria-label={`${selection.playerName} ${
                                        hasLockTimeOdds ? "odds at lock" : "public data odds"
                                    } ${displayedOdds.toLowerCase()}`}
                                    className="mt-auto block min-w-0 border-t border-white/20 pt-1 text-left sm:pt-2"
                                >
                                    <span
                                        className={`block truncate text-[7px] font-semibold uppercase leading-none tracking-[0.02em] sm:text-[8px] sm:tracking-[0.07em] ${
                                            incorrect ? "text-gray-500" : "text-white/60"
                                        }`}
                                    >
                                        {oddsLabel}
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
                                style={{
                                    backgroundColor: incorrect ? "#6B7280" : teamVisual.secondary,
                                }}
                            />
                        </li>
                    );
                })}
            </ol>

            {comboAmericanOdds !== undefined ? (
                <div
                    data-td-psychic-combo-odds
                    aria-label={`Combo odds at lock ${
                        typeof comboAmericanOdds === "number"
                            ? formatPublicAmericanOdds(comboAmericanOdds)
                            : "unavailable"
                    }`}
                    className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4"
                >
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-gray-400">
                            Combo odds
                        </p>
                        <p className="mt-0.5 text-[9px] text-gray-500">At lock</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-white">
                        {typeof comboAmericanOdds === "number"
                            ? formatPublicAmericanOdds(comboAmericanOdds)
                            : "Unavailable"}
                    </span>
                </div>
            ) : null}

            <div
                className={`mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 ${
                    comboAmericanOdds === undefined ? "border-t border-white/10" : ""
                }`}
            >
                <div>
                    <p className="text-xs font-semibold text-white">
                        {selections.length} players selected
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">Submitted {submittedLabel}</p>
                </div>
                {canEdit && onEdit ? (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-xl border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-200 transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                        Edit Picks
                    </button>
                ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-600">
                        Read only
                    </span>
                )}
            </div>
            {showResults && incorrectCount > 0 && !cardIsVoid ? (
                <p className="sr-only">{incorrectCount} incorrect</p>
            ) : null}
        </article>
    );
};

export default TdPsychicEntryCard;
