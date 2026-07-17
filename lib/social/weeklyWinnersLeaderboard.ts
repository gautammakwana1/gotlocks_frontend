import { getBasePointsForPick, parseAmericanOdds } from "@/lib/utils/scoring";
import { Pick, PickType, User } from "../interfaces/interfaces";

export type WeeklyWinnersRange = "this-week" | "last-week";

export type WeeklyWinnersWeekBounds = {
    range: WeeklyWinnersRange;
    start: Date;
    end: Date;
};

export type WeeklyWinnerPostRow = {
    rank: number;
    pick: Pick;
    user: User;
    actualXp: number;
    rawXp: number;
    americanOdds: number | null;
    settledAt: string;
};

export type WeeklyWinnerUserRow = {
    rank: number;
    user: User;
    actualXp: number;
    rawXp: number;
    winCount: number;
    biggestWinRawXp: number;
    latestWinAt: string;
    biggestWin: WeeklyWinnerPostRow;
};

export type WeeklyWinnersLeaderboard = {
    week: WeeklyWinnersWeekBounds;
    userRows: WeeklyWinnerUserRow[];
    postRows: WeeklyWinnerPostRow[];
};

type BuildWeeklyWinnersLeaderboardOptions = {
    picks: Pick[];
    users: User[];
    range?: WeeklyWinnersRange;
    referenceDate?: Date;
    userFilter?: (user: User) => boolean;
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const toFiniteTimestamp = (iso: string | undefined | null) => {
    if (!iso) return null;
    const timestamp = new Date(iso).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const getPickSettledTimestamp = (pick: Pick) =>
    toFiniteTimestamp(pick.updated_at) ??
    toFiniteTimestamp(pick.created_at);

const getActualXpForPick = (pick: Pick, rawXp: number) => {
    if (typeof pick.xp_awarded === "number" && Number.isFinite(pick.xp_awarded)) {
        return Math.max(0, pick.xp_awarded);
    }
    return rawXp;
};

const compareNullableOddsDesc = (left: number | null, right: number | null) => {
    const leftValue = left ?? Number.NEGATIVE_INFINITY;
    const rightValue = right ?? Number.NEGATIVE_INFINITY;
    return rightValue - leftValue;
};

const compareStringAsc = (left: string, right: string) =>
    left.localeCompare(right, undefined, { sensitivity: "base" });

export const getWeeklyWinnersWeekBounds = (
    range: WeeklyWinnersRange = "this-week",
    referenceDate = new Date()
): WeeklyWinnersWeekBounds => {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);

    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);

    if (range === "last-week") {
        start.setTime(start.getTime() - MS_PER_WEEK);
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return { range, start, end };
};

export const buildWeeklyWinnersLeaderboard = ({
    picks,
    users,
    range = "this-week",
    referenceDate = new Date(),
    userFilter,
}: BuildWeeklyWinnersLeaderboardOptions): WeeklyWinnersLeaderboard => {
    const week = getWeeklyWinnersWeekBounds(range, referenceDate);
    const userById = new Map(users.map((user) => [user.id, user]));

    const postRows = picks
        .map((pick) => {
            const user = userById.get(pick.user_id);
            if (!user?.is_public || (userFilter && !userFilter(user))) {
                return null;
            }
            if (pick.pick_type !== PickType.POST || pick.result !== "win") {
                return null;
            }

            const settledTimestamp = getPickSettledTimestamp(pick);
            if (
                settledTimestamp === null ||
                settledTimestamp < week.start.getTime() ||
                settledTimestamp >= week.end.getTime()
            ) {
                return null;
            }

            const rawXp = Math.max(0, getBasePointsForPick(pick));
            const actualXp = getActualXpForPick(pick, rawXp);

            return {
                rank: 0,
                pick,
                user,
                actualXp,
                rawXp,
                americanOdds: parseAmericanOdds(pick.odds_bracket),
                settledAt: new Date(settledTimestamp).toISOString(),
            } satisfies WeeklyWinnerPostRow;
        })
        .filter((row): row is WeeklyWinnerPostRow => Boolean(row))
        .sort((left, right) => {
            const rawDiff = right.rawXp - left.rawXp;
            if (rawDiff !== 0) return rawDiff;

            const oddsDiff = compareNullableOddsDesc(left.americanOdds, right.americanOdds);
            if (oddsDiff !== 0) return oddsDiff;

            const settledDiff =
                new Date(right.settledAt).getTime() - new Date(left.settledAt).getTime();
            if (settledDiff !== 0) return settledDiff;

            return compareStringAsc(left.pick.id, right.pick.id);
        })
        .map((row, index) => ({ ...row, rank: index + 1 }));

    const userRowsById = new Map<string, Omit<WeeklyWinnerUserRow, "rank">>();

    postRows.forEach((postRow) => {
        const existing = userRowsById.get(postRow.user.id);
        if (!existing) {
            userRowsById.set(postRow.user.id, {
                user: postRow.user,
                actualXp: postRow.actualXp,
                rawXp: postRow.rawXp,
                winCount: 1,
                biggestWinRawXp: postRow.rawXp,
                latestWinAt: postRow.settledAt,
                biggestWin: postRow,
            });
            return;
        }

        const latestWinAt =
            new Date(postRow.settledAt).getTime() > new Date(existing.latestWinAt).getTime()
                ? postRow.settledAt
                : existing.latestWinAt;
        const isBiggerWin =
            postRow.rawXp > existing.biggestWin.rawXp ||
            (postRow.rawXp === existing.biggestWin.rawXp &&
                compareNullableOddsDesc(postRow.americanOdds, existing.biggestWin.americanOdds) < 0) ||
            (postRow.rawXp === existing.biggestWin.rawXp &&
                postRow.americanOdds === existing.biggestWin.americanOdds &&
                new Date(postRow.settledAt).getTime() >
                new Date(existing.biggestWin.settledAt).getTime());

        userRowsById.set(postRow.user.id, {
            ...existing,
            actualXp: existing.actualXp + postRow.actualXp,
            rawXp: existing.rawXp + postRow.rawXp,
            winCount: existing.winCount + 1,
            biggestWinRawXp: Math.max(existing.biggestWinRawXp, postRow.rawXp),
            latestWinAt,
            biggestWin: isBiggerWin ? postRow : existing.biggestWin,
        });
    });

    const userRows = Array.from(userRowsById.values())
        .sort((left, right) => {
            const actualDiff = right.actualXp - left.actualXp;
            if (actualDiff !== 0) return actualDiff;

            const rawDiff = right.rawXp - left.rawXp;
            if (rawDiff !== 0) return rawDiff;

            const winDiff = right.winCount - left.winCount;
            if (winDiff !== 0) return winDiff;

            const biggestDiff = right.biggestWinRawXp - left.biggestWinRawXp;
            if (biggestDiff !== 0) return biggestDiff;

            const latestDiff =
                new Date(right.latestWinAt).getTime() - new Date(left.latestWinAt).getTime();
            if (latestDiff !== 0) return latestDiff;

            return compareStringAsc(
                left.user.username ?? left.user.name,
                right.user.username ?? right.user.name
            );
        })
        .map((row, index) => ({ ...row, rank: index + 1 }));

    return { week, userRows, postRows };
};
