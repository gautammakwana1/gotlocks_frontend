/* ----------------------------------------------------------------------------
 * TD PSYCHIC ENTRY — the slate → touchdown-scorers → card adapter.
 *
 * A TD Psychic card is exactly three DIFFERENT players predicted to score a
 * rushing or receiving touchdown, so this turns the contest's frozen slate —
 * joined to the scorer board returned by `GET /leagues/nfl/td-scorers-by-events`
 * — into one player list per matchup, and the chosen three into the
 * `selections[]` array the entry endpoint takes.
 *
 * THE ONE THING THAT MAKES THIS DIFFERENT FROM ITS TWO SIBLINGS: no prices
 * travel. `buildPickemLegs` sends an `american_odds` per leg and the server
 * prices the card at acceptance; here the body carries five identity fields per
 * player and nothing else. Every price is stored null and one shared price per
 * scorer is captured at the contest lock — the same number for every member
 * holding that player, which is the only way the correct-scorer tiebreak can
 * compare two cards at all. So a quote shown while picking is `Public data` and
 * is never sent back.
 *
 * WHY ELIGIBILITY IS NOT RE-CHECKED HERE: `/td-scorers-by-events` already
 * filters to the full-game `Player Touchdowns` / main / `Over 0.5` line and
 * drops any player the feed does not place on one of the two teams in the game.
 * First/Last Touchdown Scorer and the 2+/3+ alternates never reach this file, so
 * re-implementing the four-part rule client-side would only create a second
 * place for it to drift from the endpoint that enforces it.
 * -------------------------------------------------------------------------- */

import type {
    FeedContestGameSnapshot,
    TdPsychicSelectionPayload,
    TdScorerEvent,
    TdScorerSelection,
} from "@/lib/interfaces/interfaces";
import type { PublicCurrentOdds } from "@/lib/contests/publicCurrentOdds";
import { isDisplayableAmericanOdds } from "@/lib/contests/publicCurrentOdds";

/** Exactly three, always. The server refuses any other count by name. */
export const TD_PSYCHIC_SELECTION_COUNT = 3;

/** What the builder says when a fourth player is tapped. The MVP's wording. */
export const TD_PSYCHIC_FULL_CARD_WARNING =
    "You already have 3 TD scorers. Remove one before selecting another.";

/**
 * One pickable scorer, as the builder sees it.
 *
 * The MVP's `TdPsychicCatalogSelection`, rebuilt from the wire rather than from
 * a local fixture. `id` is synthesised (`<gameId>:<playerId>`) because the feed
 * has no row id of its own and React needs a stable key — it is NEVER sent; the
 * five provider fields below are what the entry endpoint re-resolves.
 */
export type TdPsychicCatalogSelection = {
    id: string;
    gameId: string;
    playerId: string;
    playerName: string;
    position: string | null;
    teamId: string;
    teamName: string | null;
    teamAbbreviation: string | null;
    providerMarketId: string;
    providerSelectionId: string;
    matchup: string | null;
    gameStartsAt: string | null;
    /**
     * The display-only quote, or NULL when the book has not posted a usable one.
     *
     * A missing quote does NOT make the player unpickable — this is where TD
     * Psychic parts company with Pick'em, whose `PickemTeamOption.selection`
     * being null bars the team. There, a null price would build a leg the entry
     * endpoint rejects; here the endpoint takes no prices at all, so an
     * unquoted-but-eligible scorer is a perfectly valid selection and simply
     * reads "Unavailable". The MVP's rule, and the docs' ("A missing current
     * quote displays as unavailable and never blocks an otherwise eligible
     * scorer").
     */
    currentOdds: PublicCurrentOdds | null;
};

/** The five fields the entry endpoint re-resolves a selection from. */
export type TdPsychicScorerIdentity = Pick<
    TdPsychicCatalogSelection,
    "gameId" | "playerId" | "teamId" | "providerMarketId" | "providerSelectionId"
>;

