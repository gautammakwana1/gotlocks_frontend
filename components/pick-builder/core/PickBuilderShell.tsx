"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BuildMode, BuiltPickPayload, ConfidenceLevel, CurrentUser, DraftPick, Group, GroupObject, League, ParlayLeg, Pick, PostDestinationGroups, RootState, Slip } from "@/lib/interfaces/interfaces";
import NbaPickBuilder from "../nba/NbaPickBuilder";
import NflPickBuilder from "../nfl/NflPickBuilder";
import { formatTierPrimary, getTierMetaForPick } from "@/lib/utils/scoring";
import NcaabPickBuilder from "../ncaab/NcaabPickBuilder";
import NhlPickBuilder from "../nhl/NhlPickBuilder";
import { useDispatch, useSelector } from "react-redux";
import { fetchLeaguesCountsRequest } from "@/lib/redux/slices/leagueSlice";
import { ReviewSheetState } from "./reviewSheetState";
import MlbPickBuilder from "../mlb/MlbPickBuilder";
import FootballAnimation from "../../animations/FootballAnimation";
import { FALLBACK_LEAGUE } from "@/lib/constants";
import SoccerPickBuilder from "../soccer/SoccerPickBuilder";
import PickBuilderShellSkeleton from "./skeletons/PickBuilderShellSkeleton";

type SlipBuilderContext = {
    mode: "slip";
    group: Group;
    slip: Slip;
    picks: Pick[];
    currentUser: CurrentUser | null;
    initialPick?: Pick;
    isCommissioner: boolean;
    onSave: (payload: BuiltPickPayload, pickId?: string) => void;
    onSelectActiveLeague: (league: League) => void;
    showCurrentPick?: boolean;
};

type StandaloneBuilderContext = {
    mode: "standalone";
    group?: GroupObject[];
    slip: Slip[];
    currentUser: CurrentUser | null;
    intent?: "post";
    onComplete: (payload: BuiltPickPayload) => void;
    onSaveVibePick?: (payload: BuiltPickPayload) => void;
    onPostToSlip?: (payload: BuiltPickPayload) => void;
    onSelectPostDestination?: (
        groups: PostDestinationGroups,
        reset: () => void
    ) => void;
    onPickOfDay?: (payload: BuiltPickPayload) => void;
    onCreatePostPick?: (payload: BuiltPickPayload) => void;
    onSelectActiveLeague: (league: League) => void;
    pickDeadline?: string;
    windowDays?: number;
    initialPick?: Pick;
};

type PickBuilderShellProps =
    | {
        context: SlipBuilderContext;
        initialLeague?: League;
        initialBuildMode?: BuildMode;
        leagues?: League[];
        onDismiss?: () => void;
        showDismissButton?: boolean;
        compact?: boolean;
        surface?: "page" | "drawer";
    }
    | {
        context: StandaloneBuilderContext;
        initialLeague?: League;
        initialBuildMode?: BuildMode;
        leagues?: League[];
        onDismiss?: () => void;
        showDismissButton?: boolean;
        compact?: boolean;
        surface?: "page" | "drawer";
    };

const ALL_LEAGUES: League[] = [
    "NFL",
    "NBA",
    "NCAAF",
    "NCAAB",
    "NHL",
    "MLB",
    "Soccer",
];

const normalizeLeague = (league?: League | string): League => {
    const upper = (league ?? "NFL").toUpperCase();
    if (upper === "SOCCER") return "Soccer";
    return (upper as League) ?? "NFL";
};

const toDateKey = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

