"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PickReviewSheet,
    type ReviewSheetPostSelection,
    type SameGameComboReviewGroup,
} from "@/components/pick-builder/PickReviewSheet";
import type {
    CachedReviewData,
    ReviewSheetState,
} from "@/components/pick-builder/reviewSheetState";
import { ODDS_BRACKETS } from "@/lib/constants";
import { canUserEditSlipPicks } from "@/lib/slips/state";
import { formatDateTime, isPast } from "@/lib/utils/date";
import {
    DEFAULT_ELIGIBLE_WINDOW_DAYS,
    filterEligibleGames,
    filterUpcomingWindowGames,
} from "@/lib/utils/games";
import {
    normalizeOddToLeg,
    validateAddLeg,
} from "@/lib/sgp/validateParlay";
import {
    formatTierPrimary,
    getGroupTierForAmericanOdds,
    getTierForAmericanOdds,
    getTierMetaForPick,
    parseAmericanOdds,
} from "@/lib/utils/scoring";
import {
    formatReviewSheetTierLine,
    resolveReviewSheetTierCardAppearance,
} from "@/lib/utils/reviewSheetTierDisplay";
import { formatPickMetaLine } from "@/lib/utils/pickDescription";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";
import { BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, League, MLBSchedules, OddsEvent, OddsObject, ParlayLeg, Pick, PickLeg, PickSelectionMeta, RootState, Slip, TierIndex, User } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { useDispatch, useSelector } from "react-redux";
import { clearMlbPickValidateMessage, fetchMLBOddsRequest, fetchMLBScheduleRequest, mlbPickValidateRequest } from "@/lib/redux/slices/mlbSlice";
import { quoteSlipOdds } from "@/lib/sgp/comboPricing";
import FootballAnimation from "../animations/FootballAnimation";
import { getMobileTeamName, useIsMobile } from "@/lib/utils/helpers";

type OddsBlazeTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

type OddsBlazePlayer = {
    id: string;
    name: string;
    position?: string;
    number?: number | null | string;
    team: OddsBlazeTeam;
};

type OddsBlazeSelection = {
    name?: string;
    side?: string;
    line?: number;
};

type OddsBlazeOdd = {
    id: string;
    market: string;
    name: string;
    price: string;
    main: boolean;
    sgp?: string;
    links?: {
        desktop?: string;
        mobile?: string;
    };
    selection?: OddsBlazeSelection;
    player?: OddsBlazePlayer;
    updated?: string;
};

type OddsBlazeEvent = {
    id: string;
    teams: {
        away: OddsBlazeTeam;
        home: OddsBlazeTeam;
    };
    date: string;
    live: boolean;
    odds: OddsBlazeOdd[];
};

type OddsBlazeSnapshot = {
    updated: string;
    league: {
        id: string;
        name: string;
        sport: string;
    };
    sportsbook: {
        id: string;
        name: string;
    };
    events: OddsBlazeEvent[];
};


type GameOption = {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    live: boolean;
    odds: OddsObject[];
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
    availableLines: number[];
    lineCount: number;
    highestLine: number | null;
};

type DualPointsTableRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    overLines: Map<number, OddsBlazeOdd>;
    underLines: Map<number, OddsBlazeOdd>;
    overAvailableLines: number[];
    underAvailableLines: number[];
    overLineCount: number;
    underLineCount: number;
    highestLine: number | null;
    lineCount: number;
};

type SimplePropRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    line?: number;
    odd: OddsBlazeOdd;
};

type PairedPropRow = {
    player: OddsBlazePlayer;
    teamLabel: string;
    over?: OddsBlazeOdd;
    under?: OddsBlazeOdd;
    overLine?: number;
    underLine?: number;
    highestLine: number | null;
};

type SpreadLineEntry = {
    home?: OddsBlazeOdd;
    away?: OddsBlazeOdd;
};

type TotalLineEntry = {
    over?: OddsBlazeOdd;
    under?: OddsBlazeOdd;
};

type MainLineOdds = {
    spreadAway?: OddsBlazeOdd;
    spreadHome?: OddsBlazeOdd;
    moneyAway?: OddsBlazeOdd;
    moneyHome?: OddsBlazeOdd;
    totalOver?: OddsBlazeOdd;
    totalUnder?: OddsBlazeOdd;
    totalLine?: number;
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
    showCurrentPick?: boolean;
    enforceEligibilityWindow?: boolean;
    builderMode?: "post";
    activeDateKey?: string;
    onDateChange?: (key: string, source?: "user" | "auto") => void;
    allowAutoDateAdvance?: boolean;
    hideDateControls?: boolean;
    onDateOptionsChange?: (options: Array<{ key: string; label: string }>) => void;
    reviewSheetState?: ReviewSheetState;
};

const eventKey = (event: OddsBlazeEvent) =>
    event.id || `${event.date}|${event.teams.away.id}|${event.teams.home.id}`;

const normalizeMergeToken = (value?: string | number | null) => {
    if (value === undefined || value === null) return "";
    return `${value}`.trim().toLowerCase().replace(/\s+/g, " ");
};

const oddKey = (odd: OddsBlazeOdd) =>
    [
        odd.market,
        odd.player?.id ?? "",
        odd.player?.team?.id ?? "",
        normalizeMergeToken(odd.selection?.name ?? odd.name),
        normalizeMergeToken(odd.selection?.side),
        odd.selection?.line ?? "",
    ].join("|");

const dedupeOdds = (odds: OddsBlazeOdd[]) => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();

    return odds.filter((odd) => {
        if (seenIds.has(odd.id)) return false;

        const key = oddKey(odd);
        if (seenKeys.has(key)) {
            seenIds.add(odd.id);
            return false;
        }

        seenIds.add(odd.id);
        seenKeys.add(key);
        return true;
    });
};

const latestUpdatedAt = (snapshots: OddsBlazeSnapshot[]) =>
    snapshots.reduce((latest, snapshot) => {
        const currentTime = Date.parse(snapshot.updated);
        const latestTime = Date.parse(latest);
        if (Number.isNaN(currentTime)) return latest;
        if (Number.isNaN(latestTime) || currentTime > latestTime) {
            return snapshot.updated;
        }
        return latest;
    }, "");

const mergeOddsSnapshots = (...snapshots: OddsBlazeSnapshot[]): OddsBlazeSnapshot => {
    const baseSnapshot = snapshots[0];

    if (!baseSnapshot) {
        return {
            updated: "",
            league: { id: "mlb", name: "MLB", sport: "Baseball" },
            sportsbook: { id: "multi", name: "Multiple" },
            events: [],
        };
    }

    const mergedEvents = new Map<string, OddsBlazeEvent>();

    snapshots.forEach((snapshot) => {
        snapshot.events.forEach((event) => {
            const key = eventKey(event);
            const existing = mergedEvents.get(key);
            if (!existing) {
                mergedEvents.set(key, { ...event, odds: dedupeOdds([...event.odds]) });
                return;
            }

            mergedEvents.set(key, {
                ...existing,
                live: existing.live || event.live,
                odds: dedupeOdds([...existing.odds, ...event.odds]),
            });
        });
    });

    return {
        updated: latestUpdatedAt(snapshots),
        league: baseSnapshot.league,
        sportsbook: { id: "multi", name: "Multiple" },
        events: [...mergedEvents.values()],
    };
};

const HITS_MARKETS = [
    "Player Hits",
    "Player Singles",
    "Player Doubles",
    "Player Triples",
];

const TOTAL_BASES_MARKETS = ["Player Total Bases"];

const RBI_MARKETS = ["Player RBIs"];

const RUNS_MARKETS = ["Player Runs"];

const POWER_SPEED_MARKETS = ["Player Home Runs", "Player Stolen Bases"];

const BATTER_DISCIPLINE_MARKETS = ["Player Batting Strikeouts"];

const BATTER_PROP_MARKETS = [
    ...HITS_MARKETS,
    ...TOTAL_BASES_MARKETS,
    ...RBI_MARKETS,
    ...RUNS_MARKETS,
    ...POWER_SPEED_MARKETS,
    ...BATTER_DISCIPLINE_MARKETS,
];

const PITCHER_PROP_MARKETS = [
    "Player Strikeouts",
    "Player Outs",
    "Player Hits Allowed",
    "Player Walks Allowed",
];

const COMBINED_PLAYER_PROP_MARKETS = ["Player Hits + Runs + RBIs"];

const TEAM_PROP_MARKETS = ["Team Total Runs", "Team Total Runs Odd/Even"];

const FIRST_INNING_MARKETS = [
    "1st Inning Moneyline 3-Way",
    "1st Inning Run Line",
    "1st Inning Total Runs",
    "1st Inning Total Runs Odd/Even",
];

const INNINGS_MARKETS = [
    "1st 5 Innings Moneyline",
    "1st 5 Innings Moneyline 3-Way",
    "1st 5 Innings Run Line",
    "1st 5 Innings Total Runs",
    "1st 7 Innings Moneyline",
    "1st 7 Innings Run Line",
    "1st 7 Innings Total Runs",
    "2nd Inning Run Line",
    "2nd Inning Total Runs",
    "3rd Inning Run Line",
    "3rd Inning Total Runs",
    "4th Inning Run Line",
    "4th Inning Total Runs",
    "5th Inning Run Line",
    "5th Inning Total Runs",
    "6th Inning Run Line",
    "6th Inning Total Runs",
    "7th Inning Run Line",
    "7th Inning Total Runs",
    "8th Inning Run Line",
    "8th Inning Total Runs",
    "9th Inning Run Line",
    "9th Inning Total Runs",
];

const MAIN_OVER_UNDER_MARKETS = new Set<string>([
    "Player Hits",
    "Player Total Bases",
    "Player RBIs",
    "Player Runs",
    "Player Hits + Runs + RBIs",
    "Player Strikeouts",
    "Player Batting Strikeouts",
    "Player Outs",
    "Player Hits Allowed",
    "Player Walks Allowed",
]);

const TAB_ORDER = [
    "GAME_LINES",
    "BATTER_PROPS",
    "PITCHER_PROPS",
    "COMBINED_PLAYER_PROPS",
    "TEAM_PROPS",
    "FIRST_INNING",
    "INNINGS",
] as const;

type TabId = (typeof TAB_ORDER)[number];

const VISIBLE_TABS = TAB_ORDER;

const TAB_LABELS: Record<TabId, string> = {
    GAME_LINES: "Game lines",
    BATTER_PROPS: "Batter props",
    PITCHER_PROPS: "Pitcher props",
    COMBINED_PLAYER_PROPS: "Combined player props",
    TEAM_PROPS: "Team props",
    FIRST_INNING: "1st Inning",
    INNINGS: "Innings",
};

const TAB_MARKETS: Record<TabId, string[]> = {
    GAME_LINES: ["Moneyline", "Run Line", "Total Runs"],
    BATTER_PROPS: BATTER_PROP_MARKETS,
    PITCHER_PROPS: PITCHER_PROP_MARKETS,
    COMBINED_PLAYER_PROPS: COMBINED_PLAYER_PROP_MARKETS,
    TEAM_PROPS: TEAM_PROP_MARKETS,
    FIRST_INNING: FIRST_INNING_MARKETS,
    INNINGS: INNINGS_MARKETS,
};

const TAB_SOURCE_PRIORITY: TabId[] = [
    "PITCHER_PROPS",
    "COMBINED_PLAYER_PROPS",
    "BATTER_PROPS",
    "TEAM_PROPS",
    "FIRST_INNING",
    "INNINGS",
    "GAME_LINES",
];

const GAME_LINE_MAIN_MARKETS = new Set<string>(["Moneyline", "Run Line", "Total Runs"]);
const GAME_LINE_EXTRA_MARKETS = TAB_MARKETS.GAME_LINES.filter(
    (market) => !GAME_LINE_MAIN_MARKETS.has(market)
);

const tabForOdd = (odd: OddsBlazeOdd): TabId => {
    if (!odd.market) return "GAME_LINES";
    for (const tab of TAB_SOURCE_PRIORITY) {
        if (TAB_MARKETS[tab].includes(odd.market)) return tab;
    }
    return "GAME_LINES";
};

const TABLE_MARKETS = new Set<string>([
    ...BATTER_PROP_MARKETS,
    ...COMBINED_PLAYER_PROP_MARKETS,
    ...PITCHER_PROP_MARKETS,
]);

const tierMetaFromIndex = (tier?: TierIndex) =>
    typeof tier === "number" ? ODDS_BRACKETS[tier - 1] : undefined;

const tierNameFromIndex = (tier?: TierIndex) =>
    tierMetaFromIndex(tier)?.name ?? "EVEN";

const tierLabelFromTier = (tier?: TierIndex) => tierNameFromIndex(tier);

const CATEGORY_ROW_PREVIEW_LIMIT = 5;

const normalizeAbbr = (team: OddsBlazeTeam) =>
    team.abbreviation ?? team.name.split(" ").map((part) => part[0]).join("").slice(0, 3);

