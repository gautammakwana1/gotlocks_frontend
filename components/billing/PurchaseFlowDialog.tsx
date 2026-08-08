"use client";

import {
    useEffect,
    useId,
    useRef,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type PurchaseFlowKind =
    | "pro_lifetime"
    | "arena_unlock"
    | "arena_hosting";

export type PurchaseFlowStatus =
    | "idle"
    | "submitting"
    | "success"
    | "error";

type PurchaseFlowOfferSummary = {
    name: string;
    priceLabel: string;
    cadenceLabel: string;
};

type PurchaseFlowDialogProps = {
    open: boolean;
    kind: PurchaseFlowKind;
    eyebrow: string;
    title: string;
    description: string;
    offer: PurchaseFlowOfferSummary;
    confirmLabel: string;
    submittingLabel?: string;
    status: PurchaseFlowStatus;
    errorMessage?: string | null;
    successTitle?: string;
    successMessage?: string | null;
    onConfirm: () => void;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    fallbackFocusRef?: RefObject<HTMLElement | null>;
};

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (container: HTMLElement | null) => {
    if (!container) return [];

    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
    );
};

export const PurchaseFlowDialog = ({
    open,
    kind,
    eyebrow,
    title,
    description,
    offer,
    confirmLabel,
    submittingLabel = "Processing…",
    status,
    errorMessage,
    successTitle = "Purchase complete",
    successMessage,
    onConfirm,
    onClose,
    returnFocusRef,
    fallbackFocusRef,
}: PurchaseFlowDialogProps) => {
    const generatedId = useId();
    const titleId = `${generatedId}-title`;
    const descriptionId = `${generatedId}-description`;
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const successButtonRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    const statusRef = useRef(status);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        if (!open) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const explicitReturnTarget = returnFocusRef?.current ?? null;
        const fallbackReturnTarget = fallbackFocusRef?.current ?? null;
        const previousOverflow = document.body.style.overflow;
        const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (statusRef.current !== "submitting") {
                    event.preventDefault();
                    onCloseRef.current();
                }
                return;
            }

            if (event.key !== "Tab") return;

            const focusableElements = getFocusableElements(dialogRef.current);
            if (focusableElements.length === 0) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                if (activeElement === firstElement || !dialogRef.current?.contains(activeElement)) {
                    event.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (activeElement === lastElement || !dialogRef.current?.contains(activeElement)) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;

            const returnTarget = explicitReturnTarget?.isConnected
                ? explicitReturnTarget
                : fallbackReturnTarget?.isConnected
                    ? fallbackReturnTarget
                    : previouslyFocused;
            if (returnTarget?.isConnected) returnTarget.focus();
        };
    }, [fallbackFocusRef, open, returnFocusRef]);

    useEffect(() => {
        if (!open || status !== "success") return;

        const focusFrame = window.requestAnimationFrame(() => successButtonRef.current?.focus());
        return () => window.cancelAnimationFrame(focusFrame);
    }, [open, status]);

    if (!open) return null;

    const submitting = status === "submitting";
    const successful = status === "success";
    const visibleTitle = successful ? successTitle : title;
    const visibleDescription = successful && successMessage ? successMessage : description;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4 sm:py-6"
            onPointerDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                data-purchase-flow-kind={kind}
                tabIndex={-1}
                className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-black px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-5"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                            {eyebrow}
                        </p>
                        <h2 id={titleId} className="mt-2 text-xl font-semibold text-white">
                            {visibleTitle}
                        </h2>
                        <p
                            id={descriptionId}
                            role={successful ? "status" : undefined}
                            className="mt-2 text-sm leading-6 text-gray-300"
                        >
                            {visibleDescription}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        close
                    </button>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    <div className="flex items-center justify-between gap-3">
                        <span>{offer.name}</span>
                        <span className="font-semibold text-white">
                            {offer.priceLabel} {offer.cadenceLabel}
                        </span>
                    </div>
                </div>

                {status === "error" && errorMessage ? (
                    <p role="alert" className="mt-4 text-sm font-semibold text-red-200">
                        {errorMessage}
                    </p>
                ) : null}

                {successful ? (
                    <button
                        ref={successButtonRef}
                        type="button"
                        onClick={onClose}
                        className="mt-5 w-full rounded-2xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-50 transition hover:bg-emerald-500/30"
                    >
                        Done
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        aria-busy={submitting}
                        className="mt-5 w-full rounded-2xl border border-sky-300/50 bg-sky-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-sky-50 transition hover:bg-sky-500/30 disabled:cursor-wait disabled:opacity-60"
                    >
                        {submitting ? submittingLabel : confirmLabel}
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PurchaseFlowDialog;
