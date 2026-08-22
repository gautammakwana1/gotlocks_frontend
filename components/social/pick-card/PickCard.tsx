"use client";

import ComboPickCard from "./variants/ComboPickCard";
import PickemPickCard from "./variants/PickemPickCard";
import SinglePickCard from "./variants/SinglePickCard";
import TdPsychicPickCard from "./variants/TdPsychicPickCard";
import type { PickCardBaseProps } from "./types";

/* ----------------------------------------------------------------------------
 * ONE ENTRY POINT that picks the right Pick Card component for a pick.
 *
 * A surface rendering a MIXED list — the Feed tab, a contest's Entries tab —
 * cannot know which of the four card shapes each row needs, and deriving it at
 * each call site is exactly how this repo ended up with a Feed tab, an Entries
 * tab and a Standings tab that drew the same entry three different ways. So the
 * derivation lives here, once.
 *
 * A surface that DOES know can import the variant directly
 * (`<PickemPickCard …>`) and skip the branch.
 *
 * The rule that matters: `is_combo` does NOT decide the shape. All three feed
 * contest formats are stored as one pick row with many legs, so `legs.length`
 * only tells you it is not a single pick. What the entry IS comes from the
 * CONTEST — `presentation.entryFormat` — and nothing else can say.
 * -------------------------------------------------------------------------- */

export const PickCard = (props: PickCardBaseProps) => {
    const { pick, presentation } = props;
    const entryFormat =
        presentation?.kind === "feed_contest"
            ? presentation.entryFormat ?? "general_combo"
            : undefined;
    const hasLegs = Boolean(pick.legs?.length);

    if (hasLegs && entryFormat === "sunday_pickem") return <PickemPickCard {...props} />;
    if (hasLegs && entryFormat === "td_psychic") return <TdPsychicPickCard {...props} />;
    if (hasLegs) return <ComboPickCard {...props} />;
    return <SinglePickCard {...props} />;
};

export default PickCard;
