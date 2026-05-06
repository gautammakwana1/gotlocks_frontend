
import React from "react";

const LeagueSettingsSkeleton = () => {
    return (
        <div className="space-y-6 pt-2 animate-pulse">
            {/* Main Leaderboard Section */}
            <section className="pb-4">
                <div className="flex w-full items-start justify-between gap-4 text-left">
                    <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-white/10" />
                        <div className="h-3 w-64 rounded bg-white/5" />
                    </div>
                    <div className="h-4 w-4 rounded bg-white/5" />
                </div>
                
                {/* Active Main Leaderboard Card */}
                <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-40 rounded bg-white/10" />
                            <div className="h-7 w-7 rounded-full bg-white/5" />
                        </div>
                        <div className="h-9 w-32 rounded-2xl bg-white/10" />
                    </div>
                </div>
            </section>

            <div className="-mx-5 h-px bg-white/10 sm:mx-0 my-4" />

            {/* Secondary Leaderboards Section */}
            <section className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-48 rounded bg-white/10" />
                        <div className="h-5 w-5 rounded-full bg-white/5" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-20 rounded bg-white/5" />
                        <div className="h-4 w-4 rounded bg-white/5" />
                    </div>
                </div>
                <div className="mt-1 h-3 w-full max-w-md rounded bg-white/5" />
            </section>

            <div className="-mx-5 h-px bg-white/10 sm:mx-0 my-4" />

            {/* Archived Leaderboards Section */}
            <section className="pb-4">
                <div className="flex w-full items-start justify-between gap-4 text-left">
                    <div className="space-y-2">
                        <div className="h-4 w-40 rounded bg-white/10" />
                        <div className="h-3 w-full max-w-sm rounded bg-white/5" />
                    </div>
                    <div className="h-4 w-4 rounded bg-white/5" />
                </div>
            </section>
        </div>
    );
};

export default LeagueSettingsSkeleton;
