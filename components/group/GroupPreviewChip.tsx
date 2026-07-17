"use client";

import type { MouseEvent, ReactNode } from "react";
import {
    getGroupTypeLabel,
    normalizeHostingTier,
    normalizeUserPlan,
} from "@/lib/groups/limits";
import { Group, UserPlan } from "@/lib/interfaces/interfaces";

type GroupPreviewChipProps = {
    group: Group | null;
    ownerPlan?: UserPlan;
    className?: string;
};

type GroupTypeMetaLabelProps = GroupPreviewChipProps & {
    textClassName?: string;
    showTitle?: boolean;
};

type GroupPreviewCornerMetaProps = GroupPreviewChipProps & {
    roleLabel: "owner" | "member";
    onCopied?: () => void;
    onCopyError?: () => void;
};

type GroupInviteCodeCopyProps = {
    inviteCode: string;
    children?: ReactNode;
    className?: string;
    onCopied?: () => void;
    onCopyError?: () => void;
};

export const groupPreviewMetaTextClassName =
    "font-sans text-[10px] font-semibold uppercase tracking-[0.12em]";

export const groupPreviewKickerTextClassName =
    "font-sans text-[9px] font-semibold uppercase tracking-[0.14em]";

const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    if (typeof document === "undefined") return;

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
};

const CopyIcon = ({ className = "" }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

export const GroupInviteCodeCopy = ({
    inviteCode,
    children,
    className = "",
    onCopied,
    onCopyError,
}: GroupInviteCodeCopyProps) => {
    const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        void copyTextToClipboard(inviteCode)
            .then(() => onCopied?.())
            .catch(() => onCopyError?.());
    };

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap text-gray-300 ${groupPreviewMetaTextClassName} ${className}`}
        >
            {children ?? <span>{inviteCode}</span>}
            <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300/70"
                aria-label={`Copy invite code ${inviteCode}`}
            >
                <CopyIcon className="h-3.5 w-3.5" />
            </button>
        </span>
    );
};

export const GroupPreviewChip = ({
    group,
    ownerPlan,
    className = "",
}: GroupPreviewChipProps) => {
    const isProOwner = ownerPlan
        ? normalizeUserPlan(ownerPlan) === "pro"
        : normalizeHostingTier(group?.hosting_tier) === "pro";

    return (
        <span
            className={`inline-flex max-w-full items-center whitespace-nowrap text-gray-300 ${groupPreviewMetaTextClassName} ${className}`}
            aria-label={`${getGroupTypeLabel(group?.group_type ?? "league")} code ${group?.invite_code}, ${isProOwner ? "Pro owner" : "Free owner"
                }`}
            title={isProOwner ? "Pro owner group" : "Free owner group"}
        >
            {group?.invite_code}
        </span>
    );
};

export const GroupPreviewCornerMeta = ({
    group,
    ownerPlan,
    roleLabel,
    onCopied,
    onCopyError,
    className = "",
}: GroupPreviewCornerMetaProps) => (
    <GroupInviteCodeCopy
        inviteCode={group?.invite_code ?? ""}
        onCopied={onCopied}
        onCopyError={onCopyError}
        className={`text-right ${className}`}
    >
        <span>{roleLabel.toUpperCase()}</span>
        <span aria-hidden>·</span>
        <GroupPreviewChip group={group} ownerPlan={ownerPlan} />
    </GroupInviteCodeCopy>
);

export const GroupTypeMetaLabel = ({
    group,
    ownerPlan,
    className = "",
    textClassName = groupPreviewMetaTextClassName,
    showTitle = true,
}: GroupTypeMetaLabelProps) => {
    const isProOwner = ownerPlan
        ? normalizeUserPlan(ownerPlan) === "pro"
        : normalizeHostingTier(group?.hosting_tier) === "pro";
    const colorClassName = isProOwner ? "text-amber-200" : "text-sky-200";

    return (
        <span
            className={`${textClassName} ${colorClassName} ${className}`}
            title={showTitle ? (isProOwner ? "Pro owner group" : "Free owner group") : undefined}
        >
            {getGroupTypeLabel(group?.group_type ?? "league").toUpperCase()}
        </span>
    );
};
