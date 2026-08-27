import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { AnimatedArrow } from "@/components/ui/AnimatedArrow";

/* ============================================================================
 * THE SETTINGS CHROME — ported from the MVP's components/settings/SettingsUI.tsx.
 *
 * Every settings surface in the app (League settings tab, Arena settings tab,
 * and the account screens under /app-settings) is built out of these pieces so
 * they read as ONE screen family rather than a per-screen collection of cards.
 *
 * The shape is deliberate and worth stating once here rather than re-deriving
 * it at each call site:
 *
 *  - FULL-BLEED, RULED. Sections are separated by a hairline that runs edge to
 *    edge; they are NOT a stack of bordered cards. `SettingsPage` cancels the
 *    app shell's gutter with `-mx-5 sm:-mx-6` and every section re-insets its
 *    own body with `px-5 sm:px-6`, so the rules reach the container edge while
 *    the content stays on the page gutter.
 *
 *  - THE RULE BELONGS TO THE SECTION. `SettingsSection` / `SettingsDisclosure`
 *    each draw their own `border-b`, so a container must NOT also carry
 *    `divide-y` — that would double the hairline wherever a component brings
 *    its own.
 *
 *  - TOUCH TARGETS. Controls are `min-h-11` (44px) and `rounded-xl`, which is
 *    what the class constants below encode. Reach for the constants instead of
 *    re-typing the classes, so a change to the settings look is one edit.
 *
 * The class constants are exported as plain strings rather than components on
 * purpose: most call sites need to append one or two overrides (`bg-black/60`,
 * a red border) and template-appending a string is far less friction than a
 * `className` merge prop on a wrapper.
 * ========================================================================== */

export const cx = (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(" ");

const focusRingClassName =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]";

export type SettingsContentWidth = "narrow" | "default" | "wide" | "full";

const settingsContentWidthClassName: Record<SettingsContentWidth, string> = {
    narrow: "max-w-2xl",
    default: "max-w-4xl",
    wide: "max-w-5xl",
    full: "max-w-none",
};

/**
 * The measure. Everything that draws a full-bleed band — the header, a section,
 * a disclosure's summary and its body — funnels through this so the rule spans
 * the container while the text inside it stops at the same column.
 */
const SettingsInner = ({
    width,
    className,
    ...props
}: ComponentPropsWithoutRef<"div"> & { width: SettingsContentWidth }) => (
    <div
        className={cx("mx-auto w-full", settingsContentWidthClassName[width], className)}
        {...props}
    />
);

export const settingsInputClassName = cx(
    "min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--app-text)] outline-none transition",
    "placeholder:text-[var(--text-muted)] hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
);

export const settingsPrimaryButtonClassName = cx(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[var(--app-text)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition",
    "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
    focusRingClassName,
);

export const settingsSecondaryButtonClassName = cx(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--app-text)] transition",
    "hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40",
    focusRingClassName,
);

export const settingsDangerButtonClassName = cx(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition",
    "hover:border-red-300/55 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]",
);

export const settingsTextButtonClassName = cx(
    "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition",
    "hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
    focusRingClassName,
);

export const settingsFieldLabelClassName =
    "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]";

/**
 * The page shell. `-mx-5 sm:-mx-6` cancels the app shell's gutter so the rules
 * below bleed to the container edge; `w-auto` keeps the negative margin from
 * being fought by an inherited `w-full`.
 */
export const SettingsPage = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
    <div className={cx("-mx-5 w-auto pb-8 sm:-mx-6", className)} {...props} />
);

type SettingsHeaderProps = {
    title: string;
    description?: ReactNode;
    backHref?: string;
    backLabel?: string;
    titleAction?: ReactNode;
    children?: ReactNode;
    contentWidth?: SettingsContentWidth;
};

export const SettingsHeader = ({
    title,
    description,
    backHref,
    backLabel = "Account settings",
    titleAction,
    children,
    contentWidth = "full",
}: SettingsHeaderProps) => (
    <header className="border-b border-[var(--border-soft)]">
        <SettingsInner width={contentWidth} className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
            {backHref ? (
                <Link
                    href={backHref}
                    className={cx(
                        "-ml-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-white/5 hover:text-white",
                        focusRingClassName,
                    )}
                >
                    <AnimatedArrow direction="left" />
                    {backLabel}
                </Link>
            ) : null}
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">
                        {title}
                    </h1>
                    {titleAction ? <div className="shrink-0">{titleAction}</div> : null}
                </div>
                {description ? (
                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                        {description}
                    </p>
                ) : null}
            </div>
            {children ? <div className="flex flex-wrap gap-2 pt-1">{children}</div> : null}
        </SettingsInner>
    </header>
);

type SettingsSectionProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
    title?: ReactNode;
    description?: ReactNode;
    tone?: "default" | "danger";
    /**
     * `split` puts the title/description in a left rail beside the body from
     * `md` up — the two-column settings layout. `stacked` (the default) keeps
     * the heading above its own controls.
     */
    layout?: "stacked" | "split";
    bodyClassName?: string;
    contentWidth?: SettingsContentWidth;
    headingRef?: Ref<HTMLHeadingElement>;
    headingTabIndex?: number;
};

export const SettingsSection = ({
    title,
    description,
    tone = "default",
    layout = "stacked",
    bodyClassName,
    contentWidth = "full",
    headingRef,
    headingTabIndex,
    className,
    children,
    ...props
}: SettingsSectionProps) => (
    <section className={cx("border-b border-[var(--border-soft)]", className)} {...props}>
        <SettingsInner
            width={contentWidth}
            className={cx(
                "px-5 py-7 sm:px-6",
                layout === "split" &&
                Boolean(title || description) &&
                "md:grid md:grid-cols-[minmax(12rem,0.32fr)_minmax(0,0.68fr)] md:gap-8 lg:grid-cols-[minmax(14rem,0.34fr)_minmax(0,0.66fr)] lg:gap-12 xl:grid-cols-[minmax(16rem,0.3fr)_minmax(0,0.7fr)] xl:gap-16",
            )}
        >
            {title || description ? (
                <div className="space-y-1">
                    {title ? (
                        <h2
                            ref={headingRef}
                            tabIndex={headingTabIndex}
                            className={cx(
                                "rounded-sm text-base font-semibold tracking-tight focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]",
                                tone === "danger" ? "text-red-100" : "text-[var(--app-text)]",
                            )}
                        >
                            {title}
                        </h2>
                    ) : null}
                    {description ? (
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                            {description}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <div
                className={cx(
                    Boolean(title || description) && "mt-5",
                    layout === "split" && Boolean(title || description) && "md:mt-0",
                    bodyClassName,
                )}
            >
                {children}
            </div>
        </SettingsInner>
    </section>
);

type SettingsStatusProps = {
    children?: ReactNode;
    tone?: "success" | "error" | "info";
    className?: string;
    live?: boolean;
};

/**
 * The inline outcome line. Renders NOTHING when `children` is falsy, which is
 * what lets a call site drop `{saved ? "…" : null}` straight in and keep the
 * action bar's layout stable whether or not there is anything to say.
 */
export const SettingsStatus = ({
    children,
    tone = "info",
    className,
    live = true,
}: SettingsStatusProps) => {
    if (!children) return null;

    return (
        <div
            role={live ? (tone === "error" ? "alert" : "status") : undefined}
            aria-live={live ? (tone === "error" ? "assertive" : "polite") : undefined}
            aria-atomic={live ? "true" : undefined}
            className={cx(
                "rounded-xl border px-4 py-3 text-sm leading-6",
                tone === "success" && "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
                tone === "error" && "border-red-400/30 bg-red-500/10 text-red-100",
                tone === "info" && "border-sky-300/20 bg-sky-500/[0.08] text-sky-100",
                className,
            )}
        >
            {children}
        </div>
    );
};

/**
 * Section footer. Actions are right-aligned from `sm` up and go full-width on a
 * phone, which is why the child selector rather than a per-button class.
 */
export const SettingsActionBar = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
    <div
        className={cx(
            "flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
            className,
        )}
        {...props}
    />
);

type SettingsDisclosureProps = ComponentPropsWithoutRef<"details"> & {
    summary: ReactNode;
    summaryDetail?: ReactNode;
    contentWidth?: SettingsContentWidth;
};

/**
 * A collapsed section. Native `<details>` on purpose — it needs no state, it
 * survives SSR, and browser find-in-page can open it.
 *
 * The summary's label carries `role="heading" aria-level={2}` because a
 * `<summary>` is already exposed as a button and cannot be a heading as well;
 * without this the settings screen would have a hole in its heading outline
 * exactly where a collapsed section sits.
 */
export const SettingsDisclosure = ({
    summary,
    summaryDetail,
    contentWidth = "full",
    className,
    children,
    ...props
}: SettingsDisclosureProps) => (
    <details className={cx("group border-b border-[var(--border-soft)]", className)} {...props}>
        <summary className="min-h-14 cursor-pointer list-none outline-none transition hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 [&::-webkit-details-marker]:hidden">
            <span
                className={cx(
                    "mx-auto flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 sm:px-6",
                    settingsContentWidthClassName[contentWidth],
                )}
            >
                <span
                    role="heading"
                    aria-level={2}
                    className="min-w-0 text-sm font-semibold text-[var(--app-text)]"
                >
                    {summary}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-[var(--text-muted)]">
                    {summaryDetail}
                    <AnimatedArrow direction="right" className="text-base">
                        <span className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">
                            ›
                        </span>
                    </AnimatedArrow>
                </span>
            </span>
        </summary>
        <div className="bg-white/[0.012]">
            <SettingsInner
                width={contentWidth}
                className="px-5 py-5 text-sm leading-6 text-[var(--text-secondary)] sm:px-6"
            >
                {children}
            </SettingsInner>
        </div>
    </details>
);

type SettingsGroupHeaderProps = {
    id?: string;
    children: ReactNode;
    contentWidth?: SettingsContentWidth;
    tone?: "default" | "danger";
};

export const SettingsGroupHeader = ({
    id,
    children,
    contentWidth = "full",
    tone = "default",
}: SettingsGroupHeaderProps) => (
    <div
        data-settings-group-header
        className={cx(
            "bg-gradient-to-r to-transparent",
            tone === "danger"
                ? "from-red-500/[0.06] via-red-500/[0.025]"
                : "from-white/[0.045] via-white/[0.02]",
        )}
    >
        <SettingsInner width={contentWidth} className="px-5 py-3 sm:px-6">
            <h2
                id={id}
                className={cx(settingsFieldLabelClassName, tone === "danger" && "text-red-200/80")}
            >
                {children}
            </h2>
        </SettingsInner>
    </div>
);

type SettingsSurfaceProps = ComponentPropsWithoutRef<"div"> & {
    tone?: "default" | "danger" | "warning";
    padding?: "none" | "compact" | "default";
};

export const SettingsSurface = ({
    tone = "default",
    padding = "default",
    className,
    ...props
}: SettingsSurfaceProps) => (
    <div
        className={cx(
            "overflow-hidden rounded-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
            tone === "default" && "border-white/10 bg-white/[0.035]",
            tone === "danger" && "border-red-400/25 bg-red-500/[0.07]",
            tone === "warning" && "border-amber-300/25 bg-amber-500/[0.07]",
            padding === "compact" && "p-4",
            padding === "default" && "p-5 sm:p-6",
            className,
        )}
        {...props}
    />
);

type SettingsNavRowProps = {
    href: string;
    title: string;
    description?: ReactNode;
    trailing?: ReactNode;
    tone?: "default" | "danger";
    contentWidth?: SettingsContentWidth;
};

export const SettingsNavRow = ({
    href,
    title,
    description,
    trailing,
    tone = "default",
    contentWidth = "full",
}: SettingsNavRowProps) => (
    <Link
        href={href}
        className={cx(
            "group block min-h-14 transition",
            tone === "danger" ? "hover:bg-red-500/[0.045]" : "hover:bg-white/[0.035]",
            focusRingClassName,
        )}
    >
        <SettingsInner
            width={contentWidth}
            className="flex min-h-14 items-center gap-3 px-5 py-4 sm:px-6 sm:py-5"
        >
            <span className="min-w-0 flex-1">
                <span
                    className={cx(
                        "block text-base font-semibold tracking-tight",
                        tone === "danger" ? "text-red-100" : "text-[var(--app-text)]",
                    )}
                >
                    {title}
                </span>
                {description ? (
                    <span className="mt-0.5 block text-sm leading-5 text-[var(--text-muted)]">
                        {description}
                    </span>
                ) : null}
                {trailing ? <span className="mt-2 flex sm:hidden">{trailing}</span> : null}
            </span>
            {trailing ? <span className="hidden shrink-0 sm:block">{trailing}</span> : null}
            <AnimatedArrow
                direction="right"
                className="shrink-0 text-xl text-[var(--text-muted)] group-hover:text-white"
            >
                ›
            </AnimatedArrow>
        </SettingsInner>
    </Link>
);
