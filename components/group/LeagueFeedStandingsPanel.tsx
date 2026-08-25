"use client";

import Link from "next/link";
import {
    useEffect,
    useRef,
    type KeyboardEvent as ReactKeyboardEvent,
    type TouchEvent as ReactTouchEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    STANDINGS_CARD_STYLES,
    StandingIdentity,
    StandingPrimaryMetric,
    StandingRank,
    StandingsCard,
} from "@/components/community/StandingsCard";
import type {
    GroupLifetimeStandingRow,
    LifetimeStandingsState,
    LifetimeStandingsType,
    RootState,
} from "@/lib/interfaces/interfaces";
import { getLifetimeStandingsBoardMeta } from "@/lib/groups/lifetimeStandings";
import { fetchLifetimeStandingsRequest } from "@/lib/redux/slices/lifetimeStandingsSlice";
import { generateProfileImageUrl } from "@/lib/utils/helpers";

/* ============================================================================
 * LEAGUE FEED STANDINGS — the two lifetime boards behind the Feed's Standings
 * view, from GET /group/lifetime-standings.
 *
 * A League has TWO boards where an Arena has one: `fantasy` (points accrued as
 * slips settle, so a contest still running already counts) and `feed` (feed
 * contests, which bank nothing until they finalize). They sit in a carousel and
 * the Feed header's flip button drives the same state the swipe does.
 *
 * Ported from the MVP's app/league/[leagueId]/page.tsx:141-386. The carousel is
 * the MVP's own bespoke one, NOT CommunitySwipePager — same roles, same keys,
 * same 48px swipe threshold, same `key={active.id}` remount as the whole
 * "animation".
 * ========================================================================== */

/** Matches the MVP's 3-column template (MVP league page:164). */
const STANDINGS_GRID_CLASS_NAME =
    "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[4rem_minmax(0,1fr)_8rem]";

/* No `loading` prop on StandingsCard — it has three other consumers — so the
 * card mounts empty and the skeleton takes the `emptyState` slot. DOM order
 * stays the MVP's: title bar, column header, rows. */
const LeagueStandingsSkeleton = () => (
    <div aria-hidden className="animate-pulse">
        {Array.from({ length: 5 }).map((_, index) => (
            <div
                key={index}
                className={`grid min-h-[3.3125rem] items-center ${STANDINGS_GRID_CLASS_NAME} ${STANDINGS_CARD_STYLES.fullPageRow} lg:px-10`}
            >
                <span className="h-3 w-6 rounded bg-amber-200/10" />
                <span className="flex items-center gap-2.5">
                    <span className="h-10 w-10 shrink-0 rounded-full bg-amber-200/10" />
                    <span className="h-3 w-28 rounded bg-amber-200/10" />
                </span>
                <span className="h-3.5 w-12 justify-self-end rounded bg-amber-200/10" />
            </div>
        ))}
    </div>
);

