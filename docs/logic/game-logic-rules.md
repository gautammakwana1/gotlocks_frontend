# Game Logic (Unified System Rules)

This document defines the **complete gameplay engine** for **gotLocks**: how picks work, how slips and contests progress, how scoring and leaderboards behave, and what commissioners can (and cannot) do. It is sport-agnostic by design, but optimized and **preset for NFL Sundays** for quick onboarding.

> Goal: simple, fair, auditable, and flexible—while keeping the fun “crew scoreboard” vibe.

---

## 1) Core Concepts

**Groups are sport-specific.** Each group selects exactly one **sport type** during creation (NFL, NCAAF, NHL, MLB, Soccer, or Other).

* Presets (e.g., NFL Sundays) provide light default deadlines; **both deadlines are always editable**.
* If “Other” (custom), the commissioner provides both deadlines manually.

**Contests vs. Slips**

* A **contest** is a full leaderboard cycle (e.g., “Season 2025” or “October Monthly”).
* A contest contains one or more **slips** (self-contained rounds).
* **Starting a new contest** resets cumulative points to 0 and archives the previous contest under **History**.
* **Next slip** continues within the same contest (same leaderboard).

**Two deadlines per slip**

1. **Pick Deadline** — members must submit/lock their picks by this time.
2. **Results Deadline** — commissioner must grade or void the slip by this time.

**After the Results Deadline**

* If graded → slip **finalizes**.
* If not graded → slip **auto-voids** (0 points).
* Then the **next slip opens automatically** within the same contest.

**Roles**

* **Member**: joins via invite code, creates/edits a single pick per slip until the Pick Deadline, views leaderboard/feed/chat.
* **Commissioner**: sets/edits deadlines (forward-only), locks, grades, voids, starts next slip/contest, and can apply **manual point overrides** (bonus/penalty).

---

## 2) Pick Lifecycle

**Input model (MVP)**

* Members manually enter:

  * **Pick description** (free text)
  * **Odds range** (dropdown; no odds API in MVP)

**States & timing**

| Slip Status                      | Member Ability          | Commissioner Ability                                         |
| -------------------------------- | ----------------------- | ------------------------------------------------------------ |
| **Open (before Pick Deadline)**  | Create/edit/delete pick | Edit picks for corrections; can manually “Mark Locked” early |
| **Locked (after Pick Deadline)** | No edits                | Grade results, apply manual override (+/-), or void          |
| **Finalized / Voided (soft)**    | No edits                | May **revert to Locked** *until the next slip opens*         |
| **Finalized / Voided (hard)**    | No edits                | None (fully immutable)                                       |

**Validation**

* **Duplicate picks**: blocked (same user + identical description within the same slip).
* **Missing odds**: invalid → treat as **void (0 points)** and flag.
* **Pushes**: not modeled → treat as **void (0 points)**.

**Auditability**

* All actions (create/edit/delete/lock/grade/override/void/deadline change) write to **Activity Feed** with actor, action, timestamp, slip id, and optional reason.

---

## 3) Slip & Contest Lifecycle

**Slip Lifecycle**

1. **Slip opens** → members submit picks.
2. **Pick Deadline hits** → slip auto-**locks**; members freeze.
3. **Results Window** (between deadlines) → commissioner grades / applies manual override / can void.
4. **Results Deadline hits** →

   * Graded → **finalize** (soft).
   * Not graded → **auto-void** (soft, 0 points).
5. **Next slip opens** → previous slip transitions to **hard** (immutable).

Reversion Rules:

A slip marked “Locked” can be reverted to “Open” by the commissioner if the Pick Deadline has not yet passed.

A slip marked “Finalized” can be reverted to “Locked” if the Results Deadline has not yet passed.

After these deadlines, reversion is disabled and the state is frozen (“hard”).

Next Slip Behavior:

The “Next Slip” button appears once the current slip is finalized or voided.

Creating a next slip automatically sets its Pick Deadline to 2 days after creation time and begins in open state.

“Next Contest” is a separate action located only in the Leaderboard footer; it archives all slips and resets the leaderboard.

**Soft vs. Hard finalization**

* **Soft** = Finalized/Voided but **revertible** (back to Locked) **until** the next slip opens.
* **Hard** = Once the next slip opens, all prior slips become **immutable** (no revert, no edits).

**Contest Lifecycle**

* A contest spans multiple slips and a single cumulative leaderboard.
* **Start new contest** (manual action):

  * Archive prior contest under **History**.
  * Reset cumulative points to **0**.
  * Create **Slip 1** for the new contest using the current default deadlines.
* History is read-only.

**Deadlines — edits & guards**

* Deadlines can be changed **anytime before they occur** (forward-only; cannot move backward in time).
* Deadline edits update the **default pattern** for future slips (and will seed the next contest).
* All deadline edits are logged.

**Auto behaviors**

* **Auto-lock at Pick Deadline.**
* **Auto-finalize/auto-void at Results Deadline.**
* **Auto-open next slip** after finalize/void.
* **Auto-archive contest** when commissioner starts a new one.

---

## 4) Scoring Model

**Odds brackets (fixed in MVP)**

| Odds Range  | Points on Win | Points on Loss |
| ----------- | ------------: | -------------: |
| ≤ –250      |            +5 |            –10 |
| –249 → 0    |           +10 |            –10 |
| +1 → +250   |           +15 |            –10 |
| +251 → +500 |           +20 |            –10 |
| ≥ +501      |           +25 |            –10 |

**Push:** treated as **void (0 points).**

**Universality**

* The model is sport-agnostic and applies equally to all sports. (Future versions may allow custom tables.)

---

## 5) Commissioner Powers

**Actions by phase**

