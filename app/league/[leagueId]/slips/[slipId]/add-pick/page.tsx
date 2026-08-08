"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PickBuilderShell } from "@/components/pick-builder/core/PickBuilderShell";
import { canUserEditSlipPicks, isSlipFinal } from "@/lib/slips/state";
import { useToast } from "@/lib/state/ToastContext";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { BuiltPickPayload, GroupSelector, League, Pick, RootState } from "@/lib/interfaces/interfaces";
import { createPickRequest } from "@/lib/redux/slices/pickSlice";
import { analyzeSlipPayloadAgainstPicks, getSlipConflictMessage } from "@/lib/slips/pickConflicts";
import { isLeagueMember, isSlipInLeague } from "@/lib/permissions/leaguePermissions";

const DEFAULT_SPORT = "NFL";

const SlipAddPickPage = () => {
    const params = useParams<{ leagueId: string; slipId: string }>();
    const router = useRouter();
    const { setToast } = useToast();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const [isReturningToSlip, setIsReturningToSlip] = useState(false);

    const { group } = useSelector((state: GroupSelector) => state.group);
    const { slips } = useSelector((state: RootState) => state.slip);
    const { picks: pickList } = useSelector((state: RootState) => state.pick);

    // useEffect(() => {
    //     if (!params.slipId) return;
    //     dispatch(fetchAllPicksRequest({ slip_id: params.slipId }));
    //     if (params.leagueId) {
    //         dispatch(fetchGroupByIdRequest({ groupId: params.leagueId }));
    //         dispatch(fetchAllSlipsRequest({ group_id: params.leagueId }));
    //     }
    // }, [dispatch, params.slipId, params.leagueId]);

    // const slips: Slips = useMemo(() => {
    //     if (!group?.id || !slipData?.slips?.length) return [];

    //     return slipData?.slips;
    // }, [slipData, group?.id]);

    const slip = useMemo(() => {
        if (!Array.isArray(slips) || !params?.slipId) return null;
        return slips.find((candidate) => candidate.id === params.slipId)
    }, [params.slipId, slips]);

    const slipPicks = useMemo<Pick[]>(() => {
        if (!pickList) return [];
        if (!Array.isArray(pickList) || !slip?.id) return [];
        return pickList.filter(pick => pick.slip_id === slip.id);
    }, [pickList, slip?.id]);

    const belongsToLeague = isSlipInLeague(slip, group?.id);
    const canView = isLeagueMember(group, currentUser?.userId) && belongsToLeague;

    const returnPath = group && slip ? `/league/${group.id}/slips/${slip.id}` : "/home";

    const returnToSlip = useCallback(() => {
        setIsReturningToSlip(true);
        router.replace(returnPath);

        if (typeof window !== "undefined") {
            window.setTimeout(() => {
                if (window.location.pathname.endsWith("/add-pick")) {
                    window.location.assign(returnPath);
                }
            }, 350);
        }
    }, [returnPath, router]);

    useEffect(() => {
        if (!currentUser) return;
        if (!group || !currentUser) {
            router.replace("/home");
            return;
        }
        if (!slip) {
            router.replace(`/league/${group.id}?tab=contests`);
            return;
        }
        if (!canView) {
            router.replace("/home");
            return;
        }
        if (isSlipFinal(slip)) {
            router.replace(`/league/${group.id}/slips/${slip.id}/results`);
        }
    }, [canView, group, currentUser, slip, router]);

    const availableSports = (slip?.sports?.length ? slip.sports : [DEFAULT_SPORT]).filter(Boolean);
    const limitValue = slip?.pick_limit === "unlimited" ? Infinity : (slip?.pick_limit ?? 0);
    const userPicks = useMemo(
        () => slipPicks.filter((pick) => pick.user_id === currentUser?.userId),
        [slipPicks, currentUser?.userId]
    );
    const canManagePicks = slip ? canUserEditSlipPicks(slip) : false;
    const canAddPick = canManagePicks && userPicks.length < limitValue;
    const isCommissioner = group?.created_by === currentUser?.userId;

    useEffect(() => {
        if (!group || !slip || !currentUser) return;
        if (isSlipFinal(slip)) return;
        if (canAddPick) return;
        setToast({
            id: Date.now(),
            type: "error",
            message: canManagePicks ? "Pick limit reached." : "Picks are locked for this slip.",
            duration: 3000
        });
        returnToSlip();
    }, [canAddPick, canManagePicks, currentUser, group, returnToSlip, setToast, slip]);

    if (isReturningToSlip) {
        return (
            <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm font-semibold text-white">Returning to slip...</p>
                <button
                    type="button"
                    onClick={() => window.location.assign(returnPath)}
                    className="text-xs font-semibold uppercase tracking-wide text-sky-200 transition hover:text-white"
                >
                    Open slip
                </button>
            </div>
        );
    }

    if (!group || !currentUser || !slip || !canAddPick || !canView) {
        return null;
    }

    const handleSavePick = (payload: BuiltPickPayload) => {
        const slipConflictAnalysis = analyzeSlipPayloadAgainstPicks(slipPicks, payload);
        if (slipConflictAnalysis.duplicates.length > 0) {
            setToast({ id: Date.now(), type: "error", message: getSlipConflictMessage("duplicate"), duration: 3000 });
            return;
        }

        dispatch(createPickRequest({
            slip_id: slip.id,
            description: payload.description,
            odds_bracket: payload.odds_bracket,
            scope: payload.scope,
            side: payload.side,
            points: payload.points,
            difficultyTier: payload.difficultyTier,
            difficulty_label: payload.difficulty_label,
            market: payload.market,
            playerId: payload.playerId,
            gameId: payload.gameId,
            week: payload.week,
            teamId: payload.teamId,
            threshold: payload.threshold,
            validationStatus: payload.validationStatus,
            bestOffer: payload.bestOffer,
            bookOdds: payload.bookOdds,
            buildMode: payload.buildMode,
            external_pick_key: payload.external_pick_key,
            confidence: payload.confidence,
            sourceTab: payload.sourceTab,
            selection: payload.selection,
            legs: payload?.legs ?? undefined,
            isCombo: payload.isCombo,
            sport: payload.sport,
            matchup: payload.matchup,
            match_date: payload.match_date ? new Date(payload.match_date) : undefined,
        }))
        returnToSlip();
    };

    return (
        <div className="space-y-2">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={returnToSlip}
                        className="text-xs lowercase tracking-wide text-gray-400 transition hover:text-white"
                    >
                        ← back to slip
                    </button>
                    <p className="text-xs lowercase tracking-wide text-gray-400">pick builder</p>
                </div>
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold text-white sm:text-2xl">
                        {slip.name}
                    </h1>
                    <p className="text-sm text-gray-400">
                        Add a pick from the leagues this slip supports.
                    </p>
                </div>
            </div>

            <div className="-mt-1">
                <PickBuilderShell
                    context={{
                        mode: "slip",
                        group,
                        slip,
                        picks: slipPicks,
                        currentUser,
                        isCommissioner,
                        onSave: handleSavePick,
                        showCurrentPick: slip.pick_limit === 1,
                        onSelectActiveLeague: () => { },
                    }}
                    initialLeague={(availableSports[0] as League | undefined) ?? DEFAULT_SPORT}
                    leagues={availableSports as League[]}
                    onDismiss={returnToSlip}
                    showDismissButton={false}
                />
            </div>
        </div>
    );
};

export default SlipAddPickPage;
