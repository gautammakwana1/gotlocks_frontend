"use client";

import { Fragment, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { formatOdds } from "@/components/pick-builder/contest/contestSelections";
import {
    SUNDAY_PICKEM_MIN_GAMES,
    gameKickoffFormatter,
} from "@/lib/contests/feedContestCatalog";
import { CURRENT_ODDS_LOCK_DISCLOSURE } from "@/lib/contests/participationRules";
import {
    buildPickemLegs,
    type PickemMatchupOptions,
    type PickemTeamOption,
} from "@/lib/contests/pickemEntry";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
    splitPickemTeamName,
} from "@/lib/contests/pickemTeamVisual";
import type { FeedContestEntryLegPayload } from "@/lib/interfaces/interfaces";
import ContestRulesAcceptance from "./ContestRulesAcceptance";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Pick every included matchup winner" — the Sunday Pick'em card editor, ported
 * from the MVP's `PickemCardEntryEditor`
 * (gotlocks.app_mvp2/components/contests/StructuredContestDetail.tsx:2917).
 *
 * Layout, copy and the two-colour team cards are the MVP's: one flat `<ol>` of
 * every included matchup, each an away/VS/home row of two square cards, with the
 * finish block and the lock disclosure beneath the whole list.
 *
 * A PREVIOUS PASS PAGED THIS IN A CAROUSEL. That was a misread — the MVP's
 * `PickemCarousel` belongs to the ACCEPTED card's tiles in `PickCardContent`,
 * where two-per-page suits a receipt. Here it hid the one thing this form has to
 * communicate: a Pick'em card is all-or-nothing, so the member needs to see how
 * many games are still unanswered.
 *
 * What differs from the MVP, and why:
 *
 *   - The MVP reads a synchronous mock catalog and a separate "public current
 *     odds" table. Here the slate rides on the contest and its moneylines come
 *     from `GET /leagues/nfl/moneyline-odds`, joined by
 *     `pickemMatchupOptionsFromMoneyline`, so this carries loading / error /
 *     retry states the MVP has no need for.
 *
 *   - The MVP lets an entrant pick a team whose price reads "Unavailable",
 *     because over there a card is graded purely on who won. This backend
 *     rejects any leg without a non-zero integer price, so a team with no
 *     posted moneyline is DISABLED here rather than merely annotated — and says
 *     which of the two reasons applies, since a greyed card with no explanation
 *     reads as broken.
 *
 *   - The rules-acceptance block has no MVP equivalent: joining and accepting
 *     are one backend call here.
 * -------------------------------------------------------------------------- */

/**
 * The UNPICKED half of a decided matchup. Neutral on purpose: two team-coloured
 * cards side by side say nothing about which one was chosen, and this list can
 * run to thirteen games. Both values are the MVP's.
 */
const PICKEM_OPPONENT_CARD_TINT = "#2A2D33";
const PICKEM_OPPONENT_STRIP_TINT = "#6B7280";

const accentClassesFor = (accent: FeedContestAccent) =>
    accent === "arena"
        ? {
              textSoft: "text-violet-200",
              textStrong: "text-violet-50",
              previewSurface: "border-violet-300/20 bg-violet-500/10",
              checkbox: "accent-violet-400",
          }
        : {
              textSoft: "text-sky-200",
              textStrong: "text-sky-50",
              previewSurface: "border-sky-300/20 bg-sky-500/10",
              checkbox: "accent-sky-400",
          };

/**
 * The only fields seeding reads off an accepted card's leg.
 *
 * Structural rather than `PickLeg` or `FeedContestEntryLeg`: the two differ on
 * fields this has no interest in (`difficulty_label` is a union in one and a
 * bare string in the other), and both satisfy the four below.
 */
export type PickemAcceptedLeg = {
    description?: string | null;
    external_pick_key?: string | null;
    selection?: { gameId?: string | null; side?: string | null } | null;
};

export type PickemCardEntryEditorProps = {
    contestId: string;
    matchups: readonly PickemMatchupOptions[];
    accent?: FeedContestAccent;
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    submitting?: boolean;
    submitLabel?: string;
    /** The accepted card's legs — seeds a replacement so it opens pre-filled. */
    initialLegs?: readonly PickemAcceptedLeg[];
    /** Changes whenever a different card or card version is shown. */
    versionKey: string;
    rulesAcceptance?: {
        accepted: boolean;
        onAcceptedChange: (accepted: boolean) => void;
        label: string;
        rulesText?: string | null;
        rulesVersion?: string | null;
    };
    onSubmit: (legs: FeedContestEntryLegPayload[], chosen: PickemTeamOption[]) => void;
};

