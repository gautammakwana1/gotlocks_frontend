"use client";

import { useState } from "react";
import {
    AWARDED_POINTS_CARD_TONE,
    STANDING_RANK_MARKER_LAYOUT,
    STANDING_RANK_MARKER_TONES,
    getStandingRankMarkerTone,
    type StandingRankMarkerTone,
} from "@/lib/styles/postCards";
import type {
    FeedContestEntryRow,
    FeedContestLeaderboardData,
    FeedContestStandingRow,
} from "@/lib/interfaces/interfaces";
import type { FeedContestEntryFormat } from "@/components/social/PickCardContent";
import {
    isTdPsychicCardLocked,
    tdPsychicEntrySelections,
    tdPsychicSelectionResult,
    type TdPsychicStoredLeg,
} from "@/lib/contests/tdPsychicEntry";
import ContestEntryFeedCard from "./ContestEntryFeedCard";
import TdPsychicEntryCard from "./TdPsychicEntryCard";

/* ----------------------------------------------------------------------------
 * The Feed contest STANDINGS board, over
 * `GET /group/feed-contest/leaderboard/:contest_id`.
 *
 * Ported from the MVP's standings frame (StructuredContestDetail.tsx ~4494
 * onwards) and mapped onto this backend's `contest_leaderboard` row. Two of the
 * envelope's flags are load-bearing and must never be re-derived from the
 * contest status:
 *
 *   is_ranked          FALSE until a settlement job fills in `rank`, and every
 *                      row sits at NULL until then. While false the marker shows
 *                      the row's POSITION in the server's ordering (points desc,
 *                      then who committed first) and says so in its aria-label,
 *                      rather than printing a rank nothing computed.
 *   is_entry_revealed  before the lock, `combo_odds` and `total_picks` come back
 *                      NULL for every row but the viewer's own — exactly as the
 *                      entries read withholds legs[]. Null there means "not
 *                      visible yet", never "no value", so those cells render a
 *                      locked dash instead of a zero.
 *
 * THE ENTRY DISCLOSURE (the MVP's `expandedStandingEntryId`) is ported as of
 * 2026-08-20, when `runFeedContestLeaderboard` began carrying each standing's
 * `pick` in the same shape /entries returns. It was previously skipped for want
 * of that payload — the row named a `pick_id` and nothing else — which is also
 * why the note about a missing entry payload has gone from `pointsState` below.
 *
 * One disclosure is open at a time, keyed by the standing's `pick_id` rather
 * than by its leaderboard row id: the pinned "Your standing" frame renders the
 * viewer's own row a second time when it falls off the loaded pages, and keying
 * on the row id would let those two toggle independently while showing the same
 * entry.
 *
 * This board deliberately does NOT use components/community/StandingsCard: that
 * is the gold LIFETIME surface (League / Arena / Global rankings), and the MVP
 * keeps this per-contest board on its own neutral responsive-list frame too.
 * Its row is a two-line stack whose metric pair col-spans on mobile, it pages
 * from the server behind "Show more" rather than scrolling a 15-row viewport,
 * and it pins the viewer's own line in a separate frame above the board — none
 * of which survives a single `gridClassName` row template.
 * -------------------------------------------------------------------------- */

export type FeedContestStandingsAccent = "league" | "arena";

const accentClasses: Record<
    FeedContestStandingsAccent,
    { avatar: string; textSoft: string; showMore: string }
> = {
    league: {
        avatar:
            "border-sky-300/40 bg-sky-500/[0.14] text-sky-100 shadow-[0_0_16px_rgba(125,211,252,0.14)]",
        textSoft: "text-sky-200",
        showMore: "border-sky-300/30 text-sky-100 hover:bg-sky-500/10",
    },
    arena: {
        avatar:
            "border-violet-300/40 bg-violet-500/[0.14] text-violet-100 shadow-[0_0_16px_rgba(196,181,253,0.14)]",
        textSoft: "text-violet-200",
        showMore: "border-violet-300/30 text-violet-100 hover:bg-violet-500/10",
    },
};

