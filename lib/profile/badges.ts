import { parseAmericanOdds, getTierMetaForPick } from "@/lib/utils/scoring";
import { Pick } from "../interfaces/interfaces";

export type ProfileBadgeCategory = "activity" | "performance" | "odds";
export type ProfileBadgeTierLevel = "bronze" | "silver" | "gold";

export type ProfileBadgeTier = {
    level: ProfileBadgeTierLevel;
    threshold: number; // numeric goal for the metric
};

type ProfileBadgeMetric =
    | "post-count"
    | "combo-count"
    | "distinct-sports"
    | "total-wins"
    | "longest-win-streak"
    | "win-rate"
    | "highest-positive-odds-win"
    | "highest-tier-win";

export type ProfileBadgeDefinition = {
    id: string;
    name: string; // family name e.g. "Volume"
    category: ProfileBadgeCategory;
    description: string;
    metric: ProfileBadgeMetric;
    /** Short unit used in progress labels, e.g. "picks", "wins". */
    unit: string;
    /** Emoji rendered inside the medallion by ProfileBadgeIcon. */
    icon: string;
    tiers: [ProfileBadgeTier, ProfileBadgeTier, ProfileBadgeTier]; // ascending
    /** Minimum settled picks required before win-rate counts. */
    minSettled?: number;
};

export type ProfileBadgeProgress = {
    definition: ProfileBadgeDefinition;
    currentValue: number;
    earnedTier: ProfileBadgeTier | null; // highest reached; null = locked
    nextTier: ProfileBadgeTier | null; // next to unlock; null = maxed
    progressPercent: number; // 0-100 toward nextTier (100 when maxed)
    progressLabel: string; // "17/50 picks"
};

export const CATEGORY_LABELS: Record<ProfileBadgeCategory, string> = {
    activity: "Activity",
    performance: "Performance",
    odds: "Underdog & Odds",
};

const tier = (
    level: ProfileBadgeTierLevel,
    threshold: number
): ProfileBadgeTier => ({ level, threshold });

export const PROFILE_BADGE_CATALOG: ProfileBadgeDefinition[] = [
    {
        id: "volume",
        name: "Volume",
        category: "activity",
        description: "Total picks posted to your profile.",
        metric: "post-count",
        unit: "picks",
        icon: "📊",
        tiers: [
            tier("bronze", 10),
            tier("silver", 50),
            tier("gold", 200),
        ],
    },
    {
        id: "combo-architect",
        name: "Combo Architect",
        category: "activity",
        description: "Combo picks you've built and posted.",
        metric: "combo-count",
        unit: "combos",
        icon: "🧩",
        tiers: [
            tier("bronze", 5),
            tier("silver", 25),
            tier("gold", 100),
        ],
    },
    {
        id: "globetrotter",
        name: "Globetrotter",
        category: "activity",
        description: "Different sports you've posted picks in.",
        metric: "distinct-sports",
        unit: "sports",
        icon: "🌐",
        tiers: [
            tier("bronze", 2),
            tier("silver", 4),
            tier("gold", 6),
        ],
    },
    {
        id: "win-streak",
        name: "Win Streak",
        category: "performance",
        description: "Longest run of consecutive winning picks.",
        metric: "longest-win-streak",
        unit: "in a row",
        icon: "🔥",
        tiers: [
            tier("bronze", 3),
            tier("silver", 6),
            tier("gold", 10),
        ],
    },
    {
        id: "win-machine",
        name: "Win Machine",
        category: "performance",
        description: "Total winning picks across your profile.",
        metric: "total-wins",
        unit: "wins",
        icon: "🏆",
        tiers: [
            tier("bronze", 10),
            tier("silver", 50),
            tier("gold", 200),
        ],
    },
    {
        id: "accuracy",
        name: "Accuracy",
        category: "performance",
        description: "Win rate across settled picks (minimum 20 settled).",
        metric: "win-rate",
        unit: "% win rate",
        icon: "🎯",
        minSettled: 20,
        tiers: [
            tier("bronze", 55),
            tier("silver", 65),
            tier("gold", 75),
        ],
    },
    {
        id: "underdog",
        name: "Underdog",
        category: "odds",
        description: "Biggest positive-odds winning pick.",
        metric: "highest-positive-odds-win",
        unit: "odds",
        icon: "🐕",
        tiers: [
            tier("bronze", 150),
            tier("silver", 300),
            tier("gold", 750),
        ],
    },
    {
        id: "high-roller",
        name: "High Roller",
        category: "odds",
        description: "Highest difficulty tier you've won.",
        metric: "highest-tier-win",
        unit: "tier",
        icon: "🎲",
        tiers: [
            tier("bronze", 7), // HAIL MARY
            tier("silver", 10), // INSANE
            tier("gold", 14), // LEGENDARY
        ],
    },
];

const getPickTimestamp = (pick: Pick) =>
    new Date(pick.created_at ?? pick.updated_at ?? pick.id).getTime();

type MetricTotals = {
    postCount: number;
    comboCount: number;
    distinctSports: number;
    totalWins: number;
    settled: number;
    longestWinStreak: number;
    winRate: number;
    highestPositiveOddsWin: number;
    highestTierWin: number;
};

