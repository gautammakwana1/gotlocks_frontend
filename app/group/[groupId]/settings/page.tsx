"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { Group, GroupSelector } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { confirmDeleteGroupRequest, fetchGroupByIdRequest, initialGroupDeleteRequest, leaveGroupRequest } from "@/lib/redux/slices/groupsSlice";
import { useDispatch, useSelector } from "react-redux";
import { GroupDataShape } from "../page";
import { DeleteGroupConfirmationModal } from "@/components/group/ConfirmDeleteGroupModal";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const hasNestedGroup = (
    value: GroupDataShape
): value is { group?: Group | null } => {
    return Boolean(value && typeof value === "object" && "group" in value);
};

const extractGroup = (data: GroupDataShape): Group | null => {
    if (!data) {
        return null;
    }

    if (hasNestedGroup(data)) {
        return data.group ?? null;
    }

    return data;
};

const GroupSettingsPage = () => {
    const params = useParams<{ groupId: string }>();
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);

    useEffect(() => {
        if (!params.groupId || !currentUser) return

        dispatch(fetchGroupByIdRequest({ groupId: params.groupId }));
    }, [params.groupId, currentUser, dispatch])

    useEffect(() => {
        if (!group || !currentUser || (Array.isArray(group.members) && !group.members.includes(currentUser.userId))) {
            router.replace("/home");
        }
    }, [currentUser, group, router]);

    const isCommissioner = group?.created_by === currentUser?.userId;
    const memberCount = group?.members?.length ?? 0;

    const confirmationPhrase = group ? `DELETE ${group.name}` : "";
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [leavingGroup, setLeavingGroup] = useState(false);
    const [openSection, setOpenSection] = useState<"overview" | "leave" | "danger">(
        "overview"
    );
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const deleteReady =
        isCommissioner &&
        deleteConfirmation === confirmationPhrase &&
        acknowledged;

    const handleCloseConfirmDeleteModal = () => {
        setIsConfirmDeleteModalOpen(false);
        setIsDeletingGroup(true);
    };

    const handleDeleteGroup = () => {
        if (!group || !currentUser) return;
        if (!isCommissioner) {
            setDeleteError("Only the commissioner can delete this group.");
            return;
        }

        const phraseMatches = deleteConfirmation === confirmationPhrase;
        if (!phraseMatches || !acknowledged || isDeletingGroup) {
            return;
        }

        try {
            setIsDeletingGroup(true);
            setIsConfirmDeleteModalOpen(true);
            if (group.id) {
                dispatch(initialGroupDeleteRequest({ group_id: group?.id }));
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete group.";
            setDeleteError(message);
        }
    };

    const handleConfirmDeleteGroup = async () => {
        if (!isCommissioner) {
            setDeleteError("Only the commissioner can delete this group.");
            return;
        }
        try {
            if (group?.id) dispatch(confirmDeleteGroupRequest({ group_id: group?.id, otp: deleteConfirmationCode }));
            setDeleteError(null);
            setIsDeletingGroup(false);
            setIsConfirmDeleteModalOpen(false);
            setDeleteConfirmationCode("");
            setDeleteConfirmation("");
            setAcknowledged(false);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to delete group.";
            setDeleteError(message);
        }
    }

    const handleLeaveGroup = () => {
        if (!group || !currentUser) return;
        if (isCommissioner) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Commissioners need to transfer ownership before leaving.",
                duration: 3000,
            });
            return;
        }
        if (group.id) {
            setLeavingGroup(true);
            dispatch(leaveGroupRequest({ group_id: group.id }));
        }
        setLeavingGroup(false);
    };

    if (!group || !currentUser || (Array.isArray(group.members) && !group.members.includes(currentUser.userId))) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8">
            <BackButton />

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 shadow-lg">
                <button
                    type="button"
                    onClick={() =>
                        setOpenSection((prev) => (prev === "overview" ? "leave" : "overview"))
                    }
                    aria-expanded={openSection === "overview"}
                    className="flex w-full items-center justify-between text-left"
                >
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                            group settings
                        </p>
                        <h1
                            className="allow-caps text-3xl font-extrabold text-transparent bg-clip-text"
                            style={displayNameGradientStyle}
                        >
                            {group.name}
                        </h1>
                    </div>
                    <span className="text-gray-400">{openSection === "overview" ? "v" : "^"}</span>
                </button>

                {openSection === "overview" && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            {group.description && (
                                <p className="text-sm text-gray-400">{group.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                                <span className="rounded-full border border-white/10 px-3 py-1 text-white">
                                    invite {group.invite_code}
                                </span>
                                <span className="rounded-full border border-white/10 px-3 py-1 text-white">
                                    {memberCount} members
                                </span>
                                {isCommissioner ? (
                                    <span className="rounded-full border border-emerald-400/60 px-3 py-1 text-emerald-100">
                                        commissioner access
                                    </span>
                                ) : (
                                    <span className="rounded-full border border-white/10 px-3 py-1 text-white">
                                        member view
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(`/group/${group.id}/slips`)}
                            className="self-start rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30"
                        >
                            View slips
                        </button>
                    </div>
                )}
            </section>

            {!isCommissioner && (
                <section className="rounded-3xl border border-white/12 bg-white/[0.03] p-6 shadow-lg">
                    <button
                        type="button"
                        onClick={() =>
                            setOpenSection((prev) => (prev === "leave" ? "overview" : "leave"))
                        }
                        aria-expanded={openSection === "leave"}
                        className="flex w-full items-center justify-between text-left"
                    >
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                                Leave group
                            </p>
                            <p className="text-sm text-gray-300">
                                Remove yourself from {group.name}. You can rejoin later with the invite code.
                            </p>
                        </div>
                        <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                            Member only
                        </span>
                    </button>
                    {openSection === "leave" && (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={handleLeaveGroup}
                                disabled={leavingGroup}
                                className="rounded-2xl border border-red-400/60 bg-red-500/15 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {leavingGroup ? "Leaving..." : "Leave group"}
                            </button>
                        </div>
                    )}
                </section>
            )}

            <section className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-lg backdrop-blur">
                <button
                    type="button"
                    onClick={() =>
                        setOpenSection((prev) => (prev === "danger" ? "overview" : "danger"))
                    }
                    aria-expanded={openSection === "danger"}
                    className="flex w-full items-center justify-between gap-4 text-left"
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
                            Danger zone
                        </p>
                        <p className="text-sm text-red-100">
                            Permanently delete {group.name}. All slips, picks, and membership data are
                            removed.
                        </p>
                    </div>
                    <span className="rounded-full border border-red-400/60 px-3 py-1 text-[11px] uppercase tracking-wide text-red-100">
                        Commissioner only
                    </span>
                </button>

                {openSection === "danger" && (
                    <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm text-gray-200">
                                <span className="text-xs uppercase tracking-wide text-gray-400">
                                    Type {confirmationPhrase} to confirm
                                </span>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/70"
                                />
                            </label>
                            <label className="flex items-center gap-3 text-sm text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(event) => setAcknowledged(event.target.checked)}
                                    className="h-4 w-4 rounded border border-white/20 bg-black text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                                />
                                I understand this cannot be undone.
                            </label>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                disabled={!deleteReady}
                                onClick={handleDeleteGroup}
                                className="rounded-2xl bg-red-600/80 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Delete group permanently
                            </button>
                        </div>
                    </>
                )}
            </section>

            {isConfirmDeleteModalOpen && (
                <DeleteGroupConfirmationModal
                    open={isConfirmDeleteModalOpen}
                    confirmationValue={deleteConfirmationCode}
                    hasPermission={isCommissioner}
                    isDeleting={isDeletingGroup}
                    errorMessage={deleteError}
                    onConfirmationChange={(value: string) => setDeleteConfirmationCode(value)}
                    onClose={handleCloseConfirmDeleteModal}
                    onConfirm={handleConfirmDeleteGroup}
                />
            )}
        </div>
    );
};

export default GroupSettingsPage;
