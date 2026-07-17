/**
 * Production-shaped local domain records for structured Feed and Arena behavior.
 *
 * These records intentionally do not extend the legacy League/Slip types. League
 * deletion remains the only League lifecycle operation; this module does not add
 * a League archive or restore state.
 */

export type IsoDateTime = string;
export type IanaTimeZone = string;

export type CommunityContext =
    | { type: "arena"; arenaId: string }
    | { type: "league_feed"; leagueId: string };

export type ArenaLifecycleStatus = "active" | "deleted";

export interface ArenaIdentity {
    id: string;
    ownerUserId: string;
    name: string;
    description: string;
    inviteCode: string | null;
    /** All Arena-local times and periods use this stored IANA timezone. */
    timeZone: IanaTimeZone;
    externalCommunityUrl: string | null;
    lifecycleStatus: ArenaLifecycleStatus;
    createdAt: IsoDateTime;
    updatedAt: IsoDateTime;
    deletedAt: IsoDateTime | null;
}

export type ArenaRole = "owner" | "manager" | "member";
export type ArenaMembershipStatus =
    | "invited"
    | "active"
    | "archived"
    | "removed"
    | "rejected";

export interface ArenaMembership {
    id: string;
    arenaId: string;
    userId: string;
    role: ArenaRole;
    status: ArenaMembershipStatus;
    joinedAt: IsoDateTime | null;
    archivedAt: IsoDateTime | null;
    removedAt: IsoDateTime | null;
    updatedAt: IsoDateTime;
}

export type ArenaOwnershipTransferStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "canceled"
    | "expired";

export interface ArenaOwnershipTransfer {
    id: string;
    arenaId: string;
    fromOwnerUserId: string;
    toUserId: string;
    status: ArenaOwnershipTransferStatus;
    requestedAt: IsoDateTime;
    expiresAt: IsoDateTime | null;
    respondedAt: IsoDateTime | null;
    acceptedAt: IsoDateTime | null;
    canceledAt: IsoDateTime | null;
    /** Captures role-conflict checks without coupling ownership to personal Pro. */
    blockingContestIds: string[];
}

export type ArenaUnlockStatus = "locked" | "unlocked";
export type ArenaUnlockSource = "simulated_purchase" | "legacy_grandfathered";

export interface ArenaUnlock {
    arenaId: string;
    status: ArenaUnlockStatus;
    permanent: boolean;
    source: ArenaUnlockSource | null;
    purchasedByUserId: string | null;
    unlockedAt: IsoDateTime | null;
    simulatedPaymentReference: string | null;
    /** Once true, pausing, transfer, and reactivation cannot grant it again. */
    includedMonthConsumed: boolean;
    includedMonthConsumedAt: IsoDateTime | null;
}

export type ArenaHostingTier = "arena_50" | "arena_100" | "arena_250_plus" | "custom";
export type ArenaHostingStatus =
    | "not_started"
    | "included_month"
    | "active"
    | "past_due"
    | "pause_scheduled"
    | "cleanup"
    | "paused";

export interface ArenaHostingLimits {
    participatingMemberLimit: number | null;
    managerLimit: number | null;
    activeContestLimit: number | null;
}

export interface ArenaHosting {
    arenaId: string;
    tier: ArenaHostingTier | null;
    status: ArenaHostingStatus;
    limits: ArenaHostingLimits;
    billingMode: "simulated";
    periodStartsAt: IsoDateTime | null;
    periodEndsAt: IsoDateTime | null;
    paidThroughAt: IsoDateTime | null;
    includedMonthStartsAt: IsoDateTime | null;
    includedMonthEndsAt: IsoDateTime | null;
    includedMonthConsumed: boolean;
    pauseScheduledFor: IsoDateTime | null;
    cleanupStartedAt: IsoDateTime | null;
    pausedAt: IsoDateTime | null;
    updatedAt: IsoDateTime;
}

