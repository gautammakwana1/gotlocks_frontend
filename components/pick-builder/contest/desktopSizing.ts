// Chip sizing for the CONTEST entry builder.
//
// Deliberately its own module rather than a constant lifted out of the six sport
// builders: those inline their own `[--table-chip-width:60px] sm:96px` and stop
// there, while the MVP's contest screen adds an `lg:` step. Editing the shared
// strings to unify them would restyle every existing builder, which is not what
// this change is for.

export const pickTableOddsChipHeightClassName = "h-[40px] sm:h-[52px] lg:h-[59px]";

export const pickTableChipWidthClassName =
    "[--table-chip-width:60px] sm:[--table-chip-width:96px] lg:[--table-chip-width:108px]";

/** One odds chip. `muted` is a cell with no market at all, not a disabled one. */
export const tableOddsBoxClasses = (selected?: boolean, muted?: boolean) => {
    const base = `${pickTableOddsChipHeightClassName} w-[var(--table-chip-width,60px)] shrink-0 whitespace-nowrap rounded-md border bg-black/70 px-1 text-[11px] font-semibold tabular-nums transition sm:px-3 sm:text-sm flex items-center justify-center`;
    if (muted) return `${base} border-white/10 text-gray-500`;
    if (selected) {
        return `${base} border-sky-300/70 bg-sky-500/20 text-sky-100 shadow-[0_0_0_1px_rgba(96,165,250,0.35)]`;
    }
    return `${base} border-sky-400/50 text-sky-200 hover:border-sky-300/70`;
};
