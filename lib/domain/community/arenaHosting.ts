import type {
    ArenaHosting,
    ArenaHostingLimits,
    ArenaHostingTier,
    ArenaUnlock,
    IsoDateTime,
    StructuredFeedContest,
} from "./types";

export type SelfServiceArenaHostingTier = Exclude<ArenaHostingTier, "custom">;

export const ARENA_HOSTING_TIER_LIMITS: Readonly<
    Record<SelfServiceArenaHostingTier, Readonly<ArenaHostingLimits>>
> = Object.freeze({
    arena_50: Object.freeze({
        participatingMemberLimit: 50,
        managerLimit: 2,
        activeContestLimit: 6,
    }),
    arena_100: Object.freeze({
        participatingMemberLimit: 100,
        managerLimit: 3,
        activeContestLimit: 10,
    }),
    arena_250_plus: Object.freeze({
        participatingMemberLimit: 250,
        managerLimit: 4,
        activeContestLimit: 15,
    }),
});

export const ARENA_HOSTING_MONTHLY_AMOUNT_CENTS: Readonly<
    Record<SelfServiceArenaHostingTier, number>
> = Object.freeze({
    arena_50: 1_000,
    arena_100: 2_000,
    arena_250_plus: 4_000,
});

const EMPTY_HOSTING_LIMITS: Readonly<ArenaHostingLimits> = Object.freeze({
    participatingMemberLimit: 0,
    managerLimit: 0,
    activeContestLimit: 0,
});

function normalizedOptionalLimit(value: number | null | undefined): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? Math.round(value)
        : null;
}

/** Returns a new limits object so callers cannot mutate the shared tier table. */
export function getArenaHostingLimits(
    tier: ArenaHostingTier | null,
    customLimits?: Partial<ArenaHostingLimits> | null,
): ArenaHostingLimits {
    if (tier === null) return { ...EMPTY_HOSTING_LIMITS };
    if (tier !== "custom") return { ...ARENA_HOSTING_TIER_LIMITS[tier] };
    return {
        participatingMemberLimit: normalizedOptionalLimit(customLimits?.participatingMemberLimit),
        managerLimit: normalizedOptionalLimit(customLimits?.managerLimit),
        activeContestLimit: normalizedOptionalLimit(customLimits?.activeContestLimit),
    };
}

export function getArenaHostingMonthlyAmountCents(tier: ArenaHostingTier): number | null {
    return tier === "custom" ? null : ARENA_HOSTING_MONTHLY_AMOUNT_CENTS[tier];
}

export interface ArenaHostingCapacityCounts {
    participatingMemberCount: number;
    managerCount: number;
    activeContestCount: number;
}

export type ArenaHostingTransitionFailureCode =
    | "arena_not_permanently_unlocked"
    | "arena_mismatch"
    | "hosting_not_active"
    | "hosting_not_paused"
    | "hosting_period_missing"
    | "hosting_period_ended"
    | "pause_not_scheduled"
    | "pause_already_effective"
    | "participating_member_capacity_exceeded"
    | "manager_capacity_exceeded"
    | "active_contest_capacity_exceeded"
    | "invalid_hosting_period";

export type ArenaHostingTransitionResult =
    | { ok: true; hosting: ArenaHosting }
    | {
        ok: false;
        code: ArenaHostingTransitionFailureCode;
        reason: string;
    };

const transitionFailure = (
    code: ArenaHostingTransitionFailureCode,
    reason: string,
): ArenaHostingTransitionResult => ({ ok: false, code, reason });

