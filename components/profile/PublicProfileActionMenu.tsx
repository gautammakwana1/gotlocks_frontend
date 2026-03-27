"use client";

import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { BlockedUsers, FollowersList, FollowingsList, PickSliceState, Profile, ProgressState } from "@/lib/interfaces/interfaces";
import { blockUserRequest, fetchBlockedUsersRequest, fetchFollowersListByIdRequest, fetchFollowingListByIdRequest, fetchMemberProfileRequest, unblockUserRequest } from "@/lib/redux/slices/authSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";

type AuthSliceState = {
    user: {
        profile?: Profile | null;
    } | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage?: string;
    blockedUsers: BlockedUsers[] | null;
    followers: FollowersList[] | null;
    followings: FollowingsList[] | null;
};

type RootState = {
    user: AuthSliceState;
    pick: PickSliceState;
    progress: ProgressState;
};

type PublicProfileActionsMenuProps = {
    targetUserId: string;
    mode: "self" | "public";
};

const PublicProfileActionsMenu = ({ targetUserId, mode }: PublicProfileActionsMenuProps) => {
    const currentUser = useCurrentUser();
    const dispatch = useDispatch();
    const { setToast } = useToast();

    const { blockedUsers, user, followings } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (!targetUserId) return;
        dispatch(fetchBlockedUsersRequest({}));
    }, [targetUserId]);

    const menuRef = useRef<HTMLDetailsElement | null>(null);
    const [showBlockWarning, setShowBlockWarning] = useState(false);
    const currentlyBlocked = useMemo(() => {
        if (!blockedUsers || !targetUserId) return false;

        return blockedUsers.some(
            (block) => block.blocked_id === targetUserId
        );
    }, [blockedUsers, targetUserId]);

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

    const shouldWarnOnBlock =
        Boolean(currentUser && user && !currentlyBlocked && !user.profile?.is_public) &&
        isFollowing(currentUser?.userId ?? "", targetUserId);

    useEffect(() => {
        const handleClick = (event: globalThis.MouseEvent) => {
            const menu = menuRef.current;
            if (!menu?.open) return;
            const targetNode = event.target instanceof Node ? event.target : null;
            if (targetNode && menu.contains(targetNode)) return;
            menu.open = false;
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || !menuRef.current?.open) return;
            menuRef.current.open = false;
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const closeMenu = (event: ReactMouseEvent<HTMLElement>) => {
        const details = event.currentTarget.closest("details");
        if (details instanceof HTMLDetailsElement) {
            details.open = false;
        }
    };

    const closeMenuRef = () => {
        if (menuRef.current) {
            menuRef.current.open = false;
        }
    };

    const copyTextToClipboard = (value: string) => {
        if (typeof document === "undefined") {
            throw new Error("Clipboard unavailable.");
        }
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
            throw new Error("Copy failed.");
        }
    };

    const handleCopyProfileUrl = async () => {
        if (typeof window === "undefined") return;
        const profileUrl = new URL(`/user/${targetUserId}`, window.location.origin).toString();
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(profileUrl);
            } else {
                copyTextToClipboard(profileUrl);
            }
            setToast({ id: Date.now(), type: "success", message: "Profile URL copied.", duration: 3000 });
        } catch {
            setToast({ id: Date.now(), type: "error", message: "Unable to copy profile URL.", duration: 3000 });
        }
    };

    const handleToggleBlockUser = () => {
        if (!currentUser || !user) return;
        if (currentlyBlocked && targetUserId) {
            dispatch(unblockUserRequest({ blockedUserId: targetUserId }));
        } else {
            dispatch(blockUserRequest({ blockedUserId: targetUserId }));
        }
        return true;
    };

    if (!currentUser || !user || currentUser.userId === targetUserId) {
        return null;
    }

    return (
        <>
            <details ref={menuRef} className="relative z-20">
                <summary
                    aria-label="Profile actions"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center text-white/80 transition hover:text-sky-100 sm:h-8 sm:w-8 [&::-webkit-details-marker]:hidden"
                >
                    <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                    >
                        <circle cx="5" cy="12" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="19" cy="12" r="1.8" />
                    </svg>
                </summary>
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                    <button
                        type="button"
                        onClick={(event) => {
                            if (shouldWarnOnBlock) {
                                closeMenu(event);
                                setShowBlockWarning(true);
                                return;
                            }
                            if (handleToggleBlockUser()) {
                                closeMenu(event);
                            }
                        }}
                        className="flex w-full items-center justify-end rounded-xl px-3 py-2 text-right text-red-200 transition hover:bg-white/10"
                    >
                        {currentlyBlocked ? "unblock" : "block"}
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            void handleCopyProfileUrl();
                            closeMenu(event);
                        }}
                        className="mt-1 flex w-full items-center justify-end rounded-xl px-3 py-2 text-right transition hover:bg-white/10"
                    >
                        copy profile url
                    </button>
                </div>
            </details>
            {showBlockWarning ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setShowBlockWarning(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-4">
                            <div className="space-y-1 text-center">
                                <h3 className="text-base font-semibold text-white">Block private profile?</h3>
                                <p className="text-xs text-gray-400">
                                    Blocking this private profile will remove you as a follower. If you
                                    unblock later, you&apos;ll need to request to follow again.
                                </p>
                            </div>
                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBlockWarning(false)}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (handleToggleBlockUser()) {
                                            closeMenuRef();
                                            setShowBlockWarning(false);
                                        }
                                    }}
                                    className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                                >
                                    Block
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default PublicProfileActionsMenu;
