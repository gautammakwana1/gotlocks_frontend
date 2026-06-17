import { isSlipFinal } from "@/lib/slips/state";
import { parseAmericanOdds } from "@/lib/utils/scoring";
import { Contest, ContestBadgeAward, ContestBadgeDefinition, ContestBadgeSettings, Pick as UserPick, PickLeg, Slip } from "../interfaces/interfaces";

export const DEFAULT_BADGE_POINTS = 10;
export const MAX_BADGE_BONUS_PER_USER = 50;

type BadgeMetric =
    | "highest-positive-odds-win"
    | "longest-win-streak"
    | "best-win-percentage"
    | "positive-odds-win-count"
    | "spread-win-count"
    | "positive-odds-moneyline-win-count"
    | "total-win-count"
    | "football-passing-win-count"
    | "football-rushing-win-count"
    | "football-receiving-win-count"
    | "td-scorer-positive-odds-win"
    | "nba-points-win-count"
    | "nba-rebounds-win-count"
    | "nba-assists-win-count"
    | "nba-threes-win-count"
    | "nba-combo-stat-win-count"
    | "nba-defensive-win-count"
    | "mlb-strikeout-win-count"
    | "mlb-hits-win-count"
    | "mlb-rbi-win-count"
    | "mlb-total-bases-win-count"
    | "mlb-homerun-win-count"
    | "nhl-goals-win-count"
    | "nhl-assists-win-count"
    | "nhl-shots-win-count"
    | "nhl-points-win-count"
    | "nhl-saves-win-count"
    | "soccer-goals-win-count"
    | "soccer-assists-win-count"
    | "soccer-shots-win-count"
    | "soccer-clean-sheet-win-count"
    | "soccer-cards-win-count";

type BadgeDisplay = {
    icon: string;
    subtitle: string;
    theme: string;
    toneClass: string;
    borderClass: string;
    glowClass: string;
    glowColor: string;
};

type BadgeCatalogDefinition = ContestBadgeDefinition & {
    metric: BadgeMetric;
    display: BadgeDisplay;
};

type ResolvedContestPick = {
    pick: UserPick;
    slip: Slip;
    odds: number | null;
    reachedAt: string;
};

const normalizeKey = (value?: string | null) => value?.trim().toUpperCase() ?? "";
const normalizeText = (value?: string | null) =>
    value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : `${odds}`);
const plural = (count: number, label: string) => `${count} ${label}${count === 1 ? "" : "s"}`;

const display = (
    icon: string,
    subtitle: string,
    theme: string,
    toneClass: string,
    borderClass: string,
    glowClass: string,
    glowColor: string,
): BadgeDisplay => ({ icon, subtitle, theme, toneClass, borderClass, glowClass, glowColor });

