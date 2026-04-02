"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { clearUnblockUserMessage, fetchBlockedUsersRequest, unblockUserRequest } from "@/lib/redux/slices/authSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { UserIcon } from "@/components/layout/MainTabBar";

const BlockedAccountsPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();

    const { blockedUsers, loading, message, error } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        dispatch(fetchBlockedUsersRequest({}));
    }, [dispatch]);

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
    }, [dispatch, loading, message, error]);

    const handleUnblock = (targetUserId: string) => {
        if (targetUserId) {
            dispatch(unblockUserRequest({ blockedUserId: targetUserId }));
        }
    };

    if (!currentUser) return null;

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    account settings
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
                        const memberProfilePicture = user.blocked_user?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${user.blocked_user?.profile_image}` : undefined;

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
                                        className="rounded-full border border-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/10"
                                    >
                                        Unblock
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-[var(--text-secondary)]">
                    You have not blocked any members. If you block someone from their profile,
                    they will appear here for easy unblocking later.
                </div>
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
        </div>
    );
};

export default BlockedAccountsPage;
