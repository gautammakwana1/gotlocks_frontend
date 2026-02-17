"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/state/ToastContext";
import { greenGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import FootballAnimation from "@/components/animations/FootballAnimation";

const FeedbackPage = () => {
    const router = useRouter();
    const currentUser = useCurrentUser();
    const [message, setMessage] = useState("");
    const { setToast } = useToast();

    if (!currentUser) return null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setToast({
            id: Date.now(),
            type: "info",
            message: "Feedback API stub coming soon. We saved this locally.",
            duration: 3000
        });
        setMessage("");
    };

    if (!currentUser) {
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-48 max-w-[70vw] sm:w-60">
                <FootballAnimation />
            </div>
        </div>
    }

    return (
        <div className="flex flex-col gap-6 text-white">
            <div className={`${greenGradientBox} p-6`}>
                <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-emerald-100/80">feedback</span>
                    <h1 className="text-2xl font-extrabold text-white">Tell Lockie what to build next</h1>
                    <p className="text-sm text-gray-200">
                        Drop a quick note. We&apos;ll wire this into the feedback API shortly and start
                        closing the loop with real updates.
                    </p>
                    {currentUser && (
                        <span className="text-xs uppercase tracking-wide text-gray-400">
                            Signed in as {currentUser.username}
                        </span>
                    )}
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-white/5"
            >
                <label className="text-xs uppercase tracking-wide text-gray-400">
                    feedback message
                </label>
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Feature requests, bugs, or product vibes…"
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none transition focus:border-emerald-400/70"
                />
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={message.trim().length === 0}
                        className="rounded-2xl bg-emerald-500/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        send to lockie (stub)
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/home")}
                        className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/30 hover:bg-white/10"
                    >
                        back to home
                    </button>
                    <span className="text-xs text-gray-400">
                        We&apos;ll store this locally until the feedback API is live.
                    </span>
                </div>
            </form>
        </div>
    );
};

export default FeedbackPage;
