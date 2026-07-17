"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { formatDateTime } from "@/lib/utils/date";
import { Contest, Group, GroupSelector, RootState } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { clearConfirmDeleteGroupMessage, clearCreateNewLeaderboardMessage, clearUpdateGroupMessage, confirmDeleteGroupRequest, fetchGroupByIdRequest, fetchGroupOwnerPlanDetailsRequest, fetchUnreadCountsByLeagueIdRequest, initialGroupDeleteRequest, leaveGroupRequest, removeGroupMemberRequest, updateGroupMemberRoleRequest, updateGroupRequest } from "@/lib/redux/slices/groupsSlice";
import ModifyMembers from "@/components/group/ModifyMembers";
import { fetchActiveContestsRequest, fetchArchivedContestsRequest } from "@/lib/redux/slices/contestSlice";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import ScoringModal from "@/components/modals/ScoringModal";
import FeedTab from "@/components/group/FeedTab";
import { DeleteGroupConfirmationModal } from "@/components/group/ConfirmDeleteGroupModal";
import LeaguePageSkeleton, { ContestCardSkeleton } from "@/components/skeletons/leagues/LeaguePageSkeleton";
import GroupChatTab from "@/components/group/GroupChatTab";
import InviteCodeCopy from "@/components/group/InviteCodeCopy";
import { SettingIcon } from "@/components/ui/SvgIcons";
import { canCreateContestInGroup, getActiveContestCapacityLabel, getActiveContestCountsLabel, getActiveLeagueFeedContestCapacityLabel, getCombinedContestCapacityLabel, getGroupCapacityLabel, getGroupTypeLabel, getHostingTierLabel, getRegularMemberCapacityLabel, normalizeHostingTier } from "@/lib/groups/limits";
import { groupPreviewMetaTextClassName, GroupTypeMetaLabel } from "@/components/group/GroupPreviewChip";
import { isLeagueMember } from "@/lib/permissions/leaguePermissions";

interface FormErrors {
  name?: string;
  description?: string;
}

const TABS = [
  { id: "contests", label: "Contests" },
  { id: "members", label: "Members" },
  { id: "chat", label: "Chat" },
  { id: "feed", label: "Feed" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type LeagueTab = (typeof TABS)[number];

const normalizeTab = (value: string | null, isCommissioner: boolean): TabId => {
  if (value === "settings") return isCommissioner ? "settings" : "contests";
  if (value === "members" || value === "chat" || value === "feed") return value;
  return "contests";
};

const tabIcon = (tabId: TabId) => {
  const common = {
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (tabId === "contests") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
        <path d="M17 6h3v2a3 3 0 0 1-3 3" />
        <path d="M7 6H4v2a3 3 0 0 0 3 3" />
      </svg>
    );
  }
  if (tabId === "members") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (tabId === "chat") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A4 4 0 0 1 3 14V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }
  if (tabId === "feed") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 6h16M4 12h12M4 18h9" />
      </svg>
    );
  }
  return (
    <SettingIcon {...common} />
  );
};

