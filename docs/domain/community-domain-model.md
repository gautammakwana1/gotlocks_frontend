# Community Domain Model — Passes 1–3

This document is the local product and domain handoff for the scoring separation, community-domain foundation, and Free/Pro League behavior introduced in Passes 1–3. It describes the TypeScript records, in-memory state, normalization, permissions, and invariants demonstrated by this prototype. It does not specify or implement production persistence, authentication, billing, odds, or grading infrastructure.

The executable sources are:

- [`lib/scoring/slipPoints.ts`](../../lib/scoring/slipPoints.ts) — traditional League Slip Points.
- [`lib/scoring/oddsBasedPoints.ts`](../../lib/scoring/oddsBasedPoints.ts) — shared exact-odds calculation.
- [`lib/scoring/context/types.ts`](../../lib/scoring/context/types.ts) — explicit Global, League, and Arena award contexts.
- [`lib/scoring/dailyXp.ts`](../../lib/scoring/dailyXp.ts) — XP account-day cap and timezone behavior.
- [`lib/domain/community/types.ts`](../../lib/domain/community/types.ts) — community-domain records.
- [`lib/domain/community/normalize.ts`](../../lib/domain/community/normalize.ts) — safe legacy/default normalization and calculated projections.
- [`lib/domain/community/policies.ts`](../../lib/domain/community/policies.ts) — local permission and visibility policies.
- [`lib/groups/limits.ts`](../../lib/groups/limits.ts) — Free/Pro League ownership, regular-member, and independent contest capacity rules.
- [`lib/billing/proLifetime.ts`](../../lib/billing/proLifetime.ts) — local Founding/Standard Pro offers and the simulated lifetime-purchase adapter.
- [`lib/permissions/leaguePermissions.ts`](../../lib/permissions/leaguePermissions.ts) — commissioner, session, and Pro scoring-control permissions.
- [`lib/state/appState.tsx`](../../lib/state/appState.tsx) — local in-memory application state.

The traditional League Contest and Slip baseline remains documented separately in [`league-slip-baseline.md`](./league-slip-baseline.md).

## Scope and hard boundaries

- This repository is a local UI and product-behavior prototype.
- Legacy League Slip records remain separate from structured Feed and Arena records.
- A League has deletion only. There is no League archive, restore, archived-League collection, or archive transition.
- `archived` may still describe a structured contest, leaderboard, or Arena membership. Those states do not imply that a League can be archived.
- Arena pause is a hosting state, not deletion and not a League archive.
- Local normalization is additive. It must not rewrite or reinterpret historical League Slips.
- Values identified below as “future trusted” must eventually be authoritative outside the client, but this repository deliberately supplies only deterministic local behavior.

## Free and Pro League behavior

Personal Pro is a permanent League-organizer entitlement. It does not own or unlock the separate Arena product.

| Capability | Free | Pro Lifetime |
| --- | ---: | ---: |
| Active owned Leagues | 2 | 5 |
| Regular members per League | 10 | 15 |
| Active traditional standard contests per League | 3 | 6 |
| Separate active Feed contests per League | 1 | 3 |
| Manual Slip Point review overrides and reset | No | Commissioner only |
| Custom League badge point values | No; fixed at +10 | Commissioner only |

The commissioner is excluded from regular-member capacity. Standard contests and structured League Feed contests use independent counters: creating one never consumes capacity from the other. Scheduled, Open, Locked, and Grading Feed contests count as active; Draft, Final, Canceled, and Archived Feed contests do not.

Existing Leagues above a newly applicable ownership, membership, or contest cap remain intact and operational. The prototype blocks only the next creation, join, or ownership acceptance while at or above capacity. It does not delete excess records, choose records for the user, or create a League archive. Permanent deletion is the only way to remove a League and recover an owned-League slot.

Pro Lifetime has two deterministic local offers with identical entitlements: Founding Pro is `$10` once and Standard Pro is `$20` once. `ProLifetimeBillingAdapter` is a local simulation and never collects a name, address, card number, expiration date, security code, or other payment credential. A successful purchase stores offer, amount, time, simulated reference, and permanent ownership on the account. Repeating the action returns `already_owned`, preserves the first entitlement, and creates no second simulated purchase. Pro Lifetime cannot be downgraded.

