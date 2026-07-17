import { ODDS_BRACKETS } from "@/lib/constants";
import { Pick, PickType } from "../interfaces/interfaces";
import { calculateSlipPoints, SLIP_WIN_POINTS_CAP } from "../scoring/slipPoints";
import { calculateOddsBasedPoints } from "../scoring/oddsBasedPoints";

export type TierMeta = (typeof ODDS_BRACKETS)[number];
export type TierIndex = TierMeta["tier"];
export type TierMode = "global" | "leagueLeaderboard";

export const LEAGUE_CAP_TIER: TierIndex = 6;
export const LEAGUE_CAP_POINTS = SLIP_WIN_POINTS_CAP;

const LEAGUE_TIER_NAME_OVERRIDES: Partial<Record<TierIndex, string>> = {
    1: "Safe",
    2: "Lock",
    3: "Edge",
    4: "Risky",
    5: "Spicy",
    6: "Epic",
};

export const getGroupTierName = (tier: TierIndex, fallback?: string) =>
    LEAGUE_TIER_NAME_OVERRIDES[tier] ?? fallback ?? `Tier ${tier}`;

const LEAGUE_TIER_COLOR_OVERRIDES: Partial<Record<TierIndex, string>> = {
    1: "#8A5BFF",
    2: "#4C7BFF",
    3: "#00B6FF",
    4: "#00E6B5",
    5: "#00E63C",
    6: "#F4A300",
};

export const getGroupTierColor = (tier: TierIndex, fallback?: string) =>
    LEAGUE_TIER_COLOR_OVERRIDES[tier] ?? fallback ?? "#FFFFFF";

const TIER_NAME_LOOKUP: Record<string, TierIndex> = {
    LOCK: 1,
    SAFE: 2,
    EVEN: 3,
    EDGE: 4,
    RISKY: 5,
    SPICY: 6,
    "HAIL MARY": 7,
    MOONSHOT: 8,
    EPIC: 9,
    INSANE: 10,
    ELITE: 11,
    "ALL-TIME": 12,
    ICONIC: 13,
    LEGENDARY: 14,
};

const LEGACY_LABEL_LOOKUP: Record<string, TierIndex> = {
    "VERY SAFE": 1,
    SAFE: 2,
    BALANCED: 3,
    RISKY: 5,
    MOONSHOT: 8,
};

const clampToGroupTier = (tier: TierMeta) =>
    tier.tier > LEAGUE_CAP_TIER ? getTierByIndex(LEAGUE_CAP_TIER) : tier;

const getTierByIndex = (tier: TierIndex) =>
    ODDS_BRACKETS.find((entry) => entry.tier === tier) ?? ODDS_BRACKETS[0];

const normalizeLabel = (label: string) =>
    label.trim().replace(/\s+/g, " ").toUpperCase();

export const parseAmericanOdds = (
    odds: string | number | null | undefined
): number | null => {
    if (odds === null || odds === undefined) return null;
    if (typeof odds === "number") {
        return Number.isFinite(odds) ? Math.trunc(odds) : null;
    }
    const trimmed = odds.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/[+-]?\d+/);
    if (!match) return null;
    const numeric = Number(match[0]);
    if (Number.isNaN(numeric)) return null;
    return numeric;
};

export const getTierForAmericanOdds = (
    americanOdds: number,
    mode: TierMode = "global"
): TierMeta => {
    const resolved = ODDS_BRACKETS.find((bracket) => {
        const minOk =
            bracket.minOdds === null ? true : americanOdds >= bracket.minOdds;
        const maxOk =
            bracket.maxOdds === null ? true : americanOdds <= bracket.maxOdds;
        return minOk && maxOk;
    });
    const base = resolved ?? ODDS_BRACKETS[ODDS_BRACKETS.length - 1];
    return mode === "leagueLeaderboard" ? clampToGroupTier(base) : base;
};

export const getTierForOdds = (
    odds: string | number | null | undefined
): TierMeta | null => {
    const american = parseAmericanOdds(odds);
    if (american === null) return null;
    return getTierForAmericanOdds(american);
};

