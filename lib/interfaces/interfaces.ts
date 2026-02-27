export type Role = "member" | "commissioner";

export type ContestStyle = "infinite" | "custom" | "monthly";

export type SlipStatus = "open" | "locked" | "grading" | "final";

export type PickResult = "win" | "loss" | "void" | "pending" | "not_found" | null;

export type League = "NFL" | "NBA" | "NCAAF" | "NCAAB" | "NHL" | "MLB" | "Soccer";

export type BuildMode = "ODDS";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

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

export interface Toast {
    id: number;
    type: "success" | "error" | "info";
    message: string;
    duration: number;
}

export interface CurrentUser {
    username: string;
    age: number;
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
    userId: string;
}

// NOTE: `name` is a legacy alias for the username/handle chosen during onboarding.
export interface User {
    id: string;
    // `name` is the public-facing handle/pseudonym across the app.
    name: string;
    email: string;
    // Full legal name captured at signup.
    fullName: string;
    password?: string;
    joined_at?: string;
    // Username/handle used consistently across the app.
    username?: string;
    userId?: string;
    user?: {
        user_metadata?: CurrentUser;
        access_token?: string;
        refresh_token?: string;
    };
}

export interface Profile {
    id: string;
    email: string;
    username: string;
    age?: number;
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
}

