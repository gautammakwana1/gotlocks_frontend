import type {
    ContestEntryLifecycle,
    ContestEntryLifecycleFilter,
    StructuredFeedContextMetadata,
    StructuredFeedFilter,
    StructuredFeedRecord,
    StructuredFeedRole,
} from "./types";

export const formatStructuredFeedAmericanOdds = (odds: number) => {
    // Priced quotes can arrive with float noise (-137.00000000000003); the sign
    // is still taken from the rounded value so -0.4 doesn't render as "+-0.4".
    const displayOdds = Number(odds.toFixed(2));
    return displayOdds > 0 ? `+${displayOdds}` : `${displayOdds}`;
};

export const getStructuredFeedPointLabel = (
    context: Pick<StructuredFeedContextMetadata, "kind">,
) => {
    if (context.kind === "global") return "XP";
    return context.kind === "league" ? "League Points" : "Arena Points";
};

export const getStructuredFeedContextLabel = (context: StructuredFeedContextMetadata) => {
    const kindLabel =
        context.kind === "global" ? "Social" : context.kind === "league" ? "League" : "Arena";
    return context.name ? `${kindLabel} · ${context.name}` : kindLabel;
};

export const getStructuredFeedRoleLabel = (role: StructuredFeedRole) =>
    role === "member" ? "Member" : role[0].toUpperCase() + role.slice(1);

export const getStructuredFeedRecordLabel = (record: StructuredFeedRecord) => {
    if (record.kind === "community_pick") return "Community Pick";
    if (record.kind === "competitive_pick") {
        return `Competitive Pick · ${record.contest?.name ?? "Contest"}`;
    }
    if (record.kind === "contest_update") return "Contest update";
    if (record.kind === "staff_pick") return "Staff Pick · Noncompetitive";
    return `${record.staffRole ? getStructuredFeedRoleLabel(record.staffRole) : "Staff"} Announcement`;
};

export const isStructuredFeedRecordHidden = (record: StructuredFeedRecord) =>
    record.kind === "competitive_pick" && record.visibility === "hidden_until_lock";

export const structuredFeedRecordMatchesFilter = (
    record: StructuredFeedRecord,
    filter: StructuredFeedFilter,
) => {
    if (filter === "entries") return record.kind === "competitive_pick";
    // "Updates" is the catch-all for everything the group posts to itself:
    // community_pick, staff_pick and staff_announcement all land here today.
    //
    // Written as a NEGATION of the Entries view rather than as a list of kinds
    // on purpose. With only two record views there is no third home, so a kind
    // omitted from an explicit list would match no view and disappear from the
    // Feed silently — the MVP's own version reads as a whitelist and drops two
    // of this app's four kinds. Negating keeps every present and future kind
    // reachable by construction.
    if (filter === "updates") return record.kind !== "competitive_pick";
    // "standings" renders its own panel instead of a record list.
    return false;
};

/**
 * Second filter axis, applied only inside the Entries view. A record with no
 * `entryLifecycle` matches "all" and nothing else — better an entry that is
 * only reachable from All than one filed under a phase it may not be in.
 */
export const structuredFeedRecordMatchesEntryLifecycle = (
    record: StructuredFeedRecord,
    filter: ContestEntryLifecycleFilter,
) =>
    filter === "all" ||
    (record.kind === "competitive_pick" && record.entryLifecycle === filter);

/**
 * Maps a contest's stored status onto the Entries filter's three phases, for the
 * record builders in `ConnectedStructuredFeed`.
 *
 * Handles BOTH contest vocabularies this app serves, because both feed the same
 * Entries list:
 *  - Feed contests use `ContestLifecycleStatus` (`FeedContestPickRow.contest
 *    .lifecycle_status`): draft/scheduled/open · locked/grading · final/archived.
 *  - Fantasy (slip) contests only carry `ContestStatus` ("ACTIVE" | "ARCHIVED",
 *    `SlipContestPickRow.contest.status`), so their entries can only ever land in
 *    Open or Settled — there is no stored locked/live phase to read.
 *
 * Anything unrecognised — `canceled`, a null join, a status added server-side —
 * returns undefined, which leaves the entry visible under "All entries" only.
 */
export const resolveContestEntryLifecycle = (
    status: string | null | undefined,
): ContestEntryLifecycle | undefined => {
    switch (status?.toLowerCase()) {
        case "draft":
        case "scheduled":
        case "open":
        case "active":
            return "open";
        case "locked":
        case "grading":
            return "locked_live";
        case "final":
        case "finalized":
        case "archived":
            return "settled";
        default:
            return undefined;
    }
};

// ---------------------------------------------------------------------------
// FEED SEARCH REMOVED 2026-09-07 — this was the index behind the Feed header's
// search button and collapsible field. The search was a frontend-only addition
// the MVP never had, so the control was removed from StructuredFeed to match
// the MVP's Updates/Entries header, and this helper lost its only caller.
//
// Kept rather than deleted: the hidden-record rule below (competitive picks
// under `hidden_until_lock` contribute only their public metadata) is the
// non-obvious part, and would have to be re-derived if search ever returns.
//
// To restore: uncomment this, re-import it in
// components/feed/StructuredFeed.tsx, and AND its `.includes(...)` back onto
// the `visibleRecords` filter.
// ---------------------------------------------------------------------------
// /** Hidden competitive details are deliberately excluded from the search index. */
// export const getStructuredFeedRecordSearchText = (
//     record: StructuredFeedRecord,
//     context: StructuredFeedContextMetadata,
// ) => {
//     const publicText = [
//         getStructuredFeedRecordLabel(record),
//         getStructuredFeedContextLabel(context),
//         record.author.displayName,
//         record.author.handle,
//         record.contest?.name,
//     ];
//     if (!isStructuredFeedRecordHidden(record)) {
//         publicText.push(
//             record.body,
//             record.selection?.summary,
//             record.selection?.marketLabel,
//             record.pick?.description,
//             record.pick?.sport,
//             record.pick?.source_tab,
//             ...(record.pick?.legs?.flatMap((leg) => [
//                 leg.description,
//                 leg.selection?.market,
//                 leg.selection?.matchup,
//             ]) ?? []),
//         );
//     }
//     return publicText.filter(Boolean).join(" ").toLocaleLowerCase();
// };
