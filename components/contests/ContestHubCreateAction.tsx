import Link from "next/link";

type ContestHubAccent = "sky" | "violet";

const accentClasses: Record<
    ContestHubAccent,
    { surface: string; icon: string }
> = {
    sky: {
        surface:
            "border-sky-300/20 bg-gradient-to-r from-sky-500/[0.12] via-sky-500/[0.055] to-transparent hover:border-sky-200/45 hover:from-sky-500/[0.17]",
        icon:
            "border-sky-300/25 bg-sky-500/10 text-sky-100 group-hover:border-sky-200/45 group-hover:bg-sky-500/15",
    },
    violet: {
        surface:
            "border-violet-300/20 bg-gradient-to-r from-violet-500/[0.12] via-violet-500/[0.055] to-transparent hover:border-violet-200/45 hover:from-violet-500/[0.17]",
        icon:
            "border-violet-300/25 bg-violet-500/10 text-violet-100 group-hover:border-violet-200/45 group-hover:bg-violet-500/15",
    },
};

const PlusGlyph = ({ className }: { className: string }) => (
    <span aria-hidden className={className}>
        <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        >
            <path d="M10 4v12M4 10h12" />
        </svg>
    </span>
);

export type ContestHubCreateActionProps = {
    /** Renders the enabled call-to-action. Omit to render a disabled/unavailable state. */
    href?: string;
    title?: string;
    subtitle?: string;
    /**
     * Renders the same card shape, greyed out and non-interactive. Used while a
     * contest flow exists in the UI but is not wired to the backend yet.
     */
    disabled?: boolean;
    disabledLabel?: string;
    /** Limit/permission copy shown as an amber notice instead of the card. */
    unavailableReason?: string;
    unavailableHint?: string;
    accent?: ContestHubAccent;
};

export const ContestHubCreateAction = ({
    href,
    title = "Start a contest",
    subtitle = "Set the format, schedule, and entry rules.",
    disabled = false,
    disabledLabel,
    unavailableReason,
    unavailableHint,
    accent = "sky",
}: ContestHubCreateActionProps) => {
    if (disabled) {
        return (
            <button
                type="button"
                disabled
                aria-disabled="true"
                title={disabledLabel}
                className="flex min-h-[76px] w-full cursor-not-allowed items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left opacity-70"
            >
                <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-300">{title}</span>
                        {disabledLabel ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                                {disabledLabel}
                            </span>
                        ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">{subtitle}</span>
                </span>
                <PlusGlyph className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gray-500" />
            </button>
        );
    }

    if (href) {
        return (
            <Link
                href={href}
                className={`group flex min-h-[76px] w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors duration-200 ${accentClasses[accent].surface}`}
            >
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-1 block text-xs text-gray-500">{subtitle}</span>
                </span>
                <PlusGlyph
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ${accentClasses[accent].icon}`}
                />
            </Link>
        );
    }

    if (!unavailableReason) return null;

    return (
        <section className="flex min-h-[68px] flex-col justify-center rounded-lg border border-amber-300/25 bg-amber-500/10 px-5 py-3 text-sm text-amber-50">
            <p className="font-semibold">{unavailableReason}</p>
            {unavailableHint ? (
                <p className="mt-1 text-xs text-amber-100/80">{unavailableHint}</p>
            ) : null}
        </section>
    );
};

export default ContestHubCreateAction;
