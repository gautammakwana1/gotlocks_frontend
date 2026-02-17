"use client";

import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
    type CSSProperties,
    useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { PickLimitIndicator } from "@/components/slips/PickLimitIndicator";
import { PickBuilderShell } from "@/components/pick-builder/PickBuilderShell";
import BackButton from "@/components/ui/BackButton";
import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { formatDateTime, fromLocalInputValue, toLocalInputValue } from "@/lib/utils/date";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS, eligibleWindowEnd } from "@/lib/utils/games";
import { BuiltPickPayload, GradingPayload, Group, GroupSelector, LeaderboardList, League, Pick, Picks, PickSelector, Slips, SlipSelector } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { GroupDataShape } from "../../page";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import { autoGradingPicksRequest, clearCreatePickMessage, clearUpdatePicksMessage, createPickRequest, deletePickRequest, fetchAllPicksRequest, updatePicksRequest } from "@/lib/redux/slices/pickSlice";
import { assignToSecondaryLeaderboardRequest, clearUpdateSlipsMessage, deleteSlipRequest, fetchAllSlipsRequest, markFinalizeSlipRequest, reOpenSlipRequest, updateSlipsRequest } from "@/lib/redux/slices/slipSlice";
import FootballAnimation from "@/components/animations/FootballAnimation";
import Image from "next/image";
import { getPickPoints, GROUP_CAP_POINTS, GROUP_CAP_TIER, parseAmericanOdds } from "@/lib/utils/scoring";
import { X } from "lucide-react";
import PickListCard from "@/components/slips/PickListCard";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { canCommissionerReview, canFinalize, canUserEditSlipPicks, isSlipFinal, isSlipTimeLocked, normalizePickResult } from "@/lib/slips/state";
import { createPortal } from "react-dom";
import ScoringModal from "@/components/modals/ScoringModal";
import SlipShareModal from "@/components/slips/SlipShareModal";

type BuilderState = {
    mode: "create" | "edit";
    pick?: Pick;
    initialLeague?: League | string;
};

type SlipTab = "picks" | "review" | "actions";

type PointsDraft = Record<string, string>;

const buildInitialPointsDraft = (
    picks: Pick[],
    mode: "global" | "groupLeaderboard"
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

const getMemberInitials = (name?: string | null) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second =
        parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "";
    return `${first}${second}`.toUpperCase() || "??";
};

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;

const extractPickLine = (description: string) => {
    const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
    const candidate = matchupSegment?.trim();
    const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
    if (hasMatchup && lineSegments.length > 0) {
        return lineSegments.join(DASH_SEPARATOR);
    }
    return description;
};

const DEFAULT_SPORT = "NFL";
const WINDOW_DAY_OPTIONS = [1, 2, 3, 4, 5];
const deepJaggedStyle: CSSProperties = {
    clipPath: JAGGED_CLIP_PATH,
    "--jagged-valley": "34px",
    "--jagged-tip": "0px",
} as CSSProperties;

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

const SlipDetailsPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ groupId: string; slipId: string }>();
    const router = useRouter();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);

    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);
    const activeSlip = group?.active_slip ?? null;
    const members = useMemo(() => group?.members ?? [], [group?.members]);
    const { slip: slipState, loading: slipLoader, message: slipMessage } = useSelector((state: SlipSelector) => state.slip);
    const { pick: pickState, loading: pickLoader, message: pickMessage } = useSelector((state: PickSelector) => state.pick);
    const slipData = slipState as { slips?: Slips } | null;
    const pickData = pickState as { picks?: Picks } | null;
    const {
        leaderboard: leaderboardData,
        leaderboardList: leaderboardListData,
    } = useSelector((state: GroupSelector) => state.group);

    const [windowDaysDraft, setWindowDaysDraft] = useState<number>(
        DEFAULT_ELIGIBLE_WINDOW_DAYS
    );

    const slips: Slips = useMemo(() => {
        if (!group?.id || !slipData?.slips?.length) return [];

        return slipData?.slips;
    }, [slipData, group?.id]);
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
        if (!params.groupId || !currentUser) return

        dispatch(fetchGroupByIdRequest({ groupId: params.groupId }));
        dispatch(fetchAllSlipsRequest({ group_id: params.groupId }));
        dispatch(fetchAllLeaderboardsRequest({ group_id: params.groupId }));
        dispatch(clearCreatePickMessage());
    }, [params.groupId, currentUser, dispatch, params.slipId]);

    const slip = useMemo(
        () => slips.find((candidate) => candidate.id === params.slipId),
        [params.slipId, slips]
    );
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
        if (!slip || !slip.leaderboard_ids) return null;
        const sideId = slip.leaderboard_ids.find((id) => {
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
    const [builderInstance, setBuilderInstance] = useState(0);
    const [builderState, setBuilderState] = useState<BuilderState | null>(null);
    const [activeTab, setActiveTab] = useState<SlipTab>("picks");
    const [isRenamingSlip, setIsRenamingSlip] = useState(false);
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
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const slipPicks = useMemo<Pick[]>(() => {
        if (!pickData) return [];
        if (!Array.isArray(pickData.picks) || !slip?.id) return [];
        return pickData.picks.filter(pick => pick.slip_id === slip.id);
    }, [pickData, slip?.id]);
    const scoringMode = slip?.isGraded ? "groupLeaderboard" : "global";

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
            dispatch(clearUpdatePicksMessage())
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
    }, [pickLoader, pickMessage, setToast, params.slipId, dispatch]);

    useEffect(() => {
        if (!slipLoader && slipMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: slipMessage,
                duration: 3000,
            })
            dispatch(clearUpdateSlipsMessage())
            dispatch(fetchAllSlipsRequest({ group_id: params.groupId }));
        }
    }, [setToast, slipLoader, slipMessage, dispatch, params.groupId]);

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
        if (!group || !slip || !isSlipFinal(slip)) return;
        router.replace(`/group/${group.id}/slips/${slip.id}/results`);
    }, [group, slip, router]);

    // const memberPicks = useMemo(
    //     () =>
    //         slipPicks
    //             .map((pick: Pick) => ({
    //                 pick,
    //                 user: members.find((candidate) => candidate.user_id === pick.user_id),
    //             }))
    //             .filter(
    //                 (entry): entry is { pick: Pick; user: Member } => Boolean(entry.user)
    //             ),
    //     [slipPicks, members]
    // );
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

    // const gradingDirty = useMemo(
    //     () => {
    //         if (!slip?.isGraded) {
    //             return memberPicks.some(({ pick }) => {
    //                 const draft = pointsDraft[pick.id];
    //                 if (!draft) return false;
    //                 const currentResult = normalizeResult(pick.result);
    //                 return draft.result !== currentResult;
    //             });
    //         }

    //         return memberPicks.some(({ pick }) => {
    //             const draft = pointsDraft[pick.id];
    //             if (!draft) return false;
    //             const draftPoints = Number.isFinite(Number(draft.points))
    //                 ? Number(draft.points)
    //                 : 0;
    //             const currentResult = normalizeResult(pick.result);
    //             const currentPoints =
    //                 typeof pick.points === "number" ? pick.points : scoreForResult(currentResult, pick);
    //             return draft.result !== currentResult || currentPoints !== draftPoints;
    //         });
    //     },
    //     [pointsDraft, memberPicks, slip?.isGraded]
    // );

    const preflightIsCommissioner = group?.created_by === currentUser?.userId;
    const preflightIsCreator = slip?.created_by === currentUser?.userId;
    const preflightHasVibeControl = Boolean(slip && !slip.isGraded && preflightIsCreator);
    const availableSports = Array.isArray(slip?.sports) && slip.sports.length > 0
        ? slip.sports
        : [DEFAULT_SPORT];
    const showReviewTab = Boolean(slip && (preflightIsCommissioner || preflightHasVibeControl) && isSlipTimeLocked(slip));
    const showActionsTab = Boolean(
        slip && (preflightIsCommissioner || (!slip.isGraded && preflightIsCreator))
    );
    const tabs = useMemo<{ id: SlipTab; label: string }[]>(() => {
        const baseTabs: { id: SlipTab; label: string }[] = [
            { id: "picks", label: "Group picks" },
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

    if (!group || !currentUser || !slip) {
        return null;
    }

    if (isFinalized) {
        return null;
    }

    const windowDays = slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS;
    const isCommissioner = group.created_by === currentUser.userId;
    const isCreator = slip.created_by === currentUser.userId;
    const hasVibeControl = !slip.isGraded && isCreator;
    const hasReviewControl = isCommissioner || hasVibeControl;
    const limitValue = slip.pick_limit === "unlimited" ? Infinity : slip.pick_limit;
    const isTimeLocked = isSlipTimeLocked(slip);
    const canManagePicks = canUserEditSlipPicks(slip);
    const canAddPick = canManagePicks && userPicks.length < limitValue;
    const canReview = canCommissionerReview(slip);
    const canAdjustPoints = isCommissioner && canReview;
    const canAutoGrade = hasReviewControl && canReview;
    const canReopen = hasReviewControl && isTimeLocked && !isFinalized;
    const canFinalizeSlip = canFinalize(slip, {
        isCommissioner: hasReviewControl,
        picks: slipPicks,
    });
    const canRenameSlip = isCommissioner || (!slip.isGraded && isCreator);
    const canEditDeadlines =
        (isCommissioner || (!slip.isGraded && isCreator)) && canManagePicks;
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
    const userDisplayName = currentUser.username ?? "You";
    const userInitials = getMemberInitials(userDisplayName);
    const userMember = members.find(
        m => m.user_id === currentUser.userId
    );
    const userProfilePictureLink = userMember?.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${userMember?.profiles?.profile_image}` : undefined;
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

    const handleSavePick = (
        payload: BuiltPickPayload,
        pickId?: string
    ) => {
        dispatch(createPickRequest({
            slip_id: slip.id,
            description: payload.description,
            odds_bracket: payload.odds_bracket,
            scope: payload.scope,
            side: payload.side,
            points: payload.points,
            difficultyTier: payload.difficultyTier,
            difficulty_label: payload.difficulty_label,
            market: payload.market,
            playerId: payload.playerId,
            gameId: payload.gameId,
            week: payload.week,
            teamId: payload.teamId,
            threshold: payload.threshold,
            validationStatus: payload.validationStatus,
            bestOffer: payload.bestOffer,
            bookOdds: payload.bookOdds,
            buildMode: payload.buildMode,
            pickId,
            external_pick_key: payload.external_pick_key,
            confidence: payload.confidence,
            sourceTab: payload.sourceTab,
            selection: payload.selection,
            sport: payload.sport,
            matchup: payload.matchup,
            match_date: payload.match_date ? new Date(payload.match_date) : undefined,
        }))
        setBuilderState(null);
    };

    const handleAutoGrade = () => {
        if (!canAutoGrade) return;
        if (slip.id) {
            dispatch(autoGradingPicksRequest({ slip_id: slip.id }));
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
        const confirmed = window.confirm(
            slip.isGraded
                ? "Finalize results and post them to the leaderboard?"
                : "Finalize results and close out this slip?"
        );
        if (!confirmed) return;
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

    // const handleStatusChange = (status: typeof slip.status) => {
    //     if (!slip.id) return;

    //     if (status === "locked") {
    //         dispatch(markLockSlipRequest({
    //             slip_id: slip.id
    //         }));
    //     } else if (status === "open") {
    //         dispatch(markedUnlockSlipRequest({
    //             slip_id: slip.id
    //         }));
    //     } else if (status === "grading") {
    //         dispatch(markGradedSlipRequest({
    //             slip_id: slip.id
    //         }));
    //     } else if (status === "final") {
    //         dispatch(markFinalizeSlipRequest({ slip_id: slip.id, group_id: group.id }));
    //     }
    //     // dispatch(fetchAllPicksRequest({ slip_id: slip.id }));
    //     if (status === "final" && group) {
    //         router.replace(`/group/${group.id}/slips/${slip.id}/results`);
    //     }
    // };

    const handleDeleteSlip = () => {
        if (!group || !currentUser) return;
        const confirmed = window.confirm(
            "Delete this slip and all picks tied to it? This cannot be undone."
        );
        if (!confirmed) return;
        if (slip.id) {
            dispatch(deleteSlipRequest({ slip_id: slip.id }));
        }
        router.replace(`/group/${group.id}?tab=slips`);
    };

    const handleDeadlineSave = (event: FormEvent) => {
        event.preventDefault();
        if (!canEditDeadlines) return;
        if (slip.id && group.id) {
            dispatch(updateSlipsRequest({ group_id: group.id, slip_id: slip.id, pick_deadline_at: pickDeadlineDraft, windowDays: activeWindowDays }));
        }
    };

    const startRenameSlip = () => {
        setEditingName(slip.name);
        setIsRenamingSlip(true);
    };

    const cancelRenameSlip = () => {
        setEditingName(slip.name);
        setIsRenamingSlip(false);
    };

    const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = editingName.trim();
        if (!trimmedName) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Slip name cannot be empty.",
                duration: 3000
            });
            return;
        }
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
        setBuilderInstance((prev) => prev + 1);
        setBuilderState({
            mode: "create",
            initialLeague: (availableSports[0] as League | undefined) ?? DEFAULT_SPORT,
        });
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
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
                            fallback={`/group/${group.id}?tab=slips${slip.isGraded ? "" : "&mode=vibe"}`}
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
                                        className="inline-flex flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/60 hover:text-emerald-50"
                                        aria-label="Edit slip name"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.818 18.896a4.5 4.5 0 0 1-1.591.999l-2.911.97.97-2.91a4.5 4.5 0 0 1 .999-1.592z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m19.5 7.125-2.625-2.625"
                                            />
                                        </svg>
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
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="h-3 w-3"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden
                                        >
                                            <path d="M15 4h5v5" />
                                            <path d="M10 14 20 4" />
                                            <path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
                                        </svg>
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
                                                        <span className="tracking-wide">
                                                            {userInitials}
                                                        </span>
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
                                            <p className="text-sm font-semibold text-white">Your group&apos;s picks</p>
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
                                                    const initials = getMemberInitials(displayName);
                                                    const memberProfilePicture = member.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${member.profiles?.profile_image}` : undefined;

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
                                                                            <span className="tracking-wide">
                                                                                {initials}
                                                                            </span>
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
                                                            <label className="flex flex-col gap-1 text-xs text-gray-400">
                                                                pick deadline
                                                                <input
                                                                    type="datetime-local"
                                                                    value={toLocalInputValue(pickDeadlineDraft)}
                                                                    min={toLocalInputValue(`${new Date()}`)}
                                                                    onChange={(event) =>
                                                                        setPickDeadlineDraft(fromLocalInputValue(event.target.value))
                                                                    }
                                                                    disabled={!canEditDeadlines}
                                                                    className="rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-60"
                                                                />
                                                            </label>
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
                                                                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black px-3 py-2 text-left text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-60"
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
                                                                                                    ? "text-emerald-100"
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
                                                                                                    <span className="text-emerald-200">•</span>
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
                                                                    className="hidden rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-60 sm:block"
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
                                                            {!canEditDeadlines && (
                                                                <p className="text-[11px] text-amber-200">
                                                                    Deadline is locked. Use Reopen slip in Review to reset picks and set a
                                                                    new deadline.
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="submit"
                                                                disabled={!canEditDeadlines}
                                                                className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/60 hover:from-emerald-400/30 hover:via-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
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
                                                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-emerald-300/60 hover:text-white"
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
                                                                onClick={handleDeleteSlip}
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
                                                            aria-label="How scoring works"
                                                        >
                                                            i
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {isTimeLocked
                                                            ? "Slip is locked by the pick deadline. Auto-grade results, then adjust awarded points."
                                                            : "Review unlocks once the pick deadline passes."}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex w-full flex-nowrap items-center gap-2">
                                                <ActionButton
                                                    label="Auto grade"
                                                    onClick={handleAutoGrade}
                                                    disabled={!canAutoGrade}
                                                    className="flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-black/40 px-3 py-2 text-[11px] text-emerald-100 hover:border-emerald-300/70 hover:text-white"
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
                                            <div className="flex justify-end text-xs font-semibold text-emerald-100">
                                                Changes save automatically, finalize when finished.
                                            </div>

                                            {!hasReviewPicks ? (
                                                <p className="text-sm text-gray-400">No picks to review yet.</p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {reviewMembers.map(({ member, picks }) => {
                                                        const displayName = member.profiles?.username ?? "Member";
                                                        const initials = getMemberInitials(displayName);
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
                                                            handlePointsDraftChange(headerPick.id, String(nextValue));
                                                            const gradingPayload: GradingPayload = [{
                                                                id: headerPick.id,
                                                                points: nextValue,
                                                                bonus: 0,
                                                                result: headerPick.result,
                                                            }]
                                                            if (group?.id && slip.id) dispatch(updatePicksRequest({ grading: gradingPayload, group_id: group?.id, slip_id: slip.id }));
                                                        };
                                                        const memberProfilePicture = member.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${member.profiles?.profile_image}` : undefined;
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
                                                                                <span className="tracking-wide">
                                                                                    {initials}
                                                                                </span>
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
                                                                                    onChange={(event) =>
                                                                                        handlePointsDraftChange(
                                                                                            headerPick.id,
                                                                                            event.target.value
                                                                                        )
                                                                                    }
                                                                                    onBlur={() => persistAwardedPoints(headerPick.id, headerPick)}
                                                                                    onKeyDown={(event) => {
                                                                                        if (event.key === "Enter") {
                                                                                            event.currentTarget.blur();
                                                                                        }
                                                                                    }}
                                                                                    disabled={headerPointsDisabled}
                                                                                    className={`w-11 bg-transparent text-center text-[15px] font-semibold leading-none tabular-nums outline-none placeholder:text-slate-500 disabled:text-gray-500 ${pointsTextTone(
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
                                                                            const matchupLabel = pick.matchup;
                                                                            const timeLabel = formatDateTime(pick.match_date);
                                                                            const showTime = timeLabel !== "—";
                                                                            const showMatchup = Boolean(matchupLabel);
                                                                            const sourceTabLabel = (
                                                                                pick.source_tab ??
                                                                                (pick.is_combo || pick.legs?.length ? "Combo" : "Pick")
                                                                            ).toLowerCase();
                                                                            const oddsCopy = pick.odds_bracket ?? "—";
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
                                                                                                            className="min-w-0 text-[13px] font-semibold leading-snug text-cyan-200 line-clamp-2"
                                                                                                            title={displayPick}
                                                                                                        >
                                                                                                            {pickLine}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    {(showMatchup || showTime) && (
                                                                                                        <div className="mt-auto min-w-0 space-y-0.5 text-[10px] text-slate-400">
                                                                                                            {showMatchup && <p className="truncate">{matchupLabel}</p>}
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
                                                                                                        className="min-w-0 text-[16px] font-semibold leading-snug text-cyan-200"
                                                                                                        title={displayPick}
                                                                                                    >
                                                                                                        {pickLine}
                                                                                                    </p>
                                                                                                </div>
                                                                                                {(showMatchup || showTime) && (
                                                                                                    <div className="mt-auto space-y-0.5 text-[10px] text-slate-400">
                                                                                                        {showMatchup && <p>{matchupLabel}</p>}
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
                <ModalShell onClose={closeReopenModal} maxWidthClass="max-w-sm">
                    <form onSubmit={handleReopenSubmit} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">Reopen slip</h3>
                            <p className="text-xs text-gray-400">
                                Reopening resets all picks. Set a new pick deadline in the future.
                            </p>
                        </div>
                        <label className="flex flex-col gap-2 text-xs text-gray-300">
                            New pick deadline
                            <input
                                type="datetime-local"
                                value={toLocalInputValue(reopenDeadlineDraft)}
                                onChange={(event) =>
                                    setReopenDeadlineDraft(fromLocalInputValue(event.target.value))
                                }
                                className="rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                            />
                        </label>
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
                                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/80 hover:text-white"
                            >
                                Reopen slip
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {isFinalizeModalOpen && (
                <ModalShell onClose={closeFinalizeModal} maxWidthClass="max-w-sm">
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

            {isSecondaryAssignOpen && (
                <ModalShell
                    onClose={closeSecondaryAssign}
                    maxWidthClass="max-w-sm"
                    maxHeightClass="max-h-none"
                    overflowClassName="overflow-visible"
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
                                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
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
                                                                ? "text-emerald-100"
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
                                                                <span className="text-emerald-200">•</span>
                                                            )}
                                                        </button>
                                                    </li>
                                                    {activeSecondaryLeaderboards.map((board) => {
                                                        const isSelected = secondaryAssignDraft === board.id;
                                                        return (
                                                            <li key={board.id}>
                                                                <button
                                                                    type="button"
                                                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5 ${isSelected ? "text-emerald-100" : "text-gray-200"
                                                                        }`}
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
                                                                    {isSelected && <span className="text-emerald-200">•</span>}
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
                                        className="hidden rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70 sm:block"
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
                                        className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/80 hover:text-white"
                                    >
                                        Save assignment
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 text-center">
                                    Create a secondary leaderboard in Group Settings to organize slips into
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
                                className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
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
                                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                                    placeholder="Slip name"
                                />
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
                                    className="rounded-2xl bg-emerald-500/80 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                variant="group"
            />

            {builderState && (
                <ModalShell onClose={() => setBuilderState(null)}>
                    <PickBuilderShell
                        key={`${builderInstance}-${builderState.pick?.id ?? "new"}-${builderState.mode}`}
                        context={{
                            mode: "slip",
                            group,
                            slip,
                            picks: slipPicks,
                            currentUser,
                            initialPick: builderState.pick,
                            isCommissioner,
                            onSave: handleSavePick,
                            showCurrentPick: slip.pick_limit === 1,
                        }}
                        initialLeague={
                            (builderState.initialLeague as League | undefined) ??
                            (builderState.pick?.sport as League | undefined) ??
                            (availableSports[0] as League | undefined)
                        }
                        // initialBuildMode={builderState.pick?.build_mode ?? "ODDS"}
                        leagues={availableSports as League[]}
                        onDismiss={() => setBuilderState(null)}
                    />
                </ModalShell>
            )}

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
                        <h2 className="text-lg font-semibold text-white">Deadlines &amp; review overview</h2>
                        <p className="text-xs text-gray-400">
                            How pick locks, auto-grade, and scoring flow together on each slip.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close deadlines and review overview"
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
                            Review flow
                        </h3>
                        <p>
                            Once the pick deadline passes, the slip locks and review opens. Commissioners can
                            run auto-grade, adjust awarded points, and finalize when ready.
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
                                    <li>Awarded points override the default tier scoring.</li>
                                    <li>Not found/void default to 0; pending stays at 0.</li>
                                    <li>Finalize to close out the slip.</li>
                                </>
                            )}
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            Scoring reference
                        </h3>
                        <p className="text-xs text-gray-400">
                            Group leaderboards use the tier table, with a cap at Tier {GROUP_CAP_TIER} (
                            {GROUP_CAP_POINTS} pts max). The scoring modal inside the pick builder shows the
                            group tier rules if you need a refresher.
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
        className={`rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
            className={`relative w-full ${maxWidthClass} ${maxHeightClass} ${overflowClassName} ${contentClassName} rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);