"use client";

import { JSX, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import FeedList from "@/components/social/FeedList";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { getLevelProgress } from "@/lib/utils/progression";
import { normalizePickResult } from "@/lib/slips/state";
import { Group, GroupSummary, Members, Pick, PickReaction, PickType, RootState } from "@/lib/interfaces/interfaces";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { clearJoinedGroupByInviteCodeMessage, fetchAllGroupsRequest, joinedGroupByInviteCodeRequest } from "@/lib/redux/slices/groupsSlice";
import { clearFetchAllGlobalPostPicksMessage, createPickReactionRequest, fetchGlobalPendingTopHitPostsRequest, fetchRecentPicksRequest } from "@/lib/redux/slices/pickSlice";
import { fetchProgressByUserIdRequest } from "@/lib/redux/slices/progressSlice";
import { useToast } from "@/lib/state/ToastContext";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group & { members?: Members }>;
        };
        message?: string;
    } | null;
    loading: boolean;
    summary: GroupSummary[];
    joinLoading: boolean;
    error: string | null;
    message: string | null;
};

type GroupRootState = {
    group: GroupSliceState;
};

type ActionDefinition = {
    id: string;
    label: ReactNode;
    description: string;
    href: string;
    icon: JSX.Element;
    featured?: boolean;
    onClick: () => void;
};

type StatDefinition = {
    label: string;
    value: string;
    highlight?: boolean;
};

