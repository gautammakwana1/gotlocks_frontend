"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
} from "@/lib/contests/pickemTeamVisual";
import type { FeedContestEntryLegPayload } from "@/lib/interfaces/interfaces";
import { PickemCarousel } from "./PickemCarousel";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Pick every included matchup winner" — the Sunday Pick'em card editor, ported
 * from the MVP's `PickemCardEntryEditor`
 * (gotlocks.app_mvp2/components/contests/StructuredContestDetail.tsx:2917).
 *
 * Layout, copy, carousel and the two-colour team cards are the MVP's. What
 * changed is the data source and one rule:
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
 *     posted moneyline is DISABLED here rather than merely annotated.
 * -------------------------------------------------------------------------- */

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

    const selectionCarouselItems = matchups.map((matchup, index) => {
        const lastMatchup = index === matchups.length - 1;
        const remaining = matchups.length - selectedItems.length;

        return {
            id: matchup.gameId,
            label: matchup.matchup,
            content: (
                <fieldset className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                    <legend className="px-1 text-sm font-semibold text-white">
                        Matchup {index + 1} · {matchup.matchup}
                    </legend>
                    {matchup.startsAt ? (
                        <p className="mt-1 px-1 text-[11px] text-gray-500">
                            {gameKickoffFormatter.format(new Date(matchup.startsAt))} local
                        </p>
                    ) : null}

                    {matchup.options.length ? (
                        <div data-pickem-choice-grid className="mt-3 grid grid-cols-2 gap-3">
                            {matchup.options.map((item) => {
                                const checked = selectionsByGame[matchup.gameId] === item.teamId;
                                const selectable = Boolean(item.selection) && !matchup.started;
                                const oddsDescriptionId = `pickem-current-odds-${contestId}-${matchup.gameId}-${item.teamId}`;
                                const teamVisual = getPickemTeamVisual({
                                    abbreviation: item.abbreviation,
                                });
                                const teamCardTint = getPickemTeamCardTint(teamVisual);

                                return (
                                    <label
                                        key={item.teamId}
                                        data-pickem-team-choice
                                        data-pickem-team-card-state={
                                            checked
                                                ? "selected"
                                                : selectable
                                                  ? "idle"
                                                  : "unavailable"
                                        }
                                        data-pickem-team-surface="team-color"
                                        data-pickem-team-color-treatment="flat"
                                        data-team-abbreviation={teamVisual.abbreviation}
                                        data-team-color={teamVisual.primary}
                                        style={
                                            {
                                                "--pickem-team-primary": teamVisual.primary,
                                                "--pickem-team-secondary": teamVisual.secondary,
                                                backgroundColor: teamCardTint,
                                            } as CSSProperties
                                        }
                                        className={`relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border bg-[#0d0f13] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 focus-within:ring-2 focus-within:ring-white/80 ${
                                            !selectable
                                                ? "cursor-not-allowed border-white/10 opacity-45"
                                                : checked
                                                  ? "cursor-pointer border-white/70 ring-1 ring-white/25"
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
                                            onChange={() => {
                                                setSelectionsByGame((current) => ({
                                                    ...current,
                                                    [matchup.gameId]: item.teamId,
                                                }));
                                            }}
                                            className="sr-only"
                                        />
                                        <span className="relative z-10 flex h-full flex-1 flex-col">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className="rounded-full border border-white/25 bg-black/25 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/75">
                                                    {item.side === "away" ? "Away" : "Home"}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${
                                                        checked
                                                            ? "border-white bg-white text-black"
                                                            : "border-white/25 bg-black/20 text-transparent"
                                                    }`}
                                                >
                                                    ✓
                                                </span>
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="mt-4 text-3xl font-black tracking-[-0.06em] text-white drop-shadow-md sm:text-4xl"
                                            >
                                                {teamVisual.abbreviation}
                                            </span>
                                            <span className="mt-2 text-sm font-semibold leading-5 text-white drop-shadow-md sm:text-base">
                                                {item.name}
                                            </span>
                                            <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                                                    {matchup.started
                                                        ? "Already started"
                                                        : !item.selection
                                                          ? "No moneyline"
                                                          : checked
                                                            ? "Winner selected"
                                                            : "Pick winner"}
                                                </span>
                                                <span
                                                    id={oddsDescriptionId}
                                                    data-current-odds
                                                    aria-label={`${item.name} ${
                                                        item.selection
                                                            ? `FanDuel current moneyline ${formatOdds(item.selection.americanOdds)}`
                                                            : "moneyline unavailable"
                                                    }`}
                                                    className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-right"
                                                >
                                                    <span className="block text-[8px] font-semibold uppercase tracking-[0.09em] text-white/55">
                                                        {item.selection
                                                            ? "FanDuel current"
                                                            : "Moneyline"}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs font-bold tabular-nums text-white">
                                                        {item.selection
                                                            ? formatOdds(item.selection.americanOdds)
                                                            : "Unavailable"}
                                                    </span>
                                                </span>
                                            </span>
                                        </span>
                                        <span
                                            data-pickem-team-strip
                                            aria-hidden="true"
                                            className="absolute inset-x-0 bottom-0 h-1"
                                            style={{ backgroundColor: teamVisual.secondary }}
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-2 text-xs text-amber-100">
                            This included game no longer resolves to two scheduled teams.
                        </p>
                    )}

                    {lastMatchup ? (
                        <div className="mt-5 border-t border-white/10 pt-4">
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
                                <section
                                    data-contest-rules-confirmation
                                    aria-label="Contest rules confirmation"
                                    className="mt-4 border-y border-white/10 py-4"
                                >
                                    {rulesAcceptance.rulesVersion ? (
                                        <p
                                            className={`text-[10px] font-semibold uppercase tracking-[0.11em] ${accentClasses.textSoft}`}
                                        >
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
                                                rulesAcceptance.onAcceptedChange(
                                                    event.target.checked
                                                )
                                            }
                                            className={`mt-0.5 h-4 w-4 shrink-0 ${accentClasses.checkbox}`}
                                        />
                                        <span>{rulesAcceptance.label}</span>
                                    </label>
                                </section>
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
                    ) : null}
                </fieldset>
            ),
        };
    });

    return (
        <section
            aria-label="Sunday Pick'em card editor"
            className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 text-gray-200"
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
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] ${
                        complete
                            ? "border-emerald-300/25 text-emerald-100"
                            : "border-amber-300/25 text-amber-100"
                    }`}
                >
                    {selectedItems.length}/{matchups.length} games
                </span>
            </div>

            <p
                data-current-odds-notice
                className={`mt-4 rounded-xl border px-3 py-3 text-xs leading-5 ${accentClasses.previewSurface} ${accentClasses.textStrong}`}
            >
                {CURRENT_ODDS_LOCK_DISCLOSURE}
            </p>

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
                    <PickemCarousel
                        items={selectionCarouselItems}
                        versionKey={versionKey}
                        ariaLabel="Pick’em selection carousel"
                        className="mt-4"
                    />
                </>
            )}
        </section>
    );
};

export default PickemCardEntryEditor;
