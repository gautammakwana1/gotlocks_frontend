"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import FeedContestCreateForm from "@/components/contests/FeedContestCreateForm";
import { isArenaStaffRole } from "@/components/arenas/ArenaDashboard";
import LeaguePageSkeleton from "@/components/skeletons/leagues/LeaguePageSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { RootState } from "@/lib/interfaces/interfaces";
import { fetchArenaHostingDetailsRequest } from "@/lib/redux/slices/arenaSlice";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import useScopedGroup from "@/lib/groups/useScopedGroup";

/**
 * The Arena contest wizard — the SAME form the League Feed hub uses, with
 * `groupType="arena"`. `/group/feed-contest/create` serves both surfaces and
 * derives `context_type` from the group row, so nothing but this flag differs.
 *
 * The old `/arena/[arenaId]/contests/create` route (ArenaContestCreateForm ->
 * POST /group/arena/create-arena-contest) is the legacy `arena_contests` engine
 * and is left in place untouched; the Contests tab no longer links to it.
 */
const ArenaFeedContestCreateContent = () => {
    const params = useParams<{ arenaId: string }>();
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const arenaId = params.arenaId as string;

    // The wizard sends `group_id` with every create, so reading the shared group
    // slot raw would let the PREVIOUSLY viewed group's id reach the endpoint on
    // the first commit after navigating between two groups.
    const scopedArena = useScopedGroup(arenaId);
    const arena = scopedArena.group;
    const { hosting, hostingForId } = useSelector((state: RootState) => state.arena);

    useEffect(() => {
        if (!arenaId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        // Only for the Rules step's participation copy ("each staff entrant uses
        // one of this contest's 50 participant spots"). `hostingForId` says whose
        // hosting is in the shared slot, so another Arena's ceiling cannot leak in.
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
    }, [dispatch, arenaId, currentUser]);

    const role = arena?.current_user_member?.role;
    const isMember = Boolean(role);
    // Arena owner (commissioner) OR manager may organize — unlike a League, where
    // only the commissioner can. isFeedContestOrganizer enforces the same split.
    const isStaff = isArenaStaffRole(role);
    const backHref = `/arena/${arenaId}?tab=contests`;

    // The endpoint enforces organizer authority, the unlock, hosting state and the
    // active-contest limit itself; this only keeps a member from staring at a form
    // they can never submit.
    useEffect(() => {
        if (!currentUser) return;
        if (scopedArena.status === "missing" || (scopedArena.status === "ready" && !isMember)) {
            router.replace("/home");
            return;
        }
        if (scopedArena.status === "ready" && !isStaff) router.replace(backHref);
    }, [scopedArena.status, currentUser, isMember, isStaff, router, backHref]);

    if (scopedArena.status !== "ready" || !arena?.id || !currentUser) {
        return <LeaguePageSkeleton />;
    }
    if (!isMember || !isStaff) return null;

    return (
        <FeedContestCreateForm
            groupId={arena.id}
            groupType="arena"
            contextName={arena.name ?? "Arena"}
            backHref={backHref}
            detailHref={(contestId) => `/arena/${arenaId}/feed-contests/${contestId}`}
            participantLimit={
                hostingForId === arenaId
                    ? hosting?.participating_member_limit ?? null
                    : null
            }
        />
    );
};

// The wizard keeps its current step in `?step=`, and useSearchParams needs a
// Suspense boundary or the whole route opts out of static prerendering.
const ArenaFeedContestCreatePage = () => (
    <Suspense fallback={<LeaguePageSkeleton />}>
        <ArenaFeedContestCreateContent />
    </Suspense>
);

export default ArenaFeedContestCreatePage;
