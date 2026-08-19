"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import type { FeedGroupType, RootState } from "@/lib/interfaces/interfaces";
import { buildFeedContestPodiumCards } from "@/lib/contests/feedContestPodium";
import { getStructuredFeedPointLabel } from "./formatters";
import { FeedContestWinnersCard } from "./FeedContestWinnersCard";
import type { StructuredFeedContextMetadata } from "./types";

/**
 * The Feed tab's WINNERS BLOCK — the top three of each recently finalized Feed
 * contest, on both surfaces.
 *
 * Reads GET /group/feed-contest/list/finalized/podium, which is `/list/finalized`
 * plus a `podium` array per row. Deliberately a SMALL first page rather than the
 * whole history: the block sits above the Feed's own list, so it is a "what just
 * finished" strip and not a second scrollable surface. Members who want the
 * archive have the Contests tab's Finalized section, and each card links to its
 * own standings board.
 *
 * Renders NOTHING at all — no heading, no empty state — when no finalized
 * contest has a podium. A community that has never finished a contest should see
 * its Feed exactly as it did before this block existed, rather than a permanent
 * empty frame at the top of it.
 *
 * PURE READ of `feedContest.podium`: it does not dispatch. This block is drawn
 * inside CommunitySwipePager's slide, which is keyed on the active view, so it
 * remounts on every Updates/Entries/Standings switch — a mount effect here would
 * be one redundant GET per switch. ConnectedStructuredFeed, which sits above the
 * pager and does not remount, owns the fetch.
 */

/**
 * Contests per page. The server caps this endpoint at 25 because the page size
 * IS its podium fan-out (one achievements query per contest), so a small number
 * here is the cheap read as well as the right amount of Feed real estate.
 *
 * Exported so the fetch owner above the pager stays in step with the block that
 * renders what it fetched.
 */
export const FEED_CONTEST_WINNERS_PAGE_SIZE = 5;

type FeedContestWinnersBlockProps = {
    context: StructuredFeedContextMetadata;
    groupType: FeedGroupType;
    accent: "sky" | "violet";
    currentUserId?: string;
};

export const FeedContestWinnersBlock = ({
    context,
    groupType,
    accent,
    currentUserId,
}: FeedContestWinnersBlockProps) => {
    const groupId = context.id;
    const podium = useSelector((state: RootState) => state.feedContest.podium);

    // Guarded on the slot's own group id, not just on the fetch effect: the Feed
    // renders on the same tick the group changes, and an unguarded read would
    // show the previous community's winners until the refetch landed.
    const cards = useMemo(
        () =>
            podium.groupId === groupId
                ? buildFeedContestPodiumCards(podium.contests, groupType, groupId)
                : [],
        [podium.groupId, podium.contests, groupType, groupId]
    );

    // `contests === null` is "not fetched yet"; [] is a real, settled answer.
    // Only the first is worth a skeleton — a refetch keeps the cards on screen.
    if (podium.loading && podium.contests === null) {
        return (
            <div
                data-feed-contest-winners-block="loading"
                aria-hidden
                className="px-5 pt-4 sm:px-0"
            >
                <div className="h-[19rem] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] motion-reduce:animate-none" />
            </div>
        );
    }

    // A failed read is silent here for the same reason an empty one is: this is
    // a supplementary strip above the Feed, and an error banner over someone
    // else's post list is worse than the strip simply not appearing.
    if (!cards.length) return null;

    const pointsLabel = getStructuredFeedPointLabel(context);

    return (
        <section
            aria-label={`${context.name} contest winners`}
            data-feed-contest-winners-block
            data-feed-contest-winners-count={cards.length}
            className="space-y-3 px-5 pt-4 sm:px-0"
        >
            <h2 className="flex items-baseline gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Winners
                <span className="text-[10px] font-medium tracking-normal text-gray-500">
                    {cards.length}
                </span>
            </h2>

            {cards.map((card) => (
                <FeedContestWinnersCard
                    key={card.contestId}
                    context={context}
                    card={card}
                    accent={accent}
                    pointsLabel={pointsLabel}
                    currentUserId={currentUserId}
                />
            ))}
        </section>
    );
};

export default FeedContestWinnersBlock;
