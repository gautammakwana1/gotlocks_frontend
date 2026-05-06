# Scoring Modal — gotLocks

## Purpose
Reusable component that displays the scoring breakdown for either **profiles (post XP)** or **leagues (leaderboard scoring)**.  
Lightweight and scrollable — opens as a centered overlay.

---

## Trigger Points

- Profile screen → “Profile scoring rules” button (global)  
- League screens → “League scoring” trigger (league)  
- Pick builder → “Scoring” reference link (league)  

---

## Content

### 🧭 Scoring Modes

**Profile scoring (post XP)**
- Uses the full Tier 1-14 table (see `ODDS_BRACKETS` in `lib/constants.ts`).  
- Wins add tier XP to profile progression. Losses only mark the post as a loss.  
- Post XP is awarded on wins only and capped at **1,000 XP per day**.  

**League leaderboard scoring (Epic cap)**
- Uses the same tier table, but caps at **Epic** (higher odds score as Epic).  
- Awarded points can override tier points during review.  
- Vibe slips do not impact league standings or profile XP.  

---

### 🏅 League Table (Cap Preview)

| Name | Odds Range | Win Points |
|------|------------|------------|
| Safe | -300 or less | +5 pts |
| Lock | -299 to -150 | +15 pts |
| Edge | -149 to +150 | +25 pts |
| Risky | +151 to +450 | +35 pts |
| Spicy | +451 to +850 | +45 pts |
| Epic | +851 or greater | +60 pts |

---

### ⚖️ Legal Note

gotLocks does **not handle money or wagers**.  
All scoring is purely for entertainment, leaderboard ranking, and personal bragging rights.

---

## Behavior

| Element | Action |
|----------|--------|
| “Close” button | Closes modal and returns to previous screen. |
| Background click | Dismisses modal. |
| Scroll | Smooth, mobile-optimized. |

---

## UI / UX Notes

- `rounded-xl` container with `border-slate-800/80` + `bg-black/85`  
- Header: title + subtitle, `text-white` / `text-gray-400`  
- Section headers: `text-sky-200`  
- Row cards: `rounded-2xl` cards with subtle borders  
- Appears centered with dimmed backdrop  
- Close button: small circular `x` button in header  

Triggered from: /docs/screens/picks-page.md and /docs/screens/settings.md

---

**Last Updated:** February 2026
