import {
    americanToDecimal,
    calculateOddsBasedPoints,
} from "@/lib/scoring/oddsBasedPoints";
import type {
    AcceptedPricingSnapshot,
    ArenaHosting,
    ArenaHostingLimits,
    ArenaHostingStatus,
    ArenaHostingTier,
    ArenaIdentity,
    ArenaMembership,
    ArenaOwnershipTransfer,
    ArenaTotal,
    ArenaUnlock,
    CommunityContext,
    CommunityDomainState,
    CommunityLeaderboard,
    CommunityLeaderboardPeriod,
    CommunityLeaderboardPeriodKind,
    CommunityLeaderboardRow,
    CommunityPick,
    CompetitivePick,
    ContestAchievement,
    ContestAchievementType,
    ContestLifecycleStatus,
    ContestParticipant,
    ContestRewardDetails,
    CommunityPointClaim,
    CommunityPointLedgerEntry,
    CommunityPointSource,
    PickemCard,
    PickemSelection,
    PickVersion,
    PickVersionKind,
    SelectionGrade,
    SelectionSnapshot,
    StructuredFeedContest,
    StructuredPickStatus,
} from "./types";

export const DEFAULT_COMMUNITY_TIME_ZONE = "America/New_York";
export const COMMUNITY_DOMAIN_SCHEMA_VERSION = 1 as const;

type UnknownRecord = Record<string, unknown>;

export interface NormalizationOptions {
    now?: string;
    defaultTimeZone?: string;
    /** Optional simulated migration month for grandfathered legacy Arenas. */
    legacyMigrationPeriod?: {
        startsAt: string;
        endsAt: string;
    };
}

const UNKNOWN_USER_ID = "legacy:unknown-user";
const UNKNOWN_ARENA_ID = "legacy:unknown-arena";
const UNKNOWN_CONTEST_ID = "legacy:unknown-contest";

function record(value: unknown): UnknownRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as UnknownRecord)
        : {};
}

function array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function nonEmptyString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
    const numeric = numberValue(value, fallback);
    return Math.max(0, Math.round(numeric));
}

function positiveInteger(value: unknown, fallback = 1): number {
    const numeric = numberValue(value, fallback);
    return Math.max(1, Math.round(numeric));
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}

function firstDefined(source: UnknownRecord, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null) return source[key];
    }
    return undefined;
}

function stringArray(value: unknown): string[] {
    return Array.from(
        new Set(
            array(value)
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    );
}

function isValidDate(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function isoDateTime(value: unknown, fallback: string): string {
    const candidate = isValidDate(value) ? value : fallback;
    const timestamp = Date.parse(candidate);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date(0).toISOString();
}

function nullableIsoDateTime(value: unknown): string | null {
    return isValidDate(value) ? new Date(Date.parse(value)).toISOString() : null;
}

function enumValue<T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
): T {
    return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function isValidIanaTimeZone(value: unknown): value is string {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
        return true;
    } catch {
        return false;
    }
}

export function normalizeIanaTimeZone(
    value: unknown,
    fallback = DEFAULT_COMMUNITY_TIME_ZONE,
): string {
    if (isValidIanaTimeZone(value)) return value;
    return isValidIanaTimeZone(fallback) ? fallback : DEFAULT_COMMUNITY_TIME_ZONE;
}

function normalizeHttpUrl(value: unknown): string | null {
    const candidate = nullableString(value);
    if (!candidate) return null;
    try {
        const url = new URL(candidate);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

function normalizedNow(options?: NormalizationOptions): string {
    return isoDateTime(options?.now, new Date(0).toISOString());
}

function contextKey(context: CommunityContext): string {
    return context.type === "arena" ? `arena:${context.arenaId}` : `league:${context.leagueId}`;
}

function normalizeContext(
    value: unknown,
    fallback: CommunityContext = { type: "arena", arenaId: UNKNOWN_ARENA_ID },
): CommunityContext {
    const source = record(value);
    const type = source.type;
    if (type === "league_feed" || source.leagueId !== undefined) {
        return {
            type: "league_feed",
            leagueId: nonEmptyString(source.leagueId, fallback.type === "league_feed" ? fallback.leagueId : "legacy:unknown-league"),
        };
    }
    if (type === "arena" || source.arenaId !== undefined) {
        return {
            type: "arena",
            arenaId: nonEmptyString(source.arenaId, fallback.type === "arena" ? fallback.arenaId : UNKNOWN_ARENA_ID),
        };
    }
    return fallback;
}

export function normalizeArenaIdentity(
    value: unknown,
    defaults: { id?: string; ownerUserId?: string } & NormalizationOptions = {},
): ArenaIdentity {
    const source = record(value);
    const now = normalizedNow(defaults);
    const deletedAt = nullableIsoDateTime(source.deletedAt);
    const lifecycleStatus = source.lifecycleStatus === "deleted" || deletedAt ? "deleted" : "active";
    return {
        id: nonEmptyString(source.id, defaults.id ?? UNKNOWN_ARENA_ID),
        ownerUserId: nonEmptyString(
            firstDefined(source, ["ownerUserId", "ownerId", "createdBy"]),
            defaults.ownerUserId ?? UNKNOWN_USER_ID,
        ),
        name: nonEmptyString(source.name, "Untitled Arena"),
        description: nullableString(source.description) ?? "",
        inviteCode: nullableString(source.inviteCode),
        timeZone: normalizeIanaTimeZone(
            firstDefined(source, ["timeZone", "timezone"]),
            defaults.defaultTimeZone,
        ),
        externalCommunityUrl: normalizeHttpUrl(
            firstDefined(source, ["externalCommunityUrl", "externalUrl"]),
        ),
        lifecycleStatus,
        createdAt: isoDateTime(source.createdAt, now),
        updatedAt: isoDateTime(source.updatedAt, now),
        deletedAt,
    };
}

export function normalizeArenaMembership(
    value: unknown,
    defaults: {
        arenaId?: string;
        userId?: string;
        ownerUserId?: string;
    } & NormalizationOptions = {},
): ArenaMembership {
    const source = record(value);
    const now = normalizedNow(defaults);
    const arenaId = nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID);
    const userId = nonEmptyString(source.userId ?? source.id, defaults.userId ?? UNKNOWN_USER_ID);
    const role =
        userId === defaults.ownerUserId
            ? "owner"
            : enumValue(source.role, ["owner", "manager", "member"] as const, "member");
    const status = enumValue(
        source.status,
        ["invited", "active", "archived", "removed", "rejected"] as const,
        "active",
    );
    return {
        id: nonEmptyString(source.id, `${arenaId}:${userId}`),
        arenaId,
        userId,
        role,
        status,
        joinedAt: nullableIsoDateTime(source.joinedAt),
        archivedAt: status === "archived" ? nullableIsoDateTime(source.archivedAt) ?? now : null,
        removedAt: status === "removed" ? nullableIsoDateTime(source.removedAt) ?? now : null,
        updatedAt: isoDateTime(source.updatedAt, now),
    };
}

export function normalizeArenaOwnershipTransfer(
    value: unknown,
    defaults: {
        id?: string;
        arenaId?: string;
        fromOwnerUserId?: string;
        toUserId?: string;
    } & NormalizationOptions = {},
): ArenaOwnershipTransfer {
    const source = record(value);
    const now = normalizedNow(defaults);
    const status = enumValue(
        source.status,
        ["pending", "accepted", "declined", "canceled", "expired"] as const,
        "pending",
    );
    return {
        id: nonEmptyString(source.id, defaults.id ?? "legacy:ownership-transfer"),
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID),
        fromOwnerUserId: nonEmptyString(
            firstDefined(source, ["fromOwnerUserId", "fromUserId"]),
            defaults.fromOwnerUserId ?? UNKNOWN_USER_ID,
        ),
        toUserId: nonEmptyString(
            firstDefined(source, ["toUserId", "recipientUserId"]),
            defaults.toUserId ?? UNKNOWN_USER_ID,
        ),
        status,
        requestedAt: isoDateTime(source.requestedAt, now),
        expiresAt: nullableIsoDateTime(source.expiresAt),
        respondedAt: nullableIsoDateTime(source.respondedAt),
        acceptedAt:
            status === "accepted" ? nullableIsoDateTime(source.acceptedAt) ?? now : nullableIsoDateTime(source.acceptedAt),
        canceledAt:
            status === "canceled" ? nullableIsoDateTime(source.canceledAt) ?? now : nullableIsoDateTime(source.canceledAt),
        blockingContestIds: stringArray(source.blockingContestIds),
    };
}

export function normalizeArenaUnlock(
    value: unknown,
    defaults: {
        arenaId?: string;
        ownerUserId?: string;
        legacyExistingArena?: boolean;
    } & NormalizationOptions = {},
): ArenaUnlock {
    const source = record(value);
    const now = normalizedNow(defaults);
    const explicitStatus = source.status ?? source.unlockStatus;
    const unlocked =
        explicitStatus === "unlocked" ||
        source.isUnlocked === true ||
        source.unlockedAt !== undefined ||
        defaults.legacyExistingArena === true;
    if (!unlocked) {
        return {
            arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID),
            status: "locked",
            permanent: false,
            source: null,
            purchasedByUserId: null,
            unlockedAt: null,
            simulatedPaymentReference: null,
            includedMonthConsumed: false,
            includedMonthConsumedAt: null,
        };
    }
    const unlockSource = defaults.legacyExistingArena
        ? "legacy_grandfathered"
        : enumValue(
            source.source,
            ["simulated_purchase", "legacy_grandfathered"] as const,
            "simulated_purchase",
        );
    const includedMonthConsumed =
        unlockSource === "legacy_grandfathered" || booleanValue(source.includedMonthConsumed, false);
    return {
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID),
        status: "unlocked",
        permanent: true,
        source: unlockSource,
        purchasedByUserId:
            unlockSource === "legacy_grandfathered"
                ? null
                : nonEmptyString(source.purchasedByUserId, defaults.ownerUserId ?? UNKNOWN_USER_ID),
        unlockedAt: isoDateTime(source.unlockedAt, now),
        simulatedPaymentReference:
            unlockSource === "simulated_purchase" ? nullableString(source.simulatedPaymentReference) : null,
        includedMonthConsumed,
        includedMonthConsumedAt: includedMonthConsumed
            ? nullableIsoDateTime(source.includedMonthConsumedAt) ?? now
            : null,
    };
}