export type ContestLifecycleStatus =
    | "draft"
    | "scheduled"
    | "open"
    | "locked"
    | "grading"
    | "final"
    | "canceled"
    | "archived";

export type StructuredContestTemplate =
    | "single_pick"
    | "same_game_combo_challenge"
    | "sunday_pickem"
    | "custom";

export type StructuredContestEntryModel = "single_pick" | "same_game_combo" | "pickem_card";

export interface ContestRewardDetails {
    title: string | null;
    description: string | null;
    approximateValue: string | null;
    claimInstructions: string | null;
    claimDeadline: IsoDateTime | null;
    organizerRulesUrl: string | null;
    eligibilityRestrictions: string | null;
    ageRestrictions: string | null;
    organizerAcknowledgedNoPurchaseRequired: boolean;
    organizerAcknowledgedIndependentFulfillment: boolean;
    organizerAcknowledgedStaffIneligible: boolean;
}

export interface StructuredFeedContest {
    id: string;
    context: CommunityContext;
    name: string;
    description: string;
    template: StructuredContestTemplate;
    entryModel: StructuredContestEntryModel;
    lifecycleStatus: ContestLifecycleStatus;
    sport: string;
    seasonId: string | null;
    /** Snapshot used for this contest; later Arena timezone edits are prospective. */
    timeZone: IanaTimeZone;
    opensAt: IsoDateTime | null;
    locksAt: IsoDateTime;
    expectedEndsAt: IsoDateTime | null;
    winningPlaces: number;
    eligibleGameIds: string[];
    rulesVersion: string;
    rulesText: string;
    reward: ContestRewardDetails | null;
    createdByUserId: string;
    createdAt: IsoDateTime;
    updatedAt: IsoDateTime;
    finalizedAt: IsoDateTime | null;
    canceledAt: IsoDateTime | null;
    archivedAt: IsoDateTime | null;
}

export type ContestParticipantStatus =
    | "eligible"
    | "opted_in"
    | "entered"
    | "locked"
    | "completed"
    | "missed_deadline"
    | "withdrawn"
    | "disqualified";

export interface ContestParticipant {
    id: string;
    contestId: string;
    userId: string;
    status: ContestParticipantStatus;
    rulesVersionAccepted: string | null;
    optedInAt: IsoDateTime | null;
    entryId: string | null;
    enteredAt: IsoDateTime | null;
    lockedAt: IsoDateTime | null;
    completedAt: IsoDateTime | null;
    withdrawnAt: IsoDateTime | null;
    disqualifiedAt: IsoDateTime | null;
    disqualificationReason: string | null;
    updatedAt: IsoDateTime;
}

export type SelectionGrade =
    | "pending"
    | "win"
    | "loss"
    | "void"
    | "postponed"
    | "canceled"
    | "review_required";

export interface AcceptedPricingSnapshot {
    americanOdds: number;
    decimalOdds: number;
    potentialOddsBasedPoints: number;
    quotedAt: IsoDateTime;
    acceptedAt: IsoDateTime;
    receiptSequence: number;
    providerReference: string | null;
}

export interface SelectionSnapshot {
    id: string;
    sport: string;
    gameId: string;
    marketId: string;
    selectionId: string;
    marketName: string;
    selectionName: string;
    side: string;
    line: number | null;
    teamId: string | null;
    playerId: string | null;
    gameStartsAt: IsoDateTime;
    /** Canonical stable identity used for same-context duplicate-point prevention. */
    duplicateIdentityKey: string;
    /** Null only for visibly incomplete legacy data; accepted submissions require pricing. */
    pricing: AcceptedPricingSnapshot | null;
}

export type PickVersionKind = "community_pick" | "competitive_pick" | "pickem_card";
export type PickVersionReason = "initial_submission" | "replacement";

