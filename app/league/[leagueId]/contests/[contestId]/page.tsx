"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SlipCategorySection } from "@/components/slips/SlipCategorySection";
import {
    ContestDetailHeader,
    ContestDetailTabBar,
} from "@/components/contests/ContestDetailHeader";
import { fantasyContestArtwork } from "@/components/contests/preview/fantasyContestPreview";
import { formatDateTime } from "@/lib/utils/date";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { ContestBadgeCategory, ContestBadgeSettings, GroupSelector, Leaderboard, LeaderboardList, RootState, Slip } from "@/lib/interfaces/interfaces";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest, fetchGroupMembersByGroupIdRequest, fetchLeaderboardRequest } from "@/lib/redux/slices/groupsSlice";
import { archiveContestByIdRequest, clearArchiveContestByIdMessage, clearDeleteContestByIdMessage, deleteContestByIdRequest, excludeContestMemberRequest, fetchBadgeAwardsByContestIdRequest, fetchContestByIdRequest, toggleContestBadgesRequest, updateBadgeSettingsRequest, updateContestRequest } from "@/lib/redux/slices/contestSlice";
import { fetchAllFinalizedSlipsRequest, fetchAllOpenSlipsRequest, fetchAllReviewSlipsRequest } from "@/lib/redux/slices/slipSlice";
import LeaderboardGrid from "@/components/leaderboard/LeaderboardGrid";
import LeaderboardSkeleton from "@/components/skeletons/leagues/LeaderboardSkeleton";
import PlayersSkeleton from "@/components/skeletons/leagues/contest/PlayersSkeleton";
import BadgesSkeleton from "@/components/skeletons/leagues/contest/BadgeAwardSkeleton";
import { createDefaultContestBadgeSettings, getAppliedBadgeSettings, getBadgeMinimumLabel, getBadgePointValue, getDefaultEnabledBadgeIds } from "@/lib/contests/badges";
import ContestPageSkeleton from "@/components/skeletons/leagues/ContestPageSkeleton";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { canUseProLeagueScoringControls, isContestInLeague } from "@/lib/permissions/leaguePermissions";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS, eligibleWindowEnd } from "@/lib/utils/games";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { useUserPlan } from "@/lib/plan/useUserPlan";

/* The server’s own bounds for a contest name — validateTextField(name,
 * "Contest name", { min: 4, max: 25 }) inside updateContest. */
const CONTEST_NAME_MIN = 4;
const CONTEST_NAME_MAX = 25;

const CONTEST_TABS = [
    { id: "standings", label: "Standings" },
    { id: "slips", label: "Slips" },
    { id: "badges", label: "Badges" },
    { id: "players", label: "Players" },
    { id: "settings", label: "Settings" },
] as const;

type ContestTabId = (typeof CONTEST_TABS)[number]["id"];
const FANTASY_CONTEST_TAB_CONTENT_CLASS_NAME = "pt-4";
const contestSportLabels = (sports: string[]) => (sports.length > 1 ? ["Multi"] : sports);

const BADGE_CATEGORY_ORDER: ContestBadgeCategory[] = [
    "generic",
    "football",
    "nba",
    "mlb",
    "nhl",
    "soccer",
];

type BadgeCategoryTheme = {
    activeCardClass: string;
    color: string;
    disabledCardClass: string;
    label: string;
    markerClass: string;
    palette: string;
    selectedTabClass: string;
};

/**
 * Each badge family owns a colour. The board reads these instead of the
 * `display.*` classes the API ships on a definition, so a card's tint stays
 * stable even when the server catalogue changes its artwork metadata.
 */
const BADGE_CATEGORY_THEMES: Record<ContestBadgeCategory, BadgeCategoryTheme> = {
    generic: {
        activeCardClass:
            "border-[#38BDF8]/25 bg-gradient-to-br from-[#38BDF8]/[0.16] via-[#38BDF8]/[0.045] to-black/10",
        color: "#38BDF8",
        disabledCardClass:
            "border-[#38BDF8]/10 bg-gradient-to-br from-[#38BDF8]/[0.055] via-[#38BDF8]/[0.015] to-black/10",
        label: "General",
        markerClass: "bg-[#38BDF8]",
        palette: "general-blue",
        selectedTabClass: "text-[#38BDF8]",
    },
    football: {
        activeCardClass:
            "border-[#C58A4A]/30 bg-gradient-to-br from-[#C58A4A]/[0.17] via-[#C58A4A]/[0.045] to-black/10",
        color: "#C58A4A",
        disabledCardClass:
            "border-[#C58A4A]/10 bg-gradient-to-br from-[#C58A4A]/[0.055] via-[#C58A4A]/[0.015] to-black/10",
        label: "Football",
        markerClass: "bg-[#C58A4A]",
        palette: "football-bronze",
        selectedTabClass: "text-[#C58A4A]",
    },
    nba: {
        activeCardClass:
            "border-[#D96832]/30 bg-gradient-to-br from-[#D96832]/[0.17] via-[#D96832]/[0.045] to-black/10",
        color: "#D96832",
        disabledCardClass:
            "border-[#D96832]/10 bg-gradient-to-br from-[#D96832]/[0.055] via-[#D96832]/[0.015] to-black/10",
        label: "Basketball",
        markerClass: "bg-[#D96832]",
        palette: "basketball-orange",
        selectedTabClass: "text-[#D96832]",
    },
    mlb: {
        activeCardClass:
            "border-[#B44D5E]/30 bg-gradient-to-br from-[#B44D5E]/[0.16] via-[#B44D5E]/[0.045] to-black/10",
        color: "#B44D5E",
        disabledCardClass:
            "border-[#B44D5E]/10 bg-gradient-to-br from-[#B44D5E]/[0.05] via-[#B44D5E]/[0.015] to-black/10",
        label: "Baseball",
        markerClass: "bg-[#B44D5E]",
        palette: "baseball-oxblood",
        selectedTabClass: "text-[#CB6D7B]",
    },
    nhl: {
        activeCardClass:
            "border-[#87929E]/30 bg-gradient-to-br from-[#87929E]/[0.16] via-[#87929E]/[0.04] to-black/10",
        color: "#87929E",
        disabledCardClass:
            "border-[#87929E]/10 bg-gradient-to-br from-[#87929E]/[0.05] via-[#87929E]/[0.015] to-black/10",
        label: "Hockey",
        markerClass: "bg-[#87929E]",
        palette: "hockey-graphite",
        selectedTabClass: "text-[#87929E]",
    },
    soccer: {
        activeCardClass:
            "border-[#45996A]/30 bg-gradient-to-br from-[#45996A]/[0.16] via-[#45996A]/[0.045] to-black/10",
        color: "#45996A",
        disabledCardClass:
            "border-[#45996A]/10 bg-gradient-to-br from-[#45996A]/[0.05] via-[#45996A]/[0.015] to-black/10",
        label: "Soccer",
        markerClass: "bg-[#45996A]",
        palette: "soccer-forest",
        selectedTabClass: "text-[#45996A]",
    },
};

/** The three beats of Capture the Badge, shown on the non-Pro upsell card. */
const BADGE_UNLOCK_STEPS = [
    {
        label: "Play",
        description:
            "Make your picks as usual—we track wins, streaks, odds, and props automatically.",
    },
    {
        label: "Capture",
        description:
            "When your tracked result becomes the best in the contest, you earn a badge.",
    },
    {
        label: "Score",
        description:
            "A badge adds its listed points to your Rank unless another member beats your result and steals it.",
    },
] as const;

const BADGE_BOARD_DESCRIPTIONS = {
    staff: {
        on: "Choose which badges are active and set the default Rank points awarded for each one. You can customize individual badge values or turn badge play off at any time.",
        off: "Turn on badge play to add bonus challenges to this Fantasy Contest. Once enabled, you can choose which badges are active and control the Rank points each badge is worth.",
    },
    member: {
        on: "Compete for badges by leading specific categories across finalized picks. Each badge you hold earns bonus points toward your Fantasy Contest Rank.",
        off: "Badge play is currently off. When enabled, members can compete for badges across finalized picks and earn bonus points toward Rank.",
    },
} as const;

