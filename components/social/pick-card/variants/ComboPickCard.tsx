"use client";

import { formatDateTime } from "@/lib/utils/date";
import { extractMatchup, extractPickLine } from "@/lib/utils/pickDescription";
import { FEED_DESKTOP_SIZING as SZ } from "../../feedDesktopSizing";
import PickCardShell from "../PickCardShell";
import {
    META_SEPARATOR,
    PLACEHOLDER,
    buildPickCardModel,
    getComboLegVisualState,
    getSelectionVisualTone,
    resolveLegCategoryLabel,
    type PickCardModel,
} from "../pickCardModel";
import type { PickCardBaseProps } from "../types";

/* ----------------------------------------------------------------------------
 * A PARLAY — one priced combination that pays only if every leg lands, so the
 * legs read as a list under one card-level price.
 *
 * Used by ordinary combo posts AND by General Combo feed-contest entries; the
 * two differ only in the chrome the shell puts around them.
 *
 * Each leg is coloured by ITS OWN grade where the server sent one. A losing
 * combo only proves that at least one leg lost, so the legs it did not grade
 * stay neutral rather than all going red — which is what the previous card did,
 * and it made a 4-of-5 parlay look like a 0-of-5.
 * -------------------------------------------------------------------------- */

export const ComboLegList = ({
    model,
    entryOnly = false,
}: {
    model: PickCardModel;
    entryOnly?: boolean;
}) => (
    <ul className={`${entryOnly ? "" : "mt-3"} space-y-2 ${SZ.comboList}`}>
        {model.legs.map((leg, index) => {
            const legPickLine = extractPickLine(leg.description);
            const legMatchup =
                extractMatchup(leg.description, leg.selection?.matchup) ?? leg.matchup;
            const legTime = formatDateTime(leg.selection?.gameStartTime);
            const legMeta = [legMatchup, legTime !== PLACEHOLDER ? legTime : null]
                .filter(Boolean)
                .join(META_SEPARATOR);
            const legCategory = resolveLegCategoryLabel(leg.selection?.market);
            const legState = getComboLegVisualState(leg, model.result);
            const legTone = getSelectionVisualTone(legState);

            return (
                <li
                    key={`${leg.description}-${index}`}
                    data-pick-selection-state={legState}
                    data-feed-entry-selection={model.entryFormat}
                    className="flex items-start justify-between gap-3"
                >
                    <div className="min-w-0 flex items-start gap-2">
                        <span
                            className={`mt-2 h-1.5 w-1.5 rounded-full ${legTone.dot} ${SZ.selectionDot}`}
                        />
                        <div className="min-w-0">
                            {legCategory ? (
                                <span
                                    className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-400 ${SZ.categoryLabel}`}
                                >
                                    {legCategory}
                                </span>
                            ) : null}
                            <p
                                className={`min-w-0 text-[12px] font-semibold leading-snug ${legTone.text} ${SZ.pickCopy}`}
                            >
                                {legPickLine}
                            </p>
                            {legMeta ? (
                                <p className={`mt-1 text-[10px] text-slate-400 ${SZ.metadata}`}>
                                    {legMeta}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pt-2">
                        <span className={`text-[11px] font-semibold text-slate-100 ${SZ.odds}`}>
                            {leg.odds_bracket ?? PLACEHOLDER}
                        </span>
                    </div>
                </li>
            );
        })}
    </ul>
);

export const ComboPickCard = ({
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
            <ComboLegList model={model} entryOnly={entryOnly} />
        </PickCardShell>
    );
};

export default ComboPickCard;
