import type {
    ArenaHosting,
    ArenaHostingStatus,
    ArenaIdentity,
    ArenaMembership,
    ArenaRole,
    ArenaTotal,
    CommunityDomainState,
    StructuredFeedContest,
} from "@/lib/domain/community";
import { canWriteArenaHosting } from "@/lib/domain/community";
import { arenaTierLabel } from "@/lib/arenas/tierLabels";
import { Group } from "@/lib/interfaces/interfaces";

const ACTIVE_ARENA_CONTEST_STATUSES = new Set<StructuredFeedContest["lifecycleStatus"]>([
    "draft",
    "scheduled",
    "open",
    "locked",
    "grading",
]);

export const WRITABLE_ARENA_HOSTING_STATUSES = new Set<ArenaHostingStatus>([
    "included_month",
    "active",
    "pause_scheduled",
]);

export const getArenaById = (community: CommunityDomainState, arenaId: string) =>
    community.arenas.find(
        (arena) => arena.id === arenaId && arena.lifecycleStatus === "active"
    );

export const getArenaUnlock = (community: CommunityDomainState, arenaId: string) =>
    community.arenaUnlocks.find((unlock) => unlock.arenaId === arenaId);

export const getArenaHosting = (community: CommunityDomainState, arenaId: string) =>
    community.arenaHostings.find((hosting) => hosting.arenaId === arenaId);

export const getActiveArenaMemberships = (
    community: CommunityDomainState,
    arenaId: string
) =>
    community.arenaMemberships.filter(
        (membership) => membership.arenaId === arenaId && membership.status === "active"
    );

export const getArenaMembership = (
    community: CommunityDomainState,
    arenaId: string,
    userId: string
) =>
    community.arenaMemberships.find(
        (membership) =>
            membership.arenaId === arenaId &&
            membership.userId === userId &&
            membership.status === "active"
    );

export const getArenaRole = (
    community: CommunityDomainState,
    arenaId: string,
    userId: string
): ArenaRole | null => getArenaMembership(community, arenaId, userId)?.role ?? null;

export const isArenaStaffRole = (role: ArenaRole | null | undefined) =>
    role === "owner" || role === "manager";

export const getArenaUsage = (
    community: CommunityDomainState,
    arenaId: string
) => {
    const memberships = getActiveArenaMemberships(community, arenaId);
    const contests = community.structuredFeedContests.filter(
        (contest) =>
            contest.context.type === "arena" &&
            contest.context.arenaId === arenaId &&
            ACTIVE_ARENA_CONTEST_STATUSES.has(contest.lifecycleStatus)
    );

    return {
        participatingMemberCount: memberships.filter((membership) => membership.role === "member")
            .length,
        managerCount: memberships.filter((membership) => membership.role === "manager").length,
        activeContestCount: contests.length,
    };
};

export const isArenaWritable = (
    hosting: ArenaHosting | undefined,
    now = new Date().toISOString()
) =>
    Boolean(
        hosting &&
        WRITABLE_ARENA_HOSTING_STATUSES.has(hosting.status) &&
        canWriteArenaHosting({ hosting, now }).allowed
    );

export const getArenaTierLabel = (hosting: ArenaHosting | undefined) =>
    arenaTierLabel(hosting?.tier);

export const getArenaHostingStatusLabel = (hosting: ArenaHosting | undefined) => {
    if (!hosting) return "Not started";
    const labels: Record<ArenaHostingStatus, string> = {
        not_started: "Locked",
        included_month: "Included month",
        active: "Active",
        past_due: "Past due",
        pause_scheduled: "Pause scheduled",
        cleanup: "Cleanup",
        paused: "Paused",
    };
    return labels[hosting.status];
};

export const getArenaPreviewLeague = ({
    arena,
    memberships,
    hosting,
}: {
    arena: ArenaIdentity;
    memberships: readonly ArenaMembership[];
    hosting: ArenaHosting | undefined;
}): Group => {
    const limits = hosting?.limits ?? {
        participatingMemberLimit: 0,
        managerLimit: 0,
        activeContestLimit: 0,
    };
    return {
        id: arena.id,
        name: arena.name,
        description: arena.description || undefined,
        invite_code: arena.inviteCode ?? "LOCKED",
        created_by: arena.ownerUserId,
        members: memberships
            .filter((membership) => membership.status === "active")
            .map((membership) => membership.userId),
        group_type: "arena",
        hosting_tier: "pro",
        is_enable_secondary_leaderboard: false,
        max_members: limits.participatingMemberLimit ?? 0,
        max_active_contests: limits.activeContestLimit ?? 0,
    };
};

export const getArenaParticipantCapacityLabel = (
    community: CommunityDomainState,
    arenaId: string
) => {
    const hosting = getArenaHosting(community, arenaId);
    const usage = getArenaUsage(community, arenaId);
    const limit = hosting?.limits.participatingMemberLimit ?? 0;
    return `${usage.participatingMemberCount}/${limit} members`;
};

export const getArenaContestCapacityLabel = (
    community: CommunityDomainState,
    arenaId: string
) => {
    const hosting = getArenaHosting(community, arenaId);
    const usage = getArenaUsage(community, arenaId);
    const limit = hosting?.limits.activeContestLimit ?? 0;
    return `${usage.activeContestCount}/${limit} contests`;
};

export const getArenaTotalsByPoints = (
    totals: readonly ArenaTotal[],
    arenaId: string,
    staffUserIds: ReadonlySet<string>
) =>
    totals
        .filter((total) => total.arenaId === arenaId && !staffUserIds.has(total.userId))
        .slice()
        .sort((left, right) => {
            if (left.finalizedArenaPoints !== right.finalizedArenaPoints) {
                return right.finalizedArenaPoints - left.finalizedArenaPoints;
            }
            return left.computedAt.localeCompare(right.computedAt);
        });
