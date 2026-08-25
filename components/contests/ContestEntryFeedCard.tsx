"use client";

import FeedList from "@/components/social/FeedList";
import PickCard from "@/components/social/pick-card/PickCard";
import type {
    FeedContestEntryFormat,
    PickCardAccent,
    PickCardContestStanding,
    PickCardPresentation,
} from "@/components/social/pick-card/types";
import type {
    FeedContestEntryPick,
    FeedContestEntryRow,
    Pick,
    PickResult,
    PickSelectionMeta,
} from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * ONE accepted contest entry, rendered as a FEED POST.
 *
 * This is the MVP's `ContestComboEntryCard` (StructuredContestDetail.tsx:748):
 * it draws no card of its own — it hands the entry to `FeedList` as a single
 * embedded item, so an accepted entry reads exactly like the pick posts
 * everywhere else in the app, with the same tier colouring, the same combo-legs
 * disclosure and the same result chip.
 *
 * `entryOnly` is the one exception: there is no author row or footer to draw, so
 * it skips `FeedList` and renders the card variant directly. That is the MVP's
 * `displayMode="standings"` (StructuredContestDetail.tsx:689).
 *
 * The only substitution is the points vocabulary: inside a contest a pick is
 * worth League / Arena Points, not global XP, which is what
 * `contextualPointsLabel` swaps.
 * -------------------------------------------------------------------------- */

/**
 * The entries read returns the `picks` columns under a different envelope than
 * the feed does, so the row is re-assembled into the `Pick` the card expects.
 *
 * Every value comes from the server: `points` is what the entry is worth,
 * `arena_points_awarded` is what was actually credited at settlement, and
 * FeedList picks between them from the result — so neither is recomputed here.
 */
export const toContestEntryFeedItem = (
    row: FeedContestEntryRow,
    pick: FeedContestEntryPick
): Pick => ({
    id: row.id,
    // A contest entry belongs to no slip; the column exists for slip picks only.
    slip_id: "",
    user_id: row.member.id,
    description: pick.description ?? "",
    odds_bracket: pick.odds_bracket ?? "",
    // Passed through for TD Psychic, whose Combo figure is a post-lock number
    // rather than a formatted string — see `Pick.american_odds`.
    american_odds: pick.american_odds ?? null,
    result: (pick.result ?? "pending") as PickResult,
    points: pick.points ?? 0,
    awardedPoints: pick.arena_points_awarded ?? undefined,
    difficulty_tier: (pick.difficulty_tier ?? undefined) as Pick["difficulty_tier"],
    difficulty_label: (pick.difficulty_label ?? null) as Pick["difficulty_label"],
    sport: pick.sport ?? "",
    matchup: pick.matchup,
    match_date: pick.match_date,
    game_id: pick.game_id ?? undefined,
    market: (pick.market ?? undefined) as Pick["market"],
    side: (pick.side ?? undefined) as Pick["side"],
    threshold: pick.threshold ?? undefined,
    confidence: (pick.confidence ?? undefined) as Pick["confidence"],
    is_combo: Boolean(pick.is_combo),
    legs: (pick.legs ?? undefined) as Pick["legs"],
    selection: (pick.selection ?? undefined) as PickSelectionMeta | undefined,
    // A contest entry earns contest points, never global XP — the server writes
    // both columns as 0, and passing them through keeps the card honest about it.
    calculated_global_xp: 0,
    xp_awarded: 0,
    // "Combo · 3 picks · 2h ago" — the same header line a Feed combo post gets.
    source_tab: "Combo",
    created_at: row.submitted_at,
    updated_at: row.updated_at,
    profiles: {
        id: row.member.id,
        user_id: row.member.id,
        username: row.member.username ?? "",
        profile_image: row.member.profile_image ?? undefined,
    },
});

export type ContestEntryFeedCardProps = {
    row: FeedContestEntryRow;
    pick: FeedContestEntryPick;
    /** "League Points" | "Arena Points" — replaces the global XP wording. */
    contextualPointsLabel: string;
    currentUserId?: string;
    /** Keeps the card in step with its community shell; an Arena reads violet. */
    accent?: PickCardAccent;
    /**
     * Which builder produced the entry. All three models are stored as combos —
     * one pick row, many legs — so nothing on the row itself says which of them
     * it is; only the CONTEST knows, and it has to be told.
     */
    entryFormat?: FeedContestEntryFormat;
    /** Sunday Pick'em only — splits each tile's total into odds + bonus. */
    pickemCorrectBonus?: number | null;
    /** Required by the feed_contest presentation; the entry's own contest page. */
    contestHref?: string;
    contestName?: string;
    /**
     * The entry's place on the board, when the surface holds one. The group
     * Feed now passes one (its `/picks` read joins contest_leaderboard); the
     * Entries list still does not, and absent is exactly what "never ranked"
     * means there, so the tile reads "Pending".
     */
    standing?: PickCardContestStanding;
    /** False keeps a settled non-qualifier visible without podium styling. */
    placementEligible?: boolean;
    /**
     * Selections ONLY — no author row, no metric rail, no footer.
     *
     * What the Standings tab expands to: the row above the expansion already
     * states the rank, the member and the points, so repeating them inside it
     * makes the expansion twice as tall and says nothing new.
     */
    entryOnly?: boolean;
};

export const ContestEntryFeedCard = ({
    row,
    pick,
    contextualPointsLabel,
    currentUserId,
    accent = "sky",
    entryFormat,
    pickemCorrectBonus,
    contestHref,
    contestName,
    standing,
    placementEligible,
    entryOnly = false,
}: ContestEntryFeedCardProps) => {
    const resolvedEntryFormat = entryFormat ?? "general_combo";
    /*
     * ALWAYS declared, unlike before — the format defaults to General Combo
     * rather than to no presentation at all.
     *
     * Dropping the presentation is what used to make an entry render as a plain
     * combo post with no contest header, and it is only ever a General Combo
     * that renders correctly that way by accident. Naming the format is also
     * what routes a Pick'em or TD entry to its own card instead of to a parlay
     * leg list.
     */
    const presentation: PickCardPresentation = {
        kind: "feed_contest",
        contestHref: contestHref ?? "",
        contestName: contestName ?? "",
        contextualPointsLabel:
            contextualPointsLabel === "Arena Points" ? "Arena Points" : "League Points",
        entryFormat: resolvedEntryFormat,
        pickemCorrectBonus,
        standing,
        placementEligible,
    };
    const item = toContestEntryFeedItem(row, pick);

    return entryOnly ? (
        <PickCard
            pick={item}
            entryOnly
            accent={accent}
            contextualPointsLabel={contextualPointsLabel}
            presentation={presentation}
        />
    ) : (
        <FeedList
            items={[item]}
            embedded
            currentUserId={currentUserId}
            contextualPointsLabel={contextualPointsLabel}
            accent={accent}
            getItemPresentation={() => presentation}
            // Reactions belong to the Feed, not to a contest's field: an entry is
            // a competitive submission, and the MVP turns them off here for that
            // reason.
            showReactions={false}
            showTopBorder={false}
        />
    );
};

export default ContestEntryFeedCard;
