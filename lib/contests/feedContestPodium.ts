import type {
    FeedContest,
    FeedContestPodiumEntry,
    FeedGroupType,
    FantasyPodiumBadge,
    FantasyPodiumEntry,
    FinalizedFantasyContestPodium,
} from "@/lib/interfaces/interfaces";

/**
 * A finalized contest's `podium` -> the Feed Winners card's view model.
 *
 * The card is the MVP's ContestResultsContent stage (components/feed/
 * ContestResultsContent.tsx), which reads a frozen standings document and
 * re-ranks it client-side. Here `/list/finalized/podium` has already done that
 * work server-side off contest_achievements, so this builder only has to shape
 * rows — there is no ranking, no tie-breaking and no scoring in it, and there
 * must not be: the server AWARDED these places, and a client that re-derived
 * them could disagree with the badge a member was already given.
 */

/** How many placements the card's stage has room for. */
export const FEED_CONTEST_PODIUM_VISIBLE_PLACEMENTS = 3;

/** The MVP's header wording, keyed by this app's two Feed contest templates. */
const CONTEST_HEADER_PREFIX: Record<string, string> = {
    multi_pick: "Feed Combo Contest",
    general_combo: "Feed Combo Contest",
    sunday_pickem: "Feed Pick’em Contest",
    td_psychic: "Feed TD Psychic Contest",
};

export type FeedContestPodiumPlacement = {
    /** contest_achievements.placement — SHARED by tied members, so not unique. */
    rank: number;
    userId: string;
    /** Already "@handle", or a surface-appropriate fallback where none was set. */
    displayName: string;
    /** final_score: the contest's own number, not a running group total. */
    points: number;
    /** The server's own verdict, so the card never compares ids itself. */
    isOwn: boolean;
    isTie: boolean;
    tiedCount: number;
    /**
     * FANTASY CONTESTS ONLY — the badges this member finished holding, and what
     * they contributed. Absent on a Feed contest podium, whose endpoint carries
     * no badge data at all; the card renders the rail only when it is present
     * rather than drawing an empty one on every Feed result.
     */
    badges?: FantasyPodiumBadge[];
    badgePoints?: number;
    /** Avatar url, where the podium row carried one. */
    avatarUrl?: string | null;
};

export type FeedContestPodiumCard = {
    contestId: string;
    contestName: string;
    /** "Sunday Slate · Feed Pick’em Contest" — the MVP's header line. */
    headerLabel: string;
    /** The contest's standings tab; the header title links to it. */
    detailHref: string;
    /** Best first, HARD-CAPPED at three rows — see buildFeedContestPodiumCard. */
    placements: FeedContestPodiumPlacement[];
    /**
     * TRUE where the contest awarded more places than the stage shows, so the
     * card can say the podium is a window rather than the whole result.
     */
    hasMorePlacements: boolean;
};

/**
 * `[]` and `undefined` are DIFFERENT states and both are real:
 *   - undefined  this row came from a list that does not stamp podiums,
 *   - []         a finalized contest where nobody was awarded a place.
 * Neither can be rendered, so both collapse to "no card" at the call site.
 */
const podiumRows = (contest: FeedContest): FeedContestPodiumEntry[] =>
    Array.isArray(contest.podium) ? contest.podium : [];

const displayNameFor = (
    entry: FeedContestPodiumEntry,
    groupType: FeedGroupType
): string => {
    const handle = entry.username?.trim().replace(/^@+/, "");
    if (handle) return `@${handle}`;
    // The profiles join can come back without a username. The Feed serves both
    // surfaces, so the placeholder follows the surface rather than always
    // saying "Arena" — same rule ConnectedStructuredFeed's fallbacks use.
    return groupType === "arena" ? "Arena member" : "League member";
};

export const feedContestPodiumHeaderLabel = (contest: FeedContest): string => {
    const prefix = CONTEST_HEADER_PREFIX[contest.template];
    return prefix ? `${contest.name} · ${prefix}` : contest.name;
};

/**
 * The contest's own page, on its standings tab — where the full result lives.
 *
 * This is what replaces the MVP's "show remaining ranks" disclosure. That
 * accordion existed because the MVP card held the whole standings document in
 * memory already; this card is fed by an endpoint that returns placements 1..3
 * and nothing else, so ranks 4+ are not withheld here — they are not present,
 * and the honest affordance is a link to the board that has them.
 */
export const feedContestDetailHref = (
    groupType: FeedGroupType,
    groupId: string,
    contestId: string
): string =>
    `/${groupType === "arena" ? "arena" : "league"}/${groupId}/feed-contests/${contestId}?tab=standings`;

export type BuildFeedContestPodiumCardInput = {
    contest: FeedContest;
    groupType: FeedGroupType;
    groupId: string;
};

