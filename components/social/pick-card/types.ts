import type { Pick } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * The vocabulary every Pick Card component shares.
 *
 * Kept in its own module rather than on the card that happens to be biggest, so
 * a variant can be imported without dragging the whole family in — and so the
 * two surfaces that only need the TYPES (`components/feed/types.ts`, the contest
 * panels) do not import a client component to get them.
 * -------------------------------------------------------------------------- */

/** Matches a card to its community shell — a League reads sky, an Arena violet. */
export type PickCardAccent = "sky" | "violet";

/**
 * Retained only for `PostReactionButtons`, whose two remaining legacy callers —
 * Global Social and the Profile feed — still draw their own card bodies and must
 * keep the pre-port button sizing. The pick card itself no longer has a legacy
 * scale: every surface that renders one now renders the structured MVP card.
 */
export type PickCardScale = "legacy" | "structured";

/** Which builder produced a Feed Contest entry — names and shapes the card. */
export type FeedContestEntryFormat = "general_combo" | "sunday_pickem" | "td_psychic";

export type PickCardContestStanding =
    | { status: "pending"; rank: null }
    | { status: "live"; rank: number }
    | { status: "final"; rank: number }
    | { status: "unranked"; rank: null };

export type PickCardPresentation =
    | { kind: "ordinary" }
    | { kind: "slip_contest"; contestHref: string; contestName: string }
    | {
        kind: "feed_contest";
        contestHref: string;
        contestName: string;
        contextualPointsLabel: "League Points" | "Arena Points";
        /**
         * Optional here, unlike the MVP: the group Feed's `/picks` read carries
         * no rank, and an entry that has never been ranked is exactly what
         * `standing: undefined` means on this surface.
         */
        standing?: PickCardContestStanding;
        /** Defaults to General Combo when the source cannot say. */
        entryFormat?: FeedContestEntryFormat;
        /**
         * False keeps a settled non-qualifier visible without podium styling —
         * a withdrawn or disqualified entry can still hold rank 1 on a raw
         * board without having placed.
         */
        placementEligible?: boolean;
        /**
         * The contest's flat per-correct-pick bonus. Sunday Pick'em only, and
         * only so each selection tile can split its stored total into the odds
         * share and the bonus — the entries read does not carry it, so the
         * surface that already holds the contest row passes it down.
         */
        pickemCorrectBonus?: number | null;
    };

export type ContestPresentation = Exclude<PickCardPresentation, { kind: "ordinary" }>;
export type FeedContestPresentation = Extract<PickCardPresentation, { kind: "feed_contest" }>;

/**
 * Which of the five card components renders this pick. Emitted as
 * `data-feed-card-variant` so a surface can be checked without reading props.
 */
export type PickCardVariant =
    | "single"
    | "ordinary_combo"
    | "general_combo"
    | "sunday_pickem"
    | "td_psychic"
    | "slip_contest";

/** How a selection reads: its own grade where known, the card's where not. */
export type SelectionVisualState = "pending" | "win" | "loss" | "neutral";

/** The props every Pick Card component accepts, whichever variant it is. */
export type PickCardBaseProps = {
    pick: Pick;
    /** Header row only — the collapsed summary each surface toggles to. */
    collapsed?: boolean;
    /**
     * Shows ONLY the accepted selections: no metrics rail, no header band, no
     * footer. What the Standings tab expands to, where the row above the
     * expansion already states the rank, the member and the points.
     */
    entryOnly?: boolean;
    /** Replaces Global XP with League / Arena point terminology. */
    contextualPointsLabel?: string;
    accent?: PickCardAccent;
    /** Global Social says `posted at`; profile receipts historically omit it. */
    includePostedAtPrefix?: boolean;
    presentation?: PickCardPresentation;
};
