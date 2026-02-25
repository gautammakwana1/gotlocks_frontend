"use client";

import {
    ReactNode,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";
import Image from "next/image";
import { CurrentUser, Profile, RootState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { updateProfileRequest } from "@/lib/redux/slices/authSlice";
import { getLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";

type ProfileHeaderStats = {
    posts: number;
    wins: number;
    combos: number;
    followers: number;
    following: number;
    groups: number;
    globalPoints: number;
    joinedAt?: string;
};

type ProfileHeaderProgress = {
    level: number;
    xpToday: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpRemaining: number;
    levelProgressPercent: number;
};

type ProfileHeaderRecord = {
    wins: number;
    losses: number;
    pending: number;
};

type ProfileHeaderProps = {
    user: Profile;
    mode: "self" | "public";
    profileVisible: boolean | undefined;
    isSelf: boolean;
    showFollowControls: boolean;
    isFollowing: boolean;
    record: ProfileHeaderRecord;
    stats: ProfileHeaderStats;
    progress: ProfileHeaderProgress;
    onShowScoringRules: () => void;
    onFollowToggle: () => void;
    onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveAvatar: () => void;
    onPrivacyToggle: () => void;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
};

const BADGE_PLACEHOLDERS = Array.from({ length: 3 }, (_, index) => `Locked badge ${index + 1}`);

const buildInitials = (handle: string) => {
    const segments = handle.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const source = segments.length ? segments : [handle];
    const initials = source
        .map((segment) => segment.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return initials || "GL";
};

type ProfileAvatarProps = {
    avatarUrl?: string | null;
    displayName: string;
    initials: string;
};

const ProfileAvatar = ({ avatarUrl, displayName, initials }: ProfileAvatarProps) => (
    <div className="relative -ml-1 flex h-18 w-18 items-center justify-center sm:h-22 sm:w-22">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-200/60 via-sky-500/20 to-white/10" />
        <div className="absolute inset-[6px] rounded-full border border-sky-200/40 bg-black/40" />
        <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-sky-300/40 bg-sky-500/20 text-white sm:h-18 sm:w-18">
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                    width={56}
                    height={56}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    unoptimized
                />
            ) : (
                <span className="text-base font-semibold uppercase tracking-[0.18em] sm:text-lg">
                    {initials}
                </span>
            )}
        </div>
    </div>
);

type FollowerStatsProps = {
    followers: number;
    following: number;
    className?: string;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
};

const FollowerStats = ({
    followers,
    following,
    className = "",
    onFollowersClick,
    onFollowingClick,
}: FollowerStatsProps) => (
    <div
        className={`flex flex-nowrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-sky-100/80 ${className}`}
    >
        {onFollowersClick ? (
            <button
                type="button"
                onClick={onFollowersClick}
                className="whitespace-nowrap transition hover:text-white"
            >
                {followers} followers
            </button>
        ) : (
            <span className="whitespace-nowrap">{followers} followers</span>
        )}
        <span aria-hidden className="h-3 w-px bg-white/25" />
        {onFollowingClick ? (
            <button
                type="button"
                onClick={onFollowingClick}
                className="whitespace-nowrap transition hover:text-white"
            >
                {following} following
            </button>
        ) : (
            <span className="whitespace-nowrap">{following} following</span>
        )}
    </div>
);

const ProfileHeader = ({
    user,
    mode,
    profileVisible = false,
    isSelf,
    showFollowControls,
    isFollowing,
    record,
    stats,
    progress,
    onShowScoringRules,
    onFollowToggle,
    onAvatarChange,
    onRemoveAvatar,
    onPrivacyToggle,
    onFollowersClick,
    onFollowingClick,
}: ProfileHeaderProps) => {
    const dispatch = useDispatch();
    const avatarInputId = useId();
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user?.username || "");
    const avatarMenuRef = useRef<HTMLDetailsElement | null>(null);
    const settingsMenuRef = useRef<HTMLDetailsElement | null>(null);
    const displayName = user.username ?? user.full_name ?? "Member";
    const initials = useMemo(() => buildInitials(displayName), [displayName]);
    const avatarUrl = user.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${user.profile_image}` : "";
    const showStats = mode === "self" || profileVisible;
    const showNumericProgress = mode === "self";
    const showFollowSection = mode === "public" && showFollowControls && !isSelf;
    const showFollowerStats = showStats || showFollowSection;
    const recordItems = [
        { label: "W", value: record?.wins ?? 0, tone: "text-emerald-100" },
        { label: "L", value: record?.losses ?? 0, tone: "text-red-100" },
        { label: "P", value: record?.pending ?? 0, tone: "text-blue-100" },
    ];

    const { loading } = useSelector((state: RootState) => state.user);

    const closeDetailsMenu = (event: ReactMouseEvent<HTMLElement>) => {
        const details = event.currentTarget.closest("details");
        if (details instanceof HTMLDetailsElement) {
            details.open = false;
        }
    };

    useEffect(() => {
        if (!user?.username) return;

        setUsername(user?.username);
    }, [user?.username]);

    useEffect(() => {
        const handleClick = (event: globalThis.MouseEvent) => {
            const menus = [avatarMenuRef.current, settingsMenuRef.current].filter(
                Boolean
            ) as HTMLDetailsElement[];

            if (!menus.length) return;

            const openMenus = menus.filter((menu) => menu.open);
            if (!openMenus.length) return;

            const target = event.target;

            if (!(target instanceof Node)) return;

            if (openMenus.some((menu) => menu.contains(target))) {
                return;
            }

            openMenus.forEach((menu) => {
                menu.open = false;
            });
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const menus = [avatarMenuRef.current, settingsMenuRef.current].filter(
                Boolean
            ) as HTMLDetailsElement[];
            const openMenus = menus.filter((menu) => menu.open);
            if (!openMenus.length) return;
            openMenus.forEach((menu) => {
                menu.open = false;
            });
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const formData = new FormData();
        formData.append("username", username);

        if (username === user?.username) {
            setIsEditing(false);
            return;
        }

        dispatch(updateProfileRequest(formData));
        const storedUser = getLocalStorage<CurrentUser>("currentUser");
        setLocalStorage("currentUser", { ...storedUser, username: username });

        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setUsername(user?.username || "");
    };

    const renderFollowControls = (className = "") => {
        if (!showFollowSection) return null;
        return (
            <div className={`flex flex-wrap items-center gap-2 ${className}`}>
                {isFollowing ? (
                    <details className="relative">
                        <summary
                            aria-label="Following options"
                            className="list-none cursor-pointer rounded-lg border border-sky-300/60 bg-sky-500/15 px-2.5 py-1 text-[10px] tracking-[0.14em] text-sky-100 transition hover:border-sky-200/80 [&::-webkit-details-marker]:hidden"
                        >
                            following
                        </summary>
                        <div className="absolute left-0 top-full mt-2 w-20 rounded-lg border border-white/10 bg-black/80 p-1 text-[10px] tracking-[0.14em] text-white shadow-lg backdrop-blur">
                            <button
                                type="button"
                                onClick={(event) => {
                                    onFollowToggle();
                                    closeDetailsMenu(event);
                                }}
                                className="flex w-full items-center justify-start rounded-md px-1.5 py-1 text-left text-red-200 transition hover:bg-white/10"
                            >
                                unfollow
                            </button>
                        </div>
                    </details>
                ) : (
                    <button
                        type="button"
                        onClick={onFollowToggle}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] tracking-[0.14em] text-white transition hover:border-sky-300/60"
                    >
                        follow
                    </button>
                )}
            </div>
        );
    };

    return (
        <header className="relative overflow-visible -mx-5 bg-black sm:-mx-6">
            <div className="relative px-5 py-5 sm:px-6 sm:py-6">
                <div className="relative">
                    <div className="pointer-events-none absolute -inset-y-2 inset-x-0 rounded-3xl bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-blue-900/35 ring-1 ring-white/10 sm:-inset-y-3">
                        <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-b from-white/10 via-white/5 to-black/70" />
                        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]" />
                    </div>
                    <div className="relative origin-top-left scale-[0.95] pl-1 sm:scale-100 sm:pl-2">
                        <div className="relative grid gap-5 sm:gap-6 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,250px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                            <div className="relative h-full w-full p-3 sm:p-4">
                                <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-3 sm:gap-4 sm:grid-rows-[auto_1fr] sm:items-start">
                                    {mode === "self" ? (
                                        <details
                                            ref={avatarMenuRef}
                                            className="relative z-20 col-start-1 row-start-2 sm:col-start-1 sm:row-span-2 sm:row-start-1"
                                        >
                                            <summary
                                                aria-label="Profile photo actions"
                                                className="relative list-none cursor-pointer [&::-webkit-details-marker]:hidden"
                                            >
                                                <ProfileAvatar
                                                    avatarUrl={avatarUrl}
                                                    displayName={displayName}
                                                    initials={initials}
                                                />
                                                {showStats && (
                                                    <span className="sr-only">Level {progress.level}</span>
                                                )}
                                            </summary>
                                            <div className="absolute left-0 top-full mt-2 w-40 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                                                <label
                                                    htmlFor={avatarInputId}
                                                    onClick={closeDetailsMenu}
                                                    className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                                                >
                                                    {avatarUrl ? "edit photo" : "upload photo"}
                                                </label>
                                                {avatarUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            onRemoveAvatar();
                                                            closeDetailsMenu(event);
                                                        }}
                                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-red-200 transition hover:bg-white/10"
                                                    >
                                                        remove photo
                                                    </button>
                                                )}
                                            </div>
                                        </details>
                                    ) : (
                                        <div className="relative col-start-1 row-start-2 sm:col-start-1 sm:row-span-2 sm:row-start-1">
                                            <ProfileAvatar
                                                avatarUrl={avatarUrl}
                                                displayName={displayName}
                                                initials={initials}
                                            />
                                            {showStats && (
                                                <span className="sr-only">Level {progress.level}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="min-w-0 col-span-2 row-start-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="truncate text-xl font-semibold leading-tight text-white sm:text-2xl">
                                                        {displayName}
                                                    </div>
                                                    {mode === "self" && (
                                                        <details ref={settingsMenuRef} className="relative z-20">
                                                            <summary
                                                                aria-label="Profile options"
                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:border-sky-300/60 hover:text-sky-100 sm:h-8 sm:w-8 [&::-webkit-details-marker]:hidden"
                                                            >
                                                                <svg
                                                                    aria-hidden
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.7"
                                                                    className="h-4 w-4"
                                                                >
                                                                    <path
                                                                        d="M4 20h4l10-10-4-4L4 16v4Z"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                    <path
                                                                        d="M13.5 6.5l4 4"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                </svg>
                                                            </summary>
                                                            <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        handleEdit();
                                                                        closeDetailsMenu(event);
                                                                    }}
                                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                                                                >
                                                                    edit name
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        onPrivacyToggle();
                                                                        closeDetailsMenu(event);
                                                                    }}
                                                                    className={`mt-1 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[11px] uppercase tracking-wide transition ${user.is_public
                                                                        ? "border-sky-300/60 bg-sky-500/15 text-sky-100"
                                                                        : "border-white/20 bg-white/10 text-white"
                                                                        }`}
                                                                >
                                                                    {user.is_public ? "Public profile" : "Private profile"}
                                                                    <span className="text-[10px] text-white/60">
                                                                        {user.is_public ? "visible" : "hidden"}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {showFollowerStats && (
                                        <div className="min-w-0 col-start-2 row-start-2 flex flex-col gap-3 self-center sm:col-start-2 sm:row-start-2 sm:h-full sm:self-auto">
                                            {showStats && (
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-sky-100/75">
                                                    <span className="shrink-0">Lvl {progress.level}</span>
                                                    <div className="h-1.5 min-w-[100px] flex-1 rounded-full bg-white/10 sm:min-w-[140px]">
                                                        <div
                                                            className="h-1.5 rounded-full bg-sky-400/80 transition-all"
                                                            style={{ width: `${progress.levelProgressPercent}%` }}
                                                        />
                                                    </div>
                                                    {showNumericProgress && (
                                                        <span className="shrink-0 text-sky-100/70">
                                                            {progress.xpRemaining} XP to next
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className={`flex flex-col gap-2 ${showStats ? "mt-auto" : ""}`}>
                                                <FollowerStats
                                                    followers={stats.followers}
                                                    following={stats.following}
                                                    className="hidden sm:flex sm:gap-3 sm:text-[11px] sm:tracking-[0.18em] sm:mt-2"
                                                    onFollowersClick={onFollowersClick}
                                                    onFollowingClick={onFollowingClick}
                                                />
                                                {renderFollowControls("hidden sm:flex sm:mt-2")}
                                            </div>
                                        </div>
                                    )}
                                    {showFollowerStats && (
                                        <div className="col-start-1 row-start-3 col-span-2 sm:hidden">
                                            <FollowerStats
                                                followers={stats.followers}
                                                following={stats.following}
                                                className="mt-2"
                                                onFollowersClick={onFollowersClick}
                                                onFollowingClick={onFollowingClick}
                                            />
                                            {renderFollowControls("mt-3")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex h-full flex-col gap-4 border-l border-white/10 pl-4 sm:gap-5 sm:pl-5 lg:pl-6">
                                {showStats && (
                                    <div className="space-y-3 pt-2">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[11px] sm:tracking-[0.2em]">
                                            {stats.globalPoints} global points
                                        </p>
                                        <div className="flex flex-nowrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-white/80 sm:gap-4 sm:text-sm sm:tracking-[0.18em]">
                                            {recordItems.map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="flex items-baseline gap-1.5 whitespace-nowrap sm:gap-2"
                                                >
                                                    <span className="text-[10px] font-semibold text-white/70 sm:text-[11px]">
                                                        {item.label}
                                                    </span>
                                                    <span className={`text-sm font-bold sm:text-base ${item.tone}`}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onShowScoringRules}
                                            className="whitespace-nowrap px-1 py-1 text-[10px] font-semibold lowercase tracking-wide text-sky-200 underline decoration-white/30 transition hover:text-sky-100 sm:text-[11px]"
                                        >
                                            profile scoring rules
                                        </button>
                                    </div>
                                )}
                                <div
                                    className={`space-y-3 ${showStats
                                        ? "border-t border-white/10 pt-4 pb-1 mt-auto sm:mt-0"
                                        : ""
                                        }`}
                                >
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[11px] sm:tracking-[0.18em]">
                                            badges
                                        </p>
                                        <span className="text-[7px] uppercase tracking-wide text-[var(--text-secondary)] sm:text-[9px] sm:pr-3">
                                            coming soon
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {BADGE_PLACEHOLDERS.map((label, index) => (
                                            <div
                                                key={`${label}-${index}`}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-secondary)]"
                                            >
                                                <svg
                                                    aria-hidden
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.6"
                                                    className="h-[18px] w-[18px]"
                                                >
                                                    <path
                                                        d="M12 4.5 14.2 9l4.8.7-3.5 3.4.9 4.8L12 15.9 7.6 17.9l.9-4.8L5 9.7 9.8 9 12 4.5Z"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                                <span className="sr-only">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <input
                    id={avatarInputId}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="sr-only"
                />
            </div>

            {isEditing && (
                <ModalShell onClose={handleCancel} maxWidthClass="max-w-sm">
                    <form onSubmit={handleSave} className="space-y-4 text-center">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">choose unique username</p>
                            <p className="text-lg font-semibold text-white">Enter Username</p>
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(event) => {
                                setUsername(event.target.value);
                            }}
                            placeholder="username"
                            autoFocus
                            className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400/70"
                        />
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-sky-400/60 bg-sky-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:border-sky-300/80 hover:text-white"
                            >
                                {loading ? "Updating.." : "Update"}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </header>
    );
};

export default ProfileHeader;

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-[2px]"
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