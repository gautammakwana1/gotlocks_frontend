"use client";

import { useCallback, useState } from "react";
import { CheckIcon, CopyIcon } from "../ui/SvgIcons";
import { useToast } from "@/lib/state/ToastContext";

type Props = {
    code?: string | null;
    className?: string;
};

export const InviteCodeCopy = ({ code, className }: Props) => {
    const { setToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!code) return;
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

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy invite code"
            className={`group flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3 pr-2.5 text-xs transition hover:border-white/20 hover:bg-white/[0.07] ${className ?? ""}`}
        >
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                invite
            </span>
            <span className="font-semibold tracking-wide text-gray-200">{code}</span>
            <span className="flex h-4 w-4 items-center justify-center text-gray-400 transition group-hover:text-sky-200">
                {copied ? <CheckIcon className="h-3 w-3 text-sky-300" /> : <CopyIcon />}
            </span>
        </button>
    );
};

export default InviteCodeCopy;
