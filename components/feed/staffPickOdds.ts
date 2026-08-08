// Builds the Staff Pick composer's priced-selection dropdown from live NFL
// moneyline odds, and turns the chosen selection into a createStaffPick payload.
// Every field the backend needs (odds_bracket, difficultyTier, difficulty_label,
// points, external_pick_key, selection meta) is derived from the odds row + the
// app's existing tier helpers — no PickBuilder and no validate round-trip.

import type {
    CreateCommunityPickPayload,
    CreateStaffPickPayload,
    DifficultyLabel,
    NFLSchedulesWithOdds,
} from "@/lib/interfaces/interfaces";
import { calculateOddsBasedPoints } from "@/lib/scoring/oddsBasedPoints";
import { getTierForAmericanOdds, parseAmericanOdds } from "@/lib/utils/scoring";
import { formatDateTime } from "@/lib/utils/date";
import type { StructuredFeedSelectionOption } from "./types";

// The real OddsBlaze market label for a game moneyline.
const MONEYLINE_MARKET = "Moneyline";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const formatAmerican = (american: number) =>
    american > 0 ? `+${american}` : `${american}`;

// Everything needed to build the payload, captured at option-build time so the
// composer's submission (which only carries the selection id) can reconstruct it.
export type StaffPickSelectionDetail = {
    gameId: string;
    external_pick_key: string;
    description: string;
    odds_bracket: string;
    american_odds: number;
    difficultyTier: number;
    difficulty_label: DifficultyLabel;
    points: number;
    market: string;
    scope: string;
    teamId?: string;
    matchup: string;
    match_date: string;
    home_team: string;
    home_abbr: string;
    away_team: string;
    away_abbr: string;
};

export type StaffPickOptions = {
    options: StructuredFeedSelectionOption[];
    detailById: Record<string, StaffPickSelectionDetail>;
};

// Moneyline main lines for non-live games kicking off within `windowMs` of `now`.
export const buildMoneylineStaffPickOptions = (
    events: readonly NFLSchedulesWithOdds[] | undefined,
    now: number,
    windowMs: number = TWO_DAYS_MS,
): StaffPickOptions => {
    const options: StructuredFeedSelectionOption[] = [];
    const detailById: Record<string, StaffPickSelectionDetail> = {};
    if (!events) return { options, detailById };

    for (const event of events) {
        const kickoffMs = Date.parse(event.date);
        if (event.live || !Number.isFinite(kickoffMs)) continue;
        if (kickoffMs < now || kickoffMs > now + windowMs) continue;

        const home = event.teams?.home;
        const away = event.teams?.away;
        const matchup = `${away?.name ?? "Away"} @ ${home?.name ?? "Home"}`;
        const kickoffLabel = formatDateTime(event.date);

        for (const odd of event.odds ?? []) {
            if (odd.market !== MONEYLINE_MARKET || !odd.main) continue;
            if (detailById[odd.id]) continue; // one option per odds id

            const american = parseAmericanOdds(odd.price);
            if (american === null || american === 0) continue;

            const teamName = odd.name || odd.selection?.name || "Team";
            const matchesHome =
                Boolean(home) &&
                (teamName === home!.name || teamName === home!.abbreviation);
            const teamId = matchesHome ? home?.id : away?.id;
            const tier = getTierForAmericanOdds(american);
            const description = `${teamName} Moneyline`;

            options.push({
                id: odd.id,
                label: description,
                marketLabel: "Moneyline",
                description: `${matchup} · ${kickoffLabel}`,
                quote: {
                    revision: 0,
                    americanOdds: american,
                    potentialPoints: calculateOddsBasedPoints(american),
                    quotedAt: event.date,
                },
            });

            detailById[odd.id] = {
                gameId: event.id,
                external_pick_key: odd.id,
                description,
                odds_bracket: formatAmerican(american),
                american_odds: american,
                difficultyTier: tier.tier,
                difficulty_label: tier.name,
                points: tier.points,
                market: "MONEYLINE",
                scope: "GAME_LINE",
                teamId,
                matchup,
                match_date: event.date,
                home_team: home?.name ?? "",
                home_abbr: home?.abbreviation ?? "",
                away_team: away?.name ?? "",
                away_abbr: away?.abbreviation ?? "",
            };
        }
    }

    return { options, detailById };
};

// Assemble the createStaffPick body from a chosen selection. An optional staff
// note (the composer's Staff note field) is appended to the description since the
// endpoint has no separate note column.
export const buildStaffPickPayload = (
    detail: StaffPickSelectionDetail,
    arenaId: string,
    note?: string,
): CreateStaffPickPayload => {
    const trimmedNote = note?.trim();
    return {
        arena_id: arenaId,
        description: trimmedNote
            ? `${detail.description} — ${trimmedNote}`
            : detail.description,
        odds_bracket: detail.odds_bracket,
        american_odds: detail.american_odds,
        difficultyTier: detail.difficultyTier,
        difficulty_label: detail.difficulty_label,
        points: detail.points,
        sport: "NFL",
        market: detail.market,
        scope: detail.scope,
        gameId: detail.gameId,
        teamId: detail.teamId,
        external_pick_key: detail.external_pick_key,
        isCombo: false,
        buildMode: "ODDS",
        confidence: "MEDIUM",
        validationStatus: "VALID",
        matchup: detail.matchup,
        match_date: new Date(detail.match_date),
        sourceTab: "arena_staff",
        selection: {
            sport: "NFL",
            league: "NFL",
            scope: detail.scope,
            market: detail.market,
            gameId: detail.gameId,
            gameStartTime: detail.match_date,
            teamId: detail.teamId,
            external_pick_key: detail.external_pick_key,
            matchup: detail.matchup,
            match_date: detail.match_date,
            home_team: detail.home_team,
            home_abbr: detail.home_abbr,
            away_team: detail.away_team,
            away_abbr: detail.away_abbr,
        },
    };
};

// A member's community pick uses the exact same NFL-moneyline selection body as a
// Staff Pick; only the source tab differs (the endpoint enforces member-only +
// rate-limit rules and stores it as pick_type=arena with no contest).
export const buildCommunityPickPayload = (
    detail: StaffPickSelectionDetail,
    arenaId: string,
    note?: string,
): CreateCommunityPickPayload => ({
    ...buildStaffPickPayload(detail, arenaId, note),
    sourceTab: "arena_member",
});
