// import type {
//     CommunityContext,
//     CommunityDomainState,
//     PickVersion,
//     SelectionSnapshot,
// } from "@/lib/domain/community";
// import { toCompetitivePickFeedView } from "@/lib/domain/community";
// import {
//     MOCK_SELECTION_CATALOG,
//     type MockSelectionQuote,
// } from "@/lib/feed/mockPricing";
// import { calculateOddsBasedPoints } from "@/lib/scoring/oddsBasedPoints";
// import type { ContextPointAward } from "@/lib/scoring/context";
// import type { User } from "@/lib/types";
// import { formatDateTime } from "@/lib/utils/date";
// import type {
//     StructuredFeedAuthor,
//     StructuredFeedContestOption,
//     StructuredFeedContextMetadata,
//     StructuredFeedRecord,
//     StructuredFeedRecordSelection,
//     StructuredFeedSelectionOption,
//     StructuredFeedQuote,
//     StructuredFeedStaffRole,
// } from "./types";

// export const toStructuredFeedQuote = (
//     quote: MockSelectionQuote,
// ): StructuredFeedQuote | null =>
//     quote.availability === "available" && quote.americanOdds !== null
//         ? {
//             revision: quote.revision,
//             americanOdds: quote.americanOdds,
//             potentialPoints: calculateOddsBasedPoints(quote.americanOdds),
//             quotedAt: quote.quotedAt,
//             providerReference: quote.providerReference,
//         }
//         : null;

// export const buildStructuredFeedSelectionOptions = (): StructuredFeedSelectionOption[] =>
//     MOCK_SELECTION_CATALOG.flatMap((selection) => {
//         const quote = selection.initialQuote;
//         const structuredQuote = toStructuredFeedQuote(quote);
//         if (!structuredQuote) return [];
//         return [
//             {
//                 id: selection.id,
//                 label: selection.selectionName,
//                 marketLabel: selection.marketName,
//                 description: `${selection.sport} · mock game ${selection.gameId}`,
//                 quote: structuredQuote,
//             },
//         ];
//     });

// const contextMatches = (left: CommunityContext, right: CommunityContext) =>
//     left.type === right.type &&
//     (left.type === "arena"
//         ? right.type === "arena" && left.arenaId === right.arenaId
//         : right.type === "league_feed" && left.leagueId === right.leagueId);

// type StructuredFeedUser = Pick<User, "id" | "fullName" | "username" | "name">;

// const authorFor = (
//     users: readonly StructuredFeedUser[],
//     userId: string,
// ): StructuredFeedAuthor => {
//     const user = users.find((candidate) => candidate.id === userId);
//     return {
//         id: userId,
//         displayName: user?.fullName ?? user?.username ?? user?.name ?? "Former member",
//         handle: user?.username ?? user?.name,
//     };
// };

// const currentVersionFor = (
//     community: CommunityDomainState,
//     currentVersionId: string | null,
// ): PickVersion | null =>
//     currentVersionId
//         ? community.pickVersions.find((version) => version.id === currentVersionId) ?? null
//         : null;

// const selectionForVersion = (
//     community: CommunityDomainState,
//     version: PickVersion | null,
// ): SelectionSnapshot | null => {
//     const snapshotId = version?.selectionSnapshotIds[0];
//     return snapshotId
//         ? community.selectionSnapshots.find((snapshot) => snapshot.id === snapshotId) ?? null
//         : null;
// };

// const recordSelection = ({
//     version,
//     snapshot,
//     awardedPoints,
//     result,
// }: {
//     version: PickVersion | null;
//     snapshot: SelectionSnapshot | null;
//     awardedPoints?: number | null;
//     result?: string;
// }): StructuredFeedRecordSelection | undefined => {
//     const pricing = version?.aggregatePricing ?? snapshot?.pricing;
//     if (!version || !pricing) return undefined;
//     return {
//         summary: version.selectionSummary,
//         marketLabel: snapshot?.marketName,
//         acceptedAmericanOdds: pricing.americanOdds,
//         potentialPoints: pricing.potentialOddsBasedPoints,
//         awardedPoints,
//         resultLabel:
//             result && result !== "pending"
//                 ? result.replaceAll("_", " ")
//                 : undefined,
//     };
// };

