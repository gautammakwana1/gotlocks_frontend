"use client";

import { ChevronIcon } from "@/components/ui/SvgIcons";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchOwnGroupsCountsRequest } from "@/lib/redux/slices/groupsSlice";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import Link from "next/link";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { GroupSelector } from "@/lib/interfaces/interfaces";

const AppSettingsPage = () => {
    const dispatch = useAppDispatch();
    const currentUser = useCurrentUser();
    const plan = useUserPlan();
    const { groupsCounts } = useSelector((state: GroupSelector) => state.group);
    const planView = getProLifetimePlanViewModel({
        plan: plan,
        offerKind: currentUser?.proLifetimeOfferKind,
        entitlement: currentUser?.proLifetimeEntitlement,
    });

    // needs_attention_count — the Arena hosting pill and the "Action needed" badge.
    useEffect(() => {
        if (!currentUser?.userId) return;
        dispatch(fetchOwnGroupsCountsRequest({}));
    }, [currentUser?.userId, dispatch]);

    if (!currentUser) return null;

    const arenaCount = groupsCounts?.counts?.owned_arena_count ?? 0;
    const arenaNeedsAttention = (groupsCounts?.counts?.needs_attention_count ?? 0) > 0;
    const planSubtitle = `${planView.currentPlanName}${arenaCount > 0 ? ` · ${arenaCount} Arena${arenaCount > 1 ? "s" : ""}` : ""
        }`;

    const rows: Array<{
        title: string;
        href: string;
        subtitle?: string;
        needsAttention?: boolean;
    }> = [
            {
                title: "Account information",
                href: "/app-settings/account-information",
            },
            {
                title: "Plan and billing",
                href: "/app-settings/plan?product=league",
                subtitle: planSubtitle,
                needsAttention: arenaNeedsAttention,
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
        <div className="mx-auto w-full max-w-4xl lg:max-w-7xl" style={{ animation: "homeFadeUp 240ms ease-out both" }}>
            <div>
                <header className="space-y-3 border-b border-[var(--border-soft)] pb-5 sm:space-y-4 sm:pb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">
                        Your Account
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                        View your account details, update your password, manage blocked accounts,
                        or review account deletion options.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]">
                            {planView.currentPlanName} plan
                        </span>
                        {arenaCount > 0 ? (
                            <span className="inline-flex rounded-full border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">
                                {arenaCount} Arena hosting
                            </span>
                        ) : null}
                    </div>
                </header>

                <div className="divide-y divide-[var(--border-soft)]">
                    {rows.map((row) => (
                        <Link
                            key={row.title}
                            href={row.href}
                            className="group flex w-full items-center gap-3 px-2 py-4 text-left transition sm:py-5 hover:bg-white/5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-medium tracking-tight text-[var(--app-text)] sm:text-xl">
                                    {row.title}
                                </p>
                                {row.subtitle ? (
                                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{row.subtitle}</p>
                                ) : null}
                            </div>
                            {row.needsAttention ? (
                                <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                                    Action needed
                                </span>
                            ) : null}
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
