import { Pick, PickLeg, Picks, SlipStatus } from "@/lib/interfaces/interfaces";
import { formatDateTime } from "@/lib/utils/date";
import { useIsMobile } from "@/lib/utils/helpers";
import { extractMatchup, extractPickLine } from "@/lib/utils/pickDescription";
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
    expandComboLegs?: boolean;
};

type ListItem = {
    id: string;
    description: string;
    odds: string | null;
    sourceTab?: string | null;
    pick?: Pick;
};

type DisplayLeg = {
    description: string;
    odds: string | null;
    selection?: PickLeg["selection"];
};

const formatOdds = (american?: number | string | null) => {
    const value = parseAmericanOdds(american);
    if (value === null) {
        if (typeof american === "string" && american.trim()) return american;
        return "—";
    }
    return value > 0 ? `+${value}` : `${value}`;
};

const META_SEPARATOR = " \u00b7 ";
const COMBO_PREFIX_PATTERN = /^combo:\s*/i;
const COMBO_LEG_SPLIT_PATTERN =
    /\s\+\s(?=[^+]*?(?:@|\bvs\.?\b|\bv\.?\b)[^+]*?(?:\s—\s|\s-\s))/i;

const resolveLegCategoryLabel = (market?: string) => {
    if (!market) return null;
    const upper = market.toUpperCase();
    if (
        upper.includes("MONEYLINE") ||
        upper.includes("POINT SPREAD") ||
        upper.includes("SPREAD") ||
        upper.includes("TOTAL")
    ) {
        return "game lines";
    }
    if (upper.includes("PASSING")) return "passing props";
    if (upper.includes("RECEIVING") || upper.includes("RECEPTION")) {
        return "receiving props";
    }
    if (upper.includes("RUSHING")) return "rushing props";
    if (upper.includes("TD")) return "td scorer props";
    return market.replace(/Player\s+/i, "Player ").toLowerCase();
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

const inferComboLegsFromDescription = (
    description: string,
    sourceTab?: string | null
): DisplayLeg[] => {
    const looksLikeCombo =
        sourceTab?.toLowerCase() === "combo" || COMBO_PREFIX_PATTERN.test(description);
    if (!looksLikeCombo) return [];

    const normalized = description.replace(COMBO_PREFIX_PATTERN, "").trim();
    if (!normalized) return [];

    const legs = normalized
        .split(COMBO_LEG_SPLIT_PATTERN)
        .map((part) => part.trim())
        .filter(Boolean);

    if (legs.length < 2) return [];

    return legs.map((leg) => ({
        description: leg,
        odds: null,
    }));
};

const resolveDisplayComboLegs = (item: ListItem): DisplayLeg[] => {
    if (item.pick?.legs?.length) {
        return item.pick.legs.map((leg) => ({
            description: leg.description,
            odds: leg.odds_bracket ?? null,
            selection: leg.selection,
        }));
    }
    return inferComboLegsFromDescription(item.description, item.sourceTab);
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
    expandComboLegs = false,
}: Props) => {
    const isMobile = useIsMobile();
    const listItems = (items ?? picks.map((pick) => ({
        id: pick.id,
        description: pick.description,
        odds: pick.odds_bracket ?? null,
        sourceTab: pick.source_tab ?? (pick.is_combo || pick.legs?.length ? "Combo" : "Pick"),
        pick,
    }))) as ListItem[];
    const comboOddsValue = comboOdds !== undefined
        ? parseAmericanOdds(comboOdds) ?? comboOdds
        : listItems.length === 1
            ? listItems[0]?.odds ?? null
            : combineParlayOdds(listItems);
    const comboLabel =
        comboOddsValue === null || comboOddsValue === undefined
            ? "—"
            : formatOdds(comboOddsValue);
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

    const comboLegsById = new Map(
        listItems.map((item) => [
            item.id,
            expandComboLegs ? resolveDisplayComboLegs(item) : [],
        ])
    );
    const matchupByGameId = new Map<string, string>();
    listItems.forEach((item) => {
        const itemGameId = item.pick?.selection?.gameId;
        const itemMatchup = extractMatchup(item.description, item.pick?.selection?.matchup);
        if (itemGameId && itemMatchup && !matchupByGameId.has(itemGameId)) {
            matchupByGameId.set(itemGameId, itemMatchup);
        }

        const comboLegs = comboLegsById.get(item.id) ?? [];
        comboLegs.forEach((leg) => {
            const legGameId = leg.selection?.gameId;
            const legMatchup = extractMatchup(leg.description, leg.selection?.matchup);
            if (legGameId && legMatchup && !matchupByGameId.has(legGameId)) {
                matchupByGameId.set(legGameId, legMatchup);
            }
        });
    });
    const showSummaryHeader = listItems.length > 1 && !expandComboLegs;

    return (
        <div className={`rounded-2xl border p-3 md:p-4 ${cardTone} ${className}`}>
            {showSummaryHeader && (
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

            <ul className={`${showSummaryHeader ? "mt-3" : "mt-1"} divide-y divide-white/10`}>
                {listItems.map((item) => {
                    const oddsLabel = formatOdds(item.odds);
                    const pickLine = extractPickLine(item.description);
                    const matchupLabel = extractMatchup(
                        item.description,
                        item.pick?.matchup ??
                        (item.pick?.selection?.gameId
                            ? matchupByGameId.get(item.pick.selection.gameId)
                            : null)
                    );
                    const matchupTag = isMobile && item.pick?.selection?.away_abbr && item.pick?.selection?.home_abbr
                        ? `${item.pick?.selection?.away_abbr} @ ${item.pick?.selection?.home_abbr}` : `${item.pick?.selection?.matchup}`
                    const timeLabel = formatDateTime(item.pick?.match_date);
                    const showTime = timeLabel !== "—";
                    const metaParts = [matchupTag, showTime ? timeLabel : null].filter(Boolean);
                    const metaLabel = metaParts.join(META_SEPARATOR);
                    const sourceTabLabel = item.sourceTab?.toLowerCase();
                    const canDelete = allowDelete && Boolean(item.pick);
                    const isWin = item.pick?.result ?? "pending";
                    const comboLegs = comboLegsById.get(item.id) ?? [];
                    const isComboItem =
                        Boolean(item.pick?.is_combo || item.pick?.legs?.length) || sourceTabLabel === "combo";
                    const showExpandedSingleItem =
                        expandComboLegs && !isComboItem && comboLegs.length === 0;
                    const expandedLegs = showExpandedSingleItem
                        ? [
                            {
                                description: item.description,
                                odds: item.odds,
                                selection: item.pick?.selection,
                            },
                        ]
                        : comboLegs;
                    const showExpandedComboItem = expandedLegs.length > 0;
                    const comboHeaderLabel =
                        showExpandedSingleItem
                            ? "single pick"
                            : sourceTabLabel === "combo"
                                ? "combo pick"
                                : (sourceTabLabel ?? "combo");

                    return (
                        <li
                            key={item.id}
                            className={
                                showExpandedComboItem
                                    ? "w-full space-y-3 py-3 first:pt-0 last:pb-0"
                                    : "flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                            }
                        >
                            {showExpandedComboItem ? (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => item.pick && onDeletePick?.(item.pick)}
                                                    className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                                    aria-label="Delete pick"
                                                    title="Delete pick"
                                                >
                                                    -
                                                </button>
                                            )}
                                            <div className="min-w-0">
                                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    {comboHeaderLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {!showExpandedSingleItem && (
                                            <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                                                {oddsLabel}
                                            </span>
                                        )}
                                    </div>

                                    <ul className="space-y-3">
                                        {expandedLegs.map((leg, index) => {
                                            const legPickLine = extractPickLine(leg.description);
                                            const legMatchup = extractMatchup(
                                                leg.description,
                                                leg.selection?.matchup ??
                                                (leg.selection?.gameId
                                                    ? matchupByGameId.get(leg.selection.gameId)
                                                    : null)
                                            );
                                            const legTime = formatDateTime(leg.selection?.gameStartTime);
                                            const legMeta = [legMatchup, legTime !== "—" ? legTime : null]
                                                .filter(Boolean)
                                                .join(META_SEPARATOR);
                                            const legCategory = resolveLegCategoryLabel(leg.selection?.market);
                                            const legOddsLabel = leg.odds ? formatOdds(leg.odds) : null;

                                            return (
                                                <li
                                                    key={`${item.id}-leg-${index}`}
                                                    className="flex items-start justify-between gap-3"
                                                >
                                                    <div className="min-w-0 flex items-start gap-2">
                                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                                                        <div className="min-w-0">
                                                            {legCategory && (
                                                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    {legCategory}
                                                                </span>
                                                            )}
                                                            <p className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200">
                                                                {legPickLine}
                                                            </p>
                                                            {legMeta && (
                                                                <p className="mt-1 text-[10px] text-slate-400">{legMeta}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {legOddsLabel && (
                                                        <div className="flex flex-col items-end gap-1 pt-2">
                                                            <span className="text-[11px] font-semibold text-slate-100">
                                                                {legOddsLabel}
                                                            </span>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <div className="min-w-0 flex items-center gap-2">
                                        {canDelete ? (
                                            <button
                                                type="button"
                                                onClick={() => item.pick && onDeletePick?.(item.pick)}
                                                className="mt-1 flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                                aria-label="Delete pick"
                                                title="Delete pick"
                                            >
                                                -
                                            </button>
                                        ) : (
                                            <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${isWin === "win" ? "bg-emerald-400" : isWin === "loss" ? "bg-red-400" : isWin === "not_found" ? "bg-amber-400" : "bg-cyan-300/80"}`} />
                                        )}
                                        <div className="min-w-0">
                                            {sourceTabLabel && (
                                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    {sourceTabLabel}
                                                </span>
                                            )}
                                            <p
                                                className={`min-w-0 text-[12px] font-semibold leading-snug ${isWin === "win" ? "text-emerald-400" : isWin === "loss" ? "text-red-400" : isWin === "not_found" ? "text-amber-400" : "text-cyan-200"}`}
                                                title={item.description}
                                            >
                                                {pickLine}
                                            </p>
                                            {metaLabel && (
                                                <p className="text-[10px] text-slate-400">{metaLabel}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 pt-3">
                                        <span className={`text-[11px] font-semibold ${isWin === "win" ? "text-emerald-400" : isWin === "loss" ? "text-red-400" : isWin === "not_found" ? "text-amber-400" : "text-slate-200"}`}>
                                            {oddsLabel}
                                        </span>
                                    </div>
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default PickListCard;
