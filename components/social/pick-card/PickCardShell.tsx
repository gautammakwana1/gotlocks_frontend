"use client";

import type { ReactNode } from "react";
import { FEED_DESKTOP_SIZING as SZ } from "../feedDesktopSizing";
import ContestEntryHeader from "./ContestEntryHeader";
import PickCardMetrics from "./PickCardMetrics";
import type { PickCardModel } from "./pickCardModel";

/* ----------------------------------------------------------------------------
 * THE FRAME every Pick Card variant renders inside.
 *
 * The five variants differ ONLY in the selection region they hand in as
 * children. Everything around it — the metric rail, the accent-tinted header
 * band, the sport/timestamp footer, the collapsed summary — is identical, and
 * lives here so a General Combo entry and a TD Psychic entry in the same list
 * cannot end up with different chrome.
 *
 * THREE LAYOUTS, chosen by the card, not by the caller:
 *
 *   entryOnly   selections alone. What Standings expands to, where the row above
 *               already states rank, member and points.
 *   tally       Pick'em / TD Psychic. The selections take the full width and the
 *               metric rail drops beneath them as a two-up strip; five team tiles
 *               or three square scorer cards do not fit a 140px-narrower column.
 *   default     the side rail every single pick, combo and Fantasy entry uses.
 * -------------------------------------------------------------------------- */

export type PickCardShellProps = {
    model: PickCardModel;
    collapsed?: boolean;
    entryOnly?: boolean;
    /** The selection region — the one part each variant draws for itself. */
    children?: ReactNode;
    /** Rendered inside the primary card, below the selections (combo odds). */
    primaryFooter?: ReactNode;
};

const CollapsedSummary = ({ model }: { model: PickCardModel }) => {
    const collapsedMeta = model.footerLine;

    if (model.presentation.kind !== "ordinary") {
        return (
            <div
                data-feed-collapsed-summary="entry"
                className={`flex min-w-0 flex-col items-stretch gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] sm:flex-row sm:items-center sm:gap-3 ${SZ.footer}`}
            >
                <span data-feed-collapsed-title className="w-full min-w-0 sm:flex-1">
                    <ContestEntryHeader
                        presentation={model.presentation}
                        className="w-full text-[10px] leading-snug tracking-wide sm:w-auto"
                    />
                </span>
                <span
                    data-feed-collapsed-meta
                    className="flex w-full min-w-0 items-center justify-between gap-3 text-left sm:ml-auto sm:w-auto sm:shrink-0 sm:justify-end sm:text-right"
                >
                    <span className="min-w-0">{collapsedMeta}</span>
                    {model.entryTallyCopy ? (
                        <span
                            data-feed-entry-tally
                            data-feed-entry-tally-position="right"
                            aria-label={model.entryTallyAriaLabel}
                            className="shrink-0 text-[10px] font-semibold tabular-nums tracking-wide text-slate-100"
                        >
                            {model.entryTallyCopy}
                        </span>
                    ) : null}
                </span>
            </div>
        );
    }

    return (
        <div
            data-feed-collapsed-summary="ordinary"
            className={`flex justify-end text-right text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] ${SZ.footer}`}
        >
            <span data-feed-collapsed-meta>{collapsedMeta}</span>
        </div>
    );
};

export const PickCardShell = ({
    model,
    collapsed = false,
    entryOnly = false,
    children,
    primaryFooter,
}: PickCardShellProps) => {
    const { isTallyEntry, presentation } = model;

    if (collapsed) {
        return (
            <div
                data-feed-post-content
                data-feed-card-variant={model.variant}
                data-feed-entry-format={model.entryFormat}
                className={`px-5 sm:px-6 ${SZ.content}`}
            >
                <CollapsedSummary model={model} />
            </div>
        );
    }

    return (
        <div
            data-feed-post-content
            data-feed-card-variant={model.variant}
            data-feed-entry-format={model.entryFormat}
            data-standing-entry-display={entryOnly ? "entry-only" : undefined}
            className={
                entryOnly
                    ? "px-5 py-3 sm:px-6 sm:py-4"
                    : `space-y-3 px-5 sm:px-6 ${SZ.content}`
            }
        >
            <div
                data-feed-post-layout
                className={
                    entryOnly
                        ? "block"
                        : isTallyEntry
                            ? "flex flex-col gap-2 lg:gap-4"
                            : `flex flex-col gap-2 sm:flex-row sm:items-start ${SZ.contentRow}`
                }
            >
                {entryOnly ? null : <PickCardMetrics model={model} />}

                <div
                    data-feed-post-primary
                    data-feed-entry-primary={model.entryFormat}
                    data-post-accent={model.isContestEntry ? model.accent : undefined}
                    className={`relative order-1 flex-1 overflow-hidden rounded-xl border p-3 ${entryOnly
                        ? "min-h-0"
                        : isTallyEntry
                            ? "w-full min-h-[148px] sm:min-h-[164px] lg:min-h-[188px] lg:min-w-0 lg:self-stretch lg:rounded-2xl lg:p-4"
                            : `min-h-[148px] sm:order-2 sm:min-h-[164px] ${SZ.primaryCard}`
                        } ${model.primaryCardTone}`}
                >
                    {entryOnly ? null : (
                        <div
                            data-feed-post-primary-header
                            data-post-header-context={model.isContestEntry ? model.accent : "ordinary"}
                            data-post-header-state={model.headerResultState}
                            className={`relative z-[1] -mx-3 -mt-3 flex items-start justify-between gap-3 border-b border-white/10 px-3 py-2.5 lg:-mx-4 lg:-mt-4 lg:px-4 lg:py-3 ${model.primaryHeaderTone}`}
                        >
                            <div className="min-w-0 flex-1">
                                {presentation.kind === "ordinary" ? (
                                    <span
                                        className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${SZ.primaryEyebrow}`}
                                    >
                                        {model.postHeaderLabel}
                                    </span>
                                ) : (
                                    <ContestEntryHeader
                                        presentation={presentation}
                                        className={`text-[10px] ${SZ.primaryEyebrow}`}
                                    />
                                )}
                            </div>
                            {model.entryTallyCopy ? (
                                <span
                                    data-feed-entry-tally
                                    data-feed-entry-tally-position="right"
                                    aria-label={model.entryTallyAriaLabel}
                                    className={`shrink-0 text-[12px] font-semibold tabular-nums text-slate-100 ${SZ.odds}`}
                                >
                                    {model.entryTallyCopy}
                                </span>
                            ) : model.showComboLegs && !isTallyEntry ? (
                                <div data-feed-post-odds className="flex shrink-0 flex-col items-end">
                                    <span
                                        className={`text-[12px] font-semibold text-slate-100 ${SZ.odds}`}
                                    >
                                        {model.oddsCopy}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {children}
                    {primaryFooter}
                </div>
            </div>

            {entryOnly ? null : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]" />
                    <div
                        className={`text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] ${SZ.footer}`}
                    >
                        {model.footerLine}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PickCardShell;
