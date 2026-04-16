"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { clearConfirmDeleteGroupMessage, clearCreateNewLeaderboardMessage, clearUpdateGroupMessage, confirmDeleteGroupRequest, createNewLeaderboardRequest, enableSecondaryLeaderboardRequest, fetchAllLeaderboardsRequest, fetchArchivedLeaderboardByIdRequest, fetchArchivedLeaderboardListRequest, fetchGroupByIdRequest, fetchLeaderboardRequest, initialGroupDeleteRequest, leaveGroupRequest, removeGroupMemberRequest, updateGroupMemberRoleRequest, updateGroupRequest, updateLeaderboardRequest, updateLeaderboardToArchivedRequest } from "@/lib/redux/slices/groupsSlice";
import { archiveLeaderBoardObject, ArchiveLeaderboardSlip, Group, GroupSelector, Leaderboard, LeaderboardList, RootState, Slip } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { fetchAllFinalizedSlipsRequest, fetchAllOpenSlipsRequest, fetchAllReviewSlipsRequest, fetchAllVibeFinalizedSlipsRequest, fetchAllVibeOpenSlipsRequest, fetchAllVibeReviewSlipsRequest, startNewContestRequest } from "@/lib/redux/slices/slipSlice";
import ModifyMembers from "@/components/group/ModifyMembers";
import { displayNameGradientStyle } from "@/lib/styles/text";
import LeaderboardGrid from "@/components/leaderboard/LeaderboardGrid";
import SlipCategorySection from "@/components/slips/SlipCategorySection";
import ScoringModal from "@/components/modals/ScoringModal";
import FeedTab from "@/components/group/FeedTab";
import FootballAnimation from "@/components/animations/FootballAnimation";
import BackButton from "@/components/ui/BackButton";
import { DeleteGroupConfirmationModal } from "@/components/group/ConfirmDeleteGroupModal";
import { PlusIcon, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { ChatIcon, ChevronIcon, ChevronUpDownIcon, EditIcon, EditPencilIcon, FeedIcon, LeaderboardIcon, MembersIcon, SettingIcon, SlipIcon } from "@/components/ui/SvgIcons";
import LeaderboardSkeleton from "@/components/leaderboard/LeaderboardSkeleton";
import SlipsSkeleton from "@/components/slips/SlipsSkeleton";
import MembersSkeleton from "@/components/group/MembersSkeleton";

interface FormErrors {
  name?: string;
  description?: string;
}

export type GroupDataShape = Group | { group?: Group | null } | null;

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

const BASE_TABS = [
  {
    id: "leaderboard",
    label: "Leaderboard",
  },
  {
    id: "slips",
    label: "Slips",
  },
  {
    id: "members",
    label: "Members",
  },
  {
    id: "chat",
    label: "Chat",
  },
  {
    id: "feed",
    label: "Feed",
  },
  {
    id: "settings",
    label: "Group Settings",
  },
] as const;

const archivedLeaderboardDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const MAX_LEADERBOARD_NAME_LENGTH = 16;

type PendingLeaderboardAction =
  | {
    kind: "archive-secondary";
    leaderboardId: string;
    leaderboardName: string;
  }
  | {
    kind: "restart-main";
    leaderboardId: string;
    leaderboardName: string;
  };

const formatArchivedLeaderboardMeta = (board: archiveLeaderBoardObject) => {
  const archiveTimestamp = board?.leaderboards.archived_at ?? board.created_at;
  const archiveDate = new Date(archiveTimestamp);
  const archiveLabel = Number.isNaN(archiveDate.getTime())
    ? null
    : archivedLeaderboardDateFormatter.format(archiveDate);
  const typeLabel = board.leaderboards.isDefault ? "main" : "secondary";
  return archiveLabel ? `${typeLabel} / ${archiveLabel}` : typeLabel;
};

const GroupPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { setToast } = useToast();
  const currentUser = useCurrentUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const fetchedGroupId = useRef<string | null>(null);
  const [leaderboardList, setLeaderboardList] = useState<Leaderboard[]>([]);
  const [leaderboardSlipsList, setLeaderboardSlipsList] = useState<Slip[]>([]);
  const [archivedLeaderboardSlipsList, setArchivedLeaderboardSlipsList] = useState<ArchiveLeaderboardSlip[]>([]);
  const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  type TabId = (typeof BASE_TABS)[number]["id"];

  const iconForTab = (tabId: TabId) => {
    const commonProps = {
      className: "h-4 w-4",
      stroke: "currentColor",
      fill: "none",
      strokeWidth: 1.5,
      "aria-hidden": true,
    };
    switch (tabId) {
      case "leaderboard":
        return (
          <LeaderboardIcon {...commonProps} />
        );
      case "slips":
        return (
          <SlipIcon {...commonProps} />
        );
      case "members":
        return (
          <MembersIcon />
        );
      case "feed":
        return (
          <FeedIcon {...commonProps} />
        );
      case "chat":
        return (
          <ChatIcon {...commonProps} />
        );
      case "settings":
        return (
          <SettingIcon {...commonProps} />
        );
      default:
        return null;
    }
  };
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [showCreateSideModal, setShowCreateSideModal] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [sideContestName, setSideContestName] = useState("");
  const [activeLeaderboardId, setActiveLeaderboardId] = useState<string | null>(null);
  const [showLeaderboardMenu, setShowLeaderboardMenu] = useState(false);
  const [archivedLeaderboardId, setArchivedLeaderboardId] = useState<string | null>(null);
  const [editingLeaderboardId, setEditingLeaderboardId] = useState<string | null>(null);
  const [leaderboardNameDraft, setLeaderboardNameDraft] = useState("");
  const [pendingLeaderboardAction, setPendingLeaderboardAction] =
    useState<PendingLeaderboardAction | null>(null);
  const [showSecondaryInfo, setShowSecondaryInfo] = useState(false);
  const [mainLeaderboardDetailsOpen, setMainLeaderboardDetailsOpen] = useState(false);
  const [secondaryLeaderboardsDetailsOpen, setSecondaryLeaderboardsDetailsOpen] = useState(true);
  const [showSettingsArchivedLeaderboards, setShowSettingsArchivedLeaderboards] =
    useState(false);
  const [showLeaderboardArchivedLeaderboards, setShowLeaderboardArchivedLeaderboards] =
    useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [slipTab, setSlipTab] = useState<"leaderboard" | "vibe">(() =>
    searchParams.get("mode") === "vibe" ? "vibe" : "leaderboard"
  );
  const [openPage, setOpenPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [finalPage, setFinalPage] = useState(1);

  useEffect(() => {
    setOpenPage(1);
    setReviewPage(1);
    setFinalPage(1);
  }, [slipTab]);
  const [archiveLeaderboardData, setArchiveLeaderboardData] = useState<Leaderboard[]>([]);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaderboardMenuRef = useRef<HTMLDivElement>(null);

  const {
    group: groupData,
    loading,
    leaderboard: leaderboardData,
    leaderboardList: leaderboardListData,
    loadingLeaderboard,
    message: groupMessage,
    error: errorMessage,
    deleteLoading,
    deleteMessage,
    ArchiveLeaderboardList,
    archivedLeaderboard: ArchivedLeaderboardObject,
    hasMoreLeaderboard,
    loadingMembers,
  } = useSelector((state: GroupSelector) => state.group);
  const { openSlips, reviewSlips, finalizeSlips, hasMoreFinalizes, hasMoreOpens, hasMoreReviews, loading: slipLoader } = useSelector((state: RootState) => state.slip);
  const rawGroup = useSelector((state: GroupSelector) => state.group.group);
  const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);

  useEffect(() => {
    if (!groupId || !currentUser) return;
    if (fetchedGroupId.current === groupId) return;

    dispatch(fetchGroupByIdRequest({ groupId }));
    fetchedGroupId.current = groupId;
  }, [groupId, currentUser, dispatch]);

  useEffect(() => {
    if (ArchivedLeaderboardObject && Array.isArray(ArchivedLeaderboardObject.leaderboard)) {
      setArchiveLeaderboardData(ArchivedLeaderboardObject.leaderboard);
    }
    if (ArchivedLeaderboardObject && Array.isArray(ArchivedLeaderboardObject.slips)) {
      setArchivedLeaderboardSlipsList(ArchivedLeaderboardObject.slips);
    }
  }, [ArchivedLeaderboardObject]);

  const isCommissioner =
    !!group && !!currentUser && group.created_by === currentUser.userId;
  const secondaryLeaderboardsEnabled =
    group?.is_enable_secondary_leaderboard ?? false;

  const activeSlip = group?.active_slip ?? null;
  const members = useMemo(() => group?.members ?? [], [group?.members]);

  const tabs = useMemo(
    () =>
      isCommissioner
        ? BASE_TABS
        : BASE_TABS.filter((tab) => tab.id !== "settings"),
    [isCommissioner]
  );

  const primaryActionButtonClass =
    "group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-black/60 to-black/30 px-5 py-4 text-left shadow-sm transition hover:border-emerald-300/60 hover:bg-emerald-500/15";
  const primaryActionIconClass =
    "flex h-10 w-10 items-center justify-center text-emerald-100 transition group-hover:text-emerald-50";
  const secondaryLeaderboardCardClass =
    "rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] p-5 shadow-sm transition hover:border-white/20";
  const createSlipButtonClass =
    "group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/70 via-slate-950/60 to-black/60 px-5 py-4 text-left transition hover:border-sky-400/70 hover:bg-blue-950/60";
  const createSlipIconClass =
    "flex h-10 w-10 items-center justify-center text-blue-100 transition group-hover:text-blue-50";

  const normalizeTab = useCallback(
    (value: string | null): TabId => {
      if (value === "settings") {
        return isCommissioner ? "settings" : "leaderboard";
      }
      return value === "slips" ||
        value === "members" ||
        value === "feed" ||
        value === "chat"
        ? value
        : "leaderboard";
    },
    [isCommissioner]
  );
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    normalizeTab(searchParams.get("tab"))
  );

  useEffect(() => {
    if (!groupId) return;
    if (activeTab === "leaderboard" || activeTab === "settings") {
      dispatch(fetchAllLeaderboardsRequest({ group_id: groupId }));
      dispatch(fetchArchivedLeaderboardListRequest({ groupId: groupId }));
    }
  }, [dispatch, groupId, activeTab]);

  const leaderboardActiveSlips = openSlips;
  const leaderboardLockedSlips = reviewSlips;
  const leaderboardCompletedSlips = finalizeSlips;
  const vibeActiveSlips = openSlips;
  const vibeLockedSlips = reviewSlips;
  const vibeCompletedSlips = finalizeSlips;

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    const nextTab = normalizeTab(tabParam);
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [normalizeTab, tabParam]);

  useEffect(() => {
    if (!group) return;
    setEditGroupName(group.name);
    setEditGroupDescription(group.description ?? "");
  }, [group]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const groupLeaderboards = useMemo(
    () => leaderboardDataList.filter((board) => board.group_id === group?.id),
    [group?.id, leaderboardDataList]
  );
  const visibleLeaderboards = useMemo(
    () =>
      secondaryLeaderboardsEnabled
        ? groupLeaderboards
        : groupLeaderboards.filter((board) => board.isDefault),
    [groupLeaderboards, secondaryLeaderboardsEnabled]
  );
  const activeLeaderboards = useMemo(
    () => groupLeaderboards.filter((board) => board.status === "ACTIVE"),
    [groupLeaderboards]
  );

  const visibleActiveLeaderboards = useMemo(
    () => visibleLeaderboards.filter((board) => board.status === "ACTIVE"),
    [visibleLeaderboards]
  );

  const activeMainLeaderboard = useMemo(
    () => activeLeaderboards.find((board) => board.isDefault) ?? null,
    [activeLeaderboards]
  );
  const activeSecondaryLeaderboards = useMemo(
    () =>
      [...activeLeaderboards]
        .filter((board) => !board.isDefault)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [activeLeaderboards]
  );

  const sortedActiveLeaderboardsForView = useMemo(() => {
    const defaultBoard = visibleActiveLeaderboards.find((board) => board.isDefault);
    const sides = visibleActiveLeaderboards
      .filter((board) => !board.isDefault)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return defaultBoard ? [defaultBoard, ...sides] : sides;
  }, [visibleActiveLeaderboards]);

  const selectedLeaderboard = useMemo(
    () =>
      visibleLeaderboards.find((board) => board.id === activeLeaderboardId) ??
      visibleLeaderboards.find((board) => board.isDefault) ??
      null,
    [activeLeaderboardId, visibleLeaderboards]
  );

  const editingLeaderboard = useMemo(
    () =>
      groupLeaderboards.find((board) => board.id === editingLeaderboardId) ?? null,
    [editingLeaderboardId, groupLeaderboards]
  );

  const handleSelectArchivedLeaderboard = (boardId: string, archivedId: string) => {
    setArchivedLeaderboardId(boardId)
    setActiveLeaderboardId(boardId)
    if (archivedId && group?.id) {
      dispatch(fetchArchivedLeaderboardByIdRequest({ groupId: group?.id, archivedLeaderboard_id: archivedId }))
    }
  }

  const sideLimitReached = activeSecondaryLeaderboards.length >= 2;

  const confirmationCode = useMemo(() => {
    if (!group?.id) return "";
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }, [group?.id]);

  const handleArchiveSide = (leaderboardId: string) => {
    if (!currentUser) return;
    if (group?.id && leaderboardId) {
      dispatch(updateLeaderboardToArchivedRequest({ group_id: group.id, leaderboard_id: leaderboardId }));
    };
    setPendingLeaderboardAction(null);
  };

  const handleRestartDefault = () => {
    if (!currentUser) return;
    if (group?.id) {
      dispatch(startNewContestRequest({ group_id: group.id }));
    };
    setPendingLeaderboardAction(null);
  };

  const closeLeaderboardActionModal = () => setPendingLeaderboardAction(null);

  const confirmPendingLeaderboardAction = () => {
    if (!pendingLeaderboardAction) return;
    if (pendingLeaderboardAction.kind === "archive-secondary") {
      handleArchiveSide(pendingLeaderboardAction.leaderboardId);
      return;
    }
    handleRestartDefault();
  };

  const startLeaderboardNameEdit = (leaderboardId: string, currentName: string) => {
    setEditingLeaderboardId(leaderboardId);
    setLeaderboardNameDraft(currentName);
  };

  const cancelLeaderboardNameEdit = () => {
    setEditingLeaderboardId(null);
    setLeaderboardNameDraft("");
  };

  const handleTabChange = (tabId: TabId) => {
    if (!group) return;
    setActiveTab(tabId);
    const query = tabId === "leaderboard" ? "" : `?tab=${tabId}`;
    router.replace(`/group/${group.id}${query}`);
  };

  const toggleLeaderboardMenu = () => {
    setShowLeaderboardMenu((prev) => !prev);
  };

  const handleLeaderboardSelect = (leaderboardId: string) => {
    setActiveLeaderboardId(leaderboardId);
    setShowLeaderboardMenu(false);
  };

  const handleSlipSelect = (slipId?: string) => {
    if (!group || !slipId) return;

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
    const basePath = `/group/${group.id}/slips/${slipId}`;

    if (finalSlip?.status === "final") {
      router.push(`${basePath}/results`);
      return;
    }
    router.push(basePath);
  };

  const handleCreateSlipNavigation = () => {
    if (!group) return;
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    const modeQuery = slipTab === "vibe" ? "?mode=vibe" : "";
    navigationTimeoutRef.current = setTimeout(
      () => router.push(`/group/${group.id}/slips/create${modeQuery}`),
      800
    );
  };

  const handleOpenEditGroup = () => {
    if (!group) return;
    if (!isCommissioner) {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Only the commissioner can edit the group.",
        duration: 3000,
      });
      return;
    }
    setEditGroupName(group.name);
    setEditGroupDescription(group.description ?? "");
    setShowEditGroupModal(true);
  };

  const handleLoadMoreOpen = () => {
    if (!group?.id) return;
    const nextPage = openPage + 1;
    setOpenPage(nextPage);
    if (slipTab === "vibe") {
      dispatch(fetchAllVibeOpenSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    } else {
      dispatch(fetchAllOpenSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    }
  };

  const handleLoadMoreReview = () => {
    if (!group?.id) return;
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    if (slipTab === "vibe") {
      dispatch(fetchAllVibeReviewSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    } else {
      dispatch(fetchAllReviewSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    }
  };

  const handleLoadMoreFinal = () => {
    if (!group?.id) return;
    const nextPage = finalPage + 1;
    setFinalPage(nextPage);
    if (slipTab === "vibe") {
      dispatch(fetchAllVibeFinalizedSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    } else {
      dispatch(fetchAllFinalizedSlipsRequest({ group_id: group.id, page: nextPage, limit: 12 }));
    }
  };

  const handleLoadMoreLeaderboard = () => {
    if (!group?.id || !selectedLeaderboard?.id) return;
    const nextPage = leaderboardPage + 1;
    setLeaderboardPage(nextPage);
    dispatch(fetchLeaderboardRequest({
      groupId: group.id,
      leaderboard_id: selectedLeaderboard.id,
      page: nextPage,
      limit: 5
    }));
  };

  useEffect(() => {
    if (activeTab === "leaderboard" && !archivedLeaderboardId) {
      const defaultLeaderboard = groupLeaderboards.find((l) => l.isDefault && l.status === "ACTIVE")
      if (defaultLeaderboard?.id) {
        setActiveLeaderboardId(defaultLeaderboard?.id)
      }
    }
    setLeaderboardPage(1);
  }, [groupLeaderboards, activeTab, archivedLeaderboardId]);

  useEffect(() => {
    if (activeTab !== "settings") {
      setEditingLeaderboardId(null);
      setLeaderboardNameDraft("");
    }
  }, [activeTab]);

  useEffect(() => {
    if (secondaryLeaderboardsEnabled) {
      setSecondaryLeaderboardsDetailsOpen(true);
      return;
    }
    setShowCreateSideModal(false);
    setSecondaryLeaderboardsDetailsOpen(false);
    if (editingLeaderboard && !editingLeaderboard.isDefault) {
      setEditingLeaderboardId(null);
      setLeaderboardNameDraft("");
    }
  }, [editingLeaderboard, secondaryLeaderboardsEnabled]);

  useEffect(() => {
    if (!visibleLeaderboards.length) return;
    if (
      activeLeaderboardId &&
      visibleLeaderboards.some((board) => board.id === activeLeaderboardId)
    ) {
      return;
    }
    const fallback =
      visibleLeaderboards.find((board) => board.isDefault && board.status === "ACTIVE")?.id ??
      visibleLeaderboards[0]?.id ??
      null;
    if (fallback && fallback !== activeLeaderboardId) {
      setActiveLeaderboardId(fallback);
    }
  }, [activeLeaderboardId, visibleLeaderboards]);

  useEffect(() => {
    if (!showLeaderboardMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!leaderboardMenuRef.current?.contains(event.target as Node)) {
        setShowLeaderboardMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowLeaderboardMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLeaderboardMenu]);

  useEffect(() => {
    if (!loading && groupMessage) {
      setToast({
        id: Date.now(),
        type: "success",
        message: groupMessage,
        duration: 3000,
      });
      dispatch(clearCreateNewLeaderboardMessage());
    }
    if (!loading && errorMessage) {
      setToast({
        id: Date.now(),
        type: "error",
        message: errorMessage,
        duration: 3000,
      });
      dispatch(clearUpdateGroupMessage());
    }
    if (!deleteLoading && deleteMessage) {
      setToast({
        id: Date.now(),
        type: "success",
        message: deleteMessage,
        duration: 3000,
      });
      dispatch(clearConfirmDeleteGroupMessage());
      router.replace("/fantasy");
    }
  }, [loading, groupMessage, setToast, dispatch, deleteLoading, deleteMessage, router, errorMessage]);

  useEffect(() => {
    if (!loading && !groupData && currentUser) {
      const timer = setTimeout(() => {
        router.replace("/home");
      }, 1000);
      return () => clearTimeout(timer)
    }
  }, [loading, groupData, router, currentUser]);

  // Fetch specific leaderboard data
  useEffect(() => {
    if (
      group?.id &&
      selectedLeaderboard?.id &&
      (activeTab === "leaderboard" || activeTab === "settings") &&
      !archivedLeaderboardId
    ) {
      setLeaderboardPage(1);
      dispatch(fetchLeaderboardRequest({
        groupId: group?.id,
        leaderboard_id: selectedLeaderboard?.id,
        page: 1,
        limit: 5
      }));
    }
  }, [group?.id, selectedLeaderboard?.id, activeTab, archivedLeaderboardId, dispatch]);

  // Fetch granular slips for "Slips" tab
  useEffect(() => {
    if (activeTab === "slips" && group?.id) {
      if (slipTab === "vibe") {
        dispatch(fetchAllVibeOpenSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
        dispatch(fetchAllVibeReviewSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
        dispatch(fetchAllVibeFinalizedSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
      } else {
        dispatch(fetchAllOpenSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
        dispatch(fetchAllReviewSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
        dispatch(fetchAllFinalizedSlipsRequest({ group_id: group?.id, page: 1, limit: 12 }));
      }
    }
  }, [group?.id, activeTab, slipTab, dispatch]);

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

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!editGroupName?.trim()) {
      nextErrors.name = "Group name is required.";
    }

    if (editGroupName.length > 15) {
      nextErrors.name = "Group name must be 15 characters or less.";
    }

    if (editGroupDescription.length > 50) {
      nextErrors.description = "Group description must be 50 characters or less.";
    }

    const containsNameRestricted = checkAnyRestrictedWords(editGroupName);
    if (containsNameRestricted) {
      nextErrors.name = "Group name contains inappropriate language.";
    }

    const containsDescriptionRestricted = checkAnyRestrictedWords(editGroupDescription || "");
    if (containsDescriptionRestricted) {
      nextErrors.description = "Group description contains inappropriate language.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [editGroupName, editGroupDescription]);

  if (!rawGroup && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
        Group not found. Head back to Home and pick a different crew.
      </div>
    );
  }

  const handleDeleteGroup = async () => {
    if (!isCommissioner) {
      setDeleteError("Only the commissioner can delete this group.");
      return;
    }

    const phraseMatches = deleteConfirmation === confirmationCode;
    if (!phraseMatches || !acknowledged || isDeletingGroup) {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Type the confirmation code and acknowledge the warning.",
        duration: 3000,
      })
      return;
    }

    try {
      setIsDeletingGroup(true);
      setIsConfirmDeleteModalOpen(true);
      setDeleteError(null);
      if (group.id) {
        dispatch(initialGroupDeleteRequest({ group_id: group?.id }));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete group.";
      setDeleteError(message);
    }
  };

  const handleLeaveGroup = () => {
    if (!group || !currentUser) return;
    if (isCommissioner) {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Commissioners need to transfer ownership before leaving.",
        duration: 3000,
      });
      return;
    }
    if (group.id) {
      setLeavingGroup(true);
      dispatch(leaveGroupRequest({ group_id: group.id }));
    }
    setLeavingGroup(false);
  };

  const closeSideContestModal = () => {
    setShowCreateSideModal(false);
    setSideContestName("");
  };

  const handleCreateSideContest = () => {
    if (!group || !currentUser) return;
    if (group.id) {
      dispatch(createNewLeaderboardRequest({
        group_id: group.id,
        name: sideContestName,
        sport_scope: null,
      }));
      closeSideContestModal();
    }
  };

  const saveLeaderboardName = (leaderboardId: string) => {
    if (!currentUser) return;
    if (leaderboardId && group?.id) {
      dispatch(updateLeaderboardRequest({
        group_id: group.id,
        leaderboard_id: leaderboardId,
        name: leaderboardNameDraft,
      }))
    }
    cancelLeaderboardNameEdit();
  };

  const handleSaveGroupDetails = async () => {
    if (!group || !currentUser) return;

    if (!validate()) return;

    const name = editGroupName.trim();
    const description = editGroupDescription.trim();

    if (group.name === name && (group.description || "") === description) {
      setShowEditGroupModal(false);
      return;
    }

    if (group.id) {
      dispatch(
        updateGroupRequest({
          group_id: group.id,
          name,
          description,
        })
      );
    }
    setShowEditGroupModal(false);
  };

  const handleRemoveMember = async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Not authenticated." };
    }

    if (!groupId) {
      return { success: false, error: "Group not found." };
    }

    try {
      dispatch(
        removeGroupMemberRequest({
          user_id: userId,
          group_id: groupId,
        })
      );

      router.replace("/fantasy");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove member.",
      };
    }
  };

  const handleTransferCommissioner = async (
    newCommissionerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Not authenticated." };
    }

    if (!groupId) {
      return { success: false, error: "Group not found." };
    }

    try {
      dispatch(
        updateGroupMemberRoleRequest({
          member_id: newCommissionerId,
          role: "commissioner",
          group_id: groupId,
        })
      );

      router.replace("/fantasy");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to transfer commissioner role.",
      };
    }
  };

  const handleCloseConfirmDeleteModal = () => {
    setIsConfirmDeleteModalOpen(false);
    setIsDeletingGroup(false);
    setDeleteError(null);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!isCommissioner) {
      setDeleteError("Only the commissioner can delete this group.");
      return;
    }
    try {
      if (group?.id) dispatch(confirmDeleteGroupRequest({ group_id: group?.id, otp: deleteConfirmationCode }));
      setDeleteError(null);
      setIsDeletingGroup(false);
      setIsConfirmDeleteModalOpen(false);
      setDeleteConfirmationCode("");
      setDeleteConfirmation("");
      setAcknowledged(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete group.";
      setDeleteError(message);
    }
  };

  const handleSecondaryLeaderboardsToggle = () => {
    if (!group || !currentUser) return;
    if (group.id) {
      dispatch(enableSecondaryLeaderboardRequest({ group_id: group.id, isEnable: !secondaryLeaderboardsEnabled }));
    }
  };

  const archivedLeaderboardsContent = ArchiveLeaderboardList && ArchiveLeaderboardList?.archivedLeaderboards?.length ? (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {ArchiveLeaderboardList.archivedLeaderboards.map((board, index) => (
        <button
          key={board.id}
          type="button"
          onClick={() => handleSelectArchivedLeaderboard(board.leaderboard_id, board.id)}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] ${index > 0 ? "border-t border-white/10" : ""
            }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-white">{board.label}</p>
              <p className="flex-none text-[10px] uppercase tracking-wide text-gray-500">
                {formatArchivedLeaderboardMeta(board)}
              </p>
            </div>
            {board.leaderboards.sport_scope && (
              <p className="mt-1 text-[11px] text-gray-500">Scope: {board.leaderboards.sport_scope}</p>
            )}
          </div>
          <ChevronIcon className="h-4 w-4 flex-none text-gray-500" />
        </button>
      ))}
    </div>
  ) : (
    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
      No archived leaderboards yet.
    </div>
  );

  if ((loading && !group) || !currentUser) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-48 max-w-[70vw] sm:w-60">
          <FootballAnimation />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between ">
          <BackButton
            label="back to all groups"
            fallback="/fantasy"
            preferFallback
            className="inline-flex items-center justify-center gap-2 text-[11px] font-semibold normal-case py-2 tracking-[0.12em] text-gray-300 transition hover:text-white"
          />
          <button
            type="button"
            onClick={handleOpenEditGroup}
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/60 hover:text-emerald-50 sm:ml-auto"
            aria-label="Edit group"
          >
            <EditPencilIcon />
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-10 sm:flex-nowrap">
            <h1
              className={`allow-caps text-2xl min-[326px]:text-3xl font-extrabold text-transparent bg-clip-text`}
              style={displayNameGradientStyle}
            >
              {group?.name}
            </h1>
          </div>
          {group?.description &&
            <p className="text-sm text-gray-400 break-words line-clamp-2">
              {group.description}
            </p>}
        </div>
      </header>

      <section className="space-y-4">
        <div className="-mx-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-white/10 px-5 sm:mx-0 sm:px-0">
          <div className="flex min-w-0 flex-wrap gap-1 overflow-y-hidden sm:flex-nowrap sm:gap-2 sm:overflow-x-auto lg:gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:py-2 sm:text-xs md:px-4 md:py-2.5 md:text-sm ${isActive ? "text-white" : "text-gray-400 hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="sm:hidden" aria-hidden>
                      {iconForTab(tab.id)}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sr-only">{tab.label}</span>
                  </div>
                  <span
                    className={`absolute inset-x-1 -bottom-[1px] h-0.5 rounded-full transition ${isActive ? "bg-white" : "bg-transparent"
                      }`}
                  />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowScoringModal(true)}
            className="mb-1 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold leading-none text-gray-300 transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:h-7 sm:w-7 sm:text-[11px]"
            aria-label="Group scoring"
            aria-haspopup="dialog"
          >
            i
          </button>
        </div>

        {activeTab === "leaderboard" && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-wide text-gray-500">
              <div className="flex flex-wrap items-center gap-3">
                <div ref={leaderboardMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={toggleLeaderboardMenu}
                    aria-expanded={showLeaderboardMenu}
                    aria-controls="leaderboard-switcher"
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-2 font-semibold text-gray-300 transition hover:text-white"
                  >
                    <span className="normal-case">
                      {selectedLeaderboard?.name ?? "Leaderboard"}
                    </span>
                    <ChevronUpDownIcon className={`h-3 w-3 transition ${showLeaderboardMenu
                      ? "rotate-180 text-emerald-300"
                      : "text-gray-500"
                      }`} />
                  </button>
                  {showLeaderboardMenu && (
                    <div
                      id="leaderboard-switcher"
                      role="menu"
                      className="absolute left-0 top-full z-20 mt-2 w-64 max-w-[85vw] rounded-2xl border border-white/10 bg-black/90 p-2 shadow-xl backdrop-blur"
                    >
                      <div className="space-y-1">
                        <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                          Active boards
                        </p>
                        {sortedActiveLeaderboardsForView.length ? (
                          sortedActiveLeaderboardsForView.map((board) => {
                            const isSelected = selectedLeaderboard?.id === board.id;
                            return (
                              <button
                                key={board.id}
                                type="button"
                                role="menuitem"
                                onClick={() => handleLeaderboardSelect(board.id)}
                                className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left transition ${isSelected
                                  ? "bg-emerald-500/15 text-emerald-100"
                                  : "text-gray-200 hover:bg-white/5"
                                  }`}
                                aria-current={isSelected ? "true" : undefined}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold normal-case">
                                    {board.name}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${board.isDefault
                                      ? "border-emerald-300/40 text-emerald-100"
                                      : "border-white/10 text-gray-400"
                                      }`}
                                  >
                                    {board.isDefault ? "Main" : "Secondary"}
                                  </span>
                                </div>
                                {board?.sport_scope && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    {board?.sport_scope}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-gray-500">
                            No leaderboards yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <span>
                  {leaderboardSlipsList.length
                    ? `${leaderboardSlipsList.length} leaderboard slips`
                    : "No leaderboard slips yet"}
                </span>
              </div>
            </div>

            {loadingLeaderboard ? (
              <LeaderboardSkeleton />
            ) : selectedLeaderboard ? (
              <LeaderboardGrid
                group={group}
                leaderboard={archivedLeaderboardId ? archiveLeaderboardData : leaderboardList}
                leaderboardId={selectedLeaderboard.id}
                leaderboardName={selectedLeaderboard.name}
                currentUserId={currentUser?.userId}
                leaderboardSlips={leaderboardSlipsList}
                onLoadMore={handleLoadMoreLeaderboard}
                hasMore={hasMoreLeaderboard}
                loadingMore={loadingLeaderboard}
                isArchived={!!archivedLeaderboardId}
                archivedLeaderboardSlips={archivedLeaderboardSlipsList}
              />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                No leaderboard found yet.
              </div>
            )}

            <section id="leaderboard-archived-leaderboards-panel" className="space-y-3">
              <button
                type="button"
                onClick={() => setShowLeaderboardArchivedLeaderboards((prev) => !prev)}
                aria-expanded={showLeaderboardArchivedLeaderboards}
                aria-controls="leaderboard-archived-leaderboards-details"
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-300">
                    Archived leaderboards
                  </p>
                  <p className="text-[10px] text-gray-500">
                    View past main and secondary boards.
                  </p>
                </div>
                <span className="text-gray-400">
                  {showLeaderboardArchivedLeaderboards ? "▴" : "▾"}
                </span>
              </button>
              {showLeaderboardArchivedLeaderboards && (
                <div id="leaderboard-archived-leaderboards-details">
                  {archivedLeaderboardsContent}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "slips" && (
          <>
            {slipLoader ? (
              <SlipsSkeleton />
            ) : (
              <div className="space-y-6 pt-2">
                <button
                  type="button"
                  onClick={handleCreateSlipNavigation}
                  className={createSlipButtonClass}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Create a new slip</p>
                  </div>
                  <span
                    className={createSlipIconClass}
                    aria-hidden
                  >
                    <PlusIcon />
                  </span>
                </button>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      choose slip type
                    </div>
                    <div className="inline-flex items-center gap-4">
                      {(["leaderboard", "vibe"] as const).map((tab) => {
                        const isActive = slipTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setSlipTab(tab)}
                            className={`border-b-2 pb-1 text-[11px] font-semibold uppercase tracking-wide transition ${isActive
                              ? "border-white text-white"
                              : "border-transparent text-gray-400 hover:border-white/40 hover:text-white"
                              }`}
                          >
                            {tab === "leaderboard" ? "leaderboard slips" : "vibe slips"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {slipTab === "leaderboard" ? (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span className="text-xs font-normal normal-case text-gray-500">
                          Count toward leaderboards
                        </span>
                      </div>
                      <SlipCategorySection
                        title="open for picks"
                        slips={leaderboardActiveSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreOpen}
                        layout="grid"
                        emptyCopy="No leaderboard slips open yet — create one to kick things off."
                        hasMore={hasMoreOpens}
                      />
                      <SlipCategorySection
                        title="slips in review"
                        slips={leaderboardLockedSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreReview}
                        layout="grid"
                        emptyCopy="No locked leaderboard slips right now."
                        hasMore={hasMoreReviews}
                      />
                      <SlipCategorySection
                        title="finalized slips"
                        slips={leaderboardCompletedSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreFinal}
                        layout="grid"
                        emptyCopy="No finalized leaderboard slips yet."
                        hasMore={hasMoreFinalizes}
                      />
                    </section>
                  ) : (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span className="text-xs font-normal normal-case text-gray-500">
                          XP only
                        </span>
                      </div>
                      <SlipCategorySection
                        title="open for picks"
                        slips={vibeActiveSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreOpen}
                        layout="grid"
                        emptyCopy="No vibe slips open yet — drop one to set the tone."
                        hasMore={hasMoreOpens}
                      />
                      <SlipCategorySection
                        title="slips in review"
                        slips={vibeLockedSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreReview}
                        layout="grid"
                        emptyCopy="No locked vibe slips right now."
                        hasMore={hasMoreReviews}
                      />
                      <SlipCategorySection
                        title="finalized slips"
                        slips={vibeCompletedSlips || []}
                        onSelect={handleSlipSelect}
                        onLoadMore={handleLoadMoreFinal}
                        layout="grid"
                        emptyCopy="No finalized vibe slips yet."
                        hasMore={hasMoreFinalizes}
                      />
                    </section>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "members" && (
          <div className="space-y-4 pt-2">
            {loadingMembers && !members.length ? (
              <MembersSkeleton />
            ) : (
              <ModifyMembers
                currentUser={currentUser}
                onRemoveMember={handleRemoveMember}
                onMakeCommissioner={handleTransferCommissioner}
                onLeaveGroup={handleLeaveGroup}
                leavingGroup={leavingGroup}
                groupId={groupId}
              />
            )}
          </div>
        )}

        {activeTab === "feed" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-sm text-gray-300 shadow-lg">
              <FeedTab groupId={group?.id} />
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-sm text-gray-300 shadow-lg">
              Chat is coming soon. Rally the crew here once it launches.
            </div>
          </div>
        )}

        {activeTab === "settings" && isCommissioner && (
          <div className="pt-2">
            <section
              id="main-leaderboard-panel"
              className={mainLeaderboardDetailsOpen ? "pb-6" : "pb-4"}
            >
              <button
                type="button"
                onClick={() => setMainLeaderboardDetailsOpen((prev) => !prev)}
                aria-expanded={mainLeaderboardDetailsOpen}
                aria-controls="main-leaderboard-details"
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Main leaderboard
                  </p>
                </div>
                <span className="text-gray-400">
                  {mainLeaderboardDetailsOpen ? "▴" : "▾"}
                </span>
              </button>
              <p className="mt-1 text-xs text-gray-500">
                This board is always on. Restarting it archives the current main leaderboard and
                every active secondary leaderboard.
              </p>

              {mainLeaderboardDetailsOpen && (
                <div id="main-leaderboard-details" className="space-y-4 pt-4">
                  {activeMainLeaderboard ? (
                    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] p-5 shadow-sm transition hover:border-white/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {activeMainLeaderboard.name}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                editingLeaderboardId === activeMainLeaderboard.id
                                  ? cancelLeaderboardNameEdit()
                                  : startLeaderboardNameEdit(
                                    activeMainLeaderboard.id,
                                    activeMainLeaderboard.name
                                  )
                              }
                              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-200 transition hover:border-emerald-300/60 hover:text-white"
                              aria-label={`Edit ${activeMainLeaderboard.name} leaderboard name`}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              // activeMainLeaderboard.isDefault
                              //   ? handleRestartDefault()
                              //   : handleArchiveSide(activeMainLeaderboard.id)
                              setPendingLeaderboardAction({
                                kind: "restart-main",
                                leaderboardId: activeMainLeaderboard.id,
                                leaderboardName: activeMainLeaderboard.name,
                              })
                            }
                            disabled={activeMainLeaderboard.hasAnyOpenSlips}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-rose-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Archive & restart
                          </button>
                        </div>
                      </div>
                      {editingLeaderboardId === activeMainLeaderboard.id && (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/50 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className="flex-1 text-xs uppercase tracking-wide text-gray-400">
                              <span className="block pb-2">Leaderboard name</span>
                              <input
                                value={leaderboardNameDraft}
                                onChange={(event) => setLeaderboardNameDraft(event.target.value)}
                                maxLength={MAX_LEADERBOARD_NAME_LENGTH}
                                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-2 text-base sm:text-sm text-white outline-none transition focus:border-emerald-400/70"
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveLeaderboardName(activeMainLeaderboard.id)}
                                disabled={
                                  !leaderboardNameDraft.trim() ||
                                  leaderboardNameDraft.trim().length > MAX_LEADERBOARD_NAME_LENGTH
                                }
                                className="rounded-2xl bg-emerald-500/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelLeaderboardNameEdit}
                                className="rounded-2xl border border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeMainLeaderboard.hasAnyOpenSlips && (
                        <p className="mt-3 text-xs text-amber-200">
                          Finalize or delete any open slips in order to archive and restart
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                      No active main leaderboard found.
                    </div>
                  )}
                </div>
              )}
            </section>

            <div
              className={`-mx-5 h-px bg-white/10 sm:mx-0 ${mainLeaderboardDetailsOpen ? "my-6" : "my-4"}`}
            />

            <section
              id="secondary-leaderboards-panel"
              className={
                secondaryLeaderboardsEnabled && secondaryLeaderboardsDetailsOpen
                  ? "pb-6"
                  : "pb-4"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Secondary leaderboards
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSecondaryInfo(true)}
                    aria-haspopup="dialog"
                    aria-controls="secondary-leaderboards-info-modal"
                    aria-label="Secondary leaderboards info"
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] font-semibold text-gray-300 transition hover:border-emerald-300/60 hover:text-white"
                  >
                    i
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gray-300">
                    <input
                      type="checkbox"
                      checked={secondaryLeaderboardsEnabled}
                      onChange={handleSecondaryLeaderboardsToggle}
                      className="h-4 w-4 rounded border border-white/20 bg-black text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                    />
                    Enable
                  </label>
                  {secondaryLeaderboardsEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        setSecondaryLeaderboardsDetailsOpen((prev) => !prev)
                      }
                      aria-expanded={secondaryLeaderboardsDetailsOpen}
                      aria-controls="secondary-leaderboards-details"
                      className="text-gray-400 transition hover:text-gray-200"
                    >
                      {secondaryLeaderboardsDetailsOpen ? "▴" : "▾"}
                    </button>
                  )}
                </div>
              </div>

              {!secondaryLeaderboardsEnabled && (
                <p className="mt-1 text-xs text-gray-500">
                  Turn this on to track separate side standings. Any archived leaderboards stay
                  viewable below.
                </p>
              )}

              {secondaryLeaderboardsEnabled && secondaryLeaderboardsDetailsOpen && (
                <div id="secondary-leaderboards-details" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateSideModal(true)}
                      disabled={sideLimitReached}
                      className={`${primaryActionButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span className="text-sm font-semibold text-white">
                        Create a secondary leaderboard
                      </span>
                      <span className={primaryActionIconClass} aria-hidden>
                        <PlusIcon />
                      </span>
                    </button>
                  </div>

                  {sideLimitReached && (
                    <p className="text-xs text-amber-200">
                      You already have two active secondary leaderboards. Archive one to start
                      another.
                    </p>
                  )}

                  {activeSecondaryLeaderboards.length ? (
                    <div className="grid grid-cols-1 gap-3">
                      {activeSecondaryLeaderboards.map((board) => {
                        const blockedReason = board.hasAnyOpenSlips
                          ? "You have open slips still running in this leaderboard."
                          : null;
                        return (
                          <div key={board.id} className={secondaryLeaderboardCardClass}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white">{board.name}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editingLeaderboardId === board.id
                                        ? cancelLeaderboardNameEdit()
                                        : startLeaderboardNameEdit(board.id, board.name)
                                    }
                                    className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-200 transition hover:border-emerald-300/60 hover:text-white"
                                    aria-label={`Edit ${board.name} leaderboard name`}
                                  >
                                    <EditIcon />
                                  </button>
                                </div>
                                {board.sport_scope && (
                                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                    {board.sport_scope}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    // handleArchiveSide(board.id)
                                    setPendingLeaderboardAction({
                                      kind: "archive-secondary",
                                      leaderboardId: board.id,
                                      leaderboardName: board.name,
                                    })
                                  }
                                  disabled={Boolean(blockedReason) || board.hasAnyOpenSlips}
                                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-rose-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Archive
                                </button>
                              </div>
                            </div>
                            {editingLeaderboardId === board.id && (
                              <div className="mt-3 rounded-2xl border border-white/10 bg-black/50 p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <label className="flex-1 text-xs uppercase tracking-wide text-gray-400">
                                    <span className="block pb-2">Leaderboard name</span>
                                    <input
                                      value={leaderboardNameDraft}
                                      onChange={(event) =>
                                        setLeaderboardNameDraft(event.target.value)
                                      }
                                      maxLength={MAX_LEADERBOARD_NAME_LENGTH}
                                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-2 text-base sm:text-sm text-white outline-none transition focus:border-emerald-400/70"
                                    />
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveLeaderboardName(board.id)}
                                      disabled={
                                        !leaderboardNameDraft.trim() ||
                                        leaderboardNameDraft.trim().length > MAX_LEADERBOARD_NAME_LENGTH
                                      }
                                      className="rounded-2xl bg-emerald-500/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelLeaderboardNameEdit}
                                      className="rounded-2xl border border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {blockedReason && (
                              <p className="mt-3 text-xs text-amber-200">{blockedReason}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                      No active secondary leaderboards yet.
                    </div>
                  )}
                </div>
              )}
            </section>

            <div
              className={`-mx-5 h-px bg-white/10 sm:mx-0 ${secondaryLeaderboardsEnabled && secondaryLeaderboardsDetailsOpen
                ? "my-6"
                : "my-4"
                }`}
            />

            <section
              id="archived-leaderboards-panel"
              className={showSettingsArchivedLeaderboards ? "pb-6" : "pb-4"}
            >
              <button
                type="button"
                onClick={() => setShowSettingsArchivedLeaderboards((prev) => !prev)}
                aria-expanded={showSettingsArchivedLeaderboards}
                aria-controls="archived-leaderboards-details"
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Archived leaderboards
                  </p>
                  <p className="text-xs text-gray-500">
                    Main leaderboard restarts and archived secondary boards are organized here.
                  </p>
                </div>
                <span className="text-gray-400">
                  {showSettingsArchivedLeaderboards ? "▴" : "▾"}
                </span>
              </button>
              {showSettingsArchivedLeaderboards && (
                <div id="archived-leaderboards-details" className="mt-4">
                  {archivedLeaderboardsContent}
                </div>
              )}
            </section>

            <div
              className={`-mx-5 h-px bg-white/10 sm:mx-0 ${showSettingsArchivedLeaderboards ? "my-6" : "my-4"
                }`}
            />

            <section className="pt-2">
              <button
                type="button"
                onClick={() => setDangerZoneOpen((prev) => !prev)}
                aria-expanded={dangerZoneOpen}
                aria-controls="danger-zone-content"
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-wide text-red-300">Delete group</p>
                </div>
                <span className="text-red-200">{dangerZoneOpen ? "▴" : "▾"}</span>
              </button>
              {dangerZoneOpen && (
                <div id="danger-zone-content" className="mt-4 space-y-3">
                  <p className="text-xs text-red-100">
                    delete this group and all associated leaderboards and slips.
                  </p>
                  <label className="flex flex-col gap-2 text-sm text-gray-200">
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      Type{" "}
                      <span className="font-semibold text-rose-200">{confirmationCode}</span> to
                      confirm
                    </span>
                    <input
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base sm:text-sm text-white outline-none transition focus:border-red-400/70"
                    />
                  </label>

                  <label className="flex items-center gap-3 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                      className="h-4 w-4 rounded border border-white/20 bg-black text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                    />
                    I understand this action is permanent.
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleDeleteGroup}
                      disabled={deleteConfirmation !== confirmationCode || !acknowledged}
                      className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/70 via-red-700/40 to-black/40 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-red-400/40 hover:from-red-800/80 hover:via-red-600/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete group permanently
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>

      <ScoringModal
        open={showScoringModal}
        onClose={() => setShowScoringModal(false)}
        variant="group"
      />

      {pendingLeaderboardAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeLeaderboardActionModal}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h3 className="text-base font-semibold text-white">
                  {pendingLeaderboardAction.kind === "archive-secondary"
                    ? "Archive leaderboard"
                    : "Archive & restart"}
                </h3>
                <p className="text-xs text-gray-400">
                  {pendingLeaderboardAction.kind === "archive-secondary"
                    ? `Archive ${pendingLeaderboardAction.leaderboardName}? No new slips will count toward it.`
                    : `Archive ${pendingLeaderboardAction.leaderboardName} and restart? This will also archive the secondary leaderboards.`}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={closeLeaderboardActionModal}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPendingLeaderboardAction}
                  className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                >
                  {pendingLeaderboardAction.kind === "archive-secondary"
                    ? "Archive leaderboard"
                    : "Archive & restart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowEditGroupModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Edit group details</h2>
                <p className="text-xs text-gray-400">
                  Update the name or description for {group?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditGroupModal(false)}
                className="rounded-full border border-white/15 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                aria-label="Close edit group"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">group name</span>
                <input
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base sm:text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="Group name"
                />
                {errors.name && (
                  <span className="text-xs font-medium text-red-400">
                    {errors.name}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  description (optional)
                </span>
                <textarea
                  value={editGroupDescription}
                  onChange={(event) => setEditGroupDescription(event.target.value)}
                  className="min-h-[96px] resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="What's this group about?"
                />
                {errors.description && (
                  <span className="text-xs font-medium text-red-400">
                    {errors.description}
                  </span>
                )}
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroupDetails}
                  disabled={!editGroupName.trim()}
                  className="rounded-2xl bg-emerald-500/80 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {secondaryLeaderboardsEnabled && showCreateSideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={closeSideContestModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">
                  Create a secondary leaderboard
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSideContestModal}
                className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                aria-label="Close secondary leaderboard modal"
              >
                X
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  leaderboard name
                </span>
                <input
                  value={sideContestName}
                  onChange={(event) => setSideContestName(event.target.value)}
                  maxLength={MAX_LEADERBOARD_NAME_LENGTH}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base sm:text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="NBA playoff slips"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeSideContestModal}
                  className="rounded-lg border border-slate-800/80 px-4 py-2 text-xs tracking-wide text-gray-300 transition hover:border-slate-700/80"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSideContest}
                  disabled={
                    !sideContestName.trim() ||
                    sideContestName.trim().length > MAX_LEADERBOARD_NAME_LENGTH ||
                    sideLimitReached
                  }
                  className="rounded-lg bg-sky-500/25 px-5 py-2 text-xs font-semibold tracking-wide text-sky-100 transition hover:bg-sky-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {archivedLeaderboardId && ArchivedLeaderboardObject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setArchivedLeaderboardId(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Archived leaderboard
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {ArchivedLeaderboardObject.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setArchivedLeaderboardId(null)}
                className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                aria-label="Close archived leaderboard"
              >
                X
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <LeaderboardGrid
                group={group}
                leaderboardId={ArchivedLeaderboardObject.leaderboard_id}
                leaderboardName={ArchivedLeaderboardObject.label}
                currentUserId={currentUser?.userId}
                leaderboard={archiveLeaderboardData}
                leaderboardSlips={leaderboardSlipsList}
                archivedLeaderboardSlips={archivedLeaderboardSlipsList}
                isArchived={true}
              />
            </div>
          </div>
        </div>
      )}

      {isConfirmDeleteModalOpen && (
        <DeleteGroupConfirmationModal
          open={isConfirmDeleteModalOpen}
          confirmationValue={deleteConfirmationCode}
          hasPermission={isCommissioner}
          isDeleting={isDeletingGroup}
          errorMessage={deleteError}
          onConfirmationChange={(value: string) => setDeleteConfirmationCode(value)}
          onClose={handleCloseConfirmDeleteModal}
          onConfirm={handleConfirmDeleteGroup}
        />
      )}

      <SecondaryLeaderboardsInfoModal
        open={showSecondaryInfo}
        onClose={() => setShowSecondaryInfo(false)}
      />
    </div>
  );
};

const SecondaryLeaderboardsInfoModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
      id="secondary-leaderboards-info-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secondary-leaderboards-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="space-y-1">
            <h2 id="secondary-leaderboards-title" className="text-lg font-semibold text-white">
              Secondary leaderboards
            </h2>
            <p className="text-xs text-gray-400">How it works</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            aria-label="Close secondary leaderboards info"
          >
            x
          </button>
        </div>
        <div className="space-y-3 px-5 py-5 text-sm text-gray-200">
          <p>
            Every slip counts toward the Main Leaderboard by default, but Secondary Leaderboards
            let your group keep separate rankings for specific types of slips. When enabled, the
            commissioner can assign certain slips to a Secondary Leaderboard.
          </p>
          <p>
            For example, your group might want separate rankings for NFL slips vs NBA slips, or a
            dedicated board just for the Playoffs. This lets members easily see how they rank
            within just that league or category. You can assign a slip to a secondary leaderboard
            during slip creation (or update it later in slip actions if enabled).
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroupPage;