// const awardedPointsFor = (
//     awards: readonly ContextPointAward[],
//     sourceRecordId: string,
//     context: CommunityContext,
// ) =>
//     awards
//         .filter(
//             (award) =>
//                 award.status === "confirmed" &&
//                 award.source.recordId === sourceRecordId &&
//                 (context.type === "arena"
//                     ? award.kind === "arena_points" &&
//                     award.context.type === "arena" &&
//                     award.context.arenaId === context.arenaId
//                     : award.kind === "league_points" &&
//                     award.context.type === "league" &&
//                     award.context.leagueId === context.leagueId),
//         )
//         .reduce((total, award) => total + award.appliedAmount, 0);

// const staffRole = (role: string): StructuredFeedStaffRole => {
//     if (role === "arena_owner") return "owner";
//     if (role === "arena_manager") return "manager";
//     return "commissioner";
// };

// export const toStructuredFeedContextMetadata = ({
//     context,
//     name,
//     timeZone,
// }: {
//     context: CommunityContext;
//     name: string;
//     timeZone?: string;
// }): StructuredFeedContextMetadata => ({
//     kind: context.type === "arena" ? "arena" : "league",
//     id: context.type === "arena" ? context.arenaId : context.leagueId,
//     name,
//     timeZone,
// });

// export const buildStructuredFeedRecords = ({
//     community,
//     context,
//     users,
//     awards,
//     viewerUserId,
//     now,
// }: {
//     community: CommunityDomainState;
//     context: CommunityContext;
//     users: readonly StructuredFeedUser[];
//     awards: readonly ContextPointAward[];
//     viewerUserId: string;
//     now: string;
// }): StructuredFeedRecord[] => {
//     const records: Array<StructuredFeedRecord & { sortAt: string; pinned?: boolean }> = [];

//     community.communityPicks.forEach((pick) => {
//         if (!contextMatches(pick.context, context) || pick.status === "deleted") return;
//         const version = currentVersionFor(community, pick.currentVersionId);
//         const snapshot = selectionForVersion(community, version);
//         const replaceable = Boolean(
//             pick.userId === viewerUserId &&
//             pick.status === "submitted" &&
//             snapshot &&
//             Date.parse(now) < Date.parse(snapshot.gameStartsAt),
//         );
//         records.push({
//             id: pick.id,
//             kind: "community_pick",
//             author: authorFor(users, pick.userId),
//             createdAtLabel: formatDateTime(pick.submittedAt),
//             selection: recordSelection({
//                 version,
//                 snapshot,
//                 awardedPoints: awardedPointsFor(awards, pick.id, context) || null,
//                 result: pick.result,
//             }),
//             actions: {
//                 canReplace: replaceable,
//                 canDelete: replaceable,
//             },
//             sortAt: pick.submittedAt,
//         });
//     });