const haveSameBadgeSettings = (
    left: ContestBadgeSettings | null,
    right: ContestBadgeSettings | null,
) => {
    if (left === right) return true;
    if (!left || !right) return false;
    if (left.enabled !== right.enabled || left.defaultPoints !== right.defaultPoints) {
        return false;
    }

    const leftEnabledIds = new Set(left.enabledBadgeIds);
    if (
        leftEnabledIds.size !== new Set(right.enabledBadgeIds).size ||
        right.enabledBadgeIds.some((id) => !leftEnabledIds.has(id))
    ) {
        return false;
    }

    const overrideIds = new Set([
        ...Object.keys(left.badgePointOverrides),
        ...Object.keys(right.badgePointOverrides),
    ]);
    return Array.from(overrideIds).every(
        (id) =>
            (left.badgePointOverrides[id] ?? left.defaultPoints) ===
            (right.badgePointOverrides[id] ?? right.defaultPoints),
    );
};

/** Where a blocked navigation wants to go once the draft is discarded. */
type PendingBadgeExit =
    | { type: "tab"; tab: ContestTabId }
    | { type: "back" }
    | { type: "href"; href: string };

type CompactBadgePointsControlProps = {
    badgeName: string;
    hasOverride: boolean;
    onChange: (value: number) => void;
    onReset: () => void;
    resetLabel?: string;
    value: number;
};

/**
 * The unboxed points stepper: a reset arrow, the editable value and a `pts`
 * unit on the top line, with the −/+ buttons tucked underneath. Sized to drop
 * into the reserved right-hand rail of a badge card or the board header.
 */