| Phase                       | What the Commissioner Can Do                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open**                    | Edit picks for corrections; adjust **future** deadlines; optionally **Mark Locked** early (confirmation dialog).                            |
| **Locked**                  | Grade each pick (**win/loss/void**); apply **manual override** points (+/- integer) with optional reason; **Finalize Slip**; **Void Slip**. |
| **Finalized/Voided (soft)** | May **Revert to Locked** (for corrections) **until the next slip opens**.                                                                   |
| **Finalized/Voided (hard)** | Read-only. No changes.                                                                                                                      |

**Manual Override (Bonus/Penalty)**

* **Single mechanism only** in MVP (no streak/perfect-slip presets).
* Integer value (+X or –X), optional human-readable reason.
* Applied during **Locked** phase only (before finalization/void).
* Logged to Activity Feed.

**Reversion Window (soft)**

* Finalized/Voided slips remain revertible until the next slip opens.
* Once the next slip exists, the prior slip becomes **hard** and immutable.

---

## 6) Leaderboard, Slips & History

**Leaderboard (current contest)**

* **Columns**: one per slip (left→right in chronological order).
* **Rows**: members.
* Column shows each user’s pick result (icon & points) and the **slip points**.
* A **cumulative total** column remains visible and sticky.
* **Voided slips** render as a grayed column, explicitly labeled “Voided (0 pts).”
* When a slip becomes hard (after next slip opens), its cells are read-only.

**History (archived contests)**

* Prior contests appear in a collapsible **History** section under the current leaderboard.
* Read-only tables with the same visual schema.

---

## 7) Error & Edge Handling

* **Duplicate picks**: blocked (same user + identical description in a slip).
* **Missing odds**: treated as **void (0 pts)** and flagged.
* **Late grading**: disallowed after Results Deadline (unless reverting during soft window).
* **API mismatch (future sync)**: show diff preview; commissioner confirms before applying.
* **Timezone**: store UTC; display in the group’s selected zone.
* **Voids**: clearly visible and counted as 0 pts, preserved in grids/totals.
* **Invite joins late**: new members start contributing on the **next** slip (no retro points).

---

## 8) Backend Hooks (future; reference)

These are forward-looking data shapes to keep the MVP frontend consistent with a likely backend.

| Table                | Purpose (key fields)                                                             |                        |           |                                                          |
| -------------------- | -------------------------------------------------------------------------------- | ---------------------- | --------- | -------------------------------------------------------- |
| `groups`             | id, name, sport_type, created_by                                                 |                        |           |                                                          |
| `contests`           | id, group_id, name, status(`active                                               | archived`), created_at |           |                                                          |
| `slips`              | id, contest_id, index, name, pick_deadline_at, results_deadline_at, status(`open | locked                 | finalized | voided`), soft_finalized:boolean                         |
| `picks`              | id, slip_id, user_id, description, odds_bracket, result(`win                     | loss                   | void      | pending`), points, override_delta:int?, override_reason? |
| `leaderboard_totals` | contest_id, group_id, user_id, slip_id, slip_points, cumulative_points           |                        |           |                                                          |
| `activity_feed`      | id, actor_id, action, meta(json), created_at                                     |                        |           |                                                          |

* **Auth:** Supabase Auth (Email/Google).
* **Username onboarding:** All users must pick a unique in-app username after auth; see `docs/logic/username-onboarding.md` for flow/redirect rules.
* **Writes:** picks (pre-deadline), grading & overrides (Locked), finalize/void, reversion (soft window), start next slip/contest.
* **Reads:** leaderboard by contest, activity feed, archived contests.

---

## 9) Commissioner UI States (for Codex)

The **commissioner view shows three panels at all times**, but only one is interactive based on slip status. Others are greyed (`opacity-40 pointer-events-none`) with an overlay helper line.

| Panel               | Active When                          | Disabled When                 | Helper Text                                                   |
| ------------------- | ------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| **Deadline Editor** | slip.status = `open`                 | `locked`/`finalized`/`voided` | “Editable until Pick Deadline (forward-only).”                |
| **Grading Panel**   | slip.status = `locked`               | `open`/`finalized`/`voided`   | “Unlocks after Pick Deadline.”                                |
| **Summary Panel**   | slip.status ∈ {`finalized`,`voided`} | `open`/`locked`               | “Slip is complete. You may revert until the next slip opens.” |

**Slip Controls (footer stays visible):**

* Open → **Mark Locked** (confirm).
* Locked → **Get Results** (future), **Save**, **Finalize Slip**, **Void Slip** (confirm).
* Finalized/Voided (soft) → **Revert to Locked** (confirm).
* Finalized/Voided (hard) → no actions.
* After finalize/void → system **opens next slip automatically**.

**Deadline guardrail:** moving times **backward** is not allowed; only equal/later times permitted.

---

## 10) Design Integrity / Non-Contradiction Notes

* **Two deadlines** drive everything: Pick → Results → Next Slip.
* **Soft Finalization**: finalized/voided slips are revertible until the next slip opens.
* **Hard Finalization**: once the next slip exists, prior slips are immutable.
* **Manual override only** (no streak/perfect presets in MVP).
* **No pushes** (treated as void = 0).
* **One sport per group**.
* **New contest** resets leaderboard and archives prior contest under **History**.
* Deadline edits are **forward-only** and update the default pattern for future slips.

---

## 11) Sanity Check (Why this holds together)

* **Fair & auditable**: Every mutation is time-boxed and logged; members can’t edit past the Pick Deadline.
* **Commissioner safety**: Soft finalization allows quick corrections without enabling endless retro edits.
* **UX clarity**: Always-visible panels communicate what’s next while preventing accidental edits.
* **Scalable**: Contests cleanly segment leaderboards and keep history readable.
* **Future-proof**: A results API can slot into the Grading Panel without altering rules.

---

**Last Updated:** October 2025

---
