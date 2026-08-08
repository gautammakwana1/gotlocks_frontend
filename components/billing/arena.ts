import {
    getArenaHostingLimits,
    type ArenaHostingLimits,
    type ArenaHostingTier,
} from "@/lib/domain/community";
import { ARENA_INCLUDED_TIER_LABEL, ARENA_TIER_LABELS } from "@/lib/arenas/tierLabels";

export type ArenaSelfServiceHostingTier = Exclude<ArenaHostingTier, "custom">;

export type ArenaUnlockOffer = {
    kind: "arena_unlock";
    name: "Arena Unlock";
    amountCents: 5000;
    currency: "USD";
    priceLabel: "$50";
    cadenceLabel: "one time";
    includedTier: "arena_50";
    includedMonthCount: 1;
    summary: string;
};

export type ArenaHostingOffer = {
    kind: "arena_hosting";
    tier: ArenaHostingTier;
    /** Display name from ARENA_TIER_LABELS — kept in sync with the backend catalogue. */
    name: string;
    selfService: boolean;
    contactOnly: boolean;
    amountCents: 1000 | 2000 | 4000 | null;
    currency: "USD" | null;
    priceLabel: "$10" | "$20" | "$40" | "Custom";
    cadenceLabel: "per month" | "contact us";
    limits: ArenaHostingLimits;
    summary: string;
};

// export type ArenaCapacityUsage = {
//     participatingMembers: number;
//     managers: number;
//     activeContests: number;
// };

export const ARENA_UNLOCK_OFFER: ArenaUnlockOffer = {
    kind: "arena_unlock",
    name: "Arena Unlock",
    amountCents: 5000,
    currency: "USD",
    priceLabel: "$50",
    cadenceLabel: "one time",
    includedTier: "arena_50",
    includedMonthCount: 1,
    summary: `Permanently unlock this Arena and include one ${ARENA_INCLUDED_TIER_LABEL} month.`,
};

const ARENA_HOSTING_OFFERS: Record<ArenaHostingTier, ArenaHostingOffer> = {
    arena_50: {
        kind: "arena_hosting",
        tier: "arena_50",
        name: ARENA_TIER_LABELS.arena_50,
        selfService: true,
        contactOnly: false,
        amountCents: 1000,
        currency: "USD",
        priceLabel: "$10",
        cadenceLabel: "per month",
        limits: getArenaHostingLimits("arena_50"),
        summary: "Up to 50 participating members, 2 managers, and 6 active contests.",
    },
    arena_100: {
        kind: "arena_hosting",
        tier: "arena_100",
        name: ARENA_TIER_LABELS.arena_100,
        selfService: true,
        contactOnly: false,
        amountCents: 2000,
        currency: "USD",
        priceLabel: "$20",
        cadenceLabel: "per month",
        limits: getArenaHostingLimits("arena_100"),
        summary: "Up to 100 participating members, 3 managers, and 10 active contests.",
    },
    arena_250_plus: {
        kind: "arena_hosting",
        tier: "arena_250_plus",
        name: ARENA_TIER_LABELS.arena_250_plus,
        selfService: true,
        contactOnly: false,
        amountCents: 4000,
        currency: "USD",
        priceLabel: "$40",
        cadenceLabel: "per month",
        limits: getArenaHostingLimits("arena_250_plus"),
        summary: "Up to 250 participating members, 4 managers, and 15 active contests.",
    },
    custom: {
        kind: "arena_hosting",
        tier: "custom",
        name: ARENA_TIER_LABELS.custom,
        selfService: false,
        contactOnly: true,
        amountCents: null,
        currency: null,
        priceLabel: "Custom",
        cadenceLabel: "contact us",
        limits: getArenaHostingLimits("custom"),
        summary: "Contact gotLocks for more than 250 members and custom operating limits.",
    },
};

/** The three self-service tiers, in display order. Custom is contact-only. */
export const SELF_SERVICE_ARENA_TIERS: ArenaSelfServiceHostingTier[] = [
    "arena_50",
    "arena_100",
    "arena_250_plus",
];

export const getArenaUnlockOffer = (): ArenaUnlockOffer => ({ ...ARENA_UNLOCK_OFFER });

export const getArenaHostingOffer = (tier: ArenaHostingTier): ArenaHostingOffer => {
    const offer = ARENA_HOSTING_OFFERS[tier];
    return { ...offer, limits: { ...offer.limits } };
};

// export const getArenaHostingOffers = (): ArenaHostingOffer[] =>
//     (["arena_50", "arena_100", "arena_250_plus", "custom"] as const).map(
//         getArenaHostingOffer,
//     );

// const validIsoDateTime = (value: string): string | null => {
//     const timestamp = Date.parse(value);
//     return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
// };

