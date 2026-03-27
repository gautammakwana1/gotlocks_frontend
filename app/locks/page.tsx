"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CurrentUser } from "@/lib/interfaces/interfaces";
import { getLocalStorage } from "@/lib/utils/jwtUtils";

const LocksPage = () => {
    const router = useRouter();
    const currentUser: CurrentUser | null = useMemo(() => {
        const storedUser = getLocalStorage<CurrentUser>("currentUser");
        return storedUser || null;
    }, []);

    useEffect(() => {
        if (!currentUser) {
            router.replace("/landing-page");
        }
    }, [router, currentUser]);

    if (!currentUser) return null;

    return (
        <div className="flex flex-col gap-6 text-white">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-white/5 p-6 shadow-lg shadow-emerald-500/20">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-[0.16em] text-emerald-50/90">
                            lockie&apos;s picks
                        </span>
                        <h1 className="text-2xl font-extrabold text-white">Premium AI picks bundle</h1>
                        <p className="text-sm text-gray-200">
                            Lockie&apos;s pick of the day and curated bundles are on the way. Grab an early
                            preview of what the drop will feel like.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-200/50 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-50">
                        🔒 Coming soon
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-gray-100">
                        <div className="mb-2 text-base font-semibold text-white">AI model edge</div>
                        A premium bundle fueled by the same grading logic we use inside slips, tuned for
                        daily picks.
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-gray-100">
                        <div className="mb-2 text-base font-semibold text-white">Drop cadence</div>
                        Expect one headline pick per day plus a handful of tiered backups for parlays.
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-gray-100">
                        <div className="mb-2 text-base font-semibold text-white">Bankroll guardrails</div>
                        Suggested unit sizing and confidence tags so you can protect your roll.
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-400/10 text-xl">
                            📦
                        </div>
                        <div className="flex flex-col">
                            <p className="text-base font-semibold text-white">Bundle roadmap</p>
                            <p className="text-sm text-gray-300">
                                Sneak peek of the flow until the premium API is wired up.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">morning</p>
                            <p className="text-sm font-semibold text-white">Pick drops</p>
                            <p className="text-xs text-gray-300">Lockie posts the model-backed single for the day.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">midday</p>
                            <p className="text-sm font-semibold text-white">Confidence update</p>
                            <p className="text-xs text-gray-300">Unit sizing + hedge ideas land in the bundle feed.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">evening</p>
                            <p className="text-sm font-semibold text-white">Final grade</p>
                            <p className="text-xs text-gray-300">Results sync back into your fantasy leaderboard.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/feedback"
                            className="rounded-2xl bg-emerald-500/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-emerald-400"
                        >
                            request early access
                        </Link>
                        <span className="text-xs uppercase tracking-wide text-gray-400">
                            Lockie&apos;s pick of the day coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocksPage;
