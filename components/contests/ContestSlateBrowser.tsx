"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import {
    FEED_CONTEST_SPORTS,
    resolveOrganizerTimeZone,
    toZonedDateKey,
    zonedKickoffFormatter,
    type ContestGameOption,
    type FeedContestSport,
} from "@/lib/contests/feedContestCatalog";

export type ContestSlateBrowserAccent = "league" | "arena";

export type ContestSlateBrowserProps = {
    games: readonly ContestGameOption[];
    selectedGameIds: readonly string[];
    onToggleGame: (gameId: string) => void;
    accent: ContestSlateBrowserAccent;
    /** IANA zone used for the organizer-facing calendar tabs and kickoffs. */
    timeZone?: string;
    /**
     * Template-specific market availability — the green/amber line at the foot
     * of each matchup card.
     *
     * DEFAULTS TO TRUE here, where the MVP defaults to the catalog's `hasOdds`
     * flag. That flag has no counterpart in this app: the schedule endpoint is a
     * pure fixture feed and carries no prices, which is also why the create
     * payload omits `has_odds` and lets the server read its own default of true.
     * So the default states exactly what the client already asserts to the
     * server, and a template that knows better — TD Psychic, which has read the
     * scorer board — passes a real resolver.
     */
    availabilityResolver?: (game: ContestGameOption) => boolean;
    availabilityLabels?: {
        available: string;
        unavailable: string;
    };
};

type DateOption = {
    key: string;
    label: string;
};

const accentClasses = {
    league: {
        activeTab: "border-sky-300 text-white",
        selectedCard: "border-sky-300/55 bg-sky-500/10 ring-1 ring-inset ring-sky-300/20",
        selectedBadge: "border-sky-300/35 bg-sky-400/15 text-sky-100",
        teamBadge: "border-sky-300/20 bg-sky-500/10 text-sky-100",
        focus: "focus-visible:ring-white/70",
    },
    arena: {
        activeTab: "border-violet-300 text-white",
        selectedCard:
            "border-violet-300/55 bg-violet-500/10 ring-1 ring-inset ring-violet-300/20",
        selectedBadge: "border-violet-300/35 bg-violet-400/15 text-violet-100",
        teamBadge: "border-violet-300/20 bg-violet-500/10 text-violet-100",
        focus: "focus-visible:ring-white/70",
    },
} as const;

// A tab names a calendar day, so it is read back at UTC noon and formatted in
// UTC — pulling it through the viewer's zone can print the day before.
const dateFromLocalKey = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return Number.isNaN(date.getTime()) ? null : date;
};

const dateTabLabel = (key: string, timeZone: string) => {
    const date = dateFromLocalKey(key);
    if (!date) return key;
    const label = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
    return key === toZonedDateKey(new Date(), timeZone) ? `Today · ${label}` : label;
};

const formatKickoff = (startsAt: string, timeZone: string) => {
    const date = new Date(startsAt);
    return Number.isNaN(date.getTime())
        ? "Kickoff unavailable"
        : zonedKickoffFormatter(timeZone).format(date);
};

const nextItemIndex = (
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
        ?.focus();
};

const sortGames = (left: ContestGameOption, right: ContestGameOption) => {
    const kickoff = left.gameStartsAt.localeCompare(right.gameStartsAt);
    if (kickoff !== 0) return kickoff;
    const competition = left.competition.localeCompare(right.competition);
    if (competition !== 0) return competition;
    return left.id.localeCompare(right.id);
};

/**
 * Matchup review for a parent-scoped date range and set of sports. Date and
 * sport tabs only filter the visible cards; selected game IDs remain fully
 * controlled by the parent and persist while the user browses.
 */
