"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, ChevronUpDownIcon } from "./SvgIcons";
import IosSpinner from "./IosSpinner";

export type IosSelectOption = {
    value: string;
    label: string;
    /** Small trailing note shown on the right of the row, e.g. "in use". */
    hint?: string;
    disabled?: boolean;
};

const MENU_GAP = 8;
const VIEWPORT_PADDING = 12;
const OPTION_HEIGHT = 44;
const MAX_MENU_HEIGHT = 288;
// Distance from the bottom (px) at which scrolling triggers the next page.
const END_REACHED_THRESHOLD = 28;

type MenuPosition = {
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
};

type Props = {
    value: string;
    options: IosSelectOption[];
    onChange: (value: string) => void;
    /** Label for the implicit empty / "none" choice (value === ""). */
    placeholderLabel: string;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
    /** Infinite scroll: called when the menu is scrolled near the bottom (or
     *  when an open menu is too short to scroll but more pages exist). */
    onReachEnd?: () => void;
    /** Whether more pages can be loaded (gates onReachEnd + shows the footer). */
    hasMore?: boolean;
    /** Whether the next page is currently loading (shows the spinner footer). */
    loadingMore?: boolean;
};

const IosSelectDropdown = ({
    value,
    options,
    onChange,
    placeholderLabel,
    disabled = false,
    ariaLabel,
    className = "",
    onReachEnd,
    hasMore = false,
    loadingMore = false,
}: Props) => {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    // True only once the open animation has settled — gates pagination so no
    // load-more (and the re-render cascade it causes) runs during the animation.
    const [menuReady, setMenuReady] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // createPortal needs document.body; only render the menu portal after mount.
    useEffect(() => setMounted(true), []);

    // Reset the gate whenever the menu closes.
    useEffect(() => {
        if (!open) setMenuReady(false);
    }, [open]);

    // Arm pagination only after the open animation has settled, so load-more
    // re-renders never compete with the spring. menuPosition is reference-stable
    // (see updatePosition), so a reposition won't restart this timer.
    useEffect(() => {
        if (!open || !menuPosition) return;
        const id = window.setTimeout(() => setMenuReady(true), 340);
        return () => window.clearTimeout(id);
    }, [open, menuPosition]);

    const selectedOption = options.find((option) => option.value === value) ?? null;
    const triggerLabel = value === "" || !selectedOption ? placeholderLabel : selectedOption.label;
    const isPlaceholderSelected = value === "" || !selectedOption;

    // The "none" choice plus the caller-provided options, rendered as one list.
    const rows: IosSelectOption[] = [
        { value: "", label: placeholderLabel },
        ...options,
    ];

    useEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const rect = wrapper.getBoundingClientRect();
            const estimated = Math.min(rows.length * OPTION_HEIGHT + 8, MAX_MENU_HEIGHT);
            const menuHeight = menuRef.current?.offsetHeight ?? estimated;
            const width = Math.min(rect.width, window.innerWidth - VIEWPORT_PADDING * 2);
            const left = Math.min(
                Math.max(rect.left, VIEWPORT_PADDING),
                window.innerWidth - width - VIEWPORT_PADDING
            );
            const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
            const openUpward =
                spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;
            const top = openUpward
                ? Math.max(VIEWPORT_PADDING, rect.top - menuHeight - MENU_GAP)
                : rect.bottom + MENU_GAP;

            // Keep the same object reference when nothing changed, so repeated
            // recomputes (rAF, scroll, resize) don't trigger needless re-renders.
            setMenuPosition((prev) =>
                prev &&
                    prev.top === top &&
                    prev.left === left &&
                    prev.width === width &&
                    prev.openUpward === openUpward
                    ? prev
                    : { top, left, width, openUpward }
            );
        };

        updatePosition();
        const rafId = window.requestAnimationFrame(updatePosition);

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (wrapperRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.cancelAnimationFrame(rafId);
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
        // rows is derived from props on every render; depend on the stable signals.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, options.length]);

    const handleSelect = (option: IosSelectOption) => {
        if (option.disabled) return;
        onChange(option.value);
        setOpen(false);
    };

    // Load the next page when the menu is scrolled near the bottom.
    const handleMenuScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (!onReachEnd || !hasMore || loadingMore) return;
        const el = event.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= END_REACHED_THRESHOLD) {
            onReachEnd();
        }
    };

    // When the visible list is shorter than the menu (e.g. client-side filtering
    // left few options), there is nothing to scroll — proactively fetch the next
    // page so infinite scroll can still reach more results. Re-runs as pages load.
    useEffect(() => {
        if (!open || !menuReady || !hasMore || loadingMore || !onReachEnd) return;
        const el = menuRef.current;
        if (!el) return;
        if (el.scrollHeight <= el.clientHeight + END_REACHED_THRESHOLD) {
            onReachEnd();
        }
    }, [open, menuReady, hasMore, loadingMore, onReachEnd, options.length]);

    const openUpward = menuPosition?.openUpward ?? false;

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setOpen((prev) => !prev)}
                disabled={disabled}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-left outline-none transition focus-visible:border-sky-300/60 hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50 aria-expanded:border-sky-300/60"
            >
                <span
                    className={`min-w-0 truncate text-sm ${isPlaceholderSelected ? "text-gray-300" : "font-medium text-white"
                        }`}
                >
                    {triggerLabel}
                </span>
                <motion.span
                    className="shrink-0 text-slate-400"
                    aria-hidden
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                >
                    <ChevronUpDownIcon className="h-4 w-4" />
                </motion.span>
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {open && menuPosition ? (
                        <motion.div
                            key="ios-select-menu"
                            ref={menuRef}
                            role="listbox"
                            aria-label={ariaLabel}
                            onScroll={handleMenuScroll}
                            initial={{ opacity: 0, scale: 0.96, y: openUpward ? 8 : -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: openUpward ? 8 : -8 }}
                            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
                            className="scrollbar-hide fixed z-[140] overflow-y-auto rounded-2xl border border-white/12 bg-[#070707]/95 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                            style={{
                                top: menuPosition.top,
                                left: menuPosition.left,
                                width: menuPosition.width,
                                maxHeight: MAX_MENU_HEIGHT,
                                transformOrigin: openUpward ? "bottom center" : "top center",
                            }}
                        >
                            {rows.map((option) => {
                                const active = option.value === value;
                                const isDisabled = Boolean(option.disabled);
                                return (
                                    <button
                                        key={option.value || "__none__"}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        aria-disabled={isDisabled}
                                        onClick={() => handleSelect(option)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-sky-400/15" : "hover:bg-white/[0.07] active:bg-white/10"
                                            } ${isDisabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                className={`min-w-0 truncate text-sm ${active
                                                    ? "font-semibold text-sky-100"
                                                    : option.value === ""
                                                        ? "text-gray-300"
                                                        : "text-white"
                                                    }`}
                                            >
                                                {option.label}
                                            </span>
                                            {option.hint ? (
                                                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                    {option.hint}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-sky-200" aria-hidden>
                                            {active ? <CheckIcon className="h-4 w-4" /> : null}
                                        </span>
                                    </button>
                                );
                            })}

                            {loadingMore ? (
                                <div className="flex items-center justify-center py-2.5 text-white/70">
                                    <IosSpinner size={18} />
                                </div>
                            ) : null}
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default IosSelectDropdown;
