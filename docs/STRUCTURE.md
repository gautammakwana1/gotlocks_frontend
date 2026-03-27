# Project Structure

## Routes (`app/`)
- `app/layout.tsx` wraps pages with `AppShell` and theme/providers; `app/providers.tsx` wires state and toast stack.
- Landing flow lives in `app/page.tsx`, `app/landing-page/page.tsx`, `app/account-creation/page.tsx`, and `app/intro-text/page.tsx`.
- Core experience sits under `app/group/[groupId]/` (dashboard, leaderboard, settings, slips and slip subroutes) with supporting entry points like `app/home/page.tsx`, `app/fantasy/page.tsx` (leagues/groups), `app/settings/page.tsx` (profile), `app/social/page.tsx`, and `app/pick-builder/page.tsx`.
- Auxiliary flows are in `app/cag-explained/page.tsx`, `app/cag-form/page.tsx`, `app/feedback/page.tsx`, and `app/settings/page.tsx`.

## Components (`components/`)
- `components/layout/` holds the frame: `AppShell`, `TopNav`, and `MainTabBar`.
- `components/ui/` contains shared UI (e.g., `BackButton`, `ToastStack`), overlays in `components/ui/modals/`, and visual effects in `components/ui/animations/FootballAnimation.tsx`.
- `components/groups/` stores group-centric pieces like `ModifyMembers` plus leaderboard views under `components/groups/leaderboard/`.
- `components/slips/` contains slip and pick building UI (e.g., `PickBuilder`, `SlipCategorySection`, `SlipCard`, `SlipSummary`, `SlipModeBadge`, `PickLimitIndicator`).

## State, data, and utilities (`lib/`)
- `lib/state/` exposes `appState` (mock-backed client state) and `theme` providers.
- `lib/constants.ts`, `lib/types.ts`, and `lib/styles/text.ts` centralize shared values and typography helpers.
- `lib/utils/` groups helpers for dates, IDs, and game eligibility logic.
- `lib/mockData.ts` keeps local/demo fixtures; `lib/services/` is where service-layer stubs (e.g., group deletion) now live.
- `lib/supabase/` contains browser/server Supabase clients for real data access when enabled.

## Docs (`docs/`)
- Screen, theme, and logic references remain under `docs/` (see `docs/screens/*`, `docs/theme-guidelines.md`, `docs/logic/game-logic.md`).
- Component notes and supporting guides live under `docs/components/` (e.g., `docs/components/scoring-modal.md`).
- Migration notes for this structure live at `MIGRATION_NOTES.md`.
