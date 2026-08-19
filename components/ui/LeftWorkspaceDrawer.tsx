"use client";

import {
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { SIDE_DRAWER_DESKTOP_WIDTH } from "@/components/layout/sideDrawerSizing";
import {
    SIDE_DRAWER_MOTION,
    SIDE_DRAWER_TRANSITION_MS,
} from "@/components/ui/sideDrawerMotion";

export type LeftWorkspaceDrawerProps = {
    open: boolean;
    onClose: () => void;
    /**
     * An in-workspace BACK step, for a drawer whose body has more than one
     * screen. Escape and the backdrop still close outright — this only changes
     * what the header chevron does.
     *
     * Without it a multi-step drawer has to draw its own second back control in
     * the body, which leaves two stacked affordances doing different things: a
     * header "back" that closes and a body one that steps. The MVP has one.
     */
    onBack?: () => void;
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

/**
 * Portals that render ABOVE this drawer and own the keyboard while they are up.
 *
 * They live outside the drawer node — each mounts at document.body — so without
 * folding them in, Tab escapes the dialog the moment one opens and Escape closes
 * the whole drawer instead of the thing the user actually meant to dismiss.
 *
 * The date/time wheel joined the list when the contest forms moved inside the
 * drawer: its sheet is how Starts and Ends are set, and Escape over it was
 * closing the entire builder.
 */
const ABOVE_DRAWER_PORTAL_SELECTOR =
    "[data-confidence-dropdown-portal],[data-datetime-wheel-portal]";

/* ----------------------------------------------------------------------------
 * WHICH DRAWER IS ON TOP.
 *
 * Drawers nest for real now: the contest wizard opens inside this drawer, and
 * its Access step opens the venue-setup dialog, which is another one. Every
 * mounted instance listens on the document, so without a stack they all act at
 * once — an Escape meant for the venue sheet also tore down the whole contest
 * wizard, and each Tab press was fought over by two focus traps, pinning focus
 * on the inner drawer's first control.
 *
 * The body scroll lock has the same shape of bug: per-drawer capture and restore
 * means an outer drawer closing while an inner one is still open hands the page
 * its scrollbar back. So the lock belongs to the STACK — captured when it goes
 * from empty to one, restored only when it empties.
 * -------------------------------------------------------------------------- */
let drawerStack: number[] = [];
let nextDrawerId = 0;
let overflowBeforeDrawers: string | null = null;
const stackListeners = new Set<() => void>();

const notifyStack = () => stackListeners.forEach((listener) => listener());

const registerDrawer = (id: number) => {
    if (drawerStack.includes(id)) return;
    if (drawerStack.length === 0) {
        overflowBeforeDrawers = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }
    drawerStack = [...drawerStack, id];
    notifyStack();
};

const unregisterDrawer = (id: number) => {
    if (!drawerStack.includes(id)) return;
    drawerStack = drawerStack.filter((candidate) => candidate !== id);
    if (drawerStack.length === 0) {
        document.body.style.overflow = overflowBeforeDrawers ?? "";
        overflowBeforeDrawers = null;
    }
    notifyStack();
};

const isTopmostDrawer = (id: number) => drawerStack[drawerStack.length - 1] === id;

const subscribeToStack = (listener: () => void) => {
    stackListeners.add(listener);
    return () => {
        stackListeners.delete(listener);
    };
};

const readStackSnapshot = () => drawerStack.join(",");
const readServerStackSnapshot = () => "";
const getFocusScopeElements = (drawer: HTMLElement | null) => {
    const containers: HTMLElement[] = drawer ? [drawer] : [];
    containers.push(
        ...Array.from(document.querySelectorAll<HTMLElement>(ABOVE_DRAWER_PORTAL_SELECTOR))
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
    return Boolean(element.closest(ABOVE_DRAWER_PORTAL_SELECTOR));
};

export const LeftWorkspaceDrawer = ({
    open,
    onClose,
    onBack,
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
    const drawerIdRef = useRef<number>(-1);
    if (drawerIdRef.current === -1) drawerIdRef.current = nextDrawerId++;
    /*
     * Re-renders this drawer whenever the stack changes, so `isTopmost` below is
     * never stale after a sibling opened or closed on top of it. The snapshot
     * itself is only a change token; the flag is derived from it.
     */
    useSyncExternalStore(subscribeToStack, readStackSnapshot, readServerStackSnapshot);
    const isTopmost = open && isTopmostDrawer(drawerIdRef.current);
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

        const exitTimer = window.setTimeout(
            () => setMounted(false),
            SIDE_DRAWER_TRANSITION_MS
        );
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
        const drawerId = drawerIdRef.current;
        // Registering is what takes the body scroll lock, and only for the first
        // drawer on the stack.
        registerDrawer(drawerId);
        const focusFrame = window.requestAnimationFrame(() => {
            // A drawer opening BEHIND another must not steal focus from it.
            if (isTopmostDrawer(drawerId)) backButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            // A covered drawer stays mounted and keeps listening, but must not
            // act: one Escape should dismiss one thing, and one Tab trap should
            // own the focus ring.
            if (!isTopmostDrawer(drawerId)) return;
            if (event.key === "Escape") {
                // A portal stacked above this drawer owns the first Escape press.
                if (document.querySelector(ABOVE_DRAWER_PORTAL_SELECTOR)) return;
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
            const wasTopmost = isTopmostDrawer(drawerId);
            // Hands the lock back only if this was the LAST drawer standing.
            unregisterDrawer(drawerId);
            // Returning focus from a drawer that was not on top would yank it out
            // of the one still open above it.
            if (wasTopmost && previouslyFocused?.isConnected) {
                previouslyFocused.focus();
            }
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
    const closedTransformClass =
        side === "left"
            ? SIDE_DRAWER_MOTION.closedLeft
            : SIDE_DRAWER_MOTION.closedRight;

    // Inerted when this drawer is not the TOPMOST, not merely when it is closed:
    // a covered drawer that stays focusable and screen-reader visible is a second
    // dialog the user can Tab into by accident.
    return createPortal(
        <div className="fixed inset-0 z-[100]" aria-hidden={!isTopmost} inert={!isTopmost}>
            <button
                type="button"
                aria-label={backdropLabel}
                tabIndex={-1}
                onClick={onClose}
                className={`absolute inset-0 ${SIDE_DRAWER_MOTION.backdrop} ${entered ? SIDE_DRAWER_MOTION.backdropOpen : SIDE_DRAWER_MOTION.backdropClosed
                    }`}
            />
            <aside
                ref={drawerRef}
                role="dialog"
                aria-modal={isTopmost ? "true" : undefined}
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`absolute inset-y-0 flex w-full max-w-none flex-col border-white/10 ${SIDE_DRAWER_MOTION.panel} ${edgeClass} ${sizeClass} ${panelToneClass} ${entered ? SIDE_DRAWER_MOTION.open : closedTransformClass
                    } ${className}`}
            >
                <header
                    className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 ${headerToneClass}`}
                >
                    <button
                        ref={backButtonRef}
                        type="button"
                        onClick={onBack ?? onClose}
                        className={`inline-flex min-h-11 items-center gap-2 px-1 text-xs font-semibold tracking-[0.14em] text-gray-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${focusToneClass}`}
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
                        back
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
