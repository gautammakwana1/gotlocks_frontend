# User Settings

![User Settings UI](./images/settings.png)

## 🧩 Purpose
Provides app-level settings accessible from any page via the top-right gear icon.  
Centralizes account controls, help info, feedback, and the complete gotLocks overview + scoring system.

---

## 🧭 Entry & Flow

**Comes from:**  
Top navigation bar → ⚙️ icon  

**Next:**  
Returns to previous screen (Home or Group) on exit.

---

## 🧱 Layout Overview

| Section | Description |
|----------|-------------|
| **Profile Info** | Displays avatar, username, and join date. |
| **Buttons** | Stacked list of universal actions — “View Rules & Scoring,” “Feedback,” “Privacy,” “Logout.” |

---

## ⚙️ Core Actions

| Button | Description |
|---------|--------------|
| **View Rules & Scoring** | Opens a scrollable modal with full gameplay explanation (see below). |
| **Send Feedback** | Opens a mock text box or link placeholder (`mailto:` style, no backend). |
| **Privacy & Terms** | Shows note: “All data in this version is stored locally — no external sharing.” |
| **Logout** | Clears mock session and returns user to the Landing Page (confirmation modal). |

---

## 🧩 User Object Example

```ts
{
  id: "u1",
  name: "Shane",
  email: "shane@gotlocks.com",
  joined_at: "2025-09-22T00:00:00Z"
}
````

---

## 🧩 gotLocks Rules & Scoring Overview Modal

### What gotLocks Is

gotLocks is a **fantasy-style sports picks and leaderboard app** — built for fun, bragging rights, and friendly competition.
You and your friends make weekly or custom “slips” of sports picks and compete for points on a running leaderboard.
The goal: **build the best record, flex your sports IQ, and earn those bragging rights**.

Every group has two simple roles:

* **Commissioner** — creates the group, chooses the sport, and finalizes results.
* **Members** — join using the invite code, make their picks, and compete week to week.

---

### How It Works

* Groups compete on recurring **“slips”** (weekly by default).
* Each slip has two key dates:

  * **Pick deadline:** when everyone must lock in their picks.
  * **Results deadline:** when final results are confirmed.
  * Both can be changed later if needed.
* After the results deadline, the slip is **final** — points lock, the leaderboard updates, and a new slip opens automatically.

---

### Scoring System

Each pick awards or subtracts points based on its odds range:

| Odds Range      | Points for Win | Points for Loss |
| --------------- | -------------- | --------------- |
| –250 or shorter | +5 pts         | –10 pts         |
| –249 to 0       | +10 pts        | –10 pts         |
| +1 to +250      | +15 pts        | –10 pts         |
| +251 to +500    | +20 pts        | –10 pts         |
| +501 and up     | +25 pts        | –10 pts         |

Commissioners can optionally assign **manual bonuses** (for streaks, perfect slips, or creative challenges) before the results deadline.

---

### Fairness & Late Joins

* Anyone with your group’s invite code can join anytime.
* If a member joins after a slip’s pick deadline, they’ll start fresh on the next slip.
* Commissioners can grant bonus points or manual adjustments to keep things fair.

---

### Voids & Missed Deadlines

* If a results deadline passes without being finalized, that slip is **voided** and awards **zero points** to everyone.
* The next slip still opens automatically, so gameplay never stops.

---

### Sports & Deadlines

* gotLocks supports any sport — football, basketball, baseball, soccer, and more.
* Default presets assume NFL Sundays but can be customized for any schedule.
* Results deadlines automatically set **2 days after** the pick lock by default, but both can be edited anytime.

---

### What Players See

* The **Home Screen** shows all groups a user belongs to.
* Inside a group, players can:

  * Submit and resubmit picks (until lock).
  * Track each slip’s results and standings.
  * View leaderboards and streaks.
  * Chat with members and follow group activity.

---

## 🏈 Building Smarter Slips

gotLocks can also be used as a **strategy tool** — helping users explore how different picks or parlay combinations would perform **in theory**.
By tracking trends, results, and performance over time, users can see which types of picks tend to score well.
Some players even use gotLocks as a “practice zone” for building hypothetical **winning parlays** — but no money or wagers are ever involved in the app itself.

---

## ⚖️ Legal & Safety Disclaimer

gotLocks is **not a gambling or sportsbook application**.

* The app does **not** collect, manage, or transfer any funds.
* All scoring and tracking are purely for entertainment and social competition.
* gotLocks does **not** promote or encourage real-money betting, gambling, or wagering of any kind.

If users choose to make real wagers externally, they do so at their **own discretion and responsibility**.
Group-based betting or “pool” behavior may violate third-party platform Terms of Service — gotLocks is not responsible for such activity.

This app is appropriate for **all users, including students and sports fans of any age**, since viewing sports odds and tracking performance is not illegal — only **placing bets** with real currency is restricted by law and by age.

---

## 🧩 Feedback / Contact Placeholder

Adds a lightweight mock feature for testing:

**Button:** “Send Feedback”
**Behavior:** Opens mock modal with message:

> “Have feedback or ideas? Send us your thoughts at [feedback@gotlocks.com](mailto:feedback@gotlocks.com) (mock only).”

No backend call — shows toast: “✅ Feedback noted (mock only).”

---

## 🧩 Codex Implementation Notes

* Local mock-only behavior (no backend).
* “View Rules & Scoring” opens inline scrollable modal (above).
* “Send Feedback” uses mock modal or `mailto:` link.
* “Logout” clears state (`useUserStore`) and routes to `/landing-page`.
* Modal content scrolls smoothly with full-width padding.

---

## 🎨 UI / UX Notes

* **Dark background**, white text, green accents.
* **Header:** lowercase “settings”.
* **Buttons:** full-width, rounded-xl, soft shadow.
* **Modal:** `rounded-2xl`, `bg-surface`, scrollable vertical layout.
* **Avatar row:** user image left, name + join date right.
* **Feedback toast:** green accent (`✅ Feedback noted`).

---

## 🔗 Connected Docs

| Area            | Reference                       |
| --------------- | ------------------------------- |
| Theme & Palette | `/docs/theme-guidelines.md`     |
| App Flow        | `/docs/app-overview.md`         |
| Logic Rules     | `/docs/logic/game-logic.md`     |
| Mock Data       | `/lib/mockData.ts`              |
| Landing Page    | `/docs/screens/landing-page.md` |

---

**Last Updated:** October 2025
