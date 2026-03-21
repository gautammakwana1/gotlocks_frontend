"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ODDS_BRACKETS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils/date";
import { BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, League, NBAOdds, NBASchedules, OddsBlazeOdd, OddsBlazePlayer, OddsBlazeTeam, OddsData, OddsEvent, OddsObject, ParlayLeg, Pick, PickLeg, PickSelectionMeta, RootState, Slip } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { cleatNbaPickValidateMessage, fetchDraftkingsNBAOddsRequest, fetchFanduelNBAOddsRequest, fetchNBAScheduleRequest, nbaPickValidateRequest } from "@/lib/redux/slices/nbaSlice";
import { useToast } from "@/lib/state/ToastContext";
import FootballAnimation from "../animations/FootballAnimation";
import { normalizeOddToLeg, validateAddLeg } from "@/lib/sgp/validateParlay";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS } from "@/lib/utils/games";
import { formatTierPrimary, getGroupTierForAmericanOdds, getTierForAmericanOdds, getTierMetaForPick, parseAmericanOdds, TierIndex } from "@/lib/utils/scoring";
import { canUserEditSlipPicks } from "@/lib/slips/state";
import { useIsMobile } from "../leaderboard/LeaderboardGrid";
import { getShortTeamName } from "@/lib/utils/helpers";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";
import { CachedReviewData, ReviewSheetState } from "./reviewSheetState";
import { PickReviewSheet, ReviewSheetPostSelection, SameGameComboReviewGroup } from "./PickReviewSheet";
import { quoteSlipOdds } from "@/lib/sgp/comboPricing";
import { formatReviewSheetTierLine, resolveReviewSheetTierCardAppearance } from "@/lib/utils/reviewSheetTierDisplay";
import { formatPickMetaLine } from "@/lib/utils/pickDescription";

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
    reviewSheetState?: ReviewSheetState;
};

const eventKey = (event: OddsData) =>
    event.id || `${event.date.slice(0, 10)}|${event.teams.away.id}|${event.teams.home.id}`;

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

