"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";
import {
    arenaTierLabel,
    formatArenaCents as formatCents,
    getArenaHostingStatusLabel,
    getArenaTierLabel,
    hostingMessage,
} from "./ArenaHostingStatus";
import type {
    ArenaHosting,
    ArenaMembership,
    ArenaRole,
    ArenaUnlock,
    CommunityLeaderboardPeriodKind,
    StructuredFeedContest,
} from "@/lib/domain/community";
import { selectArenaPointsLeaderboard } from "@/lib/scoring/context";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { formatDateTime } from "@/lib/utils/date";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { useToast } from "@/lib/state/ToastContext";
import InviteCodeCopy from "../group/InviteCodeCopy";
import { DeleteGroupConfirmationModal } from "../group/ConfirmDeleteGroupModal";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { ArenaContest, ArenaHostingDetails, ArenaHostingStatus, ArenaState, ArenaUnlockDetails, Group, GroupSelector, Members, RootState, UpdateArenaDetailsPayload } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest, fetchGroupMembersByGroupIdRequest, fetchGroupOwnerPlanDetailsRequest } from "@/lib/redux/slices/groupsSlice";
import {
    activateArenaHostingRequest,
    cancelArenaOwnershipTransferRequest,
    cancelArenaPauseRequest,
    clearArenaDeleteState,
    clearArenaHostingActionMessage,
    clearArenaMemberActionMessage,
    clearLeaveArenaState,
    confirmArenaDeleteRequest,
    initiateArenaDeleteRequest,
    leaveArenaRequest,
    scheduleArenaPauseRequest,
    clearArenaOwnershipTransferMessage,
    clearUnlockArenaMessage,
    createArenaOwnershipTransferRequest,
    fetchArenaContestsRequest,
    fetchArenaHostingDetailsRequest,
    fetchArenaOwnershipTransferRequest,
    makeArenaManagerRequest,
    makeArenaMemberRequest,
    removeArenaMemberRequest,
    respondArenaOwnershipTransferRequest,
    unlockArenaRequest,
    updateArenaDetailsRequest,
    clearUpdateArenaDetailsMessage,
} from "@/lib/redux/slices/arenaSlice";
import {
    getArenaHostingOffer,
    getArenaUnlockOffer,
    SELF_SERVICE_ARENA_TIERS,
    type ArenaSelfServiceHostingTier,
} from "@/components/billing/arena";
import {
    PurchaseFlowDialog,
    type PurchaseFlowStatus,
} from "@/components/billing/PurchaseFlowDialog";
import { getCombinedContestCapacityLabel, getGroupCapacityLabel } from "@/lib/groups/limits";
import LeaguePageSkeleton from "../skeletons/leagues/LeaguePageSkeleton";
import { ArenaShellActions } from "./types";
import { groupPreviewMetaTextClassName } from "../group/GroupPreviewChip";
import StructuredContestList from "../contests/StructuredContestList";
import ConnectedStructuredFeed from "../feed/ConnectedStructuredFeed";
import useScopedGroup from "@/lib/groups/useScopedGroup";

