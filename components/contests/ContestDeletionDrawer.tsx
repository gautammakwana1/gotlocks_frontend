"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import {
    CONTEST_DELETION_NOTE_MAX_LENGTH,
    formatContestDeletionSystemMessage,
} from "@/lib/contests/contestDeletion";

/* ----------------------------------------------------------------------------
 * The organizer's contest-deletion flow, ported from the MVP
 * (gotlocks.app_mvp2/components/contests/ContestDeletionDrawer.tsx).
 *
 * Three steps — review, organizer note, typed confirmation — collapsing to two
 * when nobody has entered, because there is then nobody to notify. The note step
 * is not optional decoration: deletion is the one contest write that leaves an
 * entrant with no record of why their entry disappeared, so the drawer refuses to
 * submit without one.
 *
 * `onDelete` is deliberately allowed to be async and to REPORT FAILURE rather
 * than throw: a rejected delete keeps the drawer open on the confirm step with
 * the server's own message, so the organizer does not retype the phrase.
 * -------------------------------------------------------------------------- */

export type ContestDeletionDrawerAccent = "league" | "arena";

export type ContestDeletionResult = {
    success: boolean;
    error?: string;
};

export type ContestDeletionDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    contestName: string;
    communityName: string;
    phaseLabel: string;
    entrantCount: number;
    /** TRUE for a finalized contest, whose points and badges get clawed back. */
    reversesAwards: boolean;
    /**
     * What the clawed-back points are CALLED on this surface. Defaults off the
     * accent so an Arena drawer reads "Arena Points" without every caller having
     * to pass it; "Fantasy Points" is here for the League Slip contests.
     */
    pointsLabel?: "Fantasy Points" | "League Points" | "Arena Points";
    organizerHandle: string;
    onDelete: (
        organizerNote: string
    ) => ContestDeletionResult | Promise<ContestDeletionResult>;
    accent?: ContestDeletionDrawerAccent;
};

type DeletionStep = "review" | "message" | "confirm";

const DEFAULT_ORGANIZER_NOTE =
    "This contest is no longer available. Contact the organizer if you have questions.";

const accentClasses: Record<
    ContestDeletionDrawerAccent,
    { step: string; focus: string; checkbox: string }
> = {
    league: {
        step: "text-sky-200",
        focus: "focus:border-sky-300/60 focus-visible:ring-sky-300/60",
        checkbox: "accent-sky-400",
    },
    arena: {
        step: "text-violet-200",
        focus: "focus:border-violet-300/60 focus-visible:ring-violet-300/60",
        checkbox: "accent-violet-400",
    },
};

const entrantLabel = (count: number) =>
    `${count.toLocaleString()} ${count === 1 ? "entrant" : "entrants"}`;

