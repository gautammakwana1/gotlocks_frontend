"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { Group, GroupSelector, League } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { GroupDataShape } from "../page";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { fetchAllSlipsRequest } from "@/lib/redux/slices/slipSlice";
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

export type LeaderboardStatus = "ACTIVE" | "ARCHIVED";

export type Leaderboard = {
    id: string;
    groupId: string;
    name: string;
    status: LeaderboardStatus;
    isDefault: boolean;
    createdAt: string;
    sportScope?: League | string | null;
};

export const mockLeaderboards: Leaderboard[] = [
    {
        id: "lb-main-g1",
        groupId: "g1",
        name: "Main Leaderboard",
        status: "ACTIVE",
        isDefault: true,
        createdAt: new Date().toISOString(),
        sportScope: null,
    },
];

const GroupLeaderboardPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ groupId: string }>();
    const router = useRouter();
    const currentUser = useCurrentUser();
    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);
    // const slip = useSelector((state: SlipSelector) => state.slip);

    useEffect(() => {
        if (!params.groupId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.groupId }));
        dispatch(fetchAllSlipsRequest({ group_id: params.groupId }));
    }, [params.groupId, currentUser, dispatch]);

    useEffect(() => {
        if (currentUser && !group) {
            router.replace("/home");
        }
    }, [group, router, currentUser]);

    // const groupSlips = useMemo(
    //     () => slip.slip?.filter((slip: Slip) => slip.group_id === group?.id),
    //     [group?.id, slip]
    // );

    // const groupSlipIds = useMemo(
    //     () => new Set(groupSlips.map((slip: Slip) => slip.id)),
    //     [groupSlips]
    // );

    // const groupUsers = useMemo(
    //     () => group?.members.filter((user) => (group?.members ?? []).includes(user.user_id)),
    //     [group?.members]
    // );

    // const groupPicks = useMemo(
    //     () => picks.filter((pick) => groupSlipIds.has(pick.slipId)),
    //     [groupSlipIds]
    // );

    // const groupLeaderboards = useMemo(
    //     () => mockLeaderboards.filter((board) => board.groupId === group?.id),
    //     [group?.id]
    // );
    // const defaultLeaderboard = useMemo(
    //     () =>
    //         groupLeaderboards.find((board) => board.isDefault && board.status === "ACTIVE") ??
    //         groupLeaderboards.find((board) => board.isDefault) ??
    //         null,
    //     [groupLeaderboards]
    // );

    if (!currentUser || !group) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8">
            <BackButton />
            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 shadow-lg">
                <p
                    className="allow-caps text-sm font-extrabold text-transparent bg-clip-text"
                    style={displayNameGradientStyle}
                >
                    {group.name}
                </p>
                <h1 className="text-3xl font-semibold text-white">Leaderboard</h1>
            </header>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                        standings by slip
                    </h2>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        leaderboard slips only
                    </span>
                </div>
                {/* {defaultLeaderboard ? (
                    <LeaderboardGrid
                        group={group}
                        slips={groupSlips}
                        users={groupUsers}
                        picks={groupPicks}
                        leaderboardId={defaultLeaderboard.id}
                        leaderboardName={defaultLeaderboard.name}
                    />
                ) : (
                    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                        No leaderboard found yet.
                    </div>
                )} */}
            </section>
        </div>
    );
};

export default GroupLeaderboardPage;
