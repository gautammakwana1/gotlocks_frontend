
import { CachedReviewData } from "@/components/pick-builder/core/reviewSheetState";
import { ProfileBadgeProgress } from "../profile/badges";
import { ContestLifecycleStatus } from "../domain/community";
import type { ArenaMemberContact } from "../arenas/memberContacts";
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
    /**
     * ARENA ONLY, and OWNER ONLY on the way out — `GET /group/:id` deletes this
     * key for anyone but `created_by`, matching who may write it.
     *
     * The address a winner uses to claim a VIRTUAL prize. Not a secret so much
     * as not theirs: it does reach entrants, but only through the published
     * rules of a contest that actually offers one, where it arrives with the
     * context that explains what it is for. So `undefined` here means "not
     * yours to see" at least as often as it means "not configured", and a
     * manager must never be told the Arena has no inbox on the strength of it.
     */
    reward_contact_email?: string | null;
    /**
     * ARENA ONLY — `GET /group/:id` deletes the key for a League, which has no
     * setup wizard and no approval flow.
     *
     * Unlike the reward inbox this is NOT owner-scoped: every member's screen
     * needs to know whether the invite code they are about to share admits
     * people or queues them.
     *
     * `null` is a THIRD state, not "unknown": the owner has not finished the
     * post-purchase setup wizard, so NOBODY may join yet. Read `setup_complete`
     * rather than null-checking this — the rule lives server-side.
     */
    join_policy?: GroupJoinPolicy | null;
    /** ARENA ONLY. Derived server-side from `join_policy != null`. */
    setup_complete?: boolean;
    lifecycle_status?: string;
}

export type ContestBadgeCategory ="generic" | "football" | "nba" | "mlb" | "nhl" | "soccer";

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
    /**
     * The card-level American price, as a NUMBER.
     *
     * Optional because most surfaces read `odds_bracket` (the same value already
     * formatted) and never need it. TD Psychic does: its Combo figure is written
     * by the shared lock capture and is genuinely ABSENT before it — a distinction
     * `odds_bracket` cannot carry, since an empty string there is also what an
     * unpriced combo looks like.
     */
    american_odds?: number | null;
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
    /** The Feed tab's Fantasy winners strip. Its own slot, guarded by groupId. */
    fantasyPodium: FantasyContestPodiumState;
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
    /**
     * The League Guide's state for the viewer. Single-tenant and stamped with
     * `leagueGuideForId` — auto-opening a welcome dialog off the PREVIOUS
     * League's answer is exactly the kind of thing that only shows up in
     * production, and `state.group` is known to survive navigation between
     * groups.
     *
     * `leagueGuide*`-prefixed throughout so it can never be read as the Arena
     * guide (arenaSlice) or as anything on the sports-league slice.
     */
    leagueGuide: LeagueGuideView | null;
    leagueGuideForId: string | null;
    leagueGuideLoading: boolean;
    leagueGuideError: string | null;
    leagueGuideAckLoading: boolean;
    leagueGuideAckError: string | null;
    /**
     * MANAGER INVITATIONS, for BOTH community types — the endpoints are one
     * type-agnostic surface, so this is one slot rather than a League copy and
     * an Arena copy that could disagree.
     *
     * Stamped with `managerInvitationsForId` for the same reason the guide is:
     * `state.group` survives navigation between groups, and the previous
     * community's pending invitations rendering over this one's Settings panel
     * is a bug that only shows when moving between two of them.
     *
     * `managerSeats` and `canInviteManager` are the server's verdicts verbatim.
     * The seat rules — a Free League has no seat at all, an Arena's tier sets
     * its count, paused hosting freezes staff changes — live in
     * group_manager_seat_status() and are never restated on this side.
     */
    managerInvitationsForId: string | null;
    managerInvitations: GroupManagerInvitation[] | null;
    managerSeats: GroupManagerSeatStatus | null;
    canInviteManager: boolean;
    managerInvitationsLoading: boolean;
    managerInvitationsError: string | null;
    /**
     * Shared status for the OWNER's three writes — send / cancel / remove. One
     * at a time, so one slot; the two id fields say which row is busy.
     */
    managerActionLoading: boolean;
    managerActionInvitationId: string | null;
    managerActionUserId: string | null;
    managerActionError: string | null;
    managerActionMessage: string | null;
    /**
     * The INVITEE's respond, in its own slot rather than sharing the one above.
     * Not because the two writes can overlap — nobody is both sides of an
     * invitation — but because their SCREENS can: the notifications drawer is
     * mounted alongside the owner's Settings panel, and one shared slot would
     * make both components toast each other's outcomes.
     */
    managerRespondLoading: boolean;
    managerRespondInvitationId: string | null;
    managerRespondError: string | null;
    managerRespondMessage: string | null;
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
    /**
     * OWNER-ONLY, and a COUNT only — the invitations themselves come from
     * GET /group/manager-invitations. Present so a roster can mark "invitation
     * pending" without a second call; 0 for anyone but `created_by`.
     */
    pending_manager_invitation_count?: number;
    pagination: PaginationMetadata;
};

/* ============================================================================
 * MANAGER INVITATIONS — ONE surface for Leagues and Arenas.
 *
 * The endpoints live on the type-agnostic `/group/*` path beside members and
 * update-member-role, NOT under `/group/arena`, because a League manager and an
 * Arena manager are the same `group_members` row holding the same role. There is
 * no League variant of any of these five calls and there must not be one. The
 * only per-type rule — how many manager seats a group has — is answered by the
 * server's `group_manager_seat_status()` and arrives here as `seats`.
 *
 * Send / list / cancel / remove are PERMANENT-OWNER only (`groups.created_by`);
 * a manager who could appoint managers is an owner. `respond` is the invitee's
 * alone and is issued from Notifications, which is the only surface they have
 * for a role they do not hold yet.
 * ========================================================================== */

export type GroupManagerInvitationStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "canceled"
    | "expired";

export type GroupManagerInvitation = {
    id: string;
    group_id: string;
    from_owner_user_id: string;
    to_user_id: string;
    status: GroupManagerInvitationStatus;
    requested_at: string;
    expires_at: string | null;
    responded_at: string | null;
    canceled_at: string | null;
    /** Arena only — the live entries that blocked the promotion, if any. */
    blocking_contest_ids?: string[] | null;
    created_at?: string;
    /** The INVITEE, joined on `to_user_id`. Absent from write responses. */
    profiles?: {
        id?: string;
        username?: string;
        full_name?: string;
        profile_image?: string;
    } | null;
};

/**
 * The seat maths, straight from the database function — never re-derived here.
 *
 * `manager_limit` is NULL for an uncapped tier and 0 when the group's tier has
 * no manager seat AT ALL, which is an entitlement answer, not a capacity one: a
 * Free League reads 0 and the only fix is Pro. `hosting_writable` is the Arena's
 * "is this community actually running" and is always true for a League.
 */
export type GroupManagerSeatStatus = {
    group_type: GroupType;
    manager_limit: number | null;
    manager_count: number;
    pending_count: number;
    hosting_writable: boolean;
};

/** GET /group/manager-invitations?group_id=&status=&page=&limit= — owner only. */
export type FetchManagerInvitationsPayload = {
    group_id: string;
    /** Defaults to 'pending' server-side. 'all' returns the answered history. */
    status?: GroupManagerInvitationStatus | "all";
    page?: number;
    limit?: number;
};

export type ManagerInvitationsData = {
    invitations: GroupManagerInvitation[];
    seats: GroupManagerSeatStatus;
    /**
     * Pre-computed server-side WITH the pending reservation counted, so the
     * panel disables its Invite button without restating the seat rules.
     */
    can_invite: boolean;
    pagination: PaginationMetadata;
};

/**
 * POST /group/manager-invitation — answers 202, not 200. The invitation was
 * created; the manager was NOT. Nothing about the invitee's role changes until
 * they accept.
 */
export type SendManagerInvitationPayload = {
    group_id: string;
    user_id: string;
};

/** PUT /group/manager-invitation/cancel — the owner withdrawing an unanswered offer. */
export type CancelManagerInvitationPayload = {
    group_id: string;
    invitation_id: string;
};

/**
 * PUT /group/manager-invitation/respond — THE INVITEE ONLY, from Notifications.
 * `group_id` is not sent; it is carried so the saga can re-read the group whose
 * role just changed.
 */
export type RespondManagerInvitationPayload = {
    invitation_id: string;
    accept: boolean;
    group_id?: string | null;
};

/**
 * DELETE /group/manager — stand an accepted manager back down to member.
 * Direct and immediate: consent is needed to TAKE the job, not to be relieved
 * of it.
 */
export type RemoveGroupManagerPayload = {
    group_id: string;
    user_id: string;
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
    /**
     * Placement as the precomputed board computed it — tie-aware, and correct
     * on every page. Derive from the row index only as a fallback: an index is
     * page-local, so page 2 would restart the board at #1.
     */
    rank?: number;
    /** Points before badge bonuses. Additive on the precomputed board. */
    base_cumulative?: number;
    cumulative_points: number;
    badge_points: number;
    badge_awards: ContestBadgeAward[];
    win: number;
    loss: number;
    username?: string;
    profile_image?: string;
    slips?: leaderboardSlip[];
}

/* ----------------------------------------------------------------------------
 * GET /group/contest-leaderboard/list/finalized/podium — the FANTASY results
 * board, read entirely from the frozen tables.
 *
 * Two things this payload asserts that a client must not flatten:
 *   - `podium` is NOT always three entries. Placements are SHARED on ties, so a
 *     two-way tie for 1st returns two entries both ranked 1 and no 2nd, and a
 *     contest nobody scored in returns an empty podium.
 *   - `winner` is NULL whenever the top placement is shared. Naming one of two
 *     tied members champion is exactly the claim the tie denies.
 * -------------------------------------------------------------------------- */

export type FantasyPodiumBadge = {
    badge_id: string;
    badge_name: string;
    badge_category: string;
    points_awarded: number;
};

export type FantasyPodiumEntry = {
    /** Competition placement — shared on ties, so NOT unique within a podium. */
    rank: number;
    user_id: string;
    username: string;
    profile_image: string | null;
    /** Points before badge bonuses; `cumulative_points` is the total awarded. */
    base_cumulative: number;
    badge_points: number;
    cumulative_points: number;
    win: number;
    loss: number;
    badges: FantasyPodiumBadge[];
};

export type FinalizedFantasyContestPodium = {
    contest_id: string;
    contest_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    finalized_at: string;
    /** TRUE when the frozen board was rebuilt rather than captured at finalize. */
    is_reconstructed: boolean;
    total_participants: number;
    total_slips: number;
    winner: FantasyPodiumEntry | null;
    podium: FantasyPodiumEntry[];
};

export type FantasyContestPodiumData = {
    group_id: string;
    contests: FinalizedFantasyContestPodium[];
    pagination: PaginationMetadata;
};

export type FantasyContestPodiumState = {
    /** Guarded like the Feed podium slot — see the note on that one. */
    groupId: string | null;
    contests: FinalizedFantasyContestPodium[] | null;
    loading: boolean;
    error: string | null;
};

