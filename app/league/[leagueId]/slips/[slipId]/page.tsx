"use client";

import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
    type CSSProperties,
    useRef,
    useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { PickLimitIndicator } from "@/components/slips/PickLimitIndicator";
import BackButton from "@/components/ui/BackButton";
import { JAGGED_CLIP_PATH, MAXIMUM_PICK_POINTS, MINIMUM_PICK_POINTS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils/date";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS, eligibleWindowEnd } from "@/lib/utils/games";
import { GradingPayload, GroupSelector, LeaderboardList, Pick, RootState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import { autoGradingPicksRequest, clearCreatePickMessage, clearUpdatePicksMessage, deletePickRequest, fetchAllPicksRequest, resetPicksScoringPointsRequest, updatePicksRequest } from "@/lib/redux/slices/pickSlice";
import { assignToSecondaryLeaderboardRequest, clearDeleteSlipMessage, clearUpdateSlipsMessage, deleteSlipRequest, fetchSlipByIdRequest, markFinalizeSlipRequest, reOpenSlipRequest, updateSlipConflictModeRequest, updateSlipsRequest } from "@/lib/redux/slices/slipSlice";
import Image from "next/image";
import { getPickPoints, LEAGUE_CAP_POINTS, LEAGUE_CAP_TIER, parseAmericanOdds } from "@/lib/utils/scoring";
import { X } from "lucide-react";
import PickListCard from "@/components/slips/PickListCard";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { canCommissionerReview, canFinalize, canUserEditSlipPicks, getSlipConflictWarningMode, isSlipFinal, isSlipTimeLocked, normalizePickResult, slipShowsConflictWarnings } from "@/lib/slips/state";
import { createPortal } from "react-dom";
import ScoringModal from "@/components/modals/ScoringModal";
import SlipShareModal from "@/components/slips/SlipShareModal";
import { checkAnyRestrictedWords, generateProfileImageUrl, useIsMobile } from "@/lib/utils/helpers";
import { UserIcon } from "@/components/layout/MainTabBar";
import { extractPickLine } from "@/lib/utils/pickDescription";
import { EditPencilIcon, ShareIcon } from "@/components/ui/SvgIcons";
import { analyzeSlipPicks } from "@/lib/slips/pickConflicts";
import { getLeagueComboOddsSummary } from "@/lib/slips/groupComboOdds";
import SlipDetailsSkeleton from "@/components/skeletons/slips/SlipDetailsSkeleton";
import { fetchContestByIdRequest } from "@/lib/redux/slices/contestSlice";

interface FormErrors {
    name?: string;
}

type SlipTab = "picks" | "review" | "actions";

type PointsDraft = Record<string, string>;

const buildInitialPointsDraft = (
    picks: Pick[],
    mode: "global" | "leagueLeaderboard"
): PointsDraft =>
    picks.reduce<PointsDraft>((acc, pick) => {
        const normalized = normalizePickResult(pick.result);
        if (normalized === "pending") return acc;
        const fallbackPoints = getPickPoints(pick, mode);
        const pointsValue =
            typeof pick.points === "number" ? pick.points : fallbackPoints;
        acc[pick.id] = String(pointsValue);
        return acc;
    }, {});

const sortPicksByOdds = (picks: Pick[]) => {
    const sorted = [...picks];
    sorted.sort((a, b) => {
        const aValue = parseAmericanOdds(a.odds_bracket);
        const bValue = parseAmericanOdds(b.odds_bracket);
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return aValue - bValue;
    });
    return sorted;
};

const DEFAULT_SPORT = "NFL";
const WINDOW_DAY_OPTIONS = [1, 2, 3, 4, 5];
const deepJaggedStyle: CSSProperties & Record<"--jagged-valley" | "--jagged-tip", string> = {
    clipPath: JAGGED_CLIP_PATH,
    "--jagged-valley": "34px",
    "--jagged-tip": "0px",
};

const PICK_RESULT_ACCENTS = {
    win: {
        text: "text-emerald-200",
    },
    loss: {
        text: "text-rose-200",
    },
    void: {
        text: "text-amber-100",
    },
    not_found: {
        text: "text-amber-100",
    },
    pending: {
        text: "text-slate-200",
    },
} as const;

const SlipDetailsPage = () => {
    const dispatch = useDispatch();
    const isMobile = useIsMobile();
    const params = useParams<{ leagueId: string; slipId: string }>();
    const router = useRouter();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { slips, loading: slipLoader, message: slipMessage, error: slipError, deleteLoading, deleteMessage, deleteError } = useSelector((state: RootState) => state.slip);
    const { picks: pickList, loading: pickLoader, message: pickMessage, error: pickError } = useSelector((state: RootState) => state.pick);
    const { contest } = useSelector((state: RootState) => state.contest);
    const {
        group,
        leaderboard: leaderboardData,
        leaderboardList: leaderboardListData,
    } = useSelector((state: GroupSelector) => state.group);
    const activeSlip = group?.active_slip ?? null;
    const members = useMemo(() => group?.members ?? [], [group?.members]);

    const [windowDaysDraft, setWindowDaysDraft] = useState<number>(
        DEFAULT_ELIGIBLE_WINDOW_DAYS
    );

    useEffect(() => {
        if (typeof activeSlip?.window_days === "number") {
            setWindowDaysDraft(activeSlip.window_days);
        }
    }, [activeSlip?.window_days]);

    useEffect(() => {
        if (Array.isArray(leaderboardListData)) {
            setLeaderboardDataList(leaderboardListData)
        }
    }, [leaderboardData?.leaderboard, leaderboardListData]);

    useEffect(() => {
        if (!params.leagueId || !params.slipId || !currentUser) return

        dispatch(fetchGroupByIdRequest({ groupId: params.leagueId }));
        dispatch(fetchSlipByIdRequest({ slip_id: params.slipId }));
        dispatch(fetchAllLeaderboardsRequest({ group_id: params.leagueId }));
        dispatch(clearCreatePickMessage());
    }, [params.leagueId, currentUser, dispatch, params.slipId]);


    const slip = useMemo(() => {
        if (!Array.isArray(slips) || !params?.slipId) return undefined;
        return slips.find((candidate) => candidate.id === params.slipId)
    }, [params.slipId, slips]);

    useEffect(() => {
        if (slip?.contest_id) {
            dispatch(fetchContestByIdRequest({ contest_id: slip?.contest_id }));
        }
    }, [slip?.contest_id, dispatch]);

    const isFinalized = slip ? isSlipFinal(slip) : false;
    const secondaryLeaderboardsEnabled =
        group?.is_enable_secondary_leaderboard ?? false;
    const groupLeaderboards = useMemo(
        () => leaderboardDataList.filter((board) => board.group_id === group?.id),
        [group?.id, leaderboardDataList]
    );
    const activeSecondaryLeaderboards = useMemo(
        () =>
            secondaryLeaderboardsEnabled
                ? groupLeaderboards.filter(
                    (board) => !board.isDefault && board.status === "ACTIVE"
                )
                : [],
        [groupLeaderboards, secondaryLeaderboardsEnabled]
    );
    const currentSecondaryLeaderboard = useMemo(() => {
        if (!slip) return null;
        const sideId = (slip.leaderboard_ids ?? []).find((id) => {
            const board = groupLeaderboards.find((candidate) => candidate.id === id);
            return board && !board.isDefault;
        });
        return sideId
            ? groupLeaderboards.find((board) => board.id === sideId) ?? null
            : null;
    }, [groupLeaderboards, slip]);

    const [editingName, setEditingName] = useState(() => slip?.name ?? "");
    const [pickDeadlineDraft, setPickDeadlineDraft] = useState(
        () => slip?.pick_deadline_at ?? ""
    );
    const [pointsDraft, setPointsDraft] = useState<PointsDraft>({});
    const [activeTab, setActiveTab] = useState<SlipTab>("picks");
    const [isRenamingSlip, setIsRenamingSlip] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDeadlinesModalOpen, setIsDeadlinesModalOpen] = useState(false);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [reopenDeadlineDraft, setReopenDeadlineDraft] = useState("");
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [showScoringModal, setShowScoringModal] = useState(false);
    const [isSecondaryAssignOpen, setIsSecondaryAssignOpen] = useState(false);
    const [secondaryAssignDraft, setSecondaryAssignDraft] = useState("");
    const [isSecondaryAssignDropdownOpen, setIsSecondaryAssignDropdownOpen] = useState(false);
    const secondaryAssignDropdownRef = useRef<HTMLDivElement | null>(null);
    const [isSlateWindowDropdownOpen, setIsSlateWindowDropdownOpen] = useState(false);
    const slateWindowDropdownRef = useRef<HTMLDivElement | null>(null);
    const slateWindowButtonRef = useRef<HTMLButtonElement | null>(null);
    const [slateWindowMenuStyle, setSlateWindowMenuStyle] = useState<CSSProperties | null>(
        null
    );
    const [isDeleteSlipOpen, setIsDeleteSlipOpen] = useState(false);
    const [isDeleteSlipModalOpen, setIsDeleteSlipModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSlipModeInfoOpen, setIsSlipModeInfoOpen] = useState(false);

    const slipPicks = useMemo<Pick[]>(() => {
        if (!pickList) return [];
        if (!Array.isArray(pickList) || !slip?.id) return [];
        return pickList.filter(pick => pick.slip_id === slip.id);
    }, [pickList, slip?.id]);

    const slipConflictAnalysis = useMemo(
        () => analyzeSlipPicks(slipPicks),
        [slipPicks]
    );
    const groupComboOddsSummary = useMemo(
        () => getLeagueComboOddsSummary(slip, slipPicks),
        [slip, slipPicks]
    );
    const warningModeEnabled = slipShowsConflictWarnings(slip);
    const slipConflictIssues = useMemo(
        () => [
            ...slipConflictAnalysis.duplicates,
            ...(warningModeEnabled ? slipConflictAnalysis.warnings : []),
        ],
        [slipConflictAnalysis, warningModeEnabled]
    );
    const hasVisibleConflictWarnings =
        warningModeEnabled && slipConflictAnalysis.warnings.length > 0;

    const userLabelById = useMemo(
        () =>
            new Map(
                members.map((user) => [user.user_id, user.profiles?.username ?? "Member"])
            ),
        [members]
    );

    const scoringMode = slip?.isGraded ? "leagueLeaderboard" : "global";

    const userPicks = useMemo(
        () => slipPicks.filter((pick: Pick) => pick.user_id === currentUser?.userId),
        [slipPicks, currentUser?.userId]
    );
    const orderedUserPicks = useMemo(
        () => sortPicksByOdds(userPicks),
        [userPicks]
    );
    const secondaryAssignLabel = useMemo(() => {
        if (!secondaryAssignDraft) return "No secondary leaderboard";
        return (
            activeSecondaryLeaderboards.find((board) => board.id === secondaryAssignDraft)?.name ??
            "Secondary leaderboard"
        );
    }, [activeSecondaryLeaderboards, secondaryAssignDraft]);
    const slateWindowLabel = useMemo(
        () => `${windowDaysDraft} day${windowDaysDraft === 1 ? "" : "s"}`,
        [windowDaysDraft]
    );

    useEffect(() => {
        if (params.slipId && (activeTab === "picks" || activeTab === "review")) {
            dispatch(fetchAllPicksRequest({ slip_id: params.slipId }));
        }
    }, [params.slipId, dispatch, activeTab]);

    useEffect(() => {
        if (!pickLoader && pickMessage) {
            dispatch(clearUpdatePicksMessage());
            setToast({
                id: Date.now(),
                type: "success",
                message: pickMessage,
                duration: 3000,
            })
            if (params.slipId) {
                dispatch(fetchAllPicksRequest({ slip_id: params.slipId }));
            }
        }
        if (!pickLoader && pickError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: pickError,
                duration: 3000,
            })
            dispatch(clearUpdatePicksMessage());
        }
    }, [pickLoader, pickMessage, pickError, setToast, params.slipId, dispatch]);

    useEffect(() => {
        if (!slipLoader && slipMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: slipMessage,
                duration: 3000,
            })
            dispatch(clearUpdateSlipsMessage())
            // dispatch(fetchAllSlipsRequest({ group_id: params.leagueId }));
        }
        if (!slipLoader && slipError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: slipError,
                duration: 3000,
            })
            dispatch(clearUpdateSlipsMessage());
        }
    }, [setToast, slipLoader, slipMessage, slipError, dispatch, params.leagueId]);

    useEffect(() => {
        if (!deleteLoading && deleteMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: deleteMessage,
                duration: 3000,
            })
            dispatch(clearDeleteSlipMessage());
            if (params.leagueId) {
                router.replace(
                    contest?.id
                        ? `/league/${params.leagueId}/contests/${contest.id}`
                        : `/league/${params.leagueId}`
                );
            } else {
                router.replace('/fantasy');
            }
        }
        if (!deleteLoading && deleteError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: deleteError,
                duration: 3000,
            })
            dispatch(clearDeleteSlipMessage());
        }
    }, [setToast, deleteLoading, deleteMessage, deleteError, dispatch, params.leagueId, contest?.id, router]);

    useEffect(() => {
        if (!slip) return;
        setEditingName(slip.name);
        setPickDeadlineDraft(slip.pick_deadline_at);
        setWindowDaysDraft(slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS);
        setIsRenamingSlip(false);
        setIsReopenModalOpen(false);
        setReopenDeadlineDraft("");
        setIsFinalizeModalOpen(false);
        setIsSecondaryAssignOpen(false);
        setIsDeleteSlipModalOpen(false);
        setIsSlipModeInfoOpen(false);
        setIsSlateWindowDropdownOpen(false);
    }, [slip]);

    useEffect(() => {
        if (secondaryLeaderboardsEnabled) return;
        setIsSecondaryAssignOpen(false);
    }, [secondaryLeaderboardsEnabled]);

    useEffect(() => {
        if (!isSecondaryAssignOpen) {
            setIsSecondaryAssignDropdownOpen(false);
        }
    }, [isSecondaryAssignOpen]);

    useEffect(() => {
        if (!isSecondaryAssignDropdownOpen) return;
        const handler = (event: MouseEvent | TouchEvent) => {
            if (!secondaryAssignDropdownRef.current) return;
            if (!secondaryAssignDropdownRef.current.contains(event.target as Node)) {
                setIsSecondaryAssignDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, [isSecondaryAssignDropdownOpen]);

    useEffect(() => {
        if (activeTab !== "actions") {
            setIsSlateWindowDropdownOpen(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!isSlateWindowDropdownOpen) {
            setSlateWindowMenuStyle(null);
            return;
        }
        const updatePosition = () => {
            const button = slateWindowButtonRef.current;
            if (!button) return;
            const rect = button.getBoundingClientRect();
            const width = rect.width;
            const padding = 12;
            const maxLeft = window.innerWidth - width - padding;
            const left = Math.max(padding, Math.min(rect.left, maxLeft));
            const top = rect.bottom + 8;
            setSlateWindowMenuStyle({
                position: "fixed",
                top,
                left,
                width,
                zIndex: 60,
            });
        };
        const handler = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (slateWindowDropdownRef.current?.contains(target)) return;
            if (slateWindowButtonRef.current?.contains(target)) return;
            setIsSlateWindowDropdownOpen(false);
        };
        updatePosition();
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isSlateWindowDropdownOpen]);

    useEffect(() => {
        setPointsDraft(buildInitialPointsDraft(slipPicks, scoringMode));
    }, [scoringMode, slipPicks]);

    useEffect(() => {
        if (!group || !isSlipFinal(slip)) return;
        if (!slip) {
            router.replace(`/league/${group.id}`);
        }
        if (group.id && slip?.id) {
            router.replace(`/league/${group.id}/slips/${slip.id}/results`);
        }
    }, [group, slip, router]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const picksByMember = useMemo(() => {
        const map = new Map<string, Pick[]>();
        slipPicks.forEach((pick) => {
            const existing = map.get(pick.user_id);
            if (existing) {
                existing.push(pick);
            } else {
                map.set(pick.user_id, [pick]);
            }
        });
        map.forEach((list, key) => {
            map.set(key, sortPicksByOdds(list));
        });
        return map;
    }, [slipPicks]);

    // const matchupByGameId = useMemo(() => {
    //     const map = new Map<string, string>();

    //     slipPicks.forEach((pick) => {
    //         const gameId = pick.selection?.gameId;
    //         const matchup = extractMatchup(pick.description, pick.selection?.matchup);
    //         if (gameId && matchup && !map.has(gameId)) {
    //             map.set(gameId, matchup);
    //         }

    //         pick.legs?.forEach((leg) => {
    //             const legGameId = leg.selection?.gameId;
    //             const legMatchup = extractMatchup(leg.description, leg.selection?.matchup);
    //             if (legGameId && legMatchup && !map.has(legGameId)) {
    //                 map.set(legGameId, legMatchup);
    //             }
    //         });
    //     });

    //     return map;
    // }, [slipPicks]);

    const preflightIsCommissioner = group?.created_by === currentUser?.userId;
    const preflightIsCreator = slip?.created_by === currentUser?.userId;
    const preflightIsContestManager = contest?.created_by === currentUser?.userId;
    // const isVibeSlip = Boolean(slip && !slip.isGraded && slip.slip_type === "vibe");
    const availableSports = Array.isArray(slip?.sports) && slip.sports.length > 0
        ? slip.sports
        : [DEFAULT_SPORT];
    const showReviewTab = Boolean(slip && slip.isGraded && (preflightIsCommissioner || preflightIsContestManager) && isSlipTimeLocked(slip));
    const showActionsTab = Boolean(
        slip && (preflightIsCommissioner || preflightIsContestManager || (!slip.isGraded && preflightIsCreator))
    );
    const tabs = useMemo<{ id: SlipTab; label: string }[]>(() => {
        const baseTabs: { id: SlipTab; label: string }[] = [
            { id: "picks", label: "League picks" },
        ];
        if (showReviewTab) {
            baseTabs.push({ id: "review", label: "Slip review" });
        }
        if (showActionsTab) {
            baseTabs.push({ id: "actions", label: "Slip actions" });
        }
        return baseTabs;
    }, [showReviewTab, showActionsTab]);

    useEffect(() => {
        if (!showReviewTab && activeTab === "review") {
            setActiveTab("picks");
        }
        if (!showActionsTab && activeTab === "actions") {
            setActiveTab("picks");
        }
    }, [activeTab, showActionsTab, showReviewTab]);

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!editingName?.trim()) {
            nextErrors.name = "Slip name is required.";
        }

        if (editingName.length > 25) {
            nextErrors.name = "Slip name must be 25 characters or less.";
        }

        const containsNameRestricted = checkAnyRestrictedWords(editingName);
        if (containsNameRestricted) {
            nextErrors.name = "Slip name contains inappropriate language.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [editingName]);

    if (slipLoader || !group || !currentUser || !slip) {
        return <SlipDetailsSkeleton />;
    }

    if (isFinalized) {
        return null;
    }

    const windowDays = slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS;
    const isCommissioner = group.created_by === currentUser.userId;
    const isCreator = slip.created_by === currentUser.userId;
    const isContestManager = contest?.created_by === currentUser.userId;
    const hasVibeControl = !slip.isGraded && isCreator;
    const hasReviewControl = isCommissioner || isContestManager || hasVibeControl;
    const limitValue = slip.pick_limit === "unlimited" ? Infinity : slip.pick_limit;
    const isTimeLocked = isSlipTimeLocked(slip);
    const canManagePicks = canUserEditSlipPicks(slip);
    const canAddPick = canManagePicks && userPicks.length < limitValue;
    const canReview = canCommissionerReview(slip);
    const canAdjustPoints = (isCommissioner || isContestManager) && canReview;
    const canResetScoring = canAdjustPoints;
    const canReopen = hasReviewControl && isTimeLocked && !isFinalized;
    const canFinalizeSlip = canFinalize(slip, {
        isCommissioner: hasReviewControl,
        picks: slipPicks,
    });
    const canRenameSlip = isCommissioner || isContestManager || (!slip.isGraded && isCreator);
    const canEditDeadlines =
        (isCommissioner || isContestManager || (!slip.isGraded && isCreator)) && canManagePicks;
    const canEditWarningMode = slip.isGraded && (isCommissioner || isContestManager) && canManagePicks;
    const canAssignSecondaryLeaderboard =
        isCommissioner &&
        secondaryLeaderboardsEnabled &&
        slip.isGraded &&
        !isFinalized;
    const pickDeadlineTime = new Date(slip.pick_deadline_at).getTime();
    const activeWindowDays = windowDaysDraft ?? windowDays;
    const eligibilityWindowEnd = eligibleWindowEnd(
        pickDeadlineDraft || slip.pick_deadline_at,
        activeWindowDays
    );
    const pickDeadlinePassed = Number.isFinite(pickDeadlineTime)
        ? Date.now() >= pickDeadlineTime
        : false;
    const showReviewSection = canReview;
    const totalMembers = members.length;
    const isUnlimitedPickLimit = slip.pick_limit === "unlimited";
    const totalPossiblePicks = isUnlimitedPickLimit ? Infinity : Number(slip.pick_limit) * totalMembers;
    const picksSubmitted = slipPicks.length;
    const winPickCount = slipPicks.filter(
        (pick) => normalizePickResult(pick.result) === "win"
    ).length;
    const allPicksIn =
        totalPossiblePicks !== Infinity && picksSubmitted >= totalPossiblePicks;
    const perMemberLimitLabel = isUnlimitedPickLimit
        ? "Unlimited per member"
        : `${slip.pick_limit} per member`;
    const totalPossibleLabel = isUnlimitedPickLimit
        ? `${picksSubmitted} picks added`
        : `${picksSubmitted}/${totalPossiblePicks} picks added`;
    const pickProgressPercent =
        totalPossiblePicks === Infinity
            ? picksSubmitted > 0
                ? 100
                : 0
            : Math.min(100, (picksSubmitted / totalPossiblePicks) * 100);
    const resultsProgressPercent =
        picksSubmitted > 0 ? Math.min(100, (winPickCount / picksSubmitted) * 100) : 0;
    const showResultsProgress = isTimeLocked;
    const showCompletionCheck = showResultsProgress
        ? allPicksIn && picksSubmitted > 0 && winPickCount === picksSubmitted
        : allPicksIn;
    const showProgressBar = slip.isGraded || isTimeLocked;
    const progressTitle = showResultsProgress ? "result progress" : "pick progress";
    const progressLabel = showResultsProgress
        ? picksSubmitted > 0
            ? `${winPickCount}/${picksSubmitted} wins`
            : "No picks submitted"
        : totalPossibleLabel;
    const deadlineLabel = pickDeadlinePassed ? "Locked at" : "Pick deadline";
    const deadlineVariant = pickDeadlinePassed ? "alert" : "default";
    const currentWarningMode = getSlipConflictWarningMode(slip);
    const userMember = members.find(
        m => m.user_id === currentUser.userId
    );
    // const userProfilePictureLink = userMember?.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${userMember?.profiles?.profile_image}` : undefined;
    const userProfilePictureLink = generateProfileImageUrl(userMember?.profiles?.profile_image);
    const userPickLabel = orderedUserPicks.length > 1 ? "Your picks" : "Your pick";
    const addPickLabel = userPicks.length > 0 ? "Add another pick" : "Add your pick";
    const addPickCardLabel = canAddPick
        ? addPickLabel
        : !canManagePicks
            ? "Picks locked"
            : "Pick limit reached";
    const showAddPickCard = canManagePicks && (userPicks.length === 0 || canAddPick);
    const noPickHelper =
        canManagePicks
            ? "No pick yet."
            : "pick not submitted before slip deadline";
    const deadlineStatusHint = !canEditDeadlines
        ? slip.isGraded
            ? "Deadline is locked. Use Reopen slip in Review to reset picks and set a new deadline."
            : "Deadline is locked for this vibe slip. Use Reopen to reset picks and set a new deadline."
        : null;

    const handleResetScoring = () => {
        if (!canResetScoring) return;
        if (slip.id) {
            dispatch(resetPicksScoringPointsRequest({ slip_id: slip.id }));
        }
    };

    const openFinalizeModal = () => {
        if (!canFinalizeSlip) return;
        setIsFinalizeModalOpen(true);
    };

    const closeFinalizeModal = () => setIsFinalizeModalOpen(false);

    const handleFinalizeSlip = (event?: FormEvent) => {
        event?.preventDefault();
        if (!canFinalizeSlip) return;
        if (slip.id && group.id) {
            dispatch(markFinalizeSlipRequest({ slip_id: slip.id, group_id: group.id }));
        }
        setIsFinalizeModalOpen(false);
    };

    const openReopenModal = () => {
        if (!canReopen) return;
        const nextDefault = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        setReopenDeadlineDraft(nextDefault);
        setIsReopenModalOpen(true);
    };

    const openDeleteSlipModal = () => setIsDeleteSlipModalOpen(true);

    const closeDeleteSlipModal = () => setIsDeleteSlipModalOpen(false);

    const handleDeleteSlip = (event?: FormEvent) => {
        if (!group || !currentUser) return;
        event?.preventDefault();
        if (slip.id) {
            dispatch(deleteSlipRequest({ slip_id: slip.id }));
        }
        setIsDeleteSlipModalOpen(false);
    };

    const handleDeadlineSave = (event: FormEvent) => {
        event.preventDefault();
        if (!canEditDeadlines) return;
        if (slip.pick_deadline_at === pickDeadlineDraft && slip.window_days === activeWindowDays) return;

        if (slip.id && group.id) {
            dispatch(updateSlipsRequest({ group_id: group.id, slip_id: slip.id, pick_deadline_at: pickDeadlineDraft, windowDays: activeWindowDays }));
        }
    };

    const handleWarningModeChange = (nextMode: "competition" | "group_combo") => {
        if (!canEditWarningMode || currentWarningMode === nextMode) return;
        if (slip.id && nextMode) {
            dispatch(updateSlipConflictModeRequest({ slip_id: slip.id, conflictWarningMode: nextMode }));
        }
    };

    const startRenameSlip = () => {
        setEditingName(slip.name);
        setIsRenamingSlip(true);
    };

    const cancelRenameSlip = () => {
        setEditingName(slip.name);
        setIsRenamingSlip(false);
        setErrors({});
    };

    const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;
        const trimmedName = editingName.trim();
        if (slip.id && group.id) {
            dispatch(updateSlipsRequest({ group_id: group.id, slip_id: slip.id, name: trimmedName }));
        }
        setIsRenamingSlip(false);
    };

    const closeReopenModal = () => setIsReopenModalOpen(false);

    const openSecondaryAssign = () => {
        if (!canAssignSecondaryLeaderboard) return;
        const currentId = currentSecondaryLeaderboard?.id ?? "";
        const safeId = activeSecondaryLeaderboards.some((board) => board.id === currentId)
            ? currentId
            : "";
        setSecondaryAssignDraft(safeId);
        setIsSecondaryAssignOpen(true);
    };

    const closeSecondaryAssign = () => setIsSecondaryAssignOpen(false);

    const handleSecondaryAssignSave = (event: FormEvent) => {
        event.preventDefault();
        if (!canAssignSecondaryLeaderboard) return;
        if (slip.id) {
            dispatch(assignToSecondaryLeaderboardRequest({ slip_id: slip.id, leaderboard_id: secondaryAssignDraft || null }))
        }
        setIsSecondaryAssignOpen(false);
    };

    const handleReopenSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (slip.id && group.id) {
            dispatch(reOpenSlipRequest({ slip_id: slip.id, newPickDeadline: reopenDeadlineDraft }));
        }
        setIsReopenModalOpen(false);
    };

    const handlePointsDraftChange = (pickId: string, value: string) => {
        setPointsDraft((prev) => ({ ...prev, [pickId]: value }));
    };

    const debouncedUpdatePoints = (pickId: string, value: number, pick: Pick) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const gradingPayload: GradingPayload = [
                {
                    id: pickId,
                    points: value,
                    bonus: 0,
                    result: pick.result,
                },
            ];

            if (group?.id && slip.id) {
                dispatch(
                    updatePicksRequest({
                        grading: gradingPayload,
                        group_id: group.id,
                        slip_id: slip.id,
                    })
                );
            }
        }, 500);
    };

    const persistAwardedPoints = (pickId: string, pick: Pick) => {
        if (!canAdjustPoints) return;
        const raw = pointsDraft[pickId];
        if (raw === undefined) return;
        const trimmed = raw.trim();
        if (!trimmed) {
            setPointsDraft(buildInitialPointsDraft(slipPicks, scoringMode));
            return;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Enter a valid points value.",
                duration: 3000
            });
            setPointsDraft(buildInitialPointsDraft(slipPicks, scoringMode));
            return;
        }
        if (pick.points === parsed) return;
        const gradingPayload: GradingPayload = [{
            id: pick.id,
            points: parsed,
            bonus: 0,
            result: pick.result,
        }]
        setPointsDraft(buildInitialPointsDraft(slipPicks, scoringMode));
        if (group?.id && slip.id) dispatch(updatePicksRequest({ grading: gradingPayload, group_id: group?.id, slip_id: slip.id }));
    };

    const startAddFlow = () => {
        if (!canAddPick) return;
        router.push(`/league/${group.id}/slips/${slip.id}/add-pick`);
    };

    const handleDeletePick = (pick: Pick) => {
        if (!canManagePicks) return;
        if (pick.id) {
            dispatch(deletePickRequest({ pick_id: pick.id }));
        }
    };

    const sortedMembers = members
        .filter((user): user is NonNullable<typeof user> => Boolean(user));
    const orderedMembers = [...sortedMembers].sort((a, b) => {
        const aName = a.profiles?.username ?? "";
        const bName = b.profiles?.username ?? "";
        return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });
    const otherMembers = orderedMembers.filter((member) => member.user_id !== currentUser.userId);
    const reviewMembers = orderedMembers.map((member) => ({
        member,
        picks: member.user_id ? picksByMember.get(member.user_id) ?? [] : [],
    }));
    const hasReviewPicks = reviewMembers.some(({ picks }) => picks.length > 0);
    const formatResultLabel = (result: ReturnType<typeof normalizePickResult>) =>
        result === "not_found" ? "n/a" : result;
    const resultTone = (result: ReturnType<typeof normalizePickResult>) => {
        if (result === "win") {
            return "border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40 text-emerald-100";
        }
        if (result === "loss") {
            return "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 text-rose-100";
        }
        if (result === "void" || result === "not_found") {
            return "border-yellow-300/60 bg-yellow-500/15 text-yellow-100";
        }
        return "border-white/10 bg-white/5 text-gray-300";
    };
    const pickCardTone = (result: ReturnType<typeof normalizePickResult>) => {
        if (result === "win") {
            return "border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-emerald-400/5 to-black/40";
        }
        if (result === "loss") {
            return "border-rose-400/30 bg-gradient-to-br from-rose-500/20 via-rose-400/5 to-black/40";
        }
        if (result === "void" || result === "not_found") {
            return "border-yellow-300/30 bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-black/40";
        }
        return "border-white/10 bg-white/[0.04]";
    };
    const pointsTextTone = (result: ReturnType<typeof normalizePickResult>) => {
        if (result === "win") return "text-emerald-100";
        if (result === "loss") return "text-red-100";
        if (result === "void" || result === "not_found") return "text-yellow-100";
        return "text-gray-300";
    };

    if (slipLoader) {
        return (
            <SlipDetailsSkeleton />
        )
    }

    return (
        <div className="flex flex-col gap-6 pb-12">
            <section
                style={deepJaggedStyle}
                className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-950/85 via-slate-900/60 to-blue-300/30 p-[1.5px] shadow-lg"
            >
                <div
                    style={{ clipPath: JAGGED_CLIP_PATH }}
                    className="relative overflow-hidden rounded-[30px] bg-slate-950/45"
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-950/60 to-slate-800/35"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.65),transparent_65%)]"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 via-slate-900/40 to-transparent"
                    />
                    <div className="relative z-10 flex flex-col gap-6 p-5 pb-32 sm:p-6 sm:pb-36">
                        <BackButton
                            fallback={
                                contest?.id
                                    ? `/league/${group.id}/contests/${contest.id}`
                                    : `/league/${group.id}`
                            }
                            preferFallback
                            className="self-start"
                        />
                        <header className="space-y-2 border-b border-white/10 pb-4">
                            <div className="flex min-w-0 flex-nowrap items-center gap-10">
                                <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold text-white sm:text-3xl">
                                    {slip.name}
                                </h1>
                                {canRenameSlip && (
                                    <button
                                        type="button"
                                        onClick={startRenameSlip}
                                        className="ui-accent-outline-hover inline-flex flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition"
                                        aria-label="Edit slip name"
                                    >
                                        <EditPencilIcon />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                                <span>
                                    Leagues: <span className="text-white">{availableSports.join(", ")}</span>
                                </span>
                                <span className="text-gray-600">•</span>
                                <span
                                    className={`font-semibold uppercase tracking-wide underline underline-offset-4 ${deadlineVariant === "alert" ? "text-red-200" : "text-gray-400"
                                        }`}
                                >
                                    {deadlineLabel}
                                </span>
                                <span className="text-gray-600">:</span>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                    <span
                                        className={deadlineVariant === "alert" ? "text-red-100" : "text-white"}
                                    >
                                        {formatDateTime(slip.pick_deadline_at)}
                                    </span>
                                    <span className="text-[10px] text-gray-600">•</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsShareModalOpen(true)}
                                        aria-label="Share slip"
                                        title="Share slip"
                                        className="inline-flex h-4 w-4 items-center justify-center text-gray-400 transition hover:text-white"
                                    >
                                        <ShareIcon />
                                    </button>
                                </span>
                            </div>
                        </header>

                        <section className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                                <div className="flex flex-nowrap items-center gap-4 sm:gap-6">
                                    {tabs.map((tab) => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`border-b-2 pb-1 text-[14px] font-semibold uppercase tracking-wide transition sm:text-[14px] ${isActive
                                                    ? "border-white text-white"
                                                    : "border-transparent text-gray-400 hover:border-white/40 hover:text-white"
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {activeTab === "picks" && (
                                <div className="space-y-6">
                                    {showProgressBar && (
                                        <section className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-300">
                                                <span>{progressTitle}</span>
                                                <span>{progressLabel}</span>
                                            </div>
                                            <div className="relative mt-2 h-2 w-full rounded-full bg-white/10">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${showResultsProgress ? "bg-emerald-500/85" : "bg-blue-700/85"
                                                        }`}
                                                    style={{
                                                        width: `${showResultsProgress ? resultsProgressPercent : pickProgressPercent}%`,
                                                    }}
                                                />
                                                {totalMembers > 1 && (
                                                    <div className="pointer-events-none absolute inset-0">
                                                        {Array.from({ length: totalMembers - 1 }, (_, index) => {
                                                            const left = ((index + 1) / totalMembers) * 100;
                                                            return (
                                                                <div
                                                                    key={`notch-${index + 1}`}
                                                                    className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 rounded-full bg-white/80"
                                                                    style={{ left: `${left}%` }}
                                                                />
                                                            );
                                                        })}
                                                        {showCompletionCheck ? (
                                                            <div className="absolute right-0 top-1/2 flex h-4 w-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900 shadow-[0_0_6px_rgba(255,255,255,0.35)]">
                                                                ✓
                                                            </div>
                                                        ) : (
                                                            <div className="absolute right-0 top-1/2 h-2 w-[2px] -translate-y-1/2 rounded-full bg-white/80" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">
                                                {perMemberLimitLabel} · {totalMembers} member{totalMembers === 1 ? "" : "s"}
                                            </p>
                                        </section>
                                    )}
                                    {groupComboOddsSummary && (
                                        <section className="flex justify-end">
                                            <p className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                <span>
                                                    League Combo+ odds:
                                                </span>
                                                <span className="ml-2 text-sm font-bold text-cyan-100">
                                                    {groupComboOddsSummary.label}
                                                </span>
                                            </p>
                                        </section>
                                    )}
                                    <section className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100">
                                                    {userProfilePictureLink ? (
                                                        <Image
                                                            src={userProfilePictureLink}
                                                            alt="Profile image"
                                                            width={56}
                                                            height={56}
                                                            className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                                            draggable={false}
                                                            onDragStart={(e) => e.preventDefault()}
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white">{userPickLabel}</p>
                                                </div>
                                            </div>
                                            <PickLimitIndicator used={userPicks.length} limit={slip.pick_limit} />
                                        </div>

                                        <div className="space-y-3">
                                            {orderedUserPicks.length > 0 && (
                                                <PickListCard
                                                    picks={orderedUserPicks}
                                                    slipStatus={slip.status}
                                                    showComboPickCount={slip.isGraded}
                                                    expandComboLegs={!slip.isGraded}
                                                    canManage={canManagePicks}
                                                    onDeletePick={handleDeletePick}
                                                    highlightResults={isTimeLocked}
                                                />
                                            )}

                                            {showAddPickCard && (
                                                <button
                                                    type="button"
                                                    onClick={startAddFlow}
                                                    disabled={!canAddPick}
                                                    className={`flex w-full items-center justify-between rounded-2xl border border-dashed px-4 py-3 text-left text-sm transition ${canAddPick
                                                        ? "border-sky-400/40 bg-slate-950/60 text-sky-100 hover:border-sky-300/70"
                                                        : "border-white/10 bg-white/5 text-gray-500"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold">{addPickCardLabel}</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg ${canAddPick
                                                            ? "border-sky-400/50 bg-sky-500/10 text-sky-100"
                                                            : "border-white/10 bg-white/5 text-gray-500"
                                                            }`}
                                                    >
                                                        +
                                                    </div>
                                                </button>
                                            )}

                                            {orderedUserPicks.length === 0 && !showAddPickCard && (
                                                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-xs text-gray-400">
                                                    {noPickHelper}
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-white">Your league&apos;s picks</p>
                                            <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                                {perMemberLimitLabel}
                                            </span>
                                        </div>

                                        {otherMembers.length === 0 ? (
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400">
                                                No other members yet.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {otherMembers.map((member) => {
                                                    const picks = member.user_id ? picksByMember.get(member.user_id) : [];
                                                    const displayName = member.profiles?.username ?? "Member";
                                                    // const initials = getMemberInitials(displayName);
                                                    const memberProfilePicture = generateProfileImageUrl(member.profiles?.profile_image);

                                                    return (
                                                        <div key={member.id} className="space-y-2">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex min-w-0 items-center gap-3">
                                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100">
                                                                        {memberProfilePicture ? (
                                                                            <Image
                                                                                src={memberProfilePicture}
                                                                                alt="Profile image"
                                                                                width={56}
                                                                                height={56}
                                                                                className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                                                                draggable={false}
                                                                                onDragStart={(e) => e.preventDefault()}
                                                                                unoptimized
                                                                            />
                                                                        ) : (
                                                                            <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-white">
                                                                            {displayName}
                                                                        </p>
                                                                        {picks?.length && picks?.length > 0 && (
                                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                                                                {`${picks?.length} pick${picks?.length === 1 ? "" : "s"}`}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <PickLimitIndicator used={picks?.length ?? 0} limit={slip.pick_limit} />
                                                            </div>

                                                            <div className="space-y-2">
                                                                {(!picks || picks?.length === 0) ? (
                                                                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-xs text-gray-400">
                                                                        {noPickHelper}
                                                                    </div>
                                                                ) : (
                                                                    <PickListCard
                                                                        picks={picks}
                                                                        slipStatus={slip.status}
                                                                        showComboPickCount={slip.isGraded}
                                                                        expandComboLegs={!slip.isGraded}
                                                                        highlightResults={isTimeLocked}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    {slipConflictIssues.length > 0 && (
                                        <section className="space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-white">Slip checks</p>
                                                    {canEditWarningMode && hasVisibleConflictWarnings && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTab("actions")}
                                                            className="text-[11px] font-medium text-amber-200 transition hover:text-amber-100"
                                                        >
                                                            turn off?
                                                        </button>
                                                    )}
                                                </div>
                                                <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                                    {slipConflictIssues.length} flagged
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {slipConflictIssues.map((issue) => {
                                                    const isDuplicate = issue.type === "duplicate";
                                                    const issueLabel = isDuplicate
                                                        ? "Duplicate pick"
                                                        : issue.type === "contradiction"
                                                            ? "Contradictory picks"
                                                            : "Overlapping picks";
                                                    const detail = isDuplicate
                                                        ? "This exact selection appears more than once on the slip."
                                                        : issue.type === "contradiction"
                                                            ? "These selections push against each other on the same market."
                                                            : "these selections cover the same outcome space and should be reviewed";
                                                    const tone = isDuplicate
                                                        ? "border-rose-400/30 bg-rose-950/25 text-rose-100"
                                                        : "border-amber-400/30 bg-amber-950/25 text-amber-100";
                                                    const leftOwner = issue.left.userId
                                                        ? userLabelById.get(issue.left.userId) ?? "Member"
                                                        : "Member";
                                                    const rightOwner = issue.right.userId
                                                        ? userLabelById.get(issue.right.userId) ?? "Member"
                                                        : "Member";

                                                    return (
                                                        <div key={issue.key} className={`rounded-2xl border p-3 ${tone}`}>
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide">
                                                                {issueLabel}
                                                            </p>
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-xs font-semibold">
                                                                    {leftOwner}: {extractPickLine(issue.left.description)}
                                                                </p>
                                                                <p className="text-xs font-semibold">
                                                                    {rightOwner}: {extractPickLine(issue.right.description)}
                                                                </p>
                                                                <p
                                                                    className={`pt-1 text-[11px] ${issue.type === "overlap" ? "text-red-200" : "opacity-80"
                                                                        }`}
                                                                >
                                                                    {detail}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}


                            {activeTab === "actions" && showActionsTab && (
                                <div className="space-y-5">
                                    <div className="grid gap-4">
                                        {isCreator || isCommissioner ? (
                                            <div className="space-y-4">
                                                <div className="grid gap-4">
                                                    <form
                                                        onSubmit={handleDeadlineSave}
                                                        className="space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                                                    Edit timings
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsDeadlinesModalOpen(true)}
                                                                    className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold text-gray-300 transition hover:border-white/40 hover:text-white"
                                                                    aria-label="How deadlines work"
                                                                >
                                                                    i
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-3">
                                                            <DateTimeWheelPicker
                                                                label="pick deadline"
                                                                value={pickDeadlineDraft}
                                                                onChange={setPickDeadlineDraft}
                                                                disabled={!canEditDeadlines}
                                                                disablePast
                                                            />
                                                            <label className="flex flex-col gap-1 text-xs text-gray-400">
                                                                slate window
                                                                <div className="relative sm:hidden">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setIsSlateWindowDropdownOpen((prev) => !prev)
                                                                        }
                                                                        ref={slateWindowButtonRef}
                                                                        disabled={!canEditDeadlines}
                                                                        className="ui-input-accent flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black px-3 py-2 text-left text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
                                                                        aria-haspopup="listbox"
                                                                        aria-expanded={isSlateWindowDropdownOpen}
                                                                        aria-controls="slate-window-options"
                                                                    >
                                                                        <span className="min-w-0 flex-1 truncate">
                                                                            {slateWindowLabel}
                                                                        </span>
                                                                        <span className="text-sm text-gray-300">
                                                                            {isSlateWindowDropdownOpen ? "▴" : "▾"}
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                                {isSlateWindowDropdownOpen &&
                                                                    slateWindowMenuStyle &&
                                                                    typeof document !== "undefined" &&
                                                                    createPortal(
                                                                        <div
                                                                            ref={slateWindowDropdownRef}
                                                                            style={slateWindowMenuStyle}
                                                                            className="rounded-2xl border border-white/20 bg-black text-left shadow-[0_18px_45px_rgba(0,0,0,0.6)]"
                                                                        >
                                                                            <ul id="slate-window-options" role="listbox" className="py-1">
                                                                                {WINDOW_DAY_OPTIONS.map((option) => {
                                                                                    const isSelected = windowDaysDraft === option;
                                                                                    return (
                                                                                        <li key={option}>
                                                                                            <button
                                                                                                type="button"
                                                                                                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5 ${isSelected
                                                                                                    ? "text-sky-100"
                                                                                                    : "text-gray-200"
                                                                                                    }`}
                                                                                                onClick={() => {
                                                                                                    setWindowDaysDraft(option);
                                                                                                    setIsSlateWindowDropdownOpen(false);
                                                                                                }}
                                                                                                role="option"
                                                                                                aria-selected={isSelected}
                                                                                            >
                                                                                                <span className="min-w-0 flex-1 truncate">
                                                                                                    {option} day{option === 1 ? "" : "s"}
                                                                                                </span>
                                                                                                {isSelected && (
                                                                                                    <span className="text-sky-200">•</span>
                                                                                                )}
                                                                                            </button>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </div>,
                                                                        document.body
                                                                    )
                                                                }
                                                                <select
                                                                    value={windowDaysDraft}
                                                                    onChange={(event) => setWindowDaysDraft(Number(event.target.value))}
                                                                    disabled={!canEditDeadlines}
                                                                    className="ui-input-accent hidden rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-60 sm:block"
                                                                >
                                                                    {WINDOW_DAY_OPTIONS.map((option) => (
                                                                        <option key={option} value={option}>
                                                                            {option} day{option === 1 ? "" : "s"}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                            <p className="text-[11px] text-gray-400">
                                                                Eligible games start after this deadline and within the next{" "}
                                                                {activeWindowDays} day{activeWindowDays === 1 ? "" : "s"} (
                                                                {formatDateTime(eligibilityWindowEnd ?? "")} latest start).
                                                            </p>
                                                            {deadlineStatusHint && (
                                                                <p className="text-[11px] text-amber-200">{deadlineStatusHint}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            {!slip.isGraded && (
                                                                <button
                                                                    type="button"
                                                                    onClick={openReopenModal}
                                                                    disabled={!canReopen}
                                                                    className="ui-accent-button rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    reopen
                                                                </button>
                                                            )}
                                                            <button
                                                                type="submit"
                                                                disabled={!canEditDeadlines}
                                                                className="ui-accent-button rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                update deadlines
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400">
                                                <p className="font-semibold uppercase tracking-wide text-gray-300">Slip basics</p>
                                                <p>Only the creator or commissioner can rename the slip or edit deadlines.</p>
                                            </div>
                                        )}

                                        {canEditWarningMode && <div className="h-px w-full bg-white/10" />}

                                        {canEditWarningMode && (
                                            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs uppercase tracking-wide text-gray-400">Slip mode</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsSlipModeInfoOpen((prev) => !prev)}
                                                            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold text-gray-300 transition hover:border-white/40 hover:text-white"
                                                            aria-label="How slip mode works"
                                                            aria-expanded={isSlipModeInfoOpen}
                                                        >
                                                            i
                                                        </button>
                                                    </div>
                                                    {isSlipModeInfoOpen && (
                                                        <p className="text-xs text-gray-500">
                                                            League Combo+ mode shows overlapping and contradictory same-slip pick
                                                            warnings inside the builder and on the slip. Competition mode hides those
                                                            warnings.
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="inline-flex w-full rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                                                    {[
                                                        {
                                                            id: "group_combo" as const,
                                                            label: "League Combo+",
                                                            detail: "Warnings on",
                                                        },
                                                        {
                                                            id: "competition" as const,
                                                            label: "Competition",
                                                            detail: "Warnings off",
                                                        },
                                                    ].map((option) => {
                                                        const isActive = currentWarningMode === option.id;
                                                        return (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => handleWarningModeChange(option.id)}
                                                                aria-pressed={isActive}
                                                                className={`flex flex-1 flex-col items-start rounded-[14px] px-3 py-2 text-left transition ${isActive
                                                                    ? "bg-sky-500/15 text-white shadow-[inset_0_0_0_1px_rgba(147,197,253,0.35)]"
                                                                    : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                                                                    }`}
                                                            >
                                                                <p className="text-xs font-semibold leading-tight">{option.label}</p>
                                                                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                                                    {option.detail}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {canAssignSecondaryLeaderboard && (isCreator || isCommissioner) && (
                                            <div className="h-px w-full bg-white/10" />
                                        )}

                                        {canAssignSecondaryLeaderboard && (
                                            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-xs uppercase tracking-wide text-gray-400">
                                                            Secondary leaderboard
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {currentSecondaryLeaderboard
                                                                ? `Currently: ${currentSecondaryLeaderboard.name}`
                                                                : "No secondary leaderboard assigned yet."}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={openSecondaryAssign}
                                                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-sky-300/60 hover:text-white"
                                                    >
                                                        Assign to secondary leaderboard
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {(isCreator || isCommissioner) && (
                                        <>
                                            <div className="h-px w-full bg-white/10" />
                                            <section className="pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDeleteSlipOpen((prev) => !prev)}
                                                    aria-expanded={isDeleteSlipOpen}
                                                    aria-controls="delete-slip-content"
                                                    className="flex w-full items-start justify-between gap-4 text-left"
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-sm uppercase tracking-wide text-red-300">Delete slip</p>
                                                    </div>
                                                    <span className="text-red-200">{isDeleteSlipOpen ? "▴" : "▾"}</span>
                                                </button>
                                                {isDeleteSlipOpen && (
                                                    <div id="delete-slip-content" className="mt-4 space-y-3">
                                                        <p className="text-xs text-red-100">
                                                            delete this slip and remove all picks tied to it.
                                                        </p>
                                                        <p className="text-xs text-red-200">
                                                            This cannot be undone. Members will lose access to the slip, their picks,
                                                            and any leaderboard impact from this card.
                                                        </p>
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={openDeleteSlipModal}
                                                                className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/70 via-red-700/40 to-black/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-red-400/40 hover:from-red-800/80 hover:via-red-600/50"
                                                            >
                                                                Delete slip
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === "review" && showReviewTab && (
                                <div className="space-y-5">
                                    <section className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs uppercase tracking-wide text-gray-400">
                                                            Review &amp; grading
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowScoringModal(true)}
                                                            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold text-gray-300 transition hover:border-white/40 hover:text-white"
                                                            aria-label="League scoring"
                                                        >
                                                            i
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {isTimeLocked
                                                            ? "Slip is locked by the pick deadline. Adjust awarded points, or reset them back to the default scoring."
                                                            : "Review unlocks once the pick deadline passes."}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex w-full flex-nowrap items-center gap-2">
                                                <ActionButton
                                                    label="Reset"
                                                    onClick={handleResetScoring}
                                                    disabled={!canResetScoring || pickLoader}
                                                    className="flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap border-sky-400/40 bg-gradient-to-br from-sky-500/30 via-sky-400/10 to-black/40 px-3 py-2 text-[11px] text-sky-100 hover:border-sky-300/70 hover:text-white"
                                                />
                                                <ActionButton
                                                    label="Reopen"
                                                    onClick={openReopenModal}
                                                    disabled={!canReopen}
                                                    className="flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 px-3 py-2 text-[11px] text-rose-100 hover:border-rose-300/70 hover:text-white"
                                                />
                                                <ActionButton
                                                    label="Finalize"
                                                    onClick={openFinalizeModal}
                                                    disabled={!canFinalizeSlip}
                                                    className="flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap border-sky-400/40 bg-gradient-to-br from-sky-500/30 via-sky-400/10 to-black/40 px-3 py-2 text-[11px] text-sky-100 hover:border-sky-300/70 hover:text-white"
                                                />
                                            </div>
                                        </div>
                                        {!isTimeLocked && (
                                            <p className="text-xs text-gray-500">
                                                Picks stay editable until the deadline hits. The slip locks automatically.
                                            </p>
                                        )}
                                    </section>
                                    <div className="h-px w-full bg-white/10" />

                                    {showReviewSection ? (
                                        <section className="space-y-4">
                                            <div className="flex justify-end text-xs font-semibold text-sky-100">
                                                Changes save automatically, finalize when finished.
                                            </div>

                                            {!hasReviewPicks ? (
                                                <p className="text-sm text-gray-400">No picks to review yet.</p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {reviewMembers.map(({ member, picks }) => {
                                                        const displayName = member.profiles?.username ?? "Member";
                                                        const headerPick = picks[0];
                                                        const headerResult = headerPick
                                                            ? normalizePickResult(headerPick.result)
                                                            : "pending";
                                                        const headerIsPending = headerResult === "pending";
                                                        const headerPointsValue = headerPick
                                                            ? pointsDraft[headerPick.id] ??
                                                            (headerIsPending ? "" : String(getPickPoints(headerPick, scoringMode)))
                                                            : "";
                                                        const headerPointsDisabled = !canAdjustPoints || headerIsPending;
                                                        const headerParsedPoints = Number(headerPointsValue);
                                                        const headerCurrentPoints =
                                                            headerPick && Number.isFinite(headerParsedPoints)
                                                                ? headerParsedPoints
                                                                : headerPick
                                                                    ? getPickPoints(headerPick, scoringMode)
                                                                    : 0;
                                                        const showPointsAdjuster = slip.isGraded && Boolean(headerPick);
                                                        const adjustHeaderPoints = (delta: number) => {
                                                            if (!headerPick || headerPointsDisabled) return;

                                                            const nextValue = headerCurrentPoints + delta;
                                                            const validValue = Math.max(
                                                                MINIMUM_PICK_POINTS,
                                                                Math.min(MAXIMUM_PICK_POINTS, nextValue)
                                                            );

                                                            handlePointsDraftChange(headerPick.id, String(validValue));

                                                            debouncedUpdatePoints(headerPick.id, validValue, headerPick);
                                                        };
                                                        const memberProfilePicture = generateProfileImageUrl(member.profiles?.profile_image);
                                                        return (
                                                            <div
                                                                key={member.id}
                                                                className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                                                            >
                                                                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100">
                                                                            {memberProfilePicture ? (
                                                                                <Image
                                                                                    src={memberProfilePicture}
                                                                                    alt="Profile image"
                                                                                    width={56}
                                                                                    height={56}
                                                                                    className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                                                                    draggable={false}
                                                                                    onDragStart={(e) => e.preventDefault()}
                                                                                    unoptimized
                                                                                />
                                                                            ) : (
                                                                                <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-semibold text-white">
                                                                                {displayName}
                                                                            </p>
                                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                                                                {`${picks.length} pick${picks.length === 1 ? "" : "s"}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {showPointsAdjuster && (
                                                                        <div className="flex flex-shrink-0 items-center">
                                                                            <div className="grid grid-cols-[26px_1fr_26px] items-center rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-white">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => adjustHeaderPoints(-1)}
                                                                                    disabled={headerPointsDisabled}
                                                                                    className="flex h-5 w-5 items-center justify-center text-[12px] font-semibold text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                                                                    aria-label="Decrease points"
                                                                                >
                                                                                    –
                                                                                </button>
                                                                                <input
                                                                                    type="number"
                                                                                    step="1"
                                                                                    value={headerPointsValue}
                                                                                    placeholder={headerIsPending ? "—" : undefined}
                                                                                    onChange={(event) => {
                                                                                        const raw = event.target.value;
                                                                                        if (raw === "" || raw === "-") {
                                                                                            handlePointsDraftChange(headerPick.id, raw);
                                                                                            return;
                                                                                        }
                                                                                        const nextValue = Number(raw);
                                                                                        if (Number.isNaN(nextValue)) return;
                                                                                        const validValue = Math.max(
                                                                                            MINIMUM_PICK_POINTS,
                                                                                            Math.min(MAXIMUM_PICK_POINTS, nextValue)
                                                                                        );

                                                                                        handlePointsDraftChange(headerPick.id, String(validValue));

                                                                                        debouncedUpdatePoints(headerPick.id, validValue, headerPick);
                                                                                    }}
                                                                                    max={100}
                                                                                    min={-100}
                                                                                    onBlur={() => persistAwardedPoints(headerPick.id, headerPick)}
                                                                                    onKeyDown={(event) => {
                                                                                        if (event.key === "Enter") {
                                                                                            event.currentTarget.blur();
                                                                                        }
                                                                                    }}
                                                                                    disabled={headerPointsDisabled}
                                                                                    className={`w-11 bg-transparent text-center text-[15px] font-semibold leading-none tabular-nums outline-none placeholder:text-slate-500 disabled:text-gray-300 ${pointsTextTone(
                                                                                        headerResult
                                                                                    )}`}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => adjustHeaderPoints(1)}
                                                                                    disabled={headerPointsDisabled}
                                                                                    className="flex h-5 w-5 items-center justify-center text-[12px] font-semibold text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                                                                    aria-label="Increase points"
                                                                                >
                                                                                    +
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {picks.length === 0 ? (
                                                                    <div className="px-4 py-4 text-xs text-gray-400">
                                                                        No picks to review yet.
                                                                    </div>
                                                                ) : (
                                                                    <div className="divide-y divide-white/10">
                                                                        {picks.map((pick) => {
                                                                            const normalizedResult = normalizePickResult(pick.result);
                                                                            const displayPick = pick.description ?? "No pick was submitted";
                                                                            const pickLine = extractPickLine(displayPick);
                                                                            // const matchupLabel = extractMatchup(
                                                                            //     displayPick,
                                                                            //     pick?.matchup ??
                                                                            //     (pick.selection?.gameId
                                                                            //         ? matchupByGameId.get(pick.selection.gameId)
                                                                            //         : null)
                                                                            // );
                                                                            const matchupTag = isMobile && pick?.selection?.away_abbr && pick?.selection?.home_abbr
                                                                                ? `${pick?.selection?.away_abbr} @ ${pick?.selection?.home_abbr}` : `${pick?.selection?.matchup ?? ""}`
                                                                            const timeLabel = formatDateTime(pick.match_date);
                                                                            const showTime = timeLabel !== "—";
                                                                            const showMatchup = Boolean(matchupTag);
                                                                            const sourceTabLabel = (
                                                                                pick.source_tab ??
                                                                                (pick.is_combo || pick.legs?.length ? "Combo" : "Pick")
                                                                            ).toLowerCase();
                                                                            const oddsCopy = pick.odds_bracket ?? "—";
                                                                            const accent = PICK_RESULT_ACCENTS[normalizedResult] ?? PICK_RESULT_ACCENTS.pending;
                                                                            return (
                                                                                <div key={pick.id} className="px-3 py-3 sm:px-4 sm:py-4">
                                                                                    <div className="sm:hidden">
                                                                                        <div className="grid grid-cols-[minmax(0,58px)_minmax(0,1fr)] items-stretch gap-2">
                                                                                            <div className="flex flex-col gap-1">
                                                                                                <div className="flex min-h-[48px] text-left">
                                                                                                    <div
                                                                                                        className={`flex w-full flex-col items-start justify-center overflow-hidden rounded-lg border px-1 py-1 text-left ${resultTone(
                                                                                                            normalizedResult
                                                                                                        )} shadow-[inset_0_0_10px_rgba(15,23,42,0.25)]`}
                                                                                                    >
                                                                                                        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                                                                                                            result
                                                                                                        </span>
                                                                                                        <span className="text-[12px] font-semibold uppercase tracking-wide">
                                                                                                            {formatResultLabel(normalizedResult)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex min-h-[48px] text-left">
                                                                                                    <div className="flex w-full flex-col items-start justify-center rounded-lg border border-white/10 bg-white/[0.05] px-1 py-1 text-left text-white shadow-[inset_0_0_10px_rgba(15,23,42,0.25)]">
                                                                                                        <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-300">
                                                                                                            odds
                                                                                                        </span>
                                                                                                        <span className="text-[12px] font-semibold text-white">
                                                                                                            {oddsCopy}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="h-[104px]">
                                                                                                <div
                                                                                                    className={`flex h-full flex-col overflow-hidden rounded-xl border p-2.5 ${pickCardTone(
                                                                                                        normalizedResult
                                                                                                    )}`}
                                                                                                >
                                                                                                    <div className="min-w-0">
                                                                                                        {sourceTabLabel && (
                                                                                                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                                                {sourceTabLabel}
                                                                                                            </span>
                                                                                                        )}
                                                                                                        <p
                                                                                                            className={`min-w-0 text-[13px] font-semibold leading-snug line-clamp-2 ${accent.text}`}
                                                                                                            title={displayPick}
                                                                                                        >
                                                                                                            {pickLine}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    {(showMatchup || showTime) && (
                                                                                                        <div className="mt-auto min-w-0 space-y-0.5 text-[10px] text-slate-400">
                                                                                                            {showMatchup && <p className="truncate">{matchupTag}</p>}
                                                                                                            {showTime && (
                                                                                                                <p className="truncate text-slate-500">{timeLabel}</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="hidden sm:grid sm:grid-cols-[minmax(0,110px)_minmax(0,1fr)] sm:items-stretch sm:gap-1">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            <div className="flex min-h-[56px] text-left">
                                                                                                <div
                                                                                                    className={`flex w-full flex-col items-start justify-center overflow-hidden rounded-lg border px-1.5 py-1 text-left ${resultTone(
                                                                                                        normalizedResult
                                                                                                    )} shadow-[inset_0_0_10px_rgba(15,23,42,0.25)]`}
                                                                                                >
                                                                                                    <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                                                                                                        result
                                                                                                    </span>
                                                                                                    <span className="text-[13px] font-semibold uppercase tracking-wide">
                                                                                                        {formatResultLabel(normalizedResult)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex min-h-[56px] text-left">
                                                                                                <div className="flex w-full flex-col items-start justify-center rounded-lg border border-white/10 bg-white/[0.05] px-1.5 py-1 text-left text-white shadow-[inset_0_0_10px_rgba(15,23,42,0.25)]">
                                                                                                    <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-300">
                                                                                                        odds
                                                                                                    </span>
                                                                                                    <span className="text-[13px] font-semibold text-white">
                                                                                                        {oddsCopy}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="h-full">
                                                                                            <div
                                                                                                className={`flex h-full flex-col rounded-xl border p-3 ${pickCardTone(
                                                                                                    normalizedResult
                                                                                                )}`}
                                                                                            >
                                                                                                <div>
                                                                                                    {sourceTabLabel && (
                                                                                                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                                            {sourceTabLabel}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <p
                                                                                                        className={`min-w-0 text-[16px] font-semibold leading-snug ${accent.text}`}
                                                                                                        title={displayPick}
                                                                                                    >
                                                                                                        {pickLine}
                                                                                                    </p>
                                                                                                </div>
                                                                                                {(showMatchup || showTime) && (
                                                                                                    <div className="mt-auto space-y-0.5 text-[10px] text-slate-400">
                                                                                                        {showMatchup && <p>{matchupTag}</p>}
                                                                                                        {showTime && (
                                                                                                            <p className="text-slate-500">{timeLabel}</p>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    ) : (
                                        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                                            Review opens when the pick deadline passes.
                                        </section>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </section >

            {isReopenModalOpen && (
                <ModalShell onClose={closeReopenModal} maxWidthClass="max-w-sm" contentClassName="pt-5">
                    <form onSubmit={handleReopenSubmit} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">Reopen slip</h3>
                            <p className="text-xs text-gray-400">
                                Reopening resets all picks. Set a new pick deadline in the future.
                            </p>
                        </div>
                        <DateTimeWheelPicker
                            label="New pick deadline"
                            value={reopenDeadlineDraft}
                            onChange={setReopenDeadlineDraft}
                        />
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeReopenModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ui-accent-button rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
                            >
                                Reopen slip
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {isFinalizeModalOpen && (
                <ModalShell onClose={closeFinalizeModal} maxWidthClass="max-w-sm" contentClassName="pt-5">
                    <form onSubmit={handleFinalizeSlip} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">Finalize slip</h3>
                            <p className="text-xs text-gray-400">
                                {slip.isGraded
                                    ? "Finalize results and post them to the leaderboard?"
                                    : "Finalize results and close out this slip?"}
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeFinalizeModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-sky-400/60 bg-sky-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:border-sky-300/80 hover:text-white"
                            >
                                Finalize slip
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {isDeleteSlipModalOpen && (
                <ModalShell onClose={closeDeleteSlipModal} maxWidthClass="max-w-sm" contentClassName="pt-5">
                    <form onSubmit={handleDeleteSlip} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">Delete slip</h3>
                            <p className="text-xs text-gray-400">
                                Delete this slip and all picks tied to it? This cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeDeleteSlipModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                            >
                                Delete slip
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {isSecondaryAssignOpen && (
                <ModalShell
                    onClose={closeSecondaryAssign}
                    maxWidthClass="max-w-sm"
                    maxHeightClass="max-h-none"
                    overflowClassName="overflow-visible"
                    contentClassName="pt-5"
                >
                    <form onSubmit={handleSecondaryAssignSave} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">
                                Assign to secondary leaderboard
                            </h3>
                            <p className="text-xs text-gray-400">
                                Choose where this slip should also count.
                            </p>
                        </div>
                        {activeSecondaryLeaderboards.length > 0 ? (
                            <>
                                <label className="flex flex-col gap-2 text-xs text-gray-300">
                                    Secondary leaderboard
                                    <div className="relative sm:hidden" ref={secondaryAssignDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsSecondaryAssignDropdownOpen((prev) => !prev)}
                                            className="ui-input-accent flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition"
                                            aria-haspopup="listbox"
                                            aria-expanded={isSecondaryAssignDropdownOpen}
                                            aria-controls="secondary-assign-options"
                                        >
                                            <span className="min-w-0 flex-1 truncate">
                                                {secondaryAssignLabel}
                                            </span>
                                            <span className="text-sm text-gray-300">
                                                {isSecondaryAssignDropdownOpen ? "▴" : "▾"}
                                            </span>
                                        </button>
                                        {isSecondaryAssignDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-2xl border border-white/20 bg-black shadow-[0_18px_45px_rgba(0,0,0,0.6)]">
                                                <ul
                                                    id="secondary-assign-options"
                                                    role="listbox"
                                                    className="max-h-56 overflow-y-auto py-1"
                                                >
                                                    <li>
                                                        <button
                                                            type="button"
                                                            className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5 ${secondaryAssignDraft === ""
                                                                ? "text-sky-100"
                                                                : "text-gray-200"
                                                                }`}
                                                            onClick={() => {
                                                                setSecondaryAssignDraft("");
                                                                setIsSecondaryAssignDropdownOpen(false);
                                                            }}
                                                            role="option"
                                                            aria-selected={secondaryAssignDraft === ""}
                                                        >
                                                            <span className="min-w-0 flex-1 truncate">
                                                                No secondary leaderboard
                                                            </span>
                                                            {secondaryAssignDraft === "" && (
                                                                <span className="text-sky-200">•</span>
                                                            )}
                                                        </button>
                                                    </li>
                                                    {activeSecondaryLeaderboards.map((board) => {
                                                        const isSelected = secondaryAssignDraft === board.id;
                                                        return (
                                                            <li key={board.id}>
                                                                <button
                                                                    type="button"
                                                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5 ${isSelected ? "text-sky-100" : "text-gray-200"}`}
                                                                    onClick={() => {
                                                                        setSecondaryAssignDraft(board.id);
                                                                        setIsSecondaryAssignDropdownOpen(false);
                                                                    }}
                                                                    role="option"
                                                                    aria-selected={isSelected}
                                                                >
                                                                    <span className="min-w-0 flex-1 truncate">
                                                                        {board.name}
                                                                    </span>
                                                                    {isSelected && <span className="text-sky-200">•</span>}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <select
                                        value={secondaryAssignDraft}
                                        onChange={(event) => setSecondaryAssignDraft(event.target.value)}
                                        className="ui-input-accent hidden rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition sm:block"
                                    >
                                        <option value="">No secondary leaderboard</option>
                                        {activeSecondaryLeaderboards.map((board) => (
                                            <option key={board.id} value={board.id}>
                                                {board.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="flex justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={closeSecondaryAssign}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="ui-accent-button rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
                                    >
                                        Save assignment
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 text-center">
                                    Create a secondary leaderboard in League Settings to organize slips into
                                    separate rankings.
                                </p>
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={closeSecondaryAssign}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </ModalShell>
            )}

            {isRenamingSlip && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
                    role="dialog"
                    aria-modal="true"
                    onClick={cancelRenameSlip}
                >
                    <div
                        className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-white">Rename slip</h2>
                                <p className="text-xs text-gray-400">Update the slip name for {slip.name}.</p>
                            </div>
                            <button
                                type="button"
                                onClick={cancelRenameSlip}
                                className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                                aria-label="Close rename slip"
                            >
                                X
                            </button>
                        </div>
                        <form onSubmit={handleRenameSubmit} className="space-y-4 px-6 py-5">
                            <label className="flex flex-col gap-2">
                                <span className="text-xs uppercase tracking-wide text-gray-400">slip name</span>
                                <input
                                    value={editingName}
                                    onChange={(event) => setEditingName(event.target.value)}
                                    className="ui-input-accent rounded-2xl border border-white/10 bg-black px-4 py-3 text-base sm:text-sm text-white outline-none transition"
                                    placeholder="Slip name"
                                />
                                {errors.name && (
                                    <span className="text-[11px] text-rose-300">
                                        {errors.name}
                                    </span>
                                )}
                            </label>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={cancelRenameSlip}
                                    className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white"
                                >
                                    cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!editingName.trim()}
                                    className="ui-accent-button-solid rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    save changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeadlinesOverviewModal
                open={isDeadlinesModalOpen}
                onClose={() => setIsDeadlinesModalOpen(false)}
                windowDays={windowDays}
                isGraded={slip.isGraded}
            />

            <ScoringModal
                open={showScoringModal}
                onClose={() => setShowScoringModal(false)}
                variant="league"
            />

            <SlipShareModal
                open={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                slip={slip}
                picks={slipPicks}
                members={orderedMembers}
            />
        </div >
    );
};

export default SlipDetailsPage;

const DeadlinesOverviewModal = ({
    open,
    onClose,
    windowDays,
    isGraded,
}: {
    open: boolean;
    onClose: () => void;
    windowDays: number;
    isGraded: boolean;
}) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-white">
                            {isGraded
                                ? "Deadlines & review overview"
                                : "Deadlines & locked picks overview"}
                        </h2>
                        <p className="text-xs text-gray-400">
                            {isGraded
                                ? "How pick locks, auto-grade, and scoring flow together on each slip."
                                : "How pick locks, auto-grade, and automatic finalization work on vibe slips."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-2 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close deadlines overview"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            Pick deadline &amp; slate
                        </h3>
                        <p>
                            Picks are open until the <strong>pick deadline</strong>, then the slip locks. Games
                            stay limited to the next{" "}
                            <strong>{windowDays} day{windowDays === 1 ? "" : "s"}</strong> after the deadline so
                            everyone is picking from the same slate.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            {isGraded ? "Review flow" : "Locked picks flow"}
                        </h3>
                        <p>
                            {isGraded
                                ? "Once the pick deadline passes, the slip locks and review opens. Commissioners can run auto-grade, adjust awarded points, and finalize when ready."
                                : "Once the pick deadline passes, the slip locks into locked picks. Auto-grade resolves finished results, and the vibe slip finalizes automatically once every pick has a result."}
                        </p>
                        <ul className="list-disc space-y-2 pl-5 text-xs text-gray-300">
                            {isGraded ? (
                                <>
                                    <li>Auto-grade sets results to win/loss/not found when possible.</li>
                                    <li>Awarded points override the default tier scoring.</li>
                                    <li>
                                        Losses default to <span className="font-semibold text-red-300">-15 points</span>.
                                    </li>
                                    <li>Not found/void default to 0; pending stays at 0.</li>
                                    <li>Finalize to post results to the leaderboard.</li>
                                </>
                            ) : (
                                <>
                                    <li>Auto-grade sets results to win/loss/not found when possible.</li>
                                    <li>
                                        Pending picks stay locked until their games finish and grading can resolve
                                        them.
                                    </li>
                                    <li>Not found and void settle without any profile XP impact.</li>
                                    <li>As soon as every pick is graded, the slip finalizes automatically.</li>
                                </>
                            )}
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            Scoring reference
                        </h3>
                        <p className="text-xs text-gray-400">
                            League leaderboards use the tier table, with a cap at Tier {LEAGUE_CAP_TIER} (
                            {LEAGUE_CAP_POINTS} pts max). The scoring modal inside the pick builder shows the
                            league tier rules if you need a refresher.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({
    label,
    onClick,
    disabled,
    className = "",
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
        {label}
    </button>
);

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
    maxHeightClass = "max-h-[90vh]",
    overflowClassName = "overflow-y-auto",
    contentClassName = "",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
    maxHeightClass?: string;
    overflowClassName?: string;
    contentClassName?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} ${maxHeightClass} ${overflowClassName} ${contentClassName} rounded-3xl border border-white/10 bg-black px-5 pb-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);