const buildGameOptions = (
    snapshot: MLBSchedules[],
    odds: OddsObject[],
    activeGameId?: string | null
): GameOption[] =>
    snapshot.map((event) => {
        const isCurrentlyActive = activeGameId && event.id === activeGameId;
        const currentOdds = isCurrentlyActive ? odds : event.odds;

        const marketSet = new Set<string>();
        const playerSet = new Set<string>();
        currentOdds.forEach((odd) => {
            marketSet.add(odd.market);
            if (odd.player?.id) playerSet.add(odd.player.id);
        });

        return {
            id: event.id,
            startTime: event.date,
            homeTeam: event.teams.home.name,
            awayTeam: event.teams.away.name,
            homeTeamId: event.teams.home.id,
            awayTeamId: event.teams.away.id,
            date: event.date,
            live: event.live,
            odds: currentOdds,
            homeAbbr: normalizeAbbr(event.teams.home),
            awayAbbr: normalizeAbbr(event.teams.away),
            marketCount: marketSet.size,
            propCount: playerSet.size,
            hasOdds: currentOdds.length > 0,
        };
    });

const buildScheduleOptions = (
    snapshot: MLBSchedules[],
    existingKeys: Set<string>,
    existingIds: Set<string>
): GameOption[] => {
    const options: GameOption[] = [];
    snapshot.forEach((event) => {
        if (existingIds.has(event.id)) return;
        const key = `${event.date}|${event.teams.away.id}|${event.teams.home.id}`;
        if (existingKeys.has(key)) return;

        const marketSet = new Set<string>();
        const playerSet = new Set<string>();
        event.odds.forEach((odd) => {
            marketSet.add(odd.market);
            if (odd.player?.id) playerSet.add(odd.player.id);
        });

        options.push({
            id: event.id,
            homeTeam: event.teams.home.name,
            awayTeam: event.teams.away.name,
            homeTeamId: event.teams.home.id,
            awayTeamId: event.teams.away.id,
            date: event.date,
            live: event.live,
            odds: event.odds,
            homeAbbr: normalizeAbbr(event.teams.home),
            awayAbbr: normalizeAbbr(event.teams.away),
            marketCount: marketSet.size,
            propCount: playerSet.size,
            hasOdds: event.odds.length > 0,
        });
    });
    return options;
};

const buildMergedGameOptions = (
    oddsSnapshot: OddsObject[],
    scheduleSnapshot: MLBSchedules[],
    activeGameId?: string | null
): GameOption[] => {
    const oddsOptions = buildGameOptions(scheduleSnapshot, oddsSnapshot, activeGameId);
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

const matchupLabel = (game: GameOption) => {
    if (!game?.awayAbbr && !game?.homeAbbr) return undefined;
    return `${game?.awayAbbr} @ ${game?.homeAbbr}`
};

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "-";
    }
    return value > 0 ? `+${value}` : `${value}`;
};

