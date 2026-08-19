"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps the lightweight community guide modals keyboard-contained.
 *
 * Ported from the MVP. Four behaviours in one effect, all torn down together so
 * a modal can never leave the page locked or the focus stranded:
 *  - body scroll lock (restores the PREVIOUS inline overflow, not "", so a lock
 *    already owned by another component survives this one unmounting),
 *  - initial focus onto the panel (the caller must give it `tabIndex={-1}`),
 *  - a Tab/Shift+Tab cycle that cannot escape the panel,
 *  - focus restored to whatever was focused before the modal opened.
 *
 * `onDismiss` is held in a ref so it is NOT an effect dependency: callers pass
 * an inline arrow, and re-running the effect on every render would re-lock the
 * body and yank focus back to the panel mid-interaction.
 *
 * Returns the ref to attach to the dialog panel element.
 */
export const useCommunityGuideDialog = ({
    open,
    onDismiss,
}: {
    open: boolean;
    onDismiss: () => void;
}) => {
    const dialogRef = useRef<HTMLElement>(null);
    const onDismissRef = useRef(onDismiss);

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        if (!open) return;

        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Deferred a frame: the panel has only just been committed, so it is
        // not focusable yet on the tick the effect runs.
        const focusFrame = window.requestAnimationFrame(() => {
            dialogRef.current?.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onDismissRef.current();
                return;
            }
            if (event.key !== "Tab") return;

            const dialog = dialogRef.current;
            if (!dialog) return;
            const focusable = Array.from(
                dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            );
            // Nothing tabbable inside: park focus on the panel rather than let
            // Tab walk out into the page behind the backdrop.
            if (!focusable.length) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            // `active === dialog` covers the very first Tab after the initial
            // focus, and `!dialog.contains(active)` recaptures focus that
            // somehow landed outside.
            if (
                event.shiftKey &&
                (active === dialog || active === first || !dialog.contains(active))
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                (active === dialog || active === last || !dialog.contains(active))
            ) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            // Guarded on isConnected: the trigger may have unmounted while the
            // modal was open, and focusing a detached node is a no-op that
            // silently drops focus to <body>.
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
    }, [open]);

    return dialogRef;
};
