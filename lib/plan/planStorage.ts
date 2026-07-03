import type { UserPlan } from "@/lib/interfaces/interfaces";
import { getLocalStorage, removeLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";

/**
 * Single source of truth for the current user's purchase plan ("free" | "pro"),
 * persisted in localStorage so it survives reloads and is shared across tabs.
 * Kept in sync from the Redux success reducers wherever the plan is learned
 * (plan overview, plan switch, groups counts, member profile).
 */
export const PLAN_STORAGE_KEY = "userPlan";
export const PLAN_UPDATED_EVENT = "plan:updated";

export const normalizePlan = (plan?: string | null): UserPlan => (plan === "pro" ? "pro" : "free");

export const getStoredPlan = (): UserPlan => normalizePlan(getLocalStorage<string>(PLAN_STORAGE_KEY));

/**
 * Persist the latest plan and notify same-tab subscribers (useUserPlan).
 * No-ops on a falsy value so a partial API response never clobbers a known plan.
 */
export const setStoredPlan = (plan?: string | null): void => {
    if (!plan) return;
    setLocalStorage(PLAN_STORAGE_KEY, normalizePlan(plan));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PLAN_UPDATED_EVENT));
    }
};

export const clearStoredPlan = (): void => removeLocalStorage(PLAN_STORAGE_KEY);
