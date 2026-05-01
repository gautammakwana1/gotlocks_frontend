import { ArchiveLeaderboardSlip, Pick, PickResult, Slip, SlipConflictWarningMode } from "../interfaces/interfaces";

export type SlipLike = Slip | ArchiveLeaderboardSlip;

export const normalizePickResult = (
    result: PickResult | null | undefined
): NonNullable<PickResult> => (result ?? "pending") as NonNullable<PickResult>;

export const isPickResultPending = (result: PickResult | null | undefined) =>
    normalizePickResult(result) === "pending";

const getSlipDeadlineTime = (slip: SlipLike): number | null => {
    const timestamp = new Date(slip.pick_deadline_at).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

export const isSlipFinal = (slip?: SlipLike | null): boolean =>
    Boolean(slip && slip.status === "final");

export const getSlipConflictWarningMode = (
    slip?: Slip | ArchiveLeaderboardSlip | null
): SlipConflictWarningMode => slip?.conflict_warning_mode ?? "group_combo";

export const slipShowsConflictWarnings = (slip?: Slip | null): boolean =>
    getSlipConflictWarningMode(slip) === "group_combo";

export const isSlipTimeLocked = (slip?: SlipLike | null, now = Date.now()): boolean => {
    if (!slip || isSlipFinal(slip)) return false;
    const deadline = getSlipDeadlineTime(slip);
    if (deadline === null) return false;
    return now >= deadline;
};

export const canUserEditSlipPicks = (
    slip?: SlipLike | null,
    now = Date.now()
): boolean => Boolean(slip && !isSlipFinal(slip) && !isSlipTimeLocked(slip, now));

export const canCommissionerReview = (
    slip?: SlipLike | null,
    now = Date.now()
): boolean => Boolean(slip && !isSlipFinal(slip) && isSlipTimeLocked(slip, now));

export const hasAutoGraded = (slip?: SlipLike | null): boolean =>
    Boolean((slip as Slip)?.graded_at);

export const areAllPicksResolved = (picks?: Pick[]): boolean => {
    if (!picks?.length) return false;
    return picks.every((pick) => !isPickResultPending(pick.result));
};

export const canFinalize = (
    slip?: Slip | null,
    options?: {
        isCommissioner?: boolean;
        now?: number;
        picks?: Pick[];
    }
): boolean => {
    if (!slip) return false;
    const isCommissioner = options?.isCommissioner ?? false;
    if (!isCommissioner) return false;
    const now = options?.now ?? Date.now();
    if (isSlipFinal(slip) || !isSlipTimeLocked(slip, now)) return false;
    return hasAutoGraded(slip) || areAllPicksResolved(options?.picks);
};
