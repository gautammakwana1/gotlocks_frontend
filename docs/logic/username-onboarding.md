# Username Onboarding (Phase 2 Plan)

This document outlines how Google sign-in pairs with the in-app username requirement. No code changes were shipped with this doc — it exists so future Codex tasks can wire the behavior without guessing.

## Inputs

- Auth user from Supabase (`auth.users`): `id`, `email`, optional `full_name`/`given_name`.
- Optional existing `profiles` row (same `id` as auth user) with `username`.

## Flow

1. User taps **Sign in with Google** on the landing page.
2. App triggers Supabase Google OAuth.
3. After Supabase returns a session:
   - Fetch the corresponding `profiles` row (keyed by auth `id`).
   - If the row does not exist, create a placeholder row with just `id` + `email` (no username yet).
4. Guard on `profile.username`:
   - If blank, push the user to a dedicated **Set Username** screen.
   - If present, route straight into the core app (groups list or intro text, depending on product copy).
5. On the Set Username screen:
   - Prefill suggestion based on Google `full_name`, but do not store that name.
   - Enforce uniqueness via a Supabase query (`profiles.username` unique constraint).
   - On save, update/insert the profile row `{ id, email, username }`.
6. After the username is saved successfully, redirect to the main experience (intro text → home → groups).

## Redirect Rules

- `profile.username` missing → always send to `/set-username` (or equivalent) before any other screen.
- `profile.username` present → skip onboarding and land in the authenticated app.
- Logging out should clear the cached profile so the guard re-runs on next login.

## Additional Notes

- `User.name` across the codebase maps to this username value — it is the only display identity.
- Email/password signups can keep using the existing Account Creation screen (already collects `username`) and can reuse the uniqueness check logic described above.
- mock data remains valid for demos/tests, but Supabase + the username gate will become the real source of truth.
