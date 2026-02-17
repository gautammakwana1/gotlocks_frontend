// "use client";

// import { ReactNode, useEffect, useMemo, useState } from "react";
// import { ODDS_BRACKETS } from "../../lib/constants";
// import { formatDateAndTime, formatDateTime, isPast, isPastDateTime } from "../../lib/utils/date";
// import { ScoringModal } from "../modals/ScoringModal";
// import { ActiveSlip, CreatePickPayload, Group, LeaderboardEntry, NFLPlayer, NFLSchedule, PickMarket, Picks, PickScope, PickSide, RootState, ValidatePickRequest, ValidatePickResponse } from "@/lib/interfaces/interfaces";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchAllNFLPlayersRequest, fetchAllNFLScheduleRequest } from "@/lib/redux/slices/nflSlice";

// type UserIdentity = {
//     userId?: string;
// } | null;

// type Props = {
//     group: Group | null;
//     slip?: ActiveSlip | null;
//     currentUser?: UserIdentity;
//     picks: Picks;
//     leaderboard: LeaderboardEntry[];
//     onSubmitPick: (payload: CreatePickPayload) => void;
//     isCommissioner: boolean;
// };

// type PickBuilderStep =
//     | { kind: "GAME_SELECT" }
//     | { kind: "GAME_DETAIL" }
//     | { kind: "PLAYER_SELECT_THRESHOLD" }
//     | { kind: "GAME_MONEYLINE_TEAM" }
//     | { kind: "GAME_SPREAD_TEAM" }
//     | { kind: "GAME_SPREAD_MARGIN" }
//     | { kind: "GAME_TOTAL_SIDE" }
//     | { kind: "GAME_TOTAL_THRESHOLD" }
//     | { kind: "CONFIRMATION" };

// type GameDetailTab = "GAME_LINES" | "PASSING" | "RECEIVING" | "RUSHING" | "TD_SCORER";

// type GameOption = {
//     game_id: string;
//     home_team: string;
//     away_team: string;
//     home_team_id: string;
//     away_team_id: string;
//     gametime: string;
// };

// type PassingMarket = "PASSING_YARDS" | "PASSING_TDS" | "PASSING_RUSHING_YARDS";
// type ReceivingMarket = "RECEIVING_YARDS" | "RECEPTIONS";
// type RushingMarket =
//     | "RUSHING_YARDS"
//     | "RUSHING_ATTEMPTS"
//     | "RUSHING_RECEIVING_YARDS";

// type BuilderSelection = {
//     scope?: PickScope;
//     market?: PickMarket;
//     gameId?: string;
//     week?: number;
//     teamId?: string;
//     playerId?: string;
//     side?: PickSide;
//     threshold?: number;
// };

// type ValidationState = {
//     status: "idle" | "loading" | "resolved";
//     response?: ValidatePickResponse;
//     error?: string | null;
// };

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

// const STAT_THRESHOLD_CONFIG: Record<string, number[]> = {
//     NFL_RECEIVING_YARDS: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
//     NFL_RUSHING_YARDS: [20, 30, 40, 50, 60, 80, 100],
//     NFL_RUSH_REC_YARDS: [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
//     NFL_PASSING_YARDS: [150, 200, 225, 250, 275, 300, 325, 350],
//     NFL_PASS_RUSH_YARDS: [200, 225, 250, 275, 300, 325, 350, 375],
//     NFL_TDS: [1, 2, 3],
//     NFL_RECEPTIONS: [3, 4, 5, 6, 7, 8, 10],
//     NFL_ATTEMPTS: [10, 12, 15, 18, 20, 22, 25],
// };

// const TOTAL_POINT_THRESHOLDS = [20, 30, 35, 40, 45, 50, 55, 60, 65];

// const MARKET_LABEL: Record<PickMarket, string> = {
//     MONEYLINE: "Moneyline",
//     SPREAD: "Spread",
//     TOTAL_POINTS: "Total Points",
//     PASSING_YARDS: "Passing Yards",
//     PASSING_RUSHING_YARDS: "Pass + Rush Yards",
//     RUSHING_YARDS: "Rushing Yards",
//     RUSHING_RECEIVING_YARDS: "Rush + Rec Yards",
//     RECEIVING_YARDS: "Receiving Yards",
//     RECEPTIONS: "Receptions",
//     RUSHING_ATTEMPTS: "Rushing Attempts",
//     PASSING_TDS: "Passing TDs",
//     RUSHING_TDS: "Touchdowns",
//     RECEIVING_TDS: "Touchdowns",
// };

// const difficultyCopy = (tier?: number) => {
//     switch (tier) {
//         case 1:
//             return "Very Safe";
//         case 2:
//             return "Safe";
//         case 3:
//             return "Balanced";
//         case 4:
//             return "Risky";
//         case 5:
//             return "Moonshot";
//         default:
//             return "Unknown";
//     }
// };

// const tierFromAmericanOdds = (american: number): 1 | 2 | 3 | 4 | 5 => {
//     if (american <= -250) return 1;
//     if (american > -250 && american <= 0) return 2;
//     if (american > 0 && american <= 250) return 3;
//     if (american > 250 && american <= 500) return 4;
//     return 5;
// };

// const pointsByTier: Record<1 | 2 | 3 | 4 | 5, number> = {
//     1: 5,
//     2: 10,
//     3: 15,
//     4: 20,
//     5: 25,
// };

// const bracketFromTier = (tier?: number) => {
//     if (!tier) return ODDS_BRACKETS[2].label;
//     if (tier === 1) return "–250 or shorter";
//     if (tier === 2) return "–249 to 0";
//     if (tier === 3) return "+1 to +250";
//     if (tier === 4) return "+251 to +500";
//     return "+501 and up";
// };

// const formatOdds = (american?: number) => {
//     if (american === undefined || american === null || Number.isNaN(american)) {
//         return "—";
//     }
//     return american > 0 ? `+${american}` : `${american}`;
// };

// const statThresholdsForMarket = (market?: PickMarket): number[] => {
//     if (!market) return [];
//     switch (market) {
//         case "RECEIVING_YARDS":
//             return STAT_THRESHOLD_CONFIG.NFL_RECEIVING_YARDS;
//         case "RUSHING_YARDS":
//             return STAT_THRESHOLD_CONFIG.NFL_RUSHING_YARDS;
//         case "RUSHING_RECEIVING_YARDS":
//             return STAT_THRESHOLD_CONFIG.NFL_RUSH_REC_YARDS;
//         case "PASSING_RUSHING_YARDS":
//             return STAT_THRESHOLD_CONFIG.NFL_PASS_RUSH_YARDS;
//         case "PASSING_YARDS":
//             return STAT_THRESHOLD_CONFIG.NFL_PASSING_YARDS;
//         case "RECEPTIONS":
//             return STAT_THRESHOLD_CONFIG.NFL_RECEPTIONS;
//         case "RUSHING_ATTEMPTS":
//             return STAT_THRESHOLD_CONFIG.NFL_ATTEMPTS;
//         case "PASSING_TDS":
//         case "RUSHING_TDS":
//         case "RECEIVING_TDS":
//             return STAT_THRESHOLD_CONFIG.NFL_TDS;
//         default:
//             return [];
//     }
// };

// const stepLabel = (step: PickBuilderStep): string => {
//     switch (step.kind) {
//         case "GAME_SELECT":
//             return "Choose Game";
//         case "GAME_DETAIL":
//             return "Game Detail";
//         case "PLAYER_SELECT_THRESHOLD":
//             return "Threshold";
//         case "GAME_MONEYLINE_TEAM":
//             return "Pick Winner";
//         case "GAME_SPREAD_TEAM":
//             return "Pick Spread Side";
//         case "GAME_SPREAD_MARGIN":
//             return "Spread Margin";
//         case "GAME_TOTAL_SIDE":
//             return "Over / Under";
//         case "GAME_TOTAL_THRESHOLD":
//             return "Total Points";
//         case "CONFIRMATION":
//             return "Confirm";
//         default:
//             return "Step";
//     }
// };

// export const NewMakePickTab = ({
//     group,
//     slip,
//     currentUser,
//     picks,
//     leaderboard,
//     onSubmitPick,
//     isCommissioner,
// }: Props) => {
//     const dispatch = useDispatch();
//     const [description, setDescription] = useState("");
//     const [oddsBracket, setOddsBracket] = useState(ODDS_BRACKETS[2].label);
//     const [showModal, setShowModal] = useState(false);
//     const [showTipsModal, setShowTipsModal] = useState(false);