export const BADGE_CATALOG: BadgeCatalogDefinition[] = [
    {
        id: "biggest-hit",
        name: "Biggest Hit",
        category: "generic",
        description: "Highest positive-odds winning pick.",
        metric: "highest-positive-odds-win",
        minimum: 100,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("meteor", "Highest underdog hit", "purple-gold", "text-amber-100", "border-amber-300/30", "shadow-[0_0_28px_rgba(251,191,36,0.14)]", "#fbbf24"),
    },
    {
        id: "hot-hand",
        name: "Hot Hand",
        category: "generic",
        description: "Longest win streak across finalized contest slips.",
        metric: "longest-win-streak",
        minimum: 3,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("flame", "Longest streak", "orange-red", "text-orange-100", "border-orange-300/30", "shadow-[0_0_28px_rgba(251,146,60,0.14)]", "#fb923c"),
    },
    {
        id: "accuracy-crown",
        name: "Accuracy Crown",
        category: "generic",
        description: "Best win percentage with at least four resolved picks.",
        metric: "best-win-percentage",
        minimum: 4,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("crown", "Best hit rate", "gold", "text-yellow-100", "border-yellow-300/30", "shadow-[0_0_28px_rgba(250,204,21,0.12)]", "#facc15"),
    },
    {
        id: "underdog-hunter",
        name: "Underdog Hunter",
        category: "generic",
        description: "Most positive-odds winning picks across any market.",
        metric: "positive-odds-win-count",
        minimum: 2,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("wolf", "Most plus-money wins", "green-silver", "text-emerald-100", "border-emerald-300/30", "shadow-[0_0_28px_rgba(16,185,129,0.12)]", "#10b981"),
    },
    {
        id: "spread-surgeon",
        name: "Spread Surgeon",
        category: "generic",
        description: "Most winning spread picks across any sport.",
        metric: "spread-win-count",
        minimum: 2,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("scalpel", "Spread specialist", "blue", "text-sky-100", "border-sky-300/30", "shadow-[0_0_28px_rgba(56,189,248,0.12)]", "#38bdf8"),
    },
    {
        id: "dog-caller",
        name: "Dog Caller",
        category: "generic",
        description: "Most positive-odds moneyline wins.",
        metric: "positive-odds-moneyline-win-count",
        minimum: 1,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("dog", "Plus-money moneylines", "dark-green", "text-lime-100", "border-lime-300/25", "shadow-[0_0_28px_rgba(132,204,22,0.12)]", "#84cc16"),
    },
    {
        id: "total-tactician",
        name: "Total Tactician",
        category: "generic",
        description: "Most winning over/under total picks.",
        metric: "total-win-count",
        minimum: 2,
        eligibleSports: [],
        suggestedPoints: 10,
        display: display("total", "Over/under control", "teal", "text-cyan-100", "border-cyan-300/25", "shadow-[0_0_28px_rgba(34,211,238,0.1)]", "#22d3ee"),
    },
    {
        id: "air-raid",
        name: "Air Raid",
        category: "football",
        description: "Most winning passing-related player props.",
        metric: "football-passing-win-count",
        minimum: 2,
        eligibleSports: ["NFL", "NCAAF"],
        suggestedPoints: 10,
        display: display("football-air", "Passing props", "sky-blue", "text-sky-100", "border-sky-300/30", "shadow-[0_0_28px_rgba(56,189,248,0.12)]", "#38bdf8"),
    },
    {
        id: "ground-game",
        name: "Ground Game",
        category: "football",
        description: "Most winning rushing-related player props.",
        metric: "football-rushing-win-count",
        minimum: 2,
        eligibleSports: ["NFL", "NCAAF"],
        suggestedPoints: 10,
        display: display("cleats", "Rushing props", "turf-green", "text-green-100", "border-green-300/30", "shadow-[0_0_28px_rgba(34,197,94,0.12)]", "#22c55e"),
    },
    {
        id: "hands-team",
        name: "Hands Team",
        category: "football",
        description: "Most winning receiving-related player props.",
        metric: "football-receiving-win-count",
        minimum: 2,
        eligibleSports: ["NFL", "NCAAF"],
        suggestedPoints: 10,
        display: display("gloves", "Receiving props", "white-gold", "text-stone-100", "border-stone-200/30", "shadow-[0_0_28px_rgba(245,245,244,0.08)]", "#f5f5f4"),
    },
    {
        id: "td-sniper",
        name: "TD Sniper",
        category: "football",
        description: "Highest positive-odds winning touchdown scorer pick.",
        metric: "td-scorer-positive-odds-win",
        minimum: 1,
        eligibleSports: ["NFL", "NCAAF"],
        suggestedPoints: 10,
        display: display("crosshair", "Touchdown hits", "neon-green", "text-emerald-100", "border-emerald-300/30", "shadow-[0_0_28px_rgba(16,185,129,0.14)]", "#10b981"),
    },
    {
        id: "bucket-getter",
        name: "Bucket Getter",
        category: "nba",
        description: "Most winning NBA player-points props.",
        metric: "nba-points-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("hoop", "Points props", "orange", "text-orange-100", "border-orange-300/30", "shadow-[0_0_28px_rgba(251,146,60,0.12)]", "#fb923c"),
    },
    {
        id: "board-man",
        name: "Board Man",
        category: "nba",
        description: "Most winning NBA player-rebounds props.",
        metric: "nba-rebounds-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("rim", "Rebound props", "bronze", "text-amber-100", "border-amber-700/35", "shadow-[0_0_28px_rgba(180,83,9,0.12)]", "#b45309"),
    },
    {
        id: "dime-dropper",
        name: "Dime Dropper",
        category: "nba",
        description: "Most winning NBA player-assists props.",
        metric: "nba-assists-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("pass", "Assist props", "blue", "text-blue-100", "border-blue-300/30", "shadow-[0_0_28px_rgba(59,130,246,0.12)]", "#3b82f6"),
    },
    {
        id: "from-deep",
        name: "From Deep",
        category: "nba",
        description: "Most winning NBA made-threes props.",
        metric: "nba-threes-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("arc", "Three-point props", "purple", "text-violet-100", "border-violet-300/30", "shadow-[0_0_28px_rgba(139,92,246,0.12)]", "#8b5cf6"),
    },
    {
        id: "triple-threat",
        name: "Triple Threat",
        category: "nba",
        description: "Most winning NBA combo-stat props, such as PRA, PR, PA, or RA.",
        metric: "nba-combo-stat-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("triangle", "Combo-stat props", "gold", "text-yellow-100", "border-yellow-300/30", "shadow-[0_0_28px_rgba(250,204,21,0.12)]", "#facc15"),
    },
    {
        id: "two-way-menace",
        name: "Two-Way Menace",
        category: "nba",
        description: "Most winning NBA defensive props, such as steals, blocks, or steals + blocks.",
        metric: "nba-defensive-win-count",
        minimum: 2,
        eligibleSports: ["NBA"],
        suggestedPoints: 10,
        display: display("shield", "Defensive props", "red-blue", "text-rose-100", "border-rose-300/30", "shadow-[0_0_28px_rgba(244,63,94,0.12)]", "#f43f5e"),
    },
    {
        id: "ace",
        name: "Ace",
        category: "mlb",
        description: "Most winning MLB pitcher strikeout props.",
        metric: "mlb-strikeout-win-count",
        minimum: 2,
        eligibleSports: ["MLB"],
        suggestedPoints: 10,
        display: display("flame-k", "Strikeout props", "red", "text-red-100", "border-red-300/30", "shadow-[0_0_28px_rgba(239,68,68,0.12)]", "#ef4444"),
    },
    {
        id: "contact-hitter",
        name: "Contact Hitter",
        category: "mlb",
        description: "Most winning MLB batter hits props.",
        metric: "mlb-hits-win-count",
        minimum: 2,
        eligibleSports: ["MLB"],
        suggestedPoints: 10,
        display: display("bat", "Hits props", "blue", "text-sky-100", "border-sky-300/30", "shadow-[0_0_28px_rgba(56,189,248,0.12)]", "#38bdf8"),
    },
    {
        id: "rbi-machine",
        name: "RBI Machine",
        category: "mlb",
        description: "Most winning MLB runs-batted-in props.",
        metric: "mlb-rbi-win-count",
        minimum: 2,
        eligibleSports: ["MLB"],
        suggestedPoints: 10,
        display: display("plate", "RBI props", "navy", "text-indigo-100", "border-indigo-300/30", "shadow-[0_0_28px_rgba(99,102,241,0.12)]", "#6366f1"),
    },
    {
        id: "total-bases-boss",
        name: "Total Bases Boss",
        category: "mlb",
        description: "Most winning MLB total-bases props.",
        metric: "mlb-total-bases-win-count",
        minimum: 2,
        eligibleSports: ["MLB"],
        suggestedPoints: 10,
        display: display("diamond", "Total-bases props", "green", "text-emerald-100", "border-emerald-300/30", "shadow-[0_0_28px_rgba(16,185,129,0.12)]", "#10b981"),
    },
    {
        id: "long-ball",
        name: "Long Ball",
        category: "mlb",
        description: "Most winning MLB home run props.",
        metric: "mlb-homerun-win-count",
        minimum: 1,
        eligibleSports: ["MLB"],
        suggestedPoints: 10,
        display: display("homer", "Home run props", "gold", "text-amber-100", "border-amber-300/30", "shadow-[0_0_28px_rgba(251,191,36,0.14)]", "#fbbf24"),
    },
    {
        id: "sniper-nhl",
        name: "Sniper",
        category: "nhl",
        description: "Most winning NHL goal-scorer props.",
        metric: "nhl-goals-win-count",
        minimum: 1,
        eligibleSports: ["NHL"],
        suggestedPoints: 10,
        display: display("puck", "Goal props", "red", "text-rose-100", "border-rose-300/30", "shadow-[0_0_28px_rgba(244,63,94,0.12)]", "#f43f5e"),
    },
    {
        id: "playmaker-nhl",
        name: "Playmaker",
        category: "nhl",
        description: "Most winning NHL assist props.",
        metric: "nhl-assists-win-count",
        minimum: 2,
        eligibleSports: ["NHL"],
        suggestedPoints: 10,
        display: display("stick", "Assist props", "blue", "text-sky-100", "border-sky-300/30", "shadow-[0_0_28px_rgba(56,189,248,0.12)]", "#38bdf8"),
    },
    {
        id: "sharpshooter-nhl",
        name: "Sharpshooter",
        category: "nhl",
        description: "Most winning NHL shots-on-goal props.",
        metric: "nhl-shots-win-count",
        minimum: 2,
        eligibleSports: ["NHL"],
        suggestedPoints: 10,
        display: display("target-puck", "Shots-on-goal props", "teal", "text-cyan-100", "border-cyan-300/25", "shadow-[0_0_28px_rgba(34,211,238,0.1)]", "#22d3ee"),
    },
    {
        id: "point-machine-nhl",
        name: "Point Machine",
        category: "nhl",
        description: "Most winning NHL player-points props.",
        metric: "nhl-points-win-count",
        minimum: 2,
        eligibleSports: ["NHL"],
        suggestedPoints: 10,
        display: display("scoresheet", "Points props", "purple", "text-violet-100", "border-violet-300/30", "shadow-[0_0_28px_rgba(139,92,246,0.12)]", "#8b5cf6"),
    },
    {
        id: "brick-wall-nhl",
        name: "Brick Wall",
        category: "nhl",
        description: "Most winning NHL goalie saves props.",
        metric: "nhl-saves-win-count",
        minimum: 2,
        eligibleSports: ["NHL"],
        suggestedPoints: 10,
        display: display("mask", "Goalie saves props", "white-gold", "text-stone-100", "border-stone-200/30", "shadow-[0_0_28px_rgba(245,245,244,0.08)]", "#f5f5f4"),
    },
    {
        id: "striker",
        name: "Striker",
        category: "soccer",
        description: "Most winning soccer goal-scorer props.",
        metric: "soccer-goals-win-count",
        minimum: 1,
        eligibleSports: ["Soccer"],
        suggestedPoints: 10,
        display: display("soccer-goal", "Goal props", "green", "text-emerald-100", "border-emerald-300/30", "shadow-[0_0_28px_rgba(16,185,129,0.12)]", "#10b981"),
    },
    {
        id: "assist-artist",
        name: "Assist Artist",
        category: "soccer",
        description: "Most winning soccer assist props.",
        metric: "soccer-assists-win-count",
        minimum: 2,
        eligibleSports: ["Soccer"],
        suggestedPoints: 10,
        display: display("boot", "Assist props", "blue", "text-sky-100", "border-sky-300/30", "shadow-[0_0_28px_rgba(56,189,248,0.12)]", "#38bdf8"),
    },
    {
        id: "shot-caller",
        name: "Shot Caller",
        category: "soccer",
        description: "Most winning soccer shots and shots-on-target props.",
        metric: "soccer-shots-win-count",
        minimum: 2,
        eligibleSports: ["Soccer"],
        suggestedPoints: 10,
        display: display("crosshair-ball", "Shots props", "orange", "text-orange-100", "border-orange-300/30", "shadow-[0_0_28px_rgba(251,146,60,0.12)]", "#fb923c"),
    },
    {
        id: "clean-sheet",
        name: "Clean Sheet",
        category: "soccer",
        description: "Most winning soccer clean sheet and both-teams-to-score props.",
        metric: "soccer-clean-sheet-win-count",
        minimum: 2,
        eligibleSports: ["Soccer"],
        suggestedPoints: 10,
        display: display("net", "Clean sheet / BTTS props", "white-gold", "text-stone-100", "border-stone-200/30", "shadow-[0_0_28px_rgba(245,245,244,0.08)]", "#f5f5f4"),
    },
    {
        id: "card-shark",
        name: "Card Shark",
        category: "soccer",
        description: "Most winning soccer cards and bookings props.",
        metric: "soccer-cards-win-count",
        minimum: 2,
        eligibleSports: ["Soccer"],
        suggestedPoints: 10,
        display: display("card", "Cards / bookings props", "gold", "text-yellow-100", "border-yellow-300/30", "shadow-[0_0_28px_rgba(250,204,21,0.12)]", "#facc15"),
    },
];

