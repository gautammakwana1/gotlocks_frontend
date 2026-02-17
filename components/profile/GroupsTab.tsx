"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { Group, Members } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearJoinedGroupByInviteCodeMessage, fetchAllGroupsRequest, joinedGroupByInviteCodeRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

type GroupSliceState = {
    group: {
        data?: {
            groups?: Array<Group & { members?: Members }>;
        };
        message?: string;
    } | null;
    loading: boolean;
    joinLoading: boolean;
    error: string | null;
    message: string | null;
};

type RootState = {
    group: GroupSliceState;
};

type GroupsTabVariant = "standalone" | "embedded";

type GroupsTabProps = {
    variant?: GroupsTabVariant;
};

const GroupsTab = ({ variant = "standalone" }: GroupsTabProps) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinOpen, setJoinOpen] = useState(false);

    const { group, joinLoading, message, error, loading: groupLoading } = useSelector((state: RootState) => state.group);

    useEffect(() => {
        dispatch(fetchAllGroupsRequest({}));
    }, [dispatch]);

    useEffect(() => {
        if (!joinLoading && message && group) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
            });
            dispatch(fetchAllGroupsRequest({}));
        }
        if (!joinLoading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
        }
        dispatch(clearJoinedGroupByInviteCodeMessage());
    }, [setToast, dispatch, joinLoading, message, error, router, group]);

    const sortedGroups = useMemo(() => {
        if (!group?.data?.groups) return [];

        const groups = group.data.groups;

        if (!currentUser?.userId) return groups;

        const commissionerGroups = groups.filter(
            (g: Group) => g.created_by === currentUser.userId
        );
        const memberGroups = groups.filter(
            (g: Group) => g.created_by !== currentUser.userId
        );

        return [...commissionerGroups, ...memberGroups];
    }, [group?.data?.groups, currentUser?.userId]);

    const openJoinModal = () => {
        setJoinOpen(true);
        setJoinError(null);
    };

    const closeJoinModal = () => {
        setJoinOpen(false);
        setJoinCode("");
        setJoinError(null);
    };

    const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!currentUser) {
            router.push("/landing-page");
            return;
        }

        dispatch(joinedGroupByInviteCodeRequest({ invite_code: joinCode.trim() }));
        closeJoinModal();
    };

    if (groupLoading || !currentUser) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col gap-6 ${variant === "embedded" ? "" : "text-white"}`}>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={() => router.push("/cag-explained")}
                    className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-black/60 to-black/30 px-5 py-4 text-left shadow-sm transition hover:border-emerald-300/60 hover:bg-emerald-500/15"
                >
                    <p className="text-sm font-semibold text-white">Start a new league</p>
                    <span
                        className="flex h-10 w-10 items-center justify-center text-emerald-100 transition group-hover:text-emerald-50"
                        aria-hidden
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 overflow-visible"
                            fill="currentColor"
                        >
                            <circle
                                cx="3.4"
                                cy="5.4"
                                r="3.1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            />
                            <circle
                                cx="20.6"
                                cy="5.4"
                                r="3.1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            />
                            <circle
                                cx="12"
                                cy="10"
                                r="3.1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            />
                            <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
                            <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
                            <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
                        </svg>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={openJoinModal}
                    className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-black/60 to-black/30 px-5 py-4 text-left shadow-sm transition hover:border-emerald-300/60 hover:bg-emerald-500/15"
                >
                    <p className="text-sm font-semibold text-white">Join a league</p>
                    <span
                        className="flex h-10 w-10 items-center justify-center text-emerald-100 transition group-hover:text-emerald-50"
                        aria-hidden
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M5 12h14M13 5l6 7-6 7" />
                        </svg>
                    </span>
                </button>
            </div>

            <div className="flex h-full flex-col gap-4">
                {sortedGroups.length === 0 ? (
                    <p className="text-sm text-gray-300">
                        no leagues yet; start a league or join one with an invite code to get started.
                    </p>
                ) : (
                    sortedGroups.slice(0, 2).map((group) => {
                        const isCommissioner = group.created_by === currentUser?.userId;
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => router.push(`/group/${group.id}`)}
                                className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-left shadow-lg shadow-black/30 transition hover:border-emerald-400/60 hover:shadow-emerald-500/25 sm:p-6"
                            >
                                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-gray-400">
                                    <span>{isCommissioner ? "commissioner" : "member"}</span>
                                    <span className="text-[10px] text-gray-300">
                                        code {group.invite_code}
                                    </span>
                                </div>
                                <h3
                                    className="allow-caps text-xl font-extrabold text-transparent bg-clip-text"
                                    style={displayNameGradientStyle}
                                >
                                    {group.name}
                                </h3>
                                <p className="hidden text-sm text-gray-200 sm:block sm:line-clamp-2">
                                    {group.description || "Run slips, share picks, and climb the table together."}
                                </p>
                                <div className="text-xs uppercase tracking-wide text-gray-400">
                                    <span>{group?.members?.length} members</span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {sortedGroups.length > 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {sortedGroups.slice(2).map((group) => {
                        const isCommissioner = group.created_by === currentUser?.userId;
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => router.push(`/group/${group.id}`)}
                                className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-left shadow-lg shadow-black/30 transition hover:border-emerald-400/60 hover:shadow-emerald-500/25 sm:p-6"
                            >
                                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-gray-400">
                                    <span>{isCommissioner ? "commissioner" : "member"}</span>
                                    <span className="text-[10px] text-gray-300">
                                        code {group.invite_code}
                                    </span>
                                </div>
                                <h3
                                    className="allow-caps text-xl font-extrabold text-transparent bg-clip-text"
                                    style={displayNameGradientStyle}
                                >
                                    {group.name}
                                </h3>
                                <p className="hidden text-sm text-gray-200 sm:block sm:line-clamp-2">
                                    {group.description || "Run slips, share picks, and climb the table together."}
                                </p>
                                <div className="text-xs uppercase tracking-wide text-gray-400">
                                    <span>{group?.members?.length} members</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {joinOpen && (
                <ModalShell onClose={closeJoinModal} maxWidthClass="max-w-sm">
                    <form onSubmit={handleJoin} className="space-y-4 text-center">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">join a league</p>
                            <p className="text-lg font-semibold text-white">Enter invite code</p>
                        </div>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(event) => {
                                setJoinCode(event.target.value);
                                setJoinError(null);
                            }}
                            maxLength={5}
                            inputMode="numeric"
                            placeholder="invite code"
                            autoFocus
                            className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/70"
                        />
                        {joinError && <p className="text-xs font-semibold text-red-200">{joinError}</p>}
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeJoinModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/80 hover:text-white"
                            >
                                Join
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
};

export default GroupsTab;

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);