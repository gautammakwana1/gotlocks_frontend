"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ODDS_BRACKETS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils/date";
import { BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, League, NBASchedules, OddsBlazeOdd, OddsBlazePlayer, OddsBlazeTeam, OddsEvent, OddsObject, ParlayLeg, Pick, PickLeg, PickSelectionMeta, RootState, Slip } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { cleatNbaPickValidateMessage, fetchNBAOddsRequest, fetchNBAScheduleRequest, nbaPickValidateRequest } from "@/lib/redux/slices/nbaSlice";
import { useToast } from "@/lib/state/ToastContext";
import FootballAnimation from "../animations/FootballAnimation";
import { normalizeOddToLeg, validateAddLeg } from "@/lib/sgp/validateParlay";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS } from "@/lib/utils/games";
import { formatTierPrimary, getGroupTierForAmericanOdds, getTierForAmericanOdds, getTierMetaForPick, parseAmericanOdds, TierIndex } from "@/lib/utils/scoring";
import { canUserEditSlipPicks } from "@/lib/slips/state";

type GameOption = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    live: boolean;
    odds: OddsBlazeOdd[];
    homeAbbr: string;
    awayAbbr: string;
    marketCount: number;
    propCount: number;
    hasOdds: boolean;
};

type SelectedOdd = {
    odd: OddsBlazeOdd;
    game: GameOption;
};

type PointsTableRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    lines: Map<number, OddsBlazeOdd>;
};

type SpreadLineEntry = {
    home?: OddsBlazeOdd;
    away?: OddsBlazeOdd;
};

type TotalLineEntry = {
    over?: OddsBlazeOdd;
    under?: OddsBlazeOdd;
};

type ReviewListItem = {
    id: string;
    description?: string;
    odds?: string;
    sourceTabLabel: string;
    tierLine?: string;
    onEdit?: () => void;
    onDelete?: () => void;
};

type Props = {
    sport: League | string;
    group: Group;
    slip: Slip;
    currentUser: CurrentUser | null;
    picks: Pick[];
    initialPick?: Pick;
    onSave: (payload: BuiltPickPayload) => void;
    onCreatePostPick?: (payload: BuiltPickPayload) => void;
    // onSaveVibePick?: (payload: BuiltPickPayload) => void;
    onPostToSlip?: (payload: BuiltPickPayload) => void;
    // onPickOfDay?: (payload: BuiltPickPayload) => void;
    onCancel?: () => void;
    isCommissioner: boolean;
    showCurrentPick?: boolean;
    builderMode?: "post";
    draftPick?: DraftPick | null;
    onDraftPickChange?: (draftPick: DraftPick | null) => void;
    parlayLegs?: ParlayLeg[];
    onParlayLegsChange?: (
        legs: ParlayLeg[] | ((prev: ParlayLeg[]) => ParlayLeg[])
    ) => void;
    enforceEligibilityWindow?: boolean;
    activeDateKey?: string;
    onDateChange?: (key: string, source?: "user" | "auto") => void;
    allowAutoDateAdvance?: boolean;
    hideDateControls?: boolean;
    onDateOptionsChange?: (options: Array<{ key: string; label: string }>) => void;
};

const TAB_ORDER = [
    "GAME_LINES",
    "PLAYER_POINTS",
    "PLAYER_THREES",
    "PLAYER_REBOUNDS",
    "PLAYER_ASSISTS",
    "QUICK_BETS",
    "PLAYER_COMBOS",
    "PLAYER_DEFENSE",
] as const;

type TabId = (typeof TAB_ORDER)[number];

const TAB_LABELS: Record<TabId, string> = {
    GAME_LINES: "Game lines",
    PLAYER_POINTS: "Player points",
    PLAYER_THREES: "Player threes",
    PLAYER_REBOUNDS: "Player rebounds",
    PLAYER_ASSISTS: "Player assists",
    QUICK_BETS: "Quick bets",
    PLAYER_COMBOS: "Player combos",
    PLAYER_DEFENSE: "Player defense",
};

const ALT_POINTS_MARKET = "Alt Player Points";

const TAB_MARKETS: Record<TabId, string[]> = {
    GAME_LINES: [
        "Moneyline",
        "Point Spread",
        "Total Points",
        "First Basket",
        "Home Team First Basket",
        "Away Team First Basket",
    ],
    PLAYER_POINTS: [
        "Player Points",
        ALT_POINTS_MARKET,
        "1st Quarter Player Points",
        "1st 3 Minutes Player Points",
    ],
    PLAYER_THREES: ["Player Threes Made"],
    PLAYER_REBOUNDS: ["Player Rebounds"],
    PLAYER_ASSISTS: ["Player Assists"],
    QUICK_BETS: [
        "First Basket",
        "Home Team First Basket",
        "Away Team First Basket",
        "Top Points Scorer",
        "Total Points Odd/Even",
        "Overtime?",
        "1st Half Moneyline",
        "1st Half Point Spread",
        "1st Half Total Points",
        "1st Quarter Moneyline",
        "1st Quarter Point Spread",
        "1st Quarter Total Points",
        "2nd Quarter Moneyline",
        "2nd Quarter Point Spread",
        "2nd Quarter Total Points",
        "3rd Quarter Moneyline",
        "3rd Quarter Point Spread",
        "3rd Quarter Total Points",
        "4th Quarter Moneyline",
        "4th Quarter Point Spread",
        "4th Quarter Total Points",
    ],
    PLAYER_COMBOS: [
        "Player Points + Rebounds",
        "Player Points + Assists",
        "Player Rebounds + Assists",
        "Player Points + Rebounds + Assists",
        "Player Double Double",
        "Player Triple Double",
    ],
    PLAYER_DEFENSE: ["Player Steals", "Player Blocks"],
};

const tabForOdd = (odd: OddsBlazeOdd): TabId => {
    const entries = Object.entries(TAB_MARKETS) as [TabId, string[]][];
    for (const [tab, markets] of entries) {
        if (markets.includes(odd.market)) return tab;
    }
    return "GAME_LINES";
};

const TABLE_MARKETS = new Set<string>([
    ALT_POINTS_MARKET,
    "Player Points",
    "1st Quarter Player Points",
    "1st 3 Minutes Player Points",
    "Player Threes Made",
    "Player Rebounds",
    "Player Assists",
]);

const tierMetaFromIndex = (tier?: TierIndex) =>
    typeof tier === "number" ? ODDS_BRACKETS[tier - 1] : undefined;

const tierNameFromIndex = (tier?: TierIndex) =>
    tierMetaFromIndex(tier)?.name ?? "EVEN";

const tierLabelFromTier = (tier?: TierIndex) => tierNameFromIndex(tier);

const normalizeAbbr = (team: OddsBlazeTeam) =>
    team.abbreviation ?? team.name.split(" ").map((part) => part[0]).join("").slice(0, 3);

const buildGameOptions = (snapshot: NBASchedules[], odds: OddsObject[]): GameOption[] =>
    snapshot.map((event) => {
        const marketSet = new Set<string>();
        const playerSet = new Set<string>();
        odds.forEach((odd) => {
            marketSet.add(odd.market);
            if (odd.player?.id) playerSet.add(odd.player.id);
        });

        return {
            id: event.id,
            homeTeam: event.teams.home.name,
            awayTeam: event.teams.away.name,
            homeTeamId: event.teams.home.id,
            awayTeamId: event.teams.away.id,
            date: event.date,
            live: event.live,
            odds: odds,
            homeAbbr: normalizeAbbr(event.teams.home),
            awayAbbr: normalizeAbbr(event.teams.away),
            marketCount: marketSet.size,
            propCount: playerSet.size,
            hasOdds: odds.length > 0,
        };
    });

const buildScheduleOptions = (
    snapshot: NBASchedules[],
    existingKeys: Set<string>,
    existingIds: Set<string>
): GameOption[] =>
    snapshot.flatMap((event) => {
        if (existingIds.has(event.id)) return [];
        const key = `${event.date}|${event.teams.away.id}|${event.teams.home.id}`;
        if (existingKeys.has(key)) return [];
        return [
            {
                id: event.id,
                homeTeam: event.teams.home.name,
                awayTeam: event.teams.away.name,
                homeTeamId: event.teams.home.id,
                awayTeamId: event.teams.away.id,
                date: event.date,
                live: event.live,
                odds: [],
                homeAbbr: normalizeAbbr(event.teams.home),
                awayAbbr: normalizeAbbr(event.teams.away),
                marketCount: 0,
                propCount: 0,
                hasOdds: false,
            },
        ];
    });

const buildMergedGameOptions = (
    oddsSnapshot: OddsObject[],
    scheduleSnapshot: NBASchedules[]
): GameOption[] => {
    const oddsOptions = buildGameOptions(scheduleSnapshot, oddsSnapshot);
    const existingIds = new Set(oddsOptions.map((option) => option.id));
    const existingKeys = new Set(
        oddsOptions.map(
            (option) => `${option.date}|${option.awayTeamId}|${option.homeTeamId}`
        )
    );
    const scheduleOptions = buildScheduleOptions(
        scheduleSnapshot,
        existingKeys,
        existingIds
    );
    return [...oddsOptions, ...scheduleOptions].sort((a, b) =>
        a.date.localeCompare(b.date)
    );
};

type DateFilterOption = {
    key: string;
    label: string;
};

const toDateKey = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

const formatDateLabelFromKey = (key: string) => {
    const [year, month, day] = key.split("-").map((value) => Number(value));
    if (!year || !month || !day) return key;
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(new Date(year, month - 1, day));
};

const buildDateOptionsFromStart = (startDate: Date, days: number): DateFilterOption[] => {
    const options: DateFilterOption[] = [];
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, days);
    for (let i = 0; i < totalDays; i += 1) {
        const date = new Date(base);
        date.setDate(base.getDate() + i);
        const key = toDateKey(date.toISOString());
        if (!key) continue;
        options.push({ key, label: formatDateLabelFromKey(key) });
    }
    return options;
};

const buildStandaloneDateOptions = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return buildDateOptionsFromStart(start, 6);
};

const buildSlipWindowDateOptions = (
    pickDeadline: string | null | undefined,
    windowDays: number
) => {
    const start = pickDeadline ? new Date(pickDeadline) : new Date();
    if (Number.isNaN(start.getTime())) {
        const fallback = new Date();
        fallback.setHours(0, 0, 0, 0);
        return buildDateOptionsFromStart(fallback, Math.max(1, windowDays + 1));
    }
    start.setHours(0, 0, 0, 0);
    return buildDateOptionsFromStart(start, Math.max(1, windowDays + 1));
};

const matchupLabel = (game: GameOption) => `${game?.awayAbbr} @ ${game?.homeAbbr}`;

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "-";
    }
    return value > 0 ? `+${value}` : `${value}`;
};

const DASH_SEPARATOR = " \u2014 ";

const extractPickLine = (description: string | undefined) => {
    if (!description) return;
    const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
    const candidate = matchupSegment?.trim();
    const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
    if (hasMatchup && lineSegments.length > 0) {
        return lineSegments.join(DASH_SEPARATOR);
    }
    return description;
};

const toDecimalOdds = (american: number) =>
    american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);

const toAmericanOdds = (decimal: number) => {
    if (!Number.isFinite(decimal) || decimal <= 1) return null;
    if (decimal >= 2) return Math.round((decimal - 1) * 100);
    return Math.round(-100 / (decimal - 1));
};

