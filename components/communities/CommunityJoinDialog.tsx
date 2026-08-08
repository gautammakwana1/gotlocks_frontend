"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

export type CommunityJoinScope = "league" | "arena";

/**
 * Invite codes are generated server-side as 5 digits (see the create_group RPC's
 * `groups_invite_code_key` retry loop), so the field is numeric and fixed-length
 * rather than the free-text box the MVP mock used.
 */
const INVITE_CODE_LENGTH = 5;

type CommunityJoinDialogProps = {
    open: boolean;
    scope: CommunityJoinScope;
    /** True while the join request is in flight — from the slice, not local state. */
    loading: boolean;
    /** Server-supplied failure text. Cleared by the parent when the dialog reopens. */
    error: string | null;
    /**
     * The server confirmed the code belongs to the OTHER community type
     * (409 + data.group_type). Definite: retrying here can never succeed.
     */
    crossType: boolean;
    /**
     * The server returned 404 — no community of THIS type has that code.
     *
     * Ambiguous on purpose. The join endpoints currently answer a valid
     * other-type code with the same 404 as a typo (both discard the RPC's
     * group_type), so a 404 alone cannot distinguish "wrong code" from "right
     * code, wrong tab". The prompt therefore hedges and offers both readings
     * rather than telling the user their working invite code is invalid.
     */
    notFound: boolean;
    onClose: () => void;
    onSubmit: (inviteCode: string) => void;
};

const getFocusableElements = (container: HTMLElement | null) =>
    container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => !element.hasAttribute("hidden"))
        : [];

export const CommunityJoinDialog = ({
    open,
    scope,
    loading,
    error,
    crossType,
    notFound,
    onClose,
    onSubmit,
}: CommunityJoinDialogProps) => {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const onCloseRef = useRef(onClose);
    const [inviteCode, setInviteCode] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const singularLabel = scope === "league" ? "League" : "Arena";
    const otherLabel = scope === "league" ? "Arena" : "League";
    const isArena = scope === "arena";
    const crossTypeHref =
        scope === "league" ? "/arena?view=participating&intent=join" : "/fantasy?view=participating&intent=join";

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;

        setInviteCode("");
        setLocalError(null);

        const previouslyFocused =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus());

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== "Tab") return;

            const focusableElements = getFocusableElements(dialogRef.current);
            if (focusableElements.length === 0) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                if (
                    activeElement === firstElement ||
                    !dialogRef.current?.contains(activeElement)
                ) {
                    event.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (
                activeElement === lastElement ||
                !dialogRef.current?.contains(activeElement)
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
    }, [open]);

    if (!open || typeof document === "undefined") return null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;

        const normalizedCode = inviteCode.trim();
        if (normalizedCode.length !== INVITE_CODE_LENGTH) {
            setLocalError(`Enter the ${INVITE_CODE_LENGTH}-digit ${singularLabel} invite code.`);
            return;
        }

        setLocalError(null);
        onSubmit(normalizedCode);
    };

    // A cross-type or not-found answer gets the amber panel below instead; showing
    // the raw server text too would contradict it ("Invalid Invite code!" directly
    // above "it might be an Arena code").
    const showTabHint = crossType || notFound;
    const visibleError = localError ?? (showTabHint ? null : error);

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4 sm:py-6"
            onPointerDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className={`w-full rounded-t-[28px] border border-white/10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-sm sm:rounded-[28px] sm:p-6 ${isArena ? "bg-[#0d0817]" : "bg-[#070b13]"
                    }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p
                            className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isArena ? "text-violet-300" : "text-sky-300"
                                }`}
                        >
                            {singularLabel} invite
                        </p>
                        <h2 id={titleId} className="mt-1 text-xl font-bold text-white">
                            Join {scope === "league" ? "a League" : "an Arena"}
                        </h2>
                        <p id={descriptionId} className="mt-2 text-sm leading-6 text-gray-400">
                            Enter the invite code shared by this {singularLabel.toLowerCase()}.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={`Close Join ${singularLabel} dialog`}
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 motion-reduce:transition-none ${isArena
                            ? "focus-visible:outline-violet-300"
                            : "focus-visible:outline-sky-300"
                            }`}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            aria-hidden
                        >
                            <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div>
                        <label htmlFor={`${titleId}-code`} className="sr-only">
                            {singularLabel} invite code
                        </label>
                        <input
                            ref={inputRef}
                            id={`${titleId}-code`}
                            value={inviteCode}
                            onChange={(event) => {
                                setInviteCode(
                                    event.target.value.replace(/\D/g, "").slice(0, INVITE_CODE_LENGTH)
                                );
                                setLocalError(null);
                            }}
                            maxLength={INVITE_CODE_LENGTH}
                            inputMode="numeric"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Invite code"
                            className={`min-h-12 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-base font-semibold tracking-[0.3em] text-white outline-none transition placeholder:tracking-normal placeholder:text-gray-600 focus:ring-2 motion-reduce:transition-none ${isArena
                                ? "focus:border-violet-300/70 focus:ring-violet-300/15"
                                : "focus:border-sky-300/70 focus:ring-sky-300/15"
                                }`}
                        />
                    </div>

                    {visibleError ? (
                        <p role="alert" className="text-sm font-medium leading-5 text-red-200">
                            {visibleError}
                        </p>
                    ) : null}

                    {showTabHint ? (
                        <div
                            role="alert"
                            className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-sm leading-5 text-amber-100"
                        >
                            <p>
                                {crossType
                                    ? `That code belongs to ${scope === "league" ? "an" : "a"} ${otherLabel}.`
                                    : `No ${singularLabel} matches that code. Double-check it — or if it is ${scope === "league" ? "an" : "a"} ${otherLabel} invite, join it from the ${otherLabel} tab.`}
                            </p>
                            <Link
                                href={crossTypeHref}
                                onClick={onClose}
                                className="mt-2 inline-flex min-h-11 items-center font-semibold text-white underline decoration-amber-200/50 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
                            >
                                Go to Join {otherLabel}
                            </Link>
                        </div>
                    ) : null}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`min-h-11 flex-1 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 motion-reduce:transition-none ${isArena
                                ? "focus-visible:outline-violet-300"
                                : "focus-visible:outline-sky-300"
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || inviteCode.length !== INVITE_CODE_LENGTH}
                            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-slate-950 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${isArena
                                ? "bg-violet-300 hover:bg-violet-200 focus-visible:outline-violet-300"
                                : "bg-sky-300 hover:bg-sky-200 focus-visible:outline-sky-300"
                                }`}
                        >
                            {loading ? (
                                <span
                                    aria-hidden
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-900"
                                />
                            ) : null}
                            <span>{loading ? "Joining…" : `Join ${singularLabel}`}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CommunityJoinDialog;
