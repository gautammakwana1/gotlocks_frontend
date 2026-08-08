"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import FeedContestEditRouter from "@/components/contests/FeedContestEditRouter";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

/**
 * Edit a League Feed contest — the MVP's
 * `/league/[leagueId]/feed-contests/[contestId]/edit` route.
 *
 * Which editor appears depends on the contest's lifecycle, and only the detail
 * read can say: a DRAFT reopens the full create wizard with every step editable,
 * a PUBLISHED contest gets the copy-only form. `FeedContestEditRouter` owns that
 * decision — see its header for why the two are different edits rather than one.
 *
 * Like the detail route, no group fetch and no client-side gate: the same
 * `/detail/:contest_id` read backs both forms, and the write endpoints are the
 * authority on who may save.
 */
const LeagueFeedContestEditContent = () => {
    const params = useParams<{ leagueId: string; contestId: string }>();
    const currentUser = useCurrentUser();
    const leagueId = params.leagueId as string;
    const contestId = params.contestId as string;

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    return (
        <FeedContestEditRouter
            contestId={contestId}
            detailHref={`/league/${leagueId}/feed-contests/${contestId}`}
        />
    );
};

// The draft editor is the create wizard, which keeps its step in `?step=` — and
// `useSearchParams` without a Suspense boundary opts the whole route out of
// static prerendering and fails the build.
const LeagueFeedContestEditPage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <LeagueFeedContestEditContent />
    </Suspense>
);

export default LeagueFeedContestEditPage;
