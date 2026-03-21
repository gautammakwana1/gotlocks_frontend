"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { clearCreateFeedbackMessage, createFeedbackRequest } from "@/lib/redux/slices/feedbackSlice";
import { RootState } from "@/lib/interfaces/interfaces";

const FeedbackPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const [description, setDescription] = useState("");
    const { setToast } = useToast();

    const { loading, message, error } = useSelector((state: RootState) => state.feedback);

    useEffect(() => {
        if (!loading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000
            });
            dispatch(clearCreateFeedbackMessage());
        }
        if (!loading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            });
            dispatch(clearCreateFeedbackMessage());
        }
    }, [dispatch, loading, message, error])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (currentUser && description) {
            dispatch(createFeedbackRequest({ description: description.trim() }));
        }
        setDescription("");
    };

    if (!currentUser) return null;

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
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Feature requests, bugs, or product ideas..."
                        rows={6}
                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20"
                    />
                </label>

                <div className="flex flex-wrap gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={description.trim().length === 0}
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