//     community.competitivePicks.forEach((pick) => {
//         if (!contextMatches(pick.context, context)) return;
//         if (pick.status === "withdrawn" || pick.status === "disqualified") return;
//         const contest = community.structuredFeedContests.find(
//             (candidate) => candidate.id === pick.contestId,
//         );
//         if (!contest) return;
//         const version = currentVersionFor(community, pick.currentVersionId);
//         const view = toCompetitivePickFeedView({
//             pick,
//             contest,
//             currentVersion: version,
//             viewerUserId,
//             now,
//         });
//         const visibleVersion = view.currentVersion;
//         const snapshot = selectionForVersion(community, visibleVersion);
//         records.push({
//             id: pick.id,
//             kind: "competitive_pick",
//             author: authorFor(users, pick.userId),
//             createdAtLabel: formatDateTime(pick.submittedAt),
//             contest: {
//                 id: contest.id,
//                 name: contest.name,
//                 locksAtLabel: formatDateTime(contest.locksAt),
//             },
//             visibility:
//                 view.detailsState === "visible" ? "visible" : "hidden_until_lock",
//             selection: recordSelection({
//                 version: visibleVersion,
//                 snapshot,
//                 awardedPoints: awardedPointsFor(awards, pick.id, context) || null,
//                 result: pick.result,
//             }),
//             actions: {
//                 canReplace:
//                     pick.userId === viewerUserId &&
//                     pick.status === "submitted" &&
//                     Boolean(
//                         snapshot &&
//                         Date.parse(now) <
//                         Math.min(
//                             Date.parse(contest.locksAt),
//                             Date.parse(snapshot.gameStartsAt),
//                         ),
//                     ),
//             },
//             sortAt: pick.submittedAt,
//         });
//     });

//     community.staffFeedPosts.forEach((post) => {
//         if (!contextMatches(post.context, context) || post.status === "deleted") return;
//         const version = currentVersionFor(community, post.currentVersionId);
//         const snapshot = selectionForVersion(community, version);
//         records.push({
//             id: post.id,
//             kind: post.kind === "staff_pick" ? "staff_pick" : "staff_announcement",
//             author: authorFor(users, post.authorUserId),
//             createdAtLabel: formatDateTime(post.createdAt),
//             body: post.body || undefined,
//             staffRole: staffRole(post.authorRole),
//             selection:
//                 post.kind === "staff_pick"
//                     ? recordSelection({ version, snapshot })
//                     : undefined,
//             contest: post.contestId
//                 ? (() => {
//                     const contest = community.structuredFeedContests.find(
//                         (candidate) => candidate.id === post.contestId,
//                     );
//                     return contest ? { id: contest.id, name: contest.name } : undefined;
//                 })()
//                 : undefined,
//             actions: {
//                 canReplace:
//                     post.kind === "staff_pick" &&
//                     post.authorUserId === viewerUserId &&
//                     Boolean(snapshot && Date.parse(now) < Date.parse(snapshot.gameStartsAt)),
//                 canDelete: post.authorUserId === viewerUserId,
//             },
//             sortAt: post.createdAt,
//             pinned: post.isPinned,
//         });
//     });

//     return records
//         .sort(
//             (left, right) =>
//                 Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
//                 right.sortAt.localeCompare(left.sortAt),
//         )
//         .map(({ sortAt, pinned, ...record }) => {
//             void sortAt;
//             void pinned;
//             return record;
//         });
// };

// export const buildStructuredFeedContestOptions = ({
//     community,
//     context,
//     userId,
//     now,
// }: {
//     community: CommunityDomainState;
//     context: CommunityContext;
//     userId: string;
//     now: string;
// }): StructuredFeedContestOption[] =>
//     community.structuredFeedContests
//         .filter(
//             (contest) =>
//                 contextMatches(contest.context, context) &&
//                 contest.lifecycleStatus === "open" &&
//                 contest.entryModel === "single_pick" &&
//                 Date.parse(now) < Date.parse(contest.locksAt),
//         )
//         .filter((contest) => {
//             const participant = community.contestParticipants.find(
//                 (candidate) =>
//                     candidate.contestId === contest.id && candidate.userId === userId,
//             );
//             if (
//                 !participant ||
//                 participant.status !== "opted_in" ||
//                 participant.rulesVersionAccepted !== contest.rulesVersion
//             ) {
//                 return false;
//             }
//             return !community.competitivePicks.some(
//                 (pick) =>
//                     pick.participantId === participant.id &&
//                     !["withdrawn", "disqualified", "deleted"].includes(pick.status),
//             );
//         })
//         .map((contest) => ({
//             id: contest.id,
//             name: contest.name,
//             locksAtLabel: formatDateTime(contest.locksAt),
//             acceptsEntries: true,
//         }));
