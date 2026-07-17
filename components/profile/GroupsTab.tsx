"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { Group, GroupObject } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearJoinedGroupByInviteCodeMessage, fetchMyGroupsRequest, joinedGroupByInviteCodeRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import ScoringModal from "../modals/ScoringModal";
import { InfoIcon, MembersIcon, RightArrowIcon } from "../ui/SvgIcons";
import GroupsTabSkeleton from "../skeletons/fantasy/GroupsTabSkeleton";
import { getActiveContestCountsLabel, getCombinedContestCapacityLabel, getGroupCapacityLabel, getGroupTypeLabel, getHostingTierLabel } from "@/lib/groups/limits";
import { groupPreviewKickerTextClassName, groupPreviewMetaTextClassName, GroupTypeMetaLabel } from "../group/GroupPreviewChip";
import InviteCodeCopy from "../group/InviteCodeCopy";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group>;
        };
        message?: string;
    } | null;
    loading: boolean;
    joinLoading: boolean;
    error: string | null;
    message: string | null;
    hasMore: boolean;
    myGroups: GroupObject[] | null;
};

type RootState = {
    group: GroupSliceState;
};

type LeaguesTabVariant = "standalone" | "embedded";

type GroupsTabProps = {
    variant?: LeaguesTabVariant;
};

