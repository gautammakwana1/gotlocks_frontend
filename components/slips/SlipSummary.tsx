"use client";

import { Pick, Slip } from "@/lib/interfaces/interfaces";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { getPickPoints } from "@/lib/utils/scoring";

type Props = {
    slip: Slip;
    picks?: Pick[];
    className?: string;
};

export default function SlipSummary({ slip, picks = [], className }: Props) {
    const totalPoints = picks.reduce(
        (sum, pick) => sum + getPickPoints(pick, "groupLeaderboard"),
        0
    );

    return (
        <div
            className={`rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300 ${className ?? ""}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p
                        className="allow-caps text-lg font-extrabold text-transparent bg-clip-text"
                        style={displayNameGradientStyle}
                    >
                        {slip.name}
                    </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                    {slip.isGraded ? "leaderboard slip" : "vibe slip"}
                </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
                {picks.length} picks · {slip.sports ? slip.sports.length > 0 ? slip.sports.join(", ") : "multi-sport" : "multi-sport"}
            </p>
            {slip.isGraded && (
                <p className="mt-2 text-sm font-semibold text-emerald-100">{totalPoints} pts</p>
            )}
        </div>
    );
}