const StubLeagueBuilder = ({
    league,
    onSave,
    onCancel,
    initialPick,
    isGroupScoring = false,
}: {
    league: League;
    onSave: (payload: BuiltPickPayload) => void;
    onCancel?: () => void;
    initialPick?: Pick;
    isGroupScoring?: boolean;
}) => {
    const [description, setDescription] = useState(initialPick?.description ?? "");
    const [odds, setOdds] = useState(initialPick?.odds_bracket ?? "");
    const tierMeta = useMemo(
        () =>
            getTierMetaForPick({
                odds,
                label: initialPick?.difficulty_label ?? null,
                points: initialPick?.points ?? null,
                mode: isGroupScoring ? "leagueLeaderboard" : "global",
            }),
        [initialPick?.difficulty_label, initialPick?.points, isGroupScoring, odds]
    );
    const tierPrimary = tierMeta ? formatTierPrimary(tierMeta.tier) : "Tier —";
    const tierName = tierMeta?.name ?? "—";
    const tierPoints = tierMeta?.points;

    const disabled = !description.trim() || !odds.trim();

    const handleSave = () => {
        if (!description.trim() || !odds.trim()) return;
        onSave({
            sport: league,
            description: description.trim(),
            odds_bracket: odds.trim() ? odds.trim() : null,
            difficulty_label: tierMeta?.name ?? null,
            points: tierPoints,
            sourceTab: "Custom pick",
        });
    };

    return (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/70 p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-white">{league} coming soon</p>
                    <p className="text-xs text-gray-400">
                        This league is stubbed for now. Drop a custom pick so you can keep moving.
                    </p>
                </div>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/30"
                    >
                        Close
                    </button>
                )}
            </div>

            <label className="flex flex-col gap-1 text-xs text-gray-400">
                pick description
                <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="ui-input-accent min-h-[120px] rounded-2xl border border-white/12 bg-black px-3 py-2 text-base sm:text-sm text-white outline-none transition0"
                    placeholder={`Example: ${league} custom pick`}
                />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                    odds (required)
                    <input
                        value={odds}
                        onChange={(event) => setOdds(event.target.value)}
                        className="ui-input-accent rounded-2xl border border-white/12 bg-black px-3 py-2 text-base sm:text-sm text-white outline-none transition"
                        placeholder="+150"
                    />
                </label>
                <div className="rounded-2xl border border-white/12 bg-black px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">tier preview</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                        {tierPrimary}
                        {tierPoints ? ` · ${tierPoints} pts` : ""}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {tierName}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30"
                    >
                        cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled}
                    className="ui-accent-button rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Save custom pick
                </button>
            </div>
        </div>
    );
};