/*
 * FULL-LENGTH board, as the MVP now draws it
 * (StructuredContestDetail.tsx:821-822 + :5102). The rounded, bordered card
 * this used to be was a port of an older MVP frame; the current one drops the
 * border, the radius and the drop shadow and lets the row wash run to the
 * screen edge, which is also what the sibling Entries tab already does here
 * (FeedContestEntriesPanel.tsx:337).
 *
 * The bleed matches AppShell's `px-5 sm:px-6` gutter, so re-adding the same
 * inset to every child puts the rows back in line with the section heading
 * FeedContestDetail renders above this panel.
 */
const STANDINGS_BLEED_CLASS_NAME = "-mx-5 sm:-mx-6";

const STANDINGS_INSET_CLASS_NAME = "px-5 sm:px-6";

const STANDINGS_FRAME_CLASS_NAME =
    "min-w-0 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/[0.02]";

const STANDING_METRIC_CARD_CLASS_NAME =
    "min-w-0 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2";

const standingInitials = (value: string) => {
    const initials = value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    return initials || "GL";
};

const memberName = (row: FeedContestStandingRow) =>
    row.member?.username?.trim() || "Member";

/** American odds always carry their sign — "+450" reads as a price, "450" does not. */
const formatAmericanOdds = (value: number) =>
    `${value > 0 ? "+" : ""}${value}`;

const zebraRowClassName = (index: number) =>
    index % 2 === 1 ? "bg-white/[0.025]" : undefined;

/**
 * A standing's entry, counted by leg result.
 *
 * The MVP reads `pendingCount` / `voidCount` / `correctCount` straight off its
 * in-memory entry; this response carries the stored `legs[]` instead, so the
 * same three come from folding them. `tdPsychicSelectionResult` is reused rather
 * than re-matching the strings here because it is the one place that knows
 * `not_found` is a VOID and not a pending state — a card whose legs read
 * "1 correct · 2 pending" forever is exactly what re-deriving it gets wrong.
 */
const legCounts = (row: FeedContestStandingRow) => {
    const legs = row.pick?.legs ?? [];
    let correct = 0;
    let incorrect = 0;
    let voided = 0;
    let pending = 0;

    for (const leg of legs) {
        switch (tdPsychicSelectionResult(leg?.result)) {
            case "correct":
                correct += 1;
                break;
            case "incorrect":
                incorrect += 1;
                break;
            case "void":
            case "canceled":
                voided += 1;
                break;
            default:
                pending += 1;
        }
    }

    return { correct, incorrect, voided, pending, total: legs.length };
};

/**
 * A SETTLED ENTRY, whether or not the whole contest has frozen.
 *
 * The MVP's `entryIsSettled`. Without the entry this could only ask "has the
 * contest finished", which keeps a card that has already lost or voided in the
 * amber "potential points" styling until the very end — worst on TD Psychic,
 * where a voided card is terminal the moment the capture runs.
 *
 * `pick.result` is checked first because a combo folds to a single verdict; the
 * leg counts answer for the card templates, where the pick row can still read
 * pending while every leg underneath it is done.
 */
const entryIsSettled = (row: FeedContestStandingRow, isFrozenFinal: boolean) => {
    if (isFrozenFinal) return true;
    if (!row.pick) return false;

    const result = (row.pick.result ?? "").trim().toLowerCase();
    if (result === "loss" || result === "void" || result === "not_found") return true;

    const counts = legCounts(row);
    if (!counts.total) return false;
    return counts.voided > 0 || counts.pending === 0;
};

/**
 * The MVP's `tdPsychicProgressCopy` — what the x/y metric cannot say. A card
 * sitting at "1 correct · 2 pending" and one that finished "1 correct · 2
 * incorrect" both read `1/3`, and only the first is still live.
 *
 * DIVERGENCE: once the contest freezes the MVP prints its standing's
 * `resultSummary`, a sentence the server composes. Nothing on this row carries
 * it, so the correct/incorrect split stands in — the same counts, without the
 * prose. Add the copy here if the endpoint ever grows the field.
 */
