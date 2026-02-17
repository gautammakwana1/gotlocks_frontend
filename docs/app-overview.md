# App Overview

**gotLocks** is a mobile-first web app for friend groups to compete on picks, leaderboards, and bragging rights — no money involved, just stats, streaks, and *“bro knows ball”* energy.

It runs on a flexible **slip + contest system** that adapts to any sport. Each group operates independently with its own rules, deadlines, and commissioner oversight.

---

## 🧭 Core Purpose

To create a **digital crew scoreboard** where users make picks, track outcomes, and flex their sports IQ across recurring rounds (“slips”).
The experience merges the fun of fantasy competition with the simplicity of stat tracking.

---

## 👥 User Roles

### **Member**

* Joins or creates groups.
* Submits picks before the **Pick Deadline**.
* Views the leaderboard, slip history, feed, and chat.
* Cannot edit picks after lock or view grading tools.

### **Commissioner**

* Group admin and rules enforcer.
* Can edit or fix member picks until lock.
* Sets **Pick** and **Results** deadlines (forward-only edits).
* Can manually lock slips early (“Mark Locked”).
* Grades results manually or via sync before **Results Deadline**.
* May apply **manual point overrides** (+/– integer) with optional reasons.
* Can void or revert slips before the next slip opens.
* Loses edit rights permanently once the next slip auto-opens.

---

## ⏱ Slip + Contest System (Universal Flow)

The system uses a **two-level cycle**:

1️⃣ **Slip** – one round of picks within a contest.
2️⃣ **Contest** – the full leaderboard cycle (e.g., a season or monthly challenge).

Each slip progresses through three key phases:

| Phase                   | Who Controls | Description                                                         |
| ----------------------- | ------------ | ------------------------------------------------------------------- |
| **Pick Window**         | Members      | Picks open for submission. Ends at Pick Deadline.                   |
| **Locked / Grading**    | Commissioner | Members frozen. Commissioner grades results or applies overrides.   |
| **Finalization / Void** | System       | At Results Deadline, slip auto-finalizes or voids. Next slip opens. |

### System Rules

* **Auto-lock at Pick Deadline.**
* **Auto-finalize or auto-void at Results Deadline.**
* **Soft Finalization:** Commissioner can revert finalized/voided slips *until* the next slip opens.
* **Hard Finalization:** Once the next slip exists, prior ones become read-only.
* **Forward-only edits:** Deadlines can only move later, never earlier.

---

## 🏈 Default Preset (Football Mode)

While gotLocks supports any sport, it ships with an **NFL-style preset** for fast onboarding.

| Setting              | Default                       | Notes                                          |
| -------------------- | ----------------------------- | ---------------------------------------------- |
| **Sport Type**       | Football (NFL)                | Default for new groups.                        |
| **Pick Deadline**    | Sunday 12:00 AM ET            | Locks before Sunday games.                     |
| **Results Deadline** | Tuesday 11:59 PM ET           | Grading window for commissioner.               |
| **Slip Names**       | “Week 1”, “Week 2”, “Week 3”… | Auto-generated unless custom-named.            |
| **Contest Rhythm**   | Multiple slips per contest    | Each contest becomes a full leaderboard cycle. |

Changing sport type during setup adjusts colors and defaults but preserves identical slip logic.

---

## ⚙️ Commissioner Tools Summary

The **commissioner dashboard** (Group Settings → Commissioner Tab) always shows three panels side-by-side or stacked:

1. **Deadline Editor** – Active when slip is *Open*.
2. **Grading Panel** – Active when slip is *Locked*.
3. **Summary Panel** – Active when slip is *Finalized/Voided*.

Non-active panels are visible but disabled (greyed with overlay text).
Slip controls (footer actions) dynamically change:

* **Open:** Mark Locked (confirm).
* **Locked:** Grade Picks → Save → Finalize Slip / Void Slip.
* **Finalized/Voided (soft):** Revert to Locked.
* **Finalized/Voided (hard):** Read-only.

---

## 📊 Leaderboards & History

* Each **contest** has its own leaderboard.
* Each **slip** is one column in that leaderboard.
* Cumulative points update per contest.
* **Voided slips** appear in grey, worth 0 points.
* When a **new contest** starts, a new leaderboard is created and the old one is archived under **History**.
* History is view-only and retains all slip data for transparency.

---

## 📱 Design System Reference

* Guided by `theme-guidelines.md`.
* Mobile-first, dark palette (forest / graphite / navy).
* Rounded-2xl corners, simple vertical layout.
* Bottom tabs: **Home**, **Picks**, **Leaderboard**, **Feed**.
* In each group, top-right **⚙️ Settings** opens user-level and commissioner controls.

---

## 🧠 Brand Essence

* **Tagline:** *bro knows ball.*
* **Voice:** confident, witty, stats-meet-social.
* **Energy:** locker-room banter meets scoreboard discipline.
* **Promise:** stay competitive without the cash — fun, transparent, brag-worthy.

---

**Last Updated:** October 2025

---