//     const [showTierModal, setShowTierModal] = useState(false);
//     const [customThreshold, setCustomThreshold] = useState<string>("");
//     const [customDescription, setCustomDescription] = useState("");
//     const [customError, setCustomError] = useState<string | null>(null);
//     const [step, setStep] = useState<PickBuilderStep>({ kind: "GAME_SELECT" });
//     const [selection, setSelection] = useState<BuilderSelection>({});
//     const [validation, setValidation] = useState<ValidationState>({
//         status: "idle",
//         response: undefined,
//         error: null,
//     });
//     const [matchSchedules, setMatchSchedules] = useState<NFLSchedule[]>([]);
//     const [playersList, setPlayersList] = useState<NFLPlayer[]>([]);
//     const [manualTier, setManualTier] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
//     const [gameDetailTab, setGameDetailTab] = useState<GameDetailTab>("GAME_LINES");
//     const [passingMarket, setPassingMarket] = useState<PassingMarket>("PASSING_YARDS");
//     const [receivingMarket, setReceivingMarket] = useState<ReceivingMarket>("RECEIVING_YARDS");
//     const [rushingMarket, setRushingMarket] = useState<RushingMarket>("RUSHING_YARDS");

//     const { nflMatches, nflPlayers } = useSelector((state: RootState) => state.nfl);

//     const pick = useMemo(() => {
//         if (!slip || !currentUser) return undefined;
//         return picks.find(
//             (entry) => entry.slip_id === slip.id && entry.user_id === currentUser.userId
//         );
//     }, [picks, slip, currentUser]);

//     const slipRow = useMemo(() => {
//         if (!slip || !currentUser) return undefined;
//         return leaderboard.find(
//             (entry) =>
//                 entry.slip_id === slip.id &&
//                 entry.user_id === currentUser.userId &&
//                 entry.group_id === group?.id
//         );
//     }, [leaderboard, slip, currentUser, group?.id]);

//     useEffect(() => {
//         if (pick) {
//             setDescription(pick.description);
//             setOddsBracket(pick.odds_bracket);
//             setSelection({
//                 scope: pick.scope,
//                 market: pick.market,
//                 gameId: pick.game_id,
//                 teamId: pick.team_id,
//                 playerId: pick.player_id,
//                 side: pick.side,
//                 threshold: pick.threshold,
//             });
//         }
//     }, [pick]);
//     useEffect(() => {
//         if (slip?.results_deadline_at && slip?.pick_deadline_at) {
//             const resultDate = new Date(slip.results_deadline_at).toISOString().split('T')[0];
//             const pickDate = new Date(slip.pick_deadline_at).toISOString().split('T')[0];
//             dispatch(fetchAllNFLScheduleRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate) }));
//             dispatch(fetchAllNFLPlayersRequest({ result_deadline: String(resultDate), pick_deadline: String(pickDate) }));
//         }
//     }, [dispatch, slip?.pick_deadline_at, slip?.results_deadline_at]);
//     useEffect(() => {
//         if (nflMatches?.schedule) {
//             setMatchSchedules(nflMatches.schedule);
//         }
//         if (nflPlayers?.players) {
//             setPlayersList(nflPlayers.players);
//         }
//     }, [nflMatches, nflPlayers]);

//     const locked =
//         !slip ||
//         slip.status !== "open" ||
//         isPast(slip.pick_deadline_at ?? "") ||
//         !currentUser;

//     const getMarketLabel = (market?: PickMarket) =>
//         market ? MARKET_LABEL[market] ?? market : "Select a market";

//     const findGame = (gameId?: string) =>
//         matchSchedules.find((candidate) => candidate.game_id === gameId);

//     const findPlayer = (playerId?: string) =>
//         playersList.find((candidate) => candidate.id === playerId);

//     const buildSummary = (
//         selection: BuilderSelection,
//         fallbackDescription?: string
//     ): string => {
//         const game = findGame(selection.gameId);
//         const player = findPlayer(selection.playerId);

//         if (
//             selection.scope === "PLAYER_PROP" &&
//             player &&
//             selection.market &&
//             selection.threshold !== undefined
//         ) {
//             const label = getMarketLabel(selection.market);
//             const direction = selection.side === "UNDER" ? "Under" : "Over";
//             const suffix = selection.market.includes("TDS")
//                 ? `${direction} ${selection.threshold} TD${selection.threshold > 1 ? "s" : ""}`
//                 : `${direction} ${selection.threshold} ${label}`;
//             return `${player.name} — ${suffix}`;
//         }

//         if (selection.scope === "GAME_LINE" && game) {
//             if (selection.market === "MONEYLINE" && selection.teamId) {
//                 const winner =
//                     selection.teamId === game.home_team_id ? game.home_team : game.away_team;
//                 return `${winner} to win the game`;
//             }

//             if (selection.market === "SPREAD" && selection.teamId && selection.threshold) {
//                 const teamName =
//                     selection.teamId === game.home_team_id ? game.home_team : game.away_team;
//                 const formattedSpread =
//                     selection.threshold > 0 ? `+${selection.threshold}` : `${selection.threshold}`;
//                 return `${teamName} ${formattedSpread} spread`;
//             }

//             if (selection.market === "TOTAL_POINTS" && selection.threshold && selection.side) {
//                 return `${game.away_team} @ ${game.home_team} — ${selection.side === "OVER" ? "Over" : "Under"} ${selection.threshold} total points`;
//             }
//         }

//         if (fallbackDescription) return fallbackDescription;

//         return "Ready to build a pick";
//     };

//     const activeGame = findGame(selection.gameId);
//     const activePlayer = findPlayer(selection.playerId);

//     const resetFlow = () => {
//         setSelection({});
//         setCustomThreshold("");
//         setCustomDescription("");
//         setCustomError(null);
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setGameDetailTab("GAME_LINES");
//         setPassingMarket("PASSING_YARDS");
//         setReceivingMarket("RECEIVING_YARDS");
//         setRushingMarket("RUSHING_YARDS");
//         setStep({ kind: "GAME_SELECT" });
//     };

//     const goBack = () => {
//         setValidation({ status: "idle", response: undefined, error: null });
//         switch (step.kind) {
//             case "PLAYER_SELECT_THRESHOLD":
//                 setSelection((prev) => ({ ...prev, threshold: undefined }));
//                 setStep({ kind: "GAME_DETAIL" });
//                 break;
//             case "GAME_MONEYLINE_TEAM":
//                 setSelection((prev) => ({
//                     ...prev,
//                     teamId: undefined,
//                     side: undefined,
//                     threshold: undefined,
//                 }));
//                 setStep({ kind: "GAME_DETAIL" });
//                 break;
//             case "GAME_SPREAD_TEAM":
//                 setSelection((prev) => ({ ...prev, teamId: undefined, threshold: undefined }));
//                 setStep({ kind: "GAME_DETAIL" });
//                 break;
//             case "GAME_SPREAD_MARGIN":
//                 setSelection((prev) => ({ ...prev, threshold: undefined }));
//                 setStep({ kind: "GAME_SPREAD_TEAM" });
//                 break;
//             case "GAME_TOTAL_SIDE":
//                 setSelection((prev) => ({ ...prev, side: undefined, threshold: undefined }));
//                 setStep({ kind: "GAME_DETAIL" });
//                 break;
//             case "GAME_TOTAL_THRESHOLD":
//                 setSelection((prev) => ({ ...prev, threshold: undefined }));
//                 setStep({ kind: "GAME_TOTAL_SIDE" });
//                 break;
//             case "CONFIRMATION":
//                 if (selection.scope === "PLAYER_PROP") {
//                     setStep({ kind: "PLAYER_SELECT_THRESHOLD" });
//                 } else {
//                     if (selection.market === "MONEYLINE") setStep({ kind: "GAME_MONEYLINE_TEAM" });
//                     else if (selection.market === "SPREAD") setStep({ kind: "GAME_SPREAD_MARGIN" });
//                     else if (selection.market === "TOTAL_POINTS")
//                         setStep({ kind: "GAME_TOTAL_THRESHOLD" });
//                     else setStep({ kind: "GAME_DETAIL" });
//                 }
//                 break;
//             default:
//                 handleBackToGames();
//         }
//     };

//     const handleCustomIdea = async () => {
//         if (!customDescription.trim()) {
//             setCustomError("Type a quick description first.");
//             return;
//         }

//         setValidation({ status: "loading", response: undefined, error: null });
//         setManualTier(undefined);

//         try {
//             const response = await fetch("/api/picks/validate-custom", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     rawDescription: customDescription,
//                     groupId: group?.id,
//                     contestId: slip?.id,
//                     userId: currentUser?.userId,
//                 }),
//             });
//             await navigator.clipboard.writeText(JSON.stringify({
//                 rawDescription: customDescription,
//                 groupId: group?.id,
//                 contestId: slip?.id,
//                 userId: currentUser?.userId,
//             }));

//             if (!response.ok) {
//                 throw new Error("Validation failed");
//             }

//             const data = (await response.json()) as {
//                 validate: ValidatePickResponse;
//                 parsedSelection?: BuilderSelection;
//             };

//             if (data.parsedSelection) {
//                 setSelection(data.parsedSelection);
//             } else {
//                 // No structured mapping — treat as free-form
//                 setSelection({});
//             }

