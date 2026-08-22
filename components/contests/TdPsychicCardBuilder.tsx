"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { CURRENT_ODDS_LOCK_DISCLOSURE } from "@/lib/contests/participationRules";
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
import ContestRulesAcceptance from "./ContestRulesAcceptance";
import { PickemCarousel } from "./PickemCarousel";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Choose 3 touchdown scorers" — the TD Psychic card builder, ported from the
 * MVP's components/contests/TdPsychicCardBuilder.tsx.
 *
 * Layout, copy, the search-or-browse split, the three-column square grids and
 * the sticky tray are the MVP's, verbatim — including the fact that the tray
 * button IS the submit. There is no review screen: the tray already shows the
 * card that is about to be sent, so a second read-only copy of it was chrome
 * between the member and the entry.
 *
 * What differs from the MVP, and why:
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
 *   - The MVP's submit is synchronous and calls nothing, so it can have neither
 *     an in-flight state nor a card to replace. Ours posts an entry and can be
 *     re-opened over an accepted card, so `Submitting…` and the caller's
 *     `Replace TD Psychic card` label are DELIBERATE KEEPS, not leftovers.
 *
 * A NOTE ON THE PICKER CHROME, because it is a deliberate departure from every
 * other contest surface: this component is neutral dark with WHITE controls, not
 * League sky-blue or Arena violet. The domain doc pins it ("the same neutral dark
 * treatment as Sunday Pick'em, with white selection controls instead of
 * League/Arena blue or purple accents") so the only colour on screen is the
 * player's own team tint — which is the thing the member is actually choosing
 * between. `accent` therefore reaches NOTHING here, not even the small type: it
 * stays on the props so the shells can hand every builder the same set, and is
 * ignored on purpose.
 * -------------------------------------------------------------------------- */

export type TdPsychicCardBuilderProps = {
    contestId: string;
    matchups: readonly TdPsychicMatchupOptions[];
    /**
     * Accepted for parity with the other entry builders and deliberately unused
     * — see the chrome note above. Removing it would only force every caller to
     * special-case this one template.
     */
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
    /** The entry endpoint refused the card; shown under the tray's submit. */
    submitError?: string | null;
    /** The entry endpoint accepted the card; shown under the tray's submit. */
    submitMessage?: string | null;
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

/**
 * The only message the builder raises on its own: a tap onto a card that is
 * already full. Submit outcomes are NOT here — they belong to the shell that
 * owns the request, and arrive back as `submitError` / `submitMessage`.
 */
type BuilderFeedback = { tone: "warning"; message: string };

const teamPositionLabel = (selection: TdPsychicCatalogSelection) =>
    [selection.teamAbbreviation, selection.position].filter(Boolean).join(" · ");

const oddsLabelFor = (selection: TdPsychicCatalogSelection) =>
    selection.currentOdds
        ? formatPublicAmericanOdds(selection.currentOdds.americanOdds)
        : "Unavailable";

/**
 * The team crest colours for a scorer.
 *
 * The name is passed ALONGSIDE the abbreviation, which the MVP has no reason to
 * do: its bundled catalog always supplies a code, whereas the live feed can send
 * `team_abbreviation: null` and the square would then render the grey `—`
 * placeholder for a club we can name perfectly well.
 */
const teamVisualFor = (selection: TdPsychicCatalogSelection) =>
    getPickemTeamVisual({
        abbreviation: selection.teamAbbreviation ?? undefined,
        name: selection.teamName ?? undefined,
    });

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
    const oddsCopy = oddsLabelFor(selection);
    const teamVisual = teamVisualFor(selection);
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
            {/* Selection is signalled by the card's own border, ring and
                aria-pressed — no tick badge. A hollow circle drawn on every
                UNSELECTED square is the loudest thing on a grid of nine and says
                nothing the border does not. */}
            <span
                data-td-psychic-card-top
                className="flex w-full min-w-0 items-start justify-between gap-1.5"
            >
                <span
                    aria-hidden="true"
                    className="text-xs font-black tracking-[-0.04em] text-white/90 drop-shadow-md sm:text-lg"
                >
                    {teamVisual.abbreviation}
                </span>
                <span
                    id={currentOddsDescriptionId}
                    data-current-odds
                    data-td-psychic-card-position="top-right"
                    aria-label={`${selection.playerName} current odds ${oddsCopy}`}
                    title={oddsCopy}
                    className="max-w-[60%] min-w-0 shrink text-right"
                >
                    <span className="sr-only">Current odds </span>
                    {" "}
                    <span className="block truncate whitespace-nowrap text-[9px] font-bold leading-none tabular-nums text-white sm:text-xs sm:leading-normal">
                        {oddsCopy}
                    </span>
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
                data-td-psychic-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: teamVisual.secondary }}
            />
        </button>
    );
};

