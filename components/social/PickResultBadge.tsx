import { PICK_RESULT_BADGE_TONES } from "@/lib/styles/postCards";
import type { PickResult } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * The settled-result chip a feed post wears, ported from the MVP's
 * components/social/PickResultBadge.tsx.
 *
 * A pending pick renders NOTHING rather than a "pending" chip: every unsettled
 * post would carry one, which makes the chip noise instead of a signal.
 * -------------------------------------------------------------------------- */

const RESULT_LABELS: Record<string, string> = {
    win: "win",
    loss: "loss",
    void: "void",
    not_found: "n/a",
};

export type PickResultBadgeProps = {
    result: PickResult | null | undefined;
    className?: string;
};

export const PickResultBadge = ({ result, className = "" }: PickResultBadgeProps) => {
    if (!result || result === "pending") return null;
    const tone =
        PICK_RESULT_BADGE_TONES[result as keyof typeof PICK_RESULT_BADGE_TONES];
    if (!tone) return null;

    return (
        <span
            data-pick-result-badge
            data-pick-result-state={result}
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold normal-case tracking-wide ${tone} ${className}`.trim()}
        >
            {RESULT_LABELS[result] ?? result}
        </span>
    );
};

export default PickResultBadge;
