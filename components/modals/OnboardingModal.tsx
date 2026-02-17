"use client";

import { useEffect } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
};

const FAQS = [
    {
        question: "What is a group?",
        answer: "Groups are private spaces with your friends so you can track everyone's slips and picks together.",
    },
    {
        question: "What is a slip?",
        answer: "A slip is a collection of picks with its own deadlines, pick limits, and whether it counts toward the leaderboard.",
    },
    {
        question: "How do points work?",
        answer:
            "Global points + XP use the full tier table. Group leaderboards cap at Tier 6, and only leaderboard slips impact standings. Vibe slips award XP only.",
    },
    {
        question: "Can I edit picks?",
        answer: "Yes. You can adjust or resubmit your picks until the slip's pick deadline or until you hit the pick limit.",
    },
];

export const OnboardingModal = ({ open, onClose }: Props) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-2xl overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-white">How gotLocks works</h2>
                        <p className="text-xs text-gray-400">
                            See how groups, slips, and grading fit together.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close details"
                    >
                        x
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <section className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold tracking-wide text-sky-200">
                                Quick rundown of the flow.
                            </p>
                            <p className="text-xs text-gray-400">
                                Learn how groups host multiple slips and when the leaderboard updates.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-inner">
                            <div className="aspect-video">
                                <iframe
                                    className="h-full w-full"
                                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                    title="gotLocks walkthrough placeholder"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">FAQ</h3>
                        <div className="flex flex-col gap-3">
                            {FAQS.map((faq) => (
                                <div
                                    key={faq.question}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                >
                                    <p className="text-sm font-semibold text-white">{faq.question}</p>
                                    <p className="mt-1 text-xs text-gray-300">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
