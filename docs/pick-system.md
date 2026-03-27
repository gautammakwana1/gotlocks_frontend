# gotLocks Pick System - Source of Truth

This document defines how picks are created, routed, scored, and displayed across gotLocks.

## Core Principle

Picks are created once, but their meaning is determined entirely by where they are routed.

All picks share a common structure and are differentiated by `pickType`.

---

## Pick Types

### 1. GROUP
- Purpose: Compete inside groups
- Routed to: Group slips
- Scoring: Group leaderboard rules
- Visibility: Group members only
- Editable: Until group lock rules apply

---

### 2. PICK_OF_DAY
- Purpose: Daily accountability & streak tracking
- Constraint: One per user per calendar day
- Scoring: Difficulty-based points
- Visibility:
  - Public profiles -> public
  - Private profiles -> followers only
- Mutability: Immutable once locked
- Reset: User may reset ALL history at once (all-or-nothing)

---

### 3. BADGE
- Purpose: Earn permanent achievements
- Routed to: Badge category
- Scoring: Win/Loss only
- Visibility: Always visible on profile
- Side effect: Winning grants a badge
- Does NOT affect streaks or tallies

---

### 4. VIBE
- Purpose: Casual social expression
- Scoring: Win/Loss only
- Visibility: Respects profile privacy
- Does NOT affect:
  - streaks
  - tallies
  - leaderboards
  - badges

---

## Winners Hall

- Displays winning `PICK_OF_DAY` entries
- Resets daily
- Shows only results from the previous day
- Public profiles only
- Implemented as a query, not persisted state

---

## Design Rules

- No pick can change its `pickType`
- No individual Pick of the Day can be deleted
- All stats are derived, not manually editable
- UI must never infer meaning from location - only from `pickType`

---

## Why This Exists

This document exists to:
- Prevent logic drift
- Keep UI and state aligned
- Serve as context for Codex and future contributors
