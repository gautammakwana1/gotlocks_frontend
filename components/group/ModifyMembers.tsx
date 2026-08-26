"use client";

import { useEffect, useMemo, useState } from "react";
import { CurrentUser, GroupSelector, Member } from "@/lib/interfaces/interfaces";
import Link from "next/link";
import Image from "next/image";
import { UserIcon } from "../layout/MainTabBar";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@/lib/state/ToastContext";
import { clearLeaveGroupMessage, fetchGroupMembersByGroupIdRequest } from "@/lib/redux/slices/groupsSlice";
import useScopedGroup from "@/lib/groups/useScopedGroup";
import { useRouter } from "next/navigation";
import MembersSkeleton from "../skeletons/leagues/MembersSkeleton";
import {
    getMemberDirectoryAvatarClassName,
    getMemberDirectoryCardClassName,
    MemberDirectorySearch,
    MemberDirectoryViewToggle,
    memberDirectoryGridClassName,
    memberDirectoryListClassName,
    memberDirectoryPanelClassName,
    type MemberDirectoryAccent,
    type MemberDirectoryView,
} from "../community/MemberDirectoryControls";

export type MemberRole = "commissioner" | "member";

export type MemberWithRole = Member & {
    isOwner?: boolean;
};

type Props = {
    currentUser: CurrentUser | null;
    // members: MemberWithRole[];
    onRemoveMember: (
        userId: string
    ) => Promise<{ success: boolean; error?: string }>;
    onMakeCommissioner: (
        newCommissionerId: string
    ) => Promise<{ success: boolean; error?: string }>;
    onLeaveGroup?: () => void;
    leavingGroup?: boolean;
    groupId: string;
    accent?: MemberDirectoryAccent;
    /**
     * Where a member row links. Supply this to open the group-scoped member CARD
     * instead of the global profile — the card is what the League page uses, and
     * it links onward to the global profile from its own header.
     */
    getMemberHref?: (member: MemberWithRole) => string;
};

type ActionState = {
    removing?: boolean;
    promoting?: boolean;
    error?: string;
};

