# Scoring Modal — gotLocks

## Purpose

Reusable, scrollable explanation for two existing surfaces:

- Profile and Global Social use **XP**.
- Traditional League Slips use **Slip Points**.

League Feed and Arena screens must use their own contextual names—**League Points** and **Arena Points**—when their explanation surfaces are added. A pick earns points in only the context where it was submitted.

## Trigger points

- Profile screen → “Scoring rules” button (`global` variant)
- Traditional League screens → “League scoring” trigger (`league` variant)
- Pick builder → contextual scoring reference

## XP mode

- Only eligible public Global Social posts earn XP.
- A winning post uses `round(20 × decimalOdds^0.55)` from its immutable accepted odds.
- Losses and voids earn zero XP and never remove XP.
- XP powers the main Profile level and Reward Room progress.
- Up to **1,000 XP per account day** may be applied in the account timezone.
- League Points, Arena Points, and Slip Points neither consume that allowance nor increase the main Profile level.

### Simplified eight-band guide

| Submitted odds | Typical XP |
| ---: | ---: |
| –300 or shorter | About 20 |
| –299 to +150 | About 25–35 |
| +151 to +500 | About 35–55 |
| +501 to +1000 | About 55–75 |
| +1001 to +2500 | About 75–120 |
| +2501 to +5000 | About 120–175 |
| +5001 to +10000 | About 175–250 |
| +10001 or longer | 250+ |

> XP is calculated using the exact odds accepted when your post is submitted.

These ranges are an approximate guide, not scoring buckets. The mathematical result remains continuous; the daily cap can reduce only the XP applied to the Profile.

Contextual explanation screens reuse this same guide with the surface-specific sentence:

- League Feed: “League Points are calculated using the exact odds accepted when your pick is submitted.”
- Arena: “Arena Points are calculated using the exact odds accepted when your pick is submitted.”

League Points and Arena Points are uncapped and do not become XP.

## Traditional Slip Points mode

| Name | Submitted odds | Slip Points on win |
| --- | ---: | ---: |
| Safe | –300 or shorter | +5 |
| Lock | –299 to –150 | +15 |
| Edge | –149 to +150 | +25 |
| Risky | +151 to +450 | +35 |
| Spicy | +451 to +850 | +45 |
| Epic | +851 or longer | +60 maximum |

- A loss earns –15 Slip Points; a void or not-found result earns zero.
- Authorized review controls may override Slip Points without changing the pick outcome.
- Vibe Slips do not affect Slip standings or award Slip Points, League Points, Arena Points, or XP.
- Slip Points never convert into League Points, Arena Points, or XP.

## Behavior

| Element | Action |
| --- | --- |
| Close button | Closes the modal and returns to the previous screen. |
| Background click | Dismisses the modal. |
| Scroll | Keeps long content usable on mobile. |

## Legal note

gotLocks does not handle money or wagers. All scoring is for entertainment, leaderboard ranking, and personal bragging rights.

Triggered from: `/docs/screens/picks-page.md` and `/docs/screens/settings.md`

**Last updated:** July 2026
