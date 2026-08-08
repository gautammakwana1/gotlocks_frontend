"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import FeedContestDetail from "@/components/contests/FeedContestDetail";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

/**
 * The League Feed contest detail screen — the MVP's LeagueFeedContestDetailPage.
 *
 * No group fetch and no membership gate here, unlike the create route: the read
 * itself is the authority. `GET /group/feed-contest/detail/:contest_id` derives
 * the group from the contest and answers a single indistinguishable 404 for a
 * non-member, a foreign group, a draft read by anyone but its organizer and a
 * row that does not exist — so a client-side gate could only ever be a second,
 * weaker opinion, and would need `state.group.group`, the single-tenant slot
 * that useScopedGroup exists to keep off screens like this one.
 *
 * (AuthProvider already bounces an unauthenticated visitor to /landing-page.)
 */
const LeagueFeedContestDetailContent = () => {
    const params = useParams<{ leagueId: string; contestId: string }>();
    const currentUser = useCurrentUser();
    const leagueId = params.leagueId as string;
    const contestId = params.contestId as string;

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    return (
        <FeedContestDetail
            contestId={contestId}
            backHref={`/league/${leagueId}?tab=contests&contestType=feed`}
            editHref={`/league/${leagueId}/feed-contests/${contestId}/edit`}
            entryHref={`/league/${leagueId}/feed-contests/${contestId}/entry`}
        />
    );
};

// The active tab lives in `?tab=`, and useSearchParams needs a Suspense boundary
// or the whole route opts out of static prerendering.
const LeagueFeedContestDetailPage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <LeagueFeedContestDetailContent />
    </Suspense>
);

export default LeagueFeedContestDetailPage;