const ALL_BADGE_IDS = BADGE_CATALOG.map((badge) => badge.id);

const contestSports = (contest: Pick<Contest, "sports">) =>
    contest.sports.map(normalizeKey).filter(Boolean);

export const getDefaultEnabledBadgeIds = (contest: Pick<Contest, "sports">) => {
    const sports = new Set(contestSports(contest));
    return BADGE_CATALOG.filter((badge) => {
        if (badge.category === "generic") return true;
        return badge.eligibleSports.some((sport) => sports.has(normalizeKey(sport)));
    }).map((badge) => badge.id);
};

export const createDefaultContestBadgeSettings = (
    contest: Pick<Contest, "sports">,
    enabled = false
): ContestBadgeSettings => ({
    enabled,
    defaultPoints: DEFAULT_BADGE_POINTS,
    enabledBadgeIds: enabled ? getDefaultEnabledBadgeIds(contest) : [],
    badgePointOverrides: {},
});

export const normalizeContestBadgeSettings = (
    contest: Pick<Contest, "sports" | "badges_enabled">,
    settings?: Partial<ContestBadgeSettings> | null
): ContestBadgeSettings => {
    const enabled = settings?.enabled ?? Boolean(contest.badges_enabled);
    const defaultPoints =
        typeof settings?.defaultPoints === "number" && Number.isFinite(settings.defaultPoints)
            ? Math.max(0, Math.trunc(settings.defaultPoints))
            : DEFAULT_BADGE_POINTS;
    const fallbackEnabledBadgeIds = enabled ? getDefaultEnabledBadgeIds(contest) : [];
    const enabledBadgeIds = Array.from(
        new Set((settings?.enabledBadgeIds ?? fallbackEnabledBadgeIds).filter((id) => ALL_BADGE_IDS.includes(id)))
    );
    const badgePointOverrides = Object.fromEntries(
        Object.entries(settings?.badgePointOverrides ?? {})
            .filter(([id, value]) => ALL_BADGE_IDS.includes(id) && Number.isFinite(value))
            .map(([id, value]) => [id, Math.max(0, Math.trunc(value))])
    );
    return { enabled, defaultPoints, enabledBadgeIds, badgePointOverrides };
};