export const PickBuilderShell = (props: PickBuilderShellProps) => {
    const { compact = false, surface = "page", context, onDismiss } = props;
    const dispatch = useDispatch();

    // const buildMode = "ODDS";
    const todayKey = useMemo(() => toDateKey(new Date().toISOString()), []);
    const [activeDateKey, setActiveDateKey] = useState<string>(todayKey);
    const [hasManualDateSelection, setHasManualDateSelection] = useState(false);
    const [dateOptions, setDateOptions] = useState<Array<{ key: string; label: string }>>(
        []
    );
    const [draftPick, setDraftPick] = useState<DraftPick | null>(null);
    const [sharedParlayLegs, setSharedParlayLegs] = useState<ParlayLeg[]>([]);
    const [sharedCollapsedSections, setSharedCollapsedSections] = useState<
        Record<string, boolean>
    >({});
    const [sharedReviewOpen, setSharedReviewOpen] = useState(false);
    const [sharedSelectedConfidence, setSharedSelectedConfidence] =
        useState<ConfidenceLevel | null>(null);
    const [sharedSameGameComboConfidences, setSharedSameGameComboConfidences] =
        useState<Record<string, ConfidenceLevel | null>>({});
    const [sharedStraightConfidences, setSharedStraightConfidences] = useState<
        Record<string, ConfidenceLevel | null>
    >({});
    const [hasManualLeagueSelection, setHasManualLeagueSelection] = useState(false);
    // const [hasAutoSelectedLeague, setHasAutoSelectedLeague] = useState(false);

    const { leagueCounts, loading } = useSelector((state: RootState) => state.league);
    const { loading: pickLoading } = useSelector((state: RootState) => state.pick);

    useEffect(() => {
        // const todayDateKey = toLocalDateKeyFromUTC(new Date().toISOString());
        if (activeDateKey) {
            dispatch(fetchLeaguesCountsRequest({ date: activeDateKey }));
        }
    }, [dispatch, activeDateKey]);

    const leagues = props.leagues ?? ALL_LEAGUES;

    const initialLeagueBasis = useMemo(() => {
        return normalizeLeague(
            props.initialLeague ?? (context.mode === "slip"
                ? (context.initialPick?.sport as League | undefined)
                : context.initialPick?.sport) ?? "NFL"
        );
    }, [props.initialLeague, context]);

    const sortedLeagues = useMemo(() => {
        if (!leagues.length) {
            return [FALLBACK_LEAGUE];
        }
        const filtered = [...leagues].filter((l) => {
            const count = leagueCounts?.[l] ?? 0;
            if (leagues.length > 1) {
                return count > 0;
            }
            return count > 0 || l === initialLeagueBasis;
        });

        if (!filtered.length) {
            return [FALLBACK_LEAGUE];
        }

        return filtered.sort((a, b) => {
            const countA = leagueCounts?.[a] ?? 0;
            const countB = leagueCounts?.[b] ?? 0;
            return countB - countA;
        });
    }, [leagues, leagueCounts, initialLeagueBasis]);

    const allowedLeagues = useMemo(() => {
        if (context.mode !== "slip") return sortedLeagues;
        const allowed = sortedLeagues.filter((league) => {
            if (!Array.isArray(context.slip.sports)) return;
            return context.slip.sports.map((sport) => normalizeLeague(sport)).includes(league)
        });
        return allowed.length > 0 ? allowed : sortedLeagues;
    }, [context, sortedLeagues]);

    const initialLeague =
        normalizeLeague(props.initialLeague ?? (context.mode === "slip"
            ? (context.initialPick?.sport as League | undefined)
            : context.initialPick?.sport)) ?? allowedLeagues[0];

    const [activeLeague, setActiveLeague] = useState<League>(
        allowedLeagues.find((league) => league === normalizeLeague(initialLeague)) ??
        allowedLeagues[0] ??
        "NFL"
    );

    useEffect(() => {
        const hasCounts = leagueCounts && Object.keys(leagueCounts).length > 0;
        if (!hasManualLeagueSelection && hasCounts && !context.initialPick) {
            if (allowedLeagues.length > 0) {
                const firstLeague = allowedLeagues[0];
                if (firstLeague !== activeLeague) {
                    setActiveLeague(firstLeague);
                }
                // setHasAutoSelectedLeague(true);
            }
        }
    }, [allowedLeagues, leagueCounts, hasManualLeagueSelection, context.initialPick, activeLeague]);

    useEffect(() => {
        if (!activeLeague) return;
        context.onSelectActiveLeague(activeLeague);
    }, [activeLeague]);

    const handleDateChange = useCallback(
        (key: string, source: "user" | "auto" = "user") => {
            setActiveDateKey(key);
            if (source === "user") {
                setHasManualDateSelection(true);
            }
            setTimeout(() => {
                const container = document.querySelector('#active-date-key--container') as HTMLDivElement;
                const activeTab = document.querySelector('#active-date-key--container button.active') as HTMLButtonElement;

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
        },
        []
    );
    const handleDateOptionsChange = useCallback(
        (options: Array<{ key: string; label: string }>) => {
            setDateOptions(options);
        },
        []
    );

    useEffect(() => {
        if (!hasManualDateSelection && leagueCounts && Object.keys(leagueCounts).length > 0) {
            const allZeros = Object.values(leagueCounts).every((count) => count === 0);
            if (allZeros && dateOptions.length > 0) {
                const currentIndex = dateOptions.findIndex((opt) => opt.key === activeDateKey);
                if (currentIndex !== -1 && currentIndex < dateOptions.length - 1) {
                    const nextDay = dateOptions[currentIndex + 1];
                    handleDateChange(nextDay.key, "auto");
                }
            }
        }
    }, [leagueCounts, hasManualDateSelection, dateOptions, activeDateKey, handleDateChange]);

    // Auto-select the first available date when the current selection isn't in the
    // window (e.g. slip mode where today is outside the slip's eligibility window),
    // unless the user has already picked a date manually.
    useEffect(() => {
        if (hasManualDateSelection) return;
        if (dateOptions.length === 0) return;
        const isActiveValid = dateOptions.some((option) => option.key === activeDateKey);
        if (!isActiveValid) {
            handleDateChange(dateOptions[0].key, "auto");
        }
    }, [dateOptions, activeDateKey, hasManualDateSelection, handleDateChange]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent("pick-builder-selection", {
                detail: { active: Boolean(draftPick) },
            })
        );
    }, [draftPick]);

    useEffect(() => {
        return () => {
            if (typeof window === "undefined") return;
            window.dispatchEvent(
                new CustomEvent("pick-builder-selection", { detail: { active: false } })
            );
        };
    }, []);

    const standaloneTiming = useMemo(() => {
        if (context.mode !== "standalone") return null;
        const today = new Date();
        const endDeadline = new Date(today);
        endDeadline.setDate(today.getDate() + 2);
        const deadline = new Date(endDeadline).toISOString().split('T')[0];
        return {
            pickDeadline: context.pickDeadline ?? deadline,
            windowDays: context.windowDays ?? 5,
        };
    }, [context]);

    const standaloneGroup =
        context.mode === "standalone" && context.currentUser
            ? ({
                id: "solo-league",
                name: "Personal Picks",
                invite_code: "00000",
                created_by: context.currentUser.userId,
                members: [context.currentUser.userId],
                is_enable_secondary_leaderboard: false,
                group_type: "league",
                hosting_tier: "free",
                max_active_contests: 3,
                max_members: 10
            } satisfies Group)
            : null;

    const standaloneSlip =
        context.mode === "standalone" && standaloneGroup && context.currentUser
            ? ({
                group_id: standaloneGroup.id,
                name: `${activeLeague} pick`,
                sports: [activeLeague],
                isGraded: false,
                pick_limit: 1,
                pick_deadline_at: standaloneTiming?.pickDeadline ?? new Date().toISOString(),
                window_days: standaloneTiming?.windowDays ?? 5,
                status: "open",
                created_by: context.currentUser.userId,
                betLink: null,
                contest_id: "",
            } satisfies Slip)
            : null;

    const showDateStrip = true;
    const hasDateOptions = showDateStrip && dateOptions.length > 0;
    const reviewSheetState = useMemo<ReviewSheetState>(
        () => ({
            collapsedSections: sharedCollapsedSections,
            setCollapsedSections: setSharedCollapsedSections,
            isOpen: sharedReviewOpen,
            setIsOpen: setSharedReviewOpen,
            selectedConfidence: sharedSelectedConfidence,
            setSelectedConfidence: setSharedSelectedConfidence,
            sameGameComboConfidences: sharedSameGameComboConfidences,
            setSameGameComboConfidences: setSharedSameGameComboConfidences,
            straightConfidences: sharedStraightConfidences,
            setStraightConfidences: setSharedStraightConfidences,
        }),
        [
            sharedCollapsedSections,
            sharedReviewOpen,
            sharedSelectedConfidence,
            sharedSameGameComboConfidences,
            sharedStraightConfidences,
        ]
    );
    const sharedParlayProps = {
        parlayLegs: sharedParlayLegs,
        onParlayLegsChange: setSharedParlayLegs,
        reviewSheetState,
    };

    const handleComplete = (payload: BuiltPickPayload) => {
        const normalized: BuiltPickPayload = {
            ...payload,
            sport: payload.sport ?? activeLeague,
        };
        if (context.mode === "slip") {
            context.onSave(normalized, context.initialPick?.id);
            return;
        }
        context.onComplete(normalized);
    };

    const handleLeagueSelect = (league: League) => {
        setActiveLeague(league);
        setHasManualLeagueSelection(true);
        setTimeout(() => {
            const container = document.querySelector('#league-list-tabs-container') as HTMLDivElement;
            const activeTab = document.querySelector('#league-list-tabs-container button.active') as HTMLButtonElement;

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
    }

    const builder = (() => {
        if (activeLeague === "NFL") {
            if (context.mode === "slip") {
                return (
                    <NflPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        // allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <NflPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        onCreatePostPick={context.onCreatePostPick}
                        onPostToSlip={context.onPostToSlip}
                        enforceEligibilityWindow={false}
                        builderMode={context.intent}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        // onDateChange={handleDateChange}
                        // allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        if (activeLeague === "NBA") {
            if (context.mode === "slip") {
                return (
                    <NbaPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        showCurrentPick={context.showCurrentPick}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <NbaPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onPostToSlip={context.onPostToSlip}
                        onCreatePostPick={context.onCreatePostPick}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        enforceEligibilityWindow={false}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        if (activeLeague === "NCAAB") {
            if (context.mode === "slip") {
                return (
                    <NcaabPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        showCurrentPick={context.showCurrentPick}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <NcaabPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCreatePostPick={context.onCreatePostPick}
                        onPostToSlip={context.onPostToSlip}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        enforceEligibilityWindow={false}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        if (activeLeague === "NHL") {
            if (context.mode === "slip") {
                return (
                    <NhlPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        showCurrentPick={context.showCurrentPick}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <NhlPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCreatePostPick={context.onCreatePostPick}
                        onPostToSlip={context.onPostToSlip}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        enforceEligibilityWindow={false}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        if (activeLeague === "MLB") {
            if (context.mode === "slip") {
                return (
                    <MlbPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        showCurrentPick={context.showCurrentPick}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <MlbPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCreatePostPick={context.onCreatePostPick}
                        onPostToSlip={context.onPostToSlip}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        enforceEligibilityWindow={false}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        if (activeLeague === "Soccer") {
            if (context.mode === "slip") {
                return (
                    <SoccerPickBuilder
                        sport={activeLeague}
                        group={context.group}
                        slip={context.slip}
                        currentUser={context.currentUser}
                        picks={context.picks}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCancel={onDismiss}
                        isCommissioner={context.isCommissioner}
                        showCurrentPick={context.showCurrentPick}
                        enforceEligibilityWindow
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }

            if (standaloneGroup && standaloneSlip) {
                return (
                    <SoccerPickBuilder
                        sport={activeLeague}
                        group={standaloneGroup}
                        slip={standaloneSlip}
                        currentUser={context.currentUser}
                        picks={[]}
                        initialPick={context.initialPick}
                        onSave={handleComplete}
                        onCreatePostPick={context.onCreatePostPick}
                        onPostToSlip={context.onPostToSlip}
                        onSelectPostDestination={context.onSelectPostDestination}
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        enforceEligibilityWindow={false}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        onDateChange={handleDateChange}
                        allowAutoDateAdvance={!hasManualDateSelection}
                        hideDateControls
                        onDateOptionsChange={handleDateOptionsChange}
                        {...sharedParlayProps}
                    />
                );
            }
        }

        return (
            <StubLeagueBuilder
                league={activeLeague}
                onSave={handleComplete}
                onCancel={onDismiss}
                initialPick={context.mode === "slip" ? context.initialPick : undefined}
                isGroupScoring={false}
            />
        );
    })();

    if (loading) {
        return <PickBuilderShellSkeleton />
    }

    if (pickLoading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    }

    const dateControlsMargin = compact ? "mt-1" : "mt-3";
    const leagueControlsMargin = compact
        ? "mt-1"
        : hasDateOptions
            ? "mt-2"
            : "mt-3";

    return (
        <div className={`space-y-4 ${compact ? "[&_.pick-builder-game-list]:max-h-none [&_.pick-builder-game-list]:overflow-y-visible" : ""}`}>
            {/* --app-header-height clears the app TopNav (77px, 87px at lg); inside a
                drawer there is none, so the date rail must stick to the drawer's own
                scroll container instead. */}
            <div className={`sticky ${surface === "drawer" ? "top-0" : "top-[var(--app-header-height,77px)]"} z-20 -mx-5 bg-gradient-to-b from-black to-black/60 px-5 sm:-mx-6 sm:px-6 ${compact ? "pb-2 pt-1" : "py-3"}`}>
                {hasDateOptions && (
                    <div
                        id="active-date-key--container"
                        className={`${dateControlsMargin} flex w-full items-center gap-3 overflow-x-auto pb-1`}
                    >
                        {dateOptions.map((option) => {
                            const active = option.key === activeDateKey;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => handleDateChange(option.key, "user")}
                                    className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition ${active
                                        ? "border-sky-300 text-white active"
                                        : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div
                    id="league-list-tabs-container"
                    className={`${leagueControlsMargin} flex w-full items-center gap-3 overflow-x-auto pb-1`}
                >
                    {allowedLeagues.map((league) => {
                        const active = league === activeLeague;
                        return (
                            <button
                                key={league}
                                type="button"
                                onClick={() => handleLeagueSelect(league)}
                                className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition sm:text-sm ${active
                                    ? "border-sky-300 text-white"
                                    : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                    }`}
                            >
                                {league}
                            </button>
                        );
                    })}
                </div>
            </div>

            {builder}
        </div>
    );
};

export default PickBuilderShell;
