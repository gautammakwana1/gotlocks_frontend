"use client";

import { FEED_DESKTOP_SIZING as SZ } from "../../feedDesktopSizing";
import PickCardShell from "../PickCardShell";
import { buildPickCardModel, type PickCardModel } from "../pickCardModel";
import type { PickCardBaseProps } from "../types";

/* ----------------------------------------------------------------------------
 * ONE PICK — the card a single moneyline, spread, total or player prop renders.
 *
 * Also the card a Fantasy (Slip) contest entry renders when that entry is a
 * single pick rather than a combo: the difference between the two is the METRIC
 * RAIL (Fantasy Tier + Result instead of Points + Confidence), which the shell
 * already derives from the presentation, so the selection row itself is shared.
 * -------------------------------------------------------------------------- */

/** The selection row on its own, for a host that already has a model. */
export const SinglePickSelection = ({
    model,
    entryOnly = false,
}: {
    model: PickCardModel;
    entryOnly?: boolean;
}) => (
    <div
        data-pick-selection-state={model.singleSelectionState}
        className={`${entryOnly ? "" : "mt-3"} flex min-w-0 items-start justify-between gap-3 ${SZ.selectionRow}`}
    >
        <div className={`min-w-0 flex flex-1 items-start gap-2 ${SZ.selectionLead}`}>
            <span
                className={`mt-2 h-1.5 w-1.5 rounded-full ${model.singleSelectionTone.dot} ${SZ.selectionDot}`}
            />
            <div className="min-w-0 flex-1">
                {model.detailCategoryLabel ? (
                    <span
                        className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-400 ${SZ.categoryLabel}`}
                    >
                        {model.detailCategoryLabel}
                    </span>
                ) : null}
                <p
                    className={`mt-1 min-w-0 text-[12px] font-semibold leading-snug ${model.singleSelectionTone.text} ${SZ.pickCopy}`}
                    title={model.displayPick}
                >
                    {model.pickLine}
                </p>
                {model.metaLabel ? (
                    <p className={`mt-1 truncate text-[10px] text-slate-400 ${SZ.metadata}`}>
                        {model.metaLabel}
                    </p>
                ) : null}
            </div>
        </div>
        <div data-feed-post-odds className="flex shrink-0 flex-col items-end gap-1">
            <span className={`text-[11px] font-semibold text-slate-100 ${SZ.odds}`}>
                {model.oddsCopy}
            </span>
        </div>
    </div>
);

export const SinglePickCard = ({
    pick,
    collapsed = false,
    entryOnly = false,
    contextualPointsLabel,
    accent = "sky",
    includePostedAtPrefix = true,
    presentation = { kind: "ordinary" },
}: PickCardBaseProps) => {
    const model = buildPickCardModel({
        pick,
        presentation,
        contextualPointsLabel,
        accent,
        includePostedAtPrefix,
    });

    return (
        <PickCardShell model={model} collapsed={collapsed} entryOnly={entryOnly}>
            <SinglePickSelection model={model} entryOnly={entryOnly} />
        </PickCardShell>
    );
};

export default SinglePickCard;
