"use client";

import { useEffect, useState } from "react";
import type { UserPlan } from "@/lib/interfaces/interfaces";
import { getStoredPlan, PLAN_STORAGE_KEY, PLAN_UPDATED_EVENT } from "./planStorage";

/**
 * Reactive read of the stored purchase plan. Re-renders when the plan changes
 * in the same tab (PLAN_UPDATED_EVENT) or another tab (storage event).
 * Starts at "free" for a deterministic SSR/first render, then hydrates on mount.
 */
export const useUserPlan = (): UserPlan => {
    const [plan, setPlan] = useState<UserPlan>("free");

    useEffect(() => {
        const sync = () => setPlan(getStoredPlan());
        sync();

        const onStorage = (event: StorageEvent) => {
            if (event.key === PLAN_STORAGE_KEY) sync();
        };

        window.addEventListener(PLAN_UPDATED_EVENT, sync);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener(PLAN_UPDATED_EVENT, sync);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    return plan;
};
