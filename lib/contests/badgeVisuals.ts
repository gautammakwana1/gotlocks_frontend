import { ContestBadgeAward, ContestBadgeCategory } from "../interfaces/interfaces";


/**
 * One shared icon image per badge category. Files live flat in /public/badges.
 * All badges in a category share the same artwork; they are told apart by
 * name/description (on the flipped card) and by a league-specific tint ring.
 */
export const BADGE_CATEGORY_ICON: Record<ContestBadgeCategory, string> = {
    generic: "/badges/generic.png",
    football: "/badges/football.png",
    nba: "/badges/nba.png",
    mlb: "/badges/mlb.png",
    nhl: "/badges/nhl.png",
    soccer: "/badges/soccer.png",
};

export const getBadgeIconSrc = (category: ContestBadgeCategory) =>
    BADGE_CATEGORY_ICON[category] ?? BADGE_CATEGORY_ICON.generic;

export type BadgeTint = {
    /** Short label for the league this badge was earned in (empty for generic). */
    label: string;
    /** Ring/border colour around the icon. */
    ringClass: string;
    /** Soft glow behind the icon. */
    glowClass: string;
    /** Accent text colour used on the modal. */
    textClass: string;
};

const GENERIC_TINT: BadgeTint = {
    label: "Generic",
    ringClass: "ring-amber-300/60",
    glowClass: "shadow-[0_0_28px_rgba(251,191,36,0.28)]",
    textClass: "text-amber-200",
};

/**
 * League-specific tints. Several leagues map to the same category icon
 * (e.g. NFL + NCAAF both use the football icon), so the tint is what
 * differentiates them visually.
 */
const LEAGUE_TINT: Record<string, BadgeTint> = {
    NFL: {
        label: "NFL",
        ringClass: "ring-sky-400/60",
        glowClass: "shadow-[0_0_28px_rgba(56,189,248,0.30)]",
        textClass: "text-sky-200",
    },
    NCAAF: {
        label: "NCAAF",
        ringClass: "ring-amber-400/60",
        glowClass: "shadow-[0_0_28px_rgba(251,146,60,0.30)]",
        textClass: "text-amber-200",
    },
    NBA: {
        label: "NBA",
        ringClass: "ring-orange-400/60",
        glowClass: "shadow-[0_0_28px_rgba(251,146,60,0.30)]",
        textClass: "text-orange-200",
    },
    NCAAB: {
        label: "NCAAB",
        ringClass: "ring-violet-400/60",
        glowClass: "shadow-[0_0_28px_rgba(139,92,246,0.30)]",
        textClass: "text-violet-200",
    },
    MLB: {
        label: "MLB",
        ringClass: "ring-red-400/60",
        glowClass: "shadow-[0_0_28px_rgba(248,113,113,0.30)]",
        textClass: "text-red-200",
    },
    NHL: {
        label: "NHL",
        ringClass: "ring-cyan-400/60",
        glowClass: "shadow-[0_0_28px_rgba(34,211,238,0.30)]",
        textClass: "text-cyan-200",
    },
    SOCCER: {
        label: "Soccer",
        ringClass: "ring-emerald-400/60",
        glowClass: "shadow-[0_0_28px_rgba(16,185,129,0.30)]",
        textClass: "text-emerald-200",
    },
};

const normalizeSportKey = (sport?: string | null) => sport?.trim().toUpperCase() ?? "";

export const getBadgeTint = (sport?: string | null): BadgeTint =>
    LEAGUE_TINT[normalizeSportKey(sport)] ?? GENERIC_TINT;

/**
 * Generic badges are sport-agnostic, so they always use the generic tint/label
 * even though the winning pick carries a specific league. Sport-specific badges
 * tint by the league the badge was earned in.
 */
export const resolveBadgeTint = (
    category: ContestBadgeCategory,
    sport?: string | null
): BadgeTint => (category === "generic" ? GENERIC_TINT : getBadgeTint(sport));

export const getBadgeAwardVisual = (award: ContestBadgeAward) => ({
    iconSrc: getBadgeIconSrc(award.definition.category),
    tint: resolveBadgeTint(award.definition.category, award.sport),
});
