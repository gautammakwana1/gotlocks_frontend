"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SlipCategorySection } from "@/components/slips/SlipCategorySection";
import BackButton from "@/components/ui/BackButton";
import NumberInput from "@/components/ui/NumberInput";
import { formatDateTime } from "@/lib/utils/date";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { ContestBadgeSettings, GroupSelector, Leaderboard, LeaderboardList, RootState, Slip } from "@/lib/interfaces/interfaces";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest, fetchGroupMembersByGroupIdRequest, fetchLeaderboardRequest } from "@/lib/redux/slices/groupsSlice";
import { archiveContestByIdRequest, clearArchiveContestByIdMessage, clearDeleteContestByIdMessage, deleteContestByIdRequest, excludeContestMemberRequest, fetchBadgeAwardsByContestIdRequest, fetchContestByIdRequest, resetBadgeSettingsRequest, updateBadgeSettingsRequest, updateContestRequest } from "@/lib/redux/slices/contestSlice";
import { fetchAllFinalizedSlipsRequest, fetchAllOpenSlipsRequest, fetchAllReviewSlipsRequest } from "@/lib/redux/slices/slipSlice";
import LeaderboardGrid from "@/components/leaderboard/LeaderboardGrid";
import LeaderboardSkeleton from "@/components/skeletons/leagues/LeaderboardSkeleton";
import PlayersSkeleton from "@/components/skeletons/leagues/contest/PlayersSkeleton";
import BadgesSkeleton from "@/components/skeletons/leagues/contest/BadgeAwardSkeleton";
import { getAppliedBadgeSettings, getBadgePointValue, getDefaultEnabledBadgeIds } from "@/lib/contests/badges";
import ContestPageSkeleton from "@/components/skeletons/leagues/ContestPageSkeleton";

const CONTEST_TABS = [
    { id: "standings", label: "Standings" },
    { id: "slips", label: "Slips" },
    { id: "badges", label: "Badges" },
    { id: "players", label: "Players" },
    { id: "settings", label: "Settings" },
] as const;

type ContestTabId = (typeof CONTEST_TABS)[number]["id"];
const contestSportLabels = (sports: string[]) => (sports.length > 1 ? ["Multi"] : sports);

const generateDeleteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
};