const combineParlayOdds = (legs: ParlayLeg[]) => {
    if (legs.length === 0) return null;
    let decimal = 1;
    for (const leg of legs) {
        const american = parseAmericanOdds(leg.price);
        if (american === null) return null;
        decimal *= toDecimalOdds(american);
    }
    return toAmericanOdds(decimal);
};

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["HIGH", "MEDIUM", "LOW"];

const playerTeamLabel = (player: OddsBlazePlayer, game?: GameOption) => {
    if (player.team?.abbreviation) return player.team.abbreviation;
    if (player.team?.name) return player.team.name;
    if (game) {
        return player.team?.id === game.homeTeamId ? game.homeAbbr : game.awayAbbr;
    }
    return "";
};

const normalizeSide = (side?: string) => {
    if (!side) return undefined;
    const lower = side.toLowerCase();
    if (lower === "over") return "OVER";
    if (lower === "under") return "UNDER";
    return side;
};

const teamIdFromOdd = (odd: OddsBlazeOdd, game: GameOption) => {
    const candidate = odd.selection?.name ?? odd.name;
    if (!candidate) return undefined;
    const lower = candidate.toLowerCase();
    if (
        lower.includes(game.homeTeam.toLowerCase()) ||
        lower.startsWith(game.homeAbbr.toLowerCase())
    ) {
        return game.homeTeamId;
    }
    if (
        lower.includes(game.awayTeam.toLowerCase()) ||
        lower.startsWith(game.awayAbbr.toLowerCase())
    ) {
        return game.awayTeamId;
    }
    return undefined;
};

const buildPickDescription = (odd: OddsBlazeOdd, game: GameOption) => {
    const marketLabel = odd.market.replace("Player ", "");
    const side = odd.selection?.side;
    const line = odd.selection?.line;
    const matchup = matchupLabel(game);

    if (odd.player) {
        if (odd.market.includes("Double Double")) {
            return `${odd.player.name} to record a double-double`;
        }
        if (odd.market.includes("Triple Double")) {
            return `${odd.player.name} to record a triple-double`;
        }
        if (line !== undefined && side) {
            return `${odd.player.name} - ${side} ${line} ${marketLabel}`;
        }
        if (side) {
            return `${odd.player.name} - ${side} ${marketLabel}`;
        }
        return `${odd.player.name} - ${marketLabel}`;
    }

    if (odd.market.includes("Moneyline")) {
        const team = odd.selection?.name ?? odd.name;
        return `${team} Moneyline`;
    }
    if (odd.market.includes("Point Spread")) {
        const team = odd.selection?.name ?? odd.name;
        const spread =
            line !== undefined ? `${line > 0 ? "+" : ""}${line}` : odd.name.replace(team, "");
        return `${team} ${spread} Spread`.trim();
    }
    if (odd.market === "Total Points Odd/Even") {
        return `${matchup} - ${odd.name} total points`;
    }
    if (odd.market.includes("Total Points")) {
        if (side && line !== undefined) {
            return `${matchup} - ${side} ${line} ${odd.market}`;
        }
        return `${matchup} - ${odd.name} ${odd.market}`;
    }
    if (odd.market === "Overtime?") {
        const label = odd.selection?.side ?? odd.name;
        return `${matchup} - ${label} overtime`;
    }

    return `${odd.market} - ${odd.name}`;
};

const buildSelectionMeta = (odd: OddsBlazeOdd, game: GameOption): PickSelectionMeta => ({
    scope: odd.player ? "PLAYER_PROP" : "GAME_LINE",
    market: odd.market,
    gameId: game.id,
    gameStartTime: game.date,
    teamId: odd.player ? odd.player.team.id : teamIdFromOdd(odd, game),
    playerId: odd.player?.id,
    side: normalizeSide(odd.selection?.side),
    threshold: odd.selection?.line,
    home_team: game.homeTeam,
    away_team: game.awayTeam,
});

const findMatchingOdd = (games: GameOption[], pick?: Pick) => {
    if (!pick?.selection?.gameId || !pick.selection.market) return null;
    const game = games.find((candidate) => candidate.id === pick.selection?.gameId);
    if (!game) return null;
    const match = game.odds.find((odd) => {
        if (odd.market !== pick.selection?.market) return false;
        if (pick.selection?.playerId && odd.player?.id !== pick.selection.playerId) return false;
        if (pick.selection?.threshold !== undefined && odd.selection?.line !== pick.selection.threshold)
            return false;
        if (pick.selection?.side && normalizeSide(odd.selection?.side) !== pick.selection.side)
            return false;
        return true;
    });
    return match ? { odd: match, game } : null;
};

const buildSearchHaystack = (odd: OddsBlazeOdd, game: GameOption) => [
    odd.market,
    odd.name,
    odd.selection?.name,
    odd.selection?.side,
    odd.player?.name,
    odd.player?.team?.name,
    odd.player?.team?.abbreviation,
    game.homeTeam,
    game.awayTeam,
    game.homeAbbr,
    game.awayAbbr,
];

const compareOddsByLine = (a: SelectedOdd, b: SelectedOdd) => {
    const timeDiff =
        new Date(a.game.date).getTime() - new Date(b.game.date).getTime();
    if (timeDiff !== 0) return timeDiff;
    const nameA = a.odd.player?.name ?? a.odd.selection?.name ?? a.odd.name;
    const nameB = b.odd.player?.name ?? b.odd.selection?.name ?? b.odd.name;
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    const lineA = a.odd.selection?.line;
    const lineB = b.odd.selection?.line;
    if (lineA !== undefined && lineB !== undefined && lineA !== lineB) {
        return lineA - lineB;
    }
    return a.odd.name.localeCompare(b.odd.name);
};

const matchesTeamName = (odd: OddsBlazeOdd, teamName: string) => {
    const candidate = odd.selection?.name ?? odd.name;
    if (!candidate) return false;
    return candidate.toLowerCase() === teamName.toLowerCase();
};

const findMainTeamOdd = (
    game: GameOption,
    market: string,
    teamName: string
) =>
    game.odds.find(
        (odd) => odd.market === market && odd.main && matchesTeamName(odd, teamName)
    );

const findMainTotalOdd = (game: GameOption, side: "Over" | "Under") =>
    game.odds.find(
        (odd) =>
            odd.market === "Total Points" &&
            odd.main &&
            odd.selection?.side?.toLowerCase() === side.toLowerCase()
    );

const formatLineLabel = (line: number) => {
    const value = Number.isInteger(line) ? `${line}` : `${line}`;
    return `${value}+`;
};

const formatLineValue = (line?: number) => {
    if (line === undefined) return "-";
    return line > 0 ? `+${line}` : `${line}`;
};

const formatNumberLine = (line?: number) => {
    if (line === undefined) return "-";
    return `${line}`;
};