Free commissioners retain traditional Contest/Slip creation, review, auto-grading, finalization, badge enablement, and badge selection. Only manual Slip Point changes/reset and badge point-value customization are Pro-gated. The state permission uses the acting commissioner’s `User.plan`, not the League’s stored hosting label, and validates the active session. These Pro controls never create League Points, Arena Points, or XP.

## Four separate scoring systems

Slip Points, League Points, Arena Points, and XP are not interchangeable. A submitted pick earns a scoring value in exactly one context and never updates more than one total.

Product copy must display **XP**. The internal award kind `global_xp` distinguishes XP from League and Arena ledger categories, but it is not a user-facing label.

### User-facing terminology and post values

- Never display “Global XP” or “Performance Points.” The public Global Social and main Profile label is **XP**.
- A pending Global Social post labels its value tile **Potential XP** and displays a value-only line such as `+54 XP`.
- The equivalent contextual labels are **Potential League Points**, **Potential Arena Points**, and **Potential Slip Points**.
- After a Global Social post settles, its tile displays the XP actually applied to the Profile, including any daily-cap reduction.
- Do not prefix post values with `Tier X`, and do not use a separate `tier` helper label. Tier metadata may remain internal when it is needed for color or legacy presentation.
- Feed-contest placements are **Contest Achievements**; they do not add points or XP.

| Concept | Applies to | Calculation | Cap | Editable | Stored history |
| --- | --- | --- | --- | --- | --- |
| Slip Points | Traditional standard League Slip contests only | Existing odds brackets, win/loss result, and an eligible review override | Default win value is capped at 60 | Only through the authorized traditional Slip review flow | Traditional Slip picks and standings |
| League Points | League Community Picks and League Feed contest entries | `round(20 × decimalOdds^0.55)` from immutable accepted American odds | None | Never manually editable | Awards scoped to one League |
| Arena Points | Arena Community Picks and Arena contest entries | `round(20 × decimalOdds^0.55)` from immutable accepted American odds | None | Never manually editable | Awards scoped to one Arena |
| XP | Eligible public Global Social posts | The same exact-odds formula, limited by the remaining account-day allowance | 1,000 per account day | Never manually editable | Existing Profile progress and Global Social statistics |

### Slip Points

`calculateSlipPoints` preserves the traditional League scoring engine:

- A default winning score is clamped to `0…60`.
- A loss is `-15`.
- Pending, void, and not-found results are `0`.
- A finite authorized review override takes precedence over the default. It affects Slip standings only.
- Slip Points do not create League Points, Arena Points, XP, or Profile-level movement.

Only the League commissioner may create and manage traditional standard Slip contests or add/manage their Slips. Regular League members may submit their own picks and create supported League Feed posts; they cannot use organizer controls.

### Shared exact-odds calculation

Accepted American odds are converted to decimal odds as follows:

```text
positive: decimal = 1 + american / 100
negative: decimal = 1 + 100 / abs(american)

context value = round(20 × decimal^0.55)
```

The formula rejects zero and non-finite odds. It is continuous and uncapped: for example, `+50000` produces a calculated value of `611`. The accepted odds, decimal odds, and possible contextual value are captured in an immutable pricing snapshot. Later market movement cannot change a settled award.

- A successful League Feed or Arena pick earns its full calculated value in its one community context.
- A successful eligible Global Social post may apply the calculated value as XP, limited by the remaining daily allowance.
- A loss or void earns zero.
- Postponed, canceled, pending, and review-required results cannot create a finalized award until their terminal handling is resolved.
- Organizers cannot type, adjust, or replace League Points or Arena Points.
- A correction is represented through claim/ledger status and a reversal record, not an in-place total edit.

The same numeric result receives one contextual label. A winning `+500` result is about `54 XP` on Global Social, `54 League Points` in a League Feed, or `54 Arena Points` in an Arena. One submission never receives all three.

### Simplified eight-band guide

| Submitted odds | Typical value |
| ---: | ---: |
| –300 or shorter | About 20 |
| –299 to +150 | About 25–35 |
| +151 to +500 | About 35–55 |
| +501 to +1000 | About 55–75 |
| +1001 to +2500 | About 75–120 |
| +2501 to +5000 | About 120–175 |
| +5001 to +10000 | About 175–250 |
| +10001 or longer | 250+ |

Points are calculated using the exact odds accepted when the pick is submitted. These ranges are an approximate guide, not scoring buckets.