const HOSTING_LIMITS: Record<Exclude<ArenaHostingTier, "custom">, ArenaHostingLimits> = {
    arena_50: {
        participatingMemberLimit: 50,
        managerLimit: 2,
        activeContestLimit: 6,
    },
    arena_100: {
        participatingMemberLimit: 100,
        managerLimit: 3,
        activeContestLimit: 10,
    },
    arena_250_plus: {
        participatingMemberLimit: 250,
        managerLimit: 4,
        activeContestLimit: 15,
    },
};

export function hostingLimitsForTier(
    tier: ArenaHostingTier | null,
    customLimits?: unknown,
): ArenaHostingLimits {
    if (!tier) {
        return { participatingMemberLimit: 0, managerLimit: 0, activeContestLimit: 0 };
    }
    if (tier !== "custom") return { ...HOSTING_LIMITS[tier] };
    const source = record(customLimits);
    const optionalLimit = (value: unknown): number | null =>
        typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
    return {
        participatingMemberLimit: optionalLimit(source.participatingMemberLimit),
        managerLimit: optionalLimit(source.managerLimit),
        activeContestLimit: optionalLimit(source.activeContestLimit),
    };
}

function addUtcMonth(value: string): string {
    const date = new Date(value);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString();
}

export function normalizeArenaHosting(
    value: unknown,
    defaults: {
        arenaId?: string;
        unlock?: ArenaUnlock;
        legacyExistingArena?: boolean;
    } & NormalizationOptions = {},
): ArenaHosting {
    const source = record(value);
    const now = normalizedNow(defaults);
    const unlock = defaults.unlock;
    const unlocked = unlock?.status === "unlocked";
    const rawTier = firstDefined(source, ["tier", "hostingTier"]);
    const tier = unlocked
        ? enumValue(
            rawTier,
            ["arena_50", "arena_100", "arena_250_plus", "custom"] as const,
            "arena_50",
        )
        : null;
    const migrationPeriod = defaults.legacyMigrationPeriod;
    const purchasedIncludedStartsAt = unlock?.unlockedAt ?? now;
    const purchasedIncludedEndsAt = addUtcMonth(purchasedIncludedStartsAt);
    const includedMonthStartsAt = nullableIsoDateTime(source.includedMonthStartsAt) ??
        (defaults.legacyExistingArena && migrationPeriod
            ? isoDateTime(migrationPeriod.startsAt, now)
            : unlocked
                ? purchasedIncludedStartsAt
                : null);
    const includedMonthEndsAt = nullableIsoDateTime(source.includedMonthEndsAt) ??
        (defaults.legacyExistingArena && migrationPeriod
            ? isoDateTime(migrationPeriod.endsAt, now)
            : unlocked
                ? purchasedIncludedEndsAt
                : null);
    const withinIncludedPeriod =
        includedMonthEndsAt !== null && Date.parse(now) < Date.parse(includedMonthEndsAt);
    const inferredStatus: ArenaHostingStatus = !unlocked
        ? "not_started"
        : defaults.legacyExistingArena
            ? withinIncludedPeriod && migrationPeriod
                ? "included_month"
                : "paused"
            : withinIncludedPeriod
                ? "included_month"
                : "paused";
    const status = enumValue(
        source.status,
        [
            "not_started",
            "included_month",
            "active",
            "past_due",
            "pause_scheduled",
            "cleanup",
            "paused",
        ] as const,
        inferredStatus,
    );
    const includedMonthConsumed =
        defaults.legacyExistingArena === true ||
        unlock?.includedMonthConsumed === true ||
        booleanValue(source.includedMonthConsumed, !withinIncludedPeriod && unlocked);
    return {
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? unlock?.arenaId ?? UNKNOWN_ARENA_ID),
        tier,
        status: unlocked ? status : "not_started",
        limits: hostingLimitsForTier(tier, source.limits),
        billingMode: "simulated",
        periodStartsAt: nullableIsoDateTime(source.periodStartsAt),
        periodEndsAt: nullableIsoDateTime(source.periodEndsAt),
        paidThroughAt: nullableIsoDateTime(source.paidThroughAt ?? source.periodEndsAt),
        includedMonthStartsAt,
        includedMonthEndsAt,
        includedMonthConsumed,
        pauseScheduledFor: nullableIsoDateTime(source.pauseScheduledFor),
        cleanupStartedAt: nullableIsoDateTime(source.cleanupStartedAt),
        pausedAt: status === "paused" ? nullableIsoDateTime(source.pausedAt) ?? now : nullableIsoDateTime(source.pausedAt),
        updatedAt: isoDateTime(source.updatedAt, now),
    };
}

