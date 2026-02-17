# Group Card (Group Hub)

## 🧩 Purpose
The **Group Card** is the central hub for each group in gotLocks.  
It houses all main interactions — picks, leaderboard, chat, and activity feed — while dynamically adjusting layout and permissions based on the user’s role (Commissioner vs Member).

Each Group Card represents:
- One **Group**
- One **Active Slip** (open, locked, finalized, or voided)
- One **Contest Cycle** (Infinite, Custom, or Monthly)

---

## 🧱 Structure

**Entry Point:**  
From **Home**, tapping a group card opens its dedicated hub.

**Tabs / Sections (top tab layout):**
1. **Leaderboard**
2. **Make Your Pick**
3. **Current Slip**
4. **Chat**
5. **Feed / Notifications**
6. *(Commissioner Only)* **Settings**

---

## 🪪 Header Elements

| Element | Source | Description |
|----------|---------|-------------|
| **Group Name** | group.name | Prominent top-left label |
| **Sport Type** | group.sport_type | Displayed beneath name (e.g., “NFL”) |
| **Invite Code** | group.invite_code | Visible to everyone; tap-to-copy with toast “Copied!” |
| **Slip Status** | slips[n].status | “Open / Locked / Finalized / Voided” |
| **Deadlines** | slips[n].pick_deadline_at / results_deadline_at | Shown in local time, e.g. “Sunday 12:00 AM ET” |
| **Contest Style** | group.contest_style | “Infinite / Custom / Monthly” |
| **Commissioner Badge** | conditional | Shown for the group creator |

---

## 🧍 Role-Based Views

| Role | Permissions | UI Differences |
|------|--------------|----------------|
| **Commissioner** | • Edit deadlines, contest style, or sport. <br>• Finalize or void slips. <br>• Assign bonuses or penalties. <br>• Override results before results deadline. | • Access “Settings” tab. <br>• Editable group info and contest controls. |
| **Member** | • Submit picks before pick deadline. <br>• View results and leaderboard. | • No Settings tab. <br>• Read-only after pick lock. |

**Both Roles Can:**
- Submit tehir individual picks.
- View leaderboard standings.  
- Track slip progress.  
- View group feed and chat.  
- Copy and share invite code.

---

## 🕹 Slip States

| Status | Description | User Impact |
|---------|--------------|-------------|
| **Open** | Members can create or edit picks. | Commissioner may adjust deadlines or details. |
| **Locked** | Pick deadline passed — awaiting results. | Members read-only; Commissioner can enter results or apply bonuses. |
| **Finalized** | Slip completed — points applied to leaderboard. | Archived in history; new slip opens automatically. |
| **Voided** | Missed results deadline — zero points for everyone. | Auto-opens new slip on schedule. |

> ⚙️ Only one slip is active per group at a time.

---

## 🧮 Leaderboard Integration
- Pulls data from `/lib/mockData.ts → mockLeaderboard`.
- Displays both *slip-level* and *cumulative* totals.
- Includes per-slip horizontal scrolling (Slip 1, Slip 2, Slip 3…).
- Voided slips appear in gray with 0-point totals.
- Commissioners can rename slips (e.g. “Week 3: Rivalry Week”).

---

## 💬 Activity Feed & Chat
- **Feed:** logs all user actions (picks, overrides, results changes).
- **Chat:** lightweight message thread per group.
- New messages or feed events show a badge indicator in tab header.

---

## ⚙️ Commissioner Settings (Built-In Tab)

> This is the internal **Settings** sub-tab visible only to the Commissioner.

## Data Behavior
Writes to:
- `mockPicks[]` — allows commissioner to edit or override pick outcomes.
- `mockLeaderboard[]` — updates points for overrides, bonuses, or penalties before results deadline.


### Editable Fields
- **Group Name / Description**
- **Sport Type**
  - Preset or custom; editable anytime.
- **Deadlines**
  - Pick Deadline and Results Deadline can be changed anytime.
  - Default offset: Results = 2 days after Pick.
  - Presets (NFL / MLB / NBA / Soccer / NCAAF / NCAAB).
- **Contest Style**
  - Infinite (default) | Custom (choose end date) | Monthly (reset 1st each month).
- **Slip Naming**
  - Rename active slip (e.g., “Week 5 – Prime Time Lock In”).
- **Bonuses / Penalties**
  - Manual point adjustments before results deadline.

### Controls
- End contest early → triggers “Start Next Contest” prompt.
- Start new contest → reuses same group and resets leaderboard.
- Delete group → confirmation modal (future build).
- Copy invite message → prefilled text below.

### Prefilled Invite Message
```

Join my gotLocks crew “Sunday Locks”!
Hit (URL) to sign up, then drop code 48219 on your Home screen.
Lock in your picks and prove you know ball 🔥🏈

```

Tapping “Copy Message” copies both URL and invite code.

---

## 🧠 Start Next Contest Prompt
When a contest ends or is ended manually:
> “This contest has ended — ready to start the next one?”
Selecting **Start Next Contest** opens the *Contest Style* setup again (same as Create a Group Screen 2).

---

## 🎨 UI / UX Notes
- **Top tab layout** — not bottom.
- **Sticky header** with group name, sport, and invite code.
- Tabs use **accent highlight** for active state (`COLORS.ACCENT`).
- Smooth motion transitions between tabs.
- All screens mobile-first and vertically stacked.
- “Settings” tab appears only for Commissioner role.

---

## ⚠️ Edge & State Cases
- Commissioner leaves → leadership transfer modal appears.
- New member joins mid-contest → starts scoring next slip.
- Deadline changes apply forward, not retroactively.
- Contest style = Monthly auto-resets leaderboard each month.
- Group deletion = soft delete (future enhancement).

---

## 🔗 Connected Docs

| Area | Reference |
|------|------------|
| Logic Rules | `/docs/logic/game-logic.md` |
| Mock Data | `/lib/mockData.ts` |
| Constants | `/lib/constants.ts` |
| Picks Screen | `/docs/screens/group-picks.md` |
| Leaderboard | `/docs/screens/group-leaderboard.md` |
| Current Slip | `/docs/screens/group-slip.md` |
| Chat | `/docs/screens/group-chat.md` |
| Feed | `/docs/screens/group-feed.md` |

