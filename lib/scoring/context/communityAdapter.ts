import type {
    CommunityContext,
    CommunityPointSource,
} from "@/lib/domain/community";
import type {
    OddsBasedAwardSource,
    OddsBasedAwardSourceType,
    PointContext,
} from "./types";

const COMMUNITY_SOURCE_MAP: Record<CommunityPointSource, OddsBasedAwardSourceType> = {
    arena_community_single: "arena_community_pick",
    arena_community_combo: "arena_community_pick",
    arena_competitive_single: "arena_contest_entry",
    arena_competitive_combo: "arena_contest_entry",
    arena_pickem_selection: "arena_pickem_selection",
    league_community_single: "league_community_pick",
    league_community_combo: "league_community_pick",
    league_feed_entry: "league_feed_contest_entry",
};

export function pointContextFromCommunityContext(
    context: CommunityContext,
): PointContext {
    return context.type === "arena"
        ? { type: "arena", arenaId: context.arenaId }
        : { type: "league", leagueId: context.leagueId };
}

export function oddsBasedAwardSourceFromCommunity(input: {
    sourceType: CommunityPointSource;
    recordId: string;
    contestId?: string | null;
    selectionSnapshotIds: readonly string[];
}): OddsBasedAwardSource {
    return {
        type: COMMUNITY_SOURCE_MAP[input.sourceType],
        recordId: input.recordId,
        contestId: input.contestId ?? null,
        selectionSnapshotIds: [...input.selectionSnapshotIds],
    };
}