const LeagueLifetimeStandingsBoard = ({
    leagueId,
    boardId,
    title,
    pointsLabel,
    rows,
    loading,
    error,
}: {
    leagueId: string;
    boardId: LifetimeStandingsType;
    title: string;
    pointsLabel: string;
    rows: readonly GroupLifetimeStandingRow[];
    loading: boolean;
    error: string | null;
}) => {
    const headingId = `league-${boardId}-lifetime-standings`;

    return (
        <StandingsCard
            rows={rows}
            getRowKey={(row) => row.user_id}
            columns={[
                { key: "rank", label: "Rank" },
                { key: "member", label: "Member" },
                { key: "points", label: pointsLabel, className: "text-right" },
            ]}
            gridClassName={STANDINGS_GRID_CLASS_NAME}
            title={title}
            titleId={headingId}
            boardId={boardId}
            rootClassName="lg:-mt-px"
            titleBarClassName="lg:px-10"
            columnHeaderClassName="lg:px-10"
            leaderboardDataId={boardId}
            scrollDataId={boardId}
            // "page" drops the bordered frame and lets the board run the full
            // width of the Feed's Standings view, as all three MVP call sites do.
            presentation="page"
            emptyState={
                loading ? (
                    <LeagueStandingsSkeleton />
                ) : error ? (
                    <div className="px-5 py-6 sm:px-4 lg:px-10">
                        <p role="alert" className="text-sm leading-6 text-rose-200">
                            {error}
                        </p>
                    </div>
                ) : (
                    <div className="px-5 py-6 sm:px-4 lg:px-10">
                        <p className="font-semibold text-white">No lifetime standings yet</p>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Finalized eligible contest results will populate these standings.
                        </p>
                    </div>
                )
            }
            renderRow={(row) => {
                const handle = row.member.username ?? "member";
                return (
                    <Link
                        href={`/league/${leagueId}/members/${row.user_id}`}
                        aria-label={`View @${handle}'s League member card`}
                        data-lifetime-standing-row
                        data-lifetime-standing-theme="gold"
                        className={`grid min-h-[3.3125rem] ${STANDINGS_GRID_CLASS_NAME} ${STANDINGS_CARD_STYLES.fullPageRow} lg:px-10`}
                    >
                        <StandingRank rank={row.rank} />
                        <StandingIdentity
                            avatarUrl={generateProfileImageUrl(
                                row.member.profile_image ?? undefined
                            )}
                            displayName={
                                row.member.full_name ?? row.member.username ?? "League member"
                            }
                            handle={handle}
                            rank={row.rank}
                        />
                        <StandingPrimaryMetric value={row.points} />
                    </Link>
                );
            }}
        />
    );
};

/**
 * The MVP's own carousel, not CommunitySwipePager.
 *
 * Only the ACTIVE board is mounted — that is what lets the fetch effect below
 * load one board at a time and what makes `takeLatest` on the saga correct.
 */
