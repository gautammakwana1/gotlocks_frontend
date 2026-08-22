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
import type { FeedContestEntryFormat } from "@/components/social/pick-card/types";
import { tdPsychicSelectionResult } from "@/lib/contests/tdPsychicEntry";
import ContestEntryFeedCard from "./ContestEntryFeedCard";

/* ----------------------------------------------------------------------------
 * The Feed contest STANDINGS board, over
 * `GET /group/feed-contest/leaderboard/:contest_id`.
 *
 * Re-ported 2026-08-21 against the MVP's current standings frame
 * (StructuredContestDetail.tsx:5414 onwards + the STANDINGS_* constants at
 * :828). What changed in that pass, and why each piece matters:
 *
 *   THE GRADIENT FRAME. The board is one continuous surface that starts on the
 *   community's own tint, settles to near-black through the rows, and fades back
 *   into `--app-bg` at the bottom, so the list ENDS rather than being cut off.
 *   Its top colour is the same one the title band above lands on, which is what
 *   makes the two read as a single object. The header owns the bleed — this
 *   panel re-insets every row with `px-5 sm:px-6` instead of bleeding again.
 *
 *   THE ROW IS TWO COLUMNS, not three. Identity (avatar + rank marker + name +
 *   meta) takes the flexible column and the metric PAIR takes a fixed 164px on
 *   mobile / 220-260px above it. The rank marker rides on the avatar, so it
 *   needs no column of its own.
 *
 *   POINTS COME FIRST. The metric pair is [points, primary metric], which is the
 *   opposite of the order this panel used to draw. Points are what the board is
 *   sorted by, so they belong nearest the name.
 *
 *   PRE-LOCK IS ITS OWN LIST. Before the field opens there is no ranking to
 *   show — the server seeds `contest_leaderboard` the moment a member enters, so
 *   a pre-lock board is a roster, not a scoreboard. It is sorted by NAME, drops
 *   the rank marker entirely, says "Rank pending", and its metrics are Potential
 *   pts / Combo odds.
 *
 * Two of the envelope's flags stay load-bearing and must never be re-derived
 * from the contest status:
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
 * THE ENTRY DISCLOSURE (the MVP's `expandedStandingEntryId`): one open at a
 * time, keyed by the standing's `pick_id` rather than by its leaderboard row id,
 * because the pinned "Your standing" frame renders the viewer's own row a second
 * time when it falls off the loaded pages and keying on the row id would let
 * those two toggle independently while showing the same entry.
 *
 * This board deliberately does NOT use components/community/StandingsCard: that
 * is the gold LIFETIME surface (League / Arena / Global rankings), and the MVP
 * keeps this per-contest board on its own frame too.
 * -------------------------------------------------------------------------- */

export type FeedContestStandingsAccent = "league" | "arena";

const accentClasses: Record<
    FeedContestStandingsAccent,
    { textSoft: string; showMore: string }
> = {
    league: {
        textSoft: "text-sky-200",
        showMore: "border-sky-300/30 text-sky-100 hover:bg-sky-500/10",
    },
    arena: {
        textSoft: "text-violet-200",
        showMore: "border-violet-300/30 text-violet-100 hover:bg-violet-500/10",
    },
};

/*
 * The frame's own wash. `5rem` in from each end so the community tint reads at
 * the top of the list and the fade to `--app-bg` only starts once the rows are
 * done — on a short board the two stops meet and the whole thing is a soft
 * gradient, which is the intended result rather than an accident.
 */
const STANDINGS_LEAGUE_FRAME_SURFACE_CLASS_NAME =
    "min-w-0 bg-[linear-gradient(to_bottom,#111820_0%,#0b0d10_5rem,#0b0d10_calc(100%_-_5rem),var(--app-bg)_100%)]";

const STANDINGS_ARENA_FRAME_SURFACE_CLASS_NAME =
    "min-w-0 bg-[linear-gradient(to_bottom,#1b1529_0%,#0b0d10_5rem,#0b0d10_calc(100%_-_5rem),var(--app-bg)_100%)]";

/** Re-inset to the app gutter — the tab panel above owns the bleed. */
const STANDINGS_INSET_CLASS_NAME = "px-5 sm:px-6";

