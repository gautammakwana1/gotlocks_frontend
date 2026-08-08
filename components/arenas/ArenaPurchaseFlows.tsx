// "use client";

// import { useEffect, useRef, useState, type RefObject } from "react";
// import {
//     PurchaseFlowDialog,
//     type PurchaseFlowStatus,
// } from "@/components/billing/PurchaseFlowDialog";
// import {
//     getArenaHostingOffer,
//     getArenaUnlockOffer,
// } from "@/lib/billing/arena";
// import type { ArenaHostingTier } from "@/lib/domain/community";
// import type { ArenaActionResult } from "./types";

// export type SelfServiceArenaTier = Exclude<ArenaHostingTier, "custom">;

// type ArenaTierUiOffer = {
//     name: string;
//     priceLabel: string;
//     cadenceLabel: string;
//     memberLimit: number;
//     managerLimit: number;
//     contestLimit: number;
//     summary: string;
// };

// const arenaTierUiOffer = (tier: SelfServiceArenaTier): ArenaTierUiOffer => {
//     const offer = getArenaHostingOffer(tier);
//     return {
//         name: offer.name,
//         priceLabel: offer.priceLabel,
//         cadenceLabel: offer.cadenceLabel,
//         memberLimit: offer.limits.participatingMemberLimit ?? 0,
//         managerLimit: offer.limits.managerLimit ?? 0,
//         contestLimit: offer.limits.activeContestLimit ?? 0,
//         summary: offer.summary,
//     };
// };

// export const ARENA_TIER_OFFERS: Record<
//     SelfServiceArenaTier,
//     ArenaTierUiOffer
// > = {
//     arena_50: arenaTierUiOffer("arena_50"),
//     arena_100: arenaTierUiOffer("arena_100"),
//     arena_250_plus: arenaTierUiOffer("arena_250_plus"),
// };

// type FlowProps = {
//     open: boolean;
//     onClose: () => void;
//     returnFocusRef?: RefObject<HTMLElement | null>;
//     fallbackFocusRef?: RefObject<HTMLElement | null>;
// };

// const usePurchaseAction = ({
//     open,
//     action,
//     successMessage,
// }: {
//     open: boolean;
//     action: () => ArenaActionResult;
//     successMessage: string;
// }) => {
//     const [status, setStatus] = useState<PurchaseFlowStatus>("idle");
//     const [errorMessage, setErrorMessage] = useState<string | null>(null);
//     const [completedMessage, setCompletedMessage] = useState<string | null>(null);
//     const guardRef = useRef(false);

//     useEffect(() => {
//         if (open) return;
//         guardRef.current = false;
//         setStatus("idle");
//         setErrorMessage(null);
//         setCompletedMessage(null);
//     }, [open]);

//     const confirm = () => {
//         if (guardRef.current) return;
//         guardRef.current = true;
//         setErrorMessage(null);
//         setStatus("submitting");

//         const result = action();
//         if (!result.success) {
//             guardRef.current = false;
//             setErrorMessage(result.error);
//             setStatus("error");
//             return;
//         }

//         setCompletedMessage(successMessage);
//         setStatus("success");
//     };

//     return { status, errorMessage, completedMessage, confirm };
// };

// export const ArenaUnlockFlow = ({
//     open,
//     onClose,
//     onUnlock,
//     returnFocusRef,
//     fallbackFocusRef,
// }: FlowProps & { onUnlock: () => ArenaActionResult }) => {
//     const offer = getArenaUnlockOffer();
//     const purchase = usePurchaseAction({
//         open,
//         action: onUnlock,
//         successMessage:
//             "Permanent Arena Unlock is now attached to this Arena. Its one included Arena 50 month has started.",
//     });

//     return (
//         <PurchaseFlowDialog
//             open={open}
//             kind="arena_unlock"
//             eyebrow="simulated billing"
//             title="Unlock this Arena permanently"
//             description={`${offer.summary} The unlock belongs to this Arena, survives ownership transfer, and preserves its identity and history. No real payment is collected in this local prototype.`}
//             offer={{
//                 name: offer.name,
//                 priceLabel: offer.priceLabel,
//                 cadenceLabel: offer.cadenceLabel,
//             }}
//             confirmLabel={`Confirm simulated ${offer.priceLabel} unlock`}
//             submittingLabel="Processing simulated unlock…"
//             status={purchase.status}
//             errorMessage={purchase.errorMessage}
//             successTitle="Arena permanently unlocked"
//             successMessage={purchase.completedMessage}
//             onConfirm={purchase.confirm}
//             onClose={onClose}
//             returnFocusRef={returnFocusRef}
//             fallbackFocusRef={fallbackFocusRef}
//         />
//     );
// };

// export const ArenaHostingFlow = ({
//     open,
//     onClose,
//     tier,
//     mode,
//     previewSummary,
//     actionLabel,
//     scheduled = false,
//     onActivate,
//     returnFocusRef,
//     fallbackFocusRef,
// }: FlowProps & {
//     tier: SelfServiceArenaTier;
//     mode: "select" | "change" | "reactivate" | "recover";
//     previewSummary?: string;
//     actionLabel?: string;
//     scheduled?: boolean;
//     onActivate: () => ArenaActionResult;
// }) => {
//     const offer = ARENA_TIER_OFFERS[tier];
//     const actionLabels = {
//         select: "Start hosting",
//         change: "Change hosting",
//         reactivate: "Reactivate Arena",
//         recover: "Restore hosting",
//     } as const;
//     const purchase = usePurchaseAction({
//         open,
//         action: onActivate,
//         successMessage: scheduled
//             ? `${offer.name} is scheduled for the next simulated paid period. No real payment was collected.`
//             : `${offer.name} hosting is active. No real payment was collected.`,
//     });

//     return (
//         <PurchaseFlowDialog
//             open={open}
//             kind="arena_hosting"
//             eyebrow="simulated monthly hosting"
//             title={`${actionLabels[mode]} with ${offer.name}`}
//             description={`${previewSummary ? `${previewSummary} ` : ""}${offer.summary} This local flow simulates monthly hosting and does not collect payment information.`}
//             offer={offer}
//             confirmLabel={actionLabel ?? `Confirm simulated ${offer.priceLabel} monthly hosting`}
//             submittingLabel="Updating simulated hosting…"
//             status={purchase.status}
//             errorMessage={purchase.errorMessage}
//             successTitle={scheduled ? `${offer.name} scheduled` : `${offer.name} active`}
//             successMessage={purchase.completedMessage}
//             onConfirm={purchase.confirm}
//             onClose={onClose}
//             returnFocusRef={returnFocusRef}
//             fallbackFocusRef={fallbackFocusRef}
//         />
//     );
// };
