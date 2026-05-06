import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { CSSProperties } from "react";

const SlipResultsSkeleton = () => {
    const deepJaggedStyle: CSSProperties = {
        clipPath: JAGGED_CLIP_PATH,
        "--jagged-valley": "34px",
        "--jagged-tip": "0px",
    } as CSSProperties;

    return (
        <div className="flex flex-col gap-6 pb-12 animate-pulse">
            <div className="h-10 w-24 rounded-lg bg-white/5" />

            <section
                style={deepJaggedStyle}
                className="relative overflow-hidden rounded-[32px] bg-white/5 p-[1.5px] shadow-lg"
            >
                <div
                    style={{ clipPath: JAGGED_CLIP_PATH }}
                    className="relative overflow-hidden rounded-[30px] bg-slate-950/45 p-5 sm:p-6 pb-32 sm:pb-36 space-y-6"
                >
                    <header className="space-y-4 border-b border-white/10 pb-5">
                        <div className="space-y-2">
                            <div className="h-8 w-3/4 rounded-lg bg-white/10" />
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="h-3 w-20 rounded bg-white/5" />
                                <div className="h-3 w-1 rounded bg-white/5" />
                                <div className="h-3 w-40 rounded bg-white/5" />
                            </div>
                        </div>
                    </header>

                    <div className="flex items-center gap-6">
                        <div className="h-6 w-32 border-b-2 border-white/10 text-white" />
                        <div className="h-6 w-24 text-gray-400" />
                    </div>

                    <div className="space-y-4">
                        <div className="h-3 w-32 rounded bg-white/5" />

                        <div className="space-y-5">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-4 md:gap-5">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="h-9 w-9 rounded-full bg-white/10" />
                                        <div className="h-2 w-8 rounded bg-white/5" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1.5 flex-1">
                                                <div className="h-2 w-12 rounded bg-white/5" />
                                                <div className="h-4 w-3/4 rounded bg-white/10" />
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="h-2 w-16 rounded bg-white/5" />
                                                <div className="h-3 w-10 rounded bg-white/10" />
                                            </div>
                                        </div>
                                        <div className="h-2 w-24 rounded bg-white/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-8 z-10 px-5 pt-7 pb-9 sm:px-6 sm:pb-10">
                        <div className="flex items-center justify-end">
                            <div className="h-8 w-48 rounded-xl bg-white/10" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SlipResultsSkeleton;