### XP and the account calendar day

Only eligible public Global Social posts earn XP or consume the daily allowance. League Points, Arena Points, and Slip Points never increase the main Profile level and never reduce the remaining XP allowance.

Example: an account already at `800` XP receives a winning Global Social post with a calculated value of `350`. `200` XP is applied, the account reaches the `1,000` daily cap, and the remaining `150` is not applied or rolled into another day. A `350`-point League or Arena win would remain wholly inside that community and would leave XP at `800`.

The account-day key is derived from `User.accountTimezone`, an IANA timezone such as `America/Chicago`. Missing or invalid legacy values normalize to the local prototype’s account default. The account timezone controls only XP day rules. It is distinct from an Arena’s timezone.

## Timezone separation

| Timezone | Canonical field | Used for | Must not control |
| --- | --- | --- | --- |
| Account timezone | `User.accountTimezone` | The user’s 1,000 XP account day | Arena deadlines, Arena periods, or another user’s XP day |
| Arena timezone | `ArenaIdentity.timeZone` and the contest’s captured `timeZone` | Contest display, deadlines, staff announcements, analytics, and Community Leaderboard calendar periods | XP account day |

An Arena timezone change is prospective. It does not reinterpret stored timestamps or historical periods. The owner cannot change it while any Arena contest is Open, Locked, or Grading. Each structured contest snapshots the applicable timezone so later Arena changes do not rewrite that contest.

## State shape and normalization

`CommunityDomainState` is a versioned local state slice with `schemaVersion: 1`. Every collection always exists, including in an empty state:

- Arenas, memberships, ownership transfers, unlocks, and hosting records.
- Structured Feed contests and participants.
- Selection snapshots, Pick versions, Community Picks, Competitive Picks, and Pick’em cards.
- Context-scoped point claims and append-only ledger entries.
- Arena Point totals and Community Leaderboard projections.
- Contest Achievements.

`normalizeCommunityDomainState` accepts sparse or older local mock shapes and supplies safe defaults. It extracts embedded legacy selection snapshots into one canonical collection, normalizes enum/date/timezone values, deduplicates stable records, and can recognize legacy `League` records whose `groupType` is `arena`.

Normalization is not a settlement engine. It must not reprice an already accepted submission, regrade an entry, manufacture a duplicate award, or reinterpret a historical timestamp. Placeholder `legacy:*` identifiers make incomplete fixture relationships visible instead of crashing the UI. Missing legacy price audit data remains `null`; normalization never invents `-110` or another quote and presents it as accepted pricing.

## Context and parentage

`CommunityContext` is a discriminated union:

- `{ type: "arena", arenaId }`
- `{ type: "league_feed", leagueId }`

A record belongs to exactly one context. Arena and League Feed activity may share presentation, grading primitives, and the exact-odds calculation, but their awards and calculated views remain contextual. League Feed activity earns only League Points and never affects Arena Points, XP, traditional Slip Points, Slip standings, secondary Slip leaderboards, or Capture-the-Badge ownership. Arena activity earns only Arena Points. Existing public Global Social posts remain outside `CommunityContext` and earn only XP.

## Domain records

### User account time settings

**Purpose.** Make the account-day boundary deterministic for XP.

**Fields and relationships.** `User.accountTimezone` is the one canonical IANA timezone. `User.progress` retains the existing `lifetimeXp`, `xpToday`, and `xpTodayDate` compatibility fields for XP and Profile progression. An XP award records the timezone, account-local date, calculated amount, applied amount, amount not applied due to the cap, and fixed `dailyCap: 1000`.

**Invariants and transitions.** A missing/invalid timezone normalizes before use. A timezone change applies to later account-day calculations and does not relabel earlier XP awards. Account-day rollover resets the day accumulator, not lifetime XP. League and Arena ledgers contain no Profile XP attribution.

**Permissions and derived values.** A user may choose their own account timezone. League and Arena organizers cannot change another account’s timezone or XP. The main Profile level derives only from confirmed XP.

**Audit and future-trusted values.** Preserve the timezone and account-day key used for every XP grant. A future trusted settlement layer must authorize the user/timezone change, enforce the daily XP aggregate, and make award idempotency authoritative.

### League

**Purpose.** Retain the existing commissioner/member community and traditional Slip parent.