/** One matchup's worth of pickable scorers — the builder's carousel page. */
export type TdPsychicMatchupOptions = {
    gameId: string;
    matchup: string;
    awayTeamName: string;
    homeTeamName: string;
    startsAt: string | null;
    selections: TdPsychicCatalogSelection[];
    /** Kicked off already, or running live. The server rejects such a card. */
    started: boolean;
};

const trimmed = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

const asPublicOdds = (selection: TdScorerSelection): PublicCurrentOdds | null =>
    isDisplayableAmericanOdds(selection.american_odds)
        ? {
              americanOdds: selection.american_odds,
              // The feed labels the book on the request, not per row; the card
              // shows "Public data" rather than a book name, so this is only
              // ever read by assistive copy.
              sourceLabel: "Public data",
              observedAt: selection.observed_at ?? null,
          }
        : null;

const catalogSelection = (
    gameId: string,
    matchup: string | null,
    startsAt: string | null,
    selection: TdScorerSelection
): TdPsychicCatalogSelection | null => {
    const playerId = trimmed(selection?.player_id);
    const teamId = trimmed(selection?.team_id);
    const providerSelectionId = trimmed(selection?.provider_selection_id);
    // Any of the three missing means the endpoint could not re-resolve this row,
    // so offering it would build a card that is certain to be refused.
    if (!playerId || !teamId || !providerSelectionId) return null;

    return {
        id: `${gameId}:${playerId}`,
        gameId,
        playerId,
        playerName: trimmed(selection.player_name) || "Unnamed player",
        position: trimmed(selection.position) || null,
        teamId,
        teamName: trimmed(selection.team_name) || null,
        teamAbbreviation: trimmed(selection.team_abbreviation) || null,
        // Derived server-side as `<game_id>#Player Touchdowns` and echoed back
        // verbatim; the endpoint re-derives the same value when it is omitted.
        providerMarketId:
            trimmed(selection.provider_market_id) || `${gameId}#Player Touchdowns`,
        providerSelectionId,
        matchup,
        gameStartsAt: startsAt,
        currentOdds: asPublicOdds(selection),
    };
};

/**
 * The builder's matchups — the contest's own slate joined to the scorer board.
 *
 * DRIVEN BY THE SLATE, not by the board. A game the book has not posted scorers
 * for still appears, with an empty list and its own explanatory copy, because
 * the slate is what the contest froze and a silently dropped matchup reads as
 * "this game is not in the contest". The Pick'em adapter keeps started games for
 * the same reason: a card is scored against the WHOLE slate.
 *
 * Names come from the snapshot first and the board second. The snapshot is the
 * string the contest stored and the one every other surface already shows.
 */
export const tdPsychicMatchupsFromScorers = (
    slate: readonly FeedContestGameSnapshot[],
    events: readonly TdScorerEvent[],
    nowMs: number = Date.now()
): TdPsychicMatchupOptions[] => {
    const byGameId = new Map<string, TdScorerEvent>();
    for (const event of events) {
        if (event?.game_id) byGameId.set(event.game_id, event);
    }

    return slate.map((game) => {
        const event = byGameId.get(game.game_id) ?? null;
        const startsAt = game.starts_at || event?.starts_at || null;
        const awayTeamName = game.away_team || event?.away_team || "Away";
        const homeTeamName = game.home_team || event?.home_team || "Home";
        const matchup =
            game.matchup || event?.matchup || `${awayTeamName} @ ${homeTeamName}`;
        const startsAtMs = startsAt ? Date.parse(startsAt) : Number.NaN;

        const selections = (event?.selections ?? [])
            .map((selection) => catalogSelection(game.game_id, matchup, startsAt, selection))
            .filter((selection): selection is TdPsychicCatalogSelection => Boolean(selection));

        return {
            gameId: game.game_id,
            matchup,
            awayTeamName,
            homeTeamName,
            startsAt,
            selections,
            started:
                event?.is_live === true ||
                (Number.isFinite(startsAtMs) && startsAtMs <= nowMs),
        };
    });
};

