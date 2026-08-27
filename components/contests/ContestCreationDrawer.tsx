"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
    type RefObject,
} from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";

/* ----------------------------------------------------------------------------
 * The "Start a contest" workspace, ported from the MVP
 * (gotlocks.app_mvp2/components/contests/ContestCreationDrawer.tsx).
 *
 * The MVP drawer owns its create surface end to end: it `next/dynamic`-imports
 * the create page's exported content component and mounts it with
 * `surface="drawer"`. This frontend has no such export — the real create UI is
 * the 125KB `FeedContestCreateForm` mounted by three ROUTES
 * (/league/:id/contests/create, /league/:id/feed-contests/create and
 * /arena/:id/feed-contests/create), each of which does its own group fetch,
 * permission gate and redirect. So this port keeps the MVP's chrome and its
 * Step-1 chooser markup, but inverts the ownership:
 *
 *   - `kind: "choice"`  — the MVP's Step 1, except each choice carries an `href`
 *     (navigate to the real create route) or an `onSelect` (handle it in place).
 *     The drawer never creates anything and never fetches anything itself.
 *   - `kind: "builder"` — a caller-owned slot, so a host that later threads a
 *     `surface="drawer"` prop into a create form can render it here without this
 *     file changing. Until then hosts use `href` and the routes stay canonical,
 *     which is what keeps deep links, refresh-after-error and the Arena
 *     create-gate redirect working.
 *
 * Permission vocabulary is deliberately IDENTICAL to ContestHubCreateAction's
 * (`allowed` / `unavailableReason` / `unavailableHint`) — the same
 * `canCreateContestInGroup(...)` result and the same Arena hosting copy feed
 * either component, so a host can swap the link card for this drawer without
 * touching its permission logic.
 * -------------------------------------------------------------------------- */

export type ContestCreationDrawerAccent = "league" | "arena";

/**
 * Mirrors the shape the hubs already compute:
 * `canCreateContestInGroup(group, count)` returns `{ allowed: true }` or
 * `{ allowed: false; error }`, and ArenaContestsPanel derives the same pair as
 * `createDisabledReason` / `createDisabledHint`.
 */
export type ContestCreationAvailability = {
    allowed: boolean;
    /** Limit/permission copy shown in place of the call to action. */
    unavailableReason?: string;
    unavailableHint?: string;
    /**
     * Turns an unavailable choice into a plan-upgrade link instead of a dead
     * card. Only consulted when `allowed` is false.
     */
    upgradeAction?: {
        href: string;
        title: string;
        description: string;
    };
};

export type ContestCreationChoice = ContestCreationAvailability & {
    /** Stable React key, and the value handed back to `onSelect`. */
    id: string;
    title: string;
    description: string;
    /** A real create route. Renders the choice as a <Link>. */
    href?: string;
    /**
     * Handled in place — e.g. swap the drawer to its `builder` content. Wins
     * over `href` when both are supplied, because staying inside the drawer is
     * the stronger intent.
     */
    onSelect?: (choiceId: string) => void;
    /** Overrides the default "Choose format →" call to action. */
    actionLabel?: string;
};

export type ContestCreationChoiceContent = {
    kind: "choice";
    /** Community name, interpolated into the lead paragraph. */
    contextName: string;
    choices: ContestCreationChoice[];
    /** Copy overrides; the defaults are the MVP's. */
    stepLabel?: string;
    heading?: string;
    description?: ReactNode;
};

export type ContestCreationBuilderContent = {
    kind: "builder";
    /**
     * Names the focus region — the MVP uses "Fantasy Contest builder",
     * "Arena Contest builder" and "Feed Contest builder".
     */
    label: string;
    /** The caller-owned builder. This component renders it and nothing else. */
    children: ReactNode;
    /**
     * Steps back to the chooser. Rendered by the DRAWER HEADER's chevron, not by
     * the body — omit it for a builder that opens straight in (the Arena, which
     * has a single contest type and therefore no chooser to return to), and the
     * chevron closes instead.
     */
    onBack?: () => void;
};

export type ContestCreationDrawerContent =
    | ContestCreationChoiceContent
    | ContestCreationBuilderContent;

export type ContestCreationDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    /** Drives the theme class and the accent tint. League is the default. */
    accent?: ContestCreationDrawerAccent;
    /** Overrides the drawer's header title. */
    title?: ReactNode;
    content: ContestCreationDrawerContent;
};

// Split from the tinted half so the accent can vary without restating the box.
const CHOICE_BASE_CLASS_NAME =
    "group flex min-h-36 w-full flex-col justify-between rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.025] disabled:opacity-55";

/**
 * The MVP only ever shows this chooser on a League, so it hardcodes blue. The
 * Arena column is this port's own: `.arena-theme` in globals.css retones sky-*
 * and a handful of blue-* utilities, but NOT the `blue-300/15` /
 * `blue-400/[0.055]` pairs below — an Arena-side chooser would otherwise render
 * League blue inside a violet drawer.
 */
const accentStyles: Record<
    ContestCreationDrawerAccent,
    { theme: string; eyebrow: string; choice: string; action: string }
> = {
    league: {
        theme: "league-theme",
        eyebrow: "text-blue-300",
        choice:
            "border-blue-300/15 bg-blue-400/[0.055] hover:border-blue-300/35 hover:bg-blue-400/[0.09] focus-visible:outline-blue-300",
        action: "text-blue-200",
    },
    arena: {
        theme: "arena-theme",
        eyebrow: "text-violet-300",
        choice:
            "border-violet-300/15 bg-violet-400/[0.055] hover:border-violet-300/35 hover:bg-violet-400/[0.09] focus-visible:outline-violet-300",
        action: "text-violet-200",
    },
};

