"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import PurchaseReviewPage, {
    type PurchaseReviewStatus,
} from "@/components/billing/PurchaseReviewPage";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import { normalizeUserPlan } from "@/lib/groups/limits";
import type { PlanState } from "@/lib/interfaces/interfaces";
import {
    clearCheckoutError,
    createCheckoutSessionRequest,
    fetchPlanOverviewRequest,
} from "@/lib/redux/slices/planSlice";

type RootState = { plan: PlanState };

const LeagueUpgradeReviewContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();

    // Set by the League hub when the organizer cap sent the user here, so a
    // completed unlock can drop them back into the create form they wanted.
    const continueToCreate = searchParams.get("intent") === "create-league";

    const { overview, checkoutLoading, checkoutError } = useSelector(
        (state: RootState) => state.plan
    );

    useEffect(() => {
        if (!currentUser) {
            router.replace("/landing-page");
            return;
        }
        dispatch(fetchPlanOverviewRequest());
    }, [currentUser, dispatch, router]);

    // Any stale error from a previous visit must not greet the user on arrival.
    useEffect(
        () => () => {
            dispatch(clearCheckoutError());
        },
        [dispatch]
    );

    // The server's plan is authoritative — `currentUser.plan` is a cached copy and
    // can trail a webhook that already flipped the account to Pro.
    const plan = normalizeUserPlan(overview?.plan ?? currentUser?.plan);
    const planView = getProLifetimePlanViewModel({
        plan,
        offerKind: currentUser?.proLifetimeOfferKind,
        entitlement: currentUser?.proLifetimeEntitlement,
    });
    const offer = planView.offer;
    const owned = planView.status === "owned";

    const status: PurchaseReviewStatus = owned
        ? "owned"
        : checkoutLoading
            ? "submitting"
            : checkoutError
                ? "error"
                : "idle";

    if (!currentUser) return null;

    return (
        <PurchaseReviewPage
            accent="league"
            backHref="/app-settings/plan?product=league"
            backLabel="Back to League Plan"
            eyebrow="League Plan"
            title={`Review ${offer.name}`}
            description="Pro Lifetime permanently raises the organizer and per-League limits on this account. It is a one-time unlock, not a subscription, and is independent from Arena hosting."
            offer={offer}
            dueNowLabel={owned ? "$0" : offer.priceLabel}
            effectiveLabel="Immediately after payment is confirmed"
            benefits={offer.entitlements}
            status={status}
            errorMessage={checkoutError}
            ownedTitle="Pro Lifetime is already unlocked"
            ownedMessage="This account permanently owns Pro Lifetime. There is nothing to pay and no recurring League charge."
            confirmLabel={`Continue to secure checkout · ${offer.priceLabel} ${offer.cadenceLabel}`}
            onConfirm={() => dispatch(createCheckoutSessionRequest())}
            continueHref={continueToCreate ? "/cag-form?type=league" : "/fantasy?view=hosting"}
            continueActionLabel={
                continueToCreate ? "Continue to create League" : "Return to Leagues"
            }
        />
    );
};

// useSearchParams needs a Suspense boundary or the whole route opts out of
// static prerendering at build time.
const LeagueUpgradeReviewPage = () => (
    <Suspense
        fallback={
            <div className="text-sm text-gray-400" role="status">
                Preparing League Plan review…
            </div>
        }
    >
        <LeagueUpgradeReviewContent />
    </Suspense>
);

export default LeagueUpgradeReviewPage;
