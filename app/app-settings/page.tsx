"use client";

import { greenGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const AppSettingsPage = () => {
    const currentUser = useCurrentUser();
    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <header className={`${greenGradientBox} p-5`}>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    app settings
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-[var(--app-text)]">Preferences</h1>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Manage app-level preferences here. Profile settings remain in your profile tab.
                </p>
            </header>

            <section className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-[var(--app-text)]">Notifications</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Configure how we keep you updated. Options coming soon.
                        </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                        placeholder
                    </span>
                </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-[var(--app-text)]">App theme</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Toggle light or dark from the header. More controls arriving soon.
                        </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--brand-soft)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--brand)]">
                        brand accent
                    </span>
                </div>
            </section>
        </div>
    );
};

export default AppSettingsPage;
