export type GlobalPointsContext = { type: "global" };
export type LeaguePointsContext = { type: "league"; leagueId: string };
export type ArenaPointsContext = { type: "arena"; arenaId: string };

export type PointContext =
    | GlobalPointsContext
    | LeaguePointsContext
    | ArenaPointsContext;

export type OddsBasedAwardSourceType =
    | "global_post"
    | "league_community_pick"
    | "league_feed_contest_entry"
    | "arena_community_pick"
    | "arena_contest_entry"
    | "arena_pickem_selection";

export interface OddsBasedAwardSource {
    type: OddsBasedAwardSourceType;
    recordId: string;
    contestId: string | null;
    selectionSnapshotIds: string[];
}

export type ContextPointKind = "global_xp" | "league_points" | "arena_points";
export type ContextPointStatus = "pending" | "confirmed" | "reversed";

interface ContextualPointAwardBase {
    id: string;
    awardBatchId: string;
    userId: string;
    source: OddsBasedAwardSource;
    acceptedAmericanOdds: number;
    calculatedAmount: number;
    appliedAmount: number;
    status: ContextPointStatus;
    createdAt: string;
    confirmedAt: string | null;
}

export interface GlobalXpAward extends ContextualPointAwardBase {
    kind: "global_xp";
    context: GlobalPointsContext;
    accountTimeZone: string;
    accountDayKey: string;
    dailyCapRemainingBeforeAward: number;
    dailyCapRemainingAfterAward: number;
    pointsNotAwardedDueToCap: number;
}

export interface LeaguePointAward extends ContextualPointAwardBase {
    kind: "league_points";
    context: LeaguePointsContext;
}

export interface ArenaPointAward extends ContextualPointAwardBase {
    kind: "arena_points";
    context: ArenaPointsContext;
}

export type ContextPointAward = GlobalXpAward | LeaguePointAward | ArenaPointAward;

export type OddsBasedSettlementResult =
    | "win"
    | "loss"
    | "void"
    | "pending"
    | "postponed"
    | "canceled"
    | "review_required";

export interface OddsBasedAwardBatch {
    id: string;
    userId: string;
    source: OddsBasedAwardSource;
    sourceContext: PointContext;
    settlementResult: OddsBasedSettlementResult;
    acceptedAmericanOdds: number;
    calculatedAmount: number;
    createdAt: string;
    awards: ContextPointAward[];
}

export interface PointsPeriod {
    /** Inclusive instant. Null means unbounded. */
    startsAt: string | null;
    /** Exclusive instant. Null means unbounded. */
    endsAt: string | null;
}

export interface GlobalProfilePointsSummary {
    userId: string;
    lifetimeXp: number;
    level: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpRemaining: number;
}

export interface ArenaPointsLeaderboardRow {
    rank: number;
    userId: string;
    points: number;
    awardCount: number;
    highestSuccessfulAmericanOdds: number | null;
    totalReachedAt: string | null;
}

export interface SlipContestPointRecord {
    id: string;
    leagueId: string;
    contestId: string;
    slipId: string;
    userId: string;
    result: "pending" | "win" | "loss" | "void" | "not_found";
    baseWinPoints: number;
    awardedPoints?: number | null;
    settledAt: string;
}
