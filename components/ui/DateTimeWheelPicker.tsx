"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    label?: string;
    value: string;
    onChange: (iso: string) => void;
    disabled?: boolean;
    className?: string;
    minYear?: number;
    maxYear?: number;
    error?: string;
    showTime?: boolean;
    disableFuture?: boolean;
    disablePast?: boolean;
    minDate?: string;
    maxDate?: string;
    required?: boolean;
    note?: string;
    placeholder?: string;
};

type Parts = {
    year: number;
    monthIdx: number;
    day: number;
    h12: number;
    minute: number;
    isPM: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Wheel geometry. Center row sits at index (VISIBLE_ROWS - 1) / 2.
const ITEM_H = 36;
const VISIBLE_ROWS = 5;
const PAD = ((VISIBLE_ROWS - 1) / 2) * ITEM_H;

const ANIM_MS = 300;

const range = (start: number, end: number) => {
    const out: number[] = [];
    for (let i = start; i <= end; i += 1) out.push(i);
    return out;
};

const daysInMonth = (year: number, monthIdx: number) => new Date(year, monthIdx + 1, 0).getDate();

const toParts = (iso: string): Parts => {
    const parsed = iso ? new Date(iso) : new Date();
    const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const h24 = base.getHours();
    return {
        year: base.getFullYear(),
        monthIdx: base.getMonth(),
        day: base.getDate(),
        h12: ((h24 + 11) % 12) + 1,
        minute: base.getMinutes(),
        isPM: h24 >= 12,
    };
};

const partsToDate = (p: Parts, showTime: boolean): Date => {
    const maxDay = daysInMonth(p.year, p.monthIdx);
    const h24 = showTime ? (p.h12 % 12) + (p.isPM ? 12 : 0) : 0;
    const minute = showTime ? p.minute : 0;
    return new Date(p.year, p.monthIdx, Math.min(p.day, maxDay), h24, minute, 0, 0);
};

const clampDay = (p: Parts): Parts => ({ ...p, day: Math.min(p.day, daysInMonth(p.year, p.monthIdx)) });

const formatLabel = (iso: string, showTime: boolean, placeholder?: string) => {
    const empty = placeholder ?? (showTime ? "Select date & time" : "Select date");
    if (!iso) return empty;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return empty;
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(showTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
    }).format(date);
};

const CalendarClockIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden
    >
        <path d="M8 2v3M16 2v3M3.5 9h17" />
        <path d="M21 11.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5" />
        <circle cx="17.5" cy="17.5" r="3.5" />
        <path d="M17.5 16v1.6l1 0.9" />
    </svg>
);

const WheelColumn = ({
    items,
    index,
    onIndexChange,
    ariaLabel,
}: {
    items: string[];
    index: number;
    onIndexChange: (next: number) => void;
    ariaLabel: string;
}) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const settleTimer = useRef<number | null>(null);

    const indexRef = useRef(index);
    const lenRef = useRef(items.length);
    const onIndexChangeRef = useRef(onIndexChange);
    indexRef.current = index;
    lenRef.current = items.length;
    onIndexChangeRef.current = onIndexChange;

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const target = index * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
    }, [index]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const WHEEL_STEP_COOLDOWN = 90;
        let lockUntil = 0;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.deltaY === 0) return;
            const now = performance.now();
            if (now < lockUntil) return;
            lockUntil = now + WHEEL_STEP_COOLDOWN;
            const dir = e.deltaY > 0 ? 1 : -1;
            const next = Math.max(0, Math.min(lenRef.current - 1, indexRef.current + dir));
            if (next !== indexRef.current) onIndexChangeRef.current(next);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    const handleScroll = () => {
        const el = ref.current;
        if (!el) return;
        if (settleTimer.current) window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            const next = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
            if (next !== index) {
                onIndexChange(next);
            } else {
                const target = next * ITEM_H;
                if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target });
            }
        }, 90);
    };

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            role="listbox"
            aria-label={ariaLabel}
            className="scrollbar-hide flex-1 snap-y snap-mandatory overflow-y-auto"
            style={{ height: VISIBLE_ROWS * ITEM_H }}
        >
            <div style={{ height: PAD }} aria-hidden />
            {items.map((item, i) => (
                <div
                    key={`${ariaLabel}-${item}-${i}`}
                    role="option"
                    aria-selected={i === index}
                    className={`flex snap-center items-center justify-center tabular-nums transition-colors ${i === index ? "font-semibold text-white" : "text-gray-500"
                        }`}
                    style={{ height: ITEM_H }}
                >
                    {item}
                </div>
            ))}
            <div style={{ height: PAD }} aria-hidden />
        </div>
    );
};