**Fields and relationships.** The existing `League` record owns membership identifiers, a commissioner through `createdBy`, traditional Contests and Slips, and League Feed contexts through `leagueId`.

**Invariants and transitions.** League lifecycle is creation followed by optional permanent deletion. There is no archive or restore state. Deletion removes the local League and its League-owned data according to the product deletion workflow.

**Permissions.** Only the commissioner organizes traditional standard Contests and Slips. League members submit only their own Slip picks and supported Feed posts. The commissioner may participate in structured League Feed contests and earn League Points, but cannot manually review, grade, or resolve an exception involving their own entry. A review-required commissioner entry must route to the prototype’s platform/admin-review actor. No commissioner may edit League Points or XP.

**Audit and future-trusted values.** Preserve commissioner transfers, membership at entry time, Feed-contest participation, and deletion confirmation. Future trusted checks include actor/session identity, commissioner role, active membership, and destructive deletion authorization.

### ArenaIdentity

**Purpose.** Represent an Arena independently from a personal Pro plan and independently from the legacy League commissioner/member shape.

**Fields and relationships.** `id`, `ownerUserId`, name, description, invite code, IANA `timeZone`, optional external community URL, lifecycle status, and created/updated/deleted timestamps. It relates one-to-many to memberships, contests, unlock/hosting history, and contextual point projections.

**Invariants and transitions.** `active → deleted` is terminal for the local deletion model. A deleted Arena is not a paused Arena. Each Arena has exactly one owner identity and one active owner membership. Arena timezone edits are blocked during Open, Locked, or Grading contests and apply prospectively.

**Permissions and derived values.** The owner manages identity, timezone, external link, ownership, and deletion. Managers may operate allowed community features but do not own billing/unlock state. Member and staff counts derive from active memberships, not a flat member array.

**Audit and future-trusted values.** Record identity/timezone changes, actor, effective time, and deletion confirmation. Future trusted values include ownership, unique invite identity, authorized settings changes, and deletion state.

### ArenaMembership

**Purpose.** Model Arena-specific roles without forcing them into League roles.

**Fields and relationships.** Membership ID, Arena ID, user ID, `owner | manager | member` role, `invited | active | archived | removed | rejected` status, and join/archive/remove/update timestamps.

**Invariants and transitions.** Typical paths are `invited → active`, `invited → rejected`, and `active → archived | removed`. Only active regular members count toward participating-member capacity. The owner and managers use separate staff allowances. Historical membership records remain available for context.

**Permissions and derived values.** Owners manage managers and membership. Managers may moderate within their allowed scope. Regular members participate and post. Active owners/managers are ineligible for Arena contests, Competitive Picks, Arena Points, Arena Point totals, Community Leaderboards, and Contest Achievements. Role promotion is blocked while a member has unresolved active contest participation.

**Audit and future-trusted values.** Preserve every role/status change, actor, time, and blocking contest IDs. Future trusted checks include current role, active status, capacity, and contest-conflict eligibility.

### ArenaOwnershipTransfer

**Purpose.** Require explicit acceptance when transferring the permanently unlocked Arena.

**Fields and relationships.** Transfer ID, Arena ID, current owner, recipient, status, requested/expiry/response/accept/cancel timestamps, and blocking contest IDs.

**Invariants and transitions.** `pending → accepted | declined | canceled | expired`. Only the named recipient can accept. At acceptance they must remain an active member of that Arena and have no unresolved contest conflict. Acceptance does not require Pro; personal plan is deliberately absent from the policy. The Arena’s permanent unlock and history transfer with the Arena.

**Permissions and derived values.** The current owner requests/cancels; the recipient accepts/declines. Eligibility derives from the current membership and contest state, not only the originally captured blockers.

**Audit and future-trusted values.** Preserve request, response, both user IDs, eligibility result, and effective ownership time. Future trusted behavior must atomically verify the current owner, recipient membership, acceptance, and conflict state.

### ArenaUnlock

**Purpose.** Represent the one-time simulated permanent Arena unlock separately from monthly hosting.

**Fields and relationships.** Arena ID, locked/unlocked status, permanent flag, `simulated_purchase | legacy_grandfathered` source, purchaser, unlock time, simulated payment reference, and included-month consumption fields.

**Invariants and transitions.** `locked → unlocked` occurs once. An unlocked Arena never becomes locked because of pause, hosting changes, owner transfer, or personal plan changes. The included month is a one-time entitlement and cannot restart.

