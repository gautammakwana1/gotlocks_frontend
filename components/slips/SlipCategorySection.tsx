import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { SlipCard } from "./SlipCard";
import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    title: string;
    slips: Slip[];
    onSelect?: (slipId?: string) => void;
    emptyCopy?: string;
    layout?: "grid" | "list";
};

export const SlipCategorySection = ({
    title,
    slips,
    onSelect,
    emptyCopy,
    layout = "grid",
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
        </section>
    );
};

export default SlipCategorySection;
