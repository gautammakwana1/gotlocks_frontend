import type {
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
    if (record.kind === "staff_pick") return "Staff Pick · Noncompetitive";
    return `${record.staffRole ? getStructuredFeedRoleLabel(record.staffRole) : "Staff"} Announcement`;
};

export const isStructuredFeedRecordHidden = (record: StructuredFeedRecord) =>
    record.kind === "competitive_pick" && record.visibility === "hidden_until_lock";

export const structuredFeedRecordMatchesFilter = (
    record: StructuredFeedRecord,
    filter: StructuredFeedFilter,
) => {
    if (filter === "all") return true;
    if (filter === "community") return record.kind === "community_pick";
    if (filter === "competitive") return record.kind === "competitive_pick";
    if (filter === "staff") {
        return record.kind === "staff_pick" || record.kind === "staff_announcement";
    }
    // "standings" renders its own panel instead of a record list.
    return false;
};

/** Hidden competitive details are deliberately excluded from the search index. */
export const getStructuredFeedRecordSearchText = (
    record: StructuredFeedRecord,
    context: StructuredFeedContextMetadata,
) => {
    const publicText = [
        getStructuredFeedRecordLabel(record),
        getStructuredFeedContextLabel(context),
        record.author.displayName,
        record.author.handle,
        record.contest?.name,
    ];
    if (!isStructuredFeedRecordHidden(record)) {
        publicText.push(
            record.body,
            record.selection?.summary,
            record.selection?.marketLabel,
            record.pick?.description,
            record.pick?.sport,
            record.pick?.source_tab,
            ...(record.pick?.legs?.flatMap((leg) => [
                leg.description,
                leg.selection?.market,
                leg.selection?.matchup,
            ]) ?? []),
        );
    }
    return publicText.filter(Boolean).join(" ").toLocaleLowerCase();
};
