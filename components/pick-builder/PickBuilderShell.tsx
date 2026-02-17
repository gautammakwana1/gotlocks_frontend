"use client";

/**
 * PickBuilderShell is the shared frame for every pick-building surface.
 * - The shell owns the sticky league bar and pipes context (standalone vs slip) into league adapters.
 * - League adapters live in this folder (stub) and components/slips/PickBuilder (NFL).
 * - Keep new leagues lightweight by plugging in an adapter component that calls `onSave` with a BuiltPickPayload.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BuildMode, BuiltPickPayload, CurrentUser, DraftPick, Group, League, Members, ParlayLeg, Pick, Slip } from "@/lib/interfaces/interfaces";
import NbaPickBuilder from "./NbaPickBuilder";
import NflPickBuilder from "./NflPickBuilder";
import { formatTierPrimary, getTierMetaForPick } from "@/lib/utils/scoring";

type SlipBuilderContext = {
    mode: "slip";
    group: Group;
    slip: Slip;
    picks: Pick[];
    currentUser: CurrentUser | null;
    initialPick?: Pick;
    isCommissioner: boolean;
    onSave: (payload: BuiltPickPayload, pickId?: string) => void;
    showCurrentPick?: boolean;
};

type StandaloneBuilderContext = {
    mode: "standalone";
    group?: (Group & {
        members?: Members;
    })[];
    slip: Slip[];
    currentUser: CurrentUser | null;
    intent?: "post";
    onComplete: (payload: BuiltPickPayload) => void;
    onSaveVibePick?: (payload: BuiltPickPayload) => void;
    onPostToSlip?: (payload: BuiltPickPayload) => void;
    onPickOfDay?: (payload: BuiltPickPayload) => void;
    onCreatePostPick?: (payload: BuiltPickPayload) => void;
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
    }
    | {
        context: StandaloneBuilderContext;
        initialLeague?: League;
        initialBuildMode?: BuildMode;
        leagues?: League[];
        onDismiss?: () => void;
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
                mode: isGroupScoring ? "groupLeaderboard" : "global",
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
                    className="min-h-[120px] rounded-2xl border border-white/12 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                    placeholder={`Example: ${league} custom pick`}
                />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                    odds (required)
                    <input
                        value={odds}
                        onChange={(event) => setOdds(event.target.value)}
                        className="rounded-2xl border border-white/12 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
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
                    className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Save custom pick
                </button>
            </div>
        </div>
    );
};

export const PickBuilderShell = (props: PickBuilderShellProps) => {
    const { context, onDismiss } = props;
    const leagues = props.leagues ?? ALL_LEAGUES;

    const allowedLeagues = useMemo(() => {
        if (context.mode !== "slip") return leagues;
        const allowed = leagues.filter((league) => {
            if (!Array.isArray(context.slip.sports)) return;
            return context.slip.sports.map((sport) => normalizeLeague(sport)).includes(league)
        });
        return allowed.length > 0 ? allowed : leagues;
    }, [context, leagues]);

    const initialLeague =
        normalizeLeague(props.initialLeague ?? (context.mode === "slip"
            ? (context.initialPick?.sport as League | undefined)
            : context.initialPick?.sport)) ?? allowedLeagues[0];

    const [activeLeague, setActiveLeague] = useState<League>(
        allowedLeagues.find((league) => league === normalizeLeague(initialLeague)) ??
        allowedLeagues[0] ??
        "NFL"
    );
    // const buildMode = "ODDS";
    const todayKey = useMemo(() => toDateKey(new Date().toISOString()), []);
    const [activeDateKey, setActiveDateKey] = useState<string>(todayKey);
    const [hasManualDateSelection, setHasManualDateSelection] = useState(false);
    const [dateOptions, setDateOptions] = useState<Array<{ key: string; label: string }>>(
        []
    );
    const [draftPick, setDraftPick] = useState<DraftPick | null>(null);
    const [sharedParlayLegs, setSharedParlayLegs] = useState<ParlayLeg[]>([]);
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
                id: "solo-group",
                name: "Personal Picks",
                invite_code: "00000",
                created_by: context.currentUser.userId,
                members: [context.currentUser.userId],
                is_enable_secondary_leaderboard: false
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
            } satisfies Slip)
            : null;

    const showDateStrip = true;
    const hasDateOptions = showDateStrip && dateOptions.length > 0;
    const sharedParlayProps =
        context.mode === "standalone"
            ? {
                parlayLegs: sharedParlayLegs,
                onParlayLegsChange: setSharedParlayLegs,
            }
            : {};

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
                        enforceEligibilityWindow={false}
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
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        // onDateChange={handleDateChange}
                        // allowAutoDateAdvance={!hasManualDateSelection}
                        // hideDateControls
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
                        onCancel={onDismiss}
                        isCommissioner
                        showCurrentPick
                        builderMode={context.intent}
                        draftPick={draftPick}
                        onDraftPickChange={setDraftPick}
                        activeDateKey={activeDateKey}
                        // onDateChange={handleDateChange}
                        // allowAutoDateAdvance={!hasManualDateSelection}
                        // hideDateControls
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

    if (allowedLeagues.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="sticky top-0 z-20 -mx-5 bg-gradient-to-b from-black to-black/60 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Pick builder</p>
                    {onDismiss && (
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30"
                        >
                            Close
                        </button>
                    )}
                </div>
                {hasDateOptions && (
                    <div
                        id="active-date-key--container"
                        className="mt-3 flex w-full items-center gap-3 overflow-x-auto pb-1"
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
                    className={`flex w-full items-center gap-3 overflow-x-auto pb-1 ${hasDateOptions ? "mt-2" : "mt-3"}`}
                >
                    {allowedLeagues.map((league) => {
                        const active = league === activeLeague;
                        return (
                            <button
                                key={league}
                                type="button"
                                onClick={() => handleLeagueSelect(league)}
                                className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition sm:text-sm ${active
                                    ? "border-emerald-300 text-white"
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