**Grandfathered Arenas.** A pre-unlock Arena normalizes as permanently unlocked with source `legacy_grandfathered`. Its owner is not charged another simulated `$50`; ownership is detached from Pro; existing members and history remain; recurring hosting does not start automatically; and it receives one deterministic migration hosting period using Arena 50 limits. Consumption metadata prevents that month from being replayed after pause, transfer, or reactivation.

**Permissions and derived values.** The local billing simulation may unlock an eligible Arena. Owners and managers cannot directly toggle unlock fields.

**Audit and future-trusted values.** Preserve unlock source, actor/purchaser, one-time entitlement use, and simulated reference. Future trusted values include payment outcome, grandfathering eligibility, unlock uniqueness, and included-month consumption.

### ArenaHosting

**Purpose.** Model simulated monthly operating state independently from permanent unlock.

**Fields and relationships.** Arena ID, tier, status, captured capacity limits, simulated billing mode, period/paid-through/included-month timestamps, scheduled pause, cleanup, paused, and update timestamps.

**Invariants and transitions.** The supported progression is `not_started → included_month | active`; active hosting may move to `pause_scheduled`, `past_due`, or `cleanup`, and ultimately `paused`; a permanently unlocked paused Arena may reactivate without another unlock. Pause is scheduled for the period end. Cleanup allows unresolved Locked/Grading contests to finish without admitting new entries or activity.

Tier projections are:

| Tier | Participating members | Managers in addition to owner | Active contests |
| --- | ---: | ---: | ---: |
| Arena 50 | 50 | 2 | 6 |
| Arena 100 | 100 | 3 | 10 |
| Arena 250+ | 250 | 4 | 15 |
| Custom | Locally configured | Locally configured | Locally configured |

**Permissions and derived values.** Only the owner controls simulated hosting. Capacity derives from active regular memberships and active structured contests. No action auto-upgrades or auto-charges an Arena.

**Audit and future-trusted values.** Preserve tier/status transitions, period boundaries, scheduled-pause changes, and actor. Future trusted values include paid-through state, tier entitlement, capacity, and whether the included month has already been used.

### StructuredFeedContest and ContestRewardDetails

**Purpose.** Provide a lifecycle and configuration model for Arena and League Feed contests without creating hidden traditional Slips.

**Fields and relationships.** A contest has one `CommunityContext`, template, entry model, lifecycle status, sport/season, captured timezone, open/lock/end times, winning-place count, game scope, versioned rules, optional organizer reward details, creator, and final/cancel/archive audit timestamps. Participants and Competitive Picks reference its ID.

**Invariants and transitions.** The primary lifecycle is:

```text
draft → scheduled → open → locked → grading → final → archived
                                           ↘ canceled
```

Cancellation/exception behavior must be explicit in the later contest workflow; normalization must not silently treat an unresolved entry as final. `archived` here means a read-only historical contest, not an archived League. A contest’s context cannot change after entries exist. Lock time is the visibility and mutability boundary.

**Permissions and derived values.** Arena owners/managers or a League commissioner configure contests in their context. Arena staff cannot participate. A League commissioner may participate, but another authorized reviewer must handle their exceptions. Joined/submitted/locked/completed counts derive from participants.

**Audit and future-trusted values.** Preserve configuration versions, rules acceptance version, lifecycle transitions, reward acknowledgements, actor, and timestamps. Future trusted values include lifecycle, effective deadline, eligible games/markets, staff eligibility, and final standings.

### ContestParticipant

**Purpose.** Separate explicit contest opt-in from general community membership.

**Fields and relationships.** Contest/user IDs, status, accepted rules version, entry ID, opt-in/entry/lock/completion/withdrawal/disqualification timestamps, and disqualification reason.

**Invariants and transitions.** The normal path is:

```text
eligible → opted_in → entered → locked → completed
```

Branches are `missed_deadline`, `withdrawn`, and `disqualified`. Opt-in without a valid entry does not create a ranked result, contextual points, placement, or Achievement. An Arena owner/manager cannot become a participant. Each user has at most one active participant record per contest.

**Permissions and derived values.** Eligible members opt themselves in and submit their own entry. Authorized organizers may disqualify with a reason but cannot manufacture a score. Participation analytics derive counts by status.