const tdPsychicProgressCopy = (
    row: FeedContestStandingRow,
    isFrozenFinal: boolean
): string | null => {
    if (!row.pick) return null;
    const counts = legCounts(row);
    if (!counts.total) return null;
    if (counts.voided > 0) return "VOID";
    if (counts.pending > 0 && !isFrozenFinal)
        return `${counts.correct} correct · ${counts.pending} pending`;
    return `${counts.correct} correct · ${counts.incorrect} incorrect`;
};

/**
 * The standing, restated as the row the entry cards already take.
 *
 * `ContestEntryFeedCard` is built against /entries' row and reads five fields
 * off it. Adapting here rather than widening that card keeps ONE entry-card
 * contract across both tabs — the alternative is a card that accepts a union and
 * has to ask which surface it is on.
 *
 * `id` is the PICK id, not the leaderboard row id: the card uses it as the
 * pick's own identity for the feed item it builds. `submitted_at` stands in from
 * `entered_at`, which is the only timestamp a standing carries and is the same
 * instant for an entry that has never been replaced.
 */
const asEntryRow = (row: FeedContestStandingRow): FeedContestEntryRow => ({
    id: row.pick_id ?? row.id,
    is_own: row.is_own,
    is_revealed: row.is_entry_revealed,
    member: row.member,
    participant_status: null,
    joined_at: null,
    entered_at: row.entered_at,
    submitted_at: row.entered_at,
    updated_at: row.updated_at,
    pick: row.pick,
});

/**
 * Only a SETTLED board earns a podium colour. Before that every row is neutral,
 * because the ordering is provisional and a gold marker would read as a result.
 */
const placementTone = (
    rank: number | null,
    isFrozenFinal: boolean,
    isRanked: boolean,
    winningPlaces: number
): StandingRankMarkerTone => {
    if (!isFrozenFinal || !isRanked || rank === null) return "neutral";
    return getStandingRankMarkerTone(rank, winningPlaces);
};

export type FeedContestStandingsPanelProps = {
    leaderboard: FeedContestLeaderboardData | null;
    loading: boolean;
    error: string | null;
    /** A draft has no field, so the board is never read for one. */
    isDraft: boolean;
    /** Drives the empty-state copy and the "potential points" tone. */
    isFrozenFinal: boolean;
    entriesArePublic: boolean;
    /** How many places pay out — decides where the podium colours stop. */
    winningPlaces: number;
    /** "League points" | "Arena points" — replaces the global XP wording. */
    pointsLabel: string;
    /**
     * `multi_pick` scores on combo odds; Pick'em and TD Psychic both score on
     * correct picks, so both read `x/y` in that column — a TD card is always
     * out of three.
     */
    template: string;
    currentUserId?: string;
    accent?: FeedContestStandingsAccent;
    onShowMore?: () => void;
    /**
     * Sunday Pick'em only — splits each tile's total into odds + bonus on an
     * expanded entry card. The leaderboard's contest projection omits it, so it
     * comes from the detail read this panel already sits inside, exactly as the
     * Entries tab receives it.
     */
    pickemCorrectBonus?: number | null;
    /** Names an expanded entry card's header and links it back to this contest. */
    contestName?: string;
    contestHref?: string;
};

