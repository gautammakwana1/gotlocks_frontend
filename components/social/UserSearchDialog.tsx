"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { RootState, SearchUsers } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchSearchedUsersRequest } from "@/lib/redux/slices/socialSlice";
import Image from "next/image";
import { UserIcon } from "../layout/MainTabBar";
import { getLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { SearchIcon } from "../ui/SvgIcons";

type UserSearchDialogProps = {
    open: boolean;
    onClose: () => void;
};

const RECENT_SEARCH_LIMIT = 8;

const getSearchScore = (user: SearchUsers, query: string) => {
    if (!query) return 0;

    const username = (user.username ?? "").toLowerCase();
    let score = 0;

    if (username === query) score += 500;
    else if (username.startsWith(query)) score += 350;
    else if (username.includes(query)) score += 220;

    return score;
};

const UserSearchDialog = ({ open, onClose }: UserSearchDialogProps) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const [query, setQuery] = useState("");
    const [recentSearches, setRecentSearches] = useState<SearchUsers[]>([]);
    const [usersList, setUsersList] = useState<SearchUsers[]>([]);
    const [page, setPage] = useState(1);
    const observer = useRef<IntersectionObserver | null>(null);
    const [recentSearchesLoaded, setRecentSearchesLoaded] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());
    const lastQueryRef = useRef("");
    const cacheRef = useRef<Record<string, SearchUsers[]>>({});

    const { followings } = useSelector((state: RootState) => state.user);
    const { users, hasMore, loading } = useSelector((state: RootState) => state.social);

    const recentSearchStorageKey = currentUser
        ? `gotlocks:recent-user-searches:${currentUser.userId}`
        : null;

    useEffect(() => {
        if (!open) {
            setQuery("");
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose, open]);

    useEffect(() => {
        if (!open) return;

        const scrollBarWidth =
            window.innerWidth - document.documentElement.clientWidth;

        // Lock scroll while modal is open
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollBarWidth}px`;

        return () => {
            // Restore scroll when modal closes or unmounts
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            document.body.style.paddingRight = "";
        };
    }, [open]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const fetchData = useCallback((pageNum: number) => {
        if (!debouncedQuery || debouncedQuery.length < 2) return;
        dispatch(fetchSearchedUsersRequest({
            q: debouncedQuery,
            page: pageNum,
            limit: 10
        }));
    }, [dispatch, debouncedQuery]);

    useEffect(() => {
        if (
            debouncedQuery.length >= 2 &&
            debouncedQuery !== lastQueryRef.current
        ) {
            lastQueryRef.current = debouncedQuery;
            setPage(1);

            if (cacheRef.current[debouncedQuery]) {
                setUsersList(cacheRef.current[debouncedQuery]);
                return;
            }

            fetchData(1);
        }
    }, [debouncedQuery, fetchData]);

    useEffect(() => {
        if (Array.isArray(users)) {
            setUsersList(users);
            if (lastQueryRef.current && page === 1) {
                cacheRef.current[lastQueryRef.current] = users;
            }
        }
    }, [users, page]);

    const lastItemRef = useCallback((node: HTMLElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchData(nextPage);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, page, fetchData]);

    useEffect(() => {
        if (!recentSearchStorageKey) {
            setRecentSearches([]);
            setRecentSearchesLoaded(false);
            return;
        }

        try {
            const stored = getLocalStorage<SearchUsers[]>(recentSearchStorageKey);
            if (Array.isArray(stored)) {
                setRecentSearches(stored);
            }
        } catch (error) {
            console.error("Failed to load recent searches", error);
            setRecentSearches([]);
        } finally {
            setRecentSearchesLoaded(true);
        }
    }, [recentSearchStorageKey]);

    useEffect(() => {
        if (!recentSearchStorageKey || !recentSearchesLoaded) return;
        setLocalStorage(recentSearchStorageKey, recentSearches);
    }, [recentSearches, recentSearchStorageKey, recentSearchesLoaded]);

    const isFollowing = useCallback(
        (followerId: string | undefined, targetUserId: string | undefined): boolean => {
            if (!followerId || !targetUserId) return false;
            if (!Array.isArray(followings) || followings.length === 0) {
                return false;
            }

            return followings.some(
                (f) =>
                    f.follower_id === followerId &&
                    f.following_id === targetUserId
            );
        },
        [followings]
    );

    const visibleUsers = useMemo(() => {
        if (!currentUser) return [];

        return usersList.filter(
            (user) =>
                user.id !== currentUser.userId
        );
    }, [currentUser, usersList]);

    const sortedVisibleUsers = useMemo(() => {
        if (!currentUser) return [];

        return visibleUsers
            .slice()
            .sort((left, right) => left.username.localeCompare(right.username));
    }, [currentUser, visibleUsers]);

    const recentSearchesList = useMemo(() => {
        return recentSearches.slice(0, RECENT_SEARCH_LIMIT);
    }, [recentSearches]);

    const results = useMemo(() => {
        if (!currentUser || !deferredQuery) {
            return [];
        }

        return sortedVisibleUsers
            .map((user) => ({
                user,
                score: getSearchScore(user, deferredQuery),
            }))
            .filter((entry) => entry.score > 0)
            .sort((left, right) => {
                if (left.score !== right.score) {
                    return right.score - left.score;
                }
                return left.user.username.localeCompare(right.user.username);
            })
            .map((entry) => entry.user);
    }, [currentUser, deferredQuery, sortedVisibleUsers]);

    if (!open || !currentUser) return null;

    const handleSelectUser = (targetUserId: string, user: SearchUsers) => {
        setRecentSearches((prev) => {
            const filtered = prev.filter((u) => u.id !== targetUserId);
            return [user, ...filtered].slice(0, RECENT_SEARCH_LIMIT);
        });
        onClose();
        router.push(getProfilePath(targetUserId, currentUser.userId));
    };

    const hasQuery = deferredQuery.length > 0;
    const visibleList = hasQuery ? results : recentSearchesList;
    const showingRecentSearches = !hasQuery && recentSearchesList.length > 0;
    const handleClearRecentSearches = () => {
        setRecentSearches([]);
    };

    return (
        <div
            className="scrollbar-hide fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm sm:py-10"
            role="dialog"
            aria-modal="true"
            aria-label="Search members"
            onClick={onClose}
        >
            <div
                className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-2xl shadow-black/40 sm:max-h-[calc(100vh-5rem)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-white">find members</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:border-white/20 hover:text-white"
                    >
                        Close
                    </button>
                </div>

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <SearchIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search @username"
                        autoFocus
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
                    />
                </label>

                <div className="scrollbar-hide mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {showingRecentSearches ? (
                        <div className="flex items-center justify-between gap-3 px-1">
                            <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">
                                recent searches
                            </p>
                            <button
                                type="button"
                                onClick={handleClearRecentSearches}
                                className="text-[11px] font-medium tracking-[0.08em] text-[var(--text-muted)] transition hover:text-white"
                            >
                                clear
                            </button>
                        </div>
                    ) : null}

                    {visibleList.length > 0 ? (
                        visibleList.map((user, index) => {
                            const isLast = index === visibleList.length - 1 && hasQuery;
                            const following = isFollowing(currentUser.userId, user.id);
                            const username = user.username ?? user.full_name;
                            const memberProfilePicture = generateProfileImageUrl(user?.profile_image);

                            return (
                                <button
                                    key={user.id}
                                    ref={isLast ? lastItemRef : undefined}
                                    type="button"
                                    onClick={() => handleSelectUser(user.id, user)}
                                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                                            {memberProfilePicture ? (
                                                <Image
                                                    src={memberProfilePicture}
                                                    alt="Profile image"
                                                    width={56}
                                                    height={56}
                                                    className={`tracking-wide rounded-full object-cover h-10 w-10`}
                                                    draggable={false}
                                                    onDragStart={(e) => e.preventDefault()}
                                                    unoptimized
                                                />
                                            ) : (
                                                <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">@{username}</p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {following ? (
                                            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                                                Following
                                            </span>
                                        ) : null}
                                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                            {user.is_public ? "Public" : "Private"}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-[var(--text-secondary)]">
                            {hasQuery
                                ? `No members match "${query.trim()}".`
                                : "Start typing a username to search the platform. Selected profiles will appear here as recent searches."}
                        </div>
                    )}
                    {loading && visibleList.length > 0 && (
                        <div className="flex items-center justify-center gap-2 py-4">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "160ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "320ms" }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserSearchDialog;