//             setValidation({ status: "resolved", response: data.validate, error: null });
//             setCustomError(null);
//             setStep({ kind: "CONFIRMATION" });
//         } catch {
//             // Fallback: no odds, no structured mapping, but still let them confirm
//             setSelection({});
//             setValidation({
//                 status: "resolved",
//                 response: { status: "API_ERROR" },
//                 error: "We couldn't match this to a market automatically.",
//             });
//             setStep({ kind: "CONFIRMATION" });
//         }
//     };

//     const handleGameChoice = (game: GameOption) => {
//         setSelection({
//             scope: "GAME_LINE",
//             gameId: game.game_id,
//             teamId: undefined,
//             playerId: undefined,
//             threshold: undefined,
//             side: undefined,
//             market: undefined,
//         });
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setGameDetailTab("GAME_LINES");
//         setPassingMarket("PASSING_YARDS");
//         setReceivingMarket("RECEIVING_YARDS");
//         setRushingMarket("RUSHING_YARDS");
//         setStep({ kind: "GAME_DETAIL" });
//     };

//     const setThresholdAndValidate = (nextThreshold: number, nextSide?: PickSide) => {
//         const side = nextSide ?? selection.side;
//         const updatedSelection = { ...selection, threshold: nextThreshold, side };
//         setSelection(updatedSelection);
//         void runValidation(updatedSelection);
//     };

//     const handleTeamChoice = (teamId: string, market: PickMarket) => {
//         const updatedSelection = {
//             ...selection,
//             scope: "GAME_LINE" as PickScope,
//             market,
//             teamId,
//             threshold: market === "SPREAD" ? undefined : selection.threshold,
//             side: market === "SPREAD" ? undefined : selection.side,
//         };
//         setSelection(updatedSelection);
//         if (market === "MONEYLINE") {
//             void runValidation(updatedSelection);
//         } else if (market === "SPREAD") {
//             setStep({ kind: "GAME_SPREAD_MARGIN" });
//         }
//     };

