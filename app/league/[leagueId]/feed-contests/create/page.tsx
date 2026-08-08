"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import FeedContestCreateForm from "@/components/contests/FeedContestCreateForm";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import useScopedGroup from "@/lib/groups/useScopedGroup";
import { isLeagueMember } from "@/lib/permissions/leaguePermissions";

const LeagueFeedContestCreateContent = () => {
    const params = useParams<{ leagueId: string }>();
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const leagueId = params.leagueId as string;

    // The wizard sends `group_id` with every create, so reading the shared group
    // slot raw would let the PREVIOUS league's id reach the endpoint on the first
    // commit after navigating between two leagues.
    const scopedLeague = useScopedGroup(leagueId);
    const group = scopedLeague.group;

    useEffect(() => {
        if (!leagueId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
    }, [dispatch, leagueId, currentUser]);

    const isMember = isLeagueMember(group, currentUser?.userId);
    const isCommissioner =
        !!group && !!currentUser && group.created_by === currentUser.userId;
    const backHref = `/league/${leagueId}?tab=contests&contestType=feed`;

    // The endpoint enforces organizer authority itself; this only keeps a member
    // from staring at a form they can never submit.
    useEffect(() => {
        if (!currentUser) return;
        if (scopedLeague.status === "missing" || (scopedLeague.status === "ready" && !isMember)) {
            router.replace("/home");
            return;
        }
        if (scopedLeague.status === "ready" && !isCommissioner) router.replace(backHref);
    }, [scopedLeague.status, currentUser, isMember, isCommissioner, router, backHref]);

    if (scopedLeague.status !== "ready" || !group?.id || !currentUser) {
        return <LeaguePageSkeleton />;
    }
    if (!isMember || !isCommissioner) return null;

    return (
        <FeedContestCreateForm
            groupId={group.id}
            groupType="league"
            contextName={group.name ?? "League"}
            backHref={backHref}
            detailHref={(contestId) => `/league/${leagueId}/feed-contests/${contestId}`}
        />
    );
};

// The wizard keeps its current step in `?step=`, and useSearchParams needs a
// Suspense boundary or the whole route opts out of static prerendering.
const LeagueFeedContestCreatePage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <LeagueFeedContestCreateContent />
    </Suspense>
);

export default LeagueFeedContestCreatePage;