const formatDisplayName = (value?: string) => {
    if (!value) return "";
    const normalized = value.trim().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isActionFailure = (
    result: unknown
): result is { success: false; error?: string } =>
    Boolean(
        result &&
        typeof result === "object" &&
        "success" in (result as { success?: boolean }) &&
        (result as { success?: boolean }).success === false
    );

const MemberActions = ({
    showPromote,
    showLeave,
    disablePromote,
    onPromote,
    onLeave,
    leavingGroup,
    state,
}: {
    showPromote: boolean;
    showLeave: boolean;
    disablePromote: boolean | undefined;
    onPromote: () => void;
    onLeave: () => void;
    leavingGroup?: boolean;
    state?: ActionState;
}) => (
    <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-2">
        {state?.error && (
            <p className="text-[9px] leading-tight text-red-300">{state.error}</p>
        )}
        {showLeave && (
            <button
                type="button"
                onClick={onLeave}
                disabled={leavingGroup}
                className="w-full rounded-md border border-red-500/30 bg-gradient-to-br from-red-900/70 via-red-700/40 to-black/40 px-2 py-1 text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-white transition hover:border-red-400/40 hover:from-red-800/80 hover:via-red-600/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {leavingGroup ? "Leaving..." : "Leave group"}
            </button>
        )}
    </div>
);

const MemberCard = ({
    member,
    memberHref,
    memberLinkLabel,
    isCommissioner,
    accent,
    state,
    onRemove,
    onLeave,
    onPromote,
    disableRemove,
    disablePromote,
    showRemove,
    showPromote,
    showLeave,
    leavingGroup,
}: {
    member: MemberWithRole;
    memberHref: string;
    memberLinkLabel: string;
    isCommissioner: boolean;
    accent: MemberDirectoryAccent;
    state?: ActionState;
    onRemove: () => void;
    onLeave: () => void;
    onPromote: () => void;
    disableRemove: boolean | undefined;
    disablePromote: boolean | undefined;
    showRemove: boolean;
    showPromote: boolean;
    showLeave: boolean;
    leavingGroup?: boolean;
}) => {
    const displayName = formatDisplayName(member.profiles?.username);
    const memberProfileImage = generateProfileImageUrl(member.profiles?.profile_image);
    const showActions = showPromote || showLeave || Boolean(state?.error);

    return (
        <article role="listitem" className={getMemberDirectoryCardClassName(accent)}>
            {showRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disableRemove}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-gray-300 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remove ${displayName || "member"}`}
                >
                    X
                </button>
            )}
            <div className="flex flex-1 flex-col items-center gap-3 pt-3">
                <Link
                    href={memberHref}
                    className={getMemberDirectoryAvatarClassName(accent, "card")}
                    aria-label={memberLinkLabel}
                >
                    {/* The MVP renders initials because its mock users carry no
                        avatar; this app has real ones, so the image wins and the
                        icon is the fallback. */}
                    {memberProfileImage ? (
                        <Image
                            src={memberProfileImage}
                            alt=""
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            unoptimized
                        />
                    ) : (
                        <UserIcon className="h-8 w-8 text-white/80 sm:h-9 sm:w-9" />
                    )}
                </Link>
                <div className="min-w-0 max-w-full text-center">
                    <p className="truncate text-sm font-semibold text-white">
                        {displayName || "Member"}
                    </p>
                    {/* Every member states a role, not just the owner — a card
                        with a blank line under the name reads as missing data. */}
                    <p
                        className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${isCommissioner ? "text-amber-200" : "text-gray-500"
                            }`}
                    >
                        {isCommissioner ? "Owner" : "Member"}
                    </p>
                </div>
            </div>
            {showActions && (
                <MemberActions
                    showPromote={showPromote}
                    showLeave={showLeave}
                    disablePromote={disablePromote}
                    onPromote={onPromote}
                    onLeave={onLeave}
                    leavingGroup={leavingGroup}
                    state={state}
                />
            )}
        </article>
    );
};

