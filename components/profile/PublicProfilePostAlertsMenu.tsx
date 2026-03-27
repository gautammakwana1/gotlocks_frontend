"use client";

import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { FollowersList, FollowingsList, PickSliceState, PostAlerts, Profile, ProgressState } from "@/lib/interfaces/interfaces";
import { disablePostAlertRequest, enablePostAlertRequest, fetchFollowersListByIdRequest, fetchFollowingListByIdRequest, fetchMemberProfileRequest, fetchPostAlertsRequest } from "@/lib/redux/slices/authSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";

type AuthSliceState = {
    user: {
        profile?: Profile | null;
    } | null;
    followers: FollowersList[] | null;
    followings: FollowingsList[] | null;
    postAlerts: PostAlerts[] | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage?: string;
};

type RootState = {
    user: AuthSliceState;
    pick: PickSliceState;
    progress: ProgressState;
};

type PublicProfilePostAlertsMenuProps = {
    targetUserId: string;
    mode: "self" | "public";
};

const PublicProfilePostAlertsMenu = ({
    targetUserId,
    mode,
}: PublicProfilePostAlertsMenuProps) => {
    const currentUser = useCurrentUser();
    const dispatch = useDispatch();
    const { setToast } = useToast();

    const { followings, postAlerts, user, error } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (!targetUserId) return;
        dispatch(fetchPostAlertsRequest({}));
    }, [targetUserId, dispatch]);

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

    const menuRef = useRef<HTMLDetailsElement | null>(null);
    const isCurrentlyFollowing = currentUser
        ? isFollowing(currentUser.userId, targetUserId)
        : false;
    const alertsEnabled = useMemo(() => {
        return postAlerts?.some(
            (alert) => alert.target_user_id === targetUserId
        ) ?? false;
    }, [postAlerts, targetUserId]);

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

    const handleTogglePostAlert = () => {
        if (!currentUser || !user) return;
        if (alertsEnabled && targetUserId) {
            dispatch(disablePostAlertRequest({ targetUserId: targetUserId }));
        } else {
            dispatch(enablePostAlertRequest({ targetUserId: targetUserId }));
        }
        return true;
    };

    if (!currentUser || !user || currentUser.userId === targetUserId || !isCurrentlyFollowing) {
        return null;
    }

    return (
        <details ref={menuRef} className="relative z-20">
            <summary
                aria-label="Post alerts"
                className={`flex h-7 w-7 cursor-pointer items-center justify-center transition sm:h-8 sm:w-8 [&::-webkit-details-marker]:hidden ${alertsEnabled ? "text-sky-200 hover:text-sky-100" : "text-white/80 hover:text-sky-100"
                    }`}
            >
                <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                >
                    <path
                        d="M14.5 18a2.5 2.5 0 0 1-5 0"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M6.5 16.5h11c-1.1-1.1-2-2.5-2-5.5a3.5 3.5 0 1 0-7 0c0 3-.9 4.4-2 5.5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {alertsEnabled ? <circle cx="18" cy="6" r="2.2" fill="currentColor" stroke="none" /> : null}
                </svg>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-max rounded-2xl border border-white/10 bg-black/80 p-2 text-xs uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                <button
                    type="button"
                    onClick={(event) => {
                        if (handleTogglePostAlert()) {
                            closeMenu(event);
                        }
                    }}
                    className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                >
                    <span>all posts</span>
                    <span className={alertsEnabled ? "text-sky-200" : "text-white/55"}>
                        {alertsEnabled ? "on" : "off"}
                    </span>
                </button>
            </div>
        </details>
    );
};

export default PublicProfilePostAlertsMenu;
