// Helpers for determining which games are eligible for a slip based on pick deadlines.

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_ELIGIBLE_WINDOW_DAYS = 3;

const toTime = (iso: string | null | undefined) => {
    if (!iso) return null;
    const time = new Date(iso).getTime();
    return Number.isFinite(time) ? time : null;
};

const toGameTime = (
    gameday: string | null | undefined,
    gametime: string | null | undefined
): number | null => {
    if (!gameday || !gametime) return null;

    // Combine into ISO-like format
    const iso = `${gameday}T${gametime}:00`;
    const time = new Date(iso).getTime();

    return Number.isFinite(time) ? time : null;
};

export const eligibleWindowEnd = (
    pickDeadline: string | null | undefined,
    windowDays = DEFAULT_ELIGIBLE_WINDOW_DAYS
) => {
    const pickTime = toTime(pickDeadline);
    if (!pickTime) return null;
    return new Date(pickTime + windowDays * DAY_IN_MS).toISOString();
};

export const upcomingWindowRange = (windowDays = 5, startFromTomorrow = true) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (startFromTomorrow) {
        start.setDate(start.getDate() + 1);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + windowDays);
    return {
        startTime: start.getTime(),
        endTime: end.getTime(),
    };
};

export const isGameEligible = (
    startTime: string,
    pickDeadline: string | null | undefined,
    windowDays = DEFAULT_ELIGIBLE_WINDOW_DAYS
) => {
    const pickTime = toTime(pickDeadline);
    const start = toTime(startTime);
    if (!pickTime || !start) return false;
    const windowMs = windowDays * DAY_IN_MS;

    return start > pickTime && start <= (pickTime + windowMs);
};

export const isMatchEligible = (
    gameday: string,
    gametime: string,
    pickDeadline: string | null | undefined,
    windowDays = DEFAULT_ELIGIBLE_WINDOW_DAYS
): boolean => {
    const pickTime = toTime(pickDeadline);
    const start = toGameTime(gameday, gametime);

    if (!pickTime || !start) return false;

    const windowMs = windowDays * DAY_IN_MS;

    return start > pickTime && start <= pickTime + windowMs;
};

export const filterEligibleGames = <T extends { date: string }>(
    games: T[],
    pickDeadline: string | null | undefined,
    windowDays = DEFAULT_ELIGIBLE_WINDOW_DAYS
): T[] =>
    games.filter((game) =>
        isGameEligible(game.date, pickDeadline, windowDays)
    );

export const filterUpcomingWindowGames = <T extends { date: string }>(
    games: T[],
    windowDays = 5,
    startFromTomorrow = true
) => {
    const { startTime, endTime } = upcomingWindowRange(windowDays, startFromTomorrow);
    return games.filter((game) => {
        const start = toTime(game.date);
        if (!start) return false;
        return start >= startTime && start < endTime;
    });
};