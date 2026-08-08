// /lib/schedules/eventIdentity.ts
//
// One game, two feeds, two different ids.
//
// `/leagues/<sport>/schedules-with-odds` (priced) and `/leagues/<sport>/schedules`
// (full range) describe the same match with DIFFERENT top-level `id` values —
// both are UUIDv5 hashes over different provider tuples. Observed 2026-08-03:
//
//   PIT @ MIL, 2026-08-03T23:40:00.000Z
//     priced    id 4a68adc0-5bfe-51de-877f-69e2fe254409   mappings {Kalshi, MLB, Sofascore}
//     scheduled id d02b3829-6ae4-5192-a134-b0052794562a   mappings {MLB, SportsDataIO}
//     mappings.MLB.id === "823757" in BOTH.
//
// So `event.id` can never join the feeds. Everything here exists to give a game
// a name that survives the crossing.
//
// TWO KINDS OF KEY, and the difference matters:
//   * `map:` keys are STABLE — a league's own game id does not change. These are
//     the only keys safe to PERSIST in `eligible_game_ids`.
//   * The `slot:` key embeds a kickoff instant, which moves (TV windows shift,
//     games get postponed). It is a MATCHING aid only. Never store one.

import type { EventMappings, TeamsObject } from "@/lib/interfaces/interfaces";

/** The subset of a schedule/odds event this module needs. Both feeds satisfy it. */
export type IdentifiableEvent = {
    id: string;
    date: string;
    teams: TeamsObject;
    live?: boolean;
    status?: string;
    mappings?: EventMappings;
    odds?: unknown[];
};

/**
 * Preferred first. A league's own feed (MLB, SportsDataIO) is more likely to
 * appear on BOTH sides than a betting-market provider such as Kalshi, which the
 * schedule feed has no reason to carry. Providers outside this list still
 * produce keys — they just sort last, so `persistableGameId` reaches for them
 * only when nothing better exists.
 */
const PROVIDER_RANK = [
    "MLB",
    "NFL",
    "NBA",
    "NHL",
    "NCAAB",
    "SportsDataIO",
    "Sofascore",
] as const;

const providerRank = (provider: string) => {
    const index = PROVIDER_RANK.findIndex(
        (candidate) => candidate.toLowerCase() === provider.toLowerCase()
    );
    return index < 0 ? PROVIDER_RANK.length : index;
};

const normalizeSport = (sport: string) => sport.trim().toUpperCase();

/** Abbreviations are compared case-insensitively; blanks disqualify the key. */
const abbr = (team: { abbreviation?: string } | undefined) => {
    const value = team?.abbreviation?.trim().toUpperCase();
    return value && value !== "—" ? value : "";
};

/** Kickoff truncated to the minute — seconds differ between feeds. */
const kickoffMinute = (date: string) => {
    const parsed = Date.parse(date);
    if (!Number.isFinite(parsed)) return "";
    return new Date(Math.floor(parsed / 60_000) * 60_000).toISOString().slice(0, 16);
};

/**
 * Stable, persistable keys: `map:<SPORT>:<PROVIDER>:<id>`, best provider first.
 *
 * Namespaced by sport because provider id spaces are per-league — SportsDataIO
 * numbers an NFL game and an MLB game from the same sequence.
 */
export const providerMappingKeys = (
    event: Pick<IdentifiableEvent, "mappings">,
    sport: string
): string[] => {
    const entries = Object.entries(event.mappings ?? {});
    return entries
        .filter(([, mapping]) => mapping?.id !== undefined && mapping?.id !== null)
        .map(([provider, mapping]) => ({
            provider,
            key: `map:${normalizeSport(sport)}:${provider.toUpperCase()}:${String(mapping.id)}`,
        }))
        .sort(
            (left, right) =>
                providerRank(left.provider) - providerRank(right.provider) ||
                left.provider.localeCompare(right.provider)
        )
        .map((entry) => entry.key);
};

/**
 * Matching-only fallback for a game whose feeds share no provider.
 *
 * The team pair is SORTED, so a neutral-site fixture listed with home and away
 * swapped still matches. Returns null rather than a partial key when either
 * abbreviation is missing — a key built from blanks would collide every game in
 * the same slot.
 */
export const slotKey = (
    event: Pick<IdentifiableEvent, "date" | "teams">,
    sport: string
): string | null => {
    const minute = kickoffMinute(event.date);
    const home = abbr(event.teams?.home);
    const away = abbr(event.teams?.away);
    if (!minute || !home || !away) return null;
    const [first, second] = [home, away].sort();
    return `slot:${normalizeSport(sport)}:${minute}:${first}-${second}`;
};

