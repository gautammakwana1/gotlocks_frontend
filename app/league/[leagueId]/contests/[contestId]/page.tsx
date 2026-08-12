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
import { ContestBadgeCategory, ContestBadgeSettings, GroupSelector, Leaderboard, LeaderboardList, RootState, Slip } from "@/lib/interfaces/interfaces";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest, fetchGroupMembersByGroupIdRequest, fetchLeaderboardRequest } from "@/lib/redux/slices/groupsSlice";
import { archiveContestByIdRequest, clearArchiveContestByIdMessage, clearDeleteContestByIdMessage, deleteContestByIdRequest, excludeContestMemberRequest, fetchBadgeAwardsByContestIdRequest, fetchContestByIdRequest, resetBadgeSettingsRequest, toggleContestBadgesRequest, updateBadgeSettingsRequest, updateContestRequest } from "@/lib/redux/slices/contestSlice";
import { fetchAllFinalizedSlipsRequest, fetchAllOpenSlipsRequest, fetchAllReviewSlipsRequest } from "@/lib/redux/slices/slipSlice";
import LeaderboardGrid from "@/components/leaderboard/LeaderboardGrid";
import LeaderboardSkeleton from "@/components/skeletons/leagues/LeaderboardSkeleton";
import PlayersSkeleton from "@/components/skeletons/leagues/contest/PlayersSkeleton";
import BadgesSkeleton from "@/components/skeletons/leagues/contest/BadgeAwardSkeleton";
import { getAppliedBadgeSettings, getBadgePointValue, getDefaultEnabledBadgeIds } from "@/lib/contests/badges";
import ContestPageSkeleton from "@/components/skeletons/leagues/ContestPageSkeleton";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { canUseProLeagueScoringControls, isContestInLeague } from "@/lib/permissions/leaguePermissions";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";

const CONTEST_TABS = [
    { id: "standings", label: "Standings" },
    { id: "slips", label: "Slips" },
    { id: "badges", label: "Badges" },
    { id: "players", label: "Players" },
    { id: "settings", label: "Settings" },
] as const;

type ContestTabId = (typeof CONTEST_TABS)[number]["id"];
const contestSportLabels = (sports: string[]) => (sports.length > 1 ? ["Multi"] : sports);

/** The three beats of Capture the Badge, rendered as the hero's step rail. */
const BADGE_JOURNEY_STEPS = [
    {
        number: "01",
        title: "Win qualifying picks",
        description: "Finalized picks build your mark for each badge.",
    },
    {
        number: "02",
        title: "Own the best mark",
        description: "Beat the leader to take the badge. Ties leave it with the holder.",
    },
    {
        number: "03",
        title: "Score the bonus",
        description: "The current holder adds that badge's points to the standings.",
    },
] as const;

