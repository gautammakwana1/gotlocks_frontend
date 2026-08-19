/* ----------------------------------------------------------------------------
 * Sunday Pick'em ENTRY — the slate → moneyline → legs adapter.
 *
 * A Pick'em card is one moneyline pick in EVERY included matchup, so this turns
 * the contest's frozen slate — joined to the moneyline board returned by
 * `GET /leagues/nfl/moneyline-odds` — into two team options per game, and the
 * chosen ones into the `legs[]` array the entry endpoint takes.
 *
 * WHY MONEYLINE ONLY: the template's own rules copy says so —
 * "Pick one moneyline winner in every included game."
 * (`SUNDAY_PICKEM_PARTICIPATION_RULES_TEXT`). Every other market on the event is
 * deliberately ignored here; the General Combo builder is where the full market
 * board lives. That is also why the card reads the narrow moneyline endpoint
 * rather than the General Combo builder's full-board one.
 * -------------------------------------------------------------------------- */

import type {
    FeedContestEntryLegPayload,
    FeedContestGameSnapshot,
    PickemMoneylineEvent,
} from "@/lib/interfaces/interfaces";

export type PickemTeamSide = "home" | "away";

/**
 * The only four fields a Pick'em leg is built from.
 *
 * Narrow on purpose: BOTH odds sources have to produce it — the generic
 * `ContestOddsSelection` (which satisfies it structurally) and the flattened
 * `/leagues/nfl/moneyline-odds` response, which carries no raw `odd` object and
 * so could never produce a full `ContestOddsSelection`.
 */
export type PickemLegSource = {
    /** The book's own selection id — the grading key. */
    id: string;
    americanOdds: number;
    selectionName: string;
    marketName: string;
};

export type PickemTeamOption = {
    gameId: string;
    teamId: string;
    name: string;
    abbreviation?: string;
    side: PickemTeamSide;
    gameStartsAt: string;
    matchup: string;
    sport: string;
    /**
     * This team's moneyline. NULL when the book has not posted one — which makes
     * the team UNPICKABLE here, unlike in the MVP. The MVP grades a card purely
     * on who won and treats the price as decoration, so it lets an entrant pick a
     * team with "Unavailable" odds. This entry endpoint rejects any leg whose
     * `american_odds` is not a non-zero integer, so offering that pick would
     * build a card the server refuses.
     */
    selection: PickemLegSource | null;
};

export type PickemMatchupOptions = {
    gameId: string;
    matchup: string;
    startsAt: string;
    /** Always exactly two, ordered [away, home] — the MVP's card order. */
    options: PickemTeamOption[];
    /** Kicked off already, or running live. The server rejects such a leg. */
    started: boolean;
    /** TRUE only when BOTH sides carry a usable moneyline AND it has not started. */
    pickable: boolean;
};


/**
 * The chosen team cards, as the `legs[]` array the entry endpoint takes.
 *
 * `game_id` is the CONTEST's own stored id, never the priced feed's — the server
 * compares it against `eligible_game_ids` as a raw string. Nothing derived is
 * sent: the per-leg price is the only number, and the card's points are the
 * server's to compute from it.
 */
export const buildPickemLegs = (
    chosen: readonly PickemTeamOption[]
): FeedContestEntryLegPayload[] =>
    chosen.flatMap((option) => {
        const selection = option.selection;
        if (!selection) return [];
        return [
            {
                game_id: option.gameId,
                external_pick_key: selection.id,
                american_odds: selection.americanOdds,
                description: `${option.matchup} — ${selection.selectionName}`,
                match_date: option.gameStartsAt,
                market: selection.marketName,
                /*
                 * The TEAM NAME, not the home/away slot.
                 *
                 * `validatePickemCardEntry` (feed.helper.ts:2919) reads `side`
                 * FIRST out of ["side","team","selection_name","selectionName",
                 * "name"], then compares it against the slate snapshot's
                 * `home_team`/`away_team` (:2930-2939). Sending "home" answers
                 * 400 "Pick N must be <away> or <home>." — and the snapshot
                 * always carries both names, so that check always fires.
                 *
                 * `option.name` is the SNAPSHOT's own team name (the builder
                 * prefers `game.home_team`/`away_team` over the odds event), which
                 * is exactly the string the server compares against — the odds
                 * feed's `selectionName` could spell the club differently.
                 */
                side: option.name,
                threshold: null,
                scope: "GAME_LINE",
                player_id: null,
                sport: option.sport,
                matchup: option.matchup,
            },
        ];
    });

