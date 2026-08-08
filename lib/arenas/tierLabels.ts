import type { ArenaHostingTier } from "@/lib/domain/community/types";

/**
 * Single source of truth for Arena hosting tier display names.
 *
 * These MUST match the backend's ARENA_TIERS catalogue (src/utils/arenaConstant.ts),
 * which is what `available_tiers` on the hosting-details response is built from —
 * if they drift, the same tier shows two different names on the same screen.
 *
 * The `arena_50` / `arena_100` / `arena_250_plus` keys are the stored tier values
 * and are NOT display names; never rename those. `custom` has no backend catalogue
 * entry (it is contact-only and rejected server-side), so its label is frontend-owned
 * and matches the wording of the backend's reject message.
 */
export const ARENA_TIER_LABELS: Record<ArenaHostingTier, string> = {
    arena_50: "Club",
    arena_100: "Premier",
    arena_250_plus: "Elite",
    custom: "Arena Custom",
};

/** The tier included free for one month with the permanent Arena unlock. */
export const ARENA_INCLUDED_TIER: ArenaHostingTier = "arena_50";

export const ARENA_INCLUDED_TIER_LABEL = ARENA_TIER_LABELS[ARENA_INCLUDED_TIER];

/**
 * Label for a raw tier value, also used for hosting.scheduled_tier. An absent tier
 * means hosting has never started, which the UI reads as "Locked".
 */
export const arenaTierLabel = (tier: string | null | undefined) => {
    if (!tier) return "Locked";
    return ARENA_TIER_LABELS[tier as ArenaHostingTier] ?? tier;
};
