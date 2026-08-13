
import { CachedReviewData } from "@/components/pick-builder/core/reviewSheetState";
import { ProfileBadgeProgress } from "../profile/badges";
import { ContestLifecycleStatus } from "../domain/community";
import type { FeedContestState } from "../redux/slices/feedContestSlice";

export type Role = "member" | "commissioner" | "manager";

export type ContestStyle = "infinite" | "custom" | "monthly";

export type SlipStatus = "open" | "locked" | "grading" | "final";

export type PickResult = "win" | "loss" | "void" | "pending" | "not_found" | null;

export type League = "NFL" | "NBA" | "NCAAF" | "NCAAB" | "NHL" | "MLB" | "Soccer";

export type BuildMode = "ODDS";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type SlipConflictWarningMode = "competition" | "group_combo";

export type TutorialKeys = "home" | "social" | "group" | "profile" | "global" | null;

export type UserPlan = "free" | "pro";

export type ProLifetimeOfferKind = "founding" | "standard";

export type GroupType = "league" | "arena";

export type HostingTier = "free" | "pro";

export type TierIndex =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14;

export type TierName =
    | "LOCK"
    | "SAFE"
    | "EVEN"
    | "EDGE"
    | "RISKY"
    | "SPICY"
    | "HAIL MARY"
    | "MOONSHOT"
    | "EPIC"
    | "INSANE"
    | "ELITE"
    | "ALL-TIME"
    | "ICONIC"
    | "LEGENDARY";

export type LegacyDifficultyLabel = "Safe" | "Balanced" | "Risky";

export type DifficultyLabel = TierName | LegacyDifficultyLabel;

export type LeaderboardStatus = "ACTIVE" | "ARCHIVED";

export type ContestStatus = "ACTIVE" | "ARCHIVED";

export type ProLifetimeEntitlement = {
    status: "owned";
    offerKind: ProLifetimeOfferKind;
    amountCents: 1000 | 2000;
    purchasedAt: string;
    simulatedPaymentReference: string;
    billingMode: "simulated";
};

// Canonical pick categories; profiles, feeds, Winners Hall, and badge queries rely on this instead of inferring from location.
export enum PickType {
    GROUP = "GROUP",
    PICK_OF_DAY = "PICK_OF_DAY",
    BADGE = "BADGE",
    VIBE = "VIBE",
    POST = "POST",
}

export type Step = 1 | 2 | 3 | 4 | 5;

export type CreatedContext = {
    group: Group;
    slip: Slip;
};

export type Toast = {
    id: number;
    type: "success" | "error" | "info";
    message: string;
    duration: number;
}

export type CurrentUser = {
    username: string;
    email: string;
    plan: UserPlan;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
    userId: string;
    full_name: string;
    dob?: string;
    /** Deterministic offer presented before the permanent Pro Lifetime unlock. */
    proLifetimeOfferKind?: ProLifetimeOfferKind;
    /** Local simulated purchase provenance; `plan` remains the entitlement shortcut. */
    proLifetimeEntitlement?: ProLifetimeEntitlement;
    /** IANA timezone used for account-calendar-day rules such as the XP cap. */
    accountTimezone?: string;
}

// NOTE: `name` is a legacy alias for the username/handle chosen during onboarding.
export type User = {
    id: string;
    name: string;
    email: string;
    fullName: string;
    password?: string;
    joined_at?: string;
    username?: string;
    userId?: string;
    user?: {
        user_metadata?: CurrentUser;
        access_token?: string;
        refresh_token?: string;
    };
    is_public: boolean;
}

export type UsernameHistory = {
    username: string;
    updated_at: string;
}

export type Profile = {
    id: string;
    email: string;
    username: string;
    provider?: string;
    created_at?: string;
    profile_image?: string;
    dob?: string;
    is_public: boolean;
    followers?: number;
    followings?: number;
    groups?: number;
    sharedGroup?: number;
    full_name?: string;
    username_history?: UsernameHistory[];
    plan?: UserPlan;
    /** Deterministic offer presented before the permanent Pro Lifetime unlock. */
    proLifetimeOfferKind?: ProLifetimeOfferKind;
    /** Local simulated purchase provenance; `plan` remains the entitlement shortcut. */
    proLifetimeEntitlement?: ProLifetimeEntitlement;
    /** IANA timezone used for account-calendar-day rules such as the XP cap. */
    accountTimezone?: string;
}

export type ActiveSlip = {
    id: string;
    group_id: string;
    index: number;
    name: string;
    sports: string[];
    isGraded: boolean;
    pick_limit: 1 | "unlimited";
    betLink?: string | null;
    pick_deadline_at: string;
    results_deadline_at: string;
    status: SlipStatus;
    archived?: boolean;
    contest_number?: number;
    created_at?: string;
    updated_at?: string;
    window_days?: number | undefined;
    created_by?: string;
}

export type Group = {
    id?: string;
    name: string;
    sport_type?: string;
    theme_variant?: string;
    description?: string;
    contest_style?: ContestStyle;
    contest_end_date?: string | null;
    active_slip_id?: string | null;
    pick_deadline?: string;
    result_deadline?: string;
    invite_code?: string;
    created_by?: string;
    members?: Members;
    member_count?: number;
    manager_count?: number;
    total_member_count?: number;
    active_contest?: number;
    active_slip?: ActiveSlip;
    open_slip?: number;
    final_slip?: number;
    is_enable_secondary_leaderboard: boolean;
    group_type: GroupType;
    hosting_tier: HostingTier;
    max_members: number;
    max_active_contests: number;
    current_user_member?: {
        joined_at: string;
        role: string;
    },
    external_community_url?: string;
    lifecycle_status?: string;
}

export type ContestBadgeCategory = "generic" | "football" | "nba" | "mlb" | "nhl" | "soccer";

export type ContestBadgeSettings = {
    enabled: boolean;
    defaultPoints: number;
    enabledBadgeIds: string[];
    badgePointOverrides: Record<string, number>;
};

export type ContestBadgeSettingsState = {
    applied: ContestBadgeSettings;
    pending?: ContestBadgeSettings | null;
    updatedAt?: string;
    recalculatedAt?: string;
    recalculatedBy?: string;
};

export type ContestBadgeDefinition = {
    id: string;
    name: string;
    category: ContestBadgeCategory;
    description: string;
    minimum: number;
    eligibleSports: string[];
    suggestedPoints?: number;
    display: {
        icon: string;
        subtitle: string;
        theme: string;
        toneClass: string;
        borderClass: string;
        glowClass: string;
    };
};

export type ContestBadgeAward = {
    definition: ContestBadgeDefinition;
    userId: string;
    value: number;
    valueLabel: string;
    markToBeatLabel: string;
    points: number;
    reachedAt: string;
    sport?: string;
    extra?: Record<string, number | string>;
};

export type Contest = {
    id: string;
    group_id: string;
    name: string;
    description?: string;
    sports: string[];
    starts_at: string;
    ends_at: string;
    badges_enabled?: boolean;
    badge_settings?: ContestBadgeSettingsState;
    status: ContestStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
    archived_at?: string | null;
    excluded_member_ids: string[];
    slips_count?: {
        open_count: number;
        review_count: number;
        finalized_count: number;
    };
    included_members_count: number;
    excluded_members_count: number;
    /**
     * The contest's MOST RECENT Fantasy slip, or null when it owns none.
     *
     * Added so a contest card can name the round it is actually on without the
     * client fetching every slip of every contest. `phase` is the status with the
     * clock applied — an 'open' slip past its pick deadline reports "review", not
     * "open" — and `is_accepting_picks` is that same verdict as a boolean.
     */
    last_slip?: ContestLastSlip | null;
};

/** `CONTEST_LAST_SLIP_COLUMNS` plus the two derived fields the helper stamps on. */
export type ContestLastSlip = {
    id: string;
    name: string;
    index?: number | null;
    contest_number?: number | null;
    status?: string | null;
    slip_type?: string | null;
    pick_deadline_at?: string | null;
    results_deadline_at?: string | null;
    finalized_at?: string | null;
    is_graded?: boolean | null;
    archived?: boolean | null;
    sports?: string[] | null;
    pick_limit?: number | string | null;
    created_at?: string | null;
    /** open | review | final | locked | grading | voided — see resolveSlipPhase. */
    phase?: string | null;
    is_accepting_picks?: boolean | null;
};

export type Slip = {
    id?: string;
    group_id: string;
    index?: number;
    name: string;
    sports?: string[];
    isGraded: boolean;
    conflict_warning_mode?: SlipConflictWarningMode;
    pick_limit: number | "unlimited";
    betLink?: string | null;
    pick_deadline_at: string;
    results_deadline_at?: string;
    status: SlipStatus;
    archived?: boolean;
    contest_number?: number;
    created_at?: string;
    updated_at?: string;
    window_days: number;
    created_by?: string;
    slip_type?: string;
    contest_id: string;
    leaderboard_ids?: string[];
    total_picks?: number;
    external_pick_key?: string;
    graded_at?: string;
    finalized_at?: string;
};

export type Pick = {
    id: string;
    slip_id: string;
    user_id: string;
    description: string;
    odds_bracket: string;
    result: PickResult;
    points: number;
    bonus?: number;
    awardedPoints?: number;
    updated_at?: string;
    scope?: PickScope;
    market?: PickMarket;
    game_id?: string;
    team_id?: string;
    player_id?: string;
    side?: PickSide;
    threshold?: number;
    difficulty_tier?: 1 | 2 | 3 | 4 | 5;
    validation_status?: ValidatePickResponse["status"];
    sport: League | string;
    difficulty_label: DifficultyLabel | null;
    selection?: PickSelectionMeta;
    build_mode?: BuildMode;
    created_at?: string;
    matchup?: string | null;
    match_date?: string | null;
    pick_type?: string;
    external_pick_key?: string;
    confidence?: ConfidenceLevel;
    xp_awarded?: number;
    calculated_global_xp?: number;
    source_tab?: string;
    is_combo?: boolean;
    legs?: PickLeg[];
    profiles?: {
        id?: string;
        username?: string;
        user_id?: string;
        profile_image?: string;
        [key: string]: unknown;
    };
    up?: number;
    down?: number;
    reaction?: PickReaction;
};

export type LeaderboardEntry = {
    group_id: string;
    slip_id: string;
    user_id: string;
    slip_points: number;
    cumulative_points: number;
};

export type LeaderboardArchiveRow = Readonly<{
    userId: string;
    username: string;
    profile_image?: string;
    rank: number;
    totalPoints: number;
    wins: number;
    losses: number;
    voids: number;
    topPickLabel: string;
    topPickPoints: number;
    topPickSlipName?: string;
}>;

export type LeaderboardArchive = Readonly<{
    groupId: string;
    label: string;
    rows: ReadonlyArray<LeaderboardArchiveRow>;
    archivedSlips: ReadonlyArray<string>;
    createdAt: string;
}>;

export type ActivityAction =
    | "pick_created"
    | "pick_updated"
    | "pick_deleted"
    | "status_change"
    | "result_override"
    | "bonus_assigned"
    | "user_joined"
    | "system_voided";

export type ActivityFeedEvent = {
    id: string;
    group_id: string;
    actor_id: string;
    action: ActivityAction;
    meta?: Record<string, unknown>;
    created_at: string;
};

export type ChatMessage = {
    id: string;
    group_id: string;
    sender_id: string;
    message: string;
    sender_username: string;
    sender_full_name?: string;
    sender_profile_image?: string;
    message_type: "text" | "emoji";
    created_at: string;
    updated_at?: string;
    is_deleted: boolean;
    pending?: boolean;
};

export type DeleteGroupPayload = {
    groupId: string;
    actorId: string;
};

export type GradingSnapshot = Record<
    string,
    {
        result: "win" | "loss" | "void" | "pending";
        bonus: string | number;
    }
>;

export type AuthState = {
    error: string | null;
    user: User | null;
    message: string | null;
    loading: boolean;
}

export type AuthSelector = {
    user: AuthState;
}

export type GroupState = {
    group: Group | null;
    leaderboard: LeaderboardData | null;
    leaderboardList: LeaderboardList | null;
    summary: GroupSummary | null;
    archivedLeaderboard: ArchivedLeaderboard | null;
    ArchiveLeaderboardList: ArchiveLeaderboardList | null;
    members: Members | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    joinLoading: boolean;
    loadingLeaderboard: boolean;
    loadingArchivedLeaderboard: boolean;
    deleteLoading: boolean;
    leaveLoading: boolean;
    error: string | null;
    message: string | null;
    /**
     * Create-scoped mirrors of loading/error/message/group. `loading`, `error`,
     * `message` and `group` above are written by 12-25 other reducers each, so a
     * background fetch settling mid-create used to toast a foreign error or
     * fabricate a success card. The create flow reads only these.
     */
    createLoading: boolean;
    createError: string | null;
    createErrorStatus: number | null;
    createMessage: string | null;
    createdGroup: Group | null;
    deleteMessage: string | null;
    leaveMessage: string | null;
    hasMoreLeaderboard: boolean;
    leaderboardPagination?: PaginationMetadata;
    loadingMembers: boolean;
    membersPagination?: PaginationMetadata;
    chatMessages: ChatMessage[] | null;
    loadingChats: boolean;
    chatsHasMore: boolean;
    chatsNextCursor: string | null;
    loadingOlderChats: boolean;
    olderChats: ChatMessage[] | null;
    unreadCounts: number;
    groupsCounts: GroupCounts | null;
    ownerPlan: GroupOwnerPlan | null;
}

export type GroupSelector = {
    group: GroupState;
}

export type RegisterPayload = {
    fullName: string;
    username: string;
    email: string;
    password: string;
    dob: string;
}

export type LoginPayload = {
    loginId: string;
    password: string;
}

export type Member = {
    length?: number | undefined;
    id?: string;
    group_id?: string;
    user_id?: string;
    role?: Role;
    joined_at?: string;
    profiles?: {
        username?: string;
        id?: string;
        email?: string;
        profile_image?: string;
        [key: string]: unknown;
    };
}

export type Members = Member[];
export type Slips = Slip[];
export type Picks = Pick[];
export type Contests = Contest[];

export type GroupResponse = {
    data?: {
        group?: Group | null;
    };
}

export type CreateGroupPayload = {
    name: string;
    /**
     * Omitted entirely when the user leaves it blank. The server validates
     * description with min 1 / max 50 when the key is present, so sending ""
     * would trip a 400. `is_enable_secondary_leaderboard` is no longer sent —
     * the create RPC hardcodes it to false and the controller never reads it.
     */
    description?: string;
    group_type: GroupType;
};

export type CreateGroupSuccessPayload = {
    message: string | null;
    group: Group | null;
};

export type CreateGroupFailurePayload = {
    message: string;
    /** Load-bearing: a 500 on the Arena path can mean the group already exists. */
    status: number | null;
};

export type FetchGroupOwnerPlanPayload = {
    group_id: string;
};

export type GroupOwnerPlan = {
    plan: UserPlan;
    username: string;
    full_name: string;
};

export type GroupCounts = {
    user: {
        username?: string;
        profile_image?: string;
        plan?: UserPlan;
        [key: string]: unknown;
    };
    counts: {
        league: number;
        arena: number;
        owned_arena_count: number;
        needs_attention_count: number;
    }
};

export type GroupObject = {
    id: string;
    name: string;
    invite_code: string;
    description: string;
    total_member_count: number;
    member_count: number;
    created_by: string;
    active_contest: number;
    current_user_member: {
        joined_at: string;
        role: string;
    },
    is_enable_secondary_leaderboard: boolean;
    group_type: GroupType;
    hosting_tier: HostingTier;
    max_members: number;
    max_active_contests: number;
}

export type FetchGroupsParams = {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    search?: string;
};

export type FetchContestsParams = {
    group_id: string;
    page?: number;
    limit?: number;
};

export type FetchContestByIdPayload = {
    contest_id: string;
};

export type FetchBadgeAwardsByContestIdPayload = {
    contest_id: string;
};

export type ArchiveContestByIdPayload = {
    contest_id: string;
};

export type UpdateBadgeSettingsPayload = {
    contest_id: string;
    settings: ContestBadgeSettings;
};

/**
 * The free-plan half of badge management: the master switch plus which badges
 * count. Carries no point fields at all, so `PATCH /contest/toggle-badges`
 * cannot move a value the caller's plan may not change — that is why a Free
 * commissioner uses this instead of `update-badge-settings`.
 */
export type ToggleContestBadgesPayload = {
    contest_id: string;
    enabled: boolean;
    /** Omit to leave the current badge selection untouched. */
    badge_ids?: string[];
};

export type ResetBadgeSettingsPayload = {
    contest_id: string;
};

export type RecalculateStadingsPayload = {
    contest_id: string;
};

export type DeleteContestByIdPayload = {
    contest_id: string;
};

export type ExcludeContestMemberPayload = {
    contest_id: string;
    user_id: string;
};

export type FetchMyGroupsPayload = {
    page: number;
    limit: number;
};

