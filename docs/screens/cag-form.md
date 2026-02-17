# Create a Group (CAG) — Sequential Form Flow

## Purpose

Guides a new user through setting up their **gotLocks** group.
The creator becomes the **Commissioner**, controlling contests, deadlines, and results.
This flow is **step-by-step**, one screen per question — with back navigation but no skips.

---

## Commissioner Role

Creating a group makes the user its **Commissioner**.
Commissioners:

* Set up the contest and sport.
* Control deadlines and scoring flow.
* Finalize results and approve points.

Members:

* Join via invite code.
* Submit picks and track leaderboards.
* Can’t edit or override results.

---

## Flow Overview

**Comes from:** Home → “Create a Group”
**Next:** Simple success screen → Home (group auto-appears)
**Type:** Sequential guided form

---

## Screen 1 — Group Name + Description

**Prompt:**

> “Let’s start with your group details.”

**Inputs:**

* **Group Name** *(required, 30 chars max)*

  * Placeholder: “Sunday Locks”
  * Must be unique.
* **Description** *(optional, 100 chars max)*

  * Placeholder: “Weekly NFL picks with the crew.”

**Validation:**

* Name required.
* Description optional.
* Continue only when valid.

---

## Screen 2 — Contest Style

**Prompt:**

> “How long should your first contest in this group last?”

**Hint:**

> You can run multiple contests in one group — just not at the same time.
> When one ends, you can start another right after.

**Options:**

1. **Infinite** — continues until you end it manually.
2. **Custom End Date** — select a specific end date.
3. **Monthly Reset** — leaderboard restarts automatically every month.

> The selected contest style defines how long each leaderboard cycle lasts before results are archived.

**Stored as:**

```ts
contest_style: "infinite" | "custom" | "monthly"
end_date?: string
```

When a contest ends, results finalize and archive under *Historical Leaderboards.*
Commissioners get a prompt:

> “This contest is over — want to start your next one?”

---

## Screen 3 — Sport & Deadlines

**Prompt:**

> “What sport are you setting up, and when should picks lock?”

### If a Preset Sport is Selected

| Sport  | Default Pick Lock  | Default Results Deadline |
| ------ | ------------------ | ------------------------ |
| NFL    | Sunday 12:00 AM    | Tuesday 11:59 PM         |
| MLB    | Monday 12:00 AM    | Wednesday 11:59 PM       |
| NBA    | Tuesday 12:00 AM   | Thursday 11:59 PM        |
| Soccer | Wednesday 12:00 AM | Friday 11:59 PM          |
| NCAAF  | Saturday 12:00 AM  | Monday 11:59 PM          |
| NCAAB  | Friday 12:00 AM    | Sunday 11:59 PM          |

> These presets are *light suggestions only* — both pick and results deadlines can be freely changed here or anytime later under Group Settings.

### If “Custom” is Selected

* Sport name text input *(required)*
* Manual pick lock and results date-time pickers appear.

**Default Logic:**

> The results deadline automatically defaults to **48 hours after** the pick lock time.
> Commissioners can adjust this anytime — even switch to daily or irregular cycles.

**Storage:**

```ts
sport_type: string
pick_deadline_at: string
results_deadline_at: string
```

---

## Screen 4 — Confirmation

**Prompt:**

> “One last check before you go live.”
> “All set! Ready to create your group?”

**On Confirm:**

1. Generates unique 5-digit invite code.
2. Adds new group and empty Slip 1 to mock data.
3. Displays success screen with shareable message.
4. Auto-redirects to Home (new group visible).

---

## Screen 5 — Success Screen

**Header:** ✅ “Your group is live!”
**Subtext:**

> Your first contest and Slip 1 are ready to roll. Share the message below so friends can join and start making picks.

### Message Display

```
Join my gotLocks crew “Sunday Locks”!  
Hit (URL) to sign up, then drop code 48219 on your Home screen.  
Lock in, make your picks, and prove you know ball — bragging rights only 🔥🏈
```

### Button

**Copy Message** — Copies the entire message *(including invite code)* to clipboard.

✅ Toast confirmation:

> “Message copied — share it with your crew!”

### After Copy

* Brief 2 s confirmation.
* Automatically redirects to **Home**.
* New group card appears at top of list.

---

## Post-Contest Flow — “Start Next Contest”

When a contest reaches its end date or the Commissioner manually closes it, the group enters an **Ended State.**
At this point, the Commissioner sees a single-screen prompt to start the next contest.

**Trigger:**

* Contest duration reached (Custom or Monthly) or Commissioner ends Infinite contest.
* Group leaderboard and slip data finalize; results archived under *Historical Leaderboards.*

**Prompt:**

> “Your contest has ended. Want to start your next one?”

**Behavior:**
Reuses the **Contest Style** screen logic from the Create-a-Group flow — same inputs and validation, different context and copy.

### Inputs

1. **Contest Style** — Infinite | Custom | Monthly
2. **Custom End Date** (if applicable)
3. **Confirm** button

**Header:** “Next contest ready?”
**Body:**

> “Choose how long your next leaderboard should run. You can change or end it anytime.”

**Confirm Action:**

* Archives previous contest data.
* Resets leaderboard to zero.
* Creates new Slip 1 under same group.
* Redirects to Home with refreshed contest shown on top.

**Notes:**

* Keeps all existing members; invite code unchanged.
* New contest inherits previous sport and deadlines by default (editable later).
* Automatically increments contest index (e.g., Contest #2, Contest #3 …).
* Back button returns to Historical Leaderboards view.

---

## UI / UX Notes

* Each step is a **full-screen prompt.**
* “Back” top-left, “Next” bottom-center.
* Progress indicator (e.g., 1/3, 2/3).
* Smooth slide transitions.
* Minimal text, conversational tone.
* Final step is static (no modal, no animation).

---

## Connected Docs

| Area            | Reference                   |
| --------------- | --------------------------- |
| Theme & Palette | `/docs/theme-guidelines.md` |
| App Flow        | `/docs/app-overview.md`     |
| Logic Rules     | `/docs/logic/game-logic.md` |
| Mock Data       | `/lib/mockData.ts`          |
| Constants       | `/lib/constants.ts`         |

## Data Behavior
Writes to:
- `mockGroups[]` — creates new group entry.
- `mockSlips[]` — seeds first slip (Slip 1).
- `mockLeaderboard[]` — initializes leaderboard records for group members.
