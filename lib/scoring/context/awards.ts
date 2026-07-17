import {
    GLOBAL_XP_DAILY_CAP,
    getAccountCalendarDayKey,
    normalizeAccountTimeZone,
} from "@/lib/scoring/dailyXp";
import { calculateOddsBasedPoints } from "./formula";
import type {
    ArenaPointAward,
    ArenaPointsContext,
    ContextPointAward,
    PointContext,
    GlobalPointsContext,
    GlobalXpAward,
    LeaguePointAward,
    LeaguePointsContext,
    OddsBasedAwardBatch,
    OddsBasedAwardSource,
    OddsBasedAwardSourceType,
    OddsBasedSettlementResult,
} from "./types";

interface RouteOddsBasedPointAwardsInputBase {
    awardBatchId: string;
    userId: string;
    settlementResult: OddsBasedSettlementResult;
    acceptedAmericanOdds: number;
    createdAt: string;
}

export type RouteOddsBasedPointAwardsInput =
    | (RouteOddsBasedPointAwardsInputBase & {
        source: OddsBasedAwardSource & { type: "global_post" };
        sourceContext: GlobalPointsContext;
        accountTimeZone: string;
        /** Caller-supplied remainder after earlier Global awards on this account day. */
        remainingGlobalDailyCap: number;
    })
    | (RouteOddsBasedPointAwardsInputBase & {
        source: OddsBasedAwardSource & {
            type: "league_community_pick" | "league_feed_contest_entry";
        };
        sourceContext: LeaguePointsContext;
    })
    | (RouteOddsBasedPointAwardsInputBase & {
        source: OddsBasedAwardSource & {
            type: "arena_community_pick" | "arena_contest_entry" | "arena_pickem_selection";
        };
        sourceContext: ArenaPointsContext;
    });

type SourceScope = PointContext["type"];

const SOURCE_SCOPES: Record<OddsBasedAwardSourceType, SourceScope> = {
    global_post: "global",
    league_community_pick: "league",
    league_feed_contest_entry: "league",
    arena_community_pick: "arena",
    arena_contest_entry: "arena",
    arena_pickem_selection: "arena",
};

const CONTEST_SOURCES = new Set<OddsBasedAwardSourceType>([
    "league_feed_contest_entry",
    "arena_contest_entry",
    "arena_pickem_selection",
]);

function assertNonEmpty(value: string, label: string): void {
    if (!value.trim()) throw new Error(`${label} is required.`);
}

