"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import dockStyles from "@/components/layout/BottomDock.module.css";
import {
    pickTableChipWidthClassName,
    tableOddsBoxClasses,
} from "@/components/pick-builder/contest/desktopSizing";
import {
    dateTabLabel,
    formatLine,
    formatOdds,
    formatStart,
    formatTotalLineValue,
    getMainLinePreview,
    groupMarkets,
    localDateKey,
    playerSelectionLabel,
    toParlayLeg,
    type MarketSectionKey,
    type PreviewCell,
    type SelectionWithGame,
} from "@/components/pick-builder/contest/contestSelections";
import {
    buildContestOddsGames,
    normalizeContestSport,
    selectionsForEvent,
    type ContestOddsGame,
} from "@/lib/contests/feedContestOdds";
import type { FeedContestSport } from "@/lib/contests/feedContestCatalog";
import { quoteSlipOdds } from "@/lib/sgp/comboPricing";
import { validateAddLeg } from "@/lib/sgp/validateParlay";
import type {
    FeedContestEntryLegPayload,
    FeedContestGameSnapshot,
    FeedContestOddsGroup,
} from "@/lib/interfaces/interfaces";

export type ContestPickBuilderRules = {
    minLegs: number;
    maxLegs: number;
    minimumCombinedOdds?: number | null;
    allowSameGameLegs: boolean;
};

export type ContestBuilderContext = {
    contestId: string;
    contestName?: string;
    /** `contest.eligible_games_json` — the frozen slate, and the kickoff authority. */
    slate: readonly FeedContestGameSnapshot[];
    /** The priced answer for that slate, from `state.feedContestOdds.groups`. */
    oddsGroups: readonly FeedContestOddsGroup[];
    /**
     * `contest.sports`, in the order the organizer declared them. It is what
     * orders the sport tab strip — deriving that order from the slate instead
     * would re-order the tabs every time a kickoff moved.
     */
    allowedSports?: readonly string[];
    locksAt: string;
    rules: ContestPickBuilderRules;
    rulesAcceptance?: {
        accepted: boolean;
        onAcceptedChange: (accepted: boolean) => void;
        label?: string;
    };
    /**
     * The legs already accepted, when this is a replacement. Matched back to the
     * live catalog by `external_pick_key`, which is the book's own selection id.
     */
    initialLegKeys?: readonly string[];
    initialLegLabels?: Readonly<Record<string, string>>;
    /** TRUE while the odds read is in flight — suppresses the empty-slate states. */
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    submitting?: boolean;
    submitLabel?: string;
    onSubmit: (legs: FeedContestEntryLegPayload[]) => void;
};

type Props = {
    context: ContestBuilderContext;
    initialSport?: string;
    onDismiss?: () => void;
    showDismissButton?: boolean;
    surface?: "page" | "drawer";
};

type DateOption = {
    key: string;
    label: string;
};

const nextTabIndex = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
    itemCount: number
) => {
    if (itemCount < 1) return null;
    if (event.key === "Home") return 0;
    if (event.key === "End") return itemCount - 1;
    if (event.key === "ArrowRight") return (currentIndex + 1) % itemCount;
    if (event.key === "ArrowLeft") return (currentIndex - 1 + itemCount) % itemCount;
    return null;
};

const focusTabAt = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    event.currentTarget
        .closest('[role="tablist"]')
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        .item(index)
        .focus();
};

/**
 * The leg exactly as `/enter` and `/replace-entry` take it.
 *
 * `game_id` is the contest's own stored id and never the priced feed's — the
 * server compares it against `eligible_game_ids` as a raw string. Nothing priced
 * is sent beyond each leg's own American odds: the combined price, the points
 * and the difficulty tier are all the server's to compute.
 */
const toLegPayload = ({ game, selection }: SelectionWithGame): FeedContestEntryLegPayload => ({
    game_id: game.id,
    external_pick_key: selection.id,
    american_odds: selection.americanOdds,
    description: `${game.awayTeam.name} @ ${game.homeTeam.name} — ${selection.selectionName}`,
    match_date: game.startsAt,
    market: selection.marketName,
    side: selection.side,
    threshold: selection.line,
    scope: selection.playerId ? "PLAYER_PROP" : "GAME_LINE",
    player_id: selection.playerId,
    sport: game.sport,
    matchup: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
});

