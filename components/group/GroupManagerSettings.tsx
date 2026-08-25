"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "@/lib/state/ToastContext";
import {
    cancelManagerInvitationRequest,
    clearManagerActionMessage,
    fetchGroupMembersByGroupIdRequest,
    fetchManagerInvitationsRequest,
    removeGroupManagerRequest,
    sendManagerInvitationRequest,
} from "@/lib/redux/slices/groupsSlice";
import { MANAGER_ROSTER_LIMIT } from "@/lib/redux/sagas/groupsSaga";
import type {
    GroupManagerSeatStatus,
    GroupSelector,
    GroupType,
    Member,
} from "@/lib/interfaces/interfaces";

/* ============================================================================
 * MANAGER INVITATIONS — ONE panel for Leagues and Arenas.
 *
 * The backend deliberately put these five endpoints on the type-agnostic
 * /group/* surface rather than under /group/arena: a League manager and an Arena
 * manager are the SAME group_members row holding the SAME role. So this is one
 * component with two skins, not two components — the only thing that genuinely
 * differs per type is how many seats exist, and that answer arrives from the
 * server in `seats` and is never recomputed here.
 *
 * OWNER ONLY. GET /group/manager-invitations answers 403 for anybody but
 * `groups.created_by` — a manager who could appoint managers is an owner — so
 * callers must gate the MOUNT rather than gate the buttons.
 *
 * The other half of the flow is not on this screen and cannot be: the invitee
 * accepts or declines from Notifications, because they hold no settings screen
 * for a role they do not have yet.
 * ========================================================================== */

type GroupManagerSettingsProps = {
    groupId: string;
    groupType: GroupType;
    /** The viewer, excluded from the candidate list — an owner cannot invite themselves. */
    currentUserId?: string;
    /**
     * League only. Where "View Pro" goes when the League's tier includes no
     * manager seat at all. An Arena's equivalent is a hosting tier change, which
     * lives on its own billing screen and is linked from the hosting panel.
     */
    upgradeHref?: string;
    className?: string;
};

type Accent = {
    heading: string;
    radius: string;
    pending: string;
    pendingNote: string;
    select: string;
    primaryButton: string;
    upgradeBox: string;
    upgradeButton: string;
};

const ACCENTS: Record<GroupType, Accent> = {
    league: {
        heading: "text-base font-semibold text-white",
        radius: "rounded-lg",
        pending: "border-amber-300/20 bg-amber-500/[0.07]",
        pendingNote: "text-amber-100/70",
        select: "focus:border-sky-400/70",
        primaryButton: "bg-white text-black hover:bg-gray-200",
        upgradeBox: "border-sky-300/15 bg-sky-500/[0.07]",
        upgradeButton:
            "border-sky-300/30 bg-sky-500/10 text-sky-100 hover:border-sky-300/50 hover:bg-sky-500/15",
    },
    arena: {
        heading: "text-sm font-semibold uppercase tracking-[0.14em] text-white",
        radius: "rounded-xl",
        pending: "border-amber-300/20 bg-amber-500/[0.07]",
        pendingNote: "text-amber-100/70",
        select: "focus:border-violet-300/60",
        primaryButton: "bg-violet-100 text-violet-950 hover:bg-white",
        upgradeBox: "border-violet-300/15 bg-violet-500/[0.07]",
        upgradeButton:
            "border-violet-300/30 bg-violet-500/10 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/15",
    },
};

const COPY: Record<
    GroupType,
    { title: string; description: string; pendingNote: string; emptyCandidates: string }
> = {
    league: {
        title: "League manager",
        description:
            "Invite one member to help run contests and League Feed updates. Their role changes only after they accept from Notifications; ownership always stays with you.",
        pendingNote: "Waiting for this member to respond in Notifications.",
        emptyCandidates: "No members are available to invite yet.",
    },
    arena: {
        title: "Arena managers",
        description:
            "Invite members to help operate this Arena. A manager role begins only after the member accepts from Notifications. Managers use a staff allowance instead of member capacity, and stop being eligible for the Community Leaderboard.",
        pendingNote: "Waiting for a response in Notifications.",
        emptyCandidates: "No members are available to invite yet.",
    },
};

const memberHandle = (member: Pick<Member, "user_id" | "profiles">) =>
    member.profiles?.username ?? member.user_id ?? "member";

/**
 * WHY the Invite control is off, worded the way the server words its refusal.
 *
 * `can_invite` stays the gate — this only explains it. The branches are read off
 * the same three numbers the server used, in the same order describeSeatRefusal
 * checks them, so the panel and the 402/409 it would have received cannot say
 * different things.
 */