//     const handleSideChoice = (side: PickSide) => {
//         setSelection((prev) => ({ ...prev, side, threshold: undefined }));
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         if (selection.market === "TOTAL_POINTS") {
//             setStep({ kind: "GAME_TOTAL_THRESHOLD" });
//         }
//     };

//     const mockValidationFromSelection = (payload: ValidatePickRequest): ValidatePickResponse => {
//         const baseOdds = payload.market === "MONEYLINE" ? -120 : -110;
//         const threshold = payload.threshold ?? 0;

//         if (["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) && threshold < 20) {
//             return {
//                 status: "TOO_SAFE",
//                 suggestedThresholds: [40, 50, 60],
//             };
//         }

//         if (["RECEIVING_YARDS", "RUSHING_YARDS", "RUSHING_RECEIVING_YARDS", "PASSING_YARDS", "PASSING_RUSHING_YARDS"].includes(payload.market) && threshold > 350) {
//             return {
//                 status: "TOO_CRAZY",
//                 suggestedThresholds: [90, 110, 130],
//             };
//         }

//         if (payload.market === "TOTAL_POINTS" && (threshold < 25 || threshold > 70)) {
//             return {
//                 status: threshold < 25 ? "TOO_SAFE" : "TOO_CRAZY",
//                 suggestedThresholds: TOTAL_POINT_THRESHOLDS,
//             };
//         }

//         const americanOdds =
//             payload.market === "MONEYLINE"
//                 ? baseOdds + Math.round(Math.random() * 80)
//                 : baseOdds + Math.round(Math.random() * 120);
//         const tier = tierFromAmericanOdds(americanOdds);
//         return {
//             status: "VALID",
//             bookOdds: [{ book: "MockBook", americanOdds }],
//             bestOffer: { book: "MockBook", americanOdds },
//             difficultyTier: tier,
//             points: pointsByTier[tier],
//         };
//     };

//     const runValidation = async (state: BuilderSelection) => {
//         setManualTier(undefined);

//         if (!state.scope || !state.market || !state.gameId) return;
//         const game = findGame(state.gameId);
//         if (game && isPastDateTime(game.gameday, game.gametime)) {
//             setValidation({
//                 status: "resolved",
//                 response: { status: "API_ERROR" },
//                 error: "This game is locked for picks.",
//             });
//             return;
//         }

//         const payload: ValidatePickRequest = {
//             scope: state.scope,
//             market: state.market,
//             gameId: state.gameId,
//             teamId: state.teamId,
//             playerId: state.playerId,
//             side: state.side,
//             threshold: state.threshold,
//             groupId: group?.id,
//             contestId: slip?.id,
//             userId: currentUser?.userId,
//         };
//         await navigator.clipboard.writeText(JSON.stringify(payload));

//         setValidation({ status: "loading", response: undefined, error: null });
//         try {
//             const response = await fetch("/api/picks/validate", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(payload),
//             });

//             if (!response.ok) {
//                 throw new Error("Validation failed");
//             }

//             const data = (await response.json()) as ValidatePickResponse;
//             setValidation({ status: "resolved", response: data, error: null });
//             if (data.status === "VALID" || data.status === "NO_MARKET" || data.status === "API_ERROR") {
//                 setStep({ kind: "CONFIRMATION" });
//             }
//         } catch {
//             const fallback = mockValidationFromSelection(payload);
//             setValidation({
//                 status: "resolved",
//                 response: fallback,
//                 error: "Live odds unavailable. Using fallback suggestions.",
//             });
//             if (fallback.status === "VALID" || fallback.status === "NO_MARKET" || fallback.status === "API_ERROR") {
//                 setStep({ kind: "CONFIRMATION" });
//             }
//         }
//     };

//     const validationStatus = validation.response?.status;
//     const validationSuggestions = validation.response?.suggestedThresholds ?? [];

//     const handleSubmitPick = async () => {
//         const summary = buildSummary(selection, customDescription);

//         // Require at least some description
//         if (!summary.trim()) return;

//         const autoTier =
//             validation.response?.difficultyTier ??
//             (validation.response?.bestOffer?.americanOdds
//                 ? tierFromAmericanOdds(validation.response.bestOffer.americanOdds)
//                 : undefined);

//         const effectiveTier = manualTier ?? autoTier;
//         const points =
//             validation.response?.points ??
//             (effectiveTier ? pointsByTier[effectiveTier] : 0);

//         const oddsBracket = bracketFromTier(effectiveTier);

//         await navigator.clipboard.writeText(JSON.stringify({
//             description: summary,
//             oddsBracket,
//             points,
//             scope: selection.scope,
//             market: selection.market,
//             side: selection.side,
//             threshold: selection.threshold,
//             gameId: selection.gameId,
//             week: selection.week,
//             teamId: selection.teamId,
//             playerId: selection.playerId,
//             difficultyTier: effectiveTier,
//             bestOffer: validation.response?.bestOffer,
//             bookOdds: validation.response?.bookOdds,
//             validationStatus,
//         }));

//         onSubmitPick({
//             description: summary,
//             odds_bracket: oddsBracket,
//             points,
//             scope: selection.scope,
//             market: selection.market,
//             side: selection.side,
//             threshold: selection.threshold,
//             gameId: selection.gameId,
//             // week: selection.week,
//             teamId: selection.teamId,
//             playerId: selection.playerId,
//             difficultyTier: effectiveTier,
//             bestOffer: validation.response?.bestOffer,
//             bookOdds: validation.response?.bookOdds,
//             validationStatus,
//         });

//         resetFlow();
//     };

//     const renderCustomIdeaCard = () => (
//         <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
//             <div className="flex items-center justify-between">
//                 <p className="text-sm font-semibold text-white">Got something different?</p>
//                 {customError && <span className="text-[11px] text-rose-200">{customError}</span>}
//             </div>
//             <p className="mt-1 text-xs text-gray-400">
//                 If your idea doesn’t fit Game Lines or Player Props, type it here.
//             </p>
//             <textarea
//                 value={customDescription}
//                 onChange={(event) => {
//                     setCustomDescription(event.target.value);
//                     if (customError) setCustomError(null);
//                 }}
//                 placeholder="Example: First half passing yards · Team 3 punt return TD"
//                 className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:opacity-50"
//                 rows={3}
//                 disabled={locked}
//             />
//             <button
//                 type="button"
//                 className="mt-3 rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
//                 disabled={locked}
//                 onClick={() => {
//                     void handleCustomIdea();
//                 }}
//             >
//                 Try this custom idea
//             </button>
//         </div>
//     );

//     const renderGameCards = () => (
//         <div className="grid gap-3 sm:grid-cols-2">
//             {nflMatches && nflMatches.schedule.map((game) => (
//                 <button
//                     key={game.game_id}
//                     type="button"
//                     onClick={() => handleGameChoice(game)}
//                     className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
//                     disabled={locked}
//                 >
//                     <div className="flex items-center justify-between text-sm font-semibold text-white">
//                         <span>
//                             {game.away_team} @ {game.home_team}
//                         </span>
//                         <span className="text-xs text-gray-400">{formatDateAndTime(game.gameday, game.gametime)}</span>
//                     </div>
//                     <p className="text-xs text-gray-400">
//                         Picks lock when this game starts.
//                     </p>
//                 </button>
//             ))}
//         </div>
//     );

//     const renderGameEntryStep = () => (
//         <div className="grid gap-6">
//             <div className="space-y-3">
//                 <div className="flex items-center justify-between">
//                     <h4 className="text-sm font-semibold text-white">Choose a matchup</h4>
//                     <span className="text-[11px] uppercase tracking-wide text-gray-400">
//                         Game lines + props
//                     </span>
//                 </div>
//                 {renderGameCards()}
//             </div>
//             {renderCustomIdeaCard()}
//         </div>
//     );

//     const playerInitials = (player: NFLPlayer) => {
//         const letters = player.team.replace(/[^A-Z]/g, "").slice(0, 2);
//         if (letters.length > 0) return letters;
//         return player.team.slice(0, 2).toUpperCase();
//     };

//     const handleBackToGames = () => {
//         setStep({ kind: "GAME_SELECT" });
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setCustomThreshold("");
//         setSelection((prev) => ({
//             ...prev,
//             scope: undefined,
//             gameId: undefined,
//             teamId: undefined,
//             playerId: undefined,
//             market: undefined,
//             side: undefined,
//             threshold: undefined,
//         }));
//         setGameDetailTab("GAME_LINES");
//         setPassingMarket("PASSING_YARDS");
//         setReceivingMarket("RECEIVING_YARDS");
//         setRushingMarket("RUSHING_YARDS");
//     };

//     const handleTabChange = (tab: GameDetailTab) => {
//         setGameDetailTab(tab);
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setCustomThreshold("");
//         setSelection((prev) => ({
//             ...prev,
//             scope: tab === "GAME_LINES" ? "GAME_LINE" : "PLAYER_PROP",
//             market: undefined,
//             teamId: undefined,
//             playerId: undefined,
//             side: tab === "TD_SCORER" ? "OVER" : undefined,
//             threshold: undefined,
//         }));
//         setStep({ kind: "GAME_DETAIL" });
//     };

//     const handleGameLineMarketSelect = (market: PickMarket) => {
//         if (!selection.gameId) return;
//         setGameDetailTab("GAME_LINES");
//         setSelection((prev) => ({
//             ...prev,
//             scope: "GAME_LINE",
//             market,
//             teamId: undefined,
//             playerId: undefined,
//             threshold: undefined,
//             side: undefined,
//         }));
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setCustomThreshold("");
//         if (market === "MONEYLINE") setStep({ kind: "GAME_MONEYLINE_TEAM" });
//         if (market === "SPREAD") setStep({ kind: "GAME_SPREAD_TEAM" });
//         if (market === "TOTAL_POINTS") setStep({ kind: "GAME_TOTAL_SIDE" });
//     };

//     const startPlayerThresholdFlow = (
//         player: NFLPlayer,
//         market: PickMarket,
//         tab: GameDetailTab
//     ) => {
//         setGameDetailTab(tab);
//         setSelection({
//             scope: "PLAYER_PROP",
//             gameId: player.gameId,
//             playerId: player.id,
//             market,
//             side: "OVER",
//             threshold: undefined,
//             teamId: undefined,
//         });
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setCustomThreshold("");
//         setStep({ kind: "PLAYER_SELECT_THRESHOLD" });
//     };

//     const tdMarketForPosition = (position: NFLPlayer["position"]): PickMarket => {
//         if (position === "QB") return "PASSING_TDS";
//         if (position === "RB") return "RUSHING_TDS";
//         return "RECEIVING_TDS";
//     };

//     const handleTdChipSelection = (player: NFLPlayer, threshold: number) => {
//         const market = tdMarketForPosition(player.position);
//         const updatedSelection: BuilderSelection = {
//             scope: "PLAYER_PROP",
//             gameId: player.gameId,
//             playerId: player.id,
//             market,
//             side: "OVER",
//             threshold,
//             teamId: undefined,
//         };
//         setGameDetailTab("TD_SCORER");
//         setSelection(updatedSelection);
//         setValidation({ status: "idle", response: undefined, error: null });
//         setManualTier(undefined);
//         setCustomThreshold("");
//         setStep({ kind: "GAME_DETAIL" });
//         void runValidation(updatedSelection);
//     };

//     const renderGameDetailShell = (children: ReactNode) => {
//         if (!activeGame) return null;
//         const tabs: { key: GameDetailTab; label: string }[] = [
//             { key: "GAME_LINES", label: "Game Lines" },
//             { key: "PASSING", label: "Passing Props" },
//             { key: "RECEIVING", label: "Receiving Props" },
//             { key: "RUSHING", label: "Rushing Props" },
//             { key: "TD_SCORER", label: "TD Scorer Props" },
//         ];
//         return (
//             <div className="flex flex-col gap-4">
//                 <div className="flex flex-wrap items-start justify-between gap-3">
//                     <div className="text-left text-sm text-white">
//                         <p className="font-semibold">
//                             {activeGame.away_team} @ {activeGame.home_team}
//                         </p>
//                         <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                             {formatDateAndTime(activeGame.gameday, activeGame.gametime)}
//                         </p>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={handleBackToGames}
//                         className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/60"
//                     >
//                         Back to games
//                     </button>
//                 </div>

//                 <div className="flex gap-3 overflow-x-auto border-b border-white/10 pb-2">
//                     {tabs.map((tab) => {
//                         const isActive = gameDetailTab === tab.key;
//                         return (
//                             <button
//                                 key={tab.key}
//                                 type="button"
//                                 onClick={() => handleTabChange(tab.key)}
//                                 className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
//                                     ? "border-sky-400 text-sky-200"
//                                     : "border-transparent text-gray-400 hover:text-white"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {tab.label}
//                             </button>
//                         );
//                     })}
//                 </div>

//                 <div className="flex flex-col gap-4">{children}</div>
//             </div>
//         );
//     };

//     const renderGameLinesFlow = () => {
//         switch (step.kind) {
//             case "GAME_MONEYLINE_TEAM":
//                 return (
//                     <div className="flex flex-col gap-4">
//                         <p className="text-sm font-semibold text-white">Who wins this game?</p>
//                         {renderTeamButtons("MONEYLINE")}
//                         {renderValidationNotice()}
//                     </div>
//                 );
//             case "GAME_SPREAD_TEAM":
//                 return (
//                     <div className="flex flex-col gap-4">
//                         <p className="text-sm font-semibold text-white">Which side do you want?</p>
//                         {renderTeamButtons("SPREAD")}
//                     </div>
//                 );
//             case "GAME_SPREAD_MARGIN":
//                 return (
//                     <div className="flex flex-col gap-4">
//                         <p className="text-sm font-semibold text-white">
//                             Choose the spread for{" "}
//                             {selection.teamId && activeGame
//                                 ? selection.teamId === activeGame.home_team_id
//                                     ? activeGame.home_team
//                                     : activeGame.away_team
//                                 : "this team"}
//                             .
//                         </p>
//                         {renderSpreadMargins()}
//                         {renderValidationNotice()}
//                     </div>
//                 );
//             case "GAME_TOTAL_SIDE":
//                 return (
//                     <div className="flex flex-col gap-4">
//                         <p className="text-sm font-semibold text-white">
//                             Do you think this game will go over or under?
//                         </p>
//                         {renderTotalPoints()}
//                         {renderValidationNotice()}
//                     </div>
//                 );
//             case "GAME_TOTAL_THRESHOLD":
//                 return (
//                     <div className="flex flex-col gap-4">
//                         <p className="text-sm font-semibold text-white">Total points in this game:</p>
//                         {renderTotalPoints()}
//                         {renderValidationNotice()}
//                     </div>
//                 );
//             default:
//                 return renderGameLineChooser();
//         }
//     };

//     const renderPassingPropsTab = () => {
//         if (!selection.gameId) return null;
//         const playersForGame = nflPlayers?.players.filter((player) => player.gameId === selection.gameId);
//         const options: { key: PassingMarket; label: string; market: PickMarket }[] = [
//             { key: "PASSING_YARDS", label: "Passing Yards", market: "PASSING_YARDS" },
//             { key: "PASSING_TDS", label: "Passing TDs", market: "PASSING_TDS" },
//             {
//                 key: "PASSING_RUSHING_YARDS",
//                 label: "Pass + Rush Yds",
//                 market: "PASSING_RUSHING_YARDS",
//             },
//         ];

//         const activeOption = options.find((option) => option.key === passingMarket) ?? options[0];
//         const eligiblePlayers = playersForGame && playersForGame.filter((player) => {
//             const allowedMarketsForPosition = STAT_OPTIONS_BY_POSITION[player.position as keyof typeof STAT_OPTIONS_BY_POSITION];

//             // If the position is not in the map → empty array (safe fallback)
//             const allowed = (allowedMarketsForPosition ?? []) as readonly string[];

//             // Now includes works – we widened to string[] so TS is happy
//             return allowed.includes(activeOption.market);
//         });

//         return (
//             <div className="flex flex-col gap-3">
//                 <div className="flex flex-wrap gap-2">
//                     {options.map((option) => {
//                         const isActive = passingMarket === option.key;
//                         return (
//                             <button
//                                 key={option.key}
//                                 type="button"
//                                 onClick={() => {
//                                     setPassingMarket(option.key);
//                                     setValidation({ status: "idle", response: undefined, error: null });
//                                     setManualTier(undefined);
//                                     setCustomThreshold("");
//                                     setSelection((prev) => ({
//                                         ...prev,
//                                         scope: "PLAYER_PROP",
//                                         market: undefined,
//                                         playerId: undefined,
//                                         threshold: undefined,
//                                         side: "OVER",
//                                     }));
//                                     setStep({ kind: "GAME_DETAIL" });
//                                 }}
//                                 className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
//                                     ? "border-sky-400 bg-sky-500/20 text-sky-100"
//                                     : "border-white/10 text-gray-200 hover:border-sky-400/60"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {option.label}
//                             </button>
//                         );
//                     })}
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
//                     <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
//                         {activeOption.label}
//                     </p>
//                 </div>

//                 {eligiblePlayers && eligiblePlayers.length === 0 ? (
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
//                         No passing props available for this matchup yet.
//                     </div>
//                 ) : (
//                     <div className="space-y-2">
//                         {eligiblePlayers && eligiblePlayers.map((player) => (
//                             <button
//                                 key={player.id}
//                                 type="button"
//                                 onClick={() => startPlayerThresholdFlow(player, activeOption.market, "PASSING")}
//                                 className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
//                                 disabled={locked}
//                             >
//                                 <div className="flex items-center gap-3">
//                                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
//                                         {playerInitials(player)}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-semibold text-white">{player.name}</p>
//                                         <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                             {player.position} · {player.team} vs {player.opponent}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-xs font-semibold text-emerald-100">
//                                         {activeOption.label}
//                                     </p>
//                                     <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                         Tap to build pick
//                                     </p>
//                                 </div>
//                             </button>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderReceivingPropsTab = () => {
//         if (!selection.gameId) return null;
//         const playersForGame = nflPlayers?.players.filter((player) => player.gameId === selection.gameId);
//         const options: { key: ReceivingMarket; label: string; market: PickMarket }[] = [
//             { key: "RECEIVING_YARDS", label: "Receiving Yards", market: "RECEIVING_YARDS" },
//             { key: "RECEPTIONS", label: "Receptions", market: "RECEPTIONS" },
//         ];

//         const activeOption = options.find((option) => option.key === receivingMarket) ?? options[0];
//         const eligiblePlayers = playersForGame && playersForGame.filter((player) => {
//             const allowedMarketsForPosition = STAT_OPTIONS_BY_POSITION[player.position as keyof typeof STAT_OPTIONS_BY_POSITION];

//             // If the position is not in the map → empty array (safe fallback)
//             const allowed = (allowedMarketsForPosition ?? []) as readonly string[];

//             // Now includes works – we widened to string[] so TS is happy
//             return allowed.includes(activeOption.market);
//         });

//         return (
//             <div className="flex flex-col gap-3">
//                 <div className="flex flex-wrap gap-2">
//                     {options.map((option) => {
//                         const isActive = receivingMarket === option.key;
//                         return (
//                             <button
//                                 key={option.key}
//                                 type="button"
//                                 onClick={() => {
//                                     setReceivingMarket(option.key);
//                                     setValidation({ status: "idle", response: undefined, error: null });
//                                     setManualTier(undefined);
//                                     setCustomThreshold("");
//                                     setSelection((prev) => ({
//                                         ...prev,
//                                         scope: "PLAYER_PROP",
//                                         market: undefined,
//                                         playerId: undefined,
//                                         threshold: undefined,
//                                         side: "OVER",
//                                     }));
//                                     setStep({ kind: "GAME_DETAIL" });
//                                 }}
//                                 className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
//                                     ? "border-sky-400 bg-sky-500/20 text-sky-100"
//                                     : "border-white/10 text-gray-200 hover:border-sky-400/60"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {option.label}
//                             </button>
//                         );
//                     })}
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
//                     <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
//                         {activeOption.label}
//                     </p>
//                 </div>

//                 {eligiblePlayers && eligiblePlayers.length === 0 ? (
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
//                         No receiving props available for this matchup yet.
//                     </div>
//                 ) : (
//                     <div className="space-y-2">
//                         {eligiblePlayers && eligiblePlayers.map((player) => (
//                             <button
//                                 key={player.id}
//                                 type="button"
//                                 onClick={() =>
//                                     startPlayerThresholdFlow(player, activeOption.market, "RECEIVING")
//                                 }
//                                 className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
//                                 disabled={locked}
//                             >
//                                 <div className="flex items-center gap-3">
//                                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
//                                         {playerInitials(player)}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-semibold text-white">{player.name}</p>
//                                         <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                             {player.position} · {player.team} vs {player.opponent}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-xs font-semibold text-emerald-100">
//                                         {activeOption.label}
//                                     </p>
//                                     <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                         Tap to build pick
//                                     </p>
//                                 </div>
//                             </button>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderRushingPropsTab = () => {
//         if (!selection.gameId) return null;
//         const playersForGame = nflPlayers?.players.filter((player) => player.gameId === selection.gameId);
//         const options: { key: RushingMarket; label: string; market: PickMarket }[] = [
//             { key: "RUSHING_YARDS", label: "Rushing Yards", market: "RUSHING_YARDS" },
//             { key: "RUSHING_ATTEMPTS", label: "Rush Attempts", market: "RUSHING_ATTEMPTS" },
//             {
//                 key: "RUSHING_RECEIVING_YARDS",
//                 label: "Rush + Rec Yds",
//                 market: "RUSHING_RECEIVING_YARDS",
//             },
//         ];

//         const activeOption = options.find((option) => option.key === rushingMarket) ?? options[0];
//         const eligiblePlayers = playersForGame && playersForGame.filter((player) => {
//             const allowedMarketsForPosition = STAT_OPTIONS_BY_POSITION[player.position as keyof typeof STAT_OPTIONS_BY_POSITION];

//             // If the position is not in the map → empty array (safe fallback)
//             const allowed = (allowedMarketsForPosition ?? []) as readonly string[];

//             // Now includes works – we widened to string[] so TS is happy
//             return allowed.includes(activeOption.market);
//         });

//         return (
//             <div className="flex flex-col gap-3">
//                 <div className="flex flex-wrap gap-2">
//                     {options.map((option) => {
//                         const isActive = rushingMarket === option.key;
//                         return (
//                             <button
//                                 key={option.key}
//                                 type="button"
//                                 onClick={() => {
//                                     setRushingMarket(option.key);
//                                     setValidation({ status: "idle", response: undefined, error: null });
//                                     setManualTier(undefined);
//                                     setCustomThreshold("");
//                                     setSelection((prev) => ({
//                                         ...prev,
//                                         scope: "PLAYER_PROP",
//                                         market: undefined,
//                                         playerId: undefined,
//                                         threshold: undefined,
//                                         side: "OVER",
//                                     }));
//                                     setStep({ kind: "GAME_DETAIL" });
//                                 }}
//                                 className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${isActive
//                                     ? "border-sky-400 bg-sky-500/20 text-sky-100"
//                                     : "border-white/10 text-gray-200 hover:border-sky-400/60"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {option.label}
//                             </button>
//                         );
//                     })}
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
//                     <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
//                         {activeOption.label}
//                     </p>
//                 </div>

//                 {eligiblePlayers && eligiblePlayers.length === 0 ? (
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
//                         No rushing props available for this matchup yet.
//                     </div>
//                 ) : (
//                     <div className="space-y-2">
//                         {eligiblePlayers && eligiblePlayers.map((player) => (
//                             <button
//                                 key={player.id}
//                                 type="button"
//                                 onClick={() => startPlayerThresholdFlow(player, activeOption.market, "RUSHING")}
//                                 className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
//                                 disabled={locked}
//                             >
//                                 <div className="flex items-center gap-3">
//                                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
//                                         {playerInitials(player)}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-semibold text-white">{player.name}</p>
//                                         <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                             {player.position} · {player.team} vs {player.opponent}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-xs font-semibold text-emerald-100">
//                                         {activeOption.label}
//                                     </p>
//                                     <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                         Tap to build pick
//                                     </p>
//                                 </div>
//                             </button>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderTdScorerTab = () => {
//         if (!selection.gameId) return null;
//         const playersForGame = nflPlayers?.players.filter((player) => player.gameId === selection.gameId);
//         return (
//             <div className="flex flex-col gap-3">
//                 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
//                     <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
//                         Anytime TD scorer
//                     </p>
//                 </div>
//                 {playersForGame && playersForGame.length === 0 ? (
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
//                         No TD markets available for this matchup yet.
//                     </div>
//                 ) : (
//                     <div className="space-y-2">
//                         {playersForGame && playersForGame.map((player) => (
//                             <div
//                                 key={player.id}
//                                 className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3"
//                             >
//                                 <div className="flex items-center gap-3">
//                                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide text-emerald-100">
//                                         {playerInitials(player)}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-semibold text-white">{player.name}</p>
//                                         <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                             {player.position} · {player.team} vs {player.opponent}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     {[1, 2, 3].map((count) => (
//                                         <button
//                                             key={count}
//                                             type="button"
//                                             onClick={() => handleTdChipSelection(player, count)}
//                                             className="rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
//                                             disabled={locked}
//                                         >
//                                             {count}+ TD
//                                         </button>
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderGameDetailContent = () => {
//         if (!activeGame) return null;
//         if (
//             step.kind === "GAME_MONEYLINE_TEAM" ||
//             step.kind === "GAME_SPREAD_TEAM" ||
//             step.kind === "GAME_SPREAD_MARGIN" ||
//             step.kind === "GAME_TOTAL_SIDE" ||
//             step.kind === "GAME_TOTAL_THRESHOLD"
//         ) {
//             return renderGameLinesFlow();
//         }

//         if (step.kind === "PLAYER_SELECT_THRESHOLD") {
//             return (
//                 <div className="flex flex-col gap-4">
//                     {renderThresholdSelector()}
//                     {renderValidationNotice()}
//                 </div>
//             );
//         }

//         switch (gameDetailTab) {
//             case "GAME_LINES":
//                 return renderGameLineChooser();
//             case "PASSING":
//                 return renderPassingPropsTab();
//             case "RECEIVING":
//                 return renderReceivingPropsTab();
//             case "RUSHING":
//                 return renderRushingPropsTab();
//             case "TD_SCORER":
//                 return renderTdScorerTab();
//             default:
//                 return renderGameLineChooser();
//         }
//     };

//     const renderThresholdSelector = () => {
//         if (!selection.market || !activePlayer) return null;
//         const thresholds = statThresholdsForMarket(selection.market);
//         const isTD = selection.market.includes("TDS");
//         const isRushRec = selection.market === "RUSHING_RECEIVING_YARDS";
//         const isSkillPlayer = ["RB", "WR", "TE"].includes(activePlayer.position);
//         const allowedSides: PickSide[] =
//             isRushRec || (isTD && isSkillPlayer)
//                 ? (["OVER"] as PickSide[])
//                 : (["OVER", "UNDER"] as PickSide[]);
//         const showSidePicker = !isRushRec;
//         const effectiveSide = selection.side ?? allowedSides[0];
//         const shouldShowThresholds = showSidePicker ? !!selection.side : true;
//         return (
//             <div className="flex flex-col gap-4">
//                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
//                     <p className="text-sm font-semibold text-white">
//                         How many {getMarketLabel(selection.market).toLowerCase()} do you think{" "}
//                         {activePlayer.name} will get?
//                     </p>
//                     <p className="text-xs text-gray-400">
//                         {isTD
//                             ? "We treat these as touchdown lines similar to what you'd see on a betting app."
//                             : "We treat these as stat lines similar to what you'd see on a betting app."}
//                     </p>
//                 </div>
//                 {showSidePicker && (
//                     <div className="flex gap-2">
//                         {allowedSides.map((option) => (
//                             <button
//                                 key={option}
//                                 type="button"
//                                 onClick={() =>
//                                     setSelection((prev) => ({
//                                         ...prev,
//                                         side: option,
//                                         threshold: undefined,
//                                     }))
//                                 }
//                                 className={`flex-1 rounded-2xl border px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide transition ${selection.side === option
//                                     ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
//                                     : "border-white/10 bg-white/5 text-gray-200 hover:border-emerald-400/60"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {option}
//                             </button>
//                         ))}
//                     </div>
//                 )}
//                 {shouldShowThresholds && effectiveSide && (
//                     <div className="flex flex-wrap gap-2">
//                         {thresholds.map((value) => (
//                             <button
//                                 key={value}
//                                 type="button"
//                                 onClick={() => setThresholdAndValidate(value, effectiveSide)}
//                                 className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selection.threshold === value
//                                     ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
//                                     : "border-white/15 text-gray-200 hover:border-emerald-400/60"
//                                     }`}
//                                 disabled={locked}
//                             >
//                                 {isTD ? `${value}+ TD${value > 1 ? "s" : ""}` : `${value}+`}
//                             </button>
//                         ))}
//                         <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2">
//                             <input
//                                 type="number"
//                                 min={0}
//                                 value={customThreshold}
//                                 onChange={(event) => setCustomThreshold(event.target.value)}
//                                 placeholder="Custom"
//                                 className="w-20 bg-transparent text-xs text-white outline-none"
//                             />
//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     const parsed = Number(customThreshold);
//                                     if (!Number.isNaN(parsed)) {
//                                         setThresholdAndValidate(parsed, effectiveSide);
//                                     }
//                                 }}
//                                 className="text-[11px] uppercase tracking-wide text-emerald-200"
//                             >
//                                 set
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderGameLineChooser = () => (
//         <div className="grid gap-3 sm:grid-cols-3">
//             <button
//                 type="button"
//                 onClick={() => handleGameLineMarketSelect("MONEYLINE")}
//                 className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
//                 disabled={locked}
//             >
//                 <h3 className="text-sm font-semibold text-white">Moneyline</h3>
//                 <p className="text-xs text-gray-400">Who wins the game?</p>
//             </button>
//             <button
//                 type="button"
//                 onClick={() => handleGameLineMarketSelect("SPREAD")}
//                 className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
//                 disabled={locked}
//             >
//                 <h3 className="text-sm font-semibold text-white">Spread</h3>
//                 <p className="text-xs text-gray-400">Win or lose by a margin</p>
//             </button>
//             <button
//                 type="button"
//                 onClick={() => handleGameLineMarketSelect("TOTAL_POINTS")}
//                 className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
//                 disabled={locked}
//             >
//                 <h3 className="text-sm font-semibold text-white">Total Points</h3>
//                 <p className="text-xs text-gray-400">Combined score in the game</p>
//             </button>
//         </div>
//     );

//     const renderTeamButtons = (market: PickMarket) => {
//         if (!activeGame) return null;
//         return (
//             <div className="grid gap-3 sm:grid-cols-2">
//                 {[{ id: activeGame.away_team_id, name: activeGame.away_team }, { id: activeGame.home_team_id, name: activeGame.home_team }].map(
//                     (team) => (
//                         <button
//                             key={team.id}
//                             type="button"
//                             onClick={() => handleTeamChoice(team.id, market)}
//                             className={`rounded-2xl border px-4 py-3 text-left transition ${selection.teamId === team.id
//                                 ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
//                                 : "border-white/10 bg-white/5 text-white hover:border-emerald-400/60"
//                                 }`}
//                             disabled={locked}
//                         >
//                             <p className="text-sm font-semibold">{team.name}</p>
//                             {market === "MONEYLINE" && (
//                                 <p className="text-xs text-gray-400">To win this game</p>
//                             )}
//                             {market === "SPREAD" && (
//                                 <p className="text-xs text-gray-400">Who covers the spread</p>
//                             )}
//                         </button>
//                     )
//                 )}
//             </div>
//         );
//     };

//     const renderSpreadMargins = () => {
//         const teamLabel =
//             selection.teamId && activeGame
//                 ? selection.teamId === activeGame.home_team_id
//                     ? activeGame.home_team
//                     : activeGame.away_team
//                 : "Team";

//         const currentValue =
//             selection.threshold && selection.threshold !== 0 ? selection.threshold : 1;

//         return (
//             <div className="flex flex-col gap-3">
//                 <div className="flex items-center justify-between">
//                     <p className="text-sm font-semibold text-white">
//                         Select the spread for {teamLabel}
//                     </p>
//                     <span className="text-xs text-gray-400">Range: -20 to +20</span>
//                 </div>
//                 <input
//                     type="range"
//                     min={-20}
//                     max={20}
//                     step={1}
//                     value={currentValue}
//                     onChange={(event) => {
//                         const raw = Number(event.target.value);
//                         const next = raw === 0 ? 1 : raw;
//                         setThresholdAndValidate(next);
//                     }}
//                     className="w-full accent-emerald-400"
//                     disabled={locked}
//                 />
//                 <div className="flex items-center justify-between text-xs text-gray-400">
//                     <span>{teamLabel} -20</span>
//                     <span className="text-sm font-semibold text-white">
//                         {teamLabel} {currentValue > 0 ? `+${currentValue}` : currentValue}
//                     </span>
//                     <span>{teamLabel} +20</span>
//                 </div>
//             </div>
//         );
//     };

//     const renderTotalPoints = () => (
//         <div className="flex flex-col gap-4">
//             <div className="flex gap-2">
//                 {(["OVER", "UNDER"] as PickSide[]).map((option) => (
//                     <button
//                         key={option}
//                         type="button"
//                         onClick={() => handleSideChoice(option)}
//                         className={`flex-1 rounded-2xl border px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide transition ${selection.side === option
//                             ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
//                             : "border-white/10 bg-white/5 text-gray-200 hover:border-emerald-400/60"
//                             }`}
//                         disabled={locked}
//                     >
//                         {option}
//                     </button>
//                 ))}
//             </div>
//             {selection.side && (
//                 <div className="flex flex-wrap gap-2">
//                     {TOTAL_POINT_THRESHOLDS.map((value) => (
//                         <button
//                             key={value}
//                             type="button"
//                             onClick={() => setThresholdAndValidate(value, selection.side)}
//                             className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selection.threshold === value
//                                 ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
//                                 : "border-white/15 text-gray-200 hover:border-emerald-400/60"
//                                 }`}
//                             disabled={locked}
//                         >
//                             <span className="text-sm font-semibold text-white">{value}</span>
//                             <span className="ml-1 text-[10px] uppercase tracking-wide text-gray-400">
//                                 pts
//                             </span>
//                         </button>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );

//     const renderValidationNotice = () => {
//         if (validation.status === "idle") return null;

//         if (validation.error) {
//             return (
//                 <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
//                     {validation.error}
//                 </div>
//             );
//         }

//         if (validationStatus === "VALID") {
//             return (
//                 <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
//                     This looks like a real market. Odds loaded below.
//                 </div>
//             );
//         }

//         if (validationStatus === "TOO_SAFE") {
//             return (
//                 <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
//                     <p>
//                         Sportsbooks don’t even offer this line. It’s likely too safe. Try a higher
//                         number.
//                     </p>
//                     {validationSuggestions.length > 0 && (
//                         <div className="flex flex-wrap gap-2">
//                             {validationSuggestions.map((suggested) => (
//                                 <button
//                                     key={suggested}
//                                     type="button"
//                                     onClick={() => setThresholdAndValidate(suggested, selection.side)}
//                                     className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
//                                 >
//                                     {selection.market === "TOTAL_POINTS"
//                                         ? `${suggested}`
//                                         : `${suggested}+`}
//                                 </button>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             );
//         }

//         if (validationStatus === "TOO_CRAZY") {
//             return (
//                 <div className="flex flex-col gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
//                     <p>
//                         No major book offers a line this high. It’s probably too extreme. Try a more
//                         realistic number.
//                     </p>
//                     {validationSuggestions.length > 0 && (
//                         <div className="flex flex-wrap gap-2">
//                             {validationSuggestions.map((suggested) => (
//                                 <button
//                                     key={suggested}
//                                     type="button"
//                                     onClick={() => setThresholdAndValidate(suggested, selection.side)}
//                                     className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white/40"
//                                 >
//                                     {selection.market === "TOTAL_POINTS"
//                                         ? `${suggested}`
//                                         : `${suggested}+`}
//                                 </button>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             );
//         }

//         if (validationStatus === "NO_MARKET" || validationStatus === "API_ERROR") {
//             return (
//                 <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-200">
//                     We couldn’t fetch matching odds right now. Your pick can still be created, but
//                     odds data may be unavailable.
//                 </div>
//             );
//         }

//         return null;
//     };

//     const renderConfirmation = () => {
//         const summary = buildSummary(selection, customDescription);

//         const autoTier =
//             validation.response?.difficultyTier ??
//             (validation.response?.bestOffer?.americanOdds
//                 ? tierFromAmericanOdds(validation.response.bestOffer.americanOdds)
//                 : undefined);

//         const effectiveTier = manualTier ?? autoTier;
//         const points =
//             validation.response?.points ??
//             (effectiveTier ? pointsByTier[effectiveTier] : undefined);

//         const canChooseTierManually =
//             validationStatus === "NO_MARKET" || validationStatus === "API_ERROR";

//         return (
//             <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
//                 <div className="flex items-start justify-between gap-3">
//                     <div className="space-y-1">
//                         <p className="text-xs uppercase tracking-wide text-gray-400">
//                             Your pick
//                         </p>
//                         <p className="text-base font-semibold text-white">{summary}</p>
//                         {selection.market === "SPREAD" &&
//                             selection.threshold &&
//                             selection.teamId &&
//                             activeGame && (
//                                 <p className="text-xs text-gray-400">
//                                     We’ll map this to the closest alternate spread for{" "}
//                                     {selection.teamId === activeGame.home_team_id
//                                         ? activeGame.home_team
//                                         : activeGame.away_team}{" "}
//                                     {selection.threshold > 0
//                                         ? `+${selection.threshold}`
//                                         : selection.threshold}
//                                     .
//                                 </p>
//                             )}
//                         <p className="text-xs text-gray-300">
//                             {effectiveTier
//                                 ? `Based on your selection, you’ve made a ${difficultyCopy(
//                                     effectiveTier
//                                 )} (Tier ${effectiveTier}) pick.`
//                                 : "Based on your selection, difficulty is currently unknown."}
//                         </p>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={goBack}
//                         className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300 transition hover:border-emerald-400/60"
//                     >
//                         edit
//                     </button>
//                 </div>

//                 <div className="grid gap-3 sm:grid-cols-2">
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
//                         <p className="text-xs uppercase tracking-wide text-gray-400">
//                             Difficulty
//                         </p>
//                         <p className="text-sm font-semibold text-white">
//                             {difficultyCopy(effectiveTier)}{" "}
//                             {points ? `· ${points} pts` : ""}
//                         </p>

//                         <button
//                             type="button"
//                             onClick={() => setShowTierModal(true)}
//                             className="mt-2 text-[11px] uppercase tracking-wide text-gray-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
//                         >
//                             How do tiers map to odds and points?
//                         </button>

//                         {canChooseTierManually && (
//                             <div className="mt-3 space-y-1">
//                                 <p className="text-[11px] text-gray-400">
//                                     Odds data is missing. Pick a difficulty tier manually:
//                                 </p>
//                                 <select
//                                     value={manualTier ?? ""}
//                                     onChange={(event) => {
//                                         const value = Number(
//                                             event.target.value
//                                         ) as 1 | 2 | 3 | 4 | 5;
//                                         setManualTier(Number.isNaN(value) ? undefined : value);
//                                     }}
//                                     className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none"
//                                 >
//                                     <option value="">Select tier…</option>
//                                     {[1, 2, 3, 4, 5].map((tier) => (
//                                         <option key={tier} value={tier}>
//                                             {`Tier ${tier} – ${difficultyCopy(tier)} (${pointsByTier[tier as 1 | 2 | 3 | 4 | 5]} pts)`}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
//                         )}
//                     </div>

//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
//                         <p className="text-xs uppercase tracking-wide text-gray-400">
//                             Status
//                         </p>
//                         <p className="text-sm font-semibold text-white">
//                             {validationStatus ?? "PENDING"}
//                         </p>
//                     </div>
//                 </div>

//                 {validation.response?.bookOdds ? (
//                     <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-4">
//                         <p className="text-xs uppercase tracking-wide text-gray-400">
//                             How the books see it
//                         </p>
//                         <div className="space-y-2">
//                             {validation.response.bookOdds.map((odds) => (
//                                 <div
//                                     key={`${odds.book}-${odds.americanOdds}-${odds.marketLine ?? ""
//                                         }`}
//                                     className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white"
//                                 >
//                                     <span>{odds.book}</span>
//                                     <div className="flex items-center gap-2 text-xs text-gray-300">
//                                         {odds.marketLine !== undefined && (
//                                             <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-200">
//                                                 Line {odds.marketLine}
//                                             </span>
//                                         )}
//                                         <span className="font-semibold">
//                                             {formatOdds(odds.americanOdds)}
//                                         </span>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                         {validation.response.bestOffer && (
//                             <a
//                                 href={validation.response.bestOffer.deeplinkUrl ?? "#"}
//                                 className="inline-flex items-center justify-center rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30"
//                                 target="_blank"
//                                 rel="noreferrer"
//                             >
//                                 Open at {validation.response.bestOffer.book}
//                             </a>
//                         )}
//                     </div>
//                 ) : (
//                     <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-200">
//                         We couldn’t find a matching market at major books right now.
//                         Your pick still counts in gotLocks; odds data unavailable.
//                     </div>
//                 )}

//                 <div className="flex flex-wrap items-center gap-3">
//                     <button
//                         type="button"
//                         onClick={handleSubmitPick}
//                         disabled={locked}
//                         className="rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
//                     >
//                         confirm pick
//                     </button>
//                     <button
//                         type="button"
//                         onClick={goBack}
//                         className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
//                     >
//                         edit pick
//                     </button>
//                     <button
//                         type="button"
//                         onClick={resetFlow}
//                         className="text-xs uppercase tracking-wide text-gray-400 underline decoration-dotted underline-offset-4"
//                     >
//                         start over
//                     </button>
//                 </div>
//             </div>
//         );
//     };

//     const renderStep = () => {
//         if (step.kind === "GAME_SELECT") return renderGameEntryStep();
//         if (step.kind === "CONFIRMATION") return renderConfirmation();
//         if (!activeGame) return renderGameEntryStep();
//         return renderGameDetailShell(renderGameDetailContent());
//     };

//     const allowContinue =
//         validationStatus === "NO_MARKET" || validationStatus === "API_ERROR";


//     if (!slip) {
//         return (
//             <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//                 No active slip yet. Commissioner will launch the next contest soon.
//             </div>
//         );
//     }

//     return (
//         <>
//             <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-lg backdrop-blur">
//                 <div className="flex flex-col gap-2">
//                     <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-gray-400">
//                         <span>role: {isCommissioner ? "commissioner" : "member"}</span>
//                         <span>deadline: {formatDateTime(slip.pick_deadline_at)}</span>
//                     </div>
//                     <div className="flex flex-wrap gap-3">
//                         <button
//                             type="button"
//                             onClick={() => setShowTipsModal(true)}
//                             className="rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-200/60"
//                         >
//                             Tips →
//                         </button>
//                         <button
//                             type="button"
//                             onClick={() => setShowModal(true)}
//                             className="rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-200/60"
//                         >
//                             View scoring →
//                         </button>
//                         <button
//                             type="button"
//                             onClick={resetFlow}
//                             className="rounded-2xl border border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
//                         >
//                             Start over
//                         </button>
//                     </div>
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
//                     {pick ? (
//                         <div className="space-y-2">
//                             <span className="text-xs uppercase text-gray-500">
//                                 your current pick
//                             </span>
//                             <p className="text-white">{pick.description}</p>
//                             <p className="text-xs text-gray-400">
//                                 Odds bracket: {pick.odds_bracket}
//                             </p>
//                             <p className="text-xs text-gray-400">
//                                 Status: {pick.result ? pick.result.toUpperCase() : ""} · slip points {pick.points}
//                             </p>
//                             {slipRow && (
//                                 <p className="text-xs text-gray-500">
//                                     Cumulative: {slipRow.cumulative_points}
//                                 </p>
//                             )}
//                         </div>
//                     ) : (
//                         <p className="text-sm text-gray-400">
//                             No pick yet. Lock something in before the deadline hits.
//                         </p>
//                     )}
//                 </div>

//                 <div className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-inner">
//                     <div className="mb-4 flex items-center justify-between">
//                         <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
//                             <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-gray-200">
//                                 {stepLabel(step)}
//                             </span>
//                             {activeGame && (
//                                 <span className="text-[11px] text-gray-400">
//                                     {activeGame.away_team} @ {activeGame.home_team} ·{" "}
//                                     {formatDateAndTime(activeGame.gameday, activeGame.gametime)}
//                                 </span>
//                             )}
//                         </div>
//                         {step.kind !== "GAME_SELECT" && (
//                             <button
//                                 type="button"
//                                 onClick={goBack}
//                                 className="text-xs uppercase tracking-wide text-emerald-200 underline decoration-dotted underline-offset-4"
//                             >
//                                 Back
//                             </button>
//                         )}
//                     </div>

//                     <div className="flex flex-col gap-4">{renderStep()}</div>

//                     {allowContinue && step.kind !== "CONFIRMATION" && (
//                         <div className="mt-4 flex justify-end">
//                             <button
//                                 type="button"
//                                 onClick={() => setStep({ kind: "CONFIRMATION" })}
//                                 className="rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200 transition hover:border-emerald-400/60"
//                             >
//                                 Continue anyway
//                             </button>
//                         </div>
//                     )}

//                     {validation.status === "loading" && (
//                         <p className="mt-3 text-xs text-gray-400">Checking books for this market…</p>
//                     )}
//                 </div>
//                 <div className="text-xs text-gray-400">
//                     {locked
//                         ? "Picks locked — wait for results."
//                         : "You can resubmit until the pick deadline. Only the last one counts."}
//                 </div>
//             </section>

//             <TipsModal open={showTipsModal} onClose={() => setShowTipsModal(false)} />
//             <ScoringModal open={showModal} onClose={() => setShowModal(false)} />
//             <TierInfoModal open={showTierModal} onClose={() => setShowTierModal(false)} />
//         </>
//     );
// };

// const TipsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
//     useEffect(() => {
//         if (!open) return;
//         const handler = (event: KeyboardEvent) => {
//             if (event.key === "Escape") onClose();
//         };
//         window.addEventListener("keydown", handler);
//         return () => window.removeEventListener("keydown", handler);
//     }, [open, onClose]);

//     if (!open) return null;

//     return (
//         <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
//             role="dialog"
//             aria-modal="true"
//             onClick={onClose}
//         >
//             <div
//                 className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur"
//                 onClick={(event) => event.stopPropagation()}
//             >
//                 <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
//                     <h2 className="text-lg font-semibold text-white">Tips for building a pick</h2>
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
//                         aria-label="Close tips"
//                     >
//                         X
//                     </button>
//                 </div>
//                 <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-200">
//                     <div className="space-y-4">
//                         <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//                             <span className="mt-1 text-rose-200">•</span>
//                             <p>
//                                 Our pick maker is designed to help you{" "}
//                                 <span className="font-semibold text-white">go with your gut</span> first and
//                                 worry about odds second. You make the call, then we show you how the books
//                                 see it so you don&apos;t get anchored or talked out of your own read.
//                             </p>
//                         </div>
//                         <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//                             <span className="mt-1 text-rose-200">•</span>
//                             <p>
//                                 Use <span className="font-semibold text-white">Game Lines</span> when you have
//                                 a take on the matchup (who wins, scoring environment, big spreads) and{" "}
//                                 <span className="font-semibold text-white">Player Props</span> when you have a
//                                 read on individual stat lines (yards, receptions, TDs).
//                             </p>
//                         </div>
//                         <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//                             <span className="mt-1 text-rose-200">•</span>
//                             <p>
//                                 The difficulty tiers — Very Safe, Safe, Balanced, Risky, Moonshot — map real
//                                 odds into points. Easier picks earn fewer points, bolder calls earn more.
//                                 Aim for a mix that fits your risk appetite.
//                             </p>
//                         </div>
//                         <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//                             <span className="mt-1 text-rose-200">•</span>
//                             <p>
//                                 If you&apos;re thinking about something weird (1st quarter stats, drive props,
//                                 etc.) that doesn&apos;t fit our builder, use the{" "}
//                                 <span className="font-semibold text-white">&quot;Got something different?&quot;</span>{" "}
//                                 box on the first step to submit a custom pick.
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const TierInfoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
//     useEffect(() => {
//         if (!open) return;
//         const handler = (event: KeyboardEvent) => {
//             if (event.key === "Escape") onClose();
//         };
//         window.addEventListener("keydown", handler);
//         return () => window.removeEventListener("keydown", handler);
//     }, [open, onClose]);

//     if (!open) return null;

//     const tiers = [
//         { tier: 1, odds: "≤ -250", label: difficultyCopy(1), pts: pointsByTier[1] },
//         { tier: 2, odds: "-249 to 0", label: difficultyCopy(2), pts: pointsByTier[2] },
//         { tier: 3, odds: "+1 to +250", label: difficultyCopy(3), pts: pointsByTier[3] },
//         { tier: 4, odds: "+251 to +500", label: difficultyCopy(4), pts: pointsByTier[4] },
//         { tier: 5, odds: "+501+", label: difficultyCopy(5), pts: pointsByTier[5] },
//     ];

//     return (
//         <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
//             role="dialog"
//             aria-modal="true"
//             onClick={onClose}
//         >
//             <div
//                 className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur"
//                 onClick={(event) => event.stopPropagation()}
//             >
//                 <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
//                     <h2 className="text-lg font-semibold text-white">How tiers map to odds & points</h2>
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
//                         aria-label="Close tier info"
//                     >
//                         X
//                     </button>
//                 </div>
//                 <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-200">
//                     <div className="space-y-3">
//                         {tiers.map((row) => (
//                             <div
//                                 key={row.tier}
//                                 className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
//                             >
//                                 <div className="space-y-1">
//                                     <p className="text-[11px] uppercase tracking-wide text-gray-400">
//                                         Tier {row.tier} · {row.label}
//                                     </p>
//                                     <p className="text-xs text-gray-300">Odds: {row.odds}</p>
//                                 </div>

//                                 <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
//                                     {row.pts} pts
//                                 </span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default NewMakePickTab;