/**
 * Every distinct scorer across the whole slate, in carousel order.
 *
 * DE-DUPED BY PLAYER, first occurrence wins. A player carrying a line in two of
 * the slate's games would otherwise be offerable twice, and the server refuses
 * the same `player_id` twice on one card — so the second card would look legal
 * right up to the 400. This is also what search reads.
 */
export const tdPsychicScorerCatalog = (
    matchups: readonly TdPsychicMatchupOptions[]
): TdPsychicCatalogSelection[] => {
    const seen = new Set<string>();
    const catalog: TdPsychicCatalogSelection[] = [];
    for (const matchup of matchups) {
        for (const selection of matchup.selections) {
            if (seen.has(selection.playerId)) continue;
            seen.add(selection.playerId);
            catalog.push(selection);
        }
    }
    return catalog;
};

/** Case- and accent-insensitive match on player name, team name or code. */
export const searchTdPsychicScorers = (
    catalog: readonly TdPsychicCatalogSelection[],
    query: string
): TdPsychicCatalogSelection[] => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    return catalog.filter((selection) =>
        [selection.playerName, selection.teamName, selection.teamAbbreviation].some(
            (value) => (value ?? "").toLocaleLowerCase().includes(needle)
        )
    );
};

/**
 * The chosen three, as the `selections[]` array the entry endpoint takes.
 *
 * Nothing derived is sent and no price is sent: the five identity fields are
 * re-resolved against the live market server-side, and the card's prices arrive
 * at the lock. `provider_market_id` is included even though the server would
 * derive it — sending what the picker was actually shown is what lets the
 * endpoint's exact five-part match catch a board that moved underneath us.
 */
export const buildTdPsychicSelections = (
    chosen: readonly TdPsychicScorerIdentity[]
): TdPsychicSelectionPayload[] =>
    chosen.map((selection) => ({
        game_id: selection.gameId,
        player_id: selection.playerId,
        team_id: selection.teamId,
        provider_market_id: selection.providerMarketId,
        provider_selection_id: selection.providerSelectionId,
    }));

export const toTdPsychicScorerIdentity = (
    selection: TdPsychicCatalogSelection
): TdPsychicScorerIdentity => ({
    gameId: selection.gameId,
    playerId: selection.playerId,
    teamId: selection.teamId,
    providerMarketId: selection.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
});

/* ---------- Reading a card that has already been submitted ---------- */

/**
 * The member-visible shape of one stored TD leg.
 *
 * Loose on purpose. `FeedContestEntryLeg` describes a COMBO leg and declares
 * `american_odds: number` and `external_pick_key: string`; a TD leg has neither
 * before the lock — the price is null by design and the grader key is both null
 * AND redacted out of every member-facing read. Typing the read through the
 * combo shape would make every access a lie the compiler agreed with.
 */
export type TdPsychicStoredLeg = {
    description?: string | null;
    /** NULL until the shared capture; the per-scorer LOCK price afterwards. */
    american_odds?: number | null;
    result?: string | null;
    points?: number | null;
    matchup?: string | null;
    match_time?: string | null;
    selection?: {
        gameId?: string | null;
        gameStartTime?: string | null;
        playerId?: string | null;
        playerName?: string | null;
        position?: string | null;
        teamId?: string | null;
        teamName?: string | null;
        teamAbbreviation?: string | null;
        matchup?: string | null;
        match_date?: string | null;
        /** Written by the capture. Its presence IS "this card is past the lock". */
        lockedOddsAt?: string | null;
    } | null;
};

/** The presentation states a TD card's selections can be in. The MVP's names. */
export type TdPsychicSelectionResult =
    | "pending"
    | "correct"
    | "incorrect"
    | "void"
    | "postponed"
    | "canceled"
    | "review_required";

