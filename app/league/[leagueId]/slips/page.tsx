"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Group, GroupSelector } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { useDispatch, useSelector } from "react-redux";
import { GroupDataShape } from "../page";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const hasNestedGroup = (
    value: GroupDataShape
): value is { group?: Group | null } => {
    return Boolean(value && typeof value === "object" && "group" in value);
};

const extractGroup = (data: GroupDataShape): Group | null => {
    if (!data) {
        return null;
    }

    if (hasNestedGroup(data)) {
        return data.group ?? null;
    }

    return data;
};

const SlipsPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ leagueId: string }>();
    const router = useRouter();
    const currentUser = useCurrentUser();

    const rawLeague = useSelector((state: GroupSelector) => state.group.group);
    const league = useMemo(() => extractGroup(rawLeague as GroupDataShape), [rawLeague]);

    useEffect(() => {
        if (!params.leagueId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.leagueId }));
    }, [params.leagueId, currentUser, dispatch]);

    useEffect(() => {
        if (!league || !currentUser) return;
        router.replace(`/league/${league.id}?tab=slips`);
    }, [currentUser, league, router]);

    if (!league || !currentUser) {
        router.replace("/home");
        return null;
    }

    return null;
};

export default SlipsPage;