export const ContestDeletionDrawer = ({
    open,
    onClose,
    returnFocusRef,
    contestName,
    communityName,
    phaseLabel,
    entrantCount,
    reversesAwards,
    organizerHandle,
    onDelete,
    accent = "league",
    pointsLabel = accent === "arena" ? "Arena Points" : "League Points",
}: ContestDeletionDrawerProps) => {
    const [step, setStep] = useState<DeletionStep>("review");
    const [organizerNote, setOrganizerNote] = useState(DEFAULT_ORGANIZER_NOTE);
    const [acknowledged, setAcknowledged] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Mirrors `submitting` in a ref so the close/submit guards read the CURRENT
    // value rather than the one captured when the handler was created.
    const submittingRef = useRef(false);
    // Bumped on every reset and every submit, so a reply that arrives after the
    // drawer was reset or reopened is dropped instead of writing stale state.
    const requestIdRef = useRef(0);

    const safeEntrantCount = Math.max(0, Math.floor(entrantCount));
    const hasEntrants = safeEntrantCount > 0;
    const confirmationPhrase = `DELETE ${contestName}`;
    const systemMessage = formatContestDeletionSystemMessage({
        contestName,
        organizerHandle,
    });
    const styles = accentClasses[accent];
    const steps: readonly DeletionStep[] = hasEntrants
        ? ["review", "message", "confirm"]
        : ["review", "confirm"];
    const currentStepIndex = steps.indexOf(step);

    const resetFlow = useCallback(() => {
        requestIdRef.current += 1;
        submittingRef.current = false;
        setStep("review");
        setOrganizerNote(DEFAULT_ORGANIZER_NOTE);
        setAcknowledged(false);
        setConfirmation("");
        setSubmitting(false);
        setError(null);
    }, []);

    useEffect(() => {
        if (!open) resetFlow();
    }, [open, resetFlow]);

    // A different contest behind the same open drawer restarts the flow — the
    // typed confirmation phrase is contest-specific and must never carry over.
    useEffect(() => {
        if (open) resetFlow();
    }, [contestName, open, resetFlow]);

    const requestClose = () => {
        if (submittingRef.current) return;
        resetFlow();
        onClose();
    };

    const goForward = () => {
        setError(null);
        if (step === "review") {
            setStep(hasEntrants ? "message" : "confirm");
            return;
        }
        if (step === "message" && organizerNote.trim()) setStep("confirm");
    };

    const goBack = () => {
        setError(null);
        if (step === "confirm") {
            setStep(hasEntrants ? "message" : "review");
            return;
        }
        setStep("review");
    };

    const handleDelete = async () => {
        const trimmedNote = organizerNote.trim();
        if (
            submittingRef.current ||
            !trimmedNote ||
            !acknowledged ||
            confirmation !== confirmationPhrase
        ) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setError(null);
        const requestId = ++requestIdRef.current;

        try {
            const result = await onDelete(trimmedNote);
            if (requestId !== requestIdRef.current) return;

            if (!result.success) {
                submittingRef.current = false;
                setSubmitting(false);
                setError(result.error || "The contest could not be deleted. Try again.");
                return;
            }

            resetFlow();
            onClose();
        } catch {
            if (requestId !== requestIdRef.current) return;
            submittingRef.current = false;
            setSubmitting(false);
            setError("The contest could not be deleted. Try again.");
        }
    };

    const finalActionLabel = hasEntrants
        ? `Delete contest & notify ${entrantLabel(safeEntrantCount)}`
        : "Delete contest";

    return (
        <LeftWorkspaceDrawer
            open={open}
            onClose={requestClose}
            title="Delete contest"
            returnFocusRef={returnFocusRef}
            backdropLabel="Dismiss contest deletion"
            side="right"
            size="compact"
            tone="neutral"
            className={accent === "arena" ? "arena-theme" : undefined}
            contentClassName="pt-0"
        >
            <div className="flex min-h-full flex-col">
                <div className="border-b border-white/10 py-4">
                    <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.step}`}
                    >
                        Step {currentStepIndex + 1} of {steps.length}
                    </p>
                    <div className="mt-2 flex gap-1.5" aria-hidden>
                        {steps.map((item, index) => (
                            <span
                                key={item}
                                className={`h-px flex-1 ${index <= currentStepIndex ? "bg-white/65" : "bg-white/10"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {step === "review" ? (
                    <section className="py-6" aria-labelledby="deletion-review-title">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            {phaseLabel}
                        </p>
                        <h3
                            id="deletion-review-title"
                            className="mt-2 text-xl font-semibold text-white"
                        >
                            Review what will be removed
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            <span className="font-medium text-gray-200">{contestName}</span>{" "}
                            will be permanently removed from {communityName}.
                        </p>

                        <ul className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm text-gray-300">
                            <li className="flex gap-3 py-3.5">
                                <span
                                    aria-hidden
                                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-500"
                                />
                                <span>
                                    Entries, standings, and related contest activity will be
                                    deleted.
                                </span>
                            </li>
                            {reversesAwards ? (
                                <li className="flex gap-3 py-3.5 text-red-100">
                                    <span
                                        aria-hidden
                                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-300"
                                    />
                                    <span>
                                        {pointsLabel} and achievements already awarded will be reversed.
                                    </span>
                                </li>
                            ) : null}
                            {hasEntrants ? (
                                <li className="flex gap-3 py-3.5">
                                    <span
                                        aria-hidden
                                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-500"
                                    />
                                    <span>
                                        {entrantLabel(safeEntrantCount)} will receive a deletion
                                        notice.
                                    </span>
                                </li>
                            ) : null}
                        </ul>
                    </section>
                ) : null}

                {step === "message" ? (
                    <section className="py-6" aria-labelledby="deletion-message-title">
                        <h3
                            id="deletion-message-title"
                            className="text-xl font-semibold text-white"
                        >
                            Write the organizer note
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            This note will be sent to {entrantLabel(safeEntrantCount)} with the
                            fixed deletion notice below.
                        </p>

                        <label
                            htmlFor="contest-deletion-note"
                            className="mt-6 block text-xs font-semibold uppercase tracking-[0.13em] text-gray-300"
                        >
                            Organizer note
                        </label>
                        <textarea
                            id="contest-deletion-note"
                            value={organizerNote}
                            maxLength={CONTEST_DELETION_NOTE_MAX_LENGTH}
                            rows={5}
                            required
                            onChange={(event) => setOrganizerNote(event.target.value)}
                            aria-describedby="contest-deletion-note-count"
                            className={`mt-2 w-full resize-none border-y border-white/15 bg-transparent py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus-visible:ring-2 ${styles.focus}`}
                        />
                        <p
                            id="contest-deletion-note-count"
                            className="mt-2 text-right text-xs tabular-nums text-gray-500"
                        >
                            {organizerNote.length}/{CONTEST_DELETION_NOTE_MAX_LENGTH}
                        </p>

                        <div className="mt-7 border-l border-white/20 pl-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Notification preview · system copy
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-200">
                                {systemMessage}
                            </p>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                                {organizerNote.trim() || "Your organizer note will appear here."}
                            </p>
                        </div>
                    </section>
                ) : null}

                {step === "confirm" ? (
                    <section className="py-6" aria-labelledby="deletion-confirm-title">
                        <h3
                            id="deletion-confirm-title"
                            className="text-xl font-semibold text-white"
                        >
                            Confirm permanent deletion
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            This cannot be undone. Type the phrase exactly, then acknowledge
                            the impact to continue.
                        </p>

                        <label
                            htmlFor="contest-deletion-confirmation"
                            className="mt-7 block text-xs font-semibold uppercase tracking-[0.13em] text-gray-300"
                        >
                            Type{" "}
                            <span className="font-mono normal-case text-white">
                                {confirmationPhrase}
                            </span>
                        </label>
                        <input
                            id="contest-deletion-confirmation"
                            type="text"
                            value={confirmation}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => setConfirmation(event.target.value)}
                            className={`mt-3 w-full border-b border-white/20 bg-transparent px-0 py-3 font-mono text-sm text-white outline-none transition placeholder:text-gray-700 focus-visible:ring-2 ${styles.focus}`}
                        />

                        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-300">
                            <input
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(event) => setAcknowledged(event.target.checked)}
                                className={`mt-1 h-4 w-4 shrink-0 ${styles.checkbox}`}
                            />
                            <span>
                                I understand this permanently deletes the contest
                                {reversesAwards
                                    ? ` and reverses any ${pointsLabel} and achievements already awarded.`
                                    : "."}
                            </span>
                        </label>

                        {error ? (
                            <p role="alert" className="mt-5 text-sm font-medium text-red-200">
                                {error}
                            </p>
                        ) : null}
                    </section>
                ) : null}

                <div className="mt-auto flex items-center justify-end gap-3 border-t border-white/10 py-4">
                    {step !== "review" ? (
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={submitting}
                            className="min-h-11 px-2 text-sm font-semibold text-gray-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>
                    ) : null}

                    {step !== "confirm" ? (
                        <button
                            type="button"
                            onClick={goForward}
                            disabled={step === "message" && !organizerNote.trim()}
                            className="min-h-11 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={
                                submitting ||
                                !organizerNote.trim() ||
                                !acknowledged ||
                                confirmation !== confirmationPhrase
                            }
                            className="min-h-11 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/70 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? "Deleting…" : finalActionLabel}
                        </button>
                    )}
                </div>
            </div>
        </LeftWorkspaceDrawer>
    );
};

export default ContestDeletionDrawer;