**Audit and future-trusted values.** Preserve rules acceptance, status transitions, entry linkage, disqualification actor/reason, and deadlines. Future trusted checks include membership, staff ineligibility, deadline, uniqueness, and entry validity.

### AcceptedPricingSnapshot and SelectionSnapshot

**Purpose.** Freeze the official selection identity and accepted price used for grading, duplicate detection, and points.

**Fields and relationships.** A selection snapshot contains stable game/market/selection identity, side, line, team/player, game start, duplicate key, and one accepted pricing snapshot. Pricing stores American/decimal odds, a possible exact-odds value, quote/acceptance times, receipt sequence, and optional provider reference.

**Invariants and transitions.** An accepted snapshot is immutable. Preview or estimated builder odds are not an accepted snapshot. Every accepted quote has finite nonzero American odds and a deterministic exact-odds value. A later quote creates a replacement version; it never mutates the old snapshot. A sparse legacy snapshot may normalize with `pricing: null`; it is visibly incomplete and cannot support an award until resolved, rather than receiving an invented quote.

**Permissions and derived values.** Users build selections; the local deterministic pricing boundary accepts the final snapshot. League Points or Arena Points derive from accepted American odds and explicit context, never from a live market later. XP is routed separately through the existing Global Social submission path.

**Audit and future-trusted values.** Preserve all identity fields, exact accepted odds, quote/accept times, sequence, and pricing context. Those values, availability, and acceptance order must eventually be trusted outside the client.

### PickVersion

**Purpose.** Preserve immutable submission history when a user replaces an entry before lock.

**Fields and relationships.** Pick ID/kind, version number/reason, references to canonical selection snapshots, optional aggregate combo price, summary, acceptance time, receipt sequence, superseded version/time, and `immutable: true`.

**Invariants and transitions.** Initial submission creates version 1. A pre-lock replacement creates version `n + 1`, reprices the complete entry, marks the previous version superseded, and changes the parent’s `currentVersionId`. After lock no replacement is allowed. Pick’em edits reprice the full card.

**Permissions and derived values.** Only the entry owner may replace their own open entry. Organizers cannot alter a version. Current detail derives through `currentVersionId`; history derives through `versionIds`.

**Audit and future-trusted values.** Preserve every version, link, accepted timestamp, and receipt sequence. Future trusted behavior must enforce ordering, immutability, actor ownership, repricing, and the lock boundary.

### CommunityPick

**Purpose.** Represent a structured, non-contest Feed pick that can earn League Points or Arena Points in exactly one context.

**Fields and relationships.** Context/user, status, current/all version IDs, grade, Feed post, claim IDs, submission and rolling-window timestamps, grading/finalization, and deletion timestamp. It has no contest or participant relationship.

**Invariants and transitions.** Typical flow is `draft → submitted → grading | review_required → final`; deletion is terminal for Feed visibility. A replacement uses Pick versions. Deleting the post does not change `postingWindowStartedAt` and does not restore a rolling-24-hour posting slot. A Community Pick never creates contest placement.

**Permissions and derived values.** An eligible active member creates/replaces/deletes their own allowed pick. League commissioners may also create League Community Picks and earn League Points. Arena staff may publish clearly noncompetitive Staff Picks through a separate presentation but do not earn Arena Points. Later posting-limit UI derives the three-per-context rolling window from exact timestamps.

**Audit and future-trusted values.** Preserve original posting time, every version, grade resolution, deletion, and claim IDs. Future trusted checks include actor, active membership, rolling limit, accepted quote, grade, and duplicate identity.

### CompetitivePick

**Purpose.** Represent exactly one member’s structured entry in exactly one Feed contest.

**Fields and relationships.** Context, contest, participant, user, entry type, status, current/all versions, grade, Feed post, claim IDs, fixed `hidden_until_lock` policy, and lifecycle timestamps.

**Invariants and transitions.** The pick belongs to one contest and its matching participant/context. It follows submission/replacement before lock, then `locked → grading | review_required → final`, with withdrawal/disqualification branches. It does not count against the Community Pick posting limit.

**Visibility.** The author may review their own entry before lock. Other members may see that an entry exists, but selection summary, snapshots, and accepted price are redacted until the effective contest lock. At or after lock, the safe Feed projection may reveal the current version. Components must consume the redacted projection rather than reading the raw version directly.

