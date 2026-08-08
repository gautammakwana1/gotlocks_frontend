"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import {
    addDateKeyDays,
    daysBetweenDateKeys,
    MAX_SLATE_DAYS,
} from "@/lib/contests/feedContestCatalog";

export type ContestSlateRangeCalendarProps = {
    /** First selectable day, as a `YYYY-MM-DD` key in the organizer's zone. */
    minDate: string;
    /** Last selectable day; the grid runs from `minDate` through this key. */
    maxDate: string;
    startDate: string;
    endDate: string;
    accent: "league" | "arena";
    onChange: (startDate: string, endDate: string) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SLATE_LENGTHS = Array.from({ length: MAX_SLATE_DAYS }, (_, index) => index + 1);

// A date key names a calendar day, not an instant, so it is read back at UTC
// midnight and formatted in UTC — anything else can print the previous day.
const dateFromKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
};

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
});

const accentClasses = {
    league: {
        selected:
            "border-sky-200 bg-sky-200 text-slate-950 shadow-[0_8px_22px_-12px_rgba(125,211,252,0.95)]",
        endpoint: "ring-1 ring-inset ring-white/70",
        duration:
            "border-sky-300/55 bg-sky-500/20 text-sky-50 shadow-[0_8px_18px_-14px_rgba(56,189,248,0.9)]",
        focus: "focus-visible:ring-sky-300",
    },
    arena: {
        selected:
            "border-violet-200 bg-violet-200 text-violet-950 shadow-[0_8px_22px_-12px_rgba(196,181,253,0.95)]",
        endpoint: "ring-1 ring-inset ring-white/70",
        duration:
            "border-violet-300/55 bg-violet-500/20 text-violet-50 shadow-[0_8px_18px_-14px_rgba(139,92,246,0.9)]",
        focus: "focus-visible:ring-violet-300",
    },
} as const;

/**
 * Rolling calendar for the General Combo slate. Picking a day sets the start and
 * carries the current slate length forward, so the organizer never types an end
 * date — the length buttons own it.
 */
export const ContestSlateRangeCalendar = ({
    minDate,
    maxDate,
    startDate,
    endDate,
    accent,
    onChange,
}: ContestSlateRangeCalendarProps) => {
    const colors = accentClasses[accent];
    const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const dates = useMemo(() => {
        const count = Math.floor(daysBetweenDateKeys(minDate, maxDate));
        if (!Number.isFinite(count) || count < 0) return [];
        return Array.from({ length: count + 1 }, (_, index) =>
            addDateKeyDays(minDate, index)
        );
    }, [maxDate, minDate]);
    const selectedDays =
        startDate && endDate
            ? Math.max(
                1,
                Math.min(
                    MAX_SLATE_DAYS,
                    Math.floor(daysBetweenDateKeys(startDate, endDate)) + 1
                )
            )
            : 0;
    const leadingDays = dates.length ? dateFromKey(dates[0]).getUTCDay() : 0;

    // The horizon can be nearer than the current length, so a start date late in
    // the window silently shortens the slate rather than overshooting `maxDate`.
    const chooseStart = (dateKey: string) => {
        const availableDays = Math.floor(daysBetweenDateKeys(dateKey, maxDate)) + 1;
        const nextDays = Math.max(
            1,
            Math.min(selectedDays || 1, availableDays, MAX_SLATE_DAYS)
        );
        onChange(dateKey, addDateKeyDays(dateKey, nextDays - 1));
    };

    const chooseDuration = (duration: number) => {
        if (!startDate) return;
        const availableDays = Math.floor(daysBetweenDateKeys(startDate, maxDate)) + 1;
        if (duration > availableDays) return;
        onChange(startDate, addDateKeyDays(startDate, duration - 1));
    };

    const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const offsets: Partial<Record<string, number>> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
        };
        const offset = offsets[event.key];
        let nextIndex = offset == null ? null : index + offset;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = dates.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        dayButtonRefs.current[
            Math.max(0, Math.min(dates.length - 1, nextIndex))
        ]?.focus();
    };

    const rangeLabel =
        startDate && endDate
            ? startDate === endDate
                ? shortDateFormatter.format(dateFromKey(startDate))
                : `${shortDateFormatter.format(dateFromKey(startDate))} – ${shortDateFormatter.format(dateFromKey(endDate))}`
            : "Choose a start date";

    return (
        <section
            aria-label="Contest slate date picker"
            className="overflow-hidden rounded-2xl border border-white/10 bg-black/35"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Rolling calendar
                    </p>
                    <p aria-live="polite" className="mt-1 text-sm font-semibold normal-case text-white">
                        {rangeLabel}
                    </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                    {selectedDays
                        ? `${selectedDays} ${selectedDays === 1 ? "day" : "days"}`
                        : `1–${MAX_SLATE_DAYS} days`}
                </span>
            </div>

            <div className="p-3 sm:p-4">
                <div
                    role="grid"
                    aria-label="Contest date range calendar"
                    className="grid grid-cols-7 gap-1.5"
                >
                    {WEEKDAYS.map((weekday) => (
                        <span
                            key={weekday}
                            role="columnheader"
                            className="pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-600"
                        >
                            {weekday}
                        </span>
                    ))}
                    {Array.from({ length: leadingDays }, (_, index) => (
                        <span key={`leading-${index}`} aria-hidden="true" />
                    ))}
                    {dates.map((dateKey, index) => {
                        const date = dateFromKey(dateKey);
                        const inRange =
                            Boolean(startDate && endDate) &&
                            dateKey >= startDate &&
                            dateKey <= endDate;
                        const endpoint = dateKey === startDate || dateKey === endDate;

                        return (
                            <span key={dateKey} role="gridcell">
                                <button
                                    ref={(element) => {
                                        dayButtonRefs.current[index] = element;
                                    }}
                                    type="button"
                                    aria-label={fullDateFormatter.format(date)}
                                    aria-pressed={inRange}
                                    aria-current={dateKey === minDate ? "date" : undefined}
                                    onClick={() => chooseStart(dateKey)}
                                    onKeyDown={(event) => moveFocus(event, index)}
                                    className={`relative flex min-h-[4.25rem] w-full flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${colors.focus} ${inRange
                                        ? `${colors.selected} ${endpoint ? colors.endpoint : ""}`
                                        : "border-white/10 bg-white/[0.025] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]"
                                        }`}
                                >
                                    <span
                                        className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${inRange ? "opacity-70" : "text-gray-600"
                                            }`}
                                    >
                                        {monthFormatter.format(date)}
                                    </span>
                                    <span className="mt-0.5 text-base font-semibold leading-none">
                                        {date.getUTCDate()}
                                    </span>
                                </button>
                            </span>
                        );
                    })}
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Slate length
                            </p>
                            <p className="mt-1 text-xs normal-case leading-5 text-gray-500">
                                The end date updates automatically.
                            </p>
                        </div>
                        <div
                            role="group"
                            aria-label="Slate length"
                            className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
                        >
                            {SLATE_LENGTHS.map((duration) => {
                                const fits =
                                    Boolean(startDate) &&
                                    duration <=
                                    Math.floor(daysBetweenDateKeys(startDate, maxDate)) + 1;
                                const selected = selectedDays === duration;
                                return (
                                    <button
                                        key={duration}
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={!fits}
                                        onClick={() => chooseDuration(duration)}
                                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-25 ${selected
                                            ? colors.duration
                                            : "border-transparent text-gray-400 hover:border-white/15 hover:text-white"
                                            }`}
                                    >
                                        {duration}d
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContestSlateRangeCalendar;
