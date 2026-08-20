"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import type { GroupSelector } from "@/lib/interfaces/interfaces";
import { buildFantasyPodiumCards } from "@/lib/contests/feedContestPodium";
import FeedContestWinnersCard from "./FeedContestWinnersCard";
import type { StructuredFeedContextMetadata } from "./types";

/* ----------------------------------------------------------------------------
 * The Feed tab's FANTASY winners strip.
 *
 * Reads GET /group/contest-leaderboard/list/finalized/podium — the frozen
 * results board for a League's Fantasy contests. Sibling of
 * `FeedContestWinnersBlock`, which does the same job for Feed contests off a
 * different endpoint; they share one card so the two kinds of result read
 * identically in the same column.
 *
 * LEAGUE ONLY. Fantasy contests are a League construct — an Arena has Feed
 * contests and nothing this endpoint would return — so the Feed mounts this
 * only on the League surface.
 *
 * A PURE READ of `group.fantasyPodium`: it does not dispatch. The fetch is
 * owned by ConnectedStructuredFeed alongside the Feed's other reads, so the
 * strip cannot trigger a request on a group the Feed has already left.
 *
 * WHY ONLY FINALIZED CONTESTS. A live contest has no winners, only a current
 * leader, and every badge on it is an argmax that can still change hands. The
 * endpoint reads the frozen tables for exactly that reason.
 * -------------------------------------------------------------------------- */

type FantasyContestWinnersBlockProps = {
    context: StructuredFeedContextMetadata;
    accent: "sky" | "violet";
    currentUserId?: string;
};

export const FantasyContestWinnersBlock = ({
    context,
    accent,
    currentUserId,
}: FantasyContestWinnersBlockProps) => {
    const groupId = context.id;
    const fantasyPodium = useSelector((state: GroupSelector) => state.group.fantasyPodium);

    // Guarded on the slot's own group id, not just on the fetch effect: the Feed
    // renders on the same tick the group changes, and an unguarded read would
    // show the previous League's winners until the refetch landed.
    const cards = useMemo(
        () =>
            fantasyPodium.groupId === groupId
                ? buildFantasyPodiumCards(fantasyPodium.contests, groupId, currentUserId)
                : [],
        [fantasyPodium.groupId, fantasyPodium.contests, groupId, currentUserId]
    );

    // `contests === null` is "not fetched yet"; [] is a real, settled answer.
    // Only the first is worth a skeleton — a refetch keeps the cards on screen.
    if (fantasyPodium.loading && fantasyPodium.contests === null) {
        return (
            <div
                data-fantasy-contest-winners-block="loading"
                aria-hidden
                className="px-5 pt-4 sm:px-0"
            >
                <div className="h-[19rem] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] motion-reduce:animate-none" />
            </div>
        );
    }

    // A failed read is silent for the same reason an empty one is: this is a
    // supplementary strip above the Feed, and an error banner over someone
    // else's post list is worse than the strip simply not appearing.
    if (!cards.length) return null;

    return (
        <section
            aria-label={`${context.name} Fantasy contest winners`}
            data-fantasy-contest-winners-block
            data-fantasy-contest-winners-count={cards.length}
            className="space-y-3 px-5 pt-4 sm:px-0"
        >
            <h2 className="flex items-baseline gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Fantasy Winners
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
                    // Fantasy contests score in Fantasy Points — a different
                    // currency from the League/Arena Points a Feed contest
                    // awards, and the two appear in the same column here.
                    pointsLabel="Fantasy Points"
                    currentUserId={currentUserId}
                />
            ))}
        </section>
    );
};

export default FantasyContestWinnersBlock;
