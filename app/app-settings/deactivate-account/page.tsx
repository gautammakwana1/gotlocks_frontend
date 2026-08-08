"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyGroupsRequest } from "@/lib/redux/slices/groupsSlice";
import { useRouter } from "next/navigation";
import { clearDeleteAccountMessage, deleteAccountRequest, logout } from "@/lib/redux/slices/authSlice";
import DeactivateAccountSkeleton from "@/components/skeletons/app-settings/DeactivateAccountSkeleton";
import { AuthSliceState, Group, GroupObject } from "@/lib/interfaces/interfaces";
import { ArrowLeft } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group>;
        };
        message?: string;
    } | null;
    loading: boolean;
    joinLoading: boolean;
    error: string | null;
    message: string | null;
    hasMore: boolean;
    myGroups: GroupObject[] | null;
};

type RootState = {
    group: GroupSliceState;
    user: AuthSliceState;
};

const inputClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base sm:text-sm text-[var(--app-text)] outline-none transition focus:border-white/20 disabled:cursor-not-allowed disabled:opacity-50";


const DeleteAccountPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [confirmation, setConfirmation] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasStartedDeleteFlow, setHasStartedDeleteFlow] = useState(false);
    const [page, setPage] = useState(1);

    const { loading: groupLoading, myGroups, hasMore } = useSelector((state: RootState) => state.group);
    const { loading: authLoader, message: authMessage, error: authError } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
    }, [dispatch, currentUser]);

    useEffect(() => {
        if (!authLoader && authMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: authMessage,
                duration: 3000
            });
            dispatch(clearDeleteAccountMessage());
            (async () => {
                const { supabase } = await import("@/lib/supabaseClient");
                await supabase.auth.signOut();
                dispatch(logout());
                Sentry.setUser(null);
                router.replace("/landing-page");
            })();
        }
        if (!authLoader && authError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: authError,
                duration: 3000
            });
            dispatch(clearDeleteAccountMessage());
        }
    }, [dispatch, authLoader, authMessage, setToast, authError, router]);

    const { commissionerLeagues, memberLeagues } = useMemo(() => {
        if (!Array.isArray(myGroups) || !myGroups.length || !currentUser?.userId) return {
            commissionerLeagues: [],
            memberLeagues: [],
        };

        const commissioner: GroupObject[] = [];
        const member: GroupObject[] = [];

        myGroups.forEach((g) => {
            (g.created_by === currentUser.userId
                ? commissioner
                : member
            ).push(g);
        });

        return {
            commissionerLeagues: commissioner,
            memberLeagues: member,
        };
    }, [myGroups, currentUser?.userId]);

    if (!currentUser) return null;

    const confirmationPhrase = `DELETE @${currentUser.username}`;
    const canDelete = commissionerLeagues.length === 0 && memberLeagues.length === 0;
    const deleteReady =
        canDelete &&
        acknowledged &&
        confirmation.trim() === confirmationPhrase &&
        !isDeleting;
    const hasBlockers = !canDelete;

    const handleStartDeleteFlow = () => {
        setHasStartedDeleteFlow(true);
    };

    const handleCancelDeleteFlow = () => {
        setHasStartedDeleteFlow(false);
        setConfirmation("");
        setAcknowledged(false);
    };

    const handleDeleteAccount = () => {
        if (commissionerLeagues.length > 0) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Transfer or delete your leagues and Arenas before deleting your account.",
                duration: 3000
            });
            return;
        }

        if (memberLeagues.length > 0) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Leave every group you're part of before deleting your account.",
                duration: 3000
            });
            return;
        }

        if (confirmation.trim() !== confirmationPhrase || !acknowledged) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "Type the confirmation phrase and acknowledge the warning.",
                duration: 3000
            });
            return;
        }

        setIsDeleting(true);
        dispatch(deleteAccountRequest({}));
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        dispatch(fetchMyGroupsRequest({ page: nextPage, limit: 10 }));
    };

    if (groupLoading && (!myGroups || page === 1)) {
        return <DeactivateAccountSkeleton />;
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-7xl">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    <span className="flex items-center gap-2">
                        <ArrowLeft size={14} /> account settings
                    </span>
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Delete your account
                </h1>
            </header>

            <section className="space-y-4 border-b border-[var(--border-soft)] pb-5 text-sm leading-6 text-[var(--text-secondary)]">
                <p>
                    This is permanent and cannot be undone.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleStartDeleteFlow}
                        className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                    >
                        Continue to delete
                    </button>
                    <Link
                        href="/app-settings"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm lowercase text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                    >
                        back
                    </Link>
                </div>
            </section>

            {hasStartedDeleteFlow && hasBlockers && (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">
                            Before you can delete this account
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                            {commissionerLeagues.length > 0 && memberLeagues.length > 0
                                ? "Transfer or delete groups you own, then leave all remaining groups first."
                                : commissionerLeagues.length > 0
                                    ? "You still own one or more groups. Transfer or delete those groups first."
                                    : "You still belong to one or more groups. Leave them before deleting your account."}
                        </p>
                    </div>

                    {commissionerLeagues.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Owned groups
                            </p>
                            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                                {commissionerLeagues.map((league) => (
                                    <div
                                        key={league.id}
                                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-medium tracking-tight text-[var(--app-text)]">
                                                {league.name}
                                            </p>
                                            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                                {league?.member_count ?? 0} members - invite code {league.invite_code}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/league/${league.id}?tab=members`}
                                            className="shrink-0 text-right text-sm leading-5 text-[var(--app-text)] transition hover:text-white"
                                        >
                                            <span className="sm:hidden">
                                                Open group
                                                <br />
                                                settings
                                            </span>
                                            <span className="hidden sm:inline">Open group settings</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {memberLeagues.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Joined groups
                            </p>
                            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                                {memberLeagues.map((league) => (
                                    <div
                                        key={league.id}
                                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-medium tracking-tight text-[var(--app-text)]">
                                                {league.name}
                                            </p>
                                            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                                {league?.member_count ?? 0} members - invite code {league.invite_code}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/league/${league.id}?tab=members`}
                                            className="text-sm text-[var(--app-text)] transition hover:text-white"
                                        >
                                            Leave group
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={groupLoading}
                                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {groupLoading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                ) : null}
                                Show more
                            </button>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleCancelDeleteFlow}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            )}

            {hasStartedDeleteFlow && canDelete && (
                <section className="space-y-4 border-t border-[var(--border-soft)] pt-5">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">
                            Final confirmation
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                            Once deleted, this account and its stats cannot be restored.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="block space-y-2">
                            <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Type {confirmationPhrase} to confirm
                            </span>
                            <input
                                type="text"
                                value={confirmation}
                                onChange={(event) => setConfirmation(event.target.value)}
                                disabled={isDeleting}
                                className={inputClassName}
                            />
                        </label>

                        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                            <input
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(event) => setAcknowledged(event.target.checked)}
                                disabled={isDeleting}
                                className="mt-1 h-4 w-4 rounded border border-white/20 bg-white/5 text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed"
                            />
                            <span>
                                I understand this permanently deletes my account and removes its stats,
                                XP, picks, and access.
                            </span>
                        </label>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={!deleteReady}
                                className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting account..." : "Delete account permanently"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelDeleteFlow}
                                className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div >
    );
};

export default DeleteAccountPage;
