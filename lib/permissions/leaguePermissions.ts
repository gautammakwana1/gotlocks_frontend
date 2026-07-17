import { Contest, CurrentUser, Group, Slip, UserPlan } from "../interfaces/interfaces";
import { allow, deny, type PermissionDecision } from "./types";

type LeagueActorContext = {
    league: Group | null | undefined;
    actorId: string | null | undefined;
    sessionUserId: string | null | undefined;
    plan: UserPlan;
};

type ProLeagueScoringActorContext = LeagueActorContext & {
    actor: Pick<CurrentUser, "userId" | "plan"> | null | undefined;
};

export const canActAsSessionUser = ({
    actorId,
    sessionUserId,
}: Pick<LeagueActorContext, "actorId" | "sessionUserId">): PermissionDecision => {
    if (!sessionUserId) {
        return deny("authentication_required", "Sign in to continue.");
    }
    if (!actorId || actorId !== sessionUserId) {
        return deny(
            "actor_mismatch",
            "You can only act for your own account."
        );
    }
    return allow();
};

export const isLeagueMember = (
    league: Group | null | undefined,
    userId: string | null | undefined
) => Boolean(league && userId /*&& league.members.includes(userId) */);

export const isLeagueCommissioner = (
    league: Group | null | undefined,
    userId: string | null | undefined
) => Boolean(league && userId && league.created_by === userId);

export const isContestInLeague = (
    contest: Contest | null | undefined,
    leagueId: string | null | undefined
) => Boolean(contest && leagueId && contest.group_id === leagueId);

export const isSlipInLeague = (
    slip: Slip | null | undefined,
    leagueId: string | null | undefined
) => Boolean(slip && leagueId && slip.group_id === leagueId);

export const canCreateStandardContest = ({
    league,
    actorId,
    sessionUserId,
}: LeagueActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny(
            "commissioner_required",
            "Only the commissioner can create contests."
        );
    }
    return canActAsSessionUser({ actorId, sessionUserId });
};

export const canManageStandardContest = ({
    league,
    actorId,
    sessionUserId,
}: LeagueActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny("commissioner_required", "Only the commissioner can manage contests.");
    }
    return canActAsSessionUser({ actorId, sessionUserId });
};

export const canCreateTraditionalSlip = ({
    league,
    actorId,
    sessionUserId,
}: LeagueActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny(
            "commissioner_required",
            "Only the commissioner can create slips."
        );
    }
    return canActAsSessionUser({ actorId, sessionUserId });
};

export const canAddContestSlip = ({
    league,
    actorId,
    sessionUserId,
}: LeagueActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny(
            "commissioner_required",
            "Only the commissioner can add contest slips."
        );
    }
    return canActAsSessionUser({ actorId, sessionUserId });
};

export const canManageTraditionalSlip = ({
    league,
    actorId,
    sessionUserId,
}: LeagueActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny("commissioner_required", "Only the commissioner can manage slips.");
    }
    return canActAsSessionUser({ actorId, sessionUserId });
};

/**
 * Manual traditional-Slip scoring and League badge-point customization are
 * personal Pro commissioner entitlements. A League's hosting tier is
 * intentionally not considered here because ownership can be transferred
 * independently from its stored hosting tier.
 */
export const canUseProLeagueScoringControls = ({
    league,
    actor,
    actorId,
    sessionUserId,
    plan,
}: ProLeagueScoringActorContext): PermissionDecision => {
    if (!league) {
        return deny("league_not_found", "League not found.");
    }
    if (!isLeagueCommissioner(league, actorId)) {
        return deny(
            "commissioner_required",
            "Only the commissioner can use League scoring controls."
        );
    }

    const actorPermission = canActAsSessionUser({ actorId, sessionUserId });
    if (!actorPermission.allowed) {
        return actorPermission;
    }
    if (!actor || actor.userId !== actorId) {
        return deny("actor_mismatch", "You can only act for your own account.");
    }
    if (plan !== "pro") {
        return deny(
            "pro_required",
            "Upgrade to Pro to use manual League scoring controls."
        );
    }

    return allow();
};
