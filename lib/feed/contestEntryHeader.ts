/**
 * The eyebrow a contest-entry Feed card wears, ported from the MVP's
 * lib/feed/contestEntryHeader.
 *
 * All four of the MVP's formats are declared now that `td_psychic` is creatable
 * and enterable here: the group Feed's `/picks` read returns whichever templates
 * the group actually runs, so a card whose format had no prefix would fall back
 * to reading as a General Combo — which is the one thing a TD card is not.
 */
export type ContestEntryFeedHeaderFormat =
    | "fantasy"
    | "general_combo"
    | "sunday_pickem"
    | "td_psychic";

const CONTEST_ENTRY_HEADER_PREFIX = {
    fantasy: "Fantasy Contest Entry",
    general_combo: "Feed Combo Contest Entry",
    sunday_pickem: "Feed Pick’em Contest Entry",
    td_psychic: "Feed TD Psychic Contest Entry",
} as const satisfies Record<ContestEntryFeedHeaderFormat, string>;

/** Shared accessible and visible label for linked contest-entry Feed headers. */
export const getContestEntryFeedHeaderLabel = ({
    format,
    contestName,
}: {
    format: ContestEntryFeedHeaderFormat;
    contestName: string;
}) => `${contestName} · ${CONTEST_ENTRY_HEADER_PREFIX[format]}`;