// /**
//  * Adds one UTC calendar month while clamping end-of-month dates. For example,
//  * January 31 becomes February 28 (or 29 in a leap year), never March 2/3.
//  */
// export const addOneUtcCalendarMonth = (value: string): string => {
//     const normalized = validIsoDateTime(value);
//     if (!normalized) throw new Error("A valid included-month start date is required.");

//     const date = new Date(normalized);
//     const originalDay = date.getUTCDate();
//     date.setUTCDate(1);
//     date.setUTCMonth(date.getUTCMonth() + 1);
//     const nextMonth = date.getUTCMonth();
//     const nextMonthYear = date.getUTCFullYear();
//     const lastDay = new Date(Date.UTC(nextMonthYear, nextMonth + 1, 0)).getUTCDate();
//     date.setUTCDate(Math.min(originalDay, lastDay));
//     return date.toISOString();
// };

// export const getArenaIncludedMonthDates = (startsAt: string) => {
//     const normalizedStartsAt = validIsoDateTime(startsAt);
//     if (!normalizedStartsAt) {
//         throw new Error("A valid included-month start date is required.");
//     }
//     return {
//         startsAt: normalizedStartsAt,
//         endsAt: addOneUtcCalendarMonth(normalizedStartsAt),
//     };
// };

// const referenceToken = (value: string) =>
//     value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";

// const dateReferenceToken = (value: string) => value.replace(/[^0-9]/g, "");

// export const buildArenaUnlockReference = (arenaId: string) =>
//     `sim-arena-unlock-${referenceToken(arenaId)}`;

// export type ArenaHostingReferenceAction = "activate" | "change" | "reactivate";

// export const buildArenaHostingReference = ({
//     arenaId,
//     action,
//     tier,
//     effectiveAt,
// }: {
//     arenaId: string;
//     action: ArenaHostingReferenceAction;
//     tier: ArenaSelfServiceHostingTier;
//     effectiveAt: string;
// }) =>
//     `sim-arena-hosting-${referenceToken(arenaId)}-${action}-${tier}-${dateReferenceToken(
//         effectiveAt,
//     )}`;

// const EMPTY_USAGE: ArenaCapacityUsage = {
//     participatingMembers: 0,
//     managers: 0,
//     activeContests: 0,
// };

// const normalizedUsage = (usage?: Partial<ArenaCapacityUsage>): ArenaCapacityUsage => ({
//     participatingMembers: usage?.participatingMembers ?? 0,
//     managers: usage?.managers ?? 0,
//     activeContests: usage?.activeContests ?? 0,
// });

// const isValidUsage = (usage: ArenaCapacityUsage) =>
//     Object.values(usage).every(
//         (value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0,
//     );

// export type ArenaCapacityBlocker = {
//     kind: "participating_members" | "managers" | "active_contests";
//     current: number;
//     limit: number;
//     message: string;
// };

// export const getArenaCapacityBlockers = (
//     usage: ArenaCapacityUsage,
//     limits: ArenaHostingLimits,
// ): ArenaCapacityBlocker[] => {
//     const blockers: ArenaCapacityBlocker[] = [];
//     if (
//         limits.participatingMemberLimit !== null &&
//         usage.participatingMembers > limits.participatingMemberLimit
//     ) {
//         blockers.push({
//             kind: "participating_members",
//             current: usage.participatingMembers,
//             limit: limits.participatingMemberLimit,
//             message: `Archive participating members until ${limits.participatingMemberLimit} or fewer remain.`,
//         });
//     }
//     if (limits.managerLimit !== null && usage.managers > limits.managerLimit) {
//         blockers.push({
//             kind: "managers",
//             current: usage.managers,
//             limit: limits.managerLimit,
//             message: `Reduce managers to ${limits.managerLimit} before changing tiers.`,
//         });
//     }
//     if (limits.activeContestLimit !== null && usage.activeContests > limits.activeContestLimit) {
//         blockers.push({
//             kind: "active_contests",
//             current: usage.activeContests,
//             limit: limits.activeContestLimit,
//             message: `Finish or cancel contests until ${limits.activeContestLimit} or fewer remain active.`,
//         });
//     }
//     return blockers;
// };

// const SELF_SERVICE_TIER_ORDER: Record<ArenaSelfServiceHostingTier, number> = {
//     arena_50: 0,
//     arena_100: 1,
//     arena_250_plus: 2,
// };

// export type ArenaHostingChangeKind =
//     | "activate"
//     | "reactivate"
//     | "upgrade"
//     | "downgrade"
//     | "schedule_after_included_month"
//     | "blocked"
//     | "no_change"
//     | "contact";

// export type ArenaHostingChangePreview = {
//     kind: ArenaHostingChangeKind;
//     allowed: boolean;
//     contactOnly: boolean;
//     fromTier: ArenaHostingTier | null;
//     targetTier: ArenaHostingTier;
//     currentOffer: ArenaHostingOffer | null;
//     targetOffer: ArenaHostingOffer;
//     currentMonthlyAmountCents: number | null;
//     nextMonthlyAmountCents: number | null;
//     monthlyDifferenceCents: number | null;
//     effectiveAt: string | null;
//     usage: ArenaCapacityUsage;
//     blockers: ArenaCapacityBlocker[];
//     actionLabel: string;
//     summary: string;
// };