export const getAppliedBadgeSettings = (contest: Contest): ContestBadgeSettings =>
    normalizeContestBadgeSettings(contest, contest.badge_settings?.applied);

export const getPendingBadgeSettings = (contest: Contest): ContestBadgeSettings | null =>
    contest.badge_settings?.pending
        ? normalizeContestBadgeSettings(contest, contest.badge_settings.pending)
        : null;

export const getEffectiveBadgeSettings = getAppliedBadgeSettings;

export const getBadgePointValue = (
    settings: ContestBadgeSettings,
    badgeId: string
) => settings.badgePointOverrides[badgeId] ?? settings.defaultPoints;

export const applyBadgeBonusCap = (value: number) =>
    Math.min(value, MAX_BADGE_BONUS_PER_USER);

const joinedPickText = (pick: UserPick) =>
    [
        pick.selection?.market,
        pick.selection?.scope,
        pick.selection?.side,
        pick.source_tab,
        pick.description,
        ...(pick.legs ?? []).flatMap((leg) => [
            leg.selection?.market,
            leg.selection?.scope,
            leg.selection?.side,
            leg.description,
        ]),
    ]
        .map(normalizeText)
        .filter(Boolean)
        .join(" ");

const legText = (leg: PickLeg) =>
    [leg.selection?.market, leg.selection?.scope, leg.selection?.side, leg.description]
        .map(normalizeText)
        .filter(Boolean)
        .join(" ");

const textIncludesAny = (text: string, tokens: string[]) =>
    tokens.some((token) => text.includes(token));

export const hasPositiveOdds = (pick: UserPick) => {
    const odds = parseAmericanOdds(pick.odds_bracket);
    return odds !== null && odds >= 100;
};

const isFootballSport = (sport?: string | null) => {
    const key = normalizeKey(sport);
    return key === "NFL" || key === "NCAAF";
};