const LineScroller = ({
    lines,
    activeLine,
    onSelect,
    formatLine,
    locked,
}: {
    lines: number[];
    activeLine: number | null;
    onSelect: (line: number) => void;
    formatLine?: (line: number) => string;
    locked: boolean;
}) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const formatLabel = formatLine ?? formatNumberLine;

    useEffect(() => {
        if (!scrollerRef.current || activeLine === null) return;
        const scroller = scrollerRef.current;
        const target = scroller.querySelector<HTMLButtonElement>(
            `[data-line="${activeLine}"]`
        );
        if (!target) return;
        const frame = requestAnimationFrame(() => {
            const nextLeft =
                target.offsetLeft + target.offsetWidth / 2 - scroller.clientWidth / 2;
            scroller.scrollTo({ left: nextLeft, behavior: "auto" });
        });
        return () => cancelAnimationFrame(frame);
    }, [activeLine, lines]);

    if (lines.length === 0) return null;
    return (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03]">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/80 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/80 to-transparent" />
            <div ref={scrollerRef} className="flex gap-3 overflow-x-auto px-6 py-2">
                {lines.map((line) => {
                    const isActive = line === activeLine;
                    return (
                        <button
                            key={line}
                            type="button"
                            data-line={line}
                            onClick={() => onSelect(line)}
                            disabled={locked}
                            aria-pressed={isActive}
                            className={`min-w-[52px] rounded-full px-2 py-1 text-center transition ${isActive
                                ? "text-base font-semibold text-white"
                                : "text-sm text-gray-500 hover:text-gray-300"
                                }`}
                        >
                            {formatLabel(line)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const pickClosestLine = (lines: number[], preferred?: number) => {
    if (lines.length === 0) return null;
    if (preferred === undefined) return lines[Math.floor(lines.length / 2)] ?? null;
    return lines.reduce((closest, current) => {
        const closestDiff = Math.abs(closest - preferred);
        const currentDiff = Math.abs(current - preferred);
        if (currentDiff < closestDiff) return current;
        return closest;
    }, lines[0]);
};

const buildPointsTable = (
    odds: SelectedOdd[],
    game: GameOption,
    side: "Over" | "Under",
    options?: { normalizeToFive?: boolean }
) => {
    const normalizeLine = options?.normalizeToFive
        ? (value: number) => Math.round(value / 5) * 5
        : (value: number) => value;
    const lineSet = new Set<number>();
    const rowMap = new Map<string, PointsTableRow>();
    const sideLower = side.toLowerCase();

    odds.forEach(({ odd }) => {
        if (!odd.player) return;
        const line = odd.selection?.line;
        const oddSide = odd.selection?.side?.toLowerCase();
        if (line === undefined || !oddSide || oddSide !== sideLower) return;

        const normalizedLine = normalizeLine(line);
        lineSet.add(normalizedLine);
        const player = odd.player;
        if (!rowMap.has(player.id)) {
            const teamLabel = playerTeamLabel(player, game);
            rowMap.set(player.id, {
                player,
                teamLabel,
                lines: new Map(),
            });
        }

        const row = rowMap.get(player.id);
        if (!row) return;

        const existing = row.lines.get(normalizedLine);
        const currentDiff = Math.abs(line - normalizedLine);
        const existingDiff =
            existing?.selection?.line !== undefined
                ? Math.abs(existing.selection.line - normalizedLine)
                : Number.POSITIVE_INFINITY;
        if (!existing || currentDiff <= existingDiff) {
            row.lines.set(normalizedLine, odd);
        }
    });

    const lines = [...lineSet].sort((a, b) => a - b);
    const rows = [...rowMap.values()].sort((a, b) =>
        a.player.name.localeCompare(b.player.name)
    );

    return { lines, rows };
};

const buildSimplePropRows = (
    odds: SelectedOdd[],
    game: GameOption,
    side: "Over" | "Under"
) => {
    const rowMap = new Map<string, { odd: OddsBlazeOdd; line?: number }>();
    const sideLower = side.toLowerCase();

    odds.forEach(({ odd }) => {
        if (!odd.player) return;
        const line = odd.selection?.line;
        const oddSide = odd.selection?.side?.toLowerCase();
        if (oddSide !== sideLower) return;

        const existing = rowMap.get(odd.player.id);
        if (!existing) {
            rowMap.set(odd.player.id, { odd, line });
            return;
        }

        if (!existing.odd.main && odd.main) {
            rowMap.set(odd.player.id, { odd, line });
        }
    });

    const rows = [...rowMap.values()]
        .map(({ odd, line }) => {
            const player = odd.player as OddsBlazePlayer;
            const teamLabel = playerTeamLabel(player, game);
            return { player, teamLabel, line, odd };
        })
        .sort((a, b) => a.player.name.localeCompare(b.player.name));

    return rows;
};

const buildMainPointsRows = (odds: SelectedOdd[], game: GameOption) => {
    const rowMap = new Map<
        string,
        {
            player: OddsBlazePlayer;
            teamLabel: string;
            line?: number;
            over?: OddsBlazeOdd;
            under?: OddsBlazeOdd;
        }
    >();

    odds.forEach(({ odd }) => {
        if (!odd.player || !odd.main) return;
        const side = odd.selection?.side?.toLowerCase();
        const line = odd.selection?.line;
        const player = odd.player;
        if (!rowMap.has(player.id)) {
            const teamLabel = playerTeamLabel(player, game);
            rowMap.set(player.id, {
                player,
                teamLabel,
                line,
                over: undefined,
                under: undefined,
            });
        }

        const entry = rowMap.get(player.id);
        if (!entry) return;

        if (line !== undefined && entry.line === undefined) {
            entry.line = line;
        }
        if (side === "over") entry.over = odd;
        if (side === "under") entry.under = odd;
    });

    return [...rowMap.values()].sort((a, b) => a.player.name.localeCompare(b.player.name));
};

export const NbaPickBuilder = ({
    sport,
    slip,
    currentUser,
    picks,
    initialPick,
    onSave,
    onPostToSlip,
    onCreatePostPick,
    showCurrentPick = false,
    builderMode,
    draftPick,
    onDraftPickChange,
    parlayLegs: externalParlayLegs,
    onParlayLegsChange,
    enforceEligibilityWindow = false,
    activeDateKey,
    onDateOptionsChange,
}: Props) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>("GAME_LINES");
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [pointsSideByMarket, setPointsSideByMarket] = useState<
        Record<string, "Over" | "Under">
    >({});
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [selected, setSelected] = useState<SelectedOdd | null>(null);
    const [altSpreadLine, setAltSpreadLine] = useState<number | null>(null);
    const [altTotalLine, setAltTotalLine] = useState<number | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
    const [localParlayLegs, setLocalParlayLegs] = useState<ParlayLeg[]>([]);
    const parlayLegs = externalParlayLegs ?? localParlayLegs;
    const setParlayLegs = onParlayLegsChange ?? setLocalParlayLegs;
    const isPostMode = builderMode === "post";
    const isParlayMode = !slip.isGraded;
    const useGroupScoring = false;
    const confirmationVariant: "post" | "slip" = isPostMode ? "post" : "slip";
    const windowDays = slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS;
    const resolveTierMetaForOdds = (americanOdds: number) =>
        useGroupScoring
            ? getGroupTierForAmericanOdds(americanOdds)
            : getTierForAmericanOdds(americanOdds);
    const [nbaMatchSchedules, setNBAMatchSchedules] = useState<NBASchedules[]>([]);
    const [oddsData, setOddsData] = useState<OddsObject[]>([]);
    // const [selectedMatch, setSelectedMatch] = useState<GameOption>();

    const { nbaSchedules, nbaOdds, validatePickMessage, validatePickError, loading, validateLoading } = useSelector((state: RootState) => state.nba);

    const currentPick = useMemo(() => {
        if (initialPick) return initialPick;
        if (!showCurrentPick) return undefined;
        if (slip.pick_limit === 1) {
            return picks.find(
                (entry) => entry.slip_id === slip.id && entry.user_id === currentUser?.userId
            );
        }
        return undefined;
    }, [initialPick, showCurrentPick, picks, slip.id, slip.pick_limit, currentUser?.userId]);

    useEffect(() => {
        if (slip?.results_deadline_at && slip?.pick_deadline_at) {
            const resultDate = new Date(slip.results_deadline_at).toISOString().split('T')[0];
            const pickDate = new Date(slip.pick_deadline_at).toISOString().split('T')[0];
            dispatch(fetchNBAScheduleRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate) }));
        }
    }, [dispatch, slip?.pick_deadline_at, slip?.results_deadline_at]);
    useEffect(() => {
        if (activeDateKey) {
            dispatch(fetchNBAScheduleRequest({ date: activeDateKey }));
        } else {
            dispatch(fetchNBAScheduleRequest({ is_pick_of_day: true }));
        }
    }, [activeDateKey, dispatch]);
    useEffect(() => {
        if (Array.isArray(nbaSchedules?.events) && nbaSchedules?.events?.length) {
            setNBAMatchSchedules(nbaSchedules?.events);
        }
        if (nbaOdds?.events[0]?.odds) {
            setOddsData(nbaOdds?.events[0].odds);
        }
    }, [nbaSchedules, nbaOdds]);

    const games = useMemo<GameOption[]>(() => {
        if (!nbaMatchSchedules) return [];
        return buildMergedGameOptions(oddsData, nbaMatchSchedules);
    }, [nbaMatchSchedules, oddsData]);
    // const upcomingGames = useMemo(() => {
    //     const base = games.filter((game) => !game.live && !isPast(game.date));
    //     if (!enforceEligibilityWindow && !isPodMode) {
    //         return filterUpcomingWindowGames(base, 6, false);
    //     }
    //     return base;
    // }, [enforceEligibilityWindow, games, isPodMode]);
    // const eligibleGames = useMemo(() => {
    //     if (!enforceEligibilityWindow) return upcomingGames;
    //     return filterEligibleGames(upcomingGames, slip.pick_deadline_at, windowDays);
    // }, [enforceEligibilityWindow, upcomingGames, slip.pick_deadline_at, windowDays]);

    const todayIso = useMemo(() => new Date().toISOString(), []);
    const visibleGames = useMemo(() => {
        return games.filter(
            (game) => {
                return game
            }
        );
    }, [games]);
    // const visibleGames = useMemo(() => {
    //     if (!isPodMode) return eligibleGames;
    //     return eligibleGames.filter((game) => isSameDay(game.date, todayIso));
    // }, [eligibleGames, isPodMode, todayIso]);
    const shouldFilterByDate = true;
    // const showDateFilters = shouldFilterByDate && !hideDateControls;
    const todayKey = useMemo(() => toDateKey(todayIso), [todayIso]);
    const selectedDateKey = activeDateKey?.trim() || "";
    const dateOptions = useMemo(() => {
        if (!shouldFilterByDate) return [];
        const options = enforceEligibilityWindow
            ? buildSlipWindowDateOptions(slip.pick_deadline_at, windowDays)
            : buildStandaloneDateOptions();
        if (!todayKey) return options;
        return options.map((option) =>
            option.key === todayKey ? { ...option, label: "Today" } : option
        );
    }, [enforceEligibilityWindow, shouldFilterByDate, slip.pick_deadline_at, todayKey, windowDays]);
    const isSelectedDateValid = useMemo(
        () => dateOptions.some((option) => option.key === selectedDateKey),
        [dateOptions, selectedDateKey]
    );
    const effectiveDateKey = isSelectedDateValid
        ? selectedDateKey
        : dateOptions[0]?.key ?? "";
    // const dateKeysWithGames = useMemo(() => {
    //     const keys = new Set<string>();
    //     visibleGames.forEach((game) => {
    //         const key = toDateKey(game.date);
    //         if (!key) return;
    //         keys.add(key);
    //     });
    //     return keys;
    // }, [visibleGames]);
    const filteredGames = useMemo(() => {
        if (!shouldFilterByDate || !effectiveDateKey) return visibleGames;
        return visibleGames.filter((game) => {
            if (toDateKey(game.date) === effectiveDateKey) {
                return game
            }
        });
    }, [effectiveDateKey, visibleGames, shouldFilterByDate]);
    const noGamesForSelectedDate =
        shouldFilterByDate && dateOptions.length > 0 && filteredGames.length === 0;

    useEffect(() => {
        if (!onDateOptionsChange) return;
        onDateOptionsChange(shouldFilterByDate ? dateOptions : []);
    }, [dateOptions, onDateOptionsChange, shouldFilterByDate]);

    // useEffect(() => {
    //     if (!shouldFilterByDate || !onDateChange || !allowAutoDateAdvance) return;
    //     if (dateOptions.length === 0 || isSelectedDateValid) return;
    //     onDateChange(dateOptions[0].key, "auto");
    // }, [
    //     allowAutoDateAdvance,
    //     dateOptions,
    //     isSelectedDateValid,
    //     onDateChange,
    //     shouldFilterByDate,
    // ]);

    // useEffect(() => {
    //     if (!shouldFilterByDate || !onDateChange || !allowAutoDateAdvance) return;
    //     if (!effectiveDateKey || dateKeysWithGames.size === 0) return;
    //     if (dateKeysWithGames.has(effectiveDateKey)) return;
    //     const nextOption = dateOptions.find((option) => dateKeysWithGames.has(option.key));
    //     if (!nextOption) return;
    //     onDateChange(nextOption.key, "auto");
    // }, [
    //     allowAutoDateAdvance,
    //     dateKeysWithGames,
    //     dateOptions,
    //     effectiveDateKey,
    //     onDateChange,
    //     shouldFilterByDate,
    // ]);

    useEffect(() => {
        if (!currentPick) return;
        const match = findMatchingOdd(games, currentPick);
        if (match) {
            setSelected(match);
            setActiveGameId(match.game.id);
        }
    }, [currentPick, games]);

    useEffect(() => {
        if (!isParlayMode) {
            setParlayLegs([]);
        }
    }, [isParlayMode]);

    useEffect(() => {
        if (!validateLoading && validatePickMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: validatePickMessage,
                duration: 3000
            });
            dispatch(cleatNbaPickValidateMessage());
        }
        if (!validateLoading && validatePickError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: validatePickError,
                duration: 3000
            });
            dispatch(cleatNbaPickValidateMessage());
        }
    }, [dispatch, validateLoading, validatePickMessage, validatePickError, setToast]);

    const smoothScrollTo = (
        element: HTMLElement,
        target: number,
        duration = 400
    ) => {
        const start = element.scrollLeft;
        const distance = target - start;
        let startTime: number | null = null;

        const animate = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            const ease =
                progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            element.scrollLeft = start + distance * ease;

            if (timeElapsed < duration) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    };

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab)
        setTimeout(() => {
            const container = document.querySelector('#game-prop-details-tabs-container') as HTMLDivElement;
            const activeTab = document.querySelector('#game-prop-details-tabs-container button.active') as HTMLButtonElement;

            if (container && activeTab) {
                const containerRect = container.getBoundingClientRect();
                const tabRect = activeTab.getBoundingClientRect();

                const scrollLeft = container.scrollLeft;
                const offset = tabRect.left - containerRect.left + scrollLeft - (containerRect.width / 2) + (tabRect.width / 2);

                smoothScrollTo(container, offset, 600)
            }
        }, 100);
    }

    const locked = !currentUser || !canUserEditSlipPicks(slip);

    const activeGame = useMemo(
        () => visibleGames.find((game) => game.id === activeGameId) ?? null,
        [activeGameId, visibleGames]
    );

    const activeMarketMap = useMemo(() => {
        if (!activeGame) return new Map<string, SelectedOdd[]>();
        const markets = TAB_MARKETS[activeTab];
        const isPointsTab = activeTab === "PLAYER_POINTS";
        const term = search.trim().toLowerCase();
        const marketMap = new Map<string, SelectedOdd[]>();
        markets.forEach((market) => marketMap.set(market, []));

        oddsData.forEach((odd) => {
            let bucketKey: string | null = null;
            if (isPointsTab && odd.market === "Player Points") {
                bucketKey = odd.main ? "Player Points" : ALT_POINTS_MARKET;
            } else if (markets.includes(odd.market)) {
                bucketKey = odd.market;
            }
            if (!bucketKey || !marketMap.has(bucketKey)) return;
            if (term) {
                const haystack = buildSearchHaystack(odd, activeGame)
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(term)) return;
            }
            const bucket = marketMap.get(bucketKey);
            if (bucket) bucket.push({ odd, game: activeGame });
        });

        marketMap.forEach((list) => list.sort(compareOddsByLine));
        return marketMap;
    }, [activeGame, activeTab, search, oddsData]);

    const buildDraftPick = useCallback(
        (odd: OddsBlazeOdd, game: GameOption): DraftPick => {
            const description = buildPickDescription(odd, game);
            const americanOdds = parseAmericanOdds(odd.price);
            const tierMeta = americanOdds !== null ? resolveTierMetaForOdds(americanOdds) : undefined;
            const odds = formatOdds(americanOdds ?? odd.price);
            const difficultyLabel = tierMeta ? tierLabelFromTier(tierMeta.tier) : null;
            const points = tierMeta?.points;
            const selectionMeta = buildSelectionMeta(odd, game);
            const sourceTab = TAB_LABELS[tabForOdd(odd)];
            const line = odd.selection?.line;
            const side = odd.selection?.side;
            const lineLabel =
                line !== undefined && side
                    ? `${side} ${line}`
                    : line !== undefined
                        ? `Line ${line}`
                        : side ?? null;
            const external_pick_key = odd.id;

            return {
                sport,
                description,
                odds,
                // difficulty_label: slip.isGraded ? null : difficultyLabel,
                difficulty_label: difficultyLabel,
                buildMode: "ODDS",
                points,
                selection: selectionMeta,
                summary: description,
                matchup: matchupLabel(game),
                match_date: game.date,
                odds_bracket: odds,
                market: odd.market,
                lineLabel,
                displayDifficulty: tierMeta ? formatTierPrimary(tierMeta.tier) : undefined,
                source: sport,
                external_pick_key,
                difficultyTier: tierMeta ? tierMeta.tier : undefined,
                sourceTab,
            };
        }, [sport, slip.isGraded]
    );

    const localDraft = useMemo(
        () => (selected ? buildDraftPick(selected.odd, selected.game) : null),
        [selected, buildDraftPick]
    );
    const hasMultipick = isParlayMode && parlayLegs.length > 1;
    const comboOddsValue = useMemo(
        () => (hasMultipick ? combineParlayOdds(parlayLegs) : null),
        [hasMultipick, parlayLegs]
    );
    const comboTierMeta =
        comboOddsValue !== null ? resolveTierMetaForOdds(comboOddsValue) : null;
    const comboLegs: PickLeg[] = useMemo(
        () =>
            parlayLegs.map((leg) => {
                const game = games.find((option) => option.id === leg.eventId);
                const matchup = game ? matchupLabel(game) : leg.matchup ?? null;
                const startTime = game?.date ?? leg.startTime;
                return {
                    description: matchup
                        ? `${matchup}${DASH_SEPARATOR}${leg.displayName}`
                        : leg.displayName,
                    odds_bracket: formatOdds(leg.price),
                    selection: {
                        gameId: leg.eventId,
                        market: leg.market,
                        playerId: leg.playerId,
                        side: normalizeSide(leg.side),
                        threshold: leg.line,
                        gameStartTime: startTime,
                        external_pick_key: leg.id
                    },
                };
            }),
        [games, parlayLegs]
    );
    const comboSport = useMemo(() => {
        const uniqueSports = Array.from(
            new Set(parlayLegs.map((leg) => leg.sport).filter(Boolean))
        );
        if (uniqueSports.length === 1) return uniqueSports[0] as League | string;
        if (uniqueSports.length > 1) return "Combo";
        return sport;
    }, [parlayLegs, sport]);
    const comboDraft = useMemo(() => {
        if (!hasMultipick) return null;
        const description = comboLegs.map((leg) => leg.description).join(" + ");
        const summaryLabel = description ? `Combo: ${description}` : "Combo pick";
        const oddsLabel = comboOddsValue === null ? "-" : formatOdds(comboOddsValue);
        const payloadOdds =
            comboOddsValue === null ? null : formatOdds(comboOddsValue);
        const difficultyLabel = slip.isGraded
            ? null
            : comboTierMeta
                ? tierLabelFromTier(comboTierMeta.tier)
                : null;

        return {
            sport: comboSport,
            description: summaryLabel,
            odds: payloadOdds ?? undefined,
            difficulty_label: difficultyLabel,
            buildMode: "ODDS",
            points: comboTierMeta?.points,
            isCombo: true,
            legs: comboLegs,
            summary: summaryLabel,
            matchup: matchupLabel(activeGame!),
            match_date: activeGame?.date,
            odds_bracket: oddsLabel,
            market: "Combo",
            lineLabel: null,
            displayDifficulty: comboTierMeta
                ? formatTierPrimary(comboTierMeta.tier)
                : undefined,
            source: comboSport,
            confidence: "MEDIUM",
            difficultyTier: comboTierMeta?.tier,
            sourceTab: "Combo",
        } satisfies DraftPick;
    }, [comboLegs, comboOddsValue, comboTierMeta, hasMultipick, slip.isGraded, comboSport, activeGame]);

    const activeDraft = comboDraft ?? localDraft ?? draftPick ?? null;
    const reviewDrafts = useMemo(() => (activeDraft ? [activeDraft] : []), [activeDraft]);
    const hasMultiSelection = hasMultipick;
    const multiSelectionCount = hasMultipick ? parlayLegs.length : reviewDrafts.length;
    const showReviewSheet = Boolean(activeDraft);
    const postActionLabel = hasMultipick ? "post combo" : "post pick";
    const activeDraftKey = useMemo(() => {
        if (!activeDraft) return "";
        return JSON.stringify({
            summary: activeDraft.summary,
            odds: activeDraft.odds,
            difficultyLabel: activeDraft.difficulty_label,
            points: activeDraft.points,
            // selection: activeDraft.selection,
            isCombo: activeDraft.isCombo,
            // legs: activeDraft.legs?.map((leg) => ({
            //     description: leg.description,
            //     odds: leg.odds,
            //     selection: leg.selection,
            // })),
        });
    }, [activeDraft]);
    const lastDraftKeyRef = useRef<string>("");

    useEffect(() => {
        if (!activeDraft) return;
        if (activeDraftKey === lastDraftKeyRef.current) return;
        lastDraftKeyRef.current = activeDraftKey;
        onDraftPickChange?.(activeDraft);
    }, [activeDraft, activeDraftKey, onDraftPickChange]);

    useEffect(() => {
        if (!showReviewSheet) {
            setIsReviewOpen(false);
        }
    }, [showReviewSheet]);

    // useEffect(() => {
    //     if (!activeDraft?.payload.confidence) return;
    //     setSelectedConfidence(activeDraft.payload.confidence);
    // }, [activeDraft?.payload.confidence]);

    const isOddSelected = (odd?: OddsBlazeOdd | null) => {
        if (!odd) return false;
        if (isParlayMode) return parlayLegs.some((leg) => leg.id === odd.id);
        return selected?.odd.id === odd.id;
    };

    const findLegContext = (leg: ParlayLeg) => {
        const targetGame =
            visibleGames.find((game) => game.id === leg.eventId) ??
            games.find((game) => game.id === leg.eventId);
        if (!targetGame) return null;
        const targetOdd = targetGame.odds.find((odd) => odd.id === leg.id);
        if (!targetOdd) return null;
        return { game: targetGame, odd: targetOdd };
    };

    const handleEditParlayLeg = (leg: ParlayLeg) => {
        const context = findLegContext(leg);
        if (!context) return;
        setActiveGameId(context.game.id);
        setActiveTab(tabForOdd(context.odd));
        handleSelectOdd(context.odd, context.game, { skipParlay: true, forceSelect: true });
    };

    const handleRemoveParlayLeg = (legId: string) => {
        const remainingLegs = parlayLegs.filter((leg) => leg.id !== legId);
        setParlayLegs(remainingLegs);
        if (remainingLegs.length === 0) {
            onDraftPickChange?.(null);
            setSelected(null);
            return;
        }
        if (selected?.odd.id !== legId) return;
        const fallbackLeg =
            (activeGame
                ? remainingLegs.find((leg) => leg.eventId === activeGame.id)
                : undefined) ?? remainingLegs[remainingLegs.length - 1];
        if (fallbackLeg) {
            const fallbackContext = findLegContext(fallbackLeg);
            if (fallbackContext) {
                handleSelectOdd(fallbackContext.odd, fallbackContext.game, {
                    skipParlay: true,
                    forceSelect: true,
                });
                return;
            }
        }
        if (draftPick?.source === sport) {
            onDraftPickChange?.(null);
        }
        setSelected(null);
    };

    const reviewListItems: ReviewListItem[] = hasMultipick
        ? parlayLegs.map((leg) => {
            const legContext = findLegContext(leg);
            const sourceTabLabel = legContext
                ? TAB_LABELS[tabForOdd(legContext.odd)]
                : "Pick";
            const legTierMeta = getTierMetaForPick({
                odds: leg.price,
                mode: "global",
            });
            const legTierPrimary = legTierMeta
                ? formatTierPrimary(legTierMeta.tier)
                : "Tier —";
            const legTierName = legTierMeta?.name ?? "—";
            const legPoints = legTierMeta?.points;
            const legTierLine = `${legTierPrimary}${typeof legPoints === "number" ? ` · ${legPoints} pts` : ""
                }${legTierName && legTierName !== "—" ? ` · ${legTierName}` : ""}`;
            return {
                id: leg.id,
                description: leg.displayName,
                odds: leg.price,
                sourceTabLabel,
                tierLine: legTierLine,
                onEdit: () => handleEditParlayLeg(leg),
                onDelete: () => handleRemoveParlayLeg(leg.id),
            };
        })
        : activeDraft
            ? [
                {
                    id: activeDraft.summary ?? "selected-pick",
                    description: activeDraft.summary,
                    odds: activeDraft.odds_bracket ?? activeDraft.odds,
                    sourceTabLabel: activeDraft.sourceTab ?? "Pick",
                },
            ]
            : [];

    const handleSelectOdd = (
        odd: OddsBlazeOdd,
        game: GameOption,
        options?: { skipParlay?: boolean; forceSelect?: boolean }
    ) => {
        if (locked) return;
        const skipParlay = options?.skipParlay ?? false;
        const forceSelect = options?.forceSelect ?? false;
        if (isParlayMode && !skipParlay) {
            const eventForLeg: OddsEvent = {
                id: game.id,
                teams: {
                    home: {
                        id: game.homeTeamId,
                        name: game.homeTeam,
                        abbreviation: game.homeAbbr,
                    },
                    away: {
                        id: game.awayTeamId,
                        name: game.awayTeam,
                        abbreviation: game.awayAbbr,
                    },
                },
                date: game.date,
                live: game.live,
                odds: game.odds as OddsEvent["odds"],
            };
            const matchup = matchupLabel(game);
            const incomingLeg = {
                ...normalizeOddToLeg(eventForLeg, {
                    ...odd,
                    sgp: odd.sgp ?? "",
                    selection: odd.selection
                        ? {
                            ...odd.selection,
                            side: odd.selection.side as "Over" | "Under" | undefined,
                        }
                        : undefined,
                }),
                sport,
                matchup,
                startTime: game.date,
            };
            const existingLeg = parlayLegs.find((leg) => leg.id === incomingLeg.id);
            if (!existingLeg) {
                if (game.id && odd.id) {
                    dispatch(nbaPickValidateRequest({ match_id: game.id, external_pick_key: odd.id }));
                }
            }
            if (existingLeg) {
                const remainingLegs = parlayLegs.filter((leg) => leg.id !== incomingLeg.id);
                setParlayLegs(remainingLegs);
                if (selected?.odd.id === incomingLeg.id) {
                    const fallbackLeg =
                        (activeGame
                            ? remainingLegs.find((leg) => leg.eventId === activeGame.id)
                            : undefined) ?? remainingLegs[remainingLegs.length - 1];
                    if (fallbackLeg) {
                        const fallbackContext = findLegContext(fallbackLeg);
                        if (fallbackContext) {
                            handleSelectOdd(fallbackContext.odd, fallbackContext.game, {
                                skipParlay: true,
                                forceSelect: true,
                            });
                            return;
                        }
                    }
                    if (draftPick?.source === sport) {
                        onDraftPickChange?.(null);
                    }
                    setSelected(null);
                }
                return;
            }
            const validationResult = validateAddLeg(parlayLegs, incomingLeg);
            if (!validationResult.ok) {
                setToast({
                    id: Date.now(),
                    type: "error",
                    message: validationResult.reason,
                    duration: 3000
                })
                return;
            }
            setParlayLegs((prev) => [...prev, incomingLeg]);
            const nextDraft = buildDraftPick(odd, game);
            onDraftPickChange?.(nextDraft);
            setSelected({ odd, game });
            return;
        }
        if (!forceSelect && selected?.odd.id === odd.id) {
            setSelected(null);

            if (draftPick?.source === sport) {
                onDraftPickChange?.(null);
            }
            return;
        }
        const nextDraft = buildDraftPick(odd, game);

        setSelected({ odd, game });
        onDraftPickChange?.(nextDraft);
    };

    const isSectionCollapsed = (key: string, defaultOpen = true) =>
        collapsedSections[key] ?? !defaultOpen;

    const toggleSection = (key: string, defaultOpen = true) => {
        setCollapsedSections((prev) => {
            const current = prev[key] ?? !defaultOpen;
            return { ...prev, [key]: !current };
        });
    };

    const buildParlayLegPayloads = () => {
        const payloads: BuiltPickPayload[] = [];
        for (const leg of parlayLegs) {
            const context = findLegContext(leg);
            if (!context) return null;
            payloads.push(buildDraftPick(context.odd, context.game));
        }
        return payloads;
    };

    const submitPick = (action: "post" | "slip") => {
        if (locked) return;

        if (action === "post" && !selectedConfidence) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Select a confidence level to post.",
                duration: 3000
            });
            return;
        }

        const handler = action === "post"
            ? onCreatePostPick ?? onSave
            : onPostToSlip ?? onSave;

        if (hasMultipick) {
            if (action === "post") {
                if (!activeDraft) return;
                handler({
                    ...activeDraft,
                    confidence: selectedConfidence ?? activeDraft.confidence ?? null,
                });
                return;
            }

            const payloads = buildParlayLegPayloads();
            if (!payloads || payloads.length === 0) {
                setToast({
                    id: Date.now(),
                    type: "error",
                    message: "Couldn't build your picks. Please try again.",
                    duration: 3000
                });
                return;
            }

            if (slip.pick_limit !== "unlimited") {
                const existingCount = picks.filter(
                    (entry) => entry.slip_id === slip.id && entry.user_id === currentUser.userId
                ).length;
                const isEditing =
                    Boolean(
                        initialPick &&
                        initialPick.slip_id === slip.id &&
                        initialPick.user_id === currentUser.userId
                    );
                const adjustedCount = isEditing
                    ? Math.max(0, existingCount - 1)
                    : existingCount;
                if (adjustedCount + payloads.length > slip.pick_limit) {
                    setToast({
                        id: Date.now(),
                        type: "error",
                        message: "Pick limit reached for this slip.",
                        duration: 3000
                    });

                    return;
                }
            }

            payloads.forEach((payload) => {
                handler({
                    ...payload,
                    confidence: selectedConfidence ?? payload.confidence ?? null,
                });
            });
            return;
        }
        if (!activeDraft) return;

        handler({
            ...activeDraft,
            confidence:
                action === "post"
                    ? selectedConfidence ?? activeDraft.confidence ?? null
                    : null,
        });
    };

    const buildOddsBoxClasses = (
        base: string,
        selected?: boolean,
        muted?: boolean
    ) => {
        if (muted) {
            return `${base} border-white/10 text-gray-500`;
        }
        if (selected) {
            return `${base} border-emerald-300/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]`;
        }
        return `${base} border-emerald-400/50 text-emerald-200 hover:border-emerald-300/70`;
    };

    const oddsBoxClasses = (selected?: boolean, muted?: boolean) =>
        buildOddsBoxClasses(
            "min-w-[88px] h-[44px] shrink-0 rounded-xl border bg-black/70 px-3 text-sm font-semibold transition sm:min-w-[104px] sm:h-[52px] sm:px-4 sm:text-base flex items-center justify-center",
            selected,
            muted
        );

    const tableOddsBoxClasses = (selected?: boolean, muted?: boolean) =>
        buildOddsBoxClasses(
            "h-[40px] w-[60px] shrink-0 whitespace-nowrap rounded-xl border bg-black/70 px-1 text-[11px] font-semibold tabular-nums transition sm:h-[52px] sm:w-[96px] sm:px-3 sm:text-sm flex items-center justify-center",
            selected,
            muted
        );

    const renderOddsBox = (value: string, selected?: boolean, muted?: boolean) => (
        <div className={oddsBoxClasses(selected, muted)}>{value}</div>
    );

    const renderTableOddsBox = (
        value: string,
        selected?: boolean,
        muted?: boolean
    ) => <div className={tableOddsBoxClasses(selected, muted)}>{value}</div>;

    const renderLineOddsBox = (
        lineLabel: string,
        oddsLabel: string,
        selected?: boolean,
        muted?: boolean
    ) => (
        <div className={tableOddsBoxClasses(selected, muted)}>
            <div className="flex flex-col items-center leading-tight">
                <span
                    className={`whitespace-nowrap text-[10px] sm:text-xs ${muted ? "text-gray-500" : "text-white"}`}
                >
                    {lineLabel}
                </span>
                <span
                    className={`whitespace-nowrap text-[10px] sm:text-xs ${muted ? "text-gray-500" : "text-emerald-100"}`}
                >
                    {oddsLabel}
                </span>
            </div>
        </div>
    );

    const renderMainLineCell = (
        odd: OddsBlazeOdd | undefined,
        primary: string,
        secondary?: string
    ) => {
        const isSelected = isOddSelected(odd);
        const hasOdd = Boolean(odd);
        const hasLine = secondary !== undefined;
        const oddsLabel = secondary ?? primary;
        return (
            <button
                type="button"
                onClick={() => odd && handleSelectOdd(odd, activeGame as GameOption)}
                disabled={!odd || locked}
                className={`flex min-h-[72px] flex-col items-center justify-center px-2 py-2 text-center transition sm:px-3 sm:py-3 ${isSelected ? "text-emerald-50" : "text-gray-200"
                    } ${!odd ? "cursor-not-allowed text-gray-600" : ""}`}
            >
                {hasLine
                    ? renderLineOddsBox(
                        primary,
                        hasOdd ? oddsLabel : "-",
                        isSelected,
                        !hasOdd
                    )
                    : renderTableOddsBox(hasOdd ? oddsLabel : "-", isSelected, !hasOdd)}
            </button>
        );
    };

    const renderOddCards = (odds: SelectedOdd[], marketOverride?: string) => {
        if (!activeGame) return null;
        return (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
                {odds.map(({ odd }) => {
                    const isSelected = isOddSelected(odd);
                    const label = odd.player?.name ?? odd.selection?.name ?? odd.name ?? "Selection";
                    const side = odd.selection?.side;
                    const line = odd.selection?.line;
                    const isPlayer = Boolean(odd.player);
                    const teamLabel = odd.player ? playerTeamLabel(odd.player, activeGame) : "";
                    const subtitle = isPlayer
                        ? teamLabel || matchupLabel(activeGame)
                        : matchupLabel(activeGame);
                    return (
                        <button
                            key={odd.id}
                            type="button"
                            onClick={() => handleSelectOdd(odd, activeGame)}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${isSelected
                                ? "border-emerald-300/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                                : "border-white/10 bg-black/70 hover:border-white/20"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {subtitle}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {marketOverride ?? odd.market}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {renderOddsBox(formatOdds(odd.price), isSelected)}
                                    {line !== undefined ? (
                                        <p className="text-xs text-gray-400">
                                            {side ? `${side} ` : ""}
                                            {line}
                                        </p>
                                    ) : side ? (
                                        <p className="text-xs text-gray-400">{side}</p>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                                <span>{formatDateTime(activeGame.date)}</span>
                                <span>{odd.main ? "Main" : "Alt"}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };
    const renderMainLineOddCards = (odds: OddsObject[], marketOverride?: string) => {
        if (!activeGame) return null;
        return (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
                {odds.map((odd) => {
                    const isSelected = isOddSelected(odd);;
                    const label = odd.player?.name ?? odd.selection?.name ?? odd.name ?? "Selection";
                    const side = odd.selection?.side;
                    const line = odd.selection?.line;
                    const isPlayer = Boolean(odd.player);
                    const playerTeam = odd.player?.team?.abbreviation ?? "";
                    const opponent =
                        odd.player?.team?.id === activeGame.homeTeamId
                            ? activeGame.awayAbbr
                            : activeGame.homeAbbr;
                    return (
                        <>
                            <button
                                key={odd.id}
                                type="button"
                                onClick={() => handleSelectOdd(odd, activeGame)}
                                className={`rounded-2xl border px-3 py-3 text-left transition ${isSelected
                                    ? "border-emerald-300/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                                    : "border-white/10 bg-black/70 hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{label}</p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {isPlayer
                                                ? `${playerTeam} vs ${opponent} - ${matchupLabel(activeGame)}`
                                                : matchupLabel(activeGame)}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {marketOverride ?? odd.market}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {renderOddsBox(formatOdds(odd.price), isSelected)}
                                        {line !== undefined ? (
                                            <p className="text-xs text-gray-400">
                                                {side ? `${side} ` : ""}
                                                {line}
                                            </p>
                                        ) : side ? (
                                            <p className="text-xs text-gray-400">{side}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                                    <span>{formatDateTime(activeGame.date)}</span>
                                    <span>{odd.main ? "Main" : "Alt"}</span>
                                </div>
                            </button>
                        </>
                    );
                })}
            </div>
        );
    };

    const renderFirstBasketSection = (odds: OddsBlazeOdd[]) => {
        if (!activeGame) return null;
        const primaryOdds = odds.filter((odd) => odd.market === "First Basket");
        const listOdds = (primaryOdds.length > 0 ? primaryOdds : odds).slice().sort((a, b) => {
            const aValue = parseAmericanOdds(a.price);
            const bValue = parseAmericanOdds(b.price);
            if (aValue === null && bValue === null) {
                return (a.player?.name ?? a.name).localeCompare(b.player?.name ?? b.name);
            }
            if (aValue === null) return 1;
            if (bValue === null) return -1;
            if (aValue !== bValue) return aValue - bValue;
            return (a.player?.name ?? a.name).localeCompare(b.player?.name ?? b.name);
        });

        return (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <div className="divide-y divide-white/5">
                    {listOdds.map((odd) => {
                        const isSelected = isOddSelected(odd);
                        const label = odd.player?.name ?? odd.selection?.name ?? odd.name ?? "Selection";
                        const teamLabel = odd.player ? playerTeamLabel(odd.player, activeGame) : "";
                        return (
                            <button
                                key={odd.id}
                                type="button"
                                onClick={() => handleSelectOdd(odd, activeGame)}
                                disabled={locked}
                                className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${isSelected
                                    ? "bg-emerald-500/10 text-emerald-50"
                                    : "hover:bg-white/[0.03]"
                                    } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">{label}</p>
                                    {teamLabel ? (
                                        <p className="mt-1 text-xs text-gray-400">{teamLabel}</p>
                                    ) : null}
                                </div>
                                {renderOddsBox(formatOdds(odd.price), isSelected)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAltLineCard = (
        odd: OddsBlazeOdd | undefined,
        label: string,
        lineLabel: string
    ) => {
        const isSelected = isOddSelected(odd);
        return (
            <button
                type="button"
                onClick={() => odd && handleSelectOdd(odd, activeGame as GameOption)}
                disabled={!odd || locked}
                className={`flex min-h-[64px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${isSelected
                    ? "border-emerald-300/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                    : "border-white/10 bg-black/70 hover:border-white/20"
                    } ${!odd ? "cursor-not-allowed text-gray-600" : ""}`}
            >
                <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-lg font-semibold text-white">{lineLabel}</p>
                </div>
                {renderOddsBox(odd ? formatOdds(odd.price) : "-", isSelected, !odd)}
            </button>
        );
    };

    const renderAlternateSpreadSection = () => {
        if (!activeGame) return null;
        if (altSpreadLineData.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No alternate spreads available for this matchup yet.
                </div>
            );
        }
        const activeLine = altSpreadLine ?? altSpreadLineData.lines[0] ?? null;
        const homeEntry = activeLine !== null ? altSpreadLineData.map.get(activeLine) : undefined;
        const awayEntry =
            activeLine !== null ? altSpreadLineData.map.get(-activeLine) : undefined;
        const homeOdd = homeEntry?.home;
        const awayOdd = awayEntry?.away;
        const homeLine = activeLine ?? homeOdd?.selection?.line;
        const awayLine =
            activeLine !== null ? -activeLine : awayOdd?.selection?.line ?? undefined;
        return (
            <div className="mt-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                    Spread alternate
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                    {renderAltLineCard(
                        awayOdd,
                        activeGame.awayTeam,
                        formatLineValue(awayLine ?? awayOdd?.selection?.line)
                    )}
                    {renderAltLineCard(
                        homeOdd,
                        activeGame.homeTeam,
                        formatLineValue(homeLine ?? homeOdd?.selection?.line)
                    )}
                </div>
                <LineScroller
                    lines={altSpreadLineData.lines}
                    activeLine={activeLine}
                    onSelect={setAltSpreadLine}
                    formatLine={(line) => formatLineValue(line)}
                    locked={locked}
                />
            </div>
        );
    };

    const renderAlternateTotalSection = () => {
        if (!activeGame) return null;
        if (altTotalLineData.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No alternate totals available for this matchup yet.
                </div>
            );
        }
        const activeLine = altTotalLine ?? altTotalLineData.lines[0] ?? null;
        const entry = activeLine !== null ? altTotalLineData.map.get(activeLine) : undefined;
        const overOdd = entry?.over;
        const underOdd = entry?.under;
        const lineLabel = formatNumberLine(activeLine ?? undefined);
        return (
            <div className="mt-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                    Total alternate
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                    {renderAltLineCard(
                        overOdd,
                        "Over",
                        overOdd?.selection?.line !== undefined
                            ? formatNumberLine(overOdd.selection.line)
                            : lineLabel
                    )}
                    {renderAltLineCard(
                        underOdd,
                        "Under",
                        underOdd?.selection?.line !== undefined
                            ? formatNumberLine(underOdd.selection.line)
                            : lineLabel
                    )}
                </div>
                <LineScroller
                    lines={altTotalLineData.lines}
                    activeLine={activeLine}
                    onSelect={setAltTotalLine}
                    locked={locked}
                />
            </div>
        );
    };

    const sheetSummary = activeDraft?.summary ?? "Selected pick";
    const sheetTierMeta = activeDraft
        ? getTierMetaForPick({
            odds: activeDraft.odds,
            label: activeDraft.difficulty_label,
            points: activeDraft.points,
            mode: useGroupScoring ? "groupLeaderboard" : "global",
        })
        : null;
    const sheetTierPrimary = sheetTierMeta
        ? formatTierPrimary(sheetTierMeta.tier)
        : activeDraft?.displayDifficulty ?? "Tier —";
    const sheetTierName = sheetTierMeta?.name ?? activeDraft?.difficulty_label ?? "—";
    const sheetPoints = useGroupScoring
        ? sheetTierMeta?.points
        : activeDraft?.points ?? sheetTierMeta?.points;
    const tierLine = `${sheetTierPrimary}${sheetPoints ? ` · ${sheetPoints} pts` : ""}${sheetTierName && sheetTierName !== "—" ? ` · ${sheetTierName}` : ""
        }`;
    const sheetHeaderLabel = hasMultipick
        ? confirmationVariant === "post"
            ? "Combo post"
            : "Combo pick"
        : confirmationVariant === "post"
            ? "Post pick"
            : "Selected pick";

    const mainLineOdds = useMemo(() => {
        if (!activeGame) return null;
        const spreadAway = findMainTeamOdd(activeGame, "Point Spread", activeGame.awayTeam);
        const spreadHome = findMainTeamOdd(activeGame, "Point Spread", activeGame.homeTeam);
        const moneyAway = findMainTeamOdd(activeGame, "Moneyline", activeGame.awayTeam);
        const moneyHome = findMainTeamOdd(activeGame, "Moneyline", activeGame.homeTeam);
        const totalOver = findMainTotalOdd(activeGame, "Over");
        const totalUnder = findMainTotalOdd(activeGame, "Under");
        const totalLine = totalOver?.selection?.line ?? totalUnder?.selection?.line;

        return {
            spreadAway,
            spreadHome,
            moneyAway,
            moneyHome,
            totalOver,
            totalUnder,
            totalLine,
        };
    }, [activeGame]);

    const altSpreadOdds = useMemo(
        () =>
            oddsData
                ? oddsData.filter((odd) => odd.market === "Point Spread" && !odd.main)
                : [],
        [oddsData]
    );

    const altTotalOdds = useMemo(
        () =>
            oddsData
                ? oddsData.filter((odd) => odd.market === "Total Points" && !odd.main)
                : [],
        [oddsData]
    );

    const altSpreadLineData = useMemo(() => {
        if (!activeGame) {
            return { lines: [] as number[], map: new Map<number, SpreadLineEntry>() };
        }
        const map = new Map<number, SpreadLineEntry>();
        const lineSet = new Set<number>();
        altSpreadOdds.forEach((odd) => {
            const line = odd.selection?.line;
            if (line === undefined) return;
            lineSet.add(line);
            const entry = map.get(line) ?? {};
            const teamId = teamIdFromOdd(odd, activeGame);
            if (teamId === activeGame.homeTeamId) entry.home = odd;
            if (teamId === activeGame.awayTeamId) entry.away = odd;
            map.set(line, entry);
        });
        const lines = Array.from(lineSet.values())
            .filter((line) => map.get(line)?.home && map.get(-line)?.away)
            .sort((a, b) => a - b);
        return { lines, map };
    }, [activeGame, altSpreadOdds]);

    const altTotalLineData = useMemo(() => {
        const map = new Map<number, TotalLineEntry>();
        altTotalOdds.forEach((odd) => {
            const line = odd.selection?.line;
            if (line === undefined) return;
            const entry = map.get(line) ?? {};
            const side = odd.selection?.side?.toLowerCase();
            if (side === "over") entry.over = odd;
            if (side === "under") entry.under = odd;
            map.set(line, entry);
        });
        const lines = Array.from(map.keys()).sort((a, b) => a - b);
        return { lines, map };
    }, [altTotalOdds]);

    const firstBasketOdds = useMemo(
        () =>
            oddsData
                ? oddsData.filter((odd) =>
                    ["First Basket", "Home Team First Basket", "Away Team First Basket"].includes(
                        odd.market
                    )
                )
                : [],
        [oddsData]
    );

    const hasMainLines =
        Boolean(
            mainLineOdds?.spreadAway ||
            mainLineOdds?.spreadHome ||
            mainLineOdds?.moneyAway ||
            mainLineOdds?.moneyHome ||
            mainLineOdds?.totalOver ||
            mainLineOdds?.totalUnder
        );

    const hasGameLinesData =
        hasMainLines || altSpreadOdds.length > 0 || altTotalOdds.length > 0 || firstBasketOdds.length > 0;

    const hasActiveMarketLines = activeGame
        ? activeTab === "GAME_LINES"
            ? hasGameLinesData
            : [...activeMarketMap.values()].some((list) => list.length > 0)
        : false;

    useEffect(() => {
        if (!activeGame) {
            setAltSpreadLine(null);
            return;
        }
        const mainLine =
            mainLineOdds?.spreadHome?.selection?.line ??
            mainLineOdds?.spreadAway?.selection?.line;
        const preferred = mainLine !== undefined ? mainLine : undefined;
        setAltSpreadLine((prev) => {
            if (altSpreadLineData.lines.length === 0) return null;
            if (prev !== null && altSpreadLineData.lines.includes(prev)) return prev;
            return pickClosestLine(altSpreadLineData.lines, preferred);
        });
    }, [activeGame, altSpreadLineData.lines, mainLineOdds]);

    useEffect(() => {
        if (!activeGame) {
            setAltTotalLine(null);
            return;
        }
        const preferred = mainLineOdds?.totalLine;
        setAltTotalLine((prev) => {
            if (altTotalLineData.lines.length === 0) return null;
            if (prev !== null && altTotalLineData.lines.includes(prev)) return prev;
            return pickClosestLine(altTotalLineData.lines, preferred);
        });
    }, [activeGame, altTotalLineData.lines, mainLineOdds]);

    const handleSelectGame = (game: GameOption) => {
        if (locked) return;
        // setSelectedMatch(game);
        setActiveGameId(game.id);
        if (game.id) {
            dispatch(fetchNBAOddsRequest({ match_id: game.id }))
        }
        setActiveTab("GAME_LINES");
        setSearch("");
        setSelected(null);
    };

    const handleBackToMatchups = () => {
        setActiveGameId(null);
        setSearch("");
        setSelected(null);
        setOddsData([]);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    }

    return (
        <div
            className={`space-y-4 ${activeGame ? "matchup-detail" : ""} ${showReviewSheet
                ? "pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))]"
                : "pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-[calc(8rem+env(safe-area-inset-bottom))]"
                }`}
        >
            {!activeGame ? (
                <div className="grid gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white">Choose a matchup</h4>
                            <span className="text-xs uppercase tracking-wide text-gray-400">
                                Game lines + props
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">
                            {enforceEligibilityWindow
                                ? "Showing eligible games for this slip."
                                : "Showing the upcoming NBA slate."}
                        </p>
                        {filteredGames.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                <p className="font-semibold text-white">
                                    {noGamesForSelectedDate ? "No games scheduled" : "No games scheduled"}
                                </p>
                                {noGamesForSelectedDate ? (
                                    <p className="mt-1 text-xs text-gray-400">
                                        No games scheduled for this day.
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-400">
                                        No games scheduled for this day.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="scrollbar-hide grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                                {filteredGames && filteredGames.map((game) => (
                                    <button
                                        key={game.id}
                                        type="button"
                                        onClick={() => handleSelectGame(game)}
                                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-emerald-500/10 p-4 text-left text-white transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={locked}
                                    >
                                        <div className="flex items-start justify-between text-sm font-semibold text-white">
                                            <span>
                                                <span className="block">{game.awayTeam} @</span>
                                                <span className="block">{game.homeTeam}</span>
                                            </span>
                                            <span className="text-xs text-emerald-200">
                                                {formatDateTime(game.date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                                            <span>
                                                {game.awayAbbr} @ {game.homeAbbr}
                                            </span>
                                            {game.live && (
                                                <>
                                                    <span className="flex items-center gap-1 text-red-300 font-medium">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                                                        </span>
                                                        Live
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="rounded-3xl border border-white/10 bg-black/70 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    handleBackToMatchups();
                                }}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Back to matchups
                            </button>
                            <p className="flex text-xs text-gray-500 gap-2">
                                <span>Updated {formatDateTime(nbaSchedules?.updated)}</span>
                                {activeGame.live && (
                                    <span className="flex items-center gap-1 text-red-500 font-medium">
                                        <span className="relative flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
                                        </span>
                                        Live
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {activeGame.awayTeam} at {activeGame.homeTeam}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {formatDateTime(activeGame.date)}
                                </p>
                            </div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">
                                {activeGame.marketCount} markets - {activeGame.propCount} players
                            </div>
                        </div>
                        <div
                            id="game-prop-details-tabs-container"
                            className="scrollbar-hide mt-4 flex gap-3 overflow-x-auto border-b border-white/10 pb-2"
                        >
                            {TAB_ORDER.map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => handleTabChange(tab)}
                                        className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${active
                                            ? "border-emerald-300 text-emerald-100 active"
                                            : "border-transparent text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {TAB_LABELS[tab]}
                                    </button>
                                );
                            })}
                        </div>

                        {activeTab !== "GAME_LINES" && (
                            <div className="mt-4 grid gap-3">
                                <label className="flex flex-col gap-2 text-xs text-gray-400">
                                    Search players or markets
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                                        placeholder="Curry, rebounds, total points"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {!hasActiveMarketLines ? (
                        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
                            No matching lines. Try a different tab or search term.
                        </div>
                    ) : activeTab === "GAME_LINES" ? (
                        <>
                            <section className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                                {(() => {
                                    const sectionKey = "game-lines-main";
                                    const collapsed = isSectionCollapsed(sectionKey, true);
                                    const totalLine = mainLineOdds?.totalLine;
                                    return (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => toggleSection(sectionKey, true)}
                                                aria-expanded={!collapsed}
                                                className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                                            >
                                                <span className="text-base font-semibold text-white">Game Lines</span>
                                                <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                                                    <span
                                                        className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                                            }`}
                                                    >
                                                        v
                                                    </span>
                                                </span>
                                            </button>

                                            {!collapsed && activeGame && (
                                                <div className="mt-4 space-y-3 [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                                    <div
                                                        className="grid items-center gap-2 text-xs uppercase tracking-wide text-gray-400"
                                                        style={{
                                                            gridTemplateColumns:
                                                                "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        <div className="px-3">Team</div>
                                                        <div className="text-center">Spread</div>
                                                        <div className="text-center">Money</div>
                                                        <div className="text-center">Total</div>
                                                    </div>

                                                    <div
                                                        className="grid items-stretch gap-2"
                                                        style={{
                                                            gridTemplateColumns:
                                                                "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        <div className="flex min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3">
                                                            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xs font-semibold text-white sm:flex sm:h-10 sm:w-10">
                                                                {activeGame.awayAbbr}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="hidden truncate text-sm font-semibold text-white sm:block">
                                                                    {activeGame.awayTeam}
                                                                </p>
                                                                <p className="whitespace-nowrap text-xs font-normal text-gray-400">
                                                                    {activeGame.awayAbbr}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {renderMainLineCell(
                                                            mainLineOdds?.spreadAway,
                                                            formatLineValue(mainLineOdds?.spreadAway?.selection?.line),
                                                            mainLineOdds?.spreadAway
                                                                ? formatOdds(mainLineOdds.spreadAway.price)
                                                                : "-"
                                                        )}
                                                        {renderMainLineCell(
                                                            mainLineOdds?.moneyAway,
                                                            mainLineOdds?.moneyAway ? formatOdds(mainLineOdds.moneyAway.price) : "-",
                                                            undefined
                                                        )}
                                                        {renderMainLineCell(
                                                            mainLineOdds?.totalOver,
                                                            `O ${totalLine ?? "-"}`,
                                                            mainLineOdds?.totalOver
                                                                ? formatOdds(mainLineOdds.totalOver.price)
                                                                : "-"
                                                        )}
                                                    </div>

                                                    <div
                                                        className="grid items-stretch gap-2"
                                                        style={{
                                                            gridTemplateColumns:
                                                                "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        <div className="flex min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3">
                                                            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xs font-semibold text-white sm:flex sm:h-10 sm:w-10">
                                                                {activeGame.homeAbbr}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="hidden truncate text-sm font-semibold text-white sm:block">
                                                                    {activeGame.homeTeam}
                                                                </p>
                                                                <p className="whitespace-nowrap text-xs font-normal text-gray-400">
                                                                    {activeGame.homeAbbr}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {renderMainLineCell(
                                                            mainLineOdds?.spreadHome,
                                                            formatLineValue(mainLineOdds?.spreadHome?.selection?.line),
                                                            mainLineOdds?.spreadHome
                                                                ? formatOdds(mainLineOdds.spreadHome.price)
                                                                : "-"
                                                        )}
                                                        {renderMainLineCell(
                                                            mainLineOdds?.moneyHome,
                                                            mainLineOdds?.moneyHome ? formatOdds(mainLineOdds.moneyHome.price) : "-",
                                                            undefined
                                                        )}
                                                        {renderMainLineCell(
                                                            mainLineOdds?.totalUnder,
                                                            `U ${totalLine ?? "-"}`,
                                                            mainLineOdds?.totalUnder
                                                                ? formatOdds(mainLineOdds.totalUnder.price)
                                                                : "-"
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </section>

                            {[
                                {
                                    key: "game-lines-alt-spread",
                                    title: "Alternate Spread",
                                    odds: altSpreadOdds,
                                },
                                {
                                    key: "game-lines-alt-total",
                                    title: "Alternate Total",
                                    odds: altTotalOdds,
                                },
                                {
                                    key: "game-lines-first-basket",
                                    title: "First Basket",
                                    odds: firstBasketOdds,
                                },
                            ].map((section) => {
                                const collapsed = isSectionCollapsed(section.key, false);
                                if (section.odds.length === 0) return null;
                                return (
                                    <section
                                        key={section.key}
                                        className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.key, false)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                                        >
                                            <span className="text-base font-semibold text-white">
                                                {section.title}
                                            </span>
                                            <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                                                <span
                                                    className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                                        }`}
                                                >
                                                    v
                                                </span>
                                            </span>
                                        </button>
                                        {!collapsed &&
                                            (section.key === "game-lines-alt-spread"
                                                ? renderAlternateSpreadSection()
                                                : section.key === "game-lines-alt-total"
                                                    ? renderAlternateTotalSection()
                                                    : section.key === "game-lines-first-basket"
                                                        ? renderFirstBasketSection(section.odds)
                                                        : renderMainLineOddCards(section.odds, section.title))}
                                    </section>
                                );
                            })}
                        </>
                    ) : (
                        TAB_MARKETS[activeTab].map((market, index) => {
                            const odds = activeMarketMap.get(market) ?? [];
                            if (odds.length === 0 || !activeGame) return null;

                            const isAltPlayerPoints = market === ALT_POINTS_MARKET;
                            const isMainPlayerPoints = market === "Player Points";
                            const isTableMarket = isAltPlayerPoints || TABLE_MARKETS.has(market);
                            const sides = new Set(
                                odds
                                    .map((item) => item.odd.selection?.side?.toLowerCase())
                                    .filter(Boolean) as string[]
                            );
                            const hasOver = sides.has("over");
                            const hasUnder = sides.has("under");
                            const defaultSide = hasOver ? "Over" : "Under";
                            const activeSide = pointsSideByMarket[market] ?? defaultSide;
                            const table = isTableMarket
                                ? buildPointsTable(odds, activeGame, activeSide, {
                                    normalizeToFive: isAltPlayerPoints,
                                })
                                : { lines: [], rows: [] };
                            const showTable =
                                isTableMarket &&
                                activeSide === "Over" &&
                                table.lines.length > 1 &&
                                table.rows.length > 0;
                            const simpleRows = isTableMarket
                                ? buildSimplePropRows(odds, activeGame, activeSide)
                                : [];
                            const mainPointsRows = isMainPlayerPoints
                                ? buildMainPointsRows(odds, activeGame)
                                : [];
                            const sectionKey = `${activeTab}-${market}`;
                            const collapsed = isSectionCollapsed(sectionKey, index === 0);

                            return (
                                <section
                                    key={`${activeGame.id}-${market}`}
                                    className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(sectionKey, index === 0)}
                                        aria-expanded={!collapsed}
                                        className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                                    >
                                        <span className="text-base font-semibold text-white">{market}</span>
                                        <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                                            <span
                                                className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                                    }`}
                                            >
                                                v
                                            </span>
                                        </span>
                                    </button>

                                    {!collapsed && (
                                        <>
                                            {isTableMarket && (hasOver || hasUnder) ? (
                                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                                    {["Over", "Under"].map((side) => {
                                                        if (side === "Over" && !hasOver) return null;
                                                        if (side === "Under" && !hasUnder) return null;
                                                        const active = activeSide === side;
                                                        return (
                                                            <button
                                                                key={`${market}-${side}`}
                                                                type="button"
                                                                onClick={() =>
                                                                    setPointsSideByMarket((prev) => ({
                                                                        ...prev,
                                                                        [market]: side as "Over" | "Under",
                                                                    }))
                                                                }
                                                                className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide transition sm:px-3 ${active
                                                                    ? "border-emerald-300/70 bg-emerald-500/20 text-white"
                                                                    : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/30"
                                                                    }`}
                                                            >
                                                                {side}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}


                                            {isMainPlayerPoints ? (
                                                <div className="mt-4 text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                                    <div
                                                        className="grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                        style={{
                                                            gridTemplateColumns:
                                                                "minmax(0,1fr) repeat(2, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        <div className="px-3 py-2">Player</div>
                                                        <div className="px-3 py-2 text-center">Over line</div>
                                                        <div className="px-3 py-2 text-center">Under line</div>
                                                    </div>
                                                    {mainPointsRows.map((row, rowIndex) => {
                                                        const rowBand =
                                                            rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                                        const overLine = row.over?.selection?.line ?? row.line;
                                                        const underLine = row.under?.selection?.line ?? row.line;
                                                        const renderPointButton = (
                                                            odd: OddsBlazeOdd | undefined,
                                                            prefix: "O" | "U",
                                                            line?: number
                                                        ) => {
                                                            const isSelected = isOddSelected(odd);
                                                            const label = `${prefix} ${line ?? "-"}`;
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => odd && handleSelectOdd(odd, activeGame)}
                                                                    disabled={!odd || locked}
                                                                    className={`${tableOddsBoxClasses(
                                                                        isSelected,
                                                                        !odd
                                                                    )} ${!odd ? "cursor-not-allowed" : ""}`}
                                                                >
                                                                    <div className="flex flex-col items-center leading-tight">
                                                                        <span
                                                                            className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-white" : "text-gray-500"}`}
                                                                        >
                                                                            {label}
                                                                        </span>
                                                                        <span
                                                                            className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-emerald-100" : "text-gray-500"}`}
                                                                        >
                                                                            {odd ? formatOdds(odd.price) : "-"}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        };

                                                        return (
                                                            <div
                                                                key={`${market}-${row.player.id}`}
                                                                className={`grid items-center gap-2 border-b border-white/5 px-0 text-left ${rowBand}`}
                                                                style={{
                                                                    gridTemplateColumns:
                                                                        "minmax(0,1fr) repeat(2, var(--table-chip-width))",
                                                                }}
                                                            >
                                                                <div className="min-w-0 px-3 py-2.5">
                                                                    <p className="truncate text-sm font-semibold text-white">
                                                                        {row.player.name}
                                                                    </p>
                                                                    <p className="mt-1 truncate text-xs text-gray-400">
                                                                        {row.teamLabel}
                                                                    </p>
                                                                </div>
                                                                {renderPointButton(row.over, "O", overLine)}
                                                                {renderPointButton(row.under, "U", underLine)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : showTable ? (
                                                <div className="mt-4 overflow-x-auto">
                                                    <div className="min-w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                                        <div
                                                            className="grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                            style={{
                                                                gridTemplateColumns: table.lines.length
                                                                    ? `minmax(160px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                                                    : "minmax(160px,1fr)",
                                                            }}
                                                        >
                                                            <div className="sticky left-0 z-20 bg-black/80 px-3 py-2 sm:min-w-[190px]">
                                                                Scroll right to see more
                                                            </div>
                                                            {table.lines.map((line) => {
                                                                const headerLabel = isAltPlayerPoints
                                                                    ? `${formatLineLabel(line)} pts`
                                                                    : formatLineLabel(line);
                                                                return (
                                                                    <div key={`${market}-${line}`} className="px-3 py-2 text-center">
                                                                        {headerLabel}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {table.rows.map((row, rowIndex) => {
                                                            const rowBand =
                                                                rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                                            return (
                                                                <div
                                                                    key={`${market}-${row.player.id}`}
                                                                    className={`grid gap-2 border-b border-white/5 ${rowBand}`}
                                                                    style={{
                                                                        gridTemplateColumns: table.lines.length
                                                                            ? `minmax(160px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                                                            : "minmax(160px,1fr)",
                                                                    }}
                                                                >
                                                                    <div className="sticky left-0 z-10 bg-black/80 px-3 py-3 sm:min-w-[190px]">
                                                                        <p className="text-sm font-semibold text-white">
                                                                            {row.player.name}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-400">
                                                                            {row.teamLabel}
                                                                        </p>
                                                                    </div>
                                                                    {table.lines.map((line) => {
                                                                        const odd = row.lines.get(line);
                                                                        const isSelected = isOddSelected(odd);
                                                                        const oddsLabel = odd ? formatOdds(odd.price) : "-";
                                                                        return (
                                                                            <div key={`${row.player.id}-${line}`} className="flex justify-center px-1 py-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => odd && handleSelectOdd(odd, activeGame)}
                                                                                    disabled={!odd || locked}
                                                                                    className={`${tableOddsBoxClasses(
                                                                                        isSelected,
                                                                                        !odd
                                                                                    )} ${!odd ? "cursor-not-allowed" : ""}`}
                                                                                >
                                                                                    {oddsLabel}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : isTableMarket ? (
                                                <div className="mt-4 overflow-x-auto">
                                                    <div className="min-w-[320px] text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                                        <div
                                                            className="grid border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                            style={{
                                                                gridTemplateColumns:
                                                                    "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                                                            }}
                                                        >
                                                            <div className="px-3 py-2">Player</div>
                                                            <div className="px-3 py-2 text-center">
                                                                {activeSide} line
                                                            </div>
                                                            <div className="px-3 py-2 text-center">Odds</div>
                                                        </div>
                                                        {simpleRows.map((row, rowIndex) => {
                                                            const isSelected = isOddSelected(row.odd);
                                                            const rowBand =
                                                                rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                                            return (
                                                                <button
                                                                    key={`${market}-${row.player.id}`}
                                                                    type="button"
                                                                    onClick={() => row.odd && handleSelectOdd(row.odd, activeGame)}
                                                                    disabled={!row.odd || locked}
                                                                    className={`grid w-full items-center border-b border-white/5 px-0 text-left transition ${rowBand} ${isSelected
                                                                        ? "border-emerald-300/60 bg-emerald-500/10"
                                                                        : "hover:bg-white/[0.02]"
                                                                        } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                                                    style={{
                                                                        gridTemplateColumns:
                                                                            "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                                                                    }}
                                                                >
                                                                    <div className="px-3 py-3">
                                                                        <p className="text-sm font-semibold text-white">
                                                                            {row.player.name}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-400">
                                                                            {row.teamLabel}
                                                                        </p>
                                                                    </div>
                                                                    <div className="px-3 py-3 text-center text-xs text-gray-300">
                                                                        {row.line ?? "-"}
                                                                    </div>
                                                                    <div className="flex justify-center px-3 py-3">
                                                                        {renderTableOddsBox(
                                                                            row.odd ? formatOdds(row.odd.price) : "-",
                                                                            isSelected,
                                                                            !row.odd
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                renderOddCards(odds)
                                            )}
                                        </>
                                    )}
                                </section>
                            );
                        })
                    )}
                </>
            )}

            {showReviewSheet && isReviewOpen && (
                <div
                    className="fixed inset-x-0 top-0 bottom-[calc(0.75rem+4.5rem)] z-30 bg-black/70 sm:bottom-[calc(0.75rem+4.875rem)] md:bottom-[calc(0.75rem+4.875rem*1.45)]"
                    role="presentation"
                    onClick={() => setIsReviewOpen(false)}
                />
            )}

            {showReviewSheet && (
                <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-5 sm:px-6">
                    <div className="w-[360px] sm:w-[390px] md:origin-bottom md:scale-[1.45]">
                        <div
                            className={`rounded-3xl sheet-rounded border border-b-0 border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] pb-[4.5rem] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur sm:pb-[4.875rem] ${isReviewOpen
                                ? "max-h-[70vh] overflow-y-auto sheet-scroll"
                                : "overflow-hidden"
                                }`}
                        >
                            <button
                                type="button"
                                onClick={() => setIsReviewOpen((prev) => !prev)}
                                className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${isReviewOpen
                                    ? "sticky top-0 z-10 bg-gradient-to-b from-black/80 via-black/60 to-black/20 backdrop-blur"
                                    : ""
                                    }`}
                            >
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-400">
                                        {sheetHeaderLabel}
                                    </p>
                                    {isReviewOpen &&
                                        (hasMultiSelection ? (
                                            <p className="mt-1 text-sm font-semibold text-white">
                                                {multiSelectionCount} picks selected
                                            </p>
                                        ) : (
                                            <>
                                                <p className="mt-1 text-sm font-semibold text-white">
                                                    {sheetSummary}
                                                </p>
                                            </>
                                        ))
                                    }
                                </div>
                                <span className="text-gray-400">
                                    {isReviewOpen ? "v" : "^"}
                                </span>
                            </button>

                            {isReviewOpen && (
                                <div className="border-t border-white/10 px-4 pb-5 pt-4 max-h-[490px]">
                                    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="w-full space-y-1">
                                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                                    {hasMultiSelection ? "Your picks" : "Your pick"}
                                                </p>
                                                <ul className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar">
                                                    {reviewListItems.map((item) => {
                                                        const oddsLabel = formatOdds(item.odds);
                                                        const pickLine = extractPickLine(item.description);
                                                        const canDelete = Boolean(item.onDelete);
                                                        return (
                                                            <li key={item.id} className="flex w-full items-start gap-3 pr-2">
                                                                <div className="min-w-0 flex flex-1 items-start gap-2">
                                                                    {canDelete ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={item.onDelete}
                                                                            className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                                                            aria-label="Remove pick"
                                                                            title="Remove pick"
                                                                        >
                                                                            -
                                                                        </button>
                                                                    ) : (
                                                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        {item.sourceTabLabel && (
                                                                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                                                                {item.sourceTabLabel}
                                                                            </span>
                                                                        )}
                                                                        <p
                                                                            className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                                                            title={item.description}
                                                                        >
                                                                            {pickLine}
                                                                        </p>
                                                                        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                                                                            {item.tierLine ?? tierLine}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-2 pt-3 text-right">
                                                                    <span className="text-[11px] font-semibold text-slate-100">
                                                                        {oddsLabel}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>

                                        {confirmationVariant === "post" && (
                                            <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400">Confidence</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {CONFIDENCE_LEVELS.map((level) => {
                                                        const active = selectedConfidence === level;
                                                        return (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                onClick={() => setSelectedConfidence(level)}
                                                                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${active
                                                                    ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
                                                                    : "border-white/15 bg-white/5 text-gray-200 hover:border-white/30"
                                                                    }`}
                                                            >
                                                                {level.toLowerCase()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {!selectedConfidence && (
                                                    <p className="mt-2 text-[11px] text-rose-200">
                                                        Pick a confidence level to post.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3">
                                            {confirmationVariant === "post" && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        submitPick("post")
                                                        setIsReviewOpen(false)
                                                    }}
                                                    disabled={locked || !selectedConfidence}
                                                    className="rounded-2xl bg-emerald-500/25 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {postActionLabel}
                                                </button>
                                            )}
                                            {confirmationVariant === "slip" && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        submitPick("slip")
                                                        setIsReviewOpen(false)
                                                    }}
                                                    disabled={locked}
                                                    className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    post to slip
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsReviewOpen(false)
                                                }}
                                                className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
                                            >
                                                edit pick
                                            </button>
                                        </div>

                                        {locked && (
                                            <p className="text-xs text-rose-200">Picks are locked.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default NbaPickBuilder;
