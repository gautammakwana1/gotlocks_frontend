import {
    formatTierPrimary,
    getGroupTierColor,
    getGroupTierName,
    type TierMeta,
} from "@/lib/utils/scoring";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";

export type ReviewSheetTierDisplayMode = "default" | "group";

type FormatReviewSheetTierLineArgs = {
    tierMeta?: TierMeta | null;
    fallbackPrimary?: string | null;
    fallbackName?: string | null;
    points?: number | null;
    includeName?: boolean;
    mode?: ReviewSheetTierDisplayMode;
};

const normalizeTierLabel = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

export const getReviewSheetTierName = ({
    tierMeta,
    fallbackName,
    mode = "default",
}: {
    tierMeta?: TierMeta | null;
    fallbackName?: string | null;
    mode?: ReviewSheetTierDisplayMode;
}) => {
    const normalizedFallback = normalizeTierLabel(fallbackName);
    if (!tierMeta) return normalizedFallback;
    if (mode === "group") {
        return getGroupTierName(tierMeta.tier, normalizedFallback ?? tierMeta.name);
    }
    return normalizedFallback ?? tierMeta.name;
};

export const formatReviewSheetTierLine = ({
    tierMeta,
    fallbackPrimary,
    fallbackName,
    points,
    includeName = true,
    mode = "default",
}: FormatReviewSheetTierLineArgs) => {
    const primary =
        tierMeta?.tier !== undefined
            ? formatTierPrimary(tierMeta.tier)
            : normalizeTierLabel(fallbackPrimary) ?? "Tier —";
    const resolvedPoints =
        typeof points === "number" ? points : typeof tierMeta?.points === "number" ? tierMeta.points : null;
    const resolvedName = includeName
        ? getReviewSheetTierName({ tierMeta, fallbackName, mode })
        : null;

    if (mode === "group") {
        const parts: string[] = [];
        if (resolvedName && resolvedName !== "—") {
            parts.push(resolvedName);
        }
        if (typeof resolvedPoints === "number") {
            parts.push(`${resolvedPoints} pts`);
        }
        return parts.length > 0 ? parts.join(" · ") : "—";
    }

    const parts = [primary];
    if (typeof resolvedPoints === "number") {
        parts.push(`${resolvedPoints} pts`);
    }
    if (resolvedName && resolvedName !== "—") {
        parts.push(resolvedName);
    }

    return parts.join(" · ");
};

export const resolveReviewSheetTierCardAppearance = (
    tierMeta?: TierMeta | null,
    mode: ReviewSheetTierDisplayMode = "default"
) =>
    resolveTierCardAppearance(
        mode === "group" && tierMeta ? getGroupTierColor(tierMeta.tier) : tierMeta?.color
    );
