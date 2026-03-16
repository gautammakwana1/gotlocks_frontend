"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import FootballAnimation from "@/components/animations/FootballAnimation";
import Link from "next/link";

const FeedbackPage = () => {
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
        <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Feedback
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Caught something we missed or want added? Let us know.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                    <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Feature requests, bugs, or product ideas..."
                        rows={6}
                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20"
                    />
                </label>

                <div className="flex flex-wrap gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={message.trim().length === 0}
                        className="rounded-full border border-white/10 bg-[var(--app-text)] px-4 py-2 text-sm font-medium text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send feedback
                    </button>
                    <Link
                        href="/home"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                    >
                        Back
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default FeedbackPage;