export const ContestPickBuilder = ({
    context,
    initialSport: requestedInitialSport,
    onDismiss,
    showDismissButton = true,
    surface = "page",
}: Props) => {
    const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

    const games = useMemo(
        () =>
            buildContestOddsGames(context.slate, context.oddsGroups).filter(
                (game) => !game.live && Date.parse(game.startsAt) > Date.now()
            ),
        [context.slate, context.oddsGroups]
    );
    const selectable = useMemo(
        () =>
            games.flatMap((game) =>
                selectionsForEvent(game).map((selection) => ({ game, selection }))
            ),
        [games]
    );
    const sortedGames = useMemo(
        () =>
            games.slice().sort((left, right) => {
                const start = left.startsAt.localeCompare(right.startsAt);
                if (start !== 0) return start;
                const sport = left.sport.localeCompare(right.sport);
                return sport !== 0 ? sport : left.id.localeCompare(right.id);
            }),
        [games]
    );
    // The contest's own sport order wins, exactly as the MVP's `allowedSports`
    // does; a sport the slate does not actually cover is dropped, and anything
    // the slate carries that the contest never declared is appended rather than
    // hidden.
    const sportsWithGames = useMemo(() => {
        const present = new Set(sortedGames.map((game) => game.sport));
        const declared = (context.allowedSports ?? [])
            .map((sport) => normalizeContestSport(String(sport)))
            .filter((sport): sport is FeedContestSport => sport !== null)
            .filter((sport) => present.has(sport));
        const seen = new Set(declared);
        return [
            ...declared,
            ...[...present].filter((sport) => !seen.has(sport)),
        ];
    }, [context.allowedSports, sortedGames]);
    const dateOptions = useMemo<DateOption[]>(
        () =>
            Array.from(new Set(sortedGames.map((game) => localDateKey(game.startsAt))))
                .filter(Boolean)
                .sort()
                .map((key) => ({ key, label: dateTabLabel(key) })),
        [sortedGames]
    );

    // Seeded EMPTY, unlike the MVP, which reads a synchronous catalog at mount.
    // The active date and sport are coerced at render time from whatever is
    // available, so the first slate to land selects itself with no effect and no
    // flash of an empty panel.
    const [requestedDateKey, setRequestedDateKey] = useState("");
    const [requestedSport, setRequestedSport] = useState<FeedContestSport | null>(null);

    const activeDateKey = dateOptions.some((option) => option.key === requestedDateKey)
        ? requestedDateKey
        : (dateOptions[0]?.key ?? "");
    const sportsOnActiveDate = useMemo(
        () =>
            sportsWithGames.filter((sport) =>
                sortedGames.some(
                    (game) =>
                        game.sport === sport && localDateKey(game.startsAt) === activeDateKey
                )
            ),
        [activeDateKey, sortedGames, sportsWithGames]
    );
    const preferredSport =
        requestedSport ??
        (requestedInitialSport as FeedContestSport | undefined) ??
        null;
    const activeSport =
        preferredSport && sportsOnActiveDate.includes(preferredSport)
            ? preferredSport
            : (sportsOnActiveDate[0] ?? null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [seededFromInitial, setSeededFromInitial] = useState(false);

    // A replacement starts from the legs already accepted. Seeded ONCE, after
    // the catalog lands — before that every accepted leg would look unavailable.
    //
    // The flag is set as soon as the catalog is readable, even when there are no
    // accepted legs to seed. Gating it on `initialLegKeys.length` instead would
    // leave it false for a first-time entrant, and the entries refetch fired by a
    // successful submit would then arrive with their accepted legs and overwrite
    // whatever they had started building for a replacement.
    useEffect(() => {
        if (seededFromInitial) return;
        if (context.loading) return;
        if (!selectable.length) return;
        const live = new Set(selectable.map(({ selection }) => selection.id));
        const accepted = (context.initialLegKeys ?? []).filter((key) => live.has(key));
        if (accepted.length) setSelectedIds(accepted);
        setSeededFromInitial(true);
    }, [context.initialLegKeys, context.loading, seededFromInitial, selectable]);

    const outstandingUnavailableLegs = useMemo(() => {
        // Computed against an empty catalog this marks EVERY accepted leg
        // unavailable and hard-blocks the submit button, so it waits for the read.
        if (context.loading || !context.initialLegKeys?.length || !selectable.length) return [];
        const live = new Set(selectable.map(({ selection }) => selection.id));
        return context.initialLegKeys
            .filter((key) => !live.has(key))
            .map((key) => ({ key, label: context.initialLegLabels?.[key] ?? key }));
    }, [context.initialLegKeys, context.initialLegLabels, context.loading, selectable]);

    const [removedUnavailableLegKeys, setRemovedUnavailableLegKeys] = useState<string[]>([]);
    const remainingUnavailableLegs = outstandingUnavailableLegs.filter(
        (leg) => !removedUnavailableLegKeys.includes(leg.key)
    );

    const [selectionError, setSelectionError] = useState<string | null>(null);
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [requestedMarketSection, setRequestedMarketSection] =
        useState<MarketSectionKey>("game-lines");
    const [reviewOpen, setReviewOpen] = useState(false);
    const [, forceLockBoundaryRender] = useState(0);

    // Re-renders the moment the contest locks, so an open builder disables itself
    // rather than accepting an entry the server will refuse.
    useEffect(() => {
        const lockTime = Date.parse(context.locksAt);
        if (!Number.isFinite(lockTime) || lockTime <= Date.now()) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const schedule = () => {
            const remaining = lockTime - Date.now();
            if (remaining <= 0) {
                forceLockBoundaryRender((value) => value + 1);
                return;
            }
            timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
        };
        schedule();
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [context.locksAt]);

    const selected = useMemo(
        () =>
            selectedIds
                .map((id) => selectable.find(({ selection }) => selection.id === id))
                .filter((entry): entry is SelectionWithGame => Boolean(entry)),
        [selectable, selectedIds]
    );

    // The bottom tab bar collapses while a builder holds a selection.
    useEffect(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent("pick-builder-selection", {
                detail: { active: selected.length > 0 },
            })
        );
    }, [selected.length]);

    useEffect(
        () => () => {
            if (typeof window === "undefined") return;
            window.dispatchEvent(
                new CustomEvent("pick-builder-selection", { detail: { active: false } })
            );
        },
        []
    );

    useEffect(() => {
        if (!reviewOpen) return;
        const handleEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") setReviewOpen(false);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [reviewOpen]);

    const parlayLegs = useMemo(() => selected.map(toParlayLeg), [selected]);
    const quote = useMemo(() => quoteSlipOdds(parlayLegs), [parlayLegs]);
    const combinedOdds = quote.americanOdds;
    const lockedAt = Date.parse(context.locksAt);
    const locked = Number.isFinite(lockedAt) && Date.now() >= lockedAt;
    const minimumOdds = context.rules.minimumCombinedOdds ?? null;
    const countValid =
        selected.length >= context.rules.minLegs && selected.length <= context.rules.maxLegs;
    // Compared in DECIMAL space, exactly as the server does: American odds are
    // not ordered on the number line, so `-200 >= +300` would pass numerically.
    const oddsValid =
        combinedOdds !== null &&
        (minimumOdds === null ||
            minimumOdds <= 0 ||
            (combinedOdds > 0 ? 1 + combinedOdds / 100 : 1 + 100 / -combinedOdds) >=
                1 + minimumOdds / 100);
    const pricingValid = quote.pricing.canBuildCombo && !quote.pricing.hasInvalidComboLegs;
    const canReview =
        !locked &&
        remainingUnavailableLegs.length === 0 &&
        countValid &&
        oddsValid &&
        pricingValid;
    const rulesAccepted = context.rulesAcceptance?.accepted ?? true;
    const canSubmit = canReview && rulesAccepted && !context.submitting;

    const validationMessage = (() => {
        if (locked) return "Entries are locked for this contest.";
        if (remainingUnavailableLegs.length > 0) {
            return "Remove each unavailable accepted leg before replacing this entry.";
        }
        if (selected.length < context.rules.minLegs) {
            const remaining = context.rules.minLegs - selected.length;
            return `Add ${remaining} more leg${remaining === 1 ? "" : "s"} to continue.`;
        }
        if (selected.length > context.rules.maxLegs) {
            return `Use no more than ${context.rules.maxLegs} legs.`;
        }
        if (!pricingValid) {
            return quote.pricing.invalidComboReasons[0] ?? "Those selections cannot be combined.";
        }
        if (combinedOdds === null) return "Combined odds are unavailable for this entry.";
        if (!oddsValid && minimumOdds !== null) {
            return `Combined odds must be at least ${formatOdds(minimumOdds)}.`;
        }
        return null;
    })();

    const toggleSelection = (entry: SelectionWithGame) => {
        if (locked) return;
        setSelectionError(null);
        const alreadySelected = selectedIds.includes(entry.selection.id);
        if (alreadySelected) {
            setSelectedIds((current) => current.filter((id) => id !== entry.selection.id));
            return;
        }
        if (selected.length >= context.rules.maxLegs) {
            setSelectionError(`This contest allows up to ${context.rules.maxLegs} legs.`);
            return;
        }
        if (
            !context.rules.allowSameGameLegs &&
            selected.some(({ game }) => game.id === entry.game.id)
        ) {
            setSelectionError("This contest allows only one selection from each game.");
            return;
        }
        const candidate = toParlayLeg(entry);
        const validation = validateAddLeg(parlayLegs, candidate);
        if (!validation.ok) {
            setSelectionError(validation.reason);
            return;
        }
        setSelectedIds((current) => [...current, entry.selection.id]);
    };

    const submit = () => {
        if (!canSubmit || combinedOdds === null) return;
        context.onSubmit(selected.map(toLegPayload));
    };

    const chooseDate = (dateKey: string) => {
        const nextSports = sportsWithGames.filter((sport) =>
            sortedGames.some(
                (game) => game.sport === sport && localDateKey(game.startsAt) === dateKey
            )
        );
        setRequestedDateKey(dateKey);
        setRequestedSport((current) =>
            current && nextSports.includes(current) ? current : (nextSports[0] ?? null)
        );
        setActiveGameId(null);
        setRequestedMarketSection("game-lines");
        setSelectionError(null);
    };

    const chooseSport = (sport: FeedContestSport) => {
        setRequestedSport(sport);
        setActiveGameId(null);
        setRequestedMarketSection("game-lines");
        setSelectionError(null);
    };

    const handleDateTabKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        dateKey: string
    ) => {
        const currentIndex = dateOptions.findIndex((option) => option.key === dateKey);
        const nextIndex = nextTabIndex(event, currentIndex, dateOptions.length);
        if (nextIndex === null) return;
        event.preventDefault();
        const nextDate = dateOptions[nextIndex];
        if (!nextDate) return;
        chooseDate(nextDate.key);
        focusTabAt(event, nextIndex);
    };

    const handleSportTabKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        sport: FeedContestSport
    ) => {
        const currentIndex = sportsOnActiveDate.indexOf(sport);
        const nextIndex = nextTabIndex(event, currentIndex, sportsOnActiveDate.length);
        if (nextIndex === null) return;
        event.preventDefault();
        const nextSport = sportsOnActiveDate[nextIndex];
        if (!nextSport) return;
        chooseSport(nextSport);
        focusTabAt(event, nextIndex);
    };

    const visibleGames = sortedGames.filter(
        (game) => game.sport === activeSport && localDateKey(game.startsAt) === activeDateKey
    );
    const activeGame: ContestOddsGame | null =
        sortedGames.find((game) => game.id === activeGameId) ?? null;
    const activeSelections = activeGame
        ? selectable.filter((entry) => entry.game.id === activeGame.id)
        : [];
    const marketSections = groupMarkets(activeSelections, activeGame?.sport ?? null);
    const activeMarketSection =
        marketSections.find((section) => section.key === requestedMarketSection) ??
        marketSections[0] ??
        null;
    const mainLinePreview = activeGame
        ? getMainLinePreview(activeGame, activeSelections)
        : null;
    const mainLineSelectionIds = new Set(
        mainLinePreview?.rows.flatMap((row) =>
            row.flatMap((cell) => cell.entry?.selection.id ?? [])
        ) ?? []
    );
    const activeMarkets =
        activeMarketSection?.markets
            .map((market) => ({
                ...market,
                selections:
                    activeMarketSection.key === "game-lines"
                        ? market.selections.filter(
                              (entry) => !mainLineSelectionIds.has(entry.selection.id)
                          )
                        : market.selections,
            }))
            .filter((market) => market.selections.length > 0) ?? [];
    const datePanelId = `${instanceId}-contest-matchups`;
    const marketPanelId = `${instanceId}-contest-market-panel`;
    const rulesAcceptanceMessage = rulesAccepted
        ? null
        : "Accept the contest rules to join and submit this entry.";
    const actionMessage = selectionError ?? validationMessage ?? rulesAcceptanceMessage;

    const renderSelectionChip = ({
        entry,
        lineLabel,
        preview = false,
    }: PreviewCell & { preview?: boolean }) => {
        const isSelected = entry ? selectedIds.includes(entry.selection.id) : false;
        const isDisabled = locked || !entry;
        const oddsLabel = entry ? formatOdds(entry.selection.americanOdds) : "—";
        return (
            <button
                type="button"
                data-contest-selection-id={!preview && entry ? entry.selection.id : undefined}
                data-contest-selection-preview-id={
                    preview && entry ? entry.selection.id : undefined
                }
                aria-label={
                    entry
                        ? `${isSelected ? "Remove" : "Select"} ${entry.selection.selectionName}, ${entry.selection.marketName}, ${oddsLabel}`
                        : "Market unavailable"
                }
                aria-pressed={entry ? isSelected : undefined}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                onClick={(event) => {
                    event.stopPropagation();
                    if (!entry || isDisabled) return;
                    toggleSelection(entry);
                    setReviewOpen(false);
                }}
                className={`flex min-h-[48px] w-full items-center justify-center bg-transparent p-0 text-left ${
                    isDisabled ? "cursor-not-allowed" : ""
                }`}
            >
                <span className={tableOddsBoxClasses(isSelected, !entry)}>
                    {lineLabel ? (
                        <span className="flex flex-col items-center leading-tight">
                            <span
                                className={`whitespace-nowrap text-[10px] sm:text-xs ${
                                    entry ? "text-white" : "text-gray-500"
                                }`}
                            >
                                {lineLabel}
                            </span>
                            <span
                                className={`whitespace-nowrap text-[10px] sm:text-xs ${
                                    entry ? "text-sky-100" : "text-gray-500"
                                }`}
                            >
                                {oddsLabel}
                            </span>
                        </span>
                    ) : (
                        oddsLabel
                    )}
                </span>
            </button>
        );
    };

    return (
        <div
            data-pick-builder-surface={surface}
            data-pick-builder-mode="contest"
            className={`space-y-4 ${activeGame ? "matchup-detail" : ""} ${dockStyles.activeBuilderContentClearance}`}
        >
            <div
                className={`sticky ${
                    surface === "drawer" ? "top-0" : "top-[var(--app-header-height)]"
                } z-20 -mx-5 bg-gradient-to-b from-black to-black/60 px-5 py-3 sm:-mx-6 sm:px-6`}
            >
                {onDismiss && showDismissButton ? (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-gray-200 transition hover:border-white/30"
                        >
                            Close
                        </button>
                    </div>
                ) : null}
                <div
                    role="tablist"
                    aria-label="Game dates"
                    className={`${
                        onDismiss && showDismissButton ? "mt-3" : ""
                    } scrollbar-hide flex gap-3 overflow-x-auto pb-1`}
                >
                    {dateOptions.map((option) => (
                        <button
                            key={option.key}
                            id={`${instanceId}-date-${option.key}`}
                            type="button"
                            role="tab"
                            aria-selected={activeDateKey === option.key}
                            aria-controls={datePanelId}
                            tabIndex={activeDateKey === option.key ? 0 : -1}
                            onClick={() => chooseDate(option.key)}
                            onKeyDown={(event) => handleDateTabKeyDown(event, option.key)}
                            className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition sm:text-sm ${
                                activeDateKey === option.key
                                    ? "border-sky-300 text-white"
                                    : "border-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div
                    role="tablist"
                    aria-label="Eligible sports"
                    className="mt-2 flex w-full gap-3 overflow-x-auto pb-1"
                >
                    {sportsOnActiveDate.map((sport) => (
                        <button
                            key={sport}
                            id={`${instanceId}-sport-${sport.toLowerCase()}`}
                            type="button"
                            role="tab"
                            aria-selected={activeSport === sport}
                            aria-controls={datePanelId}
                            tabIndex={activeSport === sport ? 0 : -1}
                            onClick={() => chooseSport(sport)}
                            onKeyDown={(event) => handleSportTabKeyDown(event, sport)}
                            className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition sm:text-sm ${
                                activeSport === sport
                                    ? "border-sky-300 text-white"
                                    : "border-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            {sport}
                        </button>
                    ))}
                </div>
            </div>

            {remainingUnavailableLegs.length > 0 ? (
                <section
                    aria-label="Unavailable accepted legs"
                    className="-mx-5 border-y border-amber-300/20 bg-amber-300/5 px-5 py-4 sm:-mx-6 sm:px-6"
                >
                    <p className="text-sm font-semibold text-amber-100">
                        Accepted market no longer available
                    </p>
                    <p className="mt-1 text-xs text-amber-100/70">
                        These legs stay read-only. Remove them explicitly before submitting a
                        complete replacement.
                    </p>
                    <div className="mt-3 space-y-2">
                        {remainingUnavailableLegs.map((leg) => (
                            <div
                                key={leg.key}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2"
                            >
                                <span className="min-w-0 truncate text-xs text-white">
                                    {leg.label}
                                </span>
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() =>
                                        setRemovedUnavailableLegKeys((current) => [
                                            ...current,
                                            leg.key,
                                        ])
                                    }
                                    className="shrink-0 text-xs font-semibold text-amber-100 disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {context.loading ? (
                <div
                    role="status"
                    className="-mx-5 border-y border-white/10 px-5 py-6 sm:-mx-6 sm:px-6"
                >
                    <p className="text-sm font-semibold text-white">Loading contest lines…</p>
                    <p className="mt-1 text-xs text-gray-400">
                        Reading the odds for this contest&apos;s games.
                    </p>
                </div>
            ) : null}

            {!context.loading && context.error ? (
                <div
                    role="alert"
                    className="-mx-5 border-y border-rose-300/20 bg-rose-500/5 px-5 py-6 sm:-mx-6 sm:px-6"
                >
                    <p className="text-sm font-semibold text-rose-100">{context.error}</p>
                    {context.onRetry ? (
                        <button
                            type="button"
                            onClick={context.onRetry}
                            className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/30"
                        >
                            Try again
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!context.loading && !context.error && games.length === 0 ? (
                <div className="-mx-5 border-y border-white/10 px-5 py-6 sm:-mx-6 sm:px-6">
                    <p className="text-sm font-semibold text-amber-100">
                        No eligible markets available
                    </p>
                    <p className="mt-1 text-xs text-amber-100/70">
                        The contest slate does not match an available pregame market.
                    </p>
                </div>
            ) : null}

            {games.length > 0 && !activeGame ? (
                <section
                    id={datePanelId}
                    role="tabpanel"
                    aria-label={`${activeSport ?? "Contest"} matchups`}
                    className="grid gap-6 outline-none"
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <h4 className="text-sm font-semibold text-white">choose a matchup</h4>
                            <span className="text-xs uppercase tracking-wide text-gray-400">
                                game lines + props
                            </span>
                        </div>
                        <div
                            data-contest-matchup-list
                            className="pick-builder-game-list -mx-5 max-h-[640px] divide-y divide-white/10 overflow-y-auto scrollbar-hide sm:mx-0"
                        >
                            {visibleGames.map((game) => {
                                const matchup = `${game.awayTeam.name} at ${game.homeTeam.name}`;
                                const gameSelections = selectable.filter(
                                    (entry) => entry.game.id === game.id
                                );
                                const preview = getMainLinePreview(game, gameSelections);
                                const rowDisabled = locked;
                                return (
                                    <div
                                        key={game.id}
                                        role="button"
                                        tabIndex={rowDisabled ? -1 : 0}
                                        data-contest-matchup-id={game.id}
                                        aria-disabled={rowDisabled}
                                        aria-label={`Open ${matchup}, ${game.competition}, ${formatStart(game.startsAt)}`}
                                        onClick={() => {
                                            if (rowDisabled) return;
                                            setActiveGameId(game.id);
                                            setRequestedMarketSection("game-lines");
                                            setSelectionError(null);
                                        }}
                                        onKeyDown={(event) => {
                                            if (
                                                rowDisabled ||
                                                (event.key !== "Enter" && event.key !== " ")
                                            ) {
                                                return;
                                            }
                                            event.preventDefault();
                                            setActiveGameId(game.id);
                                            setRequestedMarketSection("game-lines");
                                            setSelectionError(null);
                                        }}
                                        className={`grid w-full items-start gap-3 px-5 py-4 text-left transition grid-cols-[minmax(0,1fr)_200px] sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-4 sm:px-6 ${
                                            rowDisabled
                                                ? "cursor-not-allowed opacity-60"
                                                : "cursor-pointer hover:bg-white/[0.02]"
                                        }`}
                                    >
                                        <div className="min-w-0 self-start pt-8">
                                            <p className="text-xs font-semibold leading-snug text-white">
                                                <span className="block truncate">
                                                    {game.awayTeam.name} @
                                                </span>
                                                <span className="block truncate">
                                                    {game.homeTeam.name}
                                                </span>
                                            </p>
                                            <p className="mt-3 text-[11px] text-gray-400">
                                                {formatStart(game.startsAt)}
                                            </p>
                                            {gameSelections.length === 0 ? (
                                                <p className="mt-2 text-[11px] font-semibold text-amber-100">
                                                    Markets not posted yet
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className="flex w-full flex-col items-end justify-between gap-2">
                                            <div
                                                className={`w-fit space-y-2 text-xs text-white ${pickTableChipWidthClassName}`}
                                            >
                                                <div
                                                    className="grid justify-end gap-1 text-[10px] uppercase tracking-wide text-gray-500"
                                                    style={{
                                                        gridTemplateColumns:
                                                            "repeat(3, var(--table-chip-width))",
                                                    }}
                                                >
                                                    {preview.labels.map((label) => (
                                                        <span
                                                            key={`${game.id}-${label}`}
                                                            className="text-center"
                                                        >
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                                {preview.rows.map((row, rowIndex) => (
                                                    <div
                                                        key={`${game.id}-preview-row-${rowIndex}`}
                                                        className={`grid justify-end gap-1 ${
                                                            rowIndex > 0 ? "-mt-3 sm:mt-0" : ""
                                                        }`}
                                                        style={{
                                                            gridTemplateColumns:
                                                                "repeat(3, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        {row.map((cell, cellIndex) => (
                                                            <span
                                                                key={`${game.id}-preview-${rowIndex}-${cellIndex}`}
                                                            >
                                                                {renderSelectionChip({
                                                                    ...cell,
                                                                    preview: true,
                                                                })}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500">→</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {visibleGames.length === 0 ? (
                        <div
                            role="status"
                            className="-mx-5 border-y border-white/10 px-5 py-6 text-center sm:-mx-6 sm:px-6"
                        >
                            <p className="text-sm font-semibold text-white">
                                No matchups for these filters
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Choose another date or sport from the slate.
                            </p>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {activeGame ? (
                <section
                    aria-label={`${activeGame.awayTeam.name} at ${activeGame.homeTeam.name} markets`}
                    className="space-y-4"
                >
                    <div className="-mx-5 px-5 sm:-mx-6 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveGameId(null);
                                    setRequestedMarketSection("game-lines");
                                    setSelectionError(null);
                                }}
                                className="text-xs font-semibold lowercase text-gray-200 transition hover:text-white"
                            >
                                &larr; back to all matchups
                            </button>
                            <p className="text-xs text-gray-500">{activeGame.competition}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-white">
                                    {activeGame.awayTeam.name} at {activeGame.homeTeam.name}
                                </h2>
                                <time
                                    dateTime={activeGame.startsAt}
                                    className="mt-1 block text-xs text-gray-400"
                                >
                                    {formatStart(activeGame.startsAt)}
                                </time>
                            </div>
                        </div>
                        <div
                            role="tablist"
                            aria-label="Market categories"
                            className="scrollbar-hide -mx-5 mt-4 flex gap-3 overflow-x-auto border-b border-white/10 px-5 pb-2 sm:mx-0 sm:px-0"
                        >
                            {marketSections.map((section, index) => {
                                const isActive = activeMarketSection?.key === section.key;
                                return (
                                    <button
                                        key={section.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        aria-controls={marketPanelId}
                                        tabIndex={isActive ? 0 : -1}
                                        onClick={() => setRequestedMarketSection(section.key)}
                                        onKeyDown={(event) => {
                                            const nextIndex = nextTabIndex(
                                                event,
                                                index,
                                                marketSections.length
                                            );
                                            if (nextIndex === null) return;
                                            event.preventDefault();
                                            const nextSection = marketSections[nextIndex];
                                            if (!nextSection) return;
                                            setRequestedMarketSection(nextSection.key);
                                            focusTabAt(event, nextIndex);
                                        }}
                                        className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition ${
                                            isActive
                                                ? "border-sky-300 text-sky-100"
                                                : "border-transparent text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeMarketSection ? (
                        <div
                            id={marketPanelId}
                            role="tabpanel"
                            aria-label={activeMarketSection.label}
                            data-contest-market-list
                            className="-mx-5 divide-y divide-white/10 sm:mx-0"
                        >
                            {activeMarketSection.key === "game-lines" &&
                            mainLinePreview &&
                            mainLineSelectionIds.size > 0 ? (
                                <section
                                    data-contest-market="Game lines"
                                    className="px-5 pb-6 pt-3 sm:px-6"
                                >
                                    <h3 className="text-sm font-semibold text-white">Game Lines</h3>
                                    {activeGame.sport === "Soccer" ? (
                                        <div
                                            className={`mt-4 w-fit space-y-2 text-xs text-white ${pickTableChipWidthClassName}`}
                                        >
                                            <div
                                                className="grid gap-1 text-[10px] uppercase tracking-wide text-gray-500"
                                                style={{
                                                    gridTemplateColumns:
                                                        "repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                {mainLinePreview.labels.map((label) => (
                                                    <span
                                                        key={`detail-${label}`}
                                                        className="text-center"
                                                    >
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                            {mainLinePreview.rows.map((row, rowIndex) => (
                                                <div
                                                    key={`detail-preview-${rowIndex}`}
                                                    className="grid gap-1"
                                                    style={{
                                                        gridTemplateColumns:
                                                            "repeat(3, var(--table-chip-width))",
                                                    }}
                                                >
                                                    {row.map((cell, cellIndex) => (
                                                        <span
                                                            key={`detail-preview-${rowIndex}-${cellIndex}`}
                                                        >
                                                            {renderSelectionChip(cell)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            className={`mt-4 space-y-0 ${pickTableChipWidthClassName}`}
                                        >
                                            <div
                                                className="grid items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 sm:gap-2"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                }}
                                            >
                                                <span className="px-3">Team</span>
                                                {mainLinePreview.labels.map((label) => (
                                                    <span
                                                        key={`detail-${label}`}
                                                        className="text-center"
                                                    >
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                            {mainLinePreview.rows.map((row, rowIndex) => {
                                                const team =
                                                    rowIndex === 0
                                                        ? activeGame.awayTeam
                                                        : activeGame.homeTeam;
                                                return (
                                                    <div
                                                        key={`detail-preview-${rowIndex}`}
                                                        className={`grid items-stretch gap-1 sm:gap-2 ${
                                                            rowIndex > 0 ? "-mt-4 sm:mt-0" : ""
                                                        }`}
                                                        style={{
                                                            gridTemplateColumns:
                                                                "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                                        }}
                                                    >
                                                        <div className="flex min-h-[52px] min-w-0 items-center px-3">
                                                            <p className="truncate text-sm font-semibold text-white">
                                                                {team.name}
                                                            </p>
                                                        </div>
                                                        {row.map((cell, cellIndex) => (
                                                            <span
                                                                key={`detail-preview-${rowIndex}-${cellIndex}`}
                                                            >
                                                                {renderSelectionChip(cell)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            ) : null}

                            {activeMarkets.map((market) => {
                                const isPlayerMarket = market.selections.some(
                                    (entry) => entry.selection.playerId !== null
                                );
                                if (isPlayerMarket) {
                                    const playerRows = new Map<
                                        string,
                                        {
                                            label: string;
                                            over?: SelectionWithGame;
                                            under?: SelectionWithGame;
                                            pick?: SelectionWithGame;
                                        }
                                    >();
                                    market.selections.forEach((entry) => {
                                        const key = entry.selection.playerId ?? entry.selection.id;
                                        const row = playerRows.get(key) ?? {
                                            label: playerSelectionLabel(entry),
                                        };
                                        const side = entry.selection.side?.toLowerCase();
                                        if (side === "over") row.over = entry;
                                        else if (side === "under") row.under = entry;
                                        else row.pick = entry;
                                        playerRows.set(key, row);
                                    });
                                    const rows = Array.from(playerRows.entries());
                                    const columns = [
                                        rows.some(([, row]) => row.over)
                                            ? { key: "over" as const, label: "Over" }
                                            : null,
                                        rows.some(([, row]) => row.under)
                                            ? { key: "under" as const, label: "Under" }
                                            : null,
                                        rows.some(([, row]) => row.pick)
                                            ? { key: "pick" as const, label: "Pick" }
                                            : null,
                                    ].filter(
                                        (
                                            column
                                        ): column is {
                                            key: "over" | "under" | "pick";
                                            label: string;
                                        } => column !== null
                                    );
                                    const gridTemplateColumns = `minmax(0,1fr) repeat(${columns.length}, var(--table-chip-width))`;
                                    return (
                                        <section
                                            key={market.name}
                                            data-contest-market={market.name}
                                            aria-label={market.name}
                                            className="px-5 py-6 sm:px-6"
                                        >
                                            <h3 className="text-sm font-semibold text-white">
                                                {market.name}
                                            </h3>
                                            <div
                                                className={`mt-4 text-xs text-white ${pickTableChipWidthClassName}`}
                                            >
                                                <div
                                                    className="grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                    style={{ gridTemplateColumns }}
                                                >
                                                    <span className="py-2 pr-3">Player</span>
                                                    {columns.map((column) => (
                                                        <span
                                                            key={column.key}
                                                            className="py-2 text-center"
                                                        >
                                                            {column.label}
                                                        </span>
                                                    ))}
                                                </div>
                                                {rows.map(([key, row], rowIndex) => (
                                                    <div
                                                        key={key}
                                                        className={`grid items-center gap-2 border-b border-white/5 ${
                                                            rowIndex % 2 === 1
                                                                ? "bg-white/[0.02]"
                                                                : "bg-transparent"
                                                        }`}
                                                        style={{ gridTemplateColumns }}
                                                    >
                                                        <p className="truncate py-2.5 pr-3 text-sm font-semibold text-white">
                                                            {row.label}
                                                        </p>
                                                        {columns.map((column) => {
                                                            const entry = row[column.key];
                                                            const sideLabel =
                                                                column.key === "over"
                                                                    ? "O"
                                                                    : column.key === "under"
                                                                      ? "U"
                                                                      : undefined;
                                                            const lineLabel =
                                                                entry && sideLabel
                                                                    ? `${sideLabel} ${formatTotalLineValue(entry.selection.line)}`
                                                                    : undefined;
                                                            return (
                                                                <span key={`${key}-${column.key}`}>
                                                                    {renderSelectionChip({
                                                                        entry,
                                                                        lineLabel,
                                                                    })}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    );
                                }

                                return (
                                    <section
                                        key={market.name}
                                        data-contest-market={market.name}
                                        aria-label={market.name}
                                        className="px-5 py-6 sm:px-6"
                                    >
                                        <h3 className="text-sm font-semibold text-white">
                                            {market.name}
                                        </h3>
                                        <div
                                            className={`mt-4 text-xs text-white ${pickTableChipWidthClassName}`}
                                        >
                                            <div
                                                className="grid gap-2 border-b border-white/10 text-xs uppercase tracking-wide text-gray-400"
                                                style={{
                                                    gridTemplateColumns:
                                                        "minmax(0,1fr) var(--table-chip-width)",
                                                }}
                                            >
                                                <span className="py-2 pr-3">Selection</span>
                                                <span className="py-2 text-center">Odds</span>
                                            </div>
                                            {market.selections.map((entry, rowIndex) => (
                                                <div
                                                    key={entry.selection.id}
                                                    className={`grid items-center gap-2 border-b border-white/5 ${
                                                        rowIndex % 2 === 1
                                                            ? "bg-white/[0.02]"
                                                            : "bg-transparent"
                                                    }`}
                                                    style={{
                                                        gridTemplateColumns:
                                                            "minmax(0,1fr) var(--table-chip-width)",
                                                    }}
                                                >
                                                    <p className="truncate py-2.5 pr-3 text-sm font-semibold text-white">
                                                        {entry.selection.selectionName}
                                                    </p>
                                                    {renderSelectionChip({ entry })}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}

                            {mainLineSelectionIds.size === 0 && activeMarkets.length === 0 ? (
                                <div
                                    role="status"
                                    className="px-5 py-6 text-sm text-amber-100 sm:px-6"
                                >
                                    Markets not posted yet.
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div
                            role="status"
                            className="-mx-5 border-y border-white/10 px-5 py-6 text-sm text-amber-100 sm:-mx-6 sm:px-6"
                        >
                            Markets not posted yet.
                        </div>
                    )}
                </section>
            ) : null}

            {reviewOpen ? (
                <div
                    data-contest-review-backdrop
                    className={`${dockStyles.dockClearance} fixed inset-x-0 top-0 z-30 bg-black/70`}
                    role="presentation"
                    onClick={() => setReviewOpen(false)}
                />
            ) : null}

            <div
                data-contest-action-dock
                className={`${dockStyles.viewportAnchor} ${dockStyles.dockPosition} ${dockStyles.dockGutter} fixed z-40 flex justify-center`}
            >
                <div className={`${dockStyles.scaledFrame} relative`}>
                    <aside
                        data-contest-review-surface
                        data-contest-review-open={reviewOpen}
                        aria-label="Contest entry review"
                        className={`${dockStyles.sheetSurfaceClearance} rounded-3xl sheet-rounded border-x-0 border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] sm:border sm:border-b-0 ${
                            reviewOpen
                                ? `${dockStyles.openSheetViewport} overflow-y-auto bg-[#080a0f] sheet-scroll`
                                : "overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] backdrop-blur"
                        }`}
                    >
                        <div
                            className={`flex items-center justify-between gap-4 px-4 py-4 ${
                                reviewOpen
                                    ? "sticky top-0 z-10 bg-[#080a0f]"
                                    : "min-h-[72px] sm:min-h-0"
                            }`}
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {selected.length} / {context.rules.maxLegs} legs
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Combined odds{" "}
                                    <span className="font-semibold text-sky-200">
                                        {formatOdds(combinedOdds)}
                                    </span>
                                </p>
                            </div>
                            <button
                                type="button"
                                data-contest-review-toggle
                                aria-expanded={reviewOpen}
                                disabled={!reviewOpen && selected.length === 0}
                                onClick={() => setReviewOpen((current) => !current)}
                                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {reviewOpen ? "Close review" : "Review entry"}
                            </button>
                        </div>

                        {reviewOpen ? (
                            <div className="border-t border-white/10 px-4 pb-5 pt-4">
                                <div className="space-y-2">
                                    {selected.map(({ game, selection }) => (
                                        <div
                                            key={selection.id}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/35 p-3 text-xs"
                                        >
                                            <div>
                                                <p className="font-semibold text-white">
                                                    {selection.selectionName}
                                                    {formatLine(selection.line)}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-gray-400">
                                                    {game.awayTeam.name} @ {game.homeTeam.name} ·{" "}
                                                    {selection.marketName}
                                                </p>
                                                <p className="mt-1 text-[10px] font-semibold text-sky-200">
                                                    {formatOdds(selection.americanOdds)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${selection.selectionName}`}
                                                onClick={() => toggleSelection({ game, selection })}
                                                className="shrink-0 text-[11px] font-semibold text-rose-200 hover:text-white"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {context.rulesAcceptance ? (
                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={context.rulesAcceptance.accepted}
                                            onChange={(event) =>
                                                context.rulesAcceptance?.onAcceptedChange(
                                                    event.target.checked
                                                )
                                            }
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400"
                                        />
                                        <span>
                                            {context.rulesAcceptance.label ??
                                                "I reviewed and accept the current contest rules."}
                                        </span>
                                    </label>
                                ) : null}

                                {actionMessage ? (
                                    <p role="status" className="mt-3 text-[11px] text-amber-200">
                                        {actionMessage}
                                    </p>
                                ) : (
                                    <p className="mt-3 text-[11px] text-gray-500">
                                        Odds and provider selection IDs are captured when you
                                        submit.
                                    </p>
                                )}

                                <button
                                    type="button"
                                    disabled={!canSubmit}
                                    onClick={submit}
                                    className="ui-accent-button mt-4 w-full rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {context.submitting
                                        ? "Submitting…"
                                        : (context.submitLabel ??
                                          (context.rulesAcceptance
                                              ? "Join and submit entry"
                                              : context.initialLegKeys?.length
                                                ? "Replace entry"
                                                : "Submit entry"))}
                                </button>
                            </div>
                        ) : actionMessage ? (
                            <p role="status" className="px-4 pb-3 text-[11px] text-amber-200">
                                {actionMessage}
                            </p>
                        ) : (
                            <p className="px-4 pb-3 text-[11px] text-gray-500">
                                Odds and provider selection IDs are captured when you submit.
                            </p>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default ContestPickBuilder;
