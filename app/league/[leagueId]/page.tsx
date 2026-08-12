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
import ConnectedStructuredFeed from "@/components/feed/ConnectedStructuredFeed";
import type { StructuredFeedFilter } from "@/components/feed/types";
import { DeleteGroupConfirmationModal } from "@/components/group/ConfirmDeleteGroupModal";
import LeaguePageSkeleton, { ContestCardSkeleton } from "@/components/skeletons/leagues/LeaguePageSkeleton";
import GroupChatTab from "@/components/group/GroupChatTab";
import InviteCodeCopy from "@/components/group/InviteCodeCopy";
import LeagueFeedStandingsPanel from "@/components/group/LeagueFeedStandingsPanel";
import ContestHubCreateAction from "@/components/contests/ContestHubCreateAction";
import { contestPreviewCardSizeClassName } from "@/components/contests/FeedContestCard";
import FeedContestSections from "@/components/contests/FeedContestSections";
import { fetchFeedContestsRequest, resetFeedContests } from "@/lib/redux/slices/feedContestSlice";
import type { FeedContestSection } from "@/lib/interfaces/interfaces";
import { canCreateContestInGroup, getActiveContestCapacityLabel, getActiveLeagueFeedContestCapacityLabel, getCombinedContestCapacityLabel, getGroupCapacityLabel, getRegularMemberCapacityLabel, normalizeHostingTier } from "@/lib/groups/limits";
import { groupPreviewMetaTextClassName, GroupTypeMetaLabel } from "@/components/group/GroupPreviewChip";
import { isLeagueMember } from "@/lib/permissions/leaguePermissions";

interface FormErrors {
  name?: string;
  description?: string;
}

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "contests", label: "Contests" },
  { id: "members", label: "Members" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type LeagueTab = (typeof TABS)[number];
/** Slip contests are the existing flow; Feed contests are not wired to the API yet. */
type LeagueContestTabId = "slip" | "feed";

const LEAGUE_CONTEST_TABS: readonly {
  id: LeagueContestTabId;
  label: string;
}[] = [
    // "Fantasy Contests" is the MVP's current name for this surface. The tab id
    // stays `slip` — it keys the ?contestType deep link and every internal
    // reference; only the label was renamed.
    { id: "slip", label: "Fantasy Contests" },
    { id: "feed", label: "Feed Contests" },
  ];

// Legacy deep links keep working: ?tab=slips lands on Contests, and
// ?tab=leaderboard / ?tab=chat fall through to Feed (chat additionally opens the
// drawer — see the back-compat effect below).
const normalizeTab = (value: string | null, isCommissioner: boolean): TabId => {
  if (value === "settings") return isCommissioner ? "settings" : "feed";
  if (value === "slips") return "contests";
  if (value === "contests" || value === "members") return value;
  return "feed";
};

const normalizeContestTab = (value: string | null): LeagueContestTabId =>
  value === "feed" ? "feed" : "slip";

const LeagueTabStrip = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: readonly LeagueTab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}) => (
  <div
    role="navigation"
    aria-label="League sections"
    className="grid w-full items-end gap-1"
    style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
  >
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          aria-label={tab.label}
          aria-current={isActive ? "page" : undefined}
          className={`relative flex h-10 min-w-0 items-center justify-center rounded-t-xl border border-b-0 px-1 text-center text-[13px] font-semibold transition-colors duration-200 ease-out sm:px-3 sm:text-sm motion-reduce:transition-none ${isActive
            ? "border-white/10 bg-black text-sky-100 after:absolute after:-bottom-px after:inset-x-0 after:h-px after:bg-black after:content-['']"
            : "border-transparent bg-black text-gray-400 hover:border-white/10 hover:text-white"
            }`}
        >
          <span className="truncate">{tab.label}</span>
        </button>
      );
    })}
  </div>
);

