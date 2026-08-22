export const WINNING_POST_CARD_TONE =
    "border border-[#c4ab78]/62 border-b-[3px] border-b-[#9e7840] bg-[radial-gradient(circle_at_top_right,rgba(255,231,165,0.06),transparent_24%),linear-gradient(180deg,rgba(255,248,220,0.035),rgba(255,255,255,0.02)_16%,rgba(255,255,255,0.025)_82%,rgba(217,119,6,0.03))] shadow-[inset_0_1px_0_rgba(255,248,220,0.18),inset_0_-2px_0_rgba(120,85,25,0.28),inset_0_0_0_1px_rgba(181,140,61,0.22),0_2px_10px_rgba(0,0,0,0.18)]";

export const LOSING_POST_CARD_TONE =
    "border border-rose-300/34 border-b-[3px] border-b-rose-800/68 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.06),transparent_24%),linear-gradient(180deg,rgba(255,241,242,0.024),rgba(255,255,255,0.018)_16%,rgba(255,255,255,0.02)_82%,rgba(190,24,93,0.038))] shadow-[inset_0_1px_0_rgba(254,205,211,0.1),inset_0_-2px_0_rgba(136,19,55,0.24),inset_0_0_0_1px_rgba(244,114,182,0.1),0_2px_10px_rgba(0,0,0,0.18)]";

export const NEUTRAL_POST_CARD_SURFACE = "bg-[#0b0b0b]";

/**
 * The accent-tinted chrome a CONTEST post wears, keyed by the Feed's own accent
 * ("sky" for a League, "violet" for an Arena) rather than by group_type, so a
 * component takes the accent it was already given instead of re-deriving it.
 *
 * Ported verbatim from the MVP's lib/styles/postCards. Kept here rather than
 * inlined in the results card because the MVP shares these three across every
 * contest-owned post surface, and a second consumer that re-spells them is how
 * two contest cards end up with almost-matching borders.
 */
export const CONTEST_POST_EDGE_TONES = {
    sky: "border-b-blue-400/[0.18]",
    violet: "border-b-violet-400/[0.18]",
} as const;

export const CONTEST_POST_PRIMARY_TONES = {
    sky: `border-white/10 border-b-[3px] ${CONTEST_POST_EDGE_TONES.sky} bg-[#0b0b0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_10px_rgba(0,0,0,0.18)]`,
    violet: `border-white/10 border-b-[3px] ${CONTEST_POST_EDGE_TONES.violet} bg-[#0b0b0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_10px_rgba(0,0,0,0.18)]`,
} as const;

export const CONTEST_POST_HEADER_TONES = {
    sky: "bg-blue-400/[0.18]",
    violet: "bg-violet-400/[0.18]",
} as const;

/**
 * The header band an ORDINARY (non-contest) pick post wears.
 *
 * A contest post takes its band from the community accent above, because inside
 * a contest the result belongs to the standings rather than to the card. An
 * ordinary post has no such owner, so its band is the only place the result can
 * read from — which is why these three are keyed by result and the contest pair
 * is keyed by accent.
 */
export const ORDINARY_POST_HEADER_TONES = {
    neutral: "bg-slate-400/[0.10]",
    win: "bg-[#faab00]/[0.18]",
    loss: "bg-rose-600/[0.16]",
} as const;

/**
 * The podium tint a contest entry's RANK tile wears at 1st, 2nd and 3rd.
 *
 * Applied to the tile itself rather than to the whole card: an entry can be
 * winning and still have losing selections, so tinting the card would contradict
 * the picks inside it.
 */
export const CONTEST_STANDING_PODIUM_TONES = {
    gold: "border-[#faab00]/40 bg-[#faab00]/[0.14]",
    silver:
        "border-slate-200/50 bg-gradient-to-br from-slate-200/[0.20] via-slate-400/[0.09] to-slate-950/[0.04] shadow-[inset_0_1px_0_rgba(241,245,249,0.20),0_0_10px_rgba(203,213,225,0.08)]",
    bronze:
        "border-orange-300/50 bg-gradient-to-br from-orange-400/[0.21] via-orange-700/[0.10] to-orange-950/[0.05] shadow-[inset_0_1px_0_rgba(253,186,116,0.20),0_0_10px_rgba(249,115,22,0.08)]",
} as const;

/** The settled-result chip in a feed post's control cluster. */
export const PICK_RESULT_BADGE_TONES = {
    win: "bg-emerald-400/15 text-emerald-100",
    loss: "bg-rose-400/15 text-rose-100",
    void: "bg-slate-400/15 text-slate-100",
    not_found: "bg-slate-400/15 text-slate-100",
} as const;

export const PENDING_POST_CARD_TONE =
    "border border-white/10 border-b-[3px] border-b-white/20 bg-[#0b0b0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.04),0_2px_10px_rgba(0,0,0,0.18)]";

export type StandingRankMarkerTone = "gold" | "silver" | "bronze" | "neutral";

/** The compact Slip leaderboard marker footprint. */
export const STANDING_RANK_MARKER_LAYOUT =
    "-bottom-1 -right-1 h-[15px] min-w-[15px] px-0.5 text-[8px] leading-none md:h-[17px] md:min-w-[17px] md:px-1 md:text-[9px]";

/** Centered, opaque placement markers shared by Feed Contest and Slip standings. */
export const STANDING_RANK_MARKER_TONES: Record<StandingRankMarkerTone, string> = {
    gold:
        "border-[#ffd45a] bg-[#faab00] text-[#211300] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.42)]",
    silver:
        "border-slate-100 bg-[#cbd5e1] text-slate-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.42)]",
    bronze:
        "border-[#f0ad70] bg-[#c7783d] text-[#241107] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.42)]",
    neutral:
        "border-[#34343a] bg-[#0b0b0b] text-slate-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.42)]",
};

/** The confirmed-award tint on a settled standing's points card. */
export const AWARDED_POINTS_CARD_TONE =
    "border-emerald-300/30 bg-emerald-500/[0.10]";

export const getStandingRankMarkerTone = (
    rank: number,
    winningPlaces = 3,
): StandingRankMarkerTone => {
    const finalWinningPlace = Math.min(5, Math.max(0, winningPlaces));
    if (rank < 1 || rank > finalWinningPlace) return "neutral";
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    return "bronze";
};