const LeagueLifetimeStandingsCarousel = ({
    leagueId,
    activeBoard,
    onActiveBoardChange,
    boards,
}: {
    leagueId: string;
    activeBoard: LifetimeStandingsType;
    onActiveBoardChange: (boardId: LifetimeStandingsType) => void;
    boards: readonly {
        id: LifetimeStandingsType;
        title: string;
        pointsLabel: string;
        rows: readonly GroupLifetimeStandingRow[];
        loading: boolean;
        error: string | null;
    }[];
}) => {
    const touchStartX = useRef<number | null>(null);
    const activeIndex = Math.max(
        boards.findIndex((board) => board.id === activeBoard),
        0
    );
    const active = boards[activeIndex];

    const showPrevious = () =>
        onActiveBoardChange(
            boards[(activeIndex - 1 + boards.length) % boards.length].id
        );
    const showNext = () =>
        onActiveBoardChange(boards[(activeIndex + 1) % boards.length].id);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        // Only the region itself: a key pressed on a row Link inside must still
        // reach that link.
        if (event.target !== event.currentTarget) return;
        if (
            event.key !== "ArrowLeft" &&
            event.key !== "ArrowRight" &&
            event.key !== "Home" &&
            event.key !== "End"
        ) {
            return;
        }
        event.preventDefault();
        if (event.key === "Home") {
            onActiveBoardChange(boards[0].id);
            return;
        }
        if (event.key === "End") {
            onActiveBoardChange(boards[boards.length - 1].id);
            return;
        }
        if (event.key === "ArrowLeft") showPrevious();
        else showNext();
    };

    const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX === null) return;
        const endX = event.changedTouches[0]?.clientX;
        if (endX === undefined) return;
        const distance = endX - startX;
        // Below the threshold it was a tap or a vertical scroll, not a swipe.
        if (Math.abs(distance) < 48) return;
        if (distance < 0) showNext();
        else showPrevious();
    };

    return (
        <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Lifetime standings boards"
            data-standings-board-carousel
            data-active-standings-board={active.id}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
                touchStartX.current = null;
            }}
            className="touch-pan-y outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70"
        >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {active.title}, {activeIndex + 1} of {boards.length}
            </p>
            <div
                key={active.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${activeIndex + 1} of ${boards.length}: ${active.title}`}
            >
                <LeagueLifetimeStandingsBoard
                    leagueId={leagueId}
                    boardId={active.id}
                    title={active.title}
                    pointsLabel={active.pointsLabel}
                    rows={active.rows}
                    loading={active.loading}
                    error={active.error}
                />
            </div>
        </div>
    );
};

export const LeagueFeedStandingsPanel = ({
    leagueId,
    activeBoard,
    onActiveBoardChange,
    hasMembers = true,
}: {
    leagueId: string;
    activeBoard: LifetimeStandingsType;
    onActiveBoardChange: (boardId: LifetimeStandingsType) => void;
    /** The MVP short-circuits the whole carousel for a League nobody has joined. */
    hasMembers?: boolean;
}) => {
    const dispatch = useDispatch();
    const standingsState = useSelector(
        (state: RootState) => state.lifetimeStandings
    ) as LifetimeStandingsState;

    // The slice is shared across groups, so rows stamped for another League are
    // not this League's rows.
    const isCurrent = standingsState.groupId === leagueId;
    const slot = standingsState[activeBoard];
    const data = isCurrent ? slot.data : null;

    /* Only the board on screen is fetched. Loading both would be two concurrent
     * requests through one `takeLatest` handler, which would cancel one of them;
     * and because the two boards hold separate slots, flipping back to one that
     * has already answered is instant and issues nothing. */
    useEffect(() => {
        if (!leagueId || !hasMembers) return;
        if (isCurrent && (slot.loading || slot.data)) return;
        dispatch(
            fetchLifetimeStandingsRequest({
                group_id: leagueId,
                type: activeBoard,
                page: 1,
                limit: 100,
            })
        );
    }, [
        leagueId,
        activeBoard,
        hasMembers,
        dispatch,
        isCurrent,
        slot.loading,
        slot.data,
    ]);

    const fallbackMeta = getLifetimeStandingsBoardMeta("league", activeBoard);
    // Prefer the server's wording once it has answered; the local copy only
    // keeps the title bar correct on the first paint.
    const meta = data?.board ?? fallbackMeta;

    const boards = [
        {
            id: "fantasy" as const,
            title:
                activeBoard === "fantasy"
                    ? meta.title
                    : getLifetimeStandingsBoardMeta("league", "fantasy").title,
            pointsLabel:
                activeBoard === "fantasy"
                    ? meta.points_label
                    : getLifetimeStandingsBoardMeta("league", "fantasy").points_label,
            rows: activeBoard === "fantasy" ? data?.standings ?? [] : [],
            loading: activeBoard === "fantasy" && slot.loading && !data,
            error: activeBoard === "fantasy" && isCurrent ? slot.error : null,
        },
        {
            id: "feed" as const,
            title:
                activeBoard === "feed"
                    ? meta.title
                    : getLifetimeStandingsBoardMeta("league", "feed").title,
            pointsLabel:
                activeBoard === "feed"
                    ? meta.points_label
                    : getLifetimeStandingsBoardMeta("league", "feed").points_label,
            rows: activeBoard === "feed" ? data?.standings ?? [] : [],
            loading: activeBoard === "feed" && slot.loading && !data,
            error: activeBoard === "feed" && isCurrent ? slot.error : null,
        },
    ];

    return (
        <section aria-label="League Feed standings" className="space-y-5">
            {hasMembers ? (
                <LeagueLifetimeStandingsCarousel
                    leagueId={leagueId}
                    activeBoard={activeBoard}
                    onActiveBoardChange={onActiveBoardChange}
                    boards={boards}
                />
            ) : (
                <div className="px-5 py-6 sm:px-4">
                    <p className="font-semibold text-white">No League members yet</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        Members will appear here once they join this League.
                    </p>
                </div>
            )}
        </section>
    );
};

export default LeagueFeedStandingsPanel;
