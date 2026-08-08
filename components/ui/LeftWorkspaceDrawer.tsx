"use client";

import {
    useEffect,
    useId,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { SIDE_DRAWER_DESKTOP_WIDTH } from "@/components/layout/sideDrawerSizing";

export type LeftWorkspaceDrawerProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    returnFocusRef?: RefObject<HTMLElement | null>;
    side?: "left" | "right";
    size?: "wide" | "compact";
    tone?: "brand" | "neutral";
    className?: string;
    contentClassName?: string;
    backdropLabel?: string;
};

const FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
].join(",");

const isUsableFocusTarget = (element: HTMLElement) =>
    !element.hasAttribute("hidden") &&
    element.getAttribute("aria-hidden") !== "true" &&
    !element.closest('[aria-hidden="true"]');

// The confidence control renders through its own portal, so its options live
// outside the drawer node. Fold that portal into the focus scope or Tab escapes
// the dialog the moment the dropdown opens.
const getFocusScopeElements = (drawer: HTMLElement | null) => {
    const containers: HTMLElement[] = drawer ? [drawer] : [];
    containers.push(
        ...Array.from(
            document.querySelectorAll<HTMLElement>("[data-confidence-dropdown-portal]")
        )
    );

    const seen = new Set<HTMLElement>();
    return containers.flatMap((container) =>
        Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (element) => {
                if (seen.has(element) || !isUsableFocusTarget(element)) return false;
                seen.add(element);
                return true;
            }
        )
    );
};

const isWithinFocusScope = (element: Element | null, drawer: HTMLElement | null) => {
    if (!element) return false;
    if (drawer?.contains(element)) return true;
    return Boolean(element.closest("[data-confidence-dropdown-portal]"));
};

export const LeftWorkspaceDrawer = ({
    open,
    onClose,
    title,
    children,
    returnFocusRef,
    side = "left",
    size = "wide",
    tone = "brand",
    className = "",
    contentClassName = "",
    backdropLabel = "Dismiss workspace",
}: LeftWorkspaceDrawerProps) => {
    const titleId = useId();
    const drawerRef = useRef<HTMLElement>(null);
    const backButtonRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    // `mounted` outlives `open` by one transition so the panel can animate out
    // instead of vanishing; `entered` drives the transform on the frame after mount.
    const [mounted, setMounted] = useState(open);
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (open) {
            setMounted(true);
            return;
        }

        setEntered(false);
        if (!mounted) return;

        const exitTimer = window.setTimeout(() => setMounted(false), 300);
        return () => window.clearTimeout(exitTimer);
    }, [mounted, open]);

    useEffect(() => {
        if (!mounted || !open) return;
        const enterFrame = window.requestAnimationFrame(() => setEntered(true));
        return () => window.cancelAnimationFrame(enterFrame);
    }, [mounted, open]);

    useEffect(() => {
        if (!open) return;

        const previouslyFocused =
            returnFocusRef?.current ??
            (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        const previousOverflow = document.body.style.overflow;
        const focusFrame = window.requestAnimationFrame(() => {
            backButtonRef.current?.focus();
        });

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                // Confidence controls render in a portal and own the first Escape press.
                if (document.querySelector("[data-confidence-dropdown-portal]")) return;
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== "Tab") return;

            const focusableElements = getFocusScopeElements(drawerRef.current);
            if (focusableElements.length === 0) {
                event.preventDefault();
                drawerRef.current?.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                if (
                    activeElement === firstElement ||
                    !isWithinFocusScope(activeElement, drawerRef.current)
                ) {
                    event.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (
                activeElement === lastElement ||
                !isWithinFocusScope(activeElement, drawerRef.current)
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
    }, [open, returnFocusRef]);

    if (!mounted || typeof document === "undefined") return null;

    const edgeClass =
        side === "left"
            ? "left-0 border-r shadow-[24px_0_70px_rgba(0,0,0,0.55)]"
            : "right-0 border-l shadow-[-24px_0_70px_rgba(0,0,0,0.55)]";
    const sizeClass =
        size === "compact"
            ? `sm:max-w-md ${SIDE_DRAWER_DESKTOP_WIDTH.standard}`
            : `sm:max-w-4xl ${SIDE_DRAWER_DESKTOP_WIDTH.workspace}`;
    const panelToneClass = tone === "neutral" ? "bg-neutral-950" : "bg-[#05070d]";
    const headerToneClass = tone === "neutral" ? "bg-neutral-950" : "bg-[#080c18]";
    const focusToneClass =
        tone === "neutral" ? "focus-visible:ring-white/70" : "focus-visible:ring-sky-300/70";
    const closedTransformClass = side === "left" ? "-translate-x-full" : "translate-x-full";

    return createPortal(
        <div className="fixed inset-0 z-[100]" aria-hidden={!open} inert={!open}>
            <button
                type="button"
                aria-label={backdropLabel}
                tabIndex={-1}
                onClick={onClose}
                className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${entered ? "opacity-100" : "opacity-0"
                    }`}
            />
            <aside
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`absolute inset-y-0 flex w-full max-w-none flex-col border-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none ${edgeClass} ${sizeClass} ${panelToneClass} ${entered ? "translate-x-0" : closedTransformClass
                    } ${className}`}
            >
                <header
                    className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 ${headerToneClass}`}
                >
                    <button
                        ref={backButtonRef}
                        type="button"
                        onClick={onClose}
                        className={`inline-flex min-h-11 items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${focusToneClass}`}
                    >
                        <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                        >
                            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back
                    </button>

                    <h2
                        id={titleId}
                        className="text-center text-base font-semibold text-white sm:text-lg"
                    >
                        {title}
                    </h2>
                </header>

                <div
                    className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 ${contentClassName}`}
                >
                    {children}
                </div>
            </aside>
        </div>,
        document.body
    );
};

export default LeftWorkspaceDrawer;