// const isOperatingStatus = (status: ArenaHostingStatus) =>
//     status === "active" || status === "included_month" || status === "pause_scheduled";

// export const getArenaHostingChangePreview = ({
//     hosting,
//     targetTier,
//     usage = EMPTY_USAGE,
//     now,
// }: {
//     hosting?: ArenaHosting | null;
//     targetTier: ArenaHostingTier;
//     usage?: ArenaCapacityUsage;
//     now: string;
// }): ArenaHostingChangePreview => {
//     const normalizedNow = validIsoDateTime(now);
//     if (!normalizedNow) throw new Error("A valid preview time is required.");
//     const normalizedCurrentUsage = normalizedUsage(usage);
//     if (!isValidUsage(normalizedCurrentUsage)) {
//         throw new Error("Arena capacity usage must contain non-negative whole numbers.");
//     }

//     const targetOffer = getArenaHostingOffer(targetTier);
//     const fromTier = hosting?.tier ?? null;
//     const currentOffer = fromTier ? getArenaHostingOffer(fromTier) : null;
//     const currentMonthlyAmountCents = hosting?.monthlyAmountCents ?? currentOffer?.amountCents ?? null;
//     const nextMonthlyAmountCents = targetOffer.amountCents;
//     const monthlyDifferenceCents =
//         currentMonthlyAmountCents !== null && nextMonthlyAmountCents !== null
//             ? nextMonthlyAmountCents - currentMonthlyAmountCents
//             : null;

//     if (targetOffer.contactOnly || fromTier === "custom") {
//         return {
//             kind: "contact",
//             allowed: false,
//             contactOnly: true,
//             fromTier,
//             targetTier,
//             currentOffer,
//             targetOffer,
//             currentMonthlyAmountCents,
//             nextMonthlyAmountCents,
//             monthlyDifferenceCents,
//             effectiveAt: null,
//             usage: normalizedCurrentUsage,
//             blockers: [],
//             actionLabel: "Contact gotLocks",
//             summary: "Custom Arena hosting is contact-only and cannot be activated automatically.",
//         };
//     }

//     if (
//         hosting &&
//         isOperatingStatus(hosting.status) &&
//         !canWriteArenaHosting({ hosting, now: normalizedNow }).allowed
//     ) {
//         return {
//             kind: "blocked",
//             allowed: false,
//             contactOnly: false,
//             fromTier,
//             targetTier,
//             currentOffer,
//             targetOffer,
//             currentMonthlyAmountCents,
//             nextMonthlyAmountCents,
//             monthlyDifferenceCents,
//             effectiveAt: null,
//             usage: normalizedCurrentUsage,
//             blockers: [],
//             actionLabel: "Reconcile period first",
//             summary: "The current hosting period has ended. Reconcile it before changing tiers.",
//         };
//     }

//     if (hosting?.status === "pause_scheduled" || hosting?.status === "cleanup") {
//         const pauseScheduled = hosting.status === "pause_scheduled";
//         return {
//             kind: "blocked",
//             allowed: false,
//             contactOnly: false,
//             fromTier,
//             targetTier,
//             currentOffer,
//             targetOffer,
//             currentMonthlyAmountCents,
//             nextMonthlyAmountCents,
//             monthlyDifferenceCents,
//             effectiveAt: null,
//             usage: normalizedCurrentUsage,
//             blockers: [],
//             actionLabel: pauseScheduled ? "Cancel pause first" : "Finish cleanup first",
//             summary: pauseScheduled
//                 ? "Cancel the scheduled pause before changing hosting tiers."
//                 : "Finish Arena cleanup before choosing a reactivation tier.",
//         };
//     }

//     const blockers = getArenaCapacityBlockers(normalizedCurrentUsage, targetOffer.limits);
//     const alreadyScheduledTier = hosting?.scheduledTier === targetTier;
//     let kind: ArenaHostingChangeKind;
//     let effectiveAt: string | null = normalizedNow;

//     if (alreadyScheduledTier) {
//         kind = "no_change";
//         effectiveAt = null;
//     } else if (hosting?.status === "included_month") {
//         kind = "schedule_after_included_month";
//         effectiveAt = hosting.includedMonthEndsAt;
//     } else if (fromTier === targetTier && isOperatingStatus(hosting?.status ?? "not_started")) {
//         kind = "no_change";
//         effectiveAt = null;
//     } else if (hosting?.status === "paused" || hosting?.status === "past_due") {
//         kind = "reactivate";
//     } else if (!fromTier || hosting?.status === "not_started") {
//         kind = "activate";
//     } else {
//         const currentRank = SELF_SERVICE_TIER_ORDER[fromTier as ArenaSelfServiceHostingTier];
//         const targetRank = SELF_SERVICE_TIER_ORDER[targetTier as ArenaSelfServiceHostingTier];
//         kind = targetRank > currentRank ? "upgrade" : "downgrade";
//         if (kind === "downgrade") {
//             effectiveAt = hosting?.paidThroughAt ?? hosting?.periodEndsAt ?? normalizedNow;
//         }
//     }

