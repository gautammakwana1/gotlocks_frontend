"use client";

import { useEffect, useState } from "react";

export type AnnouncementEditModalProps = {
    initialTitle: string;
    initialBody: string;
    busy: boolean;
    /**
     * Arena announcements get the violet accent the rest of the announcement flow
     * uses. Optional and default-false so the League look is unchanged for callers
     * that do not pass it; this modal is rendered outside any `.arena-theme`
     * ancestor, so it cannot infer the surface on its own.
     */
    isArena?: boolean;
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
//
// No MVP counterpart: the MVP's record action menu offers Pin/Unpin and Delete
// only, and its types carry no onEdit. Kept because the edit route is live REST
// wiring on both surfaces; only its accent was brought in line with the ported
// announcement panel.
export const AnnouncementEditModal = ({
    initialTitle,
    initialBody,
    busy,
    isArena = false,
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
    const fieldAccentClass = isArena
        ? "caret-violet-300 focus:border-violet-300/60"
        : "focus:border-sky-300/60";

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
                className={`w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-xl ${isArena ? "arena-theme" : ""
                    }`}
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
                        className={`mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition ${fieldAccentClass}`}
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
                        className={`mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition ${fieldAccentClass}`}
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
                        className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-40 ${isArena
                            ? "bg-violet-500/25 text-violet-100 hover:bg-violet-500/35"
                            : "bg-sky-500/25 text-sky-100 hover:bg-sky-500/35"
                            }`}
                    >
                        {busy ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementEditModal;