function assertValidInstant(value: string, label: string): void {
    if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid timestamp.`);
}

function assertSourceContext(
    source: OddsBasedAwardSource,
    context: PointContext,
): void {
    const expectedScope = SOURCE_SCOPES[source.type];
    if (context.type !== expectedScope) {
        throw new Error(`${source.type} must route to the ${expectedScope} context.`);
    }
    if (context.type === "league") assertNonEmpty(context.leagueId, "League ID");
    if (context.type === "arena") assertNonEmpty(context.arenaId, "Arena ID");
}

function assertSource(source: OddsBasedAwardSource): void {
    assertNonEmpty(source.recordId, "Source record ID");
    if (source.selectionSnapshotIds.length === 0) {
        throw new Error("At least one selection snapshot ID is required.");
    }
    source.selectionSnapshotIds.forEach((id: string) => assertNonEmpty(id, "Selection snapshot ID"));
    if (new Set(source.selectionSnapshotIds).size !== source.selectionSnapshotIds.length) {
        throw new Error("Selection snapshot IDs must be unique within an award source.");
    }
    if (CONTEST_SOURCES.has(source.type) && !source.contestId?.trim()) {
        throw new Error(`${source.type} requires a contest ID.`);
    }
    if (!CONTEST_SOURCES.has(source.type) && source.contestId !== null) {
        throw new Error(`${source.type} cannot carry a contest ID.`);
    }
}

function assertRemainingGlobalDailyCap(value: number): void {
    if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > GLOBAL_XP_DAILY_CAP ||
        !Number.isInteger(value)
    ) {
        throw new Error(
            `Remaining Global daily cap must be an integer from 0 to ${GLOBAL_XP_DAILY_CAP}.`,
        );
    }
}

function copySource(source: OddsBasedAwardSource): OddsBasedAwardSource {
    return { ...source, selectionSnapshotIds: [...source.selectionSnapshotIds] };
}

/**
 * Routes one settled odds-based event into exactly one point scope.
 *
 * Global posts create capped Global XP. League and Arena events retain the full
 * formula result only in their own uncapped context. A local-context event never
 * creates Global XP, and a Global event never changes League or Arena points.
 */
export function routeOddsBasedPointAwards(
    input: RouteOddsBasedPointAwardsInput,
): OddsBasedAwardBatch {
    assertNonEmpty(input.awardBatchId, "Award batch ID");
    assertNonEmpty(input.userId, "User ID");
    assertValidInstant(input.createdAt, "Award timestamp");
    assertSource(input.source);
    assertSourceContext(input.source, input.sourceContext);

    const calculatedAmount = calculateOddsBasedPoints(input.acceptedAmericanOdds);
    const createdAt = new Date(input.createdAt).toISOString();
    const source = copySource(input.source);
    const batchBase = {
        id: input.awardBatchId,
        userId: input.userId,
        source,
        sourceContext: input.sourceContext,
        settlementResult: input.settlementResult,
        acceptedAmericanOdds: input.acceptedAmericanOdds,
        calculatedAmount,
        createdAt,
    };

    if (input.settlementResult !== "win") return { ...batchBase, awards: [] };

    let award: ContextPointAward;
    if ("remainingGlobalDailyCap" in input) {
        assertRemainingGlobalDailyCap(input.remainingGlobalDailyCap);
        const globalPoints = Math.min(
            calculatedAmount,
            input.remainingGlobalDailyCap,
        );
        const accountTimeZone = normalizeAccountTimeZone(input.accountTimeZone);
        const globalAward: GlobalXpAward = {
            id: `${input.awardBatchId}:global`,
            awardBatchId: input.awardBatchId,
            userId: input.userId,
            source,
            kind: "global_xp",
            context: input.sourceContext,
            acceptedAmericanOdds: input.acceptedAmericanOdds,
            calculatedAmount,
            appliedAmount: globalPoints,
            status: "confirmed",
            createdAt,
            confirmedAt: createdAt,
            accountTimeZone,
            accountDayKey: getAccountCalendarDayKey(new Date(createdAt), accountTimeZone),
            dailyCapRemainingBeforeAward: input.remainingGlobalDailyCap,
            dailyCapRemainingAfterAward: input.remainingGlobalDailyCap - globalPoints,
            pointsNotAwardedDueToCap: calculatedAmount - globalPoints,
        };
        award = globalAward;
    } else if (input.sourceContext.type === "league") {
        const leagueAward: LeaguePointAward = {
            id: `${input.awardBatchId}:league:${input.sourceContext.leagueId}`,
            awardBatchId: input.awardBatchId,
            userId: input.userId,
            source,
            kind: "league_points",
            context: input.sourceContext,
            acceptedAmericanOdds: input.acceptedAmericanOdds,
            calculatedAmount,
            appliedAmount: calculatedAmount,
            status: "confirmed",
            createdAt,
            confirmedAt: createdAt,
        };
        award = leagueAward;
    } else {
        const arenaAward: ArenaPointAward = {
            id: `${input.awardBatchId}:arena:${input.sourceContext.arenaId}`,
            awardBatchId: input.awardBatchId,
            userId: input.userId,
            source,
            kind: "arena_points",
            context: input.sourceContext,
            acceptedAmericanOdds: input.acceptedAmericanOdds,
            calculatedAmount,
            appliedAmount: calculatedAmount,
            status: "confirmed",
            createdAt,
            confirmedAt: createdAt,
        };
        award = arenaAward;
    }

    return { ...batchBase, awards: [award] };
}

function contextKey(context: PointContext): string {
    if (context.type === "league") return `league:${context.leagueId}`;
    if (context.type === "arena") return `arena:${context.arenaId}`;
    return "global";
}

export function getContextPointAwardSourceKey(award: ContextPointAward): string {
    return [
        award.userId,
        award.source.type,
        award.source.recordId,
        award.kind,
        contextKey(award.context),
    ].join("|");
}

/** Runtime guard for records loaded from local fixtures or future persistence. */
export function assertContextPointAwardRouting(award: ContextPointAward): void {
    assertSource(award.source);
    assertSourceContext(award.source, award.context);
    assertValidInstant(award.createdAt, "Context point award creation timestamp");
    if (award.status === "confirmed" && !award.confirmedAt) {
        throw new Error("Confirmed context point awards require a confirmation timestamp.");
    }
    if (award.confirmedAt) {
        assertValidInstant(award.confirmedAt, "Context point award confirmation timestamp");
    }
    const expectedKind =
        award.context.type === "global"
            ? "global_xp"
            : award.context.type === "league"
                ? "league_points"
                : "arena_points";
    if (award.kind !== expectedKind) {
        throw new Error(`${award.source.type} cannot create a ${award.kind} award.`);
    }
    if (
        !Number.isInteger(award.calculatedAmount) ||
        award.calculatedAmount < 0 ||
        award.calculatedAmount !== calculateOddsBasedPoints(award.acceptedAmericanOdds)
    ) {
        throw new Error("Context point award must retain the system-calculated odds value.");
    }
    if (!Number.isInteger(award.appliedAmount) || award.appliedAmount < 0) {
        throw new Error("Context point award must contain non-negative integer points.");
    }
    if (award.context.type !== "global" && award.appliedAmount !== award.calculatedAmount) {
        throw new Error("League and Arena awards must retain the full uncapped formula result.");
    }
    if (award.kind === "global_xp") {
        assertRemainingGlobalDailyCap(award.dailyCapRemainingBeforeAward);
        assertRemainingGlobalDailyCap(award.dailyCapRemainingAfterAward);
        if (
            award.appliedAmount > award.calculatedAmount ||
            award.dailyCapRemainingAfterAward !==
            award.dailyCapRemainingBeforeAward - award.appliedAmount ||
            award.pointsNotAwardedDueToCap !==
            award.calculatedAmount - award.appliedAmount
        ) {
            throw new Error("Global XP award cap accounting is inconsistent.");
        }
    }
}

function equivalentAward(left: ContextPointAward, right: ContextPointAward): boolean {
    return (
        left.id === right.id &&
        getContextPointAwardSourceKey(left) === getContextPointAwardSourceKey(right) &&
        left.source.contestId === right.source.contestId &&
        [...left.source.selectionSnapshotIds].sort().join("|") ===
        [...right.source.selectionSnapshotIds].sort().join("|") &&
        left.acceptedAmericanOdds === right.acceptedAmericanOdds &&
        left.calculatedAmount === right.calculatedAmount &&
        left.appliedAmount === right.appliedAmount &&
        left.status === right.status &&
        left.createdAt === right.createdAt &&
        left.confirmedAt === right.confirmedAt
    );
}

export interface AppendContextPointAwardsResult {
    awards: ContextPointAward[];
    appendedAwards: ContextPointAward[];
    duplicateAwards: ContextPointAward[];
}

/**
 * Idempotently appends valid awards while rejecting cross-context records and
 * conflicting attempts to award the same source twice in one scope.
 */
export function appendContextPointAwards(
    existingAwards: readonly ContextPointAward[],
    incomingAwards: readonly ContextPointAward[],
): AppendContextPointAwardsResult {
    const awards = [...existingAwards];
    const appendedAwards: ContextPointAward[] = [];
    const duplicateAwards: ContextPointAward[] = [];
    const byId = new Map<string, ContextPointAward>();
    const bySourceKey = new Map<string, ContextPointAward>();

    awards.forEach((award) => {
        assertContextPointAwardRouting(award);
        const sourceKey = getContextPointAwardSourceKey(award);
        if (byId.has(award.id) || bySourceKey.has(sourceKey)) {
            throw new Error("Existing context point awards contain a duplicate ID or source.");
        }
        byId.set(award.id, award);
        bySourceKey.set(sourceKey, award);
    });

    incomingAwards.forEach((award) => {
        assertContextPointAwardRouting(award);
        const sourceKey = getContextPointAwardSourceKey(award);
        const existing = byId.get(award.id) ?? bySourceKey.get(sourceKey);
        if (existing) {
            if (!equivalentAward(existing, award)) {
                throw new Error("Conflicting context point award already exists for this source.");
            }
            duplicateAwards.push(award);
            return;
        }
        awards.push(award);
        appendedAwards.push(award);
        byId.set(award.id, award);
        bySourceKey.set(sourceKey, award);
    });

    return { awards, appendedAwards, duplicateAwards };
}