export type FetchGroupByIdPayload = {
    groupId: string;
};

export type FetchLeaderBoardsPayload = {
    group_id: string;
};

export type FetchUnreadCountsByLeagueIdPayload = {
    group_id: string;
};

export type FetchArchivedLeaderBoardListPayload = {
    groupId: string;
};

export type FetchArchivedLeaderBoardsPayload = {
    groupId: string;
    archivedLeaderboard_id: string;
};

export type CreateNewLeaderboardPayload = {
    group_id: string;
    name: string;
    sport_scope: string | null;
};

export type UpdateLeaderboardPayload = {
    group_id: string;
    name: string;
    leaderboard_id: string;
};

export type UpdateLeaderboardToArchivedPayload = {
    group_id: string;
    leaderboard_id: string;
};

export type LeaveGroupPayload = {
    group_id: string;
};

export type FetchGroupMembersPayload = {
    group_id: string;
    page?: number;
    limit?: number;
};

export type FetchGroupChatsPayload = {
    group_id: string;
    cursor?: string;
};

export type FetchGroupChatsResponse = {
    messages: ChatMessage[];
    hasMore: boolean;
    nextCursor: string | null;
};

export type SendMessagePayload = {
    group_id: string;
    message: string;
};

export type MarkGroupChatsReadPayload = {
    group_id: string;
    message_id: string;
};

export type DeleteMessagePayload = {
    group_id: string;
    chat_id: string;
};

export type MembersData = {
    members: Members;
    pagination: PaginationMetadata;
};

export type EnableSecondaryLeaderboardPayload = {
    group_id: string;
    isEnable: boolean;
};

export type InviteCodePayload = {
    invite_code: string;
};

/**
 * One page of a type-scoped community list. Shared by the four MVP2 hub
 * endpoints — GET /group/{joined,owned}-leagues and
 * GET /group/arena/{joined,owned}-arenas — which all return the same
 * `{ groups, pagination }` envelope as /group/my-groups.
 *
 * `total` is kept (my-groups' reducer drops it) because the hub tab badges show
 * the SERVER-side count, not the number of rows paged in so far.
 */
export type CommunityGroupsPage = {
    groups: GroupObject[];
    page: number;
    hasMore: boolean;
    total: number;
};

/**
 * Failure payload for the two type-specific joins — POST /group/join-league and
 * POST /group/arena/join-arena.
 *
 * `status` and `group_type` are load-bearing: the endpoints answer a code that
 * belongs to the OTHER kind of community with 409 + { data: { group_type } }
 * instead of joining it, and the hub turns that into a "switch tabs" prompt
 * rather than a plain error. See joinLeagueByInviteCode / joinArenaByInviteCode.
 */
export type JoinCommunityFailurePayload = {
    message: string;
    status: number | null;
    group_type: GroupType | null;
};

/** The membership row a successful type-specific join returns. */
export type JoinedCommunity = {
    group_id: string;
    group_type?: GroupType;
};

export type MemberModificationPayload = {
    group_id: string;
    user_id: string;
};

export type UpdateMemberRolePayload = {
    member_id: string;
    role: Role;
    group_id: string;
};

export type GroupDeletePayload = {
    group_id: string;
};

export type ConfirmDeletePayload = GroupDeletePayload & {
    otp: string;
};

export type CreatePickPayload = {
    slip_id?: string;
    description: string;
    odds_bracket?: string | null;
    points?: number;
    scope?: PickScope;
    sport?: League | string;
    market?: string;
    side?: PickSide;
    threshold?: number;
    gameId?: string;
    week?: string;
    teamId?: string;
    playerId?: string;
    difficultyTier?: number;
    bestOffer?: BookOdds & { deeplinkUrl?: string };
    bookOdds?: BookOdds[];
    validationStatus?: ValidatePickResponse["status"];
    buildMode?: BuildMode;
    pickId?: string;
    difficulty_label?: DifficultyLabel | null;
    external_pick_key?: string;
    confidence?: ConfidenceLevel | null;
    isCombo?: boolean;
    legs?: PickLeg[];
    selection?: PickSelectionMeta;
    sourceTab?: string;
    matchup?: string;
    match_date?: Date;
};

export type CreatePostPickPayload = {
    slip_id?: string;
    description: string;
    odds_bracket?: string | null;
    points?: number;
    scope?: string;
    sport?: string;
    market?: string;
    side?: string;
    threshold?: number;
    gameId?: string;
    teamId?: string;
    playerId?: string;
    difficultyTier?: number;
    bestOffer?: BookOdds & { deeplinkUrl?: string };
    bookOdds?: BookOdds[];
    validationStatus?: ValidatePickResponse["status"];
    buildMode?: BuildMode;
    pickId?: string;
    difficulty_label?: DifficultyLabel | null;
    external_pick_key?: string;
    confidence?: ConfidenceLevel | null;
    isCombo?: boolean;
    legs?: PickLeg[];
    selection?: PickSelectionMeta;
    pick_type: PickType;
    sourceTab?: string;
    matchup?: string;
    match_date?: Date;
};

export type ReplaceOrCreatePostablePickPayload = {
    pick_id?: string;
    slip_id?: string;
    description: string;
    odds_bracket?: string | null;
    points?: number;
    scope?: PickScope;
    sport?: League | string;
    market?: string;
    side?: PickSide;
    threshold?: number;
    gameId?: string;
    week?: string;
    teamId?: string;
    playerId?: string;
    difficultyTier?: number;
    bestOffer?: BookOdds & { deeplinkUrl?: string };
    bookOdds?: BookOdds[];
    validationStatus?: ValidatePickResponse["status"];
    buildMode?: BuildMode;
    difficulty_label?: DifficultyLabel | null;
    external_pick_key?: string;
    confidence?: ConfidenceLevel | null;
    isCombo?: boolean;
    legs?: PickLeg[];
    selection?: PickSelectionMeta;
    sourceTab?: string;
    matchup?: string;
    match_date?: Date;
};

export type CreatePickOfDayPayload = {
    description: string;
    odds_bracket?: string | null;
    points?: number;
    scope?: string;
    market?: string;
    side?: string;
    threshold?: number;
    gameId?: string;
    week?: string;
    teamId?: string;
    playerId?: string;
    difficultyTier?: number;
    buildMode?: BuildMode;
    pickId?: string;
    difficulty_label?: DifficultyLabel | null;
    sport?: string;
    pick_type: PickType;
    external_pick_key?: string;
};

export type FetchPicksPaginationPayload = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type FetchSlipsPaginationPayload = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type FetchContestsPaginationPayload = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type FetchGroupsPaginationPayload = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type FetchSearchedUsersPaginationPayload = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type FetchPicksPayload = {
    slip_id: string | undefined;
};

export type FetchContestPicksPayload = {
    contest_id: string | undefined;
};

export type FetchPostPicksPayload = {
    page?: number;
    limit?: number;
};

export type FetchPostPicksByUserIdPayload = {
    user_id: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    result?: string;
    pick_type?: string;
    confidence_lvl?: string;
    // When set, the API guarantees this pick is included at the top of page 1, so a
    // deep-linked "highlight" pick is present even if it would fall outside the first page.
    pick_id?: string;
};

export type DeletePostPickPayload = {
    pick_id: string;
};

export type CreateSlipPayload = Record<string, unknown>;

export type FetchSlipsPayload = {
    group_id: string;
};

export type FetchOpenSlipsPayload = {
    group_id: string;
    contest_id: string;
    page?: number;
    limit?: number;
};

export type FetchReviewSlipsPayload = {
    group_id: string;
    contest_id: string;
    page?: number;
    limit?: number;
};

export type FetchFinalizeSlipsPayload = {
    group_id: string;
    contest_id: string;
    page?: number;
    limit?: number;
};

export type FetchSlipByIdPayload = {
    slip_id: string;
};

export type ResetPicksScoringPointsPayload = {
    slip_id: string;
};

export type FetchSocialGlobalLeaderboardPayload = {
    range: "last-week" | "this-week";
};

export type FetchPickOfDayByUserIdPayload = {
    userId: string;
};

export type ReactionPickOfDayPayload = {
    pick_id: string;
    action: string;
};

export type UpdateSlipConflictModePayload = {
    slip_id: string;
    conflictWarningMode: string;
};

export type UpdateSlipPayload = {
    group_id: string;
    pick_deadline_at?: string;
    status?: string;
    slip_id: string;
    windowDays?: number;
    name?: string;
};

export type FetchBlockedUsersPayload = {
    page?: number;
    limit?: number;
};

export type FetchNotificationsPayload = {
    page?: number;
    limit?: number;
};

export type PostableSlips = {
    id: string;
    group_id: string;
    name: string;
    pick_deadline_at: string;
    status: SlipStatus;
    isGraded: boolean;
    pick_limit: 1 | "unlimited";
    sports: string[];
    window_days: number;
    slip_type: string;
    contest_id: string;
    group: {
        id: string;
        name: string;
    };
    pick?: {
        id: string;
        slip_id: string;
        odds_bracket: string;
        result: string;
        points: number;
    }
}

// Cursor-based (keyset) pagination for the postable-slips dropdown. The cursor
// is opaque on the client — we just send back whatever `nextCursor` the API
// returned. Mirrors the group-chat cursor pattern.
export type FetchPostableSlipsPayload = {
    cursor?: string;
};

export type FetchPostableSlipsResponse = {
    slips: PostableSlips[];
    hasMore: boolean;
    nextCursor: string | null;
};

export type SlipState = {
    slip: Slip | null;
    slips: Slips | null;
    openSlips: Slips | null;
    reviewSlips: Slips | null;
    finalizeSlips: Slips | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
    hasMoreOpens: boolean;
    hasMoreReviews: boolean;
    hasMoreFinalizes: boolean;
    deleteLoading: boolean;
    deleteMessage: string | null;
    deleteError: string | null;
    postableSlips: PostableSlips[] | null;
    postableSlipsHasMore: boolean;
    postableSlipsNextCursor: string | null;
    postableSlipsLoadingMore: boolean;
};

export type GlobalLeaderboadUserRows = {
    rank: number;
    user_id: string;
    username: string;
    profile_image: string | null;
    total_xp: number;
    win_count: number;
    latest_win_at: string;
    biggest_win: number;
    biggest_win_pick_id: string;
    biggest_win_post: GlobalLeaderboadPostRows | null;
}

export type GlobalLeaderboadPostRows = {
    rank: number;
    pick_id: string;
    user_id: string;
    username: string;
    profile_image: string | null;
    description: string;
    odds_bracket: string;
    points: number;
    bonus: number;
    xp: number;
    applied_global_xp: number;
    calculated_global_xp: number;
    settled_at: string;
}

export type GlobalLeaderboard = {
    week: {
        range: "this-week" | "last-week";
        start: string;
        end: string;
    };
    userRows: GlobalLeaderboadUserRows[];
    postRows: GlobalLeaderboadPostRows[];
};

export type PickState = {
    pick: Pick | null;
    picks: Picks | null;
    pickOfDay: Pick | null;
    vibePicks: Picks | null;
    postPicks: Picks | null;
    globalLeaderboard: GlobalLeaderboard | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
    deleteMessage: string | null;
    hasMore: boolean;
    globalLeaderboardLoading: boolean;
    /**
     * GET /pick/slip-contest-picks — the group's Slip (Fantasy) contest picks,
     * for the League Feed tab. Its own loading/error pair rather than the shared
     * `loading`/`error` above: the Feed reads this alongside several other lists,
     * and a shared flag would make any one of them flicker the whole tab.
     */
    slipContestPicks: SlipContestPicksData | null;
    slipContestPicksLoading: boolean;
    slipContestPicksError: string | null;
};

export type MarkLockPayload = Record<string, unknown>;

export type MarkUnlockPayload = Record<string, unknown>;

export type MarkGradedPayload = Record<string, unknown>;

export type MarkFinalizePayload = Record<string, unknown>;

export type MarkVoidedPayload = Record<string, unknown>;

export type StartNewContestPayload = {
    group_id: string;
};

export type DeleteSlipPayload = {
    slip_id: string;
}

export type ReOpenSlipPayload = {
    slip_id: string;
    newPickDeadline: string;
}

export type AssignToSecondaryLeaderboardPayload = {
    slip_id: string;
    leaderboard_id: string | null;
}

export type AutoGradingPicksPayload = {
    slip_id: string;
}

export type GradingPayload = {
    id: string;
    result: PickResult;
    points: number;
    bonus: number;
}[];

export type UpdateMultiplePayload = {
    grading: GradingPayload;
    group_id: string;
    slip_id: string;
};

export type TokenData = {
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
}

export type Feed = {
    id: string;
    group_id: string;
    user_id: string;
    action: string;
    meta?: Record<string, unknown>;
    created_at: string;
    profiles?: {
        id: string;
        username: string;
        full_name: string;
        profile_image?: string;
        [key: string]: unknown;
    };
};

export type Feeds = Feed[];

export type FetchActivityPayload = {
    group_id: string;
    start?: number;
    limit?: number;
}

export type CreateFeedbackPayload = {
    description: string;
}

export type CreateContestPayload = {
    group_id: string;
    name: string;
    sports: string[];
    starts_at: string;
    ends_at: string;
    status: ContestStatus;
    badges_enabled: boolean;
    excluded_member_ids: string[];
}

export type UpdateContestPayload = {
    contest_id: string;
    name?: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    badges_enabled?: boolean;
}

export type FetchProgressByUserIdPayload = {
    user_id: string;
}

export type FetchSearchedUsersPayload = {
    q: string;
    page?: number;
    limit?: number;
}

export type RedeemGlobalPointsPayload = {
    points: number;
}

export type UpdateTutorialProgressPayload = {
    tutorial_key: TutorialKeys;
}

export type ActivityState = {
    error: string | null;
    feed: FeedResponse | null;
    message: string | null;
    loading: boolean;
}

export type FeedSelector = {
    feed: ActivityState;
}

