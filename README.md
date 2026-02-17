# gotLocks Codex Setup Guide

This repository provides full context for Codex to generate the **frontend skeleton** of gotLocks — a mobile-first web app for tracking sports picks, leaderboards, and group competitions.

---

## 🧠 Objective

Codex should:

* Build the **frontend UI and logic** according to the `/docs` folder.
* Keep `lib/mockData.ts` + `AppState` working for local prototyping/demos while Supabase coverage ramps up.
* Simulate state changes (locks, results, points) locally until the corresponding Supabase endpoints land.
* When a task calls for backend integration, use the helpers in `lib/supabase/` (and future `lib/services/` modules) to talk to Supabase — no other APIs.
* Continue to rely on the docs here for data shapes, flows, and UX.

---

## Phase 2 — Supabase Integration

**Phase 1**

* Relied on `lib/mockData.ts` plus in-memory `AppState` as a fake backend so we could iterate on UI + game logic without latency or schema concerns.
* Every action (auth, groups, slips, picks, leaderboard updates) lived entirely in React state, making it easy to prototype flows.

**Phase 2 (current)**

* Supabase (Postgres + Auth) becomes the **source of truth** for users, groups, slips, picks, leaderboards, and activity feed.
* `lib/state/appState.tsx` will evolve into a UI cache/state manager that hydrates from Supabase instead of `mockData`.
* `lib/mockData.ts` stays available for demos/tests and story-style fixtures, but **is no longer the long-term production source of truth**.

This repo now contains Supabase client helpers so future tasks can begin swapping mock calls for real Supabase reads/writes without rebuilding the scaffolding each time.

---

## 📂 Folder Overview

| Folder                      | Description                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `/docs/theme-guidelines.md` | Color palette, fonts, spacing, and UI tone.                         |
| `/docs/app-overview.md`     | Overall app flow and navigation structure.                          |
| `/docs/logic/game-logic.md` | Rules for pick behavior, deadlines, scoring, and leaderboard logic. |
| `/docs/screens`             | Screen-by-screen UI breakdown and interactive logic instructions.   |
| `/docs/STRUCTURE.md`        | Current folder layout, component grouping, and key entry points.    |
| `/lib/mockData.ts`          | Dummy data for Codex to simulate backend reads/writes.              |

---

## 🧩 Rules for Codex

* Use **Next.js + TypeScript**, **Tailwind CSS**, and a **mobile-first layout**.
* Phase 2 tasks may now call Supabase using the helpers in `lib/supabase/*` and grow a services layer (e.g., `lib/services/`) that wraps database reads/writes.
* `lib/mockData.ts` is treated as seed/demo data. It is fine for demos/tests but should not stay the production source of truth.
* `lib/state/appState.tsx` currently operates entirely on mock data, but Phase 2 tasks may replace individual actions with Supabase-backed calls (this task has **not** changed any behaviors yet).
* Continue reading existing docs before coding UI/logic updates so flows stay accurate.
* When mocking behavior, it is still acceptable to use local async stubs such as:

```ts
// Simulated fetch
const fetchPicks = async () => mockPicks
```

---

### Username as the canonical display name

* Users are always identified by their **in-app username** (`User.name`), not their legal name.
* Username selection happens during onboarding. Email/password signups choose it within the form; Google sign-in users pick one immediately after their first successful OAuth flow.
* Real names returned by Google Auth are only used to suggest a username — they are not stored as the display identity for gameplay, chat, groups, or leaderboards.

---

## 🧭 Navigation Flow

**Global flow:**
landing page → account creation → intro text → home → individual group

**Within a group:**
picks → leaderboard → slip → chat → feed → back to home

**Home functions:**

* “Create Group” → opens group creation form
* “Join Group” → enter group code
* Displays all groups the user belongs to (each card links into that group’s flow)

---

## ⚙️ Implementation Notes

* Codex should use this guide and the supporting `.md` files as its **master instruction set**.
* Each screen’s behavior, state structure, and UI layout are defined in their respective `docs/screens/[screen-name].md` files.
* When implementing a feature, **reference those individual screen docs for specific functional context** (form inputs, buttons, conditional logic, etc.).
* Use `/docs/logic/game-logic.md` as the source of truth for time-based or rules-based behavior.
* Maintain full consistency with color, spacing, and typography defined in `/docs/theme-guidelines.md`.

---

## ⚡ Output Expectation

Codex should produce:

1. A **fully functional frontend prototype** that still works end-to-end with mock data today.
2. Local-only interactivity for any flows that are not yet wired to Supabase (state-driven UI, no external API).
3. Screens that visually and logically represent the gotLocks experience, ready for incremental Supabase-backed integration.

---

## 🧰 Local Development Notes

To start the dev server locally:
`npm run dev`

Then open [http://localhost:3000](http://localhost:3000)

Deployment target: **Vercel**

This repo uses **Next.js + TypeScript**.

---

**Final Goal:**
A playable, mobile-optimized **frontend prototype** that mirrors the real app flow and logic, giving us breathing room to layer in Supabase as the production backend without losing UI velocity.

---

## Changelog

- 2025-Phase2: Added Supabase client helpers and documented Phase 2 direction, username rules, and Google sign-in onboarding expectations.
