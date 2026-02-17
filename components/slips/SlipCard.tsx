import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    slip: Slip;
    onClick?: () => void;
    variant?: "grid" | "row";
};

export const SlipCard = ({ slip, onClick, variant = "row" }: Props) => {
    const isInteractive = Boolean(onClick);
    const jaggedClipPath = JAGGED_CLIP_PATH;

    if (variant === "grid") {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={!isInteractive}
                style={{ clipPath: jaggedClipPath }}
                className={`group relative flex aspect-[8/5] w-full flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-blue-900/35 p-0 text-left shadow-sm transition sm:rounded-[28px] ${isInteractive
                    ? "hover:from-slate-950/70 hover:via-slate-900/60 hover:to-blue-800/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                    : "cursor-not-allowed opacity-70"
                    }`}
            >
                <div
                    aria-hidden
                    style={{ clipPath: jaggedClipPath }}
                    className="absolute inset-[1px] bg-gradient-to-b from-white/10 via-white/5 to-black/70"
                />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]" />
                <div className="relative z-10 flex h-full flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
                    <div className="rounded-2xl border border-white/15 bg-black/50 px-2 py-1.5 text-left text-[11px] font-semibold leading-tight text-white sm:px-3 sm:py-2 sm:text-sm">
                        <span className="block line-clamp-2">{slip.name}</span>
                    </div>
                    <div className="space-y-1.5">
                        {["", "", "", ""].map((_, row) => (
                            <div key={row} className="flex items-center gap-2">
                                <span className="block h-0.5 flex-1 rounded-full bg-white/10 sm:h-1" />
                                <span className="block h-0.5 w-[18%] rounded-full bg-white/10 sm:h-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!isInteractive}
            className={`group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-900/55 to-blue-900/30 px-4 py-3 text-left transition ${isInteractive
                    ? "hover:border-sky-400/40 hover:from-slate-950/60 hover:via-slate-900/50 hover:to-blue-800/40"
                    : "cursor-not-allowed opacity-70"
                }`}
        >
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                    {slip.name}
                </h3>
            </div>
            <div className="flex items-center gap-2">
                <span
                    aria-hidden
                    className="text-sm text-gray-500 transition group-hover:text-gray-300"
                >
                    &gt;
                </span>
            </div>
        </button>
    );
};

export default SlipCard;
