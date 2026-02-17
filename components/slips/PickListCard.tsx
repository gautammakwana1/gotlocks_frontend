import { Pick, Picks, SlipStatus } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import { parseAmericanOdds } from "@/lib/utils/scoring";

type Props = {
    picks?: Picks;
    items?: Array<{
        id: string;
        description: string;
        odds: string | null;
        sourceTab?: string | null;
    }>;
    comboOdds?: string | number | null;
    slipStatus: SlipStatus;
    className?: string;
    canManage?: boolean;
    onDeletePick?: (pick: Pick) => void;
    highlightResults?: boolean;
    showComboPickCount?: boolean;
};

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "—";
    }
    return value > 0 ? `+${value}` : `${value}`;
};

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;
const META_SEPARATOR = " \u00b7 ";

const extractPickLine = (description: string) => {
    const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
    const candidate = matchupSegment?.trim();
    const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
    if (hasMatchup && lineSegments.length > 0) {
        return lineSegments.join(DASH_SEPARATOR);
    }
    return description;
};

const toDecimalOdds = (american: number) =>
    american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);

const toAmericanOdds = (decimal: number) => {
    if (!Number.isFinite(decimal) || decimal <= 1) return null;
    if (decimal >= 2) return Math.round((decimal - 1) * 100);
    return Math.round(-100 / (decimal - 1));
};

const combineParlayOdds = (
    list: Array<{ odds: string | null }>
) => {
    if (!list.length) return null;
    let decimal = 1;
    for (const item of list) {
        const american = parseAmericanOdds(item.odds);
        if (american === null) return null;
        decimal *= toDecimalOdds(american);
    }
    return toAmericanOdds(decimal);
};

export const PickListCard = ({
    picks = [],
    items,
    comboOdds,
    slipStatus,
    className = "",
    canManage = false,
    onDeletePick,
    highlightResults = false,
    showComboPickCount = true,
}: Props) => {
    const listItems = (items ?? picks.map((pick) => ({
        id: pick.id,
        description: pick.description,
        odds: pick.odds_bracket ?? null,
        sourceTab: pick.source_tab ?? (pick.is_combo || pick.legs?.length ? "Combo" : "Pick"),
        pick,
    }))) as Array<{
        id: string;
        description: string;
        odds: string | null;
        sourceTab?: string | null;
        pick?: Pick;
    }>;
    const comboOddsValue = comboOdds !== undefined
        ? parseAmericanOdds(comboOdds) ?? comboOdds
        : listItems.length === 1
            ? listItems[0]?.odds ?? null
            : combineParlayOdds(listItems);
    const comboLabel =
        comboOddsValue === null || comboOddsValue === undefined
            ? "—"
            : formatOdds(comboOddsValue);
    const showHeader = listItems.length > 1;
    const baseCardTone =
        slipStatus === "final"
            ? "border-slate-800/80 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-blue-900/40"
            : "border-slate-900/80 bg-gradient-to-br from-slate-950/75 via-slate-900/60 to-blue-900/30";
    const allowDelete = Boolean(onDeletePick) && canManage;

    const resultCounts = listItems.reduce(
        (acc, item) => {
            if (!item.pick) return acc;
            const result = item.pick.result ?? "pending";
            if (result === "win") acc.win += 1;
            else if (result === "loss") acc.loss += 1;
            else if (result === "void" || result === "not_found") acc.void += 1;
            else acc.pending += 1;
            return acc;
        },
        { win: 0, loss: 0, void: 0, pending: 0 }
    );
    const hasWin = resultCounts.win > 0;
    const hasLoss = resultCounts.loss > 0;
    const hasVoid = resultCounts.void > 0;
    const resultCardTone =
        highlightResults && (hasWin || hasLoss || hasVoid)
            ? hasWin && !hasLoss
                ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 via-emerald-400/10 to-black/40"
                : hasLoss && !hasWin
                    ? "border-rose-400/40 bg-gradient-to-br from-rose-500/25 via-rose-400/10 to-black/40"
                    : hasWin && hasLoss
                        ? "border-amber-300/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-black/40"
                        : "border-yellow-300/30 bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-black/40"
            : null;
    const cardTone = resultCardTone ?? baseCardTone;

    return (
        <div className={`rounded-2xl border p-3 md:p-4 ${cardTone} ${className}`}>
            {showHeader && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {showComboPickCount ? (
                        <>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                    combo price
                                </p>
                                <p className="text-sm font-semibold text-cyan-200">{comboLabel}</p>
                            </div>
                            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                                {listItems.length} pick{listItems.length === 1 ? "" : "s"}
                            </span>
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                combo price
                            </p>
                            <p className="text-sm font-semibold text-cyan-200">{comboLabel}</p>
                        </>
                    )}
                </div>
            )}

            <ul className={`${showHeader ? "mt-3" : "mt-1"} space-y-2`}>
                {listItems.map((item) => {
                    const oddsLabel = formatOdds(item.odds);
                    const pickLine = extractPickLine(item.description);
                    const matchupLabel = item.pick?.matchup ?? null;
                    const timeLabel = formatDateTime(item.pick?.match_date);
                    const showTime = timeLabel !== "—";
                    const metaParts = [matchupLabel, showTime ? timeLabel : null].filter(Boolean);
                    const metaLabel = metaParts.join(META_SEPARATOR);
                    const sourceTabLabel = item.sourceTab?.toLowerCase();
                    const canDelete = allowDelete && Boolean(item.pick);

                    return (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex items-start gap-2">
                                {canDelete ? (
                                    <button
                                        type="button"
                                        onClick={() => item.pick && onDeletePick?.(item.pick)}
                                        className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                        aria-label="Delete pick"
                                        title="Delete pick"
                                    >
                                        -
                                    </button>
                                ) : (
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                                )}
                                <div className="min-w-0">
                                    {sourceTabLabel && (
                                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            {sourceTabLabel}
                                        </span>
                                    )}
                                    <p
                                        className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                        title={item.description}
                                    >
                                        {pickLine}
                                    </p>
                                    {metaLabel && (
                                        <p className="mt-1 text-[10px] text-slate-400">{metaLabel}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 pt-3">
                                <span className="text-[11px] font-semibold text-slate-100">
                                    {oddsLabel}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default PickListCard;