//     const allowed = kind === "no_change" || blockers.length === 0;
//     const actionLabel =
//         kind === "activate"
//             ? `Activate ${targetOffer.name}`
//             : kind === "reactivate"
//                 ? `Reactivate with ${targetOffer.name}`
//                 : kind === "upgrade"
//                     ? `Upgrade to ${targetOffer.name}`
//                     : kind === "downgrade"
//                         ? `Schedule ${targetOffer.name}`
//                         : kind === "schedule_after_included_month"
//                             ? `Use ${targetOffer.name} after included month`
//                             : alreadyScheduledTier
//                                 ? `${targetOffer.name} is scheduled`
//                                 : `${targetOffer.name} is active`;
//     const summary =
//         blockers.length > 0
//             ? blockers.map((blocker) => blocker.message).join(" ")
//             : kind === "no_change"
//                 ? alreadyScheduledTier
//                     ? `${targetOffer.name} is already scheduled for the next paid period.`
//                     : `${targetOffer.name} is already active.`
//                 : kind === "schedule_after_included_month"
//                     ? `${targetOffer.name} begins after the included Arena 50 month ends.`
//                     : kind === "downgrade"
//                         ? `${targetOffer.name} begins at the end of the current simulated paid period.`
//                         : `${targetOffer.name} begins ${kind === "reactivate" ? "when hosting is reactivated" : "when confirmed"}.`;

//     return {
//         kind,
//         allowed,
//         contactOnly: false,
//         fromTier,
//         targetTier,
//         currentOffer,
//         targetOffer,
//         currentMonthlyAmountCents,
//         nextMonthlyAmountCents,
//         monthlyDifferenceCents,
//         effectiveAt,
//         usage: normalizedCurrentUsage,
//         blockers,
//         actionLabel,
//         summary,
//     };
// };

// export type ArenaBillingViewModel = {
//     billingModeLabel: "Simulated billing";
//     unlockOffer: ArenaUnlockOffer;
//     unlockStatus: ArenaUnlock["status"];
//     unlockStatusLabel: "Locked" | "Permanently unlocked" | "Grandfathered unlock";
//     canUnlock: boolean;
//     unlockActionLabel: string | null;
//     unlockReceiptReference: string | null;
//     hostingStatus: ArenaHostingStatus;
//     hostingStatusLabel: string;
//     currentHostingOffer: ArenaHostingOffer | null;
//     hostingOffers: ArenaHostingOffer[];
//     includedMonth: {
//         startsAt: string;
//         endsAt: string;
//         active: boolean;
//         expired: boolean;
//         daysRemaining: number;
//     } | null;
//     selectedChangePreview: ArenaHostingChangePreview | null;
//     readOnly: boolean;
// };

// const HOSTING_STATUS_LABELS: Record<ArenaHostingStatus, string> = {
//     not_started: "Hosting not started",
//     included_month: "Included Arena 50 month",
//     active: "Hosting active",
//     past_due: "Hosting past due",
//     pause_scheduled: "Pause scheduled",
//     cleanup: "Contest cleanup",
//     paused: "Hosting paused",
// };

// export const getArenaBillingViewModel = ({
//     unlock,
//     hosting,
//     selectedTier,
//     usage = EMPTY_USAGE,
//     now,
// }: {
//     unlock?: ArenaUnlock | null;
//     hosting?: ArenaHosting | null;
//     selectedTier?: ArenaHostingTier | null;
//     usage?: ArenaCapacityUsage;
//     now: string;
// }): ArenaBillingViewModel => {
//     const normalizedNow = validIsoDateTime(now);
//     if (!normalizedNow) throw new Error("A valid billing view time is required.");
//     const unlockStatus = unlock?.status ?? "locked";
//     const hostingStatus = hosting?.status ?? "not_started";
//     const includedMonth =
//         hosting?.includedMonthStartsAt && hosting.includedMonthEndsAt
//             ? {
//                 startsAt: hosting.includedMonthStartsAt,
//                 endsAt: hosting.includedMonthEndsAt,
//                 active:
//                     hostingStatus === "included_month" &&
//                     Date.parse(normalizedNow) < Date.parse(hosting.includedMonthEndsAt),
//                 expired: Date.parse(normalizedNow) >= Date.parse(hosting.includedMonthEndsAt),
//                 daysRemaining: Math.max(
//                     0,
//                     Math.ceil(
//                         (Date.parse(hosting.includedMonthEndsAt) - Date.parse(normalizedNow)) /
//                         (24 * 60 * 60 * 1000),
//                     ),
//                 ),
//             }
//             : null;