/**
 * Every name this event answers to, strongest first. Used to TEST membership —
 * `persistableGameId` decides what actually gets written down.
 *
 * The bare `event.id` is last and deliberately included: contests created before
 * this module existed stored raw priced UUIDs, and they must keep matching.
 */
export const eventIdentityKeys = (event: IdentifiableEvent, sport: string): string[] => {
    const keys = providerMappingKeys(event, sport);
    const slot = slotKey(event, sport);
    if (slot) keys.push(slot);
    if (event.id) keys.push(event.id);
    return keys;
};

/** A game as the wizard sees it once both feeds are folded together. */
export type MergedScheduleEvent = IdentifiableEvent & {
    /** The priced feed's own id, or null when the books have not posted yet. */
    pricedGameId: string | null;
    hasOdds: boolean;
    identityKeys: string[];
};

const isPlayableStatus = (status?: string) => {
    if (!status) return true; // The priced feed carries no status at all.
    return !/^(postponed|cancell?ed|suspended|final|complete)/i.test(status.trim());
};

/**
 * Union, not election. The priced event supplies the id and odds; the schedule
 * event supplies `status` and any mappings the priced side lacks. Taking only
 * one side would hide a "Postponed" flag from every game that happens to be
 * priced — which is exactly the set an organizer can pick.
 */
export const mergeScheduleFeeds = ({
    priced,
    scheduled,
    sport,
}: {
    priced: readonly IdentifiableEvent[];
    scheduled: readonly IdentifiableEvent[];
    sport: string;
}): MergedScheduleEvent[] => {
    const merged: MergedScheduleEvent[] = [];
    const byKey = new Map<string, MergedScheduleEvent>();

    const index = (event: MergedScheduleEvent) => {
        event.identityKeys.forEach((key) => {
            if (!byKey.has(key)) byKey.set(key, event);
        });
    };

    priced.forEach((event) => {
        const entry: MergedScheduleEvent = {
            ...event,
            pricedGameId: event.id,
            hasOdds: Boolean(event.odds?.length),
            identityKeys: eventIdentityKeys(event, sport),
        };
        merged.push(entry);
        index(entry);
    });

    scheduled.forEach((event) => {
        const keys = eventIdentityKeys(event, sport);
        const match = keys.map((key) => byKey.get(key)).find(Boolean);
        if (match) {
            // Same game, seen from the other side: keep the priced id and odds,
            // adopt what only the schedule feed knows.
            match.status = event.status ?? match.status;
            match.mappings = { ...(event.mappings ?? {}), ...(match.mappings ?? {}) };
            match.identityKeys = [...new Set([...match.identityKeys, ...keys])];
            index(match);
            return;
        }
        const entry: MergedScheduleEvent = {
            ...event,
            pricedGameId: null,
            hasOdds: false,
            identityKeys: keys,
        };
        merged.push(entry);
        index(entry);
    });

    return merged.filter((event) => !event.live && isPlayableStatus(event.status));
};

/**
 * What the wizard writes into `eligible_game_ids`.
 *
 * A priced game keeps its priced id — that string is what `/odds` and
 * `/bet-validate` accept as `match_id`, and what pre-existing contests store.
 * An unpriced game falls back to its best `map:` key, which is stable enough to
 * still resolve once the books post.
 *
 * Returns null when neither exists. That game MUST NOT be offered: nothing about
 * it could be recognised at entry time, so it would sit in the slate looking
 * fine and reject every entry against it.
 */
export const persistableGameId = (
    event: Pick<MergedScheduleEvent, "pricedGameId" | "mappings">,
    sport: string
): string | null =>
    event.pricedGameId ?? providerMappingKeys(event, sport)[0] ?? null;

/**
 * The inverse, at entry time: given a live priced event, which stored id — if
 * any — does this contest know it by?
 *
 * Returns the MATCHED KEY rather than a boolean, because the entry payload has
 * to be submitted under that exact string. `arenaContestController.ts:963`
 * (submit) and `:1532` (update) both run `eligibleGames.includes(gameId)` as a
 * raw comparison, so sending the priced UUID for a game stored under a `map:`
 * key is a 400 — after the option has already rendered.
 */
export const resolveStoredGameId = (
    event: IdentifiableEvent,
    sport: string,
    eligibleGameIds: ReadonlySet<string>
): string | null =>
    eventIdentityKeys(event, sport).find((key) => eligibleGameIds.has(key)) ?? null;
