"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { clearConfirmDeleteGroupMessage, clearCreateNewLeaderboardMessage, clearLeaveGroupMessage, confirmDeleteGroupRequest, createNewLeaderboardRequest, enableSecondaryLeaderboardRequest, fetchAllLeaderboardsRequest, fetchGroupByIdRequest, fetchLeaderboardRequest, initialGroupDeleteRequest, leaveGroupRequest, removeGroupMemberRequest, updateGroupMemberRoleRequest, updateGroupRequest, updateLeaderboardRequest, updateLeaderboardToArchivedRequest } from "@/lib/redux/slices/groupsSlice";
import { clearCreatePickMessage, fetchAllPicksRequest } from "@/lib/redux/slices/pickSlice";
import { Group, GroupSelector, Leaderboard, LeaderboardList, Picks, PickSelector, Slips, SlipSelector } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { fetchAllSlipsRequest, startNewContestRequest } from "@/lib/redux/slices/slipSlice";
import ModifyMembers, { MemberWithRole } from "@/components/group/ModifyMembers";
import { displayNameGradientStyle } from "@/lib/styles/text";
import LeaderboardGrid from "@/components/leaderboard/LeaderboardGrid";
import SlipCategorySection from "@/components/slips/SlipCategorySection";
import ScoringModal from "@/components/modals/ScoringModal";
import FeedTab from "@/components/group/FeedTab";
import FootballAnimation from "@/components/animations/FootballAnimation";
import BackButton from "@/components/ui/BackButton";
import { DeleteGroupConfirmationModal } from "@/components/group/ConfirmDeleteGroupModal";
import { X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { isSlipFinal, isSlipTimeLocked } from "@/lib/slips/state";

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

const GroupPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { setToast } = useToast();
  const currentUser = useCurrentUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const [leaderboardList, setLeaderboardList] = useState<Leaderboard[]>([]);
  const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);

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
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path d="M4 9h4v11H4zM10 4h4v16h-4zM16 12h4v8h-4z" strokeLinecap="round" />
          </svg>
        );
      case "slips":
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path d="M7 5h10a2 2 0 0 1 2 2v12l-3-2-3 2-3-2-3 2V7a2 2 0 0 1 2-2Z" />
            <path d="M9 9h6m-6 4h4" strokeLinecap="round" />
          </svg>
        );
      case "members":
        return (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 overflow-visible"
            fill="currentColor"
            aria-hidden
          >
            <circle
              cx="3.4"
              cy="5.4"
              r="3.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle
              cx="20.6"
              cy="5.4"
              r="3.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle
              cx="12"
              cy="10"
              r="3.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
            <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
            <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
          </svg>
        );
      case "feed":
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path d="M5 6h14M5 12h10M5 18h7" strokeLinecap="round" />
          </svg>
        );
      case "chat":
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path
              d="M5.5 17.5 4 21l3.75-1.5h8.5A3.75 3.75 0 0 0 20 15.75V8.25A3.75 3.75 0 0 0 16.25 4.5h-8.5A3.75 3.75 0 0 0 4 8.25v7.5a1.75 1.75 0 0 0 1.5 1.75Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 9.75h6m-6 3h3.75" strokeLinecap="round" />
          </svg>
        );
      case "settings":
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <circle cx="12" cy="12" r="2.75" />
            <path
              d="M4 12.75V11.5l2.1-.44a6 6 0 0 1 .65-1.56L5.8 7.7l.88-.88 1.8.95a6 6 0 0 1 1.56-.65L10.5 4h1.25l.44 2.1a6 6 0 0 1 1.56.65l1.36-1.96.88.88-.95 1.8a6 6 0 0 1 .65 1.56L20 10.5v1.25l-2.1.44a6 6 0 0 1-.65 1.56l1.96 1.36-.88.88-1.8-.95a6 6 0 0 1-1.56.65L13.5 20h-1.25l-.44-2.1a6 6 0 0 1-1.56-.65l-1.36 1.96-.88-.88.95-1.8a6 6 0 0 1-.65-1.56Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
  const [showSecondaryInfo, setShowSecondaryInfo] = useState(false);
  const [secondaryLeaderboardsDetailsOpen, setSecondaryLeaderboardsDetailsOpen] = useState(true);
  const [showArchivedLeaderboards, setShowArchivedLeaderboards] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [slipTab, setSlipTab] = useState<"leaderboard" | "vibe">(() =>
    searchParams.get("mode") === "vibe" ? "vibe" : "leaderboard"
  );
  const [showFootballOverlay, setShowFootballOverlay] = useState(false);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaderboardMenuRef = useRef<HTMLDivElement>(null);

  const {
    group: groupData,
    loading,
    leaderboard: leaderboardData,
    leaderboardList: leaderboardListData,
    loadingLeaderboard,
    message: groupMessage,
    deleteLoading,
    deleteMessage,
    leaveMessage,
    leaveLoading,
  } = useSelector((state: GroupSelector) => state.group);
  const { slip: slipState } = useSelector((state: SlipSelector) => state.slip);
  const { pick: pickState, loading: pickLoader, message: pickMessage } = useSelector((state: PickSelector) => state.pick);
  const slipData = slipState as { slips?: Slips } | null;
  const pickData = pickState as { picks?: Picks } | null;
  const rawGroup = useSelector((state: GroupSelector) => state.group.group);
  const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);

  useEffect(() => {
    if (!groupId || !currentUser) return;

    dispatch(fetchGroupByIdRequest({ groupId }));
    dispatch(fetchAllLeaderboardsRequest({ group_id: groupId }));
  }, [groupId, currentUser, dispatch])

  const isCommissioner =
    !!group && !!currentUser && group.created_by === currentUser.userId;
  const secondaryLeaderboardsEnabled =
    group?.is_enable_secondary_leaderboard ?? false;

  const activeSlip = group?.active_slip ?? null;
  const members = useMemo(() => group?.members ?? [], [group?.members]);

  const slips: Slips = useMemo(() => {
    if (!group?.id || !slipData?.slips?.length) return [];

    return slipData?.slips;
  }, [slipData, group?.id]);

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

  const leaderboardSlips = slips.filter((slip) => slip.isGraded && slip.slip_type === "fantasy");
  const vibeSlips = slips.filter((slip) => !slip.isGraded && slip.slip_type === "vibe");
  const isLockedSlip = (slip: (typeof slips)[number]) =>
    !isSlipFinal(slip) && isSlipTimeLocked(slip);
  const isOpenSlip = (slip: (typeof slips)[number]) =>
    !isSlipFinal(slip) && !isSlipTimeLocked(slip);
  const leaderboardActiveSlips = leaderboardSlips.filter(isOpenSlip);
  const leaderboardLockedSlips = leaderboardSlips.filter(isLockedSlip);
  const leaderboardCompletedSlips = leaderboardSlips.filter(isSlipFinal);
  const vibeActiveSlips = vibeSlips.filter(isOpenSlip);
  const vibeLockedSlips = vibeSlips.filter(isLockedSlip);
  const vibeCompletedSlips = vibeSlips.filter(isSlipFinal);

  const gradedFinalSlips = slips.filter(
    (slip) => slip.isGraded && slip.status === "final"
  );
  const gradedSlipIds = useMemo(
    () => new Set(gradedFinalSlips.map((slip) => slip.id)),
    [gradedFinalSlips]
  );

  const picks: Picks = useMemo(() => {
    if (!activeSlip?.id || !pickData?.picks?.length) return [];
    return pickData?.picks;
  }, [pickData, activeSlip?.id]);

  const gradedPicks = useMemo(
    () => picks.filter((pick) => gradedSlipIds.has(pick.id)),
    [gradedSlipIds, picks]
  );

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
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
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
  const archivedLeaderboards = useMemo(
    () => groupLeaderboards.filter((board) => board.status === "ARCHIVED"),
    [groupLeaderboards]
  );
  const visibleActiveLeaderboards = useMemo(
    () => visibleLeaderboards.filter((board) => board.status === "ACTIVE"),
    [visibleLeaderboards]
  );
  const activeSideLeaderboards = useMemo(
    () => activeLeaderboards.filter((board) => !board.isDefault),
    [activeLeaderboards]
  );
  const sortedActiveLeaderboards = useMemo(() => {
    const defaultBoard = activeLeaderboards.find((board) => board.isDefault);
    const sides = activeLeaderboards
      .filter((board) => !board.isDefault)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return defaultBoard ? [defaultBoard, ...sides] : sides;
  }, [activeLeaderboards]);
  const sortedActiveLeaderboardsForView = useMemo(() => {
    const defaultBoard = visibleActiveLeaderboards.find((board) => board.isDefault);
    const sides = visibleActiveLeaderboards
      .filter((board) => !board.isDefault)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return defaultBoard ? [defaultBoard, ...sides] : sides;
  }, [visibleActiveLeaderboards]);
  const sortedArchivedLeaderboards = useMemo(
    () =>
      [...archivedLeaderboards].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [archivedLeaderboards]
  );
  const selectedLeaderboard = useMemo(
    () =>
      visibleLeaderboards.find((board) => board.id === activeLeaderboardId) ??
      visibleLeaderboards.find((board) => board.isDefault) ??
      null,
    [activeLeaderboardId, visibleLeaderboards]
  );
  const archivedLeaderboard = useMemo(
    () =>
      groupLeaderboards.find((board) => board.id === archivedLeaderboardId) ?? null,
    [archivedLeaderboardId, groupLeaderboards]
  );
  const selectedLeaderboardSlips = useMemo(() => {
    if (!selectedLeaderboard?.id || !Array.isArray(slips) || slips.length === 0) {
      return [];
    }

    const leaderboardId = selectedLeaderboard.id;

    return slips.filter((slip) =>
      slip.isGraded === true &&
      // status === "final" &&
      // isSlipFinal(slip) &&
      Array.isArray(slip.leaderboard_ids) &&
      slip.leaderboard_ids.includes(leaderboardId)
    );
  }, [selectedLeaderboard?.id, slips]);

  const activeLeaderboardIds = useMemo(
    () => new Set(activeLeaderboards.map((board) => board.id)),
    [activeLeaderboards]
  );
  const hasOpenSlipOnActiveBoards = useMemo(() => {
    if (!slips?.length || !activeLeaderboardIds?.size) return false;

    return slips.some((slip) =>
      !isSlipFinal(slip) &&
      Array.isArray(slip.leaderboard_ids) &&
      slip.leaderboard_ids.some((id) => activeLeaderboardIds.has(id))
    );
  }, [slips, activeLeaderboardIds]);

  const hasOpenSlipForLeaderboard = useCallback(
    (leaderboardId: string) => {
      if (!leaderboardId || !slips?.length) return false;

      return slips.some((slip) =>
        !isSlipFinal(slip) &&
        Array.isArray(slip.leaderboard_ids) &&
        slip.leaderboard_ids.includes(leaderboardId)
      );
    },
    [slips]
  );

  const handleSelectArchivedLeaderboard = (boardId: string) => {
    setArchivedLeaderboardId(boardId)
    setActiveLeaderboardId(boardId)
  }

  const sideLimitReached = activeSideLeaderboards.length >= 2;

  const membersWithRoles: MemberWithRole[] = useMemo(
    () =>
      members.map((member) => ({
        ...member,
        isOwner: member.user_id === group?.created_by,
      })),
    [group?.created_by, members]
  );

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
    const confirmed = window.confirm(
      "Archive this secondary leaderboard? No new slips will count toward it."
    );
    if (!confirmed) return;
    if (group?.id && leaderboardId) {
      dispatch(updateLeaderboardToArchivedRequest({ group_id: group.id, leaderboard_id: leaderboardId }));
    }
  };

  const handleRestartDefault = () => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      "Archive the main leaderboard and restart? This will also archive secondary leaderboard."
    );
    if (!confirmed) return;
    if (group?.id) {
      dispatch(startNewContestRequest({ group_id: group.id }));
    }
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
    if (!group) return;
    const target = slips.find((slip) => slip.id === slipId);
    if (!target) return;
    const basePath = `/group/${group.id}/slips/${target.id}`;
    if (target.status === "final") {
      router.push(`${basePath}/results`);
      return;
    }
    router.push(basePath);
  };

  const showOverlayBriefly = () => {
    setShowFootballOverlay(true);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = setTimeout(() => setShowFootballOverlay(false), 800);
  };

  const handleCreateSlipNavigation = () => {
    if (!group) return;
    showOverlayBriefly();
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

  useEffect(() => {
    if (activeTab === "leaderboard") {
      const defaultLeaderboard = groupLeaderboards.find((l) => l.isDefault && l.status === "ACTIVE")
      if (defaultLeaderboard?.id) {
        setActiveLeaderboardId(defaultLeaderboard?.id)
      }
    }
  }, [groupLeaderboards, activeTab]);

  useEffect(() => {
    if (activeTab !== "settings") {
      setEditingLeaderboardId(null);
      setLeaderboardNameDraft("");
    }
    if (activeSlip?.id && (activeTab === "slips" || activeTab === "settings")) {
      dispatch(fetchAllPicksRequest({ slip_id: activeSlip?.id }))
    }
  }, [dispatch, activeSlip, activeTab]);

  useEffect(() => {
    if (secondaryLeaderboardsEnabled) {
      setSecondaryLeaderboardsDetailsOpen(true);
      return;
    }
    setShowCreateSideModal(false);
    setArchivedLeaderboardId(null);
    setEditingLeaderboardId(null);
    setLeaderboardNameDraft("");
    setSecondaryLeaderboardsDetailsOpen(false);
    setShowArchivedLeaderboards(false);
  }, [secondaryLeaderboardsEnabled]);

  useEffect(() => {
    if (!visibleLeaderboards.length) return;
    if (
      activeLeaderboardId &&
      visibleLeaderboards.some((board) => board.id === activeLeaderboardId)
    ) {
      return;
    }
    const fallback =
      visibleLeaderboards.find((board) => board.isDefault)?.id ??
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
    if (!pickLoader && pickMessage) {
      setToast({
        id: Date.now(),
        type: "success",
        message: pickMessage,
        duration: 3000,
      });
      dispatch(fetchAllPicksRequest({ slip_id: activeSlip?.id }));
      dispatch(clearCreatePickMessage());
    }
  }, [pickLoader, pickMessage, setToast, dispatch, activeSlip?.id]);
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
    if (!leaveLoading && leaveMessage) {
      setToast({
        id: Date.now(),
        type: "success",
        message: leaveMessage,
        duration: 3000,
      });
      dispatch(clearLeaveGroupMessage());
      router.replace("/fantasy");
    }
  }, [loading, groupMessage, setToast, dispatch, deleteLoading, deleteMessage, leaveLoading, leaveMessage, router]);

  useEffect(() => {
    if (!loading && !groupData && currentUser) {
      const timer = setTimeout(() => {
        router.replace("/home");
      }, 1000);
      return () => clearTimeout(timer)
    }
  }, [loading, groupData, router, currentUser]);

  useEffect(() => {
    if (group?.id && selectedLeaderboard?.id && (activeTab === "leaderboard" || activeTab === "settings")) {
      dispatch(fetchLeaderboardRequest({ groupId: group?.id, leaderboard_id: selectedLeaderboard?.id }));
    }
  }, [selectedLeaderboard?.id, dispatch, group?.id, activeTab]);

  useEffect(() => {
    if (activeTab === "leaderboard" && group?.id) {
      dispatch(fetchAllSlipsRequest({ group_id: group?.id }));
      // dispatch(fetchLeaderboardRequest({ groupId: group?.id, leaderboard_id: selectedLeaderboard?.id ? selectedLeaderboard?.id : undefined }));
    }
    if (activeTab === "settings" && group?.id) {
      dispatch(fetchGroupByIdRequest({ groupId: group?.id }));
    }
    if (activeTab === "slips" && group?.id) {
      dispatch(fetchAllSlipsRequest({ group_id: group?.id }));
    }
  }, [dispatch, activeTab, group?.id, selectedLeaderboard?.id]);

  useEffect(() => {
    if (Array.isArray(leaderboardData?.leaderboard)) {
      setLeaderboardList(leaderboardData?.leaderboard)
    }
    if (Array.isArray(leaderboardListData)) {
      setLeaderboardDataList(leaderboardListData)
    }
  }, [leaderboardData?.leaderboard, leaderboardListData]);

  if (!rawGroup && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
        Group not found. Head back to Home and pick a different crew.
      </div>
    );
  }

  // const handleSubmitPick = (payload: CreatePickPayload) => {
  //   if (!currentUser || !activeSlip) return;
  //   dispatch(createPickRequest({
  //     slip_id: activeSlip.id,
  //     description: payload.description,
  //     odds_bracket: payload.odds_bracket,
  //     scope: payload.scope,
  //     side: payload.side,
  //     points: payload.points,
  //     difficultyTier: payload.difficultyTier,
  //     market: payload.market,
  //     playerId: payload.playerId,
  //     gameId: payload.gameId,
  //     week: payload.week,
  //     teamId: payload.teamId,
  //     threshold: payload.threshold,
  //   }))
  // };

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
    if (group?.id) {
      dispatch(updateGroupRequest({
        group_id: group?.id,
        name: editGroupName,
        description: editGroupDescription,
      }));
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

  if (loading || loadingLeaderboard || !currentUser) {
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
        <BackButton
          label="back to all groups"
          fallback="/fantasy"
          preferFallback
          className="inline-flex items-center gap-2 text-[11px] font-semibold normal-case tracking-[0.12em] text-gray-300 transition hover:text-white"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-10 sm:flex-nowrap">
            <h1
              className="allow-caps text-3xl font-extrabold text-transparent bg-clip-text"
              style={displayNameGradientStyle}
            >
              {group?.name}
            </h1>
            <button
              type="button"
              onClick={handleOpenEditGroup}
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/60 hover:text-emerald-50 sm:ml-auto"
              aria-label="Edit group"
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
          </div>
          {group?.description && <p className="text-sm text-gray-400">{group.description}</p>}
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex w-full flex-wrap gap-1 overflow-y-hidden border-b border-white/10 sm:flex-nowrap sm:gap-2 sm:overflow-x-auto lg:gap-3">
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
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3 w-3 transition ${showLeaderboardMenu
                        ? "rotate-180 text-emerald-300"
                        : "text-gray-500"
                        }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
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
                  {selectedLeaderboardSlips.length
                    ? `${selectedLeaderboardSlips.length} leaderboard slips`
                    : "No leaderboard slips yet"}
                </span>
              </div>
            </div>

            {selectedLeaderboard ? (
              <LeaderboardGrid
                group={group}
                slips={selectedLeaderboardSlips}
                users={members}
                picks={gradedPicks}
                leaderboard={leaderboardList}
                leaderboardId={selectedLeaderboard.id}
                leaderboardName={selectedLeaderboard.name}
                currentUserId={currentUser?.userId}
              />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                No leaderboard found yet.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowScoringModal(true)}
              className={primaryActionButtonClass}
            >
              <span className="text-sm font-semibold text-white">How scoring works</span>
              <span
                className={primaryActionIconClass}
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <path d="M12 7h.01" />
                </svg>
              </span>
            </button>
          </div>
        )}

        {activeTab === "slips" && (
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
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
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
                    slips={leaderboardActiveSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No leaderboard slips open yet — create one to kick things off."
                  />
                  <SlipCategorySection
                    title="slips in review"
                    slips={leaderboardLockedSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No locked leaderboard slips right now."
                  />
                  <SlipCategorySection
                    title="finalized slips"
                    slips={leaderboardCompletedSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No finalized leaderboard slips yet."
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
                    slips={vibeActiveSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No vibe slips open yet — drop one to set the tone."
                  />
                  <SlipCategorySection
                    title="slips in review"
                    slips={vibeLockedSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No locked vibe slips right now."
                  />
                  <SlipCategorySection
                    title="finalized slips"
                    slips={vibeCompletedSlips}
                    onSelect={handleSlipSelect}
                    layout="grid"
                    emptyCopy="No finalized vibe slips yet."
                  />
                </section>
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4 pt-2">
            <ModifyMembers
              currentUser={currentUser}
              members={membersWithRoles}
              onRemoveMember={handleRemoveMember}
              onMakeCommissioner={handleTransferCommissioner}
              onLeaveGroup={handleLeaveGroup}
              leavingGroup={leavingGroup}
            />
          </div>
        )}

        {activeTab === "feed" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-sm text-gray-300 shadow-lg">
              <FeedTab users={members} groupId={group?.id} />
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
              id="leaderboards-panel"
              className={secondaryLeaderboardsEnabled ? "pb-6" : "pb-3"}
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

              {secondaryLeaderboardsEnabled && secondaryLeaderboardsDetailsOpen && (
                <>
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
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </span>
                      </button>
                    </div>

                    {sideLimitReached && (
                      <p className="text-xs text-amber-200">
                        You already have two active secondary leaderboards. Archive one to start
                        another.
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      {sortedActiveLeaderboards.map((board) => {
                        // const isSelected = selectedLeaderboard?.id === board.id;
                        const blockedReason = board.isDefault
                          ? hasOpenSlipOnActiveBoards
                            ? "You have open slips still running in this leaderboard."
                            : null
                          : hasOpenSlipForLeaderboard(board.id)
                            ? "You have open slips still running in this leaderboard."
                            : null;
                        return (
                          <div
                            key={board.id}
                            className={secondaryLeaderboardCardClass}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                  {board.isDefault
                                    ? "Main leaderboard"
                                    : "Secondary leaderboard"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-lg font-semibold text-white">{board.name}</p>
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
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                                    </svg>
                                  </button>
                                </div>
                                {board?.sport_scope && (
                                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                    {board?.sport_scope}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    board.isDefault
                                      ? handleRestartDefault()
                                      : handleArchiveSide(board.id)
                                  }
                                  disabled={Boolean(blockedReason)}
                                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-rose-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {board.isDefault ? "Archive & restart" : "Archive"}
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
                                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                                    />
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveLeaderboardName(board.id)}
                                      disabled={!leaderboardNameDraft.trim()}
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

                    {sortedArchivedLeaderboards.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowArchivedLeaderboards((prev) => !prev)}
                          aria-expanded={showArchivedLeaderboards}
                          className="flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 transition hover:text-gray-200"
                        >
                          <span>Archived leaderboards</span>
                          <span className="text-gray-500">
                            {showArchivedLeaderboards ? "▴" : "▾"}
                          </span>
                        </button>
                        {showArchivedLeaderboards && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {sortedArchivedLeaderboards.map((board) => {
                              return (
                                <button
                                  key={board.id}
                                  type="button"
                                  onClick={() => handleSelectArchivedLeaderboard(board.id)}
                                  className={`${secondaryLeaderboardCardClass} w-full text-left`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                        {board.isDefault
                                          ? "Main season"
                                          : "Secondary leaderboard"}
                                      </p>
                                      <p className="text-sm font-semibold text-white">
                                        {board.name}
                                      </p>
                                      {board?.sport_scope && (
                                        <p className="text-[11px] text-gray-400">
                                          Scope: {board?.sport_scope}
                                        </p>
                                      )}
                                    </div>
                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                      View archived
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            <div
              className={`h-px w-full bg-white/10 ${secondaryLeaderboardsEnabled ? "my-6" : "my-3"
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
                      className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/70"
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

      {activeTab === "leaderboard" && (
        <ScoringModal
          open={showScoringModal}
          onClose={() => setShowScoringModal(false)}
          variant="group"
        />
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
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="Group name"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  description (optional)
                </span>
                <textarea
                  value={editGroupDescription}
                  onChange={(event) => setEditGroupDescription(event.target.value)}
                  className="min-h-[96px] rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="What's this group about?"
                />
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
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
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
                  disabled={!sideContestName.trim() || sideLimitReached}
                  className="rounded-lg bg-sky-500/25 px-5 py-2 text-xs font-semibold tracking-wide text-sky-100 transition hover:bg-sky-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {secondaryLeaderboardsEnabled && archivedLeaderboardId && archivedLeaderboard && (
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
                  {archivedLeaderboard.name}
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
                slips={selectedLeaderboardSlips}
                users={members}
                picks={gradedPicks}
                leaderboardId={archivedLeaderboard.id}
                leaderboardName={archivedLeaderboard.name}
                currentUserId={currentUser?.userId}
                leaderboard={leaderboardList}
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
