import { Contest, CurrentUser, Group, GroupObject, GroupType, HostingTier, UserPlan } from "../interfaces/interfaces";

export type GroupLimits = {
    maxMembers: number;
    maxActiveContests: number;
};

export type PlanLimits = {
    maxOwnedLeagues: number | "unlimited";
    maxOwnedArenas: number;
};

export const FREE_LEAGUE_LIMITS: GroupLimits = {
    maxMembers: 10,
    maxActiveContests: 3,
};

export const PRO_LEAGUE_LIMITS: GroupLimits = {
    maxMembers: 15,
    maxActiveContests: 6,
};

export const PRO_ARENA_LIMITS: GroupLimits = {
    maxMembers: 50,
    maxActiveContests: 6,
};

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
    free: {
        maxOwnedLeagues: 3,
        maxOwnedArenas: 0,
    },
    pro: {
        maxOwnedLeagues: "unlimited",
        maxOwnedArenas: 3,
    },
};

export const DEFAULT_GROUP_TYPE: GroupType = "league";
export const DEFAULT_USER_PLAN: UserPlan = "free";
export const DEFAULT_HOSTING_TIER: HostingTier = "free";

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
    league: "League",
    arena: "Arena",
};

export const HOSTING_TIER_LABELS: Record<HostingTier, string> = {
    free: "Free",
    pro: "Pro",
};

export const normalizeUserPlan = (plan?: string | null): UserPlan =>
    plan === "pro" ? "pro" : "free";

export const normalizeGroupType = (groupType?: string | null): GroupType =>
    groupType === "arena" ? "arena" : "league";

export const normalizeHostingTier = (hostingTier?: string | null): HostingTier =>
    hostingTier === "pro" ? "pro" : "free";

export const getGroupLimits = (groupType: GroupType, hostingTier: HostingTier): GroupLimits => {
    if (groupType === "arena") return PRO_ARENA_LIMITS;
    return hostingTier === "pro" ? PRO_LEAGUE_LIMITS : FREE_LEAGUE_LIMITS;
};

export const getLimitsForCreatedGroup = (user: CurrentUser, groupType: GroupType): {
    hostingTier: HostingTier;
    limits: GroupLimits;
} => {
    const hostingTier = groupType === "arena" || normalizeUserPlan(user.plan) === "pro" ? "pro" : "free";
    return {
        hostingTier,
        limits: getGroupLimits(groupType, hostingTier),
    };
};

export type LeagueSettingsInput = Pick<
    GroupObject,
    "group_type" | "hosting_tier" | "max_members" | "max_active_contests" | "is_enable_secondary_leaderboard"
>;

export const normalizeLeagueSettings = (
    league: LeagueSettingsInput,
    fallbackEnableSecondaryLeaderboards = false
): {
    is_enable_secondary_leaderboard: boolean;
    max_members: number;
    max_active_contests: number;
} => {
    const groupType = normalizeGroupType(league.group_type);
    const hostingTier = groupType === "arena" ? "pro" : normalizeHostingTier(league.hosting_tier);
    const limits = getGroupLimits(groupType, hostingTier);
    return {
        is_enable_secondary_leaderboard:
            league.is_enable_secondary_leaderboard ?? fallbackEnableSecondaryLeaderboards,
        max_members:
            typeof league.max_members === "number" && league.max_members > 0
                ? league.max_members
                : limits.maxMembers,
        max_active_contests:
            typeof league.max_active_contests === "number" &&
                league.max_active_contests > 0
                ? league.max_active_contests
                : limits.maxActiveContests,
    };
};

