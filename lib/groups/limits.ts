import { StructuredFeedContest } from "../domain/community";
import { Contest, CurrentUser, Group, GroupObject, GroupType, HostingTier, UserPlan } from "../interfaces/interfaces";

export type GroupLimits = {
    maxMembers: number;
    maxActiveContests: number;
};

export type PlanLimits = {
    maxOwnedLeagues: number;
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

export const LEAGUE_FEED_CONTEST_LIMITS: Record<HostingTier, number> = {
    free: 1,
    pro: 3,
};

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
    free: {
        maxOwnedLeagues: 2,
        maxOwnedArenas: 0,
    },
    pro: {
        maxOwnedLeagues: 5,
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

/**
 * Input for the league capacity-label helpers: the league settings plus the few
 * fields those labels read directly. `id` / `active_contest` / `member_count` are
 * optional so a loosely typed `Group` (page state) works here just as well as a
 * fully-formed `GroupObject` (which also satisfies this shape).
 */
export type LeagueCapacityInput = LeagueSettingsInput & {
    id?: string;
    active_contest?: number;
    member_count?: number;
};

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

export const upgradeOwnedFreeLeaguesToPro = (leagues: GroupObject[], ownerId: string): GroupObject[] => {
    const proLeagueLimits = getGroupLimits("league", "pro");

    return leagues.map((league) => {
        if (
            league.created_by !== ownerId ||
            normalizeGroupType(league.group_type) !== "league" ||
            normalizeHostingTier(league.hosting_tier) === "pro"
        ) {
            return league;
        }

        const settings = normalizeLeagueSettings(league);
        return {
            ...league,
            groupType: "league",
            hostingTier: "pro",
            settings: {
                ...settings,
                maxMembers: proLeagueLimits.maxMembers,
                maxActiveContests: proLeagueLimits.maxActiveContests,
            },
        };
    });
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

export const getRegularMemberCount = (league: Pick<LeagueCapacityInput, "member_count">) =>
    // league.members.filter((memberId) => memberId !== league.created_by).length;
    league.member_count ?? 0;

export const getRegularMemberCapacityLabel = (league: LeagueCapacityInput) => {
    const settings = normalizeLeagueSettings(league);
    return `${getRegularMemberCount(league)}/${settings.max_members} regular members`;
};

const getMemberCapacityCount = (league: GroupObject) =>
    normalizeGroupType(league.group_type) === "league"
        ? getRegularMemberCount(league)
        : league.member_count;

export const isActiveContest = (contest: Contest) => contest.status === "ACTIVE";

export const getActiveContestCount = (contests: readonly Contest[], leagueId: string) =>
    contests.filter((contest) => contest.group_id === leagueId && isActiveContest(contest)).length;

export const ACTIVE_LEAGUE_FEED_CONTEST_STATUSES = [
    "scheduled",
    "open",
    "locked",
    "grading",
] as const satisfies readonly StructuredFeedContest["lifecycleStatus"][];

const activeLeagueFeedContestStatuses = new Set<StructuredFeedContest["lifecycleStatus"]>(
    ACTIVE_LEAGUE_FEED_CONTEST_STATUSES
);

export const isActiveLeagueFeedContest = (contest: StructuredFeedContest) =>
    contest.context.type === "league_feed" &&
    activeLeagueFeedContestStatuses.has(contest.lifecycleStatus);

export const getActiveLeagueFeedContestCount = (
    contests: readonly StructuredFeedContest[],
    leagueId: string
) =>
    contests.filter(
        (contest) =>
            isActiveLeagueFeedContest(contest) &&
            contest.context.type === "league_feed" &&
            contest.context.leagueId === leagueId
    ).length;

export const getLeagueFeedContestLimit = (league: Pick<GroupObject, "hosting_tier">) =>
    LEAGUE_FEED_CONTEST_LIMITS[normalizeHostingTier(league.hosting_tier)];

export const getGroupCapacityLabel = (league: LeagueSettingsInput, memberCount: number) => {
    const settings = normalizeLeagueSettings(league);
    // const capacity = getMemberCapacityCount(league);
    return `${memberCount}/${settings.max_members} members`;
};

export const getActiveContestCapacityLabel = (league: LeagueCapacityInput, contests: Contest[]) => {
    const settings = normalizeLeagueSettings(league);
    const label = normalizeGroupType(league.group_type) === "league"
        ? "active standard contests"
        : "active contests";
    return `${league.active_contest}/${settings.max_active_contests} ${label}`;
};

export const getActiveLeagueFeedContestCapacityLabel = (
    league: LeagueCapacityInput,
    contests: readonly StructuredFeedContest[]
) =>
    `${getActiveLeagueFeedContestCount(contests, league.id ?? "")}/${getLeagueFeedContestLimit(
        league
    )} active Feed contests`;

/** Compact preview count. Standard and Feed capacity remain independent. */
export const getCombinedContestCapacityLabel = (
    league: LeagueCapacityInput,
    // Kept for call-site compatibility; the label uses the server-provided
    // `active_contest` count rather than re-counting the standard contests here.
    _standardContests: readonly Contest[],
    feedContests: readonly StructuredFeedContest[]
) => {
    const settings = normalizeLeagueSettings(league);
    const activeContest = league.active_contest ?? 0;
    if (normalizeGroupType(league.group_type) !== "league") {
        return `${activeContest}/${settings.max_active_contests} contests`;
    }

    const feedCount = getActiveLeagueFeedContestCount(feedContests, league.id ?? "");
    const totalLimit = settings.max_active_contests + getLeagueFeedContestLimit(league);
    return `${activeContest + feedCount}/${totalLimit} contests`;
};

const getOwnedLeagueLimit = (plan: UserPlan) => {
    return PLAN_LIMITS[plan].maxOwnedLeagues;
};

const getOwnedLeagueLimitError = (plan: UserPlan) =>
    plan === "pro"
        ? "Pro users can host up to 5 leagues."
        : "Free users can host up to 2 leagues.";

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
        if (leagueCount >= maxOwnedLeagues) {
            return { allowed: false, error: "Free users can host up to 3 leagues." };
        }
    }

    // if (getOwnedLeagueCount(leagues, user.userId) >= getOwnedLeagueLimit(plan)) {
    //     return { allowed: false, error: getOwnedLeagueLimitError(plan) };
    // }

    return { allowed: true };
};

export const canJoinGroup = (league: GroupObject): { allowed: true } | { allowed: false; error: string } => {
    const settings = normalizeLeagueSettings(league);
    if (getMemberCapacityCount(league) >= settings.max_members) {
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

export const canCreateFeedContestInLeague = (
    league: GroupObject,
    contests: readonly StructuredFeedContest[]
): { allowed: true } | { allowed: false; error: string } => {
    if (normalizeGroupType(league.group_type) !== "league") {
        return { allowed: false, error: "League Feed contests require a League." };
    }
    if (
        getActiveLeagueFeedContestCount(contests, league.id) >=
        getLeagueFeedContestLimit(league)
    ) {
        return {
            allowed: false,
            error: "This League has reached its active Feed contest limit.",
        };
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

    if (
        getOwnedLeagueCount(leagues, recipient.userId, league.id) >=
        getOwnedLeagueLimit(recipientPlan)
    ) {
        return { allowed: false, error: getOwnedLeagueLimitError(recipientPlan) };
    }

    return { allowed: true };
};

// export type DowngradeBlockers = {
//     ownedArenas: GroupObject[];
//     proHostedLeagues: GroupObject[];
//     ownedLeagueCount: number;
//     maxFreeLeagues: number;
// };

// export const getDowngradeBlockers = (
//     user: CurrentUser | undefined,
//     leagues: GroupObject[]
// ): DowngradeBlockers => {
//     const userId = user?.userId ?? "";
//     const ownedGroups = leagues.filter((league) => league.created_by === userId);
//     const maxFreeLeagues =
//         PLAN_LIMITS.free.maxOwnedLeagues === "unlimited"
//             ? Number.POSITIVE_INFINITY
//             : PLAN_LIMITS.free.maxOwnedLeagues;

//     return {
//         ownedArenas: ownedGroups.filter((league) => normalizeGroupType(league.group_type) === "arena"),
//         proHostedLeagues: ownedGroups.filter(
//             (league) =>
//                 normalizeGroupType(league.group_type) === "league" &&
//                 normalizeHostingTier(league.hosting_tier) === "pro"
//         ),
//         ownedLeagueCount: ownedGroups.filter(
//             (league) => normalizeGroupType(league.group_type) === "league"
//         ).length,
//         maxFreeLeagues,
//     };
// };

// export const canDowngradeToFree = (
//     user: CurrentUser | undefined,
//     leagues: GroupObject[]
// ): { allowed: true } | { allowed: false; error: string; blockers: DowngradeBlockers } => {
//     const blockers = getDowngradeBlockers(user, leagues);

//     if (!user) {
//         return { allowed: false, error: "Sign in to manage your plan.", blockers };
//     }
//     if (normalizeUserPlan(user.plan) === "free") {
//         return { allowed: true };
//     }
//     if (blockers.ownedArenas.length > 0 || blockers.proHostedLeagues.length > 0) {
//         return {
//             allowed: false,
//             error: "Transfer or delete Pro-hosted groups before switching to Free.",
//             blockers,
//         };
//     }
//     if (blockers.ownedLeagueCount > blockers.maxFreeLeagues) {
//         return {
//             allowed: false,
//             error: "Free users can host up to 3 leagues.",
//             blockers,
//         };
//     }

//     return { allowed: true };
// };

export const getGroupTypeLabel = (group_type: GroupType) => GROUP_TYPE_LABELS[normalizeGroupType(group_type)];

export const getHostingTierLabel = (hosting_tier: HostingTier) =>
    `${HOSTING_TIER_LABELS[normalizeHostingTier(hosting_tier)]}-hosted`;
