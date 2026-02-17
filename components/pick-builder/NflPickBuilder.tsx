"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ODDS_BRACKETS } from "@/lib/constants";
import { formatDateTime, isPast } from "@/lib/utils/date";
import {
    DEFAULT_ELIGIBLE_WINDOW_DAYS,
    eligibleWindowEnd,
    filterEligibleGames,
} from "@/lib/utils/games";
import { AltPropsTableRow, BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, League, NFLOdds, NFLSchedules, OddsBlazeOdd, OddsBlazePlayer, OddsEvent, ParlayLeg, Pick, PickLeg, PickSelectionMeta, RootState, Slip, TdScorerColumn, TdScorerRow, TierIndex } from "@/lib/interfaces/interfaces";
import { clearValidateMyNFLPickMessage, fetchLiveNFLScheduleRequest, fetchLiveOddsRequest, validateMyNFLPickRequest } from "@/lib/redux/slices/nflSlice";
import { useDispatch, useSelector } from "react-redux";
import ScoringModal from "../modals/ScoringModal";
import { useToast } from "@/lib/state/ToastContext";
import { normalizeOddToLeg, validateAddLeg } from "@/lib/sgp/validateParlay";
import FootballAnimation from "../animations/FootballAnimation";
import { formatTierPrimary, getGroupTierForAmericanOdds, getTierForAmericanOdds, getTierForLabel, getTierMetaForPick, GROUP_CAP_POINTS, GROUP_CAP_TIER, parseAmericanOdds } from "@/lib/utils/scoring";
import { canUserEditSlipPicks } from "@/lib/slips/state";

type BookOdds = {
    book?: string;
    americanOdds: number;
    marketLine?: number;
    deeplinkUrl?: string;
};

type GroupLeaderboardEntry = {
    userId: string;
    slipId: string;
    groupId: string;
    cumulativePoints?: number;
};

type PickScope = "GAME_LINE" | "PLAYER_PROP";
type PickMarket =
    | "MONEYLINE"
    | "SPREAD"
    | "TOTAL_POINTS"
    | "PASSING_YARDS"
    | "PASSING_ATTEMPTS"
    | "PASSING_COMPLETIONS"
    | "PASSING_RUSHING_YARDS"
    | "RUSHING_YARDS"
    | "RUSHING_RECEIVING_YARDS"
    | "RECEIVING_YARDS"
    | "RECEPTIONS"
    | "LONGEST_RECEPTION"
    | "RUSHING_ATTEMPTS"
    | "PASSING_TDS"
    | "PASSING_RUSHING_TDS"
    | "RUSHING_TDS"
    | "RECEIVING_TDS"
    | "PLAYER_TDS";
type PickSide = "OVER" | "UNDER";

type ValidatePickRequest = {
    scope: PickScope;
    market: PickMarket;
    gameId: string;
    teamId?: string;
    playerId?: string;
    side?: PickSide;
    threshold?: number;
    groupId: string;
    contestId: string;
    userId?: string;
};

type ValidatePickResponse = {
    status: "VALID" | "TOO_SAFE" | "TOO_CRAZY" | "NO_MARKET" | "API_ERROR";
    bookOdds?: BookOdds[];
    bestOffer?: BookOdds;
    difficultyTier?: TierIndex;
    points?: number;
    suggestedThresholds?: number[];
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
    onPostToSlip?: (payload: BuiltPickPayload) => void;
    draftPick?: DraftPick | null;
    onDraftPickChange?: (draftPick: DraftPick | null) => void;
    parlayLegs?: ParlayLeg[];
    onParlayLegsChange?: (
        legs: ParlayLeg[] | ((prev: ParlayLeg[]) => ParlayLeg[])
    ) => void;
    onCancel?: () => void;
    isCommissioner: boolean;
    leaderboard?: GroupLeaderboardEntry[];
    enforceEligibilityWindow?: boolean;
    builderMode?: "post";
    activeDateKey?: string;
    onDateChange?: (key: string, source?: "user" | "auto") => void;
    allowAutoDateAdvance?: boolean;
    hideDateControls?: boolean;
    onDateOptionsChange?: (options: Array<{ key: string; label: string }>) => void;
};

type PickBuilderStep =
    | { kind: "GAME_SELECT" }
    | { kind: "GAME_DETAIL" }
    | { kind: "PLAYER_SELECT_THRESHOLD" }
    | { kind: "GAME_MONEYLINE_TEAM" }
    | { kind: "GAME_SPREAD_TEAM" }
    | { kind: "GAME_SPREAD_MARGIN" }
    | { kind: "GAME_TOTAL_SIDE" }
    | { kind: "GAME_TOTAL_THRESHOLD" }
    | { kind: "CONFIRMATION" };

type GameDetailTab = "GAME_LINES" | "PASSING" | "RECEIVING" | "RUSHING" | "TD_SCORER";

type OddsBlazeTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

type GameOption = {
    id: string;
    game_id: string;
    home_team: string;
    away_team: string;
    home_team_id: string;
    away_team_id: string;
    date: string;
    live: boolean;
    odds: OddsBlazeOdd[];
    marketCount: number;
    propCount: number;
    home_abbr: string;
    away_abbr: string;
};

type BuilderSelection = {
    oddId?: string;
    scope?: PickScope;
    market?: PickMarket;
    gameId?: string;
    teamId?: string;
    playerId?: string;
    side?: PickSide;
    threshold?: number;
};

type ValidationState = {
    status: "idle" | "loading" | "resolved";
    response?: ValidatePickResponse;
    error?: string | null;
};

type PlayerOddsLine = {
    line: number | null;
    over?: OddsBlazeOdd;
    under?: OddsBlazeOdd;
    any?: OddsBlazeOdd;
    main: boolean;
};