function normalizeContestStatus(value: unknown): ContestLifecycleStatus {
    const alias = typeof value === "string" ? value.toLowerCase() : "";
    if (alias === "active") return "open";
    return enumValue(
        alias,
        [
            "draft",
            "scheduled",
            "open",
            "locked",
            "grading",
            "final",
            "canceled",
            "archived",
        ] as const,
        "draft",
    );
}

function normalizeReward(value: unknown): ContestRewardDetails | null {
    if (value === null || value === undefined) return null;
    const source = record(value);
    return {
        title: nullableString(source.title),
        description: nullableString(source.description),
        approximateValue: nullableString(source.approximateValue),
        claimInstructions: nullableString(source.claimInstructions),
        claimDeadline: nullableIsoDateTime(source.claimDeadline),
        organizerRulesUrl: normalizeHttpUrl(source.organizerRulesUrl),
        eligibilityRestrictions: nullableString(source.eligibilityRestrictions),
        ageRestrictions: nullableString(source.ageRestrictions),
        organizerAcknowledgedNoPurchaseRequired: booleanValue(
            source.organizerAcknowledgedNoPurchaseRequired,
            false,
        ),
        organizerAcknowledgedIndependentFulfillment: booleanValue(
            source.organizerAcknowledgedIndependentFulfillment,
            false,
        ),
        organizerAcknowledgedStaffIneligible: booleanValue(
            source.organizerAcknowledgedStaffIneligible,
            false,
        ),
    };
}

export function normalizeStructuredFeedContest(
    value: unknown,
    defaults: {
        id?: string;
        context?: CommunityContext;
        createdByUserId?: string;
    } & NormalizationOptions = {},
): StructuredFeedContest {
    const source = record(value);
    const now = normalizedNow(defaults);
    const template = enumValue(
        source.template,
        ["single_pick", "same_game_combo_challenge", "sunday_pickem", "custom"] as const,
        "single_pick",
    );
    const inferredEntryModel =
        template === "sunday_pickem"
            ? "pickem_card"
            : template === "same_game_combo_challenge"
                ? "same_game_combo"
                : "single_pick";
    const lifecycleStatus = normalizeContestStatus(source.lifecycleStatus ?? source.status);
    const finalizedAt = nullableIsoDateTime(source.finalizedAt);
    const canceledAt = nullableIsoDateTime(source.canceledAt);
    const archivedAt = nullableIsoDateTime(source.archivedAt);
    return {
        id: nonEmptyString(source.id, defaults.id ?? UNKNOWN_CONTEST_ID),
        context: normalizeContext(source.context ?? source, defaults.context),
        name: nonEmptyString(source.name, "Untitled Feed Contest"),
        description: nullableString(source.description) ?? "",
        template,
        entryModel: enumValue(
            source.entryModel,
            ["single_pick", "same_game_combo", "pickem_card"] as const,
            inferredEntryModel,
        ),
        lifecycleStatus: archivedAt
            ? "archived"
            : canceledAt || lifecycleStatus === "canceled"
                ? "canceled"
                : finalizedAt
                    ? "final"
                    : lifecycleStatus,
        sport: nonEmptyString(source.sport, "NFL"),
        seasonId: nullableString(source.seasonId),
        timeZone: normalizeIanaTimeZone(source.timeZone, defaults.defaultTimeZone),
        opensAt: nullableIsoDateTime(source.opensAt),
        locksAt: isoDateTime(source.locksAt ?? source.deadline, now),
        expectedEndsAt: nullableIsoDateTime(source.expectedEndsAt ?? source.endsAt),
        winningPlaces: Math.min(5, positiveInteger(source.winningPlaces, 1)),
        eligibleGameIds: stringArray(source.eligibleGameIds),
        rulesVersion: nonEmptyString(source.rulesVersion, "legacy-v1"),
        rulesText: nullableString(source.rulesText) ?? "",
        reward: normalizeReward(source.reward),
        createdByUserId: nonEmptyString(
            firstDefined(source, ["createdByUserId", "createdBy"]),
            defaults.createdByUserId ?? UNKNOWN_USER_ID,
        ),
        createdAt: isoDateTime(source.createdAt, now),
        updatedAt: isoDateTime(source.updatedAt, now),
        finalizedAt,
        canceledAt,
        archivedAt,
    };
}

export function normalizeContestParticipant(
    value: unknown,
    defaults: {
        id?: string;
        contestId?: string;
        userId?: string;
        contestStatus?: ContestLifecycleStatus;
    } & NormalizationOptions = {},
): ContestParticipant {
    const source = record(value);
    const now = normalizedNow(defaults);
    const entryId = nullableString(source.entryId);
    const optedInAt = nullableIsoDateTime(source.optedInAt ?? source.joinedAt);
    const inferredStatus = entryId ? "entered" : optedInAt ? "opted_in" : "eligible";
    let status = enumValue(
        source.status,
        [
            "eligible",
            "opted_in",
            "entered",
            "locked",
            "completed",
            "missed_deadline",
            "withdrawn",
            "disqualified",
        ] as const,
        inferredStatus,
    );
    if (source.status === undefined && entryId && defaults.contestStatus === "locked") status = "locked";
    if (source.status === undefined && entryId && defaults.contestStatus === "final") status = "completed";
    return {
        id: nonEmptyString(source.id, defaults.id ?? "legacy:contest-participant"),
        contestId: nonEmptyString(source.contestId, defaults.contestId ?? UNKNOWN_CONTEST_ID),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        status,
        rulesVersionAccepted: nullableString(source.rulesVersionAccepted),
        optedInAt,
        entryId,
        enteredAt: entryId ? nullableIsoDateTime(source.enteredAt) ?? optedInAt ?? now : null,
        lockedAt: status === "locked" || status === "completed" ? nullableIsoDateTime(source.lockedAt) ?? now : null,
        completedAt: status === "completed" ? nullableIsoDateTime(source.completedAt) ?? now : null,
        withdrawnAt: status === "withdrawn" ? nullableIsoDateTime(source.withdrawnAt) ?? now : null,
        disqualifiedAt:
            status === "disqualified" ? nullableIsoDateTime(source.disqualifiedAt) ?? now : null,
        disqualificationReason:
            status === "disqualified" ? nullableString(source.disqualificationReason) : null,
        updatedAt: isoDateTime(source.updatedAt, now),
    };
}

function parseAmericanOdds(value: unknown): number | null {
    let numeric: number;
    if (typeof value === "number") numeric = value;
    else if (typeof value === "string") {
        numeric = Number(value.trim().replace(/[−–—]/g, "-").replace(/[^0-9+.-]/g, ""));
    } else return null;
    return Number.isFinite(numeric) && numeric !== 0 ? numeric : null;
}

