// Market grouping and leg conversion for the contest entry builder.
//
// Ported from the MVP's ContestPickBuilder, with one substitution: the MVP reads
// a bundled catalog whose selections are already normalised, while here the
// selections come off a live OddsBlaze payload. `toParlayLeg` therefore delegates
// to the repo's own `normalizeOddToLeg` rather than re-deriving market families
// and time scopes by hand — the parlay validator keys off exactly those fields,
// and a hand-rolled leg would validate more weakly than every other builder's.

import type { OddsEvent, OddsOdd } from "@/lib/interfaces/interfaces";
import { normalizeOddToLeg, type ParlayLeg } from "@/lib/sgp/validateParlay";
import type { ContestOddsGame, ContestOddsSelection } from "@/lib/contests/feedContestOdds";
import type { FeedContestSport } from "@/lib/contests/feedContestCatalog";

export type SelectionWithGame = {
    game: ContestOddsGame;
    selection: ContestOddsSelection;
};

export type MarketSection = {
    key: string;
    label: string;
    markets: Array<{
        name: string;
        selections: SelectionWithGame[];
    }>;
};

export type MarketSectionKey = MarketSection["key"];

export type PreviewCell = {
    entry?: SelectionWithGame;
    lineLabel?: string;
};

export type MainLinePreview = {
    labels: readonly [string, string, string];
    rows: Array<readonly [PreviewCell, PreviewCell, PreviewCell]>;
};

export const formatOdds = (odds: number | null) => {
    if (odds === null) return "—";
    return odds > 0 ? `+${odds}` : `${odds}`;
};

export const formatLine = (line: number | null) => {
    if (line === null) return "";
    return line > 0 ? ` +${line}` : ` ${line}`;
};

export const formatLineValue = (line: number | null) => {
    if (line === null) return "—";
    return line > 0 ? `+${line}` : `${line}`;
};

export const formatTotalLineValue = (line: number | null) =>
    line === null ? "—" : `${line}`;

export const formatStart = (startsAt: string) =>
    new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(new Date(startsAt));

export const localDateKey = (value: string | number | Date) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

export const dateTabLabel = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return key;
    const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(date);
    return key === localDateKey(new Date()) ? `Today · ${label}` : label;
};

export const normalizeMarketName = (marketName: string) =>
    marketName.trim().toLowerCase().replace(/\s+/g, " ");

export const playerSelectionLabel = (entry: SelectionWithGame) =>
    entry.selection.playerName?.trim() ||
    entry.selection.selectionName
        .replace(/\s+(?:over|under)\s+[+-]?\d+(?:\.\d+)?$/i, "")
        .trim();

/* ----------------------------------------------------------------------------
 * Which tab a market belongs under, per sport.
 * -------------------------------------------------------------------------- */

const marketSectionFor = (
    sport: FeedContestSport,
    marketName: string,
    playerId: string | null
): Pick<MarketSection, "key" | "label"> => {
    if (!playerId) return { key: "game-lines", label: "Game lines" };

    const market = normalizeMarketName(marketName);
    if (sport === "NFL") {
        if (market.includes("passing")) return { key: "passing", label: "Passing" };
        if (market.includes("receiving")) return { key: "receiving", label: "Receiving" };
        if (market.includes("rushing")) return { key: "rushing", label: "Rushing" };
        if (market.includes("touchdown") || market.includes("scorer")) {
            return { key: "td-scorers", label: "TD scorers" };
        }
    }
    if (sport === "NBA" || sport === "NCAAB") {
        if (market.includes("points")) return { key: "player-points", label: "Player points" };
        if (market.includes("three")) return { key: "player-threes", label: "Player threes" };
        if (market.includes("rebound")) return { key: "player-rebounds", label: "Player rebounds" };
        if (market.includes("assist")) return { key: "player-assists", label: "Player assists" };
    }
    if (sport === "NHL") {
        if (market.includes("shot")) return { key: "shots-on-goal", label: "Shots on goal" };
        if (market.includes("goal")) return { key: "goalscorer", label: "Goalscorer" };
        if (market.includes("point")) return { key: "points", label: "Points" };
        if (market.includes("assist")) return { key: "assists", label: "Assists" };
    }
    if (sport === "MLB") {
        if (
            market.includes("strikeout") ||
            market.includes("outs") ||
            market.includes("earned runs") ||
            market.includes("walks allowed") ||
            market.includes("hits allowed")
        ) {
            return { key: "pitcher-props", label: "Pitcher props" };
        }
        return { key: "batter-props", label: "Batter props" };
    }

    return { key: "player-props", label: "Player props" };
};

