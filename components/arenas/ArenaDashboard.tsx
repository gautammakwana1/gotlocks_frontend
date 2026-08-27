"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import {
    arenaTierLabel,
    ArenaStatusBanner,
    formatArenaCents as formatCents,
    getArenaHostingStatusLabel,
    getArenaTierLabel,
    hostingMessage,
} from "./ArenaHostingStatus";
import { formatDateTime } from "@/lib/utils/date";
import { useToast } from "@/lib/state/ToastContext";
import InviteCodeCopy from "../group/InviteCodeCopy";
import { DeleteGroupConfirmationModal } from "../group/ConfirmDeleteGroupModal";
import GroupNotFoundNotice from "../group/GroupNotFoundNotice";
import GroupManagerSettings from "../group/GroupManagerSettings";
import {
    SettingsActionBar,
    SettingsDisclosure,
    SettingsPage,
    SettingsSection,
    SettingsStatus,
    settingsDangerButtonClassName,
    settingsFieldLabelClassName,
    settingsInputClassName,
    settingsPrimaryButtonClassName,
} from "@/components/settings/SettingsUI";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { ArenaHostingDetails, ArenaUnlockDetails, FeedContest, FeedContestSection, Group, GroupJoinRequest, GroupSelector, LifetimeStandingsState, Members, RootState, UpdateArenaDetailsPayload } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest, fetchGroupMembersByGroupIdRequest, fetchGroupOwnerPlanDetailsRequest } from "@/lib/redux/slices/groupsSlice";
import { MANAGER_ROSTER_LIMIT } from "@/lib/redux/sagas/groupsSaga";
import {
    clearArenaDeleteState,
    clearArenaHostingActionMessage,
    clearArenaMemberActionMessage,
    clearLeaveArenaState,
    confirmArenaDeleteRequest,
    initiateArenaDeleteRequest,
    leaveArenaRequest,
    clearArenaOwnershipTransferMessage,
    clearUnlockArenaMessage,
    fetchArenaGuideStatusRequest,
    markArenaGuideViewedRequest,
    fetchArenaHostingDetailsRequest,
    fetchArenaOwnershipTransferRequest,
    removeArenaMemberRequest,
    unlockArenaRequest,
    updateArenaDetailsRequest,
    clearUpdateArenaDetailsMessage,
    updateArenaJoinPolicyRequest,
    clearArenaJoinPolicyMessage,
    fetchArenaJoinRequestsRequest,
    respondArenaJoinRequestRequest,
    clearArenaJoinRequestActionMessage,
} from "@/lib/redux/slices/arenaSlice";
import {
    getArenaUnlockOffer,
} from "@/components/billing/arena";
import {
    PurchaseFlowDialog,
    type PurchaseFlowStatus,
} from "@/components/billing/PurchaseFlowDialog";
import { getCombinedContestCapacityLabel, getGroupCapacityLabel } from "@/lib/groups/limits";
import LeaguePageSkeleton from "../skeletons/leagues/LeaguePageSkeleton";
import MembersSkeleton from "../skeletons/leagues/MembersSkeleton";
import { groupPreviewMetaTextClassName } from "../group/GroupPreviewChip";
import ContestCreationDrawer from "../contests/ContestCreationDrawer";
import FeedContestDrawerBuilder from "../contests/FeedContestDrawerBuilder";
import FeedContestSections from "../contests/FeedContestSections";
import { COMMUNITY_DETAIL_ARENA_CONTEST_ACTION_CLASS_NAME } from "../community/CommunityDetailChrome";
import {
    STANDINGS_CARD_STYLES,
    StandingIdentity,
    StandingPrimaryMetric,
    StandingRank,
    StandingsCard,
} from "../community/StandingsCard";
import {
    fetchFeedContestsRequest,
    resetFeedContests,
} from "@/lib/redux/slices/feedContestSlice";
import ConnectedStructuredFeed from "../feed/ConnectedStructuredFeed";
import type { StructuredFeedFilter } from "../feed/types";
import ArenaMemberWelcomeDialog from "./onboarding/ArenaMemberWelcomeDialog";
import ArenaVenueCheckInPanel from "./checkin/ArenaVenueCheckInPanel";
import ArenaRewardContactSettings from "./ArenaRewardContactSettings";
import ArenaJoinPolicySettings from "./ArenaJoinPolicySettings";
import ArenaMemberContactsPanel from "./ArenaMemberContactsPanel";
import {
    filterArenaLifetimeStandings,
    getLifetimeStandingsBoardMeta,
    lifetimeStandingRoleChip,
} from "@/lib/groups/lifetimeStandings";
import { fetchLifetimeStandingsRequest } from "@/lib/redux/slices/lifetimeStandingsSlice";
import {
    getMemberDirectoryAvatarClassName,
    getMemberDirectoryCardClassName,
    MemberDirectorySearch,
    MemberDirectoryViewToggle,
    memberDirectoryGridClassName,
    memberDirectoryListClassName,
    memberDirectoryPanelClassName,
    type MemberDirectoryView,
} from "../community/MemberDirectoryControls";
import {
    COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME,
    CommunityDetailChrome,
    CommunityDetailHeader,
    CommunityDetailIndicatorSeparator,
    CommunityDetailTabBar,
    CommunityDetailTabStrip,
} from "../community/CommunityDetailChrome";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import useScopedGroup from "@/lib/groups/useScopedGroup";

// One flat strip, matching the MVP and the League / contest detail pages.
// There is deliberately no Leaderboard tab: the Community Leaderboard is a
// filter chip inside the Feed (ArenaFeedPanel's `standings` node), which is
// where the MVP and the League page both put it.
const ARENA_TABS = [
    { id: "feed", label: "Feed" },
    { id: "contests", label: "Contests" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
] as const;

type ArenaTabId = (typeof ARENA_TABS)[number]["id"];
type ArenaTab = (typeof ARENA_TABS)[number];

// Mirrors the validateTextField / parseCommunityUrl bounds in updateArenaDetails.
const ARENA_NAME_MIN = 4;
const ARENA_NAME_MAX = 25;
const ARENA_DESCRIPTION_MAX = 50;

const TIME_ZONE_OPTIONS = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
];

const normalizeTab = (value: string | null): ArenaTabId =>
    ARENA_TABS.some((tab) => tab.id === value) ? (value as ArenaTabId) : "feed";

const roleLabel = (role: string) =>
    role === "commissioner" ? "Owner" : role === "manager" ? "Manager" : "Member";

export const isArenaStaffRole = (role: string | undefined) =>
    role === "commissioner" || role === "manager";

// Hosting-row presentation lives in ./ArenaHostingStatus so the app-settings
// billing page can render the same banner without importing this component.
// Re-exported because these names were part of this module's public surface.
export {
    arenaTierLabel,
    getArenaTierLabel,
    getArenaHostingStatusLabel,
} from "./ArenaHostingStatus";

const ArenaDetailsLabel = ({
    role,
    hosting,
    managerCount,
    managerLimit,
}: {
    role: string;
    hosting: ArenaHostingDetails | null;
    managerCount: number;
    managerLimit: number | "Custom";
}) => {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [pinned, setPinned] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    const detailsId = "1234567489";
    const open = hovered || focused || pinned;

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

    if (!hosting) return null;

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
                aria-controls={detailsId}
                aria-label="Show Arena details"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (pinned) closeDetails();
                    else setPinned(true);
                }}
                className="cursor-help rounded-sm text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
            >
                Arena · {roleLabel(role)}
            </button>

            {open ? (
                <span
                    id={detailsId}
                    role="tooltip"
                    // whitespace-normal is load-bearing: the header metadata row
                    // this label sits in sets `lg:whitespace-nowrap`, and
                    // white-space inherits — without the reset the hosting
                    // message renders on one line and spills straight out of the
                    // w-72 box on desktop.
                    className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2.5rem)] whitespace-normal break-words rounded-xl border border-white/15 bg-[#090d16] p-3 text-left font-sans text-xs font-normal normal-case tracking-normal text-gray-300 shadow-2xl shadow-black/50"
                >
                    <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-amber-100">
                            {getArenaTierLabel(hosting)} · {getArenaHostingStatusLabel(hosting)}
                        </span>
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                            Simulated hosting
                        </span>
                    </span>
                    <span className="mt-1 block leading-5 text-gray-400">
                        {hostingMessage(hosting)}
                    </span>
                    <span className="mt-2 block border-t border-white/10 pt-2 leading-5">
                        {managerCount}/{managerLimit} managers
                    </span>
                    <span className="mt-2 block text-[10px] uppercase tracking-[0.1em] text-gray-500">
                        Hover or tap the Arena label for details
                    </span>
                </span>
            ) : null}
        </span>
    );
};

/**
 * The shared folder-tab strip used by the League and contest detail pages, in
 * the Arena's violet accent. The raised "notch" on the selected tab, the accent
 * underline it notches into, and the violet itself all come from
 * CommunityDetailChrome.module.css — which is why nothing here names a colour:
 * the accent is the `--community-accent-rgb` token that
 * <CommunityDetailChrome accent="arena"> sets on the surface.
 */
const ArenaTabStrip = ({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: readonly ArenaTab[];
    activeTab: ArenaTabId;
    onChange: (tab: ArenaTabId) => void;
}) => (
    <CommunityDetailTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onChange}
        ariaLabel="Arena sections"
    />
);

const ArenaFeedPanel = ({
    arenaId,
    arenaName,
    role,
    writable,
    currentUserId,
    initialFilter = "updates",
}: {
    /**
     * Route param. Required (not optional) so a record id — which can belong to the
     * previously viewed group — can never be passed here: `arena?.id` is
     * `string | undefined` and tsc now rejects it.
     */
    arenaId: string;
    arenaName: string;
    role: string;
    writable: boolean;
    currentUserId?: string;
    initialFilter?: StructuredFeedFilter;
}) => {
    if (!arenaId) return;
    return (
        <div className="space-y-4">
            {/* No staff-only preamble above the Feed: the MVP puts nothing between
                the tab strip and the Feed's own filter band, and the staff rules it
                restated (noncompetitive Staff Picks, hosting-gated publishing) are
                already stated where they apply — on the Staff Pick card and by the
                composer's own disabled state. */}

            {/* The Community Leaderboard rides in as the Feed's "Standings"
                chip rather than a tab of its own — StructuredFeed only renders
                that chip when a `standings` node is supplied. Same wiring as
                the League page's LeagueFeedStandingsPanel, and the MVP's. */}
            <ConnectedStructuredFeed
                groupId={arenaId}
                groupType="arena"
                contextName={arenaName}
                currentRole={role}
                writable={writable}
                currentUserId={currentUserId}
                initialFilter={initialFilter}
                standings={<ArenaLeaderboardPanel arenaId={arenaId} />}
            />
        </div>
    )
};