const ARENA_TABS = [
    { id: "feed", label: "Feed" },
    { id: "contests", label: "Contests" },
    { id: "leaderboard", label: "Community Leaderboard" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
] as const;

type ArenaTabId = (typeof ARENA_TABS)[number]["id"];

const ARENA_PRIMARY_TABS = [
    { id: "feed", label: "Feed" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
] as const;

type ArenaPrimaryTabId = (typeof ARENA_PRIMARY_TABS)[number]["id"];

const ARENA_FEED_TABS = [
    { id: "feed", label: "Feed" },
    { id: "contests", label: "Contests" },
    { id: "leaderboard", label: "Community Leaderboard" },
] as const;

type ArenaFeedTabId = (typeof ARENA_FEED_TABS)[number]["id"];

const LEADERBOARD_PERIODS: Array<{
    id: CommunityLeaderboardPeriodKind;
    label: string;
}> = [
        { id: "current_week", label: "Week" },
        { id: "current_month", label: "Month" },
        { id: "last_30_days", label: "30 days" },
        { id: "current_nfl_season", label: "NFL season" },
        { id: "lifetime", label: "Lifetime" },
    ];

// Mirrors the validateTextField / parseCommunityUrl bounds in updateArenaDetails.
const ARENA_NAME_MIN = 4;
const ARENA_NAME_MAX = 25;
const ARENA_DESCRIPTION_MAX = 50;
const ARENA_COMMUNITY_URL_MAX = 255;

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
                    className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-white/15 bg-[#090d16] p-3 text-left font-sans text-xs font-normal normal-case tracking-normal text-gray-300 shadow-2xl shadow-black/50"
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

const arenaFeedTabIcon = (tabId: ArenaFeedTabId) => {
    const common = {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        "aria-hidden": true,
    };

    if (tabId === "feed") {
        return (
            <svg viewBox="0 0 24 24" {...common}>
                <path d="M4 6h16M4 12h12M4 18h9" />
            </svg>
        );
    }

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

    return (
        <svg viewBox="0 0 24 24" {...common}>
            <path d="M5 20V11M12 20V4M19 20v-6" />
            <path d="M3 20h18" />
        </svg>
    );
};

const ArenaTabStrip = ({
    activeTab,
    onChange,
}: {
    activeTab: ArenaPrimaryTabId;
    onChange: (tab: ArenaPrimaryTabId) => void;
}) => {
    const activeTabIndex = Math.max(
        0,
        ARENA_PRIMARY_TABS.findIndex((tab) => tab.id === activeTab)
    );

    return (
        <nav aria-label="Arena sections">
            <div
                className="relative grid w-full gap-1 py-1"
                style={{
                    gridTemplateColumns: `repeat(${ARENA_PRIMARY_TABS.length}, minmax(0, 1fr))`,
                }}
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-1 left-0 rounded-lg border border-white/10 bg-white/[0.08] transition-transform duration-300 ease-out"
                    style={{
                        width: `calc(100% / ${ARENA_PRIMARY_TABS.length})`,
                        transform: `translateX(${activeTabIndex * 100}%)`,
                    }}
                />
                {ARENA_PRIMARY_TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-label={tab.label}
                            aria-current={active ? "page" : undefined}
                            onClick={() => onChange(tab.id)}
                            className={`relative z-10 flex h-11 min-w-0 items-center justify-center px-1 text-center text-[10px] font-semibold uppercase tracking-wide transition sm:h-10 sm:px-3 sm:text-sm ${active ? "text-white" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            <span className="truncate">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

const ArenaFeedTabStrip = ({
    activeTab,
    onChange,
}: {
    activeTab: ArenaFeedTabId;
    onChange: (tab: ArenaFeedTabId) => void;
}) => (
    <div
        role="tablist"
        aria-label="Arena Feed sections"
        className="grid w-full"
        style={{
            gridTemplateColumns: `repeat(${ARENA_FEED_TABS.length}, minmax(0, 1fr))`,
        }}
    >
        {ARENA_FEED_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`arena-feed-tab-${tab.id}`}
                    aria-selected={active}
                    aria-controls="arena-feed-panel"
                    aria-label={tab.label}
                    title={tab.label}
                    onClick={() => onChange(tab.id)}
                    className={`relative flex h-9 min-w-0 items-center justify-center px-2 text-center text-[11px] font-medium tracking-wide transition sm:px-3 ${active ? "text-white" : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    {arenaFeedTabIcon(tab.id)}
                    <span
                        aria-hidden
                        className={`absolute inset-x-4 bottom-0 h-px bg-sky-300 transition-opacity ${active ? "opacity-80" : "opacity-0"
                            }`}
                    />
                </button>
            );
        })}
    </div>
);

const EmptyPanel = ({ title, body }: { title: string; body: string }) => (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </div>
);

const ArenaFeedPanel = ({
    arenaId,
    arenaName,
    role,
    writable,
    currentUserId,
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
}) => {
    if (!arenaId) return;
    return (
        <div className="space-y-4">
            {isArenaStaffRole(role) ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                        Staff workspace
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                        Owner and manager posts are staff content. Staff Picks are clearly marked
                        noncompetitive and never earn Arena Points.
                    </p>
                    {!writable ? (
                        <p className="mt-3 text-xs font-semibold text-gray-500">
                            Publishing is unavailable in the current hosting state.
                        </p>
                    ) : null}
                </section>
            ) : null}

            <ConnectedStructuredFeed
                groupId={arenaId}
                groupType="arena"
                contextName={arenaName}
                currentRole={role}
                writable={writable}
                currentUserId={currentUserId}
            />
        </div>
    )
};

const contestStatusTone = (status: StructuredFeedContest["lifecycleStatus"]) =>
    status === "open"
        ? "text-emerald-200"
        : status === "locked" || status === "grading"
            ? "text-amber-200"
            : status === "final"
                ? "text-sky-200"
                : "text-gray-400";

const ArenaContestsPanel = ({
    contests,
    currentUserId,
    arena,
    arenaId,
    role,
    hosting,
    writable,
    activeContestCount,
}: {
    currentUserId?: string;
    arena: Group | null;
    /** Route param — never the record's id, which can belong to the previous group. */
    arenaId: string;
    contests: ArenaContest[];
    role: string;
    hosting: ArenaHostingDetails | null;
    writable: boolean;
    activeContestCount: number;
}) => {
    if (!hosting || !arena || !currentUserId) return null;
    const sortedContests = [...contests].sort((left, right) =>
        right.created_at.localeCompare(left.created_at)
    );

    const staff = isArenaStaffRole(role);
    const activeLimit = hosting.active_contest_limit;
    const createDisabledReason = !staff
        ? undefined
        : hosting.status === "cleanup"
            ? "Cleanup mode allows only grading, Review Required resolution, finalization, and cancellation of existing contests."
            : !writable
                ? "New contests are unavailable while Arena hosting is read-only."
                : activeLimit !== null && activeContestCount >= activeLimit
                    ? "This Arena has reached its active contest limit."
                    : undefined;

    return (
        <div className="space-y-4">
            <StructuredContestList
                title="Arena contests"
                description={
                    staff
                        ? "Create and operate structured contests without entering the competition."
                        : "Join, submit a complete entry, and follow proposed and final results."
                }
                contests={sortedContests}
                participants={[]}
                currentUserId={currentUserId}
                detailHref={(contest) =>
                    `/arena/${arenaId}/contests/${contest.id}`
                }
                organizer={staff}
                staffNoncompetitive={staff}
                createHref={
                    staff && !createDisabledReason
                        ? `/arena/${arenaId}/contests/create`
                        : undefined
                }
                createDisabledReason={createDisabledReason}
                emptyTitle="No Arena contests yet"
                emptyBody={
                    staff
                        ? "Create the first structured contest when Arena hosting permits it."
                        : "Arena staff have not made a contest available yet."
                }
            />
        </div>
    );
};

// ---------------------------------------------------------------------------
// TEMP: static sample data until the Arena leaderboard endpoint is wired up.
// One board per period so switching pills exercises every render case:
//   current_week        — short board (podium only)
//   current_month       — no rows → EmptyPanel state
//   last_30_days        — mid-size board, includes an accuracy-less live row
//   current_nfl_season  — tie on points broken by successful selections
//   lifetime            — full board with a zero-successful straggler
// ---------------------------------------------------------------------------

type ArenaLeaderboardSampleRow = {
    rank: number;
    userId: string;
    username: string;
    points: number;
    successful: number;
    accuracy: number | null;
};

const SAMPLE_ARENA_LEADERBOARD: Record<
    CommunityLeaderboardPeriodKind,
    ArenaLeaderboardSampleRow[]
> = {
    current_week: [
        { rank: 1, userId: "sample-user-3", username: "parlay_prophet", points: 180, successful: 6, accuracy: 0.75 },
        { rank: 2, userId: "sample-user-1", username: "gridiron_gabe", points: 145, successful: 5, accuracy: 0.62 },
        { rank: 3, userId: "sample-user-7", username: "moneyline_mia", points: 90, successful: 3, accuracy: 0.5 },
    ],
    // Intentionally empty — shows the "No ranked results in this period" state.
    current_month: [],
    last_30_days: [
        { rank: 1, userId: "sample-user-1", username: "gridiron_gabe", points: 520, successful: 17, accuracy: 0.68 },
        { rank: 2, userId: "sample-user-3", username: "parlay_prophet", points: 505, successful: 16, accuracy: 0.71 },
        { rank: 3, userId: "sample-user-5", username: "underdog_uma", points: 340, successful: 11, accuracy: 0.55 },
        { rank: 4, userId: "sample-user-2", username: "spread_savant", points: 275, successful: 9, accuracy: null },
        { rank: 5, userId: "sample-user-7", username: "moneyline_mia", points: 120, successful: 4, accuracy: 0.44 },
    ],
    current_nfl_season: [
        { rank: 1, userId: "sample-user-5", username: "underdog_uma", points: 960, successful: 31, accuracy: 0.64 },
        // Tie on points — rank order falls back to successful selections.
        { rank: 2, userId: "sample-user-1", username: "gridiron_gabe", points: 875, successful: 29, accuracy: 0.61 },
        { rank: 3, userId: "sample-user-3", username: "parlay_prophet", points: 875, successful: 26, accuracy: 0.66 },
        { rank: 4, userId: "sample-user-4", username: "hail_mary_hank", points: 430, successful: 14, accuracy: 0.48 },
    ],
    lifetime: [
        { rank: 1, userId: "sample-user-3", username: "parlay_prophet", points: 2410, successful: 78, accuracy: 0.69 },
        { rank: 2, userId: "sample-user-1", username: "gridiron_gabe", points: 2325, successful: 74, accuracy: 0.63 },
        { rank: 3, userId: "sample-user-5", username: "underdog_uma", points: 1980, successful: 66, accuracy: 0.6 },
        { rank: 4, userId: "sample-user-2", username: "spread_savant", points: 1440, successful: 47, accuracy: 0.57 },
        { rank: 5, userId: "sample-user-4", username: "hail_mary_hank", points: 890, successful: 30, accuracy: 0.52 },
        { rank: 6, userId: "sample-user-7", username: "moneyline_mia", points: 615, successful: 21, accuracy: 0.49 },
        // Points with no successful settled selections yet (all pushes/voids).
        { rank: 7, userId: "sample-user-6", username: "rookie_rick", points: 40, successful: 0, accuracy: null },
    ],
};

const ArenaLeaderboardPanel = () => {
    const [period, setPeriod] = useState<CommunityLeaderboardPeriodKind>("lifetime");
    const rows = SAMPLE_ARENA_LEADERBOARD[period];

    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Leaderboard period">
                {LEADERBOARD_PERIODS.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setPeriod(option.id)}
                        aria-pressed={period === option.id}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${period === option.id
                            ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                            : "border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-200"
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <p className="text-xs leading-5 text-gray-500">
                Only eligible participating members rank here. Arena owners and managers are excluded.
            </p>

            {rows.length ? (
                <div className="overflow-hidden rounded-xl border border-white/10">
                    <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 sm:grid-cols-[4rem_minmax(0,1fr)_8rem_8rem]">
                        <span>Rank</span>
                        <span>Member</span>
                        <span className="hidden text-right sm:block">Successful</span>
                        <span className="text-right">Arena Points</span>
                    </div>
                    {rows.map((row) => (
                        <div
                            key={row.userId}
                            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-4 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)_8rem_8rem]"
                        >
                            <span className="font-semibold text-sky-100">#{row.rank}</span>
                            <span className="truncate text-sm font-semibold text-white">
                                @{row.username}
                            </span>
                            <span className="hidden text-right text-sm text-gray-400 sm:block">
                                {row.successful}
                            </span>
                            <span className="text-right text-sm font-semibold text-white">
                                {row.points}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyPanel
                    title="No ranked results in this period"
                    body="Eligible settled Arena activity will populate this Community Leaderboard."
                />
            )}
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

type MemberActionKind = "promote" | "demote" | "remove" | "leave";

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
    promote: {
        title: (handle) => `Make @${handle} a manager?`,
        detail:
            "Managers can create and operate Arena contests. They use a staff allowance instead of member capacity, and stop being eligible to rank on the Community Leaderboard.",
        confirmLabel: "Make manager",
        destructive: false,
    },
    demote: {
        title: (handle) => `Move @${handle} back to member?`,
        detail:
            "They immediately lose contest controls and return to participating member capacity.",
        confirmLabel: "Make member",
        destructive: false,
    },
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

const ArenaMembersPanel = ({
    arenaId,
    memberships,
    currentUserId,
    currentRole,
    writable,
    onLeaveSuccess,
}: {
    /** Route param, required — see ArenaFeedPanel's arenaId note. */
    arenaId: string;
    memberships: Members | null;
    currentUserId: string | undefined;
    currentRole: string;
    writable: boolean;
    onLeaveSuccess: () => void;
}) => {
    const [search, setSearch] = useState("");
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
    } = useSelector((state: RootState) => state.arena);
    const actionBusy = memberActionLoading || leaveArenaLoading;
    const [pendingMemberAction, setPendingMemberAction] =
        useState<PendingMemberAction | null>(null);
    const visibleMemberships = memberships || [];

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

        const request =
            kind === "promote"
                ? makeArenaManagerRequest
                : kind === "demote"
                    ? makeArenaMemberRequest
                    : removeArenaMemberRequest;
        dispatch(request({ arena_id: arenaId, user_id: userId, page: 1, limit: 10 }));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-semibold text-white">Arena members</h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Owners and managers use staff allowances and do not consume member capacity.
                    </p>
                </div>
                <label className="sm:w-64">
                    <span className="sr-only">Search Arena members</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search members"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
                    />
                </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleMemberships.map((membership) => {
                    const handle = membership?.profiles?.username ?? "member";
                    const isSelf = membership.user_id === currentUserId;
                    const canPromote =
                        isOwner && writable && membership.role === "member" && !isSelf;
                    const canDemote =
                        isOwner && writable && membership.role === "manager" && !isSelf;
                    const canRemove =
                        isOwner && writable && membership.role !== "commissioner" && !isSelf;
                    const isBusy = memberActionUserId === membership.user_id;

                    const requestMemberAction = (kind: MemberActionKind) => {
                        if (!membership.user_id) return;
                        setPendingMemberAction({
                            kind,
                            userId: membership.user_id,
                            handle,
                        });
                    };

                    return (
                        <article
                            key={membership.id}
                            className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Link
                                    href={
                                        membership.user_id && currentUserId
                                            ? getProfilePath(membership.user_id, currentUserId)
                                            : "#"
                                    }
                                    aria-label={`View @${handle}'s profile`}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-xs font-semibold text-gray-200 transition hover:border-sky-300/50 hover:text-white"
                                >
                                    {initialsFor(handle)}
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">@{handle}</p>
                                    <p
                                        className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${membership.role === "member" ? "text-gray-500" : "text-amber-200"
                                            }`}
                                    >
                                        {roleLabel(membership.role ?? "member")}
                                    </p>
                                </div>
                            </div>

                            {canPromote || canDemote || canRemove ? (
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                                    {canPromote ? (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => requestMemberAction("promote")}
                                            className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/10 disabled:opacity-50"
                                        >
                                            Make manager
                                        </button>
                                    ) : null}
                                    {canDemote ? (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => requestMemberAction("demote")}
                                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                                        >
                                            Make member
                                        </button>
                                    ) : null}
                                    {canRemove ? (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => requestMemberAction("remove")}
                                            className="rounded-lg border border-red-300/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </article>
                    );
                })}
            </div>

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
    members,
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
    members: Members | null;
    // actions: ArenaShellActions;
    // onError: (message: string) => void;
    onDeleteSuccess: () => void;
}) => {
    const [name, setName] = useState(arena?.name ?? "");
    const [description, setDescription] = useState(arena?.description ?? "");
    const [timeZone, setTimeZone] = useState("America/New_York");
    const [newOwnerUserId, setNewOwnerUserId] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteOtp, setDeleteOtp] = useState("");
    const [unlockOpen, setUnlockOpen] = useState(false);
    // Which tier the purchase dialog is confirming, if any.
    const [tierDialog, setTierDialog] = useState<ArenaSelfServiceHostingTier | null>(null);
    const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
    const unlockButtonRef = useRef<HTMLButtonElement>(null);
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const {
        unlockLoading,
        unlockError,
        unlockMessage,
        availableTiers,
        transfer,
        canRespondToTransfer,
        canCancelTransfer,
        transferActionLoading,
        transferError,
        transferMessage,
        updateLoading,
        updateError,
        updateMessage,
        hostingActionLoading,
        hostingActionTier,
        hostingActionError,
        hostingActionMessage,
        arenaDeleteLoading,
        arenaDeleteOtpSent,
        arenaDeleted,
        arenaDeleteError,
        arenaDeleteMessage,
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

    useEffect(() => {
        if (!arena) return;
        setName(arena.name);
        setDescription(arena?.description ?? "");
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

    // Pause writes report via toast. Tier activation does NOT — it runs inside the
    // purchase dialog, which shows its own success/error state, so toasting there
    // too would double-report the same outcome.
    useEffect(() => {
        if (tierDialog) return;
        if (!hostingActionError && !hostingActionMessage) return;
        setToast({
            id: Date.now(),
            type: hostingActionError ? "error" : "success",
            message: hostingActionError ?? hostingActionMessage ?? "",
            duration: 5000,
        });
        dispatch(clearArenaHostingActionMessage());
    }, [hostingActionError, hostingActionMessage, tierDialog, dispatch, setToast]);

    // Delete outcome. The "code sent" message is shown inside the dialog, so only
    // the terminal states surface here; on success the Arena no longer exists, so
    // the page has to leave before it tries to re-read it.
    useEffect(() => {
        if (arenaDeleted) {
            setToast({
                id: Date.now(),
                type: "success",
                message: arenaDeleteMessage ?? "Arena permanently deleted.",
                duration: 5000,
            });
            dispatch(clearArenaDeleteState());
            onDeleteSuccess();
            return;
        }
        // Only the initiate step reports out here; a bad code is shown in-dialog.
        if (arenaDeleteError && !arenaDeleteOtpSent) {
            setToast({
                id: Date.now(),
                type: "error",
                message: arenaDeleteError,
                duration: 4000,
            });
            dispatch(clearArenaDeleteState());
        }
    }, [
        arenaDeleted,
        arenaDeleteError,
        arenaDeleteOtpSent,
        arenaDeleteMessage,
        dispatch,
        setToast,
        onDeleteSuccess,
    ]);

    // The offer names a member who may have been promoted or removed since; clear
    // a stale selection rather than sending a user id the backend will reject.
    const transferCandidates = useMemo(
        () =>
            (members ?? []).filter(
                (member) =>
                    member.user_id &&
                    member.user_id !== actorId &&
                    member.role !== "commissioner"
            ),
        [members, actorId]
    );

    useEffect(() => {
        if (!newOwnerUserId) return;
        if (!transferCandidates.some((member) => member.user_id === newOwnerUserId)) {
            setNewOwnerUserId("");
        }
    }, [newOwnerUserId, transferCandidates]);

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

    // --- Hosting actions -----------------------------------------------------
    // Tier changes go through the purchase dialog because they may charge; the
    // backend decides whether this call is a charge or a deferred schedule, and
    // its message says which.
    const handleActivateTier = (tier: ArenaSelfServiceHostingTier) => {
        dispatch(clearArenaHostingActionMessage());
        setTierDialog(tier);
    };

    const handleCloseTierDialog = () => {
        setTierDialog(null);
        dispatch(clearArenaHostingActionMessage());
    };

    const handleConfirmTier = () => {
        if (!tierDialog) return;
        dispatch(activateArenaHostingRequest({ arena_id: arenaId, tier: tierDialog }));
    };

    // Re-selecting the tier already in force is what clears a scheduled change —
    // same endpoint, no charge (the backend returns action: "schedule_canceled").
    const handleKeepCurrentTier = () => {
        if (!hosting?.tier) return;
        dispatch(activateArenaHostingRequest({ arena_id: arenaId, tier: hosting.tier }));
    };

    const handleSchedulePause = () => {
        setPauseConfirmOpen(false);
        dispatch(scheduleArenaPauseRequest({ arena_id: arenaId }));
    };

    const handleCancelPause = () => {
        dispatch(cancelArenaPauseRequest({ arena_id: arenaId }));
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

        dispatch(updateArenaDetailsRequest(payload));
    };

    // Step 1 — the typed-name check is client-side only; the server then emails a
    // 4-digit code, which is what actually authorises the delete.
    const handleDelete = () => {
        if (deleteConfirmation !== arena.name) return;
        dispatch(initiateArenaDeleteRequest({ arena_id: arenaId }));
    };

    // Step 2 — spend the emailed code.
    const handleConfirmDelete = () => {
        if (!deleteOtp.trim()) return;
        dispatch(confirmArenaDeleteRequest({ arena_id: arenaId, otp: deleteOtp.trim() }));
    };

    const handleCloseDeleteDialog = () => {
        setDeleteOtp("");
        dispatch(clearArenaDeleteState());
    };

    const handleOwnershipTransfer = () => {
        if (!newOwnerUserId) return;
        dispatch(
            createArenaOwnershipTransferRequest({
                arena_id: arenaId,
                to_user_id: newOwnerUserId,
            })
        );
        setNewOwnerUserId("");
    };

    const handleOwnershipResponse = (accept: boolean) => {
        if (!transfer) return;
        dispatch(
            respondArenaOwnershipTransferRequest({
                request_id: transfer.id,
                action: accept ? "accept" : "reject",
                arena_id: arenaId,
            })
        );
    };

    const handleCancelOwnershipTransfer = () => {
        if (!transfer) return;
        dispatch(
            cancelArenaOwnershipTransferRequest({
                request_id: transfer.id,
                arena_id: arenaId,
            })
        );
    };

    return (
        <div className="space-y-7">
            <section className="space-y-4">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
                        Arena identity
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Arena times, deadlines, periods, and announcements use the stored timezone.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Arena name
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={!identityWritable || updateLoading}
                            maxLength={ARENA_NAME_MAX}
                            aria-invalid={Boolean(nameError)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                        />
                        {identityWritable && nameError ? (
                            <span className="mt-1 block text-[10px] normal-case text-amber-200">
                                {nameError}
                            </span>
                        ) : null}
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Arena timezone
                        <select
                            value={timeZone}
                            onChange={(event) => setTimeZone(event.target.value)}
                            disabled
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-55"
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

                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Description
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        disabled={!identityWritable || updateLoading}
                        maxLength={ARENA_DESCRIPTION_MAX}
                        aria-invalid={Boolean(descriptionError)}
                        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                    />
                    {identityWritable ? (
                        <span className="mt-1 block text-[10px] normal-case text-gray-500">
                            {trimmedDescription.length}/{ARENA_DESCRIPTION_MAX} · leave blank to clear
                        </span>
                    ) : null}
                </label>

                {identityWritable ? (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!hasIdentityChanges || Boolean(identityError) || updateLoading}
                        className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {updateLoading ? "Saving…" : "Save Arena details"}
                    </button>
                ) : (
                    <p className="text-xs text-gray-500">
                        {isOwner
                            ? "Arena identity is read-only in the current hosting state."
                            : "Only the Arena owner can change Arena identity settings."}
                    </p>
                )}
            </section>

            {/* Permanent-unlock section: the only part of the hosting panel enabled so
                far. Tier selection, change previews and the purchase-confirm flow stay
                commented in ArenaHostingPanel below until their offer/usage data exists. */}
            <section className="space-y-4 border-t border-white/10 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
                            Unlock and hosting
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                            Permanent Arena ownership and monthly operating capacity are separate.
                        </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                        {unlock.status === "unlocked" ? "Permanently unlocked" : "Locked"}
                    </span>
                </div>

                {/* Step 2 — legacy grandfathered notice. Purely driven by unlock.source. */}
                {unlock.source === "legacy_grandfathered" ? (
                    <p className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-xs leading-5 text-violet-100">
                        This legacy Arena is permanently grandfathered. Its migration month is
                        included, and no {unlockOffer.priceLabel} unlock charge was applied.
                    </p>
                ) : null}

                {unlock.status === "locked" ? (
                    <div className="rounded-xl border border-sky-300/25 bg-sky-500/10 p-5">
                        <p className="font-semibold text-white">Permanent Arena Unlock</p>
                        <p className="mt-2 text-sm leading-6 text-gray-300">
                            {unlockOffer.priceLabel} {unlockOffer.cadenceLabel} per Arena, including
                            one {ARENA_INCLUDED_TIER_LABEL} month. The unlock stays with the Arena through pause,
                            reactivation, and ownership transfer.
                        </p>
                        {isOwner ? (
                            <button
                                ref={unlockButtonRef}
                                type="button"
                                onClick={handleOpenUnlockDialog}
                                disabled={unlockLoading}
                                className="mt-4 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {`Unlock Arena · ${unlockOffer.priceLabel} once`}
                            </button>
                        ) : (
                            <p className="mt-3 text-xs font-semibold text-gray-500">
                                The owner controls the permanent unlock.
                            </p>
                        )}
                    </div>
                ) : hosting ? (
                    <>
                        {/* Step 5 — state warnings. Read straight off hosting.status; the
                            backend remains the authority on what is actually permitted. */}
                        {hosting.status === "pause_scheduled" ? (
                            <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-100">
                                Cancel the scheduled pause before changing hosting tiers.
                            </p>
                        ) : null}
                        {hosting.status === "cleanup" ? (
                            <p className="rounded-xl border border-orange-300/20 bg-orange-500/10 px-4 py-3 text-xs leading-5 text-orange-100">
                                Finish or cancel unresolved Locked and Grading contests before
                                choosing a reactivation tier.
                            </p>
                        ) : null}

                        {/* Step 6 — read-only current hosting. Every value comes from the
                            hosting-details response; no client-side rules. */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-white">Current hosting</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {getArenaTierLabel(hosting)} · {getArenaHostingStatusLabel(hosting)}
                                    </p>
                                </div>
                                {formatCents(hosting.monthly_amount_cents) ? (
                                    <p className="text-sm text-gray-300">
                                        {formatCents(hosting.monthly_amount_cents)}
                                        <span className="text-xs text-gray-500"> / month</span>
                                    </p>
                                ) : null}
                            </div>

                            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                                {[
                                    { label: "members", value: hosting.participating_member_limit },
                                    { label: "managers", value: hosting.manager_limit },
                                    { label: "contests", value: hosting.active_contest_limit },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-lg border border-white/10 bg-black/30 px-2 py-2"
                                    >
                                        <dt className="text-[10px] uppercase tracking-wide text-gray-500">
                                            {item.label}
                                        </dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-white">
                                            {item.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-4 space-y-1 text-xs text-gray-500">
                                {hosting.included_month_ends_at ? (
                                    <p>
                                        Included month ends{" "}
                                        {formatDateTime(hosting.included_month_ends_at)}
                                    </p>
                                ) : null}
                                {hosting.paid_through_at ? (
                                    <p>Paid through {formatDateTime(hosting.paid_through_at)}</p>
                                ) : null}
                                {hosting.period_ends_at ? (
                                    <p>Period ends {formatDateTime(hosting.period_ends_at)}</p>
                                ) : null}
                                {hosting.pause_scheduled_for ? (
                                    <p>Pause scheduled for {formatDateTime(hosting.pause_scheduled_for)}</p>
                                ) : null}
                            </div>
                        </div>

                        {/* Steps 7a + 7b — tier grid. Card content (name, price, limits) is
                            the STATIC frontend catalogue; only the current tier comes from
                            the backend (hosting.tier). If the backend also returns a verdict
                            for a tier in available_tiers, its summary/allowed renders on top.
                            The per-tier action button arrives in step 7c. */}
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {SELF_SERVICE_ARENA_TIERS.map((tierId) => {
                                const offer = getArenaHostingOffer(tierId);
                                const isCurrent = hosting.tier === tierId;
                                const verdict = availableTiers.find((item) => item.tier === tierId);
                                return (
                                    <article
                                        key={tierId}
                                        className={`rounded-xl border p-4 ${isCurrent
                                            ? "border-sky-300/45 bg-sky-500/10"
                                            : "border-white/10 bg-white/[0.03]"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-white">{offer.name}</p>
                                            {isCurrent ? (
                                                <span className="text-[9px] font-semibold uppercase tracking-wide text-sky-200">
                                                    current
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-sm text-gray-300">
                                            {offer.priceLabel}
                                            <span className="text-xs text-gray-500"> / month</span>
                                        </p>
                                        <p className="mt-3 text-xs leading-5 text-gray-500">
                                            {offer.limits.participatingMemberLimit ?? "—"} members ·{" "}
                                            {offer.limits.managerLimit ?? "—"} managers ·{" "}
                                            {offer.limits.activeContestLimit ?? "—"} contests
                                        </p>
                                        {!isCurrent && verdict?.summary ? (
                                            <p
                                                className={`mt-2 text-[11px] leading-4 ${verdict.allowed ? "text-gray-500" : "text-amber-200"
                                                    }`}
                                            >
                                                {verdict.summary}
                                            </p>
                                        ) : null}
                                        {/* Step 7c. Only disabled when the backend explicitly
                                            says this tier is not allowed; otherwise the server
                                            stays the authority and may still reject. */}
                                        {isOwner && !isCurrent ? (
                                            <button
                                                type="button"
                                                disabled={
                                                    (verdict ? !verdict.allowed : false) ||
                                                    hostingActionLoading
                                                }
                                                onClick={() => handleActivateTier(tierId)}
                                                className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-sky-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {hostingActionTier === tierId
                                                    ? "Working…"
                                                    : verdict?.action_label ??
                                                    `Switch to ${offer.name}`}
                                            </button>
                                        ) : null}
                                    </article>
                                );
                            })}

                            {/* Custom tier is contact-only, so it never becomes selectable. */}
                            <article className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
                                <p className="font-semibold text-white">
                                    {getArenaHostingOffer("custom").name}
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                    {getArenaHostingOffer("custom").priceLabel} ·{" "}
                                    {getArenaHostingOffer("custom").cadenceLabel}
                                </p>
                                <p className="mt-3 text-xs leading-5 text-gray-500">
                                    {getArenaHostingOffer("custom").summary}
                                </p>
                                <span className="mt-3 inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    Contact state
                                </span>
                            </article>
                        </div>

                        {/* Scheduled-tier notice (display half of step 8). The "Keep <tier>"
                            action needs the activate-hosting endpoint, so it stays out for now. */}
                        {hosting.scheduled_tier ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-xs leading-5 text-sky-100">
                                <span>
                                    {arenaTierLabel(hosting.scheduled_tier)} is scheduled
                                    {hosting.status === "included_month"
                                        ? ` after the included month${hosting.included_month_ends_at
                                            ? ` ends ${formatDateTime(hosting.included_month_ends_at)}`
                                            : ""
                                        }.`
                                        : " for the next paid period."}
                                </span>
                                {/* Step 8 — reuses activate-hosting with the current tier. */}
                                {isOwner &&
                                    hosting.status === "active" &&
                                    hosting.tier &&
                                    hosting.tier !== "custom" ? (
                                    <button
                                        type="button"
                                        onClick={handleKeepCurrentTier}
                                        disabled={hostingActionLoading}
                                        className="rounded-lg border border-sky-200/30 px-3 py-1.5 font-semibold uppercase tracking-wide transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Keep {arenaTierLabel(hosting.tier)}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Steps 9a–9c — pause / cancel pause / advance period. Which button
                            shows is keyed off hosting.status; the backend still decides
                            whether the action is actually permitted. */}
                        {isOwner ? (
                            <div className="flex flex-wrap gap-2">
                                {hosting.status === "included_month" ||
                                    hosting.status === "active" ||
                                    hosting.status === "pause_scheduled" ? (
                                    <button
                                        type="button"
                                        onClick={() => setPauseConfirmOpen(true)}
                                        disabled={hostingActionLoading}
                                        className="rounded-lg border border-amber-300/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {hosting.status === "pause_scheduled"
                                            ? "Reschedule pause"
                                            : hosting.status === "included_month" &&
                                                hosting.scheduled_tier
                                                ? "Cancel next tier and pause"
                                                : "Pause at period end"}
                                    </button>
                                ) : null}
                                {hosting.status === "pause_scheduled" ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelPause}
                                        disabled={hostingActionLoading}
                                        className="rounded-lg border border-emerald-300/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel scheduled pause
                                    </button>
                                ) : null}

                                {/* Deferred with handleAdvancePeriod above — needs
                                    POST /group/arena/advance-period to exist first.
                                {hosting.status !== "paused" &&
                                    hosting.status !== "not_started" &&
                                    hosting.status !== "past_due" ? (
                                    <button
                                        type="button"
                                        onClick={handleAdvancePeriod}
                                        disabled={hostingActionLoading}
                                        className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {hosting.status === "cleanup"
                                            ? "Recheck cleanup"
                                            : "Simulate period end"}
                                    </button>
                                ) : null}
                                */}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">
                                Only the Arena owner controls hosting.
                            </p>
                        )}
                    </>
                ) : null}

                {/* Simulated-purchase confirm step, driven straight off the redux unlock
                    state. Rendered OUTSIDE the "locked" branch so the success screen
                    survives the unlock flipping this Arena to unlocked. */}
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

                {/* Tier change. The backend decides charge-now vs defer-to-renewal, so
                    the confirm copy stays neutral and the success screen shows the
                    server's own message, which states which one happened. */}
                {tierDialog ? (
                    <PurchaseFlowDialog
                        open
                        kind="arena_hosting"
                        eyebrow="simulated billing"
                        title={`Switch to ${getArenaHostingOffer(tierDialog).name}`}
                        description={
                            availableTiers.find((item) => item.tier === tierDialog)?.summary ||
                            "An upgrade is charged now and starts immediately. A downgrade, or any change made during the included month, starts at your next renewal instead."
                        }
                        offer={{
                            name: getArenaHostingOffer(tierDialog).name,
                            priceLabel: getArenaHostingOffer(tierDialog).priceLabel,
                            cadenceLabel: getArenaHostingOffer(tierDialog).cadenceLabel,
                        }}
                        confirmLabel={
                            availableTiers.find((item) => item.tier === tierDialog)
                                ?.action_label ?? `Confirm ${getArenaHostingOffer(tierDialog).name}`
                        }
                        submittingLabel="Applying hosting change…"
                        status={
                            hostingActionLoading
                                ? "submitting"
                                : hostingActionError
                                    ? "error"
                                    : hostingActionMessage
                                        ? "success"
                                        : "idle"
                        }
                        errorMessage={hostingActionError}
                        successTitle="Hosting updated"
                        successMessage={hostingActionMessage}
                        onConfirm={handleConfirmTier}
                        onClose={handleCloseTierDialog}
                    />
                ) : null}

                {/* Scheduling a pause permanently consumes the included month — even if
                    the pause is cancelled later — so it is confirmed rather than fired
                    straight off the button. */}
                {pauseConfirmOpen && hosting ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="arena-pause-title"
                        onClick={() => {
                            if (!hostingActionLoading) setPauseConfirmOpen(false);
                        }}
                    >
                        <div
                            className="w-full max-w-sm space-y-4 rounded-2xl border border-white/15 bg-black/90 p-5 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                                    are you sure?
                                </p>
                                <p id="arena-pause-title" className="text-sm text-gray-200">
                                    Pause this Arena at the end of the current period?
                                </p>
                            </div>
                            <p className="text-[11px] leading-5 text-gray-400">
                                Your Arena stays fully open until then, and you can cancel the pause
                                any time before it takes effect. After it does, the Arena becomes
                                read-only — identity, members, history, standings and the permanent
                                unlock are all preserved.
                            </p>
                            {hosting.status === "included_month" ? (
                                <p className="rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                                    This uses up your included {ARENA_INCLUDED_TIER_LABEL} month. Cancelling the pause
                                    later does not bring it back.
                                    {hosting.scheduled_tier
                                        ? ` Your scheduled ${arenaTierLabel(
                                            hosting.scheduled_tier
                                        )} will also be cancelled.`
                                        : ""}
                                </p>
                            ) : null}
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPauseConfirmOpen(false)}
                                    disabled={hostingActionLoading}
                                    className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-200 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSchedulePause}
                                    disabled={hostingActionLoading}
                                    className="rounded-full border border-amber-300/70 bg-amber-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-50 transition hover:border-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {hostingActionLoading ? "working..." : "Schedule pause"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {canRespondToTransfer && transfer ? (
                <section className="space-y-4 border-t border-sky-300/15 pt-6">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-100">
                            Ownership invitation
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-gray-400">
                            @{transfer.from_owner?.username ?? "The current owner"} invited you to take
                            ownership of this Arena. Accepting keeps its permanent unlock, hosting
                            state, members, contests, and history.
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-200">
                            This invitation expires {formatDateTime(transfer.expires_at)}.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={transferActionLoading}
                            onClick={() => handleOwnershipResponse(true)}
                            className="rounded-xl bg-sky-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-sky-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Accept ownership
                        </button>
                        <button
                            type="button"
                            disabled={transferActionLoading}
                            onClick={() => handleOwnershipResponse(false)}
                            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </div>
                </section>
            ) : null}

            {isOwner ? (
                <section className="space-y-4 border-t border-white/10 pt-6">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
                            Transfer ownership
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                            The permanent unlock, hosting history, and included-month record stay with
                            this Arena. The new owner does not need personal Pro and must accept the
                            invitation before ownership changes.
                        </p>
                    </div>
                    {canCancelTransfer && transfer ? (
                        <div className="space-y-3 rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3">
                            <p className="text-xs leading-5 text-amber-100">
                                Waiting for @{transfer.to_user?.username ?? transfer.to_user_id} to
                                accept ownership by {formatDateTime(transfer.expires_at)}.
                            </p>
                            <button
                                type="button"
                                onClick={handleCancelOwnershipTransfer}
                                disabled={transferActionLoading}
                                className="rounded-lg border border-amber-200/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Withdraw invitation
                            </button>
                        </div>
                    ) : transferCandidates.length ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                                aria-label="New Arena owner"
                                value={newOwnerUserId}
                                onChange={(event) => setNewOwnerUserId(event.target.value)}
                                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/60"
                            >
                                <option value="">Choose an active member</option>
                                {transferCandidates.map((membership) => (
                                    <option key={membership.id} value={membership.user_id}>
                                        @{membership.profiles?.username ?? membership.user_id} ·{" "}
                                        {roleLabel(membership.role ?? "member")}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleOwnershipTransfer}
                                disabled={!newOwnerUserId || transferActionLoading}
                                className="rounded-xl border border-amber-300/35 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Send transfer invitation
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">
                            Ownership can only move to an existing Arena member. Invite someone first.
                        </p>
                    )}
                </section>
            ) : null}

            {isOwner ? (
                <section className="space-y-4 border-t border-red-400/15 pt-6">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-red-200">
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
                        className="w-full rounded-xl border border-red-300/20 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                    />
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteConfirmation !== arena.name || arenaDeleteLoading}
                        className="rounded-xl border border-red-300/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {arenaDeleteLoading && !arenaDeleteOtpSent
                            ? "Sending code…"
                            : "Delete Arena permanently"}
                    </button>
                </section>
            ) : null}

            {/* Step 2 of the delete. Reuses the League code dialog so both flows
                look and behave identically. */}
            <DeleteGroupConfirmationModal
                open={arenaDeleteOtpSent}
                confirmationValue={deleteOtp}
                hasPermission={isOwner}
                isDeleting={arenaDeleteOtpSent}
                errorMessage={arenaDeleteError}
                onConfirmationChange={setDeleteOtp}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
            />
        </div>
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
    const { hosting, unlock, arenaContests, loading: arenaLoader, error: arenaErr } = useSelector((state: RootState) => state.arena);

    useEffect(() => {
        if (!arenaId || !currentUser) return;

        dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        dispatch(fetchGroupOwnerPlanDetailsRequest({ group_id: arenaId }));
        dispatch(fetchArenaHostingDetailsRequest({ arena_id: arenaId }));
        dispatch(fetchArenaContestsRequest({ arena_id: arenaId }));
        dispatch(fetchArenaOwnershipTransferRequest({ arena_id: arenaId }));
        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: arenaId,
                page: 1,
                limit: 10,
            })
        );
    }, [arenaId, currentUser, dispatch]);

    const currentMembership = arena?.current_user_member?.role ?? "undefined";
    const isOwner = currentMembership === "commissioner";
    const feedSectionActive =
        activeTab === "feed" || activeTab === "contests" || activeTab === "leaderboard";
    const activePrimaryTab: ArenaPrimaryTabId =
        activeTab === "members" || activeTab === "settings" ? activeTab : "feed";
    const activeFeedTab: ArenaFeedTabId =
        activeTab === "contests" || activeTab === "leaderboard" ? activeTab : "feed";
    // const writable = isArenaWritable(hosting) && unlock.status === "unlocked";
    const managerLimit = hosting?.manager_limit ?? "Custom";

    const handleTabChange = (tab: ArenaTabId) => {
        // The URL param, never the record's id — a stale record here would launder
        // the previous group's id into the authoritative route param.
        router.replace(tab === "feed" ? `/arena/${arenaId}` : `/arena/${arenaId}?tab=${tab}`);
    };

    const memberCount = arena?.member_count ?? arena?.members?.length ?? 0;
    const activeContestCount = arena?.active_contest ?? 0;

    if (scopedArena.status === "missing") {
        return (
            <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
                Group not found. Head back to Home and pick a different crew.
            </div>
        );
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
            <div className="-mx-5 flex items-center justify-between gap-3 px-5 sm:mx-0 sm:px-0">
                <BackButton label="back to all groups" fallback="/arena" preferFallback />
                {arena?.invite_code ? (
                    <InviteCodeCopy code={arena?.invite_code} className="-mr-[5px]" />
                ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                        Invite locked
                    </span>
                )}
            </div>

            <header className="-mx-5 border-b border-white/10 px-5 pb-3 sm:mx-0 sm:px-0">
                <div className="relative min-w-0">
                    <div
                        className={`flex items-start justify-between gap-3 text-gray-400 ${groupPreviewMetaTextClassName}`}
                    >
                        <div className="flex min-w-0 flex-wrap gap-2">
                            {arena && (
                                <>
                                    <span>{getGroupCapacityLabel(arena, memberCount)}</span>
                                    <span>
                                        {getCombinedContestCapacityLabel(
                                            arena,
                                            [],
                                            []
                                        )}
                                    </span>
                                </>
                            )}
                        </div>
                        <ArenaDetailsLabel
                            role={arena?.current_user_member?.role ?? "member"}
                            hosting={hosting}
                            managerCount={arena?.manager_count ?? 0}
                            managerLimit={managerLimit}
                        />
                    </div>
                    <h1
                        className="allow-caps mt-1.5 text-2xl font-extrabold text-transparent bg-clip-text sm:text-3xl"
                        style={displayNameGradientStyle}
                    >
                        {arena?.name}
                    </h1>
                    {arena?.description ? (
                        <p className="mt-1.5 max-w-2xl truncate text-xs text-gray-500">
                            {arena.description}
                        </p>
                    ) : null}
                </div>
            </header>

            <section className="-mx-5 -mt-3 border-b border-white/10 px-5 sm:mx-0 sm:px-0">
                <ArenaTabStrip activeTab={activePrimaryTab} onChange={handleTabChange} />
                {feedSectionActive ? (
                    <div className="border-t border-white/[0.04]">
                        <ArenaFeedTabStrip activeTab={activeFeedTab} onChange={handleTabChange} />
                    </div>
                ) : null}
            </section>

            <main>
                {feedSectionActive ? (
                    <div
                        id="arena-feed-panel"
                        role="tabpanel"
                        aria-labelledby={`arena-feed-tab-${activeFeedTab}`}
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
                            />
                        ) : null}

                        {activeTab === "contests" ? (
                            <ArenaContestsPanel
                                currentUserId={currentUser?.userId}
                                arena={arena}
                                arenaId={arenaId}
                                contests={arenaContests}
                                role={currentMembership}
                                hosting={hosting}
                                writable={isArenaStaffRole(currentMembership)}
                                activeContestCount={arenaContests.length}
                            />
                        ) : null}

                        {activeTab === "leaderboard" ? (
                            <ArenaLeaderboardPanel />
                        ) : null}
                    </div>
                ) : null}

                {activeTab === "members" ? (
                    <ArenaMembersPanel
                        arenaId={arenaId}
                        memberships={arenaMembers ?? []}
                        currentUserId={currentUser?.userId}
                        currentRole={currentMembership}
                        writable={currentMembership === "commissioner"}
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
                        members={arenaMembers ?? []}
                        onDeleteSuccess={() => router.replace("/home")}
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
        </div>
    );
};

export default ArenaDashboard;
