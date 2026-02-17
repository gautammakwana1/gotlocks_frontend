"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BuiltPickPayload, Group, Members, PickSliceState, PickType, Slip, SlipSliceState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { isGameEligible } from "@/lib/utils/games";
import PickBuilderShell from "@/components/pick-builder/PickBuilderShell";
import { fetchAllGroupsRequest } from "@/lib/redux/slices/groupsSlice";
import { formatDateTime } from "@/lib/utils/date";
import { clearCreatePickOfDayMessage, createPickRequest, createPostPickRequest, fetchAllMyVibePicksRequest, fetchPickOfDayRequest } from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import { fetchAllSlipsRequest } from "@/lib/redux/slices/slipSlice";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { canUserEditSlipPicks } from "@/lib/slips/state";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group & { members?: Members }>;
        };
        message?: string;
    } | null;
    loading: boolean;
    joinLoading: boolean;
    error: string | null;
    message: string | null;
};

type RootState = {
    group: GroupSliceState;
    pick: PickSliceState;
    slip: SlipSliceState;
};

type FlowStage = "choose" | "groups" | "badges" | "builder";
type BuilderIntent = "post";

const normalizeSport = (sport?: string) => (sport ? sport.toUpperCase() : "NFL");

const PickBuilderPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const [completedPick, setCompletedPick] = useState<BuiltPickPayload | null>(null);
    const [showDestination, setShowDestination] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedSlipId, setSelectedSlipId] = useState<string | undefined>(undefined);
    const [flowStage, setFlowStage] = useState<FlowStage>("choose");
    const [builderIntent, setBuilderIntent] = useState<BuilderIntent | null>(null);

    const { group } = useSelector((state: RootState) => state.group);
    const { pickOfDay, loading: pickLoader, message: pickMessage, error: pickError } = useSelector((state: RootState) => state.pick);
    const { slip: slipState, loading: slipLoader } = useSelector((state: RootState) => state.slip);
    const slipData = slipState as { slips?: Slip[] } | null;

    useEffect(() => {
        dispatch(fetchAllGroupsRequest({}));
        dispatch(fetchPickOfDayRequest({}));
    }, [dispatch]);
    useEffect(() => {
        if (pickOfDay) {
            if (Array.isArray(pickOfDay)) return;
            setCompletedPick(pickOfDay)
        }
    }, [dispatch, pickOfDay, slipLoader]);
    const slips: Slip[] = useMemo(() => {
        if (!slipData?.slips?.length) return [];

        return slipData?.slips;
    }, [slipData]);

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
            dispatch(clearCreatePickOfDayMessage());
            dispatch(fetchAllMyVibePicksRequest());
        }
        if (pickError && !pickLoader) {
            setToast({
                id: Date.now(),
                type: "error",
                message: pickError,
                duration: 3000
            })
            dispatch(clearCreatePickOfDayMessage());
        }
    }, [dispatch, pickMessage, pickError, pickLoader, setToast]);

    const sortedGroups = useMemo(() => {
        if (!group?.data?.groups) return [];

        const groups = group.data.groups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: Group) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: Group) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [group?.data?.groups, currentUser?.userId]);

    const destinations = useMemo(() => {
        const sportKey = normalizeSport(completedPick?.sport);
        return sortedGroups
            .map((group) => {
                const slip = slips.filter(
                    (slip) =>
                        slip.group_id === group.id &&
                        slip.status === "open" &&
                        slip?.sports?.some((entry) => normalizeSport(entry) === sportKey)
                );
                return { group, slips: slip };
            })
    }, [completedPick?.sport, sortedGroups, slips]);

    const buildDestinations = (sportKey: string) =>
        sortedGroups
            .map((group) => {
                const slip = slips.filter((slip) =>
                    slip.group_id === group.id &&
                    canUserEditSlipPicks(slip) &&
                    slip?.sports?.some((entry) => normalizeSport(entry) === sportKey)
                );
                return { group, slips: slip };
            });

    const openDestinationSheet = (payload: BuiltPickPayload) => {
        const nextDestinations = buildDestinations(normalizeSport(payload.sport));
        const first = nextDestinations[0];
        setCompletedPick(payload);
        setSelectedGroupId(first?.group.id ?? null);
        setSelectedSlipId(first?.slips[0]?.id ?? undefined);
        setShowDestination(true);
    };

    const selectionStart = completedPick?.selection?.gameStartTime ?? null;

    const slipIsEligible = (slip: Slip) => {
        if (!selectionStart) return true;
        const selectionSports = completedPick?.sport;
        if (!selectionSports) return false;
        if (!slip.sports?.includes(selectionSports)) return false;
        return isGameEligible(selectionStart, slip.pick_deadline_at, slip.window_days);
    };

    const intentLabel: Record<BuilderIntent, string> = {
        post: "Post picks",
    };

    const startBuilder = (intent: BuilderIntent) => {
        setBuilderIntent(intent);
        setFlowStage("builder");
        setCompletedPick(null);
    };

    const resetFlow = () => {
        setFlowStage("choose");
        setBuilderIntent(null);
    };

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
            matchup: payload.matchup,
            match_date: payload.match_date ? new Date(payload.match_date) : undefined,
            sourceTab: payload.sourceTab,
        }));
    };

    const handlePostToSlipPick = (payload: BuiltPickPayload) => {
        openDestinationSheet(payload);
    };

    const renderChooseGrid = () => {
        const pickCardClasses =
            "flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-left shadow-lg shadow-black/30 transition hover:border-emerald-400/60 hover:shadow-emerald-500/25 sm:p-6";

        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <button
                    type="button"
                    onClick={() => setFlowStage("groups")}
                    className={pickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">
                            Make picks for groups
                        </p>
                        <p className="text-sm text-gray-200">
                            Jump into your groups and drop picks straight into their slips.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => startBuilder("post")}
                    className={pickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">Post a pick</p>
                        <p className="text-sm text-gray-200">
                            Post straight picks or combo posts to the global feed.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setFlowStage("badges")}
                    className={pickCardClasses}
                >
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">
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
        <div className="space-y-3 rounded-3xl border border-white/10 bg-black/70 p-4 shadow-xl shadow-emerald-500/5">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Make picks for groups</p>
                    <p className="text-sm text-gray-300">Pick a group to jump to its slips tab.</p>
                </div>
                <button
                    type="button"
                    onClick={resetFlow}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/35"
                >
                    Back to options
                </button>
            </div>

            {sortedGroups.length === 0 ? (
                <p className="text-xs text-gray-400">No groups yet. Create or join one to route picks.</p>
            ) : (
                <div className="grid gap-3">
                    {sortedGroups.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => router.push(`/group/${group.id}?tab=slips`)}
                            className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition hover:border-emerald-300/50 hover:text-white"
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">{group.name}</p>
                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                    {`${group?.members?.length ?? 0} member${(group?.members?.length ?? 0) === 1 ? "" : "s"}`}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-emerald-100">Go to slips</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderBadgesFlow = () => (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-black/70 p-4 shadow-xl shadow-emerald-500/5">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Make picks for badges</p>
                    <p className="text-sm text-gray-300">We&apos;ll plug in badge paths here soon.</p>
                </div>
                <button
                    type="button"
                    onClick={resetFlow}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/35"
                >
                    Back to options
                </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                Badge-specific pick quests will live here. For now, post a pick or route one to a slip.
            </div>
        </div>
    );

    const renderBuilderStage = () => {
        if (!builderIntent) return renderChooseGrid();
        return (
            <div className="space-y-3 rounded-none border-0 bg-transparent p-0 shadow-none">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                            {intentLabel[builderIntent]}
                        </p>
                        <p className="text-sm text-gray-300">Build your pick, then route or post it.</p>
                    </div>
                    <button
                        type="button"
                        onClick={resetFlow}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/35"
                    >
                        Change path
                    </button>
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
    };

    if (!currentUser) return null;

    return (
        <div className="flex flex-col gap-6 text-white pb-16">
            {(() => {
                switch (flowStage) {
                    case "groups":
                        return renderGroupsFlow();
                    case "badges":
                        return renderBadgesFlow();
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
                                <p className="text-xs text-gray-400">Choose group, then an open slip that matches this league.</p>
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
                                Join a group with an open slip that supports {completedPick?.sport ?? "this sport"} to post your pick.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Step 1 · Group</p>
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
                                                        ? "border-emerald-300/70 bg-emerald-500/15 text-white"
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
                                        <p className="text-xs text-gray-500">No open slips for this league in the selected group.</p>
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
                                                            ? "border-emerald-300/70 bg-emerald-500/15 text-white"
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
                                        className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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

export default PickBuilderPage;
