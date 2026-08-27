"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyGroupsRequest } from "@/lib/redux/slices/groupsSlice";
import { useRouter } from "next/navigation";
import { clearDeleteAccountMessage, deleteAccountRequest, logout } from "@/lib/redux/slices/authSlice";
import DeactivateAccountSkeleton from "@/components/skeletons/app-settings/DeactivateAccountSkeleton";
import { AuthSliceState, Group, GroupObject } from "@/lib/interfaces/interfaces";
import {
    SettingsActionBar,
    SettingsHeader,
    SettingsPage,
    SettingsSection,
    SettingsStatus,
    SettingsSurface,
    settingsDangerButtonClassName,
    settingsFieldLabelClassName,
    settingsInputClassName,
    settingsSecondaryButtonClassName,
} from "@/components/settings/SettingsUI";

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

/* Each blocking group, with the one action that clears it. The MVP renders
 * every dependency class through this same row so "what do I have to do" reads
 * identically whether the blocker is a group you own or one you joined. */
const DependencyList = ({
    title,
    items,
}: {
    title: string;
    items: Array<{ id: string; name: string; detail: string; href: string; actionLabel: string }>;
}) => (
    <div className="space-y-3">
        <h3 className={settingsFieldLabelClassName}>{title}</h3>
        <ul className="space-y-3">
            {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                            {item.name}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                            {item.detail}
                        </span>
                    </span>
                    <Link
                        href={item.href}
                        aria-label={`${item.actionLabel} for ${item.name}`}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[var(--app-text)] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
                    >
                        {item.actionLabel}
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

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
    const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
    const reviewTriggerRef = useRef<HTMLButtonElement>(null);
    const restoreReviewFocusRef = useRef(false);

    const { loading: groupLoading, myGroups, hasMore } = useSelector((state: RootState) => state.group);
    const { loading: authLoader, message: authMessage, error: authError } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchMyGroupsRequest({ page: 1, limit: 10 }));
    }, [dispatch, currentUser]);

    // Opening the review moves focus to its heading; closing it puts focus back
    // on the button that opened it, so the flow is navigable without a mouse.
    useEffect(() => {
        if (hasStartedDeleteFlow) reviewHeadingRef.current?.focus();
    }, [hasStartedDeleteFlow]);

    useEffect(() => {
        if (!hasStartedDeleteFlow && restoreReviewFocusRef.current) {
            restoreReviewFocusRef.current = false;
            reviewTriggerRef.current?.focus();
        }
    }, [hasStartedDeleteFlow]);

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
                router.replace("/landing-page");
            })();
        }
        if (!authLoader && authError) {
            setIsDeleting(false);
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
    const confirmationMatches = confirmation.trim() === confirmationPhrase;
    const blockerCount = commissionerLeagues.length + memberLeagues.length;
    const canDelete = blockerCount === 0;
    const deleteReady = canDelete && acknowledged && confirmationMatches && !isDeleting;

    const groupDetail = (league: GroupObject) =>
        `${league?.member_count ?? 0} member${(league?.member_count ?? 0) === 1 ? "" : "s"} · invite code ${league.invite_code}`;

    const ownedItems = commissionerLeagues.map((league) => ({
        id: league.id,
        name: league.name,
        detail: groupDetail(league),
        href: `/league/${league.id}?tab=members`,
        actionLabel: "Open group settings",
    }));
    const joinedItems = memberLeagues.map((league) => ({
        id: league.id,
        name: league.name,
        detail: groupDetail(league),
        href: `/league/${league.id}?tab=members`,
        actionLabel: "Leave group",
    }));

    const handleStartDeleteFlow = () => {
        setHasStartedDeleteFlow(true);
    };

    const handleCancelDeleteFlow = () => {
        restoreReviewFocusRef.current = true;
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

        if (!confirmationMatches || !acknowledged) {
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
        <SettingsPage>
            <SettingsHeader title="Delete your account" backHref="/app-settings" />

            <SettingsSection
                title="Permanent account deletion"
                description="Review the consequences and any groups that must be resolved first."
                tone="danger"
                bodyClassName="space-y-4"
                layout="split"
            >
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">
                    <li>Your profile, stats, XP, picks, and account access will be removed.</li>
                    <li>You must leave Leagues and Arenas you joined or manage.</li>
                    <li>You must delete or transfer Leagues and Arenas you own.</li>
                    <li>This is permanent and cannot be undone.</li>
                </ul>

                {!hasStartedDeleteFlow ? (
                    <SettingsActionBar>
                        <Link href="/app-settings" className={settingsSecondaryButtonClassName}>
                            Cancel
                        </Link>
                        <button
                            ref={reviewTriggerRef}
                            type="button"
                            onClick={handleStartDeleteFlow}
                            className={settingsDangerButtonClassName}
                        >
                            Review account deletion
                        </button>
                    </SettingsActionBar>
                ) : null}
            </SettingsSection>

            {hasStartedDeleteFlow ? (
                blockerCount > 0 ? (
                    <SettingsSection
                        title={`${blockerCount}${hasMore ? "+" : ""} item${blockerCount === 1 && !hasMore ? "" : "s"} to resolve`}
                        description="Complete each action below, then return here to continue."
                        tone="danger"
                        bodyClassName="space-y-5"
                        layout="split"
                        headingRef={reviewHeadingRef}
                        headingTabIndex={-1}
                    >
                        {ownedItems.length > 0 ? (
                            <DependencyList title="Owned groups" items={ownedItems} />
                        ) : null}
                        {joinedItems.length > 0 ? (
                            <DependencyList title="Joined groups" items={joinedItems} />
                        ) : null}

                        {/* The roster is paged, so the count above is a floor until
                            the last page lands — hence the "+" on the heading. */}
                        {hasMore ? (
                            <div className="flex justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={groupLoading}
                                    className={settingsSecondaryButtonClassName}
                                >
                                    {groupLoading ? "Loading…" : "Show more"}
                                </button>
                            </div>
                        ) : null}

                        <SettingsActionBar>
                            <button
                                type="button"
                                onClick={handleCancelDeleteFlow}
                                className={settingsSecondaryButtonClassName}
                            >
                                Close review
                            </button>
                        </SettingsActionBar>
                    </SettingsSection>
                ) : (
                    <SettingsSection
                        title="Final confirmation"
                        description="No active League or Arena relationships are blocking deletion."
                        tone="danger"
                        layout="split"
                        headingRef={reviewHeadingRef}
                        headingTabIndex={-1}
                    >
                        <SettingsSurface tone="danger" className="space-y-5">
                            <label className="block space-y-2">
                                <span className={settingsFieldLabelClassName}>
                                    Type{" "}
                                    <span className="font-mono normal-case text-red-100">
                                        {confirmationPhrase}
                                    </span>{" "}
                                    to confirm
                                </span>
                                <input
                                    type="text"
                                    value={confirmation}
                                    onChange={(event) => setConfirmation(event.target.value)}
                                    disabled={isDeleting}
                                    className={settingsInputClassName}
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-label={`Type ${confirmationPhrase} to confirm`}
                                    aria-describedby={confirmation.length > 0 ? "delete-phrase-status" : undefined}
                                />
                                {confirmation.length > 0 ? (
                                    <span
                                        id="delete-phrase-status"
                                        className={`block text-xs normal-case leading-5 ${confirmationMatches ? "text-emerald-200" : "text-red-200"
                                            }`}
                                    >
                                        {confirmationMatches
                                            ? "Confirmation phrase matches."
                                            : "Confirmation phrase does not match."}
                                    </span>
                                ) : null}
                            </label>

                            <label className="flex min-h-11 items-start gap-3 rounded-xl bg-red-950/20 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(event) => setAcknowledged(event.target.checked)}
                                    disabled={isDeleting}
                                    className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/20 bg-white/5 accent-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 disabled:cursor-not-allowed"
                                />
                                <span>
                                    I understand this permanently deletes my account and removes its
                                    stats, XP, picks, and access.
                                </span>
                            </label>

                            <SettingsStatus tone="info">
                                {isDeleting ? "Deleting your account…" : null}
                            </SettingsStatus>

                            <SettingsActionBar>
                                <button
                                    type="button"
                                    onClick={handleCancelDeleteFlow}
                                    disabled={isDeleting}
                                    className={settingsSecondaryButtonClassName}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={!deleteReady}
                                    className={settingsDangerButtonClassName}
                                >
                                    {isDeleting ? "Deleting account…" : "Delete account permanently"}
                                </button>
                            </SettingsActionBar>
                        </SettingsSurface>
                    </SettingsSection>
                )
            ) : null}
        </SettingsPage>
    );
};

export default DeleteAccountPage;