**Permissions and derived values.** Eligible opted-in members submit their own entries. Arena staff are ineligible. League commissioners may enter League Feed contests but cannot resolve their own review-required result. Contest standings derive from finalized entry outcomes and the template rules.

**Audit and future-trusted values.** Preserve visibility boundary, versions, participant link, lock, grading, disqualification, and reviewer. Future trusted behavior must enforce entry uniqueness, eligibility, accepted price, lock, redaction, and conflict-free review.

### PickemCard and PickemSelection

**Purpose.** Represent the Arena-only initial Sunday Pick’em card and its individually priced winner selections.

**Fields and relationships.** Card/contest/participant/user IDs, included games, selection records, version IDs, submit/lock/final times, result counts, and total Arena Points. Each selection references a canonical snapshot and tracks correct/incorrect/void/postponed/canceled/review-required state.

**Invariants and transitions.** A submitted card must contain one supported moneyline winner for every included game. Changing one choice before lock creates a complete repriced version. Correct selections contribute their snapshotted Arena Points; incorrect and void selections contribute zero. Postponed/review-required items remain pending; canceled items follow the demonstrated void handling. Ranking is correctness-first, with Arena Points secondary.

**Permissions and derived values.** Only the eligible participant edits their own pre-lock card. Correct/incorrect/void/pending counts and total Arena Points derive from selections and cannot be manually typed.

**Audit and future-trusted values.** Preserve complete-card versions, every selection quote, game set, grade, and shared deadline. Future trusted values include completeness, pricing, lock, results, and final rank.

### `CommunityPointClaim`

**Purpose.** Decide whether one eligible settled selection set may produce one League Point or Arena Point award.

**Fields and relationships.** User/context/source, source record and optional contest, selection snapshot/identity arrays, exact submitted odds, deterministic dedupe key, requested points, status, duplicate/origin ledger links, reason, and timestamps.

**Invariants and transitions.** `pending → accepted | duplicate | ineligible`; an accepted claim may later become `reversed`. The dedupe key combines user, context, and the sorted unique selection identity set. Reordering combo legs cannot create another award. One settled selection cannot earn twice in the same Arena merely because it appears as both a Community and Competitive Pick.

**Permissions and derived values.** Claims are created by grading/finalization behavior, never manually by an organizer. Requested points derive from the immutable accepted quote. Duplicate/ineligible reasons are calculated from current domain rules.

**Audit and future-trusted values.** Preserve dedupe input, exact odds, decision, duplicate link, reason, and resolver time. Future trusted behavior must make uniqueness, eligibility, result, and claim-to-ledger linkage authoritative and idempotent.

### `CommunityPointLedgerEntry`

**Purpose.** Provide append-only League Point and Arena Point history. XP uses a separate Global Social award path and is not attributed from this community ledger.

**Fields and relationships.** User/context/claim/source, contest, selection snapshots, exact accepted odds, contextual award kind, signed point delta, pending/final/reversed status, lifecycle/reversal timestamps, and reversal link/reason. The context must identify one League or one Arena.

**Invariants and transitions.** Competitive awards may remain pending until contest finalization; eligible Community awards may finalize after grading/review resolution. Corrections append a negative reversal linked to the original instead of editing a contextual total. League Point and Arena Point deltas remain uncapped. Community awards do not contain or trigger XP attribution.

**Permissions and derived values.** Only deterministic local settlement behavior creates ledger entries. No commissioner, owner, or manager can directly edit the ledger, League Points, Arena Points, or XP. The main Profile level reads only confirmed XP from Global Social activity.

**Audit and future-trusted values.** The ledger itself is the audit history: claim, source, price, snapshots, timestamps, context, status, and reversal chain must remain available. Future trusted behavior must enforce append-only writes, idempotency, context isolation, and correction authorization.

### ArenaTotal

**Purpose.** Supply a convenient Arena/member point read model.

**Fields and relationships.** Arena/user, finalized and pending Arena Points, successful settled selections, source marker, and calculation time.

**Invariants and transitions.** Arena Total is a projection of eligible ledger entries, never an independently editable balance. Final awards add; pending awards remain separate; reversals subtract through ledger history. Owners and managers are excluded and cannot have a competitive Arena Total.

**Permissions and derived values.** Eligible viewers may read contextual totals. No role may set one. Rebuild it from the ledger whenever correctness is in doubt.

