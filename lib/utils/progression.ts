export const XP_DAILY_CAP = 300;
export const XP_LEVEL_BASE = 250;

export const getLocalDateKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

export const getTotalXpToReachLevel = (level: number) => {
    const safeLevel = Math.max(1, Math.floor(level));
    return (XP_LEVEL_BASE * (safeLevel - 1) * safeLevel) / 2;
};

export const getXpToNextLevel = (level: number) => {
    const safeLevel = Math.max(1, Math.floor(level));
    return XP_LEVEL_BASE * safeLevel;
};

export const getLevelFromLifetimeXp = (lifetimeXp: number) => {
    const safeXp = Math.max(0, Math.floor(lifetimeXp));
    const normalized = (safeXp * 2) / XP_LEVEL_BASE;
    const level = Math.floor((1 + Math.sqrt(1 + 4 * normalized)) / 2);
    return Math.max(1, level);
};

export const getLevelProgress = (lifetimeXp: number) => {
    const level = getLevelFromLifetimeXp(lifetimeXp);
    const totalXpToReach = getTotalXpToReachLevel(level);
    const xpIntoLevel = Math.max(0, lifetimeXp - totalXpToReach);
    const xpToNext = getXpToNextLevel(level);
    const xpRemaining = Math.max(0, xpToNext - xpIntoLevel);
    return { level, xpIntoLevel, xpToNext, xpRemaining };
};