export const normalizeLeague = (
    league: GroupObject,
    fallbackEnableSecondaryLeaderboards = false
): GroupObject => {
    const groupType = normalizeGroupType(league.group_type);
    const hostingTier = groupType === "arena" ? "pro" : normalizeHostingTier(league.hosting_tier);
    const groupSetting = normalizeLeagueSettings(
        { ...league, group_type: groupType, hosting_tier: hostingTier },
        fallbackEnableSecondaryLeaderboards
    )
    return {
        ...league,
        group_type: groupType,
        hosting_tier: hostingTier,
        max_members: groupSetting.max_members,
        max_active_contests: groupSetting.max_active_contests
    };
};

export const getOwnedLeagueCount = (
    leagues: GroupObject[],
    userId: string,
    excludingLeagueId?: string
) =>
    leagues.filter(
        (league) =>
            league.created_by === userId &&
            league.id !== excludingLeagueId &&
            normalizeGroupType(league.group_type) === "league"
    ).length;

export const getOwnedArenaCount = (
    leagues: GroupObject[],
    userId: string,
    excludingLeagueId?: string
) =>
    leagues.filter(
        (league) =>
            league.created_by === userId &&
            league.id !== excludingLeagueId &&
            normalizeGroupType(league.group_type) === "arena"
    ).length;

export const isActiveContest = (contest: Contest) => contest.status === "ACTIVE";

export const getActiveContestCount = (contests: Contest[], leagueId: string) =>
    contests.filter((contest) => contest.group_id === leagueId && isActiveContest(contest)).length;

export const getGroupCapacityLabel = (league: LeagueSettingsInput, memberCount: number) => {
    const settings = normalizeLeagueSettings(league);
    return `${memberCount}/${settings.max_members} members`;
};

export const getActiveContestCapacityLabel = (league: GroupObject, contests: Contest[]) => {
    const settings = normalizeLeagueSettings(league);
    return `${getActiveContestCount(contests, league.id)}/${settings.max_active_contests} active contests`;
};

export const getActiveContestCountsLabel = (league: LeagueSettingsInput, contestsCounts: number) => {
    const settings = normalizeLeagueSettings(league);
    return `${contestsCounts}/${settings.max_active_contests} active contests`;
};

export const canCreateGroup = (
    user: CurrentUser | undefined,
    groupType: GroupType,
    arenaCount: number,
    leagueCount: number,
): { allowed: true } | { allowed: false; error: string } => {
    if (!user) {
        return {
            allowed: false,
            error: groupType === "arena" ? "Sign in to create an Arena." : "Sign in to create a league.",
        };
    }

    const plan = normalizeUserPlan(user.plan);
    if (groupType === "arena") {
        if (plan !== "pro") {
            return { allowed: false, error: "Upgrade to Pro to create an Arena." };
        }
        if (arenaCount >= PLAN_LIMITS.pro.maxOwnedArenas) {
            return { allowed: false, error: "Founding Pro includes up to 3 Arenas." };
        }
        return { allowed: true };
    }

    if (plan === "free") {
        const maxOwnedLeagues = PLAN_LIMITS.free.maxOwnedLeagues;
        if (maxOwnedLeagues !== "unlimited" && leagueCount >= maxOwnedLeagues) {
            return { allowed: false, error: "Free users can host up to 3 leagues." };
        }
    }

    return { allowed: true };
};

export const canJoinGroup = (league: GroupObject): { allowed: true } | { allowed: false; error: string } => {
    const settings = normalizeLeagueSettings(league);
    if (league.member_count >= settings.max_members) {
        return {
            allowed: false,
            error: normalizeGroupType(league.group_type) === "arena" ? "This Arena is full." : "This league is full.",
        };
    }
    return { allowed: true };
};

export const canCreateContestInGroup = (
    league: Group | null,
    activeContestCount: number,
): { allowed: true } | { allowed: false; error: string } => {
    if (!league) return { allowed: false, error: "Unable to create contest" };
    const settings = normalizeLeagueSettings(league);
    if (activeContestCount >= settings.max_active_contests) {
        return { allowed: false, error: "This group has reached its active contest limit." };
    }
    return { allowed: true };
};