const ContestDetailPage = () => {
    const params = useParams<{ leagueId: string; contestId: string }>();
    const leagueId = params.leagueId as string;
    const contestId = params.contestId as string;
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const router = useRouter();
    const [activeContestTab, setActiveContestTab] = useState<ContestTabId>("standings");
    const [editStartsAt, setEditStartsAt] = useState("");
    const [editEndsAt, setEditEndsAt] = useState("");
    const [editBadgesEnabled, setEditBadgesEnabled] = useState(false);
    const [leaderboardList, setLeaderboardList] = useState<Leaderboard[]>([]);
    const [leaderboardSlipsList, setLeaderboardSlipsList] = useState<Slip[]>([]);
    const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);
    const [openPage, setOpenPage] = useState(1);
    const [reviewPage, setReviewPage] = useState(1);
    const [finalPage, setFinalPage] = useState(1);
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [activeLeaderboardId, setActiveLeaderboardId] = useState<string | null>(null);
    const [badgeDraft, setBadgeDraft] = useState<ContestBadgeSettings | null>(null);
    const [showBadgeSaveConfirm, setShowBadgeSaveConfirm] = useState(false);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
    const [deleteCodeInput, setDeleteCodeInput] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingContest, setDeletingContest] = useState(false);

    const {
        group: league,
        loading,
        leaderboard: leaderboardData,
        leaderboardList: leaderboardListData,
        loadingLeaderboard,
        hasMoreLeaderboard,
        members: leagueMembers,
        loadingMembers,
        membersPagination,
    } = useSelector((state: GroupSelector) => state.group);
    const { contest, loading: contestLoader, error: contestError, message: contestMessage, badgeAwards, badgeDefinitions, manageableBadgeDefinitions, badgeLoading } = useSelector((state: RootState) => state.contest);
    const { openSlips, reviewSlips, finalizeSlips, hasMoreFinalizes, hasMoreOpens, hasMoreReviews } = useSelector((state: RootState) => state.slip);

    const isCommissioner = Boolean(currentUser && league && currentUser.userId === league.created_by);
    const isCreator = Boolean(currentUser && contest && currentUser.userId === contest.created_by);
    const canManage = isCommissioner || isCreator;

    useEffect(() => {
        if (!leagueId || !contestId || !currentUser) return;

        dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
        dispatch(fetchContestByIdRequest({ contest_id: contestId }));
    }, [leagueId, contestId, currentUser, dispatch]);

    useEffect(() => {
        if (!contest) return;
        setEditStartsAt(contest.starts_at);
        setEditEndsAt(contest.ends_at);
        setEditBadgesEnabled(Boolean(contest.badges_enabled));
        setBadgeDraft(getAppliedBadgeSettings(contest));
    }, [contest]);

    useEffect(() => {
        if ((activeContestTab === "slips" || activeContestTab === "settings") && league?.id && contest?.id) {
            dispatch(fetchAllOpenSlipsRequest({ group_id: league?.id, contest_id: contest?.id, page: 1, limit: 12 }));
            dispatch(fetchAllReviewSlipsRequest({ group_id: league?.id, contest_id: contest?.id, page: 1, limit: 12 }));
            dispatch(fetchAllFinalizedSlipsRequest({ group_id: league?.id, contest_id: contest?.id, page: 1, limit: 12 }));
        }
    }, [league?.id, contest?.id, activeContestTab, dispatch]);

    useEffect(() => {
        if (!leagueId) return;
        if (activeContestTab === "standings") {
            dispatch(fetchAllLeaderboardsRequest({ group_id: leagueId }));
        }
    }, [dispatch, leagueId, activeContestTab]);

    useEffect(() => {
        if (!contestId) return;
        if (activeContestTab === "badges" && contest?.badges_enabled) {
            dispatch(fetchBadgeAwardsByContestIdRequest({ contest_id: contestId }));
        }
    }, [dispatch, contestId, activeContestTab, contest?.badges_enabled]);

    useEffect(() => {
        if (!leagueId) return;
        if (activeContestTab === "players") {
            dispatch(
                fetchGroupMembersByGroupIdRequest({
                    group_id: leagueId,
                    page: 1,
                    limit: 12,
                })
            );
        }
    }, [leagueId, activeContestTab, dispatch]);

    useEffect(() => {
        if (Array.isArray(leaderboardData?.leaderboard)) {
            setLeaderboardList(leaderboardData?.leaderboard)
        }
        if (Array.isArray(leaderboardData?.slips)) {
            setLeaderboardSlipsList(leaderboardData?.slips)
        }
        if (Array.isArray(leaderboardListData)) {
            setLeaderboardDataList(leaderboardListData)
        }
    }, [leaderboardData?.leaderboard, leaderboardListData, leaderboardData?.slips]);

    useEffect(() => {
        if (deletingContest) return;
        if (!contestLoader && contestMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: contestMessage,
                duration: 3000
            });
            dispatch(clearArchiveContestByIdMessage());
        }
        if (!contestLoader && contestError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: contestError,
                duration: 3000
            });
            dispatch(clearArchiveContestByIdMessage());
        }
    }, [dispatch, setToast, contestLoader, contestError, contestMessage, deletingContest]);

    useEffect(() => {
        if (activeContestTab === "settings" && canManage && !deleteConfirmCode) {
            setDeleteConfirmCode(generateDeleteCode());
        }
    }, [activeContestTab, canManage, deleteConfirmCode]);

    useEffect(() => {
        if (!deletingContest || contestLoader) return;
        if (contestMessage) {
            setToast({ id: Date.now(), type: "success", message: contestMessage, duration: 3000 });
            dispatch(clearDeleteContestByIdMessage());
            setDeletingContest(false);
            router.push(`/league/${leagueId}`);
        } else if (contestError) {
            setToast({ id: Date.now(), type: "error", message: contestError, duration: 3000 });
            dispatch(clearDeleteContestByIdMessage());
            setDeletingContest(false);
        }
    }, [deletingContest, contestLoader, contestMessage, contestError, dispatch, setToast, router, leagueId]);

    const groupLeaderboards = useMemo(
        () => leaderboardDataList.filter((board) => board.group_id === league?.id),
        [league?.id, leaderboardDataList]
    );

    const activeLeaderboards = useMemo(
        () => groupLeaderboards.filter((board) => board.status === "ACTIVE"),
        [groupLeaderboards]
    );

    const activeMainLeaderboard = useMemo(
        () => activeLeaderboards.find((board) => board.isDefault) ?? null,
        [activeLeaderboards]
    );

    useEffect(() => {
        if (
            league?.id &&
            contest?.id &&
            activeLeaderboardId &&
            activeContestTab === "standings"
        ) {
            setLeaderboardPage(1);
            dispatch(fetchLeaderboardRequest({
                groupId: league?.id,
                contest_id: contest?.id,
                leaderboard_id: activeLeaderboardId,
                page: 1,
                limit: 5
            }));
        }
    }, [league?.id, contest?.id, activeLeaderboardId, activeContestTab, dispatch]);

    useEffect(() => {
        if (activeContestTab === "standings") {
            const defaultLeaderboard = groupLeaderboards.find((l) => l.isDefault && l.status === "ACTIVE")
            if (defaultLeaderboard?.id) {
                setActiveLeaderboardId(defaultLeaderboard?.id)
            }
        }
        setLeaderboardPage(1);
    }, [groupLeaderboards, activeContestTab]);

    const members = useMemo(() => leagueMembers ?? [], [leagueMembers]);

    const handleLoadMore = () => {
        if (!leagueId || !membersPagination || loadingMembers) return;
        if (membersPagination.page >= membersPagination.total_pages) return;

        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: leagueId,
                page: membersPagination.page + 1,
                limit: 12,
            })
        );
    };
    const appliedBadgeSettings = contest ? getAppliedBadgeSettings(contest) : null;
    const hasFinalizedSlips = finalizeSlips && finalizeSlips?.length > 0;

    const visibleTabs = CONTEST_TABS.filter((tab) => {
        if (tab.id === "settings") return canManage;
        if (tab.id === "badges") return Boolean(appliedBadgeSettings?.enabled) || canManage;
        return true;
    });
    const activeContestTabIndex = Math.max(
        0,
        visibleTabs.findIndex((tab) => tab.id === activeContestTab)
    );

    useEffect(() => {
        if (
            (!canManage && activeContestTab === "settings") ||
            (!appliedBadgeSettings?.enabled && !canManage && activeContestTab === "badges")
        ) {
            setActiveContestTab("standings");
        }
    }, [activeContestTab, canManage, appliedBadgeSettings?.enabled]);

    if (!league || !contest || !currentUser) return null;

    const isArchived = contest.status === "ARCHIVED";
    const hasOpenSlips = ((openSlips?.length ?? 0) + (reviewSlips?.length ?? 0)) > 0;

    const handleSlipSelect = (slipId?: string) => {
        if (!league || !slipId) return;
        const slipOpen = openSlips?.find(
            (slip) => slip.id === slipId
        );

        const slipInReview = reviewSlips?.find(
            (slip) => slip.id === slipId
        );

        const finalSlip = finalizeSlips?.find(
            (slip) => slip.id === slipId
        );

        if (!slipOpen && !slipInReview && !finalSlip) return;
        const basePath = `/league/${league.id}/slips/${slipId}`;

        if (finalSlip?.status === "final") {
            router.push(`${basePath}/results`);
            return;
        }
        router.push(basePath);
    };

    const handleArchive = () => {
        if (!contestId) return;

        if (!canManage) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Only Commissioner OR contest creator can archive this contest.",
                duration: 3000
            })
        }

        if (contest.status !== "ACTIVE") {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Contest already archived!",
                duration: 3000
            });
        }

        if (hasOpenSlips) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "finalize all your open slip to archive this contest.",
                duration: 3000
            });
        }

        dispatch(archiveContestByIdRequest({ contest_id: contestId }));
    };

    const handleDeleteContest = () => {
        if (!contestId) return;

        if (!canManage) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Only Commissioner OR contest creator can delete this contest.",
                duration: 3000
            });
            return;
        }

        if (!deleteConfirmCode || deleteCodeInput !== deleteConfirmCode) return;

        setShowDeleteConfirm(false);
        setDeletingContest(true);
        setDeleteCodeInput("");
        dispatch(deleteContestByIdRequest({ contest_id: contestId }));
    };

    const handleToggleExcluded = (memberId: string) => {
        if (!contestId || !memberId) return;

        if (!canManage) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Only Commissioner OR contest creator can exclude the members.",
                duration: 3000
            });
        }

        if (contest.status !== "ACTIVE") {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Contest archived!",
                duration: 3000
            });
        }

        dispatch(excludeContestMemberRequest({ contest_id: contestId, user_id: memberId }));
    };

    const handleSaveContestSettings = () => {
        if (!contestId || !canManage) return;
        if (contest.starts_at === editStartsAt && contest.ends_at === editEndsAt && contest.badges_enabled === editBadgesEnabled) return;

        dispatch(updateContestRequest({
            contest_id: contestId,
            starts_at: editStartsAt,
            ends_at: editEndsAt
        }));
    };

    const persistBadgeSettings = () => {
        if (!badgeDraft) return;
        if (badgeDraft && contest.id) {
            dispatch(updateBadgeSettingsRequest({
                contest_id: contest.id,
                settings: badgeDraft
            }));
        }
        setShowBadgeSaveConfirm(false);
    };

    const handleSaveBadgeSettings = () => {
        if (!badgeDraft) return;
        if (hasFinalizedSlips) {
            setShowBadgeSaveConfirm(true);
            return;
        }
        persistBadgeSettings();
    };

    const handleResetBadgeSettings = () => {
        if (contest.id) {
            dispatch(resetBadgeSettingsRequest({ contest_id: contest.id }));
        }
    };

    const handleLoadMoreOpen = () => {
        if (!league?.id || !contest?.id) return;
        const nextPage = openPage + 1;
        setOpenPage(nextPage);
        dispatch(fetchAllOpenSlipsRequest({ group_id: league.id, contest_id: contest.id, page: nextPage, limit: 12 }));
    };

    const handleLoadMoreReview = () => {
        if (!league?.id || !contest?.id) return;
        const nextPage = reviewPage + 1;
        setReviewPage(nextPage);
        dispatch(fetchAllReviewSlipsRequest({ group_id: league.id, contest_id: contest.id, page: nextPage, limit: 12 }));
    };

    const handleLoadMoreFinal = () => {
        if (!league?.id || !contest?.id) return;
        const nextPage = finalPage + 1;
        setFinalPage(nextPage);
        dispatch(fetchAllFinalizedSlipsRequest({ group_id: league.id, contest_id: contest.id, page: nextPage, limit: 12 }));
    };

    const handleLoadMoreLeaderboard = () => {
        if (!league?.id || !contest?.id || !activeLeaderboardId) return;
        const nextPage = leaderboardPage + 1;
        setLeaderboardPage(nextPage);
        dispatch(fetchLeaderboardRequest({
            groupId: league.id,
            contest_id: contest.id,
            leaderboard_id: activeLeaderboardId,
            page: nextPage,
            limit: 5
        }));
    };

    const isInitialLoading = loading || contestLoader;

    if (isInitialLoading) {
        return <ContestPageSkeleton />;
    }

    return (
        <div className="flex flex-col gap-2 pb-10">
            <header className="-mx-5 border-b border-white/10 pl-5 pr-2 pb-3 sm:mx-0 sm:px-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <BackButton
                        fallback={`/league/${league.id}`}
                        preferFallback
                        className="shrink-0 py-1"
                    />
                    <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <span className="rounded-full bg-white/5 px-2 py-1">
                            {formatDateTime(contest.starts_at)} to {formatDateTime(contest.ends_at)}
                        </span>
                        {contestSportLabels(contest.sports).map((sport) => (
                            <span key={sport} className="rounded-full bg-white/5 px-2 py-1">
                                {sport}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="mt-2.5 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
                    <span className="min-w-0 max-w-[45%] truncate text-gray-400">
                        {league.name}
                    </span>
                    <span className="shrink-0 text-gray-600">/</span>
                    <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white sm:text-lg">
                        {contest.name}
                    </h1>
                </div>
            </header>

            <section className="-mx-5 -mt-1 border-b border-white/10 px-5 sm:mx-0 sm:px-0">
                <div
                    className="relative grid w-full gap-1 py-1"
                    style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
                >
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-1 left-0 rounded-lg border border-white/10 bg-white/[0.08] transition-transform duration-300 ease-out"
                        style={{
                            width: `calc(100% / ${visibleTabs.length})`,
                            transform: `translateX(${activeContestTabIndex * 100}%)`,
                        }}
                    />
                    {visibleTabs.map((tab) => {
                        const isActive = activeContestTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveContestTab(tab.id)}
                                className={`relative z-10 flex h-9 min-w-0 items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:text-xs ${isActive ? "text-white" : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                <span className="truncate">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {activeContestTab === "standings" && (
                <section>
                    {loadingLeaderboard ? (
                        <LeaderboardSkeleton key={activeLeaderboardId} />
                    ) : (
                        <LeaderboardGrid
                            group={league}
                            leaderboard={leaderboardList}
                            leaderboardId={activeLeaderboardId ?? ""}
                            leaderboardName={activeMainLeaderboard?.name ?? "Main Leaderboard"}
                            currentUserId={currentUser?.userId}
                            leaderboardSlips={leaderboardSlipsList}
                            onLoadMore={handleLoadMoreLeaderboard}
                            hasMore={hasMoreLeaderboard}
                            loadingMore={loadingLeaderboard}
                            isArchived={false}
                            archivedLeaderboardSlips={[]}
                            contestName={contest.name}
                        />
                    )}
                </section>
            )}

            {activeContestTab === "slips" && (
                <section className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                                Contest slips
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Slips stay inside this contest&apos;s dates and sports.
                            </p>
                        </div>
                        {canManage && !isArchived && (
                            <Link
                                href={`/league/${league.id}/contests/${contest.id}/slips/create`}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                            >
                                Add slip
                            </Link>
                        )}
                    </div>
                    <SlipCategorySection
                        title="open for picks"
                        slips={openSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreOpen}
                        layout="grid"
                        emptyCopy="No open slips in this contest."
                        hasMore={hasMoreOpens}
                    />
                    <SlipCategorySection
                        title="in review"
                        slips={reviewSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreReview}
                        layout="grid"
                        emptyCopy="No contest slips are in review."
                        hasMore={hasMoreReviews}
                    />
                    <SlipCategorySection
                        title="finalized"
                        slips={finalizeSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreFinal}
                        layout="grid"
                        emptyCopy="No finalized contest slips yet."
                        hasMore={hasMoreFinalizes}
                    />
                </section>
            )}

            {activeContestTab === "badges" && (
                <>
                    {badgeLoading ? (
                        <BadgesSkeleton />
                    ) : (
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                                            Capture the badge
                                        </h2>
                                        <p className="mt-1 max-w-3xl text-xs text-gray-500">
                                            Capture badges by owning the best mark in a contest. Badge points count toward the standings, and another player has to beat your mark to take the badge.
                                        </p>
                                        {canManage && (
                                            <p className="mt-2 text-xs text-gray-600">
                                                {hasFinalizedSlips
                                                    ? "Saving badge changes after scoring starts updates badge awards and leaderboard standings."
                                                    : "Badge changes apply immediately until the first contest slip is finalized."}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {canManage && badgeDraft && (
                                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1fr_auto]">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_11rem]">
                                            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/25 px-4 py-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                                                        Badge system
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Turn Capture the Badge on or off for this contest.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setBadgeDraft((current) => {
                                                            if (!current) return current;

                                                            const enabled = !current.enabled;

                                                            return {
                                                                ...current,
                                                                enabled,
                                                                enabledBadgeIds:
                                                                    enabled && current.enabledBadgeIds.length === 0
                                                                        ? getDefaultEnabledBadgeIds(contest)
                                                                        : current.enabledBadgeIds,
                                                            };
                                                        })
                                                    }
                                                    aria-pressed={badgeDraft.enabled}
                                                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition-all duration-300 ${badgeDraft.enabled
                                                        ? "border-sky-300/60 bg-sky-500/30"
                                                        : "border-white/15 bg-black/60"
                                                        }`}
                                                >
                                                    <span
                                                        className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${badgeDraft.enabled ? "left-6" : "left-1"}`}
                                                    />
                                                </button>
                                            </div>
                                            <label className="block rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                Default points
                                                <NumberInput
                                                    min={0}
                                                    max={1000}
                                                    value={badgeDraft.defaultPoints}
                                                    onValueChange={(nextPoints) =>
                                                        setBadgeDraft((current) =>
                                                            current
                                                                ? {
                                                                    ...current,
                                                                    defaultPoints: nextPoints,
                                                                }
                                                                : current
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white outline-none transition focus:border-sky-400/70"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleSaveBadgeSettings}
                                                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                                            >
                                                Save settings
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleResetBadgeSettings}
                                                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/25"
                                            >
                                                Reset all
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!canManage && !appliedBadgeSettings?.enabled ? (
                                <div className="rounded-lg border border-white/10 bg-black/40 p-5 text-sm text-gray-400">
                                    Badge play is off for this contest.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {(canManage
                                        ? manageableBadgeDefinitions ?? []
                                        : badgeDefinitions ?? []
                                    ).map((definition) => {
                                        const award = (badgeAwards ?? []).find(
                                            (candidate) => candidate.definition.id === definition.id
                                        );
                                        const draftEnabled = badgeDraft?.enabledBadgeIds.includes(definition.id) ?? false;
                                        const badgeSystemEnabled = canManage
                                            ? Boolean(badgeDraft?.enabled)
                                            : Boolean(appliedBadgeSettings?.enabled);
                                        const badgeEnabledForDraft = canManage ? draftEnabled : true;
                                        const cardDisabled = canManage && (!badgeSystemEnabled || !badgeEnabledForDraft);
                                        const displayedPoints =
                                            canManage && badgeDraft
                                                ? getBadgePointValue(badgeDraft, definition.id)
                                                : appliedBadgeSettings
                                                    ? getBadgePointValue(appliedBadgeSettings, definition.id)
                                                    : 0;
                                        const hasOverride =
                                            badgeDraft?.badgePointOverrides[definition.id] !== undefined;

                                        return (
                                            <div
                                                key={definition.id}
                                                className={`rounded-xl border bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] p-4 transition ${definition.display.borderClass} ${definition.display.glowClass} ${cardDisabled ? "opacity-55" : ""
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 gap-3">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-xs font-semibold uppercase ${definition.display.toneClass}`}>
                                                            {definition.display.icon.slice(0, 2)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-white">
                                                                {definition.name}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                                                {definition.category} · {definition.display.subtitle}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {definition.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                                        <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                                                            +{displayedPoints}
                                                        </span>
                                                        {canManage && badgeDraft && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setBadgeDraft((current) => {
                                                                        if (!current) return current;
                                                                        const ids = new Set(current.enabledBadgeIds);
                                                                        if (ids.has(definition.id)) ids.delete(definition.id);
                                                                        else ids.add(definition.id);
                                                                        return { ...current, enabledBadgeIds: Array.from(ids) };
                                                                    })
                                                                }
                                                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${draftEnabled
                                                                    ? "border-sky-300/40 text-sky-100"
                                                                    : "border-white/10 text-gray-500"
                                                                    }`}
                                                            >
                                                                {draftEnabled ? "on" : "off"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-2 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                                                    {award ? (
                                                        <>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="truncate text-sm font-semibold text-white">
                                                                    {award.profile?.username ?? "Member"}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-gray-400">
                                                                    {award.valueLabel}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500">
                                                                Mark to beat: {award.markToBeatLabel}
                                                            </p>
                                                            <p className="text-[11px] text-gray-600">
                                                                Tied the mark, but ties do not capture the badge.
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">
                                                            No holder yet. Be the first to capture it.
                                                        </p>
                                                    )}
                                                </div>

                                                {canManage && badgeDraft && (
                                                    <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-white/10 pt-3">
                                                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                                            Points
                                                            <NumberInput
                                                                min={0}
                                                                max={1000}
                                                                value={displayedPoints}
                                                                onValueChange={(nextPoints) =>
                                                                    setBadgeDraft((current) =>
                                                                        current
                                                                            ? {
                                                                                ...current,
                                                                                badgePointOverrides: {
                                                                                    ...current.badgePointOverrides,
                                                                                    [definition.id]: nextPoints,
                                                                                },
                                                                            }
                                                                            : current
                                                                    )
                                                                }
                                                                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white outline-none transition focus:border-sky-400/70"
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setBadgeDraft((current) => {
                                                                    if (!current) return current;
                                                                    const nextOverrides = { ...current.badgePointOverrides };
                                                                    delete nextOverrides[definition.id];
                                                                    return { ...current, badgePointOverrides: nextOverrides };
                                                                })
                                                            }
                                                            disabled={!hasOverride}
                                                            className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}

            {activeContestTab === "players" && (
                <>
                    {loadingMembers ? (
                        <PlayersSkeleton />
                    ) : (
                        <section className="space-y-4">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                                    Players
                                </h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Removing a player keeps them in the group but excludes them from this contest.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {members.map((member) => {
                                    if (!member?.user_id) return;

                                    const excluded = contest.excluded_member_ids.includes(member.user_id);
                                    const showButton =
                                        member.user_id !== league.created_by &&
                                        member.user_id !== contest.created_by;
                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">
                                                    {member.profiles?.username ?? "Member"}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    {excluded ? "excluded from standings" : "eligible"}
                                                </p>
                                            </div>
                                            {canManage && showButton && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (member.user_id) {
                                                            handleToggleExcluded(member.user_id)
                                                        }
                                                    }}
                                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-sky-300/60 hover:text-white"
                                                >
                                                    {excluded ? "restore" : "remove"}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {membersPagination && membersPagination.page < membersPagination.total_pages && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        type="button"
                                        onClick={handleLoadMore}
                                        disabled={loadingMembers}
                                        className="rounded-full border border-sky-500/30 bg-sky-500/10 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-sky-100 transition hover:border-sky-400/60 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loadingMembers ? "Loading..." : "Show more players"}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}

            {activeContestTab === "settings" && canManage && (
                <section className="space-y-7">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                                Contest settings
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Update contest dates. Badge rules live in the Badges tab.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DateTimeWheelPicker
                                label="Starts"
                                value={editStartsAt}
                                onChange={setEditStartsAt}
                                className="min-w-0"
                            />
                            <DateTimeWheelPicker
                                label="Ends"
                                value={editEndsAt}
                                onChange={setEditEndsAt}
                                className="min-w-0"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveContestSettings}
                            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                        >
                            Save settings
                        </button>
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-5">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                                Contest controls
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Archived contests remain readable but cannot accept new slips or picks.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleArchive}
                            disabled={isArchived || hasOpenSlips || contestLoader}
                            className="rounded-lg border border-red-300/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Archive contest
                        </button>
                        {hasOpenSlips && !isArchived && (
                            <p className="text-xs text-amber-200">
                                Finalize all contest slips before archiving.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-5">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                                Delete contest
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Permanently removes this contest and its slips. This cannot be undone. Type the code
                                below exactly to enable the delete button.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                    Confirmation code
                                </span>
                                <div className="ml-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-base font-semibold tracking-[0.3em] text-red-200 select-none">
                                    {deleteConfirmCode}
                                </div>
                            </div>
                        </div>
                        <label className="block min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                            Enter code to confirm
                            <input
                                type="text"
                                value={deleteCodeInput}
                                onChange={(event) => setDeleteCodeInput(event.target.value.toUpperCase())}
                                placeholder={"confirmation code"}
                                autoComplete="off"
                                spellCheck={false}
                                className="mt-1.5 block w-full rounded-lg border border-white/10 bg-black px-4 py-2.5 font-mono text-sm tracking-[0.2em] normal-case text-white outline-none transition placeholder:tracking-normal placeholder:text-gray-600 focus:border-red-400/70"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={!deleteConfirmCode || deleteCodeInput !== deleteConfirmCode || contestLoader || deletingContest}
                            className="rounded-lg border border-red-300/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete contest
                        </button>
                    </div>
                </section>
            )}
            {showBadgeSaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-black p-5 shadow-2xl">
                        <h2 className="text-base font-semibold text-white">Save badge settings?</h2>
                        <p className="mt-3 text-sm text-gray-300">
                            This will update badge awards and leaderboard standings for finalized contest slips. Player rankings may change.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowBadgeSaveConfirm(false)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/25"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={persistBadgeSettings}
                                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                            >
                                Save settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setShowDeleteConfirm(false);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-black p-5 shadow-2xl">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
                            Danger zone
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-white">Delete this contest?</h2>
                        <p className="mt-3 text-sm text-gray-300">
                            <span className="font-semibold text-white">{contest.name}</span> and all of its slips will be
                            permanently deleted. This action cannot be undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/25"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteContest}
                                disabled={contestLoader || deletingContest}
                                className="rounded-lg border border-red-400/50 bg-gradient-to-br from-red-500/40 via-red-600/35 to-red-700/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-50 shadow-[0_8px_28px_-16px_rgba(239,68,68,0.9)] transition hover:from-red-500/50 hover:via-red-600/45 hover:to-red-700/40 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {deletingContest ? "Deleting…" : "Delete contest"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContestDetailPage;