export type PaginationMetadata = {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export type Pagination = {
    start?: number;
    limit?: number;
    count?: number;
    page?: number;
}

export type FeedResponse = {
    activities: Feed[];
    pagination: Pagination;
}

export type leaderboardSlip = {
    odds_bracket: string;
    pick_description: string;
    pick_difficulty_tier: TierIndex | null;
    pick_difficulty_label: DifficultyLabel | null;
    pick_result: PickResult;
    pick_id: string | null;
    slip_id: string;
    slip_points: number;
    bonus_points: number;
    selection?: PickSelectionMeta;
    pick_source_tab?: string;
    is_combo?: boolean;
    pick_leg?: PickLeg[]
}

export type Leaderboard = {
    group_id: string;
    slip_id: string;
    user_id: string;
    slip_points: number;
    cumulative_points: number;
    badge_points: number;
    badge_awards: ContestBadgeAward[];
    win: number;
    loss: number;
    username?: string;
    profile_image?: string;
    slips?: leaderboardSlip[];
}

export type LeaderboardData = {
    group_id: string;
    slips: Slip[];
    leaderboard: Leaderboard[];
    pagination: PaginationMetadata;
}

export type ArchiveLeaderboardSlip = {
    id: string;
    group_id: string;
    name: string;
    status: SlipStatus;
    archived: boolean;
    index: number;
    created_at: string;
    pick_deadline_at: string;
    conflict_warning_mode?: SlipConflictWarningMode;
}

export type ArchivedLeaderboard = {
    leaderboard: Leaderboard[];
    slips: ArchiveLeaderboardSlip[];
    label: string;
    archived_at: string;
    archived_slip_ids: string[];
    total_participants: number;
    leaderboard_id: string;
    id: string;
}

export type archiveLeaderBoardObject = {
    id: string;
    leaderboard_id: string;
    group_id: string;
    label: string;
    archived_slip_ids: string[];
    total_participants: number;
    created_at: string;
    leaderboards: {
        id: string;
        name: string;
        status: LeaderboardStatus;
        isDefault: boolean;
        archived_at: string;
        sport_scope?: string;
    }
}

export type ArchiveLeaderboardList = {
    archivedLeaderboards: archiveLeaderBoardObject[];
}

export type LeaderboardPayload = {
    groupId: string | undefined;
    contest_id?: string;
    leaderboard_id?: string;
    page?: number;
    limit?: number;
}

export type SessionState = {
    userId: string;
};

export type GroupSliceState = {
    group: unknown;
    leaderboard: unknown;
    summary: unknown;
    error: string | null;
    deleteMessage: string | null;
    loading: boolean;
};

export type SlipSliceState = {
    slip: Slips | null;
    error: string | null;
    message: string | null;
    loading: boolean;
}

export type FeedbackState = {
    feedback: Feed | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    error: string | null;
    message: string | null;
};

export type BadgeDefinition = {
    id: string;
    name: string;
    category: string;
    description: string;
    metric: string;
    minimum: number;
    eligibleSports: string[];
    suggestedPoints: number;
    scope: string;
    display: {
        icon: string;
        subtitle: string;
        theme: string;
        toneClass: string;
        borderClass: string;
        glowClass: string;
    };
}

export type BadgeAward = {
    definition: BadgeDefinition;
    userId: string;
    profile?: {
        id?: string;
        username?: string;
        profile_image?: string;
        is_public?: boolean;
        full_name?: string;
    };
    value: number;
    valueLabel: string;
    markToBeatLabel: string;
    points: number;
    reachedAt: string;
    extra?: Record<string, number | string>;
}

export type ContestState = {
    contest: Contest | null;
    contests: Contests | null;
    activeContests: Contests | null;
    archivedContests: Contests | null;
    loading: boolean;
    badgeLoading: boolean;
    error: string | null;
    message: string | null;
    hasMoreActive: boolean;
    hasMoreArchived: boolean;
    badgeAwards: BadgeAward[] | null;
    badgeDefinitions: BadgeDefinition[] | null;
    manageableBadgeDefinitions: BadgeDefinition[] | null;
};

export type PlanBlockerGroup = {
    id: string;
    name: string;
};

export type PlanDowngrade = {
    allowed: boolean;
    error: string | null;
    blockers: {
        ownedArenas: PlanBlockerGroup[];
        proHostedLeagues: PlanBlockerGroup[];
        ownedLeagueCount: number;
        maxFreeLeagues: number;
    };
};

export type PlanPricing = {
    amount: number;   // price in the currency's smallest unit (e.g. cents)
    currency: string; // ISO currency code, e.g. "usd"
    label: string;    // preformatted display price, e.g. "$29.99"
};

export type PlanOverview = {
    plan: UserPlan;
    status: string;
    pricing?: PlanPricing;
    downgrade: PlanDowngrade;
};

export type UpdatePlanpayload = {
    plan: UserPlan;
};

export type PaymentTransaction = {
    id: string;
    amount: number;   // smallest currency unit (e.g. cents)
    currency: string;
    status: string;   // 'succeeded' | 'refunded' | 'failed'
    plan?: string | null;
    description?: string | null;
    receipt_url?: string | null;
    card_brand?: string | null;
    card_last4?: string | null;
    created_at: string;
};

export type FetchTransactionsPayload = {
    page?: number;
    limit?: number;
};

export type PlanState = {
    overview: PlanOverview | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    // Checkout-scoped mirrors of loading/error. `loading` is also written by the
    // overview fetch that every plan screen runs on mount, so a button keyed off
    // it reads "Redirecting to Stripe…" during an ordinary refresh. The review
    // page's confirm button is the whole point of that screen — it needs a flag
    // only POST /plans/checkout-session sets.
    checkoutLoading: boolean;
    checkoutError: string | null;
    transactions: PaymentTransaction[];
    transactionsLoading: boolean;
    transactionsError: string | null;
    transactionsHasMore: boolean;
};

export type PickSliceState = {
    pick: unknown;
    pickOfDay: BuiltPickPayload;
    vibePicks: Picks | null;
    postPicks: Picks | null;
    error: string | null;
    message: string | null;
    deleteMessage: string | null;
    loading: boolean;
    hasMore: boolean;
}

export type NotificationsState = {
    notification: AppNotification[];
    error: string | null;
    message: string | null;
    loading: boolean;
    hasMore: boolean;
}

// ---- Arena hosting & unlock (GET /group/arena/hosting-details?arena_id=) ----
export type ArenaHostingStatus =
    | "not_started"
    | "included_month"
    | "active"
    | "past_due"
    | "pause_scheduled"
    | "cleanup"
    | "paused";

export type ArenaUnlockStatus = "locked" | "unlocked";

export type ArenaHostingDetails = {
    id: string;
    group_id: string;
    tier: string | null;
    status: ArenaHostingStatus;
    participating_member_limit: number;
    manager_limit: number;
    active_contest_limit: number;
    billing_mode: string;
    monthly_amount_cents: number | null;
    simulated_payment_reference: string | null;
    activated_at: string | null;
    period_starts_at: string | null;
    period_ends_at: string | null;
    paid_through_at: string | null;
    included_month_starts_at: string | null;
    included_month_ends_at: string | null;
    included_month_consumed: boolean;
    scheduled_tier: string | null;
    pause_scheduled_for: string | null;
    cleanup_started_at: string | null;
    paused_at: string | null;
    created_at: string;
    updated_at: string;
};

export type ArenaUnlockDetails = {
    id: string;
    group_id: string;
    status: ArenaUnlockStatus;
    permanent: boolean;
    source: string | null;
    amount_cents: number | null;
    currency: string | null;
    purchased_by: string | null;
    unlocked_at: string | null;
    simulated_payment_reference: string | null;
    included_month_consumed: boolean;
    included_month_consumed_at: string | null;
    created_at: string;
    updated_at: string;
};

/**
 * One selectable hosting tier as computed by the backend. All pricing, limits and
 * allow/deny rules are decided server-side; the UI only renders what it is given.
 */
export type ArenaAvailableTier = {
    tier: string;
    name: string;
    price_label: string;
    monthly_amount_cents: number | null;
    participating_member_limit: number | null;
    manager_limit: number | null;
    active_contest_limit: number | null;
    is_current: boolean;
    allowed: boolean;
    kind?: string;
    summary?: string;
    action_label?: string;
};

export type ArenaHostingDetailsResponse = {
    hosting: ArenaHostingDetails;
    unlock: ArenaUnlockDetails;
    available_tiers?: ArenaAvailableTier[];
};

export type ArenaHostingDetailsPayload = {
    arena_id: string;
};

// ---- Owner billing workspace (GET /group/arena/owned-hosting-details) ----
// One row per Arena the caller owns. `hosting` / `unlock` are null until the
// Arena is unlocked, and the column lists are narrower than the single-Arena
// endpoint's (no `id`), so these are Omit<> rather than the full row types.
export type OwnedArenaHostingRow = {
    arena: {
        id: string;
        name: string;
        created_by: string;
        lifecycle_status: string;
    };
    unlock: Omit<ArenaUnlockDetails, "id" | "created_at" | "updated_at"> | null;
    hosting: Omit<ArenaHostingDetails, "id"> | null;
    usage: {
        participating_members: number;
        managers: number;
        active_contests: number;
    };
};

export type OwnedArenaHostingResponse = {
    arenas: OwnedArenaHostingRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

export type OwnedArenaHostingPayload = {
    page?: number;
    limit?: number;
};

export type FetchArenaContestsPayload = {
    arena_id: string;
    status?: string;
};

// POST /group/arena/create-arena-contest. Field names mirror the endpoint's
// body exactly; entry_model is derived from template on the client but the
// endpoint re-checks it. All create validation lives server-side.
export type CreateArenaContestPayload = {
    arena_id: string;
    name: string;
    description?: string;
    template: string;
    entry_model: string;
    sunday_pickem_slate_mode?: string;
    sport: string;
    season_id: string;
    opens_at: string;
    locks_at: string;
    expected_ends_at: string;
    rules_text: string;
    eligible_game_ids: string[];
    winning_places: number;
};

// Owner-only role/membership writes: PUT /group/arena/{make-manager,make-member,remove-member}.
// page/limit echo the member list window so the saga can refresh it after the write.
export type ArenaMemberActionPayload = {
    arena_id: string;
    user_id: string;
    page?: number;
    limit?: number;
};

// POST /group/arena/leave. Any member except the owner/commissioner — they must
// transfer ownership first.
export type LeaveArenaPayload = {
    arena_id: string;
};

// Two-step owner-only delete. POST /group/arena/:arena_id/delete/initiate emails
// a 4-digit code; DELETE /group/arena/:arena_id/delete/confirm?otp= spends it.
export type InitiateArenaDeletePayload = {
    arena_id: string;
};

export type ConfirmArenaDeletePayload = {
    arena_id: string;
    otp: string;
};

// POST /group/arena/activate-hosting. `tier` must be a self-service tier —
// "custom" is contact-only and the endpoint rejects it with a 409.
export type ActivateArenaHostingPayload = {
    arena_id: string;
    tier: string;
};

// POST /group/arena/{schedule-pause,cancel-pause}.
export type ArenaPausePayload = {
    arena_id: string;
};

// What activate-hosting actually did. A tier change during the free month, or any
// downgrade, is deferred to renewal ("scheduled") rather than charged now.
export type ArenaHostingActionKind =
    | "activated"
    | "scheduled"
    | "schedule_canceled"
    | "already_active"
    | "pause_scheduled"
    | "pause_canceled";

export type ArenaHostingCharge = {
    amount_cents: number;
    currency: string;
    reference: string;
};

export type ArenaHostingActionResponse = {
    hosting: ArenaHostingDetails;
    action?: ArenaHostingActionKind;
    effective_at?: string | null;
    charge?: ArenaHostingCharge | null;
    restored_status?: string;
    prebooked_tier_canceled?: boolean;
};

// PUT /group/arena/details. A partial update: only the keys actually sent are
// touched, so omit a field to leave it alone. description / external_community_url
// accept null (or blank) to clear.
export type UpdateArenaDetailsPayload = {
    arena_id: string;
    name?: string;
    description?: string | null;
    external_community_url?: string | null;
};

export type ArenaDetails = {
    id: string;
    name: string;
    description: string | null;
    external_community_url: string | null;
    group_type: GroupType;
    created_by: string;
    updated_at: string;
};

export type ArenaTransferStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "canceled"
    | "expired";

export type ArenaTransferParty = {
    id: string;
    username?: string | null;
    profile_image?: string | null;
};

export type ArenaOwnershipTransfer = {
    id: string;
    arena_id: string;
    from_owner_user_id: string;
    to_user_id: string;
    status: ArenaTransferStatus;
    requested_at: string;
    expires_at: string;
    responded_at: string | null;
    canceled_at: string | null;
    created_at: string;
    // Resolved server-side so the client never has to look up user ids.
    from_owner?: ArenaTransferParty | null;
    to_user?: ArenaTransferParty | null;
};

// GET /group/arena/ownership-transfer. At most one pending row per Arena, and it
// is only visible to the two parties — everyone else gets nulls.
export type ArenaOwnershipTransferResponse = {
    request: ArenaOwnershipTransfer | null;
    incoming: ArenaOwnershipTransfer | null;
    outgoing: ArenaOwnershipTransfer | null;
    can_respond: boolean;
    can_cancel: boolean;
};

export type FetchArenaOwnershipTransferPayload = {
    arena_id: string;
};

export type CreateArenaOwnershipTransferPayload = {
    arena_id: string;
    to_user_id: string;
};

// arena_id is not sent (the endpoint resolves it from request_id); it is carried
// so the saga can re-read the Arena once ownership actually moves.
export type RespondArenaOwnershipTransferPayload = {
    request_id: string;
    action: "accept" | "reject";
    arena_id: string;
};

export type CancelArenaOwnershipTransferPayload = {
    request_id: string;
    arena_id: string;
};

export type ArenaContest = {
    id: string;
    group_id: string;
    context_type: string;
    name: string;
    description?: string;
    created_by: string;
    template: string;
    entry_model: string;
    sunday_pickem_slate_mode?: string;
    lifecycle_status: ContestLifecycleStatus;
    sport: string;
    season_id?: string;
    time_zone: string;
    opens_at?: string;
    locks_at: string;
    expected_ends_at?: string;
    rules_version: string;
    rules_text?: string;
    eligible_game_ids?: string[];
    winning_places: number;
    review_status: string;
    proposed_standings_id?: string;
    final_standings_id?: string;
    results_post_id?: string;
    reward?: object;
    created_at: string;
    finalized_at?: string;
    canceled_at?: string;
    archived_at?: string;
    // Joined by the detail endpoint (arena_contests → profiles); absent on the
    // list endpoint, hence optional.
    creator?: {
        id: string;
        username: string | null;
        profile_image: string | null;
    } | null;
}

/* ----------------------------------------------------------------------------
 * Feed contests — /group/feed-contest/*. ONE surface for both contexts: the
 * request carries `group_type` ("arena" | "league") and the server derives
 * context_type ("arena" | "league_feed") from the group row.
 * -------------------------------------------------------------------------- */

/** The four server-owned list sections (the MVP's StructuredContestList tabs). */
export type FeedContestSection =
    | "open"
    | "locked"
    | "finalized"
    | "drafts"
    | "archived";

/** Only these two templates can be created; older ones stay on the legacy route. */
export type FeedContestTemplate = "multi_pick" | "sunday_pickem";

/**
 * One row of the schedule snapshot the client selected. The backend has no games
 * table (schedules come from OddsBlaze per sport), so the chosen catalog rows
 * travel with the create request and are validated against `eligible_game_ids`.
 */
export type FeedContestGameSnapshot = {
    game_id: string;
    sport: string;
    starts_at: string;
    /**
     * OMIT IT unless the source really knows. `feed.helper.ts` reads absent as
     * `true` and rejects an explicit `false` with "must have supported odds" —
     * so sending `false` for a schedule feed that simply carries no prices would
     * fail every create.
     */
    has_odds?: boolean;
    matchup: string | null;
    home_team: string | null;
    away_team: string | null;
    /** Sunday Pick'em only; null for General Combo games. */
    kickoff_window: string | null;
};

/** The caller's own participant row, or null when they never joined. */
export type FeedContestParticipation = {
    contest_id: string;
    status: string;
    rules_version_accepted?: string | null;
    entry_id?: string | null;
    opted_in_at?: string | null;
    entered_at?: string | null;
};

/**
 * A feed_contests row as returned by the list endpoints. Shares its columns with
 * ArenaContest (same table) and adds the General Combo settings plus the two
 * per-viewer counters the card needs.
 */
export type FeedContest = ArenaContest & {
    sports?: string[] | null;
    minimum_legs?: number | null;
    maximum_legs?: number | null;
    minimum_odds?: number | null;
    allow_same_game_legs?: boolean | null;
    /**
     * ARENA CONTESTS ONLY. Whether this contest let its owner/manager compete;
     * it is what `viewer.can_participate` reads for a staff viewer. The League
     * create route always stores false — a commissioner competes regardless.
     */
    allow_staff_participation?: boolean | null;
    pickem_correct_bonus?: number | null;
    catalog_snapshot_at?: string | null;
    updated_at?: string;
    participant_count?: number;
    my_participation?: FeedContestParticipation | null;
    /**
     * DETAIL ONLY. `FEED_CONTEST_LIST_COLUMNS` deliberately drops the schedule
     * snapshot (and the full `rules_text`) to keep a page of cards small, so both
     * are absent on every list row and present on `/detail/:contest_id`.
     */
    eligible_games_json?: FeedContestGameSnapshot[] | null;
    /**
     * The member who took 1st and what their entry finished on, read from the
     * achievement finalization awarded.
     *
     * ALWAYS an object and always present, so a client never branches on the key
     * existing — but an EMPTY one wherever nothing was won: a contest still
     * running, one that was canceled, and one that finished with a field where
     * nobody scored all report `{}`. `/list/finalized` is where it is populated.
     *
     * Feed contests only. The Fantasy card deliberately shows no winner.
     */
    winner?: FeedContestWinner | Record<string, never>;
};

/** The populated shape of `FeedContest.winner`; `{}` means "nothing was won". */
export type FeedContestWinner = {
    user_id: string;
    username: string | null;
    profile_image: string | null;
    /** So a card can say "You won" without comparing ids itself. */
    is_own: boolean;
    /** contest_achievements.final_score — the contest's own number. */
    points: number;
    placement: number;
    type: string;
    /** The enum already spelled for a screen. */
    label: string;
    awarded_at: string;
    is_tie: boolean;
    tied_count: number;
};

// POST /group/feed-contest/create (publishes straight to 'open') and
// /create-draft (parks it in 'draft' without taking an active slot). Identical
// bodies — both run the full validation. The organizer's IANA zone rides along
// as the `x-timezone` header, added by the saga.
export type CreateFeedContestPayload = {
    group_id: string;
    group_type: FeedGroupType;
    name: string;
    description?: string;
    template: FeedContestTemplate;
    /** Must equal ENTRY_MODEL_BY_TEMPLATE[template]: multi_pick | pickem_card. */
    entry_model: string;
    sunday_pickem_slate_mode?: string;
    sports?: string[];
    season_id?: string;
    opens_at: string;
    locks_at: string;
    expected_ends_at: string;
    /** General Combo only; required for the multi_pick template. */
    minimum_legs?: number;
    maximum_legs?: number;
    minimum_odds?: number | null;
    allow_same_game_legs?: boolean;
    rules_text: string;
    eligible_game_ids: string[];
    eligible_games_json: FeedContestGameSnapshot[];
    winning_places: number;
};

/**
 * Reopening a saved draft in the wizard and saving it again. ONE write:
 *
 *   PUT /group/feed-contest/create-draft/:contest_id   save, still a draft
 *   PUT /group/feed-contest/publish-draft/:contest_id  save AND publish
 *
 * Both take this body, which is byte-identical to `POST /create-draft`'s, and
 * both are whole-row REPLACEMENTS rather than patches: the organizer re-ran the
 * wizard, so omitting a field resets it. Only `id`, `group_id`, `created_by` and
 * `created_at` survive.
 *
 * DRAFTS ONLY — a published contest's mechanics, slate and timing are frozen and
 * answer 409. Publishing is where the active-contest limit is charged; a draft
 * holds no hosting slot.
 */
export type ReplaceDraftFeedContestPayload = CreateFeedContestPayload & {
    contest_id: string;
    /**
     * The zone the DRAFT was authored in, replayed as `x-timezone` so re-saving
     * from a laptop in another country cannot silently move the contest's clock.
     */
    time_zone?: string;
    /** TRUE routes to `/publish-draft`, which saves and opens in the same call. */
    publish?: boolean;
    /**
     * ARENA ONLY, and carried forward rather than authored: the wizard has no
     * control for it, and these endpoints REPLACE the row — so omitting it would
     * silently reset a draft that had opted its staff in. Inert for a League,
     * where the server forces `true` regardless.
     */
    allow_staff_participation?: boolean;
};

// GET /group/feed-contest/list[/open|/locked|/finalized|/drafts]. A section path
// fixes both the lifecycle_status set and the sort, so `status`/`sort` are only
// read by the generic list. /list/drafts is a 403 for a non-organizer.
export type FetchFeedContestsPayload = {
    group_id: string;
    group_type: FeedGroupType;
    section?: FeedContestSection;
    /** Generic list only: comma-joined lifecycle_status filter. */
    status?: string;
    /** Generic list only: "created_at" | "locks_at". */
    sort?: string;
    page?: number;
    limit?: number;
};

export type FeedContestListData = {
    group: { id: string; name: string; group_type: string };
    context_type: string;
    section: FeedContestSection | null;
    viewer: { role: string | null; is_organizer: boolean };
    contests: FeedContest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

// GET /group/feed-contest/detail/:contest_id. The contest id alone identifies
// the row — group_id / group_type are DERIVED from it server-side, so nothing
// else travels. A draft answers 404 for anyone but its organizer, as does a
// malformed uuid, a foreign group and a genuinely missing row: the client can
// never tell those apart, and must not try.
export type FetchFeedContestDetailPayload = {
    contest_id: string;
};

export type FeedContestDetailData = {
    group: { id: string; name: string; group_type: string };
    context_type: string;
    viewer: {
        role: string | null;
        is_organizer: boolean;
        /**
         * Whether this viewer has an entry flow to call AT ALL. FALSE for every
         * League Feed contest today — join/entry are still arena-only — and for
         * Arena staff unless that contest set `allow_staff_participation`.
         */
        can_participate: boolean;
    };
    /** Carries `creator`, `participant_count` and `my_participation`, exactly as a list row does. */
    contest: FeedContest;
};

/**
 * PUT /group/feed-contest/cancel/:contest_id and .../archive/:contest_id.
 * Organizer only (Arena owner/manager, League commissioner); the contest id is a
 * PATH param and no body is required.
 *
 * Cancel accepts draft | scheduled | open | locked | grading, archive accepts
 * only canceled | final — the same windows `canCancelContest` /
 * `canArchiveContest` compute client-side. A contest that moved between the
 * read and the write answers 409, not 200.
 */
export type FeedContestLifecycleActionPayload = {
    contest_id: string;
};

export type FeedContestLifecycleData = {
    /**
     * MAY BE PARTIAL — always MERGE it over the record you already hold, never
     * replace. The success path echoes the whole updated row, but the two
     * idempotent replies ("already canceled" / "already archived") echo only the
     * few columns the organizer auth happened to select. Replacing would blank
     * `name` / `locks_at` / the slate, and would drop `creator`,
     * `participant_count` and `my_participation`, which the read endpoints
     * assemble and which are not columns of `feed_contests` at all.
     */
    contest: Partial<FeedContest> & { id: string };
    /** Cancel only: participants withdrawn, and competitive picks deleted. */
    participants_withdrawn?: number;
    picks_deleted?: number;
    /** Archive only: the field settled, and which ending it was filed from. */
    participants_updated?: number;
    archived_from?: string;
};

/* ----------------------------------------------------------------------------
 * DELETE /group/feed-contest/delete/:contest_id — organizer only, BOTH surfaces.
 *
 * Not cancel and not archive: those file a contest the group can still read,
 * this removes it and everything hanging off it. There is no soft delete and no
 * undo — `feed_contests` has no `deleted_at` and its lifecycle enum has no
 * 'deleted' label — so the id 404s forever afterwards.
 *
 * EVERY lifecycle status is deletable, including 'final' and 'archived'. What
 * keeps it safe is the write ORDER, not a status allow-list: a live contest is
 * shut to new entries first (compare-and-swapped, so a concurrent cancel or the
 * lock cron cannot be overwritten — that race is the 409 "Contest state changed.
 * Please retry."), the contest row goes LAST, and the entrant notices are sent
 * only once it is really gone.
 * -------------------------------------------------------------------------- */
export type DeleteFeedContestPayload = {
    contest_id: string;
    /**
     * OPTIONAL server-side — the endpoint deletes without one. It is appended to
     * the fixed system line in every entrant's notification, trimmed, and capped
     * at 280 characters (longer is a 400). Our deletion drawer requires one
     * anyway: a member whose entry vanishes is otherwise told nothing about why.
     *
     * Note there is NO confirmation-name field. The typed `DELETE <name>` phrase
     * is a client-side guard only, so nothing but the drawer enforces it.
     */
    organizer_note?: string;
};

export type DeleteFeedContestData = {
    /**
     * The row is GONE, so its identity is echoed back instead of the record —
     * there is nothing left to merge into `detail`, and anything still holding
     * this id should drop it.
     */
    contest_id: string;
    group_id: string;
    context_type: string;
    name: string;
    /**
     * How many entrants were notified. Withdrawn and disqualified members are
     * excluded — they already left and were told at the time — so deleting an
     * already-canceled contest legitimately reports 0.
     */
    entrants_notified: number;
    /** What the purge actually removed, per table. */
    participants_deleted?: number;
    picks_deleted?: number;
    reactions_deleted?: number;
    notifications_deleted?: number;
    /** Contest-results staff posts are soft-deleted, not purged. */
    staff_posts_retired?: number;
};

/**
 * PUT /group/feed-contest/update/:contest_id — organizer only, member-facing
 * COPY only. Mechanics, slate and timing are frozen for good, and the copy
 * itself freezes as soon as one member has joined a published contest (409).
 *
 * A partial patch: only the supplied keys change, and resubmitting identical
 * copy is a no-op rather than an error. Editable statuses are
 * draft | scheduled | open | locked | grading.
 */
export type UpdateFeedContestPayload = {
    contest_id: string;
    name?: string;
    description?: string;
    rules_text?: string;
};

export type FeedContestUpdateData = {
    /** Same merge-don't-replace rule as {@link FeedContestLifecycleData}. */
    contest: Partial<FeedContest> & { id: string };
    /**
     * TRUE when `rules_text` actually changed — the server then mints a new
     * `rules_version`, which invalidates every acceptance an entrant echoed
     * back. Identical copy never bumps it.
     */
    rules_version_changed?: boolean;
};

/* ----------------------------------------------------------------------------
 * Feed contest ENTRIES — POST /group/feed-contest/enter/:contest_id,
 * PUT .../replace-entry/:contest_id and GET .../entries/:contest_id.
 *
 * Everything priced is SERVER-computed and never read from the body: the
 * combined odds, the point value, the difficulty tier, `is_combo`, `result` and
 * the pick-level `external_pick_key` (deliberately NULL, so the single-pick
 * grading cron cannot settle a whole parlay off one leg). None of them appear on
 * the payloads below, because sending them changes nothing.
 * -------------------------------------------------------------------------- */

/**
 * One leg of a General Combo entry, as the client submits it.
 *
 * `game_id` is compared against `contest.eligible_game_ids` as a RAW string, so
 * it must be the id the contest STORED at create time — the schedule feed's own
 * event id — and never a re-derived one. See lib/schedules/eventIdentity.ts for
 * why the two OddsBlaze feeds disagree about what a game is called.
 */
export type FeedContestEntryLegPayload = {
    game_id: string;
    /** The book's own selection id (`OddsObject.id`) — the grading key, unique per leg. */
    external_pick_key: string;
    /** A NON-ZERO INTEGER. `0` and a fractional price are both 400s. */
    american_odds: number;
    description: string;
    /**
     * Consulted ONLY when the game is missing from `eligible_games_json`; the
     * stored snapshot's `starts_at` wins whenever it exists. Must be in the
     * future, and later than the contest's `locks_at`.
     */
    match_date: string;
    market?: string | null;
    side?: string | null;
    threshold?: number | null;
    /** "GAME_LINE" | "PLAYER_PROP" — copy only, lands on `legs[].selection.scope`. */
    scope?: string | null;
    player_id?: string | null;
    sport?: string | null;
    matchup?: string | null;
};

/**
 * POST /group/feed-contest/enter/:contest_id — accept the rules, join, and
 * submit the competitive combo in ONE call, so a member can never be left opted
 * in with no entry.
 *
 * NEVER send `confidence`: `picks.confidence` is a Postgres enum, and an
 * unrecognised value fails the INSERT as a 500 rather than as a validation error.
 */
export type EnterFeedContestPayload = {
    contest_id: string;
    /** Echo `contest.rules_version` verbatim; a stale one answers 409. */
    rules_version: string;
    legs: FeedContestEntryLegPayload[];
    /** Absent → the server joins the leg descriptions with " + " and truncates. */
    description?: string;
    source_tab?: string;
    /** Defaults to "ODDS" server-side. */
    build_mode?: string;
    scope?: string;
    validation_status?: string;
};

/**
 * PUT /group/feed-contest/replace-entry/:contest_id — the same body, swapping
 * the combo already submitted for a different one, in place. Requires an
 * existing 'entered' participation, so `rules_version` is optional here: the
 * acceptance stored on the participant row is what gets checked.
 */
export type ReplaceFeedContestEntryPayload = Omit<EnterFeedContestPayload, "rules_version"> & {
    rules_version?: string;
};

/** The priced summary both writes echo back — the server's own arithmetic. */
export type FeedContestEntrySummary = {
    leg_count: number;
    combined_american_odds: number;
    combined_decimal_odds: number;
    points: number;
    difficulty_label: string | null;
    difficulty_tier: number | null;
    game_ids: string[];
    earliest_kickoff_at: string | null;
};

/** One stored leg, as it comes back inside `pick.legs`. */
export type FeedContestEntryLeg = {
    description: string;
    /** The American price as written: "+145" | "-110". */
    odds_bracket: string;
    american_odds: number;
    difficulty_label: string | null;
    difficulty_tier: number | null;
    external_pick_key: string;
    /** 0 until settlement — a leg is never credited at submit time. */
    points: number;
    result: string;
    matchup: string | null;
    /** The combo cron's "is this leg due yet?" field. */
    match_time: string;
    selection: {
        sport: string | null;
        scope: string | null;
        market: string | null;
        gameId: string;
        gameStartTime: string | null;
        playerId: string | null;
        side: string | null;
        threshold: number | null;
        home_team: string | null;
        away_team: string | null;
        matchup: string | null;
        match_date: string | null;
        /** Duplicated out of the leg root on purpose — the cron reads THIS copy. */
        external_pick_key: string;
    };
};

/**
 * The `picks` columns an entries row carries (FEED_CONTEST_ENTRY_PICK_COLUMNS).
 * The two write endpoints return the whole row, which is a superset; this is the
 * intersection every surface may rely on.
 */
export type FeedContestEntryPick = {
    description: string | null;
    odds_bracket: string | null;
    american_odds: number | null;
    market: string | null;
    side: string | null;
    threshold: number | null;
    game_id: string | null;
    sport: string | null;
    matchup: string | null;
    match_date: string | null;
    is_combo: boolean;
    /** ALWAYS null for a combo — the per-leg detail lives in `legs`. */
    selection: Record<string, unknown> | null;
    legs: FeedContestEntryLeg[] | null;
    difficulty_label: string | null;
    difficulty_tier: number | null;
    confidence: string | null;
    result: string;
    points: number | null;
    arena_points_awarded: number | null;
    /** Present on the write replies (the full row), absent on list rows. */
    id?: string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
};

export type EnterFeedContestData = {
    contest: Partial<FeedContest> & { id: string };
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null };
    /** The whole participant row; `entry_id` names the pick just written. */
    participant: FeedContestParticipation & {
        id?: string;
        user_id?: string;
        updated_at?: string;
    };
    pick: FeedContestEntryPick;
    entry: FeedContestEntrySummary;
};

/** Replace echoes the same envelope minus `participant`, plus what it displaced. */
export type ReplaceFeedContestEntryData = Omit<EnterFeedContestData, "participant"> & {
    previous_entry?: {
        leg_count?: number;
        combined_american_odds?: number;
        points?: number;
    } | null;
};

// GET /group/feed-contest/entries/:contest_id — any member of the group may
// read it. `limit` is clamped to 1..100 server-side (default 20).
export type FetchFeedContestEntriesPayload = {
    contest_id: string;
    page?: number;
    limit?: number;
};

/* ----------------------------------------------------------------------------
 * GET /group/feed-contest/leaderboard/:contest_id — the STANDINGS. Any member of
 * the group; a draft stays organizer-only like every other by-id read.
 *
 * The sibling of /entries, and not a substitute for it: that one answers what
 * everyone picked, this one where they stand. It reads `contest_leaderboard`,
 * whose row is seeded when a member enters and later ranked and scored by a
 * settlement job.
 *
 * `limit` is clamped to 1..100 server-side (default 20).
 * -------------------------------------------------------------------------- */
export type FetchFeedContestLeaderboardPayload = {
    contest_id: string;
    page?: number;
    limit?: number;
};

export type FeedContestStandingRow = {
    /** The contest_leaderboard row id — NOT the pick or the user. */
    id: string;
    is_own: boolean;
    /**
     * NULL until a settlement job ranks the field. Render position from the
     * ARRAY ORDER while the envelope's `is_ranked` is false — the server has
     * already ordered the rows (rank asc nulls last, then points desc, then
     * entered_at asc, then id).
     */
    rank: number | null;
    /** Degrades to `{ id }` when the profiles embed came back empty. */
    member: { id: string; username?: string | null; profile_image?: string | null };
    /** Zero for everyone until the contest settles. Never hidden. */
    contest_points: number | null;
    correct_picks: number | null;
    /**
     * Both WITHHELD as null until the contest locks, for everyone but the
     * viewer's own row — the price and the leg count are exactly what a rival
     * would read the field early to learn. Null here means "not visible yet",
     * never "no value"; `is_entry_revealed` on the row says which.
     */
    total_picks: number | null;
    combo_odds: number | null;
    is_entry_revealed: boolean;
    pick_id: string | null;
    participant_id: string | null;
    achievement_id: string | null;
    /** TRUE once an organizer reversed this row's confirmed award. */
    is_points_reverse: boolean | null;
    entered_at: string;
    updated_at: string;
};

export type FeedContestLeaderboardData = {
    contest: {
        id: string;
        name: string;
        context_type: string;
        template: string;
        entry_model: string;
        lifecycle_status: ContestLifecycleStatus;
        locks_at: string;
        winning_places: number;
        finalized_at: string | null;
    };
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null; is_organizer: boolean };
    /**
     * Whether the board carries a real ORDER yet — i.e. whether ANY row has a
     * non-null rank. False means nothing has settled it, so `rank` must not be
     * printed and position comes from the array.
     */
    is_ranked: boolean;
    /** Contest-level: is OTHER members' entry shape on this response at all. */
    is_entry_revealed: boolean;
    /** `contest.locks_at` while hidden, null once revealed. */
    reveal_at: string | null;
    /**
     * The viewer's own line, read separately so it is present whatever page it
     * really falls on — a member deep in a large field should not have to walk
     * the board to find themselves. NULL when they never entered.
     */
    my_standing: FeedContestStandingRow | null;
    standings: FeedContestStandingRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

/* ----------------------------------------------------------------------------
 * GET /pick/slip-contest-picks — every pick across ONE GROUP's Slip (Fantasy)
 * contests. League-only, since Slip contests are.
 *
 * NOT hidden until anything: `summary.is_revealed` is stated as `true` on every
 * response, and `pick` is always populated. A Slip contest's picks are public to
 * the group from the moment they are made, which is why this has no sibling of
 * the Feed contest reveal rules.
 * -------------------------------------------------------------------------- */
export type FetchSlipContestPicksPayload = {
    group_id: string;
    contest_id?: string;
    slip_id?: string;
    user_id?: string;
    /** Comma-joined slip lifecycle statuses. */
    status?: string;
    slip_type?: string;
    result?: string;
    page?: number;
    limit?: number;
};

export type SlipContestPickRow = {
    /** The pick id. */
    id: string;
    is_own: boolean;
    member: {
        id: string;
        username?: string | null;
        full_name?: string | null;
        profile_image?: string | null;
    };
    contest: {
        id: string;
        name: string;
        description?: string | null;
        status?: string | null;
        starts_at?: string | null;
        ends_at?: string | null;
        badges_enabled?: boolean | null;
        archived_at?: string | null;
    } | null;
    slip: {
        id: string;
        name?: string | null;
        index?: number | null;
        contest_number?: number | null;
        status?: string | null;
        slip_type?: string | null;
        archived?: boolean | null;
        is_graded?: boolean | null;
        pick_deadline_at?: string | null;
        results_deadline_at?: string | null;
        finalized_at?: string | null;
    } | null;
    submitted_at: string;
    updated_at: string;
    /** Always present on this surface — never null. */
    pick: FeedContestEntryPick;
};

export type SlipContestPicksData = {
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null };
    filters: {
        contest_id: string | null;
        slip_id: string | null;
        user_id: string | null;
        statuses: string[] | null;
        slip_type: string | null;
        result: string | null;
    };
    summary: {
        total_picks: number;
        /** NULL only when the count query itself failed — never silently 0. */
        my_picks: number | null;
        is_revealed: boolean;
    };
    picks: SlipContestPickRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

export type FeedContestEntryRow = {
    /** The pick id. */
    id: string;
    is_own: boolean;
    /**
     * ROW-level: is `pick` populated on THIS row. TRUE for the caller's own entry
     * even before the lock, FALSE for everyone else's until then — not to be
     * confused with the envelope's contest-level `is_revealed`.
     */
    is_revealed: boolean;
    /** Degrades to `{ id }` when the profiles embed came back empty. */
    member: { id: string; username?: string | null; profile_image?: string | null };
    /** Withdrawn and disqualified rows are NOT filtered out — label them. */
    participant_status: ArenaContestParticipantStatus | string | null;
    joined_at: string | null;
    entered_at: string | null;
    submitted_at: string;
    updated_at: string;
    pick: FeedContestEntryPick | null;
};

export type FeedContestEntriesData = {
    contest: {
        id: string;
        name: string;
        context_type: string;
        template: string;
        entry_model: string;
        lifecycle_status: ContestLifecycleStatus;
        locks_at: string;
        winning_places: number;
    };
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null; is_organizer: boolean };
    /**
     * Contest-level: are OTHER members' picks on this response at all. An
     * organizer is NOT exempt — a contest is only fair if nobody reads the field
     * early — and a canceled contest never reveals.
     */
    is_revealed: boolean;
    /** `contest.locks_at` while hidden, null once revealed. */
    reveal_at: string | null;
    summary: {
        /** Excludes withdrawn and disqualified participants. */
        participant_count: number;
        /** Equals `pagination.total`. */
        entered_count: number;
    };
    entries: FeedContestEntryRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

/* ----------------------------------------------------------------------------
 * GET /group/feed-contest/picks — every competitive pick across ONE GROUP's Feed
 * contests, for BOTH surfaces.
 *
 * The group-wide sibling of /entries/:contest_id, and the one a FEED wants: a
 * page mixes contests, so hidden-until-lock is decided per row rather than per
 * response. `is_revealed` says whether THIS row's `pick` is populated;
 * `contest_revealed` says whether its contest has locked. They differ for the
 * caller's own entry in a still-open contest — visible to them, hidden to
 * everyone else.
 * -------------------------------------------------------------------------- */
export type FetchFeedContestPicksPayload = {
    group_id: string;
    group_type: string;
    /** Narrow to one contest. Omitted for the group feed. */
    contest_id?: string;
    user_id?: string;
    /** Comma-joined `lifecycle_status` values; defaults to every published one. */
    status?: string;
    page?: number;
    limit?: number;
};

export type FeedContestPickRow = {
    /** The pick id. */
    id: string;
    is_own: boolean;
    /** Is `pick` populated on THIS row — own entry, or a locked contest. */
    is_revealed: boolean;
    /** Has this row's contest locked. FALSE while it is still taking entries. */
    contest_revealed: boolean;
    member: { id: string; username?: string | null; profile_image?: string | null };
    contest: {
        id: string;
        name: string;
        template: string;
        entry_model: string;
        lifecycle_status: ContestLifecycleStatus;
        locks_at: string;
        /** `locks_at` while hidden, null once revealed. */
        reveal_at: string | null;
    } | null;
    submitted_at: string;
    updated_at: string;
    pick: FeedContestEntryPick | null;
};

export type FeedContestPicksData = {
    group: { id: string; name: string; group_type: string };
    context_type: string;
    viewer: { role: string | null; is_organizer: boolean };
    filters: {
        contest_id: string | null;
        user_id: string | null;
        statuses: string[];
    };
    summary: { revealed_count: number; hidden_count: number };
    picks: FeedContestPickRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

// GET /group/feed-contest/stats/:contest_id — every count a contest dashboard
// needs, in one call. Any member of the group may read it; a DRAFT is
// organizer-only and answers 404 to everyone else, same as the by-id detail.
export type FetchFeedContestStatsPayload = {
    contest_id: string;
};

/**
 * A tally split by the member's CURRENT group role. Exhaustive by construction:
 * the four buckets always sum back to the set they were counted from.
 * `non_member` is someone who took part and has since left the group — their
 * entry stays part of the contest record.
 */
export type FeedContestRoleTally = {
    commissioner: number;
    manager: number;
    member: number;
    non_member: number;
};

/**
 * Seeded with every enum value server-side, so a status nobody holds reports 0
 * rather than going missing. An unrecognised value lands in `other`, which is
 * why this is an index signature rather than a closed record — `by_status` must
 * always sum to `total`.
 */
export type FeedContestStatusTally = Partial<
    Record<ArenaContestParticipantStatus | "other", number>
> &
    Record<string, number>;

/** Same contract as above, over `picks.result`. `PickResult` itself admits null
 *  — a NULL result has no key here, it is simply never counted into a bucket. */
export type FeedContestResultTally = Partial<
    Record<NonNullable<PickResult> | "other", number>
> &
    Record<string, number>;

export type FeedContestStatsData = {
    contest: {
        id: string;
        name: string;
        context_type: string;
        template: string;
        entry_model: string;
        lifecycle_status: ContestLifecycleStatus;
        opens_at: string | null;
        locks_at: string;
        expected_ends_at: string | null;
        winning_places: number;
        allow_staff_participation: boolean;
        finalized_at: string | null;
        canceled_at: string | null;
        archived_at: string | null;
        /** Whether the PICKS are readable yet. The counts always are. */
        is_revealed: boolean;
        /** `contest.locks_at` while hidden, null once revealed. */
        reveal_at: string | null;
    };
    group: { id: string; name: string; group_type: string };
    viewer: {
        role: string | null;
        is_organizer: boolean;
        has_joined: boolean;
        participant_status: ArenaContestParticipantStatus | string | null;
        has_entry: boolean;
    };
    counts: {
        /** Who COULD take part. `eligible_to_enter` counts staff only when this
         *  contest opted them in (`staff_may_enter`). */
        audience: {
            group_members_total: number;
            members: number;
            commissioners: number;
            managers: number;
            staff: number;
            staff_may_enter: boolean;
            eligible_to_enter: number;
        };
        /** Who did. `active` is the live field — the same number the list and
         *  detail reads return as `participant_count`. */
        participants: {
            total: number;
            active: number;
            left_field: number;
            joined: number;
            with_entry: number;
            without_entry: number;
            members: number;
            staff: number;
            non_members: number;
            by_status: FeedContestStatusTally;
            by_role: FeedContestRoleTally;
            yet_to_join: number;
        };
        /** What was submitted. `total` is pick rows; `unique_entrants` is people
         *  — identical today, since a member holds exactly one entry. */
        entries: {
            total: number;
            unique_entrants: number;
            members: number;
            staff: number;
            non_members: number;
            by_role: FeedContestRoleTally;
            combo: number;
            single: number;
            pending: number;
            settled: number;
            by_result: FeedContestResultTally;
        };
        /** 0-1, four decimal places. NULL — never 0 — when nobody was eligible,
         *  so "nothing to divide by" cannot read as "nobody came". */
        rates: {
            join_rate: number | null;
            entry_rate: number | null;
            conversion_rate: number | null;
        };
    };
};

export type ArenaContestParticipantStatus =
    | "eligible"
    | "opted_in"
    | "entered"
    | "locked"
    | "completed"
    | "missed_deadline"
    | "withdrawn"
    | "disqualified";

// A row from arena_contest_participants (GET /group/arena/contest/:contest_id →
// my_participation): the caller's own participation, or null if they never opted
// in. Staff are noncompetitive, so theirs is null.
export type ArenaContestParticipant = {
    id: string;
    contest_id: string;
    user_id: string;
    status: ArenaContestParticipantStatus;
    rules_version_accepted: string | null;
    entry_id: string | null;
    opted_in_at: string | null;
    entered_at: string | null;
    created_at?: string;
    updated_at?: string;
};

// GET /group/arena/contest/:contest_id — a single contest for the detail page.
// contest_id travels as a path param (the endpoint also accepts ?contest_id=).
// arena_id is not required by the endpoint (it resolves the arena from the
// contest) but is carried for reducer scoping / the list fallback.
export type FetchArenaContestDetailPayload = {
    arena_id: string;
    contest_id: string;
};

// The endpoint returns the contest plus its arena identity, the live participant
// count, and the caller's own participation. Standings / achievements / review
// exceptions get added here as those sections are enabled.
export type ArenaContestDetailResponse = {
    contest: ArenaContest;
    arena: { id: string; name: string };
    participant_count: number;
    my_participation: ArenaContestParticipant | null;
};

// Arena contest lifecycle transitions map 1:1 to
// PUT /group/arena/contest/:contest_id/<action> endpoints (organizer only).
// The server enforces role + the from-state + any timing gate; the response
// echoes the updated contest.
export type ArenaContestTransition =
    | "schedule"   // draft     -> scheduled
    | "open"       // scheduled -> open   (blocked before opens_at)
    | "lock"       // open      -> locked (blocked before locks_at; settles entries)
    | "grading"    // locked    -> grading
    | "archive";   // final     -> archived

// contest_id travels as a path param; no body is required. arena_id is carried so
// the saga can re-read the contests list after the transition lands.
export type AdvanceArenaContestPayload = {
    arena_id: string;
    contest_id: string;
    action: ArenaContestTransition;
};

// POST /group/arena/join-arena-contest — body { contest_id, rules_version }. Member
// only (owners/managers are noncompetitive → 403). Requires the contest OPEN and
// within [opens_at, locks_at), writable hosting (402 otherwise), and the echoed
// rules_version to match the contest's current version (409 otherwise). Returns
// the opted_in participant row.
export type JoinArenaContestPayload = {
    contest_id: string;
    rules_version: string;
};

// Staff Feed — a published post in staff_feed_posts. Only the `announcement`
// kind is wired up right now (staff_pick / contest_results come later). The
// joined `author` is present on fetch (profiles join) but absent on the create
// response, which echoes the raw inserted row — so it is optional and can also
// arrive as a single-element array depending on the Supabase relation shape.
export type StaffAnnouncementAuthor = {
    id: string;
    username?: string | null;
    profile_image?: string | null;
};

export type StaffAnnouncement = {
    id: string;
    arena_id: string;
    author_user_id: string;
    author_role: string;
    kind: string;
    status: string;
    title?: string | null;
    body: string;
    contest_id?: string | null;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    author?: StaffAnnouncementAuthor | StaffAnnouncementAuthor[] | null;
};

/**
 * Arenas and Leagues share one Feed implementation. Arena keeps its historical
 * `/group/arena/*` + `arena_id` contract; League mirrors the same handlers under
 * `/group/league/*` and takes the app-standard `group_id` key. The saga resolves
 * both from this discriminator — see `feedScope` in arenaSaga.ts. Absent means
 * arena, so every existing Arena call site is unchanged.
 */
export type FeedGroupType = "arena" | "league";

/** Every Feed payload carries the owning group's id in `arena_id`, whatever its type. */
type FeedGroupScoped = {
    arena_id: string;
    group_type?: FeedGroupType;
};

// POST /group/{arena,league}/staff-announcement. The endpoint names the text field
// `text` (not `body`); every posting rule (staff-only, group alive) is enforced
// server-side.
export type CreateStaffAnnouncementPayload = FeedGroupScoped & {
    text: string;
};

// GET /group/{arena,league}/staff-announcements. page/limit are echoed so the list
// can page; the saga refreshes page 1 after a create.
export type FetchStaffAnnouncementPayload = FeedGroupScoped & {
    page?: number;
    limit?: number;
};

// DELETE /group/arena/staff-announcement/:announcement_id. Soft-delete (status
// flipped to 'deleted') allowed for the author or the Arena owner. arena_id is
// carried only so the reducer/saga knows which list the removed row belongs to.
export type DeleteStaffAnnouncementPayload = FeedGroupScoped & {
    announcement_id: string;
};

// PUT /group/arena/staff-announcement/:announcement_id. Partial update (author or
// owner). `text` rewrites the body (non-empty); `title` is optional/clearable
// (null wipes it). arena_id is carried only for saga/reducer scoping.
export type EditStaffAnnouncementPayload = FeedGroupScoped & {
    announcement_id: string;
    text: string;
    title?: string | null;
};

// PUT /group/arena/staff-announcement/:announcement_id/pin. Sets is_pinned to the
// requested boolean (author or owner). arena_id carried for scoping.
export type PinStaffAnnouncementPayload = FeedGroupScoped & {
    announcement_id: string;
    is_pinned: boolean;
};

// A staff pick — a `picks` row attached to the Arena via group_id and tagged
// pick_type=FEED. GET /group/arena/staff-picks embeds the author profile; the
// same normalize-array guard as StaffAnnouncement applies.
export type ArenaStaffPick = Pick & {
    author?: StaffAnnouncementAuthor | StaffAnnouncementAuthor[] | null;
};

// POST /group/arena/staff-pick. Body is the PickBuilder payload (same shape as
// createPostPick) plus arena_id; the endpoint forces pick_type=FEED and no XP,
// so those are omitted here. Every create rule (staff-only, arena alive) is
// enforced server-side.
export type CreateStaffPickPayload = Omit<
    CreatePostPickPayload,
    "pick_type" | "slip_id" | "pickId"
> &
    FeedGroupScoped & {
        american_odds: number;
    };

// POST /group/arena/community-pick. Same body shape as a Staff Pick (identical
// NFL-moneyline selection), but the endpoint is member-only, rate-limited (3 per
// Arena per rolling 24h), and stores pick_type=arena with a NULL contest — a
// community pick, not a competitive contest entry.
export type CreateCommunityPickPayload = CreateStaffPickPayload;

// GET /group/arena/staff-picks. page/limit echoed for paging; the saga refreshes
// page 1 after a create.
export type FetchStaffPickPayload = FeedGroupScoped & {
    page?: number;
    limit?: number;
};

// DELETE /group/arena/staff-pick/:pick_id. Hard delete (author or owner); arena_id
// is carried only for saga/reducer scoping.
export type DeleteStaffPickPayload = FeedGroupScoped & {
    pick_id: string;
};

// A community pick row (picks with pick_type=arena and feed_contest_id NULL) with
// its author profile joined by the fetch endpoint. Same object-or-array guard as
// ArenaStaffPick.
export type ArenaCommunityPick = Pick & {
    author?: StaffAnnouncementAuthor | StaffAnnouncementAuthor[] | null;
};

// GET /group/arena/community-picks?arena_id=&page=&limit=. Member-visible,
// newest-first, paginated.
export type FetchCommunityPicksPayload = FeedGroupScoped & {
    page?: number;
    limit?: number;
};

// PUT /group/arena/community-pick/:pick_id. Author-only, partial body of the pick
// fields, allowed only while the pick is pending and pregame. `changes` is the
// (re-picked) pick body; arena_id is carried for reducer scoping.
export type UpdateCommunityPickPayload = FeedGroupScoped & {
    pick_id: string;
    changes: Partial<CreateCommunityPickPayload>;
};

// DELETE /group/arena/community-pick/:pick_id. Author-only hard delete, pending +
// pregame. arena_id is carried for reducer scoping.
export type DeleteCommunityPickPayload = FeedGroupScoped & {
    pick_id: string;
};

// GET /group/arena/joined-open-contests?arena_id=. The member's opted_in/entered
// contests that are OPEN and before locks_at — the "which contest?" dropdown for a
// competitive entry. No pagination; soonest deadline first.
export type FetchJoinedOpenContestsPayload = {
    arena_id: string;
};

export type JoinedOpenArenaContest = {
    id: string;
    name: string;
    template: string;
    entry_model: string;
    sport: string;
    opens_at?: string | null;
    locks_at: string;
    rules_version: string;
    eligible_game_ids?: string[] | null;
    // 'opted_in' = can still enter; 'entered' = already submitted.
    my_status: string;
    my_entry_id?: string | null;
};

// POST /group/arena/contest/:contest_id/entry. A member submits ONE competitive
// pick into a joined, OPEN, single_pick contest they're opted_in to. `entry` is the
// pick body (same shape as a community pick, minus arena_id — the contest resolves
// the arena); arena_id is carried for reducer scoping / the joined-list refresh.
export type SubmitArenaContestEntryPayload = {
    contest_id: string;
    arena_id: string;
    entry: Omit<CreateCommunityPickPayload, "arena_id">;
};

// PUT /group/arena/competitive-pick/:pick_id (updateCompetitivePick). The member
// re-picks their OWN competitive entry while the contest is still open (pending +
// pregame). Partial body of the pick fields; note the endpoint recomputes `points`
// ONLY from `american_odds`, so include it. arena_id is carried for the re-fetch.
export type UpdateCompetitivePickPayload = {
    pick_id: string;
    arena_id: string;
    changes: Partial<CreateCommunityPickPayload> & { american_odds?: number };
};

export type ArenaContestPickMember = {
    id: string;
    username?: string | null;
    profile_image?: string | null;
};

// The revealed pick detail (only present on CLOSED-contest picks; null while open).
export type ArenaContestPickDetail = {
    description?: string;
    odds_bracket?: string | null;
    american_odds?: number | null;
    market?: string | null;
    side?: string | null;
    threshold?: number | null;
    game_id?: string | null;
    sport?: string | null;
    matchup?: string | null;
    match_date?: string | null;
    is_combo?: boolean;
    selection?: unknown;
    legs?: unknown;
    difficulty_label?: string | null;
    difficulty_tier?: number | null;
    confidence?: string | null;
    result?: PickResult;
    points?: number | null;
    arena_points_awarded?: number | null;
};

// One row from GET /group/arena/contest-picks/{open,closed}. Contest-scoped. For an
// OPEN contest, `pick` is null for OTHER members (details hidden server-side, even
// in the network tab), but revealed for the caller's OWN pick (is_own) so they can
// view and replace it. A CLOSED contest reveals everyone's.
export type ArenaContestPick = {
    id: string;
    is_open: boolean;
    is_own: boolean;
    created_at?: string | null;
    contest: { id: string; name: string; lifecycle_status: string } | null;
    member: ArenaContestPickMember;
    pick: ArenaContestPickDetail | null;
};

// GET /group/arena/contest-picks/open|closed?arena_id=&page=&limit=. Member-visible,
// newest-first, paginated.
export type FetchArenaContestPicksPayload = {
    arena_id: string;
    page?: number;
    limit?: number;
};

export type ArenaState = {
    hosting: ArenaHostingDetails | null;
    unlock: ArenaUnlockDetails | null;
    availableTiers: ArenaAvailableTier[];
    arenaContests: ArenaContest[];
    /**
     * Which arena the two single-tenant blocks above currently describe. The Feed
     * record slot is guarded at render time by useScopedGroup, but these lists live
     * in their own slice with no id of their own — without a stamp, Arena B renders
     * Arena A's contests and billing terms for the whole in-flight window.
     */
    hostingForId: string | null;
    arenaContestsForId: string | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    // Owner billing workspace (GET /group/arena/owned-hosting-details). Separate
    // from `hosting`/`unlock` above, which hold the single Arena being viewed.
    ownedHosting: OwnedArenaHostingRow[];
    ownedHostingHasMore: boolean;
    ownedHostingLoading: boolean;
    ownedHostingError: string | null;
    // Contest create (POST /group/arena/create-arena-contest). createdContest is
    // terminal for the create form — set only when the write lands, so the page
    // can navigate away exactly once.
    createContestLoading: boolean;
    createdContest: ArenaContest | null;
    createContestError: string | null;
    createContestMessage: string | null;
    // Contest detail (GET /group/arena/contest/:contest_id). The single contest
    // rendered on the detail page; the list-derived row is an instant fallback
    // until this resolves. The endpoint also returns the arena identity, the live
    // participant count, and the caller's own participation — stored for the
    // sections that consume them.
    contestDetail: ArenaContest | null;
    contestDetailArena: { id: string; name: string } | null;
    contestParticipantCount: number;
    contestMyParticipation: ArenaContestParticipant | null;
    contestDetailLoading: boolean;
    contestDetailError: string | null;
    // Contest lifecycle advance (PUT /group/arena/contest/:id/<action>).
    // Owner/manager Schedule/Open transitions (later Lock/Grade/Archive).
    // advanceContestMessage is the one-shot the detail page surfaces as a toast.
    advanceContestLoading: boolean;
    advanceContestError: string | null;
    advanceContestMessage: string | null;
    // Join contest (POST /group/arena/join-arena-contest). Member opt-in; the
    // returned participant replaces contestMyParticipation.
    joinContestLoading: boolean;
    joinContestError: string | null;
    joinContestMessage: string | null;
    // Staff announcements (GET /group/arena/staff-announcements). List is the
    // current page window; page/hasMore drive load-more.
    staffAnnouncements: StaffAnnouncement[];
    staffAnnouncementsLoading: boolean;
    staffAnnouncementsError: string | null;
    staffAnnouncementsPage: number;
    staffAnnouncementsHasMore: boolean;
    // Announcement create (POST /group/arena/staff-announcement). createdAnnouncement
    // is the one-shot the composer bridge resolves on; the saga also re-reads the
    // list so the author-joined, pinned-ordered row replaces the raw insert echo.
    createAnnouncementLoading: boolean;
    createdAnnouncement: StaffAnnouncement | null;
    createAnnouncementError: string | null;
    createAnnouncementMessage: string | null;
    // Announcement soft-delete (DELETE /group/arena/staff-announcement/:id).
    // deleteAnnouncementLoadingId is the row currently being removed, so only that
    // card shows a busy state; the reducer drops the row from the list on success.
    deleteAnnouncementLoadingId: string | null;
    deleteAnnouncementError: string | null;
    deleteAnnouncementMessage: string | null;
    // Announcement edit (PUT /group/arena/staff-announcement/:id). editLoadingId is
    // the row being edited; the reducer merges the edited fields into the list row
    // (preserving the author join the edit response omits).
    editAnnouncementLoadingId: string | null;
    editAnnouncementError: string | null;
    editAnnouncementMessage: string | null;
    // Announcement pin/unpin (PUT /group/arena/staff-announcement/:id/pin).
    pinAnnouncementLoadingId: string | null;
    pinAnnouncementError: string | null;
    pinAnnouncementMessage: string | null;
    // Staff picks (GET /group/arena/staff-picks) — picks rows tagged pick_type=FEED.
    staffPicks: ArenaStaffPick[];
    staffPicksLoading: boolean;
    staffPicksError: string | null;
    staffPicksPage: number;
    staffPicksHasMore: boolean;
    // Staff pick create (POST /group/arena/staff-pick). The create UI is the
    // composer's Staff Pick mode; this state is the plumbing it dispatches through.
    createStaffPickLoading: boolean;
    createdStaffPick: ArenaStaffPick | null;
    createStaffPickError: string | null;
    createStaffPickMessage: string | null;
    // Community pick create (POST /group/arena/community-pick). The member-side
    // counterpart of a Staff Pick; the composer's community_pick mode dispatches
    // through this state and the bridge resolves on the created pick / message.
    createCommunityPickLoading: boolean;
    createdCommunityPick: Pick | null;
    createCommunityPickError: string | null;
    createCommunityPickMessage: string | null;
    // Community picks list (GET /group/arena/community-picks). Page window, newest
    // first; page/hasMore drive load-more.
    communityPicks: ArenaCommunityPick[];
    communityPicksLoading: boolean;
    communityPicksError: string | null;
    communityPicksPage: number;
    communityPicksHasMore: boolean;
    // Community pick update (PUT .../community-pick/:id) — the author re-picks. The
    // updated row replaces its list entry; the replace bridge resolves on it.
    updateCommunityPickLoading: boolean;
    updatedCommunityPick: Pick | null;
    updateCommunityPickError: string | null;
    updateCommunityPickMessage: string | null;
    // Community pick delete (DELETE .../community-pick/:id) — author only. The
    // reducer drops the row from the list on success.
    deleteCommunityPickLoadingId: string | null;
    deleteCommunityPickError: string | null;
    deleteCommunityPickMessage: string | null;
    // Joined open contests (GET /group/arena/joined-open-contests). The competitive
    // pick composer's contest dropdown.
    joinedOpenContests: JoinedOpenArenaContest[];
    joinedOpenContestsLoading: boolean;
    joinedOpenContestsError: string | null;
    // Competitive pick / contest entry (POST /contest/:id/entry). The composer
    // bridge resolves on submittedEntryPick / message.
    submitEntryLoading: boolean;
    submittedEntryPick: Pick | null;
    submitEntryError: string | null;
    submitEntryMessage: string | null;
    // Competitive pick replace (PUT /contest/:id/entry) — the member re-picks their
    // own entry while the contest is still open. The replace bridge resolves on
    // replacedEntryPick / message.
    replaceEntryLoading: boolean;
    replacedEntryPick: Pick | null;
    replaceEntryError: string | null;
    replaceEntryMessage: string | null;
    // Competitive picks in OPEN contests (GET /contest-picks/open) — details hidden
    // server-side until lock. And CLOSED contests (GET /contest-picks/closed) — full
    // details revealed. Both feed the competitive_pick records.
    openContestPicks: ArenaContestPick[];
    openContestPicksLoading: boolean;
    openContestPicksError: string | null;
    openContestPicksPage: number;
    openContestPicksHasMore: boolean;
    closedContestPicks: ArenaContestPick[];
    closedContestPicksLoading: boolean;
    closedContestPicksError: string | null;
    closedContestPicksPage: number;
    closedContestPicksHasMore: boolean;
    // Staff pick delete (DELETE /group/arena/staff-pick/:id). deletePickLoadingId is
    // the row being removed; the reducer drops it from the list on success.
    deleteStaffPickLoadingId: string | null;
    deleteStaffPickError: string | null;
    deleteStaffPickMessage: string | null;
    // Permanent unlock action (POST /group/arena/unlock-arena) status.
    unlockLoading: boolean;
    unlockError: string | null;
    unlockMessage: string | null;
    // Shared status for the three owner-only member writes (make-manager /
    // make-member / remove-member). Only one can run at a time, so they share
    // one slot; memberActionUserId is the row currently being written.
    memberActionLoading: boolean;
    memberActionUserId: string | null;
    memberActionError: string | null;
    memberActionMessage: string | null;
    // Ownership transfer. `transfer` is the single pending request visible to the
    // current user; canRespond/canCancel say which side of it they are on.
    transfer: ArenaOwnershipTransfer | null;
    canRespondToTransfer: boolean;
    canCancelTransfer: boolean;
    transferLoading: boolean;
    // Separate from transferLoading so a create/respond/cancel write doesn't make
    // the section flash back to its loading state.
    transferActionLoading: boolean;
    transferError: string | null;
    transferMessage: string | null;
    // Arena identity edits (PUT /group/arena/details).
    updateLoading: boolean;
    updateError: string | null;
    updateMessage: string | null;
    // Shared status for the three hosting writes (activate-hosting /
    // schedule-pause / cancel-pause). Only one runs at a time.
    hostingActionLoading: boolean;
    hostingActionError: string | null;
    hostingActionMessage: string | null;
    // Which tier an activate-hosting call is in flight for, so only that card
    // shows a busy state.
    hostingActionTier: string | null;
    // Two-step delete. otpSent gates the code dialog; deleted is terminal and
    // tells the page to navigate away.
    arenaDeleteLoading: boolean;
    arenaDeleteOtpSent: boolean;
    arenaDeleted: boolean;
    arenaDeleteError: string | null;
    arenaDeleteMessage: string | null;
    // Leaving. `arenaLeft` is terminal — the user is no longer a member, so the
    // page has to navigate away rather than re-read an Arena it can't see.
    leaveArenaLoading: boolean;
    arenaLeft: boolean;
    leaveArenaError: string | null;
    leaveArenaMessage: string | null;
    // My-Arenas list (GET /group/arena) for the Arenas tab. Same response shape
    // as the group slice's myGroups but kept separate so the Leagues tab and
    // every other consumer of state.group are untouched.
    arenaGroups: GroupObject[] | null;
    arenaGroupsLoading: boolean;
    arenaGroupsError: string | null;
    arenaGroupsHasMore: boolean;
    // Arena hub tabs. GET /group/arena/owned-arenas is role='commissioner' only;
    // GET /group/arena/joined-arenas is every OTHER role, managers included. Two
    // independently paged lists, so each keeps its own page/hasMore/total rather
    // than partitioning one list client-side (which would mis-count both tabs).
    ownedArenas: GroupObject[] | null;
    ownedArenasLoading: boolean;
    ownedArenasError: string | null;
    ownedArenasHasMore: boolean;
    ownedArenasTotal: number;
    joinedArenas: GroupObject[] | null;
    joinedArenasLoading: boolean;
    joinedArenasError: string | null;
    joinedArenasHasMore: boolean;
    joinedArenasTotal: number;
    // POST /group/arena/join-arena. `joinArenaCrossType` is set when the code
    // resolved to a League (409) so the dialog can offer the Leagues tab instead
    // of showing a dead-end error.
    joinArenaLoading: boolean;
    joinArenaError: string | null;
    joinArenaMessage: string | null;
    joinArenaCrossType: boolean;
    joinArenaNotFound: boolean;
    joinedArena: JoinedCommunity | null;
};

export type ArenaSelector = {
    arena: ArenaState;
};

export type RootState = {
    group: GroupSliceState;
    slip: SlipState;
    pick: PickState;
    user: AuthSliceState;
    nfl: NFLState;
    nba: NBAState;
    ncaab: NCAABState;
    nhl: NHLState;
    mlb: MLBState;
    progress: ProgressState;
    league: LeagueState;
    feedback: FeedbackState;
    notifications: NotificationsState;
    social: SocialState;
    soccer: SoccerState;
    contest: ContestState;
    arena: ArenaState;
    feedContest: FeedContestState;
    feedContestSchedule: FeedContestScheduleState;
    feedContestOdds: FeedContestOddsState;
    memberCard: MemberCardState;
};

export type UpdateGroupPayload = {
    name: string;
    description: string;
    group_id: string;
};

export type InitialPasswordOTPPayload = {
    email: string;
};

export type AcceptDeclineFollowRequestPayload = {
    requestId: string;
    notificationId: string;
};

export type BlockUserPayload = {
    blockedUserId: string;
};

export type UnblockUserPayload = {
    blockedUserId: string;
};

export type EnablePostAlertPayload = {
    targetUserId: string;
};

export type DisablePostAlertPayload = {
    targetUserId: string;
};

export type FetchProfileBadgesPayload = {
    user_id: string;
};

export type FetchFollowingUsersListByIdPayload = {
    user_id: string;
};

export type FetchFollowerUsersListByIdPayload = {
    user_id: string;
};

export type VerifyPasswordOTPPayload = {
    email: string;
    otp: string;
};

export type ResetPasswordPayload = {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
}

export type ChangePasswordPayload = {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export type PickScope = "GAME_LINE" | "PLAYER_PROP";

export type PickMarket =
    | "MONEYLINE"
    | "SPREAD"
    | "TOTAL_POINTS"
    | "PASSING_YARDS"
    | "PASSING_RUSHING_YARDS"
    | "RUSHING_YARDS"
    | "RUSHING_RECEIVING_YARDS"
    | "RECEIVING_YARDS"
    | "RECEPTIONS"
    | "RUSHING_ATTEMPTS"
    | "PASSING_TDS"
    | "RUSHING_TDS"
    | "RECEIVING_TDS"
    | "PLAYER_TDS";

export type PickSide = "OVER" | "UNDER";

export type BookOdds = {
    book: string;
    americanOdds: number;
    marketLine?: number;
};

export type BookOffer = BookOdds & { deeplinkUrl?: string };

export type ValidatePickRequest = {
    scope: PickScope;
    market: PickMarket;
    gameId: string;
    teamId?: string;
    playerId?: string;
    side?: PickSide;
    threshold?: number;
    groupId?: string;
    contestId?: string;
    userId?: string;
    price?: number;
    links?: {
        desktop: string;
        mobile: string;
    };
    external_pick_key?: string;
};

export type ValidatePickResponse = {
    status: "VALID" | "TOO_SAFE" | "TOO_CRAZY" | "NO_MARKET" | "API_ERROR";
    suggestedThresholds?: number[];
    bookOdds?: BookOdds[];
    bestOffer?: BookOffer;
    difficultyTier?: 1 | 2 | 3 | 4 | 5;
    points?: number;
    links?: {
        desktop: string;
        mobile: string;
    }
};

export type AuthUserData = {
    access_token?: string;
    refresh_token?: string;
    userId?: string;
    userData?: CurrentUser;
    user_metadata?: CurrentUser;
    provider?: string;
};

export type AuthUserPayload = {
    data?: {
        user?: AuthUserData;
    };
    url?: string;
};

export type FollowersList = {
    id: string;
    created_at?: string;
    following_id?: string;
    follower_id?: string;
    follower: {
        id: string;
        email?: string;
        username: string;
        profile_image?: string;
    }
}

export type FollowingsList = {
    id: string;
    created_at?: string;
    following_id?: string;
    follower_id?: string;
    following: {
        id: string;
        email?: string;
        username: string;
        profile_image?: string;
    }
}

export type AuthSliceState = {
    user: AuthUserPayload | null;
    followers: FollowersList[] | null;
    followings: FollowingsList[] | null;
    followersById: [] | null;
    followingsById: [] | null;
    followReuests: FollowRequest[] | null;
    sentFollowReuests: FollowRequest[] | null;
    blockedUsers: BlockedUsers[] | null;
    postAlerts: PostAlerts[] | null;
    profileBadges: ProfileBadgeProgress[] | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    isProfileLoading: boolean;
    badgeLoading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage: string | null;
    resendMessage: string | null;
    initialForgotPasswordMessage: string | null;
    initialForgotPasswordError: string | null;
    verifyForgotPasswordMessage: string | null;
    verifyForgotPasswordError: string | null;
    refreshTokenData: string | null;
    resetPasswordMessage: string | null;
    resetPasswordError: string | null;
    hasMoreBlockedUsers: boolean;
};

export type FetchNFLSchedulePayload = {
    result_deadline?: string;
    pick_deadline?: string;
    is_pick_of_day?: boolean;
    date?: string;
};

export type FetchNBASchedulePayload = {
    result_deadline?: string;
    pick_deadline?: string;
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchNCAABSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchNHLSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchSoccerEnglandPremierLeagueSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchSoccerGermanyBundesligaSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchSoccerFIFAWorldCupSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchMLBSchedulePayload = {
    is_pick_of_day: boolean;
    date?: string;
    is_range: boolean;
};

export type FetchLeagueCountsPayload = {
    date?: string;
};

// GET /leagues/matchup-counts — "which leagues have games across THESE dates,
// and how many". Unlike /leagues/fetch-schedules-counts (one calendar day, flat
// object) this accepts a range and answers a list the server has already sorted.
export type FetchLeagueMatchupCountsPayload = {
    /**
     * `YYYY-MM-DD`, a comma-separated list, or `YYYY-MM-DD-YYYY-MM-DD` for a
     * range. Omitted means "today", in the zone the `x-timezone` header names.
     */
    date?: string;
    /** "count" (most matchups first, the default) or "league" (by name). */
    sort?: "count" | "league";
};

// GET /leagues/<sport>/schedules-for-all-tz — the unpriced schedule feed. Since
// the 2026-08 rewrite its `date` takes the same grammar as /matchup-counts (one
// day, a comma list, or `from-to`, capped at 31 days) and it filters in the zone
// the `x-timezone` header names. Events carry teams and kickoff, never odds.
export type LeagueScheduleTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

export type LeagueScheduleEvent = {
    id: string;
    /** Cross-provider ids; the only join key stable across OddsBlaze feeds. */
    mappings?: Record<string, { id?: string } | undefined>;
    teams: { home: LeagueScheduleTeam; away: LeagueScheduleTeam };
    date: string;
    live?: boolean;
};

export type FetchFeedContestSchedulesPayload = {
    /** Contest sports — "NFL" | "NBA" | "NCAAB" | "NHL" | "MLB" | "Soccer". */
    sports: string[];
    /** `YYYY-MM-DD`, a comma list, or `YYYY-MM-DD-YYYY-MM-DD`. */
    date: string;
    /**
     * The zone `date` is expressed in, sent as `X-Timezone`. Omit to let
     * axiosInstance fall back to the browser's.
     *
     * Sunday Pick'em pins this to the NFL league clock: the backend's
     * `buildSundayPickemSlate` runs its "same Sunday" test in
     * America/New_York and rejects anything else, so the wizard has to ask
     * for Eastern days or it will offer a slate the endpoint refuses.
     */
    time_zone?: string;
};

/** One league feed's slice of the answer; Soccer contributes three of these. */
export type FeedContestScheduleGroup = {
    sport: string;
    competition: string;
    events: LeagueScheduleEvent[];
};

export type FeedContestScheduleState = {
    /**
     * `<sports>|<date>` the stored groups describe. Compared by the consumer so
     * an answer for an abandoned slate is never read as the current one.
     */
    requestKey: string;
    groups: FeedContestScheduleGroup[];
    loading: boolean;
    error: string | null;
};

/* ----------------------------------------------------------------------------
 * The PRICED half of the Feed contest flow: odds for exactly the events an
 * organizer froze into a contest's slate.
 *
 *   GET /leagues/schedules-with-odds-by-events?events=<league>:<id>,…
 *   GET /leagues/<league>/schedules-with-odds-by-events?event_ids=<id>,…
 *   GET /leagues/soccer/<competition>-schedules-with-odds-by-events?event_ids=…
 *
 * `schedules-for-all-tz` (unpriced, range-addressable) is the first half and is
 * what the CREATE wizard reads; these are the second half and are what the ENTRY
 * screen reads. Ids the provider carries no odds for come back under
 * `missing_event_ids` with HTTP 200 — that is the endpoint working, not failing,
 * and those games must render as "Markets not posted yet", never as an error.
 * -------------------------------------------------------------------------- */

/** A priced event. Structurally identical to `NFLSchedulesWithOdds` & friends. */
export type FeedContestOddsEvent = {
    id: string;
    teams: TeamsObject;
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
};

/** `data.schedule` of ONE per-league by-events response. */
export type LeagueOddsByEventsSchedule = {
    updated: string;
    league?: LeagueObject | null;
    sportsbook?: SportsBookObject | { id: string };
    /** Ordered by the REQUESTED ids; ids the provider omitted are simply absent. */
    events: FeedContestOddsEvent[];
    requested_event_ids: string[];
    missing_event_ids: string[];
    /** TRUE when an upstream batch failed: a missing id is UNKNOWN, not unpriced. */
    partial: boolean;
};

/** One league's slice of the MULTI-league response. */
export type MultiLeagueOddsByEventsSlice = {
    league: string;
    name: string;
    sport: string | null;
    /** FALSE when that league could not be read at all — "missing" means unknown. */
    available: boolean;
    events: FeedContestOddsEvent[];
    requested_event_ids: string[];
    missing_event_ids: string[];
    partial: boolean;
};

/** `data.schedule` of the multi-league response. */
export type MultiLeagueOddsByEventsSchedule = {
    updated: string;
    sportsbook?: SportsBookObject | { id: string };
    total_requested: number;
    total_events: number;
    total_missing: number;
    partial: boolean;
    leagues: MultiLeagueOddsByEventsSlice[];
};

export type FeedContestSportsbook = "fanduel" | "draftkings";

export type FetchFeedContestOddsPayload = {
    /** Scopes the answer, so an abandoned contest's odds are never read as current. */
    contest_id: string;
    /** The contest's slate, straight off `contest.eligible_games_json`. */
    games: FeedContestGameSnapshot[];
    /** Defaults to FanDuel server-side; only these two books exist upstream. */
    sportsbook?: FeedContestSportsbook;
};

/**
 * One league feed's slice of the merged answer. Soccer contributes up to three
 * of these, because a slate row only records the sport ("Soccer") and not which
 * competition the game belongs to.
 */
export type FeedContestOddsGroup = {
    /** The CONTEST sport — "NFL" | "NBA" | "NCAAB" | "NHL" | "MLB" | "Soccer". */
    sport: string;
    /** Display name: "NFL", "Premier League", … */
    competition: string;
    /** The OddsBlaze league id actually called: "nfl" | "england-premier-league" | … */
    league: string;
    events: FeedContestOddsEvent[];
    missingEventIds: string[];
    partial: boolean;
};

export type FeedContestOddsState = {
    /**
     * `<contestId>|<sportsbook>|<sorted game ids>` the stored groups describe.
     * Compared by the consumer, exactly as `feedContestSchedule.requestKey` is.
     */
    requestKey: string;
    groups: FeedContestOddsGroup[];
    /**
     * Slate ids no league answered with odds. Rendered as "Markets not posted
     * yet" on the matchup row — these games stay VISIBLE and unpickable.
     */
    missingGameIds: string[];
    /** TRUE when at least one league feed failed outright. */
    partial: boolean;
    /** `Date.now()` of the last success — the review sheet re-quotes off it. */
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
};

/** One OddsBlaze league id — `nba`, `nfl`, `england-premier-league`, … */
export type LeagueMatchupCount = {
    league: string;
    name: string;
    sport: string | null;
    count: number;
    /** FALSE when that league's upstream call failed: `count` is unknown, not 0. */
    available: boolean;
};

export type LeagueMatchupCountsData = {
    /** The canonical spec the server re-serialised — never the raw input. */
    date: string;
    days: string[];
    time_zone: string;
    sort: "count" | "league";
    has_matchups: boolean;
    total_matchups: number;
    /** TRUE when at least one league's upstream call failed. */
    partial: boolean;
    leagues: LeagueMatchupCount[];
};

export type FetchLiveNFLOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchNBAOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchNCAABOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchNHLOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchSoccerEnglandPremierLeagueOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchSoccerGermanyBundesligaOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchSoccerFIFAWorldCupOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchMLBOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchPassingPropsPlayersPayload = {
    match_id: string;
};

export type FetchReceivingPropsPlayersPayload = {
    match_id: string;
};

export type FetchRushingPropsPlayersPayload = {
    match_id: string;
};

export type FetchTouchDownPropsPlayersPayload = {
    match_id: string;
};

export type ValidateMyPickPayload = {
    external_pick_key: string;
    match_id: string;
};

export type ValidateMyNBAPickPayload = {
    external_pick_key: string;
    match_id: string;
};

export type ValidateMyNCAABPickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type ValidateMyNHLPickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type ValidateMySoccerEnglandPremierLeaguePickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type ValidateMySoccerGermanyBundesligaPickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type ValidateMySoccerFIFAWorldCupPickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type ValidateMyMLBPickPayload = {
    external_pick_key: string;
    match_id: string;
    is_live: boolean;
};

export type NFLPlayer = {
    id: string;
    name: string;
    position: string;
    profile_image: string;
    team: string;
    teamId?: number;
    opponent: string;
    opponentId?: number;
    gameId: string;
    week: number;
    date: string;
    isHomeGame: string;
};

export type TeamsObject = {
    away: {
        id: string;
        name: string;
        abbreviation: string;
    },
    home: {
        id: string;
        name: string;
        abbreviation: string;
    }
}

/**
 * Third-party ids OddsBlaze attaches to an event (MLB, SportsDataIO, Sofascore,
 * Kalshi …). The ONLY value observed to agree between the priced and schedule
 * feeds for the same game — their top-level `id`s do not. See
 * lib/schedules/eventIdentity.ts.
 */
export type EventMappings = Record<string, { id: string | number }>;

export type LeagueObject = {
    id: string;
    name: string;
    sport: string;
}

export type SportsBookObject = {
    id: string;
    name: string;
}

export type NFLSchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type NFLSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type NBASchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type NBASchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type NCAABSchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type NCAABSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type NHLSchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type NHLSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type SoccerSchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type SoccerSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type MLBSchedulesWithOdds = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
    mappings?: EventMappings;
}

export type MLBSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    /** Schedule feed only: "Scheduled" | "Postponed" | … */
    status?: string;
    mappings?: EventMappings;
}

export type OddSelectionObject = {
    name?: string;
    side?: string;
    line?: number;
}

export type OddPlayerObject = {
    id: string;
    name: string;
    position: string;
    number: number | null;
    team: {
        id: string;
        name: string;
        abbreviation: string;
    }
}

export type OddsObject = {
    id: string;
    market: string;
    name: string;
    price: string;
    main: boolean;
    sgp?: string;
    links: {
        desktop: string;
        mobile: string;
    };
    selection: OddSelectionObject;
    player?: OddPlayerObject;
    updated: string;
}

export type OddsData = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
}

export type NFLOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type NBAOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type NCAABOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type NHLOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type SoccerOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type MLBOdds = {
    updated: string;
    league: LeagueObject;
    sportsbook: SportsBookObject;
    events: OddsData[];
}

export type PassingPicksObject = {
    over: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    };
    under: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    }
}