const CompactBadgePointsControl = ({
    badgeName,
    hasOverride,
    onChange,
    onReset,
    resetLabel,
    value,
}: CompactBadgePointsControlProps) => (
    <div
        className="relative w-full"
        data-badge-points-controls
        data-badge-points-layout="typographic-stepper"
        data-badge-points-style="unboxed"
    >
        <div
            aria-label={`${badgeName} points editor`}
            className="flex h-10 w-full flex-col items-stretch justify-center sm:h-12"
            data-badge-points-stepper
            role="group"
        >
            <div
                className="grid h-5 grid-cols-[repeat(3,1.25rem)] justify-center sm:h-6 sm:grid-cols-[repeat(3,1.5rem)] lg:grid-cols-[repeat(3,1.6875rem)]"
                data-badge-points-label-position="top-line"
                data-badge-points-value-line
            >
                <button
                    type="button"
                    onClick={onReset}
                    disabled={!hasOverride}
                    aria-label={resetLabel ?? `Use default points for ${badgeName}`}
                    title={resetLabel ?? "Use default points"}
                    className={`inline-flex h-5 w-5 items-center justify-center transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-20 sm:h-6 sm:w-6 ${hasOverride ? "text-sky-100/75 hover:text-white" : "text-slate-600"
                        }`}
                    data-badge-points-reset
                    data-badge-points-reset-position="before-value"
                    data-badge-points-unit="standard"
                >
                    <svg
                        aria-hidden
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                        fill="none"
                        viewBox="0 0 16 16"
                    >
                        <path
                            d="M3.2 6.2A5 5 0 1 1 3.6 11M3.2 6.2V2.8m0 3.4h3.4"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.4"
                        />
                    </svg>
                </button>
                <input
                    type="number"
                    min={0}
                    value={value}
                    aria-label={`${badgeName} points`}
                    onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
                    className="h-5 w-5 min-w-0 appearance-none bg-transparent text-center text-[13px] font-semibold leading-none tabular-nums text-white outline-none sm:h-6 sm:w-6 sm:text-[15px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    data-badge-points-unit="standard"
                />
                <span
                    className="inline-flex h-5 w-5 items-center justify-end text-[6px] font-semibold uppercase tracking-[0.08em] text-sky-100/50 sm:h-6 sm:w-6 sm:text-[7px]"
                    data-badge-points-edge="increase"
                    data-badge-points-unit="standard"
                >
                    pts
                </span>
            </div>
            <div
                className="grid h-5 grid-cols-[repeat(3,1.25rem)] justify-center sm:h-6 sm:grid-cols-[repeat(3,1.5rem)] lg:grid-cols-[repeat(3,1.6875rem)]"
                data-badge-points-actions
            >
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    disabled={value === 0}
                    aria-label={`Decrease ${badgeName} points`}
                    className="col-start-2 flex h-5 w-5 items-center justify-center text-[15px] font-light leading-none text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-25 sm:h-6 sm:w-6 sm:text-[17px]"
                    data-badge-points-unit="standard"
                >
                    <span aria-hidden>−</span>
                </button>
                <button
                    type="button"
                    onClick={() => onChange(value + 1)}
                    aria-label={`Increase ${badgeName} points`}
                    className="col-start-3 flex h-5 w-5 items-center justify-end text-[15px] font-light leading-none text-sky-100/80 transition hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-white sm:h-6 sm:w-6 sm:text-[17px]"
                    data-badge-points-edge="increase"
                    data-badge-points-unit="standard"
                >
                    <span aria-hidden>+</span>
                </button>
            </div>
        </div>
    </div>
);

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
    const [editName, setEditName] = useState("");
    const [editEndsAt, setEditEndsAt] = useState("");
    const [leaderboardList, setLeaderboardList] = useState<Leaderboard[]>([]);
    const [leaderboardSlipsList, setLeaderboardSlipsList] = useState<Slip[]>([]);
    const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);
    const [openPage, setOpenPage] = useState(1);
    const [reviewPage, setReviewPage] = useState(1);
    const [finalPage, setFinalPage] = useState(1);
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [activeLeaderboardId, setActiveLeaderboardId] = useState<string | null>(null);
    const [selectedBadgeCategory, setSelectedBadgeCategory] =
        useState<ContestBadgeCategory>("generic");
    const [badgeDraft, setBadgeDraft] = useState<ContestBadgeSettings | null>(null);
    const [savedBadgeSettings, setSavedBadgeSettings] =
        useState<ContestBadgeSettings | null>(null);
    const [badgeSettingsConfirmation, setBadgeSettingsConfirmation] = useState<
        "disable" | "save" | null
    >(null);
    const [pendingBadgeExit, setPendingBadgeExit] =
        useState<PendingBadgeExit | null>(null);
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
        setEditName(contest.name);
        setEditEndsAt(contest.ends_at);
        // The draft and its saved baseline both reset off the persisted
        // settings, so an in-flight save that comes back committed clears the
        // dirty state instead of leaving the board looking unsaved.
        const applied = getAppliedBadgeSettings(contest);
        setBadgeDraft(applied);
        setSavedBadgeSettings(applied);
        setBadgeSettingsConfirmation(null);
        setPendingBadgeExit(null);
    }, [contest]);

    useEffect(() => {
        setSelectedBadgeCategory("generic");
    }, [contestId]);

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

    /*
     * The board is keyed on the CONTEST alone now.
     *
     * `/group/contest-leaderboard/:contest_id` serves one Main Leaderboard per
     * contest, so the old `activeLeaderboardId` gate is gone — waiting on the
     * leaderboard-list read before firing this one only delayed the board.
     */
    useEffect(() => {
        if (league?.id && contest?.id && activeContestTab === "standings") {
            setLeaderboardPage(1);
            dispatch(fetchLeaderboardRequest({
                groupId: league?.id,
                contest_id: contest?.id,
                page: 1,
                limit: 5
            }));
        }
    }, [league?.id, contest?.id, activeContestTab, dispatch]);

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
    // `finalizeSlips` only loads on the Slips/Settings tabs, so on the Badges
    // tab the contest's own counter is the reliable half of this check.
    const hasFinalizedSlips =
        (finalizeSlips?.length ?? 0) > 0 ||
        (contest?.slips_count?.finalized_count ?? 0) > 0;

    /**
     * Capture the Badge is a PRO League feature. The MVP gates the whole tab on
     * `league.hostingTier === "pro"` and shows an unlock card otherwise; the same
     * fact rides on `hosting_tier` here. Editing point VALUES needs the account's
     * own Pro entitlement on top, because `update-badge-settings` rejects a point
     * move from a non-Pro account.
     */
    const badgeFeatureEntitled = league?.hosting_tier === "pro";
    const canManageBadges = badgeFeatureEntitled && canManage;
    const canMutateBadgeSettings = canManageBadges && contest?.status !== "ARCHIVED";
    const hasUnsavedBadgeChanges =
        canMutateBadgeSettings &&
        !haveSameBadgeSettings(badgeDraft, savedBadgeSettings);

    const visibleTabs = CONTEST_TABS.filter((tab) => {
        if (tab.id === "settings") return canManage;
        return true;
    });

    useEffect(() => {
        if (!canManage && activeContestTab === "settings") {
            setActiveContestTab("standings");
        }
    }, [activeContestTab, canManage]);

    useEffect(() => {
        if (!hasUnsavedBadgeChanges) return;

        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = true;
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [hasUnsavedBadgeChanges]);

    useEffect(() => {
        if (!hasUnsavedBadgeChanges) return;

        // Next's <Link> never unmounts the page through the router events we
        // could hook, so the draft is protected by catching the click itself.
        const guardSoftLinkNavigation = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                !(event.target instanceof Element)
            ) {
                return;
            }

            const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
            if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) {
                return;
            }

            const destination = new URL(anchor.href, window.location.href);
            if (destination.origin !== window.location.origin) return;
            if (
                destination.pathname === window.location.pathname &&
                destination.search === window.location.search &&
                destination.hash === window.location.hash
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setPendingBadgeExit({
                type: "href",
                href: `${destination.pathname}${destination.search}${destination.hash}`,
            });
        };

        document.addEventListener("click", guardSoftLinkNavigation, true);
        return () =>
            document.removeEventListener("click", guardSoftLinkNavigation, true);
    }, [hasUnsavedBadgeChanges]);

    if (!league || !contest || !currentUser) return null;

    const isArchived = contest.status === "ARCHIVED";
    // The contest header's state tint + timing chip. A Fantasy contest's terminal
    // state in this app is ARCHIVED (there is no FINALIZED status on `contests`),
    // so it maps onto the header's "finalized" visual state — the same mapping the
    // Fantasy preview card already makes.
    const headerState = isArchived ? "finalized" : "open";
    const headerTimingLabel = isArchived
        ? `Finalized ${formatDateTime(contest.archived_at ?? contest.ends_at)}`
        : `${formatDateTime(contest.starts_at)} to ${formatDateTime(contest.ends_at)}`;
    const mobileHeaderTimingLabel = isArchived
        ? headerTimingLabel
        : `Ends ${formatDateTime(contest.ends_at)}`;
    const hasOpenSlips = ((openSlips?.length ?? 0) + (reviewSlips?.length ?? 0)) > 0;

    /* CONTEST INFORMATION — what the settings form may still write.
     *
     * The MVP splits this in two, because its Fantasy lifecycle has a
     * "resolving" phase where a rename is still allowed but the schedule is
     * frozen. A contest here is only ACTIVE or ARCHIVED, so both gates open and
     * close together — kept as two names so the JSX reads the same as the MVP's,
     * and so a resolving phase can be wired to one of them later. */
    const canMutateContest = canManage && !isArchived;
    const canRenameContest = canMutateContest;

    /* Name rules are the SERVER's, restated: PATCH /contest/update runs
     * validateTextField(name, "Contest name", { min: 4, max: 25 }) and answers
     * 400 outside those bounds, so checking here only saves the round trip. */
    const trimmedContestName = editName.trim();
    const contestNameError =
        trimmedContestName.length < CONTEST_NAME_MIN ||
            trimmedContestName.length > CONTEST_NAME_MAX
            ? `Contest name must be ${CONTEST_NAME_MIN}-${CONTEST_NAME_MAX} characters.`
            : checkAnyRestrictedWords(trimmedContestName)
                ? "Contest name contains inappropriate language."
                : null;

    /* THE END DATE, and the one rule that makes moving it dangerous.
     *
     * A Slip lives inside its contest's window: its deadline may not precede the
     * contest start, and its eligibility window may not run past the contest
     * end. Pulling the end date back can therefore orphan a Slip that was legal
     * when it was created. The MVP refuses that save outright; nothing on
     * PATCH /contest/update refuses it server-side, so the check has to be here.
     *
     * BEST EFFORT, and deliberately so: the three Slip lists this tab loads are
     * paged at 12 each, so a contest with more Slips than that can hide an
     * offender. Catching the visible ones still beats catching none, and with
     * the start date now locked this is the only edit that can orphan one. */
    const scheduledSlips = [
        ...(openSlips ?? []),
        ...(reviewSlips ?? []),
        ...(finalizeSlips ?? []),
    ];
    const contestStartTime = new Date(contest.starts_at).getTime();
    const proposedEndTime = new Date(editEndsAt).getTime();
    const endsAtBeforeStart =
        Number.isFinite(contestStartTime) &&
        Number.isFinite(proposedEndTime) &&
        proposedEndTime <= contestStartTime;
    const endsAtOrphansSlip =
        !endsAtBeforeStart &&
        Number.isFinite(proposedEndTime) &&
        scheduledSlips.some((slip) => {
            const deadlineTime = new Date(slip.pick_deadline_at).getTime();
            const windowEnd = eligibleWindowEnd(
                slip.pick_deadline_at,
                slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS
            );
            const windowEndTime = windowEnd ? new Date(windowEnd).getTime() : NaN;
            if (!Number.isFinite(deadlineTime) || !Number.isFinite(windowEndTime)) return false;
            return deadlineTime < contestStartTime || windowEndTime > proposedEndTime;
        });
    const contestEndsAtError = endsAtBeforeStart
        ? "End date must be later than the start date."
        : endsAtOrphansSlip
            ? "This end date would place an existing Slip outside the contest schedule. Choose a later end date."
            : null;

    const contestInfoDirty =
        trimmedContestName !== contest.name || editEndsAt !== contest.ends_at;
    const canSaveContestInfo =
        canRenameContest &&
        contestInfoDirty &&
        !contestNameError &&
        !contestEndsAtError &&
        !contestLoader;

    // Staff who can still edit see every badge they could switch on; everyone
    // else sees the ones already in play, so the same list drives the board,
    // the category rail and both counters.
    const badgeListDefinitions = (canMutateBadgeSettings ? manageableBadgeDefinitions : badgeDefinitions) ?? [];
    const availableBadgeCategories = BADGE_CATEGORY_ORDER.filter((category) =>
        badgeListDefinitions.some((definition) => definition.category === category)
    );
    const activeBadgeCategory = availableBadgeCategories.includes(selectedBadgeCategory)
        ? selectedBadgeCategory
        : (availableBadgeCategories[0] ?? "generic");
    const displayedBadgeDefinitions = badgeListDefinitions.filter(
        (definition) => definition.category === activeBadgeCategory
    );
    const visibleBadgeIds = new Set(badgeListDefinitions.map((definition) => definition.id));
    const activeBadgeCount = canMutateBadgeSettings
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
    // multi-sport contests stay on the generic tint.
    const badgeTintSport = contest.sports?.length === 1 ? contest.sports[0] : null;
    // Holders already exist, so switching badge play off restages a Rank
    // recalculation — worth a confirm before the draft even changes.
    const badgeResultsNeedRecalculation = capturedBadgeCount > 0;
    const badgeBoardEnabled = canMutateBadgeSettings
        ? Boolean(badgeDraft?.enabled)
        : Boolean(appliedBadgeSettings?.enabled);
    const badgeBoardDescriptions = canMutateBadgeSettings
        ? BADGE_BOARD_DESCRIPTIONS.staff
        : BADGE_BOARD_DESCRIPTIONS.member;
    const badgeUpgradeHref = `/app-settings/plan/league/upgrade?intent=capture-badges&leagueId=${encodeURIComponent(
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
        const name = editName.trim();
        // Nothing to write, or something the server would reject anyway. The
        // button is already disabled on both counts; this covers the gap while
        // a re-read is in flight.
        if (name === contest.name && editEndsAt === contest.ends_at) return;

        dispatch(updateContestRequest({
            contest_id: contestId,
            name,
            // Locked at creation and sent unchanged: the endpoint treats a
            // missing starts_at as "leave alone", but the payload type requires
            // it, and echoing the stored value is the honest form of both.
            starts_at: contest.starts_at,
            ends_at: editEndsAt
        }));
    };

    const persistBadgeSettings = () => {
        if (!badgeDraft || !contest.id || !canMutateBadgeSettings) return;

        if (canCustomizeBadgePoints) {
            dispatch(updateBadgeSettingsRequest({
                contest_id: contest.id,
                settings: badgeDraft,
            }));
        } else {
            // Enable/disable and badge selection follow the League's Pro tier;
            // only point VALUES additionally need the account's own Pro plan.
            // `update-badge-settings` rejects a body that would move a point
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
        // Optimistic: the effect on `contest` re-baselines both once the saga
        // lands, this just clears the dirty state (and its exit guards) now.
        setSavedBadgeSettings(badgeDraft);
        setBadgeSettingsConfirmation(null);
    };

    const handleSaveBadgeSettings = () => {
        if (!badgeDraft) return;
        if (hasFinalizedSlips) {
            setBadgeSettingsConfirmation("save");
            return;
        }
        persistBadgeSettings();
    };

    const stageBadgeSystemEnabled = (enabled: boolean) => {
        if (!badgeDraft || !canMutateBadgeSettings) return;
        const defaultSettings = createDefaultContestBadgeSettings(contest, enabled);
        setBadgeDraft({
            ...badgeDraft,
            enabled,
            defaultPoints: defaultSettings.defaultPoints,
            badgePointOverrides: defaultSettings.badgePointOverrides,
            enabledBadgeIds:
                enabled && badgeDraft.enabledBadgeIds.length === 0
                    ? getDefaultEnabledBadgeIds(contest)
                    : badgeDraft.enabledBadgeIds,
        });
        setBadgeSettingsConfirmation(null);
    };

    const handleToggleBadgeSystem = () => {
        if (!badgeDraft) return;
        if (badgeDraft.enabled && badgeResultsNeedRecalculation) {
            setBadgeSettingsConfirmation("disable");
            return;
        }
        stageBadgeSystemEnabled(!badgeDraft.enabled);
    };

    const handleConfirmDisableBadgeSystem = () => {
        stageBadgeSystemEnabled(false);
    };

    /**
     * Stages the catalogue defaults into the draft — nothing is persisted until
     * Save, which keeps the reset undoable and inside the same dirty-state model
     * as every other control on the board.
     */
    const handleResetBadgeSettings = () => {
        if (!badgeDraft || !canMutateBadgeSettings) return;
        setBadgeDraft(createDefaultContestBadgeSettings(contest, badgeDraft.enabled));
    };

    const handleContestTabChange = (nextTab: ContestTabId) => {
        if (nextTab === activeContestTab) return;
        if (hasUnsavedBadgeChanges) {
            setPendingBadgeExit({ type: "tab", tab: nextTab });
            return;
        }
        setActiveContestTab(nextTab);
    };

    const handleHeaderBack = () => {
        if (hasUnsavedBadgeChanges) {
            setPendingBadgeExit({ type: "back" });
            return;
        }
        router.push(`/league/${league.id}?tab=contests`);
    };

    const handleDiscardBadgeChanges = () => {
        const exit = pendingBadgeExit;
        setBadgeDraft(savedBadgeSettings);
        setBadgeSettingsConfirmation(null);
        setPendingBadgeExit(null);

        if (exit?.type === "tab") {
            setActiveContestTab(exit.tab);
        } else if (exit?.type === "back") {
            router.push(`/league/${league.id}?tab=contests`);
        } else if (exit?.type === "href") {
            router.push(exit.href);
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
        if (!league?.id || !contest?.id) return;
        const nextPage = leaderboardPage + 1;
        setLeaderboardPage(nextPage);
        dispatch(fetchLeaderboardRequest({
            groupId: league.id,
            contest_id: contest.id,
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
            <ContestDetailHeader
                accent="league"
                artwork={fantasyContestArtwork(contest.sports)}
                backHref={`/league/${league.id}?tab=contests`}
                onBack={handleHeaderBack}
                contextName={league.name}
                contestName={contest.name}
                contestTypeLabel="Fantasy Contest"
                format="fantasy"
                sports={contestSportLabels(contest.sports)}
                state={headerState}
                timingLabel={headerTimingLabel}
                mobileTimingLabel={mobileHeaderTimingLabel}
            >
                <ContestDetailTabBar
                    activeTab={activeContestTab}
                    ariaLabel="Contest sections"
                    onTabChange={handleContestTabChange}
                    tabs={visibleTabs}
                    semanticTabs={false}
                    tabIdPrefix="fantasy-contest-tab"
                />
            </ContestDetailHeader>

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
                            /*
                             * Only for someone who can actually open a slip, and
                             * only while the contest is live — the board renders
                             * its placeholder column either way, but the action
                             * inside it appears only on this viewer's own row.
                             */
                            onCreateSlip={
                                canManage && !isArchived
                                    ? () =>
                                        router.push(
                                            `/league/${league.id}/contests/${contest.id}/slips/create`
                                        )
                                    : undefined
                            }
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
                        title="resolving results"
                        slips={reviewSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreReview}
                        layout="grid"
                        emptyCopy="No League Slips are resolving."
                        hasMore={hasMoreReviews}
                    />
                    <SlipCategorySection
                        title="finalized"
                        slips={finalizeSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreFinal}
                        layout="grid"
                        emptyCopy="No finalized League Slips yet."
                        hasMore={hasMoreFinalizes}
                    />
                </section>
            )}

            {activeContestTab === "badges" && (
                <>
                    {badgeLoading ? (
                        <BadgesSkeleton />
                    ) : (
                        <section
                            className={`space-y-5 sm:space-y-7 sm:pt-6 lg:space-y-8 lg:pt-7 ${FANTASY_CONTEST_TAB_CONTENT_CLASS_NAME}`}
                            data-badges-tab
                        >
                            {!badgeFeatureEntitled ? (
                                <aside
                                    aria-labelledby="badge-pro-title"
                                    className="relative rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3.5 sm:rounded-xl sm:px-6 sm:py-5 lg:px-8 lg:py-6"
                                    data-badge-upgrade
                                >
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute right-0 top-0 h-16 w-16 overflow-hidden sm:h-24 sm:w-24"
                                        data-badge-upgrade-icon
                                        data-badge-upgrade-icon-blend="masked-gradient"
                                        data-badge-upgrade-icon-position="corner-fade"
                                    >
                                        <span
                                            className="absolute -right-1.5 -top-1.5 h-16 w-16 opacity-[0.18] mix-blend-lighten grayscale contrast-110 sm:-right-2 sm:-top-2 sm:h-24 sm:w-24"
                                            style={{
                                                WebkitMaskImage:
                                                    "radial-gradient(circle at 62% 38%, black 0%, rgba(0,0,0,0.82) 40%, transparent 78%)",
                                                maskImage:
                                                    "radial-gradient(circle at 62% 38%, black 0%, rgba(0,0,0,0.82) 40%, transparent 78%)",
                                            }}
                                        >
                                            <BadgeIcon
                                                category="generic"
                                                sport={badgeTintSport}
                                                alt=""
                                                className="h-full w-full"
                                                glow={false}
                                                priority
                                                tinted={false}
                                            />
                                        </span>
                                    </div>
                                    <div
                                        className="min-w-0 max-w-2xl pr-12 sm:pr-24"
                                        data-badge-upgrade-copy
                                    >
                                        <h2
                                            id="badge-pro-title"
                                            className="text-sm font-semibold text-white sm:text-base lg:text-lg"
                                        >
                                            Unlock Capture the Badge
                                        </h2>
                                    </div>
                                    <ol
                                        aria-label="How Capture the Badge works"
                                        className="mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3 sm:mt-5 sm:pt-4"
                                        data-badge-upgrade-steps
                                    >
                                        {BADGE_UNLOCK_STEPS.map((step, index) => (
                                            <li
                                                key={step.label}
                                                className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-5"
                                            >
                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-sky-100/70 sm:text-[11px] lg:text-xs">
                                                    <span className="mr-1 text-gray-600">0{index + 1}</span>
                                                    {step.label}
                                                </p>
                                                <p className="mt-1 text-[10px] leading-4 text-gray-500 sm:mt-2 sm:text-xs sm:leading-5 lg:text-sm lg:leading-6">
                                                    {step.description}
                                                </p>
                                            </li>
                                        ))}
                                    </ol>
                                    {isCommissioner ? (
                                        <Link
                                            href={badgeUpgradeHref}
                                            className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-5 sm:min-h-10 sm:w-auto sm:px-4 sm:text-xs"
                                        >
                                            View Pro upgrade
                                            <AnimatedArrow direction="right" className="ml-2" />
                                        </Link>
                                    ) : (
                                        <p
                                            className="mt-3 text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:mt-5 sm:text-xs"
                                            data-badge-upgrade-member-note
                                        >
                                            Ask the League owner to unlock it
                                        </p>
                                    )}
                                </aside>
                            ) : (
                                <>
                                    <header
                                        aria-labelledby="badge-board-title"
                                        className={`relative isolate rounded-lg border transition-colors sm:rounded-xl ${badgeBoardEnabled
                                            ? "border-[#38BDF8]/25 bg-gradient-to-br from-[#38BDF8]/[0.12] via-[#38BDF8]/[0.04] to-white/[0.02] shadow-[0_10px_24px_-22px_rgba(56,189,248,0.35)]"
                                            : "border-white/10 bg-white/[0.02]"
                                            }`}
                                        data-badge-board-summary
                                        data-badge-board-size="state-stable"
                                        data-badge-board-state={badgeBoardEnabled ? "on" : "off"}
                                        data-badge-dirty={hasUnsavedBadgeChanges ? "true" : "false"}
                                        data-badge-controls={canMutateBadgeSettings && badgeDraft ? true : undefined}
                                    >
                                        {canMutateBadgeSettings && badgeDraft ? (
                                            <button
                                                type="button"
                                                onClick={handleToggleBadgeSystem}
                                                aria-label={
                                                    badgeDraft.enabled ? "Turn badge play off" : "Turn badge play on"
                                                }
                                                aria-describedby={`badge-board-description-${badgeBoardEnabled ? "on" : "off"
                                                    }`}
                                                aria-pressed={badgeDraft.enabled}
                                                className="absolute inset-0 z-0 cursor-pointer rounded-lg bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 sm:rounded-xl"
                                                data-badge-system-toggle-surface="card"
                                            />
                                        ) : null}
                                        <div
                                            className={`relative z-10 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${canMutateBadgeSettings && badgeDraft ? "pointer-events-none" : ""
                                                }`}
                                            data-badge-controls-header
                                        >
                                            <div
                                                className={`min-w-0 ${canMutateBadgeSettings ? "pr-20 sm:pr-28 lg:pr-32" : ""
                                                    }`}
                                                data-badge-board-copy
                                                data-badge-board-points-rail={
                                                    canMutateBadgeSettings ? "reserved" : "not-applicable"
                                                }
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <h3
                                                        id="badge-board-title"
                                                        className="text-sm font-semibold text-white sm:text-base lg:text-lg"
                                                    >
                                                        Capture the Badge
                                                    </h3>
                                                    <span
                                                        className={`flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide sm:text-[9px] lg:text-[10px] ${badgeBoardEnabled ? "text-sky-100" : "text-gray-500"
                                                            }`}
                                                        data-badge-system-state={badgeBoardEnabled ? "on" : "off"}
                                                        data-badge-system-state-position="beside-title"
                                                    >
                                                        <span
                                                            aria-hidden
                                                            className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${badgeBoardEnabled
                                                                ? "bg-sky-300 shadow-[0_0_5px_rgba(125,211,252,0.28)]"
                                                                : "bg-gray-700"
                                                                }`}
                                                        />
                                                        {badgeBoardEnabled ? "On" : "Off"}
                                                    </span>
                                                </div>
                                                <div
                                                    className="mt-1.5 grid max-w-2xl sm:mt-2 sm:max-w-3xl"
                                                    data-badge-board-description-stack="state-reserved"
                                                >
                                                    <p
                                                        id="badge-board-description-on"
                                                        aria-hidden={!badgeBoardEnabled}
                                                        className={`col-start-1 row-start-1 text-[11px] leading-4 text-gray-500 sm:text-[13px] sm:leading-5 lg:text-sm lg:leading-6 ${badgeBoardEnabled ? "visible" : "invisible"
                                                            }`}
                                                        data-badge-board-description={
                                                            badgeBoardEnabled ? true : undefined
                                                        }
                                                        data-badge-board-description-state="on"
                                                    >
                                                        {badgeBoardDescriptions.on}
                                                    </p>
                                                    <p
                                                        id="badge-board-description-off"
                                                        aria-hidden={badgeBoardEnabled}
                                                        className={`col-start-1 row-start-1 text-[11px] leading-4 text-gray-500 sm:text-[13px] sm:leading-5 lg:text-sm lg:leading-6 ${badgeBoardEnabled ? "invisible" : "visible"
                                                            }`}
                                                        data-badge-board-description={
                                                            badgeBoardEnabled ? undefined : true
                                                        }
                                                        data-badge-board-description-state="off"
                                                    >
                                                        {badgeBoardDescriptions.off}
                                                    </p>
                                                </div>
                                            </div>
                                            {canMutateBadgeSettings && badgeDraft?.enabled && (
                                                <div
                                                    className="pointer-events-auto absolute right-4 top-2.5 w-[3.75rem] sm:right-6 sm:top-4 sm:w-20 lg:right-8 lg:top-5 lg:w-[5.5rem]"
                                                    data-badge-default-points-position="top-right"
                                                    data-badge-primary-controls
                                                    data-default-badge-points-stepper
                                                    data-default-badge-points-style="matches-card"
                                                >
                                                    {canCustomizeBadgePoints ? (
                                                        <CompactBadgePointsControl
                                                            badgeName="Default badge"
                                                            hasOverride
                                                            value={badgeDraft.defaultPoints}
                                                            onChange={(nextValue) =>
                                                                setBadgeDraft((current) =>
                                                                    current
                                                                        ? {
                                                                            ...current,
                                                                            defaultPoints: nextValue,
                                                                        }
                                                                        : current
                                                                )
                                                            }
                                                            onReset={handleResetBadgeSettings}
                                                            resetLabel="Reset badge settings"
                                                        />
                                                    ) : (
                                                        // Point VALUES need the account's own Pro plan, so a
                                                        // manager on Free reads the contest default instead of
                                                        // editing it.
                                                        <span
                                                            className="inline-flex h-10 w-full flex-col items-center justify-center rounded-lg border border-sky-200/15 bg-gradient-to-b from-sky-400/[0.1] to-black/25 px-1 font-semibold tabular-nums text-gray-200 sm:h-12 sm:rounded-xl"
                                                            data-badge-points-display
                                                            data-badge-points-display-state="locked"
                                                        >
                                                            <span className="text-[11px] leading-none sm:text-[15px]">
                                                                +{badgeDraft.defaultPoints}
                                                            </span>
                                                            <span className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-sky-100/50 sm:text-[8px]">
                                                                pts
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div
                                                className="mt-3 flex h-7 items-center justify-between gap-3 sm:mt-4 sm:h-9 lg:mt-5 lg:h-10"
                                                data-badge-header-actions
                                                data-badge-header-actions-height="state-stable"
                                                data-badge-header-actions-layout="meta-row"
                                            >
                                                <div
                                                    className="flex flex-nowrap items-center gap-x-3 whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-gray-500 sm:gap-x-5 sm:text-[10px] lg:text-xs"
                                                    data-badge-counts
                                                    data-badge-counts-layout="inline-row"
                                                >
                                                    <p
                                                        className="flex items-center gap-1"
                                                        data-badge-count-line="active"
                                                    >
                                                        <span className="text-gray-300">{activeBadgeCount}</span>{" "}
                                                        <span>of {badgeListDefinitions.length} active</span>
                                                    </p>
                                                    <p
                                                        className="flex items-center gap-1"
                                                        data-badge-count-line="captured"
                                                    >
                                                        <span className="text-gray-300">{capturedBadgeCount}</span>{" "}
                                                        <span>captured</span>
                                                    </p>
                                                </div>
                                                {canMutateBadgeSettings ? (
                                                    badgeDraft?.enabled || hasUnsavedBadgeChanges ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveBadgeSettings}
                                                            aria-label="Save settings"
                                                            className="pointer-events-auto inline-flex h-7 w-11 shrink-0 items-center justify-center rounded-md bg-white px-2.5 py-1 text-[10px] font-semibold text-black transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-9 sm:w-16 sm:rounded-lg sm:text-xs lg:h-10 lg:w-20"
                                                            data-badge-save-position="meta-row"
                                                            data-badge-save-slot="action"
                                                        >
                                                            Save
                                                        </button>
                                                    ) : (
                                                        <span
                                                            aria-hidden
                                                            className="h-7 w-11 shrink-0 sm:h-9 sm:w-16 lg:h-10 lg:w-20"
                                                            data-badge-save-slot="reserved"
                                                        />
                                                    )
                                                ) : null}
                                            </div>
                                        </div>
                                    </header>

                                    {!canManageBadges && !appliedBadgeSettings?.enabled ? (
                                        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] px-4 py-7 text-center sm:rounded-xl sm:px-6 sm:py-10">
                                            <p className="text-sm font-semibold text-white sm:text-base lg:text-lg">
                                                Badge play is off
                                            </p>
                                            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-gray-500 sm:mt-2 sm:text-sm sm:leading-6">
                                                The commissioner has not enabled Capture the Badge for this contest.
                                            </p>
                                        </div>
                                    ) : badgeListDefinitions.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] px-4 py-7 text-center sm:rounded-xl sm:px-6 sm:py-10">
                                            <p className="text-sm font-semibold text-white sm:text-base lg:text-lg">
                                                No eligible badges yet
                                            </p>
                                            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-gray-500 sm:mt-2 sm:text-sm sm:leading-6">
                                                Badges appear here when this contest has an eligible sport or qualifying activity.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {availableBadgeCategories.length > 1 ? (
                                                <div
                                                    aria-label="Badge categories"
                                                    className={`-mx-1 overflow-x-auto px-1 transition-[filter,opacity] duration-200 ${badgeBoardEnabled
                                                        ? "opacity-100 grayscale-0"
                                                        : "opacity-60 grayscale"
                                                        }`}
                                                    data-badge-category-tabs
                                                    data-badge-category-system-state={badgeBoardEnabled ? "on" : "off"}
                                                    role="tablist"
                                                >
                                                    <div className="flex min-w-max items-center gap-4 border-b border-white/[0.08] sm:gap-6 lg:gap-8">
                                                        {availableBadgeCategories.map((category, categoryIndex) => {
                                                            const categoryTheme = BADGE_CATEGORY_THEMES[category];
                                                            const isSelected = category === activeBadgeCategory;
                                                            const categoryCount = badgeListDefinitions.filter(
                                                                (definition) => definition.category === category
                                                            ).length;
                                                            const tabId = `badge-category-${contest.id}-${category}-tab`;

                                                            return (
                                                                <button
                                                                    key={category}
                                                                    type="button"
                                                                    id={tabId}
                                                                    role="tab"
                                                                    aria-label={`${categoryTheme.label}, ${categoryCount} badges`}
                                                                    aria-controls={`badge-category-${contest.id}-panel`}
                                                                    aria-selected={isSelected}
                                                                    tabIndex={isSelected ? 0 : -1}
                                                                    onClick={() => setSelectedBadgeCategory(category)}
                                                                    onKeyDown={(event) => {
                                                                        let nextIndex: number | null = null;
                                                                        if (event.key === "ArrowRight") {
                                                                            nextIndex =
                                                                                (categoryIndex + 1) % availableBadgeCategories.length;
                                                                        } else if (event.key === "ArrowLeft") {
                                                                            nextIndex =
                                                                                (categoryIndex - 1 + availableBadgeCategories.length) %
                                                                                availableBadgeCategories.length;
                                                                        } else if (event.key === "Home") {
                                                                            nextIndex = 0;
                                                                        } else if (event.key === "End") {
                                                                            nextIndex = availableBadgeCategories.length - 1;
                                                                        }
                                                                        if (nextIndex === null) return;

                                                                        event.preventDefault();
                                                                        const nextCategory = availableBadgeCategories[nextIndex];
                                                                        setSelectedBadgeCategory(nextCategory);
                                                                        document
                                                                            .getElementById(
                                                                                `badge-category-${contest.id}-${nextCategory}-tab`
                                                                            )
                                                                            ?.focus();
                                                                    }}
                                                                    className={`relative flex h-8 shrink-0 items-center gap-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-11 sm:gap-2 sm:text-xs lg:h-12 lg:text-[13px] ${isSelected
                                                                        ? categoryTheme.selectedTabClass
                                                                        : "text-gray-500 hover:text-gray-200"
                                                                        }`}
                                                                    data-badge-category-accent={categoryTheme.color}
                                                                    data-badge-category-palette={categoryTheme.palette}
                                                                    data-badge-category-tab={category}
                                                                >
                                                                    <span
                                                                        aria-hidden
                                                                        className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${categoryTheme.markerClass} ${isSelected ? "opacity-100" : "opacity-45"
                                                                            }`}
                                                                    />
                                                                    <span>{categoryTheme.label}</span>
                                                                    <span
                                                                        className={`text-[8px] tabular-nums sm:text-[10px] lg:text-[11px] ${isSelected ? "opacity-70" : "text-gray-700"
                                                                            }`}
                                                                        data-badge-category-count
                                                                    >
                                                                        {categoryCount}
                                                                    </span>
                                                                    {isSelected ? (
                                                                        <span
                                                                            aria-hidden
                                                                            className={`absolute inset-x-0 -bottom-px h-px sm:h-0.5 ${categoryTheme.markerClass}`}
                                                                            data-badge-category-indicator
                                                                        />
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <div
                                                id={`badge-category-${contest.id}-panel`}
                                                role={availableBadgeCategories.length > 1 ? "tabpanel" : undefined}
                                                aria-labelledby={
                                                    availableBadgeCategories.length > 1
                                                        ? `badge-category-${contest.id}-${activeBadgeCategory}-tab`
                                                        : undefined
                                                }
                                                className="grid grid-cols-2 gap-1.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4"
                                                data-badge-category-panel={activeBadgeCategory}
                                                data-badge-grid
                                            >
                                                {displayedBadgeDefinitions.map((definition) => {
                                                    const award = (badgeAwards ?? []).find(
                                                        (candidate) => candidate.definition.id === definition.id
                                                    );
                                                    const draftEnabled = badgeDraft?.enabledBadgeIds.includes(definition.id) ?? false;
                                                    const badgeSystemEnabled = canMutateBadgeSettings
                                                        ? Boolean(badgeDraft?.enabled)
                                                        : Boolean(appliedBadgeSettings?.enabled);
                                                    const badgeEnabledForDraft = canMutateBadgeSettings ? draftEnabled : true;
                                                    const badgeIsInPlay = badgeSystemEnabled && badgeEnabledForDraft;
                                                    const cardDisabled = canMutateBadgeSettings && !badgeIsInPlay;
                                                    // A commissioner without account Pro cannot edit point
                                                    // values, but the values are still the contest's real
                                                    // ones — saving through the toggle endpoint leaves them
                                                    // untouched — so never show the built-in default here.
                                                    const displayedPoints =
                                                        canMutateBadgeSettings && badgeDraft
                                                            ? getBadgePointValue(badgeDraft, definition.id)
                                                            : appliedBadgeSettings
                                                                ? getBadgePointValue(appliedBadgeSettings, definition.id)
                                                                : 0;
                                                    const hasOverride =
                                                        badgeDraft?.badgePointOverrides[definition.id] !== undefined;
                                                    const holderName = award?.profile?.username ?? "Member";
                                                    const badgeCategory = definition.category as ContestBadgeCategory;
                                                    const categoryTheme =
                                                        BADGE_CATEGORY_THEMES[badgeCategory] ?? BADGE_CATEGORY_THEMES.generic;

                                                    return (
                                                        <article
                                                            key={definition.id}
                                                            className={`semantic-badge-palette relative isolate flex h-[14.25rem] w-full flex-col rounded-lg border p-2.5 transition-colors focus-within:z-20 min-[360px]:h-56 min-[390px]:h-[13.25rem] sm:h-[17rem] sm:rounded-xl sm:p-4 lg:h-64 ${cardDisabled
                                                                ? categoryTheme.disabledCardClass
                                                                : categoryTheme.activeCardClass
                                                                }`}
                                                            data-badge-card-accent={categoryTheme.color}
                                                            data-badge-card-category={definition.category}
                                                            data-badge-card-category-label={categoryTheme.label}
                                                            data-badge-card-height="fixed-responsive"
                                                            data-badge-card-size="standard"
                                                            data-badge-in-play={badgeIsInPlay ? "true" : "false"}
                                                            data-badge-card-palette={categoryTheme.palette}
                                                            data-badge-card-state={cardDisabled ? "disabled" : "active"}
                                                            data-badge-card-tone={definition.category}
                                                            data-contest-badge-card={definition.id}
                                                        >
                                                            {canMutateBadgeSettings && badgeDraft ? (
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
                                                                    title={
                                                                        !badgeSystemEnabled
                                                                            ? "Badge system off"
                                                                            : draftEnabled
                                                                                ? `Exclude ${definition.name}`
                                                                                : `Include ${definition.name}`
                                                                    }
                                                                    className="absolute inset-0 z-0 cursor-pointer rounded-lg bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed sm:rounded-xl"
                                                                    data-badge-inclusion-control
                                                                    data-badge-inclusion-control-surface="card"
                                                                />
                                                            ) : null}
                                                            <div
                                                                className={`relative z-10 grid h-28 min-w-0 grid-cols-[minmax(0,1fr)_4rem] grid-rows-[2.5rem_minmax(0,1fr)] gap-x-2 min-[360px]:h-[6.75rem] min-[390px]:h-24 sm:h-[8rem] sm:grid-cols-[minmax(0,1fr)_5rem] sm:grid-rows-[3.5rem_minmax(0,1fr)] sm:gap-x-4 lg:grid-cols-[minmax(0,1fr)_5.5rem] ${canMutateBadgeSettings && badgeDraft ? "pointer-events-none" : ""
                                                                    }`}
                                                                data-badge-card-header
                                                                data-badge-card-header-height="fixed-responsive"
                                                                data-badge-card-header-layout="reserved-points-rail"
                                                            >
                                                                <div
                                                                    className="contents text-left"
                                                                    data-badge-text-column
                                                                    data-badge-text-offset="lowered"
                                                                >
                                                                    <div
                                                                        className="col-start-1 row-start-1 flex min-w-0 items-start pt-1"
                                                                        data-badge-title-row
                                                                    >
                                                                        <h4
                                                                            className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-tight text-white sm:text-sm sm:leading-5"
                                                                            data-badge-title-wrap="natural"
                                                                        >
                                                                            {definition.name}
                                                                        </h4>
                                                                    </div>
                                                                    <div
                                                                        className="col-span-2 row-start-2 flex min-h-0 flex-col overflow-visible pt-1 text-left sm:pt-[0.25rem]"
                                                                        data-badge-copy-region
                                                                        data-badge-copy-alignment="stable-left"
                                                                        data-badge-description-layout="full-width-reserved"
                                                                        data-badge-copy-overflow="visible"
                                                                    >
                                                                        <p
                                                                            className={`overflow-visible break-words text-[9px] leading-3 sm:text-xs sm:leading-[1rem] ${cardDisabled ? "text-gray-600" : "text-gray-400"
                                                                                }`}
                                                                            data-badge-description
                                                                            data-badge-description-wrap="unclipped-natural"
                                                                        >
                                                                            {definition.description}
                                                                        </p>
                                                                        <p
                                                                            className={`mt-1 shrink-0 text-[8px] italic leading-3 sm:mt-[0.25rem] sm:text-[11px] sm:leading-[1rem] ${cardDisabled ? "text-gray-700" : "text-gray-500"
                                                                                }`}
                                                                            data-badge-minimum
                                                                            data-badge-minimum-position="next-line"
                                                                        >
                                                                            Minimum: {getBadgeMinimumLabel(definition)}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {badgeIsInPlay ? (
                                                                    <div
                                                                        className="pointer-events-auto relative col-start-2 row-start-1 flex min-w-0 items-start justify-end"
                                                                        data-badge-points-region
                                                                    >
                                                                        {canMutateBadgeSettings && canCustomizeBadgePoints && badgeDraft ? (
                                                                            <CompactBadgePointsControl
                                                                                badgeName={definition.name}
                                                                                hasOverride={hasOverride}
                                                                                value={displayedPoints}
                                                                                onChange={(nextValue) =>
                                                                                    setBadgeDraft((current) =>
                                                                                        current
                                                                                            ? {
                                                                                                ...current,
                                                                                                badgePointOverrides: {
                                                                                                    ...current.badgePointOverrides,
                                                                                                    [definition.id]: nextValue,
                                                                                                },
                                                                                            }
                                                                                            : current
                                                                                    )
                                                                                }
                                                                                onReset={() =>
                                                                                    setBadgeDraft((current) => {
                                                                                        if (!current) return current;
                                                                                        const nextOverrides = { ...current.badgePointOverrides };
                                                                                        delete nextOverrides[definition.id];
                                                                                        return { ...current, badgePointOverrides: nextOverrides };
                                                                                    })
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <span
                                                                                className="inline-flex h-9 w-full flex-col items-center justify-center rounded-lg border border-sky-200/15 bg-gradient-to-b from-sky-400/[0.1] to-black/25 px-1 font-semibold tabular-nums text-gray-200 sm:h-12 sm:rounded-xl"
                                                                                data-badge-points-display
                                                                                data-badge-points-display-state="active"
                                                                            >
                                                                                <span className="text-[11px] leading-none sm:text-[15px]">
                                                                                    +{displayedPoints}
                                                                                </span>
                                                                                <span className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-sky-100/50 sm:text-[8px]">
                                                                                    pts
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : null}
                                                            </div>

                                                            <div
                                                                className="pointer-events-none relative z-0 -mr-2.5 h-12 shrink-0 overflow-hidden sm:-mr-4 sm:h-14"
                                                                data-badge-artwork-zone
                                                                data-badge-artwork-zone-height="fixed"
                                                                data-badge-artwork-zone-clip="right-divider"
                                                            >
                                                                <span
                                                                    className={`absolute -bottom-1 -right-1.5 h-12 w-12 mix-blend-lighten sm:-right-2 sm:h-14 sm:w-14 ${cardDisabled
                                                                        ? "opacity-[0.055] grayscale"
                                                                        : "opacity-[0.34] saturate-150 contrast-110"
                                                                        }`}
                                                                    data-badge-artwork
                                                                    data-badge-artwork-blend="masked-gradient"
                                                                    data-badge-artwork-position="above-divider"
                                                                    data-badge-artwork-size="small"
                                                                    style={{
                                                                        WebkitMaskImage:
                                                                            "radial-gradient(circle at 68% 68%, black 0%, rgba(0,0,0,0.88) 38%, transparent 76%)",
                                                                        maskImage:
                                                                            "radial-gradient(circle at 68% 68%, black 0%, rgba(0,0,0,0.88) 38%, transparent 76%)",
                                                                    }}
                                                                >
                                                                    <BadgeIcon
                                                                        category={badgeCategory}
                                                                        sport={badgeTintSport}
                                                                        alt=""
                                                                        className="h-full w-full"
                                                                        glow={false}
                                                                        tinted={false}
                                                                    />
                                                                </span>
                                                            </div>

                                                            <div
                                                                className={`relative z-10 -mx-2.5 mt-auto h-12 shrink-0 border-t px-2.5 pt-2 sm:-mx-4 sm:h-14 sm:px-4 sm:pt-3 ${cardDisabled ? "border-white/[0.06]" : "border-white/15"
                                                                    } ${canMutateBadgeSettings && badgeDraft ? "pointer-events-none" : ""}`}
                                                                data-badge-divider="full-bleed"
                                                                data-badge-footer-height="fixed-responsive"
                                                                data-badge-holder
                                                            >
                                                                {!badgeIsInPlay ? (
                                                                    <div
                                                                        data-badge-inactive-state={
                                                                            badgeSystemEnabled ? "excluded" : "system-off"
                                                                        }
                                                                    >
                                                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                                                                            {badgeSystemEnabled ? "Excluded" : "Badge play off"}
                                                                        </p>
                                                                        <p className="mt-0.5 text-[9px] leading-3.5 text-gray-600 sm:text-[11px] sm:leading-4">
                                                                            {badgeSystemEnabled
                                                                                ? "This badge is not currently in play"
                                                                                : "Unavailable while badge play is off"}
                                                                        </p>
                                                                    </div>
                                                                ) : award ? (
                                                                    <>
                                                                        <div className="flex items-baseline justify-between gap-2">
                                                                            <p className="min-w-0 truncate text-[10px] font-semibold text-white sm:text-xs">
                                                                                <span className="mr-1 font-medium text-gray-500">Held by</span>
                                                                                {holderName}
                                                                            </p>
                                                                            <p className="shrink-0 text-[9px] font-semibold text-gray-300 sm:text-xs">
                                                                                {award.valueLabel}
                                                                            </p>
                                                                        </div>
                                                                        <p className="mt-0.5 text-[9px] leading-3.5 text-gray-500 sm:text-[11px] sm:leading-4">
                                                                            To take it: {award.markToBeatLabel}
                                                                        </p>
                                                                    </>
                                                                ) : (
                                                                    <div>
                                                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                                                                            Unclaimed
                                                                        </p>
                                                                        <p className="mt-0.5 text-[9px] leading-3.5 text-gray-500 sm:text-[11px] sm:leading-4">
                                                                            Awaiting a qualifying result
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </>
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
                        <section className={`space-y-4 ${FANTASY_CONTEST_TAB_CONTENT_CLASS_NAME}`}>
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
                                            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
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
                                                    className="min-h-10 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-sky-300/60 hover:text-white"
                                                >
                                                    {excluded ? "add back" : "remove"}
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
                <section className={`space-y-7 ${FANTASY_CONTEST_TAB_CONTENT_CLASS_NAME}`}>
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                                Contest settings
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                {isArchived
                                    ? "Archived contests are read-only. Standings and results remain available."
                                    : badgeFeatureEntitled
                                        ? "Update the contest name and end date. Badge rules live in the Badges tab."
                                        : "Update the contest name and end date. Capture the Badge requires Pro."}
                            </p>
                        </div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Contest name
                            <input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                disabled={!canRenameContest}
                                maxLength={CONTEST_NAME_MAX}
                                aria-invalid={Boolean(contestNameError)}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-400/70 disabled:cursor-not-allowed disabled:opacity-55"
                            />
                            {canRenameContest && contestNameError ? (
                                <span className="mt-1 block text-[10px] normal-case text-amber-200">
                                    {contestNameError}
                                </span>
                            ) : null}
                        </label>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Starts is now DISPLAY ONLY. The MVP locks it at creation —
                                every Slip in the contest was scheduled against this date,
                                so moving it would invalidate their windows retroactively.
                                Rendered as a disabled picker rather than dropped, because
                                the date is still the answer to "when did this start?". */}
                            <DateTimeWheelPicker
                                label="Starts (locked)"
                                value={contest.starts_at}
                                onChange={() => { }}
                                disabled
                                className="min-w-0"
                            />
                            <DateTimeWheelPicker
                                label="Ends"
                                value={editEndsAt}
                                onChange={setEditEndsAt}
                                disabled={!canMutateContest}
                                error={canMutateContest ? contestEndsAtError ?? undefined : undefined}
                                className="min-w-0"
                            />
                        </div>
                        <p className="text-xs leading-5 text-gray-500">
                            The start date is fixed after creation. The end date can only be changed
                            when every existing Slip remains inside the contest schedule.
                        </p>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSaveContestSettings}
                                disabled={!canSaveContestInfo}
                                className="min-h-10 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {contestLoader ? "Saving…" : "Save contest information"}
                            </button>
                        </div>
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
            {badgeSettingsConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
                    <div
                        aria-labelledby="badge-settings-confirmation-title"
                        aria-modal="true"
                        className="w-full max-w-md rounded-xl border border-white/10 bg-black p-5 shadow-2xl"
                        data-badge-settings-confirmation={badgeSettingsConfirmation}
                        role="dialog"
                    >
                        <h2
                            id="badge-settings-confirmation-title"
                            className="text-base font-semibold text-white"
                        >
                            {badgeSettingsConfirmation === "disable"
                                ? "Turn badge play off?"
                                : "Save badge settings?"}
                        </h2>
                        <p className="mt-3 text-sm text-gray-300">
                            {badgeSettingsConfirmation === "disable"
                                ? "Badge bonuses already appear in finalized results. Turning badge play off will stage their removal, but holders and standings will not change unless you Save."
                                : "Saving will update badge awards and standings for finalized contest slips. Player rankings may change."}
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setBadgeSettingsConfirmation(null)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/25"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={
                                    badgeSettingsConfirmation === "disable"
                                        ? handleConfirmDisableBadgeSystem
                                        : persistBadgeSettings
                                }
                                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                            >
                                {badgeSettingsConfirmation === "disable"
                                    ? "Turn off"
                                    : "Save settings"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {pendingBadgeExit && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
                    <div
                        aria-labelledby="unsaved-badge-changes-title"
                        aria-describedby="unsaved-badge-changes-description"
                        aria-modal="true"
                        className="w-full max-w-md rounded-xl border border-white/10 bg-black p-5 shadow-2xl"
                        data-unsaved-badge-changes
                        onKeyDown={(event) => {
                            if (event.key === "Escape") setPendingBadgeExit(null);
                        }}
                        role="alertdialog"
                    >
                        <h2
                            id="unsaved-badge-changes-title"
                            className="text-base font-semibold text-white"
                        >
                            Changes weren&rsquo;t saved
                        </h2>
                        <p
                            id="unsaved-badge-changes-description"
                            className="mt-3 text-sm leading-5 text-gray-300"
                        >
                            Leave without saving and your badge changes will be discarded.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setPendingBadgeExit(null)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/25"
                            >
                                Keep editing
                            </button>
                            <button
                                type="button"
                                onClick={handleDiscardBadgeChanges}
                                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200"
                            >
                                Discard changes
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
