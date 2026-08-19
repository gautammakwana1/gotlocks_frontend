"use client";

import { getArenaHostingOffer, SELF_SERVICE_ARENA_TIERS } from "@/components/billing/arena";
import type { ArenaSelfServiceHostingTier } from "@/components/billing/arena";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";

/**
 * Picks the plan that starts AFTER the included month.
 *
 * The distinction this component has to make unmistakable: the $50 buys the
 * Arena plus its first month at {ARENA_INCLUDED_TIER_LABEL} — whatever is
 * selected here does not begin, and is not charged, until that month ends.
 * Selecting the entry tier is therefore not "no upgrade"; it is "keep these
 * limits and start paying for them in month two".
 *
 * Every price and limit is read from the shared offer catalogue rather than
 * written into the markup, so this cannot drift away from what the server
 * actually charges.
 */
export type ArenaPlanPickerProps = {
    value: ArenaSelfServiceHostingTier;
    onChange: (tier: ArenaSelfServiceHostingTier) => void;
    disabled?: boolean;
    /** Rendered above the cards. Omitted on screens that already have a heading. */
    heading?: string;
};

const ArenaPlanPicker = ({
    value,
    onChange,
    disabled = false,
    heading = "Choose your plan after the included month",
}: ArenaPlanPickerProps) => (
    <fieldset
        className="w-full border-0 p-0 m-0"
        disabled={disabled}
        aria-describedby="arena-plan-picker-note"
    >
        <legend className="text-sm font-semibold text-white/90 mb-1">{heading}</legend>
        <p id="arena-plan-picker-note" className="text-xs text-white/60 mb-3">
            Your first month is {ARENA_INCLUDED_TIER_LABEL}, included with the $50 unlock. The plan
            you pick here starts when that month ends — and you can change it any time before then
            at no cost.
        </p>

        <div
            role="radiogroup"
            aria-label="Arena plan after the included month"
            className="flex flex-col gap-2"
        >
            {SELF_SERVICE_ARENA_TIERS.map((tier) => {
                const offer = getArenaHostingOffer(tier);
                const selected = value === tier;
                const { participatingMemberLimit, managerLimit, activeContestLimit } = offer.limits;

                return (
                    <button
                        key={tier}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => onChange(tier)}
                        className={[
                            "w-full text-left rounded-xl border px-4 py-3 transition",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                            selected
                                ? "border-white/80 bg-white/10"
                                : "border-white/15 bg-white/[0.03] hover:border-white/40",
                        ].join(" ")}
                    >
                        <span className="flex items-baseline justify-between gap-3">
                            <span className="flex items-center gap-2">
                                <span
                                    aria-hidden
                                    className={[
                                        "inline-block h-3.5 w-3.5 rounded-full border",
                                        selected
                                            ? "border-white bg-white"
                                            : "border-white/40 bg-transparent",
                                    ].join(" ")}
                                />
                                <span className="text-sm font-semibold text-white">
                                    {offer.name}
                                </span>
                            </span>
                            <span className="text-sm font-semibold text-white whitespace-nowrap">
                                {offer.priceLabel}
                                <span className="text-white/60 font-normal">/mo</span>
                            </span>
                        </span>

                        <span className="mt-1 block text-xs text-white/70">
                            {participatingMemberLimit} members · {managerLimit} managers ·{" "}
                            {activeContestLimit} active contests
                        </span>
                    </button>
                );
            })}
        </div>
    </fieldset>
);

export default ArenaPlanPicker;