export interface PickVersion {
    id: string;
    pickId: string;
    kind: PickVersionKind;
    versionNumber: number;
    reason: PickVersionReason;
    /** References canonical records in CommunityDomainState.selectionSnapshots. */
    selectionSnapshotIds: string[];
    /** Combo-wide quote; null for singles and Pick'em cards. */
    aggregatePricing: AcceptedPricingSnapshot | null;
    selectionSummary: string;
    acceptedAt: IsoDateTime;
    receiptSequence: number;
    supersedesVersionId: string | null;
    supersededAt: IsoDateTime | null;
    immutable: true;
}

export type StructuredPickStatus =
    | "draft"
    | "submitted"
    | "locked"
    | "grading"
    | "review_required"
    | "final"
    | "withdrawn"
    | "disqualified"
    | "deleted";

export interface CommunityPick {
    id: string;
    context: CommunityContext;
    userId: string;
    status: StructuredPickStatus;
    currentVersionId: string;
    versionIds: string[];
    result: SelectionGrade;
    feedPostId: string | null;
    communityPointClaimIds: string[];
    submittedAt: IsoDateTime;
    /** Deletion never changes this timestamp or restores a rolling-limit slot. */
    postingWindowStartedAt: IsoDateTime;
    gradedAt: IsoDateTime | null;
    finalizedAt: IsoDateTime | null;
    deletedAt: IsoDateTime | null;
}

export type CompetitiveEntryType = "single_pick" | "same_game_combo" | "pickem_card";
export type CompetitivePickVisibilityPolicy = "hidden_until_lock";

export interface CompetitivePick {
    id: string;
    context: CommunityContext;
    contestId: string;
    participantId: string;
    userId: string;
    entryType: CompetitiveEntryType;
    status: StructuredPickStatus;
    currentVersionId: string;
    versionIds: string[];
    result: SelectionGrade;
    feedPostId: string | null;
    communityPointClaimIds: string[];
    visibilityPolicy: CompetitivePickVisibilityPolicy;
    submittedAt: IsoDateTime;
    lockedAt: IsoDateTime | null;
    gradedAt: IsoDateTime | null;
    finalizedAt: IsoDateTime | null;
    withdrawnAt: IsoDateTime | null;
    disqualifiedAt: IsoDateTime | null;
}

export type PickemSelectionResult =
    | "pending"
    | "correct"
    | "incorrect"
    | "void"
    | "postponed"
    | "canceled"
    | "review_required";

export interface PickemSelection {
    id: string;
    gameId: string;
    selectedTeamId: string;
    selectionSnapshotId: string;
    result: PickemSelectionResult;
    arenaPointsEarned: number;
    gradedAt: IsoDateTime | null;
}

export interface PickemCard {
    id: string;
    arenaId: string;
    contestId: string;
    participantId: string;
    userId: string;
    status: StructuredPickStatus;
    includedGameIds: string[];
    selections: PickemSelection[];
    currentVersionId: string;
    versionIds: string[];
    submittedAt: IsoDateTime | null;
    lockedAt: IsoDateTime | null;
    correctCount: number;
    incorrectCount: number;
    voidCount: number;
    pendingCount: number;
    totalArenaPoints: number;
    finalizedAt: IsoDateTime | null;
}

export type CommunityPointSource =
    | "arena_community_single"
    | "arena_community_combo"
    | "arena_competitive_single"
    | "arena_competitive_combo"
    | "arena_pickem_selection"
    | "league_community_single"
    | "league_community_combo"
    | "league_feed_entry";

export type CommunityPointClaimStatus =
    | "pending"
    | "accepted"
    | "duplicate"
    | "ineligible"
    | "reversed";

export interface CommunityPointClaim {
    id: string;
    userId: string;
    context: CommunityContext;
    sourceType: CommunityPointSource;
    sourceRecordId: string;
    contestId: string | null;
    selectionSnapshotIds: string[];
    selectionIdentityKeys: string[];
    /** Exact accepted price; null legacy audit data is never award-eligible. */
    submittedAmericanOdds: number | null;
    /** user + context + settled selection set; this is the award uniqueness boundary. */
    dedupeKey: string;
    requestedPoints: number;
    status: CommunityPointClaimStatus;
    duplicateOfClaimId: string | null;
    ledgerEntryId: string | null;
    reason: string | null;
    createdAt: IsoDateTime;
    resolvedAt: IsoDateTime | null;
}

