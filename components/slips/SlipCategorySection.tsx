import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { SlipCard } from "./SlipCard";
import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    title: string;
    slips: Slip[];
    onSelect?: (slipId?: string) => void;
    onLoadMore?: () => void;
    emptyCopy?: string;
    layout?: "grid" | "list";
    hasMore: boolean;
};

export const SlipCategorySection = ({
    title,
    slips,
    onSelect,
    onLoadMore,
    emptyCopy,
    layout = "grid",
    hasMore = false,
}: Props) => {
    const isList = layout === "list";
    const emptyLabel = emptyCopy ?? "No slips yet — create one to get started.";

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {title}
                </h3>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {slips.length} {slips.length === 1 ? "slip" : "slips"}
                </span>
            </div>
            {slips.length === 0 ? (
                isList ? (
                    <div className="rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] px-4 py-3 text-sm text-gray-400">
                        {emptyLabel}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <div
                            style={{ clipPath: JAGGED_CLIP_PATH }}
                            className="relative flex aspect-[8/5] w-full items-start justify-start overflow-hidden rounded-[24px] bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] p-4 text-left text-xs text-gray-400 sm:rounded-[28px] sm:text-sm"
                        >
                            <span className="relative z-10 max-w-[85%]">{emptyLabel}</span>
                        </div>
                    </div>
                )
            ) : isList ? (
                <div className="space-y-2">
                    {slips.map((slip) => (
                        <SlipCard
                            key={slip.id}
                            slip={slip}
                            variant="row"
                            onClick={onSelect ? () => onSelect(slip.id) : undefined}
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {slips.map((slip) => (
                        <SlipCard
                            key={slip.id}
                            slip={slip}
                            variant="grid"
                            onClick={onSelect ? () => onSelect(slip.id) : undefined}
                        />
                    ))}
                </div>
            )}
            {hasMore && (
                // <div className="flex items-center justify-center">
                //     <button
                //         onClick={onLoadMore}
                //         className="group relative flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-1 text-xs font-medium text-gray-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-50 active:scale-95"
                //     >
                //         <div className="absolute inset-0 rounded-full bg-emerald-500/20 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                //         <span className="relative">Load More</span>
                //     </button>
                // </div>
                <div className="w-full">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                        show more
                    </button>
                </div>
            )}
        </section>
    );
};

export default SlipCategorySection;