const StandingRow = ({
    row,
    position,
    isRanked,
    isFrozenFinal,
    winningPlaces,
    showOdds,
    pointsLabel,
    template,
    entryFormat,
    accent,
    isOwn,
    zebra,
    expanded,
    onToggleEntry,
    currentUserId,
    pickemCorrectBonus,
    contestName,
    contestHref,
}: {
    row: FeedContestStandingRow;
    position: number;
    isRanked: boolean;
    isFrozenFinal: boolean;
    winningPlaces: number;
    showOdds: boolean;
    pointsLabel: string;
    template: string;
    entryFormat: FeedContestEntryFormat;
    accent: FeedContestStandingsAccent;
    isOwn: boolean;
    zebra?: string;
    expanded: boolean;
    onToggleEntry: () => void;
    currentUserId?: string;
    pickemCorrectBonus?: number | null;
    contestName?: string;
    contestHref?: string;
}) => {
    const name = memberName(row);
    const tone = placementTone(row.rank, isFrozenFinal, isRanked, winningPlaces);
    const marker = isRanked && row.rank !== null ? row.rank : position;
    const reversed = Boolean(row.is_points_reverse);
    const points = row.contest_points ?? 0;
    /*
     * The MVP tints this emerald for a CONFIRMED award, which it reads off the
     * community point ledger. The nearest thing on this row is `achievement_id`
     * — set when the settlement job recorded the contest achievement that comes
     * with the award — so it stands in, gated on a settled, unreversed row.
     */
    const awarded = isFrozenFinal && !reversed && Boolean(row.achievement_id);
    /*
     * A SETTLED ROW WORTH NOTHING IS NOT A PENDING ROW WORTH NOTHING.
     *
     * The zero test is checked BEFORE the frozen test, which is the ordering the
     * MVP settled on: a card that has already lost or voided reads "No pts
     * earned · 0" the moment it settles, instead of showing an amber "+0" that
     * looks like a potential award still in play. TD Psychic makes this the
     * common case rather than the edge — a 2-of-3 card places on the podium and
     * still earns nothing, so an amber +0 beside a bronze marker reads as a bug.
     *
     * `entryIsSettled` — not `isFrozenFinal` — is what closes the row, matching
     * the MVP now that the entry rides along on the standing. A dead card stops
     * reading as live at the moment it dies rather than when the contest does.
     */
    const settled = entryIsSettled(row, isFrozenFinal);
    const noPointsEarned = !reversed && settled && points <= 0;
    const pointsState = reversed
        ? "reversed"
        : noPointsEarned
            ? "zero"
            : !isFrozenFinal
                ? "potential"
                : awarded
                    ? "awarded"
                    : "confirmed";

    /*
     * The entry is disclosable only when the server actually sent it. Gated on
     * `pick` and never on the lifecycle status: before the lock every row but the
     * viewer's own arrives with `pick: null`, so an "Entry" affordance derived
     * from the status would open an empty panel on someone else's hidden card.
     */
    const entry = row.pick;
    const entryPanelId = `standing-entry-${row.pick_id ?? row.id}`;
    const progressCopy =
        template === "td_psychic" ? tdPsychicProgressCopy(row, isFrozenFinal) : null;

    const tdPsychicLegs = (entry?.legs ?? []) as unknown as TdPsychicStoredLeg[];

    return (
        <li
            data-standing-row
            data-standing-rank={row.rank ?? undefined}
            data-standing-template={template}
            data-standing-placement={tone}
            data-standing-current-user={isOwn ? "true" : undefined}
            className={zebra}
        >
            <div
                data-standings-content-row
                className={`grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3 sm:grid-cols-[44px_minmax(0,1fr)_minmax(210px,260px)] ${STANDINGS_INSET_CLASS_NAME}`}
            >
                <div className="relative h-9 w-9 sm:h-10 sm:w-10">
                    <span
                        aria-hidden
                        className={`flex h-full w-full items-center justify-center rounded-full border text-[10px] font-semibold sm:text-xs ${isOwn ? accentClasses[accent].avatar : "border-white/15 bg-white/[0.05] text-slate-200"
                            }`}
                    >
                        {standingInitials(name)}
                    </span>
                    <span
                        data-standing-rank-marker
                        data-standing-marker-surface="opaque"
                        aria-label={
                            isRanked && row.rank !== null
                                ? `Rank ${row.rank}`
                                : `Position ${position}`
                        }
                        className={`absolute flex items-center justify-center rounded-full border font-semibold tabular-nums ${STANDING_RANK_MARKER_LAYOUT} ${STANDING_RANK_MARKER_TONES[tone]}`}
                    >
                        {marker}
                    </span>
                </div>

                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p
                            data-standings-member-name
                            className="truncate text-sm font-semibold text-white"
                        >
                            {name}
                        </p>
                        {isOwn ? (
                            <span
                                className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${accentClasses[accent].textSoft}`}
                            >
                                You
                            </span>
                        ) : null}
                    </div>
                    {/* The MVP's `data-standing-meta-row`: the progress line and
                        the entry disclosure share one wrapping row, so a long
                        TD summary pushes the toggle to the next line rather
                        than squeezing it. */}
                    {progressCopy || entry ? (
                        <div
                            data-standing-meta-row
                            className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
                        >
                            {progressCopy ? (
                                <span
                                    data-standing-result-summary
                                    className="min-w-0 truncate text-[10px] leading-4 text-gray-500"
                                >
                                    {progressCopy}
                                </span>
                            ) : null}
                            {entry ? (
                                <button
                                    data-standing-action="entry"
                                    type="button"
                                    aria-label={`${expanded ? "Hide" : "View"} ${name} entry`}
                                    aria-expanded={expanded}
                                    aria-controls={entryPanelId}
                                    onClick={onToggleEntry}
                                    className="relative inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-md px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400 transition after:absolute after:-inset-x-1 after:-inset-y-2 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                                >
                                    Entry
                                    <svg
                                        aria-hidden
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""
                                            }`}
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {isFrozenFinal && row.achievement_id ? (
                        <p
                            className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${accentClasses[accent].textSoft}`}
                        >
                            Contest Achievement
                        </p>
                    ) : null}
                    {reversed ? (
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-200">
                            Point award reversed
                        </p>
                    ) : null}
                </div>

                <dl className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                    <div
                        data-standing-metric={showOdds ? "combo-odds" : "correct-picks"}
                        className={STANDING_METRIC_CARD_CLASS_NAME}
                    >
                        <dt className="text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]">
                            {showOdds ? "Combo odds" : "Correct picks"}
                        </dt>
                        <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-white">
                            {showOdds
                                ? typeof row.combo_odds === "number"
                                    ? formatAmericanOdds(row.combo_odds)
                                    : "—"
                                : /*
                                   * A hidden row is a DASH, never "0".
                                   *
                                   * Before the lock the server nulls
                                   * `total_picks` for everyone but the viewer,
                                   * but still sends `correct_picks: 0` — which
                                   * is genuinely 0 only because no game has
                                   * played yet. Printing it would state a
                                   * result about an entry this viewer is not
                                   * allowed to see; null there means "not yet
                                   * visible", never "no value".
                                   */
                                  !row.is_entry_revealed
                                  ? "—"
                                  : typeof row.total_picks === "number"
                                    ? `${row.correct_picks ?? 0}/${row.total_picks}`
                                    : `${row.correct_picks ?? 0}`}
                        </dd>
                    </div>
                    <div
                        data-standing-metric="points"
                        data-points-state={pointsState}
                        aria-label={
                            noPointsEarned
                                ? `No ${pointsLabel} earned`
                                : !isFrozenFinal
                                    ? `Potential ${pointsLabel}`
                                    : pointsLabel
                        }
                        className={`min-w-0 rounded-lg border px-2.5 py-2 ${reversed
                            ? "border-red-300/20 bg-red-500/[0.08]"
                            : awarded
                                ? AWARDED_POINTS_CARD_TONE
                                : "border-white/10 bg-black/25"
                            }`}
                    >
                        <dt
                            className={
                                noPointsEarned
                                    ? "whitespace-nowrap text-[7px] font-semibold normal-case leading-none tracking-normal text-slate-400 sm:text-[9px]"
                                    : "text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]"
                            }
                        >
                            {/* Abbreviated on purpose: the full "League Points"
                                overflows this chip at 360px, and the unabbreviated
                                label rides on the group's aria-label instead. */}
                            {noPointsEarned
                                ? "No pts earned"
                                : !isFrozenFinal
                                    ? "Potential pts"
                                    : pointsLabel}
                        </dt>
                        <dd
                            className={`mt-1 truncate text-sm font-semibold tabular-nums ${noPointsEarned
                                ? "text-slate-300"
                                : reversed
                                    ? "text-red-200 line-through"
                                    : awarded
                                        ? "text-emerald-200"
                                        : isFrozenFinal
                                            ? "text-slate-300"
                                            : "text-amber-200"
                                }`}
                        >
                            {noPointsEarned ? "0" : `+${points}`}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* The entry itself, in the SAME cards the Entries tab renders — a TD
                card gets the receipt card and everything else the feed card, so a
                member recognises their slate whichever tab they opened it from. */}
            {entry && expanded ? (
                <div
                    id={entryPanelId}
                    role="region"
                    aria-label={`${name} entry details`}
                    className="border-t border-white/10 bg-black/25"
                >
                    {entryFormat === "td_psychic" ? (
                        <div
                            data-td-psychic-submitted-entry
                            className="px-5 py-3 sm:px-6 sm:py-4"
                        >
                            <TdPsychicEntryCard
                                selections={tdPsychicEntrySelections(
                                    tdPsychicLegs,
                                    undefined,
                                    isOwn
                                )}
                                submittedAt={row.entered_at}
                                comboAmericanOdds={
                                    isTdPsychicCardLocked(tdPsychicLegs)
                                        ? (entry.american_odds ?? null)
                                        : undefined
                                }
                            />
                        </div>
                    ) : (
                        <ContestEntryFeedCard
                            row={asEntryRow(row)}
                            pick={entry}
                            contextualPointsLabel={pointsLabel}
                            currentUserId={currentUserId}
                            accent={accent === "arena" ? "violet" : "sky"}
                            entryFormat={entryFormat}
                            pickemCorrectBonus={pickemCorrectBonus}
                            contestName={contestName}
                            contestHref={contestHref}
                        />
                    )}
                </div>
            ) : null}
        </li>
    );
};

export const FeedContestStandingsPanel = ({
    leaderboard,
    loading,
    error,
    isDraft,
    isFrozenFinal,
    entriesArePublic,
    winningPlaces,
    pointsLabel,
    template,
    currentUserId,
    accent = "league",
    onShowMore,
    pickemCorrectBonus,
    contestName,
    contestHref,
}: FeedContestStandingsPanelProps) => {
    /*
     * One open disclosure at a time, as the MVP's `expandedStandingEntryId` is.
     * Declared before the early returns so the hook order is stable across the
     * draft / error / loading branches below.
     */
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const toggleEntry = (key: string) =>
        setExpandedEntryId((current) => (current === key ? null : key));

    if (isDraft) {
        return (
            <p className="text-sm leading-6 text-gray-500">
                Publish this contest to start counting participants and entries.
            </p>
        );
    }

    if (error) {
        return (
            <p role="alert" className="text-sm leading-6 text-rose-200">
                {error}
            </p>
        );
    }

    // One read with no partial state, so the whole frame skeletons rather than
    // flashing an empty board that would read as "nobody entered".
    if (!leaderboard) {
        return (
            <div
                aria-hidden="true"
                className={`${STANDINGS_BLEED_CLASS_NAME} ${STANDINGS_FRAME_CLASS_NAME}`}
            >
                <ul className="divide-y divide-white/10">
                    {[0, 1, 2].map((key) => (
                        <li
                            key={key}
                            className={`flex items-center gap-3 py-3.5 ${STANDINGS_INSET_CLASS_NAME}`}
                        >
                            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06] sm:h-10 sm:w-10" />
                            <div className="min-w-0 flex-1">
                                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
                                <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-white/[0.04]" />
                            </div>
                            <div className="hidden h-11 w-[210px] shrink-0 animate-pulse rounded-lg bg-white/[0.04] sm:block" />
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    const showOdds = template === "multi_pick";
    const rows = leaderboard.standings;
    const isRanked = leaderboard.is_ranked;

    /*
     * Which builder produced these entries — the same derivation the Entries tab
     * makes, and for the same reason: all three models are stored as combos, so
     * no row can say which it is and only the CONTEST knows. Reading it off the
     * row would render a Pick'em card as a parlay leg list. `entry_model` is the
     * authoritative column; `template` is checked too because both travel on
     * this envelope and cannot disagree.
     */
    const entryFormat: FeedContestEntryFormat =
        leaderboard.contest.entry_model === "td_psychic_card" ||
            leaderboard.contest.template === "td_psychic"
            ? "td_psychic"
            : leaderboard.contest.entry_model === "pickem_card" ||
                leaderboard.contest.template === "sunday_pickem"
                ? "sunday_pickem"
                : "general_combo";

    /** Keyed on the PICK, so the pinned own-row and its board twin stay in step. */
    const entryKey = (row: FeedContestStandingRow) => row.pick_id ?? row.id;

    if (!rows.length) {
        return (
            <p className="rounded-xl border border-dashed border-white/15 bg-black/25 px-4 py-5 text-sm leading-6 text-gray-500">
                {isFrozenFinal
                    ? "This contest finished with no entries on the board."
                    : entriesArePublic
                        ? "No entries were accepted before the deadline."
                        : "No entries yet. Standings appear as members enter."}
            </p>
        );
    }

    /*
     * The endpoint reads the viewer's own line separately so it is present
     * whatever page it really falls on. Pin it above the board only when the
     * loaded pages do NOT already contain it — otherwise it would show twice.
     */
    const own = leaderboard.my_standing;
    const ownIsOnBoard = own ? rows.some((row) => row.id === own.id) : false;
    const ownPosition =
        own && isRanked && own.rank !== null ? own.rank : rows.length + 1;

    return (
        <div className="space-y-3">
            {own && !ownIsOnBoard ? (
                <div
                    className={`${STANDINGS_BLEED_CLASS_NAME} ${STANDINGS_FRAME_CLASS_NAME}`}
                >
                    <p
                        data-standings-column-header
                        className={`border-b border-white/10 bg-black/20 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500 ${STANDINGS_INSET_CLASS_NAME}`}
                    >
                        Your standing
                    </p>
                    <ul>
                        <StandingRow
                            row={own}
                            position={ownPosition}
                            isRanked={isRanked}
                            isFrozenFinal={isFrozenFinal}
                            winningPlaces={winningPlaces}
                            showOdds={showOdds}
                            pointsLabel={pointsLabel}
                            template={template}
                            entryFormat={entryFormat}
                            accent={accent}
                            isOwn
                            expanded={expandedEntryId === entryKey(own)}
                            onToggleEntry={() => toggleEntry(entryKey(own))}
                            currentUserId={currentUserId}
                            pickemCorrectBonus={pickemCorrectBonus}
                            contestName={contestName}
                            contestHref={contestHref}
                        />
                    </ul>
                </div>
            ) : null}

            <div
                data-standings-frame
                className={`${STANDINGS_BLEED_CLASS_NAME} ${STANDINGS_FRAME_CLASS_NAME}`}
            >
                <div
                    aria-hidden
                    data-standings-column-header
                    className={`hidden grid-cols-[44px_minmax(0,1fr)_minmax(210px,260px)] items-center gap-3 border-b border-white/10 bg-black/20 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500 sm:grid ${STANDINGS_INSET_CLASS_NAME}`}
                >
                    <span className="col-span-2">Player</span>
                    <span>Performance</span>
                </div>
                <ol
                    aria-label={
                        isFrozenFinal
                            ? "Final standings"
                            : isRanked
                                ? "Live standings"
                                : "Standings order"
                    }
                    className="divide-y divide-white/10"
                >
                    {rows.map((row, index) => (
                        <StandingRow
                            key={row.id}
                            row={row}
                            position={index + 1}
                            isRanked={isRanked}
                            isFrozenFinal={isFrozenFinal}
                            winningPlaces={winningPlaces}
                            showOdds={showOdds}
                            pointsLabel={pointsLabel}
                            template={template}
                            entryFormat={entryFormat}
                            accent={accent}
                            isOwn={Boolean(currentUserId) && row.member.id === currentUserId}
                            zebra={zebraRowClassName(index)}
                            expanded={expandedEntryId === entryKey(row)}
                            onToggleEntry={() => toggleEntry(entryKey(row))}
                            currentUserId={currentUserId}
                            pickemCorrectBonus={pickemCorrectBonus}
                            contestName={contestName}
                            contestHref={contestHref}
                        />
                    ))}
                </ol>
            </div>

            {!isRanked && !isFrozenFinal ? (
                <p className="text-[10px] leading-4 text-gray-500">
                    Ordered by points, then by who entered first. Final placements are
                    set when the contest settles.
                </p>
            ) : null}

            {leaderboard.pagination.hasMore && onShowMore ? (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={onShowMore}
                        disabled={loading}
                        className={`inline-flex min-h-10 items-center rounded-lg border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${accentClasses[accent].showMore}`}
                    >
                        {loading
                            ? "Loading…"
                            : `Show more (${rows.length} of ${leaderboard.pagination.total})`}
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default FeedContestStandingsPanel;