/**
 * One contest -> one card, or `null` where there is nothing to show.
 *
 * THE THREE-ROW CAP IS A DISPLAY RULE, NOT THE DATA'S SHAPE. The endpoint
 * returns every row awarded a placement of 1..3, and ties SHARE a placement, so
 * the array can be longer than three: a three-way tie for 2nd returns 1, 2, 2, 2
 * — four rows for three places. The stage has three slots, so the extra rows are
 * cut here and `hasMorePlacements` records that the cut happened, rather than
 * the card silently presenting a partial podium as the whole one.
 *
 * Rows arrive ordered (placement, awarded_at, id) and are NOT re-sorted: that
 * order is stable across calls server-side, which is what keeps the same member
 * in the same slot on a refetch.
 */
export const buildFeedContestPodiumCard = ({
    contest,
    groupType,
    groupId,
}: BuildFeedContestPodiumCardInput): FeedContestPodiumCard | null => {
    const rows = podiumRows(contest);
    if (!rows.length) return null;

    const visible = rows.slice(0, FEED_CONTEST_PODIUM_VISIBLE_PLACEMENTS);

    return {
        contestId: contest.id,
        contestName: contest.name,
        headerLabel: feedContestPodiumHeaderLabel(contest),
        detailHref: feedContestDetailHref(groupType, groupId, contest.id),
        placements: visible.map((entry) => ({
            rank: entry.placement,
            userId: entry.user_id,
            displayName: displayNameFor(entry, groupType),
            points: entry.points ?? 0,
            isOwn: Boolean(entry.is_own),
            isTie: Boolean(entry.is_tie),
            tiedCount: entry.tied_count ?? 1,
        })),
        // `podium_is_truncated` is the SERVER's overflow flag (a mega-tie past
        // its per-contest row cap); `rows.length > visible.length` is this
        // card's own. Either one means "more members placed than are shown".
        hasMorePlacements:
            rows.length > visible.length || Boolean(contest.podium_is_truncated),
    };
};

/** Every finalized contest on the page that actually has a podium to draw. */
export const buildFeedContestPodiumCards = (
    contests: FeedContest[] | null,
    groupType: FeedGroupType,
    groupId: string
): FeedContestPodiumCard[] =>
    (contests ?? [])
        .map((contest) => buildFeedContestPodiumCard({ contest, groupType, groupId }))
        .filter((card): card is FeedContestPodiumCard => card !== null);

/* ----------------------------------------------------------------------------
 * FANTASY contests — the same card, off a different endpoint.
 *
 * `/contest-leaderboard/list/finalized/podium` returns a richer row than the
 * Feed one: it carries the badges each member finished holding and the points
 * those badges contributed, which is what lets the Fantasy card draw the rail
 * the Feed card has to leave out.
 *
 * Ranking is again the SERVER's. Placements are shared on ties, so a two-way
 * tie for 1st arrives as two rows both ranked 1 with no 2nd — the card must
 * present that, never renumber it.
 * -------------------------------------------------------------------------- */

const fantasyDisplayName = (
    entry: FantasyPodiumEntry,
    currentUserId?: string
): string => {
    const handle = entry.username?.trim();
    if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
    return entry.user_id === currentUserId ? "You" : "Member";
};

export const buildFantasyPodiumCard = ({
    contest,
    groupId,
    currentUserId,
}: {
    contest: FinalizedFantasyContestPodium;
    groupId: string;
    currentUserId?: string;
}): FeedContestPodiumCard | null => {
    const rows = contest.podium ?? [];
    // A finalized contest nobody scored in has an empty podium. That is a real,
    // settled answer — and an unrenderable one, so it produces no card.
    if (!rows.length) return null;

    const visible = rows.slice(0, FEED_CONTEST_PODIUM_VISIBLE_PLACEMENTS);
    // Shared placements: how many rows carry each rank, so the card can say
    // "tied" instead of silently showing two members in one medal slot.
    const countByRank = rows.reduce<Record<number, number>>((acc, row) => {
        acc[row.rank] = (acc[row.rank] ?? 0) + 1;
        return acc;
    }, {});

    return {
        contestId: contest.contest_id,
        contestName: contest.contest_name?.trim() || "Fantasy Contest",
        headerLabel: `${contest.contest_name?.trim() || "Contest"} · Fantasy Contest`,
        detailHref: `/league/${groupId}/contests/${contest.contest_id}?tab=standings`,
        placements: visible.map((entry) => ({
            rank: entry.rank,
            userId: entry.user_id,
            displayName: fantasyDisplayName(entry, currentUserId),
            // `cumulative_points` is the total awarded, badges included — the
            // same number the frozen board ranked on.
            points: entry.cumulative_points,
            isOwn: entry.user_id === currentUserId,
            isTie: (countByRank[entry.rank] ?? 1) > 1,
            tiedCount: countByRank[entry.rank] ?? 1,
            badges: entry.badges ?? [],
            badgePoints: entry.badge_points,
            avatarUrl: entry.profile_image,
        })),
        hasMorePlacements: rows.length > visible.length,
    };
};

export const buildFantasyPodiumCards = (
    contests: FinalizedFantasyContestPodium[] | null,
    groupId: string,
    currentUserId?: string
): FeedContestPodiumCard[] =>
    (contests ?? [])
        .map((contest) => buildFantasyPodiumCard({ contest, groupId, currentUserId }))
        .filter((card): card is FeedContestPodiumCard => card !== null);

export default buildFeedContestPodiumCard;