export const canTransferGroupOwnership = ({
    league,
    recipient,
    leagues,
}: {
    league: GroupObject;
    recipient: CurrentUser | undefined;
    leagues: GroupObject[];
}): { allowed: true } | { allowed: false; error: string } => {
    if (!recipient) {
        return { allowed: false, error: "User not found." };
    }

    const groupType = normalizeGroupType(league.group_type);
    const hostingTier = normalizeHostingTier(league.hosting_tier);
    const recipientPlan = normalizeUserPlan(recipient.plan);

    if (groupType === "arena") {
        if (recipientPlan !== "pro") {
            return { allowed: false, error: "Upgrade to Pro to own this group." };
        }
        if (getOwnedArenaCount(leagues, recipient.userId, league.id) >= PLAN_LIMITS.pro.maxOwnedArenas) {
            return { allowed: false, error: "Founding Pro includes up to 3 Arenas." };
        }
        return { allowed: true };
    }

    if (hostingTier === "pro" && recipientPlan !== "pro") {
        return { allowed: false, error: "Upgrade to Pro to own this group." };
    }

    if (hostingTier === "free" && recipientPlan === "free") {
        const maxOwnedLeagues = PLAN_LIMITS.free.maxOwnedLeagues;
        if (maxOwnedLeagues !== "unlimited" && getOwnedLeagueCount(leagues, recipient.userId, league.id) >= maxOwnedLeagues) {
            return { allowed: false, error: "Free users can host up to 3 leagues." };
        }
    }

    return { allowed: true };
};

export type DowngradeBlockers = {
    ownedArenas: GroupObject[];
    proHostedLeagues: GroupObject[];
    ownedLeagueCount: number;
    maxFreeLeagues: number;
};

export const getDowngradeBlockers = (
    user: CurrentUser | undefined,
    leagues: GroupObject[]
): DowngradeBlockers => {
    const userId = user?.userId ?? "";
    const ownedGroups = leagues.filter((league) => league.created_by === userId);
    const maxFreeLeagues =
        PLAN_LIMITS.free.maxOwnedLeagues === "unlimited"
            ? Number.POSITIVE_INFINITY
            : PLAN_LIMITS.free.maxOwnedLeagues;

    return {
        ownedArenas: ownedGroups.filter((league) => normalizeGroupType(league.group_type) === "arena"),
        proHostedLeagues: ownedGroups.filter(
            (league) =>
                normalizeGroupType(league.group_type) === "league" &&
                normalizeHostingTier(league.hosting_tier) === "pro"
        ),
        ownedLeagueCount: ownedGroups.filter(
            (league) => normalizeGroupType(league.group_type) === "league"
        ).length,
        maxFreeLeagues,
    };
};

export const canDowngradeToFree = (
    user: CurrentUser | undefined,
    leagues: GroupObject[]
): { allowed: true } | { allowed: false; error: string; blockers: DowngradeBlockers } => {
    const blockers = getDowngradeBlockers(user, leagues);

    if (!user) {
        return { allowed: false, error: "Sign in to manage your plan.", blockers };
    }
    if (normalizeUserPlan(user.plan) === "free") {
        return { allowed: true };
    }
    if (blockers.ownedArenas.length > 0 || blockers.proHostedLeagues.length > 0) {
        return {
            allowed: false,
            error: "Transfer or delete Pro-hosted groups before switching to Free.",
            blockers,
        };
    }
    if (blockers.ownedLeagueCount > blockers.maxFreeLeagues) {
        return {
            allowed: false,
            error: "Free users can host up to 3 leagues.",
            blockers,
        };
    }

    return { allowed: true };
};

export const getGroupTypeLabel = (group_type: GroupType) => GROUP_TYPE_LABELS[normalizeGroupType(group_type)];

export const getHostingTierLabel = (hosting_tier: HostingTier) =>
    `${HOSTING_TIER_LABELS[normalizeHostingTier(hosting_tier)]}-hosted`;
