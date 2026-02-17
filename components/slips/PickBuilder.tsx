"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { ODDS_BRACKETS } from "../../lib/constants";
import { formatDateTime, isPast } from "../../lib/utils/date";
import { ScoringModal } from "../modals/ScoringModal";
import { BuildMode, BuiltPickPayload, CurrentUser, Group, League, NFLOdds, NFLPlayer, NFLSchedules, PassingPropsObject, Pick, PickMarket, PickScope, PickSide, ReceivingPropsObject, RootState, RushingPropsObject, Slip, TouchDownPropsObject, ValidatePickRequest, ValidatePickResponse } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { fetchLiveNFLScheduleRequest, fetchLiveOddsRequest, fetchPassingPropsPlayersRequest, fetchReceivingPropsPlayersRequest, fetchRushingPropsPlayersRequest, fetchTouchDownPropsPlayersRequest } from "@/lib/redux/slices/nflSlice";
import { eligibleWindowEnd, filterEligibleGames } from "@/lib/utils/games";
import FootballAnimation from "../animations/FootballAnimation";
import { useIsMobile } from "../leaderboard/LeaderboardGrid";
import { useToast } from "@/lib/state/ToastContext";

type GroupLeaderboardEntry = {
    userId: string;
    slipId: string;
    groupId: string;
    cumulativePoints?: number;
};

type Props = {
    sport: League | string;
    group: Group;
    slip: Slip;
    currentUser: CurrentUser | null;
    picks: Pick[];
    initialPick?: Pick;
    onSave: (payload: BuiltPickPayload) => void;
    onCancel?: () => void;
    isCommissioner: boolean;
    leaderboard?: GroupLeaderboardEntry[];
    buildMode: BuildMode;
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

export type GameOption = {
    game_id: string;
    home_team: string;
    away_team: string;
    home_team_id: string;
    away_team_id: string;
    gametime: string;
    week: string;
};

type PassingMarket = "PASSING_YARDS" | "PASSING_TDS" | "PASSING_RUSHING_YARDS";
type ReceivingMarket = "RECEIVING_YARDS" | "RECEPTIONS";
type RushingMarket =
    | "RUSHING_YARDS"
    | "RUSHING_ATTEMPTS"
    | "RUSHING_RECEIVING_YARDS";

type BuilderSelection = {
    scope?: PickScope;
    market?: PickMarket;
    gameId?: string;
    week?: string;
    teamId?: string;
    playerId?: string;
    side?: string;
    threshold?: number;
    player?: {
        id?: string;
        name?: string;
        position?: string;
        team?: string;
    };
    price?: number;
    links?: {
        desktop: string;
        mobile: string;
    };
    external_pick_key?: string;
};

type ValidationState = {
    status: "idle" | "loading" | "resolved";
    response?: ValidatePickResponse;
    error?: string | null;
};

// const STAT_OPTIONS_BY_POSITION = {
//     WR: ["RECEIVING_YARDS", "RECEPTIONS", "RECEIVING_TDS"],
//     RB: [
//         "RUSHING_YARDS",
//         "RUSHING_ATTEMPTS",
//         "RUSHING_TDS",
//         "RECEIVING_YARDS",
//         "RUSHING_RECEIVING_YARDS",
//     ],
//     QB: ["PASSING_YARDS", "PASSING_TDS", "PASSING_RUSHING_YARDS", "RUSHING_YARDS"],
//     TE: ["RECEIVING_YARDS", "RECEPTIONS", "RECEIVING_TDS"],
// } as const;

const STAT_THRESHOLD_CONFIG: Record<string, number[]> = {
    NFL_RECEIVING_YARDS: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    NFL_RUSHING_YARDS: [20, 30, 40, 50, 60, 80, 100],
    NFL_RUSH_REC_YARDS: [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
    NFL_PASSING_YARDS: [150, 200, 225, 250, 275, 300, 325, 350],
    NFL_PASS_RUSH_YARDS: [200, 225, 250, 275, 300, 325, 350, 375],
    NFL_TDS: [1, 2, 3],
    NFL_RECEPTIONS: [3, 4, 5, 6, 7, 8, 10],
    NFL_ATTEMPTS: [10, 12, 15, 18, 20, 22, 25],
};

const TOTAL_POINT_THRESHOLDS = [20, 30, 35, 40, 45, 50, 55, 60, 65];

const MARKET_LABEL: Record<PickMarket, string> = {
    MONEYLINE: "Moneyline",
    SPREAD: "Spread",
    TOTAL_POINTS: "Total Points",
    PASSING_YARDS: "Passing Yards",
    PASSING_RUSHING_YARDS: "Pass + Rush Yards",
    RUSHING_YARDS: "Rushing Yards",
    RUSHING_RECEIVING_YARDS: "Rush + Rec Yards",
    RECEIVING_YARDS: "Receiving Yards",
    RECEPTIONS: "Receptions",
    RUSHING_ATTEMPTS: "Rushing Attempts",
    PASSING_TDS: "Passing TDs",
    RUSHING_TDS: "Touchdowns",
    RECEIVING_TDS: "Touchdowns",
    PLAYER_TDS: "Anytime TD"
};

const difficultyCopy = (tier?: number) => {
    switch (tier) {
        case 1:
            return "Very Safe";
        case 2:
            return "Safe";
        case 3:
            return "Balanced";
        case 4:
            return "Risky";
        case 5:
            return "Moonshot";
        default:
            return "Unknown";
    }
};

const tierFromAmericanOdds = (american: number): 1 | 2 | 3 | 4 | 5 => {
    if (american <= -250) return 1;
    if (american > -250 && american <= 0) return 2;
    if (american > 0 && american <= 250) return 3;
    if (american > 250 && american <= 500) return 4;
    return 5;
};

const tierLabelFromTier = (tier?: number): "Safe" | "Balanced" | "Risky" => {
    if (!tier) return "Balanced";
    if (tier <= 2) return "Safe";
    if (tier === 3) return "Balanced";
    return "Risky";
};

const tierFromDifficultyLabel = (
    label: Pick["difficulty_label"]
): 1 | 2 | 3 | 4 | 5 | undefined => {
    if (label === "Safe") return 2;
    if (label === "Balanced") return 3;
    if (label === "Risky") return 4;
    return undefined;
};

const pointsByTier: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: ODDS_BRACKETS[0].points,
    2: ODDS_BRACKETS[1].points,
    3: ODDS_BRACKETS[2].points,
    4: ODDS_BRACKETS[3].points,
    5: ODDS_BRACKETS[4].points,
};

const bracketFromTier = (tier?: number) => {
    if (!tier) return ODDS_BRACKETS[2].label;
    if (tier === 1) return "–250 or shorter";
    if (tier === 2) return "–249 to 0";
    if (tier === 3) return "+1 to +250";
    if (tier === 4) return "+251 to +500";
    return "+501 and up";
};

const formatOdds = (american?: number) => {
    if (american === undefined || american === null || Number.isNaN(american)) {
        return "—";
    }
    return american > 0 ? `+${american}` : `${american}`;
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
        case "RECEPTIONS":
            return STAT_THRESHOLD_CONFIG.NFL_RECEPTIONS;
        case "RUSHING_ATTEMPTS":
            return STAT_THRESHOLD_CONFIG.NFL_ATTEMPTS;
        case "PASSING_TDS":
        case "RUSHING_TDS":
        case "RECEIVING_TDS":
            return STAT_THRESHOLD_CONFIG.NFL_TDS;
        default:
            return [];
    }
};

// const quickThresholdsForMarket = (market: PickMarket): number[] => {
//     const thresholds = statThresholdsForMarket(market);
//     if (thresholds.length <= 3) return thresholds;
//     const middle = Math.floor(thresholds.length / 2);
//     const picks = [
//         thresholds[Math.max(0, middle - 1)],
//         thresholds[middle],
//         thresholds[Math.min(thresholds.length - 1, middle + 1)],
//     ];
//     return picks;
// };

// const formatThresholdLabel = (market: PickMarket, threshold: number) => {
//     if (market === "RECEPTIONS") return `${threshold}+ Rec`;
//     if (market === "RUSHING_ATTEMPTS") return `${threshold}+ Att`;
//     if (market.includes("TDS")) return `${threshold}+ TD${threshold > 1 ? "s" : ""}`;
//     return `${threshold}+`;
// };

// const syntheticOddsForThreshold = (market: PickMarket, threshold: number) => {
//     if (market.includes("TDS")) {
//         const base = 110 + threshold * 120;
//         const wobble = Math.abs(Math.round(Math.sin(threshold * 8) * 45));
//         return base + wobble;
//     }
//     const multiplier =
//         market === "RECEPTIONS"
//             ? 18
//             : market === "RUSHING_ATTEMPTS"
//                 ? 16
//                 : market.includes("PASSING")
//                     ? 8
//                     : 10;
//     const noise = Math.abs(Math.round(Math.sin(threshold) * 30));
//     return Math.min(950, 90 + Math.round(threshold * (multiplier / 10)) + noise + 40);
// };


