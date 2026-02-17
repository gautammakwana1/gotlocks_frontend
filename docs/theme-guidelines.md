# Theme Guidelines

These guidelines define the visual and interaction system for **gotLocks**, ensuring a consistent mobile-first experience with a confident, competitive tone.  
The goal is to provide direction — not strict hex codes — so the agent can adapt colors that best match the overall mood and brand.

---

## 🎨 Color System (Mood-Based)

| Role | Description | Notes |
|------|--------------|-------|
| **Primary Accent (Neon / Bright Green Family)** | Think vivid, electric greens similar to #00FF99 or deeper tones like #12420e. Used to spark energy, emphasize actions, and anchor the brand. | Use sparingly — one dominant accent per screen. |
| **Complementary Tones (Dark Greens / Navy / Graphite Grays)** | Deep forest greens, steel blues, and layered graphite grays form the backbone of the palette. | Combine to build structured dark-mode depth without feeling flat. |
| **Background** | Primarily black or near-black tones that evoke a scoreboard or statboard look. | Keep consistent across all screens. |
| **Text Colors** | Off-white for primary content, softer gray for labels and secondary info. | Maintain strong contrast. |
| **Feedback Colors** | Muted greens for success, subtle reds for errors — nothing oversaturated. | Keep cohesive with overall tone. |

> **Guideline:**  
> Accent colors should *complement*, not overpower.  
> Think **"dark modern sports tech"** — confident, minimal, and high contrast.

---

## 🧱 Typography

| Type | Font | Weight | Usage |
|------|------|---------|-------|
| Headings | Inter / Poppins / or similar modern sans-serif | 600–700 | Page titles, tab headers |
| Body | Inter | 400 | Paragraph text |
| Buttons / Labels | Inter | 600 | Call-to-actions, chips, or badges |

Keep text tight, legible, and vertically spaced. Use accent color sparingly for emphasis or data highlights (like scores or points).

---

## 🧩 Components & Shape Language

- **Corners:** soft (`rounded-xl` or `2xl`); never sharp.  
- **Cards:** elevated subtly on dark surfaces with gentle shadows.  
- **Buttons:** wide, clear, with minimal outlines. Prefer filled accent styles.  
- **Inputs:** matte dark fields with a faint glow or border on focus.  
- **Tabs / Nav Bar:** understated, with the active state subtly highlighted in the accent color.

---

## 📱 Layout & Spacing

- **Mobile-first:** 390–430 px width base.  
- **Spacing:** consistent 4-point grid.  
- **Safe zones:** maintain 16 px padding at edges.  
- **Vertical rhythm:** 12–20 px between stacked components.  
- **Scroll flow:** vertical scroll with fixed bottom navigation.  

---

## ✨ Animation & Interaction Feel

- **Motion feel:** confident, quick, and intentional.  
- Subtle transitions using **Framer Motion** (fade, slide-up).  
- Press → quick compress (0.96 scale).  
- Hover → mild accent glow or 10% brightness shift.  
- Keep motion under 300 ms.  

---

## 🧠 Brand Personality

- **Voice:** witty, confident, slightly competitive.  
- **Energy:** casual, locker-room banter meets clean scoreboard.  
- **Tone:** fun, assertive, and stats-driven.  
- **Tagline:** *bro knows ball.*  

---

## 🔗 Reference Notes for Codex

- Treat these colors as *guides*, not absolutes.  
- Match palettes that evoke dark sports dashboards or fantasy scoreboards.  
- Maintain contrast and balance — minimal clutter, bold action cues.  
- Ensure responsiveness (Tailwind `sm`, `md` breakpoints).  
- Always prioritize clarity, hierarchy, and accessibility over decorative detail.

---

**Last Updated:** October 2025