const computeMetricTotals = (postPicks: Pick[]): MetricTotals => {
    let comboCount = 0;
    let totalWins = 0;
    let losses = 0;
    let highestPositiveOddsWin = 0;
    let highestTierWin = 0;
    const sports = new Set<string>();

    for (const pick of postPicks) {
        if (pick.is_combo) comboCount += 1;
        if (pick.sport) sports.add(String(pick.sport).trim().toUpperCase());

        const result = pick.result ?? "pending";
        if (result === "win") {
            totalWins += 1;
            const odds = parseAmericanOdds(pick.odds_bracket);
            if (odds !== null && odds > highestPositiveOddsWin) {
                highestPositiveOddsWin = odds;
            }
            const tierMeta = getTierMetaForPick({
                odds: pick.odds_bracket,
                label: pick.difficulty_label,
                points: pick.points,
            });
            if (tierMeta && tierMeta.tier > highestTierWin) {
                highestTierWin = tierMeta.tier;
            }
        } else if (result === "loss") {
            losses += 1;
        }
    }

    const settled = totalWins + losses;
    const winRate = settled > 0 ? Math.round((totalWins / settled) * 100) : 0;

    // Longest win streak over picks ordered chronologically.
    const chronological = [...postPicks].sort(
        (a, b) => getPickTimestamp(a) - getPickTimestamp(b)
    );
    let longestWinStreak = 0;
    let current = 0;
    for (const pick of chronological) {
        const result = pick.result ?? "pending";
        if (result === "win") {
            current += 1;
            if (current > longestWinStreak) longestWinStreak = current;
        } else if (result === "loss") {
            current = 0;
        }
        // void/pending/not_found leave the streak unchanged.
    }

    return {
        postCount: postPicks.length,
        comboCount,
        distinctSports: sports.size,
        totalWins,
        settled,
        longestWinStreak,
        winRate,
        highestPositiveOddsWin,
        highestTierWin,
    };
};

const getMetricValue = (
    definition: ProfileBadgeDefinition,
    totals: MetricTotals
): number => {
    switch (definition.metric) {
        case "post-count":
            return totals.postCount;
        case "combo-count":
            return totals.comboCount;
        case "distinct-sports":
            return totals.distinctSports;
        case "total-wins":
            return totals.totalWins;
        case "longest-win-streak":
            return totals.longestWinStreak;
        case "win-rate":
            // Gate behind the minimum settled count; otherwise the badge stays locked.
            if (definition.minSettled && totals.settled < definition.minSettled) return 0;
            return totals.winRate;
        case "highest-positive-odds-win":
            return totals.highestPositiveOddsWin;
        case "highest-tier-win":
            return totals.highestTierWin;
        default:
            return 0;
    }
};

const TIER_INDEX_NAMES: Record<number, string> = {
    7: "HAIL MARY",
    10: "INSANE",
    14: "LEGENDARY",
};

/**
 * Format a metric amount (current value or a tier threshold) for display.
 * Handles percentages, plus-money odds, and difficulty-tier names.
 */
export const formatBadgeAmount = (
    definition: ProfileBadgeDefinition,
    value: number
): string => {
    if (definition.metric === "win-rate") return `${value}%`;
    if (definition.metric === "highest-positive-odds-win") {
        return value > 0 ? `+${value}` : "—";
    }
    if (definition.metric === "highest-tier-win") {
        return TIER_INDEX_NAMES[value] ?? (value > 0 ? `Tier ${value}` : "—");
    }
    return `${value}`;
};

const formatValue = formatBadgeAmount;

const buildProgress = (
    definition: ProfileBadgeDefinition,
    currentValue: number
): ProfileBadgeProgress => {
    const tiers = definition.tiers;
    let earnedTier: ProfileBadgeTier | null = null;
    for (const t of tiers) {
        if (currentValue >= t.threshold) earnedTier = t;
    }
    const earnedIndex = earnedTier ? tiers.indexOf(earnedTier) : -1;
    const nextTier = earnedIndex < tiers.length - 1 ? tiers[earnedIndex + 1] : null;

    let progressPercent: number;
    let progressLabel: string;
    if (!nextTier) {
        progressPercent = 100;
        progressLabel = `${formatValue(definition, currentValue)} · maxed`;
    } else {
        const floor = earnedTier ? earnedTier.threshold : 0;
        const span = nextTier.threshold - floor;
        progressPercent =
            span > 0
                ? Math.max(0, Math.min(100, ((currentValue - floor) / span) * 100))
                : 0;
        const target = `${formatValue(definition, currentValue)} / ${formatValue(
            definition,
            nextTier.threshold
        )}`;
        // Count-based metrics read better with a trailing noun ("17 / 50 picks");
        // self-describing metrics (%, +odds, tier names) already convey the unit.
        const SELF_DESCRIBING: ProfileBadgeMetric[] = [
            "win-rate",
            "highest-positive-odds-win",
            "highest-tier-win",
        ];
        progressLabel = SELF_DESCRIBING.includes(definition.metric)
            ? target
            : `${target} ${definition.unit}`;
    }

    return {
        definition,
        currentValue,
        earnedTier,
        nextTier,
        progressPercent,
        progressLabel,
    };
};

/**
 * Compute passive, career-spanning badge progress for a user's POST picks.
 * Milestone-based: any user who clears a tier threshold earns that tier.
 */
export const getProfileBadgeProgress = (
    postPicks: Pick[]
): ProfileBadgeProgress[] => {
    const totals = computeMetricTotals(postPicks);
    return PROFILE_BADGE_CATALOG.map((definition) =>
        buildProgress(definition, getMetricValue(definition, totals))
    );
};

const TIER_RANK: Record<ProfileBadgeTierLevel, number> = {
    gold: 3,
    silver: 2,
    bronze: 1,
};

/** Earned badges first (gold→bronze), then locked badges in catalog order. */
export const sortProfileBadges = (
    badges: ProfileBadgeProgress[]
): ProfileBadgeProgress[] =>
    [...badges].sort((a, b) => {
        const aRank = a.earnedTier ? TIER_RANK[a.earnedTier.level] : 0;
        const bRank = b.earnedTier ? TIER_RANK[b.earnedTier.level] : 0;
        if (aRank !== bRank) return bRank - aRank;
        return 0;
    });