export const NflPickBuilder = ({
    sport,
    group,
    slip,
    currentUser,
    picks,
    initialPick,
    onSave,
    onCancel,
    buildMode,
}: Props) => {
    const dispatch = useDispatch();
    const isMobile = useIsMobile();
    const { setToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [showTipsModal, setShowTipsModal] = useState(false);

    const [showTierModal, setShowTierModal] = useState(false);
    const [customThreshold, setCustomThreshold] = useState<string>("");
    const [customDescription, setCustomDescription] = useState("");
    const [customError, setCustomError] = useState<string | null>(null);
    const [step, setStep] = useState<PickBuilderStep>({ kind: "GAME_SELECT" });
    const [selection, setSelection] = useState<BuilderSelection>({});
    const [validation, setValidation] = useState<ValidationState>({
        status: "idle",
        response: undefined,
        error: null,
    });
    const [nflMatchSchedules, setNFLMatchSchedules] = useState<NFLSchedules[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<NFLSchedules>();
    const [oddsData, setOddsData] = useState<NFLOdds>();
    const [passingPlayers, setPassingPlayers] = useState<PassingPropsObject[]>([]);
    const [receivingPlayers, setReceivingPlayers] = useState<ReceivingPropsObject[]>([]);
    const [rushingPlayers, setRushingPlayers] = useState<RushingPropsObject[]>([]);
    const [touchDownPlayers, setTouchDownPlayers] = useState<TouchDownPropsObject[]>([]);
    const [manualTier, setManualTier] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
    const [gameDetailTab, setGameDetailTab] = useState<GameDetailTab>("GAME_LINES");
    const [passingMarket, setPassingMarket] = useState<PassingMarket>("PASSING_YARDS");
    const [receivingMarket, setReceivingMarket] = useState<ReceivingMarket>("RECEIVING_YARDS");
    const [rushingMarket, setRushingMarket] = useState<RushingMarket>("RUSHING_YARDS");
    const windowDays = slip.window_days ?? 5;

    const { loading, nflSchedules, nflOdds, nflPassingProps, nflReceivingProps, nflRushingProps, nflTouchDownProps, validPickError, validPickMessage } = useSelector((state: RootState) => state.nfl);

    const pick = useMemo(() => {
        if (!slip || !currentUser) return undefined;
        if (initialPick) return initialPick;
        if (slip.pick_limit === 1) {
            return picks.find(
                (entry) => entry.slip_id === slip.id && entry.user_id === currentUser.userId
            );
        }
        return undefined;
    }, [picks, slip, currentUser, initialPick]);

    useEffect(() => {
        if (pick) {
            setSelection({
                scope: pick.scope,
                market: pick.market,
                gameId: pick.game_id,
                teamId: pick.team_id,
                playerId: pick.player_id,
                side: pick.side,
                threshold: pick.threshold,
            });
        }
    }, [pick]);
    useEffect(() => {
        if (slip?.results_deadline_at && slip?.pick_deadline_at) {
            const resultDate = new Date(slip.results_deadline_at).toISOString().split('T')[0];
            const pickDate = new Date(slip.pick_deadline_at).toISOString().split('T')[0];
            dispatch(fetchLiveNFLScheduleRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate), is_pick_of_day: false }));
        } else {
            dispatch(fetchLiveNFLScheduleRequest({ is_pick_of_day: true }));
        }
    }, [dispatch, slip?.pick_deadline_at, slip?.results_deadline_at, windowDays, sport]);
    useEffect(() => {
        if (Array.isArray(nflSchedules?.events) && nflSchedules?.events?.length) {
            setNFLMatchSchedules(nflSchedules?.events);
        }
        if (nflOdds) {
            setOddsData(nflOdds);
        }
        if (Array.isArray(nflPassingProps) && nflPassingProps.length) {
            setPassingPlayers(nflPassingProps);
        }
        if (Array.isArray(nflReceivingProps) && nflReceivingProps.length) {
            setReceivingPlayers(nflReceivingProps);
        }
        if (Array.isArray(nflRushingProps) && nflRushingProps.length) {
            setRushingPlayers(nflRushingProps);
        }
        if (Array.isArray(nflTouchDownProps) && nflTouchDownProps.length) {
            setTouchDownPlayers(nflTouchDownProps);
        }
    }, [nflSchedules, nflOdds, nflPassingProps, nflReceivingProps, nflRushingProps, nflTouchDownProps]);
    useEffect(() => {
        if (selectedMatch?.id) {
            dispatch(fetchLiveOddsRequest({ match_id: selectedMatch?.id }));
            dispatch(fetchPassingPropsPlayersRequest({ match_id: selectedMatch?.id }));
            dispatch(fetchReceivingPropsPlayersRequest({ match_id: selectedMatch?.id }));
            dispatch(fetchRushingPropsPlayersRequest({ match_id: selectedMatch?.id }));
            dispatch(fetchTouchDownPropsPlayersRequest({ match_id: selectedMatch?.id }));
        }
    }, [selectedMatch?.id, dispatch]);
    useEffect(() => {
        if (validPickMessage) {
            setValidation({ status: "resolved", response: undefined, error: null });
            setToast({
                id: Date.now(),
                type: "success",
                message: validPickMessage,
                duration: 3000,
            });
        }
        if (validPickError) {
            setValidation({ status: "resolved", response: undefined, error: null });
            setToast({
                id: Date.now(),
                type: "error",
                message: validPickError,
                duration: 3000,
            });
        }
    }, [validPickMessage, validPickError, dispatch, setToast]);
    const locked =
        !slip ||
        slip.status !== "open" ||
        isPast(slip.pick_deadline_at ?? "") ||
        !currentUser;

    const getMarketLabel = (market?: PickMarket) =>
        market ? MARKET_LABEL[market] ?? market : "Select a market";

    const findGame = (gameId?: string) =>
        nflMatchSchedules.find((candidate) => candidate.id === gameId);

    // const findPlayer = (playerId?: string) =>
    //     playersList.find((candidate) => candidate.id === playerId);

    const buildSummary = (
        selection: BuilderSelection,
        fallbackDescription?: string
    ): string => {
        const game = findGame(selection.gameId);
        // const player = findPlayer(selection.playerId);

        if (
            selection.scope === "PLAYER_PROP" &&
            selection.player &&
            selection.market &&
            selection.threshold !== undefined
        ) {
            const label = getMarketLabel(selection.market);
            const direction = selection.side === "UNDER" ? "Under" : "Over";
            const suffix = selection.market.includes("TDS")
                ? `${direction} ${selection.threshold} TD${selection.threshold > 1 ? "s" : ""}`
                : `${direction} ${selection.threshold} ${label}`;
            return `${selection.player?.name} — ${suffix}`;
        }

        if (selection.scope === "GAME_LINE" && game) {
            if (selection.market === "MONEYLINE" && selection.teamId) {
                const winner =
                    selection.teamId === game.teams.home.id ? game.teams.home.abbreviation : game.teams.away.abbreviation;
                return `${winner} to win the game`;
            }

            if (selection.market === "SPREAD" && selection.teamId && selection.threshold) {
                const teamName =
                    selection.teamId === game.teams.home.id ? game.teams.home.abbreviation : game.teams.away.abbreviation;
                const formattedSpread =
                    selection.threshold > 0 ? `+${selection.threshold}` : `${selection.threshold}`;
                return `${teamName} ${formattedSpread} spread`;
            }

            if (selection.market === "TOTAL_POINTS" && selection.threshold && selection.side) {
                return `${game.teams.away.abbreviation} @ ${game.teams.home.abbreviation} — ${selection.side === "Over" ? "Over" : "Under"} ${selection.threshold} total points`;
            }
        }

        if (fallbackDescription) return fallbackDescription;

        return "Ready to build a pick";
    };

    const eligibleGames = useMemo(
        () => filterEligibleGames(nflMatchSchedules, slip.pick_deadline_at, windowDays),
        [nflMatchSchedules, slip.pick_deadline_at, windowDays]
    );

    const eligibilityWindowEnd = useMemo(
        () => eligibleWindowEnd(slip.pick_deadline_at, windowDays),
        [slip.pick_deadline_at, windowDays]
    );

    const activeGame = findGame(selection.gameId);
    // const activePlayer = findPlayer(selection.playerId);

    const resetFlow = () => {
        setSelection({});
        setCustomThreshold("");
        setCustomDescription("");
        setCustomError(null);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setGameDetailTab("GAME_LINES");
        setPassingMarket("PASSING_YARDS");
        setReceivingMarket("RECEIVING_YARDS");
        setRushingMarket("RUSHING_YARDS");
        setStep({ kind: "GAME_SELECT" });
    };

    useEffect(() => {
        if (!pick) {
            resetFlow();
            return;
        }

        setCustomDescription(pick.description);
        setStep({ kind: "CONFIRMATION" });
        const mappedTier = tierFromDifficultyLabel(pick.difficulty_label);
        setManualTier(mappedTier);
        setValidation({
            status: "resolved",
            response: pick.points
                ? { status: "NO_MARKET", points: pick.points }
                : { status: "NO_MARKET" },
            error: null,
        });
    }, [pick]);

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
                    week: undefined
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
                if (buildMode === "ODDS") {
                    setStep({ kind: "GAME_DETAIL" });
                    break;
                }
                if (selection.scope === "PLAYER_PROP") {
                    setStep({ kind: "PLAYER_SELECT_THRESHOLD" });
                } else {
                    if (selection.market === "MONEYLINE") setStep({ kind: "GAME_MONEYLINE_TEAM" });
                    else if (selection.market === "SPREAD") setStep({ kind: "GAME_SPREAD_MARGIN" });
                    else if (selection.market === "TOTAL_POINTS")
                        setStep({ kind: "GAME_TOTAL_THRESHOLD" });
                    else setStep({ kind: "GAME_DETAIL" });
                }
                break;
            default:
                handleBackToGames();
        }
    };

    const handleCustomIdea = async () => {
        if (!customDescription.trim()) {
            setCustomError("Type a quick description first.");
            return;
        }

        setValidation({ status: "loading", response: undefined, error: null });
        setManualTier(undefined);

        try {
            const response = await fetch("/api/picks/validate-custom", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rawDescription: customDescription,
                    groupId: group?.id,
                    contestId: slip?.id,
                    userId: currentUser?.userId,
                }),
            });
            await navigator.clipboard.writeText(JSON.stringify({
                rawDescription: customDescription,
                groupId: group?.id,
                contestId: slip?.id,
                userId: currentUser?.userId,
            }));

            if (!response.ok) {
                throw new Error("Validation failed");
            }

            const data = (await response.json()) as {
                validate: ValidatePickResponse;
                parsedSelection?: BuilderSelection;
            };

            if (data.parsedSelection) {
                setSelection(data.parsedSelection);
            } else {
                // No structured mapping — treat as free-form
                setSelection({});
            }

            setValidation({ status: "resolved", response: data.validate, error: null });
            setCustomError(null);
            setStep({ kind: "CONFIRMATION" });
        } catch {
            // Fallback: no odds, no structured mapping, but still let them confirm
            setSelection({});
            setValidation({
                status: "resolved",
                response: { status: "API_ERROR" },
                error: "We couldn't match this to a market automatically.",
            });
            setStep({ kind: "CONFIRMATION" });
        }
    };

    const handleGameChoice = (game: NFLSchedules) => {
        setSelection({
            scope: "GAME_LINE",
            gameId: game.id,
            teamId: game.teams.home.id,
            playerId: undefined,
            threshold: undefined,
            side: undefined,
            market: undefined,
            week: undefined,
            player: undefined,
        });
        setSelectedMatch(game);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setGameDetailTab("GAME_LINES");
        setPassingMarket("PASSING_YARDS");
        setReceivingMarket("RECEIVING_YARDS");
        setRushingMarket("RUSHING_YARDS");
        setStep({ kind: "GAME_DETAIL" });
    };

    const setThresholdAndValidate = (nextThreshold: number, nextSide?: string) => {
        const side = nextSide ?? selection.side;
        const updatedSelection = { ...selection, threshold: nextThreshold, side };
        setSelection(updatedSelection);
        void runValidation(updatedSelection);
    };

    const handleTeamChoice = (teamId: string, market: PickMarket) => {
        const updatedSelection = {
            ...selection,
            scope: "GAME_LINE" as PickScope,
            market,
            teamId,
            threshold: market === "SPREAD" ? undefined : selection.threshold,
            side: market === "SPREAD" ? undefined : selection.side,
        };
        setSelection(updatedSelection);
        if (market === "MONEYLINE") {
            void runValidation(updatedSelection);
        } else if (market === "SPREAD") {
            setStep({ kind: "GAME_SPREAD_MARGIN" });
        }
    };

    const handleSideChoice = (side: PickSide | string) => {
        setSelection((prev) => ({ ...prev, side, threshold: undefined }));
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        if (selection.market === "TOTAL_POINTS") {
            setStep({ kind: "GAME_TOTAL_THRESHOLD" });
        }
    };

    const findMoneyLineOdds = (teamId: string) => {
        if (!teamId || !oddsData?.events?.length) return null;

        const event = oddsData.events[0];
        const { teams, odds } = event;

        if (!teams || !odds?.length) return null;

        const team =
            teams.away?.id === teamId
                ? teams.away
                : teams.home?.id === teamId
                    ? teams.home
                    : null;

        if (!team) return null;

        return odds.find(
            (odd) =>
                odd.market === "Moneyline" &&
                odd.main === true &&
                odd.name === team.name
        ) || null;
    };

    const findSpreadOdds = (teamId: string) => {
        if (!teamId || !oddsData?.events?.length) return null;

        const event = oddsData.events[0];
        const { teams, odds } = event;

        if (!teams || !odds?.length) return null;
        const team =
            teams.away?.id === teamId
                ? teams.away
                : teams.home?.id === teamId
                    ? teams.home
                    : null;

        if (!team) return null;

        return odds.find(
            (odd) =>
                odd.market === "Point Spread" &&
                odd.main === true &&
                odd.selection.name === team.name
        ) || null;
    };

    const findTotalPoint = (side: string) => {
        if (!side || !oddsData?.events?.length) return null;

        const event = oddsData.events[0];
        const { teams, odds } = event;
        if (!teams || !odds?.length) return null;

        return odds.find(
            (odd) =>
                odd.market === "Total Points" &&
                odd.main === true &&
                odd.selection.side === side
        ) || null;
    };

    const marketWisePassingPlayers = (players: PassingPropsObject[] | null, market: PickMarket) => {
        if (!market && !players) return;
        if (!players?.length) return;
        const marketType =
            market === "PASSING_YARDS" ? "Player Passing Yards" :
                market === "PASSING_TDS" ? "Player Passing Touchdowns" :
                    market === "PASSING_RUSHING_YARDS" ? "Player Passing + Rushing Yards" :
                        null;
        if (!marketType) return;

        const eligiblePlayers = players.filter((player) => player.market === marketType);
        return eligiblePlayers;
    }

    const marketWiseReceivingPlayers = (players: ReceivingPropsObject[] | null, market: PickMarket) => {
        if (!market && !players) return;
        if (!players?.length) return;
        const marketType =
            market === "RECEIVING_YARDS" ? "Player Receiving Yards" :
                market === "RECEPTIONS" ? "Player Receptions" :
                    null;
        if (!marketType) return;

        const eligiblePlayers = players.filter((player) => player.market === marketType);
        return eligiblePlayers;
    }

    const marketWiseRushingPlayers = (players: RushingPropsObject[] | null, market: PickMarket) => {
        if (!market && !players) return;
        if (!players?.length) return;
        const marketType =
            market === "RUSHING_YARDS" ? "Player Rushing Yards" :
                market === "RUSHING_ATTEMPTS" ? "Player Rushing Attempts" :
                    market === "RUSHING_RECEIVING_YARDS" ? "Player Rushing + Receiving Yards" :
                        null;
        if (!marketType) return;

        const eligiblePlayers = players.filter((player) => player.market === marketType);
        return eligiblePlayers;
    };

    const marketWiseTDScorerPlayers = (players: TouchDownPropsObject[] | null, market: PickMarket): TouchDownPropsObject[] => {
        if (!players?.length || !market) return [];

        const marketTypes = {
            RECEIVING_TDS: ["Player Touchdowns", "First Touchdown Scorer", "Last Touchdown Scorer"],
            RUSHING_ATTEMPTS: ["First Touchdown Scorer"],
            RUSHING_RECEIVING_YARDS: ["Last Touchdown Scorer"],
        };

        const allowedMarkets = marketTypes[market as keyof typeof marketTypes];
        if (!allowedMarkets) return [];

        const targetMarkets = Array.isArray(allowedMarkets) ? allowedMarkets : [allowedMarkets];

        return players.filter((player) =>
            typeof player.market === "string" && targetMarkets.includes(player.market)
        );
    };

    const mockValidationFromSelection = (payload: ValidatePickRequest): ValidatePickResponse => {
        const baseOdds = payload.market === "MONEYLINE" ? -120 : -110;
        const threshold = payload.price ?? 0;

        if (["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) && threshold < 20) {
            return {
                status: "TOO_SAFE",
                suggestedThresholds: [40, 50, 60],
                difficultyTier: 1,
            };
        }

        if (["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) && threshold > 350) {
            return {
                status: "TOO_CRAZY",
                suggestedThresholds: [90, 110, 130],
                difficultyTier: 5,
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
                : payload.price
                    ? payload.price
                    : baseOdds + Math.round(Math.random() * 120);
        const tier = tierFromAmericanOdds(americanOdds);
        return {
            status: "VALID",
            bookOdds: [{ book: "MockBook", americanOdds }],
            bestOffer: { book: "MockBook", americanOdds },
            difficultyTier: tier,
            points: pointsByTier[tier],
            links: payload.links,
        };
    };

    const runValidation = async (state: BuilderSelection) => {
        setManualTier(undefined);

        if (!state.scope || !state.market || !state.gameId) return;
        const game = findGame(state.gameId);
        const gameIsEligible =
            game &&
            filterEligibleGames([game], slip.pick_deadline_at, windowDays).length > 0;
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

        const payload: ValidatePickRequest = {
            scope: state.scope,
            market: state.market,
            gameId: state.gameId,
            teamId: state.teamId,
            playerId: state.playerId,
            side: state.side === "Over" ? "OVER" : state.side === "Under" ? "UNDER" : undefined,
            price: state.price,
            threshold: state.threshold,
            links: state.links,
            groupId: group?.id,
            contestId: slip?.id,
            userId: currentUser?.userId,
            external_pick_key: state?.external_pick_key,
        };

        setValidation({ status: "loading", response: undefined, error: null });
        try {
            if (!state.external_pick_key || !state.gameId) {
                setToast({
                    id: Date.now(),
                    type: "error",
                    message: "Failed to validate pick. Please try again.",
                    duration: 3000,
                })
                throw new Error("Validation failed");
            }
            // const validatePickPayload = {
            //     external_pick_key: state?.external_pick_key,
            //     gameId: state.gameId,
            // };
            // dispatch(validateMyPickRequest(validatePickPayload))
            const response = await fetch(`api/pick/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                setToast({
                    id: Date.now(),
                    type: "error",
                    message: "Failed to validate pick. Please try again.",
                    duration: 3000,
                })
                throw new Error("Validation failed");
            }
            const data = (await response.json()) as ValidatePickResponse;
            setValidation({ status: "resolved", response: data, error: null });
            if (data.status === "VALID" || data.status === "NO_MARKET" || data.status === "API_ERROR") {
                setStep({ kind: "CONFIRMATION" });
            }
        } catch {
            const fallback = mockValidationFromSelection(payload);
            setValidation({
                status: "resolved",
                response: fallback,
                error: "Live odds unavailable. Using fallback suggestions.",
            });
            if (fallback.status === "VALID" || fallback.status === "NO_MARKET" || fallback.status === "API_ERROR" || fallback.status === "TOO_SAFE" || fallback.status === "TOO_CRAZY") {
                setStep({ kind: "CONFIRMATION" });
            }
        }
    };

    const validationStatus = validation.response?.status;
    const validationSuggestions = validation.response?.suggestedThresholds ?? [];

    const handleSubmitPick = async () => {
        const summary = buildSummary(selection, customDescription);

        // Require at least some description
        if (!summary.trim()) return;

        const autoTier =
            validation.response?.difficultyTier ??
            (validation.response?.bestOffer?.americanOdds
                ? tierFromAmericanOdds(validation.response.bestOffer.americanOdds)
                : undefined);

        const effectiveTier = manualTier ?? autoTier;
        if (!effectiveTier) {
            setToast({
                id: Date.now(),
                type: "info",
                message: "Please select a difficulty tier before submitting your pick.",
                duration: 3000,
            })
            return;
        }
        const points =
            validation.response?.points ??
            (effectiveTier ? pointsByTier[effectiveTier] : 0);

        const oddsBracket = bracketFromTier(effectiveTier);

        // const difficultyLabel = slip.isGraded ? null : tierLabelFromTier(effectiveTier);
        const difficultyLabel = tierLabelFromTier(effectiveTier);

        onSave({
            description: summary,
            odds_bracket: oddsBracket,
            points,
            scope: selection.scope,
            market: selection.market,
            side: selection.side === "Over" ? "OVER" : selection.side === "Under" ? "UNDER" : undefined,
            threshold: selection.threshold,
            gameId: selection.gameId,
            week: selection.week,
            teamId: selection.teamId,
            playerId: selection.playerId,
            difficultyTier: effectiveTier,
            bestOffer: validation.response?.bestOffer,
            bookOdds: validation.response?.bookOdds,
            validationStatus: validation.response?.status,
            difficulty_label: difficultyLabel,
            buildMode,
            sport: sport,
            external_pick_key: selection.external_pick_key,
        });

        resetFlow();
    };

    const renderCustomIdeaCard = () => (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Got something different?</p>
                {customError && <span className="text-[11px] text-rose-200">{customError}</span>}
            </div>
            <p className="mt-1 text-xs text-gray-400">
                If your idea doesn’t fit Game Lines or Player Props, type it here.
            </p>
            <textarea
                value={customDescription}
                onChange={(event) => {
                    setCustomDescription(event.target.value);
                    if (customError) setCustomError(null);
                }}
                placeholder="Example: First half passing yards · Team 3 punt return TD"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:opacity-50"
                rows={3}
                disabled={locked}
            />
            <button
                type="button"
                className="mt-3 rounded-full border border-emerald-300/60 bg-emerald-500/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={locked}
                onClick={() => {
                    void handleCustomIdea();
                }}
            >
                Try this custom idea
            </button>
        </div>
    );

    const renderGameCards = () => {
        if (eligibleGames.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    <p className="font-semibold text-white">No eligible games</p>
                    <p className="mt-1 text-xs text-gray-400">
                        Games must start after the pick deadline and within the next{" "}
                        {windowDays} day{windowDays === 1 ? "" : "s"}.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Try adjusting the pick deadline to refresh the slate.
                    </p>
                </div>
            );
        }
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {nflMatchSchedules && nflMatchSchedules.map((game) => (
                    <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                            handleGameChoice(game)
                        }}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-emerald-500/10 p-4 text-left text-white transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={locked}
                    >
                        <div className="flex items-center justify-between text-sm font-semibold text-white">
                            <span>
                                {game.teams.away.abbreviation} @ {game.teams.home.abbreviation}
                            </span>
                            <span className="text-xs text-emerald-200">
                                {formatDateTime(game.date)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-300">
                            Picks lock when this game starts.
                        </p>
                    </button>
                ))}
            </div>
        )
    };

    const renderGameEntryStep = () => (
        <>
            {loading ? (
                <div className="inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-48 max-w-[70vw] sm:w-60">
                        <FootballAnimation />
                    </div>
                </div>
            ) : (
                <div className="grid gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white">Choose a matchup</h4>
                            <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                Game lines + props
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Eligible games start after the pick deadline and before{" "}
                            {formatDateTime(eligibilityWindowEnd ?? "")}.
                        </p>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                            {renderGameCards()}
                        </div>
                    </div>
                    {renderCustomIdeaCard()}
                </div>
            )}
        </>
    );

    const playerInitials = (player: string) => {
        const letters = player.replace(/[^A-Z]/g, "").slice(0, 2);
        if (letters.length > 0) return letters;
        return player.slice(0, 2).toUpperCase();
    };

    const handleBackToGames = () => {
        setStep({ kind: "GAME_SELECT" });
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        setSelection((prev) => ({
            ...prev,
            scope: undefined,
            gameId: undefined,
            teamId: undefined,
            playerId: undefined,
            market: undefined,
            side: undefined,
            threshold: undefined,
            player: undefined,
        }));
        setGameDetailTab("GAME_LINES");
        setPassingMarket("PASSING_YARDS");
        setReceivingMarket("RECEIVING_YARDS");
        setRushingMarket("RUSHING_YARDS");
    };

    const handleTabChange = (tab: GameDetailTab) => {
        setGameDetailTab(tab);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        setSelection((prev) => ({
            ...prev,
            scope: tab === "GAME_LINES" ? "GAME_LINE" : "PLAYER_PROP",
            market: undefined,
            teamId: undefined,
            playerId: undefined,
            side: tab === "TD_SCORER" ? "OVER" : undefined,
            threshold: undefined,
            player: undefined,
        }));
        setStep({ kind: "GAME_DETAIL" });
        setTimeout(() => {
            const container = document.querySelector('#game-detail-tabs-container') as HTMLDivElement;
            const activeTab = document.querySelector('#game-detail-tabs-container button.active') as HTMLButtonElement;

            if (container && activeTab) {
                const containerRect = container.getBoundingClientRect();
                const tabRect = activeTab.getBoundingClientRect();

                const scrollLeft = container.scrollLeft;
                const offset = tabRect.left - containerRect.left + scrollLeft - (containerRect.width / 2) + (tabRect.width / 2);

                container.scrollTo({
                    left: offset,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleGameLineMarketSelect = (market: PickMarket) => {
        if (!selection.gameId) return;
        setGameDetailTab("GAME_LINES");
        setSelection((prev) => ({
            ...prev,
            scope: "GAME_LINE",
            market,
            teamId: undefined,
            playerId: undefined,
            threshold: undefined,
            side: undefined,
            player: undefined,
        }));
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        if (market === "MONEYLINE") setStep({ kind: "GAME_MONEYLINE_TEAM" });
        if (market === "SPREAD") setStep({ kind: "GAME_SPREAD_TEAM" });
        if (market === "TOTAL_POINTS") setStep({ kind: "GAME_TOTAL_SIDE" });
    };

    const startPlayerThresholdFlow = (
        player: PassingPropsObject | ReceivingPropsObject | RushingPropsObject,
        market: PickMarket,
        tab: GameDetailTab
    ) => {
        setGameDetailTab(tab);
        setSelection({
            scope: "PLAYER_PROP",
            gameId: activeGame?.id,
            playerId: player.playerId,
            market,
            side: "OVER",
            threshold: undefined,
            teamId: undefined,
            player: {
                id: player.playerId,
                name: player.playerName,
                position: player.position,
                team: player.team.name,
            }
        });
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        setStep({ kind: "PLAYER_SELECT_THRESHOLD" });
    };

    const tdMarketForPosition = (position: NFLPlayer["position"]): PickMarket => {
        if (position === "QB") return "PASSING_TDS";
        if (position === "RB") return "RUSHING_TDS";
        return "RECEIVING_TDS";
    };

    const handleTdChipSelection = (player: TouchDownPropsObject, threshold: number) => {
        const market = tdMarketForPosition(player.position);
        const updatedSelection: BuilderSelection = {
            scope: "PLAYER_PROP",
            gameId: selection.gameId ?? activeGame?.id,
            playerId: player.playerId,
            market,
            side: "OVER",
            threshold,
            teamId: undefined,
            player: {
                id: player.playerId,
                name: player.playerName,
                position: player.position,
            }
        };
        setGameDetailTab("TD_SCORER");
        setSelection(updatedSelection);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        setStep({ kind: "GAME_DETAIL" });
        void runValidation(updatedSelection);
    };

    const handleQuickPlayerPick = (
        player: PassingPropsObject | ReceivingPropsObject | RushingPropsObject | TouchDownPropsObject,
        market: PickMarket,
        threshold: number,
        side: string = "OVER",
        price?: number,
        links?: {
            desktop: string;
            mobile: string;
        },
        external_pick_key?: string,
    ) => {
        const payload: BuilderSelection = {
            scope: "PLAYER_PROP",
            gameId: selection.gameId ?? activeGame?.id,
            playerId: player.playerId,
            market,
            side,
            threshold,
            teamId: undefined,
            player: {
                id: player.playerId,
                name: player.playerName,
                position: player.position,
            },
            price,
            links,
            external_pick_key,
        };
        setSelection(payload);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        setCustomThreshold("");
        setStep({ kind: "GAME_DETAIL" });
        void runValidation(payload);
    };

    const handleQuickGameLinePick = (
        market: PickMarket,
        config: { teamId?: string; side?: string; threshold?: number, pick_key?: string }
    ) => {
        const gameId = selection.gameId ?? activeGame?.id;
        if (!gameId) return;
        const payload: BuilderSelection = {
            scope: "GAME_LINE",
            market,
            gameId,
            teamId: config.teamId,
            side: config.side,
            threshold: config.threshold,
            playerId: undefined,
            player: undefined,
            external_pick_key: config.pick_key ?? undefined,
        };
        setSelection(payload);
        setValidation({ status: "idle", response: undefined, error: null });
        setManualTier(undefined);
        void runValidation(payload);
    };

    const renderGameDetailShell = (children: ReactNode) => {
        if (!activeGame) return null;
        const tabs: { key: GameDetailTab; label: string }[] = [
            { key: "GAME_LINES", label: "Game Lines" },
            { key: "PASSING", label: "Passing Props" },
            { key: "RECEIVING", label: "Receiving Props" },
            { key: "RUSHING", label: "Rushing Props" },
            { key: "TD_SCORER", label: "TD Scorer Props" },
        ];

        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-left text-sm text-white">
                        <p className="font-semibold">
                            {activeGame.teams.away.abbreviation} @ {activeGame.teams.home.abbreviation}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                            {formatDateTime(activeGame.date)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleBackToGames}
                        className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/60"
                    >
                        Back to games
                    </button>
                </div>

                <div
                    id="game-detail-tabs-container"
                    className="flex gap-3 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide"
                >
                    {tabs.map((tab) => {
                        const isActive = gameDetailTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleTabChange(tab.key)}
                                className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
                                    ? "border-emerald-300 text-emerald-100 active"
                                    : "border-transparent text-gray-400 hover:text-white"
                                    }`}
                                disabled={locked}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-4">{children}</div>
            </div>
        );
    };

    const renderPlayerOddsBoard = (
        market: PickMarket,
        label: string,
        eligiblePlayers: TouchDownPropsObject[] | null,
        columns: { label: string; key: string }[],
    ) => {
        const playerColWidth = isMobile ? "w-[150px]" : "w-[230px]";
        // const rowHeight = isMobile ? "h-[60px]" : "h-[72px]";
        const pickMinWidth = isMobile ? 70 : 90;
        const nameTextSize = isMobile ? "text-xs" : "text-sm";

        if (eligiblePlayers?.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No {label.toLowerCase()} available for this matchup yet.
                </div>
            );
        }

        const template = `1.6fr repeat(${columns.length}, minmax(0,1fr))`;

        return (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/70 shadow-lg shadow-emerald-500/5">
                <div
                    className="grid items-center bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-400"
                    style={{ gridTemplateColumns: template }}
                >
                    <div className={`px-4 py-3 ${playerColWidth}`}>Player</div>
                    {columns.map((column) => (
                        <div key={column.label} className={`px-4 py-3 text-center ${pickMinWidth}`}>
                            {column.label}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-white/5">
                    {eligiblePlayers && eligiblePlayers.map((player) => (
                        <div
                            key={player.playerId}
                            className="grid items-stretch text-sm"
                            style={{ gridTemplateColumns: template }}
                        >
                            {/** Allow per-player markets so TD props can map to position-specific lines */}
                            <div className={`flex items-center gap-3 px-3 py-3 ${playerColWidth}`}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                    {player.playerName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className={`truncate font-semibold text-white ${nameTextSize}`}>{player.playerName}</p>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        {player.position} · {player.team.abbreviation}
                                    </p>
                                </div>
                            </div>
                            {columns.map((column) => {
                                // const rowMarket = marketResolver ? marketResolver(player.player?.position) : market;
                                const rowMarket = market;

                                // const oddsValue = syntheticOddsForThreshold(rowMarket, column.threshold);
                                const oddsValue =
                                    column.key === "Over" ? player.picks.over :
                                        column.key === "Under" ? player.picks.under :
                                            column.key === "Anytime" ? player.picks.anytime :
                                                column.key === "First" ? player.picks.first :
                                                    column.key === "Last" ? player.picks.last :
                                                        null;
                                const oddsData = oddsValue ? formatOdds(oddsValue ? Number(oddsValue.price) : undefined) : null;

                                const isActive =
                                    selection.playerId === player.playerId &&
                                    selection.market === rowMarket &&
                                    selection.threshold === (label === "TD Scorer" && oddsValue ? Number(oddsValue.price) : player.line) &&
                                    (selection.side ?? "OVER") === (column.label ?? "OVER");

                                return (
                                    <button
                                        key={`${player.playerId}-${column.label}`}
                                        type="button"
                                        onClick={() => {
                                            const price =
                                                label === "TD Scorer" && oddsValue
                                                    ? Number(oddsValue.price)
                                                    : player.line;

                                            const validKeys = ["Over", "Under", "Anytime", "First", "Last"];
                                            const pickLabel = validKeys.includes(column.key)
                                                ? column.label
                                                : "OVER";

                                            if (price && pickLabel) {
                                                handleQuickPlayerPick(
                                                    player,
                                                    rowMarket,
                                                    price,
                                                    pickLabel,
                                                    oddsValue?.price ? Number(oddsValue.price) : undefined,
                                                    oddsValue?.links,
                                                    oddsValue?.id
                                                );
                                            }
                                        }}
                                        className={`${pickMinWidth} group flex h-full flex-col items-center justify-center border-l border-white/5 px-2 py-3 text-center transition ${isActive
                                            ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-50 shadow-[0_10px_30px_-18px_rgba(52,211,153,0.9)]"
                                            : "hover:bg-white/5"
                                            }`}
                                        disabled={locked || !oddsData}
                                    >
                                        {label !== "TD Scorer" && (
                                            <span className="text-[11px] uppercase tracking-wide text-gray-400 transition group-hover:text-gray-200">
                                                {column.label.slice(0, 1).toUpperCase()}{" "}{player.line}
                                            </span>
                                        )}
                                        <span className="text-sm font-semibold text-emerald-200">
                                            {oddsData ? oddsData : "—"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCommonPlayerOddsBoard = (
        eligiblePlayers: ReceivingPropsObject[] | PassingPropsObject[] | RushingPropsObject[] | undefined,
        market: PickMarket,
        label: string,
    ) => {
        const playerColWidth = isMobile ? "w-[150px]" : "w-[230px]";
        const rowHeight = isMobile ? "h-[60px]" : "h-[72px]";
        const pickMinWidth = isMobile ? 70 : 90;
        const nameTextSize = isMobile ? "text-xs" : "text-sm";

        if (!eligiblePlayers || eligiblePlayers.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                    No {label.toLowerCase()} available for this matchup yet.
                </div>
            );
        }

        // const template = `1.6fr repeat(${columnConfig.length}, minmax(0,1fr))`;
        const maxPicks = Math.max(
            ...eligiblePlayers.map((p) => p.picks.length),
            0
        );

        return (
            <div className="overflow-hidden rounded-2xl p-0.5 border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/70 shadow-lg shadow-emerald-500/5">
                <div className="flex w-full">
                    <div className={`sticky left-0 z-20 shrink-0 border-r border-white/10 bg-black/70 ${playerColWidth}`}>
                        {eligiblePlayers.map((player) => (
                            <div
                                key={player.playerId}
                                className={`flex ${rowHeight} border-b border-white/5 items-center gap-2 px-2`}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase text-emerald-100">
                                    {playerInitials(player.playerName)}
                                </div>

                                <div className="min-w-0">
                                    <p
                                        className={`truncate font-semibold text-white ${nameTextSize}`}
                                        title={player.playerName}
                                    >
                                        {player.playerName}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        {player.position} · {player.team.abbreviation}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-x-auto overscroll-x-contain">
                        <div
                            className="grid"
                            style={{
                                gridTemplateColumns: `repeat(${maxPicks}, minmax(${pickMinWidth}px, 1fr))`
                            }}
                        >
                            {eligiblePlayers.map((player) =>
                                Array.from({ length: maxPicks }).map((_, colIndex) => {
                                    const pick = player.picks[colIndex];

                                    const isActive =
                                        !!pick &&
                                        selection.playerId === player.playerId &&
                                        selection.market === market &&
                                        selection.threshold === pick.line &&
                                        (selection.side ?? "OVER") === (pick.side.toUpperCase() ?? "OVER");

                                    const oddsData = pick?.price
                                        ? formatOdds(Number(pick.price))
                                        : "—";

                                    return (
                                        <button
                                            key={`${player.playerId}-${colIndex}`}
                                            onClick={() => {
                                                const line = pick.line ? Number(pick.line) : 0;
                                                const pickLabel = pick.side === "Over" ? "OVER" : "UNDER";
                                                if (line && pickLabel) {
                                                    handleQuickPlayerPick(
                                                        player,
                                                        market,
                                                        line,
                                                        pickLabel,
                                                        pick.price ? Number(pick.price) : undefined,
                                                        pick.links,
                                                        pick.id
                                                    );
                                                }
                                            }}
                                            type="button"
                                            disabled={!pick || locked}
                                            className={`flex ${rowHeight} flex-col items-center justify-center border-r border-b border-white/5 px-2 text-center transition
                                                ${pick
                                                    ? isActive
                                                        ? "bg-emerald-500/10 text-emerald-50 shadow-[0_6px_20px_-10px_rgba(52,211,153,0.8)]"
                                                        : "hover:bg-white/5"
                                                    : "cursor-default text-gray-600"
                                                }
                                            `}
                                        >
                                            {pick ? (
                                                <>
                                                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                                        {pick.side.slice(0, 1)} {pick.line}
                                                    </span>
                                                    <span className="text-sm font-semibold text-emerald-200">
                                                        {oddsData}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm">—</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // const renderRushingPlayerOddsBoard = (
    //     players: RushingPropsObject[] | null,
    //     market: PickMarket,
    //     label: string,
    //     // _columns?: { label: string; threshold: number; side?: PickSide }[],
    //     // _marketResolver?: (player: NFLPlayer["position"]) => PickMarket
    // ) => {
    //     const playerColWidth = isMobile ? "w-[150px]" : "w-[230px]";
    //     const rowHeight = isMobile ? "h-[60px]" : "h-[72px]";
    //     const pickMinWidth = isMobile ? 70 : 90;
    //     const nameTextSize = isMobile ? "text-xs" : "text-sm";

    //     const eligiblePlayers = marketWiseRushingPlayers(players, market);

    //     if (!eligiblePlayers || eligiblePlayers.length === 0) {
    //         return (
    //             <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
    //                 No {label.toLowerCase()} available for this matchup yet.
    //             </div>
    //         );
    //     }

    //     const maxPicks = Math.max(
    //         ...eligiblePlayers.map((p) => p.picks.length),
    //         0
    //     );

    //     return (
    //         <div className="overflow-hidden rounded-2xl p-0.5 border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/70 shadow-lg shadow-emerald-500/5">
    //             <div className="flex w-full">
    //                 <div className={`sticky left-0 z-20 shrink-0 border-r border-white/10 bg-black/70 ${playerColWidth}`}>
    //                     {eligiblePlayers.map((player) => (
    //                         <div
    //                             key={player.playerId}
    //                             className={`flex ${rowHeight} border-b border-white/5 items-center gap-2 px-2`}
    //                         >
    //                             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase text-emerald-100">
    //                                 {playerInitials(player.playerName)}
    //                             </div>

    //                             <div className="min-w-0">
    //                                 <p className={`truncate font-semibold text-white ${nameTextSize}`} >
    //                                     {player.playerName}
    //                                 </p>
    //                                 <p className="text-[11px] uppercase tracking-wide text-gray-400">
    //                                     {player.position} · {player.team.abbreviation}
    //                                 </p>
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>

    //                 <div className="flex-1 overflow-x-auto overscroll-x-contain">
    //                     <div
    //                         className="grid"
    //                         style={{
    //                             gridTemplateColumns: `repeat(${maxPicks}, minmax(${pickMinWidth}px, 1fr))`
    //                         }}
    //                     >
    //                         {eligiblePlayers.map((player) =>
    //                             Array.from({ length: maxPicks }).map((_, colIndex) => {
    //                                 const pick = player.picks[colIndex];

    //                                 const isActive =
    //                                     !!pick &&
    //                                     selection.playerId === player.playerId &&
    //                                     selection.market === market &&
    //                                     selection.threshold === pick.line &&
    //                                     (selection.side ?? "OVER") === (pick.side.toUpperCase() ?? "OVER");

    //                                 const oddsData = pick?.price
    //                                     ? formatOdds(Number(pick.price))
    //                                     : "—";

    //                                 return (
    //                                     <button
    //                                         key={`${player.playerId}-${colIndex}`}
    //                                         onClick={() => {
    //                                             const line = pick.line ? Number(pick.line) : 0;
    //                                             const pickLabel = pick.side === "Over" ? "OVER" : "UNDER";
    //                                             if (line && pickLabel) {
    //                                                 handleQuickPlayerPick(
    //                                                     player,
    //                                                     market,
    //                                                     line,
    //                                                     pickLabel,
    //                                                     pick.price ? Number(pick.price) : undefined,
    //                                                     pick.links
    //                                                 );
    //                                             }
    //                                         }}
    //                                         type="button"
    //                                         disabled={!pick || locked}
    //                                         className={`flex ${rowHeight} flex-col items-center justify-center border-r border-b border-white/5 px-2 text-center transition
    //                                             ${pick
    //                                                 ? isActive
    //                                                     ? "bg-emerald-500/10 text-emerald-50 shadow-[0_6px_20px_-10px_rgba(52,211,153,0.8)]"
    //                                                     : "hover:bg-white/5"
    //                                                 : "cursor-default text-gray-600"
    //                                             }
    //                                         `}
    //                                     >
    //                                         {pick ? (
    //                                             <>
    //                                                 <span className="text-[11px] uppercase tracking-wide text-gray-400">
    //                                                     {pick.side.slice(0, 1)} {pick.line}
    //                                                 </span>
    //                                                 <span className="text-sm font-semibold text-emerald-200">
    //                                                     {oddsData}
    //                                                 </span>
    //                                             </>
    //                                         ) : (
    //                                             <span className="text-sm">—</span>
    //                                         )}
    //                                     </button>
    //                                 );
    //                             })
    //                         )}
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // };

    // const renderTDScorerPlayerOddsBoard = (
    //     players: TouchDownPropsObject[] | null,
    //     market: PickMarket,
    //     label: string,
    //     columns?: { label: string; threshold: number; side?: PickSide }[],
    //     marketResolver?: (player: NFLPlayer["position"]) => PickMarket
    // ) => {
    //     const columnConfig = [
    //         {
    //             label: "ANY TIME",
    //             key: 'Anytime'
    //         },
    //         {
    //             label: "FIRST",
    //             key: 'First'
    //         },
    //         {
    //             label: "LAST",
    //             key: 'Last'
    //         }
    //     ]

    //     const eligiblePlayers = marketWiseTDScorerPlayers(players, market)

    //     if (eligiblePlayers?.length === 0) {
    //         return (
    //             <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
    //                 No {label.toLowerCase()} available for this matchup yet.
    //             </div>
    //         );
    //     }

    //     const template = `1.6fr repeat(${columnConfig.length}, minmax(0,1fr))`;

    //     return (
    //         <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/70 shadow-lg shadow-emerald-500/5">
    //             <div
    //                 className="grid items-center bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-400"
    //                 style={{ gridTemplateColumns: template }}
    //             >
    //                 <div className="px-4 py-3">Player</div>
    //                 {columnConfig.map((column) => (
    //                     <div key={column.label} className="px-4 py-3 text-center">
    //                         {column.label}
    //                     </div>
    //                 ))}
    //             </div>
    //             <div className="divide-y divide-white/5">
    //                 {eligiblePlayers && eligiblePlayers.map((player) => (
    //                     <div
    //                         key={player.playerId}
    //                         className="grid items-stretch text-sm"
    //                         style={{ gridTemplateColumns: template }}
    //                     >
    //                         {/** Allow per-player markets so TD props can map to position-specific lines */}
    //                         <div className="flex items-center gap-3 px-3 py-3">
    //                             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
    //                                 {player.playerName.slice(0, 2).toUpperCase()}
    //                             </div>
    //                             <div>
    //                                 <p className="font-semibold text-white">{player.playerName}</p>
    //                                 <p className="text-[11px] uppercase tracking-wide text-gray-400">
    //                                     {player.position} · {player.team.abbreviation}
    //                                 </p>
    //                             </div>
    //                         </div>
    //                         {columnConfig.map((column) => {
    //                             // const rowMarket = marketResolver ? marketResolver(player.player?.position) : market;
    //                             const rowMarket = market;

    //                             // const oddsValue = syntheticOddsForThreshold(rowMarket, column.threshold);
    //                             const oddsValue =
    //                                 column.key === "Anytime" ? player.picks.anytime :
    //                                     column.key === "First" ? player.picks.first :
    //                                         column.key === "Last" ? player.picks.last :
    //                                             null;

    //                             const isActive =
    //                                 selection.playerId === player.playerId &&
    //                                 selection.market === rowMarket &&
    //                                 selection.threshold === Number(oddsValue?.price) &&
    //                                 (selection.side ?? "OVER") === (column.label ?? "OVER");

    //                             const oddsData = oddsValue ? formatOdds(oddsValue ? Number(oddsValue.price) : undefined) : null;
    //                             return (
    //                                 <button
    //                                     key={`${player.playerId}-${column.label}`}
    //                                     type="button"
    //                                     onClick={() => {
    //                                         handleQuickPlayerPick(
    //                                             player,
    //                                             rowMarket,
    //                                             Number(oddsValue?.price),
    //                                             column.label
    //                                         )
    //                                     }}
    //                                     className={`group flex h-full flex-col items-center justify-center border-l border-white/5 px-2 py-3 text-center transition ${isActive
    //                                         ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-50 shadow-[0_10px_30px_-18px_rgba(52,211,153,0.9)]"
    //                                         : "hover:bg-white/5"
    //                                         }`}
    //                                     disabled={locked || !oddsData}
    //                                 >
    //                                     <span className="text-sm font-semibold text-emerald-200">
    //                                         {oddsData ? oddsData : "—"}
    //                                     </span>
    //                                 </button>
    //                             );
    //                         })}
    //                     </div>
    //                 ))}
    //             </div>
    //         </div>
    //     );
    // };

    const renderGameLinesOdds = () => {
        if (!activeGame) return null;

        const template = "1.4fr repeat(3, minmax(0,1fr))";
        const spreadBase = 3 + (Math.abs(activeGame.id.length) % 4);

        const homeTeamMoneyLine = findMoneyLineOdds(activeGame.teams.home.id)
        const awayTeamMoneyLine = findMoneyLineOdds(activeGame.teams.away.id)

        const overTotalPointOdd = findTotalPoint("Over");
        const underTotalPointOdd = findTotalPoint("Under");

        const teams = [
            {
                id: activeGame.teams.away.id,
                label: activeGame.teams.away.abbreviation,
                side: "away",
                spread: spreadBase,
                lean: "dog" as const,
                moneyline: Number(awayTeamMoneyLine?.price),
                money_line_key: awayTeamMoneyLine?.id,
                totalPoint: overTotalPointOdd,
            },
            {
                id: activeGame.teams.home.id,
                label: activeGame.teams.home.abbreviation,
                side: "home",
                spread: -spreadBase,
                lean: "favorite" as const,
                moneyline: Number(homeTeamMoneyLine?.price),
                money_line_key: homeTeamMoneyLine?.id,
                totalPoint: underTotalPointOdd,
            },
        ];

        return (
            <>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/70 shadow-lg shadow-emerald-500/5">
                    <div
                        className="grid items-center bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-400"
                        style={{ gridTemplateColumns: template }}
                    >
                        <div className="px-4 py-3">Market</div>
                        <div className="px-4 py-3 text-center">Moneyline</div>
                        <div className="px-4 py-3 text-center">Spread</div>
                        <div className="px-4 py-3 text-center">Totals</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {teams.map((team) => {
                            const moneyLineOdds = team.moneyline ?? "-";
                            const spread = findSpreadOdds(team.id);

                            const spreadLabel = spread?.selection?.line && spread?.selection?.line > 0 ? `+${spread?.selection?.line}` : `${spread?.selection?.line}`;

                            const isMoneylineActive =
                                selection.market === "MONEYLINE" && selection.teamId === team.id;
                            const isSpreadActive =
                                selection.market === "SPREAD" &&
                                selection.teamId === team.id &&
                                selection.threshold === team.spread;

                            const isActive =
                                selection.market === "TOTAL_POINTS" &&
                                selection.side === team.totalPoint?.selection.side &&
                                selection.threshold === team.totalPoint?.selection.line;

                            return (
                                <div
                                    key={team.id}
                                    className="grid items-stretch text-sm"
                                    style={{ gridTemplateColumns: template }}
                                >
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                            <span className="tracking-wide">
                                                {team.label.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{team.label}</p>
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                                {team.side === "home" ? "Home" : "Away"}
                                                {!isMobile && `${" · "}${activeGame.teams.away.abbreviation} @${" "}${activeGame.teams.home.abbreviation}`}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleQuickGameLinePick("MONEYLINE", { teamId: team.id, pick_key: team.money_line_key })}
                                        className={`flex items-center justify-center border-l border-white/5 px-3 py-3 text-center transition ${isMoneylineActive
                                            ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-50"
                                            : "hover:bg-white/5"
                                            }`}
                                        disabled={locked}
                                    >
                                        <div className="text-sm font-semibold text-emerald-200">
                                            {formatOdds(moneyLineOdds)}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleQuickGameLinePick("SPREAD", {
                                                teamId: team.id,
                                                threshold: team.spread,
                                                pick_key: spread?.id,
                                            })
                                        }
                                        className={`flex flex-col items-center justify-center border-l border-white/5 px-3 py-3 text-center transition ${isSpreadActive
                                            ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-50"
                                            : "hover:bg-white/5"
                                            }`}
                                        disabled={locked}
                                    >
                                        <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {spreadLabel ?? "—"}
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-200">
                                            {formatOdds(Number(spread?.price))}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (team.id && team.totalPoint?.selection.side && team.totalPoint?.selection.line) {
                                                handleQuickGameLinePick("TOTAL_POINTS", {
                                                    teamId: team.id,
                                                    side: team.totalPoint?.selection.side,
                                                    threshold: team.totalPoint?.selection.line,
                                                    pick_key: team.totalPoint?.id,
                                                })
                                            }
                                        }}
                                        className={`flex flex-col items-center justify-center border-l border-white/5 px-3 py-3 text-center transition ${isActive
                                            ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-50"
                                            : "hover:bg-white/5"
                                            }`}
                                        disabled={locked}
                                    >
                                        <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {isMobile ? team.totalPoint?.selection.side?.slice(0, 1).toUpperCase() : team.totalPoint?.selection.side}{" "}{team.totalPoint?.selection.line}
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-200">
                                            {formatOdds(Number(team.totalPoint?.price))}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {validation.status !== "idle" && renderValidationNotice()}
            </>
        );
    };

    const renderGameLinesFlow = () => {
        if (buildMode === "ODDS") {
            return (
                <div className="flex flex-col gap-3">
                    {renderGameLinesOdds()}
                    {validation.status !== "idle" && renderValidationNotice()}
                </div>
            );
        }

        switch (step.kind) {
            case "GAME_MONEYLINE_TEAM":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-semibold text-white">Who wins this game?</p>
                        {renderTeamButtons("MONEYLINE")}
                        {renderValidationNotice()}
                    </div>
                );
            case "GAME_SPREAD_TEAM":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-semibold text-white">Which side do you want?</p>
                        {renderTeamButtons("SPREAD")}
                    </div>
                );
            case "GAME_SPREAD_MARGIN":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-semibold text-white">
                            Choose the spread for{" "}
                            {selection.teamId && activeGame
                                ? selection.teamId === activeGame.teams.home.id
                                    ? activeGame.teams.home.abbreviation
                                    : activeGame.teams.away.abbreviation
                                : "this team"}
                            .
                        </p>
                        {renderSpreadMargins()}
                        {renderValidationNotice()}
                    </div>
                );
            case "GAME_TOTAL_SIDE":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-semibold text-white">
                            Do you think this game will go over or under?
                        </p>
                        {renderTotalPoints()}
                        {renderValidationNotice()}
                    </div>
                );
            case "GAME_TOTAL_THRESHOLD":
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-semibold text-white">Total points in this game:</p>
                        {renderTotalPoints()}
                        {renderValidationNotice()}
                    </div>
                );
            default:
                return renderGameLineChooser();
        }
    };

    const renderPassingPropsTab = () => {
        if (!selection.gameId) return null;
        const options: { key: PassingMarket; label: string; market: PickMarket }[] = [
            { key: "PASSING_YARDS", label: "Passing Yards", market: "PASSING_YARDS" },
            { key: "PASSING_TDS", label: "Passing TDs", market: "PASSING_TDS" },
            {
                key: "PASSING_RUSHING_YARDS",
                label: "Pass + Rush Yds",
                market: "PASSING_RUSHING_YARDS",
            },
        ];

        const activeOption = options.find((option) => option.key === passingMarket) ?? options[0];

        const eligiblePlayers = marketWisePassingPlayers(passingPlayers, activeOption.market)

        return (
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isActive = passingMarket === option.key;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setPassingMarket(option.key);
                                    setValidation({ status: "idle", response: undefined, error: null });
                                    setManualTier(undefined);
                                    setCustomThreshold("");
                                    setSelection((prev) => ({
                                        ...prev,
                                        scope: "PLAYER_PROP",
                                        market: undefined,
                                        playerId: undefined,
                                        threshold: undefined,
                                        side: "OVER",
                                        player: undefined,
                                    }));
                                    setStep({ kind: "GAME_DETAIL" });
                                }}
                                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
                                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                    : "border-white/10 text-gray-200 hover:border-sky-400/60"
                                    }`}
                                disabled={locked}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        {activeOption.label}
                    </p>
                </div>

                {buildMode === "ODDS" ? (
                    <>
                        {/* {renderPassingPlayerOddsBoard(
                            passingPlayers,
                            activeOption.market,
                            activeOption.label
                        )} */}
                        {renderCommonPlayerOddsBoard(
                            eligiblePlayers,
                            activeOption.market,
                            activeOption.label
                        )}
                        {validation.status !== "idle" && renderValidationNotice()}
                    </>
                ) : eligiblePlayers && eligiblePlayers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                        No passing props available for this matchup yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {eligiblePlayers && eligiblePlayers.map((player) => (
                            <button
                                key={player.playerId}
                                type="button"
                                onClick={() => startPlayerThresholdFlow(player, activeOption.market, "PASSING")}
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={locked}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                        {player.playerName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{player.playerName}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {player.position} · {player.team.abbreviation}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-emerald-100">
                                        {activeOption.label}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        Tap to build pick
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderReceivingPropsTab = () => {
        if (!selection.gameId) return null;
        const options: { key: ReceivingMarket; label: string; market: PickMarket }[] = [
            { key: "RECEIVING_YARDS", label: "Receiving Yards", market: "RECEIVING_YARDS" },
            { key: "RECEPTIONS", label: "Receptions", market: "RECEPTIONS" },
        ];

        const activeOption = options.find((option) => option.key === receivingMarket) ?? options[0];

        const eligiblePlayers = marketWiseReceivingPlayers(receivingPlayers, activeOption.market)

        return (
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isActive = receivingMarket === option.key;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setReceivingMarket(option.key);
                                    setValidation({ status: "idle", response: undefined, error: null });
                                    setManualTier(undefined);
                                    setCustomThreshold("");
                                    setSelection((prev) => ({
                                        ...prev,
                                        scope: "PLAYER_PROP",
                                        market: undefined,
                                        playerId: undefined,
                                        threshold: undefined,
                                        side: "OVER",
                                        player: undefined,
                                    }));
                                    setStep({ kind: "GAME_DETAIL" });
                                }}
                                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
                                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                    : "border-white/10 text-gray-200 hover:border-sky-400/60"
                                    }`}
                                disabled={locked}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        {activeOption.label}
                    </p>
                </div>

                {buildMode === "ODDS" ? (
                    <>
                        {/* {renderReceivingPlayerOddsBoard(
                            receivingPlayers,
                            activeOption.market,
                            activeOption.label
                        )} */}
                        {renderCommonPlayerOddsBoard(
                            eligiblePlayers,
                            activeOption.market,
                            activeOption.label
                        )}
                        {validation.status !== "idle" && renderValidationNotice()}
                    </>
                ) : eligiblePlayers && eligiblePlayers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                        No receiving props available for this matchup yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {eligiblePlayers && eligiblePlayers.map((player) => (
                            <button
                                key={player.playerId}
                                type="button"
                                onClick={() =>
                                    startPlayerThresholdFlow(player, activeOption.market, "RECEIVING")
                                }
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={locked}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                        {/* {playerInitials(player)} */}
                                        {player.playerName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{player.playerName}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {player.position} · {player.team.abbreviation}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-emerald-100">
                                        {activeOption.label}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        Tap to build pick
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderRushingPropsTab = () => {
        if (!selection.gameId) return null;
        const options: { key: RushingMarket; label: string; market: PickMarket }[] = [
            { key: "RUSHING_YARDS", label: "Rushing Yards", market: "RUSHING_YARDS" },
            { key: "RUSHING_ATTEMPTS", label: "Rush Attempts", market: "RUSHING_ATTEMPTS" },
            {
                key: "RUSHING_RECEIVING_YARDS",
                label: "Rush + Rec Yds",
                market: "RUSHING_RECEIVING_YARDS",
            },
        ];

        const activeOption = options.find((option) => option.key === rushingMarket) ?? options[0];

        const eligiblePlayers = marketWiseRushingPlayers(rushingPlayers, activeOption.market)

        return (
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isActive = rushingMarket === option.key;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setRushingMarket(option.key);
                                    setValidation({ status: "idle", response: undefined, error: null });
                                    setManualTier(undefined);
                                    setCustomThreshold("");
                                    setSelection((prev) => ({
                                        ...prev,
                                        scope: "PLAYER_PROP",
                                        market: undefined,
                                        playerId: undefined,
                                        threshold: undefined,
                                        side: "OVER",
                                        player: undefined,
                                    }));
                                    setStep({ kind: "GAME_DETAIL" });
                                }}
                                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
                                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                    : "border-white/10 text-gray-200 hover:border-sky-400/60"
                                    }`}
                                disabled={locked}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        {activeOption.label}
                    </p>
                </div>

                {buildMode === "ODDS" ? (
                    <>
                        {/* {renderRushingPlayerOddsBoard(
                            rushingPlayers,
                            activeOption.market,
                            activeOption.label
                        )} */}
                        {renderCommonPlayerOddsBoard(
                            eligiblePlayers,
                            activeOption.market,
                            activeOption.label
                        )}
                        {validation.status !== "idle" && renderValidationNotice()}
                    </>
                ) : eligiblePlayers && eligiblePlayers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                        No rushing props available for this matchup yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {eligiblePlayers && eligiblePlayers.map((player) => (
                            <button
                                key={player.playerId}
                                type="button"
                                onClick={() => startPlayerThresholdFlow(player, activeOption.market, "RUSHING")}
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={locked}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                        {player.playerName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{player.playerName}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {player.position} · {player.team.abbreviation}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-emerald-100">
                                        {activeOption.label}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        Tap to build pick
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderTdScorerTab = () => {
        if (!selection.gameId) return null;
        const columnConfig = [
            {
                label: "ANY TIME",
                key: 'Anytime'
            },
            {
                label: "FIRST",
                key: 'First'
            },
            {
                label: "LAST",
                key: 'Last'
            }
        ]

        const eligiblePlayers = marketWiseTDScorerPlayers(touchDownPlayers, "RECEIVING_TDS")
        return (
            <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        Anytime TD scorer
                    </p>
                </div>
                {buildMode === "ODDS" ? (
                    <>
                        {/* {renderTDScorerPlayerOddsBoard(
                            touchDownPlayers,
                            "RECEIVING_TDS",
                            "TD Scorer",
                            tdColumns,
                            tdMarketForPosition
                        )} */}
                        {renderPlayerOddsBoard(
                            "RECEIVING_TDS",
                            "TD Scorer",
                            eligiblePlayers as TouchDownPropsObject[],
                            columnConfig
                        )}
                        {validation.status !== "idle" && renderValidationNotice()}
                    </>
                ) : eligiblePlayers && eligiblePlayers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                        No TD markets available for this matchup yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {eligiblePlayers && eligiblePlayers.map((player) => (
                            <div
                                key={player.playerId}
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                        {playerInitials(player.playerName)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{player.playerName}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            {player.position} · {player.team.abbreviation}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3].map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => {
                                                handleTdChipSelection(player, count)
                                            }}
                                            className="rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={locked}
                                        >
                                            {count}+ TD
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                return buildMode === "ODDS"
                    ? renderGameLinesOdds()
                    : renderGameLineChooser();
            case "PASSING":
                return renderPassingPropsTab();
            case "RECEIVING":
                return renderReceivingPropsTab();
            case "RUSHING":
                return renderRushingPropsTab();
            case "TD_SCORER":
                return renderTdScorerTab();
            default:
                return renderGameLineChooser();
        }
    };

    const renderThresholdSelector = () => {
        if (!selection.market || !selection.player?.name || !selection.player?.position) return null;
        const thresholds = statThresholdsForMarket(selection.market);
        const isTD = selection.market.includes("TDS");
        const isRushRec = selection.market === "RUSHING_RECEIVING_YARDS";
        const isSkillPlayer = ["RB", "WR", "TE"].includes(selection.player?.position);
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
                        {selection.player?.name} will get?
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
                                className="text-[11px] uppercase tracking-wide text-emerald-200"
                            >
                                set
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderGameLineChooser = () => (
        <div className="grid gap-3 sm:grid-cols-3">
            <button
                type="button"
                onClick={() => handleGameLineMarketSelect("MONEYLINE")}
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-emerald-500/10 p-4 text-left transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={locked}
            >
                <h3 className="text-sm font-semibold text-white">Moneyline</h3>
                <p className="text-xs text-gray-400">Who wins the game?</p>
            </button>
            <button
                type="button"
                onClick={() => handleGameLineMarketSelect("SPREAD")}
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-emerald-500/10 p-4 text-left transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={locked}
            >
                <h3 className="text-sm font-semibold text-white">Spread</h3>
                <p className="text-xs text-gray-400">Win or lose by a margin</p>
            </button>
            <button
                type="button"
                onClick={() => handleGameLineMarketSelect("TOTAL_POINTS")}
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-emerald-500/10 p-4 text-left transition hover:border-emerald-300/60 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={locked}
            >
                <h3 className="text-sm font-semibold text-white">Total Points</h3>
                <p className="text-xs text-gray-400">Combined score in the game</p>
            </button>
        </div>
    );

    const renderTeamButtons = (market: PickMarket) => {
        if (!activeGame) return null;
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {[{ id: activeGame.teams.away.id, name: activeGame.teams.away.abbreviation }, { id: activeGame.teams.home.id, name: activeGame.teams.home.abbreviation }].map(
                    (team) => (
                        <button
                            key={team.id}
                            type="button"
                            onClick={() => handleTeamChoice(team.id, market)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${selection.teamId === team.id
                                ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-50 shadow-[0_10px_30px_-16px_rgba(16,185,129,0.7)]"
                                : "border-white/12 bg-white/5 text-white hover:border-emerald-300/60 hover:text-emerald-50"
                                }`}
                            disabled={locked}
                        >
                            <p className="text-sm font-semibold">{team.name}</p>
                            {market === "MONEYLINE" && (
                                <p className="text-xs text-gray-400">To win this game</p>
                            )}
                            {market === "SPREAD" && (
                                <p className="text-xs text-gray-400">Who covers the spread</p>
                            )}
                        </button>
                    )
                )}
            </div>
        );
    };

    const renderSpreadMargins = () => {
        const teamLabel =
            selection.teamId && activeGame
                ? selection.teamId === activeGame.teams.home.id
                    ? activeGame.teams.home.abbreviation
                    : activeGame.teams.away.abbreviation
                : "Team";

        const currentValue =
            selection.threshold && selection.threshold !== 0 ? selection.threshold : 1;

        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                        Select the spread for {teamLabel}
                    </p>
                    <span className="text-xs text-gray-400">Range: -20 to +20</span>
                </div>
                <input
                    type="range"
                    min={-20}
                    max={20}
                    step={1}
                    value={currentValue}
                    onChange={(event) => {
                        const raw = Number(event.target.value);
                        const next = raw === 0 ? 1 : raw;
                        setThresholdAndValidate(next);
                    }}
                    className="w-full accent-emerald-400"
                    disabled={locked}
                />
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{teamLabel} -20</span>
                    <span className="text-sm font-semibold text-white">
                        {teamLabel} {currentValue > 0 ? `+${currentValue}` : currentValue}
                    </span>
                    <span>{teamLabel} +20</span>
                </div>
            </div>
        );
    };

    const renderTotalPoints = () => (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                {([{ label: "OVER", key: "Over" }, { label: "UNDER", key: "Under" }] as { label: string; key: string }[]).map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => handleSideChoice(option.key)}
                        className={`flex-1 rounded-2xl border px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide transition ${selection.side === option.key
                            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                            : "border-white/10 bg-white/5 text-gray-200 hover:border-emerald-400/60"
                            }`}
                        disabled={locked}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            {selection.side && (
                <div className="flex flex-wrap gap-2">
                    {TOTAL_POINT_THRESHOLDS.map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setThresholdAndValidate(value, selection.side)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selection.threshold === value
                                ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                                : "border-white/15 text-gray-200 hover:border-emerald-400/60"
                                }`}
                            disabled={locked}
                        >
                            <span className="text-sm font-semibold text-white">{value}</span>
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-gray-400">
                                pts
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

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
                                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
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
                                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
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
                    We couldn’t fetch matching odds right now. Your pick can still be created, but
                    odds data may be unavailable.
                </div>
            );
        }

        return null;
    };

    const renderConfirmation = () => {
        const summary = buildSummary(selection, customDescription);

        const autoTier =
            validation.response?.difficultyTier ??
            (validation.response?.bestOffer?.americanOdds
                ? tierFromAmericanOdds(validation.response.bestOffer.americanOdds)
                : undefined);

        const effectiveTier = manualTier ?? autoTier;
        const points =
            validation.response?.points ??
            (effectiveTier ? pointsByTier[effectiveTier] : undefined);

        const canChooseTierManually =
            validationStatus === "NO_MARKET" || validationStatus === "API_ERROR";

        return (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            Your pick
                        </p>
                        <p className="text-base font-semibold text-white">{summary}</p>
                        {selection.market === "SPREAD" &&
                            selection.threshold &&
                            selection.teamId &&
                            activeGame && (
                                <p className="text-xs text-gray-400">
                                    We’ll map this to the closest alternate spread for{" "}
                                    {selection.teamId === activeGame.teams.home.id
                                        ? activeGame.teams.home.abbreviation
                                        : activeGame.teams.away.abbreviation}{" "}
                                    {selection.threshold > 0
                                        ? `+${selection.threshold}`
                                        : selection.threshold}
                                    .
                                </p>
                            )
                        }
                        <p className="text-xs text-gray-300">
                            {effectiveTier
                                ? `Based on your selection, you’ve made a ${difficultyCopy(
                                    effectiveTier
                                )} (Tier ${effectiveTier}) pick.`
                                : "Based on your selection, difficulty is currently unknown."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={goBack}
                        className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300 transition hover:border-emerald-400/60"
                    >
                        edit
                    </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            Difficulty
                        </p>
                        <p className="text-sm font-semibold text-white">
                            {difficultyCopy(effectiveTier)}{" "}
                            {points ? `· ${points} pts` : ""}
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowTierModal(true)}
                            className="mt-2 text-[11px] uppercase tracking-wide text-gray-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
                        >
                            How do tiers map to odds and points?
                        </button>

                        {canChooseTierManually && (
                            <div className="mt-3 space-y-1">
                                <p className="text-[11px] text-gray-400">
                                    Odds data is missing. Pick a difficulty tier manually:
                                </p>
                                <select
                                    value={manualTier ?? ""}
                                    onChange={(event) => {
                                        const value = Number(
                                            event.target.value
                                        ) as 1 | 2 | 3 | 4 | 5;
                                        setManualTier(Number.isNaN(value) ? undefined : value);
                                    }}
                                    className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none"
                                >
                                    <option value="">Select tier…</option>
                                    {[1, 2, 3, 4, 5].map((tier) => (
                                        <option key={tier} value={tier}>
                                            {`Tier ${tier} – ${difficultyCopy(tier)} (${pointsByTier[tier as 1 | 2 | 3 | 4 | 5]} pts)`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            Status
                        </p>
                        <p className="text-sm font-semibold text-white">
                            {validationStatus ?? "PENDING"}
                        </p>
                    </div>
                </div>

                {validation.response?.bookOdds ? (
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            How the books see it
                        </p>
                        <div className="space-y-2">
                            {validation.response.bookOdds.map((odds) => (
                                <div
                                    key={`${odds.book}-${odds.americanOdds}-${odds.marketLine ?? ""
                                        }`}
                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white"
                                >
                                    <span>{odds.book}</span>
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        {odds.marketLine !== undefined && (
                                            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                                                Line {odds.marketLine}
                                            </span>
                                        )}
                                        <span className="font-semibold">
                                            {formatOdds(odds.americanOdds)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {validation.response.bestOffer && (
                            <a
                                href={validation.response.links?.desktop ?? "#"}
                                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open at {validation.response.bestOffer.book}
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-200">
                        We couldn’t find a matching market at major books right now.
                        Your pick still counts in gotLocks; odds data unavailable.
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSubmitPick}
                        disabled={locked}
                        className="rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        confirm pick
                    </button>
                    <button
                        type="button"
                        onClick={goBack}
                        className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
                    >
                        edit pick
                    </button>
                    <button
                        type="button"
                        onClick={resetFlow}
                        className="text-xs uppercase tracking-wide text-gray-400 underline decoration-dotted underline-offset-4"
                    >
                        start over
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={() => {
                                resetFlow();
                                onCancel();
                            }}
                            className="text-xs uppercase tracking-wide text-gray-400 underline decoration-dotted underline-offset-4"
                        >
                            close
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderStep = () => {
        if (step.kind === "GAME_SELECT") return renderGameEntryStep();
        if (step.kind === "CONFIRMATION") return renderConfirmation();
        if (!activeGame) return renderGameEntryStep();
        return renderGameDetailShell(renderGameDetailContent());
    };

    const allowContinue =
        validationStatus === "NO_MARKET" || validationStatus === "API_ERROR";


    if (!slip) {
        return (
            <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
                No active slip yet. Commissioner will launch the next contest soon.
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-5">
                <div className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-inner">
                    {(activeGame || step.kind !== "GAME_SELECT") && (
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                                {activeGame && (
                                    <span className="text-gray-400">
                                        {activeGame.teams.away.name} @ {activeGame.teams.home.name} ·{" "}
                                        {formatDateTime(activeGame.date)}
                                    </span>
                                )}
                            </div>
                            {step.kind !== "GAME_SELECT" && (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="text-xs uppercase tracking-wide text-emerald-200 underline decoration-dotted underline-offset-4"
                                >
                                    Back
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">{renderStep()}</div>

                    {allowContinue && step.kind !== "CONFIRMATION" && (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setStep({ kind: "CONFIRMATION" })}
                                className="rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/60"
                            >
                                Continue anyway
                            </button>
                        </div>
                    )}

                    {validation.status === "loading" && (
                        <p className="mt-3 text-xs text-gray-400">Checking books for this market…</p>
                    )}
                </div>
            </div>

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
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">Tips for building a pick</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
                        aria-label="Close tips"
                    >
                        X
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-200">
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
                            <span className="mt-1 text-rose-200">•</span>
                            <p>
                                Our pick maker is designed to help you{" "}
                                <span className="font-semibold text-white">go with your gut</span> first and
                                worry about odds second. You make the call, then we show you how the books
                                see it so you don&apos;t get anchored or talked out of your own read.
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
                                The difficulty tiers — Very Safe, Safe, Balanced, Risky, Moonshot — map real
                                odds into points. Easier picks earn fewer points, bolder calls earn more.
                                Aim for a mix that fits your risk appetite.
                            </p>
                        </div>
                        <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
                            <span className="mt-1 text-rose-200">•</span>
                            <p>
                                If you&apos;re thinking about something weird (1st quarter stats, drive props,
                                etc.) that doesn&apos;t fit our builder, use the{" "}
                                <span className="font-semibold text-white">&quot;Got something different?&quot;</span>{" "}
                                box on the first step to submit a custom pick.
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

    const tiers = [
        { tier: 1, odds: "≤ -250", label: difficultyCopy(1), pts: pointsByTier[1] },
        { tier: 2, odds: "-249 to 0", label: difficultyCopy(2), pts: pointsByTier[2] },
        { tier: 3, odds: "+1 to +250", label: difficultyCopy(3), pts: pointsByTier[3] },
        { tier: 4, odds: "+251 to +500", label: difficultyCopy(4), pts: pointsByTier[4] },
        { tier: 5, odds: "+501+", label: difficultyCopy(5), pts: pointsByTier[5] },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">How tiers map to odds & points</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
                        aria-label="Close tier info"
                    >
                        X
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-200">
                    <div className="space-y-3">
                        {tiers.map((row) => (
                            <div
                                key={row.tier}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                        Tier {row.tier} · {row.label}
                                    </p>
                                    <p className="text-xs text-gray-300">Odds: {row.odds}</p>
                                </div>

                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                                    {row.pts} pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NflPickBuilder;