function normalizePricing(
    value: unknown,
    defaults: { americanOdds?: number; acceptedAt: string; receiptSequence?: number },
): AcceptedPricingSnapshot | null {
    const source = record(value);
    const americanOdds = parseAmericanOdds(
        firstDefined(source, ["americanOdds", "submittedAmericanOdds", "odds"]),
    ) ?? parseAmericanOdds(defaults.americanOdds);
    if (americanOdds === null) return null;
    const calculatedDecimalOdds = americanToDecimal(americanOdds);
    const rawDecimalOdds = numberValue(source.decimalOdds, calculatedDecimalOdds);
    const decimalOdds = rawDecimalOdds > 1 ? rawDecimalOdds : calculatedDecimalOdds;
    return {
        americanOdds,
        decimalOdds,
        potentialOddsBasedPoints: nonNegativeInteger(
            source.potentialOddsBasedPoints ??
            source.potentialPerformancePoints ??
            source.performancePoints,
            calculateOddsBasedPoints(americanOdds),
        ),
        quotedAt: isoDateTime(source.quotedAt, defaults.acceptedAt),
        acceptedAt: isoDateTime(source.acceptedAt ?? source.submittedAt, defaults.acceptedAt),
        receiptSequence: positiveInteger(source.receiptSequence, defaults.receiptSequence),
        providerReference: nullableString(source.providerReference),
    };
}

function identitySegment(value: unknown): string {
    return nullableString(value)?.toLowerCase().replace(/\s+/g, "_") ?? "-";
}

export function buildSelectionDuplicateIdentityKey(input: {
    gameId: string;
    marketId: string;
    selectionId: string;
    side: string;
    line: number | null;
    teamId: string | null;
    playerId: string | null;
}): string {
    return [
        input.gameId,
        input.marketId,
        input.selectionId,
        input.side,
        input.line === null ? "-" : String(input.line),
        input.teamId ?? "-",
        input.playerId ?? "-",
    ]
        .map(identitySegment)
        .join("|");
}

export function normalizeSelectionSnapshot(
    value: unknown,
    defaults: { id?: string; acceptedAt?: string; receiptSequence?: number } & NormalizationOptions = {},
): SelectionSnapshot {
    const source = record(value);
    const selection = record(source.selection);
    const now = isoDateTime(defaults.acceptedAt, normalizedNow(defaults));
    const id = nonEmptyString(source.id, defaults.id ?? "legacy:selection-snapshot");
    const gameId = nonEmptyString(source.gameId ?? selection.gameId, "legacy:unknown-game");
    const marketId = nonEmptyString(
        firstDefined(source, ["marketId", "market"]) ?? selection.market,
        "legacy:unknown-market",
    );
    const side = nonEmptyString(source.side ?? selection.side, "unknown");
    const teamId = nullableString(source.teamId ?? selection.teamId);
    const playerId = nullableString(source.playerId ?? selection.playerId);
    const lineValue = source.line ?? source.threshold ?? selection.threshold;
    const line = typeof lineValue === "number" && Number.isFinite(lineValue) ? lineValue : null;
    const selectionId = nonEmptyString(
        source.selectionId,
        [side, teamId, playerId, line].filter((part) => part !== null).join(":") || "legacy:unknown-selection",
    );
    const identityInput = { gameId, marketId, selectionId, side, line, teamId, playerId };
    return {
        id,
        sport: nonEmptyString(source.sport ?? selection.sport, "NFL"),
        gameId,
        marketId,
        selectionId,
        marketName: nonEmptyString(source.marketName ?? source.market, marketId),
        selectionName: nonEmptyString(source.selectionName ?? source.description, selectionId),
        side,
        line,
        teamId,
        playerId,
        gameStartsAt: isoDateTime(source.gameStartsAt ?? source.gameStartTime ?? selection.gameStartTime, now),
        duplicateIdentityKey: nonEmptyString(
            source.duplicateIdentityKey,
            buildSelectionDuplicateIdentityKey(identityInput),
        ),
        pricing: normalizePricing(source.pricing ?? source, {
            acceptedAt: now,
            receiptSequence: defaults.receiptSequence,
        }),
    };
}

export function normalizePickVersion(
    value: unknown,
    defaults: {
        id?: string;
        pickId?: string;
        kind?: PickVersionKind;
    } & NormalizationOptions = {},
): PickVersion {
    const source = record(value);
    const now = normalizedNow(defaults);
    const id = nonEmptyString(source.id, defaults.id ?? "legacy:pick-version");
    const versionNumber = positiveInteger(source.versionNumber ?? source.version, 1);
    const acceptedAt = isoDateTime(source.acceptedAt ?? source.submittedAt, now);
    const receiptSequence = positiveInteger(source.receiptSequence, versionNumber);
    const rawSelections = array(source.selectionSnapshots ?? source.selections);
    const selectionSnapshotIds = stringArray(source.selectionSnapshotIds);
    if (selectionSnapshotIds.length === 0) {
        rawSelections.forEach((selection, index) => {
            const selectionSource = record(selection);
            selectionSnapshotIds.push(
                nonEmptyString(selectionSource.id, `${id}:selection:${index + 1}`),
            );
        });
    }
    const aggregatePricingSource = source.aggregatePricing ?? source.comboPricing;
    return {
        id,
        pickId: nonEmptyString(source.pickId, defaults.pickId ?? "legacy:pick"),
        kind: enumValue(
            source.kind,
            ["community_pick", "competitive_pick", "pickem_card"] as const,
            defaults.kind ?? "community_pick",
        ),
        versionNumber,
        reason: enumValue(
            source.reason,
            ["initial_submission", "replacement"] as const,
            versionNumber > 1 ? "replacement" : "initial_submission",
        ),
        selectionSnapshotIds,
        aggregatePricing:
            aggregatePricingSource === undefined || aggregatePricingSource === null
                ? null
                : normalizePricing(aggregatePricingSource, { acceptedAt, receiptSequence }),
        selectionSummary: nonEmptyString(source.selectionSummary ?? source.description, "Structured pick"),
        acceptedAt,
        receiptSequence,
        supersedesVersionId: nullableString(source.supersedesVersionId),
        supersededAt: nullableIsoDateTime(source.supersededAt),
        immutable: true,
    };
}

function normalizeSelectionGrade(value: unknown): SelectionGrade {
    const alias = typeof value === "string" ? value.toLowerCase() : "pending";
    if (alias === "review required" || alias === "review") return "review_required";
    return enumValue(
        alias,
        ["pending", "win", "loss", "void", "postponed", "canceled", "review_required"] as const,
        "pending",
    );
}

function normalizeStructuredPickStatus(value: unknown): StructuredPickStatus {
    return enumValue(
        typeof value === "string" ? value.toLowerCase() : value,
        [
            "draft",
            "submitted",
            "locked",
            "grading",
            "review_required",
            "final",
            "withdrawn",
            "disqualified",
            "deleted",
        ] as const,
        "submitted",
    );
}

