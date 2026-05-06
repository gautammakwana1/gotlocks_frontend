"use client";

import Link from "next/link";
import { useEffect, useCallback, useRef, useState } from "react";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { clearUnblockUserMessage, fetchBlockedUsersRequest, unblockUserRequest } from "@/lib/redux/slices/authSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { UserIcon } from "@/components/layout/MainTabBar";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { ArrowLeft, Loader2 } from "lucide-react";
import ScrollUpButton from "@/components/ui/ScrollUpButton";
import BlockedAccountsSkeleton from "@/components/skeletons/app-settings/BlockedAccountsSkeleton";

const BlockedAccountsPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();

    const [page, setPage] = useState(1);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    const { blockedUsers, loading, message, error, hasMoreBlockedUsers } = useSelector((state: RootState) => state.user);

    const fetchBlockedUsers = useCallback((pageNum: number) => {
        dispatch(fetchBlockedUsersRequest({ page: pageNum, limit: 10 }));
    }, [dispatch]);

    useEffect(() => {
        fetchBlockedUsers(1);
    }, [fetchBlockedUsers]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreBlockedUsers && !loading) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchBlockedUsers(nextPage);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMoreBlockedUsers, loading, page, fetchBlockedUsers]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    useEffect(() => {
        if (!loading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000
            })
            dispatch(clearUnblockUserMessage());
        }
        if (!loading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
            dispatch(clearUnblockUserMessage());
        }
    }, [dispatch, loading, message, error, setToast]);

    const handleUnblock = (targetUserId: string) => {
        if (targetUserId) {
            dispatch(unblockUserRequest({ blockedUserId: targetUserId }));
        }
    };

    if (!currentUser) return null;

    if (loading && (!blockedUsers || blockedUsers.length === 0)) {
        return <BlockedAccountsSkeleton />;
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 pb-20">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    <span className="flex items-center gap-2">
                        <ArrowLeft size={14} /> account settings
                    </span>
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Blocked accounts
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Review the members you have blocked and restore access whenever you want.
                </p>
            </header>

            {blockedUsers && blockedUsers?.length > 0 ? (
                <div className="space-y-3">
                    {blockedUsers.map((user) => {
                        const primaryLabel = user.blocked_user?.username ?? user.blocked_user?.full_name;
                        const profilePath = getProfilePath(user.blocked_id, currentUser.userId);
                        const memberProfilePicture = generateProfileImageUrl(user.blocked_user?.profile_image);

                        return (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
                            >
                                <Link
                                    href={profilePath}
                                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition hover:bg-white/5"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
                                        {memberProfilePicture ? (
                                            <Image
                                                src={memberProfilePicture}
                                                alt="Profile image"
                                                width={56}
                                                height={56}
                                                className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                                draggable={false}
                                                onDragStart={(e) => e.preventDefault()}
                                                unoptimized
                                            />
                                        ) : (
                                            <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--app-text)] transition group-hover:text-white">
                                            @{primaryLabel}
                                        </p>
                                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                            {user.blocked_user?.is_public ? "public profile" : "private profile"}
                                        </p>
                                    </div>
                                </Link>

                                <div className="ml-auto flex shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleUnblock(user.blocked_id)}
                                        className="ui-accent-button rounded-full px-3 py-2 text-sm font-medium transition"
                                    >
                                        Unblock
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={observerTarget} className="flex justify-center py-4">
                        {loading && hasMoreBlockedUsers && (
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500/60" />
                        )}
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-[var(--text-secondary)]">
                        You have not blocked any members. If you block someone from their profile,
                        they will appear here for easy unblocking later.
                    </div>
                )
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[var(--text-secondary)]">
                If you unblock a private account you were following before, you may need to
                request access again.
            </div>

            <Link
                href="/app-settings"
                className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm lowercase text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
            >
                back
            </Link>

            {showScrollTop && (
                <ScrollUpButton scrollToTop={scrollToTop} />
            )}
        </div>
    );
};

export default BlockedAccountsPage;
