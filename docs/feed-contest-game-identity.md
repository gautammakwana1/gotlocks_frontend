# Feed contest game identity

Status: **proposed**, blocking a 7–10 day General Combo slate.
Reference implementation: [`lib/schedules/eventIdentity.ts`](../lib/schedules/eventIdentity.ts) (+ tests).

## The problem

A Feed contest slate should be set about a week ahead. Games that far out are not
priced yet, so they exist only in the schedule feed — and the schedule feed gives
the same game a different `id` than the priced feed does.

Observed 2026-08-03, PIT @ MIL, `2026-08-03T23:40:00.000Z`:

| feed | `id` | `mappings` |
|---|---|---|
| `/leagues/mlb/schedules-with-odds` | `4a68adc0-5bfe-51de-877f-69e2fe254409` | `Kalshi`, `MLB: 823757`, `Sofascore` |
| `/leagues/mlb/schedules-for-all-tz` | `d02b3829-6ae4-5192-a134-b0052794562a` | `MLB: 823757`, `SportsDataIO` |

Both ids are UUIDv5 over different provider tuples. Only `mappings.<provider>.id`
agrees.

Today the create wizard stores priced-feed UUIDs in `eligible_game_ids`, and
entry validation compares them by raw string:

```ts
// arenaContestController.ts:963 (submitArenaContestEntry) — and again at :1532
// (updateCompetitivePick), which repeats the same check verbatim.
if (eligibleGames.length > 0 && (!gameId || !eligibleGames.includes(gameId))) {
    return res.status(400).json({ message: "That game is not eligible for this contest." });
}
```

The client submits the **priced** `event.id`. So a game included before it was
priced can never satisfy this check, whatever the wizard stored: the slate looks
correct, and every entry against that game 400s.

This is why the 7–10 day window currently ships as advisory rather than a bound.

## Why now

`arenaContestController.ts:944` rejects any `entry_model !== "single_pick"`, and
`:941` rejects non-arena contests. Entry submission for `multi_pick`,
`pickem_card`, and league feed contests **does not exist yet**. Defining the
identity contract before those handlers are written costs one field; adding it
afterwards means a migration over live contests.

## The contract

### Key forms

```
map:<SPORT>:<PROVIDER>:<id>      stable — safe to persist
slot:<SPORT>:<ISO minute>:<A>-<B>   matching only — NEVER persist
<raw uuid>                        legacy — priced-feed id, still honoured
```

`<SPORT>` and `<PROVIDER>` uppercase. The `slot:` team pair is **sorted**, so a
neutral-site fixture listed with home and away swapped still matches; the
kickoff is truncated to the minute because the feeds differ in seconds.

A `slot:` key embeds an instant, and instants move — TV windows shift, games get
postponed. It resolves a game whose feeds share no provider, and it must never
become an identifier.

### What the client sends

`eligible_game_ids[i]` is, in order of preference:

1. the priced-feed `event.id`, when the game is priced at create time;
2. otherwise its best `map:` key (league-official provider first);
3. otherwise **the game is not offered at all** — nothing about it could be
   recognised later.

Each `eligible_games_json[i]` gains one field:

```jsonc
{
  "game_id": "map:MLB:MLB:823757",
  "identity_keys": [                        // NEW — every name this game answers to
    "map:MLB:MLB:823757",
    "map:MLB:SPORTSDATAIO:10078979",
    "slot:MLB:2026-08-03T23:40:-PIT-MIL",
    "d02b3829-6ae4-5192-a134-b0052794562a"
  ],
  "sport": "MLB",
  "starts_at": "2026-08-03T23:40:00.000Z",
  "has_odds": false
}
```

`identity_keys` always contains `game_id`. One id per game — the existing
`eligible_games_json.length === eligible_game_ids.length` check in
`feed.helper.ts` still holds.

### What the server changes

**1. Persist `identity_keys`.** `parseEligibleGames` (`feed.helper.ts:198-267`)
gains `identity_keys: string[]`, defaulting to `[game_id]` when absent so
existing callers are unaffected.

**2. Match against the union, at both sites.** Replace the raw `includes` in
`submitArenaContestEntry` (`:963`) and `updateCompetitivePick` (`:1532`):

```ts
const eligibleKeys = new Set<string>([
    ...(contest.eligible_game_ids ?? []),
    ...(contest.eligible_games_json ?? []).flatMap((g) => g.identity_keys ?? []),
]);
if (eligibleKeys.size > 0 && (!gameId || !eligibleKeys.has(gameId))) { … }
```

`eligible_games_json` is currently excluded from `FEED_CONTEST_LIST_COLUMNS`
(`arenaConstant.ts:120-126`) as detail-screen data; these two paths already load
the contest row, so they must select it.

**3. Store the matched key, not the submitted one.** Persist whichever key
matched as the pick's `game_id`, so grading and dedupe stay on one spelling.

`has_odds` needs no change. `feed.helper.ts:246-250` coerces `undefined`/`null`
to `true` and line 256 hardcodes `true` into the stored row, so the column
carries no information and only an explicit `false` is rejected. **The client
must never send `has_odds: false`** — that is the one odds-related 400.

## Unrelated backend bug found while tracing this

`nflController.ts:124`, in `fetchNFLSchedulesWithOdds` (routed at
`nflRoutes.ts:13` as `GET /leagues/nfl/schedules-with-odds`):

```ts
league: `${MLB}`,   // every other controller passes its own constant
```

It is the only wrong league param among ~30 across all sport controllers — NFL's
own other six call sites are correct. The NFL priced feed therefore returns
baseball, which lands in `state.nfl.nflSchedulesWithOdds` and is labelled NFL by
the contest catalog. **Sunday Pick'em is currently built from MLB games**, which
`buildSundayPickemSlate` would reject server-side.

## Open question

`schedules-for-all-tz` is one caller-local day, never a range — the window is
clamped with `startOf("day")`/`endOf("day")` and events are hard-filtered to it.
The range feed is the plain `/leagues/<sport>/schedules`, which the frontend
calls nowhere and which defaults to today → today+5 days.

The backend contradicts itself on how a range is spelled: `A-B` at
`nflController.ts:41` versus `A,B` at `nflController.ts:891`. At most one is what
OddsBlaze expects, and the wrong one may silently return a single day. This gates
whether the wizard needs one request per competition or one per competition
**per day**.
