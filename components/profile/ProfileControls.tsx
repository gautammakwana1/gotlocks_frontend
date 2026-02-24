"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type ResultFilter = "all" | "win" | "loss" | "pending" | "void";
export type TypeFilter = "all" | "straight" | "combo";
export type ConfidenceFilter = "all" | "HIGH" | "MEDIUM" | "LOW";
export type SortOption =
    | "newest"
    | "oldest"
    | "highestPoints"
    | "mostLegs";

type ProfileControlsProps = {
    resultFilter: ResultFilter;
    typeFilter: TypeFilter;
    confidenceFilter: ConfidenceFilter;
    sortOption: SortOption;
    variant?: "card" | "embedded";
    showPostLock?: boolean;
    onResultChange: (next: ResultFilter) => void;
    onTypeChange: (next: TypeFilter) => void;
    onConfidenceChange: (next: ConfidenceFilter) => void;
    onSortChange: (next: SortOption) => void;
};

const ProfileControls = ({
    resultFilter,
    typeFilter,
    confidenceFilter,
    sortOption,
    variant = "card",
    showPostLock = false,
    onResultChange,
    onTypeChange,
    onConfidenceChange,
    onSortChange,
}: ProfileControlsProps) => {
    const resultOptions: Array<{ value: ResultFilter; label: string }> = [
        { value: "all", label: "All" },
        { value: "win", label: "Wins" },
        { value: "loss", label: "Losses" },
        { value: "pending", label: "Pending" },
        { value: "void", label: "Void" },
    ];
    const typeOptions: Array<{ value: TypeFilter; label: string }> = [
        { value: "all", label: "All" },
        { value: "straight", label: "Straight" },
        { value: "combo", label: "Combo" },
    ];
    const confidenceOptions: Array<{ value: ConfidenceFilter; label: string }> = [
        { value: "all", label: "All" },
        { value: "HIGH", label: "High" },
        { value: "MEDIUM", label: "Medium" },
        { value: "LOW", label: "Low" },
    ];
    const sortOptions: Array<{ value: SortOption; label: string }> = [
        { value: "newest", label: "Newest" },
        { value: "oldest", label: "Oldest" },
        { value: "highestPoints", label: "Most points" },
    ];

    const hasActiveFilters =
        resultFilter !== "all" ||
        typeFilter !== "all" ||
        confidenceFilter !== "all" ||
        sortOption !== "newest";

    const handleResultChange = (next: ResultFilter) => {
        onResultChange(next);
    };

    const handleTypeChange = (next: TypeFilter) => {
        onTypeChange(next);
    };

    const handleConfidenceChange = (next: ConfidenceFilter) => {
        onConfidenceChange(next);
    };

    const handleSortChange = (next: SortOption) => {
        onSortChange(next);
    };

    const handleReset = () => {
        onResultChange("all");
        onTypeChange("all");
        onConfidenceChange("all");
        onSortChange("newest");
    };

    const resultMenuRef = useRef<HTMLDetailsElement | null>(null);
    const sortMenuRef = useRef<HTMLDetailsElement | null>(null);
    const typeMenuRef = useRef<HTMLDetailsElement | null>(null);
    const confidenceMenuRef = useRef<HTMLDetailsElement | null>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            const menus = [
                resultMenuRef.current,
                sortMenuRef.current,
                typeMenuRef.current,
                confidenceMenuRef.current,
            ].filter(Boolean) as HTMLDetailsElement[];

            if (target && menus.some((menu) => menu.contains(target))) return;
            menus.forEach((menu) => {
                menu.open = false;
            });
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const menus = [
                resultMenuRef.current,
                sortMenuRef.current,
                typeMenuRef.current,
                confidenceMenuRef.current,
            ].filter(Boolean) as HTMLDetailsElement[];
            menus.forEach((menu) => {
                menu.open = false;
            });
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [resultMenuRef, sortMenuRef, typeMenuRef, confidenceMenuRef]);

    const handleMenuToggle = (current: HTMLDetailsElement) => {
        if (!current.open) return;
        const menus = [
            resultMenuRef.current,
            sortMenuRef.current,
            typeMenuRef.current,
            confidenceMenuRef.current,
        ].filter(Boolean) as HTMLDetailsElement[];
        menus.forEach((menu) => {
            if (menu !== current) {
                menu.open = false;
            }
        });
    };

    const handleMenuSelect = <T extends string>(
        menuRef: { current: HTMLDetailsElement | null },
        onChange: (next: T) => void,
        next: T
    ) => {
        onChange(next);
        if (menuRef.current) {
            menuRef.current.open = false;
        }
    };

    const compactSelectClass =
        "w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-1.5 py-1 pr-6 text-[10px] text-white sm:px-3 sm:py-2 sm:pr-8 sm:text-sm";

    const dropdownSummaryClass = `${compactSelectClass} relative cursor-pointer list-none text-left [&::-webkit-details-marker]:hidden`;
    const dropdownMenuClass =
        "absolute left-0 right-0 z-30 mt-2 min-w-full rounded-2xl border border-white/10 bg-black/90 p-1 text-[10px] text-white shadow-lg backdrop-blur sm:text-[11px]";
    const dropdownOptionClass =
        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition whitespace-nowrap";

    const MenuSelect = <T extends string,>({
        value,
        options,
        onChange,
        menuRef,
        ariaLabel,
        iconClassName = "h-3 w-3 sm:h-4 sm:w-4",
    }: {
        value: T;
        options: Array<{ value: T; label: string }>;
        onChange: (next: T) => void;
        menuRef: { current: HTMLDetailsElement | null };
        ariaLabel: string;
        iconClassName?: string;
    }) => {
        const selectedLabel =
            options.find((option) => option.value === value)?.label ??
            options[0]?.label ??
            "All";

        return (
            <details
                ref={menuRef}
                className="relative w-full"
                onToggle={(event) => {
                    if (event.currentTarget.open) {
                        handleMenuToggle(event.currentTarget);
                    }
                }}
            >
                <summary className={dropdownSummaryClass} aria-label={ariaLabel}>
                    <span className="block truncate">{selectedLabel}</span>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
                        <svg
                            aria-hidden
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            className={iconClassName}
                        >
                            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </summary>
                <div role="listbox" aria-label={ariaLabel} className={dropdownMenuClass}>
                    {options.map((option) => {
                        const selected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => handleMenuSelect(menuRef, onChange, option.value)}
                                className={`${dropdownOptionClass} ${selected ? "bg-white/15 text-white" : "text-gray-200 hover:bg-white/10"
                                    }`}
                            >
                                <span>{option.label}</span>
                                {selected ? (
                                    <svg
                                        aria-hidden
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-3 w-3 text-emerald-200"
                                    >
                                        <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </details>
        );
    };

    const wrapperClass = `relative space-y-4 ${variant === "card"
        ? "overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]"
        : ""
        }`;

    return (
        <section className={wrapperClass}>
            <div className="relative space-y-4">
                <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4" />
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-4">
                    <div className="min-w-0 space-y-2 text-sm">
                        <span className="block text-[9px] uppercase tracking-wide text-[var(--text-secondary)] sm:text-[11px]">
                            Result
                        </span>
                        <MenuSelect
                            ariaLabel="Result"
                            value={resultFilter}
                            options={resultOptions}
                            onChange={handleResultChange}
                            menuRef={resultMenuRef}
                            iconClassName="h-3 w-3"
                        />
                    </div>
                    <div className="min-w-0 space-y-2 text-sm">
                        <span className="block text-[9px] uppercase tracking-wide text-[var(--text-secondary)] sm:text-[11px]">
                            Sort by
                        </span>
                        <MenuSelect
                            ariaLabel="Sort by"
                            value={sortOption}
                            options={sortOptions}
                            onChange={handleSortChange}
                            menuRef={sortMenuRef}
                        />
                    </div>
                    <div className="min-w-0 space-y-2 text-sm">
                        <span className="block text-[9px] uppercase tracking-wide text-[var(--text-secondary)] sm:text-[11px]">
                            Type
                        </span>
                        <MenuSelect
                            ariaLabel="Type"
                            value={typeFilter}
                            options={typeOptions}
                            onChange={handleTypeChange}
                            menuRef={typeMenuRef}
                        />
                    </div>
                    <div className="min-w-0 space-y-2 text-sm">
                        <span className="block text-[9px] uppercase tracking-wide text-[var(--text-secondary)] sm:text-[11px]">
                            Confidence
                        </span>
                        <MenuSelect
                            ariaLabel="Confidence"
                            value={confidenceFilter}
                            options={confidenceOptions}
                            onChange={handleConfidenceChange}
                            menuRef={confidenceMenuRef}
                        />
                    </div>
                </div>
                <div className={`flex items-center ${showPostLock ? "justify-between" : "justify-end"}`}>
                    {showPostLock && (
                        <Link
                            href="/pick-builder?intent=post"
                            className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-sky-200 transition hover:text-sky-100 md:text-sm"
                        >
                            post a pick &rarr;
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!hasActiveFilters}
                        className={`rounded-2xl border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition md:px-3 md:py-2 md:text-sm ${hasActiveFilters
                            ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-400/10 to-black/40 text-rose-100 hover:border-rose-300/70 hover:text-white"
                            : "border-white/10 bg-white/5 text-[var(--text-muted)] opacity-60"
                            }`}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ProfileControls;