/* ----------------------------------------------------------------------------
 * The FAST path: GET /leagues/nfl/moneyline-odds.
 *
 * The generic `schedules-with-odds-by-events` returns every market on every game
 * — with `main=true` an event is still tens of KB — and the card then throws all
 * of it away but the moneyline. This endpoint returns the moneyline already
 * paired to its teams, which is why the card reads it instead.
 *
 * The SLATE remains the authority for which games exist and what they are
 * called: those are contest facts frozen at creation and exactly what the server
 * validates a leg against. The response only contributes prices — so a slate row
 * the book has not priced still renders, unpickable, rather than vanishing.
 * -------------------------------------------------------------------------- */
export const pickemMatchupOptionsFromMoneyline = (
    slate: readonly FeedContestGameSnapshot[],
    events: readonly PickemMoneylineEvent[],
    nowMs: number = Date.now()
): PickemMatchupOptions[] => {
    const eventByGameId = new Map(
        events
            .filter((event) => typeof event?.game_id === "string" && event.game_id)
            .map((event) => [event.game_id, event])
    );

    return slate.flatMap((game) => {
        const gameId = typeof game?.game_id === "string" ? game.game_id.trim() : "";
        if (!gameId) return [];

        const event = eventByGameId.get(gameId) ?? null;
        const startsAt = game.starts_at || event?.starts_at || "";
        if (!startsAt) return [];

        // Slate names win over the feed's, for the same reason the server reads
        // them from its snapshot: they are what a leg is checked against.
        const awayName = game.away_team ?? event?.away_team ?? "";
        const homeName = game.home_team ?? event?.home_team ?? "";
        const matchup = game.matchup || `${awayName} @ ${homeName}`;

        const priceFor = (side: PickemTeamSide, teamName: string): PickemLegSource | null => {
            const raw =
                event?.selections?.find((selection) => selection.side === side) ??
                event?.selections?.find(
                    (selection) =>
                        teamName &&
                        selection.team.trim().toLowerCase() === teamName.trim().toLowerCase()
                ) ??
                null;
            // `american_odds` is null when the vendor sent an unparseable price.
            // The entry endpoint refuses such a leg, so the side stays unpickable.
            if (!raw || !raw.external_pick_key || raw.american_odds === null) return null;
            return {
                id: raw.external_pick_key,
                americanOdds: raw.american_odds,
                selectionName: raw.team,
                marketName: raw.market,
            };
        };

        const options: PickemTeamOption[] = (["away", "home"] as const).map((side) => {
            const teamName = side === "home" ? homeName : awayName;
            const feedSide = event?.selections?.find((selection) => selection.side === side);
            return {
                gameId,
                // No team id is served here; the slot is only ever used as a
                // radio value, and game+side is unique within a card.
                teamId: `${gameId}-${side}`,
                name: teamName || feedSide?.team || side,
                abbreviation: feedSide?.team_abbreviation ?? undefined,
                side,
                gameStartsAt: startsAt,
                matchup,
                sport: game.sport ?? "NFL",
                selection: priceFor(side, teamName),
            };
        });

        const started = Boolean(event?.is_live) || !(Date.parse(startsAt) > nowMs);

        return [
            {
                gameId,
                matchup,
                startsAt,
                options,
                started,
                pickable: !started && options.every((option) => option.selection !== null),
            },
        ];
    });
};

/* ----------------------------------------------------------------------------
 * THE API SEAM — now LIVE.
 *
 * `POST /group/feed-contest/enter-pickem/:contest_id` (routes/feedContestRoutes.ts:89
 * → FeedContestController.ts:2202 `enterPickemFeedContest`) ships the card path.
 * It is a SEPARATE endpoint from `/enter`, which still refuses a `pickem_card`
 * contest — each one names the other in its refusal.
 *
 * Its leg contract (`validatePickemCardEntry`, feed.helper.ts:2823) differs from
 * the combo leg in exactly three ways, all handled above:
 *   - `side` must be the TEAM NAME, checked against the slate snapshot (:2930).
 *   - `market`, when sent, must normalise into PICKEM_LEG_MARKET_ALIASES
 *     ["moneyline","ml","h2h","winner"] — "Moneyline" does (:2820).
 *   - the card must cover the slate EXACTLY: one leg per `eligible_game_ids`
 *     entry, no duplicates, no omissions (:2861, :2899, :3042).
 *
 * REPLACE IS NOT WIRED: `replaceFeedContestEntry` still guards
 * `isComboEntryModel` (FeedContestController.ts:1972), so a Pick'em card cannot
 * be swapped yet — only submitted once.
 * -------------------------------------------------------------------------- */
export const PICKEM_ENTRY_API_READY = true;

/** What the placeholder reports while {@link PICKEM_ENTRY_API_READY} is false. */
export const PICKEM_ENTRY_PLACEHOLDER_NOTICE =
    "Card built successfully — but the Sunday Pick'em entry endpoint is not live yet, so nothing was submitted. The full legs payload is in the browser console.";