export const ContestSlateBrowser = ({
    games,
    selectedGameIds,
    onToggleGame,
    accent,
    timeZone = resolveOrganizerTimeZone(),
    availabilityResolver = () => true,
    availabilityLabels = {
        available: "Markets available",
        unavailable: "Markets not posted yet",
    },
}: ContestSlateBrowserProps) => {
    const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const styles = accentClasses[accent];
    const availableSports = useMemo(() => {
        const included = new Set(games.map((game) => game.sport));
        return FEED_CONTEST_SPORTS.filter((sport) => included.has(sport));
    }, [games]);
    const sortedGames = useMemo(() => games.slice().sort(sortGames), [games]);
    const dateOptions = useMemo<DateOption[]>(() => {
        const keys = new Set<string>();
        sortedGames.forEach((game) => {
            const key = toZonedDateKey(game.gameStartsAt, timeZone);
            if (key) keys.add(key);
        });
        return Array.from(keys)
            .sort()
            .map((key) => ({ key, label: dateTabLabel(key, timeZone) }));
    }, [sortedGames, timeZone]);
    const [requestedDateKey, setRequestedDateKey] = useState(
        () => dateOptions[0]?.key ?? ""
    );
    const [requestedSport, setRequestedSport] = useState<FeedContestSport | null>(
        () => sortedGames[0]?.sport ?? null
    );
    const activeDateKey = dateOptions.some((option) => option.key === requestedDateKey)
        ? requestedDateKey
        : dateOptions[0]?.key ?? "";
    const sportsOnActiveDate = useMemo(
        () =>
            availableSports.filter((sport) =>
                sortedGames.some(
                    (game) =>
                        game.sport === sport &&
                        toZonedDateKey(game.gameStartsAt, timeZone) === activeDateKey
                )
            ),
        [activeDateKey, availableSports, sortedGames, timeZone]
    );
    const activeSport =
        requestedSport && sportsOnActiveDate.includes(requestedSport)
            ? requestedSport
            : sportsOnActiveDate[0] ?? null;
    const visibleGames = useMemo(
        () =>
            sortedGames.filter(
                (game) =>
                    game.sport === activeSport &&
                    toZonedDateKey(game.gameStartsAt, timeZone) === activeDateKey
            ),
        [activeDateKey, activeSport, sortedGames, timeZone]
    );
    const selectedIds = useMemo(() => new Set(selectedGameIds), [selectedGameIds]);

    const chooseDate = (dateKey: string) => {
        const sportsForDate = availableSports.filter((sport) =>
            sortedGames.some(
                (game) =>
                    game.sport === sport &&
                    toZonedDateKey(game.gameStartsAt, timeZone) === dateKey
            )
        );
        setRequestedDateKey(dateKey);
        setRequestedSport((current) =>
            current && sportsForDate.includes(current) ? current : sportsForDate[0] ?? null
        );
    };

    const chooseSport = (sport: FeedContestSport) => {
        const availableOnCurrentDate = sortedGames.some(
            (game) =>
                game.sport === sport &&
                toZonedDateKey(game.gameStartsAt, timeZone) === activeDateKey
        );
        setRequestedSport(sport);
        if (availableOnCurrentDate) return;
        const fallbackDate = sortedGames.find((game) => game.sport === sport);
        setRequestedDateKey(
            fallbackDate
                ? toZonedDateKey(fallbackDate.gameStartsAt, timeZone)
                : activeDateKey
        );
    };

    const handleDateKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        dateKey: string
    ) => {
        const index = dateOptions.findIndex((option) => option.key === dateKey);
        const nextIndex = nextItemIndex(event, index, dateOptions.length);
        if (nextIndex === null) return;
        event.preventDefault();
        const nextDate = dateOptions[nextIndex];
        if (!nextDate) return;
        chooseDate(nextDate.key);
        focusTabAt(event, nextIndex);
    };

    const handleSportKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        sport: FeedContestSport
    ) => {
        const index = availableSports.indexOf(sport);
        const nextIndex = nextItemIndex(event, index, availableSports.length);
        if (nextIndex === null) return;
        event.preventDefault();
        const nextSport = availableSports[nextIndex];
        if (!nextSport) return;
        chooseSport(nextSport);
        focusTabAt(event, nextIndex);
    };

    if (availableSports.length === 0 || dateOptions.length === 0) {
        return (
            <section
                aria-label="Contest slate matchups"
                className="rounded-2xl border border-white/10 bg-black/35 p-5"
            >
                <p className="text-sm font-semibold text-white">No matchups available</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                    No scheduled matchups are available for this slate.
                </p>
            </section>
        );
    }

    const matchupPanelId = `${instanceId}-matchup-panel`;
    const activeDateTabId = `${instanceId}-date-${activeDateKey}`;
    const activeSportTabId = activeSport
        ? `${instanceId}-sport-${activeSport.toLowerCase()}`
        : undefined;

    return (
        <section aria-label="Contest slate matchups" className="space-y-4">
            <div
                role="tablist"
                aria-label="Game dates"
                className="flex w-full items-center gap-3 overflow-x-auto pb-1"
            >
                {dateOptions.map((option) => {
                    const active = option.key === activeDateKey;
                    return (
                        <button
                            key={option.key}
                            id={`${instanceId}-date-${option.key}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={matchupPanelId}
                            tabIndex={active ? 0 : -1}
                            onClick={() => chooseDate(option.key)}
                            onKeyDown={(event) => handleDateKeyDown(event, option.key)}
                            className={`shrink-0 border-b-2 pb-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${styles.focus} ${active
                                ? styles.activeTab
                                : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            <div
                role="tablist"
                aria-label="Sports"
                className="flex w-full items-center gap-3 overflow-x-auto border-b border-white/10 pb-0.5"
            >
                {availableSports.map((sport) => {
                    const active = sport === activeSport;
                    return (
                        <button
                            key={sport}
                            id={`${instanceId}-sport-${sport.toLowerCase()}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={matchupPanelId}
                            tabIndex={active ? 0 : -1}
                            onClick={() => chooseSport(sport)}
                            onKeyDown={(event) => handleSportKeyDown(event, sport)}
                            className={`shrink-0 border-b-2 px-0.5 pb-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${styles.focus} sm:text-sm ${active
                                ? styles.activeTab
                                : "border-transparent text-gray-400 hover:border-white/30 hover:text-white"
                                }`}
                        >
                            {sport}
                        </button>
                    );
                })}
            </div>

            <div
                // Remounting on a tab change puts the scroll position back at the
                // top of the new date/sport instead of mid-list.
                key={`${activeDateKey}:${activeSport ?? "none"}`}
                id={matchupPanelId}
                role="tabpanel"
                tabIndex={0}
                data-contest-slate-matchup-scroll
                data-visible-matchups="2"
                aria-labelledby={
                    activeSportTabId ? `${activeDateTabId} ${activeSportTabId}` : activeDateTabId
                }
                className={`grid max-h-[30rem] gap-3 overflow-y-auto overscroll-contain pr-1 outline-none focus-visible:ring-2 ${styles.focus} lg:max-h-[17rem] lg:grid-cols-2`}
            >
                {visibleGames.map((game) => {
                    const selected = selectedIds.has(game.id);
                    const kickoff = formatKickoff(game.gameStartsAt, timeZone);
                    const matchup = `${game.awayTeam} at ${game.homeTeam}`;
                    const marketAvailable = availabilityResolver(game);
                    const availabilityLabel = marketAvailable
                        ? availabilityLabels.available
                        : availabilityLabels.unavailable;
                    return (
                        <button
                            key={game.id}
                            type="button"
                            data-contest-slate-game-id={game.id}
                            aria-pressed={selected}
                            aria-label={`${selected ? "Remove" : "Include"} ${matchup}, ${game.competition}, ${kickoff}, ${availabilityLabel}`}
                            onClick={() => onToggleGame(game.id)}
                            className={`group w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 ${styles.focus} ${selected
                                ? styles.selectedCard
                                : "border-white/10 bg-black/35 hover:border-white/25 hover:bg-white/[0.04]"
                                }`}
                        >
                            <span className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                                <span className="min-w-0">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                        {game.sport} · {game.competition}
                                    </span>
                                    <time
                                        dateTime={game.gameStartsAt}
                                        className="mt-1 block text-xs font-medium normal-case text-gray-300"
                                    >
                                        {kickoff}
                                    </time>
                                </span>
                                <span
                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${selected
                                        ? styles.selectedBadge
                                        : "border-white/10 bg-white/[0.03] text-gray-500"
                                        }`}
                                >
                                    {selected ? "Included" : "Include"}
                                </span>
                            </span>

                            <span className="mt-4 grid gap-3">
                                {(
                                    [
                                        ["Away", game.awayTeam, game.awayAbbr],
                                        ["Home", game.homeTeam, game.homeAbbr],
                                    ] as const
                                ).map(([side, teamName, abbreviation]) => (
                                    <span
                                        key={`${game.id}-${side}`}
                                        className="flex min-w-0 items-center gap-3"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${styles.teamBadge}`}
                                        >
                                            {abbreviation}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600">
                                                {side}
                                            </span>
                                            <span className="block truncate text-sm font-semibold normal-case text-white">
                                                {teamName}
                                            </span>
                                        </span>
                                    </span>
                                ))}
                            </span>
                            <span
                                className={`mt-3 block text-[11px] font-semibold normal-case ${
                                    marketAvailable ? "text-emerald-200" : "text-amber-100"
                                }`}
                            >
                                {availabilityLabel}
                            </span>
                        </button>
                    );
                })}

                {visibleGames.length === 0 ? (
                    <div
                        role="status"
                        className="rounded-2xl border border-dashed border-white/15 bg-black/25 p-6 text-center lg:col-span-2"
                    >
                        <p className="text-sm font-semibold text-white">
                            No matchups for these filters
                        </p>
                        <p className="mt-1 text-xs normal-case text-gray-400">
                            Choose another date or sport from the slate.
                        </p>
                    </div>
                ) : null}
            </div>
        </section>
    );
};

export default ContestSlateBrowser;
