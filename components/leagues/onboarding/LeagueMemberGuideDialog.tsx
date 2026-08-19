"use client";

import { useEffect, useId, useState } from "react";
import { useCommunityGuideDialog } from "@/components/community/useCommunityGuideDialog";

/**
 * The League Guide — a four-step primer on how a League works.
 *
 * Opened two ways, and the caller tells them apart: AUTOMATICALLY on a newly
 * joined member's first visit (gated on `should_show_guide` from
 * `GET /group/league/guide`), or manually from the "League guide" button under
 * the League name. Only the automatic open records an acknowledgement — a
 * manual re-read must never overwrite an existing 'completed'.
 *
 * Ported from the MVP's LeagueMemberGuideDialog, copy included. Steps 2–4
 * describe the Fantasy Contest / Feed Contest split and the fact that their
 * points live on separate lifetime boards, which is the whole reason the guide
 * exists; kept verbatim so this screen stays at MVP parity.
 *
 * `onComplete` and `onDismiss` are separate because the two are recorded
 * differently: 'completed' means read through, 'dismissed' means closed early.
 * Both silence the guide — the split exists so "how many members actually read
 * it" stays an answerable question.
 *
 * Two deliberate differences from the Arena's ArenaMemberWelcomeDialog, both
 * matching the MVP: the backdrop does NOT dismiss (Escape, "Skip for now" or
 * finishing are the only exits, so a stray tap on a full-screen sheet cannot
 * burn a member's one automatic showing), and keyboard containment comes from
 * `useCommunityGuideDialog` — focus trap, scroll lock and focus restore —
 * instead of a bare Escape listener.
 */

const makeSteps = (leagueName: string) => [
    {
        eyebrow: "Step 1 of 4",
        title: `Welcome to ${leagueName}`,
        body: "Use the League Feed to follow commissioner updates, review entries and finalized results, and compare lifetime standings with your group.",
    },
    {
        eyebrow: "Step 2 of 4",
        title: "Two ways to compete",
        body: "Fantasy Contests organize a series of League Slips, while Feed Contests ask every member to build one structured entry for a shared slate.",
        sequence: "Fantasy Contests · Feed Contests",
    },
    {
        eyebrow: "Step 3 of 4",
        title: "Fantasy Contests run through Slips",
        body: "Submit one pick in each League Slip. Once a Slip is finalized, accepted odds become Slip Points; in Pro Leagues, badge bonuses also join the Fantasy lifetime standings.",
        chip: "FANTASY CONTEST",
        sequence: "Contest → League Slips → One pick per Slip → Fantasy standings",
    },
    {
        eyebrow: "Step 4 of 4",
        title: "Feed Contest points stay separate",
        body: "Finalized Feed Contest entries earn League Points on their own lifetime board. Pending entries and ordinary Feed posts add nothing, and Fantasy Slip Points are never combined with them.",
        chip: "FEED CONTEST",
    },
] as const;

export const LeagueMemberGuideDialog = ({
    open,
    leagueName,
    onComplete,
    onDismiss,
}: {
    open: boolean;
    leagueName: string;
    /** Closed by finishing the last step. */
    onComplete: () => void;
    /** Closed by "Skip for now" or Escape — the backdrop does not dismiss. */
    onDismiss: () => void;
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const titleId = useId();
    // Focus trap, body scroll lock, initial focus, focus restore, and the
    // Escape handler all live in the hook.
    const dialogRef = useCommunityGuideDialog({ open, onDismiss });

    // Restarts at step 1 on every open, so a manual re-read starts from the top.
    useEffect(() => {
        if (open) setStepIndex(0);
    }, [open]);

    if (!open) return null;

    const steps = makeSteps(leagueName);
    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                // Required by the hook: the panel itself is the initial focus
                // target and the anchor the Tab cycle wraps around.
                tabIndex={-1}
                className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0b0b0f] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-3xl sm:p-8"
            >
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                        {step.eyebrow}
                    </span>
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                    >
                        Skip for now
                    </button>
                </div>

                {/* min-h holds the panel steady as the step copy changes length. */}
                <div className="mt-8 min-h-48">
                    {/* Uppercased, as in the MVP — deliberately NOT `allow-caps`,
                        which is `text-transform: none !important` in globals.css
                        and would cancel it. */}
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {leagueName}
                    </p>
                    {"chip" in step ? (
                        <span className="mt-4 inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-sky-200">
                            {step.chip}
                        </span>
                    ) : null}
                    <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-tight text-white">
                        {step.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-gray-300">{step.body}</p>
                    {"sequence" in step ? (
                        <p className="mt-5 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-center text-xs font-semibold leading-6 text-sky-100">
                            {step.sequence}
                        </p>
                    ) : null}
                </div>

                <div className="mt-7 flex items-center justify-between gap-4">
                    <div
                        className="flex gap-1.5"
                        aria-label={`Guide step ${stepIndex + 1} of ${steps.length}`}
                    >
                        {steps.map((candidate, index) => (
                            <span
                                key={candidate.title}
                                className={`h-1.5 rounded-full transition-all ${
                                    index === stepIndex ? "w-7 bg-sky-300" : "w-2 bg-white/15"
                                }`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {stepIndex > 0 ? (
                            <button
                                type="button"
                                onClick={() => setStepIndex((current) => current - 1)}
                                className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-gray-200 transition hover:bg-white/5"
                            >
                                Back
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => {
                                if (isLastStep) onComplete();
                                else setStepIndex((current) => current + 1);
                            }}
                            className="min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200"
                        >
                            {isLastStep ? "Explore League" : "Continue"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LeagueMemberGuideDialog;
