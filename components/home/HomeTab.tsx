"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import FeedList from "@/components/social/FeedList";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { AppNotification, CurrentUser, Group, GroupObject, GroupSummary, PickReaction, RootState } from "@/lib/interfaces/interfaces";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { clearJoinedGroupByInviteCodeMessage, fetchAllGroupsRequest, joinedGroupByInviteCodeRequest } from "@/lib/redux/slices/groupsSlice";
import { clearFetchAllGlobalPostPicksMessage, createPickReactionRequest, fetchGlobalPendingTopHitPostsRequest } from "@/lib/redux/slices/pickSlice";
import { fetchMyTutorialProgressRequest, fetchProgressByUserIdRequest, updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import { useToast } from "@/lib/state/ToastContext";
import { clearAllNotificationRequest, fetchNotificationListRequest, markNotificationReadRequest } from "@/lib/redux/slices/notificationSlice";
import NotificationsFeed from "./NotificationFeed";
import { getGroupPath, getProfilePath } from "@/lib/utils/profileNavigation";
import ScrollUpButton from "../ui/ScrollUpButton";
import { MembersIcon, RightArrowIcon, SlipIcon, TrashIcon } from "../ui/SvgIcons";
import OnboardingModal from "../modals/OnboardingModal";
import { getLocalStorage } from "@/lib/utils/jwtUtils";
import { WELCOME_TUTORIAL } from "@/lib/onboarding/tutorials";
import Image from "next/image";
import HomeTabSkeleton from "../skeletons/home/HomeTabSkeleton";
import { getActiveContestCountsLabel, getCombinedContestCapacityLabel, getGroupCapacityLabel, getGroupTypeLabel, getHostingTierLabel } from "@/lib/groups/limits";
import { groupPreviewKickerTextClassName, groupPreviewMetaTextClassName, GroupTypeMetaLabel } from "../group/GroupPreviewChip";
import InviteCodeCopy from "../group/InviteCodeCopy";
import Link from "next/link";
import PickBuilderClientPage from "../pick-builder/PickBuilderClient";

// Hub preview card tones — leagues read sky/navy, arenas read violet, so the two
// group kinds are distinguishable at a glance in the same carousel.
const previewCardBaseClassName =
    "group/card relative flex min-h-[152px] flex-col overflow-hidden rounded-[22px] border p-5 text-left shadow-lg shadow-black/25 transition hover:-translate-y-0.5 sm:min-h-[164px] sm:p-6 motion-reduce:transform-none motion-reduce:transition-none";

const leaguePreviewCardToneClassName =
    "border-sky-200/15 bg-[linear-gradient(145deg,rgba(14,42,67,0.82),rgba(8,15,27,0.98))] hover:border-sky-200/30 hover:shadow-sky-950/30 focus-within:border-sky-200/35";

const arenaPreviewCardToneClassName =
    "border-violet-300/15 bg-[linear-gradient(145deg,rgba(64,34,105,0.88),rgba(10,10,24,0.98))] hover:border-violet-300/30 hover:shadow-violet-950/30 focus-within:border-violet-200/35";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group>;
        };
        message?: string;
    } | null;
    loading: boolean;
    summary: GroupSummary[];
    joinLoading: boolean;
    error: string | null;
    message: string | null;
    hasMore: boolean;
    myGroups: GroupObject[] | null;
    allGroups: GroupObject[] | null;
    allGroupsHasMore: boolean;
    allGroupsLoading: boolean;
};

type GroupRootState = {
    group: GroupSliceState;
};

type ActionDefinition = {
    id: string;
    label: ReactNode;
    description: string;
    href: string;
    icon: ReactNode;
    featured?: boolean;
    onClick: () => void;
};

type ActivityTab = "posts" | "notifications";

const TwoLineActionLabel = ({
    top,
    bottom,
}: {
    top: string;
    bottom: string;
}) => (
    <span className="flex flex-col leading-[1.1] lg:block lg:whitespace-nowrap">
        <span className="lg:inline">{top}</span>
        <span className="lg:hidden">{bottom}</span>
        <span className="hidden lg:inline"> {bottom}</span>
    </span>
);