export function normalizeCommunityPick(
    value: unknown,
    defaults: { id?: string; context?: CommunityContext; userId?: string } & NormalizationOptions = {},
): CommunityPick {
    const source = record(value);
    const now = normalizedNow(defaults);
    const id = nonEmptyString(source.id, defaults.id ?? "legacy:community-pick");
    const submittedAt = isoDateTime(source.submittedAt ?? source.createdAt, now);
    const deletedAt = nullableIsoDateTime(source.deletedAt);
    const currentVersionId = nonEmptyString(source.currentVersionId, `${id}:version:1`);
    const versionIds = stringArray(source.versionIds);
    if (!versionIds.includes(currentVersionId)) versionIds.push(currentVersionId);
    return {
        id,
        context: normalizeContext(source.context ?? source, defaults.context),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        status: deletedAt ? "deleted" : normalizeStructuredPickStatus(source.status),
        currentVersionId,
        versionIds,
        result: normalizeSelectionGrade(source.result),
        feedPostId: nullableString(source.feedPostId),
        communityPointClaimIds: stringArray(
            source.communityPointClaimIds ?? source.performancePointClaimIds,
        ),
        submittedAt,
        postingWindowStartedAt: isoDateTime(
            source.postingWindowStartedAt ?? source.originalPostedAt ?? source.createdAt,
            submittedAt,
        ),
        gradedAt: nullableIsoDateTime(source.gradedAt),
        finalizedAt: nullableIsoDateTime(source.finalizedAt),
        deletedAt,
    };
}

export function normalizeCompetitivePick(
    value: unknown,
    defaults: {
        id?: string;
        context?: CommunityContext;
        contestId?: string;
        participantId?: string;
        userId?: string;
    } & NormalizationOptions = {},
): CompetitivePick {
    const source = record(value);
    const now = normalizedNow(defaults);
    const id = nonEmptyString(source.id, defaults.id ?? "legacy:competitive-pick");
    const currentVersionId = nonEmptyString(source.currentVersionId, `${id}:version:1`);
    const versionIds = stringArray(source.versionIds);
    if (!versionIds.includes(currentVersionId)) versionIds.push(currentVersionId);
    return {
        id,
        context: normalizeContext(source.context ?? source, defaults.context),
        contestId: nonEmptyString(source.contestId, defaults.contestId ?? UNKNOWN_CONTEST_ID),
        participantId: nonEmptyString(
            source.participantId,
            defaults.participantId ?? "legacy:contest-participant",
        ),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        entryType: enumValue(
            source.entryType,
            ["single_pick", "same_game_combo", "pickem_card"] as const,
            "single_pick",
        ),
        status: normalizeStructuredPickStatus(source.status),
        currentVersionId,
        versionIds,
        result: normalizeSelectionGrade(source.result),
        feedPostId: nullableString(source.feedPostId),
        communityPointClaimIds: stringArray(
            source.communityPointClaimIds ?? source.performancePointClaimIds,
        ),
        /** Product invariant: legacy visibility values cannot make pre-lock details public. */
        visibilityPolicy: "hidden_until_lock",
        submittedAt: isoDateTime(source.submittedAt ?? source.createdAt, now),
        lockedAt: nullableIsoDateTime(source.lockedAt),
        gradedAt: nullableIsoDateTime(source.gradedAt),
        finalizedAt: nullableIsoDateTime(source.finalizedAt),
        withdrawnAt: nullableIsoDateTime(source.withdrawnAt),
        disqualifiedAt: nullableIsoDateTime(source.disqualifiedAt),
    };
}

function normalizePickemSelection(
    value: unknown,
    defaults: { id: string; now: string },
): PickemSelection {
    const source = record(value);
    const rawResult = typeof source.result === "string" ? source.result.toLowerCase() : "pending";
    const result = rawResult === "win"
        ? "correct"
        : rawResult === "loss"
            ? "incorrect"
            : enumValue(
                rawResult,
                [
                    "pending",
                    "correct",
                    "incorrect",
                    "void",
                    "postponed",
                    "canceled",
                    "review_required",
                ] as const,
                "pending",
            );
    return {
        id: nonEmptyString(source.id, defaults.id),
        gameId: nonEmptyString(source.gameId, "legacy:unknown-game"),
        selectedTeamId: nonEmptyString(source.selectedTeamId ?? source.teamId, "legacy:unknown-team"),
        selectionSnapshotId: nonEmptyString(
            source.selectionSnapshotId,
            `${defaults.id}:snapshot`,
        ),
        result,
        arenaPointsEarned:
            result === "correct"
                ? nonNegativeInteger(
                    source.arenaPointsEarned ?? source.performancePointsEarned,
                    0,
                )
                : 0,
        gradedAt: result === "pending" ? null : nullableIsoDateTime(source.gradedAt) ?? defaults.now,
    };
}

export function normalizePickemCard(
    value: unknown,
    defaults: {
        id?: string;
        arenaId?: string;
        contestId?: string;
        participantId?: string;
        userId?: string;
    } & NormalizationOptions = {},
): PickemCard {
    const source = record(value);
    const now = normalizedNow(defaults);
    const id = nonEmptyString(source.id, defaults.id ?? "legacy:pickem-card");
    const selections = array(source.selections).map((selection, index) =>
        normalizePickemSelection(selection, { id: `${id}:selection:${index + 1}`, now }),
    );
    const count = (result: PickemSelection["result"]) =>
        selections.filter((selection) => selection.result === result).length;
    const currentVersionId = nonEmptyString(source.currentVersionId, `${id}:version:1`);
    const versionIds = stringArray(source.versionIds);
    if (!versionIds.includes(currentVersionId)) versionIds.push(currentVersionId);
    return {
        id,
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID),
        contestId: nonEmptyString(source.contestId, defaults.contestId ?? UNKNOWN_CONTEST_ID),
        participantId: nonEmptyString(
            source.participantId,
            defaults.participantId ?? "legacy:contest-participant",
        ),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        status: normalizeStructuredPickStatus(source.status),
        includedGameIds: stringArray(source.includedGameIds),
        selections,
        currentVersionId,
        versionIds,
        submittedAt: nullableIsoDateTime(source.submittedAt),
        lockedAt: nullableIsoDateTime(source.lockedAt),
        correctCount: count("correct"),
        incorrectCount: count("incorrect"),
        voidCount: count("void") + count("canceled"),
        pendingCount: count("pending") + count("postponed") + count("review_required"),
        totalArenaPoints: selections.reduce(
            (total, selection) => total + selection.arenaPointsEarned,
            0,
        ),
        finalizedAt: nullableIsoDateTime(source.finalizedAt),
    };
}

function normalizeCommunityPointSource(
    value: unknown,
    context: CommunityContext,
): CommunityPointSource {
    const fallback = context.type === "arena" ? "arena_community_single" : "league_feed_entry";
    return enumValue(
        value,
        [
            "arena_community_single",
            "arena_community_combo",
            "arena_competitive_single",
            "arena_competitive_combo",
            "arena_pickem_selection",
            "league_community_single",
            "league_community_combo",
            "league_feed_entry",
        ] as const,
        fallback,
    );
}

export function buildCommunityPointDedupeKey(input: {
    userId: string;
    context: CommunityContext;
    selectionIdentityKeys: readonly string[];
}): string {
    const normalizedSelectionSet = Array.from(new Set(input.selectionIdentityKeys))
        .sort()
        .join("+");
    return [input.userId, contextKey(input.context), normalizedSelectionSet]
        .map(identitySegment)
        .join("::");
}

