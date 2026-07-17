# Traditional League Contest and Slip Baseline

This document characterizes the Pass 0 behavior of traditional, graded League Contests and Slips. It protects the existing League Slip experience while later League Point, Arena Point, and XP domains are designed separately.

It describes local prototype behavior, not a production persistence or authorization design.

## Confirmed organizer rule

The League commissioner is the sole organizer of a traditional League Contest.

- `League.createdBy` identifies the commissioner.
- Only that commissioner may create and organize a traditional League Contest and its graded Slips.
- League members participate by submitting and managing their own picks while a Slip is open; membership alone does not grant organizer controls.
- For a traditional League Contest, `Contest.createdBy` and the graded `Slip.createdBy` should identify the League commissioner.
- Organizer-only controls include Contest setup, participant exclusions, Slip setup, review, finalization, and Contest archival.

At the start of Pass 0, some local actions and messages still allowed any League member to create a Contest or referred to a separate “contest creator.” That is legacy prototype behavior, not the confirmed permission model. Commissioner-only is the rule to preserve in new characterization and permission work.

## Parent-child model

```text
League (commissioner: League.createdBy)
└── Contest (Contest.leagueId)
    └── Graded Slip (Slip.leagueId + Slip.contestIds)
        └── Member Pick (Pick.slipId)
```

The traditional flow relies on these invariants:

- A Contest belongs to exactly one existing League through `Contest.leagueId`.
- A Contest Slip belongs to the same League as its Contest.
- A Slip created through the Contest flow is graded (`isGraded: true`), starts open, and references that Contest in `contestIds`.
- Its sports are a non-empty subset of the parent Contest's sports.
- Its eligible window is one to five days, and both its pick deadline and eligible window fit inside the Contest dates.
- Each submitted Pick belongs to that Slip through `Pick.slipId`.
- A participant is an eligible League member and must not appear in the Contest's `excludedMemberIds`.

Generic, ungraded “Vibe Slip” behavior is not part of this baseline.

## Existing end-to-end flow

### 1. The commissioner creates the Contest

The commissioner chooses a name, optional description, one or more sports, start and end timestamps, and optional badge behavior. The end must be later than the start. A newly created Contest is `ACTIVE` and begins with no excluded members.

Active standard-Contest capacity is derived from the current League settings. Pass 3 keeps this bucket independent from structured League Feed contests: Free uses `3 standard + 1 Feed`, while Pro uses `6 standard + 3 Feed`.

### 2. The commissioner adds a graded Slip

A traditional Contest may contain one or more Slips. A Contest Slip currently has these defaults:

- `isGraded: true`
- `pickLimit: 1`
- `status: "open"`
- `conflictWarningMode: "competition"`
- `contestIds: [contest.id]`

The Slip's sports must remain within the Contest's sport scope. Its deadline and one-to-five-day eligible window must remain inside the Contest start/end range.

Graded League Slips contribute to the League's default leaderboard. A commissioner may also attach an active secondary leaderboard when that League setting is enabled.

### 3. Eligible members submit picks

While the deadline is in the future and the Slip is not final, each eligible member may create or replace one Pick. A Pick must have a description and use a sport supported by the Slip; combos must keep every leg within the supported sport scope. Exact duplicate selections are rejected.

A member can remove their own Pick only while the Slip remains editable. An archived parent Contest or a Contest exclusion blocks new submissions.

### 4. The deadline creates the review boundary

The current runtime derives locking from `pickDeadline`. A non-final Slip is editable before the deadline and time-locked at or after it. Although `SlipStatus` includes `locked` and `grading`, the existing primary path does not need to persist those intermediate values: the stored Slip can remain `open` while the deadline places it in review.

Before the deadline, organizer edits may change the deadline/window, name, link, leaderboard assignment, or conflict mode. Once time-locked, picks cannot be added, replaced, or removed.

### 5. Results are graded and reviewed

After the deadline, the organizer can run the local auto-grade action. It records `gradedAt`; unresolved pending picks whose recorded game start is at least four hours old fall back to `not_found`, while already resolved results are preserved.

Traditional League Slip Points use the existing bounded leaderboard rules:

- A win earns its odds tier's points, capped at 60.
- A loss earns `-15`.
- Pending, void, and `not_found` earn `0`.
- A finite manual `awardedPoints` value overrides the default League leaderboard score during review only when the acting commissioner owns Pro Lifetime.

Free commissioners keep the full review, auto-grade, and finalize flow but see calculated Slip Points as read-only. Pro commissioners may edit or reset review-time values. Both paths retain the same underlying Slip score behavior, and neither path changes League Points, Arena Points, XP, or the main Profile level.

### 6. The commissioner finalizes the Slip

A traditional Slip can be finalized only after its deadline and after auto-grading has run or every Pick is resolved. Finalization sets `status: "final"` and records `finalizedAt`. A final Slip no longer accepts Pick or assignment changes and cannot be reopened.

A time-locked but non-final Slip can be reopened with a future deadline that still fits the parent Contest. Reopening resets its grading/finalization markers and deletes every existing Pick on that Slip, so members submit again against the new window.

Deleting a Slip is destructive in the local baseline and also deletes its Picks.

### 7. The commissioner archives the Contest

A Contest can be archived only after every linked Slip is final. Archiving changes the Contest to `ARCHIVED` and records `archivedAt`; archived Contests cannot be edited or accept new Slips or Picks.

Contest archival is distinct from League lifecycle behavior.

## League deletion: no League archive

The current League model has no League archive or restore state. Its only removal operation is commissioner-only deletion.

Deleting a League immediately removes the local League and its Contests, leaderboards, Slips, and Slip Picks. It is a destructive in-memory cascade with no restore path. It does not delete the user accounts that were League members.

Do not describe Contest or leaderboard archival as League archival. League archive/restore is not a planned product state; changing that requires a new explicit product decision.

## Pass 0 compatibility boundary

Changes that tighten parentage or permission guards should retain the established participant experience:

- Traditional Contest Slips remain graded, single-pick-per-member competitions.
- Pick editing closes at the deadline.
- Reopening clears prior Pick submissions.
- Finalization remains terminal.
- Win points remain bounded at 60 and a loss remains `-15`.
- Free commissioners retain default review behavior; Pro is required only for manual Slip Point overrides and reset.
- Contest archival still requires all linked Slips to be final.
- League removal remains deletion, not archive/restore.

Production authorization, persistence, provider grading, and audit logging are deliberately outside this repository's scope.