//     return {
//         billingModeLabel: "Simulated billing",
//         unlockOffer: getArenaUnlockOffer(),
//         unlockStatus,
//         unlockStatusLabel:
//             unlockStatus === "locked"
//                 ? "Locked"
//                 : unlock?.source === "legacy_grandfathered"
//                     ? "Grandfathered unlock"
//                     : "Permanently unlocked",
//         canUnlock: unlockStatus === "locked",
//         unlockActionLabel: unlockStatus === "locked" ? "Unlock Arena for $50" : null,
//         unlockReceiptReference: unlock?.simulatedPaymentReference ?? null,
//         hostingStatus,
//         hostingStatusLabel: HOSTING_STATUS_LABELS[hostingStatus],
//         currentHostingOffer: hosting?.tier ? getArenaHostingOffer(hosting.tier) : null,
//         hostingOffers: getArenaHostingOffers(),
//         includedMonth,
//         selectedChangePreview: selectedTier
//             ? getArenaHostingChangePreview({ hosting, targetTier: selectedTier, usage, now: normalizedNow })
//             : null,
//         readOnly:
//             unlockStatus === "locked" ||
//             !hosting ||
//             !canWriteArenaHosting({ hosting, now: normalizedNow }).allowed,
//     };
// };

// export type ArenaBillingFailureCode =
//     | "arena_required"
//     | "purchaser_required"
//     | "invalid_time"
//     | "arena_mismatch"
//     | "arena_locked"
//     | "hosting_required"
//     | "hosting_not_active"
//     | "cleanup_required"
//     | "custom_contact_required"
//     | "capacity_exceeded";

// export type ArenaBillingFailure = {
//     success: false;
//     code: ArenaBillingFailureCode;
//     error: string;
// };

// export type ArenaUnlockActionResult =
//     | {
//         success: true;
//         actionStatus: "unlocked" | "already_unlocked";
//         unlock: ArenaUnlock;
//         hosting: ArenaHosting | null;
//         receiptReference: string | null;
//     }
//     | ArenaBillingFailure;

// export type ArenaHostingActionStatus =
//     | "activated"
//     | "changed_tier"
//     | "already_active"
//     | "pause_scheduled"
//     | "already_scheduled"
//     | "paused"
//     | "cleanup"
//     | "already_paused"
//     | "pause_canceled"
//     | "reactivated";

// export type ArenaHostingActionResult =
//     | {
//         success: true;
//         actionStatus: ArenaHostingActionStatus;
//         hosting: ArenaHosting;
//         receiptReference: string | null;
//         actionReference: string;
//     }
//     | ArenaBillingFailure;

// export type UnlockArenaInput = {
//     arenaId: string;
//     purchaserUserId: string;
//     now: string;
//     currentUnlock?: ArenaUnlock | null;
//     currentHosting?: ArenaHosting | null;
// };

// export type ActivateArenaHostingInput = {
//     arenaId: string;
//     tier: ArenaHostingTier;
//     now: string;
//     unlock: ArenaUnlock | null | undefined;
//     hosting?: ArenaHosting | null;
//     usage?: ArenaCapacityUsage;
// };

// export type PauseArenaHostingInput = {
//     arenaId: string;
//     now: string;
//     unlock: ArenaUnlock | null | undefined;
//     hosting: ArenaHosting | null | undefined;
//     hasUnresolvedContests?: boolean;
// };

// export type CancelArenaHostingPauseInput = Omit<
//     PauseArenaHostingInput,
//     "hasUnresolvedContests"
// >;

// export interface ArenaBillingAdapter {
//     unlockArena(input: UnlockArenaInput): ArenaUnlockActionResult;
//     activateHosting(input: ActivateArenaHostingInput): ArenaHostingActionResult;
//     pauseHosting(input: PauseArenaHostingInput): ArenaHostingActionResult;
//     cancelHostingPause(input: CancelArenaHostingPauseInput): ArenaHostingActionResult;
//     reactivateHosting(input: ActivateArenaHostingInput): ArenaHostingActionResult;
// }

// const failure = (code: ArenaBillingFailureCode, error: string): ArenaBillingFailure => ({
//     success: false,
//     code,
//     error,
// });

// const validateArenaRecordIds = (
//     arenaId: string,
//     unlock?: ArenaUnlock | null,
//     hosting?: ArenaHosting | null,
// ): ArenaBillingFailure | null => {
//     if (!arenaId.trim()) return failure("arena_required", "An Arena is required.");
//     if ((unlock && unlock.arenaId !== arenaId) || (hosting && hosting.arenaId !== arenaId)) {
//         return failure("arena_mismatch", "Arena billing records do not match this Arena.");
//     }
//     return null;
// };