export const getTierForLabel = (
    label: string | null | undefined
): TierMeta | null => {
    if (!label) return null;
    const normalized = normalizeLabel(label);
    const tier = TIER_NAME_LOOKUP[normalized] ?? LEGACY_LABEL_LOOKUP[normalized];
    return tier ? getTierByIndex(tier) : null;
};

export const getTierForPoints = (points?: number | null): TierMeta | null => {
    if (typeof points !== "number") return null;
    const normalized = Math.abs(points);
    const bracket =
        ODDS_BRACKETS.find((entry) => entry.points === normalized) ?? null;
    return bracket;
};

export const getTierMetaForPick = ({
    odds,
    label,
    points,
    mode = "global",
}: {
    odds?: string | number | null;
    label?: string | null;
    points?: number | null;
    mode?: TierMode;
}): TierMeta | null => {
    const base =
        getTierForOdds(odds) ?? getTierForLabel(label) ?? getTierForPoints(points);
    if (!base) return null;
    return mode === "leagueLeaderboard" ? clampToGroupTier(base) : base;
};

export const getGlobalPointsForOdds = (americanOdds: number): number =>
    getTierForAmericanOdds(americanOdds).points;

export const getLeaderboardStandingPoints = (americanOdds: number): number =>
    Math.min(getGlobalPointsForOdds(americanOdds), LEAGUE_CAP_POINTS);

export const getGroupLeaderboardPointsForOdds = (americanOdds: number): number =>
    getLeaderboardStandingPoints(americanOdds);

export const getGroupTierForAmericanOdds = (americanOdds: number): TierMeta =>
    clampToGroupTier(getTierForAmericanOdds(americanOdds));

export const formatTierPrimary = (tier: number) => `Tier ${tier}`;

export const getBasePointsForPick = (pick: Pick, mode: TierMode = "global") => {
    const tierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode,
    });
    if (tierMeta) return tierMeta.points;
    if (typeof pick.points === "number" && pick.points > 0) {
        return pick.points;
    }
    return ODDS_BRACKETS[2]?.points ?? 25;
};

/** Resolve the full formula value for a Global Social post before its daily cap. */
export const getCalculatedGlobalXpForPick = (pick: Pick): number => {
    if (pick.pick_type !== PickType.POST) return 0;

    if (
        pick.result === "loss" ||
        pick.result === "void" ||
        pick.result === "not_found"
    ) {
        return 0;
    }

    if (
        typeof pick.calculated_global_xp === "number" &&
        Number.isFinite(pick.calculated_global_xp)
    ) {
        return Math.max(0, pick.calculated_global_xp);
    }

    // Migration-only fallback for local records written before contextual naming.
    const legacyCalculatedValue = (pick as Pick & { performancePoints?: unknown })
        .performancePoints;
    if (
        typeof legacyCalculatedValue === "number" &&
        Number.isFinite(legacyCalculatedValue)
    ) {
        return Math.max(0, legacyCalculatedValue);
    }

    const americanOdds = parseAmericanOdds(pick.odds_bracket);
    if (americanOdds === null || americanOdds === 0) return 0;

    return calculateOddsBasedPoints(americanOdds);
};

/** Resolve the Global XP actually applied to Profile progression. */
export const getAppliedGlobalXpForPick = (pick: Pick): number => {
    if (pick.pick_type !== PickType.POST || pick.result !== "win") return 0;
    if (typeof pick.xp_awarded === "number" && Number.isFinite(pick.xp_awarded)) {
        return Math.max(0, pick.xp_awarded);
    }
    return getCalculatedGlobalXpForPick(pick);
};

export const getPickPoints = (
    pick?: Pick | null,
    mode: TierMode = "global"
): number => {
    if (!pick) return 0;
    const result = (pick.result ?? "pending") as NonNullable<Pick["result"]>;
    if (mode === "leagueLeaderboard") {
        return calculateSlipPoints({
            result,
            baseWinPoints: getBasePointsForPick(pick, mode),
            awardedPoints: pick.awardedPoints,
        });
    }
    if (result === "win") return getBasePointsForPick(pick, mode);
    if (result === "loss") return 0;
    if (result === "void" || result === "not_found") return 0;
    return 0;
};