export function normalizeCommunityPointClaim(
    value: unknown,
    defaults: {
        id?: string;
        context?: CommunityContext;
        userId?: string;
        sourceRecordId?: string;
    } & NormalizationOptions = {},
): CommunityPointClaim {
    const source = record(value);
    const now = normalizedNow(defaults);
    const context = normalizeContext(source.context ?? source, defaults.context);
    const userId = nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID);
    const selectionIdentityKeys = stringArray(source.selectionIdentityKeys);
    if (selectionIdentityKeys.length === 0) {
        selectionIdentityKeys.push(
            nonEmptyString(source.selectionIdentityKey, "legacy:unknown-selection"),
        );
    }
    const selectionSnapshotIds = stringArray(source.selectionSnapshotIds);
    if (selectionSnapshotIds.length === 0) {
        selectionSnapshotIds.push(
            nonEmptyString(source.selectionSnapshotId, "legacy:selection-snapshot"),
        );
    }
    return {
        id: nonEmptyString(source.id, defaults.id ?? "legacy:community-point-claim"),
        userId,
        context,
        sourceType: normalizeCommunityPointSource(source.sourceType, context),
        sourceRecordId: nonEmptyString(
            source.sourceRecordId,
            defaults.sourceRecordId ?? "legacy:source-record",
        ),
        contestId: nullableString(source.contestId),
        selectionSnapshotIds,
        selectionIdentityKeys,
        submittedAmericanOdds: parseAmericanOdds(
            source.submittedAmericanOdds ?? source.americanOdds ?? source.odds,
        ),
        dedupeKey: nonEmptyString(
            source.dedupeKey,
            buildCommunityPointDedupeKey({ userId, context, selectionIdentityKeys }),
        ),
        requestedPoints: nonNegativeInteger(source.requestedPoints ?? source.points, 0),
        status: enumValue(
            source.status,
            ["pending", "accepted", "duplicate", "ineligible", "reversed"] as const,
            "pending",
        ),
        duplicateOfClaimId: nullableString(source.duplicateOfClaimId),
        ledgerEntryId: nullableString(source.ledgerEntryId),
        reason: nullableString(source.reason),
        createdAt: isoDateTime(source.createdAt, now),
        resolvedAt: nullableIsoDateTime(source.resolvedAt),
    };
}

export function normalizeCommunityPointLedgerEntry(
    value: unknown,
    defaults: {
        id?: string;
        context?: CommunityContext;
        userId?: string;
    } & NormalizationOptions = {},
): CommunityPointLedgerEntry {
    const source = record(value);
    const now = normalizedNow(defaults);
    const context = normalizeContext(source.context ?? source, defaults.context);
    const createdAt = isoDateTime(source.createdAt, now);
    const reversesLedgerEntryId = nullableString(source.reversesLedgerEntryId);
    const entryKind = enumValue(
        source.entryKind,
        ["award", "reversal"] as const,
        reversesLedgerEntryId || numberValue(source.pointsDelta, 0) < 0 ? "reversal" : "award",
    );
    const magnitude = Math.abs(numberValue(source.pointsDelta ?? source.points, 0));
    const pointsDelta = entryKind === "reversal" ? -magnitude : magnitude;
    const selectionSnapshotIds = stringArray(source.selectionSnapshotIds);
    if (selectionSnapshotIds.length === 0) {
        selectionSnapshotIds.push(
            nonEmptyString(source.selectionSnapshotId, "legacy:selection-snapshot"),
        );
    }
    return {
        id: nonEmptyString(source.id, defaults.id ?? "legacy:community-point-ledger-entry"),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        context,
        claimId: nonEmptyString(source.claimId, "legacy:community-point-claim"),
        sourceType: normalizeCommunityPointSource(source.sourceType, context),
        sourceRecordId: nonEmptyString(source.sourceRecordId, "legacy:source-record"),
        contestId: nullableString(source.contestId),
        selectionSnapshotIds,
        submittedAmericanOdds: parseAmericanOdds(
            source.submittedAmericanOdds ?? source.americanOdds ?? source.odds,
        ),
        entryKind,
        pointsDelta,
        status: enumValue(
            source.status,
            ["pending", "final", "reversed"] as const,
            "pending",
        ),
        createdAt,
        finalizedAt: nullableIsoDateTime(source.finalizedAt),
        reversedAt: nullableIsoDateTime(source.reversedAt),
        reversesLedgerEntryId,
        reversalReason: nullableString(source.reversalReason),
    };
}

export function normalizeArenaTotal(
    value: unknown,
    defaults: { arenaId?: string; userId?: string } & NormalizationOptions = {},
): ArenaTotal {
    const source = record(value);
    return {
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        finalizedArenaPoints: nonNegativeInteger(
            source.finalizedArenaPoints ?? source.finalizedPerformancePoints ?? source.total,
            0,
        ),
        pendingArenaPoints: nonNegativeInteger(
            source.pendingArenaPoints ?? source.pendingPerformancePoints,
            0,
        ),
        successfulSettledSelections: nonNegativeInteger(source.successfulSettledSelections, 0),
        source: "community_point_ledger_projection",
        computedAt: isoDateTime(source.computedAt, normalizedNow(defaults)),
    };
}

function normalizeLeaderboardPeriod(
    value: unknown,
    defaultTimeZone?: string,
): CommunityLeaderboardPeriod {
    const source = record(value);
    const kind = enumValue(
        source.kind,
        ["current_week", "current_month", "last_30_days", "current_nfl_season", "lifetime"] as const,
        "lifetime",
    );
    return {
        kind,
        timeZone: normalizeIanaTimeZone(source.timeZone, defaultTimeZone),
        startsAt: nullableIsoDateTime(source.startsAt),
        endsAt: nullableIsoDateTime(source.endsAt),
        seasonId: kind === "current_nfl_season" ? nullableString(source.seasonId) : null,
    };
}

function normalizeLeaderboardRow(
    value: unknown,
    defaults: { arenaId: string; now: string },
): CommunityLeaderboardRow {
    const source = record(value);
    const successful = nonNegativeInteger(source.successfulSettledSelections ?? source.successfulPicks, 0);
    const settled = nonNegativeInteger(source.settledSelections ?? source.settledPicks, successful);
    return {
        rank: positiveInteger(source.rank, 1),
        arenaId: nonEmptyString(source.arenaId, defaults.arenaId),
        userId: nonEmptyString(source.userId, UNKNOWN_USER_ID),
        arenaPoints: nonNegativeInteger(
            source.arenaPoints ??
            source.finalizedArenaPoints ??
            source.finalizedPerformancePoints ??
            source.arenaTotal,
            0,
        ),
        successfulSettledSelections: successful,
        settledSelections: settled,
        accuracy: settled > 0 ? successful / settled : null,
        highestSuccessfulAmericanOdds:
            typeof source.highestSuccessfulAmericanOdds === "number" &&
                Number.isFinite(source.highestSuccessfulAmericanOdds)
                ? source.highestSuccessfulAmericanOdds
                : null,
        contestAchievementCount: nonNegativeInteger(source.contestAchievementCount, 0),
        totalReachedAt: nullableIsoDateTime(source.totalReachedAt),
        recentArenaPointsEarned: nonNegativeInteger(
            source.recentArenaPointsEarned ?? source.recentPointsEarned,
            0,
        ),
    };
}

