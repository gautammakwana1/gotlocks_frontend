"use client";

import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchOwnGroupsCountsRequest } from "@/lib/redux/slices/groupsSlice";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { GroupSelector } from "@/lib/interfaces/interfaces";
import {
    SettingsGroupHeader,
    SettingsHeader,
    SettingsNavRow,
    SettingsPage,
} from "@/components/settings/SettingsUI";

/* ============================================================================
 * ACCOUNT SETTINGS — the hub.
 *
 * The MVP groups these rows rather than listing them flat: Account and
 * security, Billing, then a Danger zone that carries its own red group header
 * and row tone. Grouping is the whole point of the redesign — "Delete your
 * account" sitting one row below "Blocked accounts" in an undifferentiated list
 * is how people click it by accident.
 * ========================================================================== */

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

    const accountRows: Array<{
        title: string;
        href: string;
        description: string;
    }> = [
            {
                title: "Account information",
                href: "/app-settings/account-information",
                description: "Name, username, email, and profile visibility",
            },
            {
                title: "Change your password",
                href: "/app-settings/change-password",
                description: "Update the password you use to sign in",
            },
            {
                title: "Blocked accounts",
                href: "/app-settings/blocked-accounts",
                description: "Review and manage people you have blocked",
            },
        ];

    const billingRow = {
        title: "Plan and billing",
        /* An Arena that needs attention is the reason someone opened this row,
         * so the link lands on that product rather than making them switch. */
        href: arenaNeedsAttention
            ? "/app-settings/plan?product=arena"
            : "/app-settings/plan?product=league",
        description: `League: ${planView.currentPlanName} · ${arenaCount > 0
            ? `${arenaCount} owned Arena${arenaCount === 1 ? "" : "s"}`
            : "No owned Arenas"
            }`,
        needsAttention: arenaNeedsAttention,
    };

    const deleteRow = {
        title: "Delete your account",
        href: "/app-settings/deactivate-account",
        description: "Review dependencies and permanently remove your account",
    };

    return (
        <SettingsPage style={{ animation: "homeFadeUp 240ms ease-out both" }}>
            <SettingsHeader title="Account settings" />

            <nav aria-label="Account settings">
                <section
                    aria-labelledby="account-settings-group"
                    className="border-b border-[var(--border-soft)] pb-2"
                >
                    <SettingsGroupHeader id="account-settings-group">
                        Account and security
                    </SettingsGroupHeader>
                    {accountRows.map((row) => (
                        <SettingsNavRow
                            key={row.title}
                            href={row.href}
                            title={row.title}
                            description={row.description}
                        />
                    ))}
                </section>

                <section
                    aria-labelledby="billing-settings-group"
                    className="border-b border-[var(--border-soft)] pb-2"
                >
                    <SettingsGroupHeader id="billing-settings-group">
                        Billing
                    </SettingsGroupHeader>
                    <SettingsNavRow
                        href={billingRow.href}
                        title={billingRow.title}
                        description={billingRow.description}
                        trailing={
                            billingRow.needsAttention ? (
                                <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100 shadow-sm">
                                    Action needed
                                </span>
                            ) : null
                        }
                    />
                    {/* Transaction history is deliberately NOT a row here. It is
                        reached from inside Plan and billing, which is where the
                        MVP puts every receipt-level detail. */}
                </section>

                <section
                    aria-labelledby="danger-settings-group"
                    className="border-b border-[var(--border-soft)] pb-2"
                >
                    <SettingsGroupHeader id="danger-settings-group" tone="danger">
                        Danger zone
                    </SettingsGroupHeader>
                    <SettingsNavRow
                        href={deleteRow.href}
                        title={deleteRow.title}
                        description={deleteRow.description}
                        tone="danger"
                    />
                </section>
            </nav>
        </SettingsPage>
    );
};

export default AppSettingsPage;
