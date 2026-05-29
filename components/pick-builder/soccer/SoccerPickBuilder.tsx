"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PickReviewSheet,
    type ReviewSheetPostSelection,
    type SameGameComboReviewGroup,
} from "@/components/pick-builder/core/PickReviewSheet";
import type {
    CachedReviewData,
    ReviewSheetState,
} from "@/components/pick-builder/core/reviewSheetState";
import { canUserEditSlipPicks, slipShowsConflictWarnings } from "@/lib/slips/state";
import { formatDateTime, isPast } from "@/lib/utils/date";
import {
    DEFAULT_ELIGIBLE_WINDOW_DAYS,
    filterEligibleGames,
    filterUpcomingWindowGames,
} from "@/lib/utils/games";
import {
    normalizeOddToLeg,
    validateAddLeg,
    type ParlayLeg,
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
import {
    formatPickMetaLine,
    withMatchupDescription,
} from "@/lib/utils/pickDescription";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";
import { BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, League, LeagueObject, OddsData, OddsEvent, OddsObject, Pick, PickLeg, PickSelectionMeta, RootState, Slip, SoccerOdds, SoccerSchedules, SoccerSchedulesWithOdds, TierIndex } from "@/lib/interfaces/interfaces";
import { useIsMobile } from "@/lib/utils/helpers";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@/lib/state/ToastContext";
import { fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest, fetchDraftkingsSoccerGermanyBundesligaOddsRequest, fetchFanduelSoccerEnglandPremierLeagueOddsRequest, fetchFanduelSoccerGermanyBundesligaOddsRequest, fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest, fetchSoccerEnglandPremierLeagueScheduleRequest, fetchSoccerGermanyBundesligaScheduleByTimezoneRequest, fetchSoccerGermanyBundesligaScheduleRequest, soccerEnglandPremierLeaguePickValidateRequest, soccerGermanyBundesligaPickValidateRequest } from "@/lib/redux/slices/soccerSlice";
import { ODDS_BRACKETS } from "@/lib/constants";
import { quoteSlipOdds } from "@/lib/sgp/comboPricing";
import { analyzeSlipPayloadAgainstPicks, getSlipConflictMessage, getSlipConflictWarningMessages } from "@/lib/slips/pickConflicts";
import { House } from "lucide-react";
import SoccerPickBuilderSkeleton from "./skeletons/SoccerPickBuilderSkeleton";
import SoccerMatchupDetailSkeleton from "./skeletons/SoccerMatchupDetailSkeleton";

type OddsBlazeTeam = {
    id: string;
    name: string;
    abbreviation?: string;
};

type OddsBlazePlayer = {
    id: string;
    name: string;
    position?: string;
    number?: number | string | null;
    team: OddsBlazeTeam;
};

type OddsBlazeSelection = {
    name?: string;
    side?: string;
    line?: number;
};

type OddsBlazeEvent = {
    id: string;
    teams: {
        away: OddsBlazeTeam;
        home: OddsBlazeTeam;
    };
    date: string;
    live: boolean;
    odds: OddsObject[];
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

type SoccerSnapshotWithOdds = {
    updated: string;
    league: LeagueObject;
    events: SoccerSchedulesWithOdds[];
};

type SoccerSnapshot = {
    updated: string;
    league: LeagueObject;
    events: SoccerSchedules[];
};


type GameOption = {
    id: string;
    leagueId: string;
    leagueName: string;
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

type SelectedOddState = {
    odd: OddsObject;
    game: GameOption;
};

type TotalLineEntry = {
    over?: OddsObject;
    under?: OddsObject;
};

type SpreadLineEntry = {
    home?: OddsObject;
    away?: OddsObject;
};

type SimpleMarketRow = {
    id: string;
    title: string;
    subtitle?: string;
    odd?: OddsObject;
};

type StandardMarketSection = {
    key: string;
    title: string;
    kind: "standard";
    headerLabel: string;
    rows: SimpleMarketRow[];
};

type TotalMarketSection = {
    key: string;
    title: string;
    kind: "total";
    lineData: { lines: number[]; map: Map<number, TotalLineEntry> };
    emptyMessage: string;
};

type SpreadMarketSection = {
    key: string;
    title: string;
    kind: "spread";
    lineData: { lines: number[]; map: Map<number, SpreadLineEntry> };
    emptyMessage?: string;
};

type MarketSection =
    | StandardMarketSection
    | TotalMarketSection
    | SpreadMarketSection;

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

const LEAGUE_LABELS: Record<string, string> = {
    "England Premier League": "Premier League",
    "Germany Bundesliga": "Bundesliga",
};

const SOCCER_LEAGUE_ORDER = [
    "England Premier League",
    "Germany Bundesliga",
] as const;

const MARKET_PREVIEW_LIMIT = 8;

const STICKY_COLUMN_BASE_CLASSES =
    "relative sticky left-0 before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-5 before:bg-[#030303] before:content-[''] after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-8 after:bg-gradient-to-r after:to-transparent after:content-[''] sm:before:w-6 sm:after:w-10";

const STICKY_COLUMN_HEADER_CLASSES = `${STICKY_COLUMN_BASE_CLASSES} z-30 pl-0 pr-3 py-2 bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.72)_100%)] after:from-black/45`;

const stickyColumnRowClasses = (banded: boolean) =>
    `${STICKY_COLUMN_BASE_CLASSES} z-20 pl-0 pr-3 py-3 ${banded
        ? "bg-[linear-gradient(90deg,rgba(8,8,8,0.98)_0%,rgba(8,8,8,0.95)_76%,rgba(8,8,8,0.74)_100%)]"
        : "bg-[linear-gradient(90deg,rgba(3,3,3,0.96)_0%,rgba(3,3,3,0.94)_76%,rgba(3,3,3,0.68)_100%)]"
    } after:from-black/40`;

const TAB_ORDER = [
    "GAME_LINES",
    "TEAM_TOTALS",
    "PLAYER_PROPS",
    "FIRST_HALF",
    "CORRECT_SCORE",
] as const;

type TabId = (typeof TAB_ORDER)[number];

const TAB_LABELS: Record<TabId, string> = {
    GAME_LINES: "Game lines",
    TEAM_TOTALS: "Team totals",
    PLAYER_PROPS: "Player props",
    FIRST_HALF: "1st half",
    CORRECT_SCORE: "Correct score",
};

const TAB_MARKETS: Record<TabId, string[]> = {
    GAME_LINES: [
        "Moneyline 3-Way",
        "Draw No Bet",
        "Double Chance",
        "Both Teams To Score",
        "Handicap",
        "Total Goals",
        "First Team To Score 3-Way",
        "Last Team To Score 3-Way",
        "Total Corners",
        "Total Corners Odd/Even",
    ],
    TEAM_TOTALS: ["Team Total Goals"],
    PLAYER_PROPS: ["Player Goals", "Player Shots", "Player Shots On Target"],
    FIRST_HALF: [
        "1st Half Moneyline 3-Way",
        "1st Half Both Teams To Score",
        "1st Half Total Goals",
        "1st Half Correct Score",
    ],
    CORRECT_SCORE: ["Correct Score"],
};

const tabForOdd = (odd: OddsObject): TabId => {
    const entries = Object.entries(TAB_MARKETS) as [TabId, string[]][];
    for (const [tab, markets] of entries) {
        if (markets.includes(odd.market)) return tab;
    }
    return "GAME_LINES";
};

const eventKey = (event: OddsBlazeEvent) =>
    `${event.date}|${event.teams.away.id}|${event.teams.home.id}`;

const normalizeMergeToken = (value?: string | number | null) => {
    if (value === undefined || value === null) return "";
    return `${value}`.trim().toLowerCase().replace(/\s+/g, " ");
};

const oddKey = (odd: OddsObject) =>
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

const mergeOddsSnapshots = (
    ...inputSnapshots: (SoccerOdds | null | undefined)[]
): SoccerOdds => {
    const snapshots = inputSnapshots.filter((s): s is SoccerOdds => !!s);
    const baseSnapshot = snapshots[0];

    if (!baseSnapshot) {
        return {
            updated: "",
            league: { id: "soccer", name: "Soccer", sport: "Soccer" },
            sportsbook: { id: "multi", name: "Multiple" },
            events: [],
        };
    }

    const mergedEvents = new Map<string, OddsData>();

    snapshots.forEach((snapshot) => {
        snapshot.events.forEach((event) => {
            // const key = eventKey(event);
            const key = event.id;
            const existing = mergedEvents.get(key);
            if (!existing) {
                mergedEvents.set(key, {
                    ...event,
                    id: key,
                    odds: dedupeOdds([...event.odds]),
                });
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
        sportsbook: baseSnapshot.sportsbook,
        events: [...mergedEvents.values()],
    };
};

const mergeSoccerSchedules = (
    scheduledWithOdds: SoccerSnapshotWithOdds | null | undefined,
    allSchedules: SoccerSnapshot | null | undefined
): SoccerOdds => {
    const defaultSnapshot: SoccerOdds = {
        updated: "",
        league: { id: "soccer", name: "Soccer", sport: "Soccer" },
        sportsbook: { id: "multi", name: "Multiple" },
        events: [],
    };

    if (!scheduledWithOdds && !allSchedules) return defaultSnapshot;

    if (!scheduledWithOdds && allSchedules) {
        return {
            updated: allSchedules.updated,
            league: allSchedules.league,
            sportsbook: { id: "multi", name: "Multiple" },
            events: allSchedules.events.map((event) => ({
                id: event.id,
                teams: event.teams,
                date: event.date,
                live: event.live,
                odds: [],
            })),
        };
    }

    if (!allSchedules && scheduledWithOdds) {
        return {
            updated: scheduledWithOdds.updated,
            league: scheduledWithOdds.league,
            sportsbook: { id: "multi", name: "Multiple" },
            events: scheduledWithOdds.events.map((event) => ({
                id: event.id,
                teams: event.teams,
                date: event.date,
                live: event.live,
                odds: event.odds,
            })),
        };
    }

    // Both exist
    const mergedMap = new Map<string, OddsData>();

    // Rule 1: Use Matches with Odds First
    scheduledWithOdds!.events.forEach((match) => {
        mergedMap.set(match.id, {
            id: match.id,
            teams: match.teams,
            date: match.date,
            live: match.live,
            odds: match.odds,
        });
    });

    // Rule 2: Add Missing Matches
    allSchedules!.events.forEach((match) => {
        if (!mergedMap.has(match.id)) {
            mergedMap.set(match.id, {
                id: match.id,
                teams: match.teams,
                date: match.date,
                live: match.live,
                odds: [], // Set odds: []
            });
        }
    });

    return {
        updated: scheduledWithOdds!.updated,
        league: scheduledWithOdds!.league,
        sportsbook: { id: "multi", name: "Multiple" },
        events: Array.from(mergedMap.values()),
    };
};

const tierMetaFromIndex = (tier?: TierIndex) =>
    typeof tier === "number" ? ODDS_BRACKETS[tier - 1] : undefined;

const tierNameFromIndex = (tier?: TierIndex) =>
    tierMetaFromIndex(tier)?.name ?? "EVEN";

const tierLabelFromTier = (tier?: TierIndex) => tierNameFromIndex(tier);

const normalizeAbbr = (team: OddsBlazeTeam) =>
    team.abbreviation ??
    team.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 3);

const buildGameOptions = (
    snapshot: SoccerOdds,
    detailedOddsSnapshot?: SoccerOdds | null,
    activeGameId?: string | null
): GameOption[] =>
    snapshot.events.map((event) => {
        const isCurrentlyActive = activeGameId && event.id === activeGameId;
        let currentOdds = event.odds;

        if (isCurrentlyActive && detailedOddsSnapshot) {
            const activeEvent = detailedOddsSnapshot.events.find((e) => e.id === event.id);
            if (activeEvent) {
                currentOdds = dedupeOdds([...currentOdds, ...activeEvent.odds]);
            }
        }

        const marketSet = new Set<string>();
        const playerSet = new Set<string>();
        currentOdds.forEach((odd) => {
            marketSet.add(odd.market);
            if (odd.player?.id) playerSet.add(odd.player.id);
        });

        return {
            id: event.id,
            leagueId: snapshot.league.id,
            leagueName: snapshot.league.name,
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

const buildDateOptionsFromStart = (startDate: Date, days: number) => {
    const options: Array<{ key: string; label: string }> = [];
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, days);

    for (let index = 0; index < totalDays; index += 1) {
        const date = new Date(base);
        date.setDate(base.getDate() + index);
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

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "-";
    }
    return value > 0 ? `+${value}` : `${value}`;
};

const displayLeagueName = (leagueName: string) =>
    LEAGUE_LABELS[leagueName] ?? leagueName;

const matchupLabel = (game: GameOption) => {
    if (!game?.awayAbbr && !game?.homeAbbr) return undefined;
    return `${game?.awayAbbr} @ ${game?.homeAbbr}`
};

const normalizeSide = (side?: string) => {
    if (!side) return undefined;
    const lower = side.toLowerCase();
    if (lower === "over") return "OVER";
    if (lower === "under") return "UNDER";
    if (lower === "yes") return "YES";
    if (lower === "no") return "NO";
    return side;
};

const playerTeamLabel = (player: OddsBlazePlayer, game?: GameOption) => {
    if (player.team?.abbreviation) return player.team.abbreviation;
    if (player.team?.name) return player.team.name;
    if (game) {
        return player.team?.id === game.homeTeamId ? game.homeAbbr : game.awayAbbr;
    }
    return "";
};

const teamIdFromOdd = (odd: OddsObject, game: GameOption) => {
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

const buildPickDescription = (odd: OddsObject, game: GameOption) => {
    const matchup = matchupLabel(game);
    const side = odd.selection?.side;
    const line = odd.selection?.line;
    const marketLabel = odd.market.replace(/^Player\s+/i, "");

    if (odd.player) {
        if (side && line !== undefined) {
            return `${odd.player.name} - ${side} ${line} ${marketLabel}`;
        }
        if (side) {
            return `${odd.player.name} - ${side} ${marketLabel}`;
        }
        const cleanedName = odd.name.replace(`${odd.player.name} `, "").trim();
        return `${odd.player.name} - ${cleanedName || marketLabel}`;
    }

    if (odd.market.includes("Handicap")) {
        const team = odd.selection?.name ?? odd.name;
        const spread =
            line !== undefined ? `${line > 0 ? "+" : ""}${line}` : odd.name.replace(team, "");
        return withMatchupDescription(matchup ?? `${team}`, `${team} ${spread} Spread`.trim());
    }
    if (odd.market === "Team Total Goals") {
        return withMatchupDescription(matchup ?? ``, odd.name);
    }
    if (odd.market.includes("Total Goals") || odd.market.includes("Total Corners")) {
        if (side && line !== undefined) {
            return withMatchupDescription(matchup ?? ``, `${side} ${line} ${odd.market}`);
        }
        return withMatchupDescription(matchup ?? ``, `${odd.name} ${odd.market}`);
    }
    if (
        odd.market.includes("Moneyline") ||
        odd.market.includes("Draw No Bet") ||
        odd.market.includes("Double Chance") ||
        odd.market.includes("Both Teams To Score") ||
        odd.market.includes("First Team To Score") ||
        odd.market.includes("Last Team To Score") ||
        odd.market.includes("Correct Score")
    ) {
        return withMatchupDescription(matchup ?? ``, `${odd.name} ${odd.market}`.trim());
    }

    return withMatchupDescription(matchup ?? ``, `${odd.name} ${odd.market}`.trim());
};

const buildSelectionMeta = (odd: OddsObject, game: GameOption): PickSelectionMeta => {
    const teamId = odd.player ? odd.player.team.id : teamIdFromOdd(odd, game);
    const inferredTeamSide =
        !odd.player && !odd.selection?.side && teamId
            ? teamId === game.homeTeamId
                ? "home"
                : teamId === game.awayTeamId
                    ? "away"
                    : undefined
            : undefined;

    return {
        scope: odd.player ? "PLAYER_PROP" : "GAME_LINE",
        market: odd.market,
        gameId: game.id,
        gameStartTime: game.date,
        teamId,
        playerId: odd.player?.id,
        side: normalizeSide(odd.selection?.side) ?? inferredTeamSide,
        threshold: odd.selection?.line,
        home_team: game.homeTeam,
        home_abbr: game.homeAbbr,
        away_team: game.awayTeam,
        away_abbr: game.awayAbbr,
        external_pick_key: odd.id,
        matchup: game.awayTeam && game.homeTeam ? `${game.awayTeam} @ ${game.homeTeam}` : matchupLabel(game),
        match_date: game.date,
        sport: "Soccer"
    };
};

const findMatchingOdd = (games: GameOption[], pick?: Pick) => {
    if (!pick?.selection?.gameId || !pick.selection.market) return null;
    const game = games.find((candidate) => candidate.id === pick.selection?.gameId);
    if (!game) return null;
    const match = game.odds.find((odd) => {
        if (odd.market !== pick.selection?.market) return false;
        if (pick.selection?.playerId && odd.player?.id !== pick.selection.playerId) return false;
        if (
            pick.selection?.threshold !== undefined &&
            odd.selection?.line !== pick.selection.threshold
        ) {
            return false;
        }
        if (pick.selection?.side && normalizeSide(odd.selection?.side) !== pick.selection.side) {
            return false;
        }
        return true;
    });
    return match ? { odd: match, game } : null;
};

const compareOddsByLine = (a: OddsObject, b: OddsObject) => {
    if (a.main !== b.main) return a.main ? -1 : 1;
    const nameA = a.player?.name ?? a.selection?.name ?? a.name;
    const nameB = b.player?.name ?? b.selection?.name ?? b.name;
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    const lineA = a.selection?.line;
    const lineB = b.selection?.line;
    if (lineA !== undefined && lineB !== undefined && lineA !== lineB) {
        return lineA - lineB;
    }
    return a.name.localeCompare(b.name);
};

const formatNumberLine = (line?: number) => {
    if (line === undefined) return "-";
    return `${line}`;
};

const formatSignedLine = (line?: number) => {
    if (line === undefined) return "-";
    return line > 0 ? `+${line}` : `${line}`;
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

const matchesTeamName = (odd: OddsObject, teamName: string) => {
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

const findMainNamedOdd = (
    game: GameOption,
    market: string,
    name: string
) =>
    game.odds.find(
        (odd) =>
            odd.market === market &&
            odd.main &&
            (odd.selection?.name ?? odd.name).toLowerCase() === name.toLowerCase()
    );

const buildTotalLineData = (odds: OddsObject[]) => {
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

const buildSpreadLineData = (odds: OddsObject[], game: GameOption) => {
    const map = new Map<number, SpreadLineEntry>();
    const lineSet = new Set<number>();

    odds.forEach((odd) => {
        const line = odd.selection?.line;
        if (line === undefined) return;
        lineSet.add(line);
        const entry = map.get(line) ?? {};
        if (matchesTeamName(odd, game.homeTeam)) entry.home = odd;
        if (matchesTeamName(odd, game.awayTeam)) entry.away = odd;
        map.set(line, entry);
    });

    const lines = Array.from(lineSet.values())
        .filter((line) => map.get(line)?.home && map.get(-line)?.away)
        .sort((a, b) => a - b);

    return { lines, map };
};

const buildRowCopy = (odd: OddsObject, game: GameOption) => {
    if (odd.player) {
        const detailParts: string[] = [];
        const teamLabel = playerTeamLabel(odd.player, game);
        if (teamLabel) detailParts.push(teamLabel);
        if (odd.selection?.side && odd.selection?.line !== undefined) {
            detailParts.push(`${odd.selection.side} ${odd.selection.line}`);
        } else if (odd.selection?.side) {
            detailParts.push(odd.selection.side);
        } else {
            const cleanedName = odd.name.replace(`${odd.player.name} `, "").trim();
            if (cleanedName) detailParts.push(cleanedName);
        }
        detailParts.push(odd.market.replace(/^Player\s+/i, ""));
        return {
            title: odd.player.name,
            subtitle: detailParts.filter(Boolean).join(" · "),
        };
    }

    if (odd.market.includes("Total Goals") || odd.market.includes("Total Corners")) {
        if (odd.selection?.side && odd.selection?.line !== undefined) {
            return {
                title: `${odd.selection.side} ${odd.selection.line}`,
                subtitle: odd.market,
            };
        }
    }

    return {
        title: odd.selection?.name ?? odd.name,
        subtitle:
            odd.selection?.name && odd.name !== odd.selection.name
                ? `${odd.name} · ${odd.market}`
                : odd.market,
    };
};

export const SoccerPickBuilder = ({
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
    const isMobile = useIsMobile();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>("GAME_LINES");
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [expandedCategoryRows, setExpandedCategoryRows] = useState<
        Record<string, boolean>
    >({});
    const [selected, setSelected] = useState<SelectedOddState | null>(null);
    const [localCollapsedSections, setLocalCollapsedSections] = useState<
        Record<string, boolean>
    >({});
    const [localIsReviewOpen, setLocalIsReviewOpen] = useState(false);
    const [localSelectedConfidence, setLocalSelectedConfidence] =
        useState<ConfidenceLevel | null>(null);
    const [localSameGameComboConfidences, setLocalSameGameComboConfidences] =
        useState<Record<string, ConfidenceLevel | null>>({});
    const [localStraightConfidences, setLocalStraightConfidences] = useState<
        Record<string, ConfidenceLevel | null>
    >({});
    const [localParlayLegs, setLocalParlayLegs] = useState<ParlayLeg[]>([]);
    const [selectedSectionLines, setSelectedSectionLines] = useState<
        Record<string, number | null>
    >({});

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
            ? "leagueLeaderboard"
            : "global";
    const reviewTierDisplayMode =
        reviewTierScoringMode === "leagueLeaderboard" ? "league" : "default";
    const showReviewTierCards = confirmationVariant !== "slip" || slip.isGraded;
    const windowDays = slip.window_days ?? DEFAULT_ELIGIBLE_WINDOW_DAYS;
    const [soccerMatchSchedules, setSoccerMatchSchedules] = useState<SoccerSchedulesWithOdds[]>([]);

    const {
        englandPremierLeagueSchedulesWithOdds,
        englandPremierLeagueSchedules,
        germanyBundesligaSchedulesWithOdds,
        germanyBundesligaSchedules,
        fanduelEnglandPremierLeagueOdds,
        draftkingEnglandPremierLeagueOdds,
        fanduelGermanyBundesligaOdds,
        draftkingGermanyBundesligaOdds,
        oddsLoading,
        loading
    } = useSelector((state: RootState) => state.soccer);

    useEffect(() => {
        dispatch(fetchSoccerEnglandPremierLeagueScheduleRequest({ is_pick_of_day: true, is_range: false }));
        dispatch(fetchSoccerGermanyBundesligaScheduleRequest({ is_pick_of_day: true, is_range: false }));
    }, [dispatch]);

    useEffect(() => {
        if (activeDateKey) {
            dispatch(fetchSoccerEnglandPremierLeagueScheduleByTimezoneRequest({ date: activeDateKey, is_pick_of_day: true, is_range: false }));
            dispatch(fetchSoccerGermanyBundesligaScheduleByTimezoneRequest({ date: activeDateKey, is_pick_of_day: true, is_range: false }));
        }
    }, [dispatch, activeDateKey]);



    const mergedEPLOdds = useMemo(
        () => mergeOddsSnapshots(fanduelEnglandPremierLeagueOdds, draftkingEnglandPremierLeagueOdds),
        [fanduelEnglandPremierLeagueOdds, draftkingEnglandPremierLeagueOdds]
    );

    const mergedBundesligaOdds = useMemo(
        () => mergeOddsSnapshots(fanduelGermanyBundesligaOdds, draftkingGermanyBundesligaOdds),
        [fanduelGermanyBundesligaOdds, draftkingGermanyBundesligaOdds]
    );

    const resolveTierMetaForOdds = useCallback(
        (americanOdds: number) =>
            useGroupScoring
                ? getGroupTierForAmericanOdds(americanOdds)
                : getTierForAmericanOdds(americanOdds),
        [useGroupScoring]
    );
    const resolveReviewTierMetaForOdds = useCallback(
        (americanOdds: number) =>
            reviewTierScoringMode === "leagueLeaderboard"
                ? getGroupTierForAmericanOdds(americanOdds)
                : getTierForAmericanOdds(americanOdds),
        [reviewTierScoringMode]
    );


    const games = useMemo(() => {
        const eplSnapshot = mergeSoccerSchedules(
            englandPremierLeagueSchedulesWithOdds,
            englandPremierLeagueSchedules
        );
        const bundesligaSnapshot = mergeSoccerSchedules(
            germanyBundesligaSchedulesWithOdds,
            germanyBundesligaSchedules
        );

        const eplOptions = buildGameOptions(eplSnapshot, mergedEPLOdds, activeGameId);
        const bundesligaOptions = buildGameOptions(
            bundesligaSnapshot,
            mergedBundesligaOdds,
            activeGameId
        );

        return [...eplOptions, ...bundesligaOptions].sort((a, b) => {
            const timeDiff = a.date.localeCompare(b.date);
            if (timeDiff !== 0) return timeDiff;
            const leagueDiff =
                SOCCER_LEAGUE_ORDER.indexOf(a.leagueName as (typeof SOCCER_LEAGUE_ORDER)[number]) -
                SOCCER_LEAGUE_ORDER.indexOf(b.leagueName as (typeof SOCCER_LEAGUE_ORDER)[number]);
            if (leagueDiff !== 0) return leagueDiff;
            return (matchupLabel(a) ?? "").localeCompare(matchupLabel(b) ?? "");
        });
    }, [
        englandPremierLeagueSchedulesWithOdds,
        englandPremierLeagueSchedules,
        germanyBundesligaSchedulesWithOdds,
        germanyBundesligaSchedules,
        mergedEPLOdds,
        mergedBundesligaOdds,
        activeGameId,
    ]);

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

    const visibleGames = useMemo(() => eligibleGames, [eligibleGames]);
    const todayIso = useMemo(() => new Date().toISOString(), []);
    const todayKey = useMemo(() => toDateKey(todayIso), [todayIso]);
    const shouldFilterByDate = true;
    const showDateFilters = shouldFilterByDate && !hideDateControls;
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
            if (key) keys.add(key);
        });
        return keys;
    }, [visibleGames]);
    const filteredGames = useMemo(() => {
        if (!shouldFilterByDate || !effectiveDateKey) return visibleGames;
        return visibleGames.filter((game) => toDateKey(game.date) === effectiveDateKey);
    }, [effectiveDateKey, shouldFilterByDate, visibleGames]);
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
    }, [currentUser?.userId, initialPick, picks, showCurrentPick, slip.id, slip.pick_limit]);

    useEffect(() => {
        if (!currentPick) return;
        const match = findMatchingOdd(games, currentPick);
        if (!match) return;
        setSelected(match);
        setActiveGameId(match.game.id);
        setActiveTab(tabForOdd(match.odd));
    }, [currentPick, games]);

    useEffect(() => {
        if (!isParlayMode) {
            setParlayLegs([]);
        }
    }, [isParlayMode, setParlayLegs]);

    const locked = !currentUser || !canUserEditSlipPicks(slip);

    const activeGame = useMemo(
        () => visibleGames.find((game) => game.id === activeGameId) ?? null,
        [activeGameId, visibleGames]
    );

    const groupedGames = useMemo(
        () =>
            SOCCER_LEAGUE_ORDER.map((leagueName) => ({
                leagueName,
                games: filteredGames.filter((game) => game.leagueName === leagueName),
            })).filter((section) => section.games.length > 0),
        [filteredGames]
    );

    const buildDraftPick = useCallback(
        (odd: OddsObject, game: GameOption): DraftPick => {
            const description = buildPickDescription(odd, game);
            const americanOdds = parseAmericanOdds(odd.price);
            const tierMeta =
                americanOdds !== null ? resolveTierMetaForOdds(americanOdds) : undefined;
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
        [resolveTierMetaForOdds, slip.isGraded, sport]
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
        [buildDraftPick, selected]
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
                        ? withMatchupDescription(matchup, leg.displayName)
                        : leg.displayName,
                    odds_bracket: formatOdds(leg.price),
                    selection: {
                        gameId: leg.eventId,
                        market: leg.market,
                        teamId: leg.teamId,
                        playerId: leg.playerId,
                        side: normalizeSide(leg.side),
                        scope: leg.playerId ? "PLAYER_PROP" : "GAME_LINE",
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
        const payloadOdds = comboOddsValue === null ? null : formatOdds(comboOddsValue);
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
        comboSport,
        comboTierMeta,
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
            selection: payload.selection,
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

    const slipConflictAnalysis = useMemo(
        () =>
            activeDraft
                ? analyzeSlipPayloadAgainstPicks(picks, activeDraft, {
                    ignorePickId: initialPick?.id,
                })
                : { duplicates: [], warnings: [] },
        [activeDraft, initialPick?.id, picks]
    );
    const conflictWarningsEnabled = slipShowsConflictWarnings(slip);
    const slipWarningMessages = useMemo(
        () =>
            conflictWarningsEnabled
                ? getSlipConflictWarningMessages(slipConflictAnalysis)
                : [],
        [conflictWarningsEnabled, slipConflictAnalysis]
    );

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
    }, [setIsReviewOpen, showReviewSheet]);

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

    const handleRemoveParlayLeg = useCallback(
        (legId: string) => {
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
                    setSelected(fallbackContext);
                    setActiveGameId(fallbackContext.game.id);
                    setActiveTab(tabForOdd(fallbackContext.odd));
                    onDraftPickChange?.(buildDraftPick(fallbackContext.odd, fallbackContext.game));
                    return;
                }
            }
            if (draftPick?.source === sport) {
                onDraftPickChange?.(null);
            }
            setSelected(null);
        },
        [
            activeGame,
            buildDraftPick,
            draftPick?.source,
            findLegContext,
            onDraftPickChange,
            parlayLegs,
            selected?.odd.id,
            setParlayLegs,
            sport,
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
                        const tierPoints = reviewTierScoringMode === "leagueLeaderboard"
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
                    const context = findLegContext(leg);
                    const sourceTabLabel = context
                        ? TAB_LABELS[tabForOdd(context.odd)]
                        : leg.cachedReview?.sourceTabLabel ?? "Pick";
                    const legTierMeta = getTierMetaForPick({
                        odds: leg.price,
                        mode: reviewTierScoringMode,
                    });
                    const legPoints = legTierMeta?.points;
                    const legTierLine = formatReviewSheetTierLine({
                        tierMeta: legTierMeta,
                        points: legPoints,
                        includeName: reviewTierDisplayMode === "league",
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
                        onDelete: () => handleRemoveParlayLeg(leg.id),
                    };
                })
                : activeDraft
                    ? []
                    : [],
        [
            activeDraft,
            findLegContext,
            handleRemoveParlayLeg,
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
            const groupKey = `${entry.leg.sport ?? "sport"}:${entry.leg.eventId}`;
            const group = eventGroups.get(groupKey) ?? [];
            group.push(entry);
            eventGroups.set(groupKey, group);
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
                    includeName: reviewTierDisplayMode === "league",
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
                    : payloadGroupTierMeta?.name ?? null;

                groups.push({
                    id: `same-game-${group[0].leg.sport ?? "sport"}-${group[0].leg.eventId}`,
                    label: group[0].leg.matchup ?? "Same game combo",
                    oddsLabel: groupOddsLabel,
                    validationCopy: null,
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
                        difficultyTier: reviewGroupTierMeta?.tier,
                        buildMode: "ODDS",
                        points: payloadGroupTierMeta?.points,
                        isCombo: true,
                        legs: group.map((entry) => entry.comboLeg),
                        sourceTab: "Same Game Combo",
                    },
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
        odd: OddsObject,
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
                matchup: matchupLabel(game),
                startTime: game.date,
            };
            const existingLeg = parlayLegs.find((leg) => leg.id === incomingLeg.id);
            if (!existingLeg) {
                if (game.id && odd.id && game.leagueName === "England Premier League") {
                    dispatch(soccerEnglandPremierLeaguePickValidateRequest({ match_id: game.id, external_pick_key: odd.id, is_live: game.live }));
                } else if (game.id && odd.id && game.leagueName === "Germany Bundesliga") {
                    dispatch(soccerGermanyBundesligaPickValidateRequest({ match_id: game.id, external_pick_key: odd.id, is_live: game.live }));
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
                            setSelected(fallbackContext);
                            setActiveGameId(fallbackContext.game.id);
                            setActiveTab(tabForOdd(fallbackContext.odd));
                            onDraftPickChange?.(
                                buildDraftPick(fallbackContext.odd, fallbackContext.game)
                            );
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
            const slipSelectionAnalysis = analyzeSlipPayloadAgainstPicks(picks, legDraft, {
                ignorePickId: initialPick?.id,
            });
            if (slipSelectionAnalysis.duplicates.length > 0) {
                setToast({ id: Date.now(), type: "error", message: getSlipConflictMessage("duplicate"), duration: 3000 });
                return;
            }
            const slipSelectionMessages = conflictWarningsEnabled
                ? getSlipConflictWarningMessages(slipSelectionAnalysis)
                : [];
            if (slipSelectionMessages.length > 0) {
                setToast({ id: Date.now(), type: "info", message: slipSelectionMessages[0], duration: 3000 });
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

        const slipSelectionAnalysis = analyzeSlipPayloadAgainstPicks(picks, nextDraft, {
            ignorePickId: initialPick?.id,
        });
        if (slipSelectionAnalysis.duplicates.length > 0) {
            setToast({ id: Date.now(), type: "error", message: getSlipConflictMessage("duplicate"), duration: 3000 });
            return;
        }
        const slipSelectionMessages = conflictWarningsEnabled
            ? getSlipConflictWarningMessages(slipSelectionAnalysis)
            : [];
        if (slipSelectionMessages.length > 0) {
            setToast({ id: Date.now(), type: "info", message: slipSelectionMessages[0], duration: 3000 });
        }
        onDraftPickChange?.(nextDraft);
        setSelected({ odd, game });
    };

    const isSectionCollapsed = (key: string, defaultOpen = true) =>
        collapsedSections[key] ?? !defaultOpen;

    const toggleSection = (key: string, defaultOpen = true) => {
        setCollapsedSections((prev) => {
            const current = prev[key] ?? !defaultOpen;
            return { ...prev, [key]: !current };
        });
    };

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

    const isOddSelected = (odd?: OddsObject) =>
        Boolean(
            odd &&
            (selected?.odd.id === odd.id || parlayLegs.some((leg) => leg.id === odd.id))
        );

    const buildOddsBoxClasses = (
        base: string,
        selectedState?: boolean,
        muted?: boolean
    ) => {
        if (muted) {
            return `${base} border-white/10 text-gray-500`;
        }
        if (selectedState) {
            return `${base} border-sky-300/70 bg-sky-500/20 text-sky-100 shadow-[0_0_0_1px_rgba(96,165,250,0.35)]`;
        }
        return `${base} border-sky-400/50 text-sky-200 hover:border-sky-300/70`;
    };

    const tableOddsBoxClasses = (selectedState?: boolean, muted?: boolean) =>
        buildOddsBoxClasses(
            "h-[40px] w-[var(--table-chip-width,60px)] shrink-0 whitespace-nowrap overflow-hidden rounded-md border bg-black/70 px-3 text-[11px] font-semibold tabular-nums transition sm:h-[52px] sm:px-3 sm:text-sm flex items-center justify-center",
            selectedState,
            muted
        );

    const renderTableOddsBox = (
        value: string,
        selectedState?: boolean,
        muted?: boolean
    ) => <div className={tableOddsBoxClasses(selectedState, muted)}>{value}</div>;

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
        const hasMore = rows.length > MARKET_PREVIEW_LIMIT;
        return {
            rows: expanded ? rows : rows.slice(0, MARKET_PREVIEW_LIMIT),
            expanded,
            hasMore,
        };
    };

    const renderCategoryRowsToggle = (key: string, totalRows: number) => {
        if (totalRows <= MARKET_PREVIEW_LIMIT) return null;
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
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No lines available for this market yet."}
                </div>
            );
        }

        return (
            <div className={options?.className ?? "-mx-5 sm:-mx-6"}>
                <div className="text-xs text-white [--table-chip-width:72px] sm:[--table-chip-width:96px]">
                    <div
                        className="grid border-b border-white/10 px-5 text-xs uppercase tracking-wide text-gray-400 sm:px-6"
                        style={{
                            gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                        }}
                    >
                        <div className={STICKY_COLUMN_HEADER_CLASSES}>
                            {options?.headerLabel ?? "Selection"}
                        </div>
                        <div className="px-3 py-2 text-center">Odds</div>
                    </div>
                    {rows.map((row, rowIndex) => {
                        const rowBand = rowIndex % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent";
                        const isSelectedRow = row.odd ? isOddSelected(row.odd) : false;
                        const oddsLabel = row.odd ? formatOdds(row.odd.price) : "-";
                        return (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => row.odd && handleSelectOdd(row.odd, activeGame)}
                                disabled={!row.odd || locked}
                                className={`grid w-full items-center border-b border-white/5 px-5 text-left transition sm:px-6 ${rowBand} ${isSelectedRow
                                    ? "border-sky-300/60 bg-sky-500/10"
                                    : "hover:bg-white/[0.02]"
                                    } ${!row.odd ? "cursor-not-allowed text-gray-600" : ""}`}
                                style={{
                                    gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                }}
                            >
                                <div className={stickyColumnRowClasses(rowIndex % 2 === 1)}>
                                    <p className="text-sm font-semibold text-white">{row.title}</p>
                                    {row.subtitle ? (
                                        <p className="mt-1 text-xs text-gray-400">{row.subtitle}</p>
                                    ) : null}
                                </div>
                                <div className="flex justify-center px-3 py-3">
                                    {renderTableOddsBox(oddsLabel, isSelectedRow, !row.odd)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTotalLineSection = (
        sectionKey: string,
        lineData: { lines: number[]; map: Map<number, TotalLineEntry> },
        options?: { emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (lineData.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No total lines available for this matchup yet."}
                </div>
            );
        }

        const preferredLine =
            lineData.lines.find(
                (line) => lineData.map.get(line)?.over?.main || lineData.map.get(line)?.under?.main
            ) ?? undefined;
        const resolvedLine = resolveLineSelection(
            lineData.lines,
            selectedSectionLines[sectionKey],
            preferredLine
        );
        const entry = resolvedLine !== null ? lineData.map.get(resolvedLine) : undefined;
        const overOdd = entry?.over;
        const underOdd = entry?.under;
        const rows: SimpleMarketRow[] = [
            {
                id: `${sectionKey}-over`,
                title:
                    formatNumberLine(overOdd?.selection?.line ?? resolvedLine ?? undefined) !== "-"
                        ? `Over ${formatNumberLine(
                            overOdd?.selection?.line ?? resolvedLine ?? undefined
                        )}`
                        : "Over",
                odd: overOdd,
            },
            {
                id: `${sectionKey}-under`,
                title:
                    formatNumberLine(underOdd?.selection?.line ?? resolvedLine ?? undefined) !== "-"
                        ? `Under ${formatNumberLine(
                            underOdd?.selection?.line ?? resolvedLine ?? undefined
                        )}`
                        : "Under",
                odd: underOdd,
            },
        ];

        return (
            <div className="mt-4 space-y-3">
                {renderSimpleMarketTable(rows, {
                    headerLabel: "Side",
                    className: "mt-0 -mx-5 sm:-mx-6",
                })}
                <LineScroller
                    lines={lineData.lines}
                    activeLine={resolvedLine}
                    onSelect={(line) =>
                        setSelectedSectionLines((prev) => ({ ...prev, [sectionKey]: line }))
                    }
                    locked={locked}
                />
            </div>
        );
    };

    const renderSpreadLineSection = (
        sectionKey: string,
        lineData: { lines: number[]; map: Map<number, SpreadLineEntry> },
        options?: { emptyMessage?: string }
    ) => {
        if (!activeGame) return null;
        if (lineData.lines.length === 0) {
            return (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    {options?.emptyMessage ?? "No spread lines available for this matchup yet."}
                </div>
            );
        }

        const preferredLine =
            lineData.lines.find(
                (line) =>
                    lineData.map.get(line)?.home?.main || lineData.map.get(-line)?.away?.main
            ) ?? undefined;
        const resolvedLine = resolveLineSelection(
            lineData.lines,
            selectedSectionLines[sectionKey],
            preferredLine
        );
        const homeEntry = resolvedLine !== null ? lineData.map.get(resolvedLine) : undefined;
        const awayEntry = resolvedLine !== null ? lineData.map.get(-resolvedLine) : undefined;
        const homeOdd = homeEntry?.home;
        const awayOdd = awayEntry?.away;
        const homeLine = resolvedLine ?? homeOdd?.selection?.line;
        const awayLine =
            resolvedLine !== null ? -resolvedLine : awayOdd?.selection?.line ?? undefined;
        const rows: SimpleMarketRow[] = [
            {
                id: `${sectionKey}-away`,
                title:
                    formatSignedLine(awayLine ?? awayOdd?.selection?.line) !== "-"
                        ? `${activeGame.awayTeam} ${formatSignedLine(
                            awayLine ?? awayOdd?.selection?.line
                        )}`
                        : activeGame.awayTeam,
                subtitle: activeGame.awayAbbr,
                odd: awayOdd,
            },
            {
                id: `${sectionKey}-home`,
                title:
                    formatSignedLine(homeLine ?? homeOdd?.selection?.line) !== "-"
                        ? `${activeGame.homeTeam} ${formatSignedLine(
                            homeLine ?? homeOdd?.selection?.line
                        )}`
                        : activeGame.homeTeam,
                subtitle: activeGame.homeAbbr,
                odd: homeOdd,
            },
        ];

        return (
            <div className="mt-4 space-y-3">
                {renderSimpleMarketTable(rows, {
                    headerLabel: "Team",
                    className: "mt-0 -mx-5 sm:-mx-6",
                })}
                <LineScroller
                    lines={lineData.lines}
                    activeLine={resolvedLine}
                    onSelect={(line) =>
                        setSelectedSectionLines((prev) => ({ ...prev, [sectionKey]: line }))
                    }
                    formatLine={(line) => formatSignedLine(line)}
                    locked={locked}
                />
            </div>
        );
    };

    const marketSections = useMemo<MarketSection[]>(() => {
        if (!activeGame) return [];

        return TAB_MARKETS[activeTab]
            .flatMap((market): MarketSection[] => {
                const marketOdds = activeGame.odds
                    .filter((odd) => odd.market === market)
                    .sort(compareOddsByLine);

                if (marketOdds.length === 0) return [];

                if (market === "Handicap") {
                    return [
                        {
                            key: `${activeGame.id}:${market}`,
                            title: "Spread",
                            kind: "spread",
                            lineData: buildSpreadLineData(marketOdds, activeGame),
                            emptyMessage: "No spread lines available for this matchup yet.",
                        } satisfies SpreadMarketSection,
                    ];
                }

                if (market === "Total Goals" || market === "1st Half Total Goals") {
                    return [
                        {
                            key: `${activeGame.id}:${market}`,
                            title: market,
                            kind: "total",
                            lineData: buildTotalLineData(marketOdds),
                            emptyMessage: `No ${market.toLowerCase()} lines available for this matchup yet.`,
                        } satisfies TotalMarketSection,
                    ];
                }

                if (market === "Team Total Goals") {
                    const teamSections: MarketSection[] = [];
                    [
                        {
                            teamName: activeGame.awayTeam,
                            teamId: activeGame.awayTeamId,
                        },
                        {
                            teamName: activeGame.homeTeam,
                            teamId: activeGame.homeTeamId,
                        },
                    ].forEach(({ teamName, teamId }) => {
                        const teamOdds = marketOdds.filter((odd) => matchesTeamName(odd, teamName));
                        if (teamOdds.length === 0) return;
                        teamSections.push({
                            key: `${activeGame.id}:${market}:${teamId}`,
                            title: `${teamName} Total Goals`,
                            kind: "total",
                            lineData: buildTotalLineData(teamOdds),
                            emptyMessage: `No ${teamName} team total lines available for this matchup yet.`,
                        } satisfies TotalMarketSection);
                    });
                    return teamSections;
                }

                const rows = marketOdds.map((odd) => {
                    const copy = buildRowCopy(odd, activeGame);
                    return {
                        id: odd.id,
                        title: copy.title,
                        subtitle: copy.subtitle,
                        odd,
                    } satisfies SimpleMarketRow;
                });

                return [
                    {
                        key: `${activeGame.id}:${market}`,
                        title: market,
                        kind: "standard",
                        headerLabel: market.includes("Player") ? "Player" : "Selection",
                        rows,
                    } satisfies StandardMarketSection,
                ];
            })
            .filter((section) =>
                section.kind === "standard" ? section.rows.length > 0 : true
            );
    }, [activeGame, activeTab]);

    const handleSelectGame = (game: GameOption) => {
        if (locked || !game.hasOdds) return;
        setActiveGameId(game.id);
        if (game.id) {
            if (game.leagueName === "England Premier League") {
                dispatch(fetchFanduelSoccerEnglandPremierLeagueOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
                dispatch(fetchDraftkingsSoccerEnglandPremierLeagueOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
            } else if (game.leagueName === "Germany Bundesliga") {
                dispatch(fetchFanduelSoccerGermanyBundesligaOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
                dispatch(fetchDraftkingsSoccerGermanyBundesligaOddsRequest({ match_id: game.id, is_live: game.live, silent: false }));
            }
        }
        setActiveTab("GAME_LINES");
        setSelected(null);
    };

    const handleBackToMatchups = () => {
        setActiveGameId(null);
        setSelected(null);
    };

    const straightSectionKey = "review-straight-picks";
    const sameGameSectionKey = "review-same-game-combo-picks";
    const isSameGameSectionCollapsed = hasMultiSelection
        ? isSectionCollapsed(sameGameSectionKey, false)
        : true;
    const isStraightSectionCollapsed = hasMultiSelection
        ? isSectionCollapsed(straightSectionKey, false)
        : true;

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
    const sheetPoints =
        reviewTierScoringMode === "leagueLeaderboard"
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
        includeName: reviewTierDisplayMode === "league",
        mode: reviewTierDisplayMode,
    });
    const comboOddsLabel = hasMultiSelection
        ? activeDraft?.odds_bracket ?? activeDraft?.odds ?? null
        : null;
    const comboHasInvalidSelections =
        hasMultiSelection && parlayPricing.hasInvalidComboLegs;
    const comboValidationCopy = comboHasInvalidSelections
        ? "Selections cannot be combined"
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

    if (activeGame && oddsLoading) {
        return <SoccerMatchupDetailSkeleton />
    }

    if (loading) {
        return <SoccerPickBuilderSkeleton />
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
                                organized by league
                            </span>
                        </div>
                        {showDateFilters && dateOptions.length > 0 && (
                            <div className="flex w-full items-center gap-3 overflow-x-auto pb-1">
                                {dateOptions.map((option) => {
                                    const active = option.key === effectiveDateKey;
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => onDateChange?.(option.key, "user")}
                                            className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition ${active
                                                ? "border-sky-300 text-white"
                                                : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {filteredGames.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                                <p className="font-semibold text-white">
                                    {noGamesForSelectedDate ? "No matches scheduled" : "No matches scheduled"}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    No soccer matches are available for this day.
                                </p>
                            </div>
                        ) : (
                            <div className="-mx-5 overflow-y-auto scrollbar-hide sm:mx-0">
                                {groupedGames.map((section) => (
                                    <section
                                        key={section.leagueName}
                                        className="border-t border-white/10 first:border-t-0"
                                    >
                                        <div className="px-5 pb-2 pt-4 sm:px-6">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                                                {displayLeagueName(section.leagueName)}
                                            </p>
                                        </div>
                                        <div className="divide-y divide-white/10">
                                            {section.games.map((game) => {
                                                const awayOdd = findMainTeamOdd(
                                                    game,
                                                    "Moneyline 3-Way",
                                                    game.awayTeam
                                                );
                                                const homeOdd = findMainTeamOdd(
                                                    game,
                                                    "Moneyline 3-Way",
                                                    game.homeTeam
                                                );
                                                const drawOdd = findMainNamedOdd(game, "Moneyline 3-Way", "Draw");
                                                const isRowDisabled = locked || !game.hasOdds;

                                                const renderPreviewCell = (odd: OddsObject | undefined) => {
                                                    const isSelected = isOddSelected(odd);
                                                    const isDisabled = isRowDisabled || !odd;
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
                                                            className={`flex min-h-[60px] flex-col w-full items-center justify-center bg-transparent px-2 py-1 sm:px-3 text-left ${isDisabled ? "cursor-not-allowed" : ""}`}
                                                        >
                                                            {renderTableOddsBox(
                                                                odd ? formatOdds(odd.price) : "-",
                                                                isSelected,
                                                                !odd
                                                            )}
                                                        </button>
                                                    );
                                                };

                                                const renderPreviewPlaceholderCell = () => (
                                                    <div className="flex min-h-[48px] w-full items-center justify-center bg-transparent p-0">
                                                        {renderTableOddsBox("-", false, true)}
                                                    </div>
                                                );

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
                                                            <span className="text-center">Home</span>
                                                            <span className="text-center">Draw</span>
                                                            <span className="text-center">Away</span>
                                                        </div>

                                                        <div
                                                            className="grid gap-1"
                                                            style={{
                                                                gridTemplateColumns:
                                                                    "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                                gridTemplateRows: "auto auto auto",
                                                            }}
                                                        >
                                                            <div className="flex min-h-[36px] sm:min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3 row-start-1">
                                                                <div className="min-w-0">
                                                                    <span className="truncate text-xs font-semibold leading-snug text-white">
                                                                        {/* {isMobile ? getMobileTeamName(game.awayAbbr, game.awayTeam) : game.awayTeam} */}
                                                                        <p>{game.awayTeam}</p>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="px-3 row-start-2 col-start-1">
                                                                <div className="relative flex items-center h-px w-full overflow-hidden">
                                                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-sky-700/100 to-transparent shimmer-divider"></div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between min-h-[36px] sm:min-h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3 row-start-3">
                                                                <div className="min-w-0">
                                                                    <span className="truncate text-xs font-semibold leading-snug text-white">
                                                                        {/* <p className="truncate text-[10px] text-slate-100/50">home</p> */}
                                                                        {/* {isMobile ? getMobileTeamName(game.homeAbbr, game.homeTeam) : game.homeTeam} */}
                                                                        <p className="flex items-center justify-center gap-1">
                                                                            {game.homeTeam}
                                                                        </p>
                                                                    </span>
                                                                </div>
                                                                <House size={14} color="white" />
                                                            </div>

                                                            <div className="row-span-3 flex items-center justify-center">
                                                                {renderPreviewCell(homeOdd)}
                                                            </div>

                                                            <div className="row-span-3 flex items-center justify-center">
                                                                {renderPreviewCell(drawOdd)}
                                                            </div>

                                                            <div className="row-span-3 flex items-center justify-center">
                                                                {renderPreviewCell(awayOdd)}
                                                            </div>
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
                                                            </div>
                                                            <div className="items-center">
                                                                <span className="text-xs text-gray-500">→</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
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
                            <p className="text-xs text-gray-500">
                                Updated {activeGame.leagueName === "england-premier-league" ? formatDateTime(englandPremierLeagueSchedulesWithOdds?.updated) : formatDateTime(germanyBundesligaSchedulesWithOdds?.updated)}
                            </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200/80">
                                    {displayLeagueName(activeGame.leagueName)}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-white">
                                    {activeGame.awayTeam} at {activeGame.homeTeam}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {formatDateTime(activeGame.date)}
                                </p>
                            </div>
                        </div>
                        <div className="scrollbar-hide -mx-5 mt-4 flex gap-3 overflow-x-auto border-b border-white/10 px-5 pb-2 sm:mx-0 sm:px-0">
                            {TAB_ORDER.map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${active
                                            ? "border-sky-300 text-sky-100"
                                            : "border-transparent text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {TAB_LABELS[tab]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {marketSections.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                            No lines available in this tab yet.
                        </div>
                    ) : (
                        <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                            {marketSections.map((section, index) => {
                                const defaultOpen = index === 0;
                                const collapsed = isSectionCollapsed(section.key, defaultOpen);
                                return (
                                    <section key={section.key} className="px-5 py-6 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.key, defaultOpen)}
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
                                        {!collapsed && (
                                            <>
                                                {section.kind === "standard" ? (
                                                    <>
                                                        {(() => {
                                                            const visibleRows = getVisibleCategoryRows(
                                                                section.rows,
                                                                section.key
                                                            );
                                                            return (
                                                                <>
                                                                    {renderSimpleMarketTable(visibleRows.rows, {
                                                                        headerLabel: section.headerLabel,
                                                                        className: "mt-4 -mx-5 sm:-mx-6",
                                                                    })}
                                                                    {renderCategoryRowsToggle(
                                                                        section.key,
                                                                        section.rows.length
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </>
                                                ) : section.kind === "spread" ? (
                                                    renderSpreadLineSection(section.key, section.lineData, {
                                                        emptyMessage: section.emptyMessage,
                                                    })
                                                ) : (
                                                    renderTotalLineSection(section.key, section.lineData, {
                                                        emptyMessage: section.emptyMessage,
                                                    })
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
                slipWarningMessages={slipWarningMessages}
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
        </div>
    );
};

export default SoccerPickBuilder;