export interface ActiveSlip {
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

export interface Group {
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
    open_slip?: number;
    final_slip?: number;
    is_enable_secondary_leaderboard: boolean;
}

export type Slip = {
    id?: string;
    group_id: string;
    index?: number;
    name: string;
    sports?: string[];
    isGraded: boolean;
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
    updated_at?: string;
    scope?: PickScope;
    market?: PickMarket;
    game_id?: string;
    team_id?: string;
    player_id?: string;
    side?: PickSide;
    threshold?: number;
    difficulty_tier?: 1 | 2 | 3 | 4 | 5;
    book_odds?: BookOdds[];
    best_offer?: BookOffer;
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
    text: string;
    type: "text" | "emoji";
    created_at: string;
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

export interface AuthState {
    error: string | null;
    user: User | null;
    message: string | null;
    loading: boolean;
}

export interface AuthSelector {
    user: AuthState;
}

export interface GroupState {
    error: string | null;
    group: Group | null;
    message: string | null;
    loading: boolean;
    loadingLeaderboard: boolean;
    leaderboard?: Record<string, unknown>;
    leaderboardList: LeaderboardList | null;
    archivedLeaderboard?: Record<string, unknown>;
    deleteMessage: string | null;
    deleteLoading: boolean;
    leaveLoading: boolean;
    leaveMessage: string | null;
}

export interface GroupSelector {
    group: GroupState;
}

export interface RegisterPayload {
    fullName: string;
    username: string;
    email: string;
    password: string;
    age?: number;
    dob: string;
}

export interface LoginPayload {
    loginId: string;
    password: string;
}

export interface Member {
    length?: number | undefined;
    id?: string;
    group_id?: string;
    user_id?: string;
    role?: Role;
    joined_at?: string;
    profiles?: {
        username?: string;
        user_id?: string;
        profile_image?: string;
        [key: string]: unknown;
    };
}

export type Members = Member[];
export type Slips = Slip[];
export type Picks = Pick[];

export interface GroupResponse {
    data?: {
        group?: Group | null;
    };
}

export type CreateGroupPayload = Group;

export type FetchGroupsParams = {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    search?: string;
};

export type FetchGroupByIdPayload = {
    groupId: string;
};

export type FetchLeaderBoardsPayload = {
    group_id: string;
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

export type EnableSecondaryLeaderboardPayload = {
    group_id: string;
    isEnable: boolean;
};

export type InviteCodePayload = {
    invite_code: string;
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

export type FetchPicksPayload = {
    slip_id: string | undefined;
};

export type FetchPostPicksPayload = {
    page?: number;
    limit?: number;
};

export type FetchPostPicksByUserIdPayload = {
    user_id: string;
    page?: number;
    limit?: number;
};

export type DeletePostPickPayload = {
    pick_id: string;
};

export type CreateSlipPayload = Record<string, unknown>;

export type FetchSlipsPayload = {
    group_id: string;
};

export type FetchPickOfDayByUserIdPayload = {
    userId: string;
};

export type ReactionPickOfDayPayload = {
    pick_id: string;
    action: string;
};

export type UpdateSlipPayload = {
    group_id: string;
    pick_deadline_at?: string;
    status?: string;
    slip_id: string;
    windowDays?: number;
    name?: string;
};

export interface SlipState {
    error: string | null;
    slip: Slip | null;
    message: string | null;
    loading: boolean;
}

export interface SlipSelector {
    slip: SlipState;
}

export interface PickState {
    error: string | null;
    pick: Pick | null;
    message: string | null;
    loading: boolean;
}

export interface PickSelector {
    pick: PickState;
}

export type MarkLockPayload = Record<string, unknown>;

export type MarkUnlockPayload = Record<string, unknown>;

export type MarkGradedPayload = Record<string, unknown>;

export type MarkFinalizePayload = Record<string, unknown>;

export type MarkVoidedPayload = Record<string, unknown>;

export type StartNewContestPayload = Record<string, unknown>;

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

export interface TokenData {
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
};

export type Feeds = Feed[];

export interface FetchActivityPayload {
    group_id: string;
    start?: number;
    limit?: number;
}

export interface FetchProgressByUserIdPayload {
    user_id: string;
}

export interface ActivityState {
    error: string | null;
    feed: FeedResponse | null;
    message: string | null;
    loading: boolean;
}

export interface FeedSelector {
    feed: ActivityState;
}

export interface Pagination {
    start?: number;
    limit?: number;
    count?: number;
    page?: number;
}

export interface FeedResponse {
    activities: Feed[];
    pagination: Pagination;
}

export interface leaderboardSlip {
    odds_bracket: string;
    pick_description: string;
    pick_difficulty_tier: TierIndex | null;
    pick_difficulty_label: DifficultyLabel | null;
    pick_result: PickResult;
    slip_id: string;
    slip_points: number;
    bonus_points: number;
    selection?: PickSelectionMeta;
    pick_source_tab?: string;
    is_combo?: boolean;
    pick_leg?: PickLeg[]
}

export interface Leaderboard {
    group_id: string;
    slip_id: string;
    user_id: string;
    slip_points: number;
    cumulative_points: number;
    win: number;
    loss: number;
    username?: string;
    profile_image?: string;
    slips?: leaderboardSlip[];
}

export type LeaderboardPayload = {
    groupId: string | undefined;
    leaderboard_id?: string;
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
    slip: unknown;
    error: string | null;
    message: string | null;
    loading: boolean;
}

export type PickSliceState = {
    pick: unknown;
    pickOfDay: BuiltPickPayload;
    vibePicks: Picks | null;
    postPicks: Picks | null;
    error: string | null;
    message: string | null;
    deleteMessage: string | null;
    loading: boolean;
}

export type RootState = {
    group: GroupSliceState;
    slip: SlipSliceState;
    pick: PickSliceState;
    user: AuthSliceState;
    nfl: NFLState;
    nba: NBAState;
    progress: ProgressState;
};

export type UpdateGroupPayload = {
    name: string;
    description: string;
    group_id: string;
};

export type InitialPasswordOTPPayload = {
    email: string;
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
    loading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage: string | null;
    initialForgotPasswordMessage: string | null;
    initialForgotPasswordError: string | null;
    verifyForgotPasswordMessage: string | null;
    verifyForgotPasswordError: string | null;
    refreshTokenData: string | null;
    resetPasswordMessage: string | null;
    resetPasswordError: string | null;
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

export type FetchLiveNFLOddsPayload = {
    match_id: string;
    is_live: boolean;
};

export type FetchNBAOddsPayload = {
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

export type LeagueObject = {
    id: string;
    name: string;
    sport: string;
}

export type SportsBookObject = {
    id: string;
    name: string;
}

export type NFLSchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
}

export type NBASchedules = {
    id: string;
    teams: TeamsObject,
    date: string;
    live: boolean;
    odds: OddsObject[];
    updated?: string;
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
    sgp: string;
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
    sportsBook: SportsBookObject;
    events: OddsData[];
}

export type NBAOdds = {
    updated: string;
    league: LeagueObject;
    sportsBook: SportsBookObject;
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
    nflSchedules: {
        updated: string;
        league: LeagueObject;
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

export type ProgressState = {
    loading: boolean,
    error: string | null,
    message: string | null,
    progress: Progress | null,
}

export type NBAState = {
    nbaSchedules: {
        updated: string;
        league: LeagueObject;
        events: NBASchedules[];
    } | null,
    nbaOdds: NBAOdds | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    validateLoading: boolean;
    validatePickMessage: string | null;
    validatePickError: string | null;
};

export type PickSelectionMeta = {
    scope?: string;
    market?: string;
    gameId?: string;
    gameStartTime?: string;
    teamId?: string;
    playerId?: string;
    side?: string;
    threshold?: number;
    home_team?: string;
    away_team?: string;
    matchup?: string;
    match_date?: string;
    external_pick_key?: string;
};

export type PickLeg = {
    description: string;
    odds_bracket: string;
    difficulty_label?: DifficultyLabel | null;
    difficulty_tier?: number;
    external_pick_key?: string;
    selection?: PickSelectionMeta;
    points?: number;
    result?: string;
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
    sgp: string;
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
    playerId?: string;
    line?: number;
    side?: "Over" | "Under";
    marketKey: string;
    familyKey: string;
    teamKey?: string;
    periodKey:
    | "1st Half"
    | "2nd Half"
    | "1st Quarter"
    | "2nd Quarter"
    | "3rd Quarter"
    | "4th Quarter"
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