export type RushingPicksArray = {
    id: string;
    price: string;
    links: {
        desktop: string;
        mobile: string;
    };
    sgp: string;
    side: string;
    line: number;
    main: boolean;
}

export type TDScorerPicksObject = {
    anytime?: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    };
    first?: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    };
    last?: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    };
    over?: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    };
    under?: {
        id: string;
        price: string;
        links: {
            desktop: string;
            mobile: string;
        };
        sgp: string;
    }
}

export type PassingPropsObject = {
    playerId: string;
    playerName: string;
    position: string;
    team: {
        id: string;
        name: string;
        abbreviation: string;
    };
    market: string;
    line: number;
    picks: RushingPicksArray[];
}

export type ReceivingPropsObject = {
    playerId: string;
    playerName: string;
    position: string;
    team: {
        id: string;
        name: string;
        abbreviation: string;
    };
    market: string;
    line: number;
    picks: RushingPicksArray[];
}

export type RushingPropsObject = {
    playerId: string;
    playerName: string;
    position: string;
    team: {
        id: string;
        name: string;
        abbreviation: string;
    };
    market: string;
    line: number;
    picks: RushingPicksArray[];
}

export type TouchDownPropsObject = {
    playerId: string;
    playerName: string;
    position: string;
    team: {
        id: string;
        name: string;
        abbreviation: string;
    };
    market: string;
    line: number;
    picks: TDScorerPicksObject;
}

