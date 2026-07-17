export const GLOBAL_XP_DAILY_CAP = 1000;
export const DEFAULT_ACCOUNT_TIME_ZONE = "UTC";

export const isValidIanaTimeZone = (value: unknown): value is string => {
    if (typeof value !== "string" || !value.trim()) return false;

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format();
        return true;
    } catch {
        return false;
    }
};

export const normalizeAccountTimeZone = (value: unknown): string =>
    isValidIanaTimeZone(value) ? value.trim() : DEFAULT_ACCOUNT_TIME_ZONE;

export type CalculateGlobalXpGrantInput = {
    requestedGlobalXp: number;
    globalXpEarnedOnAccountDay: number;
    dailyCap?: number;
};

export type GlobalXpGrant = {
    requestedGlobalXp: number;
    globalXpGranted: number;
    globalXpNotGranted: number;
    globalXpAfterGrant: number;
    dailyCap: number;
};

const assertNonNegativeFinite = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${label} must be a finite non-negative number.`);
    }
};

/**
 * Applies the Global XP account-day cap. Excess requested XP expires and never
 * rolls into a later account day.
 */
export const calculateGlobalXpGrant = ({
    requestedGlobalXp,
    globalXpEarnedOnAccountDay,
    dailyCap = GLOBAL_XP_DAILY_CAP,
}: CalculateGlobalXpGrantInput): GlobalXpGrant => {
    assertNonNegativeFinite(requestedGlobalXp, "Requested Global XP");
    assertNonNegativeFinite(globalXpEarnedOnAccountDay, "Account-day Global XP");
    assertNonNegativeFinite(dailyCap, "Daily XP cap");

    const normalizedXpToday = Math.min(globalXpEarnedOnAccountDay, dailyCap);
    const xpAvailable = Math.max(0, dailyCap - normalizedXpToday);
    const globalXpGranted = Math.min(requestedGlobalXp, xpAvailable);

    return {
        requestedGlobalXp,
        globalXpGranted,
        globalXpNotGranted: requestedGlobalXp - globalXpGranted,
        globalXpAfterGrant: normalizedXpToday + globalXpGranted,
        dailyCap,
    };
};

/** Resolve an instant to the account's YYYY-MM-DD key in an IANA timezone. */
export const getAccountCalendarDayKey = (
    instant: Date,
    accountTimeZone: string
): string => {
    if (!Number.isFinite(instant.getTime())) {
        throw new Error("Account-day instant must be a valid date.");
    }

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: normalizeAccountTimeZone(accountTimeZone),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(instant);
    const byType = new Map(parts.map((part) => [part.type, part.value]));
    const year = byType.get("year");
    const month = byType.get("month");
    const day = byType.get("day");

    if (!year || !month || !day) {
        throw new Error("Unable to resolve the account calendar day.");
    }

    return `${year}-${month}-${day}`;
};
