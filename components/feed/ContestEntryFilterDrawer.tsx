"use client";

import type { RefObject } from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import type { ContestEntryLifecycleFilter } from "./types";

const ENTRY_STATUS_OPTIONS: readonly {
    value: ContestEntryLifecycleFilter;
    label: string;
    description: string;
}[] = [
        {
            value: "all",
            label: "All entries",
            description: "Show every contest entry available in this Feed.",
        },
        {
            value: "open",
            label: "Open",
            description: "Entries whose contest window is still open.",
        },
        {
            value: "locked_live",
            label: "Locked / Live",
            description: "Locked entries that are waiting, live, or being graded.",
        },
        {
            value: "settled",
            label: "Settled",
            description: "Entries with finalized contest results.",
        },
    ];

type ContestEntryFilterDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    value: ContestEntryLifecycleFilter;
    onChange: (next: ContestEntryLifecycleFilter) => void;
    /**
     * How many entries the CURRENT lifecycle choice leaves, out of every entry
     * in the Feed. The lifecycle buttons below are the only thing that narrows
     * the Entries list, so this tally matches the rendered list exactly. Should
     * a second narrowing axis ever return, keep this measured against the
     * lifecycle filter alone — otherwise the tally contradicts what the
     * drawer's own buttons control.
     */
    visibleCount: number;
    totalCount: number;
};

export const ContestEntryFilterDrawer = ({
    open,
    onClose,
    returnFocusRef,
    value,
    onChange,
    visibleCount,
    totalCount,
}: ContestEntryFilterDrawerProps) => (
    <LeftWorkspaceDrawer
        open={open}
        onClose={onClose}
        title="Filter contest entries"
        returnFocusRef={returnFocusRef}
        backdropLabel="Dismiss contest entry filters"
        side="left"
        size="compact"
        tone="neutral"
        contentClassName="pt-0"
    >
        <section className="py-5">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Entry status
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Choose the contest phase you want to review.
                    </p>
                </div>
                <p
                    aria-live="polite"
                    className="shrink-0 text-xs font-medium tabular-nums text-gray-400"
                >
                    {visibleCount} of {totalCount}
                </p>
            </div>

            <div role="group" aria-label="Entry status" className="mt-4 grid gap-2">
                {ENTRY_STATUS_OPTIONS.map((option) => {
                    const selected = option.value === value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(option.value)}
                            className={`flex min-h-14 items-center justify-between gap-4 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none ${selected
                                ? "border-white/40 bg-white text-black"
                                : "border-white/10 bg-white/[0.03] text-gray-200 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                                }`}
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold">{option.label}</span>
                                <span
                                    className={`mt-0.5 block text-xs leading-4 ${selected ? "text-black/60" : "text-gray-500"
                                        }`}
                                >
                                    {option.description}
                                </span>
                            </span>
                            <span
                                aria-hidden="true"
                                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected
                                    ? "border-black/25 bg-black/10"
                                    : "border-white/20 bg-black/20"
                                    }`}
                            >
                                {selected ? (
                                    <svg
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-3.5 w-3.5"
                                    >
                                        <path
                                            d="m3 8 3 3 7-7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : null}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    </LeftWorkspaceDrawer>
);

export default ContestEntryFilterDrawer;