const describeSeatRefusal = (
    seats: GroupManagerSeatStatus | null,
    groupType: GroupType
): string | null => {
    if (!seats) return null;
    const isArena = groupType === "arena";

    // Arena-only in practice: group_manager_seat_status() returns true for every
    // League, so this branch can only be reached by one.
    if (!seats.hosting_writable) {
        return "This Arena cannot change its staff while its hosting is inactive.";
    }
    // Zero seats is an ENTITLEMENT answer, not a capacity one: there is no slot
    // to free up, only a plan to change. The League half of this never reaches
    // here — it is handled by the upgrade card instead.
    if (seats.manager_limit === 0) {
        return isArena
            ? "This Arena's hosting tier includes no manager seats."
            : "Upgrade this League to Pro to assign a manager.";
    }
    if (seats.manager_limit === null) return null;

    const taken = seats.manager_count + seats.pending_count;
    if (taken < seats.manager_limit) return null;

    // "Full" has two causes and two different fixes. Telling a League owner to
    // upgrade when the real answer is "remove the manager you already have"
    // would be useless.
    if (seats.manager_count >= seats.manager_limit) {
        return isArena
            ? "This Arena has no available manager seats. Remove a manager or upgrade hosting."
            : "Remove the current manager before assigning another one.";
    }
    return isArena
        ? "Every manager slot is active or reserved by a pending invitation."
        : "This League already has a pending manager invitation.";
};

