"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
};

type Step = {
    media: string;           // path to image or video
    mediaAlt: string;
    label: string;
    title: string;
    body: string;
    imgFit?: "cover" | "contain";
    imgHeight?: number;      // fixed px height for image steps (default 360)
    playbackRate?: number;   // video speed multiplier, defaults to 1.5
};

const STEPS: Step[] = [
    {
        media: "/onboarding/home.jpg",
        mediaAlt: "gotlocks mascot",
        label: "welcome",
        title: "Welcome to gotlocks",
        body: "You're in. gotlocks is where you and your crew compete on picks, build a record, and settle the debate on who actually knows sports.",
        imgFit: "contain",
        imgHeight: 420,
    },
    {
        media: "/onboarding/groups.mp4",
        mediaAlt: "Groups walkthrough",
        label: "groups",
        title: "Groups are your leagues",
        body: "Groups are private spaces for your crew. Join one with an invite code or start your own. Each group has its own leaderboard, chat, and slips.",
        playbackRate: 1.5,
    },
    {
        media: "/onboarding/slips.mp4",
        mediaAlt: "Slip view",
        label: "slips",
        title: "What's a slip?",
        body: "A pick sheet your commissioner creates for the group. Members add their picks while it's open. Once games finish, the commissioner grades and finalizes it to push results to the leaderboard.",
        playbackRate: 1.5,
    },
    {
        media: "/onboarding/pick.mp4",
        mediaAlt: "Pick builder",
        label: "making a pick",
        title: "How to make a pick",
        body: "Open a slip and choose your games. Each pick has a confidence tier. Higher risk means more points if you're right.",
        playbackRate: 1.5,
    },
    {
        media: "/onboarding/leaderboard.jpeg",
        mediaAlt: "Group leaderboard standings",
        label: "points",
        title: "Points & leaderboards",
        body: "After games settle, your picks get graded automatically. Wins earn points and XP, moving you up the group leaderboard. Climb the standings and level up your profile.",
        imgHeight: 460,
    },
    {
        media: "/onboarding/social.jpeg",
        mediaAlt: "Global social feed",
        label: "social",
        title: "Go global",
        body: "Beyond your group, share picks on the global social feed. React to others' picks, build a following, and flex your record for everyone to see.",
        imgHeight: 460,
    },
];

const isVideo = (src: string) =>
    src.endsWith(".mp4") || src.endsWith(".mov") || src.endsWith(".webm");

/** For images: fixed-height container with Next.js fill Image */
function ImageMedia({ step }: { step: Step }) {
    return (
        <div className="flex-1 relative mx-5 mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
            <Image
                src={step.media}
                alt={step.mediaAlt}
                fill
                className="object-contain object-center"
                priority
                sizes="100vw"
            />
        </div>
    );
}

/** For videos: no fixed height — video sizes to its own natural aspect ratio */
function VideoMedia({ step }: { step: Step }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const rate = step.playbackRate ?? 1.5;
        const apply = () => { el.playbackRate = rate; };
        apply();
        el.addEventListener("loadedmetadata", apply);
        return () => el.removeEventListener("loadedmetadata", apply);
    }, [step.media, step.playbackRate]);

    return (
        <div className="flex-1 mx-5 mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
            <video
                ref={videoRef}
                // append timestamp so the browser always fetches the latest file
                src={`${step.media}?t=${BUILD_TS}`}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain max-h-full"
            />
        </div>
    );
}

// Bust browser cache on every build/reload so updated .mov files are picked up
const BUILD_TS = Date.now();

export const OnboardingModal = ({ open, onClose }: Props) => {
    const [step, setStep] = useState(0);
    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    // Prevent Background scroll
    useEffect(() => {
        if (!open) return;

        const scrollY = window.scrollY;

        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.overflow = "hidden";

        const preventTouch = (e: TouchEvent) => {
            e.preventDefault();
        };

        document.addEventListener("touchmove", preventTouch, {
            passive: false,
        });

        return () => {
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.left = "";
            document.body.style.right = "";
            document.body.style.overflow = "";

            document.removeEventListener("touchmove", preventTouch);

            window.scrollTo(0, scrollY);
        };
    }, [open]);

    // Reset to first step whenever the modal opens
    useEffect(() => {
        if (open) setStep(0);
    }, [open]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight" && !isLast) setStep((s) => s + 1);
            if (event.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose, isLast, step]);

    if (!open) return null;

    return (
        <div
            className="
                fixed inset-0 z-50
                flex items-center justify-center
                bg-black/80 backdrop-blur-sm
                px-4 py-6
                pt-[env(safe-area-inset-top)]
                pb-[env(safe-area-inset-bottom)]
            "
            role="dialog"
            aria-modal="true"
            aria-label="App walkthrough"
        >
            <div
                className="
                w-full max-w-xs
                h-[90dvh]
                flex flex-col
                rounded-3xl
                border border-white/10
                bg-black
                shadow-2xl
                overflow-hidden
            "
            >
                {/* Progress bar */}
                <div className="flex gap-1 px-5 pt-5 shrink-0">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setStep(i)}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step
                                ? "bg-sky-400"
                                : "bg-white/15 hover:bg-white/30"
                                }`}
                        />
                    ))}
                </div>

                {/* Media */}
                {isVideo(current.media) ? (
                    <VideoMedia step={current} />
                ) : (
                    <ImageMedia step={current} />
                )}

                {/* Text */}
                <div className="px-6 pt-4 shrink-0">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-sky-300">
                        {current.label}
                    </p>

                    <h2 className="mb-2 text-xl font-bold text-white">
                        {current.title}
                    </h2>

                    <p className="text-sm leading-relaxed text-gray-300">
                        {current.body}
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between px-6 pb-6 pt-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold tracking-wide text-gray-400 hover:text-white"
                    >
                        skip
                    </button>

                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => s - 1)}
                                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-gray-200 hover:border-white/30 hover:text-white"
                            >
                                back
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={
                                isLast
                                    ? onClose
                                    : () => setStep((s) => s + 1)
                            }
                            className="ui-accent-button rounded-xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
                        >
                            {isLast ? "let's go 🔒" : "next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
