# Migration Notes (structure cleanup)

- Components are now organized by domain:
  - `components/league/*` → `components/leagues/` (includes the empty `__tests__` scaffold).
  - `components/leaderboard/LeaderboardGrid.tsx` → `components/leagues/leaderboard/LeaderboardGrid.tsx`.
  - `components/modals/*` → `components/ui/modals/`.
  - `components/animations/FootballAnimation.tsx` → `components/ui/animations/FootballAnimation.tsx`.
- Services now live under `lib/services/` (`services/leagues.ts` moved to `lib/services/leagues.ts`).
- Scoring modal documentation moved to `docs/components/scoring-modal.md` to keep code and docs separate from UI folders.
- Imports across `app/` and `components/` now consistently use the `@/` alias so files are easier to trace regardless of nesting.

No behavior changes were intended with these moves; league screens now live under `app/league/[leagueId]`.
