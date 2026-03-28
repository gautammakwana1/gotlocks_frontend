"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/utils/date";
import { AppNotification, RootState } from "@/lib/interfaces/interfaces";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotificationListRequest } from "@/lib/redux/slices/notificationSlice";
import { accpetFollowRequest, clearAccpetFollowMessage, clearDeclineFollowMessage, declineFollowRequest } from "@/lib/redux/slices/authSlice";
import { useToast } from "@/lib/state/ToastContext";

type NotificationsFeedProps = {
    onOpenProfile: (userId: string) => void;
    onOpenGroup: (groupId: string) => void;
};

const buildInitials = (label: string) => {
    const cleaned = label.trim();
    if (!cleaned) return "GL";
    const segments = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const source = segments.length ? segments : [cleaned];
    return source
        .map((segment) => segment.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

const NotificationsFeed = ({
    onOpenProfile,
    onOpenGroup,
}: NotificationsFeedProps) => {
    const currentUser = useCurrentUser();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [notifications, setNotificaitons] = useState<AppNotification[]>([]);

    const { notification, loading, message, error } = useSelector((state: RootState) => state.notifications);
    const { loading: authLoader, message: authMessage, error: authError } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (Array.isArray(notification)) {
            setNotificaitons(notification)
        };
    }, [notification]);

    // useEffect(() => {
    //     if (!loading && message) {
    //         setToast({
    //             id: Date.now(),
    //             type: "success",
    //             message: message,
    //             duration: 3000
    //         })
    //         dispatch(clearAccpetFollowMessage());
    //     };
    //     if (!loading && error) {
    //         setToast({
    //             id: Date.now(),
    //             type: "error",
    //             message: error,
    //             duration: 3000
    //         })
    //         dispatch(clearAccpetFollowMessage());
    //     };

    // }, [loading, message, error, dispatch]);

    useEffect(() => {
        if (!authLoader && authMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: authMessage,
                duration: 3000
            })
            dispatch(clearAccpetFollowMessage());
        };
        if (!authLoader && authError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: authError,
                duration: 3000
            })
            dispatch(clearDeclineFollowMessage());
        };

    }, [authLoader, authMessage, authError, dispatch]);

    const handleAccept = (requestId: string) => {
        if (!currentUser) return;
        if (requestId) {
            dispatch(accpetFollowRequest({ requestId }));
        }
    };

    const handleDecline = (requestId: string) => {
        if (!currentUser) return;
        if (requestId) {
            dispatch(declineFollowRequest({ requestId }));
        }
    };

    if (!notifications?.length) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-[var(--text-secondary)]">
                No notifications yet. Activity around your posts, follows, and groups will land here.
            </div>
        );
    }

    return (
        <div className="-mx-5 divide-y divide-white/10 border-y border-white/10 sm:mx-0">
            {notifications.map((notification) => {
                const actor = notification.sender ?? null;
                const actorLabel = actor?.username ?? actor?.full_name ?? "gotLocks";
                const initials = buildInitials(actorLabel);
                const request = notification.follow_request_id ?? undefined;
                const requestPending =
                    notification.type === "follow_request" &&
                    notification.follow_request?.status === "pending" &&
                    Boolean(request);
                const canOpenActorProfile = Boolean(
                    notification.sender && notification.sender_id !== currentUser?.userId
                );
                const actorMessagePrefix = actor ? actorLabel : "";
                const messageStartsWithActor =
                    canOpenActorProfile &&
                    actorMessagePrefix.length > 0 &&
                    notification.message.startsWith(actorMessagePrefix);
                const actorMessageRemainder = messageStartsWithActor
                    ? notification.message.slice(actorMessagePrefix.length)
                    : notification.message;

                const primaryAction =
                    notification.group_id && notification.type !== "follow_request"
                        ? {
                            label: "open group",
                            onClick: () => onOpenGroup(notification.group_id as string),
                        }
                        : null;

                const memberProfilePicture = actor.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${actor.profile_image}` : undefined;

                return (
                    <div key={notification.id} className="px-5 py-4 sm:px-6">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (notification.sender && notification.sender_id !== currentUser?.userId) {
                                        if (notification.sender_id) {
                                            onOpenProfile(notification.sender_id);
                                        }
                                    } else if (notification.group_id) {
                                        onOpenGroup(notification.group_id);
                                    }
                                }}
                                disabled={!notification.sender_id && !notification.group_id}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase text-white disabled:cursor-default disabled:opacity-100"
                            >
                                {actor ? (
                                    memberProfilePicture ? (
                                        <img
                                            src={memberProfilePicture}
                                            alt={`${actorLabel} avatar`}
                                            className="h-full w-full rounded-full object-cover"
                                        />
                                    ) : (
                                        initials
                                    )
                                ) : (
                                    "GL"
                                )}
                            </button>
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm leading-6 text-white">
                                            {messageStartsWithActor && notification.sender_id ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenProfile(notification.sender_id as string)}
                                                        className="inline font-semibold text-white transition hover:text-sky-200"
                                                    >
                                                        {actorMessagePrefix}
                                                    </button>
                                                    {actorMessageRemainder}
                                                </>
                                            ) : (
                                                notification.message
                                            )}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                            <span>{formatDateTime(notification.created_at)}</span>
                                            {!notification.is_read && (
                                                <span className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] text-emerald-100">
                                                    new
                                                </span>
                                            )}
                                            {notification.type === "follow_request" &&
                                                notification.follow_request?.status &&
                                                notification.follow_request?.status !== "pending" && (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/75">
                                                        {notification.follow_request?.status}
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                    {primaryAction && !requestPending ? (
                                        <button
                                            type="button"
                                            onClick={primaryAction.onClick}
                                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10"
                                        >
                                            {primaryAction.label}
                                        </button>
                                    ) : null}
                                </div>
                                {requestPending ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAccept(notification.follow_request_id as string)}
                                            className="rounded-lg border border-emerald-300/50 bg-emerald-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-200/70"
                                        >
                                            accept
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDecline(notification.follow_request_id as string)}
                                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10"
                                        >
                                            decline
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationsFeed;
