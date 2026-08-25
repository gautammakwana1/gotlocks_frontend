import type { FeedContestPickStanding } from "@/lib/interfaces/interfaces";
import type { PickCardContestStanding } from "@/components/social/pick-card/types";

/* ============================================================================
 * API `standing` -> the Contest Rank tile's model.
 *
 * TWO reads carry the same block — GET /group/feed-contest/picks (the group
 * Feed) and GET /group/feed-contest/entries/:contest_id (a contest's own
 * field) — and both render through the same card, so the mapping lives here
 * rather than being written out at each call site and drifting.
 *
 * THERE IS NO "LIVE" RANK ON EITHER READ. `contest_leaderboard.rank` is written
 * once, by finalization, so a row either has a final placement or has none at
 * all. `status: "live"` stays in the card's vocabulary for a surface that one
 * day computes a running order; nothing produces it today.
 * ========================================================================== */

export const toPickCardStanding = ({
    standing,
    isRevealed,
    isFinalized,
}: {
    standing: FeedContestPickStanding | null | undefined;
    /**
     * Whether THIS viewer may see this entry's detail. A masked card must never
     * show a placement — belt-and-braces, since a rank is only written after
     * the lock that reveals the field, so the two can never actually disagree.
     */
    isRevealed: boolean;
    /**
     * Has the contest settled. Only consulted when there is no standing, to
     * tell "not finished yet" (Pending) from "finished without a placement"
     * (Unranked) — a distinction the member cannot otherwise make.
     */
    isFinalized?: boolean;
}): PickCardContestStanding => {
    if (!isRevealed) return { status: "pending", rank: null };
    if (standing) return { status: "final", rank: standing.rank };
    return isFinalized
        ? { status: "unranked", rank: null }
        : { status: "pending", rank: null };
};

/**
 * Whether a contest has played out.
 *
 * `lifecycle_status` reads 'archived' on a contest that finalized weeks ago, so
 * the status alone is not the test — `finalized_at` is. Both are accepted
 * because the two reads spell it differently: the picks feed sends an explicit
 * `is_finalized`, a contest envelope sends the timestamp.
 */
export const isContestFinalized = (contest: {
    is_finalized?: boolean | null;
    finalized_at?: string | null;
    lifecycle_status?: string | null;
} | null | undefined): boolean =>
    Boolean(
        contest?.is_finalized ||
        contest?.finalized_at ||
        contest?.lifecycle_status === "final"
    );
