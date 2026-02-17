"use client";

import { useMemo, useState } from "react";
import { CurrentUser, Member } from "@/lib/interfaces/interfaces";
import Link from "next/link";
import Image from "next/image";

export type MemberRole = "commissioner" | "member";

export type MemberWithRole = Member & {
    isOwner?: boolean;
};

type Props = {
    currentUser: CurrentUser | null;
    members: MemberWithRole[];
    onRemoveMember: (
        userId: string
    ) => Promise<{ success: boolean; error?: string }>;
    onMakeCommissioner: (
        newCommissionerId: string
    ) => Promise<{ success: boolean; error?: string }>;
    onLeaveGroup?: () => void;
    leavingGroup?: boolean;
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
    <div className="flex w-full flex-col items-center gap-2">
        {showPromote && (
            <button
                type="button"
                disabled={disablePromote}
                onClick={onPromote}
                className="w-full rounded-lg border border-emerald-400/20 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-black/30 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-100 transition hover:border-emerald-300/60 hover:from-emerald-400/30 hover:via-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.12em]"
            >
                {state?.promoting ? "transferring..." : "make commissioner"}
            </button>
        )}
        {state?.error && <p className="text-xs text-red-300">{state.error}</p>}
        {showLeave && (
            <button
                type="button"
                onClick={onLeave}
                disabled={leavingGroup}
                className="w-full rounded-lg border border-red-500/30 bg-gradient-to-br from-red-900/70 via-red-700/40 to-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white transition hover:border-red-400/40 hover:from-red-800/80 hover:via-red-600/50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.12em]"
            >
                {leavingGroup ? "Leaving..." : "Leave group"}
            </button>
        )}
    </div>
);

const MemberCard = ({
    member,
    isCommissioner,
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
    isCommissioner: boolean;
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
    const memberProfileImage = member.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${member.profiles?.profile_image}` : undefined;
    const initials =
        displayName.trim().length > 0
            ? displayName
                .split(" ")
                .map((segment) => segment.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "??";
    const showActions = showPromote || showLeave || Boolean(state?.error);

    return (
        <div className="relative flex aspect-square w-full flex-col rounded-2xl border border-white/5 bg-gradient-to-b from-[#00ff99]/12 via-[#00ff99]/6 to-slate-950/15 bg-clip-padding p-4 shadow-sm transition hover:border-[#00ff99]/35">
            {showRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disableRemove}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-gray-300 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Remove member"
                >
                    X
                </button>
            )}
            <div className="flex flex-1 flex-col items-center gap-3 pt-3">
                <Link
                    href={`/user/${member.user_id}`}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold uppercase tracking-[0.18em] text-gray-200 transition hover:border-emerald-300/60 hover:text-white hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                    aria-label={`View ${displayName || "member"} profile`}
                >
                    {memberProfileImage ? (
                        <Image
                            src={memberProfileImage}
                            alt="Profile image"
                            width={56}
                            height={56}
                            className={`tracking-wide rounded-xl object-cover h-13 w-13`}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            unoptimized
                        />
                    ) : (
                        <span className="tracking-wide">
                            {initials}
                        </span>
                    )}
                </Link>
                <div className="text-center">
                    <p className="text-sm font-semibold text-white">{displayName || "Member"}</p>
                    {isCommissioner && (
                        <p className="mt-1 text-[9px] font-semibold lowercase tracking-[0.16em] text-amber-200">
                            commissioner
                        </p>
                    )}
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
        </div>
    );
};

export const ModifyMembers = ({
    currentUser,
    members,
    onRemoveMember,
    onMakeCommissioner,
    onLeaveGroup,
    leavingGroup,
}: Props) => {
    const [actionState, setActionState] = useState<Record<string, ActionState>>({});
    const [pendingAction, setPendingAction] = useState<
        { member: MemberWithRole; kind: "remove" | "promote" | "leave" } | null
    >(null);
    const [confirming, setConfirming] = useState(false);

    const canManage = useMemo(
        () =>
            members.some(
                (member) => member.user_id === currentUser?.userId && member.role === "commissioner"
            ),
        [currentUser?.userId, members]
    );

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
                    error: result.error ?? "Unable to transfer commissioner.",
                });
                return;
            }
            updateActionState(member.user_id, { promoting: false, error: undefined });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to transfer commissioner.";
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

    return (
        <section className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {members.map((member) => {
                    const state = member?.user_id ? actionState[member?.user_id] : {};
                    const isCommissioner = member.role === "commissioner";
                    const isOwner = Boolean(member.isOwner ?? isCommissioner);
                    const isSelf = member.id === currentUser?.userId;

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

                    return (
                        <MemberCard
                            key={member.id}
                            member={member}
                            isCommissioner={isCommissioner}
                            state={state}
                            onRemove={requestRemove}
                            onLeave={requestLeave}
                            onPromote={requestPromote}
                            disableRemove={disableRemove}
                            disablePromote={disablePromote}
                            showRemove={showRemove}
                            showPromote={showPromote}
                            showLeave={showLeave}
                            leavingGroup={leavingGroup}
                        />
                    );
                })}
            </div>

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
                                        : `Make ${formatDisplayName(pendingAction.member.profiles?.username)} the commissioner?`}
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
                                This action will give this user the power to control this group from now on.
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
