"use client";

import type { RefObject } from "react";
import PostComposerIcon from "@/components/ui/PostComposerIcon";
import {
    CONFIDENCE_FILTER_OPTIONS,
    PROFILE_FILTER_DEFAULTS,
    RESULT_FILTER_OPTIONS,
    SORT_OPTIONS,
    TYPE_FILTER_OPTIONS,
    getProfileFilterLabel,
    type ConfidenceFilter,
    type ResultFilter,
    type SortOption,
    type TypeFilter,
} from "./profileFilters";

export type {
    ConfidenceFilter,
    ResultFilter,
    SortOption,
    TypeFilter,
} from "./profileFilters";

type ProfileControlsProps = {
    resultFilter: ResultFilter;
    typeFilter: TypeFilter;
    confidenceFilter: ConfidenceFilter;
    sortOption: SortOption;
    filterDrawerOpen?: boolean;
    filterDrawerTriggerRef?: RefObject<HTMLButtonElement | null>;
    scoringRulesOpen?: boolean;
    postComposerOpen?: boolean;
    postComposerTriggerRef?: RefObject<HTMLButtonElement | null>;
    onShowScoringRules?: () => void;
    onOpenFilterDrawer: () => void;
    onOpenPostComposer?: () => void;
    onResultChange: (next: ResultFilter) => void;
    onTypeChange: (next: TypeFilter) => void;
    onConfidenceChange: (next: ConfidenceFilter) => void;
    onSortChange: (next: SortOption) => void;
};

type ActiveFilter = {
    key: string;
    label: string;
    onRemove: () => void;
};

const FilterIcon = () => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-5 w-5"
    >
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4" />
    </svg>
);

const ScoringIcon = () => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0"
    >
        <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8 9h4M8 13h3M8 17h5" />
        <circle cx="16" cy="11.5" r="1.5" />
    </svg>
);

const RemoveIcon = () => (
    <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-3.5 w-3.5"
    >
        <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
);

const ProfileControls = ({
    resultFilter,
    typeFilter,
    confidenceFilter,
    sortOption,
    filterDrawerOpen = false,
    filterDrawerTriggerRef,
    scoringRulesOpen = false,
    postComposerOpen = false,
    postComposerTriggerRef,
    onShowScoringRules,
    onOpenFilterDrawer,
    onOpenPostComposer,
    onResultChange,
    onTypeChange,
    onConfidenceChange,
    onSortChange,
}: ProfileControlsProps) => {
    const activeFilters: ActiveFilter[] = [];

    if (resultFilter !== PROFILE_FILTER_DEFAULTS.result) {
        activeFilters.push({
            key: "result",
            label: `Result: ${getProfileFilterLabel(RESULT_FILTER_OPTIONS, resultFilter)}`,
            onRemove: () => onResultChange(PROFILE_FILTER_DEFAULTS.result),
        });
    }
    if (typeFilter !== PROFILE_FILTER_DEFAULTS.type) {
        activeFilters.push({
            key: "type",
            label: `Type: ${getProfileFilterLabel(TYPE_FILTER_OPTIONS, typeFilter)}`,
            onRemove: () => onTypeChange(PROFILE_FILTER_DEFAULTS.type),
        });
    }
    if (confidenceFilter !== PROFILE_FILTER_DEFAULTS.confidence) {
        activeFilters.push({
            key: "confidence",
            label: `Confidence: ${getProfileFilterLabel(
                CONFIDENCE_FILTER_OPTIONS,
                confidenceFilter
            )}`,
            onRemove: () => onConfidenceChange(PROFILE_FILTER_DEFAULTS.confidence),
        });
    }
    if (sortOption !== PROFILE_FILTER_DEFAULTS.sort) {
        activeFilters.push({
            key: "sort",
            label: `Sort: ${getProfileFilterLabel(SORT_OPTIONS, sortOption)}`,
            onRemove: () => onSortChange(PROFILE_FILTER_DEFAULTS.sort),
        });
    }

    const removeFilter = (filter: ActiveFilter) => {
        filter.onRemove();
        window.requestAnimationFrame(() => filterDrawerTriggerRef?.current?.focus());
    };
    const showProfileActions = Boolean(onShowScoringRules && onOpenPostComposer);

    return (
        <section
            aria-label="Profile post controls"
            className="-mx-5 border-y border-white/10 bg-black px-5 py-3 sm:-mx-6 sm:px-6"
        >
            <div
                className={
                    showProfileActions
                        ? "grid grid-cols-3 items-center gap-1.5 sm:gap-3"
                        : "flex items-center justify-end"
                }
            >
                {onShowScoringRules ? (
                    <button
                        type="button"
                        onClick={onShowScoringRules}
                        aria-haspopup="dialog"
                        aria-expanded={scoringRulesOpen}
                        className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.04] px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none sm:gap-2 sm:px-3.5 sm:text-xs sm:tracking-[0.1em]"
                    >
                        <span>Scoring</span>
                        <ScoringIcon />
                    </button>
                ) : null}

                {onOpenPostComposer ? (
                    <button
                        ref={postComposerTriggerRef}
                        type="button"
                        onClick={onOpenPostComposer}
                        aria-haspopup="dialog"
                        aria-expanded={postComposerOpen}
                        className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.04] px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none sm:gap-2 sm:px-3.5 sm:text-xs sm:tracking-[0.1em]"
                    >
                        <span>New post</span>
                        <PostComposerIcon className="h-5 w-5" />
                    </button>
                ) : null}

                <button
                    ref={filterDrawerTriggerRef}
                    type="button"
                    onClick={onOpenFilterDrawer}
                    aria-label={
                        activeFilters.length
                            ? `Filters, ${activeFilters.length} active`
                            : "Filters"
                    }
                    aria-haspopup="dialog"
                    aria-expanded={filterDrawerOpen}
                    className={`relative inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.04] px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none sm:gap-2 sm:px-3.5 sm:text-xs sm:tracking-[0.1em] ${showProfileActions ? "w-full" : "w-auto"
                        }`}
                >
                    <span>Filters</span>
                    <FilterIcon />
                    {activeFilters.length ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-black shadow-sm shadow-black/60">
                            {activeFilters.length}
                        </span>
                    ) : null}
                </button>
            </div>

            {activeFilters.length ? (
                <div
                    role="group"
                    aria-label="Active post filters"
                    className="mt-3 flex flex-wrap gap-2"
                >
                    {activeFilters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            aria-label={`Remove ${filter.label} filter`}
                            onClick={() => removeFilter(filter)}
                            className="group inline-flex min-h-9 items-center gap-1.5 px-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline focus-visible:decoration-white/50 focus-visible:underline-offset-4 motion-reduce:transition-none"
                        >
                            <span>{filter.label}</span>
                            <span className="text-rose-400 transition-colors group-hover:text-rose-300 group-focus-visible:text-rose-300 motion-reduce:transition-none">
                                <RemoveIcon />
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
};

export default ProfileControls;
