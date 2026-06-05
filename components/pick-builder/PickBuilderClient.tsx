"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuiltPickPayload, Group, GroupObject, League, LeaguePickCandidate, PickSliceState, PickType, PostableSlips, PostDestinationGroups, SlipState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { isGameEligible } from "@/lib/utils/games";
import PickBuilderShell from "@/components/pick-builder/core/PickBuilderShell";
import { toLocalDateKeyFromUTC } from "@/lib/utils/date";
import { clearCreatePostPickMessage, createPostPickRequest, replaceOrCreatePostablePickRequest } from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import { fetchPostablePickSlipsRequest, loadMorePostablePickSlipsRequest } from "@/lib/redux/slices/slipSlice";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchLeaguesCountsRequest } from "@/lib/redux/slices/leagueSlice";
import { analyzeSlipPayloadAgainstPicks, getSlipConflictMessage } from "@/lib/slips/pickConflicts";
import { extractPickLine, formatPickMetaLine } from "@/lib/utils/pickDescription";
import IosSelectDropdown, { IosSelectOption } from "@/components/ui/IosSelectDropdown";

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

type DestinationStep = "choose" | "leagues";

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
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const [pendingGroups, setPendingGroups] = useState<PostDestinationGroups | null>(null);
    const [destinationStep, setDestinationStep] = useState<DestinationStep>("choose");
    const [assignments, setAssignments] = useState<Record<string, string | null>>({});
    const resetBuilderRef = useRef<(() => void) | null>(null);
    const [activeLeague, setActiveLeague] = useState<League>("NFL");

    const { postPicks, loading: pickLoader, message: pickMessage, error: pickError } = useSelector((state: RootState) => state.pick);
    const { postableSlips, postableSlipsHasMore, postableSlipsNextCursor, postableSlipsLoadingMore } = useSelector((state: RootState) => state.slip);

    // Latest paging state kept in a ref so the load-more callback below stays
    // identity-stable. A callback that changed every page would re-run the
    // dropdown's auto-fill effect repeatedly. `lastRequested` also guards against
    // firing the same cursor twice (rapid scroll / auto-fill).
    const postablePagingRef = useRef<{
        hasMore: boolean;
        loadingMore: boolean;
        nextCursor: string | null;
        lastRequested: string | null;
    }>({ hasMore: false, loadingMore: false, nextCursor: null, lastRequested: null });

    useEffect(() => {
        postablePagingRef.current.hasMore = postableSlipsHasMore;
        postablePagingRef.current.loadingMore = postableSlipsLoadingMore;
        postablePagingRef.current.nextCursor = postableSlipsNextCursor;
    }, [postableSlipsHasMore, postableSlipsLoadingMore, postableSlipsNextCursor]);

    useEffect(() => {
        if (!currentUser) return;
        const todayDateKey = toLocalDateKeyFromUTC(new Date().toISOString());
        dispatch(fetchLeaguesCountsRequest({ date: todayDateKey }));
        postablePagingRef.current.lastRequested = null;
        dispatch(fetchPostablePickSlipsRequest({}));
    }, [dispatch, currentUser]);

    const handleLoadMorePostableSlips = useCallback(() => {
        const paging = postablePagingRef.current;
        if (!paging.hasMore || paging.loadingMore || !paging.nextCursor) return;
        if (paging.lastRequested === paging.nextCursor) return;
        paging.lastRequested = paging.nextCursor;
        dispatch(loadMorePostablePickSlipsRequest({ cursor: paging.nextCursor }));
    }, [dispatch]);

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

    const eligibleSlips = useMemo(() => {
        if (!postableSlips || postableSlips.length === 0) return [];
        return postableSlips.filter((slip) =>
            slip.sports?.includes(activeLeague)
        );
    }, [postableSlips, activeLeague]);

    const profilePayloads = pendingGroups?.profilePayloads ?? [];
    const leagueCandidates = useMemo(
        () => pendingGroups?.leagueCandidates ?? [],
        [pendingGroups]
    );

    const canPostToLeagues = useMemo(() => {
        return (eligibleSlips?.length ?? 0) > 0;
    }, [eligibleSlips]);

    const assignedCount = leagueCandidates.filter(
        (candidate) => assignments[candidate.id]
    ).length;

    // A slip can only receive one pick on this screen, so it is greyed out in the other
    // picks' dropdowns once it has been assigned.
    const slipUsedByOther = (slipId: string, candidateId: string) =>
        leagueCandidates.some(
            (other) => other.id !== candidateId && assignments[other.id] === slipId
        );

    const handleSelectPostDestination = useCallback(
        (groups: PostDestinationGroups, reset: () => void) => {
            resetBuilderRef.current = reset;
            setPendingGroups(groups);
            setDestinationStep("choose");
            setAssignments({});
        },
        []
    );

    const closeDestination = () => {
        resetBuilderRef.current = null;
        setPendingGroups(null);
        setDestinationStep("choose");
        setAssignments({});
    };

    const finishDestination = (message: string, tone: "success" | "info" = "success") => {
        resetBuilderRef.current?.();
        resetBuilderRef.current = null;
        setPendingGroups(null);
        setDestinationStep("choose");
        setAssignments({});
        setToast({ id: Date.now(), type: tone, message, duration: 3000 });
    };

    const handlePostToProfile = () => {
        if (!pendingGroups || profilePayloads.length === 0) return;
        for (const payload of profilePayloads) {
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
        }
    };

    // The id of the user's existing pick that would be swapped out when posting to a
    // single-pick slip (auto-replace). Undefined for unlimited slips or empty slips.
    const replacementPickId = useCallback(
        (slip: PostableSlips) => {
            if (slip.pick_limit === "unlimited") return undefined;
            if (!slip.pick) return undefined;
            const existing = slip.pick;
            return existing?.id;
        },
        [postPicks, currentUser?.userId]
    );

    const handlePostToLeagues = () => {
        if (!pendingGroups) return;

        const assignedPairs = leagueCandidates
            .map((candidate) => ({ candidate, slipId: assignments[candidate.id] ?? null }))
            .filter(
                (pair): pair is { candidate: LeaguePickCandidate; slipId: string } =>
                    Boolean(pair.slipId)
            );

        if (assignedPairs.length === 0) {
            setToast({ id: Date.now(), type: "error", message: "Assign at least one pick to a slip.", duration: 3000 });
            return;
        }

        const countPerSlip = new Map<string, number>();
        assignedPairs.forEach(({ slipId }) =>
            countPerSlip.set(slipId, (countPerSlip.get(slipId) ?? 0) + 1)
        );

        // Validate every assignment before posting any of them.
        for (const { candidate, slipId } of assignedPairs) {
            const slip = postableSlips?.find((entry) => entry.id === slipId);
            if (!slip) {
                setToast({ id: Date.now(), type: "error", message: "Selected slip is no longer available.", duration: 3000 });
                return;
            }

            const requiredSports = getRequiredSportKeys(candidate.payload);
            const supportsSports = requiredSports.every((sportKey) =>
                slip.sports?.some((entry) => normalizeSport(entry) === sportKey)
            );
            if (!supportsSports) {
                setToast({ id: Date.now(), type: "error", message: `${slip.name} does not support that pick.`, duration: 3000 });
                return;
            }

            const startTimes = getPickStartTimes(candidate.payload);
            const timingOk =
                startTimes.length === 0 ||
                startTimes.every((startTime) =>
                    isGameEligible(startTime, slip.pick_deadline_at, slip.window_days)
                );
            if (!timingOk) {
                setToast({
                    id: Date.now(),
                    type: "error",
                    message: `Game must start after the pick deadline and within ${slip.window_days} day${slip.window_days === 1 ? "" : "s"}.`,
                    duration: 3000
                });
                return;
            }

            if (slip.pick_limit === 1 && (countPerSlip.get(slipId) ?? 0) > 1) {
                setToast({ id: Date.now(), type: "error", message: `Only one pick can post to ${slip.name}.`, duration: 3000 });
                return;
            }

            const replaceId = replacementPickId(slip);
            const analysis = analyzeSlipPayloadAgainstPicks(
                (postPicks ?? []).filter((pick) => pick.slip_id === slipId && pick.id !== replaceId),
                candidate.payload
            );
            if (analysis.duplicates.length > 0) {
                setToast({ id: Date.now(), type: "error", message: getSlipConflictMessage("duplicate"), duration: 3000 });
                return;
            }
        }

        // All validated — post each (confidence stripped; replacing on single-pick slips).
        for (const { candidate, slipId } of assignedPairs) {
            const slip = postableSlips?.find((entry) => entry.id === slipId);
            if (!slip) continue;
            const replaceId = replacementPickId(slip);
            const payload = {
                pick_id: replaceId ?? undefined,
                slip_id: slipId,
                description: candidate.description,
                odds_bracket: candidate.payload.odds_bracket,
                scope: candidate.payload.scope,
                side: candidate.payload.side,
                points: candidate.payload.points,
                difficultyTier: candidate.payload.difficultyTier,
                difficulty_label: candidate.payload.difficulty_label,
                market: candidate.payload.market,
                playerId: candidate.payload.playerId,
                gameId: candidate.payload?.gameId ?? candidate.payload?.selection?.gameId,
                week: candidate.payload.week,
                threshold: candidate.payload.threshold,
                validationStatus: candidate.payload.validationStatus,
                bestOffer: candidate.payload.bestOffer,
                bookOdds: candidate.payload.bookOdds,
                buildMode: candidate.payload.buildMode ?? "ODDS",
                external_pick_key: candidate.payload.external_pick_key,
                confidence: candidate.payload.confidence,
                isCombo: candidate.payload.isCombo ?? false,
                legs: candidate.payload.legs,
                selection: candidate.payload.selection,
                sourceTab: candidate.payload.sourceTab,
                matchup: candidate.payload.matchup,
                match_date: candidate.payload.match_date ? new Date(candidate.payload.match_date) : undefined,
                sport: candidate.payload.sport,
            }
            dispatch(replaceOrCreatePostablePickRequest(payload));
        }
    };

    const handleSetActiveLeague = (league: League) => {
        if (!league) return;
        if (activeLeague === league) return;
        setActiveLeague(league);
    }

    const profileCount = profilePayloads.length;
    const leaguesDisabledReason =
        leagueCandidates.length === 0
            ? "Combos and same-game combos can only be posted to your profile."
            : "No eligible league slips support these picks right now.";

    if (!currentUser) return null;

    return (
        <div className="flex flex-col gap-6 text-white">
            <PickBuilderShell
                context={{
                    mode: "standalone",
                    currentUser,
                    slip: [],
                    intent: "post",
                    onComplete: () => { },
                    onSelectPostDestination: handleSelectPostDestination,
                    onSelectActiveLeague: handleSetActiveLeague,
                }}
                initialLeague="NFL"
            />

            {pendingGroups && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6"
                    role="presentation"
                    onClick={closeDestination}
                >
                    <div
                        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {destinationStep === "choose" ? "Where to?" : "Post to slips"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {destinationStep === "choose"
                                        ? "Pick a destination for your selection."
                                        : "Choose which pick goes to which open slip."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDestination}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:border-white/30"
                            >
                                Close
                            </button>
                        </div>

                        {destinationStep === "choose" ? (
                            <div className="mt-4 grid gap-3">
                                <button
                                    type="button"
                                    onClick={handlePostToProfile}
                                    disabled={profileCount === 0}
                                    className="flex flex-col gap-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-4 text-left transition hover:border-sky-300/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/12"
                                >
                                    <span className="text-sm font-semibold text-white">Post to Profile</span>
                                    <span className="text-xs text-gray-400">
                                        {profileCount === 0
                                            ? "Select a confidence level on a pick to post it to your profile."
                                            : `Share ${profileCount === 1 ? "your pick" : `all ${profileCount} picks`
                                            } to your profile and the global feed.`}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignments({});
                                        setDestinationStep("leagues");
                                    }}
                                    disabled={!canPostToLeagues}
                                    className="flex flex-col gap-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-4 text-left transition hover:border-sky-300/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/12"
                                >
                                    <span className="text-sm font-semibold text-white">Post to Leagues</span>
                                    <span className="text-xs text-gray-400">
                                        {canPostToLeagues
                                            ? "Choose which picks go to which open league slips. No confidence needed."
                                            : leaguesDisabledReason}
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setDestinationStep("choose")}
                                    className="text-xs font-semibold text-gray-200 transition hover:text-white"
                                >
                                    &larr; back to destinations
                                </button>

                                <div className="space-y-3">
                                    {leagueCandidates.map((candidate) => {
                                        const assignedSlipId = assignments[candidate.id] ?? "";
                                        const isPickPostedAlready = postableSlips?.some(
                                            (s) => s.id === assignedSlipId && s.pick !== null
                                        );
                                        const matchupLine = formatPickMetaLine({
                                            description: candidate.description,
                                            matchup: candidate.payload.selection?.matchup ?? null,
                                            gameStartTime: candidate.payload.selection?.gameStartTime ?? null,
                                        });

                                        return (
                                            <div
                                                key={candidate.id}
                                                className="rounded-2xl border border-white/12 bg-white/[0.04] p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-semibold leading-snug text-cyan-200">
                                                            {extractPickLine(candidate.description)}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                                                            {normalizeSport(candidate.payload.sport)}
                                                            {matchupLine ? ` · ${matchupLine}` : ""}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                                                        {candidate.odds?.trim() || "—"}
                                                    </span>
                                                </div>

                                                {eligibleSlips.length === 0 && !postableSlipsHasMore && !postableSlipsLoadingMore ? (
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        No eligible slips for this pick.
                                                    </p>
                                                ) : (
                                                    <IosSelectDropdown
                                                        className="mt-2"
                                                        value={assignedSlipId}
                                                        ariaLabel="Choose a slip for this pick"
                                                        placeholderLabel="Don't post to a slip"
                                                        hasMore={postableSlipsHasMore}
                                                        loadingMore={postableSlipsLoadingMore}
                                                        onReachEnd={handleLoadMorePostableSlips}
                                                        options={(eligibleSlips ?? []).map<IosSelectOption>(({ id, name, group }) => {
                                                            const usedElsewhere = slipUsedByOther(
                                                                id ?? "",
                                                                candidate.id
                                                            );
                                                            return {
                                                                value: id ?? "",
                                                                label: `${group.name} · ${name}`,
                                                                disabled: usedElsewhere,
                                                                hint: usedElsewhere ? "in use" : undefined,
                                                            };
                                                        })}
                                                        onChange={(nextValue) =>
                                                            setAssignments((prev) => ({
                                                                ...prev,
                                                                [candidate.id]: nextValue || null,
                                                            }))
                                                        }
                                                    />
                                                )}

                                                {isPickPostedAlready && (
                                                    <p className="mt-1 text-[11px] text-amber-200">
                                                        Replaces your current pick on this slip.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handlePostToLeagues}
                                        disabled={assignedCount === 0}
                                        className="ui-accent-button rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {assignedCount <= 1 ? "Post pick" : `Post ${assignedCount} picks`}
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
