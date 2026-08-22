"use client";

/* ----------------------------------------------------------------------------
 * The pick card's former home, now a re-export of `./pick-card`.
 *
 * The body used to be one 760-line component that branched five ways internally
 * and carried a `scale` prop to keep the MVP card out of the surfaces that had
 * not been ported. It is now five components in `./pick-card`, and the scale
 * prop is gone from the card: every surface that renders one — the League and
 * Arena Feed tab, a contest's Entries tab, its Standings tab and the accepted
 * entry receipt — renders the MVP card. Global Social and the Profile feed never
 * used this component; they draw their own bodies, which is why removing the
 * legacy branch cannot reach them.
 *
 * Kept as a file rather than deleted so existing imports keep resolving. New
 * code should import from `./pick-card` directly.
 * -------------------------------------------------------------------------- */

export { PickCard as PickCardContent, default } from "./pick-card/PickCard";
export { buildPickCardModel, getPickCardOddsCopy } from "./pick-card/pickCardModel";
export type {
    FeedContestEntryFormat,
    PickCardAccent,
    PickCardBaseProps as PickCardContentProps,
    PickCardContestStanding,
    PickCardPresentation,
    PickCardScale,
    PickCardVariant,
} from "./pick-card/types";
