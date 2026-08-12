"use client";

import {
    AWARDED_POINTS_CARD_TONE,
    STANDING_RANK_MARKER_LAYOUT,
    STANDING_RANK_MARKER_TONES,
    getStandingRankMarkerTone,
    type StandingRankMarkerTone,
} from "@/lib/styles/postCards";
import type {
    FeedContestLeaderboardData,
    FeedContestStandingRow,
} from "@/lib/interfaces/interfaces";

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
 * The MVP's fourth column — a disclosure that expands the entry itself — is NOT
 * ported: this endpoint carries `pick_id` and nothing else about the entry, and
 * the Entries tab already renders every entry in full.
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

const STANDINGS_FRAME_CLASS_NAME =
    "overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_34px_-30px_rgba(0,0,0,0.9)]";

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
    /** `multi_pick` scores on combo odds; Pick'em scores on correct picks. */
    template: string;
    currentUserId?: string;
    accent?: FeedContestStandingsAccent;
    onShowMore?: () => void;
};

const StandingRow = ({
    row,
    position,
    isRanked,
    isFrozenFinal,
    winningPlaces,
    showOdds,
    pointsLabel,
    accent,
    isOwn,
    zebra,
}: {
    row: FeedContestStandingRow;
    position: number;
    isRanked: boolean;
    isFrozenFinal: boolean;
    winningPlaces: number;
    showOdds: boolean;
    pointsLabel: string;
    accent: FeedContestStandingsAccent;
    isOwn: boolean;
    zebra?: string;
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
    const pointsState = reversed
        ? "reversed"
        : !isFrozenFinal
            ? "potential"
            : points <= 0
                ? "zero"
                : awarded
                    ? "awarded"
                    : "confirmed";

    return (
        <li
            data-standing-row
            data-standing-rank={row.rank ?? undefined}
            data-standing-placement={tone}
            data-standing-current-user={isOwn ? "true" : undefined}
            className={zebra}
        >
            <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-3 py-3 sm:grid-cols-[44px_minmax(0,1fr)_minmax(210px,260px)] sm:px-4">
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
                                : typeof row.total_picks === "number"
                                    ? `${row.correct_picks ?? 0}/${row.total_picks}`
                                    : `${row.correct_picks ?? 0}`}
                        </dd>
                    </div>
                    <div
                        data-standing-metric="points"
                        data-points-state={pointsState}
                        className={`min-w-0 rounded-lg border px-2.5 py-2 ${reversed
                            ? "border-red-300/20 bg-red-500/[0.08]"
                            : awarded
                                ? AWARDED_POINTS_CARD_TONE
                                : "border-white/10 bg-black/25"
                            }`}
                    >
                        <dt className="text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]">
                            {pointsLabel}
                        </dt>
                        <dd
                            className={`mt-1 truncate text-sm font-semibold tabular-nums ${reversed
                                ? "text-red-200 line-through"
                                : awarded
                                    ? "text-emerald-200"
                                    : isFrozenFinal
                                        ? "text-slate-300"
                                        : "text-amber-200"
                                }`}
                        >
                            +{points}
                        </dd>
                    </div>
                </dl>
            </div>
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
}: FeedContestStandingsPanelProps) => {
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
            <div aria-hidden="true" className={STANDINGS_FRAME_CLASS_NAME}>
                <ul className="divide-y divide-white/10">
                    {[0, 1, 2].map((key) => (
                        <li key={key} className="flex items-center gap-3 px-4 py-3.5">
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
                <div className={STANDINGS_FRAME_CLASS_NAME}>
                    <p className="border-b border-white/10 bg-black/20 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500">
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
                            accent={accent}
                            isOwn
                        />
                    </ul>
                </div>
            ) : null}

            <div data-standings-frame className={STANDINGS_FRAME_CLASS_NAME}>
                <div
                    aria-hidden
                    className="hidden grid-cols-[44px_minmax(0,1fr)_minmax(210px,260px)] items-center gap-3 border-b border-white/10 bg-black/20 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500 sm:grid"
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
                            accent={accent}
                            isOwn={Boolean(currentUserId) && row.member.id === currentUserId}
                            zebra={zebraRowClassName(index)}
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
