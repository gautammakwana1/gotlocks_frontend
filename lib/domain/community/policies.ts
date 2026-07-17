import type {
    ArenaMembership,
    ArenaOwnershipTransfer,
    CompetitivePick,
    ContestLifecycleStatus,
    PickVersion,
    StructuredFeedContest,
} from "./types";

export type DomainDecision =
    | { allowed: true }
    | { allowed: false; code: string; reason: string };

const allow = (): DomainDecision => ({ allowed: true });
const deny = (code: string, reason: string): DomainDecision => ({ allowed: false, code, reason });

/**
 * Ownership is Arena-bound, not Pro-bound. The recipient must be the accepting
 * actor, remain an active member of this Arena, and have no unresolved contest
 * conflict. Personal plan is intentionally absent from the input.
 */
export function canAcceptArenaOwnershipTransfer(input: {
    transfer: ArenaOwnershipTransfer;
    actorUserId: string;
    recipientMembership: ArenaMembership | null;
    currentBlockingContestIds?: readonly string[];
    now: string;
}): DomainDecision {
    const { transfer, actorUserId, recipientMembership } = input;
    if (transfer.status !== "pending") {
        return deny("transfer_not_pending", "This ownership transfer is no longer pending.");
    }
    if (transfer.toUserId !== actorUserId) {
        return deny("recipient_mismatch", "Only the invited recipient can accept ownership.");
    }
    if (transfer.expiresAt && Date.parse(input.now) >= Date.parse(transfer.expiresAt)) {
        return deny("transfer_expired", "This ownership transfer has expired.");
    }
    if (
        !recipientMembership ||
        recipientMembership.arenaId !== transfer.arenaId ||
        recipientMembership.userId !== transfer.toUserId ||
        recipientMembership.status !== "active"
    ) {
        return deny(
            "recipient_not_active_member",
            "The recipient must be an active member of this Arena.",
        );
    }
    const blockingContestIds = new Set([
        ...transfer.blockingContestIds,
        ...(input.currentBlockingContestIds ?? []),
    ]);
    if (blockingContestIds.size > 0) {
        return deny(
            "recipient_has_active_contest_entry",
            "Resolve or withdraw the recipient's active contest entries before transfer.",
        );
    }
    return allow();
}

const LOCKED_OR_LATER: readonly ContestLifecycleStatus[] = [
    "locked",
    "grading",
    "final",
    "canceled",
    "archived",
];

export function hasStructuredContestLocked(
    contest: StructuredFeedContest,
    now: string,
): boolean {
    return (
        LOCKED_OR_LATER.includes(contest.lifecycleStatus) ||
        Date.parse(now) >= Date.parse(contest.locksAt)
    );
}

/** The submitter can review their own entry; other viewers wait until contest lock. */
export function canViewCompetitivePickDetails(input: {
    pick: CompetitivePick;
    contest: StructuredFeedContest;
    viewerUserId: string;
    now: string;
}): boolean {
    if (input.viewerUserId === input.pick.userId) return true;
    return hasStructuredContestLocked(input.contest, input.now);
}

export interface CompetitivePickFeedView {
    id: string;
    contestId: string;
    userId: string;
    entryType: CompetitivePick["entryType"];
    status: CompetitivePick["status"];
    submittedAt: string;
    detailsState: "visible" | "hidden_until_lock";
    currentVersion: PickVersion | null;
}

/**
 * Produces a safe Feed projection so a component cannot accidentally reveal the
 * current version's selections or accepted price before lock.
 */
export function toCompetitivePickFeedView(input: {
    pick: CompetitivePick;
    contest: StructuredFeedContest;
    currentVersion: PickVersion | null;
    viewerUserId: string;
    now: string;
}): CompetitivePickFeedView {
    const detailsVisible = canViewCompetitivePickDetails(input);
    return {
        id: input.pick.id,
        contestId: input.pick.contestId,
        userId: input.pick.userId,
        entryType: input.pick.entryType,
        status: input.pick.status,
        submittedAt: input.pick.submittedAt,
        detailsState: detailsVisible ? "visible" : "hidden_until_lock",
        currentVersion: detailsVisible ? input.currentVersion : null,
    };
}

export function canChangeArenaTimeZone(
    contests: readonly StructuredFeedContest[],
): DomainDecision {
    const blocking = contests.some((contest) =>
        (["open", "locked", "grading"] as const).includes(
            contest.lifecycleStatus as "open" | "locked" | "grading",
        ),
    );
    return blocking
        ? deny(
            "active_contest_blocks_timezone_change",
            "Arena timezone cannot change while a contest is Open, Locked, or Grading.",
        )
        : allow();
}

export type StructuredReviewAuthority =
    | "platform_admin"
    | "league_commissioner"
    | "arena_owner"
    | "arena_manager";

/**
 * Encodes the League-commissioner participation exception without allowing
 * self-review. A platform/admin reviewer is the conflict-free fallback.
 */
export function canResolveStructuredReviewEntry(input: {
    contest: StructuredFeedContest;
    actorUserId: string;
    entrantUserId: string;
    authority: StructuredReviewAuthority;
}): DomainDecision {
    if (input.authority === "platform_admin") return allow();
    if (input.actorUserId === input.entrantUserId) {
        return deny(
            "self_review_requires_platform_admin",
            "An organizer cannot resolve a review involving their own entry.",
        );
    }
    if (input.contest.context.type === "league_feed") {
        return input.authority === "league_commissioner"
            ? allow()
            : deny(
                "league_review_requires_commissioner",
                "A League Feed review requires its commissioner or a platform reviewer.",
            );
    }
    return input.authority === "arena_owner" || input.authority === "arena_manager"
        ? allow()
        : deny(
            "arena_review_requires_staff",
            "An Arena review requires an owner, manager, or platform reviewer.",
        );
}