export default function DateTimeWheelPicker({
    label,
    value,
    onChange,
    disabled = false,
    className,
    minYear,
    maxYear,
    error,
    showTime = true,
    disableFuture = false,
    disablePast = false,
    minDate,
    maxDate,
    required = false,
    note,
    placeholder,
}: Props) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const closeTimer = useRef<number | null>(null);
    const [parts, setParts] = useState<Parts>(() => toParts(value));

    const years = useMemo(() => {
        const nowY = new Date().getFullYear();
        const lowDefault = minDate ? new Date(minDate).getFullYear() : disablePast ? nowY : nowY - 1;
        const highDefault = maxDate ? new Date(maxDate).getFullYear() : disableFuture ? nowY : nowY + 10;
        const low = Math.min(minYear ?? lowDefault, parts.year);
        const high = Math.max(maxYear ?? highDefault, parts.year);
        return range(low, high);
    }, [minYear, maxYear, minDate, maxDate, disablePast, disableFuture, parts.year]);

    const days = useMemo(() => range(1, daysInMonth(parts.year, parts.monthIdx)), [parts.year, parts.monthIdx]);

    const applyConstraints = useCallback((p: Parts): Parts => {
        const ms = partsToDate(p, showTime).getTime();
        const now = Date.now();
        const lo = minDate ? Date.parse(minDate) : disablePast ? now : NaN;
        const hi = maxDate ? Date.parse(maxDate) : disableFuture ? now : NaN;
        let next = ms;
        if (!Number.isNaN(lo) && next < lo) next = lo;
        if (!Number.isNaN(hi) && next > hi) next = hi;
        if (next === ms) return p;
        return toParts(new Date(next).toISOString());
    }, [showTime, minDate, maxDate, disablePast, disableFuture]);

    const update = useCallback(
        (partial: Partial<Parts>) => setParts((p) => applyConstraints(clampDay({ ...p, ...partial }))),
        [applyConstraints]
    );

    const requestClose = useCallback(() => {
        setVisible(false);
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
            setMounted(false);
            closeTimer.current = null;
        }, ANIM_MS);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, [mounted]);

    useEffect(() => () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") requestClose();
        };
        document.addEventListener("keydown", onKey);

        const body = document.body;
        const scrollY = window.scrollY;
        const prev = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow,
        };
        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            // Each property is handed back only if it still holds the value this
            // picker wrote; anything another overlay has since changed is theirs.
            const restore = (
                key: "position" | "top" | "left" | "right" | "width" | "overflow",
                applied: string
            ) => {
                if (body.style[key] !== applied) return false;
                body.style[key] = prev[key];
                return true;
            };
            const ownedPosition = restore("position", "fixed");
            restore("top", `-${scrollY}px`);
            restore("left", "0px");
            restore("right", "0px");
            restore("width", "100%");
            restore("overflow", "hidden");
            // Only the overlay that pinned the page may unpin it.
            if (ownedPosition) window.scrollTo(0, scrollY);
        };
    }, [mounted, requestClose]);

    const openPicker = () => {
        if (disabled) return;
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setParts(applyConstraints(toParts(value)));
        setMounted(true);
    };

    const commit = () => {
        onChange(partsToDate(parts, showTime).toISOString());
        requestClose();
    };

    return (
        <div className={`block ${className ?? ""}`}>
            {label && (
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                    {required && <span className="text-red-400"> *</span>}
                </span>
            )}
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                className="ui-input-accent mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black px-4 py-3 text-left text-sm text-white outline-none transition hover:border-white/20 focus:border-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={value ? "text-white" : "text-gray-500"}>{formatLabel(value, showTime, placeholder)}</span>
                <CalendarClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
            </button>
            {error && <span role="alert" className="mt-1 block text-xs font-medium text-red-400">{error}</span>}
            {note && <span className="mt-1 block text-[11px] italic text-gray-500">{note}</span>}

            {mounted && createPortal(
                <div
                    data-datetime-wheel-portal
                    className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-label={label ?? (showTime ? "Select date and time" : "Select date")}
                >
                    <div
                        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"
                            }`}
                        onClick={requestClose}
                        aria-hidden
                    />
                    <div
                        className={`mx-3 relative z-10 w-full overflow-hidden rounded-t-3xl border border-sky-400/30 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(0,0,0,0.6),0_0_22px_-6px_rgba(59,130,246,0.45)] backdrop-blur transition-all duration-300 ease-out will-change-transform motion-reduce:transition-none sm:max-w-md sm:rounded-3xl sm:pb-0 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                            }`}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">
                                {label ?? "Select"}
                            </span>
                            <span className="truncate text-sm font-medium text-sky-200">
                                {formatLabel(partsToDate(parts, showTime).toISOString(), showTime, placeholder)}
                            </span>
                        </div>

                        <div className="relative px-3 py-3">
                            <div
                                className="pointer-events-none absolute inset-x-3 top-1/2 z-10 -translate-y-1/2 rounded-lg border-y border-sky-400/40 bg-sky-400/[0.07]"
                                style={{ height: ITEM_H }}
                                aria-hidden
                            />
                            <div className="relative flex gap-1 text-sm">
                                <WheelColumn
                                    items={MONTHS}
                                    index={parts.monthIdx}
                                    onIndexChange={(i) => update({ monthIdx: i })}
                                    ariaLabel="Month"
                                />
                                <WheelColumn
                                    items={days.map(String)}
                                    index={parts.day - 1}
                                    onIndexChange={(i) => update({ day: i + 1 })}
                                    ariaLabel="Day"
                                />
                                <WheelColumn
                                    items={years.map(String)}
                                    index={Math.max(0, years.indexOf(parts.year))}
                                    onIndexChange={(i) => update({ year: years[i] })}
                                    ariaLabel="Year"
                                />
                                {showTime && (
                                    <>
                                        <WheelColumn
                                            items={range(1, 12).map(String)}
                                            index={parts.h12 - 1}
                                            onIndexChange={(i) => update({ h12: i + 1 })}
                                            ariaLabel="Hour"
                                        />
                                        <WheelColumn
                                            items={range(0, 59).map((m) => String(m).padStart(2, "0"))}
                                            index={parts.minute}
                                            onIndexChange={(i) => update({ minute: i })}
                                            ariaLabel="Minute"
                                        />
                                        <WheelColumn
                                            items={["AM", "PM"]}
                                            index={parts.isPM ? 1 : 0}
                                            onIndexChange={(i) => update({ isPM: i === 1 })}
                                            ariaLabel="AM or PM"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
                            <button
                                type="button"
                                onClick={requestClose}
                                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={commit}
                                className="ui-accent-button rounded-lg px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