const isNbaSport = (sport?: string | null) => normalizeKey(sport) === "NBA";

const isMlbSport = (sport?: string | null) => normalizeKey(sport) === "MLB";

const isNhlSport = (sport?: string | null) => normalizeKey(sport) === "NHL";

const isSoccerSport = (sport?: string | null) => normalizeKey(sport) === "SOCCER";


export const isMoneylinePick = (pick: UserPick) => {
    const text = joinedPickText(pick);
    return textIncludesAny(text, ["moneyline", "money line", " ml", "h2h", "winner"]);
};

export const isSpreadPick = (pick: UserPick) => {
    const text = joinedPickText(pick);
    return textIncludesAny(text, ["spread", "alternate spread", "handicap"]);
};

export const isTotalPick = (pick: UserPick) => {
    const text = joinedPickText(pick);
    return textIncludesAny(text, ["total", "over/under", " over ", " under "]);
};

const pickOrLegMatches = (pick: UserPick, matcher: (text: string) => boolean) =>
    matcher(joinedPickText(pick)) || (pick.legs ?? []).some((leg) => matcher(legText(leg)));

export const isNbaPointsProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["player points", " points", "pts"])
    );

export const isNbaReboundsProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["rebounds", " rebound", "reb"])
    );

export const isNbaAssistsProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["assists", " assist", "ast"])
    );

export const isNbaThreesProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["made threes", "3-pointers", "three pointers", "threes", "3pt", "3 pt"])
    );

export const isNbaComboStatProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["pra", "points rebounds assists", "points + rebounds", "points + assists", "rebounds + assists", "pr ", "pa ", "ra "])
    );

export const isNbaDefensiveProp = (pick: UserPick) =>
    isNbaSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["steals", "blocks", "steals + blocks", "stocks"])
    );

export const isMlbStrikeoutProp = (pick: UserPick) =>
    isMlbSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["strikeouts", "strikeout", "pitcher ks", " ks", "punchouts"])
    );

export const isMlbHitsProp = (pick: UserPick) =>
    isMlbSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["batter hits", "total hits", "hits recorded", " hits", "1+ hits", "2+ hits", "hits + runs + rbis"])
    );

export const isMlbRbiProp = (pick: UserPick) =>
    isMlbSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["rbi", "rbis", "runs batted in", "hits + runs + rbis"])
    );

export const isMlbTotalBasesProp = (pick: UserPick) =>
    isMlbSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["total bases", "total base"])
    );

export const isMlbHomeRunProp = (pick: UserPick) =>
    isMlbSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["home run", "home runs", "to hit a hr", " hr", "homer"])
    );

export const isNhlGoalsProp = (pick: UserPick) =>
    isNhlSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["goal scorer", "anytime goal", "to score a goal", "first goal", "goals"])
    );

export const isNhlAssistsProp = (pick: UserPick) =>
    isNhlSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["assists", " assist"])
    );

export const isNhlShotsProp = (pick: UserPick) =>
    isNhlSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["shots on goal", "shots on net", "sog", "shots"])
    );

export const isNhlPointsProp = (pick: UserPick) =>
    isNhlSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["player points", " points", "pts"])
    );

export const isNhlSavesProp = (pick: UserPick) =>
    isNhlSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["goalie saves", "saves", " save"])
    );

export const isSoccerGoalsProp = (pick: UserPick) =>
    isSoccerSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["goal scorer", "anytime goal", "to score", "first goal", "goals"])
    );

export const isSoccerAssistsProp = (pick: UserPick) =>
    isSoccerSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["assists", " assist"])
    );

export const isSoccerShotsProp = (pick: UserPick) =>
    isSoccerSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["shots on target", "shots on goal", "sot", "shots"])
    );

export const isSoccerCleanSheetProp = (pick: UserPick) =>
    isSoccerSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["clean sheet", "both teams to score", "btts"])
    );

export const isSoccerCardsProp = (pick: UserPick) =>
    isSoccerSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["bookings", "booking", "to be booked", "to be carded", "cards", " card"])
    );

export const isFootballPassingProp = (pick: UserPick) =>
    isFootballSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["passing yards", "passing tds", "passing touchdowns", "completions", "pass attempts"])
    );

export const isFootballRushingProp = (pick: UserPick) =>
    isFootballSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["rushing yards", "rushing tds", "rushing touchdowns", "rush attempts", "carries"])
    );

export const isFootballReceivingProp = (pick: UserPick) =>
    isFootballSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["receiving yards", "receiving tds", "receiving touchdowns", "receptions"])
    );

export const isTouchdownScorerProp = (pick: UserPick) =>
    isFootballSport(pick.sport) &&
    pickOrLegMatches(pick, (text) =>
        textIncludesAny(text, ["anytime td", "anytime touchdown", "first td", "first touchdown", "touchdown scorer"])
    );

