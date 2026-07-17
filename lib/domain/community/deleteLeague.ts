import type {
    CommunityContext,
    CommunityDomainState,
    PickVersion,
} from "./types";

const isDeletedLeagueContext = (context: CommunityContext, leagueId: string) =>
    context.type === "league_feed" && context.leagueId === leagueId;

/**
 * League deletion is terminal. Remove every League-context aggregate and then
 * prune immutable pricing records that are no longer referenced by a surviving
 * pick version. Arena records and other League contexts remain untouched.
 */
export const deleteLeagueCommunityData = (
    state: CommunityDomainState,
    leagueId: string
): CommunityDomainState => {
    const deletedContestIds = new Set(
        state.structuredFeedContests
            .filter((contest) => isDeletedLeagueContext(contest.context, leagueId))
            .map((contest) => contest.id)
    );
    const deletedCommunityPicks = state.communityPicks.filter((pick) =>
        isDeletedLeagueContext(pick.context, leagueId)
    );
    const deletedCompetitivePicks = state.competitivePicks.filter(
        (pick) =>
            isDeletedLeagueContext(pick.context, leagueId) ||
            deletedContestIds.has(pick.contestId)
    );
    const deletedPickIds = new Set([
        ...deletedCommunityPicks.map((pick) => pick.id),
        ...deletedCompetitivePicks.map((pick) => pick.id),
    ]);
    const deletedVersionIds = new Set([
        ...deletedCommunityPicks.flatMap((pick) => pick.versionIds),
        ...deletedCompetitivePicks.flatMap((pick) => pick.versionIds),
    ]);
    const deletedClaimIds = new Set([
        ...deletedCommunityPicks.flatMap((pick) => pick.communityPointClaimIds),
        ...deletedCompetitivePicks.flatMap((pick) => pick.communityPointClaimIds),
    ]);

    const shouldDeleteVersion = (version: PickVersion) =>
        deletedPickIds.has(version.pickId) || deletedVersionIds.has(version.id);
    const deletedVersions = state.pickVersions.filter(shouldDeleteVersion);
    const pickVersions = state.pickVersions.filter((version) => !shouldDeleteVersion(version));
    const deletedSelectionSnapshotIds = new Set(
        deletedVersions.flatMap((version) => version.selectionSnapshotIds)
    );
    const retainedSelectionSnapshotIds = new Set(
        pickVersions.flatMap((version) => version.selectionSnapshotIds)
    );

    return {
        ...state,
        structuredFeedContests: state.structuredFeedContests.filter(
            (contest) => !deletedContestIds.has(contest.id)
        ),
        contestParticipants: state.contestParticipants.filter(
            (participant) => !deletedContestIds.has(participant.contestId)
        ),
        communityPicks: state.communityPicks.filter(
            (pick) => !isDeletedLeagueContext(pick.context, leagueId)
        ),
        competitivePicks: state.competitivePicks.filter(
            (pick) =>
                !isDeletedLeagueContext(pick.context, leagueId) &&
                !deletedContestIds.has(pick.contestId)
        ),
        pickVersions,
        selectionSnapshots: state.selectionSnapshots.filter(
            (snapshot) =>
                !deletedSelectionSnapshotIds.has(snapshot.id) ||
                retainedSelectionSnapshotIds.has(snapshot.id)
        ),
        communityPointClaims: state.communityPointClaims.filter(
            (claim) =>
                !isDeletedLeagueContext(claim.context, leagueId) &&
                !deletedClaimIds.has(claim.id) &&
                !(claim.contestId && deletedContestIds.has(claim.contestId))
        ),
        communityPointLedger: state.communityPointLedger.filter(
            (entry) =>
                !isDeletedLeagueContext(entry.context, leagueId) &&
                !deletedClaimIds.has(entry.claimId) &&
                !(entry.contestId && deletedContestIds.has(entry.contestId))
        ),
        contestAchievements: state.contestAchievements.filter(
            (achievement) =>
                !isDeletedLeagueContext(achievement.context, leagueId) &&
                !deletedContestIds.has(achievement.contestId)
        ),
    };
};
