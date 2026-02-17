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
    const params = useParams<{ groupId: string }>();
    const router = useRouter();
    const currentUser = useCurrentUser();

    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);

    useEffect(() => {
        if (!params.groupId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.groupId }));
    }, [params.groupId, currentUser, dispatch]);

    useEffect(() => {
        if (!group || !currentUser) return;
        router.replace(`/group/${group.id}?tab=slips`);
    }, [currentUser, group, router]);

    if (!group || !currentUser) {
        router.replace("/home");
        return null;
    }

    return null;
};

export default SlipsPage;
