import {
    buildCommunityPointDedupeKey,
    type CommunityContext,
    type CommunityPick,
    type CommunityPointClaim,
    type DomainDecision,
    type PickVersion,
    type StructuredPickStatus,
} from "@/lib/domain/community";

export const COMMUNITY_PICK_LIMIT = 3;
export const COMMUNITY_PICK_WINDOW_MS = 24 * 60 * 60 * 1_000;

export type FeedContextRole =
    | "arena_owner"
    | "arena_manager"
    | "arena_member"
    | "league_commissioner"
    | "league_member";

/** State resolves legacy League and canonical Arena membership into this boundary. */
export interface FeedContextMembership {
    context: CommunityContext;
    userId: string;
    status: "active" | "inactive";
    role: FeedContextRole;
}

const allow = (): DomainDecision => ({ allowed: true });
const deny = (code: string, reason: string): DomainDecision => ({ allowed: false, code, reason });

export function getCommunityContextKey(context: CommunityContext): string {
    return context.type === "arena"
        ? `arena:${context.arenaId}`
        : `league:${context.leagueId}`;
}

export function areCommunityContextsEqual(
    left: CommunityContext,
    right: CommunityContext,
): boolean {
    return getCommunityContextKey(left) === getCommunityContextKey(right);
}

function validateActiveContextMembership(input: {
    context: CommunityContext;
    userId: string;
    membership: FeedContextMembership | null;
}): DomainDecision {
    const { membership } = input;
    if (
        !membership ||
        membership.status !== "active" ||
        membership.userId !== input.userId ||
        !areCommunityContextsEqual(membership.context, input.context)
    ) {
        return deny(
            "active_context_membership_required",
            "An active membership in this community is required.",
        );
    }
    const roleMatchesContext =
        input.context.type === "arena"
            ? membership.role.startsWith("arena_")
            : membership.role.startsWith("league_");
    return roleMatchesContext
        ? allow()
        : deny("context_role_mismatch", "This membership role does not match the community.");
}

export interface CommunityPickPostingWindow {
    limit: typeof COMMUNITY_PICK_LIMIT;
    used: number;
    remaining: number;
    windowStartsAt: string;
    nextSlotAt: string | null;
    countingPickIds: string[];
}

/**
 * Counts only Community Picks by the same user in the same context. Deleted
 * picks remain in the window; Competitive Picks are structurally excluded.
 * A pick exactly 24 hours old has expired and no longer consumes a slot.
 */
export function getCommunityPickPostingWindow(input: {
    communityPicks: readonly CommunityPick[];
    userId: string;
    context: CommunityContext;
    now: string;
}): CommunityPickPostingWindow {
    const nowMs = Date.parse(input.now);
    if (!Number.isFinite(nowMs)) throw new RangeError("now must be a valid timestamp.");
    const windowStartsMs = nowMs - COMMUNITY_PICK_WINDOW_MS;
    const countingPicks = input.communityPicks
        .filter((pick) => {
            if (pick.userId !== input.userId || !areCommunityContextsEqual(pick.context, input.context)) {
                return false;
            }
            const postedAt = Date.parse(pick.postingWindowStartedAt);
            return Number.isFinite(postedAt) && postedAt > windowStartsMs && postedAt <= nowMs;
        })
        .sort(
            (left, right) =>
                Date.parse(left.postingWindowStartedAt) - Date.parse(right.postingWindowStartedAt),
        );
    const used = countingPicks.length;
    return {
        limit: COMMUNITY_PICK_LIMIT,
        used,
        remaining: Math.max(0, COMMUNITY_PICK_LIMIT - used),
        windowStartsAt: new Date(windowStartsMs).toISOString(),
        nextSlotAt:
            used >= COMMUNITY_PICK_LIMIT
                ? new Date(
                    Date.parse(countingPicks[0].postingWindowStartedAt) + COMMUNITY_PICK_WINDOW_MS,
                ).toISOString()
                : null,
        countingPickIds: countingPicks.map((pick) => pick.id),
    };
}

export function canCreateCommunityPick(input: {
    communityPicks: readonly CommunityPick[];
    userId: string;
    context: CommunityContext;
    membership: FeedContextMembership | null;
    now: string;
}): DomainDecision {
    const membershipDecision = validateActiveContextMembership(input);
    if (!membershipDecision.allowed) return membershipDecision;
    const role = input.membership?.role;
    if (input.context.type === "arena" && role !== "arena_member") {
        return deny(
            "arena_staff_use_staff_pick",
            "Arena owners and managers must use a noncompetitive Staff Pick.",
        );
    }
    if (
        input.context.type === "league_feed" &&
        role !== "league_member" &&
        role !== "league_commissioner"
    ) {
        return deny("league_pick_role_required", "This League role cannot create Community Picks.");
    }
    let window: CommunityPickPostingWindow;
    try {
        window = getCommunityPickPostingWindow(input);
    } catch {
        return deny("invalid_timestamp", "A valid posting timestamp is required.");
    }
    return window.remaining > 0
        ? allow()
        : deny(
            "community_pick_limit_reached",
            `Three Community Picks are allowed per community in each rolling 24-hour period. The next slot opens at ${window.nextSlotAt}.`,
        );
}

export function canCreateStaffFeedPost(input: {
    userId: string;
    context: CommunityContext;
    membership: FeedContextMembership | null;
}): DomainDecision {
    const membershipDecision = validateActiveContextMembership(input);
    if (!membershipDecision.allowed) return membershipDecision;
    const role = input.membership?.role;
    const allowed =
        input.context.type === "arena"
            ? role === "arena_owner" || role === "arena_manager"
            : role === "league_commissioner";
    return allowed
        ? allow()
        : deny("staff_role_required", "Only community staff can create staff posts.");
}

