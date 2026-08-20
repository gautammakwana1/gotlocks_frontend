"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { ODDS_BRACKETS } from "@/lib/constants";
import { getGroupTierColor, getGroupTierName, LEAGUE_CAP_TIER } from "@/lib/utils/scoring";

type Props = {
    open: boolean;
    onClose: () => void;
};

const formatOdds = (odds: number | null) => {
    if (odds === null || !Number.isFinite(odds)) return null;
    return odds > 0 ? `+${odds}` : `${odds}`;
};

const rangeFor = (tier: (typeof ODDS_BRACKETS)[number]) => {
    if (tier.tier === 1) {
        const max = formatOdds(tier.maxOdds);
        if (max) return `${max} or less`;
    }
    if (tier.tier === LEAGUE_CAP_TIER) {
        const min = formatOdds(tier.minOdds);
        if (min) return `${min} or greater`;
    }
    return tier.label;
};

// A diagonal fade from the tier colour to black. This was kept in step with
// ScoringModal's getCardStyle until that modal was re-ported to the MVP's tier
// layout and dropped the helper, so this is now the only copy.
const gradientFor = (hex: string) =>
    `linear-gradient(135deg, ${hex}55, ${hex}22, rgba(0,0,0,0))`;

export const TierInfoModal = ({ open, onClose }: Props) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open || typeof document === "undefined") return null;

    const tiers = ODDS_BRACKETS.filter((tier) => tier.tier <= LEAGUE_CAP_TIER);

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Scoring tiers"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-black/95 p-5 shadow-2xl sm:p-6"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-white sm:text-lg">Scoring Tiers</h3>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">
                            Points awarded per winning pick, based on its odds.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-sm text-white/70 transition hover:text-white"
                    >
                        ✕
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {tiers.map((tier) => {
                        const hex = getGroupTierColor(tier.tier);
                        return (
                            <div
                                key={tier.tier}
                                className="flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border border-white/20 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:min-h-[84px] sm:px-5 sm:py-4"
                                style={{ backgroundImage: gradientFor(hex) }}
                            >
                                <div className="min-w-0 space-y-0.5 leading-tight">
                                    <p className="text-base font-semibold text-white sm:text-lg">
                                        {getGroupTierName(tier.tier, tier.name)}
                                    </p>
                                    <p className="text-xs text-white/70 sm:text-sm">{rangeFor(tier)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 text-right leading-tight">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 sm:text-xs">
                                        Win
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-200 sm:text-base">
                                        +{tier.points} pts
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
};