const ChoiceBody = ({
    choice,
    accent,
}: {
    choice: ContestCreationChoice;
    accent: ContestCreationDrawerAccent;
}) => {
    const styles = accentStyles[accent];

    return (
        <>
            <span>
                <span className="block text-sm font-bold text-white">{choice.title}</span>
                <span className="mt-2 block text-xs leading-5 text-gray-400">
                    {choice.description}
                </span>
            </span>
            <span
                className={`mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] ${choice.allowed
                    ? styles.action
                    : choice.upgradeAction
                        ? "text-amber-200"
                        : "text-gray-500"
                    }`}
            >
                {choice.allowed ? (
                    choice.actionLabel ?? (
                        <>
                            Choose format <AnimatedArrow direction="right" />
                        </>
                    )
                ) : choice.upgradeAction ? (
                    <>
                        <span className="block">{choice.upgradeAction.title}</span>
                        <span className="mt-1 block normal-case tracking-normal text-amber-100/65">
                            {choice.upgradeAction.description}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="block">{choice.unavailableReason}</span>
                        {choice.unavailableHint ? (
                            <span className="mt-1 block normal-case tracking-normal text-gray-500">
                                {choice.unavailableHint}
                            </span>
                        ) : null}
                    </>
                )}
            </span>
        </>
    );
};

const ContestTypeChoiceStep = ({
    content,
    accent,
}: {
    content: ContestCreationChoiceContent;
    accent: ContestCreationDrawerAccent;
}) => {
    const headingId = useId();
    const styles = accentStyles[accent];
    const choiceClassName = `${CHOICE_BASE_CLASS_NAME} ${styles.choice}`;

    const renderChoice = (choice: ContestCreationChoice) => {
        const body = <ChoiceBody choice={choice} accent={accent} />;

        if (choice.allowed && choice.onSelect) {
            return (
                <button
                    key={choice.id}
                    type="button"
                    onClick={() => choice.onSelect?.(choice.id)}
                    aria-label={`Choose ${choice.title}`}
                    className={choiceClassName}
                >
                    {body}
                </button>
            );
        }

        if (choice.allowed && choice.href) {
            return (
                <Link
                    key={choice.id}
                    href={choice.href}
                    aria-label={`Choose ${choice.title}`}
                    className={choiceClassName}
                >
                    {body}
                </Link>
            );
        }

        if (!choice.allowed && choice.upgradeAction) {
            return (
                <Link
                    key={choice.id}
                    href={choice.upgradeAction.href}
                    aria-label={choice.upgradeAction.title}
                    className={choiceClassName}
                >
                    {body}
                </Link>
            );
        }

        // Also the fallback for an `allowed` choice with no target at all — a
        // host wiring bug, which should look broken rather than silently do
        // nothing on tap.
        return (
            <button
                key={choice.id}
                type="button"
                disabled
                aria-label={`${choice.title} unavailable`}
                className={choiceClassName}
            >
                {body}
            </button>
        );
    };

    return (
        <section aria-labelledby={headingId} className="p-5 sm:p-6">
            <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.eyebrow}`}
            >
                {content.stepLabel ?? "Step 1"}
            </p>
            <h2 id={headingId} className="mt-2 text-xl font-bold text-white">
                {content.heading ?? "Choose a contest type"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
                {content.description ?? (
                    <>
                        Start the format that fits {content.contextName}. Each format keeps
                        its own scoring and lifetime standings.
                    </>
                )}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {content.choices.map(renderChoice)}
            </div>
        </section>
    );
};

export const ContestCreationDrawer = ({
    open,
    onClose,
    returnFocusRef,
    accent = "league",
    title = "Start a contest",
    content,
}: ContestCreationDrawerProps) => {
    const builderFocusRef = useRef<HTMLDivElement>(null);
    // The MVP keys its focus move off `content.kind`, which changes for both
    // choice -> builder AND fantasy -> feed because it has one kind per builder.
    // This port has a single `builder` kind, so the label stands in for the
    // second half of that distinction.
    const stepKey =
        content.kind === "builder" ? `builder:${content.label}` : "choice";
    const previousStepKeyRef = useRef(stepKey);

    useEffect(() => {
        const previousStepKey = previousStepKeyRef.current;
        previousStepKeyRef.current = stepKey;
        // Only a step CHANGE inside an already-open drawer moves focus; opening
        // straight into a builder (the Arena path) leaves the drawer's own Back
        // button focused, exactly as the MVP does.
        if (!open || !stepKey.startsWith("builder") || previousStepKey === stepKey) {
            return;
        }

        const focusFrame = window.requestAnimationFrame(() => {
            builderFocusRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(focusFrame);
    }, [open, stepKey]);

    const styles = accentStyles[accent];

    return (
        <LeftWorkspaceDrawer
            open={open}
            onClose={onClose}
            /*
             * On the chooser the header chevron closes; on a builder it steps
             * back to the chooser. Exactly the MVP's `onBack={onBackToChoice}`
             * (ContestCreationDrawer.tsx:272) — and it is what lets the body row
             * below go away, so there is one back affordance rather than two
             * stacked ones doing different things.
             */
            onBack={content.kind === "builder" ? content.onBack : undefined}
            title={title}
            returnFocusRef={returnFocusRef}
            backdropLabel="Dismiss contest creation workspace"
            className={styles.theme}
        >
            {content.kind === "choice" ? (
                <ContestTypeChoiceStep content={content} accent={accent} />
            ) : (
                <div
                    ref={builderFocusRef}
                    role="region"
                    aria-label={content.label}
                    tabIndex={-1}
                    className="outline-none"
                >
                    {content.children}
                </div>
            )}
        </LeftWorkspaceDrawer>
    );
};

export default ContestCreationDrawer;