const STANDINGS_CONTENT_ROW_CLASS_NAME =
    "grid min-w-0 grid-cols-[minmax(0,1fr)_164px] items-center gap-2 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] sm:gap-3 sm:px-6 sm:py-3";

const STANDINGS_IDENTITY_CLASS_NAME = "flex min-w-0 items-center gap-2.5 sm:gap-3";

const STANDINGS_METRIC_ROW_CLASS_NAME =
    "grid min-w-0 grid-cols-2 gap-1.5 self-center";

const STANDING_METRIC_CARD_LAYOUT_CLASS_NAME =
    "flex min-h-0 min-w-0 flex-col justify-between gap-1 overflow-hidden rounded-xl border border-b-2 border-b-white/15 px-2.5 py-2 leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_-22px_rgba(0,0,0,0.88)] sm:px-3 sm:py-2.5";

const STANDING_METRIC_CARD_CLASS_NAME = `${STANDING_METRIC_CARD_LAYOUT_CLASS_NAME} border-white/10 bg-white/[0.04]`;

const STANDING_METRIC_LABEL_CLASS_NAME =
    "text-[8px] font-semibold uppercase leading-none tracking-[0.08em] text-slate-100/70 sm:text-[9px]";

const STANDING_ZERO_POINTS_LABEL_CLASS_NAME =
    "whitespace-nowrap text-[7px] font-semibold normal-case leading-none tracking-normal text-slate-100/70 sm:text-[9px]";

const STANDING_METRIC_VALUE_CLASS_NAME =
    "mt-0 truncate text-sm font-semibold leading-none tabular-nums sm:text-base";

const standingAvatarToneClasses = (
    accent: FeedContestStandingsAccent,
    isCurrentUser: boolean
) =>
    isCurrentUser
        ? accent === "arena"
            ? "border-violet-300/40 bg-violet-500/[0.14] text-violet-100 shadow-[0_0_16px_rgba(167,139,250,0.14)]"
            : "border-sky-300/40 bg-sky-500/[0.14] text-sky-100 shadow-[0_0_16px_rgba(96,165,250,0.14)]"
        : "border-white/15 bg-white/[0.05] text-slate-200";

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

/**
 * The MVP's `CONTEST_ACHIEVEMENT_LABELS` (StructuredContestDetail:817), keyed on
 * the enum THIS backend stores — `CHAMPION`, not `champion`. It is a FALLBACK
 * only: `runFeedContestLeaderboard` already spells the label on the embedded
 * award, and reading that is what keeps the board, the trophy case and the
 * finalized feed post naming the same trophy the same way.
 */
const CONTEST_ACHIEVEMENT_LABELS: Record<string, string> = {
    CHAMPION: "Champion",
    RUNNER_UP: "Runner-Up",
    PODIUM_FINISH: "Podium Finish",
    TOP_FIVE: "Top Five",
};

/**
 * WHAT this standing won, as one line — or null if it won nothing.
 *
 * Three sources, in falling order of trust: the server's own `label`, the enum
 * mapped locally, and finally the bare pointer. That last rung is why the
 * generic wording survives: `achievement_id` set with `achievement` null means
 * an award exists but its row could not be loaded, and dropping the line there
 * would tell a champion they placed nowhere.
 */
const standingAchievementLabel = (row: FeedContestStandingRow): string | null => {
    const award = row.achievement;
    if (award) {
        const label = award.label?.trim();
        if (label) return label;
        const mapped = CONTEST_ACHIEVEMENT_LABELS[String(award.type ?? "").toUpperCase()];
        if (mapped) return mapped;
    }
    return row.achievement_id ? "Contest Achievement" : null;
};

/** American odds always carry their sign — "+450" reads as a price, "450" does not. */
const formatAmericanOdds = (value: number) => `${value > 0 ? "+" : ""}${value}`;

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
    /** "League Points" | "Arena Points" — replaces the global XP wording. */
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

