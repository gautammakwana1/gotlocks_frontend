# Badge category icons

Drop the six badge artwork PNGs here, one per badge category. Filenames must
match exactly (referenced by `lib/contests/badgeVisuals.ts`):

| File | Category | Artwork |
| --- | --- | --- |
| `generic.png` | generic | trophy |
| `football.png` | football (NFL / NCAAF) | football |
| `nba.png` | nba | basketball |
| `mlb.png` | mlb | baseball |
| `nhl.png` | nhl | hockey |
| `soccer.png` | soccer | soccer ball |

All badges in a category share the same icon; the league is distinguished by a
coloured ring/glow (the "tint") applied at render time, not by separate images.
Square PNGs with transparent backgrounds, ~200×200 or larger, look best.
