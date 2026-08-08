import type { DomainDecision } from "./policies";
import type {
    ArenaHosting,
    ArenaMembership,
    IsoDateTime,
    StructuredFeedContest,
} from "./types";

const allow = (): DomainDecision => ({ allowed: true });
const deny = (code: string, reason: string): DomainDecision => ({ allowed: false, code, reason });

const timestamp = (value: IsoDateTime | null): number | null => {
    if (value === null) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const belongsToArena = (membership: ArenaMembership, arenaId: string): boolean =>
    membership.arenaId === arenaId;

export interface ArenaMembershipCounts {
    participatingMemberCount: number;
    managerCount: number;
    ownerCount: number;
}

/** Owners, managers, and inactive history never consume participating-member capacity. */
export function getArenaMembershipCounts(input: {
    arenaId: string;
    memberships: readonly ArenaMembership[];
}): ArenaMembershipCounts {
    return input.memberships.reduce<ArenaMembershipCounts>(
        (counts, membership) => {
            if (!belongsToArena(membership, input.arenaId) || membership.status !== "active") {
                return counts;
            }
            if (membership.role === "member") counts.participatingMemberCount += 1;
            if (membership.role === "manager") counts.managerCount += 1;
            if (membership.role === "owner") counts.ownerCount += 1;
            return counts;
        },
        { participatingMemberCount: 0, managerCount: 0, ownerCount: 0 },
    );
}

export function countActiveArenaParticipatingMembers(
    memberships: readonly ArenaMembership[],
    arenaId: string,
): number {
    return getArenaMembershipCounts({ arenaId, memberships }).participatingMemberCount;
}

export function countActiveArenaManagers(
    memberships: readonly ArenaMembership[],
    arenaId: string,
): number {
    return getArenaMembershipCounts({ arenaId, memberships }).managerCount;
}

const ACTIVE_CONTEST_STATUSES: ReadonlySet<StructuredFeedContest["lifecycleStatus"]> = new Set([
    "draft",
    "scheduled",
    "open",
    "locked",
    "grading",
]);

export function countActiveArenaContests(
    contests: readonly StructuredFeedContest[],
    arenaId: string,
): number {
    return contests.filter(
        (contest) =>
            contest.context.type === "arena" &&
            contest.context.arenaId === arenaId &&
            ACTIVE_CONTEST_STATUSES.has(contest.lifecycleStatus),
    ).length;
}

function hostingBoundary(hosting: ArenaHosting): IsoDateTime | null {
    if (hosting.status === "included_month") return hosting.includedMonthEndsAt;
    if (hosting.status === "pause_scheduled") {
        return (
            hosting.pauseScheduledFor ??
            hosting.paidThroughAt ??
            hosting.periodEndsAt ??
            hosting.includedMonthEndsAt
        );
    }
    if (hosting.status === "active") return hosting.paidThroughAt ?? hosting.periodEndsAt;
    return null;
}

/**
 * General write gate for Feed, membership, entry, announcement, and contest
 * mutations. Cleanup and paused Arenas remain readable through separate views.
 */
export function canWriteArenaHosting(input: {
    hosting: ArenaHosting;
    now: IsoDateTime;
}): DomainDecision {
    const writableStatus =
        input.hosting.status === "included_month" ||
        input.hosting.status === "active" ||
        input.hosting.status === "pause_scheduled";
    if (!writableStatus) {
        return deny(
            "arena_hosting_read_only",
            "Arena hosting is not active, so this Arena is currently read-only.",
        );
    }
    const boundary = hostingBoundary(input.hosting);
    if (boundary === null || timestamp(boundary) === null) {
        return deny(
            "arena_hosting_period_missing",
            "A current hosting period is required before changing this Arena.",
        );
    }
    if (Date.parse(input.now) >= Date.parse(boundary)) {
        return deny(
            "arena_hosting_period_ended",
            "This Arena's writable hosting period has ended.",
        );
    }
    return allow();
}

function ensureHostingMatchesArena(hosting: ArenaHosting, arenaId: string): DomainDecision {
    return hosting.arenaId === arenaId
        ? allow()
        : deny("arena_mismatch", "The hosting record does not belong to this Arena.");
}

function findActiveMembership(
    memberships: readonly ArenaMembership[],
    arenaId: string,
    userId: string,
): ArenaMembership | null {
    return (
        memberships.find(
            (membership) =>
                membership.arenaId === arenaId &&
                membership.userId === userId &&
                membership.status === "active",
        ) ?? null
    );
}

export function canJoinArena(input: {
    arenaId: string;
    userId: string;
    memberships: readonly ArenaMembership[];
    hosting: ArenaHosting;
    now: IsoDateTime;
}): DomainDecision {
    const matchingHosting = ensureHostingMatchesArena(input.hosting, input.arenaId);
    if (!matchingHosting.allowed) return matchingHosting;
    if (findActiveMembership(input.memberships, input.arenaId, input.userId)) {
        return deny("already_active_arena_member", "This user is already active in the Arena.");
    }
    const writable = canWriteArenaHosting(input);
    if (!writable.allowed) return writable;
    const count = countActiveArenaParticipatingMembers(input.memberships, input.arenaId);
    const limit = input.hosting.limits.participatingMemberLimit;
    return limit !== null && count >= limit
        ? deny(
            "arena_member_capacity_reached",
            "This Arena has reached its active participating-member limit.",
        )
        : allow();
}

export function canPromoteArenaMemberToManager(input: {
    arenaId: string;
    userId: string;
    memberships: readonly ArenaMembership[];
    hosting: ArenaHosting;
    now: IsoDateTime;
    blockingContestIds?: readonly string[];
}): DomainDecision {
    const matchingHosting = ensureHostingMatchesArena(input.hosting, input.arenaId);
    if (!matchingHosting.allowed) return matchingHosting;
    const writable = canWriteArenaHosting(input);
    if (!writable.allowed) return writable;
    const membership = findActiveMembership(input.memberships, input.arenaId, input.userId);
    if (!membership || membership.role !== "member") {
        return deny(
            "promotion_requires_active_member",
            "Only an active participating member can be promoted to manager.",
        );
    }
    if ((input.blockingContestIds?.length ?? 0) > 0) {
        return deny(
            "promotion_blocked_by_contest_participation",
            "Resolve or withdraw active contest participation before promoting this member.",
        );
    }
    const managerCount = countActiveArenaManagers(input.memberships, input.arenaId);
    const managerLimit = input.hosting.limits.managerLimit;
    return managerLimit !== null && managerCount >= managerLimit
        ? deny("arena_manager_capacity_reached", "This Arena has reached its manager limit.")
        : allow();
}

export function canDemoteArenaManagerToMember(input: {
    arenaId: string;
    userId: string;
    memberships: readonly ArenaMembership[];
    hosting: ArenaHosting;
    now: IsoDateTime;
}): DomainDecision {
    const matchingHosting = ensureHostingMatchesArena(input.hosting, input.arenaId);
    if (!matchingHosting.allowed) return matchingHosting;
    const writable = canWriteArenaHosting(input);
    if (!writable.allowed) return writable;
    const membership = findActiveMembership(input.memberships, input.arenaId, input.userId);
    if (!membership || membership.role !== "manager") {
        return deny(
            "demotion_requires_active_manager",
            "Only an active manager can be demoted to a participating member.",
        );
    }
    const participatingCount = countActiveArenaParticipatingMembers(
        input.memberships,
        input.arenaId,
    );
    const participatingLimit = input.hosting.limits.participatingMemberLimit;
    return participatingLimit !== null && participatingCount >= participatingLimit
        ? deny(
            "arena_member_capacity_reached",
            "Archive a participating member or choose a larger tier before this demotion.",
        )
        : allow();
}

export function canCreateArenaContest(input: {
    arenaId: string;
    hosting: ArenaHosting;
    contests: readonly StructuredFeedContest[];
    expectedEndsAt: IsoDateTime;
    now: IsoDateTime;
}): DomainDecision {
    const matchingHosting = ensureHostingMatchesArena(input.hosting, input.arenaId);
    if (!matchingHosting.allowed) return matchingHosting;
    const writable = canWriteArenaHosting(input);
    if (!writable.allowed) return writable;
    const activeContestLimit = input.hosting.limits.activeContestLimit;
    if (
        activeContestLimit !== null &&
        countActiveArenaContests(input.contests, input.arenaId) >= activeContestLimit
    ) {
        return deny(
            "arena_contest_capacity_reached",
            "This Arena has reached its active contest limit.",
        );
    }
    if (input.hosting.status === "pause_scheduled") {
        const paidThroughAt =
            input.hosting.pauseScheduledFor ??
            input.hosting.paidThroughAt ??
            input.hosting.periodEndsAt;
        if (paidThroughAt === null || Date.parse(input.expectedEndsAt) > Date.parse(paidThroughAt)) {
            return deny(
                "contest_extends_beyond_paid_through",
                "A contest cannot extend beyond this Arena's scheduled pause date.",
            );
        }
    }
    return allow();
}

export function canManageArenaBilling(input: {
    arenaId: string;
    membership: ArenaMembership | null;
}): DomainDecision {
    const { membership } = input;
    return membership &&
        membership.arenaId === input.arenaId &&
        membership.status === "active" &&
        membership.role === "owner"
        ? allow()
        : deny("arena_billing_requires_owner", "Only the active Arena owner can manage billing.");
}

export function isActiveArenaStaff(
    membership: ArenaMembership | null | undefined,
): boolean {
    return (
        membership?.status === "active" &&
        (membership.role === "owner" || membership.role === "manager")
    );
}

export function isArenaCompetitiveMembership(
    membership: ArenaMembership | null | undefined,
): membership is ArenaMembership {
    return membership?.status === "active" && membership.role === "member";
}

export function canParticipateInArenaContest(
    membership: ArenaMembership | null | undefined,
): DomainDecision {
    if (isActiveArenaStaff(membership)) {
        return deny(
            "arena_staff_noncompetitive",
            "Arena owners and managers cannot compete inside their Arena.",
        );
    }
    return isArenaCompetitiveMembership(membership)
        ? allow()
        : deny(
            "active_arena_member_required",
            "Only an active participating member can enter an Arena contest.",
        );
}

export function canEarnArenaPoints(
    membership: ArenaMembership | null | undefined,
): DomainDecision {
    if (isActiveArenaStaff(membership)) {
        return deny(
            "arena_staff_points_ineligible",
            "Arena owners and managers cannot earn Arena Points in their Arena.",
        );
    }
    return isArenaCompetitiveMembership(membership)
        ? allow()
        : deny(
            "active_arena_member_required",
            "Only an active participating member can earn Arena Points.",
        );
}

/** Canonical source for member lists, standings, and Community Leaderboard eligibility. */
export function getArenaCompetitiveMemberships(input: {
    arenaId: string;
    memberships: readonly ArenaMembership[];
}): ArenaMembership[] {
    return input.memberships.filter(
        (membership) =>
            membership.arenaId === input.arenaId && isArenaCompetitiveMembership(membership),
    );
}

export function excludeArenaStaffUserIds(input: {
    arenaId: string;
    userIds: readonly string[];
    memberships: readonly ArenaMembership[];
}): string[] {
    const eligibleUserIds = new Set(
        getArenaCompetitiveMemberships(input).map((membership) => membership.userId),
    );
    return input.userIds.filter((userId) => eligibleUserIds.has(userId));
}
