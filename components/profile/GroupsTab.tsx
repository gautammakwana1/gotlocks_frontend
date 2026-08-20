"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { ArenaState, Group, GroupObject, GroupType } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearJoinedGroupByInviteCodeMessage, fetchMyGroupsRequest, joinedGroupByInviteCodeRequest } from "@/lib/redux/slices/groupsSlice";
import { fetchArenaGroupsRequest } from "@/lib/redux/slices/arenaSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import ScoringModal from "../modals/ScoringModal";
import { InfoIcon, MembersIcon, RightArrowIcon } from "../ui/SvgIcons";
import GroupsTabSkeleton from "../skeletons/fantasy/GroupsTabSkeleton";
import { getActiveContestCountsLabel, getCombinedContestCapacityLabel, getGroupCapacityLabel, getGroupTypeLabel, getHostingTierLabel, PLAN_LIMITS } from "@/lib/groups/limits";
import { groupPreviewKickerTextClassName, groupPreviewMetaTextClassName, GroupTypeMetaLabel } from "../group/GroupPreviewChip";
import InviteCodeCopy from "../group/InviteCodeCopy";
import { getGroupPath } from "@/lib/utils/profileNavigation";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import PlanMenuCard from "../billing/PlanMenuCard";
import ProLifetimeUpgradeFlow from "../billing/ProLifetimeUpgradeFlow";
import { useUserPlan } from "@/lib/plan/useUserPlan";

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
    joinedGroup: { group_id: string; group_type?: GroupType } | null;
};

type RootState = {
    group: GroupSliceState;
    arena: ArenaState;
};

type LeaguesTabVariant = "standalone" | "embedded";

type GroupsTabProps = {
    variant?: LeaguesTabVariant;
    scope?: "leagues" | "arenas";
};

