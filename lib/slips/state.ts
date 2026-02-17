import { Pick, PickResult, Slip } from "../interfaces/interfaces";


export const normalizePickResult = (
    result: PickResult | null | undefined
): NonNullable<PickResult> => (result ?? "pending") as NonNullable<PickResult>;

export const isPickResultPending = (result: PickResult | null | undefined) =>
    normalizePickResult(result) === "pending";

const getSlipDeadlineTime = (slip: Slip): number | null => {
    const timestamp = new Date(slip.pick_deadline_at).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

export const isSlipFinal = (slip?: Slip | null): boolean =>
    Boolean(slip && slip.status === "final");

export const isSlipTimeLocked = (slip?: Slip | null, now = Date.now()): boolean => {
    if (!slip || isSlipFinal(slip)) return false;
    const deadline = getSlipDeadlineTime(slip);
    if (deadline === null) return false;
    return now >= deadline;
};

export const canUserEditSlipPicks = (
    slip?: Slip | null,
    now = Date.now()
): boolean => Boolean(slip && !isSlipFinal(slip) && !isSlipTimeLocked(slip, now));

export const canCommissionerReview = (
    slip?: Slip | null,
    now = Date.now()
): boolean => Boolean(slip && !isSlipFinal(slip) && isSlipTimeLocked(slip, now));

export const hasAutoGraded = (slip?: Slip | null): boolean =>
    Boolean(slip?.graded_at);

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
