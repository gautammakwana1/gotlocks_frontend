import { displayNameGradientStyle } from "@/lib/styles/text";
import { formatDateTime } from "@/lib/utils/date";
import SlipModeBadge from "./SlipModeBadge";
import { Pick, Slip } from "@/lib/interfaces/interfaces";
import { isSlipFinal, isSlipTimeLocked, normalizePickResult } from "@/lib/slips/state";
import { getPickPoints } from "@/lib/utils/scoring";

type Props = {
    slip: Slip;
    picks: Pick[];
    onClick?: () => void;
};

export const LeaderboardSlipSummary = ({ slip, picks, onClick }: Props) => {
    const scoredPicks = picks.filter(
        (pick) => normalizePickResult(pick.result) !== "pending"
    );
    const totalPoints = scoredPicks.reduce(
        (sum, pick) => sum + getPickPoints(pick, "groupLeaderboard"),
        0
    );
    const isFinal = isSlipFinal(slip);
    const isLocked = isSlipTimeLocked(slip);
    const deadlineLabel = isFinal ? "Finalized" : isLocked ? "Picks locked" : "Pick deadline";

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/50"
        >
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Leaderboard slip</p>
                    <h4
                        className="allow-caps text-lg font-extrabold text-transparent bg-clip-text"
                        style={displayNameGradientStyle}
                    >
                        {slip.name}
                    </h4>
                    <p className="text-xs text-gray-400">
                        {deadlineLabel} {formatDateTime(slip.pick_deadline_at)}
                    </p>
                </div>
                <SlipModeBadge isGraded={slip.isGraded} />
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-white">
                    {scoredPicks.length} leaderboard picks
                </span>
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-white">
                    {totalPoints} pts
                </span>
            </div>
        </button>
    );
};

export default LeaderboardSlipSummary;