const ActionCard = ({ action }: { action: ActionDefinition }) => (
    <button
        type="button"
        onClick={action.onClick}
        className={`group relative overflow-hidden rounded-3xl border px-3 py-3 text-left shadow-sm transition sm:px-4 sm:py-4 lg:px-5 lg:py-5 ${action.featured
            ? "border-emerald-300/60 bg-emerald-500/15"
            : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
            }`}
    >
        <div
            aria-hidden
            className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl transition ${action.featured
                ? "bg-emerald-400/30"
                : "bg-white/10 group-hover:bg-white/20"
                }`}
        />
        <div className="relative flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-white sm:text-sm">
                {action.label}
            </p>
            <div className={action.featured ? "text-emerald-100" : "text-gray-200"}>
                {action.icon}
            </div>
        </div>
    </button>
);

const StatCard = ({ stat }: { stat: StatDefinition }) => (
    <div className="flex flex-col gap-1">
        <p className="text-[9px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px] sm:tracking-[0.2em]">
            {stat.label}
        </p>
        <p
            className={`text-lg font-semibold sm:text-2xl ${stat.highlight ? "text-emerald-200" : "text-white"
                }`}
        >
            {stat.value}
        </p>
    </div>
);

const HomeTab = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const currentUserId = currentUser?.userId ?? undefined;
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinOpen, setJoinOpen] = useState(false);
    const leagueCarouselRef = useRef<HTMLDivElement | null>(null);
    const slideDistanceRef = useRef(0);
    const resetTimeoutRef = useRef<number | null>(null);
    const resumeTimeoutRef = useRef<number | null>(null);
    const isCarouselPausedRef = useRef(false);
    const [activeLeagueIndex, setActiveLeagueIndex] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const limit = 10;

    const { group, joinLoading, message, error } = useSelector((state: GroupRootState) => state.group);
    const { pick, postPicks, loading: pickLoader, message: pickMessage } = useSelector((state: RootState) => state.pick);
    const { progress } = useSelector((state: RootState) => state.progress);

    const fetchData = useCallback((pageNum: number, customLimit?: number) => {
        const payload = { page: pageNum, limit: customLimit ?? limit };
        dispatch(fetchGlobalPendingTopHitPostsRequest(payload));
    }, [dispatch, limit]);

    useEffect(() => {
        dispatch(fetchAllGroupsRequest({}));
        dispatch(fetchRecentPicksRequest({}));
        fetchData(1);
        if (currentUserId) {
            dispatch(fetchProgressByUserIdRequest({ user_id: currentUserId }));
        }
    }, [dispatch, currentUserId]);

    useEffect(() => {
        if (pickLoader || !pickMessage) return;

        dispatch(clearFetchAllGlobalPostPicksMessage());
        fetchData(1, page * limit);
    }, [pickLoader, pickMessage, dispatch, page, limit]);

    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (pickLoader) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchData(nextPage);
            }
        });

        if (node) observer.current.observe(node);
    }, [pickLoader, hasMore, page, fetchData]);

    useEffect(() => {
        if (!pickLoader && postPicks) {
            if (postPicks.length < page * limit) {
                setHasMore(false);
            }
        }
    }, [postPicks, pickLoader, page, limit]);

    useEffect(() => {
        if (!joinLoading && message && group) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
            });
            dispatch(fetchAllGroupsRequest({}));
        }
        if (!joinLoading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
        }
        dispatch(clearJoinedGroupByInviteCodeMessage());
    }, [setToast, dispatch, joinLoading, message, error, router, group]);

    const displayHandle = currentUser?.username ?? "Member";
    const { level, xpIntoLevel, xpToNext } = getLevelProgress(
        progress?.lifetime_xp ?? 0
    );
    const xpLevelRatio = Math.min(1, xpIntoLevel / xpToNext);

    const recentPicks = useMemo<Pick[]>(() => {
        if (!Array.isArray(pick)) return [];
        return pick;
    }, [pick]);

    const recentPostPicks = useMemo(
        () =>
            recentPicks.filter(
                (pick) => pick.user_id === currentUser?.userId
                    && pick.pick_type === PickType.POST
            ),
        [currentUser, recentPicks]
    );

    const pickStats = useMemo(() => {
        const wins = recentPostPicks.filter(
            (pick) => normalizePickResult(pick.result) === "win"
        ).length;
        const losses = recentPostPicks.filter(
            (pick) => normalizePickResult(pick.result) === "loss"
        ).length;
        const pending = recentPostPicks.filter(
            (pick) => normalizePickResult(pick.result) === "pending"
        ).length;
        const settled = wins + losses;
        const winRate = settled ? Math.round((wins / settled) * 100) : 0;
        return { wins, losses, pending, winRate };
    }, [recentPostPicks]);

    const sortedGroups = useMemo(() => {
        if (!group?.data?.groups) return [];

        const groups = group.data.groups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: Group) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: Group) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [group?.data?.groups, currentUser?.userId]);

    const openSlips = useMemo(
        () => sortedGroups?.reduce(
            (total, group) => total + (group?.open_slip ?? 0),
            0
        ) ?? 0,
        [sortedGroups]
    );
    const orderedGroups = useMemo(
        () => [...sortedGroups].reverse(),
        [sortedGroups]
    );
    const carouselGroups = useMemo(
        () =>
            orderedGroups.length > 1
                ? [...orderedGroups, ...orderedGroups, ...orderedGroups]
                : orderedGroups,
        [orderedGroups]
    );

    const openJoinModal = useCallback(() => {
        setJoinOpen(true);
        setJoinError(null);
    }, []);

    const closeJoinModal = useCallback(() => {
        setJoinOpen(false);
        setJoinCode("");
        setJoinError(null);
    }, []);

    const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!currentUser) return;

        dispatch(joinedGroupByInviteCodeRequest({ invite_code: joinCode.trim() }));
        closeJoinModal();
    };

    const jumpCarouselToIndex = useCallback((targetIndex: number, distance?: number) => {
        const container = leagueCarouselRef.current;
        if (!container) return;
        const width = distance ?? slideDistanceRef.current ?? container.clientWidth;
        if (!width) return;
        container.style.scrollSnapType = "none";
        container.style.scrollBehavior = "auto";
        container.scrollTo({ left: targetIndex * width, behavior: "auto" });
        window.requestAnimationFrame(() => {
            container.style.scrollSnapType = "";
            container.style.scrollBehavior = "";
        });
    }, []);

    const scrollLeagueCarouselToIndex = useCallback(
        (index: number) => {
            const container = leagueCarouselRef.current;
            if (!container || orderedGroups.length === 0) return;
            const clampedIndex = Math.max(0, Math.min(index, orderedGroups.length - 1));
            const distance = slideDistanceRef.current || container.clientWidth;
            const targetIndex =
                orderedGroups.length > 1
                    ? orderedGroups.length + clampedIndex
                    : clampedIndex;
            container.scrollTo({ left: targetIndex * distance, behavior: "smooth" });
            setActiveLeagueIndex(clampedIndex);
        },
        [orderedGroups.length]
    );

    useEffect(() => {
        const container = leagueCarouselRef.current;
        if (!container || orderedGroups.length === 0) return;

        const alignToMiddle = () => {
            const children = Array.from(container.children) as HTMLElement[];
            const distance =
                children.length >= 2
                    ? children[1].offsetLeft - children[0].offsetLeft
                    : children[0]?.offsetWidth ?? container.clientWidth;
            slideDistanceRef.current = distance || container.clientWidth;
            if (orderedGroups.length > 1) {
                jumpCarouselToIndex(orderedGroups.length, slideDistanceRef.current);
                setActiveLeagueIndex(0);
            }
        };

        const rafId = window.requestAnimationFrame(alignToMiddle);
        return () => window.cancelAnimationFrame(rafId);
    }, [carouselGroups.length, orderedGroups.length, jumpCarouselToIndex]);

    useEffect(() => {
        const container = leagueCarouselRef.current;
        if (!container) return;

        const handleScroll = () => {
            const width = slideDistanceRef.current || container.clientWidth;
            if (!width || orderedGroups.length === 0) return;
            const rawIndexFloat = container.scrollLeft / width;
            const rawIndex = Math.round(rawIndexFloat);
            const total = orderedGroups.length;

            const normalizedIndex = ((rawIndex % total) + total) % total;
            setActiveLeagueIndex(normalizedIndex);

            if (resetTimeoutRef.current) {
                window.clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }

            if (total > 1) {
                let resetTarget: number | null = null;
                if (rawIndexFloat < total - 0.1) {
                    resetTarget = rawIndex + total;
                } else if (rawIndexFloat >= total * 2 - 0.1) {
                    resetTarget = rawIndex - total;
                }

                if (resetTarget !== null) {
                    resetTimeoutRef.current = window.setTimeout(() => {
                        jumpCarouselToIndex(resetTarget as number, width);
                    }, 140);
                }
            }
        };

        handleScroll();
        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            if (resetTimeoutRef.current) {
                window.clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }
            container.removeEventListener("scroll", handleScroll);
        };
    }, [orderedGroups.length, jumpCarouselToIndex]);

    useEffect(() => {
        const container = leagueCarouselRef.current;
        if (!container || orderedGroups.length <= 1) return;

        let intervalId: number | null = null;
        const media = window.matchMedia("(min-width: 640px)");

        const tick = () => {
            if (!leagueCarouselRef.current) return;
            const width = slideDistanceRef.current || leagueCarouselRef.current.clientWidth;
            if (!width) return;
            leagueCarouselRef.current.scrollBy({ left: width, behavior: "smooth" });
        };

        const start = () => {
            if (intervalId !== null) return;
            if (isCarouselPausedRef.current) return;
            intervalId = window.setInterval(tick, 5000);
        };

        const stop = () => {
            if (intervalId === null) return;
            window.clearInterval(intervalId);
            intervalId = null;
        };

        const scheduleResume = () => {
            if (resumeTimeoutRef.current) {
                window.clearTimeout(resumeTimeoutRef.current);
                resumeTimeoutRef.current = null;
            }
            resumeTimeoutRef.current = window.setTimeout(() => {
                isCarouselPausedRef.current = false;
                if (!media.matches) {
                    start();
                }
            }, 1200);
        };

        const pause = () => {
            isCarouselPausedRef.current = true;
            stop();
            if (resumeTimeoutRef.current) {
                window.clearTimeout(resumeTimeoutRef.current);
                resumeTimeoutRef.current = null;
            }
        };

        const handlePointerEnter = () => pause();
        const handlePointerLeave = () => scheduleResume();
        const handlePointerDown = () => pause();
        const handlePointerUp = () => scheduleResume();
        const handlePointerCancel = () => scheduleResume();
        const handleTouchStart = () => pause();
        const handleTouchEnd = () => scheduleResume();
        const handleTouchCancel = () => scheduleResume();

        const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
            if (event.matches) {
                stop();
            } else {
                start();
            }
        };

        handleChange(media);

        if (media.addEventListener) {
            media.addEventListener("change", handleChange);
        } else {
            media.addListener(handleChange);
        }

        container.addEventListener("pointerenter", handlePointerEnter);
        container.addEventListener("pointerleave", handlePointerLeave);
        container.addEventListener("pointerdown", handlePointerDown);
        container.addEventListener("pointerup", handlePointerUp);
        container.addEventListener("pointercancel", handlePointerCancel);
        container.addEventListener("touchstart", handleTouchStart, { passive: true });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });
        container.addEventListener("touchcancel", handleTouchCancel, { passive: true });

        return () => {
            stop();
            if (resumeTimeoutRef.current) {
                window.clearTimeout(resumeTimeoutRef.current);
                resumeTimeoutRef.current = null;
            }
            if (media.removeEventListener) {
                media.removeEventListener("change", handleChange);
            } else {
                media.removeListener(handleChange);
            }
            container.removeEventListener("pointerenter", handlePointerEnter);
            container.removeEventListener("pointerleave", handlePointerLeave);
            container.removeEventListener("pointerdown", handlePointerDown);
            container.removeEventListener("pointerup", handlePointerUp);
            container.removeEventListener("pointercancel", handlePointerCancel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchend", handleTouchEnd);
            container.removeEventListener("touchcancel", handleTouchCancel);
        };
    }, [orderedGroups.length]);

    const maxVisibleDots = 5;
    const total = orderedGroups.length;

    let startIndex = 0;

    if (total > maxVisibleDots) {
        if (activeLeagueIndex <= 2) {
            startIndex = 0;
        } else if (activeLeagueIndex >= total - 3) {
            startIndex = total - maxVisibleDots;
        } else {
            startIndex = activeLeagueIndex - 2;
        }
    }

    const visibleDots = orderedGroups.slice(
        startIndex,
        startIndex + maxVisibleDots
    );

    const handleReaction = (pickId: string, reaction: PickReaction) => {
        if (reaction && pickId) {
            dispatch(createPickReactionRequest({ pick_id: pickId, action: reaction === "up" ? "liked" : "dislike" }));
        }
    };

    const handleViewProfile = useCallback(
        (userId: string) => {
            router.push(`/user/${userId}`);
        },
        [router]
    );

    const stats: StatDefinition[] = [
        {
            label: "Leagues",
            value: String(sortedGroups.length),
        },
        {
            label: "Active slips",
            value: String(openSlips),
        },
        {
            label: "Global points",
            value: String(progress?.lifetime_xp ?? 0),
            highlight: true,
        },
        {
            label: "Post win rate",
            value: `${pickStats.winRate}%`,
        },
    ];

    const quickActions: ActionDefinition[] = [
        {
            id: "create",
            label: (
                <>
                    <span className="sm:hidden">Start a league</span>
                    <span className="hidden sm:inline">Start a new league</span>
                </>
            ),
            href: "/cag-explained",
            description: "Start a new league",
            featured: true,
            onClick: () => router.push("/cag-explained"),
            icon: (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3.5 w-3.5 overflow-visible sm:h-4 sm:w-4"
                >
                    <circle
                        cx="3.4"
                        cy="5.4"
                        r="3.1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    />
                    <circle
                        cx="20.6"
                        cy="5.4"
                        r="3.1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    />
                    <circle
                        cx="12"
                        cy="10"
                        r="3.1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    />
                    <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
                    <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
                    <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
                </svg>
            ),
        },
        {
            id: "join",
            label: "Join a league",
            href: "/fantasy",
            description: "Join a league by invitation code",
            onClick: openJoinModal,
            icon: (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                >
                    <path d="M5 12h14" strokeLinecap="round" />
                    <path d="m13 5 6 7-6 7" strokeLinecap="round" />
                </svg>
            ),
        },
        {
            id: "builder",
            label: "Build a post",
            description: "Spin up a new post or slip pick.",
            href: "/pick-builder",
            onClick: () => router.push("/pick-builder"),
            icon: (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                >
                    <path
                        d="M12 3.5 9.7 8.4l-5.2 1.9 5.2 1.7 2.3 5 2.2-5 5.2-1.9-5.2-1.7-2.3-5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/80 bg-gradient-to-br from-black/80 via-black/50 to-emerald-900/20 p-4 shadow-2xl shadow-black/40 sm:p-6 lg:p-8 animate-[homeFadeUp_0.7s_ease-out_both]">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 right-[-10%] h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl animate-[homeFloat_12s_ease-in-out_infinite]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-[-30%] left-[-15%] h-64 w-64 rounded-full bg-sky-400/20 blur-3xl animate-[homeFloat_16s_ease-in-out_infinite]"
                />
                <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:gap-8">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-center sm:gap-4">
                        <div className="max-w-xl">
                            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:mt-3 sm:text-3xl lg:text-4xl">
                                <span className="block">Welcome back,</span>
                                <span
                                    className="allow-caps block text-transparent bg-clip-text"
                                    style={displayNameGradientStyle}
                                >
                                    {displayHandle}
                                </span>
                            </h1>
                        </div>
                        <div className="w-full lg:max-w-none lg:justify-self-start">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-xs sm:tracking-[0.2em]">
                                <span>Level {level}</span>
                                <span>
                                    {xpIntoLevel}/{xpToNext} XP
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10 sm:mt-3 sm:h-2">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500"
                                    style={{ width: `${Math.round(xpLevelRatio * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 sm:pt-4">
                        <div className="grid w-full grid-cols-4 gap-2 sm:gap-6">
                            {stats.map((stat) => (
                                <StatCard key={stat.label} stat={stat} />
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-4 sm:pt-6">
                        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:text-xs sm:tracking-[0.24em]">
                                Your leagues
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push("/fantasy")}
                                className="text-[9px] font-semibold tracking-[0.14em] text-gray-200 transition hover:text-white sm:text-[11px]"
                            >
                                manage
                            </button>
                        </div>
                        {sortedGroups.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-[11px] text-gray-300 sm:p-5 sm:text-sm">
                                You are not in any leagues yet. Start one to get the vibe going.
                            </div>
                        ) : (
                            <>
                                <div className="sm:hidden">
                                    <div
                                        ref={leagueCarouselRef}
                                        className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory"
                                    >
                                        {carouselGroups.map((group, index) => (
                                            <button
                                                key={`${group.id}-${index}`}
                                                type="button"
                                                onClick={() => router.push(`/group/${group.id}`)}
                                                className="min-w-full snap-center flex flex-col gap-2 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-3 text-left shadow-lg shadow-black/30 transition hover:border-emerald-400/60 hover:shadow-emerald-500/25"
                                            >
                                                <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-gray-400">
                                                    <span>League</span>
                                                    <span className="text-[9px] text-gray-300">
                                                        code {group.invite_code}
                                                    </span>
                                                </div>
                                                <h3
                                                    className="allow-caps text-base font-extrabold text-transparent bg-clip-text"
                                                    style={displayNameGradientStyle}
                                                >
                                                    {group.name}
                                                </h3>
                                                <p className="text-[10px] text-gray-300 line-clamp-2">
                                                    {group.description ??
                                                        "Run slips, share picks, and climb the table together."}
                                                </p>
                                                <span className="text-[9px] uppercase tracking-[0.16em] text-gray-400">
                                                    {group.members?.length} members
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {orderedGroups.length > 1 && (
                                        <div className="mt-3 flex items-center justify-center gap-2">
                                            {visibleDots.map((group, index) => {
                                                const realIndex = startIndex + index;
                                                const isActive = realIndex === activeLeagueIndex;

                                                const distance = Math.abs(realIndex - activeLeagueIndex);

                                                return (
                                                    <button
                                                        key={group.id}
                                                        type="button"
                                                        onClick={() => scrollLeagueCarouselToIndex(realIndex)}
                                                        aria-label={`Go to league ${realIndex + 1}`}
                                                        className={`
                                                            rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                                                            ${isActive
                                                                ? "w-2 h-2 bg-white"
                                                                : distance === 1
                                                                    ? "w-1.5 h-1.5 bg-white/60"
                                                                    : "w-1 h-1 bg-white/30"
                                                            }
                                                        `}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4">
                                    {orderedGroups.slice(0, 2).map((group) => (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => router.push(`/group/${group.id}`)}
                                            className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-4 text-left shadow-lg shadow-black/30 transition hover:border-emerald-400/60 hover:shadow-emerald-500/25"
                                        >
                                            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-gray-400">
                                                <span>League</span>
                                                <span className="text-[10px] text-gray-300">
                                                    code {group.invite_code}
                                                </span>
                                            </div>
                                            <h3
                                                className="allow-caps text-lg font-extrabold text-transparent bg-clip-text"
                                                style={displayNameGradientStyle}
                                            >
                                                {group.name}
                                            </h3>
                                            <p className="text-xs text-gray-300 line-clamp-2">
                                                {group.description ??
                                                    "Run slips, share picks, and climb the table together."}
                                            </p>
                                            <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                                                {group.members?.length} members
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section
                className="grid grid-cols-3 gap-2 sm:gap-4 animate-[homeFadeUp_0.7s_ease-out_both]"
                style={{ animationDelay: "0.1s" }}
            >
                {quickActions.map((action) => (
                    <ActionCard key={action.id} action={action} />
                ))}
            </section>

            <section
                className="animate-[homeFadeUp_0.7s_ease-out_both]"
                style={{ animationDelay: "0.15s" }}
            >
                <div className="space-y-4">
                    <div className="-mx-5 sm:mx-0">
                        <div className="h-px w-full bg-white/10" />
                        <div className="px-5 sm:px-0">
                            <p className="mt-2 text-[11px] tracking-[0.24em] text-gray-400">
                                recent posts
                            </p>
                        </div>
                    </div>
                    <FeedList
                        items={postPicks}
                        emptyCopy="No pending public posts yet. Share a pick from the builder to light this up."
                        currentUserId={currentUserId}
                        onReaction={handleReaction}
                        onViewProfile={handleViewProfile}
                        showReactions={true}
                        showTopBorder={true}
                        loading={pickLoader}
                        lastItemRef={lastItemRef}
                    />
                </div>
            </section>
            {joinOpen && (
                <ModalShell onClose={closeJoinModal} maxWidthClass="max-w-sm">
                    <form onSubmit={handleJoin} className="space-y-4 text-center">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                join a league
                            </p>
                            <p className="text-lg font-semibold text-white">Enter invite code</p>
                        </div>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(event) => {
                                setJoinCode(event.target.value);
                                setJoinError(null);
                            }}
                            maxLength={5}
                            inputMode="numeric"
                            placeholder="invite code"
                            autoFocus
                            className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/70"
                        />
                        {joinError && <p className="text-xs font-semibold text-red-200">{joinError}</p>}
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeJoinModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/80 hover:text-white"
                            >
                                Join
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
};

export default HomeTab;

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);