// const validateUnlockedArena = (
//     arenaId: string,
//     unlock?: ArenaUnlock | null,
//     hosting?: ArenaHosting | null,
// ): ArenaBillingFailure | null => {
//     const recordFailure = validateArenaRecordIds(arenaId, unlock, hosting);
//     if (recordFailure) return recordFailure;
//     if (!unlock || unlock.status !== "unlocked" || !unlock.permanent) {
//         return failure("arena_locked", "Permanently unlock this Arena before managing hosting.");
//     }
//     return null;
// };

// const buildActiveHosting = ({
//     arenaId,
//     tier,
//     now,
//     unlock,
//     hosting,
//     reference,
// }: {
//     arenaId: string;
//     tier: ArenaSelfServiceHostingTier;
//     now: string;
//     unlock: ArenaUnlock;
//     hosting?: ArenaHosting | null;
//     reference: string;
// }): ArenaHosting => {
//     const periodEndsAt = addOneUtcCalendarMonth(now);
//     return {
//         arenaId,
//         tier,
//         status: "active",
//         limits: getArenaHostingLimits(tier),
//         billingMode: "simulated",
//         monthlyAmountCents: getArenaHostingOffer(tier).amountCents,
//         simulatedPaymentReference: reference,
//         activatedAt: now,
//         scheduledTier: null,
//         periodStartsAt: now,
//         periodEndsAt,
//         paidThroughAt: periodEndsAt,
//         includedMonthStartsAt: hosting?.includedMonthStartsAt ?? unlock.unlockedAt,
//         includedMonthEndsAt:
//             hosting?.includedMonthEndsAt ??
//             (unlock.unlockedAt ? addOneUtcCalendarMonth(unlock.unlockedAt) : null),
//         includedMonthConsumed: true,
//         pauseScheduledFor: null,
//         cleanupStartedAt: null,
//         pausedAt: null,
//         updatedAt: now,
//     };
// };

// const hostingActionReference = (
//     action: "pause" | "cancel-pause",
//     arenaId: string,
//     effectiveAt: string,
// ) =>
//     `sim-arena-hosting-${referenceToken(arenaId)}-${action}-${dateReferenceToken(effectiveAt)}`;

// /** Pure local billing simulator. It keeps no memory and never calls a vendor or network. */
// export class MockArenaBillingAdapter implements ArenaBillingAdapter {
//     unlockArena(input: UnlockArenaInput): ArenaUnlockActionResult {
//         const recordFailure = validateArenaRecordIds(
//             input.arenaId,
//             input.currentUnlock,
//             input.currentHosting,
//         );
//         if (recordFailure) return recordFailure;
//         if (!input.purchaserUserId.trim()) {
//             return failure("purchaser_required", "A purchaser is required to unlock this Arena.");
//         }
//         const now = validIsoDateTime(input.now);
//         if (!now) return failure("invalid_time", "A valid unlock time is required.");

//         if (input.currentUnlock?.status === "unlocked") {
//             return {
//                 success: true,
//                 actionStatus: "already_unlocked",
//                 unlock: input.currentUnlock,
//                 hosting: input.currentHosting ?? null,
//                 receiptReference: input.currentUnlock.simulatedPaymentReference,
//             };
//         }

//         const includedMonth = getArenaIncludedMonthDates(now);
//         const receiptReference = buildArenaUnlockReference(input.arenaId);
//         const unlock: ArenaUnlock = {
//             arenaId: input.arenaId,
//             status: "unlocked",
//             permanent: true,
//             source: "simulated_purchase",
//             amountCents: ARENA_UNLOCK_OFFER.amountCents,
//             currency: ARENA_UNLOCK_OFFER.currency,
//             purchasedByUserId: input.purchaserUserId,
//             unlockedAt: now,
//             simulatedPaymentReference: receiptReference,
//             // "Consumed" is the one-time grant marker, not an expiration marker.
//             includedMonthConsumed: true,
//             includedMonthConsumedAt: now,
//         };
//         const hosting: ArenaHosting = {
//             arenaId: input.arenaId,
//             tier: "arena_50",
//             status: "included_month",
//             limits: getArenaHostingLimits("arena_50"),
//             billingMode: "simulated",
//             monthlyAmountCents: 0,
//             simulatedPaymentReference: null,
//             activatedAt: now,
//             scheduledTier: null,
//             periodStartsAt: includedMonth.startsAt,
//             periodEndsAt: includedMonth.endsAt,
//             paidThroughAt: includedMonth.endsAt,
//             includedMonthStartsAt: includedMonth.startsAt,
//             includedMonthEndsAt: includedMonth.endsAt,
//             includedMonthConsumed: true,
//             pauseScheduledFor: null,
//             cleanupStartedAt: null,
//             pausedAt: null,
//             updatedAt: now,
//         };

//         return {
//             success: true,
//             actionStatus: "unlocked",
//             unlock,
//             hosting,
//             receiptReference,
//         };
//     }

