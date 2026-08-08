"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import ArenaContestCreateForm from "@/components/arenas/ArenaContestCreateForm";
import type { GroupSelector } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";

// Thin wrapper like /arena/[arenaId]/page.tsx: the group is only read for the
// header name — every create rule (role, unlock, hosting, limits) is enforced
// by POST /group/arena/create-arena-contest itself.
const ArenaContestCreatePage = () => {
    const params = useParams<{ arenaId: string }>();
    const dispatch = useDispatch();
    const { group: arena } = useSelector((state: GroupSelector) => state.group);
    const arenaLoaded = arena?.id === params.arenaId;

    useEffect(() => {
        if (!params.arenaId || arenaLoaded) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.arenaId }));
    }, [params.arenaId, arenaLoaded, dispatch]);

    return (
        <ArenaContestCreateForm
            arenaId={params.arenaId}
            contextName={arenaLoaded ? arena?.name ?? "Arena" : "Arena"}
            backHref={`/arena/${params.arenaId}?tab=contests`}
        />
    );
};

export default ArenaContestCreatePage;
