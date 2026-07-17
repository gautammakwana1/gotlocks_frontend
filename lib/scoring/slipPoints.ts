export const SLIP_WIN_POINTS_CAP = 60;
export const SLIP_LOSS_POINTS = -15;

export type SlipPointResult =
    | "pending"
    | "win"
    | "loss"
    | "void"
    | "not_found";

export type CalculateSlipPointsInput = {
    result: SlipPointResult;
    baseWinPoints: number;
    awardedPoints?: number | null;
};

/**
 * Calculates traditional League Slip Points.
 *
 * The finite review override intentionally takes precedence over the bounded
 * default. This preserves the existing commissioner review behavior while
 * keeping Slip Points separate from uncapped contextual points.
 */
export const calculateSlipPoints = ({
    result,
    baseWinPoints,
    awardedPoints,
}: CalculateSlipPointsInput): number => {
    if (typeof awardedPoints === "number" && Number.isFinite(awardedPoints)) {
        return awardedPoints;
    }

    if (result === "win") {
        return Math.min(Math.max(0, baseWinPoints), SLIP_WIN_POINTS_CAP);
    }

    if (result === "loss") {
        return SLIP_LOSS_POINTS;
    }

    return 0;
};