const marketSectionOrder: Record<FeedContestSport, readonly string[]> = {
    NFL: ["game-lines", "passing", "receiving", "rushing", "td-scorers", "player-props"],
    NBA: [
        "game-lines",
        "player-points",
        "player-threes",
        "player-rebounds",
        "player-assists",
        "player-props",
    ],
    NCAAB: [
        "game-lines",
        "player-points",
        "player-threes",
        "player-rebounds",
        "player-assists",
        "player-props",
    ],
    NHL: ["game-lines", "goalscorer", "shots-on-goal", "points", "assists", "player-props"],
    MLB: ["game-lines", "batter-props", "pitcher-props", "player-props"],
    Soccer: ["game-lines", "player-props"],
};

export const groupMarkets = (
    selections: SelectionWithGame[],
    sport: FeedContestSport | null
): MarketSection[] => {
    const toMarkets = (entries: SelectionWithGame[]) => {
        const grouped = new Map<string, SelectionWithGame[]>();
        entries.forEach((entry) => {
            grouped.set(entry.selection.marketName, [
                ...(grouped.get(entry.selection.marketName) ?? []),
                entry,
            ]);
        });
        return Array.from(grouped, ([name, marketSelections]) => ({
            name,
            selections: marketSelections,
        })).sort((left, right) => left.name.localeCompare(right.name));
    };

    if (!sport) return [];
    const grouped = new Map<
        string,
        Pick<MarketSection, "key" | "label"> & { selections: SelectionWithGame[] }
    >();
    selections.forEach((entry) => {
        const descriptor = marketSectionFor(
            sport,
            entry.selection.marketName,
            entry.selection.playerId
        );
        const current = grouped.get(descriptor.key) ?? { ...descriptor, selections: [] };
        current.selections.push(entry);
        grouped.set(descriptor.key, current);
    });

    const order = marketSectionOrder[sport];
    return Array.from(grouped.values())
        .map(({ key, label, selections: entries }) => ({
            key,
            label,
            markets: toMarkets(entries),
        }))
        .sort((left, right) => {
            const leftIndex = order.indexOf(left.key);
            const rightIndex = order.indexOf(right.key);
            return (
                (leftIndex < 0 ? order.length : leftIndex) -
                (rightIndex < 0 ? order.length : rightIndex)
            );
        });
};

/* ----------------------------------------------------------------------------
 * The three-column main-line preview shown on every matchup row.
 * -------------------------------------------------------------------------- */

/** Every odd on this game that could stand in for one cell of the grid. */
const previewCandidates = (
    selections: SelectionWithGame[],
    marketNames: readonly string[],
    side: string
) =>
    selections.filter(
        ({ selection }) =>
            selection.playerId === null &&
            marketNames.includes(normalizeMarketName(selection.marketName)) &&
            (selection.side?.toLowerCase() === side ||
                (side === "draw" && normalizeMarketName(selection.selectionName) === "draw"))
    );

const lineOf = (entry: SelectionWithGame | undefined) =>
    typeof entry?.selection.line === "number" ? entry.selection.line : null;

/**
 * The MAIN line for one market and side — never merely the first odd that
 * matches it.
 *
 * OddsBlaze files alternates under the SAME market name (an alt spread is a
 * "Point Spread" odd with `main: false`) and does not order the main one first,
 * which is why every other builder in the repo tests the flag explicitly — see
 * NbaPickBuilder's `odd.market === "Point Spread" && !odd.main` alt bucket and
 * MlbPickBuilder's `if (!existing.odd.main && odd.main)` preference.
 *
 * Taking the first match was safe only while every board reaching here was
 * main-only. It no longer is: per-game enrichment deliberately returns FULL
 * boards — `main=false` on the targeted retry, no `main` filter at all on the
 * by-match-id route — and for a game the batch never priced that full board is
 * the ONLY board, so no main line sits in front of the alternates to mask this.
 *
 * `pairedLine` is the fallback for a board that flags no main at all: the two
 * rows of the grid are one line quoted from both sides, so the second is matched
 * to the first rather than resolved independently.
 */
const preferMainSelection = (
    candidates: SelectionWithGame[],
    pairedLine: number | null
) => {
    if (!candidates.length) return undefined;
    const main = candidates.find(({ selection }) => selection.main);
    if (main) return main;
    if (pairedLine !== null) {
        const paired = candidates.find(({ selection }) => selection.line === pairedLine);
        if (paired) return paired;
    }
    return candidates[0];
};

const findPreviewSelection = (
    selections: SelectionWithGame[],
    marketNames: readonly string[],
    side: string
) => preferMainSelection(previewCandidates(selections, marketNames, side), null);