const DASH_SEPARATOR = " \u2014 ";

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
    if (odd.market.includes("Home Team")) return game.homeTeamId;
    if (odd.market.includes("Away Team")) return game.awayTeamId;
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
    const marketLabel = odd.market
        .replace(/^Player\s+/, "")
        .replace(/^Team\s+/, "");
    const side = odd.selection?.side;
    const line = odd.selection?.line;
    const matchup = matchupLabel(game);

    if (odd.player) {
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
        return `${team} ${odd.market}`.trim();
    }
    if (odd.market.includes("Run Line")) {
        const team = odd.selection?.name ?? odd.name;
        const spread =
            line !== undefined ? `${line > 0 ? "+" : ""}${line}` : odd.name.replace(team, "");
        return `${team} ${spread} ${odd.market}`.trim();
    }
    if (odd.market.includes("Team Total Runs")) {
        const teamLabel = odd.selection?.name ?? odd.name;
        const subject = teamLabel || matchup;
        const separator = subject === matchup ? DASH_SEPARATOR : " - ";
        if (side && line !== undefined) {
            return `${subject}${separator}${side} ${line} ${odd.market}`;
        }
        if (side) {
            return `${subject}${separator}${side} ${odd.market}`;
        }
        return `${subject}${separator}${odd.name}`;
    }
    if (odd.market.includes("Total Runs")) {
        const subject = matchup;
        const separator = subject === matchup ? DASH_SEPARATOR : " - ";
        if (side && line !== undefined) {
            return `${subject}${separator}${side} ${line} ${odd.market}`;
        }
        if (side) {
            return `${subject}${separator}${side} ${odd.market}`;
        }
        return `${subject}${separator}${odd.name} ${odd.market}`;
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
    home_abbr: game.homeAbbr,
    away_team: game.awayTeam,
    away_abbr: game.awayAbbr,
    external_pick_key: odd.id,
    matchup: game.awayTeam && game.homeTeam ? `${game.awayTeam} @ ${game.homeTeam}` : matchupLabel(game),
    match_date: game.date,
    sport: "MLB"
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

const findMainTotalOddByMarket = (
    game: GameOption,
    market: string,
    side: "Over" | "Under"
) =>
    game.odds.find(
        (odd) =>
            odd.market === market &&
            odd.main &&
            odd.selection?.side?.toLowerCase() === side.toLowerCase()
    );

const findMainTotalOdd = (game: GameOption, side: "Over" | "Under") =>
    findMainTotalOddByMarket(game, "Total Runs", side);

const formatLineLabel = (line: number) => `${line}`;

const formatLineValue = (line?: number) => {
    if (line === undefined) return "-";
    return line > 0 ? `+${line}` : `${line}`;
};

const formatNumberLine = (line?: number) => {
    if (line === undefined) return "-";
    return `${line}`;
};

const compareNumbersDesc = (
    left?: number | null,
    right?: number | null
) => {
    if (left === undefined || left === null) {
        return right === undefined || right === null ? 0 : 1;
    }
    if (right === undefined || right === null) return -1;
    return right - left;
};

const comparePlayerNames = (left: OddsBlazePlayer, right: OddsBlazePlayer) =>
    left.name.localeCompare(right.name);

const STICKY_COLUMN_BASE_CLASSES =
    "relative sticky left-0 before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-5 before:bg-[#030303] before:content-[''] after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-8 after:bg-gradient-to-r after:to-transparent after:content-[''] sm:before:w-6 sm:after:w-10";

const STICKY_COLUMN_HEADER_CLASSES = `${STICKY_COLUMN_BASE_CLASSES} z-30 pl-0 pr-3 py-2 bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.72)_100%)] after:from-black/45`;

const stickyColumnRowClasses = (banded: boolean) =>
    `${STICKY_COLUMN_BASE_CLASSES} z-20 pl-0 pr-3 py-3 ${banded
        ? "bg-[linear-gradient(90deg,rgba(8,8,8,0.98)_0%,rgba(8,8,8,0.95)_76%,rgba(8,8,8,0.74)_100%)]"
        : "bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.68)_100%)]"
    } after:from-black/40`;

const SCROLLER_STICKY_COLUMN_BASE_CLASSES =
    "relative sticky left-0 pl-0 pr-3 before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-5 before:bg-[#030303] before:content-[''] after:pointer-events-none after:absolute after:bottom-0 after:left-[-100vw] after:h-px after:w-[200vw] after:content-[''] sm:before:w-6";

const SCROLLER_STICKY_COLUMN_HEADER_CLASSES = `${SCROLLER_STICKY_COLUMN_BASE_CLASSES} z-30 py-2 bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.72)_100%)] after:bg-white/10`;

const scrollerStickyColumnRowClasses = (
    banded: boolean,
    selected = false
) =>
    `${SCROLLER_STICKY_COLUMN_BASE_CLASSES} z-20 py-3 ${banded
        ? "bg-[linear-gradient(90deg,rgba(8,8,8,0.98)_0%,rgba(8,8,8,0.95)_76%,rgba(8,8,8,0.74)_100%)]"
        : "bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.68)_100%)]"
    } ${selected ? "after:bg-emerald-300/60" : "after:bg-white/5"}`;

const PropRowScroller = ({
    scrollerKey,
    lines,
    renderChip,
}: {
    scrollerKey: string;
    lines: number[];
    renderChip: (line: number) => ReactNode;
}) => {
    return (
        <div
            key={scrollerKey}
            className="scrollbar-hide flex gap-2 overflow-x-auto px-1 py-1"
        >
            {lines.map((line) => renderChip(line))}
        </div>
    );
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
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03]">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/80 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/80 to-transparent" />
            <div
                ref={scrollerRef}
                className="scrollbar-hide flex gap-3 overflow-x-auto px-6 py-2"
            >
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

const resolveLineSelection = (
    lines: number[],
    current?: number | null,
    preferred?: number
) => {
    if (lines.length === 0) return null;
    if (current !== undefined && current !== null && lines.includes(current)) {
        return current;
    }
    return pickClosestLine(lines, preferred);
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
                availableLines: [],
                lineCount: 0,
                highestLine: null,
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
    const rows = [...rowMap.values()]
        .map((row) => {
            const availableLines = [...row.lines.keys()].sort((a, b) => a - b);
            return {
                ...row,
                availableLines,
                lineCount: availableLines.length,
                highestLine: availableLines[availableLines.length - 1] ?? null,
            };
        })
        .sort((left, right) => {
            const lineDiff = compareNumbersDesc(left.highestLine, right.highestLine);
            if (lineDiff !== 0) return lineDiff;
            const countDiff = right.lineCount - left.lineCount;
            if (countDiff !== 0) return countDiff;
            return comparePlayerNames(left.player, right.player);
        });

    return { lines, rows };
};

const buildDualPointsTable = (
    odds: SelectedOdd[],
    game: GameOption,
    options?: { normalizeToFive?: boolean }
) => {
    const normalizeLine = options?.normalizeToFive
        ? (value: number) => Math.round(value / 5) * 5
        : (value: number) => value;
    const rowMap = new Map<string, DualPointsTableRow>();

    odds.forEach(({ odd }) => {
        if (!odd.player) return;
        const line = odd.selection?.line;
        const side = odd.selection?.side?.toLowerCase();
        if (line === undefined || (side !== "over" && side !== "under")) return;

        const normalizedLine = normalizeLine(line);
        const player = odd.player;
        if (!rowMap.has(player.id)) {
            const teamLabel = playerTeamLabel(player, game);
            rowMap.set(player.id, {
                player,
                teamLabel,
                overLines: new Map(),
                underLines: new Map(),
                overAvailableLines: [],
                underAvailableLines: [],
                overLineCount: 0,
                underLineCount: 0,
                highestLine: null,
                lineCount: 0,
            });
        }

        const row = rowMap.get(player.id);
        if (!row) return;

        const targetMap = side === "over" ? row.overLines : row.underLines;
        const existing = targetMap.get(normalizedLine);
        const currentDiff = Math.abs(line - normalizedLine);
        const existingDiff =
            existing?.selection?.line !== undefined
                ? Math.abs(existing.selection.line - normalizedLine)
                : Number.POSITIVE_INFINITY;
        if (!existing || currentDiff <= existingDiff) {
            targetMap.set(normalizedLine, odd);
        }
    });

    const rows = [...rowMap.values()]
        .map((row) => {
            const overAvailableLines = [...row.overLines.keys()].sort((a, b) => a - b);
            const underAvailableLines = [...row.underLines.keys()].sort((a, b) => a - b);
            const allAvailableLines = [...new Set([...overAvailableLines, ...underAvailableLines])].sort(
                (a, b) => a - b
            );
            return {
                ...row,
                overAvailableLines,
                underAvailableLines,
                overLineCount: overAvailableLines.length,
                underLineCount: underAvailableLines.length,
                highestLine: allAvailableLines[allAvailableLines.length - 1] ?? null,
                lineCount: allAvailableLines.length,
            };
        })
        .sort((left, right) => {
            const lineDiff = compareNumbersDesc(left.highestLine, right.highestLine);
            if (lineDiff !== 0) return lineDiff;
            const countDiff = right.lineCount - left.lineCount;
            if (countDiff !== 0) return countDiff;
            return comparePlayerNames(left.player, right.player);
        });

    return { rows };
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
        .sort((left, right) => {
            const lineDiff = compareNumbersDesc(left.line, right.line);
            if (lineDiff !== 0) return lineDiff;
            return comparePlayerNames(left.player, right.player);
        });

    return rows;
};

const buildPairedSimplePropRows = (
    odds: SelectedOdd[],
    game: GameOption
): PairedPropRow[] => {
    const rowMap = new Map<string, PairedPropRow>();

    odds.forEach(({ odd }) => {
        if (!odd.player) return;
        const side = odd.selection?.side?.toLowerCase();
        if (side !== "over" && side !== "under") return;

        const player = odd.player;
        if (!rowMap.has(player.id)) {
            rowMap.set(player.id, {
                player,
                teamLabel: playerTeamLabel(player, game),
                over: undefined,
                under: undefined,
                overLine: undefined,
                underLine: undefined,
                highestLine: null,
            });
        }

        const entry = rowMap.get(player.id);
        if (!entry) return;

        if (side === "over" && (!entry.over || (!entry.over.main && odd.main))) {
            entry.over = odd;
            entry.overLine = odd.selection?.line;
        }

        if (side === "under" && (!entry.under || (!entry.under.main && odd.main))) {
            entry.under = odd;
            entry.underLine = odd.selection?.line;
        }
    });

    return [...rowMap.values()]
        .map((row) => ({
            ...row,
            highestLine: Math.max(row.overLine ?? Number.NEGATIVE_INFINITY, row.underLine ?? Number.NEGATIVE_INFINITY),
        }))
        .sort((left, right) => {
            const leftLine = Number.isFinite(left.highestLine) ? left.highestLine : null;
            const rightLine = Number.isFinite(right.highestLine) ? right.highestLine : null;
            const lineDiff = compareNumbersDesc(leftLine, rightLine);
            if (lineDiff !== 0) return lineDiff;
            return comparePlayerNames(left.player, right.player);
        });
};

const buildMainPointsRows = (odds: SelectedOdd[], game: GameOption): PairedPropRow[] => {
    const rowMap = new Map<string, PairedPropRow>();

    odds.forEach(({ odd }) => {
        if (!odd.player || !odd.main) return;
        const side = odd.selection?.side?.toLowerCase();
        const line = odd.selection?.line;
        const player = odd.player;
        if (!rowMap.has(player.id)) {
            rowMap.set(player.id, {
                player,
                teamLabel: playerTeamLabel(player, game),
                over: undefined,
                under: undefined,
                overLine: undefined,
                underLine: undefined,
                highestLine: null,
            });
        }

        const entry = rowMap.get(player.id);
        if (!entry) return;

        if (side === "over") {
            entry.over = odd;
            if (line !== undefined) entry.overLine = line;
        }
        if (side === "under") {
            entry.under = odd;
            if (line !== undefined) entry.underLine = line;
        }
    });

    return [...rowMap.values()]
        .map((row): PairedPropRow => ({
            ...row,
            highestLine:
                Math.max(
                    row.overLine ?? Number.NEGATIVE_INFINITY,
                    row.underLine ?? Number.NEGATIVE_INFINITY
                ),
        }))
        .sort((left, right) => {
            const leftLine = Number.isFinite(left.highestLine) ? left.highestLine : null;
            const rightLine = Number.isFinite(right.highestLine) ? right.highestLine : null;
            const lineDiff = compareNumbersDesc(leftLine, rightLine);
            if (lineDiff !== 0) return lineDiff;
            return comparePlayerNames(left.player, right.player);
        });
};

export const MlbPickBuilder = ({
    sport,
    slip,
    currentUser,
    picks,
    initialPick,
    onSave,
    onCreatePostPick,
    onPostToSlip,
    draftPick,
    onDraftPickChange,
    parlayLegs: externalParlayLegs,
    onParlayLegsChange,
    showCurrentPick = false,
    enforceEligibilityWindow = false,
    builderMode,
    activeDateKey,
    onDateChange,
    allowAutoDateAdvance = false,
    hideDateControls = false,
    onDateOptionsChange,
    reviewSheetState,
}: Props) => {
    const dispatch = useDispatch();
    const isMobile = useIsMobile();
    const { setToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>("GAME_LINES");
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [localCollapsedSections, setLocalCollapsedSections] = useState<
        Record<string, boolean>
    >(
        {}
    );
    const [expandedCategoryRows, setExpandedCategoryRows] = useState<
        Record<string, boolean>
    >({});
    const [selected, setSelected] = useState<SelectedOdd | null>(null);
    const [altSpreadLine, setAltSpreadLine] = useState<number | null>(null);
    const [altTotalLine, setAltTotalLine] = useState<number | null>(null);
    const [localIsReviewOpen, setLocalIsReviewOpen] = useState(false);
    const [localSelectedConfidence, setLocalSelectedConfidence] =
        useState<ConfidenceLevel | null>(null);
    const [localSameGameComboConfidences, setLocalSameGameComboConfidences] =
        useState<Record<string, ConfidenceLevel | null>>({});
    const [localStraightConfidences, setLocalStraightConfidences] = useState<
        Record<string, ConfidenceLevel | null>
    >({});
    const [localParlayLegs, setLocalParlayLegs] = useState<ParlayLeg[]>([]);
    const collapsedSections =
        reviewSheetState?.collapsedSections ?? localCollapsedSections;
    const setCollapsedSections =
        reviewSheetState?.setCollapsedSections ?? setLocalCollapsedSections;
    const isReviewOpen = reviewSheetState?.isOpen ?? localIsReviewOpen;
    const setIsReviewOpen = reviewSheetState?.setIsOpen ?? setLocalIsReviewOpen;
    const selectedConfidence =
        reviewSheetState?.selectedConfidence ?? localSelectedConfidence;
    const setSelectedConfidence =
        reviewSheetState?.setSelectedConfidence ?? setLocalSelectedConfidence;
    const sameGameComboConfidences =
        reviewSheetState?.sameGameComboConfidences ??
        localSameGameComboConfidences;
    const setSameGameComboConfidences =
        reviewSheetState?.setSameGameComboConfidences ??
        setLocalSameGameComboConfidences;
    const straightConfidences =
        reviewSheetState?.straightConfidences ?? localStraightConfidences;
    const setStraightConfidences =
        reviewSheetState?.setStraightConfidences ?? setLocalStraightConfidences;
    const parlayLegs = externalParlayLegs ?? localParlayLegs;
    const setParlayLegs = onParlayLegsChange ?? setLocalParlayLegs;
    const isPostMode = builderMode === "post";
    const isParlayMode = !slip.isGraded;
    const useGroupScoring = false;
    const confirmationVariant: "post" | "slip" = isPostMode ? "post" : "slip";
    const reviewTierScoringMode =
        confirmationVariant === "slip" && slip.isGraded
            ? "groupLeaderboard"
            : "global";
    const reviewTierDisplayMode =
        reviewTierScoringMode === "groupLeaderboard" ? "group" : "default";
    const showReviewTierCards = confirmationVariant !== "slip" || slip.isGraded;
    const windowDays = slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS;

    const [nhlMatchSchedules, setNHLMatchSchedules] = useState<MLBSchedules[]>([]);
    const [oddsData, setOddsData] = useState<OddsObject[]>([]);
    // const [isAnyLiveMatch, setIsAnyLiveMatch] = useState(false);

    const { mlbSchedules, mlbOdds, validatePickMessage, validatePickError, loading, validateLoading } = useSelector((state: RootState) => state.mlb);

    useEffect(() => {
        dispatch(fetchMLBScheduleRequest({ is_pick_of_day: true, is_range: false }));
    }, [dispatch]);

    useEffect(() => {
        if (Array.isArray(mlbSchedules?.events) && mlbSchedules?.events?.length) {
            const events = mlbSchedules.events;

            setNHLMatchSchedules(events);

            // Always compute and set explicitly (true OR false)
            // const anyLive = events.some(e => e.live === true);
            // setIsAnyLiveMatch(anyLive);
        }
        if (mlbOdds?.events?.length) {
            const activeEvent = activeGameId
                ? mlbOdds.events.find(e => e.id === activeGameId)
                : mlbOdds.events[0];

            setOddsData(activeEvent?.odds ?? []);
        } else if (mlbOdds?.updated) {
            setOddsData([]);
        }
    }, [mlbSchedules, mlbOdds, activeGameId]);

    const resolveTierMetaForOdds = useCallback(
        (americanOdds: number) =>
            useGroupScoring
                ? getGroupTierForAmericanOdds(americanOdds)
                : getTierForAmericanOdds(americanOdds),
        [useGroupScoring]
    );
    const resolveReviewTierMetaForOdds = useCallback(
        (americanOdds: number) =>
            reviewTierScoringMode === "groupLeaderboard"
                ? getGroupTierForAmericanOdds(americanOdds)
                : getTierForAmericanOdds(americanOdds),
        [reviewTierScoringMode]
    );

    const games = useMemo<GameOption[]>(() => {
        if (!nhlMatchSchedules) return [];
        return buildMergedGameOptions(oddsData, nhlMatchSchedules, activeGameId);
        // }, [nhlMatchSchedules, oddsData, nhlOdds?.updated, activeGameId]);
    }, [nhlMatchSchedules, oddsData, activeGameId]);
    const upcomingGames = useMemo(() => {
        const base = games.filter((game) => !game.live && !isPast(game.date));
        if (!enforceEligibilityWindow) {
            return filterUpcomingWindowGames(base, 6, false);
        }
        return base;
    }, [enforceEligibilityWindow, games]);
    const eligibleGames = useMemo(() => {
        if (!enforceEligibilityWindow) return upcomingGames;
        return filterEligibleGames(upcomingGames, slip.pick_deadline_at, windowDays);
    }, [enforceEligibilityWindow, upcomingGames, slip.pick_deadline_at, windowDays]);
    const todayIso = useMemo(() => new Date().toISOString(), []);
    const visibleGames = useMemo(() => {
        return eligibleGames;
    }, [eligibleGames]);
    const shouldFilterByDate = true;
    const showDateFilters = shouldFilterByDate && !hideDateControls;
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
    const dateKeysWithGames = useMemo(() => {
        const keys = new Set<string>();
        visibleGames.forEach((game) => {
            const key = toDateKey(game.date);
            if (!key) return;
            keys.add(key);
        });
        return keys;
    }, [visibleGames]);
    const filteredGames = useMemo(() => {
        if (!shouldFilterByDate || !effectiveDateKey) return visibleGames;
        return visibleGames.filter((game) => toDateKey(game.date) === effectiveDateKey);
    }, [effectiveDateKey, visibleGames, shouldFilterByDate]);
    const noGamesForSelectedDate =
        shouldFilterByDate && dateOptions.length > 0 && filteredGames.length === 0;

    useEffect(() => {
        if (!onDateOptionsChange) return;
        onDateOptionsChange(shouldFilterByDate ? dateOptions : []);
    }, [dateOptions, onDateOptionsChange, shouldFilterByDate]);

    useEffect(() => {
        if (!shouldFilterByDate || !onDateChange || !allowAutoDateAdvance) return;
        if (dateOptions.length === 0 || isSelectedDateValid) return;
        onDateChange(dateOptions[0].key, "auto");
    }, [
        allowAutoDateAdvance,
        dateOptions,
        isSelectedDateValid,
        onDateChange,
        shouldFilterByDate,
    ]);

    useEffect(() => {
        if (!shouldFilterByDate || !onDateChange || !allowAutoDateAdvance) return;
        if (!effectiveDateKey || dateKeysWithGames.size === 0) return;
        if (dateKeysWithGames.has(effectiveDateKey)) return;
        const nextOption = dateOptions.find((option) => dateKeysWithGames.has(option.key));
        if (!nextOption) return;
        onDateChange(nextOption.key, "auto");
    }, [
        allowAutoDateAdvance,
        dateKeysWithGames,
        dateOptions,
        effectiveDateKey,
        onDateChange,
        shouldFilterByDate,
    ]);

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
            dispatch(clearMlbPickValidateMessage());
        }
        if (!validateLoading && validatePickError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: validatePickError,
                duration: 3000
            });
            dispatch(clearMlbPickValidateMessage());
        }
    }, [dispatch, validateLoading, validatePickMessage, validatePickError, setToast]);

    const locked = !currentUser || !canUserEditSlipPicks(slip);

    const activeGame = useMemo(
        () => visibleGames.find((game) => game.id === activeGameId) ?? null,
        [activeGameId, visibleGames]
    );

    const activeMarketMap = useMemo(() => {
        if (!activeGame) return new Map<string, SelectedOdd[]>();
        const markets = TAB_MARKETS[activeTab];
        const term = search.trim().toLowerCase();
        const marketMap = new Map<string, SelectedOdd[]>();
        markets.forEach((market) => marketMap.set(market, []));

        activeGame.odds.forEach((odd) => {
            let bucketKey: string | null = null;
            if (markets.includes(odd.market)) {
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
    }, [activeGame, activeTab, search]);

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
        },
        [sport, slip.isGraded]
    );
    const cacheReviewFromDraft = useCallback(
        (draft: DraftPick): CachedReviewData => ({
            payload: draft,
            summary: draft.summary,
            odds: draft.odds_bracket ?? draft.odds,
            sourceTabLabel: draft.sourceTab ?? "Pick",
        }),
        []
    );

    const localDraft = useMemo(
        () => (selected ? buildDraftPick(selected.odd, selected.game) : null),
        [selected, buildDraftPick]
    );
    const hasMultipick = isParlayMode && parlayLegs.length > 1;
    const parlayQuote = useMemo(() => quoteSlipOdds(parlayLegs), [parlayLegs]);
    const parlayPricing = parlayQuote.pricing;
    const comboOddsValue = hasMultipick ? parlayQuote.americanOdds : null;
    const comboTierMeta =
        comboOddsValue !== null ? resolveTierMetaForOdds(comboOddsValue) : null;
    const comboLegs: PickLeg[] = useMemo(
        () =>
            parlayLegs.map((leg) => {
                const game = games.find((option) => option.id === leg.eventId);
                const matchup = game ? matchupLabel(game) : leg.matchup ?? null;
                const startTime = game?.date ?? leg.startTime;
                const americanOdds = parseAmericanOdds(leg.price);
                const tierMeta = americanOdds !== null ? resolveTierMetaForOdds(americanOdds) : undefined;
                const difficultyLabel = tierMeta ? tierLabelFromTier(tierMeta.tier) : undefined;

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
                        scope: leg.marketKey,
                        threshold: leg.line ?? undefined,
                        gameStartTime: startTime,
                        matchup: matchup ?? undefined,
                        external_pick_key: leg.id,
                        away_team: game?.awayTeam,
                        away_abbr: game?.awayAbbr,
                        home_team: game?.homeTeam,
                        home_abbr: game?.homeAbbr,
                        sport: leg.sport,
                    },
                    difficulty_label: difficultyLabel,
                    difficulty_tier: tierMeta?.tier,
                    result: "pending",
                    points: 0,
                    matchup: matchup ?? undefined,
                    match_time: startTime,
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
    const comboDraft = useMemo<DraftPick | null>(() => {
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
    }, [
        comboLegs,
        comboOddsValue,
        comboTierMeta,
        comboSport,
        hasMultipick,
        slip.isGraded,
        activeGame
    ]);

    const activeDraft = comboDraft ?? localDraft ?? draftPick ?? null;
    const reviewDrafts = useMemo(() => (activeDraft ? [activeDraft] : []), [activeDraft]);
    const hasMultiSelection = hasMultipick;
    const multiSelectionCount = hasMultipick ? parlayLegs.length : reviewDrafts.length;
    const showReviewSheet = Boolean(activeDraft);
    const activeDraftKey = useMemo(() => {
        if (!activeDraft) return "";
        const payload = activeDraft;
        return JSON.stringify({
            summary: activeDraft.summary,
            odds: payload.odds,
            difficultyLabel: payload.difficulty_label,
            points: activeDraft.points,
            selection: "selection" in activeDraft ? activeDraft.selection ?? null : null,
            isCombo: payload.isCombo,
            legs: payload.legs?.map((leg) => ({
                description: leg.description,
                odds: leg.odds_bracket,
                selection: leg.selection,
            })),
        });
    }, [activeDraft]);
    const activeDraftSelectionKey = useMemo(() => {
        if (!activeDraft) return "";
        const payload = activeDraft;
        return JSON.stringify({
            selection: "selection" in payload ? payload.selection ?? null : null,
            legs: payload.legs?.map((leg) => leg.selection ?? null) ?? [],
        });
    }, [activeDraft]);
    const lastDraftKeyRef = useRef<string>("");
    const lastConfidenceSeedKeyRef = useRef<string>("");

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

    useEffect(() => {
        if (!activeDraft) {
            lastConfidenceSeedKeyRef.current = "";
            setSelectedConfidence(null);
            return;
        }
        if (activeDraftSelectionKey === lastConfidenceSeedKeyRef.current) return;
        lastConfidenceSeedKeyRef.current = activeDraftSelectionKey;
        setSelectedConfidence(activeDraft.confidence ?? null);
    }, [activeDraft, activeDraftSelectionKey]);

    const isOddSelected = (odd?: OddsBlazeOdd | null) => {
        if (!odd) return false;
        if (isParlayMode) return parlayLegs.some((leg) => leg.id === odd.id);
        return selected?.odd.id === odd.id;
    };

    const findLegContext = useCallback(
        (leg: ParlayLeg) => {
            const targetGame =
                visibleGames.find((game) => game.id === leg.eventId) ??
                games.find((game) => game.id === leg.eventId);
            if (!targetGame) return null;
            const targetOdd = targetGame.odds.find((odd) => odd.id === leg.id);
            if (!targetOdd) return null;
            return { game: targetGame, odd: targetOdd };
        },
        [games, visibleGames]
    );

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

    const handleRemoveSinglePick = () => {
        if (isParlayMode && parlayLegs.length > 0) {
            handleRemoveParlayLeg(parlayLegs[0].id);
            return;
        }
        onDraftPickChange?.(null);
        setSelected(null);
    };

    const straightReviewItems = useMemo(
        () =>
            hasMultipick
                ? parlayLegs
                    .map((leg) => {
                        const context = findLegContext(leg);
                        const cachedReview = leg.cachedReview ?? null;
                        if (!context && !cachedReview) return null;
                        const draft = context ? buildDraftPick(context.odd, context.game) : null;
                        const payload = draft ?? cachedReview?.payload;
                        if (!payload) return null;
                        const tierMeta = getTierMetaForPick({
                            odds: payload.odds_bracket ?? draft?.odds ?? cachedReview?.odds,
                            label: payload.difficulty_label,
                            points: payload.points ?? draft?.points,
                            mode: reviewTierScoringMode,
                        });
                        const tierPrimary = tierMeta
                            ? formatTierPrimary(tierMeta.tier)
                            : draft?.displayDifficulty ?? "Tier —";
                        const tierPoints = reviewTierScoringMode === "groupLeaderboard"
                            ? tierMeta?.points
                            : payload.points ?? draft?.points ?? tierMeta?.points;
                        const tierName = tierMeta?.name ?? payload.difficulty_label ?? "—";
                        const tierLine = formatReviewSheetTierLine({
                            tierMeta,
                            fallbackPrimary: tierPrimary,
                            fallbackName: tierName,
                            points: tierPoints,
                            includeName: true,
                            mode: reviewTierDisplayMode,
                        });

                        return {
                            id: leg.id,
                            description: draft?.summary ?? cachedReview?.summary ?? leg.displayName,
                            odds:
                                payload.odds_bracket ??
                                draft?.odds ??
                                cachedReview?.odds ??
                                formatOdds(leg.price),
                            sourceTabLabel:
                                payload.sourceTab ?? cachedReview?.sourceTabLabel ?? "Pick",
                            payload,
                            metaLine: formatPickMetaLine({
                                description: draft?.summary ?? cachedReview?.summary ?? leg.displayName,
                                matchup: draft?.matchup ?? payload.selection?.matchup ?? null,
                                gameStartTime: payload.selection?.gameStartTime ?? null,
                            }),
                            tierLine,
                            tierCard: resolveReviewSheetTierCardAppearance(
                                tierMeta,
                                reviewTierDisplayMode
                            ),
                        };
                    })
                    .filter(
                        (
                            item
                        ): item is {
                            id: string;
                            description: string;
                            odds: string;
                            sourceTabLabel: string;
                            payload: BuiltPickPayload;
                            metaLine: string | null;
                            tierLine: string;
                            tierCard: ReturnType<typeof resolveTierCardAppearance>;
                        } => item !== null
                    )
                : [],
        [
            buildDraftPick,
            findLegContext,
            hasMultipick,
            parlayLegs,
            reviewTierDisplayMode,
            reviewTierScoringMode,
        ]
    );

    const resetAfterPost = () => {
        setIsReviewOpen(false);
        setSelected(null);
        setParlayLegs([]);
        setSelectedConfidence(null);
        setSameGameComboConfidences({});
        setStraightConfidences({});
        onDraftPickChange?.(null);
    };

    useEffect(() => {
        if (!hasMultipick) {
            setStraightConfidences({});
            return;
        }

        setStraightConfidences((prev) => {
            const next: Record<string, ConfidenceLevel | null> = {};
            straightReviewItems.forEach((item) => {
                next[item.id] = prev[item.id] ?? item.payload.confidence ?? null;
            });
            return next;
        });
    }, [hasMultipick, setStraightConfidences, straightReviewItems]);

    const comboReviewItems = useMemo(
        () =>
            hasMultipick
                ? parlayLegs.map((leg) => {
                    const legContext = findLegContext(leg);
                    const sourceTabLabel = legContext
                        ? TAB_LABELS[tabForOdd(legContext.odd)]
                        : leg.cachedReview?.sourceTabLabel ?? "Pick";
                    const legTierMeta = getTierMetaForPick({
                        odds: leg.price,
                        mode: reviewTierScoringMode,
                    });
                    const legPoints = legTierMeta?.points;
                    const legTierLine = formatReviewSheetTierLine({
                        tierMeta: legTierMeta,
                        points: legPoints,
                        includeName: reviewTierDisplayMode === "group",
                        mode: reviewTierDisplayMode,
                    });
                    return {
                        id: leg.id,
                        description: leg.displayName,
                        odds: leg.price,
                        sourceTabLabel,
                        metaLine: formatPickMetaLine({
                            description: leg.displayName,
                            matchup: leg.matchup ?? null,
                            gameStartTime: leg.startTime ?? null,
                        }),
                        tierLine: legTierLine,
                        onEdit: () => handleEditParlayLeg(leg),
                        onDelete: () => handleRemoveParlayLeg(leg.id),
                    };
                })
                : activeDraft
                    ? []
                    : [],
        [
            activeDraft,
            findLegContext,
            hasMultipick,
            parlayLegs,
            reviewTierDisplayMode,
            reviewTierScoringMode,
        ]
    );

    const sameGameComboGroups = useMemo<
        Array<SameGameComboReviewGroup & { payload: BuiltPickPayload }>
    >(() => {
        if (!hasMultipick) return [];

        const entries = parlayLegs
            .map((leg, index) => ({
                leg,
                comboLeg: comboLegs[index] ?? null,
                reviewItem: comboReviewItems[index] ?? null,
            }))
            .filter(
                (
                    entry
                ): entry is {
                    leg: ParlayLeg;
                    comboLeg: (typeof comboLegs)[number];
                    reviewItem: (typeof comboReviewItems)[number];
                } => entry.comboLeg !== null && entry.reviewItem !== null
            );

        const eventGroups = new Map<string, typeof entries>();
        entries.forEach((entry) => {
            const group = eventGroups.get(entry.leg.eventId) ?? [];
            group.push(entry);
            eventGroups.set(entry.leg.eventId, group);
        });

        const groups: Array<
            SameGameComboReviewGroup & { payload: BuiltPickPayload }
        > = [];

        Array.from(eventGroups.values())
            .filter((group) => group.length > 1)
            .forEach((group) => {
                const groupLegs = group.map((entry) => entry.leg);
                const groupQuote = quoteSlipOdds(groupLegs);
                const groupPricing = groupQuote.pricing;
                if (!groupPricing.canBuildCombo) return;

                const groupOddsValue = groupQuote.americanOdds;
                const groupOddsLabel =
                    groupOddsValue === null ? null : formatOdds(groupOddsValue);
                const payloadGroupTierMeta =
                    groupOddsValue !== null ? resolveTierMetaForOdds(groupOddsValue) : null;
                const reviewGroupTierMeta =
                    groupOddsValue !== null
                        ? resolveReviewTierMetaForOdds(groupOddsValue)
                        : null;
                const groupTierLine = formatReviewSheetTierLine({
                    tierMeta: reviewGroupTierMeta,
                    points: reviewGroupTierMeta?.points,
                    includeName: reviewTierDisplayMode === "group",
                    mode: reviewTierDisplayMode,
                });
                const description = group
                    .map((entry) => entry.comboLeg.description)
                    .join(" + ");
                const summaryLabel = description
                    ? `Same Game Combo: ${description}`
                    : "Same game combo";
                const difficultyLabel = slip.isGraded
                    ? null
                    : payloadGroupTierMeta
                        ? tierLabelFromTier(payloadGroupTierMeta.tier)
                        : null;

                groups.push({
                    id: `same-game-${group[0].leg.eventId}`,
                    label: group[0].leg.matchup ?? "Same game combo",
                    oddsLabel: groupOddsLabel,
                    validationCopy: groupPricing.requiresCustomPricing && groupOddsValue === null
                        ? "These picks require custom pricing."
                        : null,
                    items: group.map((entry) => entry.reviewItem),
                    tierLine: groupTierLine,
                    tierCard: resolveReviewSheetTierCardAppearance(
                        reviewGroupTierMeta,
                        reviewTierDisplayMode
                    ),
                    payload: {
                        sport: groupLegs[0]?.sport ?? sport,
                        description: summaryLabel,
                        odds_bracket: groupOddsLabel,
                        difficulty_label: difficultyLabel,
                        buildMode: "ODDS",
                        points: payloadGroupTierMeta?.points,
                        isCombo: true,
                        legs: group.map((entry) => entry.comboLeg),
                        sourceTab: "Same Game Combo",
                    } satisfies BuiltPickPayload,
                });
            });

        return groups;
    }, [
        comboLegs,
        comboReviewItems,
        hasMultipick,
        parlayLegs,
        resolveReviewTierMetaForOdds,
        resolveTierMetaForOdds,
        reviewTierDisplayMode,
        slip.isGraded,
        sport,
    ]);

    useEffect(() => {
        if (!hasMultipick) {
            setSameGameComboConfidences({});
            return;
        }

        setSameGameComboConfidences((prev) => {
            const next: Record<string, ConfidenceLevel | null> = {};
            sameGameComboGroups.forEach((group) => {
                next[group.id] = prev[group.id] ?? group.payload.confidence ?? null;
            });
            return next;
        });
    }, [hasMultipick, sameGameComboGroups, setSameGameComboConfidences]);

    const reviewListItems = !hasMultipick && activeDraft
        ? [
            {
                id: activeDraft.summary ?? "selected-pick",
                description: activeDraft.summary,
                odds: activeDraft.odds_bracket ?? activeDraft.odds,
                sourceTabLabel: activeDraft.sourceTab ?? "Pick",
                metaLine: formatPickMetaLine({
                    description: activeDraft.summary,
                    matchup: activeDraft.matchup ?? activeDraft.selection?.matchup ?? null,
                    gameStartTime: activeDraft.selection?.gameStartTime ?? null,
                }),
                onDelete: handleRemoveSinglePick,
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
            const legDraft = buildDraftPick(odd, game);
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
                cachedReview: cacheReviewFromDraft(legDraft),
                sport,
                matchup,
                startTime: game.date,
            };
            const existingLeg = parlayLegs.find((leg) => leg.id === incomingLeg.id);
            if (!existingLeg) {
                if (game.id && odd.id) {
                    dispatch(mlbPickValidateRequest({ match_id: game.id, external_pick_key: odd.id, is_live: game.live }));
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
                });
                return;
            }
            setParlayLegs((prev) => [...prev, incomingLeg]);
            onDraftPickChange?.(legDraft);
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

    const isCategoryRowsExpanded = (key: string) =>
        expandedCategoryRows[key] ?? false;

    const toggleCategoryRows = (key: string) => {
        setExpandedCategoryRows((prev) => ({
            ...prev,
            [key]: !(prev[key] ?? false),
        }));
    };

    const getVisibleCategoryRows = <T,>(rows: T[], key: string) => {
        const expanded = isCategoryRowsExpanded(key);
        const hasMore = rows.length > CATEGORY_ROW_PREVIEW_LIMIT;
        return {
            rows: expanded ? rows : rows.slice(0, CATEGORY_ROW_PREVIEW_LIMIT),
            expanded,
            hasMore,
        };
    };

    const renderCategoryRowsToggle = (key: string, totalRows: number) => {
        if (totalRows <= CATEGORY_ROW_PREVIEW_LIMIT) return null;
        const expanded = isCategoryRowsExpanded(key);
        return (
            <div className="mt-3 w-full">
                <button
                    type="button"
                    onClick={() => toggleCategoryRows(key)}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                    {expanded ? "show less" : "show more"}
                </button>
            </div>
        );
    };

    const straightSectionKey = "review-straight-picks";
    const sameGameSectionKey = "review-same-game-combo-picks";
    const isSameGameSectionCollapsed = hasMultiSelection
        ? isSectionCollapsed(sameGameSectionKey, false)
        : true;
    const isStraightSectionCollapsed = hasMultiSelection
        ? isSectionCollapsed(straightSectionKey, false)
        : true;

    const canSubmitPayloadCount = (payloadCount: number) => {
        if (confirmationVariant !== "slip" || slip.pick_limit === "unlimited") {
            return true;
        }

        const existingCount = picks.filter(
            (entry) => entry.slip_id === slip.id && entry.user_id === currentUser?.userId
        ).length;
        const isEditing =
            Boolean(
                initialPick &&
                initialPick.slip_id === slip.id &&
                initialPick.user_id === currentUser?.userId
            );
        const adjustedCount = isEditing ? Math.max(0, existingCount - 1) : existingCount;
        if (adjustedCount + payloadCount > slip.pick_limit) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Pick limit reached for this slip.",
                duration: 3000
            });
            return false;
        }

        return true;
    };

    const dispatchPayloads = (
        payloads: BuiltPickPayload[],
        action: "post" | "slip"
    ) => {
        if (locked || payloads.length === 0) return;
        if (!canSubmitPayloadCount(payloads.length)) return;

        const handler = action === "post"
            ? onCreatePostPick ?? onSave
            : onPostToSlip ?? onSave;

        payloads.forEach((payload) => {
            handler(payload);
        });
        resetAfterPost();
    };

    const buildComboSubmissionPayload = (action: "post" | "slip") => {
        if (!comboDraft) return null;
        if (!parlayPricing.canBuildCombo) {
            setToast({ id: Date.now(), type: "error", message: "Selections cannot be combined.", duration: 3000 });
            return null;
        }
        if (action === "post" && !selectedConfidence) {
            setToast({ id: Date.now(), type: "error", message: "Select a confidence level to post.", duration: 3000 });
            return null;
        }

        return {
            ...comboDraft,
            confidence: action === "post" ? selectedConfidence ?? null : null,
        } satisfies BuiltPickPayload;
    };

    const buildStraightSubmissionPayload = (
        legId: string,
        action: "post" | "slip"
    ) => {
        const item = straightReviewItems.find((entry) => entry.id === legId);
        if (!item) return null;
        const confidence = straightConfidences[legId] ?? null;

        if (action === "post" && !confidence) {
            setToast({ id: Date.now(), type: "error", message: "Select a confidence level to post.", duration: 3000 });
            return null;
        }

        return {
            ...item.payload,
            confidence: action === "post" ? confidence : null,
        } satisfies BuiltPickPayload;
    };

    const buildSameGameComboSubmissionPayload = (
        groupId: string,
        action: "post" | "slip"
    ) => {
        const group = sameGameComboGroups.find((entry) => entry.id === groupId);
        if (!group) return null;
        const confidence = sameGameComboConfidences[groupId] ?? null;

        if (action === "post" && !confidence) {
            setToast({ id: Date.now(), type: "error", message: "Select a confidence level to post.", duration: 3000 });
            return null;
        }

        return {
            ...group.payload,
            confidence: action === "post" ? confidence : null,
        } satisfies BuiltPickPayload;
    };

    const submitCombo = (action: "post" | "slip") => {
        const payload = buildComboSubmissionPayload(action);
        if (!payload) return;
        dispatchPayloads([payload], action);
    };

    const submitSelectedPosts = ({
        includeMainCombo,
        includeSinglePick,
        sameGameGroupIds,
        straightIds,
    }: ReviewSheetPostSelection) => {
        const payloads: BuiltPickPayload[] = [];

        if (includeMainCombo) {
            const comboPayload = buildComboSubmissionPayload("post");
            if (!comboPayload) return;
            payloads.push(comboPayload);
        }

        for (const groupId of sameGameGroupIds) {
            const sameGamePayload = buildSameGameComboSubmissionPayload(groupId, "post");
            if (!sameGamePayload) return;
            payloads.push(sameGamePayload);
        }

        for (const legId of straightIds) {
            const straightPayload = buildStraightSubmissionPayload(legId, "post");
            if (!straightPayload) return;
            payloads.push(straightPayload);
        }

        if (includeSinglePick) {
            if (!activeDraft || !selectedConfidence) {
                setToast({ id: Date.now(), type: "error", message: "Select a confidence level to post.", duration: 3000 });
                return;
            }
            payloads.push({
                ...activeDraft,
                confidence: selectedConfidence,
            });
        }

        if (payloads.length === 0) {
            setToast({ id: Date.now(), type: "error", message: "Select a confidence level to post.", duration: 3000 });
            return;
        }

        dispatchPayloads(payloads, "post");
    };

    const submitPick = (action: "post" | "slip") => {
        if (locked) return;

        if (hasMultipick) {
            submitCombo(action);
            return;
        }

        if (!activeDraft) return;
        dispatchPayloads(
            [
                {
                    ...activeDraft,
                    confidence: action === "post" ? selectedConfidence ?? null : null,
                },
            ],
            action
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

    const tableOddsBoxClasses = (selected?: boolean, muted?: boolean) =>
        buildOddsBoxClasses(
            "h-[40px] w-[var(--table-chip-width,60px)] shrink-0 whitespace-nowrap overflow-hidden rounded-md border bg-black/70 px-1 text-[11px] font-semibold tabular-nums transition sm:h-[52px] sm:px-3 sm:text-sm flex items-center justify-center",
            selected,
            muted
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
                    className={`whitespace-nowrap text-[10px] sm:text-xs ${muted ? "text-gray-500" : "text-white"
                        }`}
                >
                    {lineLabel}
                </span>
                <span
                    className={`whitespace-nowrap text-[10px] sm:text-xs ${muted ? "text-gray-500" : "text-emerald-100"
                        }`}
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
                className={`flex min-h-[60px] flex-col items-center justify-center px-2 py-1 text-center transition sm:px-3 ${isSelected ? "text-emerald-50" : "text-gray-200"
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

    const renderMainLinesGrid = (lines: MainLineOdds | null) => {
        if (!activeGame) return null;
        const {
            spreadAway,
            spreadHome,
            moneyAway,
            moneyHome,
            totalOver,
            totalUnder,
            totalLine,
        } = lines ?? {};

        return (
            <div className="mt-4 space-y-0 [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                <div
                    className="grid items-center gap-2 text-xs uppercase tracking-wide text-gray-400"
                    style={{
                        gridTemplateColumns: "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                    }}
                >
                    <div className="px-0">Team</div>
                    <div className="text-center">Run</div>
                    <div className="text-center">Money</div>
                    <div className="text-center">Total</div>
                </div>

                <div
                    className="grid items-stretch gap-1"
                    style={{
                        gridTemplateColumns: "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                    }}
                >
                    <div className="flex min-h-[52px] min-w-0 items-center gap-2 px-0 sm:gap-3">
                        <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xs font-semibold text-white sm:flex sm:h-10 sm:w-10">
                            {activeGame.awayAbbr}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                                {activeGame.awayTeam}
                            </p>
                        </div>
                    </div>
                    {renderMainLineCell(
                        spreadAway,
                        formatLineValue(spreadAway?.selection?.line),
                        spreadAway ? formatOdds(spreadAway.price) : "-"
                    )}
                    {renderMainLineCell(
                        moneyAway,
                        moneyAway ? formatOdds(moneyAway.price) : "-",
                        undefined
                    )}
                    {renderMainLineCell(
                        totalOver,
                        `O ${totalLine ?? "-"}`,
                        totalOver ? formatOdds(totalOver.price) : "-"
                    )}
                </div>

                <div
                    className="grid items-stretch gap-1 -mt-4 sm:mt-0"
                    style={{
                        gridTemplateColumns: "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                    }}
                >
                    <div className="flex min-h-[52px] min-w-0 items-center gap-2 px-0 sm:gap-3">
                        <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xs font-semibold text-white sm:flex sm:h-10 sm:w-10">
                            {activeGame.homeAbbr}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                                {activeGame.homeTeam}
                            </p>
                        </div>
                    </div>
                    {renderMainLineCell(
                        spreadHome,
                        formatLineValue(spreadHome?.selection?.line),
                        spreadHome ? formatOdds(spreadHome.price) : "-"
                    )}
                    {renderMainLineCell(
                        moneyHome,
                        moneyHome ? formatOdds(moneyHome.price) : "-",
                        undefined
                    )}
                    {renderMainLineCell(
                        totalUnder,
                        `U ${totalLine ?? "-"}`,
                        totalUnder ? formatOdds(totalUnder.price) : "-"
                    )}
                </div>
            </div>
        );
    };

    type SimpleMarketRow = {
        id: string;
        label: string;
        sublabel?: string;
        odd?: OddsBlazeOdd;
        lineLabel?: string;
    };

    const renderSimpleMarketTable = (
        rows: SimpleMarketRow[],
        options?: {
            headerLabel?: string;
            emptyMessage?: string;
            className?: string;
        }
    ) => {
        if (!activeGame) return null;
        if (rows.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No lines available for this market yet."}
                </div>
            );
        }
        const headerLabel = options?.headerLabel ?? "Selection";
        const className = options?.className ?? "mt-4 -mx-5 sm:-mx-6";
        return (
            <div className={className}>
                <div className="text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                    <div
                        className="grid border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:px-6"
                        style={{
                            gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                        }}
                    >
                        <div className={STICKY_COLUMN_HEADER_CLASSES}>{headerLabel}</div>
                        <div className="px-3 py-2 text-center">Odds</div>
                    </div>
                    {rows.map((row, rowIndex) => {
                        const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                        const isSelected = row.odd ? isOddSelected(row.odd) : false;
                        const oddsLabel = row.odd ? formatOdds(row.odd.price) : "-";
                        return (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => row.odd && handleSelectOdd(row.odd, activeGame)}
                                disabled={!row.odd || locked}
                                className={`grid w-full items-center border-b border-white/5 px-5 text-left transition sm:px-6 ${rowBand} ${isSelected
                                    ? "border-emerald-300/60 bg-emerald-500/10"
                                    : "hover:bg-white/[0.02]"
                                    } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                style={{
                                    gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                }}
                            >
                                <div className={stickyColumnRowClasses(rowIndex % 2 === 1)}>
                                    <p className="text-sm font-semibold text-white">{row.label}</p>
                                    {row.sublabel ? (
                                        <p className="mt-1 text-xs text-gray-400">{row.sublabel}</p>
                                    ) : null}
                                </div>
                                <div className="flex justify-center px-3 py-3">
                                    {row.lineLabel
                                        ? renderLineOddsBox(row.lineLabel, oddsLabel, isSelected, !row.odd)
                                        : renderTableOddsBox(oddsLabel, isSelected, !row.odd)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    type OddsCardEntry = OddsBlazeOdd | SelectedOdd;
    const normalizeOddEntry = (entry: OddsCardEntry) =>
        "odd" in entry ? entry.odd : entry;

    const renderOddCards = (odds: OddsCardEntry[]) => {
        if (!activeGame) return null;

        const sides = new Set(
            odds
                .map((entry) => normalizeOddEntry(entry).selection?.side?.toLowerCase())
                .filter(Boolean) as string[]
        );
        const showSidePrefix = sides.has("over") && sides.has("under");
        const getOddCardLabel = (odd: OddsBlazeOdd) => {
            if (odd.player) return odd.player.name;
            if (odd.market.includes("Total Runs") && !odd.market.includes("Team Total Runs")) {
                return odd.market;
            }
            return odd.selection?.name ?? odd.name ?? "Selection";
        };
        const getOddCardSublabel = (odd: OddsBlazeOdd) =>
            odd.player ? playerTeamLabel(odd.player, activeGame) || matchupLabel(activeGame) : matchupLabel(activeGame);

        if (showSidePrefix) {
            const pairedRows = new Map<
                string,
                {
                    id: string;
                    label: string;
                    sublabel?: string;
                    over?: OddsBlazeOdd;
                    under?: OddsBlazeOdd;
                    overLine?: number;
                    underLine?: number;
                }
            >();

            odds.forEach((entry) => {
                const odd = normalizeOddEntry(entry);
                const side = odd.selection?.side?.toLowerCase();
                if (side !== "over" && side !== "under") return;
                const label = getOddCardLabel(odd);
                const sublabel = getOddCardSublabel(odd);
                const key = [
                    odd.market,
                    label,
                    sublabel,
                    odd.selection?.line ?? "",
                ].join("|");
                const existing = pairedRows.get(key) ?? {
                    id: key,
                    label,
                    sublabel,
                    over: undefined,
                    under: undefined,
                    overLine: undefined,
                    underLine: undefined,
                };

                if (side === "over") {
                    existing.over = odd;
                    existing.overLine = odd.selection?.line;
                }
                if (side === "under") {
                    existing.under = odd;
                    existing.underLine = odd.selection?.line;
                }

                pairedRows.set(key, existing);
            });

            return (
                <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                    <div className="min-w-full w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                        <div
                            className="grid gap-2 text-xs uppercase tracking-wide text-gray-400"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                            }}
                        >
                            <div className={SCROLLER_STICKY_COLUMN_HEADER_CLASSES}>Selection</div>
                            <div className="px-3 py-2 text-center">Over</div>
                            <div className="px-3 py-2 text-center">Under</div>
                        </div>
                        {[...pairedRows.values()].map((row, rowIndex) => {
                            const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                            const rowHasSelection = isOddSelected(row.over) || isOddSelected(row.under);
                            const renderSideCell = (odd: OddsBlazeOdd | undefined, line?: number) => {
                                const isSelected = isOddSelected(odd);
                                return (
                                    <button
                                        type="button"
                                        onClick={() => odd && handleSelectOdd(odd, activeGame)}
                                        disabled={!odd || locked}
                                        className={`flex justify-center px-3 py-3 ${!odd ? "cursor-not-allowed" : ""
                                            }`}
                                    >
                                        {renderLineOddsBox(
                                            formatNumberLine(line),
                                            odd ? formatOdds(odd.price) : "-",
                                            isSelected,
                                            !odd
                                        )}
                                    </button>
                                );
                            };

                            return (
                                <div
                                    key={row.id}
                                    className={`grid items-center gap-2 border-b border-white/5 text-left ${rowBand}`}
                                    style={{
                                        gridTemplateColumns:
                                            "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                                    }}
                                >
                                    <div
                                        className={scrollerStickyColumnRowClasses(
                                            rowIndex % 2 === 1,
                                            rowHasSelection
                                        )}
                                    >
                                        <p className="text-sm font-semibold text-white">{row.label}</p>
                                        {row.sublabel ? (
                                            <p className="mt-1 text-xs text-gray-400">{row.sublabel}</p>
                                        ) : null}
                                    </div>
                                    {renderSideCell(row.over, row.overLine)}
                                    {renderSideCell(row.under, row.underLine)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        const rows: SimpleMarketRow[] = odds.map((entry) => {
            const odd = normalizeOddEntry(entry);
            const line = odd.selection?.line;
            const subtitle = getOddCardSublabel(odd);
            const label = line !== undefined ? getOddCardLabel(odd) : odd.name ?? odd.selection?.name ?? "Selection";

            return {
                id: odd.id,
                label,
                sublabel: subtitle,
                odd,
                lineLabel:
                    line !== undefined
                        ? `${line}`.trim()
                        : undefined,
            };
        });
        return renderSimpleMarketTable(rows, {
            headerLabel: "Selection",
            emptyMessage: "No lines available for this market yet.",
            className: "mt-4 -mx-5 sm:-mx-6",
        });
    };

    const renderMainOverUnderTable = (
        rows: ReturnType<typeof buildMainPointsRows>,
        sectionKey: string,
        options?: { className?: string; emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (rows.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No main lines available for this market yet."}
                </div>
            );
        }
        const { rows: visibleRows } = getVisibleCategoryRows(rows, sectionKey);
        return (
            <>
                <div className={options?.className ?? "mt-4 -mx-5 sm:-mx-6"}>
                    <div className="text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                        <div
                            className="grid gap-2 border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:px-6"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) repeat(2, var(--table-chip-width))",
                            }}
                        >
                            <div className="pl-0 pr-3 py-2">Player</div>
                            <div className="px-3 py-2 text-center">Over</div>
                            <div className="px-3 py-2 text-center">Under</div>
                        </div>
                        {visibleRows.map((row, rowIndex) => {
                            const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                            const overLine = row.over?.selection?.line ?? row.overLine;
                            const underLine = row.under?.selection?.line ?? row.underLine;
                            const renderPointButton = (odd: OddsBlazeOdd | undefined, line?: number) => {
                                const isSelected = isOddSelected(odd);
                                const label = formatNumberLine(line);
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
                                                className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-white" : "text-gray-500"
                                                    }`}
                                            >
                                                {label}
                                            </span>
                                            <span
                                                className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-emerald-100" : "text-gray-500"
                                                    }`}
                                            >
                                                {odd ? formatOdds(odd.price) : "-"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            };

                            return (
                                <div
                                    key={row.player.id}
                                    className={`grid items-center gap-2 border-b border-white/5 px-5 text-left sm:px-6 ${rowBand}`}
                                    style={{
                                        gridTemplateColumns:
                                            "minmax(0,1fr) repeat(2, var(--table-chip-width))",
                                    }}
                                >
                                    <div className="min-w-0 pl-0 pr-3 py-2.5">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {row.player.name}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-gray-400">
                                            {row.teamLabel}
                                        </p>
                                    </div>
                                    {renderPointButton(row.over, overLine)}
                                    {renderPointButton(row.under, underLine)}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {renderCategoryRowsToggle(sectionKey, rows.length)}
            </>
        );
    };

    const renderSingleSideScrollablePropTable = (
        table: { lines: number[]; rows: PointsTableRow[] },
        market: string,
        sectionKey: string
    ) => {
        if (!activeGame) return null;
        if (table.rows.length === 0) return null;
        const { rows: visibleRows } = getVisibleCategoryRows(table.rows, sectionKey);
        return (
            <>
                <div className="mt-4 -mx-5 sm:-mx-6">
                    <div className="text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                        <div
                            className="grid grid-cols-[minmax(112px,132px)_minmax(0,1fr)] items-center gap-3 border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)] sm:px-6"
                        >
                            <div className="pl-0 pr-3 py-2">Player</div>
                            <div className="px-0 py-2">Available lines</div>
                        </div>
                        {visibleRows.map((row, rowIndex) => {
                            const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                            const lineCountLabel = `${row.lineCount} line${row.lineCount === 1 ? "" : "s"}`;
                            return (
                                <div
                                    key={`${market}-${row.player.id}`}
                                    className={`border-b border-white/5 px-5 py-3 sm:px-6 ${rowBand}`}
                                >
                                    <div
                                        className="grid grid-cols-[minmax(112px,132px)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)]"
                                    >
                                        <div className="flex min-h-[56px] min-w-0 flex-col justify-center pr-1">
                                            <p className="text-[13px] font-semibold leading-tight text-white sm:text-sm">
                                                {row.player.name}
                                            </p>
                                            <p className="mt-1 text-[11px] leading-tight text-gray-400 sm:text-xs">
                                                {row.teamLabel}
                                                {row.teamLabel ? " · " : ""}
                                                {lineCountLabel}
                                            </p>
                                        </div>
                                        <div className="relative min-w-0 overflow-hidden rounded-2xl">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/90 to-transparent" />
                                            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-black/90 to-transparent" />
                                            <PropRowScroller
                                                scrollerKey={`${sectionKey}-${row.player.id}`}
                                                lines={row.availableLines}
                                                renderChip={(line) => {
                                                    const odd = row.lines.get(line);
                                                    const isSelected = isOddSelected(odd);
                                                    const oddsLabel = odd ? formatOdds(odd.price) : "-";
                                                    return (
                                                        <button
                                                            key={`${row.player.id}-${line}`}
                                                            type="button"
                                                            data-line={line}
                                                            onClick={() => odd && handleSelectOdd(odd, activeGame)}
                                                            disabled={!odd || locked}
                                                            className={`${tableOddsBoxClasses(
                                                                isSelected,
                                                                !odd
                                                            )} ${!odd ? "cursor-not-allowed" : ""}`}
                                                        >
                                                            <div className="flex flex-col items-center leading-tight">
                                                                <span
                                                                    className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-white" : "text-gray-500"
                                                                        }`}
                                                                >
                                                                    {formatLineLabel(line)}
                                                                </span>
                                                                <span
                                                                    className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-emerald-100" : "text-gray-500"
                                                                        }`}
                                                                >
                                                                    {oddsLabel}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {renderCategoryRowsToggle(sectionKey, table.rows.length)}
            </>
        );
    };

    const renderDualScrollablePropTable = (
        table: { rows: DualPointsTableRow[] },
        market: string,
        sectionKey: string
    ) => {
        if (!activeGame) return null;
        if (table.rows.length === 0) return null;
        const { rows: visibleRows } = getVisibleCategoryRows(table.rows, sectionKey);

        const renderSideScroller = (
            lines: number[],
            lineMap: Map<number, OddsBlazeOdd>,
            scrollerKey: string
        ) => (
            <div className="relative min-w-0 overflow-hidden rounded-2xl">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/90 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-black/90 to-transparent" />
                <PropRowScroller
                    scrollerKey={scrollerKey}
                    lines={lines}
                    renderChip={(line) => {
                        const odd = lineMap.get(line);
                        const isSelected = isOddSelected(odd);
                        const oddsLabel = odd ? formatOdds(odd.price) : "-";
                        return (
                            <button
                                key={`${scrollerKey}-${line}`}
                                type="button"
                                data-line={line}
                                onClick={() => odd && handleSelectOdd(odd, activeGame)}
                                disabled={!odd || locked}
                                className={`${tableOddsBoxClasses(
                                    isSelected,
                                    !odd
                                )} ${!odd ? "cursor-not-allowed" : ""}`}
                            >
                                <div className="flex flex-col items-center leading-tight">
                                    <span
                                        className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-white" : "text-gray-500"
                                            }`}
                                    >
                                        {formatLineLabel(line)}
                                    </span>
                                    <span
                                        className={`whitespace-nowrap text-[10px] sm:text-xs ${odd ? "text-emerald-100" : "text-gray-500"
                                            }`}
                                    >
                                        {oddsLabel}
                                    </span>
                                </div>
                            </button>
                        );
                    }}
                />
            </div>
        );

        return (
            <>
                <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                    <div className="min-w-[720px] text-xs text-white">
                        <div
                            className="grid items-center gap-3 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                            style={{
                                gridTemplateColumns:
                                    "minmax(140px,190px) minmax(220px,1fr) minmax(220px,1fr)",
                            }}
                        >
                            <div className={SCROLLER_STICKY_COLUMN_HEADER_CLASSES}>Player</div>
                            <div className="px-3 py-2 text-center">Over lines</div>
                            <div className="px-3 py-2 text-center">Under lines</div>
                        </div>
                        {visibleRows.map((row, rowIndex) => {
                            const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                            const rowHasSelection =
                                row.overAvailableLines.some((line) => isOddSelected(row.overLines.get(line))) ||
                                row.underAvailableLines.some((line) =>
                                    isOddSelected(row.underLines.get(line))
                                );
                            return (
                                <div
                                    key={`${market}-${row.player.id}`}
                                    className={`grid items-center gap-3 border-b border-white/5 ${rowBand}`}
                                    style={{
                                        gridTemplateColumns:
                                            "minmax(140px,190px) minmax(220px,1fr) minmax(220px,1fr)",
                                    }}
                                >
                                    <div
                                        className={scrollerStickyColumnRowClasses(
                                            rowIndex % 2 === 1,
                                            rowHasSelection
                                        )}
                                    >
                                        <p className="text-sm font-semibold text-white">{row.player.name}</p>
                                        <p className="mt-1 text-xs text-gray-400">{row.teamLabel}</p>
                                    </div>
                                    <div className="px-3 py-3">
                                        {renderSideScroller(
                                            row.overAvailableLines,
                                            row.overLines,
                                            `${sectionKey}-over-${row.player.id}`
                                        )}
                                    </div>
                                    <div className="px-3 py-3">
                                        {renderSideScroller(
                                            row.underAvailableLines,
                                            row.underLines,
                                            `${sectionKey}-under-${row.player.id}`
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {renderCategoryRowsToggle(sectionKey, table.rows.length)}
            </>
        );
    };

    const renderSingleSideSimplePropTable = (
        rows: SimplePropRow[],
        market: string,
        sectionKey: string
    ) => {
        if (!activeGame) return null;
        const { rows: visibleRows } = getVisibleCategoryRows(rows, sectionKey);

        return (
            <>
                <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                    <div className="min-w-full w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                        <div
                            className="grid text-xs uppercase tracking-wide text-gray-400"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                            }}
                        >
                            <div className={SCROLLER_STICKY_COLUMN_HEADER_CLASSES}>Player</div>
                            <div className="px-3 py-2 text-center">Line</div>
                            <div className="px-3 py-2 text-center">Odds</div>
                        </div>
                        {visibleRows.map((row, rowIndex) => {
                            const isSelected = isOddSelected(row.odd);
                            const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                            return (
                                <button
                                    key={`${market}-${row.player.id}`}
                                    type="button"
                                    onClick={() => row.odd && handleSelectOdd(row.odd, activeGame)}
                                    disabled={!row.odd || locked}
                                    className={`grid w-full items-center text-left transition ${rowBand} ${isSelected
                                        ? "border-emerald-300/60 bg-emerald-500/10"
                                        : "hover:bg-white/[0.02]"
                                        } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                    style={{
                                        gridTemplateColumns:
                                            "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                                    }}
                                >
                                    <div
                                        className={scrollerStickyColumnRowClasses(
                                            rowIndex % 2 === 1,
                                            isSelected
                                        )}
                                    >
                                        <p className="text-sm font-semibold text-white">{row.player.name}</p>
                                        <p className="mt-1 text-xs text-gray-400">{row.teamLabel}</p>
                                    </div>
                                    <div className="px-3 py-2.5 text-center text-xs text-gray-300">
                                        {formatNumberLine(row.line)}
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
                {renderCategoryRowsToggle(sectionKey, rows.length)}
            </>
        );
    };

    const renderAlternateSpreadSection = (
        data: { lines: number[]; map: Map<number, SpreadLineEntry> },
        activeLine: number | null,
        onSelectLine: (line: number) => void,
        options?: { className?: string; emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (data.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No alternate run lines available for this matchup yet."}
                </div>
            );
        }
        const resolvedLine = resolveLineSelection(data.lines, activeLine);
        const homeEntry = resolvedLine !== null ? data.map.get(resolvedLine) : undefined;
        const awayEntry =
            resolvedLine !== null ? data.map.get(-resolvedLine) : undefined;
        const homeOdd = homeEntry?.home;
        const awayOdd = awayEntry?.away;
        const homeLine = resolvedLine ?? homeOdd?.selection?.line;
        const awayLine =
            resolvedLine !== null ? -resolvedLine : awayOdd?.selection?.line ?? undefined;
        const rows: SimpleMarketRow[] = [
            {
                id: `${activeGame.id}-alt-spread-away`,
                label:
                    formatLineValue(awayLine ?? awayOdd?.selection?.line) !== "-"
                        ? `${activeGame.awayTeam} ${formatLineValue(
                            awayLine ?? awayOdd?.selection?.line
                        )}`
                        : activeGame.awayTeam,
                sublabel: activeGame.awayAbbr,
                odd: awayOdd,
            },
            {
                id: `${activeGame.id}-alt-spread-home`,
                label:
                    formatLineValue(homeLine ?? homeOdd?.selection?.line) !== "-"
                        ? `${activeGame.homeTeam} ${formatLineValue(
                            homeLine ?? homeOdd?.selection?.line
                        )}`
                        : activeGame.homeTeam,
                sublabel: activeGame.homeAbbr,
                odd: homeOdd,
            },
        ];
        return (
            <div className={options?.className ?? "mt-4 space-y-3"}>
                {renderSimpleMarketTable(rows, {
                    headerLabel: "Team",
                    className: "mt-0 -mx-5 sm:-mx-6",
                })}
                <LineScroller
                    lines={data.lines}
                    activeLine={resolvedLine}
                    onSelect={onSelectLine}
                    formatLine={(line) => formatLineValue(line)}
                    locked={locked}
                />
            </div>
        );
    };

    const renderAlternateTotalSection = (
        data: { lines: number[]; map: Map<number, TotalLineEntry> },
        activeLine: number | null,
        onSelectLine: (line: number) => void,
        options?: { className?: string; emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (data.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No alternate total runs available for this matchup yet."}
                </div>
            );
        }
        const resolvedLine = resolveLineSelection(data.lines, activeLine);
        const entry = resolvedLine !== null ? data.map.get(resolvedLine) : undefined;
        const overOdd = entry?.over;
        const underOdd = entry?.under;
        const rows: SimpleMarketRow[] = [
            {
                id: `${activeGame.id}-alt-total-over`,
                label:
                    formatNumberLine(overOdd?.selection?.line ?? resolvedLine ?? undefined) !== "-"
                        ? `Over ${formatNumberLine(
                            overOdd?.selection?.line ?? resolvedLine ?? undefined
                        )}`
                        : "Over",
                odd: overOdd,
            },
            {
                id: `${activeGame.id}-alt-total-under`,
                label:
                    formatNumberLine(underOdd?.selection?.line ?? resolvedLine ?? undefined) !== "-"
                        ? `Under ${formatNumberLine(
                            underOdd?.selection?.line ?? resolvedLine ?? undefined
                        )}`
                        : "Under",
                odd: underOdd,
            },
        ];
        return (
            <div className={options?.className ?? "mt-4 space-y-3"}>
                {renderSimpleMarketTable(rows, {
                    headerLabel: "Side",
                    className: "mt-0 -mx-5 sm:-mx-6",
                })}
                <LineScroller
                    lines={data.lines}
                    activeLine={resolvedLine}
                    onSelect={onSelectLine}
                    locked={locked}
                />
            </div>
        );
    };

    const sheetSummary = activeDraft?.summary ?? "Selected pick";
    const sheetTierMeta = activeDraft
        ? getTierMetaForPick({
            odds: activeDraft.odds_bracket,
            label: activeDraft.difficulty_label,
            points: activeDraft.points,
            mode: reviewTierScoringMode,
        })
        : null;
    const sheetTierPrimary = sheetTierMeta
        ? formatTierPrimary(sheetTierMeta.tier)
        : activeDraft?.displayDifficulty ?? "Tier —";
    const sheetPoints = reviewTierScoringMode === "groupLeaderboard"
        ? sheetTierMeta?.points
        : activeDraft?.points ?? sheetTierMeta?.points;
    const sheetTierCard = resolveReviewSheetTierCardAppearance(
        sheetTierMeta,
        reviewTierDisplayMode
    );
    const sheetTierLine = formatReviewSheetTierLine({
        tierMeta: sheetTierMeta,
        fallbackPrimary: sheetTierPrimary,
        points: sheetPoints,
        includeName: reviewTierDisplayMode === "group",
        mode: reviewTierDisplayMode,
    });
    const comboOddsLabel = hasMultiSelection
        ? activeDraft?.odds_bracket ?? activeDraft?.odds ?? null
        : null;
    const comboHasInvalidSelections =
        hasMultiSelection && parlayPricing.hasInvalidComboLegs;
    const comboValidationCopy = comboHasInvalidSelections
        ? "Selections cannot be combined"
        : parlayPricing.requiresCustomPricing && comboOddsValue === null
            ? "These picks require custom pricing."
            : null;
    const comboValidationReasons = comboHasInvalidSelections
        ? parlayPricing.invalidComboReasons
        : [];
    const sheetHeaderLabel = hasMultipick
        ? confirmationVariant === "post"
            ? "Post Slip"
            : "combo pick"
        : confirmationVariant === "post"
            ? "Post Slip"
            : "selected pick";
    const renderReviewSheet = () => (
        <PickReviewSheet
            show={showReviewSheet}
            isOpen={isReviewOpen}
            onOpenChange={setIsReviewOpen}
            hasMultiSelection={hasMultiSelection}
            multiSelectionCount={multiSelectionCount}
            sheetHeaderLabel={sheetHeaderLabel}
            sheetSummary={sheetSummary}
            confirmationVariant={confirmationVariant}
            locked={locked}
            comboHasInvalidSelections={comboHasInvalidSelections}
            comboValidationCopy={comboValidationCopy}
            comboValidationReasons={comboValidationReasons}
            comboOddsLabel={comboOddsLabel}
            comboReviewItems={comboReviewItems}
            sameGameComboGroups={sameGameComboGroups}
            straightReviewItems={straightReviewItems}
            reviewListItems={reviewListItems}
            sheetTierCard={sheetTierCard}
            sheetTierLine={sheetTierLine}
            showTierCards={showReviewTierCards}
            selectedConfidence={selectedConfidence}
            onSelectedConfidenceChange={setSelectedConfidence}
            sameGameComboConfidences={sameGameComboConfidences}
            onSameGameComboConfidenceChange={(id, value) =>
                setSameGameComboConfidences((prev) => ({ ...prev, [id]: value }))
            }
            straightConfidences={straightConfidences}
            onStraightConfidenceChange={(id, value) =>
                setStraightConfidences((prev) => ({ ...prev, [id]: value }))
            }
            isSameGameSectionCollapsed={isSameGameSectionCollapsed}
            onToggleSameGameSection={() => toggleSection(sameGameSectionKey, false)}
            isStraightSectionCollapsed={isStraightSectionCollapsed}
            onToggleStraightSection={() => toggleSection(straightSectionKey, false)}
            onSubmitCombo={submitCombo}
            onSubmitSingle={submitPick}
            onSubmitSelectedPosts={submitSelectedPosts}
        />
    );

    const mainLineOdds = useMemo(() => {
        if (!activeGame) return null;
        const spreadAway = findMainTeamOdd(activeGame, "Run Line", activeGame.awayTeam);
        const spreadHome = findMainTeamOdd(activeGame, "Run Line", activeGame.homeTeam);
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
            activeGame
                ? activeGame.odds.filter((odd) => odd.market === "Run Line" && !odd.main)
                : [],
        [activeGame]
    );

    const runLineOdds = useMemo(
        () =>
            activeGame ? activeGame.odds.filter((odd) => odd.market === "Run Line") : [],
        [activeGame]
    );

    const altTotalOdds = useMemo(
        () =>
            activeGame
                ? activeGame.odds.filter((odd) => odd.market === "Total Runs" && !odd.main)
                : [],
        [activeGame]
    );

    const altSpreadLineData = useMemo(() => {
        if (!activeGame) {
            return { lines: [] as number[], map: new Map<number, SpreadLineEntry>() };
        }
        const map = new Map<number, SpreadLineEntry>();
        const lineSet = new Set<number>();
        runLineOdds.forEach((odd) => {
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
    }, [activeGame, runLineOdds]);

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

    const gameLineExtraOdds = useMemo(() => {
        if (!activeGame) return [];
        const term = search.trim().toLowerCase();
        return activeGame.odds.filter((odd) => {
            if (!GAME_LINE_EXTRA_MARKETS.includes(odd.market)) return false;
            if (!term) return true;
            const haystack = buildSearchHaystack(odd, activeGame)
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [activeGame, search]);

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
        hasMainLines ||
        altSpreadOdds.length > 0 ||
        altTotalOdds.length > 0 ||
        gameLineExtraOdds.length > 0;

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
        if (locked || !game.hasOdds) return;
        setActiveGameId(game.id);
        if (game.id) {
            dispatch(fetchMLBOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
        }
        setActiveTab("GAME_LINES");
        setSearch("");
        setSelected(null);
    };

    const handleBackToMatchups = () => {
        setActiveGameId(null);
        setSearch("");
        setSelected(null);
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
            className={`space-y-4 ${activeGame ? "matchup-detail" : ""} ${confirmationVariant === "slip" && showReviewSheet ? isMobile ? "mb-20" : "mb-30" : showReviewSheet ? isMobile ? "mb-20" : "mb-40" : ""}`}
        >
            {!activeGame ? (
                <div className="grid gap-6">
                    <div className={`space-y-3 ${confirmationVariant === "slip" && showReviewSheet ? isMobile ? "mb-10" : "mb-30" : showReviewSheet ? isMobile ? "mb-10" : "mb-30" : ""}`}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white">choose a matchup</h4>
                            <span className="text-xs uppercase tracking-wide text-gray-400">
                                game lines + props
                            </span>
                        </div>
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
                            <div className="-mx-5 divide-y divide-white/10 overflow-y-auto scrollbar-hide sm:mx-0">
                                {filteredGames.map((game) => {
                                    const spreadAway = findMainTeamOdd(
                                        game,
                                        "Run Line",
                                        game.awayTeam
                                    );
                                    const spreadHome = findMainTeamOdd(
                                        game,
                                        "Run Line",
                                        game.homeTeam
                                    );
                                    const moneyAway = findMainTeamOdd(game, "Moneyline", game.awayTeam);
                                    const moneyHome = findMainTeamOdd(game, "Moneyline", game.homeTeam);
                                    const totalOver = findMainTotalOdd(game, "Over");
                                    const totalUnder = findMainTotalOdd(game, "Under");
                                    const totalLine =
                                        totalOver?.selection?.line ?? totalUnder?.selection?.line ?? null;

                                    const renderPreviewCell = (
                                        odd: OddsBlazeOdd | undefined,
                                        lineLabel: string,
                                        oddsLabel: string,
                                        muted: boolean,
                                        withLine: boolean
                                    ) => {
                                        const isSelected = isOddSelected(odd);
                                        const isDisabled = locked || !game.hasOdds || !odd;
                                        return (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    if (isDisabled || !odd) return;
                                                    handleSelectOdd(odd, game);
                                                    setIsReviewOpen(false);
                                                }}
                                                tabIndex={isDisabled ? -1 : 0}
                                                aria-disabled={isDisabled}
                                                className={`flex min-h-[60px] flex-col items-center justify-center px-2 py-1 text-center transition sm:px-3 ${isSelected ? "text-emerald-50" : "text-gray-200"
                                                    } ${!odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                            >
                                                {withLine
                                                    ? renderLineOddsBox(lineLabel, oddsLabel, isSelected, muted)
                                                    : renderTableOddsBox(oddsLabel, isSelected, muted)}
                                            </button>
                                        );
                                    };
                                    const isRowDisabled = locked || !game.hasOdds;
                                    return (
                                        <div
                                            key={game.id}
                                            role="button"
                                            tabIndex={isRowDisabled ? -1 : 0}
                                            aria-disabled={isRowDisabled}
                                            onClick={() => {
                                                if (isRowDisabled) return;
                                                handleSelectGame(game);
                                            }}
                                            onKeyDown={(event) => {
                                                if (isRowDisabled) return;
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    handleSelectGame(game);
                                                }
                                            }}
                                            className="py-4 px-2 space-y-0 [--table-chip-width:60px] sm:[--table-chip-width:96px]"
                                        >
                                            <div
                                                className="grid items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <div className="px-3"></div>
                                                <div className="text-center">Spread</div>
                                                <div className="text-center">Money</div>
                                                <div className="text-center">Total</div>
                                            </div>

                                            <div
                                                className="grid items-stretch gap-1"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <div className="flex min-h-[36px] sm:min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold leading-snug text-white">
                                                            {isMobile ? getMobileTeamName(game.awayAbbr, game.awayTeam) : game.awayTeam}
                                                        </p>
                                                    </div>
                                                </div>
                                                {renderPreviewCell(
                                                    spreadAway,
                                                    formatLineValue(spreadAway?.selection?.line),
                                                    spreadAway ? formatOdds(spreadAway.price) : "-",
                                                    !spreadAway,
                                                    true
                                                )}
                                                {renderPreviewCell(
                                                    moneyAway,
                                                    moneyAway ? formatOdds(moneyAway.price) : "-",
                                                    moneyAway ? formatOdds(moneyAway.price) : "-",
                                                    !moneyAway,
                                                    false
                                                )}
                                                {renderPreviewCell(
                                                    totalOver,
                                                    totalLine !== null ? `O ${totalLine}` : "-",
                                                    totalOver ? formatOdds(totalOver.price) : "-",
                                                    !totalOver,
                                                    true
                                                )}
                                            </div>

                                            <div
                                                className="grid items-center -mt-2 sm:mt-0"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <div className="px-3">
                                                    <div className="relative flex items-center h-px w-full overflow-hidden">
                                                        <div className="flex-grow h-px bg-gradient-to-r from-transparent via-emerald-700/90 to-transparent shimmer-divider"></div>
                                                    </div>
                                                </div>
                                                <div></div>
                                                <div></div>
                                                <div></div>
                                            </div>

                                            <div
                                                className="grid items-stretch gap-1 -mt-2 sm:mt-0"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <div className="flex min-h-[36px] sm:min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold leading-snug text-white">
                                                            {isMobile ? getMobileTeamName(game.homeAbbr, game.homeTeam) : game.homeTeam}
                                                        </p>
                                                    </div>
                                                </div>
                                                {renderPreviewCell(
                                                    spreadHome,
                                                    formatLineValue(spreadHome?.selection?.line),
                                                    spreadHome ? formatOdds(spreadHome.price) : "-",
                                                    !spreadHome,
                                                    true
                                                )}
                                                {renderPreviewCell(
                                                    moneyHome,
                                                    moneyHome ? formatOdds(moneyHome.price) : "-",
                                                    moneyHome ? formatOdds(moneyHome.price) : "-",
                                                    !moneyHome,
                                                    false
                                                )}
                                                {renderPreviewCell(
                                                    totalUnder,
                                                    totalLine !== null ? `U ${totalLine}` : "-",
                                                    totalUnder ? formatOdds(totalUnder.price) : "-",
                                                    !totalUnder,
                                                    true
                                                )}
                                            </div>
                                            <div
                                                className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-gray-400"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span className={`px-3 text-gray-400 ${isMobile ? `text-[10px]` : `text-[11px]`}`}>{formatDateTime(game.date)}</span>
                                                    {/* {game.live && (
                                                                                                <span className="flex items-center gap-1 text-red-500 font-medium">
                                                                                                    <span className="relative flex h-2 w-2">
                                                                                                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                                                                                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                                                                                                    </span>
                                                                                                    Live
                                                                                                </span>
                                                                                            )} */}
                                                </div>
                                                <div className="items-center">
                                                    <span className="text-xs text-gray-500">→</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="-mx-5 px-5 sm:-mx-6 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleBackToMatchups}
                                className="text-xs font-semibold lowercase text-gray-200 transition hover:text-white"
                            >
                                &larr; back to all matchups
                            </button>
                            <p className="text-xs text-gray-500 gap-2">
                                Updated {formatDateTime(mlbSchedules?.updated)}
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
                        </div>
                        <div className="scrollbar-hide -mx-5 mt-4 flex gap-3 overflow-x-auto border-b border-white/10 px-5 pb-2 sm:mx-0 sm:px-0">
                            {VISIBLE_TABS.map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${active
                                            ? "border-emerald-300 text-emerald-100"
                                            : "border-transparent text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {TAB_LABELS[tab]}
                                    </button>
                                );
                            })}
                        </div>

                    </div>

                    {!hasActiveMarketLines ? (
                        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
                            No matching lines. Try a different tab or search term.
                        </div>
                    ) : activeTab === "GAME_LINES" ? (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            <section className="px-5 pb-6 pt-3 sm:px-6">
                                {(() => {
                                    const sectionKey = "game-lines-main";
                                    const collapsed = isSectionCollapsed(sectionKey, true);
                                    return (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => toggleSection(sectionKey, true)}
                                                aria-expanded={!collapsed}
                                                className="flex w-full items-center justify-between pb-0 text-left"
                                            >
                                                <span className="text-sm font-semibold text-white">Game Lines</span>
                                                <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                                                    <span
                                                        className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                                            }`}
                                                    >
                                                        v
                                                    </span>
                                                </span>
                                            </button>

                                            {!collapsed && activeGame && renderMainLinesGrid(mainLineOdds)}
                                        </>
                                    );
                                })()}
                            </section>

                            {[
                                {
                                    key: "game-lines-alt-spread",
                                    title: "Alternate Run Line",
                                    odds: altSpreadOdds,
                                },
                                {
                                    key: "game-lines-alt-total",
                                    title: "Alternate Total Runs",
                                    odds: altTotalOdds,
                                },
                            ].map((section) => {
                                const collapsed = isSectionCollapsed(section.key, false);
                                if (section.odds.length === 0) return null;
                                return (
                                    <section
                                        key={section.key}
                                        className="px-5 py-6 sm:px-6"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.key, false)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between pb-0 text-left"
                                        >
                                            <span className="text-sm font-semibold text-white">
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
                                                ? renderAlternateSpreadSection(
                                                    altSpreadLineData,
                                                    altSpreadLine,
                                                    setAltSpreadLine
                                                )
                                                : section.key === "game-lines-alt-total"
                                                    ? renderAlternateTotalSection(
                                                        altTotalLineData,
                                                        altTotalLine,
                                                        setAltTotalLine
                                                    )
                                                    : renderOddCards(section.odds))}
                                    </section>
                                );
                            })}

                            {GAME_LINE_EXTRA_MARKETS.map((market) => {
                                const odds = activeMarketMap.get(market) ?? [];
                                if (odds.length === 0) return null;
                                const sectionKey = `game-lines-${market}`;
                                const collapsed = isSectionCollapsed(sectionKey, false);
                                return (
                                    <section key={sectionKey} className="px-5 py-6 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(sectionKey, false)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between pb-0 text-left"
                                        >
                                            <span className="text-sm font-semibold text-white">{market}</span>
                                            <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
                                                <span
                                                    className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"
                                                        }`}
                                                >
                                                    v
                                                </span>
                                            </span>
                                        </button>
                                        {!collapsed && renderOddCards(odds)}
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            {TAB_MARKETS[activeTab].map((market, index) => {
                                const odds = activeMarketMap.get(market) ?? [];
                                if (odds.length === 0 || !activeGame) return null;

                                const sides = new Set(
                                    odds
                                        .map((item) => item.odd.selection?.side?.toLowerCase())
                                        .filter(Boolean) as string[]
                                );
                                const hasOver = sides.has("over");
                                const hasUnder = sides.has("under");
                                const isMainPlayerPoints =
                                    MAIN_OVER_UNDER_MARKETS.has(market) && hasOver && hasUnder;
                                const isTableMarket = TABLE_MARKETS.has(market);
                                const singleSide = hasOver ? "Over" : hasUnder ? "Under" : null;
                                const singleSideTable =
                                    isTableMarket && singleSide
                                        ? buildPointsTable(odds, activeGame, singleSide)
                                        : { lines: [] as number[], rows: [] as PointsTableRow[] };
                                const dualSideTable =
                                    isTableMarket && hasOver && hasUnder
                                        ? buildDualPointsTable(odds, activeGame)
                                        : { rows: [] as DualPointsTableRow[] };
                                const showSingleSideTable =
                                    isTableMarket &&
                                    Boolean(singleSide) &&
                                    (!hasOver || !hasUnder) &&
                                    singleSideTable.lines.length > 1 &&
                                    singleSideTable.rows.length > 0;
                                const showDualSideTable =
                                    isTableMarket &&
                                    hasOver &&
                                    hasUnder &&
                                    dualSideTable.rows.some(
                                        (row) => row.overLineCount > 1 || row.underLineCount > 1
                                    );
                                const simpleRows =
                                    isTableMarket && singleSide
                                        ? buildSimplePropRows(odds, activeGame, singleSide)
                                        : [];
                                const pairedSimpleRows =
                                    isTableMarket && hasOver && hasUnder
                                        ? buildPairedSimplePropRows(odds, activeGame)
                                        : [];
                                const mainPointsRows = isMainPlayerPoints
                                    ? buildMainPointsRows(odds, activeGame)
                                    : [];
                                const sectionKey = `${activeTab}-${market}`;
                                const collapsed = isSectionCollapsed(sectionKey, index === 0);

                                const sectionPadding =
                                    index === 0 ? "px-5 pb-6 pt-3 sm:px-6" : "px-5 py-6 sm:px-6";
                                return (
                                    <section
                                        key={`${activeGame.id}-${market}`}
                                        className={sectionPadding}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(sectionKey, index === 0)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between pb-0 text-left"
                                        >
                                            <span className="text-sm font-semibold text-white">
                                                {market}
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

                                        {!collapsed && (
                                            <>
                                                {isMainPlayerPoints ? (
                                                    renderMainOverUnderTable(mainPointsRows, sectionKey)
                                                ) : showDualSideTable ? (
                                                    renderDualScrollablePropTable(dualSideTable, market, sectionKey)
                                                ) : showSingleSideTable ? (
                                                    renderSingleSideScrollablePropTable(
                                                        singleSideTable,
                                                        market,
                                                        sectionKey
                                                    )
                                                ) : isTableMarket && hasOver && hasUnder ? (
                                                    renderMainOverUnderTable(pairedSimpleRows, sectionKey, {
                                                        emptyMessage: "No lines available for this market yet.",
                                                    })
                                                ) : isTableMarket ? (
                                                    renderSingleSideSimplePropTable(simpleRows, market, sectionKey)
                                                ) : (
                                                    renderOddCards(odds)
                                                )}
                                            </>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {renderReviewSheet()}

        </div>
    );
};

export default MlbPickBuilder;