const GroupManagerSettings = ({
    groupId,
    groupType,
    currentUserId,
    upgradeHref,
    className,
}: GroupManagerSettingsProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [candidateId, setCandidateId] = useState("");

    const {
        members,
        managerInvitations,
        managerInvitationsForId,
        managerSeats,
        canInviteManager,
        managerInvitationsLoading,
        managerInvitationsError,
        managerActionLoading,
        managerActionInvitationId,
        managerActionUserId,
        managerActionError,
        managerActionMessage,
    } = useSelector((state: GroupSelector) => state.group);

    useEffect(() => {
        if (!groupId) return;
        dispatch(fetchManagerInvitationsRequest({ group_id: groupId }));
        /* The roster IS the candidate list, so it is read at the endpoint's
         * maximum page rather than the 10-12 the Members tabs use. A page-1
         * window would hide members from an owner who has no way to tell
         * "not a candidate" from "not on this page". */
        dispatch(
            fetchGroupMembersByGroupIdRequest({
                group_id: groupId,
                page: 1,
                limit: MANAGER_ROSTER_LIMIT,
            })
        );
    }, [dispatch, groupId]);

    useEffect(() => {
        if (!managerActionError && !managerActionMessage) return;
        setToast({
            id: Date.now(),
            type: managerActionError ? "error" : "success",
            message: managerActionError ?? managerActionMessage ?? "",
            duration: 4000,
        });
        // Only on success. A refused invitation leaves the member selected so the
        // owner can read the reason and retry without hunting for them again.
        if (!managerActionError) setCandidateId("");
        dispatch(clearManagerActionMessage());
    }, [managerActionError, managerActionMessage, dispatch, setToast]);

    const accent = ACCENTS[groupType];
    const copy = COPY[groupType];

    // Only trust the list once it is stamped for THIS group — `state.group`
    // survives navigation between communities.
    const scoped = managerInvitationsForId === groupId;
    const invitations = useMemo(
        () =>
            scoped
                ? (managerInvitations ?? []).filter(
                    (invitation) => invitation.status === "pending"
                )
                : [],
        [managerInvitations, scoped]
    );
    const seats = scoped ? managerSeats : null;

    const roster = useMemo(() => members ?? [], [members]);
    const activeManagers = useMemo(
        () => roster.filter((member) => member.role === "manager"),
        [roster]
    );
    const invitedUserIds = useMemo(
        () => new Set(invitations.map((invitation) => invitation.to_user_id)),
        [invitations]
    );
    const candidates = useMemo(
        () =>
            roster.filter(
                (member) =>
                    member.role === "member" &&
                    member.user_id &&
                    member.user_id !== currentUserId &&
                    !invitedUserIds.has(member.user_id)
            ),
        [roster, currentUserId, invitedUserIds]
    );

    const managerLimit = seats?.manager_limit ?? null;
    // A League whose tier carries no manager seat at all. The fix is a plan, not
    // a vacancy, so the whole panel becomes an upgrade card.
    const needsUpgrade = groupType === "league" && seats?.manager_limit === 0;
    const refusal = canInviteManager ? null : describeSeatRefusal(seats, groupType);
    /* The MVP's League panel is an if / else-if / else — the current manager, OR
     * the pending invitation, OR the invite control. Never a row AND a line
     * explaining why the control is missing, because on a one-seat League the
     * row IS that explanation. An Arena has several seats and no such
     * implication, so it keeps the line. */
    const refusalRedundant =
        groupType === "league" && (activeManagers.length > 0 || invitations.length > 0);

    /* The badge. A Free League reads "Pro" rather than "0 of 0", because zero
     * seats there is an entitlement fact and "0 of 0" reads as a bug. */
    const seatBadge = !seats
        ? "—"
        : needsUpgrade
            ? "Pro"
            : `${seats.manager_count} of ${managerLimit ?? "unlimited"}`;

    /* A manager sitting past the first roster page cannot be drawn as a row —
     * there is no per-member read behind this panel. Saying so is the only
     * honest option: showing fewer managers than the badge counts would look
     * like the badge is wrong.
     *
     * Zero until the roster lands, or the two reads settling out of order would
     * flash "1 more manager is not on this page" over an empty list. */
    const hiddenManagerCount =
        roster.length === 0
            ? 0
            : Math.max(0, (seats?.manager_count ?? 0) - activeManagers.length);

    const sendInvitation = () => {
        if (!candidateId) return;
        dispatch(sendManagerInvitationRequest({ group_id: groupId, user_id: candidateId }));
    };

    return (
        <section
            className={`space-y-4 ${className ?? ""}`}
            data-group-manager-settings
            data-group-type={groupType}
        >
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className={accent.heading}>{copy.title}</h2>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                        {seatBadge}
                    </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                    {copy.description}
                </p>
            </div>

            {managerInvitationsError ? (
                <p role="alert" className="text-xs leading-5 text-red-300">
                    {managerInvitationsError}
                </p>
            ) : null}

            {needsUpgrade ? (
                <div
                    className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${accent.radius} ${accent.upgradeBox}`}
                >
                    <p className="text-xs leading-5 text-gray-400">
                        Upgrade this League to Pro before inviting a manager.
                    </p>
                    {upgradeHref ? (
                        <Link
                            href={upgradeHref}
                            className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-[10px] font-semibold uppercase tracking-wide transition ${accent.upgradeButton}`}
                        >
                            View Pro
                        </Link>
                    ) : null}
                </div>
            ) : (
                <>
                    {activeManagers.map((manager) => {
                        const busy =
                            managerActionLoading && managerActionUserId === manager.user_id;
                        return (
                            <div
                                key={manager.id ?? manager.user_id}
                                className={`flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.025] px-4 py-3 ${accent.radius}`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                        @{memberHandle(manager)}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-4 text-gray-500">
                                        Current manager
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={managerActionLoading}
                                    onClick={() => {
                                        if (!manager.user_id) return;
                                        dispatch(
                                            removeGroupManagerRequest({
                                                group_id: groupId,
                                                user_id: manager.user_id,
                                            })
                                        );
                                    }}
                                    className="min-h-9 rounded-lg border border-red-300/25 px-3 text-[10px] font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {busy ? "Working…" : "Remove manager"}
                                </button>
                            </div>
                        );
                    })}

                    {hiddenManagerCount > 0 ? (
                        <p className="text-xs leading-5 text-gray-500">
                            {hiddenManagerCount === 1
                                ? "1 more manager is not on this page of the roster."
                                : `${hiddenManagerCount} more managers are not on this page of the roster.`}
                        </p>
                    ) : null}

                    {invitations.map((invitation) => {
                        const busy =
                            managerActionLoading &&
                            managerActionInvitationId === invitation.id;
                        return (
                            <div
                                key={invitation.id}
                                className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${accent.radius} ${accent.pending}`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                        @{invitation.profiles?.username ?? invitation.to_user_id}
                                    </p>
                                    <p className={`mt-1 text-[11px] leading-4 ${accent.pendingNote}`}>
                                        {copy.pendingNote}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={managerActionLoading}
                                    onClick={() =>
                                        dispatch(
                                            cancelManagerInvitationRequest({
                                                group_id: groupId,
                                                invitation_id: invitation.id,
                                            })
                                        )
                                    }
                                    className="min-h-9 rounded-lg border border-white/15 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {busy ? "Working…" : "Cancel invitation"}
                                </button>
                            </div>
                        );
                    })}

                    {canInviteManager ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                                aria-label={
                                    groupType === "arena"
                                        ? "Arena manager candidate"
                                        : "League manager candidate"
                                }
                                value={candidateId}
                                onChange={(event) => setCandidateId(event.target.value)}
                                disabled={managerActionLoading || candidates.length === 0}
                                className={`min-w-0 flex-1 border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${accent.radius} ${accent.select}`}
                            >
                                <option value="">
                                    {groupType === "arena"
                                        ? "Choose an active member"
                                        : "Choose a League member"}
                                </option>
                                {candidates.map((candidate) => (
                                    <option
                                        key={candidate.id ?? candidate.user_id}
                                        value={candidate.user_id}
                                    >
                                        @{memberHandle(candidate)}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={sendInvitation}
                                disabled={!candidateId || managerActionLoading}
                                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${accent.radius} ${accent.primaryButton}`}
                            >
                                {managerActionLoading ? "Working…" : "Send manager invitation"}
                            </button>
                        </div>
                    ) : refusalRedundant ? null : refusal ? (
                        <p className="text-xs leading-5 text-gray-500">{refusal}</p>
                    ) : managerInvitationsLoading ? (
                        <p className="text-xs leading-5 text-gray-500">Loading manager seats…</p>
                    ) : null}

                    {/* Gated on a NON-EMPTY roster: an empty one means the members
                        fetch has not landed yet, and "nobody to invite" is a
                        different statement from "not loaded". */}
                    {canInviteManager && roster.length > 0 && candidates.length === 0 ? (
                        <p className="text-xs leading-5 text-gray-500">{copy.emptyCandidates}</p>
                    ) : null}
                </>
            )}
        </section>
    );
};

export default GroupManagerSettings;