type PlayerOddsRow = {
    player: OddsBlazePlayer;
    team: OddsBlazeTeam;
    opponent: string;
    lines: PlayerOddsLine[];
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

const NFL_TAB_LABELS: Record<GameDetailTab, string> = {
    GAME_LINES: "Game Lines",
    PASSING: "Passing Props",
    RECEIVING: "Receiving Props",
    RUSHING: "Rushing Props",
    TD_SCORER: "TD Scorer Props",
};

const resolveNflSourceTab = (selection: BuilderSelection): string | undefined => {
    if (selection.scope === "GAME_LINE") return NFL_TAB_LABELS.GAME_LINES;
    const market = selection.market ?? "";
    if (!market) return undefined;
    const upper = market.toUpperCase();
    if (
        upper.includes("MONEYLINE") ||
        upper.includes("SPREAD") ||
        upper.includes("TOTAL_POINTS")
    ) {
        return NFL_TAB_LABELS.GAME_LINES;
    }
    if (upper.includes("PASSING")) return NFL_TAB_LABELS.PASSING;
    if (upper.includes("RECEIVING") || upper.includes("RECEPTION")) {
        return NFL_TAB_LABELS.RECEIVING;
    }
    if (upper.includes("RUSHING")) return NFL_TAB_LABELS.RUSHING;
    if (upper.includes("TD")) return NFL_TAB_LABELS.TD_SCORER;
    return undefined;
};

const buildGameOptions = (snapshot: NFLOdds | undefined): GameOption[] => {
    if (!snapshot?.events) return [];

    return snapshot.events
        .filter((event) => event.odds)
        .map((event) => {
            const mainOdds = event.odds!.filter((odd) => odd.main);
            const marketCount = new Set(mainOdds.map((odd) => odd.market)).size;
            const propCount = new Set(
                mainOdds.filter((odd) => odd.player).map((odd) => odd.player!.id)
            ).size;

            return {
                id: event.id,
                game_id: event.id,
                home_team: event.teams.home.name,
                away_team: event.teams.away.name,
                home_team_id: event.teams.home.id,
                away_team_id: event.teams.away.id,
                date: event.date,
                live: event.live,
                odds: event.odds!,
                marketCount,
                propCount,
                home_abbr:
                    event.teams.home.abbreviation ??
                    event.teams.home.name.slice(0, 3).toUpperCase(),
                away_abbr:
                    event.teams.away.abbreviation ??
                    event.teams.away.name.slice(0, 3).toUpperCase(),
            };
        });
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

const STAT_THRESHOLD_CONFIG: Record<string, number[]> = {
    NFL_RECEIVING_YARDS: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    NFL_RUSHING_YARDS: [20, 30, 40, 50, 60, 80, 100],
    NFL_RUSH_REC_YARDS: [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
    NFL_PASSING_YARDS: [150, 200, 225, 250, 275, 300, 325, 350],
    NFL_PASSING_ATTEMPTS: [29.5, 30.5, 31.5, 32.5, 33.5],
    NFL_PASSING_COMPLETIONS: [18.5, 19.5, 20.5, 21.5, 22.5],
    NFL_PASS_RUSH_YARDS: [200, 225, 250, 275, 300, 325, 350, 375],
    NFL_TDS: [1, 2, 3],
    NFL_RECEPTIONS: [3, 4, 5, 6, 7, 8, 10],
    NFL_LONGEST_RECEPTION: [
        7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5, 18.5,
        19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5, 26.5,
    ],
    NFL_ATTEMPTS: [10, 12, 15, 18, 20, 22, 25],
};

const TOTAL_POINT_THRESHOLDS = [20, 30, 35, 40, 45, 50, 55, 60, 65];

const MARKET_LABEL: Record<PickMarket, string> = {
    MONEYLINE: "Moneyline",
    SPREAD: "Spread",
    TOTAL_POINTS: "Total Points",
    PASSING_YARDS: "Passing Yards",
    PASSING_ATTEMPTS: "Passing Attempts",
    PASSING_COMPLETIONS: "Passing Completions",
    PASSING_RUSHING_YARDS: "Pass + Rush Yards",
    RUSHING_YARDS: "Rushing Yards",
    RUSHING_RECEIVING_YARDS: "Rush + Rec Yards",
    RECEIVING_YARDS: "Receiving Yards",
    RECEPTIONS: "Receptions",
    LONGEST_RECEPTION: "Longest Reception",
    RUSHING_ATTEMPTS: "Rushing Attempts",
    PASSING_TDS: "Passing TDs",
    PASSING_RUSHING_TDS: "Pass + Rush TDs",
    RUSHING_TDS: "Touchdowns",
    RECEIVING_TDS: "Touchdowns",
    PLAYER_TDS: "Anytime TD",
};

const ODDS_MARKET_MAP: Record<string, PickMarket> = {
    Moneyline: "MONEYLINE",
    "Point Spread": "SPREAD",
    "Total Points": "TOTAL_POINTS",
    "Player Passing Yards": "PASSING_YARDS",
    "Player Passing Attempts": "PASSING_ATTEMPTS",
    "Player Passing Completions": "PASSING_COMPLETIONS",
    "Player Passing Touchdowns": "PASSING_TDS",
    "Player Passing + Rushing Touchdowns": "PASSING_RUSHING_TDS",
    "Player Passing + Rushing TDs": "PASSING_RUSHING_TDS",
    "Player Passing + Rushing Yards": "PASSING_RUSHING_YARDS",
    "1st Quarter Player Passing Yards": "PASSING_YARDS",
    "1st Quarter Player Passing + Rushing Yards": "PASSING_RUSHING_YARDS",
    "Player Receiving Yards": "RECEIVING_YARDS",
    "Player Receptions": "RECEPTIONS",
    "Player Longest Reception": "LONGEST_RECEPTION",
    "1st Quarter Player Receiving Yards": "RECEIVING_YARDS",
    "Player Rushing Yards": "RUSHING_YARDS",
    "Player Rushing Attempts": "RUSHING_ATTEMPTS",
    "Player Rushing + Receiving Yards": "RUSHING_RECEIVING_YARDS",
    "1st Quarter Player Rushing Yards": "RUSHING_YARDS",
    "1st Quarter Player Rushing + Receiving Yards": "RUSHING_RECEIVING_YARDS",
    "Player Touchdowns": "PLAYER_TDS",
    "1st Half Player Touchdowns": "PLAYER_TDS",
    "First Touchdown Scorer": "PLAYER_TDS",
    "Last Touchdown Scorer": "PLAYER_TDS",
};

const MARKET_DISPLAY_OVERRIDES: Record<string, string> = {
    Moneyline: "Moneyline",
    "Point Spread": "Spread",
    "Total Points": "Total Points",
    "Player Passing Yards": "Passing Yards",
    "Player Passing Attempts": "Passing Attempts",
    "Player Passing Completions": "Passing Completions",
    "Player Passing Touchdowns": "Passing TDs",
    "Player Passing + Rushing Touchdowns": "Pass + Rush TDs",
    "Player Passing + Rushing TDs": "Pass + Rush TDs",
    "Player Passing + Rushing Yards": "Pass + Rush Yds",
    "1st Quarter Player Passing Yards": "1Q Passing Yards",
    "1st Quarter Player Passing + Rushing Yards": "1Q Pass + Rush Yds",
    "Player Receiving Yards": "Receiving Yards",
    "Player Receptions": "Receptions",
    "Player Longest Reception": "Longest Reception",
    "1st Quarter Player Receiving Yards": "1Q Receiving Yards",
    "Player Rushing Yards": "Rushing Yards",
    "Player Rushing Attempts": "Rush Attempts",
    "Player Rushing + Receiving Yards": "Rush + Rec Yds",
    "1st Quarter Player Rushing Yards": "1Q Rushing Yards",
    "1st Quarter Player Rushing + Receiving Yards": "1Q Rush + Rec Yds",
    "Player Touchdowns": "Anytime TD",
    "1st Half Player Touchdowns": "1H Anytime TD",
    "First Touchdown Scorer": "First TD Scorer",
    "Last Touchdown Scorer": "Last TD Scorer",
};

const tierMetaFromIndex = (tier?: TierIndex) =>
    typeof tier === "number" ? ODDS_BRACKETS[tier - 1] : undefined;

const tierNameFromIndex = (tier?: TierIndex) =>
    tierMetaFromIndex(tier)?.name ?? "EVEN";

const tierLabelFromTier = (tier?: TierIndex) => tierNameFromIndex(tier);

const tierFromDifficultyLabel = (
    label: Pick["difficulty_label"]
): TierIndex | undefined => getTierForLabel(label)?.tier;

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "—";
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
        return player.team?.id === game.home_team_id ? game.home_abbr : game.away_abbr;
    }
    return "";
};

const playerMetaLabel = (player: OddsBlazePlayer, teamLabel?: string) => {
    const parts = [player.position, teamLabel].filter(
        (value): value is string => Boolean(value)
    );
    return parts.length > 0 ? parts.join(" · ") : "N/A";
};

const marketDisplayName = (market: string) =>
    MARKET_DISPLAY_OVERRIDES[market] ?? market.replace("Player ", "");

const pickSideFromSelection = (side?: string): PickSide | undefined => {
    if (!side) return undefined;
    if (side.toLowerCase() === "over") return "OVER";
    if (side.toLowerCase() === "under") return "UNDER";
    return undefined;
};

const marketForOdd = (odd: OddsBlazeOdd): PickMarket | undefined =>
    ODDS_MARKET_MAP[odd.market];

const teamIdFromOdd = (odd: OddsBlazeOdd, game: GameOption): string | undefined => {
    const candidate = odd.selection?.name ?? odd.name;
    if (!candidate) return undefined;
    if (candidate === game.home_team) return game.home_team_id;
    if (candidate === game.away_team) return game.away_team_id;
    return undefined;
};

const buildSearchHaystack = (odd: OddsBlazeOdd, game: GameOption) => [
    odd.market,
    odd.name,
    odd.selection?.name,
    odd.selection?.side,
    odd.player?.name,
    odd.player?.team?.name,
    odd.player?.team?.abbreviation,
    game.home_team,
    game.away_team,
    game.home_abbr,
    game.away_abbr,
];

const matchesTeamName = (odd: OddsBlazeOdd, teamName: string) => {
    const candidate = odd.selection?.name ?? odd.name;
    if (!candidate) return false;
    return candidate.toLowerCase() === teamName.toLowerCase();
};

const findMainTeamOdd = (game: GameOption, market: string, teamName: string) =>
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

const formatLineValue = (line?: number) => {
    if (line === undefined) return "-";
    return line > 0 ? `+${line}` : `${line}`;
};

const formatNumberLine = (line?: number) => {
    if (line === undefined) return "-";
    return `${line}`;
};

const formatAltLineLabel = (line: number) => {
    const value = Number.isInteger(line) ? `${line}` : `${line}`;
    return `${value}+`;
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

const statThresholdsForMarket = (market?: PickMarket): number[] => {
    if (!market) return [];
    switch (market) {
        case "RECEIVING_YARDS":
            return STAT_THRESHOLD_CONFIG.NFL_RECEIVING_YARDS;
        case "RUSHING_YARDS":
            return STAT_THRESHOLD_CONFIG.NFL_RUSHING_YARDS;
        case "RUSHING_RECEIVING_YARDS":
            return STAT_THRESHOLD_CONFIG.NFL_RUSH_REC_YARDS;
        case "PASSING_RUSHING_YARDS":
            return STAT_THRESHOLD_CONFIG.NFL_PASS_RUSH_YARDS;
        case "PASSING_YARDS":
            return STAT_THRESHOLD_CONFIG.NFL_PASSING_YARDS;
        case "PASSING_ATTEMPTS":
            return STAT_THRESHOLD_CONFIG.NFL_PASSING_ATTEMPTS;
        case "PASSING_COMPLETIONS":
            return STAT_THRESHOLD_CONFIG.NFL_PASSING_COMPLETIONS;
        case "RECEPTIONS":
            return STAT_THRESHOLD_CONFIG.NFL_RECEPTIONS;
        case "LONGEST_RECEPTION":
            return STAT_THRESHOLD_CONFIG.NFL_LONGEST_RECEPTION;
        case "RUSHING_ATTEMPTS":
            return STAT_THRESHOLD_CONFIG.NFL_ATTEMPTS;
        case "PASSING_TDS":
        case "PASSING_RUSHING_TDS":
        case "RUSHING_TDS":
        case "RECEIVING_TDS":
        case "PLAYER_TDS":
            return STAT_THRESHOLD_CONFIG.NFL_TDS;
        default:
            return [];
    }
};

const getMarketLabel = (market?: PickMarket) =>
    market ? MARKET_LABEL[market] ?? market : "Select a market";

const findGame = (gameOptions: GameOption[], gameId?: string) =>
    gameOptions.find((candidate) => candidate.id === gameId);

const buildPlayerLookup = (gameOptions: GameOption[]) => {
    const map = new Map<string, OddsBlazePlayer>();
    gameOptions.forEach((game) => {
        game.odds.forEach((odd) => {
            if (odd.player) map.set(odd.player.id, odd.player);
        });
    });
    return map;
};

const findPlayer = (
    playerLookup: Map<string, OddsBlazePlayer>,
    playerId?: string
) => (playerId ? playerLookup.get(playerId) : undefined);

const buildAltLinesTable = (
    odds: OddsBlazeOdd[],
    game: GameOption,
    side: "Over" | "Under"
) => {
    const lineSet = new Set<number>();
    const rowMap = new Map<string, AltPropsTableRow>();
    const sideLower = side.toLowerCase();

    odds.forEach((odd) => {
        if (!odd.player) return;
        const line = odd.selection?.line;
        const oddSide = odd.selection?.side?.toLowerCase();
        if (line === undefined || !oddSide || oddSide !== sideLower) return;

        lineSet.add(line);
        if (!rowMap.has(odd.player.id)) {
            rowMap.set(odd.player.id, {
                player: odd.player,
                teamLabel: playerTeamLabel(odd.player, game),
                lines: new Map(),
            });
        }

        const row = rowMap.get(odd.player.id);
        if (!row) return;
        if (!row.lines.has(line)) {
            row.lines.set(line, odd);
        }
    });

    const lines = [...lineSet].sort((a, b) => a - b);
    const rows = [...rowMap.values()].sort((a, b) =>
        a.player.name.localeCompare(b.player.name)
    );

    return { lines, rows };
};

const buildSimpleAltRows = (
    odds: OddsBlazeOdd[],
    game: GameOption,
    side: "Over" | "Under"
) => {
    const rowMap = new Map<string, { odd: OddsBlazeOdd; line?: number }>();
    const sideLower = side.toLowerCase();

    odds.forEach((odd) => {
        if (!odd.player) return;
        const oddSide = odd.selection?.side?.toLowerCase();
        if (oddSide !== sideLower) return;

        const line = odd.selection?.line;
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
        .map(({ odd, line }) => ({
            player: odd.player as OddsBlazePlayer,
            teamLabel: playerTeamLabel(odd.player as OddsBlazePlayer, game),
            line,
            odd,
        }))
        .sort((a, b) => a.player.name.localeCompare(b.player.name));

    return rows;
};

const tdColumnPriority = (key: string) => {
    if (key === "anytime") return 0;
    if (key === "first") return 1;
    if (key.startsWith("td-")) {
        const value = Number(key.replace("td-", ""));
        return Number.isNaN(value) ? 20 : 2 + value;
    }
    if (key === "1h") return 50;
    if (key === "last") return 60;
    return 100;
};

const tdColumnFromOdd = (odd: OddsBlazeOdd): TdScorerColumn | null => {
    if (odd.market === "Player Touchdowns") {
        const side = odd.selection?.side?.toLowerCase();
        if (side && side !== "over") return null;
        const line = odd.selection?.line;
        if (line === undefined) return null;
        if (line < 1) return { key: "anytime", label: "Anytime" };
        const next = Math.floor(line + 0.5);
        return { key: `td-${next}`, label: `${next}+` };
    }
    if (odd.market === "1st Half Player Touchdowns") {
        const side = odd.selection?.side?.toLowerCase();
        if (side && side !== "over") return null;
        return { key: "1h", label: "1H" };
    }
    if (odd.market === "First Touchdown Scorer") {
        return { key: "first", label: "First" };
    }
    if (odd.market === "Last Touchdown Scorer") {
        return { key: "last", label: "Last" };
    }
    return null;
};

const buildTdScorerTable = (odds: OddsBlazeOdd[], game: GameOption) => {
    const columnLabels = new Map<string, string>();
    const rowMap = new Map<string, TdScorerRow>();

    odds.forEach((odd) => {
        if (!odd.player) return;
        const column = tdColumnFromOdd(odd);
        if (!column) return;

        columnLabels.set(column.key, column.label);
        const row = rowMap.get(odd.player.id) ?? {
            player: odd.player,
            teamLabel: playerTeamLabel(odd.player, game),
            odds: new Map(),
        };
        const existing = row.odds.get(column.key);
        if (!existing || (!existing.main && odd.main)) {
            row.odds.set(column.key, odd);
        }
        rowMap.set(odd.player.id, row);
    });

    const columns = Array.from(columnLabels.entries())
        .sort((a, b) => tdColumnPriority(a[0]) - tdColumnPriority(b[0]))
        .map(([key, label]) => ({ key, label }));
    const rows = Array.from(rowMap.values()).sort((a, b) => {
        const aPrice = parseAmericanOdds(a.odds.get("anytime")?.price);
        const bPrice = parseAmericanOdds(b.odds.get("anytime")?.price);
        const aValue = aPrice ?? Number.POSITIVE_INFINITY;
        const bValue = bPrice ?? Number.POSITIVE_INFINITY;
        if (aValue === bValue) {
            return a.player.name.localeCompare(b.player.name);
        }
        return aValue - bValue;
    });

    return { columns, rows };
};

const buildSummary = (
    selection: BuilderSelection,
    gameOptions: GameOption[],
    playerLookup: Map<string, OddsBlazePlayer>,
    selectedOdd?: OddsBlazeOdd | null,
    fallbackDescription?: string
): string => {
    const game = findGame(gameOptions, selection.gameId);
    const player = findPlayer(playerLookup, selection.playerId);
    const matchupLabel = game ? `${game.away_team} @ ${game.home_team}` : null;
    const withMatchup = (detail: string) =>
        matchupLabel ? `${matchupLabel}${DASH_SEPARATOR}${detail}` : detail;

    if (selectedOdd) {
        const marketLabel = marketDisplayName(selectedOdd.market);

        if (selectedOdd.player) {
            const side = selectedOdd.selection?.side ?? (selection.side === "UNDER" ? "Under" : "Over");
            const line = selectedOdd.selection?.line ?? selection.threshold;
            if (line !== undefined) {
                return withMatchup(
                    `${selectedOdd.player.name}${DASH_SEPARATOR}${side} ${line} ${marketLabel}`
                );
            }
            return withMatchup(`${selectedOdd.player.name}${DASH_SEPARATOR}${marketLabel}`);
        }

        if (selectedOdd.market === "Moneyline") {
            const teamName = selectedOdd.selection?.name ?? selectedOdd.name;
            return withMatchup(`${teamName} Moneyline`);
        }

        if (selectedOdd.market === "Point Spread") {
            const teamName = selectedOdd.selection?.name ?? selectedOdd.name;
            const line = selectedOdd.selection?.line;
            const formatted =
                line !== undefined ? (line > 0 ? `+${line}` : `${line}`) : "";
            return withMatchup(`${teamName} ${formatted} Spread`.trim());
        }

        if (
            selectedOdd.market === "Total Points" &&
            selectedOdd.selection?.line !== undefined &&
            selectedOdd.selection?.side
        ) {
            return withMatchup(
                `${selectedOdd.selection.side} ${selectedOdd.selection.line} total points`
            );
        }

        return withMatchup(`${marketLabel}${DASH_SEPARATOR}${selectedOdd.name}`);
    }

    if (
        selection.scope === "PLAYER_PROP" &&
        player &&
        selection.market &&
        selection.threshold !== undefined
    ) {
        const label = getMarketLabel(selection.market);
        const direction = selection.side === "UNDER" ? "Under" : "Over";
        const suffix = selection.market.includes("TDS")
            ? `${direction} ${selection.threshold} TD${selection.threshold > 1 ? "s" : ""}`
            : `${direction} ${selection.threshold} ${label}`;
        return withMatchup(`${player.name}${DASH_SEPARATOR}${suffix}`);
    }

    if (selection.scope === "GAME_LINE" && game) {
        if (selection.market === "MONEYLINE" && selection.teamId) {
            const winner =
                selection.teamId === game.home_team_id ? game.home_team : game.away_team;
            return withMatchup(`${winner} Moneyline`);
        }

        if (selection.market === "SPREAD" && selection.teamId && selection.threshold) {
            const teamName =
                selection.teamId === game.home_team_id ? game.home_team : game.away_team;
            const formattedSpread =
                selection.threshold > 0 ? `+${selection.threshold}` : `${selection.threshold}`;
            return withMatchup(`${teamName} ${formattedSpread} Spread`);
        }

        if (selection.market === "TOTAL_POINTS" && selection.threshold && selection.side) {
            return withMatchup(
                `${selection.side === "OVER" ? "Over" : "Under"} ${selection.threshold} total points`
            );
        }
    }

    if (fallbackDescription) return fallbackDescription;

    return "Ready to build a pick";
};

export const NflPickBuilder = ({
    sport,
    group,
    slip,
    currentUser,
    picks,
    initialPick,
    onSave,
    onCreatePostPick,
    onPostToSlip,
    enforceEligibilityWindow = false,
    builderMode,
    draftPick,
    onDraftPickChange,
    parlayLegs: externalParlayLegs,
    onParlayLegsChange,
    activeDateKey,
    onDateOptionsChange,
}: Props) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [step, setStep] = useState<PickBuilderStep>({ kind: "GAME_SELECT" });
    const [selection, setSelection] = useState<BuilderSelection>({});
    const [showModal, setShowModal] = useState(false);
    const [showTipsModal, setShowTipsModal] = useState(false);
    const [showTierModal, setShowTierModal] = useState(false);
    const [customThreshold, setCustomThreshold] = useState<string>("");
    const [validation, setValidation] = useState<ValidationState>({
        status: "idle",
        response: undefined,
        error: null,
    });
    const [selectedOdd, setSelectedOdd] = useState<OddsBlazeOdd | null>(null);
    const [manualTier, setManualTier] = useState<TierIndex | undefined>(undefined);
    const [gameDetailTab, setGameDetailTab] = useState<GameDetailTab>("GAME_LINES");
    const [search, setSearch] = useState("");
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
        {}
    );
    const [altSideByMarket, setAltSideByMarket] = useState<
        Record<string, "Over" | "Under">
    >({});
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

    const [nflMatchSchedules, setNFLMatchSchedules] = useState<NFLSchedules[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<NFLSchedules | GameOption>();
    const [oddsData, setOddsData] = useState<NFLOdds>();
    const searchTerm = search.trim().toLowerCase();
    const resolveTierMetaForOdds = (americanOdds: number) =>
        useGroupScoring
            ? getGroupTierForAmericanOdds(americanOdds)
            : getTierForAmericanOdds(americanOdds);
    const clampTierForGroup = (tier?: TierIndex) =>
        useGroupScoring && tier && tier > 6 ? 6 : tier;
    const tierMetaForTier = (tier?: TierIndex) => {
        const resolved = clampTierForGroup(tier);
        return resolved ? tierMetaFromIndex(resolved) : undefined;
    };

    const { nflSchedules, nflOdds, validPickError, validPickMessage, loading, validateLoading } = useSelector((state: RootState) => state.nfl);

    useEffect(() => {
        if (activeDateKey) {
            dispatch(fetchLiveNFLScheduleRequest({ date: activeDateKey }));
        } else if (slip?.results_deadline_at && slip?.pick_deadline_at) {
            const resultDate = new Date(slip.results_deadline_at).toISOString().split('T')[0];
            const pickDate = new Date(slip.pick_deadline_at).toISOString().split('T')[0];
            dispatch(fetchLiveNFLScheduleRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate), is_pick_of_day: false }));
        } else {
            dispatch(fetchLiveNFLScheduleRequest({ is_pick_of_day: true }));
        }
    }, [dispatch, slip?.pick_deadline_at, slip?.results_deadline_at, activeDateKey]);

    useEffect(() => {
        if (selectedMatch?.id) {
            dispatch(fetchLiveOddsRequest({ match_id: selectedMatch?.id }));
        }
    }, [selectedMatch?.id, dispatch]);

    useEffect(() => {
        if (Array.isArray(nflSchedules?.events) && nflSchedules?.events?.length) {
            setNFLMatchSchedules(nflSchedules?.events);
        }
        if (nflOdds) {
            setOddsData(nflOdds);
        }
    }, [nflSchedules, nflOdds]);

    // useEffect(() => {
    //     if (typeof window === "undefined") return;
    //     window.dispatchEvent(
    //         new CustomEvent("pick-builder-selection", {
    //             detail: { active: Boolean(draftPick) },
    //         })
    //     );
    // }, [draftPick]);

    // useEffect(() => {
    //     return () => {
    //         if (typeof window === "undefined") return;
    //         window.dispatchEvent(
    //             new CustomEvent("pick-builder-selection", { detail: { active: false } })
    //         );
    //     };
    // }, []);

    useEffect(() => {
        if (!validateLoading && validPickMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: validPickMessage,
                duration: 3000
            });
            dispatch(clearValidateMyNFLPickMessage());
        }
        if (!validateLoading && validPickError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: validPickError,
                duration: 3000
            });
            dispatch(clearValidateMyNFLPickMessage());
        }
    }, [dispatch, validateLoading, validPickMessage, validPickError, setToast]);

    const pick = useMemo(() => {
        if (initialPick) return initialPick;
        if (slip.pick_limit === 1) {
            return picks.find(
                (entry) => entry.slip_id === slip.id && entry.user_id === currentUser?.userId
            );
        }
        return undefined;
    }, [picks, slip.id, currentUser?.userId, initialPick, slip.pick_limit]);

    const gameOptions = useMemo(() => buildGameOptions(oddsData), [oddsData]);
    // const upcomingGames = useMemo(() => {
    //     const base = gameOptions.filter((game) => !game.live && !isPast(game.date));
    //     if (!enforceEligibilityWindow && !isPodMode) {
    //         return filterUpcomingWindowGames(base, 6, false);
    //     }
    //     return base;
    // }, [enforceEligibilityWindow, gameOptions, isPodMode]);
    const playerLookup = useMemo(() => buildPlayerLookup(gameOptions), [gameOptions]);
    const todayIso = useMemo(() => new Date().toISOString(), []);

    const eligibleGames = useMemo(() => {
        if (!enforceEligibilityWindow) return nflMatchSchedules;
        return filterEligibleGames(nflMatchSchedules, slip.pick_deadline_at, windowDays)
    }, [nflMatchSchedules, slip.pick_deadline_at, windowDays, enforceEligibilityWindow]);
    const baseGames = useMemo(() => eligibleGames, [eligibleGames]);
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
    //     baseGames.forEach((game) => {
    //         const key = toDateKey(game.date);
    //         if (!key) return;
    //         keys.add(key);
    //     });
    //     return keys;
    // }, [baseGames]);
    const filteredGames = useMemo(() => {
        if (!shouldFilterByDate || !effectiveDateKey) return baseGames;
        return baseGames.filter((game) => toDateKey(game.date) === effectiveDateKey);
    }, [baseGames, effectiveDateKey, shouldFilterByDate]);
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

    const eligibilityWindowEnd = useMemo(() => {
        if (!enforceEligibilityWindow) return null;
        return eligibleWindowEnd(slip.pick_deadline_at, windowDays);
    }, [enforceEligibilityWindow, slip.pick_deadline_at, windowDays]);

    const resetFlow = () => {
        setSelection({});
        setCustomThreshold("");
        setValidation({ status: "idle", response: undefined, error: null });
        setSelectedOdd(null);
        setManualTier(undefined);
        setGameDetailTab("GAME_LINES");
        setSearch("");
        setParlayLegs([]);
        setStep({ kind: "GAME_SELECT" });
    };

    useEffect(() => {
        if (!pick) {
            resetFlow();
            return;
        }

        setStep({ kind: "GAME_SELECT" });
        const oddsValue = parseAmericanOdds(pick.odds_bracket ?? null);
        const mappedTier =
            oddsValue !== null
                ? resolveTierMetaForOdds(oddsValue).tier
                : tierFromDifficultyLabel(pick.difficulty_label);
        const resolvedTier = clampTierForGroup(mappedTier);
        const hasMarket = Boolean(pick.odds_bracket || pick.selection?.market);
        setManualTier(resolvedTier);
        setValidation({
            status: "resolved",
            response: {
                status: hasMarket ? "VALID" : "NO_MARKET",
                points:
                    typeof pick.points === "number"
                        ? pick.points
                        : tierMetaForTier(resolvedTier)?.points,
                difficultyTier: resolvedTier ?? undefined,
            },
            error: null,
        });
    }, [pick]);

    useEffect(() => {
        if (!isParlayMode) {
            setParlayLegs([]);
        }
    }, [isParlayMode]);

    const locked = !currentUser || !canUserEditSlipPicks(slip);

    const activeGame = findGame(gameOptions, selection.gameId);
    const activePlayer = findPlayer(playerLookup, selection.playerId);
    const filterOdds = (odds: OddsBlazeOdd[], game: GameOption) => {
        if (!searchTerm) return odds;
        return odds.filter((odd) => {
            const haystack = buildSearchHaystack(odd, game)
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(searchTerm);
        });
    };

    const mainLineOdds = useMemo(() => {
        if (!activeGame) return null;
        const spreadAway = findMainTeamOdd(activeGame, "Point Spread", activeGame.away_team);
        const spreadHome = findMainTeamOdd(activeGame, "Point Spread", activeGame.home_team);
        const moneyAway = findMainTeamOdd(activeGame, "Moneyline", activeGame.away_team);
        const moneyHome = findMainTeamOdd(activeGame, "Moneyline", activeGame.home_team);
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
            activeGame
                ? activeGame.odds.filter((odd) => odd.market === "Point Spread" && !odd.main)
                : [],
        [activeGame]
    );

    const altTotalOdds = useMemo(
        () =>
            activeGame
                ? activeGame.odds.filter((odd) => odd.market === "Total Points" && !odd.main)
                : [],
        [activeGame]
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
            if (teamId === activeGame.home_team_id) entry.home = odd;
            if (teamId === activeGame.away_team_id) entry.away = odd;
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

    const hasMainLines = Boolean(
        mainLineOdds?.spreadAway ||
        mainLineOdds?.spreadHome ||
        mainLineOdds?.moneyAway ||
        mainLineOdds?.moneyHome ||
        mainLineOdds?.totalOver ||
        mainLineOdds?.totalUnder
    );

    const hasGameLinesData =
        hasMainLines || altSpreadOdds.length > 0 || altTotalOdds.length > 0;

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

    const tabMarketOptions = useMemo(() => {
        const options = {
            PASSING: [] as string[],
            RECEIVING: [] as string[],
            RUSHING: [] as string[],
            TD_SCORER: [] as string[],
        };

        if (!activeGame) return options;

        activeGame.odds.forEach((odd) => {
            if (!odd.main || !odd.player) return;
            if (!marketForOdd(odd)) return;

            const { market } = odd;
            if (market.includes("Passing")) {
                if (!options.PASSING.includes(market)) options.PASSING.push(market);
                return;
            }
            if (market.includes("Receiving") || market.includes("Reception")) {
                if (!options.RECEIVING.includes(market)) options.RECEIVING.push(market);
                return;
            }
            if (market.includes("Rushing")) {
                if (!options.RUSHING.includes(market)) options.RUSHING.push(market);
                return;
            }
            if (market.includes("Touchdown")) {
                if (!options.TD_SCORER.includes(market)) options.TD_SCORER.push(market);
            }
        });

        return options;
    }, [activeGame]);

    const goBack = () => {
        setValidation({ status: "idle", response: undefined, error: null });
        switch (step.kind) {
            case "PLAYER_SELECT_THRESHOLD":
                setSelection((prev) => ({ ...prev, threshold: undefined }));
                setStep({ kind: "GAME_DETAIL" });
                break;
            case "GAME_MONEYLINE_TEAM":
                setSelection((prev) => ({
                    ...prev,
                    teamId: undefined,
                    side: undefined,
                    threshold: undefined,
                }));
                setStep({ kind: "GAME_DETAIL" });
                break;
            case "GAME_SPREAD_TEAM":
                setSelection((prev) => ({ ...prev, teamId: undefined, threshold: undefined }));
                setStep({ kind: "GAME_DETAIL" });
                break;
            case "GAME_SPREAD_MARGIN":
                setSelection((prev) => ({ ...prev, threshold: undefined }));
                setStep({ kind: "GAME_SPREAD_TEAM" });
                break;
            case "GAME_TOTAL_SIDE":
                setSelection((prev) => ({ ...prev, side: undefined, threshold: undefined }));
                setStep({ kind: "GAME_DETAIL" });
                break;
            case "GAME_TOTAL_THRESHOLD":
                setSelection((prev) => ({ ...prev, threshold: undefined }));
                setStep({ kind: "GAME_TOTAL_SIDE" });
                break;
            case "CONFIRMATION":
                setStep({ kind: "GAME_DETAIL" });
                break;
            default:
                handleBackToGames();
        }
    };

    const handleGameChoice = (game: GameOption | NFLSchedules) => {
        setSelection({
            scope: "GAME_LINE",
            gameId: game.id,
            teamId: undefined,
            playerId: undefined,
            threshold: undefined,
            side: undefined,
            market: undefined,
        });
        setSelectedMatch(game)
        setValidation({ status: "idle", response: undefined, error: null });
        setSelectedOdd(null);
        setManualTier(undefined);
        setGameDetailTab("GAME_LINES");
        setSearch("");
        setStep({ kind: "GAME_DETAIL" });
    };

    const setThresholdAndValidate = (nextThreshold: number, nextSide?: PickSide) => {
        const side = nextSide ?? selection.side;
        const updatedSelection = { ...selection, threshold: nextThreshold, side };
        setSelection(updatedSelection);
        void runValidation(updatedSelection);
    };

    const mockValidationFromSelection = (
        payload: ValidatePickRequest
    ): ValidatePickResponse => {
        const baseOdds = payload.market === "MONEYLINE" ? -120 : -110;
        const threshold = payload.threshold ?? 0;

        if (
            ["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) &&
            threshold < 20
        ) {
            return {
                status: "TOO_SAFE",
                suggestedThresholds: [40, 50, 60],
            };
        }

        if (
            ["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) &&
            threshold > 350
        ) {
            return {
                status: "TOO_CRAZY",
                suggestedThresholds: [90, 110, 130],
            };
        }

        if (payload.market === "TOTAL_POINTS" && (threshold < 25 || threshold > 70)) {
            return {
                status: threshold < 25 ? "TOO_SAFE" : "TOO_CRAZY",
                suggestedThresholds: TOTAL_POINT_THRESHOLDS,
            };
        }

        const americanOdds =
            payload.market === "MONEYLINE"
                ? baseOdds + Math.round(Math.random() * 80)
                : baseOdds + Math.round(Math.random() * 120);
        const tierMeta = resolveTierMetaForOdds(americanOdds);
        return {
            status: "VALID",
            bookOdds: [{ book: "MockBook", americanOdds }],
            bestOffer: { book: "MockBook", americanOdds },
            difficultyTier: tierMeta.tier,
            points: tierMeta.points,
        };
    };

    const runValidation = async (state: BuilderSelection) => {
        setManualTier(undefined);

        if (!state.scope || !state.market || !state.gameId) return;
        const game = findGame(gameOptions, state.gameId);
        const gameIsEligible =
            !enforceEligibilityWindow ||
            (game && filterEligibleGames([game], slip.pick_deadline_at, windowDays).length > 0);

        if (!gameIsEligible) {
            setValidation({
                status: "resolved",
                response: { status: "API_ERROR" },
                error: `Eligible games start after the pick deadline and within ${windowDays} day${windowDays === 1 ? "" : "s"}.`,
            });
            return;
        }

        if (game && isPast(game.date)) {
            setValidation({
                status: "resolved",
                response: { status: "API_ERROR" },
                error: "This game is locked for picks.",
            });
            return;
        }

        if (group.id && slip.id) {
            const payload: ValidatePickRequest = {
                scope: state.scope,
                market: state.market,
                gameId: state.gameId,
                teamId: state.teamId,
                playerId: state.playerId,
                side: state.side,
                threshold: state.threshold,
                groupId: group.id,
                contestId: slip.id,
                userId: currentUser?.userId,
            };

            try {
                const response = await fetch("/api/picks/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error("Validation failed");
                }

                const data = (await response.json()) as ValidatePickResponse;
                setValidation({ status: "resolved", response: data, error: null });
                if (data.status === "VALID") {
                    setStep({ kind: "GAME_DETAIL" });
                }
            } catch {
                const fallback = mockValidationFromSelection(payload);
                setValidation({
                    status: "resolved",
                    response: fallback,
                    error: "Live odds unavailable. Using fallback suggestions.",
                });
                if (fallback.status === "VALID") {
                    setStep({ kind: "GAME_DETAIL" });
                }
            }
        }
        setValidation({ status: "loading", response: undefined, error: null });
    };

    const validationStatus = validation.response?.status;
    const validationSuggestions = validation.response?.suggestedThresholds ?? [];
    const summary = useMemo(
        () => buildSummary(selection, gameOptions, playerLookup, selectedOdd, pick?.description),
        [selection, gameOptions, playerLookup, selectedOdd, pick?.description]
    );
    const hasSummary = summary.trim() !== "" && summary !== "Ready to build a pick";
    const selectedOddsValue =
        validation.response?.bestOffer?.americanOdds ??
        validation.response?.bookOdds?.[0]?.americanOdds ??
        parseAmericanOdds(selectedOdd?.price) ??
        parseAmericanOdds(pick?.odds_bracket ?? null);
    const selectedOdds =
        selectedOddsValue !== null ? formatOdds(selectedOddsValue) : pick?.odds_bracket ?? "—";
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
                const game = findGame(gameOptions, leg.eventId);
                const matchup = game ? `${game.away_team} @ ${game.home_team}` : leg.matchup ?? null;
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
                        side: leg.side ? (leg.side.toUpperCase() as PickSide) : undefined,
                        threshold: leg.line,
                        gameStartTime: startTime,
                    },
                };
            }),
        [gameOptions, parlayLegs]
    );
    const comboSport = useMemo(() => {
        const uniqueSports = Array.from(
            new Set(parlayLegs.map((leg) => leg.sport).filter(Boolean))
        );
        if (uniqueSports.length === 1) return uniqueSports[0] as League | string;
        if (uniqueSports.length > 1) return "Combo";
        return sport;
    }, [parlayLegs, sport]);
    const autoTier =
        validation.response?.difficultyTier ??
        (selectedOddsValue !== null ? resolveTierMetaForOdds(selectedOddsValue).tier : undefined);
    const effectiveTier = clampTierForGroup(manualTier ?? autoTier);
    const points =
        validation.response?.points ?? tierMetaForTier(effectiveTier)?.points;
    const selectedMarketLabel = selectedOdd
        ? marketDisplayName(selectedOdd.market)
        : selection.market
            ? getMarketLabel(selection.market)
            : undefined;
    const rawSide = selectedOdd?.selection?.side ?? selection.side;
    const selectedSideLabel = rawSide
        ? rawSide.toLowerCase() === "over"
            ? "Over"
            : rawSide.toLowerCase() === "under"
                ? "Under"
                : rawSide
        : null;
    const selectedLine =
        selectedOdd?.selection?.line ?? selection.threshold ?? undefined;
    const selectedLineLabel =
        selectedLine !== undefined && selectedSideLabel
            ? `${selectedSideLabel} ${selectedLine}`
            : selectedLine !== undefined
                ? `Line ${selectedLine}`
                : selectedSideLabel;
    const selectedMatchup = activeGame
        ? `${activeGame.away_team} @ ${activeGame.home_team}`
        : undefined;
    const payloadOdds =
        selectedOddsValue === null || selectedOddsValue === undefined
            ? pick?.odds_bracket ?? undefined
            : formatOdds(selectedOddsValue);
    // const payloadDifficulty = slip.isGraded ? null : tierLabelFromTier(effectiveTier);
    const payloadDifficulty = tierLabelFromTier(effectiveTier);
    const selectionMeta = useMemo<PickSelectionMeta | undefined>(() => {
        if (!selection.gameId && !selection.playerId && !selection.market) {
            return undefined;
        }

        return {
            scope: selection.scope,
            market: selection.market,
            gameId: selection.gameId,
            gameStartTime: activeGame?.date,
            teamId: selection.teamId,
            playerId: selection.playerId,
            side: selection.side,
            threshold: selection.threshold,
            away_team: activeGame?.away_team,
            home_team: activeGame?.home_team,
        };
    }, [
        selection.scope,
        selection.market,
        selection.gameId,
        activeGame?.date,
        selection.teamId,
        selection.playerId,
        selection.side,
        selection.threshold,
        activeGame?.away_team,
        activeGame?.home_team,
    ]);
    const sourceTab = resolveNflSourceTab(selection);

    const localDraft = useMemo(() => {
        if (!hasSummary) return null;
        return {
            sport,
            description: summary,
            odds: payloadOdds,
            difficulty_label: payloadDifficulty,
            buildMode: "ODDS",
            points,
            selection: selectionMeta,
            summary,
            matchup: selectedMatchup,
            match_date: activeGame?.date,
            odds_bracket: selectedOdds,
            market: selectedMarketLabel,
            lineLabel: selectedLineLabel,
            displayDifficulty: effectiveTier ? formatTierPrimary(effectiveTier) : undefined,
            difficultyTier: effectiveTier,
            source: sport,
            confidence: "MEDIUM",
            sourceTab,
        } satisfies DraftPick;
    }, [
        hasSummary,
        summary,
        payloadOdds,
        payloadDifficulty,
        points,
        selectionMeta,
        selectedMatchup,
        selectedOdds,
        selectedMarketLabel,
        selectedLineLabel,
        effectiveTier,
        sport,
        sourceTab,
        activeGame?.date,
    ]);

    const comboDraft = useMemo(() => {
        if (!hasMultipick) return null;
        const description = comboLegs.map((leg) => leg.description).join(" + ");
        const summaryLabel = description ? `Combo: ${description}` : "Combo pick";
        const oddsLabel = comboOddsValue === null ? "—" : formatOdds(comboOddsValue);
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
            odds: payloadOdds || undefined,
            difficulty_label: difficultyLabel,
            buildMode: "ODDS",
            points: comboTierMeta?.points,
            isCombo: true,
            legs: comboLegs,
            summary: summaryLabel,
            matchup: selectedMatchup,
            match_date: activeGame?.date,
            odds_bracket: oddsLabel,
            market: "Combo",
            lineLabel: null,
            displayDifficulty: comboTierMeta
                ? formatTierPrimary(comboTierMeta.tier)
                : undefined,
            source: comboSport,
            confidence: "MEDIUM",
            sourceTab: "Combo",
        } satisfies DraftPick;
    }, [comboLegs, comboOddsValue, comboTierMeta, hasMultipick, comboSport, slip.isGraded, selectedMatchup, activeGame?.date]);

    const activeDraft = comboDraft ?? localDraft ?? draftPick ?? null;
    const reviewDrafts = useMemo(() => (activeDraft ? [activeDraft] : []), [activeDraft]);
    const hasMultiSelection = hasMultipick;
    const multiSelectionCount = hasMultipick ? parlayLegs.length : reviewDrafts.length;
    const showReviewSheet = Boolean(activeDraft);
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
    const sheetHeaderLabel = hasMultipick
        ? confirmationVariant === "post"
            ? "Combo post"
            : "Combo pick"
        : confirmationVariant === "post"
            ? "Post pick"
            : "Selected pick";
    const activeDraftKey = useMemo(() => {
        if (!activeDraft) return "";
        return JSON.stringify({
            summary: activeDraft.summary,
            odds: activeDraft.odds_bracket,
            difficultyLabel: activeDraft.difficulty_label,
            points: activeDraft.points,
            // selection: activeDraft.selection,
            // isCombo: activeDraft.isCombo,
            // legs: activeDraft.legs?.map((leg) => ({
            //     description: leg.description,
            //     odds: leg.odds,
            //     selection: leg.selection,
            // })),
        });
    }, [activeDraft]);
    const lastDraftKeyRef = useRef<string>("");

    useEffect(() => {
        if (!showReviewSheet) {
            setIsReviewOpen(false);
        }
    }, [showReviewSheet]);

    useEffect(() => {
        if (!activeDraft) return;
        if (activeDraftKey === lastDraftKeyRef.current) return;
        lastDraftKeyRef.current = activeDraftKey;
        onDraftPickChange?.(activeDraft);
    }, [activeDraft, activeDraftKey, onDraftPickChange]);

    const buildParlayLegPayloads = () => {
        const payloads: BuiltPickPayload[] = [];

        for (const leg of parlayLegs) {
            const context = findLegContext(leg);
            if (!context) return null;
            const market = marketForOdd(context.odd);
            if (!market) return null;
            const legSelection: BuilderSelection = {
                oddId: context.odd.id,
                scope: context.odd.player ? "PLAYER_PROP" : "GAME_LINE",
                market,
                gameId: context.game.id,
                teamId: context.odd.player ? undefined : teamIdFromOdd(context.odd, context.game),
                playerId: context.odd.player?.id,
                side: pickSideFromSelection(context.odd.selection?.side),
                threshold: context.odd.selection?.line,
            };
            const summary = buildSummary(
                legSelection,
                gameOptions,
                playerLookup,
                context.odd,
                pick?.description
            ).trim();
            if (!summary) return null;

            const americanOdds = parseAmericanOdds(context.odd.price);
            const oddsLabel = formatOdds(americanOdds ?? context.odd.price);
            const payloadOdds = oddsLabel === "—" ? null : oddsLabel;
            const tierMeta =
                americanOdds !== null ? resolveTierMetaForOdds(americanOdds) : undefined;
            const selectionMeta: PickSelectionMeta = {
                scope: legSelection.scope,
                market: legSelection.market,
                gameId: legSelection.gameId,
                gameStartTime: context.game.date,
                teamId: legSelection.teamId,
                playerId: legSelection.playerId,
                side: legSelection.side,
                threshold: legSelection.threshold,
            };

            payloads.push({
                sport,
                description: summary,
                odds_bracket: payloadOdds,
                difficulty_label: slip.isGraded
                    ? null
                    : tierMeta
                        ? tierLabelFromTier(tierMeta.tier)
                        : null,
                buildMode: "ODDS",
                points: tierMeta?.points,
                selection: selectionMeta,
                sourceTab: resolveNflSourceTab(legSelection),
                match_date: context.game.date,
                matchup: `${context.game.home_abbr} @ ${context.game.away_abbr}`
            });
        }

        return payloads;
    };

    const handleSubmitPick = (action: "post" | "slip") => {
        if (locked) return;

        if (action === "post" && !selectedConfidence) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Select a confidence level to post.",
                duration: 3000
            })
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
                })
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
                    })
                    return;
                }
            }

            payloads.forEach((payload) => {
                handler({
                    ...payload,
                    confidence: selectedConfidence ?? activeDraft?.confidence ?? null,
                });
            });
            return;
        }

        if (!activeDraft) return;
        handler({
            ...activeDraft,
            confidence: selectedConfidence ?? activeDraft?.confidence ?? null,
        });
    };

    const renderGameCards = () => {
        if (filteredGames.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    <p className="font-semibold text-white">
                        {noGamesForSelectedDate
                            ? "No games scheduled"
                            : enforceEligibilityWindow
                                ? "No eligible games"
                                : "No games scheduled"}
                    </p>
                    {noGamesForSelectedDate ? (
                        <p className="mt-1 text-xs text-gray-400">No games scheduled for this day.</p>
                    ) : enforceEligibilityWindow ? (
                        <>
                            <p className="mt-1 text-xs text-gray-400">
                                Games must start after the pick deadline and within the next{" "}
                                {windowDays} day{windowDays === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Try adjusting the pick deadline to refresh the slate.
                            </p>
                        </>
                    ) : (
                        <p className="mt-1 text-xs text-gray-400">No games scheduled for this day.</p>
                    )}
                </div>
            );
        }

        return (
            <div className="scrollbar-hide grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredGames.map((game) => (
                    <button
                        key={game.id}
                        type="button"
                        onClick={() => handleGameChoice(game)}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-emerald-500/10 p-4 text-left text-white transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={locked}
                    >
                        <div className="flex items-start justify-between text-sm font-semibold text-white">
                            <span>
                                <span className="block">{game.teams.away.name} @</span>
                                <span className="block">{game.teams.home.name}</span>
                            </span>
                            <span className="text-xs text-emerald-200">
                                {formatDateTime(game.date)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                            <span>
                                {game.teams.away.abbreviation} @ {game.teams.home.abbreviation}
                            </span>
                            {game.live && (
                                <>
                                    <span>-</span>
                                    <span className="text-rose-200">Live</span>
                                </>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    const renderGameEntryStep = () => (
        <div className="grid gap-6">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Choose a matchup</h4>
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                        Game lines + props
                    </span>
                </div>
                {!enforceEligibilityWindow ? (
                    <p className="text-xs text-gray-400">
                        Showing the upcoming NFL slate.
                    </p>
                ) : (
                    <p className="text-xs text-gray-400">
                        Eligible games start after the pick deadline and before{" "}
                        {formatDateTime(eligibilityWindowEnd ?? "")}.
                    </p>
                )}
                {/* {showDateFilters && dateOptions.length > 0 && (
                    <div className="flex w-full items-center gap-3 overflow-x-auto pb-1">
                        {dateOptions.map((option) => {
                            const active = option.key === effectiveDateKey;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => onDateChange?.(option.key, "user")}
                                    className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition ${active
                                        ? "border-emerald-300 text-white"
                                        : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )} */}
                {renderGameCards()}
            </div>
        </div>
    );

    const handleBackToGames = () => {
        setStep({ kind: "GAME_SELECT" });
        setValidation({ status: "idle", response: undefined, error: null });
        setSelectedOdd(null);
        setManualTier(undefined);
        setCustomThreshold("");
        setSearch("");
        setSelection((prev) => ({
            ...prev,
            oddId: undefined,
            scope: undefined,
            gameId: undefined,
            teamId: undefined,
            playerId: undefined,
            market: undefined,
            side: undefined,
            threshold: undefined,
        }));
        setGameDetailTab("GAME_LINES");
    };

    const handleTabChange = (tab: GameDetailTab) => {
        setGameDetailTab(tab);
        setValidation({ status: "idle", response: undefined, error: null });
        setSelectedOdd(null);
        setManualTier(undefined);
        setCustomThreshold("");
        setSelection((prev) => ({
            ...prev,
            oddId: undefined,
            scope: tab === "GAME_LINES" ? "GAME_LINE" : "PLAYER_PROP",
            market: undefined,
            teamId: undefined,
            playerId: undefined,
            side: tab === "TD_SCORER" ? "OVER" : undefined,
            threshold: undefined,
        }));
        setStep({ kind: "GAME_DETAIL" });
    };

    const tabForOdd = (odd: OddsBlazeOdd): GameDetailTab => {
        if (!odd.player) return "GAME_LINES";
        const market = odd.market;
        if (market.includes("Passing")) return "PASSING";
        if (market.includes("Receiving") || market.includes("Reception")) return "RECEIVING";
        if (market.includes("Rushing")) return "RUSHING";
        if (market.includes("Touchdown")) return "TD_SCORER";
        return "GAME_LINES";
    };

    const isOddSelected = (odd?: OddsBlazeOdd) => {
        if (!odd) return false;
        if (isParlayMode) {
            return parlayLegs.some((leg) => leg.id === odd.id);
        }
        return selectedOdd?.id === odd.id;
    };

    const clearSelection = () => {
        setValidation({ status: "idle", response: undefined, error: null });
        setSelectedOdd(null);
        setManualTier(undefined);
        setCustomThreshold("");
        setSelection((prev) => ({
            ...prev,
            oddId: undefined,
            market: undefined,
            teamId: undefined,
            playerId: undefined,
            side: undefined,
            threshold: undefined,
        }));
    };

    const applySelection = (odd: OddsBlazeOdd, game: GameOption, market: PickMarket) => {
        const payload: BuilderSelection = {
            oddId: odd.id,
            scope: odd.player ? "PLAYER_PROP" : "GAME_LINE",
            market,
            gameId: game.id,
            teamId: odd.player ? undefined : teamIdFromOdd(odd, game),
            playerId: odd.player?.id,
            side: pickSideFromSelection(odd.selection?.side),
            threshold: odd.selection?.line,
        };

        setSelection(payload);
        setSelectedOdd(odd);
        setManualTier(undefined);
        setCustomThreshold("");

        const americanOdds = parseAmericanOdds(odd.price);
        if (americanOdds === null) {
            setValidation({
                status: "resolved",
                response: { status: "NO_MARKET" },
                error: "Odds data isn't available for this selection yet.",
            });
            return;
        }

        const tierMeta = resolveTierMetaForOdds(americanOdds);
        const bookOdds: BookOdds = {
            book: nflOdds?.sportsBook?.name,
            americanOdds,
            marketLine: odd.selection?.line,
            deeplinkUrl: odd.links?.mobile ?? odd.links?.desktop,
        };

        setValidation({
            status: "resolved",
            response: {
                status: "VALID",
                bookOdds: [bookOdds],
                bestOffer: bookOdds,
                difficultyTier: tierMeta.tier,
                points: tierMeta.points,
            },
            error: null,
        });
    };

    const findLegContext = (leg: ParlayLeg) => {
        const targetGame = gameOptions.find((game) => game.id === leg.eventId);
        if (!targetGame) return null;
        const targetOdd = targetGame.odds.find((odd) => odd.id === leg.id);
        if (!targetOdd) return null;
        return { game: targetGame, odd: targetOdd };
    };

    const handleEditParlayLeg = (leg: ParlayLeg) => {
        const context = findLegContext(leg);
        if (!context) return;
        setGameDetailTab(tabForOdd(context.odd));
        setStep({ kind: "GAME_DETAIL" });
        handleOddsSelection(context.odd, context.game, { skipParlay: true });
    };

    const handleRemoveParlayLeg = (legId: string) => {
        const remainingLegs = parlayLegs.filter((leg) => leg.id !== legId);
        setParlayLegs(remainingLegs);
        if (remainingLegs.length === 0) {
            onDraftPickChange?.(null);
            clearSelection();
            return;
        }
        if (selectedOdd?.id !== legId) return;
        const preferredEventId = activeGame?.id;
        const fallbackLeg =
            (preferredEventId
                ? remainingLegs.find((leg) => leg.eventId === preferredEventId)
                : undefined) ?? remainingLegs[remainingLegs.length - 1];
        if (fallbackLeg) {
            const fallbackContext = findLegContext(fallbackLeg);
            const fallbackMarket = fallbackContext
                ? marketForOdd(fallbackContext.odd)
                : undefined;
            if (fallbackContext && fallbackMarket) {
                applySelection(fallbackContext.odd, fallbackContext.game, fallbackMarket);
                return;
            }
        }
        clearSelection();
    };

    const handleOddsSelection = (
        odd: OddsBlazeOdd,
        gameOverride?: GameOption,
        options?: { skipParlay?: boolean }
    ) => {
        const game = gameOverride ?? activeGame;
        if (!game) return;
        const skipParlay = options?.skipParlay ?? false;

        if (enforceEligibilityWindow) {
            const isEligible =
                filterEligibleGames([game], slip.pick_deadline_at, windowDays).length > 0;
            if (!isEligible) {
                setValidation({
                    status: "resolved",
                    response: { status: "API_ERROR" },
                    error: `Eligible games start after the pick deadline and within ${windowDays} day${windowDays === 1 ? "" : "s"}.`,
                });
                return;
            }
        }

        if (isPast(game.date)) {
            setValidation({
                status: "resolved",
                response: { status: "API_ERROR" },
                error: "This game is locked for picks.",
            });
            return;
        }

        const market = marketForOdd(odd);
        if (!market) {
            setValidation({
                status: "resolved",
                response: { status: "NO_MARKET" },
                error: "No matching market available for this pick yet.",
            });
            return;
        }

        if (isParlayMode && !skipParlay) {
            const eventForLeg: OddsEvent = {
                id: game.id,
                teams: {
                    home: {
                        id: game.home_team_id,
                        name: game.home_team,
                        abbreviation: game.home_abbr,
                    },
                    away: {
                        id: game.away_team_id,
                        name: game.away_team,
                        abbreviation: game.away_abbr,
                    },
                },
                date: game.date,
                live: game.live,
                odds: game.odds as OddsEvent["odds"],
            };
            const matchup = `${game.away_team} @ ${game.home_team}`;
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
                if (odd.id && game.id) {
                    dispatch(validateMyNFLPickRequest({ match_id: game.id, external_pick_key: odd.id }))
                }
            }
            if (existingLeg) {
                const remainingLegs = parlayLegs.filter((leg) => leg.id !== incomingLeg.id);
                setParlayLegs(remainingLegs);
                if (selectedOdd?.id === incomingLeg.id) {
                    const fallbackLeg =
                        remainingLegs.find((leg) => leg.eventId === game.id) ??
                        remainingLegs[remainingLegs.length - 1];
                    if (fallbackLeg) {
                        const fallbackContext = findLegContext(fallbackLeg);
                        const fallbackMarket = fallbackContext
                            ? marketForOdd(fallbackContext.odd)
                            : undefined;
                        if (fallbackContext && fallbackMarket) {
                            applySelection(
                                fallbackContext.odd,
                                fallbackContext.game,
                                fallbackMarket
                            );
                            return;
                        }
                    }
                    clearSelection();
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
        }

        applySelection(odd, game, market);
    };

    const isSectionCollapsed = (key: string, defaultOpen = true) =>
        collapsedSections[key] ?? !defaultOpen;

    const toggleSection = (key: string, defaultOpen = true) => {
        setCollapsedSections((prev) => {
            const current = prev[key] ?? !defaultOpen;
            return { ...prev, [key]: !current };
        });
    };

    const renderPropMarketSection = (
        sectionKey: string,
        title: string,
        marketOdds: OddsBlazeOdd[],
        game: GameOption,
        defaultOpen: boolean
    ) => {
        const collapsed = isSectionCollapsed(sectionKey, defaultOpen);
        const filteredOdds = filterOdds(marketOdds, game);
        return (
            <section
                key={sectionKey}
                className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
            >
                <button
                    type="button"
                    onClick={() => toggleSection(sectionKey, defaultOpen)}
                    aria-expanded={!collapsed}
                    className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                >
                    <span className="text-base font-semibold text-white">{title}</span>
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
                    <div className="mt-4">
                        {renderPlayerOddsBoard(buildPlayerMarketRows(filteredOdds, game), title)}
                    </div>
                )}
            </section>
        );
    };

    const renderAltPropMarketSection = (
        sectionKey: string,
        title: string,
        markets: string[],
        game: GameOption,
        defaultOpen: boolean
    ) => {
        const marketOdds = filterOdds(
            game.odds.filter((odd) => markets.includes(odd.market) && odd.player),
            game
        );
        const altOdds = marketOdds.filter((odd) => !odd.main);
        const collapsed = isSectionCollapsed(sectionKey, defaultOpen);
        const sides = new Set(
            altOdds
                .map((item) => item.selection?.side?.toLowerCase())
                .filter(Boolean) as string[]
        );
        const hasOver = sides.has("over");
        const hasUnder = sides.has("under");
        const defaultSide = hasOver ? "Over" : hasUnder ? "Under" : "Over";
        const activeSide = altSideByMarket[sectionKey] ?? defaultSide;
        const table = buildAltLinesTable(altOdds, game, activeSide);
        const showTable =
            activeSide === "Over" && table.lines.length > 1 && table.rows.length > 0;
        const simpleRows = buildSimpleAltRows(altOdds, game, activeSide);

        return (
            <section
                key={sectionKey}
                className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
            >
                <button
                    type="button"
                    onClick={() => toggleSection(sectionKey, defaultOpen)}
                    aria-expanded={!collapsed}
                    className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                >
                    <span className="text-base font-semibold text-white">{title}</span>
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
                        {altOdds.length === 0 ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                No {title.toLowerCase()} available for this matchup yet.
                            </div>
                        ) : (
                            <>
                                {(hasOver || hasUnder) && (
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        {["Over", "Under"].map((side) => {
                                            if (side === "Over" && !hasOver) return null;
                                            if (side === "Under" && !hasUnder) return null;
                                            const active = activeSide === side;
                                            return (
                                                <button
                                                    key={`${sectionKey}-${side}`}
                                                    type="button"
                                                    onClick={() =>
                                                        setAltSideByMarket((prev) => ({
                                                            ...prev,
                                                            [sectionKey]: side as "Over" | "Under",
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
                                )}

                                {showTable ? (
                                    <div className="mt-4 overflow-x-auto">
                                        <div className="min-w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                            <div
                                                className="grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                style={{
                                                    gridTemplateColumns: table.lines.length
                                                        ? `minmax(140px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                                        : "minmax(140px,1fr)",
                                                }}
                                            >
                                                <div className="sticky left-0 z-20 bg-black/80 px-3 py-2 sm:min-w-[190px]">
                                                    Scroll right to see more
                                                </div>
                                                {table.lines.map((line) => (
                                                    <div
                                                        key={`${sectionKey}-${line}`}
                                                        className="px-3 py-2 text-center"
                                                    >
                                                        <span className="sr-only">
                                                            {formatAltLineLabel(line)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {table.rows.map((row, rowIndex) => {
                                                const rowBand =
                                                    rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                                return (
                                                    <div
                                                        key={`${sectionKey}-${row.player.id}`}
                                                        className={`grid gap-2 border-b border-white/5 ${rowBand}`}
                                                        style={{
                                                            gridTemplateColumns: table.lines.length
                                                                ? `minmax(140px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                                                : "minmax(140px,1fr)",
                                                        }}
                                                    >
                                                        <div className="sticky left-0 z-10 bg-black/80 px-3 py-3 sm:min-w-[190px]">
                                                            <p className="text-sm font-semibold text-white">
                                                                {row.player.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                {/* {row.teamLabel} */}
                                                                {playerMetaLabel(row.player, row.teamLabel)}
                                                            </p>
                                                        </div>
                                                        {table.lines.map((line) => {
                                                            const odd = row.lines.get(line);
                                                            const isSelected = isOddSelected(odd);
                                                            const oddsLabel = odd ? formatOdds(odd.price) : "-";
                                                            const lineLabel =
                                                                activeSide === "Over"
                                                                    ? formatAltLineLabel(line)
                                                                    : `U ${formatNumberLine(line)}`;
                                                            return (
                                                                <div
                                                                    key={`${row.player.id}-${line}`}
                                                                    className="flex justify-center px-1 py-2"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => odd && handleOddsSelection(odd)}
                                                                        disabled={!odd || locked}
                                                                        className={`flex ${!odd ? "cursor-not-allowed" : ""}`}
                                                                    >
                                                                        {renderLineOddsBox(
                                                                            lineLabel,
                                                                            oddsLabel,
                                                                            isSelected,
                                                                            !odd
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : simpleRows.length > 0 ? (
                                    <div className="mt-4 overflow-x-auto">
                                        <div className="min-w-[320px] text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                            <div
                                                className="grid border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                style={{
                                                    gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                                }}
                                            >
                                                <div className="px-3 py-2">Player</div>
                                                <div className="px-3 py-2 text-center">{activeSide}</div>
                                            </div>
                                            {simpleRows.map((row, rowIndex) => {
                                                const isSelected = isOddSelected(row.odd);
                                                const rowBand =
                                                    rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                                const lineLabel =
                                                    activeSide === "Over"
                                                        ? row.line !== undefined
                                                            ? formatAltLineLabel(row.line)
                                                            : "-"
                                                        : row.line !== undefined
                                                            ? `U ${formatNumberLine(row.line)}`
                                                            : "U -";
                                                const oddsLabel = row.odd ? formatOdds(row.odd.price) : "-";
                                                return (
                                                    <button
                                                        key={`${sectionKey}-${row.player.id}`}
                                                        type="button"
                                                        onClick={() => row.odd && handleOddsSelection(row.odd)}
                                                        disabled={!row.odd || locked}
                                                        className={`grid w-full items-center border-b border-white/5 px-0 text-left transition ${rowBand} ${isSelected
                                                            ? "border-emerald-300/60 bg-emerald-500/10"
                                                            : "hover:bg-white/[0.02]"
                                                            } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                                        style={{
                                                            gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                                        }}
                                                    >
                                                        <div className="px-3 py-3">
                                                            <p className="text-sm font-semibold text-white">
                                                                {row.player.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                {/* {row.teamLabel} */}
                                                                {playerMetaLabel(row.player, row.teamLabel)}
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-center px-3 py-3">
                                                            {renderLineOddsBox(
                                                                lineLabel,
                                                                oddsLabel,
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
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                        No {title.toLowerCase()} available for this matchup yet.
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </section>
        );
    };

    const renderGameDetailShell = (children: ReactNode) => {
        if (!activeGame) return null;
        const hasGameLines = hasGameLinesData;
        const tabs: { key: GameDetailTab; label: string; enabled: boolean }[] = [
            {
                key: "GAME_LINES",
                label: NFL_TAB_LABELS.GAME_LINES,
                enabled: hasGameLines
            },
            {
                key: "PASSING",
                label: NFL_TAB_LABELS.PASSING,
                enabled: tabMarketOptions.PASSING.length > 0
            },
            {
                key: "RECEIVING",
                label: NFL_TAB_LABELS.RECEIVING,
                enabled: tabMarketOptions.RECEIVING.length > 0,
            },
            {
                key: "RUSHING",
                label: NFL_TAB_LABELS.RUSHING,
                enabled: tabMarketOptions.RUSHING.length > 0,
            },
            {
                key: "TD_SCORER",
                label: NFL_TAB_LABELS.TD_SCORER,
                enabled: tabMarketOptions.TD_SCORER.length > 0,
            },
        ];
        const showSearchControls =
            step.kind === "GAME_DETAIL" && gameDetailTab !== "GAME_LINES";
        const showStepBack =
            step.kind !== "GAME_SELECT" && step.kind !== "GAME_DETAIL";

        return (
            <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-white/10 bg-black/70 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleBackToGames}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Back to matchups
                            </button>
                            {showStepBack && (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                >
                                    Back
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            Updated {formatDateTime(nflSchedules?.updated)}
                        </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {activeGame.away_team} at {activeGame.home_team}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {formatDateTime(activeGame.date)}
                            </p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                            {activeGame.marketCount} markets - {activeGame.propCount} players
                        </div>
                    </div>

                    <div className="scrollbar-hide mt-4 flex gap-3 overflow-x-auto border-b border-white/10 pb-2">
                        {tabs.map((tab) => {
                            const isActive = gameDetailTab === tab.key;
                            const isDisabled = !tab.enabled;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
                                        ? "border-emerald-300 text-emerald-100"
                                        : "border-transparent text-gray-400 hover:text-white"
                                        } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                                    disabled={locked || isDisabled}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {showSearchControls && (
                        <div className="mt-4 grid gap-3">
                            <label className="flex flex-col gap-2 text-xs text-gray-400">
                                Search players or markets
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                                    placeholder="Mahomes, passing, touchdown"
                                />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">{children}</div>
            </div>
        );
    };

    const buildPlayerMarketRows = (
        odds: OddsBlazeOdd[],
        game: GameOption
    ): PlayerOddsRow[] => {
        const rows = new Map<
            string,
            {
                player: OddsBlazePlayer;
                team: OddsBlazeTeam;
                opponent: string;
                lines: Map<string, PlayerOddsLine>;
            }
        >();

        odds.forEach((odd) => {
            if (!odd.player) return;
            const opponent =
                odd.player.team.id === game.home_team_id ? game.away_team : game.home_team;
            const row = rows.get(odd.player.id) ?? {
                player: odd.player,
                team: odd.player.team,
                opponent,
                lines: new Map<string, PlayerOddsLine>(),
            };
            const lineValue = odd.selection?.line ?? null;
            const lineKey = lineValue !== null ? `${lineValue}` : odd.id;
            const lineEntry = row.lines.get(lineKey) ?? {
                line: lineValue,
                main: false,
            };
            lineEntry.main = lineEntry.main || odd.main;

            const side = odd.selection?.side?.toLowerCase();
            if (side === "over") lineEntry.over = odd;
            else if (side === "under") lineEntry.under = odd;
            else lineEntry.any = odd;

            row.lines.set(lineKey, lineEntry);
            rows.set(odd.player.id, row);
        });

        const lineRank = (line: number | null) =>
            line === null ? Number.POSITIVE_INFINITY : line;

        return Array.from(rows.values())
            .map((row) => ({
                player: row.player,
                team: row.team,
                opponent: row.opponent,
                lines: Array.from(row.lines.values()).sort(
                    (a, b) => lineRank(a.line) - lineRank(b.line)
                ),
            }))
            .sort((a, b) => a.player.name.localeCompare(b.player.name));
    };

    const renderPlayerOddsBoard = (rows: PlayerOddsRow[], _label: string) => {
        if (rows.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No {_label.toLowerCase()} available for this matchup yet.
                </div>
            );
        }

        const hasOver = rows.some((row) => row.lines.some((line) => line.over));
        const hasUnder = rows.some((row) => row.lines.some((line) => line.under));
        const hasAny = rows.some((row) => row.lines.some((line) => line.any));
        const columns: { key: "over" | "under" | "any"; label: string }[] = [];
        if (hasOver) columns.push({ key: "over", label: "Over" });
        if (hasUnder) columns.push({ key: "under", label: "Under" });
        if (!hasOver && !hasUnder && hasAny) {
            columns.push({ key: "any", label: "Pick" });
        }
        const isTwoWayOverUnder = hasOver && hasUnder && columns.length === 2;

        return (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/70 shadow-lg shadow-emerald-500/5 [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                <div
                    className={
                        isTwoWayOverUnder
                            ? "grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                            : "grid gap-2 border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-gray-400"
                    }
                    style={{
                        gridTemplateColumns: isTwoWayOverUnder
                            ? "minmax(0,1fr) repeat(2, var(--table-chip-width))"
                            : columns.length
                                ? `minmax(200px,1fr) repeat(${columns.length}, var(--table-chip-width))`
                                : "minmax(200px,1fr)",
                    }}
                >
                    <div
                        className={
                            isTwoWayOverUnder
                                ? "px-3 py-2"
                                : "sticky left-0 z-20 bg-black/80 px-3 py-2"
                        }
                    >
                        Player
                    </div>
                    {columns.map((column) => (
                        <div
                            key={`player-odds-${column.key}`}
                            className="px-3 py-2 text-center"
                        >
                            {isTwoWayOverUnder
                                ? column.key === "over"
                                    ? "Over line"
                                    : "Under line"
                                : column.label}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map((row, rowIndex) => {
                        const primaryLine = row.lines.find((line) => line.main) ?? row.lines[0];
                        if (!primaryLine) return null;
                        const rowBand =
                            rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";

                        return (
                            <div
                                key={row.player.id}
                                className={
                                    isTwoWayOverUnder
                                        ? `grid items-center gap-2 border-b border-white/5 text-left ${rowBand}`
                                        : `grid gap-2 border-b border-white/5 ${rowBand}`
                                }
                                style={{
                                    gridTemplateColumns: isTwoWayOverUnder
                                        ? "minmax(0,1fr) repeat(2, var(--table-chip-width))"
                                        : columns.length
                                            ? `minmax(200px,1fr) repeat(${columns.length}, var(--table-chip-width))`
                                            : "minmax(200px,1fr)",
                                }}
                            >
                                <div
                                    className={
                                        isTwoWayOverUnder
                                            ? "min-w-0 px-3 py-2.5"
                                            : "sticky left-0 z-10 bg-black/80 px-3 py-3"
                                    }
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {row.player.name}
                                        </p>
                                        <p className="text-xs uppercase tracking-wide text-gray-400">
                                            {playerMetaLabel(
                                                row.player,
                                                row.team.abbreviation ?? row.team.name
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {columns.map((column) => {
                                    const odd =
                                        column.key === "over"
                                            ? primaryLine.over
                                            : column.key === "under"
                                                ? primaryLine.under
                                                : primaryLine.any;
                                    const isSelected = isOddSelected(odd);
                                    const lineValue = odd?.selection?.line ?? primaryLine.line;
                                    const lineText =
                                        lineValue !== null && lineValue !== undefined
                                            ? formatNumberLine(lineValue)
                                            : "-";
                                    const oddsLabel = odd ? formatOdds(odd.price) : "-";
                                    const lineLabel =
                                        column.key === "any"
                                            ? lineText !== "-"
                                                ? lineText
                                                : "Pick"
                                            : `${column.key === "over" ? "O" : "U"} ${lineText}`;
                                    return (
                                        <div
                                            key={`${row.player.id}-${column.key}`}
                                            className="flex justify-center px-1 py-2"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => odd && handleOddsSelection(odd)}
                                                disabled={!odd || locked}
                                                className={`flex ${!odd ? "cursor-not-allowed" : ""}`}
                                            >
                                                {renderLineOddsBox(
                                                    lineLabel,
                                                    oddsLabel,
                                                    isSelected,
                                                    !odd
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
        // const showSecondary = secondary !== undefined;
        return (
            <button
                type="button"
                onClick={() => odd && handleOddsSelection(odd)}
                disabled={!odd || locked}
                className={`flex min-h-[72px] flex-col items-center justify-center px-2 py-2 text-center transition sm:px-3 sm:py-3 
                    ${isSelected ? "text-emerald-50" : "text-gray-200"} 
                    ${!odd ? "cursor-not-allowed text-gray-600" : ""}`}
            >
                {hasLine
                    ? renderLineOddsBox(primary, hasOdd ? oddsLabel : "-", isSelected, !hasOdd)
                    : renderTableOddsBox(hasOdd ? oddsLabel : "-", isSelected, !hasOdd)}
            </button>
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
                onClick={() => odd && handleOddsSelection(odd)}
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
        const homeEntry =
            activeLine !== null ? altSpreadLineData.map.get(activeLine) : undefined;
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
                        activeGame.away_team,
                        formatLineValue(awayLine ?? awayOdd?.selection?.line)
                    )}
                    {renderAltLineCard(
                        homeOdd,
                        activeGame.home_team,
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
        const entry =
            activeLine !== null ? altTotalLineData.map.get(activeLine) : undefined;
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

    const renderGameLinesOdds = () => {
        if (!activeGame) return null;
        const sectionKey = "game-lines-main";
        const collapsed = isSectionCollapsed(sectionKey, true);
        const totalLine = mainLineOdds?.totalLine;
        return (
            <>
                <section className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
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

                    {!collapsed && (
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
                                        {activeGame.away_abbr}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="hidden truncate text-sm font-semibold text-white sm:block">
                                            {activeGame.away_team}
                                        </p>
                                        <p className="whitespace-nowrap text-xs font-normal text-gray-400">
                                            {activeGame.away_abbr}
                                        </p>
                                    </div>
                                </div>
                                {renderMainLineCell(
                                    mainLineOdds?.spreadAway,
                                    formatLineValue(mainLineOdds?.spreadAway?.selection?.line),
                                    mainLineOdds?.spreadAway
                                        ? formatOdds(mainLineOdds.spreadAway.price)
                                        : undefined
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
                                        : undefined
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
                                        {activeGame.home_abbr}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="hidden truncate text-sm font-semibold text-white sm:block">
                                            {activeGame.home_team}
                                        </p>
                                        <p className="whitespace-nowrap text-xs font-normal text-gray-400">
                                            {activeGame.home_abbr}
                                        </p>
                                    </div>
                                </div>
                                {renderMainLineCell(
                                    mainLineOdds?.spreadHome,
                                    formatLineValue(mainLineOdds?.spreadHome?.selection?.line),
                                    mainLineOdds?.spreadHome
                                        ? formatOdds(mainLineOdds.spreadHome.price)
                                        : undefined
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
                                        : undefined
                                )}
                            </div>
                        </div>
                    )}
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
                                    : renderAlternateTotalSection())}
                        </section>
                    );
                })}
            </>
        );
    };

    const renderGameLinesFlow = () => (
        <div className="flex flex-col gap-3">
            {!hasGameLinesData ? (
                <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
                    No matching lines. Try a different tab or search term.
                </div>
            ) : (
                renderGameLinesOdds()
            )}
            {validation.status !== "idle" && renderValidationNotice()}
        </div>
    );

    const renderPassingPropsTab = () => {
        if (!activeGame) return null;
        const options = tabMarketOptions.PASSING;
        if (options.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No passing props available for this matchup yet.
                </div>
            );
        }

        const altSections = [
            {
                key: "passing-alt-yards",
                title: "Alt Passing Yards",
                markets: ["Player Passing Yards"],
            },
            {
                key: "passing-alt-tds",
                title: "Alt Passing TDs",
                markets: ["Player Passing Touchdowns"],
            },
            {
                key: "passing-alt-pass-rush-tds",
                title: "Alt Passing + Rushing TDs",
                markets: ["Player Passing + Rushing Touchdowns", "Player Passing + Rushing TDs"],
            },
            {
                key: "passing-alt-pass-rush-yards",
                title: "Alt Passing + Rushing Yards",
                markets: ["Player Passing + Rushing Yards"],
            },
        ];

        return (
            <div className="flex flex-col gap-3">
                {options.map((market, index) =>
                    renderPropMarketSection(
                        `passing-market-${market}`,
                        marketDisplayName(market),
                        activeGame.odds.filter((odd) => odd.market === market && odd.player),
                        activeGame,
                        index === 0
                    )
                )}
                {altSections.map((section, index) =>
                    renderAltPropMarketSection(
                        section.key,
                        section.title,
                        section.markets,
                        activeGame,
                        index === 0
                    )
                )}
                {validation.status !== "idle" && renderValidationNotice()}
            </div>
        );
    };

    const renderReceivingPropsTab = () => {
        if (!activeGame) return null;
        const options = tabMarketOptions.RECEIVING;
        if (options.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No receiving props available for this matchup yet.
                </div>
            );
        }

        const altSections = [
            {
                key: "receiving-alt-yards",
                title: "Alt Receiving Yards",
                markets: ["Player Receiving Yards"],
            },
            {
                key: "receiving-alt-receptions",
                title: "Alt Receptions",
                markets: ["Player Receptions"],
            },
        ];

        return (
            <div className="flex flex-col gap-3">
                {options.map((market, index) =>
                    renderPropMarketSection(
                        `receiving-market-${market}`,
                        marketDisplayName(market),
                        activeGame.odds.filter((odd) => odd.market === market && odd.player),
                        activeGame,
                        index === 0
                    )
                )}
                {altSections.map((section, index) =>
                    renderAltPropMarketSection(
                        section.key,
                        section.title,
                        section.markets,
                        activeGame,
                        index === 0
                    )
                )}
                {validation.status !== "idle" && renderValidationNotice()}
            </div>
        );
    };

    const renderRushingPropsTab = () => {
        if (!activeGame) return null;
        const options = tabMarketOptions.RUSHING;
        if (options.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No rushing props available for this matchup yet.
                </div>
            );
        }

        const altSections = [
            {
                key: "rushing-alt-yards",
                title: "Alt Rushing Yards",
                markets: ["Player Rushing Yards"],
            },
            {
                key: "rushing-alt-rush-rec",
                title: "Alt Rushing + Receiving Yards",
                markets: ["Player Rushing + Receiving Yards"],
            },
        ];

        return (
            <div className="flex flex-col gap-3">
                {options.map((market, index) =>
                    renderPropMarketSection(
                        `rushing-market-${market}`,
                        marketDisplayName(market),
                        activeGame.odds.filter((odd) => odd.market === market && odd.player),
                        activeGame,
                        index === 0
                    )
                )}
                {altSections.map((section, index) =>
                    renderAltPropMarketSection(
                        section.key,
                        section.title,
                        section.markets,
                        activeGame,
                        index === 0
                    )
                )}
                {validation.status !== "idle" && renderValidationNotice()}
            </div>
        );
    };

    const renderTdScorerTab = () => {
        if (!activeGame) return null;
        const options = tabMarketOptions.TD_SCORER;
        if (options.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No touchdown props available for this matchup yet.
                </div>
            );
        }
        const tdOdds = filterOdds(
            activeGame.odds.filter((odd) => odd.player && options.includes(odd.market)),
            activeGame
        );
        const table = buildTdScorerTable(tdOdds, activeGame);
        const sectionKey = "td-scorer-table";
        const collapsed = isSectionCollapsed(sectionKey, true);
        const tdGridTemplate = table.columns.length
            ? `minmax(88px,1fr) repeat(${table.columns.length}, var(--table-chip-width))`
            : "minmax(88px,1fr)";

        return (
            <div className="flex flex-col gap-3">
                <section className="rounded-3xl border border-white/10 bg-black/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                    <button
                        type="button"
                        onClick={() => toggleSection(sectionKey, true)}
                        aria-expanded={!collapsed}
                        className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"
                    >
                        <span className="text-base font-semibold text-white">Touchdown Scorers</span>
                        <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                            <span
                                className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                    }`}
                            >
                                v
                            </span>
                        </span>
                    </button>
                    {!collapsed && (table.rows.length === 0 || table.columns.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                            No touchdown props available for this matchup yet.
                        </div>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <div className="min-w-full text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                <div
                                    className="grid gap-1 border-b border-white/10 text-[10px] uppercase tracking-wide text-gray-400 sm:gap-2 sm:text-xs"
                                    style={{
                                        gridTemplateColumns: tdGridTemplate,
                                    }}
                                >
                                    <div className="sticky left-0 z-20 min-w-0 bg-black/80 px-2 py-2 sm:min-w-[220px] sm:px-3">
                                        Player
                                    </div>
                                    {table.columns.map((column) => (
                                        <div key={column.key} className="px-2 py-2 text-center sm:px-3">
                                            {column.label}
                                        </div>
                                    ))}
                                </div>
                                {table.rows.map((row, rowIndex) => {
                                    const rowBand =
                                        rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                                    return (
                                        <div
                                            key={`td-${row.player.id}`}
                                            className={`grid gap-1 border-b border-white/5 sm:gap-2 ${rowBand}`}
                                            style={{
                                                gridTemplateColumns: tdGridTemplate,
                                            }}
                                        >
                                            <div className="sticky left-0 z-10 min-w-0 bg-black/80 px-2 py-3 sm:min-w-[220px] sm:px-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">
                                                        {row.player.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        {playerMetaLabel(row.player, row.teamLabel)}
                                                    </p>
                                                </div>
                                            </div>
                                            {table.columns.map((column) => {
                                                const odd = row.odds.get(column.key);
                                                const isSelected = isOddSelected(odd);
                                                const oddsLabel = odd ? formatOdds(odd.price) : "-";
                                                return (
                                                    <div
                                                        key={`${row.player.id}-${column.key}`}
                                                        className="flex justify-center px-0.5 py-2 sm:px-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => odd && handleOddsSelection(odd)}
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
                    ))}
                </section>
                {validation.status !== "idle" && renderValidationNotice()}
            </div>
        );
    };

    const renderGameDetailContent = () => {
        if (!activeGame) return null;
        if (
            step.kind === "GAME_MONEYLINE_TEAM" ||
            step.kind === "GAME_SPREAD_TEAM" ||
            step.kind === "GAME_SPREAD_MARGIN" ||
            step.kind === "GAME_TOTAL_SIDE" ||
            step.kind === "GAME_TOTAL_THRESHOLD"
        ) {
            return renderGameLinesFlow();
        }

        if (step.kind === "PLAYER_SELECT_THRESHOLD") {
            return (
                <div className="flex flex-col gap-4">
                    {renderThresholdSelector()}
                    {renderValidationNotice()}
                </div>
            );
        }

        switch (gameDetailTab) {
            case "GAME_LINES":
                return renderGameLinesFlow();
            case "PASSING":
                return renderPassingPropsTab();
            case "RECEIVING":
                return renderReceivingPropsTab();
            case "RUSHING":
                return renderRushingPropsTab();
            case "TD_SCORER":
                return renderTdScorerTab();
            default:
                return renderGameLinesFlow();
        }
    };

    const renderThresholdSelector = () => {
        if (!selection.market || !activePlayer) return null;
        const thresholds = statThresholdsForMarket(selection.market);
        const isTD = selection.market.includes("TDS");
        const isRushRec = selection.market === "RUSHING_RECEIVING_YARDS";
        const isSkillPlayer = ["RB", "WR", "TE"].includes(activePlayer.position ?? "");
        const allowedSides: PickSide[] =
            isRushRec || (isTD && isSkillPlayer)
                ? (["OVER"] as PickSide[])
                : (["OVER", "UNDER"] as PickSide[]);
        const showSidePicker = !isRushRec;
        const effectiveSide = selection.side ?? allowedSides[0];
        const shouldShowThresholds = showSidePicker ? !!selection.side : true;
        return (
            <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">
                        How many {getMarketLabel(selection.market).toLowerCase()} do you think{" "}
                        {activePlayer.name} will get?
                    </p>
                    <p className="text-xs text-gray-400">
                        {isTD
                            ? "We treat these as touchdown lines similar to what you'd see on a betting app."
                            : "We treat these as stat lines similar to what you'd see on a betting app."}
                    </p>
                </div>
                {showSidePicker && (
                    <div className="flex gap-2">
                        {allowedSides.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() =>
                                    setSelection((prev) => ({
                                        ...prev,
                                        side: option,
                                        threshold: undefined,
                                    }))
                                }
                                className={`flex-1 rounded-2xl border px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide transition ${selection.side === option
                                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                                    : "border-white/10 bg-white/5 text-gray-200 hover:border-emerald-400/60"
                                    }`}
                                disabled={locked}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
                {shouldShowThresholds && effectiveSide && (
                    <div className="flex flex-wrap gap-2">
                        {thresholds.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setThresholdAndValidate(value, effectiveSide)}
                                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selection.threshold === value
                                    ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                                    : "border-white/15 text-gray-200 hover:border-emerald-400/60"
                                    }`}
                                disabled={locked}
                            >
                                {isTD ? `${value}+ TD${value > 1 ? "s" : ""}` : `${value}+`}
                            </button>
                        ))}
                        <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2">
                            <input
                                type="number"
                                min={0}
                                value={customThreshold}
                                onChange={(event) => setCustomThreshold(event.target.value)}
                                placeholder="Custom"
                                className="w-20 bg-transparent text-xs text-white outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const parsed = Number(customThreshold);
                                    if (!Number.isNaN(parsed)) {
                                        setThresholdAndValidate(parsed, effectiveSide);
                                    }
                                }}
                                className="text-xs uppercase tracking-wide text-emerald-200"
                            >
                                set
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderValidationNotice = () => {
        if (validation.status === "idle") return null;

        if (validation.error) {
            return (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {validation.error}
                </div>
            );
        }

        if (validationStatus === "VALID") {
            return (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    This looks like a real market. Odds loaded below.
                </div>
            );
        }

        if (validationStatus === "TOO_SAFE") {
            return (
                <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <p>
                        Sportsbooks don’t even offer this line. It’s likely too safe. Try a higher
                        number.
                    </p>
                    {validationSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {validationSuggestions.map((suggested) => (
                                <button
                                    key={suggested}
                                    type="button"
                                    onClick={() => setThresholdAndValidate(suggested, selection.side)}
                                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
                                >
                                    {selection.market === "TOTAL_POINTS"
                                        ? `${suggested}`
                                        : `${suggested}+`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (validationStatus === "TOO_CRAZY") {
            return (
                <div className="flex flex-col gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <p>
                        No major book offers a line this high. It’s probably too extreme. Try a more
                        realistic number.
                    </p>
                    {validationSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {validationSuggestions.map((suggested) => (
                                <button
                                    key={suggested}
                                    type="button"
                                    onClick={() => setThresholdAndValidate(suggested, selection.side)}
                                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
                                >
                                    {selection.market === "TOTAL_POINTS"
                                        ? `${suggested}`
                                        : `${suggested}+`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (validationStatus === "NO_MARKET" || validationStatus === "API_ERROR") {
            return (
                <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-200">
                    No matching market available right now. Pick a different line or try again
                    later.
                </div>
            );
        }

        return null;
    };

    const renderConfirmation = () => {
        const showMultipick = hasMultipick;
        const showMultiList = hasMultipick;
        const postActionLabel = showMultipick ? "post combo" : "post pick";
        const tierLine = `${sheetTierPrimary}${sheetPoints ? ` · ${sheetPoints} pts` : ""
            }${sheetTierName && sheetTierName !== "—" ? ` · ${sheetTierName}` : ""}`;
        const listItems: ReviewListItem[] = showMultipick
            ? parlayLegs.map((leg) => {
                const legContext = findLegContext(leg);
                const legScope = legContext
                    ? legContext.odd.player
                        ? "PLAYER_PROP"
                        : "GAME_LINE"
                    : undefined;
                const legMarket = legContext ? marketForOdd(legContext.odd) : undefined;
                const sourceTabLabel = legScope
                    ? resolveNflSourceTab({ scope: legScope, market: legMarket }) ?? "Pick"
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

        return (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="w-full space-y-1">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            {showMultiList ? "Your picks" : "Your pick"}
                        </p>
                        <ul className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar">
                            {listItems.map((item) => {
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
                        <p className="text-xs uppercase tracking-wide text-gray-400">Confidence</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {CONFIDENCE_LEVELS.map((level) => {
                                const active = selectedConfidence === level;
                                return (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setSelectedConfidence(level)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${active
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
                            onClick={() => handleSubmitPick("post")}
                            disabled={locked || !selectedConfidence}
                            className="rounded-2xl bg-emerald-500/25 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {postActionLabel}
                        </button>
                    )}
                    {confirmationVariant === "slip" && (
                        <button
                            type="button"
                            onClick={() => handleSubmitPick("slip")}
                            disabled={locked}
                            className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            post to slip
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsReviewOpen(false)}
                        className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
                    >
                        edit pick
                    </button>
                </div>

                {locked && (
                    <p className="text-xs text-rose-200">Picks are locked.</p>
                )}
            </div>
        )
    };

    const renderStep = () => {
        if (step.kind === "GAME_SELECT") return renderGameEntryStep();
        if (!activeGame) return renderGameEntryStep();
        return renderGameDetailShell(renderGameDetailContent());
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
        <>
            <div
                className={`flex flex-col ${step.kind === "GAME_SELECT" ? "gap-4" : "gap-5"} ${showReviewSheet
                    ? "pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))]"
                    : "pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-[calc(8rem+env(safe-area-inset-bottom))]"
                    } ${activeGame ? "matchup-detail" : ""}`}
            >
                {step.kind === "GAME_SELECT" ? (
                    <div className="flex flex-col gap-4">{renderStep()}</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {renderStep()}
                        {validation.status === "loading" && (
                            <p className="mt-3 text-xs text-gray-400">
                                Checking books for this market…
                            </p>
                        )}
                    </div>
                )}
            </div>

            {showReviewSheet && isReviewOpen && (
                <div
                    className="fixed inset-x-0 top-0 bottom-[calc(0.75rem+4.5rem)] z-30 bg-black/70 sm:bottom-[calc(0.75rem+4.875rem)] md:bottom-[calc(0.75rem+4.875rem*1.45)]"
                    role="presentation"
                    onClick={() => setIsReviewOpen(false)}
                />
            )}

            {showReviewSheet && (
                <div
                    className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-5 sm:px-6"
                >
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
                                                <p className="mt-1 text-sm font-semibold text-white">{sheetSummary}</p>
                                            </>
                                        ))
                                    }
                                </div>
                                <span className="text-gray-400">{isReviewOpen ? "v" : "^"}</span>
                            </button>

                            {isReviewOpen && (
                                <div className="border-t border-white/10 px-4 pb-5 pt-4">
                                    {renderConfirmation()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <TipsModal open={showTipsModal} onClose={() => setShowTipsModal(false)} />
            <ScoringModal open={showModal} onClose={() => setShowModal(false)} />
            <TierInfoModal open={showTierModal} onClose={() => setShowTierModal(false)} />
        </>
    );
};

const TipsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-lg overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">Tips for building a pick</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close tips"
                    >
                        x
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
                            <span className="mt-1 text-rose-200">•</span>
                            <p>
                                Our pick maker keeps odds visible as you build, so you can balance your
                                read with how the books price it before you lock anything in.
                            </p>
                        </div>

                        <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
                            <span className="mt-1 text-rose-200">•</span>
                            <p>
                                Use <span className="font-semibold text-white">Game Lines</span> when you have
                                a take on the matchup (who wins, scoring environment, big spreads) and{" "}
                                <span className="font-semibold text-white">Player Props</span> when you have a
                                read on individual stat lines (yards, receptions, TDs).
                            </p>
                        </div>

                        <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
                            <span className="mt-1 text-rose-200">•</span>
                            <p>
                                The tier system maps real odds into points from Tier 1 (LOCK) to Tier 14
                                (LEGENDARY). Profiles use the full table; group leaderboards cap at Tier{" "}
                                {GROUP_CAP_TIER} ({GROUP_CAP_POINTS} pts max).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TierInfoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    const tiers = ODDS_BRACKETS;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-lg overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">How tiers map to odds & points</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close tier info"
                    >
                        x
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-300">
                            <p>Profiles/global points use the full Tier 1-14 table.</p>
                            <p>
                                Group leaderboards cap at Tier {GROUP_CAP_TIER} ({GROUP_CAP_POINTS} pts
                                max).
                            </p>
                        </div>

                        <div className="space-y-3">
                            {tiers.map((row) => (
                                <div
                                    key={row.tier}
                                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${row.color}`} />
                                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                                {formatTierPrimary(row.tier)}
                                            </p>
                                        </div>
                                        <p className="text-xs font-semibold text-white">{row.name}</p>
                                        <p className="text-xs text-gray-300">Odds: {row.label}</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                        {row.points} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NflPickBuilder;
