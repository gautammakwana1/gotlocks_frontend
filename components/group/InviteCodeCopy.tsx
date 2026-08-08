"use client";

import { MouseEvent, useCallback, useState } from "react";
import { CheckIcon, CopyIcon } from "../ui/SvgIcons";
import { useToast } from "@/lib/state/ToastContext";
import { groupPreviewMetaTextClassName } from "./GroupPreviewChip";

type Props = {
    code?: string | null;
    className?: string;
    /** Tints the focus ring + hover icon so arena cards don't read sky-blue. */
    accent?: "league" | "arena";
    /** Forwarded to the button — pass -1 inside aria-hidden carousel clones. */
    tabIndex?: number;
};

export const InviteCodeCopy = ({ code, className, accent = "league", tabIndex }: Props) => {
    const { setToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
        if (!code) return;
        // stopPropagation is load-bearing for the GroupsTab cards, which nest this
        // button inside a role="button" div that router.push()es to the group —
        // without it, copying also navigates. It is inert in the HomeTab cards,
        // where the stretched <Link> is a sibling and nothing bubbles through it.
        // Don't delete it after only reading the HomeTab call sites.
        event.preventDefault();
        event.stopPropagation();
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                const ta = document.createElement("textarea");
                ta.value = code;
                ta.setAttribute("readonly", "");
                ta.style.position = "absolute";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
            setToast({ id: Date.now(), type: "success", message: "Invite code copied.", duration: 2500 });
        } catch {
            setToast({ id: Date.now(), type: "error", message: "Unable to copy invite code.", duration: 2500 });
        }
    }, [code, setToast]);

    if (!code) return null;

    const isArena = accent === "arena";

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy invite code"
            tabIndex={tabIndex}
            // pointer-events-auto + relative z-20: these cards use a stretched
            // <Link className="absolute inset-0"> for navigation and mark their
            // content pointer-events-none so clicks fall through to it. Without
            // this the copy button is inert and never hovers. Harmless anywhere
            // else — both are no-ops outside that pattern.
            className={`group pointer-events-auto relative z-20 flex shrink-0 items-center gap-2 rounded-full border border-transparent py-1 pl-3 pr-2.5 text-xs transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 ${isArena ? "focus-visible:outline-violet-300/80" : "focus-visible:outline-sky-300/70"} ${groupPreviewMetaTextClassName} ${className ?? ""}`}
        >
            <span className="font-semibold tracking-wide text-gray-200">{code}</span>
            <span className={`flex h-4 w-4 items-center justify-center text-gray-400 transition ${isArena ? "group-hover:text-violet-200" : "group-hover:text-sky-200"}`}>
                {copied ? (
                    <CheckIcon className={`h-3 w-3 ${isArena ? "text-violet-300" : "text-sky-300"}`} />
                ) : (
                    <CopyIcon className="h-3.5 w-3.5" />
                )}
            </span>
        </button>
    );
};

export default InviteCodeCopy;