//     activateHosting(input: ActivateArenaHostingInput): ArenaHostingActionResult {
//         const unlockedFailure = validateUnlockedArena(input.arenaId, input.unlock, input.hosting);
//         if (unlockedFailure) return unlockedFailure;
//         const now = validIsoDateTime(input.now);
//         if (!now) return failure("invalid_time", "A valid hosting activation time is required.");
//         const offer = getArenaHostingOffer(input.tier);
//         if (offer.contactOnly) {
//             return failure(
//                 "custom_contact_required",
//                 "Arena Custom is contact-only and cannot be activated automatically.",
//             );
//         }
//         const usage = normalizedUsage(input.usage);
//         const blockers = getArenaCapacityBlockers(usage, offer.limits);
//         if (blockers.length > 0) {
//             return failure("capacity_exceeded", blockers.map((blocker) => blocker.message).join(" "));
//         }

//         if (
//             input.hosting?.tier === input.tier &&
//             isOperatingStatus(input.hosting.status) &&
//             input.hosting.status !== "pause_scheduled"
//         ) {
//             return {
//                 success: true,
//                 actionStatus: "already_active",
//                 hosting: input.hosting,
//                 receiptReference: input.hosting.simulatedPaymentReference,
//                 actionReference:
//                     input.hosting.simulatedPaymentReference ??
//                     buildArenaHostingReference({
//                         arenaId: input.arenaId,
//                         action: "activate",
//                         tier: input.tier as ArenaSelfServiceHostingTier,
//                         effectiveAt: input.hosting.activatedAt ?? now,
//                     }),
//             };
//         }

//         const action: ArenaHostingReferenceAction = input.hosting?.tier ? "change" : "activate";
//         const receiptReference = buildArenaHostingReference({
//             arenaId: input.arenaId,
//             action,
//             tier: input.tier as ArenaSelfServiceHostingTier,
//             effectiveAt: now,
//         });
//         const hosting = buildActiveHosting({
//             arenaId: input.arenaId,
//             tier: input.tier as ArenaSelfServiceHostingTier,
//             now,
//             unlock: input.unlock as ArenaUnlock,
//             hosting: input.hosting,
//             reference: receiptReference,
//         });
//         return {
//             success: true,
//             actionStatus: input.hosting?.tier ? "changed_tier" : "activated",
//             hosting,
//             receiptReference,
//             actionReference: receiptReference,
//         };
//     }

//     pauseHosting(input: PauseArenaHostingInput): ArenaHostingActionResult {
//         const unlockedFailure = validateUnlockedArena(input.arenaId, input.unlock, input.hosting);
//         if (unlockedFailure) return unlockedFailure;
//         if (!input.hosting) return failure("hosting_required", "Arena hosting was not found.");
//         const now = validIsoDateTime(input.now);
//         if (!now) return failure("invalid_time", "A valid pause time is required.");

//         if (input.hosting.status === "paused") {
//             return {
//                 success: true,
//                 actionStatus: "already_paused",
//                 hosting: input.hosting,
//                 receiptReference: null,
//                 actionReference: hostingActionReference(
//                     "pause",
//                     input.arenaId,
//                     input.hosting.pausedAt ?? now,
//                 ),
//             };
//         }
//         if (input.hosting.status === "pause_scheduled") {
//             return {
//                 success: true,
//                 actionStatus: "already_scheduled",
//                 hosting: input.hosting,
//                 receiptReference: null,
//                 actionReference: hostingActionReference(
//                     "pause",
//                     input.arenaId,
//                     input.hosting.pauseScheduledFor ?? now,
//                 ),
//             };
//         }
//         if (!isOperatingStatus(input.hosting.status)) {
//             return failure("hosting_not_active", "Only active Arena hosting can be paused.");
//         }

//         const periodEnd = validIsoDateTime(
//             input.hosting.paidThroughAt ??
//             input.hosting.periodEndsAt ??
//             input.hosting.includedMonthEndsAt ??
//             now,
//         ) ?? now;
//         const pauseIsDue = Date.parse(periodEnd) <= Date.parse(now);
//         const nextStatus: ArenaHostingStatus = pauseIsDue
//             ? input.hasUnresolvedContests
//                 ? "cleanup"
//                 : "paused"
//             : "pause_scheduled";
//         const hosting: ArenaHosting = {
//             ...input.hosting,
//             status: nextStatus,
//             pauseScheduledFor: nextStatus === "pause_scheduled" ? periodEnd : null,
//             cleanupStartedAt: nextStatus === "cleanup" ? now : input.hosting.cleanupStartedAt,
//             pausedAt: nextStatus === "paused" ? now : null,
//             scheduledTier: null,
//             updatedAt: now,
//         };
//         return {
//             success: true,
//             actionStatus:
//                 nextStatus === "pause_scheduled"
//                     ? "pause_scheduled"
//                     : nextStatus === "cleanup"
//                         ? "cleanup"
//                         : "paused",
//             hosting,
//             receiptReference: null,
//             actionReference: hostingActionReference("pause", input.arenaId, periodEnd),
//         };
//     }