/**
 * The two sides of ONE two-way market, resolved TOGETHER so the grid can never
 * show away -14.5 opposite home +2.5.
 *
 * `mirrored` is true for spreads/run lines/puck lines (away -3.5 pairs with home
 * +3.5) and false for totals (over 45.5 pairs with under 45.5).
 */
const findPreviewPair = (
    selections: SelectionWithGame[],
    marketNames: readonly string[],
    sides: readonly [string, string],
    mirrored: boolean
): readonly [SelectionWithGame | undefined, SelectionWithGame | undefined] => {
    const firstCandidates = previewCandidates(selections, marketNames, sides[0]);
    const secondCandidates = previewCandidates(selections, marketNames, sides[1]);
    const mirror = (line: number | null) => (line === null ? null : mirrored ? -line : line);
    // Anchored on whichever side actually flags a main line; a main on either
    // side wins outright inside `preferMainSelection`, so this only decides what
    // the OTHER side pairs against.
    const mainSecond = secondCandidates.find(({ selection }) => selection.main);
    const first = preferMainSelection(firstCandidates, mirror(lineOf(mainSecond)));
    const second = preferMainSelection(secondCandidates, mirror(lineOf(first)));
    return [first, second] as const;
};

export const getMainLinePreview = (
    game: ContestOddsGame,
    selections: SelectionWithGame[]
): MainLinePreview => {
    if (game.sport === "Soccer") {
        const marketNames = ["moneyline 3-way", "moneyline"];
        return {
            labels: ["Home", "Draw", "Away"],
            rows: [
                [
                    { entry: findPreviewSelection(selections, marketNames, "home") },
                    { entry: findPreviewSelection(selections, marketNames, "draw") },
                    { entry: findPreviewSelection(selections, marketNames, "away") },
                ],
            ],
        };
    }

    const lineMarketNames =
        game.sport === "MLB"
            ? ["run line"]
            : game.sport === "NHL"
              ? ["puck line"]
              : ["point spread"];
    const totalMarketNames =
        game.sport === "MLB"
            ? ["total runs"]
            : game.sport === "NHL"
              ? ["total goals"]
              : ["total points", "game total"];
    const lineLabel = game.sport === "MLB" ? "Run" : game.sport === "NHL" ? "Puck" : "Spread";
    const [awayLine, homeLine] = findPreviewPair(
        selections,
        lineMarketNames,
        ["away", "home"],
        true
    );
    const awayMoney = findPreviewSelection(selections, ["moneyline"], "away");
    const homeMoney = findPreviewSelection(selections, ["moneyline"], "home");
    const [over, under] = findPreviewPair(
        selections,
        totalMarketNames,
        ["over", "under"],
        false
    );

    return {
        labels: [lineLabel, "Money", "Total"],
        rows: [
            [
                {
                    entry: awayLine,
                    lineLabel: formatLineValue(awayLine?.selection.line ?? null),
                },
                { entry: awayMoney },
                {
                    entry: over,
                    lineLabel: over ? `O ${formatTotalLineValue(over.selection.line)}` : undefined,
                },
            ],
            [
                {
                    entry: homeLine,
                    lineLabel: formatLineValue(homeLine?.selection.line ?? null),
                },
                { entry: homeMoney },
                {
                    entry: under,
                    lineLabel: under
                        ? `U ${formatTotalLineValue(under.selection.line)}`
                        : undefined,
                },
            ],
        ],
    };
};

/* ----------------------------------------------------------------------------
 * Leg conversion.
 * -------------------------------------------------------------------------- */

/**
 * A pickable line as the parlay validator and the combo pricer understand it.
 *
 * `normalizeOddToLeg` is the repo's own OddsBlaze→ParlayLeg mapping, shared with
 * all six sport builders, and it derives the market family, outcome family, stat
 * type and time scope that `validateAddLeg` actually keys off. The casts bridge
 * two structurally identical models of the same payload (`OddsObject` vs
 * `OddsOdd` differ only in which fields they mark optional).
 *
 * Two fields are overwritten afterwards: `sport`, which the normalizer leaves
 * blank because the per-sport feeds never carry it, and `eventId`, which must be
 * the CONTEST's stored game id — the same string the entry endpoint compares
 * against `eligible_game_ids`, and the key the same-game rule counts by.
 */
export const toParlayLeg = ({ game, selection }: SelectionWithGame): ParlayLeg => {
    const event = game.event as unknown as OddsEvent;
    const leg = normalizeOddToLeg(event, selection.odd as unknown as OddsOdd);
    return {
        ...leg,
        sport: game.sport,
        eventId: game.id,
        matchup: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
        startTime: game.startsAt,
    };
};
