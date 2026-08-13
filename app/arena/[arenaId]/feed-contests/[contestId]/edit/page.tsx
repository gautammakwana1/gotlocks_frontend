"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import FeedContestEditRouter from "@/components/contests/FeedContestEditRouter";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

/**
 * Edit an Arena contest — the mirror of the League's
 * `/league/[leagueId]/feed-contests/[contestId]/edit` route.
 *
 * Which editor appears depends on the contest's lifecycle, and only the detail
 * read can say: a DRAFT reopens the full create wizard with every step editable,
 * a PUBLISHED contest gets the copy-only form. `FeedContestEditRouter` owns that
 * decision AND derives `groupType` from the contest's own group, so this route
 * needs nothing arena-specific beyond its hrefs.
 *
 * Like the detail route, no group fetch and no client-side gate: the same
 * `/detail/:contest_id` read backs both forms, and the write endpoints are the
 * authority on who may save.
 */
const ArenaFeedContestEditContent = () => {
    const params = useParams<{ arenaId: string; contestId: string }>();
    const currentUser = useCurrentUser();
    const arenaId = params.arenaId as string;
    const contestId = params.contestId as string;

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    return (
        <FeedContestEditRouter
            contestId={contestId}
            detailHref={`/arena/${arenaId}/feed-contests/${contestId}`}
        />
    );
};

// The draft editor is the create wizard, which keeps its step in `?step=` — and
// `useSearchParams` without a Suspense boundary opts the whole route out of
// static prerendering and fails the build.
const ArenaFeedContestEditPage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <ArenaFeedContestEditContent />
    </Suspense>
);

export default ArenaFeedContestEditPage;
