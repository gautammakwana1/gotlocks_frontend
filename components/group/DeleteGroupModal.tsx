import { useEffect, useRef } from "react";

type DeleteGroupModalProps = {
    open: boolean;
    groupName: string;
    confirmationPhrase: string;
    confirmationValue: string;
    acknowledged: boolean;
    hasPermission: boolean;
    isDeleting: boolean;
    errorMessage: string | null;
    onConfirmationChange: (value: string) => void;
    onAcknowledgedChange: (value: boolean) => void;
    onClose: () => void;
    onDelete: () => void;
};

const focusableSelectors =
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const DeleteGroupModal = ({
    open,
    groupName,
    confirmationPhrase,
    confirmationValue,
    acknowledged,
    hasPermission,
    isDeleting,
    errorMessage,
    onConfirmationChange,
    onAcknowledgedChange,
    onClose,
    onDelete,
}: DeleteGroupModalProps) => {
    const modalRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        const escapeListener = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", escapeListener);
        return () => {
            document.removeEventListener("keydown", escapeListener);
            window.clearTimeout(timer);
            previouslyFocused?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    const titleId = "delete-group-title";
    const descriptionId = "delete-group-description";
    const errorId = "delete-group-error";

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab" || !modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
            if (document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            return;
        }
        if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const ctaDisabled =
        !hasPermission ||
        isDeleting ||
        !acknowledged ||
        confirmationValue !== confirmationPhrase;

    const permissionMessage = hasPermission
        ? "This action cannot be undone."
        : "This action is disabled because you do not have permission.";

    const displayedError = !hasPermission
        ? "Only the commissioner can delete this group."
        : errorMessage;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="presentation"
            onMouseDown={handleOverlayClick}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={`${descriptionId} ${errorId}`.trim()}
                ref={modalRef}
                onKeyDown={handleKeyDown}
                className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 p-6 shadow-2xl backdrop-blur"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-red-300">Danger zone</p>
                        <h2 id={titleId} className="text-xl font-semibold text-white">
                            Delete this group?
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
                    >
                        Close
                    </button>
                </div>

                <p id={descriptionId} className="mt-4 text-sm text-gray-300">
                    Deleting <span className="font-semibold text-white">{groupName}</span> removes the
                    group, every member’s current membership, live leaderboards, active picks, chat
                    history, and archived leaderboards.
                </p>

                <div className="mt-4 space-y-3">
                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                        <span className="text-xs tracking-wide text-gray-400">
                            Type <span className="font-semibold text-white">&quot;{confirmationPhrase}&quot;</span> to confirm
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={confirmationValue}
                            onChange={(event) => onConfirmationChange(event.target.value)}
                            autoComplete="off"
                            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/70"
                        />
                    </label>

                    <label className="flex items-center gap-3 text-sm text-gray-200">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(event) => onAcknowledgedChange(event.target.checked)}
                            className="h-4 w-4 rounded border border-white/20 bg-black text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                        />
                        I understand this action is permanent.
                    </label>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-400">
                    {permissionMessage}
                </div>

                <div
                    id={errorId}
                    role="status"
                    aria-live="polite"
                    className={`mt-3 min-h-[1.25rem] text-sm ${displayedError ? "text-red-300" : "text-transparent"}`}
                >
                    {displayedError ?? ""}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={ctaDisabled}
                        aria-busy={isDeleting}
                        className="rounded-2xl bg-red-600/80 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Delete group permanently
                    </button>
                </div>
            </div>
        </div>
    );
};