export type NFLState = {
    nflSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: NFLSchedulesWithOdds[];
    } | null,
    nflSchedules: {
        updated: string;
        events: NFLSchedules[];
    } | null,
    nflOdds: NFLOdds | null;
    nflPassingProps: PassingPropsObject[] | null;
    nflReceivingProps: ReceivingPropsObject[] | null;
    nflRushingProps: RushingPropsObject[] | null;
    nflTouchDownProps: TouchDownPropsObject[] | null;
    session: SessionState | null;
    hasSeenIntro: boolean;
    loading: boolean;
    oddsLoading: boolean;
    validateLoading: boolean;
    error: string | null;
    message: string | null;
    validPickError: string | null;
    validPickMessage: string | null;
};

export type Progress = {
    id?: string;
    user_id: string;
    lifetime_xp: number;
    xp_today: number;
    last_xp_date: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type PicksCount = {
    total: number,
    win: number,
    loss: number,
    void: number,
    pending: number,
}

export type SlipsCount = {
    open_slip: number,
    final_slip: number,
}

export type ProgressState = {
    loading: boolean,
    error: string | null,
    message: string | null,
    progress: Progress | null,
    picksCount: PicksCount | null,
    slipsCount: SlipsCount | null,
    hasSeenIntro: boolean;
    hasSeenWelcomeIntro: boolean;
    hasSeenGroupIntro: boolean;
    hasSeenSocialIntro: boolean;
}

export type TutorialProgress = {
    hasSeenWelcomeIntro: boolean;
    hasSeenGroupIntro: boolean;
    hasSeenSocialIntro: boolean;
}

export type SearchUsers = {
    id: string;
    username: string;
    is_public: boolean;
    profile_image?: string;
    full_name?: string;
}

export type SocialState = {
    loading: boolean,
    error: string | null,
    message: string | null,
    users: SearchUsers[] | null,
    hasMore: boolean,
}

export type NBAState = {
    nbaSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: NBASchedulesWithOdds[];
    } | null,
    nbaSchedules: {
        updated: string;
        events: NBASchedules[];
    } | null,
    fanduelNbaOdds: NBAOdds | null;
    draftkingNbaOdds: NBAOdds | null;
    loading: boolean;
    oddsLoading: boolean;
    error: string | null;
    message: string | null;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type NCAABState = {
    ncaabSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: NCAABSchedulesWithOdds[];
    } | null,
    ncaabSchedules: {
        updated: string;
        events: NCAABSchedules[];
    } | null,
    ncaabOdds: NCAABOdds | null;
    fanduelNcaabOdds: NCAABOdds | null;
    draftkingNcaabOdds: NCAABOdds | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    oddsLoading: boolean;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type NHLState = {
    nhlSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: NHLSchedulesWithOdds[];
    } | null,
    nhlSchedules: {
        updated: string;
        events: NHLSchedules[];
    } | null,
    nhlOdds: NHLOdds | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    oddsLoading: boolean;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type SoccerState = {
    englandPremierLeagueSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedulesWithOdds[];
    } | null,
    englandPremierLeagueSchedules: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedules[];
    } | null,
    germanyBundesligaSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedulesWithOdds[];
    } | null,
    germanyBundesligaSchedules: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedules[];
    } | null,
    fifaWorldCupSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedulesWithOdds[];
    } | null,
    fifaWorldCupSchedules: {
        updated: string;
        league: LeagueObject;
        events: SoccerSchedules[];
    } | null,
    fanduelEnglandPremierLeagueOdds: SoccerOdds | null;
    draftkingEnglandPremierLeagueOdds: SoccerOdds | null;
    fanduelGermanyBundesligaOdds: SoccerOdds | null;
    draftkingGermanyBundesligaOdds: SoccerOdds | null;
    fanduelFifaWorldCupOdds: SoccerOdds | null;
    draftkingFifaWorldCupOdds: SoccerOdds | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    oddsLoading: boolean;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type MLBState = {
    mlbSchedulesWithOdds: {
        updated: string;
        league: LeagueObject;
        events: MLBSchedulesWithOdds[];
    } | null,
    mlbSchedules: {
        updated: string;
        events: MLBSchedules[];
    } | null,
    mlbOdds: MLBOdds | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    oddsLoading: boolean;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type LeagueState = {
    leagueCounts: Record<string, number> | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    // /leagues/matchup-counts is kept on its own loading/error pair: it is
    // debounced behind a date picker, and its spinner must not be mistaken for
    // the single-day `leagueCounts` fetch the pick builder waits on.
    matchupCounts: LeagueMatchupCountsData | null;
    matchupCountsLoading: boolean;
    matchupCountsError: string | null;
};

export type PickSelectionMeta = {
    sport?: League | string;
    scope?: string;
    market?: string;
    gameId?: string;
    gameStartTime?: string;
    teamId?: string;
    playerId?: string;
    side?: string;
    threshold?: number;
    home_team?: string;
    home_abbr?: string;
    away_team?: string;
    away_abbr?: string;
    matchup?: string;
    match_date?: string;
    external_pick_key?: string;
    league?: string;
};

export type PickLeg = {
    description: string;
    odds_bracket: string;
    difficulty_label?: DifficultyLabel | null;
    difficulty_tier?: number;
    external_pick_key?: string;
    selection?: PickSelectionMeta;
    points?: number;
    result?: PickResult;
    matchup?: string;
    match_time?: string;
};

export type BuiltPickPayload = {
    sport?: League | string;
    description: string;
    odds_bracket?: string | null;
    difficulty_label?: DifficultyLabel | null;
    points?: number;
    selection?: PickSelectionMeta;
    scope?: PickScope;
    market?: string;
    side?: PickSide;
    threshold?: number;
    gameId?: string;
    week?: string;
    teamId?: string;
    playerId?: string;
    difficultyTier?: number;
    bestOffer?: BookOffer;
    bookOdds?: BookOdds[];
    validationStatus?: "VALID" | "TOO_SAFE" | "TOO_CRAZY" | "NO_MARKET" | "API_ERROR" | undefined;
    buildMode?: BuildMode;
    external_pick_key?: string;
    created_at?: string;
    confidence?: ConfidenceLevel | null;
    isCombo?: boolean;
    legs?: PickLeg[];
    sourceTab?: string;
    matchup?: string;
    match_date?: string;
};

export type DraftPick = BuiltPickPayload & {
    id?: string;
    userId?: string;
    createdAt?: string;
    summary?: string,
    matchup?: string,
    odds?: string,
    market?: string,
    lineLabel: string | null,
    displayDifficulty?: string,
    points?: number,
    source?: string,
    selection?: PickSelectionMeta
};

export type PickReactionMap = Record<string, string[]>;

export type PickOfDayEntry = DraftPick & {
    result: PickResult;
    likedBy: string[];
    reactions: PickReactionMap;
};

export type PickOfDayState = {
    streak: number;
    entries: PickOfDayEntry[];
};

export type PickOfTheDay = {
    id?: string;
    user_id: string;
    description: string;
    odds_bracket: string;
    result: PickResult;
    points: number;
    updated_at: string;
    created_at: string;
    scope?: PickScope;
    market?: PickMarket;
    game_id?: string;
    player_id?: string;
    side?: PickSide;
    threshold?: number;
    difficulty_tier?: 1 | 2 | 3 | 4 | 5;
    sport: League | string;
    difficulty_label: DifficultyLabel | null;
    week_number?: number;
    selection?: PickSelectionMeta;
    build_mode?: BuildMode;
    pick_type: PickType;
    profiles?: {
        id?: string;
        username?: string;
        user_id?: string;
        profile_image?: string;
        [key: string]: unknown;
    };
    likedBy?: string[];
    reactions?: {
        liked?: string[],
        dislike?: string[],
        fire?: string[],
        mind_blown?: string[],
        eyes?: string[],
        gem?: string[],
    };
    confidence?: ConfidenceLevel;
    is_combo?: boolean;
    legs?: PickLeg[];
};

export type FetchMemberProfilePayload = {
    userId: string;
}

export type FollowUnfollowUserPayload = {
    user_id: string;
}

export type GroupSummary = {
    id?: string;
    name: string;
    sport_type?: string;
    theme_variant?: string;
    description?: string;
    contest_style?: ContestStyle;
    contest_end_date?: string | null;
    active_slip_id?: string | null;
    pick_deadline?: string;
    result_deadline?: string;
    invite_code?: string;
    created_by?: string;
    members?: Members;
    active_slip?: ActiveSlip;
    open?: number;
    final?: number;
    totalSlips?: number;
    commissioner?: boolean;
    is_enable_secondary_leaderboard: boolean;
}

export type RecentPick = {
    id: string;
    slip_id: string;
    user_id: string;
    description: string;
    odds_bracket: string;
    result: PickResult;
    points: number;
    bonus?: number;
    scope?: PickScope;
    market?: PickMarket;
    threshold?: number;
    game_id?: string;
    player_id?: string;
    difficulty_tier?: 1 | 2 | 3 | 4 | 5;
    difficulty_label?: DifficultyLabel | null;
    external_pick_key?: string;
    pick_type?: PickType;
    confidence?: string;
    is_combo: boolean;
    validation_status?: ValidatePickResponse["status"];
    week_number?: number;
    created_at?: string;
}

export type DeletePickPayload = {
    pick_id: string;
};

export type GradingPayloadItem = {
    id: string;
    result: string;
    points: number;
    bonus: number;
};

export type LeaderboardList = {
    id: string;
    name: string;
    group_id: string;
    sport_scope: string | null;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    isDefault: boolean;
    created_at: string;
    archived_at?: string;
    hasAnyOpenSlips: boolean;
    totalSlipCount: number;
    openSlipCount: number;
};

export type ReactionKey =
    | "liked"
    | "dislike"
    | "fire"
    | "mind_blown"
    | "eyes"
    | "gem";

export type OddsBlazeSelection = {
    name?: string;
    side?: string;
    line?: number;
};

export type OddsBlazeOdd = {
    id: string;
    market: string;
    name: string;
    price: string;
    main: boolean;
    sgp?: string;
    links?: {
        desktop?: string;
        mobile?: string;
    };
    selection?: OddsBlazeSelection;
    player?: OddsBlazePlayer;
    updated?: string;
};

export type OddsBlazeTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

export type OddsBlazePlayer = {
    id: string;
    name: string;
    position?: string;
    number?: number | null | string;
    team: OddsBlazeTeam;
};

export type AltPropsTableRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    lines: Map<number, OddsBlazeOdd>;
    availableLines: number[];
    lineCount: number;
    highestLine: number | null;
};

