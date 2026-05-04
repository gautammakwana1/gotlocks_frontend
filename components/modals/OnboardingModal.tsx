"use client";

import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";

export type OnboardingStep = {
    media?: string;          // path to image or video (skip when mediaNode is set)
    mediaNode?: ReactNode;   // inline React animation node (takes precedence over media)
    mediaAlt: string;
    title: string;
    body: string;
    imgFit?: "cover" | "contain";
    imgHeight?: number;      // legacy — desktop now fills flex like mobile
    playbackRate?: number;   // video speed multiplier, defaults to 1.5
};

type Step = OnboardingStep;

type Props = {
    open: boolean;
    steps: OnboardingStep[];
    onClose: () => void;
    finalCtaLabel?: string;
};

const isVideo = (src: string) =>
    src.endsWith(".mp4") || src.endsWith(".mov") || src.endsWith(".webm");

const MEDIA_BOX_CLASS =
    "relative mx-5 mt-5 h-[62vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] sm:mx-auto sm:mt-8 sm:h-[58vh] sm:w-full sm:max-w-4xl";

function ImageMedia({ step }: { step: Step }) {
    const src = step.media;
    if (!src) return null;
    return (
        <div className={MEDIA_BOX_CLASS}>
            <Image
                src={src}
                alt={step.mediaAlt}
                fill
                className={
                    step.imgFit === "cover"
                        ? "object-cover object-center"
                        : "object-contain object-center"
                }
                priority
            />
        </div>
    );
}

function VideoMedia({ step }: { step: Step }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const src = step.media;

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !step) return;
        const rate = step.playbackRate ?? 1.5;
        const apply = () => { el.playbackRate = rate; };
        apply();
        el.addEventListener("loadedmetadata", apply);
        return () => el.removeEventListener("loadedmetadata", apply);
    }, [step, step.playbackRate]);

    if (!src) return null;

    return (
        <div className={`${MEDIA_BOX_CLASS} flex items-center justify-center`}>
            {!step ? null : (
                <video
                    ref={videoRef}
                    src={`${src}?t=${BUILD_TS}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="block max-h-full w-full object-contain"
                />
            )}
        </div>
    );
}

function NodeMedia({ node }: { node: ReactNode }) {
    return <div className={MEDIA_BOX_CLASS}>{node}</div>;
}

const BUILD_TS = Date.now();

const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18 L9 12 L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18 L15 12 L9 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const OnboardingModal = ({ open, steps, onClose, finalCtaLabel = "let's go 🔒" }: Props) => {
    const [step, setStep] = useState(0);
    const current = steps[step];
    const isLast = step === steps.length - 1;

    useEffect(() => {
        setStep(0);
    }, [steps]);

    useEffect(() => {
        if (!open) return;

        const scrollBarWidth =
            window.innerWidth - document.documentElement.clientWidth;

        // Lock scroll while modal is open
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollBarWidth}px`;

        return () => {
            // Restore scroll when modal closes or unmounts
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            document.body.style.paddingRight = "";
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight") {
                if (isLast) onClose();
                else setStep((s) => s + 1);
            }
            if (event.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose, isLast, step]);

    // Defensive check: if steps is not provided or empty, don't render
    if (!open || !steps || steps.length === 0) return null;

    const handleBack = () => {
        if (step > 0) setStep((s) => s - 1);
    };
    const handleForward = () => {
        if (isLast) onClose();
        else setStep((s) => s + 1);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="App walkthrough"
        >
            {/* Progress bar */}
            <div className="relative z-20 flex gap-1 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:gap-1.5 sm:px-10 sm:pt-8">
                {steps.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Go to step ${i + 1}`}
                        onClick={() => setStep(i)}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 sm:h-1.5 ${i <= step ? "bg-sky-400" : "bg-white/15 hover:bg-white/30"
                            }`}
                    />
                ))}
            </div>

            {/* Content area with tap-zone navigation */}
            <div className="relative flex min-h-0 flex-1 flex-col">
                {current.mediaNode ? (
                    <NodeMedia node={current.mediaNode} />
                ) : current.media && isVideo(current?.media || "") ? (
                    <VideoMedia step={current} />
                ) : (
                    <ImageMedia step={current} />
                )}

                {/* Step content */}
                <div className="mx-auto w-full max-w-xl px-6 pb-2 pt-4 sm:max-w-3xl sm:px-10 sm:pb-4 sm:pt-8">
                    <h2 className="mb-2 text-xl font-bold text-white sm:mb-3 sm:text-3xl">
                        {current?.title}
                    </h2>
                    <p className="text-base leading-relaxed text-gray-300 sm:text-lg sm:leading-relaxed">
                        {current?.body}
                    </p>
                </div>

                {/* Tap zones — cover the content area, behind the chevron hints visually but on top for clicks */}
                <button
                    type="button"
                    aria-label="Previous step"
                    onClick={handleBack}
                    className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer select-none focus:outline-none"
                />
                <button
                    type="button"
                    aria-label={isLast ? "Finish tour" : "Next step"}
                    onClick={handleForward}
                    className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer select-none focus:outline-none"
                />

                {/* Chevron affordances — desktop only; pinned to media vertical center */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-8 hidden h-[58vh] items-center pl-6 sm:flex"
                >
                    <ChevronLeftIcon
                        className={`h-12 w-12 text-white/25 transition-opacity ${step === 0 ? "opacity-0" : ""}`}
                    />
                </div>
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-8 hidden h-[58vh] items-center pr-6 sm:flex"
                >
                    <ChevronRightIcon className="h-12 w-12 text-white/25" />
                </div>
            </div>

            {/* Bottom row: skip always visible; final CTA on last step */}
            <div className="relative z-20 flex items-center justify-between gap-4 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-10 sm:pb-8 sm:pt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-semibold tracking-wide text-gray-400 transition hover:text-white sm:text-sm"
                >
                    skip
                </button>
                {isLast && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ui-accent-button rounded-xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition sm:px-7 sm:py-3 sm:text-sm"
                    >
                        {finalCtaLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default OnboardingModal;