//     cancelHostingPause(input: CancelArenaHostingPauseInput): ArenaHostingActionResult {
//         const unlockedFailure = validateUnlockedArena(input.arenaId, input.unlock, input.hosting);
//         if (unlockedFailure) return unlockedFailure;
//         if (!input.hosting) return failure("hosting_required", "Arena hosting was not found.");
//         const now = validIsoDateTime(input.now);
//         if (!now) return failure("invalid_time", "A valid cancellation time is required.");
//         if (input.hosting.status !== "pause_scheduled") {
//             if (isOperatingStatus(input.hosting.status)) {
//                 return {
//                     success: true,
//                     actionStatus: "already_active",
//                     hosting: input.hosting,
//                     receiptReference: null,
//                     actionReference: hostingActionReference("cancel-pause", input.arenaId, now),
//                 };
//             }
//             return failure("hosting_not_active", "There is no scheduled hosting pause to cancel.");
//         }

//         const scheduledFor = input.hosting.pauseScheduledFor ?? now;
//         const resumesIncludedMonth =
//             input.hosting.monthlyAmountCents === 0 &&
//             input.hosting.includedMonthEndsAt !== null &&
//             Date.parse(now) < Date.parse(input.hosting.includedMonthEndsAt);
//         const hosting: ArenaHosting = {
//             ...input.hosting,
//             status: resumesIncludedMonth ? "included_month" : "active",
//             pauseScheduledFor: null,
//             updatedAt: now,
//         };
//         return {
//             success: true,
//             actionStatus: "pause_canceled",
//             hosting,
//             receiptReference: null,
//             actionReference: hostingActionReference("cancel-pause", input.arenaId, scheduledFor),
//         };
//     }

//     reactivateHosting(input: ActivateArenaHostingInput): ArenaHostingActionResult {
//         const unlockedFailure = validateUnlockedArena(input.arenaId, input.unlock, input.hosting);
//         if (unlockedFailure) return unlockedFailure;
//         const now = validIsoDateTime(input.now);
//         if (!now) return failure("invalid_time", "A valid reactivation time is required.");
//         if (input.hosting?.status === "cleanup") {
//             return failure(
//                 "cleanup_required",
//                 "Finish or cancel unresolved contests before reactivating this Arena.",
//             );
//         }
//         if (
//             input.hosting?.tier === input.tier &&
//             (input.hosting.status === "active" || input.hosting.status === "included_month")
//         ) {
//             return {
//                 success: true,
//                 actionStatus: "already_active",
//                 hosting: input.hosting,
//                 receiptReference: input.hosting.simulatedPaymentReference,
//                 actionReference:
//                     input.hosting.simulatedPaymentReference ??
//                     buildArenaHostingReference({
//                         arenaId: input.arenaId,
//                         action: "reactivate",
//                         tier: input.tier as ArenaSelfServiceHostingTier,
//                         effectiveAt: input.hosting.activatedAt ?? now,
//                     }),
//             };
//         }
//         if (input.hosting?.status === "pause_scheduled" && input.hosting.tier === input.tier) {
//             const canceled = this.cancelHostingPause({
//                 arenaId: input.arenaId,
//                 now,
//                 unlock: input.unlock,
//                 hosting: input.hosting,
//             });
//             return canceled.success
//                 ? { ...canceled, actionStatus: "reactivated" }
//                 : canceled;
//         }
//         const offer = getArenaHostingOffer(input.tier);
//         if (offer.contactOnly) {
//             return failure(
//                 "custom_contact_required",
//                 "Arena Custom is contact-only and cannot be reactivated automatically.",
//             );
//         }
//         const usage = normalizedUsage(input.usage);
//         const blockers = getArenaCapacityBlockers(usage, offer.limits);
//         if (blockers.length > 0) {
//             return failure("capacity_exceeded", blockers.map((blocker) => blocker.message).join(" "));
//         }
//         const receiptReference = buildArenaHostingReference({
//             arenaId: input.arenaId,
//             action: "reactivate",
//             tier: input.tier as ArenaSelfServiceHostingTier,
//             effectiveAt: now,
//         });
//         const hosting = buildActiveHosting({
//             arenaId: input.arenaId,
//             tier: input.tier as ArenaSelfServiceHostingTier,
//             now,
//             unlock: input.unlock as ArenaUnlock,
//             hosting: input.hosting,
//             reference: receiptReference,
//         });
//         return {
//             success: true,
//             actionStatus: "reactivated",
//             hosting,
//             receiptReference,
//             actionReference: receiptReference,
//         };
//     }
// }

// export const mockArenaBillingAdapter = new MockArenaBillingAdapter();
