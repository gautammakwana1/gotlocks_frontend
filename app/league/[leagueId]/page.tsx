"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import {
  COMMUNITY_DETAIL_CONTEST_ACTION_CLASS_NAME,
  COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME,
  CommunityDetailChrome,
  CommunityDetailHeader,
  CommunityDetailIndicatorSeparator,
  CommunityDetailTabBar,
  CommunityDetailTabStrip,
} from "@/components/community/CommunityDetailChrome";
import { CommunitySwipePager } from "@/components/community/CommunitySwipePager";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { Contest, Group, GroupSelector, RootState } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { clearConfirmDeleteGroupMessage, clearCreateNewLeaderboardMessage, clearUpdateGroupMessage, confirmDeleteGroupRequest, fetchGroupByIdRequest, fetchGroupOwnerPlanDetailsRequest, fetchLeagueGuideStatusRequest, fetchUnreadCountsByLeagueIdRequest, initialGroupDeleteRequest, leaveGroupRequest, markLeagueGuideViewedRequest, removeGroupMemberRequest, updateGroupMemberRoleRequest, updateGroupRequest } from "@/lib/redux/slices/groupsSlice";
import LeagueMemberGuideDialog from "@/components/leagues/onboarding/LeagueMemberGuideDialog";
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
import ContestCreationDrawer from "@/components/contests/ContestCreationDrawer";
import FeedContestDrawerBuilder from "@/components/contests/FeedContestDrawerBuilder";
import FantasyContestDrawerBuilder from "@/components/contests/FantasyContestDrawerBuilder";
import FeedContestSections from "@/components/contests/FeedContestSections";
import { ContestPreviewCard } from "@/components/contests/preview/ContestPreviewCard";
import { buildFantasyContestPreviewModel } from "@/components/contests/preview/fantasyContestPreview";
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
  className,
  ariaLabel,
}: {
  tabs: readonly LeagueTab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  className: string;
  ariaLabel: string;
}) => {
  return (
    <CommunityDetailTabBar
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
};

// Superseded by CommunitySwipePager, which is what the MVP switches contest
// types with. Kept here (commented, not deleted) as the record of the pill strip
// this hub used to render — it has no callers left.
// const LeagueContestTabStrip = ({
//   activeTab,
//   onTabChange,
// }: {
//   activeTab: LeagueContestTabId;
//   onTabChange: (tabId: LeagueContestTabId) => void;
// }) => (
//   <div
//     role="tablist"
//     aria-label="League contest types"
//     className="grid w-full grid-cols-2 rounded-2xl border border-sky-200/10 bg-black/25 p-1"
//   >
//     {LEAGUE_CONTEST_TABS.map((tab) => {
//       const isActive = activeTab === tab.id;
//       return (
//         <button
//           key={tab.id}
//           type="button"
//           role="tab"
//           id={`league-${tab.id}-contests-tab`}
//           aria-controls={`league-${tab.id}-contests-panel`}
//           aria-selected={isActive}
//           onClick={() => onTabChange(tab.id)}
//           className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${isActive
//             ? "bg-sky-500/20 text-sky-50 shadow-sm"
//             : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
//             }`}
//         >
//           <span className="truncate">{tab.label}</span>
//         </button>
//       );
//     })}
//   </div>
// );

const LeagueTierDetailsLabel = ({
  league,
  role,
  memberCapacityLabel,
  standardContestCapacityLabel,
  feedContestCapacityLabel,
}: {
  league: Group;
  /** The viewer's membership in this League, shown beside the type label. */
  role?: string | null;
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
        <GroupTypeMetaLabel group={league} showTitle={false} role={role} />
      </button>

      {open && (
        <span
          id={league.id}
          role="tooltip"
          // whitespace-normal is load-bearing: the header metadata row this
          // label sits in sets `lg:whitespace-nowrap`, and white-space
          // inherits — without the reset the sentences below render on one
          // line and spill straight out of the w-64 box on desktop.
          className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2.5rem)] whitespace-normal break-words rounded-xl border border-white/15 bg-[#090d16] p-3 text-left font-sans text-xs font-normal normal-case tracking-normal text-gray-300 shadow-2xl shadow-black/50"
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
  /**
   * The League Guide, exactly as the MVP drives it: `"automatic"` is the
   * welcome pop-up a newly joined member gets on their first visit,
   * `"manual"` is the "League guide" button in the header's action row.
   *
   * The MODE decides whether closing it records anything. A manual re-open by
   * somebody who has already read it must not overwrite their `completed`
   * with a `dismissed` — and re-recording is otherwise a no-op, so only the
   * automatic path writes.
   */
  const [leagueGuideMode, setLeagueGuideMode] = useState<"automatic" | "manual" | null>(
    null
  );
  // Latched so the auto-open fires at most ONCE per mount. Without it, the
  // optimistic flip in the slice would race the effect and the dialog could
  // reopen the instant it closed.
  const autoGuideDecidedRef = useRef(false);

  const {
    group,
    loading,
    message: groupMessage,
    error: errorMessage,
    deleteLoading,
    deleteMessage,
    unreadCounts,
    ownerPlan,
    leagueGuide,
    leagueGuideForId,
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
    // The League Guide read is NOT dispatched here — see the league-only effect
    // below, which waits for the group to identify itself first.
    fetchedGroupId.current = leagueId;
  }, [leagueId, currentUser, dispatch]);

  /**
   * Auto-open on a DEFINITE yes and nothing else.
   *
   * `should_show_guide` is derived server-side from the acknowledgement row,
   * so it is the only thing gated on — never re-derived from the timestamps
   * beside it, and never assumed while the read is in flight or has failed
   * (`leagueGuide` is null in both cases, which reads as "don't open").
   *
   * Scoped by `leagueGuideForId`: this opens a modal over the page, and the
   * previous League's answer deciding it is exactly the bug that only appears
   * when a member navigates between two of them.
   */
  // Declared BEFORE the auto-open below, and the order is load-bearing: React
  // runs effects in declaration order, so a reset placed after it would wipe a
  // mode the same commit had just set — the dialog would never open when this
  // League's guide was already in the store from an earlier visit.
  useEffect(() => {
    autoGuideDecidedRef.current = false;
    setLeagueGuideMode(null);
  }, [leagueId]);

  useEffect(() => {
    if (autoGuideDecidedRef.current) return;
    if (leagueGuideForId !== leagueId) return;
    if (!leagueGuide?.should_show_guide) return;
    autoGuideDecidedRef.current = true;
    setLeagueGuideMode("automatic");
  }, [leagueGuide?.should_show_guide, leagueGuideForId, leagueId]);

  /**
   * `completed` = read through to the last step. `dismissed` = closed early.
   * Both silence it; the split is what keeps "did members actually read it"
   * answerable. Only an AUTOMATIC open records — see the mode's own note.
   */
  const closeLeagueGuide = (status: "completed" | "dismissed") => {
    if (leagueGuideMode === "automatic") {
      dispatch(markLeagueGuideViewedRequest({ league_id: leagueId, status }));
    }
    setLeagueGuideMode(null);
  };

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
    searchParams.get("tab") === "leaderboard" ? "standings" : "updates"
  );
  // The Start-a-contest workspace. Both contest types share ONE affordance: the
  // drawer's Step 1 chooser is what picks between them, so the hub no longer
  // needs a create card per panel.
  //
  // Choosing FEED swaps the drawer's body to the wizard in place, as the MVP
  // does, instead of navigating away — a League has two types, so unlike the
  // Arena it keeps the chooser and can step back to it.
  //
  // /league/:id/feed-contests/create is untouched and still canonical: it owns
  // the group fetch, the commissioner gate and the redirect for anyone arriving
  // by URL. Fantasy still links there for now — see the choice list below.
  const [contestCreationOpen, setContestCreationOpen] = useState(false);
  const [contestCreationStep, setContestCreationStep] = useState<
    "choice" | "feed" | "fantasy"
  >("choice");
  const contestCreationTriggerRef = useRef<HTMLButtonElement>(null);
  // Every open starts at the chooser. Reset on OPEN rather than on close so the
  // body does not visibly swap back while the drawer is animating out.
  const openContestCreation = () => {
    setContestCreationStep("choice");
    setContestCreationOpen(true);
  };
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

  /**
   * Has this member been shown the League Guide for THIS League? Per-league, so
   * joining a second one asks again.
   *
   * Deliberately NOT in the mount effect with the other five fetches: those are
   * group-generic, this one is the only League-ONLY endpoint on the page, and
   * `GET /group/league/guide` answers 404 for anything that is not a League. An
   * arena id reaching this route is routine, not exceptional — Home links both
   * kinds to /league/:id and the effect above hands them over — so the read
   * waits until the loaded group has confirmed it is the League this URL asked
   * for. The one-round-trip delay only moves when the welcome pop-up appears,
   * never whether it does.
   */
  useEffect(() => {
    if (!currentUser || !isLoadedGroup || group?.group_type !== "league") return;
    dispatch(fetchLeagueGuideStatusRequest({ league_id: leagueId }));
  }, [currentUser, dispatch, group?.group_type, isLoadedGroup, leagueId]);

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

  /**
   * The Fantasy contest card — the same shared preview card the Feed contests
   * and the Arena use, so the two halves of the Contests tab read as one design.
   *
   * NO WINNER on a finalized card: `buildFantasyContestPreviewModel` never sets
   * `resultSummary`. A champion plate belongs to the Feed contest card alone.
   */
  const renderContestCard = (contest: Contest) => (
    <ContestPreviewCard
      key={contest.id}
      headingLevel={4}
      className="h-full self-stretch"
      preview={buildFantasyContestPreviewModel({
        contest,
        detailHref: `/league/${group?.id}/contests/${contest.id}`,
        /*
         * NO `addPickHref` — the card always opens the contest.
         *
         * It used to jump an open contest straight into the pick builder,
         * which skipped the contest entirely: you could not reach the Rank
         * board, the slips, or the badges without backing out again. Entering
         * a pick is the LEADERBOARD's job — `SlipCellCard` renders an "Add your
         * pick" cell on the viewer's own row for every open slip, which is
         * where the MVP puts it too.
         */
      })}
    />
  );

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
      <CommunityDetailChrome accent="league">
        <CommunityDetailHeader
          backAction={
            <BackButton
              label="back to all groups"
              fallback="/fantasy"
              preferFallback
              alignSelf="center"
            />
          }
          inviteIndicator={
            <InviteCodeCopy
              code={group?.invite_code}
              className="-mr-[5px] lg:-mr-[3px] lg:text-[11px]"
            />
          }
          metadataClassName={groupPreviewMetaTextClassName}
          metadataStart={
            group ? (
              <>
                <span>{getGroupCapacityLabel(group, memberCount)}</span>
                {/* <span>{getActiveContestCountsLabel(group, activeContestCount)}</span> */}
                <CommunityDetailIndicatorSeparator />
                <span>
                  {getCombinedContestCapacityLabel(
                    group,
                    [],
                    []
                  )}
                </span>
              </>
            ) : null
          }
          metadataEnd={
            group?.group_type === "league" ? (
              <LeagueTierDetailsLabel
                league={group}
                /*
                 * `current_user_member` is optional on the group payload, so
                 * the creator falls back to commissioner — the same fallback
                 * `isCommissioner` above uses. Without it a League owner whose
                 * membership row did not come back would read as "Member".
                 */
                role={
                  group.current_user_member?.role ??
                  (currentUser && group.created_by === currentUser.userId
                    ? "commissioner"
                    : undefined)
                }
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
            )
          }
          title={group?.name}
          titleStyle={displayNameGradientStyle}
          description={group?.description}
          actions={
            <>
              {/* The League guide re-open. It lives in the header's action row
                  rather than under the description — outside any description
                  guard either way, so a League that never set one still offers
                  the guide. A manual open records nothing (see
                  closeLeagueGuide). */}
              <button
                type="button"
                onClick={() => setLeagueGuideMode("manual")}
                className={`${COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME} w-full`}
              >
                League guide
              </button>
              <button
                ref={chatTriggerRef}
                type="button"
                onClick={() => setChatOpen(true)}
                // Matches the visible label, which this row changed to
                // "Open chat" — an accessible name that does not contain the
                // visible one breaks voice control (WCAG 2.5.3 Label in Name).
                // The fuller wording stays on `title` as the hover hint, exactly
                // as the MVP splits them.
                aria-label="Open chat"
                aria-controls="league-chat"
                aria-expanded={chatOpen}
                title="Open group chat"
                className={`${COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME} w-full`}
              >
                {unreadCounts > 0 && (
                  <span className="mr-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-sky-500/25 px-1 text-[9px] font-bold tabular-nums text-sky-100">
                    {unreadCounts > 99 ? "99+" : unreadCounts}
                  </span>
                )}
                Open chat
              </button>
            </>
          }
        />

        <CommunityDetailTabStrip>
          <LeagueTabStrip
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="grid sm:hidden"
            ariaLabel="League sections mobile"
          />
          <LeagueTabStrip
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="hidden sm:grid"
            ariaLabel="League sections desktop"
          />
        </CommunityDetailTabStrip>
      </CommunityDetailChrome>

      {activeTab === "contests" && (
        // The MVP's contest-hub band (MVP league page:929): the contest-type
        // switcher and a single Start-contest button share one tinted header, in
        // place of the full-width create card that used to sit inside each panel.
        // The switcher is CommunitySwipePager, so the two contest types are a
        // swipeable carousel with progress dots rather than a pill strip — and,
        // as in the MVP, the panels below carry NO role="tabpanel"/aria-labelledby:
        // a carousel has no tablist to label them, and the pager's own dots point
        // at `panelId` instead. Deep links (?tab=contests&contestType=feed) are
        // untouched — handleContestTabChange still owns the URL.
        //
        // The root's `sm:-mx-6` cancels AppShell's `sm:px-6` so the tinted band
        // and the rules below it bleed to the container edge at every width,
        // exactly as the Arena's violet counterpart does (ArenaContestsPanel's
        // header, ArenaDashboard:493). CommunityDetailChrome above is
        // `-mx-5 sm:-mx-6` too, so an inset band here would step in 24px from
        // the chrome's accent underline and read as a seam. Body content
        // re-insets itself with `px-5 sm:px-6`, landing back on the page gutter.
        //
        // `workspace-tab-panel` is deliberately NOT on this root: the two inner
        // panels below carry it, and stacking the class at both levels would
        // compound one entrance animation onto the other (0.7 * 0.7 opacity,
        // 5px + 5px offset). Keeping it on the inner panels also lets the
        // pager's `key={activeItem.id}` slide replay it on a contest-type swipe.
        <CommunitySwipePager
          items={LEAGUE_CONTEST_TABS}
          activeId={activeContestTab}
          onChange={handleContestTabChange}
          ariaLabel="League contest types"
          progressLabel="League contest type progress"
          positionLabel="Contest view"
          showPosition={false}
          accent="sky"
          controlsAccessory={
            isCommissioner ? (
              <button
                ref={contestCreationTriggerRef}
                type="button"
                onClick={openContestCreation}
                aria-haspopup="dialog"
                aria-expanded={contestCreationOpen}
                className={COMMUNITY_DETAIL_CONTEST_ACTION_CLASS_NAME}
              >
                Start contest
              </button>
            ) : undefined
          }
          className="-mt-3 sm:-mx-6"
          panelId="league-contest-type-panel"
          headerClassName="-mx-5 bg-blue-400/[0.055] bg-gradient-to-b from-black via-black/40 to-transparent px-5 py-4 sm:mx-0 sm:px-4 lg:[&_[data-community-pager-label-layout]]:pl-6 lg:[&_[data-community-pager-label]]:text-lg lg:[&_[data-community-pager-label]]:font-extrabold"
        >
          {activeContestTab === "slip" ? (
            <div className="workspace-tab-panel">
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
            <div className="workspace-tab-panel">
              <FeedContestSections
                title="League Feed contests"
                sections={feedContestSections}
                organizer={isCommissioner}
                detailHref={(contestId) =>
                  `/league/${group?.id}/feed-contests/${contestId}`
                }
                // Turns an open contest the viewer has not entered into a
                // "Build Entry" / "Make Picks" card instead of "View Details".
                entryHref={(contestId) =>
                  `/league/${group?.id}/feed-contests/${contestId}/entry`
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
        </CommunitySwipePager>
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
          standings={<LeagueFeedStandingsPanel leagueId={leagueId} />}
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

{/* Mirrors MVP league page:1093-1150. The FEED builder is mounted in the
          drawer, as the MVP mounts its `surface="drawer"` create form; Fantasy
          still links to its route, because that page is a route-only component
          that does its own fetch, gate and redirect. */}
      <ContestCreationDrawer
          open={contestCreationOpen}
          onClose={() => setContestCreationOpen(false)}
          returnFocusRef={contestCreationTriggerRef}
          accent="league"
          content={
            contestCreationStep === "fantasy"
              ? {
                  kind: "builder",
                  label: "Fantasy Contest builder",
                  onBack: () => setContestCreationStep("choice"),
                  children: (
                    <FantasyContestDrawerBuilder leagueId={group?.id ?? ""} />
                  ),
                }
              : contestCreationStep === "feed"
              ? {
                  kind: "builder",
                  label: "Feed Contest builder",
                  // A League has two contest types, so the chooser is a real
                  // step to come back to — the Arena, with one, has none.
                  onBack: () => setContestCreationStep("choice"),
                  children: (
                    <FeedContestDrawerBuilder
                      groupId={group?.id ?? ""}
                      groupType="league"
                      contextName={group?.name ?? "League"}
                      backHref={`/league/${group?.id}?tab=contests&contestType=feed`}
                      detailHref={(contestId) =>
                        `/league/${group?.id}/feed-contests/${contestId}`
                      }
                    />
                  ),
                }
              : {
                  kind: "choice",
                  contextName: group?.name ?? "this League",
                  choices: [
                    {
                      id: "slip",
                      title: "Fantasy Contest",
                      description:
                        "Set sports, dates, and a standings container for this group.",
                      // Handled in place, like the Feed choice below — the form
                      // opens in the drawer instead of navigating. The route
                      // stays canonical for deep links.
                      onSelect: () => setContestCreationStep("fantasy"),
                      // The same gate the create card used, passed through untouched.
                      allowed: createContestCheck.allowed,
                      unavailableReason: createContestCheck.allowed
                        ? undefined
                        : createContestCheck.error,
                      unavailableHint:
                        "Archive an active contest to open another one. Historical contests are unlimited.",
                    },
                    {
                      id: "feed",
                      title: "Feed Contest",
                      description:
                        "Pick a format, a slate, and a deadline. Save it as a draft or publish it now.",
                      // Handled in place — `onSelect` wins over `href`, so the
                      // wizard opens in the drawer instead of navigating.
                      onSelect: () => setContestCreationStep("feed"),
                      // Ungated here, exactly as the card it replaces was. The MVP
                      // gates this on a `createFeedContestCheck` + plan-upgrade
                      // link; `canCreateFeedContestInLeague` exists in
                      // lib/groups/limits.ts but has no callers and wants domain
                      // `StructuredFeedContest` rows this page never builds, so
                      // wiring it would be new business logic.
                      allowed: true,
                    },
                  ],
                }
          }
      />

      <LeagueMemberGuideDialog
        open={leagueGuideMode !== null}
        leagueName={group?.name ?? "this League"}
        onComplete={() => closeLeagueGuide("completed")}
        onDismiss={() => closeLeagueGuide("dismissed")}
      />
    </div>
  );
};

export default LeagueDashboardPage;
