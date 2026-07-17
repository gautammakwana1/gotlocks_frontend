import { calculateSlipPoints } from "@/lib/scoring/slipPoints";
import { getLevelProgress } from "@/lib/utils/progression";
import type {
    ArenaPointsLeaderboardRow,
    ContextPointAward,
    GlobalProfilePointsSummary,
    PointsPeriod,
    SlipContestPointRecord,
} from "./types";

function timestamp(value: string, label: string): number {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid timestamp.`);
    return parsed;
}

function isInPeriod(value: string, period?: PointsPeriod): boolean {
    if (!period) return true;
    const valueTimestamp = timestamp(value, "Point timestamp");
    const startsAt = period.startsAt === null ? null : timestamp(period.startsAt, "Period start");
    const endsAt = period.endsAt === null ? null : timestamp(period.endsAt, "Period end");
    if (startsAt !== null && endsAt !== null && startsAt >= endsAt) {
        throw new Error("Point period start must be earlier than its end.");
    }
    return (
        (startsAt === null || valueTimestamp >= startsAt) &&
        (endsAt === null || valueTimestamp < endsAt)
    );
}

function confirmedAwards(awards: readonly ContextPointAward[]): ContextPointAward[] {
    const uniqueById = new Map<string, ContextPointAward>();
    awards.forEach((award) => {
        if (award.status === "confirmed" && award.confirmedAt) uniqueById.set(award.id, award);
    });
    return [...uniqueById.values()];
}

export function selectGlobalLifetimeXp(
    awards: readonly ContextPointAward[],
    userId: string,
): number {
    return confirmedAwards(awards)
        .filter((award) => award.kind === "global_xp" && award.userId === userId)
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectGlobalAccountDayXp(
    awards: readonly ContextPointAward[],
    input: { userId: string; accountDayKey: string },
): number {
    return confirmedAwards(awards)
        .filter(
            (award) =>
                award.kind === "global_xp" &&
                award.userId === input.userId &&
                award.accountDayKey === input.accountDayKey,
        )
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectGlobalXpForUser(
    awards: readonly ContextPointAward[],
    userId: string,
): number {
    return selectGlobalLifetimeXp(awards, userId);
}

export function selectGlobalXpEarnedOnAccountDay(
    awards: readonly ContextPointAward[],
    input: { userId: string; accountDayKey: string },
): number {
    return selectGlobalAccountDayXp(awards, input);
}

export function selectGlobalProfileProgress(
    awards: readonly ContextPointAward[],
    input: { userId: string; baseLifetimeXp?: number },
): GlobalProfilePointsSummary {
    const baseLifetimeXp = input.baseLifetimeXp ?? 0;
    if (!Number.isFinite(baseLifetimeXp) || baseLifetimeXp < 0) {
        throw new Error("Base lifetime XP must be a finite non-negative number.");
    }
    const lifetimeXp = baseLifetimeXp + selectGlobalLifetimeXp(awards, input.userId);
    return {
        userId: input.userId,
        lifetimeXp,
        ...getLevelProgress(lifetimeXp),
    };
}

export function selectProfileLevelForUser(
    awards: readonly ContextPointAward[],
    input: { userId: string; baseLifetimeXp?: number },
): number {
    return selectGlobalProfileProgress(awards, input).level;
}

export function selectLeaguePointsForMemberPeriod(
    awards: readonly ContextPointAward[],
    input: { leagueId: string; userId: string; period?: PointsPeriod },
): number {
    return confirmedAwards(awards)
        .filter(
            (award) =>
                award.kind === "league_points" &&
                award.context.leagueId === input.leagueId &&
                award.userId === input.userId &&
                isInPeriod(award.confirmedAt as string, input.period),
        )
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectLeaguePointsForMember(
    awards: readonly ContextPointAward[],
    input: { leagueId: string; userId: string },
): number {
    return selectLeaguePointsForMemberPeriod(awards, input);
}

export function selectLeaguePointsForPeriod(
    awards: readonly ContextPointAward[],
    input: { leagueId: string; period: PointsPeriod; userId?: string },
): number {
    return confirmedAwards(awards)
        .filter(
            (award) =>
                award.kind === "league_points" &&
                award.context.leagueId === input.leagueId &&
                (input.userId === undefined || award.userId === input.userId) &&
                isInPeriod(award.confirmedAt as string, input.period),
        )
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectArenaPointsForMemberPeriod(
    awards: readonly ContextPointAward[],
    input: { arenaId: string; userId: string; period?: PointsPeriod },
): number {
    return confirmedAwards(awards)
        .filter(
            (award) =>
                award.kind === "arena_points" &&
                award.context.arenaId === input.arenaId &&
                award.userId === input.userId &&
                isInPeriod(award.confirmedAt as string, input.period),
        )
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectArenaPointsForMember(
    awards: readonly ContextPointAward[],
    input: { arenaId: string; userId: string },
): number {
    return selectArenaPointsForMemberPeriod(awards, input);
}

export function selectArenaPointsForPeriod(
    awards: readonly ContextPointAward[],
    input: { arenaId: string; period: PointsPeriod; userId?: string },
): number {
    return confirmedAwards(awards)
        .filter(
            (award) =>
                award.kind === "arena_points" &&
                award.context.arenaId === input.arenaId &&
                (input.userId === undefined || award.userId === input.userId) &&
                isInPeriod(award.confirmedAt as string, input.period),
        )
        .reduce((total, award) => total + award.appliedAmount, 0);
}

export function selectArenaPointsLeaderboard(
    awards: readonly ContextPointAward[],
    input: {
        arenaId: string;
        eligibleMemberIds: readonly string[];
        period?: PointsPeriod;
    },
): ArenaPointsLeaderboardRow[] {
    const memberIds = [...new Set(input.eligibleMemberIds)];
    const memberIdSet = new Set(memberIds);
    const eligibleAwards = confirmedAwards(awards).filter(
        (award) =>
            award.kind === "arena_points" &&
            award.context.arenaId === input.arenaId &&
            memberIdSet.has(award.userId) &&
            isInPeriod(award.confirmedAt as string, input.period),
    );
    const rows = memberIds.map((userId) => {
        const userAwards = eligibleAwards.filter((award) => award.userId === userId);
        const totalReachedAt = userAwards.length
            ? userAwards.reduce((latest, award) =>
                timestamp(award.confirmedAt as string, "Confirmation timestamp") > timestamp(latest, "Confirmation timestamp")
                    ? (award.confirmedAt as string)
                    : latest,
                userAwards[0].confirmedAt as string)
            : null;
        return {
            rank: 0,
            userId,
            points: userAwards.reduce((total, award) => total + award.appliedAmount, 0),
            awardCount: userAwards.length,
            highestSuccessfulAmericanOdds: userAwards.length
                ? Math.max(...userAwards.map((award) => award.acceptedAmericanOdds))
                : null,
            totalReachedAt,
        };
    });

    return rows
        .sort((left, right) => {
            if (left.points !== right.points) return right.points - left.points;
            if (left.awardCount !== right.awardCount) return right.awardCount - left.awardCount;
            if (left.highestSuccessfulAmericanOdds !== right.highestSuccessfulAmericanOdds) {
                return (
                    (right.highestSuccessfulAmericanOdds ?? Number.NEGATIVE_INFINITY) -
                    (left.highestSuccessfulAmericanOdds ?? Number.NEGATIVE_INFINITY)
                );
            }
            const leftReached = left.totalReachedAt
                ? timestamp(left.totalReachedAt, "Total reached timestamp")
                : Number.POSITIVE_INFINITY;
            const rightReached = right.totalReachedAt
                ? timestamp(right.totalReachedAt, "Total reached timestamp")
                : Number.POSITIVE_INFINITY;
            if (leftReached !== rightReached) return leftReached - rightReached;
            return left.userId.localeCompare(right.userId);
        })
        .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function selectArenaCommunityLeaderboard(
    awards: readonly ContextPointAward[],
    input: {
        arenaId: string;
        eligibleMemberIds: readonly string[];
        period?: PointsPeriod;
    },
): ArenaPointsLeaderboardRow[] {
    return selectArenaPointsLeaderboard(awards, input);
}

export function selectSlipContestPoints(
    records: readonly SlipContestPointRecord[],
    input: {
        leagueId: string;
        contestId: string;
        userId?: string;
        slipId?: string;
        period?: PointsPeriod;
    },
): number {
    const uniqueRecords = new Map(records.map((record) => [record.id, record]));
    return [...uniqueRecords.values()]
        .filter(
            (record) =>
                record.leagueId === input.leagueId &&
                record.contestId === input.contestId &&
                (input.userId === undefined || record.userId === input.userId) &&
                (input.slipId === undefined || record.slipId === input.slipId) &&
                isInPeriod(record.settledAt, input.period),
        )
        .reduce(
            (total, record) =>
                total +
                calculateSlipPoints({
                    result: record.result,
                    baseWinPoints: record.baseWinPoints,
                    awardedPoints: record.awardedPoints,
                }),
            0,
        );
}

export function selectSlipPointsForContest(
    records: readonly SlipContestPointRecord[],
    input: {
        leagueId: string;
        contestId: string;
        userId?: string;
        slipId?: string;
        period?: PointsPeriod;
    },
): number {
    return selectSlipContestPoints(records, input);
}