const timestamp = (value: IsoDateTime | null): number | null => {
    if (value === null) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const isAtOrAfter = (now: IsoDateTime, boundary: IsoDateTime): boolean =>
    Date.parse(now) >= Date.parse(boundary);

const isBefore = (now: IsoDateTime, boundary: IsoDateTime): boolean =>
    Date.parse(now) < Date.parse(boundary);

const isWithinIncludedMonth = (hosting: ArenaHosting, now: IsoDateTime): boolean => {
    const startsAt = timestamp(hosting.includedMonthStartsAt);
    const endsAt = timestamp(hosting.includedMonthEndsAt);
    const current = timestamp(now);
    return (
        current !== null &&
        endsAt !== null &&
        current < endsAt &&
        (startsAt === null || current >= startsAt)
    );
};

export function hasArenaCleanupContests(
    arenaId: string,
    contests: readonly StructuredFeedContest[],
): boolean {
    return contests.some(
        (contest) =>
            contest.context.type === "arena" &&
            contest.context.arenaId === arenaId &&
            (contest.lifecycleStatus === "locked" || contest.lifecycleStatus === "grading"),
    );
}

function completeArenaPause(
    hosting: ArenaHosting,
    contests: readonly StructuredFeedContest[],
    now: IsoDateTime,
): ArenaHosting {
    const needsCleanup = hasArenaCleanupContests(hosting.arenaId, contests);
    return {
        ...hosting,
        status: needsCleanup ? "cleanup" : "paused",
        includedMonthConsumed: true,
        pauseScheduledFor: null,
        cleanupStartedAt: needsCleanup ? hosting.cleanupStartedAt ?? now : hosting.cleanupStartedAt,
        pausedAt: needsCleanup ? null : hosting.pausedAt ?? now,
        updatedAt: now,
    };
}

function hasPaidAccessAfter(hosting: ArenaHosting, now: IsoDateTime): boolean {
    const paidThroughAt = hosting.paidThroughAt ?? hosting.periodEndsAt;
    return paidThroughAt !== null && isBefore(now, paidThroughAt);
}

// function applyScheduledTier(hosting: ArenaHosting): ArenaHosting {
//     if (hosting.scheduledTier === null) return hosting;
//     return {
//         ...hosting,
//         tier: hosting.scheduledTier,
//         limits: getArenaHostingLimits(
//             hosting.scheduledTier,
//             hosting.scheduledTier === "custom" ? hosting.limits : undefined,
//         ),
//         monthlyAmountCents: getArenaHostingMonthlyAmountCents(hosting.scheduledTier),
//         scheduledTier: null,
//     };
// }

/**
 * Reconciles time-driven hosting state without reading the system clock. Included
 * dates are copied unchanged by every transition and therefore cannot restart.
 */
// export function reconcileArenaHosting(input: {
//     hosting: ArenaHosting;
//     contests?: readonly StructuredFeedContest[];
//     now: IsoDateTime;
// }): ArenaHosting {
//     const contests = input.contests ?? [];
//     const { hosting, now } = input;

//     if (hosting.status === "included_month") {
//         if (
//             hosting.includedMonthEndsAt === null ||
//             !isAtOrAfter(now, hosting.includedMonthEndsAt)
//         ) {
//             return hosting;
//         }
//         if (hasPaidAccessAfter(hosting, now)) {
//             const paidHosting = applyScheduledTier(hosting);
//             return {
//                 ...paidHosting,
//                 status: "active",
//                 includedMonthConsumed: true,
//                 pauseScheduledFor: null,
//                 cleanupStartedAt: null,
//                 pausedAt: null,
//                 updatedAt: now,
//             };
//         }
//         return completeArenaPause(hosting, contests, now);
//     }

//     if (hosting.status === "active") {
//         const paidThroughAt = hosting.paidThroughAt ?? hosting.periodEndsAt;
//         if (paidThroughAt === null || !isAtOrAfter(now, paidThroughAt)) return hosting;
//         return {
//             ...hosting,
//             status: "past_due",
//             includedMonthConsumed: true,
//             updatedAt: now,
//         };
//     }

//     if (hosting.status === "past_due") {
//         if (!hasPaidAccessAfter(hosting, now)) return hosting;
//         const paidHosting = applyScheduledTier(hosting);
//         return {
//             ...paidHosting,
//             status: "active",
//             includedMonthConsumed: true,
//             pauseScheduledFor: null,
//             cleanupStartedAt: null,
//             pausedAt: null,
//             updatedAt: now,
//         };
//     }

//     if (hosting.status === "pause_scheduled") {
//         const effectiveAt =
//             hosting.pauseScheduledFor ??
//             hosting.paidThroughAt ??
//             hosting.periodEndsAt ??
//             hosting.includedMonthEndsAt;
//         if (effectiveAt === null || !isAtOrAfter(now, effectiveAt)) return hosting;
//         return completeArenaPause(hosting, contests, now);
//     }

//     if (hosting.status === "cleanup") {
//         return hasArenaCleanupContests(hosting.arenaId, contests)
//             ? hosting
//             : completeArenaPause(hosting, contests, now);
//     }

//     return hosting;
// }

function currentHostingPeriodEnd(hosting: ArenaHosting): IsoDateTime | null {
    if (hosting.status === "included_month") return hosting.includedMonthEndsAt;
    return hosting.paidThroughAt ?? hosting.periodEndsAt;
}

export function scheduleArenaHostingPause(input: {
    hosting: ArenaHosting;
    now: IsoDateTime;
}): ArenaHostingTransitionResult {
    const { hosting, now } = input;
    if (
        hosting.status !== "included_month" &&
        hosting.status !== "active" &&
        hosting.status !== "pause_scheduled"
    ) {
        return transitionFailure(
            "hosting_not_active",
            "Only an included or active hosting period can be scheduled to pause.",
        );
    }
    const effectiveAt = currentHostingPeriodEnd(hosting);
    if (effectiveAt === null) {
        return transitionFailure(
            "hosting_period_missing",
            "A hosting period end is required before scheduling a pause.",
        );
    }
    if (isAtOrAfter(now, effectiveAt)) {
        return transitionFailure(
            "hosting_period_ended",
            "This hosting period has already ended.",
        );
    }
    return {
        ok: true,
        hosting: {
            ...hosting,
            status: "pause_scheduled",
            includedMonthConsumed: true,
            pauseScheduledFor: effectiveAt,
            updatedAt: now,
        },
    };
}

export function cancelArenaHostingPause(input: {
    hosting: ArenaHosting;
    now: IsoDateTime;
}): ArenaHostingTransitionResult {
    const { hosting, now } = input;
    if (hosting.status !== "pause_scheduled" || hosting.pauseScheduledFor === null) {
        return transitionFailure("pause_not_scheduled", "This Arena does not have a scheduled pause.");
    }
    if (isAtOrAfter(now, hosting.pauseScheduledFor)) {
        return transitionFailure(
            "pause_already_effective",
            "The scheduled pause is already effective and cannot be canceled.",
        );
    }
    return {
        ok: true,
        hosting: {
            ...hosting,
            status: isWithinIncludedMonth(hosting, now) ? "included_month" : "active",
            pauseScheduledFor: null,
            updatedAt: now,
        },
    };
}

function capacityFailure(
    limits: ArenaHostingLimits,
    counts: ArenaHostingCapacityCounts,
): ArenaHostingTransitionResult | null {
    if (
        limits.participatingMemberLimit !== null &&
        counts.participatingMemberCount > limits.participatingMemberLimit
    ) {
        return transitionFailure(
            "participating_member_capacity_exceeded",
            "The selected hosting tier does not support the Arena's active participating members.",
        );
    }
    if (limits.managerLimit !== null && counts.managerCount > limits.managerLimit) {
        return transitionFailure(
            "manager_capacity_exceeded",
            "The selected hosting tier does not support the Arena's active managers.",
        );
    }
    if (limits.activeContestLimit !== null && counts.activeContestCount > limits.activeContestLimit) {
        return transitionFailure(
            "active_contest_capacity_exceeded",
            "The selected hosting tier does not support the Arena's active contests.",
        );
    }
    return null;
}

export interface ActivateArenaHostingInput {
    hosting: ArenaHosting;
    unlock: ArenaUnlock;
    tier: ArenaHostingTier;
    customLimits?: Partial<ArenaHostingLimits> | null;
    counts: ArenaHostingCapacityCounts;
    now: IsoDateTime;
    periodStartsAt?: IsoDateTime;
    periodEndsAt: IsoDateTime;
    paidThroughAt?: IsoDateTime;
    simulatedPaymentReference: string;
}

// function activateArenaHosting(
//     input: ActivateArenaHostingInput,
//     allowedStatuses: readonly ArenaHosting["status"][],
// ): ArenaHostingTransitionResult {
//     const { hosting, unlock, now } = input;
//     if (
//         unlock.status !== "unlocked" ||
//         unlock.permanent !== true ||
//         unlock.arenaId !== hosting.arenaId
//     ) {
//         return transitionFailure(
//             "arena_not_permanently_unlocked",
//             "Permanent Arena Unlock is required before activating hosting.",
//         );
//     }
//     if (!allowedStatuses.includes(hosting.status)) {
//         return transitionFailure(
//             "hosting_not_paused",
//             "This Arena is not in a state that can be activated through this action.",
//         );
//     }
//     const periodStartsAt = input.periodStartsAt ?? now;
//     const paidThroughAt = input.paidThroughAt ?? input.periodEndsAt;
//     if (
//         timestamp(periodStartsAt) === null ||
//         timestamp(input.periodEndsAt) === null ||
//         timestamp(paidThroughAt) === null ||
//         Date.parse(periodStartsAt) > Date.parse(now) ||
//         Date.parse(input.periodEndsAt) <= Date.parse(now) ||
//         Date.parse(paidThroughAt) < Date.parse(input.periodEndsAt)
//     ) {
//         return transitionFailure(
//             "invalid_hosting_period",
//             "Hosting requires a current start and a future paid-through period.",
//         );
//     }
//     const limits = getArenaHostingLimits(input.tier, input.customLimits);
//     const capacityError = capacityFailure(limits, input.counts);
//     if (capacityError) return capacityError;

//     return {
//         ok: true,
//         hosting: {
//             ...hosting,
//             tier: input.tier,
//             status: "active",
//             limits,
//             monthlyAmountCents: getArenaHostingMonthlyAmountCents(input.tier),
//             simulatedPaymentReference: input.simulatedPaymentReference,
//             activatedAt: hosting.activatedAt ?? now,
//             scheduledTier: null,
//             periodStartsAt,
//             periodEndsAt: input.periodEndsAt,
//             paidThroughAt,
//             includedMonthConsumed: true,
//             pauseScheduledFor: null,
//             cleanupStartedAt: null,
//             pausedAt: null,
//             updatedAt: now,
//         },
//     };
// }

/** Starts paid hosting after an included period or resolves a past-due period. */
// export function activatePaidArenaHosting(
//     input: ActivateArenaHostingInput,
// ): ArenaHostingTransitionResult {
//     return activateArenaHosting(input, ["included_month", "past_due", "paused"]);
// }

// /** Reactivates a permanently unlocked, paused Arena without replaying its included month. */
// export function reactivateArenaHosting(
//     input: ActivateArenaHostingInput,
// ): ArenaHostingTransitionResult {
//     return activateArenaHosting(input, ["paused"]);
// }

// export function changeArenaHostingTier(input: {
//     hosting: ArenaHosting;
//     tier: ArenaHostingTier;
//     customLimits?: Partial<ArenaHostingLimits> | null;
//     counts: ArenaHostingCapacityCounts;
//     now: IsoDateTime;
// }): ArenaHostingTransitionResult {
//     if (input.hosting.status !== "active") {
//         return transitionFailure(
//             "hosting_not_active",
//             "Hosting must be active before changing its current tier.",
//         );
//     }
//     const limits = getArenaHostingLimits(input.tier, input.customLimits);
//     const capacityError = capacityFailure(limits, input.counts);
//     if (capacityError) return capacityError;
//     return {
//         ok: true,
//         hosting: {
//             ...input.hosting,
//             tier: input.tier,
//             limits,
//             monthlyAmountCents: getArenaHostingMonthlyAmountCents(input.tier),
//             scheduledTier: null,
//             updatedAt: input.now,
//         },
//     };
// }

// /** Schedules a self-service tier for the next paid period without changing current limits. */
// export function scheduleArenaHostingTierChange(input: {
//     hosting: ArenaHosting;
//     tier: SelfServiceArenaHostingTier;
//     counts: ArenaHostingCapacityCounts;
//     now: IsoDateTime;
// }): ArenaHostingTransitionResult {
//     if (
//         input.hosting.status !== "included_month" &&
//         input.hosting.status !== "active"
//     ) {
//         return transitionFailure(
//             "hosting_not_active",
//             "A tier can only be scheduled during a current hosting period.",
//         );
//     }
//     const limits = getArenaHostingLimits(input.tier);
//     const capacityError = capacityFailure(limits, input.counts);
//     if (capacityError) return capacityError;
//     return {
//         ok: true,
//         hosting: {
//             ...input.hosting,
//             scheduledTier: input.tier,
//             updatedAt: input.now,
//         },
//     };
// }
