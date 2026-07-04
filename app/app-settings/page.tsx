"use client";

import { ChevronIcon } from "@/components/ui/SvgIcons";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import Link from "next/link";

const AppSettingsPage = () => {
    const currentUser = useCurrentUser();
    const plan = useUserPlan();
    if (!currentUser) return null;

    const rows = [
        {
            title: "Account information",
            href: "/app-settings/account-information",
        },
        {
            title: "Plan and billing",
            href: "/app-settings/plan",
        },
        {
            title: "Transaction history",
            href: "/app-settings/transaction-history",
        },
        {
            title: "Change your password",
            href: "/app-settings/change-password",
        },
        {
            title: "Blocked accounts",
            href: "/app-settings/blocked-accounts",
        },
        {
            title: "Delete your account",
            href: "/app-settings/deactivate-account",
        },
    ];

    return (
        <div className="mx-auto w-full max-w-4xl" style={{ animation: "homeFadeUp 240ms ease-out both" }}>
            <div>
                <header className="space-y-3 border-b border-[var(--border-soft)] pb-5 sm:space-y-4 sm:pb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">
                        Your Account
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                        View your account details, update your password, manage blocked accounts,
                        or review account deletion options.
                    </p>
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]">
                        {plan === "pro" ? "Founding Pro" : "Free"} plan
                    </div>
                </header>

                <div className="divide-y divide-[var(--border-soft)]">
                    {rows.map((row) => (
                        <Link
                            key={row.title}
                            href={row.href}
                            className="group flex w-full items-center gap-3 py-4 text-left transition sm:py-5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-medium tracking-tight text-[var(--app-text)] sm:text-xl">
                                    {row.title}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--app-text)]">
                                <ChevronIcon />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AppSettingsPage;
