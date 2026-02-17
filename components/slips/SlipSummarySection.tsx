"use client";

import { useRouter } from "next/navigation";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { SlipModeBadge } from "./SlipModeBadge";
import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    slips: Slip[];
    groupId: string;
    returnTo?: string;
};

export const SlipSummarySection = ({ slips, groupId, returnTo }: Props) => {
    const router = useRouter();
    const fallbackPath = returnTo ?? `/group/${groupId}?tab=leaderboard`;
    const encodedReturn = encodeURIComponent(fallbackPath);

    if (slips.length === 0) {
        return (
            <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-400">
                No leaderboard slips yet. Finalized leaderboard slips will show up here for leaderboard
                context.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60">
            <div className="divide-y divide-white/5">
                {slips.map((slip) => (
                    <button
                        key={slip.id}
                        type="button"
                        onClick={() =>
                            router.push(
                                `/group/${groupId}/slips/${slip.id}/results?returnTo=${encodedReturn}`
                            )
                        }
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
                    >
                        <span
                            className="allow-caps font-extrabold text-transparent bg-clip-text"
                            style={displayNameGradientStyle}
                        >
                            {slip.name}
                        </span>
                        <SlipModeBadge isGraded={slip.isGraded} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SlipSummarySection;
