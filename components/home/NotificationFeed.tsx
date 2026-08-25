"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/utils/date";
import { AppNotification, GroupSelector, GroupType, RootState } from "@/lib/interfaces/interfaces";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotificationListRequest } from "@/lib/redux/slices/notificationSlice";
import { accpetFollowRequest, clearAccpetFollowMessage, clearDeclineFollowMessage, declineFollowRequest } from "@/lib/redux/slices/authSlice";
import { clearManagerRespondMessage, respondManagerInvitationRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import { UserIcon } from "../layout/MainTabBar";
import Image from "next/image";
import { generateProfileImageUrl } from "@/lib/utils/helpers";

type NotificationsFeedProps = {
    onOpenProfile: (userId: string) => void;
    /**
     * `groupType` is optional and only supplied where the notification actually
     * carries it (manager invitations put it in metadata). Without it the caller
     * keeps its League default, which is what every other notification means.
     */
    onOpenGroup: (groupId: string, groupType?: GroupType) => void;
};

/**
 * The manager-invitation payload, as `notifyManagerInvitationSent` writes it.
 *
 * This notification IS the invitee's decision surface — they hold no settings
 * screen for a role they do not have yet — so `invitation_id` travelling in
 * metadata is load-bearing, not incidental.
 */
type ManagerInvitationMetadata = {
    invitation_id?: string;
    invitation_status?: string;
    group_id?: string;
    group_type?: GroupType;
    expires_at?: string | null;
    decision?: string;
};

const NotificationsFeed = ({
    onOpenProfile,
    onOpenGroup,
}: NotificationsFeedProps) => {
    const currentUser = useCurrentUser();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [notifications, setNotificaitons] = useState<AppNotification[]>([]);
    const [page, setPage] = useState(1);
    const observer = useRef<IntersectionObserver | null>(null);
    const limit = 20;

    const { notification, loading, hasMore } = useSelector((state: RootState) => state.notifications);
    const { loading: authLoader, message: authMessage, error: authError } = useSelector((state: RootState) => state.user);
    // The invitee's half of the manager-invitation flow. Its own slot on the
    // group slice, so the owner's Settings panel — which can be mounted at the
    // same time as this drawer — does not toast these outcomes as well.
    const {
        managerRespondLoading,
        managerRespondInvitationId,
        managerRespondError,
        managerRespondMessage,
    } = useSelector((state: GroupSelector) => state.group);

    const fetchData = useCallback((pageNum: number) => {
        dispatch(fetchNotificationListRequest({ page: pageNum, limit }));
    }, [dispatch, limit]);

    useEffect(() => {
        if (!currentUser) return;
        setPage(1);
        fetchData(1);
    }, [fetchData, currentUser]);

    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
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
        if (Array.isArray(notification)) {
            setNotificaitons(notification)
        };
    }, [notification]);

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

    }, [authLoader, authMessage, authError, dispatch, setToast]);

    useEffect(() => {
        if (!managerRespondError && !managerRespondMessage) return;
        setToast({
            id: Date.now(),
            type: managerRespondError ? "error" : "success",
            message: managerRespondError ?? managerRespondMessage ?? "",
            duration: 4000,
        });
        dispatch(clearManagerRespondMessage());
    }, [managerRespondError, managerRespondMessage, dispatch, setToast]);

    /**
     * Accept or decline a manager invitation.
     *
     * `group_id` rides along so the saga can re-read the group whose role just
     * changed — on accept the caller becomes staff, and every staff-gated
     * control on that community's screen is drawn from `current_user_member`.
     */
    const handleManagerInvitationResponse = (
        meta: ManagerInvitationMetadata,
        groupId: string | null | undefined,
        accept: boolean
    ) => {
        if (!currentUser || !meta.invitation_id) return;
        dispatch(
            respondManagerInvitationRequest({
                invitation_id: meta.invitation_id,
                accept,
                group_id: meta.group_id ?? groupId ?? null,
            })
        );
    };

    const handleAccept = (requestId: string, notificationId: string) => {
        if (!currentUser) return;
        if (requestId) {
            dispatch(accpetFollowRequest({ requestId, notificationId }));
        }
    };

    const handleDecline = (requestId: string, notificationId: string) => {
        if (!currentUser) return;
        if (requestId) {
            dispatch(declineFollowRequest({ requestId, notificationId }));
        }
    };

    if (!notifications?.length) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-[var(--text-secondary)]">
                No notifications yet. Activity around your posts, follows, and leagues will land here.
            </div>
        );
    }

    return (
        <div className="-mx-5 divide-y divide-white/10 border-y border-white/10 sm:mx-0">
            {notifications.map((notification, index) => {
                const isLast = index === notifications.length - 1;
                const actor = notification.sender ?? null;
                const actorLabel = actor?.username ?? actor?.full_name ?? "gotlocks";
                const request = notification.follow_request_id ?? undefined;
                const requestPending =
                    notification.type === "follow_request" &&
                    notification.request_status === "pending" &&
                    Boolean(request);

                /* MANAGER INVITATION — the invitee's only decision surface.
                 *
                 * `invitation_status` is read from metadata rather than from the
                 * invitation itself because there is no invitee-scoped read for
                 * one: GET /group/manager-invitations is the OWNER's list and
                 * answers 403 here. Answering the invitation patches this value
                 * locally (resolveManagerInvitationNotification) so the buttons
                 * retire on the click. */
                const managerMeta = (notification.metadata ?? {}) as ManagerInvitationMetadata;
                const isManagerInvitation =
                    notification.type === "group_manager_invitation" &&
                    Boolean(managerMeta.invitation_id);
                const invitationPending =
                    isManagerInvitation && managerMeta.invitation_status === "pending";
                const invitationSettled =
                    isManagerInvitation &&
                    managerMeta.invitation_status &&
                    managerMeta.invitation_status !== "pending"
                        ? managerMeta.invitation_status
                        : null;
                const invitationBusy =
                    managerRespondLoading &&
                    managerRespondInvitationId === managerMeta.invitation_id;
                // Suppresses the "open …" shortcut while a decision is waiting,
                // exactly as a pending follow request does.
                const responsePending = requestPending || invitationPending;
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

                /* `group_type` only travels on the notifications that carry it —
                 * the manager pair. Everything else keeps the League default,
                 * which is what those notifications have always meant. */
                const groupType = managerMeta.group_type;
                const primaryAction =
                    notification.group_id && notification.type !== "follow_request"
                        ? {
                            label: groupType === "arena" ? "open arena" : "open league",
                            onClick: () =>
                                onOpenGroup(notification.group_id as string, groupType),
                        }
                        : null;

                const memberProfilePicture = generateProfileImageUrl(actor?.profile_image);

                return (
                    <div
                        key={notification.id}
                        ref={isLast ? lastItemRef : undefined}
                        className="px-5 py-4 sm:px-6"
                    >
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (notification.sender && notification.sender_id !== currentUser?.userId) {
                                        if (notification.sender_id) {
                                            onOpenProfile(notification.sender_id);
                                        }
                                    } else if (notification.group_id) {
                                        onOpenGroup(notification.group_id, groupType);
                                    }
                                }}
                                disabled={!notification.sender_id && !notification.group_id}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase text-white disabled:cursor-default disabled:opacity-100"
                            >
                                {actor ? (
                                    memberProfilePicture ? (
                                        <Image
                                            src={memberProfilePicture}
                                            alt="Profile image"
                                            width={52}
                                            height={52}
                                            className={`h-9 w-9 rounded-full object-cover`}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            unoptimized
                                        />
                                    ) : (
                                        <UserIcon className="h-6 w-6 text-white/80 sm:h-9 sm:w-9" />
                                    )
                                ) : (
                                    <UserIcon className="h-6 w-6 text-white/80 sm:h-8 sm:w-8" />
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
                                                <span className="ui-accent-badge rounded-full px-2 py-0.5 text-[9px]">
                                                    new
                                                </span>
                                            )}
                                            {notification.type === "follow_request" &&
                                                notification.request_status &&
                                                notification.request_status !== "pending" && (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/75">
                                                        {notification.request_status}
                                                    </span>
                                                )
                                            }
                                            {invitationSettled && (
                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/75">
                                                    {invitationSettled}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {primaryAction && !responsePending ? (
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
                                            onClick={() => handleAccept(notification.follow_request_id as string, notification.id as string)}
                                            className="ui-accent-button rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition"
                                        >
                                            accept
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDecline(notification.follow_request_id as string, notification.id as string)}
                                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10"
                                        >
                                            decline
                                        </button>
                                    </div>
                                ) : null}
                                {invitationPending ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={invitationBusy}
                                            onClick={() =>
                                                handleManagerInvitationResponse(
                                                    managerMeta,
                                                    notification.group_id,
                                                    true
                                                )
                                            }
                                            className="ui-accent-button rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {invitationBusy ? "working…" : "accept"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={invitationBusy}
                                            onClick={() =>
                                                handleManagerInvitationResponse(
                                                    managerMeta,
                                                    notification.group_id,
                                                    false
                                                )
                                            }
                                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
            {loading && notifications.length > 0 && (
                <>
                    <style>{`
                        @keyframes notifBounce {
                            0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                            50%       { transform: translateY(-8px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
                        }
                        .notif-dot { animation: notifBounce 0.9s infinite; }
                    `}</style>
                    <div className="flex items-center justify-center gap-2 px-5 py-4 sm:px-6">
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "160ms" }} />
                        <span className="notif-dot h-2 w-2 rounded-full bg-white/40" style={{ animationDelay: "320ms" }} />
                    </div>
                </>
            )}
            {!hasMore && !loading && notifications.length > 0 && (
                <div className="px-5 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/20 sm:px-6">
                    all caught up
                </div>
            )}
        </div>
    );
};

export default NotificationsFeed;
