"use client";

export type MemberDirectoryView = "cards" | "list";
export type MemberDirectoryAccent = "league" | "arena";

/** The Members tab's own wrapper — the extra gutter is the MVP's, and only it
 *  keeps the tile grid off the panel edge once the grid runs six wide. */
export const memberDirectoryPanelClassName = "space-y-4 md:px-6";

export const memberDirectoryGridClassName =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export const memberDirectoryListClassName = "divide-y divide-white/10";

/**
 * The square member tile used by the "Cards" view on both surfaces. Owning the
 * accent here is what keeps a League tile blue and an Arena tile violet without
 * either caller restating the gradient.
 */
export const getMemberDirectoryCardClassName = (accent: MemberDirectoryAccent) =>
    `relative flex aspect-square w-full flex-col rounded-2xl border bg-clip-padding p-4 shadow-sm transition ${accent === "arena"
        ? "border-violet-200/10 bg-gradient-to-b from-violet-500/15 via-violet-500/[0.09] to-slate-950/20 hover:border-violet-300/35"
        : "border-blue-400/10 bg-gradient-to-b from-blue-400/15 via-blue-400/[0.09] to-slate-950/20 hover:border-blue-400/35"
    }`;

export const getMemberDirectoryAvatarClassName = (
    accent: MemberDirectoryAccent,
    size: "card" | "list"
) =>
    `flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/[0.05] text-xs font-semibold uppercase tracking-[0.18em] text-gray-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${size === "card" ? "h-14 w-14 rounded-xl" : "h-10 w-10 rounded-lg"
    } ${accent === "arena"
        ? "hover:border-violet-300/60 hover:shadow-[0_0_16px_rgba(167,139,250,0.3)] focus-visible:outline-violet-300"
        : "hover:border-blue-400/60 hover:shadow-[0_0_16px_rgba(96,165,250,0.3)] focus-visible:outline-blue-400"
    }`;

export const MemberDirectoryViewToggle = ({
    view,
    onViewChange,
    embedded = false,
}: {
    view: MemberDirectoryView;
    onViewChange: (view: MemberDirectoryView) => void;
    embedded?: boolean;
}) => (
    <div
        role="group"
        aria-label="Member view"
        className={
            embedded
                ? "grid h-9 shrink-0 grid-cols-2 gap-1"
                : "grid h-11 shrink-0 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
        }
    >
        {(["cards", "list"] as const).map((option) => {
            const active = view === option;
            return (
                <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onViewChange(option)}
                    className={`${embedded ? "min-w-14" : "min-w-16"} rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/20 ${active
                        ? "border-transparent bg-white/[0.04] text-gray-200"
                        : "border-transparent text-gray-500 hover:bg-white/[0.025] hover:text-gray-300"
                        }`}
                >
                    {option === "cards" ? "Cards" : "List"}
                </button>
            );
        })}
    </div>
);

export const MemberDirectorySearch = ({
    search,
    onSearchChange,
    accent,
    searchLabel,
    embedded = false,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    accent: MemberDirectoryAccent;
    searchLabel: string;
    embedded?: boolean;
}) => {
    const focusClassName =
        accent === "arena" ? "focus:border-violet-300/60" : "focus:border-blue-400/60";

    return (
        <label className={embedded ? "block min-w-0 w-full" : "block w-full sm:max-w-sm"}>
            <span className="sr-only">{searchLabel}</span>
            <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search members"
                className={
                    embedded
                        ? "no-focus-ring h-9 w-full rounded-lg border border-transparent bg-transparent px-3 text-sm normal-case text-white outline-none"
                        : `h-11 w-full rounded-xl border border-white/10 bg-black/60 px-4 text-sm normal-case text-white outline-none transition ${focusClassName}`
                }
            />
        </label>
    );
};
