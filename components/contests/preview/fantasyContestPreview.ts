import type { Contest, ContestLastSlip } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import type {
    ContestPreviewArtworkKey,
    ContestPreviewViewModel,
} from "./model";

/**
 * A Fantasy (slip) contest -> the shared preview card's view model.
 *
 * TWO deliberate departures from the MVP's builder:
 *
 *  1. NO WINNER. The MVP re-ranks contest score artifacts client-side and prints
 *     a champion plate on a finalized card. This app does not: a finalized
 *     Fantasy card carries its participant count and nothing else, and
 *     `resultSummary` is never set. The winner belongs to the Feed contest card
 *     alone — see feedContestPreview.
 *  2. The round comes from `last_slip`. The MVP walks every slip of every contest
 *     in memory to find the relevant one; here the list endpoint stamps the most
 *     recent slip onto the contest, already carrying the clock-aware `phase`, so
 *     the card reads one field instead of re-deriving the rule.
 */

type FantasyContestArtworkKey = Extract<
    ContestPreviewArtworkKey,
    `fantasy-${string}`
>;

const ARTWORK_BY_SPORT: Record<string, FantasyContestArtworkKey> = {
    NFL: "fantasy-football",
    NCAAF: "fantasy-football",
    NBA: "fantasy-basketball",
    NCAAB: "fantasy-basketball",
    NHL: "fantasy-hockey",
    MLB: "fantasy-baseball",
    SOCCER: "fantasy-soccer",
};

/** One sport gets its own art; anything else — none, or several — is multi-sport. */
export const fantasyContestArtwork = (
    sports: readonly string[] | null | undefined
): FantasyContestArtworkKey => {
    if (!sports || sports.length !== 1) return "fantasy-multi-sport";
    const key = sports[0]?.trim().toUpperCase() ?? "";
    return ARTWORK_BY_SPORT[key] ?? "fantasy-multi-sport";
};

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} ${count === 1 ? singular : plural}`;

/**
 * A Fantasy contest's terminal state is ARCHIVED — this app has no "FINALIZED"
 * status on `contests` (that word belongs to the Feed contest lifecycle). The
 * league page reads the two through separate endpoints, active vs archived.
 */
const isFinalizedContest = (contest: Contest) =>
    contest.status === "ARCHIVED" || Boolean(contest.archived_at);

const slipCountLabel = (contest: Contest) => {
    const counts = contest.slips_count;
    if (!counts) return undefined;
    const total =
        (counts.open_count ?? 0) +
        (counts.review_count ?? 0) +
        (counts.finalized_count ?? 0);
    return pluralize(total, "slip");
};

/**
 * What the round is doing, read off `last_slip.phase` — the server's own verdict
 * with the clock already applied, so an 'open' slip past its deadline correctly
 * reads as awaiting results rather than as still taking picks.
 */
const timingLabel = (contest: Contest, lastSlip: ContestLastSlip | null) => {
    if (isFinalizedContest(contest)) {
        return `Finalized ${formatDateTime(contest.archived_at ?? contest.ends_at)}`;
    }
    if (lastSlip) {
        if (lastSlip.is_accepting_picks && lastSlip.pick_deadline_at) {
            return `Picks close ${formatDateTime(lastSlip.pick_deadline_at)}`;
        }
        if (lastSlip.phase === "review" && lastSlip.pick_deadline_at) {
            return `Picks locked ${formatDateTime(lastSlip.pick_deadline_at)}`;
        }
        if (lastSlip.phase === "final" && lastSlip.finalized_at) {
            return `Round final ${formatDateTime(lastSlip.finalized_at)}`;
        }
    }
    return `Ends ${formatDateTime(contest.ends_at)}`;
};

export type BuildFantasyContestPreviewModelInput = {
    contest: Contest;
    detailHref: string;
    /**
     * Where "Make Pick" goes for the contest's current round. Only consulted
     * when `last_slip` is actually taking picks.
     */
    addPickHref?: (slip: ContestLastSlip) => string;
};

export const buildFantasyContestPreviewModel = ({
    contest,
    detailHref,
    addPickHref,
}: BuildFantasyContestPreviewModelInput): ContestPreviewViewModel => {
    const isFinalized = isFinalizedContest(contest);
    const lastSlip = contest.last_slip ?? null;
    const actionableSlip =
        !isFinalized && lastSlip?.is_accepting_picks ? lastSlip : null;

    const action =
        actionableSlip && addPickHref
            ? {
                label: "Make Pick",
                href: addPickHref(actionableSlip),
                ariaLabel: `Make a pick for ${contest.name}`,
            }
            : {
                label: "View Details",
                href: detailHref,
                ariaLabel: `View details for ${contest.name}`,
            };

    return {
        id: contest.id,
        title: contest.name,
        artwork: fantasyContestArtwork(contest.sports),
        visualState: isFinalized ? "finalized" : "open",
        accent: "league",
        contestTypeLabel: "Fantasy Contest",
        statusLabel: isFinalized ? "FINAL" : "OPEN",
        timingLabel: timingLabel(contest, lastSlip),
        mechanicLabel: "One pick each Slip",
        secondaryMeta: isFinalized
            ? pluralize(contest.included_members_count ?? 0, "participant")
            : lastSlip?.name,
        tertiaryFact: isFinalized
            ? undefined
            : (() => {
                const slips = slipCountLabel(contest);
                return slips ? { kind: "slips" as const, label: "Slips", value: slips } : undefined;
            })(),
        // Deliberately never set — a finalized Fantasy card shows no winner.
        resultSummary: undefined,
        action,
    };
};

export default buildFantasyContestPreviewModel;