/**
 * `picks.result` → the card's own vocabulary.
 *
 * `not_found` IS A VOID HERE, and getting that wrong is the difference between a
 * card the member thinks is still live and one the server has already
 * disqualified. `foldTdPsychicLegResults` (feed.helper.ts) treats
 * `void` and `not_found` identically: either one sets `anyVoid`, which
 * short-circuits ahead of `anyPending` and folds the whole card to 'void'
 * TERMINALLY — `correct_picks` forced to 0, `combo_odds` nulled, out of the
 * placement race. Nothing revisits it afterwards, because both the grading sweep
 * and the finalize pass skip a pick that is no longer 'pending', so its other
 * legs stay 'pending' in the stored row forever.
 *
 * Mapping it to a pending-ish state (the MVP's `review_required`, which its own
 * grading vocabulary uses as a TRANSIENT state) would therefore leave the
 * receipt reading "1 correct · 2 pending" permanently on a card that is over.
 *
 * `review_required` stays in the union because the card renders it, but this
 * backend never emits it.
 */
export const tdPsychicSelectionResult = (result: unknown): TdPsychicSelectionResult => {
    switch (trimmed(result).toLowerCase()) {
        case "win":
            return "correct";
        case "loss":
            return "incorrect";
        case "void":
        case "not_found":
            return "void";
        case "canceled":
        case "cancelled":
            return "canceled";
        case "postponed":
            return "postponed";
        case "review_required":
            return "review_required";
        default:
            return "pending";
    }
};

/** One selected scorer, ready for the receipt card. */
export type TdPsychicEntrySelectionView = {
    id: string;
    gameId: string;
    playerId: string;
    playerName: string;
    position: string | null;
    teamId: string;
    teamAbbreviation: string | null;
    result: TdPsychicSelectionResult;
    /** Present ONLY before the lock. Undefined once a lock price exists. */
    publicDataAmericanOdds?: number | null;
    /** Present ONLY after the lock. Undefined while the card is still open. */
    lockTimeAmericanOdds?: number | null;
};

/**
 * A stored card's legs, as the receipt renders them.
 *
 * The pre/post-lock split is decided PER CARD, not per leg: the capture writes
 * all three prices in one transaction, so a card with any price has them all,
 * and a half-priced card would be a bug the receipt must not paper over by
 * mixing two odds labels in one row.
 *
 * `currentOddsByPlayerId` is consulted only BEFORE the lock, and only to show
 * the moving public quote next to a pick the member already made. After the lock
 * it is ignored outright — substituting a later quote into an immutable post-lock
 * surface is exactly what the domain doc forbids.
 *
 * `includePublicDataOdds` mirrors the MVP's `showPublicDataOdds`, which defaults
 * FALSE and is switched on only for the reader's OWN receipt. Someone else's
 * open card shows no odds row at all — the number would be a live quote on a
 * pick that is not yours, which is neither yours to act on nor the price the
 * card will score at. Omitting the key is what suppresses the row: a present
 * `publicDataAmericanOdds: null` renders as "Public data · Unavailable", which
 * is a different and much louder statement.
 */
export const tdPsychicEntrySelections = (
    legs: readonly TdPsychicStoredLeg[] | null | undefined,
    currentOddsByPlayerId?: ReadonlyMap<string, PublicCurrentOdds | null>,
    includePublicDataOdds = true
): TdPsychicEntrySelectionView[] => {
    const rows = legs ?? [];
    const locked = isTdPsychicCardLocked(rows);

    return rows.map((leg, index) => {
        const selection = leg?.selection ?? {};
        const playerId = trimmed(selection.playerId);
        const gameId = trimmed(selection.gameId);
        const view: TdPsychicEntrySelectionView = {
            id: `${gameId || "game"}:${playerId || index}`,
            gameId,
            playerId,
            playerName:
                trimmed(selection.playerName) || trimmed(leg?.description) || "Unnamed player",
            position: trimmed(selection.position) || null,
            teamId: trimmed(selection.teamId),
            teamAbbreviation: trimmed(selection.teamAbbreviation) || null,
            result: tdPsychicSelectionResult(leg?.result),
        };

        if (locked) {
            view.lockTimeAmericanOdds = isDisplayableAmericanOdds(leg?.american_odds)
                ? leg.american_odds
                : null;
        } else if (includePublicDataOdds) {
            const quote = currentOddsByPlayerId?.get(playerId) ?? null;
            view.publicDataAmericanOdds = quote ? quote.americanOdds : null;
        }
        return view;
    });
};