// type TabIconProps = { className?: string };

const ActionCard = ({
    action,
    locked,
    onLockedTap,
}: {
    action: ActionDefinition;
    locked?: boolean;
    onLockedTap?: () => void;
}) => (
    <button
        type="button"
        onClick={locked ? onLockedTap : action.onClick}
        aria-label={locked ? "Locked - finish the group tour first" : undefined}
        className={`ui-accent-card group relative overflow-hidden rounded-[18px] border border-white/10 px-3 py-3 text-left shadow-sm transition sm:px-4 sm:py-4 lg:px-5 lg:py-5 ${locked ? "opacity-45" : ""
            }`}
    >
        <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-0 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-white sm:text-sm">
                {action.label}
            </p>
            <div className="ui-accent-card-icon">
                {action.icon}
            </div>
        </div>
        {locked && (
            <span
                aria-hidden
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] leading-none text-sky-200 ring-1 ring-sky-300/50"
            >
                <Image
                    src="/icons/lock.png"
                    alt="tutorial"
                    width={24}
                    height={24}
                    className="transition-transform p-[1px] duration-300 group-hover:scale-110"
                    draggable={false}
                />
            </span>
        )}
    </button>
);

const HomeTab = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const currentUser = useCurrentUser();
    const storedUser = getLocalStorage<CurrentUser>("currentUser");
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
    // The carousel container node kept in STATE: the div is destroyed and
    // recreated around the HomeTabSkeleton early-return, and effects keyed
    // only on orderedGroups.length miss that swap (a ref flipping null → node
    // re-runs nothing). State re-fires the carousel effects exactly when the
    // real container (re)mounts, so the scroll listener always lands on it.
    const [leagueCarouselEl, setLeagueCarouselEl] = useState<HTMLDivElement | null>(null);
    const [activeLeagueIndex, setActiveLeagueIndex] = useState(0);
    const [notifications, setNotificaitons] = useState<AppNotification[]>([]);
    const [page, setPage] = useState(1);
    const [groupPage, setGroupPage] = useState(1);
    const [activityTab, setActivityTab] = useState<ActivityTab>("posts");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const notificationCloseRef = useRef<HTMLButtonElement | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const limit = 10;

    // Home lists ALL the user's communities (leagues + arenas) via fetchAllGroups;
    // aliased to the existing local names so the rest of the component is unchanged.
    const { joinLoading, message, error, allGroupsHasMore: myGroupsHasMore, allGroups: myGroups, allGroupsLoading: groupLoading } = useSelector((state: GroupRootState) => state.group);
    const { postPicks, loading: pickLoader, message: pickMessage, hasMore } = useSelector((state: RootState) => state.pick);
    // The hub no longer renders the level bar / stat tiles, so only the intro
    // flags and the loading gate are read here. The progress fetch below still
    // hydrates the slice for the screens that do show those numbers.
    const { hasSeenIntro, loading: progressLoading } = useSelector((state: RootState) => state.progress);
    const { notification } = useSelector((state: RootState) => state.notifications);
    const { hasSeenWelcomeIntro, hasSeenGroupIntro } = useSelector((state: RootState) => state.progress);

    const actionsLocked = !hasSeenGroupIntro;
    const handleLockedActionTap = useCallback(() => {
        setToast({
            id: Date.now(),
            type: "info",
            message: "Tap the groups tab to continue the tour.",
            duration: 3000
        });
    }, [setToast]);

    const fetchData = useCallback((pageNum: number, customLimit?: number) => {
        const payload = { page: pageNum, limit: customLimit ?? limit };
        dispatch(fetchGlobalPendingTopHitPostsRequest(payload));
    }, [dispatch, limit]);

    useEffect(() => {
        if (!currentUserId) return;
        dispatch(fetchAllGroupsRequest({ page: 1, limit: 10 }));
        dispatch(fetchNotificationListRequest({}));
        fetchData(1);
        dispatch(fetchProgressByUserIdRequest({ user_id: currentUserId }));
        dispatch(fetchMyTutorialProgressRequest());
    }, [dispatch, currentUserId, fetchData]);

    useEffect(() => {
        if (pickLoader || !pickMessage) return;

        dispatch(clearFetchAllGlobalPostPicksMessage());
        fetchData(1, page * limit);
    }, [pickLoader, pickMessage, dispatch, page, limit, fetchData]);

    useEffect(() => {
        setShowOnboarding(!hasSeenIntro);
    }, [hasSeenIntro]);

    useEffect(() => {
        if (Array.isArray(notification)) {
            setNotificaitons(notification)
        };
    }, [notification]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

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
        if (!joinLoading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
            });
            setGroupPage(1);
            dispatch(fetchAllGroupsRequest({ page: 1, limit: 10 }));
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
    }, [setToast, dispatch, joinLoading, message, error, router]);

    const handleLoadMoreGroups = useCallback(() => {
        if (groupLoading || !myGroupsHasMore) return;
        const nextGroupPage = groupPage + 1;
        setGroupPage(nextGroupPage);
        dispatch(fetchAllGroupsRequest({ page: nextGroupPage, limit: 10 }));
    }, [groupLoading, myGroupsHasMore, groupPage, dispatch]);

    const sortedGroups = useMemo(() => {
        if (!Array.isArray(myGroups) || !myGroups.length) return [];

        const groups = myGroups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: GroupObject) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: GroupObject) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [myGroups, currentUser?.userId]);

    const orderedGroups = useMemo(
        () => [...sortedGroups].reverse(),
        [sortedGroups]
    );

    useEffect(() => {
        if (activeLeagueIndex >= orderedGroups.length - 2 && myGroupsHasMore && !groupLoading) {
            handleLoadMoreGroups();
        }
    }, [activeLeagueIndex, orderedGroups.length, myGroupsHasMore, groupLoading, handleLoadMoreGroups]);

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

    // Stable callback ref: keeps leagueCarouselRef in sync for the imperative
    // helpers below while publishing the node into state for the effects.
    const setLeagueCarouselNode = useCallback((node: HTMLDivElement | null) => {
        leagueCarouselRef.current = node;
        setLeagueCarouselEl(node);
    }, []);

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
        const container = leagueCarouselEl;
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
    }, [leagueCarouselEl, carouselGroups.length, orderedGroups.length, jumpCarouselToIndex]);

    useEffect(() => {
        const container = leagueCarouselEl;
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
    }, [leagueCarouselEl, orderedGroups.length, jumpCarouselToIndex]);

    useEffect(() => {
        const container = leagueCarouselEl;
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
    }, [leagueCarouselEl, orderedGroups.length]);

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
            router.push(getProfilePath(userId, currentUserId));
        },
        [currentUserId, router]
    );

    const handleOpenGroup = useCallback(
        (groupId: string) => {
            router.push(`/league/${groupId}`);
        },
        [router]
    );

    const handleCloseNotificationPopup = () => {
        dispatch(markNotificationReadRequest({}));
        setNotificationsOpen(false);
    };

    const unreadNotifications = useMemo(
        () => notifications.filter((notification) => !notification.is_read).length,
        [notifications]
    );

    useEffect(() => {
        if (!notificationsOpen || !currentUserId || unreadNotifications === 0) return;
        dispatch(markNotificationReadRequest({}));
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        notificationCloseRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setNotificationsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
        // Keyed on notificationsOpen — it used to key on the (now dead) activityTab
        // state, so opening the drawer never re-ran this and the body-scroll lock,
        // Escape handler and focus move all silently no-oped.
    }, [notificationsOpen, currentUserId, unreadNotifications, dispatch]);

    const handleClearAll = useCallback(() => {
        dispatch(clearAllNotificationRequest({}));
    }, [dispatch]);

    const handleCompleteWelcomeIntro = () => {
        // setShowOnboarding(false);
        // if (!hasSeenIntro) {
        //     dispatch(completeIntroRequest({}));
        // }
        dispatch(updateTutorialProgressRequest({ tutorial_key: "home" }));
    };

    const isInitialLoading = groupLoading || progressLoading;

    if (isInitialLoading) {
        return <HomeTabSkeleton />;
    }

    return (
        <div className="flex flex-col">
            <section className="relative -mx-5 overflow-hidden bg-[#050505] px-5 pb-5 pt-4 sm:-mx-6 sm:px-6 sm:pb-6 sm:pt-5 lg:pb-8 lg:pt-6">
                <button
                    type="button"
                    onClick={() => setNotificationsOpen(true)}
                    aria-label={`Open notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`}
                    aria-expanded={notificationsOpen}
                    className="absolute right-5 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-200 backdrop-blur transition hover:border-sky-300/50 hover:text-white sm:right-6 sm:top-6 lg:right-8 lg:top-8"
                >
                    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 21h4" strokeLinecap="round" />
                    </svg>
                    {unreadNotifications > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950" />
                    )}
                </button>
                <div className="relative z-10 flex flex-col gap-4 sm:gap-5 lg:gap-6">
                    <div className="max-w-xl pr-12">
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                            <span className="block">Welcome back,</span>
                            <span className="allow-caps block text-sky-100">
                                {storedUser?.username ?? "Member"}
                            </span>
                        </h1>
                    </div>
                    <div className="-mx-5 border-t border-white/10 px-5 pt-4 sm:-mx-6 sm:px-6 sm:pt-6">
                        <div className="mb-3 sm:mb-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:text-xs sm:tracking-[0.24em]">
                                Your groups
                            </p>
                        </div>
                        {sortedGroups.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-white/20 bg-white/5 p-4 text-[11px] text-gray-300 sm:p-5 sm:text-sm">
                                You are not in any groups yet. Start one and bring your crew together.
                            </div>
                        ) : (
                            <>
                                <div className="sm:hidden">
                                    <div
                                        ref={setLeagueCarouselNode}
                                        className="scrollbar-hide flex gap-3 overflow-x-auto px-0.5 scroll-px-0.5 scroll-smooth snap-x snap-mandatory"
                                    >
                                        {carouselGroups.map((group, index) => {
                                            const isClone =
                                                orderedGroups.length > 1 &&
                                                (index < orderedGroups.length ||
                                                    index >= orderedGroups.length * 2);
                                            const isArena = group.group_type === "arena";

                                            return (
                                                <div
                                                    key={`${group.id}-${index}`}
                                                    aria-hidden={isClone}
                                                    className={`${previewCardBaseClassName} min-w-full snap-center ${isArena
                                                        ? arenaPreviewCardToneClassName
                                                        : leaguePreviewCardToneClassName
                                                        }`}
                                                >
                                                    <div
                                                        aria-hidden
                                                        className={`pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full blur-2xl transition motion-reduce:transition-none ${isArena
                                                            ? "bg-violet-400/[0.1] group-hover/card:bg-violet-400/[0.15]"
                                                            : "bg-sky-400/[0.08] group-hover/card:bg-sky-400/[0.13]"
                                                            }`}
                                                    />
                                                    <Link
                                                        href={getGroupPath(group.group_type, group.id)}
                                                        tabIndex={isClone ? -1 : undefined}
                                                        aria-label={`Open ${group.name}`}
                                                        className={`absolute inset-0 rounded-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isArena
                                                            ? "focus-visible:outline-violet-300"
                                                            : "focus-visible:outline-sky-300"
                                                            }`}
                                                    />
                                                    <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                                                        <div
                                                            className={`flex min-w-0 flex-wrap items-center gap-1.5 text-gray-400 ${groupPreviewKickerTextClassName}`}
                                                        >
                                                            <GroupTypeMetaLabel
                                                                group={group}
                                                                ownerPlan={group.hosting_tier === "pro" ? "pro" : "free"}
                                                                textClassName={groupPreviewKickerTextClassName}
                                                                showTitle={false}
                                                            />
                                                            <span aria-hidden className="text-gray-600">
                                                                ·
                                                            </span>
                                                            <span className="text-gray-300">
                                                                {group.created_by === currentUserId ? "OWNER" : "MEMBER"}
                                                            </span>
                                                        </div>
                                                        <InviteCodeCopy
                                                            code={group?.invite_code}
                                                            accent={isArena ? "arena" : "league"}
                                                            tabIndex={isClone ? -1 : undefined}
                                                            className={`text-right ${isArena ? "text-violet-100" : ""}`}
                                                        />
                                                    </div>
                                                    <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center py-4">
                                                        <h3
                                                            className={`allow-caps line-clamp-2 break-words bg-clip-text text-xl font-extrabold leading-tight text-transparent sm:text-2xl ${isArena
                                                                ? "bg-gradient-to-r from-white via-violet-100 to-fuchsia-200"
                                                                : ""
                                                                }`}
                                                            style={isArena ? undefined : displayNameGradientStyle}
                                                        >
                                                            {group.name}
                                                        </h3>
                                                    </div>
                                                    <div
                                                        className={`pointer-events-none relative z-10 flex flex-wrap gap-2 ${isArena ? "text-gray-400" : "text-gray-500"
                                                            } ${groupPreviewMetaTextClassName}`}
                                                    >
                                                        <span>{getGroupCapacityLabel(group, group.member_count)}</span>
                                                        <span>
                                                            {getCombinedContestCapacityLabel(
                                                                group,
                                                                [],
                                                                []
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                                                        aria-label={`Go to group ${realIndex + 1}`}
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
                                    {orderedGroups.slice(0, 2).map((group) => {
                                        const isArena = group.group_type === "arena";

                                        return (
                                            <div
                                                key={group.id}
                                                className={`${previewCardBaseClassName} ${isArena
                                                    ? arenaPreviewCardToneClassName
                                                    : leaguePreviewCardToneClassName
                                                    }`}
                                            >
                                                <div
                                                    aria-hidden
                                                    className={`pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full blur-2xl transition motion-reduce:transition-none ${isArena
                                                        ? "bg-violet-400/[0.1] group-hover/card:bg-violet-400/[0.15]"
                                                        : "bg-sky-400/[0.08] group-hover/card:bg-sky-400/[0.13]"
                                                        }`}
                                                />
                                                <Link
                                                    href={getGroupPath(group.group_type, group.id)}
                                                    aria-label={`Open ${group.name}`}
                                                    className={`absolute inset-0 rounded-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isArena
                                                        ? "focus-visible:outline-violet-300"
                                                        : "focus-visible:outline-sky-300"
                                                        }`}
                                                />
                                                <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                                                    <div
                                                        className={`flex min-w-0 flex-wrap items-center gap-1.5 text-gray-400 ${groupPreviewKickerTextClassName}`}
                                                    >
                                                        <GroupTypeMetaLabel
                                                            group={group}
                                                            ownerPlan={group.hosting_tier === "pro" ? "pro" : "free"}
                                                            textClassName={groupPreviewKickerTextClassName}
                                                            // Dead inside pointer-events-none — see carousel card.
                                                            showTitle={false}
                                                        />
                                                        <span aria-hidden className="text-gray-600">
                                                            ·
                                                        </span>
                                                        <span className="text-gray-300">
                                                            {group.created_by === currentUserId ? "OWNER" : "MEMBER"}
                                                        </span>
                                                    </div>
                                                    <InviteCodeCopy
                                                        code={group?.invite_code}
                                                        accent={isArena ? "arena" : "league"}
                                                        className={`text-right ${isArena ? "text-violet-100" : ""}`}
                                                    />
                                                </div>
                                                <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center py-4">
                                                    <h3
                                                        className={`allow-caps line-clamp-2 break-words bg-clip-text text-xl font-extrabold leading-tight text-transparent sm:text-2xl ${isArena
                                                            ? "bg-gradient-to-r from-white via-violet-100 to-fuchsia-200"
                                                            : ""
                                                            }`}
                                                        style={isArena ? undefined : displayNameGradientStyle}
                                                    >
                                                        {group.name}
                                                    </h3>
                                                </div>
                                                <div
                                                    className={`pointer-events-none relative z-10 flex flex-wrap gap-2 ${isArena ? "text-gray-400" : "text-gray-500"
                                                        } ${groupPreviewMetaTextClassName}`}
                                                >
                                                    <span>{getGroupCapacityLabel(group, group.member_count)}</span>
                                                    <span>
                                                        {getCombinedContestCapacityLabel(
                                                            group,
                                                            [],
                                                            []
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section
                className="-mx-5 border-t border-white/10 px-5 pt-3 sm:-mx-6 sm:px-6 sm:pt-3.5"
                aria-label="Build a post"
            >
                <div className="mb-1 flex items-center justify-between gap-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                        pick builder
                    </p>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-sky-200/70">
                        live lines
                    </span>
                </div>
                <Suspense fallback={null}>
                    <PickBuilderClientPage compact />
                </Suspense>
            </section>

            <div className={`fixed inset-0 z-50 ${notificationsOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!notificationsOpen}>
                <button
                    type="button"
                    aria-label="Close notifications"
                    tabIndex={notificationsOpen ? 0 : -1}
                    onClick={handleCloseNotificationPopup}
                    className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity ${notificationsOpen ? "opacity-100" : "opacity-0"}`}
                />
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="notifications-drawer-title"
                    className={`absolute inset-y-0 left-0 right-0 flex max-w-none flex-col bg-slate-950 shadow-2xl transition-transform duration-300 sm:left-auto sm:w-full sm:max-w-md sm:border-l sm:border-white/10 ${notificationsOpen ? "translate-x-0" : "translate-x-full"}`}
                >
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">activity</p>
                            <h2 id="notifications-drawer-title" className="mt-1 text-lg font-semibold text-white">Notifications</h2>
                        </div>
                        <button ref={notificationCloseRef} type="button" onClick={handleCloseNotificationPopup} aria-label="Close notifications" tabIndex={notificationsOpen ? 0 : -1} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xl text-gray-300 transition hover:bg-white/10 hover:text-white">×</button>
                    </div>
                    <div className="flex items-center justify-end border-b border-white/10 px-5 py-2 sm:px-6">
                        {notificationsOpen && notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-gray-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:text-[10px] sm:tracking-[0.18em]"
                            >
                                <TrashIcon className={`h-3 w-3 shrink-0`} />
                                <span>clear all</span>
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                        <NotificationsFeed
                            onOpenProfile={handleViewProfile}
                            onOpenGroup={handleOpenGroup}
                        />
                    </div>
                </aside>
            </div >

            <OnboardingModal
                open={!hasSeenWelcomeIntro}
                steps={WELCOME_TUTORIAL}
                onClose={handleCompleteWelcomeIntro}
                finalCtaLabel="finish"
            />
            {
                joinOpen && (
                    <ModalShell onClose={closeJoinModal} maxWidthClass="max-w-sm">
                        <form onSubmit={handleJoin} className="space-y-4 text-center">
                            <div className="space-y-1">
                                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                    join a league or Arena
                                </p>
                                <p className="text-lg font-semibold text-white">Enter invite code</p>
                            </div>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(event) => {
                                    let value = event.target.value;
                                    value = value.replace(/\D/g, "").slice(0, 5);
                                    setJoinCode(value);
                                    setJoinError(null);
                                }}
                                maxLength={5}
                                inputMode="numeric"
                                placeholder="invite code"
                                autoFocus
                                className="ui-input-accent w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-base sm:text-sm text-white outline-none transition"
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
                                    className="ui-accent-button rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed"
                                    disabled={!joinCode || joinCode.length !== 5}
                                >
                                    Join
                                </button>
                            </div>
                        </form>
                    </ModalShell>
                )
            }

            {
                showScrollTop && (
                    <ScrollUpButton scrollToTop={scrollToTop} />
                )
            }
        </div >
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
