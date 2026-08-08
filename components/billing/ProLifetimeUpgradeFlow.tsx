"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import {
    PurchaseFlowDialog,
    type PurchaseFlowStatus,
} from "@/components/billing/PurchaseFlowDialog";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

type ProLifetimeUpgradeFlowProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
};

export const ProLifetimeUpgradeFlow = ({
    open,
    onClose,
    returnFocusRef,
}: ProLifetimeUpgradeFlowProps) => {
    const currentUser = useCurrentUser();
    const [status, setStatus] = useState<PurchaseFlowStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const purchaseGuardRef = useRef(false);

    const planView = getProLifetimePlanViewModel({
        plan: currentUser?.plan,
        offerKind: currentUser?.proLifetimeOfferKind,
        entitlement: currentUser?.proLifetimeEntitlement,
    });
    const offer = planView.offer;

    useEffect(() => {
        if (open) return;

        purchaseGuardRef.current = false;
        setStatus("idle");
        setErrorMessage(null);
        setSuccessMessage(null);
    }, [open]);

    if (!currentUser) return null;

    const handleConfirm = () => {
        if (purchaseGuardRef.current) return;

        if (planView.status === "owned") {
            purchaseGuardRef.current = true;
            setSuccessMessage(
                "Pro Lifetime is already permanently owned. No second simulated payment was created."
            );
            setStatus("success");
            return;
        }

        purchaseGuardRef.current = true;
        setErrorMessage(null);
        setStatus("submitting");

        // const result = upgradeUserToPro({ userId: currentUser.id });

        // if (!result.success) {
        //     purchaseGuardRef.current = false;
        //     setErrorMessage(result.error);
        //     setStatus("error");
        //     return;
        // }

        setSuccessMessage("Simulated payment approved. Pro Lifetime is now permanently owned on this account.");
        setStatus("success");
    };

    return (
        <PurchaseFlowDialog
            open={open}
            kind="pro_lifetime"
            eyebrow="simulated billing"
            title={`Confirm ${offer.name}`}
            description={`Unlock Pro Lifetime for ${offer.priceLabel} ${offer.cadenceLabel}. This is a permanent account unlock with no recurring League subscription. No real payment is collected in this local prototype.`}
            offer={offer}
            confirmLabel={`Confirm simulated ${offer.priceLabel} unlock`}
            submittingLabel="Processing simulated unlock…"
            status={status}
            errorMessage={errorMessage}
            successTitle="Pro Lifetime unlocked"
            successMessage={successMessage}
            onConfirm={handleConfirm}
            onClose={onClose}
            returnFocusRef={returnFocusRef}
        />
    );
};

export default ProLifetimeUpgradeFlow;
