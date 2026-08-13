"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import FeedContestEntryShell from "@/components/contests/FeedContestEntryShell";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { RootState } from "@/lib/interfaces/interfaces";
import { fetchArenaHostingDetailsRequest } from "@/lib/redux/slices/arenaSlice";

/**
 * "Create your entry" for an Arena contest — the same shell the League Feed
 * contest entry route mounts, with the violet accent.
 *
 * Same policy as the detail route it sits under: no group fetch and no
 * membership gate. The reads ARE the authority — the detail endpoint answers a
 * single indistinguishable 404 for every viewer who may not see the contest, and
 * `POST /enter` re-checks membership, the entry window, the rules version, the
 * slate AND (for an Arena) hosting on its own.
 *
 * `writable` mirrors that last check — `resolveFeedContestForEntry` answers 402
 * unless arena_hosting.status is one of WRITABLE_HOSTING_STATUSES — so a paused
 * Arena disables the submit with an explanation rather than letting it fail. It
 * is the same wider set the create gate does NOT use: a scheduled pause that has
 * not taken effect still accepts entries.
 *
 * The shell renders a read-only note when the contest is not accepting entries,
 * rather than redirecting: that decision cannot be made until the detail read
 * lands, and a redirect fired on an empty store would kick every visitor out on
 * first paint.
 */
const WRITABLE_ARENA_HOSTING_STATUSES = ["included_month", "active", "pause_scheduled"];

const ArenaFeedContestEntryPage = () => {
    const params = useParams<{ arenaId: string; contestId: string }>();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const arenaId = params.arenaId as string;
    const contestId = params.contestId as string;
    const { hosting, unlock, hostingForId } = useSelector(
        (state: RootState) => state.arena
    );

    useEffect(() => {
        if (!arenaId || !currentUser) return;
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
    }, [dispatch, arenaId, currentUser]);

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    // Optimistic until this Arena's own hosting lands — a not-yet-read slot must
    // not look like a paused Arena and disable a submit the server would accept.
    const scopedHosting = hostingForId === arenaId ? hosting : null;
    const scopedUnlock = hostingForId === arenaId ? unlock : null;
    const writable =
        !scopedHosting ||
        (WRITABLE_ARENA_HOSTING_STATUSES.includes(scopedHosting.status) &&
            scopedUnlock?.status === "unlocked");

    return (
        <FeedContestEntryShell
            contestId={contestId}
            detailHref={`/arena/${arenaId}/feed-contests/${contestId}`}
            writable={writable}
            accent="arena"
        />
    );
};

export default ArenaFeedContestEntryPage;