/* ----------------------------------------------------------------------------
 * The Arena Contests tab, ported from the MVP's ArenaContestsPanel
 * (gotlocks.app_mvp2/components/arenas/ArenaDashboard.tsx:265): a violet hosting
 * band carrying the staff-only "Start a contest" card, then the phase accordion.
 *
 * The rows behind it moved too. This tab used to draw the legacy `arena_contests`
 * list (`GET /group/arena/contests`); it now reads the SAME engine the League's
 * Feed Contests tab does — `/group/feed-contest/*`, one surface for both
 * contexts, selected by `group_type` ("arena" here, "league" there). That is why
 * the accordion is `FeedContestSections` rather than `StructuredContestList`:
 * each phase is its own server-owned query with its own count and pagination.
 *
 * Two arena-only rules the League never applies:
 *   - the create gate mirrors the server's own (`resolveFeedContestContext`):
 *     unlocked, hosting in `active`/`included_month`, under active_contest_limit;
 *   - staff are NONCOMPETITIVE unless a contest opted them in, so their cards
 *     offer "View Details" instead of "Build Entry" (`resolveFeedContestForEntry`
 *     answers 403 otherwise).
 * -------------------------------------------------------------------------- */
const ArenaContestsPanel = ({
    arenaId,
    arenaName,
    rewardContactEmail,
    role,
    hosting,
    unlock,
}: {
    /** Route param — never the record's id, which can belong to the previous group. */
    arenaId: string;
    /** Interpolated into the builder's header — "<name> · Feed contest". */
    arenaName: string;
    /**
     * The Arena's reward inbox, for the builder's Reward step. `GET /group/:id`
     * returns it to the OWNER alone, so a manager sees undefined whether or not
     * one is configured — which is why the step's copy is role-aware.
     */
    rewardContactEmail: string | null | undefined;
    role: string;
    hosting: ArenaHostingDetails | null;
    unlock: ArenaUnlockDetails | null;
}) => {
    const dispatch = useDispatch();
    const sections = useSelector((state: RootState) => state.feedContest.sections);
    const staff = isArenaStaffRole(role);
    // The Start-a-contest workspace, with the wizard mounted INSIDE it.
    //
    // An Arena has exactly one contest type, so the drawer opens straight into
    // the builder rather than onto a one-item chooser — the MVP does the same
    // (its ArenaDashboard passes `kind: "structured"` with no choice step).
    //
    // /arena/:id/feed-contests/create stays exactly as it was and is still the
    // canonical deep link: it owns the group fetch, the staff gate and the
    // redirect for anyone arriving by URL. Here the dashboard has already done
    // all three, so the wizard is handed its answers directly.
    const [contestCreationOpen, setContestCreationOpen] = useState(false);
    const contestCreationTriggerRef = useRef<HTMLButtonElement>(null);
    const contestCreationUnavailableId = useId();

    const loadSection = useCallback(
        (section: FeedContestSection, page: number) => {
            if (!arenaId) return;
            dispatch(
                fetchFeedContestsRequest({
                    section,
                    group_id: arenaId,
                    group_type: "arena",
                    page,
                    limit: 10,
                })
            );
        },
        [arenaId, dispatch]
    );

    useEffect(() => {
        if (!arenaId) return;
        // Archived is fetched for everyone — it is member-visible, and its section
        // only renders once the read comes back with rows.
        (["open", "locked", "finalized", "archived"] as const).forEach((section) =>
            loadSection(section, 1)
        );
        // /list/drafts answers 403 for anyone who is not an organizer.
        if (staff) loadSection("drafts", 1);
    }, [arenaId, staff, loadSection]);

    // `state.feedContest` is a single-tenant cache shared with the League hub, so
    // the rows are dropped on the way out — no other group may ever read them.
    useEffect(() => () => { dispatch(resetFeedContests()); }, [dispatch]);

    // The create gate, mirroring the server's arena branch exactly. Note
    // `pause_scheduled` is writable for ENTRIES but not for creating: the create
    // path demands `active` / `included_month` and answers 402 otherwise.
    //
    // hosting and unlock ride in on their own request, which is still in flight
    // for the first frames of this tab. Both gates below stay OPTIMISTIC until it
    // lands: an unloaded slot is "unknown", not "locked", or an owner watches the
    // create card claim their unlocked Arena needs unlocking before it corrects
    // itself. Nothing is lost by being wrong that way — the create page re-gates
    // and every rule is enforced server-side.
    const hostingLoaded = Boolean(hosting && unlock);
    const unlocked = unlock?.status === "unlocked";
    const hostingCreatable =
        hosting?.status === "active" || hosting?.status === "included_month";
    const activeLimit = hosting?.active_contest_limit ?? null;
    // open = scheduled + open, locked = locked + grading — together exactly the
    // server's ACTIVE_CONTEST_STATUSES, which is what the limit counts.
    const activeContestCount = sections.open.total + sections.locked.total;
    const atContestLimit =
        activeLimit !== null && activeContestCount >= activeLimit;

    const createDisabledReason =
        !staff || !hostingLoaded
            ? undefined
            : hosting?.status === "cleanup"
                ? "Cleanup mode keeps existing contests readable. Results continue automatically, and staff can still use contest deletion controls."
                : !unlocked
                    ? "Permanently unlock this Arena before creating contests."
                    : !hostingCreatable
                        ? "New contests are unavailable while the Arena plan is inactive."
                        : atContestLimit
                            ? "This Arena has reached its active contest limit."
                            : undefined;
    const createDisabledHint =
        staff && hostingLoaded && unlocked && hostingCreatable && atContestLimit
            ? "Delete an active contest or wait for automatic finalization to open another one."
            : undefined;

    // Entry is gated on the WRITABLE hosting set, which is wider than the create
    // one — a pause that has been scheduled but not taken effect still accepts
    // entries (`resolveFeedContestForEntry`).
    const hostingEnterable =
        !hostingLoaded ||
        (unlocked &&
            (hostingCreatable || hosting?.status === "pause_scheduled"));
    const canEnterContest = (contest: FeedContest) =>
        Boolean(hostingEnterable) &&
        // Arena staff are noncompetitive unless THIS contest opted them in.
        (!staff || contest.allow_staff_participation === true);

    return (
        <div>
            {/* The MVP's violet band above the hub — the same slot the League
                page fills with its sky one. It renders even for a member, so the
                accordion keeps its distance from the tab strip either way. */}
            {/* Bleeds to the viewport at every width (`sm:-mx-6` cancels the
                AppShell's `sm:px-6`) because it butts directly against the
                CommunityDetailChrome above, which is full-bleed too — the
                settings panel below does the same. An `sm:mx-0` here would step
                in 24px from the chrome's accent underline and read as a seam. */}
            {/* Now the MVP's header shape (MVP ArenaDashboard:286-303): an h2
                naming the surface with the Start-contest BUTTON inline at the
                right, in place of the full-width create card. The band keeps its
                `sm:-mx-6` bleed rather than the MVP's `sm:mx-0` — see the note
                above; this app's chrome above it is full-bleed. */}
            <header
                data-arena-contest-type-header
                className="-mx-5 border-b border-white/15 bg-violet-400/[0.055] bg-gradient-to-b from-black via-black/40 to-transparent px-5 py-4 sm:-mx-6 sm:px-6"
            >
                <div className="flex min-h-10 items-center justify-between gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-violet-100/80 lg:pl-6 lg:text-lg lg:font-extrabold">
                        Feed Contests
                    </h2>
                    {staff ? (
                        <div data-arena-contest-type-action className="shrink-0">
                            {/* MVP:1373-1402 verbatim in behaviour: the disabled
                                state is aria-disabled + title + an sr-only
                                description rather than a real `disabled`, so the
                                reason stays reachable to a screen reader and the
                                button stays focusable. */}
                            <button
                                ref={contestCreationTriggerRef}
                                type="button"
                                onClick={() => {
                                    if (createDisabledReason) return;
                                    setContestCreationOpen(true);
                                }}
                                aria-disabled={Boolean(createDisabledReason)}
                                aria-haspopup="dialog"
                                aria-expanded={contestCreationOpen}
                                aria-describedby={
                                    createDisabledReason
                                        ? contestCreationUnavailableId
                                        : undefined
                                }
                                title={createDisabledReason}
                                className={
                                    createDisabledReason
                                        ? `${COMMUNITY_DETAIL_ARENA_CONTEST_ACTION_CLASS_NAME} cursor-not-allowed opacity-40`
                                        : COMMUNITY_DETAIL_ARENA_CONTEST_ACTION_CLASS_NAME
                                }
                            >
                                Start contest
                            </button>
                            {createDisabledReason ? (
                                <span id={contestCreationUnavailableId} className="sr-only">
                                    {createDisabledReason}
                                    {createDisabledHint ? ` ${createDisabledHint}` : ""}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </header>

            <FeedContestSections
                title="Arena contests"
                sections={sections}
                organizer={staff}
                detailHref={(contestId) =>
                    `/arena/${arenaId}/feed-contests/${contestId}`
                }
                entryHref={(contestId) =>
                    `/arena/${arenaId}/feed-contests/${contestId}/entry`
                }
                entryWritable={canEnterContest}
                onLoadMore={(section) =>
                    loadSection(section, sections[section].page + 1)
                }
                emptyTitle="No Arena contests yet"
                emptyBody={
                    staff
                        ? "Start the first contest when the Arena plan permits it."
                        : "Arena staff have not made a contest available yet."
                }
                // The tier's participating-member ceiling, which is what an Arena
                // contest's capacity actually is. The MVP passes the same figure
                // through getArenaContestParticipantLimit.
                participantLimit={hosting?.participating_member_limit ?? null}
                accent="violet"
            />

            {/* MOUNTED, not linked — the wizard renders in the sidebar over the
                dashboard, as the MVP's does (ArenaDashboard:1431-1445).

                `createDisabledReason` still travels even though the trigger above
                is already disabled by it: the hosting read is deliberately
                optimistic while /hosting is in flight, so the drawer can be
                opened a moment before the block is known, and the wizard's own
                "Contest creation unavailable" panel is what states it.

                The drawer renders null until it is opened, so the wizard's lazy
                chunk is still only fetched on the first open — no outer gate
                needed, and the closing animation survives. */}
            {staff ? (
                <ContestCreationDrawer
                    open={contestCreationOpen}
                    onClose={() => setContestCreationOpen(false)}
                    returnFocusRef={contestCreationTriggerRef}
                    accent="arena"
                    content={{
                        kind: "builder",
                        label: "Arena Contest builder",
                        children: (
                            <FeedContestDrawerBuilder
                                groupId={arenaId}
                                groupType="arena"
                                contextName={arenaName}
                                backHref={`/arena/${arenaId}?tab=contests`}
                                detailHref={(contestId) =>
                                    `/arena/${arenaId}/feed-contests/${contestId}`
                                }
                                participantLimit={
                                    hosting?.participating_member_limit ?? null
                                }
                                createDisabledReason={createDisabledReason}
                                rewardContactEmail={rewardContactEmail}
                                isArenaOwner={role === "commissioner"}
                            />
                        ),
                    }}
                />
            ) : null}
        </div>
    );
};

/** Shared by the column header and every row, per the MVP (MVP:336). */
const ARENA_STANDINGS_GRID_CLASS_NAME =
    "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[4rem_minmax(0,1fr)_8rem_8rem]";

/* The MVP renders synchronously off mock state, so it has no loading branch and
 * StandingsCard has no `loading` prop — adding one would break its three other
 * consumers. The card is therefore mounted EMPTY and the skeleton takes the
 * `emptyState` slot, which keeps the MVP's DOM order intact: title bar, column
 * header, then the rows area. Only the row contents differ. */
const ArenaStandingsSkeleton = () => (
    <div aria-hidden className="animate-pulse">
        {Array.from({ length: 5 }).map((_, index) => (
            <div
                key={index}
                className={`grid min-h-[3.3125rem] items-center ${ARENA_STANDINGS_GRID_CLASS_NAME} ${STANDINGS_CARD_STYLES.fullPageRow} lg:px-10`}
            >
                <span className="h-3 w-6 rounded bg-amber-200/10" />
                <span className="flex items-center gap-2.5">
                    <span className="h-10 w-10 shrink-0 rounded-full bg-amber-200/10" />
                    <span className="h-3 w-28 rounded bg-amber-200/10" />
                </span>
                <span className="hidden justify-self-end sm:block">
                    <span className="block h-3 w-6 rounded bg-amber-200/10" />
                </span>
                <span className="h-3.5 w-12 justify-self-end rounded bg-amber-200/10" />
            </div>
        ))}
    </div>
);

/**
 * The Arena's Feed Contest Lifetime Standings, from
 * GET /group/lifetime-standings?type=feed.
 *
 * An Arena has ONE board — `contests` is League-only, so `type=fantasy` here is
 * a 400 rather than an empty board — which is why this surface has no flip
 * button and passes no `standingsAction` at its mount site.
 */
const ArenaLeaderboardPanel = ({ arenaId }: { arenaId: string }) => {
    const dispatch = useDispatch();
    const standingsState = useSelector(
        (state: RootState) => state.lifetimeStandings
    ) as LifetimeStandingsState;

    const slot = standingsState.feed;
    // Only trust rows once the slice is stamped for THIS Arena: the slot is
    // shared, and a previous group's board must not paint under this name.
    const isCurrent = standingsState.groupId === arenaId;
    const data = isCurrent ? slot.data : null;

    useEffect(() => {
        if (!arenaId) return;
        // Guarded rather than keyed on mount alone: the Feed remounts this panel
        // every time the Standings view is re-entered, and the board is already
        // in the store by then.
        if (isCurrent && (slot.loading || slot.data)) return;
        dispatch(
            fetchLifetimeStandingsRequest({
                group_id: arenaId,
                type: "feed",
                page: 1,
                limit: 100,
            })
        );
    }, [arenaId, dispatch, isCurrent, slot.loading, slot.data]);

    // Prefer the server's own wording once it has answered; the local copy only
    // keeps the title bar correct on the very first paint.
    const board = data?.board ?? getLifetimeStandingsBoardMeta("arena", "feed");
    const rows = filterArenaLifetimeStandings(data?.standings ?? []);
    const isLoading = slot.loading && !data;

    return (
        <div className="space-y-4">
            <StandingsCard
                rows={rows}
                getRowKey={(row) => row.user_id}
                columns={[
                    { key: "rank", label: "Rank" },
                    { key: "member", label: "Member" },
                    {
                        key: "contests",
                        label: "Contests",
                        className: "hidden text-right sm:block",
                    },
                    {
                        key: "points",
                        label: board.points_label,
                        className: "text-right",
                    },
                ]}
                gridClassName={ARENA_STANDINGS_GRID_CLASS_NAME}
                title={board.title}
                titleId={`arena-${arenaId}-feed-contest-lifetime-standings`}
                presentation="page"
                rootClassName="lg:-mt-px"
                titleBarClassName="lg:px-10"
                columnHeaderClassName="lg:px-10"
                emptyState={
                    isLoading ? (
                        <ArenaStandingsSkeleton />
                    ) : isCurrent && slot.error ? (
                        <div className="px-5 py-6 sm:px-4 lg:px-10">
                            <p role="alert" className="text-sm leading-6 text-rose-200">
                                {slot.error}
                            </p>
                        </div>
                    ) : (
                        <div className="px-5 py-6 sm:px-4 lg:px-10">
                            <p className="font-semibold text-white">No lifetime standings yet</p>
                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                Finalized eligible Arena Contest results will populate these standings.
                            </p>
                        </div>
                    )
                }
                renderRow={(row) => {
                    const handle = row.member.username ?? "member";
                    const chipRole = lifetimeStandingRoleChip(row);
                    return (
                        <Link
                            href={`/arena/${arenaId}/members/${row.user_id}`}
                            aria-label={`View @${handle}'s Arena member card`}
                            data-lifetime-standing-row
                            data-lifetime-standing-theme="gold"
                            className={`grid min-h-[3.3125rem] ${ARENA_STANDINGS_GRID_CLASS_NAME} ${STANDINGS_CARD_STYLES.fullPageRow} lg:px-10`}
                        >
                            <StandingRank rank={row.rank} />
                            <StandingIdentity
                                avatarUrl={generateProfileImageUrl(
                                    row.member.profile_image ?? undefined
                                )}
                                displayName={row.member.full_name ?? row.member.username ?? handle}
                                handle={handle}
                                rank={row.rank}
                                className="gap-2"
                            >
                                {chipRole ? (
                                    <span
                                        data-standing-role={chipRole}
                                        className="shrink-0 text-[10px] font-medium lowercase text-gray-400"
                                    >
                                        {chipRole}
                                    </span>
                                ) : null}
                            </StandingIdentity>
                            <span className="hidden text-right text-sm text-amber-100/45 sm:block">
                                {row.contest_count}
                            </span>
                            <StandingPrimaryMetric value={row.points} />
                        </Link>
                    );
                }}
            />

            <p
                data-standings-helper
                className="px-5 text-xs leading-5 text-amber-100/40 sm:px-4"
            >
                Lifetime standings include only finalized Arena Contest results. Ordinary
                posts and pending entries do not add Arena Points.
            </p>
        </div>
    );
};

const initialsFor = (value: string) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

/**
 * Avatar body shared by both member views. The MVP mock has no avatars and draws
 * initials; this app's member rows carry a real `profile_image`, so the photo
 * wins and the initials are the fallback.
 */
const MemberAvatar = ({
    profileImage,
    initials,
    size,
}: {
    profileImage?: string;
    initials: string;
    size: "card" | "list";
}) => {
    const src = generateProfileImageUrl(profileImage);
    if (!src) return <>{initials}</>;
    const dimension = size === "card" ? 56 : 40;
    return (
        <Image
            src={src}
            alt=""
            width={dimension}
            height={dimension}
            className="h-full w-full object-cover"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            unoptimized
        />
    );
};

/**
 * Only the two DESTRUCTIVE member actions confirm. Promote/demote used to be
 * here too; they now live in Settings > Arena managers, which applies them
 * directly — the roster there states the tier's manager limit beside every
 * button, so the change is already legible before it is made.
 */
type MemberActionKind = "remove" | "leave";

type PendingMemberAction = {
    kind: MemberActionKind;
    userId: string;
    handle: string;
};

// Copy for the confirm step. `detail` states the consequence the member card
// itself can't — what the person gains or loses once this lands.
const MEMBER_ACTION_COPY: Record<
    MemberActionKind,
    { title: (handle: string) => string; detail: string; confirmLabel: string; destructive: boolean }
> = {
    remove: {
        title: (handle) => `Remove @${handle} from this Arena?`,
        detail:
            "They lose access right away and free up a member slot. Their name stays visible in past contests and standings. They can rejoin with an invite.",
        confirmLabel: "Remove member",
        destructive: true,
    },
    leave: {
        title: () => "Leave this Arena?",
        detail:
            "Your slips in this Arena are deleted and cannot be recovered. You lose access immediately, and rejoining needs a new invite.",
        confirmLabel: "Leave Arena",
        destructive: true,
    },
};

/* ----------------------------------------------------------------------------
 * THE OWNER'S REVIEW QUEUE — ported from the MVP's join-requests section of
 * components/arenas/ArenaDashboard.tsx.
 *
 * Sits ABOVE the directory in the Members tab, and only for the permanent
 * owner: `PUT /group/arena/join-requests/respond` answers 403 for a manager,
 * and `GET /group/arena/join-requests` — where `pending_request_count` comes
 * from — withholds it from one too. A manager shown a queue they cannot clear
 * is worse than not showing it.
 *
 * Rendered only when there is something waiting. An Arena on `automatic` never
 * fills this, and one that has just been switched to `automatic` still can:
 * the queue is not amnestied by the policy change.
 * -------------------------------------------------------------------------- */
const ArenaJoinRequestsSection = ({
    arenaId,
    requests,
    canReview,
    writable,
    respondingUserId,
    onRespond,
}: {
    arenaId: string;
    requests: GroupJoinRequest[];
    canReview: boolean;
    writable: boolean;
    respondingUserId: string | null;
    onRespond: (userId: string, accept: boolean) => void;
}) => {
    if (requests.length === 0) return null;

    return (
        <section
            aria-labelledby={`arena-${arenaId}-join-requests`}
            className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-500/[0.06] p-4"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2
                        id={`arena-${arenaId}-join-requests`}
                        className="text-sm font-semibold text-white"
                    >
                        Join requests
                    </h2>
                    <p className="mt-1 text-xs normal-case leading-5 text-gray-400">
                        Approve or decline people waiting to enter this Arena.
                    </p>
                </div>
                <span className="rounded-full border border-violet-300/20 px-2.5 py-1 text-[10px] font-semibold text-violet-100">
                    {requests.length} pending
                </span>
            </div>

            <ul className="divide-y divide-white/10 border-y border-white/10">
                {requests.map((request) => {
                    const handle = request.profiles?.username ?? request.user_id;
                    const busy = respondingUserId === request.user_id;
                    return (
                        <li
                            key={request.id}
                            className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    @{handle}
                                </p>
                                <p className="mt-1 text-[11px] normal-case text-gray-500">
                                    Requested {formatDateTime(request.requested_at)}
                                    {request.source === "venue_qr" ? " · venue QR" : ""}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    disabled={!canReview || busy}
                                    onClick={() => onRespond(request.user_id, false)}
                                    className="min-h-9 rounded-lg border border-white/15 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Decline
                                </button>
                                <button
                                    type="button"
                                    disabled={!canReview || busy}
                                    onClick={() => onRespond(request.user_id, true)}
                                    className="min-h-9 rounded-lg bg-violet-100 px-3 text-[10px] font-semibold uppercase tracking-wide text-violet-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Approve
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {!writable ? (
                <p className="text-xs normal-case text-gray-500">
                    Requests stay pending while the Arena plan is inactive.
                </p>
            ) : null}
        </section>
    );
};

const ArenaMembersPanel = ({
    arenaId,
    memberships,
    currentUserId,
    currentRole,
    writable,
    hostingWritable,
    loading,
    onLeaveSuccess,
}: {
    /** Route param, required — see ArenaFeedPanel's arenaId note. */
    arenaId: string;
    memberships: Members | null;
    currentUserId: string | undefined;
    currentRole: string;
    writable: boolean;
    /**
     * Hosting writability, which is NOT what `writable` means here — that one is
     * the owner check this call site has always passed.
     *
     * Approving a request INSERTS a membership, and the server refuses that with
     * a 402 while hosting is paused or winding down. So the queue stays visible
     * and readable, and only the two buttons go quiet.
     */
    hostingWritable: boolean;
    /**
     * The members fetch is separate from the arena's, so an empty list is
     * ambiguous without this: "nobody matched" and "not loaded yet" look
     * identical, and the empty copy would flash on every open.
     */
    loading: boolean;
    onLeaveSuccess: () => void;
}) => {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<MemberDirectoryView>("cards");
    const { setToast } = useToast();
    const dispatch = useDispatch();
    const {
        memberActionLoading,
        memberActionUserId,
        memberActionError,
        memberActionMessage,
        leaveArenaLoading,
        arenaLeft,
        leaveArenaError,
        leaveArenaMessage,
        joinRequests,
        joinRequestsForId,
        respondingUserId,
        joinRequestActionError,
        joinRequestActionMessage,
    } = useSelector((state: RootState) => state.arena);
    const actionBusy = memberActionLoading || leaveArenaLoading;
    const [pendingMemberAction, setPendingMemberAction] =
        useState<PendingMemberAction | null>(null);

    // Staff first, then members — the directory's job is to show who runs the
    // Arena, and role is the only ordering the list endpoint does not impose.
    // The search box used to be rendered but never read; it filters now.
    const visibleMemberships = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const rank: Record<string, number> = { commissioner: 0, manager: 1, member: 2 };
        return (memberships ?? [])
            .filter((membership) =>
                !normalizedSearch
                    ? true
                    : (membership.profiles?.username ?? "")
                        .toLowerCase()
                        .includes(normalizedSearch)
            )
            .sort(
                (left, right) =>
                    (rank[left.role ?? "member"] ?? 2) - (rank[right.role ?? "member"] ?? 2)
            );
    }, [memberships, search]);

    useEffect(() => {
        if (!memberActionError && !memberActionMessage) return;
        setToast({
            id: Date.now(),
            type: memberActionError ? "error" : "success",
            message: memberActionError ?? memberActionMessage ?? "",
            duration: 3000,
        });
        setPendingMemberAction(null);
        dispatch(clearArenaMemberActionMessage());
    }, [memberActionError, memberActionMessage, dispatch, setToast]);

    /**
     * The queue's own outcomes. Toasted rather than shown inline because the
     * answered row leaves the list on success — there would be nothing left to
     * attach a message to. A 403 `full` is the one that matters: the owner said
     * yes, the room is out of seats, and the saga puts the row back.
     */
    useEffect(() => {
        if (!joinRequestActionError && !joinRequestActionMessage) return;
        setToast({
            id: Date.now(),
            type: joinRequestActionError ? "error" : "success",
            message: joinRequestActionError ?? joinRequestActionMessage ?? "",
            duration: 4000,
        });
        dispatch(clearArenaJoinRequestActionMessage());
    }, [joinRequestActionError, joinRequestActionMessage, dispatch, setToast]);

    useEffect(() => {
        if (arenaLeft) {
            setToast({
                id: Date.now(),
                type: "success",
                message: leaveArenaMessage ?? "You have left this Arena.",
                duration: 4000,
            });
            setPendingMemberAction(null);
            dispatch(clearLeaveArenaState());
            onLeaveSuccess();
            return;
        }
        if (leaveArenaError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: leaveArenaError,
                duration: 4000,
            });
            setPendingMemberAction(null);
            dispatch(clearLeaveArenaState());
        }
    }, [
        arenaLeft,
        leaveArenaError,
        leaveArenaMessage,
        dispatch,
        setToast,
        onLeaveSuccess,
    ]);

    useEffect(() => {
        if (!pendingMemberAction) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !actionBusy) {
                setPendingMemberAction(null);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [pendingMemberAction, actionBusy]);

    if (!arenaId || !currentUserId) return null;

    const isOwner = currentRole === "commissioner";

    const confirmMemberAction = () => {
        if (!pendingMemberAction) return;
        const { kind, userId } = pendingMemberAction;

        if (kind === "leave") {
            dispatch(leaveArenaRequest({ arena_id: arenaId }));
            return;
        }

        dispatch(
            removeArenaMemberRequest({
                arena_id: arenaId,
                user_id: userId,
                page: 1,
                // The window this screen actually loaded — re-reading a narrower
                // one would shrink the roster out from under the directory.
                limit: MANAGER_ROSTER_LIMIT,
            })
        );
    };

    // The Arena member CARD, not the global profile: everything on it is scoped
    // to this Arena. The global profile is one link away from the card's header.
    const memberHref = (membership: Members[number]) =>
        membership.user_id ? `/arena/${arenaId}/members/${membership.user_id}` : "#";

    /**
     * One place deciding what a viewer may do to a row, so the Cards and List
     * views cannot drift apart on permissions. These rules are this app's, NOT
     * the MVP mock's — only the owner moderates here, where the MVP also lets a
     * manager remove members.
     *
     * Removal is the ONLY per-row action, matching the MVP: promoting and
     * demoting managers moved to Settings > Arena managers, where the roster is
     * shown against the tier's manager limit. A tile has no room to state that
     * limit, so a "Make manager" button here could only fail after the fact.
     */
    const memberPermissions = (membership: Members[number]) => {
        const handle = membership?.profiles?.username ?? "member";
        const isSelf = membership.user_id === currentUserId;
        return {
            handle,
            canRemove:
                isOwner && writable && membership.role !== "commissioner" && !isSelf,
            isBusy: memberActionUserId === membership.user_id,
            request: (kind: MemberActionKind) => {
                if (!membership.user_id) return;
                setPendingMemberAction({ kind, userId: membership.user_id, handle });
            },
        };
    };

    return (
        <div className={memberDirectoryPanelClassName}>
            {/* Owner only, and scoped by id: this list renders over the Members
                tab, and the previous Arena's queue appearing on it is a bug that
                only shows when navigating between two of them. */}
            {isOwner ? (
                <ArenaJoinRequestsSection
                    arenaId={arenaId}
                    requests={joinRequestsForId === arenaId ? joinRequests : []}
                    canReview={isOwner && hostingWritable}
                    writable={hostingWritable}
                    respondingUserId={respondingUserId}
                    onRespond={(userId, accept) =>
                        dispatch(
                            respondArenaJoinRequestRequest({
                                arena_id: arenaId,
                                user_id: userId,
                                accept,
                            })
                        )
                    }
                />
            ) : null}

            <div className="grid h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded-xl border border-white/10 bg-black/60 p-1">
                <MemberDirectorySearch
                    search={search}
                    onSearchChange={setSearch}
                    accent="arena"
                    searchLabel="Search Arena members"
                    embedded
                />
                <MemberDirectoryViewToggle view={view} onViewChange={setView} embedded />
            </div>

            {loading && visibleMemberships.length === 0 ? (
                <MembersSkeleton />
            ) : view === "cards" ? (
                <div
                    role="list"
                    aria-label="Arena member cards"
                    className={memberDirectoryGridClassName}
                >
                    {visibleMemberships.map((membership) => {
                        const { handle, canRemove, isBusy, request } =
                            memberPermissions(membership);

                        return (
                            <article
                                key={membership.id}
                                role="listitem"
                                className={getMemberDirectoryCardClassName("arena")}
                            >
                                {canRemove ? (
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => request("remove")}
                                        aria-label={`Remove @${handle}`}
                                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-gray-300 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        X
                                    </button>
                                ) : null}

                                <div className="flex flex-1 flex-col items-center gap-3 pt-3">
                                    <Link
                                        href={memberHref(membership)}
                                        aria-label={`View @${handle}'s Arena member card`}
                                        className={getMemberDirectoryAvatarClassName("arena", "card")}
                                    >
                                        <MemberAvatar
                                            profileImage={membership.profiles?.profile_image}
                                            initials={initialsFor(handle)}
                                            size="card"
                                        />
                                    </Link>
                                    <div className="min-w-0 max-w-full text-center">
                                        <p className="truncate text-sm font-semibold text-white">
                                            @{handle}
                                        </p>
                                        <p
                                            className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${membership.role === "member" ? "text-gray-500" : "text-amber-200"
                                                }`}
                                        >
                                            {roleLabel(membership.role ?? "member")}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <ul aria-label="Arena members list" className={memberDirectoryListClassName}>
                    {visibleMemberships.map((membership) => {
                        const { handle, canRemove, isBusy, request } =
                            memberPermissions(membership);

                        return (
                            <li
                                key={membership.id}
                                className="flex min-h-16 items-center gap-3 py-2.5"
                            >
                                <Link
                                    href={memberHref(membership)}
                                    aria-label={`View @${handle}'s Arena member card`}
                                    className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                                >
                                    <span
                                        aria-hidden
                                        className={getMemberDirectoryAvatarClassName("arena", "list")}
                                    >
                                        <MemberAvatar
                                            profileImage={membership.profiles?.profile_image}
                                            initials={initialsFor(handle)}
                                            size="list"
                                        />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-white">
                                            @{handle}
                                        </span>
                                        <span
                                            className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.16em] ${membership.role === "member"
                                                ? "text-gray-500"
                                                : "text-amber-200"
                                                }`}
                                        >
                                            {roleLabel(membership.role ?? "member")}
                                        </span>
                                    </span>
                                </Link>

                                <div className="flex shrink-0 items-center gap-1">
                                    {canRemove ? (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => request("remove")}
                                            aria-label={`Remove @${handle}`}
                                            className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold text-gray-500 transition hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            ×
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!loading && visibleMemberships.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                    No members match your search.
                </p>
            ) : null}

            {/* Same slot as the MVP: after the roster and its empty state, before
                Leave Arena. Renders nothing for a plain member — the component
                gates itself on the role rather than making every call site
                repeat the check. */}
            <ArenaMemberContactsPanel arenaId={arenaId} viewerRole={currentRole} />

            {!isOwner ? (
                <section className="border-t border-white/10 pt-5">
                    <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                            setPendingMemberAction({
                                kind: "leave",
                                userId: currentUserId,
                                handle: "",
                            })
                        }
                        className="rounded-lg border border-red-300/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Leave Arena
                    </button>
                </section>
            ) : null}

            {pendingMemberAction ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="arena-member-action-title"
                    // Backdrop dismiss, but not while the write is in flight.
                    onClick={() => {
                        if (!actionBusy) setPendingMemberAction(null);
                    }}
                >
                    <div
                        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/15 bg-black/90 p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-1">
                            <p
                                className={`text-xs font-semibold uppercase tracking-[0.18em] ${MEMBER_ACTION_COPY[pendingMemberAction.kind].destructive
                                    ? "text-red-400"
                                    : "text-amber-200"
                                    }`}
                            >
                                are you sure?
                            </p>
                            <p id="arena-member-action-title" className="text-sm text-gray-200">
                                {MEMBER_ACTION_COPY[pendingMemberAction.kind].title(
                                    pendingMemberAction.handle
                                )}
                            </p>
                        </div>
                        <p className="text-[11px] leading-5 text-gray-400">
                            {MEMBER_ACTION_COPY[pendingMemberAction.kind].detail}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingMemberAction(null)}
                                disabled={actionBusy}
                                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-200 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmMemberAction}
                                disabled={actionBusy}
                                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-60 ${MEMBER_ACTION_COPY[pendingMemberAction.kind].destructive
                                    ? "border border-red-300/70 bg-red-500/15 text-red-50 hover:border-red-200 hover:bg-red-500/25"
                                    : "border border-amber-300/70 bg-amber-500/15 text-amber-50 hover:border-amber-200 hover:bg-amber-500/25"
                                    }`}
                            >
                                {actionBusy
                                    ? "working..."
                                    : MEMBER_ACTION_COPY[pendingMemberAction.kind].confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Last, as in the MVP: it explains the roster above rather than
                introducing it, and it must not push the search box down. */}
            <p className="text-xs text-gray-500">
                Owners and managers use staff allowances and do not consume member capacity.
            </p>
        </div>
    );
};

const ArenaSettingsPanel = ({
    arena,
    unlock,
    arenaId,
    actorId,
    role,
    hosting,
    // actions,
    // onError,
    onDeleteSuccess,
}: {
    arena: Group | null,
    unlock: ArenaUnlockDetails | null,
    /** Route param, required — see ArenaFeedPanel's arenaId note. */
    arenaId: string;
    actorId: string | undefined;
    role: string;
    hosting: ArenaHostingDetails | null;
    // actions: ArenaShellActions;
    // onError: (message: string) => void;
    onDeleteSuccess: () => void;
}) => {
    const [name, setName] = useState(arena?.name ?? "");
    const [description, setDescription] = useState(arena?.description ?? "");
    /* The inline "Arena information saved." line, on the same echo contract the
     * two panels below use: it appears only once the ARENA RECORD comes back
     * carrying what was submitted, so a refused write never claims a save. */
    const [submittedIdentity, setSubmittedIdentity] = useState(false);
    /* Seed the two identity fields ONCE per Arena. `arena` is a fresh reference
     * on every group re-read — members, join requests, the post-save re-read —
     * and without the latch each one would wipe whatever the owner had typed. */
    const initializedArenaIdRef = useRef<string | null>(null);
    const [timeZone, setTimeZone] = useState("America/New_York");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteOtp, setDeleteOtp] = useState("");
    const [unlockOpen, setUnlockOpen] = useState(false);
    const unlockButtonRef = useRef<HTMLButtonElement>(null);
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const {
        unlockLoading,
        unlockError,
        unlockMessage,
        transferError,
        transferMessage,
        updateLoading,
        updateError,
        updateMessage,
        hostingActionError,
        hostingActionMessage,
        arenaDeleteLoading,
        arenaDeleteOtpSent,
        arenaDeleted,
        arenaDeleteError,
        arenaDeleteMessage,
        joinPolicyLoading,
        joinPolicyError,
        joinPolicyMessage,
        pendingJoinRequestCount,
    } = useSelector((state: RootState) => state.arena);
    const unlockOffer = getArenaUnlockOffer();

    useEffect(() => {
        if (!updateError && !updateMessage) return;
        setToast({
            id: Date.now(),
            type: updateError ? "error" : "success",
            message: updateError ?? updateMessage ?? "",
            duration: 4000,
        });
        dispatch(clearUpdateArenaDetailsMessage());
    }, [updateError, updateMessage, dispatch, setToast]);

    // The join-policy write reports the same way the identity one does. The
    // panel's own "saved" line waits for the re-read record, so this is the only
    // place a FAILURE is surfaced.
    useEffect(() => {
        if (!joinPolicyError && !joinPolicyMessage) return;
        setToast({
            id: Date.now(),
            type: joinPolicyError ? "error" : "success",
            message: joinPolicyError ?? joinPolicyMessage ?? "",
            duration: 4000,
        });
        dispatch(clearArenaJoinPolicyMessage());
    }, [joinPolicyError, joinPolicyMessage, dispatch, setToast]);

    useEffect(() => {
        if (!arena?.id || initializedArenaIdRef.current === arena.id) return;
        initializedArenaIdRef.current = arena.id;
        setName(arena.name);
        setDescription(arena?.description ?? "");
        setSubmittedIdentity(false);
    }, [arena]);

    // Every transfer write settles the pending request in the slice itself, so
    // this only surfaces the outcome.
    useEffect(() => {
        if (!transferError && !transferMessage) return;
        setToast({
            id: Date.now(),
            type: transferError ? "error" : "success",
            message: transferError ?? transferMessage ?? "",
            duration: 4000,
        });
        dispatch(clearArenaOwnershipTransferMessage());
    }, [transferError, transferMessage, dispatch, setToast]);

    // Tier and pause writes are issued from /app-settings/plan/arena/[arenaId]
    // now, not from this tab — but one can still settle while the organizer is
    // back here, so its outcome is surfaced rather than dropped. No tier-dialog
    // guard any more: this screen no longer owns a dialog that would report it.
    useEffect(() => {
        if (!hostingActionError && !hostingActionMessage) return;
        setToast({
            id: Date.now(),
            type: hostingActionError ? "error" : "success",
            message: hostingActionError ?? hostingActionMessage ?? "",
            duration: 5000,
        });
        dispatch(clearArenaHostingActionMessage());
    }, [hostingActionError, hostingActionMessage, dispatch, setToast]);

    /*
     * Delete outcome — BOTH terminal states, and each reported exactly once.
     *
     * The once-only guards are not defensive padding: `setToast` is a fresh
     * closure out of useToast on every render and `onDeleteSuccess` is an inline
     * arrow from the parent, so this effect re-runs on every single render of the
     * panel. Without the refs a confirm-step error would re-toast on every
     * keystroke in the dialog, and the success branch could fire its navigation
     * twice.
     *
     * The FAILURE branch used to be gated on `!arenaDeleteOtpSent`, which meant a
     * rejected code — by far the likelier failure — reported nowhere except
     * inline in a dialog the owner may have scrolled away from. Both steps toast
     * now; the confirm-step error is deliberately left in the slice as well, so
     * the dialog keeps showing it beside the field that has to be corrected.
     */
    const deleteSuccessReportedRef = useRef(false);
    const reportedDeleteErrorRef = useRef<string | null>(null);

    useEffect(() => {
        if (arenaDeleted) {
            if (deleteSuccessReportedRef.current) return;
            deleteSuccessReportedRef.current = true;
            setToast({
                id: Date.now(),
                type: "success",
                message: arenaDeleteMessage ?? "Arena permanently deleted.",
                duration: 5000,
            });
            dispatch(clearArenaDeleteState());
            // The Arena no longer exists, so the page has to leave before
            // anything tries to re-read it.
            onDeleteSuccess();
            return;
        }
        if (!arenaDeleteError) {
            reportedDeleteErrorRef.current = null;
            return;
        }
        if (reportedDeleteErrorRef.current === arenaDeleteError) return;
        reportedDeleteErrorRef.current = arenaDeleteError;
        setToast({
            id: Date.now(),
            type: "error",
            message: arenaDeleteError,
            duration: 4000,
        });
        // Clear ONLY the initiate-step failure. While the dialog is open its
        // inline error is the message next to the code field, and clearing the
        // slice here would blank it the instant the toast appeared.
        if (!arenaDeleteOtpSent) dispatch(clearArenaDeleteState());
    }, [
        arenaDeleted,
        arenaDeleteError,
        arenaDeleteOtpSent,
        arenaDeleteMessage,
        dispatch,
        setToast,
        onDeleteSuccess,
    ]);

    if (!arena || !unlock || !arenaId || !actorId) return null;

    const isOwner = role === "commissioner";
    // PUT /group/arena/details admits the owner and managers, and does not gate on
    // hosting status the way the contest/billing endpoints do.
    const identityWritable = isOwner || role === "manager";


    // Only the fields that actually changed are sent: the endpoint treats an
    // absent key as "leave alone" and null as "clear".
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const nameChanged = trimmedName !== (arena.name ?? "");
    const descriptionChanged = trimmedDescription !== (arena.description ?? "");
    const hasIdentityChanges = nameChanged || descriptionChanged;

    const nameError =
        trimmedName.length < ARENA_NAME_MIN || trimmedName.length > ARENA_NAME_MAX
            ? `Arena name must be ${ARENA_NAME_MIN}–${ARENA_NAME_MAX} characters.`
            : null;
    const descriptionError =
        trimmedDescription.length > ARENA_DESCRIPTION_MAX
            ? `Description must be ${ARENA_DESCRIPTION_MAX} characters or fewer.`
            : null;
    // Length and format are re-checked server-side; this only avoids a round-trip
    // for the one mistake people actually make.
    const identityError = nameError ?? descriptionError;
    // The saved line keys off the STORED record: once the re-read lands, there
    // is nothing left to write, and only then has the save actually happened.
    const identitySaved = submittedIdentity && !hasIdentityChanges;

    const timeZoneOptions = TIME_ZONE_OPTIONS.includes(timeZone)
        ? TIME_ZONE_OPTIONS
        : [timeZone, ...TIME_ZONE_OPTIONS];
    // const transferCandidates = getActiveArenaMemberships(state.community, arenaId).filter(
    //     (membership) => membership.userId !== actorId
    // );
    // const userById = new Map(state.users.map((user) => [user.id, user]));
    // const pendingOwnershipTransfer = state.community.arenaOwnershipTransfers.find(
    //     (transfer) =>
    //         transfer.arenaId === arenaId &&
    //         transfer.status === "pending" &&
    //         (!transfer.expiresAt || Date.parse(transfer.expiresAt) > Date.now())
    // );
    // const pendingRecipient = pendingOwnershipTransfer
    //     ? userById.get(pendingOwnershipTransfer.toUserId)
    //     : null;

    // Confirm step is driven by redux: the dialog reflects unlockLoading/unlockError and
    // flips to "success" once the unlock record itself comes back unlocked.
    const unlockDialogStatus: PurchaseFlowStatus = unlockLoading
        ? "submitting"
        : unlockError
            ? "error"
            : unlock.status === "unlocked"
                ? "success"
                : "idle";

    const handleOpenUnlockDialog = () => {
        dispatch(clearUnlockArenaMessage());
        setUnlockOpen(true);
    };

    const handleCloseUnlockDialog = () => {
        setUnlockOpen(false);
        dispatch(clearUnlockArenaMessage());
    };

    const handleUnlockArena = () => {
        dispatch(unlockArenaRequest({ arena_id: arenaId }));
    };
    // Deferred: POST /group/arena/advance-period does not exist yet. When it does,
    // it needs a request/success/failure trio in arenaSlice + a handler in
    // arenaSaga (same shape as the three hosting actions above), then uncomment
    // this and its button below.
    // const handleAdvancePeriod = () => {
    //     dispatch(advanceArenaPeriodRequest({ arena_id: arenaId }));
    // };

    const handleSave = () => {
        if (!hasIdentityChanges || identityError) return;

        const payload: UpdateArenaDetailsPayload = { arena_id: arenaId };
        if (nameChanged) payload.name = trimmedName;
        // Blank means "clear it", which the endpoint expects as an explicit null.
        if (descriptionChanged) payload.description = trimmedDescription || null;

        setSubmittedIdentity(true);
        dispatch(updateArenaDetailsRequest(payload));
    };

    // Step 1 — the typed-name check is client-side only; the server then emails a
    // 4-digit code, which is what actually authorises the delete.
    const handleDelete = () => {
        if (deleteConfirmation !== arena.name) return;
        dispatch(initiateArenaDeleteRequest({ arena_id: arenaId }));
    };

    // Step 2 — spend the emailed code. The in-flight guard is not only the
    // button's job: the code is SINGLE USE, so a second submit is guaranteed to
    // come back rejected and would replace the real outcome with a failure.
    const handleConfirmDelete = () => {
        if (arenaDeleteLoading || !deleteOtp.trim()) return;
        dispatch(confirmArenaDeleteRequest({ arena_id: arenaId, otp: deleteOtp.trim() }));
    };

    // Refused mid-flight for the same reason the dialog refuses Escape: the
    // delete is already on its way, and clearing the slice here would throw away
    // the receipt it is about to land.
    const handleCloseDeleteDialog = () => {
        if (arenaDeleteLoading) return;
        setDeleteOtp("");
        dispatch(clearArenaDeleteState());
    };


    return (
        /* THE SETTINGS SCREEN — the MVP's shared settings chrome, ported in
           components/settings/SettingsUI.tsx. Full-bleed sections ruled by a
           hairline rather than a stack of bordered cards, each re-insetting its
           own body back onto the page gutter.

           The rule now belongs to each SECTION (`SettingsSection`,
           `SettingsDisclosure` and the venue panel all draw their own
           `border-b`), so this container must NOT carry `divide-y` as it used
           to — that would draw the hairline twice wherever one lands. */
        <SettingsPage className="pt-1" data-settings-page="arena">
            <SettingsSection
                title="Arena information"
                description="Update the name and description members see across this Arena."
                bodyClassName="space-y-5"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className={`block ${settingsFieldLabelClassName}`}>
                        Arena name
                        <input
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setSubmittedIdentity(false);
                            }}
                            disabled={!identityWritable || updateLoading}
                            maxLength={ARENA_NAME_MAX}
                            aria-invalid={Boolean(nameError)}
                            className={`${settingsInputClassName} mt-2 bg-black/60 normal-case`}
                        />
                        {identityWritable && nameError ? (
                            <span className="mt-1 block text-[10px] normal-case text-amber-200">
                                {nameError}
                            </span>
                        ) : null}
                    </label>
                    <label className={`block ${settingsFieldLabelClassName}`}>
                        Arena timezone
                        <select
                            value={timeZone}
                            onChange={(event) => setTimeZone(event.target.value)}
                            disabled
                            className={`${settingsInputClassName} mt-2 bg-black/60 normal-case`}
                        >
                            {timeZoneOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {/* Display only by design — there is no timezone column and
                            PUT /group/arena/details does not accept one. Kept disabled so
                            a change can't look saved when nothing persists it. */}
                        <span className="mt-1 block text-[10px] normal-case text-gray-500">
                            Arena times use this timezone. It is not configurable.
                        </span>
                    </label>
                </div>

                <label className={`block ${settingsFieldLabelClassName}`}>
                    Description
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(event) => {
                            setDescription(event.target.value);
                            setSubmittedIdentity(false);
                        }}
                        disabled={!identityWritable || updateLoading}
                        maxLength={ARENA_DESCRIPTION_MAX}
                        aria-invalid={Boolean(descriptionError)}
                        className={`${settingsInputClassName} mt-2 min-h-28 resize-none bg-black/60 normal-case`}
                    />
                    {identityWritable ? (
                        <span className="mt-1 block text-[10px] normal-case text-gray-500">
                            {trimmedDescription.length}/{ARENA_DESCRIPTION_MAX} · leave blank to clear
                        </span>
                    ) : null}
                </label>

                {identityWritable ? (
                    <SettingsActionBar>
                        <SettingsStatus tone="success" className="border-0 bg-transparent px-0 py-0">
                            {identitySaved ? "Arena information saved." : null}
                        </SettingsStatus>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!hasIdentityChanges || Boolean(identityError) || updateLoading}
                            className={settingsPrimaryButtonClassName}
                        >
                            {updateLoading ? "Saving…" : "Save Arena information"}
                        </button>
                    </SettingsActionBar>
                ) : (
                    <p className="text-xs text-gray-500">
                        {isOwner
                            ? "Arena identity is read-only while the Arena plan is inactive."
                            : "Only the Arena owner can change Arena identity settings."}
                    </p>
                )}
            </SettingsSection>

            {/* HOW MEMBERS JOIN — owner only, and only once setup has happened.
                A NULL join_policy means the wizard was never finished, and
                `PUT /group/arena/join-policy` refuses that case with a 409: it
                changes a choice, it does not make the first one. The owner is
                already being redirected to /arena/:id/setup in that state, so
                there is nothing to render here. */}
            {isOwner && arena.join_policy ? (
                <ArenaJoinPolicySettings
                    joinPolicy={arena.join_policy}
                    pendingRequestCount={pendingJoinRequestCount}
                    saving={joinPolicyLoading}
                    onSave={(joinPolicy) =>
                        dispatch(
                            updateArenaJoinPolicyRequest({ arena_id: arenaId, join_policy: joinPolicy })
                        )
                    }
                />
            ) : null}

            {/* THE REWARD INBOX — PERMANENT OWNER ONLY, and rendered for nobody
                else. `PUT /group/arena/details` answers 403 for a manager who
                sends the field, and `GET /group/:id` deletes the key on the way
                out for anyone but `created_by` — so a manager could neither read
                the current value nor write a new one, and showing them an empty
                box would read as "no inbox configured" when there may well be
                one.

                Unlike Arena identity, this is NOT gated on hosting state: a
                paused Arena still owes prizes on contests it already published,
                and the address winners claim them at has to stay correctable. */}
            {isOwner ? (
                <ArenaRewardContactSettings
                    rewardContactEmail={arena.reward_contact_email}
                    saving={updateLoading}
                    onSave={(email) =>
                        dispatch(
                            updateArenaDetailsRequest({
                                arena_id: arenaId,
                                reward_contact_email: email,
                            })
                        )
                    }
                />
            ) : null}

            {/* ARENA MANAGERS — PERMANENT-OWNER only.
                Now an INVITATION, not an instant promotion: POST
                /group/manager-invitation answers 202 with a pending row and the
                member's role does not move until they accept from
                Notifications. Same panel the League settings tab mounts —
                the endpoints behind it are one type-agnostic surface, so the
                seat limit is the only thing that differs and it comes from the
                server.

                It is a SettingsDisclosure of its own now, so it brings its own
                rule and padding and needs no layout class from here. */}
            {isOwner ? (
                <GroupManagerSettings
                    groupId={arenaId}
                    groupType="arena"
                    currentUserId={actorId}
                />
            ) : null}

            {/* VENUE CHECK-IN — the MVP puts it between Arena identity and the
                hosting panel, and it owns its own `/group/venue/detail` read. */}
            <ArenaVenueCheckInPanel
                arenaId={arenaId}
                arenaName={arena?.name ?? "Arena"}
                role={role}
                // The MVP's gate: a not-yet-started Arena may still be set up, but a
                // paused or lapsed one is read-only. Disable is exempt server-side.
                configurationWritable={
                    !hosting ||
                    hosting.status === "not_started" ||
                    hosting.status === "active" ||
                    hosting.status === "included_month" ||
                    hosting.status === "pause_scheduled"
                }
            />

            {/* ARENA PLAN AND BILLING — the MVP's compact summary.
                Tier selection, period controls and pause/resume are NOT repeated
                here: /app-settings/plan/arena/[arenaId] owns them, and the button
                below is the way in. The permanent-unlock CTA stays, because a
                locked Arena has no other entry point to it. */}
            <SettingsSection
                title="Arena plan and billing"
                description="Arena plans are billed separately from personal League Pro."
                bodyClassName="space-y-4"
            >
                <div className="flex flex-wrap items-start justify-end gap-3">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                        {unlock.status === "unlocked" ? "Permanently unlocked" : "Locked"}
                    </span>
                </div>

                {unlock.source === "legacy_grandfathered" ? (
                    <p className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-xs leading-5 text-violet-100">
                        This legacy Arena is permanently grandfathered. Its migration month is
                        included, and no {unlockOffer.priceLabel} unlock charge was applied.
                    </p>
                ) : null}

                {/* An unlocked Arena without a hosting row yet has nothing to
                    summarise, so the banner is skipped rather than faked. */}
                {unlock.status === "unlocked" && hosting ? (
                    <ArenaStatusBanner hosting={hosting} />
                ) : unlock.status === "unlocked" ? null : (
                    <div className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3">
                        <p className="text-sm leading-6 text-violet-100">
                            This Arena still needs its permanent unlock. One month of{" "}
                            {ARENA_INCLUDED_TIER_LABEL} hosting is included with the{" "}
                            {unlockOffer.priceLabel} unlock, and the unlock stays with the Arena
                            through pause, reactivation, and ownership transfer.
                        </p>
                        {isOwner ? (
                            <button
                                ref={unlockButtonRef}
                                type="button"
                                onClick={handleOpenUnlockDialog}
                                disabled={unlockLoading}
                                className={`${settingsPrimaryButtonClassName} mt-4`}
                            >
                                {`Unlock Arena · ${unlockOffer.priceLabel} once`}
                            </button>
                        ) : (
                            <p className="mt-3 text-xs font-semibold text-gray-500">
                                Only the Arena owner can purchase the permanent unlock.
                            </p>
                        )}
                    </div>
                )}

                {isOwner ? (
                    <div className="flex justify-end">
                        <Link
                            href={`/app-settings/plan/arena/${arenaId}`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/35 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"
                        >
                            Manage Arena plan and billing
                        </Link>
                    </div>
                ) : (
                    <p className="text-xs leading-5 text-gray-500">
                        Only the Arena owner can view receipts or change hosting. Managers retain
                        operational access here.
                    </p>
                )}

                {/* Simulated-purchase confirm step, driven straight off the redux
                    unlock state. Rendered OUTSIDE the "locked" branch so the success
                    screen survives the unlock flipping this Arena to unlocked. */}
                <PurchaseFlowDialog
                    open={unlockOpen}
                    kind="arena_unlock"
                    eyebrow="simulated billing"
                    title="Unlock this Arena permanently"
                    description={`${unlockOffer.summary} The unlock belongs to this Arena, survives ownership transfer, and preserves its identity and history.`}
                    offer={{
                        name: unlockOffer.name,
                        priceLabel: unlockOffer.priceLabel,
                        cadenceLabel: unlockOffer.cadenceLabel,
                    }}
                    confirmLabel={`Confirm simulated ${unlockOffer.priceLabel} unlock`}
                    submittingLabel="Processing simulated unlock…"
                    status={unlockDialogStatus}
                    errorMessage={unlockError}
                    successTitle="Arena permanently unlocked"
                    successMessage={
                        unlockMessage ??
                        `Permanent Arena Unlock is now attached to this Arena. Its one included ${ARENA_INCLUDED_TIER_LABEL} month has started.`
                    }
                    onConfirm={handleUnlockArena}
                    onClose={handleCloseUnlockDialog}
                    returnFocusRef={unlockButtonRef}
                />
            </SettingsSection>

            {/* Collapsed by default, as in the MVP: deletion is the one action on
                this screen that should take a deliberate extra click to reach. */}
            {isOwner ? (
                <SettingsDisclosure summary="Danger zone" summaryDetail="Delete Arena">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-base font-semibold text-red-200">
                                Permanently delete Arena
                            </h2>
                            <p className="mt-1 text-xs leading-5 text-gray-500">
                                Pausing is reversible and preserves everything. Deletion is a separate,
                                permanent action: contests, standings, slips, messages and membership
                                are all removed. Type the exact Arena name to continue.
                            </p>
                            {unlock.status === "unlocked" ? (
                                <p className="mt-2 rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-[11px] leading-5 text-red-100">
                                    This Arena&apos;s permanent unlock is destroyed with it and is not
                                    refunded or transferable. Pausing keeps the unlock intact.
                                </p>
                            ) : null}
                        </div>
                        <input
                            aria-label="Exact Arena name confirmation"
                            value={deleteConfirmation}
                            onChange={(event) => setDeleteConfirmation(event.target.value)}
                            placeholder={arena.name}
                            disabled={arenaDeleteLoading}
                            className={`${settingsInputClassName} border-red-300/20 bg-black/60`}
                        />
                        <SettingsActionBar>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleteConfirmation !== arena.name || arenaDeleteLoading}
                                className={settingsDangerButtonClassName}
                            >
                                {arenaDeleteLoading && !arenaDeleteOtpSent
                                    ? "Sending code…"
                                    : "Delete Arena permanently"}
                            </button>
                        </SettingsActionBar>
                    </div>
                </SettingsDisclosure>
            ) : null}

            {/* Step 2 of the delete. Reuses the League code dialog so both flows
                look and behave identically. */}
            <DeleteGroupConfirmationModal
                open={arenaDeleteOtpSent}
                confirmationValue={deleteOtp}
                hasPermission={isOwner}
                // The CONFIRM request, not the flow. `arenaDeleteLoading` is
                // true for the initiate call too, but the dialog only exists
                // after that one has answered, so here it can only mean the
                // verify-and-delete round trip.
                submitting={arenaDeleteLoading}
                errorMessage={arenaDeleteError}
                onConfirmationChange={setDeleteOtp}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
            />
        </SettingsPage>
    );
};

type ArenaDashboardProps = {
    arenaId: string;
};

export const ArenaDashboard = ({ arenaId }: ArenaDashboardProps) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const activeTab = normalizeTab(searchParams.get("tab"));
    // Read once on mount so the legacy ?tab=leaderboard deep link still lands on
    // the Feed's Standings view now that Leaderboard is no longer a tab —
    // normalizeTab already falls it through to "feed". Mirrors the League page.
    const [initialFeedFilter] = useState<StructuredFeedFilter>(() =>
        searchParams.get("tab") === "leaderboard" ? "standings" : "updates"
    );
    /**
     * The Arena Guide, exactly as the MVP drives it: `"automatic"` is the
     * welcome pop-up a newly joined member gets on their first visit,
     * `"manual"` is the "Arena guide" button under the Arena name.
     *
     * The MODE decides whether closing it records anything. A manual re-open by
     * somebody who has already read it must not overwrite their `completed`
     * with a `dismissed` — and re-recording is otherwise a no-op, so only the
     * automatic path writes.
     */
    const [arenaGuideMode, setArenaGuideMode] = useState<"automatic" | "manual" | null>(
        null
    );
    // Latched so the auto-open fires at most ONCE per mount. Without it, the
    // optimistic flip in the slice would race the effect and the dialog could
    // reopen the instant it closed.
    const autoGuideDecidedRef = useRef(false);

    const {
        loading,
        message: groupMessage,
        error: errorMessage,
        members: arenaMembers,
        loadingMembers,
        membersPagination
    } = useSelector((state: GroupSelector) => state.group);
    // Reads the shared group slot ONLY when the record is this arena's — see
    // useScopedGroup for why `loading` cannot cover the first commit after a
    // navigation. Keeping the local name `arena` leaves the ~100 downstream
    // `arena?.x` reads untouched.
    const scopedArena = useScopedGroup(arenaId);
    const arena = scopedArena.group;
    const {
        hosting,
        unlock,
        loading: arenaLoader,
        error: arenaErr,
        guide: arenaGuide,
        guideForId: arenaGuideForId,
        checkoutStatus,
    } = useSelector((state: RootState) => state.arena);

    useEffect(() => {
        if (!arenaId || !currentUser) return;

        dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        dispatch(fetchGroupOwnerPlanDetailsRequest({ group_id: arenaId }));
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
        // No `fetchArenaContestsRequest` here any more: the Contests tab reads
        // /group/feed-contest/list/* and owns those fetches itself, so the legacy
        // arena_contests list is nothing this screen still draws.
        dispatch(fetchArenaOwnershipTransferRequest({ arena_id: arenaId }));
        // Has this member been shown the Arena Guide for THIS Arena? Per-arena,
        // so joining a second one asks again.
        dispatch(fetchArenaGuideStatusRequest({ arena_id: arenaId }));
        /* MANAGER_ROSTER_LIMIT, not 10, and the same page Settings > Arena
         * managers asks for.
         *
         * Both this and that panel dispatch the one members action, which is
         * takeLatest — so two different page sizes race, and React runs the
         * child's effect first, which meant the panel's wide read was the one
         * that lost. Asking for the same page from both removes the race
         * instead of trying to order it. */
        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: arenaId,
                page: 1,
                limit: MANAGER_ROSTER_LIMIT,
            })
        );
    }, [arenaId, currentUser, dispatch]);

    const currentMembership = arena?.current_user_member?.role ?? "undefined";
    const isOwner = currentMembership === "commissioner";

    /* ---------- Unfinished setup sends the owner back to the wizard ----------
     *
     * `setup_complete` is derived server-side from `join_policy IS NOT NULL`,
     * and NULL means nobody can join this Arena by any door. So the dashboard is
     * not a place the owner may sit: the invite code on it admits nobody, and
     * every join answers 409 until the wizard is finished.
     *
     * Gated on `status === "ready"` rather than on `arena` alone — a record
     * still loading has no `setup_complete` to read, and treating that absence
     * as "incomplete" would bounce every visitor through /setup on first paint.
     *
     * Owner only. A member arriving at an unfinished Arena is already a member
     * and has nothing to fix; only the person who bought it can answer this.
     */
    const ownerSetupIncomplete =
        scopedArena.status === "ready" && isOwner && arena?.setup_complete === false;

    /**
     * HELD while the Stripe return banner is up. `checkoutStatus` is non-null
     * only when this page mounted with a `session_id` in the URL, so outside the
     * post-purchase return it is null and the redirect fires immediately.
     *
     * Without this the owner is bounced to /setup before the $50 charge is ever
     * acknowledged — the banner is the only confirmation they get, and it owns
     * the "Set up Arena" hand-off instead.
     */
    const awaitingCheckoutReturn = checkoutStatus !== null;

    useEffect(() => {
        if (!ownerSetupIncomplete || awaitingCheckoutReturn) return;
        router.replace(`/arena/${arenaId}/setup`);
    }, [arenaId, awaitingCheckoutReturn, ownerSetupIncomplete, router]);

    /**
     * The owner's review queue. Fetched from the dashboard rather than from the
     * Members tab so the Settings panel's pending-count line is populated too —
     * both read one slice, and the tab that happens to be open first must not
     * decide whether the other has data.
     *
     * Owner only: the endpoint answers 403 for anybody else.
     */
    useEffect(() => {
        if (!arenaId || !isOwner || !arena?.setup_complete) return;
        dispatch(fetchArenaJoinRequestsRequest({ arena_id: arenaId }));
    }, [arenaId, arena?.setup_complete, dispatch, isOwner]);

    /**
     * Auto-open on a DEFINITE yes and nothing else.
     *
     * `should_show_guide` is derived server-side from the acknowledgement row,
     * so it is the only thing gated on — never re-derived from the timestamps
     * beside it, and never assumed while the read is in flight or has failed
     * (`guide` is null in both cases, which reads as "don't open").
     *
     * Scoped by `guideForId`: this opens a modal over the page, and the previous
     * Arena's answer deciding it is exactly the bug that only appears when a
     * member navigates between two of them.
     */
    // Declared BEFORE the auto-open below, and the order is load-bearing: React
    // runs effects in declaration order, so a reset placed after it would wipe a
    // mode the same commit had just set — the dialog would never open when this
    // Arena's guide was already in the store from an earlier visit.
    useEffect(() => {
        autoGuideDecidedRef.current = false;
        setArenaGuideMode(null);
    }, [arenaId]);

    useEffect(() => {
        if (autoGuideDecidedRef.current) return;
        if (arenaGuideForId !== arenaId) return;
        if (!arenaGuide?.should_show_guide) return;
        autoGuideDecidedRef.current = true;
        setArenaGuideMode("automatic");
    }, [arenaGuide?.should_show_guide, arenaGuideForId, arenaId]);

    /**
     * `completed` = read through to the last step. `dismissed` = closed early.
     * Both silence it; the split is what keeps "did members actually read it"
     * answerable. Only an AUTOMATIC open records — see the mode's own note.
     */
    const closeArenaGuide = (status: "completed" | "dismissed") => {
        if (arenaGuideMode === "automatic") {
            dispatch(markArenaGuideViewedRequest({ arena_id: arenaId, status }));
        }
        setArenaGuideMode(null);
    };
    // const writable = isArenaWritable(hosting) && unlock.status === "unlocked";
    const managerLimit = hosting?.manager_limit ?? "Custom";

    const handleTabChange = (tab: ArenaTabId) => {
        // The URL param, never the record's id — a stale record here would launder
        // the previous group's id into the authoritative route param.
        router.replace(tab === "feed" ? `/arena/${arenaId}` : `/arena/${arenaId}?tab=${tab}`);
    };

    const memberCount = arena?.member_count ?? arena?.members?.length ?? 0;

    // Settled and empty — the usual cause is the owner deleting the Arena while
    // a member sat on this page. The notice waits a few seconds before leaving,
    // which doubles as the grace period for a read still in flight: if the
    // record lands, this unmounts and the redirect is cancelled with it.
    if (scopedArena.status === "missing") {
        return <GroupNotFoundNotice href="/arena" label="Arenas" />;
    }

    // ROOT-CAUSE FIX. `loading` alone cannot cover this: arriving from /league/L the
    // League's fetch has already settled, so loading is false while the shared slot
    // still holds the LEAGUE record — and the first commit would mount ArenaFeedPanel
    // with that id, firing five /group/arena/* reads with a League id before this
    // component's own effect had even dispatched. Mirrors the League page's
    // isLoadedGroup guard.
    const isInitialLoading = scopedArena.status !== "ready" || loading;

    if (isInitialLoading) {
        return <LeaguePageSkeleton />;
    }

    return (
        <div className="flex flex-col gap-3 pb-10">
            {/* accent="arena" is the whole colour story: it sets
                --community-accent-rgb to 167 139 250 on the surface, and the
                gradient backdrop, the tab strip's underline and the selected
                tab's border all read that token. Nothing below names violet. */}
            <CommunityDetailChrome accent="arena">
                <CommunityDetailHeader
                    backAction={
                        <BackButton
                            label="back to arenas"
                            fallback="/arena"
                            preferFallback
                            alignSelf="center"
                        />
                    }
                    inviteIndicator={
                        arena?.invite_code ? (
                            <InviteCodeCopy
                                code={arena.invite_code}
                                accent="arena"
                                className="-mr-[5px] lg:-mr-[3px] lg:text-[11px]"
                            />
                        ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600 lg:text-[11px]">
                                Invite locked
                            </span>
                        )
                    }
                    metadataClassName={groupPreviewMetaTextClassName}
                    metadataStart={
                        arena ? (
                            <>
                                <span>{getGroupCapacityLabel(arena, memberCount)}</span>
                                <CommunityDetailIndicatorSeparator />
                                <span>
                                    {getCombinedContestCapacityLabel(arena, [], [])}
                                </span>
                            </>
                        ) : null
                    }
                    metadataEnd={
                        <ArenaDetailsLabel
                            role={arena?.current_user_member?.role ?? "member"}
                            hosting={hosting}
                            managerCount={arena?.manager_count ?? 0}
                            managerLimit={managerLimit}
                        />
                    }
                    title={arena?.name}
                    titleClassName="bg-gradient-to-r from-white via-violet-100 to-violet-200"
                    description={arena?.description}
                    mobileActionsLayout="end"
                    actions={
                        // The Arena guide re-open. It lives in the header's action
                        // row now rather than under the description — outside any
                        // description guard either way, so an Arena that never set
                        // one still offers the guide.
                        <button
                            type="button"
                            onClick={() => setArenaGuideMode("manual")}
                            className={`${COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME} w-[calc(50%_-_var(--spacing))]`}
                        >
                            Arena guide
                        </button>
                    }
                />

                <CommunityDetailTabStrip>
                    <ArenaTabStrip
                        tabs={ARENA_TABS}
                        activeTab={activeTab}
                        onChange={handleTabChange}
                    />
                </CommunityDetailTabStrip>
            </CommunityDetailChrome>

            {/* key={activeTab} restarts the workspace-tab-panel enter animation
                on every switch — without it React reuses the node and the panel
                swaps with no transition. */}
            <main
                key={activeTab}
                className={`workspace-tab-panel ${activeTab === "feed" || activeTab === "contests" ? "-mt-3" : "pt-1"
                    }`}
            >
                {activeTab === "feed" ? (
                    <ArenaFeedPanel
                        arenaId={arenaId}
                        arenaName={arena?.name ?? ""}
                        role={currentMembership}
                        // Announcements are staff-only (owner OR manager) and
                        // not gated on hosting state — so both post.
                        writable={isArenaStaffRole(currentMembership)}
                        currentUserId={currentUser?.userId}
                        initialFilter={initialFeedFilter}
                    />
                ) : null}

                {activeTab === "contests" ? (
                    <ArenaContestsPanel
                        arenaId={arenaId}
                        arenaName={arena?.name ?? "Arena"}
                        rewardContactEmail={arena?.reward_contact_email}
                        role={currentMembership}
                        hosting={hosting}
                        unlock={unlock}
                    />
                ) : null}

                {activeTab === "members" ? (
                    <ArenaMembersPanel
                        arenaId={arenaId}
                        memberships={arenaMembers ?? []}
                        currentUserId={currentUser?.userId}
                        currentRole={currentMembership}
                        writable={currentMembership === "commissioner"}
                        // Same expression the venue panel below uses — a paused
                        // or winding-down Arena cannot admit a new member, and
                        // the approve/decline buttons must say so rather than
                        // collecting a 402.
                        hostingWritable={
                            !hosting ||
                            hosting.status === "not_started" ||
                            hosting.status === "active" ||
                            hosting.status === "included_month" ||
                            hosting.status === "pause_scheduled"
                        }
                        loading={loadingMembers}
                        onLeaveSuccess={() => router.replace("/fantasy")}
                    />
                ) : null}

                {activeTab === "settings" ? (
                    <ArenaSettingsPanel
                        arena={arena}
                        unlock={unlock}
                        arenaId={arenaId}
                        actorId={currentUser?.userId}
                        role={currentMembership}
                        hosting={hosting}
                        // The Arena hub, mirroring the League page's
                        // `router.replace("/fantasy")` after its own delete: a
                        // deleted group drops you on the list it belonged to, not
                        // on Home. Same destination the header's back button uses.
                        onDeleteSuccess={() => router.replace("/arena")}
                    />
                ) : null}
            </main>

            {arena?.lifecycle_status === "locked" && activeTab !== "settings" && isOwner ? (
                <button
                    type="button"
                    onClick={() => handleTabChange("settings")}
                    className="rounded-xl border border-sky-300/30 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-500/15"
                >
                    Finish Arena setup in Settings
                </button>
            ) : null}

            <ArenaMemberWelcomeDialog
                open={arenaGuideMode !== null}
                arenaName={arena?.name ?? "this Arena"}
                onComplete={() => closeArenaGuide("completed")}
                onDismiss={() => closeArenaGuide("dismissed")}
            />
        </div>
    );
};

export default ArenaDashboard;
