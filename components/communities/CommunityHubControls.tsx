"use client";

import Link from "next/link";
import { forwardRef } from "react";

export type CommunityHubTone = "league" | "arena";

export type CommunityHubView = "hosting" | "participating";

const ScoringIcon = () => (
    <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7h.01" />
    </svg>
);

const NewIcon = () => (
    <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden
    >
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const JoinIcon = () => (
    <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M5 12h14M13 5l6 7-6 7" />
    </svg>
);

const scoringToneClassNames: Record<CommunityHubTone, string> = {
    league:
        "border-sky-200/20 bg-sky-500/[0.08] text-sky-50 hover:border-sky-200/40 hover:bg-sky-500/15 focus-visible:outline-sky-200",
    arena:
        "border-violet-300/20 bg-violet-500/[0.08] text-violet-50 hover:border-violet-200/40 hover:bg-violet-500/15 focus-visible:outline-violet-300",
};

export const CommunityHubScoringButton = ({
    tone,
    onClick,
}: {
    tone: CommunityHubTone;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 motion-reduce:transition-none ${scoringToneClassNames[tone]}`}
    >
        <ScoringIcon />
        <span>Scoring</span>
    </button>
);

type CommunityHubWorkspaceActionProps = {
    tone: CommunityHubTone;
    kind: "new" | "join";
    label: string;
    disabled?: boolean;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

const workspaceActionToneClassNames: Record<
    CommunityHubTone,
    Record<"new" | "join", string>
> = {
    league: {
        new: "border-sky-200/25 bg-sky-500/[0.16] text-sky-200 shadow-sky-950/20 hover:border-sky-200/40 hover:bg-sky-500/[0.22] hover:text-sky-100 focus-visible:outline-sky-200",
        join: "border-sky-200/20 bg-sky-500/10 text-sky-50 shadow-sky-950/10 hover:border-sky-200/40 hover:bg-sky-500/20 focus-visible:outline-sky-200",
    },
    arena: {
        new: "border-violet-300/25 bg-violet-500/[0.16] text-violet-200 shadow-violet-950/20 hover:border-violet-200/40 hover:bg-violet-500/[0.22] hover:text-violet-100 focus-visible:outline-violet-300",
        join: "border-violet-300/25 bg-violet-500/10 text-violet-50 shadow-violet-950/15 hover:border-violet-200/45 hover:bg-violet-500/20 focus-visible:outline-violet-300",
    },
};

/**
 * Ref-forwarding so a modal opened from this button can hand focus BACK to it on
 * close. A ref on a wrapping <div> does not work: a plain div is not focusable,
 * `.focus()` on it is a no-op, and focus silently falls to <body> — which drops
 * the user to the top of the page and out of the keyboard flow.
 */
export const CommunityHubWorkspaceAction = forwardRef<
    HTMLButtonElement,
    CommunityHubWorkspaceActionProps
>((props, ref) => {
    const className = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${workspaceActionToneClassNames[props.tone][props.kind]}`;
    const content = (
        <>
            {props.kind === "new" ? <NewIcon /> : <JoinIcon />}
            <span>{props.label}</span>
        </>
    );

    if (props.href) {
        return (
            <Link href={props.href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type="button"
            onClick={props.onClick}
            disabled={props.disabled}
            className={className}
        >
            {content}
        </button>
    );
});

CommunityHubWorkspaceAction.displayName = "CommunityHubWorkspaceAction";

const tabToneClassNames: Record<
    CommunityHubTone,
    { selected: string; idle: string; badge: string; outline: string }
> = {
    league: {
        selected: "bg-sky-500/20 text-sky-50 shadow-sm",
        idle: "text-gray-400 hover:bg-white/[0.04] hover:text-white",
        badge: "bg-sky-200/15 text-sky-100",
        outline: "focus-visible:outline-sky-300",
    },
    arena: {
        selected: "bg-violet-500/20 text-violet-50 shadow-sm",
        idle: "text-gray-400 hover:bg-white/[0.04] hover:text-white",
        badge: "bg-violet-200/15 text-violet-100",
        outline: "focus-visible:outline-violet-300",
    },
};

/**
 * The Hosting / Participating switch.
 *
 * Rendered as links to `?view=…` rather than local state: the invite-code and
 * create-community flows deep-link straight into a specific tab
 * (`?view=participating&intent=join`), and the back button has to land on the
 * tab the user was actually looking at.
 *
 * Counts come from each endpoint's `pagination.total`, NOT from the rows loaded
 * so far — otherwise a hub with 30 hosted Leagues would read "10" until the user
 * paged to the bottom.
 */
export const CommunityHubTabs = ({
    tone,
    idPrefix,
    basePath,
    activeView,
    hostingCount,
    participatingCount,
    onSelect,
}: {
    tone: CommunityHubTone;
    idPrefix: string;
    basePath: string;
    activeView: CommunityHubView;
    hostingCount: number;
    participatingCount: number;
    onSelect: (view: CommunityHubView) => void;
}) => {
    const toneClassNames = tabToneClassNames[tone];

    return (
        <div
            role="tablist"
            aria-label={`${tone === "arena" ? "Arena" : "League"} workspaces`}
            className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1"
        >
            {(["hosting", "participating"] as const).map((view) => {
                const selected = activeView === view;
                const count = view === "hosting" ? hostingCount : participatingCount;
                const label = view === "hosting" ? "Hosting" : "Participating";
                return (
                    <Link
                        key={view}
                        id={`${idPrefix}-${view}-tab`}
                        href={`${basePath}?view=${view}`}
                        role="tab"
                        aria-label={`${label} (${count})`}
                        aria-selected={selected}
                        aria-controls={`${idPrefix}-${view}-panel`}
                        tabIndex={selected ? 0 : -1}
                        onKeyDown={(event) => {
                            if (
                                event.key !== "ArrowLeft" &&
                                event.key !== "ArrowRight" &&
                                event.key !== "Home" &&
                                event.key !== "End"
                            ) {
                                return;
                            }
                            event.preventDefault();
                            const nextView: CommunityHubView =
                                event.key === "ArrowLeft" || event.key === "Home"
                                    ? "hosting"
                                    : "participating";
                            document.getElementById(`${idPrefix}-${nextView}-tab`)?.focus();
                            onSelect(nextView);
                        }}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 motion-reduce:transition-none ${toneClassNames.outline} ${selected ? toneClassNames.selected : toneClassNames.idle}`}
                    >
                        <span>{label}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${selected ? toneClassNames.badge : "bg-white/10"}`}
                        >
                            {count}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
};
