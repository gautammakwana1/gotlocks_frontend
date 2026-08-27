"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
    type TouchEvent,
} from "react";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";

/* ----------------------------------------------------------------------------
 * One-slide-at-a-time matchup navigation, ported VERBATIM from the MVP's
 * components/contests/PickemCarousel.tsx.
 *
 * Content stays owned by the caller on purpose: the same carousel drives the
 * selection editor and (later) the accepted-card receipt, and each renders from
 * the source that powers its own workflow.
 * -------------------------------------------------------------------------- */

export type PickemCarouselItem = {
    id: string;
    label: string;
    content: ReactNode;
};

export type PickemCarouselProps = {
    items: readonly PickemCarouselItem[];
    /** Changes whenever a different card or immutable card version is shown. */
    versionKey: string;
    ariaLabel: string;
    itemName?: string;
    className?: string;
    /** Uses arrow-only controls for compact embedded cards. */
    compact?: boolean;
};

export const PickemCarousel = ({
    items,
    versionKey,
    ariaLabel,
    itemName = "matchup",
    className = "",
    compact = false,
}: PickemCarouselProps) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const itemIdentity = useMemo(() => items.map((item) => item.id).join("|"), [items]);

    useEffect(() => {
        setActiveIndex(0);
    }, [itemIdentity, versionKey]);

    if (!items.length) return null;

    const index = Math.min(activeIndex, items.length - 1);
    const activeItem = items[index];
    const previousDisabled = index === 0;
    const nextDisabled = index === items.length - 1;
    const announce = `${itemName[0].toUpperCase()}${itemName.slice(1)} ${index + 1} of ${items.length}: ${activeItem.label}`;

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft" && !previousDisabled) {
            event.preventDefault();
            setActiveIndex(index - 1);
        }
        if (event.key === "ArrowRight" && !nextDisabled) {
            event.preventDefault();
            setActiveIndex(index + 1);
        }
    };

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const startX = touchStartX.current;
        if (startX === null) return;

        const endX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (endX === undefined) return;

        const distance = endX - startX;
        if (Math.abs(distance) < 48) return;

        if (distance < 0 && !nextDisabled) {
            setActiveIndex(index + 1);
        }
        if (distance > 0 && !previousDisabled) {
            setActiveIndex(index - 1);
        }
    };

    return (
        <div
            role="region"
            aria-roledescription="carousel"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
                touchStartX.current = null;
            }}
            className={`touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${className}`}
        >
            {compact && items.length === 1 ? null : (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
                        {index + 1} of {items.length}
                    </p>
                    <div className="flex items-center gap-1.5" aria-label={`${itemName} progress`}>
                        {items.map((item, itemIndex) => (
                            <button
                                key={item.id}
                                type="button"
                                aria-label={`Go to ${itemName} ${itemIndex + 1}: ${item.label}`}
                                aria-current={itemIndex === index ? "step" : undefined}
                                onClick={() => setActiveIndex(itemIndex)}
                                className={`${compact ? "h-2 w-2" : "h-2.5 w-2.5"} rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                                    itemIndex === index
                                        ? "border-white bg-white"
                                        : "border-white/25 bg-white/5 hover:border-white/50"
                                }`}
                            >
                                <span className="sr-only">
                                    {itemIndex === index ? "Current" : "Show"} {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {announce}
            </p>

            <div role="group" aria-roledescription="slide" aria-label={announce} className="mt-3">
                {activeItem.content}
            </div>

            {compact && items.length === 1 ? null : (
                <div
                    className={`${compact ? "mt-2.5" : "mt-3"} flex items-center justify-between gap-3`}
                >
                    <button
                        type="button"
                        aria-label={`Previous ${itemName}`}
                        onClick={() => setActiveIndex(index - 1)}
                        disabled={previousDisabled}
                        className={
                            compact
                                ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-gray-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                : "rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-35"
                        }
                    >
                        {compact ? <AnimatedArrow direction="left" /> : `Previous ${itemName}`}
                    </button>
                    {compact ? (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                            Swipe to browse
                        </span>
                    ) : null}
                    <button
                        type="button"
                        aria-label={`Next ${itemName}`}
                        onClick={() => setActiveIndex(index + 1)}
                        disabled={nextDisabled}
                        className={
                            compact
                                ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-gray-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                : "rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-35"
                        }
                    >
                        {compact ? <AnimatedArrow direction="right" /> : `Next ${itemName}`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PickemCarousel;