**Audit and future-trusted values.** Preserve the projection time/source for debugging, but treat the ledger as authoritative. A future trusted calculation must apply context, role, status, and reversal filters consistently.

### CommunityLeaderboard

**Purpose.** Rank eligible Arena members for a selected Arena-timezone period.

**Fields and relationships.** Arena, period kind/timezone/bounds/season, rows, generation time, and projection source. Rows include finalized points, settled/successful selection counts, accuracy, highest successful odds, Achievement count, total-reached time, and recent points.

**Invariants and transitions.** The leaderboard is another ledger-derived projection. Active owners/managers are excluded. Supported periods are current week, current month, last 30 days, current NFL season, and lifetime. Week/month boundaries use the Arena timezone; last 30 days is an exact rolling window; season uses a configured season ID.

Ranking uses finalized Arena Points, successful settled selections, highest successful submitted odds, Achievement count, earlier total-reached time, then a deterministic user-ID fallback.

**Permissions and derived values.** Arena members may view it; staff may search/filter but cannot edit order or totals.

**Audit and future-trusted values.** Preserve generation inputs/time for local reproducibility. Future trusted behavior must calculate period bounds, eligible roles, ledger aggregation, and tie-breakers consistently.

### ContestAchievement

**Purpose.** Record one canonical recognition for an eligible finalized contest placement without adding points.

**Fields and relationships.** Community context, contest/user, placement, mapped type, template/name/final score, award time, season/period, and winning-entry summary.

**Invariants and mapping.** At most one Achievement exists per member per contest placement:

| Placement | Achievement |
| ---: | --- |
| 1 | `champion` |
| 2 | `runner_up` |
| 3 | `podium_finish` |
| 4 or 5 | `top_five`, only when that place was configured |

Mappings do not overlap: first place receives only `champion`, not three records. Achievements add no League Points or Arena Points, grant no XP, and do not alter contextual totals. Arena staff are ineligible. The context supports Arena and League Feed results.

**Permissions and derived values.** Achievements are generated automatically from frozen final standings and cannot be manually assigned or transferred. UI totals such as wins or podium finishes are derived from records.

**Audit and future-trusted values.** Preserve final placement, standings version, mapping, summary, and award time. Future trusted behavior must enforce contest finality, eligible participant, placement uniqueness, and deterministic mapping.

## Permission summary

| Action | League commissioner | League member | Arena owner/manager | Arena member |
| --- | --- | --- | --- | --- |
| Create/manage traditional Contest or Slip | Yes | No | Not applicable | Not applicable |
| Submit own traditional Slip pick | Yes, as a League member | Yes | Not applicable | Not applicable |
| Create structured Feed contest | Yes | No | Yes | No |
| Enter a structured contest | Yes, but cannot self-review | Yes when eligible | No | Yes when eligible |
| Create Community Pick | Yes | Yes when eligible | Only a labeled noncompetitive Staff Pick | Yes when eligible |
| Resolve another entrant’s exception | Yes when conflict-free | No | Yes when conflict-free | No |
| Resolve own entry exception | No | No | Not eligible to enter | No |
| Edit League Points, Arena Points, or XP | No | No | No | No |
| Accept Arena ownership | Not applicable | Not applicable | Named recipient only if active member | Named recipient only if active member |

## Future-trusted values checklist

The local prototype demonstrates these rules, but a later implementation must make the following values authoritative:

- Acting user, active membership, role, and conflict-of-interest checks.
- Arena ownership, ownership-transfer acceptance, permanent unlock, included-month consumption, hosting tier/status, and capacity.
- Account and Arena timezone changes and their prospective effective time.
- Contest configuration, rules version, lifecycle, effective deadline, eligibility, and final standings.
- Accepted game/market/selection identity, exact American odds, decimal odds, quote/acceptance timestamps, and receipt sequence.
- Pick-version order, immutability, current-version pointer, and pre-lock replacement eligibility.
- Grading results, review-required resolution, finalization, and reviewer identity.
- Duplicate identity/dedupe keys, claim decisions, append-only ledger entries, and reversals.
- XP account-day aggregation and idempotent Global Social awards.
- Achievement eligibility, uniqueness, mapping, and issue time.
- Destructive League and Arena deletion authorization.

These are handoff requirements only. Passes 1–2 do not add production storage, network services, payment collection, vendor calls, background jobs, or deployment work.