const LeagueTabStrip = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}: {
  tabs: readonly LeagueTab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  className: string;
}) => {
  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  );

  return (
    <div
      className={`relative w-full gap-1 py-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-0 rounded-lg border border-white/10 bg-white/[0.08] transition-transform duration-300 ease-out"
        style={{
          width: `calc(100% / ${tabs.length})`,
          transform: `translateX(${activeTabIndex * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className={`relative z-10 flex h-11 min-w-0 items-center justify-center px-1 text-center text-[10px] font-semibold uppercase tracking-wide transition sm:h-10 sm:px-3 sm:text-sm ${isActive ? "text-white" : "text-gray-400 hover:text-white"
              }`}
          >
            <span className="flex min-w-0 items-center justify-center gap-1.5">
              <span className="shrink-0 sm:hidden">{tabIcon(tab.id)}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

const LeagueTierDetailsLabel = ({
  league,
  memberCapacityLabel,
  standardContestCapacityLabel,
  feedContestCapacityLabel,
}: {
  league: Group;
  memberCapacityLabel: string;
  standardContestCapacityLabel: string;
  feedContestCapacityLabel: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const open = hovered || focused || pinned;
  const isPro = normalizeHostingTier(league.hosting_tier) === "pro";
  const tierLabel = isPro ? "Pro League" : "Free League";

  const closeDetails = useCallback(() => {
    setHovered(false);
    setFocused(false);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeDetails();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDetails, open]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0 text-right"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={league.id}
        aria-label={`Show ${tierLabel} details`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (pinned) closeDetails();
          else setPinned(true);
        }}
        className="cursor-help rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
      >
        <GroupTypeMetaLabel group={league} showTitle={false} />
      </button>

      {open && (
        <span
          id={league.id}
          role="tooltip"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-white/15 bg-[#090d16] p-3 text-left font-sans text-xs font-normal normal-case tracking-normal text-gray-300 shadow-2xl shadow-black/50"
        >
          <span className={`block font-semibold ${isPro ? "text-amber-100" : "text-sky-100"}`}>
            {tierLabel}
          </span>
          <span className="mt-1 block leading-5 text-gray-400">
            {isPro
              ? "Pro League limits and manual scoring controls apply."
              : "Free League limits and standard scoring controls apply."}
          </span>
          <span className="mt-2 block border-t border-white/10 pt-2 leading-5">
            {memberCapacityLabel}
            <br />
            {standardContestCapacityLabel}
            <br />
            {feedContestCapacityLabel}
          </span>
          <span className="mt-2 block text-[10px] uppercase tracking-[0.1em] text-gray-500">
            Hover or tap the League label for details
          </span>
        </span>
      )}
    </span>
  );
};

const contestSportLabels = (contest: Contest) =>
  contest.sports.length > 1 ? ["Multi"] : contest.sports;

const generateDeleteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const LeagueDashboardPage = () => {
  const dispatch = useDispatch();
  const params = useParams<{ leagueId: string }>();
  const router = useRouter();
  const { setToast } = useToast();
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const leagueId = params.leagueId as string;
  const fetchedGroupId = useRef<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);

  const {
    group,
    loading,
    message: groupMessage,
    error: errorMessage,
    deleteLoading,
    deleteMessage,
    unreadCounts,
    ownerPlan,
  } = useSelector((state: GroupSelector) => state.group);
  const { activeContests, archivedContests, hasMoreActive, hasMoreArchived, loading: contestLoader } = useSelector((state: RootState) => state.contest);

  useEffect(() => {
    setActivePage(1);
    setArchivedPage(1);
  }, [leagueId]);

  const handleLoadMoreActive = () => {
    const nextPage = activePage + 1;
    setActivePage(nextPage);
    dispatch(fetchActiveContestsRequest({ group_id: leagueId, page: nextPage, limit: 10 }));
  };

  const handleLoadMoreArchived = () => {
    const nextPage = archivedPage + 1;
    setArchivedPage(nextPage);
    dispatch(fetchArchivedContestsRequest({ group_id: leagueId, page: nextPage, limit: 10 }));
  };

  useEffect(() => {
    if (!leagueId || !currentUser) return;
    // if (fetchedGroupId.current === leagueId) return;

    dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
    dispatch(fetchGroupOwnerPlanDetailsRequest({ group_id: leagueId }));
    dispatch(fetchActiveContestsRequest({ group_id: leagueId, page: 1, limit: 10 }));
    dispatch(fetchArchivedContestsRequest({ group_id: leagueId, page: 1, limit: 10 }));
    dispatch(fetchUnreadCountsByLeagueIdRequest({ group_id: leagueId }));
    fetchedGroupId.current = leagueId;
  }, [leagueId, currentUser, dispatch]);

  const isMember = isLeagueMember(group, currentUser?.userId);
  const isCommissioner = !!group && !!currentUser && group.created_by === currentUser.userId;
  const activeTab = normalizeTab(searchParams.get("tab"), isCommissioner);
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => isCommissioner || tab.id !== "settings"),
    [isCommissioner]
  );
  const mobileVisibleTabs = useMemo(
    () => visibleTabs.filter((tab) => tab.id !== "chat"),
    [visibleTabs]
  );
  const groupOwnerPlan = useMemo(
    () => ownerPlan ? ownerPlan.plan : "free",
    [ownerPlan]
  );

  useEffect(() => {
    const rawTab = searchParams.get("tab");
    if (rawTab === "leaderboard" || rawTab === "slips") {
      router.replace(`/league/${params.leagueId}`);
    }
  }, [params.leagueId, router, searchParams]);

  useEffect(() => {
    if (group && currentUser && !isMember) router.replace("/home");
  }, [currentUser, isMember, group, router]);

  const [showArchived, setShowArchived] = useState(false);
  const [editLeagueName, setEditLeagueName] = useState("");
  const [editLeagueDescription, setEditLeagueDescription] = useState("");
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [leavingLeague, setLeavingLeague] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Tracks the desktop breakpoint so the desktop chat pane is truly not mounted on
  // mobile (CSS `hidden` is display:none but still mounts + runs global effects).
  const [isDesktop, setIsDesktop] = useState(false);
  // Gate for the portaled mobile chat drawer (createPortal needs document.body,
  // which does not exist during SSR / the first render).
  const [mounted, setMounted] = useState(false);
  const chatTriggerRef = useRef<HTMLButtonElement>(null);
  const chatCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(desktopMedia.matches);
    update();
    desktopMedia.addEventListener("change", update);
    return () => desktopMedia.removeEventListener("change", update);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (activeTab !== "chat" || !group) return;

    const mobileMedia = window.matchMedia("(max-width: 639px)");
    const moveChatToDrawer = () => {
      if (!mobileMedia.matches) return;
      setChatOpen(true);
      router.replace(`/league/${group.id}`);
    };

    moveChatToDrawer();
    mobileMedia.addEventListener("change", moveChatToDrawer);
    return () => mobileMedia.removeEventListener("change", moveChatToDrawer);
  }, [activeTab, group, router]);

  useEffect(() => {
    if (!chatOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const desktopMedia = window.matchMedia("(min-width: 640px)");
    const focusFrame = window.requestAnimationFrame(() => {
      chatCloseButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        chatCloseButtonRef.current?.focus();
      }
    };
    const handleDesktopChange = () => {
      if (desktopMedia.matches) setChatOpen(false);
    };

    // NOTE: do not lock document.body scroll here. The mounted GroupChatTab owns
    // the body scroll lock for the whole time the drawer is open (and releases it
    // on unmount). Locking it here too races that lock — React runs GroupChatTab's
    // effect first, so this effect would capture the already-locked value as its
    // "previous" and re-apply it on cleanup, leaving the page unscrollable.
    document.addEventListener("keydown", handleKeyDown);
    desktopMedia.addEventListener("change", handleDesktopChange);
    handleDesktopChange();

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      desktopMedia.removeEventListener("change", handleDesktopChange);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [chatOpen]);

  useEffect(() => {
    if (!group) return;
    setEditLeagueName(group.name ?? "");
    setEditLeagueDescription(group.description ?? "");
  }, [group]);

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
    if (activeTab === "settings" && isCommissioner && !deleteConfirmCode) {
      setDeleteConfirmCode(generateDeleteCode());
    }
  }, [activeTab, isCommissioner, deleteConfirmCode]);

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!editLeagueName?.trim()) {
      nextErrors.name = "League name is required.";
    }

    if (editLeagueName.length > 25) {
      nextErrors.name = "League name must be 25 characters or less.";
    }

    if (editLeagueDescription.length > 50) {
      nextErrors.description = "League description must be 50 characters or less.";
    }

    const containsNameRestricted = checkAnyRestrictedWords(editLeagueName);
    if (containsNameRestricted) {
      nextErrors.name = "League name contains inappropriate language.";
    }

    const containsDescriptionRestricted = checkAnyRestrictedWords(editLeagueDescription || "");
    if (containsDescriptionRestricted) {
      nextErrors.description = "League description contains inappropriate language.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [editLeagueName, editLeagueDescription]);

  const handleTabChange = (tabId: TabId) => {
    if (!group) return;
    const query = tabId === "contests" ? "" : `?tab=${tabId}`;
    if (group?.id) {
      router.replace(`/league/${group.id}${query}`);
    }
  };

  const handleRemoveMember = async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Not authenticated." };
    }

    if (!leagueId) {
      return { success: false, error: "Missing league context." };
    }

    try {
      dispatch(
        removeGroupMemberRequest({
          user_id: userId,
          group_id: leagueId,
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

    if (!leagueId) {
      return { success: false, error: "Missing league context." };
    }

    try {
      dispatch(
        updateGroupMemberRoleRequest({
          member_id: newCommissionerId,
          role: "commissioner",
          group_id: leagueId,
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

  const handleLeaveLeague = () => {
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
      setLeavingLeague(true);
      dispatch(leaveGroupRequest({ group_id: group.id }));
    }
    setLeavingLeague(false);
  };

  const handleSaveLeague = () => {
    if (!group || !currentUser) return;

    if (!validate()) return;

    const name = editLeagueName.trim();
    const description = editLeagueDescription.trim();

    if (group.name === name && (group.description || "") === description) {
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
  };

  const handleDeleteLeague = () => {
    if (!isCommissioner) {
      setDeleteError("Only the commissioner can delete this league.");
      return;
    }

    if (deleteCodeInput !== deleteConfirmCode) {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Please type exact same code as shown for confirmation code delete.",
        duration: 3000
      })
      return;
    }

    try {
      if (!deleteConfirmCode) return;

      setIsDeletingGroup(true);
      setIsConfirmDeleteModalOpen(true);
      setDeleteError(null);
      if (group.id) {
        dispatch(initialGroupDeleteRequest({ group_id: group?.id }));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete league.";
      setDeleteError(message);
    }
  };

  const handleCloseConfirmDeleteModal = () => {
    setIsConfirmDeleteModalOpen(false);
    setIsDeletingGroup(false);
    setDeleteError(null);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!isCommissioner) {
      setDeleteError("Only the commissioner can delete this league.");
      return;
    }
    try {
      if (group?.id) dispatch(confirmDeleteGroupRequest({ group_id: group?.id, otp: deleteConfirmationCode }));
      setDeleteError(null);
      setIsDeletingGroup(false);
      setIsConfirmDeleteModalOpen(false);
      setDeleteConfirmationCode("");
      setDeleteCodeInput("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete league.";
      setDeleteError(message);
    }
  };

  const renderContestCard = (contest: Contest) => {
    return (
      <Link
        key={contest.id}
        href={`/league/${group?.id}/contests/${contest.id}`}
        className="block rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-300/60 hover:bg-white/[0.07]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">{contest.name}</h3>
            </div>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-sky-200">
            {contest.included_members_count ?? 0} players
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-white/10 bg-black/30 px-2 py-2">
            <p className="font-semibold text-white">{contest.slips_count?.open_count}</p>
            <p className="uppercase tracking-wide text-gray-500">open</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 px-2 py-2">
            <p className="font-semibold text-white">{contest.slips_count?.review_count}</p>
            <p className="uppercase tracking-wide text-gray-500">review</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 px-2 py-2">
            <p className="font-semibold text-white">{contest.slips_count?.finalized_count}</p>
            <p className="uppercase tracking-wide text-gray-500">final</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {contestSportLabels(contest).map((sport) => (
            <span
              key={sport}
              className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-300"
            >
              {sport}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-500">
          {formatDateTime(contest.starts_at)} to {formatDateTime(contest.ends_at)}
        </p>
      </Link>
    );
  };

  if (!group && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
        Group not found. Head back to Home and pick a different crew.
      </div>
    );
  }

  const isInitialLoading = loading || (contestLoader && activeContests === null && archivedContests === null);

  if (isInitialLoading) {
    return <LeaguePageSkeleton />;
  }

  const memberCount = group?.member_count ?? group?.members?.length ?? 0;
  const activeContestCount = group?.active_contest ?? activeContests?.length ?? 0;
  const createContestCheck = canCreateContestInGroup(group, activeContestCount);

  return (
    <div
      className={
        activeTab === "chat"
          ? "flex flex-col gap-3 -mb-36 h-[calc(var(--app-vvh,100dvh)-var(--topnav-height))] min-h-0 overflow-hidden"
          : "flex flex-col gap-3 pb-10"
      }
    >
      {activeTab !== "chat" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <BackButton label="back to all groups" fallback="/fantasy" preferFallback />
            <InviteCodeCopy code={group?.invite_code} className="-mr-[5px]" />
          </div>
          <header className="-mx-5 px-5 pb-3 sm:mx-0 sm:px-0">
            <div className="relative min-w-0">
              <div
                className={`flex items-start justify-between gap-3 text-gray-400 ${groupPreviewMetaTextClassName}`}
              >
                <div className="flex min-w-0 flex-wrap gap-2">
                  {group && (
                    <>
                      <span>{getGroupCapacityLabel(group, memberCount)}</span>
                      {/* <span>{getActiveContestCountsLabel(group, activeContestCount)}</span> */}
                      <span>
                        {getCombinedContestCapacityLabel(
                          group,
                          [],
                          []
                        )}
                      </span>
                    </>
                  )}
                </div>
                {group?.group_type === "league" ? (
                  <LeagueTierDetailsLabel
                    league={group}
                    memberCapacityLabel={getRegularMemberCapacityLabel(group)}
                    standardContestCapacityLabel={getActiveContestCapacityLabel(
                      group,
                      []
                    )}
                    feedContestCapacityLabel={getActiveLeagueFeedContestCapacityLabel(
                      group,
                      []
                    )}
                  />
                ) : (
                  <GroupTypeMetaLabel
                    group={group}
                    ownerPlan={groupOwnerPlan}
                    className="shrink-0 text-right"
                  />
                )}
              </div>
              <h1
                className="allow-caps pr-24 mt-1.5 text-2xl font-extrabold text-transparent bg-clip-text sm:text-3xl"
                style={displayNameGradientStyle}
              >
                {group?.name}
              </h1>
              {group?.description && (
                <p className="mt-1.5 max-w-2xl truncate text-xs text-gray-500">
                  {group.description}
                </p>
              )}
              <button
                ref={chatTriggerRef}
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label="Open group chat"
                aria-controls="mobile-league-chat"
                aria-expanded={chatOpen}
                title="Open group chat"
                className="absolute right-0 top-7 inline-flex h-7 items-center justify-end text-[10px] font-semibold tracking-[0.12em] text-gray-500 transition hover:text-gray-300 sm:hidden"
              >
                {"<- open chat"}
              </button>
            </div>
          </header>
        </>
      )}

      <section
        className={`-mx-5 border-y border-white/10 px-5 sm:mx-0 sm:px-0 ${activeTab === "chat"
          ? "sticky top-0 z-20 bg-[var(--app-bg)]"
          : "-mt-3"
          }`}
      >
        <LeagueTabStrip
          tabs={mobileVisibleTabs}
          activeTab={activeTab === "chat" ? "contests" : activeTab}
          onTabChange={handleTabChange}
          className="grid sm:hidden"
        />
        <LeagueTabStrip
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          className="hidden sm:grid"
        />
      </section>

      {activeTab === "contests" && (
        <div className="space-y-6">
          {isCommissioner &&
            (createContestCheck.allowed ? (
              <Link
                href={`/league/${group?.id}/contests/create`}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-sky-300/30 bg-sky-500/10 px-5 py-4 text-left transition hover:border-sky-200/70 hover:bg-sky-500/15"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">Start a contest</span>
                  <span className="mt-1 block text-xs text-gray-400">
                    Set sports, dates, and a standings container for this group.
                  </span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/40 text-xl text-sky-100">
                  +
                </span>
              </Link>
            ) : (
              <section className="rounded-lg border border-amber-300/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-50">
                <p className="font-semibold">{createContestCheck.error}</p>
                <p className="mt-1 text-xs text-amber-100/80">
                  Archive an active contest to open another one. Historical contests are unlimited.
                </p>
              </section>
            ))
          }

          {activeContests?.length ? (
            <div className="space-y-4">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeContests.map(renderContestCard)}
                {contestLoader && activePage > 1 && (
                  <>
                    <ContestCardSkeleton />
                    <ContestCardSkeleton />
                  </>
                )}
              </section>
              {hasMoreActive && !contestLoader && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleLoadMoreActive}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/[0.08] active:bg-white/[0.12]"
                  >
                    Show More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <section className="rounded-lg border border-dashed border-white/15 bg-black/30 p-6 text-sm text-gray-400">
              <p className="font-semibold text-white">No contests yet.</p>
              <p className="mt-2">
                {isCommissioner
                  ? "Start the first contest when your League is ready."
                  : "The commissioner has not started a contest yet."
                }
              </p>
            </section>
          )}

          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold uppercase tracking-wide text-gray-300"
              aria-expanded={showArchived}
            >
              <span>Archived contests</span>
              <span>{showArchived ? "▴" : "▾"}</span>
            </button>
            {showArchived && (
              archivedContests?.length ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {archivedContests.map(renderContestCard)}
                    {contestLoader && archivedPage > 1 && (
                      <>
                        <ContestCardSkeleton />
                        <ContestCardSkeleton />
                      </>
                    )}
                  </div>
                  {hasMoreArchived && !contestLoader && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleLoadMoreArchived}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/[0.08] active:bg-white/[0.12]"
                      >
                        Show More
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-500">
                  No archived contests.
                </div>
              )
            )}
          </section>
        </div>
      )}

      {activeTab === "members" && (
        <ModifyMembers
          currentUser={currentUser}
          onRemoveMember={handleRemoveMember}
          onMakeCommissioner={handleTransferCommissioner}
          onLeaveGroup={handleLeaveLeague}
          leavingGroup={leavingLeague}
          groupId={leagueId}
        />
      )}

      {activeTab === "feed" && (
        <div className="pt-1">
          <FeedTab groupId={group?.id} />
        </div>
      )}

      {activeTab === "chat" && isDesktop && (
        <div className="hidden min-h-0 flex-1 flex-col sm:flex">
          <GroupChatTab groupId={group?.id} />
        </div>
      )}

      {activeTab === "settings" && isCommissioner && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                Group details
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Contest settings live inside each contest.
              </p>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Group name
              <input
                value={editLeagueName}
                onChange={(event) => setEditLeagueName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-400/70"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.name}
                </p>
              )}
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Description
              <textarea
                value={editLeagueDescription}
                onChange={(event) => setEditLeagueDescription(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-400/70"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.description}
                </p>
              )}
            </label>
            <button
              type="button"
              onClick={handleSaveLeague}
              disabled={loading}
              className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save details
            </button>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                Delete League
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Type the delete phrase to permanently delete the league, contests, slips, and picks.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Delete phrase
                </span>
                <div className="ml-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-base font-semibold tracking-[0.3em] text-red-200 select-none">
                  {deleteConfirmCode}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={deleteCodeInput}
              onChange={(event) => setDeleteCodeInput(event.target.value.toUpperCase())}
              placeholder={deleteConfirmCode}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 block w-full rounded-lg border border-white/10 bg-black px-4 py-2.5 font-mono text-sm tracking-[0.2em] normal-case text-white outline-none transition placeholder:tracking-normal placeholder:text-gray-600 focus:border-red-400/70"
            />
            <button
              type="button"
              onClick={handleDeleteLeague}
              disabled={deleteLoading || !deleteConfirmCode || deleteCodeInput !== deleteConfirmCode}
              className="rounded-lg border border-red-300/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete league
            </button>
          </section>
        </div>
      )}

      {/* Mobile chat drawer. Portaled to <body> and sized to the VISUAL viewport
          (height:--app-vvh + translateY(--kb-offset), both published by GroupChatTab)
          so it stays OUT of the app-shell's iOS keyboard counter-transform. A transform
          on an ancestor makes position:fixed resolve against that ancestor's (tall) box
          instead of the viewport, which was stretching the panel and pushing the
          composer below the keyboard. Portaling also escapes the body-lock's -scrollY
          offset, so the drawer tracks the visible viewport on iOS. */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-x-0 top-0 z-50 sm:hidden ${chatOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
            style={{
              height: "var(--app-vvh, 100dvh)",
              transform: "translateY(var(--kb-offset, 0px))",
            }}
            aria-hidden={!chatOpen}
          >
            <aside
              id="mobile-league-chat"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-league-chat-title"
              className={`absolute inset-0 flex w-full flex-col bg-neutral-950 shadow-2xl transition-transform duration-300 ease-out ${chatOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
                    {group?.name}
                  </p>
                  <h2 id="mobile-league-chat-title" className="mt-1 text-lg font-semibold text-white">
                    Group chat
                  </h2>
                </div>
                <button
                  ref={chatCloseButtonRef}
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="Close group chat"
                  tabIndex={chatOpen ? 0 : -1}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                {chatOpen && !isDesktop && <GroupChatTab groupId={group?.id} />}
              </div>
            </aside>
          </div>,
          document.body
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
    </div>
  );
};

export default LeagueDashboardPage;
