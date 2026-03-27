# Scoring Modal — gotLocks

## Purpose
Reusable component that displays the complete scoring breakdown wherever needed (e.g. **Picks**, **Settings**, or **Leaderboard**).  
Lightweight and scrollable — opens as a centered overlay.

---

## Trigger Points

- Picks screen → “View full scoring” link  
- Settings screen → “View Rules & Scoring” button  
- Optional reuse in Leaderboard hover tooltips  

---

## Content

### 🏅 Scoring System

Each pick earns or loses points based on its odds range:

| Odds Range | Points for Win | Points for Loss |
|-------------|----------------|----------------|
| –250 or shorter | +5 pts | –10 pts |
| –249 to 0 | +10 pts | –10 pts |
| +1 to +250 | +15 pts | –10 pts |
| +251 to +500 | +20 pts | –10 pts |
| +501 and up | +25 pts | –10 pts |

---

### 💬 How Scoring Works

- You’ll earn points when your pick wins, based on its odds range.  
- Any incorrect pick always costs –10 points.  
- You can resubmit your pick until the **group deadline** — only your final submission counts.  
- Commissioners can award **manual bonuses** for streaks, perfect slips, or other creative reasons before results lock.  

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

- `rounded-2xl` container with `bg-surface` background  
- Header: “Scoring System” (white, bold)  
- Text color: `text-gray-200`  
- Table accent lines: green  
- Appears centered with dimmed backdrop  
- Close button at bottom or top-right  

Triggered from: /docs/screens/picks-page.md and /docs/screens/settings.md

---

**Last Updated:** October 2025
