import type { FeedContest, FeedContestWinner } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import type {
    ContestPreviewAccent,
    ContestPreviewAction,
    ContestPreviewArtworkKey,
    ContestPreviewViewModel,
    ContestPreviewVisualState,
} from "./model";

/**
 * A Feed contest row -> the shared preview card's view model.
 *
 * Ported from the MVP's builder of the same name, re-pointed at this app's
 * payload. The MVP derives its winner by re-ranking a frozen standings document
 * client-side; here the list endpoint already stamps `winner` onto every row, so
 * the whole standings/users plumbing the MVP needed is gone.
 */

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} ${count === 1 ? singular : plural}`;

/**
 * This app's templates are `multi_pick` and `sunday_pickem`; the MVP's are
 * `general_combo`, `sunday_pickem` and `td_psychic`. The artwork keys stay the
 * MVP's, so `multi_pick` maps onto the General Combo art rather than renaming a
 * file that other surfaces may come to share.
 */
const ARTWORK_BY_TEMPLATE: Record<string, ContestPreviewArtworkKey> = {
    multi_pick: "general_combo",
    general_combo: "general_combo",
    sunday_pickem: "sunday_pickem",
    td_psychic: "td_psychic",
};

const CONTEST_TYPE_LABEL: Record<string, string> = {
    multi_pick: "General Combo",
    general_combo: "General Combo",
    sunday_pickem: "Sunday Pick’em",
    td_psychic: "TD Psychic",
};

/**
 * Six server lifecycle states collapse onto the card's three visual ones.
 * `grading` reads as locked because that is what a member sees — the field is
 * closed and the result is not in yet; `canceled` and `archived` read as
 * finalized because both are terminal.
 */
const visualStateFor = (
    status: FeedContest["lifecycle_status"]
): ContestPreviewVisualState => {
    if (status === "open") return "open";
    if (status === "locked" || status === "grading") return "locked";
    return "finalized";
};

const statusLabelFor = (status: FeedContest["lifecycle_status"]) => {
    if (status === "open") return "OPEN";
    if (status === "locked" || status === "grading") return "LOCKED · LIVE";
    if (status === "canceled") return "CANCELED";
    if (status === "archived") return "ARCHIVED";
    return "FINAL";
};

const timingLabel = (contest: FeedContest, now: number) => {
    const state = visualStateFor(contest.lifecycle_status);
    if (state === "open") {
        if (contest.opens_at && Date.parse(contest.opens_at) > now) {
            return `Opens ${formatDateTime(contest.opens_at)}`;
        }
        return `Locks ${formatDateTime(contest.locks_at)}`;
    }
    if (state === "locked") {
        return contest.expected_ends_at
            ? `Finalizes ${formatDateTime(contest.expected_ends_at)}`
            : "Finalization pending";
    }
    return contest.finalized_at
        ? `Finalized ${formatDateTime(contest.finalized_at)}`
        : "Final results";
};

const mechanicLabel = (contest: FeedContest) => {
    if (contest.template === "sunday_pickem") {
        return `${pluralize(
            contest.eligible_game_ids?.length ?? 0,
            "game"
        )} · Pick every winner`;
    }
    const min = contest.minimum_legs ?? 2;
    const max = contest.maximum_legs ?? min;
    const legRange = min === max ? pluralize(min, "leg") : `${min}–${max} legs`;
    const minimumOdds = contest.minimum_odds;
    return minimumOdds === null || minimumOdds === undefined
        ? legRange
        : `${legRange} · ${minimumOdds > 0 ? "+" : ""}${minimumOdds} min`;
};

/** The viewer's own standing with this contest, for the poster card's third row. */
const participationLabel = (contest: FeedContest, now: number) => {
    const participation = contest.my_participation;
    const state = visualStateFor(contest.lifecycle_status);

    if (state !== "open") {
        if (participation?.status === "locked") return "Entry locked";
        if (participation?.status === "completed") return "Results ready";
        if (participation?.status === "disqualified") return "Disqualified";
        return undefined;
    }

    if (!participation) {
        return now >= Date.parse(contest.locks_at) ? undefined : "Available to enter";
    }

    switch (participation.status) {
        case "entered":
            return "Entry submitted";
        case "locked":
            return "Entry locked";
        case "completed":
            return "Results ready";
        case "withdrawn":
            return "Withdrawn";
        case "disqualified":
            return "Disqualified";
        default:
            return now >= Date.parse(contest.locks_at) ? undefined : "Available to enter";
    }
};

/** `{}` is the server's "nothing was won" — never rendered as a winner. */
const isAwardedWinner = (
    winner: FeedContest["winner"]
): winner is FeedContestWinner =>
    Boolean(winner && typeof winner === "object" && "user_id" in winner);

const winnerSummary = (
    contest: FeedContest
): ContestPreviewViewModel["resultSummary"] => {
    const winner = contest.winner;
    if (!isAwardedWinner(winner)) return undefined;

    const handle = winner.username?.trim().replace(/^@+/, "");
    if (!handle) return undefined;

    const avatarUrl = generateProfileImageUrl(winner.profile_image ?? undefined);
    return {
        // `is_tie` is the server's own verdict; it knows the full tied field
        // even though it only sends the first row.
        label: winner.is_tie ? "Winners" : "Winner",
        value: winner.is_tie
            ? `@${handle} +${Math.max(0, winner.tied_count - 1)}`
            : `@${handle}`,
        winners: [
            {
                name: `@${handle}`,
                ...(avatarUrl ? { avatarUrl } : {}),
            },
        ],
    };
};

const withStandingsTab = (detailHref: string) => {
    const hashIndex = detailHref.indexOf("#");
    const hrefWithoutHash =
        hashIndex === -1 ? detailHref : detailHref.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : detailHref.slice(hashIndex);
    const queryIndex = hrefWithoutHash.indexOf("?");
    const pathname =
        queryIndex === -1 ? hrefWithoutHash : hrefWithoutHash.slice(0, queryIndex);
    const searchParams = new URLSearchParams(
        queryIndex === -1 ? "" : hrefWithoutHash.slice(queryIndex + 1)
    );
    searchParams.set("tab", "standings");
    return `${pathname}?${searchParams.toString()}${hash}`;
};

export type BuildFeedContestPreviewModelInput = {
    contest: FeedContest;
    detailHref: string;
    /** Supplying this turns an enterable open contest's action into "Build Entry". */
    entryHref?: string;
    accent: ContestPreviewAccent;
    /** FALSE for Arena staff barred from competing, and while hosting is read-only. */
    entryWritable?: boolean;
    now?: number;
};

export const buildFeedContestPreviewModel = ({
    contest,
    detailHref,
    entryHref,
    accent,
    entryWritable = true,
    now = Date.now(),
}: BuildFeedContestPreviewModelInput): ContestPreviewViewModel => {
    const visualState = visualStateFor(contest.lifecycle_status);
    const isFinalized = visualState === "finalized";
    const entryCount = contest.participant_count ?? 0;
    const participation = participationLabel(contest, now);

    let action: ContestPreviewAction = {
        label: "View Details",
        href: withStandingsTab(detailHref),
        ariaLabel: `View ${contest.name} details`,
    };
    if (
        visualState === "open" &&
        !contest.my_participation &&
        entryWritable &&
        entryHref &&
        now < Date.parse(contest.locks_at)
    ) {
        const label =
            contest.template === "sunday_pickem" ? "Make Picks" : "Build Entry";
        action = { label, href: entryHref, ariaLabel: `${label} for ${contest.name}` };
    }

    return {
        id: contest.id,
        title: contest.name,
        artwork: ARTWORK_BY_TEMPLATE[contest.template] ?? "general_combo",
        visualState,
        accent,
        statusLabel: statusLabelFor(contest.lifecycle_status),
        timingLabel: timingLabel(contest, now),
        contestTypeLabel: CONTEST_TYPE_LABEL[contest.template] ?? "Feed Contest",
        mechanicLabel: mechanicLabel(contest),
        secondaryMeta: pluralize(entryCount, "participant"),
        tertiaryFact:
            !isFinalized && participation
                ? { kind: "participation", label: "Your status", value: participation }
                : undefined,
        // The Feed contest card is the ONE place a winner is shown — the Fantasy
        // card deliberately shows none. See fantasyContestPreview.
        resultSummary: isFinalized ? winnerSummary(contest) : undefined,
        action,
    };
};

export default buildFeedContestPreviewModel;
