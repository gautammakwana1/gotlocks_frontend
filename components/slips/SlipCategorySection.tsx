import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { SlipCard } from "./SlipCard";
import { RootState, Slip } from "@/lib/interfaces/interfaces";
import { useSelector } from "react-redux";

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

    const { loading } = useSelector((state: RootState) => state.slip);

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

            {hasMore && !loading && (
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

            {loading && (
                <>
                    <style>
                        {`
                            @keyframes notifBounce {
                                0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                                50%       { transform: translateY(-8px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
                            }
                            .notif-dot { animation: notifBounce 0.9s infinite; }
                        `}
                    </style>
                    <div className="flex items-center justify-center gap-2 px-5 py-4 sm:px-6">
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "160ms" }} />
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "320ms" }} />
                    </div>
                </>
            )}
        </section>
    );
};

export default SlipCategorySection;
