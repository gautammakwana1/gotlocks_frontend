import { Pick, SlipStatus } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import { formatTierPrimary, getBasePointsForPick, getPickPoints, getTierMetaForPick } from "@/lib/utils/scoring";

type Props = {
    pick: Pick;
    slipStatus: SlipStatus;
    className?: string;
    showMeta?: boolean;
};

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;
const PLACEHOLDER = EM_DASH;

const resultMeta = (pick?: Pick) => {
    const result = pick?.result ?? "pending";
    const tone =
        result === "win"
            ? "text-emerald-100 border-emerald-300/60 bg-emerald-500/10 shadow-[0_10px_30px_rgba(16,185,129,0.18)]"
            : result === "loss"
                ? "text-red-100 border-red-300/60 bg-red-500/12 shadow-[0_10px_30px_rgba(248,113,113,0.18)]"
                : result === "void" || result === "not_found"
                    ? "text-amber-50 border-amber-200/60 bg-amber-500/12 shadow-[0_10px_30px_rgba(251,191,36,0.18)]"
                    : "text-gray-200 border-gray-700 bg-white/[0.06] shadow-[0_10px_28px_rgba(0,0,0,0.35)]";

    const label =
        result === "pending" || result === null
            ? "Pending"
            : result === "void"
                ? "void"
                : result === "not_found"
                    ? "n/a"
                    : result === "win"
                        ? "win"
                        : "loss";

    return { label, tone };
};

const extractMatchup = (description?: string | null) => {
    if (!description) return null;
    const [lead] = description.split(DASH_SEPARATOR);
    const candidate = lead?.trim();
    if (candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate)) {
        return candidate;
    }
    const match = description.match(
        new RegExp(`([^${EM_DASH}]*?(@|\\bvs\\.?\\b|\\bv\\.?\\b)[^${EM_DASH}]*)`, "i")
    );
    return match ? match[1].trim() : null;
};

const formatPointsValue = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return PLACEHOLDER;
    return value > 0 ? `+${value}` : `${value}`;
};

const computeResultPoints = (pick?: Pick) => getPickPoints(pick, "groupLeaderboard");

const pickTierMeta = (pick?: Pick) => {
    if (!pick) return null;
    const tierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode: "global",
    });
    if (!tierMeta) return null;
    return {
        tier: tierMeta.tier,
        name: tierMeta.name,
        primary: formatTierPrimary(tierMeta.tier),
        points: tierMeta.points,
        color: tierMeta.color,
    };
};

