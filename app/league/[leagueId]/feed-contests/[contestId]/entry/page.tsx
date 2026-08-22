"use client";

import { useParams } from "next/navigation";
import FeedContestEntryShell from "@/components/contests/FeedContestEntryShell";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

/**
 * "Create your entry" for a League Feed contest — the MVP's
 * LeagueFeedContestEntryPage.
 *
 * Same policy as the detail route it sits under: no group fetch and no
 * membership gate. The MVP could gate client-side because its whole world sits
 * in one store; here the reads ARE the authority — the detail endpoint answers a
 * single indistinguishable 404 for every viewer who may not see the contest, and
 * `POST /enter` re-checks membership, the entry window, the rules version and
 * the slate on its own. A client-side gate would be a weaker second opinion, and
 * would need `state.group.group`, the single-tenant slot that must stay off
 * screens like this one.
 *
 * The shell itself renders the read-only note when the contest is not accepting
 * entries, rather than redirecting: the MVP bounces to `?tab=entries`, but that
 * decision cannot be made until the detail read lands, and a redirect fired on
 * an empty store would kick every visitor out on first paint.
 *
 * `participantLimit` is deliberately not passed: the ceiling is a property of an
 * Arena's hosting tier, a League Feed contest has no cap at all, and reading one
 * would mean adding the group fetch this route exists without.
 */
const LeagueFeedContestEntryPage = () => {
    const params = useParams<{ leagueId: string; contestId: string }>();
    const currentUser = useCurrentUser();
    const leagueId = params.leagueId as string;
    const contestId = params.contestId as string;

    if (!currentUser || !contestId) return <LeaguePageSkeleton />;

    return (
        <FeedContestEntryShell
            contestId={contestId}
            detailHref={`/league/${leagueId}/feed-contests/${contestId}`}
        />
    );
};

export default LeagueFeedContestEntryPage;