/** The entry disclosure toggle, identical on a ranked and an unranked row. */
const EntryToggleButton = ({
    name,
    expanded,
    panelId,
    onToggle,
}: {
    name: string;
    expanded: boolean;
    panelId: string;
    onToggle: () => void;
}) => (
    <button
        data-standing-action="entry"
        type="button"
        aria-label={`${expanded ? "Hide" : "View"} ${name} entry`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
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
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    </button>
);

/**
 * ONE PRE-LOCK ROW — the MVP's `standingsPreviewRows` item.
 *
 * No rank marker and no ranking copy at all: before the field opens the order
 * on screen is alphabetical, and a numbered marker beside it would read as a
 * placement that nothing has computed.
 */
const StandingsPreviewRow = ({
    row,
    accent,
    isOwn,
    pointsLabel,
}: {
    row: FeedContestStandingRow;
    accent: FeedContestStandingsAccent;
    isOwn: boolean;
    pointsLabel: string;
}) => {
    const name = memberName(row);
    const points = row.contest_points ?? 0;

    return (
        <li
            data-standings-preview-entry
            data-standings-content-row
            data-standing-current-user={isOwn ? "true" : undefined}
            className={STANDINGS_CONTENT_ROW_CLASS_NAME}
        >
            <div data-standing-identity className={STANDINGS_IDENTITY_CLASS_NAME}>
                <span
                    aria-hidden
                    data-standing-avatar
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tracking-wide sm:h-10 sm:w-10 sm:text-xs lg:h-11 lg:w-11 ${standingAvatarToneClasses(
                        accent,
                        isOwn
                    )}`}
                >
                    {standingInitials(name)}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                            data-standings-member-name
                            className="truncate text-sm font-semibold text-white"
                        >
                            {name}
                        </span>
                        {isOwn ? (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                                You
                            </span>
                        ) : null}
                    </div>
                    <p
                        data-standing-placement-copy
                        className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px]"
                    >
                        Rank pending
                    </p>
                </div>
            </div>

            <dl data-standing-metrics className={STANDINGS_METRIC_ROW_CLASS_NAME}>
                <div
                    data-standing-metric="potential-points"
                    data-points-state="potential"
                    aria-label={`Potential ${pointsLabel}`}
                    className={STANDING_METRIC_CARD_CLASS_NAME}
                >
                    <dt className={`${STANDING_METRIC_LABEL_CLASS_NAME} whitespace-nowrap`}>
                        Potential pts
                    </dt>
                    <dd className={`${STANDING_METRIC_VALUE_CLASS_NAME} text-amber-200`}>
                        {`+${points}`}
                    </dd>
                </div>
                <div
                    data-standing-metric="combo-odds"
                    className={STANDING_METRIC_CARD_CLASS_NAME}
                >
                    <dt className={STANDING_METRIC_LABEL_CLASS_NAME}>Combo odds</dt>
                    <dd className={`${STANDING_METRIC_VALUE_CLASS_NAME} text-white`}>
                        {/* A hidden row is a DASH, never a price: before the lock
                            the server nulls `combo_odds` for everyone but the
                            viewer, and null there means "not yet visible". */}
                        {typeof row.combo_odds === "number"
                            ? formatAmericanOdds(row.combo_odds)
                            : "—"}
                    </dd>
                </div>
            </dl>
        </li>
    );
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
    const achievementLabel = standingAchievementLabel(row);

    return (
        <li
            data-standing-row
            data-standing-rank={row.rank ?? undefined}
            data-standing-template={template}
            data-standing-placement={tone}
            data-standing-current-user={isOwn ? "true" : undefined}
        >
            <div data-standings-content-row className={STANDINGS_CONTENT_ROW_CLASS_NAME}>
                <div data-standing-identity className={STANDINGS_IDENTITY_CLASS_NAME}>
                    <div
                        data-standing-avatar
                        className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11"
                    >
                        <span
                            aria-hidden
                            className={`flex h-full w-full items-center justify-center rounded-full border text-[10px] font-semibold sm:text-xs lg:text-sm ${standingAvatarToneClasses(
                                accent,
                                isOwn
                            )}`}
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

                    <div className="min-w-0 flex-1">
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
                                    <EntryToggleButton
                                        name={name}
                                        expanded={expanded}
                                        panelId={entryPanelId}
                                        onToggle={onToggleEntry}
                                    />
                                ) : null}
                            </div>
                        ) : null}
                        {/* The trophy, named. The MVP prints the placement label
                            itself here rather than a generic "Contest Achievement"
                            — on a finalized board the rank marker beside it
                            already says the member placed, so the only thing this
                            line adds is WHICH award it was. */}
                        {isFrozenFinal && achievementLabel ? (
                            <p
                                data-standing-achievement={row.achievement?.type ?? "unknown"}
                                className={`mt-1 text-[10px] font-semibold normal-case tracking-[0.04em] ${accentClasses[accent].textSoft}`}
                            >
                                {achievementLabel}
                            </p>
                        ) : null}
                        {reversed ? (
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-200">
                                {pointsLabel} award reversed
                            </p>
                        ) : null}
                    </div>
                </div>

                <dl data-standing-metrics className={STANDINGS_METRIC_ROW_CLASS_NAME}>
                    <div
                        data-standing-metric="points"
                        data-points-state={pointsState}
                        aria-label={
                            noPointsEarned ? `No ${pointsLabel} earned` : pointsLabel
                        }
                        className={`${STANDING_METRIC_CARD_LAYOUT_CLASS_NAME} ${reversed
                            ? "border-red-300/20 bg-red-500/[0.08]"
                            : awarded
                                ? AWARDED_POINTS_CARD_TONE
                                : "border-white/10 bg-white/[0.04]"
                            }`}
                    >
                        <dt
                            className={
                                noPointsEarned
                                    ? STANDING_ZERO_POINTS_LABEL_CLASS_NAME
                                    : STANDING_METRIC_LABEL_CLASS_NAME
                            }
                        >
                            {noPointsEarned ? "No pts earned" : pointsLabel}
                        </dt>
                        <dd
                            className={`${STANDING_METRIC_VALUE_CLASS_NAME} ${noPointsEarned
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
                    <div
                        data-standing-metric={showOdds ? "combo-odds" : "score"}
                        className={STANDING_METRIC_CARD_CLASS_NAME}
                    >
                        <dt className={STANDING_METRIC_LABEL_CLASS_NAME}>
                            {showOdds ? "Combo odds" : "Correct picks"}
                        </dt>
                        <dd className={`${STANDING_METRIC_VALUE_CLASS_NAME} text-white`}>
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
                </dl>
            </div>

            {/* The entry itself, in the SAME card the Feed and the Entries tab
                render — one component for all three formats, so a member
                recognises their slate whichever tab they opened it from.

                `entryOnly`: SELECTIONS alone. The row above already states the
                rank, the member and the points, so the expansion repeating them
                would double its height to say nothing new. */}
            {entry && expanded ? (
                <div
                    id={entryPanelId}
                    role="region"
                    aria-label={`${name} entry details`}
                    className="border-t border-white/10 bg-black/25"
                >
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
                        entryOnly
                    />
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

    const frameSurfaceClassName =
        accent === "arena"
            ? STANDINGS_ARENA_FRAME_SURFACE_CLASS_NAME
            : STANDINGS_LEAGUE_FRAME_SURFACE_CLASS_NAME;

    if (isDraft) {
        return (
            <div className={`${frameSurfaceClassName} ${STANDINGS_INSET_CLASS_NAME} py-5`}>
                <p className="text-sm leading-6 text-gray-500">
                    Publish this contest to start counting participants and entries.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${frameSurfaceClassName} ${STANDINGS_INSET_CLASS_NAME} py-5`}>
                <p role="alert" className="text-sm leading-6 text-rose-200">
                    {error}
                </p>
            </div>
        );
    }

    // One read with no partial state, so the whole frame skeletons rather than
    // flashing an empty board that would read as "nobody entered".
    if (!leaderboard) {
        return (
            <div aria-hidden="true" className={frameSurfaceClassName}>
                <ul className="divide-y divide-white/10">
                    {[0, 1, 2].map((key) => (
                        <li
                            key={key}
                            className={`flex items-center gap-3 py-3.5 ${STANDINGS_INSET_CLASS_NAME}`}
                        >
                            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06] sm:h-10 sm:w-10 lg:h-11 lg:w-11" />
                            <div className="min-w-0 flex-1">
                                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
                                <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-white/[0.04]" />
                            </div>
                            <div className="h-11 w-[164px] shrink-0 animate-pulse rounded-xl bg-white/[0.04] sm:w-[220px]" />
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
    const rowIsOwn = (row: FeedContestStandingRow) =>
        row.is_own || (Boolean(currentUserId) && row.member.id === currentUserId);

    const own = leaderboard.my_standing;
    const ownIsOnBoard = own ? rows.some((row) => row.id === own.id) : false;

    /* ------------------------------------------------------------ PRE-LOCK */
    /*
     * The field has not opened, so this is a ROSTER and not a scoreboard. Sorted
     * by NAME rather than by the server's points ordering, which is the MVP's
     * rule and the point of the whole branch: printing the points order before
     * the lock publishes a provisional ranking that nothing has settled.
     */
    if (!entriesArePublic) {
        const previewRows = [...rows, ...(own && !ownIsOnBoard ? [own] : [])].sort(
            (left, right) => memberName(left).localeCompare(memberName(right))
        );

        return (
            <>
                <section
                    aria-label="Pre-lock standings entries"
                    aria-describedby="standings-pre-lock-description"
                    data-standings-frame
                    data-standings-frame-theme={accent}
                    className={frameSurfaceClassName}
                >
                    {previewRows.length ? (
                        <ul aria-label="Rank preview" className="relative divide-y divide-white/10">
                            {previewRows.map((row) => (
                                <StandingsPreviewRow
                                    key={row.id}
                                    row={row}
                                    accent={accent}
                                    isOwn={rowIsOwn(row)}
                                    pointsLabel={pointsLabel}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div
                            data-standings-empty-state="preview"
                            className="bg-black/15 px-5 py-7 text-center sm:px-6"
                        >
                            <span
                                aria-hidden
                                className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm text-slate-500"
                            >
                                —
                            </span>
                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                No complete entries have been accepted yet.
                            </p>
                        </div>
                    )}
                </section>
                {leaderboard.pagination.hasMore && onShowMore ? (
                    <div className={`flex justify-center py-4 ${STANDINGS_INSET_CLASS_NAME}`}>
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
            </>
        );
    }

    /* ---------------------------------------------------------- POST-LOCK */

    if (!rows.length) {
        return (
            <div
                data-standings-empty-state="public"
                data-standings-frame
                data-standings-frame-theme={accent}
                className={`${frameSurfaceClassName} px-5 py-5 sm:px-6`}
            >
                {/* The MVP's "No placement-eligible finishers this time." notice.
                    TD Psychic is the one template where a settled contest can
                    genuinely end with an empty board — a card needs 2 of 3 to
                    place — so it says why rather than reading as a missing read. */}
                {isFrozenFinal && template === "td_psychic" ? (
                    <>
                        <p className="text-sm font-semibold text-slate-200">
                            No placement-eligible finishers this time.
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-400">
                            A card needs at least 2 of 3 correct to place.
                        </p>
                    </>
                ) : (
                    <p className="text-sm leading-6 text-gray-500">
                        {isFrozenFinal
                            ? "This contest finished with no entries on the board."
                            : "No ranked results are available yet. Live rank updates automatically as selections settle."}
                    </p>
                )}
            </div>
        );
    }

    /*
     * The endpoint reads the viewer's own line separately so it is present
     * whatever page it really falls on. Pin it above the board only when the
     * loaded pages do NOT already contain it — otherwise it would show twice.
     */
    const ownPosition =
        own && isRanked && own.rank !== null ? own.rank : rows.length + 1;

    return (
        <>
            {/* The pinned own-row frame is its own block above the board, so it
                closes with a rule — two gradient surfaces butted together read as
                one long list with a stray heading in the middle otherwise. */}
            {own && !ownIsOnBoard ? (
                <div className={`${frameSurfaceClassName} border-b border-white/10`}>
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
                data-standings-frame-theme={accent}
                className={frameSurfaceClassName}
            >
                <ol
                    aria-label={
                        isFrozenFinal
                            ? "Final rank"
                            : isRanked
                                ? "Live rank"
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
                            isOwn={rowIsOwn(row)}
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
                <p
                    className={`pt-3 text-[10px] leading-4 text-gray-500 ${STANDINGS_INSET_CLASS_NAME}`}
                >
                    Ordered by points, then by who entered first. Final placements are set
                    when the contest settles.
                </p>
            ) : null}

            {leaderboard.pagination.hasMore && onShowMore ? (
                <div className={`flex justify-center py-4 ${STANDINGS_INSET_CLASS_NAME}`}>
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
        </>
    );
};

export default FeedContestStandingsPanel;