export const detectBadgeMarketCategory = (pick: UserPick) => ({
    positiveOdds: hasPositiveOdds(pick),
    moneyline: isMoneylinePick(pick),
    spread: isSpreadPick(pick),
    total: isTotalPick(pick),
    nbaPoints: isNbaPointsProp(pick),
    nbaRebounds: isNbaReboundsProp(pick),
    nbaAssists: isNbaAssistsProp(pick),
    nbaThrees: isNbaThreesProp(pick),
    nbaComboStat: isNbaComboStatProp(pick),
    nbaDefensive: isNbaDefensiveProp(pick),
    footballPassing: isFootballPassingProp(pick),
    footballRushing: isFootballRushingProp(pick),
    footballReceiving: isFootballReceivingProp(pick),
    touchdownScorer: isTouchdownScorerProp(pick),
    mlbStrikeout: isMlbStrikeoutProp(pick),
    mlbHits: isMlbHitsProp(pick),
    mlbRbi: isMlbRbiProp(pick),
    mlbTotalBases: isMlbTotalBasesProp(pick),
    mlbHomeRun: isMlbHomeRunProp(pick),
    nhlGoals: isNhlGoalsProp(pick),
    nhlAssists: isNhlAssistsProp(pick),
    nhlShots: isNhlShotsProp(pick),
    nhlPoints: isNhlPointsProp(pick),
    nhlSaves: isNhlSavesProp(pick),
    soccerGoals: isSoccerGoalsProp(pick),
    soccerAssists: isSoccerAssistsProp(pick),
    soccerShots: isSoccerShotsProp(pick),
    soccerCleanSheet: isSoccerCleanSheetProp(pick),
    soccerCards: isSoccerCardsProp(pick),
});

export const getResolvedContestPicks = ({
    contest,
    slips,
    picks,
    excludedUserIds = [],
}: {
    contest: Contest;
    slips: Slip[];
    picks: UserPick[];
    excludedUserIds?: string[];
}): ResolvedContestPick[] => {
    const excluded = new Set(excludedUserIds);
    const contestSlips = slips.filter(
        (slip) =>
            slip.group_id === contest.group_id &&
            slip.isGraded &&
            slip.contest_id === contest.id &&
            isSlipFinal(slip)
    );
    const slipById = new Map(contestSlips.map((slip) => [slip.id, slip]));
    return picks
        .filter(
            (pick) =>
                slipById.has(pick.slip_id) &&
                !excluded.has(pick.user_id) &&
                (pick.result === "win" || pick.result === "loss")
        )
        .map((pick) => {
            const slip = slipById.get(pick.slip_id);
            if (!slip) return null;
            return {
                pick,
                slip,
                odds: parseAmericanOdds(pick.odds_bracket),
                reachedAt: pick.created_at ?? slip.finalized_at ?? slip.pick_deadline_at,
            };
        })
        .filter((entry): entry is ResolvedContestPick => Boolean(entry))
        .sort((a, b) => {
            const slipTime = new Date(a.slip.pick_deadline_at).getTime() - new Date(b.slip.pick_deadline_at).getTime();
            if (slipTime !== 0) return slipTime;
            const reached = a.reachedAt.localeCompare(b.reachedAt);
            if (reached !== 0) return reached;
            return a.pick.id.localeCompare(b.pick.id);
        });
};

const hasSportActivity = (category: ContestBadgeDefinition["category"], picks: ResolvedContestPick[]) => {
    if (category === "generic") return true;
    if (category === "football") return picks.some(({ pick }) => isFootballSport(pick.sport));
    if (category === "nba") return picks.some(({ pick }) => isNbaSport(pick.sport));
    if (category === "mlb") return picks.some(({ pick }) => isMlbSport(pick.sport));
    if (category === "nhl") return picks.some(({ pick }) => isNhlSport(pick.sport));
    if (category === "soccer") return picks.some(({ pick }) => isSoccerSport(pick.sport));
    return false;
};

export const getManageableBadgeDefinitions = (contest: Contest) => {
    const sports = new Set(contestSports(contest));
    return BADGE_CATALOG.filter((badge) => {
        if (badge.category === "generic") return true;
        return badge.eligibleSports.some((sport) => sports.has(normalizeKey(sport)));
    });
};

export const getActiveBadgeDefinitions = ({
    contest,
    slips,
    picks,
    settings = getAppliedBadgeSettings(contest),
}: {
    contest: Contest;
    slips: Slip[];
    picks: UserPick[];
    settings?: ContestBadgeSettings;
}) => {
    if (!settings.enabled) return [];
    const resolvedPicks = getResolvedContestPicks({
        contest,
        slips,
        picks,
        excludedUserIds: contest.excluded_member_ids,
    });
    const enabled = new Set(settings.enabledBadgeIds);
    return getManageableBadgeDefinitions(contest).filter(
        (badge) => enabled.has(badge.id) && hasSportActivity(badge.category, resolvedPicks)
    );
};

const countWinsByUser = (
    entries: ResolvedContestPick[],
    predicate: (pick: UserPick) => boolean
) => {
    const counts = new Map<string, { count: number; reachedAt: string; sport?: string; }>();
    entries.forEach((entry) => {
        if (entry.pick.result !== "win" || !predicate(entry.pick)) return;
        const current = counts.get(entry.pick.user_id) ?? { count: 0, reachedAt: entry.reachedAt };
        counts.set(entry.pick.user_id, {
            count: current.count + 1,
            reachedAt: entry.reachedAt,
            sport: entry.pick.sport ?? current.sport,
        });
    });
    return counts;
};

