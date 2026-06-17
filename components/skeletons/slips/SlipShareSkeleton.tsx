import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { CSSProperties } from "react";

const SlipShareSkeleton = () => {
    const deepJaggedStyle: CSSProperties = {
        clipPath: JAGGED_CLIP_PATH,
        "--jagged-valley": "34px",
        "--jagged-tip": "0px",
    } as CSSProperties;

    return (
        <section
            style={deepJaggedStyle}
            className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-slate-950/85 via-slate-900/60 to-blue-300/30 p-[1.5px] shadow-lg"
        >
            <div
                style={{ clipPath: JAGGED_CLIP_PATH }}
                className="relative overflow-hidden rounded-[26px] bg-slate-950/45"
            >
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-950/60 to-slate-800/35"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.65),transparent_65%)]"
                />
                <div className="relative z-10 space-y-6 p-5 pb-24 sm:p-6 sm:pb-28 animate-pulse">
                    <header className="space-y-2 border-b border-white/10 pb-4">
                        <div className="h-8 w-3/5 rounded-lg bg-white/10 sm:h-9" />
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-3 w-24 rounded bg-white/5" />
                            <div className="h-3 w-1 rounded bg-white/5" />
                            <div className="h-3 w-40 rounded bg-white/5" />
                        </div>
                    </header>

                    <ul className="space-y-3 pb-3">
                        {[1, 2, 3, 4].map((i) => (
                            <li key={i} className="relative pl-5">
                                <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/10" />
                                <div className="flex items-center gap-4 md:gap-5">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="mt-1 h-9 w-9 flex-shrink-0 rounded-full bg-white/10" />
                                        <div className="h-2 w-8 rounded bg-white/5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2 pr-1 md:gap-2 md:pr-4">
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="h-2 w-16 rounded bg-white/5" />
                                                <div className="h-2 w-10 rounded bg-white/5" />
                                                <div className="h-4 w-3/4 rounded bg-white/10" />
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <div className="h-2 w-16 rounded bg-white/5" />
                                                <div className="h-3 w-10 rounded bg-white/10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="flex justify-end pt-1">
                        <div className="h-3 w-44 rounded bg-white/5" />
                    </div>

                    <div className="pt-8">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10" />
                            <div className="h-3 w-24 rounded bg-white/5 md:h-4" />
                            <div className="h-px flex-1 bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SlipShareSkeleton;