export const PickemCardEntryEditor = ({
    contestId,
    matchups,
    accent = "league",
    loading = false,
    error,
    onRetry,
    submitting = false,
    submitLabel,
    initialLegs,
    versionKey,
    rulesAcceptance,
    onSubmit,
}: PickemCardEntryEditorProps) => {
    const accentClasses = accentClassesFor(accent);
    // Names each matchup's heading so its stripped fieldset keeps an accessible
    // name — the MVP's `aria-labelledby` link, which a bare `<legend>` used to
    // provide implicitly.
    const editorId = useId();
    const [selectionsByGame, setSelectionsByGame] = useState<Record<string, string>>({});

    /**
     * The card an accepted entry already holds, keyed by game.
     *
     * TWO ways in, tried in order, because neither alone is reliable:
     *
     *   1. `external_pick_key` — the book's selection id. Exact when the line is
     *      the same one the member picked.
     *   2. the TEAM NAME. A book that re-posts a line mints a NEW selection id,
     *      which would silently blank the whole card on a replacement and make
     *      the member re-pick every game. The team they backed does not change,
     *      so it is the stable key; `legs[].selection.side` holds it (the server
     *      writes the club name there, not "home"/"away").
     */
    const acceptedSelections = useMemo(() => {
        const legs = initialLegs ?? [];
        if (!legs.length) return {} as Record<string, string>;

        const keys = new Set(
            legs.map((leg) => leg.external_pick_key).filter((key): key is string => Boolean(key))
        );
        const teamByGameId = new Map(
            legs.map((leg) => [
                leg.selection?.gameId ?? "",
                (leg.selection?.side ?? leg.description ?? "").trim().toLowerCase(),
            ])
        );

        const accepted: Record<string, string> = {};
        matchups.forEach((matchup) => {
            const byKey = matchup.options.find(
                (candidate) => candidate.selection && keys.has(candidate.selection.id)
            );
            if (byKey) {
                accepted[matchup.gameId] = byKey.teamId;
                return;
            }
            const team = teamByGameId.get(matchup.gameId);
            if (!team) return;
            const byTeam = matchup.options.find(
                (candidate) => candidate.name.trim().toLowerCase() === team
            );
            if (byTeam) accepted[matchup.gameId] = byTeam.teamId;
        });
        return accepted;
    }, [initialLegs, matchups]);

    /*
     * Seeded once the catalog lands, NOT on mount: the matchups arrive over the
     * network, so an effect keyed on the accepted map is the only point at which
     * the accepted teams can be resolved to options. Keyed on `versionKey` too,
     * so a different card version reseeds rather than keeping the old picks.
     */
    useEffect(() => {
        setSelectionsByGame(acceptedSelections);
    }, [acceptedSelections, versionKey]);

    const selectedItems = useMemo(
        () =>
            matchups
                .map((matchup) =>
                    matchup.options.find(
                        (option) => option.teamId === selectionsByGame[matchup.gameId]
                    )
                )
                .filter((option): option is PickemTeamOption => Boolean(option)),
        [matchups, selectionsByGame]
    );

    const enoughGames = matchups.length >= SUNDAY_PICKEM_MIN_GAMES;
    // Every matchup must offer BOTH moneylines and still be pregame, or the card
    // can never be completed — the server refuses a leg failing either.
    const startedMatchups = matchups.filter((matchup) => matchup.started);
    const unpricedMatchups = matchups.filter(
        (matchup) => !matchup.started && !matchup.pickable
    );
    const blockedCount = startedMatchups.length + unpricedMatchups.length;
    const complete = enoughGames && selectedItems.length === matchups.length;

    const selectedSignature = matchups
        .map((matchup) => selectionsByGame[matchup.gameId] ?? "")
        .join("|");
    const acceptedSignature = matchups
        .map((matchup) => acceptedSelections[matchup.gameId] ?? "")
        .join("|");
    const hasAcceptedCard = Object.keys(acceptedSelections).length > 0;
    const changed = !hasAcceptedCard || selectedSignature !== acceptedSignature;

    const rulesAccepted = rulesAcceptance ? rulesAcceptance.accepted : true;
    const canSubmit = complete && changed && rulesAccepted && !submitting;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(buildPickemLegs(selectedItems), selectedItems);
    };

    /*
     * ONE FLAT LIST, not a pager. The MVP renders every included matchup in a
     * single `<ol>` separated by hairlines, and that is the right shape here for
     * a reason the MVP does not have to state: a Pick'em card is ALL-OR-NOTHING —
     * the entry is refused until every game has a winner — so the member needs to
     * see how much is left, and a pager hides exactly that. The carousel this
     * replaced belongs to the ACCEPTED card's tiles, where two-per-page is right
     * because those are a receipt rather than a form.
     */
    const selectionMatchups = matchups.map((matchup, index) => {
        const selectedTeamId = selectionsByGame[matchup.gameId];
        return (
            <li
                key={matchup.gameId}
                data-entry-builder-matchup="sunday_pickem"
                className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0"
            >
                <h4
                    id={`${editorId}-matchup-${index}`}
                    data-entry-builder-matchup-label="sunday_pickem"
                    className="text-sm font-semibold text-white"
                >
                    Matchup {index + 1} · {matchup.matchup}
                </h4>
                <fieldset
                    aria-labelledby={`${editorId}-matchup-${index}`}
                    className="m-0 mt-3 min-w-0 border-0 p-0"
                >
                    {matchup.options.length ? (
                        <div
                            data-pickem-choice-grid
                            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 sm:gap-3"
                        >
                            {matchup.options.map((item, optionIndex) => {
                                const checked = selectedTeamId === item.teamId;
                                /*
                                 * The team the member did NOT pick goes neutral —
                                 * the tint and the strip both. It is what makes a
                                 * decided matchup readable at a glance in a list
                                 * of thirteen: two team-coloured cards side by
                                 * side say nothing about which one was chosen.
                                 */
                                const opponent = Boolean(selectedTeamId) && !checked;
                                // Ours alone: this endpoint refuses a leg with no
                                // price or a kicked-off game, so such a card is
                                // disabled rather than merely annotated.
                                const selectable = Boolean(item.selection) && !matchup.started;
                                const oddsDescriptionId = `pickem-current-odds-${contestId}-${matchup.gameId}-${item.teamId}`;
                                const teamVisual = getPickemTeamVisual({
                                    abbreviation: item.abbreviation,
                                });
                                const teamCardTint = getPickemTeamCardTint(teamVisual);
                                const teamName = splitPickemTeamName(item.name);
                                const currentOddsCopy = item.selection
                                    ? formatOdds(item.selection.americanOdds)
                                    : "Unavailable";
                                return (
                                    <Fragment key={item.teamId}>
                                        {optionIndex === 1 ? (
                                            <span
                                                data-pickem-versus
                                                aria-hidden="true"
                                                className="self-center justify-self-center text-[9px] font-black uppercase tracking-[0.08em] text-gray-500 sm:text-[10px]"
                                            >
                                                VS
                                            </span>
                                        ) : null}
                                        <label
                                            data-pickem-team-choice
                                            data-pickem-team-card-state={
                                                checked
                                                    ? "selected"
                                                    : !selectable
                                                        ? "unavailable"
                                                        : opponent
                                                            ? "opponent"
                                                            : "idle"
                                            }
                                            data-pickem-team-surface={
                                                opponent ? "neutral" : "team-color"
                                            }
                                            data-pickem-team-color-treatment={
                                                opponent ? undefined : "flat"
                                            }
                                            data-team-abbreviation={teamVisual.abbreviation}
                                            data-team-color={teamVisual.primary}
                                            style={
                                                {
                                                    "--pickem-team-primary": teamVisual.primary,
                                                    "--pickem-team-secondary": teamVisual.secondary,
                                                    backgroundColor: opponent
                                                        ? PICKEM_OPPONENT_CARD_TINT
                                                        : teamCardTint,
                                                } as CSSProperties
                                            }
                                            className={`relative flex min-h-[10rem] min-w-0 flex-col overflow-hidden rounded-xl border bg-[#0d0f13] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 focus-within:ring-2 focus-within:ring-white/80 ${!selectable
                                                ? "cursor-not-allowed border-white/10 opacity-45"
                                                : checked
                                                    ? "cursor-pointer border-white/70 ring-1 ring-white/25"
                                                    : opponent
                                                        ? "cursor-pointer border-white/10 hover:-translate-y-0.5 hover:border-white/30"
                                                        : "cursor-pointer border-white/10 hover:-translate-y-0.5 hover:border-white/35"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                aria-label={`Pick ${item.name} as winner`}
                                                aria-describedby={oddsDescriptionId}
                                                name={`pickem-${contestId}-${matchup.gameId}`}
                                                value={item.teamId}
                                                checked={checked}
                                                disabled={!selectable}
                                                // Tapping the CHOSEN card clears it. A radio
                                                // group otherwise has no way back to "no pick
                                                // yet", and on this card that state is real —
                                                // it is what the counter above is counting.
                                                onClick={() => {
                                                    if (!checked) return;
                                                    setSelectionsByGame((current) => {
                                                        if (current[matchup.gameId] !== item.teamId) {
                                                            return current;
                                                        }
                                                        const next = { ...current };
                                                        delete next[matchup.gameId];
                                                        return next;
                                                    });
                                                }}
                                                onChange={() => {
                                                    if (checked) return;
                                                    setSelectionsByGame((current) => ({
                                                        ...current,
                                                        [matchup.gameId]: item.teamId,
                                                    }));
                                                }}
                                                className="sr-only"
                                            />
                                            <span className="relative z-10 flex h-full flex-1 flex-col">
                                                <span className="flex items-start justify-between gap-2">
                                                    <span
                                                        aria-hidden="true"
                                                        className="text-lg font-black tracking-[-0.05em] text-white/90 drop-shadow-md"
                                                    >
                                                        {teamVisual.abbreviation}
                                                    </span>
                                                    <span
                                                        aria-hidden="true"
                                                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${checked
                                                            ? "border-white bg-white text-black"
                                                            : "border-white/25 bg-black/20 text-transparent"
                                                            }`}
                                                    >
                                                        ✓
                                                    </span>
                                                </span>
                                                <span
                                                    data-pickem-team-details
                                                    className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2"
                                                >
                                                    <span
                                                        data-pickem-team-name
                                                        aria-label={item.name}
                                                        className="min-w-0 drop-shadow-md"
                                                    >
                                                        <span
                                                            data-pickem-team-city
                                                            className="block text-[9px] font-medium leading-none text-white/65 sm:text-[10px]"
                                                        >
                                                            {teamName.city || " "}
                                                        </span>
                                                        <span
                                                            data-pickem-team-nickname
                                                            className="mt-1 block text-[11px] font-semibold leading-none text-white sm:text-xs"
                                                        >
                                                            {teamName.nickname}
                                                        </span>
                                                    </span>
                                                    <span
                                                        id={oddsDescriptionId}
                                                        data-current-odds
                                                        aria-label={`${item.name} current odds ${currentOddsCopy}`}
                                                        className="shrink-0 text-right text-[11px] font-semibold leading-none tabular-nums text-white sm:text-xs"
                                                    >
                                                        <span className="sr-only">
                                                            Current odds {currentOddsCopy}
                                                        </span>
                                                        <span aria-hidden="true" data-current-odds-value>
                                                            {currentOddsCopy}
                                                        </span>
                                                    </span>
                                                </span>
                                                {/* Ours alone, and only when the card cannot be
                                                    picked: a greyed-out card with no reason on it
                                                    reads as broken. */}
                                                {!selectable ? (
                                                    <span
                                                        data-pickem-choice-blocked
                                                        className="mt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-100/80"
                                                    >
                                                        {matchup.started ? "Already started" : "No moneyline"}
                                                    </span>
                                                ) : null}
                                                {item.gameStartsAt ? (
                                                    <span
                                                        data-pickem-choice-time
                                                        className="mt-auto pt-2 text-[9px] leading-4 text-white/65"
                                                    >
                                                        {gameKickoffFormatter.format(
                                                            new Date(item.gameStartsAt)
                                                        )}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span
                                                data-pickem-team-strip
                                                aria-hidden="true"
                                                className="absolute inset-x-0 bottom-0 h-1"
                                                style={{
                                                    backgroundColor: opponent
                                                        ? PICKEM_OPPONENT_STRIP_TINT
                                                        : teamVisual.secondary,
                                                }}
                                            />
                                        </label>
                                    </Fragment>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-amber-100">
                            This included game no longer resolves to two scheduled teams.
                        </p>
                    )}
                </fieldset>
            </li>
        );
    });

    const remaining = matchups.length - selectedItems.length;

    return (
        <section
            aria-label="Sunday Pick&rsquo;em card editor"
            data-entry-builder-surface="flat"
            className="text-gray-200"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.11em] ${accentClasses.textSoft}`}
                    >
                        Sunday Pick&rsquo;em
                    </p>
                    <h3 className="mt-1 font-semibold text-white">
                        Pick every included matchup winner
                    </h3>
                </div>
                <span
                    className={`shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-[0.09em] ${complete ? "text-emerald-100" : "text-amber-100"
                        }`}
                >
                    {selectedItems.length}/{matchups.length} games
                </span>
            </div>

            {/* The markets arrive over the network, so this screen owns states the
                MVP's synchronous catalog never needs. */}
            {loading && !matchups.length ? (
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                    Loading this slate&rsquo;s moneylines…
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
            ) : !enoughGames ? (
                <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    This Pick&rsquo;em slate needs at least {SUNDAY_PICKEM_MIN_GAMES} eligible
                    games.
                </p>
            ) : (
                <>
                    {blockedCount ? (
                        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-5 text-amber-100">
                            {blockedCount} of {matchups.length} matchups cannot be picked
                            {unpricedMatchups.length
                                ? ` — ${unpricedMatchups.length} with no moneyline posted yet`
                                : ""}
                            {startedMatchups.length
                                ? `${unpricedMatchups.length ? "," : " —"} ${startedMatchups.length} already started`
                                : ""}
                            . A Pick&rsquo;em card is the whole slate, so every included game needs
                            a live price on both teams before this entry can be submitted.
                        </p>
                    ) : null}

                    <ol
                        data-pickem-matchup-list
                        aria-label="Pick&rsquo;em matchups"
                        className="mt-5 list-none space-y-6"
                    >
                        {selectionMatchups}
                    </ol>

                    {/* AFTER the whole list, not inside the last matchup: the card is
                        the whole slate, so the thing that submits it belongs to the
                        slate rather than to whichever game happens to be last. */}
                    <div
                        data-pickem-entry-finish
                        className="mt-6 border-t border-white/10 pt-4"
                    >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <p
                                    className={`text-[10px] font-semibold uppercase tracking-[0.11em] ${accentClasses.textSoft}`}
                                >
                                    Finish entry
                                </p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                    {complete
                                        ? `${selectedItems.length} winners selected`
                                        : `Select ${remaining} more ${remaining === 1 ? "winner" : "winners"}`}
                                </p>
                            </div>
                            <span className="text-xs text-gray-500">
                                {selectedItems.length}/{matchups.length}
                            </span>
                        </div>

                        {rulesAcceptance ? (
                            <ContestRulesAcceptance
                                accepted={rulesAcceptance.accepted}
                                onAcceptedChange={rulesAcceptance.onAcceptedChange}
                                label={rulesAcceptance.label}
                                rulesText={rulesAcceptance.rulesText}
                                rulesVersion={rulesAcceptance.rulesVersion}
                                accent={accent === "arena" ? "arena" : "league"}
                                className="mt-4 border-y border-white/10 py-4"
                            />
                        ) : null}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.09em] text-black shadow-xl transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting
                                ? "Submitting…"
                                : (submitLabel ??
                                    (hasAcceptedCard
                                        ? "Replace complete card"
                                        : "Join and submit card"))}
                        </button>

                        {!complete ? (
                            <p className="mt-2 text-center text-[11px] leading-5 text-gray-500">
                                Pick one winner in every matchup to submit.
                            </p>
                        ) : !changed ? (
                            <p className="mt-2 text-center text-[11px] leading-5 text-gray-500">
                                Change at least one winner to replace your accepted card.
                            </p>
                        ) : !rulesAccepted ? (
                            <p className="mt-2 text-center text-[11px] leading-5 text-amber-100/80">
                                Accept the contest rules to submit.
                            </p>
                        ) : null}
                    </div>
                </>
            )}

            {/* At the FOOT of the editor, under a hairline — the MVP's placement.
                It explains why the prices above will move, which is a thing to read
                after seeing them rather than before. */}
            <p
                data-current-odds-notice
                className={`mt-4 border-t border-white/10 pt-3 text-xs leading-5 ${accentClasses.textStrong}`}
            >
                {CURRENT_ODDS_LOCK_DISCLOSURE}
            </p>
        </section>
    );
};

export default PickemCardEntryEditor;