export const TdPsychicCardBuilder = ({
    contestId,
    matchups,
    loading = false,
    error,
    partialNotice,
    onRetry,
    submitting = false,
    submitLabel,
    submitError,
    submitMessage,
    initialSelections,
    prefillNotice,
    versionKey,
    rulesAcceptance,
    onSubmit,
}: TdPsychicCardBuilderProps) => {
    const builderId = useId();

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
                <div data-entry-builder-matchup="td_psychic">
                    <h4
                        id={`${builderId}-matchup-${index}`}
                        data-entry-builder-matchup-label="td_psychic"
                        className="text-sm font-semibold text-white"
                    >
                        Matchup {index + 1} · {matchup.matchup}
                    </h4>
                    {/* The heading carries the group's accessible name now that
                        the <legend> is gone — without this the fieldset would be
                        announced unnamed. */}
                    <fieldset
                        aria-labelledby={`${builderId}-matchup-${index}`}
                        className="m-0 mt-3 min-w-0 border-0 p-0"
                    >
                        {selections.length ? (
                            <div
                                data-td-psychic-choice-grid="matchup"
                                className="grid grid-cols-3 gap-2 sm:gap-3"
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
                                                selectedIndex === undefined
                                                    ? null
                                                    : selectedIndex + 1
                                            }
                                            onToggle={toggleSelection}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-amber-200/20 bg-amber-200/5 px-3 py-4 text-xs leading-5 text-amber-100">
                                TD scorer markets are not posted for this matchup yet.
                            </p>
                        )}
                    </fieldset>
                </div>
            ),
        };
    });

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(selectedSelections.map(toTdPsychicScorerIdentity), selectedSelections);
    };

    /* ---------- PICK ---------- */
    const boardEmpty = !catalog.length;

    return (
        <section
            aria-label="TD Psychic card builder"
            data-entry-builder-surface="flat"
            className="text-gray-200"
        >
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-gray-400">
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
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
            </label>

            {/* The scorers arrive over the network, so this screen owns states the
                MVP's synchronous catalog never needs. Order matters below: search
                is resolved BEFORE the board is judged thin, and a thin board is a
                notice beside the carousel rather than a replacement for it —
                otherwise a slate whose games happened to return no scorers would
                hide the matchups the contest actually contains. */}
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
            ) : matchups.length ? (
                <>
                    {/* A network board can be posted one or two scorers deep, which
                        the MVP's bundled catalog can never be. Say so — but only
                        once there is a number worth reporting; a board with none
                        at all is already told per matchup inside the carousel. */}
                    {catalog.length > 0 && catalog.length < TD_PSYCHIC_SELECTION_COUNT ? (
                        <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 px-3 py-4 text-sm leading-5 text-amber-100">
                            Only {catalog.length} eligible touchdown{" "}
                            {catalog.length === 1 ? "scorer is" : "scorers are"} posted for this
                            slate so far — a card needs {TD_PSYCHIC_SELECTION_COUNT} different
                            players. Check back once the books post more.
                        </p>
                    ) : null}
                    <PickemCarousel
                        items={selectionCarouselItems}
                        versionKey={`td-psychic-${contestId}-${versionKey}`}
                        ariaLabel="TD Psychic matchup carousel"
                        itemName="matchup"
                        className="mt-4"
                    />
                </>
            ) : (
                <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 px-3 py-4 text-sm text-amber-100">
                    No eligible NFL matchups are available for this card.
                </p>
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

            {feedback ? (
                <p
                    role="alert"
                    className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-3 text-xs leading-5 text-amber-100"
                >
                    {feedback.message}
                </p>
            ) : null}

            {/* THE RULES BOX, which the MVP has no equivalent of. It cannot simply
                be dropped with the review screen that used to carry it: joining a
                feed contest and recording the rules acceptance are ONE backend
                call, so the acceptance has to be collected before the entry is
                posted. It sits directly above the tray — the last thing read
                before the button that sends the card. It appears only for a FIRST
                entry: the shell passes `rulesAcceptance` only while the member has
                no accepted entry, and a replacement re-uses the acceptance already
                on file. */}
            {rulesAcceptance ? (
                <ContestRulesAcceptance
                    accepted={rulesAcceptance.accepted}
                    onAcceptedChange={rulesAcceptance.onAcceptedChange}
                    label={rulesAcceptance.label}
                    rulesText={rulesAcceptance.rulesText}
                    rulesVersion={rulesAcceptance.rulesVersion}
                    // Neutral, like every other control on this builder — see the
                    // chrome note at the top of the file.
                    accent="neutral"
                    className="mt-4 border-y border-white/10 py-4"
                />
            ) : null}

            {/* THE TRAY. Sticky, the only place the card itself is shown, and the
                place it is submitted from — three squares, always three, empty
                ones dashed. */}
            <aside
                aria-label="TD Psychic selection tray"
                className="sticky bottom-3 z-20 mt-5 rounded-xl border border-white/10 bg-[#0b0d12]/95 p-3 text-gray-200 backdrop-blur"
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
                        const teamVisual = selection ? teamVisualFor(selection) : null;
                        const identityDescriptionId = selection
                            ? `td-tray-identity-${selection.id}`
                            : undefined;
                        const oddsDescriptionId = selection
                            ? `td-tray-odds-${selection.id}`
                            : undefined;
                        const oddsCopy = selection ? oddsLabelFor(selection) : "Unavailable";
                        return (
                            <li
                                key={selection?.playerId ?? `empty-${index}`}
                                data-td-psychic-pick-card
                                className="relative aspect-square min-h-0 min-w-0 overflow-visible"
                            >
                                {selection && teamVisual ? (
                                    <>
                                        {/* Removal is this 16px button and nothing
                                            else. The card surface below is inert on
                                            purpose: when the whole square was the
                                            remove control, any stray tap on a filled
                                            slot silently deleted a pick. */}
                                        <button
                                            type="button"
                                            data-td-psychic-selection-control="remove"
                                            data-td-psychic-card-position="outside-top-left"
                                            aria-label={`Remove ${selection.playerName} from Pick ${index + 1}`}
                                            aria-describedby={`${identityDescriptionId} ${oddsDescriptionId}`}
                                            title="Remove pick"
                                            onClick={() => toggleSelection(selection)}
                                            className="absolute -left-2 -top-2 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                        >
                                            −
                                        </button>
                                        <div
                                            data-td-psychic-pick-card-surface
                                            data-team-abbreviation={teamVisual.abbreviation}
                                            data-team-color={teamVisual.primary}
                                            data-td-psychic-team-surface="team-color"
                                            style={
                                                {
                                                    "--pickem-team-primary": teamVisual.primary,
                                                    "--pickem-team-secondary":
                                                        teamVisual.secondary,
                                                    backgroundColor:
                                                        getPickemTeamCardTint(teamVisual),
                                                } as CSSProperties
                                            }
                                            className="relative isolate flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0f13] p-2 pb-2.5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-3 sm:pb-3.5"
                                        >
                                            <span
                                                data-td-psychic-card-top
                                                className="flex w-full min-w-0 items-start justify-between gap-1.5"
                                            >
                                                <span className="text-xs font-black tracking-[-0.04em] text-white/90 drop-shadow-md sm:text-lg">
                                                    {teamVisual.abbreviation}
                                                </span>
                                                <span
                                                    id={oddsDescriptionId}
                                                    data-current-odds
                                                    data-td-psychic-card-position="top-right"
                                                    aria-label={`${selection.playerName} current odds ${oddsCopy}`}
                                                    title={oddsCopy}
                                                    className="max-w-[60%] min-w-0 shrink text-right"
                                                >
                                                    <span className="sr-only">Current odds </span>
                                                    {" "}
                                                    <span className="block truncate whitespace-nowrap text-[9px] font-semibold leading-none tabular-nums text-white sm:text-xs sm:leading-normal">
                                                        {oddsCopy}
                                                    </span>
                                                </span>
                                            </span>
                                            <span
                                                data-td-psychic-player-identity
                                                className="flex min-h-0 flex-1 flex-col justify-center py-1"
                                            >
                                                <span
                                                    id={identityDescriptionId}
                                                    className="sr-only"
                                                >
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
                                                data-td-psychic-team-strip
                                                aria-hidden="true"
                                                className="absolute inset-x-0 bottom-0 h-1"
                                                style={{
                                                    backgroundColor: teamVisual.secondary,
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div
                                        data-td-psychic-pick-card-surface
                                        data-td-psychic-team-surface="empty"
                                        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/20 p-2 text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-3"
                                    >
                                        <span
                                            aria-label={`Pick ${index + 1} empty`}
                                            className="flex h-full w-full items-center justify-center"
                                        >
                                            <span aria-hidden="true" className="text-lg">
                                                —
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {submitting ? "Submitting…" : (submitLabel ?? "Submit TD Psychic Card")}
                </button>
                {!rulesAccepted ? (
                    <p className="mt-2 text-center text-[11px] text-amber-100/80">
                        Accept the contest rules to submit.
                    </p>
                ) : null}
                {submitError ? (
                    <p role="alert" className="mt-3 text-center text-xs text-rose-300">
                        {submitError}
                    </p>
                ) : null}
                {submitMessage ? (
                    <p role="status" className="mt-3 text-center text-xs text-emerald-300">
                        {submitMessage}
                    </p>
                ) : null}
            </aside>
            <p data-current-odds-notice className="mt-3 text-xs leading-5 text-gray-400">
                {CURRENT_ODDS_LOCK_DISCLOSURE}
            </p>
        </section>
    );
};

export default TdPsychicCardBuilder;
