# Migration Notes (structure cleanup)

- Components are now grouped by domain:
  - `components/group/*` → `components/groups/` (includes the empty `__tests__` scaffold).
  - `components/leaderboard/LeaderboardGrid.tsx` → `components/groups/leaderboard/LeaderboardGrid.tsx`.
  - `components/modals/*` → `components/ui/modals/`.
  - `components/animations/FootballAnimation.tsx` → `components/ui/animations/FootballAnimation.tsx`.
- Services now live under `lib/services/` (`services/groups.ts` moved to `lib/services/groups.ts`).
- Scoring modal documentation moved to `docs/components/scoring-modal.md` to keep code and docs separate from UI folders.
- Imports across `app/` and `components/` now consistently use the `@/` alias so files are easier to trace regardless of nesting.

No behavior changes were intended with these moves; the Next.js route structure under `app/` was left untouched.