// Compact row used by the "List" view. Same actions as the card, laid out
// horizontally so more members fit on screen.
const MemberRow = ({
    member,
    memberHref,
    memberLinkLabel,
    isCommissioner,
    accent,
    state,
    onRemove,
    onLeave,
    onPromote,
    disableRemove,
    disablePromote,
    showRemove,
    showPromote,
    showLeave,
    leavingGroup,
}: {
    member: MemberWithRole;
    memberHref: string;
    memberLinkLabel: string;
    isCommissioner: boolean;
    accent: MemberDirectoryAccent;
    state?: ActionState;
    onRemove: () => void;
    onLeave: () => void;
    onPromote: () => void;
    disableRemove: boolean | undefined;
    disablePromote: boolean | undefined;
    showRemove: boolean;
    showPromote: boolean;
    showLeave: boolean;
    leavingGroup?: boolean;
}) => {
    const displayName = formatDisplayName(member.profiles?.username) || "Member";
    const memberProfileImage = generateProfileImageUrl(member.profiles?.profile_image);

    return (
        <li className="flex min-h-16 items-center gap-3 py-2.5">
            {/* Avatar AND name share one link, so the whole left half of the row
                is the tap target rather than just the 40px avatar. */}
            <Link
                href={memberHref}
                aria-label={memberLinkLabel}
                className={`flex min-w-0 flex-1 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${accent === "arena" ? "focus-visible:outline-violet-300" : "focus-visible:outline-blue-400"
                    }`}
            >
                <span aria-hidden className={getMemberDirectoryAvatarClassName(accent, "list")}>
                    {memberProfileImage ? (
                        <Image
                            src={memberProfileImage}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            unoptimized
                        />
                    ) : (
                        <UserIcon className="h-5 w-5 text-white/80" />
                    )}
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                        {displayName}
                    </span>
                    <span
                        className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.16em] ${isCommissioner ? "text-amber-200" : "text-gray-500"
                            }`}
                    >
                        {isCommissioner ? "Owner" : "Member"}
                    </span>
                    {state?.error ? (
                        <span className="mt-1 block text-xs text-red-300" role="alert">
                            {state.error}
                        </span>
                    ) : null}
                </span>
            </Link>

            {/* Borderless, 44px-tall hit targets — the row already separates
                itself with a divider, so bordered pills read as noise here. */}
            <div className="flex shrink-0 items-center gap-1">
                {showPromote && (
                    <button
                        type="button"
                        disabled={disablePromote}
                        onClick={onPromote}
                        className={`min-h-11 px-2 text-[9px] font-semibold uppercase tracking-[0.1em] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-[10px] ${accent === "arena" ? "text-violet-100" : "text-sky-100"
                            }`}
                    >
                        {state?.promoting ? "Working..." : "Make owner"}
                    </button>
                )}
                {showLeave && (
                    <button
                        type="button"
                        onClick={onLeave}
                        disabled={leavingGroup}
                        className="min-h-11 px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-200 transition hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-[10px]"
                    >
                        {leavingGroup ? "Leaving..." : "Leave"}
                    </button>
                )}
                {showRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disableRemove}
                        aria-label={`Remove ${displayName}`}
                        className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold text-gray-500 transition hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ×
                    </button>
                )}
            </div>
        </li>
    );
};

export const ModifyMembers = ({
    currentUser,
    onRemoveMember,
    onMakeCommissioner,
    onLeaveGroup,
    leavingGroup,
    groupId,
    accent = "league",
    getMemberHref,
}: Props) => {
    const router = useRouter();
    const { setToast } = useToast();
    const dispatch = useDispatch();
    const [actionState, setActionState] = useState<Record<string, ActionState>>({});
    const [view, setView] = useState<MemberDirectoryView>("cards");
    const [search, setSearch] = useState("");
    const [pendingAction, setPendingAction] = useState<
        { member: MemberWithRole; kind: "remove" | "promote" | "leave" } | null
    >(null);
    const [confirming, setConfirming] = useState(false);

    const { members: groupMembers, loadingMembers, membersPagination, leaveLoading, leaveMessage } = useSelector((state: GroupSelector) => state.group);
    // Only ever read the shared group slot when the record is the one `groupId`
    // asked for. This component is mounted by a group screen and is only used for
    // the owner check below, so a leftover record from the previously viewed group
    // would silently crown the wrong member "owner" on the first commit after a
    // navigation. See useScopedGroup for why `loading` cannot cover that commit.
    const { group } = useScopedGroup(groupId);

    useEffect(() => {
        if (!groupId) return;

        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: groupId,
                page: 1,
                limit: 12,
            })
        );
    }, [groupId, dispatch]);

    useEffect(() => {
        if (!leaveLoading && leaveMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: leaveMessage,
                duration: 3000,
            });
            dispatch(clearLeaveGroupMessage());
            router.replace("/fantasy");
        }
    }, [leaveLoading, dispatch, leaveMessage, router, setToast]);

    const handleLoadMore = () => {
        if (!groupId || !membersPagination || loadingMembers) return;
        if (membersPagination.page >= membersPagination.total_pages) return;

        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: groupId,
                page: membersPagination.page + 1,
                limit: 12,
            })
        );
    };

    const displayMembers = useMemo(() => {
        const source = groupMembers && groupMembers.length > 0 ? groupMembers : [];
        return source.map((member) => ({
            ...member,
            isOwner: member.user_id === group?.created_by,
        }));
    }, [groupMembers, group?.created_by]);

    // Members arrive server-paginated, so this filters the pages already loaded.
    // Add a `search` param to GET /group/members/:group_id to search the full set.
    const visibleMembers = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return displayMembers;

        return displayMembers.filter((member) =>
            (member.profiles?.username ?? "").toLowerCase().includes(normalizedSearch)
        );
    }, [displayMembers, search]);

    const canManage = useMemo(() => {
        const source = groupMembers && groupMembers.length > 0 ? groupMembers : [];
        return source.some(
            (member) =>
                member.user_id === currentUser?.userId &&
                member.role === "commissioner"
        );
    }, [currentUser?.userId, groupMembers]);

    const updateActionState = (memberId: string, updates: Partial<ActionState>) => {
        setActionState((prev) => ({
            ...prev,
            [memberId]: { ...prev[memberId], ...updates },
        }));
    };

    const handleRemove = async (member: MemberWithRole) => {
        if (!canManage) return;
        if (!member.user_id) return;
        if (member.role === "commissioner" || member.isOwner) {
            if (member.user_id) {
                updateActionState(member.user_id, {
                    removing: false,
                    error: "Owners cannot be removed.",
                });
            }
            return;
        }
        if (member.user_id === currentUser?.userId) {
            if (member.user_id) {
                updateActionState(member.user_id, {
                    removing: false,
                    error: "You cannot remove yourself.",
                });
            }
            return;
        }
        updateActionState(member.user_id, { removing: true, error: undefined });
        try {
            const result = await Promise.resolve(onRemoveMember(member.user_id));
            if (isActionFailure(result)) {
                updateActionState(member.user_id, {
                    removing: false,
                    error: result.error ?? "Unable to remove member.",
                });
                return;
            }
            updateActionState(member.user_id, { removing: false, error: undefined });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unable to remove member.";
            updateActionState(member.user_id, { removing: false, error: message });
        }
    };

    const handlePromote = async (member: MemberWithRole) => {
        if (!canManage || member.role === "commissioner") return;
        if (!member.user_id) return;
        updateActionState(member.user_id, { promoting: true, error: undefined });
        try {
            const result = await Promise.resolve(onMakeCommissioner(member.user_id));
            if (isActionFailure(result)) {
                updateActionState(member.user_id, {
                    promoting: false,
                    error: result.error ?? "Unable to transfer ownership.",
                });
                return;
            }
            updateActionState(member.user_id, { promoting: false, error: undefined });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to transfer ownership.";
            updateActionState(member.user_id, { promoting: false, error: message });
        }
    };

    const handleConfirm = async () => {
        if (!pendingAction) return;
        const { member, kind } = pendingAction;
        setConfirming(true);
        if (kind === "remove") {
            await handleRemove(member);
        } else if (kind === "leave") {
            if (onLeaveGroup) {
                await Promise.resolve(onLeaveGroup());
            }
        } else {
            await handlePromote(member);
        }
        setConfirming(false);
        setPendingAction(null);
    };

    if (loadingMembers) {
        return <MembersSkeleton />;
    }

    const surfaceLabel = accent === "arena" ? "Arena" : "League";

    const renderMember = (member: MemberWithRole) => {
        const state = member?.user_id ? actionState[member?.user_id] : {};
        const isCommissioner = member.role === "commissioner";
        const isOwner = Boolean(member.isOwner ?? isCommissioner);
        const isSelf = member.user_id === currentUser?.userId;

        const disableRemove = !canManage || isOwner || isSelf;
        const disablePromote = !canManage || isCommissioner;
        const showRemove = canManage && !isOwner && !isSelf && !isCommissioner;
        const showPromote = canManage && !isCommissioner;
        const showLeave = !canManage && isSelf && Boolean(onLeaveGroup);

        const requestRemove = () => {
            if (disableRemove) return;
            setPendingAction({ member, kind: "remove" });
        };

        const requestPromote = () => {
            if (disablePromote) return;
            setPendingAction({ member, kind: "promote" });
        };

        const requestLeave = () => {
            if (!showLeave) return;
            setPendingAction({ member, kind: "leave" });
        };

        const displayName = formatDisplayName(member.profiles?.username) || "member";
        // The group-scoped member card when the host supplies one, otherwise the
        // global profile — which is what every caller did before the card existed.
        const memberHref =
            getMemberHref?.(member) ??
            (member.user_id && currentUser?.userId
                ? getProfilePath(member.user_id, currentUser.userId)
                : "#");

        const shared = {
            member,
            memberHref,
            memberLinkLabel: getMemberHref
                ? `View ${displayName} ${surfaceLabel} member card`
                : `View ${displayName} profile`,
            isCommissioner,
            state,
            onRemove: requestRemove,
            onLeave: requestLeave,
            onPromote: requestPromote,
            disableRemove,
            disablePromote,
            showRemove,
            showPromote,
            showLeave,
            leavingGroup,
        };

        return view === "cards" ? (
            <MemberCard key={member.id} accent={accent} {...shared} />
        ) : (
            <MemberRow key={member.id} accent={accent} {...shared} />
        );
    };

    return (
        <section className={memberDirectoryPanelClassName}>
            <div className="grid h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded-xl border border-white/10 bg-black/60 p-1">
                <MemberDirectorySearch
                    search={search}
                    onSearchChange={setSearch}
                    accent={accent}
                    searchLabel={`Search ${surfaceLabel} members`}
                    embedded
                />
                <MemberDirectoryViewToggle view={view} onViewChange={setView} embedded />
            </div>

            {/* Two containers rather than one with a swapped class: the list view
                is a real <ul>/<li>, which role="list" on a <div> only imitates. */}
            {view === "cards" ? (
                <div
                    role="list"
                    aria-label={`${surfaceLabel} member cards`}
                    className={memberDirectoryGridClassName}
                >
                    {visibleMembers.map(renderMember)}
                </div>
            ) : (
                <ul
                    aria-label={`${surfaceLabel} members list`}
                    className={memberDirectoryListClassName}
                >
                    {visibleMembers.map(renderMember)}
                </ul>
            )}

            {visibleMembers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                    No members match your search.
                </p>
            ) : null}

            {pendingAction && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="w-full max-w-sm space-y-4 rounded-2xl border border-white/15 bg-black/90 p-5 shadow-2xl">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                                are you sure?
                            </p>
                            <p className="text-sm text-gray-300">
                                {pendingAction.kind === "remove"
                                    ? `Remove ${formatDisplayName(pendingAction.member.profiles?.username)} from the group?`
                                    : pendingAction.kind === "leave"
                                        ? "Leave this group?"
                                        : `Transfer ownership to ${formatDisplayName(pendingAction.member.profiles?.username)}?`}
                            </p>
                        </div>
                        {pendingAction.kind === "remove" && (
                            <p className="text-[11px] text-gray-400">
                                This will remove this user from your group permanently. Their name will still
                                be visible in any past slips and leaderboards.
                            </p>
                        )}
                        {pendingAction.kind === "promote" && (
                            <p className="text-[11px] text-gray-400">
                                This gives this member ownership and control of this group from now on.
                            </p>
                        )}
                        {pendingAction.kind === "leave" && (
                            <p className="text-[11px] text-gray-400">
                                You can rejoin later with the invite code.
                            </p>
                        )}
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingAction(null)}
                                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-200 transition hover:border-white/35 hover:text-white"
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={confirming || (pendingAction.kind === "leave" && leavingGroup)}
                                className="rounded-full border border-amber-300/70 bg-amber-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-50 transition hover:border-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {confirming ? "working..." : "confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {membersPagination && membersPagination.page < membersPagination.total_pages && (
                <div className="flex justify-center pt-4">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMembers}
                        className="rounded-full border border-sky-500/30 bg-sky-500/10 px-6 py-2 text-xs font-semibold tracking-widest text-sky-100 transition hover:border-sky-400/60 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loadingMembers ? "Loading..." : "Show more members"}
                    </button>
                </div>
            )}

            {canManage && (
                <p className="text-[11px] text-gray-500">
                    Removing a member immediately hides this group from their &quot;your groups&quot;
                    list and
                    removes them from the leaderboard display.
                </p>
            )}
        </section>
    );
};

export default ModifyMembers;
