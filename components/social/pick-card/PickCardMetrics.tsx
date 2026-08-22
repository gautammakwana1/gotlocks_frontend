"use client";

import { useState } from "react";
import { TierInfoModal } from "@/components/leaderboard/TierInfoModal";
import { NEUTRAL_POST_CARD_SURFACE } from "@/lib/styles/postCards";
import { FEED_DESKTOP_SIZING as SZ } from "../feedDesktopSizing";
import { FIXED_METRIC_SIZE, formatSignedPoints, type PickCardModel } from "./pickCardModel";

/* ----------------------------------------------------------------------------
 * THE METRIC RAIL — the two tiles beside (or, on a tally card, beneath) the
 * selections.
 *
 * Which two depends on what kind of card it is, and the pairing is the fastest
 * way to tell them apart at a glance:
 *
 *   ordinary       Points/XP        + Confidence
 *   Fantasy entry  Fantasy Tier     + Result (and its Fantasy Points)
 *   Feed entry     League/Arena pts + Contest Rank
 *
 * Both tiles are pinned to `FIXED_METRIC_SIZE` so a two-line value on one of
 * them cannot shove the other out of alignment.
 * -------------------------------------------------------------------------- */

export type PickCardMetricsProps = {
    model: PickCardModel;
};

export const PickCardMetrics = ({ model }: PickCardMetricsProps) => {
    const [tierInfoOpen, setTierInfoOpen] = useState(false);
    const { isSlipContest, isFeedContest, isTallyEntry } = model;

    return (
        <div
            data-feed-post-metrics
            data-feed-post-rail={isTallyEntry ? undefined : true}
            className={
                isTallyEntry
                    ? // A tally card owns the full width for its selections, so the
                    // rail drops beneath them as a two-up strip instead of taking
                    // a column away from five team tiles or three scorer squares.
                    "order-2 grid w-full grid-cols-2 gap-2 lg:order-2 lg:grid-cols-2 lg:grid-rows-1 lg:gap-3"
                    : `order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:flex-col sm:self-start ${SZ.metrics}`
            }
        >
            {isSlipContest ? (
                <div
                    data-feed-post-metric="scoring-tier"
                    className={`relative w-full flex-1 overflow-hidden rounded-xl border border-white/10 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${SZ.metricCard} ${SZ.pointsCard} ${model.fantasyTierCardStyle ? "bg-transparent" : "bg-white/[0.04]"
                        }`}
                    style={model.fantasyTierCardStyle}
                >
                    <div className="flex h-full min-h-[inherit] items-center justify-between gap-3 p-3 lg:p-0">
                        <div className="min-w-0 flex-1">
                            <span
                                className={`block text-[9px] font-semibold uppercase tracking-wide text-slate-300 ${SZ.metricLabel}`}
                            >
                                Fantasy Tier
                            </span>
                            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span
                                    className={`block text-xs font-semibold leading-tight text-white sm:text-sm ${SZ.compactMetricValue}`}
                                >
                                    {model.fantasyTierName}
                                </span>
                                {model.fantasyTierRange ? (
                                    <span className="block text-[9px] leading-tight text-white/65 sm:text-[10px]">
                                        {model.fantasyTierRange}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTierInfoOpen(true)}
                            aria-label="About Fantasy Point tiers"
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/25 text-[10px] font-bold normal-case text-white/80 transition hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                            i
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    data-feed-post-metric="points"
                    data-feed-contest-result={isFeedContest ? model.result : undefined}
                    data-xp-state={model.effectiveContextualPointsLabel ? undefined : model.xpState}
                    data-points-state={model.pointsAwardState}
                    data-points-kind={model.pointsKind}
                    className={`w-full flex-1 rounded-xl border p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${SZ.metricCard} ${isTallyEntry ? "" : SZ.pointsCard} ${model.pointsCardTone}`}
                >
                    <span
                        className={`block text-[10px] font-semibold uppercase tracking-wide ${model.hasHighlightedPointsAward ? "text-emerald-200/75" : "text-slate-400"
                            } ${SZ.metricLabel}`}
                    >
                        {model.pointsHelperLabel}
                    </span>
                    <span
                        className={`mt-1 block text-xs font-semibold ${model.effectiveContextualPointsLabel
                            ? model.hasHighlightedPointsAward
                                ? "text-emerald-200"
                                : "text-white"
                            : model.xpValueTone
                            } ${SZ.metricValue}`}
                    >
                        {model.pointsPrimary}
                    </span>
                </div>
            )}

            {isSlipContest ? (
                <div
                    data-feed-post-metric="result"
                    data-slip-result-state={model.slipResult}
                    className={`w-full flex-1 rounded-xl border p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${SZ.metricCard} ${SZ.confidenceCard} border-white/10 ${NEUTRAL_POST_CARD_SURFACE} text-slate-100`}
                >
                    <span
                        className={`block text-[9px] font-semibold uppercase tracking-wide opacity-75 ${SZ.metricLabel}`}
                    >
                        {model.slipResultLabel}
                    </span>
                    <span
                        className={`mt-1 block text-[11px] font-semibold sm:text-xs ${SZ.compactMetricValue}`}
                    >
                        {formatSignedPoints(model.fantasyPoints, "Fantasy Points")}
                    </span>
                    {model.slipIsPending ? (
                        <span className="mt-0.5 block text-[8px] text-white/65 sm:text-[9px] lg:text-[10px]">
                            Potential
                        </span>
                    ) : null}
                </div>
            ) : isFeedContest ? (
                <div
                    data-feed-post-metric="standing"
                    data-contest-standing-tone={model.standingPodiumTone ?? "neutral"}
                    className={`w-full flex-1 rounded-xl border p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${model.standingCardTone} ${SZ.metricCard} ${isTallyEntry ? "" : SZ.confidenceCard}`}
                >
                    <span
                        className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${SZ.metricLabel}`}
                    >
                        Contest Rank
                    </span>
                    <span
                        className={`mt-1 block text-xs font-semibold ${model.standingValueTone} ${SZ.metricValue}`}
                    >
                        {model.standingCopy}
                    </span>
                    {model.standingHelper ? (
                        <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px] lg:text-[10px]">
                            {model.standingHelper}
                        </span>
                    ) : null}
                </div>
            ) : (
                <div
                    data-feed-post-metric="confidence"
                    className={`w-full flex-1 rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${FIXED_METRIC_SIZE} ${NEUTRAL_POST_CARD_SURFACE} ${SZ.metricCard} ${SZ.confidenceCard}`}
                >
                    <span
                        className={`block text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${SZ.metricLabel}`}
                    >
                        confidence
                    </span>
                    <span
                        className={`mt-1 block text-xs font-semibold ${model.confidenceTone} ${SZ.metricValue}`}
                    >
                        {model.confidenceLabel ?? "—"}
                    </span>
                </div>
            )}

            {isSlipContest ? (
                <TierInfoModal open={tierInfoOpen} onClose={() => setTierInfoOpen(false)} />
            ) : null}
        </div>
    );
};

export default PickCardMetrics;