const LeagueContestTabStrip = ({
  activeTab,
  onTabChange,
}: {
  activeTab: LeagueContestTabId;
  onTabChange: (tabId: LeagueContestTabId) => void;
}) => (
  <div
    role="tablist"
    aria-label="League contest types"
    className="grid w-full grid-cols-2 rounded-2xl border border-sky-200/10 bg-black/25 p-1"
  >
    {LEAGUE_CONTEST_TABS.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`league-${tab.id}-contests-tab`}
          aria-controls={`league-${tab.id}-contests-panel`}
          aria-selected={isActive}
          onClick={() => onTabChange(tab.id)}
          className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${isActive
            ? "bg-sky-500/20 text-sky-50 shadow-sm"
            : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
            }`}
        >
          <span className="truncate">{tab.label}</span>
        </button>
      );
    })}
  </div>
);

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
  // The League feed mutations authorize on group_members.role
  // (resolveEditableLeagueAnnouncement -> resolveLeagueScope -> membership.role ===
  // 'commissioner'), NOT on groups.created_by. handleTransferCommissioner below
  // rewrites the ROLE, so a transferred commissioner must be recognised here or the
  // UI hides Edit/Pin/Delete — and the announcement composer — on posts the backend
  // would happily let them modify. The created_by fallback stays because
  // current_user_member is optional on the group payload.
  const isCommissioner =
    !!group &&
    !!currentUser &&
    (group.current_user_member?.role === "commissioner" ||
      group.created_by === currentUser.userId);
  // Only ever trust a loaded group that is actually the one this URL asked for.
  // `state.group.group` is shared by every group screen, so without the id check a
  // leftover record from the previously viewed group decides this page's routing.
  const isLoadedGroup = !!group && group.id === leagueId;
  const isArena = isLoadedGroup && group.group_type === "arena";
  const activeTab = normalizeTab(searchParams.get("tab"), isCommissioner);
  const contestTabParam = searchParams.get("contestType");
  const [activeContestTab, setActiveContestTab] = useState<LeagueContestTabId>(
    () => normalizeContestTab(contestTabParam)
  );
  // Read once on mount so the legacy ?tab=leaderboard deep link still opens the
  // Feed on its Standings view — the back-compat effect below rewrites the URL.
  const [initialFeedFilter] = useState<StructuredFeedFilter>(() =>
    searchParams.get("tab") === "leaderboard" ? "standings" : "community"
  );
  const feedContestSections = useSelector(
    (state: RootState) => state.feedContest.sections
  );

  // The five section lists are separate server-owned queries. Drafts is fetched
  // for the commissioner only — /list/drafts answers 403 for anyone else.
  const loadFeedContestSection = useCallback(
    (section: FeedContestSection, page: number) => {
      if (!leagueId) return;
      dispatch(
        fetchFeedContestsRequest({
          section,
          group_id: leagueId,
          group_type: "league",
          page,
          limit: 10,
        })
      );
    },
    [dispatch, leagueId]
  );

  useEffect(() => {
    if (!leagueId || !currentUser || activeContestTab !== "feed") return;
    // Archived is fetched for everyone: unlike drafts it is member-visible, and
    // its section only renders once the read comes back with rows.
    (["open", "locked", "finalized", "archived"] as const).forEach((section) =>
      loadFeedContestSection(section, 1)
    );
    if (isCommissioner) loadFeedContestSection("drafts", 1);
  }, [
    leagueId,
    currentUser,
    activeContestTab,
    isCommissioner,
    loadFeedContestSection,
  ]);

  // Drop the cached rows on unmount so another group can never read them.
  useEffect(() => () => { dispatch(resetFeedContests()); }, [dispatch]);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => isCommissioner || tab.id !== "settings"),
    [isCommissioner]
  );
  const groupOwnerPlan = useMemo(
    () => ownerPlan ? ownerPlan.plan : "free",
    [ownerPlan]
  );

  // An arena reached through a /league/:id link (Home lists both kinds) is handed
  // over to the Arena screen. Redirect to the id from the URL, never to group.id —
  // if a stale record ever slips past `isArena` again, the worst case is a reload
  // of this same route rather than a jump to an unrelated group.
  useEffect(() => {
    if (isArena && currentUser) {
      router.replace(`/arena/${leagueId}`);
    }
  }, [isArena, router, currentUser, leagueId]);

  useEffect(() => {
    setActiveContestTab(normalizeContestTab(contestTabParam));
  }, [contestTabParam]);

  useEffect(() => {
    if (isArena) return;
    const rawTab = searchParams.get("tab");
    if (rawTab === "slips") {
      router.replace(`/league/${params.leagueId}?tab=contests`);
      return;
    }
    // Chat is no longer a tab — an old ?tab=chat link opens the drawer instead.
    if (rawTab === "chat") {
      setChatOpen(true);
      router.replace(`/league/${params.leagueId}`);
      return;
    }
    if (rawTab === "leaderboard") {
      router.replace(`/league/${params.leagueId}`);
    }
  }, [isArena, params.leagueId, router, searchParams]);

  useEffect(() => {
    if (group && currentUser && !isMember) router.replace("/home");
  }, [currentUser, isMember, group, router]);

  // The Slip contest hub's two accordion sections. Open starts expanded and
  // Archived collapsed, matching the MVP — and matching the Feed hub, where
  // Finalized is the collapsed one.
  const [showOpenContests, setShowOpenContests] = useState(true);
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
  // Gate for the portaled chat drawer (createPortal needs document.body, which
  // does not exist during SSR / the first render).
  const [mounted, setMounted] = useState(false);
  const chatTriggerRef = useRef<HTMLButtonElement>(null);
  const chatCloseButtonRef = useRef<HTMLButtonElement>(null);
  const chatDrawerRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!chatOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // GroupChatTab clamps html/body to the visible viewport, which drops the page's
    // scroll offset to 0. Remember it so closing the drawer puts the reader back.
    const previousScrollY = window.scrollY;
    const focusFrame = window.requestAnimationFrame(() => {
      chatCloseButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setChatOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      // Trap focus inside the drawer. The chat is now the only entry point at every
      // breakpoint, so tabbing has to reach the composer — not just the close button.
      const focusable = Array.from(
        chatDrawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focusable.length === 0) {
        event.preventDefault();
        chatDrawerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !chatDrawerRef.current?.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    // NOTE: do not lock document.body scroll here. The mounted GroupChatTab owns
    // the body scroll lock for the whole time the drawer is open (and releases it
    // on unmount). Locking it here too races that lock — React runs GroupChatTab's
    // effect first, so this effect would capture the already-locked value as its
    // "previous" and re-apply it on cleanup, leaving the page unscrollable.
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      // rAF so this lands after GroupChatTab's unmount cleanup has restored the
      // document's own overflow/height — scrolling before that is a no-op.
      window.requestAnimationFrame(() => window.scrollTo(0, previousScrollY));
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
    if (!group?.id) return;
    const query = tabId === "feed" ? "" : `?tab=${tabId}`;
    router.replace(`/league/${group.id}${query}`);
  };

  const handleContestTabChange = (tabId: LeagueContestTabId) => {
    if (!group?.id) return;
    setActiveContestTab(tabId);
    const contestTypeQuery = tabId === "feed" ? "&contestType=feed" : "";
    router.replace(`/league/${group.id}?tab=contests${contestTypeQuery}`);
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
        className={`${contestPreviewCardSizeClassName} rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-300/60 hover:bg-white/[0.07]`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{contest.name}</h3>
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
        {/* `min-h-6` reserves the chip row so a contest with no sport labels
            does not sit shorter than its neighbour. */}
        <div className="mt-4 flex min-h-6 shrink-0 flex-wrap items-center gap-2">
          {contestSportLabels(contest).map((sport) => (
            <span
              key={sport}
              className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-300"
            >
              {sport}
            </span>
          ))}
        </div>
        {/* `mt-auto` is what makes every card in a row end at the same place. */}
        <p className="mt-auto pt-3 text-[11px] text-gray-500">
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

  // `!isLoadedGroup` is what keeps a leftover record from the previously viewed
  // group off this page. It matters BEFORE the fetch effect has even dispatched:
  // effects run after the first render, so without this the page rendered a full
  // frame against the old group and mounted its children with that id — the Feed
  // fired /group/league/announcements?group_id=<previous arena id> and got back
  // "Invalid league id!". `loading` alone cannot cover it, because the previous
  // group's fetch had already completed and left `loading` false.
  //
  // `isArena` holds the skeleton for the frame between recognising an arena and the
  // handoff effect replacing the route, so League chrome never renders for one.
  const isInitialLoading =
    !isLoadedGroup ||
    isArena ||
    loading ||
    (contestLoader && activeContests === null && archivedContests === null);

  if (isInitialLoading) {
    return <LeaguePageSkeleton />;
  }

  const memberCount = group?.member_count ?? group?.members?.length ?? 0;
  const activeContestCount = group?.active_contest ?? activeContests?.length ?? 0;
  const createContestCheck = canCreateContestInGroup(group, activeContestCount);

  return (
    <div className="flex flex-col gap-3 pb-10">
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
                aria-controls="league-chat"
                aria-expanded={chatOpen}
                title="Open group chat"
                className="absolute right-0 top-7 inline-flex h-7 items-center justify-end gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-gray-500 transition hover:text-gray-300"
              >
                {unreadCounts > 0 && (
                  <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-sky-500/25 px-1 text-[9px] font-bold tabular-nums text-sky-100">
                    {unreadCounts > 99 ? "99+" : unreadCounts}
                  </span>
                )}
                {"<- open chat"}
              </button>
            </div>
      </header>

      <section className="-mx-5 -mt-3 border-b border-white/10 px-1 pb-0 pt-2 sm:mx-0">
        <LeagueTabStrip
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </section>

      {activeTab === "contests" && (
        <div className="space-y-6 pt-1">
          <LeagueContestTabStrip
            activeTab={activeContestTab}
            onTabChange={handleContestTabChange}
          />

          {activeContestTab === "slip" ? (
            <div
              id="league-slip-contests-panel"
              role="tabpanel"
              aria-labelledby="league-slip-contests-tab"
              className="space-y-6"
            >
              {isCommissioner && (
                <ContestHubCreateAction
                  href={
                    createContestCheck.allowed
                      ? `/league/${group?.id}/contests/create`
                      : undefined
                  }
                  subtitle="Set sports, dates, and a standings container for this group."
                  unavailableReason={
                    createContestCheck.allowed ? undefined : createContestCheck.error
                  }
                  unavailableHint="Archive an active contest to open another one. Historical contests are unlimited."
                />
              )}

              {/* The MVP's Slip contest accordion. Note it uses buttons + state
                  rather than the <details> the Feed hub uses, and rules the two
                  sections with `divide-y` on the container instead of a border
                  per section — both are the MVP's own choices for this panel. */}
              <div
                data-slip-contest-dividers="inset"
                className="-mx-5 divide-y divide-white/15 border-y border-white/15 sm:mx-0"
              >
                <section className="py-4">
                  <button
                    type="button"
                    onClick={() => setShowOpenContests((previous) => !previous)}
                    className="flex w-full items-center justify-between gap-3 px-5 text-left sm:px-6"
                    aria-expanded={showOpenContests}
                    aria-controls="league-open-slip-contests"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                      Open:{" "}
                      <span className="tabular-nums text-gray-400">
                        {activeContests?.length ?? 0}
                      </span>
                    </h3>
                    <span className="ml-auto truncate text-right text-[11px] text-gray-500">
                      Active Fantasy Contests accepting picks or awaiting results
                    </span>
                    <span aria-hidden className="text-sm text-gray-500">
                      {showOpenContests ? "▴" : "▾"}
                    </span>
                  </button>

                  {showOpenContests ? (
                    <div id="league-open-slip-contests">
                      {activeContests?.length ? (
                        <div className="space-y-4">
                          <div className="mt-3 grid grid-cols-1 gap-3 px-5 sm:px-6 md:grid-cols-2">
                            {activeContests.map(renderContestCard)}
                            {contestLoader && activePage > 1 && (
                              <>
                                <ContestCardSkeleton />
                                <ContestCardSkeleton />
                              </>
                            )}
                          </div>
                          {hasMoreActive && !contestLoader && (
                            <div className="flex justify-center px-5 pt-2 sm:px-6">
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
                        <div className="mx-5 mt-3 rounded-lg border border-dashed border-white/15 bg-black/30 p-6 text-sm text-gray-400 sm:mx-6">
                          <p className="font-semibold text-white">No contests yet.</p>
                          <p className="mt-2">
                            {isCommissioner
                              ? "Start the first contest when your League is ready."
                              : "The commissioner has not started a contest yet."}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="py-4">
                  <button
                    type="button"
                    onClick={() => setShowArchived((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 px-5 text-left sm:px-6"
                    aria-expanded={showArchived}
                    aria-controls="league-archived-slip-contests"
                  >
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                      Archived:{" "}
                      <span className="tabular-nums text-gray-400">
                        {archivedContests?.length ?? 0}
                      </span>
                    </span>
                    <span className="ml-auto truncate text-right text-[11px] font-normal text-gray-500">
                      Completed contest history
                    </span>
                    <span aria-hidden className="text-sm text-gray-500">
                      {showArchived ? "▴" : "▾"}
                    </span>
                  </button>
                  {showArchived && (
                    <div id="league-archived-slip-contests">
                      {archivedContests?.length ? (
                        <div className="space-y-4">
                          <div className="mt-3 grid grid-cols-1 gap-3 px-5 sm:px-6 md:grid-cols-2">
                            {archivedContests.map(renderContestCard)}
                            {contestLoader && archivedPage > 1 && (
                              <>
                                <ContestCardSkeleton />
                                <ContestCardSkeleton />
                              </>
                            )}
                          </div>
                          {hasMoreArchived && !contestLoader && (
                            <div className="flex justify-center px-5 pt-2 sm:px-6">
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
                        <div className="mx-5 mt-3 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-500 sm:mx-6">
                          No archived contests.
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div
              id="league-feed-contests-panel"
              role="tabpanel"
              aria-labelledby="league-feed-contests-tab"
              className="space-y-6"
            >
              {isCommissioner && (
                <ContestHubCreateAction
                  href={`/league/${group?.id}/feed-contests/create`}
                  subtitle="Pick a format, a slate, and a deadline. Save it as a draft or publish it now."
                />
              )}
              <FeedContestSections
                title="League Feed contests"
                sections={feedContestSections}
                organizer={isCommissioner}
                detailHref={(contestId) =>
                  `/league/${group?.id}/feed-contests/${contestId}`
                }
                onLoadMore={(section) =>
                  loadFeedContestSection(
                    section,
                    feedContestSections[section].page + 1
                  )
                }
                emptyTitle="No League Feed contests yet"
                emptyBody={
                  isCommissioner
                    ? "Start the first Feed contest when your League is ready."
                    : "The commissioner has not made a Feed contest available yet."
                }
                // A League Feed contest has no capacity of its own — every member
                // may enter — so the roster IS the limit, and "spots remaining"
                // reads as how many members have not entered yet. The MVP passes
                // `members.length` here for the same reason.
                participantLimit={memberCount || null}
              />
            </div>
          )}
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
          // Opens the League-scoped member card rather than the global profile;
          // the card links onward to the profile from its own header.
          getMemberHref={(member) =>
            member.user_id ? `/league/${leagueId}/members/${member.user_id}` : "#"
          }
        />
      )}

      {activeTab === "feed" && (
        <ConnectedStructuredFeed
          // The URL's id, not the loaded record's — the two are equal by the time
          // this renders (see isInitialLoading), and the URL can never go stale.
          groupId={leagueId}
          groupType="league"
          contextName={group.name ?? "League"}
          currentRole={isCommissioner ? "commissioner" : "member"}
          writable={isCommissioner}
          currentUserId={currentUser?.userId}
          className="-mt-3"
          initialFilter={initialFeedFilter}
          standings={<LeagueFeedStandingsPanel />}
        />
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

      {/* Chat drawer — the only entry point to group chat now that the tab is gone,
          so it renders at every breakpoint (full-width on mobile, a right-hand panel
          on desktop). Portaled to <body> and sized to the VISUAL viewport
          (height:--app-vvh + translateY(--kb-offset), both published by GroupChatTab)
          so it stays OUT of the app-shell's iOS keyboard counter-transform. A transform
          on an ancestor makes position:fixed resolve against that ancestor's (tall) box
          instead of the viewport, which was stretching the panel and pushing the
          composer below the keyboard. Portaling also escapes the body-lock's -scrollY
          offset, so the drawer tracks the visible viewport on iOS. */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-x-0 top-0 z-50 ${chatOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
            style={{
              height: "var(--app-vvh, 100dvh)",
              transform: "translateY(var(--kb-offset, 0px))",
            }}
            aria-hidden={!chatOpen}
          >
            <button
              type="button"
              aria-label="Dismiss group chat"
              tabIndex={-1}
              onClick={() => setChatOpen(false)}
              className={`absolute inset-0 hidden bg-black/65 backdrop-blur-sm transition-opacity duration-300 sm:block ${chatOpen ? "opacity-100" : "opacity-0"
                }`}
            />
            <aside
              ref={chatDrawerRef}
              id="league-chat"
              role="dialog"
              aria-modal="true"
              aria-labelledby="league-chat-title"
              tabIndex={-1}
              className={`absolute inset-y-0 right-0 flex w-full flex-col bg-neutral-950 shadow-2xl transition-transform duration-300 ease-out sm:max-w-[420px] sm:border-l sm:border-white/10 ${chatOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
                    {group?.name}
                  </p>
                  <h2 id="league-chat-title" className="mt-1 text-lg font-semibold text-white">
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
              {/* Gated on chatOpen: GroupChatTab owns global side effects (body scroll
                  lock, viewport CSS vars), so it must not be mounted while hidden. */}
              <div className="flex min-h-0 flex-1 flex-col">
                {chatOpen && <GroupChatTab groupId={leagueId} />}
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
