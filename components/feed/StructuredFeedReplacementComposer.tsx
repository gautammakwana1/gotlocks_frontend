"use client";

import { useMemo, useState } from "react";
import {
    formatStructuredFeedAmericanOdds,
    getStructuredFeedPointLabel,
    getStructuredFeedRecordLabel,
} from "./formatters";
import type {
    StructuredFeedContextMetadata,
    StructuredFeedPickComposerMode,
    StructuredFeedPickSubmission,
    StructuredFeedQuote,
    StructuredFeedRecord,
    StructuredFeedSelectionOption,
    StructuredFeedSubmitResponse,
} from "./types";

// No MVP counterpart: the MVP dropped the Replace flow entirely (its
// StructuredFeed passes no onReplace/onReplaceSubmit and its card has no "Replace
// pick" action). This file is kept because the replacement path is live REST
// wiring (updateCommunityPickRequest), and it is left visually untouched on
// purpose — the amber warning tone is what separates an in-place correction from
// the accent-toned create panels in GroupFeedPostCreator.
const replacementModeFor = (
    record: StructuredFeedRecord,
): StructuredFeedPickComposerMode | null => {
    if (record.kind === "community_pick") return "community_pick";
    if (record.kind === "competitive_pick") return "competitive_pick";
    if (record.kind === "staff_pick") return "staff_pick";
    return null;
};

type PendingReplacementPrice = {
    submission: StructuredFeedPickSubmission;
    previousQuote: StructuredFeedQuote;
    nextQuote: StructuredFeedQuote;
    message?: string;
};

export type StructuredFeedReplacementComposerProps = {
    context: StructuredFeedContextMetadata;
    record: StructuredFeedRecord;
    selectionOptions: readonly StructuredFeedSelectionOption[];
    onSubmit: (
        record: StructuredFeedRecord,
        submission: StructuredFeedPickSubmission,
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    onCancel: () => void;
    onAccepted: (message: string) => void;
};

export const StructuredFeedReplacementComposer = ({
    context,
    record,
    selectionOptions,
    onSubmit,
    onCancel,
    onAccepted,
}: StructuredFeedReplacementComposerProps) => {
    const mode = replacementModeFor(record);
    const availableSelections = useMemo(
        () =>
            mode
                ? selectionOptions.filter(
                    (option) => !option.modes || option.modes.includes(mode),
                )
                : [],
        [mode, selectionOptions],
    );
    const [selectionId, setSelectionId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>();
    const [pendingPrice, setPendingPrice] = useState<PendingReplacementPrice | null>(null);
    const selectedOption = availableSelections.find((option) => option.id === selectionId);
    const pointLabel = getStructuredFeedPointLabel(context);

    const runSubmission = async (submission: StructuredFeedPickSubmission) => {
        setSubmitting(true);
        setError(undefined);
        try {
            const response = await onSubmit(record, submission);
            if (response.status === "price_changed") {
                setPendingPrice({
                    submission,
                    previousQuote: submission.acceptedQuote,
                    nextQuote: response.quote,
                    message: response.message,
                });
                return;
            }
            if (response.status === "rejected") {
                setError(response.message);
                return;
            }
            setPendingPrice(null);
            onAccepted(response.message ?? "Pick replaced.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "The replacement could not be submitted.");
        } finally {
            setSubmitting(false);
        }
    };

    const submitReplacement = () => {
        if (!mode || !selectedOption || selectedOption.disabled) return;
        void runSubmission({
            mode,
            context,
            selectionId: selectedOption.id,
            contestId: mode === "competitive_pick" ? record.contest?.id ?? null : null,
            note: "",
            acceptedQuote: selectedOption.quote,
            confirmPriceChange: false,
        });
    };

    if (!mode) return null;

    return (
        <section
            aria-label={`Replace ${getStructuredFeedRecordLabel(record)}`}
            className="rounded-2xl border border-amber-300/25 bg-amber-500/[0.07] p-5"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                        {getStructuredFeedRecordLabel(record)}
                    </p>
                    <h2 className="mt-1 font-semibold text-white">Replace pick</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-400">
                        Choose a new deterministic quote. The accepted version becomes the active entry.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                >
                    Cancel replacement
                </button>
            </div>

            {mode === "community_pick" ? (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-gray-300">
                    This replacement keeps the original rolling community-post slot.
                </p>
            ) : null}

            {mode === "competitive_pick" && record.contest ? (
                <p className="mt-4 text-xs text-gray-400">
                    Contest: <span className="font-semibold text-white">{record.contest.name}</span>
                </p>
            ) : null}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                Replacement selection
                <select
                    value={selectionId}
                    onChange={(event) => setSelectionId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-amber-300/60"
                >
                    <option value="">Choose a new priced selection</option>
                    {availableSelections.map((option) => (
                        <option key={option.id} value={option.id} disabled={option.disabled}>
                            {option.label} · {formatStructuredFeedAmericanOdds(option.quote.americanOdds)}
                        </option>
                    ))}
                </select>
            </label>

            {selectedOption ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{selectedOption.label}</p>
                        <span className="font-mono text-sm font-semibold text-amber-100">
                            {formatStructuredFeedAmericanOdds(selectedOption.quote.americanOdds)}
                        </span>
                    </div>
                    {mode === "staff_pick" ? (
                        <p className="mt-3 text-xs font-semibold text-amber-100">
                            Staff Picks do not earn {pointLabel} or affect standings.
                        </p>
                    ) : (
                        <>
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Potential {pointLabel}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-amber-50">
                                +{selectedOption.quote.potentialPoints} {pointLabel}
                            </p>
                        </>
                    )}
                </div>
            ) : null}

            {pendingPrice ? (
                <div role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-black/25 p-4">
                    <p className="font-semibold text-amber-100">Replacement price changed</p>
                    <p className="mt-1 text-sm text-amber-100/80">
                        {pendingPrice.message ?? "Review the updated replacement quote."}
                    </p>
                    <p className="mt-3 text-sm text-white">
                        Quote moved from{" "}
                        <span className="font-mono">
                            {formatStructuredFeedAmericanOdds(pendingPrice.previousQuote.americanOdds)}
                        </span>{" "}
                        to{" "}
                        <span className="font-mono font-semibold text-amber-100">
                            {formatStructuredFeedAmericanOdds(pendingPrice.nextQuote.americanOdds)}
                        </span>
                        .
                    </p>
                    {mode === "staff_pick" ? (
                        <p className="mt-3 text-xs font-semibold text-amber-100">
                            Staff Picks do not earn {pointLabel} or affect standings.
                        </p>
                    ) : (
                        <>
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Potential {pointLabel}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-amber-50">
                                +{pendingPrice.nextQuote.potentialPoints} {pointLabel}
                            </p>
                        </>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                                void runSubmission({
                                    ...pendingPrice.submission,
                                    acceptedQuote: pendingPrice.nextQuote,
                                    confirmPriceChange: true,
                                })
                            }
                            className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-black transition hover:bg-white disabled:opacity-50"
                        >
                            Accept replacement price
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => setPendingPrice(null)}
                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                        >
                            Keep editing
                        </button>
                    </div>
                </div>
            ) : null}

            {error ? (
                <p role="alert" className="mt-4 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            <button
                type="button"
                disabled={
                    submitting || !selectedOption || Boolean(selectedOption.disabled) || Boolean(pendingPrice)
                }
                onClick={submitReplacement}
                className="mt-4 rounded-xl bg-amber-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
                {submitting ? "Submitting…" : "Submit replacement"}
            </button>
        </section>
    );
};

export default StructuredFeedReplacementComposer;