const winnerByCount = (
    entries: ResolvedContestPick[],
    predicate: (pick: UserPick) => boolean,
    minimum: number
) => {
    let holder: { userId: string; count: number; reachedAt: string; sport?: string; } | null = null;
    for (const [userId, record] of countWinsByUser(entries, predicate)) {
        if (record.count < minimum) continue;
        if (
            !holder ||
            record.count > holder.count ||
            (record.count === holder.count && record.reachedAt < holder.reachedAt)
        ) {
            holder = { userId, count: record.count, reachedAt: record.reachedAt, sport: record.sport };
        }
    }
    return holder;
};

export const formatBadgeValueLabel = (
    badge: ContestBadgeDefinition,
    value: number,
    extra?: { wins?: number; losses?: number }
) => {
    switch (badge.id) {
        case "biggest-hit":
            return `${formatOdds(value)} odds`;
        case "td-sniper":
            return `${formatOdds(value)} TD hit`;
        case "hot-hand":
            return `${value}-win streak`;
        case "accuracy-crown":
            return `${Math.round(value * 100)}% (${extra?.wins ?? 0}-${extra?.losses ?? 0})`;
        case "underdog-hunter":
            return `${plural(value, "underdog win")}`;
        case "spread-surgeon":
            return `${plural(value, "spread win")}`;
        case "dog-caller":
            return `${value} dog ML win${value === 1 ? "" : "s"}`;
        case "total-tactician":
            return `${plural(value, "total win")}`;
        default:
            return `${plural(value, "win")}`;
    }
};

export const getBadgeMarkToBeat = (badge: ContestBadgeDefinition, value?: number | null) => {
    if (value === null || value === undefined) {
        if (badge.id === "biggest-hit") return "+100 odds or higher";
        if (badge.id === "hot-hand") return "3 straight wins";
        if (badge.id === "accuracy-crown") return "4 resolved picks";
        if (badge.id === "td-sniper") return "1 TD scorer win";
        return `${badge.minimum} ${badge.minimum === 1 ? "win" : "wins"}`;
    }
    if (badge.id === "biggest-hit") return `${formatOdds(value + 1)} or higher`;
    if (badge.id === "td-sniper") return `${formatOdds(value + 1)} or higher TD hit`;
    if (badge.id === "hot-hand") return `${value + 1} straight wins`;
    if (badge.id === "accuracy-crown") return `Better than ${Math.round(value * 100)}%`;
    return `${value + 1} ${value + 1 === 1 ? "win" : "wins"}`;
};

const award = ({
    definition,
    settings,
    userId,
    value,
    valueLabel,
    reachedAt,
    sport,
    extra,
}: {
    definition: ContestBadgeDefinition;
    settings: ContestBadgeSettings;
    userId: string;
    value: number;
    valueLabel: string;
    reachedAt: string;
    sport?: string | null;
    extra?: Record<string, number | string>;
}): ContestBadgeAward => ({
    definition,
    userId,
    value,
    valueLabel,
    markToBeatLabel: getBadgeMarkToBeat(definition, value),
    points: getBadgePointValue(settings, definition.id),
    reachedAt,
    sport: sport ?? undefined,
    extra,
});

