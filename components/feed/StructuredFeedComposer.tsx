"use client";

import { useEffect, useMemo, useState } from "react";
import {
    formatStructuredFeedAmericanOdds,
    getStructuredFeedPointLabel,
    getStructuredFeedRoleLabel,
} from "./formatters";
import type {
    StructuredFeedCapabilities,
    StructuredFeedComposerMode,
    StructuredFeedContextMetadata,
    StructuredFeedContestOption,
    StructuredFeedPickComposerMode,
    StructuredFeedPickSubmission,
    StructuredFeedQuote,
    StructuredFeedRole,
    StructuredFeedRollingWindow,
    StructuredFeedSelectionOption,
    StructuredFeedSubmission,
    StructuredFeedSubmitResponse,
} from "./types";

type ComposerModeOption = {
    id: StructuredFeedComposerMode;
    label: string;
};

const COMPOSER_MODES: readonly ComposerModeOption[] = [
    { id: "community_pick", label: "Pick Post" },
    { id: "competitive_pick", label: "Contest Entry" },
    { id: "staff_pick", label: "Staff Pick" },
    { id: "staff_post", label: "Announcement" },
];

const modeAllowed = (
    mode: StructuredFeedComposerMode,
    capabilities: StructuredFeedCapabilities,
) => {
    if (mode === "community_pick") return capabilities.canCreateCommunityPick;
    if (mode === "competitive_pick") return capabilities.canCreateCompetitivePick;
    if (mode === "staff_pick") return capabilities.canCreateStaffPick;
    return capabilities.canCreateStaffPost;
};

const getSubmitLabel = (mode: StructuredFeedComposerMode) => {
    if (mode === "community_pick") return "Publish Pick Post";
    if (mode === "competitive_pick") return "Submit Contest Entry";
    if (mode === "staff_pick") return "Post Staff Pick";
    return "Post Announcement";
};

type PendingPriceChange = {
    submission: StructuredFeedPickSubmission;
    previousQuote: StructuredFeedQuote;
    nextQuote: StructuredFeedQuote;
    message?: string;
};

