"use client";

import { Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import FeedContestDetail from "@/components/contests/FeedContestDetail";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { RootState } from "@/lib/interfaces/interfaces";
import { fetchArenaHostingDetailsRequest } from "@/lib/redux/slices/arenaSlice";

/**
 * The Arena contest detail screen — the same component the League Feed contest
 * detail route mounts, with the violet accent. `GET /group/feed-contest/detail/
 * :contest_id` serves both surfaces and derives the group, the context and the
 * viewer's role from the contest itself, so nothing about the read differs.
 *
 * No group fetch and no membership gate, exactly as on the League route: the
 * read IS the authority — it answers a single indistinguishable 404 for a
 * non-member, a foreign group, a draft read by anyone but its organizer and a
 * row that does not exist. A client-side gate could only be a weaker second
 * opinion, and would need `state.group.group`, the single-tenant slot
 * useScopedGroup exists to keep off screens like this one.
 *
 * The ONE arena-only read is hosting, for the tier's participating-member
 * ceiling that the capacity fact and the standings header render against. It is
 * keyed off the ROUTE param and the slice guards it with `hostingForId`, so no
 * other Arena's numbers can ever describe this one. `writable` is deliberately
 * left at its default: unlike the MVP, this backend does NOT gate the organizer
 * writes on hosting state (resolveFeedContestForOrganizer checks role only), so
 * disabling them here would refuse something the server permits.
 */
const ArenaFeedContestDetailContent = () => {
    const params = useParams<{ arenaId: string; contestId: string }>();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const arenaId = params.arenaId as string;
    const contestId = params.contestId as string;
    const { hosting, hostingForId } = useSelector((state: RootState) => state.arena);

    useEffect(() => {
        if (!arenaId || !currentUser) return;
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
    }, [dispatch, arenaId, currentUser]);

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    const participantLimit =
        hostingForId === arenaId ? hosting?.participating_member_limit ?? null : null;

    return (
        <FeedContestDetail
            contestId={contestId}
            backHref={`/arena/${arenaId}?tab=contests`}
            editHref={`/arena/${arenaId}/feed-contests/${contestId}/edit`}
            entryHref={`/arena/${arenaId}/feed-contests/${contestId}/entry`}
            participantLimit={participantLimit}
            accent="arena"
        />
    );
};

// The active tab lives in `?tab=`, and useSearchParams needs a Suspense boundary
// or the whole route opts out of static prerendering.
const ArenaFeedContestDetailPage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <ArenaFeedContestDetailContent />
    </Suspense>
);

export default ArenaFeedContestDetailPage;