const calculateAwardForDefinition = (
    definition: BadgeCatalogDefinition,
    settings: ContestBadgeSettings,
    entries: ResolvedContestPick[]
): ContestBadgeAward | null => {
    const winningEntries = entries.filter((entry) => entry.pick.result === "win");

    if (definition.metric === "highest-positive-odds-win" || definition.metric === "td-scorer-positive-odds-win") {
        const predicate =
            definition.metric === "td-scorer-positive-odds-win"
                ? (pick: UserPick) => isTouchdownScorerProp(pick)
                : () => true;
        let holder: ResolvedContestPick | null = null;
        for (const entry of winningEntries) {
            if (entry.odds === null || entry.odds < definition.minimum || !predicate(entry.pick)) {
                continue;
            }
            if (
                !holder ||
                entry.odds > (holder.odds ?? Number.NEGATIVE_INFINITY) ||
                (entry.odds === holder.odds && entry.reachedAt < holder.reachedAt)
            ) {
                holder = entry;
            }
        }
        if (!holder || holder.odds === null) return null;
        return award({
            definition,
            settings,
            userId: holder.pick.user_id,
            value: holder.odds,
            valueLabel: formatBadgeValueLabel(definition, holder.odds),
            reachedAt: holder.reachedAt,
            sport: holder.pick.sport,
        });
    }

    if (definition.metric === "longest-win-streak") {
        const byUser = new Map<string, ResolvedContestPick[]>();
        entries.forEach((entry) => {
            byUser.set(entry.pick.user_id, [...(byUser.get(entry.pick.user_id) ?? []), entry]);
        });
        let holder: { userId: string; streak: number; reachedAt: string } | null = null;
        for (const [userId, userEntries] of byUser) {
            let current = 0;
            let best = 0;
            let reachedAt = "";
            userEntries.forEach((entry) => {
                if (entry.pick.result === "win") {
                    current += 1;
                    if (current > best) {
                        best = current;
                        reachedAt = entry.reachedAt;
                    }
                } else {
                    current = 0;
                }
            });
            if (
                best >= definition.minimum &&
                (!holder || best > holder.streak || (best === holder.streak && reachedAt < holder.reachedAt))
            ) {
                holder = { userId, streak: best, reachedAt };
            }
        }
        if (!holder) return null;
        return award({
            definition,
            settings,
            userId: holder.userId,
            value: holder.streak,
            valueLabel: formatBadgeValueLabel(definition, holder.streak),
            reachedAt: holder.reachedAt,
        });
    }

    if (definition.metric === "best-win-percentage") {
        const byUser = new Map<string, { wins: number; losses: number; reachedAt: string }>();
        entries.forEach((entry) => {
            const current = byUser.get(entry.pick.user_id) ?? { wins: 0, losses: 0, reachedAt: entry.reachedAt };
            byUser.set(entry.pick.user_id, {
                wins: current.wins + (entry.pick.result === "win" ? 1 : 0),
                losses: current.losses + (entry.pick.result === "loss" ? 1 : 0),
                reachedAt: entry.reachedAt,
            });
        });
        let holder: { userId: string; pct: number; wins: number; losses: number; reachedAt: string } | null = null;
        for (const [userId, record] of byUser) {
            const total = record.wins + record.losses;
            if (total < definition.minimum) continue;
            const pct = total > 0 ? record.wins / total : 0;
            if (
                !holder ||
                pct > holder.pct ||
                (pct === holder.pct && record.wins > holder.wins) ||
                (pct === holder.pct && record.wins === holder.wins && record.reachedAt < holder.reachedAt)
            ) {
                holder = { userId, pct, wins: record.wins, losses: record.losses, reachedAt: record.reachedAt };
            }
        }
        if (!holder) return null;
        return award({
            definition,
            settings,
            userId: holder.userId,
            value: holder.pct,
            valueLabel: formatBadgeValueLabel(definition, holder.pct, {
                wins: holder.wins,
                losses: holder.losses,
            }),
            reachedAt: holder.reachedAt,
            extra: { wins: holder.wins, losses: holder.losses },
        });
    }

    const countPredicates: Record<BadgeMetric, (pick: UserPick) => boolean> = {
        "positive-odds-win-count": hasPositiveOdds,
        "spread-win-count": isSpreadPick,
        "positive-odds-moneyline-win-count": (pick) => hasPositiveOdds(pick) && isMoneylinePick(pick),
        "total-win-count": isTotalPick,
        "football-passing-win-count": isFootballPassingProp,
        "football-rushing-win-count": isFootballRushingProp,
        "football-receiving-win-count": isFootballReceivingProp,
        "nba-points-win-count": isNbaPointsProp,
        "nba-rebounds-win-count": isNbaReboundsProp,
        "nba-assists-win-count": isNbaAssistsProp,
        "nba-threes-win-count": isNbaThreesProp,
        "nba-combo-stat-win-count": isNbaComboStatProp,
        "nba-defensive-win-count": isNbaDefensiveProp,
        "mlb-strikeout-win-count": isMlbStrikeoutProp,
        "mlb-hits-win-count": isMlbHitsProp,
        "mlb-rbi-win-count": isMlbRbiProp,
        "mlb-total-bases-win-count": isMlbTotalBasesProp,
        "mlb-homerun-win-count": isMlbHomeRunProp,
        "nhl-goals-win-count": isNhlGoalsProp,
        "nhl-assists-win-count": isNhlAssistsProp,
        "nhl-shots-win-count": isNhlShotsProp,
        "nhl-points-win-count": isNhlPointsProp,
        "nhl-saves-win-count": isNhlSavesProp,
        "soccer-goals-win-count": isSoccerGoalsProp,
        "soccer-assists-win-count": isSoccerAssistsProp,
        "soccer-shots-win-count": isSoccerShotsProp,
        "soccer-clean-sheet-win-count": isSoccerCleanSheetProp,
        "soccer-cards-win-count": isSoccerCardsProp,
        "highest-positive-odds-win": () => false,
        "longest-win-streak": () => false,
        "best-win-percentage": () => false,
        "td-scorer-positive-odds-win": () => false,
    };
    const holder = winnerByCount(entries, countPredicates[definition.metric], definition.minimum);
    if (!holder) return null;
    return award({
        definition,
        settings,
        userId: holder.userId,
        value: holder.count,
        valueLabel: formatBadgeValueLabel(definition, holder.count),
        reachedAt: holder.reachedAt,
        sport: holder.sport,
    });
};

export const calculateContestBadgeAwards = ({
    contest,
    slips,
    picks,
    excludedUserIds = [],
    settings = getAppliedBadgeSettings(contest),
}: {
    contest: Contest;
    slips: Slip[];
    picks: UserPick[];
    excludedUserIds?: string[];
    settings?: ContestBadgeSettings;
}): ContestBadgeAward[] => {
    if (!settings.enabled) return [];
    const entries = getResolvedContestPicks({ contest, slips, picks, excludedUserIds });
    const activeDefinitions = getActiveBadgeDefinitions({ contest, slips, picks, settings });
    return activeDefinitions
        .map((definition) => calculateAwardForDefinition(definition, settings, entries))
        .filter((entry): entry is ContestBadgeAward => Boolean(entry))
        .sort((a, b) => a.definition.id.localeCompare(b.definition.id));
};

export const getContestBadgeBonusByUser = (awards: ContestBadgeAward[]) => {
    const bonusByUser = new Map<string, number>();
    awards.forEach((award) => {
        bonusByUser.set(
            award.userId,
            applyBadgeBonusCap((bonusByUser.get(award.userId) ?? 0) + award.points)
        );
    });
    return bonusByUser;
};
