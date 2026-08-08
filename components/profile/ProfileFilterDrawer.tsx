"use client";

import type { RefObject } from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import {
    CONFIDENCE_FILTER_OPTIONS,
    PROFILE_FILTER_DEFAULTS,
    RESULT_FILTER_OPTIONS,
    SORT_OPTIONS,
    TYPE_FILTER_OPTIONS,
    type ConfidenceFilter,
    type ProfileFilterOption,
    type ResultFilter,
    type SortOption,
    type TypeFilter,
} from "./profileFilters";

type FilterChoiceGroupProps<T extends string> = {
    label: string;
    value: T;
    defaultValue: T;
    options: readonly ProfileFilterOption<T>[];
    onChange: (next: T) => void;
};

const FilterChoiceGroup = <T extends string,>({
    label,
    value,
    defaultValue,
    options,
    onChange,
}: FilterChoiceGroupProps<T>) => (
    <section className="border-b border-white/10 py-5 last:border-b-0">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            {label}
        </h3>
        <div role="group" aria-label={label} className="mt-3 grid grid-cols-2 gap-2">
            {options.map((option) => {
                const selected = option.value === value;
                // Tapping the active non-default choice clears it, so a filter can be
                // dropped without hunting for the "All" pill.
                const clearsSelection = selected && option.value !== defaultValue;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(clearsSelection ? defaultValue : option.value)}
                        className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none ${selected
                            ? "border-white/40 bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                            }`}
                    >
                        <span>{option.label}</span>
                        <span
                            aria-hidden
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-black/25 bg-black/10" : "border-white/20 bg-black/20"
                                }`}
                        >
                            {selected ? (
                                <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-3 w-3"
                                >
                                    <path d="m3 8 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : null}
                        </span>
                    </button>
                );
            })}
        </div>
    </section>
);

type ProfileFilterDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    resultFilter: ResultFilter;
    typeFilter: TypeFilter;
    confidenceFilter: ConfidenceFilter;
    sortOption: SortOption;
    onResultChange: (next: ResultFilter) => void;
    onTypeChange: (next: TypeFilter) => void;
    onConfidenceChange: (next: ConfidenceFilter) => void;
    onSortChange: (next: SortOption) => void;
};

export const ProfileFilterDrawer = ({
    open,
    onClose,
    returnFocusRef,
    resultFilter,
    typeFilter,
    confidenceFilter,
    sortOption,
    onResultChange,
    onTypeChange,
    onConfidenceChange,
    onSortChange,
}: ProfileFilterDrawerProps) => (
    <LeftWorkspaceDrawer
        open={open}
        onClose={onClose}
        title="Filter posts"
        returnFocusRef={returnFocusRef}
        backdropLabel="Dismiss post filters"
        side="right"
        size="compact"
        tone="neutral"
        contentClassName="pt-0"
    >
        <FilterChoiceGroup
            label="Result"
            value={resultFilter}
            defaultValue={PROFILE_FILTER_DEFAULTS.result}
            options={RESULT_FILTER_OPTIONS}
            onChange={onResultChange}
        />
        <FilterChoiceGroup
            label="Post type"
            value={typeFilter}
            defaultValue={PROFILE_FILTER_DEFAULTS.type}
            options={TYPE_FILTER_OPTIONS}
            onChange={onTypeChange}
        />
        <FilterChoiceGroup
            label="Confidence"
            value={confidenceFilter}
            defaultValue={PROFILE_FILTER_DEFAULTS.confidence}
            options={CONFIDENCE_FILTER_OPTIONS}
            onChange={onConfidenceChange}
        />
        <FilterChoiceGroup
            label="Sort by"
            value={sortOption}
            defaultValue={PROFILE_FILTER_DEFAULTS.sort}
            options={SORT_OPTIONS}
            onChange={onSortChange}
        />
    </LeftWorkspaceDrawer>
);

export default ProfileFilterDrawer;
