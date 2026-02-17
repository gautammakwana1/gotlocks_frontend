import { useEffect, useRef } from "react";

type DeleteGroupModalProps = {
    open: boolean;
    confirmationValue: string;
    hasPermission: boolean;
    isDeleting: boolean;
    errorMessage: string | null;
    onConfirmationChange: (value: string) => void;
    onClose: () => void;
    onConfirm: () => void;
};

const focusableSelectors =
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const DeleteGroupConfirmationModal = ({
    open,
    confirmationValue,
    hasPermission,
    isDeleting,
    errorMessage,
    onConfirmationChange,
    onClose,
    onConfirm,
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
        !isDeleting ||
        !confirmationValue;

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
                            Confirm delete this group?
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

                <p className="mt-3 text-sm text-gray-300">
                    We emailed you a 4-digit confirmation code.
                    Enter it below to permanently delete this group.
                </p>

                <div className="mt-4 space-y-3">
                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                        <span className="text-xs uppercase tracking-wide text-gray-400">
                            Enter Confirmation Code.
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            onChange={(event) => onConfirmationChange(event.target.value)}
                            autoComplete="off"
                            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/70"
                        />
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

                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={ctaDisabled}
                        aria-busy={isDeleting}
                        className="rounded-2xl bg-red-600/80 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
}