function leaderboardComparator(a: CommunityLeaderboardRow, b: CommunityLeaderboardRow): number {
    if (a.arenaPoints !== b.arenaPoints) {
        return b.arenaPoints - a.arenaPoints;
    }
    if (a.successfulSettledSelections !== b.successfulSettledSelections) {
        return b.successfulSettledSelections - a.successfulSettledSelections;
    }
    if (a.highestSuccessfulAmericanOdds !== b.highestSuccessfulAmericanOdds) {
        return (b.highestSuccessfulAmericanOdds ?? -Infinity) -
            (a.highestSuccessfulAmericanOdds ?? -Infinity);
    }
    if (a.contestAchievementCount !== b.contestAchievementCount) {
        return b.contestAchievementCount - a.contestAchievementCount;
    }
    const aReached = a.totalReachedAt ? Date.parse(a.totalReachedAt) : Infinity;
    const bReached = b.totalReachedAt ? Date.parse(b.totalReachedAt) : Infinity;
    if (aReached !== bReached) return aReached - bReached;
    return a.userId.localeCompare(b.userId);
}

export function rankCommunityLeaderboardRows(
    rows: readonly CommunityLeaderboardRow[],
): CommunityLeaderboardRow[] {
    return [...rows]
        .sort(leaderboardComparator)
        .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function normalizeCommunityLeaderboard(
    value: unknown,
    defaults: {
        arenaId?: string;
        excludedUserIds?: readonly string[];
    } & NormalizationOptions = {},
): CommunityLeaderboard {
    const source = record(value);
    const arenaId = nonEmptyString(source.arenaId, defaults.arenaId ?? UNKNOWN_ARENA_ID);
    const now = normalizedNow(defaults);
    const excluded = new Set(defaults.excludedUserIds ?? []);
    const rows = array(source.rows)
        .map((row) => normalizeLeaderboardRow(row, { arenaId, now }))
        .filter((row) => !excluded.has(row.userId));
    return {
        arenaId,
        period: normalizeLeaderboardPeriod(source.period, defaults.defaultTimeZone),
        rows: rankCommunityLeaderboardRows(rows),
        generatedAt: isoDateTime(source.generatedAt, now),
        source: "community_point_ledger_projection",
    };
}

export function contestAchievementTypeForPlacement(
    placement: number,
    configuredWinningPlaces: number,
): ContestAchievementType | null {
    if (placement === 1) return "champion";
    if (placement === 2) return "runner_up";
    if (placement === 3) return "podium_finish";
    if ((placement === 4 || placement === 5) && configuredWinningPlaces >= placement) return "top_five";
    return null;
}

export function normalizeContestAchievement(
    value: unknown,
    defaults: {
        id?: string;
        context?: CommunityContext;
        contestId?: string;
        userId?: string;
        configuredWinningPlaces?: number;
    } & NormalizationOptions = {},
): ContestAchievement | null {
    const source = record(value);
    const placement = positiveInteger(source.placement, 1);
    const type = contestAchievementTypeForPlacement(
        placement,
        defaults.configuredWinningPlaces ?? positiveInteger(source.configuredWinningPlaces, 5),
    );
    if (!type) return null;
    return {
        id: nonEmptyString(source.id, defaults.id ?? "legacy:contest-achievement"),
        context: normalizeContext(source.context ?? source, defaults.context),
        contestId: nonEmptyString(source.contestId, defaults.contestId ?? UNKNOWN_CONTEST_ID),
        userId: nonEmptyString(source.userId, defaults.userId ?? UNKNOWN_USER_ID),
        placement,
        type,
        contestTemplate: enumValue(
            source.contestTemplate,
            ["single_pick", "same_game_combo_challenge", "sunday_pickem", "custom"] as const,
            "custom",
        ),
        contestName: nonEmptyString(source.contestName, "Contest"),
        finalScore: numberValue(source.finalScore, 0),
        awardedAt: isoDateTime(source.awardedAt, normalizedNow(defaults)),
        seasonId: nullableString(source.seasonId),
        periodLabel: nullableString(source.periodLabel),
        winningEntrySummary: nullableString(source.winningEntrySummary) ?? "",
    };
}

function collection(source: UnknownRecord, ...keys: string[]): unknown[] {
    for (const key of keys) {
        if (Array.isArray(source[key])) return source[key] as unknown[];
    }
    return [];
}

function dedupeById<T>(items: readonly T[], getId: (item: T) => string): T[] {
    const byId = new Map<string, T>();
    items.forEach((item) => byId.set(getId(item), item));
    return [...byId.values()];
}

/**
 * Converts missing/new-domain legacy state into a complete local state slice.
 * It is deliberately additive: legacy League and Slip records are not rewritten.
 */
export function normalizeCommunityDomainState(
    value: unknown,
    options: NormalizationOptions = {},
): CommunityDomainState {
    const source = record(value);
    const now = normalizedNow(options);
    const legacyArenaSources = collection(source, "leagues")
        .map(record)
        .filter((group) => typeof group.groupType === "string" && group.groupType.toLowerCase() === "arena");
    const explicitArenaSources = collection(source, "arenas").map(record);
    const arenaSourceById = new Map<string, { source: UnknownRecord; legacy: boolean }>();
    legacyArenaSources.forEach((arena, index) => {
        arenaSourceById.set(nonEmptyString(arena.id, `legacy:arena:${index + 1}`), {
            source: arena,
            legacy: true,
        });
    });
    explicitArenaSources.forEach((arena, index) => {
        const id = nonEmptyString(arena.id, `arena:${index + 1}`);
        arenaSourceById.set(id, { source: arena, legacy: false });
    });
    const arenas = [...arenaSourceById.entries()].map(([id, item]) =>
        normalizeArenaIdentity(item.source, {
            id,
            now,
            defaultTimeZone: options.defaultTimeZone,
        }),
    );

    const explicitMemberships = collection(source, "arenaMemberships").map((item, index) =>
        normalizeArenaMembership(item, { now, userId: `legacy:user:${index + 1}` }),
    );
    const derivedMemberships: ArenaMembership[] = [];
    arenaSourceById.forEach((item, arenaId) => {
        const arena = arenas.find((candidate) => candidate.id === arenaId);
        if (!arena) return;
        derivedMemberships.push(
            normalizeArenaMembership(
                { arenaId, userId: arena.ownerUserId, role: "owner", status: "active" },
                { arenaId, userId: arena.ownerUserId, ownerUserId: arena.ownerUserId, now },
            ),
        );
        stringArray(item.source.members).forEach((userId) => {
            if (userId === arena.ownerUserId) return;
            derivedMemberships.push(
                normalizeArenaMembership(
                    { arenaId, userId, role: "member", status: "active" },
                    { arenaId, userId, ownerUserId: arena.ownerUserId, now },
                ),
            );
        });
    });
    const arenaMemberships = dedupeById(
        [...derivedMemberships, ...explicitMemberships],
        (membership) => `${membership.arenaId}:${membership.userId}`,
    );

    const explicitUnlockByArena = new Map(
        collection(source, "arenaUnlocks").map((item) => {
            const raw = record(item);
            return [nonEmptyString(raw.arenaId, UNKNOWN_ARENA_ID), raw] as const;
        }),
    );
    const arenaUnlocks = arenas.map((arena) => {
        const metadata = arenaSourceById.get(arena.id);
        return normalizeArenaUnlock(explicitUnlockByArena.get(arena.id), {
            arenaId: arena.id,
            ownerUserId: arena.ownerUserId,
            legacyExistingArena: metadata?.legacy,
            now,
        });
    });
    const explicitHostingByArena = new Map(
        collection(source, "arenaHostings", "arenaHosting").map((item) => {
            const raw = record(item);
            return [nonEmptyString(raw.arenaId, UNKNOWN_ARENA_ID), raw] as const;
        }),
    );
    const arenaHostings = arenas.map((arena) => {
        const metadata = arenaSourceById.get(arena.id);
        const unlock = arenaUnlocks.find((candidate) => candidate.arenaId === arena.id);
        return normalizeArenaHosting(explicitHostingByArena.get(arena.id), {
            arenaId: arena.id,
            unlock,
            legacyExistingArena: metadata?.legacy,
            legacyMigrationPeriod: options.legacyMigrationPeriod,
            now,
        });
    });

    const structuredFeedContests = collection(source, "structuredFeedContests").map((item, index) =>
        normalizeStructuredFeedContest(item, {
            id: `feed-contest:${index + 1}`,
            now,
            defaultTimeZone: options.defaultTimeZone,
        }),
    );
    const contestStatusById = new Map(
        structuredFeedContests.map((contest) => [contest.id, contest.lifecycleStatus]),
    );
    const contestParticipants = collection(source, "contestParticipants").map((item, index) => {
        const raw = record(item);
        const contestId = nonEmptyString(raw.contestId, `feed-contest:${index + 1}`);
        return normalizeContestParticipant(item, {
            id: `contest-participant:${index + 1}`,
            contestId,
            contestStatus: contestStatusById.get(contestId),
            now,
        });
    });
    const explicitSelectionSnapshots = collection(source, "selectionSnapshots").map((item, index) =>
        normalizeSelectionSnapshot(item, { id: `selection-snapshot:${index + 1}`, now }),
    );
    const rawPickVersions = collection(source, "pickVersions");
    const embeddedSelectionSnapshots = rawPickVersions.flatMap((item, versionIndex) => {
        const rawVersion = record(item);
        const versionId = nonEmptyString(rawVersion.id, `pick-version:${versionIndex + 1}`);
        const acceptedAt = isoDateTime(rawVersion.acceptedAt ?? rawVersion.submittedAt, now);
        const receiptSequence = positiveInteger(rawVersion.receiptSequence, versionIndex + 1);
        return array(rawVersion.selectionSnapshots ?? rawVersion.selections).map((selection, selectionIndex) =>
            normalizeSelectionSnapshot(selection, {
                id: `${versionId}:selection:${selectionIndex + 1}`,
                acceptedAt,
                receiptSequence,
                now,
            }),
        );
    });
    const selectionSnapshots = dedupeById(
        [...embeddedSelectionSnapshots, ...explicitSelectionSnapshots],
        (snapshot) => snapshot.id,
    );
    const pickVersions = rawPickVersions.map((item, index) =>
        normalizePickVersion(item, { id: `pick-version:${index + 1}`, now }),
    );
    const communityPicks = collection(source, "communityPicks").map((item, index) =>
        normalizeCommunityPick(item, { id: `community-pick:${index + 1}`, now }),
    );
    const competitivePicks = collection(source, "competitivePicks").map((item, index) =>
        normalizeCompetitivePick(item, { id: `competitive-pick:${index + 1}`, now }),
    );
    const pickemCards = collection(source, "pickemCards").map((item, index) =>
        normalizePickemCard(item, { id: `pickem-card:${index + 1}`, now }),
    );
    const communityPointClaims = collection(
        source,
        "communityPointClaims",
        "performancePointClaims",
    ).map((item, index) =>
        normalizeCommunityPointClaim(item, {
            id: `community-point-claim:${index + 1}`,
            now,
        }),
    );
    const communityPointLedger = collection(
        source,
        "communityPointLedger",
        "performancePointLedger",
        "performancePointLedgerEntries",
    ).map((item, index) =>
        normalizeCommunityPointLedgerEntry(item, {
            id: `community-point-ledger:${index + 1}`,
            now,
        }),
    );
    const arenaTotals = collection(source, "arenaTotals").map((item) => normalizeArenaTotal(item, { now }));
    const staffByArena = new Map<string, string[]>();
    arenaMemberships.forEach((membership) => {
        if (membership.status !== "active" || membership.role === "member") return;
        staffByArena.set(membership.arenaId, [
            ...(staffByArena.get(membership.arenaId) ?? []),
            membership.userId,
        ]);
    });
    const communityLeaderboards = collection(source, "communityLeaderboards").map((item) => {
        const raw = record(item);
        const arenaId = nonEmptyString(raw.arenaId, UNKNOWN_ARENA_ID);
        return normalizeCommunityLeaderboard(item, {
            arenaId,
            excludedUserIds: staffByArena.get(arenaId),
            now,
            defaultTimeZone: options.defaultTimeZone,
        });
    });
    const structuredContestById = new Map(
        structuredFeedContests.map((contest) => [contest.id, contest]),
    );
    const normalizedContestAchievements = collection(source, "contestAchievements")
        .map((item, index) =>
            normalizeContestAchievement(item, {
                id: `contest-achievement:${index + 1}`,
                configuredWinningPlaces: structuredContestById.get(
                    nonEmptyString(record(item).contestId, UNKNOWN_CONTEST_ID),
                )?.winningPlaces,
                now,
            }),
        )
        .filter((achievement): achievement is ContestAchievement => achievement !== null);
    const seenAchievementKeys = new Set<string>();
    const contestAchievements = normalizedContestAchievements.filter((achievement) => {
        const key = [
            contextKey(achievement.context),
            achievement.contestId,
            achievement.userId,
        ].join("::");
        if (seenAchievementKeys.has(key)) return false;
        seenAchievementKeys.add(key);
        return true;
    });

    return {
        schemaVersion: COMMUNITY_DOMAIN_SCHEMA_VERSION,
        arenas,
        arenaMemberships,
        arenaOwnershipTransfers: collection(source, "arenaOwnershipTransfers").map((item, index) =>
            normalizeArenaOwnershipTransfer(item, { id: `arena-transfer:${index + 1}`, now }),
        ),
        arenaUnlocks,
        arenaHostings,
        structuredFeedContests,
        contestParticipants,
        selectionSnapshots,
        pickVersions,
        communityPicks,
        competitivePicks,
        pickemCards,
        communityPointClaims,
        communityPointLedger,
        arenaTotals,
        communityLeaderboards,
        contestAchievements,
    };
}

/** Empty normalized state for app-state integration without unsafe `undefined` checks. */
export function createEmptyCommunityDomainState(
    options: NormalizationOptions = {},
): CommunityDomainState {
    return normalizeCommunityDomainState({}, options);
}

export type { CommunityLeaderboardPeriodKind };