export type LeaderboardData = {
    group_id: string;
    /** Additive on the precomputed board; absent on any cached legacy payload. */
    contest_id?: string;
    /** TRUE once the contest is settled and the board is the frozen snapshot. */
    finalized?: boolean;
    /**
     * TRUE when the stored board was behind and had to be repaired to serve this
     * read. Purely diagnostic — the rows are correct either way.
     */
    stale?: boolean;
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

// Owner-only membership write: PUT /group/arena/remove-member. page/limit echo the
// member list window so the saga can refresh it after the write.
//
// make-manager and make-member no longer exist. Appointing a manager is an
// invitation (POST /group/manager-invitation) and standing one down is
// DELETE /group/manager — both type-agnostic, both keyed by `group_id`.
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

/* ---------------------------------------------------------------------------
 * ARENA BILLING — real Stripe money.
 *
 * The $50 Arena creation fee INCLUDES the first month of Club. The owner also
 * picks the plan that starts once that month ends. Both facts travel in ONE
 * Stripe Checkout Session, so there is a single redirect and a single payment.
 *
 * Nothing in this file grants access. The backend flips entitlement only from
 * the Stripe webhook (or from checkout-status, which calls the same idempotent
 * fulfilment), so a user cannot end up with a working Arena without a confirmed
 * payment — and the client never has to be trusted about what was paid.
 * ------------------------------------------------------------------------- */

/** The three self-service Arena plans. `custom` is contact-only and is not
 *  selectable here — the endpoint rejects it with a 409. */
export type ArenaPlanCode = "arena_50" | "arena_100" | "arena_250_plus";

/** Mirrors Stripe's Subscription.status verbatim, which is also what the
 *  backend stores. `trialing` is the INCLUDED Club month. */
export type ArenaSubscriptionStatus =
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";

// POST /group/arena/checkout-session
export type ArenaCheckoutPayload = {
    arena_id: string;
    tier: ArenaPlanCode;
};

export type ArenaCheckoutResponse = {
    url: string | null;
    session_id: string;
    // True when an earlier, still-open session was handed back rather than a new
    // one created — so a double-click cannot produce two payments.
    reused: boolean;
};

// GET /group/arena/checkout-status?session_id=
// `pending` means Stripe has the money but our side has not finished; the
// client polls. `complete` is safe to navigate on.
export type ArenaCheckoutStatusKind = "pending" | "complete" | "expired";

export type ArenaCheckoutStatusResponse = {
    status: ArenaCheckoutStatusKind;
    arena_id: string | null;
    subscription?: ArenaSubscription | null;
};

/** The client-safe view of arena_subscriptions. Raw Stripe ids are never sent. */
export type ArenaSubscription = {
    status: ArenaSubscriptionStatus;
    stripe_status: string | null;
    // What bills from month 2 onward — the plan the owner selected.
    plan_code: ArenaPlanCode | "custom" | null;
    // Always Club. What the Arena is ENTITLED to during the included month, which
    // is a different thing from what it will be billed.
    included_plan_code: ArenaPlanCode | null;
    included_period_starts_at: string | null;
    included_period_ends_at: string | null;
    current_period_starts_at: string | null;
    current_period_ends_at: string | null;
    cancel_at_period_end: boolean;
    cancel_at: string | null;
    canceled_at: string | null;
    // A downgrade waiting for the period boundary.
    pending_plan_code: ArenaPlanCode | "custom" | null;
    pending_plan_effective_at: string | null;
    // Set when a scheduled downgrade could NOT be applied (e.g. too many
    // members for the smaller plan), so the owner can be told why.
    downgrade_blocked_reason: string | null;
    // Dunning. During grace the Arena keeps its current limits.
    grace_period_ends_at: string | null;
    next_payment_attempt_at: string | null;
    payment_failure_count: number;
    billing_mode: "simulated" | "stripe";
    in_included_month: boolean;
};

// POST /group/arena/change-plan
export type ChangeArenaPlanPayload = {
    arena_id: string;
    tier: ArenaPlanCode;
};

export type ArenaBillingActionKind =
    | "activated"
    | "scheduled"
    | "already_active"
    | "cancel_scheduled"
    | "already_scheduled"
    | "resumed";

export type ArenaBillingActionResponse = {
    action: ArenaBillingActionKind;
    effective_at?: string | null;
    subscription: ArenaSubscription | null;
    available_tiers?: ArenaAvailableTier[];
};

// GET /group/arena/subscription?arena_id=
export type ArenaSubscriptionResponse = {
    subscription: ArenaSubscription | null;
    hosting: ArenaHostingDetails | null;
    unlock: ArenaUnlockDetails | null;
    available_tiers: ArenaAvailableTier[];
};

// GET /group/arena/invoices?arena_id=
export type ArenaInvoice = {
    id: string;
    amount: number;
    currency: string;
    status: string;
    transaction_type:
        | "founding_pro"
        | "arena_creation_fee"
        | "arena_subscription"
        | "arena_proration";
    arena_plan_code: string | null;
    billing_reason: string | null;
    period_starts_at: string | null;
    period_ends_at: string | null;
    description: string | null;
    receipt_url: string | null;
    created_at: string;
};

export type FetchArenaInvoicesPayload = {
    arena_id: string;
    page?: number;
    limit?: number;
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
    /**
     * The Arena's reward fulfilment inbox — PERMANENT OWNER ONLY. A manager who
     * sends it gets a 403 rather than having it silently dropped, because
     * dropping it would report the Arena updated while virtual rewards kept
     * pointing at the old address.
     *
     * `null` clears it. Clearing never breaks a live reward: a published contest
     * holds its own snapshot of the address it was signed with. It only stops
     * the NEXT one being configured.
     */
    reward_contact_email?: string | null;
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

/* ----------------------------------------------------------------------------
 * JOINING AN ARENA — the post-purchase setup wizard and the approval queue.
 *
 * Named for GROUPS rather than Arenas, matching the server: the column is
 * `groups.join_policy` and the queue is `group_join_requests`. The approval
 * flow ships for Arenas only, but that restriction lives in the endpoints, not
 * in the vocabulary.
 * -------------------------------------------------------------------------- */

export type GroupJoinPolicy = "automatic" | "approval_required";

export type GroupJoinRequestStatus = "pending" | "approved" | "rejected";

/**
 * Which door the request came through. Not a permission — both doors run the
 * same policy — but an owner reviewing a queue wants to know whether this
 * person scanned the QR in the room or was sent a code.
 */
export type GroupJoinRequestSource = "invite_code" | "venue_qr";

/**
 * One row of the owner's review queue. ONE ROW PER (arena, person) FOREVER:
 * somebody declined who asks again reuses their row, so `requested_at` is the
 * LATEST ask rather than the first.
 */
export type GroupJoinRequest = {
    id: string;
    group_id: string;
    user_id: string;
    status: GroupJoinRequestStatus;
    source: GroupJoinRequestSource;
    requested_at: string;
    responded_at: string | null;
    responded_by: string | null;
    profiles?: {
        id: string;
        username: string | null;
        full_name: string | null;
        profile_image: string | null;
    } | null;
};

/**
 * POST /group/arena/complete-setup — the wizard's two REQUIRED steps as ONE
 * write.
 *
 * Atomic on purpose: `join_policy IS NOT NULL` is the gate the join path reads,
 * so an Arena whose policy landed but whose contact email did not would open
 * for joining while still unable to offer a prize.
 *
 * 409 `arena_setup_already_complete` if it has already run — it is re-runnable
 * only while setup is unfinished.
 */
export type CompleteArenaSetupPayload = {
    arena_id: string;
    join_policy: GroupJoinPolicy;
    /** Normalised server-side; sent already trimmed and lower-cased. */
    email: string;
};

export type CompleteArenaSetupData = {
    arena: ArenaDetails & {
        join_policy: GroupJoinPolicy;
        reward_contact_email: string | null;
        setup_complete: true;
    };
};

/**
 * PUT /group/arena/join-policy — changing the rule LATER, from Settings.
 *
 * Deliberately leaves pending requests alone. Switching to `automatic` is a
 * statement about the next person through the door, not an amnesty for a queue
 * the owner has not read.
 */
export type UpdateArenaJoinPolicyPayload = {
    arena_id: string;
    join_policy: GroupJoinPolicy;
};

export type UpdateArenaJoinPolicyData = {
    arena: { id: string; name: string; join_policy: GroupJoinPolicy };
    pending_request_count: number;
};

/**
 * GET /group/arena/join-requests — the owner's review queue, oldest first: it
 * is a work queue, so it sorts by how long somebody has been waiting.
 *
 * `status` defaults to `pending`; `all` returns answered rows too, for an owner
 * auditing who they previously turned away.
 */
export type FetchArenaJoinRequestsPayload = {
    arena_id: string;
    status?: GroupJoinRequestStatus | "all";
    page?: number;
    limit?: number;
};

/* ----------------------------------------------------------------------------
 * The Arena's staff-only member contacts. Arena-only, owner/manager-only — a
 * plain member gets 403 from both endpoints.
 *
 *   GET /group/arena/member-contacts/list   JSON, paged — the on-screen list.
 *   GET /group/arena/member-contacts        text/csv    — the download.
 *
 * Two payloads because they are two acts, not one read rendered twice. See
 * lib/arenas/memberContacts.ts for why the CSV no longer feeds the panel: the
 * export is throttled to 5/minute and audit-logged per call, so rendering a
 * list through it charged every glance as a file leaving the building.
 * -------------------------------------------------------------------------- */
export type FetchArenaMemberContactsPayload = {
    arena_id: string;
    /** Load-more, matching the roster's own paging. Page 1 replaces, >1 appends. */
    page?: number;
    limit?: number;
};

export type ArenaMemberContactsData = {
    contacts: ArenaMemberContact[];
    pagination: PaginationMetadata;
};

export type ExportArenaMemberContactsPayload = {
    arena_id: string;
};

export type ArenaJoinRequestsData = {
    requests: GroupJoinRequest[];
    join_policy: GroupJoinPolicy | null;
    /**
     * ALWAYS the pending count, whatever `status` filtered by — it drives a
     * "3 waiting" chip, which must not change because somebody opened the
     * declined tab.
     */
    pending_request_count: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

/**
 * PUT /group/arena/join-requests/respond — approve or decline one request.
 *
 * Keyed by the REQUESTER's user_id rather than a request id: there is exactly
 * one row per (arena, person) and the owner's list is a list of people.
 *
 * 403 `full` is NOT a decision — the request stays pending, because "the owner
 * said yes and the room is out of seats" is a "free a seat and try again".
 */
export type RespondArenaJoinRequestPayload = {
    arena_id: string;
    user_id: string;
    accept: boolean;
};

export type RespondArenaJoinRequestData = {
    status: GroupJoinRequestStatus;
    request: {
        id: string | null;
        group_id: string;
        user_id: string;
        status: GroupJoinRequestStatus;
    };
    member: {
        id: string | null;
        group_id: string;
        user_id: string;
        role: string;
    } | null;
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
export type FeedContestTemplate = "multi_pick" | "sunday_pickem" | "td_psychic";

/**
 * Where a contest may be entered from — `feed_contests.entry_access_mode`,
 * NOT NULL DEFAULT 'open', so every contest written before Venue Check-In
 * existed already reads correctly.
 *
 * ARENA ONLY. `resolveFeedContestEntryAccessMode` pins a League Feed contest to
 * 'open' (a League has no room to stand in), and asking for the venue mode in a
 * League context is a 400 rather than a silent downgrade — dropping a
 * restriction without saying so would publish an "in person" contest that is in
 * fact enterable from anywhere.
 */
export type FeedContestEntryAccessMode = "open" | "venue_check_in_required";

/* ----------------------------------------------------------------------------
 * VENUE CHECK-IN — /group/venue/*. Group-agnostic on the wire (the tables, the
 * columns and the gates all read `group_id`), but Arena-only in practice:
 * `FEED_CONTEST_VENUE_CAPABLE_CONTEXTS` is the single constant that decides it,
 * and a League answers `is_supported: false` rather than an error.
 * -------------------------------------------------------------------------- */

/**
 * Three states, not two. "never set up" and "switched off" both mean nobody can
 * check in, but they are different screens: one offers a Set Up button, the
 * other explains that the printed QR has stopped working.
 */
export type VenueCheckInState = "not_configured" | "active" | "disabled";

/**
 * The venue as the caller is allowed to see it. The staff-only fields are absent
 * for a member, and `latitude`/`longitude` are returned to NOBODY — the venue is
 * confirmed by standing in it, and the coordinates are read on exactly one
 * server-side path, which answers with a verdict rather than a location.
 */
export type GroupVenue = {
    id: string;
    name: string;
    display_address: string;
    check_in_duration_minutes: number;
    status: string;
    /** STAFF ONLY below this line. */
    verification_radius_meters?: number;
    configured_by_user_id?: string | null;
    configured_at?: string | null;
    disabled_at?: string | null;
    disabled_by_user_id?: string | null;
    created_at?: string;
    updated_at?: string;
};

/** The viewer's own check-in, and — whatever is live now — the last one's fate. */
export type VenueCheckInSessionSummary = {
    is_checked_in: boolean;
    session_id: string | null;
    verified_at: string | null;
    expires_at: string | null;
    method: string | null;
    seconds_remaining: number | null;
    /**
     * The PREVIOUS attempt's status even when nothing is live — what lets a
     * screen say "your check-in expired" rather than the first-timer's
     * "scan the venue QR".
     */
    last_status: string | null;
    last_expires_at: string | null;
    revocation_reason: string | null;
};

/**
 * STAFF ONLY, and null for a member. The QR token is here and nowhere else: a
 * member who can read it can check in from their sofa, which is the whole thing
 * the feature exists to stop.
 */
export type VenueCheckInStaffDetail = {
    public_check_in_token: string | null;
    token_version: number | null;
    check_in_url: string | null;
    active_session_count: number;
    /** Live venue-required contests, which make disabling illegal outright. */
    blocking_contest_count: number;
    can_disable: boolean;
    can_regenerate_token: boolean;
};

export type VenueCheckInDetailData = {
    group: { id: string; name: string; group_type: string };
    viewer: {
        role: string;
        is_owner: boolean;
        is_staff: boolean;
        /** Owner AND the community writable — moving the geofence is a write. */
        can_configure: boolean;
        can_issue_assist_code: boolean;
    };
    venue_check_in: {
        is_supported: boolean;
        /**
         * The one boolean a contest-creation screen needs: may this community
         * publish a venue-required contest right now?
         */
        is_enabled: boolean;
        state: VenueCheckInState;
        venue: GroupVenue | null;
    };
    session: VenueCheckInSessionSummary;
    staff: VenueCheckInStaffDetail | null;
};

/** GET /group/venue/detail/:group_id — group_id is a PATH param. */
export type FetchVenueCheckInDetailPayload = {
    group_id: string;
};

/**
 * The four OWNER-ONLY writes. They are four endpoints rather than one
 * flag-driven handler because they make four different promises about the QR,
 * and that is the part an owner has to be able to predict before pressing
 * anything:
 *
 *   configure   POST /configure/:group_id  mints the FIRST token. 409s on a
 *                                          DISABLED venue — reviving that one
 *                                          would resurrect every copy of the
 *                                          retired poster. Also serves a full
 *                                          re-save of an ACTIVE venue.
 *   update      PUT  /update/:group_id     partial patch; NEVER touches the
 *                                          token, the status or live sessions.
 *                                          Works on a disabled venue too.
 *   disable     PUT  /disable/:group_id    QR dead, every live session revoked.
 *   enable      PUT  /enable/:group_id     back on with a NEW token — reprint.
 *   regenerate  PUT  /regenerate-token/:group_id
 *                                          NEW token on a venue that stays
 *                                          OPEN, and every live check-in
 *                                          SURVIVES. Requires an active venue.
 *
 * The last two both end with a new code, and the difference is the whole reason
 * both exist: enable reopens a closed venue, regenerate retires a leaked poster
 * while the room is still full.
 */

/**
 * The complete write. `accuracy_meters` is optional and refused only when
 * present and worse than 200 m: a venue pinned from a cell-tower fix puts the
 * geofence around the wrong block, and every later "you must be at the venue"
 * refusal is really that save's fault.
 */
export type ConfigureGroupVenuePayload = {
    group_id: string;
    name: string;
    display_address: string;
    latitude: number;
    longitude: number;
    accuracy_meters?: number | null;
    verification_radius_meters?: number;
    check_in_duration_minutes?: number;
};

/**
 * The partial patch. Send only what changed — which is the point: an owner
 * fixing a typo in the venue name should not have to stand in the restaurant.
 * Latitude and longitude move as a PAIR or not at all; one axis alone would put
 * the venue at a point nobody has ever been.
 */
export type UpdateGroupVenuePayload = {
    group_id: string;
    name?: string;
    display_address?: string;
    latitude?: number;
    longitude?: number;
    accuracy_meters?: number | null;
    verification_radius_meters?: number;
    check_in_duration_minutes?: number;
};

/** Both take the group id and nothing else. */
export type GroupVenueLifecyclePayload = {
    group_id: string;
};

/** The shape every venue WRITE answers with; each adds its own receipt fields. */
export type GroupVenueWriteData = {
    group: { id: string; name: string; group_type: string };
    venue_check_in: {
        is_supported: boolean;
        is_enabled: boolean;
        state: VenueCheckInState;
        venue: GroupVenue | null;
    };
    /** What the printed poster encodes. Null once disabled — a dead token is
     *  never handed back, or it ends up on a reprint. */
    check_in_url: string | null;
    public_check_in_token: string | null;
    token_version?: number | null;
    /** configure: this was the first setup rather than a re-save. */
    created?: boolean;
    /** update: the fields that call actually wrote. */
    updated_fields?: string[];
    /** disable: how many members were checked in and have been kicked out. */
    revoked_session_count?: number;
    was_already_disabled?: boolean;
    /** enable + regenerate: unambiguous — this is NOT the code you had. */
    token_rotated?: boolean;
    requires_reprint?: boolean;
    /**
     * regenerate ONLY, and the mirror image of `revoked_session_count`: how many
     * members keep their check-in through the rotation. Counted BEFORE the write,
     * because it is a claim about who this action does not affect.
     */
    retained_session_count?: number;
};

/* ---------- The member side, keyed by TOKEN rather than group_id ----------
 *
 * Whoever just scanned the poster has the token and nothing else — they may not
 * know the Arena exists, let alone its uuid.
 */

/**
 * The rungs of "what next", computed server-side because each is a different
 * screen and reassembling them from booleans per client is how they drift
 * apart. Two of them turn on the Arena's `join_policy`, which the scanner has
 * no way to see.
 *
 *   sign_in                 no account yet
 *   group_setup_incomplete  the owner has not finished setup; nobody may join
 *                           yet, whoever they are
 *   join_group              signed in, not a member, policy `automatic`
 *   request_to_join         signed in, not a member, policy `approval_required`
 *                           — the button says Request to Join
 *   join_pending            already asked, waiting on the owner. NOT a member,
 *                           so check-in is not offered
 *   verify_location         a member with no live check-in — the main event
 *   checked_in              already checked in
 *
 * `group_setup_incomplete` is the same string the invite-code endpoint returns
 * as `code`, deliberately: both report the same fact about the same column.
 */
export type VenueCheckInNextStep =
    | "sign_in"
    | "group_setup_incomplete"
    | "join_group"
    | "request_to_join"
    | "join_pending"
    | "verify_location"
    | "checked_in";

/**
 * GET /group/venue/check-in/resolve/:token — OPTIONAL auth, and it NEVER writes:
 * scanning is not joining and is not checking in. A retired token, a disabled
 * venue and a deleted Arena all answer the same 404 + `invalid_venue_token`, so
 * the response cannot tell a real-but-dead token from an invented one.
 */
export type ResolveVenueCheckInPayload = {
    token: string;
};

export type ResolveVenueCheckInData = {
    group: {
        id: string;
        name: string;
        group_type: string;
        /**
         * Arena only, and NULL when the owner never finished setup. Decides
         * whether the poster's button says Join or Request to Join — but the
         * SCREEN is chosen by `next_step`, which already folds this in.
         */
        join_policy?: GroupJoinPolicy | null;
    };
    /** The MEMBER projection — no QR token, and never any coordinates. */
    venue: GroupVenue;
    viewer: {
        is_authenticated: boolean;
        is_member: boolean;
        role?: string | null;
        /**
         * The viewer's own row in this Arena's approval queue, or null.
         *
         * A DECLINED request is returned too, and deliberately: the member may
         * ask again, and the page must not pretend the earlier answer never
         * happened. Read `next_step` to decide the screen — a pending request
         * outranks the setup gate there, which no client should re-derive.
         */
        join_request?: {
            id: string;
            status: GroupJoinRequestStatus;
            source: GroupJoinRequestSource;
            requested_at: string;
            responded_at: string | null;
        } | null;
    };
    session: VenueCheckInSessionSummary;
    next_step: VenueCheckInNextStep;
};

/**
 * POST /group/venue/check-in/join/:token — walking in and joining.
 *
 * The rung `resolve` points at when next_step is `join_group` or
 * `request_to_join`. Keyed by TOKEN like resolve, because the scanner holds an
 * opaque token and never sees an invite code.
 *
 * Runs the SAME join transaction `/group/arena/join-arena` does; only the
 * recorded `source` differs. Joining is still NOT checking in — a success
 * leaves the member at `verify_location`, which is a separate POST.
 */
export type JoinArenaByVenueTokenPayload = {
    token: string;
};

/**
 * 200 with `status: "member"` when they are in (including a re-scan by somebody
 * who already was), 202 with `status: "pending"` when the Arena queues them.
 */
export type JoinArenaByVenueTokenData = {
    status: "member" | GroupJoinRequestStatus;
    group: { id: string; name: string | null; group_type?: string };
    member?: {
        id: string | null;
        group_id: string;
        user_id: string;
        role: string;
    };
    request?: {
        id: string | null;
        group_id: string;
        user_id: string;
        status: GroupJoinRequestStatus;
        source: GroupJoinRequestSource;
    };
    next_step: VenueCheckInNextStep;
};

/**
 * Every outcome a CLIENT may report. It may never report `verified`,
 * `outside_venue` or `accuracy_insufficient` — those are the server's verdict on
 * a reading, and accepting them from the body would make the geofence advisory.
 */
export type VenueClientReportableOutcome =
    | "permission_denied"
    | "location_unavailable"
    | "timed_out"
    | "unsupported"
    | "canceled";

/** Everything the server can rule, including the two it alone decides. */
export type VenueCheckInOutcome =
    | "verified"
    | "staff_verified"
    | "outside_venue"
    | "accuracy_insufficient"
    | VenueClientReportableOutcome;

/**
 * POST /group/venue/check-in/verify/:token — send a reading OR a failure the
 * client alone could observe, never both. The distance, the radius, the edge
 * allowance, the clock and the session length are all resolved server-side,
 * which is the entire difference between a geofence and a suggestion.
 *
 * `accuracy_meters` is REQUIRED alongside a reading (unlike on the venue
 * configuration path, where it is advisory): here it decides the edge
 * allowance, and a caller that could omit it would be choosing its own.
 */
export type VerifyVenueCheckInPayload = {
    token: string;
} & (
        | {
            latitude: number;
            longitude: number;
            accuracy_meters: number;
            outcome?: never;
        }
        | {
            outcome: VenueClientReportableOutcome;
            latitude?: never;
            longitude?: never;
            accuracy_meters?: never;
        }
    );

/**
 * 201. A success creates ONLY a session — no join, no rules, no entry.
 *
 * The assist-code redemption answers with this SAME envelope, differing only in
 * `outcome`/`method`, precisely so the entry gate, the activity counts and this
 * client all treat the two paths identically without knowing which happened.
 */
export type VerifyVenueCheckInData = {
    checked_in: true;
    outcome: "verified" | "staff_verified";
    /** Present on the assist-code path: `staff_assist`. */
    method?: string;
    group: { id: string; name: string; group_type: string };
    venue: { id: string; name: string; display_address: string };
    session: VenueCheckInSessionSummary;
    note: string;
};

/* ---------- Staff assist codes — the in-person fallback ---------- */

/**
 * POST /group/venue/assist-code/:group_id — no body.
 *
 * STAFF-wide (owner, commissioner OR manager), unlike the venue's owner-only
 * configuration: whoever is behind the bar when a phone fails has to be able to
 * solve it without finding the owner. Requires an ACTIVE venue (409) and a
 * writable Arena (402), because a code is a promise that a check-in will work
 * and both would break that promise at redemption, in front of the customer.
 */
export type IssueVenueAssistCodePayload = {
    group_id: string;
};

export type IssueVenueAssistCodeData = {
    assist_code_id: string;
    /**
     * The plaintext, returned ONCE and never again — only a peppered digest is
     * stored. A lost code means issuing another, which is why the panel holds
     * this in state until it expires rather than re-reading it.
     */
    code: string;
    issued_at: string;
    expires_at: string;
    max_uses: number;
    expires_in_seconds: number;
    venue: { id: string; name: string };
    note: string;
};

/**
 * POST /group/venue/check-in/redeem-assist-code — the member's half.
 *
 * Scoped by GROUP, with `token` accepted too: the person reaching for a code is
 * usually the one whose GPS just failed, so requiring a fresh scan would gate
 * the fallback behind the thing that broke. Sent WITH the token from the QR
 * page, since that page has one.
 *
 * A bad, expired, revoked or already-spent code — including one this member has
 * already redeemed — is a single 400 `invalid_staff_assist_code`. It does not
 * distinguish them, and neither should any screen.
 */
export type RedeemVenueAssistCodePayload = {
    code: string;
    token?: string;
    group_id?: string;
};

/**
 * PUT /group/venue/assist-code/:code_id/revoke — no body. Staff-wide, like
 * issuance: whoever can hand one out can take it back.
 *
 * Only an UNSPENT code can be revoked (409 otherwise) — a code that already
 * opened a session is history, and revoking it here would not end that session.
 * Idempotent: a second call answers 200 with `was_already_revoked`.
 */
export type RevokeVenueAssistCodePayload = {
    assist_code_id: string;
};

export type RevokeVenueAssistCodeData = {
    assist_code_id: string;
    revoked_at: string;
    was_already_revoked: boolean;
};

/**
 * 422. The attempt was recorded, but it did not verify. Deliberately carries the
 * outcome and NOTHING about the geometry — no distance, no radius, no allowance,
 * because "you are 40 m outside a 150 m radius" is a free calibration tool for
 * anyone testing how far a spoofed coordinate has to move.
 */
export type VerifyVenueCheckInFailure = {
    message: string;
    code: VenueCheckInOutcome;
};

/* ---------- Staff activity ---------- */

/**
 * GET /group/venue/activity/:group_id — the panel's seven numbers for ONE
 * calendar day, resolved in the caller's zone from `x-timezone` (a bar closing
 * at 01:00 local is still having last night). STAFF ONLY, counts only: no member
 * ids, no names, no coordinates.
 */
export type FetchVenueActivityPayload = {
    group_id: string;
    /** YYYY-MM-DD in the caller's zone. Omit for today. */
    date?: string;
};

export type VenueActivityData = {
    group: { id: string; name: string; group_type: string };
    viewer: { role: string; is_owner: boolean; is_staff: boolean };
    /** Echoed so the panel labels the day the SERVER agreed to show. */
    range: { date: string; time_zone: string; starts_at: string; ends_at: string };
    counts: {
        check_ins: number;
        unique_members: number;
        new_members_from_qr: number;
        returning_members: number;
        venue_required_entries: number;
        failed_attempts: number;
        staff_assisted: number;
    };
    /** TRUE when a row cap was hit — the counts above are floors, not totals. */
    is_partial: boolean;
    note: string;
};

export type VenueState = {
    /**
     * Single-tenant, like every other group-scoped slot here: `detailForId` says
     * whose venue is loaded, so one Arena's geofence can never describe another.
     */
    detail: VenueCheckInDetailData | null;
    detailForId: string | null;
    detailLoading: boolean;
    detailError: string | null;

    /**
     * ONE set of flags for all four writes. They are mutually exclusive by
     * construction — the settings panel shows Update *or* Enable, never both,
     * and each is confirmed before it fires — so separate flags would only be
     * three more things to keep in step. `configureAction` names whichever one
     * is in flight, for the button that has to label itself.
     */
    configureAction:
    | "configure"
    | "update"
    | "disable"
    | "enable"
    | "regenerate"
    | null;
    configureLoading: boolean;
    configureMessage: string | null;
    configureError: string | null;

    /**
     * The QR landing page's own slots. Kept APART from `detail` even though both
     * describe a venue: this one is keyed by token, is readable signed-out, and
     * carries the member projection — folding them together would let a
     * staff-scoped read and a public one overwrite each other.
     */
    resolved: ResolveVenueCheckInData | null;
    resolvedForToken: string | null;
    resolveLoading: boolean;
    resolveError: string | null;
    /** The server's own `code`, so a dead token gets its own screen. */
    resolveErrorCode: string | null;

    /**
     * POST /check-in/join/:token — walking in and joining.
     *
     * There is no disposition flag here on purpose: the outcome is folded into
     * `resolved.next_step`, which the server computes and the screen already
     * branches on. A second copy of "did they get in?" would be one more thing
     * to keep in step with it. Joining is NOT checking in, so this never mints
     * a session and never touches the verify slots.
     */
    joinLoading: boolean;
    joinError: string | null;
    joinErrorCode: string | null;

    verifyLoading: boolean;
    verifySuccess: VerifyVenueCheckInData | null;
    verifyError: string | null;
    /** The refused outcome, which decides which sentence the member is shown. */
    verifyErrorCode: VenueCheckInOutcome | null;

    /** GET /activity — the staff panel's day. */
    activity: VenueActivityData | null;
    activityForId: string | null;
    activityLoading: boolean;
    activityError: string | null;

    /**
     * The staff fallback. `issuedAssistCode` holds the ONLY copy of the
     * plaintext there will ever be — the server stores a digest — so it lives
     * here until it expires or is revoked, and is never re-fetchable.
     */
    issuedAssistCode: IssueVenueAssistCodeData | null;
    assistIssueLoading: boolean;
    assistIssueError: string | null;
    assistRevokeLoading: boolean;
    assistRevokeError: string | null;

    /**
     * The member's redemption. Its SUCCESS is folded into `verifySuccess`, not a
     * slot of its own: the reply is the same envelope the GPS path returns, and
     * the check-in screen should have exactly one success path.
     */
    assistRedeemLoading: boolean;
    assistRedeemError: string | null;
};

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
    /**
     * TD PSYCHIC ONLY, and REQUIRED there — `parseEligibleGames` refuses a
     * td_psychic slate whose snapshot omits either id or names the same team on
     * both sides (feed.helper.ts:510). Its entry path has to prove a picked
     * player belongs to one of the two teams in the game, and the frozen
     * snapshot is the authority it checks against, not the live feed.
     *
     * Omitted for every other template: the server stores null and nothing reads
     * them.
     */
    home_team_id?: string | null;
    away_team_id?: string | null;
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
    /**
     * ARENA CONTESTS ONLY in practice, though the column is on every row: a
     * League Feed contest is always 'open'. Present on BOTH the list and the
     * detail reads (`FEED_CONTEST_LIST_COLUMNS`), so a card can say so without
     * opening the contest.
     */
    entry_access_mode?: FeedContestEntryAccessMode | null;
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
    /**
     * Placements 1..3 of a finalized contest, best first. Stamped ONLY by
     * `/list/finalized/podium` — every other list leaves it undefined, so a card
     * that wants a podium has to have been fed by that endpoint.
     *
     * NOT capped at three ROWS, and a client must not assume it is. Places are
     * awarded with standard competition ranking, so 1..3 is a placement WINDOW:
     * a two-way tie for 1st returns 1, 1, 3 (no 2nd exists) and a three-way tie
     * for 2nd returns 1, 2, 2, 2 — four rows. `[]` is a real outcome too: a
     * contest that finished with a field where nobody scored awarded no place.
     */
    podium?: FeedContestPodiumEntry[];
    /** Rows actually returned in `podium` — NOT the number of distinct places. */
    podium_count?: number;
    /**
     * TRUE only where a mega-tie overflowed the server's per-contest row cap,
     * which also makes the last placement's `tied_count` a floor rather than an
     * exact figure. False on every ordinary contest.
     */
    podium_is_truncated?: boolean;
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

/**
 * One row of `FeedContest.podium`. Structurally IDENTICAL to `FeedContestWinner`
 * — the server builds both from the same `contest_achievements` column subset
 * (CONTEST_PODIUM_COLUMNS is an alias of CONTEST_WINNER_COLUMNS) — so this is an
 * alias rather than a copy: a field added to one is added to both, and the two
 * cannot drift into describing the same row differently.
 */
export type FeedContestPodiumEntry = FeedContestWinner;

/**
 * GET /group/feed-contest/list/finalized/podium — the group's RESULTS BOARD.
 *
 * The same finalized contests `/list/finalized` pages, in the same order, each
 * carrying its top three placements instead of only its champion.
 */
export type FetchFeedContestPodiumsPayload = {
    group_id: string;
    group_type: FeedGroupType;
    /**
     * TRUE also returns contests that finalized and were LATER archived. Default
     * false, which matches exactly the set `/list/finalized` returns.
     */
    include_archived?: boolean;
    page?: number;
    /** Server-capped at 25 — the page size IS this endpoint's podium fan-out. */
    limit?: number;
};

/**
 * The podium response. Deliberately `FeedContestListData` plus `filters`: the
 * contest rows carry the same columns and the same `winner` object as a
 * `/list/finalized` row, so one client model deserializes both.
 */
export type FeedContestPodiumListData = FeedContestListData & {
    filters: {
        include_archived: boolean;
        /** The server's placement ceiling — 3 today. */
        max_placement: number;
    };
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
    /**
     * Must equal ENTRY_MODEL_BY_TEMPLATE[template]:
     * multi_pick | pickem_card | td_psychic_card.
     */
    entry_model: string;
    sunday_pickem_slate_mode?: string;
    sports?: string[];
    season_id?: string;
    opens_at: string;
    /**
     * IGNORED for td_psychic, and not merely optional there: the lock IS that
     * template's shared price cutoff, so the server derives it from the slate
     * (earliest kickoff − 5 minutes) and overwrites whatever arrives. It is what
     * the participation rules already promise members, so an organizer-chosen
     * value would contradict the contract they accept.
     */
    locks_at: string;
    expected_ends_at: string;
    /**
     * The organizer-local slate window, `YYYY-MM-DD`, read in the `x-timezone`
     * the request carries.
     *
     * REQUIRED for td_psychic and optional for multi_pick — an asymmetry the
     * server states outright ("slate_starts_on and slate_ends_on are required for
     * TD Psychic!"), because multi_pick contests have been created without one
     * since the endpoint shipped and making it mandatory would refuse every
     * existing client. Sending either from sunday_pickem is a 400.
     */
    slate_starts_on?: string;
    slate_ends_on?: string;
    /** General Combo only; required for the multi_pick template. */
    minimum_legs?: number;
    maximum_legs?: number;
    minimum_odds?: number | null;
    allow_same_game_legs?: boolean;
    rules_text: string;
    eligible_game_ids: string[];
    eligible_games_json: FeedContestGameSnapshot[];
    /** IGNORED for td_psychic — the template fixes it at three. */
    winning_places: number;
    /**
     * ARENA ONLY — the wizard's "Owner and manager participation" control. Send
     * nothing from a League: the server forces `true` there regardless (a
     * commissioner competes), so a value would be inert rather than wrong.
     *
     * These endpoints REPLACE the row, so once a draft carries a value the next
     * save has to carry it too or the opt-in silently resets.
     */
    allow_staff_participation?: boolean;
    /**
     * ARENA ONLY — the wizard's Access step. Omitted means 'open'; asking for
     * `venue_check_in_required` from a League context is a 400, and publishing
     * one in an Arena with no configured venue is a 409 (drafts are exempt).
     */
    entry_access_mode?: FeedContestEntryAccessMode;
    /**
     * The zone the wizard's DATES were computed in, replayed as `x-timezone`.
     * Stripped from the body by the saga — it is a header, not a field.
     *
     * Load-bearing for td_psychic and inert for the other two. The wizard reads
     * the organizer's ACCOUNT zone when they have set one, falling back to the
     * browser's; the server reads `slate_starts_on`/`slate_ends_on` and buckets
     * every kickoff in whatever `x-timezone` says. Letting the header default to
     * the browser zone therefore makes an organizer whose account zone differs
     * from their machine's — anyone travelling — fail the create with
     * "Match … kicks off on <date>, outside the selected slate dates!" for a
     * slate the wizard itself drew.
     *
     * The draft-replace body carries the same field for the same reason.
     */
    time_zone?: string;
    /**
     * ARENA ONLY — the wizard's Reward step, and the ONLY way a reward is ever
     * created.
     *
     * There is no "attach a prize afterwards" endpoint, and the omission is
     * deliberate: the reward's legal disclosure has to be inside `rules_text` on
     * the very first version of the row, or the contest goes live advertising a
     * prize its own published rules do not mention. `PATCH /reward/:id/prizes`
     * can correct the WORDING later; it cannot add a reward
     * ({@link FeedContestRewardPrizesPayload}).
     *
     * `{ enabled: false }` is a complete answer, not a missing field — the
     * server treats it exactly as an absent key, which is what lets the wizard
     * post its step state verbatim. Sending it from a League context is a 400.
     *
     * Note what is NOT here: the venue, the contact email and the provider name.
     * Each is a claim about who is legally responsible for a real-world prize,
     * so the server resolves all three from its own state and ignores anything
     * a body says about them.
     */
    arena_reward?: FeedContestRewardInput;
};

/**
 * ARENA CONTEST REWARDS — a real-world prize on a contest's podium, offered,
 * supplied and handed over by the Arena. Gotlocks never provides, funds, ships
 * or guarantees one, and nothing in this feature moves money.
 */
export type FeedContestRewardSettlementMethod = "in_person" | "virtual";

export type FeedContestRewardPrize = {
    place: number;
    title: string;
    description: string;
    /** A free-text LABEL ("$50", "Two tickets") — never a currency amount. */
    approximate_value: string | null;
};

/** The organizer-authored half, as `arena_reward` on a create / draft body. */
export type FeedContestRewardInput =
    | { enabled: false }
    | {
        enabled: true;
        settlement_method: FeedContestRewardSettlementMethod;
        prizes: FeedContestRewardPrize[];
        /** REQUIRED for in-person; forced to null for virtual. */
        pickup_instructions: string | null;
        /** The attestation. An unsigned offer is refused with a 400. */
        organizer_confirmed: boolean;
    };

/**
 * The stored reward as `GET /detail/:contest_id` returns it, on `data.reward`.
 *
 * NULL on every League contest and on any Arena contest whose organizer chose
 * "No prizes". A SIBLING of `contest` rather than a field on it, because the
 * list endpoints deliberately do not carry it.
 *
 * The snapshot columns are frozen copies taken when the reward was signed, never
 * re-read from the Arena: an owner who has since moved venue must not have a
 * live contest silently repointed at the new address.
 */
export type FeedContestReward = {
    contest_id: string;
    settlement_method: FeedContestRewardSettlementMethod;
    prizes: FeedContestRewardPrize[];
    pickup_instructions: string | null;
    venue_name_snapshot: string | null;
    venue_address_snapshot: string | null;
    reward_contact_email_snapshot: string | null;
    provider_name_snapshot: string;
    /** Organizer projection only — absent from the member-facing read. */
    venue_id?: string | null;
    confirmed_by_user_id?: string;
    confirmed_at?: string;
};

/**
 * One winner's prize, on `data.reward_awards`. EMPTY until the contest
 * finalizes, and empty forever on a contest that never carried a reward.
 *
 * `not_awarded` is a normal outcome rather than an error — a contest nobody
 * scored in awards nothing, and "offered but unwon" has to be distinguishable
 * from "never offered".
 */
export type FeedContestRewardAwardStatus =
    | "pending"
    | "claimed"
    | "fulfilled"
    | "unclaimed"
    | "not_awarded"
    | "void";

export type FeedContestRewardAward = {
    id: string;
    contest_id: string;
    place: number;
    user_id: string | null;
    username_snapshot: string | null;
    prize_title: string;
    prize_description: string;
    prize_approximate_value: string | null;
    settlement_method: FeedContestRewardSettlementMethod;
    status: FeedContestRewardAwardStatus;
    awarded_at: string | null;
    claimed_at: string | null;
    fulfilled_at: string | null;
    unclaimed_at: string | null;
    voided_at: string | null;
    /** Organizer projection only — the Arena's own working notes. */
    fulfillment_note?: string | null;
    fulfilled_by_user_id?: string | null;
};

/**
 * PATCH /group/feed-contest/reward/:contest_id/prizes — organizer only, Arena
 * only, and the ONE reward write allowed after a contest has gone live.
 *
 * It edits prize WORDING and nothing else. The settlement method, the venue, the
 * pickup instructions and the contact email are the deal a member accepted when
 * they entered, so they are rebuilt from the stored row and anything the body
 * says about them is ignored. The SET of paid places is frozen too: adding a
 * 3rd-place prize after entries land changes who stands to win something, and
 * removing one takes an advertised prize away — either answers 409.
 *
 * A contest published WITHOUT prizes answers 409 as well; there is no path that
 * attaches one afterwards.
 *
 * Every edit re-signs an attestation and rewrites the ARENA REWARD block inside
 * `rules_text`, but deliberately does NOT bump `rules_version` — bumping would
 * strand every existing entrant between an entry they cannot replace and a
 * re-join they cannot make.
 */
export type FeedContestRewardPrizesPayload = {
    contest_id: string;
    prizes: FeedContestRewardPrize[];
    organizer_confirmed: boolean;
};

export type FeedContestRewardPrizesData = {
    reward: FeedContestReward;
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
    /**
     * NULL on a League, and on any Arena contest whose organizer chose "No
     * prizes" — which is most of them. Shown to EVERY viewer, entered or not:
     * "what do I win" is exactly the question somebody asks BEFORE deciding to
     * enter.
     */
    reward?: FeedContestReward | null;
    /** Empty until the contest finalizes, and always empty without a reward. */
    reward_awards?: FeedContestRewardAward[];
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

/**
 * POST /group/feed-contest/enter-pickem/:contest_id — the Sunday Pick'em card.
 *
 * Same body as the combo enter: `legs`, `rules_version`, and the optional copy.
 * The SERVER's leg contract differs in one place — `side` must name the TEAM
 * ("Chicago Bears"), not the home/away slot, because `validatePickemCardEntry`
 * compares it against the slate snapshot's `home_team`/`away_team`.
 */
export type EnterPickemFeedContestPayload = EnterFeedContestPayload;

/**
 * The card's own envelope. Structurally the enter envelope with a DIFFERENT
 * `entry` summary: a card has no combined price, so it reports what it pays if
 * every selection lands rather than one parlay number. It also carries the
 * standings row the write seeded.
 */
export type EnterPickemFeedContestData = Omit<EnterFeedContestData, "entry"> & {
    entry: {
        pick_count: number;
        /** What the card pays if EVERY selection lands — not a promise. */
        potential_points: number;
        correct_bonus: number;
        game_ids: string[];
        sport: string | null;
        earliest_kickoff_at: string;
    };
    /** NULL only when the standings write failed; the card is stored either way. */
    leaderboard?: unknown | null;
};

/**
 * PUT /group/feed-contest/replace-pickem-entry/:contest_id — swap a whole card.
 *
 * `rules_version` is OPTIONAL, like the combo replace: the acceptance stored on
 * the participant row is what gets checked. Sent, it must AGREE — 409 otherwise.
 */
export type ReplacePickemFeedContestEntryPayload = Omit<
    EnterPickemFeedContestPayload,
    "rules_version"
> & { rules_version?: string };

/**
 * The replace envelope. Like the enter one MINUS `participant` (the row is
 * untouched but for its timestamp), PLUS what was displaced.
 *
 * `previous_entry` is shaped for a CARD, not a parlay: `pick_count` and per-leg
 * `selections`, never the combo path's `leg_count`/`combined_american_odds` — a
 * card has no combined price.
 */
export type ReplacePickemFeedContestEntryData = Omit<
    EnterPickemFeedContestData,
    "participant"
> & {
    previous_entry?: {
        pick_count?: number;
        points?: number | null;
        selections?: {
            game_id: string | null;
            team: string | null;
            external_pick_key: string | null;
            american_odds: number | null;
        }[];
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

/**
 * One standing's award, as `runFeedContestLeaderboard` embeds it.
 *
 * Deliberately derived from the trophy-case row rather than declared again: the
 * server builds both from the same `contest_achievements` columns and says so,
 * so a field added there must not silently diverge here. `is_own` and `contest`
 * are the two the leaderboard drops — the board already knows whose row it is
 * and which contest it belongs to.
 */
export type FeedContestStandingAchievement = Omit<
    FeedContestAchievementRow,
    "is_own" | "contest"
>;

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
     * WITHHELD as null until the contest locks, for everyone but the viewer's own
     * row — it is `legs.length`, the one signal that cannot be recovered from the
     * price, so publishing it early would tell the field how long a parlay each
     * rival built. Null here means "not visible yet", never "no value";
     * `is_entry_revealed` on the row says which.
     */
    total_picks: number | null;
    /**
     * NOT withheld, unlike `total_picks` beside it. `contest_points` is live from
     * the moment an entry is accepted and inverts back to the price, so gating
     * this would narrow the disclosure rather than close it — the server sends it
     * to everyone deliberately, and the board is meant to show what each entrant
     * is playing for.
     */
    combo_odds: number | null;
    is_entry_revealed: boolean;
    /**
     * The ENTRY this standing scored from, in the same shape /entries returns —
     * so one client model renders a card on either surface and the board can show
     * what someone played without a second call.
     *
     * NULL means one of two different things, and `is_entry_revealed` above is
     * what tells them apart: FALSE there means "hidden from you until the lock"
     * (the server narrows the read to the caller's own rows by user_id, so no
     * other member's slate is even SELECTed), TRUE means this standing genuinely
     * has no pick behind it. A TD Psychic card arrives past the same member
     * boundary /entries applies.
     */
    pick: FeedContestEntryPick | null;
    pick_id: string | null;
    participant_id: string | null;
    /**
     * WHAT this member won, ready to render — the same row `/feed-contest/
     * achievements` returns, minus the `contest` block that read nests (this
     * envelope already names the contest once at the top level, and repeating it
     * on every row of a fifty-member board is the same object fifty times).
     *
     * NULL for everyone who finished outside the paid window, and for every row
     * on a contest that has not finalized — an achievement row is only written by
     * finalization, so there is no state where an award exists and the field it
     * was computed from is still secret. That is why it carries NO
     * hidden-until-lock gate, unlike `total_picks` above.
     *
     * `label` is the enum already spelled for a screen ("Champion",
     * "Runner-Up"), so nothing here maps `RUNNER_UP` by hand.
     */
    achievement: FeedContestStandingAchievement | null;
    /**
     * Kept alongside `achievement`. It is the only field that distinguishes "no
     * award" from "an award whose row could not be loaded", so the board still
     * reads it rather than inferring absence from the object above.
     */
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

/* ----------------------------------------------------------------------------
 * ARENA GUIDE — the welcome walkthrough a member sees on their first visit to
 * an Arena.
 *
 * PER-ARENA, and that is the whole point of it having its own endpoints rather
 * than a `tutorial_key` on /progress/tutorial-progress: that table is keyed
 * (user_id, tutorial_key) with no group column, so it could only ever record
 * that somebody has seen "the group guide" once, ever — and a member joining
 * their SECOND Arena would never see it again. This one is keyed
 * (group_id, user_id, version).
 * -------------------------------------------------------------------------- */

/** Both silence the guide; the split only exists so "did they read it" stays answerable. */
export type ArenaGuideAckStatus = "completed" | "dismissed";

export type ArenaGuideView = {
    version: number;
    has_viewed_guide: boolean;
    /**
     * The ONLY field a client should gate the dialog on. Derived server-side so
     * the read and the write can never disagree about what "viewed" means —
     * never re-derive it from the timestamps below.
     */
    should_show_guide: boolean;
    /**
     * TRUE when they acknowledged an OLDER cut. Lets a screen open with "here's
     * what's new" rather than "welcome" after ARENA_GUIDE_VERSION is bumped,
     * without a second call.
     */
    has_viewed_any_version: boolean;
    status: ArenaGuideAckStatus | null;
    acknowledged_at: string | null;
    completed_at: string | null;
    dismissed_at: string | null;
    updated_at: string | null;
};

/** GET /group/arena/guide?arena_id= — members only (403), arena-only (404). */
export type FetchArenaGuideStatusPayload = {
    arena_id: string;
};

export type ArenaGuideStatusData = {
    arena: { id: string; name: string; group_type: string };
    viewer: {
        role: string;
        is_owner: boolean;
        /**
         * Returned to word the screen, NOT to gate it: the guide is gated on
         * acknowledgement rather than age, so a member who joined a year ago and
         * never saw it still gets it.
         */
        joined_at: string | null;
    };
    guide: ArenaGuideView;
};

/**
 * POST /group/arena/guide/viewed — `status` defaults to 'completed'.
 * Idempotent on purpose: a client that fires this on unmount will send it
 * twice, and the second is not an error.
 */
export type MarkArenaGuideViewedPayload = {
    arena_id: string;
    status?: ArenaGuideAckStatus;
};

export type MarkArenaGuideViewedData = {
    arena: { id: string; name: string; group_type: string };
    already_acknowledged: boolean;
    /** The row just written, in the same shape the GET returns. */
    guide: ArenaGuideView;
};

/* ----------------------------------------------------------------------------
 * LEAGUE GUIDE — the same walkthrough, for a League instead of an Arena.
 *
 * Deliberately a PARALLEL set of types rather than a shared generic one: the
 * two endpoints key their response on `arena` / `league` respectively, and the
 * two acknowledgement rows are independent (a member of both sees both guides
 * once each). Collapsing them would only hide that.
 *
 * The state for these lives on `GroupState` (groupsSlice) — the fantasy League
 * record's slice — NOT on ArenaState and NOT on the sports-league slice, which
 * despite the name holds NFL/NBA matchup counts. Hence the `leagueGuide*`
 * prefix on every field and action.
 * -------------------------------------------------------------------------- */

/** Both silence the guide; the split only exists so "did they read it" stays answerable. */
export type LeagueGuideAckStatus = "completed" | "dismissed";

export type LeagueGuideView = {
    version: number;
    has_viewed_guide: boolean;
    /**
     * The ONLY field a client should gate the dialog on. Derived server-side so
     * the read and the write can never disagree about what "viewed" means —
     * never re-derive it from the timestamps below.
     */
    should_show_guide: boolean;
    /**
     * TRUE when they acknowledged an OLDER cut. Lets a screen open with "here's
     * what's new" rather than "welcome" after LEAGUE_GUIDE_VERSION is bumped,
     * without a second call.
     */
    has_viewed_any_version: boolean;
    status: LeagueGuideAckStatus | null;
    acknowledged_at: string | null;
    completed_at: string | null;
    dismissed_at: string | null;
    updated_at: string | null;
};

/** GET /group/league/guide?league_id= — members only (403), leagues-only (404). */
export type FetchLeagueGuideStatusPayload = {
    league_id: string;
};

export type LeagueGuideStatusData = {
    league: { id: string; name: string; group_type: string };
    viewer: {
        role: string;
        is_owner: boolean;
        /**
         * Returned to word the screen, NOT to gate it: the guide is gated on
         * acknowledgement rather than age, so a member who joined a year ago and
         * never saw it still gets it.
         */
        joined_at: string | null;
    };
    guide: LeagueGuideView;
};

/**
 * POST /group/league/guide/viewed — `status` defaults to 'completed'.
 * Idempotent on purpose: a client that fires this on unmount will send it
 * twice, and the second is not an error.
 */
export type MarkLeagueGuideViewedPayload = {
    league_id: string;
    status?: LeagueGuideAckStatus;
};

export type MarkLeagueGuideViewedData = {
    league: { id: string; name: string; group_type: string };
    already_acknowledged: boolean;
    /** The row just written, in the same shape the GET returns. */
    guide: LeagueGuideView;
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
    /**
     * The Arena Guide's state for the viewer. Single-tenant and stamped with
     * `guideForId` like everything else here — auto-opening a welcome dialog off
     * the PREVIOUS Arena's answer is exactly the kind of thing that only shows
     * up in production.
     */
    guide: ArenaGuideView | null;
    guideForId: string | null;
    guideLoading: boolean;
    guideError: string | null;
    guideAckLoading: boolean;
    guideAckError: string | null;
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
    // Status for the owner-only remove-member write. memberActionUserId is the
    // row currently being written. Manager promote/demote used to share this
    // slot and now lives on groupsSlice as `managerAction*`.
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

    /* ---- Joining: the setup wizard and the owner's approval queue ---- */
    // POST /group/arena/complete-setup. `setupComplete` latches the 200 so the
    // wizard can advance to its optional third step without re-reading the group.
    setupLoading: boolean;
    setupError: string | null;
    setupComplete: boolean;
    // PUT /group/arena/join-policy — the later edit, from Settings.
    joinPolicyLoading: boolean;
    joinPolicyError: string | null;
    joinPolicyMessage: string | null;
    // GET /group/arena/join-requests. Scoped by id for the same reason the guide
    // is: this list renders over the Members tab, and the previous Arena's queue
    // appearing on it is a bug that only shows when navigating between two.
    joinRequests: GroupJoinRequest[];
    joinRequestsForId: string | null;
    joinRequestsLoading: boolean;
    joinRequestsError: string | null;
    // Always the PENDING count, whatever the list was filtered by.
    pendingJoinRequestCount: number;
    // PUT /group/arena/join-requests/respond. `respondingUserId` is the requester
    // being answered, so only that row shows a busy state.
    joinRequestActionLoading: boolean;
    respondingUserId: string | null;
    joinRequestActionError: string | null;
    joinRequestActionMessage: string | null;
    /* The staff-only member contacts panel in the Members tab.
     *
     * Scoped by `memberContactsForId` for the same reason the join queue is:
     * the panel renders inside the Members tab, and one Arena's addresses
     * appearing under another is the worst version of that bug.
     *
     * The LIST is paged and appends like the roster above it. The EXPORT is a
     * separate act with its own busy flag, because it is throttled and audited
     * server-side and must not be charged for a page turn. */
    memberContacts: ArenaMemberContact[];
    memberContactsPagination?: PaginationMetadata;
    memberContactsForId: string | null;
    memberContactsLoading: boolean;
    memberContactsError: string | null;
    // GET /group/arena/member-contacts — the CSV. Never stored: the bytes go
    // straight from the response to the blob the browser saves.
    memberContactsExporting: boolean;
    memberContactsExportError: string | null;
    // Shared status for the three hosting writes (activate-hosting /
    // schedule-pause / cancel-pause). Only one runs at a time.
    hostingActionLoading: boolean;
    hostingActionError: string | null;
    hostingActionMessage: string | null;
    // Which tier an activate-hosting call is in flight for, so only that card
    // shows a busy state.
    hostingActionTier: string | null;

    /* ---- Arena billing (real Stripe) ---- */
    // The live subscription for `hostingForId`.
    subscription: ArenaSubscription | null;
    subscriptionLoading: boolean;
    subscriptionError: string | null;
    // Checkout hand-off. `checkoutRedirecting` latches the confirm button
    // through the navigation to Stripe — the browser is unloading, so without it
    // the button flicks back to enabled and invites a second click.
    checkoutLoading: boolean;
    checkoutRedirecting: boolean;
    checkoutError: string | null;
    // Post-redirect polling. The webhook is the authority but can be a few
    // seconds behind the browser, so the return page polls checkout-status.
    checkoutStatus: ArenaCheckoutStatusKind | null;
    // Which Arena the polled session belongs to, so the return banner cannot
    // render against a different Arena.
    checkoutArenaId: string | null;
    checkoutStatusLoading: boolean;
    checkoutStatusError: string | null;
    // change-plan / cancel-hosting / resume-hosting share one slot; only one can
    // run at a time. billingActionTier marks which card is busy.
    billingActionLoading: boolean;
    billingActionTier: string | null;
    billingActionError: string | null;
    billingActionMessage: string | null;
    // Per-Arena invoice history.
    invoices: ArenaInvoice[];
    invoicesLoading: boolean;
    invoicesError: string | null;
    invoicesHasMore: boolean;
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
    /**
     * 200 vs 202. `requested` means the Arena runs on approval and the owner has
     * been rung — the caller must NOT navigate into the Arena, because no
     * membership exists yet.
     */
    joinArenaDisposition: "joined" | "requested" | null;
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
    pickemMoneyline: PickemMoneylineState;
    tdScorers: TdScorersState;
    memberCard: MemberCardState;
    venue: VenueState;
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

/* ----------------------------------------------------------------------------
 * PER-GAME enrichment of that board.
 *
 * The batch read answers for the WHOLE slate, and it answers with main lines
 * only: `schedules-with-odds-by-events` defaults `main=true`. Two things it
 * therefore cannot do, and two targeted calls that can:
 *
 *   1. `GET /leagues/<sport>/odds?match_id=<id>` — odds BY MATCH ID. Those
 *      controllers send no `main` filter upstream at all, so one game comes back
 *      with its FULL market board (props, alternates, every non-main line). That
 *      is what the detail panel shows once a member opens a matchup.
 *   2. `GET /leagues/<sport>/schedules-with-odds-by-events?event_ids=<one id>`
 *      with `main=false` — a TARGETED retry for a game the batch reported as
 *      unpriced. The `main` flag is part of the server's per-event cache key, so
 *      flipping it is also what gets past the 60s negative-cache marker the
 *      batch just wrote for that id; a same-shaped retry would be served the
 *      remembered miss.
 *
 * Both are pure ENRICHMENT: they are stored beside the batch answer, never
 * instead of it, so a failure, an empty answer or a call still in flight leaves
 * the slate rendering exactly as the batch left it.
 * -------------------------------------------------------------------------- */

/** Which of the two calls produced an answer — the UI needs them distinguishable. */
export type FeedContestGameOddsSource = "match_odds" | "by_events";

export type FeedContestGameOddsStatus = "idle" | "loading" | "loaded" | "error";

/**
 * One path's outcome for one game. This is the DE-DUPE ledger: a path that has
 * already been tried for a game is never tried again under the same contest, so
 * a failing game cannot spin the network.
 */
export type FeedContestGameOddsAttempt = {
    status: Exclude<FeedContestGameOddsStatus, "idle">;
    /** TRUE only when the answer actually carried priced markets. */
    hasOdds: boolean;
    error: string | null;
    fetchedAt: number | null;
};

/** The best enrichment answer so far for one slate game, plus that ledger. */
export type FeedContestGameOddsEntry = {
    /** `loading` while EITHER path is in flight; `idle` for a game never asked for. */
    status: FeedContestGameOddsStatus;
    /** Which path produced `group`. */
    source: FeedContestGameOddsSource | null;
    /**
     * The answer wearing the SAME shape the batch read stores, so
     * `buildContestOddsGames` / `selectionsForEvent` parse it unchanged and the
     * builder keeps exactly one render path.
     */
    group: FeedContestOddsGroup | null;
    /** TRUE when `group` carries at least one priced selection for this game. */
    hasOdds: boolean;
    error: string | null;
    /**
     * The ENRICHMENT's own timestamp, deliberately separate from
     * `FeedContestOddsState.fetchedAt`: the review sheet re-quotes off that one,
     * and the by-match-id cache is up to 60 min (5 HOURS on MLB) against the
     * by-events cache's 5 min. A stale enrichment must never age the board's
     * re-quote clock.
     */
    fetchedAt: number | null;
    attempts: Partial<Record<FeedContestGameOddsSource, FeedContestGameOddsAttempt>>;
};

/** `data.odds` of an odds-by-match-id response. */
export type LeagueMatchOddsPayload = {
    updated?: string;
    league?: LeagueObject | null;
    sportsbook?: SportsBookObject | { id: string };
    /**
     * `data.schedule` MINUS requested/missing/partial — so this route cannot say
     * WHY it came back empty. An unpriced id and an unknown id both answer 200
     * with `events: []`, and a vendor 404 surfaces as a 500. Nothing from here is
     * ever shown to a member as an error.
     */
    events: FeedContestOddsEvent[];
};

export type FetchContestGameOddsPayload = {
    /**
     * The batch read's `requestKey` at dispatch time. Every per-game answer is
     * checked against it, so one contest's enrichment can never land under
     * another contest's slate.
     */
    contestRequestKey: string;
    /** The CONTEST's stored `game_id` — the same id the batch read asked for. */
    gameId: string;
    /** The slate row's sport ("NFL" … "Soccer"); picks the route. */
    sport: string;
    /** Defaults to FanDuel, matching the batch read. */
    sportsbook?: FeedContestSportsbook;
    /**
     * by-match-id only, and part of THAT route's cache key — pass it consistently
     * or the same game warms two upstream entries.
     */
    isLive?: boolean;
    /** A member-initiated retry: the only thing that re-arms a spent attempt. */
    force?: boolean;
};

export type ContestGameOddsSuccessPayload = {
    contestRequestKey: string;
    gameId: string;
    source: FeedContestGameOddsSource;
    /** NULL when the call answered cleanly with nothing — not an error. */
    group: FeedContestOddsGroup | null;
    fetchedAt: number;
};

export type ContestGameOddsFailurePayload = {
    contestRequestKey: string;
    gameId: string;
    source: FeedContestGameOddsSource;
    error: string;
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
    /**
     * Per-game enrichment, keyed by the contest's `game_id`, scoped to
     * `requestKey` and dropped the moment that key changes.
     */
    byGame: Record<string, FeedContestGameOddsEntry>;
};

/* ----------------------------------------------------------------------------
 * GET /leagues/nfl/moneyline-odds — the Sunday Pick'em read.
 *
 * A narrower, faster sibling of `schedules-with-odds-by-events`: a Pick'em card
 * asks one question per game (who wins), so this returns ONLY the moneyline and
 * returns it already flattened into the fields a leg is built from, instead of
 * the full mixed `odds[]` board the generic endpoint sends.
 *
 * Two behaviours differ from the generic endpoint and both matter here:
 *   - `markets` ADDS to Moneyline rather than replacing it, so the one market
 *     this endpoint exists for cannot be filtered away.
 *   - `events_without_moneyline` is DISTINCT from `missing_event_ids`: the first
 *     is "the book pulled this line", the second is "the provider has no such
 *     event". Only the first can resolve by waiting.
 * -------------------------------------------------------------------------- */

/** One side of a moneyline, already paired to its team by the server. */
export type PickemMoneylineSelection = {
    side: "home" | "away" | null;
    team: string;
    team_abbreviation: string | null;
    /** The book's own selection id — the grading key a leg must carry. */
    external_pick_key: string;
    /** NULL when the vendor sent an unparseable price; such a side is unpickable. */
    american_odds: number | null;
    price: string | null;
    market: string;
};

export type PickemMoneylineEvent = {
    game_id: string;
    starts_at: string | null;
    is_live: boolean;
    matchup: string | null;
    home_team: string | null;
    away_team: string | null;
    /** Exactly two, AWAY FIRST — the order a matchup is written and read in. */
    selections: PickemMoneylineSelection[];
};

export type FetchPickemMoneylinePayload = {
    contest_id: string;
    /** The contest's frozen slate; its ids are what the endpoint is asked for. */
    game_ids: string[];
    sportsbook?: string;
};

export type PickemMoneylineState = {
    /** `<contestId>|<sportsbook>|<sorted game ids>`, compared by the consumer. */
    requestKey: string;
    events: PickemMoneylineEvent[];
    /** Ids the provider does not carry at all. */
    missingGameIds: string[];
    /** Ids it carries but with no moneyline posted right now. */
    withoutMoneylineGameIds: string[];
    /** TRUE when at least one chunk failed outright — a missing id is "unknown". */
    partial: boolean;
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
    /* ---------- TD PSYCHIC ----------
     *
     * A TD leg names a PLAYER, so its identity cannot be reconstructed from the
     * fields above the way a moneyline leg's can: a Pick'em tile recovers its
     * team from `side`/`description`, but "Jaylen Waddle" says nothing about
     * which club to colour the square with. The server writes all four, and the
     * member-facing read keeps them (only the provider ids are redacted).
     */
    playerName?: string;
    position?: string | null;
    teamName?: string | null;
    teamAbbreviation?: string | null;
    /**
     * When the shared capture froze this scorer's price. Written by the capture
     * and by nothing else, so its PRESENCE is the reliable "this card is past
     * the lock" test — steadier than reading `american_odds`, which a voided
     * card can be missing.
     */
    lockedOddsAt?: string | null;
};

export type PickLeg = {
    description: string;
    odds_bracket: string;
    /**
     * The leg's own American price. On a COMBO leg this only feeds the server's
     * combined number; on a Sunday Pick'em selection it IS the award, which is
     * why the card's tiles read it directly.
     */
    american_odds?: number | null;
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
    | "contest_badges"
    /**
     * The invited member's copy, and their ONLY surface for the decision — they
     * hold no settings screen for a role they do not have yet. The accept and
     * decline controls read `metadata.invitation_id`.
     */
    | "group_manager_invitation"
    /** Sent back to the OWNER; `metadata.decision` carries the verdict. */
    | "group_manager_response";

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
        /**
         * RIDING on unresolved contests. Deliberately not added into the above,
         * and deliberately not RENDERED anywhere either: nothing in this system
         * actually stores points in play, so the figure is not a fact a screen
         * can stand behind. Kept only to describe the payload.
         */
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

/**
 * GET /group/member-picks/community — a `picks` row with no feed_contest_id.
 *
 * UNWIRED as of 2026-08-22: community picks were removed from the product, so
 * the member card no longer lists them and nothing reads this shape. Kept only
 * to describe the endpoint; delete both types with the route.
 */
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

/* ----------------------------------------------------------------------------
 * GET /group/contest-leaderboard/badges/earned — Capture-the-Badge awards.
 *
 * Reads only FROZEN contests, and that is the definition rather than a filter:
 * every badge is a contest-wide argmax that can change hands on any regrade
 * until finalization, so a live contest has no earned badges — only a current
 * holder. Nothing that appears here can later change.
 *
 * `group_id` OR `user_id` is required; passing only `user_id` is allowed for
 * the CALLER'S OWN badges alone, because the answer would otherwise span every
 * league the target plays in. This card always sends both.
 * -------------------------------------------------------------------------- */
export type EarnedContestBadgesPayload = {
    group_id?: string;
    user_id?: string;
    page?: number;
    limit?: number;
};

export type EarnedContestBadgeRow = {
    badge_id: string;
    badge_name: string;
    /** Matches ContestBadgeCategory; typed wide because it is a frozen snapshot
     *  and a catalog edit must not make an old award unrenderable. */
    badge_category: string;
    points_awarded: number;
    /** NUMERIC server-side — american odds, a win count, or a 0..1 accuracy. */
    value: number;
    value_label: string | null;
    mark_to_beat_label: string | null;
    sport: string | null;
    reached_at: string | null;
    definition: unknown;
    extra: unknown;
    /** Only biggest-hit and td-sniper name one pick; the other 30 badges are
     *  aggregates over many picks and carry null. */
    winning_pick: {
        pick_id: string | null;
        slip_id: string | null;
        description: string | null;
        odds: number | null;
        matchup: string | null;
    } | null;
    contest: {
        contest_id: string;
        contest_name: string | null;
        group_id: string;
        starts_at: string | null;
        ends_at: string | null;
        finalized_at: string | null;
        /** Today's badge logic replayed over historic picks, not what members
         *  actually saw. Surfaced rather than smoothed over. */
        is_reconstructed: boolean;
        total_participants: number;
    };
    /** Frozen at finalization, so a member who left still renders. */
    member: {
        user_id: string;
        username: string;
        profile_image: string | null;
        rank: number | null;
        cumulative_points: number | null;
    };
};

export type EarnedContestBadgesData = {
    group_id: string | null;
    user_id: string | null;
    summary: {
        /** Exact — from the paged query's own count, so it stays right even
         *  when `truncated` is true. */
        total_badges: number;
        total_badge_points: number;
        contests_with_badges: number;
        members_with_badges: number;
        /** TRUE when everything except total_badges covers only a bounded scan. */
        truncated: boolean;
        by_badge: Array<{
            badge_id: string;
            badge_name: string;
            badge_category: string;
            count: number;
            points: number;
        }>;
    };
    badges: EarnedContestBadgeRow[];
    /** Snake-cased `total_pages` here, unlike the member-picks reads. */
    pagination: { page: number; limit: number; total: number; total_pages: number };
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

    feedContestPicks: FeedContestPicksData | null;
    feedContestPicksLoading: boolean;
    feedContestPicksError: string | null;

    achievements: FeedContestAchievementsData | null;
    achievementsLoading: boolean;
    achievementsError: string | null;

    /** League only — Capture-the-Badge is a slip-contest award, and an Arena
     *  runs no slip contests. */
    earnedBadges: EarnedContestBadgesData | null;
    earnedBadgesLoading: boolean;
    earnedBadgesError: string | null;
};

/* ----------------------------------------------------------------------------
 * GET /leagues/nfl/td-scorers-by-events — the TD PSYCHIC read.
 *
 * The scorer-market twin of `/leagues/nfl/moneyline-odds` above, and separate
 * from the generic by-events board for the same two reasons that one is: the
 * market is GUARANTEED (`markets` adds to Player Touchdowns rather than
 * replacing it), and the players arrive already flattened AND eligibility
 * filtered — full-game `Over 0.5` only, so First/Last Scorer and the 2+/3+
 * alternates never reach the picker. Filtering server-side is what stops the
 * builder from offering a selection `/enter-td-psychic` would then refuse.
 *
 * What comes back per player is the PROVIDER IDENTITY a TD selection is built
 * from — `player_id`, `team_id`, `provider_market_id`, `provider_selection_id` —
 * plus a display-only `american_odds`. That price is NOT what a card scores at:
 * one shared price per scorer is captured at the contest lock and is the same
 * number for every member who picked that player.
 * -------------------------------------------------------------------------- */

/** One eligible anytime-touchdown scorer, as the server flattened them. */
export type TdScorerSelection = {
    player_id: string;
    player_name: string;
    position: string | null;
    team_id: string;
    team_name: string | null;
    team_abbreviation: string | null;
    /** Which half of the matchup the player is on — the server checked this. */
    team_side: "home" | "away" | null;
    /** Derived, stable: `<game_id>#Player Touchdowns`. */
    provider_market_id: string;
    /** The vendor's odds id. Doubles as the grader key at settlement. */
    provider_selection_id: string;
    /**
     * DISPLAY ONLY, and NULL when the vendor sent an unparseable price. Shown as
     * non-binding `Public data`; never sent back with a card, because the entry
     * endpoint takes no prices at all.
     */
    american_odds: number | null;
    price: string | null;
    /** When the book last moved this quote. */
    observed_at: string | null;
    market: string;
    side: string;
    line: number;
};

export type TdScorerEvent = {
    game_id: string;
    starts_at: string | null;
    is_live: boolean;
    matchup: string | null;
    home_team: string | null;
    away_team: string | null;
    /** Present so the card's team check can be made against the same two ids. */
    home_team_id: string | null;
    away_team_id: string | null;
    /** Away side first, then home; alphabetical by player within each side. */
    selections: TdScorerSelection[];
};

export type FetchTdScorersPayload = {
    contest_id: string;
    /** The contest's frozen slate; its ids are what the endpoint is asked for. */
    game_ids: string[];
    sportsbook?: string;
};

export type TdScorersState = {
    /** `<contestId>|<sportsbook>|<sorted game ids>` — the key all three boards share. */
    requestKey: string;
    events: TdScorerEvent[];
    /** Ids the provider does not carry at all. */
    missingGameIds: string[];
    /** Ids it carries, but with no anytime-TD line posted yet. */
    withoutScorersGameIds: string[];
    /**
     * DISTINCT players across the whole slate, as the server counted them. A TD
     * Psychic card needs three, so the builder gates on the server's own number
     * rather than counting client-side and disagreeing with it.
     */
    distinctPlayerCount: number;
    /** TRUE when at least one chunk failed outright — a missing id is "unknown". */
    partial: boolean;
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
};

/* ----------------------------------------------------------------------------
 * POST /group/feed-contest/enter-td-psychic/:contest_id
 * PUT  /group/feed-contest/replace-td-psychic-entry/:contest_id
 *
 * The third entry model, and the body is where it parts company with the other
 * two: it carries NO PRICES. A combo and a Pick'em card both send
 * `american_odds` per leg and are priced at acceptance; a TD card sends three
 * player identities and is stored with every price null, because one shared
 * price per scorer is captured at the contest lock — the same number for
 * everyone holding that player, which is the only way the correct-scorer
 * tiebreak can compare two cards at all.
 * -------------------------------------------------------------------------- */

/**
 * One of the three scorers, as the client submits them.
 *
 * Every id here is echoed from `/leagues/nfl/td-scorers-by-events`; nothing is
 * derived. The server re-resolves all five parts against the live market and
 * refuses the card if any one of them no longer names an eligible anytime line,
 * so a stale or invented id fails at submission rather than at settlement.
 */
export type TdPsychicSelectionPayload = {
    /** The contest's own stored event id, compared against `eligible_game_ids`. */
    game_id: string;
    /** Must be distinct across the three — the same scorer twice is a 400. */
    player_id: string;
    /** Checked against the frozen snapshot's home/away team ids for THIS game. */
    team_id: string;
    /** Optional; the server derives `<game_id>#Player Touchdowns` when omitted. */
    provider_market_id?: string;
    provider_selection_id: string;
};

export type EnterTdPsychicFeedContestPayload = {
    contest_id: string;
    /** Echo `contest.rules_version` verbatim; a stale one answers 409. */
    rules_version: string;
    /** EXACTLY three, all different players. */
    selections: TdPsychicSelectionPayload[];
    /** Absent - the server joins the three player names with a bullet. */
    description?: string;
    source_tab?: string;
    /** Defaults to "ODDS" server-side. */
    build_mode?: string;
    scope?: string;
    validation_status?: string;
};

/**
 * The card's envelope. The enter shape with a THIRD `entry` summary: a TD card
 * has neither a combined price (the combo's) nor a potential total (Pick'em's),
 * because at acceptance it genuinely has no price. What it reports instead is
 * WHEN the prices arrive.
 */
export type EnterTdPsychicFeedContestData = Omit<EnterFeedContestData, "entry"> & {
    entry: {
        pick_count: number;
        game_ids: string[];
        sport: string | null;
        earliest_kickoff_at: string;
        /**
         * `contest.locks_at` — the single shared cutoff at which every scorer on
         * every card is priced. Deliberately in place of `potential_points`:
         * inventing a number here is one the capture then contradicts.
         */
        prices_captured_at: string;
    };
    /** NULL only when the standings write failed; the card is stored either way. */
    leaderboard?: unknown | null;
};

/**
 * PUT /group/feed-contest/replace-td-psychic-entry/:contest_id — swap a WHOLE
 * card of three players, validated exactly as a first submission is.
 *
 * `rules_version` is OPTIONAL, like both siblings: the acceptance stored on the
 * participant row is what gets checked. Refused additionally once the card
 * carries lock prices — a priced card is past the shared cutoff whatever its
 * contest's status column says.
 */
export type ReplaceTdPsychicFeedContestEntryPayload = Omit<
    EnterTdPsychicFeedContestPayload,
    "rules_version"
> & { rules_version?: string };

export type ReplaceTdPsychicFeedContestEntryData = Omit<
    EnterTdPsychicFeedContestData,
    "participant"
> & {
    /**
     * What the swap displaced, shaped for a CARD OF PLAYERS.
     *
     * Neither sibling's shape: the combo replace reports `leg_count` at a
     * `combined_american_odds`, and the Pick'em replace reports `pick_count` with
     * a team and a price per selection. A TD card reports who was on it and
     * carries no price at all — before the lock there is none to report, which is
     * the whole point of the template.
     */
    previous_entry?: {
        pick_count?: number;
        selections?: {
            game_id?: string | null;
            player_id?: string | null;
            player_name?: string | null;
        }[];
    } | null;
};