export type TdScorerColumn = {
    key: string;
    label: string;
};

export type TdScorerRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    odds: Map<string, OddsBlazeOdd>;
};

export type OddsTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

export type OddsPlayer = {
    id: string;
    name: string;
    team: OddsTeam;
};

export type OddsSelection = {
    name?: string;
    side?: "Over" | "Under";
    line?: number;
};

export type OddsOdd = {
    id: string;
    market: string;
    name: string;
    price: string;
    main: boolean;
    sgp?: string;
    links?: {
        desktop?: string;
        mobile?: string;
    };
    selection?: OddsSelection;
    player?: OddsPlayer;
    updated?: string;
};

export type OddsEvent = {
    id: string;
    teams: {
        home: OddsTeam;
        away: OddsTeam;
    };
    date: string;
    live: boolean;
    odds: OddsOdd[];
};

export type ParlayLeg = {
    id: string;
    eventId: string;
    sport?: string;
    matchup?: string;
    startTime?: string;
    market: string;
    displayName: string;
    price: string;
    sgp: string;
    bookMarketId: string;
    bookSelectionId: string;
    teamId?: string;
    playerId?: string;
    line?: number;
    side?: "Over" | "Under" | "home" | "away" | "yes" | "no";
    marketKey: string;
    familyKey: string;
    teamKey?: string;
    cachedReview?: CachedReviewData;
    periodKey:
    | "1st Half"
    | "2nd Half"
    | "1st Quarter"
    | "2nd Quarter"
    | "3rd Quarter"
    | "4th Quarter"
    | "1st Period"
    | "2nd Period"
    | "3rd Period"
    | "1st Inning"
    | "2nd Inning"
    | "3rd Inning"
    | "4th Inning"
    | "5th Inning"
    | "6th Inning"
    | "7th Inning"
    | "8th Inning"
    | "9th Inning"
    | "1st 3 Innings"
    | "1st 5 Innings"
    | "1st 7 Innings"
    | "Live Segment"
    | "Full Game";
};

