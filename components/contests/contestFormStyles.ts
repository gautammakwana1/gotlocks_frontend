// components/contests/contestFormStyles.ts
//
// The Feed contest form chrome, shared by the create wizard and the copy-edit
// screen. In the MVP those two ARE one component — the edit route renders
// StructuredContestCreateForm with `initialContest` set, which opens the wizard
// straight at its Rules step with the mechanics disabled. Our update endpoint is
// copy-only, so the edit screen is its own component; extracting these constants
// is what keeps the two visually identical anyway.

export const contestAccentClasses = {
    league: {
        fieldFocus: "focus:border-sky-300/60",
        hero:
            "border-slate-800/80 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-blue-950/45",
        heroGlow: "bg-gradient-to-br from-sky-400/10 via-transparent to-blue-400/10",
        checkbox: "accent-sky-400",
        createButton: "bg-sky-500/25 text-sky-100 hover:bg-sky-500/35",
        selectedSurface: "border-sky-300/40 bg-sky-500/10",
        sportOptionSelected:
            "border-sky-300/70 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-blue-900/20 text-white shadow-[0_6px_16px_-12px_rgba(59,130,246,0.8)]",
        toggleOn: "peer-checked:bg-sky-400/70 peer-focus-visible:ring-sky-300/70",
        textStrong: "text-sky-100",
        textSoft: "text-sky-200",
        lifecycleCurrent: "border-sky-300/50 bg-sky-500/15 text-sky-100",
    },
    arena: {
        fieldFocus: "focus:border-violet-300/60",
        hero:
            "border-violet-300/15 bg-gradient-to-br from-violet-950/80 via-slate-950/70 to-fuchsia-950/35",
        heroGlow: "bg-gradient-to-br from-violet-400/12 via-transparent to-fuchsia-400/10",
        checkbox: "accent-violet-400",
        createButton: "bg-violet-500/25 text-violet-100 hover:bg-violet-500/35",
        selectedSurface: "border-violet-300/40 bg-violet-500/10",
        sportOptionSelected:
            "border-violet-300/70 bg-gradient-to-b from-violet-500/25 via-violet-500/10 to-fuchsia-900/20 text-white shadow-[0_6px_16px_-12px_rgba(139,92,246,0.8)]",
        toggleOn: "peer-checked:bg-violet-400/70 peer-focus-visible:ring-violet-300/70",
        textStrong: "text-violet-100",
        textSoft: "text-violet-200",
        lifecycleCurrent: "border-violet-300/50 bg-violet-500/15 text-violet-100",
    },
} as const;

export type ContestAccent = keyof typeof contestAccentClasses;

export const fieldLabelClasses =
    "block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300";

export const fieldClasses = (accent: ContestAccent) =>
    `mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${contestAccentClasses[accent].fieldFocus}`;

export const copyFieldClasses = (accent: ContestAccent) =>
    `mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-normal normal-case leading-6 text-gray-300 outline-none transition placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 ${contestAccentClasses[accent].fieldFocus}`;

/** The number inputs embedded in the generated description sentences. */
export const inlineDescriptionInputClasses = (accent: ContestAccent) =>
    `h-9 border-b border-white/20 bg-transparent px-1 text-center text-base font-semibold tabular-nums normal-case text-white outline-none transition placeholder:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${contestAccentClasses[accent].fieldFocus}`;

/** The card every wizard step body sits inside. */
export const contestFormCardClasses = (accent: ContestAccent) =>
    `relative overflow-hidden rounded-2xl border p-5 shadow-lg sm:p-6 ${contestAccentClasses[accent].hero}`;