const dedupeOdds = (odds: OddsObject[]) => {
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

const latestUpdatedAt = (snapshots: NBAOdds[]) =>
    snapshots.reduce((latest, snapshot) => {
        const currentTime = Date.parse(snapshot.updated);
        const latestTime = Date.parse(latest);
        if (Number.isNaN(currentTime)) return latest;
        if (Number.isNaN(latestTime) || currentTime > latestTime) {
            return snapshot.updated;
        }
        return latest;
    }, "");

const mergeOddsSnapshots = (...snapshots: NBAOdds[]): NBAOdds => {
    const baseSnapshot = snapshots[0];

    if (!baseSnapshot) {
        return {
            updated: "",
            league: { id: "nba", name: "NBA", sport: "Basketball" },
            sportsbook: { id: "multi", name: "Multiple" },
            events: [],
        };
    }

    const mergedEvents = new Map<string, OddsData>();

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

const TAB_ORDER = [
    "GAME_LINES",
    "PLAYER_POINTS",
    "PLAYER_THREES",
    "PLAYER_REBOUNDS",
    "PLAYER_ASSISTS",
    "QUICK_BETS",
    "PLAYER_COMBOS",
    "PLAYER_DEFENSE",
    "QUARTERS",
    "HALVES",
] as const;

type TabId = (typeof TAB_ORDER)[number];

const TAB_LABELS: Record<TabId, string> = {
    QUARTERS: "Quarters",
    HALVES: "Halves",
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
const ALT_THREES_MARKET = "Alt Player Threes";
const ALT_REBOUNDS_MARKET = "Alt Player Rebounds";
const ALT_ASSISTS_MARKET = "Alt Player Assists";
const ALT_STEALS_MARKET = "Alt Player Steals";
const ALT_BLOCKS_MARKET = "Alt Player Blocks";
const ALT_PRA_MARKET = "Alt Player Points + Rebounds";
const ALT_PA_MARKET = "Alt Player Points + Assists";
const ALT_RA_MARKET = "Alt Player Rebounds + Assists";
const ALT_PRA3_MARKET = "Alt Player Points + Rebounds + Assists";

const MAIN_OVER_UNDER_MARKETS = new Set<string>([
    "Player Points",
    "Player Threes Made",
    "Player Rebounds",
    "Player Assists",
    "Player Steals",
    "Player Blocks",
]);

const COMBO_OVER_UNDER_MARKETS = new Set<string>([
    "Player Points + Rebounds",
    "Player Points + Assists",
    "Player Rebounds + Assists",
    "Player Points + Rebounds + Assists",
]);

const COMBO_YES_NO_MARKETS = new Set<string>([
    "Player Double Double",
    "Player Triple Double",
]);

const COMBO_ALT_MARKETS = new Set<string>([
    ALT_PRA_MARKET,
    ALT_PA_MARKET,
    ALT_RA_MARKET,
    ALT_PRA3_MARKET,
]);

const ALT_CATEGORY_MARKETS = new Set<string>([
    ALT_POINTS_MARKET,
    ALT_THREES_MARKET,
    ALT_REBOUNDS_MARKET,
    ALT_ASSISTS_MARKET,
    ALT_STEALS_MARKET,
    ALT_BLOCKS_MARKET,
    ALT_PRA_MARKET,
    ALT_PA_MARKET,
    ALT_RA_MARKET,
    ALT_PRA3_MARKET,
]);

const COMBO_ALT_TO_MAIN: Record<string, string> = {
    [ALT_PRA_MARKET]: "Player Points + Rebounds",
    [ALT_PA_MARKET]: "Player Points + Assists",
    [ALT_RA_MARKET]: "Player Rebounds + Assists",
    [ALT_PRA3_MARKET]: "Player Points + Rebounds + Assists",
};

const ALT_MARKET_MAP: Record<string, string> = {
    "Player Points": ALT_POINTS_MARKET,
    "Player Threes Made": ALT_THREES_MARKET,
    "Player Rebounds": ALT_REBOUNDS_MARKET,
    "Player Assists": ALT_ASSISTS_MARKET,
    "Player Steals": ALT_STEALS_MARKET,
    "Player Blocks": ALT_BLOCKS_MARKET,
    "Player Points + Rebounds": ALT_PRA_MARKET,
    "Player Points + Assists": ALT_PA_MARKET,
    "Player Rebounds + Assists": ALT_RA_MARKET,
    "Player Points + Rebounds + Assists": ALT_PRA3_MARKET,
};

const TAB_MARKETS: Record<TabId, string[]> = {
    QUARTERS: [
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
    HALVES: [
        "1st Half Moneyline",
        "1st Half Point Spread",
        "1st Half Total Points",
        "1st Half Total Points Odd/Even",
        "2nd Half Moneyline",
        "2nd Half Point Spread",
        "2nd Half Total Points",
        "2nd Half Total Points Odd/Even",
    ],
    GAME_LINES: [
        "Moneyline",
        "Point Spread",
        "Total Points",
    ],
    PLAYER_POINTS: [
        "Player Points",
        ALT_POINTS_MARKET,
        "1st Quarter Player Points",
        "1st 3 Minutes Player Points",
    ],
    PLAYER_THREES: ["Player Threes Made", ALT_THREES_MARKET],
    PLAYER_REBOUNDS: [
        "Player Rebounds",
        ALT_REBOUNDS_MARKET,
        "1st Quarter Player Rebounds",
        "1st 3 Minutes Player Rebounds",
    ],
    PLAYER_ASSISTS: [
        "Player Assists",
        ALT_ASSISTS_MARKET,
        "1st Quarter Player Assists",
        "1st 3 Minutes Player Assists",
    ],
    QUICK_BETS: [
        "First Basket",
        "Home Team First Basket",
        "Away Team First Basket",
        "Home Team First Field Goal",
        "Away Team First Field Goal",
        "Top Points Scorer",
        "Total Points Odd/Even",
        "Overtime?",
        "1st Minute Both Teams To Score"
    ],
    PLAYER_COMBOS: [
        "Player Points + Rebounds",
        ALT_PRA_MARKET,
        "Player Points + Assists",
        ALT_PA_MARKET,
        "Player Rebounds + Assists",
        ALT_RA_MARKET,
        "Player Points + Rebounds + Assists",
        ALT_PRA3_MARKET,
        "Player Double Double",
        "Player Triple Double",
    ],
    PLAYER_DEFENSE: [
        "Player Steals",
        ALT_STEALS_MARKET,
        "Player Blocks",
        ALT_BLOCKS_MARKET,
    ],
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
    ALT_THREES_MARKET,
    ALT_REBOUNDS_MARKET,
    ALT_ASSISTS_MARKET,
    ALT_STEALS_MARKET,
    ALT_BLOCKS_MARKET,
    ALT_PRA_MARKET,
    ALT_PA_MARKET,
    ALT_RA_MARKET,
    ALT_PRA3_MARKET,
    "1st Quarter Player Points",
    "1st 3 Minutes Player Points",
    "1st Quarter Player Assists",
    "1st 3 Minutes Player Assists",
    "Player Threes Made",
    "Player Rebounds",
    "1st Quarter Player Rebounds",
    "1st 3 Minutes Player Rebounds",
    "Player Assists",
]);

const tierMetaFromIndex = (tier?: TierIndex) =>
    typeof tier === "number" ? ODDS_BRACKETS[tier - 1] : undefined;

const tierNameFromIndex = (tier?: TierIndex) =>
    tierMetaFromIndex(tier)?.name ?? "EVEN";

const tierLabelFromTier = (tier?: TierIndex) => tierNameFromIndex(tier);

const normalizeAbbr = (team: OddsBlazeTeam) =>
    team.abbreviation ?? team.name.split(" ").map((part) => part[0]).join("").slice(0, 3);

const buildGameOptions = (
    snapshot: NBASchedules[],
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
    snapshot: NBASchedules[],
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
    scheduleSnapshot: NBASchedules[],
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
        return `${matchup}${DASH_SEPARATOR}${odd.name} total points`;
    }
    if (odd.market.includes("Total Points")) {
        if (side && line !== undefined) {
            return `${matchup}${DASH_SEPARATOR}${side} ${line} ${odd.market}`;
        }
        return `${matchup}${DASH_SEPARATOR}${odd.name} ${odd.market}`;
    }
    if (odd.market === "Overtime?") {
        const label = odd.selection?.side ?? odd.name;
        return `${matchup}${DASH_SEPARATOR}${label} overtime`;
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

const findMainTotalOddForMarket = (
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

type MainLineOdds = {
    spreadAway?: OddsBlazeOdd;
    spreadHome?: OddsBlazeOdd;
    moneyAway?: OddsBlazeOdd;
    moneyHome?: OddsBlazeOdd;
    totalOver?: OddsBlazeOdd;
    totalUnder?: OddsBlazeOdd;
    totalLine?: number;
};

const buildMainLineOddsForMarkets = (
    game: GameOption,
    markets: { spread: string; money: string; total: string }
): MainLineOdds => {
    const spreadAway = findMainTeamOdd(game, markets.spread, game.awayTeam);
    const spreadHome = findMainTeamOdd(game, markets.spread, game.homeTeam);
    const moneyAway = findMainTeamOdd(game, markets.money, game.awayTeam);
    const moneyHome = findMainTeamOdd(game, markets.money, game.homeTeam);
    const totalOver = findMainTotalOddForMarket(game, markets.total, "Over");
    const totalUnder = findMainTotalOddForMarket(game, markets.total, "Under");
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
};

const buildAltSpreadLineData = (odds: OddsBlazeOdd[], game: GameOption) => {
    const map = new Map<number, SpreadLineEntry>();
    const lineSet = new Set<number>();
    odds.forEach((odd) => {
        const line = odd.selection?.line;
        if (line === undefined) return;
        lineSet.add(line);
        const entry = map.get(line) ?? {};
        const teamId = teamIdFromOdd(odd, game);
        if (teamId === game.homeTeamId) entry.home = odd;
        if (teamId === game.awayTeamId) entry.away = odd;
        map.set(line, entry);
    });
    const lines = Array.from(lineSet.values())
        .filter((line) => map.get(line)?.home && map.get(-line)?.away)
        .sort((a, b) => a - b);
    return { lines, map };
};

const buildAltTotalLineData = (odds: OddsBlazeOdd[]) => {
    const map = new Map<number, TotalLineEntry>();
    odds.forEach((odd) => {
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
};

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

const buildYesNoRows = (odds: SelectedOdd[], game: GameOption) => {
    const rowMap = new Map<
        string,
        {
            odd: OddsBlazeOdd;
            player: OddsBlazePlayer;
            teamLabel: string;
        }
    >();

    odds.forEach(({ odd }) => {
        if (!odd.player) return;
        const side = odd.selection?.side?.toLowerCase();
        if (side && side !== "yes") return;
        const existing = rowMap.get(odd.player.id);
        if (existing && !existing.odd.main && odd.main) {
            rowMap.set(odd.player.id, {
                odd,
                player: odd.player,
                teamLabel: playerTeamLabel(odd.player, game),
            });
            return;
        }
        if (!existing) {
            rowMap.set(odd.player.id, {
                odd,
                player: odd.player,
                teamLabel: playerTeamLabel(odd.player, game),
            });
        }
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
    onDateChange,
    allowAutoDateAdvance,
    onDateOptionsChange,
    reviewSheetState,
}: Props) => {
    const isMobile = useIsMobile();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>("GAME_LINES");
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [localCollapsedSections, setLocalCollapsedSections] = useState<
        Record<string, boolean>
    >(
        {}
    );
    const [selected, setSelected] = useState<SelectedOdd | null>(null);
    const [altSpreadLine, setAltSpreadLine] = useState<number | null>(null);
    const [altTotalLine, setAltTotalLine] = useState<number | null>(null);
    const [halfSpreadLines, setHalfSpreadLines] = useState<Record<string, number | null>>(
        {}
    );
    const [halfTotalLines, setHalfTotalLines] = useState<Record<string, number | null>>(
        {}
    );
    const [quarterAltSpreadLines, setQuarterAltSpreadLines] = useState<
        Record<string, number | null>
    >({});
    const [quarterAltTotalLines, setQuarterAltTotalLines] = useState<
        Record<string, number | null>
    >({});
    const [localIsReviewOpen, setLocalIsReviewOpen] = useState(false);
    const [localSelectedConfidence, setLocalSelectedConfidence] = useState<ConfidenceLevel | null>(null);
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

    const [nbaMatchSchedules, setNBAMatchSchedules] = useState<NBASchedules[]>([]);
    const [oddsData, setOddsData] = useState<OddsObject[]>([]);
    // const [isAnyLiveMatch, setIsAnyLiveMatch] = useState(false);

    const { nbaSchedules, fanduelNbaOdds, draftkingNbaOdds, validatePickMessage, validatePickError, loading, validateLoading } = useSelector((state: RootState) => state.nba);

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
            dispatch(fetchNBAScheduleRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate), is_range: false, is_pick_of_day: false }));
        } else {
            dispatch(fetchNBAScheduleRequest({ is_pick_of_day: true, is_range: false }));
        }
    }, [dispatch, slip?.pick_deadline_at, slip?.results_deadline_at]);
    useEffect(() => {
        if (nbaSchedules?.events?.length) {
            const events = nbaSchedules.events;

            setNBAMatchSchedules(events);

            // Always compute and set explicitly (true OR false)
            // const anyLive = events.some(e => e.live === true);
            // setIsAnyLiveMatch(anyLive);
        }
        if (fanduelNbaOdds?.events?.length) {
            const activeEvent = activeGameId
                ? fanduelNbaOdds.events.find(e => e.id === activeGameId)
                : fanduelNbaOdds.events[0];

            setOddsData(activeEvent?.odds ?? []);
        } else if (fanduelNbaOdds?.updated) {
            setOddsData([]);
        }
    }, [nbaSchedules, fanduelNbaOdds, activeGameId]);

    useEffect(() => {
        if (fanduelNbaOdds?.events?.length && draftkingNbaOdds?.events?.length) {
            const mergedOdds = mergeOddsSnapshots(fanduelNbaOdds, draftkingNbaOdds);
            const activeEvent = activeGameId
                ? mergedOdds.events.find(e => e.id === activeGameId)
                : mergedOdds.events[0];
            setOddsData(activeEvent?.odds ?? []);
        }
    }, [activeGameId, fanduelNbaOdds, draftkingNbaOdds]);

    const games = useMemo<GameOption[]>(() => {
        if (!nbaMatchSchedules) return [];
        return buildMergedGameOptions(oddsData, nbaMatchSchedules, activeGameId);
        // }, [nbaMatchSchedules, oddsData, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated, activeGameId]);
    }, [nbaMatchSchedules, oddsData, activeGameId]);

    const todayIso = useMemo(() => new Date().toISOString(), []);
    const visibleGames = useMemo(() => {
        return games.filter(
            (game) => !game.live
        );
        // }, [games, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated]);
    }, [games]);
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

                smoothScrollTo(container, offset, 300)
            }
        }, 100);
    }

    const locked = !currentUser || !canUserEditSlipPicks(slip);

    const activeGame = useMemo(
        () => visibleGames.find((game) => game.id === activeGameId) ?? null,
        // [activeGameId, visibleGames, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated]
        [activeGameId, visibleGames]
    );

    // useEffect(() => {
    //     if (!activeGame?.id || !activeGame.live) return;
    //     const interval = setInterval(() => {
    //         dispatch(
    //             fetchFanduelNBAOddsRequest({
    //                 match_id: activeGame.id,
    //                 is_live: activeGame.live,
    //                 silent: true,
    //             })
    //         );
    //         dispatch(
    //             fetchDraftkingsNBAOddsRequest({
    //                 match_id: activeGame.id,
    //                 is_live: activeGame.live,
    //                 silent: true,
    //             })
    //         );
    //     }, 65 * 1000); // 1 min 05 sec

    //     return () => {
    //         clearInterval(interval);
    //     };
    // }, [activeGame?.id, activeGame?.live, dispatch]);

    // useEffect(() => {
    //     if (!isAnyLiveMatch) return;
    //     const interval = setInterval(() => {
    //         dispatch(fetchNBAScheduleRequest({ is_pick_of_day: true, is_range: false }));
    //     }, 310 * 1000); // 5 min 10 sec

    //     return () => {
    //         clearInterval(interval);
    //     };
    // }, [dispatch, isAnyLiveMatch]);

    const activeMarketMap = useMemo(() => {
        if (!activeGame) return new Map<string, SelectedOdd[]>();
        const markets = TAB_MARKETS[activeTab];
        const term = search.trim().toLowerCase();
        const marketMap = new Map<string, SelectedOdd[]>();
        markets.forEach((market) => marketMap.set(market, []));

        oddsData.forEach((odd) => {
            let bucketKey: string | null = null;
            const altMarket = ALT_MARKET_MAP[odd.market];
            if (altMarket && markets.includes(altMarket)) {
                bucketKey = odd.main ? odd.market : altMarket;
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
                const matchup = game ? matchupLabel(game) : leg.matchup ?? undefined;
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
                        external_pick_key: leg.id,
                        away_team: game?.awayTeam,
                        away_abbr: game?.awayAbbr,
                        home_team: game?.homeTeam,
                        home_abbr: game?.homeAbbr,
                        matchup: matchup ?? undefined,
                        match_time: startTime,
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
    }, [comboLegs, comboOddsValue, comboTierMeta, hasMultipick, slip.isGraded, comboSport, activeGame]);

    const activeDraft = comboDraft ?? localDraft ?? draftPick ?? null;
    const reviewDrafts = useMemo(() => (activeDraft ? [activeDraft] : []), [activeDraft]);
    const hasMultiSelection = hasMultipick;
    const multiSelectionCount = hasMultipick ? parlayLegs.length : reviewDrafts.length;
    const showReviewSheet = Boolean(activeDraft);
    const activeDraftKey = useMemo(() => {
        if (!activeDraft) return "";
        return JSON.stringify({
            summary: activeDraft.summary,
            odds: activeDraft.odds,
            difficultyLabel: activeDraft.difficulty_label,
            points: activeDraft.points,
            selection: "selection" in activeDraft ? activeDraft.selection ?? null : null,
            isCombo: activeDraft.isCombo,
            legs: activeDraft.legs?.map((leg) => ({
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
    }, [activeDraft, activeDraftSelectionKey, setSelectedConfidence]);

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
            useGroupScoring,
            reviewTierDisplayMode,
            reviewTierScoringMode,
        ]
    );

    const handleRemoveSinglePick = () => {
        if (isParlayMode && parlayLegs.length > 0) {
            handleRemoveParlayLeg(parlayLegs[0].id);
            return;
        }
        onDraftPickChange?.(null);
        setSelected(null);
    };

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
                    const legTierPrimary = legTierMeta
                        ? formatTierPrimary(legTierMeta.tier)
                        : "Tier —";
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
            // const nextDraft = buildDraftPick(odd, game);
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

    // const submitSameGameCombo = (groupId: string, action: "post" | "slip") => {
    //     const payload = buildSameGameComboSubmissionPayload(groupId, action);
    //     if (!payload) return;
    //     dispatchPayloads([payload], action);
    // };

    // const submitStraight = (legId: string, action: "post" | "slip") => {
    //     const payload = buildStraightSubmissionPayload(legId, action);
    //     if (!payload) return;
    //     dispatchPayloads([payload], action);
    // };

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
        dispatchPayloads([
            {
                ...activeDraft,
                confidence: action === "post" ? selectedConfidence ?? null : null,
            },
        ], action);
    };

    // const buildParlayLegPayloads = () => {
    //     const payloads: BuiltPickPayload[] = [];
    //     for (const leg of parlayLegs) {
    //         const context = findLegContext(leg);
    //         if (!context) return null;
    //         payloads.push(buildDraftPick(context.odd, context.game));
    //     }
    //     return payloads;
    // };

    // const submitPick = (action: "post" | "slip") => {
    //     if (locked) return;

    //     if (action === "post" && !selectedConfidence) {
    //         setToast({
    //             id: Date.now(),
    //             type: "error",
    //             message: "Select a confidence level to post.",
    //             duration: 3000
    //         });
    //         return;
    //     }

    //     const handler = action === "post"
    //         ? onCreatePostPick ?? onSave
    //         : onPostToSlip ?? onSave;

    //     if (hasMultipick) {
    //         if (action === "post") {
    //             if (!activeDraft) return;
    //             handler({
    //                 ...activeDraft,
    //                 confidence: selectedConfidence ?? activeDraft.confidence ?? null,
    //             });
    //             resetAfterPost();
    //             return;
    //         }

    //         const payloads = buildParlayLegPayloads();
    //         if (!payloads || payloads.length === 0) {
    //             setToast({
    //                 id: Date.now(),
    //                 type: "error",
    //                 message: "Couldn't build your picks. Please try again.",
    //                 duration: 3000
    //             });
    //             return;
    //         }

    //         if (slip.pick_limit !== "unlimited") {
    //             const existingCount = picks.filter(
    //                 (entry) => entry.slip_id === slip.id && entry.user_id === currentUser.userId
    //             ).length;
    //             const isEditing =
    //                 Boolean(
    //                     initialPick &&
    //                     initialPick.slip_id === slip.id &&
    //                     initialPick.user_id === currentUser.userId
    //                 );
    //             const adjustedCount = isEditing
    //                 ? Math.max(0, existingCount - 1)
    //                 : existingCount;
    //             if (adjustedCount + payloads.length > slip.pick_limit) {
    //                 setToast({
    //                     id: Date.now(),
    //                     type: "error",
    //                     message: "Pick limit reached for this slip.",
    //                     duration: 3000
    //                 });

    //                 return;
    //             }
    //         }

    //         payloads.forEach((payload) => {
    //             handler({
    //                 ...payload,
    //                 confidence: selectedConfidence ?? payload.confidence ?? null,
    //             });
    //         });
    //         resetAfterPost();
    //         return;
    //     }
    //     if (!activeDraft) return;

    //     handler({
    //         ...activeDraft,
    //         confidence:
    //             action === "post"
    //                 ? selectedConfidence ?? activeDraft.confidence ?? null
    //                 : null,
    //     });
    //     resetAfterPost();
    // };

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
            "min-w-[88px] h-[44px] shrink-0 rounded-md border bg-black/70 px-3 text-sm font-semibold transition sm:min-w-[104px] sm:h-[52px] sm:px-4 flex items-center justify-center",
            selected,
            muted
        );

    const tableOddsBoxClasses = (selected?: boolean, muted?: boolean) =>
        buildOddsBoxClasses(
            "h-[40px] w-[var(--table-chip-width,60px)] shrink-0 whitespace-nowrap rounded-md border bg-black/70 px-1 text-[11px] font-semibold tabular-nums transition sm:h-[52px] sm:px-3 sm:text-sm flex items-center justify-center",
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
                    <div className="text-center">Spread</div>
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
                        <div className={STICKY_COLUMN_HEADER_CLASSES}>
                            {headerLabel}
                        </div>
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

    const renderOddCards = (odds: SelectedOdd[]) => {
        if (!activeGame) return null;
        const rows: SimpleMarketRow[] = odds.map(({ odd }) => {
            const baseLabel = odd.player?.name ?? odd.selection?.name ?? odd.name ?? "Selection";
            const side = odd.selection?.side;
            const line = odd.selection?.line;
            const isPlayer = Boolean(odd.player);
            const teamLabel = odd.player ? playerTeamLabel(odd.player, activeGame) : "";
            const subtitle = isPlayer
                ? teamLabel || matchupLabel(activeGame)
                : matchupLabel(activeGame);
            const label = baseLabel;
            const lineLabel =
                line !== undefined
                    ? `${side ? `${side[0]?.toUpperCase()} ` : ""}${line}`.trim()
                    : undefined;
            return {
                id: odd.id,
                label,
                sublabel: subtitle,
                odd,
                lineLabel,
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
        className = "mt-4 -mx-5 sm:-mx-6"
    ) => {
        if (!activeGame) return null;
        if (rows.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No main lines available for this market yet.
                </div>
            );
        }
        return (
            <div className={className}>
                <div className="text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                    <div
                        className="grid gap-2 border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:px-6"
                        style={{
                            gridTemplateColumns:
                                "minmax(0,1fr) repeat(2, var(--table-chip-width))",
                        }}
                    >
                        <div className="pl-0 pr-3 py-2">Player</div>
                        <div className="px-3 py-2 text-center">Over line</div>
                        <div className="px-3 py-2 text-center">Under line</div>
                    </div>
                    {rows.map((row, rowIndex) => {
                        const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
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
                                {renderPointButton(row.over, "O", overLine)}
                                {renderPointButton(row.under, "U", underLine)}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderScrollablePropTable = (
        table: { lines: number[]; rows: PointsTableRow[] },
        market: string,
        showPointsSuffix: boolean
    ) => {
        if (!activeGame) return null;
        if (table.lines.length === 0 || table.rows.length === 0) return null;
        return (
            <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                <div className="min-w-full w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                    <div
                        className="grid gap-2 text-xs uppercase tracking-wide text-gray-400"
                        style={{
                            gridTemplateColumns: table.lines.length
                                ? `minmax(160px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                : "minmax(160px,1fr)",
                        }}
                    >
                        <div className={`${SCROLLER_STICKY_COLUMN_HEADER_CLASSES} sm:min-w-[190px]`}>
                            Scroll right to see more
                        </div>
                        {table.lines.map((line) => {
                            const headerLabel = showPointsSuffix
                                ? `${formatLineLabel(line)} pts`
                                : formatLineLabel(line);
                            return (
                                <div key={`${market}-${line}`} className="px-3 py-2 text-center whitespace-nowrap">
                                    {headerLabel}
                                </div>
                            );
                        })}
                    </div>
                    {table.rows.map((row, rowIndex) => {
                        const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                        return (
                            <div
                                key={`${market}-${row.player.id}`}
                                className={`grid gap-2 ${rowBand}`}
                                style={{
                                    gridTemplateColumns: table.lines.length
                                        ? `minmax(160px,1fr) repeat(${table.lines.length}, var(--table-chip-width))`
                                        : "minmax(160px,1fr)",
                                }}
                            >
                                <div
                                    className={`${scrollerStickyColumnRowClasses(
                                        rowIndex % 2 === 1
                                    )} sm:min-w-[190px]`}
                                >
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
        );
    };

    const renderYesNoTable = (
        rows: ReturnType<typeof buildYesNoRows>,
        className = "mt-4 -mx-5 sm:-mx-6"
    ) => {
        if (!activeGame) return null;
        if (rows.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No lines available for this market yet.
                </div>
            );
        }
        return (
            <div className={className}>
                <div className="text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                    <div
                        className="grid border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:px-6"
                        style={{
                            gridTemplateColumns:
                                "minmax(0,1fr) var(--table-chip-width)",
                        }}
                    >
                        <div className={STICKY_COLUMN_HEADER_CLASSES}>
                            Player
                        </div>
                        <div className="px-3 py-2 text-center">Odds</div>
                    </div>
                    {rows.map((row, rowIndex) => {
                        const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                        const isSelected = isOddSelected(row.odd);
                        return (
                            <button
                                key={row.player.id}
                                type="button"
                                onClick={() => handleSelectOdd(row.odd, activeGame)}
                                disabled={!row.odd || locked}
                                className={`grid w-full items-center border-b border-white/5 px-5 text-left transition sm:px-6 ${rowBand} ${isSelected
                                    ? "border-emerald-300/60 bg-emerald-500/10"
                                    : "hover:bg-white/[0.02]"
                                    } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                style={{
                                    gridTemplateColumns:
                                        "minmax(0,1fr) var(--table-chip-width)",
                                }}
                            >
                                <div className={stickyColumnRowClasses(rowIndex % 2 === 1)}>
                                    <p className="text-sm font-semibold text-white">{row.player.name}</p>
                                    <p className="mt-1 text-xs text-gray-400">{row.teamLabel}</p>
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

    const renderAlternateSpreadSection = (
        data: { lines: number[]; map: Map<number, SpreadLineEntry> },
        activeLine: number | null,
        onSelectLine: (line: number) => void,
        options?: { className?: string; emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (data.lines.length <= 1) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No alternate spreads available for this matchup yet."}
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
        const homeLineLabel = formatLineValue(homeLine ?? homeOdd?.selection?.line);
        const awayLineLabel = formatLineValue(awayLine ?? awayOdd?.selection?.line);
        const rows: SimpleMarketRow[] = [
            {
                id: `${activeGame.id}-alt-spread-away`,
                label: awayLineLabel !== "-" ? `${activeGame.awayTeam} ${awayLineLabel}` : activeGame.awayTeam,
                sublabel: activeGame.awayAbbr,
                odd: awayOdd,
            },
            {
                id: `${activeGame.id}-alt-spread-home`,
                label: homeLineLabel !== "-" ? `${activeGame.homeTeam} ${homeLineLabel}` : activeGame.homeTeam,
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
        if (data.lines.length <= 1) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No alternate totals available for this matchup yet."}
                </div>
            );
        }
        const resolvedLine = resolveLineSelection(data.lines, activeLine);
        const entry = resolvedLine !== null ? data.map.get(resolvedLine) : undefined;
        const overOdd = entry?.over;
        const underOdd = entry?.under;
        const overLineLabel = formatNumberLine(
            overOdd?.selection?.line ?? resolvedLine ?? undefined
        );
        const underLineLabel = formatNumberLine(
            underOdd?.selection?.line ?? resolvedLine ?? undefined
        );
        const rows: SimpleMarketRow[] = [
            {
                id: `${activeGame.id}-alt-total-over`,
                label: overLineLabel !== "-" ? `Over ${overLineLabel}` : "Over",
                odd: overOdd,
            },
            {
                id: `${activeGame.id}-alt-total-under`,
                label: underLineLabel !== "-" ? `Under ${underLineLabel}` : "Under",
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
            odds: activeDraft.odds,
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
            sheetSummary={
                !hasMultiSelection && confirmationVariant === "post"
                    ? "1 pick selected"
                    : sheetSummary
            }
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
        return buildMainLineOddsForMarkets(activeGame, {
            spread: "Point Spread",
            money: "Moneyline",
            total: "Total Points",
        });
        // }, [activeGame, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated]);
    }, [activeGame]);

    const quarterSections = useMemo(() => {
        if (!activeGame) return [];
        const quarters = [
            { key: "quarters-1st", title: "1st Quarter", shortLabel: "Q1", prefix: "1st Quarter" },
            { key: "quarters-2nd", title: "2nd Quarter", shortLabel: "Q2", prefix: "2nd Quarter" },
            { key: "quarters-3rd", title: "3rd Quarter", shortLabel: "Q3", prefix: "3rd Quarter" },
            { key: "quarters-4th", title: "4th Quarter", shortLabel: "Q4", prefix: "4th Quarter" },
        ];
        return quarters.map((quarter) => ({
            key: quarter.key,
            title: quarter.title,
            shortLabel: quarter.shortLabel,
            lines: buildMainLineOddsForMarkets(activeGame, {
                spread: `${quarter.prefix} Point Spread`,
                money: `${quarter.prefix} Moneyline`,
                total: `${quarter.prefix} Total Points`,
            }),
            altSpread: buildAltSpreadLineData(
                activeGame.odds.filter(
                    (odd) => odd.market === `${quarter.prefix} Point Spread`
                ),
                activeGame
            ),
            altTotal: buildAltTotalLineData(
                activeGame.odds.filter(
                    (odd) => odd.market === `${quarter.prefix} Total Points`
                )
            ),
        }));
        // }, [activeGame, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated]);
    }, [activeGame]);

    const halfSections = useMemo(() => {
        if (!activeGame) return [];
        const halves = [
            { key: "halves-1st", title: "1st Half", shortLabel: "H1", prefix: "1st Half" },
            { key: "halves-2nd", title: "2nd Half", shortLabel: "H2", prefix: "2nd Half" },
        ];
        return halves.map((half) => ({
            key: half.key,
            title: half.title,
            shortLabel: half.shortLabel,
            lines: buildMainLineOddsForMarkets(activeGame, {
                spread: `${half.prefix} Point Spread`,
                money: `${half.prefix} Moneyline`,
                total: `${half.prefix} Total Points`,
            }),
            spread: buildAltSpreadLineData(
                activeGame.odds.filter(
                    (odd) => odd.market === `${half.prefix} Point Spread`
                ),
                activeGame
            ),
            total: buildAltTotalLineData(
                activeGame.odds.filter(
                    (odd) => odd.market === `${half.prefix} Total Points`
                )
            ),
        }));
        // }, [activeGame, fanduelNbaOdds?.updated, draftkingNbaOdds?.updated]);
    }, [activeGame]);

    const halfDropdownSections = useMemo(
        () =>
            halfSections.flatMap((section) => [
                {
                    key: `${section.key}-main`,
                    title: section.title,
                    type: "main" as const,
                    section,
                },
                {
                    key: `${section.key}-spread`,
                    title: `Alternate Spread - ${section.shortLabel}`,
                    type: "spread" as const,
                    section,
                },
                {
                    key: `${section.key}-total`,
                    title: `Alternate Total - ${section.shortLabel}`,
                    type: "total" as const,
                    section,
                },
            ]),
        [halfSections]
    );

    const quarterDropdownSections = useMemo(
        () =>
            quarterSections.flatMap((section) => [
                {
                    key: `${section.key}-main`,
                    title: section.title,
                    type: "main" as const,
                    section,
                },
                {
                    key: `${section.key}-alt-spread`,
                    title: `Alternate Spread - ${section.shortLabel}`,
                    type: "alt-spread" as const,
                    section,
                },
                {
                    key: `${section.key}-alt-total`,
                    title: `Alternate Total - ${section.shortLabel}`,
                    type: "alt-total" as const,
                    section,
                },
            ]),
        [quarterSections]
    );

    const hasQuarterLines = useMemo(
        () =>
            quarterSections.some(
                (section) =>
                    Boolean(
                        section.lines.spreadAway ||
                        section.lines.spreadHome ||
                        section.lines.moneyAway ||
                        section.lines.moneyHome ||
                        section.lines.totalOver ||
                        section.lines.totalUnder
                    ) ||
                    section.altSpread.lines.length > 0 ||
                    section.altTotal.lines.length > 0
            ),
        [quarterSections]
    );

    const hasHalfLines = useMemo(
        () =>
            halfSections.some(
                (section) =>
                    Boolean(
                        section.lines.spreadAway ||
                        section.lines.spreadHome ||
                        section.lines.moneyAway ||
                        section.lines.moneyHome ||
                        section.lines.totalOver ||
                        section.lines.totalUnder
                    ) ||
                    section.spread.lines.length > 0 ||
                    section.total.lines.length > 0
            ),
        [halfSections]
    );

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

    const spreadOddsAll = useMemo(
        () =>
            oddsData
                ? oddsData.filter((odd) => odd.market === "Point Spread")
                : [],
        [oddsData]
    );

    const totalOddsAll = useMemo(
        () =>
            oddsData
                ? oddsData.filter((odd) => odd.market === "Total Points")
                : [],
        [oddsData]
    );

    const altSpreadLineData = useMemo(
        () =>
            activeGame
                ? buildAltSpreadLineData(spreadOddsAll, activeGame)
                : { lines: [] as number[], map: new Map<number, SpreadLineEntry>() },
        [activeGame, spreadOddsAll]
    );

    const altTotalLineData = useMemo(
        () => buildAltTotalLineData(totalOddsAll),
        [totalOddsAll]
    );

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
            : activeTab === "QUARTERS"
                ? hasQuarterLines
                : activeTab === "HALVES"
                    ? hasHalfLines
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

    useEffect(() => {
        if (!activeGame) {
            setQuarterAltSpreadLines({});
            setQuarterAltTotalLines({});
            return;
        }
        setQuarterAltSpreadLines((prev) => {
            let changed = false;
            const next = { ...prev };
            quarterSections.forEach((section) => {
                const preferred =
                    section.lines.spreadHome?.selection?.line ??
                    section.lines.spreadAway?.selection?.line;
                const resolved = resolveLineSelection(
                    section.altSpread.lines,
                    prev[section.key],
                    preferred
                );
                if (resolved === null) {
                    if (prev[section.key] !== null) {
                        next[section.key] = null;
                        changed = true;
                    }
                    return;
                }
                if (prev[section.key] !== resolved) {
                    next[section.key] = resolved;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
        setQuarterAltTotalLines((prev) => {
            let changed = false;
            const next = { ...prev };
            quarterSections.forEach((section) => {
                const preferred = section.lines.totalLine;
                const resolved = resolveLineSelection(
                    section.altTotal.lines,
                    prev[section.key],
                    preferred
                );
                if (resolved === null) {
                    if (prev[section.key] !== null) {
                        next[section.key] = null;
                        changed = true;
                    }
                    return;
                }
                if (prev[section.key] !== resolved) {
                    next[section.key] = resolved;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [activeGame, quarterSections]);

    useEffect(() => {
        if (!activeGame) {
            setHalfSpreadLines({});
            setHalfTotalLines({});
            return;
        }
        setHalfSpreadLines((prev) => {
            let changed = false;
            const next = { ...prev };
            halfSections.forEach((section) => {
                const preferred =
                    section.lines.spreadHome?.selection?.line ??
                    section.lines.spreadAway?.selection?.line;
                const preferredLine = resolveLineSelection(
                    section.spread.lines,
                    prev[section.key],
                    preferred
                );
                if (preferredLine === null) {
                    if (prev[section.key] !== null) {
                        next[section.key] = null;
                        changed = true;
                    }
                    return;
                }
                if (prev[section.key] !== preferredLine) {
                    next[section.key] = preferredLine;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
        setHalfTotalLines((prev) => {
            let changed = false;
            const next = { ...prev };
            halfSections.forEach((section) => {
                const preferredLine = resolveLineSelection(
                    section.total.lines,
                    prev[section.key],
                    section.lines.totalLine
                );
                if (preferredLine === null) {
                    if (prev[section.key] !== null) {
                        next[section.key] = null;
                        changed = true;
                    }
                    return;
                }
                if (prev[section.key] !== preferredLine) {
                    next[section.key] = preferredLine;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [activeGame, halfSections]);

    const handleSelectGame = (game: GameOption) => {
        if (locked) return;
        // setSelectedMatch(game);
        setActiveGameId(game.id);
        if (game.id) {
            dispatch(fetchFanduelNBAOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
            dispatch(fetchDraftkingsNBAOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
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
            className={`space-y-4 ${activeGame ? "matchup-detail" : ""}`}
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
                                        "Point Spread",
                                        game.awayTeam
                                    );
                                    const spreadHome = findMainTeamOdd(
                                        game,
                                        "Point Spread",
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
                                                            {isMobile ? game.awayAbbr : game.awayTeam}
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
                                                            {isMobile ? game.homeAbbr : game.homeTeam}
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
                            <p className="flex text-xs text-gray-500 gap-2">
                                <span>Updated {formatDateTime(nbaSchedules?.updated)}</span>
                                {/* {activeGame.live && (
                                    <span className="flex items-center gap-1 text-red-500 font-medium">
                                        <span className="relative flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
                                        </span>
                                        Live
                                    </span>
                                )} */}
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
                        <div
                            id="game-prop-details-tabs-container"
                            className="scrollbar-hide -mx-5 mt-4 flex gap-3 overflow-x-auto border-b border-white/10 px-5 pb-2 sm:mx-0 sm:px-0"
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

                            {(() => {
                                const spreadPreferred =
                                    mainLineOdds?.spreadHome?.selection?.line ??
                                    mainLineOdds?.spreadAway?.selection?.line;
                                const spreadActiveLine = resolveLineSelection(
                                    altSpreadLineData.lines,
                                    altSpreadLine,
                                    spreadPreferred
                                );
                                const totalActiveLine = resolveLineSelection(
                                    altTotalLineData.lines,
                                    altTotalLine,
                                    mainLineOdds?.totalLine
                                );
                                return [
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
                                                        spreadActiveLine,
                                                        setAltSpreadLine
                                                    )
                                                    : section.key === "game-lines-alt-total"
                                                        ? renderAlternateTotalSection(
                                                            altTotalLineData,
                                                            totalActiveLine,
                                                            setAltTotalLine
                                                        )
                                                        : renderMainLineOddCards(section.odds, section.title))}
                                        </section>
                                    );
                                });
                            })()
                            }
                        </div>
                    ) : activeTab === "QUARTERS" ? (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            {quarterDropdownSections.map((item, index) => {
                                const { section } = item;
                                const collapsed = isSectionCollapsed(item.key, index === 0);
                                const spreadPreferred =
                                    section.lines.spreadHome?.selection?.line ??
                                    section.lines.spreadAway?.selection?.line;
                                const totalPreferred = section.lines.totalLine;
                                const spreadActiveLine = resolveLineSelection(
                                    section.altSpread.lines,
                                    quarterAltSpreadLines[section.key],
                                    spreadPreferred
                                );
                                const totalActiveLine = resolveLineSelection(
                                    section.altTotal.lines,
                                    quarterAltTotalLines[section.key],
                                    totalPreferred
                                );
                                return (
                                    <section key={item.key} className="px-5 py-6 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(item.key, index === 0)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between pb-0 text-left"
                                        >
                                            <span className="text-sm font-semibold text-white">
                                                {item.title}
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
                                            (item.type === "main" ? (
                                                renderMainLinesGrid(section.lines)
                                            ) : item.type === "alt-spread" ? (
                                                renderAlternateSpreadSection(
                                                    section.altSpread,
                                                    spreadActiveLine,
                                                    (line) =>
                                                        setQuarterAltSpreadLines((prev) => ({
                                                            ...prev,
                                                            [section.key]: line,
                                                        })),
                                                    {
                                                        className: "mt-3 space-y-3",
                                                        emptyMessage:
                                                            "No alternate spreads available for this quarter yet.",
                                                    }
                                                )
                                            ) : (
                                                renderAlternateTotalSection(
                                                    section.altTotal,
                                                    totalActiveLine,
                                                    (line) =>
                                                        setQuarterAltTotalLines((prev) => ({
                                                            ...prev,
                                                            [section.key]: line,
                                                        })),
                                                    {
                                                        className: "mt-3 space-y-3",
                                                        emptyMessage:
                                                            "No alternate totals available for this quarter yet.",
                                                    }
                                                )
                                            ))}
                                    </section>
                                );
                            })}
                        </div>
                    ) : activeTab === "HALVES" ? (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            {halfDropdownSections.map((item, index) => {
                                const { section } = item;
                                const collapsed = isSectionCollapsed(item.key, index === 0);
                                const spreadPreferred =
                                    section.lines.spreadHome?.selection?.line ??
                                    section.lines.spreadAway?.selection?.line;
                                const spreadActiveLine = resolveLineSelection(
                                    section.spread.lines,
                                    halfSpreadLines[section.key],
                                    spreadPreferred
                                );
                                const totalActiveLine = resolveLineSelection(
                                    section.total.lines,
                                    halfTotalLines[section.key],
                                    section.lines.totalLine
                                );
                                return (
                                    <section key={item.key} className="px-5 py-6 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(item.key, index === 0)}
                                            aria-expanded={!collapsed}
                                            className="flex w-full items-center justify-between pb-0 text-left"
                                        >
                                            <span className="text-sm font-semibold text-white">
                                                {item.title}
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
                                            (item.type === "main" ? (
                                                renderMainLinesGrid(section.lines)
                                            ) : item.type === "spread" ? (
                                                renderAlternateSpreadSection(
                                                    section.spread,
                                                    spreadActiveLine,
                                                    (line) =>
                                                        setHalfSpreadLines((prev) => ({
                                                            ...prev,
                                                            [section.key]: line,
                                                        })),
                                                    {
                                                        className: "mt-3 space-y-3",
                                                        emptyMessage:
                                                            "No alternate spreads available for this half yet.",
                                                    }
                                                )
                                            ) : (
                                                renderAlternateTotalSection(
                                                    section.total,
                                                    totalActiveLine,
                                                    (line) =>
                                                        setHalfTotalLines((prev) => ({
                                                            ...prev,
                                                            [section.key]: line,
                                                        })),
                                                    {
                                                        className: "mt-3 space-y-3",
                                                        emptyMessage:
                                                            "No alternate totals available for this half yet.",
                                                    }
                                                )
                                            ))}
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            {TAB_MARKETS[activeTab].map((market, index) => {
                                const odds = activeMarketMap.get(market) ?? [];
                                const showEmptyMarket = ALT_CATEGORY_MARKETS.has(market);
                                if (!activeGame) return null;
                                if (odds.length === 0 && !showEmptyMarket) return null;

                                const isAltPlayerPoints = market === ALT_POINTS_MARKET;
                                const isTableMarket = isAltPlayerPoints || TABLE_MARKETS.has(market);
                                const isMainOverUnderMarket = MAIN_OVER_UNDER_MARKETS.has(market);
                                const isComboTab = activeTab === "PLAYER_COMBOS";
                                const isComboAltMarket = isComboTab && COMBO_ALT_MARKETS.has(market);
                                const comboBaseMarket = isComboAltMarket
                                    ? COMBO_ALT_TO_MAIN[market]
                                    : market;
                                const isComboOverUnderMarket =
                                    isComboTab && COMBO_OVER_UNDER_MARKETS.has(comboBaseMarket);
                                const isComboYesNoMarket =
                                    isComboTab && COMBO_YES_NO_MARKETS.has(market);
                                const sides = new Set(
                                    odds
                                        .map((item) => item.odd.selection?.side?.toLowerCase())
                                        .filter(Boolean) as string[]
                                );
                                const hasOver = sides.has("over");
                                // const hasUnder = sides.has("under");
                                const defaultSide = hasOver ? "Over" : "Under";
                                const activeSide = defaultSide;
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
                                const mainPointsRows = isMainOverUnderMarket
                                    ? buildMainPointsRows(odds, activeGame)
                                    : [];
                                const comboMainRows =
                                    isComboOverUnderMarket && !isComboAltMarket
                                        ? buildMainPointsRows(odds, activeGame)
                                        : [];
                                const comboAltOdds = isComboAltMarket
                                    ? odds.filter(
                                        ({ odd }) => odd.selection?.side?.toLowerCase() === "over"
                                    )
                                    : [];
                                const comboAltTable = isComboAltMarket
                                    ? buildPointsTable(comboAltOdds, activeGame, "Over")
                                    : { lines: [], rows: [] };
                                const showComboAltTable =
                                    isComboAltMarket &&
                                    comboAltTable.lines.length > 0 &&
                                    comboAltTable.rows.length > 0;
                                const comboYesNoRows = isComboYesNoMarket
                                    ? buildYesNoRows(odds, activeGame)
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

                                        {!collapsed && (
                                            odds.length === 0 ? (
                                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                                    No alternate lines available for this market yet.
                                                </div>
                                            ) : (
                                                <>
                                                    {isComboOverUnderMarket && !isComboAltMarket ? (
                                                        renderMainOverUnderTable(comboMainRows)
                                                    ) : isComboAltMarket ? (
                                                        showComboAltTable ? (
                                                            renderScrollablePropTable(comboAltTable, market, false)
                                                        ) : (
                                                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                                                No alternate lines available for this market yet.
                                                            </div>
                                                        )
                                                    ) : isComboYesNoMarket ? (
                                                        renderYesNoTable(comboYesNoRows)
                                                    ) : isMainOverUnderMarket ? (
                                                        renderMainOverUnderTable(mainPointsRows)
                                                    ) : showTable ? (
                                                        renderScrollablePropTable(table, market, isAltPlayerPoints)
                                                    ) : isTableMarket ? (
                                                        <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                                                            <div className="min-w-full w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                                                <div
                                                                    className="grid text-xs uppercase tracking-wide text-gray-400"
                                                                    style={{
                                                                        gridTemplateColumns:
                                                                            "minmax(0,1fr) var(--table-chip-width) var(--table-chip-width)",
                                                                    }}
                                                                >
                                                                    <div className={SCROLLER_STICKY_COLUMN_HEADER_CLASSES}>
                                                                        Player
                                                                    </div>
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
                                                        renderOddCards(odds.map((odd) => odd))
                                                    )}
                                                </>
                                            )
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {renderReviewSheet()}
        </div >
    );
};

export default NbaPickBuilder;
