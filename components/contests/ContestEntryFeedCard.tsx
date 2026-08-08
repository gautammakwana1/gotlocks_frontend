"use client";

import FeedList from "@/components/social/FeedList";
import type { PickCardAccent } from "@/components/social/PickCardContent";
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
 * it does not draw a card of its own at all — it hands the entry to `FeedList`
 * as a single embedded item, so an accepted entry reads exactly like the pick
 * posts everywhere else in the app, with the same tier colouring, the same
 * combo-legs disclosure and the same result chip.
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
};

export const ContestEntryFeedCard = ({
    row,
    pick,
    contextualPointsLabel,
    currentUserId,
    accent = "sky",
}: ContestEntryFeedCardProps) => (
    <FeedList
        items={[toContestEntryFeedItem(row, pick)]}
        embedded
        currentUserId={currentUserId}
        contextualPointsLabel={contextualPointsLabel}
        accent={accent}
        // Reactions belong to the Feed, not to a contest's field: an entry is a
        // competitive submission, and the MVP turns them off here for that reason.
        showReactions={false}
        showTopBorder={false}
    />
);

export default ContestEntryFeedCard;
