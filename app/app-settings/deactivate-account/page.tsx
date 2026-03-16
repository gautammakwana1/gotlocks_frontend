"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";

const DeactivateAccountPage = () => {
    const currentUser = useCurrentUser();
    const { setToast } = useToast();

    if (!currentUser) return null;

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    account settings
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Reset or delete your account
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Review what resetting or deleting your account would mean before you take action.
                </p>
            </header>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-[var(--text-secondary)]">
                <p>
                    This account belongs to <span className="text-[var(--app-text)]">@{currentUser.username}</span>.
                </p>
                <p>
                    This screen is the placeholder entry point for reset and deletion controls. Those
                    actions are not fully wired yet.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() =>
                            setToast({
                                id: Date.now(),
                                type: "info",
                                message: "Account reset and deletion controls are not live yet.",
                                duration: 3000
                            })
                        }
                        className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                    >
                        Review account reset or deletion
                    </button>
                    <Link
                        href="/app-settings"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                    >
                        Back
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DeactivateAccountPage;