const getBadgeCategoryLabel = (category: string) =>
    category === "generic" ? "All sports" : category.toUpperCase();

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
    const plan = useUserPlan();
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
    const belongsToLeague = isContestInLeague(contest, league?.id);
    const canCustomizeBadgePoints = canUseProLeagueScoringControls({
        league,
        actor: currentUser,
        actorId: currentUser?.userId,
        sessionUserId: currentUser?.userId,
        plan: plan
    }).allowed;

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

    // Managers see every badge they could switch on; players only see the ones
    // already in play, so the same list drives the board and both hero counters.
    const badgeListDefinitions = (canManage ? manageableBadgeDefinitions : badgeDefinitions) ?? [];
    const visibleBadgeIds = new Set(badgeListDefinitions.map((definition) => definition.id));
    const activeBadgeCount = canManage
        ? badgeDraft?.enabled
            ? badgeListDefinitions.filter((definition) =>
                badgeDraft.enabledBadgeIds.includes(definition.id)
            ).length
            : 0
        : badgeDefinitions?.length ?? 0;
    const capturedBadgeCount = (badgeAwards ?? []).filter((award) =>
        visibleBadgeIds.has(award.definition.id)
    ).length;
    // A single-sport contest tints the medallions with that league's colour;
    // multi-sport contests stay on the generic amber tint.
    const badgeTintSport = contest.sports?.length === 1 ? contest.sports[0] : null;
    // Account-level plan, not the locally stored one `canCustomizeBadgePoints`
    // reads — this only supplies the offer name/price shown in the upsell.
    const proPlanView = getProLifetimePlanViewModel({
        plan: currentUser.plan,
        offerKind: currentUser.proLifetimeOfferKind,
        entitlement: currentUser.proLifetimeEntitlement,
    });
    const badgeUpgradeHref = `/app-settings/plan/league/upgrade?intent=customize-badges&leagueId=${encodeURIComponent(
        leagueId
    )}&contestId=${encodeURIComponent(contestId)}`;

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
        if (!badgeDraft || !contest.id) return;

        if (canCustomizeBadgePoints) {
            dispatch(updateBadgeSettingsRequest({
                contest_id: contest.id,
                settings: badgeDraft,
            }));
        } else {
            // Enable/disable and badge selection are free; only point VALUES are
            // Pro. `update-badge-settings` rejects a body that would move a point
            // value on a non-Pro plan, so posting the whole draft here — even with
            // points forced back to the default — would 403 the switches this plan
            // owns and quietly wipe values a Pro commissioner had set. The toggle
            // endpoint carries no point fields at all, so neither can happen.
            dispatch(toggleContestBadgesRequest({
                contest_id: contest.id,
                enabled: badgeDraft.enabled,
                badge_ids: badgeDraft.enabledBadgeIds,
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
            <header className="-mx-5 pb-4 pl-5 pr-2 sm:mx-0 sm:px-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <BackButton
                        fallback={`/league/${league.id}?tab=contests`}
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

            <section className="-mx-5 -mt-3 border-b border-white/10 px-1 pb-0 pt-2 sm:mx-0">
                <div
                    className="grid w-full items-end gap-1"
                    style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
                >
                    {visibleTabs.map((tab) => {
                        const isActive = activeContestTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveContestTab(tab.id)}
                                className={`relative flex h-10 min-w-0 items-center justify-center rounded-t-xl border border-b-0 px-1 text-center text-sm font-semibold transition-colors duration-200 ease-out sm:px-3 motion-reduce:transition-none ${isActive
                                    ? "border-white/10 bg-black text-sky-100 after:absolute after:-bottom-px after:inset-x-0 after:h-px after:bg-black after:content-['']"
                                    : "border-transparent bg-black text-gray-400 hover:border-white/10 hover:text-white"
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
                        <section className="space-y-7 sm:space-y-8">
                            <div className="relative overflow-hidden rounded-[28px] border border-sky-300/20 bg-[linear-gradient(145deg,rgba(14,165,233,0.16),rgba(15,23,42,0.72)_48%,rgba(0,0,0,0.92))] shadow-[0_24px_70px_rgba(2,132,199,0.12)]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl"
                                />
                                <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:p-8">
                                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
                                        <BadgeIcon
                                            category="generic"
                                            sport={badgeTintSport}
                                            alt="Capture the Badge medallion"
                                            className="h-16 w-16 sm:h-20 sm:w-20"
                                            priority
                                        />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                                                Contest challenge
                                            </p>
                                            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                                                Capture the Badge
                                            </h2>
                                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                                                Every badge rewards a different kind of winning. Set the strongest
                                                qualifying mark, hold off the field, and add the badge bonus to your
                                                contest score.
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-5 lg:min-w-64 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                                        <div className="pr-4">
                                            <dt className="text-xs font-medium text-slate-400">Active badges</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-white">{activeBadgeCount}</dd>
                                        </div>
                                        <div className="pl-4">
                                            <dt className="text-xs font-medium text-slate-400">Captured now</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-white">{capturedBadgeCount}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <ol className="relative grid border-t border-white/10 bg-black/20 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
                                    {BADGE_JOURNEY_STEPS.map((step) => (
                                        <li key={step.number} className="flex gap-3 px-5 py-4 sm:px-6 sm:py-5">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-300/30 bg-sky-500/10 text-xs font-semibold text-sky-100">
                                                {step.number}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{step.title}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {canManage && badgeDraft && (
                                <section
                                    aria-labelledby="badge-controls-title"
                                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                                                Commissioner controls
                                            </p>
                                            <h3 id="badge-controls-title" className="mt-1 text-xl font-semibold text-white">
                                                Shape the badge race
                                            </h3>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                                Choose what is in play, then save once. {hasFinalizedSlips
                                                    ? "Because scoring has started, saving will recalculate badge holders and standings."
                                                    : "Changes take effect immediately until the first contest slip is finalized."}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeDraft.enabled
                                                ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100"
                                                : "border-white/10 bg-white/[0.03] text-slate-400"
                                                }`}
                                        >
                                            <span
                                                aria-hidden
                                                className={`h-2 w-2 rounded-full ${badgeDraft.enabled ? "bg-emerald-300" : "bg-slate-600"
                                                    }`}
                                            />
                                            {badgeDraft.enabled ? "Badge play on" : "Badge play off"}
                                        </span>
                                    </div>

                                    <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-white/10">
                                        <div className="flex items-center justify-between gap-5 border-b border-white/10 px-5 py-5 sm:border-b-0 sm:px-6">
                                            <div>
                                                <p className="text-base font-semibold text-white">Badge system</p>
                                                <p className="mt-1 text-sm leading-5 text-slate-400">
                                                    Turn the entire badge challenge on or off.
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
                                                aria-label={badgeDraft.enabled ? "Turn badge play off" : "Turn badge play on"}
                                                aria-pressed={badgeDraft.enabled}
                                                className={`relative h-11 w-[72px] shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 ${badgeDraft.enabled
                                                    ? "border-sky-300/60 bg-sky-500/35"
                                                    : "border-white/15 bg-black/60"
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-1.5 h-8 w-8 rounded-full bg-white shadow-md transition-all ${badgeDraft.enabled ? "left-[34px]" : "left-1.5"}`}
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-5 px-5 py-5 sm:px-6">
                                            <div>
                                                <p className="text-base font-semibold text-white">Default badge value</p>
                                                <p className="mt-1 text-sm leading-5 text-slate-400">
                                                    Used unless a badge has its own value.
                                                </p>
                                            </div>
                                            {canCustomizeBadgePoints ? (
                                                <label className="shrink-0">
                                                    <span className="sr-only">Default badge points</span>
                                                    <span className="flex min-h-11 items-center rounded-xl border border-white/15 bg-black/45 px-3 focus-within:border-sky-300/70">
                                                        <span className="mr-1 text-lg text-sky-200">+</span>
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
                                                            className="w-16 bg-transparent text-xl font-semibold text-white outline-none"
                                                        />
                                                        <span className="text-xs text-slate-400">pts</span>
                                                    </span>
                                                </label>
                                            ) : (
                                                <div className="shrink-0 text-right">
                                                    <p className="text-2xl font-semibold text-white">+{badgeDraft.defaultPoints}</p>
                                                    <p className="text-xs font-medium text-amber-200">Fixed on Free</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <p className="text-xs leading-5 text-slate-500">
                                            Enable/disable controls are included on Free. Pro is only required to change
                                            point values.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleResetBadgeSettings}
                                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                            >
                                                Reset all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveBadgeSettings}
                                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-300/50 bg-sky-500/25 px-5 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                                            >
                                                Save settings
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {canManage && !canCustomizeBadgePoints && (
                                <aside
                                    aria-labelledby="badge-pro-title"
                                    className="relative overflow-hidden rounded-3xl border border-sky-300/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(30,41,59,0.48)_52%,rgba(0,0,0,0.8))] p-5 sm:p-6"
                                >
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl"
                                    />
                                    <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.8fr)] lg:gap-10">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-sky-200/25 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">
                                                    {proPlanView.offer.name}
                                                </span>
                                                <span className="text-sm font-semibold text-white">
                                                    {proPlanView.offer.priceLabel} once
                                                </span>
                                            </div>
                                            <h3 id="badge-pro-title" className="mt-4 text-xl font-semibold text-white sm:text-2xl">
                                                Set the score, badge by badge.
                                            </h3>
                                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                                                On Free, you can turn badge play on or off and choose which badges
                                                count — only the point values stay locked. Pro Lifetime unlocks a
                                                custom contest default and individual values for any contest you
                                                organize.
                                            </p>
                                            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-sky-100">
                                                <li className="flex items-center gap-2">
                                                    <span aria-hidden>✓</span> Permanent account unlock
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span aria-hidden>✓</span> No League subscription
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span aria-hidden>✓</span> Applies to every League you own
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                                            <p className="text-sm font-semibold text-white">What happens next</p>
                                            <ol className="mt-3 space-y-3 text-sm leading-5 text-slate-300">
                                                <li className="flex gap-3">
                                                    <span className="font-semibold text-sky-200">1</span>
                                                    Review the one-time price and everything Pro includes.
                                                </li>
                                                <li className="flex gap-3">
                                                    <span className="font-semibold text-sky-200">2</span>
                                                    Confirm the unlock. Pro activates as soon as payment clears.
                                                </li>
                                                <li className="flex gap-3">
                                                    <span className="font-semibold text-sky-200">3</span>
                                                    Return here and edit the default or any badge value.
                                                </li>
                                            </ol>
                                            <Link
                                                href={badgeUpgradeHref}
                                                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-200/55 bg-sky-500/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                                            >
                                                Review {proPlanView.offer.priceLabel} one-time upgrade
                                                <span aria-hidden className="ml-2">→</span>
                                            </Link>
                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                One-time payment. No subscription and nothing to renew.
                                            </p>
                                        </div>
                                    </div>
                                </aside>
                            )}

                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                                        Badge board
                                    </p>
                                    <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                                        {canManage ? "Choose what is in play" : "The marks to beat"}
                                    </h3>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                        {canManage
                                            ? "Include the challenges that fit this contest. Point changes are saved with the rest of your badge settings."
                                            : "See who holds each active badge and the mark needed to take it."}
                                    </p>
                                </div>
                                <p className="text-sm font-medium text-slate-300">
                                    <span className="text-white">{activeBadgeCount}</span> of {badgeListDefinitions.length} active
                                </p>
                            </div>

                            {!canManage && !appliedBadgeSettings?.enabled ? (
                                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-10 text-center sm:px-8">
                                    <p className="text-lg font-semibold text-white">Badge play is off</p>
                                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
                                        The commissioner has not enabled Capture the Badge for this contest.
                                    </p>
                                </div>
                            ) : badgeListDefinitions.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-10 text-center sm:px-8">
                                    <p className="text-lg font-semibold text-white">No eligible badges yet</p>
                                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
                                        Badges appear here when this contest has an eligible sport or qualifying activity.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {badgeListDefinitions.map((definition) => {
                                        const award = (badgeAwards ?? []).find(
                                            (candidate) => candidate.definition.id === definition.id
                                        );
                                        const draftEnabled = badgeDraft?.enabledBadgeIds.includes(definition.id) ?? false;
                                        const badgeSystemEnabled = canManage
                                            ? Boolean(badgeDraft?.enabled)
                                            : Boolean(appliedBadgeSettings?.enabled);
                                        const badgeEnabledForDraft = canManage ? draftEnabled : true;
                                        const cardDisabled = canManage && (!badgeSystemEnabled || !badgeEnabledForDraft);
                                        // A Free commissioner cannot edit point values, but the
                                        // values they cannot edit are still the contest's real
                                        // ones — saving through the toggle endpoint leaves them
                                        // untouched — so never show the built-in default here.
                                        const displayedPoints =
                                            canManage && badgeDraft
                                                ? getBadgePointValue(badgeDraft, definition.id)
                                                : appliedBadgeSettings
                                                    ? getBadgePointValue(appliedBadgeSettings, definition.id)
                                                    : 0;
                                        const hasOverride =
                                            badgeDraft?.badgePointOverrides[definition.id] !== undefined;
                                        const holderName = award?.profile?.username ?? "Member";

                                        return (
                                            <article
                                                key={definition.id}
                                                className={`relative flex min-h-full flex-col overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025)_55%,rgba(0,0,0,0.35))] p-5 transition sm:p-6 ${definition.display.borderClass} ${definition.display.glowClass}`}
                                            >
                                                <div
                                                    aria-hidden
                                                    className={`pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl ${cardDisabled ? "opacity-30" : ""
                                                        }`}
                                                />
                                                <div className="relative flex items-start gap-4 sm:gap-5">
                                                    <span className={cardDisabled ? "opacity-45 grayscale" : ""}>
                                                        <BadgeIcon
                                                            category={definition.category as ContestBadgeCategory}
                                                            sport={badgeTintSport}
                                                            alt={definition.name}
                                                            className="h-16 w-16"
                                                        />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <h4 className="text-lg font-semibold leading-tight text-white sm:text-xl">
                                                                {definition.name}
                                                            </h4>
                                                            <span className="shrink-0 text-sm font-semibold text-sky-100">
                                                                +{displayedPoints} pts
                                                            </span>
                                                        </div>
                                                        <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.12em] ${definition.display.toneClass}`}>
                                                            {getBadgeCategoryLabel(definition.category)} · {definition.display.subtitle}
                                                        </p>
                                                        <p className="mt-3 text-sm leading-6 text-slate-300">
                                                            {definition.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {canManage && badgeDraft && (
                                                    <div className="relative mt-5">
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
                                                            disabled={!badgeSystemEnabled}
                                                            aria-label={`${draftEnabled ? "Exclude" : "Include"} ${definition.name} badge`}
                                                            aria-pressed={draftEnabled}
                                                            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:opacity-45 ${draftEnabled
                                                                ? "border-sky-300/40 bg-sky-500/10 text-sky-50"
                                                                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-white"
                                                                }`}
                                                        >
                                                            <span
                                                                aria-hidden
                                                                className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${draftEnabled
                                                                    ? "border-sky-200/50 bg-sky-400/20 text-sky-100"
                                                                    : "border-white/15 text-transparent"
                                                                    }`}
                                                            >
                                                                ✓
                                                            </span>
                                                            {!badgeSystemEnabled
                                                                ? "System off"
                                                                : draftEnabled
                                                                    ? "Included"
                                                                    : "Excluded"}
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="relative mt-5 border-t border-white/10 pt-4">
                                                    {award ? (
                                                        <>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                                Current holder
                                                            </p>
                                                            <div className="mt-2 flex items-baseline justify-between gap-3">
                                                                <p className="min-w-0 truncate text-base font-semibold text-white">
                                                                    {holderName}
                                                                </p>
                                                                <p className="shrink-0 text-sm font-semibold text-sky-100">
                                                                    {award.valueLabel}
                                                                </p>
                                                            </div>
                                                            <p className="mt-2 text-sm leading-5 text-slate-400">
                                                                Beat {award.markToBeatLabel} to take it. A tie leaves the badge with
                                                                the current holder.
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                                Unclaimed
                                                            </p>
                                                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                                                No qualifying mark yet. Be the first player to capture it.
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {canManage && canCustomizeBadgePoints && badgeDraft && (
                                                    <div className="relative mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
                                                        <label className="block">
                                                            <span className="text-xs font-medium text-slate-400">Badge value</span>
                                                            <span className="mt-1 flex min-h-11 w-32 items-center rounded-xl border border-white/15 bg-black/35 px-3 focus-within:border-sky-300/70">
                                                                <span className="mr-1 text-sky-200">+</span>
                                                                <NumberInput
                                                                    min={0}
                                                                    max={1000}
                                                                    value={displayedPoints}
                                                                    aria-label={`${definition.name} points`}
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
                                                                    className="w-full bg-transparent text-base font-semibold text-white outline-none"
                                                                />
                                                                <span className="text-xs text-slate-500">pts</span>
                                                            </span>
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
                                                            aria-label={`Use default points for ${definition.name}`}
                                                            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35"
                                                        >
                                                            Use default
                                                        </button>
                                                    </div>
                                                )}
                                            </article>
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