const LeaguesTab = ({ variant = "standalone" }: GroupsTabProps) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const [page, setPage] = useState(1);
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinOpen, setJoinOpen] = useState(false);
    const [showScoringModal, setShowScoringModal] = useState(false);
    const { joinLoading, message, error, loading: groupLoading, myGroups, hasMore } = useSelector((state: RootState) => state.group);

    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
    }, [dispatch, currentUser]);

    useEffect(() => {
        if (!joinLoading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
            });
            setPage(1);
            dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
        }
        if (!joinLoading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
        }
        dispatch(clearJoinedGroupByInviteCodeMessage());
    }, [setToast, dispatch, joinLoading, message, error, router]);

    const sortedGroups = useMemo(() => {
        if (!Array.isArray(myGroups) || !myGroups.length) return [];

        const groups = myGroups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: GroupObject) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: GroupObject) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [myGroups, currentUser?.userId]);

    const openJoinModal = () => {
        setJoinOpen(true);
        setJoinError(null);
    };

    const closeJoinModal = () => {
        setJoinOpen(false);
        setJoinCode("");
        setJoinError(null);
    };

    const actionButtonClassName =
        "ui-accent-card group flex h-full w-full items-center justify-between gap-3 rounded-3xl border border-white/10 text-left shadow-sm transition";
    const actionIconClassName =
        "ui-accent-card-icon flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10";

    const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!currentUser) {
            router.push("/landing-page");
            return;
        }

        dispatch(joinedGroupByInviteCodeRequest({ invite_code: joinCode.trim() }));
        closeJoinModal();
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        dispatch(fetchMyGroupsRequest({ page: nextPage, limit: 10 }));
    };

    if (groupLoading && (!myGroups || page === 1)) {
        return <GroupsTabSkeleton />
    }

    return (
        <div className={`flex flex-col gap-4 ${variant === "embedded" ? "" : "text-white"}`}>
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
                <button
                    type="button"
                    onClick={() => router.push("/cag-form")}
                    className={`${actionButtonClassName} col-span-2 min-h-[88px] px-5 py-4 lg:col-span-1 lg:min-h-[88px]`}
                >
                    <p className="text-sm font-semibold text-white">Start a new group</p>
                    <span
                        className={actionIconClassName}
                        aria-hidden
                    >
                        <MembersIcon className="h-5 w-5 overflow-visible" />
                    </span>
                </button>
                <button
                    type="button"
                    onClick={openJoinModal}
                    className={`${actionButtonClassName} min-h-[72px] px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[88px]`}
                >
                    <p className="text-sm font-semibold text-white">Join a group</p>
                    <span
                        className={actionIconClassName}
                        aria-hidden
                    >
                        <RightArrowIcon className="h-5 w-5" />
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowScoringModal(true)}
                    className={`${actionButtonClassName} min-h-[72px] px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[88px]`}
                >
                    <p className="text-sm font-semibold text-white">Group scoring</p>
                    <span className={actionIconClassName} aria-hidden>
                        <InfoIcon />
                    </span>
                </button>
            </div>

            <div className="flex h-full flex-col gap-4">
                {sortedGroups.length === 0 ? (
                    <p className="text-sm text-gray-300">
                        no groups yet; start a League or join one with an invite code to get started.
                    </p>
                ) : (
                    sortedGroups.slice(0, 2).map((group) => {
                        const isCommissioner = group.created_by === currentUser?.userId;
                        return (
                            <div
                                key={group.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(`/league/${group.id}`)}
                                onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        router.push(`/league/${group.id}`);
                                    }
                                }}
                                className="relative flex h-full min-h-[128px] cursor-pointer flex-col rounded-[18px] border border-white/10 bg-white/[0.045] p-5 text-left shadow-lg shadow-black/25 transition hover:border-sky-400/50 hover:bg-white/[0.065] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300/70 sm:min-h-[136px] sm:p-6"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className={`flex min-w-0 flex-wrap items-center gap-1.5 text-gray-400 ${groupPreviewKickerTextClassName}`}
                                    >
                                        <GroupTypeMetaLabel
                                            group={group}
                                            ownerPlan={group.hosting_tier === "pro" ? "pro" : "free"}
                                            textClassName={groupPreviewKickerTextClassName}
                                        />
                                        <span aria-hidden className="text-gray-600">
                                            ·
                                        </span>
                                        <span className="text-gray-300">{isCommissioner ? "OWNER" : "MEMBER"}</span>
                                    </div>
                                    <InviteCodeCopy code={group?.invite_code} />
                                </div>
                                <div className="flex min-w-0 flex-1 items-center py-4">
                                    <h3
                                        className="allow-caps line-clamp-2 break-words text-xl font-extrabold leading-tight text-transparent bg-clip-text"
                                        style={displayNameGradientStyle}
                                    >
                                        {group.name}
                                    </h3>
                                </div>
                                <div
                                    className={`flex flex-wrap gap-2 text-gray-500 ${groupPreviewMetaTextClassName}`}
                                >
                                    <span>{getGroupCapacityLabel(group, group.member_count)}</span>
                                    {/* <span>{getActiveContestCountsLabel(group, group.active_contest)}</span> */}
                                    <span>
                                        {getCombinedContestCapacityLabel(
                                            group,
                                            [],
                                            []
                                        )}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {sortedGroups.length > 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {sortedGroups.slice(2).map((group) => {
                        const isCommissioner = group.created_by === currentUser?.userId;
                        return (
                            <div
                                key={group.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(`/league/${group.id}`)}
                                onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        router.push(`/league/${group.id}`);
                                    }
                                }}
                                className="relative flex h-full min-h-[128px] cursor-pointer flex-col rounded-[18px] border border-white/10 bg-white/[0.045] p-5 text-left shadow-lg shadow-black/25 transition hover:border-sky-400/50 hover:bg-white/[0.065] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300/70 sm:min-h-[136px] sm:p-6"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className={`flex min-w-0 flex-wrap items-center gap-1.5 text-gray-400 ${groupPreviewKickerTextClassName}`}
                                    >
                                        <GroupTypeMetaLabel
                                            group={group}
                                            ownerPlan={group.hosting_tier === "pro" ? "pro" : "free"}
                                            textClassName={groupPreviewKickerTextClassName}
                                        />
                                        <span aria-hidden className="text-gray-600">
                                            ·
                                        </span>
                                        <span className="text-gray-300">{isCommissioner ? "OWNER" : "MEMBER"}</span>
                                    </div>
                                    <InviteCodeCopy code={group?.invite_code} />
                                </div>
                                <div className="flex min-w-0 flex-1 items-center py-4">
                                    <h3
                                        className="allow-caps line-clamp-2 break-words text-xl font-extrabold leading-tight text-transparent bg-clip-text"
                                        style={displayNameGradientStyle}
                                    >
                                        {group.name}
                                    </h3>
                                </div>
                                <div
                                    className={`flex flex-wrap gap-2 text-gray-500 ${groupPreviewMetaTextClassName}`}
                                >
                                    <span>{getGroupCapacityLabel(group, group.member_count)}</span>
                                    {/* <span>{getActiveContestCountsLabel(group, group.active_contest)}</span> */}
                                    <span>
                                        {getCombinedContestCapacityLabel(
                                            group,
                                            [],
                                            []
                                        )}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={groupLoading}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {groupLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : null}
                        Show more
                    </button>
                </div>
            )}

            {joinOpen && (
                <ModalShell onClose={closeJoinModal} maxWidthClass="max-w-sm">
                    <form onSubmit={handleJoin} className="space-y-4 text-center">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">join a league or Arena</p>
                            <p className="text-lg font-semibold text-white">Enter invite code</p>
                        </div>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(event) => {
                                let value = event.target.value;
                                value = value.replace(/\D/g, "").slice(0, 5);
                                setJoinCode(value);
                                setJoinError(null);
                            }}
                            maxLength={5}
                            inputMode="numeric"
                            placeholder="invite code"
                            autoFocus
                            className="ui-input-accent w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-base text-white outline-none transition"
                        />
                        {joinError && <p className="text-xs font-semibold text-red-200">{joinError}</p>}
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeJoinModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ui-accent-button rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!joinCode || joinCode.length !== 5}
                            >
                                Join
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            <ScoringModal
                open={showScoringModal}
                onClose={() => setShowScoringModal(false)}
                variant="league"
            />
        </div>
    );
};

export default LeaguesTab;

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);