export type CustomDatePickerProps = {
    label?: string;
    value?: Date;
    onChange: (date: Date | undefined) => void;
    required?: boolean;
    startYear?: number;
    endYear?: number;
    disableFuture?: boolean;
    error?: string;
    placeholder?: string;
    className?: string;
    note?: string;
};

export type PickReaction = "up" | "down";

export type PickReactionSummary = {
    up: number;
    down: number;
    total: number;
    userReaction: PickReaction | null;
};

export type NotificationType =
    | "post_created"
    | "post_reaction"
    | "post_points"
    | "slip_points"
    | "group_join"
    | "group_leave"
    | "group_removed"
    | "follow"
    | "follow_request"
    | "follow_request_accepted"
    | "commissioner_transfer"
    | "contest_badges";

export type FollowRequestStatus = "pending" | "accepted" | "declined";

export type FollowRequest = {
    id: string;
    status: string;
    message: string;
    requester_id: string;
    receiver_id: string;
    created_at: string;
    responded_at: string;
    requester: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
    };
    receiver: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
    }
};

export type BlockedUsers = {
    id: string;
    blocker_id: string;
    blocked_id: string;
    blocked_user?: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
        is_public: boolean;
    }
}

export type PostAlerts = {
    id: string;
    subscriber_id: string;
    target_user_id: string;
    target_user?: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
    }
}