export type CommunityPointLedgerStatus = "pending" | "final" | "reversed";
export type CommunityPointLedgerEntryKind = "award" | "reversal";

export interface CommunityPointLedgerEntry {
    id: string;
    userId: string;
    context: CommunityContext;
    claimId: string;
    sourceType: CommunityPointSource;
    sourceRecordId: string;
    contestId: string | null;
    selectionSnapshotIds: string[];
    /** Exact accepted price; null marks legacy audit data with no invented quote. */
    submittedAmericanOdds: number | null;
    entryKind: CommunityPointLedgerEntryKind;
    /** Signed delta: awards are positive and reversal records are negative. */
    pointsDelta: number;
    status: CommunityPointLedgerStatus;
    createdAt: IsoDateTime;
    finalizedAt: IsoDateTime | null;
    reversedAt: IsoDateTime | null;
    reversesLedgerEntryId: string | null;
    reversalReason: string | null;
}

export interface ArenaTotal {
    arenaId: string;
    userId: string;
    finalizedArenaPoints: number;
    pendingArenaPoints: number;
    successfulSettledSelections: number;
    source: "community_point_ledger_projection";
    computedAt: IsoDateTime;
}

export type CommunityLeaderboardPeriodKind =
    | "current_week"
    | "current_month"
    | "last_30_days"
    | "current_nfl_season"
    | "lifetime";

export interface CommunityLeaderboardPeriod {
    kind: CommunityLeaderboardPeriodKind;
    timeZone: IanaTimeZone;
    startsAt: IsoDateTime | null;
    endsAt: IsoDateTime | null;
    seasonId: string | null;
}

export interface CommunityLeaderboardRow {
    rank: number;
    arenaId: string;
    userId: string;
    arenaPoints: number;
    successfulSettledSelections: number;
    settledSelections: number;
    accuracy: number | null;
    highestSuccessfulAmericanOdds: number | null;
    contestAchievementCount: number;
    totalReachedAt: IsoDateTime | null;
    recentArenaPointsEarned: number;
}

export interface CommunityLeaderboard {
    arenaId: string;
    period: CommunityLeaderboardPeriod;
    rows: CommunityLeaderboardRow[];
    generatedAt: IsoDateTime;
    source: "community_point_ledger_projection";
}

export type ContestAchievementType = "champion" | "runner_up" | "podium_finish" | "top_five";

export interface ContestAchievement {
    id: string;
    context: CommunityContext;
    contestId: string;
    userId: string;
    placement: number;
    type: ContestAchievementType;
    contestTemplate: StructuredContestTemplate;
    contestName: string;
    finalScore: number;
    awardedAt: IsoDateTime;
    seasonId: string | null;
    periodLabel: string | null;
    winningEntrySummary: string;
}

export interface CommunityDomainState {
    schemaVersion: 1;
    arenas: ArenaIdentity[];
    arenaMemberships: ArenaMembership[];
    arenaOwnershipTransfers: ArenaOwnershipTransfer[];
    arenaUnlocks: ArenaUnlock[];
    arenaHostings: ArenaHosting[];
    structuredFeedContests: StructuredFeedContest[];
    contestParticipants: ContestParticipant[];
    selectionSnapshots: SelectionSnapshot[];
    pickVersions: PickVersion[];
    communityPicks: CommunityPick[];
    competitivePicks: CompetitivePick[];
    pickemCards: PickemCard[];
    communityPointClaims: CommunityPointClaim[];
    communityPointLedger: CommunityPointLedgerEntry[];
    arenaTotals: ArenaTotal[];
    communityLeaderboards: CommunityLeaderboard[];
    contestAchievements: ContestAchievement[];
}
