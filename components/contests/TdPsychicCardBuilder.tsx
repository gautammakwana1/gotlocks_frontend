"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
    CURRENT_ODDS_LOCK_DISCLOSURE,
    CURRENT_ODDS_PUBLIC_DATA_LABEL,
} from "@/lib/contests/participationRules";
import { formatPublicAmericanOdds } from "@/lib/contests/publicCurrentOdds";
import {
    TD_PSYCHIC_FULL_CARD_WARNING,
    TD_PSYCHIC_SELECTION_COUNT,
    searchTdPsychicScorers,
    tdPsychicScorerCatalog,
    toTdPsychicScorerIdentity,
    type TdPsychicCatalogSelection,
    type TdPsychicMatchupOptions,
    type TdPsychicScorerIdentity,
} from "@/lib/contests/tdPsychicEntry";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
} from "@/lib/contests/pickemTeamVisual";
import { PickemCarousel } from "./PickemCarousel";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Choose 3 touchdown scorers" — the TD Psychic card builder, ported from the
 * MVP's components/contests/TdPsychicCardBuilder.tsx.
 *
 * Layout, copy, the search-or-browse split, the three-column square grids, the
 * sticky tray and the review screen are the MVP's, verbatim. What changed is
 * where the players come from and one rule:
 *
 *   - The MVP reads a synchronous local catalog (`tdPsychicCatalog.ts`) plus a
 *     separate quote table. Here both arrive together from
 *     `GET /leagues/nfl/td-scorers-by-events`, already eligibility-filtered, so
 *     this carries the loading / error / retry states the MVP has no need for.
 *
 *   - The MVP's builder re-checks eligibility client-side. That check is gone:
 *     the endpoint applies the market / main / `Over` / `0.5` filter itself, so
 *     a second copy here could only drift from the one that is enforced.
 *
 * A NOTE ON THE PICKER CHROME, because it is a deliberate departure from every
 * other contest surface: this component is neutral dark with WHITE controls, not
 * League sky-blue or Arena violet. The domain doc pins it ("the same neutral dark
 * treatment as Sunday Pick'em, with white selection controls instead of
 * League/Arena blue or purple accents") so the only colour on screen is the
 * player's own team tint — which is the thing the member is actually choosing
 * between. `accent` therefore only reaches the small type, never a control.
 * -------------------------------------------------------------------------- */

const accentClassesFor = (accent: FeedContestAccent) =>
    accent === "arena"
        ? { textSoft: "text-violet-200" }
        : { textSoft: "text-sky-200" };

export type TdPsychicCardBuilderProps = {
    contestId: string;
    matchups: readonly TdPsychicMatchupOptions[];
    accent?: FeedContestAccent;
    loading?: boolean;
    error?: string | null;
    /**
     * Some of the slate could be read and some could not — distinct from
     * `error`, which is "none of it". What arrived is still pickable, so this
     * warns beside the board instead of replacing it.
     */
    partialNotice?: string | null;
    onRetry?: () => void;
    submitting?: boolean;
    submitLabel?: string;
    /**
     * The accepted card's three players, re-resolved against the CURRENT board
     * (see `tdPsychicPrefillFromLegs`) — seeds a replacement so it opens
     * pre-filled. A scorer whose line has since been pulled is absent, which is
     * correct: re-sending it would be refused.
     */
    initialSelections?: readonly TdPsychicScorerIdentity[];
    /**
     * Why the card opened with fewer than three — a scorer whose line was pulled
     * since it was submitted. Rendered only while the card is INCOMPLETE, so it
     * clears itself the moment the member has chosen a replacement.
     */
    prefillNotice?: string | null;
    /** Changes whenever a different card or card version is shown. */
    versionKey: string;
    rulesAcceptance?: {
        accepted: boolean;
        onAcceptedChange: (accepted: boolean) => void;
        label: string;
        rulesText?: string | null;
        rulesVersion?: string | null;
    };
    onSubmit: (
        selections: TdPsychicScorerIdentity[],
        chosen: TdPsychicCatalogSelection[]
    ) => void;
};

type BuilderFeedback = { tone: "warning" | "error" | "success"; message: string };

const teamPositionLabel = (selection: TdPsychicCatalogSelection) =>
    [selection.teamAbbreviation, selection.position].filter(Boolean).join(" · ");

const oddsLabelFor = (selection: TdPsychicCatalogSelection) =>
    selection.currentOdds
        ? formatPublicAmericanOdds(selection.currentOdds.americanOdds)
        : "Unavailable";

/* ---------- One pickable square ---------- */

const PlayerChoice = ({
    selection,
    pickNumber,
    onToggle,
}: {
    selection: TdPsychicCatalogSelection;
    /** 1-based position on the card, or null when not selected. */
    pickNumber: number | null;
    onToggle: (selection: TdPsychicCatalogSelection) => void;
}) => {
    const selected = pickNumber !== null;
    const currentOddsDescriptionId = `td-current-odds-${selection.id}`;
    const teamVisual = getPickemTeamVisual({
        abbreviation: selection.teamAbbreviation ?? undefined,
    });
    return (
        <button
            type="button"
            data-td-psychic-player-choice
            data-td-psychic-player-choice-state={selected ? "selected" : "idle"}
            data-team-abbreviation={teamVisual.abbreviation}
            data-team-color={teamVisual.primary}
            aria-pressed={selected}
            aria-describedby={currentOddsDescriptionId}
            aria-label={
                selected
                    ? `Remove ${selection.playerName}, Pick ${pickNumber}`
                    : `Select ${selection.playerName} for Anytime TD`
            }
            onClick={() => onToggle(selection)}
            style={
                {
                    "--pickem-team-primary": teamVisual.primary,
                    "--pickem-team-secondary": teamVisual.secondary,
                    backgroundColor: getPickemTeamCardTint(teamVisual),
                } as CSSProperties
            }
            className={`relative isolate flex aspect-square min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-[#0d0f13] p-2 pb-2.5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:p-3 sm:pb-3.5 ${
                selected
                    ? "border-white/70 ring-1 ring-white/25"
                    : "border-white/10 hover:-translate-y-0.5 hover:border-white/35"
            }`}
        >
            <span className="flex w-full min-w-0 items-start justify-between gap-1.5">
                <span
                    aria-hidden="true"
                    className="text-xs font-black tracking-[-0.04em] text-white/90 drop-shadow-md sm:text-lg"
                >
                    {teamVisual.abbreviation}
                </span>
                {/* A tick, never the pick number: a numeral inside a player card
                    reads as a jersey number. The order is carried by the list and
                    by this control's own aria-label. */}
                <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                        selected
                            ? "border-white bg-white text-black"
                            : "border-white/25 bg-black/20 text-transparent"
                    }`}
                >
                    ✓
                </span>
            </span>
            <span
                data-td-psychic-player-identity
                className="flex min-h-0 flex-1 flex-col justify-center py-1"
            >
                <span className="sr-only">{teamPositionLabel(selection)}</span>
                <span
                    title={selection.playerName}
                    className="block min-w-0 truncate text-[9px] font-semibold leading-[1.1] text-white drop-shadow-md sm:line-clamp-2 sm:whitespace-normal sm:text-xs sm:leading-[1.15]"
                >
                    {selection.playerName}
                </span>
                {selection.position ? (
                    <span
                        aria-hidden="true"
                        className="mt-1 hidden truncate text-[8px] font-medium uppercase tracking-[0.06em] text-white/60 sm:block sm:text-[9px]"
                    >
                        {selection.position}
                    </span>
                ) : null}
            </span>
            <span
                id={currentOddsDescriptionId}
                data-current-odds
                className="mt-auto block min-w-0 border-t border-white/20 pt-1 text-left sm:pt-2"
            >
                <span className="block min-w-0 truncate text-[7px] font-semibold uppercase leading-none tracking-[0.02em] text-white/60 sm:text-[8px] sm:tracking-[0.07em]">
                    {CURRENT_ODDS_PUBLIC_DATA_LABEL}
                </span>
                <span className="mt-0.5 block truncate text-[9px] font-bold leading-none tabular-nums text-white sm:text-xs sm:leading-normal">
                    {oddsLabelFor(selection)}
                </span>
            </span>
            <span
                data-td-psychic-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: teamVisual.secondary }}
            />
        </button>
    );
};

/* ---------- One read-only square, as the review screen shows it ---------- */

const ReviewCard = ({ selection }: { selection: TdPsychicCatalogSelection }) => {
    const teamVisual = getPickemTeamVisual({
        abbreviation: selection.teamAbbreviation ?? undefined,
    });
    const odds = oddsLabelFor(selection);
    return (
        <li
            data-td-psychic-pick-card
            data-team-abbreviation={teamVisual.abbreviation}
            data-team-color={teamVisual.primary}
            data-td-psychic-team-surface="team-color"
            style={
                {
                    "--pickem-team-primary": teamVisual.primary,
                    "--pickem-team-secondary": teamVisual.secondary,
                    backgroundColor: getPickemTeamCardTint(teamVisual),
                } as CSSProperties
            }
            className="relative isolate flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0f13] p-2 pb-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-3 sm:pb-3.5"
        >
            <span className="flex min-w-0 items-start gap-1.5">
                <span
                    aria-hidden="true"
                    className="text-xs font-black tracking-[-0.04em] text-white/90 drop-shadow-md sm:text-lg"
                >
                    {teamVisual.abbreviation}
                </span>
            </span>
            <span
                data-td-psychic-player-identity
                className="flex min-h-0 flex-1 flex-col justify-center py-1"
            >
                <span className="sr-only">{teamPositionLabel(selection)}</span>
                <span
                    title={selection.playerName}
                    className="block min-w-0 truncate text-[9px] font-semibold leading-[1.1] text-white drop-shadow-md sm:line-clamp-2 sm:whitespace-normal sm:text-xs sm:leading-[1.15]"
                >
                    {selection.playerName}
                </span>
                {selection.position ? (
                    <span
                        aria-hidden="true"
                        className="mt-1 hidden truncate text-[8px] font-medium uppercase tracking-[0.06em] text-white/60 sm:block sm:text-[9px]"
                    >
                        {selection.position}
                    </span>
                ) : null}
            </span>
            <span
                data-current-odds
                aria-label={`${selection.playerName} public data odds ${odds.toLowerCase()}`}
                className="mt-auto block min-w-0 border-t border-white/20 pt-1 text-left sm:pt-2"
            >
                <span className="block min-w-0 truncate text-[7px] font-semibold uppercase leading-none tracking-[0.02em] text-white/60 sm:text-[8px] sm:tracking-[0.07em]">
                    {CURRENT_ODDS_PUBLIC_DATA_LABEL}
                </span>
                <span className="mt-0.5 block truncate text-[9px] font-bold leading-none tabular-nums text-white sm:text-xs sm:leading-normal">
                    {odds}
                </span>
            </span>
            <span
                data-td-psychic-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: teamVisual.secondary }}
            />
        </li>
    );
};

export const TdPsychicCardBuilder = ({
    contestId,
    matchups,
    accent = "league",
    loading = false,
    error,
    partialNotice,
    onRetry,
    submitting = false,
    submitLabel,
    initialSelections,
    prefillNotice,
    versionKey,
    rulesAcceptance,
    onSubmit,
}: TdPsychicCardBuilderProps) => {
    const accentClasses = accentClassesFor(accent);

    /**
     * Every distinct scorer on the slate, and the lookup the card is held in.
     *
     * The CARD IS A LIST OF PLAYER IDS, not of selection objects. That is what
     * lets the board re-quote underneath a half-built card without disturbing it:
     * a new price arrives as a new `TdPsychicCatalogSelection` for the same
     * `playerId`, and the selected three re-resolve through this map on the next
     * render with their prices refreshed and their order intact.
     */
    const catalog = useMemo(() => tdPsychicScorerCatalog(matchups), [matchups]);
    const selectionByPlayerId = useMemo(
        () => new Map(catalog.map((selection) => [selection.playerId, selection])),
        [catalog]
    );

    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [reviewing, setReviewing] = useState(false);
    const [feedback, setFeedback] = useState<BuilderFeedback>();
    /**
     * Has the member touched this card yet?
     *
     * The seed below is allowed to run late — an accepted card's prefill cannot
     * resolve until the scorer board lands — so it needs a way to tell "still
     * showing the empty default" from "the member has been picking". Without it,
     * a prefill arriving a second after mount silently replaces three choices
     * they had already made.
     */
    const touchedRef = useRef(false);

    /**
     * A DIFFERENT CARD — hard reset.
     *
     * `versionKey` changes only when the entry being edited or the rules version
     * does, so this is the one place the builder is allowed to throw away state.
     */
    useEffect(() => {
        touchedRef.current = false;
        setSelectedPlayerIds([]);
        setReviewing(false);
        setQuery("");
        setFeedback(undefined);
    }, [versionKey]);

    /**
     * THE PREFILL — seeded once, and only into an untouched empty card.
     *
     * Two things have to be true at the same time and neither can be assumed:
     *
     *   it arrives LATE. A replacement's three players are the stored card's
     *   re-resolved against a board that comes over the network, so
     *   `initialSelections` is empty on the first render and populated a moment
     *   later. Seeding only on `versionKey` would hand the member an empty
     *   builder and make them pick all three again.
     *
     *   it arrives AGAIN. The board re-quotes on its own schedule and each quote
     *   is a new array identity, so this effect re-runs with the same three
     *   players indefinitely. Seeding unconditionally would overwrite whatever
     *   the member had picked in between.
     *
     * The two guards below are what separate those: an untouched, still-empty
     * card is by definition one nobody has picked into yet.
     */
    useEffect(() => {
        if (touchedRef.current) return;
        const seeded = (initialSelections ?? [])
            .map((identity) => identity.playerId)
            .filter((playerId, index, ids) => ids.indexOf(playerId) === index)
            .slice(0, TD_PSYCHIC_SELECTION_COUNT);
        if (!seeded.length) return;
        setSelectedPlayerIds((current) => (current.length ? current : seeded));
    }, [initialSelections]);

    const selectedSelections = useMemo(
        () =>
            selectedPlayerIds
                .map((playerId) => selectionByPlayerId.get(playerId))
                .filter((selection): selection is TdPsychicCatalogSelection =>
                    Boolean(selection)
                ),
        [selectedPlayerIds, selectionByPlayerId]
    );
    const selectedIndexByPlayerId = useMemo(
        () => new Map(selectedSelections.map((selection, index) => [selection.playerId, index])),
        [selectedSelections]
    );

    const isComplete = selectedSelections.length === TD_PSYCHIC_SELECTION_COUNT;
    const rulesAccepted = rulesAcceptance ? rulesAcceptance.accepted : true;
    const canSubmit = isComplete && rulesAccepted && !submitting;

    /*
     * Decided from the RENDERED list, not inside the updater.
     *
     * The two calls have to stay out of `setSelectedPlayerIds`: an updater must
     * be pure, and React invokes it twice under StrictMode — which would fire the
     * "card is full" warning twice for one tap. `selectedPlayerIds` is already
     * the value this render drew the tray from, so reading it here is exactly the
     * state the member is looking at.
     */
    const toggleSelection = (selection: TdPsychicCatalogSelection) => {
        // Latched on the FIRST interaction, including one that is refused for a
        // full card: a member who has started choosing has taken this card over.
        touchedRef.current = true;
        if (selectedPlayerIds.includes(selection.playerId)) {
            setSelectedPlayerIds((current) =>
                current.filter((playerId) => playerId !== selection.playerId)
            );
            setFeedback(undefined);
            return;
        }
        if (selectedPlayerIds.length >= TD_PSYCHIC_SELECTION_COUNT) {
            setFeedback({ tone: "warning", message: TD_PSYCHIC_FULL_CARD_WARNING });
            return;
        }
        setSelectedPlayerIds((current) =>
            current.includes(selection.playerId) ||
            current.length >= TD_PSYCHIC_SELECTION_COUNT
                ? current
                : [...current, selection.playerId]
        );
        setFeedback(undefined);
    };

    const searchResults = useMemo(
        () => searchTdPsychicScorers(catalog, query),
        [catalog, query]
    );

    /**
     * One carousel page per MATCHUP, in slate order.
     *
     * Each page shows only the players this map still owns — a player who
     * appears in two of the slate's games is de-duped into the first, so the
     * same person is never offerable twice on one card.
     */
    const selectionCarouselItems = matchups.map((matchup, index) => {
        const selections = matchup.selections.filter(
            (selection) => selectionByPlayerId.get(selection.playerId) === selection
        );
        return {
            id: matchup.gameId,
            label: matchup.matchup,
            content: (
                <fieldset className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                    <legend className="px-1 text-sm font-semibold text-white">
                        Matchup {index + 1} · {matchup.matchup}
                    </legend>
                    {selections.length ? (
                        <div
                            data-td-psychic-choice-grid="matchup"
                            className="mt-3 grid grid-cols-3 gap-2 sm:gap-3"
                        >
                            {selections.map((selection) => {
                                const selectedIndex = selectedIndexByPlayerId.get(
                                    selection.playerId
                                );
                                return (
                                    <PlayerChoice
                                        key={selection.id}
                                        selection={selection}
                                        pickNumber={
                                            selectedIndex === undefined ? null : selectedIndex + 1
                                        }
                                        onToggle={toggleSelection}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-3 rounded-xl border border-amber-200/20 bg-amber-200/5 px-3 py-4 text-xs leading-5 text-amber-100">
                            TD scorer markets are not posted for this matchup yet.
                        </p>
                    )}
                </fieldset>
            ),
        };
    });

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(selectedSelections.map(toTdPsychicScorerIdentity), selectedSelections);
    };

    /* ---------- REVIEW ---------- */
    if (reviewing) {
        return (
            <section
                aria-label="Review TD Psychic card"
                className="rounded-2xl border border-white/10 bg-[#090b0f] p-4 text-gray-200 sm:p-5"
            >
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-gray-400">
                    TD Psychic
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Your 3 TD scorers</h3>
                <ol
                    data-td-psychic-pick-grid="review"
                    className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
                    aria-label="Selected TD scorers"
                >
                    {selectedSelections.map((selection) => (
                        <ReviewCard key={selection.id} selection={selection} />
                    ))}
                </ol>
                <p className="mt-4 text-sm leading-6 text-gray-300">
                    All three picks are predictions for a rushing or receiving touchdown.
                </p>

                {rulesAcceptance ? (
                    <section
                        data-contest-rules-confirmation
                        aria-label="Contest rules confirmation"
                        className="mt-4 border-y border-white/10 py-4"
                    >
                        {rulesAcceptance.rulesVersion ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-gray-400">
                                Rules version {rulesAcceptance.rulesVersion}
                            </p>
                        ) : null}
                        {rulesAcceptance.rulesText ? (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-300">
                                {rulesAcceptance.rulesText}
                            </p>
                        ) : null}
                        <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-5 text-gray-200">
                            <input
                                type="checkbox"
                                checked={rulesAcceptance.accepted}
                                onChange={(event) =>
                                    rulesAcceptance.onAcceptedChange(event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-white"
                            />
                            <span>{rulesAcceptance.label}</span>
                        </label>
                    </section>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => {
                            setReviewing(false);
                            setFeedback(undefined);
                        }}
                        className="rounded-xl border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-gray-200 transition hover:border-white/30"
                    >
                        Edit Picks
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 rounded-xl bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {submitting ? "Submitting…" : (submitLabel ?? "Submit TD Psychic Card")}
                    </button>
                </div>
                {!rulesAccepted ? (
                    <p className="mt-2 text-center text-[11px] text-amber-100/80">
                        Accept the contest rules to submit.
                    </p>
                ) : null}
                {feedback ? (
                    <p
                        role={feedback.tone === "success" ? "status" : "alert"}
                        className={`mt-3 text-center text-xs ${
                            feedback.tone === "success" ? "text-emerald-300" : "text-rose-300"
                        }`}
                    >
                        {feedback.message}
                    </p>
                ) : null}
                <p
                    data-current-odds-notice
                    className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-gray-300"
                >
                    {CURRENT_ODDS_LOCK_DISCLOSURE}
                </p>
            </section>
        );
    }

    /* ---------- PICK ---------- */
    const boardEmpty = !catalog.length;

    return (
        <section
            aria-label="TD Psychic card builder"
            className="rounded-2xl border border-white/10 bg-[#090b0f] p-4 text-gray-200 sm:p-5"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${accentClasses.textSoft}`}
                    >
                        TD Psychic
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                        Choose 3 touchdown scorers
                    </h3>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-gray-400">
                        Pick three different players to score a rushing or receiving touchdown.
                        Players from the same game are allowed.
                    </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300">
                    NFL · Exactly 3
                </span>
            </div>

            <label className="mt-4 block">
                <span className="sr-only">Search players or teams</span>
                <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setFeedback(undefined);
                    }}
                    placeholder="Search players or teams"
                    aria-label="Search players or teams"
                    disabled={boardEmpty}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </label>

            {/* The scorers arrive over the network, so this screen owns states the
                MVP's synchronous catalog never needs. */}
            {loading && boardEmpty ? (
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                    Loading this slate&rsquo;s touchdown scorers…
                </p>
            ) : error ? (
                <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-4">
                    <p className="text-sm text-red-100">{error}</p>
                    {onRetry ? (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40"
                        >
                            Try again
                        </button>
                    ) : null}
                </div>
            ) : catalog.length < TD_PSYCHIC_SELECTION_COUNT ? (
                <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 px-3 py-4 text-sm leading-5 text-amber-100">
                    {boardEmpty
                        ? "No eligible NFL matchups are available for this card."
                        : `Only ${catalog.length} eligible touchdown ${
                              catalog.length === 1 ? "scorer is" : "scorers are"
                          } posted for this slate so far — a card needs ${TD_PSYCHIC_SELECTION_COUNT} different players. Check back once the books post more.`}
                </p>
            ) : query.trim() ? (
                <section aria-label="TD scorer search results" className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.09em] text-gray-300">
                            Search results
                        </h4>
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="text-xs font-semibold text-gray-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                        >
                            Back to matchups
                        </button>
                    </div>
                    {searchResults.length ? (
                        <div
                            data-td-psychic-choice-grid="search"
                            className="mt-3 grid grid-cols-3 gap-2 sm:gap-3"
                        >
                            {searchResults.map((selection) => {
                                const selectedIndex = selectedIndexByPlayerId.get(
                                    selection.playerId
                                );
                                return (
                                    <PlayerChoice
                                        key={selection.id}
                                        selection={selection}
                                        pickNumber={
                                            selectedIndex === undefined ? null : selectedIndex + 1
                                        }
                                        onToggle={toggleSelection}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-3 rounded-xl border border-white/10 px-3 py-4 text-sm text-gray-400">
                            No TD scorers match your search.
                        </p>
                    )}
                </section>
            ) : (
                <PickemCarousel
                    items={selectionCarouselItems}
                    versionKey={`td-psychic-${contestId}-${versionKey}`}
                    ariaLabel="TD Psychic matchup carousel"
                    itemName="matchup"
                    className="mt-4"
                />
            )}

            {partialNotice ? (
                <div className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-3">
                    <p role="status" className="text-xs leading-5 text-amber-100">
                        {partialNotice}
                    </p>
                    {onRetry ? (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-2 rounded-lg border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-white/40"
                        >
                            Try again
                        </button>
                    ) : null}
                </div>
            ) : null}

            {prefillNotice && !isComplete ? (
                <p
                    role="status"
                    className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-3 text-xs leading-5 text-amber-100"
                >
                    {prefillNotice}
                </p>
            ) : null}

            {feedback?.tone === "warning" ? (
                <p
                    role="alert"
                    className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-3 text-xs leading-5 text-amber-100"
                >
                    {feedback.message}
                </p>
            ) : null}

            {/* THE TRAY. Sticky, and the only place the card itself is shown while
                picking — three squares, always three, empty ones dashed. */}
            <aside
                aria-label="TD Psychic selection tray"
                className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-white/10 bg-[#0b0d12]/95 p-3 text-gray-200 shadow-2xl backdrop-blur sm:p-4"
            >
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.11em] text-gray-300">
                        TD Psychic
                    </p>
                    <p aria-live="polite" className="text-xs font-semibold text-white">
                        {selectedSelections.length} / {TD_PSYCHIC_SELECTION_COUNT} selected
                    </p>
                </div>
                <ol
                    data-td-psychic-pick-grid="tray"
                    className="mt-4 grid grid-cols-3 gap-2 sm:gap-3"
                    aria-label="Current picks"
                >
                    {Array.from({ length: TD_PSYCHIC_SELECTION_COUNT }, (_, index) => {
                        const selection = selectedSelections[index];
                        const teamVisual = selection
                            ? getPickemTeamVisual({
                                  abbreviation: selection.teamAbbreviation ?? undefined,
                              })
                            : null;
                        const identityDescriptionId = selection
                            ? `td-tray-identity-${selection.id}`
                            : undefined;
                        const oddsDescriptionId = selection
                            ? `td-tray-odds-${selection.id}`
                            : undefined;
                        const odds = selection ? oddsLabelFor(selection) : "Unavailable";
                        return (
                            <li
                                key={selection?.playerId ?? `empty-${index}`}
                                data-td-psychic-pick-card
                                data-team-abbreviation={teamVisual?.abbreviation}
                                data-team-color={teamVisual?.primary}
                                data-td-psychic-team-surface={teamVisual ? "team-color" : "empty"}
                                style={
                                    teamVisual
                                        ? ({
                                              "--pickem-team-primary": teamVisual.primary,
                                              "--pickem-team-secondary": teamVisual.secondary,
                                              backgroundColor: getPickemTeamCardTint(teamVisual),
                                          } as CSSProperties)
                                        : undefined
                                }
                                className={`relative isolate aspect-square min-h-0 min-w-0 overflow-hidden rounded-xl border bg-[#0d0f13] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] ${
                                    selection
                                        ? "border-white/10"
                                        : "border-dashed border-white/10 bg-black/20"
                                }`}
                            >
                                {selection ? (
                                    <button
                                        type="button"
                                        aria-label={`Remove ${selection.playerName} from Pick ${index + 1}`}
                                        aria-describedby={`${identityDescriptionId} ${oddsDescriptionId}`}
                                        onClick={() => toggleSelection(selection)}
                                        className="relative z-10 flex h-full w-full min-w-0 flex-col p-2 pb-2.5 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 sm:p-3 sm:pb-3.5"
                                    >
                                        <span className="flex w-full items-start justify-between gap-1.5">
                                            <span className="text-xs font-black tracking-[-0.04em] text-white/90 drop-shadow-md sm:text-lg">
                                                {teamVisual?.abbreviation}
                                            </span>
                                            <span aria-hidden="true" className="text-xs text-white/55">
                                                ×
                                            </span>
                                        </span>
                                        <span
                                            data-td-psychic-player-identity
                                            className="flex min-h-0 flex-1 flex-col justify-center py-1"
                                        >
                                            <span id={identityDescriptionId} className="sr-only">
                                                {teamPositionLabel(selection)}
                                            </span>
                                            <span
                                                title={selection.playerName}
                                                className="block min-w-0 truncate text-[9px] font-semibold leading-[1.1] drop-shadow-md sm:line-clamp-2 sm:whitespace-normal sm:text-xs sm:leading-[1.15]"
                                            >
                                                {selection.playerName}
                                            </span>
                                            {selection.position ? (
                                                <span className="mt-1 hidden truncate text-[8px] font-medium uppercase tracking-[0.06em] text-white/60 sm:block sm:text-[9px]">
                                                    {selection.position}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span
                                            id={oddsDescriptionId}
                                            data-current-odds
                                            aria-label={`${selection.playerName} public data odds ${odds.toLowerCase()}`}
                                            className="mt-auto block min-w-0 border-t border-white/20 pt-1 sm:pt-2"
                                        >
                                            <span className="block min-w-0 truncate text-[7px] font-semibold uppercase leading-none tracking-[0.02em] text-white/60 sm:text-[8px] sm:tracking-[0.07em]">
                                                {CURRENT_ODDS_PUBLIC_DATA_LABEL}
                                            </span>{" "}
                                            <span className="mt-0.5 block truncate text-[9px] font-semibold leading-none tabular-nums text-white sm:text-xs sm:leading-normal">
                                                {odds}
                                            </span>
                                        </span>
                                    </button>
                                ) : (
                                    <span
                                        aria-label={`Pick ${index + 1} empty`}
                                        className="flex h-full w-full items-center justify-center p-2 text-gray-600 sm:p-3"
                                    >
                                        <span aria-hidden="true" className="text-lg">
                                            —
                                        </span>
                                    </span>
                                )}
                                {teamVisual ? (
                                    <span
                                        data-td-psychic-team-strip
                                        aria-hidden="true"
                                        className="absolute inset-x-0 bottom-0 h-1"
                                        style={{ backgroundColor: teamVisual.secondary }}
                                    />
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
                <button
                    type="button"
                    onClick={() => {
                        setReviewing(true);
                        setFeedback(undefined);
                    }}
                    disabled={!isComplete}
                    className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Review Picks
                </button>
            </aside>
            <p
                data-current-odds-notice
                className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-gray-300"
            >
                {CURRENT_ODDS_LOCK_DISCLOSURE}
            </p>
        </section>
    );
};

export default TdPsychicCardBuilder;
