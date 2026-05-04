"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BuiltPickPayload, Group, GroupObject, PickSliceState, PickType, Slip, SlipState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { isGameEligible } from "@/lib/utils/games";
import PickBuilderShell from "@/components/pick-builder/PickBuilderShell";
import { fetchMyGroupsRequest } from "@/lib/redux/slices/groupsSlice";
import { formatDateTime, toLocalDateKeyFromUTC } from "@/lib/utils/date";
import { clearCreatePostPickMessage, createPickRequest, createPostPickRequest } from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import { fetchAllSlipsRequest } from "@/lib/redux/slices/slipSlice";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { canUserEditSlipPicks } from "@/lib/slips/state";
import { fetchLeaguesCountsRequest } from "@/lib/redux/slices/leagueSlice";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group>;
        };
        message?: string;
    } | null;
    loading: boolean;
    joinLoading: boolean;
    error: string | null;
    message: string | null;
    hasMore: boolean;
    myGroups: GroupObject[] | null;
};

type RootState = {
    group: GroupSliceState;
    pick: PickSliceState;
    slip: SlipState;
};

type FlowStage = "choose" | "leagues" | "builder";
type BuilderIntent = "post";

const normalizeSport = (sport?: string) => (sport ? sport.toUpperCase() : "NFL");

const getRequiredSportKeys = (payload?: BuiltPickPayload | null) => {
    if (!payload) return [];

    const legSports = Array.from(
        new Set(
            (payload.legs ?? [])
                .map((leg) => leg.selection?.sport)
                .filter((sport): sport is string => Boolean(sport))
                .map((sport) => normalizeSport(sport))
                .filter((sport) => sport !== "COMBO")
        )
    );

    if (legSports.length > 0) return legSports;

    const payloadSport = payload.sport ? normalizeSport(payload.sport) : "";
    return payloadSport === "COMBO" ? [] : [payloadSport];
};

const getPickStartTimes = (payload?: BuiltPickPayload | null) => {
    if (!payload) return [];

    const legStarts = Array.from(
        new Set(
            (payload.legs ?? [])
                .map((leg) => leg.selection?.gameStartTime)
                .filter((start): start is string => Boolean(start))
        )
    );

    if (legStarts.length > 0) return legStarts;
    return payload.selection?.gameStartTime ? [payload.selection.gameStartTime] : [];
};

const PickBuilderClientPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const [completedPick, setCompletedPick] = useState<BuiltPickPayload | null>(null);
    const [showDestination, setShowDestination] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedSlipId, setSelectedSlipId] = useState<string | undefined>(undefined);
    const [flowStage, setFlowStage] = useState<FlowStage>("choose");
    const [builderIntent, setBuilderIntent] = useState<BuilderIntent | null>(null);
    const [hasHandledIntent, setHasHandledIntent] = useState(false);
    const [page, setPage] = useState(1);
    const lastIntentRef = useRef<string | null>(null);
    const intentParam = searchParams.get("intent");

    const { myGroups, hasMore, loading: groupLoading } = useSelector((state: RootState) => state.group);
    const { loading: pickLoader, message: pickMessage, error: pickError } = useSelector((state: RootState) => state.pick);
    const { slips: slipList } = useSelector((state: RootState) => state.slip);

    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
        const todayDateKey = toLocalDateKeyFromUTC(new Date().toISOString());
        dispatch(fetchLeaguesCountsRequest({ date: todayDateKey }));
    }, [dispatch, currentUser]);

    const slips: Slip[] = useMemo(() => {
        if (!Array.isArray(slipList) || !slipList?.length) return [];

        return slipList;
    }, [slipList]);

    const fantasySlips = slips.filter((slip) => slip.isGraded && slip.slip_type === "fantasy");
    const activeSlips = fantasySlips.filter((slip) => slip.status === "open");

    useEffect(() => {
        if (selectedGroupId) {
            dispatch(fetchAllSlipsRequest({ group_id: selectedGroupId }))
        }
    }, [dispatch, selectedGroupId]);

    useEffect(() => {
        if (pickMessage && !pickLoader) {
            setToast({
                id: Date.now(),
                type: "success",
                message: pickMessage,
                duration: 3000
            })
            dispatch(clearCreatePostPickMessage());
        }
        if (pickError && !pickLoader) {
            setToast({
                id: Date.now(),
                type: "error",
                message: pickError,
                duration: 3000
            })
            dispatch(clearCreatePostPickMessage());
        }
    }, [dispatch, pickMessage, pickError, pickLoader, setToast]);

    const sortedGroups = useMemo(() => {
        if (!Array.isArray(myGroups) || !myGroups.length) return [];

        const groups = myGroups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: GroupObject) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: GroupObject) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [myGroups, currentUser?.userId]);

    // const destinations = useMemo(() => {
    //     const sportKey = normalizeSport(completedPick?.sport);
    //     return sortedGroups
    //         .map((group) => {
    //             const slip = slips.filter(
    //                 (slip) =>
    //                     slip.group_id === group.id &&
    //                     slip.status === "open" &&
    //                     slip?.sports?.some((entry) => normalizeSport(entry) === sportKey)
    //             );
    //             return { group, slips: slip };
    //         })
    // }, [completedPick?.sport, sortedGroups, slips]);

    const buildDestinations = useCallback(
        (requiredSportKeys: string[]) => {
            if (requiredSportKeys.length === 0) return [];
            return sortedGroups
                .map((group) => {
                    const slip = slips.filter((slip) =>
                        slip.group_id === group.id &&
                        canUserEditSlipPicks(slip) &&
                        requiredSportKeys.every((sportKey) =>
                            slip?.sports?.some((entry) => normalizeSport(entry) === sportKey)
                        )
                    );
                    return { group, slips: slip };
                });
        },
        [sortedGroups, slips]
    );

    const completedPickSportKeys = useMemo(
        () => getRequiredSportKeys(completedPick),
        [completedPick]
    );

    const destinations = useMemo(() => {
        if (!completedPick) return [];
        return buildDestinations(completedPickSportKeys);
    }, [buildDestinations, completedPick, completedPickSportKeys]);

    const openDestinationSheet = (payload: BuiltPickPayload) => {
        const nextDestinations = buildDestinations(getRequiredSportKeys(payload));
        const first = nextDestinations[0];
        setCompletedPick(payload);
        setSelectedGroupId(first?.group.id ?? null);
        setSelectedSlipId(first?.slips[0]?.id ?? undefined);
        setShowDestination(true);
    };

    const pickStartTimes = useMemo(() => getPickStartTimes(completedPick), [completedPick]);

    const slipIsEligible = (slip: Slip) => {
        if (pickStartTimes.length === 0) return true;
        const selectionSports = completedPick?.sport;
        if (!selectionSports) return false;
        if (!slip.sports?.includes(selectionSports)) return false;
        return pickStartTimes.every((startTime) =>
            isGameEligible(startTime, slip.pick_deadline_at, slip.window_days)
        );
    };

    const intentLabel: Record<BuilderIntent, string> = {
        post: "post builder",
    };

    const startBuilder = useCallback((intent: BuilderIntent) => {
        setBuilderIntent(intent);
        setFlowStage("builder");
        setCompletedPick(null);
    }, []);

    const resetFlow = () => {
        setFlowStage("choose");
        setBuilderIntent(null);
        setHasHandledIntent(true);
        if (intentParam) {
            router.replace("/pick-builder");
        }
    };

    useEffect(() => {
        if (lastIntentRef.current !== intentParam) {
            lastIntentRef.current = intentParam;
            setHasHandledIntent(false);
        }
    }, [intentParam]);

    useEffect(() => {
        if (intentParam === "post" && !hasHandledIntent && builderIntent !== "post") {
            setHasHandledIntent(true);
            startBuilder("post");
        }
    }, [builderIntent, hasHandledIntent, intentParam, startBuilder]);

    const handleComplete = (payload: BuiltPickPayload) => {
        setCompletedPick(payload);
        setShowDestination(false);
        setSelectedGroupId(null);
        setSelectedSlipId(undefined);
    };

    const handleCreatePostPick = (payload: BuiltPickPayload) => {
        dispatch(createPostPickRequest({
            description: payload.description,
            buildMode: payload.buildMode,
            difficulty_label: payload.difficulty_label,
            difficultyTier: payload.difficultyTier,
            gameId: payload?.gameId ?? payload?.selection?.gameId,
            market: payload?.market ?? payload?.selection?.market,
            odds_bracket: payload.odds_bracket,
            playerId: payload.selection?.playerId ?? undefined,
            points: payload.points,
            scope: payload?.scope ?? payload?.selection?.scope,
            side: payload?.side ?? payload?.selection?.side,
            threshold: payload?.threshold ?? payload?.selection?.threshold,
            teamId: payload?.teamId ?? payload?.selection?.teamId,
            sport: payload.sport,
            pick_type: PickType.POST,
            external_pick_key: payload.external_pick_key,
            confidence: payload.confidence,
            isCombo: payload.isCombo ?? false,
            legs: payload.legs,
            selection: payload.selection,
            matchup: payload.matchup ?? undefined,
            match_date: payload.match_date ? new Date(payload.match_date) : undefined,
            sourceTab: payload.sourceTab,
        }));
    };

    const handlePostToSlipPick = (payload: BuiltPickPayload) => {
        openDestinationSheet(payload);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        dispatch(fetchMyGroupsRequest({ page: nextPage, limit: 10 }));
    };

    const renderChooseGrid = () => {
        const pickCardClasses =
            "flex h-[10rem] flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-left shadow-lg shadow-black/30 transition hover:border-sky-400/60 hover:shadow-sky-500/25 sm:p-6";
        const disabledPickCardClasses =
            "flex h-[10rem] cursor-not-allowed flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-left opacity-60 shadow-lg shadow-black/30 sm:p-6";

        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <button
                    type="button"
                    onClick={() => setFlowStage("leagues")}
                    className={pickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-sky-200">
                            Make picks for leagues
                        </p>
                        <p className="text-sm text-gray-200">
                            Jump into your leagues and drop picks straight into their slips.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => startBuilder("post")}
                    className={pickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-sky-200">Post a pick</p>
                        <p className="text-sm text-gray-200">
                            Post straight picks or combo posts to the global feed.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className={disabledPickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-sky-200">
                            Make picks for badges
                        </p>
                        <p className="text-sm text-gray-200">
                            Coming soon — collect badge-specific picks once the track is live.
                        </p>
                    </div>
                </button>
            </div>
        );
    };

    const renderGroupsFlow = () => (
        <div className="space-y-6 rounded-none border-0 bg-transparent p-0 shadow-none">
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={resetFlow}
                    className="text-xs font-semibold text-gray-200 transition hover:text-white"
                >
                    &larr; back to other pick options
                </button>
                <p className="text-xs tracking-wide text-gray-400">league picks</p>
            </div>

            {sortedGroups.length === 0 ? (
                <p className="text-xs text-gray-400">No leagues yet. Create or join one to route picks.</p>
            ) : (
                <div className="grid gap-3">
                    {sortedGroups.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => router.push(`/league/${group.id}?tab=slips`)}
                            className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition hover:border-sky-300/50 hover:text-white"
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">{group.name}</p>
                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                    {`${group?.member_count ?? 0} member${(group?.member_count ?? 0) === 1 ? "" : "s"}`}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-sky-100">Go to slips</span>
                        </button>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={groupLoading}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {groupLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : null}
                        Show more
                    </button>
                </div>
            )}
        </div>
    );

    const renderBuilderStage = () => {
        if (!builderIntent) return renderChooseGrid();
        if (!currentUser) return null;
        return (
            <div className="space-y-3 rounded-none border-0 bg-transparent p-0 shadow-none">
                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={resetFlow}
                        className="text-xs font-semibold text-gray-200 transition hover:text-white"
                    >
                        &larr; back to other pick options
                    </button>
                    <p className="text-xs tracking-wide text-gray-400">
                        {intentLabel[builderIntent]}
                    </p>
                </div>
                <PickBuilderShell
                    context={{
                        mode: "standalone",
                        group: sortedGroups,
                        slip: slips,
                        currentUser,
                        intent: builderIntent,
                        onComplete: handleComplete,
                        onPostToSlip: handlePostToSlipPick,
                        onCreatePostPick: handleCreatePostPick,
                    }}
                    initialLeague="NFL"
                    onDismiss={() => setBuilderIntent(null)}
                />
            </div>
        );
    };

    const handlePostToSlip = () => {
        if (!completedPick) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Build a pick first.",
                duration: 3000
            });
            return;
        }
        const targetGroupId =
            selectedGroupId ?? destinations[0]?.group.id ?? sortedGroups[0]?.id ?? null;
        const targetSlip =
            slips.find((slip) => slip.id === selectedSlipId) ??
            destinations.find((entry) => entry.group.id === targetGroupId)?.slips[0];

        if (!targetGroupId || !targetSlip) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "No eligible slip available",
                duration: 3000
            });
            return;
        }

        if (!slipIsEligible(targetSlip)) {
            setToast({
                id: Date.now(),
                type: "error",
                message: `Game must start after the pick deadline and within ${targetSlip.window_days} day${targetSlip.window_days === 1 ? "" : "s"}.`,
                duration: 3000
            });
            return;
        }

        // const slipConflictAnalysis = analyzeSlipPayloadAgainstPicks(
        //     picks.filter((pick) => pick.slipId === targetSlip.id),
        //     completedPick
        // );
        // if (slipConflictAnalysis.duplicates.length > 0) {
        //     setToast({
        //         id: Date.now(),
        //         type: "error",
        //         message: getSlipConflictMessage("duplicate"),
        //         duration: 3000
        //     });
        //     return;
        // }

        dispatch(createPickRequest({
            slip_id: targetSlip.id,
            description: completedPick.description,
            odds_bracket: completedPick.odds_bracket,
            scope: completedPick.scope,
            side: completedPick.side,
            points: completedPick.points,
            difficultyTier: completedPick.difficultyTier,
            difficulty_label: completedPick.difficulty_label,
            market: completedPick.market,
            playerId: completedPick.playerId,
            gameId: completedPick?.gameId ?? completedPick?.selection?.gameId,
            week: completedPick.week,
            teamId: completedPick.teamId,
            threshold: completedPick.threshold,
            validationStatus: completedPick.validationStatus,
            bestOffer: completedPick.bestOffer,
            bookOdds: completedPick.bookOdds,
            buildMode: completedPick.buildMode,
            external_pick_key: completedPick.external_pick_key,
            confidence: completedPick.confidence,
            isCombo: completedPick.isCombo,
            legs: completedPick.legs,
            selection: completedPick.selection,
            sourceTab: completedPick.sourceTab,
            matchup: completedPick.matchup,
            match_date: completedPick.match_date ? new Date(completedPick.match_date) : undefined,
            sport: completedPick.sport,
        }))
        setShowDestination(false);
        // const slipWarningMessages = slipShowsConflictWarnings(targetSlip)
        //     ? getSlipConflictWarningMessages(slipConflictAnalysis)
        //     : [];
        // setToast({
        //     id: Date.now(),
        //     type: slipWarningMessages.length > 0 ? "info" : "success",
        //     message:
        //         slipWarningMessages.length > 0
        //             ? `Pick posted to slip. ${slipWarningMessages[0]}`
        //             : "Pick posted to slip.",
        //     duration: 3000
        // });
    };

    if (!currentUser) return null;

    return (
        <div className="flex flex-col gap-6 text-white">
            {(() => {
                switch (flowStage) {
                    case "leagues":
                        return renderGroupsFlow();
                    case "builder":
                        return renderBuilderStage();
                    case "choose":
                    default:
                        return renderChooseGrid();
                }
            })()}

            {showDestination && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black p-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Post to a slip</p>
                                <p className="text-xs text-gray-400">
                                    Choose league, then an open slip that includes every sport in this pick.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDestination(false)}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:border-white/30"
                            >
                                Close
                            </button>
                        </div>

                        {destinations.length === 0 ? (
                            <p className="mt-3 text-xs text-gray-400">
                                Join a league with an open slip that supports {completedPick?.sport ?? "this sport"} to post your pick.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Step 1 · League</p>
                                    <div className="flex flex-wrap gap-2">
                                        {destinations.map(({ group }) => {
                                            const active = group.id === selectedGroupId;
                                            return (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (group.id) {
                                                            setSelectedGroupId(group.id);
                                                        }
                                                        setSelectedSlipId(undefined);
                                                    }}
                                                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition ${active
                                                        ? "border-sky-300/70 bg-sky-500/15 text-white"
                                                        : "border-white/12 bg-white/[0.04] text-gray-200 hover:border-white/25"
                                                        }`}
                                                >
                                                    {group.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Step 2 · Slip</p>
                                    {activeSlips.length === 0 ? (
                                        <p className="text-xs text-gray-500">No open slips for this league in the selected league.</p>
                                    ) : (
                                        <div className="grid gap-3">
                                            {activeSlips.map((slip) => {
                                                const active = slip.id === selectedSlipId;
                                                const eligible = slipIsEligible(slip);
                                                return (
                                                    <button
                                                        key={slip.id}
                                                        type="button"
                                                        onClick={() => setSelectedSlipId(slip.id)}
                                                        disabled={!eligible}
                                                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${active
                                                            ? "border-sky-300/70 bg-sky-500/15 text-white"
                                                            : "border-white/12 bg-white/[0.04] text-white hover:border-white/25"
                                                            } ${eligible ? "" : "opacity-60"}`}
                                                    >
                                                        <div>
                                                            <p className="font-semibold">{slip.name}</p>
                                                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                                                Deadline {formatDateTime(slip.pick_deadline_at)} · {slip.window_days} day window
                                                            </p>
                                                        </div>
                                                        {!eligible && (
                                                            <span className="text-xs font-semibold text-amber-200">
                                                                Not eligible for this game
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handlePostToSlip}
                                        disabled={!selectedSlipId}
                                        className="ui-accent-button rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Post pick
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PickBuilderClientPage;
