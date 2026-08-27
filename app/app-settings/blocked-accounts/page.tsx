"use client";

import Link from "next/link";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { clearUnblockUserMessage, fetchBlockedUsersRequest, unblockUserRequest } from "@/lib/redux/slices/authSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { UserIcon } from "@/components/layout/MainTabBar";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { Loader2 } from "lucide-react";
import ScrollUpButton from "@/components/ui/ScrollUpButton";
import BlockedAccountsSkeleton from "@/components/skeletons/app-settings/BlockedAccountsSkeleton";
import {
    SettingsHeader,
    SettingsPage,
    SettingsSection,
    settingsInputClassName,
    settingsPrimaryButtonClassName,
    settingsSecondaryButtonClassName,
    settingsTextButtonClassName,
} from "@/components/settings/SettingsUI";

const BlockedAccountsPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();

    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    /* Unblocking is one click away from undoing a deliberate safety decision,
     * so the MVP asks a second time in place of the row's own button. */
    const [pendingUnblockId, setPendingUnblockId] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const unblockButtonRefs = useRef(new Map<string, HTMLButtonElement>());
    const restoreUnblockFocusRef = useRef<string | null>(null);

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

    // Move focus onto the confirm the moment it appears, and put it back on the
    // row's own button if the confirmation is dismissed.
    useEffect(() => {
        if (pendingUnblockId) confirmButtonRef.current?.focus();
    }, [pendingUnblockId]);

    useEffect(() => {
        const userId = restoreUnblockFocusRef.current;
        if (pendingUnblockId || !userId) return;

        restoreUnblockFocusRef.current = null;
        unblockButtonRefs.current.get(userId)?.focus();
    }, [pendingUnblockId]);

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

    const rows = useMemo(() => blockedUsers ?? [], [blockedUsers]);

    /* THE SEARCH BOX ONLY EXISTS ONCE THE LIST IS WHOLE.
     *
     * The MVP filters an in-memory list, so its box always searches everything.
     * Here the roster arrives 10 at a time behind an IntersectionObserver, and a
     * filter over half a list answers "no matches" for accounts that are simply
     * on a page nobody has scrolled to yet. Gating on `hasMoreBlockedUsers`
     * keeps the control honest: short lists (the overwhelming majority) load
     * fully on page one and get the box immediately. */
    const searchable = !hasMoreBlockedUsers && rows.length > 0;
    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!searchable || !normalizedQuery) return rows;

        return rows.filter((row) =>
            `${row.blocked_user?.username ?? ""} ${row.blocked_user?.full_name ?? ""}`
                .toLowerCase()
                .includes(normalizedQuery)
        );
    }, [rows, query, searchable]);

    const handleUnblock = (targetUserId: string) => {
        setPendingUnblockId(null);
        if (targetUserId) {
            dispatch(unblockUserRequest({ blockedUserId: targetUserId }));
        }
    };

    const handleCancelUnblock = (userId: string) => {
        restoreUnblockFocusRef.current = userId;
        setPendingUnblockId(null);
    };

    if (!currentUser) return null;

    if (loading && rows.length === 0) {
        return <BlockedAccountsSkeleton />;
    }

    return (
        <SettingsPage className="pb-20">
            <SettingsHeader title="Blocked accounts" backHref="/app-settings" />

            <SettingsSection
                title={rows.length > 0 ? "Blocked members" : "No blocked accounts"}
                description={
                    rows.length > 0
                        ? `${rows.length}${hasMoreBlockedUsers ? "+" : ""} blocked account${rows.length === 1 && !hasMoreBlockedUsers ? "" : "s"}`
                        : "Accounts you block from a profile will appear here."
                }
                bodyClassName="space-y-4"
                layout="split"
            >
                {rows.length > 0 ? (
                    <>
                        {searchable ? (
                            <label className="block">
                                <span className="sr-only">Search blocked accounts</span>
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setPendingUnblockId(null);
                                    }}
                                    className={settingsInputClassName}
                                    placeholder="Search blocked accounts"
                                    autoComplete="off"
                                />
                            </label>
                        ) : null}

                        <p className="sr-only" role="status" aria-live="polite">
                            {filteredRows.length} blocked account
                            {filteredRows.length === 1 ? "" : "s"} shown.
                        </p>

                        {filteredRows.length > 0 ? (
                            <ul className="space-y-2" aria-label="Blocked accounts">
                                {filteredRows.map((user) => {
                                    const primaryLabel =
                                        user.blocked_user?.username ?? user.blocked_user?.full_name;
                                    const profilePath = getProfilePath(user.blocked_id, currentUser.userId);
                                    const memberProfilePicture = generateProfileImageUrl(
                                        user.blocked_user?.profile_image
                                    );
                                    const isConfirming = pendingUnblockId === user.blocked_id;

                                    return (
                                        <li
                                            key={user.id}
                                            className={`rounded-xl px-3 py-3 transition ${isConfirming
                                                ? "bg-white/[0.05] shadow-sm"
                                                : "bg-white/[0.02] hover:bg-white/[0.035]"
                                                }`}
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                                <Link
                                                    href={profilePath}
                                                    className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                                                >
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text)] shadow-sm">
                                                        {memberProfilePicture ? (
                                                            <Image
                                                                src={memberProfilePicture}
                                                                alt=""
                                                                width={56}
                                                                height={56}
                                                                className="h-10 w-10 rounded-full object-cover"
                                                                draggable={false}
                                                                onDragStart={(e) => e.preventDefault()}
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <UserIcon className="h-6 w-6 text-white/80" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-white">
                                                            @{primaryLabel}
                                                        </span>
                                                        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                                                            {user.blocked_user?.is_public
                                                                ? "Public profile"
                                                                : "Private profile"}
                                                        </span>
                                                    </span>
                                                </Link>

                                                {isConfirming ? (
                                                    <div
                                                        className="flex max-w-full flex-col gap-2 rounded-xl bg-white/[0.07] p-3 shadow-sm sm:items-end"
                                                        role="group"
                                                        aria-label={`Confirm unblock @${primaryLabel}`}
                                                    >
                                                        <p className="text-xs text-[var(--text-secondary)]">
                                                            Unblock @{primaryLabel}?
                                                        </p>
                                                        <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelUnblock(user.blocked_id)}
                                                                className={settingsTextButtonClassName}
                                                                aria-label={`Cancel unblocking @${primaryLabel}`}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                ref={confirmButtonRef}
                                                                type="button"
                                                                onClick={() => handleUnblock(user.blocked_id)}
                                                                className={settingsPrimaryButtonClassName}
                                                                aria-label={`Confirm unblocking @${primaryLabel}`}
                                                            >
                                                                Confirm
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        ref={(node) => {
                                                            if (node)
                                                                unblockButtonRefs.current.set(user.blocked_id, node);
                                                            else unblockButtonRefs.current.delete(user.blocked_id);
                                                        }}
                                                        type="button"
                                                        onClick={() => setPendingUnblockId(user.blocked_id)}
                                                        className={settingsSecondaryButtonClassName}
                                                        aria-label={`Unblock @${primaryLabel}`}
                                                    >
                                                        Unblock
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-xl bg-white/[0.02] px-4 py-8 text-center text-sm leading-6 text-[var(--text-secondary)]">
                                No blocked accounts match “{query.trim()}”.
                            </p>
                        )}

                        <div ref={observerTarget} className="flex justify-center py-2">
                            {loading && hasMoreBlockedUsers && (
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-500/60" />
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                        You have not blocked anyone. If you block an account later, you can manage
                        it here.
                    </p>
                )}

                <p className="text-sm leading-6 text-[var(--text-muted)]">
                    If you unblock a private account you were following before, you may need to
                    request access again.
                </p>
            </SettingsSection>

            {showScrollTop && <ScrollUpButton scrollToTop={scrollToTop} />}
        </SettingsPage>
    );
};

export default BlockedAccountsPage;