/**
 * TRUE once this card is PAST THE SHARED LOCK — which is not the same question
 * as "does it carry a price", and conflating the two is a real display bug.
 *
 * A price is the usual evidence, and on a partially-voided card it is still
 * present: the capture writes prices onto every scorer it COULD resolve and
 * voids only the ones it could not. But a card whose scorers were all
 * unresolvable comes back priced nowhere — and reading that as "not locked yet"
 * shows a member the moving `Public data` quote on a contest that closed hours
 * ago, forever.
 *
 * So two more signals count, and both are written only after the cutoff:
 *
 *   lockedOddsAt   stamped on a selection by the capture and by nothing else.
 *   a settled leg  a TD leg leaves 'pending' at the capture (void) or at
 *                  grading (win/loss). Neither can happen before the lock.
 *
 * TODO(api): all three are inferences. A `td_price_capture_status` on the
 * contest row — or the capture read in gap B1 — would let this be answered
 * rather than deduced, and would also let the screen say WHY a card voided.
 */
export const isTdPsychicCardLocked = (
    legs: readonly TdPsychicStoredLeg[] | null | undefined
): boolean =>
    (legs ?? []).some(
        (leg) =>
            isDisplayableAmericanOdds(leg?.american_odds) ||
            Boolean(leg?.selection?.lockedOddsAt) ||
            (trimmed(leg?.result) !== "" && trimmed(leg?.result).toLowerCase() !== "pending")
    );

/**
 * A stored card's three players re-resolved against the CURRENT board — the
 * pre-fill a replacement opens with.
 *
 * Necessary rather than convenient: every member-facing read redacts
 * `providerMarketId`, `providerSelectionId` and `external_pick_key` out of the
 * stored leg, so a card cannot be re-submitted from its own receipt. The player
 * identity survives redaction, and re-matching it against the live board is what
 * produces a payload the endpoint will accept — which is also the right
 * behaviour: a scorer whose line has since been pulled SHOULD drop out of the
 * pre-fill rather than be re-sent and refused.
 */
export const tdPsychicPrefillFromLegs = (
    legs: readonly TdPsychicStoredLeg[] | null | undefined,
    catalog: readonly TdPsychicCatalogSelection[]
): TdPsychicScorerIdentity[] => {
    const byPlayerId = new Map(catalog.map((selection) => [selection.playerId, selection]));
    const seen = new Set<string>();
    const prefill: TdPsychicScorerIdentity[] = [];

    for (const leg of legs ?? []) {
        const playerId = trimmed(leg?.selection?.playerId);
        if (!playerId || seen.has(playerId)) continue;
        const match = byPlayerId.get(playerId);
        if (!match) continue;
        seen.add(playerId);
        prefill.push(toTdPsychicScorerIdentity(match));
        if (prefill.length === TD_PSYCHIC_SELECTION_COUNT) break;
    }
    return prefill;
};

/** The one-line summary the write sends as `description`. */
export const tdPsychicCardDescription = (
    chosen: readonly { playerName: string }[]
): string =>
    chosen
        .map((selection) => selection.playerName)
        .join(" • ")
        .slice(0, 300);

/** Kept for the receipt's `x / 3` chip. Voids are counted separately. */
export const tdPsychicCorrectCount = (
    selections: readonly { result: TdPsychicSelectionResult }[]
): number => selections.filter((selection) => selection.result === "correct").length;