const LeaguesTab = ({ variant = "standalone", scope = "leagues" }: GroupsTabProps) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const userPlan = useUserPlan();
    const [page, setPage] = useState(1);
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinOpen, setJoinOpen] = useState(false);
    const [showScoringModal, setShowScoringModal] = useState(false);
    const [proUpgradeOpen, setProUpgradeOpen] = useState(false);
    const [proUpgradeIntent, setProUpgradeIntent] = useState<
        "plan" | "create_league" | null
    >(null);
    const startGroupButtonRef = useRef<HTMLButtonElement>(null);
    const planCardActionRef = useRef<HTMLButtonElement>(null);
    const createLeagueIntentHandledRef = useRef(false);

    const { joinLoading, message, error, loading: groupLoading, myGroups, hasMore, joinedGroup } = useSelector((state: RootState) => state.group);
    const { arenaGroups, arenaGroupsLoading, arenaGroupsHasMore } = useSelector(
        (state: RootState) => state.arena
    );

    // Scope-aware list source: the Leagues tab keeps reading the group slice
    // exactly as before; the Arenas tab reads the arena slice, fed by the
    // dedicated GET /group/arena endpoint (same response contract).
    const isArenaScope = scope === "arenas";
    const scopedGroups = isArenaScope ? arenaGroups : myGroups;
    const scopedLoading = isArenaScope ? arenaGroupsLoading : groupLoading;
    const scopedHasMore = isArenaScope ? arenaGroupsHasMore : hasMore;

    useEffect(() => {
        if (!currentUser) return;
        if (isArenaScope) {
            dispatch(fetchArenaGroupsRequest({ page: 1, limit: 10 }));
        } else {
            dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
        }
    }, [dispatch, currentUser, isArenaScope]);

    useEffect(() => {
        if (!joinLoading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
            });
            setPage(1);
            // Cross-scope join: both lists are type-filtered, so a community
            // of the other type can never appear in this tab. Open it directly
            // instead of refreshing a list it won't be in. Only fires when the
            // backend reports the joined type — otherwise fall through to the
            // unchanged refresh path.
            const joinedType = joinedGroup?.group_type;
            if (
                joinedGroup?.group_id &&
                joinedType &&
                (joinedType === "arena") !== isArenaScope
            ) {
                dispatch(clearJoinedGroupByInviteCodeMessage());
                router.push(getGroupPath(joinedType, joinedGroup.group_id));
                return;
            }
            // Refresh the list this tab is actually showing.
            if (isArenaScope) {
                dispatch(fetchArenaGroupsRequest({ page: 1, limit: 10 }));
            } else {
                dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
            }
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
    }, [setToast, dispatch, joinLoading, message, error, router, isArenaScope, joinedGroup]);

    const sortedGroups = useMemo(() => {
        if (!Array.isArray(scopedGroups) || !scopedGroups.length) return [];

        const groups = scopedGroups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: GroupObject) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: GroupObject) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [scopedGroups, currentUser?.userId]);

    const ownedLeagueCount = useMemo(
        () => (currentUser ? sortedGroups.filter(g => g.created_by === currentUser.userId).length : 0),
        [currentUser, sortedGroups]
    );

    const ownedLeagueLimit = currentUser
        ? PLAN_LIMITS[userPlan ?? "free"].maxOwnedLeagues
        : PLAN_LIMITS.free.maxOwnedLeagues;
    const leagueLimitReached = ownedLeagueCount >= ownedLeagueLimit;
    const planView = useMemo(
        () =>
            currentUser
                ? getProLifetimePlanViewModel({
                    plan: userPlan ?? currentUser.plan,
                    offerKind: currentUser?.proLifetimeOfferKind,
                    entitlement: currentUser?.proLifetimeEntitlement,
                })
                : null,
        [currentUser]
    );

    const openJoinModal = () => {
        setJoinOpen(true);
        setJoinError(null);
    };

    const closeJoinModal = () => {
        setJoinOpen(false);
        setJoinCode("");
        setJoinError(null);
    };

    const openProUpgrade = (intent: "plan" | "create_league") => {
        setProUpgradeIntent(intent);
        setProUpgradeOpen(true);
    };

    const closeProUpgrade = () => {
        const continueToLeagueCreation =
            proUpgradeIntent === "create_league" && userPlan === "pro";
        setProUpgradeOpen(false);
        setProUpgradeIntent(null);
        if (continueToLeagueCreation) {
            router.push("/cag-form?type=league");
        }
    };

    const handleStartGroup = () => {
        if (scope === "arenas") {
            router.push("/cag-form?type=arena");
            return;
        }
        if (!currentUser) {
            router.replace("/landing-page");
            return;
        }
        if (!leagueLimitReached) {
            router.push("/cag-form?type=league");
            return;
        }
        if (userPlan === "free") {
            setProUpgradeIntent("create_league");
            setProUpgradeOpen(true);
            return;
        }
        setToast({
            id: Date.now(),
            type: "error",
            message: `Pro users can host up to ${ownedLeagueLimit} leagues.`,
            duration: 3000
        });
    };

    useEffect(() => {
        if (
            scope !== "leagues" ||
            searchParams.get("intent") !== "create-league" ||
            createLeagueIntentHandledRef.current ||
            !currentUser
        ) {
            return;
        }

        createLeagueIntentHandledRef.current = true;
        router.replace("/fantasy");
        if (!leagueLimitReached) {
            router.push("/cag-form?type=league");
            return;
        }
        if (userPlan === "free") {
            setProUpgradeIntent("create_league");
            setProUpgradeOpen(true);
            return;
        }
        setToast({
            id: Date.now(),
            type: "error",
            message: `Pro users can host up to ${ownedLeagueLimit} leagues.`,
            duration: 3000
        });
    }, [
        currentUser,
        userPlan,
        leagueLimitReached,
        ownedLeagueLimit,
        router,
        scope,
        searchParams,
        setToast,
    ]);

    const actionButtonClassName =
        "group flex h-full w-full items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.045] text-left shadow-sm transition hover:border-white/20 hover:bg-white/[0.065]";
    const actionIconClassName =
        "flex h-9 w-9 items-center justify-center text-gray-300 transition-colors group-hover:text-white sm:h-10 sm:w-10";
    const groupCardClassName =
        "ui-accent-card relative flex h-full min-h-[128px] cursor-pointer flex-col rounded-[18px] border border-white/10 p-5 text-left shadow-lg shadow-black/25 transition sm:min-h-[136px] sm:p-6";

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
        if (isArenaScope) {
            dispatch(fetchArenaGroupsRequest({ page: nextPage, limit: 10 }));
        } else {
            dispatch(fetchMyGroupsRequest({ page: nextPage, limit: 10 }));
        }
    };

    if (scopedLoading && (!scopedGroups || page === 1)) {
        return <GroupsTabSkeleton />
    }

    return (
        <div className={`flex flex-col gap-4 ${variant === "embedded" ? "" : "text-white"}`}>
            <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">your communities</p>
                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                    {scope === "arenas" ? "Arenas" : "Leagues"}
                </h1>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
                <button
                    ref={startGroupButtonRef}
                    type="button"
                    // Carry the tab's type into the create form so "Start a new
                    // arena" doesn't open with League preselected.
                    onClick={handleStartGroup}
                    className={`${actionButtonClassName} col-span-2 min-h-[88px] px-5 py-4 lg:col-span-1 lg:min-h-[88px]`}
                >
                    <span>
                        <span className="block text-sm font-semibold text-white">
                            {scope === "arenas" ? "Create a new arena" : "Start a new league"}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-400">
                            {scope === "arenas"
                                ? "$50 one-time unlock required before creation."
                                : leagueLimitReached
                                    ? userPlan === "free"
                                        ? "Upgrade to Pro to host more leagues."
                                        : "You have reached the Pro hosting limit."
                                    : `${ownedLeagueCount}/${ownedLeagueLimit} owned League slots used.`}
                        </span>
                    </span>
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
                    <p className="text-sm font-semibold text-white">
                        Join {scope === "arenas" ? "an arena" : "a league"}
                    </p>
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
                    <p className="text-sm font-semibold text-white">{scope === "arenas" ? "Arena" : "League"} scoring</p>
                    <span className={actionIconClassName} aria-hidden>
                        <InfoIcon />
                    </span>
                </button>
            </div>

            {scope === "leagues" && planView ? (
                <PlanMenuCard
                    planView={planView}
                    ownedLeagueCount={ownedLeagueCount}
                    ownedLeagueLimit={ownedLeagueLimit}
                    onUpgrade={() => openProUpgrade("plan")}
                    onViewDetails={() => router.push("/app-settings/plan")}
                    actionRef={planCardActionRef}
                />
            ) : null}

            <div className="flex h-full flex-col gap-4">
                {sortedGroups.length === 0 ? (
                    <p className="text-sm text-gray-300">
                        No {scope} yet; start one or join with an invite code to get started.
                    </p>
                ) : (
                    sortedGroups.slice(0, 2).map((group) => {
                        const isCommissioner = group.created_by === currentUser?.userId;
                        return (
                            <div
                                key={group.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(getGroupPath(group.group_type, group.id))}
                                onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        router.push(getGroupPath(group.group_type, group.id));
                                    }
                                }}
                                className={groupCardClassName}
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
                                        <span className="text-gray-300">
                                            {isCommissioner
                                                ? "OWNER"
                                                : group.current_user_member?.role === "manager"
                                                    ? "MANAGER"
                                                    : "MEMBER"}
                                        </span>
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
                                onClick={() => router.push(getGroupPath(group.group_type, group.id))}
                                onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        router.push(getGroupPath(group.group_type, group.id));
                                    }
                                }}
                                className={groupCardClassName}
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
                                        <span className="text-gray-300">
                                            {isCommissioner
                                                ? "OWNER"
                                                : group.current_user_member?.role === "manager"
                                                    ? "MANAGER"
                                                    : "MEMBER"}
                                        </span>
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

            {scopedHasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={scopedLoading}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {scopedLoading ? (
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
                variant={scope === "arenas" ? "arena" : "league"}
            />

            {scope === "leagues" ? (
                <ProLifetimeUpgradeFlow
                    open={proUpgradeOpen}
                    onClose={closeProUpgrade}
                    returnFocusRef={
                        proUpgradeIntent === "create_league"
                            ? startGroupButtonRef
                            : planCardActionRef
                    }
                />
            ) : null}
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