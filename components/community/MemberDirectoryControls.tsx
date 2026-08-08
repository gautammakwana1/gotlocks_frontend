"use client";

export type MemberDirectoryView = "cards" | "list";
export type MemberDirectoryAccent = "league" | "arena";

export const memberDirectoryGridClassName =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

export const memberDirectoryListClassName = "divide-y divide-white/10";

export const getMemberDirectoryAvatarClassName = (
    accent: MemberDirectoryAccent,
    size: "card" | "list"
) =>
    `flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/[0.05] text-xs font-semibold uppercase tracking-[0.18em] text-gray-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${size === "card" ? "h-14 w-14 rounded-xl" : "h-10 w-10 rounded-lg"
    } ${accent === "arena"
        ? "hover:border-violet-300/60 hover:shadow-[0_0_16px_rgba(196,181,253,0.3)] focus-visible:outline-violet-300"
        : "hover:border-sky-300/60 hover:shadow-[0_0_16px_rgba(125,211,252,0.3)] focus-visible:outline-sky-300"
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
        accent === "arena" ? "focus:border-violet-300/60" : "focus:border-sky-300/60";

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
