"use client";

import { useEffect, useId, useState } from "react";

/**
 * The Arena Guide — a four-step primer on how an Arena works, opened from the
 * "Arena guide" button under the Arena name.
 *
 * Ported from the MVP's ArenaMemberWelcomeDialog, copy included. Steps 2–4
 * describe Venue Check-In contests (QR scan + location verification), which is
 * the MVP's model for an in-person Arena and is deliberately kept verbatim here
 * so this screen stays at MVP parity.
 *
 * `onComplete` and `onDismiss` are kept as separate callbacks even though this
 * screen wires both to the same close: the MVP ALSO auto-opens the guide on a
 * member's first visit and records which way it was closed. That path needs
 * per-arena progress, which this backend has no table for (user_tutorial_progress
 * is keyed by user + a fixed global key), so only the manual trigger is wired.
 * Keeping the split means adding the auto-open later touches the caller, not this
 * component.
 */

const makeSteps = (arenaName: string) => [
    {
        eyebrow: "Step 1 of 4",
        title: `Welcome to ${arenaName}`,
        body: "Follow Arena activity, enter contests, earn Arena Points, and compete with this community.",
    },
    {
        eyebrow: "Step 2 of 4",
        title: "Some contests are open anywhere",
        body: "Open contests can be entered remotely while the entry window is active.",
        chip: "OPEN ENTRY",
    },
    {
        eyebrow: "Step 3 of 4",
        title: "Some contests require a venue visit",
        body: "Venue Check-In contests require you to scan the Arena’s physical QR code and complete a quick location check before submitting.",
        sequence: "Visit venue → Scan QR → Verify location → Build entry",
    },
    {
        eyebrow: "Step 4 of 4",
        title: "Your location is checked only when you check in",
        body: "gotLocks does not continuously track your location. Venue staff can see that a check-in occurred, but should not see your precise device location.",
    },
] as const;

export const ArenaMemberWelcomeDialog = ({
    open,
    arenaName,
    onComplete,
    onDismiss,
}: {
    open: boolean;
    arenaName: string;
    /** Closed by finishing the last step. */
    onComplete: () => void;
    /** Closed by "Skip for now", Escape, or the backdrop. */
    onDismiss: () => void;
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const titleId = useId();

    // Restarts at step 1 on every open, and closes on Escape.
    useEffect(() => {
        if (!open) return;
        setStepIndex(0);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onDismiss();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onDismiss, open]);

    if (!open) return null;

    const steps = makeSteps(arenaName);
    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={onDismiss}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                // The backdrop closes on click; the panel must not pass its own
                // clicks up to it.
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0b0b0f] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-3xl sm:p-8"
            >
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
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
                        {arenaName}
                    </p>
                    {"chip" in step ? (
                        <span className="mt-4 inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-emerald-200">
                            {step.chip}
                        </span>
                    ) : null}
                    <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-tight text-white">
                        {step.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-gray-300">{step.body}</p>
                    {"sequence" in step ? (
                        <p className="mt-5 rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-center text-xs font-semibold leading-6 text-violet-100">
                            {step.sequence}
                        </p>
                    ) : null}
                </div>

                <div className="mt-7 flex items-center justify-between gap-4">
                    <div
                        className="flex gap-1.5"
                        aria-label={`Onboarding step ${stepIndex + 1} of ${steps.length}`}
                    >
                        {steps.map((candidate, index) => (
                            <span
                                key={candidate.title}
                                className={`h-1.5 rounded-full transition-all ${index === stepIndex ? "w-7 bg-violet-300" : "w-2 bg-white/15"
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
                            {isLastStep ? "Explore Arena" : "Continue"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ArenaMemberWelcomeDialog;