export const PickCellCard = ({
    pick,
    slipStatus,
    className = "",
    showMeta = true,
}: Props) => {
    const displayPick = pick?.description ?? "No pick was submitted";
    const [matchupSegment, ...lineSegments] = displayPick.split(DASH_SEPARATOR);
    const matchupCandidate = extractMatchup(matchupSegment);
    const pickLine =
        matchupCandidate && lineSegments.length > 0
            ? lineSegments.join(DASH_SEPARATOR)
            : displayPick;
    const tierMeta = pickTierMeta(pick);
    const tierPrimary = tierMeta?.primary ?? PLACEHOLDER;
    const tierName = tierMeta?.name ?? PLACEHOLDER;
    const oddsCopy = pick?.odds_bracket ?? PLACEHOLDER;
    const legsCount = pick?.legs?.length ?? 0;
    const legsCopy = legsCount > 0 ? `${legsCount} legs` : pick?.is_combo ? "combo" : null;
    const matchupCopy = matchupCandidate ?? extractMatchup(displayPick) ?? PLACEHOLDER;
    const gameTimeCopy = formatDateTime(pick?.selection?.gameStartTime);
    const showMatchup = matchupCopy !== PLACEHOLDER;
    const showGameTime = gameTimeCopy !== PLACEHOLDER;
    const result = resultMeta(pick);
    const resultPoints =
        pick?.result === "pending" || pick?.result === null
            ? null
            : computeResultPoints(pick);
    const cardTone =
        slipStatus === "final"
            ? "border-slate-800 bg-slate-950/80"
            : "border-slate-900/80 bg-slate-950/70";
    const basePotential = pick ? getBasePointsForPick(pick, "groupLeaderboard") : null;
    const potentialPoints =
        typeof basePotential === "number" ? Math.min(basePotential, 60) : null;
    const isPending = pick?.result === "pending" || pick?.result === null;
    const pointsValue = resultPoints !== null ? resultPoints : potentialPoints;
    const pointsDisplay = formatPointsValue(pointsValue);
    const pointsLabel = resultPoints !== null ? "Points" : isPending ? "Potential" : "Points";
    const pointsLabelText = pointsLabel.toLowerCase();
    const showPointsSuffix = pointsDisplay !== PLACEHOLDER;
    const tierCardTone = tierMeta?.color
        ? `bg-gradient-to-br ${tierMeta.color}`
        : "bg-slate-900/70";
    const resultCardTone =
        pick?.result === "win"
            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-50"
            : pick?.result === "loss"
                ? "border-rose-400/30 bg-rose-500/15 text-rose-50"
                : pick?.result === "void" || pick?.result === "not_found"
                    ? "border-amber-400/30 bg-amber-500/15 text-amber-50"
                    : "border-slate-600/40 bg-slate-800/60 text-slate-100";
    const sourceTabLabel = (
        pick.source_tab ??
        (pick?.is_combo || pick?.legs?.length ? "Combo" : "Pick")
    ).toLowerCase();

    return (
        <div
            className={`relative flex h-full w-full overflow-hidden rounded-2xl border p-2 md:p-3 ${cardTone} ${className}`}
        >
            <div className="flex h-full w-full flex-col gap-1 md:flex-row md:items-stretch md:gap-2">
                <div className="order-1 flex min-h-0 w-full flex-1 flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/50 p-1.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.4)] md:order-2 md:h-full md:rounded-2xl md:border-slate-800/70 md:bg-slate-900/60 md:p-3 md:shadow-[inset_0_0_16px_rgba(15,23,42,0.6)]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="block text-[7px] font-semibold uppercase tracking-wide text-slate-400 md:text-[10px]">
                                {sourceTabLabel}
                            </span>
                            <p
                                className="mt-1 min-w-0 whitespace-normal break-words text-[11px] font-semibold leading-snug text-cyan-200 drop-shadow-[0_1px_8px_rgba(30,58,138,0.75)] md:text-base"
                                title={displayPick}
                            >
                                {pickLine}
                            </p>
                        </div>
                        <span className="shrink-0 pr-1 text-[11px] font-semibold text-slate-100 md:pr-2 md:text-sm">
                            {oddsCopy}
                        </span>
                    </div>
                    <div className="text-[10px] md:text-xs">
                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400 md:text-xs">
                            matchup
                        </span>
                        {showMatchup ? (
                            <span className="mt-0.5 block truncate text-[7px] text-slate-200 md:text-xs">
                                {matchupCopy}
                            </span>
                        ) : (
                            <span className="mt-0.5 block text-[7px] text-slate-500 md:text-xs">
                                {PLACEHOLDER}
                            </span>
                        )}
                        {showGameTime && (
                            <span className="mt-0.5 hidden truncate text-[11px] text-slate-200 sm:block sm:text-xs">
                                {gameTimeCopy}
                            </span>
                        )}
                        {legsCopy && (
                            <span className="mt-1 block text-[7px] font-semibold uppercase tracking-wide text-slate-500 md:text-[10px]">
                                {legsCopy}
                            </span>
                        )}
                    </div>
                </div>

                {showMeta && (
                    <div className="order-2 flex w-full gap-1 text-left md:order-1 md:h-full md:w-[26%] md:min-w-[96px] md:max-w-[140px] md:flex-col md:justify-between md:border-r md:border-slate-800/70 md:pr-2 md:gap-2">
                        <div
                            className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 px-1.5 py-1 shadow-[inset_0_0_10px_rgba(15,23,42,0.3)] md:rounded-2xl md:px-2 md:py-2 md:shadow-[inset_0_0_16px_rgba(15,23,42,0.35)] ${tierCardTone}`}
                        >
                            <span className="block text-[11px] font-semibold text-white md:text-base">
                                {tierPrimary}
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-100/80 md:text-[10px]">
                                {tierName}
                            </span>
                        </div>
                        <div
                            className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border px-1.5 py-1 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] md:rounded-2xl md:px-2 md:py-2 md:shadow-[inset_0_0_12px_rgba(15,23,42,0.25)] ${resultCardTone}`}
                        >
                            <span className="block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-100/80 md:text-[10px]">
                                {pointsLabelText}
                            </span>
                            <div className="text-[11px] font-semibold md:text-base">
                                {pointsDisplay}
                                {showPointsSuffix && (
                                    <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-100/70">
                                        pts
                                    </span>
                                )}
                            </div>
                            <span className="block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-100/70 md:text-[10px]">
                                {result.label}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PickCellCard;