export type StructuredFeedComposerProps = {
    context: StructuredFeedContextMetadata;
    currentRole: StructuredFeedRole;
    capabilities: StructuredFeedCapabilities;
    selectionOptions: readonly StructuredFeedSelectionOption[];
    contestOptions?: readonly StructuredFeedContestOption[];
    communityPickWindow?: StructuredFeedRollingWindow;
    onSubmit: (
        submission: StructuredFeedSubmission,
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
};

export const StructuredFeedComposer = ({
    context,
    currentRole,
    capabilities,
    selectionOptions,
    contestOptions = [],
    communityPickWindow,
    onSubmit,
}: StructuredFeedComposerProps) => {
    const availableModes = useMemo(
        () => COMPOSER_MODES.filter((option) => modeAllowed(option.id, capabilities)),
        [capabilities],
    );
    const [mode, setMode] = useState<StructuredFeedComposerMode>(
        availableModes[0]?.id ?? "community_pick",
    );
    const [selectionId, setSelectionId] = useState("");
    const [contestId, setContestId] = useState("");
    const [note, setNote] = useState("");
    const [announcementBody, setAnnouncementBody] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<
        { tone: "success" | "error"; message: string } | undefined
    >();
    const [pendingPriceChange, setPendingPriceChange] = useState<PendingPriceChange | null>(
        null,
    );

    useEffect(() => {
        if (!availableModes.some((option) => option.id === mode) && availableModes[0]) {
            setMode(availableModes[0].id);
        }
    }, [availableModes, mode]);

    const isPickMode = mode !== "staff_post";
    const pickMode = isPickMode ? (mode as StructuredFeedPickComposerMode) : null;
    const availableSelections = useMemo(
        () =>
            pickMode
                ? selectionOptions.filter(
                    (option) => !option.modes || option.modes.includes(pickMode),
                )
                : [],
        [pickMode, selectionOptions],
    );
    const openContests = useMemo(
        () => contestOptions.filter((contest) => contest.acceptsEntries !== false),
        [contestOptions],
    );
    const selectedOption = availableSelections.find((option) => option.id === selectionId);
    const selectedContest = openContests.find((contest) => contest.id === contestId);
    const pointLabel = getStructuredFeedPointLabel(context);
    const rollingWindowHours = communityPickWindow?.windowHours ?? 24;
    const rollingSlotsRemaining = communityPickWindow
        ? Math.max(0, communityPickWindow.limit - communityPickWindow.used)
        : null;
    const communitySlotsFull =
        mode === "community_pick" && rollingSlotsRemaining !== null && rollingSlotsRemaining === 0;

    useEffect(() => {
        if (selectionId && !availableSelections.some((option) => option.id === selectionId)) {
            setSelectionId("");
        }
    }, [availableSelections, selectionId]);

    useEffect(() => {
        if (contestId && !openContests.some((contest) => contest.id === contestId)) {
            setContestId("");
        }
    }, [contestId, openContests]);

    const clearAcceptedDraft = (submission: StructuredFeedSubmission) => {
        if (submission.mode === "staff_post") {
            setAnnouncementBody("");
        } else {
            setSelectionId("");
            setContestId("");
            setNote("");
        }
    };

    const runSubmission = async (submission: StructuredFeedSubmission) => {
        setSubmitting(true);
        setFeedback(undefined);
        try {
            const response = await onSubmit(submission);
            if (response.status === "price_changed") {
                if (submission.mode === "staff_post") {
                    setFeedback({ tone: "error", message: "A text post cannot return a price change." });
                    return;
                }
                setPendingPriceChange({
                    submission,
                    previousQuote: submission.acceptedQuote,
                    nextQuote: response.quote,
                    message: response.message,
                });
                return;
            }
            if (response.status === "rejected") {
                setFeedback({ tone: "error", message: response.message });
                return;
            }
            setPendingPriceChange(null);
            clearAcceptedDraft(submission);
            setFeedback({ tone: "success", message: response.message ?? "Posted to the Feed." });
        } catch (error) {
            setFeedback({
                tone: "error",
                message: error instanceof Error ? error.message : "The Feed post could not be submitted.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const submitDraft = () => {
        if (mode === "staff_post") {
            const body = announcementBody.trim();
            if (!body) return;
            void runSubmission({ mode, context, body });
            return;
        }
        if (!selectedOption || selectedOption.disabled || communitySlotsFull) return;
        if (mode === "competitive_pick" && !selectedContest) return;
        void runSubmission({
            mode,
            context,
            selectionId: selectedOption.id,
            contestId: mode === "competitive_pick" ? selectedContest?.id ?? null : null,
            note: note.trim(),
            acceptedQuote: selectedOption.quote,
            confirmPriceChange: false,
        });
    };

    const submitDisabled =
        submitting ||
        (mode === "staff_post"
            ? !announcementBody.trim()
            : !selectedOption ||
            Boolean(selectedOption.disabled) ||
            communitySlotsFull ||
            (mode === "competitive_pick" && !selectedContest));

    if (!availableModes.length) {
        return (
            <section className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-5">
                <h2 className="font-semibold text-white">Feed composer</h2>
                <p className="mt-2 text-sm text-gray-400">
                    Posting is unavailable for your current role or this community state.
                </p>
            </section>
        );
    }

    return (
        <section
            aria-label="Feed composer"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold text-white">Create for this Feed</h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Posting as {getStructuredFeedRoleLabel(currentRole)}
                    </p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                    Deterministic quote
                </span>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Composer mode">
                {availableModes.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        aria-pressed={mode === option.id}
                        onClick={() => {
                            setMode(option.id);
                            setPendingPriceChange(null);
                            setFeedback(undefined);
                        }}
                        className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${mode === option.id
                                ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                                : "border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-200"
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {mode === "community_pick" && communityPickWindow ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-gray-400">
                    <p>
                        {rollingSlotsRemaining} of {communityPickWindow.limit} community post slots available
                        in this rolling {rollingWindowHours}-hour window.
                    </p>
                    {communitySlotsFull && communityPickWindow.nextSlotAtLabel ? (
                        <p className="mt-1 text-amber-200">
                            Next slot opens {communityPickWindow.nextSlotAtLabel}.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {mode === "competitive_pick" ? (
                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                    Contest
                    <select
                        value={contestId}
                        onChange={(event) => setContestId(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                    >
                        <option value="">Choose an open contest</option>
                        {openContests.map((contest) => (
                            <option key={contest.id} value={contest.id}>
                                {contest.name}
                                {contest.locksAtLabel ? ` · locks ${contest.locksAtLabel}` : ""}
                            </option>
                        ))}
                    </select>
                </label>
            ) : null}

            {isPickMode ? (
                <>
                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                        Selection
                        <select
                            value={selectionId}
                            onChange={(event) => setSelectionId(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                        >
                            <option value="">Choose a priced selection</option>
                            {availableSelections.map((option) => (
                                <option key={option.id} value={option.id} disabled={option.disabled}>
                                    {option.label} · {formatStructuredFeedAmericanOdds(option.quote.americanOdds)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectedOption ? (
                        <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-500/10 p-4">
                            {selectedOption.marketLabel ? (
                                <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-sky-100/60">
                                    {selectedOption.marketLabel}
                                </p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white">{selectedOption.label}</p>
                                <span className="font-mono text-sm font-semibold text-sky-100">
                                    {formatStructuredFeedAmericanOdds(selectedOption.quote.americanOdds)}
                                </span>
                            </div>
                            {selectedOption.description ? (
                                <p className="mt-2 text-xs leading-5 text-gray-400">
                                    {selectedOption.description}
                                </p>
                            ) : null}
                            {mode === "staff_pick" ? (
                                <p className="mt-3 text-xs font-semibold text-amber-100">
                                    Staff Picks do not earn {pointLabel} or affect standings.
                                </p>
                            ) : (
                                <>
                                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100/60">
                                        Potential {pointLabel}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-sky-50">
                                        +{selectedOption.quote.potentialPoints} {pointLabel}
                                    </p>
                                </>
                            )}
                        </div>
                    ) : null}

                    {mode === "staff_pick" ? (
                        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                            Staff note <span className="normal-case text-gray-600">(optional)</span>
                            <textarea
                                rows={2}
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="Add noncompetitive context for the Feed"
                                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                            />
                        </label>
                    ) : null}
                </>
            ) : (
                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                    Announcement
                    <textarea
                        rows={4}
                        value={announcementBody}
                        onChange={(event) => setAnnouncementBody(event.target.value)}
                        placeholder="Share an update with the community"
                        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                    />
                </label>
            )}

            {pendingPriceChange ? (
                <div role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-4">
                    <p className="font-semibold text-amber-100">Price changed</p>
                    <p className="mt-1 text-sm leading-5 text-amber-100/80">
                        {pendingPriceChange.message ?? "Review the updated quote before submitting."}
                    </p>
                    <p className="mt-3 text-sm text-white">
                        Quote moved from{" "}
                        <span className="font-mono">
                            {formatStructuredFeedAmericanOdds(
                                pendingPriceChange.previousQuote.americanOdds,
                            )}
                        </span>{" "}
                        to{" "}
                        <span className="font-mono font-semibold text-amber-100">
                            {formatStructuredFeedAmericanOdds(pendingPriceChange.nextQuote.americanOdds)}
                        </span>
                        .
                    </p>
                    {pendingPriceChange.submission.mode === "staff_pick" ? (
                        <p className="mt-3 text-xs font-semibold text-amber-100">
                            Staff Picks do not earn {pointLabel} or affect standings.
                        </p>
                    ) : (
                        <>
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100/60">
                                Potential {pointLabel}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-amber-50">
                                +{pendingPriceChange.nextQuote.potentialPoints} {pointLabel}
                            </p>
                        </>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                                void runSubmission({
                                    ...pendingPriceChange.submission,
                                    acceptedQuote: pendingPriceChange.nextQuote,
                                    confirmPriceChange: true,
                                })
                            }
                            className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-black transition hover:bg-white disabled:opacity-50"
                        >
                            Accept updated price
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => setPendingPriceChange(null)}
                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}

            {feedback ? (
                <p
                    role={feedback.tone === "error" ? "alert" : "status"}
                    className={`mt-4 text-sm ${feedback.tone === "error" ? "text-red-200" : "text-emerald-200"
                        }`}
                >
                    {feedback.message}
                </p>
            ) : null}

            <button
                type="button"
                disabled={submitDisabled || Boolean(pendingPriceChange)}
                onClick={submitDraft}
                className="mt-4 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {submitting ? "Submitting…" : getSubmitLabel(mode)}
            </button>
        </section>
    );
};

export default StructuredFeedComposer;
