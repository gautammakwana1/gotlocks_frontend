"use client";

import { useEffect, useState } from "react";

export type AnnouncementEditModalProps = {
    initialTitle: string;
    initialBody: string;
    busy: boolean;
    onSave: (text: string, title: string) => void;
    onClose: () => void;
};

const TITLE_MAX = 120; // STAFF_FEED_TITLE_MAX
// ANNOUNCEMENT_BODY_MAX. Enforced by the LEAGUE edit route only (400 "Announcement
// text must be 2000 characters or fewer."); the Arena twin skips the cap, so
// without a client cap a long edit fails on one surface and not the other.
const BODY_MAX = 2000;

// Lightweight edit dialog for a staff announcement. Body is required (matches the
// backend, which rejects empty text); title is optional/clearable.
export const AnnouncementEditModal = ({
    initialTitle,
    initialBody,
    busy,
    onSave,
    onClose,
}: AnnouncementEditModalProps) => {
    const [title, setTitle] = useState(initialTitle);
    const [body, setBody] = useState(initialBody);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [busy, onClose]);

    const canSave = Boolean(body.trim()) && !busy;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit announcement"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => {
                if (!busy) onClose();
            }}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
                    Edit announcement
                </h2>

                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                    Title <span className="normal-case text-gray-600">(optional)</span>
                    <input
                        value={title}
                        maxLength={TITLE_MAX}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Optional heading"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                    />
                </label>

                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.11em] text-gray-400">
                    Announcement
                    <textarea
                        rows={5}
                        maxLength={BODY_MAX}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Update the announcement"
                        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                    />
                </label>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={() => onSave(body.trim(), title.trim())}
                        className="rounded-lg bg-sky-500/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-sky-100 transition hover:bg-sky-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementEditModal;
