import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { CSSProperties } from "react";

const SlipDetailsSkeleton = () => {
    const deepJaggedStyle: CSSProperties = {
        clipPath: JAGGED_CLIP_PATH,
        "--jagged-valley": "34px",
        "--jagged-tip": "0px",
    } as CSSProperties;

    return (
        <div className="flex flex-col gap-6 pb-12 animate-pulse">
            <section
                style={deepJaggedStyle}
                className="relative overflow-hidden rounded-[32px] bg-white/5 p-[1.5px] shadow-lg"
            >
                <div
                    style={{ clipPath: JAGGED_CLIP_PATH }}
                    className="relative overflow-hidden rounded-[30px] bg-slate-950/45"
                >
                    <div className="relative z-10 flex flex-col gap-6 p-5 pb-32 sm:p-6 sm:pb-36">
                        <div className="h-4 w-12 rounded bg-white/5 self-start" />

                        <header className="space-y-4 border-b border-white/10 pb-5">
                            <div className="flex items-center justify-between gap-10">
                                <div className="h-8 w-1/3 rounded-lg bg-white/10" />
                                <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10" />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="h-3 w-32 rounded bg-white/5" />
                                <div className="h-3 w-1 rounded bg-white/5" />
                                <div className="h-3 w-48 rounded bg-white/5" />
                            </div>
                        </header>

                        <div className="flex items-center gap-6 border-b border-white/10 pb-1">
                            <div className="h-6 w-24 border-b-2 border-white/10" />
                            <div className="h-6 w-24 rounded bg-white/5" />
                        </div>

                        <div className="space-y-6">
                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="h-3 w-24 rounded bg-white/5" />
                                    <div className="h-3 w-16 rounded bg-white/10" />
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/10" />
                                <div className="h-3 w-32 rounded bg-white/5" />
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10" />
                                        <div className="h-4 w-20 rounded bg-white/10" />
                                    </div>
                                    <div className="h-4 w-24 rounded bg-white/5" />
                                </div>

                                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                                    <div className="h-2 w-16 rounded bg-white/5" />
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 w-3/4 rounded bg-white/10" />
                                            <div className="h-3 w-1/2 rounded bg-white/5" />
                                        </div>
                                        <div className="h-4 w-10 rounded bg-white/10" />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between pt-2">
                                    <div className="h-4 w-32 rounded bg-white/10" />
                                    <div className="h-3 w-20 rounded bg-white/5" />
                                </div>

                                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center flex flex-col items-center gap-2">
                                    <div className="h-3 w-40 rounded bg-white/5" />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SlipDetailsSkeleton;