export type AppNotification = {
    id: string;
    receiver_id: string;
    sender_id?: string | null;
    type: NotificationType;
    title?: string;
    message: string;
    pick_id?: string | null;
    group_id?: string | null;
    slip_id?: string | null;
    follow_request_id?: string | null;
    metadata?: Record<string, unknown>;
    is_read: boolean;
    read_at?: string | null;
    created_at: string;
    receiver?: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
    };
    sender: {
        id: string;
        username: string;
        full_name: string;
        profile_image: string;
    };
    follow_request?: {
        id: string;
        status: string;
        requester: {
            id: string;
            username: string;
            full_name: string;
            profile_image: string;
        }
    };
    pick?: {
        id: string;
        description: string;
        result: PickResult;
        points: number;
    };
    group?: {
        id: string;
        name: string;
    };
    slip?: {
        id: string;
        name: string;
    }
    request_status?: FollowRequestStatus | null;
    // reaction?: PickReaction | null;
    // pointsDelta?: number | null;
};

export type LeaguePickCandidate = {
    id: string;
    description: string;
    odds: string | null;
    payload: BuiltPickPayload;
};

export type PostDestinationGroups = {
    profilePayloads: BuiltPickPayload[];
    leagueCandidates: LeaguePickCandidate[];
};
/* ----------------------------------------------------------------------------
 * MEMBER CARD — one member's record inside ONE group.
 *
 * Five reads back this screen, and none of them takes the surface as a
 * parameter except the achievements one: the four /group/* endpoints derive
 * league-vs-arena from the group row itself, so the card renders from the same
 * calls on both. `applies.fantasy` on the stats payload is what says which
 * halves of `totals` the group actually has — an Arena runs no slip contests,
 * so its slip figures come back NULL rather than 0 (0 would claim the member
 * scored nothing where the truth is the surface does not exist for them).
 * -------------------------------------------------------------------------- */

/** GET /group/member-stats?group_id=&user_id= */
export type GroupMemberStatsPayload = {
    group_id: string;
    /** Whose record. Omit for the caller's own. */
    user_id?: string;
};

export type GroupMemberStatsData = {
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null; is_self: boolean };
    member: {
        id: string;
        username: string | null;
        profile_image: string | null;
        /** NULL + is_member false is the member who has LEFT; their record survives. */
        role: string | null;
        is_member: boolean;
    };
    /** Which halves of `totals` this group has, so the card hides a section
     *  rather than inferring it from a NULL. */
    applies: { fantasy: boolean; feed_contest: boolean };
    totals: {
        /** NULL on an Arena — it has no contests -> slips tree at all. */
        slip_points: number | null;
        slips_entered: number | null;
        slip_picks: number | null;
        /** BANKED by finalization. */
        feed_contest_points: number;
        /** RIDING on unresolved contests. Deliberately not added into the above. */
        feed_contest_points_in_play: number;
        feed_contests_entered: number;
        achievements: number;
        community_picks: number;
    };
};

/** Shared by all three member-picks tabs. */
export type GroupMemberPicksPayload = {
    group_id: string;
    user_id?: string;
    page?: number;
    limit?: number;
};

/** GET /group/member-picks/community — a `picks` row with no feed_contest_id. */
export type GroupMemberCommunityPickRow = {
    id: string;
    is_own: boolean;
    member: {
        id: string;
        username?: string | null;
        full_name?: string | null;
        profile_image?: string | null;
    };
    submitted_at: string;
    updated_at: string;
    /** Always present — a community pick is published the moment it is posted. */
    pick: Pick;
    reactions: { up?: number; down?: number; mine?: PickReaction | null };
};

export type GroupMemberCommunityPicksData = {
    group: { id: string; name: string; group_type: string };
    viewer: { role: string | null; is_self: boolean };
    filters: { user_id: string | null };
    summary: { total_picks: number; is_revealed: boolean };
    picks: GroupMemberCommunityPickRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

/* ----------------------------------------------------------------------------
 * GET /group/feed-contest/achievements — one member's trophy case across a
 * group. The ONLY member-card read that still takes `group_type`, because it is
 * mounted under the feed-contest router rather than the group one.
 * -------------------------------------------------------------------------- */
export type FeedContestAchievementType =
    | "CHAMPION"
    | "RUNNER_UP"
    | "PODIUM_FINISH"
    | "TOP_FIVE";

export type FeedContestAchievementsPayload = {
    group_id: string;
    group_type: FeedGroupType;
    user_id?: string;
    page?: number;
    limit?: number;
};

export type FeedContestAchievementRow = {
    id: string;
    is_own: boolean;
    type: FeedContestAchievementType | string;
    /** The enum already spelled for a screen, so no client maps it itself. */
    label: string;
    placement: number;
    final_score: number | null;
    contest_template: string | null;
    context_type: string;
    awarded_at: string;
    contest: {
        id: string;
        name?: string;
        template?: string;
        entry_model?: string;
        lifecycle_status?: ContestLifecycleStatus;
        winning_places?: number;
        locks_at?: string;
        finalized_at?: string | null;
    };
};

export type FeedContestAchievementsData = {
    group: { id: string; name: string; group_type: string };
    context_type: string;
    viewer: { role: string | null; is_organizer: boolean; is_self: boolean };
    member: {
        id: string;
        username: string | null;
        profile_image: string | null;
        role: string | null;
        is_member: boolean;
    };
    filters: { user_id: string; types: string[] | null; sort: string };
    /** The WHOLE case, never the page and never the ?type= filter. */
    summary: {
        total: number;
        by_type: Record<string, number>;
        /** NULL when they have won nothing — never 0, which would read as a placement. */
        best_placement: number | null;
    };
    achievements: FeedContestAchievementRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

/**
 * One screen, five reads — so they share a slice rather than a flag each. Every
 * field is scoped to the (group, member) pair the card was opened for; the
 * component clears the whole slot on mount so a previous member's record can
 * never paint under a new name.
 */
export type MemberCardState = {
    stats: GroupMemberStatsData | null;
    statsLoading: boolean;
    statsError: string | null;

    slipPicks: SlipContestPicksData | null;
    slipPicksLoading: boolean;
    slipPicksError: string | null;

    communityPicks: GroupMemberCommunityPicksData | null;
    communityPicksLoading: boolean;
    communityPicksError: string | null;

    feedContestPicks: FeedContestPicksData | null;
    feedContestPicksLoading: boolean;
    feedContestPicksError: string | null;

    achievements: FeedContestAchievementsData | null;
    achievementsLoading: boolean;
    achievementsError: string | null;
};