export function canCreateCompetitivePick(input: {
    userId: string;
    context: CommunityContext;
    membership: FeedContextMembership | null;
}): DomainDecision {
    const membershipDecision = validateActiveContextMembership(input);
    if (!membershipDecision.allowed) return membershipDecision;
    const role = input.membership?.role;
    if (input.context.type === "arena") {
        return role === "arena_member"
            ? allow()
            : deny(
                "arena_staff_noncompetitive",
                "Arena owners and managers cannot submit Competitive Picks.",
            );
    }
    return role === "league_member" || role === "league_commissioner"
        ? allow()
        : deny("league_pick_role_required", "This League role cannot submit Competitive Picks.");
}

export function canReplaceStructuredPick(input: {
    actorUserId: string;
    pickUserId: string;
    pickStatus: StructuredPickStatus;
    currentVersion: PickVersion | null;
    locksAt: string;
    now: string;
}): DomainDecision {
    if (input.actorUserId !== input.pickUserId) {
        return deny("pick_owner_required", "Only the submitter can replace this pick.");
    }
    if (!input.currentVersion) {
        return deny("current_pick_version_required", "The current accepted version is missing.");
    }
    if (input.pickStatus !== "submitted") {
        return deny("pick_not_replaceable", "Only a submitted, unlocked pick can be replaced.");
    }
    const now = Date.parse(input.now);
    const locksAt = Date.parse(input.locksAt);
    if (!Number.isFinite(now) || !Number.isFinite(locksAt)) {
        return deny("invalid_timestamp", "Valid current and lock timestamps are required.");
    }
    return now < locksAt
        ? allow()
        : deny("pick_locked", "This pick is locked and can no longer be replaced.");
}

export function canonicalizeSelectionIdentityKeys(
    selectionIdentityKeys: readonly string[],
): string[] {
    return Array.from(
        new Set(
            selectionIdentityKeys
                .map((identity) => identity.trim().toLowerCase())
                .filter(Boolean),
        ),
    ).sort();
}

export interface CommunityPointClaimCandidate {
    userId: string;
    context: CommunityContext;
    sourceRecordId: string;
    selectionIdentityKeys: readonly string[];
}

export interface CommunityPointClaimConflict {
    claim: CommunityPointClaim;
    duplicateSelectionIdentityKeys: string[];
}

const RESERVING_CLAIM_STATUSES: ReadonlySet<CommunityPointClaim["status"]> = new Set([
    "pending",
    "accepted",
    "reversed",
]);

/** Detects overlap, not just an identical combo set, so a combo cannot reclaim a settled leg. */
export function findCommunityPointClaimConflict(input: {
    claims: readonly CommunityPointClaim[];
    candidate: CommunityPointClaimCandidate;
}): CommunityPointClaimConflict | null {
    const candidateKeys = new Set(
        canonicalizeSelectionIdentityKeys(input.candidate.selectionIdentityKeys),
    );
    for (const claim of input.claims) {
        if (
            claim.userId !== input.candidate.userId ||
            claim.sourceRecordId === input.candidate.sourceRecordId ||
            !areCommunityContextsEqual(claim.context, input.candidate.context) ||
            !RESERVING_CLAIM_STATUSES.has(claim.status)
        ) {
            continue;
        }
        const duplicateSelectionIdentityKeys = canonicalizeSelectionIdentityKeys(
            claim.selectionIdentityKeys,
        ).filter((identity) => candidateKeys.has(identity));
        if (duplicateSelectionIdentityKeys.length > 0) {
            return { claim, duplicateSelectionIdentityKeys };
        }
    }
    return null;
}

export type CommunityPointClaimIdentityResolution =
    | {
        kind: "available";
        dedupeKey: string;
        selectionIdentityKeys: string[];
    }
    | {
        kind: "existing";
        dedupeKey: string;
        selectionIdentityKeys: string[];
        claim: CommunityPointClaim;
    }
    | {
        kind: "duplicate";
        dedupeKey: string;
        selectionIdentityKeys: string[];
        duplicateOfClaimId: string;
        duplicateSelectionIdentityKeys: string[];
    };

/**
 * Resolves retries idempotently by source record, then checks every selection
 * identity against claims in the same user+community boundary.
 */
export function resolveCommunityPointClaimIdentity(input: {
    claims: readonly CommunityPointClaim[];
    candidate: CommunityPointClaimCandidate;
}): CommunityPointClaimIdentityResolution {
    const selectionIdentityKeys = canonicalizeSelectionIdentityKeys(
        input.candidate.selectionIdentityKeys,
    );
    const dedupeKey = buildCommunityPointDedupeKey({
        userId: input.candidate.userId,
        context: input.candidate.context,
        selectionIdentityKeys,
    });
    const existing = input.claims.find(
        (claim) =>
            claim.userId === input.candidate.userId &&
            claim.sourceRecordId === input.candidate.sourceRecordId &&
            areCommunityContextsEqual(claim.context, input.candidate.context) &&
            canonicalizeSelectionIdentityKeys(claim.selectionIdentityKeys).join("|") ===
            selectionIdentityKeys.join("|"),
    );
    if (existing) {
        return { kind: "existing", dedupeKey, selectionIdentityKeys, claim: existing };
    }
    const conflict = findCommunityPointClaimConflict(input);
    if (conflict) {
        return {
            kind: "duplicate",
            dedupeKey,
            selectionIdentityKeys,
            duplicateOfClaimId: conflict.claim.id,
            duplicateSelectionIdentityKeys: conflict.duplicateSelectionIdentityKeys,
        };
    }
    return { kind: "available", dedupeKey, selectionIdentityKeys };
}

