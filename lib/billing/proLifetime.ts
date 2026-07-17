import { ProLifetimeEntitlement, ProLifetimeOfferKind, UserPlan } from "../interfaces/interfaces";

export type ProLifetimeOffer = {
    kind: ProLifetimeOfferKind;
    name: "Founding Pro" | "Standard Pro";
    amountCents: 1000 | 2000;
    priceLabel: "$10" | "$20";
    cadenceLabel: "one time";
    entitlements: readonly string[];
};

export const FREE_PLAN_SUMMARY =
    "Own up to 2 Leagues. Each League supports 10 regular members, 3 active standard Slip contests, and 1 separate active Feed contest.";

export const PRO_PLAN_SUMMARY =
    "Own up to 5 Leagues. Each League supports 15 regular members, 6 active standard Slip contests, and 3 separate active Feed contests.";

export const PRO_LIFETIME_ENTITLEMENTS = [
    "Own up to 5 Leagues",
    "Up to 15 regular members per League",
    "Up to 6 active standard Slip contests per League",
    "Up to 3 separate active Feed contests per League",
    "Pro Slip controls and League badge-point customization",
] as const;

export const PRO_LIFETIME_OFFERS: Record<ProLifetimeOfferKind, ProLifetimeOffer> = {
    founding: {
        kind: "founding",
        name: "Founding Pro",
        amountCents: 1000,
        priceLabel: "$10",
        cadenceLabel: "one time",
        entitlements: PRO_LIFETIME_ENTITLEMENTS,
    },
    standard: {
        kind: "standard",
        name: "Standard Pro",
        amountCents: 2000,
        priceLabel: "$20",
        cadenceLabel: "one time",
        entitlements: PRO_LIFETIME_ENTITLEMENTS,
    },
};

/** Deterministic local-prototype offer. Change this fixture when the founding offer ends. */
export const ACTIVE_PRO_LIFETIME_OFFER_KIND: ProLifetimeOfferKind = "founding";

export const getProLifetimeOffer = (
    kind: ProLifetimeOfferKind = ACTIVE_PRO_LIFETIME_OFFER_KIND
): ProLifetimeOffer => PRO_LIFETIME_OFFERS[kind];

export type ProLifetimePurchaseStatus = "purchased" | "already_owned";

export type ProLifetimePurchaseInput = {
    userId: string;
    offerKind: ProLifetimeOfferKind;
    purchasedAt: string;
    existingEntitlement?: ProLifetimeEntitlement | null;
};

export type ProLifetimePurchaseResult =
    | {
        success: true;
        purchaseStatus: ProLifetimePurchaseStatus;
        entitlement: ProLifetimeEntitlement;
    }
    | {
        success: false;
        error: string;
    };

export interface ProLifetimeBillingAdapter {
    purchaseProLifetime(input: ProLifetimePurchaseInput): ProLifetimePurchaseResult;
}

/** Local-only deterministic billing simulation. It never contacts a vendor or network. */
export class MockProLifetimeBillingAdapter implements ProLifetimeBillingAdapter {
    purchaseProLifetime(input: ProLifetimePurchaseInput): ProLifetimePurchaseResult {
        if (!input.userId.trim()) {
            return { success: false, error: "A user is required to unlock Pro Lifetime." };
        }

        if (input.existingEntitlement?.status === "owned") {
            return {
                success: true,
                purchaseStatus: "already_owned",
                entitlement: input.existingEntitlement,
            };
        }

        const offer = getProLifetimeOffer(input.offerKind);
        return {
            success: true,
            purchaseStatus: "purchased",
            entitlement: {
                status: "owned",
                offerKind: offer.kind,
                amountCents: offer.amountCents,
                purchasedAt: input.purchasedAt,
                simulatedPaymentReference: `sim-pro-lifetime-${input.userId}-${offer.kind}`,
                billingMode: "simulated",
            },
        };
    }
}

export const mockProLifetimeBillingAdapter = new MockProLifetimeBillingAdapter();

export type ProLifetimePlanViewModel = {
    plan: UserPlan;
    status: "available" | "owned";
    currentPlanName: "Free" | "Pro Lifetime";
    currentPlanSummary: string;
    currentPlanBadge: "starter" | "permanent unlock";
    offer: ProLifetimeOffer;
    actionLabel: string | null;
};

export const getProLifetimePlanViewModel = ({
    plan,
    offerKind = ACTIVE_PRO_LIFETIME_OFFER_KIND,
    entitlement,
}: {
    plan?: string | null;
    offerKind?: ProLifetimeOfferKind;
    entitlement?: ProLifetimeEntitlement | null;
}): ProLifetimePlanViewModel => {
    const normalizedPlan: UserPlan = plan === "pro" ? "pro" : "free";
    const effectivePlan: UserPlan = entitlement?.status === "owned" ? "pro" : normalizedPlan;
    const offer = getProLifetimeOffer(entitlement?.offerKind ?? offerKind);

    if (effectivePlan === "pro") {
        return {
            plan: effectivePlan,
            status: "owned",
            currentPlanName: "Pro Lifetime",
            currentPlanSummary: PRO_PLAN_SUMMARY,
            currentPlanBadge: "permanent unlock",
            offer,
            actionLabel: null,
        };
    }

    return {
        plan: normalizedPlan,
        status: "available",
        currentPlanName: "Free",
        currentPlanSummary: FREE_PLAN_SUMMARY,
        currentPlanBadge: "starter",
        offer,
        actionLabel: `Unlock ${offer.name} for ${offer.priceLabel} ${offer.cadenceLabel}`,
    };
};
