"use client";

import { greenGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const GlobalPointsShopPage = () => {
    const currentUser = useCurrentUser();

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <header className={`${greenGradientBox} p-5`}>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    global points shop
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-[var(--app-text)]">
                    Spend your points here
                </h1>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    This is the placeholder for the global rewards shop. We can wire in items,
                    pricing, and redemption flows next.
                </p>
            </header>

            <section className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-[var(--app-text)]">Shop inventory</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Reward items, bundles, and unlockables will live here once the catalog is ready.
                        </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                        coming soon
                    </span>
                </div>
            </section>
        </div>
    );
};

export default GlobalPointsShopPage;
