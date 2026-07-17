# gotLocks Local Product Prototype

This repository is the local gotLocks **UI, domain-architecture, and product-behavior prototype**. It is a functional and visual handoff that demonstrates how the product should look and behave; it is not the production repository.

The prototype is intentionally built around Next.js, TypeScript domain types, mock fixtures, local application state, reusable components, and tests. Product flows should work end to end without depending on a live backend or vendor.

## What belongs in this repository

- Mobile-first routes, screens, components, and interactions.
- Product terminology and TypeScript domain models.
- Local permissions, plan limits, contest lifecycles, scoring, and state transitions.
- Mock data and deterministic mock adapters for pricing, grading, and simulated billing states.
- Unit, state, and UI tests that characterize product behavior.
- Documentation that gives the production developer clear invariants and acceptance criteria.

`lib/mockData.ts` and `lib/state/appState.tsx` currently act as the local data source and in-memory application state. A browser refresh may reset locally simulated changes. Local permission checks demonstrate the intended UX, but they are not a production security boundary.

## Production infrastructure is out of scope

Production work will happen separately. Do not add or expand production infrastructure here, including:

- Supabase schemas, SQL migrations, row-level-security policies, generated production database types, or data backfills.
- Production authentication middleware, API routes, service-role workflows, or persistent services.
- Real odds-provider or grading-provider calls, background jobs, or notification delivery.
- Real payment collection, checkout sessions, subscriptions, billing webhooks, or vendor credentials.
- Production deployment infrastructure, monitoring, or operational migration tooling.

The existing files under `lib/supabase/` are legacy scaffolding, not the prototype's source of truth and not a signal to begin a Supabase integration. External behavior should be represented through local, deterministic interfaces that a production developer can replace later.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes and screen composition. |
| `components/` | Reusable product and UI components. |
| `lib/types.ts` | Current shared product types. |
| `lib/mockData.ts` | Local fixtures used by the prototype. |
| `lib/state/appState.tsx` | In-memory state and product actions. |
| `lib/` | Domain rules, scoring, limits, helpers, and tests. |
| `docs/domain/` | Baselines and domain handoff documentation. |
| `docs/components/` | Component-specific behavior notes. |

The current traditional League Contest/Slip behavior is recorded in [`docs/domain/league-slip-baseline.md`](docs/domain/league-slip-baseline.md). The Pass 1–2 scoring and community-domain handoff is documented in [`docs/domain/community-domain-model.md`](docs/domain/community-domain-model.md).

Scoring is deliberately separated into [`lib/scoring/slipPoints.ts`](lib/scoring/slipPoints.ts), the shared exact-odds utility in [`lib/scoring/oddsBasedPoints.ts`](lib/scoring/oddsBasedPoints.ts), contextual routing in [`lib/scoring/context/`](lib/scoring/context/), and XP account-day cap handling in [`lib/scoring/dailyXp.ts`](lib/scoring/dailyXp.ts).

## Product identity rule

Users are identified throughout gameplay, chat, Leagues, and leaderboards by their in-app username (`User.name`), not by a legal name. A real name returned by an authentication provider may eventually suggest a username, but it is not the gameplay display identity.

## Navigation orientation

The primary flow is:

`landing -> account creation -> onboarding -> home -> League`

Within a League, the prototype exposes picks, leaderboards, Slips, chat, and feed-oriented experiences. Home provides League creation and joining flows and links to every League the current user belongs to.

## Local development

Install dependencies and start the development server:

```sh
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Useful checks:

```sh
npm test
npm run lint
npm run build
```

This project uses Next.js, TypeScript, Tailwind CSS, and Vitest.

## Working convention

Keep prototype behavior deterministic and locally testable. Preserve existing product flows while evolving domain boundaries, and document any intentional behavior change. When a future production implementation needs a trusted value or permission check, capture that requirement in the domain handoff instead of building the production backend here.
